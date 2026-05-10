# Spec 28 — Asset Pipeline

<!--
spec-id: 28
title: Asset Pipeline (Image & Attachment Management)
version: 1.0.0
status: draft
created: 2026-04-21
sources:
  - prompts/0420/_extracted/03-enhancement-answers.md F-04
  - prompts/0420/00-decisions-part3b-tauri-visual-recovery.md Q-06 Q-08
  - prompts/0420/_extracted/01-L1-answers.md L1-35 L1-54
related-specs:
  - 18-tauri-desktop-spec.md
  - 12-file-manager-spec.md
  - 08-data-insights-spec.md
-->

---

## 1. 范围与目标

本 Spec 定义 InkForge v2.1 的资产管道：图片与附件的摄入、存储、引用追踪、孤儿检测、去重、懒加载、图片查看器、外链缓存的完整规格。

**管辖范围**：

| 模块 | 内容 |
|------|------|
| 资产类型 | 图片（png/jpg/gif/webp/svg/avif）/ 附件（pdf/doc/zip/其他）|
| 存储策略 | IndexedDB Blob（主）/ Tauri 本地文件（启用 FileBridge 时的镜像）|
| 摄入来源 | 拖放、粘贴、文件对话框、URL 嵌入 |
| 处理管道 | 压缩、尺寸限制、缩略图生成 |
| 引用追踪 | `asset_refs` 表 + 引用计数 |
| 孤儿清理 | 引用归零后延迟 24h 清理 |
| 懒加载 | IntersectionObserver |
| 图片查看器 | 全屏预览、缩放、旋转 |
| 外链缓存 | 可选代理缓存 |

**不在本 Spec**：编辑器图片扩展（E-09，ImageExtension Spec）内部实现、TauriFileBridge 详细同步逻辑（Spec 18）。

---

## 2. 决策溯源

| 决策 | 内容 | 来源 |
|------|------|------|
| F-04 C + 补充 | 一项目一文件夹；引用追踪；孤儿检测；去重；存储统计 | F-04 |
| Q-06 | content-hash 命名（SHA-256 前 16 位）；子目录分片 | Q-06 |
| Q-08 | 文件拖放 + 粘贴共用同一 pipeline | Q-08 |
| L1-35 C | 最大附件数量 2000+ | L1-35 |
| T05-11 D | 统一 assetPipeline 入口 | part3b |

---

## 3. 资产类型定义

```typescript
// src/types/asset.ts

export type AssetMimeCategory = 'image' | 'attachment' | 'unknown'

export interface AssetRecord {
  id: string                    // content-hash（SHA-256 前 16 位 hex）
  profileId: string
  originalName: string          // 原始文件名（展示用）
  mimeType: string              // MIME type
  category: AssetMimeCategory
  sizeBytes: number             // 原始文件大小
  compressedSizeBytes: number   // 存储的实际大小（压缩后）
  width: number | null          // 图片宽度（px），非图片为 null
  height: number | null         // 图片高度（px）
  thumbnailId: string | null    // 缩略图资产 ID（200×200）
  externalUrl: string | null    // 外链图片原始 URL（null 表示本地）
  cachedAt: number | null       // 外链缓存时间戳
  createdAt: number
  refCount: number              // 引用计数（冗余字段，提升查询性能）
}

export interface AssetRef {
  id: string
  assetId: string
  articleId: string
  position: number              // 在文档中的大致字符位置（用于定位，非精确）
  createdAt: number
}

// MIME 分类规则
export function classifyMime(mimeType: string): AssetMimeCategory {
  if (mimeType.startsWith('image/')) return 'image'
  if ([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'text/csv',
  ].includes(mimeType)) return 'attachment'
  return 'unknown'
}
```

---

## 4. AssetRepository

