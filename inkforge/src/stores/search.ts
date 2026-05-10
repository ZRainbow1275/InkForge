import { computed, markRaw, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Article } from '@/types'
import { articleRepository } from '@/services/repository'
import { logger } from '@/services/error'
import {
  SearchEngine,
  SearchHistoryRepository,
  type SearchHistoryItem,
  type SearchRequest,
  type SearchResponse,
  type SearchResult,
} from '@/services/search'

export const useSearchStore = defineStore('search', () => {
  const engine = markRaw(new SearchEngine())
  const historyRepository = markRaw(new SearchHistoryRepository())

  const query = ref('')
  const results = ref<SearchResult[]>([])
  const total = ref(0)
  const took = ref(0)
  const indexedCount = ref(0)
  const isIndexing = ref(false)
  const isSearching = ref(false)
  const error = ref<string | null>(null)
  const history = ref<SearchHistoryItem[]>(historyRepository.load())

  const hasResults = computed(() => results.value.length > 0)
  const hasIndex = computed(() => indexedCount.value > 0)

  async function rebuildIndex(sourceArticles?: Article[]): Promise<void> {
    isIndexing.value = true
    error.value = null
    try {
      const articles = sourceArticles ?? await articleRepository.findAllOrderedByDate()
      engine.rebuild(articles)
      indexedCount.value = engine.size
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      logger.error('Search index rebuild failed', err)
      throw err
    } finally {
      isIndexing.value = false
    }
  }

  function indexArticle(article: Article): void {
    engine.indexArticle(article)
    indexedCount.value = engine.size
  }

  function removeArticle(articleId: string): void {
    engine.removeArticle(articleId)
    indexedCount.value = engine.size
  }

  function clearIndex(): void {
    engine.clear()
    indexedCount.value = 0
    results.value = []
    total.value = 0
    took.value = 0
  }

  function search(request: string | SearchRequest): SearchResponse {
    isSearching.value = true
    error.value = null
    try {
      const resolvedRequest = typeof request === 'string' ? { query: request } : request
      query.value = resolvedRequest.query
      const response = engine.search(resolvedRequest)
      results.value = response.results
      total.value = response.total
      took.value = response.took
      if (resolvedRequest.query.trim()) {
        history.value = historyRepository.record(resolvedRequest.query, response.total)
      }
      return response
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      logger.error('Search query failed', err, { query: typeof request === 'string' ? request : request.query })
      throw err
    } finally {
      isSearching.value = false
    }
  }

  function clearHistory(): void {
    historyRepository.clear()
    history.value = []
  }

  return {
    query,
    results,
    total,
    took,
    indexedCount,
    isIndexing,
    isSearching,
    error,
    history,
    hasResults,
    hasIndex,
    rebuildIndex,
    indexArticle,
    removeArticle,
    clearIndex,
    search,
    clearHistory,
  }
})

