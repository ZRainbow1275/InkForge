/**
 * CSS 合规性验证器
 *
 * 验证 CSS 属性是否被目标平台支持，并提供降级替代方案。
 * 作为导出管线的最终安全网层，确保输出 HTML 中不包含
 * 目标平台不支持的 CSS 声明。
 *
 * 架构定位:
 * - platform-css.ts: 定义平台支持矩阵 (数据层)
 * - css-validator.ts: 基于矩阵执行验证与降级 (逻辑层)
 * - 各平台 export engine: 调用 enforcePlatformCSS 完成合规化 (集成层)
 */

import type { Platform } from './types'
import {
  getPlatformSupport,
  type PlatformCSSSupport,
} from './platform-css'

// =====================================================================
// 类型定义
// =====================================================================

/**
 * 单条 CSS 属性验证结果
 */
export interface CSSValidationResult {
  /** 原始 CSS 属性名 */
  property: string
  /** 原始 CSS 值 */
  value: string
  /** 是否被目标平台支持 */
  supported: boolean
  /** 降级替代方案 (不支持时提供) */
  fallback?: { property: string; value: string }
  /** 验证警告信息 */
  warning?: string
}

/**
 * CSS 降级规则
 * 定义不支持属性的替代方案
 */
interface CSSFallbackRule {
  /** 匹配的属性名 (支持正则) */
  propertyPattern: RegExp
  /** 可选: 匹配的值模式 */
  valuePattern?: RegExp
  /** 判断函数: 基于平台支持能力决定是否需要降级 */
  shouldFallback: (support: PlatformCSSSupport) => boolean
  /** 生成降级值; 返回 null 表示直接移除该属性 */
  getFallback: (property: string, value: string) => { property: string; value: string } | null
  /** 警告消息模板 */
  warningTemplate: string
}

// =====================================================================
// 降级规则注册表
// =====================================================================

/**
 * CSS 降级规则表
 *
 * 优先级: 按数组顺序匹配, 命中第一条规则即停止。
 * 每条规则包含:
 * 1. 属性/值匹配模式
 * 2. 平台能力判断
 * 3. 降级策略
 * 4. 警告消息
 */