```typescript
// src/repositories/asset.ts
import type { AssetRecord, AssetRef } from '@/types/asset'

export interface AssetRepository {
  /** 插入或忽略（幂等：相同 ID 已存在则返回已有记录）*/
  upsert(asset: AssetRecord): Promise<AssetRecord>

  /** 通过 content-hash ID 查找 */
  findById(id: string): Promise<AssetRecord | null>

  /** 通过原始文件 SHA-256 查重（返回已有资产 ID 或 null）*/
  findByContentHash(sha256: string): Promise<string | null>

  /** 列出所有孤儿资产（refCount === 0）*/
  listOrphans(profileId: string): Promise<AssetRecord[]>

  /** 列出 profileId 下所有资产 */
  listByProfile(profileId: string, options?: { limit: number; offset: number }): Promise<AssetRecord[]>

  /** 更新引用计数 */
  incrementRefCount(assetId: string): Promise<void>
  decrementRefCount(assetId: string): Promise<void>

  /** 删除资产记录 + Blob 数据 */
  delete(assetId: string): Promise<void>

  /** 存储统计 */
  getTotalSize(profileId: string): Promise<{ imageBytes: number; attachmentBytes: number }>

  // AssetRef 操作
  addRef(ref: Omit<AssetRef, 'id' | 'createdAt'>): Promise<AssetRef>
  removeRef(assetId: string, articleId: string): Promise<void>
  listRefsByArticle(articleId: string): Promise<AssetRef[]>
  listRefsByAsset(assetId: string): Promise<AssetRef[]>
}
```

---

## 5. 摄入管道（ingest pipeline）

### 5.1 统一入口

所有来源（拖放/粘贴/文件对话框/URL 嵌入）共用同一个 `assetPipeline.ingest*` 入口，确保处理逻辑一致：

```typescript
// src/services/asset-pipeline/index.ts

export interface IngestResult {
  assetId: string
  isNew: boolean              // true 表示新资产，false 表示引用已有资产（去重命中）
  asset: AssetRecord
}

export interface AssetPipeline {
  /** 从本地文件路径摄入（Tauri 环境） */
  ingestFile(filePath: string, articleId?: string): Promise<IngestResult>

  /** 从 ArrayBuffer 摄入（粘贴图片、拖放 DataTransfer） */
  ingestBuffer(options: {
    buffer: ArrayBuffer
    mimeType: string
    originalName: string
    articleId?: string
  }): Promise<IngestResult>

  /** 从 File 对象摄入（Web 环境拖放） */
  ingestFile_web(file: File, articleId?: string): Promise<IngestResult>

  /** 从远程 URL 摄入（缓存外链图片） */
  ingestUrl(url: string, articleId?: string): Promise<IngestResult>

  /** 批量摄入多个文件路径 */
  ingestFiles(filePaths: string[], articleId?: string): Promise<IngestResult[]>

  /** 从剪贴板摄入（图片优先） */
  ingestClipboard(clipboardData: DataTransfer, articleId?: string): Promise<IngestResult | null>
}
```

### 5.2 核心摄入流程

```typescript
// src/services/asset-pipeline/ingest.ts

async function ingestBuffer(options: {
  buffer: ArrayBuffer
  mimeType: string
  originalName: string
  articleId?: string
}): Promise<IngestResult> {
  const { buffer, mimeType, originalName, articleId } = options

  // 步骤 1：计算原始 SHA-256
  const sha256 = await computeSha256(buffer)

  // 步骤 2：去重检查（查询 IndexedDB）
  const existingId = await assetRepository.findByContentHash(sha256)
  if (existingId) {
    // 命中去重：更新引用，不重复存储
    if (articleId) {
      await assetRepository.addRef({ assetId: existingId, articleId, position: 0 })
      await assetRepository.incrementRefCount(existingId)
    }
    const existing = await assetRepository.findById(existingId)
    return { assetId: existingId, isNew: false, asset: existing! }
  }

  // 步骤 3：类型分类
  const category = classifyMime(mimeType)

  // 步骤 4：图片处理管道
  let processedBuffer = buffer
  let finalMimeType = mimeType
  let width: number | null = null
  let height: number | null = null

  if (category === 'image' && mimeType !== 'image/svg+xml') {
    const result = await processImage(buffer, mimeType)
    processedBuffer = result.buffer
    finalMimeType = result.mimeType
    width = result.width
    height = result.height
  }

  // 步骤 5：生成资产 ID（SHA-256 前 16 位）
  const assetId = sha256.substring(0, 16)

  // 步骤 6：写入 IndexedDB（Blob 存储）
  await assetBlobStore.put(assetId, processedBuffer, finalMimeType)

  // 步骤 7：生成缩略图（异步，不阻塞主流程）
  let thumbnailId: string | null = null
  if (category === 'image' && mimeType !== 'image/svg+xml') {
    thumbnailId = await generateThumbnail(assetId, processedBuffer, finalMimeType)
  }

  // 步骤 8：写入元数据
  const asset: AssetRecord = {
    id: assetId,
    profileId: getCurrentProfileId(),
    originalName,
    mimeType: finalMimeType,
    category,
    sizeBytes: buffer.byteLength,
    compressedSizeBytes: processedBuffer.byteLength,
    width,
    height,
    thumbnailId,
    externalUrl: null,
    cachedAt: null,
    createdAt: Date.now(),
    refCount: articleId ? 1 : 0,
  }

  await assetRepository.upsert(asset)

  // 步骤 9：建立引用关系
  if (articleId) {
    await assetRepository.addRef({ assetId, articleId, position: 0 })
  }

  return { assetId, isNew: true, asset }
}
```

