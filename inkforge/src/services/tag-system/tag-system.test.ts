import type { Table } from 'dexie'
import { describe, expect, it } from 'vitest'
import { ARTICLE_STATUS } from '@/constants'
import type { Article } from '@/types'
import { db } from '@/utils/db'
import {
  TAGS_PER_DOCUMENT_LIMIT,
  TagColorSchema,
  computeTagCloudNodes,
  type DocTagRecord,
  type TagRecord,
} from './types'
import { TagRepository } from './repository'

function createMemoryTable<T extends { id: string }>(initial: T[] = []) {
  const rows = new Map<string, T>(initial.map(row => [row.id, row]))
  const table = {
    toArray: async () => Array.from(rows.values()),
    get: async (id: string) => rows.get(String(id)),
    put: async (record: T) => {
      rows.set(record.id, record)
      return record.id
    },
    delete: async (id: string) => {
      rows.delete(String(id))
    },
    count: async () => rows.size,
  }
  return { rows, table: table as unknown as Table<T, string> }
}

function createArticle(overrides: Partial<Article> = {}): Article {
  const now = new Date('2026-05-02T00:00:00.000Z')
  return {
    id: overrides.id ?? 'doc-1',
    categoryId: overrides.categoryId ?? null,
    sourceUrl: overrides.sourceUrl ?? 'local://tag-system',
    sourceName: overrides.sourceName ?? 'Local',
    title: overrides.title ?? 'Tagged document',
    description: overrides.description ?? '',
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

function createRepository(initialArticles: Article[] = [createArticle()]) {
  const tags = createMemoryTable<TagRecord>()
  const docTags = createMemoryTable<DocTagRecord>()
  const articles = createMemoryTable<Article>(initialArticles)
  const repository = new TagRepository({ tags: tags.table, docTags: docTags.table, articles: articles.table }, async scope => await scope())
  return { repository, tags, docTags, articles }
}

async function createTag(repository: TagRepository, name: string, color = '#2563eb'): Promise<TagRecord> {
  return await repository.createTag({ name, color, accountId: 'account-1' })
}

describe('TagRepository validation and CRUD', () => {
  it('rejects empty, whitespace, overlong, duplicate, and invalid color tag input', async () => {
    const { repository } = createRepository()

    await expect(repository.createTag({ name: '', color: '#2563eb', accountId: 'account-1' })).rejects.toThrow()
    await expect(repository.createTag({ name: 'has space', color: '#2563eb', accountId: 'account-1' })).rejects.toThrow()
    await expect(repository.createTag({ name: 'x'.repeat(51), color: '#2563eb', accountId: 'account-1' })).rejects.toThrow()
    await expect(repository.createTag({ name: 'valid', color: '#GGGGGG', accountId: 'account-1' })).rejects.toThrow()

    await createTag(repository, 'Research')
    await expect(repository.createTag({ name: 'research', color: '#2563eb', accountId: 'account-1' })).rejects.toMatchObject({ code: 'TAG_NAME_CONFLICT' })
    await expect(repository.updateTag((await repository.findByName('Research', 'account-1'))?.id ?? '', { color: '#GGGGGG' })).rejects.toThrow()
  })

  it('validates HEX colors through the runtime schema', () => {
    expect(TagColorSchema.safeParse('#3b82f6').success).toBe(true)
    expect(TagColorSchema.safeParse('#GGGGGG').success).toBe(false)
  })

  it('updates and deletes tags while keeping document mirrors real', async () => {
    const { repository, articles } = createRepository()
    const tag = await createTag(repository, 'Draft')
    await repository.addTagToDoc('doc-1', tag.id)

    const updated = await repository.updateTag(tag.id, { name: 'Ready', color: '#15803d' })
    expect(updated.name).toBe('Ready')
    expect(articles.rows.get('doc-1')?.tags).toEqual(['Ready'])

    await repository.deleteTag(tag.id)
    expect(await repository.getDocTags('doc-1')).toEqual([])
    expect(articles.rows.get('doc-1')?.tags).toEqual([])
  })
})

describe('TagRepository document relations', () => {
  it('adds document relations idempotently and mirrors Article.tags', async () => {
    const { repository, docTags, articles } = createRepository()
    const tag = await createTag(repository, 'Local')

    await repository.addTagToDoc('doc-1', tag.id)
    await repository.addTagToDoc('doc-1', tag.id)

    expect(docTags.rows.size).toBe(1)
    expect((await repository.getTag(tag.id))?.docCount).toBe(1)
    expect(articles.rows.get('doc-1')?.tags).toEqual(['Local'])
  })

  it('rejects the 21st tag for one document', async () => {
    const { repository } = createRepository()
    const tags = []
    for (let index = 0; index < TAGS_PER_DOCUMENT_LIMIT + 1; index += 1) {
      tags.push(await createTag(repository, `tag-${index}`))
    }
    for (const tag of tags.slice(0, TAGS_PER_DOCUMENT_LIMIT)) {
      await repository.addTagToDoc('doc-1', tag.id)
    }

    await expect(repository.addTagToDoc('doc-1', tags[TAGS_PER_DOCUMENT_LIMIT].id)).rejects.toMatchObject({ code: 'TAG_LIMIT_EXCEEDED' })
  })

  it('removes relations and never decrements docCount below zero', async () => {
    const { repository } = createRepository()
    const tag = await createTag(repository, 'Review')
    await repository.addTagToDoc('doc-1', tag.id)
    await repository.removeTagFromDoc('doc-1', tag.id)
    await repository.removeTagFromDoc('doc-1', tag.id)

    expect((await repository.getTag(tag.id))?.docCount).toBe(0)
    expect(await repository.getDocTags('doc-1')).toEqual([])
  })

  it('filters by AND and OR tag logic', async () => {
    const { repository } = createRepository([
      createArticle({ id: 'doc-1', title: 'Both' }),
      createArticle({ id: 'doc-2', title: 'Alpha only' }),
      createArticle({ id: 'doc-3', title: 'None' }),
    ])
    const alpha = await createTag(repository, 'alpha')
    const beta = await createTag(repository, 'beta')
    await repository.addTagToDoc('doc-1', alpha.id)
    await repository.addTagToDoc('doc-1', beta.id)
    await repository.addTagToDoc('doc-2', alpha.id)

    await expect(repository.filterDocsByTags([alpha.id, beta.id], 'AND')).resolves.toEqual(['doc-1'])
    await expect(repository.filterDocsByTags([alpha.id, beta.id], 'OR')).resolves.toEqual(['doc-1', 'doc-2'])
  })
})

describe('TagRepository merge, cleanup, backfill, and counts', () => {
  it('merges source tags into target without duplicate document relations', async () => {
    const { repository, docTags, tags, articles } = createRepository([
      createArticle({ id: 'doc-1', title: 'Duplicate relation' }),
      createArticle({ id: 'doc-2', title: 'Source only' }),
    ])
    const target = await createTag(repository, 'target')
    const source = await createTag(repository, 'source')
    await repository.addTagToDoc('doc-1', target.id)
    await repository.addTagToDoc('doc-1', source.id)
    await repository.addTagToDoc('doc-2', source.id)

    await repository.mergeTags({ targetId: target.id, sourceIds: [source.id] })

    expect(tags.rows.has(source.id)).toBe(false)
    expect((await repository.getTag(target.id))?.docCount).toBe(2)
    expect(Array.from(docTags.rows.values()).filter(row => row.docId === 'doc-1' && row.tagId === target.id)).toHaveLength(1)
    expect(articles.rows.get('doc-1')?.tags).toEqual(['target'])
    expect(articles.rows.get('doc-2')?.tags).toEqual(['target'])
  })

  it('cleans only zero-count orphan tags and keeps tags with documents', async () => {
    const { repository, tags } = createRepository()
    const empty = await createTag(repository, 'empty')
    const used = await createTag(repository, 'used')
    await repository.addTagToDoc('doc-1', used.id)

    await expect(repository.cleanupOrphans('account-1')).resolves.toBe(1)
    expect(tags.rows.has(empty.id)).toBe(false)
    expect(tags.rows.has(used.id)).toBe(true)
  })

  it('recalculates stale docCount fields from real relations', async () => {
    const { repository, tags } = createRepository()
    const tag = await createTag(repository, 'counted')
    await repository.addTagToDoc('doc-1', tag.id)
    tags.rows.set(tag.id, { ...(tags.rows.get(tag.id) as TagRecord), docCount: 99 })

    await expect(repository.recalculateDocCount(tag.id)).resolves.toBe(1)
    expect(tags.rows.get(tag.id)?.docCount).toBe(1)
  })

  it('backfills only existing Article.tags user data without sample rows', async () => {
    const { repository } = createRepository([
      createArticle({ id: 'doc-1', tags: ['legacy', 'legacy', 'guide'] }),
      createArticle({ id: 'doc-2', tags: ['legacy'] }),
    ])

    await expect(repository.backfillFromArticleTags('account-1')).resolves.toEqual({ created: 2, relations: 3 })
    expect((await repository.findByName('legacy', 'account-1'))?.docCount).toBe(2)
    expect(await repository.filterDocsByTags([(await repository.findByName('guide', 'account-1'))?.id ?? ''], 'OR')).toEqual(['doc-1'])
  })

  it('computes cloud weights for max/min and single-tag boundaries', async () => {
    const { repository } = createRepository()
    const one = await createTag(repository, 'one')
    const many = await createTag(repository, 'many')
    await repository.addTagToDoc('doc-1', one.id)
    await repository.addTagToDoc('doc-1', many.id)
    await repository.addTagToDoc('doc-2', many.id)

    const nodes = computeTagCloudNodes(await repository.listTags('account-1'))
    expect(nodes.find(node => node.tag.id === many.id)?.weight).toBe(1)
    expect(nodes.find(node => node.tag.id === one.id)?.weight).toBe(0)
    expect(computeTagCloudNodes([one])[0].weight).toBe(0.5)
  })
})

describe('Tag Dexie schema integration', () => {
  it('keeps v20 updater table additive with tag, snippet, and backlink tables intact', () => {
    expect(db.verno).toBe(20)
    expect(db.tags.name).toBe('tags')
    expect(db.docTags.name).toBe('docTags')
    expect(db.tags.schema.idxByName.accountId).toBeDefined()
    expect(db.tags.schema.idxByName.normalizedName).toBeDefined()
    expect(db.tags.schema.idxByName['[accountId+normalizedName]']).toBeDefined()
    expect(db.docTags.schema.idxByName.docId).toBeDefined()
    expect(db.docTags.schema.idxByName.tagId).toBeDefined()
    expect(db.docTags.schema.idxByName['[docId+tagId]']).toBeDefined()
    expect(db.snippets.name).toBe('snippets')
    expect(db.backlinks.name).toBe('backlinks')
    expect(db.updaterSkipped.name).toBe('updaterSkipped')
    expect(db.updaterSkipped.schema.primKey.name).toBe('version')
    expect(db.updaterSkipped.schema.idxByName.skippedAt).toBeDefined()
  })
})
