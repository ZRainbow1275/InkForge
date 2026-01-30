/**
 * Repository 抽象层
 * 提供数据访问的统一接口，解耦 Store 与具体存储实现
 *
 * 安全特性：
 * - 自动加密敏感字段（rawContent, aiSummary, body, transcript）
 * - 读取时自动解密
 * - 可通过 ENABLE_ENCRYPTION 配置开关
 */

import { db } from '@/utils/db'
import type { Category, Article, EditedContent } from '@/types'
import { logger, ErrorCode, AppError } from './error'
import {
    ENABLE_ENCRYPTION,
    encryptSensitiveFields,
    decryptSensitiveFields,
    decryptSensitiveFieldsBatch
} from '@/utils/crypto'

/**
 * 分页选项
 */
export interface PaginationOptions {
    page: number      // 从 1 开始
    pageSize: number  // 每页数量
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
    items: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

/**
 * 通用 Repository 接口
 */
export interface IRepository<T, ID = string> {
    findAll(): Promise<T[]>
    findById(id: ID): Promise<T | undefined>
    create(entity: T): Promise<void>
    update(id: ID, updates: Partial<T>): Promise<void>
    delete(id: ID): Promise<void>
}

/**
 * 基础 Repository 实现
 * 支持敏感字段自动加密/解密
 */
abstract class BaseRepository<T extends Record<string, unknown>> implements IRepository<T> {
    protected abstract readonly tableName: string
    protected abstract get table(): import('dexie').Table<T>

    /** 是否包含敏感字段（子类可重写） */
    protected readonly hasSensitiveFields: boolean = false

    async findAll(): Promise<T[]> {
        try {
            const items = await this.table.toArray()
            // 解密敏感字段
            if (this.hasSensitiveFields && ENABLE_ENCRYPTION) {
                return await decryptSensitiveFieldsBatch(items)
            }
            return items
        } catch (error) {
            logger.error(`${this.tableName} findAll failed`, error)
            throw new AppError(ErrorCode.DB_READ_FAILED, `读取${this.tableName}失败`)
        }
    }

    async findById(id: string): Promise<T | undefined> {
        try {
            const item = await this.table.get(id)
            // 解密敏感字段
            if (item && this.hasSensitiveFields && ENABLE_ENCRYPTION) {
                return await decryptSensitiveFields(item)
            }
            return item
        } catch (error) {
            logger.error(`${this.tableName} findById failed`, error, { id })
            throw new AppError(ErrorCode.DB_READ_FAILED, `读取${this.tableName}失败`, { id })
        }
    }

    async create(entity: T): Promise<void> {
        try {
            // 加密敏感字段
            const toStore = this.hasSensitiveFields && ENABLE_ENCRYPTION
                ? await encryptSensitiveFields(entity)
                : entity
            await this.table.add(toStore)
        } catch (error) {
            logger.error(`${this.tableName} create failed`, error)
            throw new AppError(ErrorCode.DB_WRITE_FAILED, `创建${this.tableName}失败`)
        }
    }

    async update(id: string, updates: Partial<T>): Promise<void> {
        try {
            // 过滤掉 undefined 值，保持类型安全
            const entries = Object.entries(updates).filter(
                (entry): entry is [string, NonNullable<typeof entry[1]>] => entry[1] !== undefined
            )
            const cleanUpdates: Record<string, unknown> = Object.fromEntries(entries)

            // 加密敏感字段
            const toStore = this.hasSensitiveFields && ENABLE_ENCRYPTION
                ? await encryptSensitiveFields(cleanUpdates)
                : cleanUpdates

            // Dexie 的 update 方法接受 Partial<T>，这里的类型转换是安全的
            // 因为 cleanUpdates 来自 Partial<T> 并且只移除了 undefined 值
            await this.table.update(id, toStore as Partial<T>)
        } catch (error) {
            logger.error(`${this.tableName} update failed`, error, { id })
            throw new AppError(ErrorCode.DB_WRITE_FAILED, `更新${this.tableName}失败`, { id })
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await this.table.delete(id)
        } catch (error) {
            logger.error(`${this.tableName} delete failed`, error, { id })
            throw new AppError(ErrorCode.DB_WRITE_FAILED, `删除${this.tableName}失败`, { id })
        }
    }
}

/**
 * 分类 Repository
 */
class CategoryRepositoryImpl extends BaseRepository<Category> {
    protected readonly tableName = 'categories'
    protected get table() { return db.categories }

