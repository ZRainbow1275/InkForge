import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category } from '@/types'
import {
    CreateCategoryDTOSchema,
    UpdateCategoryDTOSchema,
    type UpdateCategoryDTO
} from '@/schemas/article'
import { categoryRepository } from '@/services/repository'
import { notifyCategoryDeleted } from '@/services/category-events'
import { logger, ErrorCode, AppError } from '@/services/error'
import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'

const CATEGORY_NAME_CONFLICT_MESSAGE = '分类名称已存在'

function normalizeCategoryName(name: string): string {
    return name.trim().toLocaleLowerCase('zh-CN')
}

/**
 * 分类管理 Store
 * 使用 Repository 抽象层访问数据
 */
export const useCategoryStore = defineStore('category', () => {
    // 状态
    const categories = ref<Category[]>([])
    const selectedCategoryId = ref<string | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)
    const pendingCategoryNames = new Set<string>()

    function createCategoryNameConflictError(name: string): AppError {
        return new AppError(ErrorCode.VALIDATION_ERROR, CATEGORY_NAME_CONFLICT_MESSAGE, { name })
    }

    async function assertCategoryNameAvailable(name: string, excludedId?: string): Promise<void> {
        const normalizedName = normalizeCategoryName(name)
        const persistedCategories = await categoryRepository.findAll()
        const candidates = new Map<string, Category>()
        for (const category of [...persistedCategories, ...categories.value]) {
            candidates.set(category.id, category)
        }
        const conflict = Array.from(candidates.values()).some(category => (
            category.id !== excludedId
            && normalizeCategoryName(category.name) === normalizedName
        ))
        if (conflict) {
            throw createCategoryNameConflictError(name)
        }
    }

    // 计算属性
    const totalArticleCount = computed(() => {
        return categories.value.reduce((sum, cat) => sum + cat.articleCount, 0)
    })

    const selectedCategory = computed(() => {
        if (!selectedCategoryId.value) return null
        return categories.value.find(c => c.id === selectedCategoryId.value) || null
    })

    // 加载分类列表
    async function loadCategories() {
        loading.value = true
        error.value = null
        try {
            categories.value = await categoryRepository.findAll()
        } catch (err) {
            const msg = err instanceof AppError ? err.toUserMessage() : '加载失败'
            error.value = msg
            logger.error('加载分类失败', err, { code: ErrorCode.DB_READ_FAILED })
        } finally {
            loading.value = false
        }
    }

    // 选择分类
    function selectCategory(id: string | null) {
        selectedCategoryId.value = id
    }

    // 添加分类（Zod 运行时校验 + 不可变更新）
    async function addCategory(name: string, icon?: string) {
        // 运行时校验：确保输入数据符合 Schema
        const validated = CreateCategoryDTOSchema.parse({ name, icon })
        const normalizedName = normalizeCategoryName(validated.name)
        if (pendingCategoryNames.has(normalizedName)) {
            const conflictError = createCategoryNameConflictError(validated.name)
            error.value = conflictError.message
            throw conflictError
        }
        pendingCategoryNames.add(normalizedName)
        error.value = null

        try {
            await assertCategoryNameAvailable(validated.name)
            const category: Category = {
                id: generateId(),
                name: validated.name,
                icon: validated.icon || 'folder',
                articleCount: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            }

            await categoryRepository.create(category)
            // 不可变更新：创建新数组而非 push
            categories.value = [...categories.value, category]
            return category
        } catch (err) {
            error.value = err instanceof Error ? err.message : '添加分类失败'
            if (!(err instanceof AppError && err.code === ErrorCode.VALIDATION_ERROR)) {
                logger.error('添加分类失败', err, { name: validated.name })
            }
            throw err
        } finally {
            pendingCategoryNames.delete(normalizedName)
        }
    }

    // 更新分类（使用精确DTO类型 + Zod 运行时校验，不可变更新）
    async function updateCategory(id: string, updates: UpdateCategoryDTO) {
        // 运行时校验：确保更新数据符合 Schema
        const validated = UpdateCategoryDTOSchema.parse(updates)
        const normalizedName = validated.name ? normalizeCategoryName(validated.name) : null
        if (normalizedName && pendingCategoryNames.has(normalizedName)) {
            const conflictError = createCategoryNameConflictError(validated.name ?? '')
            error.value = conflictError.message
            throw conflictError
        }
        if (normalizedName) pendingCategoryNames.add(normalizedName)
        error.value = null

        try {
            if (validated.name) {
                await assertCategoryNameAvailable(validated.name, id)
            }
            const updatedAt = new Date()
            await categoryRepository.update(id, { ...validated, updatedAt })
            const index = categories.value.findIndex(c => c.id === id)
            if (index !== -1) {
                // 不可变更新：创建新数组
                categories.value = [
                    ...categories.value.slice(0, index),
                    { ...categories.value[index], ...validated, updatedAt },
                    ...categories.value.slice(index + 1)
                ]
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : '更新分类失败'
            if (!(err instanceof AppError && err.code === ErrorCode.VALIDATION_ERROR)) {
                logger.error('更新分类失败', err, { id })
            }
            throw err
        } finally {
            if (normalizedName) pendingCategoryNames.delete(normalizedName)
        }
    }

    // 删除分类（使用事务保护，先迁移关联资讯）
    async function deleteCategory(id: string) {
        error.value = null
        try {
            // 使用 Dexie 事务确保原子性
            await db.transaction('rw', [db.categories, db.articles], async () => {
                // 将该分类下的所有资讯迁移到"全部"（categoryId = null）
                await db.articles.where('categoryId').equals(id).modify({ categoryId: null })
                // 删除分类
                await db.categories.delete(id)
            })

            // 事务成功后更新本地状态
            categories.value = categories.value.filter(c => c.id !== id)

            if (selectedCategoryId.value === id) {
                selectedCategoryId.value = null
            }

            // 通知文章 store 同步已加载文章状态，避免 category/article store 互相导入。
            notifyCategoryDeleted(id)

            logger.info('分类删除成功', { id })
        } catch (err) {
            const msg = err instanceof AppError ? err.toUserMessage() : '删除分类失败'
            error.value = err instanceof Error ? err.message : msg
            logger.error('删除分类失败', err, { id })
            throw new AppError(ErrorCode.DB_WRITE_FAILED, msg, { id })
        }
    }

    // 更新分类的文章数（不可变更新）
    async function updateArticleCount(categoryId: string, delta: number) {
        const index = categories.value.findIndex(c => c.id === categoryId)
        if (index === -1) return

        const category = categories.value[index]
        const newCount = category.articleCount + delta

        // 先持久化
        await categoryRepository.update(categoryId, { articleCount: newCount })

        // 成功后不可变更新本地状态
        categories.value = [
            ...categories.value.slice(0, index),
            { ...category, articleCount: newCount },
            ...categories.value.slice(index + 1)
        ]
    }

    // 初始化 Promise 锁（解决并发调用的竞态条件）
    let initPromise: Promise<void> | null = null

    // 初始化方法（延迟调用，避免 Store 定义时立即执行，支持幂等调用，并发安全）
    async function initialize() {
        // 如果已经在初始化中，返回现有的 Promise
        if (initPromise) {
            return initPromise
        }

        // 创建新的初始化 Promise
        initPromise = (async () => {
            try {
                await loadCategories()
            } catch (error) {
                // 初始化失败时重置，允许重试
                initPromise = null
                throw error
            }
        })()

        return initPromise
    }

    // 重置方法（支持热重载和测试场景）
    function reset() {
        initPromise = null
        categories.value = []
        selectedCategoryId.value = null
        loading.value = false
        error.value = null
        pendingCategoryNames.clear()
    }

    return {
        // State
        categories,
        selectedCategoryId,
        loading,
        error,

        // Getters
        totalArticleCount,
        selectedCategory,

        // Actions
        initialize,
        reset,
        loadCategories,
        selectCategory,
        addCategory,
        updateCategory,
        deleteCategory,
        updateArticleCount
    }
})

