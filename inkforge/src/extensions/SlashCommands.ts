import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

// ═══════════════════════════════════════════════════════════════════
// 斜杠命令系统 TipTap 扩展
// 在新行输入 / 触发命令菜单，支持模糊搜索与键盘导航
// ═══════════════════════════════════════════════════════════════════

/** 命令分类 */
export type SlashCommandCategory = 'heading' | 'block' | 'list' | 'insert' | 'advanced'

/** 单条命令定义 */
export interface SlashCommandItem {
  /** 唯一标识 */
  id: string
  /** 显示名称 */
  label: string
  /** 简短描述 */
  description: string
  /** Lucide 图标名 */
  icon: string
  /** 所属分类 */
  category: SlashCommandCategory
  /** 执行动作 */
  action: (editor: any) => void
}

/** 扩展 storage 状态 */
export interface SlashCommandsStorage {
  /** 菜单是否激活 */
  active: boolean
  /** 当前搜索查询 */
  query: string
  /** 当前选中索引 */
  selectedIndex: number
  /** 过滤后的命令列表 */
  filteredCommands: SlashCommandItem[]
  /** 菜单定位（相对于 .editor-paper） */
  menuPosition: { top: number; left: number }
  /** / 字符在文档中的位置 */
  triggerPos: number
}

/** 内置命令列表 */
const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: 'h1',
    label: '一级标题',
    description: '最大的标题',
    icon: 'Heading1',
    category: 'heading',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: '二级标题',
    description: '中等标题',
    icon: 'Heading2',
    category: 'heading',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: '三级标题',
    description: '小标题',
    icon: 'Heading3',
    category: 'heading',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'quote',
    label: '引用块',
    description: '插入引用',
    icon: 'Quote',
    category: 'block',
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: '代码块',
    description: '插入代码',
    icon: 'Code2',
    category: 'block',
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    label: '分隔线',
    description: '水平分割',
    icon: 'Minus',
    category: 'insert',
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'bullet',
    label: '无序列表',
    description: '项目符号列表',
    icon: 'List',
    category: 'list',
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: '有序列表',
    description: '编号列表',
    icon: 'ListOrdered',
    category: 'list',
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'task',
    label: '任务列表',
    description: '待办事项',
    icon: 'CheckSquare',
    category: 'list',
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'table',
    label: '表格',
    description: '插入 3x3 表格',
    icon: 'Table',
    category: 'insert',
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'image',
    label: '图片',
    description: '插入图片',
    icon: 'ImagePlus',
    category: 'insert',
    action: (editor) => {
      const url = window.prompt('输入图片URL:')
      if (url) editor.chain().focus().setImage({ src: url }).run()
    },
  },
]

/** ProseMirror 插件 Key */
const slashPluginKey = new PluginKey('slashCommands')

/** 扩展选项 */
export interface SlashCommandsOptions {
  /** 自定义命令列表（替换默认列表） */
  commands: SlashCommandItem[]
}

/**
 * 过滤命令：按 label 或 id 匹配查询
 */
function filterCommands(
  commands: SlashCommandItem[],
  query: string
): SlashCommandItem[] {
  if (!query) return [...commands]
  const q = query.toLowerCase()
  return commands.filter(
    (c) =>
      c.label.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
  )
}

/**
 * SlashCommands TipTap Extension
 *
 * 功能:
 * - 在空行或行首输入 / 触发命令菜单
 * - 支持实时模糊搜索过滤
 * - 键盘导航: ArrowUp/ArrowDown 选择, Enter 执行, Escape 关闭
 * - 通过 storage 暴露状态，由 SlashCommandMenu.vue 渲染 UI
 */
