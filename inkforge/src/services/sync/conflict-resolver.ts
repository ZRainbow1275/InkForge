/**
 * 同步服务 - 冲突解决
 *
 * 基于 checksum 的冲突检测和多策略解决:
 * - local-wins: 本地版本优先
 * - remote-wins: 远端版本优先
 * - manual: 标记为待手动解决
 *
 * 冲突检测逻辑:
 * 当本地和远端对同一文档的 checksum 不同，
 * 且远端版本号大于本地已知的远端版本号时，判定为冲突。
 */

import { logger } from '@/services/error'
import { generateId } from '@/utils/uuid'

// ===================================================================
// 类型定义
// ===================================================================

/** 冲突解决策略 */
export type ConflictStrategy = 'local-wins' | 'remote-wins' | 'manual'

/** 同步冲突记录 */
export interface SyncConflict {
    /** 冲突 ID */
    id: string
    /** 文档 ID */
    documentId: string
    /** 本地版本号 */
    localVersion: number
    /** 远端版本号 */
    remoteVersion: number
    /** 本地内容校验和 */
    localChecksum: string
    /** 远端内容校验和 */
    remoteChecksum: string
    /** 冲突检测时间 */
    detectedAt: string
    /** 解决时间 */
    resolvedAt?: string
    /** 使用的解决策略 */
    resolvedStrategy?: ConflictStrategy
}

/** 版本向量条目 (用于因果关系追踪) */
export interface VersionVector {
    /** 文档 ID */
    documentId: string
    /** 本地已知版本号 */
    localVersion: number
    /** 最后一次同步时已知的远端版本号 */
    lastKnownRemoteVersion: number
    /** 本地内容校验和 */
    checksum: string
}

/** 冲突解决结果 */
export interface ConflictResolution {
    /** 冲突 ID */
    conflictId: string
    /** 文档 ID */
    documentId: string
    /** 选择的策略 */
    strategy: ConflictStrategy
    /** 最终版本号 */
    resolvedVersion: number
    /** 最终校验和 */
    resolvedChecksum: string
}

// ===================================================================
// 冲突解决器
// ===================================================================

/**
 * 冲突解决器
 *
 * 负责检测、记录和解决同步冲突。
 * 使用版本向量 (Version Vector) 追踪本地和远端的因果关系。
 */
export class ConflictResolver {
    /** 版本向量表: documentId -> VersionVector */
    private versionVectors: Map<string, VersionVector> = new Map()

    /** 活跃冲突列表 */
    private conflicts: Map<string, SyncConflict> = new Map()

    /** 冲突监听器 */
    private listeners: Array<(conflicts: SyncConflict[]) => void> = []

    /**
     * 更新本地版本向量
     *
     * @param documentId - 文档 ID
     * @param version - 新的本地版本号
     * @param checksum - 内容校验和
     */
    updateLocalVersion(documentId: string, version: number, checksum: string): void {
        const existing = this.versionVectors.get(documentId)

        this.versionVectors.set(documentId, {
            documentId,
            localVersion: version,
            lastKnownRemoteVersion: existing?.lastKnownRemoteVersion ?? 0,
            checksum,
        })
    }

    /**
     * 检测是否存在冲突
     *
     * @param documentId - 文档 ID
     * @param remoteVersion - 远端版本号
     * @param remoteChecksum - 远端内容校验和
     * @returns 冲突记录 (如果检测到冲突) 或 null
     *
     * @description
     * 冲突判定条件 (同时满足):
     * 1. 远端版本号 > 本地已知的远端版本号 (有新的远端变更)
     * 2. 本地版本号 > 最后同步时的版本号 (本地也有变更)
     * 3. 本地和远端的 checksum 不同 (内容确实不同)
     */
    detectConflict(
        documentId: string,
        remoteVersion: number,
        remoteChecksum: string
    ): SyncConflict | null {
        const local = this.versionVectors.get(documentId)

        // 没有本地记录，不算冲突 (首次拉取)
        if (!local) return null

        // 远端没有新变更
        if (remoteVersion <= local.lastKnownRemoteVersion) return null

        // 本地没有变更 (直接采用远端即可)
        if (local.localVersion <= local.lastKnownRemoteVersion) return null

        // 校验和相同，内容一致，不是冲突
        if (local.checksum === remoteChecksum) {
            // 更新已知远端版本
            local.lastKnownRemoteVersion = remoteVersion
            return null
        }

        // 检测到冲突
        const conflict: SyncConflict = {
            id: generateId(),
            documentId,
            localVersion: local.localVersion,
            remoteVersion,
            localChecksum: local.checksum,
            remoteChecksum,
            detectedAt: new Date().toISOString(),
        }

        this.conflicts.set(conflict.id, conflict)
        this.notifyListeners()

        logger.warn('[ConflictResolver] 检测到同步冲突', {
            documentId,
            localVersion: local.localVersion,
            remoteVersion,
            localChecksum: local.checksum.substring(0, 8) + '...',
            remoteChecksum: remoteChecksum.substring(0, 8) + '...',
        })

        return conflict
    }

