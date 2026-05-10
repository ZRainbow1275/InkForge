/**
 * 导出服务工具函数
 *
 * 提供代码高亮（多主题）、Alert 块渲染、脚注转换、统计信息等公共工具
 */

import hljs from 'highlight.js/lib/core'
import { INKFORGE_CODE_LANGUAGE_GRAMMARS } from '@/extensions/codeLanguageGrammars'
import type { Footnote, ExportStats, CodeTheme, CodeThemeColors, AlertType, AlertTheme } from './types'

// ═══════════════════════════════════════════════════════════════════
// 常量定义
// ═══════════════════════════════════════════════════════════════════

/** 编辑器默认行高（像素） */
export const EDITOR_LINE_HEIGHT = 27

/** 斜杠命令最大搜索距离 */
export const SLASH_COMMAND_MAX_DISTANCE = 20

let exportCodeLanguagesRegistered = false

function ensureExportCodeLanguagesRegistered(): void {
  if (exportCodeLanguagesRegistered) return

  for (const [language, grammar] of Object.entries(INKFORGE_CODE_LANGUAGE_GRAMMARS)) {
    if (!hljs.getLanguage(language)) {
      hljs.registerLanguage(language, grammar)
    }
  }

  exportCodeLanguagesRegistered = true
}

// ═══════════════════════════════════════════════════════════════════
// 代码高亮主题注册表
// ═══════════════════════════════════════════════════════════════════

/**
 * 代码高亮主题颜色配置表
 * 每个主题定义完整的语法颜色映射
 */
export const CODE_THEME_REGISTRY: Record<CodeTheme, CodeThemeColors> = {
  'atom-one-dark': {
    background: '#282c34', foreground: '#abb2bf',
    comment: '#5c6370', keyword: '#c678dd', string: '#98c379',
    number: '#d19a66', function: '#61aeee', type: '#e6c07b',
    variable: '#d19a66', tag: '#e06c75', attribute: '#d19a66',
    operator: '#56b6c2', lineNumber: '#5c6370', lineNumberBorder: '#3e4451',
    macHeaderBg: '#21252b',
  },
  'atom-one-light': {
    background: '#fafafa', foreground: '#383a42',
    comment: '#a0a1a7', keyword: '#a626a4', string: '#50a14f',
    number: '#986801', function: '#4078f2', type: '#c18401',
    variable: '#986801', tag: '#e45649', attribute: '#986801',
    operator: '#0184bc', lineNumber: '#a0a1a7', lineNumberBorder: '#e5e5e6',
    macHeaderBg: '#eaeaeb',
  },
  'github-dark': {
    background: '#0d1117', foreground: '#c9d1d9',
    comment: '#8b949e', keyword: '#ff7b72', string: '#a5d6ff',
    number: '#79c0ff', function: '#d2a8ff', type: '#ffa657',
    variable: '#ffa657', tag: '#7ee787', attribute: '#79c0ff',
    operator: '#ff7b72', lineNumber: '#484f58', lineNumberBorder: '#30363d',
    macHeaderBg: '#161b22',
  },
  'github-light': {
    background: '#ffffff', foreground: '#24292f',
    comment: '#6e7781', keyword: '#cf222e', string: '#0a3069',
    number: '#0550ae', function: '#8250df', type: '#953800',
    variable: '#953800', tag: '#116329', attribute: '#0550ae',
    operator: '#cf222e', lineNumber: '#6e7781', lineNumberBorder: '#d0d7de',
    macHeaderBg: '#f6f8fa',
  },
  'monokai': {
    background: '#272822', foreground: '#f8f8f2',
    comment: '#75715e', keyword: '#f92672', string: '#e6db74',
    number: '#ae81ff', function: '#a6e22e', type: '#66d9ef',
    variable: '#fd971f', tag: '#f92672', attribute: '#a6e22e',
    operator: '#f92672', lineNumber: '#75715e', lineNumberBorder: '#3e3d32',
    macHeaderBg: '#1e1f1c',
  },
  'vs2015': {
    background: '#1e1e1e', foreground: '#dcdcdc',
    comment: '#608b4e', keyword: '#569cd6', string: '#d69d85',
    number: '#b5cea8', function: '#dcdcaa', type: '#4ec9b0',
    variable: '#9cdcfe', tag: '#569cd6', attribute: '#9cdcfe',
    operator: '#d4d4d4', lineNumber: '#858585', lineNumberBorder: '#404040',
    macHeaderBg: '#1e1e1e',
  },
  'dracula': {
    background: '#282a36', foreground: '#f8f8f2',
    comment: '#6272a4', keyword: '#ff79c6', string: '#f1fa8c',
    number: '#bd93f9', function: '#50fa7b', type: '#8be9fd',
    variable: '#ffb86c', tag: '#ff79c6', attribute: '#50fa7b',
    operator: '#ff79c6', lineNumber: '#6272a4', lineNumberBorder: '#44475a',
    macHeaderBg: '#21222c',
  },
}

