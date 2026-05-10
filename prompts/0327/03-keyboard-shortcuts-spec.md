# 03 -- 键盘快捷键体系规范

> 优先级: P0
> 影响文件: extensions/KeyboardShortcuts.ts, EditorPanel.vue, WorkstationView.vue, FloatingToolbar.vue, stores/settings.ts, SettingsView.vue
> 参照: Typora 快捷键体系

---

## 一、问题描述

当前编辑器缺乏经典 Markdown 编辑器应有的快捷键支持:
- `Ctrl+B` 加粗等基础快捷键未全面覆盖
- 缺乏标题级别快捷键 (`Ctrl+1` ~ `Ctrl+4`)
- 缺乏块级元素快捷键 (代码块、引用、列表)
- 缺乏视图类快捷键 (专注模式、面板切换、编辑模式切换)
- 缺乏查找替换快捷键 (`Ctrl+F` / `Ctrl+H`)
- 现有 `DEFAULT_SHORTCUTS` 仅 7 条，Settings 的 shortcuts Tab 也仅展示 7 行，本次扩展到 33 条
- FloatingToolbar 中部分按钮的快捷键 title 不正确或缺失

---

## 二、完整快捷键映射表 (33 条)

### 2.1 格式化快捷键 (TipTap Editor 内部)

这些快捷键在 TipTap Editor 中注册，当编辑器获得焦点时生效。

