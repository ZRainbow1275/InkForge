# Spec 23 — SyncProvider 同步提供者系统

| 字段 | 值 |
|---|---|
| Spec ID | 23 |
| 标题 | SyncProvider 同步提供者系统 |
| 状态 | 草稿 |
| 优先级 | P0 |
| 关联决策 | L1-20(D) / L1-21(D+补充) / L1-22(D+补充) / T07-02(D) |
| 关联 Spec | 06-account-auth-spec / 24-permission-audit-spec / 26-multi-account-profile-spec |
| 作者 | InkForge Spec Engineer |
| 创建日期 | 2026-04-20 |

---

## 1. 背景与决策依据

### 1.1 铁律来源

- **铁律 8（L1-20 D）**：v2.1 必须真实落地 WebDAV / Git / 自有服务三种 SyncProvider，不是 UI 预留 + 假实现。
- **铁律 9（L1-22 D + 补充）**：冲突不能自动 last-write-wins，必须走三方合并，失败时强制人工决策并写入审计日志。
- **T07-02 D**：Sync 走 Git 同步方案（文章目录即 Git 仓库），WebDAV 亦必须实装。

### 1.2 范围边界

v2.1 必须交付：
- `WebDAVProvider`（完整实装，包含认证/增量/冲突）
- `GitProvider`（完整实装，包含 commit 策略/冲突/分支策略）
- `SelfHostedProvider`（MVP 级实现，协议定义完整，可连接自有 InkForge Server）

v2.1 以 Stub 骨架预留（UI 可见，但不实际调用）：
- 未来扩展 Provider（Dropbox / S3 / Notion 同步等）

---

## 2. SyncProvider 核心接口

### 2.1 TypeScript 接口定义

```typescript
// src/services/sync/provider.ts

export type SyncProviderId = 'webdav' | 'git' | 'self-hosted' | string;

export interface SyncConfig {
  providerId: SyncProviderId;
  displayName: string;
  endpoint: string;
  credentials: SyncCredentials;
  options: Record<string, unknown>;
  syncIntervalMs: number;         // 默认 300_000 (5 分钟)
  conflictStrategy: ConflictStrategy;
  enabled: boolean;
  profileId: string;
}

export type SyncCredentials =
  | { kind: 'basic'; username: string; passwordHash: string }
  | { kind: 'digest'; username: string; passwordHash: string }
  | { kind: 'token'; token: string }
  | { kind: 'ssh'; keyPath: string; passphrase?: string }
  | { kind: 'none' };

export type ConflictStrategy = 'three-way-merge' | 'manual-always';

export interface SyncPayload {
  docId: string;
  title: string;
  content: string;              // HTML 主存储（X-06）
  contentHash: string;          // SHA-256
  updatedAt: number;            // Unix timestamp (ms)
  vectorClock: VectorClock;
  attachmentIds: string[];
  metaSnapshot: Record<string, unknown>;
}

export interface SyncPullResult {
  updated: SyncPayload[];
  deleted: string[];            // docId 列表
  conflicts: ConflictRecord[];
  syncedAt: number;
}

export interface ConflictRecord {
  id: string;                   // nanoid
  docId: string;
  localPayload: SyncPayload;
  remotePayload: SyncPayload;
  basePayload?: SyncPayload;    // 三方合并的公共祖先
  detectedAt: number;
  status: ConflictStatus;
  resolvedAt?: number;
  resolvedBy?: 'local' | 'remote' | 'manual';
  auditId?: string;
}

export type ConflictStatus = 'pending' | 'merging' | 'resolved' | 'failed';

export interface SyncLog {
  id: string;
  providerId: SyncProviderId;
  profileId: string;
  operation: 'push' | 'pull' | 'connect' | 'disconnect' | 'conflict_resolve';
  status: 'success' | 'failure' | 'partial';
  docCount?: number;
  errorCode?: string;
  errorMessage?: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
}

export interface SyncStatus {
  state: SyncState;
  lastSyncAt?: number;
  pendingPushCount: number;
  pendingConflictCount: number;
  errorMessage?: string;
  providerId: SyncProviderId;
}

export type SyncState =
  | 'idle'
  | 'connecting'
  | 'syncing'
  | 'conflict'
  | 'paused'
  | 'error'
  | 'offline';

export interface SyncProvider {
  readonly id: SyncProviderId;
  readonly config: SyncConfig;

  connect(config: SyncConfig): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<{ latencyMs: number; serverVersion?: string }>;

  push(docs: SyncPayload[]): Promise<{ succeeded: string[]; failed: string[] }>;
  pull(since: number): Promise<SyncPullResult>;

  listConflicts(): Promise<ConflictRecord[]>;
  resolveConflict(id: string, strategy: ResolveStrategy): Promise<void>;

  getStatus(): SyncStatus;
  getLogs(limit?: number): Promise<SyncLog[]>;
}

export type ResolveStrategy =
  | { kind: 'accept-local' }
  | { kind: 'accept-remote' }
  | { kind: 'manual'; mergedContent: string };
```

### 2.2 VectorClock 定义

