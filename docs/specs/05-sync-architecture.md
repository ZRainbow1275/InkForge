# 文档三：同步架构规格说明书

## 1. 同步系统总体架构

### 1.1 设计原则

| 原则 | 说明 |
|------|------|
| Local-first | 离线完全可用，所有数据首先写入本地 IndexedDB |
| Client-side encryption | 数据在上传到远端前使用 AES-GCM-256 加密，服务器只存储密文 |
| Conflict resolution | 自动 + 手动混合策略，基于版本向量和 SHA-256 checksum |
| Incremental sync | 仅同步有变更的文档，通过 ChangeTracker 实现 |
| Transport agnostic | 传输层使用适配器模式，支持 WebDAV / S3 / REST API |

### 1.2 架构流程

```
[用户编辑]
    |
    v
[Local IndexedDB] ──写入──> [documents 表 + versions 表]
    |
    v (autoSave 触发或手动保存)
[ChangeTracker.trackChange()] ──记录──> [内存变更队列 (Map<id, ChangeRecord>)]
    |                                    SHA-256 checksum 计算
    |                                    去重合并 (2s 窗口)
    v
[SyncEngine.sync()] ──检查──> 网络状态 (navigator.onLine)
    |
    ├── 离线 → 标记 status='offline'，等待 online 事件
    |
    ├── 在线 + 无变更 → 更新 lastSyncAt，status='idle'
    |
    └── 在线 + 有变更 →
        |
        v
    [收集 pendingChanges]
        |
        v
    [加密层] ──加密──> JSON → (可选 gzip 压缩) → AES-GCM-256 encrypt → .inkforge 二进制格式
        |                    Content Key = HKDF(MasterKey, per-document-salt)
        |                    IV = random 12 bytes per operation
        v
    [Transport Adapter] ──上传/下载──> [Remote Storage]
        |
        ├── 无冲突 → markSynced()，更新 syncStatus='synced'
        |
        └── 有冲突 → ConflictResolver.detectConflict()
              |
              ├── auto resolve (local-wins / remote-wins)
              └── manual → 标记 status='conflict'，等待用户在 Sync Tab 解决
```

### 1.3 现有实现基础分析

**已实现的核心模块**（位于 `inkforge/src/services/sync/`）：

| 模块 | 文件 | 状态 | 说明 |
|------|------|------|------|
| SyncEngine | `engine.ts` | **完整可用** | 本地/远端双模式可用，已包含 `processRemoteSync()`、冲突解决、同步日志、适配器分发与加密上传下载 |
| ChangeTracker | `change-tracker.ts` | **完整可用** | 默认 `persistent` 模式，持久化到 Dexie `pendingChanges`，保留 2s 去重窗口与内存镜像 |
| ConflictResolver | `conflict-resolver.ts` (323 行) | **完整可用** | 版本向量，3 种策略（local-wins / remote-wins / manual） |
| KeyDerivation | `key-derivation.ts` (264 行) | **完整可用** | PBKDF2 100k iterations → HKDF → AES-256-GCM |
| InkForge Format | `format.ts` (442 行) | **完整可用** | 自定义二进制格式，Magic "INKF"，AES-GCM + AAD |
| SyncStore | `stores/sync.ts` (232 行) | **完整可用** | Vue 响应式桥接，暴露 computed 状态 |

**已实现的加密模块**（位于 `inkforge/src/utils/crypto/`）：

| 模块 | 文件 | 说明 |
|------|------|------|
| config | `config.ts` | AES-GCM-256, PBKDF2 310k iterations, key cache 5min |
| encryption | `encryption.ts` | encrypt/decrypt 核心函数 |
| key-management | `key-management.ts` | 密钥生成、包装、解锁、更改密码、导出导入 |
| lifecycle | `lifecycle.ts` | 密钥缓存超时（5min）、页面隐藏自动清理 |
| storage | `storage.ts` | IndexedDB 密钥存储 + Tauri 密钥链存储 |
| sensitive-fields | `sensitive-fields.ts` | 自动加解密 rawContent、aiSummary、body、transcript |
| types | `types.ts` | EncryptedData、WrappedMasterKey、ExportedKeyBundle |
| environment | `environment.ts` | 环境检测（Tauri/Web）、审计日志 |

