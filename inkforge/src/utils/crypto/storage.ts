/**
 * 加密服务 - 密钥存储层
 * 支持 IndexedDB 和 Tauri 系统密钥链
 */

import { logger } from '@/services/error'
import { isTauriEnv, tauriInvoke } from '@/utils/platform'
import { CRYPTO_CONFIG } from './config'
import { isTauriEnvironment } from './environment'
import type { WrappedMasterKey } from './types'

// ═══════════════════════════════════════════════════════════════════
// 安全工具函数
// ═══════════════════════════════════════════════════════════════════

/**
 * 安全清零 Uint8Array（密钥材料用后清零）
 * @param buffer 要清零的缓冲区
 */
export function secureZero(buffer: Uint8Array): void {
    if (buffer && buffer.length > 0) {
        crypto.getRandomValues(buffer) // 先用随机数覆盖
        buffer.fill(0) // 再填充零
    }
}

/**
 * Base64 编码
 */
export function toBase64(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data))
}

/**
 * Base64 解码
 */
export function fromBase64(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

// ═══════════════════════════════════════════════════════════════════
// IndexedDB 安全密钥存储
// ═══════════════════════════════════════════════════════════════════

/**
 * 打开安全密钥数据库
 * @returns IndexedDB 数据库实例或 null（如果不可用）
 */
export async function openSecureKeyStore(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
        try {
            if (typeof indexedDB === 'undefined') {
                resolve(null)
                return
            }

            const request = indexedDB.open(
                CRYPTO_CONFIG.SECURE_DB_NAME,
                CRYPTO_CONFIG.SECURE_DB_VERSION
            )

            request.onerror = () => {
                logger.warn('无法打开安全密钥存储')
                resolve(null)
            }

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result
                if (!db.objectStoreNames.contains('keys')) {
                    db.createObjectStore('keys')
                }
                if (!db.objectStoreNames.contains('wrapped_keys')) {
                    db.createObjectStore('wrapped_keys')
                }
            }

            request.onsuccess = (event) => {
                resolve((event.target as IDBOpenDBRequest).result)
            }
        } catch {
            resolve(null)
        }
    })
}

/**
 * 从 IndexedDB 加载包装后的主密钥
 * @returns 包装后的密钥数据或 null
 */
export async function loadWrappedMasterKeyFromStore(): Promise<{
    wrappedKey: WrappedMasterKey
    salt: Uint8Array
} | null> {
    const db = await openSecureKeyStore()
    if (!db) return null

    return new Promise((resolve) => {
        try {
            const transaction = db.transaction('wrapped_keys', 'readonly')
            const store = transaction.objectStore('wrapped_keys')

            const keyRequest = store.get(CRYPTO_CONFIG.WRAPPED_MASTER_KEY_ID)
            const saltRequest = store.get(CRYPTO_CONFIG.WRAPPING_SALT_ID)

            let wrappedKey: WrappedMasterKey | undefined
            let salt: string | undefined

            keyRequest.onsuccess = () => {
                wrappedKey = keyRequest.result as WrappedMasterKey | undefined
            }

            saltRequest.onsuccess = () => {
                salt = saltRequest.result as string | undefined
            }

            transaction.oncomplete = () => {
                db.close()
                if (wrappedKey && salt) {
                    try {
                        const saltBytes = fromBase64(salt)
                        resolve({ wrappedKey, salt: saltBytes })
                    } catch {
                        resolve(null)
                    }
                } else {
                    resolve(null)
                }
            }

            transaction.onerror = () => {
                db.close()
                resolve(null)
            }
        } catch {
            db.close()
            resolve(null)
        }
    })
}

/**
 * 将包装后的主密钥保存到 IndexedDB
 * @param wrappedKey 包装后的密钥
 * @param iv 包装 IV
 * @param salt 密钥派生盐值
 */