| # | 快捷键 | 功能 | TipTap Command | 已有? |
|---|--------|------|---------------|------|
| 1 | `Ctrl+B` | 加粗 | `toggleBold()` | TipTap 默认 |
| 2 | `Ctrl+I` | 斜体 | `toggleItalic()` | TipTap 默认 |
| 3 | `Ctrl+U` | 下划线 | `toggleUnderline()` | 需注册 |
| 4 | `Ctrl+Shift+S` | 删除线 | `toggleStrike()` | 需注册 |
| 5 | `Ctrl+Shift+\`` | 行内代码 | `toggleCode()` | 需注册 |
| 6 | `Ctrl+K` | 插入/编辑链接 | `setLink()` (弹出浮层) | 需注册 |
| 7 | `Ctrl+\` | 清除格式 | `clearNodes() + unsetAllMarks()` | 需注册 |
| 8 | `Ctrl+Shift+H` | 高亮 | `toggleHighlight()` | 需注册 |

### 2.2 标题快捷键

| # | 快捷键 | 功能 | TipTap Command |
|---|--------|------|---------------|
| 9 | `Ctrl+1` | 一级标题 | `toggleHeading({ level: 1 })` |
| 10 | `Ctrl+2` | 二级标题 | `toggleHeading({ level: 2 })` |
| 11 | `Ctrl+3` | 三级标题 | `toggleHeading({ level: 3 })` |
| 12 | `Ctrl+4` | 四级标题 | `toggleHeading({ level: 4 })` |
| 13 | `Ctrl+0` | 正文段落 | `setParagraph()` |

### 2.3 块级元素快捷键

| # | 快捷键 | 功能 | TipTap Command |
|---|--------|------|---------------|
| 14 | `Ctrl+Shift+Q` | 引用块 | `toggleBlockquote()` |
| 15 | `Ctrl+Shift+K` | 代码块 | `toggleCodeBlock()` |
| 16 | `Ctrl+Shift+[` | 有序列表 | `toggleOrderedList()` |
| 17 | `Ctrl+Shift+]` | 无序列表 | `toggleBulletList()` |
| 18 | `Ctrl+Shift+X` | 任务列表 | `toggleTaskList()` |
| 19 | `Ctrl+T` | 插入表格 (3x3) | `insertTable({ rows: 3, cols: 3, withHeaderRow: true })` |
| 20 | `Ctrl+Enter` | 插入分割线 | `setHorizontalRule()` |
| 21 | `Tab` | 列表缩进 | `sinkListItem('listItem')` |
| 22 | `Shift+Tab` | 列表减少缩进 | `liftListItem('listItem')` |

### 2.4 编辑操作快捷键

| # | 快捷键 | 功能 | 说明 |
|---|--------|------|------|
| 23 | `Ctrl+S` | 保存 | 调用 saveContent() |
| 24 | `Ctrl+Z` | 撤销 | TipTap 默认 |
| 25 | `Ctrl+Shift+Z` | 重做 | TipTap 默认 |
| 26 | `Ctrl+H` | 查找替换 | 打开 FindReplace.vue 查找替换面板 |
| 27 | `Ctrl+F` | 文档内搜索 | 打开 FindReplace.vue 仅查找模式 |
| 28 | `Ctrl+A` | 全选 | 浏览器默认 |

### 2.5 视图快捷键 (全局)

这些快捷键在 WorkstationView.vue 的 keydown handler 中注册。

| # | 快捷键 | 功能 | 说明 |
|---|--------|------|------|
| 29 | `Ctrl+Shift+E` | 切换左栏 (文件管理) | toggle managerCollapsed |
| 30 | `Ctrl+Shift+P` | 切换预览面板 | toggle stageCollapsed |
| 31 | `Ctrl+Shift+O` | 切换大纲面板 | 切换到 outline Tab |
| 32 | `F11` | 切换专注模式 | toggleFocusMode() |
| 33 | `F9` | 切换打字机模式 | toggle typewriterMode |

> 注: `Ctrl+\` 在编辑器内为"清除格式"，在无选区时为"切换编辑模式 (Typora <-> Source)"。详见 Section 七 7.5。
> 注: `Ctrl+=` 为缩放增大 (zoomIn)，在 WorkstationView 中通过 editorWidth 实现。

---

## 三、DEFAULT_SHORTCUTS 完整定义

`stores/settings.ts` 中的 `DEFAULT_SHORTCUTS` 从 7 条扩展到 33 条:

```typescript
export const DEFAULT_SHORTCUTS: Record<string, string> = {
  // ─── 格式化 (8) ───
  bold: 'Ctrl+B',
  italic: 'Ctrl+I',
  underline: 'Ctrl+U',
  strikethrough: 'Ctrl+Shift+S',
  inlineCode: 'Ctrl+Shift+`',
  link: 'Ctrl+K',
  clearFormat: 'Ctrl+\\\\',
  highlight: 'Ctrl+Shift+H',
  // ─── 标题 (5) ───
  heading1: 'Ctrl+1',
  heading2: 'Ctrl+2',
  heading3: 'Ctrl+3',
  heading4: 'Ctrl+4',
  paragraph: 'Ctrl+0',
  // ─── 块级 (7) ───
  blockquote: 'Ctrl+Shift+Q',
  codeBlock: 'Ctrl+Shift+K',
  orderedList: 'Ctrl+Shift+[',
  bulletList: 'Ctrl+Shift+]',
  taskList: 'Ctrl+Shift+X',
  table: 'Ctrl+T',
  horizontalRule: 'Ctrl+Enter',
  // ─── 编辑 (6) ───
  save: 'Ctrl+S',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Shift+Z',
  findReplace: 'Ctrl+H',
  find: 'Ctrl+F',
  selectAll: 'Ctrl+A',
  // ─── 视图 (7) ───
  toggleSidebar: 'Ctrl+Shift+E',
  togglePreview: 'Ctrl+Shift+P',
  toggleOutline: 'Ctrl+Shift+O',
  focusMode: 'F11',
  typewriterMode: 'F9',
  switchEditorMode: 'Ctrl+\\\\',
  zoomIn: 'Ctrl+=',
}
```

### 新增快捷键说明

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+H` | 查找替换 | 打开新增的 `FindReplace.vue` 组件，支持查找与替换两种模式 |
| `Ctrl+F` | 文档内搜索 | 打开 `FindReplace.vue` 仅查找模式 (焦点在搜索框) |
| `Ctrl+\\` | 切换编辑模式 | 在 Typora 即时渲染模式与源码+预览分栏模式之间切换 (无选区时) |
| `Ctrl+=` | 缩放增大 | 切换 editorWidth (narrow -> medium -> wide -> full) |
| `Ctrl+A` | 全选 | 浏览器原生全选行为 (保留在 DEFAULT_SHORTCUTS 以便 Settings 中统一展示) |

