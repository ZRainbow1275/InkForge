/**
 * URL 解析服务 - 模块入口
 *
 * 模块化结构：
 * - types.ts: 类型定义和 Schema
 * - ssrf.ts: SSRF 安全防护
 * - request.ts: 请求状态管理器
 * - proxy.ts: CORS 代理管理
 * - extractor.ts: HTML 内容提取
 * - index.ts: 模块入口和主要导出
 */

import { AppError, ErrorCode, logger } from '../error'
import type { ParseResult, ProxyConfig } from './types'
import { validateUrlSecurity, validateResponseIP } from './ssrf'
import { parserRequestState } from './request'
import {
    getCorsProxies,
    buildProxyUrl,
    retryWithBackoff,
    PARSE_TIMEOUT_MS,
    MAX_RESPONSE_SIZE
} from './proxy'
import { parseHtml, calculateScore } from './extractor'

// 重新导出类型和工具函数
export type { ParseResult, ProxyConfig } from './types'
export { calculateScore } from './extractor'
export { parserRequestState } from './request'

/**
 * 取消当前活跃的解析请求
 */
export function cancelParseRequest(): boolean {
    if (parserRequestState.abortIfActive()) {
        logger.info('URL 解析请求已取消')
        return true
    }
    return false
}

/**
 * 重置 Parser 请求状态
 */
export function resetParserState(): void {
    parserRequestState.reset()
}

/**
 * 通过 CORS 代理获取网页内容
 */
async function fetchWithProxy(url: string, signal?: AbortSignal): Promise<string> {
    const errors: string[] = []
    const proxies = getCorsProxies()

    const sortedProxies = [...proxies].sort((a: ProxyConfig, b: ProxyConfig) => {
        if (a.isSelfHosted && !b.isSelfHosted) return -1
        if (!a.isSelfHosted && b.isSelfHosted) return 1
        return 0
    })

    for (const proxy of sortedProxies) {
        if (signal?.aborted) {
            throw new AppError(
                ErrorCode.PARSE_FETCH_FAILED,
                '请求已取消',
                { url, reason: 'ABORTED' }
            )
        }

        try {
            const result = await retryWithBackoff(async () => {
                const timeoutSignal = AbortSignal.timeout(PARSE_TIMEOUT_MS)
                const combinedSignal = signal
                    ? AbortSignal.any([signal, timeoutSignal])
                    : timeoutSignal

                const proxyRequestUrl = buildProxyUrl(proxy.url, url)

                const response = await fetch(proxyRequestUrl, {
                    signal: combinedSignal
                })
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`)
                }

                // DNS Rebinding 防护：验证响应头中的真实 IP 地址
                // 防止攻击者通过短 TTL DNS 记录在请求时切换到内网 IP
                try {
                    const parsedUrl = new URL(url)
                    validateResponseIP(parsedUrl.hostname, response.headers)
                } catch (ipError) {
                    // 如果是安全错误，直接抛出
                    if (ipError instanceof AppError) {
                        throw ipError
                    }
                    // 其他错误记录但不阻止（某些代理可能不提供 IP 头部）
                    logger.debug('DNS Rebinding 验证跳过', {
                        reason: ipError instanceof Error ? ipError.message : String(ipError)
                    })
                }

                const contentLength = response.headers.get('Content-Length')
                if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
                    throw new AppError(
                        ErrorCode.PARSE_FETCH_FAILED,
                        `响应体过大: ${contentLength} 字节`,
                        { url, contentLength, maxSize: MAX_RESPONSE_SIZE, reason: 'RESPONSE_TOO_LARGE' }
                    )
                }

                const reader = response.body?.getReader()
                if (!reader) {
                    return await response.text()
                }

                const chunks: Uint8Array[] = []
                let totalSize = 0

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    totalSize += value.length
                    if (totalSize > MAX_RESPONSE_SIZE) {
                        reader.cancel()
                        throw new AppError(
                            ErrorCode.PARSE_FETCH_FAILED,
                            `响应体过大: 已读取 ${totalSize} 字节`,
                            { url, readSize: totalSize, maxSize: MAX_RESPONSE_SIZE, reason: 'RESPONSE_TOO_LARGE' }
                        )
                    }

                    chunks.push(value)
                }

                const combined = new Uint8Array(totalSize)
                let offset = 0
                for (const chunk of chunks) {
                    combined.set(chunk, offset)
                    offset += chunk.length
                }

                return new TextDecoder().decode(combined)
            })
            logger.debug('代理请求成功', { proxy: proxy.url, isSelfHosted: proxy.isSelfHosted, url })
            return result
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                throw new AppError(
                    ErrorCode.PARSE_FETCH_FAILED,
                    '请求已取消',
                    { url, reason: 'ABORTED' }
                )
            }
            const msg = err instanceof Error ? err.message : String(err)
            errors.push(`${proxy.url}: ${msg}`)
            logger.debug('代理请求重试后仍失败', { proxy: proxy.url, url, error: msg })
        }
    }

    throw new AppError(
        ErrorCode.PARSE_FETCH_FAILED,
        '无法获取网页内容，请检查URL是否正确',
        { url, attempts: errors }
    )
}

/**
 * 解析 URL 获取网页结构化数据
 */
export async function parseUrl(url: string): Promise<ParseResult> {
    parserRequestState.abortIfActive()

    const controller = new AbortController()
    parserRequestState.setController(controller)

    try {
        validateUrlSecurity(url)
        const html = await fetchWithProxy(url, controller.signal)
        return parseHtml(html, url)
    } finally {
        parserRequestState.clearController()
    }
}
