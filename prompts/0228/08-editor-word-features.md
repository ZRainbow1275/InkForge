# 08 - 编辑器 Word 风格功能

## 问题描述

当前 TipTap 编辑器提供基础的 Markdown 编辑体验，但缺乏 Word/Office 风格的排版工具：
1. 浮动工具栏（Floating Toolbar）功能不完整
2. 缺少排版面板（Typography Panel）
3. 缺少实时 Markdown 语法渲染（如 `**bold**` 实时显示为粗体）
4. 缺少打字机模式（Typewriter Mode）

参考原型 `prototype/inkforge_workstation.html` 中的交互设计。

## 设计方案

### 1. 浮动工具栏增强 (FloatingToolbar.vue)

当用户在编辑器中选中文本时，显示 Word 风格的格式化工具栏：

```
┌──────────────────────────────────────────────────────────────┐
│ B  I  U  S  ~  │ H1 H2 H3 │ " [ ] │ Link Img │ Color │ AI │
└──────────────────────────────────────────────────────────────┘
```

```typescript
// components/editor/FloatingToolbar.vue

interface ToolbarAction {
  id: string
  icon: string      // SVG path
  label: string
  shortcut?: string
  isActive: () => boolean
  execute: () => void
  group: 'format' | 'heading' | 'block' | 'insert' | 'style' | 'ai'
}

const toolbarActions: ToolbarAction[] = [
  // 格式组
  { id: 'bold', icon: 'B', label: '粗体', shortcut: 'Ctrl+B',
    isActive: () => editor.isActive('bold'),
    execute: () => editor.chain().focus().toggleBold().run(),
    group: 'format' },
  { id: 'italic', icon: 'I', label: '斜体', shortcut: 'Ctrl+I',
    isActive: () => editor.isActive('italic'),
    execute: () => editor.chain().focus().toggleItalic().run(),
    group: 'format' },
  { id: 'underline', icon: 'U', label: '下划线', shortcut: 'Ctrl+U',
    isActive: () => editor.isActive('underline'),
    execute: () => editor.chain().focus().toggleUnderline().run(),
    group: 'format' },
  { id: 'strike', icon: 'S', label: '删除线', shortcut: 'Ctrl+Shift+X',
    isActive: () => editor.isActive('strike'),
    execute: () => editor.chain().focus().toggleStrike().run(),
    group: 'format' },
  { id: 'code', icon: '`', label: '行内代码', shortcut: 'Ctrl+E',
    isActive: () => editor.isActive('code'),
    execute: () => editor.chain().focus().toggleCode().run(),
    group: 'format' },

  // 标题组
  { id: 'h1', icon: 'H1', label: '一级标题',
    isActive: () => editor.isActive('heading', { level: 1 }),
    execute: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    group: 'heading' },
  { id: 'h2', icon: 'H2', label: '二级标题',
    isActive: () => editor.isActive('heading', { level: 2 }),
    execute: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    group: 'heading' },
  { id: 'h3', icon: 'H3', label: '三级标题',
    isActive: () => editor.isActive('heading', { level: 3 }),
    execute: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    group: 'heading' },

  // 块级组
  { id: 'blockquote', icon: '"', label: '引用', shortcut: 'Ctrl+Shift+B',
    isActive: () => editor.isActive('blockquote'),
    execute: () => editor.chain().focus().toggleBlockquote().run(),
    group: 'block' },
  { id: 'bulletList', icon: '[-]', label: '无序列表',
    isActive: () => editor.isActive('bulletList'),
    execute: () => editor.chain().focus().toggleBulletList().run(),
    group: 'block' },
  { id: 'orderedList', icon: '[1]', label: '有序列表',
    isActive: () => editor.isActive('orderedList'),
    execute: () => editor.chain().focus().toggleOrderedList().run(),
    group: 'block' },

  // 插入组
  { id: 'link', icon: 'link', label: '链接', shortcut: 'Ctrl+K',
    isActive: () => editor.isActive('link'),
    execute: () => showLinkDialog(),
    group: 'insert' },
  { id: 'image', icon: 'img', label: '图片',
    isActive: () => false,
    execute: () => showImageDialog(),
    group: 'insert' },
  { id: 'codeBlock', icon: '{}', label: '代码块',
    isActive: () => editor.isActive('codeBlock'),
    execute: () => editor.chain().focus().toggleCodeBlock().run(),
    group: 'insert' },
  { id: 'horizontalRule', icon: '---', label: '分割线',
    isActive: () => false,
    execute: () => editor.chain().focus().setHorizontalRule().run(),
    group: 'insert' },

  // 颜色组
  { id: 'textColor', icon: 'A', label: '文字颜色',
    isActive: () => false,
    execute: () => showColorPicker('text'),
    group: 'style' },
  { id: 'highlight', icon: 'bg', label: '高亮背景',
    isActive: () => editor.isActive('highlight'),
    execute: () => showColorPicker('background'),
    group: 'style' },
]
```

### 2. 实时 Markdown 语法渲染 (TipTap Extension)

```typescript
// extensions/MarkdownSyntaxHighlight.ts

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/**
 * 实时 Markdown 语法渲染
 *
 * 在编辑器中输入 Markdown 语法时，实时渲染效果：
 * - **bold** → 显示为粗体（隐藏 **）
 * - *italic* → 显示为斜体（隐藏 *）
 * - `code` → 显示为行内代码（带背景色）
 * - # heading → 显示为标题样式
 * - > quote → 显示为引用样式
 * - [text](url) → 显示为链接样式
 */
