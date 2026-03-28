import { Extension, type Editor as TiptapEditor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export type SlashCommandCategory =
  | 'heading'
  | 'format'
  | 'block'
  | 'list'
  | 'insert'
  | 'tool'

export interface SlashCommandItem {
  id: string
  label: string
  description: string
  icon: string
  category: SlashCommandCategory
  shortcut?: string
  keywords?: string[]
  action: (editor: TiptapEditor) => void
}

export interface SlashCommandsStorage {
  active: boolean
  query: string
  selectedIndex: number
  filteredCommands: SlashCommandItem[]
  menuPosition: { top: number; left: number }
  triggerPos: number
}

function dispatchWindowEvent(name: string, detail?: Record<string, unknown>): void {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: 'h1',
    label: '一级标题',
    description: '最大的章节标题',
    icon: 'Heading1',
    category: 'heading',
    shortcut: 'Ctrl+1',
    keywords: ['title', 'heading'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: '二级标题',
    description: '常用的章节标题',
    icon: 'Heading2',
    category: 'heading',
    shortcut: 'Ctrl+2',
    keywords: ['title', 'heading'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: '三级标题',
    description: '紧凑的小节标题',
    icon: 'Heading3',
    category: 'heading',
    shortcut: 'Ctrl+3',
    keywords: ['title', 'heading'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'h4',
    label: '四级标题',
    description: '最小的标题层级',
    icon: 'Heading4',
    category: 'heading',
    shortcut: 'Ctrl+4',
    keywords: ['title', 'heading'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  {
    id: 'paragraph',
    label: '正文',
    description: '切换为普通段落',
    icon: 'Pilcrow',
    category: 'heading',
    shortcut: 'Ctrl+0',
    keywords: ['paragraph', 'text', 'normal'],
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'bold',
    label: '加粗',
    description: '强调当前文字',
    icon: 'Bold',
    category: 'format',
    shortcut: 'Ctrl+B',
    keywords: ['strong', 'emphasis'],
    action: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    label: '斜体',
    description: '添加轻量强调',
    icon: 'Italic',
    category: 'format',
    shortcut: 'Ctrl+I',
    keywords: ['emphasis'],
    action: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: 'underline',
    label: '下划线',
    description: '添加下划线强调',
    icon: 'Underline',
    category: 'format',
    shortcut: 'Ctrl+U',
    keywords: ['mark'],
    action: (editor) => editor.chain().focus().toggleUnderline().run(),
  },
  {
    id: 'strike',
    label: '删除线',
    description: '标记废弃或修订内容',
    icon: 'Strikethrough',
    category: 'format',
    shortcut: 'Ctrl+Shift+S',
    keywords: ['remove', 'deprecated'],
    action: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    id: 'highlight',
    label: '高亮',
    description: '用高亮标记选中文本',
    icon: 'Highlighter',
    category: 'format',
    shortcut: 'Ctrl+Shift+H',
    keywords: ['marker', 'emphasis'],
    action: (editor) => editor.chain().focus().toggleHighlight().run(),
  },
  {
    id: 'inline-code',
    label: '行内代码',
    description: '包裹简短代码片段',
    icon: 'Code',
    category: 'format',
    shortcut: 'Ctrl+Shift+`',
    keywords: ['code', 'snippet'],
    action: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    id: 'superscript',
    label: '上标',
    description: '切换为上标格式',
    icon: 'Superscript',
    category: 'format',
    keywords: ['math', 'footnote'],
    action: (editor) => editor.chain().focus().toggleSuperscript().run(),
  },
  {
    id: 'subscript',
    label: '下标',
    description: '切换为下标格式',
    icon: 'Subscript',
    category: 'format',
    keywords: ['math', 'chemical'],
    action: (editor) => editor.chain().focus().toggleSubscript().run(),
  },
  {
    id: 'quote',
    label: '引用块',
    description: '插入引用段落',
    icon: 'Quote',
    category: 'block',
    shortcut: 'Ctrl+Shift+Q',
    keywords: ['blockquote', 'quote'],
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code-block',
    label: '代码块',
    description: '插入带高亮的代码块',
    icon: 'Code2',
    category: 'block',
    shortcut: 'Ctrl+Shift+K',
    keywords: ['snippet', 'code'],
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'align-left',
    label: '左对齐',
    description: '将段落设置为左对齐',
    icon: 'AlignLeft',
    category: 'block',
    keywords: ['alignment'],
    action: (editor) => editor.chain().focus().setTextAlign('left').run(),
  },
  {
    id: 'align-center',
    label: '居中对齐',
    description: '将段落设置为居中',
    icon: 'AlignCenter',
    category: 'block',
    keywords: ['alignment'],
    action: (editor) => editor.chain().focus().setTextAlign('center').run(),
  },
  {
    id: 'align-right',
    label: '右对齐',
    description: '将段落设置为右对齐',
    icon: 'AlignRight',
    category: 'block',
    keywords: ['alignment'],
    action: (editor) => editor.chain().focus().setTextAlign('right').run(),
  },
  {
    id: 'align-justify',
    label: '两端对齐',
    description: '将段落设置为两端对齐',
    icon: 'AlignJustify',
    category: 'block',
    keywords: ['alignment'],
    action: (editor) => editor.chain().focus().setTextAlign('justify').run(),
  },
  {
    id: 'bullet',
    label: '无序列表',
    description: '创建项目符号列表',
    icon: 'List',
    category: 'list',
    shortcut: 'Ctrl+Shift+]',
    keywords: ['unordered', 'list'],
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: '有序列表',
    description: '创建编号列表',
    icon: 'ListOrdered',
    category: 'list',
    shortcut: 'Ctrl+Shift+[',
    keywords: ['ordered', 'list'],
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'task',
    label: '任务列表',
    description: '创建待办事项列表',
    icon: 'CheckSquare',
    category: 'list',
    shortcut: 'Ctrl+Shift+X',
    keywords: ['todo', 'checklist'],
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'divider',
    label: '分隔线',
    description: '插入水平分割线',
    icon: 'Minus',
    category: 'insert',
    shortcut: 'Ctrl+Enter',
    keywords: ['rule', 'separator'],
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'table',
    label: '表格',
    description: '插入 3x3 表格',
    icon: 'Table',
    category: 'insert',
    shortcut: 'Ctrl+T',
    keywords: ['grid', 'sheet'],
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'link',
    label: '链接',
    description: '编辑或插入链接',
    icon: 'Link2',
    category: 'insert',
    shortcut: 'Ctrl+K',
    keywords: ['url', 'hyperlink'],
    action: (editor) => {
      editor.chain().focus().run()
      dispatchWindowEvent('inkforge:edit-link')
    },
  },
  {
    id: 'image',
    label: '图片',
    description: '打开真实图片选择器',
    icon: 'ImagePlus',
    category: 'insert',
    keywords: ['upload', 'media'],
    action: (editor) => {
      editor.chain().focus().run()
      dispatchWindowEvent('inkforge:open-image-picker')
    },
  },
  {
    id: 'find',
    label: '查找',
    description: '打开查找面板',
    icon: 'Search',
    category: 'tool',
    shortcut: 'Ctrl+F',
    keywords: ['search', 'locate'],
    action: (editor) => {
      editor.chain().focus().run()
      dispatchWindowEvent('inkforge:find')
    },
  },
  {
    id: 'replace',
    label: '查找替换',
    description: '打开查找替换面板',
    icon: 'Replace',
    category: 'tool',
    shortcut: 'Ctrl+H',
    keywords: ['search', 'replace'],
    action: (editor) => {
      editor.chain().focus().run()
      dispatchWindowEvent('inkforge:replace')
    },
  },
]

const slashPluginKey = new PluginKey('slashCommands')

export interface SlashCommandsOptions {
  commands: SlashCommandItem[]
}

function filterCommands(commands: SlashCommandItem[], query: string): SlashCommandItem[] {
  if (!query) {
    return [...commands]
  }

  const normalizedQuery = query.trim().toLowerCase()
  return commands.filter((command) => {
    const searchable = [
      command.id,
      command.label,
      command.description,
      command.category,
      ...(command.keywords ?? []),
    ]
      .join(' ')
      .toLowerCase()

    return searchable.includes(normalizedQuery)
  })
}

function updateMenuPosition(view: EditorView, storage: SlashCommandsStorage): void {
  try {
    const coords = view.coordsAtPos(view.state.selection.from)
    const paperEl = view.dom.closest('.editor-paper')
    const editorRect = paperEl
      ? paperEl.getBoundingClientRect()
      : view.dom.getBoundingClientRect()
    const estimatedWidth = 280

    storage.menuPosition = {
      top: coords.bottom - editorRect.top + 8,
      left: Math.min(
        Math.max(12, coords.left - editorRect.left),
        Math.max(12, editorRect.width - estimatedWidth - 12),
      ),
    }
  } catch {
    storage.active = false
  }
}

function closeMenu(view: EditorView, storage: SlashCommandsStorage): boolean {
  storage.active = false
  storage.query = ''
  storage.selectedIndex = 0
  storage.filteredCommands = []
  view.dispatch(view.state.tr)
  return true
}

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
    return [
      new Plugin({
        key: slashPluginKey,
        props: {
          handleKeyDown: (view: EditorView, event: KeyboardEvent): boolean | void => {
            const storage = this.storage

            if (!storage.active) {
              if (event.key === '/') {
                const { $from } = view.state.selection
                const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)

                if (textBefore.trim() !== '') {
                  return false
                }

                setTimeout(() => {
                  storage.active = true
                  storage.query = ''
                  storage.selectedIndex = 0
                  storage.triggerPos = view.state.selection.from
                  storage.filteredCommands = [...this.options.commands]
                  updateMenuPosition(view, storage)
                  view.dispatch(view.state.tr)
                }, 10)
              }

              return false
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault()
              storage.selectedIndex = Math.min(
                storage.selectedIndex + 1,
                Math.max(storage.filteredCommands.length - 1, 0),
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

            if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault()
              const command = storage.filteredCommands[storage.selectedIndex]
              if (command) {
                const { tr } = view.state
                tr.delete(storage.triggerPos - 1, view.state.selection.from)
                view.dispatch(tr)
                command.action(this.editor)
              }
              return closeMenu(view, storage)
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              return closeMenu(view, storage)
            }

            if (event.key === 'Backspace') {
              if (storage.query === '') {
                storage.active = false
                storage.filteredCommands = []
                view.dispatch(view.state.tr)
                return false
              }

              setTimeout(() => {
                const { $from } = view.state.selection
                const text = $from.parent.textContent.slice(0, $from.parentOffset)
                const slashIndex = text.lastIndexOf('/')

                if (slashIndex === -1) {
                  closeMenu(view, storage)
                  return
                }

                storage.query = text.slice(slashIndex + 1)
                storage.filteredCommands = filterCommands(this.options.commands, storage.query)
                storage.selectedIndex = 0
                if (storage.filteredCommands.length === 0) {
                  closeMenu(view, storage)
                  return
                }
                updateMenuPosition(view, storage)
                view.dispatch(view.state.tr)
              }, 10)

              return false
            }

            if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
              setTimeout(() => {
                const { $from } = view.state.selection
                const text = $from.parent.textContent.slice(0, $from.parentOffset)
                const slashIndex = text.lastIndexOf('/')

                if (slashIndex === -1) {
                  closeMenu(view, storage)
                  return
                }

                storage.query = text.slice(slashIndex + 1)
                storage.filteredCommands = filterCommands(this.options.commands, storage.query)
                storage.selectedIndex = 0
                if (storage.filteredCommands.length === 0) {
                  closeMenu(view, storage)
                  return
                }
                updateMenuPosition(view, storage)
                view.dispatch(view.state.tr)
              }, 10)
            }

            return false
          },

          handleClick: () => {
            this.storage.active = false
            this.storage.filteredCommands = []
            return false
          },
        },
      }),
    ]
  },
})

export { SLASH_COMMANDS }
