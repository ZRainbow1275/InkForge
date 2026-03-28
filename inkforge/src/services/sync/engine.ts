/**
 * 同步引擎
 *
 * 本地优先架构:
 * - 所有操作先写本地 IndexedDB，后台异步同步到远端
 * - 离线时正常工作，联网后自动同步
 * - 端到端加密: 服务器仅存储密文
 *
 * 同步策略:
 * 1. 增量同步 -- 仅上传变更的文章
 * 2. 冲突检测 -- 基于版本向量 + checksum 比对
 * 3. 离线支持 -- 本地队列 + 联网后批量上传
 * 4. 端到端加密 -- 使用 .inkforge 格式
 *
 * 生命周期:
 *   构造 -> startAutoSync() -> sync() [周期触发] -> stopAutoSync() -> dispose()
 */

import { logger } from '@/services/error'
import { articleRepository, contentRepository } from '@/services/repository'
import type { SyncSettings, SyncTarget } from '@/stores/settings'
import type { Article, EditedContent, Version } from '@/types'
import { getMasterKey } from '@/utils/crypto'
import { addSyncLog, db, type Document as SyncDocument } from '@/utils/db'
import { logSync } from '@/utils/activity-logger'
import { generateId } from '@/utils/uuid'
import {
    createSyncAdapter,
    isConfiguredSyncTarget,
    type RemoteManifestEntry,
    type SyncConnectionResult,
    type SyncResolvePayload,
} from './adapters'
import { createResolvedRemoteManifestEntry } from './adapters/shared'
import { syncArticleDocumentSnapshot } from './article-document-bridge'
import { ChangeTracker, type ChangeRecord } from './change-tracker'
import { ConflictResolver, type SyncConflict, type ConflictStrategy } from './conflict-resolver'
import { deserializeDocument, serializeDocument } from './format'

// ===================================================================
// 类型定义
// ===================================================================

/** 同步状态枚举 */
export type SyncStatus = 'idle' | 'syncing' | 'conflict' | 'error' | 'offline'

/** 同步状态 */
export interface SyncState {
    /** 当前同步状态 */
    status: SyncStatus
    /** 最后一次成功同步的时间 */
    lastSyncAt: Date | null
    /** 待同步的变更数量 */
    pendingChanges: number
    /** 当前待同步的文档 ID 列表 */
    trackedDocumentIds: string[]
    /** 活跃冲突列表 */
    conflicts: SyncConflict[]
    /** 最后一次错误信息 */
    lastError: string | null
    /** 是否正在自动同步 */
    autoSyncEnabled: boolean
}

/** 同步结果 */
export interface SyncResult {
    /** 是否成功 */
    success: boolean
    /** 上传的变更数量 */
    uploaded: number
    /** 下载的变更数量 */
    downloaded: number
    /** 新发现的冲突数量 */
    newConflicts: number
    /** 错误信息 (如果失败) */
    error?: string
}

export interface SyncRuntimeSettings {
    enabled: boolean
    target: SyncTarget
    conflictStrategy: SyncSettings['conflictStrategy']
    encryptionEnabled: boolean
    selectedCategoryIds: string[]
}

/** 同步引擎配置 */
export interface SyncEngineConfig {
    /** 自动同步间隔 (毫秒, 默认 30 秒) */
    autoSyncIntervalMs: number
    /** 最大重试次数 */
    maxRetries: number
    /** 变更去重窗口 (毫秒) */
    dedupeWindowMs: number
    /** 读取运行时同步设置 */
    getSyncSettings?: () => SyncRuntimeSettings
}

/** 默认配置 */
const DEFAULT_CONFIG: SyncEngineConfig = {
    autoSyncIntervalMs: 30_000,
    maxRetries: 3,
    dedupeWindowMs: 2_000,
    getSyncSettings: undefined,
}

// ===================================================================
// 同步引擎
// ===================================================================

/**
 * 同步引擎
 *
 * 管理本地变更追踪、冲突检测和远端同步。
 * 目前为本地模式 (无远端服务器)，所有操作在本地完成。
 * 预留了远端同步接口，待服务器端实现后接入。
 */
export class SyncEngine {
    /** 当前同步状态 */
    private state: SyncState

    /** 配置 */
    private readonly config: SyncEngineConfig

    /** 变更追踪器 */
    private readonly changeTracker: ChangeTracker

    /** 冲突解决器 */
    private readonly conflictResolver: ConflictResolver

