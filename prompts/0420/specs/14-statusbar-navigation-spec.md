# Spec 14 — StatusBar & Navigation System

<!--
spec-id: 14
title: StatusBar and Navigation System
version: 1.0.0
status: draft
created: 2026-04-21
sources:
  - prompts/0420/_extracted/03-enhancement-answers.md N-01~N-06 L1-48
  - prompts/0420/00-decisions-part3b-tauri-visual-recovery.md 域 S
  - prompts/0420/_extracted/01-L1-answers.md L1-12 L1-49
related-specs:
  - 13-workstation-layout-spec.md
  - 21-focus-writing-assist-spec.md
  - 34-layout-persistence-spec.md
-->

---

## 0. 2026-04-22 Wave 1 运行时真相补注

- 当前 `EditorStatusBar.vue` 并未拆出独立 `DocumentStatusBadge` 组件，而是在状态栏左区以内联 `<button class="document-status-badge">` 形式渲染文稿状态 badge。
- 当前 badge 已真实接入事件合同 `open-document-status`；`WorkstationView.vue` 监听后会先尝试 `await editorPanelRef.flushPendingChanges()`，再执行路由跳转。
- 当前 badge 的运行时语义是“导航入口”，不是本 spec 原设想的“状态切换菜单”：
  - `draft` -> `{ name: 'Drafts' }`
  - `new / read / processed` -> `{ name: 'Hub' }`
- 本轮 Playwright 已真实验证 `draft` 分支：`Hub -> 继续创作 -> Workstation -> 点击状态 badge -> /drafts` 可以跑通；同时浏览器内探针已证明点击前 `flushPendingChanges()` 实际发生 `called=1 / resolved=1 / rejected=0`。
- 非 `draft` 分支当前只有代码落地，没有浏览器样本验证，因为本轮真实数据池里只有 `draft` 文稿。
- 右区当前真实已落地的是 `编辑模式切换 + 版心宽度控制 + 设置入口 + 同步状态 + 保存状态 + 光标位置`；`ZoomControl / NotificationBell` 仍属于本 spec 目标态，不能按已实现书写。

---

## 1. 范围与目标

本 Spec 定义 InkForge v2.1 底部状态栏（StatusBar）的完整信息架构、交互规范，以及相关导航组件（TabBar 增强、修改指示系统、Toast 通知系统）的规格。

**管辖边界**：

| 组件 | 本 Spec 责任 | 其他 Spec |
|------|-------------|-----------|
| StatusBar | 完整规格（字段、交互、可见性、Zoom） | - |
| TabBar 增强 | N-04 功能列表与数据契约 | 渲染实现见 Spec 13 |
| 修改指示 | N-05 全栈追踪规格 | 与 Spec 13 TabBar 协同 |
| Toast 系统 | N-06 Sonner 集成、撤销框架 | - |
| 通知中心 | 铃铛弹出、通知 Schema | - |
| 面包屑 | N-03 A 不做 | - |

---

## 2. 决策溯源

| 决策 | 内容 | 来源 |
|------|------|------|
| N-01 C + 补充 | StatusBar 展示 C 级字段集；可整体关闭 | N-01 |
| N-02 D | StatusBar 每个区域可点击交互 | N-02 |
| N-03 A | 不做面包屑导航 | N-03 |
| N-04 D | TabBar 完整 IDE 增强（拖拽/中键/固定/悬停预览） | N-04 |
| N-05 D | 修改指示全栈暴露（Tab 点、FileManager、窗口标题、关闭确认） | N-05 |
| N-06 D | Sonner 栈式 Toast + 撤销按钮 | N-06 |
| L1-48 B | 字数 + 字符数 + 段落数 + 阅读时长（不含行列号）| L1-48 |
| L1-49 B+C | 安静界面；写作配色方案 | L1-49 |
| A.1 冲突裁决 | 以 N-01 C 为准：不显示行列号 | 附录 A.1 |

---

## 3. StatusBar 信息架构

### 3.1 三区布局

```
┌─────────────────────────────────────────────────────────────────────┐
│ [左区]                    [中区]                       [右区]        │
│ 路径 · 状态 · 同步        字数 · 读时 · 段落          模式 · 缩放 · 通知 · 设置 │
└─────────────────────────────────────────────────────────────────────┘
```

StatusBar 高度固定 28px，背景色使用 `var(--color-surface-statusbar)`，底部边框使用 `var(--color-border-subtle)`。

### 3.2 左区字段

