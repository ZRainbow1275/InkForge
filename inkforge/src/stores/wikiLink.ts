import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { wikiLinkService, type BacklinkRecord, type WikiLinkArticleSearchItem, type WikiLinkRebuildAllResult, type WikiLinkRebuildResult } from '@/services/wiki-link'

export const useWikiLinkStore = defineStore('wikiLink', () => {
  const backlinks = ref<BacklinkRecord[]>([])
  const brokenLinks = ref<BacklinkRecord[]>([])
  const searchResults = ref<WikiLinkArticleSearchItem[]>([])
  const isLoading = ref(false)
  const isIndexing = ref(false)
  const error = ref<string | null>(null)
  const lastAction = ref<{ kind: 'load' | 'search' | 'rebuild-article' | 'rebuild-all' | 'delete-cleanup'; at: number; count: number } | null>(null)

  const backlinkCount = computed(() => backlinks.value.length)
  const brokenLinkCount = computed(() => brokenLinks.value.length)

  function setError(errorValue: unknown): void {
    error.value = errorValue instanceof Error ? errorValue.message : String(errorValue)
  }

  async function loadBacklinks(articleId: string): Promise<BacklinkRecord[]> {
    isLoading.value = true
    error.value = null
    try {
      const result = await wikiLinkService.getBacklinks(articleId)
      backlinks.value = result
      lastAction.value = { kind: 'load', at: Date.now(), count: result.length }
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loadBrokenLinks(): Promise<BacklinkRecord[]> {
    isLoading.value = true
    error.value = null
    try {
      const result = await wikiLinkService.getBrokenLinks()
      brokenLinks.value = result
      lastAction.value = { kind: 'load', at: Date.now(), count: result.length }
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function searchArticles(query: string): Promise<WikiLinkArticleSearchItem[]> {
    isLoading.value = true
    error.value = null
    try {
      const result = await wikiLinkService.searchArticles(query)
      searchResults.value = result
      lastAction.value = { kind: 'search', at: Date.now(), count: result.length }
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function rebuildArticle(articleId: string): Promise<WikiLinkRebuildResult> {
    isIndexing.value = true
    error.value = null
    try {
      const result = await wikiLinkService.rebuildArticleBacklinks(articleId)
      lastAction.value = { kind: 'rebuild-article', at: Date.now(), count: result.indexed }
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isIndexing.value = false
    }
  }

  async function rebuildAll(): Promise<WikiLinkRebuildAllResult> {
    isIndexing.value = true
    error.value = null
    try {
      const result = await wikiLinkService.rebuildAllBacklinks()
      lastAction.value = { kind: 'rebuild-all', at: Date.now(), count: result.indexedLinks }
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isIndexing.value = false
    }
  }

  async function deleteArticleBacklinks(articleId: string): Promise<number> {
    isIndexing.value = true
    error.value = null
    try {
      const deleted = await wikiLinkService.deleteArticleBacklinks(articleId)
      lastAction.value = { kind: 'delete-cleanup', at: Date.now(), count: deleted }
      return deleted
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isIndexing.value = false
    }
  }

  return {
    backlinks,
    brokenLinks,
    searchResults,
    isLoading,
    isIndexing,
    error,
    lastAction,
    backlinkCount,
    brokenLinkCount,
    loadBacklinks,
    loadBrokenLinks,
    searchArticles,
    rebuildArticle,
    rebuildAll,
    deleteArticleBacklinks,
  }
})
