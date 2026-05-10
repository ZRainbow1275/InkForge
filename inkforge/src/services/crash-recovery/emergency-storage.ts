import { sha256Hex } from '@/core/authority/hash'
import {
    CRASH_RECOVERY_SCHEMA_VERSION,
    type CrashRecoveryStartupState,
    type EmergencyPayload,
    type EmergencySnapshotInput,
    type EmergencyActiveArticle,
    type EmergencyWriteResult,
    type StoredEmergencyPayload,
} from './types'
import {
    EMERGENCY_KEY_PREFIX,
    EMERGENCY_SCHEMA_KEY,
    getCrashCountKey,
    getEmergencyPayloadKey,
    getLastClosedCleanlyKey,
    getOrCreateWindowId,
    parseEmergencyKey,
} from './keys'

const MAX_DIRECT_CONTENT_CHARS = 200 * 1024
const MAX_TRUNCATED_CONTENT_CHARS = 100 * 1024
const CRASH_SAFE_MODE_THRESHOLD = 3

let cachedPayload: EmergencyPayload | null = null
let cachedSerializedPayload: string | null = null
let cachedPayloadKey: string | null = null

function getStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage
}

function safeReadNumber(key: string): number | null {
    const storage = getStorage()
    if (!storage) return null

    const raw = storage.getItem(key)
    if (!raw) return null

    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
}

function truncateEmergencyContent(content: string): Pick<EmergencyActiveArticle, 'content' | 'truncated' | 'length' | 'storedLength' | 'omittedLength'> {
    const length = content.length
    if (length <= MAX_DIRECT_CONTENT_CHARS) {
        return {
            content,
            truncated: false,
            length,
            storedLength: length,
            omittedLength: 0,
        }
    }

    const retained = content.slice(Math.max(0, length - MAX_TRUNCATED_CONTENT_CHARS))
    return {
        content: retained,
        truncated: true,
        length,
        storedLength: retained.length,
        omittedLength: length - retained.length,
    }
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isEmergencyPayload(value: unknown): value is EmergencyPayload {
    if (!isObject(value)) return false
    if (value.schemaVersion !== CRASH_RECOVERY_SCHEMA_VERSION) return false
    if (typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt)) return false
    if (typeof value.windowId !== 'string' || value.windowId.length === 0) return false
    if (typeof value.profileId !== 'string' || value.profileId.length === 0) return false
    if (!Array.isArray(value.tabs)) return false

    if (value.activeArticle === null) {
        return true
    }

    const activeArticle = value.activeArticle
    return isObject(activeArticle)
        && typeof activeArticle.articleId === 'string'
        && typeof activeArticle.title === 'string'
        && typeof activeArticle.content === 'string'
        && typeof activeArticle.contentHash === 'string'
        && typeof activeArticle.truncated === 'boolean'
        && typeof activeArticle.length === 'number'
        && typeof activeArticle.storedLength === 'number'
        && typeof activeArticle.omittedLength === 'number'
}

export async function buildEmergencyPayload(input: EmergencySnapshotInput): Promise<EmergencyPayload> {
    const safeContent = input.articleId ? truncateEmergencyContent(input.content) : null
    const contentHash = safeContent ? (await sha256Hex(input.content)).slice(0, 16) : ''

    return {
        schemaVersion: CRASH_RECOVERY_SCHEMA_VERSION,
        savedAt: Date.now(),
        windowId: input.windowId,
        profileId: input.profileId,
        tabs: input.articleId
            ? [{
                articleId: input.articleId,
                title: input.title,
                dirty: input.dirty,
                cursor: input.cursor ?? null,
                scrollTop: input.scrollTop ?? 0,
            }]
            : [],
        activeArticle: input.articleId && safeContent
            ? {
                articleId: input.articleId,
                title: input.title,
                content: safeContent.content,
                contentHash,
                truncated: safeContent.truncated,
                length: safeContent.length,
                storedLength: safeContent.storedLength,
                omittedLength: safeContent.omittedLength,
            }
            : null,
    }
}

export async function updateCachedEmergencySnapshot(input: EmergencySnapshotInput): Promise<EmergencyPayload> {
    const payload = await buildEmergencyPayload(input)
    cachedPayload = payload
    cachedSerializedPayload = JSON.stringify(payload)
    cachedPayloadKey = getEmergencyPayloadKey(payload.profileId, payload.windowId)
    return payload
}

export function getCachedEmergencyPayload(): EmergencyPayload | null {
    return cachedPayload
}

