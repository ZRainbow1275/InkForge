# Spec 34 — Layout Persistence

<!--
spec-id: 34
title: Layout State Persistence
version: 1.0.0
status: draft
created: 2026-04-21
sources:
  - prompts/0420/_extracted/03-enhancement-answers.md W-03
  - prompts/0420/00-decisions-part3b-tauri-visual-recovery.md 域 S
  - prompts/0420/_extracted/01-L1-answers.md L1-11 L1-23
related-specs:
  - 13-workstation-layout-spec.md
  - 14-statusbar-navigation-spec.md
  - 18-tauri-desktop-spec.md
  - 26-multi-account-profile-spec.md
-->

---

## 1. 范围与目标

本 Spec 定义 InkForge v2.1 的布局状态持久化系统：将用户的工作区布局偏好保存到 IndexedDB，在应用启动时还原，并在跨设备同步中明确排除。

**管辖范围**：

| 持久化内容 | 说明 |
|-----------|------|
| Sidebar 宽度与折叠状态 | `--sidebar-width`、`sidebarOpen` |
| RightPanel 宽度与折叠状态 | `--right-panel-width`、`rightPanelOpen` |
| Sidebar 当前 Tab | `sidebarTab` |
| RightPanel 模式 | `rightPanelMode` |
| 编辑模式布局快照 | `modeLayouts` |
| 当前活跃文档 | `activeArticleId` |
| Tab 列表与顺序 | `openTabs`、`tabOrder` |
| Zoom 级别 | `zoom.level` |
| StatusBar 可见性 | `statusBarVisible` |
| 窗口大小/位置 | 由 Tauri plugin-window-state 管理 |
| 布局版本 | `layoutVersion`（结构变更时迁移用）|

**明确不持久化**：
- 跨设备同步（布局是本地 UI 偏好，不随文档同步）
- 每个窗口独立持久化（多窗口场景下，每个窗口 ID 对应独立记录）

---

## 2. 决策溯源

| 决策 | 内容 | 来源 |
|------|------|------|
| W-03 C | 布局随编辑模式（Typora/Source/Preview）各自记忆 | W-03 |
| N-01 C | StatusBar 可见性持久化 | N-01 |
| L1-23 D | 每个账户对应独立数据库 + 文件根；布局按 profileId 隔离 | L1-23 |
| L1-24 D | 多窗口并行；每个窗口独立布局状态 | L1-24 |
| L1-11 C | 模式切换时状态全继承（布局快照） | L1-11 |

---

## 3. 数据模型

### 3.1 IndexedDB Schema

```typescript
// src/db/schema.ts — layout_state 表

interface LayoutStateRecord {
  id: string               // 复合 key：`${profileId}:${windowId}`
  profileId: string
  windowId: string
  layoutVersion: number    // 当前版本号，用于 migration

  // Sidebar
  sidebarOpen: boolean
  sidebarWidth: number     // px
  sidebarTab: SidebarTabId

  // RightPanel
  rightPanelOpen: boolean
  rightPanelWidth: number  // px
  rightPanelMode: RightPanelMode

  // 编辑模式布局快照（W-03 C）
  modeLayouts: {
    typora: PerModeLayout
    source: PerModeLayout
    preview: PerModeLayout
  }

  // Tab 状态
  openTabs: SerializedTab[]
  tabOrder: string[]       // Tab ID 排列顺序
  activeTabId: string | null

  // StatusBar
  statusBarVisible: boolean
  statusBarFieldVisibility: StatusBarFieldVisibility

  // 缩放
  zoomLevel: number        // 0.5 ~ 2.0

  // 时间戳
  savedAt: number
}

interface SerializedTab {
  id: string
  articleId: string
  title: string
  isPinned: boolean
  // 注意：isDirty 不持久化（重启后默认 false）
}

interface PerModeLayout {
  sidebarOpen: boolean
  rightPanelOpen: boolean
  rightPanelMode: RightPanelMode
}
```

### 3.2 当前布局版本

```typescript
export const LAYOUT_STATE_VERSION = 1
```

每次修改 `LayoutStateRecord` 的结构时，`LAYOUT_STATE_VERSION` 必须递增，并在 `layoutMigration.ts` 中注册对应的迁移函数。

---

## 4. LayoutPersistenceService