| 字段 | 组件 | 交互（N-02 D） |
|------|------|----------------|
| 文档状态 Badge | `document-status-badge`（`EditorStatusBar.vue` 内联 button） | 当前为导航入口；目标态才是状态转换菜单 |
| 同步状态图标 | `SyncStatusIcon` | 点击弹出同步详情 Popover |
| 分隔点 | `·` | - |

文档状态 Badge 显示当前文档的状态机状态（来自 Spec 11 DocumentLifecycle）：

```typescript
type DocumentStatus = 'draft' | 'writing' | 'review-pending' | 'publish-pending' | 'published' | 'archived'

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  writing: 'Writing',
  'review-pending': 'In Review',
  'publish-pending': 'Pending',
  published: 'Published',
  archived: 'Archived',
}

const STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: 'var(--color-status-draft)',          // 灰色
  writing: 'var(--color-status-writing)',       // 蓝色
  'review-pending': 'var(--color-status-review)',  // 橙色
  'publish-pending': 'var(--color-status-pending)', // 黄色
  published: 'var(--color-status-published)',   // 绿色
  archived: 'var(--color-status-archived)',     // 深灰色
}
```

> 当前实现与目标态差异：运行时代码当前只识别 `draft / new / read / processed` 四种文章状态，并映射为“草稿 / 待整理 / 已读 / 已完成”。这四种状态来自既有 `ARTICLE_STATUS` 的增量演进，尚未切换到本节定义的完整六态机。

同步状态图标规格：

```typescript
type SyncStatus = 'idle' | 'syncing' | 'conflict' | 'error' | 'disabled'

const SYNC_ICON_MAP: Record<SyncStatus, { icon: Component; spin: boolean; color: string }> = {
  idle:     { icon: CloudIcon,          spin: false, color: 'var(--color-text-tertiary)' },
  syncing:  { icon: RefreshCwIcon,      spin: true,  color: 'var(--color-brand-blue)' },
  conflict: { icon: AlertTriangleIcon,  spin: false, color: 'var(--color-warning)' },
  error:    { icon: CloudOffIcon,       spin: false, color: 'var(--color-danger)' },
  disabled: { icon: CloudOffIcon,       spin: false, color: 'var(--color-text-disabled)' },
}
```

同步状态 `syncing` 时，`RefreshCwIcon` 使用 CSS `animation: spin 1s linear infinite`。

### 3.3 中区字段（N-01 C + L1-48 B）

| 字段 | 格式 | 说明 |
|------|------|------|
| 中文字数 | `N 字` | 中文字符计数（排除代码块、公式块） |
| 英文词数 | `N words` | 英文按空格分词 |
| 段落数 | `N 段` | ProseMirror `paragraph` 节点数 |
| 预计阅读时长 | `N min read` | 见算法 3.4 |

字数统计 debounce 500ms（编辑停止后才更新，防止快速输入时闪烁）。

当前 Wave 1 运行时仅在 `Preview` 模式隐藏行列号；非 `Preview` 模式仍显示光标位置。完整“默认不显示行列号”仍属于目标态裁决。

中区字段点击行为（N-02 D）：
- 点击左侧统计区域 → 切换当前已落地的内联 `detail-panel`
- 点击段落数 → 无操作（仅 Tooltip 说明"段落数"）
- 点击阅读时长 → 无操作（Tooltip 说明估算方法）

#### 3.4 字数统计算法

```typescript
interface WordCountResult {
  chineseChars: number     // 中文字符数
  englishWords: number     // 英文词数
  paragraphs: number       // 段落数
  readingTimeMinutes: number  // 预计阅读分钟数
  totalChars: number       // 总字符数（含中英文，排除代码/公式）
}

function computeWordCount(doc: Node): WordCountResult {
  let chineseChars = 0
  let englishWords = 0
  let paragraphs = 0
  let totalChars = 0

  doc.descendants((node, _pos) => {
    // 跳过代码块和公式块节点
    if (node.type.name === 'codeBlock' || node.type.name === 'math') {
      return false  // 不遍历子节点
    }

    if (node.type.name === 'paragraph') {
      paragraphs++
    }

    if (node.isText && node.text) {
      const text = node.text
      // 中文字符（CJK Unified Ideographs）
      const chineseMatches = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df]/g)
      chineseChars += chineseMatches?.length ?? 0

      // 英文词（连续字母/数字序列）
      const englishMatches = text.match(/[a-zA-Z0-9]+/g)
      englishWords += englishMatches?.length ?? 0

      // 总字符（排除空白符）
      totalChars += text.replace(/\s/g, '').length
    }
  })

  // 阅读时长估算：中文 300字/min，英文 200词/min
  const readingTimeMinutes = Math.ceil(chineseChars / 300 + englishWords / 200) || 1

  return { chineseChars, englishWords, paragraphs, readingTimeMinutes, totalChars }
}
```

