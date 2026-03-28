# 04 -- 渲染引擎修复规范

> 优先级: P0
> 影响文件: EditorPanel.vue, services/export/*, extensions/*, components/preview/*
> 核心目标: 修复渲染缺陷，确保 Markdown 元素完整渲染

---

## 一、问题描述

1. **整体渲染功能存在强大硬伤** -- Markdown 元素渲染不完整或不正确
2. **代码块语法高亮** -- lowlight 配置可能不完整
3. **数学公式** -- 缺乏 KaTeX/MathJax 支持
4. **Mermaid 图表** -- 缺乏 Mermaid 渲染支持
5. **预览与导出不一致** -- 编辑器渲染和导出 HTML 可能存在差异
6. **表格渲染问题** -- 复杂表格可能渲染异常

## 二、现有渲染架构分析

### 2.1 编辑器渲染 (TipTap)

EditorPanel.vue 中已注册的 TipTap 扩展:
```
StarterKit (heading h1-h4, bold, italic, strike, code, blockquote, lists, etc.)
Placeholder
CharacterCount
UnderlineExtension
LinkExtension
WeChatFormat (自定义)
MarkdownHints (自定义)
SmartPunctuation (自定义)
TypewriterMode (自定义)
BracketMatching (自定义)
ImageExtension
Table + TableRow + TableCell + TableHeader
TaskList + TaskItem
CodeBlockLowlight (lowlight with common languages)
Highlight (multicolor)
TextAlign
TextStyle
Color
Subscript
Superscript
Dropcursor
SlashCommands (自定义)
```

### 2.2 预览渲染

WorkstationView.vue 使用 `usePreviewRenderer` composable:
- 接收编辑器 HTML body
- 根据选定平台 (wechat/xiaohongshu/zhihu) 调用对应 renderer
- 输出 CSS-inlined HTML

### 2.3 导出管线

`services/export/` 目录:
- themes.ts -- 主题预设
- utils.ts -- 导出工具函数
- zhihu-markdown.ts -- 知乎专用 Markdown 处理
- wechat.ts (可能存在) -- 微信公众号导出

## 三、需要修复和增强的渲染问题

### 3.1 代码块语法高亮完善

**当前**: 使用 `createLowlight(common)` 仅加载常用语言

**问题**: common 只包含约 35 种语言，可能缺少用户需要的语言

**修复方案**:
```typescript
import { createLowlight, all } from 'lowlight'

// 方案 A: 加载所有语言 (增加约 200KB 打包体积)
const lowlight = createLowlight(all)

// 方案 B (推荐): 按需加载常用语言
import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import markdown from 'highlight.js/lib/languages/markdown'
import diff from 'highlight.js/lib/languages/diff'
import shell from 'highlight.js/lib/languages/shell'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import dart from 'highlight.js/lib/languages/dart'
import lua from 'highlight.js/lib/languages/lua'
import r from 'highlight.js/lib/languages/r'
import scala from 'highlight.js/lib/languages/scala'

const lowlight = createLowlight()
// 注册所有语言...
lowlight.register('javascript', javascript)
lowlight.register('typescript', typescript)
// ... 逐一注册
```

**代码块增强**: 添加语言标签显示和复制按钮
- 在代码块右上角显示语言名称
- 添加"复制"按钮 (使用 Lucide `Copy` 图标)
- 这需要自定义 NodeView 或 CSS 装饰

### 3.2 数学公式支持 (KaTeX)

**需要安装**: `katex` 和 TipTap 数学扩展

```bash
pnpm add katex @tiptap/extension-mathematics
# 或者手动实现
```

**如果 @tiptap/extension-mathematics 不可用，自定义实现**:

创建 `inkforge/src/extensions/Mathematics.ts`:
```typescript
import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import katex from 'katex'

// 行内数学: $...$
// 块级数学: $$...$$

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  // ... KaTeX 渲染逻辑
})

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  // ... KaTeX 渲染逻辑
})
```

**CSS**: 引入 KaTeX CSS
```typescript
// main.ts
import 'katex/dist/katex.min.css'
```

### 3.3 Mermaid 图表支持

**需要安装**: `mermaid`

```bash
pnpm add mermaid
```

**实现方案**: 扩展代码块，当语言为 `mermaid` 时渲染为图表

创建 `inkforge/src/extensions/MermaidBlock.ts`:
```typescript
import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MermaidNodeView from '@/components/editor/MermaidNodeView.vue'

export const MermaidBlock = Node.create({
  name: 'mermaidBlock',
  group: 'block',
  atom: true,
  content: 'text*',
  // 当代码块的 language 为 mermaid 时激活
  // 渲染为 SVG 图表
})
```

创建 `inkforge/src/components/editor/MermaidNodeView.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import mermaid from 'mermaid'

const props = defineProps<{
  node: { textContent: string }
}>()

const svgContainer = ref<HTMLElement | null>(null)
const error = ref<string | null>(null)

async function renderDiagram(): Promise<void> {
  if (!svgContainer.value) return
  try {
    const { svg } = await mermaid.render(
      `mermaid-${Date.now()}`,
      props.node.textContent
    )
    svgContainer.value.innerHTML = svg
    error.value = null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Mermaid 渲染失败'
  }
}

onMounted(renderDiagram)
watch(() => props.node.textContent, renderDiagram)
</script>
```

### 3.4 表格渲染增强

**当前**: 基础 TipTap Table 扩展已配置 `resizable: true`

**增强**:
- 表格工具栏: 在表格选中时显示浮动工具栏
  - 添加行/列
  - 删除行/列
  - 合并单元格
  - 拆分单元格
  - 设置表头
- 表格样式: 斑马纹 (已有 CSS)
- 表格导出: 确保导出 HTML 中表格样式完整内联

### 3.5 图片渲染增强

**当前**: ImageExtension 支持 inline: false, base64

**增强**:
- 图片拖拽调整大小 (需要自定义 NodeView)
- 图片对齐 (居左/居中/居右)
- 图片标题 (caption)
- 粘贴板图片自动上传/base64 嵌入
- 图片加载失败时显示占位图

### 3.6 预览渲染一致性

确保 `usePreviewRenderer` 的输出与编辑器渲染一致:

1. 代码高亮样式在预览中也要应用 (导出 CSS 包含 hljs 类名)
2. 表格样式在预览中完整呈现
3. 图片在预览中正确显示
4. 数学公式在预览中渲染为 SVG (KaTeX 的 output: 'html')
5. Mermaid 图表在预览中渲染为 SVG

### 3.7 导出 HTML 渲染验证

对每个导出平台 (wechat/xiaohongshu/zhihu) 确保:
- 行内样式完整 (通过 juice CSS inliner)
- 代码块使用平台兼容的 HTML 结构
- 图片使用绝对 URL 或 base64
- 表格使用 inline style (微信不支持 class)
- 列表嵌套正确
- 引用块样式正确

## 四、写作增强

### 3.8 右键上下文菜单

**新建文件**: `inkforge/src/components/editor/EditorContextMenu.vue`

**触发方式**: 在 EditorPanel.vue 或 WorkstationView.vue 中监听 `@contextmenu.prevent`，将鼠标位置和编辑器实例传入组件。

**菜单项定义** (15 项，分 5 组):

| 菜单项 | 图标 (Lucide) | 快捷键 | 命令 |
|--------|-------------|--------|------|
| 剪切 | Scissors | Ctrl+X | `document.execCommand('cut')` |
| 复制 | Copy | Ctrl+C | `document.execCommand('copy')` |
| 粘贴 | ClipboardPaste | Ctrl+V | `document.execCommand('paste')` |
| --- 分隔线 --- | | | |
| 加粗 | Bold | Ctrl+B | `editor.chain().toggleBold().run()` |
| 斜体 | Italic | Ctrl+I | `editor.chain().toggleItalic().run()` |
| 下划线 | Underline | Ctrl+U | `editor.chain().toggleUnderline().run()` |
| 删除线 | Strikethrough | Ctrl+Shift+S | `editor.chain().toggleStrike().run()` |
| 行内代码 | Code | Ctrl+Shift+` | `editor.chain().toggleCode().run()` |
| --- 分隔线 --- | | | |
| 插入链接 | Link | Ctrl+K | 弹出链接输入对话框 |
| 插入图片 | ImagePlus | | 触发文件选择器（accept=image/*） |
| 插入表格 | Table | Ctrl+T | `editor.chain().insertTable({ rows: 3, cols: 3 }).run()` |
| 分割线 | Minus | Ctrl+Enter | `editor.chain().setHorizontalRule().run()` |
| --- 分隔线 --- | | | |
| 查找替换 | Search | Ctrl+H | 打开 FindReplace 面板 |
| 清除格式 | Eraser | Ctrl+\ | `editor.chain().clearNodes().unsetAllMarks().run()` |
| 全选 | CheckSquare | Ctrl+A | `editor.chain().selectAll().run()` |

**样式约束**:
- 白色背景 (`#ffffff`), `border-radius: 8px` (rounded-lg), `box-shadow: 0 10px 38px -10px ...` (shadow-lg)
- `z-index: 200`, `min-width: 220px`
- 触发: `@contextmenu.prevent` on `.editor-paper`
- Props: `editor: Editor`, `visible: boolean`, `position: { x: number; y: number }`
- 边界检测: 不超出视口，菜单弹出时自动调整位置

**组件接口与结构**:

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { Editor } from '@tiptap/core'
import {
  Scissors, Copy, ClipboardPaste, Bold, Italic, Underline,
  Strikethrough, Code, Link, ImagePlus, Table, Minus,
  Search, Eraser, CheckSquare,
} from 'lucide-vue-next'

interface MenuItem {
  id: string
  label: string
  icon: Component
  shortcut?: string
  action: () => void
  disabled?: boolean
}

interface Separator {
  id: string
  type: 'separator'
}

type MenuEntry = MenuItem | Separator

const props = defineProps<{
  editor: Editor | undefined
  visible: boolean
  position: { x: number; y: number }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-find-replace'): void
  (e: 'open-image-picker'): void
  (e: 'open-link-dialog'): void
}>()

const menuRef = ref<HTMLElement | null>(null)
const adjustedPosition = ref({ x: 0, y: 0 })

// 菜单项定义
const menuEntries = computed<MenuEntry[]>(() => {
  const editor = props.editor
  if (!editor) return []

  return [
    // -- 剪贴板组 (3 项)
    {
      id: 'cut', label: '剪切', icon: Scissors, shortcut: 'Ctrl+X',
      action: () => document.execCommand('cut'),
      disabled: editor.state.selection.empty,
    },
    {
      id: 'copy', label: '复制', icon: Copy, shortcut: 'Ctrl+C',
      action: () => document.execCommand('copy'),
      disabled: editor.state.selection.empty,
    },
    {
      id: 'paste', label: '粘贴', icon: ClipboardPaste, shortcut: 'Ctrl+V',
      action: () => document.execCommand('paste'),
    },
    { id: 'sep-1', type: 'separator' as const },
    // -- 格式化组 (5 项)
    {
      id: 'bold', label: '加粗', icon: Bold, shortcut: 'Ctrl+B',
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      id: 'italic', label: '斜体', icon: Italic, shortcut: 'Ctrl+I',
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: 'underline', label: '下划线', icon: Underline, shortcut: 'Ctrl+U',
      action: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      id: 'strikethrough', label: '删除线', icon: Strikethrough, shortcut: 'Ctrl+Shift+S',
      action: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      id: 'inline-code', label: '行内代码', icon: Code, shortcut: 'Ctrl+Shift+`',
      action: () => editor.chain().focus().toggleCode().run(),
    },
    { id: 'sep-2', type: 'separator' as const },
    // -- 插入组 (4 项)
    {
      id: 'link', label: '插入链接', icon: Link, shortcut: 'Ctrl+K',
      action: () => emit('open-link-dialog'),
    },
    {
      id: 'image', label: '插入图片', icon: ImagePlus,
      action: () => emit('open-image-picker'),
    },
    {
      id: 'table', label: '插入表格', icon: Table, shortcut: 'Ctrl+T',
      action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run(),
    },
    {
      id: 'horizontal-rule', label: '分割线', icon: Minus, shortcut: 'Ctrl+Enter',
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    { id: 'sep-3', type: 'separator' as const },
    // -- 工具组 (3 项)
    {
      id: 'find-replace', label: '查找替换', icon: Search, shortcut: 'Ctrl+H',
      action: () => emit('open-find-replace'),
    },
    {
      id: 'clear-format', label: '清除格式', icon: Eraser, shortcut: 'Ctrl+\\',
      action: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
      disabled: editor.state.selection.empty,
    },
    {
      id: 'select-all', label: '全选', icon: CheckSquare, shortcut: 'Ctrl+A',
      action: () => editor.chain().focus().selectAll().run(),
    },
  ]
})

// 位置边界检测 (不超出视口)
async function adjustMenuPosition(): Promise<void> {
  await nextTick()
  const el = menuRef.value
  if (!el) {
    adjustedPosition.value = { ...props.position }
    return
  }

  const rect = el.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let x = props.position.x
  let y = props.position.y

  if (x + rect.width > viewportWidth - 8) {
    x = viewportWidth - rect.width - 8
  }
  if (y + rect.height > viewportHeight - 8) {
    y = viewportHeight - rect.height - 8
  }

  adjustedPosition.value = { x: Math.max(8, x), y: Math.max(8, y) }
}

// 点击外部关闭
function handleClickOutside(event: MouseEvent): void {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

// 键盘 Escape 关闭
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

function handleItemClick(entry: MenuEntry): void {
  if ('type' in entry) return
  if (entry.disabled) return
  entry.action()
  emit('close')
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('keydown', handleKeydown)
  adjustMenuPosition()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="context-menu"
      :style="{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }"
    >
      <template v-for="entry in menuEntries" :key="entry.id">
        <div v-if="'type' in entry" class="context-menu__separator" />
        <button
          v-else
          class="context-menu__item"
          :class="{ 'context-menu__item--disabled': entry.disabled }"
          :disabled="entry.disabled"
          @click="handleItemClick(entry)"
        >
          <component :is="entry.icon" :size="16" class="context-menu__icon" />
          <span class="context-menu__label">{{ entry.label }}</span>
          <span v-if="entry.shortcut" class="context-menu__shortcut">{{ entry.shortcut }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>
```

**样式规范**:

```css
.context-menu {
  position: fixed;
  z-index: 200;
  min-width: 220px;
  padding: 6px;
  background: #ffffff;
  border: 1px solid #eceff1;
  border-radius: 8px;
  box-shadow:
    0 10px 38px -10px rgba(38, 50, 56, 0.18),
    0 10px 20px -15px rgba(38, 50, 56, 0.12);
}

.context-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #263238;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms ease;
}

.context-menu__item:hover {
  background: #f8fafc;
}

.context-menu__item--disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

.context-menu__icon {
  flex-shrink: 0;
  color: #607d8b;
}

.context-menu__label {
  flex: 1;
  text-align: left;
}

.context-menu__shortcut {
  flex-shrink: 0;
  font-size: 12px;
  color: #90a4ae;
  font-family: system-ui, sans-serif;
}

.context-menu__separator {
  height: 1px;
  margin: 4px 8px;
  background: #eceff1;
}
```

**EditorPanel.vue 集成方式**:

```vue
<script setup lang="ts">
// 在现有 setup 中添加:
import EditorContextMenu from './EditorContextMenu.vue'

const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })

function handleContextMenu(event: MouseEvent): void {
  event.preventDefault()
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuVisible.value = true
}
</script>

<template>
  <!-- 在编辑器容器上添加: -->
  <div class="editor-paper" @contextmenu="handleContextMenu">
    <!-- ... 编辑器内容 ... -->
  </div>

  <EditorContextMenu
    :editor="bodyEditor"
    :visible="contextMenuVisible"
    :position="contextMenuPosition"
    @close="contextMenuVisible = false"
    @open-find-replace="openFindReplace"
    @open-image-picker="openImagePicker"
    @open-link-dialog="openLinkDialog"
  />
</template>
```

---

### 3.9 查找和替换

**新建文件**: `inkforge/src/components/editor/FindReplace.vue`

> 2026-03-28 对齐说明：当前实现采用 `FindReplace.vue` + `EditorPanel.vue` 内联搜索状态/替换事务的组合方案，不再拆分独立 `FindReplacePlugin.ts`。这保留了相同的用户能力（Ctrl+F/Ctrl+H、匹配导航、当前替换、全部替换），同时避免额外的 ProseMirror 插件维护成本。

**触发方式**: `Ctrl+H`（查找替换）或 `Ctrl+F`（仅查找）。由 EditorPanel.vue 或 WorkstationView.vue 中的全局快捷键监听器触发。

**UI 布局**:

```
+----------------------------------------------+
| [Search icon] [查找输入框___________________] |
| [Replace icon][替换输入框___________________] |
|                                              |
| [Aa] [.*] [W]    3/17    [ChevronUp] [ChevronDown] |
|                                              |
| [替换] [全部替换]                   [X 关闭]  |
+----------------------------------------------+
```

**功能详述**:

| 按钮 | 图标 (Lucide) | 功能 | 状态 |
|------|-------------|------|------|
| [Aa] | CaseSensitive | 大小写敏感 toggle | 默认关闭 |
| [.*] | Regex | 正则表达式 toggle | 默认关闭 |
| [W] | WholeWord | 全词匹配 toggle | 默认关闭 |
| 上箭头 | ChevronUp | 导航到上一个匹配 | |
| 下箭头 | ChevronDown | 导航到下一个匹配 | |
| 替换 | Replace | 替换当前匹配 | |
| 全部替换 | ReplaceAll | 替换所有匹配 | |
| 关闭 | X | 关闭面板，清除高亮 | |

**组件接口**:

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/core'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Search, Replace, ChevronUp, ChevronDown, X, CaseSensitive, Regex, WholeWord } from 'lucide-vue-next'

const props = defineProps<{
  editor: Editor | undefined
  visible: boolean
  findOnly?: boolean  // Ctrl+F 模式: 隐藏替换行
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 搜索状态
const searchText = ref('')
const replaceText = ref('')
const caseSensitive = ref(false)
const useRegex = ref(false)
const wholeWord = ref(false)

// 匹配结果
const matches = ref<Array<{ from: number; to: number }>>([])
const currentMatchIndex = ref(0)

const matchCountLabel = computed(() => {
  if (!searchText.value.trim()) return ''
  if (matches.value.length === 0) return '无匹配'
  return `${currentMatchIndex.value + 1}/${matches.value.length}`
})

// 搜索引擎
function performSearch(): void {
  if (!props.editor || !searchText.value.trim()) {
    matches.value = []
    currentMatchIndex.value = 0
    clearDecorations()
    return
  }

  const doc = props.editor.state.doc
  const text = doc.textBetween(0, doc.content.size, '\n')
  const found: Array<{ from: number; to: number }> = []

  let pattern: RegExp
  try {
    const flags = caseSensitive.value ? 'g' : 'gi'
    if (useRegex.value) {
      pattern = new RegExp(searchText.value, flags)
    } else {
      const escaped = searchText.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const base = wholeWord.value ? `\\b${escaped}\\b` : escaped
      pattern = new RegExp(base, flags)
    }
  } catch {
    matches.value = []
    return
  }

  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    // 将纯文本偏移映射回 ProseMirror 文档位置
    const from = mapTextOffsetToDocPos(doc, match.index)
    const to = mapTextOffsetToDocPos(doc, match.index + match[0].length)
    found.push({ from, to })
    if (match.index === pattern.lastIndex) pattern.lastIndex++
  }

  matches.value = found
  currentMatchIndex.value = found.length > 0 ? 0 : 0
  applyDecorations()
}

// 导航
function goToNextMatch(): void {
  if (matches.value.length === 0) return
  currentMatchIndex.value = (currentMatchIndex.value + 1) % matches.value.length
  scrollToCurrentMatch()
  applyDecorations()
}

function goToPrevMatch(): void {
  if (matches.value.length === 0) return
  currentMatchIndex.value =
    (currentMatchIndex.value - 1 + matches.value.length) % matches.value.length
  scrollToCurrentMatch()
  applyDecorations()
}

// 替换
function replaceCurrent(): void {
  if (!props.editor || matches.value.length === 0) return
  const match = matches.value[currentMatchIndex.value]
  props.editor.chain().focus()
    .deleteRange({ from: match.from, to: match.to })
    .insertContentAt(match.from, replaceText.value)
    .run()
  performSearch()
}

function replaceAll(): void {
  if (!props.editor || matches.value.length === 0) return
  // 从后往前替换避免位置偏移
  const sorted = [...matches.value].sort((a, b) => b.from - a.from)
  const chain = props.editor.chain().focus()
  for (const match of sorted) {
    chain.deleteRange({ from: match.from, to: match.to })
      .insertContentAt(match.from, replaceText.value)
  }
  chain.run()
  performSearch()
}

// Decoration 管理（高亮匹配）
function applyDecorations(): void {
  // 使用 TipTap Plugin 注册 Decoration:
  // - 普通匹配: Decoration.inline(from, to, { class: 'find-match' })
  // - 当前匹配: Decoration.inline(from, to, { class: 'find-match--current' })
}

function clearDecorations(): void {
  // 移除所有搜索高亮 Decoration
}

function scrollToCurrentMatch(): void {
  if (!props.editor || matches.value.length === 0) return
  const match = matches.value[currentMatchIndex.value]
  const domPos = props.editor.view.domAtPos(match.from)
  if (domPos.node instanceof HTMLElement) {
    domPos.node.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// 文本偏移到文档位置映射
function mapTextOffsetToDocPos(doc: any, offset: number): number {
  let pos = 0
  let textOffset = 0
  doc.descendants((node: any, nodePos: number) => {
    if (node.isText && textOffset + node.text.length >= offset && pos === 0) {
      pos = nodePos + (offset - textOffset)
      return false
    }
    if (node.isText) {
      textOffset += node.text.length
    }
    if (node.isBlock && textOffset < offset) {
      textOffset += 1  // 块间换行符
    }
    return true
  })
  return pos
}

// 响应搜索条件变更
watch([searchText, caseSensitive, useRegex, wholeWord], performSearch, { flush: 'post' })

// 面板关闭时清除
watch(() => props.visible, (v) => {
  if (!v) {
    clearDecorations()
    searchText.value = ''
    replaceText.value = ''
  }
})
</script>
```

**高亮样式**:

```css
/* 所有匹配: 浅黄色背景 */
.find-match {
  background: rgba(255, 235, 59, 0.4);
  border-radius: 2px;
}

