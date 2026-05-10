> 版本: v2.1 | 状态: Draft | 关联决策: F-05 D / L1-55 C / EX-01 / N-05 D / L1-41 C | 依赖 Spec: 11-document-lifecycle-spec.md / 12-file-manager-spec.md / 42-templates-spec.md

# 草稿箱技术规格说明

---

## 0. 当前实现增量（2026-04-22）

本 spec 当前已经有一段真实落地的最小闭环，目的不是一次完成全文所有子能力，而是在不重构现有架构的前提下，把 `draft` 真值真正接成可访问、可继续写作、可验证的集中管理页。

### 0.1 已真实落地

- 路由层已新增 `/drafts`，组件落点为 `src/views/DraftsView.vue`。
- `DraftsView.vue` 当前直接复用现有 `articleStore`，以 `status === 'draft'` 作为唯一数据源，不额外引入 `useDraftsStore` 平行状态。
- 视图当前已在列表态最小闭环上继续增强：标题、摘要、更新时间、字数、分类信息、关键词搜索、分类/标签/活动性筛选、排序方向切换、摘要统计卡、30 天未更新提示，以及点击后继续进入现有 `Workstation`。
- Hub 已补两条真实入口：
  - `Quick Actions` 区新增“打开草稿箱”
  - `productivitySignals` 中的“草稿箱”信号卡已继续增强为最近 3 篇真实 `draft` 预览，支持直接点击预览项进入 `Workstation`，并额外提供“继续最近草稿 / 查看全部草稿”按钮
- `Workstation` 状态栏左侧的文稿状态 badge 已成为第三条真实入口：当活动文稿为 `draft` 时，点击会先 flush 当前编辑内容，再跳转 `/drafts`。
- `DraftsView` 已提供“新建空白草稿”真实动作，仍走现有 `articleStore.addArticle()` 与 `/workstation?id=` 深链，不新增空壳创建链路。

### 0.2 本轮明确未落地

- 未实现网格视图
- 未实现右侧 Peek 面板
- 未实现批量操作、撤销、归档/发布批处理
- 未实现 Sidebar 草稿角标、命令面板 `hub.openDrafts`、TabBar 长按新建草稿
- 未实现 `settings.drafts.*` 持久化配置
- 未实现 spec 中设想的 `useDraftsStore`

### 0.3 当前兼容边界

- `/drafts` 当前严格只展示真实 `draft` 状态文档，不把 legacy `new/read` 混入列表。
- legacy `new/read` 文稿仍通过首页 `继续创作` 等兼容链路继续打开；当前 `DraftsView` 顶部会显式提示这类旧文稿未纳入草稿箱。
- `Workstation` 状态 badge 当前只把 `draft` 视为草稿箱入口；`new/read/processed` 点击后走 Hub 兼容回退，不应误解为已完整打通多状态流转器。

### 0.4 已完成真实验证

- `pnpm -C inkforge typecheck`
- `pnpm -C inkforge build`
- Playwright 真实验证：
  - `Hub -> 空白开始 -> Workstation -> 返回 Hub` 后首页显示 `1 篇文章 / 1 草稿`
  - 从 Hub 的“打开草稿箱”进入 `/drafts` 后，可见刚创建的真实草稿
  - Hub 首页“草稿箱”信号卡会展示最近 3 篇真实 `draft` 预览；点击预览项或“继续最近草稿”后，可直接进入对应 `Workstation?id=...`
  - 从 `/drafts` 点击草稿卡片后，可重新进入现有 Workstation 编辑页
  - `Hub -> 继续创作 -> Workstation -> 点击状态 badge -> /drafts` 可以跑通
  - 浏览器内探针已证明通过状态 badge 导航前，`flushPendingChanges()` 实际发生 `called=1 / resolved=1 / rejected=0`
  - `/drafts` 页内输入不存在的关键词后，会进入真实“筛选空态”；点击“清空筛选”后草稿列表恢复
  - `/drafts` 顶部“继续最近草稿”按钮会直接回到对应 `Workstation?id=...` 编辑页

## 目录

