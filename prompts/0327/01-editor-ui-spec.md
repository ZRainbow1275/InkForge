# 01 -- Typora 模式编辑器 + 双模式切换规范

> 优先级: P0
> 影响文件: WorkstationView.vue, EditorPanel.vue, extensions/TyporaMode.ts, extensions/MarkdownHints.ts, EditorStatusBar.vue, stores/settings.ts
> 设计原则: Markdown-first, Typora 式光标感知渲染, 无 Emoji, 无 Mock 数据

---

## 一、核心概念

### 1.1 Typora 模式定义

Typora 模式是一种**所见即所得与 Markdown 源码的混合编辑方式**:

- **光标所在行**: 显示 Markdown 源码（如 `## 标题`、`**粗体**`、`[链接](url)`），用户可以直接编辑原始语法
- **光标离开后**: 自动渲染为富文本（如大号加粗标题、加粗文字、蓝色可点击链接），隐藏语法标记

这种模式兼顾了 Markdown 的精确控制和富文本的视觉效果，是 Typora 编辑器的核心体验。

### 1.2 与现有架构的关系

当前 InkForge 使用 TipTap (ProseMirror) 作为编辑器引擎。TipTap 本身是一个富文本编辑器，Markdown 语法标记（`#`、`**`、`>`）在输入后即被解析为 ProseMirror 节点/标记，不再显示原始语法。

MarkdownHints.ts 扩展已经通过 `Decoration.widget()` 在富文本旁显示**淡色语法提示**（如标题前的 `# `、粗体两端的 `**`）。Typora 模式的核心改动是让这些提示**仅在光标所在行/所在节点时显示**，光标移走后**隐藏语法标记**。

### 1.3 技术路线

基于 ProseMirror 的 `Plugin` + `Decoration` 机制实现:

1. `Plugin` 的 `decorations` 回调在每次 state 更新时执行
2. 通过 `state.selection` 获取光标所在的 block node
3. 对光标行: 添加 `Decoration.widget()` 显示 Markdown 语法标记
4. 对其他行: 不添加语法标记 Decoration，保持 TipTap 默认的富文本渲染
5. 利用 `DecorationSet.create()` 在每次选区变化时重新构建装饰集合

---

## 二、元素覆盖矩阵

以下表格列出 15+ 种 Markdown 元素在 Typora 模式下的行为:

### 2.1 块级元素

| # | 元素 | Markdown 语法 | 源码视图 (光标在此行) | 富文本视图 (光标离开) | 实现方式 |
|---|------|-------------|---------------------|---------------------|---------|
| 1 | 一级标题 | `# Title` | 行首显示淡色 `# ` 前缀，文字保持 h1 大小 | 渲染为 h1 大号加粗，无 `#` 标记 | Decoration.widget + node class toggle |
| 2 | 二级标题 | `## Title` | 行首显示淡色 `## ` 前缀 | 渲染为 h2 | 同上 |
| 3 | 三级标题 | `### Title` | 行首显示淡色 `### ` 前缀 | 渲染为 h3 | 同上 |
| 4 | 四级标题 | `#### Title` | 行首显示淡色 `#### ` 前缀 | 渲染为 h4 | 同上 |
| 5 | 引用块 | `> text` | 行首显示淡色 `> ` 前缀，保留左边框 | 渲染为带左边框的引用块，无 `>` 标记 | Decoration.widget + node class toggle |
| 6 | 代码块 | ` ```lang ` | 首行显示 ` ``` ` + 语言标签，末行显示 ` ``` `，代码内容语法高亮 | 渲染为完整代码块（含复制按钮、语言标签），隐藏围栏标记 | NodeView toggle (CodeBlockView) |
| 7 | 无序列表 | `- item` | 行首显示淡色 `- ` 标记 | 渲染为圆点列表项 | Decoration.widget toggle |
| 8 | 有序列表 | `1. item` | 行首显示淡色 `1. ` 标记 | 渲染为编号列表项 | Decoration.widget toggle |
| 9 | 任务列表 | `- [ ] item` | 行首显示淡色 `- [ ] ` 或 `- [x] ` 标记 | 渲染为复选框列表项 | Decoration.widget toggle |
| 10 | 分割线 | `---` | 显示淡色 `---` 文本 | 渲染为水平线 `<hr>` | Decoration.node toggle |
| 11 | 表格 | pipe 语法 | 显示原始 pipe 分隔语法，等宽字体 | 渲染为格式化表格 | NodeView toggle (TableView) |

### 2.2 行内元素

| # | 元素 | Markdown 语法 | 源码视图 (光标在此文本范围) | 富文本视图 (光标离开) | 实现方式 |
|---|------|-------------|--------------------------|---------------------|---------|
| 12 | 粗体 | `**text**` | 两端显示淡色 `**` 标记，文字加粗 | 渲染为加粗，隐藏 `**` | Decoration.widget toggle (mark boundary) |
| 13 | 斜体 | `*text*` | 两端显示淡色 `*` 标记，文字斜体 | 渲染为斜体，隐藏 `*` | Decoration.widget toggle (mark boundary) |
| 14 | 删除线 | `~~text~~` | 两端显示淡色 `~~` 标记 | 渲染为删除线，隐藏 `~~` | Decoration.widget toggle (mark boundary) |
| 15 | 行内代码 | `` `code` `` | 两端显示淡色 `` ` `` 标记，背景保留 | 渲染为代码背景，隐藏反引号 | Decoration.widget toggle (mark boundary) |
| 16 | 链接 | `[text](url)` | 显示完整 `[text](url)` 语法 | 渲染为蓝色可点击文字，隐藏语法 | Decoration.widget toggle (mark boundary) |
| 17 | 图片 | `![alt](url)` | 显示 `![alt](url)` 语法 | 渲染为内联图片 | NodeView toggle (ImageView) |
| 18 | 上标 | `^text^` | 显示 `^` 标记 | 渲染为上标 | Decoration.widget toggle |
| 19 | 下标 | `~text~` | 显示 `~` 标记 | 渲染为下标 | Decoration.widget toggle |

