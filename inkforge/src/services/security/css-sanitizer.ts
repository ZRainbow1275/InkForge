/**
 * CSS Sanitizer - 安全的 CSS 内容净化服务
 *
 * 防止通过 CSS 注入进行 XSS 攻击
 * 过滤危险的 CSS 模式，包括：
 * - JavaScript 表达式 (IE expression)
 * - javascript: 和 vbscript: URL
 * - Mozilla binding
 * - IE behavior
 * - 危险的 data: URL
 * - @import 规则
 * - </style> 标签注入
 */

import { logger } from '@/services/error'

/**
 * 危险 CSS 模式定义接口
 * 使用字符串源码和标志，每次调用时创建新的 RegExp 实例
 * 避免全局正则表达式的 lastIndex 状态污染问题
 */
interface DangerousPatternDef {
  source: string
  flags: string
  name: string
  description: string
}

/**
 * 危险 CSS 模式定义集合
 * 每个模式使用源码字符串，运行时动态创建 RegExp 实例
 * 确保线程安全和并发安全
 */
const DANGEROUS_PATTERN_DEFS: ReadonlyArray<DangerousPatternDef> = [
  {
    source: 'expression\\s*\\(',
    flags: 'gi',
    name: 'IE Expression',
    description: 'IE 动态表达式，可执行 JavaScript'
  },
  {
    source: 'javascript\\s*:',
    flags: 'gi',
    name: 'JavaScript URL',
    description: 'JavaScript 协议 URL'
  },
  {
    source: 'vbscript\\s*:',
    flags: 'gi',
    name: 'VBScript URL',
    description: 'VBScript 协议 URL'
  },
  {
    source: '-moz-binding\\s*:',
    flags: 'gi',
    name: 'Mozilla Binding',
    description: 'Firefox XBL 绑定，可执行代码'
  },
  {
    source: 'behavior\\s*:',
    flags: 'gi',
    name: 'IE Behavior',
    description: 'IE HTC 行为，可执行代码'
  },
  {
    source: 'binding\\s*:',
    flags: 'gi',
    name: 'Binding',
    description: 'XBL 绑定属性'
  },
  {
    source: 'url\\s*\\(\\s*["\']?\\s*data\\s*:',
    flags: 'gi',
    name: 'Data URL',
    description: 'data: URL 可能包含恶意内容'
  },
  {
    source: 'url\\s*\\(\\s*["\']?\\s*javascript\\s*:',
    flags: 'gi',
    name: 'JavaScript URL in url()',
    description: 'url() 中的 JavaScript 协议'
  },
  {
    source: '@import',
    flags: 'gi',
    name: '@import',
    description: '@import 可加载外部恶意 CSS'
  },
  {
    source: '<\\s*\\/?\\s*style',
    flags: 'gi',
    name: 'Style Tag Injection',
    description: '</style> 标签注入尝试'
  },
  {
    source: '<\\s*script',
    flags: 'gi',
    name: 'Script Tag Injection',
    description: '<script> 标签注入尝试'
  },
  {
    source: '\\\\00',
    flags: 'gi',
    name: 'Null Byte',
    description: '空字节注入尝试'
  },
  {
    source: '\\\\u00',
    flags: 'gi',
    name: 'Unicode Escape',
    description: 'Unicode 转义注入尝试'
  },
  {
    source: '\\\\[0-7]{1,3}',
    flags: 'g',
    name: 'Octal Escape',
    description: '八进制转义序列'
  },
  {
    source: '%[0-9a-fA-F]{2}',
    flags: 'g',
    name: 'URL Encoding',
    description: 'URL 编码可能用于绕过检测'
  },
  {
    source: '&#x?[0-9a-fA-F]+;',
    flags: 'gi',
    name: 'HTML Entity',
    description: 'HTML 实体编码注入'
  },
  {
    source: '\\\\u[0-9a-fA-F]{4}',
    flags: 'g',
    name: 'Unicode Escape (\\u)',
    description: 'JavaScript Unicode 转义'
  },
  {
    source: '\\\\x[0-9a-fA-F]{2}',
    flags: 'g',
    name: 'Hex Escape (\\x)',
    description: 'JavaScript 十六进制转义'
  }
] as const

/**
 * 创建危险模式的正则表达式实例
 * 每次调用返回新实例，避免全局状态污染
 */
function createPatternRegex(def: DangerousPatternDef): RegExp {
  return new RegExp(def.source, def.flags)
}

