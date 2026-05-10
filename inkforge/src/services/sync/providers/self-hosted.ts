import {
    assertValidSyncConfig,
    buildAuthHeaders,
    normalizeEndpoint,
    SyncProviderError,
    type ConflictRecord,
    type ProviderSyncStatus,
    type ResolveStrategy,
    type SyncConfig,
    type SyncLog,
    type SyncPayload,
    type SyncProvider,
    type SyncPullResult,
} from '../provider'

export class SelfHostedProvider implements SyncProvider {
    readonly id = 'self-hosted'
    readonly config: SyncConfig
    private connected = false
    private lastError: string | undefined
    private logs: SyncLog[] = []

    constructor(config: SyncConfig) {
        assertValidSyncConfig(config)
        this.config = config
    }

    async connect(config: SyncConfig = this.config): Promise<void> {
        assertValidSyncConfig(config)
        const startedAt = Date.now()
        try {
            await this.request('/api/sync/health', { method: 'GET' })
            this.connected = true
            this.lastError = undefined
            this.addLog('connect', 'success', startedAt)
        } catch (error) {
            this.connected = false
            this.lastError = error instanceof Error ? error.message : String(error)
            this.addLog('connect', 'failure', startedAt, 0, this.lastError)
            throw error
        }
    }

    async disconnect(): Promise<void> {
        this.connected = false
    }

    async ping(): Promise<{ latencyMs: number; serverVersion?: string }> {
        const startedAt = performance.now()
        const data = await this.request('/api/sync/health', { method: 'GET' }) as { version?: string }
        return { latencyMs: Math.round(performance.now() - startedAt), serverVersion: data.version }
    }

    async push(docs: SyncPayload[]): Promise<{ succeeded: string[]; failed: string[] }> {
        if (!this.connected) await this.connect(this.config)
        const startedAt = Date.now()
        const result = await this.request('/api/sync/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ docs }),
        }) as { succeeded?: string[]; failed?: string[] }
        this.addLog('push', result.failed && result.failed.length > 0 ? 'partial' : 'success', startedAt, docs.length)
        return { succeeded: result.succeeded ?? [], failed: result.failed ?? [] }
    }

    async pull(since: number): Promise<SyncPullResult> {
        if (!this.connected) await this.connect(this.config)
        return await this.request('/api/sync/pull?since=' + encodeURIComponent(String(since)), { method: 'GET' }) as SyncPullResult
    }

    async listConflicts(): Promise<ConflictRecord[]> {
        if (!this.connected) await this.connect(this.config)
        return await this.request('/api/sync/conflicts', { method: 'GET' }) as ConflictRecord[]
    }

    async resolveConflict(id: string, strategy: ResolveStrategy): Promise<void> {
        if (!this.connected) await this.connect(this.config)
        await this.request('/api/sync/conflicts/' + encodeURIComponent(id) + '/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(strategy),
        })
    }

    getStatus(): ProviderSyncStatus {
        return {
            state: this.lastError ? 'error' : this.connected ? 'idle' : 'paused',
            pendingPushCount: 0,
            pendingConflictCount: 0,
            providerId: this.id,
            errorMessage: this.lastError,
        }
    }

    async getLogs(limit = 50): Promise<SyncLog[]> {
        return this.logs.slice(-limit).reverse()
    }

    private async request(path: string, init: RequestInit): Promise<unknown> {
        const headers = new Headers(init.headers)
        for (const [key, value] of Object.entries(buildAuthHeaders(this.config.credentials) as Record<string, string>)) {
            headers.set(key, value)
        }
        const response = await fetch(normalizeEndpoint(this.config.endpoint) + path, { ...init, headers })
        if (response.status === 401 || response.status === 403) {
            throw new SyncProviderError('AUTH_FAILED', 'SelfHosted authentication failed', false, { status: response.status })
        }
        if (!response.ok) {
            throw new SyncProviderError('REMOTE_REJECTED', 'SelfHosted request failed', response.status >= 500, { status: response.status })
        }
        if (response.status === 204) return null
        return await response.json()
    }

    private addLog(operation: SyncLog['operation'], status: SyncLog['status'], startedAt: number, docCount = 0, errorMessage?: string): void {
        const finishedAt = Date.now()
        this.logs.push({
            id: crypto.randomUUID(),
            providerId: this.id,
            profileId: this.config.profileId,
            operation,
            status,
            docCount,
            errorMessage,
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
        })
    }
}