---

## 四、实现方案

### 4.1 TipTap 扩展注册快捷键

**新增扩展文件**: `inkforge/src/extensions/KeyboardShortcuts.ts`

```typescript
import { Extension } from '@tiptap/core'

export const KeyboardShortcuts = Extension.create({
  name: 'inkforgeKeyboardShortcuts',

  addKeyboardShortcuts() {
    return {
      // 格式化
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-Shift-s': () => this.editor.commands.toggleStrike(),
      'Mod-Shift-`': () => this.editor.commands.toggleCode(),
      'Mod-k': () => {
        // 触发链接编辑浮层 (通过 FloatingToolbar 或自定义事件)
        const { from, to } = this.editor.state.selection
        if (from === to) return false

        // 发出自定义事件让 EditorPanel 处理链接输入
        const event = new CustomEvent('inkforge:edit-link', {
          detail: { from, to },
          bubbles: true,
        })
        this.editor.view.dom.dispatchEvent(event)
        return true
      },
      'Mod-\\': () => {
        this.editor.chain().clearNodes().unsetAllMarks().run()
        return true
      },
      'Mod-Shift-h': () => {
        this.editor.commands.toggleHighlight()
        return true
      },

      // 标题
      'Mod-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-3': () => this.editor.commands.toggleHeading({ level: 3 }),
      'Mod-4': () => this.editor.commands.toggleHeading({ level: 4 }),
      'Mod-0': () => this.editor.commands.setParagraph(),

      // 块级元素
      'Mod-Shift-q': () => this.editor.commands.toggleBlockquote(),
      'Mod-Shift-k': () => this.editor.commands.toggleCodeBlock(),
      'Mod-Shift-[': () => this.editor.commands.toggleOrderedList(),
      'Mod-Shift-]': () => this.editor.commands.toggleBulletList(),
      'Mod-Shift-x': () => this.editor.commands.toggleTaskList(),
      'Mod-t': () =>
        this.editor.commands.insertTable({
          rows: 3,
          cols: 3,
          withHeaderRow: true,
        }),
      'Mod-Enter': () => this.editor.commands.setHorizontalRule(),

      // 保存 (阻止浏览器默认保存行为)
      'Mod-s': () => {
        const event = new CustomEvent('inkforge:save', { bubbles: true })
        this.editor.view.dom.dispatchEvent(event)
        return true
      },
    }
  },
})
```

### 4.2 在 EditorPanel.vue 中注册扩展

在 `new Editor({ extensions: [...] })` 中添加:

```typescript
import { KeyboardShortcuts } from '@/extensions/KeyboardShortcuts'

// 在 extensions 数组中添加:
KeyboardShortcuts,
```

注意: `Mod-` 前缀由 ProseMirror 自动转换为 `Ctrl` (Windows/Linux) 或 `Cmd` (macOS)。

### 4.3 WorkstationView.vue 全局快捷键

在已有的 `handleKeydown` 中注册视图快捷键:

```typescript
function handleWorkstationKeydown(event: KeyboardEvent): void {
  const mod = event.ctrlKey || event.metaKey

  // Ctrl+Shift+E -- 切换左栏 (文件管理器)
  if (mod && event.shiftKey && event.key === 'E') {
    event.preventDefault()
    managerCollapsed.value = !managerCollapsed.value
    return
  }

  // Ctrl+Shift+P -- 切换预览面板
  if (mod && event.shiftKey && event.key === 'P') {
    event.preventDefault()
    stageCollapsed.value = !stageCollapsed.value
    return
  }

  // Ctrl+Shift+O -- 切换大纲面板
  if (mod && event.shiftKey && event.key === 'O') {
    event.preventDefault()
    toggleOutlinePanel()
    return
  }

  // F11 -- 切换专注模式
  if (event.key === 'F11') {
    event.preventDefault()
    toggleFocusMode()
    return
  }

  // F9 -- 切换打字机模式
  if (event.key === 'F9') {
    event.preventDefault()
    toggleTypewriterMode()
    return
  }

  // Ctrl+\ -- 切换编辑模式 (Typora <-> Source)
  if (mod && event.key === '\\') {
    event.preventDefault()
    toggleEditorMode()
    return
  }

  // Ctrl+= -- 缩放增大 (切换 editorWidth)
  if (mod && event.key === '=') {
    event.preventDefault()
    cycleEditorWidth()
    return
  }

  // ESC -- 退出专注模式
  if (event.key === 'Escape' && isFocusMode.value) {
    event.preventDefault()
    toggleFocusMode()
    return
  }
}