1. 功能概述与设计哲学
2. 草稿定义与状态边界
3. 草稿箱入口体系
4. 草稿箱视图规格
5. 快速预览（Peek 面板）
6. 排序规格
7. 过滤规格
8. 批量操作规格
9. 草稿计数角标
10. 空态设计
11. 过期提醒机制
12. useDraftsStore
13. TypeScript 类型全量定义
14. 与快速笔记的联动
15. 与文档状态机的联动
16. 无障碍（a11y）要求
17. 测试矩阵

---

## 1. 功能概述与设计哲学

### 1.1 决策来源

草稿箱规格来源于以下决策：

- **F-05 D**：草稿箱是独立子系统，含过期提醒、多入口创建
- **L1-55 C**：全局快捷键 `Ctrl+Alt+N` 唤起快速笔记，内容归入草稿箱
- **EX-01**：Scratch Pad（快速笔记），内容自动归入草稿箱
- **L1-41 C**：文档拥有正式状态机，`draft` 是状态机第一个状态

### 1.2 核心设计原则

**草稿是文档生命周期的起点**：所有文档在创建时默认进入 `draft` 状态，草稿箱是这些文档的集中管理视图，而非独立的存储系统。

**多入口创建，统一管理**：快速笔记、新建文档、模板创建，所有来源的草稿都汇聚到草稿箱统一管理。

**发布路径清晰**：草稿箱提供明确的"发布"路径，用户可以从草稿直接推进到 `ready_to_publish` 或 `published`。

**非侵入式**：草稿箱不强制用户整理草稿，用户可以长期保留大量草稿不做任何操作。

### 1.3 草稿箱架构

```
草稿箱 = 文档状态机的 "draft" 状态视图
              │
              ├── 数据来源：articles 表中 status = 'draft' 的文档
              ├── 视图层：DraftsView（当前仅列表视图）
              ├── 当前状态管理：articleStore + DraftsView 本地 computed / refs
              └── 入口：Hub 卡片 / Workstation 状态 badge（其余入口见规划项）
```

> 当前运行时并不存在独立 `useDraftsStore`；网格视图、Peek、批量操作等仍属于后续扩展目标。

---

## 2. 草稿定义与状态边界

### 2.1 草稿的状态机位置

```
[创建文档] ──▶ draft ──▶ writing ──▶ review ──▶ ready_to_publish ──▶ published
                │
                └──▶ [草稿箱展示范围]
```

草稿箱展示 **仅处于 `draft` 状态的文档**。

- `writing` 及以后的状态文档属于"进行中的正式文章"，不在草稿箱展示
- 从回收站还原的文档状态为 `draft`，还原后出现在草稿箱

### 2.2 草稿的自动创建场景

以下操作创建 `draft` 状态文档：

| 创建来源 | 触发方式 | 默认标题 |
|---------|---------|---------|
| 新建文档（空白） | `Ctrl+N` / Hub 按钮 | "无标题" |
| 新建文档（模板） | 模板选择弹窗 | 模板变量替换后的标题 |
| 快速笔记 | `Ctrl+Alt+N` / 系统托盘 | 笔记第一行内容（最多 40 字），无内容时"快速笔记 {datetime}" |
| 从回收站还原 | 回收站"还原"按钮 | 原标题 |

> 当前真实已落地的只有“新建文档（空白）/ 新建文档（模板）”两条来源；“快速笔记 / 从回收站还原”仍是目标设计。

---

## 3. 草稿箱入口体系

### 3.1 入口列表

| 入口位置 | 形态 | 触发方式 |
|---------|------|---------|
| Hub 快捷卡片 | 卡片，显示草稿数量 | 点击卡片标题跳转草稿箱 |
| Workstation 状态栏文稿状态 badge | 内联 badge | `draft` 时打开 `/drafts`；其他兼容态回 Hub |
| Sidebar 草稿图标 | 规划中的图标按钮 + 数量角标 | 未落地 |
| 命令面板 | 规划中的命令 `hub.openDrafts` | 未落地 |
| TabBar 新建 | 规划中的长按菜单 | 未落地 |

### 3.2 Hub 快捷卡片规格

