> 版本: v2.1 | 状态: Draft | 关联决策: L1-42 D / N-02 / L1-40 C / L1-34(D级审计) | 依赖 Spec: 31-document-lifecycle-spec.md / 08-data-insights-spec.md / 06-version-management-spec.md

# 回收站与彻底删除技术规格说明

---

## 目录

1. 功能概述与设计哲学
2. 文档状态机中的 trashed 状态
3. 软删除数据模型
4. TrashBin 页面规格
5. 回收站操作规格（还原/彻底删除/清空）
6. 批量选择规格
7. 回收站内搜索
8. 确认对话框规格
9. 自动清理 Job（Tauri 后台定时）
10. 文件关联清理（附件孤儿文件策略）
11. TrashRepository
12. useTrashStore
13. TypeScript 类型全量定义
14. 存储统计联动
15. 审计日志覆盖
16. 无障碍（a11y）要求
17. 测试矩阵

---

## 1. 功能概述与设计哲学

### 1.1 设计决策来源

回收站规格来源于 L1-42 D 决策和 Part 3a N-02 决策：

- **L1-42 D**：回收站 + 手动清空 + 自动过期 + 删除强制确认 + 审计日志
- **用户补充**："回收站必须要在应用内部可以使用，可以占用存储统计，必须与版本历史关联"
- **L1-40 C**：删除/恢复/批量命令都要二次确认（C 级防呆）

### 1.2 核心设计原则

**软删除优先**：所有文档删除操作默认是软删除（移入回收站），彻底删除必须在回收站中手动执行。

**过期自动清理**：软删除文档默认 30 天后自动彻底删除（可用户配置：7 / 30 / 90 天 / 永不自动删除）。

**与版本历史联动**：文档彻底删除时，其所有版本历史记录同步删除，避免孤儿版本污染数据库。

**存储统计可见**：回收站文档占用的存储空间计入 Data Insights，并单独分类展示。

**二次确认防呆**：彻底删除和清空回收站均需用户二次确认，清楚展示将要删除的内容数量。

### 1.3 回收站 vs 归档的差异

| 维度 | 回收站（trashed） | 归档（archived） |
|------|-----------------|----------------|
| 语义 | 等待清理 | 冷存储保留 |
| 可搜索 | 是（回收站内搜索） | 是（全局搜索） |
| 可编辑 | 否（只读预览） | 否（恢复后才可编辑） |
| 恢复后状态 | draft（重新开始） | writing（保留写作状态） |
| 自动过期 | 是（30 天默认） | 否（永久保留） |
| 参与统计 | 是（独立统计项） | 否（归档不参与统计） |
| 版本历史 | 保留（还原时跟随） | 保留 |

---

## 2. 文档状态机中的 trashed 状态

### 2.1 状态定义

`trashed` 是 `DocumentStatus` 枚举的一个特殊旁路状态：

```typescript
enum DocumentStatus {
  Draft = 'draft',
  Writing = 'writing',
  Review = 'review',
  ReadyToPublish = 'ready_to_publish',
  Published = 'published',
  Archived = 'archived',
  // 旁路状态（不参与正常生命周期转移链）
  Trashed = 'trashed',
}
```

### 2.2 trashed 状态转移规则

```
任意状态 ──"软删除"──▶ Trashed
Trashed ──"还原"──▶ Draft（无论删除前是什么状态，还原后统一降级为 draft）
Trashed ──"彻底删除"──▶ [记录从数据库中永久消失]
```

**规则说明**：
- 任意状态（包括 Published、Archived）的文档均可软删除进入 Trashed
- 从 Trashed 还原时，状态统一降级为 Draft，而非恢复删除前的状态（避免"已发布"文档在未审核的情况下直接重回发布状态）
- Trashed 状态的文档不可编辑（只读）
- Trashed 状态不可直接跳转到其他状态（必须先还原为 Draft，再走正常状态机）

### 2.3 软删除字段

```typescript
// articles 表新增字段
interface ArticleSoftDelete {
  deletedAt: number | null;       // 软删除时间（Unix timestamp ms）
  expiresAt: number | null;       // 自动彻底删除时间（软删除时间 + 保留天数）
  deletedBy: string | null;       // 操作账户 id（多账户场景记录）
  preTrashStatus: DocumentStatus | null; // 软删除前的状态（用于审计展示）
}
```

---

## 3. 软删除数据模型

### 3.1 数据库 Schema