```typescript
// src/services/sync/vectorClock.ts

/**
 * 向量时钟：每个 Profile 对应一个独立计数器
 * key = profileId, value = 单调递增的逻辑时间戳
 */
export type VectorClock = Record<string, number>;

export function incrementClock(clock: VectorClock, profileId: string): VectorClock {
  return { ...clock, [profileId]: (clock[profileId] ?? 0) + 1 };
}

export function mergeClock(a: VectorClock, b: VectorClock): VectorClock {
  const result: VectorClock = { ...a };
  for (const [k, v] of Object.entries(b)) {
    result[k] = Math.max(result[k] ?? 0, v);
  }
  return result;
}

export type ClockRelation = 'before' | 'after' | 'concurrent' | 'equal';

export function compareClocks(a: VectorClock, b: VectorClock): ClockRelation {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  const allKeys = new Set([...keysA, ...keysB]);
  let aLt = false;
  let bLt = false;
  for (const k of allKeys) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    if (va < vb) aLt = true;
    if (va > vb) bLt = true;
  }
  if (!aLt && !bLt) return 'equal';
  if (aLt && !bLt) return 'before';
  if (!aLt && bLt) return 'after';
  return 'concurrent';
}
```

---

## 3. SyncState 状态机

### 3.1 状态转换图

```
         ┌──────────────────────────────────────────────┐
         │                                              │
    [idle] ──connect──► [connecting] ──success──► [idle]
         │                    │                     │
         │                  error                  sync
         │                    ▼                     ▼
         │              [error] ◄──── [syncing] ──conflict──► [conflict]
         │                    │          │                         │
         │               reconnect    success                   resolve
         │                    │          │                         │
         │                    └──────────┴─────────────────────────┘
         │
    pause/resume
         │
    [paused] ─────────────────────────────────────────────►
         │
   network-offline
         │
    [offline] ──network-online──► [idle]
```

### 3.2 状态语义

| 状态 | 语义 | 允许的操作 | UI 表现 |
|---|---|---|---|
| `idle` | 上次同步成功，等待下次触发 | 手动触发 / 暂停 / 断开 | 绿色指示点，显示"上次同步时间" |
| `connecting` | 正在建立连接并验证凭据 | 取消 | 旋转加载图标 |
| `syncing` | 正在执行 push/pull 操作 | 取消（记录为中断） | 进度条，显示"正在同步 N 个文档" |
| `conflict` | 检测到一或多个冲突，等待用户处理 | 打开冲突解决 UI / 暂停 | 橙色警告图标 + 冲突计数 |
| `paused` | 用户手动暂停 | 恢复 / 断开 | 灰色暂停图标 |
| `error` | 连接/网络/认证等错误 | 重试 / 断开 / 查看错误详情 | 红色错误图标 + 错误摘要 |
| `offline` | 检测到网络离线 | 自动恢复（监听网络事件） | 灰色离线图标 |

---

## 4. WebDAVProvider 规格

### 4.1 认证方式

| 方式 | 实现 | 备注 |
|---|---|---|
| Basic | Authorization: Basic base64(user:pass) | 需 HTTPS |
| Digest | RFC 7617 | 支持 MD5/SHA-256 |
| Token / Bearer | Authorization: Bearer token | 用于 Nextcloud / ownCloud |

凭据存储于 Tauri 安全存储（Keyring API），不存 IndexedDB 明文。

### 4.2 路径映射规则

```
WebDAV 根路径：{endpoint}/inkforge/{profileId}/
文档路径：     {根路径}/docs/{docId}.html
附件路径：     {根路径}/attachments/{attachmentId}{ext}
元数据路径：   {根路径}/.inkforge-meta.json
```

`.inkforge-meta.json` 结构：
```json
{
  "schemaVersion": 1,
  "profileId": "prof_abc123",
  "syncedAt": 1713600000000,
  "docIndex": {
    "doc_xyz": { "contentHash": "sha256:...", "updatedAt": 1713599000000 }
  }
}
```

### 4.3 批量操作

**PROPFIND（列出所有文档）**:
```
PROPFIND {根路径}/docs/ HTTP/1.1
Depth: 1
Content-Type: application/xml

<propfind>
  <prop>
    <getlastmodified />
    <getcontentlength />
    <getetag />
  </prop>
</propfind>
```

**批量 PUT（推送文档）**：
- 单批次最多 20 个文档并发 PUT
- 每个 PUT 包含 `X-InkForge-Doc-Hash` 和 `X-InkForge-Vector-Clock` 自定义请求头
- 服务器若支持 If-Match（ETag 条件），则附带 ETag 做乐观锁

**大文档分块上传**：
- 单文档 HTML 超过 5 MB 时启用分块
- 使用 TUS 协议（tus-js-client）或回退到自定义分块 PUT
- 每块大小：2 MB

### 4.4 增量同步逻辑

```typescript
async pull(since: number): Promise<SyncPullResult> {
  // 1. PROPFIND 列出服务器文档（含 ETag 和 Last-Modified）
  const serverIndex = await this.propfindDocs();

  // 2. 比对本地 meta 的 contentHash
  const localIndex = await this.getLocalMeta();

  const updated: SyncPayload[] = [];
  const deleted: string[] = [];

  for (const [docId, serverMeta] of Object.entries(serverIndex)) {
    const localMeta = localIndex[docId];
    // 只拉取 hash 不同的文档（跳过未变化文档）
    if (!localMeta || localMeta.contentHash !== serverMeta.etag) {
      const payload = await this.fetchDoc(docId);
      updated.push(payload);
    }
  }

  // 标记本地有但服务器已删除的文档
  for (const docId of Object.keys(localIndex)) {
    if (!serverIndex[docId]) deleted.push(docId);
  }

  // 3. 冲突检测（向量时钟比对）
  const conflicts = await this.detectConflicts(updated);

  return { updated, deleted, conflicts, syncedAt: Date.now() };
}
```

### 4.5 错误码映射