#### 3.5 中区渲染示例

```html
<div class="statusbar__center" role="status" aria-label="Document statistics">
  <button class="statusbar__stat-btn" @click="openWordCountReport" :title="`总字符数 ${stats.totalChars}`">
    <span class="statusbar__stat-value">{{ stats.chineseChars }} 字</span>
    <span class="statusbar__stat-sep">/</span>
    <span class="statusbar__stat-value">{{ stats.englishWords }} words</span>
  </button>
  <span class="statusbar__stat-dot">·</span>
  <span class="statusbar__stat-item" :title="'段落数'">{{ stats.paragraphs }} 段</span>
  <span class="statusbar__stat-dot">·</span>
  <span class="statusbar__stat-item" :title="readingTimeTooltip">{{ stats.readingTimeMinutes }} min read</span>
</div>
```

### 3.4 右区字段

| 字段 | 组件 | 交互 |
|------|------|------|
| 编辑模式 | `EditorModeSwitcher` | 已落地，点击切换 `typora / source / preview` |
| 同步状态 | `SyncStatusText` | 已落地，展示同步状态文本 |
| 保存状态 | `SaveStatusText` | 已落地，展示保存结果 |
| 渲染耗时 | `RenderTimeStat` | 已落地，仅存在预览渲染结果时显示 |
| 光标位置 | `CursorStat` | 已落地，仅非 `Preview` 模式显示 |
| 缩放比例 | `ZoomControl` | 目标态，尚未作为独立控制项落地；当前真实运行时以“版心宽度按钮 + Ctrl+= / Ctrl+-”替代 |
| 通知铃铛 | `NotificationBell` | 目标态，尚未作为独立控制项落地 |
| 设置齿轮 | `SettingsEntryBtn` | 已以内联状态栏按钮落地；尚未拆分为独立组件 |

#### 3.5 编辑模式切换器

```typescript
type EditorMode = 'typora' | 'source' | 'preview'

const MODE_LABELS: Record<EditorMode, string> = {
  typora: 'Typora',
  source: 'Source',
  preview: 'Preview',
}
```

点击当前模式文字弹出 `<Menu>` 下拉，列出三个模式选项（当前模式有勾选标记）。选择后通过 `editorStore.setMode(mode)` 切换，并触发 Workstation Layout 的模式布局快照（W-03 C）。

#### 3.6 缩放控制（Zoom）

> 未来设计：当前运行时尚未落地独立 `ZoomControl`，本节描述的是目标态 contract。

```typescript
interface ZoomState {
  level: number          // 0.5 ~ 2.0（50% ~ 200%）
  default: 1.0
  step: 0.1
}
```

快捷键：
- `Ctrl++`：增加 10%
- `Ctrl+-`：减少 10%
- `Ctrl+0`：重置为 100%

缩放通过 CSS `zoom` 属性应用到 `.editor-content` 容器（不影响 UI chrome）：

```css
.editor-content {
  zoom: var(--editor-zoom-level, 1);
}
```

点击 StatusBar 缩放文字弹出 Popover：
- 显示 `-` / `当前%` / `+` 三格控制
- 底部有"Reset to 100%"链接

#### 3.7 通知中心

> 未来设计：当前运行时尚未落地独立 `NotificationBell` / `NotificationCenter`，本节描述的是目标态 contract。

铃铛点击展开通知中心 Popover（定位在铃铛按钮上方）：

```typescript
interface Notification {
  id: string
  type: 'system' | 'sync' | 'error' | 'info'
  title: string
  body?: string
  timestamp: number
  read: boolean
  action?: {
    label: string
    handler: () => void
  }
}
```

通知列表规格：
- 最多保留最近 50 条（FIFO 淘汰旧通知）
- 按时间倒序排列
- 未读通知有蓝色左侧边框
- 铃铛图标有红色数字角标（未读数量，超过 9 显示 `9+`）
- "全部标为已读"按钮（位于 Popover 顶部工具栏）
- "清空通知"按钮（清除已读通知）

---

## 4. StatusBar 可见性控制（N-01 补充）

### 4.1 整体开关

用户可将 StatusBar 完全隐藏，提供最干净的写作感受（呼应 L1-49 iA Writer 哲学）：