const FALLBACK_RULES: CSSFallbackRule[] = [
  // ---- display: flex 降级 ----
  {
    propertyPattern: /^display$/i,
    valuePattern: /^flex$/i,
    shouldFallback: (s) => !s.flexbox,
    getFallback: () => ({ property: 'display', value: 'block' }),
    warningTemplate: 'display:flex 不受支持, 降级为 display:block',
  },
  {
    propertyPattern: /^display$/i,
    valuePattern: /^inline-flex$/i,
    shouldFallback: (s) => !s.flexbox,
    getFallback: () => ({ property: 'display', value: 'inline-block' }),
    warningTemplate: 'display:inline-flex 不受支持, 降级为 display:inline-block',
  },

  // ---- display: grid 降级 ----
  {
    propertyPattern: /^display$/i,
    valuePattern: /^grid$/i,
    shouldFallback: (s) => !s.grid,
    getFallback: () => ({ property: 'display', value: 'block' }),
    warningTemplate: 'display:grid 不受支持, 降级为 display:block',
  },

  // ---- Flexbox 子属性 ----
  {
    propertyPattern: /^(flex-direction|flex-wrap|flex-flow|justify-content|align-items|align-content|align-self|flex-grow|flex-shrink|flex-basis|flex|order|gap|row-gap|column-gap)$/i,
    shouldFallback: (s) => !s.flexbox,
    getFallback: () => null, // 直接移除
    warningTemplate: 'Flexbox 子属性不受支持, 已移除',
  },

  // ---- Grid 子属性 ----
  {
    propertyPattern: /^(grid-template-columns|grid-template-rows|grid-template-areas|grid-template|grid-column|grid-row|grid-area|grid-auto-columns|grid-auto-rows|grid-auto-flow|grid-gap|grid-column-gap|grid-row-gap)$/i,
    shouldFallback: (s) => !s.grid,
    getFallback: () => null, // 直接移除
    warningTemplate: 'Grid 子属性不受支持, 已移除',
  },

  // ---- position 降级 ----
  {
    propertyPattern: /^position$/i,
    valuePattern: /^fixed$/i,
    shouldFallback: (s) => !s.position.includes('fixed'),
    getFallback: () => ({ property: 'position', value: 'relative' }),
    warningTemplate: 'position:fixed 不受支持, 降级为 position:relative',
  },
  {
    propertyPattern: /^position$/i,
    valuePattern: /^sticky$/i,
    shouldFallback: (s) => !s.position.includes('sticky'),
    getFallback: () => ({ property: 'position', value: 'relative' }),
    warningTemplate: 'position:sticky 不受支持, 降级为 position:relative',
  },
  {
    propertyPattern: /^position$/i,
    valuePattern: /^absolute$/i,
    shouldFallback: (s) => !s.position.includes('absolute'),
    getFallback: () => ({ property: 'position', value: 'relative' }),
    warningTemplate: 'position:absolute 不受支持, 降级为 position:relative',
  },

  // ---- box-shadow 降级 ----
  {
    propertyPattern: /^box-shadow$/i,
    shouldFallback: (s) => !s.boxShadow,
    getFallback: () => ({ property: 'border', value: '1px solid #e0e0e0' }),
    warningTemplate: 'box-shadow 不受支持, 降级为 border',
  },

  // ---- transform 移除 ----
  {
    propertyPattern: /^transform$/i,
    shouldFallback: (s) => !s.transform,
    getFallback: () => null,
    warningTemplate: 'transform 不受支持, 已移除',
  },

  // ---- transition 移除 ----
  {
    propertyPattern: /^transition$/i,
    shouldFallback: (s) => !s.transition,
    getFallback: () => null,
    warningTemplate: 'transition 不受支持, 已移除',
  },
  {
    propertyPattern: /^transition-(property|duration|timing-function|delay)$/i,
    shouldFallback: (s) => !s.transition,
    getFallback: () => null,
    warningTemplate: 'transition 子属性不受支持, 已移除',
  },

  // ---- animation 移除 (所有平台导出场景均不支持) ----
  {
    propertyPattern: /^animation(-name|-duration|-timing-function|-delay|-iteration-count|-direction|-fill-mode|-play-state)?$/i,
    shouldFallback: () => true,
    getFallback: () => null,
    warningTemplate: 'animation 属性在导出场景不受支持, 已移除',
  },

  // ---- filter / backdrop-filter ----
  {
    propertyPattern: /^(filter|backdrop-filter)$/i,
    shouldFallback: (s) => !s.filter,
    getFallback: () => null,
    warningTemplate: 'filter/backdrop-filter 不受支持, 已移除',
  },

  // ---- clip-path / mask ----
  {
    propertyPattern: /^(clip-path|mask|-webkit-mask|mask-image|-webkit-mask-image)$/i,
    shouldFallback: () => true, // 导出场景全部移除
    getFallback: () => null,
    warningTemplate: 'clip-path/mask 在导出场景不受支持, 已移除',
  },

  // ---- border-image 渐变降级 ----
  {
    propertyPattern: /^border-image(-source)?$/i,
    valuePattern: /(?:linear|radial|conic)-gradient\(/i,
    shouldFallback: (s) => !s.gradient,
    getFallback: () => null, // 渐变边框移除（无合理降级值）
    warningTemplate: 'border-image 渐变不受支持, 已移除',
  },

  // ---- list-style-image 渐变降级 ----
  {
    propertyPattern: /^list-style-image$/i,
    valuePattern: /(?:linear|radial|conic)-gradient\(/i,
    shouldFallback: (s) => !s.gradient,
    getFallback: () => null,
    warningTemplate: 'list-style-image 渐变不受支持, 已移除',
  },
]

// =====================================================================
// 核心验证函数
// =====================================================================

/**
 * 验证 CSS 声明是否被目标平台支持
 *
 * 解析 CSS 字符串中的每条声明, 逐一检查并生成验证结果。
 *
 * @param css - CSS 声明字符串 (如 "display:flex;color:red;position:fixed")
 *              不含选择器, 仅属性-值对
 * @param platform - 目标平台
 * @returns 每条声明的验证结果数组
 *
 * @example
 * ```ts
 * const results = validateCSS('display:flex;position:fixed', 'wechat')
 * // results[0] => { property:'display', value:'flex', supported:false, fallback:{...}, warning:'...' }
 * ```
 */
export function validateCSS(css: string, platform: Platform): CSSValidationResult[] {
  const support = getPlatformSupport(platform)
  const results: CSSValidationResult[] = []

  // 解析 CSS 声明
  const declarations = parseDeclarations(css)

  for (const { property, value } of declarations) {
    const result = validateDeclaration(property, value, support)
    results.push(result)
  }

  return results
}

/**
 * 验证单条 CSS 声明
 */
function validateDeclaration(
  property: string,
  value: string,
  support: PlatformCSSSupport
): CSSValidationResult {
  const normalizedProp = property.trim().toLowerCase()
  const normalizedValue = value.trim()

  // 1. CSS 变量引用检测
  if (normalizedValue.includes('var(--')) {
    return {
      property: normalizedProp,
      value: normalizedValue,
      supported: false,
      warning: 'CSS 自定义属性 (var(--xxx)) 不受支持, 需预先替换为具体值',
    }
  }

  // 2. calc() 函数检测
  if (normalizedValue.includes('calc(') && !support.calc) {
    return {
      property: normalizedProp,
      value: normalizedValue,
      supported: false,
      warning: 'calc() 函数不受支持, 需替换为静态值',
    }
  }

  // 3. clamp() 函数检测
  if (normalizedValue.includes('clamp(') && !support.clamp) {
    return {
      property: normalizedProp,
      value: normalizedValue,
      supported: false,
      warning: 'clamp() 函数不受支持, 需替换为静态值',
    }
  }

  // 4. 渐变函数检测
  if (/(?:linear|radial|conic)-gradient\(/i.test(normalizedValue) && !support.gradient) {
    return {
      property: normalizedProp,
      value: normalizedValue,
      supported: false,
      warning: '渐变函数不受支持, 已移除',
    }
  }

  // 5. display 值检测
  if (normalizedProp === 'display') {
    const displayVal = normalizedValue.toLowerCase()
    if (!support.display.includes(displayVal)) {
      // 查找降级规则
      for (const rule of FALLBACK_RULES) {
        if (rule.propertyPattern.test(normalizedProp) && rule.valuePattern?.test(displayVal)) {
          const fallback = rule.getFallback(normalizedProp, normalizedValue)
          return {
            property: normalizedProp,
            value: normalizedValue,
            supported: false,
            fallback: fallback ?? undefined,
            warning: rule.warningTemplate,
          }
        }
      }
      return {
        property: normalizedProp,
        value: normalizedValue,
        supported: false,
        warning: `display:${displayVal} 不受支持`,
      }
    }
  }

  // 6. position 值检测
  if (normalizedProp === 'position') {
    const posVal = normalizedValue.toLowerCase()
    if (!support.position.includes(posVal)) {
      return {
        property: normalizedProp,
        value: normalizedValue,
        supported: false,
        fallback: { property: 'position', value: 'relative' },
        warning: `position:${posVal} 不受支持, 降级为 position:relative`,
      }
    }
  }

  // 7. 通用规则匹配
  for (const rule of FALLBACK_RULES) {
    if (!rule.propertyPattern.test(normalizedProp)) continue
    if (rule.valuePattern && !rule.valuePattern.test(normalizedValue)) continue
    if (!rule.shouldFallback(support)) continue

    const fallback = rule.getFallback(normalizedProp, normalizedValue)
    return {
      property: normalizedProp,
      value: normalizedValue,
      supported: false,
      fallback: fallback ?? undefined,
      warning: rule.warningTemplate,
    }
  }

  // 默认: 通过
  return {
    property: normalizedProp,
    value: normalizedValue,
    supported: true,
  }
}

/**
 * 解析 CSS 声明字符串为属性-值对
 *
 * 处理 "property: value" 格式, 以分号分隔。
 * 安全处理值中包含分号的情况 (如 data-uri)。
 */
function parseDeclarations(css: string): Array<{ property: string; value: string }> {
  const declarations: Array<{ property: string; value: string }> = []
  if (!css || !css.trim()) return declarations

  // 按分号拆分, 但忽略括号内的分号
  const parts = splitDeclarations(css)

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex <= 0) continue

    const property = trimmed.substring(0, colonIndex).trim()
    const value = trimmed.substring(colonIndex + 1).trim()

    if (property && value) {
      declarations.push({ property, value })
    }
  }

  return declarations
}

/**
 * 按分号拆分 CSS 声明, 跳过括号内的分号
 */
function splitDeclarations(css: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''

  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '(' || ch === '[') {
      depth++
      current += ch
    } else if (ch === ')' || ch === ']') {
      depth--
      current += ch
    } else if (ch === ';' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }

  if (current.trim()) {
    parts.push(current)
  }

  return parts
}

