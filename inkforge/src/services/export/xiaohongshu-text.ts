/**
 * 小红书纯文本导出引擎
 *
 * 小红书平台以纯文本为主，不支持 HTML/CSS/Markdown 格式。
 * 本模块将 Markdown 转换为清洗后的纯文本，并自动注入短文本装饰标记。
 *
 * 参考：docs/platform-rendering-rules/xiaohongshu-rules.md
 */

import type { XiaohongshuTextResult, XiaohongshuTextOptions } from './types'

// ═══════════════════════════════════════════════════════════════════
// Emoji 风格定义
// ═══════════════════════════════════════════════════════════════════

interface EmojiStyleConfig {
  /** H1 前缀 */
  h1: string
  /** H2 前缀 */
  h2: string
  /** H3+ 前缀 */
  h3: string
  /** 有序列表序号 */
  orderedMarkers: string[]
  /** 无序列表标记 */
  unorderedMarker: string
  /** 引用块标记 */
  quoteMarker: string
  /** 分隔线 */
  divider: string
  /** 签名前缀 */
  signaturePrefix: string
  /** 代码块提示 */
  codePrompt: string
  /** 图片提示 */
  imagePrompt: string
  /** 链接提示 */
  linkPrompt: string
  /** 表格标题 */
  tableTitle: string
}

const EMOJI_STYLES: Record<string, EmojiStyleConfig> = {
  fresh: {
    h1: '花',
    h2: '柔',
    h3: '轻',
    orderedMarkers: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
    unorderedMarker: '·',
    quoteMarker: '引',
    divider: '━━━━━━━━━━━━━━',
    signaturePrefix: '花',
    codePrompt: '代码',
    imagePrompt: '图片',
    linkPrompt: '链接',
    tableTitle: '表格',
  },
  simple: {
    h1: '◆',
    h2: '◇',
    h3: '▫',
    orderedMarkers: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
    unorderedMarker: '·',
    quoteMarker: '引',
    divider: '· · · · · · · · ·',
    signaturePrefix: '简',
    codePrompt: '代码',
    imagePrompt: '图片',
    linkPrompt: '链接',
    tableTitle: '表格',
  },
  warm: {
    h1: '暖',
    h2: '柔',
    h3: '醇',
    orderedMarkers: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
    unorderedMarker: '·',
    quoteMarker: '想',
    divider: '· · · · ·',
    signaturePrefix: '暖',
    codePrompt: '记录',
    imagePrompt: '配图',
    linkPrompt: '链接',
    tableTitle: '清单',
  },
  tech: {
    h1: '技',
    h2: '数',
    h3: '序',
    orderedMarkers: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
    unorderedMarker: '▪',
    quoteMarker: '注',
    divider: '▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪',
    signaturePrefix: '技',
    codePrompt: '代码',
    imagePrompt: '截图',
    linkPrompt: '链接',
    tableTitle: '表格',
  },
  nature: {
    h1: '森',
    h2: '叶',
    h3: '青',
    orderedMarkers: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
    unorderedMarker: '·',
    quoteMarker: '引',
    divider: '· · · 森 · · ·',
    signaturePrefix: '森',
    codePrompt: '记录',
    imagePrompt: '图片',
    linkPrompt: '链接',
    tableTitle: '清单',
  },
}

// ═══════════════════════════════════════════════════════════════════
// Markdown → 纯文本转换核心
// ═══════════════════════════════════════════════════════════════════

/**
 * 将 Markdown 转换为小红书纯文本格式
 *
 * 转换规则参考 docs/platform-rendering-rules/xiaohongshu-rules.md
 */