```typescript
// src/services/layout-persistence/index.ts

import { db } from '@/db'
import { WINDOW_ID } from '@/platform/window'
import { LAYOUT_STATE_VERSION, migrateLayout } from './migration'
import type { LayoutStateRecord } from '@/db/schema'

export class LayoutPersistenceService {
  private profileId: string = ''
  private windowId: string = WINDOW_ID
  private _saveTimer: ReturnType<typeof setTimeout> | null = null

  async initialize(profileId: string): Promise<LayoutStateRecord | null> {
    this.profileId = profileId
    const record = await this._load()
    if (record) {
      // 检查是否需要 migration
      if (record.layoutVersion < LAYOUT_STATE_VERSION) {
        const migrated = await migrateLayout(record)
        await this._saveRaw(migrated)
        return migrated
      }
    }
    return record
  }

  /**
   * 防抖保存（resize 结束后触发）
   * debounce 500ms
   */
  scheduleSave(state: Partial<LayoutStateRecord>): void {
    if (this._saveTimer) clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => {
      void this.save(state)
      this._saveTimer = null
    }, 500)
  }

  /**
   * 立即保存（折叠切换、Tab 切换时触发）
   */
  async save(state: Partial<LayoutStateRecord>): Promise<void> {
    const existing = await this._load()
    const record: LayoutStateRecord = {
      ...this._defaultState(),
      ...existing,
      ...state,
      id: this._key(),
      profileId: this.profileId,
      windowId: this.windowId,
      layoutVersion: LAYOUT_STATE_VERSION,
      savedAt: Date.now(),
    }
    await this._saveRaw(record)
  }

  async load(): Promise<LayoutStateRecord | null> {
    return this._load()
  }

  async clear(): Promise<void> {
    await db.table('layout_state').delete(this._key())
  }

  private async _load(): Promise<LayoutStateRecord | null> {
    return db.table('layout_state').get(this._key()) ?? null
  }

  private async _saveRaw(record: LayoutStateRecord): Promise<void> {
    await db.table('layout_state').put(record, this._key())
  }

  private _key(): string {
    return `${this.profileId}:${this.windowId}`
  }

  private _defaultState(): Omit<LayoutStateRecord, 'id' | 'profileId' | 'windowId' | 'layoutVersion' | 'savedAt'> {
    return {
      sidebarOpen: true,
      sidebarWidth: 240,
      sidebarTab: 'file-tree',
      rightPanelOpen: false,
      rightPanelWidth: 280,
      rightPanelMode: 'preview',
      modeLayouts: {
        typora: { sidebarOpen: true, rightPanelOpen: false, rightPanelMode: 'preview' },
        source: { sidebarOpen: true, rightPanelOpen: false, rightPanelMode: 'preview' },
        preview: { sidebarOpen: false, rightPanelOpen: true, rightPanelMode: 'preview' },
      },
      openTabs: [],
      tabOrder: [],
      activeTabId: null,
      statusBarVisible: true,
      statusBarFieldVisibility: {
        chineseWordCount: true,
        englishWordCount: true,
        paragraphCount: true,
        readingTime: true,
        zoomControl: true,
        notificationBell: true,
      },
      zoomLevel: 1.0,
    }
  }
}

export const layoutPersistence = new LayoutPersistenceService()
```

---

## 5. 写入时机

### 5.1 分类写入策略

| 事件 | 写入方式 | 延迟 |
|------|---------|------|
| Sidebar ResizeHandle 拖拽结束 | `scheduleSave` | 500ms debounce |
| RightPanel ResizeHandle 拖拽结束 | `scheduleSave` | 500ms debounce |
| Sidebar 折叠/展开 | `save`（立即）| 无延迟 |
| RightPanel 折叠/展开 | `save`（立即）| 无延迟 |
| Sidebar Tab 切换 | `save`（立即）| 无延迟 |
| RightPanel 模式切换 | `save`（立即）| 无延迟 |
| 编辑模式切换（Typora/Source/Preview）| `save`（立即）| 无延迟 |
| Tab 打开/关闭/排序 | `scheduleSave` | 500ms debounce |
| 激活 Tab 变化 | `scheduleSave` | 500ms debounce |
| Zoom 级别变化 | `scheduleSave` | 500ms debounce |
| StatusBar 可见性切换 | `save`（立即）| 无延迟 |
| 响应式自动折叠 | **不写入** | - |

