import { describe, expect, it } from 'vitest'
import {
  CitationRepository,
  extractFootnoteDefinitions,
  formatBibliography,
  formatCitationCluster,
  parseBibAuthors,
  parseBibTeX,
  parseCitationCluster,
} from '@/services/citation'

const BIBTEX = `
@article{smith2023,
  author  = {Smith, John and Doe, Jane},
  title   = {A Study on {Markdown} Editors},
  journal = {Journal of Writing Tools},
  year    = {2023},
  volume  = {15},
  pages   = {123--145},
  doi     = {10.1234/jwt.2023.123}
}

@book{jones2022,
  author    = "Jones, Alice",
  title     = "Academic Writing in the Digital Age",
  publisher = {Academic Press},
  year      = 2022
}
`

describe('BibTeX parsing and deterministic citation formatting', () => {
  it('parses real BibTeX entry shapes with nested braces and quoted values', () => {
    const entries = parseBibTeX(BIBTEX)

    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({
      key: 'smith2023',
      type: 'article',
      fields: {
        author: 'Smith, John and Doe, Jane',
        title: 'A Study on {Markdown} Editors',
        journal: 'Journal of Writing Tools',
        year: '2023',
      },
    })
    expect(entries[1].fields.publisher).toBe('Academic Press')
  })

  it('formats inline citation clusters without claiming full CSL processing', () => {
    const entries = new Map(parseBibTeX(BIBTEX).map(entry => [entry.key, entry]))
    const cluster = parseCitationCluster('[@smith2023, p. 42; @jones2022]')

    expect(cluster).not.toBeNull()
    const formatted = formatCitationCluster(cluster!, entries, 'apa')

    expect(formatted.formattedText).toBe('(Smith & Doe, 2023, p. 42; Jones, 2022)')
    expect(formatted.unresolvedKeys).toEqual([])
  })

  it('keeps unresolved citation keys explicit instead of inventing metadata', () => {
    const cluster = parseCitationCluster('[-@missing2026]')
    const formatted = formatCitationCluster(cluster!, new Map(), 'gb-t-7714-2015')

    expect(formatted.formattedText).toBe('(missing2026)')
    expect(formatted.unresolvedKeys).toEqual(['missing2026'])
  })

  it('formats bibliography entries for the four preset styles', () => {
    const entries = new Map(parseBibTeX(BIBTEX).map(entry => [entry.key, entry]))
    const keys = ['smith2023', 'jones2022']

    expect(formatBibliography(keys, entries, 'apa')[0].text).toContain('(2022)')
    expect(formatBibliography(keys, entries, 'mla')[0].text).toContain('"Academic Writing in the Digital Age."')
    expect(formatBibliography(keys, entries, 'chicago-author-date')[0].text).toContain('2022')
    expect(formatBibliography(keys, entries, 'gb-t-7714-2015')[0].text).toContain('[1] Smith, John; Doe, Jane.')
  })

  it('normalizes BibTeX author names for western name orders', () => {
    expect(parseBibAuthors('Smith, John and Jane Doe')).toEqual([
      { original: 'Smith, John', family: 'Smith', given: 'John' },
      { original: 'Jane Doe', family: 'Doe', given: 'Jane' },
    ])
  })
})

describe('Footnote extraction', () => {
  it('extracts indented multiline footnotes without consuming following body text', () => {
    const result = extractFootnoteDefinitions([
      'Alpha[^note].',
      '',
      '[^note]: First paragraph.',
      '',
      '    Second paragraph with **format**.',
      'Beta remains body.',
    ].join('\n'))

    expect(result.markdown).toContain('Alpha[^note].')
    expect(result.markdown).toContain('Beta remains body.')
    expect(result.markdown).not.toContain('[^note]:')
    expect(result.definitions.get('note')?.markdown).toBe('First paragraph.\n\nSecond paragraph with **format**.')
  })
})

describe('CitationRepository', () => {
  it('loads real BibTeX text through an injected file loader boundary', async () => {
    const repository = new CitationRepository()
    await repository.loadFromDocument({
      documentPath: 'D:/docs/article.md',
      bibPaths: ['refs.bib'],
      style: 'apa',
      fileLoader: {
        async readTextFile(path: string): Promise<string> {
          expect(path).toBe('D:/docs/refs.bib')
          return BIBTEX
        },
      },
    })

    expect(repository.search('markdown')[0]?.key).toBe('smith2023')
    const cluster = parseCitationCluster('[@smith2023]')
    expect(repository.formatCitation(cluster!).formattedText).toBe('(Smith & Doe, 2023)')
    expect(repository.formatBibliography(['smith2023'])).toHaveLength(1)
  })
})
