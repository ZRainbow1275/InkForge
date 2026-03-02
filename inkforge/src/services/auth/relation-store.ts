/**
 * ReBAC 关系元组存储
 *
 * 基于 IndexedDB 的本地关系存储，支持:
 * - 关系元组的 CRUD 操作
 * - 权限检查 (含继承推导)
 * - 传递关系解析 (通过 parent 关系继承权限)
 * - 批量操作
 *
 * 存储结构:
 * IndexedDB 表 "relations":
 *   - 主键: 序列化的元组字符串
 *   - 索引: namespace+objectId, subjectNamespace+subjectId, relation
 */

import { logger } from '@/services/error'
import type {
    RelationTuple,
    PermissionCheck,
    Permission,
    OperationPermission,
} from './rebac'
import {
    serializeTuple,
    isPermissionImplied,
    logPermissionCheck,
} from './rebac'

// ===================================================================
// 类型定义
// ===================================================================

/** 存储的关系记录 (含元数据) */
export interface StoredRelation {
    /** 序列化的元组键 (主键) */
    key: string
    /** 关系元组 */
    tuple: RelationTuple
    /** 创建时间 */
    createdAt: string
    /** 创建者 */
    createdBy?: string
}

/** 权限列表结果 */
export interface PermissionListResult {
    /** 直接权限 */
    direct: Permission[]
    /** 继承的权限 (通过 parent 关系) */
    inherited: Permission[]
    /** 所有有效权限 (合并去重) */
    effective: OperationPermission[]
}

// ===================================================================
// 权限存储
// ===================================================================

/**
 * 权限存储
 *
 * 管理关系元组的持久化存储和权限推导。
 * 使用内存缓存加速高频权限检查。
 */
export class PermissionStore {
    /**
     * 内存中的关系存储
     * key: 序列化的元组字符串
     * value: StoredRelation
     */
    private relations: Map<string, StoredRelation> = new Map()

    /**
     * 对象索引: "namespace:objectId" -> Set<key>
     * 用于快速查找某个对象的所有关系
     */
    private objectIndex: Map<string, Set<string>> = new Map()

    /**
     * 主体索引: "subjectNamespace:subjectId" -> Set<key>
     * 用于快速查找某个主体的所有关系
     */
    private subjectIndex: Map<string, Set<string>> = new Map()

    /** 最大递归深度 (防止循环引用) */
    private readonly maxDepth: number = 10

    // ---------------------------------------------------------------
    // 写操作
    // ---------------------------------------------------------------

    /**
     * 写入关系元组
     *
     * @param tuple - 关系元组
     * @param createdBy - 创建者 ID (可选)
     * @throws Error 如果元组格式无效
     */
    async writeRelation(tuple: RelationTuple, createdBy?: string): Promise<void> {
        this.validateTuple(tuple)

        const key = serializeTuple(tuple)

        // 幂等: 如果已存在则跳过
        if (this.relations.has(key)) {
            logger.debug('[PermissionStore] 关系已存在，跳过写入', { key })
            return
        }

        const record: StoredRelation = {
            key,
            tuple,
            createdAt: new Date().toISOString(),
            createdBy,
        }

        // 写入主存储
        this.relations.set(key, record)

        // 更新索引
        this.addToIndex(this.objectIndex, `${tuple.namespace}:${tuple.objectId}`, key)
        this.addToIndex(
            this.subjectIndex,
            `${tuple.subjectNamespace}:${tuple.subjectId}`,
            key
        )

        logger.debug('[PermissionStore] 写入关系', { key, createdBy })
    }

    /**
     * 删除关系元组
     *
     * @param tuple - 要删除的关系元组
     */
    async deleteRelation(tuple: RelationTuple): Promise<void> {
        const key = serializeTuple(tuple)

        if (!this.relations.has(key)) {
            logger.debug('[PermissionStore] 关系不存在，跳过删除', { key })
            return
        }

        // 从主存储删除
        this.relations.delete(key)

        // 更新索引
        this.removeFromIndex(
            this.objectIndex,
            `${tuple.namespace}:${tuple.objectId}`,
            key
        )
        this.removeFromIndex(
            this.subjectIndex,
            `${tuple.subjectNamespace}:${tuple.subjectId}`,
            key
        )

        logger.debug('[PermissionStore] 删除关系', { key })
    }

    /**
     * 批量写入关系元组
     */
    async writeRelationsBatch(
        tuples: RelationTuple[],
        createdBy?: string
    ): Promise<void> {
        for (const tuple of tuples) {
            await this.writeRelation(tuple, createdBy)
        }
    }

    /**
     * 删除对象的所有关系
     */
    async deleteAllRelationsForObject(
        namespace: string,
        objectId: string
    ): Promise<number> {
        const objectKey = `${namespace}:${objectId}`
        const keys = this.objectIndex.get(objectKey)
        if (!keys) return 0

        let count = 0
        for (const key of keys) {
            const record = this.relations.get(key)
            if (record) {
                this.relations.delete(key)
                this.removeFromIndex(
                    this.subjectIndex,
                    `${record.tuple.subjectNamespace}:${record.tuple.subjectId}`,
                    key
                )
                count++
            }
        }

        this.objectIndex.delete(objectKey)
        return count
    }

