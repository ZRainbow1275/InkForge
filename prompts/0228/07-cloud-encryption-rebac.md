# 07 - 云端加密 + ReBAC 授权

## 问题描述

InkForge 当前数据仅存储在本地 IndexedDB，缺乏：
1. 跨设备同步能力
2. 端到端加密保护
3. 多用户协作与权限控制

## 架构设计

### 总体架构

```
Client (InkForge)                          Server (Self-hosted)
┌─────────────────────┐                    ┌──────────────────────┐
│  Content Editor     │                    │  REST API Gateway    │
│       ↓             │                    │       ↓              │
│  Encryption Layer   │ ── HTTPS ──────→   │  Auth Middleware     │
│  (.inkforge format) │                    │       ↓              │
│       ↓             │                    │  ReBAC Engine        │
│  Sync Engine        │ ←── WebSocket ──   │  (Zanzibar tuples)  │
│       ↓             │                    │       ↓              │
│  Local IndexedDB    │                    │  Object Storage      │
└─────────────────────┘                    │  (S3/MinIO)          │
                                           └──────────────────────┘
```

### 1. 加密格式 (.inkforge)

```
┌──────────────────────────────────────────┐
│           .inkforge 二进制格式             │
├──────────────────────────────────────────┤
│ Magic Number    : 4 bytes  "INKF"        │
│ Version         : 2 bytes  (0x0001)      │
│ Flags           : 2 bytes               │
│   bit 0: compressed (gzip)              │
│   bit 1: has metadata                   │
│   bit 2-15: reserved                    │
│ Key ID          : 16 bytes (UUID)        │
│ IV / Nonce      : 12 bytes              │
│ Salt            : 16 bytes              │
│ Metadata Length : 4 bytes (LE uint32)    │
│ Metadata        : variable (encrypted)   │
│   - title, tags, category (JSON)         │
│ Payload Length  : 4 bytes (LE uint32)    │
│ Payload         : variable (encrypted)   │
│   - markdown body                        │
│ Auth Tag        : 16 bytes (GCM tag)     │
└──────────────────────────────────────────┘
```

```typescript
// utils/crypto/inkforge-format.ts

const MAGIC = new Uint8Array([0x49, 0x4E, 0x4B, 0x46]) // "INKF"
const VERSION = new Uint8Array([0x00, 0x01])

interface InkForgeHeader {
  magic: Uint8Array
  version: number
  flags: number
  keyId: string
  iv: Uint8Array
  salt: Uint8Array
  metadataLength: number
  payloadLength: number
}

export async function encryptToInkForge(
  content: { title: string; body: string; tags?: string[]; category?: string },
  masterKey: CryptoKey
): Promise<ArrayBuffer> {
  // 1. 生成随机 IV 和 Salt
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // 2. 从 master key 派生内容密钥 (HKDF)
  const contentKey = await deriveContentKey(masterKey, salt)

  // 3. 分别加密 metadata 和 payload
  const metadata = JSON.stringify({ title: content.title, tags: content.tags, category: content.category })
  const metadataBytes = new TextEncoder().encode(metadata)
  const payloadBytes = new TextEncoder().encode(content.body)

  // 4. AES-256-GCM 加密
  const encryptedMetadata = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: MAGIC },
    contentKey,
    metadataBytes
  )

  const payloadIv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedPayload = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: payloadIv },
    contentKey,
    payloadBytes
  )

  // 5. 组装 .inkforge 格式
  return assembleInkForgeBuffer(iv, salt, encryptedMetadata, payloadIv, encryptedPayload)
}

export async function decryptFromInkForge(
  buffer: ArrayBuffer,
  masterKey: CryptoKey
): Promise<{ title: string; body: string; tags?: string[]; category?: string }> {
  // 1. 解析头部
  const header = parseInkForgeHeader(buffer)

  // 2. 验证魔数和版本
  if (!arrayEqual(header.magic, MAGIC)) throw new Error('Invalid .inkforge file')

  // 3. 派生内容密钥
  const contentKey = await deriveContentKey(masterKey, header.salt)

  // 4. 解密 metadata 和 payload
  // ...
}
```

### 2. 密钥管理

```typescript
// utils/crypto/key-management.ts (增强现有)

/**
 * 多层密钥架构：
 *
 * Layer 1: User Password → PBKDF2 (100,000 iterations) → Master Key
 * Layer 2: Master Key + Salt → HKDF → Content Key (per-document)
 * Layer 3: Content Key → AES-256-GCM → Encrypted Content
 *
 * Master Key 存储：
 * - Tauri: 系统 Keychain (keytar / security-credential-store)
 * - Web: 仅内存中，刷新后需重新输入密码
 */

export async function deriveMasterKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function deriveContentKey(
  masterKey: CryptoKey,
  salt: Uint8Array
): Promise<CryptoKey> {
  // 导出 master key 的 raw bytes 用于 HKDF
  const masterKeyRaw = await crypto.subtle.exportKey('raw', masterKey)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    masterKeyRaw,
    'HKDF',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt,
      info: new TextEncoder().encode('inkforge-content-v1'),
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
```