```
┌──────────────────────────────────────┐
│  草稿箱                    N 篇草稿  │  ← 标题行（N = 当前草稿总数）
├──────────────────────────────────────┤
│  · 最近草稿标题一           2 小时前 │
│  · 最近草稿标题二           昨天     │
│  · 最近草稿标题三           3 天前   │
├──────────────────────────────────────┤
│                            查看全部  │  ← 跳转草稿箱页面
└──────────────────────────────────────┘
```

- 最多显示最近 3 篇草稿（按 `updatedAt` 倒序）
- 草稿数量角标：若 N > 99 显示 "99+"
- 卡片点击：跳转 `/drafts` 路由

> 当前运行时增量：首页尚未单独长出一张独立“草稿箱快捷卡片”，而是先在现有 `productivitySignals` 的“草稿箱”信号卡内落地同类能力。该信号卡当前已经会渲染最近 3 篇真实 `draft` 预览，并提供“继续最近草稿 / 查看全部草稿”入口，数据源严格来自 `status === 'draft'` 的现有文章集合。

### 3.3 Sidebar 草稿图标（未落地，目标设计）

- 图标：`FileText`（Lucide）
- 位置：Sidebar 导航图标列表中，位于文件管理器图标下方
- 数量角标：红色圆角矩形，显示草稿总数，超过 99 显示 "99+"
- 点击跳转 `/drafts`

---

## 4. 草稿箱视图规格

### 4.1 路由

```
路由：/drafts
组件：src/views/DraftsView.vue
```

### 4.2 列表视图规格

```
┌──────────────────────────────────────────────────────────────┐
│  草稿箱                N 篇草稿        [列表] [网格]          │  ← 页头，视图切换
├──────────────────────────────────────────────────────────────┤
│  [过滤：标签 ▼] [过滤：日期 ▼] [过滤：字数 ▼] [排序 ▼]      │  ← 过滤/排序工具栏
├──────────────────────────────────────────────────────────────┤
│  [Checkbox] 草稿标题一                         2026-04-21    │
│             摘要文字片段...（一行截断）          800 字       │
│             [标签一] [标签二]                                │
├──────────────────────────────────────────────────────────────┤
│  [Checkbox] 草稿标题二                         2026-04-20    │
│             摘要文字...                         1,200 字      │
│             [标签三]                                         │
├──────────────────────────────────────────────────────────────┤
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

**列表项字段**：

| 字段 | 来源 | 规格 |
|------|------|------|
| 复选框 | 批量选择 | 左对齐，24px |
| 标题 | `articles.title` | 一行截断，加粗 |
| 摘要 | `articles.excerpt` | 一行截断，灰色 |
| 修改时间 | `articles.updatedAt` | 右对齐，相对时间（"2 小时前"）/ 超过 7 天显示完整日期 |
| 字数 | 实时计算 | "N 字" |
| 标签 | `articles.tags` | 最多 3 个标签，溢出省略 |

**行高**：72px

**点击行为**：
- 点击列表项（非复选框）→ 展开右侧 Peek 面板（200ms 防抖）
- 双击列表项 → 直接在编辑器中打开草稿
- `Enter` 键 → 同双击

### 4.3 网格视图规格

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ [封面/   │  │ [封面/   │  │ [封面/   │  │ [封面/   │
│  文字预览]│  │  文字预览]│  │  文字预览]│  │  文字预览]│
│          │  │          │  │          │  │          │
│ 标题     │  │ 标题     │  │ 标题     │  │ 标题     │
│ N字·时间 │  │ N字·时间 │  │ N字·时间 │  │ N字·时间 │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

**卡片规格**：
- 卡片宽度：适应 4 列网格（间距 16px，整体 padding 16px）
- 封面区域高度：120px；若文档有封面图则显示封面图，否则显示文档内容前 100 字（等宽字体，深灰背景）
- 卡片底部：标题（一行截断）+ "N 字 · 时间" 副标题

**视图记忆**：
- 用户选择的视图模式（列表/网格）持久化到 `settings.drafts.viewMode`

---

## 5. 快速预览（Peek 面板）

### 5.1 Peek 面板规格

Peek 面板在草稿箱右侧展开，以只读模式渲染文档内容，供用户快速浏览而无需打开完整编辑器。

**布局**：
- 面板宽度：草稿箱剩余宽度（草稿列表固定 400px，剩余为 Peek 面板）
- 最小 Peek 宽度：320px（窗口过窄时折叠为悬浮抽屉）

**触发逻辑（200ms 防抖）**：

```typescript
let peekTimer: ReturnType<typeof setTimeout> | null = null;

