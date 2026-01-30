/**
 * 安全策略管理器 - 统一的安全决策中心
 *
 * 设计原则：
 * - Single Source of Truth: 所有安全决策通过此管理器
 * - 分层策略: 环境 > 用户配置 > 默认值
 * - 审计追踪: 所有敏感操作都有日志
 */

import { logger } from '@/services/error'
import { SSRF_PROTECTION } from '@/config/security'

// ═══════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════

/** 安全级别 */
export type SecurityLevel = 'strict' | 'standard' | 'permissive'

/** 密钥用途 */
export type KeyPurpose =
    | 'DAILY_USE'      // 日常加解密，extractable=false
    | 'EXPORT_ONLY'    // 仅用于导出，extractable=true，用后立即销毁
    | 'WRAP_UNWRAP'    // 用于包装/解包装其他密钥

/** 安全上下文 */
export interface SecurityContext {
    /** 当前环境 */
    environment: 'production' | 'development' | 'test'
    /** 是否为 Tauri 环境 */
    isTauri: boolean
    /** 当前安全级别 */
    securityLevel: SecurityLevel
    /** 会话 ID（用于审计追踪） */
    sessionId: string
}

/** 安全审计事件 */
export interface SecurityAuditEvent {
    timestamp: string
    sessionId: string
    action: string
    details: Record<string, unknown>
    outcome: 'success' | 'failure' | 'blocked'
}

/** 密钥策略配置 */
export interface KeyPolicyConfig {
    /** 是否允许创建可导出密钥 */
    allowExtractable: boolean
    /** 可导出密钥的最大生存时间（毫秒） */
    extractableMaxLifetimeMs: number
    /** 是否要求密码保护 */
    requirePasswordProtection: boolean
}

/** DNS 防护策略配置 */
export interface DNSProtectionConfig {
    /** 是否启用严格模式（缺少 IP 头部时阻止请求） */
    strictMode: boolean
    /** 是否启用 DNS 预解析验证 */
    enablePreResolve: boolean
    /** 允许的代理头部列表 */
    allowedProxyHeaders: readonly string[]
}

// ═══════════════════════════════════════════════════════════════════
// 安全策略管理器
// ═══════════════════════════════════════════════════════════════════

/**
 * 安全策略管理器单例
 * 集中管理所有安全相关决策
 */
class SecurityPolicyManager {
    private static instance: SecurityPolicyManager | null = null
    private context: SecurityContext
    private auditLog: SecurityAuditEvent[] = []
    private readonly maxAuditLogSize = 1000

    private constructor() {
        this.context = this.initializeContext()
        this.logAudit('POLICY_MANAGER_INITIALIZED', {}, 'success')
    }

    /**
     * 获取单例实例
     */
    static getInstance(): SecurityPolicyManager {
        if (!SecurityPolicyManager.instance) {
            SecurityPolicyManager.instance = new SecurityPolicyManager()
        }
        return SecurityPolicyManager.instance
    }

    /**
     * 重置实例（仅用于测试）
     */
    static resetInstance(): void {
        SecurityPolicyManager.instance = null
    }

    /**
     * 初始化安全上下文
     */
    private initializeContext(): SecurityContext {
        const isProduction = typeof import.meta !== 'undefined' && import.meta.env?.PROD === true
        const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

        return {
            environment: isProduction ? 'production' : 'development',
            isTauri,
            securityLevel: isProduction ? 'strict' : 'standard',
            sessionId: crypto.randomUUID()
        }
    }

    /**
     * 获取当前安全上下文
     */
    getContext(): Readonly<SecurityContext> {
        return Object.freeze({ ...this.context })
    }

    /**
     * 设置安全级别（需要审计）
     */
    setSecurityLevel(level: SecurityLevel): void {
        const oldLevel = this.context.securityLevel
        this.context = { ...this.context, securityLevel: level }
        this.logAudit('SECURITY_LEVEL_CHANGED', { oldLevel, newLevel: level }, 'success')
    }

    // ═══════════════════════════════════════════════════════════════════
    // 密钥策略
    // ═══════════════════════════════════════════════════════════════════

    /**
     * 获取密钥策略配置
     */
    getKeyPolicy(): Readonly<KeyPolicyConfig> {
        const isStrict = this.context.securityLevel === 'strict'

        return Object.freeze({
            allowExtractable: true, // 总是允许，但通过生命周期控制
            extractableMaxLifetimeMs: isStrict ? 30_000 : 60_000, // 严格模式 30 秒，标准模式 60 秒
            requirePasswordProtection: isStrict
        })
    }

    /**
     * 验证密钥用途是否允许 extractable
     * @param purpose 密钥用途
     * @returns 是否允许 extractable
     */
    shouldKeyBeExtractable(purpose: KeyPurpose): boolean {
        switch (purpose) {
            case 'DAILY_USE':
                return false // 日常使用绝不允许导出
            case 'EXPORT_ONLY':
            case 'WRAP_UNWRAP':
                return true // 仅在明确需要时允许
            default:
                return false
        }
    }

