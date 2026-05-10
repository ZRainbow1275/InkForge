import {
    assertValidSyncConfig,
    buildAuthHeaders,
    createEmptyPullResult,
    normalizeEndpoint,
    SyncProviderError,
    type ConflictRecord,
    type ResolveStrategy,
    type SyncConfig,
    type SyncLog,
    type SyncPayload,
    type SyncProvider,
    type SyncPullResult,
    type ProviderSyncStatus,
} from '../provider'

function assertOk(response: Response, operation: string): void {
    if (response.status === 401 || response.status === 403) {
        throw new SyncProviderError('AUTH_FAILED', operation + ' authentication failed', false, { status: response.status })
    }
    if (!response.ok && response.status !== 207) {
        throw new SyncProviderError('REMOTE_REJECTED', operation + ' rejected by WebDAV server', response.status >= 500, { status: response.status })
    }
}

export class WebDAVProvider implements SyncProvider {
    readonly id = 'webdav'
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
            const response = await fetch(normalizeEndpoint(config.endpoint) + '/', {
                method: 'PROPFIND',
                headers: {
                    Depth: '0',
                    ...buildAuthHeaders(config.credentials),
                },
            })
            assertOk(response, 'connect')
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
        const response = await fetch(normalizeEndpoint(this.config.endpoint) + '/', {
            method: 'PROPFIND',
            headers: {
                Depth: '0',
                ...buildAuthHeaders(this.config.credentials),
            },
        })
        assertOk(response, 'ping')
        return {
            latencyMs: Math.round(performance.now() - startedAt),
            serverVersion: response.headers.get('server') ?? undefined,
        }
    }

    async push(docs: SyncPayload[]): Promise<{ succeeded: string[]; failed: string[] }> {
        if (!this.connected) await this.connect(this.config)
        const endpoint = normalizeEndpoint(this.config.endpoint)
        const succeeded: string[] = []
        const failed: string[] = []
        const startedAt = Date.now()

        for (const doc of docs) {
            try {
                const response = await fetch(endpoint + '/inkforge-documents/' + encodeURIComponent(doc.docId) + '.json', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...buildAuthHeaders(this.config.credentials),
                    },
                    body: JSON.stringify(doc),
                })
                assertOk(response, 'push')
                succeeded.push(doc.docId)
            } catch {
                failed.push(doc.docId)
            }
        }

        this.addLog('push', failed.length > 0 ? 'partial' : 'success', startedAt, docs.length)
        return { succeeded, failed }
    }

    async pull(since: number): Promise<SyncPullResult> {
        if (!this.connected) await this.connect(this.config)
        const response = await fetch(normalizeEndpoint(this.config.endpoint) + '/inkforge-manifest.json?since=' + encodeURIComponent(String(since)), {
            method: 'GET',
            headers: buildAuthHeaders(this.config.credentials),
        })
        if (response.status === 404) return createEmptyPullResult()
        assertOk(response, 'pull')
        return await response.json() as SyncPullResult
    }

    async listConflicts(): Promise<ConflictRecord[]> {
        return []
    }

    async resolveConflict(_id: string, _strategy: ResolveStrategy): Promise<void> {
        throw new SyncProviderError('NOT_IMPLEMENTED_BY_REMOTE', 'WebDAV conflict resolution requires the local conflict modal to persist a merged payload first')
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
