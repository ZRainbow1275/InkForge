import { describe, it, expect } from 'vitest'
import { renderZhihuMockHtml } from './zhihu-mock'

describe('renderZhihuMockHtml — markdown rendering', () => {
  it('renders heading and converts unrendered $$..$$ to equation img', () => {
    const html = renderZhihuMockHtml({ markdown: '# Title\n\nbody $$E=mc^2$$' })
    expect(html).toContain('<h1')
    expect(html).toContain('Title</h1>')
    // body $$E=mc^2$$ 在 fidelity 中被强制转为 zhihu equation endpoint
    expect(html).toMatch(/<img src="https:\/\/www\.zhihu\.com\/equation\?tex=E%3Dmc%5E2"/)
    expect(html).toContain('eeimg="1"')
  })

  it('renders inline $a+b$ as zhihu equation img', () => {
    const html = renderZhihuMockHtml({ markdown: 'value $a+b$ here' })
    expect(html).toMatch(/<img src="https:\/\/www\.zhihu\.com\/equation\?tex=a%2Bb"/)
    // 反向校验
    const m = html.match(/equation\?tex=([^"\s]+)"/)
    expect(decodeURIComponent(m![1])).toBe('a+b')
  })

  it('keeps already-converted equation img unchanged (idempotent)', () => {
    const md = 'pre <img src="https://www.zhihu.com/equation?tex=x%3D1" alt="x=1" eeimg="1"> post'
    const html = renderZhihuMockHtml({ markdown: md })
    // 只应有一份 equation img（不重复转换）
    const matches = html.match(/equation\?tex=x%3D1/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('honors showLatexAsImg=false (raw $$ kept)', () => {
    const html = renderZhihuMockHtml({ markdown: '$$y=2$$' }, { showLatexAsImg: false })
    expect(html).not.toContain('equation?tex=')
    expect(html).toContain('$$y=2$$')
  })
})

describe('renderZhihuMockHtml — code blocks', () => {
  it('injects language badge for fenced code block with language', () => {
    const html = renderZhihuMockHtml({ markdown: '```ts\nconst x = 1;\n```' })
    expect(html).toContain('zhihu-mock-codeblock')
    expect(html).toContain('zhihu-mock-code-badge')
    expect(html).toContain('language-ts')
    // 徽章文本
    expect(html).toMatch(/<span class="zhihu-mock-code-badge"[^>]*>ts<\/span>/)
  })

  it('omits badge when showCodeLanguageBadge=false', () => {
    const html = renderZhihuMockHtml(
      { markdown: '```ts\nconst x = 1;\n```' },
      { showCodeLanguageBadge: false }
    )
    expect(html).not.toContain('zhihu-mock-code-badge')
  })
})

describe('renderZhihuMockHtml — tables (fidelity preserves)', () => {
  it('renders 2x2 GFM table as <table> (no fallback in mock)', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |\n'
    const html = renderZhihuMockHtml({ markdown: md })
    expect(html).toContain('<table')
    expect(html).toMatch(/<th[^>]*>a<\/th>/)
    expect(html).toMatch(/<th[^>]*>b<\/th>/)
    expect(html).toMatch(/<td[^>]*>1<\/td>/)
    expect(html).toMatch(/<td[^>]*>2<\/td>/)
    // fidelity 不应 fallback 为 blockquote
    expect(html).not.toContain('表格 1')
  })
})

describe('renderZhihuMockHtml — InkForge SVG fallback', () => {
  it('converts data-ink-svg inline modules into image fallback instead of leaking inline SVG', () => {
    const injectedSvg = [
      '<section data-ink-svg="divider-grid" style="display:block">',
      '<svg viewBox="0 0 1080 60" width="100%" xmlns="http://www.w3.org/2000/svg">',
      '<rect x="0" y="0" width="1080" height="60" fill="#fff"></rect>',
      '<animate attributeName="opacity" begin="0s" dur="0.4s" from="0" to="1" fill="freeze"></animate>',
      '</svg>',
      '</section>',
    ].join('')

    const html = renderZhihuMockHtml({ markdown: `# 标题\n\n${injectedSvg}\n\n正文` })

    expect(html).toContain('<img data-ink-svg="divider-grid"')
    expect(html).toContain('src="data:image/svg+xml;charset=utf-8,')
    expect(html).toContain('alt="InkForge divider-grid image fallback"')
    expect(html).not.toContain('<svg viewBox="0 0 1080 60"')
    expect(html).not.toContain('<animate attributeName="opacity"')
  })
})

describe('renderZhihuMockHtml — preset switching', () => {
  it('uses academic primary #1565C0 by default', () => {
    const html = renderZhihuMockHtml({ markdown: '# x' })
    expect(html).toContain('#1565C0')
    expect(html).toContain('zhihu-mock-academic')
    expect(html).toContain('data-primary="#1565C0"')
  })

  it('switches to tech preset → primary #2962FF', () => {
    const html = renderZhihuMockHtml({ markdown: '# x' }, { presetId: 'tech' })
    expect(html).toContain('#2962FF')
    expect(html).toContain('zhihu-mock-tech')
    expect(html).toContain('data-primary="#2962FF"')
  })

  it('switches to insight preset → primary #6A1B9A', () => {
    const html = renderZhihuMockHtml({ markdown: '# x' }, { presetId: 'insight' })
    expect(html).toContain('#6A1B9A')
    expect(html).toContain('zhihu-mock-insight')
  })

  it('honors primaryColor override', () => {
    const html = renderZhihuMockHtml(
      { markdown: '# x' },
      { presetId: 'academic', primaryColor: '#FF0000' }
    )
    expect(html).toContain('#FF0000')
    expect(html).not.toContain('#1565C0')
  })
})

describe('renderZhihuMockHtml — watermark', () => {
  it('always appends watermark', () => {
    const html = renderZhihuMockHtml({ markdown: 'hello' })
    expect(html).toContain('zhihu-mock-watermark')
    expect(html).toContain('知乎 web 编辑器会过滤大部分 CSS')
  })

  it('watermark present even when input markdown is empty', () => {
    const html = renderZhihuMockHtml({ markdown: '' })
    expect(html).toContain('zhihu-mock-watermark')
  })
})
