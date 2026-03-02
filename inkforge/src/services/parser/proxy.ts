/**
 * URL 解析服务 - CORS 代理管理
 */

import { PARSER_CONFIG } from '@/constants'
import { REQUEST_LIMITS, getConfigWithHardLimit } from '@/config/security'
import { AppError, ErrorCode, logger } from '../error'
import type { ProxyConfig } from './types'

/** 硬性上限常量 */
const PARSE_TIMEOUT_HARD_LIMIT = 60_000 // 60秒
const MAX_RETRIES_HARD_LIMIT = 10
const INITIAL_RETRY_DELAY_HARD_LIMIT = 10_000 // 10秒

/** 解析请求超时时间（毫秒）- 硬性上限 60 秒 */
export const PARSE_TIMEOUT_MS = getConfigWithHardLimit(
    import.meta.env.VITE_PARSE_TIMEOUT,
    PARSER_CONFIG.TIMEOUT_MS,
    PARSE_TIMEOUT_HARD_LIMIT
)

/** 最大重试次数 - 硬性上限 10 次 */
export const MAX_RETRIES = getConfigWithHardLimit(
    import.meta.env.VITE_PARSE_MAX_RETRIES,
    PARSER_CONFIG.MAX_RETRIES,
    MAX_RETRIES_HARD_LIMIT
)

/** 初始重试延迟（毫秒）- 硬性上限 10 秒 */
export const INITIAL_RETRY_DELAY_MS = getConfigWithHardLimit(
    import.meta.env.VITE_PARSE_INITIAL_RETRY_DELAY,
    PARSER_CONFIG.INITIAL_RETRY_DELAY_MS,
    INITIAL_RETRY_DELAY_HARD_LIMIT
)

/** 响应体最大大小限制 */
export const MAX_RESPONSE_SIZE = REQUEST_LIMITS.PARSE_MAX_RESPONSE_SIZE

/**
 * 验证代理 URL 安全性
 */
function validateProxyUrl(url: string): void {
    if (!url.startsWith('https://')) {
        throw new AppError(
            ErrorCode.PARSE_FETCH_FAILED,
            `[Security] 代理 URL 必须使用 HTTPS 协议: ${url}`,
            { url, reason: 'HTTPS_REQUIRED' }
        )
    }

    try {
        new URL(url.replace(/[?=]$/, ''))
    } catch {
        throw new AppError(
            ErrorCode.PARSE_FETCH_FAILED,
            `[Security] 无效的代理 URL 格式: ${url}`,
            { url, reason: 'INVALID_FORMAT' }
        )
    }
}

/**
 * 获取 CORS 代理配置
 */
export function getCorsProxies(): ProxyConfig[] {
    const proxies: ProxyConfig[] = []
    const isProduction = import.meta.env.PROD

    const selfHostedProxyUrl = import.meta.env.VITE_CORS_PROXY_URL as string | undefined

    if (selfHostedProxyUrl && selfHostedProxyUrl.trim() !== '') {
        validateProxyUrl(selfHostedProxyUrl)

        proxies.push({
            url: selfHostedProxyUrl,
            isSelfHosted: true
        })

        logger.info('[Security] 已配置自建 CORS 代理', {
            proxy: selfHostedProxyUrl.replace(/^(https:\/\/[^/]+).*/, '$1/***')
        })
    }

    if (isProduction && proxies.length === 0) {
        throw new AppError(
            ErrorCode.PARSE_FETCH_FAILED,
            '[Security] 生产环境必须配置 VITE_CORS_PROXY_URL 环境变量。',
            { environment: 'production', reason: 'SELF_HOSTED_PROXY_REQUIRED' }
        )
    }

    if (!isProduction && proxies.length === 0) {
        throw new AppError(
            ErrorCode.PARSE_FETCH_FAILED,
            '[Security] 请配置 VITE_CORS_PROXY_URL 环境变量或使用 Vite 本地代理。',
            { environment: 'development', reason: 'PROXY_NOT_CONFIGURED' }
        )
    }

    return proxies
}

/**
 * 安全构建代理请求 URL
 */
export function buildProxyUrl(proxyUrl: string, targetUrl: string): string {
    const encodedTarget = encodeURIComponent(targetUrl)

    if (proxyUrl.endsWith('=')) {
        return proxyUrl + encodedTarget
    }

    if (proxyUrl.endsWith('?')) {
        return proxyUrl + 'url=' + encodedTarget
    }

    try {
        const proxyUrlObj = new URL(proxyUrl)
        proxyUrlObj.searchParams.set('url', targetUrl)
        return proxyUrlObj.toString()
    } catch {
        const separator = proxyUrl.includes('?') ? '&' : '?'
        return proxyUrl + separator + 'url=' + encodedTarget
    }
}

/**
 * 指数退避重试工具函数
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = MAX_RETRIES,
    initialDelay: number = INITIAL_RETRY_DELAY_MS
): Promise<T> {
    let lastError: Error | null = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            if (attempt < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, attempt)
                logger.debug(`重试请求 (${attempt + 1}/${maxRetries})`, { delay })
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }
    throw lastError
}
