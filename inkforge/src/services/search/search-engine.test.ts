import { describe, expect, it } from 'vitest'
import type { Article } from '@/types'
import { ARTICLE_STATUS } from '@/constants'
import { parseSearchQuery } from './dsl'
import { SearchEngine } from './engine'
import { SearchHistoryRepository, createMemorySearchHistoryStorage } from './history'

function article(overrides: Partial<Article>): Article {
  const now = new Date('2026-05-02T00:00:00.000Z')
  return {
    id: overrides.id ?? crypto.randomUUID(),
    categoryId: overrides.categoryId ?? null,
    sourceUrl: overrides.sourceUrl ?? 'local://document',
    sourceName: overrides.sourceName ?? 'Local',
    title: overrides.title ?? 'Untitled',
    description: overrides.description ?? '',
    authors: overrides.authors ?? [],
    publishedAt: overrides.publishedAt,
    rawContent: overrides.rawContent ?? '',
    markdownSource: overrides.markdownSource ?? overrides.rawContent ?? '',
    htmlCache: overrides.htmlCache ?? null,
    sourceHash: overrides.sourceHash ?? '',
    cacheVersion: overrides.cacheVersion ?? 0,
    cacheGeneratedAt: overrides.cacheGeneratedAt ?? null,
    links: overrides.links ?? [],
    images: overrides.images ?? [],
    aiSummary: overrides.aiSummary,
    score: overrides.score ?? 0,
    tags: overrides.tags ?? [],
    status: overrides.status ?? ARTICLE_STATUS.DRAFT,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

describe('SearchEngine', () => {
  it('indexes real article fields and returns excerpts with highlights', () => {
    const engine = new SearchEngine()
    engine.rebuild([
      article({ id: 'doc-1', title: 'InkForge Search', rawContent: 'A local first markdown search engine with MiniSearch.', tags: ['search', 'local'] }),
      article({ id: 'doc-2', title: 'Theme Notes', rawContent: 'Typography and theme tuning.', tags: ['theme'] }),
    ])

    const response = engine.search({ query: 'markdown search', limit: 10 })

    expect(response.total).toBe(1)
    expect(response.results[0].id).toBe('doc-1')
    expect(response.results[0].excerpt.toLowerCase()).toContain('markdown')
    expect(response.results[0].highlights.length).toBeGreaterThan(0)
  })

  it('supports DSL filters, phrases, and archived exclusion', () => {
    const engine = new SearchEngine()
    engine.rebuild([
      article({ id: 'draft-1', title: 'Draft Search', rawContent: 'exact phrase target', tags: ['alpha'], status: ARTICLE_STATUS.DRAFT }),
      article({ id: 'published-1', title: 'Published Search', rawContent: 'exact phrase target', tags: ['beta'], status: ARTICLE_STATUS.PUBLISHED }),
      article({ id: 'archived-1', title: 'Archived Search', rawContent: 'exact phrase target', tags: ['alpha'], status: ARTICLE_STATUS.ARCHIVED }),
      article({ id: 'trashed-1', title: 'Trashed Search', rawContent: 'exact phrase target', tags: ['alpha'], status: ARTICLE_STATUS.TRASHED }),
    ])

    const response = engine.search({ query: '"exact phrase" tag:alpha status:draft' })
    const archived = engine.search({ query: '"exact phrase" tag:alpha', includeArchived: true, sort: 'title' })

    expect(response.results.map(result => result.id)).toEqual(['draft-1'])
    expect(archived.results.map(result => result.id)).toEqual(['archived-1', 'draft-1'])
    expect(engine.size).toBe(3)
  })

  it('supports CJK tokenization without server-side search', () => {
    const engine = new SearchEngine()
    engine.rebuild([
      article({ id: 'cn-1', title: '中文搜索', rawContent: '这是一个真实的本地全文搜索测试。', tags: ['中文'] }),
    ])

    expect(engine.search({ query: '全文' }).results[0].id).toBe('cn-1')
    expect(engine.search({ query: '中文' }).results[0].id).toBe('cn-1')
  })

  it('removes trashed documents from incremental indexing', () => {
    const engine = new SearchEngine()
    const base = article({ id: 'doc-1', title: 'Recoverable', rawContent: 'trash boundary' })
    engine.rebuild([base])

    engine.indexArticle({ ...base, status: ARTICLE_STATUS.TRASHED, deletedAt: new Date('2026-05-02T01:00:00.000Z') })

    expect(engine.size).toBe(0)
    expect(engine.search({ query: 'trash boundary', includeArchived: true, includeTrashed: true }).total).toBe(0)
  })

  it('updates and removes indexed documents incrementally', () => {
    const engine = new SearchEngine()
    const base = article({ id: 'doc-1', title: 'Before', rawContent: 'alpha' })
    engine.rebuild([base])

    engine.indexArticle({ ...base, title: 'After', rawContent: 'beta replacement', markdownSource: 'beta replacement' })
    expect(engine.search({ query: 'beta' }).results[0].id).toBe('doc-1')
    expect(engine.search({ query: 'alpha' }).total).toBe(0)

    engine.removeArticle('doc-1')
    expect(engine.search({ query: 'beta' }).total).toBe(0)
  })

  it('supports filter-only queries and word count comparisons', () => {
    const engine = new SearchEngine()
    engine.rebuild([
      article({ id: 'short', title: 'Short', rawContent: 'tiny note', tags: ['note'] }),
      article({ id: 'long', title: 'Long', rawContent: 'one two three four five six seven eight nine ten', tags: ['note'] }),
    ])

    const response = engine.search({ query: 'tag:note wordCount>5', sort: 'title' })
    expect(response.results.map(result => result.id)).toEqual(['long'])
  })
})

describe('parseSearchQuery', () => {
  it('parses terms, phrases, negation, boolean marker, and field filters', () => {
    const parsed = parseSearchQuery('alpha OR "exact phrase" -draft tag:legal wordCount>=100 status:published')

    expect(parsed.rootOp).toBe('OR')
    expect(parsed.terms).toContain('alpha')
    expect(parsed.phrases).toEqual(['exact phrase'])
    expect(parsed.excludeTerms).toEqual(['draft'])
    expect(parsed.filters).toEqual(expect.arrayContaining([
      { field: 'tags', operator: 'contains', value: 'legal' },
      { field: 'wordCount', operator: '>=', value: 100 },
      { field: 'status', operator: 'contains', value: 'published' },
    ]))
  })
})

describe('SearchHistoryRepository', () => {
  it('persists unique recent queries with a hard cap', () => {
    const storage = createMemorySearchHistoryStorage()
    const history = new SearchHistoryRepository(storage, 'test-history', 3)

    history.record('alpha', 1, '2026-05-02T00:00:00.000Z')
    history.record('beta', 2, '2026-05-02T00:00:01.000Z')
    history.record('alpha', 3, '2026-05-02T00:00:02.000Z')
    history.record('gamma', 4, '2026-05-02T00:00:03.000Z')
    history.record('delta', 5, '2026-05-02T00:00:04.000Z')

    expect(history.load().map(item => item.query)).toEqual(['delta', 'gamma', 'alpha'])
    expect(history.load()[2].resultCount).toBe(3)
  })
})

