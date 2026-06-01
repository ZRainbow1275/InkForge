import { describe, it, expect } from 'vitest'
import { composeSvgDecorate, extractText } from '../inject'
import type { SvgInjectionPlan, SvgDecorateOptions } from '../inject'
import { checkWechatSafe } from '../wechat-safe'

const SAMPLE_HTML =
  '<h2 style="color:#000">第二章 标题 Section</h2>' +
  '<p style="margin:1em 0">正文 paragraph 内容。</p>' +
  '<hr/>' +
  '<blockquote><p>这是一段被引用的文字 quote。</p></blockquote>' +
  '<p>结尾段落。</p>'

const PLAN: SvgInjectionPlan = {
  cover: 'cover-title',
  headings: [{ level: 2, module: 'header-ribbon' }],
  replaceHr: 'divider-diamond',
  blockquote: 'quote-vbar',
  endmark: 'endmark-fin',
}

const OPTS: SvgDecorateOptions = { primaryColor: '#004080', persona: 'business' }

describe('extractText', () => {
  it('strips tags, decodes entities, collapses whitespace', () => {
    expect(extractText('<p>引用 <strong>文字</strong>  &amp; more</p>')).toBe('引用 文字 & more')
    expect(extractText('<span>a</span>&lt;b&gt;')).toBe('a<b>')
  })
})

describe('composeSvgDecorate (wechat target)', () => {
  const decorate = composeSvgDecorate(PLAN, OPTS)
  const out = decorate(SAMPLE_HTML, 'wechat')

  it('replaces heading / hr / blockquote anchors with SVG modules', () => {
    expect(out).toContain('data-ink-svg="header-ribbon"')
    expect(out).toContain('data-ink-svg="divider-diamond"')
    expect(out).toContain('data-ink-svg="quote-vbar"')
    expect(out).not.toContain('<h2')
    expect(out).not.toContain('<hr')
    expect(out).not.toContain('<blockquote')
  })

  it('prepends cover and appends endmark', () => {
    expect(out).toContain('data-ink-svg="cover-title"')
    expect(out).toContain('data-ink-svg="endmark-fin"')
    // cover is first, endmark is last
    expect(out.indexOf('data-ink-svg="cover-title"')).toBeLessThan(
      out.indexOf('data-ink-svg="header-ribbon"'),
    )
    expect(out.lastIndexOf('data-ink-svg="endmark-fin"')).toBeGreaterThan(
      out.indexOf('data-ink-svg="quote-vbar"'),
    )
  })

  it('preserves untouched body paragraphs', () => {
    expect(out).toContain('正文 paragraph 内容')
    expect(out).toContain('结尾段落')
  })

  it('whole decorated output is WeChat-safe', () => {
    expect(checkWechatSafe(out)).toEqual([])
  })

  it('is idempotent (running twice yields identical output)', () => {
    const out2 = decorate(out, 'wechat')
    expect(out2).toBe(out)
  })
})

describe('composeSvgDecorate (preview target inlines SVG)', () => {
  it('preview also injects inline SVG (WYSIWYG)', () => {
    const out = composeSvgDecorate(PLAN, OPTS)(SAMPLE_HTML, 'preview')
    expect(out).toContain('data-ink-svg="header-ribbon"')
    expect(out).toContain('<svg')
  })
})

describe('composeSvgDecorate (xhs/zhihu rasterize seam)', () => {
  it('uses rasterize callback for xhs and removes inline svg', () => {
    const rasterize = (_svg: string, mod: { id: string }) =>
      `<img data-ink-svg="${mod.id}" alt="${mod.id}" src="data:image/png;base64,STUB" />`
    const out = composeSvgDecorate(PLAN, { ...OPTS, rasterize })(SAMPLE_HTML, 'xhs')
    expect(out).toContain('<img data-ink-svg="header-ribbon"')
    expect(out).toContain('<img data-ink-svg="cover-title"')
    expect(out).not.toContain('<svg')
  })

  it('falls back to inline SVG for xhs when no rasterize provided', () => {
    const out = composeSvgDecorate(PLAN, OPTS)(SAMPLE_HTML, 'xhs')
    expect(out).toContain('<svg')
    expect(out).toContain('data-ink-svg="header-ribbon"')
  })
})

describe('composeSvgDecorate (empty plan / empty html)', () => {
  it('empty html returns empty', () => {
    expect(composeSvgDecorate(PLAN, OPTS)('', 'wechat')).toBe('')
  })
  it('empty plan returns html unchanged', () => {
    expect(composeSvgDecorate({}, OPTS)(SAMPLE_HTML, 'wechat')).toBe(SAMPLE_HTML)
  })
})
