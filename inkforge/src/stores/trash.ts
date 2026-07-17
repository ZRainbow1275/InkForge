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
  const activeMutationCount = ref(0)
  const error = ref<string | null>(null)
  const warning = ref<string | null>(null)
  const lastAction = ref<TrashActionState | null>(null)
  const pendingMutations = new Map<string, Promise<unknown>>()

  const isMutating = computed(() => activeMutationCount.value > 0)
  const totalCount = computed(() => summary.value.totalCount)
  const expiredCount = computed(() => summary.value.expiredCount)
  const storageBytes = computed(() => summary.value.storageBytes)
  const hasItems = computed(() => items.value.length > 0)

  function actorId(): string {
    return useAccountStore().currentAccount?.id ?? DEFAULT_ACCOUNT_ID
  }

  function appendWarning(message: string): void {
    warning.value = warning.value ? `${warning.value} ${message}` : message
  }

  function runSingleFlight<T>(key: string, task: () => Promise<T>): Promise<T> {
    const pending = pendingMutations.get(key)
    if (pending) return pending as Promise<T>

    activeMutationCount.value += 1
    const operation = Promise.resolve().then(task)
    pendingMutations.set(key, operation)
    const clearOperation = (): void => {
      if (pendingMutations.get(key) === operation) {
        pendingMutations.delete(key)
      }
      activeMutationCount.value = Math.max(0, activeMutationCount.value - 1)
    }
    void operation.then(clearOperation, clearOperation)
    return operation
  }

  async function refreshSummaryAfterCommit(actionLabel: string): Promise<void> {
    try {
      summary.value = await trashRepository.summarize()
    } catch (err) {
      appendWarning(`${actionLabel}已完成，但回收站统计刷新失败，请点击“刷新”重试。`)
      logger.warn('Trash summary refresh failed after committed mutation', {
        actionLabel,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async function loadTrash(): Promise<void> {
    isLoading.value = true
    error.value = null
    warning.value = null
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

  function moveToTrash(articleId: string): Promise<Article> {
    return runSingleFlight(`move:${articleId}`, async () => {
      error.value = null
      warning.value = null
      try {
        const article = await trashRepository.moveToTrash(articleId, { actorId: actorId() })
        if (!items.value.some(item => item.id === article.id)) {
          items.value = [article, ...items.value]
        }
        if (article.categoryId) {
          try {
            await useCategoryStore().updateArticleCount(article.categoryId, -1)
          } catch (err) {
            appendWarning('文稿已移入回收站，但分类计数刷新失败。')
            logger.warn('Article moved to trash but category count refresh failed', {
              articleId,
              categoryId: article.categoryId,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
        lastAction.value = { kind: 'move', articleId, affectedCount: 1, at: new Date() }
        await refreshSummaryAfterCommit('移入回收站')
        try {
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
        } catch (err) {
          appendWarning('文稿已移入回收站，但删除审计记录失败。')
          logger.warn('Trash move committed but audit write failed', {
            articleId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
        return article
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        error.value = message
        logger.error('Move to trash failed', err, { articleId })
        throw err
      }
    })
  }

  function restore(articleId: string): Promise<Article> {
    return runSingleFlight(`restore:${articleId}`, async () => {
      error.value = null
      warning.value = null
      try {
        const before = items.value.find(item => item.id === articleId)
        const article = await trashRepository.restore(articleId, { actorId: actorId() })
        items.value = items.value.filter(item => item.id !== articleId)
        const categoryId = (before ?? article).categoryId
        if (categoryId) {
          try {
            await useCategoryStore().updateArticleCount(categoryId, 1)
          } catch (err) {
            appendWarning('文稿已恢复，但分类计数刷新失败。')
            logger.warn('Trash restore committed but category count refresh failed', {
              articleId,
              categoryId,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
        lastAction.value = { kind: 'restore', articleId, affectedCount: 1, at: new Date() }
        await refreshSummaryAfterCommit('恢复文稿')
        try {
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
        } catch (err) {
          appendWarning('文稿已恢复，但恢复审计记录失败。')
          logger.warn('Trash restore committed but audit write failed', {
            articleId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
        return article
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        error.value = message
        logger.error('Restore trash article failed', err, { articleId })
        throw err
      }
    })
  }

  function purge(articleId: string): Promise<TrashPurgeResult> {
    return runSingleFlight(`purge:${articleId}`, async () => {
      error.value = null
      warning.value = null
      try {
        const result = await trashRepository.purge(articleId)
        items.value = items.value.filter(item => item.id !== articleId)
        lastAction.value = { kind: 'purge', articleId, affectedCount: 1, at: new Date() }
        await refreshSummaryAfterCommit('永久删除')
        try {
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
        } catch (err) {
          appendWarning('文稿已永久删除，但删除审计记录失败。')
          logger.warn('Trash purge committed but audit write failed', {
            articleId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        error.value = message
        logger.error('Purge trash article failed', err, { articleId })
        throw err
      }
    })
  }

  function emptyTrash(): Promise<TrashBulkPurgeResult> {
    return runSingleFlight('empty', async () => {
      error.value = null
      warning.value = null
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
      }
    })
  }

  function purgeExpired(): Promise<TrashBulkPurgeResult> {
    return runSingleFlight('purgeExpired', async () => {
      error.value = null
      warning.value = null
      try {
        const result = await trashRepository.purgeExpired()
        if (result.purgedIds.length > 0) {
          const purged = new Set(result.purgedIds)
          items.value = items.value.filter(item => !purged.has(item.id))
        }
        lastAction.value = { kind: 'purgeExpired', affectedCount: result.purgedIds.length, at: new Date() }
        await refreshSummaryAfterCommit('清理到期文稿')
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        error.value = message
        logger.error('Purge expired trash failed', err)
        throw err
      }
    })
  }

  async function refreshSummary(): Promise<TrashSummary> {
    summary.value = await trashRepository.summarize()
    warning.value = null
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
    warning,
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
