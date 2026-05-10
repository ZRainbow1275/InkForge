# 11 — Document Lifecycle Spec（生命周期 FSM / Scope / Frontmatter / DB 一体化）

> 文档类型: Spec
> 阶段: Phase 1（基础层 · 第二层）
> 依赖: 10-markdown-authority-spec.md
> 被依赖: 12（权限）/ 15（同步）/ 17（崩溃恢复）/ 19（账号多端）/ 25（回收站）/ 29（搜索）/ 31（版本）/ 36（Insights）/ 42（导出）/ 52（UI：Workstation 列表）/ 59（备份/归档）
> 来源决策: Part 1 §4（域 A / 域 C / 域 F），R-03、R-04、R-05、R-16、R-17、R-18
> 来源问卷: L1-10 ~ L1-14（生命周期）, L1-15 ~ L1-18（分类/标签）, L1-19 ~ L1-22（账号/工作区）, L1-23 ~ L1-27（历史/版本）, L1-41 ~ L1-44（Scope 层级）, T02-01 ~ T02-17（Hub / Workstation）, T07-01 ~ T07-20（设置）, F-01 ~ F-09（增强：生命周期/工作区/状态栏）, X-03, X-05, X-08
> 权威来源: 最新日期决策文档（本 Spec）为唯一真值；IndexedDB schema 随本文档演进
> 创建日期: 2026-04-21
> 最后更新: —
> 铁律遵循: R-01（Markdown 权威）, R-03（状态 6 态）, R-04（Scope 5 层）, R-05（frontmatter 作为合同）, R-16（不可丢失）, R-17（回收站 30 天）, R-18（版本快照策略）

---

## 2026-04-22 Wave 1 代码真相补注

- 当前代码中，`EditedContent` 与 `Article` 仍是两层并存模型：前者保存编辑态正文/版本，后者提供 Hub 列表、摘要、字数与基础元数据。
- 自 2026-04-22 起，`stores/editor.ts` 已在成功持久化正文或切换当前版本后同步更新 `article.rawContent/title` 快照，因此 Workstation 已保存正文会真实回流到 Hub 首页与写作目标统计。
- 自 2026-04-22 起，`ARTICLE_STATUS` 已新增增量态 `draft`：Hub 的空白创建 / 模板创建会直接写入 `draft`，而编辑器在标题或正文真正持久化回 `article` 快照时，会把 legacy `new/read` 文章提升为 `draft`。
- 当前实现仍保留 `selectArticle()` 的旧兼容逻辑：仅 `NEW -> READ` 会在纯选中动作里自动发生；`DRAFT` 不会被二次选中降级或升成其他状态。
- 当前运行时 UI 仍只显式消费 `draft / new / read / processed` 这组兼容态；本 spec 定义的完整六态 `draft / writing / under_review / ready_to_publish / published / archived` 仍属于目标契约，不能误写成已落地。
- 当前 `Workstation` 里的文稿状态 badge 是 lifecycle 导航锚点，而不是状态机操控器：`draft` 打开 `/drafts`，其他兼容态回 Hub；点击前会 best-effort flush 当前编辑内容。
- 这意味着 Lifecycle 视角下的“编辑完成 -> 首页可见”副作用已经落地一条真实链路，但本 Spec 更完整的 Scope / 回收站 / 多工作区 / lifecycle FSM 仍需按后续章节继续实现。

---

## 目录

- §1 背景与目标
- §2 范围与边界
- §3 顶层模型：5 层 Scope
- §4 DocumentLifecycle FSM（6 态）
- §5 Frontmatter 合同（与 10-spec §6 对齐 + 扩展）
- §6 IndexedDB Schema 契约（Dexie v3）
- §7 分类 / 标签 / 收藏 的数据模型
- §8 回收站与软删除
- §9 版本（Version）模型
- §10 账号 / 工作区 / 文档 / 版本的归属关系
- §11 状态转换与副作用合同
- §12 迁移契约（v2.0 → v2.1）
- §13 一致性不变量（Invariants）
- §14 错误语义与降级契约
- §15 性能 SLO 对齐
- §16 验收矩阵
- §17 权威来源登记表

---

## §1 背景与目标

### 1.1 问题背景

InkForge v2.0 的数据模型事实：
- 文章只有"活着 / 硬删除"二元状态，无生命周期
- 无账号隔离（浏览器 Profile 共享一个 IndexedDB）
- "分类"以字符串字段存储，不可多选、无层级、无颜色
- 无"工作区"概念；所有文章共享一个 root
- 删除即清空；无回收站；无撤销窗口
- 版本只有"手动存档"一个触发器，无自动节律

用户在问卷里重新定义了以下 7 个维度（L1-10~L1-44）：
1. **生命周期**：6 态 FSM（草稿 → 写作 → 待审 → 待发布 → 已发布 → 已归档）
2. **Scope 层级**：Device / Account / Workspace / Document / Version 五层
3. **分类**：多选 + 颜色 + 层级（最多 3 层）
4. **标签**：扁平多对多 + 使用计数
5. **收藏**：单独字段（非标签的一种）
6. **回收站**：30 天软删除，可还原
7. **版本**：自动（15min 节律）+ 手动（命名快照）双通道，上限 999

本 Spec 的使命：**把这 7 个维度 + frontmatter + DB 表 + FSM 状态机固化为单一契约**，所有其他 Spec 只能引用，不能重新定义。

### 1.2 目标

- 定义 5 层 Scope 的数据边界与隔离策略
- 定义 DocumentLifecycle 6 态 FSM（状态 × 转换 × 副作用 × 可观测事件）
- 冻结 IndexedDB 13 张表的 schema 契约
- 明确 frontmatter 与 DB 镜像字段的双写合同
- 为回收站 / 版本 / 归档 / 分类 / 标签 / 收藏 提供统一数据模型
- 为上层（Workstation 列表、Insights、搜索、导出、同步）提供查询契约

### 1.3 核心口号

> **"一份文档的身份由 Scope 决定，生命由 FSM 决定，内容由 Markdown 决定，元数据由 frontmatter 决定。"**

---

## §2 范围与边界

### 2.1 本 Spec 覆盖

- 5 层 Scope（Device / Account / Workspace / Document / Version）的定义
- 6 态 DocumentLifecycle 的完整 FSM（转换条件 / 副作用 / 守卫）
- IndexedDB 13 张表的完整 schema + 索引
- frontmatter 与 DB 字段的 32 条双写规则
- 分类（多选 + 层级）/ 标签（扁平）/ 收藏 / 置顶 / 颜色标签 的数据结构
- 回收站的 TTL 策略与还原契约
- 版本（自动 / 手动）的触发规则与 999 上限策略
- v2.0 → v2.1 迁移契约

### 2.2 本 Spec 不覆盖（由其他 Spec 负责）

| 外包内容 | 负责 Spec |
|---------|----------|
| Markdown 内容如何解析 / 序列化 | 10-markdown-authority-spec.md |
| 分类颜色如何在 UI 可视化 | 52-workstation-list-spec.md |
| FSM 状态栏图标与动画 | 14-statusbar-navigation-spec.md |
| 同步时的 Last-Write-Wins 仲裁 | 15-sync-spec.md |
| 版本 diff 与恢复 UI | 31-history-version-spec.md |
| 搜索如何消费 frontmatter | 29-search-spec.md |
| 崩溃后如何重建 Draft | 17-crash-recovery-spec.md |
| 权限：哪些转换需要二次确认 | 12-permission-spec.md |

### 2.3 本 Spec 不承诺的

- 不规定 UI 布局（那是 T02 / T09 的事）
- 不规定云端存储 schema（那是 15-sync-spec.md 的事，本 Spec 只管本地）
- 不规定 AI 消费这些字段的格式（那是 Part 2 H 域的事）

---

## §3 顶层模型：5 层 Scope

### 3.1 定义（R-04 的详细展开）