```typescript
// useStatusBarStore
interface StatusBarState {
  visible: boolean       // StatusBar 整体可见性
  // ... 其他字段
}
```

控制入口：
1. View 菜单 → "Show Status Bar"（勾选/取消）
2. Command Palette → `view.toggleStatusBar`
3. 专注模式进入时可选择性隐藏（由 FocusMode Spec 21 控制）

StatusBar 隐藏时，`WorkstationLayout` 的 `workstation__statusbar` 高度变为 0（transition 100ms）。

### 4.2 个别字段显示控制

用户可在 Settings > Editor > Status Bar 中控制中区各字段的显示：

```typescript
interface StatusBarFieldVisibility {
  chineseWordCount: boolean   // 默认 true
  englishWordCount: boolean   // 默认 true
  paragraphCount: boolean     // 默认 true
  readingTime: boolean        // 默认 true
  zoomControl: boolean        // 默认 true
  notificationBell: boolean   // 默认 true
}
```

---

## 5. `useStatusBarStore`

```typescript
// src/stores/statusbar.ts
import { defineStore } from 'pinia'
import type { WordCountResult, SyncStatus, EditorMode, Notification, ZoomState } from '@/types/statusbar'

interface StatusBarState {
  visible: boolean
  fieldVisibility: StatusBarFieldVisibility

  // 左区
  syncStatus: SyncStatus
  documentStatus: DocumentStatus

  // 中区
  wordCount: WordCountResult
  _wordCountDirty: boolean  // 内部标记，debounce 用

  // 右区
  editorMode: EditorMode
  zoom: ZoomState
  notifications: Notification[]
}

export const useStatusBarStore = defineStore('statusbar', {
  state: (): StatusBarState => ({
    visible: true,
    fieldVisibility: {
      chineseWordCount: true,
      englishWordCount: true,
      paragraphCount: true,
      readingTime: true,
      zoomControl: true,
      notificationBell: true,
    },
    syncStatus: 'idle',
    documentStatus: 'draft',
    wordCount: {
      chineseChars: 0,
      englishWords: 0,
      paragraphs: 0,
      readingTimeMinutes: 0,
      totalChars: 0,
    },
    _wordCountDirty: false,
    editorMode: 'typora',
    zoom: { level: 1.0, default: 1.0, step: 0.1 },
    notifications: [],
  }),

  getters: {
    unreadCount: (state): number =>
      state.notifications.filter(n => !n.read).length,

    displayZoom: (state): string =>
      `${Math.round(state.zoom.level * 100)}%`,
  },

  actions: {
    toggleVisible() {
      this.visible = !this.visible
    },

    setSyncStatus(status: SyncStatus) {
      this.syncStatus = status
    },

    setDocumentStatus(status: DocumentStatus) {
      this.documentStatus = status
    },

    // 由 editor 的 'update' 事件触发，内部 debounce
    scheduleWordCountUpdate(doc: Node) {
      this._wordCountDirty = true
      // 实际 debounce 在 composable 层处理（见 useWordCountUpdater）
    },

    applyWordCount(result: WordCountResult) {
      this.wordCount = result
      this._wordCountDirty = false
    },

    setEditorMode(mode: EditorMode) {
      this.editorMode = mode
    },

    zoomIn() {
      this.zoom.level = Math.min(2.0, Math.round((this.zoom.level + this.zoom.step) * 10) / 10)
      this._applyZoom()
    },

    zoomOut() {
      this.zoom.level = Math.max(0.5, Math.round((this.zoom.level - this.zoom.step) * 10) / 10)
      this._applyZoom()
    },

    zoomReset() {
      this.zoom.level = this.zoom.default
      this._applyZoom()
    },

    _applyZoom() {
      document.documentElement.style.setProperty('--editor-zoom-level', String(this.zoom.level))
    },

    addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
      const n: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        read: false,
      }
      this.notifications.unshift(n)
      // 保留最多 50 条
      if (this.notifications.length > 50) {
        this.notifications = this.notifications.slice(0, 50)
      }
    },

    markAllRead() {
      this.notifications.forEach(n => { n.read = true })
    },

    clearReadNotifications() {
      this.notifications = this.notifications.filter(n => !n.read)
    },
  },
})
```

---

## 6. 字数更新 Composable