```sql
-- articles 表新增字段
ALTER TABLE articles ADD COLUMN deleted_at INTEGER;          -- Unix timestamp ms
ALTER TABLE articles ADD COLUMN expires_at INTEGER;         -- Unix timestamp ms  
ALTER TABLE articles ADD COLUMN deleted_by TEXT;            -- account_id
ALTER TABLE articles ADD COLUMN pre_trash_status TEXT;      -- 删前状态

-- 索引
CREATE INDEX idx_articles_deleted_at ON articles(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_articles_expires_at ON articles(expires_at) WHERE expires_at IS NOT NULL;
```

### 3.2 软删除标记逻辑

```typescript
async function softDeleteDocument(
  articleId: string,
  accountId: string,
  retentionDays: number
): Promise<void> {
  const now = Date.now();
  const expiresAt = retentionDays === -1
    ? null  // -1 表示永不自动删除
    : now + retentionDays * 24 * 60 * 60 * 1000;

  await db.articles.update(articleId, {
    status: DocumentStatus.Trashed,
    deletedAt: now,
    expiresAt,
    deletedBy: accountId,
    preTrashStatus: previousStatus,  // 记录删前状态
  });
}
```

### 3.3 保留天数配置

保留天数由用户在 Settings > 数据 > 回收站保留期 中配置：

| 选项 | 保留天数 | 说明 |
|------|---------|------|
| 7 天 | 7 | 快速清理 |
| 30 天（默认） | 30 | 平衡选项 |
| 90 天 | 90 | 长期保留 |
| 永不自动删除 | -1 | 手动管理 |

---

## 4. TrashBin 页面规格

### 4.1 路由

```
路由：/trash
组件：src/views/TrashView.vue
```

### 4.2 页面布局

