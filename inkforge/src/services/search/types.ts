import type { ArticleStatus } from '@/types'

export type SearchField = 'title' | 'content' | 'tags' | 'author' | 'status' | 'source' | 'category'
export type SearchSort = 'relevance' | 'updatedAt' | 'title'
export type SearchFilterOperator = '=' | 'contains' | '>' | '<' | '>=' | '<='
export type BooleanOp = 'AND' | 'OR'

export interface FieldFilter {
  field: SearchField | 'wordCount' | 'createdAt' | 'updatedAt'
  operator: SearchFilterOperator
  value: string | number
}

export interface SearchQuery {
  raw: string
  terms: string[]
  phrases: string[]
  excludeTerms: string[]
  filters: FieldFilter[]
  rootOp: BooleanOp
  warnings: string[]
}

export interface SearchRequest {
  query: string
  parsed?: SearchQuery
  limit?: number
  offset?: number
  sort?: SearchSort
  includeArchived?: boolean
  includeTrashed?: boolean
}

export interface SearchHighlightRange {
  start: number
  end: number
}

export interface SearchResult {
  id: string
  score: number
  title: string
  path: string
  excerpt: string
  highlights: SearchHighlightRange[]
  status: ArticleStatus
  updatedAt: string
  wordCount: number
  tagIds: string[]
  isArchived: boolean
  isTrashed: boolean
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  took: number
  query: SearchQuery
}

export interface IndexedSearchDocument {
  id: string
  title: string
  content: string
  tags: string
  tagIds: string[]
  author: string
  status: ArticleStatus
  wordCount: number
  createdAt: string
  updatedAt: string
  path: string
  sourceName: string
  categoryId: string | null
  isArchived: boolean
  isTrashed: boolean
}

export interface SearchHistoryItem {
  query: string
  timestamp: string
  resultCount: number
}

export interface SearchHistoryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