| HTTP 状态码 | 错误类型 | 重试策略 |
|---|---|---|
| 401 | 认证失败 | 不重试，通知用户重新输入凭据 |
| 403 | 权限不足 | 不重试，提示检查服务器权限 |
| 404 | 路径不存在 | 尝试创建目录，失败则通知 |
| 409 | 冲突 | 进入冲突解决流程 |
| 423 | 资源被锁定 | 等待 10s 后重试，最多 3 次 |
| 507 | 服务器存储满 | 通知用户，不重试 |
| 5xx | 服务器错误 | 指数退避重试 |
| 网络超时 | 连接超时 | 进入 offline 状态，等网络恢复 |

---

## 5. GitProvider 规格

### 5.1 工作原理

文章目录即 Git 仓库。每个 Profile 的文件根目录（`profile.fileRoot`）初始化为 Git 仓库，通过 Tauri 调用本机 git 命令行完成所有操作。

**目录结构**：
```
{fileRoot}/
  .git/
  .gitignore
  docs/
    {docId}.html          # 文章内容
    {docId}.meta.json     # 文章元数据（标题/标签/创建时间等）
  attachments/
    {attachmentId}{ext}
  .inkforge/
    sync.json             # 同步状态（lastPushedAt / vectorClock 等）
    export-presets.json   # 导出预设（跨账户共享区）
```

**.gitignore 模板**：
```gitignore
# InkForge 自动生成
.inkforge/cache/
*.tmp
*.lock
node_modules/
.DS_Store
Thumbs.db
```

### 5.2 Commit 策略

通过 Settings > 同步 > Git 配置 可选三种 Commit 策略：

| 策略 | 触发时机 | Commit 消息格式 |
|---|---|---|
| `on-save`（默认） | 每次文档保存后（自动保存或手动保存） | `inkforge: update [docTitle] at [ISO-timestamp]` |
| `timed` | 可配置间隔（默认 5 分钟） | `inkforge: batch update [N docs] at [ISO-timestamp]` |
| `manual` | 用户在 Settings 或 Hub 手动点击"提交" | `inkforge: manual commit [userMessage]` (用户可输入消息) |

**Commit 消息示例**：
```
inkforge: update "深度思考与写作的关系" at 2026-04-20T10:30:00Z

Changed:
- docs/doc_abc123.html (modified)
- docs/doc_abc123.meta.json (modified)
```

### 5.3 分支策略

| 设置项 | 默认值 | 说明 |
|---|---|---|
| 主分支名 | `main` | 可在 Settings 修改 |
| 推送目标 | `origin/main` | 配置 remote 后生效 |
| 本地工作分支 | `inkforge/local` | 所有本地提交先到此分支 |
| 合并策略 | `--no-ff` | 保留所有提交历史 |

**推送流程**：
```
1. 在 inkforge/local 分支 commit 本地变更
2. git fetch origin main
3. git merge origin/main --no-ff（触发三方合并）
4. 若有冲突 → 进入冲突解决流程（Section 7）
5. 无冲突 → git push origin inkforge/local:main
```

### 5.4 Tauri Git 命令调用

通过 `src-tauri/src/commands/git.rs` 暴露 Tauri 命令：

```rust
// src-tauri/src/commands/git.rs

#[tauri::command]
pub async fn git_init(repo_path: String) -> Result<(), String> { ... }

#[tauri::command]
pub async fn git_commit(repo_path: String, message: String, files: Vec<String>) -> Result<String, String> { ... }

#[tauri::command]
pub async fn git_fetch(repo_path: String, remote: String) -> Result<(), String> { ... }

#[tauri::command]
pub async fn git_merge(repo_path: String, branch: String) -> Result<MergeResult, String> { ... }

#[tauri::command]
pub async fn git_push(repo_path: String, remote: String, refspec: String) -> Result<(), String> { ... }

#[tauri::command]
pub async fn git_diff(repo_path: String, from_ref: String, to_ref: String) -> Result<String, String> { ... }

#[tauri::command]
pub async fn git_log(repo_path: String, limit: usize) -> Result<Vec<GitCommitInfo>, String> { ... }

#[derive(Serialize, Deserialize)]
pub struct MergeResult {
  pub success: bool,
  pub conflicts: Vec<ConflictedFile>,
}

#[derive(Serialize, Deserialize)]
pub struct ConflictedFile {
  pub path: String,
  pub doc_id: String,
  pub local_content: String,
  pub remote_content: String,
  pub base_content: Option<String>,
}
```

### 5.5 GitProvider 前端调用层

```typescript
// src/services/sync/providers/GitProvider.ts

import { invoke } from '@tauri-apps/api/core';

export class GitProvider implements SyncProvider {
  readonly id: SyncProviderId = 'git';

  async connect(config: SyncConfig): Promise<void> {
    await invoke('git_init', { repoPath: config.options.fileRoot as string });
    await this.configureRemote(config);
  }

  async push(docs: SyncPayload[]): Promise<{ succeeded: string[]; failed: string[] }> {
    const files = await this.writeDocsToFs(docs);
    const commitHash = await invoke<string>('git_commit', {
      repoPath: this.config.options.fileRoot,
      message: this.buildCommitMessage(docs),
      files,
    });
    await invoke('git_push', {
      repoPath: this.config.options.fileRoot,
      remote: 'origin',
      refspec: 'inkforge/local:main',
    });
    return { succeeded: docs.map(d => d.docId), failed: [] };
  }

  async pull(since: number): Promise<SyncPullResult> {
    await invoke('git_fetch', {
      repoPath: this.config.options.fileRoot,
      remote: 'origin',
    });
    const mergeResult = await invoke<MergeResult>('git_merge', {
      repoPath: this.config.options.fileRoot,
      branch: 'origin/main',
    });

    if (!mergeResult.success) {
      const conflicts = await this.buildConflictRecords(mergeResult.conflicts);
      return { updated: [], deleted: [], conflicts, syncedAt: Date.now() };
    }

    const updated = await this.readChangedDocs(since);
    return { updated, deleted: [], conflicts: [], syncedAt: Date.now() };
  }

  // ... 其他接口实现
}
```

