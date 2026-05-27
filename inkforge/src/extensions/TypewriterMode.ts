import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

// ═══════════════════════════════════════════════════════════════════
// 打字机模式 TipTap 扩展（沉浸式聚焦写作）
// - 光标行视口居中滚动（cursorPosition 0.3~0.7 可调）
// - 分级淡化：当前段 1.0 / 相邻段 ±1 = 0.85 / 更远段 ≥±2 = 0.5
// - 句子级聚焦：活跃段内当前句 1.0 / 其他句 0.75（代码块/列表跳过）
// - 段落侧栏：当前段左侧 2px 主题色竖条
// - 闲置呼吸：>1.2s 无操作给 ProseMirror DOM 写 data-typewriter-idle
// ═══════════════════════════════════════════════════════════════════

/** 扩展配置 */
export interface TypewriterModeOptions {
    /** 启用状态（可动态切换） */
    enabled: boolean
    /** 光标位置占视口高度的百分比（0.3 ~ 0.7） */
    cursorPosition: number
    /** 滚动动画（smooth/auto） */
    scrollBehavior: ScrollBehavior
    /** 非活跃段落淡化（统一钩子，分级 class 决定具体 opacity） */
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

/** 闲置阈值（ms）— 超过则进入呼吸态 */
const IDLE_THRESHOLD_MS = 1200

/** 句末切分正则（中英文标点 + 可选空白） */
const SENTENCE_SPLIT_REGEX = /[.!?。！？；;]+\s*/g

/** 不做句子细分的节点类型（代码块/列表整体处理） */
const SKIP_SENTENCE_SPLIT_TYPES = new Set(['codeBlock', 'code_block', 'listItem', 'list_item', 'taskList', 'task_list', 'taskItem', 'task_item', 'bulletList', 'orderedList'])

/**
 * 查找最近的"真正可滚动"父元素。
 *
 * 仅仅 overflow:auto / scroll 不够：
 * - 在 InkForge 编辑器嵌套布局中，`.editor-scroll` 声明了 overflow:auto，
 *   但因为它本身（在 flex 链中）会膨胀到与内容同高，scrollHeight===clientHeight，
 *   `scrollBy()` 在它上面是 no-op。真正在滚的是它的更外层（如 `.split-pane-left`）。
 *
 * 所以必须同时满足：
 *   1) overflow / overflowY 属于 auto | scroll
 *   2) 当前实际 scrollHeight > clientHeight（有可滚动距离）
 *
 * 找不到候选时回退到编辑器自身（如果它本身有可滚动区域）。
 */
function findScrollParent(element: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = element

    while (current) {
        const { overflow, overflowY } = getComputedStyle(current)
        const overflowAllowsScroll =
            overflow === 'auto' || overflow === 'scroll' ||
            overflowY === 'auto' || overflowY === 'scroll'

        if (overflowAllowsScroll && current.scrollHeight > current.clientHeight) {
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
 * 在 doc 顶层块里定位当前 selection 所在的块 index。
 * 返回 -1 表示未找到（极端情况，例如 selection 越界）。
 */
function findActiveBlockIndex(doc: ProseMirrorNode, selectionFrom: number): number {
    let activeIndex = -1
    doc.forEach((node, offset, index) => {
        const start = offset
        const end = offset + node.nodeSize
        if (selectionFrom >= start && selectionFrom <= end) {
            activeIndex = index
        }
    })
    return activeIndex
}

/**
 * Phase C: 找到离光标最近的 textblock 祖先（paragraph / heading / listItem 的 paragraph 子 / codeBlock 等）。
 * 嵌套块（如 li > p）场景下，sidebar / active class 必须挂到具体 textblock 而非整个顶层 ul/ol。
 *
 * 返回该 textblock 在 doc 中的绝对位置范围 + node 引用。无 textblock 祖先（极端情况）返回 null。
 */
function findActiveTextblockRange(
    doc: ProseMirrorNode,
    selectionFrom: number,
): { from: number; to: number; node: ProseMirrorNode; depth: number } | null {
    let $from: ReturnType<ProseMirrorNode['resolve']>
    try {
        $from = doc.resolve(selectionFrom)
    } catch {
        return null
    }

    for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d)
        if (node.isTextblock) {
            return {
                from: $from.before(d),
                to: $from.after(d),
                node,
                depth: d,
            }
        }
    }
    return null
}

/**
 * 计算当前块内 cursor 所在句子的 [start, end] inline 偏移（相对块内容起点）。
 * 返回 null 表示无法定位（节点无文本 / 句切失败 / 节点类型不支持切句）。
 */
function findActiveSentenceRange(
    activeNode: ProseMirrorNode,
    activeNodeStart: number,
    selectionFrom: number,
): { start: number; end: number; ranges: Array<{ start: number; end: number }> } | null {
    if (SKIP_SENTENCE_SPLIT_TYPES.has(activeNode.type.name)) {
        return null
    }

    const text = activeNode.textContent
    if (!text || text.length === 0) {
        return null
    }

    // contentStart: 块内容起始位置（块开始位置 + 1 个 openStart）
    const contentStart = activeNodeStart + 1
    const cursorOffset = selectionFrom - contentStart

    const ranges: Array<{ start: number; end: number }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    SENTENCE_SPLIT_REGEX.lastIndex = 0
    while ((match = SENTENCE_SPLIT_REGEX.exec(text)) !== null) {
        const endIndex = match.index + match[0].length
        if (endIndex > lastIndex) {
            ranges.push({ start: lastIndex, end: endIndex })
        }
        lastIndex = endIndex
    }
    if (lastIndex < text.length) {
        ranges.push({ start: lastIndex, end: text.length })
    }

    if (ranges.length === 0) {
        return null
    }

    let activeRange = ranges[ranges.length - 1]
    for (const range of ranges) {
        if (cursorOffset >= range.start && cursorOffset <= range.end) {
            activeRange = range
            break
        }
    }

    return { start: activeRange.start, end: activeRange.end, ranges }
}

/**
 * TypewriterMode TipTap Extension
 *
 * 功能：
 * - 光标始终保持在编辑器视口指定垂直位置（0.3~0.7 可调）
 * - 打字时自动滚动，营造打字机效果
 * - 分级淡化 + 句子级聚焦 + 段落侧栏（沉浸式聚焦）
 * - 闲置 >1.2s 触发呼吸光标（data-typewriter-idle 属性 + CSS）
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
            // 插件 1: 光标居中滚动 + 闲置呼吸 timer
            new Plugin({
                key: typewriterPluginKey,

                view(initialView) {
                    let idleTimer: ReturnType<typeof setTimeout> | null = null

                    const clearIdle = () => {
                        if (idleTimer !== null) {
                            clearTimeout(idleTimer)
                            idleTimer = null
                        }
                    }

                    const setIdleAttr = (view: { dom: Element }, idle: boolean) => {
                        const dom = view.dom as HTMLElement
                        if (idle) {
                            dom.setAttribute('data-typewriter-idle', 'true')
                        } else {
                            dom.removeAttribute('data-typewriter-idle')
                        }
                    }

                    /**
                     * 同步打字机模式总开关到 DOM。
                     *
                     * Why: 末段无法居中是因为 scrollTop 已经触底（剩余文档高度
                     * < viewport × (1 - cursorPosition)）。业界标准做法（Typora /
                     * Bear / iA Writer）是给编辑器底部加 50vh spacer，让
                     * scrollHeight 多出一段，使 cursor 在任何位置都能滚到中线。
                     * 我们用 `[data-typewriter-active-mode="true"]::after { height: 50vh }`
                     * 实现，CSS 同时只在打字机启用时生效，关闭后自动消失。
                     */
                    const setActiveModeAttr = (view: { dom: Element }, enabled: boolean) => {
                        const dom = view.dom as HTMLElement
                        if (enabled) {
                            dom.setAttribute('data-typewriter-active-mode', 'true')
                        } else {
                            dom.removeAttribute('data-typewriter-active-mode')
                        }
                    }

                    const scheduleIdle = (view: { dom: Element }) => {
                        clearIdle()
                        if (!extensionOptions.enabled) return
                        idleTimer = setTimeout(() => {
                            setIdleAttr(view, true)
                        }, IDLE_THRESHOLD_MS)
                    }

                    // 初始装载：禁用态保证移除任何残留属性
                    setIdleAttr(initialView, false)
                    setActiveModeAttr(initialView, extensionOptions.enabled)
                    if (extensionOptions.enabled) {
                        scheduleIdle(initialView)
                    }

                    return {
                        update(view, prevState) {
                            if (import.meta.env.DEV) {
                                // eslint-disable-next-line no-console
                                console.debug('[typewriter] plugin1 update', { enabled: extensionOptions.enabled })
                            }
                            // 关闭打字机时清理一切痕迹
                            if (!extensionOptions.enabled) {
                                clearIdle()
                                setIdleAttr(view, false)
                                setActiveModeAttr(view, false)
                                return
                            }

                            // 任何状态变化都视为活跃，重置呼吸 timer
                            setIdleAttr(view, false)
                            setActiveModeAttr(view, true)
                            scheduleIdle(view)

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

                        destroy() {
                            clearIdle()
                            setIdleAttr(initialView, false)
                            setActiveModeAttr(initialView, false)
                        },
                    }
                },
            }),

            // 插件 2: 分级淡化 + 句子级聚焦 + 段落侧栏装饰
            new Plugin({
                key: new PluginKey('typewriterDim'),

                props: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prosemirror-transform 版本冲突导致 DecorationSet 与 DecorationSource 不兼容
                    decorations(state): any {
                        if (import.meta.env.DEV) {
                            // eslint-disable-next-line no-console
                            console.debug('[typewriter] decorations call', {
                                enabled: extensionOptions.enabled,
                                dimInactive: extensionOptions.dimInactiveParagraphs,
                                cursorPos: extensionOptions.cursorPosition,
                                docChildCount: state.doc.childCount,
                                selectionFrom: state.selection.from,
                            })
                        }

                        if (!extensionOptions.enabled || !extensionOptions.dimInactiveParagraphs) {
                            return DecorationSet.empty
                        }

                        const { selection, doc } = state
                        const decorations: Decoration[] = []

                        const activeBlockIndex = findActiveBlockIndex(doc, selection.from)
                        // Phase C: 找到光标真正所在的 textblock 祖先（嵌套块如 li > p 时正确锚定 sidebar）
                        const activeTextblock = findActiveTextblockRange(doc, selection.from)

                        // 第一遍：扫描每个顶层块，按距离打 class
                        doc.forEach((node, offset, index) => {
                            const nodeStart = offset
                            const nodeEnd = offset + node.nodeSize
                            const distance = activeBlockIndex < 0 ? 999 : Math.abs(index - activeBlockIndex)

                            if (distance === 0) {
                                // Phase C: sidebar / active class 挂到具体 textblock 范围而非整个顶层块。
                                // 顶层块本身若就是 textblock（paragraph / heading），其范围与 textblock 一致。
                                // 嵌套场景（ul > li > p），active 范围 = 当前 li 内的 p，sidebar 贴在 p 而非 ul。
                                const activeFrom = activeTextblock ? activeTextblock.from : nodeStart
                                const activeTo = activeTextblock ? activeTextblock.to : nodeEnd
                                const activeNode = activeTextblock ? activeTextblock.node : node
                                const sentenceContentStart = activeFrom + 1

                                decorations.push(
                                    Decoration.node(activeFrom, activeTo, {
                                        class: 'typewriter-block-active',
                                        style: 'opacity: 1;',
                                        // Data attribute attached via PM Decoration.node is reliably
                                        // cleaned up across renders, unlike class strings which can
                                        // leak when other plugins also decorate the same node. CSS
                                        // gates visual treatment on this attribute so backgrounds
                                        // cannot bleed onto stale class-only elements.
                                        'data-typewriter-active': 'true',
                                    }),
                                )

                                // 句子级 inline 装饰（活跃 textblock 文本拆句，光标所在句不淡化）
                                const activeRange = findActiveSentenceRange(activeNode, activeFrom, selection.from)
                                if (activeRange) {
                                    for (const range of activeRange.ranges) {
                                        if (range.start === activeRange.start && range.end === activeRange.end) {
                                            continue
                                        }
                                        const from = sentenceContentStart + range.start
                                        const to = sentenceContentStart + range.end
                                        if (to > from) {
                                            decorations.push(
                                                Decoration.inline(from, to, {
                                                    class: 'typewriter-sentence-dim',
                                                    style: 'opacity: 0.75;',
                                                }),
                                            )
                                        }
                                    }
                                }
                            } else {
                                // 连续梯度：每段距离 ×0.07 衰减，下限 0.18（长文远段继续递浅但仍可见）
                                // dist 1=0.93, 2=0.86, 3=0.79, 5=0.65, 10=0.30, 12+=0.18 (floor)
                                const opacity = Math.max(0.18, 1 - distance * 0.07)
                                const tier = distance === 1 ? 'typewriter-dim-near' : 'typewriter-dim-far'
                                decorations.push(
                                    Decoration.node(nodeStart, nodeEnd, {
                                        class: `typewriter-dimmed ${tier}`,
                                        style: `opacity: ${opacity.toFixed(2)}; transition: opacity 0.3s ease;`,
                                    }),
                                )
                            }
                        })

                        return DecorationSet.create(doc, decorations)
                    },
                },
            }),
        ]
    },
})
