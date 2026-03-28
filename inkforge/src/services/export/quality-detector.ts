/**
 * 三平台质量检测器
 *
 * 在导出前自动检测内容是否符合目标平台的要求，
 * 返回结构化的质量报告，帮助用户优化内容。
 *
 * 参考：
 * - docs/platform-rendering-rules/wechat-rules.md
 * - docs/platform-rendering-rules/xiaohongshu-rules.md
 * - docs/platform-rendering-rules/zhihu-rules.md
 */

import type { Platform, QualityReport, QualityIssue, QualityIssueSeverity } from './types'

// ═══════════════════════════════════════════════════════════════════
// 统一入口
// ═══════════════════════════════════════════════════════════════════

/**
 * 对 Markdown 内容执行目标平台的质量检测
 *
 * @param markdown - 原始 Markdown 内容
 * @param platform - 目标平台
 * @returns 质量报告
 */
export function detectQuality(markdown: string, platform: Platform): QualityReport {
  const issues: QualityIssue[] = []

  switch (platform) {
    case 'wechat':
      detectWechatIssues(markdown, issues)
      break
    case 'xiaohongshu':
      detectXiaohongshuIssues(markdown, issues)
      break
    case 'zhihu':
      detectZhihuIssues(markdown, issues)
      break
    default: {
      const _exhaustiveCheck: never = platform
      throw new Error(`未支持的平台: ${_exhaustiveCheck}`)
    }
  }

  // 通用检测
  detectCommonIssues(markdown, platform, issues)

  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length
  const suggestions = issues.filter(i => i.severity === 'suggestion').length

  return {
    platform,
    timestamp: Date.now(),
    passed: errors === 0,
    issues,
    stats: { errors, warnings, suggestions },
  }
}

// ═══════════════════════════════════════════════════════════════════
// 微信公众号质量检测
// ═══════════════════════════════════════════════════════════════════

