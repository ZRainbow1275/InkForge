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

describe('composeSvgDecorate (cover echoes real H1 title)', () => {
  const HTML_WITH_H1 =
    '<h1>真实标题 Real Title</h1>' +
    '<h2 style="color:#000">第二章 标题 Section</h2>' +
    '<p style="margin:1em 0">正文 paragraph 内容。</p>' +
    '<hr/>' +
    '<blockquote><p>这是一段被引用的文字 quote。</p></blockquote>' +
    '<p>结尾段落。</p>'

  const decorate = composeSvgDecorate(PLAN, OPTS)
  const out = decorate(HTML_WITH_H1, 'wechat')

  it('renders the real H1 text inside the cover module (not the module default 标题)', () => {
    expect(out).toContain('data-ink-svg="cover-title"')
    // cover-title 把标题切行渲染成 <text> 节点；首段文本应来自真实 H1。
    expect(out).toContain('真实标题')
  })

  it('removes the consumed first <h1> from the output (no duplicated title)', () => {
    expect(out).not.toContain('<h1')
    // 真实标题不再以「普通标题」形态出现在 cover 之外（仅存于 cover 的 <svg> 内）。
    const coverIdx = out.indexOf('data-ink-svg="cover-title"')
    const coverEnd = out.indexOf('</svg></section>', coverIdx)
    const afterCover = out.slice(coverEnd)
    expect(afterCover).not.toContain('真实标题')
  })

  it('leaves the heading replacement (h2) unaffected by the h1 removal', () => {
    expect(out).toContain('data-ink-svg="header-ribbon"')
    expect(out).not.toContain('<h2')
  })

  it('whole cover-with-title output stays WeChat-safe', () => {
    expect(checkWechatSafe(out)).toEqual([])
  })

  it('is idempotent with a real H1 (run twice == identical; h1 gone, cover not re-injected)', () => {
    const out2 = decorate(out, 'wechat')
    expect(out2).toBe(out)
  })

  it('falls back to module default when there is no <h1> (does not crash)', () => {
    const noH1 = '<h2>仅二级标题</h2><p>正文。</p>'
    const o = decorate(noH1, 'wechat')
    expect(o).toContain('data-ink-svg="cover-title"')
    // 无 H1 → 用 covers.ts 的默认文案「标题」。
    expect(o).toContain('标题')
    expect(o).toContain('正文')
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
