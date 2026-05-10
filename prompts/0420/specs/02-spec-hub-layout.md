---
Spec 编号: 02-spec-hub-layout
Spec 名称: Hub 首页布局与组件工程规范 (Spec)
Task 归属: T02 Hub 首页
版本: v2.1.0
创建日期: 2026-04-21
Author: InkForge Spec 工程组
状态: Approved
权威来源: 02-prd-hub.md + prompts/0420/00-decisions-part3a-lifecycle-writing-hub.md (U-01 ~ U-22)
对应 PRD: 02-prd-hub.md
关联 Spec: 08-data-insights-spec.md, 20-theme-font-typography-spec.md, 27-performance-slo-spec.md
---

# InkForge v2.1 — Hub 首页布局与组件工程规范

> 本 Spec 把 PRD (`02-prd-hub.md`) 的产品契约翻译成工程层面的目录结构、组件 API、Store、路由、样式、动效、测试矩阵等可直接实施的规范。

> 2026-04-22 Wave 1 当前代码真相补注：
> `HubView.vue` 当前仍主要消费 `Article` 层快照做摘要、字数、排序与目标卡统计；但自本轮起，`stores/editor.ts` 会在正文成功持久化后同步更新 `article.rawContent/title`，因此 Workstation 已保存内容现已能真实回流到 Hub 首页，不再停留在旧摘要或 `0 字 / 0%`。

## 目录

- 第一章 范围与非范围
- 第二章 目录结构与文件清单
- 第三章 路由与视图契约
- 第四章 布局栅格与响应式断点
- 第五章 Store 结构（Pinia）
- 第六章 数据源与 Repo 契约
- 第七章 组件 API 规范（按层级）
- 第八章 懒加载与代码分割
- 第九章 动效规范
- 第十章 可见性规则（空态 / 铁三角 / 断点）
- 第十一章 快捷操作与命令绑定
- 第十二章 每日引语服务
- 第十三章 FTUE 引导气泡
- 第十四章 主题适配
- 第十五章 i18n 规范
- 第十六章 无障碍（Baseline A11y）
- 第十七章 测试矩阵
- 第十八章 埋点与性能采集
- 第十九章 代码风格与类型契约
- 第二十章 变更管理与回滚策略
- 附录 A 组件组合关系图
- 附录 B 字符串资源清单
- 附录 C CSS Variable 清单
- 附录 D 错误码与日志示例

---

## 第一章 范围与非范围

### 1.1 在范围（In Scope）

本 Spec 覆盖以下工程实现内容：

1. Hub 页面路由与视图组件（HubView / HubPage）。
2. Hub 内全部布局组件（HeroSection / QuickActions / RecentDocs / PinnedDocs / TodoPanel / InsightsCard / DailyQuote / FTUEBubble / Sidebar / SectionNav / QuickActionFab）。
3. Hub 内部 Store（useHubStore）与周边 Store（articles / metrics / drafts / assets / categories / insights / ftue / quotes / updater）的契约。
4. Hub 使用的 Composable（useElementSize / useLazy / useReducedMotion / useShortcut 等）。
5. Hub 懒加载策略（IntersectionObserver / dynamic import）。
6. 动效规范、主题适配、i18n 规范、无障碍基线。
7. 测试矩阵（Vitest 单测 + Playwright E2E）。

### 1.2 不在范围（Out of Scope）

- Workstation 编辑器内部实现（见 `01-editor-ui-spec.md` 与 `05-toolbar-complete-spec.md`）。
- Data Insights 图表实现细节（见 `08-data-insights-spec.md`）。
- Settings 页面实现（见 `07-settings-full-spec.md`）。
- FileManager 的完整实现（独立 Spec）。
- 账户认证与切换（见 `06-account-auth-spec.md`）。
- Tauri 多窗口 / 文件监控（独立 Spec）。

### 1.3 核心不变量

| 不变量 | 来源 | 验证方式 |
|---|---|---|
| Hub 入口预算 = 3 | T02-13 C / PRD R-M | 单测扫描 Hub DOM 中的 `data-entry="new"` |
| 铁三角全断点可见 | U-11 | E2E 覆盖 4 个断点 |
| FAB 展开动画 ≤ 200ms | SLO-08 | Playwright 采时 |
| 空态走文字占位 | T09-11 A | 快照测试 |
| 无轮询 / 无手动 refresh | U-08 | 代码扫描（禁词：`setInterval` in Hub） |
| 无 emoji 图标 | 视觉规范 | ESLint 自定义规则 + 代码审查 |
| 响应式刷新 ≤ 100ms | SLO-04 | 性能埋点 |

---

## 第二章 目录结构与文件清单

### 2.1 顶层目录

```
src/
├── views/
│   └── hub/
│       ├── HubPage.vue             # 根视图，与路由 /hub 对应
│       ├── HubEmptyState.vue       # 空态 Hub 包装层
│       └── HubErrorBoundary.vue    # Hub 错误边界容器
├── components/
│   └── hub/
│       ├── HeroSection.vue          # 铁三角 #1（Hero）
│       ├── HeroChart.vue            # Hero 内嵌图表
│       ├── ContinueWritingButton.vue
│       ├── QuickActions.vue         # QuickActionFab 内容
│       ├── QuickActionFab.vue       # 右下角 FAB 壳
│       ├── RecentDocs.vue           # 铁三角 #2
│       ├── RecentDocItem.vue        # Recent 单项
│       ├── StatsPreviewCard.vue     # 铁三角 #3
│       ├── PinnedDocs.vue           # 收藏卡片
│       ├── TodoPanel.vue            # 未完成文档面板
│       ├── InsightsCard.vue         # Data Insights 预览
│       ├── DailyQuote.vue           # 每日引语
│       ├── InspirationFavorite.vue  # 引言收藏子控件
│       ├── FTUEBubble.vue           # 首次引导气泡
│       ├── Sidebar.vue              # 左侧边栏
│       ├── SectionNav.vue           # 右侧圆点导航
│       ├── TemplateMarketCard.vue   # Section 2 — 模板
│       ├── DraftBoxCard.vue         # Section 2 — 草稿
│       ├── AssetManagerCard.vue     # Section 2 — 素材
│       ├── CategoriesCard.vue       # 分类卡
│       ├── HeaderAvatarMenu.vue     # 头像菜单
│       ├── RecycleBinEntry.vue      # 回收站入口
│       └── UpdateLogCard.vue        # 更新日志卡
├── stores/
│   ├── hub.ts                       # useHubStore
│   ├── articles.ts                  # 已存在，扩展 getters
│   ├── metrics.ts
│   ├── drafts.ts
│   ├── assets.ts
│   ├── categories.ts
│   ├── insights.ts
│   ├── inspiration.ts
│   ├── ftue.ts
│   └── updater.ts
├── composables/
│   ├── useHubSession.ts
│   ├── useDynamicListSize.ts
│   ├── useLazyCard.ts
│   ├── useReducedMotion.ts
│   ├── useShortcut.ts
│   └── useHubTelemetry.ts
├── services/
│   └── hub/
│       ├── select-continue-target.ts
│       ├── recent-docs-selector.ts
│       ├── ftue-registry.ts
│       ├── quotes-service.ts
│       ├── extract-user-quotes.ts
│       └── hub-telemetry.ts
├── data/
│   ├── quotes.ts                    # 硬编码引言池
│   └── hub-card-registry.ts         # 卡片元数据登记
├── i18n/
│   ├── zh-CN/hub.ts
│   └── en-US/hub.ts
└── router/
    └── index.ts                     # 注册 /hub 路由
```

### 2.2 测试目录

```
tests/
├── unit/
│   └── hub/
│       ├── select-continue-target.spec.ts
│       ├── recent-docs-selector.spec.ts
│       ├── useDynamicListSize.spec.ts
│       ├── quotes-service.spec.ts
│       └── hub-store.spec.ts
└── e2e/
    └── hub/
        ├── first-run.spec.ts
        ├── empty-state.spec.ts
        ├── continue-writing.spec.ts
        ├── fab.spec.ts
        ├── recent-docs.spec.ts
        ├── categories-expand.spec.ts
        ├── ftue-bubble.spec.ts
        ├── theme-switch.spec.ts
        ├── i18n-switch.spec.ts
        ├── responsive-breakpoints.spec.ts
        ├── sidebar-toggle.spec.ts
        └── perf-fcp.spec.ts
```

### 2.3 文件职责一览

| 文件 | 职责 | 行数预期 |
|---|---|---|
| HubPage.vue | 组合根 | ~300 |
| HubEmptyState.vue | 空态包装 | ~150 |
| HeroSection.vue | Hero 区域主体 | ~400 |
| HeroChart.vue | 图表渲染 | ~200 |
| ContinueWritingButton.vue | 继续创作按钮 | ~120 |
| QuickActions.vue | FAB 菜单项 | ~180 |
| QuickActionFab.vue | FAB 壳 + 动画 | ~200 |
| RecentDocs.vue | 最近文章动态列表 | ~250 |
| StatsPreviewCard.vue | 统计预览 | ~180 |
| PinnedDocs.vue | 收藏卡片 | ~150 |
| TodoPanel.vue | 未完成面板 | ~200 |
| InsightsCard.vue | 洞察预览 | ~180 |
| DailyQuote.vue | 每日引语 | ~150 |
| FTUEBubble.vue | 首次引导气泡 | ~180 |
| Sidebar.vue | 左侧边栏 | ~250 |
| SectionNav.vue | 圆点导航 | ~120 |
| TemplateMarketCard.vue | 模板卡 | ~200 |
| DraftBoxCard.vue | 草稿卡 | ~180 |
| AssetManagerCard.vue | 素材卡 | ~180 |
| CategoriesCard.vue | 分类卡 | ~220 |
| HeaderAvatarMenu.vue | 头像菜单 | ~200 |
| RecycleBinEntry.vue | 回收站入口 | ~100 |
| UpdateLogCard.vue | 更新日志 | ~150 |
| useHubStore | Hub 本地状态 | ~300 |

---

## 第三章 路由与视图契约

### 3.1 路由定义

