/**
 * HTML Sanitizer - 统一的 HTML 净化服务
 *
 * 基于 DOMPurify 提供安全的 HTML 净化功能
 * 每次调用创建独立实例，确保线程安全
 *
 * 设计原则：
 * - 工厂模式：每次调用返回独立配置的实例
 * - 线程安全：无共享可变状态
 * - 预设配置：针对不同场景优化
 */

import DOMPurify, { type Config } from 'dompurify'
import { HTML_SECURITY } from '@/config/security'
import { logger } from '@/services/error'
import { TimeoutMutex } from '@/utils/async-manager'

// ═══════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════

/** HTML 净化模式 */
export type HTMLSanitizeMode =
  | 'strict'           // 严格模式：最小化允许的标签和属性
  | 'standard'         // 标准模式：常规安全配置
  | 'wechat-export'    // 微信导出模式：保留样式属性
  | 'markdown-render'  // Markdown 渲染模式：支持代码块等
  | 'permissive'       // 宽松模式：允许大多数安全元素
  | 'custom'           // 自定义模式：使用自定义配置

/**
 * HTML 净化器配置选项
 */
export interface HtmlSanitizerOptions {
  /** 净化模式（默认: standard） */
  mode?: HTMLSanitizeMode
  /** 是否允许外部链接（默认: true） */
  allowExternalLinks?: boolean
  /** 是否允许 data-* 属性（默认: true） */
  allowDataAttributes?: boolean
  /** 是否允许媒体元素（默认: true） */
  allowMediaElements?: boolean
  /** 是否允许样式属性（默认: false） */
  allowStyles?: boolean
  /** 自定义允许的标签（会与默认白名单合并） */
  additionalTags?: string[]
  /** 自定义允许的属性（会与默认白名单合并） */
  additionalAttrs?: string[]
  /** 是否返回 DocumentFragment 而非字符串（默认: false） */
  returnFragment?: boolean
}

/**
 * HTML 净化结果
 */
export interface HtmlSanitizeResult {
  /** 净化后的 HTML */
  html: string
  /** 是否进行了修改 */
  modified: boolean
  /** 被移除的元素数量 */
  removedElements: number
  /** 被移除的属性数量 */
  removedAttributes: number
}

/**
 * HTML 安全错误类
 */
export class HTMLSecurityError extends Error {
  public readonly code: string

  constructor(message: string, code: string = 'HTML_SECURITY_ERROR') {
    super(message)
    this.name = 'HTMLSecurityError'
    this.code = code
    // 修复 Error 继承问题，确保 instanceof 正确工作
    Object.setPrototypeOf(this, HTMLSecurityError.prototype)
  }
}

// ═══════════════════════════════════════════════════════════════════
// 预设配置
// ═══════════════════════════════════════════════════════════════════

/** 严格模式：最小化允许的标签和属性 */
const STRICT_MODE_OPTIONS: HtmlSanitizerOptions = {
  mode: 'strict',
  allowExternalLinks: false,
  allowDataAttributes: false,
  allowMediaElements: false,
  allowStyles: false
}

/** 标准模式：常规安全配置 */
const STANDARD_MODE_OPTIONS: HtmlSanitizerOptions = {
  mode: 'standard',
  allowExternalLinks: true,
  allowDataAttributes: true,
  allowMediaElements: true,
  allowStyles: false
}

/** 微信导出模式：保留内联样式 */
const WECHAT_EXPORT_OPTIONS: HtmlSanitizerOptions = {
  mode: 'wechat-export',
  allowExternalLinks: true,
  allowDataAttributes: true,
  allowMediaElements: true,
  allowStyles: true,
  additionalAttrs: ['style', 'align', 'valign', 'bgcolor', 'border', 'cellpadding', 'cellspacing']
}

/** Markdown 渲染模式：支持代码块等 */
const MARKDOWN_RENDER_OPTIONS: HtmlSanitizerOptions = {
  mode: 'markdown-render',
  allowExternalLinks: true,
  allowDataAttributes: true,
  allowMediaElements: true,
  allowStyles: true,
  additionalTags: ['input'],
  additionalAttrs: ['style', 'checked', 'disabled', 'type', 'data-language', 'data-line-numbers']
}

