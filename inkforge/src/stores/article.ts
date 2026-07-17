import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Article } from '@/types'
import {
    CreateArticleDTOSchema,
    UpdateArticleDTOSchema,
    type CreateArticleDTO,
    type UpdateArticleDTO
} from '@/schemas/article'
import { useCategoryStore } from './category'
import { DEFAULT_ACCOUNT_ID, useAccountStore } from './account'
import { useSyncStore } from './sync'
import { parseUrl, calculateScore } from '@/services/parser'
import { articleRepository } from '@/services/repository'
import { onCategoryDeleted } from '@/services/category-events'
import { trashRepository } from '@/services/trash'
import { wikiLinkService } from '@/services/wiki-link'
import { logger, ErrorCode, AppError } from '@/services/error'
import { auditLog, type AuditAction, type AuditSeverity } from '@/services/audit'
import { DEFAULTS, ARTICLE_TAGS, ARTICLE_STATUS } from '@/constants'
import { generateId } from '@/utils/uuid'
import { importFiles as importFilesService, type ImportSummary } from '@/services/file-import'
import { buildArticleAuthorityFields, ensureArticleAuthorityFields, pickArticleAuthorityMirror } from '@/core/authority'
import { getArticleStatusAfterContentChange } from '@/core/lifecycle'

/** 文件导入结果（供 UI 展示） */
export interface FileImportResult {
    success: number
    failed: number
    skippedOversize: number
    errors: string[]
}

/**
 * 资讯管理 Store
 * 使用 Repository 抽象层访问数据
 */
