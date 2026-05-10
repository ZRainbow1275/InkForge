import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ARTICLE_STATUS } from '@/constants'
import type { Article, EditedContent } from '@/types'
import { articleRepository } from '@/services/repository'
import { db } from '@/utils/db'
import { TrashRepository, TRASH_RETENTION_MS } from './index'

const articles = new Map<string, Article>()
const contents = new Map<string, EditedContent>()

function createArticle(overrides: Partial<Article> = {}): Article {
  const now = new Date('2026-05-02T00:00:00.000Z')
  return {
    id: overrides.id ?? 'article-1',
    categoryId: overrides.categoryId ?? null,
    sourceUrl: overrides.sourceUrl ?? 'local://article',
    sourceName: overrides.sourceName ?? 'Local',
    title: overrides.title ?? 'Trash candidate',
    description: overrides.description ?? 'Recoverable article',
    authors: overrides.authors ?? [],
    publishedAt: overrides.publishedAt,
    rawContent: overrides.rawContent ?? 'body',
    markdownSource: overrides.markdownSource ?? overrides.rawContent ?? 'body',
    htmlCache: overrides.htmlCache ?? null,
    sourceHash: overrides.sourceHash ?? 'hash',
    cacheVersion: overrides.cacheVersion ?? 1,
    cacheGeneratedAt: overrides.cacheGeneratedAt ?? null,
    links: overrides.links ?? [],
    images: overrides.images ?? [],
    aiSummary: overrides.aiSummary,
    score: overrides.score ?? 0,
    tags: overrides.tags ?? [],
    status: overrides.status ?? ARTICLE_STATUS.DRAFT,
    deletedAt: overrides.deletedAt,
    expiresAt: overrides.expiresAt,
    deletedBy: overrides.deletedBy,
    preTrashStatus: overrides.preTrashStatus,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

function createContent(overrides: Partial<EditedContent> = {}): EditedContent {
  const now = new Date('2026-05-02T00:00:00.000Z')
  return {
    id: overrides.id ?? 'content-1',
    articleId: overrides.articleId ?? 'article-1',
    title: overrides.title ?? 'Trash candidate',
    body: overrides.body ?? '<p>body</p>',
    transcript: overrides.transcript ?? 'body',
    selectedLinks: overrides.selectedLinks ?? [],
    selectedImages: overrides.selectedImages ?? [],
    versions: overrides.versions ?? [{ id: 'version-1', label: 'Initial', title: 'Trash candidate', body: '<p>body</p>', transcript: 'body', createdAt: now }],
    currentVersionId: overrides.currentVersionId ?? 'version-1',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

function articleRowsByIndex(index: string, value: unknown): Article[] {
  return Array.from(articles.values()).filter(article => article[index as keyof Article] === value)
}

function contentRowsByIndex(index: string, value: unknown): EditedContent[] {
  return Array.from(contents.values()).filter(content => content[index as keyof EditedContent] === value)
}

beforeEach(() => {
  articles.clear()
  contents.clear()

  vi.spyOn(db, 'transaction').mockImplementation((async (...args: unknown[]) => {
    const scope = args[args.length - 1]
    if (typeof scope !== 'function') throw new Error('Missing transaction scope')
    return await scope()
  }) as never)

  vi.spyOn(db.articles, 'get').mockImplementation((async (key: string) => articles.get(String(key))) as never)
  vi.spyOn(db.articles, 'update').mockImplementation((async (key: string, changes: Partial<Article>) => {
    const current = articles.get(String(key))
    if (!current) return 0
    articles.set(current.id, { ...current, ...changes })
    return 1
  }) as never)
  vi.spyOn(db.articles, 'delete').mockImplementation((async (key: string) => {
    articles.delete(String(key))
  }) as never)
  vi.spyOn(db.articles, 'toArray').mockImplementation((async () => Array.from(articles.values())) as never)
  vi.spyOn(db.articles, 'where').mockImplementation(((index: string) => ({
    equals: (value: unknown) => ({
      toArray: async () => articleRowsByIndex(index, value),
    }),
  })) as never)
  vi.spyOn(db.articles, 'orderBy').mockImplementation(((index: string) => ({
    reverse: () => ({
      toArray: async () => Array.from(articles.values()).sort((a, b) => {
        const left = a[index as keyof Article]
        const right = b[index as keyof Article]
        return new Date(right as Date).getTime() - new Date(left as Date).getTime()
      }),
    }),
  })) as never)

  vi.spyOn(db.contents, 'where').mockImplementation(((index: string) => ({
    equals: (value: unknown) => ({
      delete: async () => {
        const rows = contentRowsByIndex(index, value)
        for (const row of rows) contents.delete(row.id)
        return rows.length
      },
    }),
  })) as never)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TrashRepository', () => {
  it('moves an article to trash with retention metadata and hides it from normal article lists', async () => {
    const now = new Date('2026-05-02T08:00:00.000Z')
    articles.set('article-1', createArticle({ id: 'article-1', status: ARTICLE_STATUS.PUBLISHED, categoryId: 'category-1' }))
    articles.set('article-2', createArticle({ id: 'article-2', status: ARTICLE_STATUS.DRAFT, title: 'Visible article' }))

    const repository = new TrashRepository()
    const trashed = await repository.moveToTrash('article-1', { actorId: 'profile-1', now })
    const normalArticles = await articleRepository.findAllOrderedByDate()
    const allArticles = await articleRepository.findAllIncludingTrashedOrderedByDate()

    expect(trashed.status).toBe(ARTICLE_STATUS.TRASHED)
    expect(trashed.deletedAt).toEqual(now)
    expect(trashed.expiresAt).toEqual(new Date(now.getTime() + TRASH_RETENTION_MS))
    expect(trashed.deletedBy).toBe('profile-1')
    expect(trashed.preTrashStatus).toBe(ARTICLE_STATUS.PUBLISHED)
    expect(articles.get('article-1')?.status).toBe(ARTICLE_STATUS.TRASHED)
    expect(normalArticles.map(article => article.id)).toEqual(['article-2'])
    expect(allArticles.map(article => article.id)).toEqual(['article-1', 'article-2'])
  })

  it('restores only trashed articles to draft and clears soft-delete metadata', async () => {
    const deletedAt = new Date('2026-05-01T00:00:00.000Z')
    articles.set('article-1', createArticle({
      id: 'article-1',
      status: ARTICLE_STATUS.TRASHED,
      deletedAt,
      expiresAt: new Date(deletedAt.getTime() + TRASH_RETENTION_MS),
      deletedBy: 'profile-1',
      preTrashStatus: ARTICLE_STATUS.PUBLISHED,
    }))

    const repository = new TrashRepository()
    const restored = await repository.restore('article-1', { now: new Date('2026-05-02T00:00:00.000Z') })

    expect(restored.status).toBe(ARTICLE_STATUS.DRAFT)
    expect(restored.deletedAt).toBeNull()
    expect(restored.expiresAt).toBeNull()
    expect(restored.deletedBy).toBeNull()
    expect(restored.preTrashStatus).toBeNull()
    expect(articles.get('article-1')?.status).toBe(ARTICLE_STATUS.DRAFT)
  })

  it('rejects permanent purge for non-trashed articles', async () => {
    articles.set('article-1', createArticle({ id: 'article-1', status: ARTICLE_STATUS.DRAFT }))
    contents.set('content-1', createContent({ id: 'content-1', articleId: 'article-1' }))

    const repository = new TrashRepository()

    await expect(repository.purge('article-1')).rejects.toThrow('Only trashed articles can be permanently purged')
    expect(articles.has('article-1')).toBe(true)
    expect(contents.has('content-1')).toBe(true)
  })

  it('purges an article and its edited content irreversibly', async () => {
    articles.set('article-1', createArticle({ id: 'article-1', status: ARTICLE_STATUS.TRASHED }))
    contents.set('content-1', createContent({ id: 'content-1', articleId: 'article-1' }))

    const repository = new TrashRepository()
    const result = await repository.purge('article-1')

    expect(result).toEqual({ articleId: 'article-1', contentDeleted: 1 })
    expect(articles.has('article-1')).toBe(false)
    expect(contents.has('content-1')).toBe(false)
  })

  it('purges only expired trash rows and keeps future-retained rows', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z')
    articles.set('expired', createArticle({ id: 'expired', status: ARTICLE_STATUS.TRASHED, expiresAt: new Date(now.getTime() - 1) }))
    articles.set('future', createArticle({ id: 'future', status: ARTICLE_STATUS.TRASHED, expiresAt: new Date(now.getTime() + TRASH_RETENTION_MS) }))
    contents.set('expired-content', createContent({ id: 'expired-content', articleId: 'expired' }))
    contents.set('future-content', createContent({ id: 'future-content', articleId: 'future' }))

    const repository = new TrashRepository()
    const result = await repository.purgeExpired({ now })

    expect(result.purgedIds).toEqual(['expired'])
    expect(result.contentDeleted).toBe(1)
    expect(articles.has('expired')).toBe(false)
    expect(articles.has('future')).toBe(true)
    expect(contents.has('expired-content')).toBe(false)
    expect(contents.has('future-content')).toBe(true)
  })

  it('lists trash with expired count and storage estimate from persisted rows', async () => {
    const now = Date.now()
    articles.set('expired', createArticle({ id: 'expired', status: ARTICLE_STATUS.TRASHED, rawContent: 'expired body', expiresAt: new Date(now - 1) }))
    articles.set('future', createArticle({ id: 'future', status: ARTICLE_STATUS.TRASHED, rawContent: 'future body', expiresAt: new Date(now + TRASH_RETENTION_MS) }))

    const repository = new TrashRepository()
    const result = await repository.list()

    expect(result.items.map(item => item.id)).toEqual(['expired', 'future'])
    expect(result.summary.totalCount).toBe(2)
    expect(result.summary.expiredCount).toBe(1)
    expect(result.summary.storageBytes).toBeGreaterThan(0)
    expect(result.summary.nextExpiryAt).toEqual(new Date(now + TRASH_RETENTION_MS))
  })
})
