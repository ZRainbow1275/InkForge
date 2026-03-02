/**
 * 微信公众号导出引擎
 * 参考 doocs/md 实现 + P0增强
 * - 代码语法高亮 (highlight.js)
 * - 外链转脚注 (citeStatus)
 * - XSS防护 (DOMPurify)
 */

import juice from 'juice'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 确保 marked 配置一致性（防止直接调用 markdownToWechat 时配置缺失）
marked.use({ breaks: true, gfm: true })
import type { ExportPreset } from '@/types'
import type { ExportOptions, ExportResult } from './types'
import { generateThemeCSS, codeThemeCSS, applyHeadingDecorations } from './themes'
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
    enableCodeHighlight = true,
    enableMacCodeBlock = false,
    enableTextIndent,
    codeTheme = 'atom-one-dark',
    enableAlertBlocks = true,
    enableEnhancedTable = true,
    enableCodeLanguageLabel = true
  } = options

  // 计算统计信息
  const stats = calculateStats(html, readingSpeed)

  // Step 1: Task List Checkbox 转换（必须在 DOMPurify 之前，因为 input 标签会被删除）
  const checkboxProcessedHtml = convertTaskListCheckboxes(html, preset.primaryColor)

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
    sanitizedHtml = purify.sanitize(checkboxProcessedHtml, {
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
  let css = generateThemeCSS(preset) + codeThemeCSS

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
  const decoratedHtml = applyHeadingDecorations(inlinedHtml, preset)

  // 增强表格样式 — 条纹行、圆角、主色表头（在 juice 内联之后）
  const tableEnhancedHtml = enableEnhancedTable
    ? enhanceTableStyles(decoratedHtml, preset.primaryColor)
    : decoratedHtml

  // 微信兼容性处理（传递主题色用于 CSS 变量替换）
  const wechatProcessedHtml = postProcessForWechat(tableEnhancedHtml, preset.primaryColor)

  // 最终安全网: 平台 CSS 合规化（确保无遗漏的不支持属性）
  const finalHtml = enforcePlatformCSS(wechatProcessedHtml, 'wechat')

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
