import { defineStore } from 'pinia'
import { computed, onScopeDispose, ref } from 'vue'
import { db, type AssetRecord } from '@/utils/db'
import {
  AssetBlobUrlCache,
  AssetPipelineError,
  DEFAULT_ASSET_PROFILE_ID,
  assetPipeline,
} from '@/services/asset-pipeline'
import { logger, AppError, ErrorCode } from '@/services/error'

/**
 * Local-first asset store.
 * Public actions stay compatible with the existing editor while uploads now pass through the real Asset Pipeline.
 */
export const useAssetStore = defineStore('asset', () => {
    const assets = ref<AssetRecord[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const urlCache = new AssetBlobUrlCache()
    let loadSequence = 0

    const totalSize = computed(() => assets.value.reduce((sum, asset) => sum + (asset.compressedSizeBytes ?? asset.size), 0))
    const imageAssets = computed(() => assets.value.filter(asset => asset.type === 'image' || asset.type === 'svg'))
    const cachedUrlCount = ref(0)

    function reportError(err: unknown, fallback: string, context?: Record<string, unknown>): string {
        const message = err instanceof AppError
            ? err.toUserMessage()
            : err instanceof AssetPipelineError
                ? err.message
                : fallback
        logger.error(fallback, err, context)
        return message
    }

    function mergeAsset(asset: AssetRecord): void {
        const index = assets.value.findIndex(item => item.id === asset.id)
        if (index === -1) {
            assets.value = [asset, ...assets.value]
            return
        }

        assets.value = [
            ...assets.value.slice(0, index),
            asset,
            ...assets.value.slice(index + 1),
        ]
    }

    function replaceLoadedAssets(nextAssets: AssetRecord[]): void {
        const nextIds = new Set(nextAssets.map(asset => asset.id))
        for (const asset of assets.value) {
            if (nextIds.has(asset.id)) continue
            urlCache.revoke(asset.id)
            urlCache.revoke(`thumb_${asset.id}`)
        }
        assets.value = nextAssets
        cachedUrlCount.value = urlCache.size
    }

    async function loadAssets(articleId?: string): Promise<void> {
        const sequence = ++loadSequence
        loading.value = true
        error.value = null
        try {
            const nextAssets = await assetPipeline.listAssets({ articleId })
            if (sequence === loadSequence) {
                replaceLoadedAssets(nextAssets)
            }
        } catch (err) {
            if (sequence === loadSequence) {
                error.value = reportError(err, 'Failed to load assets', { articleId })
            } else {
                logger.warn('Stale asset load failed after the active article changed', {
                    articleId,
                    error: err instanceof Error ? err.message : String(err),
                })
            }
        } finally {
            if (sequence === loadSequence) {
                loading.value = false
            }
        }
    }

    async function uploadAsset(file: File, articleId?: string): Promise<AssetRecord> {
        error.value = null
        try {
            const result = await assetPipeline.ingestFile(file, {
                profileId: DEFAULT_ASSET_PROFILE_ID,
                sourceKind: 'file',
                source: 'asset.store.uploadAsset',
                referrer: articleId ? { kind: 'article', id: articleId } : undefined,
            })

            mergeAsset(result.asset)
            logger.info('Asset upload completed through pipeline', {
                id: result.asset.id,
                name: result.asset.name,
                size: result.asset.size,
                type: result.asset.type,
                category: result.asset.category,
                isNew: result.isNew,
            })
            return result.asset
        } catch (err) {
            const message = reportError(err, 'Asset upload failed', { fileName: file.name, articleId })
            error.value = message
            if (err instanceof AppError || err instanceof AssetPipelineError) throw err
            throw new AppError(ErrorCode.VALIDATION_ERROR, message, { fileName: file.name, articleId })
        }
    }

    async function uploadAssets(files: File[], articleId?: string): Promise<AssetRecord[]> {
        const results: AssetRecord[] = []
        for (const file of files) {
            try {
                results.push(await uploadAsset(file, articleId))
            } catch (err) {
                logger.warn('Batch asset upload skipped one failed file', {
                    fileName: file.name,
                    error: err instanceof Error ? err.message : String(err),
                })
            }
        }
        return results
    }

    async function deleteAsset(id: string, articleId?: string): Promise<void> {
        if (articleId) {
            await assetPipeline.removeReference(id, { kind: 'article', id: articleId })
            const remainingRefs = await db.assetRefs.where('assetId').equals(id).count()
            if (remainingRefs > 0) {
                assets.value = assets.value.filter(asset => asset.id !== id)
                return
            }
        }

        await assetPipeline.deleteAsset(id)
        urlCache.revoke(id)
        urlCache.revoke(`thumb_${id}`)
        cachedUrlCount.value = urlCache.size
        assets.value = assets.value.filter(asset => asset.id !== id)
    }

    function getAssetUrl(id: string): string | null {
        const asset = assets.value.find(item => item.id === id)
        if (!asset) return null
        const url = urlCache.getOrCreate(id, asset.blob)
        cachedUrlCount.value = urlCache.size
        return url
    }

    function getThumbnailUrl(id: string): string | null {
        const asset = assets.value.find(item => item.id === id)
        if (!asset?.thumbnail) return getAssetUrl(id)
        const url = urlCache.getOrCreate(`thumb_${id}`, asset.thumbnail)
        cachedUrlCount.value = urlCache.size
        return url
    }

    function searchAssets(query: string): AssetRecord[] {
        const normalized = query.toLowerCase().trim()
        if (!normalized) return assets.value

        return assets.value.filter(asset =>
            asset.name.toLowerCase().includes(normalized) ||
            (asset.originalName ?? '').toLowerCase().includes(normalized) ||
            asset.mimeType.toLowerCase().includes(normalized) ||
            asset.tags.some(tag => tag.toLowerCase().includes(normalized))
        )
    }

    async function updateTags(id: string, tags: string[]): Promise<void> {
        await db.assets.update(id, { tags, updatedAt: new Date() })
        const current = assets.value.find(asset => asset.id === id)
        if (current) {
            mergeAsset({ ...current, tags, updatedAt: new Date() })
        }
    }

    function cleanup(): void {
        urlCache.clear()
        cachedUrlCount.value = 0
    }

    onScopeDispose(cleanup)

    return {
        assets,
        loading,
        error,
        totalSize,
        imageAssets,
        cachedUrlCount,
        loadAssets,
        uploadAsset,
        uploadAssets,
        deleteAsset,
        getAssetUrl,
        getThumbnailUrl,
        searchAssets,
        updateTags,
        cleanup,
    }
})
