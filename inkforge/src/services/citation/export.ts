import { extractFootnoteDefinitions } from './footnotes'
import { parseCitationCluster } from './citations'
import type { CitationPlatform } from './types'

const FOOTNOTE_REFERENCE_PATTERN = /\[\^([A-Za-z0-9_-]+)\]/g
const CITATION_CLUSTER_PATTERN = /\[((?:-?@[A-Za-z0-9_.:-]+(?:\s*,\s*[^\];]+)?)(?:\s*;\s*-?@[A-Za-z0-9_.:-]+(?:\s*,\s*[^\];]+)?)*)\]/g

function isFenceLine(line: string): boolean {
  return /^\s*(```|~~~)/.test(line)
}

function transformNonFenceLines(markdown: string, mapper: (line: string) => string): string {
  let inFence = false
  return markdown.split('\n').map((line) => {
    if (isFenceLine(line)) {
      inFence = !inFence
      return line
    }
    return inFence ? line : mapper(line)
  }).join('\n')
}

function stripFootnoteDefinitions(markdown: string): { body: string; definitions: Map<string, string> } {
  const extracted = extractFootnoteDefinitions(markdown)
  const definitions = new Map<string, string>()
  extracted.definitions.forEach((definition, id) => definitions.set(id, definition.markdown))
  return { body: extracted.markdown, definitions }
}

export function degradeCitationsForPlainText(markdown: string, platform: CitationPlatform): string {
  if (platform !== 'xiaohongshu') return markdown

  const { body, definitions } = stripFootnoteDefinitions(markdown)
  let transformed = transformNonFenceLines(body, (line) => {
    let next = line.replace(FOOTNOTE_REFERENCE_PATTERN, (_match, id: string) => {
      const content = definitions.get(id)
      return content ? ` (note: ${content.replace(/\s+/g, ' ').trim()})` : ` (missing note: ${id})`
    })
    next = next.replace(CITATION_CLUSTER_PATTERN, (match: string) => {
      const cluster = parseCitationCluster(match)
      if (!cluster) return match
      return ` (${cluster.items.map(item => item.key).join('; ')})`
    })
    return next
  })

  transformed = transformed
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')

  if (definitions.size > 0) {
    transformed = `${transformed.trimEnd()}\n\nNotes:\n${Array.from(definitions.entries()).map(([id, content], index) => `${index + 1}. ${id}: ${content.replace(/\s+/g, ' ').trim()}`).join('\n')}`
  }

  return transformed
}

export function preserveCitationMarkdown(markdown: string): string {
  return markdown
}
