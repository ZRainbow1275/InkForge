# Spec 13 — Workstation Layout System

<!--
spec-id: 13
title: Workstation Layout System
version: 1.0.0
status: draft
created: 2026-04-21
sources:
  - prompts/0420/_extracted/03-enhancement-answers.md W-01~W-06
  - prompts/0420/00-decisions-part3b-tauri-visual-recovery.md 域 S
  - prompts/0420/_extracted/01-L1-answers.md L1-12 L1-35
related-specs:
  - 14-statusbar-navigation-spec.md
  - 18-tauri-desktop-spec.md
  - 34-layout-persistence-spec.md
  - 22-command-palette-spec.md
  - 12-file-manager-spec.md
-->

---

## 1. 范围与目标

Workstation Layout System 定义了 InkForge v2.1 主工作区的**四栏布局骨架**、面板内容策略、折叠/展开行为、拖拽调整尺寸、布局预设与响应式策略。

本 Spec 管辖范围：

| 层次 | 内容 |
|------|------|
| 骨架层 | 四栏（Sidebar、TabBar、Editor、RightPanel）CSS 布局容器 |
| 尺寸层 | CSS 变量、用户可调宽度、边界约束 |
| 内容层 | Sidebar Tabs、RightPanel Tabs、各 Tab 内容组件分工 |
| 行为层 | 折叠/展开动画、ResizeHandle 拖拽、快捷键、响应式断点 |
| 状态层 | `useWorkstationStore`、持久化契约（由 Spec 34 承接细节） |
| 预设层 | 布局预设定义与切换 |
| 测试层 | 测试矩阵 30+ 条 |

**不在本 Spec 范围**：各 Tab 内容组件的内部实现（见对应组件 Spec）、状态持久化的 IndexedDB 操作细节（见 Spec 34）、StatusBar 详细交互（见 Spec 14）。

---

## 2. 决策溯源

| 决策编号 | 内容 | 来源 |
|---------|------|------|
| W-01 A | 右栏只做预览，文档属性走弹出面板 | 03-enhancement-answers.md W-01 |
| W-02 D | TOC 在左栏 Tab（含拖拽重排章节） | W-02 |
| W-03 C | 布局随编辑模式（Typora/Source/Preview）各自记忆 | W-03 |
| W-04 D | 双向同步滚动 + 可临时解除 | W-04 |
| W-05 D | 编辑器最大化与专注模式可叠加 | W-05 |
| W-06 D | 两文档并排对比 + 同文档双视图 + 固定参考 | W-06 |
| S-域 | 左栏三合一（FileManager/TOC/VersionHistory）、右栏模式切换器 | part3b 域 S |
| L1-12 B | 纸张式气质冻结；工具栏密度双档 | L1-12 |
| L1-53 C | 多窗口 + 跨窗口 Tab 拖拽 | L1-53 |

---

## 3. 整体布局骨架

### 3.1 HTML 结构

```html
<div class="workstation" data-mode="typora" data-sidebar-open="true" data-right-panel-open="true">
  <!-- 左栏 Sidebar -->
  <aside class="workstation__sidebar" style="width: var(--sidebar-width)">
    <div class="sidebar__tab-switcher" role="tablist" aria-label="Sidebar panels">
      <!-- 图标 Tab 切换按钮 -->
    </div>
    <div class="sidebar__content">
      <!-- 当前激活的 Tab 内容 -->
    </div>
    <div class="workstation__resize-handle workstation__resize-handle--sidebar" role="separator" aria-orientation="vertical" />
  </aside>

  <!-- 主区：TabBar + Editor -->
  <main class="workstation__main">
    <div class="workstation__tabbar">
      <!-- TabBar：水平 Tab 列表，见 Spec 14 -->
    </div>
    <div class="workstation__editor-area">
      <!-- Editor 容器，支持分屏（W-06） -->
      <div class="editor-pane editor-pane--primary" />
      <div class="editor-pane editor-pane--secondary" v-if="splitViewActive" />
    </div>
  </main>

  <!-- 右栏 RightPanel -->
  <aside class="workstation__right-panel" style="width: var(--right-panel-width)">
    <div class="workstation__resize-handle workstation__resize-handle--right" role="separator" aria-orientation="vertical" />
    <div class="right-panel__tab-switcher" role="tablist" aria-label="Right panel views">
      <!-- 视图模式切换：预览 / 参考 / 分屏对比 -->
    </div>
    <div class="right-panel__content">
      <!-- 当前激活的右栏内容 -->
    </div>
  </aside>
</div>
```

### 3.2 CSS 变量定义

所有布局尺寸通过 CSS 变量驱动，统一注入到 `:root`：

```css
:root {
  /* Sidebar */
  --sidebar-width: 240px;
  --sidebar-min-width: 180px;
  --sidebar-max-width: 400px;
  --sidebar-collapsed-width: 0px;

  /* TabBar */
  --tabbar-height: 40px;

  /* RightPanel */
  --right-panel-width: 280px;
  --right-panel-min-width: 200px;
  --right-panel-max-width: 600px;
  --right-panel-collapsed-width: 0px;

  /* ResizeHandle */
  --resize-handle-width: 4px;
  --resize-handle-hit-area: 12px;

  /* 折叠过渡 */
  --panel-collapse-duration: 200ms;
  --panel-collapse-easing: ease;
}
```

### 3.3 CSS Flex 布局

