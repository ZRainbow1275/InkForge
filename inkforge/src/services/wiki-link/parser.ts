import type { WikiLinkOccurrence, WikiLinkToken } from './types'

const WIKI_LINK_PATTERN = /\[\[([^\]\n]+?)\]\]/g
const MAX_CONTEXT_CHARS = 80

function hasInvalidNestedSyntax(value: string): boolean {
  return value.includes('[[') || value.includes(']]')
}

export function parseWikiLink(text: string): WikiLinkToken | null {
  const match = /^\[\[([^\]|#\n]+?)(?:#([^\]|\n]+?))?(?:\|([^\]\n]+?))?\]\]$/.exec(text)
  if (!match) return null

  const target = match[1]?.trim() ?? ''
  const anchor = match[2]?.trim() || null
  const alias = match[3]?.trim() || null

  if (!target || hasInvalidNestedSyntax(target) || (anchor && hasInvalidNestedSyntax(anchor)) || (alias && hasInvalidNestedSyntax(alias))) {
    return null
  }

  return { target, anchor, alias, raw: text }
}

function isFenceLine(line: string): boolean {
  return /^\s*(```|~~~)/.test(line)
}

function contextForLine(line: string, start: number, end: number): string {
  const contextStart = Math.max(0, start - MAX_CONTEXT_CHARS)
  const contextEnd = Math.min(line.length, end + MAX_CONTEXT_CHARS)
  return line.slice(contextStart, contextEnd).replace(/\s+/g, ' ').trim()
}

function inlineCodeRanges(line: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  const pattern = /(`+)([^`]*?)\1/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(line)) !== null) {
    ranges.push([match.index, match.index + match[0].length])
  }
  return ranges
}

function isInsideRange(start: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([rangeStart, rangeEnd]) => start >= rangeStart && start < rangeEnd)
}

export function extractWikiLinks(markdown: string): WikiLinkOccurrence[] {
  const occurrences: WikiLinkOccurrence[] = []
  let inFence = false
  let absoluteOffset = 0

  markdown.split('\n').forEach((line, lineIndex) => {
    if (isFenceLine(line)) {
      inFence = !inFence
      absoluteOffset += line.length + 1
      return
    }

    if (inFence) {
      absoluteOffset += line.length + 1
      return
    }

    const codeRanges = inlineCodeRanges(line)
    const matches = Array.from(line.matchAll(WIKI_LINK_PATTERN))
    for (const match of matches) {
      const start = match.index ?? 0
      const raw = match[0]
      if (start > 0 && line[start - 1] === '!') continue
      if (isInsideRange(start, codeRanges)) continue

      const token = parseWikiLink(raw)
      if (!token) continue

      occurrences.push({
        ...token,
        index: absoluteOffset + start,
        line: lineIndex + 1,
        column: start + 1,
        context: contextForLine(line, start, start + raw.length),
      })
    }

    absoluteOffset += line.length + 1
  })

  return occurrences
}

export function renderWikiLinkLabel(token: WikiLinkToken): string {
  return token.alias ?? (token.anchor ? `${token.target}#${token.anchor}` : token.target)
}