// ═══════════════════════════════════════════════════════════════════
// GitHub Alert 块配置
// ═══════════════════════════════════════════════════════════════════

/**
 * Alert 块主题注册表
 * 对应 GitHub Flavored Markdown Alert 语法
 */
export const ALERT_THEME_REGISTRY: Record<AlertType, AlertTheme> = {
  note: {
    icon: '注',
    title: '注意',
    color: '#0969da',
    backgroundColor: '#ddf4ff',
    borderColor: '#54aeff',
  },
  tip: {
    icon: '提',
    title: '提示',
    color: '#1a7f37',
    backgroundColor: '#dafbe1',
    borderColor: '#4ac26b',
  },
  important: {
    icon: '重',
    title: '重要',
    color: '#8250df',
    backgroundColor: '#fbefff',
    borderColor: '#c297ff',
  },
  warning: {
    icon: '警',
    title: '警告',
    color: '#9a6700',
    backgroundColor: '#fff8c5',
    borderColor: '#d4a72c',
  },
  caution: {
    icon: '危',
    title: '危险',
    color: '#cf222e',
    backgroundColor: '#ffebe9',
    borderColor: '#ff8182',
  },
}

// ═══════════════════════════════════════════════════════════════════
// HTML 处理工具
// ═══════════════════════════════════════════════════════════════════

/**
 * Task List Checkbox 转 Unicode 符号
 *
 * marked 将 `- [ ]` / `- [x]` 渲染为 `<input type="checkbox">`，
 * 但 DOMPurify 会删除 `<input>` 标签。
 * 此函数必须在 DOMPurify 之前调用，将 checkbox 转为 styled span。
 *
 * @param html - marked 输出的原始 HTML
 * @param primaryColor - 选中状态的主色调
 */
export function convertTaskListCheckboxes(html: string, primaryColor: string = '#0066cc'): string {
  const checkboxBaseStyle = [
    'display:inline-block',
    'width:0.85em',
    'height:0.85em',
    'margin-right:6px',
    'vertical-align:middle',
    'line-height:1',
    'border:1px solid',
    'border-radius:3px',
    'box-sizing:border-box',
  ].join(';')
  const checkedBox = '<span aria-hidden="true" style="' + checkboxBaseStyle + ';border-color:' + primaryColor + ';background:' + primaryColor + ';box-shadow:inset 0 0 0 3px #fff;"></span>'
  const uncheckedBox = '<span aria-hidden="true" style="' + checkboxBaseStyle + ';border-color:#ccc;background:transparent;"></span>'

  let result = html

  // 匹配 checked checkbox（属性顺序可能不同）
  result = result.replace(
    /<input\s+[^>]*(?:checked)[^>]*type=["']checkbox["'][^>]*>/gi,
    checkedBox
  )
  result = result.replace(
    /<input\s+[^>]*type=["']checkbox["'][^>]*(?:checked)[^>]*>/gi,
    checkedBox
  )

  // 匹配 unchecked checkbox（没有 checked 属性）
  result = result.replace(
    /<input\s+[^>]*type=["']checkbox["'][^>]*>/gi,
    uncheckedBox
  )

  return result
}

/**
 * 清理空段落
 * 移除 `<p></p>` 和 `<p><br></p>` 等无内容段落，避免微信中产生多余空白
 */
export function cleanEmptyParagraphs(html: string): string {
  // 移除完全空的段落
  let result = html.replace(/<p[^>]*>\s*<\/p>/gi, '')
  // 移除只含 <br> 的段落
  result = result.replace(/<p[^>]*>\s*<br\s*\/?>\s*<\/p>/gi, '')
  return result
}

/**
 * 限制连续换行符数量
 * 将 3 个及以上连续 `<br>` 合并为最多 2 个，防止过度空白
 */
export function limitConsecutiveBreaks(html: string, maxBreaks: number = 2): string {
  const brPattern = /(<br\s*\/?>[\s]*){3,}/gi
  const replacement = Array(maxBreaks).fill('<br>').join('')
  return html.replace(brPattern, replacement)
}

/**
 * HTML实体解码
 * 使用浏览器原生 DOMParser 全量解码所有 HTML 实体（包括数字实体和命名实体）
 * 在非浏览器环境降级为手动映射
 */
export function decodeHtmlEntities(html: string): string {
  // 浏览器环境：使用 DOMParser 原生解码（覆盖 2000+ HTML 命名实体 + 数字实体）
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(
        `<!doctype html><body>${html}`,
        'text/html'
      )
      return doc.body.textContent ?? html
    } catch {
      // DOMParser 失败时降级到手动映射
    }
  }

  // 降级：手动映射常见实体
  const entities: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&hellip;': '\u2026',
    '&mdash;': '\u2014',
    '&ndash;': '\u2013',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&bull;': '\u2022',
    '&copy;': '\u00A9',
    '&reg;': '\u00AE',
    '&trade;': '\u2122',
  }

  return html.replace(/&[^;]+;/g, (entity) => entities[entity] || entity)
}

