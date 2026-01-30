/**
 * 加密服务 - 配置常量
 */

/** 是否启用加密（生产环境应设为 true） */
export const ENABLE_ENCRYPTION = true

/** 加密算法配置 */
export const CRYPTO_CONFIG = {
    /** 加密算法 */
    ALGORITHM: 'AES-GCM' as const,
    /** 密钥长度（位） */
    KEY_LENGTH: 256,
    /** IV 长度（字节） */
    IV_LENGTH: 12,
    /** 盐值长度（字节） */
    SALT_LENGTH: 16,
    /** PBKDF2 迭代次数（密码派生） */
    PBKDF2_ITERATIONS: 310_000, // OWASP 2023 推荐值
    /** 安全密钥数据库名称 */
    SECURE_DB_NAME: 'InkForgeSecureKeyStore',
    /** 安全密钥数据库版本 */
    SECURE_DB_VERSION: 2,
    /** 主密钥存储键名 */
    MASTER_KEY_ID: 'inkforge_master_key_v3',
    /** 包装后的主密钥存储键名 */
    WRAPPED_MASTER_KEY_ID: 'inkforge_wrapped_master_key_v3',
    /** 密钥包装盐值存储键名 */
    WRAPPING_SALT_ID: 'inkforge_wrapping_salt_v3',
    /** 密钥缓存超时时间（毫秒）- 5分钟 */
    KEY_CACHE_TIMEOUT_MS: 5 * 60 * 1000,
    /** Tauri 密钥链服务名 */
    TAURI_KEYCHAIN_SERVICE: 'com.inkforge.keychain',
    /** 导出密钥版本 */
    EXPORT_VERSION: 1
} as const
