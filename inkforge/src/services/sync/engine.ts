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
import { ChangeTracker, type ChangeRecord } from './change-tracker'
import { ConflictResolver, type SyncConflict, type ConflictStrategy } from './conflict-resolver'

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

/** 同步引擎配置 */
export interface SyncEngineConfig {
    /** 自动同步间隔 (毫秒, 默认 30 秒) */
    autoSyncIntervalMs: number
    /** 最大重试次数 */
    maxRetries: number
    /** 变更去重窗口 (毫秒) */
    dedupeWindowMs: number
}

/** 默认配置 */
const DEFAULT_CONFIG: SyncEngineConfig = {
    autoSyncIntervalMs: 30_000,
    maxRetries: 3,
    dedupeWindowMs: 2_000,
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
        }

        // 监听变更追踪器状态
        this.changeTracker.onStateChange((trackerState) => {
            this.updateState({ pendingChanges: trackerState.pendingCount })
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
        await this.changeTracker.trackChange(documentId, operation, content)
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

            const pendingChanges = this.changeTracker.getPendingChanges()

            if (pendingChanges.length === 0) {
                this.updateState({
                    status: this.state.conflicts.length > 0 ? 'conflict' : 'idle',
                    lastSyncAt: new Date(),
                })
                return { success: true, uploaded: 0, downloaded: 0, newConflicts: 0 }
            }

            // 本地模式: 处理变更队列
            // 远端模式时此处将替换为实际的网络请求
            const result = await this.processLocalSync(pendingChanges)

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
        const resolution = this.conflictResolver.resolveConflictByDocumentId(
            documentId,
            strategy
        )

        if (!resolution) {
            logger.warn('[SyncEngine] 未找到文档的冲突记录', { documentId })
            return
        }

        // 解决后检查是否还有活跃冲突
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

    /**
     * 销毁引擎，释放所有资源
     */
    dispose(): void {
        this.stopAutoSync()
        this.teardownNetworkListeners()
        this.stateListeners = []
        this.changeTracker.clear()

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
        this.changeTracker.markSyncedBatch(syncedIds)

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

        return {
            success: true,
            uploaded: validChanges.length,
            downloaded: 0,
            newConflicts: 0,
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
