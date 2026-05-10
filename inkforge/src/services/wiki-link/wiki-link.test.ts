import type { Table } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ARTICLE_STATUS } from '@/constants'
import type { Article } from '@/types'
import { db } from '@/utils/db'
import { useWikiLinkStore } from '@/stores/wikiLink'
import { renderInkforgeMarkdownExtensions } from '@/services/markdown-ext/render'
import { wikiLinkService } from './service'
import { extractWikiLinks, parseWikiLink, renderWikiLinkLabel } from './parser'
import { WikiLinkRepository } from './repository'
import { WikiLinkService, type WikiLinkArticleRepository } from './service'
import type { BacklinkRecord } from './types'

function createArticle(overrides: Partial<Article> = {}): Article {
  const now = new Date('2026-05-02T00:00:00.000Z')
  const rawContent = overrides.rawContent ?? ''
  return {
    id: overrides.id ?? 'article-1',
    categoryId: overrides.categoryId ?? null,
    sourceUrl: overrides.sourceUrl ?? 'local://article',
    sourceName: overrides.sourceName ?? 'Local',
    title: overrides.title ?? 'Article',
    description: overrides.description ?? '',
    authors: overrides.authors ?? [],
    publishedAt: overrides.publishedAt,
    rawContent,
    markdownSource: overrides.markdownSource ?? rawContent,
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

function createBacklinkRecord(overrides: Partial<BacklinkRecord> = {}): BacklinkRecord {
  const hasOverride = <K extends keyof BacklinkRecord>(key: K): boolean => Object.prototype.hasOwnProperty.call(overrides, key)
  return {
    id: overrides.id ?? 'source-1:link-1',
    indexVersion: 1,
    sourceArticleId: overrides.sourceArticleId ?? 'source-1',
    sourceTitle: overrides.sourceTitle ?? 'Source',
    targetArticleId: hasOverride('targetArticleId') ? overrides.targetArticleId ?? null : 'target-1',
    targetTitle: overrides.targetTitle ?? 'Target',
    anchor: hasOverride('anchor') ? overrides.anchor ?? null : null,
    alias: hasOverride('alias') ? overrides.alias ?? null : null,
    raw: overrides.raw ?? '[[Target]]',
    context: overrides.context ?? '[[Target]]',
    resolved: overrides.resolved ?? true,
    createdAt: overrides.createdAt ?? 1_775_000_000_000,
    updatedAt: overrides.updatedAt ?? 1_775_000_000_000,
  }
}

function createBacklinkTable(initial: BacklinkRecord[] = []) {
  const rows = new Map<string, BacklinkRecord>(initial.map(record => [record.id, record]))
  const table = {
    where: (index: keyof BacklinkRecord) => ({
      equals: (value: unknown) => ({
        delete: async () => {
          const ids = Array.from(rows.values())
            .filter(record => record[index] === value)
            .map(record => record.id)
          for (const id of ids) rows.delete(id)
          return ids.length
        },
        toArray: async () => Array.from(rows.values()).filter(record => record[index] === value),
      }),
    }),
    bulkPut: async (records: BacklinkRecord[]) => {
      for (const record of records) rows.set(record.id, record)
      return records.map(record => record.id)
    },
    clear: async () => {
      rows.clear()
    },
    bulkDelete: async (keys: readonly string[]) => {
      for (const key of keys) rows.delete(key)
    },
    toArray: async () => Array.from(rows.values()),
    count: async () => rows.size,
  }
  return { rows, table: table as unknown as Table<BacklinkRecord, string> }
}

function createArticleRepository(articles: Article[]): WikiLinkArticleRepository {
  return {
    findAllOrderedByDate: async () => articles,
    findById: async (id: string) => articles.find(article => article.id === id),
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('WikiLink parser', () => {
  it('parses plain, aliased, and anchored wiki links while rejecting invalid tokens', () => {
    expect(parseWikiLink('[[Alpha]]')).toEqual({ target: 'Alpha', anchor: null, alias: null, raw: '[[Alpha]]' })
    const anchored = parseWikiLink('[[Alpha#Intro|Read Intro]]')
    expect(anchored).toEqual({ target: 'Alpha', anchor: 'Intro', alias: 'Read Intro', raw: '[[Alpha#Intro|Read Intro]]' })
    expect(anchored ? renderWikiLinkLabel(anchored) : '').toBe('Read Intro')
    expect(parseWikiLink('[[]]')).toBeNull()
    expect(parseWikiLink('[[A [[B]]]]')).toBeNull()
  })

  it('extracts only real markdown body wiki links and preserves source positions', () => {
    const markdown = [
      'Intro [[Alpha]] and ![[Asset]]',
      '`[[Inline Code]]`',
      '```',
      '[[Fence Code]]',
      '```',
      'Next [[Beta#A|Go]]',
    ].join('\n')

    const links = extractWikiLinks(markdown)

    expect(links.map(link => link.raw)).toEqual(['[[Alpha]]', '[[Beta#A|Go]]'])
    expect(links[0]).toMatchObject({ target: 'Alpha', line: 1, column: 7 })
    expect(links[1]).toMatchObject({ target: 'Beta', anchor: 'A', alias: 'Go', line: 6 })
  })
})

describe('WikiLinkRepository', () => {
  it('replaces source backlinks, finds resolved and broken links, and cleans by article id', async () => {
    const { rows, table } = createBacklinkTable()
    const repository = new WikiLinkRepository(table)
    const resolved = createBacklinkRecord({ id: 'source-1:resolved', targetArticleId: 'target-1', targetTitle: 'Target', resolved: true, updatedAt: 20 })
    const broken = createBacklinkRecord({ id: 'source-1:broken', targetArticleId: null, targetTitle: 'Missing', resolved: false, raw: '[[Missing]]', updatedAt: 10 })

    await repository.replaceSourceBacklinks('source-1', [resolved, broken])

    expect(await repository.count()).toBe(2)
    expect((await repository.findBacklinks('target-1')).map(record => record.id)).toEqual(['source-1:resolved'])
    expect((await repository.findBrokenLinks()).map(record => record.id)).toEqual(['source-1:broken'])

    const deleted = await repository.deleteByArticle('target-1')

    expect(deleted).toBe(1)
    expect(Array.from(rows.keys())).toEqual(['source-1:broken'])
  })

  it('can rebuild the derived table from a complete record set', async () => {
    const { table } = createBacklinkTable([createBacklinkRecord({ id: 'old' })])
    const repository = new WikiLinkRepository(table)

    await repository.replaceAll([
      createBacklinkRecord({ id: 'new-1', updatedAt: 1 }),
      createBacklinkRecord({ id: 'new-2', sourceArticleId: 'source-2', targetArticleId: null, targetTitle: 'Missing', resolved: false, updatedAt: 2 }),
    ])

    expect(await repository.count()).toBe(2)
    expect((await repository.findOutgoingLinks('source-2')).map(record => record.id)).toEqual(['new-2'])
  })
})

describe('WikiLinkService', () => {
  it('indexes resolved and broken backlinks without rewriting article markdown', async () => {
    const { table } = createBacklinkTable()
    const backlinks = new WikiLinkRepository(table)
    const articles = [
      createArticle({ id: 'source', title: 'Source', rawContent: 'See [[Target]] and [[Missing|Later]]' }),
      createArticle({ id: 'target', title: 'Target', rawContent: 'Target body' }),
    ]
    const service = new WikiLinkService(backlinks, createArticleRepository(articles))

    const result = await service.rebuildArticleBacklinks('source')

    expect(result).toEqual({ sourceArticleId: 'source', indexed: 2, resolved: 1, broken: 1 })
    expect(articles[0].rawContent).toBe('See [[Target]] and [[Missing|Later]]')
    expect((await service.getBacklinks('target')).map(record => record.sourceArticleId)).toEqual(['source'])
    expect((await service.getBrokenLinks()).map(record => record.targetTitle)).toEqual(['Missing'])
  })

  it('rebuilds all backlinks to resolve newly created target articles and skips trashed articles', async () => {
    const { table } = createBacklinkTable()
    const backlinks = new WikiLinkRepository(table)
    const articles = [
      createArticle({ id: 'source', title: 'Source', rawContent: 'See [[Missing]] and [[Trash]]' }),
      createArticle({ id: 'trash', title: 'Trash', status: ARTICLE_STATUS.TRASHED }),
    ]
    const service = new WikiLinkService(backlinks, createArticleRepository(articles))

    await service.rebuildAllBacklinks()
    expect((await service.getBrokenLinks()).map(record => record.targetTitle)).toEqual(['Missing', 'Trash'])

    articles.push(createArticle({ id: 'missing', title: 'Missing' }))
    const result = await service.rebuildAllBacklinks()

    expect(result.indexedArticles).toBe(2)
    expect(result.resolved).toBe(1)
    expect(result.broken).toBe(1)
    expect((await service.getBacklinks('missing')).map(record => record.sourceArticleId)).toEqual(['source'])
  })

  it('searches real non-trashed articles using exact, prefix, inclusion, and subsequence ordering', async () => {
    const { table } = createBacklinkTable()
    const service = new WikiLinkService(new WikiLinkRepository(table), createArticleRepository([
      createArticle({ id: 'alpha-old', title: 'Alpha', updatedAt: new Date('2026-05-01T00:00:00.000Z') }),
      createArticle({ id: 'alpha-new', title: 'Alpha Plan', updatedAt: new Date('2026-05-02T00:00:00.000Z') }),
      createArticle({ id: 'beta', title: 'Beta Alpha' }),
      createArticle({ id: 'trashed', title: 'Alpha Trash', status: ARTICLE_STATUS.TRASHED }),
    ]))

    const result = await service.searchArticles('alpha')

    expect(result.map(article => article.id)).toEqual(['alpha-old', 'alpha-new', 'beta'])
  })
})

describe('useWikiLinkStore', () => {
  it('surfaces service-backed search, backlink, broken-link, and rebuild state', async () => {
    const store = useWikiLinkStore()
    const backlink = createBacklinkRecord({ id: 'source:target' })
    vi.spyOn(wikiLinkService, 'searchArticles').mockResolvedValue([{ id: 'target-1', title: 'Target', categoryId: null, status: ARTICLE_STATUS.DRAFT, updatedAt: new Date() }])
    vi.spyOn(wikiLinkService, 'getBacklinks').mockResolvedValue([backlink])
    vi.spyOn(wikiLinkService, 'getBrokenLinks').mockResolvedValue([createBacklinkRecord({ id: 'source:missing', targetArticleId: null, targetTitle: 'Missing', resolved: false })])
    vi.spyOn(wikiLinkService, 'rebuildAllBacklinks').mockResolvedValue({ indexedArticles: 2, indexedLinks: 2, resolved: 1, broken: 1 })

    await store.searchArticles('tar')
    await store.loadBacklinks('target-1')
    await store.loadBrokenLinks()
    const rebuild = await store.rebuildAll()

    expect(store.searchResults.map(article => article.title)).toEqual(['Target'])
    expect(store.backlinkCount).toBe(1)
    expect(store.brokenLinkCount).toBe(1)
    expect(rebuild.indexedLinks).toBe(2)
    expect(store.isLoading).toBe(false)
    expect(store.isIndexing).toBe(false)
    expect(store.error).toBeNull()
    expect(store.lastAction?.kind).toBe('rebuild-all')
  })
})

describe('WikiLink rendering and schema integration', () => {
  it('keeps the v17 backlink table available after later additive schema upgrades', () => {
    expect(db.verno).toBeGreaterThanOrEqual(17)
    expect(db.backlinks.name).toBe('backlinks')
    expect(db.backlinks.schema.idxByName.sourceArticleId).toBeDefined()
    expect(db.backlinks.schema.idxByName.targetArticleId).toBeDefined()
    expect(db.backlinks.schema.idxByName.targetTitle).toBeDefined()
  })

  it('renders wiki links in preview while preserving embeds and code spans as source markdown', async () => {
    const rendered = await renderInkforgeMarkdownExtensions('Link [[Alpha#Intro|read]] and ![[Asset]] and `[[Code]]`')

    expect(rendered).toContain('class="ink-wikilink ink-wikilink--unresolved"')
    expect(rendered).toContain('data-wikilink-target="Alpha"')
    expect(rendered).toContain('data-wikilink-anchor="Intro"')
    expect(rendered).toContain('>read</a>')
    expect(rendered).toContain('![[Asset]]')
    expect(rendered).not.toContain('data-wikilink-target="Asset"')
    expect(rendered).not.toContain('data-wikilink-target="Code"')
  })
})