### 5.2 Store Watcher 集成

在 `useWorkstationStore` 中集成写入钩子：

```typescript
// src/stores/workstation.ts
import { layoutPersistence } from '@/services/layout-persistence'

export const useWorkstationStore = defineStore('workstation', {
  // ... state 定义

  actions: {
    setSidebarWidth(width: number) {
      // ... clamp 逻辑
      this.sidebarWidth = width
      document.documentElement.style.setProperty('--sidebar-width', `${width}px`)
      // debounce 保存（拖拽期间多次触发，只保存最终值）
      layoutPersistence.scheduleSave({ sidebarWidth: width })
    },

    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
      // 立即保存（状态改变有意义）
      void layoutPersistence.save({ sidebarOpen: this.sidebarOpen })
    },

    setSidebarTab(tab: SidebarTabId) {
      if (!this.sidebarOpen) this.sidebarOpen = true
      this.sidebarTab = tab
      void layoutPersistence.save({
        sidebarOpen: this.sidebarOpen,
        sidebarTab: tab,
      })
    },

    setRightPanelWidth(width: number) {
      // ... clamp 逻辑
      this.rightPanelWidth = width
      document.documentElement.style.setProperty('--right-panel-width', `${width}px`)
      layoutPersistence.scheduleSave({ rightPanelWidth: width })
    },

    toggleRightPanel() {
      this.rightPanelOpen = !this.rightPanelOpen
      void layoutPersistence.save({ rightPanelOpen: this.rightPanelOpen })
    },

    setRightPanelMode(mode: RightPanelMode) {
      this.rightPanelMode = mode
      if (!this.rightPanelOpen) this.rightPanelOpen = true
      void layoutPersistence.save({
        rightPanelOpen: this.rightPanelOpen,
        rightPanelMode: mode,
      })
    },

    onEditorModeChange(newMode: 'typora' | 'source' | 'preview', oldMode: 'typora' | 'source' | 'preview') {
      // 保存旧模式快照
      this.modeLayouts[oldMode] = {
        sidebarOpen: this.sidebarOpen,
        rightPanelOpen: this.rightPanelOpen,
        rightPanelMode: this.rightPanelMode,
      }
      // 还原新模式快照
      const snapshot = this.modeLayouts[newMode]
      this.sidebarOpen = snapshot.sidebarOpen
      this.rightPanelOpen = snapshot.rightPanelOpen
      this.rightPanelMode = snapshot.rightPanelMode

      // 立即保存模式布局快照
      void layoutPersistence.save({ modeLayouts: { ...this.modeLayouts } })
    },

    openTab(tab: WorkspaceTab) {
      // ... 打开 Tab 逻辑
      // debounce 保存 Tab 列表
      layoutPersistence.scheduleSave({
        openTabs: this._serializeTabs(),
        tabOrder: this.tabOrder,
        activeTabId: this.activeTabId,
      })
    },

    closeTab(tabId: string) {
      // ... 关闭 Tab 逻辑
      layoutPersistence.scheduleSave({
        openTabs: this._serializeTabs(),
        tabOrder: this.tabOrder,
        activeTabId: this.activeTabId,
      })
    },

    _serializeTabs(): SerializedTab[] {
      return this.tabs.map(t => ({
        id: t.id,
        articleId: t.articleId,
        title: t.title,
        isPinned: t.isPinned,
      }))
    },
  },
})
```

---

## 6. 读取时机（应用启动）