```typescript
// src/composables/useWordCountUpdater.ts
import { useDebounceFn } from '@vueuse/core'
import { useStatusBarStore } from '@/stores/statusbar'
import { computeWordCount } from '@/utils/word-count'

export function useWordCountUpdater(editor: Ref<Editor | null>) {
  const statusBarStore = useStatusBarStore()

  const debouncedUpdate = useDebounceFn(() => {
    if (!editor.value) return
    const result = computeWordCount(editor.value.state.doc)
    statusBarStore.applyWordCount(result)
  }, 500)

  // 监听 editor 内容变化
  watch(editor, (ed) => {
    if (!ed) return
    ed.on('update', () => {
      debouncedUpdate()
    })
  }, { immediate: true })
}
```

---

## 7. StatusBar 组件结构

> 当前运行时并未拆出本节所列的完整 `statusbar/` 目录；真实实现仍集中在 `inkforge/src/components/editor/EditorStatusBar.vue` 与 `WorkstationView.vue`。以下组件树属于后续可演进的目标拆分形态。

```
src/
  components/
    statusbar/
      StatusBar.vue                  # 根容器：三区布局
      StatusBarLeft.vue              # 左区：状态 Badge + 同步图标
      StatusBarCenter.vue            # 中区：字数统计
      StatusBarRight.vue             # 右区：模式/缩放/通知/设置
      DocumentStatusBadge.vue        # 文档状态 Badge（含点击菜单）
      SyncStatusIcon.vue             # 同步状态图标（含旋转动画）
      EditorModeSwitcher.vue         # 模式切换下拉
      ZoomControl.vue                # 缩放控制 Popover
      NotificationBell.vue           # 铃铛 + 角标
      NotificationCenter.vue         # 通知中心 Popover
      NotificationItem.vue           # 单条通知项
      SettingsEntryBtn.vue           # 设置入口按钮
  stores/
    statusbar.ts                     # useStatusBarStore
  composables/
    useWordCountUpdater.ts           # 字数更新 debounce
  utils/
    word-count.ts                    # computeWordCount 算法
  types/
    statusbar.ts                     # 所有 StatusBar 相关类型
```

---

## 8. 修改指示系统（N-05 D）

### 8.1 四级暴露

文档有未保存修改时，在以下四个位置同时暴露：

| 位置 | 视觉表现 | 实现 |
|------|---------|------|
| TabBar Tab | 红色实心圆点（6px）| `WorkspaceTab.isDirty = true` → `.tabbar__dirty-indicator` |
| FileManager 文件项 | 文件名前置 `•` | `ArticleListItem.isDirty` 属性 |
| 窗口标题 | `• DocumentTitle — InkForge` 前缀 | `document.title` |
| 关闭确认弹窗 | 关闭 Tab/窗口时弹出确认 | `closeTab()` 异常处理 + `<ConfirmDialog>` |

### 8.2 Dirty 状态追踪

```typescript
// src/composables/useDirtyStateTracker.ts
export function useDirtyStateTracker(editor: Ref<Editor | null>, articleId: Ref<string>) {
  const workstationStore = useWorkstationStore()

  let lastSavedContent = ''

  function onEditorUpdate() {
    if (!editor.value) return
    const currentContent = editor.value.storage.markdown?.getMarkdown?.() ?? ''
    const isDirty = currentContent !== lastSavedContent
    workstationStore.setTabDirty(articleId.value, isDirty)
  }

  function onSaveSuccess(content: string) {
    lastSavedContent = content
    workstationStore.setTabDirty(articleId.value, false)
  }

  watch(editor, (ed) => {
    if (!ed) return
    ed.on('update', onEditorUpdate)
  })

  return { onSaveSuccess }
}
```

### 8.3 关闭确认弹窗

当关闭有未保存内容的 Tab 或窗口时，弹出 `<ConfirmCloseDialog>`：

```html
<ConfirmCloseDialog
  :visible="showCloseConfirm"
  :document-title="pendingCloseTab?.title"
  @save-and-close="handleSaveAndClose"
  @discard-and-close="handleDiscardAndClose"
  @cancel="showCloseConfirm = false"
/>
```

按钮文案：
- "Save and Close"（首选按钮）
- "Discard Changes"（危险按钮，需二次高亮确认）
- "Cancel"

---

## 9. Toast 通知系统（N-06 D）

### 9.1 技术选型

使用 **vue-sonner**（Sonner 的 Vue 3 移植版）实现栈式 Toast：