```
┌──────────────────────────────────────────────────────────────┐
│  回收站                                    [清空回收站]       │  ← 页头
├──────────────────────────────────────────────────────────────┤
│  [搜索框：回收站内搜索...]            [全选] [批量操作栏]     │
├──────────────────────────────────────────────────────────────┤
│  [Checkbox] 文章标题一                     (删除于 3 天前)    │
│             摘要文字...（最多 1 行）         [剩余 27 天]      │
│             word 1200 字  标签              [还原] [彻底删除] │
├──────────────────────────────────────────────────────────────┤
│  [Checkbox] 文章标题二                     (删除于 15 天前)   │
│             摘要文字...                     [剩余 15 天]      │
│             word 800 字   标签              [还原] [彻底删除] │
├──────────────────────────────────────────────────────────────┤
│  [Checkbox] 文章标题三（已过期）            (删除于 32 天前)  │
│             摘要文字...                     [即将清除]        │
│             word 200 字                     [还原] [彻底删除] │
├──────────────────────────────────────────────────────────────┤
│  （空态：回收站是空的）                                       │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 列表项规格

每个回收站文档列表项显示：

| 字段 | 来源 | 规格 |
|------|------|------|
| 复选框 | 批量选择 | 左对齐，24px |
| 文章标题 | `articles.title` | 一行截断，最大 300px |
| 摘要 | `articles.excerpt` | 一行，灰色，可空 |
| 字数 | 实时计算 | "N 字" 格式 |
| 标签列表 | `articles.tags` | 最多显示 3 个标签，溢出省略 |
| 删除时间 | `articles.deletedAt` | "删除于 N 天前" |
| 剩余天数 | `expiresAt - now` | "剩余 N 天" 或 "即将清除" |
| 快捷操作 | 还原 / 彻底删除 | 文字按钮，右对齐 |

### 4.4 剩余天数着色规则

| 状态 | 剩余天数条件 | 颜色 |
|------|------------|------|
| 正常 | > 7 天 | `var(--color-text-secondary)` |
| 警告 | 1 ~ 7 天 | `var(--color-warning)` |
| 紧急 | 0 天或已过期 | `var(--color-error)` + "即将清除" |
| 永不过期 | `expiresAt === null` | `var(--color-text-tertiary)` + "永久保留" |

### 4.5 列表排序

默认按 `deletedAt` 降序（最近删除的在前）。用户可切换排序：

| 排序选项 | 说明 |
|---------|------|
| 删除时间（默认） | `deletedAt DESC` |
| 剩余天数 | `expiresAt ASC`（紧急的在前） |
| 标题 | `title ASC` |
| 字数 | `wordCount DESC` |

### 4.6 空态设计

```
┌──────────────────────────────────────┐
│                                      │
│      [纸张图标，线框风格]             │
│                                      │
│         回收站是空的                  │
│                                      │
│    删除的文档将在这里保留 30 天        │
│                                      │
└──────────────────────────────────────┘
```

---

## 5. 回收站操作规格

### 5.1 还原操作

- **入口**：列表项快捷操作"还原"按钮 / 批量操作栏"还原"
- **执行**：
  1. 清除 `deletedAt`、`expiresAt`、`deletedBy`、`preTrashStatus` 字段（均设为 null）
  2. 将 `status` 设为 `draft`（无论删前状态）
  3. 文档重新出现在文件管理器和 Hub 最近列表
- **反馈**：Toast "文档已还原" + 撤销按钮（撤销操作 = 重新软删除，保留原 expiresAt）
- **审计**：写入 `article.restored` 事件

### 5.2 彻底删除操作

- **入口**：列表项快捷操作"彻底删除"按钮 / 批量操作栏"彻底删除"
- **前置确认**：必须弹出确认对话框（见第 8 节）
- **执行**：
  1. 从 `articles` 表永久删除记录
  2. 从 `version_history` 表删除该文档所有版本快照（联动清理）
  3. 触发附件孤儿文件清理任务（延迟 24h，见第 10 节）
- **反馈**：Toast "已彻底删除"（无撤销按钮，不可逆）
- **审计**：写入 `article.purged` 事件

### 5.3 清空回收站操作

- **入口**：页头"清空回收站"按钮
- **前置确认**：必须弹出清空确认对话框（见第 8 节）
- **执行**：批量彻底删除当前账户下所有 `status === trashed` 的文档（含版本历史联动清理）
- **反馈**：Toast "回收站已清空（共 N 篇文档）"
- **审计**：写入 `article.trash_emptied` 事件，含清理数量

### 5.4 查看只读预览

- **入口**：点击列表项标题
- **形态**：右侧 Peek 面板（200ms 防抖），只读渲染（无编辑工具栏，无光标）
- **提示**：顶部横幅 "此文档已移入回收站，[还原] 后可编辑"
- **关闭**：点击其他列表项或按 `Esc`

---

## 6. 批量选择规格

### 6.1 进入批量选择模式

- **键盘**：`Ctrl+A` 全选所有列表项
- **鼠标**：点击任意 Checkbox（进入选择模式，该项被选中）
- **长按**（触摸设备，未来）：长按列表项进入选择模式

### 6.2 批量操作栏

```
┌──────────────────────────────────────────────────────────────┐
│  [全选 Checkbox]  已选 N 篇            [还原] [彻底删除] [X] │
└──────────────────────────────────────────────────────────────┘
```

批量操作栏浮于列表顶部（sticky），包含：
- 全选 Checkbox（点击全选/取消全选）
- 已选数量文字
- 批量还原按钮
- 批量彻底删除按钮（高亮红色）
- 取消选择按钮（X）

### 6.3 全选行为

- 勾选全选 Checkbox → 选中当前加载的所有项（支持懒加载场景下的"可见项全选"）
- 若已全选 → 点击取消全选
- 选择状态是"半选"时（部分选中）→ 全选 Checkbox 显示中间线状态（indeterminate）

### 6.4 批量确认规则

- 批量还原：**无需二次确认**（可通过 Toast 撤销）
- 批量彻底删除 1 篇：弹出单篇确认对话框
- 批量彻底删除 2+ 篇：弹出批量确认对话框，显示数量和前 3 篇预览

---

## 7. 回收站内搜索

### 7.1 搜索范围

搜索仅在回收站内文档中检索，不跨越到正常文档。

### 7.2 搜索字段

| 字段 | 搜索权重 |
|------|---------|
| `title` | 高 |
| `excerpt` | 中 |
| `content`（全文） | 低 |
| `tags` | 中 |

### 7.3 搜索实现

回收站内搜索复用 SearchEngine 的 DSL 查询层，但预设 `status: 'trashed'` 过滤条件：

```typescript
interface TrashSearchOptions {
  query: string;
  sortBy?: 'deletedAt' | 'expiresAt' | 'title' | 'wordCount';
  sortOrder?: 'asc' | 'desc';
}