/**
 * HTML转义
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ═══════════════════════════════════════════════════════════════════
// 代码高亮工具
// ═══════════════════════════════════════════════════════════════════

/**
 * 根据主题生成 hljs class → inline style 的映射表
 */
function buildHljsStyleMap(theme: CodeThemeColors): Record<string, string> {
  return {
    'hljs-comment': `color:${theme.comment};font-style:italic`,
    'hljs-quote': `color:${theme.comment};font-style:italic`,
    'hljs-keyword': `color:${theme.keyword}`,
    'hljs-doctag': `color:${theme.keyword}`,
    'hljs-formula': `color:${theme.keyword}`,
    'hljs-section': `color:${theme.tag}`,
    'hljs-name': `color:${theme.tag}`,
    'hljs-selector-tag': `color:${theme.tag}`,
    'hljs-deletion': `color:${theme.tag}`,
    'hljs-subst': `color:${theme.tag}`,
    'hljs-literal': `color:${theme.operator}`,
    'hljs-string': `color:${theme.string}`,
    'hljs-regexp': `color:${theme.string}`,
    'hljs-addition': `color:${theme.string}`,
    'hljs-attribute': `color:${theme.string}`,
    'hljs-attr': `color:${theme.variable}`,
    'hljs-variable': `color:${theme.variable}`,
    'hljs-template-variable': `color:${theme.variable}`,
    'hljs-type': `color:${theme.variable}`,
    'hljs-selector-class': `color:${theme.variable}`,
    'hljs-selector-attr': `color:${theme.variable}`,
    'hljs-selector-pseudo': `color:${theme.variable}`,
    'hljs-number': `color:${theme.number}`,
    'hljs-symbol': `color:${theme.function}`,
    'hljs-bullet': `color:${theme.function}`,
    'hljs-link': `color:${theme.function};text-decoration:underline`,
    'hljs-meta': `color:${theme.function}`,
    'hljs-selector-id': `color:${theme.function}`,
    'hljs-title': `color:${theme.function}`,
    'hljs-built_in': `color:${theme.type}`,
    'hljs-class': `color:${theme.type}`,
    'hljs-emphasis': 'font-style:italic',
    'hljs-strong': 'font-weight:bold',
    'hljs-params': `color:${theme.foreground}`,
    'hljs-function': `color:${theme.function}`,
    'hljs-tag': `color:${theme.tag}`,
    'hljs-property': `color:${theme.variable}`,
  }
}

/**
 * 将 highlight.js 的 class 转为 inline style（主题感知版本）
 */