```ts
// src/router/index.ts
{
  path: '/hub',
  name: 'Hub',
  component: () => import('@/views/hub/HubPage.vue'),
  meta: {
    requiresProfile: true,     // 若无 Profile 重定向到 FirstRunDispatcher
    requiresUnlocked: true,    // 若 Profile 锁定走 PIN 校验
    transition: 'fade',        // 从 Settings 回 Hub 走 fade
  },
},
{
  path: '/workstation/:id',
  name: 'Workstation',
  component: () => import('@/views/workstation/WorkstationView.vue'),
  meta: {
    transition: 'slide-left',  // Hub → Workstation
  },
},
```

### 3.2 路由守卫

```ts
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresProfile) {
    const auth = useAuthStore()
    if (!auth.currentProfile) {
      return next({ name: 'FirstRunDispatcher' })
    }
    if (auth.isLocked) {
      return next({ name: 'ProfileUnlock', query: { from: to.fullPath } })
    }
  }
  next()
})
```

### 3.3 HubPage 生命周期

`HubPage.vue` 的加载顺序（硬性序列）：

1. `onBeforeMount` → 初始化 `useHubStore().bootstrap()`
2. 并行订阅各 Store（articles / metrics / drafts 等）
3. `onMounted` → 测量 FCP / TTI 埋点
4. `onMounted` → 触发 FTUE 气泡调度（延迟 2000ms）
5. `onBeforeUnmount` → 清理 FTUE timer / ResizeObserver / 埋点

### 3.4 视图过渡

Hub ↔ Workstation 过渡通过路由 `meta.transition` 驱动，在 `<router-view>` 外层使用 `<Transition>`：

```html
<router-view v-slot="{ Component, route }">
  <Transition :name="route.meta.transition || 'fade'" mode="out-in">
    <component :is="Component" />
  </Transition>
</router-view>
```

CSS：

```css
.slide-left-enter-active, .slide-left-leave-active { transition: transform 240ms cubic-bezier(0.4, 0, 0.2, 1); }
.slide-left-enter-from { transform: translateX(8%); opacity: 0; }
.slide-left-leave-to   { transform: translateX(-8%); opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 200ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
```

`prefers-reduced-motion: reduce` 下动画缩短为 0ms。

---

## 第四章 布局栅格与响应式断点

### 4.1 Bento Grid 定义

Hub 主 Grid 采用 12 列栅格 + `auto` 行高：

```css
.hub-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-rows: auto;
  gap: 20px;
  padding: 32px;
  scroll-snap-type: y mandatory;
}
.hub-section {
  grid-column: span 12;
  scroll-snap-align: start;
  display: grid;
  grid-template-columns: subgrid;
  gap: 20px;
}
```

### 4.2 卡片列宽契约

| 卡片 | ≥1440 | ≥1024 | ≥768 | <768 |
|---|---|---|---|---|
| HeroSection | span 8 | span 12 | span 12 | span 12 |
| StatsPreviewCard | span 4 | span 12 | span 12 | span 12 |
| RecentDocsCard | span 6 | span 6 | span 12 | span 12 |
| TemplateMarketCard | span 4 | span 4 | span 6 | span 12 |
| DraftBoxCard | span 4 | span 4 | span 6 | span 12 |
| AssetManagerCard | span 4 | span 4 | span 12 | span 12 |
| CategoriesCard | span 6 | span 6 | span 12 | span 12 |
| PinnedDocsCard | span 3 | span 4 | span 6 | 折叠 |
| TodoPanel | span 3 | span 4 | span 6 | 折叠 |
| InspirationCard | span 3 | span 4 | span 6 | span 12 |
| InsightsCard | span 6 | span 6 | span 12 | 隐藏 |
| UpdateLogCard | span 6 | span 6 | span 12 | 隐藏 |

### 4.3 响应式断点

```ts
// tailwind.config 与 composable 统一
export const HUB_BREAKPOINTS = {
  xl: 1920,
  lg: 1440,
  md: 1024,
  sm: 768,
} as const
```

- `xl` 保留扩展点；v2.1 不做 5 列。
- 断点精确值由决策 U-02 锁定，不允许随意调整。

### 4.4 Sidebar 占用

- 展开时 Sidebar 宽度 240px，主 Grid `padding-left: 256px`。
- 折叠时 Sidebar 宽度 56px，主 Grid `padding-left: 72px`。
- `<1024px` 默认折叠。

### 4.5 Section 结构

Hub 主内容由 4 个 Section 串联，每个 Section 独立 `scroll-snap-align: start`：

```
Section 1  铁三角 (Hero / StatsPreview / RecentDocs)
Section 2  创作工具 (Template / Draft / Asset)
Section 3  聚合信息 (Categories / Pinned / Todo / Inspiration)
Section 4  数据洞察 (InsightsCards × 2-3 + UpdateLog)
```

---

## 第五章 Store 结构（Pinia）

### 5.1 useHubStore

```ts
// src/stores/hub.ts
import { defineStore } from 'pinia'

export interface HubCardState {
  collapsed: boolean
  priority: 1 | 2 | 3 | 4
  lastInteractedAt: number | null
}

export interface HubState {
  sidebarCollapsed: boolean
  sectionFocus: 'section-1' | 'section-2' | 'section-3' | 'section-4'
  cards: Record<string, HubCardState>
  ftue: {
    seen: Record<string, boolean>
    disabled: boolean
  }
  telemetry: {
    lastOpenedAt: number
    opensInSession: number
  }
}

export const useHubStore = defineStore('hub', {
  state: (): HubState => ({
    sidebarCollapsed: window.innerWidth < 1024,
    sectionFocus: 'section-1',
    cards: {},
    ftue: { seen: {}, disabled: false },
    telemetry: { lastOpenedAt: 0, opensInSession: 0 },
  }),
  getters: {
    isSidebarVisible: (s) => !s.sidebarCollapsed,
    ftueHintsPending: (s) => (id: string) => !s.ftue.disabled && !s.ftue.seen[id],
  },
  actions: {
    async bootstrap() {
      this.telemetry.lastOpenedAt = Date.now()
      this.telemetry.opensInSession++
      // 加载持久化状态
      await this.hydrateFromDexie()
    },
    async hydrateFromDexie() {
      const persisted = await db.hubState.get('default')
      if (persisted) Object.assign(this, persisted)
    },
    async persist() {
      await db.hubState.put({ id: 'default', ...this.$state })
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
      this.persist()
    },
    markFtueSeen(hintId: string) {
      this.ftue.seen[hintId] = true
      this.persist()
    },
    disableAllFtue() {
      this.ftue.disabled = true
      this.persist()
    },
  },
})
```

### 5.2 扩展 useArticlesStore（Hub 相关 getters）

```ts
// src/stores/articles.ts  (仅 Hub 新增部分)
getters: {
  recent: (s) => (limit: number) =>
    s.list
      .filter((a) => a.status !== 'archived' && !a.trashed)
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit),
  pinned: (s) =>
    s.list
      .filter((a) => a.pinned === true && !a.trashed)
      .slice()
      .sort((a, b) => b.pinnedAt - a.pinnedAt),
  todo: (s) =>
    s.list
      .filter((a) =>
        ['draft', 'writing', 'review', 'ready_to_publish'].includes(a.status)
      )
      .sort((a, b) => b.updatedAt - a.updatedAt),
  continueTarget(): Article | null {
    return this.todo[0] ?? null
  },
},
```

### 5.3 useMetricsStore

```ts
// src/stores/metrics.ts
interface MetricsState {
  version: '1.0.0'
  weekly: { day: string; words: number }[]  // 7 天
  streak: number
  goalProgress: { current: number; target: number; period: 'daily'|'weekly' }
  wordCountToday: number
  cache: Record<string, { value: unknown; expiresAt: number }>
}
```

关键点：

- `version` 字段对应 `MetricsDictionary` 口径版本（U-14）。
- `cache` 对应决策 U-19 的日级缓存。
- 所有指标计算必须走 `src/services/metrics/` 对应函数。

### 5.4 其他 Store 列表

| Store | 数据源 | 更新触发 |
|---|---|---|
| `useDraftsStore` | IndexedDB `drafts` 表 | 用户保存 / 快速笔记 |
| `useAssetsStore` | IndexedDB `assets` 表 + Tauri FS | 导入素材 / 孤儿扫描 |
| `useCategoriesStore` | IndexedDB `categories` + 虚拟分类查询 | CRUD 操作 |
| `useInsightsStore` | IndexedDB + Worker 预计算 | 时间调度 U-19 |
| `useInspirationService` | `data/quotes.ts` + 用户句子提取 | 每日轮换 |
| `useFTUEStore` | IndexedDB `ftue_state` | 用户交互 |
| `useUpdaterStore` | Tauri updater API | 启动时检查 |

### 5.5 Store 响应式链路规范

**强制约定**（来自决策 U-08）：

1. 所有 Hub 依赖的 Store 必须使用 `reactive` / `ref` 暴露数据。
2. `getters` 中如果依赖其他 Store，必须显式 import 并在 getter 内调用。
3. 禁止在 Hub 组件中使用 `watch` 触发 `refresh()`。
4. 禁止在 Hub 组件的 `onMounted` 中手动拉取数据（应在 Store 内部订阅）。
5. 每个 Store 顶部必须注释"响应式链路说明"：

```ts
/**
 * 响应式链路说明
 * - 数据源：IndexedDB `articles` 表
 * - 写入点：Workstation.save(), Workstation.delete(), Hub.FAB.new
 * - 订阅点：HubPage, FileManager, Workstation
 * - 是否轮询：否
 */
```

---

## 第六章 数据源与 Repo 契约

### 6.1 DocumentRepo

```ts
// src/repos/document-repo.ts
export interface DocumentRepo {
  listRecent(limit: number, filter?: ListFilter): Promise<Article[]>
  listPinned(): Promise<Article[]>
  listTodos(): Promise<Article[]>
  listByCategoryId(categoryId: string, limit?: number): Promise<Article[]>
  getById(id: string): Promise<Article | null>
  create(input: CreateArticleInput): Promise<Article>
  softDelete(id: string): Promise<void>
  restore(id: string): Promise<void>
  archive(id: string): Promise<void>
  unarchive(id: string): Promise<void>
  search(query: SearchQuery): Promise<Article[]>
}
```

Hub 仅使用 `listRecent`, `listPinned`, `listTodos`, `listByCategoryId`, `getById`, `create`。
不允许调用 `softDelete`, `archive` 等（这些是 FileManager / Workstation 的责任）。

### 6.2 InsightsService