```css
.workstation {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.workstation__sidebar {
  flex: 0 0 var(--sidebar-width);
  width: var(--sidebar-width);
  min-width: 0;
  overflow: hidden;
  transition: width var(--panel-collapse-duration) var(--panel-collapse-easing),
              flex-basis var(--panel-collapse-duration) var(--panel-collapse-easing);
  position: relative;
}

/* 折叠状态：通过父级 data-attribute 驱动 */
.workstation[data-sidebar-open="false"] .workstation__sidebar {
  width: 0;
  flex-basis: 0;
}

.workstation__main {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.workstation__tabbar {
  flex: 0 0 var(--tabbar-height);
  height: var(--tabbar-height);
  overflow: hidden;
}

.workstation__editor-area {
  flex: 1 1 0;
  display: flex;
  flex-direction: row;
  min-height: 0;
  overflow: hidden;
}

.editor-pane {
  flex: 1 1 0;
  min-width: 0;
  overflow: auto;
}

.editor-pane--secondary {
  border-left: 1px solid var(--color-border-subtle);
}

.workstation__right-panel {
  flex: 0 0 var(--right-panel-width);
  width: var(--right-panel-width);
  min-width: 0;
  overflow: hidden;
  transition: width var(--panel-collapse-duration) var(--panel-collapse-easing),
              flex-basis var(--panel-collapse-duration) var(--panel-collapse-easing);
  position: relative;
}

.workstation[data-right-panel-open="false"] .workstation__right-panel {
  width: 0;
  flex-basis: 0;
}
```

**折叠原则**：使用 `width: 0` + `overflow: hidden` 而非 `display: none`，以保留内部组件的滚动位置和状态。

---

## 4. Sidebar（左栏）

### 4.1 Tab 列表

左栏支持 5 个 Tab 切换，Tab 按钮纵向排列在左侧图标轨道（宽 36px）：

| Tab ID | 图标（lucide-vue-next） | 标题 | 组件 |
|--------|------------------------|------|------|
| `file-tree` | `FolderOpenIcon` | 文件树 | `<FileManagerPanel />` |
| `tags` | `TagIcon` | 标签 | `<TagBrowserPanel />` |
| `search` | `SearchIcon` | 搜索 | `<SearchPanel />` |
| `outline` | `ListIcon` | 大纲 / TOC | `<TOCPanel />` |
| `bookmarks` | `BookmarkIcon` | 收藏 | `<BookmarksPanel />` |

Tab 切换行为：
- 点击已激活 Tab 图标 → 折叠 Sidebar（等同于切换折叠状态）
- 点击未激活 Tab 图标 → 展开 Sidebar 并切换内容
- Sidebar 折叠时所有 Tab 图标仍然可见（宽 36px 的图标轨道保留，不参与 `--sidebar-width` 动画）

**设计决策**：图标轨道（36px）与内容区（`--sidebar-width - 36px`）分离，折叠时仅隐藏内容区，图标轨道始终可见。

```typescript
// types
type SidebarTabId = 'file-tree' | 'tags' | 'search' | 'outline' | 'bookmarks'
```

### 4.2 TOC 面板（W-02 D）

TOC 面板位于左栏 Tab，功能完整度要求：

- 实时监听 editor 文档变化，自动更新标题列表
- 当前光标所在章节高亮（active indicator）
- 章节支持折叠/展开（子章节 `>1` 级时显示折叠图标）
- **拖拽重排**：章节项支持 drag-and-drop 调换顺序，拖拽时通过 ProseMirror transaction 移动对应 heading block 及其下属内容；拖拽 ghost 使用文字 label 显示章节名

```typescript
interface TOCEntry {
  id: string           // ProseMirror node 的 attrs.id
  level: 1 | 2 | 3 | 4 | 5 | 6
  text: string
  pos: number          // ProseMirror position
  children: TOCEntry[]
  collapsed: boolean
}
```

TOC 深度默认显示到 H3，用户可在面板顶部选择器中调整（H1~H6）。

### 4.3 VersionHistory 面板

左栏第六个入口（通过右键文件树项或文档属性弹出面板触发跳转）：版本历史面板。该面板在此 Spec 中仅定义布局位置，内容规格见 Spec 31（version-bundle-spec）。

---

## 5. RightPanel（右栏）

### 5.1 右栏模式切换器（W-01 A + W-06 D）

依据决策 A.2（右栏职责 vs 参考分屏的冲突裁决），右栏引入**模式切换器**：

| 模式 ID | 图标 | 标题 | 说明 |
|---------|------|------|------|
| `preview` | `EyeIcon` | 预览 | 默认模式；实时预览当前文档渲染结果（W-01 A） |
| `reference` | `BookOpenIcon` | 参考 | 打开另一篇文档作为只读参考（W-06 固定参考） |
| `split-compare` | `Columns2Icon` | 对比 | 两文档并排对比（W-06 两文档并排） |

模式切换器置于右栏顶部工具栏区域，以图标+文字的三格 segmented control 呈现。

切换规则：
- 切换模式时保持右栏展开状态
- `preview` 模式：绑定当前主编辑器文档，实时更新
- `reference` 模式：通过 QuickOpen 选择要参考的文档；参考文档只读，不响应编辑事件
- `split-compare` 模式：左侧为当前文档编辑器，右侧为可选文档（只读预览），二者共享宽度一分为二；此时 `--right-panel-width` 拉伸到 `50vw - sidebar-width/2`

### 5.2 同步滚动（W-04 D）