function detectWechatIssues(markdown: string, issues: QualityIssue[]): void {
  // 1. 检测 CSS 变量（微信不支持）
  const cssVarMatches = markdown.match(/var\(--[\w-]+\)/g)
  if (cssVarMatches) {
    addIssue(issues, {
      id: 'wechat-css-var',
      severity: 'warning',
      message: `发现 ${cssVarMatches.length} 个 CSS 变量引用，微信不支持 CSS 变量`,
      suggestion: '导出时会自动替换为实际值，确保变量值已定义',
    })
  }

  // 2. 检测 SVG 图片
  const svgMatches = markdown.match(/!\[.*?\]\([^)]*\.svg[^)]*\)/gi)
  if (svgMatches) {
    addIssue(issues, {
      id: 'wechat-svg-image',
      severity: 'warning',
      message: `发现 ${svgMatches.length} 张 SVG 图片，微信编辑器中 SVG 需使用素材库链接`,
      suggestion: '建议将 SVG 转换为 PNG/JPG 后上传微信素材库',
    })
  }

  // 3. 检测外链
  const linkMatches = markdown.match(/\[([^\]]+)\]\((https?:\/\/(?!mp\.weixin\.qq\.com)[^)]+)\)/g)
  if (linkMatches && linkMatches.length > 0) {
    addIssue(issues, {
      id: 'wechat-external-links',
      severity: 'suggestion',
      message: `发现 ${linkMatches.length} 个外部链接，非微信域名链接会触发安全提醒弹窗`,
      suggestion: '导出时会自动转为文末脚注',
    })
  }

  // 4. 检测图片宽度建议
  const imgWithSize = markdown.match(/<img[^>]+width=["'](\d+)/gi)
  if (imgWithSize) {
    for (const img of imgWithSize) {
      const widthMatch = img.match(/width=["'](\d+)/)
      if (widthMatch && parseInt(widthMatch[1]) > 640) {
        addIssue(issues, {
          id: 'wechat-image-width',
          severity: 'suggestion',
          message: `检测到图片宽度 ${widthMatch[1]}px > 640px`,
          suggestion: '微信公众号建议图片宽度 ≤ 640px',
        })
        break // 只报告一次
      }
    }
  }

  // 5. 检测 <style> 标签
  if (/<style[\s>]/i.test(markdown)) {
    addIssue(issues, {
      id: 'wechat-style-tag',
      severity: 'warning',
      message: '检测到 <style> 标签，微信会过滤掉 <style> 标签',
      suggestion: '导出时会自动内联 CSS，无需手动处理',
    })
  }

  // 6. 检测不支持的 HTML 标签
  const unsupportedTags = ['iframe', 'embed', 'object', 'form', 'input', 'button', 'select', 'audio', 'video', 'canvas', 'script']
  for (const tag of unsupportedTags) {
    const regex = new RegExp(`<${tag}[\\s>]`, 'i')
    if (regex.test(markdown)) {
      addIssue(issues, {
        id: `wechat-unsupported-tag-${tag}`,
        severity: 'warning',
        message: `检测到 <${tag}> 标签，微信不支持此标签`,
        suggestion: `移除或替换 <${tag}> 标签`,
      })
    }
  }

  // 7. 检测 Mermaid 图表
  const mermaidBlocks = markdown.match(/```mermaid/gi)
  if (mermaidBlocks) {
    addIssue(issues, {
      id: 'wechat-mermaid',
      severity: 'suggestion',
      message: `发现 ${mermaidBlocks.length} 个 Mermaid 图表`,
      suggestion: 'Mermaid 图表会被转为 SVG 嵌入，但可能存在兼容性问题，建议检查渲染效果',
    })
  }
}

// ═══════════════════════════════════════════════════════════════════
// 小红书质量检测
// ═══════════════════════════════════════════════════════════════════

function detectXiaohongshuIssues(markdown: string, issues: QualityIssue[]): void {
  // 0. 计算纯文本字数（移除 Markdown 标记后）
  const plainText = stripMarkdownSyntax(markdown)
  const charCount = plainText.length

  // 1. 字数检测（硬限制 1000 字）
  if (charCount > 1000) {
    addIssue(issues, {
      id: 'xhs-char-limit',
      severity: 'error',
      message: `正文 ${charCount} 字，超过小红书 1000 字限制（差 ${charCount - 1000} 字）`,
      suggestion: '精简内容至 600-800 字为最佳阅读体验',
    })
  } else if (charCount > 800) {
    addIssue(issues, {
      id: 'xhs-char-warning',
      severity: 'suggestion',
      message: `正文 ${charCount} 字，接近 1000 字限制`,
      suggestion: '建议控制在 600-800 字以获得最佳阅读体验',
    })
  }

  // 2. 标题检测
  const titleMatch = markdown.match(/^#\s+(.+)$/m)
  if (titleMatch) {
    const titleLength = titleMatch[1].trim().length
    if (titleLength > 20) {
      addIssue(issues, {
        id: 'xhs-title-length',
        severity: 'warning',
        message: `标题 ${titleLength} 字，超过小红书 20 字限制`,
        suggestion: '缩短标题至 10-15 字，带关键词 + emoji',
      })
    }
  }

  // 3. 段落长度检测
  const paragraphs = markdown.split(/\n\s*\n/).filter(p => p.trim())
  const longParagraphs = paragraphs.filter(p => {
    const lines = p.trim().split('\n')
    return lines.length > 5
  })
  if (longParagraphs.length > 0) {
    addIssue(issues, {
      id: 'xhs-paragraph-length',
      severity: 'warning',
      message: `${longParagraphs.length} 个段落超过 5 行`,
      suggestion: '每段控制在 5 行以内，段间加空行提升可读性',
    })
  }

  // 4. Emoji 密度检测
  const emojiCount = countEmojis(plainText)
  const emojiDensity = charCount > 0 ? emojiCount / charCount * 100 : 0
  if (emojiDensity < 0.5 && charCount > 100) {
    addIssue(issues, {
      id: 'xhs-emoji-sparse',
      severity: 'suggestion',
      message: `Emoji 密度偏低（${emojiCount} 个 / ${charCount} 字）`,
      suggestion: '建议每 100 字使用 1-2 个 emoji，导出时会自动注入',
    })
  } else if (emojiDensity > 3) {
    addIssue(issues, {
      id: 'xhs-emoji-dense',
      severity: 'suggestion',
      message: `Emoji 密度偏高（${emojiCount} 个 / ${charCount} 字）`,
      suggestion: '每 100 字不超过 3 个 emoji，避免视觉混乱',
    })
  }

  // 5. 检测不支持的元素
  if (/<[^>]+>/i.test(markdown)) {
    addIssue(issues, {
      id: 'xhs-html-tags',
      severity: 'error',
      message: '检测到 HTML 标签，小红书是纯文本平台',
      suggestion: '导出时会自动清理 HTML 标签',
    })
  }

  // 6. 检测链接
  const links = markdown.match(/\[([^\]]+)\]\([^)]+\)/g)
  if (links && links.length > 0) {
    addIssue(issues, {
      id: 'xhs-links',
      severity: 'warning',
      message: `发现 ${links.length} 个超链接，小红书不支持点击跳转`,
      suggestion: '导出时会自动转为"搜索关键词"提示',
    })
  }

  // 7. 检测表格
  if (/\|[^\n]+\|/.test(markdown) && /\|[-: ]+\|/.test(markdown)) {
    addIssue(issues, {
      id: 'xhs-table',
      severity: 'warning',
      message: '检测到 Markdown 表格，小红书不支持表格',
      suggestion: '导出时会自动转为列表化描述',
    })
  }

  // 8. 检测代码块
  const codeBlocks = markdown.match(/```[\s\S]*?```/g)
  if (codeBlocks && codeBlocks.length > 0) {
    addIssue(issues, {
      id: 'xhs-code-blocks',
      severity: 'warning',
      message: `发现 ${codeBlocks.length} 个代码块，小红书不支持代码格式`,
      suggestion: '导出时短代码会保留为文本引用，长代码建议截图',
    })
  }

  // 9. 检测 LaTeX 公式
  const latexBlocks = markdown.match(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g)
  if (latexBlocks) {
    addIssue(issues, {
      id: 'xhs-latex',
      severity: 'warning',
      message: `发现 ${latexBlocks.length} 个 LaTeX 公式，小红书不支持数学公式`,
      suggestion: '导出时会转为文字描述',
    })
  }
}

// ═══════════════════════════════════════════════════════════════════
// 知乎质量检测
// ═══════════════════════════════════════════════════════════════════

function detectZhihuIssues(markdown: string, issues: QualityIssue[]): void {
  // 1. 检测残留 HTML 标签
  const htmlTags = markdown.match(/<(?!\/?\s*(?:br|hr|img)\s*\/?)[a-zA-Z][^>]*>/g)
  if (htmlTags && htmlTags.length > 0) {
    const uniqueTags = [...new Set(htmlTags.map(t => {
      const match = t.match(/<\/?([a-zA-Z]+)/)
      return match ? match[1] : t
    }))]
    addIssue(issues, {
      id: 'zhihu-html-tags',
      severity: 'warning',
      message: `检测到 ${htmlTags.length} 个 HTML 标签（${uniqueTags.join(', ')}），知乎会过滤 HTML`,
      suggestion: '导出时会自动清理 HTML 标签，保留纯 Markdown',
    })
  }

  // 2. 检测内联样式
  if (/style="[^"]*"/i.test(markdown)) {
    addIssue(issues, {
      id: 'zhihu-inline-style',
      severity: 'warning',
      message: '检测到内联 style 属性，知乎会过滤 style',
      suggestion: '导出时会自动清理内联样式',
    })
  }

  // 3. 检测 Mermaid 图表
  const mermaidBlocks = markdown.match(/```mermaid/gi)
  if (mermaidBlocks) {
    addIssue(issues, {
      id: 'zhihu-mermaid',
      severity: 'warning',
      message: `发现 ${mermaidBlocks.length} 个 Mermaid 图表，知乎不支持 Mermaid 渲染`,
      suggestion: '建议将 Mermaid 图表截图后上传',
    })
  }

  // 4. 检测任务列表
  const taskLists = markdown.match(/^- \[([ x])\]/gm)
  if (taskLists) {
    addIssue(issues, {
      id: 'zhihu-task-list',
      severity: 'suggestion',
      message: `发现 ${taskLists.length} 个任务列表项，知乎不支持复选框`,
      suggestion: '导出时会自动转为 emoji 替代（✅ / ☐）',
    })
  }

  // 5. 检测 LaTeX 语法错误
  detectLatexErrors(markdown, issues)

  // 6. 检测 SVG 图片（知乎不支持 SVG）
  const svgImages = markdown.match(/!\[.*?\]\([^)]*\.svg[^)]*\)/gi)
  if (svgImages) {
    addIssue(issues, {
      id: 'zhihu-svg-image',
      severity: 'warning',
      message: `发现 ${svgImages.length} 张 SVG 图片，知乎不支持 SVG 格式`,
      suggestion: '将 SVG 转换为 PNG/JPG',
    })
  }

  // 7. 检测超长代码行
  const codeBlockMatches = markdown.matchAll(/```\w*\n([\s\S]*?)```/g)
  for (const match of codeBlockMatches) {
    const code = match[1]
    const longLines = code.split('\n').filter(line => line.length > 120)
    if (longLines.length > 0) {
      addIssue(issues, {
        id: 'zhihu-long-code-line',
        severity: 'suggestion',
        message: `代码块中有 ${longLines.length} 行超过 120 字符`,
        suggestion: '可能影响阅读体验，建议适当换行',
      })
      break // 只报告一次
    }
  }

  // 8. 检测 class 属性
  if (/class="[^"]*"/i.test(markdown)) {
    addIssue(issues, {
      id: 'zhihu-class-attr',
      severity: 'warning',
      message: '检测到 class 属性，知乎会过滤 class',
      suggestion: '导出时会自动清理 class 属性',
    })
  }
}

