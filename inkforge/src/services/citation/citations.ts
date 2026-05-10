import { escapeCitationAttribute, escapeCitationHtml, stripCitationHtml } from './html'
import { formatBibliography, formatCitationCluster, normalizeCitationStyleId } from './format'
import type {
  BibEntry,
  CitationCluster,
  CitationItem,
  CitationMarkdownRenderOptions,
  CitationRenderState,
  CitationStyleId,
} from './types'

const CITATION_KEY_PATTERN = '[A-Za-z0-9_.:-]+'
const CITATION_CLUSTER_PATTERN = new RegExp(`\\[((?:-?@${CITATION_KEY_PATTERN}(?:\\s*,\\s*[^\\];]+)?)(?:\\s*;\\s*-?@${CITATION_KEY_PATTERN}(?:\\s*,\\s*[^\\];]+)?)*)\\]`, 'g')
const CITATION_ITEM_PATTERN = new RegExp(`^(-?)@(${CITATION_KEY_PATTERN})(?:\\s*,\\s*(.+))?$`)

function splitCitationItems(value: string): string[] {
  return value.split(';').map(item => item.trim()).filter(Boolean)
}

function parseLocator(suffix: string): string | null {
  const normalized = suffix.trim()
  if (!normalized) return null
  if (/^(?:p|pp|page|pages)\.\s*\S+/i.test(normalized)) return normalized
  if (/^\d+(?:[-,]\s*\d+)*$/.test(normalized)) return `p. ${normalized}`
  return null
}

export function parseCitationCluster(raw: string): CitationCluster | null {
  if (!raw.startsWith('[') || !raw.endsWith(']')) return null
  const inner = raw.slice(1, -1).trim()
  if (!inner.includes('@')) return null

  const items: CitationItem[] = []
  for (const part of splitCitationItems(inner)) {
    const match = CITATION_ITEM_PATTERN.exec(part)
    if (!match) return null
    const suffix = match[3]?.trim() ?? ''
    items.push({
      key: match[2],
      suppressAuthor: match[1] === '-',
      suffix,
      locator: parseLocator(suffix),
    })
  }

  return items.length > 0 ? { raw, items } : null
}

export function createCitationRenderState(options: CitationMarkdownRenderOptions = {}): CitationRenderState {
  const entries = new Map<string, BibEntry>()
  for (const entry of options.bibEntries ?? []) entries.set(entry.key, entry)
  return {
    entries,
    usedKeys: [],
    style: normalizeCitationStyleId(options.style),
  }
}

function renderCitationClusterHtml(cluster: CitationCluster, state: CitationRenderState): string {
  const formatted = formatCitationCluster(cluster, state.entries, state.style)
  for (const key of formatted.keys) {
    if (!state.usedKeys.includes(key)) state.usedKeys.push(key)
  }

  const classes = ['ink-academic-citation']
  if (formatted.unresolvedKeys.length > 0) classes.push('ink-academic-citation--unresolved')

  return `<cite class="${classes.join(' ')}" data-citation-raw="${escapeCitationAttribute(cluster.raw)}" data-citation-keys="${escapeCitationAttribute(formatted.keys.join(';'))}" data-citation-style="${escapeCitationAttribute(state.style)}"${formatted.unresolvedKeys.length > 0 ? ` data-citation-missing="${escapeCitationAttribute(formatted.unresolvedKeys.join(';'))}"` : ''}>${escapeCitationHtml(formatted.formattedText)}</cite>`
}

export function replaceCitationClustersInText(value: string, state: CitationRenderState): string {
  return value.replace(CITATION_CLUSTER_PATTERN, (match: string) => {
    const cluster = parseCitationCluster(match)
    return cluster ? renderCitationClusterHtml(cluster, state) : match
  })
}

export function renderBibliographySection(state: CitationRenderState): string {
  const bibliography = formatBibliography(state.usedKeys, state.entries, state.style)
  if (bibliography.length === 0) return ''
  const items = bibliography.map((entry, index) => {
    const label = state.style === 'gb-t-7714-2015' ? '' : `${index + 1}. `
    return `<li id="bib-${escapeCitationAttribute(entry.key)}" data-bibliography-key="${escapeCitationAttribute(entry.key)}">${label}${entry.html}</li>`
  })
  return `<section class="ink-bibliography" role="doc-bibliography"><h2 class="ink-bibliography__title">References</h2><ol>${items.join('')}</ol></section>`
}

export function serializeCitationElementFromHtml(element: HTMLElement): string {
  const raw = element.dataset.citationRaw?.trim()
  if (raw && parseCitationCluster(raw)) return raw
  const keys = element.dataset.citationKeys?.split(';').map(key => key.trim()).filter(Boolean) ?? []
  if (keys.length > 0) return `[@${keys.join('; @')}]`
  return stripCitationHtml(element.innerHTML)
}

export function stripBibliographyHtml(html: string): string {
  return html.replace(/<section\b[^>]*class="[^"]*ink-bibliography[^"]*"[\s\S]*?<\/section>/gi, '')
}

export function citationStyleFromFrontmatter(value: unknown): CitationStyleId {
  return normalizeCitationStyleId(typeof value === 'string' ? value : null)
}
