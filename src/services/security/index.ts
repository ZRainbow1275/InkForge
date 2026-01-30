/**
 * Security Services - 统一安全服务模块
 *
 * 提供各类安全相关的工具和服务：
 * - CSS 净化器：防止 CSS 注入攻击
 * - HTML 净化器：基于 DOMPurify 的 XSS 防护
 * - SSRF 验证：URL 安全验证（从 config/security 导入）
 * - 类型定义：统一的安全类型契约
 */

// ═══════════════════════════════════════════════════════════════════
// CSS 净化器
// ═══════════════════════════════════════════════════════════════════

export {
  sanitizeCSS,
  sanitizeCSSString,
  isCSSSafe,
  getSecurityIssues as getCSSSecurityIssues,
  CSSSecurityError,
  type SanitizeResult as CSSSanitizeResult,
  type SanitizerOptions as CSSSanitizerOptions
} from './css-sanitizer'

// ═══════════════════════════════════════════════════════════════════
// HTML 净化器
// ═══════════════════════════════════════════════════════════════════

export {
  // 核心函数
  sanitizeHTML,
  sanitizeHTMLString,
  isHTMLSafe,
  getHTMLSecurityIssues,
  createDOMPurifyConfig,
  createSanitizerInstance,
  createEditorSanitizerConfig,
  // 预配置净化函数
  sanitizeHTMLStrict,
  sanitizeHTMLPermissive,
  sanitizeHTMLWechat,
  sanitizeHTMLMarkdown,
  // 预设净化器对象
  strictSanitizer,
  standardSanitizer,
  wechatExportSanitizer,
  markdownRenderSanitizer,
  // 错误类
  HTMLSecurityError,
  // 类型
  type HTMLSanitizeMode,
  type HtmlSanitizerOptions,
  type HtmlSanitizeResult
} from './html-sanitizer'

// ═══════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════

export type {
  SSRFValidationResult,
  SSRFValidatorOptions,
  SecurityErrorInfo,
  SecurityAuditEntry,
  SecurityStats,
  Sanitizer
} from './types'

// ═══════════════════════════════════════════════════════════════════
// SSRF 验证（从配置模块重新导出）
// ═══════════════════════════════════════════════════════════════════

export { SSRF_PROTECTION } from '@/config/security'
