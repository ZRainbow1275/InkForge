/**
 * 加密服务 - Web Crypto API 检测与 Tauri 环境
 */

import { logger } from '@/services/error'
import { isTauriEnv } from '@/utils/platform'
import type { TauriInvoke, KeyOperationType } from './types'

/**
 * 检测 Web Crypto API 是否可用
 */
export function isCryptoAvailable(): boolean {
    try {
        return (
            typeof crypto !== 'undefined' &&
            typeof crypto.subtle !== 'undefined' &&
            typeof crypto.getRandomValues === 'function' &&
            typeof crypto.subtle.encrypt === 'function' &&
            typeof crypto.subtle.decrypt === 'function' &&
            typeof crypto.subtle.importKey === 'function'
        )
    } catch {
        return false
    }
}

/**
 * 确保 Web Crypto API 可用，否则抛出明确错误
 */
export function ensureCryptoAvailable(): void {
    if (!isCryptoAvailable()) {
        throw new Error(
            '[InkForge] Web Crypto API 不可用。' +
            '可能原因：1) 非安全上下文（需要 HTTPS 或 localhost）；' +
            '2) 浏览器不支持 Web Crypto API；' +
            '3) 当前环境为 Node.js 且未配置 crypto 模块。'
        )
    }
}

/**
 * 检测是否在 Tauri 环境中运行
 *
 * 委派给 `@/utils/platform` 的统一检测，避免「仅看 `window.__TAURI__`」的漏判：
 * Tauri 1.x 默认 `withGlobalTauri: false` 不再注入 `window.__TAURI__`，
 * 只注入 `__TAURI_INVOKE__` / `__TAURI_IPC__` 等。若此处仍只查 `__TAURI__`，
 * prod 桌面构建会被误判为 web，导致主密钥永不走系统密钥链（与 storage.ts 的
 * `isTauriEnv()` 判定不一致，是 mock 单测抓不到的运行时缺陷）。
 */
export function isTauriEnvironment(): boolean {
    return isTauriEnv()
}

/**
 * 获取 Tauri invoke 函数
 */
export function getTauriInvoke(): TauriInvoke | null {
    if (!isTauriEnvironment()) {
        return null
    }

    const tauri = (window as Window & { __TAURI__?: { invoke?: TauriInvoke } }).__TAURI__
    return tauri?.invoke ?? null
}

/**
 * 记录密钥访问审计日志
 */
export function logKeyAccess(operation: KeyOperationType): void {
    logger.debug('密钥操作审计', {
        operation,
        timestamp: new Date().toISOString(),
    })
}
