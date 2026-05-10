import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'
import type { ChangeOperation } from './change-tracker'
import type { ConflictRecord, SyncLog, SyncProviderId } from './provider'

export interface SyncOutboxRecord {
    id: string
    articleId: string
    operation: ChangeOperation
    checksum: string
    profileId: string
    providerId: SyncProviderId | 'unconfigured'
    status: 'pending' | 'syncing' | 'synced' | 'failed'
    retryCount: number
    nextRetryAt?: number
    lastError?: string
    createdAt: Date
    updatedAt: Date
}

export interface SyncLogRecord extends SyncLog {
    createdAt: Date
}

export interface SyncConflictRecord extends ConflictRecord {
    profileId: string
    providerId: SyncProviderId
    createdAt: Date
    updatedAt: Date
}

export interface EnqueueOutboxInput {
    id?: string
    articleId: string
    operation: ChangeOperation
    checksum: string
    profileId?: string
    providerId?: SyncProviderId | 'unconfigured'
}

const DEFAULT_PROFILE_ID = 'local-default'

export class SyncRepository {
    async enqueueOutbox(input: EnqueueOutboxInput): Promise<SyncOutboxRecord> {
        const now = new Date()
        const existing = await db.syncOutbox
            .where('[articleId+operation+status]')
            .equals([input.articleId, input.operation, 'pending'])
            .first()

        const record: SyncOutboxRecord = {
            id: existing?.id ?? input.id ?? generateId(),
            articleId: input.articleId,
            operation: input.operation,
            checksum: input.checksum,
            profileId: input.profileId ?? DEFAULT_PROFILE_ID,
            providerId: input.providerId ?? 'unconfigured',
            status: 'pending',
            retryCount: existing?.retryCount ?? 0,
            nextRetryAt: existing?.nextRetryAt,
            lastError: undefined,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        }

        await db.syncOutbox.put(record)
        return record
    }

    async listPendingOutbox(profileId = DEFAULT_PROFILE_ID): Promise<SyncOutboxRecord[]> {
        return db.syncOutbox
            .where('[profileId+status]')
            .equals([profileId, 'pending'])
            .sortBy('createdAt')
    }

    async markOutboxSynced(ids: string[]): Promise<void> {
        const now = new Date()
        await db.transaction('rw', db.syncOutbox, async () => {
            for (const id of ids) {
                await db.syncOutbox.update(id, { status: 'synced', updatedAt: now, lastError: undefined })
            }
        })
    }

    async markOutboxFailed(ids: string[], errorMessage: string): Promise<void> {
        const now = new Date()
        await db.transaction('rw', db.syncOutbox, async () => {
            for (const id of ids) {
                const record = await db.syncOutbox.get(id)
                if (!record) continue
                const retryCount = record.retryCount + 1
                await db.syncOutbox.update(id, {
                    status: retryCount > 5 ? 'failed' : 'pending',
                    retryCount,
                    nextRetryAt: Date.now() + Math.min(60_000, 1000 * Math.pow(2, retryCount)),
                    lastError: errorMessage,
                    updatedAt: now,
                })
            }
        })
    }

    async addLog(log: SyncLog): Promise<void> {
        await db.syncLogs.add({ ...log, createdAt: new Date() })
    }

    async listLogs(limit = 50): Promise<SyncLogRecord[]> {
        return db.syncLogs
            .orderBy('startedAt')
            .reverse()
            .limit(limit)
            .toArray()
    }

    async upsertConflict(record: SyncConflictRecord): Promise<void> {
        await db.syncConflicts.put(record)
    }

    async listPendingConflicts(profileId = DEFAULT_PROFILE_ID): Promise<SyncConflictRecord[]> {
        return db.syncConflicts
            .where('[profileId+status]')
            .equals([profileId, 'pending'])
            .sortBy('detectedAt')
    }
}

export const syncRepository = new SyncRepository()