---

## 三、TyporaMode.ts 扩展实现

### 3.1 新建文件

**路径**: `inkforge/src/extensions/TyporaMode.ts`

### 3.2 核心架构

```typescript
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/**
 * TyporaMode TipTap Extension
 *
 * 核心逻辑:
 * 1. 在 Plugin 的 decorations 回调中，获取当前 selection 所在的 block node
 * 2. 遍历文档所有节点:
 *    - 如果节点是光标所在的 block（或其行内子节点在光标范围内）:
 *      添加 Markdown 语法标记的 Decoration（与 MarkdownHints 类似）
 *    - 如果节点不在光标行:
 *      不添加语法标记（保持 TipTap 默认富文本渲染）
 * 3. 对于代码块、表格等复杂节点，使用 Decoration.node() 添加/移除
 *    CSS class 来控制源码/富文本的展示切换
 */
export const TyporaMode = Extension.create({
  name: 'typoraMode',

  addOptions() {
    return {
      enabled: true,
      hintClassName: 'md-hint',
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    return [
      new Plugin({
        key: new PluginKey('typoraMode'),

        props: {
          decorations(state) {
            if (!options.enabled) {
              return DecorationSet.empty
            }

            const { selection } = state
            const decorations: Decoration[] = []

            // 获取光标所在的顶层 block node 的位置范围
            const $from = selection.$from
            const activeBlockStart = $from.start(1) // depth=1 的顶层 block 起点
            const activeBlockEnd = $from.end(1)     // depth=1 的顶层 block 终点

            state.doc.descendants((node, pos) => {
              const nodeEnd = pos + node.nodeSize
              const isInActiveBlock = pos >= activeBlockStart && nodeEnd <= activeBlockEnd

              // === 块级节点处理 ===
              if (node.type.name === 'heading' && isInActiveBlock) {
                const level = node.attrs.level ?? 1
                decorations.push(
                  Decoration.widget(
                    pos + 1,
                    () => createHintElement(`${'#'.repeat(level)} `),
                    { side: -1 }
                  )
                )
              }

              // 引用块、列表项等类似处理...

              // === 行内 Mark 处理 ===
              if (node.isText && isInActiveBlock) {
                // 检查 bold/italic/code/link 等 mark
                // 在 mark 边界处添加语法标记 widget
                addMarkBoundaryDecorations(node, pos, decorations)
              }
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
```

### 3.3 光标行检测策略

**块级元素** (heading, blockquote, codeBlock, horizontalRule):
- 使用 `selection.$from.start(depth)` 获取光标所在的顶层块起始位置
- 与遍历中的 `pos` 比较，判断节点是否在"活动块"内
- 活动块内的节点显示语法标记，非活动块不显示