export function convertHljsClassesToInlineStyles(html: string, themeId: CodeTheme = 'atom-one-dark'): string {
  const themeColors = CODE_THEME_REGISTRY[themeId]
  const styleMap = buildHljsStyleMap(themeColors)

  return html.replace(
    /<span class="([^"]+)">/g,
    (match, classes) => {
      const classList = classes.split(' ')
      const styles: string[] = []

      for (const cls of classList) {
        if (styleMap[cls]) {
          styles.push(styleMap[cls])
        }
      }

      if (styles.length > 0) {
        return `<span style="${styles.join(';')}">`
      }
      return match
    }
  )
}

/**
 * 为代码添加行号（主题感知版本）
 */
export function addLineNumbers(code: string, themeId: CodeTheme = 'atom-one-dark'): string {
  const theme = CODE_THEME_REGISTRY[themeId]
  const lines = code.split('\n')
  const lineCount = lines.length
  const lineNumberWidth = String(lineCount).length

  const lineNumbers = lines.map((_, i) =>
    `<span style="display:block;color:${theme.lineNumber};text-align:right;user-select:none;padding-right:12px;min-width:${lineNumberWidth}ch;">${i + 1}</span>`
  ).join('')

  const codeLines = lines.map(line =>
    `<span style="display:block;">${line || ' '}</span>`
  ).join('')

  // 使用 table-cell 布局替代 flex（微信公众号不支持 flex 布局，会被后处理移除）
  return `<span style="display:table;width:100%;table-layout:fixed;"><span style="display:table-cell;vertical-align:top;border-right:1px solid ${theme.lineNumberBorder};padding:16px 0;background:${theme.macHeaderBg};width:${(lineNumberWidth + 2) * 0.65}em;">${lineNumbers}</span><span style="display:table-cell;vertical-align:top;padding:16px 0 16px 12px;overflow-x:auto;word-break:break-all;">${codeLines}</span></span>`
}

/**
 * Mac 风格代码块头部包装（主题感知版本）
 * @param preHtml - 已渲染的 <pre>...</pre> HTML
 * @param language - 代码语言标识
 * @param themeId - 代码主题
 */
function wrapWithMacHeader(preHtml: string, language: string, themeId: CodeTheme = 'atom-one-dark'): string {
  const theme = CODE_THEME_REGISTRY[themeId]
  const langLabel = language || 'Code'

  // 使用非 flex 布局（微信兼容: overflow:hidden 清除浮动 + float:right 语言标签）
  const macHeader =
    `<section style="padding:8px 12px;background:${theme.macHeaderBg};border-radius:8px 8px 0 0;overflow:hidden;">` +
    `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#FF5F56;margin-right:6px;"></span>` +
    `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#FFBD2E;margin-right:6px;"></span>` +
    `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#27C93F;margin-right:6px;"></span>` +
    `<span style="float:right;color:${theme.lineNumber};font-size:12px;font-family:monospace;line-height:12px;">${langLabel}</span>` +
    `</section>`

  const modifiedPre = preHtml.replace(
    /border-radius:\s*8px/,
    'border-radius:0 0 8px 8px'
  )

  return (
    `<section style="margin:16px 0;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.12);">` +
    `${macHeader}${modifiedPre}` +
    `</section>`
  )
}

/**
 * 代码块语法高亮（多主题增强版）
 * @param html - 输入 HTML
 * @param enableLineNumbers - 是否显示行号
 * @param enableMacCodeBlock - 是否启用 Mac 风格代码块
 * @param themeId - 代码高亮主题
 * @param enableLanguageLabel - 是否在非 Mac 模式显示语言标签
 */
