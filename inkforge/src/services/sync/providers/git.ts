import { tauriInvoke } from '@/utils/platform'
import {
    assertValidSyncConfig,
    createEmptyPullResult,
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

interface GitStatusResponse {
    connected: boolean
    branch?: string
    remote?: string
    serverVersion?: string
}

export class GitProvider implements SyncProvider {
    readonly id = 'git'
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
            const status = await tauriInvoke<GitStatusResponse>('git_sync_status', {
                remote: config.endpoint,
                profileId: config.profileId,
            })
            this.connected = status.connected
            this.lastError = undefined
            this.addLog('connect', 'success', startedAt)
        } catch (error) {
            this.connected = false
            this.lastError = error instanceof Error ? error.message : String(error)
            this.addLog('connect', 'failure', startedAt, 0, this.lastError)
            throw new SyncProviderError('RUNTIME_UNAVAILABLE', 'Git sync requires the Tauri git_sync_status command and a configured Git runtime', false, { message: this.lastError })
        }
    }

    async disconnect(): Promise<void> {
        this.connected = false
    }

    async ping(): Promise<{ latencyMs: number; serverVersion?: string }> {
        const startedAt = performance.now()
        const status = await tauriInvoke<GitStatusResponse>('git_sync_status', {
            remote: this.config.endpoint,
            profileId: this.config.profileId,
        })
        return { latencyMs: Math.round(performance.now() - startedAt), serverVersion: status.serverVersion }
    }

    async push(docs: SyncPayload[]): Promise<{ succeeded: string[]; failed: string[] }> {
        if (!this.connected) await this.connect(this.config)
        const startedAt = Date.now()
        const result = await tauriInvoke<{ succeeded: string[]; failed: string[] }>('git_sync_push', {
            remote: this.config.endpoint,
            profileId: this.config.profileId,
            docs,
        })
        this.addLog('push', result.failed.length > 0 ? 'partial' : 'success', startedAt, docs.length)
        return result
    }

    async pull(since: number): Promise<SyncPullResult> {
        if (!this.connected) await this.connect(this.config)
        const result = await tauriInvoke<SyncPullResult | null>('git_sync_pull', {
            remote: this.config.endpoint,
            profileId: this.config.profileId,
            since,
        })
        return result ?? createEmptyPullResult()
    }

    async listConflicts(): Promise<ConflictRecord[]> {
        if (!this.connected) await this.connect(this.config)
        return await tauriInvoke<ConflictRecord[]>('git_sync_conflicts', {
            remote: this.config.endpoint,
            profileId: this.config.profileId,
        })
    }

    async resolveConflict(id: string, strategy: ResolveStrategy): Promise<void> {
        if (!this.connected) await this.connect(this.config)
        await tauriInvoke<void>('git_sync_resolve_conflict', {
            remote: this.config.endpoint,
            profileId: this.config.profileId,
            id,
            strategy,
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