**行内元素** (bold, italic, code, link, strikethrough):
- 检查 `selection.from` 和 `selection.to` 是否与当前文本节点的 pos 范围重叠
- 如果光标在 mark 覆盖的文本范围内，显示该 mark 的语法标记
- 如果光标不在范围内，隐藏标记

### 3.4 与 MarkdownHints.ts 的协作

TyporaMode 和 MarkdownHints 不应同时启用。实现策略:

- 当 `editor.editorMode === 'typora'` 时: 启用 TyporaMode，禁用 MarkdownHints
- 当 `editor.editorMode === 'source'` 时: 两者都不需要（纯 Markdown 源码编辑）
- Settings 中新增 `editor.editorMode` 字段来控制切换

如果用户仍希望始终显示 Markdown 语法提示（不做光标感知），可通过 `editor.markdownHints` 开关保留原有行为。

---

## 四、现有 MarkdownHints.ts 扩展方案

### 4.1 当前覆盖范围

MarkdownHints.ts (155 行) 已实现:
- 标题 `#` 前缀提示 (heading node, level 1-6)
- 无序列表 `- ` 标记 (bulletList > listItem)
- 有序列表 `1. ` 标记 (orderedList > listItem)
- 粗体 `**` 两端标记 (bold mark boundary)
- 斜体 `*` 两端标记 (italic mark boundary)
- 行内代码 `` ` `` 两端标记 (code mark boundary)
- 链接 `[text](url)` 完整语法 (link mark boundary)

### 4.2 需要扩展的元素

| # | 元素 | 语法标记 | 实现方式 |
|---|------|---------|---------|
| 1 | 删除线 | `~~` 两端 | `addBoundary('strike', '~~')` |
| 2 | 引用块 | `> ` 行首 | 在 `blockquote > paragraph` 内的第一个文本节点前添加 widget |
| 3 | 代码块围栏 | ` ``` ` 首尾 | 在 `codeBlock` 节点的起止位置添加 widget |
| 4 | 任务列表 | `- [ ] ` / `- [x] ` | 在 `taskItem` 的 `checked` 属性基础上添加 widget |
| 5 | 分割线 | `---` | 在 `horizontalRule` 节点位置添加 widget |
| 6 | 图片 | `![alt](src)` | 在 `image` 节点前后添加 widget |
| 7 | 上标 | `^` 两端 | `addBoundary('superscript', '^')` |
| 8 | 下标 | `~` 两端 | `addBoundary('subscript', '~')` |

### 4.3 光标感知增强

在 MarkdownHints 的 `decorations` 回调中添加光标位置判断:

```typescript
decorations: (state) => {
  if (!this.options.enabled) {
    return DecorationSet.empty
  }

  const { selection } = state
  const decorations: Decoration[] = []

  // 如果启用了 cursorAware 模式，仅对光标所在行显示标记
  const cursorAware = this.options.cursorAware ?? false
  const activeBlockStart = cursorAware ? selection.$from.start(1) : -1
  const activeBlockEnd = cursorAware ? selection.$from.end(1) : Infinity

  state.doc.descendants((node, pos) => {
    const nodeEnd = pos + node.nodeSize

    // cursorAware 模式: 仅对光标所在块显示标记
    if (cursorAware && (pos < activeBlockStart || nodeEnd > activeBlockEnd)) {
      return // 跳过非活动块
    }

    // ... 现有的标题、列表、mark boundary 处理逻辑 ...
  })

  return DecorationSet.create(state.doc, decorations)
}
```

新增 `cursorAware` 选项:

```typescript
addOptions() {
  return {
    enabled: true,
    cursorAware: false, // 默认 false 保持向后兼容
    className: 'md-hint',
  }
}
```

---

## 五、双模式切换

### 5.1 模式定义

在 WorkstationView.vue 中实现两种可切换的编辑模式:

**模式 A: Typora 风格 (默认)**
- 使用 TipTap EditorPanel.vue + TyporaMode/MarkdownHints 扩展
- 单栏 WYSIWYG 编辑，光标行显示 Markdown 源码标记
- 右侧 Stage 面板（手机框预览）可通过 `Ctrl+Shift+P` 折叠/展开
- 编辑内容存储为 TipTap 的 HTML/JSON 格式

