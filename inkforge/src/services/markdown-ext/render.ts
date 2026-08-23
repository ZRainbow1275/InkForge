import { marked } from 'marked'
import {
  createCitationRenderState,
  createFootnoteRenderState,
  extractFootnoteDefinitions as extractCitationFootnoteDefinitions,
  getOrderedFootnoteIds,
  renderBibliographySection,
  renderFootnoteBacklinks,
  replaceCitationClustersInText,
  replaceFootnoteReferencesInText,
  type CitationMarkdownRenderOptions,
  type CitationRenderState,
  type FootnoteRenderState,
} from '@/services/citation'
import { parseWikiLink, renderWikiLinkLabel } from '@/services/wiki-link'
import { renderWritingComponentSource } from '@/services/writing-components'
import type { MarkdownHeading } from './types'

type TocOptions = { depth: number; numbered: boolean }
type RenderContext = { footnotes: FootnoteRenderState; citations: CitationRenderState }
type HeadingWithLevel = MarkdownHeading & { source: string }

const DEFAULT_TOC_DEPTH = 3
export const CJK_EMPHASIS_BOUNDARY = '\u00A0\uE000\u00A0'
const HIGHLIGHT_COLORS: Record<string, string> = {
  default: 'yellow',
  yellow: 'yellow',
  green: 'green',
  blue: 'blue',
  pink: 'pink',
  purple: 'purple',
  orange: 'orange',
  red: 'red',
  gray: 'gray',
}
const KNOWN_EMOJI_SHORTCODES = new Set([
  '+1', '-1', 'clap', 'heart', 'heart_eyes', 'joy', 'ok_hand', 'rocket',
  'smile', 'smiley', 'sparkles', 'star', 'tada', 'thinking', 'thumbsup',
])

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;')
}
type MarkdownFence = { marker: '`' | '~'; length: number }
function readFence(line: string): (MarkdownFence & { tail: string }) | null {
  const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
  if (!match) return null
  return { marker: match[1][0] as '`' | '~', length: match[1].length, tail: match[2] }
}
function transitionFence(line: string, current: MarkdownFence | null): {
  boundary: boolean
  fence: MarkdownFence | null
} {
  const candidate = readFence(line)
  if (!candidate) return { boundary: false, fence: current }
  if (!current) {
    return { boundary: true, fence: { marker: candidate.marker, length: candidate.length } }
  }
  const closes = candidate.marker === current.marker
    && candidate.length >= current.length
    && /^[\t ]*$/.test(candidate.tail)
  return closes ? { boundary: true, fence: null } : { boundary: false, fence: current }
}
function mapNonFenceLines(markdown: string, mapper: (line: string) => string): string {
  const lines = markdown.split('\n')
  let fence: MarkdownFence | null = null
  return lines.map((line) => {
    const transition = transitionFence(line, fence)
    fence = transition.fence
    if (transition.boundary || fence) return line
    return mapper(line)
  }).join('\n')
}
function splitInlineCode(line: string): Array<{ value: string; code: boolean }> {
  const segments: Array<{ value: string; code: boolean }> = []
  let plainStart = 0
  let searchCursor = 0
  while (searchCursor < line.length) {
    const opener = line.indexOf('`', searchCursor)
    if (opener < 0) break
    let openerEnd = opener
    while (line[openerEnd] === '`') openerEnd += 1
    const delimiterLength = openerEnd - opener
    let searchFrom = openerEnd
    let closerEnd = -1
    while (searchFrom < line.length) {
      const closer = line.indexOf('`', searchFrom)
      if (closer < 0) break
      let runEnd = closer
      while (line[runEnd] === '`') runEnd += 1
      if (runEnd - closer === delimiterLength) {
        closerEnd = runEnd
        break
      }
      searchFrom = runEnd
    }
    if (closerEnd < 0) {
      searchCursor = openerEnd
      continue
    }
    if (opener > plainStart) segments.push({ value: line.slice(plainStart, opener), code: false })
    segments.push({ value: line.slice(opener, closerEnd), code: true })
    plainStart = closerEnd
    searchCursor = closerEnd
  }
  if (plainStart < line.length) segments.push({ value: line.slice(plainStart), code: false })
  return segments.length > 0 ? segments : [{ value: line, code: false }]
}
function appendCjkEmphasisBoundary(value: string, pattern: RegExp): string {
  return value.replace(pattern, match => `${match}${CJK_EMPHASIS_BOUNDARY}`)
}
export function normalizeCjkAdjacentEmphasis(markdown: string): string {
  return mapNonFenceLines(markdown, line => splitInlineCode(line)
    .map((segment) => {
      if (segment.code) return segment.value

      return [
        /(?<![\\*])\*\*\*(?!\*)(?:[^*\n]*?[\p{P}\p{S}])\*\*\*(?!\*)(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])/gu,
        /(?<![\\*])\*\*(?!\*)(?:[^*\n]*?[\p{P}\p{S}])\*\*(?!\*)(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])/gu,
        /(?<![\\*])\*(?!\*)(?:[^*\n]*?[\p{P}\p{S}])\*(?!\*)(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])/gu,
      ].reduce(appendCjkEmphasisBoundary, segment.value)
    })
    .join(''))
}
function stripMarkdownForText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~#>=[\](){}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
function createSlug(value: string, used: Map<string, number>): string {
  const normalized = value.normalize('NFKD').toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  const base = normalized || 'section'
  const count = used.get(base) ?? 0
  used.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}
