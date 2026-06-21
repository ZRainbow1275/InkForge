import type { PresetPersona } from '@/types'
import {
  circle,
  darkSafeBg,
  hairlineRule,
  rect,
  svgSection,
  textLine,
} from './primitives'
import { buildThemeContext } from './theme'
import type { SvgThemeContext } from './types'
import { assertWechatSafe } from './wechat-safe'

export type XhsMarkdownCardSliceKind = 'cover' | 'section' | 'code'

export interface XhsMarkdownCardSlice {
  page: number
  kind: XhsMarkdownCardSliceKind
  title: string
  subtitle?: string
  lines: readonly string[]
  language?: string
  sourceLineStart: number
  sourceLineEnd: number
  overflow: boolean
  bodyReference: number
}

export interface XhsMarkdownCardSlicerOptions {
  title?: string
  subtitle?: string
  includeCover?: boolean
  maxPages?: number
  maxLinesPerCard?: number
  maxCharsPerLine?: number
}

export interface XhsMarkdownCardSlicerResult {
  sourceTitle: string
  slices: readonly XhsMarkdownCardSlice[]
  bodyReferences: readonly number[]
  overflow: boolean
}

export interface XhsMarkdownCardSliceRenderOptions {
  primaryColor?: string
  persona?: PresetPersona
  theme?: SvgThemeContext
}

export interface XhsMarkdownCardSliceManifestInput {
  page: number
  fileName: string
  src: string
  referencedByBody: true
  cropStatus: 'ok'
}

interface PendingSlice {
  kind: Exclude<XhsMarkdownCardSliceKind, 'cover'>
  title: string
  lines: string[]
  language?: string
  sourceLineStart: number
  sourceLineEnd: number
}

const CARD_VIEWBOX_WIDTH = 1080
const CARD_VIEWBOX_HEIGHT = 1440
const DEFAULT_MAX_PAGES = 18
const DEFAULT_MAX_LINES = 8
const DEFAULT_MAX_CHARS = 22
const DEFAULT_PRIMARY_COLOR = '#3b7a6b'
const DEFAULT_PERSONA: PresetPersona = 'business'
const SAFE_FONT_SANS = "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
const SAFE_FONT_MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', monospace"

const MANUAL_PAGE_BREAK_RE =
  /^\s*(?:<!--\s*xhs-page-break\s*-->|-{3,}\s*xhs\s*-{3,}|\/\/\s*xhs-page-break)\s*$/i
