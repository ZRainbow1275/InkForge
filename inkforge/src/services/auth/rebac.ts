/**
 * ReBAC (Relationship-Based Access Control)
 *
 * 基于 Google Zanzibar 论文的简化实现。
 * 使用关系元组 (Relation Tuples) 表达权限关系:
 *
 *   格式: <object>#<relation>@<subject>
 *
 *   示例:
 *     document:doc1#owner@user:alice
 *     document:doc1#viewer@user:bob
 *     folder:work#editor@team:engineering
 *     document:doc1#parent@folder:work
 *
 * 权限推导 (传递关系):
 *   如果 user:bob 是 team:engineering 的成员
 *   且 folder:work 的 editor 包含 team:engineering
 *   且 document:doc1 的 parent 是 folder:work
 *   则 user:bob 有 document:doc1 的 edit 权限
 *
 * 权限继承规则:
 *   owner -> editor + viewer + commenter
 *   editor -> viewer + commenter
 *   commenter -> viewer
 */

import { logger } from '@/services/error'

// ===================================================================
// 类型定义
// ===================================================================

/** 基础权限级别 */
export type Permission = 'owner' | 'editor' | 'viewer' | 'commenter'

/** 细粒度操作权限 */
export type OperationPermission = 'view' | 'edit' | 'delete' | 'share' | 'comment'

/**
 * 关系元组
 * 表示 "subject 对 object 拥有 relation 关系"
 */
export interface RelationTuple {
    /** 资源命名空间 (e.g., "document", "folder", "team") */
    namespace: string
    /** 资源 ID (e.g., "doc1") */
    objectId: string
    /** 关系类型 (e.g., "owner", "editor", "viewer") */
    relation: string
    /** 主体命名空间 (e.g., "user", "team") */
    subjectNamespace: string
    /** 主体 ID (e.g., "alice") */
    subjectId: string
    /** 主体关系 (用于 subject set, e.g., "member") */
    subjectRelation?: string
}

/** 权限检查请求 */
export interface PermissionCheck {
    /** 资源命名空间 */
    namespace: string
    /** 资源 ID */
    objectId: string
    /** 要检查的操作权限 */
    permission: OperationPermission
    /** 主体命名空间 */
    subjectNamespace: string
    /** 主体 ID */
    subjectId: string
}

/**
 * 权限模型定义
 * 描述命名空间中的关系和权限推导规则
 */
export interface PermissionModel {
    /** 关系定义 */
    relations: Record<string, RelationDefinition>
    /** 权限推导规则: permission -> 表达式 */
    permissions: Record<string, string>
}

/** 关系定义 */
export interface RelationDefinition {
    /** 描述 */
    description?: string
}

// ===================================================================
// 权限模型
// ===================================================================

/**
 * 权限继承映射
 * key 为高级权限，value 为它隐含的所有低级权限
 */
const PERMISSION_HIERARCHY: Record<Permission, Permission[]> = {
    owner: ['owner', 'editor', 'viewer', 'commenter'],
    editor: ['editor', 'viewer', 'commenter'],
    commenter: ['commenter', 'viewer'],
    viewer: ['viewer'],
}

/**
 * 操作权限到关系的映射
 * 定义每个操作权限需要哪些关系
 */
const OPERATION_TO_RELATIONS: Record<OperationPermission, Permission[]> = {
    view: ['owner', 'editor', 'viewer', 'commenter'],
    edit: ['owner', 'editor'],
    delete: ['owner'],
    share: ['owner', 'editor'],
    comment: ['owner', 'editor', 'commenter'],
}

/** 文档权限模型 */
export const DOCUMENT_MODEL: PermissionModel = {
    relations: {
        owner: { description: '文档所有者' },
        editor: { description: '文档编辑者' },
        viewer: { description: '文档查看者' },
        commenter: { description: '文档评论者' },
        parent: { description: '所属文件夹' },
    },
    permissions: {
        view: 'owner | editor | viewer | commenter | parent->view',
        edit: 'owner | editor | parent->edit',
        delete: 'owner',
        share: 'owner | editor',
        comment: 'owner | editor | commenter | parent->comment',
    },
}

/** 文件夹权限模型 */
export const FOLDER_MODEL: PermissionModel = {
    relations: {
        owner: { description: '文件夹所有者' },
        editor: { description: '文件夹编辑者' },
        viewer: { description: '文件夹查看者' },
    },
    permissions: {
        view: 'owner | editor | viewer',
        edit: 'owner | editor',
        delete: 'owner',
        share: 'owner',
        comment: 'owner | editor',
    },
}

/** 团队权限模型 */
export const TEAM_MODEL: PermissionModel = {
    relations: {
        admin: { description: '团队管理员' },
        member: { description: '团队成员' },
    },
    permissions: {
        view: 'admin | member',
        edit: 'admin',
        delete: 'admin',
        share: 'admin',
        comment: 'admin | member',
    },
}

// ===================================================================
// 权限检查引擎
// ===================================================================

/**
 * 检查权限是否被某个关系隐含
 *
 * @param requiredPermission - 需要的操作权限
 * @param actualRelation - 实际拥有的关系
 * @returns 是否满足
 */