/* 当前匹配: 品牌红浅色背景 */
.find-match--current {
  background: rgba(211, 47, 47, 0.25);
  border-radius: 2px;
  outline: 2px solid rgba(211, 47, 47, 0.4);
}
```

**面板样式**:

```css
.find-replace-panel {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 150;
  width: 360px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  border: 1px solid #eceff1;
  border-radius: 12px;
  box-shadow:
    0 8px 32px rgba(38, 50, 56, 0.12),
    0 2px 8px rgba(38, 50, 56, 0.06);
}

.find-replace-panel__row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.find-replace-panel__input {
  flex: 1;
  height: 34px;
  padding: 0 10px;
  border: 1px solid rgba(96, 125, 139, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  font: inherit;
  font-size: 13px;
  color: #263238;
}

.find-replace-panel__input:focus {
  outline: none;
  border-color: rgba(211, 47, 47, 0.45);
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.12);
}

.find-replace-panel__toggle {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(96, 125, 139, 0.18);
  border-radius: 6px;
  background: transparent;
  color: #607d8b;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.find-replace-panel__toggle--active {
  background: rgba(211, 47, 47, 0.1);
  color: #d32f2f;
  border-color: rgba(211, 47, 47, 0.25);
}

.find-replace-panel__count {
  font-size: 12px;
  color: #607d8b;
  min-width: 48px;
  text-align: center;
}

