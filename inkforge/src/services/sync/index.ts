/**
 * 同步服务模块索引
 *
 * 提供端到端加密同步的完整能力:
 * - .inkforge 二进制格式 (加密文档)
 * - 密钥派生 (PBKDF2 + HKDF)
 * - 变更追踪 (增量同步)
 * - 冲突解决 (版本向量 + checksum)
 * - 同步引擎 (本地优先架构)
 */

// ===================================================================
// 格式定义
// ===================================================================

export {
    INKFORGE_MAGIC,
    INKFORGE_FORMAT_VERSION,
    FORMAT_FLAGS,
    serializeDocument,
    deserializeDocument,
    validateFormat,
} from './format'

export type {
    InkForgeHeader,
    InkForgeMetadata,
    SerializeInput,
    DeserializeOutput,
    FormatValidation,
} from './format'

// ===================================================================
// 密钥派生
// ===================================================================

export {
    SYNC_CRYPTO_CONFIG,
    deriveKeyFromPassword,
    deriveContentKey,
    expandKey,
    generateSalt,
    generateIV,
    computeChecksum,
} from './key-derivation'

// ===================================================================
// 变更追踪
// ===================================================================

export { ChangeTracker } from './change-tracker'

export type {
    ChangeOperation,
    ChangeRecord,
    ChangeTrackerState,
} from './change-tracker'

// ===================================================================
// 冲突解决
// ===================================================================

export { ConflictResolver } from './conflict-resolver'

export type {
    ConflictStrategy,
    SyncConflict,
    VersionVector,
    ConflictResolution,
} from './conflict-resolver'

// ===================================================================
// 同步引擎
// ===================================================================

export { SyncEngine } from './engine'

export type {
    SyncStatus,
    SyncState,
    SyncResult,
    SyncEngineConfig,
} from './engine'
