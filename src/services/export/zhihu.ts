/**
 * 知乎导出引擎
 * 知乎特点：知识性、严谨、专业
 */

import juice from 'juice'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { highlightCodeBlocks } from './utils'

// ═══════════════════════════════════════════════════════════════════
// 知乎基础样式
// ═══════════════════════════════════════════════════════════════════

export const zhihuBaseCSS = `
/* 知乎基础样式 */
#zhihu-answer {
  font-size: 16px;
  line-height: 1.8;
  color: #1a1a1a;
  padding: 20px 0;
  word-break: break-word;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
}

#zhihu-answer p {
  margin: 0 0 20px 0;
  text-align: justify;
}

#zhihu-answer h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 28px 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebebeb;
}

#zhihu-answer h3 {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 24px 0 12px 0;
}

#zhihu-answer strong {
  font-weight: 600;
  color: #0066ff;
}

#zhihu-answer blockquote {
  margin: 20px 0;
  padding: 16px 20px;
  border-left: 4px solid #0066ff;
  background: #f6f6f6;
  color: #646464;
}

#zhihu-answer blockquote p {
  margin: 0;
}

#zhihu-answer ul, #zhihu-answer ol {
  margin: 20px 0;
  padding-left: 28px;
}

#zhihu-answer li {
  margin-bottom: 10px;
}

#zhihu-answer code {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 14px;
  background: #f6f6f6;
  padding: 2px 6px;
  border-radius: 3px;
  color: #c7254e;
}

#zhihu-answer pre {
  margin: 20px 0;
  padding: 16px;
  background: #1e1e1e;
  border-radius: 4px;
  overflow-x: auto;
}

#zhihu-answer pre code {
  background: transparent;
  color: #d4d4d4;
  padding: 0;
}

#zhihu-answer a {
  color: #0066ff;
  text-decoration: none;
}

#zhihu-answer a:hover {
  text-decoration: underline;
}

#zhihu-answer img {
  max-width: 100%;
  height: auto;
  margin: 20px 0;
}

#zhihu-answer hr {
  border: none;
  border-top: 1px solid #ebebeb;
  margin: 28px 0;
}
`

// ═══════════════════════════════════════════════════════════════════
// 知乎后处理
// ═══════════════════════════════════════════════════════════════════

/**
 * 知乎后处理
 */
function postProcessForZhihu(html: string): string {
  let result = html

  // 1. 移除不支持的属性
  result = result.replace(/position:\s*(fixed|sticky)[^;]*;?/gi, '')

  // 2. 图片确保宽度
  result = result.replace(
    /<img(?![^>]*max-width)([^>]*)>/gi,
    '<img style="max-width:100%;height:auto;"$1>'
  )

  // 3. 清理空 style
  result = result.replace(/style="\s*"/gi, '')

  return result
}

// ═══════════════════════════════════════════════════════════════════
// 主要导出函数
// ═══════════════════════════════════════════════════════════════════

/**
 * HTML 转知乎格式
 */
export function convertToZhihu(html: string): string {
  // Step 1: DOMPurify XSS防护
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'u', 's', 'del',
      'a', 'img', 'br', 'hr',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div', 'sup', 'sub'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target']
  })

  // Step 2: 代码高亮（复用主高亮函数，禁用行号）
  const highlightedHtml = highlightCodeBlocks(sanitizedHtml, false)

  // Step 3: 构建最终内容
  const wrappedHtml = `<section id="zhihu-answer">${highlightedHtml}</section>`

  // Step 4: CSS内联
  const styledHtml = `<style>${zhihuBaseCSS}</style>${wrappedHtml}`
  const inlinedHtml = juice(styledHtml, {
    removeStyleTags: true,
    preserveImportant: true
  })

  // Step 5: 知乎兼容性后处理
  return postProcessForZhihu(inlinedHtml)
}

/**
 * Markdown 转知乎格式
 */
export async function markdownToZhihu(markdown: string): Promise<string> {
  const html = await marked.parse(markdown)
  return convertToZhihu(html)
}