### 5.3 图片处理管道

```typescript
// src/services/asset-pipeline/image-processor.ts

export interface ImageProcessResult {
  buffer: ArrayBuffer
  mimeType: string
  width: number
  height: number
}

const MAX_DIMENSION = 4096    // px，超出则等比缩放
const COMPRESS_THRESHOLD = 2 * 1024 * 1024  // 2MB，超出自动压缩
const COMPRESS_QUALITY = 0.8  // WebP 质量

export async function processImage(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<ImageProcessResult> {
  // 使用 createImageBitmap + OffscreenCanvas 处理（Worker 线程）
  const blob = new Blob([buffer], { type: mimeType })
  const bitmap = await createImageBitmap(blob)

  let { width, height } = bitmap

  // 等比缩放到最大尺寸
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  // 判断是否需要压缩
  const needsCompression = buffer.byteLength > COMPRESS_THRESHOLD

  // 使用 OffscreenCanvas 处理
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let resultBlob: Blob
  let finalMimeType: string

  if (needsCompression) {
    // 压缩：转为 WebP
    resultBlob = await canvas.convertToBlob({ type: 'image/webp', quality: COMPRESS_QUALITY })
    finalMimeType = 'image/webp'
  } else {
    // 不压缩：保持原格式（除非浏览器不支持 avif 输出）
    resultBlob = await canvas.convertToBlob({ type: mimeType })
    finalMimeType = mimeType
  }

  return {
    buffer: await resultBlob.arrayBuffer(),
    mimeType: finalMimeType,
    width,
    height,
  }
}
```

### 5.4 缩略图生成

```typescript
// src/services/asset-pipeline/thumbnail.ts

const THUMBNAIL_SIZE = 200   // px（正方形，居中裁切）

export async function generateThumbnail(
  originalAssetId: string,
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string | null> {
  try {
    const blob = new Blob([buffer], { type: mimeType })
    const bitmap = await createImageBitmap(blob)

    const size = THUMBNAIL_SIZE
    const canvas = new OffscreenCanvas(size, size)
    const ctx = canvas.getContext('2d')!

    // 居中裁切（cover 模式）
    const scale = Math.max(size / bitmap.width, size / bitmap.height)
    const scaledW = bitmap.width * scale
    const scaledH = bitmap.height * scale
    const offsetX = (size - scaledW) / 2
    const offsetY = (size - scaledH) / 2
    ctx.drawImage(bitmap, offsetX, offsetY, scaledW, scaledH)
    bitmap.close()

    const thumbBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.7 })
    const thumbBuffer = await thumbBlob.arrayBuffer()

    // 缩略图以独立资产存储（不走完整 ingest pipeline，避免递归）
    const thumbSha = await computeSha256(thumbBuffer)
    const thumbId = `${originalAssetId}-thumb`
    await assetBlobStore.put(thumbId, thumbBuffer, 'image/webp')

    return thumbId
  } catch (err) {
    console.warn('[AssetPipeline] Thumbnail generation failed:', err)
    return null
  }
}
```

---

## 6. 资产 URL 方案

### 6.1 Tauri 环境

在 Tauri 环境下，资产通过自定义 protocol 访问：