```typescript
// src/main.ts 或 App.vue setup()

async function initializeLayout(profileId: string): Promise<void> {
  await layoutPersistence.initialize(profileId)
  const saved = await layoutPersistence.load()

  const workstationStore = useWorkstationStore()
  const statusBarStore = useStatusBarStore()

  if (!saved) {
    // 无保存状态：使用默认值（Store 初始化时已设置）
    return
  }

  // 还原 Sidebar
  workstationStore.sidebarOpen = saved.sidebarOpen
  workstationStore.sidebarWidth = saved.sidebarWidth
  workstationStore.sidebarTab = saved.sidebarTab
  document.documentElement.style.setProperty('--sidebar-width', `${saved.sidebarWidth}px`)

  // 还原 RightPanel
  workstationStore.rightPanelOpen = saved.rightPanelOpen
  workstationStore.rightPanelWidth = saved.rightPanelWidth
  workstationStore.rightPanelMode = saved.rightPanelMode
  document.documentElement.style.setProperty('--right-panel-width', `${saved.rightPanelWidth}px`)

  // 还原编辑模式布局快照
  workstationStore.modeLayouts = saved.modeLayouts

  // 还原 Tab 列表
  if (saved.openTabs.length > 0) {
    // 验证 Tab 对应的文章是否仍然存在
    const validTabs = await validateTabs(saved.openTabs)
    for (const tab of validTabs) {
      workstationStore.tabs.push({
        ...tab,
        isDirty: false,  // 重启后默认 clean
        windowId: WINDOW_ID,
        previewUrl: undefined,
      })
    }
    workstationStore.tabOrder = saved.tabOrder.filter(id =>
      validTabs.some(t => t.id === id)
    )
    workstationStore.activeTabId = saved.activeTabId &&
      validTabs.some(t => t.id === saved.activeTabId)
      ? saved.activeTabId
      : validTabs[0]?.id ?? null
  }

  // 还原 StatusBar
  statusBarStore.visible = saved.statusBarVisible
  statusBarStore.fieldVisibility = saved.statusBarFieldVisibility

  // 还原 Zoom
  statusBarStore.zoom.level = saved.zoomLevel
  document.documentElement.style.setProperty('--editor-zoom-level', String(saved.zoomLevel))
}

/** 验证 Tab 对应的文章仍然存在 */
async function validateTabs(tabs: SerializedTab[]): Promise<SerializedTab[]> {
  const valid: SerializedTab[] = []
  for (const tab of tabs) {
    const exists = await articleRepository.exists(tab.articleId)
    if (exists) valid.push(tab)
  }
  return valid
}
```

---

## 7. 版本迁移

### 7.1 迁移框架

```typescript
// src/services/layout-persistence/migration.ts

type MigrationFn = (record: LayoutStateRecord) => LayoutStateRecord

const migrations: Record<number, MigrationFn> = {
  // 从 version 0 迁移到 version 1
  1: (record) => ({
    ...record,
    // 添加 modeLayouts 字段（v0 无此字段）
    modeLayouts: record.modeLayouts ?? {
      typora: { sidebarOpen: true, rightPanelOpen: false, rightPanelMode: 'preview' as RightPanelMode },
      source: { sidebarOpen: true, rightPanelOpen: false, rightPanelMode: 'preview' as RightPanelMode },
      preview: { sidebarOpen: false, rightPanelOpen: true, rightPanelMode: 'preview' as RightPanelMode },
    },
    // 添加 statusBarFieldVisibility（v0 无此字段）
    statusBarFieldVisibility: record.statusBarFieldVisibility ?? {
      chineseWordCount: true,
      englishWordCount: true,
      paragraphCount: true,
      readingTime: true,
      zoomControl: true,
      notificationBell: true,
    },
    layoutVersion: 1,
  }),
}

export async function migrateLayout(record: LayoutStateRecord): Promise<LayoutStateRecord> {
  let current = { ...record }
  const fromVersion = current.layoutVersion ?? 0
  const toVersion = LAYOUT_STATE_VERSION

  for (let v = fromVersion + 1; v <= toVersion; v++) {
    const migrationFn = migrations[v]
    if (migrationFn) {
      try {
        current = migrationFn(current)
      } catch (err) {
        console.error(`[LayoutMigration] Migration to v${v} failed:`, err)
        // 迁移失败：使用默认值，不抛错（宁可重置不崩溃）
        return getDefaultLayoutState(record.profileId, record.windowId)
      }
    }
  }

  return current
}

function getDefaultLayoutState(profileId: string, windowId: string): LayoutStateRecord {
  return {
    id: `${profileId}:${windowId}`,
    profileId,
    windowId,
    layoutVersion: LAYOUT_STATE_VERSION,
    sidebarOpen: true,
    sidebarWidth: 240,
    sidebarTab: 'file-tree',
    rightPanelOpen: false,
    rightPanelWidth: 280,
    rightPanelMode: 'preview',
    modeLayouts: {
      typora: { sidebarOpen: true, rightPanelOpen: false, rightPanelMode: 'preview' },
      source: { sidebarOpen: true, rightPanelOpen: false, rightPanelMode: 'preview' },
      preview: { sidebarOpen: false, rightPanelOpen: true, rightPanelMode: 'preview' },
    },
    openTabs: [],
    tabOrder: [],
    activeTabId: null,
    statusBarVisible: true,
    statusBarFieldVisibility: {
      chineseWordCount: true,
      englishWordCount: true,
      paragraphCount: true,
      readingTime: true,
      zoomControl: true,
      notificationBell: true,
    },
    zoomLevel: 1.0,
    savedAt: Date.now(),
  }
}
```