```ts
// src/services/insights/insights-service.ts
export interface InsightsService {
  getTop3(): Promise<InsightSummary[]>       // Hub 用
  getAll(): Promise<InsightSummary[]>         // Insights 页面用
  getByName(name: InsightName): Promise<InsightSummary>
  exportCsv(name: InsightName): Promise<string>  // Tauri 文件系统
}
```

### 6.3 InspirationService

```ts
// src/services/inspiration/quotes-service.ts
export interface InspirationService {
  getDaily(): Promise<Quote>
  listFavorited(): Promise<Quote[]>
  favorite(id: string): Promise<void>
  unfavorite(id: string): Promise<void>
  refreshAiGenerated(): Promise<void>   // 定时 / 手动
  extractUserQuotes(): Promise<Quote[]> // 提取用户文章
}
```

### 6.4 TemplatesRepo

```ts
// src/repos/templates-repo.ts
export interface TemplatesRepo {
  listAll(): Promise<Template[]>
  getById(id: string): Promise<Template | null>
  createFromTemplate(id: string, profileId: string): Promise<Article>
}
```

### 6.5 Repo 错误约定

所有 Repo 方法遵守错误契约（对齐 G-13 D）：

```ts
export class RepoError extends Error {
  constructor(
    message: string,
    public severity: 'info' | 'warning' | 'error' | 'data-risk',
    public recoverable: boolean,
    public cause?: unknown
  ) {
    super(message)
  }
}
```

Hub 捕获 `data-risk` 级错误时必须走错误边界 UI 并记录 `activity_logs`。

---

## 第七章 组件 API 规范（按层级）

### 7.1 HubPage.vue

**职责**：根视图，组合所有 Section，挂载 Sidebar / SectionNav / FAB / FTUEBubble。

**Props**：无。

**Emits**：无（顶级视图）。

**Slots**：无。

**Exposed**：

- `scrollToSection(name: SectionName): void`
- `openFab(): void`

**State 订阅**：

- `useHubStore`
- `useAuthStore.currentProfile`
- `useSettingsStore.theme / language / paperWidth`

**关键逻辑**：

```vue
<template>
  <HubErrorBoundary>
    <div class="hub-page" :data-theme="theme" :data-lang="language">
      <Sidebar v-model:collapsed="hub.sidebarCollapsed" />
      <main class="hub-main">
        <HubEmptyState v-if="isEmpty" />
        <HubGrid v-else>
          <HeroSection />
          <StatsPreviewCard />
          <RecentDocs />
          <TemplateMarketCard />
          <DraftBoxCard />
          <AssetManagerCard />
          <CategoriesCard />
          <PinnedDocs v-if="showPinned" />
          <TodoPanel v-if="showTodo" />
          <DailyQuote />
          <InsightsCard v-for="insight in top3Insights" :key="insight.id" :insight="insight" />
          <UpdateLogCard v-if="hasNewVersion" />
        </HubGrid>
      </main>
      <SectionNav :focus="hub.sectionFocus" @change="scrollToSection" />
      <QuickActionFab />
      <FTUEBubble v-if="pendingHint" :hint="pendingHint" />
    </div>
  </HubErrorBoundary>
</template>
```

### 7.2 HeroSection.vue

**职责**：铁三角 #1，展示 WritingFlowCard 2.0 + ContinueWritingButton。

**Props**：

```ts
interface HeroSectionProps {
  compact?: boolean  // 小屏变紧凑模式
}
```

**Emits**：

```ts
interface HeroSectionEmits {
  (e: 'navigate-to-workstation', articleId: string): void
  (e: 'new-article-from-empty'): void
}
```

**Slots**：

- `#chart-overlay` — 允许父组件叠加自定义元素（用于 FTUE 指示）
- `#continue-button` — 允许 A/B 替换继续创作按钮的呈现

**Exposed**：

- `chartRef: Ref<HTMLCanvasElement | null>` — 暴露用于测量

**内部组成**：

```
HeroSection
├── HeroChart                (图表渲染)
├── ContinueWritingButton    (继续创作入口)
├── EmptyHeroSlot            (无数据态)
└── GoalBadge                (目标达成徽标)
```

### 7.3 ContinueWritingButton.vue

**职责**：指向"最近编辑且未完成"文章的入口按钮；无候选时退化为"开始新文章"。
**2026-04-22 当前实现注记**：
- Wave 1 当前尚未拆出独立 `ContinueWritingButton.vue` 文件，真实实现仍内嵌在 `HubView.vue` Hero 区，通过现有 `hero-continue-btn` 按钮承载。
- 当前候选算法先按现有真值链收口：未完成集合仍保持 `articles.filter(article => article.status !== 'processed')` 的兼容边界，但排序已改为 `draft -> new -> read -> processed` 优先级，再按 `updatedAt` 倒序。这样既能让真实草稿稳定优先，也不会把旧 `new/read` 文稿直接从候选池中删除。
- Hub 的空白创建 / 模板创建现在会显式以 `status='draft'` 写入文章，因此“继续创作”不再因为 `selectArticle()` 的旧 `NEW -> READ` 兼容逻辑而把新建本地文稿误判成“已读”。
- 当没有未完成候选时，当前实现直接回退到 `startNewProject()`，按钮文案与可访问性标签同步切换为“开始新文章”。

**Props**：

```ts
interface ContinueWritingButtonProps {
  target: Article | null
}
```

**Emits**：

```ts
interface ContinueWritingButtonEmits {
  (e: 'continue', articleId: string): void
  (e: 'create-new'): void
}
```

**算法**（对齐 PRD R-M-02）：

```ts
export function selectContinueTarget(articles: Article[]): Article | null {
  const unfinished = articles.filter((a) =>
    ['draft', 'writing', 'review', 'ready_to_publish'].includes(a.status)
    && !a.trashed
    && a.status !== 'archived'
  )
  if (unfinished.length === 0) return null
  return unfinished.sort((a, b) => b.updatedAt - a.updatedAt)[0]
}
```

### 7.4 QuickActions.vue / QuickActionFab.vue

**QuickActions.vue（菜单项）**：

**Props**：

```ts
interface QuickActionsProps {
  expanded: boolean
}
```

**Emits**：

```ts
(e: 'select', action: 'new-blank' | 'from-template' | 'import'): void
(e: 'close'): void
```

**QuickActionFab.vue（壳）**：

**Props**：

```ts
interface QuickActionFabProps {
  position?: 'bottom-right' | 'bottom-center'  // 默认 bottom-right
  offset?: { x: number; y: number }            // 默认 { x: 24, y: 24 }
}
```

**内部状态**：

- `expanded: Ref<boolean>` — 展开态
- `justified: Ref<boolean>` — 防抖点击
- `expandingPromise: Promise<void> | null`

**展开动画契约**（SLO-08 ≤ 200ms）：

```css
.fab-menu-enter-active { transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1); }
.fab-menu-enter-from { opacity: 0; transform: translateY(8px) scale(0.96); }
```

### 7.5 RecentDocs.vue / RecentDocItem.vue

**RecentDocs.vue**：
**2026-04-22 当前实现注记**：
- Wave 1 当前真实实现仍内嵌在 `HubView.vue` 的 `card-recent` 与底部瀑布流卡片中，尚未拆成独立 `RecentDocs.vue / RecentDocItem.vue` 文件边界。
- 当前摘要字段已改为展示层纯文本投影：`article.description` 优先；若无描述，则对 `article.rawContent` 执行 `extractContentPreviewText()`，因此首页不会直接显示 `#`、列表标记或强调符号等 Markdown 源串标记。

**Props**：

```ts
interface RecentDocsProps {
  limit?: number | 'auto'   // 'auto' 走 useDynamicListSize
  minItems?: number         // 默认 2（PRD R-M）
  excludeArchived?: boolean // 默认 true
}
```

**内部计算**：

```ts
const { height } = useElementSize(cardRef)
const computedLimit = computed(() => {
  if (props.limit !== 'auto') return props.limit
  const rowHeight = 56  // RecentDocItem 高度
  const headerHeight = 48
  const padding = 16 * 2
  const availableHeight = height.value - headerHeight - padding
  return Math.max(props.minItems ?? 2, Math.floor(availableHeight / rowHeight))
})
const items = computed(() => articles.recent(computedLimit.value))
```

**RecentDocItem.vue**：

**Props**：

```ts
interface RecentDocItemProps {
  article: Article
  highlighted?: boolean  // 标记为 ContinueTarget
}
```

**Emits**：

```ts
(e: 'click', id: string): void
(e: 'context-menu', id: string, event: MouseEvent): void
```

**显示字段**：

- 文章标题
- 状态徽标（对齐 L1-41 C 状态机）
- 修改时间（相对：5 分钟前 / 昨天 17:23）
- 分类 / 标签胶囊

### 7.6 StatsPreviewCard.vue

**职责**：铁三角 #3，展示本周字数 + 连续天数 + 目标进度。

**2026-04-22 当前实现注记**：

- Wave 1 当前仍在 `HubView.vue` 内直接计算并渲染目标进度，尚未完全拆分为独立的 `StatsPreviewCard.vue / GoalCard.vue` 组件边界。
- 目标进度当前由 `computeWritingWindowStats()` 和 `settings.writingGoal` 驱动，使用真实文章 `rawContent + updatedAt/createdAt` 窗口统计，不引入任何额外 mock 事件流。
- 当前点击动作已落到 `/settings?tab=editor&section=writing-goal`，而不是旧文档口径里的独立 `Settings > Writing` 页。

**Props**：

```ts
interface StatsPreviewCardProps {
  period?: 'daily' | 'weekly'  // 默认 weekly
}
```

**Slots**：

- `#empty` — 允许父组件自定义空态 UI

**埋点**：

- `hub.stats.clicked`
- `hub.stats.goal_clicked`（点击目标进度条跳 Settings > WritingGoal）

### 7.7 PinnedDocs.vue

**职责**：收藏卡片；为空时整个组件不渲染（对齐 9.x 可见性规则）。

**Props**：

```ts
interface PinnedDocsProps {
  maxVisible?: number  // 默认 5
}
```

**空态行为**：PinnedDocs **不渲染**（而非显示占位），直接返回 null。由父组件 `v-if="showPinned"` 判断。

### 7.8 TodoPanel.vue