```typescript
// asset://{assetId}  →  从 IndexedDB 读取并返回 Blob URL
// 实现：tauri://localhost 的 protocol handler + src/platform/asset-protocol.ts

export function getAssetUrl(assetId: string): string {
  if (isTauri()) {
    return `tauri://localhost/asset/${assetId}`
  }
  // Web dev 环境：通过内存 Blob URL
  return getBlobUrl(assetId)  // 见 blob-url-cache
}
```

```rust
// src-tauri/src/main.rs — 注册 asset protocol
.register_uri_scheme_protocol("asset", |app, request| {
    let asset_id = /* 从 URL 路径解析 asset_id */ ...;
    let data = /* 从 IndexedDB 读取资产 Blob */ ...;
    ResponseBuilder::new()
        .mimetype(&asset.mime_type)
        .body(data)
})
```

### 6.2 Web 开发环境

```typescript
// src/services/asset-pipeline/blob-url-cache.ts
const blobUrlCache = new Map<string, string>()

export async function getBlobUrl(assetId: string): Promise<string> {
  if (blobUrlCache.has(assetId)) return blobUrlCache.get(assetId)!

  const buffer = await assetBlobStore.get(assetId)
  const asset = await assetRepository.findById(assetId)
  if (!buffer || !asset) throw new Error(`Asset not found: ${assetId}`)

  const blob = new Blob([buffer], { type: asset.mimeType })
  const url = URL.createObjectURL(blob)
  blobUrlCache.set(assetId, url)
  return url
}

export function revokeAssetUrl(assetId: string): void {
  const url = blobUrlCache.get(assetId)
  if (url) {
    URL.revokeObjectURL(url)
    blobUrlCache.delete(assetId)
  }
}
```

---

## 7. 引用追踪

### 7.1 引用建立与释放

引用关系在以下时机建立/释放：

| 事件 | 操作 |
|------|------|
| 文档中插入图片 | `addRef(assetId, articleId)` + `incrementRefCount(assetId)` |
| 文档中删除图片 | `removeRef(assetId, articleId)` + `decrementRefCount(assetId)` |
| 文档被删除（软删除）| 不释放引用（回收站中的文档仍引用资产）|
| 文档被彻底删除 | 释放该文档所有 AssetRef |
| 文档恢复（从回收站）| 引用已存在，无需操作 |

### 7.2 引用计数同步

通过 ProseMirror 插件监听 `image` 节点的插入/删除，触发引用计数更新：

```typescript
// src/extensions/asset-ref-tracker.ts
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

const assetRefTrackerKey = new PluginKey('assetRefTracker')

export const AssetRefTracker = Extension.create({
  name: 'assetRefTracker',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: assetRefTrackerKey,
        appendTransaction(transactions, oldState, newState) {
          const articleId = this.spec.articleId

          // 查找新增和删除的 image 节点
          const addedAssets = new Set<string>()
          const removedAssets = new Set<string>()

          transactions.forEach(tr => {
            if (!tr.docChanged) return
            tr.steps.forEach(step => {
              step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
                // 检查被移除范围内的 image 节点
                oldState.doc.nodesBetween(oldStart, oldEnd, (node) => {
                  if (node.type.name === 'image') {
                    const assetId = extractAssetId(node.attrs.src)
                    if (assetId) removedAssets.add(assetId)
                  }
                })
                // 检查新增范围内的 image 节点
                newState.doc.nodesBetween(newStart, newEnd, (node) => {
                  if (node.type.name === 'image') {
                    const assetId = extractAssetId(node.attrs.src)
                    if (assetId) addedAssets.add(assetId)
                  }
                })
              })
            })
          })

          // 净差：addedAssets - removedAssets 中的新增；removedAssets - addedAssets 中的删除
          for (const id of addedAssets) {
            if (!removedAssets.has(id)) {
              assetPipeline.addRef(id, articleId)
            }
          }
          for (const id of removedAssets) {
            if (!addedAssets.has(id)) {
              assetPipeline.removeRef(id, articleId)
            }
          }

          return null
        },
      }),
    ]
  },
})

function extractAssetId(src: string): string | null {
  const match = src.match(/^(?:tauri:\/\/localhost\/asset\/|asset:\/\/)([a-f0-9]+)/)
  return match?.[1] ?? null
}
```

---

## 8. 孤儿资产清理

### 8.1 清理调度器

```typescript
// src/services/asset-pipeline/orphan-cleaner.ts

const ORPHAN_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000  // 24 小时

export class OrphanCleaner {
  private pendingDeletion = new Map<string, number>()  // assetId → 标记时间戳

