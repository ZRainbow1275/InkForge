import { escapeCitationAttribute, escapeCitationHtml, stripCitationHtml } from './html'
import type { FootnoteDefinition, FootnoteExtractionResult, FootnoteRenderState } from './types'

export const FOOTNOTE_ID_PATTERN = /^[A-Za-z0-9_-]+$/
const FOOTNOTE_DEFINITION_PATTERN = /^\[\^([A-Za-z0-9_-]+)\]:\s*(.*)$/
const FOOTNOTE_REFERENCE_PATTERN = /\[\^([A-Za-z0-9_-]+)\]/g

export function isValidFootnoteId(id: string): boolean {
  return FOOTNOTE_ID_PATTERN.test(id)
}

function isFenceLine(line: string): boolean {
  return /^\s*(```|~~~)/.test(line)
}

function isIndentedContinuation(line: string): boolean {
  return /^(?: {4}|\t)/.test(line)
}

function stripContinuationIndent(line: string): string {
  return line.replace(/^(?: {4}|\t)/, '')
}

function nextNonBlankLineIsIndented(lines: readonly string[], startIndex: number): boolean {
  let cursor = startIndex
  while (cursor < lines.length && lines[cursor].trim() === '') cursor += 1
  return cursor < lines.length && isIndentedContinuation(lines[cursor])
}

export function extractFootnoteDefinitions(markdown: string): FootnoteExtractionResult {
  const lines = markdown.split('\n')
  const definitions = new Map<string, FootnoteDefinition>()
  const bodyLines: string[] = []
  let inFence = false

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (isFenceLine(line)) {
      inFence = !inFence
      bodyLines.push(line)
      continue
    }
    if (inFence) {
      bodyLines.push(line)
      continue
    }

    const definitionMatch = FOOTNOTE_DEFINITION_PATTERN.exec(line)
    if (!definitionMatch) {
      bodyLines.push(line)
      continue
    }

    const id = definitionMatch[1]
    const contentLines = [definitionMatch[2]]

    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1]
      if (isIndentedContinuation(nextLine)) {
        index += 1
        contentLines.push(stripContinuationIndent(lines[index]))
        continue
      }
      if (nextLine.trim() === '' && nextNonBlankLineIsIndented(lines, index + 2)) {
        index += 1
        contentLines.push('')
        continue
      }
      break
    }

    definitions.set(id, {
      id,
      markdown: contentLines.join('\n').trimEnd(),
    })
  }

  return {
    markdown: bodyLines.join('\n'),
    definitions,
  }
}

export function createFootnoteRenderState(definitions: Map<string, FootnoteDefinition>): FootnoteRenderState {
  return {
    definitions,
    order: new Map(),
    referenceCounts: new Map(),
  }
}

export function registerFootnoteReference(id: string, state: FootnoteRenderState): { displayIndex: number; occurrenceIndex: number } {
  const existing = state.order.get(id)
  const displayIndex = existing ?? state.order.size + 1
  if (!existing) state.order.set(id, displayIndex)

  const occurrenceIndex = (state.referenceCounts.get(id) ?? 0) + 1
  state.referenceCounts.set(id, occurrenceIndex)
  return { displayIndex, occurrenceIndex }
}

export function renderFootnoteReferenceHtml(id: string, state: FootnoteRenderState): string {
  if (!state.definitions.has(id)) {
    return `<sup class="ink-footnote-ref ink-footnote-ref--missing" data-footnote-id="${escapeCitationAttribute(id)}" title="Missing footnote definition">[missing:${escapeCitationHtml(id)}]</sup>`
  }

  const { displayIndex, occurrenceIndex } = registerFootnoteReference(id, state)
  const definition = state.definitions.get(id)
  const preview = definition?.markdown.replace(/\s+/g, ' ').trim() ?? ''
  const refId = `fnref-${displayIndex}-${occurrenceIndex}`
  const label = `[${displayIndex}]`
  return `<sup class="ink-footnote-ref" id="${refId}" role="doc-noteref"${preview ? ` title="${escapeCitationAttribute(preview)}"` : ''}><a href="#fn-${displayIndex}" data-footnote-id="${escapeCitationAttribute(id)}" data-footnote-index="${displayIndex}" data-footnote-ref-index="${occurrenceIndex}" aria-label="Footnote ${displayIndex}">${label}</a></sup>`
}

export function replaceFootnoteReferencesInText(value: string, state: FootnoteRenderState): string {
  return value.replace(FOOTNOTE_REFERENCE_PATTERN, (_match, id: string) => renderFootnoteReferenceHtml(id, state))
}

export function getOrderedFootnoteIds(state: FootnoteRenderState): string[] {
  return Array.from(state.order.entries())
    .sort((first, second) => first[1] - second[1])
    .map(([id]) => id)
}

export function renderFootnoteBacklinks(displayIndex: number, occurrenceCount: number): string {
  const links: string[] = []
  for (let occurrence = 1; occurrence <= occurrenceCount; occurrence += 1) {
    const label = occurrenceCount === 1 ? 'back' : String.fromCharCode(96 + Math.min(occurrence, 26))
    links.push(`<a class="ink-footnote-back" href="#fnref-${displayIndex}-${occurrence}" aria-label="Back to footnote reference ${occurrence}">${label}</a>`)
  }
  return `<span class="ink-footnote-backs">${links.join(' ')}</span>`
}

export function serializeFootnoteSectionFromHtml(section: HTMLElement): string {
  const items = Array.from(section.querySelectorAll<HTMLElement>('li[data-footnote-id]'))
  return items.map((item) => {
    const id = item.dataset.footnoteId?.trim()
    if (!id || !isValidFootnoteId(id)) return ''
    const clone = item.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.ink-footnote-back, .ink-footnote-backs').forEach(node => node.remove())
    const text = stripCitationHtml(clone.innerHTML)
    return `[^${id}]: ${text}`
  }).filter(Boolean).join('\n')
}