**已实现的权限模块**（位于 `inkforge/src/services/auth/`）：

| 模块 | 文件 | 说明 |
|------|------|------|
| rebac | `rebac.ts` (336 行) | Zanzibar 风格 ReBAC，权限继承层次 |
| relation-store | `relation-store.ts` (573 行) | 内存关系存储，权限检查（含递归继承） |

---

## 2. Change Tracker（变更追踪器）

### 2.1 现有实现分析

**文件**: `D:\Desktop\Inkforge\inkforge\src\services\sync\change-tracker.ts`

- **默认存储模式**: `persistent`，同时维护内存 `Map<string, ChangeRecord>` 作为运行时镜像
- **持久化落点**: Dexie `pendingChanges` 表（页面刷新后自动 hydrate）
- **变更记录结构**:
  ```typescript
  interface ChangeRecord {
    id: string
    articleId: string
    operation: 'create' | 'update' | 'delete'
    timestamp: string  // ISO 8601
    checksum: string   // SHA-256 hex
    encryptedContent?: ArrayBuffer
    synced: boolean
    retryCount: number
  }
  ```
- **去重逻辑**: 同一文档在 `dedupeWindowMs`（默认 2000ms）内的连续 update 操作合并为最新状态
- **校验和**: 使用 `computeChecksum()`（SHA-256）计算内容摘要

### 2.2 当前状态与剩余增强

**当前状态**: 持久化升级已完成，Phase 3 基于现有 `persistent` 模式继续增强重试、审计与多目标同步能力：

```typescript
// 当前 Dexie 表: pendingChanges
// 运行模式: 'memory' | 'persistent'，默认 'persistent'
interface PersistentChangeRecord extends ChangeRecord {
  accountId: string  // 关联账户
}
```

后续增强重点：
- 按同步目标维度拆分重试/退避策略
- 与 `sync_logs` / `activity_logs` 的审计视图联动
- 在多账户场景下明确 `accountId` 隔离边界

---

## 3. Sync Engine（同步引擎）

### 3.1 现有实现分析

**文件**: `D:\Desktop\Inkforge\inkforge\src\services\sync\engine.ts`

- **当前模式**: 本地模式与远端模式并存；当同步目标可用时走 `processRemoteSync()`
- **关键机制**:
  - `isSyncLock`: 防止并发同步
  - `autoSyncInterval`: setInterval 定时触发
  - 网络状态监听: `online`/`offline` 事件
  - 状态通知: `stateListeners` 数组 + `updateState()` 广播
- **已落地能力**:
  - 拉取远端清单并比对版本
  - 冲突检测与 `resolveConflict()` 委托
  - 远端删除/上传/下载编排
  - `sync_logs` 记录与错误状态回写
  - 通过 `getMasterKey({ extractable: true })` 获取同步所需可导出主密钥

### 3.2 当前远端同步流程

当前远端路径已经落地，核心流程如下：

```typescript
private async processRemoteSync(
  pendingChanges: ChangeRecord[],
  runtime: SyncRuntimeSettings
): Promise<SyncResult> {
  const adapter = this.getTransportAdapter()
  if (!adapter) {
    throw new Error('未配置同步目标')
  }

  let uploaded = 0
  let downloaded = 0
  let newConflicts = 0

  // 1. 拉取远端变更清单
  const remoteManifest = await adapter.listRemoteChanges()

  // 2. 检测冲突
  for (const remote of remoteManifest) {
    const conflict = this.conflictResolver.detectConflict(
      remote.documentId,
      remote.version,
      remote.checksum
    )
    if (conflict) {
      newConflicts++
      // 根据策略自动解决或标记待手动
      const strategy = this.config.defaultConflictStrategy
      if (strategy !== 'manual') {
        this.conflictResolver.resolveConflict(conflict.id, strategy)
      }
    }
  }

  // 3. 下载远端新内容
  for (const remote of remoteManifest) {
    if (!this.conflictResolver.getConflictByDocumentId(remote.documentId)) {
      const encryptedData = await adapter.download(remote.documentId)
      // 解密
      const { metadata, body } = await deserializeDocument(encryptedData, this.masterKey)
      // 写入本地 IndexedDB
      await this.applyRemoteChange(metadata, body)
      downloaded++
    }
  }

  // 4. 上传本地变更
  for (const change of pendingChanges) {
    if (change.retryCount >= this.config.maxRetries) continue
    if (this.conflictResolver.getConflictByDocumentId(change.articleId)) continue

    // 加密
    const document = await getDocument(change.articleId)
    if (!document) continue

    const encrypted = await serializeDocument(
      { title: document.title, body: document.content, documentId: document.id },
      this.masterKey
    )
    await adapter.upload(change.articleId, encrypted)
    this.changeTracker.markSynced(change.id)
    uploaded++
  }

  return { success: true, uploaded, downloaded, newConflicts }
}
```