  async scanAndSchedule(profileId: string): Promise<void> {
    const orphans = await assetRepository.listOrphans(profileId)

    for (const orphan of orphans) {
      if (this.pendingDeletion.has(orphan.id)) continue

      // 记录"变为孤儿"的时间（24h 宽限期）
      this.pendingDeletion.set(orphan.id, Date.now())
    }
  }

  async purgeExpired(profileId: string): Promise<number> {
    const now = Date.now()
    let purgedCount = 0

    for (const [assetId, markedAt] of this.pendingDeletion) {
      if (now - markedAt < ORPHAN_GRACE_PERIOD_MS) continue

      // 再次验证引用计数（防止并发误删）
      const asset = await assetRepository.findById(assetId)
      if (!asset || asset.refCount > 0) {
        this.pendingDeletion.delete(assetId)
        continue
      }

      await assetRepository.delete(assetId)
      this.pendingDeletion.delete(assetId)
      purgedCount++
    }

    return purgedCount
  }

  cancelPending(assetId: string): void {
    this.pendingDeletion.delete(assetId)
  }
}

export const orphanCleaner = new OrphanCleaner()
```

### 8.2 DataInsights 展示

孤儿资产在 DataInsights（Spec 08）的存储统计中显示：

```typescript
// 展示给用户的格式
interface OrphanSummary {
  count: number
  totalSizeBytes: number
  oldestOrphanDays: number
}
```

用户可在 Settings > Storage 中手动触发立即清理（跳过 24h 宽限期）。

---

## 9. 懒加载

### 9.1 IntersectionObserver 实现

编辑器中的图片使用 `loading="lazy"` 属性，配合 IntersectionObserver 实现懒加载：

```typescript
// src/extensions/lazy-image.ts
// TipTap Image 扩展的自定义 NodeView

import { NodeViewWrapper } from '@tiptap/vue-3'

export const LazyImageView = {
  setup(props: NodeViewProps) {
    const imageRef = ref<HTMLImageElement | null>(null)
    const isVisible = ref(false)
    const resolvedSrc = ref<string>('')

    onMounted(() => {
      const observer = new IntersectionObserver(
        async ([entry]) => {
          if (entry.isIntersecting && !isVisible.value) {
            isVisible.value = true
            const assetId = extractAssetId(props.node.attrs.src)
            if (assetId) {
              resolvedSrc.value = await getAssetUrl(assetId)
            } else {
              resolvedSrc.value = props.node.attrs.src
            }
            observer.disconnect()
          }
        },
        { rootMargin: '200px' }  // 提前 200px 开始加载
      )

      if (imageRef.value) observer.observe(imageRef.value)
    })

    return { imageRef, isVisible, resolvedSrc }
  },
}
```

未加载时显示占位符（与图片宽高一致的灰色矩形）：

```css
.image-lazy-placeholder {
  background-color: var(--color-surface-subtle);
  display: block;
  width: 100%;
  aspect-ratio: var(--image-aspect-ratio, 16/9);
  border-radius: 4px;
}
```

---

## 10. 图片查看器

点击编辑器内图片（非编辑状态）打开全屏图片查看器：

```typescript
// src/components/asset/ImageViewer.vue

interface ImageViewerState {
  visible: boolean
  assetId: string | null
  externalUrl: string | null
  zoom: number              // 0.1 ~ 5.0
  rotation: number          // 0, 90, 180, 270
}

const imageViewer = useImageViewer()

// 使用
imageViewer.open({ assetId: 'abc123' })
imageViewer.open({ externalUrl: 'https://example.com/image.jpg' })
```

图片查看器功能：

| 功能 | 交互 |
|------|------|
| 打开 | 点击图片 |
| 关闭 | 点击遮罩 / 按 `Esc` |
| 缩放放大 | `+` 键 / 滚轮 |
| 缩放缩小 | `-` 键 / 滚轮 |
| 重置缩放 | 双击图片 / 按 `0` |
| 旋转 | 按 `r` 键（顺时针 90°）|
| 拖动 | 鼠标拖拽（放大后） |
| 全屏 | 按 `F`（浏览器全屏 API）|

图片查看器 z-index：`var(--z-overlay, 500)`。

---

## 11. 外链图片缓存

### 11.1 配置

在 Settings > 编辑器 > 缓存外链图片 中开启。

默认关闭。开启后，编辑器中的外链图片（`http://`/`https://` 开头的 src）在首次渲染时：

