import type { AssetRecord } from '@/utils/db'
import { AssetPipelineRepository, assetPipelineRepository } from './repository'
import { calculateBlobSha256, buildAssetIdFromHash } from './hash'
import { processAssetBlob } from './image-processor'
import {
  DEFAULT_ASSET_PROFILE_ID,
  MAX_ASSET_FILE_SIZE,
  AssetPipelineError,
  assetIngestOptionsSchema,
  assertSupportedAssetMime,
  normalizeMimeType,
  sanitizeAssetName,
  toLegacyAssetType,
  type AssetIngestOptions,
  type AssetIngestResult,
  type AssetRefRecord,
  type AssetReferrerInput,
} from './types'

function deriveNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const last = parts.length > 0 ? parts[parts.length - 1] : undefined
    return sanitizeAssetName(last, 'external-asset')
  } catch {
    return 'external-asset'
  }
}

function ensureSizeAllowed(blob: Blob): void {
  if (blob.size > MAX_ASSET_FILE_SIZE) {
    throw new AssetPipelineError('file_too_large', `Asset size exceeds 10MB: ${(blob.size / 1024 / 1024).toFixed(1)}MB`, {
      size: blob.size,
      maxSize: MAX_ASSET_FILE_SIZE,
    })
  }
}

export class AssetPipelineService {
  constructor(private readonly repository: AssetPipelineRepository = assetPipelineRepository) {}

  async ingestFile(file: File, options: AssetIngestOptions = {}): Promise<AssetIngestResult<AssetRecord>> {
    return await this.ingestBlob(file, {
      ...options,
      originalName: options.originalName ?? file.name,
      mimeType: options.mimeType ?? file.type,
      sourceKind: options.sourceKind ?? 'file',
    })
  }

  async ingestBlob(blob: Blob, options: AssetIngestOptions = {}): Promise<AssetIngestResult<AssetRecord>> {
    const parsed = assetIngestOptionsSchema.parse(options)
    ensureSizeAllowed(blob)

    const profileId = parsed.profileId ?? DEFAULT_ASSET_PROFILE_ID
    const originalMimeType = normalizeMimeType(parsed.mimeType ?? blob.type)
    const category = assertSupportedAssetMime(originalMimeType)
    const contentHash = await calculateBlobSha256(blob)
    const assetId = buildAssetIdFromHash(contentHash)
    const existing = await this.repository.getAsset(assetId)

    if (existing && existing.contentHash && existing.contentHash !== contentHash) {
      throw new AssetPipelineError('hash_collision', 'Asset id collision detected for SHA-256 prefix', {
        assetId,
        existingHash: existing.contentHash,
        incomingHash: contentHash,
      })
    }

    if (existing) {
      const ref = parsed.referrer ? await this.createReference(assetId, parsed.referrer, {
        profileId,
        source: parsed.source ?? 'asset-pipeline.ingest-existing',
      }) : null
      const refreshed = await this.repository.getAsset(assetId)
      return { asset: refreshed ?? existing, ref, isNew: false, contentHash }
    }

    const processed = await processAssetBlob(blob, category, originalMimeType)
    const now = new Date()
    const asset: AssetRecord = {
      id: assetId,
      articleId: parsed.referrer?.kind === 'article' ? parsed.referrer.id : null,
      name: sanitizeAssetName(parsed.originalName, 'asset'),
      originalName: sanitizeAssetName(parsed.originalName, 'asset'),
      type: toLegacyAssetType(category, processed.mimeType),
      mimeType: processed.mimeType,
      originalMimeType,
      size: processed.blob.size,
      sizeBytes: blob.size,
      compressedSizeBytes: processed.blob.size,
      blob: processed.blob,
      thumbnail: processed.thumbnail,
      width: processed.width,
      height: processed.height,
      tags: [],
      profileId,
      contentHash,
      category,
      sourceKind: parsed.sourceKind ?? 'file',
      externalUrl: parsed.externalUrl ?? null,
      cachedAt: parsed.cachedAt ?? null,
      refCount: 0,
      lifecycle: 'orphaned',
      orphanedAt: Date.now(),
      storageBackend: 'indexeddb',
      createdAt: now,
      updatedAt: now,
    }

    const upserted = await this.repository.upsertAsset(asset)
    const ref = parsed.referrer ? await this.createReference(upserted.asset.id, parsed.referrer, {
      profileId,
      source: parsed.source ?? 'asset-pipeline.ingest-new',
    }) : null
    const refreshed = await this.repository.getAsset(upserted.asset.id)

    return {
      asset: refreshed ?? upserted.asset,
      ref,
      isNew: upserted.isNew,
      contentHash,
    }
  }

  async ingestUrl(url: string, options: AssetIngestOptions = {}): Promise<AssetIngestResult<AssetRecord>> {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      throw new AssetPipelineError('invalid_url', `Invalid asset URL: ${url}`, { url })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new AssetPipelineError('invalid_url', `Unsupported asset URL protocol: ${parsedUrl.protocol}`, { url })
    }
    if (typeof fetch !== 'function') {
      throw new AssetPipelineError('fetch_failed', 'Fetch is unavailable in this runtime', { url })
    }

    let response: Response
    try {
      response = await fetch(url)
    } catch (error) {
      throw new AssetPipelineError('fetch_failed', 'Failed to fetch external asset URL', {
        url,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    if (!response.ok) {
      throw new AssetPipelineError('fetch_failed', `External asset fetch failed with HTTP ${response.status}`, {
        url,
        status: response.status,
      })
    }

    const responseType = normalizeMimeType(response.headers.get('content-type'))
    const blob = await response.blob()
    return await this.ingestBlob(blob, {
      ...options,
      sourceKind: 'external-url',
      externalUrl: url,
      cachedAt: Date.now(),
      originalName: options.originalName ?? deriveNameFromUrl(url),
      mimeType: options.mimeType ?? responseType ?? blob.type,
    })
  }

  async createReference(
    assetId: string,
    referrer: AssetReferrerInput,
    options: { profileId?: string; source?: string } = {},
  ): Promise<AssetRefRecord> {
    return await this.repository.addRef({
      ...referrer,
      assetId,
      profileId: options.profileId,
      source: options.source,
    })
  }

  async removeReference(assetId: string, referrer: AssetReferrerInput): Promise<void> {
    await this.repository.removeRef(assetId, referrer)
  }

  async removeReferencesForReferrer(referrer: AssetReferrerInput): Promise<number> {
    return await this.repository.removeRefsForReferrer(referrer)
  }

  async purgeExpiredOrphans(options: { profileId?: string; now?: number; graceMs?: number } = {}): Promise<number> {
    return await this.repository.purgeExpiredOrphans(options)
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.repository.deleteAsset(assetId)
  }
}

export const assetPipeline = new AssetPipelineService()
