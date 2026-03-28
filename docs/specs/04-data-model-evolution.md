# 文档二：数据模型演进规格说明书

## 1. 当前数据模型

### 1.1 IndexedDB 数据库定义

**文件位置**: `D:\Desktop\Inkforge\inkforge\src\utils\db.ts`

**数据库名**: `InkForgeDB`
**当前版本**: 3

| 表名 | 索引定义 | TypeScript 接口 | 来源 |
|------|---------|----------------|------|
| `categories` | `id, name, createdAt` | `Category`（schemas/article.ts 第 90-97 行） | v1 |
| `articles` | `id, categoryId, status, createdAt, sourceUrl` | `Article`（schemas/article.ts 第 103-130 行） | v1 |
| `contents` | `id, articleId, createdAt` | `EditedContent`（schemas/article.ts 第 64-84 行） | v1 |
| `documents` | `id, categoryId, status, createdAt, updatedAt` | `Document`（db.ts 第 27-37 行） | v2 |
| `versions` | `id, documentId, createdAt` | `DocumentVersion`（db.ts 第 12-22 行） | v2 |
| `assets` | `id, articleId, type, name, *tags, createdAt` | `AssetRecord`（db.ts 第 43-57 行） | v3 |

### 1.2 各表字段详情

**Category**:
```typescript
{
  id: string          // UUID
  name: string        // 分类名称
  icon?: string       // 图标标识
  articleCount: number // 文章计数
  createdAt: Date
  updatedAt: Date
}
```

**Article**:
```typescript
{
  id: string              // UUID
  categoryId: string | null
  sourceUrl: string
  sourceName: string
  title: string
  description: string
  authors: string[]
  publishedAt?: Date
  rawContent: string
  links: string[]
  images: string[]
  aiSummary?: string
  score: number
  tags: string[]
  status: 'new' | 'read' | 'processed'
  createdAt: Date
  updatedAt: Date
}
```

**EditedContent**:
```typescript
{
  id: string            // UUID
  articleId: string     // UUID, 关联 articles.id
  title: string
  body: string          // TipTap HTML
  transcript: string
  selectedLinks: string[]
  selectedImages: string[]
  versions: Version[]   // 内嵌版本数组
  currentVersionId: string  // 指向 versions 中某个元素
  createdAt: Date
  updatedAt: Date
}
```

**Document**:
```typescript
{
  id: string
  title: string
  content: string
  categoryId: string | null
  currentVersionId: string
  status: 'draft' | 'published'
  presetId: string
  createdAt: Date
  updatedAt: Date
}
```

**DocumentVersion**:
```typescript
{
  id: string
  documentId: string
  label: string        // 'v1', 'v2', ...
  content: string
  title: string
  description: string
  createdAt: Date
  isInit?: boolean     // 初始版本标记
  isPinned?: boolean   // 置顶标记
}
```

**AssetRecord**:
```typescript
{
  id: string
  articleId: string | null
  name: string
  type: 'image' | 'svg' | 'video' | 'file'
  mimeType: string
  size: number
  blob: Blob
  thumbnail?: Blob
  width?: number
  height?: number
  tags: string[]
  createdAt: Date
  updatedAt: Date
}
```

---

## 2. 新增表

### 2.1 accounts 表

```typescript
// Dexie 索引: 'id, name, email, createdAt'
interface Account {
  id: string            // 默认 'local-default'，未来多账户时为 UUID
  name: string
  email: string
  avatarBlobId: string | null  // 引用 assets.id
  bio: string
  createdAt: Date
  updatedAt: Date
}
```

### 2.2 sync_logs 表

```typescript
// Dexie 索引: 'id, documentId, action, timestamp, status'
interface SyncLog {
  id: string            // UUID
  action: 'push' | 'pull' | 'conflict' | 'resolve' | 'error'
  documentId: string    // 关联的文档 ID
  timestamp: Date
  status: 'success' | 'error' | 'pending'
  details: string       // 操作详情描述
  metadata?: {
    localVersion?: number
    remoteVersion?: number
    strategy?: 'local-wins' | 'remote-wins' | 'manual'
    bytesTransferred?: number
  }
}
```

### 2.3 settings_profiles 表

```typescript
// Dexie 索引: 'id, name, isDefault, createdAt'
interface SettingsProfile {
  id: string            // UUID
  name: string          // e.g., '工作模式', '写作模式'
  settings: string      // JSON.stringify(settings) -- 完整 Settings 对象序列化
  createdAt: Date
  updatedAt: Date
  isDefault: boolean    // 是否为默认 Profile
}
```