**职责**：未完成文档面板；为空时整个组件不渲染。
**2026-04-22 当前实现注记**：
- Wave 1 当前尚未拆出独立 `TodoPanel.vue` 文件，真实实现以内嵌区块形式落在 `HubView.vue` 的 `card-recent` 下半部。
- 当前数据源与 Hero“继续创作”共用同一组 `unfinishedArticles` 计算结果，并取前 4 条渲染；排序同样优先 `draft`，再兼容旧 `new/read`，条目点击沿用既有 `openArticle(article.id)` 路由链返回 Workstation。
- 当前空态策略已按 spec 意图收口：当 `todoArticlesForCard.length === 0` 时，整块“未完成”区域不渲染，不展示空壳占位。

**Props**：

```ts
interface TodoPanelProps {
  limit?: number  // 默认 8
  groupBy?: 'status' | 'updatedAt'
}
```

**Emits**：

```ts
(e: 'navigate-to', id: string): void
(e: 'expand-filter', filter: TodoFilter): void
```

### 7.9 InsightsCard.vue

**职责**：单张洞察预览卡，本身不承载图表，通过 `adapter` 注入图表库。

**Props**：

```ts
interface InsightsCardProps {
  insight: InsightSummary
  expandable?: boolean
  adapter: ChartAdapter  // 来自 src/services/chart-adapter
}
```

**Slots**：

- `#header` — 自定义标题栏
- `#action` — 右上 action slot（CSV 导出 / 展开）

### 7.10 DailyQuote.vue (InspirationCard)

**职责**：每日引语卡。

**Props**：

```ts
interface DailyQuoteProps {
  source?: 'auto' | 'local' | 'ai' | 'user'  // 默认 auto
  refreshOnClick?: boolean
}
```

**Emits**：

```ts
(e: 'favorited', id: string): void
(e: 'share', id: string): void
```

**渲染规则**：

- 引言超过 120 字时显示"展开"按钮。
- 来源显示为："来自《文章 X》" / "本地" / "AI 生成"。
- 用户句子必须显示来源文章链接。

### 7.11 FTUEBubble.vue

**职责**：首次引导气泡；至多同时显示 1 个。

**Props**：

```ts
interface FTUEBubbleProps {
  hint: FTUEHint
  anchor: HTMLElement | string  // 锚点元素或 selector
  placement?: 'top' | 'right' | 'bottom' | 'left'
}
```

**Emits**：

```ts
(e: 'dismiss', hintId: string): void
(e: 'disable-all'): void
```

**硬约束**：

- 定位使用 `@floating-ui/vue`。
- 按 Esc 关闭。
- 点击气泡外空白处关闭（点击锚点不关闭）。
- 首次显示延迟 2000ms（对齐 4.3）。
- 最多显示 10 秒自动消失。

### 7.12 Sidebar.vue

**职责**：左侧边栏；内含账户 / 分类 / 收藏快速访问 / 回收站 / 设置。

**Props**：

```ts
interface SidebarProps {
  collapsed: boolean
}
```

**Emits**：

```ts
(e: 'update:collapsed', collapsed: boolean): void
(e: 'nav', target: 'files' | 'recycle-bin' | 'settings'): void
```

**内部区块**：

1. HeaderAvatarMenu
2. CategoriesTree（嵌套分类）
3. SmartFoldersList
4. PinnedDocsQuick
5. RecycleBinEntry
6. SettingsGear

### 7.13 HeaderAvatarMenu.vue

**Props**：

```ts
interface HeaderAvatarMenuProps {
  profile: Profile
}
```

**Emits**：

```ts
(e: 'switch-profile'): void
(e: 'manage-profiles'): void
(e: 'open-settings'): void
(e: 'logout'): void
```

**气泡菜单结构**（对齐 T06-07 B）：

```
┌──────────────────────────┐
│ 👤 Profile Name          │
│ 📧 profile@local         │
├──────────────────────────┤
│ 管理账户                 │
│ 设置                     │
│ 退出                     │
└──────────────────────────┘
```

### 7.14 CategoriesCard.vue

**Props**：

```ts
interface CategoriesCardProps {
  maxDepth?: number  // 默认 3
}
```

**Emits**：

```ts
(e: 'category-clicked', id: string): void
(e: 'category-expanded', id: string): void
(e: 'navigate-to-workstation', articleId: string): void
```

**就地展开契约**（U-10）：

- 点击分类 → 手风琴展开 → 显示该分类下最近 10 条
- 二次点击分类标题 → 折叠
- 展开面板内条目点击 → 跳转 Workstation

### 7.15 RecycleBinEntry.vue

**Props**：

```ts
interface RecycleBinEntryProps {
  itemCount: number
  usageBytes: number
  highlight?: boolean  // 容量报警时高亮
}
```

**Emits**：

```ts
(e: 'open-recycle-bin'): void
```

### 7.16 UpdateLogCard.vue

**Props**：

```ts
interface UpdateLogCardProps {
  currentVersion: string
  latestVersion: string | null
  releaseNotes: string
}
```

**Emits**：

```ts
(e: 'open-release-notes'): void
(e: 'check-update'): void
```

**展示规则**（对齐 L1-56 B 仅通知）：

- 有新版本时显示"新版本 x.y.z 可用"
- 点击打开 release notes 抽屉
- 不自动下载 / 不强制安装

---

## 第八章 懒加载与代码分割

### 8.1 IntersectionObserver 策略

以下卡片使用 `useLazyCard` 实现"进入视口再渲染"：

- InsightsCard × N（图表库较重）
- UpdateLogCard
- CategoriesCard 的展开面板（展开时才加载）

```ts
// src/composables/useLazyCard.ts
export function useLazyCard(root: Ref<HTMLElement | null>, options: LazyOptions = {}) {
  const visible = ref(false)
  let observer: IntersectionObserver | null = null
  onMounted(() => {
    if (!root.value) return
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          visible.value = true
          observer?.disconnect()
        }
      },
      { rootMargin: options.rootMargin ?? '200px' }
    )
    observer.observe(root.value)
  })
  onBeforeUnmount(() => observer?.disconnect())
  return { visible }
}
```

### 8.2 Dynamic Import 清单

| 模块 | 触发点 | 体积预期 |
|---|---|---|
| 图表库适配器 | InsightsCard 首次进入视口 | ~120KB |
| TemplateMarket 完整数据 | Section 2 进入视口 | ~40KB |
| MarkdownCheatsheet | 按 F2 触发 | ~30KB |
| WelcomeModal | FirstRunDispatcher 触发 | ~20KB |
| ImportWizard | FAB 导入触发 | ~60KB |
| HeroChart 适配器 | HeroSection 挂载 | ~100KB |

### 8.3 Critical CSS

Hub 首屏关键 CSS：

- 主题 CSS Variables
- Grid 布局
- 铁三角样式
- FAB 基础样式

首屏 Critical CSS 内联在 `index.html`，其他 CSS 走 Vite 默认拆包。

### 8.4 预加载策略

```html
<!-- index.html -->
<link rel="modulepreload" href="/assets/hub-page.js">
<link rel="preload" href="/fonts/LXGWWenKaiScreen.woff2" as="font" type="font/woff2" crossorigin>
```

---

## 第九章 动效规范

### 9.1 时序矩阵

| 动效 | 进入 | 退出 | 缓动 |
|---|---|---|---|
| 卡片首次渲染 | 80ms | — | cubic-bezier(0.4, 0, 0.2, 1) |
| 卡片离场 | — | 120ms | cubic-bezier(0.4, 0, 0.2, 1) |
| FAB 展开 | 180ms | 140ms | cubic-bezier(0.4, 0, 0.2, 1) |
| FTUE 气泡 | 160ms | 120ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Sidebar 折叠 | 200ms | 200ms | cubic-bezier(0.4, 0, 0.2, 1) |
| CategoriesCard 展开 | 150ms | 150ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Hero 图表交互高亮 | 120ms | 120ms | ease-out |
| 页面过渡 slide-left | 240ms | 240ms | cubic-bezier(0.4, 0, 0.2, 1) |
| FAB 按钮按压 | 80ms | 80ms | ease-out |

### 9.2 Reduced Motion

```ts
// src/composables/useReducedMotion.ts
export function useReducedMotion() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const reduced = ref(mq.matches)
  mq.addEventListener('change', (e) => (reduced.value = e.matches))
  return reduced
}
```

全局使用：

```css
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0ms !important; animation-duration: 0ms !important; }
}
```

### 9.3 禁止的动画类型

- Bounce / 弹性
- 粒子特效
- 纸张翻页
- 3D 翻转
- 无穷循环呼吸动画（FAB 新手引导除外）
- 光泽扫过

### 9.4 微交互

| 事件 | 视觉 |
|---|---|
| 卡片悬停 | border-color 过渡到强调色 2px |
| 按钮按下 | scale(0.98) + opacity 0.9 |
| Checkbox 勾选 | 150ms 打勾动画 |
| Toast 出现 | 从右下角滑入 200ms |

---

## 第十章 可见性规则（空态 / 铁三角 / 断点）

### 10.1 可见性决策矩阵

| 卡片 | 空态 | 铁三角 | <768px |
|---|---|---|---|
| HeroSection | 文字占位 | ✅ 必可见 | 必可见 |
| StatsPreviewCard | 文字占位 | ✅ 必可见 | 折叠为"展开查看" |
| RecentDocsCard | 文字占位 | ✅ 必可见 | 必可见 |
| TemplateMarketCard | 显示 8 内置模板 | — | 折叠 |
| DraftBoxCard | 文字占位 | — | 折叠 |
| AssetManagerCard | 文字占位 | — | 折叠 |
| CategoriesCard | 文字占位 | — | 折叠 |
| PinnedDocsCard | **不渲染** | — | 隐藏 |
| TodoPanel | **不渲染** | — | 隐藏 |
| InspirationCard | 显示硬编码引言 | — | 折叠 |
| InsightsCard | 显示"数据准备中" | — | 隐藏 |
| UpdateLogCard | **不渲染** | — | 隐藏 |

### 10.2 空态文案清单

```ts
// i18n/zh-CN/hub.ts
export default {
  empty: {
    hero: '尚无写作记录，开始第一篇吧',
    recent: '最近没有文章',
    stats: '开始写作以记录统计',
    draft: '暂无草稿',
    asset: '素材库为空',
    category: '尚无分类',
    todo: '暂无未完成文档',
    insight: '数据准备中',
  },
}
```