1. 通过 `fetch` 下载图片数据
2. 走完整 `ingestBuffer` pipeline（含压缩/去重）
3. 在 IndexedDB 中记录 `externalUrl` 字段和 `cachedAt` 时间戳
4. 将编辑器中的 `src` 替换为 `asset://` 链接（静默更新文档）

### 11.2 缓存刷新

缓存外链图片超过 7 天未更新时，在 DataInsights 中提示"X 张外链图片缓存超过 7 天，建议刷新"。

```typescript
// src/services/asset-pipeline/external-cache.ts
export async function cacheExternalImage(url: string, articleId?: string): Promise<string> {
  // 先查看是否已缓存
  const existing = await assetRepository.findByExternalUrl(url)
  if (existing) return existing.id

  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const buffer = await response.arrayBuffer()
  const mimeType = response.headers.get('content-type') ?? 'image/jpeg'

  const result = await ingestBuffer({
    buffer,
    mimeType,
    originalName: url.split('/').pop() ?? 'image',
    articleId,
  })

  // 记录原始 URL
  await assetRepository.update(result.assetId, {
    externalUrl: url,
    cachedAt: Date.now(),
  })

  return result.assetId
}
```

---

## 12. 一项目一文件夹物理模型（Q-06）

当用户启用"本地文件系统同步"时，资产文件存储于：

```
<ProjectRoot>/
  assets/
    ab/                    # SHA-256 前 2 位作为子目录（分片降低单目录文件数）
      abcdef0123456789/    # 完整资产 ID（前 16 位）
        original.webp      # 原始（处理后）资产文件
        thumbnail.webp     # 缩略图（如果有）
```

分片规则：`subdir = assetId.substring(0, 2)`，确保单子目录不超过 256 个目录（理论值）。

---

## 13. 存储后端抽象

```typescript
// src/services/asset-pipeline/storage-backend.ts

export interface AssetStorageBackend {
  put(assetId: string, buffer: ArrayBuffer, mimeType: string): Promise<void>
  get(assetId: string): Promise<ArrayBuffer | null>
  delete(assetId: string): Promise<void>
  exists(assetId: string): Promise<boolean>
}

/** IndexedDB 后端（默认，所有环境）*/
export class IndexedDBAssetBackend implements AssetStorageBackend {
  // 使用 idb-keyval 或 Dexie.js Blob 存储
}

/** Tauri 文件系统后端（启用 FileBridge 时）*/
export class TauriFsAssetBackend implements AssetStorageBackend {
  constructor(private projectRoot: string) {}
  // 读写 <projectRoot>/assets/<prefix>/<assetId>/ 目录
}

/** 组合后端：主写 IndexedDB，镜像写 Tauri FS */
export class CompositeAssetBackend implements AssetStorageBackend {
  constructor(
    private primary: AssetStorageBackend,
    private mirror: AssetStorageBackend | null
  ) {}

  async put(assetId: string, buffer: ArrayBuffer, mimeType: string): Promise<void> {
    await this.primary.put(assetId, buffer, mimeType)
    if (this.mirror) {
      await this.mirror.put(assetId, buffer, mimeType).catch(err => {
        console.warn('[AssetPipeline] Mirror write failed:', err)
      })
    }
  }

  async get(assetId: string): Promise<ArrayBuffer | null> {
    return this.primary.get(assetId)
  }

  async delete(assetId: string): Promise<void> {
    await this.primary.delete(assetId)
    if (this.mirror) {
      await this.mirror.delete(assetId).catch(() => {})
    }
  }

  async exists(assetId: string): Promise<boolean> {
    return this.primary.exists(assetId)
  }
}
```

---

## 14. 文件结构

```
src/
  services/
    asset-pipeline/
      index.ts                  # 公共 API（assetPipeline 导出）
      ingest.ts                 # 核心摄入流程
      image-processor.ts        # 图片处理（压缩/缩放）
      thumbnail.ts              # 缩略图生成
      orphan-cleaner.ts         # 孤儿资产清理调度器
      external-cache.ts         # 外链图片缓存
      storage-backend.ts        # 存储后端抽象
      blob-url-cache.ts         # Web dev 环境 Blob URL 缓存
  repositories/
    asset.ts                    # AssetRepository 实现
  extensions/
    asset-ref-tracker.ts        # ProseMirror 引用追踪插件
    lazy-image.ts               # 懒加载图片 NodeView
  components/
    asset/
      ImageViewer.vue           # 全屏图片查看器
      ImageViewerControls.vue   # 查看器控制栏（缩放/旋转）
      AssetManagerPanel.vue     # 资产管理面板（设置中）
      OrphanAssetList.vue       # 孤儿资产列表
  composables/
    useClipboardPaste.ts        # 粘贴图片处理
    useImageViewer.ts           # 图片查看器 composable
  types/
    asset.ts                    # AssetRecord / AssetRef 类型
```