```
┌──────────────────────── Scope 0: Device ────────────────────────┐
│  一台物理设备 = 一个 InkForge 安装 = 一个操作系统账号的浏览器     │
│  边界: 浏览器 Profile（Chrome Profile 1 与 Profile 2 各自独立）   │
│  标识: Profile 内的 `device_uuid`（首次启动生成，持久化 IDB）     │
│                                                                   │
│  ┌──────────────── Scope 1: Account ────────────────────────┐   │
│  │  一个 InkForge 账号 = 一套 IndexedDB 数据库                │   │
│  │  边界: IndexedDB 名称前缀 `inkforge_acct_{accountId}_`      │   │
│  │  标识: `accountId` (UUID v4)                               │   │
│  │  多账号: 单设备可有 N 个账号，切换账号即切换 IDB prefix     │   │
│  │                                                             │   │
│  │  ┌────────── Scope 2: Workspace ──────────────────────┐   │   │
│  │  │  一个工作区 = 一棵文档树 + 一套设置覆盖              │   │   │
│  │  │  边界: `workspaceId` 分区键                          │   │   │
│  │  │  默认: 每账号自带一个 "Default" 工作区                │   │   │
│  │  │  最多: 32 个工作区/账号                              │   │   │
│  │  │                                                       │   │   │
│  │  │  ┌──────── Scope 3: Document ──────────────────┐   │   │   │
│  │  │  │  一份文档 = 一条 articles 记录 + 附件 + 版本  │   │   │   │
│  │  │  │  边界: `articleId` (UUID v4)                  │   │   │   │
│  │  │  │  唯一性: (workspaceId, path) 唯一             │   │   │   │
│  │  │  │                                                │   │   │   │
│  │  │  │  ┌────── Scope 4: Version ─────────────┐    │   │   │   │
│  │  │  │  │  一次快照 = 一条 versions 记录        │    │   │   │   │
│  │  │  │  │  边界: `versionId` (UUID v4)          │    │   │   │   │
│  │  │  │  │  最多: 999 版本/文档（超出滚动淘汰）    │    │   │   │   │
│  │  │  │  └────────────────────────────────────┘    │   │   │   │
│  │  │  └──────────────────────────────────────────┘   │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Scope 的五条不变量

| # | 不变量 | 含义 |
|---|-------|-----|
| S-01 | **Profile 隔离** | 两个 Chrome Profile 的数据永不互通（浏览器保证，不可跨越） |
| S-02 | **Account 隔离** | 同 Profile 下，不同 accountId 的 IDB 名称不重叠，不可相互读取 |
| S-03 | **Workspace 分区** | 所有可查询字段（articles / tags / categories）均以 workspaceId 分区，跨区查询显式声明 |
| S-04 | **Document 唯一** | `(accountId, workspaceId, articleId)` 三元组唯一 |
| S-05 | **Version 从属** | 一个 version 必须属于且仅属于一个 document，document 删除则级联删除 |

### 3.3 跨 Scope 操作的白名单

默认禁止跨 Scope 操作，除非显式在本表：

| 操作 | 起 Scope | 止 Scope | 条件 |
|-----|---------|---------|------|
| 导出文档 | Document | Device（文件系统） | 需 Windows Hello 确认（R-19） |
| 移动文档 | Document(A) | Document(B) | 仅同 workspace 内；跨 workspace 用"复制" |
| 复制文档 | Document(A) | Document(B) | 允许跨 workspace（同账号内）；copy-on-write，新 UUID |
| 账号切换 | Account(A) | Account(B) | 仅允许切换，不传输数据；账号间数据永不互通 |
| 备份 | Account | Device | 导出整个账号为 `.inkforge` 包（R-20） |

### 3.4 accountId / workspaceId / articleId 的命名空间

```typescript
// src/core/identity/id.ts
export type AccountId   = string  // UUID v4, e.g. "a1b2c3d4-..."
export type WorkspaceId = string  // UUID v4; 默认 workspace 的 ID 也是 UUID，不是字面量 "default"
export type ArticleId   = string  // UUID v4
export type VersionId   = string  // UUID v4
export type AttachmentId = string // UUID v4
export type TagId       = string  // UUID v4
export type CategoryId  = string  // UUID v4

// IDB 名称构造（S-02 不变量）
export const idbName = (accountId: AccountId): string =>
  `inkforge_acct_${accountId}`
```

**关键决策**：default workspace 的 ID 是 UUID，**不是**字面量 `"default"`，否则多账号导入 / 合并时会冲突。

---

## §4 DocumentLifecycle FSM（6 态）

> Future Design / Not Yet Implemented：本节描述的是 `0420` 目标态生命周期合同，不是当前运行时代码合同。当前真实代码仍以 `draft / new / read / processed` 四态兼容模型运行；若直接按本节状态枚举回写到现有 `ArticleStatusSchema`，会与当前实现冲突。

### 4.1 状态枚举（R-03）

```typescript
// src/core/lifecycle/state.ts
export const LifecycleStates = [
  'draft',              // 草稿：刚创建，未到质量门槛
  'writing',            // 写作中：有实质内容，还在迭代
  'under_review',       // 待审：自审/同行审阅中
  'ready_to_publish',   // 待发布：内容冻结，等待导出
  'published',          // 已发布：导出过至少一个平台
  'archived',           // 已归档：不再修改，只读
] as const
export type LifecycleState = typeof LifecycleStates[number]
```

### 4.2 状态转换图

```
                  ┌──────────────────────────────┐
                  │                              │
                  ▼                              │
         ┌────────────────┐                      │
    new ─▶  draft (初始)  │                      │
         └────┬───────────┘                      │
              │ hasSubstance() = true            │
              ▼                                   │
         ┌────────────────┐                      │
         │    writing     │◀─────────────────────┤
         └─┬──────────────┘                      │
           │ userMarkReview()                    │
           ▼                                     │
         ┌────────────────┐                      │
         │  under_review  │                      │
         └─┬──────────────┘                      │
           │ userMarkReady() / passReview()      │
           ▼                                     │
         ┌────────────────┐                      │
         │ ready_to_publish│─────┐               │
         └─┬──────────────┘     │               │
           │ exportSuccess()    │ userRevert()  │
           ▼                     ▼               │
         ┌────────────────┐                      │
         │   published    │──────────────────────┘
         └─┬──────────────┘
           │ userArchive() / autoArchive()
           ▼
         ┌────────────────┐
         │   archived     │   (终态，只读；可 unarchive → writing)
         └────────────────┘
```

转换白名单（非白名单转换 FSM 拒绝）：

| From | To | 触发 | 守卫 | 副作用 |
|------|----|------|------|-------|
| (new) | draft | 创建文档 | — | 写 articles 记录；emit `doc.created` |
| draft | writing | 自动（内容达门槛） | `wordCount ≥ 50 OR charCount ≥ 200` | emit `doc.entered_writing`；首次出现时创建 version（自动快照） |
| writing | under_review | 用户手动点击 | `titleNonEmpty && markdownNonEmpty` | emit `doc.under_review`；创建 version（命名："送审"） |
| under_review | writing | 用户放弃审阅 | — | emit `doc.back_to_writing` |
| under_review | ready_to_publish | 用户确认 | `noBlockingIssues()` | 创建 version（命名："定稿"）；emit `doc.ready` |
| ready_to_publish | published | 导出成功 | `exportResult.ok === true` | 写 `publishedAt`；emit `doc.published`；Insights 计数 +1 |
| ready_to_publish | writing | 用户主动退回 | 需 Windows Hello | emit `doc.revert_to_writing` |
| published | archived | 用户归档 | 需 Windows Hello | emit `doc.archived`；从主 Workstation 列表隐藏 |
| archived | writing | 用户 unarchive | 需 Windows Hello | emit `doc.reactivated` |
| 任意 | trashed\* | 删除 | 需 Windows Hello | 写 `deletedAt`；30 天 TTL；emit `doc.trashed` |

\* `trashed` **不是** FSM 中的"状态"，而是**正交**的标记位 `deletedAt != null`（见 §8）。

### 4.3 守卫实现契约

```typescript
// src/core/lifecycle/guards.ts
export interface Guard {
  name: string
  check(article: Article): { ok: boolean; reason?: string }
}

