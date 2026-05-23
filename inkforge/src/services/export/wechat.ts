/**
 * 微信公众号导出引擎
 * 参考 doocs/md 实现 + P0增强
 * - 代码语法高亮 (highlight.js)
 * - 外链转脚注 (citeStatus)
 * - XSS防护 (DOMPurify)
 */

import juice from 'juice'
import { marked } from 'marked'
import { renderMarkdownWithLazyOptionalEnhancements } from '@/services/rendering/lazy-optional-renderer'
import DOMPurify from 'dompurify'

// 确保 marked 配置一致性（防止直接调用 markdownToWechat 时配置缺失）
marked.use({ breaks: true, gfm: true })
import type { ExportPreset } from '@/types'
import type {
  ExportFontFamily,
  ExportFontSize,
  ExportResult,
  ExportStats,
  WechatExportOptions,
} from './types'
import { parseToAST, type InkforgeMeta } from './renderers/ast'
import {
  wechatComplianceTransform,
  type WechatRuleOptions,
} from './platform-rules/wechat'
import { generateThemeCSS, codeThemeCSS, applyHeadingDecorations } from './themes'
import { FONT_STACKS } from '@/constants'
import {
  highlightCodeBlocks,
  convertLinksToFootnotes,
  buildFootnoteSection,
  calculateStats,
  buildReadingTimeHeader,
  renderAlertBlocks,
  enhanceTableStyles,
  convertTaskListCheckboxes,
  cleanEmptyParagraphs,
  limitConsecutiveBreaks
} from './utils'
import { enforcePlatformCSS } from './css-validator'
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

  // 替换 var(--xxx) 和 var(--xxx, fallback) 格式
  // 必须同时匹配带 fallback 的语法，如 var(--md-primary-color, #c7254e)
  for (const [varName, value] of Object.entries(cssVariableMap)) {
    const regex = new RegExp(`var\\(${varName}(?:,[^)]+)?\\)`, 'gi')
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
const WECHAT_MAX_IMAGE_WIDTH = 640

function escapeWechatText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeWechatText(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

function clampWechatImageWidth(width: number): number {
  return width > WECHAT_MAX_IMAGE_WIDTH ? WECHAT_MAX_IMAGE_WIDTH : width
}

function clampWechatImageWidthInStyle(style: string): { style: string; clamped: boolean } {
  let clamped = false
  const nextStyle = style.replace(/(^|;)\s*width\s*:\s*(\d+)px\s*;?/gi, (_match, prefix: string, rawWidth: string) => {
    const width = parseInt(rawWidth, 10)
    if (!Number.isFinite(width)) {
      return _match
    }

    const safeWidth = clampWechatImageWidth(width)
    if (safeWidth !== width) {
      clamped = true
    }

    return `${prefix}width:${safeWidth}px;`
  })

  return { style: nextStyle, clamped }
}

function clampWechatImageTagWidth(tag: string): string {
  return tag.replace(/style=(["'])(.*?)\1/i, (_match, quote: string, style: string) => {
    const result = clampWechatImageWidthInStyle(style)
    const heightAuto = result.clamped && !/height\s*:\s*auto/i.test(result.style)
      ? `${result.style.endsWith(';') ? result.style : `${result.style};`}height:auto;`
      : result.style
    return `style=${quote}${heightAuto}${quote}`
  })
}

function buildWechatLatexFallback(source: string, displayMode: boolean, primaryColor?: string): string {
  const formula = source.replace(/\s+/g, ' ').trim() || '公式'
  const color = primaryColor || '#0066cc'
  if (displayMode) {
    return `<section data-inkforge-latex="degraded" style="margin:12px 0;padding:10px 12px;border-left:3px solid ${color};background:#f7f9fb;color:#333;font-size:14px;line-height:1.7;word-break:break-all;">公式：${escapeWechatText(formula)}</section>`
  }

  return `<span data-inkforge-latex="degraded" style="color:${color};font-family:Menlo,Monaco,Consolas,monospace;font-size:0.95em;word-break:break-all;">公式：${escapeWechatText(formula)}</span>`
}

function extractLatexSourceFromNode(node: Element): string {
  const rawAnnotation = node.innerHTML.match(/<annotation\b[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/i)
  if (rawAnnotation?.[1]?.trim()) {
    return decodeWechatText(rawAnnotation[1].trim())
  }

  const annotation = node.querySelector('annotation[encoding="application/x-tex"]')
  if (annotation?.textContent?.trim()) {
    return annotation.textContent
  }

  const code = node.querySelector('code')
  if (code?.textContent?.trim()) {
    return code.textContent
  }

  return node.textContent ?? ''
}

function degradeWechatLatexHtml(html: string, primaryColor?: string): string {
  if (!/(class=["'][^"']*(?:katex|math-fallback)|<annotation\s+encoding=["']application\/x-tex["'])/i.test(html)) {
    return html
  }

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
    const nodes = Array.from(doc.body.querySelectorAll<HTMLElement>('.katex-display, .katex, .math-fallback'))

    for (const node of nodes) {
      if (!node.isConnected || !node.parentNode) continue
      const source = extractLatexSourceFromNode(node)
      const displayMode = node.classList.contains('katex-display') || node.tagName.toLowerCase() === 'div'
      const template = doc.createElement('template')
      template.innerHTML = buildWechatLatexFallback(source, displayMode, primaryColor)
      const fallback = template.content.firstElementChild
      if (fallback) {
        node.replaceWith(fallback)
      }
    }

    return doc.body.innerHTML
  }

  return html
    .replace(/<span\s+class=["']math-fallback["']>\s*<code>([\s\S]*?)<\/code>\s*<\/span>/gi, (_match, source: string) => buildWechatLatexFallback(source, false, primaryColor))
    .replace(/<div\s+class=["']math-fallback["']>\s*<code>([\s\S]*?)<\/code>\s*<\/div>/gi, (_match, source: string) => buildWechatLatexFallback(source, true, primaryColor))
}

function buildWechatMermaidFallback(summary: string, primaryColor?: string): string {
  const color = primaryColor || '#0066cc'
  const normalizedSummary = summary.replace(/\s+/g, ' ').trim()
  const suffix = normalizedSummary
    ? `；摘要：${escapeWechatText(normalizedSummary.slice(0, 160))}`
    : ''
  return `<section style="margin:12px 0;padding:10px 12px;border-left:3px solid ${color};background:#f7f9fb;color:#333;font-size:14px;line-height:1.7;">图表：Mermaid 图表需转为 PNG/JPG 后上传微信正文图片${suffix}</section>`
}

function extractWechatMermaidSummaryFromHtml(html: string): string {
  return decodeWechatText(
    html
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<defs\b[\s\S]*?<\/defs>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim()
}

function extractWechatMermaidDataSource(attrs: string): string {
  const match = attrs.match(/\sdata-source=(["'])([\s\S]*?)\1/i)
  return match?.[2] ? decodeWechatText(match[2]).trim() : ''
}

function extractWechatMermaidSummary(node: HTMLElement): string {
  const dataSource = node.getAttribute('data-source')?.trim()
  if (dataSource) {
    return dataSource
  }

  const fallbackSource = node.querySelector('code')?.textContent?.trim()
  if (fallbackSource) {
    return fallbackSource
  }

  const labelTexts = Array.from(node.querySelectorAll('text, tspan'))
    .map(item => item.textContent?.replace(/\s+/g, ' ').trim())
    .filter((item): item is string => Boolean(item))

  if (labelTexts.length > 0) {
    return Array.from(new Set(labelTexts)).join(' / ')
  }

  const clone = node.cloneNode(true) as HTMLElement
  clone.querySelectorAll('style, script, defs').forEach(item => item.remove())
  const cloneText = clone.textContent?.replace(/\s+/g, ' ').trim()
  if (cloneText) {
    return cloneText
  }

  return extractWechatMermaidSummaryFromHtml(node.innerHTML)
}

function degradeWechatMermaidHtml(html: string, primaryColor?: string): string {
  if (!/mermaid-(?:rendered|fallback)/i.test(html)) {
    return html
  }

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
    const nodes = Array.from(doc.body.querySelectorAll<HTMLElement>('.mermaid-rendered, .mermaid-fallback'))

    for (const node of nodes) {
      if (!node.isConnected || !node.parentNode) continue
      const template = doc.createElement('template')
      template.innerHTML = buildWechatMermaidFallback(extractWechatMermaidSummary(node), primaryColor)
      const fallback = template.content.firstElementChild
      if (fallback) {
        node.replaceWith(fallback)
      }
    }

    return doc.body.innerHTML
  }

  return html
    .replace(/<div\b([^>]*class=["'][^"']*mermaid-rendered[^"']*["'][^>]*)>([\s\S]*?)<\/div>/gi, (_match, attrs: string, body: string) => buildWechatMermaidFallback(extractWechatMermaidDataSource(attrs) || extractWechatMermaidSummaryFromHtml(body), primaryColor))
    .replace(/<pre\b([^>]*class=["'][^"']*mermaid-fallback[^"']*["'][^>]*)>([\s\S]*?)<\/pre>/gi, (_match, attrs: string, body: string) => buildWechatMermaidFallback(extractWechatMermaidDataSource(attrs) || extractWechatMermaidSummaryFromHtml(body), primaryColor))
}

function normalizeImageAttributes(html: string): string {
  // 输入长度检查
  if (!checkInputLength(html, 'normalizeImageAttributes')) {
    return html
  }

  let result = html

  // 使用迭代方式处理图片标签，避免复杂正则
  result = processImageTags(result, (imgTag) => {
    let processed = imgTag
    let widthWasClamped = false

    // 先压缩已有 style width，避免后续追加 width 后留下更大的旧值。
    processed = clampWechatImageTagWidth(processed)

    // 提取 width 属性值
    const widthMatch = processed.match(/\swidth=["'](\d+)["']/i)
    if (widthMatch) {
      const rawWidth = parseInt(widthMatch[1], 10)
      const safeWidth = clampWechatImageWidth(rawWidth)
      widthWasClamped = safeWidth !== rawWidth
      const widthStyle = `width:${safeWidth}px;`
      processed = processed.replace(widthMatch[0], '')
      processed = addStyleToTag(processed, widthStyle)
    }

    // 提取 height 属性值
    const heightMatch = processed.match(/\sheight=["'](\d+)["']/i)
    if (heightMatch) {
      const heightStyle = widthWasClamped ? 'height:auto;' : `height:${heightMatch[1]}px;`
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
function findHtmlTagEnd(html: string, startIndex: number): number {
  let quote: '"' | "'" | null = null

  for (let index = startIndex; index < html.length; index += 1) {
    const char = html[index]
    if (quote) {
      if (char === quote) {
        quote = null
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if (char === '>') {
      return index
    }
  }

  return -1
}

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
    const imgEnd = findHtmlTagEnd(html, imgStart)
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
/** 移除微信不接受的成对交互/脚本标签，使用字符串扫描避免正则逃逸差异。 */
function stripForbiddenPairedTag(html: string, tagName: string): string {
  let result = ''
  let cursor = 0
  let lower = html.toLowerCase()
  const openNeedle = `<${tagName}`
  const closeNeedle = `</${tagName}>`

  while (cursor < html.length) {
    const start = lower.indexOf(openNeedle, cursor)
    if (start === -1) {
      result += html.slice(cursor)
      break
    }

    result += html.slice(cursor, start)
    const openEnd = html.indexOf('>', start)
    if (openEnd === -1) {
      break
    }

    const closeStart = lower.indexOf(closeNeedle, openEnd + 1)
    if (closeStart === -1) {
      cursor = openEnd + 1
    } else {
      cursor = closeStart + closeNeedle.length
    }
    lower = html.toLowerCase()
  }

  return result
}

/** 移除微信不接受的单标签或残留起始标签。 */
function stripForbiddenStartTags(html: string, tagName: string): string {
  let result = ''
  let cursor = 0
  const lower = html.toLowerCase()
  const openNeedle = `<${tagName}`

  while (cursor < html.length) {
    const start = lower.indexOf(openNeedle, cursor)
    if (start === -1) {
      result += html.slice(cursor)
      break
    }

    result += html.slice(cursor, start)
    const end = html.indexOf('>', start)
    if (end === -1) {
      break
    }
    cursor = end + 1
  }

  return result
}

function isWhitespaceChar(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t'
}

function isAttributeNameChar(char: string): boolean {
  const code = char.charCodeAt(0)
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    char === '-' ||
    char === ':'
  )
}

/** 清理事件属性和 javascript: 链接属性，作为 DOMPurify 之后的最后安全网。 */
function stripUnsafeAttributesFromTag(tag: string): string {
  let result = ''
  let cursor = 0

  while (cursor < tag.length) {
    if (!isWhitespaceChar(tag[cursor])) {
      result += tag[cursor]
      cursor++
      continue
    }

    const attrStart = cursor
    while (cursor < tag.length && isWhitespaceChar(tag[cursor])) cursor++
    const nameStart = cursor
    while (cursor < tag.length && isAttributeNameChar(tag[cursor])) cursor++

    if (nameStart === cursor) {
      result += tag.slice(attrStart, cursor)
      continue
    }

    const attrName = tag.slice(nameStart, cursor).toLowerCase()
    while (cursor < tag.length && isWhitespaceChar(tag[cursor])) cursor++

    let attrValue = ''
    if (tag[cursor] === '=') {
      cursor++
      while (cursor < tag.length && isWhitespaceChar(tag[cursor])) cursor++
      const quote = tag[cursor]
      if (quote === '"' || quote === "'") {
        cursor++
        const valueStart = cursor
        while (cursor < tag.length && tag[cursor] !== quote) cursor++
        attrValue = tag.slice(valueStart, cursor)
        if (tag[cursor] === quote) cursor++
      } else {
        const valueStart = cursor
        while (cursor < tag.length && !isWhitespaceChar(tag[cursor]) && tag[cursor] !== '>') cursor++
        attrValue = tag.slice(valueStart, cursor)
      }
    }

    const unsafeEvent = attrName.startsWith('on')
    const unsafeUrl = (attrName === 'href' || attrName === 'src') && attrValue.trim().toLowerCase().startsWith('javascript:')
    if (!unsafeEvent && !unsafeUrl) {
      result += tag.slice(attrStart, cursor)
    }
  }

  return result
}

function stripUnsafeAttributes(html: string): string {
  let result = ''
  let cursor = 0

  while (cursor < html.length) {
    const tagStart = html.indexOf('<', cursor)
    if (tagStart === -1) {
      result += html.slice(cursor)
      break
    }

    const tagEnd = html.indexOf('>', tagStart)
    if (tagEnd === -1) {
      result += html.slice(cursor)
      break
    }

    result += html.slice(cursor, tagStart)
    result += stripUnsafeAttributesFromTag(html.slice(tagStart, tagEnd + 1))
    cursor = tagEnd + 1
  }

  return result
}

export function postProcessForWechat(html: string, primaryColor?: string): string {
  let result = html

  // 0. CSS 变量替换（必须在其他处理之前）
  result = replaceCssVariables(result, primaryColor)

  // 0.25 安全兜底：微信草稿会移除 JS/交互标签，导出侧也必须先清理，避免失败的 DOM 实现放行危险节点。
  for (const tagName of ['script', 'style', 'iframe', 'object', 'embed', 'form', 'button']) {
    result = stripForbiddenPairedTag(result, tagName)
  }
  for (const tagName of ['input', 'object', 'embed', 'form', 'button']) {
    result = stripForbiddenStartTags(result, tagName)
  }
  result = stripUnsafeAttributes(result)

  // 0.5 首元素 margin-top 清零（doocs/md 最佳实践：防止微信顶部多余空白）
  result = result.replace(
    /(<(?:h[1-6]|p|section|div|blockquote|ul|ol|table|pre)[^>]*style="[^"]*?)margin-top:\s*\d+[^;"]*;?/i,
    '$1margin-top:0;'
  )

  // 1. 图片属性规范化
  result = normalizeImageAttributes(result)

  // 2. 嵌套列表结构修复
  result = fixNestedLists(result)

  // 3. Mermaid SVG 文本修复
  result = fixMermaidSvg(result)

  // 3.5 WeChat 不保留 KaTeX class/CSS，公式必须先降级成自包含可读内容。
  result = degradeWechatLatexHtml(result, primaryColor)

  // 4. margin: auto 不支持
  result = result.replace(/margin:\s*(\d+)px\s+auto/g, 'margin: $1px 0')
  result = result.replace(/margin:\s*auto/g, 'margin: 0')

  // 5. [已移除] top→transform 转换
  // 原因: 微信不支持 transform (WECHAT_SUPPORT.transform=false)，
  // 转换后 enforcePlatformCSS 会剥离 transform，导致 top 和 transform 双丢失。
  // 微信支持 position:relative + top，保留原始 top 属性即可。

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

  // 7.5 微信编辑器不保留 class；所有 class 依赖必须在此之前转成内联样式。
  result = result.replace(/\sclass=(?:"[^"]*"|'[^']*')/gi, '')

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

  // 9.1 表格单元格确保有内联边框（juice 可能不完整内联到 th/td）
  result = result.replace(
    /<th(?![^>]*border)([^>]*)>/gi,
    (match, attrs) => {
      if (attrs.includes('style=')) {
        return match.replace(/style="([^"]*)"/, `style="$1;border:1px solid #ddd;padding:10px 12px;background:#f5f5f5;font-weight:600;"`)
      }
      return `<th style="border:1px solid #ddd;padding:10px 12px;background:#f5f5f5;font-weight:600;text-align:left;"${attrs}>`
    }
  )
  result = result.replace(
    /<td(?![^>]*border)([^>]*)>/gi,
    (match, attrs) => {
      if (attrs.includes('style=')) {
        return match.replace(/style="([^"]*)"/, `style="$1;border:1px solid #ddd;padding:10px 12px;"`)
      }
      return `<td style="border:1px solid #ddd;padding:10px 12px;"${attrs}>`
    }
  )

  // 10. 确保 section#nice 有基础样式
  result = result.replace(
    /<section([^>]*)id="nice"(?![^>]*style=)([^>]*)>/gi,
    '<section$1id="nice" style="font-size:15px;line-height:1.8;color:#333;padding:16px;word-break:break-word;"$2>'
  )

  // 11. 增强 blockquote 样式（普通 blockquote，非 Alert 块）
  // Alert 块已由 renderAlertBlocks 处理并转为 <section>，此处仅处理原始 <blockquote>
  const bqColor = primaryColor || '#0066cc'
  // 根据主色生成浅色背景（简单的颜色淡化：使用半透明覆盖）
  result = result.replace(
    /<blockquote(?![^>]*style=)([^>]*)>/gi,
    `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid ${bqColor};background:#f5f7f9;border-radius:0 8px 8px 0;color:#555;font-size:15px;line-height:1.8;"$1>`
  )
  // 已有 style 的 blockquote 确保有圆角
  result = result.replace(
    /<blockquote([^>]*)\sstyle="([^"]*)"([^>]*)>/gi,
    (_match, before, style, after) => {
      if (!/border-radius/.test(style)) {
        return `<blockquote${before} style="${style};border-radius:0 8px 8px 0;"${after}>`
      }
      return _match
    }
  )

  // 12. 增强 figure 和 figcaption 样式
  result = result.replace(
    /<figure(?![^>]*style=)([^>]*)>/gi,
    '<figure style="margin:16px 0;text-align:center;"$1>'
  )
  result = result.replace(
    /<figcaption(?![^>]*style=)([^>]*)>/gi,
    '<figcaption style="text-align:center;font-style:italic;color:#999;font-size:13px;margin-top:8px;line-height:1.6;"$1>'
  )

  return result
}

// ═══════════════════════════════════════════════════════════════════
// 主要导出函数
// ═══════════════════════════════════════════════════════════════════

const EXPORT_FONT_FAMILIES: readonly ExportFontFamily[] = ['sans-serif', 'serif', 'monospace']
const EXPORT_FONT_SIZES: readonly ExportFontSize[] = ['14px', '15px', '16px', '17px', '18px']

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeExportFontFamily(value?: ExportFontFamily): ExportFontFamily | undefined {
  return value && EXPORT_FONT_FAMILIES.includes(value) ? value : undefined
}

function normalizeExportFontSize(value?: ExportFontSize): ExportFontSize | undefined {
  return value && EXPORT_FONT_SIZES.includes(value) ? value : undefined
}

function normalizeExportPrimaryColor(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed && /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : undefined
}

function applyWechatStyleOptions(
  preset: ExportPreset,
  options: WechatExportOptions
): ExportPreset {
  const primaryColor = normalizeExportPrimaryColor(options.primaryColor)
  const fontFamily = normalizeExportFontFamily(options.fontFamily)
  const fontSize = normalizeExportFontSize(options.fontSize)

  if (!primaryColor && !fontFamily && !fontSize) {
    return preset
  }

  // Compute font-family / font-size overlay only when caller actually
  // supplied an override. This lets dual-track presets keep their
  // persona-bound fonts as the default while still honoring Inspector
  // / WeChat option overrides at runtime.
  let fontOverlay = ''
  if (fontFamily || fontSize) {
    const effectiveFamily = fontFamily ?? preset.fontFamily
    const effectiveSize = fontSize ?? preset.fontSize
    const fontKey = effectiveFamily === 'sans-serif' ? 'sans'
      : effectiveFamily === 'monospace' ? 'mono'
      : effectiveFamily as keyof typeof FONT_STACKS
    const stack = FONT_STACKS[fontKey] ?? FONT_STACKS.sans
    fontOverlay = `\n#nice { font-family: ${stack}; font-size: ${effectiveSize}; }`
  }

  const rewriteAndOverlay = (css?: string): string | undefined => {
    if (!css) return css
    let next = css
    if (primaryColor) {
      next = next.replace(new RegExp(escapeRegExp(preset.primaryColor), 'gi'), primaryColor)
    }
    if (fontOverlay) {
      next += fontOverlay
    }
    return next
  }

  return {
    ...preset,
    primaryColor: primaryColor ?? preset.primaryColor,
    fontFamily: fontFamily ?? preset.fontFamily,
    fontSize: fontSize ?? preset.fontSize,
    customCSS: rewriteAndOverlay(preset.customCSS),
    previewCSS: rewriteAndOverlay(preset.previewCSS),
    exportCSS: rewriteAndOverlay(preset.exportCSS),
  }
}

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
  options: WechatExportOptions = {}
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
  options: WechatExportOptions = {}
): ExportResult {
  const {
    enableCiteStatus = true,
    enableLineNumbers = false,
    enableReadingTime = true,
    readingSpeed = 300,
    enableCodeHighlight = true,
    enableMacCodeBlock = false,
    enableTextIndent,
    codeTheme = 'atom-one-dark',
    enableAlertBlocks = true,
    enableEnhancedTable = true,
    enableCodeLanguageLabel = true,
    // ─── P2-T6 platform-rules/wechat 合规化开关 ──────────────────────
    enableCjkSpacing = true,
    maxContentWidth = 677,
    enableDarkMode = false,
    darkModeText,
    darkModeBg,
  } = options

  const effectivePreset = applyWechatStyleOptions(preset, options)

  // 计算统计信息
  const statsOverride = (options as WechatExportOptions & { statsOverride?: ExportStats }).statsOverride
  const stats = statsOverride ?? calculateStats(html, readingSpeed)

  // Step 1: Task List Checkbox 转换（必须在 DOMPurify 之前，因为 input 标签会被删除）
  const checkboxProcessedHtml = convertTaskListCheckboxes(html, effectivePreset.primaryColor)
  // Step 1.5: KaTeX MathML annotation 会被 DOMPurify 白名单移除，WeChat 公式降级必须抢先保留 TeX 源。
  const latexDegradedHtml = degradeWechatLatexHtml(checkboxProcessedHtml, effectivePreset.primaryColor)
  const mermaidDegradedHtml = degradeWechatMermaidHtml(latexDegradedHtml, effectivePreset.primaryColor)

  // Step 2: DOMPurify XSS防护 (增强配置)
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
    sanitizedHtml = purify.sanitize(mermaidDegradedHtml, {
      ALLOWED_TAGS: [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'em', 'u', 's', 'del', 'ins',
        'a', 'img', 'br', 'hr',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div', 'section',
        'sup', 'sub',
        'figure', 'figcaption'
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

  // Step 2.5: 空段落清理和连续换行限制
  const cleanedHtml = limitConsecutiveBreaks(cleanEmptyParagraphs(sanitizedHtml))

  // Step 3: 代码高亮处理
  const highlightedHtml = enableCodeHighlight
    ? highlightCodeBlocks(cleanedHtml, enableLineNumbers, enableMacCodeBlock, codeTheme, enableCodeLanguageLabel)
    : cleanedHtml

  // Step 2.5: GitHub 风格 Alert 块渲染（在代码高亮之后、脚注转换之前）
  const alertProcessedHtml = enableAlertBlocks
    ? renderAlertBlocks(highlightedHtml)
    : highlightedHtml

  // Step 3: 外链转脚注
  const { html: processedHtml, footnotes } = enableCiteStatus
    ? convertLinksToFootnotes(alertProcessedHtml)
    : { html: alertProcessedHtml, footnotes: [] }

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
  // PR3: pass 'export' so dual-track presets emit the juice-safe variant
  let css = generateThemeCSS(effectivePreset, 'export') + codeThemeCSS

  // 处理首行缩进选项：显式传入时覆盖预设设置
  if (enableTextIndent === true) {
    css += '\n#nice p { text-indent: 2em; }'
  } else if (enableTextIndent === false) {
    css = css.replace(/text-indent:\s*2em;?/g, '')
  }

  // 添加样式
  const styledHtml = `<style>${css}</style>${wrappedHtml}`

  // CSS内联（doocs/md 最佳实践：启用伪元素内联）
  const inlinedHtml = juice(styledHtml, {
    removeStyleTags: true,
    preserveImportant: true,
    inlinePseudoElements: true
  })

  // 应用主题特定的标题装饰（在 juice 内联之后，微信兼容性处理之前）
  // 伪元素和渐变裁剪等效果在 juice 内联后会丢失，需要转换为真实 HTML 元素
  let decoratedHtml = applyHeadingDecorations(inlinedHtml, effectivePreset)

  // PR3: dual-track decorate hook — migrated presets inject real <span> for
  // pseudo-element-only effects (drop cap, CJK counters, large quote mark).
  if (effectivePreset.decorate) {
    decoratedHtml = effectivePreset.decorate(decoratedHtml, 'wechat')
  }

  // 增强表格样式 — 条纹行、圆角、主色表头（在 juice 内联之后）
  const tableEnhancedHtml = enableEnhancedTable
    ? enhanceTableStyles(decoratedHtml, effectivePreset.primaryColor)
    : decoratedHtml

  // 微信兼容性处理（传递主题色用于 CSS 变量替换）
  const wechatProcessedHtml = postProcessForWechat(tableEnhancedHtml, effectivePreset.primaryColor)

  // 最终安全网: 平台 CSS 合规化（确保无遗漏的不支持属性）
  const cssCompliantHtml = enforcePlatformCSS(wechatProcessedHtml, 'wechat')

  // ─── P2-T6: 平台合规化 — CJK/Latin 间距 + 677 clamp + dark-mode ─────
  // 必须在 enforcePlatformCSS 之后：clamp 包裹的 div 不能再被 CSS 验证器剥离，
  // dark-mode 写入的 data-* 属性也不该再被属性过滤打扰。
  const complianceOpts: WechatRuleOptions = {
    enableCjkSpacing,
    maxContentWidth,
    enableDarkMode,
    darkModeText,
    darkModeBg,
  }
  const finalHtml = wechatComplianceTransform(cssCompliantHtml, complianceOpts)

  return {
    html: finalHtml,
    stats
  }
}

/**
 * 将 InkforgeAST meta 合并进 calculateStats 返回的 ExportStats，
 * 用 AST 的精确计数覆盖正则估算的字段，但保留 readingTime（由速度推导）。
 *
 * 仅在持有原始 markdown 时调用 —— `convertToWechat[WithStats]` 入参是
 * 已渲染过的 HTML，无法走这条路径，因此此处不强行二次解析（成本高、收益低）。
 */
function mergeAstMetaIntoStats(stats: ExportStats, meta: InkforgeMeta, readingSpeed: number): ExportStats {
  const wordCount = meta.wordCount > 0 ? meta.wordCount : stats.wordCount

  return {
    ...stats,
    wordCount,
    readingTime: Math.max(1, Math.ceil(wordCount / readingSpeed)),
    codeBlockCount: meta.codeBlocks.length,
    imageCount: meta.images.length,
    headingCount: meta.headings.length,
  }
}

/**
 * Markdown转微信格式
 */
export async function markdownToWechat(
  markdown: string,
  preset: ExportPreset,
  options: WechatExportOptions = {}
): Promise<string> {
  // Markdown → HTML
  const html = await renderMarkdownWithLazyOptionalEnhancements(markdown)

  // HTML → 微信格式
  return convertToWechat(html, preset, options)
}

/**
 * Markdown转微信格式（带 AST 增强的 stats）
 *
 * 与 `convertToWechatWithStats` 不同的是，这里能拿到原始 markdown，因此跑一次
 * `parseToAST` 把 InkforgeMeta 的精确计数覆盖到 stats 里（headings / images /
 * codeBlocks / wordCount）。HTML 渲染管线本身不走 AST —— 避免引入回归。
 */
export async function markdownToWechatWithStats(
  markdown: string,
  preset: ExportPreset,
  options: WechatExportOptions = {}
): Promise<ExportResult> {
  const html = await renderMarkdownWithLazyOptionalEnhancements(markdown)
  const readingSpeed = options.readingSpeed ?? 300
  const baseStats = calculateStats(html, readingSpeed)

  // AST 仅用于 stats 增强：旧 marked 渲染管线保持不变，规避回归。
  let mergedStats = baseStats
  try {
    const { meta } = parseToAST(markdown)
    mergedStats = mergeAstMetaIntoStats(baseStats, meta, readingSpeed)
  } catch {
    // AST 解析失败时降级，stats 沿用原值。
  }

  const result = convertToWechatWithStats(html, preset, {
    ...options,
    statsOverride: mergedStats,
  } as WechatExportOptions)

  return { html: result.html, stats: mergedStats }
}