export function highlightCodeBlocks(
  html: string,
  enableLineNumbers: boolean = false,
  enableMacCodeBlock: boolean = false,
  themeId: CodeTheme = 'atom-one-dark',
  enableLanguageLabel: boolean = false
): string {
  ensureExportCodeLanguagesRegistered()

  const theme = CODE_THEME_REGISTRY[themeId]

  return html.replace(
    /<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/gi,
    (_match, preAttrs, codeAttrs, code) => {
      const langMatch = codeAttrs.match(/class="[^"]*language-(\w+)[^"]*"/)
      const language = langMatch ? langMatch[1] : ''

      const decodedCode = decodeHtmlEntities(code)

      let highlightedCode: string
      try {
        if (language && hljs.getLanguage(language)) {
          highlightedCode = hljs.highlight(decodedCode, { language }).value
        } else {
          highlightedCode = hljs.highlightAuto(decodedCode).value
        }
      } catch {
        highlightedCode = escapeHtml(decodedCode)
      }

      highlightedCode = convertHljsClassesToInlineStyles(highlightedCode, themeId)

      let preHtml: string
      if (enableLineNumbers) {
        highlightedCode = addLineNumbers(highlightedCode, themeId)
        preHtml = `<pre${preAttrs} class="hljs" style="background:${theme.background};color:${theme.foreground};padding:0;border-radius:8px;overflow:hidden;font-size:14px;line-height:1.6;"><code${codeAttrs} style="font-family:Menlo,Monaco,Consolas,'Courier New',monospace;background:transparent;padding:0;display:block;overflow-x:auto;">${highlightedCode}</code></pre>`
      } else {
        preHtml = `<pre${preAttrs} class="hljs" style="background:${theme.background};color:${theme.foreground};padding:16px;border-radius:8px;overflow-x:auto;font-size:14px;line-height:1.6;"><code${codeAttrs} style="font-family:Menlo,Monaco,Consolas,'Courier New',monospace;background:transparent;padding:0;">${highlightedCode}</code></pre>`
      }

      // Mac 风格包装（含语言标签）
      if (enableMacCodeBlock) {
        return wrapWithMacHeader(preHtml, language, themeId)
      }

      // 非 Mac 模式下的独立语言标签
      // 使用 margin-top 负值 + float:right 替代 position:absolute（微信不支持 absolute 定位）
      if (enableLanguageLabel && language) {
        const langTag = `<div style="overflow:hidden;background:${theme.background};padding:4px 12px 0 0;border-radius:8px 8px 0 0;margin-bottom:-8px;"><span style="float:right;font-size:11px;color:${theme.lineNumber};font-family:monospace;text-transform:uppercase;letter-spacing:0.5px;">${language}</span></div>`
        // 调整 pre 的 border-radius 避免重叠
        const adjustedPre = preHtml.replace(
          /border-radius:\s*8px/,
          'border-radius:0 0 8px 8px'
        )
        return `<section style="margin:16px 0;border-radius:8px;overflow:hidden;">${langTag}${adjustedPre}</section>`
      }

      return preHtml
    }
  )
}

// ═══════════════════════════════════════════════════════════════════
// GitHub 风格 Alert 块渲染
// ═══════════════════════════════════════════════════════════════════

/**
 * 将 GitHub 风格 Alert blockquote 转换为带样式的 Alert 块
 *
 * 匹配模式：
 * ```html
 * <blockquote>
 *   <p>[!NOTE]</p>    <!-- 或 [!TIP] [!WARNING] [!CAUTION] [!IMPORTANT] -->
 *   <p>内容...</p>
 * </blockquote>
 * ```
 *
 * 使用 DOM 解析而非正则，避免 ReDoS 风险
 */
export function renderAlertBlocks(html: string): string {
  // 安全模式：使用非贪婪+有界正则匹配 alert 标记
  // 匹配 <blockquote> 中首行 [!TYPE] 标记
  const alertPattern = /<blockquote[^>]*>\s*<p>\s*\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*<\/p>([\s\S]*?)<\/blockquote>/gi

  return html.replace(alertPattern, (_match, typeStr: string, content: string) => {
    const alertType = typeStr.toLowerCase() as AlertType
    const theme = ALERT_THEME_REGISTRY[alertType]
    if (!theme) return _match

    // 清理 content 中的首尾空白
    const cleanContent = content.trim()

    return `<section style="margin:16px 0;padding:16px 20px;background:${theme.backgroundColor};border-left:4px solid ${theme.borderColor};border-radius:0 8px 8px 0;">` +
      `<p style="margin:0 0 8px 0;font-weight:600;color:${theme.color};font-size:15px;">${theme.icon} ${theme.title}</p>` +
      `<div style="color:${theme.color};font-size:14px;line-height:1.7;opacity:0.9;">${cleanContent}</div>` +
      `</section>`
  })
}

// ═══════════════════════════════════════════════════════════════════
// 增强表格渲染
// ═══════════════════════════════════════════════════════════════════