export const G_hasSubstance: Guard = {
  name: 'hasSubstance',
  check: (a) => {
    const wc = wordCount(a.markdownSource)
    const cc = charCount(a.markdownSource)
    return (wc >= 50 || cc >= 200)
      ? { ok: true }
      : { ok: false, reason: `need ≥50 words or ≥200 chars, got ${wc}w/${cc}c` }
  },
}

export const G_titleAndContent: Guard = {
  name: 'titleAndContent',
  check: (a) => {
    if (!a.title?.trim()) return { ok: false, reason: 'title empty' }
    if (!a.markdownSource?.trim()) return { ok: false, reason: 'content empty' }
    return { ok: true }
  },
}

export const G_noBlockingIssues: Guard = {
  name: 'noBlockingIssues',
  check: (a) => {
    // 规则：frontmatter 校验通过 + 无未解决 TODO 注释 + hash 一致
    const fm = parseFrontmatter(a.markdownSource)
    if (!fm.ok) return { ok: false, reason: `frontmatter invalid: ${fm.error}` }
    return { ok: true }
  },
}
```

### 4.4 FSM 引擎

```typescript
// src/core/lifecycle/fsm.ts
export type Transition = {
  from: LifecycleState
  to: LifecycleState
  trigger: string          // "auto" | "user:markReview" | "system:exportSuccess" | ...
  guards: Guard[]
  requiresAuth: boolean    // 是否需要 Windows Hello
  sideEffects: Array<(a: Article, ctx: TransitionCtx) => Promise<void>>
  emits: string[]          // 事件名列表
}

export class LifecycleFSM {
  private transitions: Transition[] = LIFECYCLE_TRANSITIONS

  async transition(
    article: Article,
    to: LifecycleState,
    trigger: string,
    ctx: TransitionCtx,
  ): Promise<{ ok: boolean; reason?: string; article?: Article }> {
    const t = this.transitions.find(
      x => x.from === article.status && x.to === to && x.trigger === trigger
    )
    if (!t) return { ok: false, reason: `no transition ${article.status}→${to} on ${trigger}` }

    for (const g of t.guards) {
      const r = g.check(article)
      if (!r.ok) return { ok: false, reason: `guard ${g.name}: ${r.reason}` }
    }

    if (t.requiresAuth) {
      const authed = await ctx.auth.verifyWindowsHello()
      if (!authed) return { ok: false, reason: 'auth denied' }
    }

    const updated = { ...article, status: to, updatedAt: Date.now() }
    for (const fx of t.sideEffects) await fx(updated, ctx)
    for (const ev of t.emits) ctx.bus.emit(ev, { articleId: updated.id, from: article.status, to })

    return { ok: true, article: updated }
  }
}
```

### 4.5 状态在 Workstation 列表的默认可见性

| 状态 | Workstation 主列表 | 回收站列表 | 归档列表 |
|-----|------------------|----------|---------|
| draft | 显示 | — | — |
| writing | 显示（高亮） | — | — |
| under_review | 显示（带徽章） | — | — |
| ready_to_publish | 显示（带徽章） | — | — |
| published | 显示（置底或折叠） | — | — |
| archived | 隐藏（除非开"显示归档"） | — | 显示 |
| trashed 标记 | 隐藏 | 显示 | 隐藏 |

---

## §5 Frontmatter 合同（与 10-spec §6 对齐 + 扩展）

### 5.1 完整字段 schema（Zod）

```typescript
// src/core/authority/frontmatter-schema.ts
import { z } from 'zod'

export const ColorSwatchSchema = z.enum([
  'red','orange','amber','yellow','lime','green','teal','cyan','sky','blue',
  'indigo','violet','purple','fuchsia','pink','rose','slate','gray','zinc','neutral'
])

export const FrontmatterSchema = z.object({
  // —— 核心身份 —— //
  title: z.string().min(1).max(500),
  summary: z.string().max(2000).nullable().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(120).nullable().optional(),

  // —— 生命周期 —— //
  status: z.enum([
    'draft','writing','under_review','ready_to_publish','published','archived'
  ]).default('draft'),
  publishedAt: z.number().int().nonnegative().nullable().optional(),
  archivedAt: z.number().int().nonnegative().nullable().optional(),

  // —— 分类与标签 —— //
  categories: z.array(z.string().uuid()).max(5).default([]),  // categoryId 列表
  tags: z.array(z.string()).max(64).default([]),               // tag 名列表（扁平）
  color: ColorSwatchSchema.nullable().optional(),              // 文档颜色标签

  // —— 收藏与置顶 —— //
  favorite: z.boolean().default(false),
  pinned: z.boolean().default(false),

  // —— 作者与时间戳 —— //
  author: z.string().max(100).nullable().optional(),
  createdAt: z.number().int().nonnegative(),     // epoch ms
  updatedAt: z.number().int().nonnegative(),     // epoch ms

  // —— 导出记录（R-14） —— //
  exports: z.array(z.object({
    target: z.enum(['wechat','zhihu','redbook','html','markdown','pdf']),
    exportedAt: z.number().int().nonnegative(),
    filename: z.string().max(255),
    hash: z.string().regex(/^[a-f0-9]{64}$/),   // SHA-256 of exported payload
  })).default([]),

  // —— InkForge 私有命名空间 —— //
  inkforge: z.object({
    schema_version: z.literal(1).default(1),
    authority: z.literal('markdown').default('markdown'),
    portability: z.enum(['standard','mixed','inkforge-only']).default('standard'),
    extensions: z.array(z.string()).default([]),      // 使用的扩展语法列表
    workspaceId: z.string().uuid(),                    // 归属工作区（强制）
    lastEditorCursor: z.object({                       // 上次光标位置（用于恢复）
      line: z.number().int().nonnegative(),
      column: z.number().int().nonnegative(),
    }).nullable().optional(),
  }).default({}),
}).strict()  // 严格模式：未知字段触发警告但保留