    /**
     * 解决冲突
     *
     * @param conflictId - 冲突 ID
     * @param strategy - 解决策略
     * @returns 解决结果
     */
    resolveConflict(conflictId: string, strategy: ConflictStrategy): ConflictResolution | null {
        const conflict = this.conflicts.get(conflictId)
        if (!conflict) {
            logger.warn('[ConflictResolver] 冲突不存在', { conflictId })
            return null
        }

        // 标记已解决
        conflict.resolvedAt = new Date().toISOString()
        conflict.resolvedStrategy = strategy

        let resolvedVersion: number
        let resolvedChecksum: string

        switch (strategy) {
            case 'local-wins':
                resolvedVersion = conflict.localVersion
                resolvedChecksum = conflict.localChecksum
                break
            case 'remote-wins':
                resolvedVersion = conflict.remoteVersion
                resolvedChecksum = conflict.remoteChecksum
                break
            case 'manual':
                // manual 策略保留冲突记录，不自动解决
                // 版本号取较大值，标记为待处理
                resolvedVersion = Math.max(conflict.localVersion, conflict.remoteVersion)
                resolvedChecksum = conflict.localChecksum // 临时保留本地
                break
        }

        // 更新版本向量
        const vector = this.versionVectors.get(conflict.documentId)
        if (vector) {
            vector.localVersion = resolvedVersion
            vector.lastKnownRemoteVersion = conflict.remoteVersion
            vector.checksum = resolvedChecksum
        }

        // 非 manual 策略时移除冲突记录
        if (strategy !== 'manual') {
            this.conflicts.delete(conflictId)
        }

        this.notifyListeners()

        logger.info('[ConflictResolver] 冲突已解决', {
            conflictId,
            documentId: conflict.documentId,
            strategy,
            resolvedVersion,
        })

        return {
            conflictId,
            documentId: conflict.documentId,
            strategy,
            resolvedVersion,
            resolvedChecksum,
        }
    }

    /**
     * 解决指定文档的冲突
     */
    resolveConflictByDocumentId(
        documentId: string,
        strategy: ConflictStrategy
    ): ConflictResolution | null {
        const conflict = this.getConflictByDocumentId(documentId)
        if (!conflict) return null
        return this.resolveConflict(conflict.id, strategy)
    }

    /**
     * 获取指定文档的冲突
     */
    getConflictByDocumentId(documentId: string): SyncConflict | null {
        for (const conflict of this.conflicts.values()) {
            if (conflict.documentId === documentId && !conflict.resolvedAt) {
                return conflict
            }
        }
        return null
    }

    /**
     * 获取所有未解决的冲突
     */
    getActiveConflicts(): SyncConflict[] {
        return Array.from(this.conflicts.values())
            .filter((c) => !c.resolvedAt || c.resolvedStrategy === 'manual')
            .sort((a, b) => a.detectedAt.localeCompare(b.detectedAt))
    }

    /**
     * 获取冲突数量
     */
    getConflictCount(): number {
        return this.getActiveConflicts().length
    }

    /**
     * 确认远端同步完成 (更新版本向量)
     */
    confirmSync(documentId: string, remoteVersion: number): void {
        const vector = this.versionVectors.get(documentId)
        if (vector) {
            vector.lastKnownRemoteVersion = remoteVersion
        }
    }

    /**
     * 获取版本向量
     */
    getVersionVector(documentId: string): VersionVector | undefined {
        return this.versionVectors.get(documentId)
    }

    /**
     * 注册冲突变化监听器
     */
    onConflictsChange(callback: (conflicts: SyncConflict[]) => void): () => void {
        this.listeners.push(callback)
        return () => {
            const index = this.listeners.indexOf(callback)
            if (index !== -1) {
                this.listeners.splice(index, 1)
            }
        }
    }

    /** 通知监听器 */
    private notifyListeners(): void {
        const conflicts = this.getActiveConflicts()
        for (const listener of this.listeners) {
            try {
                listener(conflicts)
            } catch (err) {
                logger.error('[ConflictResolver] 监听器执行异常', err)
            }
        }
    }
}
