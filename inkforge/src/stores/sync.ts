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
import {
    createConfiguredSyncProvider,
    getDefaultSyncProfileConfiguration,
    loadSyncProfileConfiguration,
    requiresSyncSecret,
    saveSyncProfileConfiguration,
    validateSyncProfileConfiguration,
    type SyncProfileConfiguration,
} from '@/services/sync/configuration'
import {
    deleteSecureCredential,
    readSecureCredential,
    writeSecureCredential,
} from '@/services/credentials/keychain'
import { DEFAULT_PROFILE_ID } from '@/services/profile/types'
import { logger } from '@/services/error'

export type SyncConfigurationState =
    | 'idle'
    | 'loading'
    | 'configured'
    | 'disabled'
    | 'error'

export type SyncCredentialState =
    | 'idle'
    | 'loading'
    | 'stored'
    | 'missing'
    | 'not-required'
    | 'error'

export type SyncConnectionState =
    | 'idle'
    | 'testing'
    | 'connected'
    | 'error'

export interface SyncConfigurationActionResult {
    success: boolean
    message: string
}

// ===================================================================
// Store 定义
// ===================================================================

export const useSyncStore = defineStore('sync', () => {
    const syncEngines = new Map<string, SyncEngine>()

    function getOrCreateSyncEngine(profileId: string): SyncEngine {
        const existing = syncEngines.get(profileId)
        if (existing) return existing
        const created = new SyncEngine({ profileId })
        syncEngines.set(profileId, created)
        return created
    }

    let activeProfileId = DEFAULT_PROFILE_ID
    let syncEngine = getOrCreateSyncEngine(activeProfileId)
    const activeProfile = ref(activeProfileId)

    // 响应式状态 (从引擎同步)
    const state = ref<SyncState>(syncEngine.getState())

    // 最后一次同步结果
    const lastResult = ref<SyncResult | null>(null)
    const configuration = ref<SyncProfileConfiguration>(
        getDefaultSyncProfileConfiguration(activeProfileId)
    )
    const configurationState = ref<SyncConfigurationState>('idle')
    const configurationMessage = ref('')
    const credentialState = ref<SyncCredentialState>('idle')
    const credentialMessage = ref('')
    const connectionState = ref<SyncConnectionState>('idle')
    const connectionMessage = ref('')
    const connectionLatencyMs = ref<number | null>(null)
    const connectionServerVersion = ref<string | null>(null)
    let configurationRequestId = 0

    function subscribeToSyncEngine(engine: SyncEngine): () => void {
        return engine.onStateChange((newState) => {
            if (engine === syncEngine) state.value = newState
        })
    }

    // 监听当前 Profile 引擎状态变化，同步到 Vue 响应式
    let unsubscribe = subscribeToSyncEngine(syncEngine)

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

    /** 活跃冲突列表 */
    const conflicts = computed(() => state.value.conflicts)

    /** 冲突数量 */
    const conflictCount = computed(() => state.value.conflicts.length)

    /** 最后同步时间 */
    const lastSyncAt = computed(() => state.value.lastSyncAt)

    /** 是否启用自动同步 */
    const autoSyncEnabled = computed(() => state.value.autoSyncEnabled)

    /** 当前 Provider */
    const providerId = computed(() => state.value.providerId)

    /** 最后错误信息 */
    const lastError = computed(() => state.value.lastError)

    /** 状态描述文本 (用于 UI 显示) */
    const statusText = computed(() => {
        switch (state.value.status) {
            case 'idle':
                if (!state.value.providerId) {
                    return state.value.pendingChanges > 0
                        ? '同步未配置，' + state.value.pendingChanges + ' 项待同步'
                        : '同步未配置'
                }
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
            case 'paused':
                return state.value.pendingChanges > 0
                    ? '同步未配置，' + state.value.pendingChanges + ' 项待同步'
                    : '同步未配置'
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

    function setProfile(profileId: string): void {
        const normalized = profileId.trim()
        if (!normalized) throw new Error('profileId is required')
        if (normalized === activeProfileId) return

        unsubscribe()
        syncEngine.deactivate()
        activeProfileId = normalized
        syncEngine = getOrCreateSyncEngine(normalized)
        syncEngine.activate()
        activeProfile.value = normalized
        state.value = syncEngine.getState()
        lastResult.value = null
        unsubscribe = subscribeToSyncEngine(syncEngine)
        void loadConfigurationForProfile(normalized)
    }

    function getSyncCredentialId(config: SyncProfileConfiguration): string {
        return `${config.providerId}-${config.authMode}`
    }

    async function readConfigurationSecret(
        config: SyncProfileConfiguration
    ): Promise<SyncConfigurationActionResult & { secret?: string }> {
        if (!requiresSyncSecret(config)) {
            credentialState.value = 'not-required'
            credentialMessage.value = '当前认证方式不需要系统凭据'
            return { success: true, message: credentialMessage.value, secret: '' }
        }

        credentialState.value = 'loading'
        credentialMessage.value = '正在读取系统凭据库'
        const result = await readSecureCredential(
            'sync',
            config.profileId,
            getSyncCredentialId(config)
        )
        if (!result.ok) {
            credentialState.value = 'error'
            credentialMessage.value = result.message
            return { success: false, message: result.message }
        }
        if (!result.value) {
            credentialState.value = 'missing'
            credentialMessage.value = '当前同步配置缺少系统凭据'
            return { success: false, message: credentialMessage.value }
        }

        credentialState.value = 'stored'
        credentialMessage.value = '同步密钥已由系统凭据库托管'
        return {
            success: true,
            message: credentialMessage.value,
            secret: result.value,
        }
    }

    async function applyConfiguration(
        nextConfiguration: SyncProfileConfiguration,
        testConnection = false
    ): Promise<SyncConfigurationActionResult> {
        const requestId = ++configurationRequestId
        const engine = syncEngine

        connectionState.value = testConnection ? 'testing' : 'idle'
        connectionMessage.value = testConnection ? '正在连接真实同步端点' : ''
        connectionLatencyMs.value = null
        connectionServerVersion.value = null

        if (nextConfiguration.providerId === 'none' || !nextConfiguration.enabled) {
            engine.setProvider(null)
            engine.stopAutoSync()
            configurationState.value = 'disabled'
            configurationMessage.value = '同步 Provider 已停用，待同步队列仍保留在本地'
            credentialState.value = 'not-required'
            credentialMessage.value = '停用状态不读取系统凭据'
            connectionState.value = 'idle'
            return { success: true, message: configurationMessage.value }
        }

        const credential = await readConfigurationSecret(nextConfiguration)
        if (
            requestId !== configurationRequestId
            || engine !== syncEngine
            || nextConfiguration.profileId !== activeProfileId
        ) {
            return { success: false, message: 'Profile 已切换，已忽略过期的同步配置结果' }
        }
        if (!credential.success) {
            engine.setProvider(null)
            configurationState.value = 'error'
            configurationMessage.value = credential.message
            connectionState.value = 'error'
            connectionMessage.value = credential.message
            return credential
        }

        try {
            const provider = createConfiguredSyncProvider(
                nextConfiguration,
                credential.secret ?? null
            )
            engine.setProvider(provider)
            if (nextConfiguration.autoSync) {
                engine.startAutoSync(nextConfiguration.syncIntervalMs)
            } else {
                engine.stopAutoSync()
            }

            configurationState.value = 'configured'
            configurationMessage.value = `${nextConfiguration.displayName} 已绑定到当前工作区`

            if (testConnection) {
                await provider.connect(provider.config)
                const ping = await provider.ping()
                if (
                    requestId !== configurationRequestId
                    || engine !== syncEngine
                    || nextConfiguration.profileId !== activeProfileId
                ) {
                    await provider.disconnect()
                    return { success: false, message: 'Profile 已切换，已丢弃过期的连接结果' }
                }
                connectionState.value = 'connected'
                connectionLatencyMs.value = ping.latencyMs
                connectionServerVersion.value = ping.serverVersion ?? null
                connectionMessage.value = ping.serverVersion
                    ? `连接成功，延迟 ${ping.latencyMs} ms，服务版本 ${ping.serverVersion}`
                    : `连接成功，延迟 ${ping.latencyMs} ms`
                return { success: true, message: connectionMessage.value }
            }

            return { success: true, message: configurationMessage.value }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            configurationState.value = testConnection ? 'configured' : 'error'
            configurationMessage.value = testConnection
                ? `${nextConfiguration.displayName} 已保存，但连接测试失败`
                : message
            connectionState.value = 'error'
            connectionMessage.value = message
            return { success: false, message }
        }
    }

    async function loadConfigurationForProfile(
        profileId = activeProfileId
    ): Promise<SyncConfigurationActionResult> {
        const normalized = profileId.trim()
        if (!normalized) return { success: false, message: 'profileId 不能为空' }

        configurationState.value = 'loading'
        configurationMessage.value = '正在读取工作区同步配置'
        const loaded = loadSyncProfileConfiguration(normalized)
        if (!loaded.ok) {
            if (normalized === activeProfileId) {
                configuration.value = getDefaultSyncProfileConfiguration(normalized)
                configurationState.value = 'error'
                configurationMessage.value = loaded.message
            }
            return { success: false, message: loaded.message }
        }
        if (normalized !== activeProfileId) {
            return { success: false, message: 'Profile 已切换，已忽略过期的配置读取结果' }
        }

        configuration.value = loaded.value
        return await applyConfiguration(loaded.value)
    }

    async function saveConfiguration(
        input: SyncProfileConfiguration,
        secret = ''
    ): Promise<SyncConfigurationActionResult> {
        const candidate: SyncProfileConfiguration = {
            ...input,
            profileId: activeProfileId,
        }
        const validated = validateSyncProfileConfiguration(candidate)
        if (!validated.ok) {
            configurationState.value = 'error'
            configurationMessage.value = validated.message
            return { success: false, message: validated.message }
        }

        if (requiresSyncSecret(validated.value) && secret.trim()) {
            credentialState.value = 'loading'
            credentialMessage.value = '正在写入系统凭据库'
            const written = await writeSecureCredential(
                'sync',
                validated.value.profileId,
                getSyncCredentialId(validated.value),
                secret
            )
            if (!written.ok) {
                credentialState.value = 'error'
                credentialMessage.value = written.message
                return { success: false, message: written.message }
            }
            credentialState.value = 'stored'
            credentialMessage.value = '同步密钥已安全保存到系统凭据库'
        } else if (requiresSyncSecret(validated.value)) {
            const existing = await readConfigurationSecret(validated.value)
            if (!existing.success) return existing
        }

        const saved = saveSyncProfileConfiguration(validated.value)
        if (!saved.ok) {
            configurationState.value = 'error'
            configurationMessage.value = saved.message
            return { success: false, message: saved.message }
        }

        configuration.value = saved.value
        return await applyConfiguration(saved.value)
    }

    async function testConfiguration(): Promise<SyncConfigurationActionResult> {
        return await applyConfiguration(configuration.value, true)
    }

    async function clearConfigurationCredential(): Promise<SyncConfigurationActionResult> {
        const current = configuration.value
        if (!requiresSyncSecret(current)) {
            return { success: false, message: '当前认证方式没有系统凭据' }
        }
        credentialState.value = 'loading'
        credentialMessage.value = '正在删除系统凭据'
        const result = await deleteSecureCredential(
            'sync',
            current.profileId,
            getSyncCredentialId(current)
        )
        if (!result.ok) {
            credentialState.value = 'error'
            credentialMessage.value = result.message
            return { success: false, message: result.message }
        }
        syncEngine.setProvider(null)
        credentialState.value = 'missing'
        credentialMessage.value = '同步密钥已从系统凭据库删除'
        configurationState.value = 'error'
        configurationMessage.value = '配置仍保留，但再次连接前必须保存新凭据'
        return { success: true, message: credentialMessage.value }
    }

    /**
     * 手动触发同步
     */
    async function sync(): Promise<SyncResult> {
        const engine = syncEngine
        try {
            const result = await engine.sync()
            if (engine === syncEngine) lastResult.value = result
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
            if (engine === syncEngine) lastResult.value = errorResult
            return errorResult
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

    /**
     * 获取当前 provider id
     */
    function getProviderId(): string | null {
        return syncEngine.getProvider()?.id ?? null
    }

    /**
     * 清理 Store 资源
     */
    function cleanup(): void {
        configurationRequestId += 1
        unsubscribe()
        for (const engine of syncEngines.values()) engine.dispose()
        syncEngines.clear()
        logger.info('[SyncStore] 资源已清理')
    }

    // Scope 销毁时自动清理
    onScopeDispose(() => {
        cleanup()
    })

    void loadConfigurationForProfile(activeProfileId)

    // ---------------------------------------------------------------
    // 返回
    // ---------------------------------------------------------------

    return {
        // 状态 (只读)
        state,
        lastResult,
        activeProfile,
        configuration,
        configurationState,
        configurationMessage,
        credentialState,
        credentialMessage,
        connectionState,
        connectionMessage,
        connectionLatencyMs,
        connectionServerVersion,

        // 计算属性
        status,
        isSyncing,
        isOffline,
        hasConflicts,
        hasPendingChanges,
        pendingCount,
        conflicts,
        conflictCount,
        lastSyncAt,
        autoSyncEnabled,
        providerId,
        lastError,
        statusText,

        // 操作方法
        setProfile,
        markDirty,
        sync,
        resolveConflict,
        startAutoSync,
        stopAutoSync,
        getConflictForDocument,
        getProviderId,
        loadConfigurationForProfile,
        saveConfiguration,
        testConfiguration,
        clearConfigurationCredential,

        // 生命周期
        cleanup,
    }
})