onMounted(() => window.addEventListener('keydown', handleWorkstationKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleWorkstationKeydown))
```

### 4.4 查找替换快捷键

`Ctrl+F` 和 `Ctrl+H` 分别打开查找面板和查找替换面板，对应新增的 `FindReplace.vue` 组件:

```typescript
// 在 TipTap KeyboardShortcuts 扩展中:
'Mod-f': () => {
  // 打开 FindReplace.vue 仅查找模式
  const event = new CustomEvent('inkforge:find', { bubbles: true })
  this.editor.view.dom.dispatchEvent(event)
  return true
},
'Mod-h': () => {
  // 打开 FindReplace.vue 查找替换模式
  const event = new CustomEvent('inkforge:find-replace', { bubbles: true })
  this.editor.view.dom.dispatchEvent(event)
  return true
},
```

EditorPanel.vue 监听这些自定义事件并打开 FindReplace.vue 组件。FindReplace.vue 通过 ProseMirror 的 `@tiptap/extension-search-and-replace` 或自定义搜索逻辑实现文档内查找与替换。

### 4.5 编辑模式切换快捷键

`Ctrl+\` 在不同上下文有两种含义 (详见 Section 七 7.5):
- **编辑器内有选区**: 清除格式 (`clearNodes() + unsetAllMarks()`)
- **编辑器内无选区/工作台全局**: 切换编辑模式 (Typora <-> Source)，对应新增 `settings.editor.editorMode` 字段

---

## 五、Settings 快捷键 Tab 扩展

### 5.1 shortcutDefinitions 扩展

SettingsView.vue 中的 `shortcutDefinitions` 从 7 条扩展到 33 条，按 5 个分组显示 (格式化 / 标题 / 块级 / 编辑 / 视图):

```typescript
const shortcutGroups = [
  {
    label: '格式化',
    items: [
      { id: 'bold', label: '加粗', description: '切换当前选区的加粗状态' },
      { id: 'italic', label: '斜体', description: '切换当前选区的斜体状态' },
      { id: 'underline', label: '下划线', description: '切换当前选区的下划线状态' },
      { id: 'strikethrough', label: '删除线', description: '切换当前选区的删除线状态' },
      { id: 'inlineCode', label: '行内代码', description: '切换当前选区的代码标记' },
      { id: 'link', label: '链接', description: '插入或编辑链接' },
      { id: 'clearFormat', label: '清除格式', description: '移除所有格式标记' },
      { id: 'highlight', label: '高亮', description: '切换当前选区的高亮标记' },
    ],
  },
  {
    label: '标题',
    items: [
      { id: 'heading1', label: '一级标题', description: '切换一级标题' },
      { id: 'heading2', label: '二级标题', description: '切换二级标题' },
      { id: 'heading3', label: '三级标题', description: '切换三级标题' },
      { id: 'heading4', label: '四级标题', description: '切换四级标题' },
      { id: 'paragraph', label: '正文', description: '切换为普通段落' },
    ],
  },
  {
    label: '块级元素',
    items: [
      { id: 'blockquote', label: '引用块', description: '切换引用块' },
      { id: 'codeBlock', label: '代码块', description: '切换代码块' },
      { id: 'orderedList', label: '有序列表', description: '切换有序列表' },
      { id: 'bulletList', label: '无序列表', description: '切换无序列表' },
      { id: 'taskList', label: '任务列表', description: '切换任务列表' },
      { id: 'table', label: '表格', description: '插入 3x3 表格' },
      { id: 'horizontalRule', label: '分割线', description: '插入水平分割线' },
    ],
  },
  {
    label: '编辑',
    items: [
      { id: 'save', label: '保存', description: '立即保存当前内容' },
      { id: 'undo', label: '撤销', description: '回退上一步编辑操作' },
      { id: 'redo', label: '重做', description: '恢复刚刚撤销的操作' },
      { id: 'findReplace', label: '查找替换', description: '打开查找替换面板 (FindReplace.vue)' },
      { id: 'find', label: '查找', description: '打开文档内搜索 (仅查找模式)' },
      { id: 'selectAll', label: '全选', description: '选中编辑器中所有内容' },
    ],
  },
  {
    label: '视图',
    items: [
      { id: 'toggleSidebar', label: '侧栏', description: '切换文件管理器侧栏' },
      { id: 'togglePreview', label: '预览', description: '切换预览面板' },
      { id: 'toggleOutline', label: '大纲', description: '切换大纲面板' },
      { id: 'focusMode', label: '专注模式', description: '隐藏所有面板进入沉浸编辑' },
      { id: 'typewriterMode', label: '打字机模式', description: '光标始终保持在屏幕中央' },
      { id: 'switchEditorMode', label: '编辑模式切换', description: '在 Typora 和源码模式间切换' },
      { id: 'zoomIn', label: '缩放增大', description: '切换编辑器宽度 (narrow -> medium -> wide -> full)' },
    ],
  },
] as const
```

### 5.2 Settings UI 分组渲染

```vue
<template>
  <section
    v-for="group in shortcutGroups"
    :key="group.label"
    class="shortcut-group"
  >
    <h3 class="shortcut-group-title">{{ group.label }}</h3>
    <div class="shortcut-list">
      <article
        v-for="shortcut in group.items"
        :key="shortcut.id"
        class="shortcut-item"
      >
        <div>
          <h4>{{ shortcut.label }}</h4>
          <p>{{ shortcut.description }}</p>
        </div>
        <div class="shortcut-actions">
          <code>{{ settingsStore.settings.shortcuts[shortcut.id] || '未设置' }}</code>
          <button
            class="secondary-btn"
            type="button"
            @click="startShortcutRecording(shortcut.id)"
          >
            {{ editingShortcut === shortcut.id ? '按下组合键' : '录制' }}
          </button>
          <button
            class="ghost-btn"
            type="button"
            @click="resetShortcut(shortcut.id)"
          >
            默认
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
```

分组标题样式:

```css
.shortcut-group-title {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #90A4AE;
}