export type Frontmatter = z.infer<typeof FrontmatterSchema>
```

### 5.2 DB 镜像字段清单（I-04 不变量）

这些字段**必须**在 `articles` 表中有独立列，以便建索引与快速查询；frontmatter 为真，DB 为镜像：

| frontmatter 字段 | DB 字段 | 索引 | 说明 |
|-----------------|--------|------|-----|
| `title` | `articles.title` | 是（全文） | 列表渲染需要，不查 MD |
| `status` | `articles.status` | 是 | FSM + 列表筛选 |
| `tags` | `articles.tagIds[]` | multi-entry | 多对多查询入口 |
| `categories` | `articles.categoryIds[]` | multi-entry | 多对多查询入口 |
| `favorite` | `articles.favorite` | 是 | 收藏列表筛选 |
| `pinned` | `articles.pinned` | 是 | 列表排序 |
| `color` | `articles.color` | 否 | UI 染色 |
| `publishedAt` | `articles.publishedAt` | 是 | 已发布时间排序 |
| `archivedAt` | `articles.archivedAt` | 是 | 归档时间 |
| `inkforge.workspaceId` | `articles.workspaceId` | **compound**（workspaceId + status） | 分区键 |
| `createdAt` | `articles.createdAt` | 是 | 默认排序 |
| `updatedAt` | `articles.updatedAt` | 是 | 最近编辑排序 |

### 5.3 双写时序合同

```typescript
// src/core/persistence/article-repo.ts
async function saveArticle(a: Article): Promise<void> {
  // 1) 从 markdownSource 解析出 frontmatter（10-spec §6）
  const fm = parseFrontmatter(a.markdownSource)
  if (!fm.ok) throw new FrontmatterInvalidError(fm.error)

  // 2) 确保 DB 镜像字段与 frontmatter 一致（I-04）
  const mirrored: Article = {
    ...a,
    title: fm.data.title,
    status: fm.data.status,
    tagIds: await resolveTagIds(fm.data.tags, a.workspaceId),
    categoryIds: fm.data.categories,
    favorite: fm.data.favorite,
    pinned: fm.data.pinned,
    color: fm.data.color ?? null,
    publishedAt: fm.data.publishedAt ?? null,
    archivedAt: fm.data.archivedAt ?? null,
    workspaceId: fm.data.inkforge.workspaceId,
    createdAt: fm.data.createdAt,
    updatedAt: Date.now(),
    sourceHash: sha256(a.markdownSource),
  }

  // 3) 事务性写入
  await db.transaction('rw', [db.articles, db.tags], async () => {
    await db.articles.put(mirrored)
    await updateTagUsageCounts(mirrored)  // 更新 tags 表的 usage_count
  })
}
```

---

## §6 IndexedDB Schema 契约（Dexie v3）

### 6.1 表清单（13 张）

| # | 表名 | 主键 | 用途 | Scope |
|---|-----|-----|-----|------|
| 1 | `accounts` | `id` | 账号元数据（仅当前 Profile 登录过的） | Device |
| 2 | `workspaces` | `id` | 工作区 | Account |
| 3 | `articles` | `id` | 文档主表 | Workspace |
| 4 | `versions` | `id` | 版本快照 | Document |
| 5 | `attachments` | `id` | 附件二进制 | Document |
| 6 | `tags` | `id` | 标签字典 | Workspace |
| 7 | `categories` | `id` | 分类字典（层级） | Workspace |
| 8 | `settings_global` | `key` | 全局设置键值对 | Account |
| 9 | `settings_workspace` | `key` | 工作区级覆盖 | Workspace |
| 10 | `settings_document` | `[articleId+key]` | 文档级覆盖 | Document |
| 11 | `drafts` | `articleId` | 未持久化的草稿（R-17 崩溃恢复） | Document |
| 12 | `events` | `++id` | 审计日志 | Account |
| 13 | `sync_state` | `key` | 同步位点 | Workspace |

### 6.2 核心表详细 schema

```typescript
// src/db/schema.ts
import Dexie, { Table } from 'dexie'

export interface Account {
  id: string                    // UUID
  displayName: string
  createdAt: number
  lastActiveAt: number
  preferredLocale: 'zh-CN' | 'en-US'
  settings: Record<string, unknown>   // 非 serialized 时读 settings_global
}

export interface Workspace {
  id: string                    // UUID
  accountId: string
  name: string
  description: string | null
  rootCategory: string | null   // 默认分类 id
  color: ColorSwatch | null
  order: number                 // 用户排序
  createdAt: number
  updatedAt: number
  archived: boolean             // 工作区级归档
}

export interface Article {
  id: string                    // UUID
  accountId: string             // 冗余，便于跨 workspace 查询
  workspaceId: string

  // —— 权威内容 —— //
  markdownSource: string        // UTF-8 Markdown（含 frontmatter）
  htmlCache: string | null      // 运行时缓存（10-spec §3）
  sourceHash: string            // SHA-256(markdownSource)
  cacheVersion: number
  cacheGeneratedAt: number

  // —— frontmatter 镜像（§5.2） —— //
  title: string
  status: LifecycleState
  tagIds: string[]              // multi-entry
  categoryIds: string[]         // multi-entry
  favorite: boolean
  pinned: boolean
  color: ColorSwatch | null
  publishedAt: number | null
  archivedAt: number | null

  // —— 时间戳 —— //
  createdAt: number
  updatedAt: number
  deletedAt: number | null      // 软删除标记（§8）

  // —— 路径与排序 —— //
  path: string | null           // 虚拟路径 "tech/vue3/intro"（用于文件树）
  orderIndex: number            // 同父下排序

  // —— 统计（由后台任务异步更新） —— //
  stats: {
    wordCount: number
    charCount: number
    readingTime: number         // 分钟
    lastEditedBy: string | null // 设备标识
  }
}

export interface Version {
  id: string                    // UUID
  articleId: string
  parentVersionId: string | null

  kind: 'auto' | 'manual'
  label: string | null          // 手动快照名，如 "送审" / "定稿"
  markdownSource: string        // 完整 MD（非 diff，保证独立可恢复）
  sourceHash: string

  createdAt: number
  createdBy: string             // deviceId / accountId

  // 元信息（便于列表显示，不查 markdown）
  titleAtSnapshot: string
  statusAtSnapshot: LifecycleState
  wordCountAtSnapshot: number
  diffStats: {                  // 相对 parentVersionId
    addedLines: number
    removedLines: number
    changedChars: number
  } | null
}

export interface Attachment {
  id: string
  articleId: string
  filename: string
  mimeType: string
  size: number
  data: Blob                    // IndexedDB Blob
  checksum: string              // SHA-256
  createdAt: number
}

export interface Tag {
  id: string
  workspaceId: string
  name: string                  // 扁平，case-sensitive；归一化由调用方保证
  color: ColorSwatch | null
  usageCount: number            // 引用计数（由 saveArticle 维护）
  createdAt: number
}

export interface Category {
  id: string
  workspaceId: string
  parentId: string | null       // 最多 3 层；depth 由应用层检查
  name: string
  color: ColorSwatch | null
  order: number
  createdAt: number
}

export interface SettingEntry {
  key: string
  value: unknown                // JSON 可序列化
  updatedAt: number
  source: 'default' | 'user' | 'migration'
}

export interface DocumentSettingEntry {
  articleId: string
  key: string
  value: unknown
  updatedAt: number
}

export interface Draft {
  articleId: string
  markdownSource: string
  savedAt: number
  reason: 'auto' | 'blur' | 'crash-hook' | 'explicit'
}

export interface EventEntry {
  id?: number
  ts: number
  accountId: string
  workspaceId: string | null
  type: string                  // "doc.created" | "doc.transitioned" | "export.succeeded" | ...
  payload: Record<string, unknown>
  deviceId: string
}

export interface SyncState {
  key: string                   // 'lastPullAt' | 'lastPushAt' | 'conflictCount'
  value: unknown
  updatedAt: number
}
```

### 6.3 索引定义（Dexie 语法）

```typescript
// src/db/database.ts
export class InkForgeDB extends Dexie {
  accounts!: Table<Account, string>
  workspaces!: Table<Workspace, string>
  articles!: Table<Article, string>
  versions!: Table<Version, string>
  attachments!: Table<Attachment, string>
  tags!: Table<Tag, string>
  categories!: Table<Category, string>
  settings_global!: Table<SettingEntry, string>
  settings_workspace!: Table<SettingEntry, string>
  settings_document!: Table<DocumentSettingEntry, [string, string]>
  drafts!: Table<Draft, string>
  events!: Table<EventEntry, number>
  sync_state!: Table<SyncState, string>

