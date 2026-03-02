/**
 * IndexedDB 敏感数据加密服务
 * 基于 Web Crypto API 实现 AES-GCM 256 位加密
 *
 * 安全设计（v3）：
 * - 使用 crypto.getRandomValues() 生成真随机 256 位主密钥
 * - 主密钥使用用户密码派生的包装密钥加密后存储到 IndexedDB
 * - 支持 Tauri 环境下使用系统密钥链存储
 * - 密钥缓存具有生命周期管理（页面隐藏/超时自动清理）
 * - 每次加密使用随机 IV（12 字节）
 * - IV 与密文一起存储（IV || Ciphertext）
 * - 提供密钥导出/导入功能用于备份恢复
 * - 密钥材料用后清零
 *
 * 模块化结构：
 * - types.ts: 类型定义与类型守卫
 * - config.ts: 配置常量
 * - environment.ts: 环境检测与审计日志
 * - lifecycle.ts: 密钥生命周期管理
 * - storage.ts: IndexedDB 与 Tauri 密钥链存储
 * - key-management.ts: 密钥生成、派生、包装、导出导入
 * - encryption.ts: 核心加解密函数
 * - sensitive-fields.ts: 敏感字段自动加解密
 */

// ═══════════════════════════════════════════════════════════════════
// 类型导出
// ═══════════════════════════════════════════════════════════════════

export type {
    EncryptedData,
    UnencryptedData,
    WrappedMasterKey,
    ExportedKeyBundle,
    TauriKeyChainCommands,
    TauriInvoke,
    KeyOperationType,
    SensitiveField
} from './types'

export {
    SENSITIVE_FIELDS,
    isEncryptedData,
    isUnencryptedData
} from './types'

// ═══════════════════════════════════════════════════════════════════
// 配置导出
// ═══════════════════════════════════════════════════════════════════

export { ENABLE_ENCRYPTION, CRYPTO_CONFIG } from './config'

// ═══════════════════════════════════════════════════════════════════
// 环境检测导出
// ═══════════════════════════════════════════════════════════════════

export {
    isCryptoAvailable,
    ensureCryptoAvailable,
    isTauriEnvironment,
    getTauriInvoke,
    logKeyAccess
} from './environment'

// ═══════════════════════════════════════════════════════════════════
// 密钥生命周期管理导出
// ═══════════════════════════════════════════════════════════════════

export {
    clearKeyCache,
    isKeyUnlocked,
    resetCacheTimeout,
    initKeyLifecycleManagement,
    getCachedKey,
    setCachedKey,
    getCachedWrappingKey,
    setCachedWrappingKey
} from './lifecycle'

// ═══════════════════════════════════════════════════════════════════
// 存储层导出
// ═══════════════════════════════════════════════════════════════════

export {
    secureZero,
    toBase64,
    fromBase64,
    openSecureKeyStore,
    loadWrappedMasterKeyFromStore,
    saveWrappedMasterKeyToStore,
    deleteKeysFromStore,
    saveMasterKeyToTauriKeychain,
    loadMasterKeyFromTauriKeychain,
    deleteMasterKeyFromTauriKeychain,
    needsPasswordSetup
} from './storage'

// ═══════════════════════════════════════════════════════════════════
// 密钥管理导出
// ═══════════════════════════════════════════════════════════════════

export {
    deriveWrappingKeyFromPassword,
    wrapMasterKey,
    unwrapMasterKey,
    generateMasterKey,
    unlockWithPassword,
    changePassword,
    getMasterKey,
    exportMasterKey,
    importMasterKey,
    deleteAllKeys
} from './key-management'

// ═══════════════════════════════════════════════════════════════════
// 加解密核心导出
// ═══════════════════════════════════════════════════════════════════

export {
    encrypt,
    decrypt,
    decryptWithKey
} from './encryption'

// ═══════════════════════════════════════════════════════════════════
// 敏感字段处理导出
// ═══════════════════════════════════════════════════════════════════

export {
    isSensitiveField,
    encryptSensitiveFields,
    decryptSensitiveFields,
    decryptSensitiveFieldsBatch,
    withEncryption,
    withDecryption
} from './sensitive-fields'