function onListItemClick(articleId: string): void {
  if (peekTimer) clearTimeout(peekTimer);
  peekTimer = setTimeout(() => {
    draftsStore.openPreview(articleId);
  }, 200);
}
```

防抖的作用：用户快速点击不同列表项时，避免频繁切换渲染。

**Peek 面板内容**：
- 顶部操作栏：标题 + "在编辑器中打开"按钮
- 文档元信息行：字数 / 创建时间 / 修改时间 / 标签
- 渲染内容区域：Markdown 渲染（只读，不可交互的 Typora 预览）
- 底部操作栏：[发布] [归档] [移入回收站]（对应批量操作的单篇快捷版）

**关闭方式**：
- 点击列表区域空白处
- 按 `Esc` 键
- 再次点击当前预览中的列表项

---

## 6. 排序规格

草稿箱支持以下排序维度，可在页头下拉菜单切换：

| 排序选项 | 排序字段 | 默认方向 | 说明 |
|---------|---------|---------|------|
| 修改时间（默认） | `updatedAt` | 降序 | 最近修改的在前 |
| 创建时间 | `createdAt` | 降序 | 最近创建的在前 |
| 标题 | `title` | 升序（A-Z） | 按标题字典序 |
| 字数 | `wordCount` | 降序 | 字数最多的在前 |

排序配置持久化到 `settings.drafts.sort`：

```typescript
interface DraftsSortConfig {
  field: 'updatedAt' | 'createdAt' | 'title' | 'wordCount';
  order: 'asc' | 'desc';
}
```

---

## 7. 过滤规格

### 7.1 过滤维度

草稿箱支持三个独立过滤维度，可叠加使用：

| 过滤维度 | 控件类型 | 说明 |
|---------|---------|------|
| 标签 | 多选下拉 | 选择一个或多个标签，AND 逻辑（文档必须含所有选中标签） |
| 创建日期范围 | 日期范围选择器 | 选择起止日期，过滤 `createdAt` |
| 字数范围 | 滑块 + 输入框 | 最小字数 ~ 最大字数（留空表示不限） |

### 7.2 过滤状态持久化

过滤配置在路由切换时保留（回到草稿箱时恢复上次过滤状态），但不持久化到 IndexedDB（刷新应用后重置）。

### 7.3 过滤 DSL 集成

草稿箱过滤器复用 SearchEngine 的 DSL 查询层，预设 `status: 'draft'` 过滤条件：

```typescript
function buildDraftsQuery(
  filter: DraftsFilter,
  sort: DraftsSortConfig
): SearchQuery {
  return {
    filters: [
      { field: 'status', value: DocumentStatus.Draft, operator: 'eq' },
      ...(filter.tags?.length ? [{ field: 'tags', value: filter.tags, operator: 'all' }] : []),
      ...(filter.dateFrom ? [{ field: 'createdAt', value: filter.dateFrom, operator: 'gte' }] : []),
      ...(filter.dateTo ? [{ field: 'createdAt', value: filter.dateTo, operator: 'lte' }] : []),
      ...(filter.minWordCount != null ? [{ field: 'wordCount', value: filter.minWordCount, operator: 'gte' }] : []),
      ...(filter.maxWordCount != null ? [{ field: 'wordCount', value: filter.maxWordCount, operator: 'lte' }] : []),
    ],
    sort: { field: sort.field, order: sort.order },
  };
}