### 3. 同步引擎

```typescript
// services/sync/sync-engine.ts

interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'offline'
  lastSyncAt: string | null
  pendingChanges: number
  conflictCount: number
}

interface ChangeRecord {
  id: string
  articleId: string
  operation: 'create' | 'update' | 'delete'
  timestamp: string
  checksum: string  // SHA-256 of encrypted content
  encrypted: ArrayBuffer  // .inkforge format
}

/**
 * 同步策略：
 * 1. 增量同步 — 仅上传变更的文章
 * 2. 冲突检测 — 基于 vector clock 或 last-write-wins
 * 3. 离线支持 — 本地队列 + 联网后批量上传
 * 4. 端到端加密 — 服务器仅存储密文
 */
export class SyncEngine {
  private changeQueue: ChangeRecord[] = []
  private syncInterval: ReturnType<typeof setInterval> | null = null

  async startAutoSync(intervalMs: number = 30_000): Promise<void> {
    this.syncInterval = setInterval(() => this.sync(), intervalMs)
  }

  async sync(): Promise<SyncResult> {
    // 1. 拉取远端变更列表（仅 checksum，不含内容）
    // 2. 比对本地版本
    // 3. 下载新/更新的内容（加密态）
    // 4. 本地解密 + 合并
    // 5. 上传本地变更（加密态）
    // 6. 更新同步状态
  }

  async resolveConflict(
    local: ChangeRecord,
    remote: ChangeRecord,
    strategy: 'local-wins' | 'remote-wins' | 'manual'
  ): Promise<void> {
    // 冲突解决逻辑
  }
}
```

### 4. ReBAC 授权 (Zanzibar-style)

```typescript
// services/auth/rebac.ts

/**
 * Zanzibar-style Relation Tuples
 *
 * 格式: <object>#<relation>@<subject>
 *
 * 示例:
 *   document:doc1#owner@user:alice
 *   document:doc1#viewer@user:bob
 *   folder:work#editor@team:engineering
 *   document:doc1#parent@folder:work
 *
 * 权限推导:
 *   如果 user:bob 是 team:engineering 的成员
 *   且 folder:work 的 editor 包括 team:engineering
 *   且 document:doc1 的 parent 是 folder:work
 *   则 user:bob 有 document:doc1 的 edit 权限
 */

interface RelationTuple {
  namespace: string     // e.g., "document", "folder", "team"
  objectId: string      // e.g., "doc1"
  relation: string      // e.g., "owner", "viewer", "editor"
  subjectNamespace: string  // e.g., "user", "team"
  subjectId: string     // e.g., "alice"
  subjectRelation?: string  // for subject sets, e.g., "member"
}

interface PermissionCheck {
  namespace: string
  objectId: string
  permission: string    // e.g., "view", "edit", "delete", "share"
  subjectNamespace: string
  subjectId: string
}

/**
 * 权限模型定义
 */
const DOCUMENT_MODEL = {
  relations: {
    owner: {},            // 所有者
    editor: {},           // 编辑者
    viewer: {},           // 查看者
    parent: {},           // 所属文件夹
  },
  permissions: {
    view: 'owner | editor | viewer | parent->view',
    edit: 'owner | editor | parent->edit',
    delete: 'owner',
    share: 'owner | editor',
  }
}
```

## 修改文件清单

### 需要创建
| 文件 | 说明 |
|------|------|
| `src/utils/crypto/inkforge-format.ts` | .inkforge 二进制格式编解码 |
| `src/services/sync/sync-engine.ts` | 同步引擎核心 |
| `src/services/sync/change-tracker.ts` | 变更追踪 |
| `src/services/sync/conflict-resolver.ts` | 冲突解决 |
| `src/services/auth/rebac.ts` | ReBAC 权限模型 |
| `src/services/auth/relation-store.ts` | 关系元组存储 |
| `src/stores/sync.ts` | 同步状态 store |

### 需要修改
| 文件 | 修改内容 |
|------|----------|
| `src/utils/crypto/key-management.ts` | 增强为多层密钥架构 |
| `src/utils/crypto/encryption.ts` | 支持 .inkforge 格式 |
| `src/stores/article.ts` | 集成同步引擎 |
| `src/views/SettingsView.vue` | 添加同步设置 UI |

### 依赖添加
- 无新依赖（使用 Web Crypto API 原生实现）

## 验证标准

1. 可以将文章加密为 .inkforge 格式并正确解密
2. 密钥派生使用 PBKDF2 (100K iterations) + HKDF
3. 每个文档使用独立的 Content Key（通过不同 salt 派生）
4. 同步引擎可以检测本地变更并生成变更记录
5. 冲突检测基于 checksum 比对
6. ReBAC 权限检查正确推导传递关系
7. Tauri 环境下 Master Key 存储在系统 Keychain

## 优先级

**P3** — 高级功能，复杂度极高