---

## 4. Encryption Layer（加密层）

### 4.1 现有实现双层架构

项目已实现两个独立的加密层：

**Layer A: 应用级加密**（`utils/crypto/`）
- 用途：IndexedDB 中敏感字段加密（rawContent、body、transcript、aiSummary）
- 密钥：系统级 MasterKey（true random 256-bit），PBKDF2 310k + AES-GCM 包装
- 存储：IndexedDB `InkForgeSecureKeyStore` 或 Tauri 系统密钥链
- 生命周期：页面隐藏自动清理缓存，5 分钟超时

**Layer B: 同步级加密**（`services/sync/`）
- 用途：文档同步前的端到端加密（.inkforge 二进制格式）
- 密钥架构：同步内容派生使用 `services/sync/key-derivation.ts` 的 PBKDF2 100k → HKDF → ContentKey (per-document)
- 格式：自定义二进制格式（Magic "INKF" + metadata + payload 分别加密）

> 注：当前代码存在两套 PBKDF2 参数，它们服务于不同层级而非互相冲突。
> - `utils/crypto/config.ts`: 主密钥包装与本地安全存储，PBKDF2 = 310,000
> - `services/sync/key-derivation.ts`: 同步内容派生，PBKDF2 = 100,000

### 4.2 .inkforge 格式规格

```
偏移    长度    内容
0       4       Magic Number: 0x494E4B46 ("INKF")
4       2       Format Version (LE uint16): 1
6       2       Flags (LE uint16): bit 0=compressed, bit 1=has_metadata
8       16      Key ID (UUID bytes)
24      12      Metadata IV (AES-GCM nonce)
36      16      Salt (HKDF salt)
52      4       Metadata Length (LE uint32)
56      N       Encrypted Metadata (AES-GCM, AAD=MAGIC)
56+N    4       Payload Length (LE uint32)
60+N    12      Payload IV
72+N    M       Encrypted Payload (AES-GCM)
```

### 4.3 密钥派生流程

```
UserPassword (string)
    |
    v PBKDF2(password, random_salt_16B, 100000, SHA-256)
    |
MasterKey (AES-256, extractable=true)
    |
    v HKDF(masterKey, per_document_salt_16B, "inkforge-content-v1", SHA-256)
    |
ContentKey (AES-256-GCM, extractable=false)
    |
    v AES-256-GCM(contentKey, random_iv_12B, plaintext, aad=MAGIC)
    |
Ciphertext + AuthTag
```

### 4.4 密钥管理操作

已实现的完整 API（来自 `key-management.ts`）：

| 函数 | 说明 |
|------|------|
| `deriveWrappingKeyFromPassword(password, salt?)` | 从密码派生包装密钥 |
| `wrapMasterKey(masterKey, wrappingKey)` | 包装主密钥 |
| `unwrapMasterKey(wrappedKey, iv, wrappingKey, extractable?)` | 解包主密钥 |
| `generateMasterKey(extractable?)` | 生成随机主密钥 |
| `unlockWithPassword(password)` | 解锁/首次初始化 |
| `changePassword(oldPassword, newPassword)` | 更改密码 |
| `getMasterKey(options?)` | 获取缓存的主密钥；当 `options.extractable=true` 时返回临时可导出密钥 |
| `exportMasterKey(exportPassword)` | 导出备份密钥包 |
| `importMasterKey(bundle, exportPassword, newPassword)` | 从备份恢复 |
| `deleteAllKeys()` | 删除所有密钥（危险） |

