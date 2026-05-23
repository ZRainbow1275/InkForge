/**
 * 知乎导出引擎（HTML）
 *
 * preview-only: 知乎 web editor strips most CSS — 该 HTML 输出仅用于预览面板/导出
 * 文件，不应作为投递内容。真正发布产物由 zhihu-markdown.ts 产出 Markdown，并
 * 经 platform-rules/zhihu 完成 LaTeX→equation 图、表格降级、代码语言强制等
 * 平台合规变换。本文件不接 platform-rules transform。
 *
 * 知乎特点：知识性、严谨、专业
 *
 * 增强功能：
 * - 预设主题系统（学术论文 / 技术博客 / 深度评论）
 * - 多主题代码高亮（Mac 风格 + 语言标签）
 * - GitHub 风格 Alert 块
 * - 增强表格样式
 * - 脚注/参考链接区域
 */

import juice from 'juice'
import { marked } from 'marked'
import { renderMarkdownWithLazyOptionalEnhancements } from '@/services/rendering/lazy-optional-renderer'
import DOMPurify from 'dompurify'

// 确保 marked 配置一致性
marked.use({ breaks: true, gfm: true })
import type { ZhihuPreset, CodeTheme, ZhihuExportOptions, ExportTarget } from './types'
import {
  highlightCodeBlocks,
  convertLinksToFootnotes,
  renderAlertBlocks,
  enhanceTableStyles,
  convertTaskListCheckboxes,
  cleanEmptyParagraphs,
  limitConsecutiveBreaks
} from './utils'
import { enforcePlatformCSS } from './css-validator'
import { REDOS_PROTECTION } from '@/config/security'
import { logger } from '@/services/error'
import { PERSONA_FONTS } from './preset-fonts'
import { composeRecipes } from './preset-decorations'

// ─── PR4: per-zhihu-preset recipe composers ─────────────────────────────
const zhihuAcademicRecipesPreview = composeRecipes(['cjk-decimal-h2', 'h2-underline-fine'], { target: 'preview' })
const zhihuAcademicRecipesExport = composeRecipes(['cjk-decimal-h2', 'h2-underline-fine'], { target: 'export' })

const zhihuTechRecipesPreview = composeRecipes(['h2-underline-fine', 'h3-vertical-accent'], { target: 'preview' })
const zhihuTechRecipesExport = composeRecipes(['h2-underline-fine', 'h3-vertical-accent'], { target: 'export' })

const zhihuInsightRecipesPreview = composeRecipes(['large-quote', 'h2-underline-fine', 'pull-quote-bordered'], { target: 'preview' })
const zhihuInsightRecipesExport = composeRecipes(['large-quote', 'h2-underline-fine', 'pull-quote-bordered'], { target: 'export' })

// ═══════════════════════════════════════════════════════════════════
// 知乎预设主题
// ═══════════════════════════════════════════════════════════════════

