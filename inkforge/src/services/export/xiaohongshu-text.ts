/**
 * 小红书纯文本导出引擎
 *
 * 小红书平台只支持纯文本，不支持任何 HTML/CSS/Markdown 格式。
 * 本模块将 Markdown 转换为清洗后的纯文本，并自动注入轻量装饰标记。
 *
 * 参考：docs/platform-rendering-rules/xiaohongshu-rules.md
 */

import { degradeCitationsForPlainText } from '@/services/citation'
import type { XiaohongshuTextResult, XiaohongshuTextOptions } from './types'
import { parseToAST } from './renderers/ast'
import {
  buildImagePlaceholder,
  tightenParagraphs,
  xhsTextRulesTransform,
  type HashtagCandidate,
} from './platform-rules/xiaohongshu'

// ═══════════════════════════════════════════════════════════════════
// 纯文本装饰风格定义
// ═══════════════════════════════════════════════════════════════════

interface DecorationStyleConfig {
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

const DECORATION_STYLES: Record<string, DecorationStyleConfig> = {
  fresh: {
    h1: '【',
    h2: '·',
    h3: '-',
    orderedMarkers: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
    unorderedMarker: '·',
    quoteMarker: '摘录',
    divider: '━━━━━━━━━━━━━━',
    signaturePrefix: '—',
    codePrompt: '[代码]',
    imagePrompt: '[配图]',
    linkPrompt: '检索',
    tableTitle: '[表格]',
  },
  simple: {
    h1: '◆',
    h2: '◇',
    h3: '▫',
    orderedMarkers: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
    unorderedMarker: '·',
    quoteMarker: '"',
    divider: '· · · · · · · · ·',
    signaturePrefix: '—',
    codePrompt: '[]',
    imagePrompt: '▣',
    linkPrompt: '→',
    tableTitle: '▦',
  },
  warm: {
    h1: '〔',
    h2: '○',
    h3: '-',
    orderedMarkers: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'],
    unorderedMarker: '•',
    quoteMarker: '片段',
    divider: '─ · ─ · ─',
    signaturePrefix: '—',
    codePrompt: '[代码]',
    imagePrompt: '[配图]',
    linkPrompt: '查找',
    tableTitle: '[表格]',
  },
  tech: {
    h1: '[',
    h2: '>',
    h3: '-',
    orderedMarkers: ['01.', '02.', '03.', '04.', '05.', '06.', '07.', '08.', '09.', '10.'],
    unorderedMarker: '▸',
    quoteMarker: '提示',
    divider: '================',
    signaturePrefix: '--',
    codePrompt: '[代码]',
    imagePrompt: '[示意图]',
    linkPrompt: '检索',
    tableTitle: '[数据]',
  },
  nature: {
    h1: '〔',
    h2: '·',
    h3: '-',
    orderedMarkers: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
    unorderedMarker: '·',
    quoteMarker: '摘录',
    divider: '──── · ────',
    signaturePrefix: '—',
    codePrompt: '[代码]',
    imagePrompt: '[配图]',
    linkPrompt: '检索',
    tableTitle: '[表格]',
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
  // P2-T7：默认 3 行/段（旧默认 5），与 platform-rules.tightenParagraphs 一致。
  const maxLines = options?.maxLinesPerParagraph ?? 3
  const injectDecorations = options?.injectEmojis ?? true
  const generateTags = options?.generateTags ?? true
  const addSignature = options?.addSignature ?? true
  const hashtagInBody = options?.hashtagInBody ?? true
  const titleSplit = options?.titleSplit ?? true

  const decorations = DECORATION_STYLES[emojiStyle] ?? DECORATION_STYLES.fresh

  // Step 1: 预处理 — 标准化输入；脚注/引用先降级为小红书可读文本，避免控制语法泄露。
  let text = degradeCitationsForPlainText(markdown, 'xiaohongshu').trim()

  // Step 2: 处理代码块（在其他转换前，避免代码块内容被误处理）
  text = convertCodeBlocks(text, decorations)

  // Step 3: 处理表格
  text = convertTables(text, decorations)

  // Step 4: 处理 Mermaid
  text = text.replace(/```mermaid[\s\S]*?```/g, `${decorations.imagePrompt} 图表建议转为图片`)

  // Step 5: 处理 LaTeX 公式
  text = convertLatex(text)

  // Step 6: 处理标题
  text = convertHeadings(text, decorations)

  // Step 7: 处理列表
  text = convertLists(text, decorations)

  // Step 8: 处理引用块
  text = convertBlockquotes(text, decorations)

  // Step 9: 处理 GFM Alert 块
  text = convertAlertBlocks(text, decorations)

  // Step 10: 处理图片
  text = convertImages(text, decorations)

  // Step 11: 处理链接
  text = convertLinks(text, decorations)

  // Step 12: 处理水平线
  text = text.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, decorations.divider)

  // Step 13: 处理任务列表
  text = text.replace(/^- \[x\]/gm, '√')
  text = text.replace(/^- \[ \]/gm, '□')

  // Step 14: 清理 Markdown 格式标记
  text = cleanMarkdownSyntax(text)

  // Step 14.5: 段落紧凑（P2-T7 — 通过 platform-rules 共享逻辑，
  // 比内置 splitParagraphs 多保留 ordered list 整块、保留段间空行）
  text = tightenParagraphs(text, { maxLines })

  // Step 15: 自动分段（在 tightenParagraphs 之上做一次 fallback 切分，保持兼容）
  if (autoSplit) {
    text = splitParagraphs(text, maxLines)
  }

  // Step 16: emoji 密度检查和补充
  if (injectDecorations) {
    text = adjustDecorationDensity(text)
  }

  // Step 17: 添加签名（短源文本守卫：trimmed source < 30 字符时跳过，
  // 避免预览框被「— 感谢阅读」单条签名主导，生成空壳感）
  const sourceTrimmedLen = markdown.trim().length
  if (addSignature && sourceTrimmedLen >= 30) {
    const sig = options?.signatureText ?? '感谢阅读'
    text = text.trimEnd() + '\n\n' + decorations.signaturePrefix + ' ' + sig
  }

  // Step 18: 最终清理
  text = finalCleanup(text)

  // 统计
  const paragraphCount = text.split(/\n\s*\n/).filter(p => p.trim()).length
  // suggestedTags：优先复用文本提取；P2-T7 起 AST headings/images 作为补充候选源。
  const suggestedTags = generateTags ? collectSuggestedTags(markdown) : []

  // ─── P2-T7：调用 platform-rules orchestrator 补出 title/body/hashtags/imageHints ───
  const candidates: HashtagCandidate[] | undefined =
    options?.tagCandidates && options.tagCandidates.length > 0
      ? options.tagCandidates
      : undefined

  const ruleResult = xhsTextRulesTransform(
    { text, suggestedTags, paragraphs: paragraphCount },
    {
      // tighten 已在 Step 14.5 单独跑过，这里关闭避免重复处理。
      tighten: false,
      title: titleSplit ? {} : false,
      appendHashtags: hashtagInBody,
      hashtagCandidates: candidates,
      hashtagMix: { hot: options?.hotTags ?? 2, niche: options?.nicheTags ?? 2 },
    }
  )

  // 当 titleSplit && hashtagInBody 都开启时，使用 ruleResult.text 作为最终输出。
  // 否则保留旧 text（不破坏旧行为：包含签名、不抽离首行）。
  const useRuleText = titleSplit || (hashtagInBody && ruleResult.hashtags.length > 0)
  const finalText = useRuleText ? ruleResult.text : text
  const charCount = finalText.length
  const emojiCount = countDecorations(finalText)

  return {
    text: finalText,
    charCount,
    overLimit: charCount > 1000,
    paragraphCount,
    emojiCount,
    suggestedTags,
    title: ruleResult.title,
    body: ruleResult.body,
    hashtags: ruleResult.hashtags,
    imageHints: ruleResult.imageHints,
  }
}

/**
 * P2-T7 — 复用 P2-T5 AST，从 headings/images 上下文里挑选话题候选；
 * 与原 extractSuggestedTags（基于 Markdown 文本扫描）合并去重。
 */
function collectSuggestedTags(markdown: string): string[] {
  const out = new Set<string>()
  for (const t of extractSuggestedTags(markdown)) out.add(t)
  try {
    const ast = parseToAST(markdown)
    for (const h of ast.meta.headings) {
      if (h.depth > 3) continue
      const norm = normalizeTopicTagFromString(h.text)
      if (norm) out.add(norm)
    }
    for (const img of ast.meta.images) {
      const norm = img.alt ? normalizeTopicTagFromString(img.alt) : null
      if (norm) out.add(norm)
    }
  } catch {
    // AST 解析失败时降级为空，原 extractSuggestedTags 已贡献基础结果。
  }
  return Array.from(out).slice(0, 8)
}

function normalizeTopicTagFromString(raw: string): string | null {
  const cleaned = raw
    .replace(/[#＃]/g, '')
    .replace(/[，,。.!！?？:：;；、|/()[\]{}<>《》"“”'‘’`~]/g, ' ')
    .trim()
    .replace(/\s+/g, '')
  if (cleaned.length < 2 || cleaned.length > 20) return null
  return `#${cleaned}`
}

// ═══════════════════════════════════════════════════════════════════
// 转换函数
// ═══════════════════════════════════════════════════════════════════

/** 转换代码块 — 转为引用风格文本或截图提示 */
function convertCodeBlocks(text: string, decorations: DecorationStyleConfig): string {
  return text.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, lang: string, code: string) => {
      if (lang.trim().toLowerCase() === 'mermaid') {
        return `${decorations.imagePrompt} Mermaid 图表建议转为图片`
      }

      const trimmedCode = code.trim()
      // 短代码（<= 5行）保留为文本引用
      const lines = trimmedCode.split('\n')
      if (lines.length <= 5) {
        const langLabel = lang ? ` (${lang})` : ''
        return `${decorations.codePrompt} 代码片段${langLabel}:\n———————————\n${trimmedCode}\n———————————`
      }
      // 长代码建议截图
      const langLabel = lang ? ` ${lang} ` : ''
      return `${decorations.codePrompt} ${langLabel}代码较长，建议截图展示`
    }
  )
}

/** 转换行内代码 — 保留纯文本 */
function cleanInlineCode(text: string): string {
  return text.replace(/`([^`]+)`/g, '$1')
}

/** 转换表格 — 列表化描述 */
function convertTables(text: string, decorations: DecorationStyleConfig): string {
  // 匹配 Markdown 表格
  const tableRegex = /(\|[^\n]+\|\n)((?:\|[-: ]+\|[-: |\n]*\n))((?:\|[^\n]+\|\n?)*)/g

  return text.replace(tableRegex, (_match, headerRow: string, _separator: string, bodyRows: string) => {
    const headers = headerRow.split('|').map(h => h.trim()).filter(Boolean)
    const rows = bodyRows.trim().split('\n').map(row =>
      row.split('|').map(cell => cell.trim()).filter(Boolean)
    )

    let result = `${decorations.tableTitle} ${headers.join(' / ')}\n\n`

    rows.forEach((row, idx) => {
      const marker = decorations.orderedMarkers[idx] ?? `${idx + 1}.`
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
function convertHeadings(text: string, decorations: DecorationStyleConfig): string {
  // H1
  text = text.replace(/^# (.+)$/gm, `${decorations.h1} $1 】`)
  // H2
  text = text.replace(/^## (.+)$/gm, `\n${decorations.h2} $1`)
  // H3
  text = text.replace(/^### (.+)$/gm, `\n${decorations.h3} $1`)
  // H4-H6 降级为普通加粗文本
  text = text.replace(/^#{4,6} (.+)$/gm, '\n补充：$1')

  return text
}

/** 转换列表 — 逐行处理，遇到非列表行时重置有序列表计数器 */
function convertLists(text: string, decorations: DecorationStyleConfig): string {
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
        const marker = decorations.orderedMarkers[orderCounter] ?? `${orderCounter + 1}.`
        orderCounter++
        return `${marker} ${content}`
      }
      return `   ${decorations.unorderedMarker} ${content}`
    }

    // 无序列表
    const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.+)$/)
    if (unorderedMatch) {
      lastWasOrdered = false
      const indent = unorderedMatch[1]
      const content = unorderedMatch[2]
      const level = Math.floor(indent.length / 2)
      if (level === 0) {
        return `${decorations.unorderedMarker} ${content}`
      }
      return `   ${decorations.unorderedMarker} ${content}`
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
function convertBlockquotes(text: string, decorations: DecorationStyleConfig): string {
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
        result.push(`${decorations.quoteMarker}：${quoteBuffer.join(' ')}`)
        inQuote = false
        quoteBuffer = []
      }
      result.push(line)
    }
  }
  // 处理末尾引用
  if (inQuote && quoteBuffer.length > 0) {
    result.push(`${decorations.quoteMarker}：${quoteBuffer.join(' ')}`)
  }

  return result.join('\n')
}

/** 转换 GFM Alert 块 */
function convertAlertBlocks(text: string, _decorations: DecorationStyleConfig): string {
  const alertMap: Record<string, string> = {
    'NOTE': '说明',
    'TIP': '建议',
    'WARNING': '注意',
    'CAUTION': '警示',
    'IMPORTANT': '重点',
  }

  return text.replace(
    />\s*\[!(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*\n((?:>.*\n?)*)/gi,
    (_match, type: string, content: string) => {
      const label = alertMap[type.toUpperCase()] ?? '说明'
      const cleanContent = content.replace(/^>\s*/gm, '').trim()
      return `${label}：${cleanContent}`
    }
  )
}

/** 转换链接 */
function convertLinks(text: string, decorations: DecorationStyleConfig): string {
  // [text](url) → text（搜索关键词xxx）；图片语法已先转换，这里再防守跳过 ![alt](url)。
  return text.replace(
    /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, linkText: string, url: string) => {
      // 图片链接跳过
      if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i)) {
        return `${decorations.imagePrompt} ${linkText}`
      }
      return `${linkText}（${decorations.linkPrompt}关键词「${linkText}」）`
    }
  )
}

/** 转换图片 — P2-T7 起使用 platform-rules/buildImagePlaceholder（含 ratio + size 推荐） */
function convertImages(text: string, _decorations: DecorationStyleConfig): string {
  let imgIdx = 1
  return text.replace(
    /!\[([^\]]*)\]\([^)]+\)/g,
    (_match, alt: string) => {
      const label = alt || `图片${imgIdx}`
      const result = buildImagePlaceholder(label, {
        ratio: '3:4',
        size: '1080x1440',
        index: imgIdx,
      })
      imgIdx++
      return result
    }
  )
}

/** 转换 LaTeX 公式 */
function convertLatex(text: string): string {
  // 块级公式
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula: string) => {
    return `[公式] ${formula.trim()}`
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

/** 装饰密度调整 — 确保长段落有基础阅读锚点 */
function adjustDecorationDensity(text: string): string {
  const charCount = text.length
  const currentDecorations = countDecorations(text)
  const targetMin = Math.floor(charCount / 200)

  if (currentDecorations >= targetMin) {
    return text // 密度足够
  }

  // 密度不足时，在段落首添加轻量装饰
  const decorMarkers = ['·', '—', '要点：', '说明：', '提示：']
  const paragraphs = text.split(/\n\s*\n/)
  let added = 0
  const needed = targetMin - currentDecorations

  const result = paragraphs.map(para => {
    if (added >= needed) return para
    const trimmed = para.trim()
    // 跳过已有装饰开头的段落、空段落、单行短段落
    if (!trimmed || trimmed.length < 20 || hasLeadingDecoration(trimmed)) return para
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

/** 统计文本中的装饰标记数量 */
function countDecorations(text: string): number {
  const decorationPattern = /(?:^|\s)(?:【|〔|◆|◇|▫|○|▸|·|要点：|说明：|提示：|摘录：|片段：|检索关键词|查找关键词|\[代码\]|\[配图\]|\[图片\]|\[示意图\]|\[公式\]|\[表格\]|\[数据\])/gm
  const matches = text.match(decorationPattern)
  return matches ? matches.length : 0
}

/** 检测行首是否已有装饰标记 */
function hasLeadingDecoration(text: string): boolean {
  const decorationHeadPattern = /^(【|〔|◆|◇|▫|○|▸|·|要点：|说明：|提示：|- |\[代码\]|\[配图\]|\[图片\]|\[示意图\]|\[公式\])/u
  return decorationHeadPattern.test(text.trim())
}

/** 规范化小红书话题标签：平台原生形态为 #话题，不使用结尾 #。 */
function normalizeXiaohongshuTopicTag(raw: string): string | null {
  const normalized = raw
    .replace(/[#＃]/g, '')
    .replace(/[，,。.!！?？:：;；、|/()[\]{}<>《》"“”'‘’`~]/g, ' ')
    .trim()
    .replace(/\s+/g, '')