当右栏处于 `preview` 模式时，激活同步滚动：

- 默认双向同步（编辑区滚动 → 预览跟随；预览滚动 → 编辑区跟随）
- 通过右栏工具栏的 `LinkIcon` 按钮或快捷键 `Ctrl+Shift+S` 临时解除同步
- 解除后按钮变为 `LinkBrokenIcon`，再次点击恢复同步
- 同步算法：以段落/块的 ProseMirror position 为锚点，找到预览 DOM 中对应的 `data-pos` 属性节点，执行 `scrollIntoView({ block: 'nearest' })`

---

## 6. ResizeHandle 拖拽组件

### 6.1 组件规格

```typescript
// components/layout/ResizeHandle.vue
interface ResizeHandleProps {
  target: 'sidebar' | 'right-panel'
  cssVariable: '--sidebar-width' | '--right-panel-width'
  minWidth: number   // px
  maxWidth: number   // px
  snapThreshold: number  // px，拖拽到此宽度以下自动折叠
}
```

### 6.2 交互规则

1. **hover 态**：ResizeHandle 区域高亮（`background: var(--color-border-active)`），宽度视觉扩展到 `--resize-handle-hit-area`（12px），cursor 变为 `col-resize`
2. **drag 开始**：记录起始 `clientX` 和起始宽度
3. **drag 中**：实时更新 CSS 变量值（`document.documentElement.style.setProperty(...)`），不使用 React state 驱动（避免重渲染）
4. **drag 结束**：
   - 宽度 < `snapThreshold`（60px）：自动折叠（设置 `open = false`）
   - 宽度 >= `snapThreshold`：保留新宽度，触发持久化（debounce 500ms，见 Spec 34）
5. **双击 ResizeHandle**：恢复对应面板的默认宽度（Sidebar 240px / RightPanel 280px）

### 6.3 键盘支持

ResizeHandle 作为 `role="separator"` 支持键盘操作：
- `←`/`→`：每次调整 8px
- `Home`：收缩到最小宽度
- `End`：展开到最大宽度
- `Enter`/`Space`：切换折叠状态

---

## 7. 折叠/展开行为

### 7.1 快捷键

| 快捷键 | 操作 |
|--------|------|
| `Ctrl+\` | 切换 Sidebar 折叠状态 |
| `Ctrl+Shift+\` | 切换 RightPanel 折叠状态 |
| `Ctrl+Shift+P` | 切换 RightPanel 预览模式 |
| `Ctrl+Shift+F` | 切换专注模式（见 Spec 21） |
| `Ctrl+Shift+M` | 切换编辑器最大化（见下） |

快捷键通过 CommandRegistry 注册，namespace `workspace`：

```typescript
commandRegistry.register({
  id: 'workspace.toggleSidebar',
  label: 'Toggle Sidebar',
  shortcut: 'Ctrl+\\',
  category: 'workspace',
  handler: () => workstationStore.toggleSidebar(),
})
```

### 7.2 动效规格

折叠动效使用 CSS transition：

```css
.workstation__sidebar,
.workstation__right-panel {
  transition:
    width var(--panel-collapse-duration) var(--panel-collapse-easing),
    flex-basis var(--panel-collapse-duration) var(--panel-collapse-easing);
}
```

**禁止**使用 `display: none` 或 `visibility: hidden`，因为这会导致：
1. 内部滚动位置重置
2. 虚拟列表（FileManager）重新挂载
3. TOC 失去光标位置状态

折叠时 `overflow: hidden` 遮住内容即可，内容继续保留在 DOM 中。

### 7.3 响应式折叠

```typescript
// composables/useResponsiveLayout.ts
const BREAKPOINT_SIDEBAR_AUTO_COLLAPSE = 1024  // px
const BREAKPOINT_RIGHT_PANEL_AUTO_COLLAPSE = 1280  // px