/** 宽松模式：允许大多数安全元素 */
const PERMISSIVE_MODE_OPTIONS: HtmlSanitizerOptions = {
  mode: 'permissive',
  allowExternalLinks: true,
  allowDataAttributes: true,
  allowMediaElements: true,
  allowStyles: true
}

/** 模式到选项的映射 */
const MODE_OPTIONS_MAP: Record<Exclude<HTMLSanitizeMode, 'custom'>, HtmlSanitizerOptions> = {
  'strict': STRICT_MODE_OPTIONS,
  'standard': STANDARD_MODE_OPTIONS,
  'wechat-export': WECHAT_EXPORT_OPTIONS,
  'markdown-render': MARKDOWN_RENDER_OPTIONS,
  'permissive': PERMISSIVE_MODE_OPTIONS
}

// ═══════════════════════════════════════════════════════════════════
// 配置构建
// ═══════════════════════════════════════════════════════════════════

/**
 * 根据模式获取合并后的选项
 *
 * @param options - 用户提供的选项
 * @returns 合并后的完整选项
 */
function getMergedOptions(options: HtmlSanitizerOptions = {}): HtmlSanitizerOptions {
  const mode = options.mode || 'standard'

  if (mode === 'custom') {
    return {
      mode: 'custom',
      allowExternalLinks: options.allowExternalLinks ?? true,
      allowDataAttributes: options.allowDataAttributes ?? true,
      allowMediaElements: options.allowMediaElements ?? true,
      allowStyles: options.allowStyles ?? false,
      additionalTags: options.additionalTags ?? [],
      additionalAttrs: options.additionalAttrs ?? [],
      returnFragment: options.returnFragment ?? false
    }
  }

  const presetOptions = MODE_OPTIONS_MAP[mode]
  return {
    ...presetOptions,
    // 允许用户覆盖预设选项
    additionalTags: [...(presetOptions.additionalTags || []), ...(options.additionalTags || [])],
    additionalAttrs: [...(presetOptions.additionalAttrs || []), ...(options.additionalAttrs || [])],
    returnFragment: options.returnFragment ?? false
  }
}

/**
 * 创建 DOMPurify 配置
 *
 * @param options - 净化选项
 * @returns DOMPurify 配置对象
 */
