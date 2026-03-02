import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// ═══════════════════════════════════════════════════════════════════
// 打字机模式 TipTap 扩展
// 将光标所在行始终保持在编辑器视口垂直中央
// ═══════════════════════════════════════════════════════════════════

/** 扩展配置 */
export interface TypewriterModeOptions {
    /** 启用状态（可动态切换） */
    enabled: boolean
    /** 光标位置占视口高度的百分比（0.5 = 正中间） */
    cursorPosition: number
    /** 滚动动画（smooth/auto） */
    scrollBehavior: ScrollBehavior
    /** 非活跃段落淡化（opacity: 0.4） */
    dimInactiveParagraphs: boolean
}

/** 默认配置 */
const DEFAULT_OPTIONS: TypewriterModeOptions = {
    enabled: false,
    cursorPosition: 0.5,
    scrollBehavior: 'smooth',
    dimInactiveParagraphs: true,
}

/** ProseMirror 插件 Key */
const typewriterPluginKey = new PluginKey('typewriterMode')

/**
 * 查找最近的可滚动父元素
 */
function findScrollParent(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element

    while (current) {
        const { overflow, overflowY } = getComputedStyle(current)

        if (
            overflow === 'auto' || overflow === 'scroll' ||
            overflowY === 'auto' || overflowY === 'scroll'
        ) {
            return current
        }

        current = current.parentElement
    }

    // 回退到编辑器自身（如果它有滚动条）
    if (element.scrollHeight > element.clientHeight) {
        return element
    }

    return null
}

/**
 * TypewriterMode TipTap Extension
 *
 * 功能：
 * - 光标始终保持在编辑器视口垂直中央
 * - 打字时自动滚动，营造打字机效果
 * - 非活跃段落淡化（opacity: 0.4）
 * - 可配置光标位置比例和滚动行为
 * - 可通过 enabled 选项动态开关
 */
export const TypewriterMode = Extension.create<TypewriterModeOptions>({
    name: 'typewriterMode',

    addOptions() {
        return { ...DEFAULT_OPTIONS }
    },

    addProseMirrorPlugins() {
        const extensionOptions = this.options

        return [
            // 插件 1: 光标居中滚动
            new Plugin({
                key: typewriterPluginKey,

                view() {
                    return {
                        update(view, prevState) {
                            if (!extensionOptions.enabled) return

                            // 只在光标位置发生变化时滚动
                            const cursorMoved = !prevState.selection.eq(view.state.selection)
                            if (!cursorMoved) return

                            // 使用 requestAnimationFrame 确保 DOM 已更新
                            // 注意：直接在回调中使用 view 避免 pnpm 重复模块导致的 EditorView 类型冲突
                            requestAnimationFrame(() => {
                                const { state } = view
                                const { selection } = state
                                const { head } = selection

                                // 获取光标在页面上的坐标
                                const coords = view.coordsAtPos(head)

                                // 获取编辑器 DOM 元素的可滚动容器
                                const editorDom = view.dom as HTMLElement
                                const scrollParent = findScrollParent(editorDom)
                                if (!scrollParent) return

                                const scrollRect = scrollParent.getBoundingClientRect()
                                const targetY = scrollRect.height * extensionOptions.cursorPosition

                                // 计算需要滚动的偏移量
                                const currentY = coords.top - scrollRect.top
                                const scrollOffset = currentY - targetY

                                if (Math.abs(scrollOffset) > 2) {
                                    scrollParent.scrollBy({
                                        top: scrollOffset,
                                        behavior: extensionOptions.scrollBehavior,
                                    })
                                }
                            })
                        },
                    }
                },
            }),

            // 插件 2: 非活跃段落淡化
            new Plugin({
                key: new PluginKey('typewriterDim'),

                props: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prosemirror-transform 版本冲突导致 DecorationSet 与 DecorationSource 不兼容
                    decorations(state): any {
                        if (!extensionOptions.enabled || !extensionOptions.dimInactiveParagraphs) {
                            return DecorationSet.empty
                        }

                        const { selection } = state
                        const decorations: Decoration[] = []

                        // 找到光标所在的顶层块节点
                        const $pos = state.doc.resolve(selection.from)
                        // 获取顶层块的位置（depth=1 表示文档直接子节点）
                        const activeDepth = Math.min($pos.depth, 1)
                        const activeBlockStart = activeDepth > 0 ? $pos.start(activeDepth) : 0
                        const activeBlockEnd = activeDepth > 0 ? $pos.end(activeDepth) : state.doc.content.size

                        // 遍历文档的顶层块节点，淡化非活跃段落
                        state.doc.forEach((node, offset) => {
                            const nodeStart = offset
                            const nodeEnd = offset + node.nodeSize

                            // 跳过光标所在的块
                            if (nodeStart >= activeBlockStart && nodeEnd <= activeBlockEnd + 1) {
                                return
                            }

                            decorations.push(
                                Decoration.node(nodeStart, nodeEnd, {
                                    class: 'typewriter-dimmed',
                                    style: 'opacity: 0.4; transition: opacity 0.3s ease;',
                                })
                            )
                        })

                        return DecorationSet.create(state.doc, decorations)
                    },
                },
            }),
        ]
    },
})