    /** 自动同步定时器 */
    private autoSyncInterval: ReturnType<typeof setInterval> | null = null

    /** 状态变化监听器 */
    private stateListeners: Array<(state: SyncState) => void> = []

    /** 是否正在执行同步 (防止并发) */
    private isSyncLock: boolean = false

    /** 网络状态监听器引用 (用于清理) */
    private onlineHandler: (() => void) | null = null
    private offlineHandler: (() => void) | null = null
    /** 最近一次远端清单缓存 */
    private remoteEntries: Map<string, RemoteManifestEntry> = new Map()

    constructor(config: Partial<SyncEngineConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }

        this.changeTracker = new ChangeTracker(this.config.dedupeWindowMs, 'persistent')
        this.conflictResolver = new ConflictResolver()

        this.state = {
            status: 'idle',
            lastSyncAt: null,
            pendingChanges: 0,
            trackedDocumentIds: [],
            conflicts: [],
            lastError: null,
            autoSyncEnabled: false,
        }

        // 监听变更追踪器状态
        this.changeTracker.onStateChange((trackerState) => {
            this.updateState({
                pendingChanges: trackerState.pendingCount,
                trackedDocumentIds: trackerState.trackedDocuments,
            })
        })

        // 监听冲突变化
        this.conflictResolver.onConflictsChange((conflicts) => {
            this.updateState({
                conflicts,
                status: conflicts.length > 0 ? 'conflict' : this.state.status,
            })
        })