### 10.3 Hero 空态 CTA

无任何文章时，Hero 展示：

```
┌─────────────────────────────────────────┐
│                                         │
│  尚无写作记录，开始第一篇吧             │
│                                         │
│  ┌─────────────────┐                    │
│  │  开始新文章  ┐  │                    │
│  └─────────────────┘                    │
│                                         │
└─────────────────────────────────────────┘
```

"开始新文章"按钮占用 FAB 3 入口预算中的"新建空白文档"入口（不是额外的第 4 入口）。

---

## 第十一章 快捷操作与命令绑定

### 11.1 Hub 层快捷键（对齐 `03-spec-keybindings.md`）

| 快捷键 | 动作 | 作用域 |
|---|---|---|
| Ctrl+N | FAB 新建空白 | Hub |
| Ctrl+Shift+N | FAB 从模板创建 | Hub |
| Ctrl+O | FAB 导入 | Hub |
| Ctrl+K | 打开命令面板（全局） | Hub + Workstation |
| Ctrl+P | 打开命令面板（切换） | Hub + Workstation |
| Ctrl+, | 打开 Settings | Hub + Workstation |
| F1 | 上下文帮助气泡 | Hub |
| F2 | 打开 Markdown 速查卡 | Hub + Workstation |
| Ctrl+\ | Hub 不使用（Workstation 专属） | — |
| Alt+1..4 | 跳转 Section 1..4 | Hub |
| Alt+B | 折叠 / 展开 Sidebar | Hub |
| Esc | 关闭 FAB / 关闭 FTUE 气泡 / 关闭展开面板 | Hub |
| Ctrl+F | Hub 不使用（Workstation 专属） | — |

### 11.2 命令注册表集成

Hub 所有动作通过 `commandRegistry` 注册（对齐 T05-09 D）：

```ts
// src/services/command-registry.ts (Hub 部分)
registry.register({
  id: 'hub.new-blank',
  label: '新建空白文档',
  icon: 'file-plus',
  category: 'edit',
  handler: () => useArticlesStore().createBlank(),
  enableWhen: () => useAuthStore().currentProfile !== null,
  visibleWhen: (ctx) => ctx.view === 'hub' || ctx.view === 'workstation',
  audit: true,
})
registry.register({
  id: 'hub.from-template',
  label: '从模板创建',
  icon: 'file-text',
  category: 'edit',
  handler: (ctx) => showTemplateSelector(),
  audit: true,
})
registry.register({
  id: 'hub.import',
  label: '导入文档',
  icon: 'upload',
  category: 'system',
  handler: () => openImportWizard(),
  audit: true,
})
registry.register({
  id: 'hub.continue-writing',
  label: '继续创作',
  icon: 'arrow-right',
  category: 'edit',
  handler: () => {
    const target = useArticlesStore().continueTarget
    if (target) router.push(`/workstation/${target.id}`)
  },
  audit: false,
})
```

### 11.3 命令面板可见性

所有 `registry.visibleWhen(ctx)` 返回 true 的命令可在命令面板搜索：

```
输入 "新建"  → 显示 "hub.new-blank"
输入 "模板"  → 显示 "hub.from-template"
输入 "导入"  → 显示 "hub.import"
输入 "继续"  → 显示 "hub.continue-writing"
```

### 11.4 右键菜单

Hub 页面大多数区域不挂载右键菜单（Sidebar / 卡片内容除外）：

- Sidebar 右键分类 → 管理 / 删除 / 新建子分类
- RecentDocItem 右键 → 打开 / 固定 / 归档 / 删除
- TemplateMarketCard 右键模板 → 使用 / 编辑 / 删除

---

## 第十二章 每日引语服务

### 12.1 数据源分层

```
Tier 1  本地硬编码引言池      (src/data/quotes.ts, 50-100 条)
Tier 2  AI 生成缓存           (IndexedDB quotes_cache, v2.1 占位接口)
Tier 3  用户文章句子提取      (当用户文章数 ≥ 5)
```

优先级：**Tier 3 > Tier 2 > Tier 1**。

### 12.2 轮换算法

```ts
// src/services/inspiration/quotes-service.ts
export async function getDaily(): Promise<Quote> {
  const userArticles = await documentRepo.getNonArchivedCount()
  const today = startOfDay(new Date()).getTime()
  const seed = hash(today + currentProfileId)

  if (userArticles >= 5) {
    const userQuotes = await extractUserQuotes()
    if (userQuotes.length > 0) {
      return pickByHash(userQuotes, seed)
    }
  }
  const aiQuotes = await loadAiCached()
  if (aiQuotes.length > 0) {
    return pickByHash(aiQuotes, seed)
  }
  return pickByHash(LOCAL_QUOTES, seed)
}
```

### 12.3 硬编码引言池契约

`src/data/quotes.ts` 必须满足：

- 至少 50 条
- 不超过 100 条
- 每条字段：`{ id, text, author, locale }`
- locale = `zh-CN` 或 `en-US`
- 所有引言必须开源或公有领域（避免版权风险）

### 12.4 用户句子提取规则

```ts
export async function extractUserQuotes(): Promise<Quote[]> {
  const articles = await documentRepo.listNonArchived()
  const sentences: Quote[] = []
  for (const article of articles) {
    if (article.status === 'draft') continue  // 排除草稿
    if (article.trashed) continue              // 排除回收站
    if (article.status === 'archived') continue // 排除归档
    const plain = markdownToPlainText(article.content)
    const candidates = extractSignificantSentences(plain, { min: 12, max: 80 })
    sentences.push(...candidates.map((s) => ({
      id: `user-${article.id}-${hash(s)}`,
      text: s,
      author: article.title,
      source: `article:${article.id}`,
      locale: article.locale,
    })))
  }
  return sentences
}
```

`extractSignificantSentences` 算法：

- 长度 12-80 字符
- 不含 URL / 代码片段 / Markdown 语法
- 包含句号 / 感叹号 / 问号 / 省略号结尾
- 频率过滤（同一句子只出现一次）

### 12.5 AI 生成接口（v2.1 占位）

```ts
export interface AiQuoteGenerator {
  generate(batchSize: number): Promise<Quote[]>
  isAvailable(): boolean
}
```

v2.1 默认实现返回空数组（对齐 07-settings-full-spec.md 的 AI Tab 占位）。

### 12.6 禁止行为

- **禁止调用外部 API**（对齐 L1-02 A 本地优先）。
- **禁止在启动时阻塞 Hub 首屏**（引言加载必须 async）。
- **禁止无来源显示用户句子**（必须附原文链接）。

---

## 第十三章 FTUE 引导气泡

### 13.1 气泡清单（v2.1）

| Hint ID | 锚点 | 文案 | 触发条件 |
|---|---|---|---|
| `ftue.fab.first-time` | QuickActionFab | "点击这里快速新建文档" | 首次停留 2s + FAB 未点击过 |
| `ftue.hero.first-time` | HeroSection | "这里展示你的写作流与继续入口" | 首次进入 Hub + 有数据 |
| `ftue.sidebar.first-time` | Sidebar 折叠按钮 | "可随时隐藏侧边栏" | 首次进入 Hub + Sidebar 展开 |

### 13.2 气泡调度器

```ts
// src/services/hub/ftue-registry.ts
export class FTUERegistry {
  private hints: FTUEHint[]
  private queue: FTUEHint[] = []
  private current: FTUEHint | null = null

  schedule(hint: FTUEHint) {
    if (useHubStore().ftue.disabled) return
    if (useHubStore().ftue.seen[hint.id]) return
    if (!hint.condition()) return
    this.queue.push(hint)
    this.processNext()
  }

  processNext() {
    if (this.current) return
    const next = this.queue.shift()
    if (!next) return
    this.current = next
    setTimeout(() => this.emit('show', next), 2000)
  }

  dismiss(hintId: string) {
    useHubStore().markFtueSeen(hintId)
    this.current = null
    this.processNext()
  }

  disableAll() {
    useHubStore().disableAllFtue()
    this.queue = []
    this.current = null
  }
}
```

### 13.3 气泡位置计算

使用 `@floating-ui/vue`：

```ts
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue'

const { floatingStyles } = useFloating(anchor, tooltipEl, {
  placement: 'top',
  middleware: [offset(12), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
})
```

### 13.4 关闭规则

- 按 Esc
- 点击气泡内"知道了"按钮
- 点击气泡外空白
- 10 秒自动消失
- 用户点击"再也不显示引导" → `ftueStore.disableAll()`

### 13.5 禁止行为

- 禁止同时显示 2+ 气泡
- 禁止气泡间自动递进（用户关 1 个立即出下 1 个）— 必须延迟 ≥ 3 秒
- 禁止气泡覆盖 FAB / Sidebar 等必要交互元素

---

## 第十四章 主题适配

### 14.1 4 主题矩阵

| 主题 | 背景 | 前景 | 强调色 | 用途 |
|---|---|---|---|---|
| 亮色（默认） | `#FDFBF5` | `#1A1A1A` | `#D32F2F` | 日间写作 |
| 暗色 | `#141414` | `#E8E8E8` | `#E05555` | 夜间写作 |
| 护眼 | `#F5F0E6` | `#2A2A2A` | `#AD3838` | 长时间阅读 |
| 暗夜红 | `#1A0000` | `#FFDDDD` | `#FF6060` | 极夜高对比 |

### 14.2 CSS Variables 清单

```css
:root {
  --hub-bg: var(--color-surface);
  --hub-card-bg: var(--color-surface-elevated);
  --hub-card-border: var(--color-border);
  --hub-title: var(--color-heading);
  --hub-body: var(--color-text);
  --hub-muted: var(--color-text-muted);
  --hub-accent: var(--color-brand);
  --hub-accent-hover: var(--color-brand-hover);
  --hub-shadow: 0 2px 8px rgba(0,0,0,0.08);
  --hub-card-radius: 12px;
  --hub-element-radius: 8px;
}
[data-theme='dark'] {
  --hub-shadow: 0 2px 12px rgba(0,0,0,0.35);
}
[data-theme='eye-care'] {
  --hub-accent: var(--color-brand-eye-care);
}
[data-theme='dark-red'] {
  --hub-accent: var(--color-brand-dark-red);
}
```

### 14.3 主题切换契约