  constructor(accountId: string) {
    super(`inkforge_acct_${accountId}`)
    this.version(3).stores({
      accounts: 'id, lastActiveAt',
      workspaces: 'id, accountId, [accountId+archived], order',
      articles: `
        id,
        workspaceId,
        status,
        favorite,
        pinned,
        deletedAt,
        publishedAt,
        updatedAt,
        createdAt,
        path,
        *tagIds,
        *categoryIds,
        [workspaceId+status],
        [workspaceId+deletedAt],
        [workspaceId+favorite],
        [workspaceId+updatedAt]
      `,
      versions: 'id, articleId, [articleId+createdAt], kind, createdAt',
      attachments: 'id, articleId, checksum',
      tags: 'id, workspaceId, [workspaceId+name], usageCount',
      categories: 'id, workspaceId, parentId, [workspaceId+parentId], order',
      settings_global: 'key, updatedAt',
      settings_workspace: 'key, updatedAt',
      settings_document: '[articleId+key], articleId, updatedAt',
      drafts: 'articleId, savedAt',
      events: '++id, ts, type, accountId, [accountId+ts]',
      sync_state: 'key, updatedAt',
    })
  }
}
```

### 6.4 索引用法白名单

| 查询意图 | 索引 | 示例 |
|---------|-----|-----|
| Workstation 主列表：工作区内所有未删文档按最近编辑 | `[workspaceId+deletedAt]` + filter + `updatedAt` 排序 | — |
| 收藏列表 | `[workspaceId+favorite]` | `where('[workspaceId+favorite]').equals([wsId, 1])` |
| 按状态筛选 | `[workspaceId+status]` | 同上 |
| 按标签查询 | `*tagIds` multi-entry | `where('tagIds').anyOf(tagIds)` |
| 文档的所有版本按时间 | `[articleId+createdAt]` | — |
| 30 天 TTL 清扫 | `deletedAt` | `where('deletedAt').below(cutoff)` |
| 回收站列表 | `[workspaceId+deletedAt]` | `where('deletedAt').above(0)` |

---

## §7 分类 / 标签 / 收藏 的数据模型

### 7.1 分类（Categories）

**特征**：
- 有层级，最多 3 层（L1-17）
- 有颜色
- 文档可属于多个分类（≤5），每个分类可与其他分类交叉（L1-16 选 C）
- 删除分类**不**级联删除文档（文档 categoryIds 中移除该 id）
- 同 workspace 内 (parentId, name) 唯一

**范式**：

```typescript
// 深度检查
async function checkCategoryDepth(cat: Category): Promise<number> {
  let depth = 0
  let current = cat
  while (current.parentId) {
    depth++
    if (depth > 3) throw new CategoryDepthExceededError()
    current = await db.categories.get(current.parentId) as Category
  }
  return depth
}

// 移动分类到新父
async function moveCategory(id: string, newParentId: string | null): Promise<void> {
  // 防环：newParentId 不能是 id 的子孙
  if (newParentId && await isDescendant(newParentId, id)) {
    throw new CategoryCycleError()
  }
  // 检查新深度
  const cat = await db.categories.get(id) as Category
  const hypothetical = { ...cat, parentId: newParentId }
  await checkCategoryDepth(hypothetical)
  // 持久化
  await db.categories.update(id, { parentId: newParentId })
}
```

### 7.2 标签（Tags）

**特征**：
- 扁平，无层级（L1-18 选 B）
- 有颜色
- 文档 ≤64 个标签
- 同 workspace 内 name 唯一（大小写敏感）
- 有 usageCount，用于 Hub 的"热门标签"
- 删除标签 → 从所有文档 tagIds 中移除
- 重命名标签 → 所有引用自动更新（按 id 引用）

**归一化规则**：
- 输入 `"Vue3 "` → trim → `"Vue3"`
- 保留大小写；用户写 "Vue" 和 "vue" 视为不同标签
- 首次使用时自动创建

```typescript
async function resolveTagIds(tagNames: string[], workspaceId: string): Promise<string[]> {
  const normalized = tagNames.map(n => n.trim()).filter(Boolean)
  const ids: string[] = []
  for (const name of normalized) {
    let tag = await db.tags
      .where('[workspaceId+name]').equals([workspaceId, name]).first()
    if (!tag) {
      tag = {
        id: uuid(),
        workspaceId,
        name,
        color: null,
        usageCount: 0,
        createdAt: Date.now(),
      }
      await db.tags.add(tag)
    }
    ids.push(tag.id)
  }
  return ids
}
```

### 7.3 收藏（Favorite）

**特征**：
- 独立布尔字段，**不是**"favorite 标签"
- 位于 `articles.favorite` 与 frontmatter `favorite`
- 快捷键：Ctrl+Shift+F（T03-09）
- Hub 首页有"收藏"区域（T02-03）

### 7.4 置顶（Pinned）

**特征**：
- 独立布尔字段，作用于 Workstation 列表
- 最多 9 个置顶/工作区（UI 限制）
- 置顶排序优先于时间排序

### 7.5 颜色标签（Color）

**特征**：
- 20 色盘（`ColorSwatchSchema`）
- 用于视觉扫描（文件树小色块）
- 与分类颜色正交：分类颜色和文档颜色可同时存在

---

## §8 回收站与软删除

### 8.1 模型

**回收站不是单独的表，而是 `articles.deletedAt != null` 的视图**。

```typescript
export async function trashArticle(id: string, ctx: Ctx): Promise<void> {
  if (!await ctx.auth.verifyWindowsHello()) throw new AuthDeniedError()
  await db.articles.update(id, { deletedAt: Date.now() })
  ctx.bus.emit('doc.trashed', { articleId: id })
}

export async function restoreArticle(id: string): Promise<void> {
  await db.articles.update(id, { deletedAt: null })
  bus.emit('doc.restored', { articleId: id })
}

export async function purgeArticle(id: string, ctx: Ctx): Promise<void> {
  if (!await ctx.auth.verifyWindowsHello()) throw new AuthDeniedError()
  await db.transaction('rw', [db.articles, db.versions, db.attachments], async () => {
    await db.versions.where('articleId').equals(id).delete()
    await db.attachments.where('articleId').equals(id).delete()
    await db.articles.delete(id)
  })
  ctx.bus.emit('doc.purged', { articleId: id })
}
```

### 8.2 TTL 策略（R-17）

- **保留期**：30 天，从 `deletedAt` 起计
- **后台清扫**：每次启动 + 每 6 小时触发一次
- **清扫阈值**：`deletedAt < now - 30*24*3600*1000`
- **清扫前提示**：≥10 条待清扫时，首次启动弹确认框
- **硬删除（immediate purge）**：用户在回收站手动选"彻底删除"，单条 / 批量

### 8.3 回收站的查询契约

```typescript
// 回收站列表（按删除时间倒序）
export async function listTrashed(workspaceId: string): Promise<Article[]> {
  return db.articles
    .where('[workspaceId+deletedAt]')
    .between([workspaceId, 1], [workspaceId, Infinity])
    .reverse()
    .toArray()
}

// 主列表（过滤已删除）
export async function listActive(workspaceId: string): Promise<Article[]> {
  return db.articles
    .where('workspaceId').equals(workspaceId)
    .filter(a => a.deletedAt === null)
    .toArray()
}
```

### 8.4 版本与附件的联动

- 文档软删除时，其 versions / attachments **保留**（以便还原）
- 文档硬删除（purge）时，versions / attachments **级联删除**
- 版本表无独立软删除（版本的生命与文档绑定）

---

## §9 版本（Version）模型

### 9.1 触发规则（R-18）

| 触发器 | 类型 | 条件 | label |
|-------|-----|------|-------|
| 手动快照 | manual | 用户点击"保存版本" | 用户输入（必填，≤80 字） |
| 自动·首次入 writing | auto | FSM `draft → writing` | `"开始写作"` |
| 自动·节律 | auto | 距上一版本 ≥ 15 分钟 **且** 本文档累计变更 ≥ 200 字符 | `null` |
| 自动·状态迁移 | auto | FSM 转到 `under_review / ready_to_publish` | `"送审"` / `"定稿"` |
| 自动·导出成功 | auto | 导出完成（任意平台） | `"导出：{target}"` |
| 自动·每日封顶 | auto | 凌晨 03:00 检查，为当日修改过但未产生版本的文档补一版 | `"每日归档"` |

### 9.2 上限策略

- **上限**：999 版本/文档（L1-24 选 B）
- **溢出策略**：滚动淘汰 —— 淘汰最早的 auto 版本，**永不淘汰 manual 版本**
- **淘汰实现**：
```typescript
async function enforceVersionCap(articleId: string): Promise<void> {
  const CAP = 999
  const count = await db.versions.where('articleId').equals(articleId).count()
  if (count <= CAP) return
  const excess = count - CAP
  const victims = await db.versions
    .where('articleId').equals(articleId)
    .filter(v => v.kind === 'auto')
    .sortBy('createdAt')
  await db.versions.bulkDelete(victims.slice(0, excess).map(v => v.id))
}
```

### 9.3 版本存储格式

- **全量**：每个版本存完整 markdownSource（非 diff），保证独立可恢复（R-16 底线）
- **diff 元信息**：存 `diffStats` 以加速列表显示
- **压缩**：markdownSource 超过 50KB 时 gzip 压缩（透明，读取时自动解压）

### 9.4 版本还原契约

```typescript
export async function restoreVersion(articleId: string, versionId: string): Promise<void> {
  const v = await db.versions.get(versionId)
  if (!v || v.articleId !== articleId) throw new VersionNotFoundError()

  // 还原前先打一个 manual 快照（保护当前内容）
  await createVersion(articleId, 'manual', `还原前备份（自动）`)

  // 写回 articles.markdownSource
  await saveArticle({
    ...(await db.articles.get(articleId)),
    markdownSource: v.markdownSource,
  })

  bus.emit('version.restored', { articleId, versionId })
}
```

### 9.5 版本的 Scope 归属

- 版本**从属于文档**（S-05），删文档则级联删版本
- 版本**不**跨 workspace 移动（移动文档 = 创建新文档 + 保留旧版本）
- 版本**不**同步到云端（15-sync-spec.md 规定：仅最新 markdownSource 同步，版本为本地历史）

---

## §10 账号 / 工作区 / 文档 / 版本的归属关系

### 10.1 实体关系图

```
Account (1) ────< Workspace (N)
                       │
                       ├─< Article (N) ────< Version (M)
                       │                 ├─< Attachment (K)
                       │                 └─< Setting (L)
                       ├─< Category (N)
                       ├─< Tag (N)
                       └─< SyncState (1)