const ZHIHU_PRESETS: ZhihuPreset[] = [
  // ZHIHU-ACADEMIC: 学术论文, 思源宋体 + EB Garamond, 第N章编号 + h2 极细底线; 学术蓝
  {
    id: 'zhihu-academic',
    name: '学术论文',
    icon: 'zhihu-academic',
    description: '学术论文，严谨蓝调',
    primaryColor: '#0066ff',
    accentColor: '#003d99',
    fontSize: '16px',
    codeTheme: 'github-dark',
    persona: 'academic',
    fonts: PERSONA_FONTS.academic,
    previewCSS: `
#zhihu-answer h2 { color: #0066ff; font-weight: 700; border-bottom: 1px solid #0066ff; padding-bottom: 0.3em; margin-bottom: 0.9em; }
#zhihu-answer h3 { color: #003d99; font-weight: 600; }
#zhihu-answer strong { color: #0066ff; }
${zhihuAcademicRecipesPreview.css}`,
    exportCSS: `
#zhihu-answer h2 { color: #0066ff; font-weight: 700; border-bottom: 1px solid #0066ff; padding-bottom: 0.3em; margin-bottom: 0.9em; }
#zhihu-answer h3 { color: #003d99; font-weight: 600; }
#zhihu-answer strong { color: #0066ff; }
${zhihuAcademicRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => zhihuAcademicRecipesExport.decorate(html, target),
  },
  // ZHIHU-TECH: 技术博客, 思源黑体 + Inter (business), h2 极细底线 + h3 竖条; 板岩黑
  {
    id: 'zhihu-tech',
    name: '技术博客',
    icon: 'zhihu-tech',
    description: '技术博客，板岩黑稳重',
    primaryColor: '#1a1a2e',
    accentColor: '#16213e',
    fontSize: '15px',
    codeTheme: 'atom-one-dark',
    persona: 'business',
    fonts: PERSONA_FONTS.business,
    previewCSS: `
#zhihu-answer h2 { color: #1a1a2e; font-weight: 700; border-bottom: 1px solid #1a1a2e; padding-bottom: 0.3em; margin-bottom: 0.9em; }
#zhihu-answer h3 { color: #1a1a2e; border-left: 2px solid #1a1a2e; padding-left: 0.6em; font-weight: 600; }
#zhihu-answer strong { color: #1a1a2e; }
#zhihu-answer code { background: rgba(26,26,46,0.08); color: #16213e; padding: 0.1em 0.35em; border-radius: 3px; }
${zhihuTechRecipesPreview.css}`,
    exportCSS: `
#zhihu-answer h2 { color: #1a1a2e; font-weight: 700; border-bottom: 1px solid #1a1a2e; padding-bottom: 0.3em; margin-bottom: 0.9em; }
#zhihu-answer h3 { color: #1a1a2e; border-left: 2px solid #1a1a2e; padding-left: 0.6em; font-weight: 600; }
#zhihu-answer strong { color: #1a1a2e; }
#zhihu-answer code { background: rgba(26,26,46,0.08); color: #16213e; padding: 0.1em 0.35em; border-radius: 3px; }
${zhihuTechRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => zhihuTechRecipesExport.decorate(html, target),
  },
  // ZHIHU-INSIGHT: 深度评论, 思源宋体 + EB Garamond, 大引号 + h2 极细底线 + 双线 pull-quote; 炭灰深沉
  {
    id: 'zhihu-insight',
    name: '深度评论',
    icon: 'zhihu-insight',
    description: '深度评论，炭灰深沉',
    primaryColor: '#2d3436',
    accentColor: '#636e72',
    fontSize: '16px',
    codeTheme: 'github-light',
    persona: 'academic',
    fonts: PERSONA_FONTS.academic,
    previewCSS: `
#zhihu-answer h2 { color: #2d3436; font-weight: 700; border-bottom: 1px solid #2d3436; padding-bottom: 0.3em; margin-bottom: 0.9em; }
#zhihu-answer h3 { color: #2d3436; font-weight: 600; }
#zhihu-answer strong { color: #2d3436; }
#zhihu-answer blockquote { border-left-color: #2d3436; background: #f7f7f7; font-style: italic; }
${zhihuInsightRecipesPreview.css}`,
    exportCSS: `
#zhihu-answer h2 { color: #2d3436; font-weight: 700; border-bottom: 1px solid #2d3436; padding-bottom: 0.3em; margin-bottom: 0.9em; }
#zhihu-answer h3 { color: #2d3436; font-weight: 600; }
#zhihu-answer strong { color: #2d3436; }
#zhihu-answer blockquote { border-left-color: #2d3436; background: #f7f7f7; font-style: italic; }
${zhihuInsightRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => zhihuInsightRecipesExport.decorate(html, target),
  },
]

// ═══════════════════════════════════════════════════════════════════
// 知乎基础样式生成（预设感知）
// ═══════════════════════════════════════════════════════════════════

/**
 * 根据预设生成知乎基础 CSS
 */
function generateZhihuCSS(preset: ZhihuPreset): string {
  const { primaryColor, fontSize } = preset

  return `
/* 知乎基础样式 - 预设: ${preset.name} */
#zhihu-answer {
  font-size: ${fontSize || '16px'};
  line-height: 1.8;
  color: #333;
  padding: 20px 0;
  word-break: break-word;
  text-align: justify;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
}

#zhihu-answer p {
  margin: 0 0 1em 0;
  letter-spacing: 0.5px;
}

#zhihu-answer h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 32px 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid ${primaryColor};
}