```typescript
// src/services/toast/index.ts
import { toast } from 'vue-sonner'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastOptions {
  type: ToastType
  message: string
  description?: string
  duration?: number              // ms，默认 4000
  action?: {
    label: string
    onClick: () => void
  }
  undoAction?: {
    label?: string               // 默认 'Undo'
    handler: () => void | Promise<void>
    timeout?: number             // ms，默认同 duration
  }
  id?: string                    // 指定 ID 可更新已有 Toast
}

export function showToast(options: ToastOptions): string {
  const { type, message, description, duration = 4000, action, undoAction, id } = options

  const toastAction = action ? {
    label: action.label,
    onClick: action.onClick,
  } : undoAction ? {
    label: undoAction.label ?? 'Undo',
    onClick: () => {
      void undoAction.handler()
      toast.dismiss(toastId)
    },
  } : undefined

  const toastId = toast[type](message, {
    description,
    duration,
    action: toastAction,
    id,
  })

  return toastId
}
```

### 9.2 撤销按钮框架（Action Reversal）

操作类 Toast 的撤销机制要求调用方注册一个可逆操作：

```typescript
// src/services/action-reversal/index.ts
interface ReversibleAction {
  id: string
  description: string
  timestamp: number
  undo: () => Promise<void>
  expired: boolean
}

class ActionReversalRegistry {
  private actions = new Map<string, ReversibleAction>()

  register(action: Omit<ReversibleAction, 'id' | 'timestamp' | 'expired'>): string {
    const id = crypto.randomUUID()
    const registered: ReversibleAction = {
      ...action,
      id,
      timestamp: Date.now(),
      expired: false,
    }
    this.actions.set(id, registered)
    return id
  }

  async undo(id: string): Promise<void> {
    const action = this.actions.get(id)
    if (!action || action.expired) throw new Error('Action expired or not found')
    await action.undo()
    action.expired = true
    this.actions.delete(id)
  }

  expire(id: string): void {
    const action = this.actions.get(id)
    if (action) {
      action.expired = true
      this.actions.delete(id)
    }
  }
}

export const actionReversalRegistry = new ActionReversalRegistry()
```

使用示例（删除文章到回收站，L1-42 D 联动）：

```typescript
async function moveToTrash(articleId: string) {
  const article = await articleRepository.findById(articleId)
  await articleRepository.softDelete(articleId)

  const actionId = actionReversalRegistry.register({
    description: `Delete "${article.title}"`,
    undo: async () => {
      await articleRepository.restore(articleId)
    },
  })

  showToast({
    type: 'success',
    message: `"${article.title}" 已移至回收站`,
    undoAction: {
      handler: () => actionReversalRegistry.undo(actionId),
    },
    duration: 5000,
  })

  // 5 秒后 Toast 消失时 expire action
  setTimeout(() => actionReversalRegistry.expire(actionId), 5000)
}
```

### 9.3 Toast 层级

Toast 容器使用 `--z-toast: 400`（见 Spec 13 附录 B）。

Sonner 配置：

```html
<!-- App.vue -->
<Toaster
  position="bottom-right"
  :toast-options="{
    duration: 4000,
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: '13px',
    }
  }"
  :richColors="true"
  :expand="false"
  :closeButton="true"
/>
```

---

## 10. 自动保存状态指示（E-07 D）

自动保存失败时（L1-19 D 铁律七），StatusBar 必须给出完全可见的状态：

```typescript
type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'failed' | 'retrying'

// 状态机转换：
// idle → saving（触发保存）
// saving → saved（成功）
// saving → retrying（失败一次，自动重试）
// retrying → saved（重试成功）
// retrying → failed（重试失败，不再自动重试）
```

StatusBar 左区追加自动保存指示区：

| 状态 | 视觉 |
|------|------|
| `idle` | 不显示 |
| `saving` | `Loader2Icon` 旋转 + "Saving..." |
| `saved` | `CheckIcon` + "Saved" (2s 后消失) |
| `retrying` | `RefreshCwIcon` 旋转 + "Retrying..." |
| `failed` | `AlertCircleIcon` 红色 + "Save failed" + 点击展开失败详情 |

失败时点击"Save failed"文字弹出 Popover，显示：
- 失败原因（`error.message`）
- "手动导出应急副本"按钮（触发纯文本另存为对话框）
- "查看错误日志"链接（打开 ActivityLogger 记录）

---

## 11. 键盘快捷键注册

StatusBar 相关快捷键通过 CommandRegistry 注册：