---

## 5. Transport Adapters（传输适配器）

### 5.1 适配器接口定义

```typescript
// 文件: inkforge/src/services/sync/adapters/types.ts

/** 远端文档清单条目 */
export interface RemoteManifestEntry {
  documentId: string
  version: number
  checksum: string
  updatedAt: string
  sizeBytes: number
}

/** 传输适配器接口 */
export interface SyncAdapter {
  /** 适配器类型 */
  readonly type: ConfiguredSyncTarget['type']

  /** 测试连接 */
  testConnection(): Promise<SyncConnectionResult>

  /** 列出远端所有文档的清单（仅 metadata，不下载内容） */
  listRemoteChanges(): Promise<RemoteManifestEntry[]>

  /** 下载加密文档 */
  download(documentId: string): Promise<ArrayBuffer>

  /** 上传加密文档 */
  upload(payload: SyncUploadPayload): Promise<RemoteManifestEntry>

  /** 删除远端文档 */
  delete(payload: SyncDeletePayload): Promise<RemoteManifestEntry>

  /** 解决远端冲突 */
  resolveConflict(payload: SyncResolvePayload): Promise<RemoteManifestEntry | void>
}
```

### 5.2 WebDAV Adapter

```typescript
// 文件: inkforge/src/services/sync/adapters/webdav.ts

export interface WebDAVConfig {
  url: string        // e.g., 'https://dav.example.com/remote.php/dav/files/user/'
  username: string
  password: string
}

export class WebDAVAdapter implements SyncAdapter {
  readonly type = 'webdav' as const
  private readonly baseUrl: string
  private readonly authHeader: string
  private readonly basePath = '/inkforge/'

  constructor(config: WebDAVConfig) {
    this.baseUrl = config.url.replace(/\/$/, '')
    this.authHeader = 'Basic ' + btoa(`${config.username}:${config.password}`)
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    // PROPFIND 根路径
    const response = await fetch(this.baseUrl + this.basePath, {
      method: 'PROPFIND',
      headers: {
        'Authorization': this.authHeader,
        'Depth': '0',
        'Content-Type': 'application/xml',
      },
      body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>',
    })
    if (response.ok || response.status === 207) {
      return { success: true, message: 'WebDAV 连接成功' }
    }
    return { success: false, message: `WebDAV 连接失败: ${response.status} ${response.statusText}` }
  }

  async listRemoteChanges(): Promise<RemoteManifestEntry[]> {
    // PROPFIND depth=1 列出所有 .inkforge 文件
    // 解析 XML 响应，提取文件名（documentId）和 last-modified
    // 对每个文件读取自定义属性或使用文件名约定编码 version/checksum
    // ...
  }

  async upload(documentId: string, data: ArrayBuffer): Promise<void> {
    const path = `${this.basePath}${documentId}.inkforge`
    await fetch(this.baseUrl + path, {
      method: 'PUT',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/octet-stream',
      },
      body: data,
    })
  }

  async download(documentId: string): Promise<ArrayBuffer> {
    const path = `${this.basePath}${documentId}.inkforge`
    const response = await fetch(this.baseUrl + path, {
      method: 'GET',
      headers: { 'Authorization': this.authHeader },
    })
    if (!response.ok) throw new Error(`WebDAV 下载失败: ${response.status}`)
    return response.arrayBuffer()
  }

  async delete(documentId: string): Promise<void> {
    const path = `${this.basePath}${documentId}.inkforge`
    await fetch(this.baseUrl + path, {
      method: 'DELETE',
      headers: { 'Authorization': this.authHeader },
    })
  }
}
```

### 5.3 S3 Adapter