Account (1) ────< Setting (N)
Account (1) ────< Event (N)
```

### 10.2 外键约束（应用层执行，IndexedDB 本身不支持）

| 子表 | 父表 | 行为 |
|-----|-----|-----|
| workspaces.accountId | accounts.id | 应用层保证；删账号 = 销毁整个 IDB，不触发外键 |
| articles.workspaceId | workspaces.id | 工作区归档时文章不级联，显示为"归档工作区"分组 |
| versions.articleId | articles.id | 文档硬删除时级联删除 |
| attachments.articleId | articles.id | 同上 |
| categories.parentId | categories.id | 删除父分类时子分类 parentId 置 null（升到上一层） |
| tags 无父子 | — | — |

### 10.3 账号导入导出（R-20 备份）

- 导出：打包 `inkforge_acct_{id}_*.idb` 所有对象存储为 `.inkforge` 压缩文件
- 导入：检测 `accountId` 冲突，要求用户选择"合并 / 重命名 / 取消"
- 合并策略：按 `articleId` 去重，相同 id 取 `updatedAt` 较新者；tagIds / categoryIds 以被导入账号的映射为准

---

## §11 状态转换与副作用合同

### 11.1 所有副作用的注册表

| Transition | 事件 emit | DB 写 | UI 通知 |
|-----------|----------|------|--------|
| (new) → draft | `doc.created` | articles INSERT | 打开文档 |
| draft → writing | `doc.entered_writing` | articles UPDATE + versions INSERT | StatusBar 图标切换 |
| writing → under_review | `doc.under_review` | 同上 | 列表徽章 |
| under_review → ready_to_publish | `doc.ready` | 同上 | 列表徽章 |
| ready_to_publish → published | `doc.published` | articles UPDATE publishedAt / exports frontmatter append / events INSERT | Toast + Insights 更新 |
| any → trashed（标记） | `doc.trashed` | articles UPDATE deletedAt | 回收站气泡 |
| trashed → 还原 | `doc.restored` | articles UPDATE deletedAt=null | — |
| purge（硬删） | `doc.purged` | articles + versions + attachments DELETE | 批量通知 |

### 11.2 失败隔离

**任一副作用失败不得回滚状态**：
- FSM 转换 = 事务 A（articles.status 更新）
- 副作用 = 事务 B（events / versions / UI 广播）
- A 成功 + B 失败 → 记录 `events.type = 'side_effect_failed'` 但不回退状态
- 原因：状态是用户意图的投影，副作用是衍生观察；回退会制造更多混乱

### 11.3 事件总线消费者

| 事件 | 消费者 | 行为 |
|-----|-------|-----|
| `doc.created` | 搜索索引、Insights、UI 列表 | 增量更新 |
| `doc.published` | Insights、导出历史 UI | 计数 +1 |
| `doc.trashed` / `doc.restored` | Workstation 列表、搜索索引 | 刷新 |
| `doc.purged` | 同上 + 附件清理 | 彻底清除 |
| `version.created` | 历史面板 | 重绘时间轴 |

---

## §12 迁移契约（v2.0 → v2.1）

### 12.1 v2.0 的实际 schema（参考）

v2.0 `articles` 表实际字段（从代码考古得出）：
- `id, title, content, category, tags, createdAt, updatedAt`
- `content` 是 **HTML 字符串**（非 Markdown）
- `category` 是单字符串（非 id 列表）
- `tags` 是字符串数组（逗号分隔）
- 无 `status / favorite / pinned / color / deletedAt` 等字段
- 无 `versions / workspaces / categories / tags` 独立表

### 12.2 迁移步骤（Dexie version 升级钩子）

```typescript
// src/db/migrations/v3.ts
db.version(3).stores({ /* new stores */ }).upgrade(async (tx) => {
  // 1) 创建默认账号 + 默认工作区
  const accountId = uuid()
  const workspaceId = uuid()
  await tx.table('accounts').add({
    id: accountId, displayName: 'Default',
    createdAt: Date.now(), lastActiveAt: Date.now(),
    preferredLocale: 'zh-CN', settings: {},
  })
  await tx.table('workspaces').add({
    id: workspaceId, accountId, name: 'Default',
    description: null, rootCategory: null, color: null,
    order: 0, createdAt: Date.now(), updatedAt: Date.now(), archived: false,
  })

  // 2) 迁移每个旧 article
  const oldArticles = await tx.table('articles').toArray()
  for (const old of oldArticles) {
    // HTML → Markdown（借助 10-spec §5 迁移工具）
    const markdownBody = await htmlToMarkdownOneShot(old.content)

    // 构造 frontmatter + 内容
    const fm = {
      title: old.title,
      status: 'writing',  // 旧数据无状态，保守赋值
      categories: [],
      tags: typeof old.tags === 'string' ? old.tags.split(',').filter(Boolean) : old.tags ?? [],
      favorite: false,
      pinned: false,
      color: null,
      createdAt: old.createdAt ?? Date.now(),
      updatedAt: old.updatedAt ?? Date.now(),
      exports: [],
      inkforge: {
        schema_version: 1,
        authority: 'markdown',
        portability: 'mixed',   // 迁移数据标 mixed，因为 HTML 可能带非标
        extensions: [],
        workspaceId,
      },
    }
    const markdownSource = serializeWithFrontmatter(fm, markdownBody)

    // 写入新 article 结构
    await tx.table('articles').put({
      id: old.id,
      accountId,
      workspaceId,
      markdownSource,
      htmlCache: null,  // 强制重建
      sourceHash: await sha256(markdownSource),
      cacheVersion: 0,
      cacheGeneratedAt: 0,
      title: old.title,
      status: 'writing',
      tagIds: await resolveTagIds(fm.tags, workspaceId),
      categoryIds: [],
      favorite: false,
      pinned: false,
      color: null,
      publishedAt: null,
      archivedAt: null,
      createdAt: old.createdAt ?? Date.now(),
      updatedAt: old.updatedAt ?? Date.now(),
      deletedAt: null,
      path: null,
      orderIndex: 0,
      stats: {
        wordCount: wordCount(markdownBody),
        charCount: charCount(markdownBody),
        readingTime: Math.ceil(wordCount(markdownBody) / 300),
        lastEditedBy: null,
      },
    })
  }

  // 3) 迁移旧 category 字符串字段 → categories 表
  const uniqueCats = new Set(oldArticles.map(a => a.category).filter(Boolean))
  for (const name of uniqueCats) {
    const id = uuid()
    await tx.table('categories').add({
      id, workspaceId, parentId: null, name, color: null,
      order: 0, createdAt: Date.now(),
    })
    // 回填到 articles.categoryIds
    const members = oldArticles.filter(a => a.category === name)
    for (const m of members) {
      await tx.table('articles').update(m.id, { categoryIds: [id] })
    }
  }

  // 4) 审计
  await tx.table('events').add({
    ts: Date.now(), accountId, workspaceId: null,
    type: 'db.migrated',
    payload: { fromVersion: 2, toVersion: 3, articleCount: oldArticles.length },
    deviceId: getDeviceId(),
  })
})
```

### 12.3 迁移的原子性与失败处理

- Dexie version upgrade 是单事务；失败则整个升级回滚，保持 v2.0 可用
- 用户无感知：首次启动 v2.1 时自动完成；超过 10s 时显示进度
- 迁移失败上报：`diagnostic-logging`（33-spec）记录 stack

---

## §13 一致性不变量（Invariants）

| # | 不变量 | 说明 | 检测/修复 |
|---|-------|-----|----------|
| I-01 | **Scope 隔离** | 跨 account 读写零泄漏（S-01~S-02） | 启动时断言 IDB 名前缀；违反则拒绝启动 |
| I-02 | **frontmatter-DB 镜像一致** | `articles.title === fm.title` 等 12 个字段（§5.2） | saveArticle 强制双写；周期性校验任务 |
| I-03 | **FSM 合法转换** | `articles.status` 只能在转换白名单内变化 | FSM 引擎是唯一写入口；其他代码 TypeScript 禁止 |
| I-04 | **分类无环** | 分类树无环且深度 ≤ 3 | moveCategory 前置检查 |
| I-05 | **标签在其 workspace 内唯一** | `(workspaceId, name)` 唯一 | 唯一索引 `[workspaceId+name]` |
| I-06 | **版本单调可读** | 每个 version.markdownSource 独立可解析 | 写入前 parse 验证 |
| I-07 | **回收站 TTL** | deletedAt 超过 30 天的记录会被清扫 | 后台任务 + 启动检查 |
| I-08 | **版本上限** | 每文档 ≤999 版本 | saveArticle 后 enforceVersionCap |
| I-09 | **HTML 缓存与 hash 对齐** | htmlCache 非空 ⇒ sourceHash 与 cacheVersion 一致（10-spec I-02） | 读前校验，不一致则重建 |
| I-10 | **事件时间戳单调** | events.ts 严格递增（同 accountId 内） | 写入前断言 `ts > max(ts)` |
| I-11 | **workspaceId 始终有值** | articles / tags / categories 的 workspaceId 非空非 UUID 空串 | schema 约束 + runtime 断言 |
| I-12 | **附件 checksum 匹配** | attachment.checksum === sha256(blob) | 写入时计算；读取时可选校验 |

---

## §14 错误语义与降级契约

### 14.1 错误类型

```typescript
// src/core/lifecycle/errors.ts
export class LifecycleError extends Error { code: string }

