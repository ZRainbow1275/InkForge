import { defineStore } from 'pinia'
import { ref, computed, onScopeDispose } from 'vue'
import { db, type AssetRecord } from '@/utils/db'
import { logger, AppError, ErrorCode } from '@/services/error'
import { generateId } from '@/utils/uuid'

/** 单文件最大限制：10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/** 支持的图片 MIME 类型 */
const SUPPORTED_IMAGE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/svg+xml',
    'image/webp',
])

/** 压缩阈值：2MB 以上自动压缩 */
const COMPRESSION_THRESHOLD = 2 * 1024 * 1024

/** 缩略图尺寸 */
const THUMBNAIL_SIZE = 200

/**
 * 素材管理 Store
 * 基于 IndexedDB 的真实素材管理系统
 */
export const useAssetStore = defineStore('asset', () => {
    // ─── 状态 ───
    const assets = ref<AssetRecord[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // ─── 计算属性 ───
    const totalSize = computed(() => {
        return assets.value.reduce((sum, a) => sum + a.size, 0)
    })

    const imageAssets = computed(() => {
        return assets.value.filter(a => a.type === 'image' || a.type === 'svg')
    })

    // ─── Object URL 缓存（避免重复创建） ───
    const urlCache = new Map<string, string>()

    // ─── 加载素材 ───
    async function loadAssets(articleId?: string): Promise<void> {
        loading.value = true
        error.value = null
        try {
            if (articleId) {
                assets.value = await db.assets
                    .where('articleId')
                    .equals(articleId)
                    .reverse()
                    .sortBy('createdAt')
            } else {
                assets.value = await db.assets
                    .orderBy('createdAt')
                    .reverse()
                    .toArray()
            }
        } catch (err) {
            const msg = err instanceof AppError ? err.toUserMessage() : '加载素材失败'
            error.value = msg
            logger.error('加载素材失败', err, { articleId })
        } finally {
            loading.value = false
        }
    }

    // ─── 上传素材 ───
    async function uploadAsset(file: File, articleId?: string): Promise<AssetRecord> {
        // 验证文件大小
        if (file.size > MAX_FILE_SIZE) {
            throw new AppError(
                ErrorCode.VALIDATION_ERROR,
                `文件大小超过限制：${(file.size / 1024 / 1024).toFixed(1)}MB，最大允许 10MB`
            )
        }

        // 验证文件类型
        if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
            throw new AppError(
                ErrorCode.VALIDATION_ERROR,
                `不支持的文件类型：${file.type}，支持 PNG/JPG/GIF/SVG/WebP`
            )
        }

        // 确定素材类型
        const type: AssetRecord['type'] = file.type === 'image/svg+xml' ? 'svg' : 'image'

        // 处理图片：压缩和缩略图
        let blob: Blob = file
        let thumbnail: Blob | undefined
        let width: number | undefined
        let height: number | undefined

        if (type === 'image' && file.type !== 'image/gif') {
            // 读取图片尺寸
            const dimensions = await getImageDimensions(file)
            width = dimensions.width
            height = dimensions.height

            // 大图压缩
            if (file.size > COMPRESSION_THRESHOLD) {
                blob = await compressImage(file, 0.8)
            }

            // 生成缩略图
            thumbnail = await generateThumbnail(file, THUMBNAIL_SIZE)
        }

        const now = new Date()
        const asset: AssetRecord = {
            id: generateId(),
            articleId: articleId || null,
            name: file.name,
            type,
            mimeType: file.type,
            size: blob.size,
            blob,
            thumbnail,
            width,
            height,
            tags: [],
            createdAt: now,
            updatedAt: now,
        }

        // 持久化到 IndexedDB
        await db.assets.add(asset)

        // 不可变更新本地状态
        assets.value = [asset, ...assets.value]

        logger.info('素材上传成功', {
            id: asset.id,
            name: asset.name,
            size: asset.size,
            type: asset.type,
        })

        return asset
    }

    // ─── 批量上传 ───
    async function uploadAssets(files: File[], articleId?: string): Promise<AssetRecord[]> {
        const results: AssetRecord[] = []
        for (const file of files) {
            try {
                const asset = await uploadAsset(file, articleId)
                results.push(asset)
            } catch (err) {
                logger.warn('批量上传中单文件失败', { fileName: file.name })
            }
        }
        return results
    }

    // ─── 删除素材 ───
    async function deleteAsset(id: string): Promise<void> {
        // 清理 Object URL 缓存
        const cachedUrl = urlCache.get(id)
        if (cachedUrl) {
            URL.revokeObjectURL(cachedUrl)
            urlCache.delete(id)
        }

        await db.assets.delete(id)
        assets.value = assets.value.filter(a => a.id !== id)
    }

    // ─── 获取素材 URL ───
    function getAssetUrl(id: string): string | null {
        // 先检查缓存
        const cached = urlCache.get(id)
        if (cached) return cached

        // 从内存中查找
        const asset = assets.value.find(a => a.id === id)
        if (!asset) return null

        const url = URL.createObjectURL(asset.blob)
        urlCache.set(id, url)
        return url
    }

    // ─── 获取缩略图 URL ───
    function getThumbnailUrl(id: string): string | null {
        const cacheKey = `thumb_${id}`
        const cached = urlCache.get(cacheKey)
        if (cached) return cached

        const asset = assets.value.find(a => a.id === id)
        if (!asset?.thumbnail) return getAssetUrl(id)

        const url = URL.createObjectURL(asset.thumbnail)
        urlCache.set(cacheKey, url)
        return url
    }

    // ─── 搜索素材 ───
    function searchAssets(query: string): AssetRecord[] {
        const q = query.toLowerCase().trim()
        if (!q) return assets.value
        return assets.value.filter(a =>
            a.name.toLowerCase().includes(q) ||
            a.tags.some(t => t.toLowerCase().includes(q))
        )
    }

    // ─── 更新素材标签 ───
    async function updateTags(id: string, tags: string[]): Promise<void> {
        await db.assets.update(id, { tags, updatedAt: new Date() })
        const index = assets.value.findIndex(a => a.id === id)
        if (index !== -1) {
            assets.value = [
                ...assets.value.slice(0, index),
                { ...assets.value[index], tags },
                ...assets.value.slice(index + 1),
            ]
        }
    }

    // ─── 清理 Object URL 缓存 ───
    function cleanup(): void {
        urlCache.forEach(url => URL.revokeObjectURL(url))
        urlCache.clear()
    }

    // 自动清理：当 store 的 effectScope 被销毁时释放所有 ObjectURL
    onScopeDispose(cleanup)

    return {
        // State
        assets,
        loading,
        error,

        // Getters
        totalSize,
        imageAssets,

        // Actions
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

// ═══════════════════════════════════════════════════════════════════
// 图片工具函数
// ═══════════════════════════════════════════════════════════════════

/**
 * 获取图片尺寸
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
            URL.revokeObjectURL(img.src)
        }
        img.onerror = () => {
            reject(new Error('无法读取图片尺寸'))
            URL.revokeObjectURL(img.src)
        }
        img.src = URL.createObjectURL(file)
    })
}

/**
 * 压缩图片（Canvas API）
 */
function compressImage(file: File, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                resolve(file)
                return
            }
            ctx.drawImage(img, 0, 0)
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob)
                    } else {
                        resolve(file) // 压缩失败使用原图
                    }
                },
                file.type,
                quality
            )
            URL.revokeObjectURL(img.src)
        }
        img.onerror = () => {
            reject(new Error('图片压缩失败'))
            URL.revokeObjectURL(img.src)
        }
        img.src = URL.createObjectURL(file)
    })
}

/**
 * 生成缩略图（Canvas API）
 */
function generateThumbnail(file: File, maxSize: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            let { naturalWidth: w, naturalHeight: h } = img

            // 等比缩放
            if (w > h) {
                if (w > maxSize) {
                    h = Math.round(h * maxSize / w)
                    w = maxSize
                }
            } else {
                if (h > maxSize) {
                    w = Math.round(w * maxSize / h)
                    h = maxSize
                }
            }

            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                resolve(file)
                return
            }
            ctx.drawImage(img, 0, 0, w, h)
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob)
                    } else {
                        resolve(file)
                    }
                },
                'image/jpeg',
                0.7
            )
            URL.revokeObjectURL(img.src)
        }
        img.onerror = () => {
            reject(new Error('缩略图生成失败'))
            URL.revokeObjectURL(img.src)
        }
        img.src = URL.createObjectURL(file)
    })
}