---

## 15. 性能约束

| 指标 | 要求 |
|------|------|
| 图片摄入耗时（< 2MB）| < 500ms（含压缩） |
| 图片摄入耗时（2-10MB）| < 2s（含 WebP 压缩）|
| 缩略图生成 | < 200ms（异步，不阻塞插入）|
| 去重检查 | < 10ms（IndexedDB 单查询）|
| 懒加载触发 | viewport 进入后 < 100ms 开始加载 |
| 图片查看器打开延迟 | < 150ms |
| 孤儿清理（后台）| 不阻塞主线程（使用 requestIdleCallback）|
| 最大资产数量支持 | 2000+（L1-35 C）|

---

## 16. 测试矩阵

### 16.1 摄入管道

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| I-001 | 拖放图片文件触发 ingestFile | assetId 返回，DB 记录存在 | Integration |
| I-002 | 粘贴图片触发 ingestBuffer | assetId 返回 | Integration |
| I-003 | 文件对话框选择图片触发摄入 | assetId 返回 | E2E |
| I-004 | 相同图片两次摄入：去重命中 | `isNew=false`，refCount 递增 | Unit |
| I-005 | 不同图片两次摄入：各自存储 | 两个不同 assetId | Unit |
| I-006 | > 2MB 图片自动转 WebP | `mimeType = 'image/webp'`，压缩后更小 | Unit |
| I-007 | > 4096px 图片等比缩放 | `width <= 4096 && height <= 4096` | Unit |
| I-008 | SVG 不压缩不缩放 | 原始内容保留 | Unit |
| I-009 | 非图片附件不走图片处理管道 | `category = 'attachment'` | Unit |
| I-010 | assetId = SHA-256 前 16 位 hex | 格式匹配 `[a-f0-9]{16}` | Unit |

### 16.2 缩略图

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| T-001 | 图片摄入后生成 200×200 缩略图 | `thumbnailId` 非 null | Unit |
| T-002 | 缩略图居中裁切（cover 模式） | 宽高均为 200 | Unit |
| T-003 | 缩略图格式为 WebP | mimeType = 'image/webp' | Unit |
| T-004 | 生成失败不影响主资产摄入 | `thumbnailId = null`，assetId 正常返回 | Unit |

### 16.3 引用追踪

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| R-001 | 插入图片节点 refCount 增加 | `refCount` 从 0 → 1 | E2E |
| R-002 | 删除图片节点 refCount 减少 | `refCount` 从 1 → 0 | E2E |
| R-003 | 同一资产被两个文档引用 | `refCount = 2` | Integration |
| R-004 | 文章删除时释放其所有 AssetRef | refs 表中无该 articleId 记录 | Unit |
| R-005 | refCount 不低于 0（边界保护） | 无负数引用计数 | Unit |

### 16.4 孤儿清理

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| O-001 | refCount=0 的资产进入孤儿队列 | pendingDeletion 有记录 | Unit |
| O-002 | 24h 内不删除 | 宽限期内 purgeExpired 返回 0 | Unit |
| O-003 | 24h 后执行删除 | 资产 DB 记录和 Blob 不存在 | Unit |
| O-004 | 孤儿期间引用恢复时取消删除 | pendingDeletion 记录被移除 | Unit |
| O-005 | DataInsights 展示孤儿统计 | count/size 字段正确 | Unit |

### 16.5 懒加载与图片查看器

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| L-001 | 视口外图片显示占位符 | `src` 未加载 | E2E |
| L-002 | 图片进入视口 200px 内开始加载 | `resolvedSrc` 有值 | E2E |
| L-003 | 点击图片打开查看器 | ImageViewer visible=true | E2E |
| L-004 | 查看器 Esc 键关闭 | visible=false | E2E |
| L-005 | 查看器滚轮缩放正确 | zoom 值变化 | Unit |
| L-006 | 查看器 r 键旋转 90° | rotation += 90 | Unit |