export class InvalidTransitionError extends LifecycleError {
  code = 'INVALID_TRANSITION'
}
export class GuardFailedError extends LifecycleError {
  code = 'GUARD_FAILED'
}
export class AuthDeniedError extends LifecycleError {
  code = 'AUTH_DENIED'
}
export class FrontmatterInvalidError extends LifecycleError {
  code = 'FRONTMATTER_INVALID'
}
export class CategoryDepthExceededError extends LifecycleError {
  code = 'CATEGORY_DEPTH'
}
export class CategoryCycleError extends LifecycleError {
  code = 'CATEGORY_CYCLE'
}
export class VersionCapExceededError extends LifecycleError {
  code = 'VERSION_CAP'
}
export class ScopeViolationError extends LifecycleError {
  code = 'SCOPE_VIOLATION'
}
```

### 14.2 降级矩阵

| 失败场景 | 降级 | 用户感知 |
|---------|-----|---------|
| frontmatter 校验失败 | 进入"只读修复模式"（10-spec §13） | 弹窗引导 |
| FSM guard 失败 | 不转换，Toast 告知原因（如"标题为空"） | 明确提示 |
| Windows Hello 不可用 | 降级到 PIN / 密码；仍不可用则禁用相应操作 | 设置提示 |
| 版本写入失败（配额耗尽） | 仅保存 articles，跳过版本；弹警告 | 警告 Banner |
| 附件写入失败 | 文档保存成功，附件标记为"上传失败，可重试" | 附件行红标 |
| 迁移失败 | 回滚到 v2.0 schema，首页显示"升级失败，已保留数据" | Banner + 日志按钮 |

---

## §15 性能 SLO 对齐

| 操作 | SLO | 测量位置 | 优化手段 |
|-----|-----|---------|---------|
| `saveArticle` | p95 < 200ms（含 frontmatter parse + hash + DB 写） | PerformanceObserver | 节流到 300ms；hash 用 WebCrypto 异步 |
| `listActive` (Workstation 主列表, 1000 篇) | p95 < 100ms | 同上 | `[workspaceId+deletedAt]` 索引 + 虚拟列表 |
| FSM 转换（无 side effect）| p95 < 50ms | 同上 | 直接 IDB put |
| FSM 转换（有 version 副作用）| p95 < 500ms | 同上 | version 异步写，先返回 |
| 回收站清扫 | 后台，≤2s | console.time | 批次 100，async yield |
| 迁移 v2→v3（1000 篇）| ≤ 30s | onUpgrade 内计时 | 流式处理，批次 50 |
| 创建版本 | p95 < 300ms | 同上 | gzip 异步 |

---

## §16 验收矩阵

### 16.1 正向用例 P

| # | 场景 | 预期 |
|---|------|-----|
| P-01 | 新建文档 → status=draft → 输入 200 字符 → 自动转 writing | 状态栏图标变化 + 自动 version "开始写作" 创建 |
| P-02 | writing → 用户点击"送审" → under_review | 创建版本 "送审"；列表徽章更新 |
| P-03 | ready_to_publish → 导出微信成功 → published | exports frontmatter 追加；publishedAt 写入 |
| P-04 | 多选 3 个分类保存 → frontmatter.categories = 3 id | articles.categoryIds 同步；Workstation 按任一分类筛选命中 |
| P-05 | 收藏 → 再取消收藏 → 两次 frontmatter 双写一致 | 索引查询收藏列表变化正确 |
| P-06 | 置顶文档 → Workstation 主列表始终在前 9 | 排序正确 |
| P-07 | 删除文档 → 30 天内还原 → status / tags / 版本全部恢复 | 审计日志有 trashed + restored 各一条 |
| P-08 | 手动快照 "定稿" → 5 天后修改 → 还原 → 内容回到定稿 | 还原前自动打"还原前备份"快照 |
| P-09 | 切换 workspace → 列表只显示该 ws 的文档 | `[workspaceId+deletedAt]` 查询结果 |
| P-10 | v2.0 库 120 篇 → 升级到 v3 → 120 篇全部可读；migrated 事件有记录 | 迁移无数据丢失 |

### 16.2 失败用例 F

| # | 场景 | 预期错误 |
|---|------|---------|
| F-01 | 新建后立刻点"送审"（字数不够） | GuardFailedError `titleAndContent`；Toast 原因 |
| F-02 | 手动构造 FSM `draft → published` 转换 | InvalidTransitionError；状态不变 |
| F-03 | 分类 A → B → C → D（4 层）创建 | CategoryDepthExceededError；UI 拦截 |
| F-04 | 分类 A 父 = B；B 父 = A（构造环）| CategoryCycleError |
| F-05 | 强行写入非白名单 status 枚举 | Zod 校验失败 → FrontmatterInvalidError |
| F-06 | 导出平台失败 → 不应跃迁到 published | 状态保持 ready_to_publish；error Toast |
| F-07 | Windows Hello 拒绝 + 删除操作 | AuthDeniedError；不写 deletedAt |
| F-08 | 跨 workspace 移动文档 | 被 API 拒绝（提示用"复制"） |
| F-09 | 999 版本后再创建 | 淘汰最早 auto 版本；manual 版本保留；若全部是 manual 则拒绝并提示清理 |

### 16.3 恢复用例 R

| # | 场景 | 预期 |
|---|------|-----|
| R-01 | 崩溃后重启，drafts 表有 1 条未持久化 → 自动还原 + 提示 | 文档打开，顶栏 banner "已恢复崩溃前编辑" |
| R-02 | 迁移 v2→v3 中途崩溃 → 重启时自动重试（事务整体回滚保证原子性）| 数据无部分迁移态 |
| R-03 | Dexie upgrade throws → 数据库保持 v2 可用 | 展示"升级失败"界面 + 日志按钮 |
| R-04 | 回收站清扫任务中断 → 重启后继续 | 幂等清扫 |

### 16.4 一致性用例 C

| # | 场景 | 预期 |
|---|------|-----|
| C-01 | frontmatter 改 title → 保存 → articles.title 同步 | I-02 守住 |
| C-02 | DB 层直改 articles.title（绕过 saveArticle）| 下次 saveArticle 以 frontmatter 为准覆盖回去；记录 events 警告 |
| C-03 | 启动时周期校验任务 → 发现 200 条不一致 | 自动修复（以 frontmatter 为准）+ 报告 |
| C-04 | 两个 Profile 同时打开同账号 IDB | 被 IndexedDB `VersionError` 阻止；后启动者提示 |

---

## §17 权威来源登记表

| 字段 / 决策 | 权威来源 | 日期 |
|------------|---------|------|
| Scope 5 层定义 | 本 Spec §3 + Part 1 §4（C-01） | 2026-04-21 |
| FSM 6 态 | 本 Spec §4 + Part 1 R-03 | 2026-04-21 |
| frontmatter schema | 10-markdown-authority-spec.md §6 + 本 Spec §5 | 2026-04-21 |
| IndexedDB 13 表 | 本 Spec §6 | 2026-04-21 |
| 分类层级上限 3 | 本 Spec §7.1 + L1-17 | 2026-04-21 |
| 标签扁平 + 归一化 | 本 Spec §7.2 + L1-18 | 2026-04-21 |
| 回收站 TTL 30 天 | 本 Spec §8.2 + R-17 | 2026-04-21 |
| 版本 999 上限 / 滚动淘汰 | 本 Spec §9 + L1-24 | 2026-04-21 |
| 迁移规则 v2→v3 | 本 Spec §12 | 2026-04-21 |
| HTML→Markdown 迁移工具 | 10-markdown-authority-spec.md §5 | 2026-04-21 |

### 17.1 与其他 Spec 的交叉引用

| 引用对象 | 被本 Spec 约束的契约 |
|---------|-------------------|
| 10-markdown-authority-spec.md | frontmatter schema（§5.1）；markdownSource 为权威 |
| 15-sync-spec.md | 同步仅推 markdownSource；版本不同步；workspaceId 为分区 |
| 17-crash-recovery-spec.md | drafts 表用法（§6.1）；R-01~R-04 |
| 14-statusbar-navigation-spec.md | FSM 目标态与当前状态栏导航真相的边界说明（§4.5） |
| 25-trash-spec.md | 回收站查询契约（§8.3）；TTL（§8.2） |
| 29-search-spec.md | 消费 frontmatter.title/tags/categories；监听 doc.* 事件 |
| 31-history-version-spec.md | 版本触发规则（§9.1）；上限策略（§9.2） |
| 36-insights-spec.md | 消费 events 表；publishedAt 计数 |
| 42-export-spec.md | 成功后 append exports frontmatter + FSM 转 published |
| 52-workstation-list-spec.md | 列表可见性规则（§4.5）；置顶 / 收藏排序 |

---

## 附录 A · Quick Reference

### A.1 FSM 6 态速查

```
draft → writing → under_review → ready_to_publish → published → archived
  ↑        ↑             │               │                │         │
  │        └─────────────┘               │                │         │
  │                      (revert)        │                │         │
  │                                      └──→ (revert) ───┘         │
  │                                                                 │
  └────────────────────────── (unarchive) ─────────────────────────┘