```typescript
commandRegistry.register([
  {
    id: 'view.toggleStatusBar',
    label: 'Toggle Status Bar',
    shortcut: null,  // 无默认快捷键，通过菜单或 Command Palette 触发
    handler: () => statusBarStore.toggleVisible(),
  },
  {
    id: 'view.zoomIn',
    label: 'Zoom In',
    shortcut: 'Ctrl+=',
    handler: () => statusBarStore.zoomIn(),
  },
  {
    id: 'view.zoomOut',
    label: 'Zoom Out',
    shortcut: 'Ctrl+-',
    handler: () => statusBarStore.zoomOut(),
  },
  {
    id: 'view.zoomReset',
    label: 'Reset Zoom',
    shortcut: 'Ctrl+0',
    handler: () => statusBarStore.zoomReset(),
  },
  {
    id: 'editor.toggleEditorMode',
    label: 'Toggle Typora / Source Mode',
    shortcut: 'Ctrl+\\',
    handler: () => statusBarStore.toggleEditorMode(),
  },
  {
    id: 'editor.togglePreview',
    label: 'Toggle Preview Mode',
    shortcut: 'Ctrl+Shift+V',
    handler: () => statusBarStore.togglePreview(),
  },
])
```

---

## 12. 性能约束

| 指标 | 要求 |
|------|------|
| 字数更新延迟 | debounce 500ms，不早于此时间触发 |
| Toast 显示延迟 | 操作完成后 < 50ms 显示 Toast |
| 通知中心打开延迟 | < 100ms |
| StatusBar 渲染帧率 | 不因字数计算阻塞主线程（Worker 备选） |
| 同步状态图标旋转 | 60 FPS CSS animation |

---

## 13. 测试矩阵

### 13.1 StatusBar 字段

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| SB-001 | 初始渲染：三区布局正确 | 三个子区域存在 | Visual |
| SB-002 | 字数统计 500ms debounce 后更新 | 快速输入时不每个字符更新 | Unit |
| SB-003 | 中文字符计数正确（排除代码块）| `chineseChars` 值准确 | Unit |
| SB-004 | 英文词数计数正确（排除代码块）| `englishWords` 值准确 | Unit |
| SB-005 | 段落数计数正确 | `paragraphs` 值准确 | Unit |
| SB-006 | 阅读时长算法：中文 300/min | 10000 中文字 → 34 min | Unit |
| SB-007 | 阅读时长算法：英文 200/min | 2000 英文词 → 10 min | Unit |
| SB-008 | 点击左侧统计区域切换详细统计面板 | 内联 `detail-panel` 出现 | E2E |
| SB-009 | 同步状态 syncing → RefreshCwIcon 旋转 | CSS animation 存在 | Unit |
| SB-010 | 同步状态 conflict → 橙色警告图标 | 颜色 var(--color-warning) | Visual |

### 13.2 可见性控制

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| V-001 | toggleVisible() 隐藏 StatusBar | `visible = false`，高度 → 0 | Unit |
| V-002 | 再次 toggleVisible() 恢复 StatusBar | `visible = true` | Unit |
| V-003 | 专注模式进入时 StatusBar 可配置隐藏 | FocusMode 集成测试 | E2E |
| V-004 | Settings 中字段可见性开关生效 | 对应字段不渲染 | Unit |

### 13.3 编辑模式切换

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| M-001 | 点击模式文字弹出选择菜单 | menu 出现 | E2E |
| M-002 | 选择 Source 模式切换成功 | `editorMode = 'source'` | Unit |
| M-003 | `Ctrl+\\` / `Ctrl+Shift+V` 快捷键生效 | 模式变化 | E2E |
| M-004 | 模式切换触发 WorkstationStore.onEditorModeChange | 调用记录 | Unit |

### 13.4 缩放控制

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| Z-001 | Ctrl++ 增加 10% | `zoom.level` += 0.1 | Unit |
| Z-002 | Ctrl+- 减少 10% | `zoom.level` -= 0.1 | Unit |
| Z-003 | Ctrl+0 重置到 100% | `zoom.level = 1.0` | Unit |
| Z-004 | 缩放不超过 200% 上限 | `zoom.level <= 2.0` | Unit |
| Z-005 | 缩放不低于 50% 下限 | `zoom.level >= 0.5` | Unit |
| Z-006 | CSS 变量 `--editor-zoom-level` 正确更新 | `getPropertyValue` 一致 | Unit |

### 13.5 修改指示

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| D-001 | 编辑后 Tab 显示红点 | `.tabbar__dirty-indicator` 可见 | E2E |
| D-002 | 保存后 Tab 红点消失 | `.tabbar__dirty-indicator` 不存在 | E2E |
| D-003 | 编辑后窗口标题有 `•` 前缀 | `document.title.startsWith('•')` | Unit |
| D-004 | 关闭有未保存内容的 Tab 弹出确认 | ConfirmCloseDialog 出现 | E2E |
| D-005 | 确认"Discard"后 Tab 关闭，红点清除 | Tab 不再存在 | E2E |
| D-006 | 确认"Save and Close"先保存再关闭 | save 调用后 Tab 关闭 | E2E |