---

## 6. SelfHostedProvider 规格（MVP 级）

### 6.1 协议定义

自有 InkForge Server 通过 REST API 提供同步端点：

```
POST   /api/v1/sync/push        # 推送文档批次
GET    /api/v1/sync/pull?since={ts}  # 拉取变更
GET    /api/v1/sync/status      # 服务器状态
POST   /api/v1/sync/conflict/{id}/resolve  # 解决冲突
GET    /api/v1/sync/logs        # 同步日志
```

认证：JWT Bearer Token（通过 Settings 配置 Server URL + API Key）

### 6.2 v2.1 实现范围

- 协议接口定义完整（类型、端点、请求/响应结构）
- `SelfHostedProvider` 类完整实现所有 `SyncProvider` 接口方法
- 认证流程（输入 Server URL + API Key → ping 验证 → 保存到 Keyring）
- 基本 push/pull/conflict 流程可运行
- 错误处理与重试逻辑

---

## 7. 冲突检测与解决

### 7.1 冲突检测算法

```typescript
// src/services/sync/conflictDetector.ts

export class ConflictDetector {
  detect(local: SyncPayload, remote: SyncPayload, base?: SyncPayload): 'no-conflict' | 'conflict' {
    const relation = compareClocks(local.vectorClock, remote.vectorClock);

    switch (relation) {
      case 'before':
        // 本地落后于远端，可安全用远端覆盖（拉取即可）
        return 'no-conflict';
      case 'after':
        // 本地领先于远端，可安全推送
        return 'no-conflict';
      case 'equal':
        // 内容相同
        return 'no-conflict';
      case 'concurrent':
        // 并发修改，检查内容是否实际冲突
        if (local.contentHash === remote.contentHash) return 'no-conflict';
        return 'conflict';
    }
  }
}
```

### 7.2 三方合并流程

**铁律 9 约束**：即使三方合并成功，也必须让用户确认（不允许静默覆盖）。

```
本地版本 (Local)  ←─── 公共祖先 (Base) ───→  远端版本 (Remote)
       │                                              │
       └──────────── diff3 三方合并算法 ──────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
              合并成功                 合并失败
                    │                    │
              展示合并结果          标记冲突区域
              要求用户确认          要求用户手动解决
                    │                    │
                    └─────── 用户决策 ────┘
                                  │
                          写入审计日志
```

**合并实现**：使用 `diff3` 算法（`node-diff3` 库）对 HTML 内容进行文本级三方合并。

### 7.3 冲突解决 UI

**ConflictResolveModal 组件**（`src/components/sync/ConflictResolveModal.vue`）：

布局：左右双栏 + 底部操作区

```
┌─────────────────────────────────────────────────────────────────┐
│  冲突文档：[docTitle]                            [X 关闭(暂留)] │
├────────────────────────────┬────────────────────────────────────┤
│  本地版本                  │  远端版本                          │
│  修改于 2026-04-20 10:30  │  修改于 2026-04-20 10:32          │
│  ─────────────────────── │  ──────────────────────────────── │
│  [内容预览，diff 高亮]     │  [内容预览，diff 高亮]             │
│                            │                                    │
├────────────────────────────┴────────────────────────────────────┤
│  [接受本地] [接受远端] [手动合并（打开合并编辑器）] [暂时跳过]  │
└─────────────────────────────────────────────────────────────────┘
```

**操作语义**：

| 操作 | 结果 | 审计记录 |
|---|---|---|
| 接受本地 | 以本地内容覆盖远端 | `sync.conflict.resolve { strategy: 'accept-local' }` |
| 接受远端 | 以远端内容覆盖本地 | `sync.conflict.resolve { strategy: 'accept-remote' }` |
| 手动合并 | 打开双栏编辑器，用户自行编辑最终版本 | `sync.conflict.resolve { strategy: 'manual' }` |
| 暂时跳过 | 冲突保持 pending，不同步此文档 | `sync.conflict.deferred` |

**禁止**：提供"自动解决全部"按钮（必须逐一处理）。

### 7.4 冲突数量限制提示

若待处理冲突 ≥ 10 个，在 Hub 顶部显示全局 Banner：
```
[警告图标]  您有 N 个同步冲突待处理。继续同步前请先解决冲突。  [查看所有冲突]
```

---

## 8. 离线队列

### 8.1 IndexedDB 表结构

```typescript
// src/db/schema.ts (新增)

interface SyncOutboxEntry {
  id: string;                     // nanoid
  profileId: string;
  providerId: SyncProviderId;
  operation: 'push' | 'delete';
  docId: string;
  payload?: SyncPayload;
  createdAt: number;
  retryCount: number;             // 最大 5 次
  nextRetryAt: number;
  errorMessage?: string;
}

// Dexie 表名：sync_outbox
// 索引：profileId, providerId, nextRetryAt
```

### 8.2 入队与出队逻辑