// 搜索请求附加 status 过滤
function buildTrashQuery(options: TrashSearchOptions): SearchQuery {
  return {
    ...parseUserQuery(options.query),
    filters: [
      { field: 'status', value: DocumentStatus.Trashed, operator: 'eq' },
    ],
    sort: { field: options.sortBy ?? 'deletedAt', order: options.sortOrder ?? 'desc' },
  };
}
```

### 7.4 搜索结果高亮

标题和摘要中的匹配词高亮显示，复用命令面板高亮渲染算法。

---

## 8. 确认对话框规格

### 8.1 单篇彻底删除确认

```
┌──────────────────────────────────────────────────────────────┐
│  彻底删除文档                                                 │
│                                                              │
│  "文章标题" 将被永久删除，此操作不可撤销。                     │
│  该文档的所有版本历史记录将同步删除。                         │
│                                                              │
│  [取消]                              [彻底删除]（红色）       │
└──────────────────────────────────────────────────────────────┘
```

**规格**：
- "彻底删除"按钮为 `variant="destructive"`（红色背景）
- "取消"按钮为默认样式
- 对话框宽度 420px，圆角 12px
- 弹出动效：从中心缩放展开（80ms ease-out）

### 8.2 批量彻底删除确认

```
┌──────────────────────────────────────────────────────────────┐
│  彻底删除 N 篇文档                                           │
│                                                              │
│  以下文档将被永久删除，此操作不可撤销：                       │
│  · 文章标题一                                                │
│  · 文章标题二                                                │
│  · 文章标题三                                                │
│  ...以及另外 (N-3) 篇文档                                    │
│                                                              │
│  所有选中文档的版本历史记录将同步删除。                       │
│                                                              │
│  [取消]                    [彻底删除 N 篇]（红色）           │
└──────────────────────────────────────────────────────────────┘
```

### 8.3 清空回收站确认

```
┌──────────────────────────────────────────────────────────────┐
│  清空回收站                                                   │
│                                                              │
│  回收站中共有 N 篇文档，将被全部永久删除。                    │
│  此操作不可撤销，所有版本历史记录将同步删除。                 │
│                                                              │
│  [取消]                              [清空回收站]（红色）     │
└──────────────────────────────────────────────────────────────┘
```

### 8.4 共同规格

- 确认按钮文字必须包含将要删除的数量（"彻底删除 3 篇"，"清空回收站"）
- 两个操作按钮之间间距 ≥ 12px，防止误触
- 对话框外部点击**不关闭**（防止误触关闭）
- `Esc` 键关闭对话框（等同取消）
- 对话框关闭时带淡出动效（60ms）

---

## 9. 自动清理 Job（Tauri 后台定时）

### 9.1 触发时机

| 触发条件 | 行为 |
|---------|------|
| 应用启动时 | 执行一次 GC 检查 |
| 每日 03:00（本地时间） | 定时 GC 检查（应用在运行时） |
| 应用从后台恢复时 | 若距上次 GC > 12 小时，触发检查 |

### 9.2 GC 逻辑

```typescript
// src/services/trash/gc-scheduler.ts

async function runGarbageCollection(): Promise<GCResult> {
  const now = Date.now();
  
  // 查找已过期的软删除文档（expiresAt < now）
  const expiredArticles = await db.articles
    .where('status').equals(DocumentStatus.Trashed)
    .and(article => article.expiresAt !== null && article.expiresAt < now)
    .toArray();

  const purgedIds: string[] = [];
  const errors: { id: string; error: Error }[] = [];

  for (const article of expiredArticles) {
    try {
      await permanentlyDeleteArticle(article.id);
      purgedIds.push(article.id);
    } catch (error) {
      errors.push({ id: article.id, error: error as Error });
    }
  }

  // 写入审计日志
  if (purgedIds.length > 0) {
    await activityLogger.log({
      event: 'article.gc_purged',
      metadata: { count: purgedIds.length, ids: purgedIds },
    });
  }

  return { purgedCount: purgedIds.length, errors };
}

interface GCResult {
  purgedCount: number;
  errors: { id: string; error: Error }[];
}
```

### 9.3 Tauri 定时实现

```rust
// src-tauri/src/gc_scheduler.rs

use tauri::Manager;
use std::time::Duration;
use tokio::time;

pub async fn start_gc_scheduler(app: tauri::AppHandle) {
    let mut interval = time::interval(Duration::from_secs(12 * 3600)); // 每 12 小时
    
    loop {
        interval.tick().await;
        
        // 通知前端执行 GC
        let _ = app.emit_all("gc:run", ());
    }
}
```

前端监听 Tauri 事件：
```typescript
import { listen } from '@tauri-apps/api/event';

