/**
 * 三平台 CSS 属性支持矩阵
 *
 * 定义微信公众号、小红书、知乎三个平台的 CSS 支持能力。
 * 用于导出管线的合规性验证与降级处理。
 *
 * 数据来源:
 * - 微信公众号编辑器实测 (最严格: 不支持 flex/grid/变量/渐变)
 * - 小红书笔记编辑器实测 (中等: 支持 flex, 不支持 grid)
 * - 知乎回答/文章编辑器实测 (最宽松: 支持绝大部分现代 CSS)
 * - doocs/md 开源项目参考
 */

import type { Platform } from './types'

// =====================================================================
// 类型定义
// =====================================================================

/**
 * 平台 CSS 支持能力定义
 *
 * 描述目标平台对各类 CSS 属性/函数的支持程度。
 * 导出管线据此决定是否需要降级或移除某些 CSS 声明。
 */
export interface PlatformCSSSupport {
  /** 支持的 display 值列表 */
  display: string[]
  /** 是否支持 Flexbox 布局 (flex-direction, justify-content, align-items 等) */
  flexbox: boolean
  /** 是否支持 Grid 布局 (grid-template-columns, grid-gap 等) */
  grid: boolean
  /** 支持的 position 值列表 */
  position: string[]
  /** 是否支持 max-width 属性 */
  maxWidth: boolean
  /** 是否支持 box-shadow 属性 */
  boxShadow: boolean
  /** 是否支持 border-radius 属性 */
  borderRadius: boolean
  /** 是否支持渐变函数 (linear-gradient / radial-gradient / conic-gradient) */
  gradient: boolean
  /** 是否支持 transform 属性 */
  transform: boolean
  /** 是否支持 transition 属性 */
  transition: boolean
  /** 是否支持 opacity 属性 */
  opacity: boolean
  /** 是否支持 filter / backdrop-filter 属性 */
  filter: boolean
  /** 是否支持 CSS 自定义属性 (CSS 变量 var(--xxx)) */
  customProperties: boolean
  /** 是否支持 @media 查询 */
  mediaQuery: boolean
  /** 是否支持 calc() 函数 */
  calc: boolean
  /** 是否支持 clamp() 函数 */
  clamp: boolean
}

// =====================================================================
// 平台配置
// =====================================================================

/**
 * 微信公众号 CSS 支持 -- 最严格
 *
 * 核心限制:
 * - 不支持 Flex/Grid 布局, 仅支持 block/inline/table 系列
 * - 不支持 CSS 变量、渐变、滤镜、动画
 * - 不支持 position: absolute/fixed/sticky
 * - 所有样式必须内联; <style> 标签不可靠
 * - 代码块布局需使用 display: table-cell 替代 flex
 */
export const WECHAT_SUPPORT: PlatformCSSSupport = {
  display: ['block', 'inline', 'inline-block', 'none', 'table', 'table-row', 'table-cell'],
  flexbox: false,
  grid: false,
  position: ['static', 'relative'],
  maxWidth: true,
  boxShadow: false,
  borderRadius: true,
  gradient: false,
  transform: false,
  transition: false,
  opacity: true,
  filter: false,
  customProperties: false,
  mediaQuery: false,
  calc: false,
  clamp: false,
}

/**
 * 小红书 CSS 支持 -- 中等限制
 *
 * 核心限制:
 * - 支持 Flexbox, 不支持 Grid
 * - 支持 box-shadow, gradient, transform
 * - 不支持 transition、filter、CSS 变量、clamp
 * - 所有样式必须内联; <style> 标签不支持
 * - 外部链接 href 不支持(自动剥离)
 */
export const XIAOHONGSHU_SUPPORT: PlatformCSSSupport = {
  display: ['block', 'inline', 'inline-block', 'flex', 'none', 'table', 'table-row', 'table-cell'],
  flexbox: true,
  grid: false,
  position: ['static', 'relative', 'absolute'],
  maxWidth: true,
  boxShadow: true,
  borderRadius: true,
  gradient: true,
  transform: true,
  transition: false,
  opacity: true,
  filter: false,
  customProperties: false,
  mediaQuery: false,
  calc: true,
  clamp: false,
}

/**
 * 知乎 CSS 支持 -- 最宽松
 *
 * 核心特点:
 * - 支持 Flex/Grid/动画/滤镜等大部分现代 CSS
 * - 支持 <style> 标签(非必须内联)
 * - 支持外部链接 href
 * - 仍不支持 CSS 自定义属性 (var(--xxx))
 */
export const ZHIHU_SUPPORT: PlatformCSSSupport = {
  display: ['block', 'inline', 'inline-block', 'flex', 'grid', 'none', 'table', 'table-row', 'table-cell', 'inline-flex'],
  flexbox: true,
  grid: true,
  position: ['static', 'relative', 'absolute'],
  maxWidth: true,
  boxShadow: true,
  borderRadius: true,
  gradient: true,
  transform: true,
  transition: true,
  opacity: true,
  filter: true,
  customProperties: false,
  mediaQuery: true,
  calc: true,
  clamp: true,
}

// =====================================================================
// 注册表与查询
// =====================================================================

/**
 * 平台 CSS 支持注册表
 * 通过平台标识符索引对应的支持配置
 */
export const PLATFORM_CSS_REGISTRY: Record<Platform, PlatformCSSSupport> = {
  wechat: WECHAT_SUPPORT,
  xiaohongshu: XIAOHONGSHU_SUPPORT,
  zhihu: ZHIHU_SUPPORT,
}

/**
 * 获取指定平台的 CSS 支持配置
 *
 * @param platform - 目标平台标识符
 * @returns 对应平台的 CSS 支持能力描述
 */
export function getPlatformSupport(platform: Platform): PlatformCSSSupport {
  return PLATFORM_CSS_REGISTRY[platform]
}

/**
 * 检查指定 display 值是否被平台支持
 *
 * @param displayValue - display CSS 值 (如 'flex', 'grid', 'block')
 * @param platform - 目标平台
 * @returns 是否支持
 */
export function isDisplaySupported(displayValue: string, platform: Platform): boolean {
  const support = getPlatformSupport(platform)
  return support.display.includes(displayValue.trim().toLowerCase())
}

/**
 * 检查指定 position 值是否被平台支持
 *
 * @param positionValue - position CSS 值 (如 'absolute', 'fixed', 'relative')
 * @param platform - 目标平台
 * @returns 是否支持
 */
export function isPositionSupported(positionValue: string, platform: Platform): boolean {
  const support = getPlatformSupport(platform)
  return support.position.includes(positionValue.trim().toLowerCase())
}