interface DraftsFilter {
  tags?: string[];
  dateFrom?: number;    // Unix timestamp ms
  dateTo?: number;
  minWordCount?: number;
  maxWordCount?: number;
}
```

---

## 8. 批量操作规格

### 8.1 进入批量选择模式

- 点击任意复选框进入选择模式
- `Ctrl+A` 全选所有可见列表项

### 8.2 批量操作栏

```
┌──────────────────────────────────────────────────────────────┐
│  [全选]  已选 N 篇     [发布]  [归档]  [移入回收站]    [X]   │
└──────────────────────────────────────────────────────────────┘
```

| 操作 | 目标状态 | 确认要求 |
|------|---------|---------|
| 发布 | `ready_to_publish` | 无需确认（可通过 Toast 撤销） |
| 归档 | `archived` | 无需确认（可通过 Toast 撤销） |
| 移入回收站 | `trashed` | 无需确认（可通过 Toast 撤销，30 天内可还原） |

**批量操作后反馈**：

```typescript
// Toast 示例
toast.success(`已将 ${count} 篇草稿归档`, {
  action: {
    label: '撤销',
    onClick: () => draftsStore.undoLastBatch(),
  },
});
```

### 8.3 撤销机制

批量操作（发布/归档/移入回收站）支持 Toast 内的撤销按钮，撤销有效期 5 秒（Toast 持续时间）。

撤销逻辑：恢复操作前所有文档的状态（`draft`），属于单步撤销。

---

## 9. 草稿计数角标

### 9.1 计数规则

**草稿计数 = 当前账户下所有 `status === 'draft'` 的文档数量**

不含：
- `writing`、`review`、`ready_to_publish`、`published`、`archived`、`trashed` 状态文档
- 其他账户的文档

### 9.2 角标显示位置

| 位置 | 显示格式 | 更新时机 |
|------|---------|---------|
| Hub 草稿箱卡片 | 右上角 "N 篇草稿" | 实时（响应式） |
| Sidebar 草稿图标 | 红色圆角角标，超 99 显示 "99+" | 实时（响应式） |
| Tauri 窗口标题（可选） | 不在窗口标题显示 | — |

### 9.3 实时更新实现

草稿计数通过 Pinia Store 的响应式 getter 实现，当 `articles` Store 中的文档状态变化时自动更新：

```typescript
// 在 useDraftsStore 中
const draftsCount = computed(() =>
  articlesStore.articles.filter(a => a.status === DocumentStatus.Draft).length
);
```

---

## 10. 空态设计

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│              [铅笔图标，线框风格，80px]                       │
│                                                              │
│                  还没有草稿                                   │
│                                                              │
│    开始写作，你的文章会先以草稿形式保存在这里                  │
│                                                              │
│           ┌──────────────────────┐                          │
│           │    开始你的第一篇草稿  │                          │  ← 主按钮
│           └──────────────────────┘                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**规格**：
- 图标：`Pencil`（Lucide），大小 80px，`var(--color-text-tertiary)`
- 标题："还没有草稿"，字号 18px，`var(--color-text-primary)`
- 描述："开始写作，你的文章会先以草稿形式保存在这里"，字号 14px，`var(--color-text-secondary)`
- 按钮：点击触发新建文档弹窗（含模板选择）

**过滤结果为空时的特殊空态**：

```
没有符合条件的草稿

[清除过滤条件]
```

---

## 11. 过期提醒机制

### 11.1 草稿过期逻辑

根据 F-05 D，草稿箱有"过期提醒"功能。草稿本身不会自动删除，但超过一定时间未编辑的草稿会收到提醒。

**过期提醒阈值**（默认，Settings > 写作 > 草稿提醒 可调整）：

| 阈值 | 提醒行为 |
|------|---------|
| 30 天未编辑 | 草稿列表项显示"30 天未更新"黄色提示标签 |
| 90 天未编辑 | 草稿列表项显示"90 天未更新"橙色提示标签 |

### 11.2 提醒 UI

```
[Checkbox] 草稿标题一                    [30 天未更新]  2026-03-21
           摘要文字...                                  800 字
           [标签]
```

`[30 天未更新]` 是内嵌在列表项中的标签，不是独立 Toast 提醒。

### 11.3 过期提醒不等于自动删除

草稿**永不自动删除**（仅回收站文档有自动过期删除），过期提醒只是视觉提示，提醒用户关注长期搁置的草稿。

---

## 12. useDraftsStore

```typescript
// src/stores/drafts.ts