/**
 * 增强表格样式 — 条纹行、圆角、阴影
 * 在 juice CSS 内联化之后调用，直接操作 inline style
 * 按每个 table 块独立处理条纹行计数，确保多表格渲染正确
 *
 * @param html - 输入 HTML
 * @param primaryColor - 表头主色调（默认使用预设主色）
 */
export function enhanceTableStyles(html: string, primaryColor: string = '#0066cc'): string {
  // 按 </table> 拆分为独立块，对每个表格独立处理 tr 条纹
  const tableBlocks = html.split(/<\/table>/gi)
  const closingTags = html.match(/<\/table>/gi) || []

  const processedBlocks = tableBlocks.map((block, blockIndex) => {
    let processed = block

    // 处理 <table> 标签 — 添加容器包装实现圆角和阴影
    processed = processed.replace(
      /<table([^>]*)>/gi,
      (_match, attrs) => {
        return `<section style="margin:16px 0;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);"><table${attrs} style="border-collapse:collapse;width:100%;text-align:left;font-size:14px;">`
      }
    )

    // 处理 <thead> — 主色背景、白色文字
    processed = processed.replace(
      /<thead([^>]*)>/gi,
      `<thead$1 style="background:${primaryColor};color:#fff;font-weight:600;">`
    )

    // 处理 <th> — padding 和对齐
    processed = processed.replace(
      /<th([^>]*)>/gi,
      '<th$1 style="padding:10px 14px;border:1px solid rgba(255,255,255,0.2);color:#fff;font-weight:600;text-align:left;">'
    )

    // 处理 <tr> — 条纹行（每个表格独立计数）
    let rowIndex = 0
    processed = processed.replace(
      /<tr([^>]*)>/gi,
      (_match, attrs) => {
        rowIndex++
        const bgColor = rowIndex % 2 === 0 ? '#f8f9fa' : '#ffffff'
        return `<tr${attrs} style="background:${bgColor};">`
      }
    )

    // 处理 <td> — padding 和边框
    processed = processed.replace(
      /<td([^>]*)>/gi,
      '<td$1 style="padding:10px 14px;border:1px solid #e8e8e8;color:#333;word-break:break-word;">'
    )

    // 重新拼接 </table></section>（最后一个块不需要闭合标签）
    if (blockIndex < closingTags.length) {
      return processed + '</table></section>'
    }
    return processed
  })

  return processedBlocks.join('')
}

// ═══════════════════════════════════════════════════════════════════
// 外链转脚注
// ═══════════════════════════════════════════════════════════════════

/**
 * 外链转脚注
 * 将非微信链接转为底部引用
 * 支持链接文本中包含嵌套 HTML 标签（如 <strong>、<code> 等）
 */