function useResponsiveLayout() {
  const windowWidth = useWindowSize().width

  watchEffect(() => {
    if (windowWidth.value < BREAKPOINT_SIDEBAR_AUTO_COLLAPSE) {
      workstationStore.setSidebarOpen(false)
    }
    if (windowWidth.value < BREAKPOINT_RIGHT_PANEL_AUTO_COLLAPSE) {
      workstationStore.setRightPanelOpen(false)
    }
  })
}
```

响应式自动折叠不触发持久化写入（避免覆盖用户明确设置的布局状态）。

---

## 8. 编辑器最大化（W-05 D）

### 8.1 最大化状态

编辑器最大化（Maximize）与专注模式（FocusMode）是**独立的两个状态机**，可互相叠加：

| 状态 | 含义 |
|------|------|
| `editorMaximized=false, focusModeActive=false` | 正常四栏布局 |
| `editorMaximized=true, focusModeActive=false` | 侧栏隐藏，Editor 占满中心区，但仍有 StatusBar 和 TabBar |
| `editorMaximized=false, focusModeActive=true` | iA Writer 专注模式：段落高亮 + 打字机模式，侧栏仍存在但弱化 |
| `editorMaximized=true, focusModeActive=true` | 完全沉浸：无侧栏、无 TabBar（仅保留快捷键入口），全屏写作 |

### 8.2 最大化实现

```typescript
// useWorkstationStore
function toggleEditorMaximize() {
  if (state.editorMaximized) {
    // 恢复：还原 Sidebar/RightPanel 的 open 状态到 pre-maximize 快照
    state.sidebarOpen = state._premaximizeSidebarOpen
    state.rightPanelOpen = state._premaximizeRightPanelOpen
    state.editorMaximized = false
  } else {
    // 最大化：记录快照，然后折叠两侧
    state._premaximizeSidebarOpen = state.sidebarOpen
    state._premaximizeRightPanelOpen = state.rightPanelOpen
    state.sidebarOpen = false
    state.rightPanelOpen = false
    state.editorMaximized = true
  }
}
```

最大化快捷键：`Ctrl+Shift+M`；退出最大化：再次按 `Ctrl+Shift+M` 或按 `Esc`（当不在编辑状态时）。

---

## 9. TabBar

TabBar 是主区域顶部的文档 Tab 列表，高度固定 40px。

### 9.1 Tab 数据模型

```typescript
interface WorkspaceTab {
  id: string                    // uuid
  articleId: string
  windowId: string              // 多窗口支持（L1-53 C）
  title: string                 // 文档标题
  isDirty: boolean              // 是否有未保存修改（N-05 D）
  isPinned: boolean             // 是否固定（N-04 D）
  previewUrl?: string           // 悬停预览缩略图 URL（N-04 D）
  closedAt?: number             // 关闭时的时间戳（用于恢复关闭 Tab）
}
```

### 9.2 TabBar 渲染

```html
<div class="tabbar" role="tablist" aria-label="Open documents">
  <div class="tabbar__tabs-track">
    <!-- 可拖拽排序 Tab 列表，支持横向溢出滚动 -->
    <div
      v-for="tab in orderedTabs"
      :key="tab.id"
      class="tabbar__tab"
      :class="{ 'tabbar__tab--active': tab.id === activeTabId, 'tabbar__tab--pinned': tab.isPinned, 'tabbar__tab--dirty': tab.isDirty }"
      role="tab"
      draggable="true"
      @dragstart="onTabDragStart(tab, $event)"
      @dragover="onTabDragOver(tab, $event)"
      @drop="onTabDrop(tab, $event)"
      @mousedown.middle="closeTab(tab.id)"
    >
      <span class="tabbar__tab-title">{{ tab.title }}</span>
      <!-- 未保存指示点 -->
      <span v-if="tab.isDirty" class="tabbar__dirty-indicator" aria-label="Unsaved changes" />
      <button class="tabbar__close-btn" @click.stop="closeTab(tab.id)" aria-label="Close tab">
        <XIcon :size="12" />
      </button>
    </div>
  </div>
  <button class="tabbar__new-btn" @click="newTab" aria-label="New document">
    <PlusIcon :size="16" />
  </button>
  <!-- 溢出菜单：超出视口的 Tab 通过此菜单访问 -->
  <button class="tabbar__overflow-btn" @click="toggleOverflowMenu" aria-label="More tabs">
    <ChevronDownIcon :size="14" />
  </button>
</div>
```

### 9.3 Tab 增强功能（N-04 D）

| 功能 | 实现 |
|------|------|
| 拖拽排序 | HTML5 Drag and Drop API，更新 `tabOrder` 数组 |
| 中键关闭 | `@mousedown.middle="closeTab(tab.id)"` |
| 固定 Tab | 右键菜单 → Pin，固定 Tab 显示在左侧，不可拖拽到非固定区 |
| 悬停预览 | `@mouseover` 延迟 500ms 显示 `<Popover>` 缩略图（通过 canvas 截图 editor DOM）|
| 双击重命名 | 双击 Tab 标题区域进入行内重命名输入框 |
| 跨窗口拖拽 | `dataTransfer.setData('application/x-inkforge-tab', JSON.stringify({tabId, articleId, profileId}))` 触发 IPC `tab:migrate` |

### 9.4 未保存状态指示（N-05 D）

Tab 未保存时的视觉状态：

```css
.tabbar__dirty-indicator {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-brand-red);
  flex-shrink: 0;
}
```

同时在窗口标题中追加 `•` 前缀（通过 `document.title = '• ' + tab.title`）。

---

## 10. 布局预设

### 10.1 预设定义

提供 4 个内置布局预设：

```typescript
type LayoutPresetId = 'default' | 'focus' | 'writing' | 'review'

interface LayoutPreset {
  id: LayoutPresetId
  label: string
  sidebarOpen: boolean
  rightPanelOpen: boolean
  sidebarWidth: number
  rightPanelWidth: number
  rightPanelMode: RightPanelMode
  editorMaximized: boolean
}

const LAYOUT_PRESETS: Record<LayoutPresetId, LayoutPreset> = {
  default: {
    id: 'default',
    label: 'Default',
    sidebarOpen: true,
    rightPanelOpen: true,
    sidebarWidth: 240,
    rightPanelWidth: 280,
    rightPanelMode: 'preview',
    editorMaximized: false,
  },
  focus: {
    id: 'focus',
    label: 'Focus',
    sidebarOpen: false,
    rightPanelOpen: false,
    sidebarWidth: 240,
    rightPanelWidth: 280,
    rightPanelMode: 'preview',
    editorMaximized: true,
  },
  writing: {
    id: 'writing',
    label: 'Writing',
    sidebarOpen: true,
    rightPanelOpen: false,
    sidebarWidth: 220,
    rightPanelWidth: 280,
    rightPanelMode: 'preview',
    editorMaximized: false,
  },
  review: {
    id: 'review',
    label: 'Review',
    sidebarOpen: true,
    rightPanelOpen: true,
    sidebarWidth: 240,
    rightPanelWidth: 400,
    rightPanelMode: 'preview',
    editorMaximized: false,
  },
}
```

### 10.2 预设触发

- 通过 View 菜单 → Layout Presets → 选择预设
- 通过 Command Palette（`workspace.applyPreset.focus` 等）
- 预设切换时 transition 动画与折叠/展开共用同一 CSS transition

### 10.3 布局随编辑模式记忆（W-03 C）

每种编辑模式各自存储一份布局快照：

```typescript
interface PerModeLayout {
  sidebarOpen: boolean
  rightPanelOpen: boolean
  rightPanelMode: RightPanelMode
}