.shortcut-group + .shortcut-group {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(96, 125, 139, 0.12);
}
```

---

## 六、快捷键发现性 (UI)

### 6.1 FloatingToolbar Tooltip

每个 FloatingToolbar 按钮的 `title` 属性应包含对应快捷键。完整映射参见 `05-toolbar-complete-spec.md` Section 3。

需要修正的关键 title:
- 删除线: `Ctrl+Shift+X` -> `Ctrl+Shift+S`
- 行内代码: `Ctrl+E` -> `` Ctrl+Shift+` ``
- 引用: `Ctrl+Shift+B` -> `Ctrl+Shift+Q`

### 6.2 右键上下文菜单

EditorContextMenu.vue 的每个菜单项右侧显示对应快捷键 (灰色 monospace 字体)。参见 `05-toolbar-complete-spec.md` Section 4。

### 6.3 斜杠命令

SlashCommandMenu.vue 的每个命令项可选地显示对应快捷键。由于斜杠命令面板空间有限，建议仅在 hover 时通过 tooltip 显示。

---

## 七、注意事项

### 7.1 浏览器快捷键冲突

| 快捷键 | 浏览器默认行为 | 处理方式 |
|--------|--------------|---------|
| `Ctrl+S` | 保存网页 | `event.preventDefault()` 拦截 |
| `Ctrl+T` | 新建标签页 | 仅在 Tauri 桌面端注册，或在 TipTap 中用 `event.preventDefault()` |
| `Ctrl+Shift+P` | 无 (Chrome) / 打印 (某些浏览器) | 检测并拦截 |
| `F11` | 全屏 | `event.preventDefault()` 拦截 |
| `Ctrl+H` | 浏览器历史 | `event.preventDefault()` 拦截 |
| `Ctrl+F` | 浏览器搜索 | `event.preventDefault()` 拦截 |