---

## 8. 跨设备同步排除

布局状态**不随文档同步**（WebDAV/Git/自有服务），原因：

1. 布局是设备本地的 UI 偏好（不同设备屏幕尺寸可能不同）
2. 避免同步冲突（两台设备同时修改布局会产生无意义的冲突）
3. 减少同步数据量

在同步 Provider 的实现中，`layout_state` 表被明确排除在同步范围之外：

```typescript
// src/services/sync/provider-base.ts
export const SYNC_EXCLUDED_TABLES = [
  'layout_state',     // 布局状态：本地专属
  'session_data',     // 会话数据：本地专属
] as const
```

---

## 9. 多窗口隔离

每个窗口拥有独立的 `LayoutStateRecord`，key 为 `{profileId}:{windowId}`。

窗口关闭时，其布局状态**保留**（下次同一 Profile 打开新窗口时不会自动恢复该特定布局，因为 windowId 是动态生成的）。

清理策略：
- 布局记录超过 30 天未访问（`savedAt` 超期）时，在下次同一 Profile 启动时后台清理
- 用户在 Settings > Storage > 清理数据 中可手动清理旧窗口布局记录

```typescript
// 定期清理过期布局记录（>30 天）
export async function cleanupStaleLayouts(profileId: string): Promise<number> {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const all = await db.table('layout_state')
    .where('profileId').equals(profileId)
    .toArray()

  const stale = all.filter(r => r.savedAt < cutoff && r.windowId !== WINDOW_ID)
  for (const record of stale) {
    await db.table('layout_state').delete(record.id)
  }
  return stale.length
}
```

---

## 10. 文件结构

```
src/
  services/
    layout-persistence/
      index.ts              # LayoutPersistenceService（主服务）
      migration.ts          # 版本迁移框架 + 迁移函数
  db/
    schema.ts               # layout_state 表定义（含此 spec 新增字段）
  types/
    layout.ts               # LayoutStateRecord / SerializedTab 类型
```

---

## 11. 测试矩阵

### 11.1 基础读写

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| P-001 | save() 写入 IndexedDB | `db.layout_state.get(key)` 返回记录 | Unit |
| P-002 | load() 读取 IndexedDB | 返回与写入一致的记录 | Unit |
| P-003 | 首次 load()（无记录）返回 null | `load()` 返回 null | Unit |
| P-004 | clear() 删除记录 | 后续 load() 返回 null | Unit |
| P-005 | key 格式为 `{profileId}:{windowId}` | key 字符串格式正确 | Unit |

### 11.2 写入时机

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| T-001 | 拖拽 ResizeHandle：500ms debounce 后保存 | 拖拽过程中 save 未被立即调用 | Unit |
| T-002 | 折叠 Sidebar：立即调用 save | save 调用时间 < 50ms | Unit |
| T-003 | 响应式自动折叠：不触发 save | save 未被调用 | Unit |
| T-004 | Tab 切换：500ms debounce 后保存 | debounce 行为正确 | Unit |
| T-005 | StatusBar 隐藏：立即保存 | save 调用时间 < 50ms | Unit |
| T-006 | 编辑模式切换：立即保存 modeLayouts | modeLayouts 字段更新 | Unit |