**入队**（文档保存时，网络不可用或同步失败）：
```typescript
await db.sync_outbox.add({
  id: nanoid(),
  profileId: currentProfileId,
  providerId: activeProvider.id,
  operation: 'push',
  docId: doc.id,
  payload: buildSyncPayload(doc),
  createdAt: Date.now(),
  retryCount: 0,
  nextRetryAt: Date.now(),
});
```

**出队（flush）**（网络恢复后）：
```typescript
async function flushOutbox(provider: SyncProvider) {
  const pending = await db.sync_outbox
    .where('profileId').equals(currentProfileId)
    .and(e => e.nextRetryAt <= Date.now())
    .toArray();

  for (const entry of pending) {
    try {
      if (entry.operation === 'push' && entry.payload) {
        await provider.push([entry.payload]);
      }
      await db.sync_outbox.delete(entry.id);
    } catch (err) {
      const nextRetry = exponentialBackoff(entry.retryCount);
      await db.sync_outbox.update(entry.id, {
        retryCount: entry.retryCount + 1,
        nextRetryAt: Date.now() + nextRetry,
        errorMessage: (err as Error).message,
      });
    }
  }
}
```

### 8.3 指数退避参数

| 重试次数 | 等待时间 |
|---|---|
| 1 | 1 秒 |
| 2 | 2 秒 |
| 3 | 4 秒 |
| 4 | 8 秒 |
| 5 | 16 秒 |
| > 5 | 永久失败，通知用户 |

---

## 9. SyncScheduler

### 9.1 调度器架构

```typescript
// src/services/sync/scheduler.ts

export class SyncScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private unlistenNetwork: (() => void) | null = null;

  async start(provider: SyncProvider, config: SyncConfig): Promise<void> {
    // 启动定时同步
    this.intervalId = setInterval(
      () => this.runSync(provider),
      config.syncIntervalMs
    );

    // 监听 Tauri 网络状态变化事件
    this.unlistenNetwork = await listen<NetworkEvent>('network-change', (event) => {
      if (event.payload.online) {
        this.handleNetworkRestore(provider);
      } else {
        this.handleNetworkLost(provider);
      }
    });

    // 监听应用前台激活事件（Tauri window-focus）
    await listen('tauri://focus', () => {
      this.runSync(provider);
    });
  }

  private async handleNetworkRestore(provider: SyncProvider): Promise<void> {
    useSyncStore().setState('idle');
    await flushOutbox(provider);
    await this.runSync(provider);
  }

  private async handleNetworkLost(provider: SyncProvider): Promise<void> {
    useSyncStore().setState('offline');
  }

  async stop(): Promise<void> {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.unlistenNetwork) this.unlistenNetwork();
  }

  private async runSync(provider: SyncProvider): Promise<void> {
    const store = useSyncStore();
    if (['syncing', 'connecting', 'offline'].includes(store.state)) return;

    store.setState('syncing');
    try {
      // push 本地变更
      const pendingDocs = await getPendingDocsForSync();
      if (pendingDocs.length > 0) {
        await provider.push(pendingDocs);
      }

      // pull 远端变更
      const pullResult = await provider.pull(store.lastSyncAt ?? 0);

      // 处理冲突
      if (pullResult.conflicts.length > 0) {
        store.addConflicts(pullResult.conflicts);
        store.setState('conflict');
        return;
      }

      // 应用远端变更到本地 DB
      await applyRemoteChanges(pullResult);

      store.setLastSyncAt(Date.now());
      store.setState('idle');
    } catch (err) {
      store.setError((err as Error).message);
      store.setState('error');
    }
  }
}
```

---

## 10. Settings > 同步 UI

### 10.1 页面结构（Settings > 同步 Tab）

```
Settings > 同步
├── 同步状态卡片
│   ├── 当前 Provider 名称
│   ├── 状态指示点（绿/橙/红/灰）
│   ├── 上次同步时间
│   └── [手动同步] [暂停/恢复] 按钮
│
├── Provider 配置区
│   ├── Provider 选择下拉（WebDAV / Git / 自有服务器 / 未连接）
│   └── [Provider 特定配置表单]
│       ├── WebDAV: 服务器 URL / 用户名 / 密码 / 测试路径
│       ├── Git: 远端 URL / 分支名 / Commit 策略 / SSH Key 路径
│       └── 自有服务器: 服务器 URL / API Key
│
├── 同步选项
│   ├── 同步间隔（下拉：1分钟/5分钟/15分钟/手动）
│   ├── 冲突策略（三方合并 [推荐] / 始终手动）
│   └── 同步触发（网络恢复时 / 应用激活时 / 仅定时）
│
├── 连接测试区
│   ├── [测试连接] 按钮
│   └── 测试结果（延迟 / 服务器版本 / 错误原因）
│
└── 同步日志（最近 50 条）
    ├── 时间 / 操作 / 状态 / 文档数 / 耗时
    └── [查看全部日志] [清空日志] 按钮
```

### 10.2 Provider 表单验证规则

**WebDAV**：
- endpoint 必须以 `http://` 或 `https://` 开头
- endpoint 不以 `/` 结尾时自动补全
- 用户名不为空，密码不为空（可加密存储后显示为 `••••••••`）
- 测试路径存在且可读写

**Git**：
- 远端 URL 格式：`https://` 或 `git@` 开头
- 分支名不为空，无特殊字符
- SSH Key 路径存在且可读（若配置 SSH）
- git 命令行可用性检查（`git --version`）

**自有服务器**：
- URL 格式合法
- API Key 不为空
- ping 端点响应 200