### 2.4 activity_logs 表

```typescript
// Dexie 索引: 'id, action, targetType, targetId, timestamp'
interface ActivityLog {
  id: string            // UUID
  action: 'create' | 'edit' | 'delete' | 'export' | 'sync' | 'import' | 'version' | 'backup'
  targetType: 'document' | 'version' | 'category' | 'asset' | 'settings' | 'account'
  targetId: string
  targetTitle: string   // 便于显示
  timestamp: Date
  metadata: Record<string, unknown>  // 操作详情
}
```

---

## 3. 现有表修改

### 3.1 documents 表新增字段

```typescript
interface Document {
  // ... 现有字段保持不变 ...
  
  // === 新增字段 ===
  syncStatus: 'local' | 'synced' | 'modified' | 'conflict'  // 同步状态
  syncedAt: Date | null       // 最后成功同步时间
  remoteVersion: number       // 远端已知版本号
  accountId: string           // 所属账户 ID（默认 'local-default'）
  checksum: string            // 内容 SHA-256 校验和（用于增量同步检测）
}
```

### 3.2 Dexie 版本升级

从 version(3) 升级到 version(4)：

```typescript
// 文件: inkforge/src/utils/db.ts
class InkForgeDB extends Dexie {
  // ... 现有表声明 ...
  accounts!: Table<Account>
  syncLogs!: Table<SyncLog>
  settingsProfiles!: Table<SettingsProfile>
  activityLogs!: Table<ActivityLog>

  constructor() {
    super('InkForgeDB')

    // v1-v3 保持不变...

    // v4: 新增表 + 现有表字段扩展
    this.version(4).stores({
      categories: 'id, name, createdAt',
      articles: 'id, categoryId, status, createdAt, sourceUrl',
      contents: 'id, articleId, createdAt',
      documents: 'id, categoryId, status, syncStatus, accountId, createdAt, updatedAt',
      versions: 'id, documentId, createdAt',
      assets: 'id, articleId, type, name, *tags, createdAt',
      // 新增表
      accounts: 'id, name, email, createdAt',
      syncLogs: 'id, documentId, action, timestamp, status',
      settingsProfiles: 'id, name, isDefault, createdAt',
      activityLogs: 'id, action, targetType, targetId, timestamp',
    }).upgrade(async (tx) => {
      // 迁移脚本：为现有 documents 添加默认值
      await tx.table('documents').toCollection().modify((doc: Record<string, unknown>) => {
        if (!doc.syncStatus) doc.syncStatus = 'local'
        if (!doc.syncedAt) doc.syncedAt = null
        if (!doc.remoteVersion) doc.remoteVersion = 0
        if (!doc.accountId) doc.accountId = 'local-default'
        if (!doc.checksum) doc.checksum = ''
      })

      // 创建默认账户
      const accounts = tx.table('accounts')
      const count = await accounts.count()
      if (count === 0) {
        const now = new Date()
        await accounts.add({
          id: 'local-default',
          name: 'InkForge 用户',
          email: '',
          avatarBlobId: null,
          bio: '',
          createdAt: now,
          updatedAt: now,
        })
      }
    })
  }
}
```

---

## 4. 数据库操作新增

### 4.1 活动日志工具函数

```typescript
// 文件: inkforge/src/utils/activity-logger.ts
import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'
import type { ActivityLog } from '@/utils/db'

export async function logActivity(
  action: ActivityLog['action'],
  targetType: ActivityLog['targetType'],
  targetId: string,
  targetTitle: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.activityLogs.add({
      id: generateId(),
      action,
      targetType,
      targetId,
      targetTitle,
      timestamp: new Date(),
      metadata,
    })
  } catch {
    // 活动日志写入失败不应影响主流程
  }
}

export async function getRecentActivities(limit: number = 50): Promise<ActivityLog[]> {
  return db.activityLogs
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray()
}

export async function clearActivitiesOlderThan(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return db.activityLogs.where('timestamp').below(cutoff).delete()
}
```

### 4.2 同步日志操作

