/**
 * 同步服务 - 变更追踪
 *
 * 本地优先架构的变更记录系统:
 * - 追踪文档的增删改操作
 * - 生成变更队列供同步引擎消费
 * - 基于 SHA-256 校验和检测实际内容变化
 * - 内存队列存储，页面生命周期内有效
 *
 * 注意: 当前版本使用内存 Map 存储变更队列，页面刷新后队列清空。
 * 这在本地模式下可接受（同步引擎会在下次启动时重新扫描）。
 * 未来接入远端服务器后，应升级为 IndexedDB 持久化存储。
 */

import { computeChecksum } from './key-derivation'
import { logger } from '@/services/error'
import { generateId } from '@/utils/uuid'

// ===================================================================
// 类型定义
// ===================================================================

/** 变更操作类型 */
export type ChangeOperation = 'create' | 'update' | 'delete'

/** 变更记录 */
export interface ChangeRecord {
    /** 变更记录 ID */
    id: string
    /** 关联的文档 ID */
    articleId: string
    /** 操作类型 */
    operation: ChangeOperation
    /** 变更时间 (ISO 8601) */
    timestamp: string
    /** 内容校验和 (SHA-256 hex, 删除操作时为空) */
    checksum: string
    /** 加密后的内容 (.inkforge ArrayBuffer, 仅在同步前填充) */
    encryptedContent?: ArrayBuffer
    /** 是否已同步 */
    synced: boolean
    /** 同步尝试次数 */
    retryCount: number
}

/** 变更追踪器状态 */
export interface ChangeTrackerState {
    /** 待同步的变更数量 */
    pendingCount: number
    /** 最后一次变更的时间 */
    lastChangeAt: string | null
    /** 追踪的文档 ID 列表 */
    trackedDocuments: string[]
}

// ===================================================================
// 变更追踪器
// ===================================================================

/**
 * 变更追踪器
 *
 * 负责记录本地文档的增删改操作，生成变更队列。
 * 使用内存队列 + 持久化存储双重保障。
 *
 * @description
 * - 每次文档修改时调用 trackChange() 记录变更
 * - 同步引擎从 getPendingChanges() 获取待同步变更
 * - 同步成功后调用 markSynced() 标记已同步
 * - 合并短时间内对同一文档的多次更新 (去重)
 */
export class ChangeTracker {
    /** 变更队列 (内存) */
    private changes: Map<string, ChangeRecord> = new Map()

    /** 变更回调监听器 */
    private listeners: Array<(state: ChangeTrackerState) => void> = []

    /** 去重窗口 (毫秒): 同一文档在此时间内的变更会合并 */
    private readonly dedupeWindowMs: number

    constructor(dedupeWindowMs: number = 2000) {
        this.dedupeWindowMs = dedupeWindowMs
    }

    /**
     * 记录文档变更
     *
     * @param articleId - 文档 ID
     * @param operation - 操作类型
     * @param content - 文档内容 (用于计算校验和, 删除操作可省略)
     */
    async trackChange(
        articleId: string,
        operation: ChangeOperation,
        content?: string
    ): Promise<ChangeRecord> {
        const now = new Date().toISOString()

        // 计算校验和
        let checksum = ''
        if (content !== undefined && operation !== 'delete') {
            const contentBytes = new TextEncoder().encode(content)
            checksum = await computeChecksum(contentBytes)
        }

        // 检查去重: 同一文档的连续更新合并
        const existingKey = this.findDedupeKey(articleId, operation)

        const record: ChangeRecord = {
            id: existingKey ?? generateId(),
            articleId,
            operation,
            timestamp: now,
            checksum,
            synced: false,
            retryCount: 0,
        }

        // 如果存在可去重的记录，替换之
        if (existingKey) {
            this.changes.set(existingKey, record)
        } else {
            this.changes.set(record.id, record)
        }

        this.notifyListeners()

        logger.debug('[ChangeTracker] 记录变更', {
            articleId,
            operation,
            checksum: checksum.substring(0, 8) + '...',
            deduplicated: existingKey !== null,
        })

        return record
    }

    /**
     * 获取所有待同步的变更 (按时间排序)
     */
    getPendingChanges(): ChangeRecord[] {
        return Array.from(this.changes.values())
            .filter((c) => !c.synced)
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    }

    /**
     * 标记变更已同步
     *
     * @param changeId - 变更记录 ID
     */
    markSynced(changeId: string): void {
        const record = this.changes.get(changeId)
        if (record) {
            record.synced = true
            // 已同步的记录可以安全删除以释放内存
            this.changes.delete(changeId)
            this.notifyListeners()
        }
    }

    /**
     * 批量标记已同步
     */
    markSyncedBatch(changeIds: string[]): void {
        for (const id of changeIds) {
            const record = this.changes.get(id)
            if (record) {
                record.synced = true
                this.changes.delete(id)
            }
        }
        this.notifyListeners()
    }

    /**
     * 增加重试计数
     */
    incrementRetry(changeId: string): void {
        const record = this.changes.get(changeId)
        if (record) {
            record.retryCount += 1
        }
    }

    /**
     * 获取当前追踪状态
     */
    getState(): ChangeTrackerState {
        const pending = this.getPendingChanges()
        const trackedDocuments = [...new Set(pending.map((c) => c.articleId))]

        return {
            pendingCount: pending.length,
            lastChangeAt: pending.length > 0
                ? pending[pending.length - 1].timestamp
                : null,
            trackedDocuments,
        }
    }

    /**
     * 清空所有变更记录
     */
    clear(): void {
        this.changes.clear()
        this.notifyListeners()
    }

    /**
     * 注册状态变化监听器
     *
     * @returns 取消注册的函数
     */
    onStateChange(callback: (state: ChangeTrackerState) => void): () => void {
        this.listeners.push(callback)
        return () => {
            const index = this.listeners.indexOf(callback)
            if (index !== -1) {
                this.listeners.splice(index, 1)
            }
        }
    }

    // ---------------------------------------------------------------
    // 私有方法
    // ---------------------------------------------------------------

    /**
     * 查找可去重的变更记录 key
     * 在去重窗口内，同一文档的连续 update 操作合并
     */
    private findDedupeKey(articleId: string, operation: ChangeOperation): string | null {
        if (operation !== 'update') return null

        const cutoff = Date.now() - this.dedupeWindowMs

        for (const [key, record] of this.changes) {
            if (
                record.articleId === articleId &&
                record.operation === 'update' &&
                !record.synced &&
                new Date(record.timestamp).getTime() >= cutoff
            ) {
                return key
            }
        }

        return null
    }

    /** 通知所有监听器 */
    private notifyListeners(): void {
        const state = this.getState()
        for (const listener of this.listeners) {
            try {
                listener(state)
            } catch (err) {
                logger.error('[ChangeTracker] 监听器执行异常', err)
            }
        }
    }
}
