# 05 -- 浮动工具栏 + 上下文菜单 + 斜杠命令规范

> 优先级: P1
> 影响文件: FloatingToolbar.vue, 新增 EditorContextMenu.vue, SlashCommands.ts, SlashCommandMenu.vue
> 核心目标: 完善编辑器功能发现性，修复 FloatingToolbar 溢出问题，新增右键上下文菜单，扩展斜杠命令
> 设计原则: 无 Emoji, 无 Mock 数据, 无 EditorToolbar.vue (不做固定顶部工具栏)

---

## 一、设计理念

InkForge 编辑器**没有固定顶部工具栏** (EditorToolbar.vue)。用户明确不需要类 Word 的固定工具栏，编辑器应保持 Markdown-first 的简洁感。

用户通过以下 4 种方式发现和使用编辑器功能:

| # | 方式 | 触发条件 | 目标用户 | 核心场景 |
|---|------|---------|---------|---------|
| 1 | 斜杠命令 `/` | 在空行或行首输入 `/` | 所有用户 | 插入块级元素 (标题/引用/代码块/列表/表格/分割线/图片) |
| 2 | 浮动工具栏 | 选中文本时自动出现 | 所有用户 | 行内格式化 (加粗/斜体/下划线/删除线/高亮/颜色/链接) |
| 3 | 右键上下文菜单 | 在编辑区域右键 | 桌面用户 | 剪切/复制/粘贴 + 常用格式化 + 插入操作 |
| 4 | 键盘快捷键 | 按下快捷键组合 | 高级用户 | 全部操作 (参见 03-keyboard-shortcuts-spec.md) |

这 4 种方式形成互补的功能发现体系，确保不同水平的用户都能高效使用编辑器。

---

## 二、FloatingToolbar 溢出修复

> 2026-03-28 对齐说明：当前 `FloatingToolbar.vue` 已通过 `preferredTop` / `fallbackTop` / `maxTop` 完成上下边界翻转，通过 `leftEdge` / `rightEdge` 完成左右夹紧，并使用 `ResizeObserver` 监听 toolbar 与 `.editor-paper` 宽度，在窄屏下切换到 `is-compact` 折叠布局。

### 2.1 问题描述

FloatingToolbar.vue 当前包含 28 个按钮 (格式组 5 + 高亮 1 + 颜色 1 + 上标/下标 2 + 标题组 3 + 块级组 4 + 对齐组 4 + 插入组 4 + 分隔线 4)。在窄屏或纸张宽度为 narrow (560px) 时，工具栏可能超出 `.editor-paper` 容器的左右边界。

### 2.2 修复方案

在 `updateToolbar()` 函数中添加边界检测和位置修正:

```typescript
function updateToolbar(): void {
  const editor = props.editor
  if (!editor || !editor.view) {
    visible.value = false
    return
  }

  const { state, view } = editor
  const { selection } = state
  const { from, to, empty } = selection

  if (empty) {
    visible.value = false
    return
  }

  try {
    const start = view.coordsAtPos(from)
    const end = view.coordsAtPos(to)

    const editorRect = view.dom.closest('.editor-paper')?.getBoundingClientRect()
      ?? view.dom.getBoundingClientRect()

    const centerX = (start.left + end.right) / 2 - editorRect.left
    const topY = start.top - editorRect.top - 50

    // === 边界修正 ===
    let adjustedLeft = centerX
    const toolbarWidth = toolbarEl.value?.offsetWidth ?? 600

    // 左边界: 不超出 .editor-paper 左侧
    const leftEdge = toolbarWidth / 2 + 8
    if (adjustedLeft < leftEdge) {
      adjustedLeft = leftEdge
    }

    // 右边界: 不超出 .editor-paper 右侧
    const rightEdge = editorRect.width - toolbarWidth / 2 - 8
    if (adjustedLeft > rightEdge) {
      adjustedLeft = rightEdge
    }

    // 上边界: 不超出编辑区域顶部
    const adjustedTop = Math.max(4, topY)

    toolbarStyle.value = {
      top: `${adjustedTop}px`,
      left: `${adjustedLeft}px`,
    }
    visible.value = true
  } catch {
    visible.value = false
  }
}
```