#zhihu-answer h2 {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 28px 0 16px 0;
  padding-left: 12px;
  border-left: 4px solid ${primaryColor};
}

#zhihu-answer h3 {
  font-size: 18px;
  font-weight: 600;
  color: ${primaryColor};
  margin: 24px 0 12px 0;
}

#zhihu-answer h4 {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 20px 0 8px 0;
}

#zhihu-answer strong {
  font-weight: 600;
  color: ${primaryColor};
}

#zhihu-answer em {
  font-style: italic;
}

#zhihu-answer blockquote {
  margin: 20px 0;
  padding: 16px 20px;
  border-left: 4px solid ${primaryColor};
  background: #f7f8fa;
  border-radius: 0 6px 6px 0;
  color: #555;
  font-style: italic;
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
  line-height: 1.8;
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
  font-size: 14px;
  line-height: 1.6;
}

#zhihu-answer a {
  color: ${primaryColor};
  text-decoration: none;
}

#zhihu-answer img {
  max-width: 100%;
  height: auto;
  margin: 20px 0;
}

#zhihu-answer table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

#zhihu-answer th {
  padding: 12px 16px;
  background: #f6f6f6;
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
  border: 1px solid #e0e0e0;
  text-align: left;
}

#zhihu-answer td {
  padding: 12px 16px;
  font-size: 15px;
  border: 1px solid #e0e0e0;
  color: #333;
}

#zhihu-answer tr:nth-child(even) td {
  background: #fafafa;
}

#zhihu-answer hr {
  border: none;
  border-top: 1px solid #ebebeb;
  margin: 28px 0;
}

#zhihu-answer sup {
  font-size: 12px;
  color: ${primaryColor};
  vertical-align: super;
  line-height: 0;
}

#zhihu-answer h5 {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 16px 0 8px 0;
}

#zhihu-answer h6 {
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin: 12px 0 8px 0;
}

#zhihu-answer del, #zhihu-answer s {
  text-decoration: line-through;
  color: #999;
}

#zhihu-answer mark {
  background: #fff3b0;
  padding: 2px 4px;
  border-radius: 3px;
}