/**
 * CSS 净化结果接口
 */
export interface SanitizeResult {
  /** 净化后的 CSS */
  css: string
  /** 是否进行了修改 */
  modified: boolean
  /** 被移除的危险模式列表 */
  removedPatterns: string[]
}

/**
 * CSS 净化器配置选项
 */
export interface SanitizerOptions {
  /** 是否记录被移除的模式 (默认: true) */
  logRemovals?: boolean
  /** 是否抛出异常而非静默移除 (默认: false) */
  throwOnDanger?: boolean
  /** 自定义额外的危险模式 */
  additionalPatterns?: RegExp[]
}

/**
 * 净化 CSS 内容，移除所有危险模式
 *
 * @param css - 原始 CSS 字符串
 * @param options - 净化选项
 * @returns 净化结果，包含净化后的 CSS 和元信息
 *
 * @example
 * ```typescript
 * const result = sanitizeCSS(`
 *   .foo { color: expression(alert('xss')); }
 *   .bar { background: url(javascript:alert(1)); }
 * `)
 * // result.css 将移除危险内容
 * // result.removedPatterns 包含 ['IE Expression', 'JavaScript URL in url()']
 * ```
 */
export function sanitizeCSS(
  css: string,
  options: SanitizerOptions = {}
): SanitizeResult {
  const {
    logRemovals = true,
    throwOnDanger = false,
    additionalPatterns = []
  } = options

  if (!css || typeof css !== 'string') {
    return {
      css: '',
      modified: false,
      removedPatterns: []
    }
  }

  let sanitized = css
  const removedPatterns: string[] = []

  // 检查并移除所有危险模式
  // 优化：使用单次 replace 操作，通过返回值判断是否发生替换
  // 避免 test + replace 双重遍历的性能开销
  for (const patternDef of DANGEROUS_PATTERN_DEFS) {
    const pattern = createPatternRegex(patternDef)
    let matched = false

    // 单次 replace 操作：同时检测和替换
    const replaced = sanitized.replace(pattern, () => {
      matched = true
      return '/* [REMOVED] */'
    })

    if (matched) {
      if (throwOnDanger) {
        throw new CSSSecurityError(
          `检测到危险 CSS 模式: ${patternDef.name} - ${patternDef.description}`
        )
      }

      removedPatterns.push(patternDef.name)

      if (logRemovals) {
        logger.warn(`CSS 安全: 移除危险模式 [${patternDef.name}]`, { description: patternDef.description })
      }

      sanitized = replaced
    }
  }

  // 处理自定义额外模式（统一使用单次 replace 操作，与内置模式一致）
  for (const customPattern of additionalPatterns) {
    // 创建副本避免修改用户传入的正则
    const patternCopy = new RegExp(customPattern.source, customPattern.flags)
    let matched = false

    // 单次 replace 操作：同时检测和替换（避免 test+replace 双重遍历）
    const replaced = sanitized.replace(patternCopy, () => {
      matched = true
      return '/* [REMOVED] */'
    })

    if (matched) {
      removedPatterns.push('Custom Pattern')
      sanitized = replaced
    }
  }

  // 额外的深度清理：移除可能的编码绕过
  sanitized = removeEncodedThreats(sanitized)

  return {
    css: sanitized,
    modified: removedPatterns.length > 0,
    removedPatterns
  }
}

/**
 * 移除编码形式的威胁
 * 处理各种编码绕过尝试
 */