    async findAllOrdered(): Promise<Category[]> {
        try {
            return await db.categories.orderBy('createdAt').toArray()
        } catch (error) {
            logger.error('分类查询失败', error)
            throw new AppError(ErrorCode.DB_READ_FAILED, '读取分类失败')
        }
    }
}

/**
 * 资讯 Repository
 * 包含敏感字段：rawContent, aiSummary
 */
class ArticleRepositoryImpl extends BaseRepository<Article> {
    protected readonly tableName = 'articles'
    protected readonly hasSensitiveFields = true
    protected get table() { return db.articles }

    async findAllOrderedByDate(): Promise<Article[]> {
        try {
            const items = await db.articles.orderBy('createdAt').reverse().toArray()
            // 解密敏感字段
            if (this.hasSensitiveFields && ENABLE_ENCRYPTION) {
                return await decryptSensitiveFieldsBatch(items)
            }
            return items
        } catch (error) {
            logger.error('资讯按日期查询失败', error)
            throw new AppError(ErrorCode.DB_READ_FAILED, '读取资讯失败')
        }
    }

    /**
     * 分页查询文章，按创建时间倒序
     */
    async findPaginated(options: PaginationOptions): Promise<PaginatedResult<Article>> {
        try {
            const { page, pageSize } = options
            const offset = (page - 1) * pageSize

            const total = await db.articles.count()
            const items = await db.articles
                .orderBy('createdAt')
                .reverse()
                .offset(offset)
                .limit(pageSize)
                .toArray()

            // 解密敏感字段
            const decryptedItems = this.hasSensitiveFields && ENABLE_ENCRYPTION
                ? await decryptSensitiveFieldsBatch(items)
                : items

            return {
                items: decryptedItems,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        } catch (error) {
            logger.error('资讯分页查询失败', error, options)
            throw new AppError(ErrorCode.DB_READ_FAILED, '分页读取资讯失败')
        }
    }

    async findByCategoryId(categoryId: string): Promise<Article[]> {
        try {
            return await db.articles.where('categoryId').equals(categoryId).toArray()
        } catch (error) {
            logger.error('按分类查询资讯失败', error, { categoryId })
            throw new AppError(ErrorCode.DB_READ_FAILED, '读取分类资讯失败', { categoryId })
        }
    }

    async updateCategoryIdBulk(oldCategoryId: string, newCategoryId: string | null): Promise<number> {
        try {
            return await db.articles
                .where('categoryId')
                .equals(oldCategoryId)
                .modify({ categoryId: newCategoryId })
        } catch (error) {
            logger.error('批量更新资讯分类失败', error, { oldCategoryId, newCategoryId })
            throw new AppError(ErrorCode.DB_WRITE_FAILED, '批量更新资讯分类失败')
        }
    }
}

/**
 * 编辑内容 Repository
 * 包含敏感字段：body, transcript
 */
class ContentRepositoryImpl extends BaseRepository<EditedContent> {
    protected readonly tableName = 'contents'
    protected readonly hasSensitiveFields = true
    protected get table() { return db.contents }

    async findByArticleId(articleId: string): Promise<EditedContent | undefined> {
        try {
            return await db.contents.where('articleId').equals(articleId).first()
        } catch (error) {
            logger.error('查询编辑内容失败', error, { articleId })
            throw new AppError(ErrorCode.DB_READ_FAILED, '读取编辑内容失败', { articleId })
        }
    }
}

/**
 * 单例 Repository 实例
 */
export const categoryRepository = new CategoryRepositoryImpl()
export const articleRepository = new ArticleRepositoryImpl()
export const contentRepository = new ContentRepositoryImpl()
