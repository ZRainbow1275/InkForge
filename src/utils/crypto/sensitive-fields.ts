/**
 * 加密服务 - 敏感字段处理
 * 提供对象敏感字段的自动加解密功能
 */

import { logger } from '@/services/error'
import { ENABLE_ENCRYPTION } from './config'
import { encrypt, decrypt } from './encryption'
import { fromBase64 } from './storage'
import { SENSITIVE_FIELDS, isEncryptedData, isUnencryptedData } from './types'
import type { SensitiveField, EncryptedData, UnencryptedData } from './types'

// ═══════════════════════════════════════════════════════════════════
// 敏感字段判断
// ═══════════════════════════════════════════════════════════════════

/**
 * 判断字段是否为敏感字段
 * @param fieldName 字段名
 * @returns true 如果是敏感字段
 */
export function isSensitiveField(fieldName: string): fieldName is SensitiveField {
    return (SENSITIVE_FIELDS as readonly string[]).includes(fieldName)
}

// ═══════════════════════════════════════════════════════════════════
// 对象敏感字段加解密
// ═══════════════════════════════════════════════════════════════════

/**
 * 加密对象中的敏感字段
 * @param obj 原始对象
 * @returns 敏感字段已加密的对象
 * @description 遍历对象，将 SENSITIVE_FIELDS 中定义的字符串字段加密
 */
export async function encryptSensitiveFields<T extends Record<string, unknown>>(
    obj: T
): Promise<T> {
    if (!ENABLE_ENCRYPTION) {
        return obj
    }

    const result = { ...obj }

    for (const field of SENSITIVE_FIELDS) {
        if (field in result && typeof result[field] === 'string') {
            const value = result[field] as string
            if (value && value.length > 0) {
                (result as Record<string, unknown>)[field] = await encrypt(value)
            }
        }
    }

    return result
}

/**
 * 解密对象中的敏感字段
 * @param obj 加密的对象
 * @returns 敏感字段已解密的对象
 * @description 遍历对象，将加密的敏感字段解密为明文字符串
 */
export async function decryptSensitiveFields<T extends Record<string, unknown>>(
    obj: T
): Promise<T> {
    if (!ENABLE_ENCRYPTION) {
        return obj
    }

    const result = { ...obj }

    for (const field of SENSITIVE_FIELDS) {
        if (field in result) {
            const value = result[field]

            // 处理加密数据
            if (isEncryptedData(value)) {
                try {
                    (result as Record<string, unknown>)[field] = await decrypt(value)
                } catch (err) {
                    logger.error(`解密字段失败`, err, { field: field as string })
                    // 解密失败时返回空字符串
                    (result as Record<string, unknown>)[field] = ''
                }
            }

            // 处理未加密标记数据（加密禁用时产生的）
            if (isUnencryptedData(value)) {
                try {
                    const bytes = fromBase64(value.data)
                    ;(result as Record<string, unknown>)[field] = new TextDecoder().decode(bytes)
                } catch {
                    (result as Record<string, unknown>)[field] = ''
                }
            }
        }
    }

    return result
}

/**
 * 批量解密对象数组
 * @param items 加密的对象数组
 * @returns 解密后的对象数组
 */
export async function decryptSensitiveFieldsBatch<T extends Record<string, unknown>>(
    items: T[]
): Promise<T[]> {
    return Promise.all(items.map(item => decryptSensitiveFields(item)))
}

// ═══════════════════════════════════════════════════════════════════
// 高阶函数装饰器
// ═══════════════════════════════════════════════════════════════════

/**
 * 创建加密写入包装器
 * @param fn 原始写入函数
 * @returns 自动加密敏感字段的包装函数
 * @description 用于包装 Repository 的 create/update 方法
 */
export function withEncryption<T extends Record<string, unknown>, R>(
    fn: (entity: T) => Promise<R>
): (entity: T) => Promise<R> {
    return async (entity: T) => {
        const encrypted = await encryptSensitiveFields(entity)
        return fn(encrypted)
    }
}

/**
 * 创建解密读取包装器
 * @param fn 原始读取函数
 * @returns 自动解密敏感字段的包装函数
 * @description 用于包装 Repository 的 findById/findAll 方法
 */
export function withDecryption<T extends Record<string, unknown>>(
    fn: () => Promise<T | undefined>
): () => Promise<T | undefined>
export function withDecryption<T extends Record<string, unknown>>(
    fn: () => Promise<T[]>
): () => Promise<T[]>
export function withDecryption<T extends Record<string, unknown>>(
    fn: () => Promise<T | undefined | T[]>
): () => Promise<T | undefined | T[]> {
    return async () => {
        const result = await fn()
        if (result === undefined) {
            return undefined
        }
        if (Array.isArray(result)) {
            return decryptSensitiveFieldsBatch(result)
        }
        return decryptSensitiveFields(result)
    }
}