### 11.3 启动恢复

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| R-001 | 启动时读取并还原 sidebarOpen=false | Sidebar 折叠 | E2E |
| R-002 | 启动时还原 sidebarWidth=320 | CSS 变量 320px | E2E |
| R-003 | 启动时还原 rightPanelMode='reference' | rightPanelMode 正确 | E2E |
| R-004 | 启动时还原已打开的 Tab 列表 | tabs 数组有记录 | E2E |
| R-005 | 启动时跳过已删除文章的 Tab | validateTabs 过滤生效 | Unit |
| R-006 | 启动时还原 activeTabId | 正确 Tab 被激活 | E2E |
| R-007 | 启动时还原 Zoom 级别 | CSS 变量 `--editor-zoom-level` 正确 | E2E |
| R-008 | 启动时还原 StatusBar 可见性=false | StatusBar 不显示 | E2E |
| R-009 | 无保存记录时使用默认值 | Store 状态为默认值 | Unit |

### 11.4 版本迁移

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| M-001 | v0 记录读取时执行迁移到 v1 | `layoutVersion = 1` | Unit |
| M-002 | 迁移后 modeLayouts 字段存在 | `modeLayouts` 非 undefined | Unit |
| M-003 | 迁移失败时回退到默认值（不抛错）| 返回 defaultState | Unit |
| M-004 | 已是最新版本的记录不执行迁移 | 迁移函数未被调用 | Unit |

### 11.5 多账户 / 多窗口

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| A-001 | 不同 profileId 保存互不干扰 | 各自 key 独立 | Unit |
| A-002 | 切换 Profile 后重新初始化读取新 Profile 布局 | initialize(newProfileId) 加载正确记录 | Unit |
| A-003 | 不同 windowId 保存互不干扰 | `profile1:windowA` 和 `profile1:windowB` 独立 | Unit |
| A-004 | 过期布局记录（>30天）被 cleanupStaleLayouts 清理 | 旧记录不存在 | Unit |

### 11.6 跨设备同步排除

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| S-001 | `layout_state` 表不在同步范围内 | SYNC_EXCLUDED_TABLES 包含 'layout_state' | Unit |
| S-002 | 同步 Provider 不读写 layout_state 表 | Provider 实现中无 layout_state 操作 | Unit |

## 2026-05-02 Baseline Implementation Note

Baseline status: Pass for the compatible local-first Layout Persistence baseline; full Spec 34 remains partially pending for native window geometry and richer tab/session UI coverage.

Implemented baseline coverage:

- Dexie schema v16 adds `layoutStates` additively without removing or reshaping existing stores.
- `src/services/layout-persistence/*` implements profile/window-scoped layout keys, strict Zod validation, default state creation, migration, debounced saves, stale cleanup, invalid tab filtering, and sync-excluded table declaration.
- `useLayoutPersistenceStore` exposes real async initialize/load/save/clear/cleanup/flush state with loading, saving, error, and last-action tracking.
- `WorkstationView.vue` now keeps the existing localStorage fallbacks while also restoring and saving manager/stage/inspector collapsed state, manager tab, editor mode, editor width, panel widths, active article id, and per-mode layouts through IndexedDB.
- Spec terms `sidebar/rightPanel` are mapped to the current Workstation vocabulary: `manager`, `stage`, `inspector`, and `rightPanelMode: 'inspector'`. This preserves the existing UI architecture and avoids a broad layout refactor.
- Layout data is local-only and intentionally excluded from sync payloads via `SYNC_EXCLUDED_LAYOUT_TABLES = ['layoutStates']`.

Validation evidence:

- `pnpm exec vitest run src/services/layout-persistence/layout-persistence.test.ts` passed with 8 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm exec vitest run` passed with 15 files and 102 tests.
- `pnpm build` passed; only existing Vite dynamic/static import and chunk-size warnings remained.
- Browser smoke on `http://127.0.0.1:5183/settings?tab=about` verified real IndexedDB v16, `layoutStates` existence, save/load persistence, width clamp, profile/window isolation, persisted legacy migration, stale cleanup, tab validation, sync exclusion, cleanup of smoke rows, and zero console errors.
- The dev server was stopped after smoke; ports 5183 and 5184 were verified closed.

Pending for full Spec 34 pass:

- Tauri native outer-window geometry persistence and multi-monitor restore rules.
- Full drag-resize E2E with real pointer events and restart restore assertions.
- Dedicated UI for clearing layout state from Settings or a troubleshooting panel.
- Rich tab/session restoration once Workstation has first-class persisted editor tab objects.
- Cross-window desktop E2E that proves simultaneous windows do not overwrite each other.