```typescript
// 文件: inkforge/src/services/sync/sync-logger.ts
import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'
import type { SyncLog } from '@/utils/db'

export async function logSyncOperation(
  action: SyncLog['action'],
  documentId: string,
  status: SyncLog['status'],
  details: string,
  metadata?: SyncLog['metadata']
): Promise<void> {
  await db.syncLogs.add({
    id: generateId(),
    action,
    documentId,
    timestamp: new Date(),
    status,
    details,
    metadata,
  })
}

export async function getRecentSyncLogs(limit: number = 20): Promise<SyncLog[]> {
  return db.syncLogs
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray()
}

export async function getSyncLogsForDocument(documentId: string): Promise<SyncLog[]> {
  return db.syncLogs
    .where('documentId')
    .equals(documentId)
    .reverse()
    .sortBy('timestamp')
}
```

### 4.3 Settings Profile 操作

```typescript
// 文件: inkforge/src/services/settings-profile.ts
import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'
import type { SettingsProfile } from '@/utils/db'
import type { Settings } from '@/stores/settings'

export async function saveProfile(name: string, settings: Settings): Promise<SettingsProfile> {
  const profile: SettingsProfile = {
    id: generateId(),
    name,
    settings: JSON.stringify(settings),
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: false,
  }
  await db.settingsProfiles.add(profile)
  return profile
}

export async function getAllProfiles(): Promise<SettingsProfile[]> {
  return db.settingsProfiles.orderBy('createdAt').toArray()
}

export async function loadProfile(profileId: string): Promise<Settings | null> {
  const profile = await db.settingsProfiles.get(profileId)
  if (!profile) return null
  return JSON.parse(profile.settings) as Settings
}

export async function deleteProfile(profileId: string): Promise<void> {
  await db.settingsProfiles.delete(profileId)
}

export async function renameProfile(profileId: string, newName: string): Promise<void> {
  await db.settingsProfiles.update(profileId, { name: newName, updatedAt: new Date() })
}
```

### 4.4 数据库大小计算

```typescript
// 文件: inkforge/src/utils/db-stats.ts
import { db } from '@/utils/db'

export interface DatabaseStats {
  tables: Array<{
    name: string
    count: number
  }>
  totalRecords: number
  estimatedSizeBytes: number
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  const tableNames = ['categories', 'articles', 'contents', 'documents', 'versions', 'assets', 'accounts', 'syncLogs', 'settingsProfiles', 'activityLogs'] as const

  const tables: DatabaseStats['tables'] = []
  let totalRecords = 0

  for (const name of tableNames) {
    try {
      const table = (db as Record<string, unknown>)[name] as { count(): Promise<number> } | undefined
      if (table) {
        const count = await table.count()
        tables.push({ name, count })
        totalRecords += count
      }
    } catch {
      tables.push({ name, count: 0 })
    }
  }

  // 使用 Storage API 估算
  let estimatedSizeBytes = 0
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate()
    estimatedSizeBytes = est.usage ?? 0
  }

  return { tables, totalRecords, estimatedSizeBytes }
}
```

### 4.5 数据导出/导入函数

```typescript
// 文件: inkforge/src/utils/data-export.ts
import { db } from '@/utils/db'

export interface FullExportData {
  version: 1
  exportedAt: string
  categories: unknown[]
  articles: unknown[]
  contents: unknown[]
  documents: unknown[]
  versions: unknown[]
  // assets 中的 Blob 需要 base64 编码
  settings: string | null  // localStorage 原始 JSON
}

export async function exportAllData(): Promise<FullExportData> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: await db.categories.toArray(),
    articles: await db.articles.toArray(),
    contents: await db.contents.toArray(),
    documents: await db.documents.toArray(),
    versions: await db.versions.toArray(),
    settings: localStorage.getItem('inkforge-settings'),
  }
}

export async function importAllData(data: FullExportData): Promise<{ imported: number; skipped: number }> {
  let imported = 0
  let skipped = 0

  await db.transaction('rw', [db.categories, db.articles, db.contents, db.documents, db.versions], async () => {
    for (const cat of data.categories) {
      try { await db.categories.put(cat as never); imported++ }
      catch { skipped++ }
    }
    for (const art of data.articles) {
      try { await db.articles.put(art as never); imported++ }
      catch { skipped++ }
    }
    for (const content of data.contents) {
      try { await db.contents.put(content as never); imported++ }
      catch { skipped++ }
    }
    for (const doc of data.documents) {
      try { await db.documents.put(doc as never); imported++ }
      catch { skipped++ }
    }
    for (const ver of data.versions) {
      try { await db.versions.put(ver as never); imported++ }
      catch { skipped++ }
    }
  })

  if (data.settings) {
    localStorage.setItem('inkforge-settings', data.settings)
  }

  return { imported, skipped }
}
```