export const useArticleStore = defineStore('article', () => {
    const categoryStore = useCategoryStore()

    // 状态
    const articles = ref<Article[]>([])
    const selectedArticleId = ref<string | null>(null)
    const loading = ref(false)
    const parsing = ref(false)
    const parseError = ref<string | null>(null)
    const loadError = ref<string | null>(null)
    const pendingDeleteOperations = new Map<string, Promise<string | null>>()

    onCategoryDeleted((categoryId) => {
        articles.value = articles.value.map(article =>
            article.categoryId === categoryId
                ? { ...article, categoryId: null }
                : article
        )
    })

    async function trackSyncDirty(
        articleId: string,
        content: string | undefined,
        operation: 'create' | 'update' | 'delete'
    ): Promise<void> {
        try {
            await useSyncStore().markDirty(articleId, content, operation)
        } catch (err) {
            logger.warn('同步变更追踪失败，本地写入已保留', {
                articleId,
                operation,
                error: err instanceof Error ? err.message : String(err),
            })
        }
    }

    async function trackArticleAudit(
        action: AuditAction,
        article: Pick<Article, 'id' | 'title' | 'status' | 'categoryId' | 'sourceUrl' | 'sourceName'>,
        severity: AuditSeverity,
        payload: Record<string, unknown> = {},
    ): Promise<void> {
        const accountStore = useAccountStore()
        const profileId = accountStore.currentAccount?.id ?? DEFAULT_ACCOUNT_ID
        await auditLog(action, {
            actorId: profileId,
            profileId,
            docId: article.id,
            resourceId: article.id,
            resourceKind: 'document',
            severity,
            outcome: 'success',
            payload: {
                title: article.title,
                status: article.status,
                categoryId: article.categoryId,
                sourceName: article.sourceName,
                sourceUrl: article.sourceUrl,
                ...payload,
            },
            source: 'useArticleStore',
        })
    }

    async function refreshWikiLinksAfterArticleSaved(articleId: string, rebuildAll = false): Promise<void> {
        try {
            if (rebuildAll) {
                await wikiLinkService.rebuildAllBacklinks()
                return
            }
            await wikiLinkService.rebuildArticleBacklinks(articleId)
        } catch (error) {
            logger.warn('WikiLink backlink index update failed', {
                articleId,
                rebuildAll,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    async function cleanupWikiLinksForArticle(articleId: string): Promise<void> {
        try {
            await wikiLinkService.deleteArticleBacklinks(articleId)
        } catch (error) {
            logger.warn('WikiLink backlink cleanup failed', {
                articleId,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    // 计算属性：根据分类过滤
    const filteredArticles = computed(() => {
        if (!categoryStore.selectedCategoryId) {
            return articles.value
        }
        return articles.value.filter(a => a.categoryId === categoryStore.selectedCategoryId)
    })

    const selectedArticle = computed(() => {
        if (!selectedArticleId.value) return null
        return articles.value.find(a => a.id === selectedArticleId.value) || null
    })

    // 加载资讯列表
    async function loadArticles() {
        loading.value = true
        loadError.value = null
        try {
            const loadedArticles = await articleRepository.findAllOrderedByDate()
            const repairedArticles = await Promise.all(loadedArticles.map(async (article) => {
                const repair = await ensureArticleAuthorityFields(article)
                if (repair.repaired) {
                    await articleRepository.update(article.id, repair.updates)
                }
                return repair.article
            }))
            articles.value = repairedArticles
        } catch (err) {
            const msg = err instanceof AppError ? err.toUserMessage() : '加载失败'
            loadError.value = msg
            logger.error('加载资讯失败', err, { code: ErrorCode.DB_READ_FAILED })
        } finally {
            loading.value = false
        }
    }

    // 选择资讯
    function selectArticle(id: string) {
        selectedArticleId.value = id

        // 标记为已读
        const article = articles.value.find(a => a.id === id)
        if (article && article.status === ARTICLE_STATUS.NEW) {
            updateArticle(id, { status: ARTICLE_STATUS.READ })
        }
    }

    // 从URL添加资讯（真实解析）
    async function addArticleFromUrl(url: string) {
        parsing.value = true
        parseError.value = null

        try {
            // 真实解析URL
            const parseResult = await parseUrl(url)
            const score = calculateScore(parseResult)

            // 生成标签（使用常量避免魔术字符串）
            const tags: string[] = [ARTICLE_TAGS.NEW]
            if (parseResult.authors.length > 0) tags.push(ARTICLE_TAGS.HAS_AUTHOR)
            if (parseResult.images.length > 0) tags.push(ARTICLE_TAGS.HAS_IMAGES)
            if (parseResult.rawContent.length > DEFAULTS.LONG_ARTICLE_THRESHOLD) tags.push(ARTICLE_TAGS.LONG_ARTICLE)

            const now = new Date()
            const authority = await buildArticleAuthorityFields(parseResult.rawContent, {
                title: parseResult.title,
                summary: parseResult.description,
                status: ARTICLE_STATUS.NEW,
                tags,
                categoryId: categoryStore.selectedCategoryId,
                createdAt: now,
                updatedAt: now,
                publishedAt: parseResult.publishedAt ?? null,
            })

            const article: Article = {
                id: generateId(),
                categoryId: categoryStore.selectedCategoryId,
                sourceUrl: url,
                sourceName: parseResult.sourceName,
                title: parseResult.title,
                description: parseResult.description,
                authors: parseResult.authors,
                publishedAt: parseResult.publishedAt,
                rawContent: parseResult.rawContent,
                ...authority,
                links: parseResult.links,
                images: parseResult.images,
                score,
                tags,
                status: ARTICLE_STATUS.NEW,
                createdAt: now,
                updatedAt: now
            }

            await articleRepository.create(article)
            await refreshWikiLinksAfterArticleSaved(article.id, true)
            await trackArticleAudit('document.import', article, 'info', {
                importKind: 'url',
                linkCount: article.links.length,
                imageCount: article.images.length,
                score: article.score,
            })
            await trackSyncDirty(article.id, article.rawContent, 'create')
            // 不可变更新：创建新数组而非 unshift
            articles.value = [article, ...articles.value]

            // 更新分类计数
            if (article.categoryId) {
                categoryStore.updateArticleCount(article.categoryId, 1)
            }

            return article
        } catch (error) {
            parseError.value = error instanceof AppError ? error.toUserMessage() : '解析失败'
            throw error
        } finally {
            parsing.value = false
        }
    }

    // 手动添加资讯（使用精确DTO类型 + Zod 运行时校验）
    async function addArticle(data: CreateArticleDTO) {
        // 运行时校验：确保输入数据符合 Schema
        const validated = CreateArticleDTOSchema.parse(data)

        const now = new Date()
        const rawContent = validated.rawContent ?? ''
        const tags = validated.tags ?? []
        const status = validated.status ?? ARTICLE_STATUS.NEW
        const authority = await buildArticleAuthorityFields(rawContent, {
            title: validated.title,
            summary: validated.description ?? '',
            status,
            tags,
            categoryId: validated.categoryId ?? null,
            createdAt: now,
            updatedAt: now,
            publishedAt: null,
        })

        const article: Article = {
            id: generateId(),
            categoryId: validated.categoryId ?? null,
            sourceUrl: validated.sourceUrl,
            sourceName: validated.sourceName ?? DEFAULTS.SOURCE_NAME,
            title: validated.title,
            description: validated.description ?? '',
            authors: validated.authors ?? [],
            rawContent,
            ...authority,
            links: validated.links ?? [],
            images: validated.images ?? [],
            score: DEFAULTS.MANUAL_ARTICLE_SCORE,
            tags,
            status,
            createdAt: now,
            updatedAt: now
        }

        await articleRepository.create(article)
        await refreshWikiLinksAfterArticleSaved(article.id, true)
        await trackArticleAudit('document.create', article, 'info', {
            tagCount: article.tags.length,
            imageCount: article.images.length,
            manual: true,
        })
        await trackSyncDirty(article.id, article.rawContent, 'create')
        // 不可变更新：创建新数组而非 unshift
        articles.value = [article, ...articles.value]

        if (article.categoryId) {
            categoryStore.updateArticleCount(article.categoryId, 1)
        }

        return article
    }

    // 更新资讯（使用精确DTO类型 + Zod 运行时校验，不可变更新）
    async function updateArticle(id: string, updates: UpdateArticleDTO) {
        // 运行时校验：确保更新数据符合 Schema
        const validated = UpdateArticleDTOSchema.parse(updates)
        const updatedAt = new Date()
        const current = articles.value.find(a => a.id === id) ?? await articleRepository.findById(id)
        const authorityRelevantUpdate = (
            validated.rawContent !== undefined ||
            validated.title !== undefined ||
            validated.description !== undefined ||
            validated.status !== undefined ||
            validated.tags !== undefined
        )
        const nextStatus = current && authorityRelevantUpdate
            ? getArticleStatusAfterContentChange(
                current.status,
                validated.rawContent ?? current.rawContent ?? '',
                validated.status,
            )
            : validated.status
        const lifecycleUpdates = nextStatus ? { ...validated, status: nextStatus } : validated
        const authority = current && authorityRelevantUpdate
            ? await buildArticleAuthorityFields(
                lifecycleUpdates.rawContent ?? current.rawContent ?? '',
                pickArticleAuthorityMirror({ ...current, ...lifecycleUpdates, updatedAt }),
                current.markdownSource,
            )
            : {}
        const persistedUpdates: Partial<Article> = { ...lifecycleUpdates, ...authority, updatedAt }
        const shouldRebuildAllWikiLinks = Boolean(
            current && persistedUpdates.title && persistedUpdates.title !== current.title,
        )

        await articleRepository.update(id, persistedUpdates)
        if (current) {
            await trackArticleAudit('document.update', { ...current, ...persistedUpdates }, 'info', {
                changedFields: Object.keys(persistedUpdates),
                authorityRebuilt: authorityRelevantUpdate,
            })
        }
        await trackSyncDirty(id, persistedUpdates.rawContent ?? current?.rawContent ?? '', 'update')
        await refreshWikiLinksAfterArticleSaved(id, shouldRebuildAllWikiLinks)
        const index = articles.value.findIndex(a => a.id === id)
        if (index !== -1) {
            // 不可变更新
            articles.value = [
                ...articles.value.slice(0, index),
                { ...articles.value[index], ...persistedUpdates },
                ...articles.value.slice(index + 1)
            ]
        }
    }

    // 删除资讯
    async function deleteArticle(id: string): Promise<string | null> {
        const pendingOperation = pendingDeleteOperations.get(id)
        if (pendingOperation) return pendingOperation

        const operation = (async (): Promise<string | null> => {
            const postCommitWarnings = new Set<string>()
            const wasLoaded = articles.value.some(article => article.id === id)
            const article = articles.value.find(article => article.id === id) ?? await articleRepository.findById(id)
            const accountStore = useAccountStore()
            const actorId = accountStore.currentAccount?.id ?? DEFAULT_ACCOUNT_ID
            const trashedArticle = await trashRepository.moveToTrash(id, { actorId })

            // Repository commit is the success boundary. Reconcile visible state before
            // best-effort wiki, audit, and sync side effects run.
            articles.value = articles.value.filter(articleItem => articleItem.id !== id)
            if (selectedArticleId.value === id) {
                selectedArticleId.value = null
            }
            if (article?.categoryId) {
                try {
                    await categoryStore.updateArticleCount(article.categoryId, -1)
                } catch (err) {
                    postCommitWarnings.add('文稿已移入回收站，但分类计数刷新失败。')
                    logger.warn('文章已移入回收站，但分类计数刷新失败', {
                        articleId: id,
                        categoryId: article.categoryId,
                        error: err instanceof Error ? err.message : String(err),
                    })
                }
            }

            await cleanupWikiLinksForArticle(id)
            if (article) {
                try {
                    await trackArticleAudit('document.delete', { ...article, ...trashedArticle }, 'warning', {
                        softDelete: true,
                        hadCategory: Boolean(article.categoryId),
                        deletedAt: trashedArticle.deletedAt?.toISOString?.() ?? trashedArticle.deletedAt ?? null,
                        expiresAt: trashedArticle.expiresAt?.toISOString?.() ?? trashedArticle.expiresAt ?? null,
                        evidenceSource: wasLoaded ? 'loaded-state' : 'repository-lookup',
                    })
                } catch (err) {
                    postCommitWarnings.add('文稿已移入回收站，但删除审计记录失败。')
                    logger.warn('文章已移入回收站，但删除审计写入失败', {
                        articleId: id,
                        error: err instanceof Error ? err.message : String(err),
                    })
                }
            }
            await trackSyncDirty(id, undefined, 'delete')
            return postCommitWarnings.size > 0 ? Array.from(postCommitWarnings).join(' ') : null
        })()

        pendingDeleteOperations.set(id, operation)
        const clearOperation = (): void => {
            if (pendingDeleteOperations.get(id) === operation) {
                pendingDeleteOperations.delete(id)
            }
        }
        void operation.then(clearOperation, clearOperation)
        return operation
    }

    // 从文件系统导入文件（支持 .md / .html / .txt）
    async function importFromFiles(): Promise<FileImportResult> {
        const result: FileImportResult = { success: 0, failed: 0, skippedOversize: 0, errors: [] }

        try {
            const summary: ImportSummary = await importFilesService()
            result.skippedOversize = summary.skippedOversize

            // 用户取消选择，返回空结果
            if (summary.results.length === 0 && summary.failed === 0 && summary.skippedOversize === 0 && summary.errors.length === 0) {
                return result
            }

            // 将解析结果逐条写入数据库
            for (const importedFile of summary.results) {
                try {
                    // 构建来源标识
                    const sourceUrl = importedFile.filePath
                        ? `file://${importedFile.filePath}`
                        : `import://${importedFile.fileName}`

                    // 构建来源名称
                    const sourceName = importedFile.sourceFormat === 'markdown'
                        ? '导入 Markdown'
                        : importedFile.sourceFormat === 'html'
                            ? '导入 HTML'
                            : '导入文本'

                    // 构建标签
                    const tags: string[] = [ARTICLE_TAGS.NEW]
                    if (importedFile.images.length > 0) tags.push(ARTICLE_TAGS.HAS_IMAGES)
                    if (importedFile.content.length > DEFAULTS.LONG_ARTICLE_THRESHOLD) tags.push(ARTICLE_TAGS.LONG_ARTICLE)

                    // 从 frontmatter 提取 description
                    const description = typeof importedFile.frontmatter.description === 'string'
                        ? importedFile.frontmatter.description
                        : ''

                    // 从 frontmatter 提取 author
                    const authors: string[] = []
                    if (typeof importedFile.frontmatter.author === 'string') {
                        authors.push(importedFile.frontmatter.author)
                    }

                    // 从 frontmatter 提取 tags 并合并
                    if (Array.isArray(importedFile.frontmatter.tags)) {
                        for (const t of importedFile.frontmatter.tags) {
                            if (typeof t === 'string' && !tags.includes(t)) {
                                tags.push(t)
                            }
                        }
                    }

                    await addArticle({
                        title: importedFile.title,
                        sourceUrl,
                        sourceName,
                        rawContent: importedFile.content,
                        description,
                        authors,
                        images: importedFile.images,
                        tags,
                        categoryId: categoryStore.selectedCategoryId ?? undefined,
                    })

                    result.success++
                } catch (err) {
                    result.failed++
                    const msg = err instanceof Error ? err.message : String(err)
                    result.errors.push(`写入失败 ${importedFile.fileName}: ${msg}`)
                    logger.warn('导入文件写入数据库失败', { fileName: importedFile.fileName, error: msg })
                }
            }

            // 合并文件级错误
            result.failed += summary.failed
            result.errors.push(...summary.errors)

            if (result.success > 0) {
                logger.info('文件导入完成', {
                    success: result.success,
                    failed: result.failed,
                })
                await auditLog('document.import', {
                    actorId: DEFAULT_ACCOUNT_ID,
                    profileId: DEFAULT_ACCOUNT_ID,
                    severity: result.failed > 0 ? 'warning' : 'info',
                    outcome: result.failed > 0 ? 'partial' : 'success',
                    payload: {
                        source: 'file-picker',
                        success: result.success,
                        failed: result.failed,
                        skippedOversize: result.skippedOversize,
                        errorCount: result.errors.length,
                    },
                    source: 'useArticleStore.importFromFiles',
                })
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            result.errors.push(`导入操作失败: ${msg}`)
            result.failed++
            logger.error('文件导入操作异常', err)
        }

        return result
    }

    // 移动到分类（不可变更新）
    async function moveToCategory(articleId: string, categoryId: string | null) {
        const index = articles.value.findIndex(a => a.id === articleId)
        if (index === -1) return

        const article = articles.value[index]
        const oldCategoryId = article.categoryId
        const updatedAt = new Date()

        const authority = await buildArticleAuthorityFields(
            article.rawContent ?? '',
            pickArticleAuthorityMirror({ ...article, categoryId, updatedAt }),
            article.markdownSource,
        )
        const updates: Partial<Article> = { categoryId, updatedAt, ...authority }

        // 使用 Repository 更新
        await articleRepository.update(articleId, updates)
        await trackArticleAudit('document.update', { ...article, ...updates }, 'info', {
            changedFields: ['categoryId'],
            oldCategoryId,
            newCategoryId: categoryId,
        })

        // 不可变更新本地状态
        articles.value = [
            ...articles.value.slice(0, index),
            { ...article, ...updates },
            ...articles.value.slice(index + 1)
        ]

        // 分类计数属于本次移动的提交边界，调用方只有在计数持久化后才视为完成
        if (oldCategoryId && oldCategoryId !== categoryId) {
            await categoryStore.updateArticleCount(oldCategoryId, -1)
        }
        if (categoryId && categoryId !== oldCategoryId) {
            await categoryStore.updateArticleCount(categoryId, 1)
        }
    }

    // 初始化 Promise 锁（解决并发调用的竞态条件）
    let initPromise: Promise<void> | null = null

    // 初始化方法（由 main.ts 显式调用，支持幂等调用，并发安全）
    async function initialize() {
        // 如果已经在初始化中，返回现有的 Promise
        if (initPromise) {
            return initPromise
        }

        // 创建新的初始化 Promise
        initPromise = (async () => {
            try {
                await loadArticles()
            } catch (error) {
                // 初始化失败时重置状态，确保状态一致性
                reset()
                // 重置 initPromise 允许重试
                initPromise = null
                throw error
            }
        })()

        return initPromise
    }

    // 重置方法（支持热重载和测试场景）
    function reset() {
        initPromise = null
        articles.value = []
        selectedArticleId.value = null
        loading.value = false
        parsing.value = false
        parseError.value = null
        loadError.value = null
    }

    return {
        // State
        articles,
        selectedArticleId,
        loading,
        parsing,
        parseError,
        loadError,

        // Getters
        filteredArticles,
        selectedArticle,

        // Actions
        initialize,
        reset,
        loadArticles,
        selectArticle,
        addArticleFromUrl,
        addArticle,
        updateArticle,
        deleteArticle,
        moveToCategory,
        importFromFiles,
    }
})