// workstationStore 中
modeLayouts: {
  typora: PerModeLayout
  source: PerModeLayout
  preview: PerModeLayout
}
```

当用户切换编辑模式时（Typora → Source → Preview），自动还原对应模式的布局快照。

---

## 11. `useWorkstationStore`

```typescript
// src/stores/workstation.ts
import { defineStore } from 'pinia'
import type { SidebarTabId, RightPanelMode, LayoutPresetId, WorkspaceTab, PerModeLayout } from '@/types/workstation'

interface WorkstationState {
  // Sidebar
  sidebarOpen: boolean
  sidebarWidth: number         // px
  sidebarTab: SidebarTabId

  // RightPanel
  rightPanelOpen: boolean
  rightPanelWidth: number      // px
  rightPanelMode: RightPanelMode

  // TabBar
  tabs: WorkspaceTab[]
  tabOrder: string[]           // Tab ID 排列顺序
  activeTabId: string | null

  // Editor
  editorMaximized: boolean
  focusModeActive: boolean
  splitViewActive: boolean
  splitViewSecondaryArticleId: string | null

  // 编辑模式布局快照
  modeLayouts: Record<'typora' | 'source' | 'preview', PerModeLayout>

  // 最大化前快照
  _premaximizeSidebarOpen: boolean
  _premaximizeRightPanelOpen: boolean

  // 窗口
  windowId: string
}

export const useWorkstationStore = defineStore('workstation', {
  state: (): WorkstationState => ({
    sidebarOpen: true,
    sidebarWidth: 240,
    sidebarTab: 'file-tree',
    rightPanelOpen: false,
    rightPanelWidth: 280,
    rightPanelMode: 'preview',
    tabs: [],
    tabOrder: [],
    activeTabId: null,
    editorMaximized: false,
    focusModeActive: false,
    splitViewActive: false,
    splitViewSecondaryArticleId: null,
    modeLayouts: {
      typora: { sidebarOpen: true, rightPanelOpen: false, rightPanelMode: 'preview' },
      source: { sidebarOpen: true, rightPanelOpen: false, rightPanelMode: 'preview' },
      preview: { sidebarOpen: false, rightPanelOpen: true, rightPanelMode: 'preview' },
    },
    _premaximizeSidebarOpen: true,
    _premaximizeRightPanelOpen: false,
    windowId: '',
  }),

  getters: {
    activeTab: (state): WorkspaceTab | undefined =>
      state.tabs.find(t => t.id === state.activeTabId),

    orderedTabs: (state): WorkspaceTab[] =>
      state.tabOrder
        .map(id => state.tabs.find(t => t.id === id))
        .filter((t): t is WorkspaceTab => !!t),

    hasUnsavedTabs: (state): boolean =>
      state.tabs.some(t => t.isDirty),
  },

  actions: {
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    },

    setSidebarOpen(open: boolean) {
      this.sidebarOpen = open
    },

    setSidebarWidth(width: number) {
      const clamped = Math.max(
        180,   // --sidebar-min-width
        Math.min(400, width)  // --sidebar-max-width
      )
      this.sidebarWidth = clamped
      document.documentElement.style.setProperty('--sidebar-width', `${clamped}px`)
    },

    setSidebarTab(tab: SidebarTabId) {
      if (!this.sidebarOpen) this.sidebarOpen = true
      this.sidebarTab = tab
    },

    toggleRightPanel() {
      this.rightPanelOpen = !this.rightPanelOpen
    },

    setRightPanelOpen(open: boolean) {
      this.rightPanelOpen = open
    },

    setRightPanelWidth(width: number) {
      const clamped = Math.max(200, Math.min(600, width))
      this.rightPanelWidth = clamped
      document.documentElement.style.setProperty('--right-panel-width', `${clamped}px`)
    },

    setRightPanelMode(mode: RightPanelMode) {
      this.rightPanelMode = mode
      if (!this.rightPanelOpen) this.rightPanelOpen = true
    },

    toggleEditorMaximize() {
      if (this.editorMaximized) {
        this.sidebarOpen = this._premaximizeSidebarOpen
        this.rightPanelOpen = this._premaximizeRightPanelOpen
        this.editorMaximized = false
      } else {
        this._premaximizeSidebarOpen = this.sidebarOpen
        this._premaximizeRightPanelOpen = this.rightPanelOpen
        this.sidebarOpen = false
        this.rightPanelOpen = false
        this.editorMaximized = true
      }
    },

    openTab(tab: WorkspaceTab) {
      const existing = this.tabs.find(t => t.articleId === tab.articleId)
      if (existing) {
        this.activeTabId = existing.id
        return
      }
      this.tabs.push(tab)
      this.tabOrder.push(tab.id)
      this.activeTabId = tab.id
    },

    closeTab(tabId: string) {
      const idx = this.tabs.findIndex(t => t.id === tabId)
      if (idx === -1) return
      const tab = this.tabs[idx]
      if (tab.isDirty) {
        // 触发关闭确认对话框（N-05 D）
        // 由调用方处理 confirm 逻辑
        throw new Error('TAB_HAS_UNSAVED_CHANGES')
      }
      this.tabs.splice(idx, 1)
      this.tabOrder = this.tabOrder.filter(id => id !== tabId)
      if (this.activeTabId === tabId) {
        this.activeTabId = this.tabOrder[Math.max(0, idx - 1)] ?? null
      }
    },

    reorderTabs(newOrder: string[]) {
      this.tabOrder = newOrder
    },

    applyPreset(presetId: LayoutPresetId) {
      const preset = LAYOUT_PRESETS[presetId]
      if (!preset) return
      this.sidebarOpen = preset.sidebarOpen
      this.rightPanelOpen = preset.rightPanelOpen
      this.setSidebarWidth(preset.sidebarWidth)
      this.setRightPanelWidth(preset.rightPanelWidth)
      this.rightPanelMode = preset.rightPanelMode
      this.editorMaximized = preset.editorMaximized
    },

    onEditorModeChange(newMode: 'typora' | 'source' | 'preview', oldMode: 'typora' | 'source' | 'preview') {
      // 保存旧模式的布局快照
      this.modeLayouts[oldMode] = {
        sidebarOpen: this.sidebarOpen,
        rightPanelOpen: this.rightPanelOpen,
        rightPanelMode: this.rightPanelMode,
      }
      // 还原新模式的布局快照
      const snapshot = this.modeLayouts[newMode]
      this.sidebarOpen = snapshot.sidebarOpen
      this.rightPanelOpen = snapshot.rightPanelOpen
      this.rightPanelMode = snapshot.rightPanelMode
    },
  },
})
```

---

## 12. 分屏对比视图（W-06 D）

### 12.1 分屏模式

分屏对比通过将右栏切换到 `split-compare` 模式实现：

```typescript
type RightPanelMode = 'preview' | 'reference' | 'split-compare'
```

分屏激活时：
1. `splitViewActive = true`
2. `editorArea` 渲染两个 `editor-pane`（primary + secondary）
3. secondary pane 加载 `splitViewSecondaryArticleId` 对应的文档（只读预览）

### 12.2 文档选择器

切换到 `reference` 或 `split-compare` 模式时，弹出 QuickOpen 对话框选择目标文档。选择后记录到 `splitViewSecondaryArticleId`。

```typescript
interface SplitViewConfig {
  primaryArticleId: string      // 当前编辑文档（总是主 pane）
  secondaryArticleId: string    // 参考/对比文档
  secondaryMode: 'preview' | 'edit'  // 'preview' 为只读，'edit' 为可编辑
}
```

### 12.3 分屏宽度分配

```css
.workstation__editor-area {
  display: flex;
  flex-direction: row;
}