### 16.6 外链缓存

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| EC-001 | 开启外链缓存后，外链图片被下载存储 | assetId 生成，externalUrl 字段设置 | Integration |
| EC-002 | 相同外链二次请求命中缓存 | 不重复 fetch | Unit |
| EC-003 | 关闭外链缓存后，外链图片不被缓存 | 无 assetId 生成 | Unit |

### 16.7 存储后端

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| SB-001 | IndexedDB 后端 put/get 正确 | 写入后读取内容一致 | Unit |
| SB-002 | CompositeBackend：主写成功，镜像写失败不阻塞 | 主后端数据正常，警告日志存在 | Unit |
| SB-003 | Tauri FS 后端按分片目录存储 | 文件路径含 2 位前缀子目录 | Integration |

---

## 2026-05-02 Implementation Ledger: Local Asset Pipeline Baseline

Baseline status: Pass for a compatible local-first Asset Pipeline baseline; the full Spec 28 remains partially pending.

Accepted baseline coverage:

- Added `src/services/asset-pipeline/*` as a real service boundary for browser-local asset ingest, hash identity, repository access, Blob URL lifecycle, reference tracking, orphan cleanup, and export snapshot resolution.
- `crypto.subtle.digest('SHA-256', ArrayBuffer)` is used over the real Blob/File bytes. Asset ids use the first 16 hex characters of the content hash, and the full hash is retained as metadata.
- `src/utils/db.ts` now declares Dexie schema v12 with extended asset metadata indexes and a durable `assetRefs` object store. Existing `assets` Blob fields, table name, and legacy store shape remain compatible.
- `src/stores/asset.ts` keeps the existing public Pinia API but routes uploads through `assetPipeline.ingestFile()`, so existing editor callers continue to work while dedupe/ref/orphan metadata is written.
- Supported images include png, jpeg/jpg, gif, svg, webp, and avif. Supported attachments include pdf, doc, docx, zip, text, csv, json, and markdown. Unsupported MIME types fail before storage.
- Attachments are stored as real IndexedDB Blob assets without image-only processing. Image processing remains browser-capability based and degrades to original Blob storage if canvas/image APIs are unavailable.
- Reference rows are real `assetRefs` records. `refCount` is recomputed from persisted refs and never decremented below zero. Assets with zero refs enter an orphan lifecycle with a 24-hour grace period.
- Export snapshot resolution can inline a local Blob asset as a base64 data URL at read time without persisting base64 or document content in IndexedDB metadata.
- External URL ingest is honest fetch-or-fail. A URL asset row is created only when runtime `fetch()` succeeds and returns a Blob; failed or blocked requests do not create fake cache rows.
- Product code does not seed mock asset rows, fake URLs, fake fetch success, simulated Tauri mirror success, document markdown content, secrets, or Emoji glyphs.

Validation evidence:

- `pnpm exec vitest run src/services/asset-pipeline/asset-pipeline.test.ts` passed with 7 tests.
- `pnpm exec vitest run` passed with 9 files and 58 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` passed with only existing non-blocking Vite dynamic/static import and chunk-size warnings.
- Browser smoke on `http://127.0.0.1:5182/settings?tab=about` imported the real Vite module, ingested a real `Blob`, verified same-content dedupe to one id, `isNew=false` on the second ingest, inline base64 snapshot generation, 24-hour orphan grace behavior, expired purge deletion, IndexedDB version `120`, `assetRefs` object store presence, zero console errors, and clean port shutdown.

Pending for full Spec 28 pass:

- Full Tauri filesystem mirror, sharded local file layout, packaged desktop file bridge, and mirror failure warning UI.
- Full Image Extension v2 figure schema migration, image viewer modal, lazy-loading node view, retry UI, replace image UI, and ref tracking directly from ProseMirror transactions.
- Real external image proxy/cache policy, cache hit accounting, and CORS/auth boundary UX beyond fetch-or-fail URL ingest.
- 2000+ asset scale benchmark, image ingest timing matrix, thumbnail performance matrix, and long-session memory profiling.
- Asset Manager panel, orphan asset list UI, DataInsights storage charts, and full 16.x test-matrix completion.
