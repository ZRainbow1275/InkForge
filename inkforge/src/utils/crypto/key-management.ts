/**
 * 加密服务 - 密钥管理
 * 包含密钥生成、派生、包装、解锁、导出导入等功能
 *
 * 安全原则：
 * - 最小权限原则：日常操作使用 extractable=false 的密钥
 * - 仅在明确需要导出时（密码更改、备份导出）才创建可导出密钥
 * - 所有敏感操作都有审计日志
 */

import { logger } from '@/services/error'
import { assertPasswordValid } from '@/config/security'
import { CRYPTO_CONFIG } from './config'
import { ensureCryptoAvailable, isTauriEnvironment, logKeyAccess } from './environment'
import {
    getCachedKey,
    setCachedKey,
    setCachedWrappingKey,
    clearKeyCache,
    resetCacheTimeout
} from './lifecycle'
import {
    secureZero,
    toBase64,
    fromBase64,
    loadWrappedMasterKeyFromStore,
    saveWrappedMasterKeyToStore,
    deleteKeysFromStore,
    loadMasterKeyFromTauriKeychain,
    saveMasterKeyToTauriKeychain,
    deleteMasterKeyFromTauriKeychain
} from './storage'
import type { ExportedKeyBundle } from './types'

// ═══════════════════════════════════════════════════════════════════
// 密码派生密钥（PBKDF2）
// ═══════════════════════════════════════════════════════════════════

/**
 * 从用户密码派生包装密钥
 * @param password 用户密码
 * @param salt 盐值（如果不提供则生成新的）
 * @returns 包装密钥和盐值
 * @description 使用 PBKDF2-SHA256 派生 AES-256 密钥用于包装主密钥
 */
export async function deriveWrappingKeyFromPassword(
    password: string,
    salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    ensureCryptoAvailable()

    // 生成或使用提供的盐值
    const derivationSalt = salt ?? crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.SALT_LENGTH))

    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)

    // 导入密码作为密钥材料
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordData,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    )

    // 使用 PBKDF2 派生包装密钥
    const wrappingKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: derivationSalt,
            iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        {
            name: CRYPTO_CONFIG.ALGORITHM,
            length: CRYPTO_CONFIG.KEY_LENGTH
        },
        false, // 不可导出
        ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
    )

    logKeyAccess('generate')

    return { key: wrappingKey, salt: derivationSalt }
}

// ═══════════════════════════════════════════════════════════════════
// 密钥包装/解包装
// ═══════════════════════════════════════════════════════════════════

/**
 * 使用包装密钥加密主密钥
 * @param masterKey 要包装的主密钥
 * @param wrappingKey 包装密钥
 * @returns 包装后的密钥数据
 */
export async function wrapMasterKey(
    masterKey: CryptoKey,
    wrappingKey: CryptoKey
): Promise<{ wrappedKey: Uint8Array; iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.IV_LENGTH))

    const wrappedKey = await crypto.subtle.wrapKey(
        'raw',
        masterKey,
        wrappingKey,
        {
            name: CRYPTO_CONFIG.ALGORITHM,
            iv
        }
    )

    logKeyAccess('wrap')

    return { wrappedKey: new Uint8Array(wrappedKey), iv }
}

/**
 * 使用包装密钥解密主密钥
 * @param wrappedKey 包装后的密钥数据
 * @param iv 包装时使用的 IV
 * @param wrappingKey 包装密钥
 * @param extractable 是否允许导出（默认 false，仅在需要重新包装时设为 true）
 * @returns 解包后的主密钥
 * @security 默认 extractable=false 遵循最小权限原则
 */
export async function unwrapMasterKey(
    wrappedKey: Uint8Array,
    iv: Uint8Array,
    wrappingKey: CryptoKey,
    extractable: boolean = false
): Promise<CryptoKey> {
    const masterKey = await crypto.subtle.unwrapKey(
        'raw',
        wrappedKey,
        wrappingKey,
        {
            name: CRYPTO_CONFIG.ALGORITHM,
            iv
        },
        {
            name: CRYPTO_CONFIG.ALGORITHM,
            length: CRYPTO_CONFIG.KEY_LENGTH
        },
        extractable, // 默认 false，仅在明确需要时设为 true
        ['encrypt', 'decrypt']
    )

    logKeyAccess('unwrap')

    // 审计日志：记录是否创建了可导出密钥
    if (extractable) {
        logger.info('[SECURITY AUDIT] 创建了可导出的主密钥', {
            timestamp: new Date().toISOString(),
            action: 'unwrap_extractable'
        })
    }

    return masterKey
}