.editor-pane--primary {
  flex: 1 1 0;
}

.editor-pane--secondary {
  flex: 1 1 0;
  border-left: 1px solid var(--color-border-subtle);
}
```

用户可通过分屏中间的 ResizeHandle 调整两个 pane 的比例。

---

## 13. 组件文件结构

```
src/
  views/
    WorkstationLayout.vue            # 根布局组件
  components/
    layout/
      Sidebar.vue                    # 左栏容器
      SidebarTabSwitcher.vue         # 图标 Tab 切换器
      SidebarTabContent.vue          # 内容区路由
      RightPanel.vue                 # 右栏容器
      RightPanelModeSwitcher.vue     # 预览/参考/对比切换器
      ResizeHandle.vue               # 拖拽调整组件
      TabBar.vue                     # TabBar 容器
      TabBarItem.vue                 # 单个 Tab 项
      TabBarOverflowMenu.vue         # 溢出 Tab 菜单
      EditorArea.vue                 # Editor 区域（含分屏）
      EditorPane.vue                 # 单个 Editor pane
    panels/
      FileManagerPanel.vue           # 文件树面板
      TagBrowserPanel.vue            # 标签浏览面板
      SearchPanel.vue                # 搜索面板
      TOCPanel.vue                   # 大纲/TOC 面板
      BookmarksPanel.vue             # 收藏面板
  stores/
    workstation.ts                   # useWorkstationStore
  composables/
    useResizeHandle.ts               # ResizeHandle 拖拽逻辑
    useResponsiveLayout.ts           # 响应式自动折叠
    useSyncScroll.ts                 # 编辑器-预览同步滚动
  types/
    workstation.ts                   # 所有 Workstation 相关类型
```

---

## 14. 与 Tauri 多窗口的集成（L1-53 C）

### 14.1 窗口 ID 注入

每个 Tauri 窗口在初始化时，由 Rust 侧通过 `window.label` 注入窗口 ID：

```typescript
// src/platform/window.ts
export const WINDOW_ID = window.__TAURI_INTERNALS__?.windowLabel ?? 'web-dev'
```

`useWorkstationStore` 的 `windowId` 字段在 store 初始化时设置为 `WINDOW_ID`。

### 14.2 跨窗口 Tab 迁移

Tab 从窗口 A 拖拽到窗口 B 的 IPC 流程：

```
[Window A] TabBar dragstart
  → dataTransfer.setData('application/x-inkforge-tab', JSON.stringify(tabPayload))