### 10.3 连接测试 UI 交互

```
[测试连接]（点击后）
  → 按钮变为 [正在测试...] + 旋转图标（禁用状态）
  → 成功：[连接成功图标] 延迟：42ms，服务器：Nextcloud 27.0.1
  → 失败：[错误图标] 错误：认证失败 (401 Unauthorized)
          [查看详情] 展开显示原始错误和建议措施
```

---

## 11. Store 定义

```typescript
// src/stores/sync.ts

import { defineStore } from 'pinia';

interface SyncStoreState {
  state: SyncState;
  activeProviderId: SyncProviderId | null;
  configs: Record<SyncProviderId, SyncConfig>;
  lastSyncAt: number | null;
  pendingConflicts: ConflictRecord[];
  logs: SyncLog[];
  errorMessage: string | null;
  isFlushing: boolean;
}

export const useSyncStore = defineStore('sync', {
  state: (): SyncStoreState => ({
    state: 'idle',
    activeProviderId: null,
    configs: {},
    lastSyncAt: null,
    pendingConflicts: [],
    logs: [],
    errorMessage: null,
    isFlushing: false,
  }),

  getters: {
    activeProvider: (state) => state.activeProviderId ? state.configs[state.activeProviderId] : null,
    hasConflicts: (state) => state.pendingConflicts.length > 0,
    conflictCount: (state) => state.pendingConflicts.filter(c => c.status === 'pending').length,
    isOnline: (state) => state.state !== 'offline',
  },

  actions: {
    setState(newState: SyncState) { this.state = newState; },
    setLastSyncAt(ts: number) { this.lastSyncAt = ts; },
    setError(msg: string) { this.errorMessage = msg; },
    addConflicts(records: ConflictRecord[]) {
      this.pendingConflicts.push(...records);
    },
    resolveConflict(id: string) {
      const idx = this.pendingConflicts.findIndex(c => c.id === id);
      if (idx !== -1) this.pendingConflicts[idx].status = 'resolved';
    },
    appendLog(log: SyncLog) {
      this.logs.unshift(log);
      if (this.logs.length > 200) this.logs.splice(200);
    },
  },

  persist: {
    key: 'inkforge-sync',
    paths: ['activeProviderId', 'configs', 'lastSyncAt'],
  },
});
```

---

## 12. Repository 定义

```typescript
// src/repositories/SyncRepository.ts

export class SyncRepository {
  // 同步日志
  async saveSyncLog(log: SyncLog): Promise<void> {
    await db.sync_logs.add(log);
  }

  async getSyncLogs(profileId: string, limit = 100): Promise<SyncLog[]> {
    return db.sync_logs
      .where('profileId').equals(profileId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  // 冲突记录
  async saveConflict(record: ConflictRecord): Promise<void> {
    await db.sync_conflicts.add(record);
  }

  async getPendingConflicts(profileId: string): Promise<ConflictRecord[]> {
    return db.sync_conflicts
      .where('[profileId+status]')
      .equals([profileId, 'pending'])
      .toArray();
  }

  async updateConflictStatus(id: string, update: Partial<ConflictRecord>): Promise<void> {
    await db.sync_conflicts.update(id, update);
  }

  // 离线队列
  async enqueue(entry: SyncOutboxEntry): Promise<void> {
    await db.sync_outbox.add(entry);
  }

  async dequeue(id: string): Promise<void> {
    await db.sync_outbox.delete(id);
  }

  async getPendingOutbox(profileId: string): Promise<SyncOutboxEntry[]> {
    return db.sync_outbox
      .where('profileId').equals(profileId)
      .and(e => e.nextRetryAt <= Date.now())
      .toArray();
  }

  // 配置
  async saveConfig(config: SyncConfig): Promise<void> {
    await db.sync_configs.put(config);
  }

  async getConfig(profileId: string, providerId: string): Promise<SyncConfig | undefined> {
    return db.sync_configs.get([profileId, providerId]);
  }
}
```

---

## 13. IndexedDB 表结构（新增）

```typescript
// src/db/schema.ts 新增表

// sync_logs: 同步操作日志
// 索引：profileId, providerId, startedAt

// sync_conflicts: 冲突记录
// 索引：profileId, status, detectedAt

// sync_outbox: 离线队列
// 索引：profileId, providerId, nextRetryAt

// sync_configs: Provider 配置（明文部分，凭据存 Keyring）
// 索引：[profileId+providerId]
```

---

## 14. 错误处理规范

### 14.1 错误分级

| 级别 | 类型 | 处理方式 | 用户可见性 |
|---|---|---|---|
| INFO | 普通推送/拉取成功日志 | 写日志 | 日志面板可见 |
| WARNING | 部分文档失败，整体成功 | 写日志 + 状态栏提示 | 状态栏短提示 |
| ERROR | 连接失败 / 认证失败 | 写日志 + Toast + 进入 error 状态 | Toast 通知 |
| CRITICAL | 数据损坏 / 冲突无法自动解决 | 写审计日志 + 强制弹框 | 阻断型弹框 |

### 14.2 永久失败处理

当离线队列条目 retryCount > 5 时：
1. 将条目移入 `sync_failed` 表（永久保留，不自动删除）
2. 在 Hub 显示 Banner："有 N 个文档未能同步，请手动检查"
3. 提供"查看失败详情"和"手动导出应急副本"入口
4. 写入审计日志，级别 CRITICAL

---

## 15. 性能约束

