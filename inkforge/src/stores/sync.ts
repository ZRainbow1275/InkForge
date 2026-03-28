/**
 * 同步状态 Store
 *
 * 将 SyncEngine 的状态桥接到 Vue 响应式系统。
 * 提供 Pinia store 接口供组件使用。
 *
 * 使用方式:
 *   const syncStore = useSyncStore()
 *   // 读取状态
 *   syncStore.state.status // 'idle' | 'syncing' | ...
 *   syncStore.state.pendingChanges // 待同步数量
 *   // 操作
 *   syncStore.markDirty('doc-123', content)
 *   syncStore.sync()
 *   syncStore.resolveConflict('doc-123', 'local-wins')
 */

import { defineStore } from 'pinia'
import { ref, computed, onScopeDispose } from 'vue'
import { SyncEngine, type SyncState, type SyncResult } from '@/services/sync/engine'
import type { ConflictStrategy, SyncConflict } from '@/services/sync/conflict-resolver'
import { useSettingsStore, type SyncTarget } from '@/stores/settings'
import { logger } from '@/services/error'

// ===================================================================
// Store 定义
// ===================================================================

export const useSyncStore = defineStore('sync', () => {
    const settingsStore = useSettingsStore()

    // 创建同步引擎实例
    const syncEngine = new SyncEngine({
        getSyncSettings: () => ({
            enabled: settingsStore.settings.sync.enabled,
            target: settingsStore.settings.sync.target,
            conflictStrategy: settingsStore.settings.sync.conflictStrategy,
            encryptionEnabled: settingsStore.settings.sync.encryptionEnabled,
            selectedCategoryIds: [...settingsStore.settings.sync.selectedCategoryIds],
        }),
    })

    // 响应式状态 (从引擎同步)
    const state = ref<SyncState>(syncEngine.getState())

    // 最后一次同步结果
    const lastResult = ref<SyncResult | null>(null)

    // 监听引擎状态变化，同步到 Vue 响应式
    const unsubscribe = syncEngine.onStateChange((newState) => {
        state.value = newState
    })

    // ---------------------------------------------------------------
    // 计算属性
    // ---------------------------------------------------------------

    /** 当前同步状态 */
    const status = computed(() => state.value.status)

    /** 是否正在同步 */
    const isSyncing = computed(() => state.value.status === 'syncing')

    /** 是否离线 */
    const isOffline = computed(() => state.value.status === 'offline')

    /** 是否有冲突 */
    const hasConflicts = computed(() => state.value.conflicts.length > 0)

    /** 是否有待同步变更 */
    const hasPendingChanges = computed(() => state.value.pendingChanges > 0)

    /** 待同步变更数量 */
    const pendingCount = computed(() => state.value.pendingChanges)

    /** 当前待同步的文档 ID 列表 */
    const trackedDocumentIds = computed(() => state.value.trackedDocumentIds)

    /** 活跃冲突列表 */
    const conflicts = computed(() => state.value.conflicts)

    /** 冲突数量 */
    const conflictCount = computed(() => state.value.conflicts.length)

    /** 最后同步时间 */
    const lastSyncAt = computed(() => state.value.lastSyncAt)

    /** 是否启用自动同步 */
    const autoSyncEnabled = computed(() => state.value.autoSyncEnabled)

    /** 最后错误信息 */
    const lastError = computed(() => state.value.lastError)

    /** 状态描述文本 (用于 UI 显示) */
    const statusText = computed(() => {
        switch (state.value.status) {
            case 'idle':
                return state.value.pendingChanges > 0
                    ? `${state.value.pendingChanges} 项待同步`
                    : '已同步'
            case 'syncing':
                return '同步中...'
            case 'conflict':
                return `${state.value.conflicts.length} 个冲突待解决`
            case 'error':
                return `同步错误: ${state.value.lastError ?? '未知错误'}`
            case 'offline':
                return '离线模式'
            default:
                return '未知状态'
        }
    })

    // ---------------------------------------------------------------
    // 操作方法
    // ---------------------------------------------------------------

    /**
     * 标记文档已修改 (加入待同步队列)
     *
     * @param documentId - 文档 ID
     * @param content - 文档内容 (用于校验和)
     * @param operation - 操作类型
     */
    async function markDirty(
        documentId: string,
        content?: string,
        operation: 'create' | 'update' | 'delete' = 'update'
    ): Promise<void> {
        try {
            await syncEngine.markDirty(documentId, content, operation)
        } catch (err) {
            logger.error('[SyncStore] markDirty 失败', err, { documentId, operation })
        }
    }

    /**
     * 手动触发同步
     */
    async function sync(): Promise<SyncResult> {
        try {
            const result = await syncEngine.sync()
            lastResult.value = result
            return result
        } catch (err) {
            logger.error('[SyncStore] sync 失败', err)
            const errorResult: SyncResult = {
                success: false,
                uploaded: 0,
                downloaded: 0,
                newConflicts: 0,
                error: err instanceof Error ? err.message : String(err),
            }
            lastResult.value = errorResult
            return errorResult
        }
    }

    async function testConnection(targetOverride?: SyncTarget): Promise<{ success: boolean; message: string }> {
        try {
            return await syncEngine.testConnection(targetOverride)
        } catch (err) {
            logger.error('[SyncStore] testConnection 失败', err)
            return {
                success: false,
                message: err instanceof Error ? err.message : '同步目标连接失败',
            }
        }
    }

    /**
     * 解决冲突
     *
     * @param documentId - 文档 ID
     * @param strategy - 解决策略
     */
    async function resolveConflict(
        documentId: string,
        strategy: ConflictStrategy
    ): Promise<void> {
        try {
            await syncEngine.resolveConflict(documentId, strategy)
        } catch (err) {
            logger.error('[SyncStore] resolveConflict 失败', err, { documentId, strategy })
        }
    }

    /**
     * 启动自动同步
     */
    function startAutoSync(intervalMs?: number): void {
        syncEngine.startAutoSync(intervalMs)
    }

    /**
     * 停止自动同步
     */
    function stopAutoSync(): void {
        syncEngine.stopAutoSync()
    }

    /**
     * 获取指定文档的冲突详情
     */
    function getConflictForDocument(documentId: string): SyncConflict | undefined {
        return state.value.conflicts.find((c) => c.documentId === documentId)
    }

    async function reloadPendingChanges(): Promise<void> {
        try {
            await syncEngine.reloadPendingChanges()
        } catch (err) {
            logger.error('[SyncStore] reloadPendingChanges 失败', err)
        }
    }

    /**
     * 清理 Store 资源
     */
    function cleanup(): void {
        unsubscribe()
        syncEngine.dispose()
        logger.info('[SyncStore] 资源已清理')
    }

    // Scope 销毁时自动清理
    onScopeDispose(() => {
        cleanup()
    })

    // ---------------------------------------------------------------
    // 返回
    // ---------------------------------------------------------------

    return {
        // 状态 (只读)
        state,
        lastResult,

        // 计算属性
        status,
        isSyncing,
        isOffline,
        hasConflicts,
        hasPendingChanges,
        pendingCount,
        trackedDocumentIds,
        conflicts,
        conflictCount,
        lastSyncAt,
        autoSyncEnabled,
        lastError,
        statusText,

        // 操作方法
        markDirty,
        sync,
        resolveConflict,
        testConnection,
        startAutoSync,
        stopAutoSync,
        getConflictForDocument,
        reloadPendingChanges,

        // 生命周期
        cleanup,
    }
})