export function writeEmergencyPayloadSync(payload: EmergencyPayload): EmergencyWriteResult {
    const startedAt = performance.now()
    const storage = getStorage()
    if (!storage) {
        return { ok: false, key: null, durationMs: performance.now() - startedAt, error: 'localStorage unavailable' }
    }

    const key = getEmergencyPayloadKey(payload.profileId, payload.windowId)
    try {
        storage.setItem(EMERGENCY_SCHEMA_KEY, String(CRASH_RECOVERY_SCHEMA_VERSION))
        storage.setItem(key, JSON.stringify(payload))
        return { ok: true, key, durationMs: performance.now() - startedAt }
    } catch (error) {
        return {
            ok: false,
            key,
            durationMs: performance.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

export function writeCachedEmergencyPayloadSync(): EmergencyWriteResult {
    const startedAt = performance.now()
    const storage = getStorage()
    if (!storage) {
        return { ok: false, key: null, durationMs: performance.now() - startedAt, error: 'localStorage unavailable' }
    }
    if (!cachedPayloadKey || !cachedSerializedPayload) {
        return { ok: false, key: null, durationMs: performance.now() - startedAt, error: 'no cached emergency payload' }
    }

    try {
        storage.setItem(EMERGENCY_SCHEMA_KEY, String(CRASH_RECOVERY_SCHEMA_VERSION))
        storage.setItem(cachedPayloadKey, cachedSerializedPayload)
        return { ok: true, key: cachedPayloadKey, durationMs: performance.now() - startedAt }
    } catch (error) {
        return {
            ok: false,
            key: cachedPayloadKey,
            durationMs: performance.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

export function markCleanShutdown(profileId: string, windowId: string, timestamp = Date.now()): void {
    const storage = getStorage()
    if (!storage) return
    storage.setItem(getLastClosedCleanlyKey(profileId, windowId), String(timestamp))
}

export function clearEmergencyPayloadByKey(key: string): void {
    const storage = getStorage()
    if (!storage) return

    const parsed = parseEmergencyKey(key)
    storage.removeItem(key)
    if (parsed) {
        storage.removeItem(getLastClosedCleanlyKey(parsed.profileId, parsed.windowId))
    }
}

export function readEmergencyPayloads(profileId?: string): StoredEmergencyPayload[] {
    const storage = getStorage()
    if (!storage) return []

    const payloads: StoredEmergencyPayload[] = []
    for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index)
        if (!key || !key.startsWith(EMERGENCY_KEY_PREFIX) || key === EMERGENCY_SCHEMA_KEY) {
            continue
        }

        const keyParts = parseEmergencyKey(key)
        if (!keyParts || (profileId && keyParts.profileId !== profileId)) {
            continue
        }

        const raw = storage.getItem(key)
        if (!raw) continue

        try {
            const parsed = JSON.parse(raw) as unknown
            if (!isEmergencyPayload(parsed)) {
                continue
            }

            const cleanlyClosedAt = safeReadNumber(getLastClosedCleanlyKey(parsed.profileId, parsed.windowId))
            payloads.push({
                key,
                payload: parsed,
                cleanlyClosedAt,
                recoverable: cleanlyClosedAt === null || cleanlyClosedAt < parsed.savedAt,
            })
        } catch {
            continue
        }
    }

    return payloads.sort((a, b) => b.payload.savedAt - a.payload.savedAt)
}

export function readRecoverableEmergencyPayloads(profileId?: string): StoredEmergencyPayload[] {
    return readEmergencyPayloads(profileId).filter(item => item.recoverable && item.payload.activeArticle !== null)
}

export function incrementCrashCount(profileId: string): number {
    const storage = getStorage()
    if (!storage) return 0

    const key = getCrashCountKey(profileId)
    const current = safeReadNumber(key) ?? 0
    const next = current + 1
    storage.setItem(key, String(next))
    return next
}

export function clearCrashCount(profileId: string): void {
    const storage = getStorage()
    if (!storage) return
    storage.setItem(getCrashCountKey(profileId), '0')
}

export function createStartupRecoveryState(profileId: string, windowId = getOrCreateWindowId()): CrashRecoveryStartupState {
    const crashCount = incrementCrashCount(profileId)
    return {
        profileId,
        windowId,
        crashCount,
        pendingPayloads: readRecoverableEmergencyPayloads(profileId),
        shouldEnterSafeMode: crashCount >= CRASH_SAFE_MODE_THRESHOLD,
    }
}
