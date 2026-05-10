import { escapeCitationHtml } from './html'
import { getBibYear, parseBibAuthors } from './bibtex'
import {
  CITATION_STYLE_IDS,
  type BibAuthorName,
  type BibEntry,
  type CitationCluster,
  type CitationItem,
  type CitationStyleId,
  type FormattedBibliographyEntry,
  type FormattedCitationCluster,
} from './types'

export function normalizeCitationStyleId(value: string | null | undefined): CitationStyleId {
  return CITATION_STYLE_IDS.includes(value as CitationStyleId) ? value as CitationStyleId : 'gb-t-7714-2015'
}

function authorFamilyList(authors: BibAuthorName[]): string[] {
  return authors.map(author => author.family || author.original).filter(Boolean)
}

function formatShortAuthors(authors: BibAuthorName[], style: CitationStyleId): string {
  const families = authorFamilyList(authors)
  if (families.length === 0) return 'Anonymous'
  if (families.length === 1) return families[0]

  if (style === 'gb-t-7714-2015') {
    return families.length > 2 ? `${families[0]} et al.` : families.join(', ')
  }

  if (style === 'apa') {
    return families.length > 2 ? `${families[0]} et al.` : families.join(' & ')
  }

  return families.length > 2 ? `${families[0]} et al.` : families.join(' and ')
}

function formatLongAuthor(author: BibAuthorName): string {
  if (author.given) return `${author.family}, ${author.given}`
  return author.family || author.original
}

function formatLongAuthors(authors: BibAuthorName[], style: CitationStyleId): string {
  if (authors.length === 0) return 'Anonymous'
  if (style === 'apa') {
    if (authors.length === 1) return formatLongAuthor(authors[0])
    const allButLast = authors.slice(0, -1).map(formatLongAuthor).join(', ')
    return `${allButLast}, & ${formatLongAuthor(authors[authors.length - 1])}`
  }
  if (style === 'gb-t-7714-2015') {
    return authors.map(formatLongAuthor).join('; ')
  }
  if (authors.length === 1) return formatLongAuthor(authors[0])
  const allButLast = authors.slice(0, -1).map(formatLongAuthor).join(', ')
  return `${allButLast}, and ${formatLongAuthor(authors[authors.length - 1])}`
}

function cleanTerminalPunctuation(value: string): string {
  return value.trim().replace(/[.。]\s*$/u, '')
}

function formatCitationItem(item: CitationItem, entry: BibEntry | undefined, style: CitationStyleId): { text: string; unresolved: boolean } {
  if (!entry) {
    return { text: item.suffix ? `${item.key}, ${item.suffix}` : item.key, unresolved: true }
  }

  const authors = parseBibAuthors(entry.fields.author || entry.fields.editor)
  const year = getBibYear(entry)
  const authorText = item.suppressAuthor ? '' : formatShortAuthors(authors, style)
  const suffix = item.locator || item.suffix
  const locatorText = suffix ? `, ${suffix}` : ''

  if (item.suppressAuthor) return { text: `${year}${locatorText}`, unresolved: false }
  if (style === 'mla') return { text: `${authorText} ${year}${locatorText}`, unresolved: false }
  if (style === 'chicago-author-date') return { text: `${authorText} ${year}${locatorText}`, unresolved: false }
  return { text: `${authorText}, ${year}${locatorText}`, unresolved: false }
}

export function formatCitationCluster(
  cluster: CitationCluster,
  entries: ReadonlyMap<string, BibEntry>,
  style: CitationStyleId = 'gb-t-7714-2015',
): FormattedCitationCluster {
  const unresolvedKeys: string[] = []
  const parts = cluster.items.map((item) => {
    const formatted = formatCitationItem(item, entries.get(item.key), style)
    if (formatted.unresolved) unresolvedKeys.push(item.key)
    return formatted.text
  })

  return {
    raw: cluster.raw,
    keys: cluster.items.map(item => item.key),
    formattedText: `(${parts.join('; ')})`,
    unresolvedKeys,
  }
}

function entryTypeSuffix(entry: BibEntry): string {
  switch (entry.type.toLowerCase()) {
    case 'article':
      return 'J'
    case 'book':
      return 'M'
    case 'inproceedings':
    case 'conference':
      return 'C'
    case 'phdthesis':
    case 'mastersthesis':
      return 'D'
    default:
      return 'Z'
  }
}

function containerText(entry: BibEntry): string {
  return entry.fields.journal || entry.fields.booktitle || entry.fields.publisher || entry.fields.organization || ''
}

export function formatBibliographyEntry(entry: BibEntry, style: CitationStyleId, index: number): FormattedBibliographyEntry {
  const authors = parseBibAuthors(entry.fields.author || entry.fields.editor)
  const authorText = formatLongAuthors(authors, style)
  const title = cleanTerminalPunctuation(entry.fields.title ?? 'Untitled')
  const container = cleanTerminalPunctuation(containerText(entry))
  const year = getBibYear(entry)
  const pages = entry.fields.pages || entry.fields.page || ''
  const doi = entry.fields.doi || entry.fields.DOI || ''
  const url = entry.fields.url || entry.fields.URL || ''

  let text: string
  switch (style) {
    case 'apa':
      text = `${authorText}. (${year}). ${title}.${container ? ` ${container}.` : ''}${doi ? ` https://doi.org/${doi.replace(/^https?:\/\/doi\.org\//i, '')}` : url ? ` ${url}` : ''}`
      break
    case 'mla':
      text = `${authorText}. "${title}."${container ? ` ${container},` : ''} ${year}${pages ? `, pp. ${pages}` : ''}.${doi ? ` doi:${doi}.` : url ? ` ${url}` : ''}`
      break
    case 'chicago-author-date':
      text = `${authorText}. ${year}. "${title}."${container ? ` ${container}.` : ''}${pages ? ` ${pages}.` : ''}${doi ? ` https://doi.org/${doi.replace(/^https?:\/\/doi\.org\//i, '')}.` : url ? ` ${url}.` : ''}`
      break
    case 'gb-t-7714-2015':
    default:
      text = `[${index}] ${authorText}. ${title}[${entryTypeSuffix(entry)}].${container ? ` ${container},` : ''} ${year}${pages ? `: ${pages}` : ''}.${doi ? ` DOI:${doi}.` : url ? ` ${url}.` : ''}`
      break
  }

  return {
    key: entry.key,
    text: text.replace(/\s+/g, ' ').trim(),
    html: escapeCitationHtml(text.replace(/\s+/g, ' ').trim()),
  }
}

export function formatBibliography(
  usedKeys: readonly string[],
  entries: ReadonlyMap<string, BibEntry>,
  style: CitationStyleId = 'gb-t-7714-2015',
): FormattedBibliographyEntry[] {
  const uniqueKeys = Array.from(new Set(usedKeys))
  const resolved = uniqueKeys
    .map(key => entries.get(key))
    .filter((entry): entry is BibEntry => Boolean(entry))

  if (style === 'apa' || style === 'mla' || style === 'chicago-author-date') {
    resolved.sort((first, second) => {
      const firstAuthor = parseBibAuthors(first.fields.author || first.fields.editor)[0]?.family ?? first.key
      const secondAuthor = parseBibAuthors(second.fields.author || second.fields.editor)[0]?.family ?? second.key
      return firstAuthor.localeCompare(secondAuthor)
    })
  }

  return resolved.map((entry, index) => formatBibliographyEntry(entry, style, index + 1))
}