### 7.2 Mac 兼容

TipTap 的 `Mod-` 前缀自动处理 Ctrl/Cmd 差异:
- Windows/Linux: `Mod-B` = `Ctrl+B`
- macOS: `Mod-B` = `Cmd+B`

FloatingToolbar 和右键菜单中的快捷键提示文字应使用 `Ctrl` 显示（当前 InkForge 主要面向 Windows 用户）。如需 Mac 适配，可通过 `navigator.platform` 检测并替换 `Ctrl` 为 `Cmd`。

### 7.3 输入法兼容

中文输入法活跃时，以下快捷键可能被拦截:
- `Ctrl+1/2/3/4` -- 某些输入法用这些键选词
- `Ctrl+Shift+` 组合 -- 某些输入法的切换快捷键

建议:
- 在 `handleKeyDown` 中检查 `event.isComposing`，如果为 `true` 则跳过快捷键处理
- 为关键快捷键提供 Settings 自定义入口

```typescript
if (event.isComposing) {
  return false
}
```

### 7.4 链接插入

`Ctrl+K` 应触发链接编辑浮层 (FloatingToolbar 中已有 `showLinkInput` + `ft-link-input` 实现)，**不应使用 `window.prompt()`**。

实现方式:
- KeyboardShortcuts 扩展中 `Mod-k` 发出自定义事件 `inkforge:edit-link`
- EditorPanel.vue 监听此事件，触发 FloatingToolbar 的链接编辑模式
- 或者直接在 KeyboardShortcuts 中访问 `this.editor.storage` 获取 FloatingToolbar 的状态引用

### 7.5 `Ctrl+\` 双重用途