export function convertLinksToFootnotes(html: string): { html: string; footnotes: Footnote[] } {
  const footnotes: Footnote[] = []
  let refIndex = 1

  const processedHtml = html.replace(
    /<a\s+([^>]*href="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/gi,
    (match, _attrs, href, text) => {
      // 跳过微信链接和锚点链接
      if (
        href.startsWith('https://mp.weixin.qq.com') ||
        href.startsWith('#') ||
        href.startsWith('javascript:')
      ) {
        return match
      }

      // 添加到脚注列表（剥离 HTML 标签作为纯文本标题）
      const plainText = text.replace(/<[^>]*>/g, '').trim()
      footnotes.push({
        title: plainText || href,
        href: href
      })

      const currentRef = refIndex++

      // 替换为带脚注引用的文本
      return `<span style="color:#0066cc">${text}</span><sup style="color:#0066cc;font-size:12px;margin-left:2px">[${currentRef}]</sup>`
    }
  )

  return { html: processedHtml, footnotes }
}

/**
 * 生成脚注区域
 */
export function buildFootnoteSection(footnotes: Footnote[]): string {
  if (footnotes.length === 0) return ''

  let section = `
<section style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;">
  <h4 style="font-size:14px;font-weight:600;color:#666;margin-bottom:12px;">引用链接</h4>
  <div style="font-size:13px;color:#666;line-height:1.8;">`

  footnotes.forEach((fn, index) => {
    section += `
    <p style="margin:4px 0;word-break:break-all;">
      <span style="color:#0066cc">[${index + 1}]</span> ${fn.title}: <span style="color:#999">${fn.href}</span>
    </p>`
  })

  section += `
  </div>
</section>`

  return section
}

// ═══════════════════════════════════════════════════════════════════
// 统计信息
// ═══════════════════════════════════════════════════════════════════

/**
 * 计算文章统计信息（增强版）
 */
export function calculateStats(html: string, readingSpeed: number): ExportStats {
  // 移除HTML标签获取纯文本
  const text = html.replace(/<[^>]+>/g, '')

  // 计算中文字数 (包括中文字符和英文单词)
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  const wordCount = chineseChars + englishWords

  // 计算阅读时间 (向上取整)
  const readingTime = Math.max(1, Math.ceil(wordCount / readingSpeed))

  // 计算代码块数量
  const codeBlockCount = (html.match(/<pre[^>]*>/gi) || []).length

  // 计算链接数量
  const linkCount = (html.match(/<a[^>]*href=/gi) || []).length

  // 计算图片数量
  const imageCount = (html.match(/<img[^>]*>/gi) || []).length

  // 计算标题数量 (h1-h6)
  const headingCount = (html.match(/<h[1-6][^>]*>/gi) || []).length

  // 计算表格数量
  const tableCount = (html.match(/<table[^>]*>/gi) || []).length

  return {
    wordCount,
    readingTime,
    codeBlockCount,
    linkCount,
    imageCount,
    headingCount,
    tableCount,
  }
}

/**
 * 生成阅读时间头部（增强版 — 更多统计指标）
 */
export function buildReadingTimeHeader(stats: ExportStats): string {
  const badges: string[] = [
    `<span style="margin-right:16px;">阅读约 <strong>${stats.readingTime}</strong> 分钟</span>`,
    `<span style="margin-right:16px;">全文 <strong>${stats.wordCount}</strong> 字</span>`,
  ]

  if (stats.codeBlockCount > 0) {
    badges.push(`<span style="margin-right:16px;">${stats.codeBlockCount} 个代码块</span>`)
  }
  if (stats.imageCount > 0) {
    badges.push(`<span style="margin-right:16px;">${stats.imageCount} 张图片</span>`)
  }
  if (stats.tableCount > 0) {
    badges.push(`<span style="margin-right:16px;">${stats.tableCount} 个表格</span>`)
  }

  return `
<div style="margin-bottom:20px;padding:12px 16px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px;color:white;font-size:13px;">
  ${badges.join('\n  ')}
</div>
`
}

// ═══════════════════════════════════════════════════════════════════
// 剪贴板操作
// ═══════════════════════════════════════════════════════════════════

const CLIPBOARD_WRITE_TIMEOUT_MS = 1200

async function attemptClipboardWrite(operation: Promise<void>): Promise<boolean> {
  try {
    await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Clipboard write timeout')), CLIPBOARD_WRITE_TIMEOUT_MS)
      }),
    ])
    return true
  } catch {
    return false
  }
}

/**
 * 当前浏览器是否具备可尝试的剪贴板写入能力。
 * 注意：最终是否成功仍取决于安全上下文、用户手势和浏览器权限。
 */
export function isClipboardWriteAvailable(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
    return true
  }

  return (
    typeof document !== 'undefined' &&
    typeof document.queryCommandSupported === 'function' &&
    document.queryCommandSupported('copy')
  )
}

/**
 * 复制纯文本到剪贴板。
 * @param text - 要复制的纯文本内容
 * @returns 复制是否成功
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
    const written = await attemptClipboardWrite(navigator.clipboard.writeText(text))
    if (written) {
      return true
    }
  }

  try {
    if (typeof document === 'undefined') return false

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  } catch {
    return false
  }
}

/**
 * 复制到剪贴板（HTML格式）
 * @param html - 要复制的 HTML 内容
 * @returns 复制是否成功
 * @throws 不抛出异常，失败时返回 false
 */
export async function copyToClipboard(html: string): Promise<boolean> {
  // 优先使用现代 Clipboard API
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.write === 'function') {
    const written = await attemptClipboardWrite(navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([html], { type: 'text/plain' })
      })
    ]))
    if (written) {
      return true
    }
  }

  // 降级方案：使用传统 execCommand（兼容旧浏览器）
  return copyTextToClipboard(html)
}