    /**
     * 请求创建可导出密钥（需要审计）
     * @param purpose 密钥用途
     * @param reason 请求原因
     * @returns 是否批准
     */
    requestExtractableKey(purpose: KeyPurpose, reason: string): boolean {
        const allowed = this.shouldKeyBeExtractable(purpose)

        this.logAudit('EXTRACTABLE_KEY_REQUEST', {
            purpose,
            reason,
            allowed
        }, allowed ? 'success' : 'blocked')

        if (!allowed) {
            logger.warn('[SecurityPolicy] 可导出密钥请求被拒绝', { purpose, reason })
        }

        return allowed
    }

    // ═══════════════════════════════════════════════════════════════════
    // DNS 防护策略
    // ═══════════════════════════════════════════════════════════════════

    /**
     * 获取 DNS 防护策略配置
     */
    getDNSProtectionPolicy(): Readonly<DNSProtectionConfig> {
        const isStrict = this.context.securityLevel === 'strict'

        return Object.freeze({
            strictMode: isStrict, // 严格模式下缺少 IP 头部时阻止请求
            enablePreResolve: SSRF_PROTECTION.ENABLE_DNS_REBINDING_PROTECTION,
            allowedProxyHeaders: [
                'X-Real-IP',
                'X-Forwarded-For',
                'CF-Connecting-IP',
                'True-Client-IP'
            ] as const
        })
    }

    /**
     * 验证是否应该阻止缺少 IP 头部的请求
     * @param hostname 目标主机名
     * @returns 是否应该阻止
     */
    shouldBlockMissingIPHeader(hostname: string): boolean {
        const policy = this.getDNSProtectionPolicy()

        if (!policy.strictMode) {
            return false // 非严格模式不阻止
        }

        // 白名单检查：某些已知安全的域名可以跳过
        const trustedDomains = [
            'localhost',
            '127.0.0.1',
            '::1'
        ]

        if (trustedDomains.some(d => hostname.toLowerCase() === d)) {
            return false
        }

        this.logAudit('DNS_PROTECTION_BLOCK', {
            hostname,
            reason: 'MISSING_IP_HEADER_IN_STRICT_MODE'
        }, 'blocked')

        return true
    }

    // ═══════════════════════════════════════════════════════════════════
    // 审计日志
    // ═══════════════════════════════════════════════════════════════════

    /**
     * 记录安全审计事件
     */
    private logAudit(
        action: string,
        details: Record<string, unknown>,
        outcome: SecurityAuditEvent['outcome']
    ): void {
        const event: SecurityAuditEvent = {
            timestamp: new Date().toISOString(),
            sessionId: this.context.sessionId,
            action,
            details,
            outcome
        }

        // 内存审计日志（带大小限制）
        this.auditLog.push(event)
        if (this.auditLog.length > this.maxAuditLogSize) {
            this.auditLog.shift() // FIFO 淘汰
        }

        // 同时输出到 logger
        if (outcome === 'blocked' || outcome === 'failure') {
            logger.warn('[SecurityAudit]', event)
        } else {
            logger.debug('[SecurityAudit]', event)
        }
    }

    /**
     * 获取审计日志（只读）
     */
    getAuditLog(): readonly SecurityAuditEvent[] {
        return Object.freeze([...this.auditLog])
    }

    /**
     * 清空审计日志（需要记录）
     */
    clearAuditLog(): void {
        const count = this.auditLog.length
        this.auditLog = []
        this.logAudit('AUDIT_LOG_CLEARED', { clearedCount: count }, 'success')
    }
}

// ═══════════════════════════════════════════════════════════════════
// 导出
// ═══════════════════════════════════════════════════════════════════

/**
 * 获取安全策略管理器实例
 */
export function getSecurityPolicyManager(): SecurityPolicyManager {
    return SecurityPolicyManager.getInstance()
}

/**
 * 便捷方法：获取当前安全上下文
 */
export function getSecurityContext(): Readonly<SecurityContext> {
    return getSecurityPolicyManager().getContext()
}

/**
 * 便捷方法：检查密钥是否应该可导出
 */
export function shouldKeyBeExtractable(purpose: KeyPurpose): boolean {
    return getSecurityPolicyManager().shouldKeyBeExtractable(purpose)
}

/**
 * 便捷方法：请求创建可导出密钥
 */
export function requestExtractableKey(purpose: KeyPurpose, reason: string): boolean {
    return getSecurityPolicyManager().requestExtractableKey(purpose, reason)
}

/**
 * 便捷方法：检查是否应该阻止缺少 IP 头部的请求
 */
export function shouldBlockMissingIPHeader(hostname: string): boolean {
    return getSecurityPolicyManager().shouldBlockMissingIPHeader(hostname)
}