### 2.3 窄屏自动换行

当 `.editor-paper` 宽度 < 480px 时，FloatingToolbar 应自动换行 (允许多行显示):

```css
.floating-toolbar {
  /* 现有样式保持不变 */
  max-width: calc(var(--paper-width, 680px) - 16px);
  flex-wrap: wrap;
}
```

---

## 三、FloatingToolbar 快捷键提示补全

### 3.1 完整按钮 title 列表

以下为 FloatingToolbar.vue 中所有按钮应显示的 `title` 属性值（包含快捷键）:

| # | 按钮 | 当前 title | 修正后 title |
|---|------|-----------|-------------|
| 1 | Bold | `加粗 (Ctrl+B)` | `加粗 (Ctrl+B)` -- 已正确 |
| 2 | Italic | `斜体 (Ctrl+I)` | `斜体 (Ctrl+I)` -- 已正确 |
| 3 | Underline | `下划线 (Ctrl+U)` | `下划线 (Ctrl+U)` -- 已正确 |
| 4 | Strikethrough | `删除线 (Ctrl+Shift+X)` | `删除线 (Ctrl+Shift+S)` |
| 5 | Code | `行内代码 (Ctrl+E)` | `行内代码 (Ctrl+Shift+\`)` |
| 6 | Highlighter | `高亮标记` | `高亮标记 (Ctrl+Shift+H)` |
| 7 | Palette | `文字颜色` | `文字颜色` -- 无快捷键，保持 |
| 8 | Superscript | `上标` | `上标` -- 无快捷键，保持 |
| 9 | Subscript | `下标` | `下标` -- 无快捷键，保持 |
| 10 | Heading1 | `一级标题` | `一级标题 (Ctrl+1)` |
| 11 | Heading2 | `二级标题` | `二级标题 (Ctrl+2)` |
| 12 | Heading3 | `三级标题` | `三级标题 (Ctrl+3)` |
| 13 | Quote | `引用 (Ctrl+Shift+B)` | `引用 (Ctrl+Shift+Q)` |
| 14 | BulletList | `无序列表` | `无序列表 (Ctrl+Shift+])` |
| 15 | OrderedList | `有序列表` | `有序列表 (Ctrl+Shift+[)` |
| 16 | TaskList | `任务列表` | `任务列表 (Ctrl+Shift+X)` |
| 17 | AlignLeft | `左对齐` | `左对齐` -- 无专用快捷键，保持 |
| 18 | AlignCenter | `居中对齐` | `居中对齐` -- 无专用快捷键，保持 |
| 19 | AlignRight | `右对齐` | `右对齐` -- 无专用快捷键，保持 |
| 20 | AlignJustify | `两端对齐` | `两端对齐` -- 无专用快捷键，保持 |
| 21 | Link | `链接 (Ctrl+K)` | `链接 (Ctrl+K)` -- 已正确 |
| 22 | CodeBlock | `代码块` | `代码块 (Ctrl+Shift+K)` |
| 23 | HorizontalRule | `分割线` | `分割线 (Ctrl+Enter)` |
| 24 | Table | `插入表格` | `插入表格 (Ctrl+T)` |

### 3.2 修改文件

在 FloatingToolbar.vue 的 template 中逐一更新 `title` 属性。需要修改的按钮:

- 删除线: `Ctrl+Shift+X` -> `Ctrl+Shift+S`
- 行内代码: `Ctrl+E` -> `` Ctrl+Shift+` ``
- 高亮: 添加 `(Ctrl+Shift+H)`
- 标题: 添加 `(Ctrl+1/2/3)`
- 引用: `Ctrl+Shift+B` -> `Ctrl+Shift+Q`
- 列表: 添加快捷键
- 代码块、分割线、表格: 添加快捷键

---

## 四、右键上下文菜单

### 4.1 新建组件

**路径**: `inkforge/src/components/editor/EditorContextMenu.vue`

### 4.2 菜单结构

```typescript
interface ContextMenuItem {
  id: string
  label: string
  icon: Component  // lucide-vue-next 图标
  shortcut?: string  // 右侧灰色快捷键文字
  action: () => void
  dividerAfter?: boolean  // 此项后显示分隔线
  disabled?: boolean
}
```

**菜单项列表**:

| # | 分组 | 标签 | 图标 (Lucide) | 快捷键 | 说明 |
|---|------|------|-------------|--------|------|
| 1 | 剪贴板 | 剪切 | `Scissors` | `Ctrl+X` | `document.execCommand('cut')` |
| 2 | | 复制 | `Copy` | `Ctrl+C` | `document.execCommand('copy')` |
| 3 | | 粘贴 | `ClipboardPaste` | `Ctrl+V` | `document.execCommand('paste')` |
| -- | 分隔线 | | | | |
| 4 | 格式 | 加粗 | `Bold` | `Ctrl+B` | `editor.commands.toggleBold()` |
| 5 | | 斜体 | `Italic` | `Ctrl+I` | `editor.commands.toggleItalic()` |
| 6 | | 下划线 | `Underline` | `Ctrl+U` | `editor.commands.toggleUnderline()` |
| 7 | | 删除线 | `Strikethrough` | `Ctrl+Shift+S` | `editor.commands.toggleStrike()` |
| 8 | | 行内代码 | `Code` | `` Ctrl+Shift+` `` | `editor.commands.toggleCode()` |
| -- | 分隔线 | | | | |
| 9 | 插入 | 插入链接 | `Link` | `Ctrl+K` | 弹出链接输入浮层 |
| 10 | | 插入图片 | `ImagePlus` | | 触发文件选择器 |
| 11 | | 插入表格 | `Table` | `Ctrl+T` | `editor.commands.insertTable(...)` |
| 12 | | 插入分割线 | `Minus` | `Ctrl+Enter` | `editor.commands.setHorizontalRule()` |
| -- | 分隔线 | | | | |
| 13 | 工具 | 查找替换 | `Search` | `Ctrl+H` | 打开查找替换面板 |
| 14 | | 清除格式 | `Eraser` | `Ctrl+\` | `editor.chain().clearNodes().unsetAllMarks().run()` |
| 15 | | 全选 | `CheckSquare` | `Ctrl+A` | `editor.commands.selectAll()` |

### 4.3 组件 Props

```typescript
const props = defineProps<{
  editor: Editor | undefined
  visible: boolean
  position: { x: number; y: number }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-link-editor'): void
  (e: 'open-image-picker'): void
  (e: 'open-find-replace'): void
}>()
```

### 4.4 触发方式

在 EditorPanel.vue 的 `.editor-paper` 上添加 `@contextmenu.prevent`:

```vue
<div
  class="editor-paper"
  @contextmenu.prevent="handleContextMenu"
>
  <!-- TipTap EditorContent -->
</div>
```

```typescript
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })

function handleContextMenu(event: MouseEvent): void {
  const paperEl = event.currentTarget as HTMLElement
  const paperRect = paperEl.getBoundingClientRect()

  contextMenuPosition.value = {
    x: event.clientX - paperRect.left,
    y: event.clientY - paperRect.top,
  }
  contextMenuVisible.value = true
}
```

### 4.5 样式规范

```css
.context-menu {
  position: absolute;
  z-index: 200;
  min-width: 220px;
  max-width: 280px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 125, 139, 0.14);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(38, 50, 56, 0.12), 0 2px 6px rgba(38, 50, 56, 0.06);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #263238;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms ease;
}