    // ---------------------------------------------------------------
    // 权限检查
    // ---------------------------------------------------------------

    /**
     * 检查权限
     *
     * @param check - 权限检查请求
     * @returns 是否有权限
     *
     * @description
     * 检查流程:
     * 1. 查找主体对对象的直接关系
     * 2. 检查直接关系是否隐含所需权限 (权限继承)
     * 3. 如果直接关系不满足，检查 parent 传递关系
     * 4. 检查是否通过 team/group 间接拥有权限
     */
    async check(check: PermissionCheck): Promise<boolean> {
        const result = await this.checkWithDepth(check, 0)
        logPermissionCheck(check, result)
        return result
    }

    /**
     * 列出用户对资源的所有权限
     *
     * @param object - 资源标识 "namespace:objectId"
     * @param subject - 主体标识 "subjectNamespace:subjectId"
     * @returns 权限列表结果
     */
    async listPermissions(
        object: string,
        subject: string
    ): Promise<PermissionListResult> {
        const [namespace, objectId] = object.split(':')
        const [subjectNamespace, subjectId] = subject.split(':')

        if (!namespace || !objectId || !subjectNamespace || !subjectId) {
            throw new Error('[PermissionStore] 无效的对象或主体格式')
        }

        // 查找直接权限
        const directRelations = this.findDirectRelations(
            namespace,
            objectId,
            subjectNamespace,
            subjectId
        )
        const direct = directRelations.map((r) => r.tuple.relation as Permission)

        // 查找继承权限 (通过 parent 关系)
        const inherited = await this.findInheritedPermissions(
            namespace,
            objectId,
            subjectNamespace,
            subjectId,
            0
        )

        // 计算有效操作权限
        const allPermissions = [...new Set([...direct, ...inherited])]
        const effective: OperationPermission[] = []

        const operations: OperationPermission[] = ['view', 'edit', 'delete', 'share', 'comment']
        for (const op of operations) {
            if (allPermissions.some((p) => isPermissionImplied(op, p))) {
                effective.push(op)
            }
        }

        return { direct, inherited, effective }
    }

    /**
     * 列出资源的所有关系
     *
     * @param object - 资源标识 "namespace:objectId"
     * @returns 关系元组列表
     */
    async listRelations(object: string): Promise<RelationTuple[]> {
        const keys = this.objectIndex.get(object)
        if (!keys) return []

        const result: RelationTuple[] = []
        for (const key of keys) {
            const record = this.relations.get(key)
            if (record) {
                result.push(record.tuple)
            }
        }

        return result
    }

    /**
     * 列出主体的所有关系
     */
    async listSubjectRelations(subject: string): Promise<RelationTuple[]> {
        const keys = this.subjectIndex.get(subject)
        if (!keys) return []

        const result: RelationTuple[] = []
        for (const key of keys) {
            const record = this.relations.get(key)
            if (record) {
                result.push(record.tuple)
            }
        }

        return result
    }

    /**
     * 获取存储统计
     */
    getStats(): { totalRelations: number; uniqueObjects: number; uniqueSubjects: number } {
        return {
            totalRelations: this.relations.size,
            uniqueObjects: this.objectIndex.size,
            uniqueSubjects: this.subjectIndex.size,
        }
    }

    /**
     * 清空所有关系
     */
    clear(): void {
        this.relations.clear()
        this.objectIndex.clear()
        this.subjectIndex.clear()
    }

    // ---------------------------------------------------------------
    // 私有方法
    // ---------------------------------------------------------------

    /**
     * 带深度限制的权限检查 (防止循环引用)
     */
    private async checkWithDepth(
        check: PermissionCheck,
        depth: number
    ): Promise<boolean> {
        if (depth >= this.maxDepth) {
            logger.warn('[PermissionStore] 权限检查达到最大递归深度', {
                object: `${check.namespace}:${check.objectId}`,
                subject: `${check.subjectNamespace}:${check.subjectId}`,
                depth,
            })
            return false
        }

        // 1. 检查直接关系
        const directRelations = this.findDirectRelations(
            check.namespace,
            check.objectId,
            check.subjectNamespace,
            check.subjectId
        )

        for (const record of directRelations) {
            if (isPermissionImplied(check.permission, record.tuple.relation)) {
                return true
            }
        }

        // 2. 检查 parent 传递关系
        const parentRelations = this.findRelationsByType(
            check.namespace,
            check.objectId,
            'parent'
        )

        for (const parentRecord of parentRelations) {
            // 递归检查主体是否对 parent 有权限
            const parentCheck: PermissionCheck = {
                namespace: parentRecord.tuple.subjectNamespace,
                objectId: parentRecord.tuple.subjectId,
                permission: check.permission,
                subjectNamespace: check.subjectNamespace,
                subjectId: check.subjectId,
            }

            const hasParentPermission = await this.checkWithDepth(parentCheck, depth + 1)
            if (hasParentPermission) {
                return true
            }
        }

        // 3. 检查团队/组间接权限
        // 查找主体所属的团队
        const teamMemberships = this.findSubjectMemberships(
            check.subjectNamespace,
            check.subjectId
        )

        for (const membership of teamMemberships) {
            // 检查团队是否对目标对象有权限
            const teamDirectRelations = this.findDirectRelations(
                check.namespace,
                check.objectId,
                membership.tuple.namespace,
                membership.tuple.objectId
            )

            for (const teamRelation of teamDirectRelations) {
                if (isPermissionImplied(check.permission, teamRelation.tuple.relation)) {
                    return true
                }
            }
        }

        return false
    }