const FENCE_RE = /^\s*```([a-z0-9_-]+)?\s*$/i

export function sliceMarkdownToXhsCards(
  markdown: string,
  options: XhsMarkdownCardSlicerOptions = {},
): XhsMarkdownCardSlicerResult {
  const maxPages = Math.max(1, Math.floor(options.maxPages ?? DEFAULT_MAX_PAGES))
  const maxLinesPerCard = Math.max(3, Math.floor(options.maxLinesPerCard ?? DEFAULT_MAX_LINES))
  const maxCharsPerLine = Math.max(8, Math.floor(options.maxCharsPerLine ?? DEFAULT_MAX_CHARS))
  const includeCover = options.includeCover !== false
  const sourceLines = String(markdown ?? '').replace(/\r\n/g, '\n').split('\n')
  const sourceTitle = options.title?.trim() || findFirstHeading(sourceLines, 1) || '小红书卡片'
  const pending: PendingSlice[] = []
  let current: PendingSlice | null = null
  let inFence: { language?: string; startLine: number; lines: string[] } | null = null

  const flushCurrent = (endLine: number) => {
    if (!current) return
    if (current.lines.length === 0) {
      current = null
      return
    }
    pending.push({
      ...current,
      sourceLineEnd: Math.max(current.sourceLineEnd, endLine),
    })
    current = null
  }

  const ensureCurrent = (lineNumber: number): PendingSlice => {
    if (current) return current
    current = {
      kind: 'section',
      title: sourceTitle,
      lines: [],
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber,
    }
    return current
  }

  for (const [index, rawLine] of sourceLines.entries()) {
    const lineNumber = index + 1
    const fenceMatch = FENCE_RE.exec(rawLine)

    if (inFence) {
      if (fenceMatch) {
        flushCurrent(lineNumber - 1)
        pending.push({
          kind: 'code',
          title: inFence.language ? `代码卡片 / ${inFence.language}` : '代码卡片',
          lines: normalizeCodeLines(inFence.lines, Math.max(34, maxCharsPerLine + 14)),
          language: inFence.language,
          sourceLineStart: inFence.startLine,
          sourceLineEnd: lineNumber,
        })
        inFence = null
        continue
      }
      inFence.lines.push(rawLine)
      continue
    }

    if (fenceMatch) {
      flushCurrent(lineNumber - 1)
      inFence = {
        language: fenceMatch[1]?.trim() || undefined,
        startLine: lineNumber,
        lines: [],
      }
      continue
    }

    if (MANUAL_PAGE_BREAK_RE.test(rawLine)) {
      flushCurrent(lineNumber - 1)
      continue
    }

    const heading = parseHeading(rawLine)
    if (heading?.level === 1) continue
    if (heading && heading.level <= 2) {
      flushCurrent(lineNumber - 1)
      current = {
        kind: 'section',
        title: heading.text || sourceTitle,
        lines: [],
        sourceLineStart: lineNumber,
        sourceLineEnd: lineNumber,
      }
      continue
    }

    const normalized = normalizeMarkdownLine(rawLine)
    if (!normalized) {
      flushCurrent(lineNumber - 1)
      continue
    }

    const target = ensureCurrent(lineNumber)
    target.lines.push(...wrapTextLine(normalized, maxCharsPerLine))
    target.sourceLineEnd = lineNumber
  }

  if (inFence) {
    pending.push({
      kind: 'code',
      title: inFence.language ? `代码卡片 / ${inFence.language}` : '代码卡片',
      lines: normalizeCodeLines(inFence.lines, Math.max(34, maxCharsPerLine + 14)),
      language: inFence.language,
      sourceLineStart: inFence.startLine,
      sourceLineEnd: sourceLines.length,
    })
  }
  flushCurrent(sourceLines.length)

  const slices: XhsMarkdownCardSlice[] = []
  if (includeCover) {
    slices.push({
      page: 1,
      kind: 'cover',
      title: sourceTitle,
      subtitle: options.subtitle?.trim() || 'Markdown carousel',
      lines: ['H2 sections', 'manual page breaks', 'lists', 'code cards'],
      sourceLineStart: 1,
      sourceLineEnd: Math.max(1, sourceLines.length),
      overflow: false,
      bodyReference: 1,
    })
  }

  for (const item of pending) {
    const chunks = chunkLines(item.lines.length > 0 ? item.lines : ['内容待补充'], maxLinesPerCard)
    for (const [chunkIndex, chunk] of chunks.entries()) {
      slices.push({
        page: slices.length + 1,
        kind: item.kind,
        title: chunks.length > 1 ? `${item.title} ${chunkIndex + 1}/${chunks.length}` : item.title,
        lines: chunk,
        language: item.language,
        sourceLineStart: item.sourceLineStart,
        sourceLineEnd: item.sourceLineEnd,
        overflow: false,
        bodyReference: slices.length + 1,
      })
    }
  }

  if (slices.length === 0) {
    slices.push({
      page: 1,
      kind: 'section',
      title: sourceTitle,
      lines: ['内容待补充'],
      sourceLineStart: 1,
      sourceLineEnd: 1,
      overflow: false,
      bodyReference: 1,
    })
  }

  const overflow = slices.length > maxPages
  const limitedSlices = slices.slice(0, maxPages).map(slice => ({
    ...slice,
    overflow: overflow || slice.overflow,
  }))

  return {
    sourceTitle,
    slices: limitedSlices,
    bodyReferences: limitedSlices.map(slice => slice.bodyReference),
    overflow,
  }
}

export function renderXhsMarkdownCardSliceSvg(
  slice: XhsMarkdownCardSlice,
  options: XhsMarkdownCardSliceRenderOptions = {},
): string {
  const theme = options.theme ?? buildThemeContext({
    primaryColor: options.primaryColor ?? DEFAULT_PRIMARY_COLOR,
    persona: options.persona ?? DEFAULT_PERSONA,
    target: 'xhs',
  })
  const { palette } = theme
  const isCover = slice.kind === 'cover'
  const bodyTop = isCover ? 520 : 420
  const lineHeight = slice.kind === 'code' ? 58 : 66
  const titleLines = wrapTextLine(slice.title, isCover ? 10 : 12).slice(0, isCover ? 3 : 2)
  const titleSize = isCover ? 92 : 78
  const titleStartY = isCover ? 300 : 260
  const contentLines = slice.lines.slice(0, isCover ? 6 : 10)

  const titleNodes = titleLines.map((line, index) =>
    textLine({
      x: 96,
      y: titleStartY + index * (titleSize + 18),
      text: line,
      fill: isCover ? palette.paper : palette.ink,
      fontSize: titleSize,
      fontWeight: 800,
      fontFamily: SAFE_FONT_SANS,
      letterSpacing: 1,
    }),
  ).join('')
  const lineNodes = contentLines.map((line, index) => {
    const y = bodyTop + index * lineHeight
    if (slice.kind === 'code') {
      return textLine({
        x: 136,
        y,
        text: line,
        fill: palette.ink,
        fontSize: 34,
        fontWeight: 500,
        fontFamily: SAFE_FONT_MONO,
      })
    }
    const marker = isCover
      ? rect({ x: 96, y: y - 28, width: 18, height: 18, rx: 4, ry: 4, fill: palette.paper, opacity: 0.82 })
      : circle({ cx: 106, cy: y - 12, r: 7, fill: palette.accent })
    return marker + textLine({
      x: 136,
      y,
      text: stripListMarker(line),
      fill: isCover ? palette.paper : palette.ink,
      fontSize: isCover ? 38 : 40,
      fontWeight: 500,
      fontFamily: SAFE_FONT_SANS,
    })
  }).join('')
  const pageText = String(slice.page).padStart(2, '0')
  const subtitle = slice.subtitle || getSliceKindLabel(slice.kind)
  const body =
    darkSafeBg(CARD_VIEWBOX_WIDTH, CARD_VIEWBOX_HEIGHT, isCover ? palette.accentDeep : palette.paperWarm) +
    rect({ x: 0, y: 0, width: 18, height: CARD_VIEWBOX_HEIGHT, fill: palette.accent }) +
    rect({
      x: 72,
      y: 72,
      width: CARD_VIEWBOX_WIDTH - 144,
      height: CARD_VIEWBOX_HEIGHT - 144,
      rx: 36,
      ry: 36,
      fill: isCover ? 'rgba(255, 255, 255, 0.08)' : palette.paper,
      stroke: isCover ? 'rgba(255, 255, 255, 0.28)' : palette.hairline,
      strokeWidth: 2,
    }) +
    textLine({
      x: 96,
      y: 158,
      text: 'INKFORGE XHS CARD',
      fill: isCover ? palette.paper : palette.accent,
      fontSize: 28,
      fontWeight: 700,
      fontFamily: SAFE_FONT_SANS,
      letterSpacing: 5,
      opacity: isCover ? 0.76 : 1,
    }) +
    textLine({
      x: CARD_VIEWBOX_WIDTH - 96,
      y: 158,
      text: pageText,
      fill: isCover ? palette.paper : palette.inkSoft,
      fontSize: 52,
      fontWeight: 800,
      fontFamily: SAFE_FONT_SANS,
      anchor: 'end',
      opacity: isCover ? 0.9 : 1,
    }) +
    titleNodes +
    textLine({
      x: 96,
      y: isCover ? 468 : 372,
      text: subtitle,
      fill: isCover ? palette.paper : palette.inkSoft,
      fontSize: 34,
      fontWeight: 500,
      fontFamily: SAFE_FONT_SANS,
      opacity: isCover ? 0.82 : 1,
    }) +
    (slice.kind === 'code'
      ? rect({
          x: 108,
          y: bodyTop - 54,
          width: CARD_VIEWBOX_WIDTH - 216,
          height: Math.max(250, contentLines.length * lineHeight + 44),
          rx: 22,
          ry: 22,
          fill: palette.accentSoft,
          stroke: palette.accentBorder,
          strokeWidth: 1,
        })
      : '') +
    lineNodes +
    hairlineRule({
      x: 96,
      y: CARD_VIEWBOX_HEIGHT - 174,
      width: CARD_VIEWBOX_WIDTH - 192,
      fill: isCover ? palette.paper : palette.hairline,
      opacity: isCover ? 0.32 : 1,
    }) +
    textLine({
      x: 96,
      y: CARD_VIEWBOX_HEIGHT - 112,
      text: slice.overflow ? 'overflow needs split before publish' : `source lines ${slice.sourceLineStart}-${slice.sourceLineEnd}`,
      fill: isCover ? palette.paper : palette.inkSoft,
      fontSize: 26,
      fontWeight: 500,
      fontFamily: SAFE_FONT_SANS,
      opacity: isCover ? 0.7 : 1,
    })

  const out = svgSection({
    moduleId: 'xhs-markdown-card-slicer',
    viewBoxW: CARD_VIEWBOX_WIDTH,
    viewBoxH: CARD_VIEWBOX_HEIGHT,
    body,
    sectionStyle: 'margin:0;',
  })
  assertWechatSafe(out)
  return out
}

export function createXhsMarkdownCardSliceManifestInputs(
  slices: readonly XhsMarkdownCardSlice[],
  options: { fileNamePrefix?: string; srcPrefix?: string } = {},
): XhsMarkdownCardSliceManifestInput[] {
  const fileNamePrefix = options.fileNamePrefix ?? 'xhs-markdown-card'
  const srcPrefix = options.srcPrefix ?? 'inkforge-asset://xhs-markdown-card'
  return slices.map(slice => ({
    page: slice.page,
    fileName: `${fileNamePrefix}-${String(slice.page).padStart(2, '0')}.png`,
    src: `${srcPrefix}-${String(slice.page).padStart(2, '0')}`,
    referencedByBody: true,
    cropStatus: 'ok',
  }))
}

function parseHeading(rawLine: string): { level: number; text: string } | null {
  const match = /^(#{1,6})\s+(.+?)\s*$/.exec(rawLine)
  if (!match) return null
  return {
    level: match[1].length,
    text: normalizeInlineMarkdown(match[2]),
  }
}

function findFirstHeading(lines: readonly string[], level: number): string | null {
  for (const line of lines) {
    const heading = parseHeading(line)
    if (heading?.level === level && heading.text) return heading.text
  }
  return null
}

function normalizeMarkdownLine(rawLine: string): string {
  const trimmed = rawLine.trim()
  if (!trimmed) return ''
  if (/^\|.*\|$/.test(trimmed)) return normalizeInlineMarkdown(trimmed.replace(/\|/g, ' / '))
  if (/^[-*_]{3,}$/.test(trimmed)) return ''
  return normalizeInlineMarkdown(trimmed
    .replace(/^>\s*/, '')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/, '- '))
}

function normalizeInlineMarkdown(input: string): string {
  return input
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '图：$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCodeLines(lines: readonly string[], maxCharsPerLine: number): string[] {
  const normalized = lines
    .map(line => line.replace(/\t/g, '  ').trimEnd())
    .filter(line => line.trim().length > 0)
    .flatMap(line => wrapTextLine(line, maxCharsPerLine + 4))
  return normalized.length > 0 ? normalized : ['// empty code block']
}

function wrapTextLine(input: string, maxCharsPerLine: number): string[] {
  const text = String(input ?? '').trim()
  if (!text) return []
  const chars = Array.from(text)
  const lines: string[] = []
  for (let index = 0; index < chars.length; index += maxCharsPerLine) {
    lines.push(chars.slice(index, index + maxCharsPerLine).join(''))
  }
  return lines
}

function chunkLines(lines: readonly string[], size: number): string[][] {
  const chunks: string[][] = []
  for (let index = 0; index < lines.length; index += size) {
    chunks.push([...lines.slice(index, index + size)])
  }
  return chunks.length > 0 ? chunks : [['内容待补充']]
}

function stripListMarker(line: string): string {
  return line.replace(/^-\s+/, '')
}

function getSliceKindLabel(kind: XhsMarkdownCardSliceKind): string {
  if (kind === 'cover') return 'Markdown carousel'
  if (kind === 'code') return 'Code card'
  return 'Section card'
}