// ═══════════════════════════════════════════════════════════════════
// 主密钥生成与管理
// ═══════════════════════════════════════════════════════════════════

/**
 * 生成新的真随机主密钥
 * @param extractable 是否允许导出（默认 true，因为新生成的密钥需要被包装存储）
 * @description 使用 crypto.getRandomValues 生成 256 位随机密钥
 * @returns 新生成的 CryptoKey
 * @security 首次生成时需要 extractable=true 以便包装存储，
 *           后续日常使用时会以 extractable=false 解包
 */
export async function generateMasterKey(extractable: boolean = true): Promise<CryptoKey> {
    ensureCryptoAvailable()

    // 生成 256 位（32 字节）真随机数据
    const keyMaterial = crypto.getRandomValues(new Uint8Array(32))

    // 导入为 AES-GCM 密钥
    const key = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        {
            name: CRYPTO_CONFIG.ALGORITHM,
            length: CRYPTO_CONFIG.KEY_LENGTH
        },
        extractable, // 根据使用场景决定是否可导出
        ['encrypt', 'decrypt']
    )

    // 立即清零原始密钥材料
    secureZero(keyMaterial)

    logKeyAccess('generate')

    // 审计日志
    if (extractable) {
        logger.info('[SECURITY AUDIT] 生成了可导出的主密钥（用于初始包装）', {
            timestamp: new Date().toISOString(),
            action: 'generate_extractable'
        })
    }

    return key
}

/**
 * 使用密码初始化或解锁主密钥
 *
 * @param password 用户密码
 * @returns true 如果解锁成功
 *
 * @description
 * 首次调用会创建新主密钥并用密码保护，后续调用用密码解锁。
 *
 * **平台行为差异：**
 *
 * - **Tauri 环境** (桌面应用):
 *   密钥存储在系统密钥链（macOS Keychain / Windows Credential Manager）。
 *   密码参数仍用于验证用户身份，但密钥本身受操作系统保护。
 *   安全增强：导入的密钥 `extractable=false`，遵循最小权限原则。
 *
 * - **Web 环境** (浏览器):
 *   密钥使用 PBKDF2 派生的包装密钥加密后存储在 IndexedDB。
 *   密码是解密密钥的唯一凭证，密码丢失将导致数据无法恢复。
 *
 * @security
 * - 所有环境下日常操作使用的密钥均为 `extractable=false`
 * - 仅在密码更改、备份导出等场景临时创建可导出密钥
 */
export async function unlockWithPassword(password: string): Promise<boolean> {
    ensureCryptoAvailable()

    // 使用统一密码验证
    assertPasswordValid(password)

    // 检查 Tauri 环境
    if (isTauriEnvironment()) {
        const keyData = await loadMasterKeyFromTauriKeychain()
        if (keyData) {
            // Tauri 环境：直接从密钥链加载（已受系统保护）
            const keyBytes = fromBase64(keyData)
            // 安全增强：使用 extractable=false，遵循最小权限原则
            // 日常操作不需要导出密钥，仅在需要重新包装时才创建可导出密钥
            const key = await crypto.subtle.importKey(
                'raw',
                keyBytes,
                {
                    name: CRYPTO_CONFIG.ALGORITHM,
                    length: CRYPTO_CONFIG.KEY_LENGTH
                },
                false, // 安全增强：extractable=false
                ['encrypt', 'decrypt']
            )
            // 清零临时密钥材料
            secureZero(keyBytes)
            setCachedKey(key)
            logKeyAccess('load')
            return true
        }
    }

    // Web 环境：从 IndexedDB 加载包装后的密钥
    const stored = await loadWrappedMasterKeyFromStore()

    if (stored) {
        // 已有存储的密钥，尝试用密码解锁
        try {
            const { key: wrappingKey } = await deriveWrappingKeyFromPassword(
                password,
                stored.salt
            )

            const wrappedKeyBytes = fromBase64(stored.wrappedKey.wrappedKey)
            const ivBytes = fromBase64(stored.wrappedKey.iv)

            const masterKey = await unwrapMasterKey(wrappedKeyBytes, ivBytes, wrappingKey)

            // 清零临时数据
            secureZero(wrappedKeyBytes)
            secureZero(ivBytes)

            setCachedKey(masterKey)
            setCachedWrappingKey(wrappingKey)
            logKeyAccess('load')

            return true
        } catch (err) {
            logger.warn('密码解锁失败', { error: err instanceof Error ? err.message : String(err) })
            return false
        }
    } else {
        // 首次使用：创建新主密钥并用密码保护
        const masterKey = await generateMasterKey()
        const { key: wrappingKey, salt } = await deriveWrappingKeyFromPassword(password)
        const { wrappedKey, iv } = await wrapMasterKey(masterKey, wrappingKey)

        // 保存到存储
        const saved = await saveWrappedMasterKeyToStore(wrappedKey, iv, salt)

        if (saved) {
            logger.info('已创建并存储新的主密钥（密码保护）')
        } else {
            logger.warn('主密钥创建成功但存储失败')
        }

        // 如果是 Tauri 环境，也存储到系统密钥链（双重备份）
        if (isTauriEnvironment()) {
            const exportedKey = await crypto.subtle.exportKey('raw', masterKey)
            const keyBase64 = toBase64(new Uint8Array(exportedKey))
            await saveMasterKeyToTauriKeychain(keyBase64)
        }

        setCachedKey(masterKey)
        setCachedWrappingKey(wrappingKey)

        return true
    }
}

