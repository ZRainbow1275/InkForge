/**
 * URL 解析服务 - SSRF 安全防护
 *
 * 包含:
 * - URL 安全验证
 * - IP 地址私有网络检测
 * - DNS Rebinding 防护（通过响应头验证）
 */

import { AppError, ErrorCode, logger } from '../error'
import { SSRF_PROTECTION, DNS_CACHE_CONFIG } from '@/config/security'
import { shouldBlockMissingIPHeader } from '@/services/security/policy-manager'

// ═══════════════════════════════════════════════════════════════════
// DNS Rebinding 防护 - 缓存与验证（LRU 策略）
// ═══════════════════════════════════════════════════════════════════

/**
 * DNS 验证缓存条目
 */
interface DNSCacheEntry {
    /** 验证通过的 IP 地址 */
    validatedIP: string
    /** 缓存过期时间戳 */
    expiresAt: number
    /** 最后访问时间（用于 LRU） */
    lastAccess: number
}

/**
 * DNS 验证缓存管理器（带 LRU 淘汰策略）
 * 用于缓存已验证的域名-IP 映射，防止重复验证
 *
 * 安全增强：
 * - 最大条目限制防止内存耗尽（DoS 防护）
 * - LRU 策略自动淘汰最少使用的条目
 * - TTL 过期机制确保缓存新鲜度
 * - 自动清理机制：get() 时批量清理过期条目
 */
export class DNSValidationCache {
    private cache: Map<string, DNSCacheEntry> = new Map()
    private readonly ttlMs: number
    private readonly maxEntries: number
    /** 上次清理时间戳 */
    private lastCleanupTime: number = 0
    /** 清理间隔（毫秒）- 每分钟最多清理一次 */
    private readonly cleanupIntervalMs: number = 60_000

    constructor(
        ttlMs: number = DNS_CACHE_CONFIG.TTL_MS,
        maxEntries: number = DNS_CACHE_CONFIG.MAX_ENTRIES
    ) {
        this.ttlMs = ttlMs
        this.maxEntries = maxEntries
    }

    /**
     * 获取缓存的验证结果
     * 同时触发过期条目的惰性清理
     */
    get(hostname: string): string | null {
        // 惰性清理：在读取时批量清理过期条目
        this.lazyCleanup()

        const key = hostname.toLowerCase()
        const entry = this.cache.get(key)
        if (!entry) return null

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            return null
        }

        // 更新最后访问时间（LRU）
        entry.lastAccess = Date.now()
        return entry.validatedIP
    }

    /**
     * 惰性清理：定期批量清理过期条目
     * 避免每次调用都遍历，使用时间间隔控制
     */
    private lazyCleanup(): void {
        const now = Date.now()
        if (now - this.lastCleanupTime < this.cleanupIntervalMs) {
            return
        }

        this.lastCleanupTime = now
        this.cleanup()
    }

    /**
     * 设置验证结果缓存
     */
    set(hostname: string, validatedIP: string): void {
        const key = hostname.toLowerCase()
        const now = Date.now()

        // 如果达到最大条目限制，执行 LRU 淘汰
        if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
            this.evictLRU()
        }

        this.cache.set(key, {
            validatedIP,
            expiresAt: now + this.ttlMs,
            lastAccess: now
        })
    }

    /**
     * LRU 淘汰：移除最少使用的条目
     */
    private evictLRU(): void {
        let oldestKey: string | null = null
        let oldestAccess = Infinity

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccess < oldestAccess) {
                oldestAccess = entry.lastAccess
                oldestKey = key
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey)
            logger.debug('[Security] DNS 缓存 LRU 淘汰', { evictedKey: oldestKey })
        }
    }

    /**
     * 清除过期缓存
     */
    cleanup(): void {
        const now = Date.now()
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key)
            }
        }
    }

    /**
     * 清空所有缓存
     */
    clear(): void {
        this.cache.clear()
    }

    /**
     * 获取缓存大小
     */
    get size(): number {
        return this.cache.size
    }

    /**
     * 获取缓存统计信息
     */
    getStats(): { size: number; maxEntries: number; ttlMs: number } {
        return {
            size: this.cache.size,
            maxEntries: this.maxEntries,
            ttlMs: this.ttlMs
        }
    }
}

// 全局 DNS 验证缓存实例
export const dnsValidationCache = new DNSValidationCache()

/**
 * 验证 IP 地址是否安全（非私有网络）
 * @param ip IP 地址字符串
 * @returns 验证结果对象
 */