export function isPermissionImplied(
    requiredPermission: OperationPermission,
    actualRelation: string
): boolean {
    const allowedRelations = OPERATION_TO_RELATIONS[requiredPermission]
    if (!allowedRelations) return false
    return allowedRelations.includes(actualRelation as Permission)
}

/**
 * 获取权限隐含的所有子权限
 *
 * @param permission - 权限级别
 * @returns 包含自身的所有隐含权限
 */
export function getImpliedPermissions(permission: Permission): Permission[] {
    return PERMISSION_HIERARCHY[permission] ?? [permission]
}

/**
 * 比较两个权限级别的高低
 *
 * @returns 正数表示 a 高于 b，负数表示 a 低于 b，0 表示相同
 */
export function comparePermissionLevel(a: Permission, b: Permission): number {
    const order: Record<Permission, number> = {
        owner: 4,
        editor: 3,
        commenter: 2,
        viewer: 1,
    }
    return (order[a] ?? 0) - (order[b] ?? 0)
}

/**
 * 将关系元组序列化为字符串格式
 * 格式: namespace:objectId#relation@subjectNamespace:subjectId
 */
export function serializeTuple(tuple: RelationTuple): string {
    const subject = tuple.subjectRelation
        ? `${tuple.subjectNamespace}:${tuple.subjectId}#${tuple.subjectRelation}`
        : `${tuple.subjectNamespace}:${tuple.subjectId}`

    return `${tuple.namespace}:${tuple.objectId}#${tuple.relation}@${subject}`
}

/**
 * 从字符串格式反序列化关系元组
 *
 * @throws Error 如果格式无效
 */
export function deserializeTuple(str: string): RelationTuple {
    // 格式: namespace:objectId#relation@subjectNamespace:subjectId[#subjectRelation]
    const atIndex = str.indexOf('@')
    if (atIndex === -1) {
        throw new Error(`[ReBAC] 无效的关系元组格式: ${str}`)
    }

    const objectPart = str.substring(0, atIndex)
    const subjectPart = str.substring(atIndex + 1)

    // 解析 object 部分
    const hashIndex = objectPart.indexOf('#')
    if (hashIndex === -1) {
        throw new Error(`[ReBAC] 无效的对象部分: ${objectPart}`)
    }

    const objectRef = objectPart.substring(0, hashIndex)
    const relation = objectPart.substring(hashIndex + 1)
    const colonIndex = objectRef.indexOf(':')
    if (colonIndex === -1) {
        throw new Error(`[ReBAC] 无效的对象引用: ${objectRef}`)
    }

    const namespace = objectRef.substring(0, colonIndex)
    const objectId = objectRef.substring(colonIndex + 1)

    // 解析 subject 部分
    const subjectHashIndex = subjectPart.indexOf('#')
    let subjectNamespace: string
    let subjectId: string
    let subjectRelation: string | undefined

    if (subjectHashIndex !== -1) {
        const subjectRef = subjectPart.substring(0, subjectHashIndex)
        subjectRelation = subjectPart.substring(subjectHashIndex + 1)
        const subjColonIndex = subjectRef.indexOf(':')
        if (subjColonIndex === -1) {
            throw new Error(`[ReBAC] 无效的主体引用: ${subjectRef}`)
        }
        subjectNamespace = subjectRef.substring(0, subjColonIndex)
        subjectId = subjectRef.substring(subjColonIndex + 1)
    } else {
        const subjColonIndex = subjectPart.indexOf(':')
        if (subjColonIndex === -1) {
            throw new Error(`[ReBAC] 无效的主体引用: ${subjectPart}`)
        }
        subjectNamespace = subjectPart.substring(0, subjColonIndex)
        subjectId = subjectPart.substring(subjColonIndex + 1)
    }

    const tuple: RelationTuple = {
        namespace,
        objectId,
        relation,
        subjectNamespace,
        subjectId,
    }

    if (subjectRelation) {
        tuple.subjectRelation = subjectRelation
    }

    return tuple
}

/**
 * 创建便捷的关系元组构造器
 */
export function createRelationTuple(
    object: string,
    relation: Permission | string,
    subject: string
): RelationTuple {
    const [namespace, objectId] = object.split(':')
    const [subjectNamespace, subjectId] = subject.split(':')

    if (!namespace || !objectId) {
        throw new Error(`[ReBAC] 无效的对象格式: ${object}，期望 "namespace:id"`)
    }
    if (!subjectNamespace || !subjectId) {
        throw new Error(`[ReBAC] 无效的主体格式: ${subject}，期望 "namespace:id"`)
    }

    return {
        namespace,
        objectId,
        relation,
        subjectNamespace,
        subjectId,
    }
}

// ===================================================================
// 日志辅助
// ===================================================================

/** 记录权限检查审计日志 */
export function logPermissionCheck(
    check: PermissionCheck,
    result: boolean
): void {
    logger.debug('[ReBAC] 权限检查', {
        object: `${check.namespace}:${check.objectId}`,
        permission: check.permission,
        subject: `${check.subjectNamespace}:${check.subjectId}`,
        result: result ? 'ALLOW' : 'DENY',
        timestamp: new Date().toISOString(),
    })
}
