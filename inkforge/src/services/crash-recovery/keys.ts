export const DEFAULT_CRASH_RECOVERY_PROFILE_ID = 'local-default'
export const CURRENT_ACCOUNT_STORAGE_KEY = 'inkforge.currentAccountId'
export const WINDOW_ID_STORAGE_KEY = 'inkforge.windowId'
export const EMERGENCY_SCHEMA_KEY = 'inkforge.emergency.schemaVersion'
export const EMERGENCY_KEY_PREFIX = 'inkforge.emergency.'
export const LAST_CLOSED_CLEANLY_PREFIX = 'inkforge.lastClosedCleanly.'
export const CRASH_COUNT_PREFIX = 'inkforge.crashCount.'

function createWindowId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16)
        crypto.getRandomValues(bytes)
        bytes[6] = (bytes[6] & 0x0f) | 0x40
        bytes[8] = (bytes[8] & 0x3f) | 0x80
        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }

    return `${Date.now().toString(36)}-${performance.now().toString(36).replace('.', '')}`
}

export function getCurrentProfileId(): string {
    if (typeof window === 'undefined') {
        return DEFAULT_CRASH_RECOVERY_PROFILE_ID
    }

    const stored = window.localStorage.getItem(CURRENT_ACCOUNT_STORAGE_KEY)?.trim()
    return stored && stored.length > 0 ? stored : DEFAULT_CRASH_RECOVERY_PROFILE_ID
}

export function getOrCreateWindowId(): string {
    if (typeof window === 'undefined') {
        return createWindowId()
    }

    const existing = window.sessionStorage.getItem(WINDOW_ID_STORAGE_KEY)?.trim()
    if (existing && existing.length > 0) {
        return existing
    }

    const next = createWindowId()
    window.sessionStorage.setItem(WINDOW_ID_STORAGE_KEY, next)
    return next
}

export function getEmergencyPayloadKey(profileId: string, windowId: string): string {
    return `${EMERGENCY_KEY_PREFIX}${profileId}.${windowId}`
}

export function getLastClosedCleanlyKey(profileId: string, windowId: string): string {
    return `${LAST_CLOSED_CLEANLY_PREFIX}${profileId}.${windowId}`
}

export function getCrashCountKey(profileId: string): string {
    return `${CRASH_COUNT_PREFIX}${profileId}`
}

export function parseEmergencyKey(key: string): { profileId: string; windowId: string } | null {
    if (!key.startsWith(EMERGENCY_KEY_PREFIX) || key === EMERGENCY_SCHEMA_KEY) {
        return null
    }

    const remainder = key.slice(EMERGENCY_KEY_PREFIX.length)
    const separator = remainder.indexOf('.')
    if (separator <= 0 || separator >= remainder.length - 1) {
        return null
    }

    return {
        profileId: remainder.slice(0, separator),
        windowId: remainder.slice(separator + 1),
    }
}