export function markdownToXiaohongshuText(
  markdown: string,
  options?: XiaohongshuTextOptions
): XiaohongshuTextResult {
  // 空输入守卫：避免空 markdown 生成带签名的非空输出
  if (!markdown || !markdown.trim()) {
    return {
      text: '',
      charCount: 0,
      overLimit: false,
      paragraphCount: 0,
      emojiCount: 0,
      suggestedTags: [],
    }
  }

  const emojiStyle = options?.emojiStyle ?? 'fresh'
  const autoSplit = options?.autoSplitParagraphs ?? true
  const maxLines = options?.maxLinesPerParagraph ?? 5
  const injectEmojis = options?.injectEmojis ?? true
  const generateTags = options?.generateTags ?? true
  const addSignature = options?.addSignature ?? true

  const emojis = EMOJI_STYLES[emojiStyle] ?? EMOJI_STYLES.fresh

  // Step 1: 预处理 — 标准化输入
  let text = markdown.trim()

  // Step 2: 处理代码块（在其他转换前，避免代码块内容被误处理）
  text = convertCodeBlocks(text, emojis)

  // Step 3: 处理表格
  text = convertTables(text, emojis)

  // Step 4: 处理 Mermaid
  text = text.replace(/```mermaid[\s\S]*?```/g, `${emojis.imagePrompt} [图表见图片]`)

  // Step 5: 处理 LaTeX 公式
  text = convertLatex(text)

  // Step 6: 处理标题
  text = convertHeadings(text, emojis)

  // Step 7: 处理列表
  text = convertLists(text, emojis)

  // Step 8: 处理引用块
  text = convertBlockquotes(text, emojis)

  // Step 9: 处理 GFM Alert 块
  text = convertAlertBlocks(text, emojis)

  // Step 10: 处理链接
  text = convertLinks(text, emojis)

  // Step 11: 处理图片
  text = convertImages(text, emojis)

  // Step 12: 处理水平线
  text = text.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, emojis.divider)

  // Step 13: 处理任务列表
  text = text.replace(/^- \[x\]/gm, '已完成')
  text = text.replace(/^- \[ \]/gm, '待办')

  // Step 14: 清理 Markdown 格式标记
  text = cleanMarkdownSyntax(text)

  // Step 15: 自动分段
  if (autoSplit) {
    text = splitParagraphs(text, maxLines)
  }

  // Step 16: 装饰标记密度检查和补充
  if (injectEmojis) {
    text = adjustDecorDensity(text)
  }

  // Step 17: 添加签名
  if (addSignature) {
    const sig = options?.signatureText ?? '感谢阅读'
    text = text.trimEnd() + '\n\n' + emojis.signaturePrefix + ' ' + sig + ' ' + emojis.signaturePrefix
  }

  // Step 18: 最终清理
  text = finalCleanup(text)

  // 统计
  const charCount = text.length
  const decorationCount = countDecorMarkers(text)
  const paragraphCount = text.split(/\n\s*\n/).filter(p => p.trim()).length
  const suggestedTags = generateTags ? extractSuggestedTags(markdown) : []

  return {
    text,
    charCount,
    overLimit: charCount > 1000,
    paragraphCount,
    emojiCount: decorationCount,
    suggestedTags,
  }
}

// ═══════════════════════════════════════════════════════════════════
// 转换函数
// ═══════════════════════════════════════════════════════════════════

/** 转换代码块 — 转为引用风格文本或截图提示 */
function convertCodeBlocks(text: string, emojis: EmojiStyleConfig): string {
  return text.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, lang: string, code: string) => {
      const trimmedCode = code.trim()
      // 短代码（<= 5行）保留为文本引用
      const lines = trimmedCode.split('\n')
      if (lines.length <= 5) {
        const langLabel = lang ? ` (${lang})` : ''
        return `${emojis.codePrompt} 代码片段${langLabel}:\n———————————\n${trimmedCode}\n———————————`
      }
      // 长代码建议截图
      const langLabel = lang ? ` ${lang} ` : ''
      return `${emojis.codePrompt} ${langLabel}代码较长，建议截图展示`
    }
  )
}

