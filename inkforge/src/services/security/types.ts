/**
 * Security Types - 安全服务类型定义
 *
 * 统一定义所有安全相关的类型接口
 * 作为安全服务层的类型契约
 */

// ═══════════════════════════════════════════════════════════════════
// 重新导出各模块类型（保持向后兼容）
// ═══════════════════════════════════════════════════════════════════

// CSS 净化器类型 - 从 css-sanitizer.ts 重新导出
export type {
  SanitizeResult as CSSSanitizeResult,
  SanitizerOptions as CSSSanitizerOptions
} from './css-sanitizer'

// HTML 净化器类型 - 从 html-sanitizer.ts 重新导出
export type {
  HTMLSanitizeMode,
  HtmlSanitizerOptions as HTMLSanitizerOptions,
  HtmlSanitizeResult as HTMLSanitizeResult
} from './html-sanitizer'

// ═══════════════════════════════════════════════════════════════════
// SSRF 验证器类型
// ═══════════════════════════════════════════════════════════════════

/** SSRF 验证结果 */
export interface SSRFValidationResult {
  /** 是否安全 */
  safe: boolean
  /** 如果不安全，说明原因 */
  reason?: string
  /** 解析后的 URL 信息 */
  parsedUrl?: {
    protocol: string
    hostname: string
    port: string
    pathname: string
  }
}

/** SSRF 验证器选项 */
export interface SSRFValidatorOptions {
  /** 允许的协议列表 */
  allowedProtocols?: readonly string[]
  /** 额外的阻止主机名 */
  additionalBlockedHosts?: string[]
  /** 是否允许私有 IP */
  allowPrivateIPs?: boolean
  /** 是否启用 DNS 重绑定防护 */
  enableDNSRebindingProtection?: boolean
}

// ═══════════════════════════════════════════════════════════════════
// 通用安全类型
// ═══════════════════════════════════════════════════════════════════

/** 安全错误基类接口 */
export interface SecurityErrorInfo {
  name: string
  message: string
  code?: string
  details?: Record<string, unknown>
}

/** 安全审计日志条目 */
export interface SecurityAuditEntry {
  timestamp: Date
  action: 'sanitize' | 'validate' | 'block' | 'allow'
  target: 'css' | 'html' | 'url' | 'input'
  result: 'success' | 'modified' | 'blocked'
  details?: Record<string, unknown>
}

/** 安全服务统计 */
export interface SecurityStats {
  /** CSS 净化统计 */
  css: {
    totalProcessed: number
    patternsRemoved: number
  }
  /** HTML 净化统计 */
  html: {
    totalProcessed: number
    elementsRemoved: number
    attributesRemoved: number
  }
  /** SSRF 验证统计 */
  ssrf: {
    totalValidated: number
    blockedRequests: number
  }
}

/** 净化器接口 - 通用净化器契约 */
export interface Sanitizer<TResult> {
  sanitize: (input: string) => TResult
  sanitizeString: (input: string) => string
  isSafe: (input: string) => boolean
}