        // 监听网络状态
        this.setupNetworkListeners()
    }

    // ---------------------------------------------------------------
    // 公共 API
    // ---------------------------------------------------------------

    /**
     * 获取当前同步状态 (只读)
     */
    getState(): Readonly<SyncState> {
        return { ...this.state }
    }

    /**
     * 标记文档已修改 (加入待同步队列)
     *
     * @param documentId - 文档 ID
     * @param content - 文档内容 (用于校验和计算)
     * @param operation - 操作类型 (默认 'update')
     */
    async markDirty(
        documentId: string,
        content?: string,
        operation: 'create' | 'update' | 'delete' = 'update'
    ): Promise<void> {
        const change = await this.changeTracker.trackChange(documentId, operation, content)
        await this.seedLocalVersion(change, content)
    }

    async testConnection(targetOverride?: SyncTarget): Promise<SyncConnectionResult> {
        const target = targetOverride ?? this.getRuntimeSettings().target
        const adapter = createSyncAdapter(target)

        if (!adapter) {
            return {
                success: false,
                message: '未配置同步目标',
            }
        }

        try {
            const result = await adapter.testConnection()
            return result
        } catch (error) {
            const message = error instanceof Error ? error.message : '同步目标连接失败'
            logger.error('[SyncEngine] 同步目标连接测试失败', error, {
                targetType: target.type,
            })

            return {
                success: false,
                message,
            }
        }
    }

    /**
     * 执行同步
     *
     * @description
     * 当前为本地模式实现:
     * - 检查网络状态
     * - 处理待同步队列
     * - 记录同步结果
     *
     * 当远端服务器就绪后，此方法将:
     * 1. 拉取远端变更列表 (仅 checksum)
     * 2. 比对本地版本向量
     * 3. 检测冲突
     * 4. 下载新内容 (加密态)
     * 5. 上传本地变更 (加密态)
     * 6. 更新同步状态
     */
    async sync(): Promise<SyncResult> {
        // 防止并发同步
        if (this.isSyncLock) {
            logger.debug('[SyncEngine] 同步已在进行中，跳过')
            return { success: true, uploaded: 0, downloaded: 0, newConflicts: 0 }
        }

        this.isSyncLock = true
        this.updateState({ status: 'syncing', lastError: null })

        try {
            // 检查网络状态
            if (!this.isOnline()) {
                this.updateState({ status: 'offline' })
                return {
                    success: false,
                    uploaded: 0,
                    downloaded: 0,
                    newConflicts: 0,
                    error: '当前处于离线状态',
                }
            }

            const pendingChanges = await this.changeTracker.getPendingChanges()
            const runtime = this.getRuntimeSettings()
            // 手动同步不应受自动同步开关限制；只要目标已配置，就应走远端流程。
            const hasRemoteTarget = isConfiguredSyncTarget(runtime.target)

            if (!hasRemoteTarget && pendingChanges.length === 0) {
                this.updateState({
                    status: this.state.conflicts.length > 0 ? 'conflict' : 'idle',
                    lastSyncAt: new Date(),
                })
                return { success: true, uploaded: 0, downloaded: 0, newConflicts: 0 }
            }

            const result = hasRemoteTarget
                ? await this.processRemoteSync(pendingChanges, runtime)
                : await this.processLocalSync(pendingChanges)

            this.updateState({
                status: result.newConflicts > 0 ? 'conflict' : 'idle',
                lastSyncAt: new Date(),
            })

            return result
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            logger.error('[SyncEngine] 同步失败', err)

            this.updateState({
                status: 'error',
                lastError: errorMsg,
            })

            return {
                success: false,
                uploaded: 0,
                downloaded: 0,
                newConflicts: 0,
                error: errorMsg,
            }
        } finally {
            this.isSyncLock = false
        }
    }

    /**
     * 解决冲突
     *
     * @param documentId - 文档 ID
     * @param strategy - 解决策略
     */
    async resolveConflict(
        documentId: string,
        strategy: ConflictStrategy
    ): Promise<void> {
        const conflict = this.conflictResolver.getConflictByDocumentId(documentId)
        if (!conflict) {
            logger.warn('[SyncEngine] 未找到文档的冲突记录', { documentId })
            return
        }

        const runtime = this.getRuntimeSettings()
        const hasRemoteTarget = isConfiguredSyncTarget(runtime.target)
        const adapter = hasRemoteTarget ? this.getConfiguredAdapter(runtime.target) : null
        const remoteEntry = this.remoteEntries.get(documentId)

        if (strategy === 'remote-wins' && !remoteEntry) {
            throw new Error('远端冲突快照不可用，无法采用远端版本')
        }

        let resolvedRemoteEntry = remoteEntry

        if (adapter) {
            const payload = await this.buildResolvePayload(conflict, strategy, runtime, remoteEntry)
            const adapterResult = await adapter.resolveConflict(payload)
            resolvedRemoteEntry = adapterResult ?? createResolvedRemoteManifestEntry(payload, remoteEntry)
            this.remoteEntries.set(documentId, resolvedRemoteEntry)
        }

        if (strategy === 'remote-wins') {
            const effectiveRemoteEntry = resolvedRemoteEntry ?? remoteEntry

            if (!effectiveRemoteEntry) {
                throw new Error('远端冲突快照不可用，无法采用远端版本')
            }

            if (!adapter) {
                throw new Error('未配置同步目标，无法拉取远端冲突内容')
            }

            if (effectiveRemoteEntry.deleted) {
                await this.applyRemoteDeletion(effectiveRemoteEntry)
            } else {
                const encrypted = await adapter.download(documentId)
                await this.applyRemoteChange(effectiveRemoteEntry, encrypted)
            }

            await this.markDocumentChangesSynced(documentId)
        } else if (strategy === 'local-wins') {
            if (resolvedRemoteEntry) {
                await this.markDocumentChangesSynced(documentId)

                if (!resolvedRemoteEntry.deleted) {
                    await db.documents.update(documentId, {
                        syncStatus: 'synced',
                        syncedAt: new Date(resolvedRemoteEntry.updatedAt),
                        remoteVersion: resolvedRemoteEntry.remoteVersion,
                        checksum: resolvedRemoteEntry.checksum,
                    })
                }

                this.conflictResolver.updateLocalVersion(
                    documentId,
                    resolvedRemoteEntry.remoteVersion,
                    resolvedRemoteEntry.checksum,
                    resolvedRemoteEntry.remoteVersion,
                )
                this.conflictResolver.confirmSync(documentId, resolvedRemoteEntry.remoteVersion)
            } else {
                await db.documents.update(documentId, {
                    syncStatus: 'modified',
                })
            }
        } else {
            await db.documents.update(documentId, {
                syncStatus: 'conflict',
            })
        }

        const resolution = this.conflictResolver.resolveConflictByDocumentId(
            documentId,
            strategy
        )

        if (!resolution) {
            logger.warn('[SyncEngine] 冲突解决失败', { documentId, strategy })
            return
        }

        if (strategy !== 'manual' && resolvedRemoteEntry) {
            this.conflictResolver.confirmSync(documentId, resolvedRemoteEntry.remoteVersion)
        }

        await addSyncLog({
            action: 'resolve',
            documentId,
            status: strategy === 'manual' ? 'pending' : 'success',
            details: strategy === 'manual'
                ? '冲突已标记为手动处理'
                : `冲突已按 ${strategy} 处理`,
            metadata: {
                localVersion: conflict.localVersion,
                remoteVersion: conflict.remoteVersion,
                strategy,
            },
        })

        const remaining = this.conflictResolver.getActiveConflicts()
        this.updateState({
            conflicts: remaining,
            status: remaining.length > 0 ? 'conflict' : 'idle',
        })

        logger.info('[SyncEngine] 冲突已解决', {
            documentId,
            strategy,
            remainingConflicts: remaining.length,
        })
    }

    /**
     * 启动自动同步
     *
     * @param intervalMs - 同步间隔 (毫秒, 默认使用配置值)
     */
    startAutoSync(intervalMs?: number): void {
        if (this.autoSyncInterval) {
            this.stopAutoSync()
        }

        const interval = intervalMs ?? this.config.autoSyncIntervalMs

        this.autoSyncInterval = setInterval(() => {
            void this.sync()
        }, interval)

        this.updateState({ autoSyncEnabled: true })

        logger.info('[SyncEngine] 自动同步已启动', { intervalMs: interval })
    }

    /**
     * 停止自动同步
     */
    stopAutoSync(): void {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval)
            this.autoSyncInterval = null
        }

        this.updateState({ autoSyncEnabled: false })

        logger.info('[SyncEngine] 自动同步已停止')
    }

    /**
     * 注册状态变化监听器
     *
     * @returns 取消注册的函数
     */
    onStateChange(callback: (state: SyncState) => void): () => void {
        this.stateListeners.push(callback)
        return () => {
            const index = this.stateListeners.indexOf(callback)
            if (index !== -1) {
                this.stateListeners.splice(index, 1)
            }
        }
    }

    /**
     * 获取变更追踪器 (供外部高级用途)
     */
    getChangeTracker(): ChangeTracker {
        return this.changeTracker
    }

    /**
     * 获取冲突解决器 (供外部高级用途)
     */
    getConflictResolver(): ConflictResolver {
        return this.conflictResolver
    }

    async reloadPendingChanges(): Promise<void> {
        await this.changeTracker.reload()
    }

    /**
     * 销毁引擎，释放所有资源
     */
    dispose(): void {
        this.stopAutoSync()
        this.teardownNetworkListeners()
        this.stateListeners = []
        this.remoteEntries.clear()
        this.changeTracker.dispose()

        logger.info('[SyncEngine] 引擎已销毁')
    }

    // ---------------------------------------------------------------
    // 私有方法
    // ---------------------------------------------------------------

    /**
     * 本地模式的同步处理
     * 在没有远端服务器的情况下，直接标记变更为已同步
     */
    private async processLocalSync(
        pendingChanges: ChangeRecord[]
    ): Promise<SyncResult> {
        // 过滤超过最大重试次数的变更
        const validChanges = pendingChanges.filter(
            (c) => c.retryCount < this.config.maxRetries
        )

        // 标记所有有效变更为已同步 (本地模式)
        const syncedIds = validChanges.map((c) => c.id)
        await this.changeTracker.markSyncedBatch(syncedIds)

        // 对超过重试次数的变更记录警告
        const failedChanges = pendingChanges.filter(
            (c) => c.retryCount >= this.config.maxRetries
        )
        if (failedChanges.length > 0) {
            logger.warn('[SyncEngine] 以下变更已超过最大重试次数', {
                count: failedChanges.length,
                documentIds: failedChanges.map((c) => c.articleId),
            })
        }

        await Promise.allSettled(validChanges.map(async (change) => {
            const syncedAt = new Date()
            const document = await db.documents.get(change.articleId)

            if (document) {
                await db.documents.update(change.articleId, {
                    syncStatus: 'synced',
                    syncedAt,
                    remoteVersion: document.remoteVersion + 1,
                })
            }

            await addSyncLog({
                action: 'push',
                documentId: change.articleId,
                status: 'success',
                details: '本地模式同步完成',
                metadata: {
                    bytesTransferred: 0,
                },
            })
            await logSync(change.articleId, 'push')
        }))

        await Promise.allSettled(failedChanges.map((change) => addSyncLog({
            action: 'error',
            documentId: change.articleId,
            status: 'error',
            details: '同步重试次数超过上限',
            metadata: {
                localVersion: change.retryCount,
            },
        })))

        return {
            success: true,
            uploaded: validChanges.length,
            downloaded: 0,
            newConflicts: 0,
        }
    }

    private async processRemoteSync(
        pendingChanges: ChangeRecord[],
        runtime: SyncRuntimeSettings,
    ): Promise<SyncResult> {
        const adapter = this.getConfiguredAdapter(runtime.target)
        const remoteManifest = await adapter.listRemoteChanges()
        this.remoteEntries = new Map(remoteManifest.map((entry) => [entry.documentId, entry]))

        let uploaded = 0
        let downloaded = 0
        let newConflicts = 0
        const handledConflictDocumentIds = new Set<string>()

        for (const remoteEntry of remoteManifest) {
            const conflict = this.conflictResolver.detectConflict(
                remoteEntry.documentId,
                remoteEntry.remoteVersion,
                remoteEntry.checksum,
            )

            if (!conflict) {
                continue
            }

            newConflicts += 1
            await db.documents.update(remoteEntry.documentId, { syncStatus: 'conflict' })
            await addSyncLog({
                action: 'conflict',
                documentId: remoteEntry.documentId,
                status: 'pending',
                details: '检测到本地与远端同步冲突',
                metadata: {
                    localVersion: conflict.localVersion,
                    remoteVersion: conflict.remoteVersion,
                    strategy: runtime.conflictStrategy,
                },
            })

            if (runtime.conflictStrategy === 'manual') {
                continue
            }

            await this.resolveConflict(remoteEntry.documentId, runtime.conflictStrategy)
            handledConflictDocumentIds.add(remoteEntry.documentId)

            if (runtime.conflictStrategy === 'remote-wins') {
                downloaded += 1
            } else if (runtime.conflictStrategy === 'local-wins') {
                uploaded += 1
            }
        }

        for (const remoteEntry of remoteManifest) {
            if (this.conflictResolver.getConflictByDocumentId(remoteEntry.documentId)) {
                continue
            }

            if (!await this.shouldDownloadRemoteEntry(remoteEntry, runtime.selectedCategoryIds)) {
                continue
            }

            if (handledConflictDocumentIds.has(remoteEntry.documentId)) {
                continue
            }

            if (remoteEntry.deleted) {
                await this.applyRemoteDeletion(remoteEntry)
                downloaded += 1
                continue
            }

            const encrypted = await adapter.download(remoteEntry.documentId)
            await this.applyRemoteChange(remoteEntry, encrypted)
            downloaded += 1
        }

        const validChanges = pendingChanges.filter((change) => (
            change.retryCount < this.config.maxRetries
            && !handledConflictDocumentIds.has(change.articleId)
        ))

        for (const change of validChanges) {
            try {
                const didUpload = await this.uploadChange(change, adapter, runtime)
                if (didUpload) {
                    uploaded += 1
                }
            } catch (error) {
                await this.changeTracker.incrementRetry(change.id)

                await addSyncLog({
                    action: 'error',
                    documentId: change.articleId,
                    status: 'error',
                    details: error instanceof Error ? error.message : '同步上传失败',
                    metadata: {
                        localVersion: change.retryCount + 1,
                    },
                })
            }
        }

        return {
            success: true,
            uploaded,
            downloaded,
            newConflicts,
        }
    }

    private getRuntimeSettings(): SyncRuntimeSettings {
        const settings = this.config.getSyncSettings?.()

        return settings ?? {
            enabled: false,
            target: { type: 'none' },
            conflictStrategy: 'local-wins',
            encryptionEnabled: true,
            selectedCategoryIds: [],
        }
    }

    private getConfiguredAdapter(targetOverride?: SyncTarget) {
        const target = targetOverride ?? this.getRuntimeSettings().target
        const adapter = createSyncAdapter(target)

        if (!adapter) {
            throw new Error('未配置同步目标')
        }

        return adapter
    }

    private async seedLocalVersion(change: ChangeRecord, content?: string): Promise<void> {
        const existingDocument = await db.documents.get(change.articleId)
        const existingVector = this.conflictResolver.getVersionVector(change.articleId)
        const nextLocalVersion = Math.max(
            existingVector?.localVersion ?? 0,
            existingDocument?.remoteVersion ?? 0,
        ) + 1
        const checksum = content !== undefined ? change.checksum : existingDocument?.checksum ?? change.checksum

        this.conflictResolver.updateLocalVersion(
            change.articleId,
            nextLocalVersion,
            checksum,
            existingDocument?.remoteVersion ?? existingVector?.lastKnownRemoteVersion ?? 0,
        )

        if (existingDocument) {
            await db.documents.update(change.articleId, {
                syncStatus: existingDocument.syncStatus === 'conflict' ? 'conflict' : 'modified',
                checksum,
            })
        }
    }

    private async shouldDownloadRemoteEntry(
        remoteEntry: RemoteManifestEntry,
        selectedCategoryIds: string[],
    ): Promise<boolean> {
        if (
            selectedCategoryIds.length > 0 &&
            remoteEntry.categoryId &&
            !selectedCategoryIds.includes(remoteEntry.categoryId)
        ) {
            return false
        }

        if (this.conflictResolver.getConflictByDocumentId(remoteEntry.documentId)) {
            return false
        }

        const existingDocument = await db.documents.get(remoteEntry.documentId)

        if (remoteEntry.deleted) {
            return Boolean(existingDocument)
        }

        return !existingDocument || remoteEntry.remoteVersion > existingDocument.remoteVersion
    }

    private getConflictOutcome(
        conflict: SyncConflict,
        strategy: ConflictStrategy,
    ): Pick<SyncResolvePayload, 'resolvedVersion' | 'resolvedChecksum'> {
        switch (strategy) {
            case 'local-wins':
                return {
                    resolvedVersion: conflict.localVersion,
                    resolvedChecksum: conflict.localChecksum,
                }
            case 'remote-wins':
                return {
                    resolvedVersion: conflict.remoteVersion,
                    resolvedChecksum: conflict.remoteChecksum,
                }
            case 'manual':
            default:
                return {
                    resolvedVersion: Math.max(conflict.localVersion, conflict.remoteVersion),
                    resolvedChecksum: conflict.localChecksum,
                }
        }
    }

    private async buildResolvePayload(
        conflict: SyncConflict,
        strategy: ConflictStrategy,
        runtime: SyncRuntimeSettings,
        remoteEntry?: RemoteManifestEntry,
    ): Promise<SyncResolvePayload> {
        const document = await db.documents.get(conflict.documentId)
        const updatedAt = document?.updatedAt.toISOString()
            ?? remoteEntry?.updatedAt
            ?? new Date().toISOString()
        const deleted = !document
        const data = strategy === 'local-wins' && document && !deleted
            ? await this.serializeDocumentPayload(document, runtime, updatedAt)
            : undefined

        return {
            documentId: conflict.documentId,
            strategy,
            localVersion: conflict.localVersion,
            remoteVersion: conflict.remoteVersion,
            localChecksum: conflict.localChecksum,
            remoteChecksum: conflict.remoteChecksum,
            ...this.getConflictOutcome(conflict, strategy),
            updatedAt,
            title: document?.title ?? remoteEntry?.title,
            categoryId: document?.categoryId ?? remoteEntry?.categoryId ?? null,
            deleted,
            data,
        }
    }

    private async markDocumentChangesSynced(documentId: string): Promise<void> {
        const changeIds = (await this.changeTracker.getPendingChanges())
            .filter((change) => change.articleId === documentId)
            .map((change) => change.id)

        if (changeIds.length === 0) {
            return
        }

        await this.changeTracker.markSyncedBatch(changeIds)
    }

    private async serializeDocumentPayload(
        document: SyncDocument,
        runtime: SyncRuntimeSettings,
        updatedAt: string,
    ): Promise<ArrayBuffer> {
        if (runtime.encryptionEnabled) {
            return serializeDocument(
                {
                    title: document.title,
                    body: document.content,
                    documentId: document.id,
                    category: document.categoryId ?? undefined,
                },
                await this.getSyncMasterKey(),
            )
        }

        return new TextEncoder().encode(JSON.stringify({
            documentId: document.id,
            title: document.title,
            body: document.content,
            categoryId: document.categoryId,
            updatedAt,
        })).buffer
    }

    private async uploadChange(
        change: ChangeRecord,
        adapter: ReturnType<SyncEngine['getConfiguredAdapter']>,
        runtime: SyncRuntimeSettings,
    ): Promise<boolean> {
        const document = await db.documents.get(change.articleId)

        if (
            document &&
            runtime.selectedCategoryIds.length > 0 &&
            document.categoryId &&
            !runtime.selectedCategoryIds.includes(document.categoryId)
        ) {
            return false
        }

        if (this.conflictResolver.getConflictByDocumentId(change.articleId)) {
            return false
        }

        const remoteVersion = (document?.remoteVersion ?? 0) + 1
        const updatedAt = document?.updatedAt.toISOString() ?? new Date().toISOString()

        if (change.operation === 'delete' || !document) {
            const remoteEntry = await adapter.delete({
                documentId: change.articleId,
                remoteVersion,
                checksum: change.checksum,
                updatedAt,
                title: document?.title,
                categoryId: document?.categoryId ?? null,
            })
            this.remoteEntries.set(change.articleId, remoteEntry)

            await this.changeTracker.markSynced(change.id)
            this.conflictResolver.confirmSync(change.articleId, remoteEntry.remoteVersion)
            await addSyncLog({
                action: 'push',
                documentId: change.articleId,
                status: 'success',
                details: '远端删除同步完成',
                metadata: {
                    remoteVersion: remoteEntry.remoteVersion,
                    bytesTransferred: 0,
                },
            })
            await logSync(change.articleId, 'push')
            return true
        }

        const payload = await this.serializeDocumentPayload(document, runtime, updatedAt)
        const checksum = document.checksum || change.checksum
        const remoteEntry = await adapter.upload({
            documentId: document.id,
            remoteVersion,
            checksum,
            updatedAt,
            title: document.title,
            categoryId: document.categoryId ?? null,
            data: payload,
        })
        this.remoteEntries.set(document.id, remoteEntry)

        await this.changeTracker.markSynced(change.id)
        this.conflictResolver.updateLocalVersion(
            document.id,
            remoteEntry.remoteVersion,
            checksum,
            remoteEntry.remoteVersion,
        )
        this.conflictResolver.confirmSync(document.id, remoteEntry.remoteVersion)

        const syncedAt = new Date()
        await db.documents.update(document.id, {
            syncStatus: 'synced',
            syncedAt,
            remoteVersion: remoteEntry.remoteVersion,
            checksum: remoteEntry.checksum,
        })

        await addSyncLog({
            action: 'push',
            documentId: document.id,
            status: 'success',
            details: `远端同步完成（${adapter.type}）`,
            metadata: {
                remoteVersion: remoteEntry.remoteVersion,
                bytesTransferred: payload.byteLength,
            },
        })
        await logSync(document.id, 'push')
        return true
    }

    private async getSyncMasterKey(): Promise<CryptoKey> {
        try {
            return await getMasterKey({ extractable: true })
        } catch {
            throw new Error('同步加密需要先解锁主密钥')
        }
    }

    private async applyRemoteChange(
        remoteEntry: RemoteManifestEntry,
        payload: ArrayBuffer,
    ): Promise<void> {
        const parsed = await this.deserializeRemotePayload(payload)
        const existingArticle = await articleRepository.findById(remoteEntry.documentId)
        const existingContent = await contentRepository.findByArticleId(remoteEntry.documentId)
        const versionId = existingContent?.currentVersionId ?? generateId()
        const versionCreatedAt = new Date(remoteEntry.updatedAt)

        const version: Version = {
            id: versionId,
            label: `同步 v${remoteEntry.remoteVersion}`,
            title: parsed.title,
            body: parsed.body,
            transcript: existingContent?.transcript ?? '',
            createdAt: versionCreatedAt,
        }

        const content: EditedContent = {
            id: existingContent?.id ?? generateId(),
            articleId: remoteEntry.documentId,
            title: parsed.title,
            body: parsed.body,
            transcript: existingContent?.transcript ?? '',
            selectedLinks: existingContent?.selectedLinks ?? [],
            selectedImages: existingContent?.selectedImages ?? [],
            versions: [version],
            currentVersionId: version.id,
            createdAt: existingContent?.createdAt ?? versionCreatedAt,
            updatedAt: versionCreatedAt,
        }

        const article: Article = {
            id: remoteEntry.documentId,
            categoryId: parsed.categoryId,
            sourceUrl: existingArticle?.sourceUrl ?? `sync://${remoteEntry.documentId}`,
            sourceName: existingArticle?.sourceName ?? 'Sync',
            title: parsed.title,
            description: existingArticle?.description ?? parsed.title,
            authors: existingArticle?.authors ?? [],
            publishedAt: existingArticle?.publishedAt,
            rawContent: parsed.body,
            links: existingArticle?.links ?? [],
            images: existingArticle?.images ?? [],
            aiSummary: existingArticle?.aiSummary,
            score: existingArticle?.score ?? 0,
            tags: existingArticle?.tags ?? [],
            status: existingArticle?.status ?? 'read',
            createdAt: existingArticle?.createdAt ?? versionCreatedAt,
            updatedAt: versionCreatedAt,
        }

        const { id: articleId, ...articleUpdates } = article
        const { id: contentId, ...contentUpdates } = content

        if (existingArticle) {
            await articleRepository.update(articleId, articleUpdates)
        } else {
            await articleRepository.create(article)
        }

        if (existingContent) {
            await contentRepository.update(contentId, contentUpdates)
        } else {
            await contentRepository.create(content)
        }

        await syncArticleDocumentSnapshot({
            articleId: article.id,
            title: content.title,
            body: content.body,
            categoryId: article.categoryId,
            currentVersion: version,
            createdAt: content.createdAt,
            updatedAt: content.updatedAt,
            status: existingArticle?.status === 'processed' ? 'published' : 'draft',
        })

        await db.documents.update(remoteEntry.documentId, {
            syncStatus: 'synced',
            syncedAt: new Date(remoteEntry.updatedAt),
            remoteVersion: remoteEntry.remoteVersion,
            checksum: remoteEntry.checksum,
        })

        this.conflictResolver.updateLocalVersion(
            remoteEntry.documentId,
            remoteEntry.remoteVersion,
            remoteEntry.checksum,
            remoteEntry.remoteVersion,
        )
        this.conflictResolver.confirmSync(remoteEntry.documentId, remoteEntry.remoteVersion)

        await addSyncLog({
            action: 'pull',
            documentId: remoteEntry.documentId,
            status: 'success',
            details: `远端文档已拉取（${remoteEntry.remoteVersion}）`,
            metadata: {
                remoteVersion: remoteEntry.remoteVersion,
                bytesTransferred: payload.byteLength,
            },
        })
        await logSync(remoteEntry.documentId, 'pull')
    }

    private async applyRemoteDeletion(remoteEntry: RemoteManifestEntry): Promise<void> {
        const existingContent = await contentRepository.findByArticleId(remoteEntry.documentId)

        await db.transaction('rw', [db.articles, db.contents, db.documents, db.versions], async () => {
            if (existingContent) {
                await db.contents.delete(existingContent.id)
            }

            await db.versions.where('documentId').equals(remoteEntry.documentId).delete()
            await db.documents.delete(remoteEntry.documentId)
            await db.articles.delete(remoteEntry.documentId)
        })

        this.conflictResolver.confirmSync(remoteEntry.documentId, remoteEntry.remoteVersion)
        await addSyncLog({
            action: 'pull',
            documentId: remoteEntry.documentId,
            status: 'success',
            details: '远端删除已同步到本地',
            metadata: {
                remoteVersion: remoteEntry.remoteVersion,
            },
        })
        await logSync(remoteEntry.documentId, 'pull')
    }

    private async deserializeRemotePayload(
        payload: ArrayBuffer,
    ): Promise<{ title: string; body: string; categoryId: string | null }> {
        const runtime = this.getRuntimeSettings()

        if (!runtime.encryptionEnabled) {
            const parsed = JSON.parse(new TextDecoder().decode(payload)) as {
                title?: string
                body?: string
                categoryId?: string | null
            }

            return {
                title: parsed.title ?? '未命名文档',
                body: parsed.body ?? '',
                categoryId: parsed.categoryId ?? null,
            }
        }

        const { metadata, body } = await deserializeDocument(payload, await this.getSyncMasterKey())

        return {
            title: metadata.title,
            body,
            categoryId: metadata.category ?? null,
        }
    }

    /** 检查网络状态 */
    private isOnline(): boolean {
        if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
            return navigator.onLine
        }
        return true // 默认假设在线
    }

    /** 设置网络状态监听器 */
    private setupNetworkListeners(): void {
        if (typeof window === 'undefined') return

        this.onlineHandler = () => {
            logger.info('[SyncEngine] 网络已恢复，尝试同步')
            if (this.state.status === 'offline') {
                this.updateState({ status: 'idle' })
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

    /** 清理网络状态监听器 */
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

    /** 更新状态并通知监听器 */
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
