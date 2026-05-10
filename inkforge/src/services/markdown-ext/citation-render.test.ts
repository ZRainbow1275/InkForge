import { describe, expect, it } from 'vitest'
import { parseBibTeX } from '@/services/citation'
import { renderInkforgeMarkdownExtensions } from './render'

const BIBTEX = `
@article{smith2023,
  author = {Smith, John and Doe, Jane},
  title = {A Study on Markdown Editors},
  journal = {Journal of Writing Tools},
  year = {2023}
}
`

describe('citation and footnote markdown rendering', () => {
  it('numbers footnotes by first reference and renders repeated reference backlinks', async () => {
    const html = await renderInkforgeMarkdownExtensions([
      'Second ref first[^note]. First ref second[^1]. Repeat note[^note].',
      '',
      '[^1]: Numeric definition.',
      '[^note]: Named definition with **format**.',
    ].join('\n'))

    expect(html).toContain('data-footnote-id="note"')
    expect(html).toContain('href="#fn-1"')
    expect(html).toContain('id="fnref-1-1"')
    expect(html).toContain('title="Named definition with **format**."')
    expect(html).toContain('id="fnref-1-2"')
    expect(html).toContain('href="#fnref-1-1"')
    expect(html).toContain('href="#fnref-1-2"')
    expect(html).toContain('<strong>format</strong>')
  })

  it('keeps missing footnotes visible as diagnostics', async () => {
    const html = await renderInkforgeMarkdownExtensions('Missing[^lost].')

    expect(html).toContain('ink-footnote-ref--missing')
    expect(html).toContain('[missing:lost]')
    expect(html).not.toContain('ink-footnotes__title')
  })

  it('renders unresolved academic citations honestly when no bibliography is supplied', async () => {
    const html = await renderInkforgeMarkdownExtensions('See [@smith2023, p. 42].')

    expect(html).toContain('class="ink-academic-citation ink-academic-citation--unresolved"')
    expect(html).toContain('data-citation-raw="[@smith2023, p. 42]"')
    expect(html).toContain('(smith2023, p. 42)')
    expect(html).not.toContain('ink-bibliography')
  })

  it('renders formatted citations and bibliography when real BibTeX entries are supplied', async () => {
    const html = await renderInkforgeMarkdownExtensions('See [@smith2023].', {
      bibEntries: parseBibTeX(BIBTEX),
      style: 'apa',
    })

    expect(html).toContain('(Smith &amp; Doe, 2023)')
    expect(html).toContain('class="ink-bibliography"')
    expect(html).toContain('A Study on Markdown Editors')
    expect(html).toContain('id="bib-smith2023"')
  })

  it('does not transform citations or footnotes inside fenced code and inline code', async () => {
    const html = await renderInkforgeMarkdownExtensions([
      '`[@inline]` and `[^inline]` stay raw.',
      '```',
      '[@fenced] [^fenced]',
      '```',
      '',
      '[^inline]: Ignored because only code referenced it.',
    ].join('\n'))

    expect(html).toContain('`[@inline]`')
    expect(html).toContain('[@fenced] [^fenced]')
    expect(html).not.toContain('ink-academic-citation')
    expect(html).not.toContain('ink-footnote-ref')
  })
})