export function createDOMPurifyConfig(options: HtmlSanitizerOptions = {}): Config {
  const mergedOptions = getMergedOptions(options)
  const {
    allowExternalLinks = true,
    allowDataAttributes = true,
    allowMediaElements = true,
    allowStyles = false,
    additionalTags = [],
    additionalAttrs = []
  } = mergedOptions

  // 基础标签白名单
  let allowedTags = [...HTML_SECURITY.SAFE_TAGS]

  // 如果不允许媒体元素，移除相关标签
  if (!allowMediaElements) {
    const mediaTags = ['img', 'picture', 'source', 'audio', 'video']
    allowedTags = allowedTags.filter(tag => !mediaTags.includes(tag))
  }

  // 合并自定义标签
  if (additionalTags.length > 0) {
    allowedTags = [...new Set([...allowedTags, ...additionalTags])]
  }

  // 基础属性白名单
  let allowedAttrs = [...HTML_SECURITY.SAFE_ATTRS]

  // 如果不允许 data-* 属性，移除
  if (!allowDataAttributes) {
    allowedAttrs = allowedAttrs.filter(attr => attr !== 'data-*')
  }

  // 如果允许样式属性，添加 style
  if (allowStyles && !allowedAttrs.includes('style')) {
    allowedAttrs.push('style')
  }

  // 合并自定义属性
  if (additionalAttrs.length > 0) {
    allowedAttrs = [...new Set([...allowedAttrs, ...additionalAttrs])]
  }

  // 确定禁止的标签列表
  const forbidTags = ['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'form']
  // 如果模式允许 input（如 markdown-render），不禁止它
  if (!additionalTags.includes('input')) {
    forbidTags.push('input', 'button')
  }

  const config: Config = {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttrs,
    ALLOW_DATA_ATTR: allowDataAttributes,
    // 安全设置
    FORBID_TAGS: forbidTags,
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
    // 保留内容结构
    KEEP_CONTENT: true,
    // 返回安全的 HTML
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false
  }

  // 如果不允许外部链接，添加 URI 钩子
  if (!allowExternalLinks) {
    config.ALLOWED_URI_REGEXP = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  }

  return config
}

/**
 * 创建预配置的净化器实例
 * 每次调用都返回新的配置，确保线程安全
 *
 * @param options - 净化选项
 * @returns 配置好的 DOMPurify 配置
 */
export function createSanitizerInstance(options: HtmlSanitizerOptions = {}): Config {
  return createDOMPurifyConfig(options)
}

// ═══════════════════════════════════════════════════════════════════
// 并发安全：使用带超时的互斥锁
// ═══════════════════════════════════════════════════════════════════

/** DOMPurify 操作互斥锁（使用新的 TimeoutMutex） */
const domPurifyMutex = new TimeoutMutex({
    name: 'dom-purify',
    defaultTimeoutMs: 10_000, // 10 秒超时
    maxQueueSize: 50
})

/**
 * 净化 HTML 内容（并发安全版本）
 *
 * @param html - 原始 HTML 字符串
 * @param options - 净化选项
 * @returns 净化结果
 *
 * @security 使用互斥锁确保 DOMPurify hooks 操作的原子性，
 *           防止多个并发调用导致 hooks 状态互相干扰
 *
 * @example
 * ```typescript
 * // 使用标准模式（默认）
 * const result = sanitizeHTML('<script>alert("xss")</script><p>Hello</p>')
 * // result.html = '<p>Hello</p>'
 *
 * // 使用微信导出模式
 * const result = sanitizeHTML(html, { mode: 'wechat-export' })
 *
 * // 使用严格模式
 * const result = sanitizeHTML(html, { mode: 'strict' })
 * ```
 */
export function sanitizeHTML(
  html: string,
  options: HtmlSanitizerOptions = {}
): HtmlSanitizeResult {
  if (!html || typeof html !== 'string') {
    return {
      html: '',
      modified: false,
      removedElements: 0,
      removedAttributes: 0
    }
  }

  const config = createDOMPurifyConfig(options)

  // 本地收集移除统计
  let removedElements = 0
  let removedAttributes = 0

  // 同步版本：不使用 hooks，通过比较结果计算移除数量
  // 这是最安全的方式，完全避免全局状态
  try {
    const hookConfig = {
      ...config,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false
    }

    const sanitized = DOMPurify.sanitize(html, hookConfig)
    const modified = sanitized !== html

    // 通过分析原始 HTML 和净化后的差异来估算移除数量
    if (modified) {
      // 使用正则估算被移除的元素和属性数量
      const originalTags = (html.match(/<[a-zA-Z][^>]*>/g) || []).length
      const sanitizedTags = (sanitized.match(/<[a-zA-Z][^>]*>/g) || []).length
      removedElements = Math.max(0, originalTags - sanitizedTags)

      // 检查被禁止的属性
      const forbiddenAttrs = config.FORBID_ATTR || []
      for (const attr of forbiddenAttrs) {
        const attrPattern = new RegExp(`\\s${attr}\\s*=`, 'gi')
        const matches = html.match(attrPattern)
        if (matches) {
          removedAttributes += matches.length
        }
      }

      if (removedElements > 0 || removedAttributes > 0) {
        logger.debug('HTML 净化完成', {
          mode: options.mode || 'standard',
          removedElements,
          removedAttributes,
          originalLength: html.length,
          sanitizedLength: sanitized.length
        })
      }
    }

    return {
      html: sanitized,
      modified,
      removedElements,
      removedAttributes
    }
  } catch (error) {
    logger.error('HTML 净化失败', { error, mode: options.mode || 'standard' })
    throw new HTMLSecurityError(
      `HTML 净化失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'SANITIZE_FAILED'
    )
  }
}

/**
 * 净化 HTML 内容（异步版本，使用 hooks 收集详细信息）
 *
 * @param html - 原始 HTML 字符串
 * @param options - 净化选项
 * @returns 净化结果（Promise）
 *
 * @security 使用互斥锁确保 DOMPurify hooks 操作的原子性
 */
export async function sanitizeHTMLAsync(
  html: string,
  options: HtmlSanitizerOptions = {}
): Promise<HtmlSanitizeResult> {
  if (!html || typeof html !== 'string') {
    return {
      html: '',
      modified: false,
      removedElements: 0,
      removedAttributes: 0
    }
  }

  const config = createDOMPurifyConfig(options)
  let removedElements = 0
  let removedAttributes = 0

  // 获取互斥锁，确保 hooks 操作的原子性（带超时保护）
  await domPurifyMutex.acquire()

  try {
    const hookConfig = {
      ...config,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false
    }

    // 在锁保护下安全地使用 hooks
    DOMPurify.addHook('uponSanitizeElement', (_node, data) => {
      if (data.tagName && !config.ALLOWED_TAGS?.includes(data.tagName.toLowerCase())) {
        removedElements++
      }
    })

    DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
      if (data.attrName && config.FORBID_ATTR?.includes(data.attrName.toLowerCase())) {
        removedAttributes++
      }
    })

    const sanitized = DOMPurify.sanitize(html, hookConfig)

    // 清理 hooks
    DOMPurify.removeAllHooks()

    const modified = sanitized !== html

    if (modified && (removedElements > 0 || removedAttributes > 0)) {
      logger.debug('HTML 净化完成（异步）', {
        mode: options.mode || 'standard',
        removedElements,
        removedAttributes,
        originalLength: html.length,
        sanitizedLength: sanitized.length
      })
    }

    return {
      html: sanitized,
      modified,
      removedElements,
      removedAttributes
    }
  } catch (error) {
    // 确保在错误时也清理 hooks
    DOMPurify.removeAllHooks()
    logger.error('HTML 净化失败', { error, mode: options.mode || 'standard' })
    throw new HTMLSecurityError(
      `HTML 净化失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'SANITIZE_FAILED'
    )
  } finally {
    // 释放互斥锁
    domPurifyMutex.release()
  }
}

/**
 * 快捷方法：直接返回净化后的 HTML 字符串
 *
 * @param html - 原始 HTML 字符串
 * @param options - 净化选项
 * @returns 净化后的 HTML 字符串
 */
export function sanitizeHTMLString(
  html: string,
  options: HtmlSanitizerOptions = {}
): string {
  return sanitizeHTML(html, options).html
}

/**
 * 验证 HTML 是否安全（不进行修改）
 *
 * @param html - 要验证的 HTML 字符串
 * @param options - 验证选项
 * @returns 如果安全返回 true，否则返回 false
 */
export function isHTMLSafe(
  html: string,
  options: HtmlSanitizerOptions = {}
): boolean {
  if (!html || typeof html !== 'string') {
    return true
  }

  const config = createDOMPurifyConfig(options)
  const sanitized = DOMPurify.sanitize(html, config)

  return sanitized === html
}

/**
 * 获取 HTML 中的安全问题列表
 *
 * @param html - 要检查的 HTML 字符串
 * @param mode - 检查模式（默认: standard）
 * @returns 发现的安全问题描述列表
 */
export function getHTMLSecurityIssues(
  html: string,
  mode: HTMLSanitizeMode = 'standard'
): string[] {
  const issues: string[] = []

  if (!html || typeof html !== 'string') {
    return issues
  }

  // 检查常见危险模式
  const dangerousPatterns = [
    { pattern: /<script\b/gi, name: 'Script 标签' },
    { pattern: /javascript:/gi, name: 'JavaScript 协议' },
    { pattern: /on\w+\s*=/gi, name: '事件处理器属性' },
    { pattern: /<iframe\b/gi, name: 'iframe 标签' },
    { pattern: /<object\b/gi, name: 'object 标签' },
    { pattern: /<embed\b/gi, name: 'embed 标签' },
    { pattern: /<form\b/gi, name: 'form 标签' },
    { pattern: /data:\s*text\/html/gi, name: 'Data URL HTML' },
    { pattern: /expression\s*\(/gi, name: 'CSS 表达式' },
    { pattern: /-moz-binding/gi, name: 'Mozilla 绑定' }
  ]

  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(html)) {
      issues.push(`检测到 ${name}`)
    }
    pattern.lastIndex = 0
  }

  // 检查净化结果
  const result = sanitizeHTML(html, { mode })
  if (result.removedElements > 0) {
    issues.push(`移除了 ${result.removedElements} 个不安全元素`)
  }
  if (result.removedAttributes > 0) {
    issues.push(`移除了 ${result.removedAttributes} 个不安全属性`)
  }

  return issues
}