// ═══════════════════════════════════════════════════════════════════
// 通用检测
// ═══════════════════════════════════════════════════════════════════

function detectCommonIssues(markdown: string, _platform: Platform, issues: QualityIssue[]): void {
  // 1. 检测 Base64 图片
  const base64Images = markdown.match(/!\[.*?\]\(data:image\/[^)]+\)/g)
  if (base64Images) {
    addIssue(issues, {
      id: 'common-base64-image',
      severity: 'warning',
      message: `发现 ${base64Images.length} 张 Base64 内嵌图片`,
      suggestion: '大多数平台不支持 Base64 图片，建议上传至图床',
    })
  }

  // 2. 检测空内容
  const trimmed = markdown.trim()
  if (!trimmed) {
    addIssue(issues, {
      id: 'common-empty-content',
      severity: 'error',
      message: '内容为空',
      suggestion: '请输入需要导出的内容',
    })
  }

  // 3. 检测图片可访问性（外链）
  const externalImages = markdown.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/g)
  if (externalImages && externalImages.length > 5) {
    addIssue(issues, {
      id: 'common-many-images',
      severity: 'suggestion',
      message: `文章包含 ${externalImages.length} 张外链图片`,
      suggestion: '较多外链图片可能导致加载缓慢，发布后请检查图片显示',
    })
  }
}

