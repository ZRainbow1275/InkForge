// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import { renderMarkdownToHtml, serializeHtmlToMarkdown } from './TyporaMode'

describe('TyporaMode citation and footnote round-trip', () => {
  it('hydrates citation and footnote markdown through the shared renderer', async () => {
    const html = await renderMarkdownToHtml([
      'Citation smoke[^note]. Repeat[^note]. Academic [@smith2023].',
      '',
      '[^note]: Real footnote content.',
    ].join('\n'))

    expect(html).toContain('class="ink-footnote-ref"')
    expect(html).toContain('data-footnote-id="note"')
    expect(html).toContain('id="fnref-1-2"')
    expect(html).toContain('class="ink-academic-citation ink-academic-citation--unresolved"')
    expect(html).toContain('data-citation-raw="[@smith2023]"')
    expect(html).toContain('data-footnote-id="note"')
    expect(html).toContain('Real footnote content.')
  })

  it('serializes rendered citation and footnote HTML back to Markdown authority syntax', async () => {
    const html = await renderMarkdownToHtml([
      'Citation smoke[^note]. Repeat[^note]. Academic [@smith2023].',
      '',
      '[^note]: Real footnote content.',
    ].join('\n'))

    const markdown = serializeHtmlToMarkdown(html)

    expect(markdown).toContain('Citation smoke[^note]. Repeat[^note]. Academic [@smith2023].')
    expect(markdown).toContain('[^note]: Real footnote content.')
    expect(markdown).not.toContain('[@smith2023]:')
    expect(markdown).not.toContain('[missing:note]')
  })

  it('serializes Tiptap-normalized footnote sections without losing definitions', () => {
    const html = [
      '<p>Citation smoke<sup class="ink-footnote-ref" data-footnote-id="note" data-footnote-index="1" data-footnote-ref-index="1">[1]</sup>. Academic <cite class="ink-academic-citation ink-academic-citation--unresolved" data-citation-raw="[@smith2023]" data-citation-keys="smith2023" data-citation-missing="smith2023">(smith2023)</cite>.</p>',
      '<h2 class="ink-footnotes__title">Footnotes</h2>',
      '<ol><li data-footnote-id="note"><p>Real footnote content.</p><p><a class="ink-footnote-back" href="#fnref-1-1">back</a></p></li></ol>',
    ].join('')

    const markdown = serializeHtmlToMarkdown(html)

    expect(markdown).toContain('Citation smoke[^note]. Academic [@smith2023].')
    expect(markdown).toContain('[^note]: Real footnote content.')
    expect(markdown).not.toContain('Footnotes')
    expect(markdown).not.toContain('back')
  })
})