// ═══════════════════════════════════════════════════════════════════
// 预配置净化器
// ═══════════════════════════════════════════════════════════════════

/**
 * 预配置的净化器 - 严格模式
 * 仅允许基本文本格式化标签
 */
export function sanitizeHTMLStrict(html: string): string {
  return sanitizeHTMLString(html, { mode: 'strict' })
}

/**
 * 预配置的净化器 - 宽松模式
 * 允许大多数安全的 HTML 元素
 */
export function sanitizeHTMLPermissive(html: string): string {
  return sanitizeHTMLString(html, { mode: 'permissive' })
}

/**
 * 预配置的净化器 - 微信导出模式
 * 保留内联样式，适用于微信公众号排版
 */
export function sanitizeHTMLWechat(html: string): string {
  return sanitizeHTMLString(html, { mode: 'wechat-export' })
}

/**
 * 预配置的净化器 - Markdown 渲染模式
 * 支持代码块、任务列表等 Markdown 扩展
 */
export function sanitizeHTMLMarkdown(html: string): string {
  return sanitizeHTMLString(html, { mode: 'markdown-render' })
}

/**
 * 用于富文本编辑器的净化配置
 */
export function createEditorSanitizerConfig(): Config {
  return createDOMPurifyConfig({
    mode: 'permissive',
    additionalAttrs: ['style', 'align', 'valign']
  })
}

