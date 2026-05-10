import type { VectorClock } from './vector-clock'

export type SyncProviderId = 'webdav' | 'git' | 'self-hosted' | (string & {})

export type ConflictStrategy = 'three-way-merge' | 'manual-always'

export type SyncCredentials =
    | { kind: 'basic'; username: string; passwordHash: string }
    | { kind: 'digest'; username: string; passwordHash: string }
    | { kind: 'token'; token: string }
    | { kind: 'ssh'; keyPath: string; passphrase?: string }
    | { kind: 'none' }

export interface SyncConfig {
    providerId: SyncProviderId
    displayName: string
    endpoint: string
    credentials: SyncCredentials
    options: Record<string, unknown>
    syncIntervalMs: number
    conflictStrategy: ConflictStrategy
    enabled: boolean
    profileId: string
}

export interface SyncPayload {
    docId: string
    title: string
    content: string
    contentHash: string
    updatedAt: number
    vectorClock: VectorClock
    attachmentIds: string[]
    metaSnapshot: Record<string, unknown>
}

export interface SyncPullResult {
    updated: SyncPayload[]
    deleted: string[]
    conflicts: ConflictRecord[]
    syncedAt: number
}

export type ConflictStatus = 'pending' | 'merging' | 'resolved' | 'failed'

export interface ConflictRecord {
    id: string
    docId: string
    localPayload: SyncPayload
    remotePayload: SyncPayload
    basePayload?: SyncPayload
    detectedAt: number
    status: ConflictStatus
    resolvedAt?: number
    resolvedBy?: 'local' | 'remote' | 'manual'
    auditId?: string
}

export type SyncLogOperation = 'push' | 'pull' | 'connect' | 'disconnect' | 'conflict_resolve'
export type SyncLogStatus = 'success' | 'failure' | 'partial'

export interface SyncLog {
    id: string
    providerId: SyncProviderId
    profileId: string
    operation: SyncLogOperation
    status: SyncLogStatus
    docCount?: number
    errorCode?: string
    errorMessage?: string
    startedAt: number
    finishedAt: number
    durationMs: number
}

export type ProviderSyncState = 'idle' | 'connecting' | 'syncing' | 'conflict' | 'paused' | 'error' | 'offline'

export interface ProviderSyncStatus {
    state: ProviderSyncState
    lastSyncAt?: number
    pendingPushCount: number
    pendingConflictCount: number
    errorMessage?: string
    providerId: SyncProviderId
}

export type ResolveStrategy =
    | { kind: 'accept-local' }
    | { kind: 'accept-remote' }
    | { kind: 'manual'; mergedContent: string }

export interface SyncProvider {
    readonly id: SyncProviderId
    readonly config: SyncConfig
    connect(config: SyncConfig): Promise<void>
    disconnect(): Promise<void>
    ping(): Promise<{ latencyMs: number; serverVersion?: string }>
    push(docs: SyncPayload[]): Promise<{ succeeded: string[]; failed: string[] }>
    pull(since: number): Promise<SyncPullResult>
    listConflicts(): Promise<ConflictRecord[]>
    resolveConflict(id: string, strategy: ResolveStrategy): Promise<void>
    getStatus(): ProviderSyncStatus
    getLogs(limit?: number): Promise<SyncLog[]>
}

export type SyncProviderErrorCode =
    | 'CONFIG_INVALID'
    | 'CREDENTIAL_SECRET_UNAVAILABLE'
    | 'PROVIDER_UNCONFIGURED'
    | 'RUNTIME_UNAVAILABLE'
    | 'NETWORK_FAILED'
    | 'AUTH_FAILED'
    | 'REMOTE_REJECTED'
    | 'NOT_IMPLEMENTED_BY_REMOTE'

export class SyncProviderError extends Error {
    readonly code: SyncProviderErrorCode
    readonly retryable: boolean
    readonly context?: Record<string, unknown>

    constructor(code: SyncProviderErrorCode, message: string, retryable = false, context?: Record<string, unknown>) {
        super(message)
        this.name = 'SyncProviderError'
        this.code = code
        this.retryable = retryable
        this.context = context
        Object.setPrototypeOf(this, SyncProviderError.prototype)
    }
}

export interface SyncConfigValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
}

export function validateSyncConfig(config: SyncConfig): SyncConfigValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!config.providerId) errors.push('providerId is required')
    if (!config.displayName.trim()) errors.push('displayName is required')
    if (!config.profileId.trim()) errors.push('profileId is required')
    if (!Number.isInteger(config.syncIntervalMs) || config.syncIntervalMs < 30_000) {
        errors.push('syncIntervalMs must be at least 30000')
    }

    if (config.providerId === 'webdav' || config.providerId === 'self-hosted') {
        if (!config.endpoint.trim()) {
            errors.push('endpoint is required')
        } else {
            try {
                const url = new URL(config.endpoint)
                if (url.protocol === 'http:') {
                    warnings.push('HTTP endpoint is insecure and must be confirmed by the user')
                }
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    errors.push('endpoint must be HTTP or HTTPS')
                }
            } catch {
                errors.push('endpoint must be a valid URL')
            }
        }
    }

    if (config.providerId === 'git') {
        const endpoint = config.endpoint.trim()
        if (!endpoint) {
            errors.push('git remote endpoint is required')
        }
        if (endpoint.toLowerCase().startsWith('file://')) {
            errors.push('git remote must not use file protocol')
        }
        if (endpoint.toLowerCase().startsWith('http://')) {
            errors.push('git remote must use https or ssh')
        }
    }

    if (config.credentials.kind === 'basic' || config.credentials.kind === 'digest') {
        warnings.push('basic and digest credentials require a secure runtime secret; IndexedDB stores only passwordHash')
        if (!config.credentials.username.trim()) errors.push('username is required')
        if (!config.credentials.passwordHash.trim()) errors.push('passwordHash is required')
    }

    if (config.credentials.kind === 'token' && !config.credentials.token.trim()) {
        errors.push('token is required')
    }

    if (config.credentials.kind === 'ssh' && !config.credentials.keyPath.trim()) {
        errors.push('ssh keyPath is required')
    }

    return { valid: errors.length === 0, errors, warnings }
}

export function assertValidSyncConfig(config: SyncConfig): void {
    const validation = validateSyncConfig(config)
    if (!validation.valid) {
        throw new SyncProviderError('CONFIG_INVALID', validation.errors.join('; '), false, { providerId: config.providerId })
    }
}

export function buildAuthHeaders(credentials: SyncCredentials): HeadersInit {
    if (credentials.kind === 'none') return {}
    if (credentials.kind === 'token') return { Authorization: 'Bearer ' + credentials.token }
    if (credentials.kind === 'basic' || credentials.kind === 'digest') {
        throw new SyncProviderError(
            'CREDENTIAL_SECRET_UNAVAILABLE',
            'The stored credential is a password hash, not a transport secret. Reconnect the provider through a secure runtime secret flow.',
            false,
            { kind: credentials.kind }
        )
    }
    if (credentials.kind === 'ssh') return {}
    return {}
}

export function normalizeEndpoint(endpoint: string): string {
    return endpoint.replace(/\/+$/u, '')
}

export function createEmptyPullResult(): SyncPullResult {
    return {
        updated: [],
        deleted: [],
        conflicts: [],
        syncedAt: Date.now(),
    }
}
