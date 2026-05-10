import { sha256Hex } from '@/core/authority/hash'
import { generateId } from '@/utils/uuid'
import { db } from '@/utils/db'
import type { EmergencyPayload, RecoveryPointRecord, RecoveryPointTrigger } from './types'

export interface CreateRecoveryPointInput {
    articleId: string
    title: string
    content: string
    trigger: RecoveryPointTrigger
    sourceEmergencyKey?: string
    profileId?: string
    windowId?: string
    reason?: string
}

export async function createRecoveryPoint(input: CreateRecoveryPointInput): Promise<RecoveryPointRecord> {
    const now = Date.now()
    const record: RecoveryPointRecord = {
        id: generateId(),
        articleId: input.articleId,
        title: input.title,
        createdAt: new Date(now),
        content: input.content,
        contentHash: (await sha256Hex(input.content)).slice(0, 16),
        trigger: input.trigger,
        consumed: false,
        sourceEmergencyKey: input.sourceEmergencyKey,
        profileId: input.profileId,
        windowId: input.windowId,
        metadata: {
            reason: input.reason,
            originalLength: input.content.length,
        },
    }

    await db.recoveryPoints.put(record)
    return record
}

export async function createRecoveryPointFromEmergencyPayload(
    payload: EmergencyPayload,
    sourceEmergencyKey: string,
): Promise<RecoveryPointRecord | null> {
    if (!payload.activeArticle) {
        return null
    }

    return createRecoveryPoint({
        articleId: payload.activeArticle.articleId,
        title: payload.activeArticle.title,
        content: payload.activeArticle.content,
        trigger: 'crash-recovery',
        sourceEmergencyKey,
        profileId: payload.profileId,
        windowId: payload.windowId,
        reason: payload.activeArticle.truncated ? 'emergency-payload-truncated' : 'emergency-payload',
    })
}

export async function listRecoveryPointsForArticle(articleId: string): Promise<RecoveryPointRecord[]> {
    return db.recoveryPoints
        .where('articleId')
        .equals(articleId)
        .reverse()
        .sortBy('createdAt')
}

export async function markRecoveryPointConsumed(id: string, restoredAt = Date.now()): Promise<void> {
    const point = await db.recoveryPoints.get(id)
    if (!point) {
        return
    }

    await db.recoveryPoints.update(id, {
        consumed: true,
        metadata: {
            ...point.metadata,
            restoredAt,
        },
    })
}

export async function removeRecoveryPointsBySource(sourceEmergencyKey: string): Promise<void> {
    const points = await db.recoveryPoints
        .where('sourceEmergencyKey')
        .equals(sourceEmergencyKey)
        .toArray()

    await db.recoveryPoints.bulkDelete(points.map(point => point.id))
}
