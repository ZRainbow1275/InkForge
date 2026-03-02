/**
 * 同步服务 - 密钥派生
 *
 * 多层密钥架构:
 *   Layer 1: User Password --> PBKDF2 (100,000 iterations) --> Master Key
 *   Layer 2: Master Key + Salt --> HKDF --> Content Key (per-document)
 *   Layer 3: Content Key --> AES-256-GCM --> Encrypted Content
 *
 * 与 utils/crypto/ 的关系:
 *   - utils/crypto/ 负责应用级别的敏感字段加密 (IndexedDB 存储)
 *   - 本模块负责文档级别的端到端加密 (.inkforge 格式, 用于同步)
 *   - 两者共享相同的加密原语 (Web Crypto API) 但使用场景不同
 *
 * 安全原则:
 *   - 所有密钥派生使用 Web Crypto API 原生实现
 *   - PBKDF2 迭代次数不低于 100,000 (OWASP 推荐)
 *   - HKDF 使用上下文信息隔离不同用途的子密钥
 *   - 密钥材料用后立即清零
 */

import { ensureCryptoAvailable } from '@/utils/crypto'

// ===================================================================
// 配置常量
// ===================================================================

/** 同步加密配置 */
export const SYNC_CRYPTO_CONFIG = {
    /** PBKDF2 迭代次数 */
    PBKDF2_ITERATIONS: 100_000,
    /** PBKDF2 散列算法 */
    PBKDF2_HASH: 'SHA-256' as const,
    /** 盐值长度 (字节) */
    SALT_LENGTH: 16,
    /** IV/Nonce 长度 (字节, GCM 标准) */
    IV_LENGTH: 12,
    /** 密钥长度 (位) */
    KEY_LENGTH: 256,
    /** 加密算法 */
    ALGORITHM: 'AES-GCM' as const,
    /** HKDF 上下文信息前缀 */
    HKDF_INFO_PREFIX: 'inkforge-content-v1',
} as const

// ===================================================================
// 密钥派生: PBKDF2
// ===================================================================

/**
 * 从用户密码派生主密钥 (PBKDF2-SHA256)
 *
 * @param password - 用户密码
 * @param salt - 盐值 (必须为随机生成的 16 字节)
 * @param iterations - PBKDF2 迭代次数 (默认 100,000)
 * @returns 派生的 AES-256 密钥 (extractable=true, 因为需要通过 HKDF 进一步派生)
 *
 * @description
 * 返回的密钥用作 HKDF 的输入密钥材料 (IKM)，因此需要 extractable=true。
 * 安全性由 PBKDF2 的计算成本保证，而非密钥的不可导出性。
 */
export async function deriveKeyFromPassword(
    password: string,
    salt: Uint8Array,
    iterations: number = SYNC_CRYPTO_CONFIG.PBKDF2_ITERATIONS
): Promise<CryptoKey> {
    ensureCryptoAvailable()

    if (!password || password.length === 0) {
        throw new Error('[KeyDerivation] 密码不能为空')
    }
    if (salt.length < SYNC_CRYPTO_CONFIG.SALT_LENGTH) {
        throw new Error(`[KeyDerivation] 盐值长度不足: 需要 ${SYNC_CRYPTO_CONFIG.SALT_LENGTH} 字节，实际 ${salt.length} 字节`)
    }
    if (iterations < 10_000) {
        throw new Error(`[KeyDerivation] PBKDF2 迭代次数过低: ${iterations}，最小值为 10,000`)
    }

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    )

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations,
            hash: SYNC_CRYPTO_CONFIG.PBKDF2_HASH,
        },
        keyMaterial,
        { name: SYNC_CRYPTO_CONFIG.ALGORITHM, length: SYNC_CRYPTO_CONFIG.KEY_LENGTH },
        true, // extractable: 需要导出 raw bytes 用于 HKDF
        ['encrypt', 'decrypt']
    )
}

// ===================================================================
// 密钥派生: HKDF
// ===================================================================

/**
 * 从主密钥派生内容密钥 (HKDF-SHA256)
 *
 * @param masterKey - 主密钥 (从 PBKDF2 或系统密钥链获取)
 * @param salt - 每文档独立的盐值
 * @param info - HKDF 上下文信息 (默认 'inkforge-content-v1')
 * @returns 派生的 AES-256-GCM 内容密钥 (extractable=false, 仅用于加解密)
 *
 * @description
 * 每个文档使用不同的 salt，确保即使两篇文档内容相同，密文也不同。
 * 返回的密钥 extractable=false，遵循最小权限原则。
 */
