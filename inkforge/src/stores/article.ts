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
import { useSyncStore } from './sync'
import { parseUrl, calculateScore } from '@/services/parser'
import { articleRepository } from '@/services/repository'
import { logger, ErrorCode, AppError } from '@/services/error'
import { DEFAULTS, ARTICLE_TAGS, ARTICLE_STATUS } from '@/constants'
import { generateId } from '@/utils/uuid'
import { importFiles as importFilesService, type ImportSummary } from '@/services/file-import'
import { db } from '@/utils/db'
import { logDocumentDelete, logImport } from '@/utils/activity-logger'

/** 文件导入结果（供 UI 展示） */
export interface FileImportResult {
    success: number
    failed: number
    errors: string[]
}

/**
 * 资讯管理 Store
 * 使用 Repository 抽象层访问数据
 */
export const useArticleStore = defineStore('article', () => {
    const categoryStore = useCategoryStore()
    const syncStore = useSyncStore()

    // 状态
    const articles = ref<Article[]>([])
    const selectedArticleId = ref<string | null>(null)
    const loading = ref(false)
    const parsing = ref(false)
    const parseError = ref<string | null>(null)
    const loadError = ref<string | null>(null)

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
            articles.value = await articleRepository.findAllOrderedByDate()
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
                links: parseResult.links,
                images: parseResult.images,
                score,
                tags,
                status: ARTICLE_STATUS.NEW,
                createdAt: new Date(),
                updatedAt: new Date()
            }

            await articleRepository.create(article)
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

        const article: Article = {
            id: generateId(),
            categoryId: validated.categoryId ?? null,
            sourceUrl: validated.sourceUrl,
            sourceName: validated.sourceName ?? DEFAULTS.SOURCE_NAME,
            title: validated.title,
            description: validated.description ?? '',
            authors: validated.authors ?? [],
            rawContent: validated.rawContent ?? '',
            links: validated.links ?? [],
            images: validated.images ?? [],
            score: DEFAULTS.MANUAL_ARTICLE_SCORE,
            tags: validated.tags ?? [],
            status: ARTICLE_STATUS.NEW,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        await articleRepository.create(article)
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

        await articleRepository.update(id, { ...validated, updatedAt: new Date() })
        const index = articles.value.findIndex(a => a.id === id)
        if (index !== -1) {
            // 不可变更新
            articles.value = [
                ...articles.value.slice(0, index),
                { ...articles.value[index], ...validated },
                ...articles.value.slice(index + 1)
            ]
        }
    }

    // 删除资讯
    async function deleteArticle(id: string) {
        const article = articles.value.find(a => a.id === id)
        try {
            await db.transaction('rw', [db.articles, db.contents, db.documents, db.versions], async () => {
                await db.contents.where('articleId').equals(id).delete()
                await db.versions.where('documentId').equals(id).delete()
                await db.documents.delete(id)
                await db.articles.delete(id)
            })

            await syncStore.markDirty(id, undefined, 'delete')
            await logDocumentDelete(id, article?.title ?? '未命名文档')

            articles.value = articles.value.filter(a => a.id !== id)

            if (article?.categoryId) {
                categoryStore.updateArticleCount(article.categoryId, -1)
            }

            if (selectedArticleId.value === id) {
                selectedArticleId.value = null
            }
        } catch (err) {
            const msg = err instanceof AppError ? err.toUserMessage() : '删除资讯失败'
            logger.error('删除资讯失败', err, { id })
            throw new AppError(ErrorCode.DB_WRITE_FAILED, msg, { id })
        }
    }

    // 从文件系统导入文件（支持 .md / .html / .txt）
    async function importFromFiles(): Promise<FileImportResult> {
        const result: FileImportResult = { success: 0, failed: 0, errors: [] }

        try {
            const summary: ImportSummary = await importFilesService()

            // 用户取消选择，返回空结果
            if (summary.results.length === 0 && summary.failed === 0) {
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
                await logImport(result.success, 'local-files')
                logger.info('文件导入完成', {
                    success: result.success,
                    failed: result.failed,
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

        // 使用 Repository 更新
        await articleRepository.update(articleId, { categoryId, updatedAt: new Date() })

        // 不可变更新本地状态
        articles.value = [
            ...articles.value.slice(0, index),
            { ...article, categoryId },
            ...articles.value.slice(index + 1)
        ]

        // 更新分类计数
        if (oldCategoryId) {
            categoryStore.updateArticleCount(oldCategoryId, -1)
        }
        if (categoryId) {
            categoryStore.updateArticleCount(categoryId, 1)
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