/**
 * 更改主密钥保护密码
 * @param oldPassword 旧密码
 * @param newPassword 新密码
 * @returns true 如果更改成功
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    // 使用统一密码验证
    assertPasswordValid(newPassword)

    const cachedKey = getCachedKey()

    // 首先验证旧密码
    if (!cachedKey) {
        const unlocked = await unlockWithPassword(oldPassword)
        if (!unlocked) {
            throw new Error('旧密码不正确')
        }
    }

    const currentKey = getCachedKey()
    if (!currentKey) {
        throw new Error('主密钥未加载')
    }

    // 用新密码重新包装主密钥
    const { key: newWrappingKey, salt: newSalt } = await deriveWrappingKeyFromPassword(newPassword)
    const { wrappedKey: newWrappedKey, iv: newIv } = await wrapMasterKey(currentKey, newWrappingKey)

    // 保存新的包装密钥
    const saved = await saveWrappedMasterKeyToStore(newWrappedKey, newIv, newSalt)

    if (saved) {
        setCachedWrappingKey(newWrappingKey)
        logger.info('密码已更改')
        return true
    }

    return false
}

/**
 * 获取主密钥（内部使用）
 * @returns CryptoKey
 * @throws Error 如果未解锁
 */
export async function getMasterKey(): Promise<CryptoKey> {
    const cachedKey = getCachedKey()

    if (!cachedKey) {
        throw new Error('主密钥未解锁。请先调用 unlockWithPassword() 解锁。')
    }

    resetCacheTimeout()
    logKeyAccess('access')

    return cachedKey
}

// ═══════════════════════════════════════════════════════════════════
// 密钥导出/导入功能
// ═══════════════════════════════════════════════════════════════════

/**
 * 计算数据校验和
 * @param data 要计算校验和的数据
 * @returns Base64 编码的 SHA-256 校验和
 */
async function computeChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
    const hashArray = new Uint8Array(hashBuffer)
    return toBase64(hashArray)
}

/**
 * 导出主密钥（用于备份）
 * @param exportPassword 导出密码（用于保护导出的密钥）
 * @returns 导出的密钥包
 * @description 使用单独的密码加密主密钥，生成可安全传输的备份
 */
export async function exportMasterKey(exportPassword: string): Promise<ExportedKeyBundle> {
    const cachedKey = getCachedKey()

    if (!cachedKey) {
        throw new Error('主密钥未解锁。请先调用 unlockWithPassword() 解锁。')
    }

    // 使用统一密码验证（移除硬编码检查，统一使用 PASSWORD_POLICY）
    assertPasswordValid(exportPassword)

    // 导出原始密钥
    const rawKey = await crypto.subtle.exportKey('raw', cachedKey)
    const keyBytes = new Uint8Array(rawKey)

    // 用导出密码派生加密密钥
    const { key: exportKey, salt } = await deriveWrappingKeyFromPassword(exportPassword)

    // 加密密钥数据
    const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.IV_LENGTH))
    const encryptedKey = await crypto.subtle.encrypt(
        {
            name: CRYPTO_CONFIG.ALGORITHM,
            iv
        },
        exportKey,
        keyBytes
    )

    // 清零原始密钥
    secureZero(keyBytes)

    const encryptedKeyBase64 = toBase64(new Uint8Array(encryptedKey))
    const ivBase64 = toBase64(iv)
    const saltBase64 = toBase64(salt)
    const createdAt = new Date().toISOString()

    // 计算校验和
    const checksumData = `${encryptedKeyBase64}:${ivBase64}:${saltBase64}:${createdAt}`
    const checksum = await computeChecksum(checksumData)

    logKeyAccess('export')

    return {
        version: CRYPTO_CONFIG.EXPORT_VERSION,
        encryptedKey: encryptedKeyBase64,
        iv: ivBase64,
        salt: saltBase64,
        createdAt,
        checksum
    }
}