export function validateIPAddress(ip: string): { isValid: boolean; reason?: string } {
    if (!ip || ip.trim() === '') {
        return { isValid: false, reason: 'IP 地址为空' }
    }

    const cleanIP = ip.trim()
    const ipInfo = parseIpAddress(cleanIP)

    if (!ipInfo) {
        // 无法解析为 IP 地址，可能是无效格式
        return { isValid: false, reason: `无法解析 IP 地址格式: ${cleanIP}` }
    }

    const isPrivate = ipInfo.version === 4
        ? isPrivateIPv4(ipInfo.address)
        : isPrivateIPv6(ipInfo.address)

    if (isPrivate) {
        return {
            isValid: false,
            reason: `检测到私有网络 IP 地址: ${cleanIP} (IPv${ipInfo.version})`
        }
    }

    return { isValid: true }
}

/**
 * 验证响应头中的真实 IP 地址（DNS Rebinding 防护核心）
 *
 * 此函数用于在收到 HTTP 响应后，检查代理服务器返回的真实目标 IP，
 * 防止 DNS Rebinding 攻击（攻击者使用短 TTL DNS 记录在请求时切换到内网 IP）
 *
 * @param hostname 原始请求的主机名
 * @param headers 响应头对象
 * @throws AppError 如果检测到 DNS Rebinding 攻击
 */
export function validateResponseIP(hostname: string, headers: Headers): void {
    if (!SSRF_PROTECTION.ENABLE_DNS_REBINDING_PROTECTION) {
        return
    }

    // 检查是否已有缓存的验证结果
    const cachedIP = dnsValidationCache.get(hostname)

    // 尝试从响应头获取真实 IP
    // 常见的代理服务器会设置这些头部
    const realIP = headers.get('X-Real-IP')
        || headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
        || headers.get('CF-Connecting-IP') // Cloudflare
        || headers.get('True-Client-IP')   // Akamai
        || null

    if (!realIP) {
        // 检查安全策略是否要求阻止缺少 IP 头部的请求
        if (shouldBlockMissingIPHeader(hostname)) {
            throw new AppError(
                ErrorCode.PARSE_URL_INVALID,
                `[Security] DNS Rebinding 防护：响应中未包含真实 IP 头部，严格模式下已阻止请求`,
                {
                    hostname,
                    reason: 'MISSING_IP_HEADER_STRICT_MODE'
                }
            )
        }

        // 非严格模式：记录警告但不阻止请求
        logger.warn('[Security] DNS Rebinding 防护：响应中未包含真实 IP 头部', {
            hostname,
            recommendation: '建议配置代理服务器返回 X-Real-IP 头部以启用完整的 DNS Rebinding 防护',
            checkedHeaders: ['X-Real-IP', 'X-Forwarded-For', 'CF-Connecting-IP', 'True-Client-IP']
        })
        return
    }

    // 验证真实 IP 是否安全
    const validation = validateIPAddress(realIP)

    if (!validation.isValid) {
        // 检测到 DNS Rebinding 攻击！
        logger.error('[Security] DNS Rebinding 攻击检测：响应 IP 指向私有网络', {
            hostname,
            detectedIP: realIP,
            reason: validation.reason,
            cachedIP: cachedIP || 'none'
        })

        throw new AppError(
            ErrorCode.PARSE_URL_INVALID,
            `[Security] DNS Rebinding 攻击检测：目标 ${hostname} 解析到私有网络地址 ${realIP}`,
            {
                hostname,
                detectedIP: realIP,
                reason: 'DNS_REBINDING_DETECTED'
            }
        )
    }

    // 如果有缓存的 IP，检查是否一致（可选的额外安全层）
    if (cachedIP && cachedIP !== realIP) {
        logger.warn('[Security] DNS 解析 IP 变化检测', {
            hostname,
            previousIP: cachedIP,
            currentIP: realIP,
            note: '可能是正常的 DNS 轮询，但也可能是 DNS Rebinding 尝试'
        })
    }

    // 更新缓存
    dnsValidationCache.set(hostname, realIP)

    logger.debug('[Security] DNS Rebinding 防护：IP 验证通过', {
        hostname,
        validatedIP: realIP
    })
}

/**
 * 将 IPv4 地址字符串转换为 32 位整数
 */
export function ipv4ToInt(ip: string): number | null {
    const parts = ip.split('.')
    if (parts.length !== 4) return null

    let result = 0
    for (const part of parts) {
        const num = parseInt(part, 10)
        if (isNaN(num) || num < 0 || num > 255) return null
        result = (result << 8) + num
    }
    return result >>> 0 // 转换为无符号整数
}