`Ctrl+\` 在不同上下文中有两个含义:
1. **编辑器内**: 清除格式 (`clearNodes() + unsetAllMarks()`)
2. **工作台全局**: 切换编辑模式 (Typora <-> Source)

处理策略:
- 当 TipTap 编辑器有焦点且有文本选中时: 执行"清除格式"
- 当没有文本选中或编辑器无焦点时: 执行"切换编辑模式"

```typescript
// 在 KeyboardShortcuts 扩展中:
'Mod-\\': () => {
  const { from, to } = this.editor.state.selection
  if (from !== to) {
    // 有选区: 清除格式
    this.editor.chain().clearNodes().unsetAllMarks().run()
    return true
  }
  // 无选区: 不拦截，让 WorkstationView 的全局 handler 处理模式切换
  return false
},
```

---

## 八、文件清单

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 新增 | `inkforge/src/extensions/KeyboardShortcuts.ts` | TipTap 快捷键扩展 (格式化 + 标题 + 块级 + 保存 + 查找) |
| 新增 | `inkforge/src/components/editor/FindReplace.vue` | 查找替换面板 (Ctrl+F 仅查找 / Ctrl+H 查找替换) |
| 修改 | `inkforge/src/components/editor/EditorPanel.vue` | 注册 KeyboardShortcuts 扩展 + 监听 find/find-replace 事件 |
| 修改 | `inkforge/src/views/WorkstationView.vue` | 添加全局视图快捷键 handler (含 Ctrl+= 缩放) |
| 修改 | `inkforge/src/components/editor/FloatingToolbar.vue` | 补全所有按钮 title 中的快捷键 |
| 修改 | `inkforge/src/stores/settings.ts` | 扩展 DEFAULT_SHORTCUTS 到 33 条 |
| 修改 | `inkforge/src/views/SettingsView.vue` | shortcuts Tab 按 5 个分组显示 33 条快捷键 |

---

## 九、验收标准

### 格式化快捷键
- [ ] `Ctrl+B` 加粗正常工作 (TipTap 默认)
- [ ] `Ctrl+I` 斜体正常工作 (TipTap 默认)
- [ ] `Ctrl+U` 下划线正常工作
- [ ] `Ctrl+Shift+S` 删除线正常工作
- [ ] `Ctrl+Shift+\`` 行内代码正常工作
- [ ] `Ctrl+K` 弹出链接编辑浮层 (不使用 `window.prompt()`)
- [ ] `Ctrl+\` 在有选区时清除格式
- [ ] `Ctrl+Shift+H` 切换高亮

### 标题快捷键
- [ ] `Ctrl+1/2/3/4` 切换对应级别标题
- [ ] `Ctrl+0` 切换为正文段落

### 块级元素快捷键
- [ ] `Ctrl+Shift+Q` 切换引用块
- [ ] `Ctrl+Shift+K` 切换代码块
- [ ] `Ctrl+Shift+[` 切换有序列表
- [ ] `Ctrl+Shift+]` 切换无序列表
- [ ] `Ctrl+Shift+X` 切换任务列表
- [ ] `Ctrl+T` 插入 3x3 表格
- [ ] `Ctrl+Enter` 插入分割线

### 编辑操作快捷键
- [ ] `Ctrl+S` 触发保存 (阻止浏览器默认保存行为)
- [ ] `Ctrl+Z` / `Ctrl+Shift+Z` 撤销/重做 (TipTap 默认)
- [ ] `Ctrl+F` 打开 FindReplace.vue 仅查找模式
- [ ] `Ctrl+H` 打开 FindReplace.vue 查找替换模式
- [ ] `Ctrl+A` 全选正常工作

### 视图快捷键
- [ ] `Ctrl+Shift+E` 切换文件管理器侧栏
- [ ] `Ctrl+Shift+P` 切换预览面板
- [ ] `Ctrl+Shift+O` 切换大纲面板
- [ ] `F11` 切换专注模式
- [ ] `F9` 切换打字机模式
- [ ] `Ctrl+\` 在无选区时切换编辑模式
- [ ] `Ctrl+=` 切换编辑器宽度
- [ ] `ESC` 退出专注模式

### Settings Tab
- [ ] shortcuts Tab 按 5 个分组显示 33 条快捷键
- [ ] 每条快捷键可录制自定义组合键
- [ ] 冲突检测正常工作
- [ ] 重置按钮恢复默认值

### UI 发现性
- [ ] FloatingToolbar 所有按钮 title 包含正确快捷键
- [ ] 快捷键提示与本文档定义一致
- [ ] 中文输入法活跃时快捷键不干扰输入

### 通用
- [ ] 快捷键不与浏览器默认行为冲突 (通过 `event.preventDefault()`)
- [ ] 所有图标使用 `lucide-vue-next`，无 Emoji
- [ ] 无 Mock 数据
- [ ] `pnpm typecheck` 零错误
- [ ] 无 Console 错误


## 2026-04-29 Implementation Ledger

- The original 33-shortcut baseline described by this spec is now implemented as a 38-shortcut Settings-backed system. The extra shortcuts preserve existing mode and paper-width behavior rather than deleting or compressing functionality.
- The implementation uses real TipTap / ProseMirror commands, a real `FindReplace.vue` DecorationSet overlay, the existing FloatingToolbar link editor, and live Settings bindings. No mock shortcut layer or `window.prompt()` link insertion is used.
- Some defaults differ from this older 0327 table to avoid collisions captured by the newer 0420 specs: preview uses `Ctrl+Shift+V`, paragraph uses `Ctrl+Alt+0`, table uses `Ctrl+Alt+Shift+T`, and standalone clear-format uses `Ctrl+Alt+\`; `Ctrl+\` remains the no-selection editor-mode toggle and selected-text format clearing path.
- Verified on 2026-04-29 with `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, targeted shortcut normalization/static scripts, and `pnpm build`.
