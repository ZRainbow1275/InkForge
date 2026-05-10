import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'
import { logger } from '@/services/error'
import { auditLog } from '@/services/audit'
import { ChangeTracker, type ChangeRecord } from './change-tracker'
import { ConflictResolver, type SyncConflict, type ConflictStrategy } from './conflict-resolver'
import { syncRepository } from './repository'
import { SyncProviderError, type SyncPayload, type SyncProvider } from './provider'

export type SyncStatus = 'idle' | 'syncing' | 'conflict' | 'error' | 'offline' | 'paused'

export interface SyncState {
    status: SyncStatus
    lastSyncAt: Date | null
    pendingChanges: number
    conflicts: SyncConflict[]
    lastError: string | null
    autoSyncEnabled: boolean
    providerId: string | null
}

export interface SyncResult {
    success: boolean
    uploaded: number
    downloaded: number
    newConflicts: number
    error?: string
}

export interface SyncEngineConfig {
    autoSyncIntervalMs: number
    maxRetries: number
    dedupeWindowMs: number
    profileId: string
}

const DEFAULT_CONFIG: SyncEngineConfig = {
    autoSyncIntervalMs: 30_000,
    maxRetries: 3,
    dedupeWindowMs: 2_000,
    profileId: 'local-default',
}

export class SyncEngine {
    private state: SyncState
    private readonly config: SyncEngineConfig
    private readonly changeTracker: ChangeTracker
    private readonly conflictResolver: ConflictResolver
    private provider: SyncProvider | null = null
    private autoSyncInterval: ReturnType<typeof setInterval> | null = null
    private stateListeners: Array<(state: SyncState) => void> = []
    private isSyncLock = false
    private onlineHandler: (() => void) | null = null
    private offlineHandler: (() => void) | null = null

    constructor(config: Partial<SyncEngineConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
        this.changeTracker = new ChangeTracker(this.config.dedupeWindowMs)
        this.conflictResolver = new ConflictResolver()
        this.state = {
            status: 'idle',
            lastSyncAt: null,
            pendingChanges: 0,
            conflicts: [],
            lastError: null,
            autoSyncEnabled: false,
            providerId: null,
        }

        this.changeTracker.onStateChange((trackerState) => {
            this.updateState({ pendingChanges: trackerState.pendingCount })
        })

        this.conflictResolver.onConflictsChange((conflicts) => {
            this.updateState({
                conflicts,
                status: conflicts.length > 0 ? 'conflict' : this.state.status,
            })
        })

        this.setupNetworkListeners()
    }

    getState(): Readonly<SyncState> {
        return { ...this.state }
    }

    setProvider(provider: SyncProvider | null): void {
        this.provider = provider
        this.updateState({
            providerId: provider?.id ?? null,
            status: provider ? 'idle' : 'paused',
            lastError: provider ? null : this.state.lastError,
        })
    }

    getProvider(): SyncProvider | null {
        return this.provider
    }

    async markDirty(documentId: string, content?: string, operation: 'create' | 'update' | 'delete' = 'update'): Promise<void> {
        const record = await this.changeTracker.trackChange(documentId, operation, content)
        await syncRepository.enqueueOutbox({
            id: record.id,
            articleId: record.articleId,
            operation: record.operation,
            checksum: record.checksum,
            profileId: this.config.profileId,
            providerId: this.provider?.id ?? 'unconfigured',
        })
    }