.context-menu-item:hover {
  background: rgba(211, 47, 47, 0.06);
}

.context-menu-item:disabled {
  opacity: 0.4;
  cursor: default;
}

.context-menu-shortcut {
  margin-left: auto;
  font-size: 11px;
  color: #90A4AE;
  font-family: 'SF Mono', monospace;
}

.context-menu-divider {
  height: 1px;
  margin: 4px 8px;
  background: rgba(96, 125, 139, 0.12);
}
```

### 4.6 点击外部关闭

```typescript
function handleClickOutside(event: MouseEvent): void {
  if (contextMenuVisible.value) {
    contextMenuVisible.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
```

### 4.7 参考实现

TabBar.vue 已有右键菜单实现 (`contextMenu` ref + `@contextmenu.prevent`)，可作为布局和交互参考。

---

## 五、斜杠命令扩展

### 5.1 当前命令列表 (11 个)

SlashCommands.ts 的 `SLASH_COMMANDS` 数组当前包含:

| # | id | label | category | 图标 |
|---|-----|-------|----------|------|
| 1 | h1 | 一级标题 | heading | Heading1 |
| 2 | h2 | 二级标题 | heading | Heading2 |
| 3 | h3 | 三级标题 | heading | Heading3 |
| 4 | quote | 引用块 | block | Quote |
| 5 | code | 代码块 | block | Code2 |
| 6 | divider | 分隔线 | insert | Minus |
| 7 | bullet | 无序列表 | list | List |
| 8 | ordered | 有序列表 | list | ListOrdered |
| 9 | task | 任务列表 | list | CheckSquare |
| 10 | table | 表格 | insert | Table |
| 11 | image | 图片 | insert | ImagePlus |

### 5.2 扩展到 20+ 个

新增命令:

| # | id | label | description | category | 图标 (Lucide) | action |
|---|-----|-------|------------|----------|-------------|--------|
| 12 | h4 | 四级标题 | 最小的标题 | heading | `Heading4` | `toggleHeading({ level: 4 })` |
| 13 | paragraph | 正文 | 切换为普通段落 | heading | `Pilcrow` | `setParagraph()` |
| 14 | link | 链接 | 插入超链接 | insert | `Link` | 弹出链接输入浮层 |
| 15 | highlight | 高亮 | 标记高亮文字 | insert | `Highlighter` | `toggleHighlight({ color: '#FFEB3B' })` |
| 16 | textColor | 文字颜色 | 设置文字颜色 | insert | `Palette` | 弹出颜色选择 |
| 17 | alignCenter | 居中对齐 | 段落居中 | block | `AlignCenter` | `setTextAlign('center')` |
| 18 | alignRight | 右对齐 | 段落右对齐 | block | `AlignRight` | `setTextAlign('right')` |
| 19 | callout | 提示框 | 信息提示 | advanced | `AlertCircle` | 自定义 blockquote + CSS class |
| 20 | details | 折叠块 | 可折叠内容区 | advanced | `ChevronDown` | 插入 `<details><summary>` 结构 |
| 21 | clearFormat | 清除格式 | 移除所有格式 | block | `Eraser` | `clearNodes() + unsetAllMarks()` |

### 5.3 分类体系

| 分类 | 说明 | 命令 ID 列表 |
|------|------|-------------|
| heading | 标题与段落 | h1, h2, h3, h4, paragraph |
| block | 块级元素 | quote, code, alignCenter, alignRight, clearFormat |
| list | 列表 | bullet, ordered, task |
| insert | 插入 | divider, table, image, link, highlight, textColor |
| advanced | 高级 | callout, details |

### 5.4 SlashCommandMenu.vue 分类显示

当前 SlashCommandMenu.vue 以扁平列表显示命令。扩展到 20+ 个后应按分类分组显示:

```vue
<template>
  <div class="slash-menu">
    <template v-for="(group, groupLabel) in groupedCommands" :key="groupLabel">
      <div class="slash-menu-group-label">{{ groupLabel }}</div>
      <button
        v-for="(cmd, index) in group"
        :key="cmd.id"
        class="slash-menu-item"
        :class="{ 'slash-menu-item--active': isSelected(cmd) }"
        @click="executeCommand(cmd)"
        @mouseenter="selectCommand(cmd)"
      >
        <component :is="resolveIcon(cmd.icon)" :size="16" />
        <div class="slash-menu-item-text">
          <span class="slash-menu-item-label">{{ cmd.label }}</span>
          <span class="slash-menu-item-desc">{{ cmd.description }}</span>
        </div>
      </button>
    </template>
  </div>
</template>
```

分类标签映射:

```typescript
const categoryLabels: Record<SlashCommandCategory, string> = {
  heading: '标题',
  block: '块级元素',
  list: '列表',
  insert: '插入',
  advanced: '高级',
}
```

### 5.5 图片插入改进

当前 image 命令使用 `window.prompt()` 输入 URL，这不是正式实现。应改为:

```typescript
{
  id: 'image',
  label: '图片',
  description: '从本地文件选择图片',
  icon: 'ImagePlus',
  category: 'insert',
  action: (editor) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      // 转为 base64 DataURL（本地编辑器场景）
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          editor.chain().focus().setImage({ src: reader.result }).run()
        }
      }
      reader.readAsDataURL(file)
    }
    input.click()
  },
}
```

---

## 六、文件清单

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 新增 | `inkforge/src/components/editor/EditorContextMenu.vue` | 右键上下文菜单组件 |
| 修改 | `inkforge/src/components/editor/FloatingToolbar.vue` | 溢出修复 + title 补全 |
| 修改 | `inkforge/src/extensions/SlashCommands.ts` | 扩展到 20+ 命令 |
| 修改 | `inkforge/src/components/editor/SlashCommandMenu.vue` | 分类分组显示 |
| 修改 | `inkforge/src/components/editor/EditorPanel.vue` | 集成右键菜单 + 注册 `@contextmenu.prevent` |

**不包含任何以下文件**:
- EditorToolbar.vue -- 用户明确不需要固定顶部工具栏
- ToolbarDropdown.vue -- 固定工具栏的配套组件，不需要

---

## 七、验收标准

### 浮动工具栏
- [ ] FloatingToolbar 在纸张宽度 narrow (560px) 时不超出 `.editor-paper` 左右边界
- [ ] FloatingToolbar 在纸张宽度 full 时正常居中显示
- [ ] 所有 28 个按钮的 `title` 属性包含正确的快捷键提示
- [ ] 快捷键提示与 03-keyboard-shortcuts-spec.md 中的定义一致

### 右键上下文菜单
- [ ] 在编辑区域右键弹出自定义菜单，替代浏览器默认菜单
- [ ] 菜单包含 15 个项目，按分组显示 (剪贴板/格式/插入/工具)
- [ ] 每个菜单项右侧显示对应快捷键 (灰色 monospace 字体)
- [ ] 点击菜单项执行对应操作后菜单自动关闭
- [ ] 点击菜单外部或按 ESC 关闭菜单
- [ ] 菜单位置不超出视口边界
- [ ] 菜单样式: 白色背景, rounded-xl, shadow-lg, backdrop-blur

### 斜杠命令
- [ ] `/` 命令菜单包含 20+ 个命令
- [ ] 命令按分类 (标题/块级/列表/插入/高级) 分组显示
- [ ] 模糊搜索正确过滤命令 (按 label 和 id)
- [ ] 键盘导航 (ArrowUp/Down, Enter, Escape) 正常工作
- [ ] 图片插入使用文件选择器而非 `window.prompt()`

### 通用
- [ ] 所有图标使用 `lucide-vue-next`，无 Emoji
- [ ] 无 Mock 数据
- [ ] `pnpm typecheck` 零错误
- [ ] 无 Console 错误
