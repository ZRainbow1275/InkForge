/**
 * 加密服务 - 核心加解密函数
 */

import { CRYPTO_CONFIG, ENABLE_ENCRYPTION } from './config'
import { getMasterKey } from './key-management'
import { fromBase64, toBase64 } from './storage'
import type { EncryptedData, UnencryptedData } from './types'

// ═══════════════════════════════════════════════════════════════════
// 加密/解密核心函数
// ═══════════════════════════════════════════════════════════════════

/**
 * 加密字符串
 * @param plaintext 明文字符串
 * @returns 加密数据对象，version=2 表示使用真随机密钥
 * @description 使用 AES-GCM-256 加密，每次加密使用随机 IV
 */
export async function encrypt(plaintext: string): Promise<EncryptedData | UnencryptedData> {
    if (!ENABLE_ENCRYPTION) {
        // 加密禁用时返回明确标记的未加密对象
        const bytes = new TextEncoder().encode(plaintext)
        const base64 = toBase64(bytes)
        return {
            __encrypted: false,
            data: base64,
            version: 0
        }
    }

    const key = await getMasterKey()
    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)

    // 生成随机 IV
    const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.IV_LENGTH))

    // 加密
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: CRYPTO_CONFIG.ALGORITHM,
            iv
        },
        key,
        data
    )

    // 合并 IV 和密文
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(ciphertext), iv.length)

    // Base64 编码
    const base64 = toBase64(combined)

    return {
        __encrypted: true,
        data: base64,
        version: 2 // 新版加密标识
    }
}

/**
 * 使用指定密钥解密数据
 * @param encrypted 加密数据
 * @param key 解密密钥
 * @returns 明文字符串
 */
export async function decryptWithKey(encrypted: EncryptedData, key: CryptoKey): Promise<string> {
    // Base64 解码
    const combined = fromBase64(encrypted.data)

    // 分离 IV 和密文
    const iv = combined.slice(0, CRYPTO_CONFIG.IV_LENGTH)
    const ciphertext = combined.slice(CRYPTO_CONFIG.IV_LENGTH)

    // 解密
    const decrypted = await crypto.subtle.decrypt(
        {
            name: CRYPTO_CONFIG.ALGORITHM,
            iv
        },
        key,
        ciphertext
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
}

/**
 * 解密数据
 * @param encrypted 加密数据对象
 * @returns 明文字符串
 * @description 使用主密钥解密数据
 */
export async function decrypt(encrypted: EncryptedData): Promise<string> {
    if (!ENABLE_ENCRYPTION) {
        // 加密禁用时直接解码
        const bytes = fromBase64(encrypted.data)
        return new TextDecoder().decode(bytes)
    }

    const key = await getMasterKey()
    return decryptWithKey(encrypted, key)
}