/** 转换行内代码 — 保留纯文本 */
function cleanInlineCode(text: string): string {
  return text.replace(/`([^`]+)`/g, '$1')
}

/** 转换表格 — 列表化描述 */
function convertTables(text: string, emojis: EmojiStyleConfig): string {
  // 匹配 Markdown 表格
  const tableRegex = /(\|[^\n]+\|\n)((?:\|[-: ]+\|[-: |\n]*\n))((?:\|[^\n]+\|\n?)*)/g

  return text.replace(tableRegex, (_match, headerRow: string, _separator: string, bodyRows: string) => {
    const headers = headerRow.split('|').map(h => h.trim()).filter(Boolean)
    const rows = bodyRows.trim().split('\n').map(row =>
      row.split('|').map(cell => cell.trim()).filter(Boolean)
    )

    let result = `${emojis.tableTitle} ${headers.join(' / ')}\n\n`

    rows.forEach((row, idx) => {
      const marker = emojis.orderedMarkers[idx] ?? `${idx + 1}.`
      result += `${marker} `
      headers.forEach((header, colIdx) => {
        if (colIdx > 0) result += '\n'
        const prefix = colIdx === 0 ? '' : `   ${header}：`
        result += `${prefix}${row[colIdx] ?? ''}`
      })
      result += '\n\n'
    })

    return result.trimEnd() + '\n'
  })
}

/** 转换标题 */
function convertHeadings(text: string, emojis: EmojiStyleConfig): string {
  // H1
  text = text.replace(/^# (.+)$/gm, `${emojis.h1} $1`)
  // H2
  text = text.replace(/^## (.+)$/gm, `\n${emojis.h2} $1`)
  // H3
  text = text.replace(/^### (.+)$/gm, `\n${emojis.h3} $1`)
  // H4-H6 降级为普通加粗文本
  text = text.replace(/^#{4,6} (.+)$/gm, '\n重点 $1')

  return text
}

/** 转换列表 — 逐行处理，遇到非列表行时重置有序列表计数器 */
function convertLists(text: string, emojis: EmojiStyleConfig): string {
  const lines = text.split('\n')
  let orderCounter = 0
  let lastWasOrdered = false

  const result = lines.map(line => {
    // 有序列表
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/)
    if (orderedMatch) {
      const indent = orderedMatch[1]
      const content = orderedMatch[2]
      const level = Math.floor(indent.length / 2)
      if (!lastWasOrdered) {
        orderCounter = 0 // 新列表，重置计数器
      }
      lastWasOrdered = true
      if (level === 0) {
        const marker = emojis.orderedMarkers[orderCounter] ?? `${orderCounter + 1}.`
        orderCounter++
        return `${marker} ${content}`
      }
      return `   ${emojis.unorderedMarker} ${content}`
    }

    // 无序列表
    const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.+)$/)
    if (unorderedMatch) {
      lastWasOrdered = false
      const indent = unorderedMatch[1]
      const content = unorderedMatch[2]
      const level = Math.floor(indent.length / 2)
      if (level === 0) {
        return `${emojis.unorderedMarker} ${content}`
      }
      return `   ${emojis.unorderedMarker} ${content}`
    }

    // 非列表行：重置有序计数器
    if (line.trim() !== '') {
      lastWasOrdered = false
    }
    return line
  })

  return result.join('\n')
}

/** 转换引用块 */
function convertBlockquotes(text: string, emojis: EmojiStyleConfig): string {
  // 多行引用合并
  const lines = text.split('\n')
  const result: string[] = []
  let inQuote = false
  let quoteBuffer: string[] = []

  for (const line of lines) {
    const quoteMatch = line.match(/^>\s*(.*)$/)
    if (quoteMatch) {
      if (!inQuote) {
        inQuote = true
        quoteBuffer = []
      }
      const content = quoteMatch[1].trim()
      if (content) quoteBuffer.push(content)
    } else {
      if (inQuote) {
        result.push(`${emojis.quoteMarker} ${quoteBuffer.join(' ')}`)
        inQuote = false
        quoteBuffer = []
      }
      result.push(line)
    }
  }
  // 处理末尾引用
  if (inQuote && quoteBuffer.length > 0) {
    result.push(`${emojis.quoteMarker} ${quoteBuffer.join(' ')}`)
  }

  return result.join('\n')
}

/** 转换 GFM Alert 块 */
function convertAlertBlocks(text: string, _emojis: EmojiStyleConfig): string {
  const alertMap: Record<string, string> = {
    'NOTE': '笔记',
    'TIP': '提示',
    'WARNING': '警示',
    'CAUTION': '注意',
    'IMPORTANT': '重点',
  }

  return text.replace(
    />\s*\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*\n((?:>.*\n?)*)/gi,
    (_match, type: string, content: string) => {
      const emoji = alertMap[type.toUpperCase()] ?? '重点'
      const cleanContent = content.replace(/^>\s*/gm, '').trim()
      return `${emoji} ${cleanContent}`
    }
  )
}

/** 转换链接 */
function convertLinks(text: string, emojis: EmojiStyleConfig): string {
  // [text](url) → text（搜索关键词xxx）
  return text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, linkText: string, url: string) => {
      // 图片链接跳过
      if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i)) {
        return `${emojis.imagePrompt} ${linkText}`
      }
      return `${linkText}（${emojis.linkPrompt} 搜索关键词「${linkText}」）`
    }
  )
}

/** 转换图片 */
function convertImages(text: string, emojis: EmojiStyleConfig): string {
  let imgIdx = 1
  return text.replace(
    /!\[([^\]]*)\]\([^)]+\)/g,
    (_match, alt: string) => {
      const label = alt || `图片${imgIdx}`
      const result = `${emojis.imagePrompt} 见${label}`
      imgIdx++
      return result
    }
  )
}

/** 转换 LaTeX 公式 */
function convertLatex(text: string): string {
  // 块级公式
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula: string) => {
    return `公式：${formula.trim()}`
  })
  // 行内公式
  text = text.replace(/\$([^$\n]+)\$/g, '$1')
  return text
}

/** 清理 Markdown 语法标记 */
function cleanMarkdownSyntax(text: string): string {
  // 行内代码
  text = cleanInlineCode(text)
  // 删除线
  text = text.replace(/~~(.+?)~~/g, '$1')
  // 加粗
  text = text.replace(/\*\*(.+?)\*\*/g, '$1')
  text = text.replace(/__(.+?)__/g, '$1')
  // 斜体
  text = text.replace(/\*(.+?)\*/g, '$1')
  text = text.replace(/_(.+?)_/g, '$1')
  // HTML 标签
  text = text.replace(/<[^>]+>/g, '')
  // HTML 实体
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&nbsp;/g, ' ')

  return text
}

/** 段落分割 — 确保每段不超过 maxLines 行 */
function splitParagraphs(text: string, maxLines: number): string {
  const paragraphs = text.split(/\n\s*\n/)
  const result: string[] = []

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    const lines = trimmed.split('\n')
    if (lines.length <= maxLines) {
      result.push(trimmed)
      continue
    }

    // 按 maxLines 分割
    for (let i = 0; i < lines.length; i += maxLines) {
      const chunk = lines.slice(i, i + maxLines).join('\n')
      if (chunk.trim()) {
        result.push(chunk)
      }
    }
  }

  return result.join('\n\n')
}

/** 装饰标记密度调整 — 确保长文本具备足够的视觉锚点 */
function adjustDecorDensity(text: string): string {
  const charCount = text.length
  const currentMarkers = countDecorMarkers(text)
  const targetMin = Math.floor(charCount / 200)

  if (currentMarkers >= targetMin) {
    return text // 密度足够
  }

  // 密度不足时，在段落首添加装饰标记
  const decorMarkers = ['重点', '提示', '摘要', '亮点', '脉络', '笔记']
  const paragraphs = text.split(/\n\s*\n/)
  let added = 0
  const needed = targetMin - currentMarkers

  const result = paragraphs.map(para => {
    if (added >= needed) return para
    const trimmed = para.trim()
    const hasStructuredPrefix = /^(?:\d+\.\s|[▪·]\s|已完成\s|待办\s)/.test(trimmed)
    // 跳过已有装饰标记开头的段落、空段落、单行短段落
    if (!trimmed || trimmed.length < 20 || hasStructuredPrefix || hasLeadingDecorMarker(trimmed)) return para
    added++
    const marker = decorMarkers[(added - 1) % decorMarkers.length]
    return marker + ' ' + trimmed
  })

  return result.join('\n\n')
}

/** 最终清理 */
function finalCleanup(text: string): string {
  // 移除连续空行（最多保留1个空行）
  text = text.replace(/\n{3,}/g, '\n\n')
  // 移除行尾空格
  text = text.replace(/[ \t]+$/gm, '')
  // 移除文首空行
  text = text.replace(/^\n+/, '')
  return text.trim()
}

// ═══════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const DECORATION_TOKENS = Array.from(
  new Set(
    Object.values(EMOJI_STYLES).flatMap(style => [
      style.h1,
      style.h2,
      style.h3,
      style.quoteMarker,
      style.signaturePrefix,
      style.codePrompt,
      style.imagePrompt,
      style.linkPrompt,
      style.tableTitle,
    ])
  )
).concat(['重点', '提示', '笔记', '警示', '注意', '公式', '摘要', '亮点', '脉络'])

const DECORATION_PATTERN_SOURCE = DECORATION_TOKENS
  .filter(token => token.trim().length > 0)
  .sort((left, right) => right.length - left.length)
  .map(escapeRegex)
  .join('|')

const DECORATION_TOKEN_PATTERN = new RegExp(`(?:^|\\s)(?:${DECORATION_PATTERN_SOURCE})(?=\\s)`, 'gu')
const LEADING_DECORATION_PATTERN = new RegExp(`^(?:${DECORATION_PATTERN_SOURCE})(?=\\s)`, 'u')

/** 统计文本中的装饰标记数量 */
function countDecorMarkers(text: string): number {
  return Array.from(text.matchAll(DECORATION_TOKEN_PATTERN)).length
}

/** 检测行首是否已有装饰标记 */
function hasLeadingDecorMarker(text: string): boolean {
  return LEADING_DECORATION_PATTERN.test(text.trim())
}

/** 从 Markdown 内容提取话题标签建议 */
function extractSuggestedTags(markdown: string): string[] {
  const tags: Set<string> = new Set()

  // 从标题中提取关键词
  const headingMatches = markdown.matchAll(/^#{1,3}\s+(.+)$/gm)
  for (const match of headingMatches) {
    const heading = match[1].trim()
    // 短标题直接作为标签
    if (heading.length <= 10) {
      tags.add(`#${heading}#`)
    }
  }

  // 从加粗文本提取关键词
  const boldMatches = markdown.matchAll(/\*\*(.{2,15})\*\*/g)
  for (const match of boldMatches) {
    const keyword = match[1].trim()
    if (keyword.length >= 2 && keyword.length <= 10 && !keyword.includes('\n')) {
      tags.add(`#${keyword}#`)
    }
  }

  // 限制标签数量
  return Array.from(tags).slice(0, 5)
}

// ═══════════════════════════════════════════════════════════════════
// 导出可用的 emoji 风格列表
// ═══════════════════════════════════════════════════════════════════

export interface EmojiStyleInfo {
  id: string
  name: string
  icon: string
  description: string
}

export function getAvailableEmojiStyles(): EmojiStyleInfo[] {
  return [
    { id: 'fresh', name: '清新少女', icon: '花', description: '花感前缀，清爽柔和' },
    { id: 'simple', name: '极简高级', icon: '简', description: '极简标记，干净克制' },
    { id: 'warm', name: '温暖治愈', icon: '暖', description: '暖色语气，适合生活内容' },
    { id: 'tech', name: '科技数码', icon: '技', description: '科技感前缀，适合数码内容' },
    { id: 'nature', name: '自然清新', icon: '森', description: '自然语汇，适合清新主题' },
  ]
}