#zhihu-answer sub {
  font-size: 12px;
  vertical-align: sub;
  line-height: 0;
}
`
}

/**
 * 向后兼容：导出静态 CSS（使用默认学术论文预设）
 */
export const zhihuBaseCSS = generateZhihuCSS(ZHIHU_PRESETS[0])

// ═══════════════════════════════════════════════════════════════════
// 知乎后处理
// ═══════════════════════════════════════════════════════════════════

/**
 * 知乎后处理
 * 增强：表格边框修补、图片尺寸、清理
 */
function postProcessForZhihu(html: string): string {
  let result = html

  // 1. 移除不支持的属性
  result = result.replace(/position:\s*(fixed|sticky)[^;]*;?/gi, '')
  result = result.replace(/animation:[^;]+;?/gi, '')
  result = result.replace(/transition:[^;]+;?/gi, '')

  // 2. 图片确保宽度
  result = result.replace(
    /<img(?![^>]*max-width)([^>]*)>/gi,
    '<img style="max-width:100%;height:auto;"$1>'
  )

  // 3. 表格单元格确保有内联边框（juice 可能不完整内联到 th/td）
  result = result.replace(
    /<th(?![^>]*border)([^>]*)>/gi,
    (match, attrs) => {
      if (attrs.includes('style=')) {
        return match.replace(/style="([^"]*)"/, `style="$1;border:1px solid #e0e0e0;padding:12px 16px;background:#f6f6f6;font-weight:600;"`)
      }
      return `<th style="border:1px solid #e0e0e0;padding:12px 16px;background:#f6f6f6;font-weight:600;text-align:left;"${attrs}>`
    }
  )
  result = result.replace(
    /<td(?![^>]*border)([^>]*)>/gi,
    (match, attrs) => {
      if (attrs.includes('style=')) {
        return match.replace(/style="([^"]*)"/, `style="$1;border:1px solid #e0e0e0;padding:12px 16px;"`)
      }
      return `<td style="border:1px solid #e0e0e0;padding:12px 16px;"${attrs}>`
    }
  )

  // 4. 表格确保宽度
  result = result.replace(
    /<table(?![^>]*width)([^>]*)>/gi,
    (match, attrs) => {
      if (attrs.includes('style=')) {
        return match.replace(/style="([^"]*)"/, `style="$1;width:100%;border-collapse:collapse;"`)
      }
      return `<table style="width:100%;border-collapse:collapse;"${attrs}>`
    }
  )

  // 5. 清理空 style 和多余分号
  result = result.replace(/style="\s*;*\s*"/gi, '')
  result = result.replace(/;\s*;+/g, ';')

  return result
}

// ═══════════════════════════════════════════════════════════════════
// 知乎脚注区域（学术引用风格）
// ═══════════════════════════════════════════════════════════════════

/**
 * 生成知乎学术风格脚注区域
 * 使用 [1], [2] 编号格式
 */
function buildZhihuFootnoteSection(
  footnotes: Array<{ title: string; href: string }>,
  primaryColor: string
): string {
  if (footnotes.length === 0) return ''

  let section = `
<section style="margin-top:32px;padding-top:20px;border-top:2px solid ${primaryColor};">
  <h4 style="font-size:16px;font-weight:700;color:${primaryColor};margin-bottom:16px;letter-spacing:0.5px;">参考链接</h4>
  <div style="font-size:13px;color:#555;line-height:2;">`

  footnotes.forEach((fn, index) => {
    section += `
    <p style="margin:6px 0;word-break:break-all;">
      <span style="color:${primaryColor};font-weight:600;">[${index + 1}]</span> ${fn.title}: <span style="color:#888;">${fn.href}</span>
    </p>`
  })

  section += `
  </div>