// ═══════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════

/** 检测 LaTeX 语法错误（不匹配的 $） */
function detectLatexErrors(text: string, issues: QualityIssue[]): void {
  // 先移除代码块内容，避免误检
  const withoutCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '')

  // 检查块级 $$ 是否匹配
  const blockDelimiters = withoutCode.match(/\$\$/g)
  if (blockDelimiters && blockDelimiters.length % 2 !== 0) {
    addIssue(issues, {
      id: 'zhihu-latex-unmatched-block',
      severity: 'error',
      message: '检测到不匹配的 $$ 块级公式定界符',
      suggestion: '确保每个 $$ 都有对应的闭合 $$',
    })
  }

  // 检查行内 $ 是否匹配（粗略检查）
  const lines = withoutCode.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 跳过 $$ 行
    if (line.trim().startsWith('$$')) continue
    // 统计独立 $ 数量
    const matches = line.match(/(?<!\$)\$(?!\$)/g)
    if (matches && matches.length % 2 !== 0) {
      addIssue(issues, {
        id: 'zhihu-latex-unmatched-inline',
        severity: 'error',
        message: `第 ${i + 1} 行检测到不匹配的 $ 行内公式定界符`,
        suggestion: '确保每个 $ 都有对应的闭合 $，或使用 \\$ 转义',
        location: `Line ${i + 1}`,
      })
      break // 只报告第一个
    }
  }
}

