import MiniSearch, { type SearchResult as MiniSearchRawResult } from 'minisearch'
import type { Article, ArticleStatus } from '@/types'
import { ARTICLE_STATUS } from '@/constants'
import { parseSearchQuery } from './dsl'
import { countSearchWords, normalizeSearchTerm, stripSearchMarkup, tokenizeSearchText } from './tokenizer'
import type {
  FieldFilter,
  IndexedSearchDocument,
  SearchHighlightRange,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from './types'

const DEFAULT_LIMIT = 25
const EXCERPT_RADIUS = 72
const MAX_EXCERPT_LENGTH = 180

function toIso(value: Date | string | number | undefined): string {
  if (!value) return new Date(0).toISOString()
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString()
}

function searchableText(document: IndexedSearchDocument): string {
  return [
    document.title,
    document.content,
    document.tags,
    document.author,
    document.status,
    document.sourceName,
    document.categoryId ?? '',
  ].join(' ').toLowerCase()
}

function compareDate(left: string, operator: FieldFilter['operator'], right: string | number): boolean {
  const leftTime = new Date(left).getTime()
  const rightTime = new Date(String(right)).getTime()
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return false
  if (operator === '>') return leftTime > rightTime
  if (operator === '>=') return leftTime >= rightTime
  if (operator === '<') return leftTime < rightTime
  if (operator === '<=') return leftTime <= rightTime
  return leftTime === rightTime
}

function compareNumber(left: number, operator: FieldFilter['operator'], right: string | number): boolean {
  const numericRight = typeof right === 'number' ? right : Number(right)
  if (!Number.isFinite(numericRight)) return false
  if (operator === '>') return left > numericRight
  if (operator === '>=') return left >= numericRight
  if (operator === '<') return left < numericRight
  if (operator === '<=') return left <= numericRight
  return left === numericRight
}

function includesNormalized(left: string, right: string | number): boolean {
  return left.toLowerCase().includes(String(right).toLowerCase())
}

function filterMatches(document: IndexedSearchDocument, filter: FieldFilter): boolean {
  switch (filter.field) {
    case 'tags':
      return document.tagIds.some(tag => includesNormalized(tag, filter.value))
    case 'status':
      return filter.operator === 'contains'
        ? includesNormalized(document.status, filter.value)
        : document.status === String(filter.value)
    case 'author':
      return includesNormalized(document.author, filter.value)
    case 'source':
      return includesNormalized(document.sourceName, filter.value)
    case 'category':
      return includesNormalized(document.categoryId ?? '', filter.value)
    case 'title':
      return includesNormalized(document.title, filter.value)
    case 'content':
      return includesNormalized(document.content, filter.value)
    case 'wordCount':
      return compareNumber(document.wordCount, filter.operator, filter.value)
    case 'createdAt':
      return compareDate(document.createdAt, filter.operator, filter.value)
    case 'updatedAt':
      return compareDate(document.updatedAt, filter.operator, filter.value)
    default:
      return true
  }
}

function containsPhrase(document: IndexedSearchDocument, phrase: string): boolean {
  return searchableText(document).includes(phrase.toLowerCase())
}

function findFirstNeedle(text: string, needles: string[]): { index: number; needle: string } | null {
  const lowerText = text.toLowerCase()
  let best: { index: number; needle: string } | null = null
  for (const rawNeedle of needles) {
    const needle = rawNeedle.toLowerCase().trim()
    if (!needle) continue
    const index = lowerText.indexOf(needle)
    if (index < 0) continue
    if (!best || index < best.index) best = { index, needle: rawNeedle }
  }
  return best
}

function createExcerpt(document: IndexedSearchDocument, needles: string[]): { excerpt: string; highlights: SearchHighlightRange[] } {
  const baseText = document.content || document.title
  if (!baseText) return { excerpt: '', highlights: [] }

  const first = findFirstNeedle(baseText, needles)
  const start = first ? Math.max(first.index - EXCERPT_RADIUS, 0) : 0
  const end = Math.min(start + MAX_EXCERPT_LENGTH, baseText.length)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < baseText.length ? '...' : ''
  const excerptBody = baseText.slice(start, end)
  const excerpt = prefix + excerptBody + suffix
  const offset = prefix.length - start
  const highlights: SearchHighlightRange[] = []

  for (const rawNeedle of needles) {
    const needle = rawNeedle.trim()
    if (!needle) continue
    const lowerExcerpt = excerpt.toLowerCase()
    const lowerNeedle = needle.toLowerCase()
    let index = lowerExcerpt.indexOf(lowerNeedle)
    while (index >= 0) {
      highlights.push({ start: index, end: index + needle.length })
      index = lowerExcerpt.indexOf(lowerNeedle, index + Math.max(needle.length, 1))
    }
  }

  if (highlights.length === 0 && first) {
    const startInExcerpt = Math.max(first.index + offset, 0)
    highlights.push({ start: startInExcerpt, end: Math.min(startInExcerpt + first.needle.length, excerpt.length) })
  }

  return { excerpt, highlights }
}

function sortResults(results: SearchResult[], sort: SearchRequest['sort']): SearchResult[] {
  const next = [...results]
  if (sort === 'updatedAt') {
    next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() || a.title.localeCompare(b.title))
    return next
  }
  if (sort === 'title') {
    next.sort((a, b) => a.title.localeCompare(b.title) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    return next
  }
  next.sort((a, b) => b.score - a.score || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return next
}

function createMiniSearch(): MiniSearch<IndexedSearchDocument> {
  return new MiniSearch<IndexedSearchDocument>({
    idField: 'id',
    fields: ['title', 'content', 'tags', 'author', 'status', 'sourceName'],
    storeFields: ['id', 'title', 'status', 'wordCount', 'updatedAt', 'path', 'tagIds', 'isArchived', 'isTrashed'],
    tokenize: tokenizeSearchText,
    processTerm: normalizeSearchTerm,
    searchOptions: {
      boost: { title: 3, tags: 2, author: 1.5, sourceName: 1.2, content: 1 },
      prefix: true,
      fuzzy: term => term.length >= 5 ? 0.18 : false,
      combineWith: 'AND',
    },
  })
}

export function articleToSearchDocument(article: Article): IndexedSearchDocument {
  const content = stripSearchMarkup(article.markdownSource || article.rawContent || article.description || '')
  const tags = [...article.tags]
  const authors = article.authors.join(' ')
  return {
    id: article.id,
    title: article.title,
    content,
    tags: tags.join(' '),
    tagIds: tags,
    author: authors,
    status: article.status,
    wordCount: countSearchWords(content || article.title),
    createdAt: toIso(article.createdAt),
    updatedAt: toIso(article.updatedAt),
    path: '/workstation?article=' + encodeURIComponent(article.id),
    sourceName: article.sourceName || '',
    categoryId: article.categoryId ?? null,
    isArchived: article.status === ARTICLE_STATUS.ARCHIVED,
    isTrashed: article.status === ARTICLE_STATUS.TRASHED,
  }
}

export class SearchEngine {
  private index = createMiniSearch()
  private documents = new Map<string, IndexedSearchDocument>()

  get size(): number {
    return this.documents.size
  }

  rebuild(articles: Article[]): void {
    const documents = articles.map(articleToSearchDocument).filter(document => !document.isTrashed)
    this.index = createMiniSearch()
    this.documents = new Map(documents.map(document => [document.id, document]))
    if (documents.length > 0) {
      this.index.addAll(documents)
    }
  }

  indexArticle(article: Article): void {
    const document = articleToSearchDocument(article)
    if (document.isTrashed) {
      this.removeArticle(document.id)
      return
    }
    if (this.documents.has(document.id)) {
      this.index.replace(document)
    } else {
      this.index.add(document)
    }
    this.documents.set(document.id, document)
  }

  removeArticle(articleId: string): void {
    if (!this.documents.has(articleId)) return
    this.index.discard(articleId)
    this.documents.delete(articleId)
  }

  clear(): void {
    this.index = createMiniSearch()
    this.documents.clear()
  }

  search(request: SearchRequest): SearchResponse {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const parsed = request.parsed ?? parseSearchQuery(request.query)
    const limit = Math.max(1, request.limit ?? DEFAULT_LIMIT)
    const offset = Math.max(0, request.offset ?? 0)
    const needles = [...parsed.terms, ...parsed.phrases]
    const hasSearchText = needles.length > 0

    if (!hasSearchText && parsed.filters.length === 0) {
      return {
        results: [],
        total: 0,
        took: 0,
        query: parsed,
      }
    }

    const rawResults = hasSearchText
      ? this.index.search(needles.join(' '), {
        combineWith: parsed.rootOp,
        prefix: true,
        fuzzy: term => term.length >= 5 ? 0.18 : false,
      })
      : [...this.documents.values()].map(document => ({ id: document.id, score: 0 }) as MiniSearchRawResult)

    const seen = new Set<string>()
    const mapped: SearchResult[] = []
    for (const rawResult of rawResults) {
      const document = this.documents.get(String(rawResult.id))
      if (!document || seen.has(document.id)) continue
      seen.add(document.id)

      if (!request.includeTrashed && document.isTrashed) continue
      if (!request.includeArchived && document.isArchived) continue
      if (!parsed.filters.every(filter => filterMatches(document, filter))) continue
      if (!parsed.phrases.every(phrase => containsPhrase(document, phrase))) continue
      if (parsed.excludeTerms.some(term => containsPhrase(document, term))) continue

      const excerpt = createExcerpt(document, needles.length > 0 ? needles : [document.title])
      mapped.push({
        id: document.id,
        score: rawResult.score ?? 0,
        title: document.title,
        path: document.path,
        excerpt: excerpt.excerpt,
        highlights: excerpt.highlights,
        status: document.status as ArticleStatus,
        updatedAt: document.updatedAt,
        wordCount: document.wordCount,
        tagIds: [...document.tagIds],
        isArchived: document.isArchived,
        isTrashed: document.isTrashed,
      })
    }

    const sorted = sortResults(mapped, request.sort ?? 'relevance')
    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
    return {
      results: sorted.slice(offset, offset + limit),
      total: sorted.length,
      took: Math.max(0, Math.round(elapsed)),
      query: parsed,
    }
  }
}