```typescript
// 文件: inkforge/src/services/sync/adapters/s3.ts

export interface S3Config {
  endpoint: string     // e.g., 'https://s3.us-east-1.amazonaws.com'
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
}

export class S3Adapter implements SyncAdapter {
  readonly type = 's3' as const
  private readonly config: S3Config
  private readonly prefix = 'inkforge/'

  constructor(config: S3Config) {
    this.config = config
  }

  // AWS Signature V4 签名实现
  private async sign(method: string, path: string, headers: Record<string, string>, body?: ArrayBuffer): Promise<Record<string, string>> {
    // 实现 AWS Signature V4 签名算法
    // 使用 Web Crypto API 的 HMAC-SHA256
    // ...
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    // HEAD Bucket 操作
  }

  async listRemoteChanges(): Promise<RemoteManifestEntry[]> {
    // ListObjectsV2 with prefix='inkforge/'
  }

  async upload(documentId: string, data: ArrayBuffer): Promise<void> {
    // PutObject: {bucket}/inkforge/{documentId}.inkforge
  }

  async download(documentId: string): Promise<ArrayBuffer> {
    // GetObject
  }

  async delete(documentId: string): Promise<void> {
    // DeleteObject
  }
}
```

### 5.4 REST API Adapter

```typescript
// 文件: inkforge/src/services/sync/adapters/rest.ts

export interface RESTConfig {
  url: string    // e.g., 'https://api.inkforge.app'
  token: string  // Bearer token
}

export class RESTAdapter implements SyncAdapter {
  readonly type = 'rest' as const
  private readonly baseUrl: string
  private readonly token: string

  constructor(config: RESTConfig) {
    this.baseUrl = config.url.replace(/\/$/, '')
    this.token = config.token
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/octet-stream',
    }
  }

  async testConnection(): Promise<SyncConnectionResult> {
    const res = await fetch(`${this.baseUrl}/pull`, { headers: this.headers() })
    return res.ok
      ? { success: true, message: '连接成功' }
      : { success: false, message: `连接失败: ${res.status}` }
  }

  async listRemoteChanges(): Promise<RemoteManifestEntry[]> {
    const res = await fetch(`${this.baseUrl}/pull`, { headers: this.headers() })
    return res.json()
  }

  async download(documentId: string): Promise<ArrayBuffer> {
    const res = await fetch(`${this.baseUrl}/pull?documentId=${encodeURIComponent(documentId)}`, {
      headers: this.headers(),
    })
    return res.arrayBuffer()
  }

  async upload(payload: SyncUploadPayload): Promise<RemoteManifestEntry> {
    const res = await fetch(`${this.baseUrl}/push`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    })
    return res.json()
  }

  async delete(payload: SyncDeletePayload): Promise<RemoteManifestEntry> {
    const res = await fetch(`${this.baseUrl}/push`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ...payload, action: 'delete' }),
    })
    return res.json()
  }

  async resolveConflict(payload: SyncResolvePayload): Promise<RemoteManifestEntry | void> {
    const res = await fetch(`${this.baseUrl}/resolve`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    })
    return res.json()
  }
}
```

### 5.5 适配器工厂

```typescript
// 文件: inkforge/src/services/sync/adapters/factory.ts
import type { SyncAdapter } from './types'
import { WebDAVAdapter, type WebDAVConfig } from './webdav'
import { S3Adapter, type S3Config } from './s3'
import { RESTAdapter, type RESTConfig } from './rest'

export type SyncTargetConfig =
  | { type: 'webdav' } & WebDAVConfig
  | { type: 's3' } & S3Config
  | { type: 'rest' } & RESTConfig
  | { type: 'none' }

export function createTransportAdapter(config: SyncTargetConfig): SyncAdapter | null {
  switch (config.type) {
    case 'webdav':
      return new WebDAVAdapter(config)
    case 's3':
      return new S3Adapter(config)
    case 'rest':
      return new RESTAdapter(config)
    case 'none':
      return null
    default: {
      const _exhaustive: never = config
      return null
    }
  }
}
```

---

## 6. Conflict Resolution（冲突解决）

### 6.1 现有实现分析

