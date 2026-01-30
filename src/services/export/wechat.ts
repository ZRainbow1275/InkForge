/**
 * 微信公众号导出引擎
 * 参考 doocs/md 实现 + P0增强
 * - 代码语法高亮 (highlight.js)
 * - 外链转脚注 (citeStatus)
 * - XSS防护 (DOMPurify)
 */

import juice from 'juice'
import { marked } from 'marked'
import DOMPurify, { type DOMPurify as DOMPurifyType } from 'dompurify'
import type { ExportPreset } from '@/types'
import type { ExportOptions, ExportResult } from './types'
import { generateThemeCSS, codeThemeCSS } from './themes'
import {
  highlightCodeBlocks,
  convertLinksToFootnotes,
  buildFootnoteSection,
  calculateStats,
  buildReadingTimeHeader
} from './utils'
import { REDOS_PROTECTION, CSS_INJECTION_PATTERNS } from '@/config/security'
import { logger } from '@/services/error'

// ═══════════════════════════════════════════════════════════════════
// CSS 变量处理
// ═══════════════════════════════════════════════════════════════════

/**
 * CSS 变量映射表
 * 微信不支持 var(--xxx)，需要替换为具体值
 * @param primaryColor - 可选的主题色覆盖
 */
function createCssVariableMap(primaryColor?: string): Record<string, string> {
  return {
    '--md-primary-color': primaryColor || '#D32F2F',
    '--md-font-family': '-apple-system-font, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif',
    '--md-font-size': '15px',
    '--foreground': '#3f3f3f',
    '--blockquote-background': '#f7f7f7',
    '--code-background': '#282c34',
    '--code-color': '#abb2bf',
    '--border-color': '#e0e0e0',
    '--link-color': '#0066cc',
  }
}

/**
 * 替换 CSS 变量为具体值
 * @param html - 包含 CSS 变量的 HTML 字符串
 * @param primaryColor - 可选的主题色覆盖
 * @returns 替换后的 HTML 字符串
 */
function replaceCssVariables(html: string, primaryColor?: string): string {
  let result = html
  const cssVariableMap = createCssVariableMap(primaryColor)

  // 替换 var(--xxx) 格式
  for (const [varName, value] of Object.entries(cssVariableMap)) {
    const regex = new RegExp(`var\\(${varName}\\)`, 'gi')
    result = result.replace(regex, value)
  }

  // 替换 hsl(var(--foreground)) 格式
  result = result.replace(/hsl\(var\(--foreground\)\)/g, createCssVariableMap()['--foreground'])

  // 移除 CSS 变量定义
  result = result.replace(/--md-primary-color:[^;]+;/g, '')
  result = result.replace(/--md-font-family:[^;]+;/g, '')
  result = result.replace(/--md-font-size:[^;]+;/g, '')

  return result
}

// ═══════════════════════════════════════════════════════════════════
// 微信兼容性处理
// ═══════════════════════════════════════════════════════════════════

/**
 * 修复 Mermaid SVG 文本颜色
 * Mermaid 生成的 SVG 中 tspan 元素颜色可能丢失
 */
function fixMermaidSvg(html: string): string {
  return html.replace(
    /<tspan([^>]*)>/g,
    '<tspan$1 style="fill: #333333 !important; stroke: none !important;">'
  )
}

/**
 * 图片属性规范化（ReDoS 安全版本）
 * 将 width/height 属性转为 inline style
 *
 * 优化策略：
 * - 使用原子化的正则模式，避免 [^>]* 重复捕获
 * - 添加输入长度检查
 * - 使用更精确的属性匹配
 */