/**
 * 导入主密钥（用于恢复）
 * @param bundle 导出的密钥包
 * @param exportPassword 导出时使用的密码
 * @param newPassword 新的保护密码
 * @returns true 如果导入成功
 * @description 从备份恢复主密钥，并用新密码保护
 */
export async function importMasterKey(
    bundle: ExportedKeyBundle,
    exportPassword: string,
    newPassword: string
): Promise<boolean> {
    // 验证版本
    if (bundle.version !== CRYPTO_CONFIG.EXPORT_VERSION) {
        throw new Error(`不支持的导出版本: ${bundle.version}`)
    }

    // 验证校验和
    const checksumData = `${bundle.encryptedKey}:${bundle.iv}:${bundle.salt}:${bundle.createdAt}`
    const expectedChecksum = await computeChecksum(checksumData)
    if (bundle.checksum !== expectedChecksum) {
        throw new Error('密钥包校验失败，数据可能已损坏')
    }

    // 使用统一密码验证
    assertPasswordValid(newPassword)

    try {
        // 解码导出数据
        const encryptedKeyBytes = fromBase64(bundle.encryptedKey)
        const ivBytes = fromBase64(bundle.iv)
        const saltBytes = fromBase64(bundle.salt)

        // 用导出密码派生解密密钥
        const { key: exportKey } = await deriveWrappingKeyFromPassword(exportPassword, saltBytes)

        // 解密主密钥
        const decryptedKey = await crypto.subtle.decrypt(
            {
                name: CRYPTO_CONFIG.ALGORITHM,
                iv: ivBytes
            },
            exportKey,
            encryptedKeyBytes
        )

        // 导入主密钥（临时可导出，仅用于包装存储）
        const extractableMasterKey = await crypto.subtle.importKey(
            'raw',
            decryptedKey,
            {
                name: CRYPTO_CONFIG.ALGORITHM,
                length: CRYPTO_CONFIG.KEY_LENGTH
            },
            true, // 临时可导出，用于包装和存储到 Tauri 密钥链
            ['encrypt', 'decrypt']
        )

        // 清零临时数据
        secureZero(encryptedKeyBytes)
        secureZero(ivBytes)

        // 用新密码保护并存储
        const { key: wrappingKey, salt: newSalt } = await deriveWrappingKeyFromPassword(newPassword)
        const { wrappedKey, iv } = await wrapMasterKey(extractableMasterKey, wrappingKey)

        const saved = await saveWrappedMasterKeyToStore(wrappedKey, iv, newSalt)

        if (saved) {
            // 安全增强：创建不可导出的工作密钥用于日常操作
            // 可导出密钥仅用于上述包装操作，不缓存
            const exportedKeyData = await crypto.subtle.exportKey('raw', extractableMasterKey)
            const workingKey = await crypto.subtle.importKey(
                'raw',
                exportedKeyData,
                {
                    name: CRYPTO_CONFIG.ALGORITHM,
                    length: CRYPTO_CONFIG.KEY_LENGTH
                },
                false, // 工作密钥不可导出，遵循最小权限原则
                ['encrypt', 'decrypt']
            )
            // Tauri 环境同步到系统密钥链（必须在 secureZero 之前）
            if (isTauriEnvironment()) {
                const keyBase64 = toBase64(new Uint8Array(exportedKeyData))
                await saveMasterKeyToTauriKeychain(keyBase64)
            }

            // 清零临时密钥材料（在 Tauri 密钥链存储之后）
            secureZero(new Uint8Array(exportedKeyData))

            setCachedKey(workingKey)
            setCachedWrappingKey(wrappingKey)

            logKeyAccess('import')
            logger.info('主密钥已从备份恢复')
            return true
        }

        return false
    } catch (error) {
        logger.error('密钥导入失败', error)
        const importError = new Error('密钥导入失败，请检查导出密码是否正确') as Error & { cause: unknown }
        importError.cause = error
        throw importError
    }
}

/**
 * 删除所有存储的密钥（危险操作）
 * @description 删除所有本地存储的密钥数据，数据将无法恢复
 */
export async function deleteAllKeys(): Promise<void> {
    // 清除内存缓存
    clearKeyCache()

    // 删除 IndexedDB 中的密钥
    await deleteKeysFromStore()

    // Tauri 环境删除系统密钥链中的密钥
    if (isTauriEnvironment()) {
        await deleteMasterKeyFromTauriKeychain()
    }

    logger.warn('所有密钥已删除')
}

// 重新导出清除缓存函数
export { clearKeyCache, isKeyUnlocked } from './lifecycle'
export { needsPasswordSetup } from './storage'