await listen('gc:run', async () => {
  await trashRepository.runGarbageCollection();
});
```

### 9.4 GC 过程中的应用状态处理

- GC 在后台安静执行，不弹出 UI 提示
- GC 完成后，若当前页面是回收站视图，自动刷新列表
- GC 执行期间若用户正在查看被 GC 的文档预览，关闭预览面板并提示"文档已过期删除"
- GC 失败的条目记录错误日志，不影响其他条目的 GC（失败不中断）

---

## 10. 文件关联清理（附件孤儿文件策略）

### 10.1 策略概述

文档彻底删除时，该文档引用的图片和附件（`assets` 表中的记录）不会立即删除，而是：
1. 彻底删除发生时，触发"延迟 24h 孤儿文件检查任务"
2. 24h 后，检查这些 asset 是否仍被其他文档引用（引用计数 = 0）
3. 引用计数为 0 的 asset 才真正删除文件和数据库记录

### 10.2 延迟清理的原因

- 防止用户撤销操作（24h 内还可能从日志恢复）
- 防止 asset 被其他文档引用时误删（去重场景）
- 给 GC 操作留出安全窗口

### 10.3 引用计数实现

```typescript
// assets 表结构
interface Asset {
  id: string;
  filePath: string;     // 本地文件路径
  contentHash: string;  // SHA-256 内容哈希（用于去重检测）
  referenceCount: number; // 引用此 asset 的文档数量
  createdAt: number;
  lastReferencedAt: number;
}

// 文档引用 asset 的中间表
interface ArticleAsset {
  articleId: string;
  assetId: string;
  embeddedAt: number;
}
```

### 10.4 孤儿文件检查 Job

```typescript
// src/services/assets/orphan-cleaner.ts

interface OrphanCleanTask {
  assetIds: string[];
  scheduledAt: number;       // 任务创建时间
  executeAfter: number;      // 最早执行时间（createAt + 24h）
}

async function executeOrphanClean(task: OrphanCleanTask): Promise<void> {
  const now = Date.now();
  if (now < task.executeAfter) return; // 未到执行时间

  for (const assetId of task.assetIds) {
    const asset = await db.assets.get(assetId);
    if (!asset) continue; // 已被其他途径清理
    
    if (asset.referenceCount === 0) {
      // 删除物理文件
      await tauriFs.removeFile(asset.filePath);
      // 删除数据库记录
      await db.assets.delete(assetId);
      
      await activityLogger.log({
        event: 'asset.orphan_cleaned',
        metadata: { assetId, filePath: asset.filePath },
      });
    }
  }
}
```

---

## 11. TrashRepository

```typescript
// src/repositories/trash.repository.ts

class TrashRepository {
  /**
   * 软删除单个文档
   */
  async softDelete(
    articleId: string,
    accountId: string
  ): Promise<void>;

  /**
   * 批量软删除
   */
  async softDeleteBatch(
    articleIds: string[],
    accountId: string
  ): Promise<BatchResult>;

  /**
   * 还原软删除文档（重置为 draft 状态）
   */
  async restore(articleId: string): Promise<void>;

  /**
   * 批量还原
   */
  async restoreBatch(articleIds: string[]): Promise<BatchResult>;

  /**
   * 彻底删除文档（含版本历史）
   */
  async permanentDelete(articleId: string): Promise<void>;

  /**
   * 批量彻底删除
   */
  async permanentDeleteBatch(articleIds: string[]): Promise<BatchResult>;

  /**
   * 清空整个回收站
   */
  async emptyTrash(accountId: string): Promise<EmptyTrashResult>;

  /**
   * 列出回收站文档（分页 + 排序）
   */
  async listTrashed(options: ListTrashedOptions): Promise<PaginatedResult<TrashedArticle>>;

  /**
   * 回收站内搜索
   */
  async searchTrashed(options: TrashSearchOptions): Promise<TrashedArticle[]>;

  /**
   * 获取回收站存储统计
   */
  async getTrashStorageStats(): Promise<TrashStorageStats>;

  /**
   * 执行过期文档 GC
   */
  async runGarbageCollection(): Promise<GCResult>;

  /**
   * 获取单篇文档的 trashed 详情
   */
  async getTrashedArticle(articleId: string): Promise<TrashedArticle | null>;
}

interface ListTrashedOptions {
  accountId: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'deletedAt' | 'expiresAt' | 'title' | 'wordCount';
  sortOrder?: 'asc' | 'desc';
}

interface BatchResult {
  succeeded: string[];
  failed: { id: string; error: Error }[];
}

interface EmptyTrashResult {
  deletedCount: number;
  errors: { id: string; error: Error }[];
}

interface TrashStorageStats {
  /** 回收站文档总数 */
  totalCount: number;
  /** 回收站文档占用存储（字节） */
  totalBytes: number;
  /** 即将过期的文档数（7 天内） */
  expiringCount: number;
  /** 已过期但尚未 GC 的文档数 */
  expiredCount: number;
}

