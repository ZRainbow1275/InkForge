import { ARTICLE_STATUS } from '@/constants'
import type { Article } from '@/types'
import { db } from '@/utils/db'
import { AppError, ErrorCode, logger } from '@/services/error'
import { articleRepository } from '@/services/repository'
import {
  DEFAULT_TRASH_ACTOR_ID,
  TRASH_RETENTION_MS,
  type TrashBulkPurgeResult,
  type TrashListResult,
  type TrashMutationOptions,
  type TrashPurgeResult,
  type TrashSummary,
} from './types'

function resolveNow(input?: Date | number): Date {
  if (input instanceof Date) return new Date(input.getTime())
  if (typeof input === 'number') return new Date(input)
  return new Date()
}

function addRetention(now: Date): Date {
  return new Date(now.getTime() + TRASH_RETENTION_MS)
}

function dateMs(value: Date | string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  const ms = date.getTime()
  return Number.isNaN(ms) ? null : ms
}

function stringBytes(value: string | null | undefined): number {
  if (!value) return 0
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).byteLength
  }
  return value.length
}

function estimateArticleBytes(article: Article): number {
  return stringBytes(article.title)
    + stringBytes(article.description)
    + stringBytes(article.rawContent)
    + stringBytes(article.markdownSource)
    + stringBytes(article.htmlCache ?? '')
    + stringBytes(article.aiSummary ?? '')
    + stringBytes(JSON.stringify(article.tags))
}

export class TrashRepository {
  async list(): Promise<TrashListResult> {
    const items = await articleRepository.findTrashedOrderedByDeletedAt()
    return {
      items,
      summary: this.summarizeItems(items),
    }
  }

  async moveToTrash(articleId: string, options: TrashMutationOptions = {}): Promise<Article> {
    try {
      const article = await db.articles.get(articleId)
      if (!article) {
        throw new AppError(ErrorCode.DB_NOT_FOUND, 'Article not found for trash move', { articleId })
      }

      const now = resolveNow(options.now)
      const actorId = options.actorId ?? article.deletedBy ?? DEFAULT_TRASH_ACTOR_ID
      const currentDeletedAt = article.deletedAt ?? now
      const currentExpiresAt = article.expiresAt ?? addRetention(currentDeletedAt)
      const updates: Partial<Article> = article.status === ARTICLE_STATUS.TRASHED
        ? {
          deletedAt: currentDeletedAt,
          expiresAt: currentExpiresAt,
          deletedBy: actorId,
          preTrashStatus: article.preTrashStatus ?? ARTICLE_STATUS.DRAFT,
          updatedAt: now,
        }
        : {
          status: ARTICLE_STATUS.TRASHED,
          deletedAt: now,
          expiresAt: addRetention(now),
          deletedBy: actorId,
          preTrashStatus: article.status,
          updatedAt: now,
        }

      await db.articles.update(articleId, updates)
      return { ...article, ...updates }
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Move article to trash failed', error, { articleId })
      throw new AppError(ErrorCode.DB_WRITE_FAILED, 'Move article to trash failed', { articleId })
    }
  }

  async restore(articleId: string, options: TrashMutationOptions = {}): Promise<Article> {
    try {
      const article = await db.articles.get(articleId)
      if (!article) {
        throw new AppError(ErrorCode.DB_NOT_FOUND, 'Article not found for trash restore', { articleId })
      }
      if (article.status !== ARTICLE_STATUS.TRASHED) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Only trashed articles can be restored', { articleId, status: article.status })
      }

      const now = resolveNow(options.now)
      const updates: Partial<Article> = {
        status: ARTICLE_STATUS.DRAFT,
        deletedAt: null,
        expiresAt: null,
        deletedBy: null,
        preTrashStatus: null,
        updatedAt: now,
      }
      await db.articles.update(articleId, updates)
      return { ...article, ...updates }
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Restore trash article failed', error, { articleId })
      throw new AppError(ErrorCode.DB_WRITE_FAILED, 'Restore trash article failed', { articleId })
    }
  }

  async purge(articleId: string): Promise<TrashPurgeResult> {
    try {
      return await db.transaction('rw', db.articles, db.contents, async () => {
        const article = await db.articles.get(articleId)
        if (!article) {
          throw new AppError(ErrorCode.DB_NOT_FOUND, 'Article not found for permanent purge', { articleId })
        }
        if (article.status !== ARTICLE_STATUS.TRASHED) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, 'Only trashed articles can be permanently purged', { articleId, status: article.status })
        }
        const contentDeleted = await db.contents.where('articleId').equals(articleId).delete()
        await db.articles.delete(articleId)
        return { articleId, contentDeleted }
      })
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Purge trash article failed', error, { articleId })
      throw new AppError(ErrorCode.DB_WRITE_FAILED, 'Purge trash article failed', { articleId })
    }
  }

  async empty(): Promise<TrashBulkPurgeResult> {
    return this.purgeArticles(await articleRepository.findTrashedOrderedByDeletedAt())
  }

  async purgeExpired(options: Pick<TrashMutationOptions, 'now'> = {}): Promise<TrashBulkPurgeResult> {
    const nowMs = resolveNow(options.now).getTime()
    const trashed = await articleRepository.findTrashedOrderedByDeletedAt()
    const expired = trashed.filter(article => {
      const expiresAt = dateMs(article.expiresAt)
      return expiresAt !== null && expiresAt <= nowMs
    })
    return this.purgeArticles(expired)
  }

  async summarize(): Promise<TrashSummary> {
    const { items } = await this.list()
    return this.summarizeItems(items)
  }

  private summarizeItems(items: Article[], now = Date.now()): TrashSummary {
    let expiredCount = 0
    let storageBytes = 0
    let nextExpiryMs: number | null = null

    for (const item of items) {
      storageBytes += estimateArticleBytes(item)
      const expiresAt = dateMs(item.expiresAt)
      if (expiresAt === null) continue
      if (expiresAt <= now) {
        expiredCount += 1
      } else if (nextExpiryMs === null || expiresAt < nextExpiryMs) {
        nextExpiryMs = expiresAt
      }
    }

    return {
      totalCount: items.length,
      expiredCount,
      storageBytes,
      nextExpiryAt: nextExpiryMs === null ? null : new Date(nextExpiryMs),
    }
  }

  private async purgeArticles(items: Article[]): Promise<TrashBulkPurgeResult> {
    const purgedIds: string[] = []
    let contentDeleted = 0

    await db.transaction('rw', db.articles, db.contents, async () => {
      for (const item of items) {
        contentDeleted += await db.contents.where('articleId').equals(item.id).delete()
        await db.articles.delete(item.id)
        purgedIds.push(item.id)
      }
    })

    return { purgedIds, contentDeleted }
  }
}

export const trashRepository = new TrashRepository()