[Tauri OS Level] 拖放到另一个 Tauri WebviewWindow

[Window B] TabBar dragover + drop
  → parse tabPayload
  → emit IPC event 'tab:migrate' to Window A
  → Window A: closeTab(tabId) 无确认（已在目标窗口打开）
  → Window B: openTab(newTab)
```

### 14.3 同一 Article 多窗口检测

```typescript
// 每次 openTab 时，通过 IPC 广播检查
async function openTab(articleId: string) {
  const existingWindows = await invoke<string[]>('check_article_open_windows', { articleId })
  if (existingWindows.some(wid => wid !== WINDOW_ID)) {
    showToast({
      type: 'warning',
      message: `此文档正在另一个窗口中编辑`,
      action: { label: '切换到该窗口', handler: () => invoke('focus_window', { windowId: existingWindows[0] }) }
    })
  }
  // 仍然允许打开，但显示警告
}
```

---

## 15. 性能约束

| 指标 | 要求 |
|------|------|
| 面板折叠/展开动画帧率 | >= 60 FPS（200ms transition） |
| ResizeHandle 拖拽响应延迟 | < 16ms（一帧内，CSS 变量直接更新） |
| TOC 更新延迟 | debounce 200ms（editor content change → TOC re-render） |
| 标签悬停预览延迟 | 延迟 500ms 触发，截图生成 < 100ms |
| Sidebar 内容区 DOM 驻留 | 始终保留（不因折叠 unmount），最大占用 < 5MB DOM |

---

## 16. 测试矩阵

### 16.1 布局骨架

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| L-001 | 初始渲染：四栏布局结构正确 | `.workstation` 有 4 个子区域，CSS 变量正确设置 | Unit |
| L-002 | Sidebar 折叠：宽度变为 0，内容 DOM 保留 | `display` 非 `none`，`width: 0` | Unit |
| L-003 | Sidebar 展开：宽度恢复 `--sidebar-width` | CSS 变量值正确 | Unit |
| L-004 | RightPanel 折叠/展开同上 | 同 L-002/003 | Unit |
| L-005 | 折叠动画 200ms 完成（不跳帧） | transition duration 符合 | Visual |
| L-006 | 折叠时内部 TOC 滚动位置不重置 | 重新展开后 scrollTop 一致 | E2E |
| L-007 | 响应式 < 1024px Sidebar 自动折叠 | sidebarOpen = false | Unit |
| L-008 | 响应式 < 1280px RightPanel 自动折叠 | rightPanelOpen = false | Unit |
| L-009 | 响应式折叠不触发持久化 | layoutPersistence.save 未被调用 | Unit |

### 16.2 ResizeHandle

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| R-001 | 拖拽 Sidebar ResizeHandle 更新 CSS 变量 | `--sidebar-width` 实时变化 | Unit |
| R-002 | 拖拽宽度 < 60px 触发折叠 | `sidebarOpen = false` | Unit |
| R-003 | 双击 ResizeHandle 恢复默认宽度 | `--sidebar-width: 240px` | Unit |
| R-004 | RightPanel ResizeHandle 同上 | 同 R-001~003 | Unit |
| R-005 | 宽度不可超出 min/max 边界 | 强制 clamp | Unit |
| R-006 | 键盘 ←/→ 每次调整 8px | CSS 变量变化量 = 8 | Unit |

### 16.3 TabBar

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| T-001 | 打开文档创建新 Tab | `tabs.length` 增加 | Unit |
| T-002 | 重复打开同一文档激活已有 Tab | `tabs.length` 不变，`activeTabId` 变化 | Unit |
| T-003 | 中键点击关闭 Tab | Tab 从列表移除 | Unit |
| T-004 | 关闭有未保存内容的 Tab 触发确认 | 抛出 `TAB_HAS_UNSAVED_CHANGES` | Unit |
| T-005 | 拖拽排序更新 `tabOrder` | 新顺序正确 | Unit |
| T-006 | 固定 Tab 置于列表左侧 | `isPinned` Tab 排序在前 | Unit |
| T-007 | 未保存 Tab 显示红点 | `.tabbar__dirty-indicator` 可见 | Visual |
| T-008 | 窗口标题显示 `•` 前缀 | `document.title` 以 `•` 开头 | Unit |
| T-009 | Tab 溢出时显示下拉菜单 | `.tabbar__overflow-btn` 可点击 | E2E |
| T-010 | 跨窗口拖拽设置正确 MIME | `dataTransfer.getData()` 含 `articleId` | Unit |

### 16.4 Sidebar Tabs

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| S-001 | 点击未激活 Tab 图标切换内容 | `sidebarTab` 变化，内容组件变化 | Unit |
| S-002 | 点击已激活 Tab 图标折叠 Sidebar | `sidebarOpen = false` | Unit |
| S-003 | Sidebar 折叠时图标轨道（36px）保留 | 图标轨道不消失 | Visual |
| S-004 | TOC 实时更新（编辑后 200ms 内） | TOC entry 数量/内容变化 | E2E |
| S-005 | TOC 拖拽重排触发 ProseMirror transaction | 文档 heading 顺序变化 | E2E |
| S-006 | TOC 当前光标章节高亮 | `.toc-entry--active` class 存在 | E2E |

### 16.5 右栏与分屏

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| P-001 | 切换到 preview 模式显示预览 | 预览内容为 HTML 渲染结果 | E2E |
| P-002 | 切换到 reference 模式打开 QuickOpen | QuickOpen 对话框弹出 | E2E |
| P-003 | 切换到 split-compare 激活双 pane | `splitViewActive = true`，双 pane DOM 存在 | Unit |
| P-004 | 同步滚动：编辑器滚动时预览跟随 | 预览 scrollTop 变化 | E2E |
| P-005 | 临时解除同步：按钮切换状态 | 解除后预览不跟随滚动 | E2E |

### 16.6 编辑器最大化与专注模式

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| M-001 | Ctrl+Shift+M 触发最大化 | 两侧面板折叠，`editorMaximized=true` | Unit |
| M-002 | 再次 Ctrl+Shift+M 恢复原始状态 | 面板状态从快照恢复 | Unit |
| M-003 | 最大化 + 专注叠加状态正确 | 两个状态独立 | Unit |

### 16.7 布局记忆与预设

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| W-001 | 切换编辑模式自动保存/恢复布局快照 | `modeLayouts` 更新 | Unit |
| W-002 | 应用 focus 预设：两侧折叠 | `sidebarOpen=false, rightPanelOpen=false` | Unit |
| W-003 | 应用 review 预设：右栏 400px | `rightPanelWidth=400` | Unit |
| W-004 | 预设切换有动画 | transition 属性存在 | Visual |

### 16.8 快捷键

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| K-001 | Ctrl+\\ 触发 Sidebar 切换 | toggleSidebar 被调用 | Unit |
| K-002 | Ctrl+Shift+\\ 触发 RightPanel 切换 | toggleRightPanel 被调用 | Unit |
| K-003 | 快捷键已注册到 CommandRegistry | registry.has('workspace.toggleSidebar') | Unit |

---

## 附录 A — 设计决策记录

### A.1 为何不用 `display:none` 折叠

`display:none` 会导致：（1）CSS transition 无法应用；（2）内部虚拟列表重新挂载；（3）滚动位置、焦点状态丢失。使用 `width: 0` + `overflow: hidden` 保证内部状态连续性，符合 L1-11 "状态全继承"要求。

### A.2 右栏模式切换器的引入

W-01（右栏仅预览）与 W-06（两文档并排）产生冲突。决策 A.2 通过引入"右栏模式切换器"化解矛盾：默认为 `preview`，用户可切换到 `reference`/`split-compare`。右栏始终是同一个 DOM 容器，通过内容切换实现功能分离。

### A.3 TOC 作为 Sidebar Tab 而非独立面板

W-02 补充明确"放置在左侧 Tab 中"。这与 W-01（右栏仅预览）一致，将所有辅助信息聚合到左栏，右栏专注内容呈现。左栏虽然内容更多，但通过 Tab 切换机制保持清晰分层。

---

## 附录 B — CSS 变量速查表

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `--sidebar-width` | `240px` | 左栏当前宽度（用户可调） |
| `--sidebar-min-width` | `180px` | 左栏最小宽度 |
| `--sidebar-max-width` | `400px` | 左栏最大宽度 |
| `--right-panel-width` | `280px` | 右栏当前宽度（用户可调） |
| `--right-panel-min-width` | `200px` | 右栏最小宽度 |
| `--right-panel-max-width` | `600px` | 右栏最大宽度 |
| `--tabbar-height` | `40px` | TabBar 高度（固定不可调） |
| `--resize-handle-width` | `4px` | 分割线视觉宽度 |
| `--resize-handle-hit-area` | `12px` | 分割线可点击热区宽度 |
| `--panel-collapse-duration` | `200ms` | 折叠/展开动画时长 |
| `--panel-collapse-easing` | `ease` | 折叠/展开缓动函数 |


---

## 2026-04-30 Baseline 实装记录

本轮已完成 `WorkstationView.vue` 的 compatible layout baseline，不声明 Spec 13 全量完成：

- 已保留现有 Workstation 四区结构、FileManager、Stage、Inspector、EditorStatusBar、模式切换和专注模式，不引入新的 `useWorkstationStore` 或替代壳层。
- 已新增 header 布局预设：默认、写作、审阅、专注；预设按钮不使用 emoji，复用现有 SVG 图标体系和文字标签。
- 已让预设真实驱动现有 `managerCollapsed / stageCollapsed / inspectorCollapsed` 状态；专注预设复用现有 `enterFocusMode()`，没有创建平行状态机。
- 已新增 `WorkstationPanelWidths` 强类型宽度状态，并把 manager/stage/inspector 面板宽度从硬编码 CSS 切到 `.workstation` 根节点 CSS 变量：`--workstation-manager-width`、`--workstation-stage-width`、`--workstation-inspector-width`。
- 已新增 `inkforge.workstation.panelWidths` localStorage 偏好，读取时对坏 JSON、非法数字和越界宽度做防御式回退，写入失败不阻塞文档编辑。
- 已通过真实浏览器验证：`/workstation` 预设按钮可见；写作预设收起 Stage；审阅预设展开全部并将 Inspector 宽度设为 400px；专注预设进入 focus-mode 并折叠三栏；坏 JSON 重载回退正常且无 console error。

仍未在本 baseline 覆盖的完整 Spec 13 项：拖拽 ResizeHandle、键盘调整 ResizeHandle、右栏 reference/split-compare 模式、独立 `useWorkstationStore`、响应式自动折叠、TabBar 拖拽/固定/跨窗口、TOC 拖拽重排、分屏比较和 Spec 34 IndexedDB 级布局持久化。这些仍保持 Pending。