interface DraftsStoreState {
  /** 草稿列表（当前过滤/排序后的结果） */
  items: DraftArticle[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误状态 */
  error: Error | null;
  /** 过滤配置 */
  filter: DraftsFilter;
  /** 排序配置 */
  sort: DraftsSortConfig;
  /** 视图模式 */
  viewMode: 'list' | 'grid';
  /** 已选文档 id（批量操作） */
  selectedIds: Set<string>;
  /** 当前预览的文档 id */
  previewingId: string | null;
  /** 总草稿数（角标用，不受过滤影响） */
  totalDraftCount: number;
  /** 最近一次批量操作的记录（用于撤销） */
  lastBatchOperation: BatchOperation | null;
}

interface DraftsStoreActions {
  /** 加载草稿列表（含过滤/排序） */
  loadItems(): Promise<void>;
  /** 刷新 */
  refresh(): Promise<void>;
  /** 更新过滤配置 */
  setFilter(filter: Partial<DraftsFilter>): void;
  /** 清除所有过滤条件 */
  clearFilter(): void;
  /** 更新排序 */
  setSort(field: DraftsSortConfig['field'], order: DraftsSortConfig['order']): void;
  /** 切换视图模式 */
  setViewMode(mode: 'list' | 'grid'): void;
  /** 切换单项选择 */
  toggleSelect(id: string): void;
  /** 全选 */
  selectAll(): void;
  /** 清除选择 */
  clearSelection(): void;
  /** 打开 Peek 预览 */
  openPreview(id: string): void;
  /** 关闭 Peek 预览 */
  closePreview(): void;
  /** 批量发布（status → ready_to_publish） */
  publishSelected(): Promise<void>;
  /** 批量归档（status → archived） */
  archiveSelected(): Promise<void>;
  /** 批量移入回收站（status → trashed） */
  trashSelected(): Promise<void>;
  /** 撤销最近一次批量操作 */
  undoLastBatch(): Promise<void>;
  /** 加载草稿总数（用于角标） */
  loadTotalCount(): Promise<void>;
}

interface DraftsStoreGetters {
  /** 是否有选中项 */
  hasSelection: (state: DraftsStoreState) => boolean;
  /** 选中数量 */
  selectionCount: (state: DraftsStoreState) => number;
  /** 是否半选 */
  isIndeterminate: (state: DraftsStoreState) => boolean;
  /** 当前预览文档对象 */
  previewingDraft: (state: DraftsStoreState) => DraftArticle | null;
  /** 是否存在过期草稿（30 天以上未编辑） */
  hasExpiredDrafts: (state: DraftsStoreState) => boolean;
  /** 有效过滤条件数量（用于显示"已过滤"提示） */
  activeFilterCount: (state: DraftsStoreState) => number;
}
```

---

## 13. TypeScript 类型全量定义

```typescript
// src/types/drafts.ts

export interface DraftArticle {
  id: string;
  title: string;
  excerpt: string | null;
  wordCount: number;
  tags: string[];
  coverImage: string | null;     // 封面图 URL 或 null
  createdAt: number;             // Unix timestamp ms
  updatedAt: number;
  /** 是否来自快速笔记（用于展示来源标记） */
  fromQuickNote: boolean;
  /** 是否超过 30 天未编辑（过期提醒） */
  isStale30d: boolean;
  /** 是否超过 90 天未编辑 */
  isStale90d: boolean;
}

export interface DraftsFilter {
  tags?: string[];
  dateFrom?: number;
  dateTo?: number;
  minWordCount?: number;
  maxWordCount?: number;
}

export interface DraftsSortConfig {
  field: 'updatedAt' | 'createdAt' | 'title' | 'wordCount';
  order: 'asc' | 'desc';
}

export interface BatchOperation {
  type: 'publish' | 'archive' | 'trash';
  articleIds: string[];
  previousStatuses: Record<string, DocumentStatus>;
  executedAt: number;
}

export class DraftNotFoundError extends Error {
  constructor(id: string) {
    super(`Draft article "${id}" not found`);
    this.name = 'DraftNotFoundError';
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(from: DocumentStatus, to: DocumentStatus) {
    super(`Invalid status transition from "${from}" to "${to}"`);
    this.name = 'InvalidStatusTransitionError';
  }
}
```

---

## 14. 与快速笔记的联动

> Not Implemented Yet：本章描述的是目标设计；当前运行时尚未接入 QuickNoteWindow 到草稿箱的真实链路。

### 14.1 快速笔记内容归入草稿箱

快速笔记（QuickNoteWindow）保存的内容，自动在 `articles` 表中创建一条 `status: 'draft'` 的文档记录，并标记 `fromQuickNote: true`。

```typescript
// QuickNoteWindow 保存逻辑
async function saveQuickNote(content: string): Promise<string> {
  const title = extractFirstLine(content, 40) || `快速笔记 ${formatDateTime(new Date())}`;
  
  const articleId = await articleRepository.create({
    title,
    content,
    status: DocumentStatus.Draft,
    fromQuickNote: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  
  // 刷新草稿箱计数
  await draftsStore.loadTotalCount();
  
  return articleId;
}
```

### 14.2 快速笔记来源标记

草稿箱列表项上，来自快速笔记的草稿显示"快速笔记"来源标签：

```
[Checkbox] 会议中的想法                           [快速笔记]  1 小时前
           会议中突然想到的点子...                            120 字
```

---

## 15. 与文档状态机的联动

> Future Design：本章依赖完整生命周期状态机。当前运行时代码仍以 `draft / new / read / processed` 四态兼容模型为主，以下内容不能视作已交付。

### 15.1 草稿状态变更实时反映

任何导致文档 `status` 从 `draft` 变化的操作，都会立即从草稿箱列表中移除该文档：

- 用户在编辑器中将文档状态改为 `writing` → 草稿箱立即移除该文档
- 批量归档 → 该文档进入归档视图，草稿箱移除
- 批量发布 → 该文档进入发布流程，草稿箱移除

实现：监听 `articlesStore` 的响应式变化，自动过滤当前列表。

### 15.2 FileManager 与草稿箱的数据一致性

草稿箱与文件管理器的 `draft` 状态过滤视图显示相同的文档集合，但 UI 设计不同：

| 视图 | 定位 | 差异 |
|------|------|------|
| 草稿箱（`/drafts`） | 专注于草稿管理，含 Peek 面板 | 不显示其他状态文档 |
| 文件管理器（`status:draft` 过滤） | 多状态混合，可切换过滤 | 与其他状态文档并列 |

---

## 16. 无障碍（a11y）要求

- 草稿列表：`role="list"` + 每项 `role="listitem"` + `aria-label="草稿：<标题>"`
- 复选框：有独立 `aria-label`（含文档标题）
- 全选复选框：`aria-checked="mixed"` 处理半选
- Peek 面板：`role="complementary"` + `aria-label="文档预览"` + `aria-live="polite"`（内容更新时播报）
- 批量操作栏：`role="toolbar"` + 各按钮有明确 `aria-label`
- 视图切换（列表/网格）：`role="radiogroup"` + `role="radio"` + `aria-checked`
- 过滤下拉：`role="combobox"` 或 `role="listbox"` 依控件实现
- 过期标签：`aria-label="此草稿 30 天未更新"` 而非只有视觉颜色

---

## 17. 测试矩阵

| # | 测试类型 | 测试描述 | 预期结果 |
|---|----------|----------|----------|
| 1 | 单元 | `buildDraftsQuery` 包含 `status=draft` 过滤 | 查询结果不含非 draft 文档 |
| 2 | 单元 | `DraftsSortConfig` 按 `updatedAt` 降序 | 最近修改在前 |
| 3 | 单元 | `isStale30d` 计算：updatedAt 31 天前 | 返回 true |
| 4 | 单元 | `isStale30d` 计算：updatedAt 29 天前 | 返回 false |
| 5 | 单元 | 快速笔记保存：`fromQuickNote = true` | DB 记录字段正确 |
| 6 | 单元 | 快速笔记标题提取：内容第一行超 40 字 | 截断为 40 字 |
| 7 | 单元 | 快速笔记无内容：标题为 "快速笔记 {datetime}" | 标题格式正确 |
| 8 | 集成 | 草稿箱路由渲染草稿列表 | 所有 status=draft 文档显示 |
| 9 | 集成 | 草稿箱不显示 writing 状态文档 | 列表中无 writing 文档 |
| 10 | 集成 | 点击列表项展开 Peek 面板（200ms 防抖） | 防抖 200ms 后面板渲染 |
| 11 | 集成 | 快速连续点击不同项，Peek 面板防抖更新 | 面板只渲染最后一次点击的文档 |
| 12 | 集成 | 双击列表项在编辑器中打开 | 编辑器打开对应文档 |
| 13 | 集成 | 标签过滤：选择标签 A | 只显示含标签 A 的草稿 |
| 14 | 集成 | 日期范围过滤 | 只显示创建日期在范围内的草稿 |
| 15 | 集成 | 字数范围过滤 | 只显示字数在范围内的草稿 |
| 16 | 集成 | 多维度过滤叠加（标签 + 字数） | 同时满足两个条件的草稿显示 |
| 17 | 集成 | 清除过滤条件后全部草稿显示 | 列表恢复完整 |
| 18 | 集成 | 批量选择 → 归档 → Toast + 撤销 | Toast 显示，点击撤销后草稿恢复 |
| 19 | 集成 | 批量发布后文档从草稿箱消失 | 文档 status=ready_to_publish，草稿箱列表移除 |
| 20 | 集成 | Sidebar 角标实时更新（创建新草稿后） | 角标数量 +1 |

---

*本文档覆盖草稿箱完整技术规格，包含入口体系、列表视图、网格视图、Peek 面板、排序过滤、批量操作、计数角标、空态、过期提醒、Store、TypeScript 类型及与快速笔记/状态机的联动，共计约 640 行，版本 v2.1 Draft。*

---

## 2026-05-02 Batch Management Implementation Note

Baseline status: Pass for the compatible Drafts Box batch-management baseline. Full Spec 43 remains pending for quick-note capture, command-palette entry, sidebar badge persistence, settings-backed draft preferences, and a dedicated `useDraftsStore` abstraction.

Implemented baseline coverage:

- Existing `/drafts` remains the single Drafts Box route and continues to read real local articles through `articleStore`.
- Drafts Box now supports list/grid view switching without changing the filtered draft collection.
- Draft rows expose real selection state, select-all-visible behavior, and a batch operation toolbar.
- Batch archive writes `archived` status through `articleStore.updateArticle()` and removes affected items from the draft list.
- Batch ready-to-publish writes `ready_to_publish` through the same store update path.
- Latest batch operation captures previous statuses and exposes a one-step undo, including the edge case where the last visible draft was removed from the list.
- Draft preview/peek panel renders real title, excerpt, word count, category, tags, relative update time, and stale/recent signal from the active draft.
- Existing Hub entries, Workstation status badge path, article lifecycle helpers, filtering, sorting, empty states, and blank-draft creation are preserved.
- No mock drafts, fake article ids, simulated batch success state, deleted modules, or emoji glyph icons were introduced.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-43-drafts-box`: passed with 6 implement entries and 6 check entries.
- `pnpm exec vue-tsc --noEmit`: passed.
- `pnpm exec eslint src/views/DraftsView.vue --ext .vue --quiet`: passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`: passed.
- `pnpm exec vitest run`: 22 files and 154 tests passed.
- `pnpm build`: passed with existing non-blocking Vite dynamic/static import and chunk-size warnings only.
- Browser smoke verified `/drafts` with a real local draft: grid toggle, select-one, batch archive, empty-list undo visibility, undo restore, preview panel, and zero console errors.
- BOM scan, emoji scan, and `git diff --check` passed for touched Drafts Box files.
- GitNexus impact/detect was attempted, but the MCP transport returned `Transport closed`; no GitNexus result is claimed for this baseline.

Pending full Spec 43 scope:

- `useDraftsStore`, quick-note capture, Sidebar live badge, command palette `hub.openDrafts`, TabBar long-press draft creation, settings-backed draft preferences, date/word-count range filters, richer batch publish routing, full a11y keyboard sweep, and packaged Tauri validation remain follow-up work.