export async function deriveContentKey(
    masterKey: CryptoKey,
    salt: Uint8Array,
    info: string = SYNC_CRYPTO_CONFIG.HKDF_INFO_PREFIX
): Promise<CryptoKey> {
    ensureCryptoAvailable()

    // 导出主密钥的原始字节用于 HKDF 输入
    const masterKeyRaw = await crypto.subtle.exportKey('raw', masterKey)

    const hkdfKeyMaterial = await crypto.subtle.importKey(
        'raw',
        masterKeyRaw,
        'HKDF',
        false,
        ['deriveKey']
    )

    const contentKey = await crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            salt,
            info: new TextEncoder().encode(info),
            hash: SYNC_CRYPTO_CONFIG.PBKDF2_HASH,
        },
        hkdfKeyMaterial,
        { name: SYNC_CRYPTO_CONFIG.ALGORITHM, length: SYNC_CRYPTO_CONFIG.KEY_LENGTH },
        false, // 内容密钥不可导出，最小权限
        ['encrypt', 'decrypt']
    )

    // 清零原始密钥材料
    const rawBytes = new Uint8Array(masterKeyRaw)
    crypto.getRandomValues(rawBytes)
    rawBytes.fill(0)

    return contentKey
}

/**
 * 从主密钥扩展得到加密密钥和 HMAC 密钥
 *
 * @param masterKey - 主密钥
 * @param info - HKDF 上下文信息
 * @returns 包含 encryptionKey 和 hmacKey 的对象
 *
 * @description
 * 使用不同的 info 参数从同一主密钥派生两个独立的子密钥:
 * - encryptionKey: 用于 AES-256-GCM 加密
 * - hmacKey: 用于 HMAC-SHA256 签名
 */
export async function expandKey(
    masterKey: CryptoKey,
    info: string
): Promise<{ encryptionKey: CryptoKey; hmacKey: CryptoKey }> {
    ensureCryptoAvailable()

    const masterKeyRaw = await crypto.subtle.exportKey('raw', masterKey)

    // 派生加密子密钥
    const encKeyMaterial = await crypto.subtle.importKey(
        'raw',
        masterKeyRaw,
        'HKDF',
        false,
        ['deriveKey']
    )

    const encryptionKey = await crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            salt: new Uint8Array(SYNC_CRYPTO_CONFIG.SALT_LENGTH), // 空盐
            info: new TextEncoder().encode(`${info}:encryption`),
            hash: SYNC_CRYPTO_CONFIG.PBKDF2_HASH,
        },
        encKeyMaterial,
        { name: SYNC_CRYPTO_CONFIG.ALGORITHM, length: SYNC_CRYPTO_CONFIG.KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    )

    // 派生 HMAC 子密钥
    const hmacKeyMaterial = await crypto.subtle.importKey(
        'raw',
        masterKeyRaw,
        'HKDF',
        false,
        ['deriveKey']
    )

    const hmacKey = await crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            salt: new Uint8Array(SYNC_CRYPTO_CONFIG.SALT_LENGTH),
            info: new TextEncoder().encode(`${info}:hmac`),
            hash: SYNC_CRYPTO_CONFIG.PBKDF2_HASH,
        },
        hmacKeyMaterial,
        { name: 'HMAC', hash: 'SHA-256', length: 256 },
        false,
        ['sign', 'verify']
    )

    // 清零原始密钥材料
    const rawBytes = new Uint8Array(masterKeyRaw)
    crypto.getRandomValues(rawBytes)
    rawBytes.fill(0)

    return { encryptionKey, hmacKey }
}

// ===================================================================
// 随机数生成
// ===================================================================

/**
 * 生成密码学安全的随机盐值
 *
 * @param length - 盐值长度 (默认 16 字节 / 128 位)
 * @returns 随机盐值
 */
export function generateSalt(length: number = SYNC_CRYPTO_CONFIG.SALT_LENGTH): Uint8Array {
    if (length < 8) {
        throw new Error(`[KeyDerivation] 盐值长度不能小于 8 字节，当前: ${length}`)
    }
    return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * 生成密码学安全的随机 IV/Nonce
 *
 * @returns 12 字节随机 IV (AES-GCM 标准)
 */
export function generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SYNC_CRYPTO_CONFIG.IV_LENGTH))
}

/**
 * 计算数据的 SHA-256 校验和
 *
 * @param data - 要计算校验和的数据
 * @returns 十六进制编码的 SHA-256 摘要
 */
export async function computeChecksum(data: ArrayBuffer | Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    return Array.from(hashArray, (b) => b.toString(16).padStart(2, '0')).join('')
}
