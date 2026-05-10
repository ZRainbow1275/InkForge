import type { AssetRecord } from '@/utils/db'
import { db } from '@/utils/db'
import {
  DEFAULT_ASSET_PROFILE_ID,
  ORPHAN_ASSET_GRACE_MS,
  type AssetLifecycle,
  type AssetMimeCategory,
  type AssetRefRecord,
  type AssetReferrerInput,
  type AssetSourceKind,
  type AssetStorageStats,
  classifyMime,
} from './types'

export interface AddAssetRefInput extends AssetReferrerInput {
  assetId: string
  profileId?: string
  source?: string
}

export interface AssetListOptions {
  profileId?: string
  articleId?: string
  limit?: number
  offset?: number
}

export function buildAssetRefId(assetId: string, referrerKind: string, referrerId: string): string {
  return [assetId, referrerKind, referrerId].map(part => encodeURIComponent(part)).join('__')
}

function normalizeRefCount(asset: AssetRecord | undefined): number {
  const value = asset?.refCount
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}

function getAssetCategory(asset: AssetRecord): AssetMimeCategory {
  return asset.category ?? classifyMime(asset.mimeType)
}

function getAssetSize(asset: AssetRecord): number {
  return asset.compressedSizeBytes ?? asset.sizeBytes ?? asset.size
}

function buildCompatibilityPatch(existing: AssetRecord, incoming: AssetRecord): Partial<AssetRecord> {
  const patch: Partial<AssetRecord> = {}

  if (!existing.profileId && incoming.profileId) patch.profileId = incoming.profileId
  if (!existing.originalName && incoming.originalName) patch.originalName = incoming.originalName
  if (!existing.originalMimeType && incoming.originalMimeType) patch.originalMimeType = incoming.originalMimeType
  if (!existing.contentHash && incoming.contentHash) patch.contentHash = incoming.contentHash
  if (!existing.category && incoming.category) patch.category = incoming.category
  if (!existing.sourceKind && incoming.sourceKind) patch.sourceKind = incoming.sourceKind
  if (!existing.lifecycle) patch.lifecycle = incoming.lifecycle ?? 'active'
  if (existing.refCount === undefined) patch.refCount = 0
  if (existing.sizeBytes === undefined && incoming.sizeBytes !== undefined) patch.sizeBytes = incoming.sizeBytes
  if (existing.compressedSizeBytes === undefined && incoming.compressedSizeBytes !== undefined) {
    patch.compressedSizeBytes = incoming.compressedSizeBytes
  }
  if (!existing.storageBackend && incoming.storageBackend) patch.storageBackend = incoming.storageBackend

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = new Date()
  }

  return patch
}

export class AssetPipelineRepository {
  async getAsset(assetId: string): Promise<AssetRecord | null> {
    return await db.assets.get(assetId) ?? null
  }

  async findByContentHash(contentHash: string): Promise<AssetRecord | null> {
    const byId = await this.getAsset(contentHash.slice(0, 16))
    if (byId?.contentHash === contentHash || (byId && !byId.contentHash)) {
      return byId
    }

    const matches = await db.assets.where('contentHash').equals(contentHash).toArray()
    return matches[0] ?? null
  }

  async upsertAsset(asset: AssetRecord): Promise<{ asset: AssetRecord; isNew: boolean }> {
    const existing = await this.getAsset(asset.id)
    if (existing) {
      const patch = buildCompatibilityPatch(existing, asset)
      if (Object.keys(patch).length > 0) {
        await db.assets.update(existing.id, patch)
        return { asset: { ...existing, ...patch }, isNew: false }
      }
      return { asset: existing, isNew: false }
    }

    await db.assets.add(asset)
    return { asset, isNew: true }
  }

  async listAssets(options: AssetListOptions = {}): Promise<AssetRecord[]> {
    const { articleId, profileId, limit = 100, offset = 0 } = options
    let records: AssetRecord[]

    if (articleId) {
      records = await db.assets.where('articleId').equals(articleId).toArray()
    } else if (profileId) {
      records = await db.assets.where('profileId').equals(profileId).toArray()
    } else {
      records = await db.assets.orderBy('createdAt').toArray()
    }

    return records
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(offset, offset + Math.max(1, limit))
  }

  async addRef(input: AddAssetRefInput): Promise<AssetRefRecord> {
    const profileId = input.profileId ?? DEFAULT_ASSET_PROFILE_ID
    const refId = buildAssetRefId(input.assetId, input.kind, input.id)
    const existing = await db.assetRefs.get(refId)
    if (existing) return existing

    const now = Date.now()
    const ref: AssetRefRecord = {
      id: refId,
      schemaVersion: 1,
      assetId: input.assetId,
      profileId,
      referrerKind: input.kind,
      referrerId: input.id,
      position: input.position ?? null,
      source: input.source ?? 'asset-pipeline.repository',
      createdAt: now,
      updatedAt: now,
    }

    await db.assetRefs.add(ref)
    await this.recomputeRefCount(input.assetId)
    return ref
  }