interface TrashedArticle {
  id: string;
  title: string;
  excerpt: string | null;
  wordCount: number;
  tags: string[];
  deletedAt: number;
  expiresAt: number | null;
  deletedBy: string | null;
  preTrashStatus: DocumentStatus;
  /** 版本历史快照数量（还原后跟随） */
  versionCount: number;
}
```

---

## 12. useTrashStore

```typescript
// src/stores/trash.ts

interface TrashStoreState {
  /** 回收站文档列表 */
  items: TrashedArticle[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 加载错误 */
  error: Error | null;
  /** 搜索词 */
  searchQuery: string;
  /** 排序配置 */
  sort: {
    field: 'deletedAt' | 'expiresAt' | 'title' | 'wordCount';
    order: 'asc' | 'desc';
  };
  /** 已选文档 id 列表（批量操作） */
  selectedIds: Set<string>;
  /** 是否全选模式 */
  isAllSelected: boolean;
  /** 当前预览的文档 id */
  previewingId: string | null;
  /** 存储统计 */
  storageStats: TrashStorageStats | null;
  /** 总文档数（用于分页） */
  totalCount: number;
  /** 当前页码 */
  currentPage: number;
  pageSize: number;
}

interface TrashStoreActions {
  /** 加载回收站列表 */
  loadItems(): Promise<void>;
  /** 刷新（用于操作后刷新） */
  refresh(): Promise<void>;
  /** 更新搜索词 */
  setSearchQuery(query: string): void;
  /** 更新排序 */
  setSort(field: string, order: 'asc' | 'desc'): void;
  /** 切换选择状态 */
  toggleSelect(id: string): void;
  /** 全选/取消全选 */
  toggleSelectAll(): void;
  /** 清除选择 */
  clearSelection(): void;
  /** 还原文档（单篇） */
  restore(id: string): Promise<void>;
  /** 批量还原 */
  restoreSelected(): Promise<void>;
  /** 彻底删除（需外部确认后调用） */
  permanentDelete(id: string): Promise<void>;
  /** 批量彻底删除（需外部确认后调用） */
  permanentDeleteSelected(): Promise<void>;
  /** 清空回收站（需外部确认后调用） */
  emptyTrash(): Promise<void>;
  /** 打开预览 */
  openPreview(id: string): void;
  /** 关闭预览 */
  closePreview(): void;
  /** 加载存储统计 */
  loadStorageStats(): Promise<void>;
  /** 切换页码 */
  setPage(page: number): void;
}

interface TrashStoreGetters {
  /** 当前是否有选中项 */
  hasSelection: (state: TrashStoreState) => boolean;
  /** 选中项数量 */
  selectionCount: (state: TrashStoreState) => number;
  /** 是否为半选状态（部分选中） */
  isIndeterminate: (state: TrashStoreState) => boolean;
  /** 是否存在即将过期的文档（7 天内） */
  hasExpiringItems: (state: TrashStoreState) => boolean;
  /** 当前预览文档对象 */
  previewingArticle: (state: TrashStoreState) => TrashedArticle | null;
}
```

---

## 13. TypeScript 类型全量定义

```typescript
// src/types/trash.ts

export { DocumentStatus } from './document-lifecycle';

export interface TrashedArticle {
  id: string;
  title: string;
  excerpt: string | null;
  wordCount: number;
  tags: string[];
  deletedAt: number;
  expiresAt: number | null;
  deletedBy: string | null;
  preTrashStatus: DocumentStatus;
  versionCount: number;
}

export interface TrashStorageStats {
  totalCount: number;
  totalBytes: number;
  expiringCount: number;
  expiredCount: number;
}

export interface ListTrashedOptions {
  accountId: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'deletedAt' | 'expiresAt' | 'title' | 'wordCount';
  sortOrder?: 'asc' | 'desc';
  searchQuery?: string;
}

export interface TrashSearchOptions {
  query: string;
  sortBy?: 'deletedAt' | 'expiresAt' | 'title' | 'wordCount';
  sortOrder?: 'asc' | 'desc';
}

export interface GCResult {
  purgedCount: number;
  errors: { id: string; error: Error }[];
}

export interface BatchResult {
  succeeded: string[];
  failed: { id: string; error: Error }[];
}

export interface EmptyTrashResult {
  deletedCount: number;
  errors: { id: string; error: Error }[];
}

export interface OrphanCleanTask {
  assetIds: string[];
  scheduledAt: number;
  executeAfter: number;
}

export interface TrashRetentionConfig {
  days: 7 | 30 | 90 | -1; // -1 = 永不自动删除
}

export class ArticleNotInTrashError extends Error {
  constructor(articleId: string) {
    super(`Article "${articleId}" is not in trash`);
    this.name = 'ArticleNotInTrashError';
  }
}

export class ArticleAlreadyPurgedError extends Error {
  constructor(articleId: string) {
    super(`Article "${articleId}" has already been permanently deleted`);
    this.name = 'ArticleAlreadyPurgedError';
  }
}
```

---

## 14. 存储统计联动

回收站文档的存储占用数据由 Data Insights（08-data-insights-spec.md）统一管理，回收站模块只需调用 `getTrashStorageStats()` 获取聚合数据。

### 14.1 存储统计分类

Data Insights 存储统计区域展示三档分类（N-02 决策）：

| 分类 | 计算口径 |
|------|---------|
| 活跃文档 | `status IN (draft, writing, review, ready_to_publish, published)` |
| 归档文档 | `status = archived` |
| 回收站文档 | `status = trashed` |

### 14.2 回收站页面存储展示

回收站页面顶部展示存储统计摘要：

```
回收站 · N 篇文档 · 占用 X.X MB
```

---

## 15. 审计日志覆盖

所有回收站相关操作写入 `activity_logs` 表，符合 L1-34 D 全范围审计铁律。

| 事件名 | 触发时机 | metadata 字段 |
|--------|---------|--------------|
| `article.trashed` | 软删除单篇 | `articleId`, `title`, `accountId`, `expiresAt` |
| `article.trashed_batch` | 批量软删除 | `count`, `articleIds` |
| `article.restored` | 还原单篇 | `articleId`, `title`, `restoredStatus: 'draft'` |
| `article.restored_batch` | 批量还原 | `count`, `articleIds` |
| `article.purged` | 彻底删除单篇 | `articleId`, `title`, `versionCount`, `assetCount` |
| `article.purged_batch` | 批量彻底删除 | `count`, `articleIds` |
| `article.trash_emptied` | 清空回收站 | `count`, `accountId` |
| `article.gc_purged` | 自动 GC 清理 | `count`, `purgedIds` |
| `asset.orphan_cleaned` | 孤儿文件清理 | `assetId`, `filePath` |

---

## 16. 无障碍（a11y）要求

- 回收站列表：`role="list"` + 每个列表项 `role="listitem"` + `aria-label="<文章标题>"`
- 复选框：`<input type="checkbox">` + `aria-label="选择《<文章标题>》"`
- 全选复选框：`aria-checked="mixed"` 表示半选状态
- 确认对话框：`role="alertdialog"` + `aria-labelledby` 指向标题 + `aria-describedby` 指向说明
- "彻底删除"按钮：`aria-label` 包含文章名或数量（不只是文字标签）
- 剩余天数倒计时：`aria-live="polite"` 避免频繁播报
- 预览面板：`role="complementary"` + `aria-label="文档预览"`
- Tab 键可完整操作全部功能（选择 → 操作 → 确认）

---

## 17. 测试矩阵

| # | 测试类型 | 测试描述 | 预期结果 |
|---|----------|----------|----------|
| 1 | 单元 | `softDelete` 写入正确字段 | `status=trashed`，`deletedAt` 有值，`expiresAt = deletedAt + 30d` |
| 2 | 单元 | `softDelete` 保留 `preTrashStatus` | 删前状态正确记录 |
| 3 | 单元 | `restore` 重置所有 trash 字段 | `status=draft`，`deletedAt=null`，`expiresAt=null` |
| 4 | 单元 | `runGarbageCollection` 清理过期文档 | `expiresAt < now` 的文档被永久删除 |
| 5 | 单元 | GC 不清理 `expiresAt = null` 的文档 | 永不过期配置的文档不被 GC |
| 6 | 单元 | `permanentDelete` 连带删除版本历史 | version_history 中该文档记录全部清除 |
| 7 | 单元 | `getTrashStorageStats` 统计正确 | 返回正确的 totalCount 和 totalBytes |
| 8 | 单元 | `buildTrashQuery` 包含 `status=trashed` 过滤 | 搜索不返回非 trashed 文档 |
| 9 | 集成 | Hub 文件管理删除文档 → 进入回收站 | 文档出现在回收站，不再在主列表 |
| 10 | 集成 | 回收站"还原"文档 → 重新出现在主列表 | 文档 status=draft，出现在文件管理器 |
| 11 | 集成 | 回收站"彻底删除"弹出确认对话框 | 确认对话框 DOM 渲染 |
| 12 | 集成 | 彻底删除后文档从数据库消失 | DB 中 articleId 不存在 |
| 13 | 集成 | 清空回收站弹出确认对话框含数量 | 对话框文字包含 "N 篇文档" |
| 14 | 集成 | 全选 Checkbox 选中所有列表项 | `selectedIds.size === items.length` |
| 15 | 集成 | 批量还原后 Toast 出现 | Toast 显示"N 篇文档已还原" |
| 16 | 集成 | 回收站内搜索实时过滤 | 搜索词匹配的文档显示，高亮 |
| 17 | 集成 | 软删除写入 `article.trashed` 审计事件 | activity_logs 有对应记录 |
| 18 | 集成 | 还原写入 `article.restored` 审计事件 | activity_logs 有对应记录 |
| 19 | 集成 | 彻底删除写入 `article.purged` 审计事件 | activity_logs 有对应记录 |
| 20 | 集成 | GC 写入 `article.gc_purged` 审计事件 | activity_logs 有 gc_purged 记录 |
| 21 | 集成 | 保留天数改为 7 天，`expiresAt = deletedAt + 7d` | 数据库字段值正确 |
| 22 | 集成 | 孤儿文件检查任务延迟 24h 后执行 | 24h 前文件不删除，24h 后引用计数=0 的文件删除 |
| 23 | 集成 | 文档被两个文档引用的 asset，彻底删除一个 | asset.referenceCount 减 1，文件不删除 |
| 24 | 集成 | 回收站空时显示空态 UI | 空态图标和文字渲染 |
| 25 | 集成 | 点击列表项打开只读预览面板 | 预览面板渲染，顶部显示"已移入回收站"横幅 |

---

*本文档覆盖回收站完整技术规格，包含状态机集成、数据模型、UI 规格、后台 GC、附件孤儿清理策略、Repository、Store 及测试矩阵，共计约 740 行，版本 v2.1 Draft。*

## 2026-05-02 Implementation Baseline Note

Baseline status: Pass for the compatible local-first trash/recycle service and store layer. Full TrashBin UI remains partially pending.

Completed implementation coverage:
- `ARTICLE_STATUS.TRASHED` is now part of the Article status union and runtime schema.
- Article rows now support soft-delete metadata: `deletedAt`, `expiresAt`, `deletedBy`, and `preTrashStatus`.
- Dexie schema v13 adds trash lookup indexes on `articles` while preserving existing tables and content rows until purge.
- `src/services/trash/*` implements real IndexedDB-backed list, moveToTrash, restore, purge, empty, purgeExpired, and summary operations.
- `trashRepository.moveToTrash()` writes recoverable metadata and a 30-day retention deadline; it does not delete the article row.
- `trashRepository.restore()` clears soft-delete metadata and restores status to `draft` by design.
- `trashRepository.purge()` is fail-closed for non-trashed articles and removes both the article row and related `contents` rows only after the article is in trash.
- `useTrashStore` exposes real repository-backed state and actions; it does not seed UI-only trash rows.
- `useArticleStore.deleteArticle()` now routes default deletes through the trash repository while preserving category-count decrement, selected article cleanup, audit, and sync dirty tracking.
- Normal `articleRepository` list/search/recent/category/paginated reads exclude `trashed` by default.
- `SearchEngine` drops trashed documents from rebuild and incremental indexing, so default document search does not leak deleted content.

Validation evidence:
- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-30-trash-recycle` passed after JSONL encoding repair.
- `pnpm exec vitest run src/services/trash/trash.test.ts` passed with 6 tests.
- `pnpm exec vitest run src/services/search/search-engine.test.ts` passed with 8 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm exec vitest run` passed with 11 files and 71 tests.
- `pnpm build` passed with only existing non-blocking Vite dynamic/static import and chunk-size warnings.
- Browser smoke on `http://127.0.0.1:5183/settings?tab=about` verified real IndexedDB v13 writes: soft delete persisted `status: trashed`, `deletedBy`, and 30-day `expiresAt`; normal article list hid the row; trash list contained it; SearchEngine returned 0 for the trashed article; restore returned `draft`; purge deleted the article and related content row; console errors were 0.

Pending for full Spec 30 pass:
- Dedicated TrashBin route/page, read-only preview, batch-selection toolbar, and confirmation dialogs.
- Tauri background auto-cleanup job and packaged desktop validation.
- Asset orphan cleanup integration beyond article/content purge.
- DataInsights storage chart integration for trash storage bytes.
- Full trash-internal search UI, accessibility matrix, and end-to-end destructive confirmation coverage.
