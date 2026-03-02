/**
 * 加密服务 - 密钥生命周期管理
 */

import { logger } from '@/services/error'
import { CRYPTO_CONFIG } from './config'
import { logKeyAccess } from './environment'

/** 缓存的加密密钥 */
let cachedKey: CryptoKey | null = null

/** 缓存的密码派生包装密钥 */
let cachedWrappingKey: CryptoKey | null = null

/** 密钥缓存超时定时器 */
let cacheTimeoutId: ReturnType<typeof setTimeout> | null = null

/** 用户是否已解锁 */
let isUnlockedState: boolean = false

/**
 * 重置密钥缓存超时
 */
export function resetCacheTimeout(): void {
    if (cacheTimeoutId !== null) {
        clearTimeout(cacheTimeoutId)
    }

    cacheTimeoutId = setTimeout(() => {
        clearKeyCache()
        logger.info('密钥缓存因超时已自动清理')
    }, CRYPTO_CONFIG.KEY_CACHE_TIMEOUT_MS)
}

/**
 * 页面可见性变化处理器
 */
function handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
        clearKeyCache()
        logger.info('密钥缓存因页面隐藏已自动清理')
    }
}

/**
 * 初始化密钥生命周期管理
 */
export function initKeyLifecycleManagement(): void {
    if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        document.addEventListener('visibilitychange', handleVisibilityChange)
    }
}

/**
 * 清除缓存的密钥
 */
export function clearKeyCache(): void {
    cachedKey = null
    cachedWrappingKey = null
    isUnlockedState = false

    if (cacheTimeoutId !== null) {
        clearTimeout(cacheTimeoutId)
        cacheTimeoutId = null
    }

    logKeyAccess('cache_clear')
}

/**
 * 检查密钥是否已解锁
 */
export function isKeyUnlocked(): boolean {
    return isUnlockedState && cachedKey !== null
}

/**
 * 获取缓存的主密钥
 */
export function getCachedKey(): CryptoKey | null {
    return cachedKey
}

/**
 * 设置缓存的主密钥
 */
export function setCachedKey(key: CryptoKey): void {
    cachedKey = key
    isUnlockedState = true
    resetCacheTimeout()
}

/**
 * 获取缓存的包装密钥
 */
export function getCachedWrappingKey(): CryptoKey | null {
    return cachedWrappingKey
}

/**
 * 设置缓存的包装密钥
 */
export function setCachedWrappingKey(key: CryptoKey): void {
    cachedWrappingKey = key
}

// 模块加载时初始化
initKeyLifecycleManagement()