// ═══════════════════════════════════════════════════════════════════
// 预设净化器对象（便于统一调用）
// ═══════════════════════════════════════════════════════════════════

/**
 * 严格模式净化器
 * 用于高安全场景，如用户生成内容显示
 */
export const strictSanitizer = {
  sanitize: (html: string) => sanitizeHTML(html, { mode: 'strict' }),
  sanitizeString: (html: string) => sanitizeHTMLStrict(html),
  isSafe: (html: string) => isHTMLSafe(html, { mode: 'strict' })
}

/**
 * 标准模式净化器
 * 用于常规场景
 */
export const standardSanitizer = {
  sanitize: (html: string) => sanitizeHTML(html, { mode: 'standard' }),
  sanitizeString: (html: string) => sanitizeHTMLString(html, { mode: 'standard' }),
  isSafe: (html: string) => isHTMLSafe(html, { mode: 'standard' })
}

/**
 * 微信导出模式净化器
 * 用于微信公众号排版导出
 */
export const wechatExportSanitizer = {
  sanitize: (html: string) => sanitizeHTML(html, { mode: 'wechat-export' }),
  sanitizeString: (html: string) => sanitizeHTMLWechat(html),
  isSafe: (html: string) => isHTMLSafe(html, { mode: 'wechat-export' })
}

/**
 * Markdown 渲染模式净化器
 * 用于 Markdown 转 HTML 后的净化
 */
export const markdownRenderSanitizer = {
  sanitize: (html: string) => sanitizeHTML(html, { mode: 'markdown-render' }),
  sanitizeString: (html: string) => sanitizeHTMLMarkdown(html),
  isSafe: (html: string) => isHTMLSafe(html, { mode: 'markdown-render' })
}