    async sync(): Promise<SyncResult> {
        if (this.isSyncLock) {
            logger.debug('[SyncEngine] 同步已在进行中，跳过')
            return { success: true, uploaded: 0, downloaded: 0, newConflicts: 0 }
        }

        this.isSyncLock = true
        const startedAt = Date.now()
        this.updateState({ status: 'syncing', lastError: null })

        try {
            if (!this.isOnline()) {
                this.updateState({ status: 'offline' })
                return await this.failSync(startedAt, '当前处于离线状态')
            }

            const pendingChanges = this.changeTracker.getPendingChanges()
            if (!this.provider) {
                this.updateState({ status: 'paused' })
                const suffix = pendingChanges.length > 0 ? '，已保留待同步队列' : ''
                return await this.failSync(startedAt, `同步提供者未配置${suffix}`)
            }

            if (pendingChanges.length === 0) {
                this.updateState({
                    status: this.state.conflicts.length > 0 ? 'conflict' : 'idle',
                    lastSyncAt: new Date(),
                })
                return { success: true, uploaded: 0, downloaded: 0, newConflicts: 0 }
            }

            const payloads = await this.buildPayloads(pendingChanges)
            const pushResult = await this.provider.push(payloads)
            const succeededChangeIds = pendingChanges
                .filter(change => pushResult.succeeded.includes(change.articleId))
                .map(change => change.id)

            this.changeTracker.markSyncedBatch(succeededChangeIds)
            await syncRepository.markOutboxSynced(succeededChangeIds)

            if (pushResult.failed.length > 0) {
                const failedChangeIds = pendingChanges
                    .filter(change => pushResult.failed.includes(change.articleId))
                    .map(change => change.id)
                await syncRepository.markOutboxFailed(failedChangeIds, 'Provider push failed for the document')
            }

            const pullResult = await this.provider.pull(this.state.lastSyncAt?.getTime() ?? 0)
            for (const conflict of pullResult.conflicts) {
                await syncRepository.upsertConflict({
                    ...conflict,
                    profileId: this.config.profileId,
                    providerId: this.provider.id,
                    createdAt: new Date(conflict.detectedAt),
                    updatedAt: new Date(),
                })
            }

            const result: SyncResult = {
                success: pushResult.failed.length === 0,
                uploaded: pushResult.succeeded.length,
                downloaded: pullResult.updated.length,
                newConflicts: pullResult.conflicts.length,
                error: pushResult.failed.length > 0 ? '部分文档同步失败' : undefined,
            }

            await syncRepository.addLog({
                id: generateId(),
                providerId: this.provider.id,
                profileId: this.config.profileId,
                operation: 'push',
                status: result.success ? 'success' : 'partial',
                docCount: pendingChanges.length,
                errorMessage: result.error,
                startedAt,
                finishedAt: Date.now(),
                durationMs: Date.now() - startedAt,
            })
            await auditLog('sync.push', {
                actorId: this.config.profileId,
                profileId: this.config.profileId,
                severity: result.success ? 'info' : 'warning',
                outcome: result.success ? 'success' : 'partial',
                reason: result.error,
                payload: {
                    providerId: this.provider.id,
                    pendingChanges: pendingChanges.length,
                    uploaded: result.uploaded,
                    failed: pushResult.failed.length,
                    downloaded: result.downloaded,
                    newConflicts: result.newConflicts,
                },
                source: 'SyncEngine.sync',
            })
            await auditLog('sync.pull', {
                actorId: this.config.profileId,
                profileId: this.config.profileId,
                severity: pullResult.conflicts.length > 0 ? 'warning' : 'info',
                outcome: pullResult.conflicts.length > 0 ? 'partial' : 'success',
                payload: {
                    providerId: this.provider.id,
                    updated: pullResult.updated.length,
                    deleted: pullResult.deleted.length,
                    conflicts: pullResult.conflicts.length,
                },
                source: 'SyncEngine.sync',
            })

            this.updateState({
                status: result.newConflicts > 0 ? 'conflict' : result.success ? 'idle' : 'error',
                lastSyncAt: result.success ? new Date() : this.state.lastSyncAt,
                lastError: result.error ?? null,
            })

            return result
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            logger.error('[SyncEngine] 同步失败', err)
            await syncRepository.addLog({
                id: generateId(),
                providerId: this.provider?.id ?? 'unconfigured',
                profileId: this.config.profileId,
                operation: 'push',
                status: 'failure',
                errorCode: err instanceof SyncProviderError ? err.code : undefined,
                errorMessage: errorMsg,
                startedAt,
                finishedAt: Date.now(),
                durationMs: Date.now() - startedAt,
            })
            await auditLog('sync.push', {
                actorId: this.config.profileId,
                profileId: this.config.profileId,
                severity: 'error',
                outcome: 'failure',
                reason: errorMsg,
                payload: {
                    providerId: this.provider?.id ?? 'unconfigured',
                    errorCode: err instanceof SyncProviderError ? err.code : undefined,
                },
                source: 'SyncEngine.sync',
            })
            this.updateState({ status: 'error', lastError: errorMsg })
            return { success: false, uploaded: 0, downloaded: 0, newConflicts: 0, error: errorMsg }
        } finally {
            this.isSyncLock = false
        }
    }

    async resolveConflict(documentId: string, strategy: ConflictStrategy): Promise<void> {
        const resolution = this.conflictResolver.resolveConflictByDocumentId(documentId, strategy)
        if (!resolution) {
            logger.warn('[SyncEngine] 未找到文档的冲突记录', { documentId })
            return
        }
        const remaining = this.conflictResolver.getActiveConflicts()
        this.updateState({ conflicts: remaining, status: remaining.length > 0 ? 'conflict' : 'idle' })
        await auditLog('sync.conflict.resolve', {
            actorId: this.config.profileId,
            profileId: this.config.profileId,
            docId: documentId,
            resourceId: documentId,
            resourceKind: 'document',
            severity: 'warning',
            outcome: 'success',
            payload: { strategy, remainingConflicts: remaining.length },
            source: 'SyncEngine.resolveConflict',
        })
        logger.info('[SyncEngine] 冲突已解决', { documentId, strategy, remainingConflicts: remaining.length })
    }