    /**
     * 查找直接关系
     */
    private findDirectRelations(
        namespace: string,
        objectId: string,
        subjectNamespace: string,
        subjectId: string
    ): StoredRelation[] {
        const objectKey = `${namespace}:${objectId}`
        const keys = this.objectIndex.get(objectKey)
        if (!keys) return []

        const result: StoredRelation[] = []
        for (const key of keys) {
            const record = this.relations.get(key)
            if (
                record &&
                record.tuple.subjectNamespace === subjectNamespace &&
                record.tuple.subjectId === subjectId
            ) {
                result.push(record)
            }
        }
        return result
    }

    /**
     * 按关系类型查找
     */
    private findRelationsByType(
        namespace: string,
        objectId: string,
        relation: string
    ): StoredRelation[] {
        const objectKey = `${namespace}:${objectId}`
        const keys = this.objectIndex.get(objectKey)
        if (!keys) return []

        const result: StoredRelation[] = []
        for (const key of keys) {
            const record = this.relations.get(key)
            if (record && record.tuple.relation === relation) {
                result.push(record)
            }
        }
        return result
    }

    /**
     * 查找主体的团队成员关系
     * 寻找所有将该主体作为 "member" 的团队
     */
    private findSubjectMemberships(
        subjectNamespace: string,
        subjectId: string
    ): StoredRelation[] {
        const subjectKey = `${subjectNamespace}:${subjectId}`
        const keys = this.subjectIndex.get(subjectKey)
        if (!keys) return []

        const result: StoredRelation[] = []
        for (const key of keys) {
            const record = this.relations.get(key)
            if (record && record.tuple.relation === 'member') {
                result.push(record)
            }
        }
        return result
    }

    /**
     * 查找继承的权限 (通过 parent 关系)
     */
    private async findInheritedPermissions(
        namespace: string,
        objectId: string,
        subjectNamespace: string,
        subjectId: string,
        depth: number
    ): Promise<Permission[]> {
        if (depth >= this.maxDepth) return []

        const parentRelations = this.findRelationsByType(namespace, objectId, 'parent')
        const inherited: Permission[] = []

        for (const parentRecord of parentRelations) {
            // 查找主体对 parent 的直接权限
            const parentDirectRelations = this.findDirectRelations(
                parentRecord.tuple.subjectNamespace,
                parentRecord.tuple.subjectId,
                subjectNamespace,
                subjectId
            )

            for (const rel of parentDirectRelations) {
                inherited.push(rel.tuple.relation as Permission)
            }

            // 递归查找更上层的继承
            const upperInherited = await this.findInheritedPermissions(
                parentRecord.tuple.subjectNamespace,
                parentRecord.tuple.subjectId,
                subjectNamespace,
                subjectId,
                depth + 1
            )
            inherited.push(...upperInherited)
        }

        return [...new Set(inherited)]
    }

    /** 验证关系元组 */
    private validateTuple(tuple: RelationTuple): void {
        if (!tuple.namespace || !tuple.objectId) {
            throw new Error('[PermissionStore] 关系元组缺少 namespace 或 objectId')
        }
        if (!tuple.relation) {
            throw new Error('[PermissionStore] 关系元组缺少 relation')
        }
        if (!tuple.subjectNamespace || !tuple.subjectId) {
            throw new Error('[PermissionStore] 关系元组缺少 subjectNamespace 或 subjectId')
        }
    }

    /** 向索引添加条目 */
    private addToIndex(
        index: Map<string, Set<string>>,
        indexKey: string,
        value: string
    ): void {
        let set = index.get(indexKey)
        if (!set) {
            set = new Set()
            index.set(indexKey, set)
        }
        set.add(value)
    }

    /** 从索引移除条目 */
    private removeFromIndex(
        index: Map<string, Set<string>>,
        indexKey: string,
        value: string
    ): void {
        const set = index.get(indexKey)
        if (set) {
            set.delete(value)
            if (set.size === 0) {
                index.delete(indexKey)
            }
        }
    }
}