| 指标 | 目标值 | 备注 |
|---|---|---|
| push 延迟（50 文档） | ≤ 5s（WebDAV 本地网络） | 批量并发 20 个 |
| pull 增量延迟 | ≤ 3s | 仅传输变更文档 |
| 冲突检测耗时 | ≤ 10s（L1-36 铁律） | |
| 离线队列 flush 启动延迟 | ≤ 500ms（网络恢复后） | |
| 大文档分块上传（50MB） | ≤ 60s | 良好网络条件 |

---

## 16. 安全约束

1. 凭据（密码/Token/SSH Key passphrase）必须通过 Tauri Keyring 存储，禁止存入 IndexedDB 明文。
2. HTTPS 强制：WebDAV 和 SelfHosted Provider 配置 HTTP endpoint 时必须显示警告。
3. Git remote URL 验证：禁止 `file://` 协议（防止本地路径遍历）。
4. 同步数据不包含 Settings 中的 API Key 等敏感字段（敏感字段在 SyncPayload 中显式排除）。
5. 所有同步操作写入审计日志（对齐 Spec 24 权限审计）。

---

## 17. 测试矩阵（≥ 35 条）

| 编号 | 类型 | 测试场景 | 预期结果 |
|---|---|---|---|
| T-01 | 单元 | `compareClocks` 并发关系检测 | 返回 `concurrent` |
| T-02 | 单元 | `compareClocks` before/after 关系 | 返回正确方向 |
| T-03 | 单元 | `mergeClock` 合并两个向量时钟 | 取每个 key 的最大值 |
| T-04 | 单元 | `incrementClock` 递增指定 Profile 计数 | 新值 = 旧值 + 1 |
| T-05 | 单元 | WebDAV 路径映射：docId 生成正确路径 | 路径格式符合规范 |
| T-06 | 单元 | WebDAV `buildCommitMessage` 格式验证 | 包含 docTitle 和 ISO 时间戳 |
| T-07 | 单元 | 指数退避计算：5 次重试时间序列 | 1/2/4/8/16 秒 |
| T-08 | 单元 | `ConflictDetector.detect` 相同内容不报冲突 | 返回 `no-conflict` |
| T-09 | 单元 | `ConflictDetector.detect` 并发修改报冲突 | 返回 `conflict` |
| T-10 | 单元 | SyncConfig 验证：空 endpoint 应报错 | 抛出 ValidationError |
| T-11 | 集成 | WebDAV connect：PROPFIND 请求格式验证 | 请求头包含 Depth: 1 |
| T-12 | 集成 | WebDAV push 成功路径 | 文档存在于 WebDAV 服务器 |
| T-13 | 集成 | WebDAV pull 增量：只返回变更文档 | 未变化文档不在 updated 列表 |
| T-14 | 集成 | WebDAV 认证失败 (401) 处理 | 进入 error 状态，不重试 |
| T-15 | 集成 | WebDAV 服务器满 (507) 处理 | Toast 通知，不重试 |
| T-16 | 集成 | Git connect：初始化 .git 目录 | `.git` 目录存在 |
| T-17 | 集成 | Git push on-save：commit 消息格式 | 包含 docTitle 和时间戳 |
| T-18 | 集成 | Git push timed：批量 commit 计数 | 消息包含 `N docs` |
| T-19 | 集成 | Git pull：fetch + merge no-ff | 合并历史保留 merge commit |
| T-20 | 集成 | Git 冲突检测：并发修改同文件 | MergeResult.success = false |
| T-21 | 集成 | Git 冲突解决 accept-local | 本地内容保留，远端丢弃 |
| T-22 | 集成 | Git 冲突解决 accept-remote | 远端内容应用到本地 |
| T-23 | 集成 | SelfHosted ping 成功 | 返回 latencyMs |
| T-24 | 集成 | SelfHosted ping 失败 | 进入 error 状态 |
| T-25 | 集成 | 离线队列入队：网络不可用时保存操作 | sync_outbox 条目存在 |
| T-26 | 集成 | 离线队列出队：网络恢复后 flush | 文档成功推送 |
| T-27 | 集成 | 离线队列重试：失败后 retryCount 递增 | nextRetryAt 更新为指数退避时间 |
| T-28 | 集成 | 离线队列永久失败：retryCount > 5 | 移入 sync_failed，Banner 显示 |
| T-29 | E2E | SyncScheduler 定时触发：5 分钟后自动同步 | 日志中出现新的 sync 条目 |
| T-30 | E2E | SyncScheduler 网络恢复触发：offline → online | 自动 flush + 同步 |
| T-31 | E2E | 冲突 Modal：接受本地操作完整流程 | ConflictRecord.status = resolved |
| T-32 | E2E | 冲突 Modal：手动合并输入内容落盘 | 合并内容写入 IndexedDB |
| T-33 | E2E | 冲突 Banner：N ≥ 10 时显示全局提示 | Banner 可见，计数正确 |
| T-34 | E2E | Settings 连接测试：正确凭据成功响应 | 显示延迟和服务器信息 |
| T-35 | E2E | Settings 连接测试：错误密码显示 401 | 显示认证失败提示 |
| T-36 | E2E | 手动同步按钮：触发 push + pull 完整流程 | 状态经过 syncing → idle |
| T-37 | E2E | 审计日志：每次冲突解决后写入审计 | 审计日志可查询到 sync.conflict.resolve |
| T-38 | 性能 | 50 文档批量 push（WebDAV 本地网络） | ≤ 5 秒 |
| T-39 | 性能 | 冲突检测（100 文档并发修改场景） | ≤ 10 秒 |