    startAutoSync(intervalMs?: number): void {
        if (this.autoSyncInterval) this.stopAutoSync()
        const interval = intervalMs ?? this.config.autoSyncIntervalMs
        this.autoSyncInterval = setInterval(() => {
            void this.sync()
        }, interval)
        this.updateState({ autoSyncEnabled: true })
        logger.info('[SyncEngine] 自动同步已启动', { intervalMs: interval })
    }

    stopAutoSync(): void {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval)
            this.autoSyncInterval = null
        }
        this.updateState({ autoSyncEnabled: false })
        logger.info('[SyncEngine] 自动同步已停止')
    }

    onStateChange(callback: (state: SyncState) => void): () => void {
        this.stateListeners.push(callback)
        return () => {
            const index = this.stateListeners.indexOf(callback)
            if (index !== -1) this.stateListeners.splice(index, 1)
        }
    }

    getChangeTracker(): ChangeTracker {
        return this.changeTracker
    }

    getConflictResolver(): ConflictResolver {
        return this.conflictResolver
    }

    dispose(): void {
        this.stopAutoSync()
        this.teardownNetworkListeners()
        this.stateListeners = []
        this.changeTracker.clear()
        logger.info('[SyncEngine] 引擎已销毁')
    }

    private async failSync(startedAt: number, errorMessage: string): Promise<SyncResult> {
        await syncRepository.addLog({
            id: generateId(),
            providerId: this.provider?.id ?? 'unconfigured',
            profileId: this.config.profileId,
            operation: 'push',
            status: 'failure',
            errorCode: 'PROVIDER_UNCONFIGURED',
            errorMessage,
            startedAt,
            finishedAt: Date.now(),
            durationMs: Date.now() - startedAt,
        })
        await auditLog('sync.push', {
            actorId: this.config.profileId,
            profileId: this.config.profileId,
            severity: 'warning',
            outcome: 'failure',
            reason: errorMessage,
            payload: {
                providerId: this.provider?.id ?? 'unconfigured',
                errorCode: 'PROVIDER_UNCONFIGURED',
            },
            source: 'SyncEngine.failSync',
        })
        this.updateState({ lastError: errorMessage })
        return { success: false, uploaded: 0, downloaded: 0, newConflicts: 0, error: errorMessage }
    }

    private async buildPayloads(changes: ChangeRecord[]): Promise<SyncPayload[]> {
        const payloads: SyncPayload[] = []
        for (const change of changes) {
            const article = await db.articles.get(change.articleId)
            if (!article && change.operation !== 'delete') continue
            const updatedAt = article?.updatedAt instanceof Date ? article.updatedAt.getTime() : Date.now()
            payloads.push({
                docId: change.articleId,
                title: article?.title ?? change.articleId,
                content: change.operation === 'delete' ? '' : article?.rawContent ?? '',
                contentHash: change.checksum,
                updatedAt,
                vectorClock: { [this.config.profileId]: Math.max(1, Math.floor(updatedAt / 1000)) },
                attachmentIds: article?.images ?? [],
                metaSnapshot: {
                    operation: change.operation,
                    status: article?.status ?? 'deleted',
                    categoryId: article?.categoryId ?? null,
                    sourceUrl: article?.sourceUrl ?? null,
                    tags: article?.tags ?? [],
                },
            })
        }
        return payloads
    }

    private isOnline(): boolean {
        if (typeof navigator !== 'undefined' && 'onLine' in navigator) return navigator.onLine
        return true
    }

    private setupNetworkListeners(): void {
        if (typeof window === 'undefined') return
        this.onlineHandler = () => {
            logger.info('[SyncEngine] 网络已恢复，尝试同步')
            if (this.state.status === 'offline') {
                this.updateState({ status: this.provider ? 'idle' : 'paused' })
                void this.sync()
            }
        }
        this.offlineHandler = () => {
            logger.info('[SyncEngine] 网络已断开')
            this.updateState({ status: 'offline' })
        }
        window.addEventListener('online', this.onlineHandler)
        window.addEventListener('offline', this.offlineHandler)
    }

    private teardownNetworkListeners(): void {
        if (typeof window === 'undefined') return
        if (this.onlineHandler) {
            window.removeEventListener('online', this.onlineHandler)
            this.onlineHandler = null
        }
        if (this.offlineHandler) {
            window.removeEventListener('offline', this.offlineHandler)
            this.offlineHandler = null
        }
    }

    private updateState(partial: Partial<SyncState>): void {
        this.state = { ...this.state, ...partial }
        for (const listener of this.stateListeners) {
            try {
                listener(this.getState())
            } catch (err) {
                logger.error('[SyncEngine] 状态监听器执行异常', err)
            }
        }
    }
}