**模式 B: doocs/md 源码+预览双栏**
- 左栏: 使用已有的 `MarkdownEditor.vue` (基于 vue-codemirror) 进行纯 Markdown 源码编辑
- 右栏: 使用已有的 `MarkdownPreview.vue` 或 Stage 面板进行实时平台预览
- 内容存储为 Markdown 纯文本

### 5.2 内容同步

切换模式时需要进行格式转换:

**Typora -> Source** (TipTap HTML -> Markdown):
- 使用 TipTap 的 `editor.storage.markdown.getMarkdown()` 或自定义序列化器
- 将 ProseMirror Document 转换为 Markdown 纯文本
- 传递给 MarkdownEditor.vue 的 `v-model`

**Source -> Typora** (Markdown -> TipTap HTML):
- 使用 `marked` 库将 Markdown 转为 HTML
- 通过 `editor.commands.setContent(html)` 注入 TipTap 编辑器

### 5.3 切换方式

| 触发方式 | 说明 |
|---------|------|
| 快捷键 `Ctrl+\` | 在两种模式间切换 |
| Settings `editor.editorMode` | 持久化的默认编辑模式 |
| StatusBar 模式切换按钮 | 点击切换，显示当前模式标签 |

### 5.4 Settings Schema 新增

在 `stores/settings.ts` 的 `EditorSchema` 中添加:

```typescript
const EditorSchema = z.object({
  // ... 现有字段 ...
  editorMode: z.enum(['typora', 'source']).default('typora'),
  editorWidth: z.enum(['narrow', 'medium', 'wide', 'full']).default('medium'),
})
```

### 5.5 WorkstationView.vue 双模式渲染

```vue
<template>
  <!-- Typora 模式: 单栏 TipTap 编辑 -->
  <div v-if="editorMode === 'typora'" class="editor-typora">
    <EditorPanel
      :editor="bodyEditor"
      :editor-width="editorWidth"
      ...
    />
  </div>

  <!-- Source 模式: 双栏 Markdown 源码 + 预览 -->
  <div v-else class="editor-source-dual">
    <div class="source-pane">
      <MarkdownEditor v-model="markdownSource" />
    </div>
    <div class="preview-pane">
      <MarkdownPreview :content="markdownSource" :platform="currentPlatform" />
    </div>
  </div>
</template>
```

---

## 六、面板增强

### 6.1 纸张宽度 4 档控制

| 模式 | max-width | CSS 变量 | 场景 |
|------|-----------|---------|------|
| narrow | 560px | `--paper-width: 560px` | 手机预览 / 专注写作 |
| medium | 680px | `--paper-width: 680px` | 常规写作 (当前默认) |
| wide | 860px | `--paper-width: 860px` | 技术文档 / 表格 |
| full | 100% - 64px | `--paper-width: calc(100% - 64px)` | 全宽编辑 |

**实现位置**: EditorPanel.vue 的 `.editor-paper` 元素

```vue
<div
  class="editor-paper"
  :style="{ maxWidth: paperMaxWidth }"
>
```

```typescript
const paperWidthMap: Record<string, string> = {
  narrow: '560px',
  medium: '680px',
  wide: '860px',
  full: 'calc(100% - 64px)',
}

const paperMaxWidth = computed(() =>
  paperWidthMap[settingsStore.settings.editor.editorWidth] ?? '680px'
)
```

### 6.2 StatusBar 可折叠

EditorStatusBar.vue 已有 `showDetail` 状态控制详细统计面板的展开/折叠。当前默认显示精简模式:

**精简模式 (默认)**: 字数 + 段落数 + 阅读时间 + 可读性评分 + 光标位置
**展开模式 (点击后)**: 上述全部 + 中文字数 / 英文单词 / 标点 / 句子数 / 标题数 / 链接数 / 图片数 / 选区字数 / 版本计数 / 创建时间 / 最后修改 / 文档 ID

新增内容:
- **模式切换按钮**: 在 StatusBar 右侧添加 Typora/Source 模式切换按钮
- **同步状态**: 如果 syncStore.status 不是 idle，显示同步状态小圆点
- **保存状态**: 显示上次保存时间或 "未保存" 标记

```typescript
// 新增 props
const props = defineProps<{
  editor?: Editor
  lastRenderTime?: number
  articleMeta?: ArticleMeta
  editorMode?: 'typora' | 'source'   // 新增
  saveStatus?: 'saved' | 'unsaved' | 'saving'  // 新增
}>()

