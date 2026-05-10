import type { Article } from '@/types'

export const TRASH_RETENTION_DAYS = 30
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
export const DEFAULT_TRASH_ACTOR_ID = 'local-default'

export interface TrashMutationOptions {
  actorId?: string
  now?: Date | number
}

export interface TrashPurgeResult {
  articleId: string
  contentDeleted: number
}

export interface TrashBulkPurgeResult {
  purgedIds: string[]
  contentDeleted: number
}

export interface TrashSummary {
  totalCount: number
  expiredCount: number
  storageBytes: number
  nextExpiryAt: Date | null
}

export interface TrashListResult {
  items: Article[]
  summary: TrashSummary
}
