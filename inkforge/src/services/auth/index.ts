/**
 * 授权服务模块索引
 *
 * 提供基于关系的访问控制 (ReBAC):
 * - Zanzibar 风格关系元组
 * - 权限继承推导
 * - 传递关系解析
 * - 本地关系存储
 */

// ===================================================================
// ReBAC 核心
// ===================================================================

export {
    DOCUMENT_MODEL,
    FOLDER_MODEL,
    TEAM_MODEL,
    isPermissionImplied,
    getImpliedPermissions,
    comparePermissionLevel,
    serializeTuple,
    deserializeTuple,
    createRelationTuple,
    logPermissionCheck,
} from './rebac'

export type {
    Permission,
    OperationPermission,
    RelationTuple,
    PermissionCheck,
    PermissionModel,
    RelationDefinition,
} from './rebac'

// ===================================================================
// 关系存储
// ===================================================================

export { PermissionStore } from './relation-store'

export type {
    StoredRelation,
    PermissionListResult,
} from './relation-store'