  if (normalized.length < 2 || normalized.length > 20) {
    return null
  }

  return `#${normalized}`
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
      const tag = normalizeXiaohongshuTopicTag(heading)
      if (tag) tags.add(tag)
    }
  }

  // 从加粗文本提取关键词
  const boldMatches = markdown.matchAll(/\*\*(.{2,15})\*\*/g)
  for (const match of boldMatches) {
    const keyword = match[1].trim()
    if (keyword.length >= 2 && keyword.length <= 10 && !keyword.includes('\n')) {
      const tag = normalizeXiaohongshuTopicTag(keyword)
      if (tag) tags.add(tag)
    }
  }

  // 限制标签数量
  return Array.from(tags).slice(0, 5)
}
// ═══════════════════════════════════════════════════════════════════
// 导出可用的装饰风格列表
// ═══════════════════════════════════════════════════════════════════

export interface EmojiStyleInfo {
  id: string
  name: string
  icon: string
  description: string
}

export function getAvailableEmojiStyles(): EmojiStyleInfo[] {
  return [
    { id: 'fresh', name: '清新少女', icon: 'xhs-fresh', description: '轻盈分隔，适合日常记录' },
    { id: 'simple', name: '极简高级', icon: 'xhs-simple', description: '几何层次，适合通用内容' },
    { id: 'warm', name: '温暖治愈', icon: 'xhs-warm', description: '柔和符号，适合生活方式内容' },
    { id: 'tech', name: '科技数码', icon: 'xhs-tech', description: '清晰层级，适合数码内容' },
    { id: 'nature', name: '自然清新', icon: 'xhs-nature', description: '克制清爽，适合自然类内容' },
  ]
}
