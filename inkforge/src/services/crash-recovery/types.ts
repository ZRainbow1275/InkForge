export const CRASH_RECOVERY_SCHEMA_VERSION = 1 as const

export type RecoveryPointTrigger = 'autosave-failure' | 'crash-recovery' | 'disaster' | 'manual'

export interface EmergencyPayloadTab {
    articleId: string
    title: string
    dirty: boolean
    cursor: { from: number; to: number } | null
    scrollTop: number
}

export interface EmergencyActiveArticle {
    articleId: string
    title: string
    content: string
    contentHash: string
    truncated: boolean
    length: number
    storedLength: number
    omittedLength: number
}

export interface EmergencyPayload {
    schemaVersion: typeof CRASH_RECOVERY_SCHEMA_VERSION
    savedAt: number
    windowId: string
    profileId: string
    tabs: EmergencyPayloadTab[]
    activeArticle: EmergencyActiveArticle | null
}

export interface EmergencySnapshotInput {
    profileId: string
    windowId: string
    articleId: string | null
    title: string
    content: string
    dirty: boolean
    cursor?: { from: number; to: number } | null
    scrollTop?: number
}

export interface StoredEmergencyPayload {
    key: string
    payload: EmergencyPayload
    cleanlyClosedAt: number | null
    recoverable: boolean
}

export interface RecoveryPointRecord {
    id: string
    articleId: string
    title: string
    createdAt: Date
    content: string
    contentHash: string
    trigger: RecoveryPointTrigger
    consumed: boolean
    sourceEmergencyKey?: string
    profileId?: string
    windowId?: string
    metadata?: {
        reason?: string
        originalLength?: number
        restoredAt?: number
    }
}

export interface CrashRecoveryStartupState {
    profileId: string
    windowId: string
    crashCount: number
    pendingPayloads: StoredEmergencyPayload[]
    shouldEnterSafeMode: boolean
}

export interface EmergencyWriteResult {
    ok: boolean
    key: string | null
    durationMs: number
    error?: string
}