  async removeRef(assetId: string, referrer: AssetReferrerInput): Promise<void> {
    const refId = buildAssetRefId(assetId, referrer.kind, referrer.id)
    await db.assetRefs.delete(refId)
    await this.recomputeRefCount(assetId)
  }

  async removeRefsForReferrer(referrer: AssetReferrerInput): Promise<number> {
    const refs = await db.assetRefs.where('referrerId').equals(referrer.id).toArray()
    const matching = refs.filter(ref => ref.referrerKind === referrer.kind)
    if (matching.length === 0) return 0

    await db.assetRefs.bulkDelete(matching.map(ref => ref.id))
    await Promise.all(Array.from(new Set(matching.map(ref => ref.assetId))).map(assetId => this.recomputeRefCount(assetId)))
    return matching.length
  }

  async listRefsByAsset(assetId: string): Promise<AssetRefRecord[]> {
    return await db.assetRefs.where('assetId').equals(assetId).toArray()
  }

  async listRefsByReferrer(referrer: AssetReferrerInput): Promise<AssetRefRecord[]> {
    const refs = await db.assetRefs.where('referrerId').equals(referrer.id).toArray()
    return refs.filter(ref => ref.referrerKind === referrer.kind)
  }

  async recomputeRefCount(assetId: string): Promise<number> {
    const asset = await this.getAsset(assetId)
    if (!asset) return 0

    const count = await db.assetRefs.where('assetId').equals(assetId).count()
    const lifecycle: AssetLifecycle = count > 0 ? 'active' : 'orphaned'
    await db.assets.update(assetId, {
      refCount: count,
      lifecycle,
      orphanedAt: count > 0 ? null : asset.orphanedAt ?? Date.now(),
      updatedAt: new Date(),
    })
    return count
  }

  async listOrphans(profileId?: string): Promise<AssetRecord[]> {
    const records = await db.assets.where('lifecycle').equals('orphaned').toArray()
    return records.filter(asset => !profileId || asset.profileId === profileId)
  }

  async purgeExpiredOrphans(options: { profileId?: string; now?: number; graceMs?: number } = {}): Promise<number> {
    const now = options.now ?? Date.now()
    const graceMs = options.graceMs ?? ORPHAN_ASSET_GRACE_MS
    const cutoff = now - graceMs
    const orphans = await this.listOrphans(options.profileId)
    let purged = 0

    for (const asset of orphans) {
      const refCount = await db.assetRefs.where('assetId').equals(asset.id).count()
      if (refCount > 0) {
        await this.recomputeRefCount(asset.id)
        continue
      }

      if ((asset.orphanedAt ?? now) > cutoff) continue
      await this.deleteAsset(asset.id)
      purged += 1
    }

    return purged
  }

  async deleteAsset(assetId: string): Promise<void> {
    const refs = await this.listRefsByAsset(assetId)
    if (refs.length > 0) {
      await db.assetRefs.bulkDelete(refs.map(ref => ref.id))
    }
    await db.assets.delete(assetId)
  }

  async getStorageStats(profileId?: string): Promise<AssetStorageStats> {
    const records = profileId
      ? await db.assets.where('profileId').equals(profileId).toArray()
      : await db.assets.toArray()

    return records.reduce<AssetStorageStats>((stats, asset) => {
      const category = getAssetCategory(asset)
      const bytes = getAssetSize(asset)
      stats.totalCount += 1
      if (category === 'image') {
        stats.imageCount += 1
        stats.imageBytes += bytes
      } else if (category === 'attachment') {
        stats.attachmentCount += 1
        stats.attachmentBytes += bytes
      }
      if ((asset.lifecycle === 'orphaned' || normalizeRefCount(asset) === 0) && asset.orphanedAt) {
        stats.orphanCount += 1
        stats.orphanBytes += bytes
      }
      return stats
    }, {
      totalCount: 0,
      imageCount: 0,
      attachmentCount: 0,
      imageBytes: 0,
      attachmentBytes: 0,
      orphanCount: 0,
      orphanBytes: 0,
    })
  }

  async markSource(assetId: string, sourceKind: AssetSourceKind): Promise<void> {
    await db.assets.update(assetId, { sourceKind, updatedAt: new Date() })
  }
}

export const assetPipelineRepository = new AssetPipelineRepository()