**文件**: `D:\Desktop\Inkforge\inkforge\src\services\sync\conflict-resolver.ts`

已完整实现：
- **版本向量表**: `Map<string, VersionVector>`，追踪每个文档的本地版本号和已知远端版本号
- **冲突检测条件**: 远端版本号 > 本地已知远端版本 AND 本地版本号 > 最后同步版本 AND checksum 不同
- **三种解决策略**:
  - `local-wins`: 采用本地版本，版本号 = localVersion
  - `remote-wins`: 采用远端版本，版本号 = remoteVersion
  - `manual`: 标记为待手动处理，保留冲突记录

### 6.2 新增：三路合并支持

```typescript
// 文件: inkforge/src/services/sync/three-way-merge.ts

export interface MergeResult {
  success: boolean
  mergedContent: string
  /** 自动合并的区域数 */
  autoMergedRegions: number
  /** 无法自动合并的冲突区域（需手动处理） */
  conflictRegions: Array<{
    lineStart: number
    lineEnd: number
    localContent: string
    remoteContent: string
  }>
}

/**
 * 三路合并：基于 base 版本对比 local 和 remote 的差异
 * 
 * @param base - 共同祖先版本（最后一次成功同步时的内容）
 * @param local - 本地当前版本
 * @param remote - 远端当前版本
 * @returns 合并结果
 */
export function threeWayMerge(base: string, local: string, remote: string): MergeResult {
  // 按行分割
  const baseLines = base.split('\n')
  const localLines = local.split('\n')
  const remoteLines = remote.split('\n')

  // 计算 base→local 和 base→remote 的 diff
  const localDiff = computeLineDiff(baseLines, localLines)
  const remoteDiff = computeLineDiff(baseLines, remoteLines)

  // 合并不冲突的变更，标记冲突区域
  // ...

  return {
    success: true,
    mergedContent: '',
    autoMergedRegions: 0,
    conflictRegions: [],
  }
}
```

### 6.3 冲突解决 UI 流程

1. Sync Tab Dashboard 显示冲突列表
2. 用户点击某个冲突 → 展开详情
3. 显示本地版本 vs 远端版本的 diff 视图（简化为两列对比）
4. 用户选择：
   - "使用本地版本" → `resolveConflict(docId, 'local-wins')`
   - "使用远端版本" → `resolveConflict(docId, 'remote-wins')`
   - "手动合并" → 打开编辑器，加载合并后的内容，用户编辑后保存

---

## 7. 实现优先级

| Phase | 内容 | 依赖 | 预估复杂度 |
|-------|------|------|-----------|
| **Phase 1** | 本地保存完善（文件导出/导入、数据备份恢复） | 无 | 低 |
| **Phase 2** | 变更追踪持久化 + 同步状态 UI（Sync Tab Dashboard） | Phase 1 | 中 |
| **Phase 3** | WebDAV 同步适配器 + 基础远端同步流程 | Phase 2 | 高 |
| **Phase 4** | S3 适配器 + REST API 适配器 | Phase 3 | 中 |
| **Phase 5** | 端到端加密集成（.inkforge 格式应用到同步流程） | Phase 3 | 高 |
| **Phase 6** | 三路合并 + 冲突 diff 可视化 | Phase 5 | 高 |

### Phase 1 详细任务
1. Settings v4 schema 升级（新增 sync、advanced、account 字段）
2. Dexie v4 数据库升级（4 新表 + documents 字段扩展 + 迁移脚本）
3. Account Tab 实现（本地 Profile CRUD）
4. Data Tab 补完（autoBackup 定时器、存储空间显示、数据库统计）
5. 所有现有设置项"真正生效"（App.vue watchers + 编辑器属性绑定 + 快捷键全局监听）

### Phase 2 详细任务
1. Sync Tab UI（同步目标配置表单 + 策略选择 + 状态 Dashboard）
2. 主密钥管理 UI（初始化/解锁、恢复密钥导出、恢复密钥导入）
3. SyncLog 记录（每次同步操作写入 `sync_logs` 表）
4. Activity Logger 集成（文档增删改自动记录）