.find-replace-panel__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
}
```

**键盘交互**:
- `Enter` 在查找框中: 跳转到下一个匹配
- `Shift+Enter` 在查找框中: 跳转到上一个匹配
- `Escape`: 关闭面板
- `Tab`: 在查找框和替换框之间切换焦点

---

### 3.10 拖拽图片插入

**实现位置**: 在 EditorPanel.vue 中添加拖拽事件监听器。

**事件监听**: `dragover` + `dragleave` + `drop` 绑定在编辑器容器元素上。

**拖拽处理逻辑**:

```typescript
// EditorPanel.vue <script setup> 中添加:

import { useAssetStore } from '@/stores/asset'

const assetStore = useAssetStore()
const isDragOver = ref(false)

// 图片大小阈值: 500KB 以下用 base64，以上存入 IndexedDB
const BASE64_SIZE_THRESHOLD = 500 * 1024

function handleDragOver(event: DragEvent): void {
  event.preventDefault()
  if (!event.dataTransfer) return

  const hasImageType = Array.from(event.dataTransfer.types).includes('Files')
  if (hasImageType) {
    event.dataTransfer.dropEffect = 'copy'
    isDragOver.value = true
  }
}

function handleDragLeave(event: DragEvent): void {
  // 判断是否真的离开了容器（而非进入子元素）
  const relatedTarget = event.relatedTarget as HTMLElement | null
  const container = event.currentTarget as HTMLElement
  if (!relatedTarget || !container.contains(relatedTarget)) {
    isDragOver.value = false
  }
}