/**
 * 检查 IPv4 地址是否在私有网络范围内
 */
export function isPrivateIPv4(ip: string): boolean {
    const ipInt = ipv4ToInt(ip)
    if (ipInt === null) return false

    for (const range of SSRF_PROTECTION.IPV4_PRIVATE_RANGES) {
        if ((ipInt & range.mask) === range.network) {
            return true
        }
    }
    return false
}

/**
 * 检查 IPv6 地址是否为私有地址
 */
export function isPrivateIPv6(ip: string): boolean {
    const normalizedIp = ip.toLowerCase()

    if (normalizedIp === '::1') return true

    for (const prefix of SSRF_PROTECTION.IPV6_PRIVATE_PREFIXES) {
        if (normalizedIp.startsWith(prefix.toLowerCase())) {
            return true
        }
    }

    return false
}

/**
 * 检查主机名是否为私有域名
 */
export function isPrivateHostname(hostname: string): boolean {
    const lowerHostname = hostname.toLowerCase()

    if (SSRF_PROTECTION.BLOCKED_HOSTNAMES.some(blocked => lowerHostname === blocked)) {
        return true
    }

    if (SSRF_PROTECTION.BLOCKED_HOSTNAME_SUFFIXES.some(suffix => lowerHostname.endsWith(suffix))) {
        return true
    }

    return false
}

/**
 * 检查主机名是否为 IP 地址格式
 */
export function parseIpAddress(hostname: string): { version: 4 | 6; address: string } | null {
    const cleanHostname = hostname.replace(/^\[|\]$/g, '')

    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (ipv4Regex.test(cleanHostname)) {
        return { version: 4, address: cleanHostname }
    }

    if (cleanHostname.includes(':')) {
        return { version: 6, address: cleanHostname }
    }

    return null
}

/**
 * 验证 URL 安全性，防止 SSRF 攻击
 */
export function validateUrlSecurity(url: string): void {
    let parsedUrl: URL

    try {
        parsedUrl = new URL(url)
    } catch {
        throw new AppError(
            ErrorCode.PARSE_URL_INVALID,
            '[Security] 无效的 URL 格式',
            { url, reason: 'INVALID_URL_FORMAT' }
        )
    }

    if (!SSRF_PROTECTION.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol as typeof SSRF_PROTECTION.ALLOWED_PROTOCOLS[number])) {
        throw new AppError(
            ErrorCode.PARSE_URL_INVALID,
            `[Security] 不允许的 URL 协议: ${parsedUrl.protocol}。仅支持 http/https`,
            { url, protocol: parsedUrl.protocol, reason: 'BLOCKED_PROTOCOL' }
        )
    }

    const hostname = parsedUrl.hostname.toLowerCase()

    if (isPrivateHostname(hostname)) {
        throw new AppError(
            ErrorCode.PARSE_URL_INVALID,
            `[Security] 禁止访问私有域名: ${hostname}`,
            { url, hostname, reason: 'BLOCKED_PRIVATE_HOSTNAME' }
        )
    }

    const ipInfo = parseIpAddress(hostname)
    if (ipInfo) {
        const isPrivate = ipInfo.version === 4
            ? isPrivateIPv4(ipInfo.address)
            : isPrivateIPv6(ipInfo.address)

        if (isPrivate) {
            throw new AppError(
                ErrorCode.PARSE_URL_INVALID,
                `[Security] 禁止访问内网 IP 地址: ${hostname}`,
                { url, hostname, ipVersion: ipInfo.version, reason: 'BLOCKED_PRIVATE_IP' }
            )
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DNS Rebinding 防护说明：
    // 此函数仅进行 URL 静态验证。完整的 DNS Rebinding 防护通过
    // validateResponseIP() 函数在 HTTP 响应后进行二次验证实现。
    //
    // 防护机制：
    // 1. 此函数：验证 URL 中的主机名/IP 不在黑名单中
    // 2. validateResponseIP()：验证响应头中的真实 IP 不是私有地址
    // 3. DNSValidationCache：缓存已验证的 IP，检测 DNS 变化
    // ═══════════════════════════════════════════════════════════════════

    // 记录 URL 安全验证日志
    logger.debug('[Security] URL 安全验证通过（静态检查）', {
        url: url.slice(0, 100),
        hostname,
        protocol: parsedUrl.protocol,
        isDomainName: parseIpAddress(hostname) === null,
        dnsRebindingProtectionEnabled: SSRF_PROTECTION.ENABLE_DNS_REBINDING_PROTECTION
    })
}