export const MarkdownSyntaxHighlight = Extension.create({
  name: 'markdownSyntaxHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownSyntax'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = []

            state.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                // 淡化 Markdown 语法标记
                const patterns = [
                  { regex: /(\*\*)(.*?)(\*\*)/g, class: 'md-bold-marker' },
                  { regex: /(\*)(.*?)(\*)/g, class: 'md-italic-marker' },
                  { regex: /(`)(.*?)(`)/g, class: 'md-code-marker' },
                  { regex: /(~~)(.*?)(~~)/g, class: 'md-strike-marker' },
                ]

                for (const { regex, class: className } of patterns) {
                  let match: RegExpExecArray | null
                  while ((match = regex.exec(node.text)) !== null) {
                    // 淡化前后标记符号
                    decorations.push(
                      Decoration.inline(pos + match.index, pos + match.index + match[1].length, {
                        class: className,
                        style: 'opacity: 0.3; font-size: 0.85em;'
                      })
                    )
                    decorations.push(
                      Decoration.inline(
                        pos + match.index + match[1].length + match[2].length,
                        pos + match.index + match[0].length,
                        { class: className, style: 'opacity: 0.3; font-size: 0.85em;' }
                      )
                    )
                  }
                }
              }
            })

            return DecorationSet.create(state.doc, decorations)
          }
        }
      })
    ]
  }
})
```

### 3. 打字机模式 (TypewriterMode.ts)

```typescript
// extensions/TypewriterMode.ts

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * 打字机模式
 *
 * 光标始终保持在编辑器视窗垂直中央
 * 非当前段落文字淡化（opacity: 0.4）
 */