async function handleDrop(event: DragEvent): Promise<void> {
  event.preventDefault()
  isDragOver.value = false

  const editor = bodyEditor.value
  if (!editor) return

  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue
    await insertImageFile(editor, file)
  }
}

async function insertImageFile(editor: Editor, file: File): Promise<void> {
  if (file.size < BASE64_SIZE_THRESHOLD) {
    // 小图片: 转为 base64 直接嵌入
    const dataUrl = await readFileAsDataURL(file)
    editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run()
  } else {
    // 大图片: 存入 IndexedDB assets 表，创建 Blob URL 引用
    const asset = await assetStore.addAsset({
      name: file.name,
      type: 'image',
      mimeType: file.type,
      size: file.size,
      blob: file,
      tags: ['drag-drop'],
    })
    const blobUrl = URL.createObjectURL(file)
    editor.chain().focus().setImage({ src: blobUrl, alt: file.name, title: asset.id }).run()
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}
```

**拖拽视觉指示**:

```vue
<template>
  <div
    class="editor-paper"
    :class="{ 'editor-paper--drag-over': isDragOver }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 编辑器内容 -->

    <!-- 拖拽提示遮罩 -->
    <Transition name="fade">
      <div v-if="isDragOver" class="drag-overlay">
        <ImagePlus :size="32" />
        <span>释放以插入图片</span>
      </div>
    </Transition>
  </div>
</template>
```

```css
.editor-paper--drag-over {
  border: 2px dashed #d32f2f !important;
  background: rgba(211, 47, 47, 0.03);
}

.drag-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(6px);
  border-radius: inherit;
  color: #d32f2f;
  font-size: 15px;
  font-weight: 600;
  pointer-events: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

---

### 3.11 剪贴板图片粘贴

**实现位置**: 在 EditorPanel.vue 中添加 `paste` 事件监听器。

**事件监听**: 直接绑定在编辑器 DOM 元素上，或通过 TipTap 的 `handlePaste` 扩展钩子实现。

**粘贴处理逻辑**:

```typescript
// EditorPanel.vue <script setup> 中添加:

function handlePaste(event: ClipboardEvent): void {
  const items = event.clipboardData?.items
  if (!items) return

  for (const item of Array.from(items)) {
    if (!item.type.startsWith('image/')) continue

    event.preventDefault()
    const file = item.getAsFile()
    if (!file) continue

    const editor = bodyEditor.value
    if (!editor) continue

    // 复用拖拽的图片插入逻辑
    void insertImageFile(editor, file)
    return  // 只处理第一个图片
  }
}
```

**替代方案: TipTap 扩展钩子**（推荐，更精确控制）:

```typescript
// 在 EditorPanel.vue 的 TipTap 扩展列表中添加:
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const PasteImageHandler = Extension.create({
  name: 'pasteImageHandler',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('pasteImageHandler'),
        props: {
          handlePaste: (view, event) => {
            const items = event.clipboardData?.items
            if (!items) return false

            for (const item of Array.from(items)) {
              if (!item.type.startsWith('image/')) continue

              const file = item.getAsFile()
              if (!file) continue

              event.preventDefault()
              void insertImageFile(this.editor, file)
              return true
            }

            return false
          },
        },
      }),
    ]
  },
})

// 注册到编辑器扩展列表:
// extensions: [...existingExtensions, PasteImageHandler]
```

**支持的粘贴场景**:
1. 从系统截图工具粘贴（Windows Snipping Tool、macOS Screenshot）
2. 从浏览器中右键"复制图片"后粘贴
3. 从图片编辑软件中粘贴
4. 从其他文档中复制包含图片的内容

**粘贴后的图片处理流程**:
1. 检测剪贴板中是否有 `image/*` 类型的条目
2. 获取 File 对象
3. 根据文件大小决定存储方式（base64 vs IndexedDB）
4. 在编辑器光标位置插入图片节点
5. 如果存入 IndexedDB，在图片节点的 `title` 属性中记录 asset ID 用于后续关联

---

### 3.12 预览一致性: 参照 doocs/md 质量标准

确保右侧预览面板（Stage）的渲染结果 100% 匹配目标平台实际显示效果。

**各平台渲染约束**:

| 平台 | CSS | HTML | 特殊限制 |
|------|-----|------|---------|
| 微信公众号 | 所有样式必须内联（juice），不支持 `class`，不支持 CSS 变量，不支持 `<style>` 标签 | 不支持 SVG，不支持 `<video>`/`<audio>` | 外链 `<a>` 自动转脚注；图片必须用 `https://` 绝对路径 |
| 小红书 | 纯文本模式: 不支持 HTML，emoji 注入替代格式标记 | HTML 模式: 仅支持基础标签，简洁排版 | 图片通过平台上传，不嵌入 HTML |
| 知乎 | 支持部分内联样式和 class | 支持大部分 HTML 标签 | 支持 LaTeX `$$...$$`（平台内置 MathJax）；代码块需要正确的 `lang` 属性 |

**预览面板验证按钮**:

在 PreviewPanel.vue 或 WorkstationView.vue 的预览区域顶部工具栏中添加一个"检测"按钮:

```vue
<button
  class="secondary-btn"
  type="button"
  title="检测导出 HTML 的平台合规性"
  @click="runQualityCheck"
>
  <ShieldCheck :size="14" />
  <span>合规检测</span>
</button>
```

**检测逻辑**: 调用已有的 `quality-detector.ts` 服务:

```typescript
import { ShieldCheck } from 'lucide-vue-next'
import { checkQuality, type QualityReport } from '@/services/export/quality-detector'

const qualityReport = ref<QualityReport | null>(null)

async function runQualityCheck(): Promise<void> {
  if (!previewHtml.value) return
  qualityReport.value = await checkQuality(previewHtml.value, currentPlatform.value)
}
```

**检测结果展示**: 在预览面板下方显示检测结果卡片:

| 结果等级 | 图标 (Lucide) | 颜色 | 含义 |
|---------|-------------|------|------|
| 通过 | CheckCircle | #2e7d32 (绿色) | 所有检测项均通过 |
| 警告 | AlertTriangle | #f57f17 (琥珀色) | 存在可能影响显示的问题 |
| 错误 | XCircle | #c62828 (红色) | 存在导致渲染失败的问题 |

**检测项清单**:

| 检测项 | 适用平台 | 检测逻辑 |
|--------|---------|---------|
| 内联样式完整性 | wechat | 检查是否存在 `<style>` 标签或 `class` 属性 |
| SVG 元素存在 | wechat | 检查是否包含 `<svg>` 标签 |
| 外链检查 | wechat | 检查 `<a href="http">` 是否已转脚注 |
| 图片 src 协议 | wechat | 检查图片 `src` 是否为 `https://` 或 `data:` |
| CSS 变量使用 | wechat | 检查是否包含 `var(--` 语法 |
| LaTeX 语法正确性 | zhihu | 检查 `$$` 对是否闭合 |
| 代码块语言标签 | zhihu | 检查 `<pre>` 是否有 `data-language` |
| HTML 标签白名单 | xiaohongshu | 检查是否使用了不支持的标签 |
| 图片尺寸 | all | 检查图片是否超过平台推荐最大宽度 |
| 表格结构 | wechat | 检查表格是否使用 inline style 而非 class |

---

## 五、代码块复制按钮实现

在 EditorPanel.vue 的样式中添加:

```css
/* 代码块语言标签和复制按钮 */
.tiptap-content :deep(.ProseMirror pre) {
  position: relative;
}

.tiptap-content :deep(.ProseMirror pre::before) {
  content: attr(data-language);
  position: absolute;
  top: 8px;
  right: 48px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

复制按钮需要自定义 CodeBlock NodeView:
- 显示语言标签
- 显示复制按钮 (Lucide `Copy` 图标)
- 点击复制: `navigator.clipboard.writeText(code)`
- 复制成功: 图标变为 `Check`，2 秒后恢复

## 六、文件清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | components/editor/EditorPanel.vue | 扩展 lowlight 语言列表、注册新扩展、拖拽/粘贴图片、右键菜单集成、查找替换集成 |
| 新增 | components/editor/EditorContextMenu.vue | 右键上下文菜单组件，15 项菜单 (3.8) |
| 新增 | components/editor/FindReplace.vue | 查找和替换面板组件 (3.9) |
| 对齐 | EditorPanel.vue 内联 paste 处理 | 剪贴板图片粘贴通过 `handlePaste()` 与真实资产上传链路实现，无独立 `PasteImageHandler.ts` |
| 对齐 | EditorPanel.vue 内联 find state | 匹配收集、导航与替换事务由 `EditorPanel.vue` 管理，无独立 `FindReplacePlugin.ts` |
| 新增 | extensions/KeyboardShortcuts.ts | 快捷键扩展 (已在 03 规范中说明) |
| 可选 | extensions/Mathematics.ts | KaTeX 数学公式扩展 (如需，当前实现未引入独立扩展文件) |
| 可选 | extensions/MermaidBlock.ts | Mermaid 图表扩展 (如需，当前实现未引入独立扩展文件) |
| 可选 | components/editor/MermaidNodeView.vue | Mermaid 渲染组件 |
| 可选 | components/editor/CodeBlockView.vue | 代码块自定义 NodeView (语言标签+复制) |
| 修改 | services/export/themes.ts | 确保导出包含代码高亮 CSS |
| 修改 | services/export/utils.ts | 修复导出渲染一致性 |
| 修改 | services/export/quality-detector.ts | 合规检测服务，参照 doocs/md 质量标准 (3.12) |
| 修改 | components/preview/PreviewPanel.vue | 添加合规检测按钮 (3.12) |

## 七、依赖安装

```bash
# 数学公式 (可选，根据需求)
cd inkforge && pnpm add katex
cd inkforge && pnpm add -D @types/katex

# Mermaid 图表 (可选，根据需求)
cd inkforge && pnpm add mermaid
```

> 注意: 如果 katex 和 mermaid 增加过多打包体积，可以使用动态导入 (lazy loading):
> ```typescript
> const katex = await import('katex')
> const mermaid = await import('mermaid')
> ```

## 八、验收标准

### 渲染核心
- [ ] 代码块支持 25+ 种编程语言的语法高亮
- [ ] 代码块显示语言标签和复制按钮
- [ ] 数学公式 (行内 $...$ 和块级 $$...$$) 正确渲染 (如实装)
- [ ] Mermaid 图表正确渲染 (如实装)
- [ ] 表格可拖拽调整列宽
- [ ] 图片可调整大小和对齐
- [ ] 预览面板渲染结果与编辑器一致
- [ ] 导出 HTML 在各平台正确显示

### 写作增强
- [ ] 右键菜单在编辑器区域正确弹出，位置不超出视口
- [ ] 右键菜单包含 15 项: 剪切/复制/粘贴 | 加粗/斜体/下划线/删除线/行内代码 | 插入链接/插入图片/插入表格/分割线 | 查找替换/清除格式/全选
- [ ] 右键菜单点击外部或按 Escape 关闭
- [ ] 查找面板 Ctrl+F 打开时隐藏替换行，Ctrl+H 打开时显示完整面板
- [ ] 查找支持大小写敏感/正则表达式/全词匹配三种模式切换
- [ ] 所有匹配以浅黄色高亮，当前匹配以品牌红浅色高亮
- [ ] 上/下箭头可在匹配之间循环导航
- [ ] 替换和全部替换功能正确执行
- [ ] 拖拽图片到编辑器区域时显示虚线边框和"释放以插入图片"提示
- [ ] 拖拽释放后图片正确插入编辑器（小图 base64 / 大图 IndexedDB）
- [ ] 从系统剪贴板粘贴截图或复制的图片时正确插入编辑器
- [ ] 预览面板的合规检测按钮可调用 quality-detector 并显示检测结果

### 质量基线
- [ ] 无 Console 错误
- [ ] TypeScript 编译无错误
- [ ] 所有图标使用 lucide-vue-next，无 Emoji
- [ ] 新增组件遵循现有 EditorPanel.vue 的样式约定