- 切换主题必须走分层过渡（U-59 C）
- FOUC（白屏闪烁）必须为 0（CSS Variables 预加载）
- 切换延迟 ≤ 160ms（全局淡入淡出）

### 14.4 与 WritingMode 主题的关系

Hub 使用 **AppChromeTheme**（L1-58 D 中的"UI 主题"）；Workstation 的 "WritingMode" 使用 **EditorContentTheme**。两者独立，Hub 不受 WritingMode 影响。

---

## 第十五章 i18n 规范

### 15.1 资源组织

```
src/i18n/
├── zh-CN/
│   ├── hub.ts
│   ├── common.ts
│   └── index.ts
├── en-US/
│   ├── hub.ts
│   ├── common.ts
│   └── index.ts
└── index.ts
```

### 15.2 Hub 资源 Key 规范

所有 Key 遵循 `hub.<module>.<item>.<variant>` 结构：

```ts
// zh-CN/hub.ts
export default {
  hub: {
    hero: {
      title: '欢迎回来',
      subtitle_with_streak: '已连续写作 {days} 天',
      subtitle_no_streak: '开始写作记录连续天数',
      continue_cta: '继续创作',
      new_cta: '开始新文章',
    },
    recent: {
      title: '最近编辑',
      empty: '最近没有文章',
      header_relative: '更新于 {time}',
    },
    stats: {
      title: '写作概览',
      weekly_words: '本周 {count} 字',
      streak: '连续 {days} 天',
      goal: '目标进度 {percent}%',
      empty: '开始写作以记录统计',
    },
    fab: {
      new_blank: '新建空白文档',
      from_template: '从模板创建',
      import: '导入文档',
      close: '关闭',
    },
    inspiration: {
      title: '今日引言',
      source_user: '来自《{title}》',
      source_local: '本地',
      source_ai: 'AI 生成',
      favorite: '收藏',
      unfavorite: '取消收藏',
    },
    ftue: {
      fab_hint: '点击这里快速新建文档',
      hero_hint: '这里展示你的写作流与继续入口',
      sidebar_hint: '可随时隐藏侧边栏',
      dismiss: '知道了',
      disable_all: '再也不显示引导',
    },
    empty: {
      hero: '尚无写作记录，开始第一篇吧',
      recent: '最近没有文章',
      stats: '开始写作以记录统计',
      draft: '暂无草稿',
      asset: '素材库为空',
      category: '尚无分类',
      todo: '暂无未完成文档',
      insight: '数据准备中',
    },
  },
}
```

### 15.3 格式化本地化

```ts
// 日期
useI18n().d(new Date(), 'relative')   // "5 分钟前" / "5 minutes ago"

// 数字
useI18n().n(1234567, 'compact')        // "1.2M" / "123.4万"

// 复数
useI18n().t('recent.count', { count: 5 }, 5)  // "5 篇文章" / "5 articles"
```

### 15.4 硬编码扫描规则

ESLint 自定义规则（`no-hardcoded-strings`）扫描 Hub 组件：

```ts
// .eslintrc.hub.json (仅 Hub 目录生效)
rules: {
  'no-hardcoded-chinese-in-template': 'error',
  'no-hardcoded-english-in-template': 'warn',
}
```

### 15.5 语言切换

语言切换通过 Settings 生效，Hub 响应式更新。切换不刷新页面。

---

## 第十六章 无障碍（Baseline A11y）

### 16.1 基线承诺（对齐 G-09 A + R-S 推荐）

虽然 G-09 A 明确 v2.1 不做 WCAG AA 专项，但 Hub 仍需满足基线：

- 所有按钮 / 链接使用语义化标签
- 所有图标按钮有 `aria-label`
- Tab 顺序可遍历所有 CTA
- Esc 关闭所有浮层

### 16.2 ARIA Roles

| 元素 | role | aria |
|---|---|---|
| Sidebar | navigation | aria-label="Hub 侧边栏" |
| HeaderAvatarMenu | menu | aria-labelledby="avatar-button" |
| SectionNav | navigation | aria-label="Section 导航" |
| QuickActionFab | button | aria-label="快速操作" aria-expanded={...} |
| FTUEBubble | dialog | aria-labelledby="ftue-title" aria-modal=false |
| CategoriesCard | tree | aria-label="分类树" |

### 16.3 键盘交互矩阵

| 焦点元素 | Tab | Shift+Tab | Enter | Esc |
|---|---|---|---|---|
| FAB 按钮 | 下一个 | 上一个 | 展开 | 关闭 |
| FAB 展开项 | 下一项 | 上一项 | 执行 | 关闭菜单 |
| RecentDocItem | 下一项 | 上一项 | 跳 Workstation | — |
| CategoriesCard 节点 | 下一节点 | 上一节点 | 展开 / 折叠 | 折叠 |
| FTUE 气泡 | 知道了 | 再也不显示 | 确认 | 关闭 |

### 16.4 焦点指示

焦点可见性（focus-visible）强制显示：

```css
*:focus-visible {
  outline: 2px solid var(--hub-accent);
  outline-offset: 2px;
}
```

---

## 第十七章 测试矩阵

### 17.1 单元测试清单（Vitest）

#### T-U-01 selectContinueTarget

- **文件**：`tests/unit/hub/select-continue-target.spec.ts`
- **用例**：
  1. 空数组返回 null
  2. 全部已发布返回 null
  3. 存在 draft 返回最新 draft
  4. draft 与 writing 共存返回 updatedAt 最新
  5. 排除 archived
  6. 排除 trashed
  7. 同 updatedAt 时取 id 字典序
  8. 状态为未知值时视为非候选

#### T-U-02 useDynamicListSize

- **文件**：`tests/unit/hub/useDynamicListSize.spec.ts`
- **用例**：
  1. 默认下限 2 条
  2. 卡片高度 300 得出 5 条（rowHeight=56）
  3. ResizeObserver 变更时重新计算
  4. 卸载时 observer 断开
  5. 卡片被隐藏时返回下限

#### T-U-03 quotes-service

- **文件**：`tests/unit/hub/quotes-service.spec.ts`
- **用例**：
  1. 用户文章 < 5 走 Tier 1
  2. 用户文章 ≥ 5 有可提取句子走 Tier 3
  3. AI 缓存有数据时走 Tier 2
  4. 用户句子提取排除 draft / archived / trashed
  5. 同一日期同一 Profile 返回同一条（确定性）

#### T-U-04 hub-store

- **用例**：
  1. bootstrap 持久化读取
  2. toggleSidebar 持久化
  3. markFtueSeen 持久化
  4. disableAllFtue 清空 queue
  5. 多次 bootstrap 幂等

#### T-U-05 recent-docs-selector

- **用例**：
  1. 排除 archived
  2. 排除 trashed
  3. 按 updatedAt desc 排序
  4. limit 截断
  5. ContinueTarget 置顶

#### T-U-06 command-registry Hub 部分

- **用例**：
  1. `hub.new-blank` enableWhen 在无 Profile 下返回 false
  2. 命令面板能找到所有 hub.* 命令
  3. 审计字段正确落盘

### 17.2 E2E 测试清单（Playwright）

#### T-E-01 first-run

- 新安装 → WelcomeModal → FirstRunDispatcher
- 拒绝匿名模式选项不存在
- 完成后进入空态 Hub

#### T-E-02 empty-state

- 空态铁三角全部可见
- Hero 显示"尚无写作记录，开始第一篇吧"
- 点击"开始新文章"跳 Workstation 新文档

#### T-E-03 continue-writing

- 有 draft 文章时 ContinueWritingButton 指向它
- 点击跳 Workstation
- M-01 时长 ≤ 3s

#### T-E-04 fab

- FAB 展开动画 ≤ 200ms
- 展开项仅 3 个
- 新建 / 模板 / 导入各自路径正确
- Esc 关闭
- 点击外部关闭

#### T-E-05 recent-docs

- 动态条数在不同高度下正确
- 下限 2 条
- 归档 / 回收站不出现
- 条目点击跳 Workstation
- 修改某文章后 RecentDocs 响应式刷新（≤ 100ms）

#### T-E-06 categories-expand

- 点击分类就地展开
- 展开面板内容正确
- 再次点击折叠
- 展开内条目点击跳 Workstation
- 不跳 FileManager

#### T-E-07 ftue-bubble

- 首次停留 2s 触发气泡
- 关闭后永不再弹
- 点击"再也不显示引导"关闭所有

#### T-E-08 theme-switch

- 4 主题下 Hub 视觉正确
- 切换无 FOUC
- 切换延迟 ≤ 160ms

#### T-E-09 i18n-switch

- zh / en 切换所有文案更新
- 日期 / 数字本地化正确
- 切换不刷新页面

#### T-E-10 responsive-breakpoints

- ≥1440 / ≥1024 / ≥768 / <768 四断点布局正确
- 铁三角全断点可见
- <768 折叠规则正确

#### T-E-11 sidebar-toggle

- 折叠 / 展开正确
- 状态持久化
- <1024 默认折叠

#### T-E-12 perf-fcp

- FCP ≤ 500ms
- TTI ≤ 500ms
- Lighthouse > 80

#### T-E-13 hero-chart

- 图表正确渲染 7 天数据
- 点击柱子跳转日期
- Tooltip 正确显示

#### T-E-14 fab-exhaustive

- 三个入口全功能覆盖
- 重复点击 FAB 不重复展开
- 正在动画时二次点击排队

#### T-E-15 stats-preview-click

- 点击目标进度跳 Settings > WritingGoal
- 点击字数跳 WordCountReport

#### T-E-16 inspiration-daily

- 同一天同一 Profile 返回同一条
- 收藏功能正确
- 来源信息正确显示

#### T-E-17 header-avatar-menu

- 气泡展开正确
- 切换 Profile 走 reload
- 自动保存失败时禁止切换

#### T-E-18 recycle-bin-entry

- 数量徽标正确
- 点击跳 RecycleBin

#### T-E-19 update-log-card

- 无新版本时不渲染
- 有新版本时正确显示
- 点击打开 release notes

#### T-E-20 insights-preview

- 2-3 个头等舱指标正确
- Lazy load 触发
- 点击跳 Insights

#### T-E-21 dark-red-theme

- 暗夜红主题下所有卡片可读
- 强调色不刺眼

#### T-E-22 reduced-motion