</section>`

  return section
}

// ═══════════════════════════════════════════════════════════════════
// 主要导出函数
// ═══════════════════════════════════════════════════════════════════

/**
 * HTML 转知乎格式
 *
 * @param html - 输入 HTML
 * @param presetId - 预设主题 ID（默认 'zhihu-academic'）
 * @param options - 可选增强配置
 */
export function convertToZhihu(
  html: string,
  presetId?: string,
  options?: ZhihuExportOptions
): string {
  // ReDoS 防护: 输入长度检查
  if (html.length > REDOS_PROTECTION.MAX_HTML_LENGTH) {
    logger.warn(
      `[安全警告] convertToZhihu: 输入长度 ${html.length} 超过限制 ${REDOS_PROTECTION.MAX_HTML_LENGTH}，跳过处理`
    )
    return html
  }

  // 查找预设，默认使用学术论文预设
  let preset = ZHIHU_PRESETS.find(p => p.id === presetId) || ZHIHU_PRESETS[0]
  // 应用颜色覆盖（克隆预设，不修改原始对象）
  if (options?.colorOverrides?.primaryColor) {
    preset = { ...preset, primaryColor: options.colorOverrides.primaryColor, accentColor: options.colorOverrides.primaryColor }
  }

  // 解构选项，设置默认值
  const {
    enableCiteStatus = true,
    enableCodeHighlight = true,
    enableAlertBlocks = true,
    enableEnhancedTable = true,
    codeTheme,
  } = options ?? {}

  // 确定代码主题：显式传入 > 预设配置 > 默认 github-dark
  const resolvedCodeTheme: CodeTheme = codeTheme ?? preset.codeTheme ?? 'github-dark'

  // Step 0: Task List Checkbox 转换（必须在 DOMPurify 之前）
  const checkboxProcessedHtml = convertTaskListCheckboxes(html, preset.primaryColor)

  // Step 1: DOMPurify XSS防护
  const sanitizedHtml = DOMPurify.sanitize(checkboxProcessedHtml, {
    ALLOWED_TAGS: [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'u', 's', 'del', 'ins',
      'a', 'img', 'br', 'hr',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div', 'section', 'sup', 'sub', 'mark'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target']
  })

  // Step 1.5: 空段落清理和连续换行限制
  const cleanedHtml = limitConsecutiveBreaks(cleanEmptyParagraphs(sanitizedHtml))

  // Step 2: GitHub 风格 Alert 块渲染
  let processedHtml = cleanedHtml
  if (enableAlertBlocks) {
    processedHtml = renderAlertBlocks(processedHtml)
  }

  // Step 3: 代码高亮（启用 Mac 风格 + 语言标签）
  if (enableCodeHighlight) {
    processedHtml = highlightCodeBlocks(
      processedHtml,
      false,           // enableLineNumbers
      true,            // enableMacCodeBlock
      resolvedCodeTheme,
      true             // enableLanguageLabel
    )
  }

  // Step 4: 增强表格样式
  if (enableEnhancedTable) {
    processedHtml = enhanceTableStyles(processedHtml, preset.primaryColor)
  }

  // Step 5: 外链转脚注（知乎支持链接，但也生成参考链接区域）
  let footnoteHtml = ''
  if (enableCiteStatus) {
    const { html: linkedHtml, footnotes } = convertLinksToFootnotes(processedHtml)
    processedHtml = linkedHtml
    footnoteHtml = buildZhihuFootnoteSection(footnotes, preset.primaryColor)
  }

  // Step 6: 构建最终内容
  const wrappedHtml = `<section id="zhihu-answer">${processedHtml}${footnoteHtml}</section>`

  // Step 7: CSS内联
  let css = generateZhihuCSS(preset)
  // PR4: append preset-specific exportCSS so dual-track recipes (h2 lines,
  // h3 accents, etc.) end up in the inlined style attributes.
  if (preset.exportCSS) {
    css += '\n' + preset.exportCSS
  }
  const styledHtml = `<style>${css}</style>${wrappedHtml}`
  let inlinedHtml = juice(styledHtml, {
    removeStyleTags: true,
    preserveImportant: true,
    inlinePseudoElements: true
  })

  // Step 7.5: PR4 dual-track decorate hook — inject real <span> for
  // pseudo-element-only effects (cjk-decimal-h2, large-quote, ornament-hr).
  if (preset.decorate) {
    inlinedHtml = preset.decorate(inlinedHtml, 'zhihu')
  }

  // Step 8: 知乎兼容性后处理
  const zhihuProcessedHtml = postProcessForZhihu(inlinedHtml)

  // Step 9: 最终安全网 -- 平台 CSS 合规化（确保无遗漏的不支持属性）
  return enforcePlatformCSS(zhihuProcessedHtml, 'zhihu')
}

/**
 * Markdown 转知乎格式
 */
export async function markdownToZhihu(
  markdown: string,
  presetId?: string,
  options?: {
    enableCiteStatus?: boolean
    enableCodeHighlight?: boolean
    enableAlertBlocks?: boolean
    enableEnhancedTable?: boolean
    codeTheme?: CodeTheme
  }
): Promise<string> {
  const html = await renderMarkdownWithLazyOptionalEnhancements(markdown)
  return convertToZhihu(html, presetId, options)
}

// ═══════════════════════════════════════════════════════════════════
// 预设查询
// ═══════════════════════════════════════════════════════════════════

/**
 * 获取知乎预设列表
 */
export function getZhihuPresets(): ZhihuPreset[] {
  return ZHIHU_PRESETS
}