export async function saveWrappedMasterKeyToStore(
    wrappedKey: Uint8Array,
    iv: Uint8Array,
    salt: Uint8Array
): Promise<boolean> {
    const db = await openSecureKeyStore()
    if (!db) return false

    return new Promise((resolve) => {
        try {
            const transaction = db.transaction('wrapped_keys', 'readwrite')
            const store = transaction.objectStore('wrapped_keys')

            const wrappedKeyData: WrappedMasterKey = {
                wrappedKey: toBase64(wrappedKey),
                iv: toBase64(iv),
                version: CRYPTO_CONFIG.EXPORT_VERSION
            }

            store.put(wrappedKeyData, CRYPTO_CONFIG.WRAPPED_MASTER_KEY_ID)
            store.put(toBase64(salt), CRYPTO_CONFIG.WRAPPING_SALT_ID)

            transaction.oncomplete = () => {
                db.close()
                resolve(true)
            }

            transaction.onerror = () => {
                db.close()
                resolve(false)
            }
        } catch {
            db.close()
            resolve(false)
        }
    })
}

/**
 * 删除 IndexedDB 中的所有密钥
 */
export async function deleteKeysFromStore(): Promise<void> {
    const db = await openSecureKeyStore()
    if (!db) return

    try {
        const transaction = db.transaction('wrapped_keys', 'readwrite')
        const store = transaction.objectStore('wrapped_keys')
        store.delete(CRYPTO_CONFIG.WRAPPED_MASTER_KEY_ID)
        store.delete(CRYPTO_CONFIG.WRAPPING_SALT_ID)

        await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve()
            transaction.onerror = () => reject(transaction.error)
        })

        db.close()
    } catch (error) {
        db.close()
        throw error
    }
}

// ═══════════════════════════════════════════════════════════════════
// Tauri 系统密钥链支持
// ═══════════════════════════════════════════════════════════════════

/**
 * 将主密钥存储到 Tauri 系统密钥链
 * @param masterKeyData Base64 编码的主密钥
 */
export async function saveMasterKeyToTauriKeychain(masterKeyData: string): Promise<boolean> {
    if (!isTauriEnv()) return false

    try {
        await tauriInvoke<void>('store_key', {
            keyId: `${CRYPTO_CONFIG.TAURI_KEYCHAIN_SERVICE}:${CRYPTO_CONFIG.MASTER_KEY_ID}`,
            keyData: masterKeyData
        })
        logger.info('主密钥已存储到系统密钥链')
        return true
    } catch (error) {
        logger.error('存储到系统密钥链失败', error)
        return false
    }
}

/**
 * 从 Tauri 系统密钥链加载主密钥
 * @returns Base64 编码的主密钥或 null
 */
export async function loadMasterKeyFromTauriKeychain(): Promise<string | null> {
    if (!isTauriEnv()) return null

    try {
        const keyData = await tauriInvoke<string | null>('get_key', {
            keyId: `${CRYPTO_CONFIG.TAURI_KEYCHAIN_SERVICE}:${CRYPTO_CONFIG.MASTER_KEY_ID}`
        })
        if (keyData) {
            logger.info('已从系统密钥链加载主密钥')
        }
        return keyData ?? null
    } catch (error) {
        logger.error('从系统密钥链加载失败', error)
        return null
    }
}

/**
 * 从 Tauri 系统密钥链删除主密钥
 */
export async function deleteMasterKeyFromTauriKeychain(): Promise<boolean> {
    if (!isTauriEnv()) return false

    try {
        await tauriInvoke<void>('delete_key', {
            keyId: `${CRYPTO_CONFIG.TAURI_KEYCHAIN_SERVICE}:${CRYPTO_CONFIG.MASTER_KEY_ID}`
        })
        logger.info('主密钥已从系统密钥链删除')
        return true
    } catch (error) {
        logger.error('从系统密钥链删除失败', error)
        return false
    }
}

/**
 * 检查是否需要设置密码（首次使用）
 */
export async function needsPasswordSetup(): Promise<boolean> {
    // Tauri 环境检查系统密钥链
    if (isTauriEnvironment()) {
        const keyData = await loadMasterKeyFromTauriKeychain()
        if (keyData) return false
    }

    // Web 环境检查 IndexedDB
    const stored = await loadWrappedMasterKeyFromStore()
    return stored === null
}