function normalizeImageAttributes(html: string): string {
  // 输入长度检查
  if (!checkInputLength(html, 'normalizeImageAttributes')) {
    return html
  }

  let result = html

  // 使用迭代方式处理图片标签，避免复杂正则
  result = processImageTags(result, (imgTag) => {
    let processed = imgTag

    // 提取 width 属性值
    const widthMatch = processed.match(/\swidth=["'](\d+)["']/i)
    if (widthMatch) {
      const widthStyle = `width:${widthMatch[1]}px;`
      processed = processed.replace(widthMatch[0], '')
      processed = addStyleToTag(processed, widthStyle)
    }

    // 提取 height 属性值
    const heightMatch = processed.match(/\sheight=["'](\d+)["']/i)
    if (heightMatch) {
      const heightStyle = `height:${heightMatch[1]}px;`
      processed = processed.replace(heightMatch[0], '')
      processed = addStyleToTag(processed, heightStyle)
    }

    // 确保有 max-width
    if (!processed.includes('max-width')) {
      processed = addStyleToTag(processed, 'max-width:100%;height:auto;')
    }

    return processed
  })

  return result
}

/**
 * 处理所有图片标签
 * 使用字符串索引替代复杂正则
 */
function processImageTags(html: string, processor: (imgTag: string) => string): string {
  const result: string[] = []
  let lastIndex = 0
  let pos = 0

  while (pos < html.length) {
    // 查找 <img 开始
    const imgStart = html.indexOf('<img', pos)
    if (imgStart === -1) {
      result.push(html.substring(lastIndex))
      break
    }

    // 查找标签结束的 >
    const imgEnd = html.indexOf('>', imgStart)
    if (imgEnd === -1) {
      result.push(html.substring(lastIndex))
      break
    }

    // 添加 img 标签之前的内容
    result.push(html.substring(lastIndex, imgStart))

    // 处理 img 标签
    const imgTag = html.substring(imgStart, imgEnd + 1)
    result.push(processor(imgTag))

    lastIndex = imgEnd + 1
    pos = imgEnd + 1
  }

  return result.join('')
}

/**
 * 向标签添加样式
 */
function addStyleToTag(tag: string, styleToAdd: string): string {
  const styleMatch = tag.match(/style=["']([^"']*)["']/i)
  if (styleMatch) {
    const existingStyle = styleMatch[1]
    const newStyle = existingStyle.endsWith(';') || existingStyle === ''
      ? existingStyle + styleToAdd
      : existingStyle + ';' + styleToAdd
    return tag.replace(styleMatch[0], `style="${newStyle}"`)
  } else {
    // 在 > 之前插入 style
    return tag.replace(/>$/, ` style="${styleToAdd}">`)
  }
}

// ═══════════════════════════════════════════════════════════════════
// 输入长度限制（ReDoS 防护）
// ═══════════════════════════════════════════════════════════════════

/**
 * 检查输入长度，超限时返回原始输入
 * 使用安全配置中心的常量
 */
function checkInputLength(html: string, operationName: string): boolean {
  if (html.length > REDOS_PROTECTION.MAX_HTML_LENGTH) {
    logger.warn(
      `[安全警告] ${operationName}: 输入长度 ${html.length} 超过限制 ${REDOS_PROTECTION.MAX_HTML_LENGTH}，跳过处理`
    )
    return false
  }
  return true
}

/**
 * 修复嵌套列表结构（ReDoS 安全版本）
 * 微信对 li > ul/ol 渲染异常，需要将子列表移到 li 外面
 *
 * 使用迭代解析替代复杂正则，避免灾难性回溯：
 * - 不使用 [\s\S]*? 等可能导致回溯的模式
 * - 使用状态机逐字符解析
 * - 添加最大迭代次数限制
 */
function fixNestedLists(html: string): string {
  // 输入长度检查
  if (!checkInputLength(html, 'fixNestedLists')) {
    return html
  }

  // 使用安全配置中心的最大迭代次数
  let result = html
  let iterations = 0

  // 使用简单的标签匹配，避免复杂正则
  while (iterations < REDOS_PROTECTION.MAX_REGEX_ITERATIONS) {
    iterations++
    const processed = processOneNestedList(result)
    if (processed === result) {
      // 没有更多嵌套需要处理
      break
    }
    result = processed
  }

  if (iterations >= REDOS_PROTECTION.MAX_REGEX_ITERATIONS) {
    logger.warn('[安全警告] fixNestedLists: 达到最大迭代次数，可能存在异常输入')
  }

  return result
}

/**
 * 处理单个嵌套列表（辅助函数）
 * 使用索引定位替代正则回溯
 */
function processOneNestedList(html: string): string {
  // 查找 <li 开始标签
  const liStartPattern = /<li\b[^>]*>/gi
  let liMatch: RegExpExecArray | null

  while ((liMatch = liStartPattern.exec(html)) !== null) {
    const liStartIndex = liMatch.index
    const liTagEnd = liStartIndex + liMatch[0].length

    // 从 li 标签结束位置开始，查找对应的 </li>
    // 使用计数器处理嵌套
    let depth = 1
    let pos = liTagEnd
    let liEndIndex = -1

    while (pos < html.length && depth > 0) {
      // 查找下一个 <li 或 </li>
      const nextOpenLi = html.indexOf('<li', pos)
      const nextCloseLi = html.indexOf('</li>', pos)

      if (nextCloseLi === -1) {
        // 没有找到闭合标签，格式错误
        break
      }

      if (nextOpenLi !== -1 && nextOpenLi < nextCloseLi) {
        // 先遇到开标签，深度+1
        depth++
        pos = nextOpenLi + 3
      } else {
        // 先遇到闭标签，深度-1
        depth--
        if (depth === 0) {
          liEndIndex = nextCloseLi
        }
        pos = nextCloseLi + 5
      }
    }

    if (liEndIndex === -1) {
      continue
    }

    // 获取 li 内容
    const liContent = html.substring(liTagEnd, liEndIndex)

    // 在 li 内容中查找直接子级的 ul 或 ol（非正则方式）
    const nestedListInfo = findDirectNestedList(liContent)

    if (nestedListInfo) {
      // 重构 HTML：将子列表移到 li 外面
      const beforeList = liContent.substring(0, nestedListInfo.startIndex)
      const listTag = nestedListInfo.fullMatch
      const afterList = liContent.substring(nestedListInfo.endIndex)

      // 如果 afterList 不为空，这是一个更复杂的情况，暂时跳过
      if (afterList.trim() !== '') {
        continue
      }

      // 构建新结构
      const newStructure =
        html.substring(0, liStartIndex) +
        liMatch[0] +
        beforeList +
        '</li>' +
        listTag +
        html.substring(liEndIndex + 5)

      return newStructure
    }
  }

  return html
}

/**
 * 在内容中查找直接子级的 ul 或 ol 标签
 * 返回匹配信息或 null
 */
function findDirectNestedList(
  content: string
): { startIndex: number; endIndex: number; fullMatch: string; tagName: string } | null {
  // 使用简单的字符串搜索，避免正则回溯
  const ulStart = content.indexOf('<ul')
  const olStart = content.indexOf('<ol')

  let tagStart = -1
  let tagName = ''

  if (ulStart !== -1 && (olStart === -1 || ulStart < olStart)) {
    tagStart = ulStart
    tagName = 'ul'
  } else if (olStart !== -1) {
    tagStart = olStart
    tagName = 'ol'
  }

  if (tagStart === -1) {
    return null
  }

  // 查找标签结束位置
  const tagEnd = content.indexOf('>', tagStart)
  if (tagEnd === -1) {
    return null
  }

  // 查找对应的闭合标签，处理嵌套
  const closeTag = `</${tagName}>`
  const openTagPattern = `<${tagName}`
  let depth = 1
  let pos = tagEnd + 1
  let closeIndex = -1

  while (pos < content.length && depth > 0) {
    const nextOpen = content.indexOf(openTagPattern, pos)
    const nextClose = content.indexOf(closeTag, pos)

    if (nextClose === -1) {
      break
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      pos = nextOpen + openTagPattern.length
    } else {
      depth--
      if (depth === 0) {
        closeIndex = nextClose
      }
      pos = nextClose + closeTag.length
    }
  }

  if (closeIndex === -1) {
    return null
  }

  return {
    startIndex: tagStart,
    endIndex: closeIndex + closeTag.length,
    fullMatch: content.substring(tagStart, closeIndex + closeTag.length),
    tagName
  }
}

/**
 * 微信兼容性后处理
 * 参考 doocs/md 的处理逻辑
 */
export function postProcessForWechat(html: string, primaryColor?: string): string {
  let result = html

  // 0. CSS 变量替换（必须在其他处理之前）
  result = replaceCssVariables(result, primaryColor)

  // 1. 图片属性规范化
  result = normalizeImageAttributes(result)

  // 2. 嵌套列表结构修复
  result = fixNestedLists(result)

  // 3. Mermaid SVG 文本修复
  result = fixMermaidSvg(result)

  // 4. margin: auto 不支持
  result = result.replace(/margin:\s*(\d+)px\s+auto/g, 'margin: $1px 0')
  result = result.replace(/margin:\s*auto/g, 'margin: 0')

  // 5. top 属性转 translateY (doocs/md 做法)
  result = result.replace(
    /([^-])top:\s*([\d.]+)(em|px|rem)/gi,
    '$1transform: translateY($2$3)'
  )

  // 6. 移除微信不支持的CSS属性
  const unsupportedProps = [
    // 背景裁剪相关（渐变文字失效）
    'background-clip:\\s*text',
    '-webkit-background-clip:\\s*text',
    '-webkit-text-fill-color:\\s*transparent',
    // position相关 (微信会失效)
    'position:\\s*(?:fixed|sticky)',
    // flex相关 (部分失效，但保留 inline-flex)
    'display:\\s*flex(?!-)',
    'flex-direction:[^;]+',
    'flex-wrap:[^;]+',
    'justify-content:[^;]+',
    'align-items:[^;]+',
    'flex:[^;]+',
    // grid相关
    'display:\\s*grid',
    'grid-template[^;]+',
    'grid-gap:[^;]+',
    'gap:[^;]+',
    // CSS变量（已在前面替换，这里清理残留）
    'var\\(--[^)]+\\)',
    // 动画相关
    'animation:[^;]+',
    'animation-[^:]+:[^;]+',
    'transition:[^;]+',
    '@keyframes[^}]+}',
    // 滤镜相关
    'backdrop-filter:[^;]+',
    'filter:[^;]+',
    // 其他不支持
    'box-shadow:[^;]*inset[^;]*',  // inset shadow 部分失效
    'text-shadow:[^;]+',  // 复杂 text-shadow 失效
    'clip-path:[^;]+',
    'mask:[^;]+',
    '-webkit-mask:[^;]+'
  ]

  for (const prop of unsupportedProps) {
    result = result.replace(new RegExp(prop + ';?', 'gi'), '')
  }

  // 7. 清理空的style属性和多余分号
  result = result.replace(/style="\s*;*\s*"/gi, '')
  result = result.replace(/style=";\s*/gi, 'style="')
  result = result.replace(/;\s*;+/g, ';')
  result = result.replace(/;"/g, '"')

  // 8. SVG兼容性 - 添加空p标签包裹 (doocs/md做法)
  // 在section前后添加零高度p标签提升复制兼容性
  result = result.replace(
    /<section([^>]*)id="nice"([^>]*)>/gi,
    '<p style="font-size:0;line-height:0;margin:0;padding:0;">&nbsp;</p><section$1id="nice"$2>'
  )
  result = result.replace(
    /<\/section>\s*$/gi,
    '</section><p style="font-size:0;line-height:0;margin:0;padding:0;">&nbsp;</p>'
  )

  // 9. 表格宽度确保
  result = result.replace(
    /<table(?![^>]*style=)/gi,
    '<table style="width:100%;max-width:100%;border-collapse:collapse;" '
  )
  // 已有 style 的表格添加宽度
  result = result.replace(
    /<table([^>]*)\sstyle="([^"]*)"([^>]*)>/gi,
    (match, before, style, after) => {
      if (!/width/.test(style)) {
        return `<table${before} style="${style};width:100%;max-width:100%;"${after}>`
      }
      return match
    }
  )

  // 10. 确保 section#nice 有基础样式
  result = result.replace(
    /<section([^>]*)id="nice"(?![^>]*style=)([^>]*)>/gi,
    '<section$1id="nice" style="font-size:15px;line-height:1.8;color:#333;padding:16px;word-break:break-word;"$2>'
  )

  return result
}

// ═══════════════════════════════════════════════════════════════════
// 主要导出函数
// ═══════════════════════════════════════════════════════════════════

/**
 * HTML转微信格式 (P1/P2增强版)
 * 1. DOMPurify XSS防护
 * 2. 代码语法高亮 (highlight.js) + 可选行号
 * 3. 外链转脚注
 * 4. 阅读时间计算
 * 5. CSS内联 (juice)
 * 6. 微信兼容性后处理
 */
export function convertToWechat(
  html: string,
  preset: ExportPreset,
  options: ExportOptions = {}
): string {
  const result = convertToWechatWithStats(html, preset, options)
  return result.html
}

/**
 * HTML转微信格式 (带统计信息)
 */
export function convertToWechatWithStats(
  html: string,
  preset: ExportPreset,
  options: ExportOptions = {}
): ExportResult {
  const {
    enableCiteStatus = true,
    enableLineNumbers = false,
    enableReadingTime = true,
    readingSpeed = 300,
    enableCodeHighlight = true
  } = options

  // 计算统计信息
  const stats = calculateStats(html, readingSpeed)

  // Step 1: DOMPurify XSS防护 (增强配置)
  // 使用独立实例避免并发时全局状态污染
  const purify = DOMPurify(window)

  // 使用安全配置中心的 CSS 注入防护模式
  const dangerousCssPatterns = CSS_INJECTION_PATTERNS.DANGEROUS_PATTERNS

  // 配置独立实例的 hooks 进行 style 属性过滤
  // 使用 try-finally 确保 hooks 在任何情况下都被正确清理，保证线程安全
  purify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName === 'style' && data.attrValue) {
      let styleValue = data.attrValue
      // 检查并移除危险 CSS 模式（每次创建新正则实例，避免状态污染）
      for (const patternStr of dangerousCssPatterns) {
        const pattern = new RegExp(patternStr, 'gi')
        styleValue = styleValue.replace(pattern, '')
      }
      // 移除追踪类 CSS 属性（可能泄露用户数据）
      for (const trackingPattern of CSS_INJECTION_PATTERNS.TRACKING_PATTERNS) {
        const pattern = new RegExp(trackingPattern, 'gi')
        styleValue = styleValue.replace(pattern, '')
      }
      // 移除包含危险内容的整个 url() 声明
      const urlPattern = new RegExp(CSS_INJECTION_PATTERNS.DANGEROUS_URL_PATTERN, 'gi')
      styleValue = styleValue.replace(urlPattern, '')
      data.attrValue = styleValue
    }
  })

  let sanitizedHtml: string
  try {
    sanitizedHtml = purify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'em', 'u', 's', 'del', 'ins',
        'a', 'img', 'br', 'hr',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div', 'section',
        'sup', 'sub'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'id', 'target'],
      // 禁止 data-* 属性，防止属性滥用
      ALLOW_DATA_ATTR: false,
      // 启用 DOM 清理，移除危险的 DOM 节点
      SANITIZE_DOM: true,
      // 禁止危险属性 - 可绑定恶意脚本或导航
      FORBID_ATTR: [
        'formaction',      // 表单提交劫持
        'action',          // 表单 action 劫持
        'xlink:href',      // SVG 链接注入
        'xmlns:xlink',     // XLink 命名空间
        'ping',            // 链接追踪
        'poster',          // 视频海报（可加载外部资源）
        'background',      // 背景图片（已废弃但仍可用）
        'dynsrc',          // IE 动态源
        'lowsrc',          // 低分辨率图片源
        'onload',          // 事件处理器（额外防护）
        'onerror',         // 事件处理器（额外防护）
      ],
      // 禁止危险标签（额外防护层）
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    })
  } finally {
    // 显式清理所有 hooks，确保：
    // 1. 即使 sanitize 抛出异常也能清理
    // 2. 避免潜在的内存泄漏
    // 3. 保证并发调用时 hooks 不会相互干扰
    purify.removeAllHooks()
  }

  // Step 2: 代码高亮处理
  const highlightedHtml = enableCodeHighlight
    ? highlightCodeBlocks(sanitizedHtml, enableLineNumbers)
    : sanitizedHtml

  // Step 3: 外链转脚注
  const { html: processedHtml, footnotes } = enableCiteStatus
    ? convertLinksToFootnotes(highlightedHtml)
    : { html: highlightedHtml, footnotes: [] }

  // Step 4: 构建最终内容
  let finalContent = ''

  // 添加阅读时间头部
  if (enableReadingTime) {
    finalContent += buildReadingTimeHeader(stats)
  }

  finalContent += processedHtml

  // 添加脚注列表
  if (footnotes.length > 0) {
    finalContent += buildFootnoteSection(footnotes)
  }

  // 包装HTML
  const wrappedHtml = `<section id="nice">${finalContent}</section>`

  // 生成CSS (包含代码主题)
  const css = generateThemeCSS(preset) + codeThemeCSS

  // 添加样式
  const styledHtml = `<style>${css}</style>${wrappedHtml}`

  // CSS内联
  const inlinedHtml = juice(styledHtml, {
    removeStyleTags: true,
    preserveImportant: true
  })

  // 微信兼容性处理（传递主题色用于 CSS 变量替换）
  const finalHtml = postProcessForWechat(inlinedHtml, preset.primaryColor)

  return {
    html: finalHtml,
    stats
  }
}

/**
 * Markdown转微信格式
 */
export async function markdownToWechat(markdown: string, preset: ExportPreset): Promise<string> {
  // Markdown → HTML
  const html = await marked.parse(markdown)

  // HTML → 微信格式
  return convertToWechat(html, preset)
}