function removeEncodedThreats(css: string): string {
  let result = css

  // 定义所有需要处理的编码模式
  const encodingPatterns = {
    // CSS 十六进制转义序列 (例如: \6a\61\76\61 = java)
    hexEscape: /\\[0-9a-fA-F]{1,6}\s?/g,
    // 八进制转义序列 (例如: \152\141\166\141 = java)
    octalEscape: /\\[0-7]{1,3}/g,
    // URL 编码 (例如: %6A%61%76%61 = java)
    urlEncoding: /%[0-9a-fA-F]{2}/g,
    // HTML 实体编码 (例如: &#106;&#97; = ja)
    htmlEntity: /&#x?[0-9a-fA-F]+;/gi,
    // JavaScript Unicode 转义 (例如: \u006A = j)
    unicodeEscape: /\\u[0-9a-fA-F]{4}/g,
    // JavaScript 十六进制转义 (例如: \x6A = j)
    jsHexEscape: /\\x[0-9a-fA-F]{2}/g
  }

  // 解码函数：将各种编码转换为原始字符
  const decodeAll = (input: string): string => {
    let decoded = input

    // 解码 CSS 十六进制转义
    decoded = decoded.replace(encodingPatterns.hexEscape, (match) => {
      try {
        const hex = match.trim().replace('\\', '')
        return String.fromCharCode(parseInt(hex, 16))
      } catch {
        return match
      }
    })

    // 解码八进制转义
    decoded = decoded.replace(encodingPatterns.octalEscape, (match) => {
      try {
        const octal = match.replace('\\', '')
        return String.fromCharCode(parseInt(octal, 8))
      } catch {
        return match
      }
    })

    // 解码 URL 编码
    decoded = decoded.replace(encodingPatterns.urlEncoding, (match) => {
      try {
        return decodeURIComponent(match)
      } catch {
        return match
      }
    })

    // 解码 HTML 实体
    decoded = decoded.replace(encodingPatterns.htmlEntity, (match) => {
      try {
        const isHex = match.toLowerCase().includes('x')
        const numStr = match.replace(/&#x?|;/gi, '')
        const charCode = parseInt(numStr, isHex ? 16 : 10)
        return String.fromCharCode(charCode)
      } catch {
        return match
      }
    })

    // 解码 JavaScript Unicode 转义
    decoded = decoded.replace(encodingPatterns.unicodeEscape, (match) => {
      try {
        const hex = match.replace('\\u', '')
        return String.fromCharCode(parseInt(hex, 16))
      } catch {
        return match
      }
    })

    // 解码 JavaScript 十六进制转义
    decoded = decoded.replace(encodingPatterns.jsHexEscape, (match) => {
      try {
        const hex = match.replace('\\x', '')
        return String.fromCharCode(parseInt(hex, 16))
      } catch {
        return match
      }
    })

    return decoded
  }

  // 解码并检查是否包含危险内容
  const decoded = decodeAll(result)

  // 如果解码后发现危险模式，移除所有编码内容
  // 每次创建新的 RegExp 实例，避免全局状态污染
  let hasDanger = false
  for (const patternDef of DANGEROUS_PATTERN_DEFS) {
    const pattern = createPatternRegex(patternDef)
    if (pattern.test(decoded)) {
      hasDanger = true
      break
    }
  }

  // 如果发现编码绕过尝试，移除所有可疑编码
  if (hasDanger) {
    for (const patternKey of Object.keys(encodingPatterns) as Array<keyof typeof encodingPatterns>) {
      // 创建新实例进行替换
      const patternSource = encodingPatterns[patternKey].source
      const patternFlags = encodingPatterns[patternKey].flags
      const freshPattern = new RegExp(patternSource, patternFlags)
      result = result.replace(freshPattern, '')
    }
  }

  return result
}

/**
 * CSS 安全错误类
 */
export class CSSSecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CSSSecurityError'
    // 修复 Error 继承问题，确保 instanceof 正确工作
    Object.setPrototypeOf(this, CSSSecurityError.prototype)
  }
}

/**
 * 快捷方法：直接返回净化后的 CSS 字符串
 *
 * @param css - 原始 CSS 字符串
 * @returns 净化后的 CSS 字符串
 */
export function sanitizeCSSString(css: string): string {
  return sanitizeCSS(css).css
}

/**
 * 验证 CSS 是否安全（不进行修改）
 *
 * @param css - 要验证的 CSS 字符串
 * @returns 如果安全返回 true，否则返回 false
 */
export function isCSSSafe(css: string): boolean {
  if (!css || typeof css !== 'string') {
    return true
  }

  // 每次创建新的 RegExp 实例，避免全局状态污染
  for (const patternDef of DANGEROUS_PATTERN_DEFS) {
    const pattern = createPatternRegex(patternDef)
    if (pattern.test(css)) {
      return false
    }
  }

  return true
}

/**
 * 获取 CSS 中的安全问题列表
 *
 * @param css - 要检查的 CSS 字符串
 * @returns 发现的安全问题描述列表
 */
export function getSecurityIssues(css: string): string[] {
  const issues: string[] = []

  if (!css || typeof css !== 'string') {
    return issues
  }

  // 每次创建新的 RegExp 实例，避免全局状态污染
  for (const patternDef of DANGEROUS_PATTERN_DEFS) {
    const pattern = createPatternRegex(patternDef)
    if (pattern.test(css)) {
      issues.push(`${patternDef.name}: ${patternDef.description}`)
    }
  }

  return issues
}