// =====================================================================
// HTML 合规化引擎
// =====================================================================

/**
 * 对导出 HTML 执行平台 CSS 合规化
 *
 * 扫描所有 inline style 属性, 验证每条 CSS 声明,
 * 对不支持的属性执行降级替换或移除。
 *
 * 此函数作为导出管线的最终安全网层,
 * 在各平台特定的 postProcess 之后调用。
 *
 * @param html - 待合规化的 HTML 字符串
 * @param platform - 目标平台
 * @returns 合规化后的 HTML 字符串
 *
 * @example
 * ```ts
 * // 在微信导出管线末尾:
 * const compliantHtml = enforcePlatformCSS(postProcessedHtml, 'wechat')
 * ```
 */
export function enforcePlatformCSS(html: string, platform: Platform): string {
  const support = getPlatformSupport(platform)

  // 匹配 style="..." 属性, 替换其内容
  return html.replace(
    /style="([^"]*)"/gi,
    (_match, styleContent: string) => {
      const enforced = enforceDeclarations(styleContent, support)
      // 如果清理后为空, 移除整个 style 属性
      if (!enforced.trim()) return ''
      return `style="${enforced}"`
    }
  )
}

/**
 * 对一组 CSS 声明执行合规化
 *
 * @returns 合规化后的 CSS 声明字符串
 */