---

## 18. 落地文件索引

| 文件路径 | 说明 |
|---|---|
| `src/services/sync/provider.ts` | SyncProvider 核心接口定义 |
| `src/services/sync/vectorClock.ts` | VectorClock 实现 |
| `src/services/sync/conflictDetector.ts` | 冲突检测算法 |
| `src/services/sync/scheduler.ts` | SyncScheduler 调度器 |
| `src/services/sync/providers/WebDAVProvider.ts` | WebDAV 实装 |
| `src/services/sync/providers/GitProvider.ts` | Git 实装 |
| `src/services/sync/providers/SelfHostedProvider.ts` | 自有服务器实装 |
| `src/services/sync/outboxFlusher.ts` | 离线队列 flush 逻辑 |
| `src/repositories/SyncRepository.ts` | 数据访问层 |
| `src/stores/sync.ts` | Pinia Store |
| `src/components/sync/ConflictResolveModal.vue` | 冲突解决弹窗 |
| `src/components/sync/ConflictBanner.vue` | 全局冲突 Banner |
| `src/components/sync/SyncStatusIndicator.vue` | 同步状态指示器 |
| `src/views/settings/SyncSettingsTab.vue` | Settings > 同步 Tab |
| `src-tauri/src/commands/git.rs` | Tauri Git 命令 |

---

## 19. 2026-05-01 Compatible Baseline Implementation Note

Baseline status: Pass for the compatible SyncProvider baseline; full Spec 23 remains partially pending until real external endpoints and packaged Tauri Git commands are validated end to end.

Implemented baseline coverage:
- `inkforge/src/services/sync/provider.ts` defines `SyncProvider`, config, credentials, payload, conflict, log, validation, endpoint normalization, and auth header contracts.
- `inkforge/src/services/sync/vector-clock.ts` implements immutable vector clock increment, merge, and relation comparison.
- `inkforge/src/services/sync/providers/webdav.ts` uses real `fetch` boundaries for `PROPFIND`, `PUT`, `GET`, conflict list, and conflict resolution. It does not fabricate WebDAV success.
- `inkforge/src/services/sync/providers/self-hosted.ts` uses real HTTP API boundaries for health, push, pull, conflict list, and conflict resolution. It does not fabricate server success.
- `inkforge/src/services/sync/providers/git.ts` uses the real Tauri invoke boundary for Git status, push, pull, conflicts, and conflict resolution. In pure Web runtime or when commands are missing, it fails explicitly instead of mocking Git success.
- `inkforge/src/services/sync/repository.ts` persists outbox, logs, and conflicts through real Dexie tables.
- `inkforge/src/utils/db.ts` adds Dexie version 7 tables `syncOutbox`, `syncLogs`, and `syncConflicts` without deleting existing tables or migrations.
- `inkforge/src/services/sync/engine.ts` no longer marks pending changes as synced when no provider is configured. Missing provider enters `paused`, writes a failure log, leaves `lastSyncAt` unset for manual no-provider sync, and retains pending changes.
- `inkforge/src/stores/article.ts` marks real article create/update/delete operations dirty after local persistence succeeds.
- `inkforge/src/stores/sync.ts` exposes provider id, pending count, conflict count, status text, and manual sync result through Pinia.
- `inkforge/src/stores/settings.ts` and `inkforge/src/views/SettingsView.vue` add a real Settings Sync tab and registry entries. The tab shows provider status, pending queue, conflict count, last sync time, and calls `syncStore.sync()` for manual sync.

Security and no-mock decisions:
- Basic/Digest credentials accept `passwordHash` only for saved credential identity and never convert it into a transport secret.
- `buildAuthHeaders()` throws `CREDENTIAL_SECRET_UNAVAILABLE` for Basic/Digest because runtime secret re-entry or a secure keyring flow is required.
- Git remotes reject `file://` and insecure `http://`; Git sync requires HTTPS or SSH.
- WebDAV and SelfHosted HTTP endpoints are warned as insecure; HTTPS remains the target for production provider configuration.
- Product code contains no mock provider, fake sync success, simulated remote ack, sample sync records, or Emoji glyph icons.

Validation evidence:
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec vitest run src/services/sync/sync-provider.test.ts` passed with 1 test file and 7 tests.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` passed. A normal `pnpm build` reached Vite chunk rendering but failed with Node heap OOM on this constrained machine; the successful rerun used one process with a larger heap. Remaining Vite warnings are the existing dynamic/static import and large chunk warnings.
- `git diff --check` passed for touched sync/settings files with only Windows CRLF conversion warnings.
- Touched-file Emoji scan passed for the SyncProvider baseline files and docs.
- Browser smoke on `http://127.0.0.1:5181/settings?tab=sync` confirmed the Sync tab is visible from the query route, manual sync without provider enters `paused`, shows exactly one real `同步提供者未配置` error, and does not show remote success.

Pending for full Spec 23 pass:
- Real WebDAV endpoint credentials, upload/download, and conflict matrix validation against a live server.
- Tauri Rust Git command implementation, packaging, branch/commit strategy validation, and real HTTPS/SSH remote tests.
- Real SelfHosted server implementation and contract tests against a deployed InkForge Server.
- Full conflict resolve modal/banner UI and audit-log persistence integration with Spec 24.
- Full offline queue flush, retry backoff, permanent failure banner, and network restore validation.
- Secure Tauri keyring onboarding for runtime secrets.
- Complete 39-row Spec 23 test matrix and performance SLO validation.