/** 添加质量问题到列表 */
function addIssue(issues: QualityIssue[], issue: QualityIssue): void {
  issues.push(issue)
}

/** 去除 Markdown 语法标记，返回近似纯文本长度 */
function stripMarkdownSyntax(markdown: string): string {
  let text = markdown
  // 代码块
  text = text.replace(/```[\s\S]*?```/g, '')
  // 行内代码
  text = text.replace(/`[^`]+`/g, (m) => m.slice(1, -1))
  // 图片
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  // 链接
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // 标题标记
  text = text.replace(/^#{1,6}\s+/gm, '')
  // 加粗/斜体
  text = text.replace(/\*\*(.+?)\*\*/g, '$1')
  text = text.replace(/__(.+?)__/g, '$1')
  text = text.replace(/\*(.+?)\*/g, '$1')
  text = text.replace(/_(.+?)_/g, '$1')
  // 删除线
  text = text.replace(/~~(.+?)~~/g, '$1')
  // 列表标记
  text = text.replace(/^[\s]*[-*+]\s+/gm, '')
  text = text.replace(/^[\s]*\d+\.\s+/gm, '')
  // 引用
  text = text.replace(/^>\s*/gm, '')
  // 水平线
  text = text.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '')
  // 表格分隔行
  text = text.replace(/^\|[-: |]+\|$/gm, '')
  // 表格管道符
  text = text.replace(/\|/g, ' ')
  // HTML 标签
  text = text.replace(/<[^>]+>/g, '')
  // 连续空行
  text = text.replace(/\n{2,}/g, '\n')

  return text.trim()
}

/** 统计 emoji 数量 */
function countEmojis(text: string): number {
  const emojiPattern = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]|[0-9]\uFE0F?\u20E3/gu
  const matches = text.match(emojiPattern)
  return matches ? matches.length : 0
}

// ═══════════════════════════════════════════════════════════════════
// 批量检测
// ═══════════════════════════════════════════════════════════════════

/**
 * 同时对 Markdown 执行所有平台的质量检测
 * 适用于用户还没选定平台时的预览场景
 */
export function detectQualityAll(markdown: string): Record<Platform, QualityReport> {
  return {
    wechat: detectQuality(markdown, 'wechat'),
    xiaohongshu: detectQuality(markdown, 'xiaohongshu'),
    zhihu: detectQuality(markdown, 'zhihu'),
  }
}

/**
 * 快速检测：仅返回是否通过，不含详细信息
 */
export function quickCheck(markdown: string, platform: Platform): boolean {
  return detectQuality(markdown, platform).passed
}

/**
 * 获取指定严重度的问题
 */
export function filterIssues(
  report: QualityReport,
  severity: QualityIssueSeverity
): QualityIssue[] {
  return report.issues.filter(i => i.severity === severity)
}