const emit = defineEmits<{
  (e: 'toggle-mode'): void  // 新增
}>()
```

StatusBar 模式切换按钮使用 Lucide `Code2` (Source 模式) 和 `FileText` (Typora 模式) 图标:

```vue
<button
  class="mode-toggle-btn"
  :title="editorMode === 'typora' ? '切换到源码模式 (Ctrl+\\)' : '切换到 Typora 模式 (Ctrl+\\)'"
  @click="emit('toggle-mode')"
>
  <Code2 v-if="editorMode === 'typora'" :size="14" />
  <FileText v-else :size="14" />
  <span>{{ editorMode === 'typora' ? 'Typora' : 'Source' }}</span>
</button>
```

### 6.3 专注模式增强

当前 WorkstationView.vue 已有 `isFocusMode` 状态和 `toggleFocusMode()` 方法。需增强:

**进入专注模式时**:
- 隐藏 TabBar (`v-show="!isFocusMode"`)
- 隐藏 StatusBar (`v-show="!isFocusMode"`)
- 隐藏所有侧栏 (Manager + Stage + Inspector)
- 编辑器纸张居中，宽度跟随 `editor.editorWidth` 设置

**专注模式退出按钮**:
- 位置: 编辑区域右上角固定定位
- 图标: Lucide `Minimize2`
- 样式: 半透明 (opacity: 0.3)，hover 时 opacity: 0.8
- 快捷键: ESC 退出

```vue
<button
  v-if="isFocusMode"
  class="focus-exit-btn"
  title="退出专注模式 (ESC)"
  @click="toggleFocusMode"
>
  <Minimize2 :size="16" />
</button>
```

```css
.focus-exit-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 200;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(96, 125, 139, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  color: #607D8B;
  opacity: 0.3;
  cursor: pointer;
  transition: opacity 200ms ease;
}

.focus-exit-btn:hover {
  opacity: 0.8;
}
```

---

## 七、文件清单

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 新增 | `inkforge/src/extensions/TyporaMode.ts` | Typora 光标感知渲染 ProseMirror Plugin |
| 修改 | `inkforge/src/extensions/MarkdownHints.ts` | 扩展到 15+ 元素 + 添加 `cursorAware` 选项 |
| 修改 | `inkforge/src/components/editor/EditorPanel.vue` | 注册 TyporaMode 扩展 + 纸张宽度动态绑定 |
| 修改 | `inkforge/src/views/WorkstationView.vue` | 双模式渲染切换 + 专注模式增强 |
| 修改 | `inkforge/src/components/editor/EditorStatusBar.vue` | 新增模式切换按钮 + 保存状态 + 同步状态 |
| 修改 | `inkforge/src/stores/settings.ts` | 添加 `editorMode` + `editorWidth` 字段 |

**不包含 EditorToolbar.vue** -- 用户明确不需要固定顶部工具栏。编辑器的格式化功能通过以下 4 种方式发现:
1. 斜杠命令 `/` -- 最直觉的方式
2. 浮动工具栏 (FloatingToolbar) -- 选中文本时的快速格式化
3. 右键上下文菜单 -- 桌面用户习惯
4. 键盘快捷键 -- 高级用户效率

---

## 八、验收标准

- [ ] 光标所在行显示 Markdown 源码标记 (`#`、`**`、`*`、`` ` `` 等)
- [ ] 光标离开后隐藏语法标记，保持富文本渲染
- [ ] 15+ 种 Markdown 元素全部覆盖 (标题/粗体/斜体/删除线/行内代码/链接/图片/引用/代码块/无序列表/有序列表/任务列表/分割线/上标/下标/表格)
- [ ] `Ctrl+\` 可在 Typora 和源码+预览模式间切换
- [ ] 纸张宽度 4 档 (narrow/medium/wide/full) 正常切换
- [ ] StatusBar 显示模式切换按钮
- [ ] StatusBar 详细统计面板可折叠/展开
- [ ] 专注模式隐藏 TabBar + StatusBar + 所有侧栏
- [ ] 专注模式右上角显示半透明退出按钮
- [ ] ESC 退出专注模式
- [ ] Settings 中 `editor.editorMode` 和 `editor.editorWidth` 正常持久化
- [ ] 所有图标使用 `lucide-vue-next`，无 Emoji
- [ ] 无 Mock 数据，所有状态来自真实 Store
- [ ] `pnpm typecheck` 零错误
- [ ] 无 Console 错误