export const TypewriterMode = Extension.create({
  name: 'typewriterMode',

  addOptions() {
    return {
      enabled: false,
      dimInactiveParagraphs: true,
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    return [
      new Plugin({
        key: new PluginKey('typewriter'),

        view(editorView) {
          return {
            update(view, prevState) {
              if (!options.enabled) return

              const { selection } = view.state
              if (selection.from === prevState.selection.from) return

              // 获取光标位置对应的 DOM 元素
              const coords = view.coordsAtPos(selection.from)
              const editorRect = view.dom.getBoundingClientRect()
              const scrollParent = findScrollParent(view.dom)

              if (scrollParent) {
                const targetScroll = coords.top - editorRect.top - scrollParent.clientHeight / 2
                scrollParent.scrollTo({
                  top: targetScroll,
                  behavior: 'smooth',
                })
              }
            }
          }
        },

        props: {
          decorations(state) {
            if (!options.enabled || !options.dimInactiveParagraphs) return null

            const { selection } = state
            const decorations: Decoration[] = []

            // 找到光标所在的段落
            const $pos = state.doc.resolve(selection.from)
            const currentBlockStart = $pos.start($pos.depth)
            const currentBlockEnd = $pos.end($pos.depth)

            // 淡化非当前段落
            state.doc.descendants((node, pos) => {
              if (node.isBlock && node.isTextblock) {
                const blockEnd = pos + node.nodeSize
                if (pos < currentBlockStart || blockEnd > currentBlockEnd + 1) {
                  decorations.push(
                    Decoration.node(pos, blockEnd, {
                      class: 'typewriter-dimmed',
                      style: 'opacity: 0.4; transition: opacity 0.3s ease;',
                    })
                  )
                }
              }
            })

            return DecorationSet.create(state.doc, decorations)
          }
        }
      })
    ]
  }
})

function findScrollParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement
  while (parent) {
    const overflow = getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return null
}
```

### 4. 斜杠命令 (Slash Commands)

```typescript
// extensions/SlashCommands.ts

/**
 * 输入 / 触发命令面板
 * 支持的命令列表：
 *
 * /h1, /h2, /h3         → 标题
 * /quote, /blockquote    → 引用
 * /code                  → 代码块
 * /ul, /ol               → 列表
 * /image                 → 插入图片
 * /link                  → 插入链接
 * /hr, /divider          → 分割线
 * /table                 → 插入表格
 * /todo                  → 待办事项
 * /callout               → 提示框
 */

interface SlashCommand {
  id: string
  label: string
  description: string
  icon: string
  category: 'basic' | 'media' | 'advanced'
  keywords: string[]
  execute: (editor: Editor) => void
}

const slashCommands: SlashCommand[] = [
  {
    id: 'heading1', label: '一级标题', description: '大标题',
    icon: 'h1', category: 'basic', keywords: ['h1', 'heading', '标题'],
    execute: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
  },
  {
    id: 'heading2', label: '二级标题', description: '中标题',
    icon: 'h2', category: 'basic', keywords: ['h2', 'heading', '标题'],
    execute: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
  },
  // ... 更多命令
]
```

### 5. 智能标点 (SmartPunctuation.ts)

```typescript
// extensions/SmartPunctuation.ts

/**
 * 智能标点转换：
 * - "" → ""（中文引号）
 * - -- → ——（破折号）
 * - ... → ......（中文省略号）
 * - 数字后自动添加正确单位间距
 */
export const SmartPunctuation = Extension.create({
  name: 'smartPunctuation',

  addInputRules() {
    return [
      // 英文引号 → 中文引号
      new InputRule({
        find: /"([^"]*)"$/,
        handler: ({ state, range, match }) => {
          const tr = state.tr.replaceWith(
            range.from, range.to,
            state.schema.text(`\u201C${match[1]}\u201D`)
          )
          return tr
        }
      }),
      // -- → 破折号
      new InputRule({
        find: /--$/,
        handler: ({ state, range }) => {
          return state.tr.replaceWith(range.from, range.to, state.schema.text('——'))
        }
      }),
    ]
  }
})
```

## 修改文件清单

### 需要创建
| 文件 | 说明 |
|------|------|
| `src/extensions/MarkdownSyntaxHighlight.ts` | 实时 Markdown 语法渲染 |
| `src/extensions/SlashCommands.ts` | 斜杠命令系统 |
| `src/components/editor/SlashCommandMenu.vue` | 斜杠命令浮窗 UI |
| `src/components/editor/ColorPicker.vue` | 文字/背景颜色选择器 |
| `src/components/editor/LinkDialog.vue` | 链接插入对话框 |
| `src/components/editor/ImageDialog.vue` | 图片插入对话框 |

### 需要修改
| 文件 | 修改内容 |
|------|----------|
| `src/components/editor/FloatingToolbar.vue` | 完善工具栏按钮和交互 |
| `src/components/editor/EditorPanel.vue` | 注册新扩展 |
| `src/extensions/TypewriterMode.ts` | 增强打字机模式 |
| `src/extensions/SmartPunctuation.ts` | 增强智能标点 |
| `src/stores/settings.ts` | 添加编辑器功能开关（打字机/智能标点/语法高亮） |

### 依赖添加
| 包 | 用途 |
|----|------|
| `@tiptap/extension-underline` | 下划线支持 |
| `@tiptap/extension-text-style` | 文字颜色/背景 |
| `@tiptap/extension-color` | 颜色扩展 |
| `@tiptap/extension-highlight` | 高亮背景扩展 |
| `@tiptap/extension-table` | 表格支持 |
| `@tiptap/extension-table-row` | 表格行 |
| `@tiptap/extension-table-cell` | 表格单元格 |
| `@tiptap/extension-table-header` | 表格表头 |
| `@tiptap/extension-task-list` | 待办列表 |
| `@tiptap/extension-task-item` | 待办项 |

## 验证标准

1. 选中文字后浮动工具栏出现，所有按钮功能正常
2. 粗体/斜体/删除线/行内代码 toggle 正确
3. 标题级别切换正确
4. 链接对话框可输入 URL 和显示文本
5. 图片对话框可输入 URL 或从素材库选择
6. 颜色选择器可设置文字颜色和高亮背景
7. 输入 / 触发斜杠命令面板，支持模糊搜索
8. 打字机模式：光标居中 + 非活跃段落淡化
9. 智能标点正确转换
10. Markdown 语法标记淡化显示
11. 所有功能可通过 Settings 开关控制

## 优先级

**P1** — 核心编辑体验增强