### 13.6 Toast 系统

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| T-001 | showToast success 显示绿色 Toast | 颜色正确 | Visual |
| T-002 | showToast error 显示红色 Toast | 颜色正确 | Visual |
| T-003 | 带 undoAction 的 Toast 显示 Undo 按钮 | 按钮文字 "Undo" | Unit |
| T-004 | 点击 Undo 按钮执行 handler 并关闭 Toast | handler 被调用，Toast 消失 | E2E |
| T-005 | Toast 超时后 action 标记为 expired | `expired = true` | Unit |
| T-006 | 多个 Toast 栈式叠加（最多 3 个可见）| Sonner expand=false 行为 | Visual |
| T-007 | 删除文章后 Undo 恢复文章 | 文章重新出现在列表 | E2E |

### 13.7 通知中心

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| N-001 | 添加通知后角标计数+1 | 铃铛角标数字变化 | Unit |
| N-002 | 最多保留 50 条通知 | `notifications.length <= 50` | Unit |
| N-003 | "全部标为已读"清除角标 | `unreadCount = 0` | Unit |
| N-004 | "清空通知"只删除已读项 | 未读项保留 | Unit |
| N-005 | 通知 action 按钮点击执行 handler | handler 被调用 | Unit |

### 13.8 自动保存失败

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| AS-001 | 保存中显示旋转 Loader2Icon | autoSaveStatus = 'saving' | Unit |
| AS-002 | 保存失败显示红色 AlertCircleIcon | autoSaveStatus = 'failed' | Unit |
| AS-003 | 失败后自动重试一次 | retrying 状态出现 | Unit |
| AS-004 | 重试失败不再重试 | 状态停在 'failed' | Unit |
| AS-005 | 点击失败状态弹出详情 Popover | 错误信息可见 | E2E |
| AS-006 | 失败 Popover 中"手动导出"按钮可用 | 触发另存为对话框 | E2E |
| AS-007 | 所有失败事件写入 ActivityLogger | 日志记录存在 | Unit |

---

## 附录 A — 决策冲突裁决

### A.1 行列号是否显示

- **L1-48 B**：不含行列号
- **N-01 C 字段**：未明确列举行列号

裁决：目标态仍以“默认不显示行列号”为方向，但 **当前 Wave 1 运行时真相** 是“仅 Preview 隐藏，非 Preview 继续显示光标位置”。在实现真正收口前，文档必须按现代码行为记录，不能把目标态写成已交付。

### A.2 面包屑

N-03 A 选择不做面包屑。本 Spec 无面包屑实现。当前路径/分类信息通过 FileManagerPanel（Spec 12）的左栏 Tab 展示，无需 StatusBar 重复。


---

## 2026-04-30 Baseline 实装记录

本轮已完成 `EditorStatusBar.vue` 的 compatible lifecycle badge baseline，不声明 Spec 14 全量完成：

- 已保留当前状态栏真实运行时结构：左区状态 badge 与统计、中区写作目标/可读性、右区编辑模式、版心宽度、设置入口、同步/保存/渲染耗时/光标状态。
- 已把文档状态 badge 从 legacy 四态手写映射改为复用 `src/core/lifecycle` 的 `getArticleStatusLabel`、`getArticleStatusClass` 和 `isDraftBoxStatus`，覆盖 `draft / writing / under_review / ready_to_publish / published / archived` 以及 legacy 状态。
- 已保持当前导航合同：badge 仍是导航入口；`WorkstationView.vue` 点击前先 flush pending editor changes；draft-like 状态进入草稿箱，其余状态返回 Hub。
- 已通过真实浏览器验证：通过当前 Pinia `articleStore` 写入并清理 6 篇不同生命周期状态的 IndexedDB 文稿，状态栏 badge 分别显示草稿、写作中、待审阅、待发布、已发布、已归档，且无 console error。

仍未在本 baseline 覆盖的完整 Spec 14 项：状态转换菜单、独立 `DocumentStatusBadge` 组件、通知铃铛、Sonner Toast 栈、撤销框架、独立 ZoomControl、TabBar 拖拽/固定/悬停预览/中键关闭、窗口标题 dirty 指示和关闭确认。这些仍保持 Pending。

