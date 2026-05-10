import { z } from 'zod'

export const DEFAULT_ASSET_PROFILE_ID = 'local-default'
export const MAX_ASSET_FILE_SIZE = 10 * 1024 * 1024
export const ASSET_COMPRESSION_THRESHOLD = 2 * 1024 * 1024
export const ASSET_THUMBNAIL_SIZE = 200
export const ORPHAN_ASSET_GRACE_MS = 24 * 60 * 60 * 1000

export const ASSET_MIME_CATEGORY_VALUES = ['image', 'attachment', 'unknown'] as const
export const ASSET_SOURCE_KIND_VALUES = ['file', 'paste', 'drop', 'dialog', 'external-url', 'legacy'] as const
export const ASSET_LIFECYCLE_VALUES = ['active', 'orphaned', 'deleted'] as const
export const ASSET_REFERRER_KIND_VALUES = ['article', 'document', 'export', 'profile', 'external'] as const
export const ASSET_PIPELINE_ERROR_CODE_VALUES = [
  'crypto_unavailable',
  'file_too_large',
  'unsupported_mime',
  'invalid_url',
  'fetch_failed',
  'hash_collision',
  'asset_not_found',
  'storage_failed',
] as const

export const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  'image/avif',
])

export const SUPPORTED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
  'application/json',
  'text/markdown',
])

export type AssetMimeCategory = typeof ASSET_MIME_CATEGORY_VALUES[number]
export type AssetSourceKind = typeof ASSET_SOURCE_KIND_VALUES[number]
export type AssetLifecycle = typeof ASSET_LIFECYCLE_VALUES[number]
export type AssetReferrerKind = typeof ASSET_REFERRER_KIND_VALUES[number]
export type AssetPipelineErrorCode = typeof ASSET_PIPELINE_ERROR_CODE_VALUES[number]

export interface AssetReferrerInput {
  kind: AssetReferrerKind
  id: string
  position?: number | null
}

export interface AssetRefRecord {
  id: string
  schemaVersion: 1
  assetId: string
  profileId: string
  referrerKind: AssetReferrerKind
  referrerId: string
  position: number | null
  source: string
  createdAt: number
  updatedAt: number
}

export interface AssetIngestOptions {
  profileId?: string
  sourceKind?: AssetSourceKind
  source?: string
  originalName?: string
  mimeType?: string
  externalUrl?: string | null
  cachedAt?: number | null
  referrer?: AssetReferrerInput
}

export interface AssetIngestResult<TAsset> {
  asset: TAsset
  ref: AssetRefRecord | null
  isNew: boolean
  contentHash: string
}

export interface AssetStorageStats {
  totalCount: number
  imageCount: number
  attachmentCount: number
  imageBytes: number
  attachmentBytes: number
  orphanCount: number
  orphanBytes: number
}

export type AssetSnapshotStatus = 'inline-base64' | 'external-url' | 'local-relative' | 'placeholder-manual' | 'missing'
export type AssetSnapshotMode = 'inline-base64' | 'external-url' | 'local-relative' | 'placeholder-manual'

export interface AssetSnapshot {
  assetId: string
  status: AssetSnapshotStatus
  mimeType: string | null
  originalName: string | null
  bytes: number
  dataUrl?: string
  externalUrl?: string
  relativePath?: string
  reason?: string
}

export class AssetPipelineError extends Error {
  readonly code: AssetPipelineErrorCode
  readonly context?: Record<string, unknown>

  constructor(code: AssetPipelineErrorCode, message: string, context?: Record<string, unknown>) {
    super(message)
    this.name = 'AssetPipelineError'
    this.code = code
    this.context = context
    Object.setPrototypeOf(this, AssetPipelineError.prototype)
  }
}

export const assetReferrerSchema = z.object({
  kind: z.enum(ASSET_REFERRER_KIND_VALUES),
  id: z.string().min(1),
  position: z.number().int().nonnegative().nullable().optional(),
}) satisfies z.ZodType<AssetReferrerInput>

export const assetIngestOptionsSchema = z.object({
  profileId: z.string().min(1).optional(),
  sourceKind: z.enum(ASSET_SOURCE_KIND_VALUES).optional(),
  source: z.string().min(1).optional(),
  originalName: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
  externalUrl: z.string().url().nullable().optional(),
  cachedAt: z.number().int().positive().nullable().optional(),
  referrer: assetReferrerSchema.optional(),
}) satisfies z.ZodType<AssetIngestOptions>

export function normalizeMimeType(value: string | null | undefined): string {
  return typeof value === 'string' ? value.split(';')[0].trim().toLowerCase() : ''
}

export function classifyMime(mimeType: string): AssetMimeCategory {
  const normalized = normalizeMimeType(mimeType)
  if (SUPPORTED_IMAGE_MIME_TYPES.has(normalized)) return 'image'
  if (SUPPORTED_ATTACHMENT_MIME_TYPES.has(normalized)) return 'attachment'
  return 'unknown'
}

export function assertSupportedAssetMime(mimeType: string): AssetMimeCategory {
  const category = classifyMime(mimeType)
  if (category === 'unknown') {
    throw new AssetPipelineError('unsupported_mime', `Unsupported asset MIME type: ${mimeType || 'unknown'}`, { mimeType })
  }
  return category
}

export function toLegacyAssetType(category: AssetMimeCategory, mimeType: string): 'image' | 'svg' | 'video' | 'file' {
  if (category === 'image') return normalizeMimeType(mimeType) === 'image/svg+xml' ? 'svg' : 'image'
  return 'file'
}

export function sanitizeAssetName(name: string | null | undefined, fallback = 'asset'): string {
  const normalized = typeof name === 'string' ? name.trim() : ''
  if (!normalized) return fallback
  return normalized.replace(/[\\/:*?"<>|]/g, '-').slice(0, 180)
}