export const SlashCommands = Extension.create<SlashCommandsOptions, SlashCommandsStorage>({
  name: 'slashCommands',

  addOptions() {
    return {
      commands: SLASH_COMMANDS,
    }
  },

  addStorage(): SlashCommandsStorage {
    return {
      active: false,
      query: '',
      selectedIndex: 0,
      filteredCommands: [],
      menuPosition: { top: 0, left: 0 },
      triggerPos: 0,
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: slashPluginKey,

        props: {
          handleKeyDown(view: EditorView, event: KeyboardEvent): boolean | void {
            const storage = extension.storage

            // ── 未激活状态：检测 / 输入 ──
            if (!storage.active) {
              if (event.key === '/') {
                const { $from } = view.state.selection
                const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)

                // 仅在行首或空段落触发
                if (textBefore.trim() !== '') return false

                // 延迟激活，等 / 字符插入到文档后再读取位置
                setTimeout(() => {
                  storage.active = true
                  storage.query = ''
                  storage.selectedIndex = 0
                  storage.triggerPos = view.state.selection.from
                  storage.filteredCommands = [...extension.options.commands]

                  // 计算菜单定位（相对于 .editor-paper）
                  try {
                    const coords = view.coordsAtPos(view.state.selection.from)
                    const paperEl = view.dom.closest('.editor-paper')
                    const editorRect = paperEl
                      ? paperEl.getBoundingClientRect()
                      : view.dom.getBoundingClientRect()

                    storage.menuPosition = {
                      top: coords.bottom - editorRect.top + 4,
                      left: coords.left - editorRect.left,
                    }
                  } catch {
                    // coordsAtPos 可能在极端情况下抛出（节点被销毁）
                    storage.active = false
                  }

                  // 触发视图更新使 Vue 组件感知变化
                  view.dispatch(view.state.tr)
                }, 10)
              }
              return false
            }

            // ── 菜单激活状态：键盘导航 ──

            if (event.key === 'ArrowDown') {
              event.preventDefault()
              storage.selectedIndex = Math.min(
                storage.selectedIndex + 1,
                storage.filteredCommands.length - 1
              )
              view.dispatch(view.state.tr)
              return true
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault()
              storage.selectedIndex = Math.max(storage.selectedIndex - 1, 0)
              view.dispatch(view.state.tr)
              return true
            }

            if (event.key === 'Enter') {
              event.preventDefault()
              const cmd = storage.filteredCommands[storage.selectedIndex]
              if (cmd) {
                // 删除 /query 文本，然后执行命令
                const { tr } = view.state
                tr.delete(storage.triggerPos - 1, view.state.selection.from)
                view.dispatch(tr)
                cmd.action(extension.editor)
              }
              storage.active = false
              return true
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              storage.active = false
              view.dispatch(view.state.tr)
              return true
            }

            if (event.key === 'Backspace') {
              // 查询为空 → 正要删除 /，关闭菜单
              if (storage.query === '') {
                storage.active = false
                view.dispatch(view.state.tr)
                return false // 让默认行为删除 /
              }

              // 查询非空 → 延迟更新过滤
              setTimeout(() => {
                const { $from } = view.state.selection
                const text = $from.parent.textContent.slice(0, $from.parentOffset)
                const slashIndex = text.lastIndexOf('/')

                if (slashIndex === -1) {
                  storage.active = false
                } else {
                  storage.query = text.slice(slashIndex + 1)
                  storage.filteredCommands = filterCommands(
                    extension.options.commands,
                    storage.query
                  )
                  storage.selectedIndex = 0
                }
                view.dispatch(view.state.tr)
              }, 10)
              return false
            }

            // ── 字母/数字输入 → 更新搜索查询 ──
            if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
              setTimeout(() => {
                const { $from } = view.state.selection
                const text = $from.parent.textContent.slice(0, $from.parentOffset)
                const slashIndex = text.lastIndexOf('/')

                if (slashIndex === -1) {
                  storage.active = false
                } else {
                  storage.query = text.slice(slashIndex + 1)
                  storage.filteredCommands = filterCommands(
                    extension.options.commands,
                    storage.query
                  )
                  storage.selectedIndex = 0

                  // 无匹配结果 → 关闭菜单
                  if (storage.filteredCommands.length === 0) {
                    storage.active = false
                  }
                }
                view.dispatch(view.state.tr)
              }, 10)
              return false
            }

            return false
          },

          // 点击外部关闭菜单
          handleClick() {
            if (extension.storage.active) {
              extension.storage.active = false
            }
            return false
          },
        },
      }),
    ]
  },
})

export { SLASH_COMMANDS }
