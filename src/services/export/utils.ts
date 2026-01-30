/**
 * 导出服务工具函数
 */

import hljs from 'highlight.js'
import type { Footnote, ExportResult } from './types'

// ═══════════════════════════════════════════════════════════════════
// 常量定义
// ═══════════════════════════════════════════════════════════════════

/** 编辑器默认行高（像素） */
export const EDITOR_LINE_HEIGHT = 27

/** 斜杠命令最大搜索距离 */
export const SLASH_COMMAND_MAX_DISTANCE = 20

// ═══════════════════════════════════════════════════════════════════
// HTML 处理工具
// ═══════════════════════════════════════════════════════════════════

/**
 * HTML实体解码
 */
export function decodeHtmlEntities(html: string): string {
  const entities: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
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
 * 将 highlight.js 的 class 转为 inline style
 */
export function convertHljsClassesToInlineStyles(html: string): string {
  const styleMap: Record<string, string> = {
    'hljs-comment': 'color:#5c6370;font-style:italic',
    'hljs-quote': 'color:#5c6370;font-style:italic',
    'hljs-keyword': 'color:#c678dd',
    'hljs-doctag': 'color:#c678dd',
    'hljs-formula': 'color:#c678dd',
    'hljs-section': 'color:#e06c75',
    'hljs-name': 'color:#e06c75',
    'hljs-selector-tag': 'color:#e06c75',
    'hljs-deletion': 'color:#e06c75',
    'hljs-subst': 'color:#e06c75',
    'hljs-literal': 'color:#56b6c2',
    'hljs-string': 'color:#98c379',
    'hljs-regexp': 'color:#98c379',
    'hljs-addition': 'color:#98c379',
    'hljs-attribute': 'color:#98c379',
    'hljs-attr': 'color:#d19a66',
    'hljs-variable': 'color:#d19a66',
    'hljs-template-variable': 'color:#d19a66',
    'hljs-type': 'color:#d19a66',
    'hljs-selector-class': 'color:#d19a66',
    'hljs-selector-attr': 'color:#d19a66',
    'hljs-selector-pseudo': 'color:#d19a66',
    'hljs-number': 'color:#d19a66',
    'hljs-symbol': 'color:#61aeee',
    'hljs-bullet': 'color:#61aeee',
    'hljs-link': 'color:#61aeee;text-decoration:underline',
    'hljs-meta': 'color:#61aeee',
    'hljs-selector-id': 'color:#61aeee',
    'hljs-title': 'color:#61aeee',
    'hljs-built_in': 'color:#e6c07b',
    'hljs-class': 'color:#e6c07b',
    'hljs-emphasis': 'font-style:italic',
    'hljs-strong': 'font-weight:bold',
    'hljs-params': 'color:#abb2bf',
    'hljs-function': 'color:#61aeee',
    'hljs-tag': 'color:#e06c75',
  }

  // 替换所有 span class 为 inline style
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
 * 为代码添加行号
 */
export function addLineNumbers(code: string): string {
  const lines = code.split('\n')
  const lineCount = lines.length
  const lineNumberWidth = String(lineCount).length

  // 生成行号列
  const lineNumbers = lines.map((_, i) =>
    `<span style="display:block;color:#5c6370;text-align:right;user-select:none;padding-right:12px;min-width:${lineNumberWidth}ch;">${i + 1}</span>`
  ).join('')

  // 生成代码行
  const codeLines = lines.map(line =>
    `<span style="display:block;">${line || ' '}</span>`
  ).join('')

  return `<span style="display:flex;"><span style="display:flex;flex-direction:column;border-right:1px solid #3e4451;padding:16px 0;background:#21252b;">${lineNumbers}</span><span style="display:flex;flex-direction:column;padding:16px 0 16px 12px;flex:1;overflow-x:auto;">${codeLines}</span></span>`
}

/**
 * 代码块语法高亮
 * 使用 highlight.js 处理 pre>code 并将 class 转为 inline style
 * @param enableLineNumbers 是否显示行号
 */
export function highlightCodeBlocks(html: string, enableLineNumbers: boolean = false): string {
  // 使用正则匹配 pre>code 块
  return html.replace(
    /<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/gi,
    (_match, preAttrs, codeAttrs, code) => {
      // 提取语言
      const langMatch = codeAttrs.match(/class="[^"]*language-(\w+)[^"]*"/)
      const language = langMatch ? langMatch[1] : ''

      // 解码HTML实体
      const decodedCode = decodeHtmlEntities(code)

      // 使用 highlight.js 高亮
      let highlightedCode: string
      try {
        if (language && hljs.getLanguage(language)) {
          highlightedCode = hljs.highlight(decodedCode, { language }).value
        } else {
          highlightedCode = hljs.highlightAuto(decodedCode).value
        }
      } catch (_err) {
        // 高亮失败时回退到纯文本（静默处理，避免生产环境日志污染）
        highlightedCode = escapeHtml(decodedCode)
      }

      // 将 hljs class 转为 inline style
      highlightedCode = convertHljsClassesToInlineStyles(highlightedCode)

      // 如果启用行号
      if (enableLineNumbers) {
        highlightedCode = addLineNumbers(highlightedCode)
        return `<pre${preAttrs} class="hljs" style="background:#282c34;color:#abb2bf;padding:0;border-radius:8px;overflow-x:auto;font-size:14px;line-height:1.6;display:flex;"><code${codeAttrs} style="font-family:Menlo,Monaco,Consolas,'Courier New',monospace;background:transparent;padding:16px;flex:1;overflow-x:auto;">${highlightedCode}</code></pre>`
      }

      return `<pre${preAttrs} class="hljs" style="background:#282c34;color:#abb2bf;padding:16px;border-radius:8px;overflow-x:auto;font-size:14px;line-height:1.6;"><code${codeAttrs} style="font-family:Menlo,Monaco,Consolas,'Courier New',monospace;background:transparent;padding:0;">${highlightedCode}</code></pre>`
    }
  )
}

// ═══════════════════════════════════════════════════════════════════
// 外链转脚注
// ═══════════════════════════════════════════════════════════════════

/**
 * 外链转脚注
 * 将非微信链接转为底部引用
 */
export function convertLinksToFootnotes(html: string): { html: string; footnotes: Footnote[] } {
  const footnotes: Footnote[] = []
  let refIndex = 1

  const processedHtml = html.replace(
    /<a\s+([^>]*href="([^"]+)"[^>]*)>([^<]*)<\/a>/gi,
    (match, _attrs, href, text) => {
      // 跳过微信链接和锚点链接
      if (
        href.startsWith('https://mp.weixin.qq.com') ||
        href.startsWith('#') ||
        href.startsWith('javascript:')
      ) {
        return match
      }

      // 添加到脚注列表
      footnotes.push({
        title: text || href,
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
  <h4 style="font-size:14px;font-weight:600;color:#666;margin-bottom:12px;">🔗 引用链接</h4>
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
 * 计算文章统计信息
 */
export function calculateStats(html: string, readingSpeed: number): ExportResult['stats'] {
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

  return {
    wordCount,
    readingTime,
    codeBlockCount,
    linkCount,
    imageCount
  }
}

/**
 * 生成阅读时间头部
 */
export function buildReadingTimeHeader(stats: ExportResult['stats']): string {
  return `
<div style="margin-bottom:20px;padding:12px 16px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px;color:white;font-size:13px;">
  <span style="margin-right:16px;">📖 阅读约 <strong>${stats.readingTime}</strong> 分钟</span>
  <span style="margin-right:16px;">📝 全文 <strong>${stats.wordCount}</strong> 字</span>
  ${stats.codeBlockCount > 0 ? `<span style="margin-right:16px;">💻 ${stats.codeBlockCount} 个代码块</span>` : ''}
</div>
`
}

// ═══════════════════════════════════════════════════════════════════
// 剪贴板操作
// ═══════════════════════════════════════════════════════════════════

/**
 * 复制到剪贴板（HTML格式）
 * @param html - 要复制的 HTML 内容
 * @returns 复制是否成功
 * @throws 不抛出异常，失败时返回 false
 */
export async function copyToClipboard(html: string): Promise<boolean> {
  // 优先使用现代 Clipboard API
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([html], { type: 'text/plain' })
      })
    ])
    return true
  } catch (_primaryError) {
    // 降级方案：使用传统 execCommand（兼容旧浏览器）
    try {
      const textarea = document.createElement('textarea')
      textarea.value = html
      textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch (_fallbackError) {
      return false
    }
  }
}