- `prefers-reduced-motion` 下动画 0ms
- 所有过渡正常

#### T-E-23 keyboard-nav

- Tab 遍历所有 CTA
- Enter 触发
- Esc 关闭浮层

#### T-E-24 sidebar-shortcut

- Alt+B 折叠 / 展开
- 状态持久化

#### T-E-25 command-palette-hub-commands

- Ctrl+K 打开面板
- 能找到所有 hub.* 命令
- 快捷键提示正确

#### T-E-26 draft-box-expiring

- 过期草稿标记正确
- 点击跳 Workstation

#### T-E-27 asset-manager-orphan

- 孤儿素材徽标正确
- 点击跳素材管理

#### T-E-28 template-market-card

- 内置模板全部显示
- 点击使用模板跳 Workstation

#### T-E-29 todo-panel-visibility

- 无未完成项时不渲染
- 有项时正确显示

#### T-E-30 pinned-docs-visibility

- Pinned 为空不渲染
- 有 Pinned 时正确显示

#### T-E-31 update-log-disabled

- 禁用自动更新通知后不显示

#### T-E-32 multi-window

- 多窗口各自 Hub 独立
- Profile 切换走当前窗口 reload

#### T-E-33 insights-deep-link

- 点击 Hero 柱子跳到 Files?date=
- 点击 InsightsCard 跳 Insights?chart=

#### T-E-34 error-boundary

- 某卡片异常不影响其他卡片
- 错误显示"数据加载异常"

#### T-E-35 empty-hub-then-data

- 空态 → 新建文章 → 返回 Hub 响应式更新

#### T-E-36 sidebar-categories-context-menu

- 右键分类菜单正确
- 新建子分类正确

#### T-E-37 recent-item-context-menu

- 右键条目菜单正确
- 归档 / 删除正确

#### T-E-38 stats-weekly-monthly-toggle

- 周 / 月切换正确

#### T-E-39 inspiration-no-network

- 无网络下仍能显示本地引言

#### T-E-40 a11y-baseline

- 所有按钮有 aria-label
- Tab 顺序合理
- 焦点可见

### 17.3 快照测试

- 4 主题 × 4 断点 × 3 状态（空 / 少 / 多）= 48 张截图
- CI 对比像素差异 ≤ 1%

---

## 第十八章 埋点与性能采集

### 18.1 埋点实现

```ts
// src/services/hub/hub-telemetry.ts
export class HubTelemetry {
  track(event: string, payload: Record<string, unknown> = {}) {
    const record = {
      event,
      payload,
      ts: Date.now(),
      profileId: useAuthStore().currentProfile?.id,
      sessionId: this.sessionId,
      view: 'hub',
    }
    // v2.1 本地写入 IndexedDB，不发送外部
    db.telemetry.add(record)
    if (import.meta.env.DEV) console.debug('[hub.telemetry]', record)
  }
  measure(name: string, fn: () => Promise<void> | void) {
    const start = performance.now()
    const ret = fn()
    const done = () => {
      const duration = performance.now() - start
      this.track(`hub.perf.${name}`, { duration })
    }
    if (ret instanceof Promise) ret.then(done)
    else done()
    return ret
  }
}
```

### 18.2 性能采集点

```ts
onMounted(() => {
  telemetry.track('hub.opened')
  const navEntry = performance.getEntriesByType('navigation')[0]
  telemetry.track('hub.fcp', { value: navEntry.firstContentfulPaint })
  telemetry.track('hub.tti', { value: navEntry.domInteractive })
})

// Store 响应式刷新延迟
watch(
  () => articles.list,
  () => telemetry.measure('store-reactive', () => {})
)
```

### 18.3 告警阈值

| 指标 | 告警阈值 | 行动 |
|---|---|---|
| FCP | > 800ms | 触发诊断包 |
| TTI | > 800ms | 触发诊断包 |
| store-reactive | > 200ms | 写日志 |
| chart-rerender | > 400ms | 降级采样 |

### 18.4 日志落盘

```ts
// IndexedDB schema addition
{ name: 'telemetry', keyPath: '++id', indexes: ['event', 'ts', 'profileId'] }
```

保留期：7 天（对齐 R-02 D）；超期自动清理。

---

## 第十九章 代码风格与类型契约

### 19.1 TypeScript 严格模式

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 19.2 Hub 类型声明清单

```ts
// src/types/hub.ts
export type SectionName = 'section-1' | 'section-2' | 'section-3' | 'section-4'
export type CardPriority = 1 | 2 | 3 | 4
export type HubTransition = 'slide-left' | 'slide-right' | 'fade'

export interface HubCardMeta {
  id: string
  name: string
  section: SectionName
  priority: CardPriority
  minWidth: number
  lazyLoad: boolean
}

export interface HubCardRegistry {
  cards: HubCardMeta[]
  getBySection(section: SectionName): HubCardMeta[]
  getByPriority(p: CardPriority): HubCardMeta[]
}

export interface FTUEHint {
  id: string
  anchor: string | (() => HTMLElement | null)
  placement: 'top' | 'right' | 'bottom' | 'left'
  title: string
  body: string
  condition: () => boolean
  priority: number
}

export interface Quote {
  id: string
  text: string
  author?: string
  source?: string
  locale: 'zh-CN' | 'en-US'
}

export interface InsightSummary {
  id: InsightName
  title: string
  value: number | string
  trend?: 'up' | 'down' | 'flat'
  unit?: string
  chartData?: unknown
}
```

### 19.3 禁用 `any`

Hub 模块不允许出现 `any`。遇到未知类型使用 `unknown` + 类型守卫。

### 19.4 Vue 3 SFC 规范

- 必须使用 `<script setup lang="ts">`
- 必须声明 Props / Emits 接口
- 模板中禁止内联复杂表达式（> 20 字符应抽到 computed）
- style 必须 `scoped` 或使用 `<style module>`

---

## 第二十章 变更管理与回滚策略

### 20.1 合并门槛

PR 合入 `main` 前必须：

1. 全部单测通过（Vitest）
2. 全部 E2E 通过（Playwright）
3. Lighthouse Performance > 80（CI 跑分）
4. 视觉回归测试通过（Percy / Chromatic / 手动）
5. 诊断日志完整性检查
6. `gitnexus_detect_changes` 确认影响范围
7. 两名评审通过

### 20.2 回滚触发条件

- 生产环境 FCP > 800ms 持续 24 小时
- Store 响应式链路断裂率 > 0.1%
- 任何 v2.1 决策铁律被违反

### 20.3 回滚路径

```bash
git revert <commit-sha>
git push origin main
# 重新跑 pnpm build && pnpm dev 验证
```

若涉及 Dexie schema 变更，回滚前必须运行反向迁移脚本（T07-10 D）。

### 20.4 兼容性保证

- Hub v2.1 兼容 v2.0 IndexedDB schema（Dexie 自动迁移）
- Hub v2.1 的 Store 订阅逻辑与 v2.0 Workstation 兼容
- Hub v2.1 的路由 `/hub` 不变

---

## 附录 A 组件组合关系图

```
HubPage
├── HubErrorBoundary
│   └── HubGrid
│       ├── Section 1 [铁三角]
│       │   ├── HeroSection
│       │   │   ├── HeroChart  ◀── ChartAdapter
│       │   │   ├── ContinueWritingButton
│       │   │   └── GoalBadge
│       │   ├── StatsPreviewCard
│       │   └── RecentDocs
│       │       └── RecentDocItem × N
│       ├── Section 2 [创作工具]
│       │   ├── TemplateMarketCard
│       │   ├── DraftBoxCard
│       │   └── AssetManagerCard
│       ├── Section 3 [聚合]
│       │   ├── CategoriesCard
│       │   │   └── ExpandablePanel
│       │   │       └── CategoryArticleItem × N
│       │   ├── PinnedDocs (v-if 有数据)
│       │   ├── TodoPanel (v-if 有数据)
│       │   └── DailyQuote
│       │       └── InspirationFavorite
│       └── Section 4 [洞察]
│           ├── InsightsCard × N (lazy)
│           │   └── ChartAdapter
│           └── UpdateLogCard (v-if 有新版本)
├── Sidebar
│   ├── HeaderAvatarMenu
│   ├── CategoriesTree
│   ├── PinnedDocsQuick
│   ├── RecycleBinEntry
│   └── SettingsGear
├── SectionNav
├── QuickActionFab
│   └── QuickActions
└── FTUEBubble (v-if 有 pending hint)
```

---

## 附录 B 字符串资源清单

### B.1 zh-CN/hub.ts 完整模板