任意 ─[软删]→ (标记 deletedAt) ─[30d TTL]→ 硬删除
```

### A.2 字段命名一览

| 概念 | frontmatter | DB 字段 | 类型 |
|-----|------------|--------|-----|
| 标题 | `title` | `title` | string |
| 状态 | `status` | `status` | LifecycleState |
| 标签 | `tags: string[]` | `tagIds: string[]` | UUID 数组 |
| 分类 | `categories: string[]` | `categoryIds: string[]` | UUID 数组 |
| 收藏 | `favorite` | `favorite` | boolean |
| 置顶 | `pinned` | `pinned` | boolean |
| 颜色 | `color` | `color` | ColorSwatch \| null |
| 发布时间 | `publishedAt` | `publishedAt` | number \| null |
| 归档时间 | `archivedAt` | `archivedAt` | number \| null |
| 工作区 | `inkforge.workspaceId` | `workspaceId` | UUID |

### A.3 查询速查

| 需求 | 查询 |
|-----|------|
| 某 ws 未删除的文档 | `where('workspaceId').equals(wsId).filter(a => !a.deletedAt)` |
| 某 ws 某状态的文档 | `where('[workspaceId+status]').equals([wsId, 'writing'])` |
| 某 ws 收藏 | `where('[workspaceId+favorite]').equals([wsId, 1])` |
| 含某标签 | `where('tagIds').anyOf([tagId])` |
| 最近编辑前 N | `where('workspaceId').equals(wsId).reverse().sortBy('updatedAt')` |
| 文档所有版本 | `where('[articleId+createdAt]').between([id, 0], [id, Infinity])` |

---

**（文档结束）**

## 2026-04-30 Implementation Ledger

本轮完成 `11-document-lifecycle-spec` 的兼容式 baseline，不宣称覆盖本 Spec 全量 Scope / DB / 回收站 / 版本 / 事件表。

已落地内容：

- 新增 `src/core/lifecycle/`，集中定义 `draft / writing / under_review / ready_to_publish / published / archived` 目标六态，并保留 `new / read / processed` legacy 状态兼容。
- `ArticleStatusSchema` 与 authority frontmatter status schema 已扩展到目标六态 + legacy 兼容态，旧文章仍可读取。
- 新增 lifecycle helper：状态归一化、legacy 判定、草稿箱判定、未完成/完成判定、继续创作优先级、状态文案、状态 class、Markdown 文本指标与 `hasSubstance` 守卫。
- `stores/article.ts` 在内容/标题/状态/标签更新时通过 helper 计算 lifecycle 状态；`draft` 内容达到实质门槛后自动提升为 `writing`，同时继续同步 P0-10 的 `markdownSource/htmlCache/sourceHash/frontmatter.status`。
- Hub / Drafts / Workstation / FileManager 已支持新增状态的基础显示、筛选与导航兼容，`writing` 会进入草稿箱管理范围。

验证记录：

- `pnpm exec vue-tsc --noEmit` 通过。
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` 通过。
- `pnpm build` 通过，仍有既有大 chunk warning。
- `LIFECYCLE_STORE_REPOSITORY_SELF_CHECK_OK`：真实 browser Pinia store + Dexie repository 创建短草稿、更新长正文自动提升 `writing`、显式 `ready_to_publish`、frontmatter status mirror、authority 校验与删除清理均通过。
- `P1_11_CODE_AND_DOCS_CLEAN_OK`：本轮目标代码与文档未发现 Emoji 图标或转义引号污染。

后续仍待完成：

- 13 张 IndexedDB 表与迁移。
- Account / Workspace / Document / Version 五层 Scope 与分区查询。
- Windows Hello 守卫转换、回收站 30 天 TTL、restore/purge UI。
- Version 自动/手动快照节律、999 上限策略与还原。
- events 审计表、doc.* side effects、Insights/Search/Export 全量消费。
