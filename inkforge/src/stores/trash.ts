import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Article } from '@/types'
import { auditLog } from '@/services/audit'
import { logger } from '@/services/error'
import { trashRepository, type TrashBulkPurgeResult, type TrashPurgeResult, type TrashSummary } from '@/services/trash'
import { DEFAULT_ACCOUNT_ID, useAccountStore } from './account'
import { useCategoryStore } from './category'

type TrashActionKind = 'move' | 'restore' | 'purge' | 'empty' | 'purgeExpired'

interface TrashActionState {
  kind: TrashActionKind
  articleId?: string
  affectedCount: number
  at: Date
}

function fallbackSummary(): TrashSummary {
  return {
    totalCount: 0,
    expiredCount: 0,
    storageBytes: 0,
    nextExpiryAt: null,
  }
}

export const useTrashStore = defineStore('trash', () => {
  const items = ref<Article[]>([])
  const summary = ref<TrashSummary>(fallbackSummary())
  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)
  const lastAction = ref<TrashActionState | null>(null)

  const totalCount = computed(() => summary.value.totalCount)
  const expiredCount = computed(() => summary.value.expiredCount)
  const storageBytes = computed(() => summary.value.storageBytes)
  const hasItems = computed(() => items.value.length > 0)

  function actorId(): string {
    return useAccountStore().currentAccount?.id ?? DEFAULT_ACCOUNT_ID
  }

  async function loadTrash(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const result = await trashRepository.list()
      items.value = result.items
      summary.value = result.summary
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      logger.error('Load trash failed', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function moveToTrash(articleId: string): Promise<Article> {
    isMutating.value = true
    error.value = null
    try {
      const article = await trashRepository.moveToTrash(articleId, { actorId: actorId() })
      if (!items.value.some(item => item.id === article.id)) {
        items.value = [article, ...items.value]
      }
      if (article.categoryId) {
        useCategoryStore().updateArticleCount(article.categoryId, -1)
      }
      summary.value = await trashRepository.summarize()
      lastAction.value = { kind: 'move', articleId, affectedCount: 1, at: new Date() }
      await auditLog('document.delete', {
        actorId: actorId(),
        profileId: actorId(),
        docId: article.id,
        resourceId: article.id,
        resourceKind: 'document',
        severity: 'warning',
        payload: { softDelete: true, expiresAt: article.expiresAt?.toISOString?.() ?? article.expiresAt ?? null },
        source: 'useTrashStore.moveToTrash',
      })
      return article
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      logger.error('Move to trash failed', err, { articleId })
      throw err
    } finally {
      isMutating.value = false
    }
  }

  async function restore(articleId: string): Promise<Article> {
    isMutating.value = true
    error.value = null
    try {
      const before = items.value.find(item => item.id === articleId)
      const article = await trashRepository.restore(articleId, { actorId: actorId() })
      items.value = items.value.filter(item => item.id !== articleId)
      if ((before ?? article).categoryId) {
        useCategoryStore().updateArticleCount((before ?? article).categoryId!, 1)
      }
      summary.value = await trashRepository.summarize()
      lastAction.value = { kind: 'restore', articleId, affectedCount: 1, at: new Date() }
      await auditLog('document.restore', {
        actorId: actorId(),
        profileId: actorId(),
        docId: article.id,
        resourceId: article.id,
        resourceKind: 'document',
        severity: 'info',
        payload: { restoredStatus: article.status },
        source: 'useTrashStore.restore',
      })
      return article
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      logger.error('Restore trash article failed', err, { articleId })
      throw err
    } finally {
      isMutating.value = false
    }
  }

  async function purge(articleId: string): Promise<TrashPurgeResult> {
    isMutating.value = true
    error.value = null
    try {
      const result = await trashRepository.purge(articleId)
      items.value = items.value.filter(item => item.id !== articleId)
      summary.value = await trashRepository.summarize()
      lastAction.value = { kind: 'purge', articleId, affectedCount: 1, at: new Date() }
      await auditLog('document.delete', {
        actorId: actorId(),
        profileId: actorId(),
        docId: articleId,
        resourceId: articleId,
        resourceKind: 'document',
        severity: 'critical',
        payload: { permanent: true, contentDeleted: result.contentDeleted },
        source: 'useTrashStore.purge',
      })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      logger.error('Purge trash article failed', err, { articleId })
      throw err
    } finally {
      isMutating.value = false
    }
  }

  async function emptyTrash(): Promise<TrashBulkPurgeResult> {
    isMutating.value = true
    error.value = null
    try {
      const result = await trashRepository.empty()
      items.value = []
      summary.value = fallbackSummary()
      lastAction.value = { kind: 'empty', affectedCount: result.purgedIds.length, at: new Date() }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      logger.error('Empty trash failed', err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  async function purgeExpired(): Promise<TrashBulkPurgeResult> {
    isMutating.value = true
    error.value = null
    try {
      const result = await trashRepository.purgeExpired()
      if (result.purgedIds.length > 0) {
        const purged = new Set(result.purgedIds)
        items.value = items.value.filter(item => !purged.has(item.id))
      }
      summary.value = await trashRepository.summarize()
      lastAction.value = { kind: 'purgeExpired', affectedCount: result.purgedIds.length, at: new Date() }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      logger.error('Purge expired trash failed', err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  async function refreshSummary(): Promise<TrashSummary> {
    summary.value = await trashRepository.summarize()
    return summary.value
  }

  return {
    items,
    summary,
    totalCount,
    expiredCount,
    storageBytes,
    hasItems,
    isLoading,
    isMutating,
    error,
    lastAction,
    loadTrash,
    moveToTrash,
    restore,
    purge,
    emptyTrash,
    purgeExpired,
    refreshSummary,
  }
})
