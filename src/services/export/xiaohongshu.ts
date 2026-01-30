/**
 * 小红书导出引擎
 * 小红书笔记特点：清新、年轻、图文混排、emoji 友好
 */

import juice from 'juice'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { XiaohongshuPreset } from './types'

// ═══════════════════════════════════════════════════════════════════
// 小红书基础样式
// ═══════════════════════════════════════════════════════════════════

export const xiaohongshuBaseCSS = `
/* 小红书基础样式 */
#xhs-note {
  font-size: 15px;
  line-height: 2;
  color: #333;
  padding: 16px;
  word-break: break-word;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif;
}

#xhs-note p {
  margin: 0 0 16px 0;
  padding: 0;
  line-height: 2;
}

#xhs-note h1 {
  font-size: 22px;
  font-weight: 700;
  color: #222;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

#xhs-note h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 24px 0 12px 0;
  line-height: 1.5;
}

#xhs-note h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 20px 0 10px 0;
  line-height: 1.5;
}

#xhs-note strong {
  font-weight: 700;
  color: #FF2442;
}

#xhs-note em {
  font-style: italic;
  color: #666;
}

#xhs-note blockquote {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 3px solid #FF2442;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFF0F0 100%);
  border-radius: 0 8px 8px 0;
  color: #666;
}

#xhs-note blockquote p {
  margin: 0;
}

#xhs-note ul, #xhs-note ol {
  margin: 16px 0;
  padding-left: 20px;
}

#xhs-note li {
  margin-bottom: 8px;
  line-height: 1.8;
}

#xhs-note ul li::marker {
  color: #FF2442;
}

#xhs-note code {
  font-family: "SF Mono", Monaco, Consolas, monospace;
  font-size: 13px;
  background: #FFF5F5;
  padding: 2px 6px;
  border-radius: 4px;
  color: #FF2442;
}

#xhs-note pre {
  margin: 16px 0;
  padding: 16px;
  background: #2D2D2D;
  border-radius: 12px;
  overflow-x: auto;
}

#xhs-note pre code {
  background: transparent;
  color: #F8F8F2;
  padding: 0;
  font-size: 13px;
  line-height: 1.6;
}

#xhs-note a {
  color: #FF2442;
  text-decoration: none;
  border-bottom: 1px dashed #FF2442;
}

#xhs-note img {
  max-width: 100%;
  height: auto;
  margin: 16px 0;
  border-radius: 12px;
}

#xhs-note hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, #FFE4E6, transparent);
  margin: 24px 0;
}

/* 小红书特色：分割符 */
#xhs-note .xhs-divider {
  text-align: center;
  margin: 24px 0;
  color: #FF2442;
  font-size: 14px;
}
`

// ═══════════════════════════════════════════════════════════════════
// 小红书预设主题
// ═══════════════════════════════════════════════════════════════════

export const xiaohongshuPresets: XiaohongshuPreset[] = [
  {
    id: 'xhs-fresh',
    name: '清新少女',
    icon: '🌸',
    primaryColor: '#FF2442',
    accentColor: '#FFE4E6',
    customCSS: `
      #xhs-note h2::before { content: "💕 "; }
      #xhs-note strong { background: linear-gradient(180deg, transparent 60%, #FFE4E6 60%); }
    `
  },
  {
    id: 'xhs-simple',
    name: '极简高级',
    icon: '✨',
    primaryColor: '#1A1A1A',
    accentColor: '#F5F5F5',
    customCSS: `
      #xhs-note { background: #FAFAFA; }
      #xhs-note strong { color: #1A1A1A; font-weight: 900; }
      #xhs-note blockquote { border-left-color: #1A1A1A; background: #F5F5F5; }
    `
  },
  {
    id: 'xhs-warm',
    name: '温暖治愈',
    icon: '🧸',
    primaryColor: '#D4A574',
    accentColor: '#FDF6EC',
    customCSS: `
      #xhs-note { background: #FFFDF9; }
      #xhs-note strong { color: #D4A574; }
      #xhs-note blockquote { border-left-color: #D4A574; background: #FDF6EC; }
    `
  }
]

// ═══════════════════════════════════════════════════════════════════
// 小红书后处理
// ═══════════════════════════════════════════════════════════════════

/**
 * 小红书后处理
 */
function postProcessForXiaohongshu(html: string): string {
  let result = html

  // 1. 移除不支持的属性
  result = result.replace(/position:\s*(fixed|sticky)[^;]*;?/gi, '')
  result = result.replace(/animation:[^;]+;?/gi, '')
  result = result.replace(/transition:[^;]+;?/gi, '')

  // 2. 图片确保有圆角
  result = result.replace(
    /<img(?![^>]*border-radius)([^>]*)>/gi,
    '<img style="border-radius:12px;max-width:100%;"$1>'
  )

  // 3. 清理空 style
  result = result.replace(/style="\s*"/gi, '')

  return result
}

// ═══════════════════════════════════════════════════════════════════
// 主要导出函数
// ═══════════════════════════════════════════════════════════════════

/**
 * HTML 转小红书格式
 */
export function convertToXiaohongshu(
  html: string,
  presetId: string = 'xhs-fresh'
): string {
  const preset = xiaohongshuPresets.find(p => p.id === presetId) || xiaohongshuPresets[0]

  // Step 1: DOMPurify XSS防护
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'h1', 'h2', 'h3', 'h4',
      'strong', 'em', 'u', 's',
      'a', 'img', 'br', 'hr',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'span', 'div'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style']
  })

  // Step 2: 添加小红书特色分隔符
  let processedHtml = sanitizedHtml
    .replace(/<hr\s*\/?>/gi, '<div class="xhs-divider">· · · ✦ · · ·</div>')

  // Step 3: 外链处理（小红书不支持外链，转为显示文本）
  processedHtml = processedHtml.replace(
    /<a\s+[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi,
    '<span style="color:#FF2442">$2</span>'
  )

  // Step 4: 构建最终内容
  const wrappedHtml = `<section id="xhs-note">${processedHtml}</section>`

  // Step 5: 生成CSS
  let css = xiaohongshuBaseCSS
  css += `
    #xhs-note strong { color: ${preset.primaryColor}; }
    #xhs-note a { color: ${preset.primaryColor}; border-bottom-color: ${preset.primaryColor}; }
    #xhs-note blockquote { border-left-color: ${preset.primaryColor}; }
    #xhs-note code { color: ${preset.primaryColor}; background: ${preset.accentColor}; }
  `
  if (preset.customCSS) {
    css += preset.customCSS
  }

  // Step 6: CSS内联
  const styledHtml = `<style>${css}</style>${wrappedHtml}`
  const inlinedHtml = juice(styledHtml, {
    removeStyleTags: true,
    preserveImportant: true
  })

  // Step 7: 小红书兼容性后处理
  return postProcessForXiaohongshu(inlinedHtml)
}

/**
 * Markdown 转小红书格式
 */
export async function markdownToXiaohongshu(
  markdown: string,
  presetId: string = 'xhs-fresh'
): Promise<string> {
  const html = await marked.parse(markdown)
  return convertToXiaohongshu(html, presetId)
}