### Phase 3 详细任务
1. WebDAV Transport Adapter 实现
2. SyncEngine.processRemoteSync() 替换 processLocalSync()
3. 远端清单拉取 + 冲突检测流程
4. 连接测试功能
5. documents.syncStatus / syncedAt / remoteVersion 字段维护

---

## 关键文件路径汇总

| 文件 | 绝对路径 | 用途 |
|------|---------|------|
| SettingsView.vue | `D:\Desktop\Inkforge\inkforge\src\views\SettingsView.vue` | 设置页面视图（~1600行） |
| settings.ts (store) | `D:\Desktop\Inkforge\inkforge\src\stores\settings.ts` | Zod Schema + localStorage 持久化 |
| sync.ts (store) | `D:\Desktop\Inkforge\inkforge\src\stores\sync.ts` | SyncEngine 响应式桥接 |
| ai.ts (store) | `D:\Desktop\Inkforge\inkforge\src\stores\ai.ts` | AI Provider 管理 |
| editor.ts (store) | `D:\Desktop\Inkforge\inkforge\src\stores\editor.ts` | 编辑器状态机 |
| article.ts (store) | `D:\Desktop\Inkforge\inkforge\src\stores\article.ts` | 文章 CRUD |
| db.ts | `D:\Desktop\Inkforge\inkforge\src\utils\db.ts` | IndexedDB Dexie 定义（当前 v3） |
| engine.ts | `D:\Desktop\Inkforge\inkforge\src\services\sync\engine.ts` | 同步引擎核心 |
| change-tracker.ts | `D:\Desktop\Inkforge\inkforge\src\services\sync\change-tracker.ts` | 变更追踪 |
| conflict-resolver.ts | `D:\Desktop\Inkforge\inkforge\src\services\sync\conflict-resolver.ts` | 冲突解决 |
| key-derivation.ts | `D:\Desktop\Inkforge\inkforge\src\services\sync\key-derivation.ts` | 同步层密钥派生 |
| format.ts | `D:\Desktop\Inkforge\inkforge\src\services\sync\format.ts` | .inkforge 二进制格式 |
| crypto/index.ts | `D:\Desktop\Inkforge\inkforge\src\utils\crypto\index.ts` | 应用层加密入口 |
| crypto/encryption.ts | `D:\Desktop\Inkforge\inkforge\src\utils\crypto\encryption.ts` | AES-GCM encrypt/decrypt |
| crypto/key-management.ts | `D:\Desktop\Inkforge\inkforge\src\utils\crypto\key-management.ts` | 密钥生成/包装/导出 |
| crypto/lifecycle.ts | `D:\Desktop\Inkforge\inkforge\src\utils\crypto\lifecycle.ts` | 密钥缓存超时管理 |
| crypto/config.ts | `D:\Desktop\Inkforge\inkforge\src\utils\crypto\config.ts` | 加密配置常量 |
| crypto/types.ts | `D:\Desktop\Inkforge\inkforge\src\utils\crypto\types.ts` | 加密类型定义 |
| rebac.ts | `D:\Desktop\Inkforge\inkforge\src\services\auth\rebac.ts` | ReBAC 权限模型 |
| relation-store.ts | `D:\Desktop\Inkforge\inkforge\src\services\auth\relation-store.ts` | 权限存储 |
| factory.ts (AI) | `D:\Desktop\Inkforge\inkforge\src\services\ai\factory.ts` | AI Provider 工厂 |
| types.ts (AI) | `D:\Desktop\Inkforge\inkforge\src\services\ai\types.ts` | AI 统一类型 |
| article.ts (schema) | `D:\Desktop\Inkforge\inkforge\src\schemas\article.ts` | Zod Schema 定义 |
| security.ts | `D:\Desktop\Inkforge\inkforge\src\config\security.ts` | 安全配置中心 |
| constants/index.ts | `D:\Desktop\Inkforge\inkforge\src\constants\index.ts` | 全局常量 |
| error.ts | `D:\Desktop\Inkforge\inkforge\src\services\error.ts` | 错误处理 + Logger |