```ts
export default {
  hub: {
    meta: {
      title: 'InkForge — 首页',
      description: '你的写作项目首页',
    },
    sidebar: {
      collapse: '收起侧边栏',
      expand: '展开侧边栏',
      files: '文件',
      recycle_bin: '回收站',
      settings: '设置',
      trashed_count: '{count} 项',
    },
    hero: {
      title: '欢迎回来',
      subtitle_with_streak: '已连续写作 {days} 天',
      subtitle_no_streak: '开始写作，记录你的连续天数',
      continue_cta: '继续创作《{title}》',
      new_cta: '开始新文章',
      chart_aria_label: '最近 7 天写作字数柱状图',
      goal_badge_reached: '今日目标已达成',
    },
    recent: {
      title: '最近编辑',
      see_all: '查看全部',
      empty: '最近没有文章',
      relative_just_now: '刚刚',
      relative_min_ago: '{min} 分钟前',
      relative_hour_ago: '{hour} 小时前',
      relative_yesterday: '昨天',
      relative_days_ago: '{days} 天前',
    },
    stats: {
      title: '写作概览',
      weekly_words: '本周 {count} 字',
      streak: '连续 {days} 天',
      goal: '目标进度 {percent}%',
      empty: '开始写作以记录统计',
      week: '周',
      month: '月',
    },
    templates: {
      title: '模板',
      use: '使用',
      empty: '暂无模板',
      see_all: '查看全部',
    },
    drafts: {
      title: '草稿',
      empty: '暂无草稿',
      expiring: '即将过期',
      expired_n_days: '{n} 天未更新',
    },
    assets: {
      title: '素材',
      empty: '素材库为空',
      orphans: '有 {n} 个孤儿素材',
      storage: '占用 {size}',
    },
    categories: {
      title: '分类',
      empty: '尚无分类',
      expand: '展开',
      collapse: '折叠',
      new: '新建分类',
      articles_in: '分类 {name} 下的文章',
    },
    pinned: {
      title: '固定',
      empty: '暂无固定',
    },
    todo: {
      title: '未完成',
      empty: '暂无未完成文档',
    },
    inspiration: {
      title: '今日引言',
      refresh: '换一条',
      favorite: '收藏',
      unfavorite: '取消收藏',
      source_user: '来自《{title}》',
      source_local: '本地',
      source_ai: 'AI 生成',
    },
    insights: {
      title: '数据洞察',
      empty: '数据准备中',
      see_all: '查看全部洞察',
      csv_export: '导出 CSV',
    },
    update: {
      title: '更新可用',
      version_available: '新版本 {version} 可用',
      release_notes: '查看更新日志',
      dismiss: '稍后再说',
    },
    fab: {
      open: '展开快速操作',
      close: '关闭',
      new_blank: '新建空白文档',
      from_template: '从模板创建',
      import: '导入文档',
    },
    ftue: {
      fab_hint: '点击这里快速新建文档',
      hero_hint: '这里展示你的写作流与继续入口',
      sidebar_hint: '可随时隐藏侧边栏',
      dismiss: '知道了',
      disable_all: '再也不显示引导',
    },
    error: {
      card_failed: '卡片加载失败',
      retry: '重试',
      report: '上报问题',
    },
    empty: {
      hero: '尚无写作记录，开始第一篇吧',
      recent: '最近没有文章',
      stats: '开始写作以记录统计',
      draft: '暂无草稿',
      asset: '素材库为空',
      category: '尚无分类',
      todo: '暂无未完成文档',
      insight: '数据准备中',
    },
    account: {
      manage: '管理账户',
      settings: '设置',
      logout: '退出',
      switch_blocked_autosave_failed: '自动保存失败，请先保存后再切换账户',
    },
  },
}
```

### B.2 en-US/hub.ts 完整模板

```ts
export default {
  hub: {
    meta: {
      title: 'InkForge — Home',
      description: 'Your writing project home',
    },
    sidebar: {
      collapse: 'Collapse sidebar',
      expand: 'Expand sidebar',
      files: 'Files',
      recycle_bin: 'Recycle Bin',
      settings: 'Settings',
      trashed_count: '{count} items',
    },
    hero: {
      title: 'Welcome back',
      subtitle_with_streak: '{days}-day streak',
      subtitle_no_streak: 'Start writing to build a streak',
      continue_cta: 'Continue "{title}"',
      new_cta: 'Start a new article',
      chart_aria_label: 'Bar chart of word count for the last 7 days',
      goal_badge_reached: "Today's goal reached",
    },
    recent: {
      title: 'Recent',
      see_all: 'See all',
      empty: 'No recent articles',
      relative_just_now: 'just now',
      relative_min_ago: '{min} min ago',
      relative_hour_ago: '{hour}h ago',
      relative_yesterday: 'yesterday',
      relative_days_ago: '{days}d ago',
    },
    stats: {
      title: 'Writing overview',
      weekly_words: '{count} words this week',
      streak: '{days}-day streak',
      goal: '{percent}% of goal',
      empty: 'Start writing to see stats',
      week: 'Week',
      month: 'Month',
    },
    templates: {
      title: 'Templates',
      use: 'Use',
      empty: 'No templates',
      see_all: 'See all',
    },
    drafts: {
      title: 'Drafts',
      empty: 'No drafts',
      expiring: 'Expiring soon',
      expired_n_days: '{n} days without update',
    },
    assets: {
      title: 'Assets',
      empty: 'Asset library is empty',
      orphans: '{n} orphan assets',
      storage: '{size} used',
    },
    categories: {
      title: 'Categories',
      empty: 'No categories',
      expand: 'Expand',
      collapse: 'Collapse',
      new: 'New category',
      articles_in: 'Articles in {name}',
    },
    pinned: {
      title: 'Pinned',
      empty: 'Nothing pinned',
    },
    todo: {
      title: 'Todo',
      empty: 'No unfinished documents',
    },
    inspiration: {
      title: "Today's quote",
      refresh: 'Refresh',
      favorite: 'Favorite',
      unfavorite: 'Unfavorite',
      source_user: 'From "{title}"',
      source_local: 'Local',
      source_ai: 'AI-generated',
    },
    insights: {
      title: 'Insights',
      empty: 'Preparing data',
      see_all: 'See all insights',
      csv_export: 'Export CSV',
    },
    update: {
      title: 'Update available',
      version_available: 'Version {version} is available',
      release_notes: 'View release notes',
      dismiss: 'Later',
    },
    fab: {
      open: 'Open quick actions',
      close: 'Close',
      new_blank: 'New blank document',
      from_template: 'New from template',
      import: 'Import document',
    },
    ftue: {
      fab_hint: 'Click here to quickly create new documents',
      hero_hint: 'This shows your writing flow and continue entry',
      sidebar_hint: 'You can hide the sidebar anytime',
      dismiss: 'Got it',
      disable_all: 'Never show hints',
    },
    error: {
      card_failed: 'Failed to load card',
      retry: 'Retry',
      report: 'Report',
    },
    empty: {
      hero: 'No writing yet. Start your first article.',
      recent: 'No recent articles',
      stats: 'Start writing to see stats',
      draft: 'No drafts',
      asset: 'Asset library is empty',
      category: 'No categories',
      todo: 'No unfinished documents',
      insight: 'Preparing data',
    },
    account: {
      manage: 'Manage accounts',
      settings: 'Settings',
      logout: 'Log out',
      switch_blocked_autosave_failed: 'Autosave failed. Save before switching accounts.',
    },
  },
}
```

---

## 附录 C CSS Variable 清单

```css
:root {
  /* 布局 */
  --hub-sidebar-width: 240px;
  --hub-sidebar-collapsed-width: 56px;
  --hub-grid-gap: 20px;
  --hub-grid-padding: 32px;
  --hub-card-padding-sm: 16px;
  --hub-card-padding-md: 20px;
  --hub-card-padding-lg: 24px;
  --hub-card-min-height: 160px;
  --hub-card-radius: 12px;
  --hub-element-radius: 8px;
  --hub-fab-offset: 24px;

  /* 颜色 */
  --hub-bg: var(--color-surface);
  --hub-card-bg: var(--color-surface-elevated);
  --hub-card-border: var(--color-border);
  --hub-card-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  --hub-title: var(--color-heading);
  --hub-body: var(--color-text);
  --hub-muted: var(--color-text-muted);
  --hub-accent: var(--color-brand);
  --hub-accent-hover: var(--color-brand-hover);
  --hub-danger: #D32F2F;
  --hub-success: #2E7D32;

  /* 字体 */
  --hub-font-family: var(--app-font-family);
  --hub-font-size-sm: 12px;
  --hub-font-size-md: 14px;
  --hub-font-size-lg: 16px;
  --hub-font-size-title: 18px;
  --hub-font-weight-heading: 600;

  /* 动效 */
  --hub-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --hub-transition-enter: 80ms var(--hub-ease);
  --hub-transition-exit: 120ms var(--hub-ease);
  --hub-transition-page: 240ms var(--hub-ease);
  --hub-transition-fab: 180ms var(--hub-ease);
  --hub-transition-sidebar: 200ms var(--hub-ease);

  /* z-index */
  --hub-z-sidebar: 10;
  --hub-z-section-nav: 15;
  --hub-z-fab: 20;
  --hub-z-ftue: 30;
  --hub-z-modal: 40;
}

[data-theme='dark'] {
  --hub-card-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  --hub-card-border: rgba(255, 255, 255, 0.08);
}
[data-theme='eye-care'] {
  --hub-bg: #F5F0E6;
  --hub-card-bg: #FAF6EC;
  --hub-accent: #AD3838;
}
[data-theme='dark-red'] {
  --hub-bg: #1A0000;
  --hub-card-bg: #260000;
  --hub-accent: #FF6060;
  --hub-title: #FFDDDD;
  --hub-body: #FFCCCC;
}
```

---

## 附录 D 错误码与日志示例

### D.1 错误码表

| Code | Severity | 含义 | 恢复策略 |
|---|---|---|---|
| HUB-E-001 | info | FTUE 气泡未找到锚点 | 跳过本次气泡 |
| HUB-E-002 | warning | 某卡片首次加载超时 | 显示重试按钮 |
| HUB-E-003 | warning | 图表库加载失败 | 回退为简单柱状 |
| HUB-E-004 | error | Store 断链 | 显示"数据加载异常" |
| HUB-E-005 | error | IndexedDB 读失败 | 走错误边界 UI |
| HUB-E-006 | data-risk | Profile 解锁失败 | 跳转 ProfileUnlock |
| HUB-E-007 | data-risk | Autosave 失败阻止切换 | 显示切换禁止提示 |

### D.2 日志示例

```json
{"level":"info","code":"HUB-E-001","message":"FTUE anchor not found","hintId":"ftue.fab.first-time","ts":1712700000000}
{"level":"warning","code":"HUB-E-002","message":"Card load timeout","card":"insights","durationMs":620,"ts":1712700010000}
{"level":"error","code":"HUB-E-004","message":"Store reactive chain broken","store":"articles","ts":1712700030000}
{"level":"data-risk","code":"HUB-E-007","message":"Autosave failed, blocking profile switch","currentProfile":"p-1","attemptedProfile":"p-2","ts":1712700050000}
```

所有错误必须带 `code` + `ts` + `profileId`（若有）。

---

## 终章 · 工程交付清单

本 Spec 的交付完成意味着以下全部就绪：

1. `src/views/hub/HubPage.vue` 可运行
2. 23 个 Hub 组件全部实现
3. useHubStore + 10 个关联 Store 全部接通
4. 8 个 Composable 全部可用
5. `src/services/hub/` 下 6 个 service 全部实现
6. 40+ 个 E2E 测试全部通过
7. 6 个单元测试 suite 全部通过
8. Lighthouse Performance > 80
9. i18n 双语资源完整
10. 4 主题视觉验证通过
11. `gitnexus_detect_changes` 确认影响范围在预期内
12. 与 `02-prd-hub.md` 的 25+ 验收项完全对齐

以上即 Hub 首页布局与组件工程规范 v2.1.0 的完整内容。