function enforceDeclarations(css: string, support: PlatformCSSSupport): string {
  const declarations = parseDeclarations(css)
  const enforced: string[] = []

  for (const { property, value } of declarations) {
    const normalizedProp = property.trim().toLowerCase()
    const normalizedValue = value.trim()

    // 跳过空声明
    if (!normalizedProp || !normalizedValue) continue

    // --- CSS 变量引用: 移除 (应已由前置步骤替换) ---
    if (!support.customProperties && normalizedValue.includes('var(--')) {
      continue
    }

    // --- calc() 函数: 不支持时移除 ---
    if (!support.calc && normalizedValue.includes('calc(')) {
      continue
    }

    // --- clamp() 函数: 不支持时移除 ---
    if (!support.clamp && normalizedValue.includes('clamp(')) {
      continue
    }

    // --- 渐变函数: 不支持时移除 ---
    // 覆盖所有可能包含渐变值的属性: background, background-image,
    // border-image, border-image-source, list-style-image
    if (
      !support.gradient &&
      /(?:linear|radial|conic)-gradient\(/i.test(normalizedValue) &&
      /^(background(-image)?|border-image(-source)?|list-style-image)$/i.test(normalizedProp)
    ) {
      continue
    }

    // --- 通过降级规则匹配 ---
    let handled = false
    for (const rule of FALLBACK_RULES) {
      if (!rule.propertyPattern.test(normalizedProp)) continue
      if (rule.valuePattern && !rule.valuePattern.test(normalizedValue)) continue
      if (!rule.shouldFallback(support)) continue

      const fallback = rule.getFallback(normalizedProp, normalizedValue)
      if (fallback) {
        enforced.push(`${fallback.property}:${fallback.value}`)
      }
      // fallback 为 null 表示直接移除
      handled = true
      break
    }

    if (!handled) {
      // display 值级别检查
      if (normalizedProp === 'display' && !isDisplaySupported(normalizedValue, support)) {
        enforced.push('display:block')
      }
      // position 值级别检查
      else if (normalizedProp === 'position' && !isPositionSupported(normalizedValue, support)) {
        enforced.push('position:relative')
      }
      // 默认保留
      else {
        enforced.push(`${normalizedProp}:${normalizedValue}`)
      }
    }
  }

  return enforced.join(';')
}

/**
 * 基于支持配置检查 display 值 (内部辅助)
 */
function isDisplaySupported(value: string, support: PlatformCSSSupport): boolean {
  return support.display.includes(value.trim().toLowerCase())
}

/**
 * 基于支持配置检查 position 值 (内部辅助)
 */
function isPositionSupported(value: string, support: PlatformCSSSupport): boolean {
  return support.position.includes(value.trim().toLowerCase())
}

// =====================================================================
// 合规性报告 (调试/测试用)
// =====================================================================

/**
 * 生成 HTML 的平台合规性报告
 *
 * 用于开发调试和测试, 不影响实际导出流程。
 * 扫描 HTML 中所有 inline style, 返回违规项列表。
 *
 * @param html - 待检查的 HTML 字符串
 * @param platform - 目标平台
 * @returns 违规项列表 (空数组表示完全合规)
 */
export function auditPlatformCompliance(
  html: string,
  platform: Platform
): CSSValidationResult[] {
  const violations: CSSValidationResult[] = []

  // 提取所有 style 属性内容
  const stylePattern = /style="([^"]*)"/gi
  let match: RegExpExecArray | null

  while ((match = stylePattern.exec(html)) !== null) {
    const styleContent = match[1]
    const results = validateCSS(styleContent, platform)

    for (const result of results) {
      if (!result.supported) {
        violations.push(result)
      }
    }
  }

  return violations
}