function parseHeadingLine(line: string): { level: number; text: string } | null {
  const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
  return match ? { level: match[1].length, text: match[2].trim() } : null
}
function collectHeadings(markdown: string): HeadingWithLevel[] {
  const usedSlugs = new Map<string, number>()
  const headings: HeadingWithLevel[] = []
  let fence: MarkdownFence | null = null
  markdown.split('\n').forEach((line) => {
    const transition = transitionFence(line, fence)
    fence = transition.fence
    if (transition.boundary || fence) return
    const heading = parseHeadingLine(line)
    if (!heading) return
    const text = stripMarkdownForText(heading.text)
    headings.push({ level: heading.level, text, slug: createSlug(text, usedSlugs), source: heading.text })
  })
  return headings
}
function parseTocOptions(line: string): TocOptions | null {
  const match = /^\s*\[toc(?:\s+([^\]]+))?\]\s*$/i.exec(line)
  if (!match) return null
  const raw = match[1] ?? ''
  const depthMatch = /(?:^|\s)depth=(\d)(?:\s|$)/i.exec(raw)
  const numberedMatch = /(?:^|\s)numbered=(true|false)(?:\s|$)/i.exec(raw)
  const parsedDepth = depthMatch ? Number(depthMatch[1]) : DEFAULT_TOC_DEPTH
  return {
    depth: parsedDepth >= 2 && parsedDepth <= 6 ? parsedDepth : DEFAULT_TOC_DEPTH,
    numbered: numberedMatch ? numberedMatch[1].toLowerCase() === 'true' : false,
  }
}
function renderTocList(headings: MarkdownHeading[], minLevel: number): string {
  return `<ol class="ink-toc__list">${headings.map((heading) => {
    const offset = Math.max(0, heading.level - minLevel)
    const style = offset > 0 ? ` style="--ink-toc-depth:${offset}"` : ''
    return `<li class="ink-toc__item ink-toc__item--h${heading.level}"${style}><a href="#${escapeAttribute(heading.slug)}">${escapeHtml(heading.text)}</a></li>`
  }).join('')}</ol>`
}
function renderToc(headings: MarkdownHeading[], options: TocOptions): string {
  const visibleHeadings = headings.filter((heading) => heading.level <= options.depth)
  if (visibleHeadings.length === 0) {
    return '<nav class="ink-toc ink-toc--empty" data-max-depth="3" data-numbered="false"><p>No headings found.</p></nav>'
  }
  const minLevel = Math.min(...visibleHeadings.map((heading) => heading.level))
  return `<nav class="ink-toc" data-max-depth="${options.depth}" data-numbered="${String(options.numbered)}" aria-label="Document table of contents">${renderTocList(visibleHeadings, minLevel)}</nav>`
}
async function renderInlineMarkdown(value: string): Promise<string> {
  const html = await marked.parseInline(value, { breaks: true, gfm: true })
  return typeof html === 'string' ? html : String(html)
}
async function renderBlockMarkdown(value: string): Promise<string> {
  const html = await marked.parse(value, { breaks: true, gfm: true })
  return typeof html === 'string' ? html : String(html)
}

