/**
 * 加密服务 - 配置常量
 */

/**
 * 是否启用加密
 * - 生产环境 + Tauri 桌面应用：启用（通过系统密钥链管理主密钥）
 * - Web 预览/开发环境：关闭（当前 Web 端尚未接入密码解锁 UI，避免未初始化密钥阻塞真实文档写入）
 */
// Tauri 1.x 默认 `withGlobalTauri: false` 不注入 `window.__TAURI__`，仅注入
// `__TAURI_INVOKE__` / `__TAURI_IPC__` 等。仅检测 `__TAURI__`/`__TAURI_INTERNALS__`
// 会在 prod 桌面构建漏判为 web，使 ENABLE_ENCRYPTION 永远为 false、加密永不启用。
// 这里与 `@/utils/platform` 的 `hasTauriGlobal()` 全局集合保持一致（内联以避免
// 引入会缓存检测结果的 detectPlatform，且 config 在极早期求值）。
const HAS_TAURI_RUNTIME = typeof window !== 'undefined' && (
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window ||
    '__TAURI_INVOKE__' in window ||
    '__TAURI_IPC__' in window ||
    '__TAURI_METADATA__' in window ||
    '__TAURI_POST_MESSAGE__' in window
)

export const ENABLE_ENCRYPTION = import.meta.env.PROD && HAS_TAURI_RUNTIME

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