function normalizeHighlightColor(rawColor: string): { className: string; style: string; dataColor: string } {
  const lower = rawColor.toLowerCase()
  const paletteColor = HIGHLIGHT_COLORS[lower]
  if (paletteColor) {
    return { className: `ink-highlight ink-highlight--${paletteColor}`, style: '', dataColor: paletteColor }
  }
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(rawColor)) {
    const color = rawColor.toUpperCase()
    return { className: 'ink-highlight ink-highlight--custom', style: ` style="--ink-highlight-color:${escapeAttribute(color)}"`, dataColor: color }
  }
  return { className: 'ink-highlight ink-highlight--yellow', style: '', dataColor: 'yellow' }
}
function replaceHighlights(value: string): string {
  return value.replace(/==([^=\n]+?)==/g, (_match, rawContent: string) => {
    const colorMatch = /^color:([A-Za-z]+|#[0-9A-Fa-f]{3,6})\s+([\s\S]+)$/.exec(rawContent.trim())
    const color = colorMatch ? normalizeHighlightColor(colorMatch[1]) : normalizeHighlightColor('yellow')
    const text = colorMatch ? colorMatch[2] : rawContent
    return `<mark class="${color.className}" data-highlight-color="${escapeAttribute(color.dataColor)}"${color.style}>${escapeHtml(text)}</mark>`
  })
}
function replaceEmojiShortcodes(value: string): string {
  return value.replace(/:([a-z0-9_+-]+):/gi, (match, name: string) => {
    const normalized = name.toLowerCase()
    if (!KNOWN_EMOJI_SHORTCODES.has(normalized)) return match
    return `<span class="ink-emoji ink-emoji--shortcode" data-emoji-name="${escapeAttribute(normalized)}" aria-label="Emoji shortcode ${escapeAttribute(normalized)}">:${escapeHtml(name)}:</span>`
  })
}
function replaceWikilinks(value: string): string {
  return value.replace(/\[\[[^\]\n]+?\]\]/g, (raw: string, offset: number) => {
    if (offset > 0 && value[offset - 1] === '!') return raw
    const token = parseWikiLink(raw)
    if (!token) return raw
    const label = renderWikiLinkLabel(token)
    const anchorAttr = token.anchor ? ` data-wikilink-anchor="${escapeAttribute(token.anchor)}"` : ''
    const hrefTarget = token.anchor ? `${token.target}#${token.anchor}` : token.target
    const href = `#wikilink-${encodeURIComponent(hrefTarget)}`
    return `<a class="ink-wikilink ink-wikilink--unresolved" href="${href}" data-wikilink-target="${escapeAttribute(token.target)}"${anchorAttr} data-wikilink-resolved="false" title="Unresolved wikilink: ${escapeAttribute(hrefTarget)}">${escapeHtml(label)}</a>`
  })
}
function replaceInlineCitations(value: string): string {
  return value.replace(/\{cite:\s*([A-Za-z0-9_.:-]+)\s*\}/g, (_match, id: string) => {
    const escapedId = escapeAttribute(id)
    return `<span class="ink-cite ink-cite--unresolved" data-citation-id="${escapedId}"><a href="#citation-${escapedId}">[cite:${escapeHtml(id)}]</a></span>`
  })
}
function transformInlineSegment(value: string, context: RenderContext): string {
  let transformed = value
  transformed = replaceHighlights(transformed)
  transformed = replaceWikilinks(transformed)
  transformed = replaceInlineCitations(transformed)
  transformed = replaceCitationClustersInText(transformed, context.citations)
  transformed = replaceFootnoteReferencesInText(transformed, context.footnotes)
  transformed = replaceEmojiShortcodes(transformed)
  return transformed
}
function transformInlineExtensions(markdown: string, context: RenderContext): string {
  return mapNonFenceLines(markdown, (line) => splitInlineCode(line)
    .map((segment) => (segment.code ? segment.value : transformInlineSegment(segment.value, context)))
    .join(''))
}
async function transformTocAndHeadings(markdown: string, context: RenderContext): Promise<string> {
  const headings = collectHeadings(markdown)
  let headingIndex = 0
  let tocRendered = false
  let fence: MarkdownFence | null = null
  const outputLines: string[] = []
  for (const line of markdown.split('\n')) {
    const transition = transitionFence(line, fence)
    fence = transition.fence
    if (transition.boundary) {
      outputLines.push(line)
      continue
    }
    if (fence) {
      outputLines.push(line)
      continue
    }
    const tocOptions = parseTocOptions(line)
    if (tocOptions) {
      outputLines.push(tocRendered ? line : renderToc(headings, tocOptions))
      tocRendered = true
      continue
    }
    const heading = parseHeadingLine(line)
    if (!heading) {
      outputLines.push(line)
      continue
    }
    const collected = headings[headingIndex]
    headingIndex += 1
    if (!collected) {
      outputLines.push(line)
      continue
    }
    const inlineHeading = await renderInlineMarkdown(transformInlineExtensions(heading.text, context))
    outputLines.push(`<h${heading.level} id="${escapeAttribute(collected.slug)}" class="ink-heading ink-heading--h${heading.level}">${inlineHeading}</h${heading.level}>\n`)
  }
  return outputLines.join('\n')
}
function parseCitationMetadata(value: string): { source: string; kind: string } | null {
  const match = /^\s*(?:-|\u2014)\s*\{source:\s*(.+?)(?:,\s*kind:\s*(factual|inferred|authored))?\s*\}\s*$/.exec(value)
  return match ? { source: match[1].trim(), kind: match[2] ?? 'factual' } : null
}
function getCitationSourceLabel(source: string): string {
  try {
    const url = new URL(source)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.hostname
  } catch {
    // Free text source labels are valid for books, interviews, and offline material.
  }
  return source
}
async function renderCitationBlock(quoteLines: string[], context: RenderContext): Promise<string | null> {
  const strippedLines = quoteLines.map((line) => line.replace(/^\s*>\s?/, ''))
  const metadata = parseCitationMetadata(strippedLines[strippedLines.length - 1] ?? '')
  if (!metadata) return null
  const content = strippedLines.slice(0, -1).join('\n').trim()
  if (!content) return null
  const transformedContent = transformInlineExtensions(content, context)
  const renderedContent = await renderBlockMarkdown(transformedContent)
  const source = escapeAttribute(metadata.source)
  const kind = escapeAttribute(metadata.kind)
  const label = escapeHtml(getCitationSourceLabel(metadata.source))
  return `<blockquote class="ink-citation ink-citation--${kind}" data-source-url="${source}" data-citation-kind="${kind}">${renderedContent}<footer class="ink-citation__meta"><span class="ink-citation__kind">${kind}</span><span class="ink-citation__source">${label}</span></footer></blockquote>`
}
async function transformCitationBlocks(markdown: string, context: RenderContext): Promise<string> {
  const lines = markdown.split('\n')
  const outputLines: string[] = []
  let fence: MarkdownFence | null = null
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const transition = transitionFence(line, fence)
    fence = transition.fence
    if (transition.boundary) {
      outputLines.push(line)
      index += 1
      continue
    }
    if (fence || !/^\s*>/.test(line)) {
      outputLines.push(line)
      index += 1
      continue
    }
    const quoteLines: string[] = []
    while (index < lines.length && /^\s*>/.test(lines[index])) {
      quoteLines.push(lines[index])
      index += 1
    }
    const renderedCitation = await renderCitationBlock(quoteLines, context)
    outputLines.push(renderedCitation ?? quoteLines.join('\n'))
  }
  return outputLines.join('\n')
}
async function transformDetailsContainers(markdown: string, context: RenderContext): Promise<string> {
  const lines = markdown.split('\n')
  const outputLines: string[] = []
  let fence: MarkdownFence | null = null
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const transition = transitionFence(line, fence)
    fence = transition.fence
    if (transition.boundary) {
      outputLines.push(line)
      index += 1
      continue
    }
    if (fence) {
      outputLines.push(line)
      index += 1
      continue
    }
    const opener = /^\s*:::details(?:\s+(.+))?\s*$/.exec(line)
    if (!opener) {
      outputLines.push(line)
      index += 1
      continue
    }
    const summary = opener[1]?.trim() || 'Details'
    const contentLines: string[] = []
    index += 1
    while (index < lines.length && !/^\s*:::\s*$/.test(lines[index])) {
      contentLines.push(lines[index])
      index += 1
    }
    if (index < lines.length && /^\s*:::\s*$/.test(lines[index])) index += 1
    const transformedContent = transformInlineExtensions(contentLines.join('\n'), context)
    const contentHtml = await renderBlockMarkdown(transformedContent)
    outputLines.push(`<details class="ink-details"><summary class="ink-details__summary">${escapeHtml(summary)}</summary><div class="ink-details__content">${contentHtml}</div></details>`)
  }
  return outputLines.join('\n')
}
async function renderFootnoteSection(context: RenderContext): Promise<string> {
  const orderedIds = getOrderedFootnoteIds(context.footnotes)
  if (orderedIds.length === 0) return ''

  const items = await Promise.all(orderedIds.map(async (id) => {
    const displayIndex = context.footnotes.order.get(id) ?? 0
    const definition = context.footnotes.definitions.get(id)
    if (!definition || displayIndex < 1) return ''
    const transformedContent = transformInlineExtensions(definition.markdown, context)
    const renderedContent = await renderBlockMarkdown(transformedContent)
    const backLinks = renderFootnoteBacklinks(displayIndex, context.footnotes.referenceCounts.get(id) ?? 1)
    return `<li id="fn-${displayIndex}" data-footnote-id="${escapeAttribute(id)}">${renderedContent}${backLinks}</li>`
  }))

  return `<section class="ink-footnotes" role="doc-endnotes"><h2 class="ink-footnotes__title">Footnotes</h2><ol>${items.join('')}</ol></section>`
}
export async function renderInkforgeMarkdownExtensions(
  markdown: string,
  options: CitationMarkdownRenderOptions = {},
): Promise<string> {
  const extracted = extractCitationFootnoteDefinitions(markdown || '')
  const context: RenderContext = {
    footnotes: createFootnoteRenderState(extracted.definitions),
    citations: createCitationRenderState(options),
  }
  const protectedComponents: Array<{ token: string; html: string }> = []
  let marker = 'inkforge-opaque-writing-component'
  while (extracted.markdown.includes(marker)) marker += '-x'
  let staged = mapNonFenceLines(extracted.markdown, (line) => {
    const rendered = renderWritingComponentSource(line)
    if (!rendered) return line
    const token = `<!--${marker}:${protectedComponents.length}-->`
    protectedComponents.push({ token, html: rendered })
    return token
  })
  staged = await transformDetailsContainers(staged, context)
  staged = await transformCitationBlocks(staged, context)
  staged = await transformTocAndHeadings(staged, context)
  staged = transformInlineExtensions(staged, context)
  for (const component of protectedComponents) {
    staged = staged.split(component.token).join(component.html)
  }
  const footnotes = await renderFootnoteSection(context)
  const bibliography = renderBibliographySection(context.citations)
  const appendices = [footnotes, bibliography].filter(Boolean).join('\n\n')
  return appendices ? `${staged}\n\n${appendices}` : staged
}
