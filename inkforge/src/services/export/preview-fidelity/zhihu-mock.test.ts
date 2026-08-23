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
  it('renders only registered module ids as image fallbacks', () => {
    const html = renderZhihuMockHtml({
      markdown: '# 标题\n\n正文',
      trustedSvgModuleIds: ['divider-grid'],
    })

    expect(html).toContain('<img data-ink-svg="divider-grid"')
    expect(html).toContain('src="data:image/svg+xml;charset=utf-8,')
    expect(html).toContain('alt="InkForge divider-grid image fallback"')
    expect(html).not.toContain('<svg viewBox="0 0 1080 60"')
    expect(html).not.toContain('<animate attributeName="opacity"')
  })

  it('does not infer a trusted fallback from user-authored data-ink-svg HTML', () => {
    const injectedSvg = [
      '<section data-ink-svg="divider-grid">',
      '<svg viewBox="0 0 1080 60" width="100%" onload="window.__probe=1">',
      '<foreignObject width="1080" height="60"><div>untrusted</div></foreignObject>',
      '</svg>',
      '</section>',
    ].join('')

    const html = renderZhihuMockHtml({ markdown: `# 标题\n\n${injectedSvg}\n\n正文` })

    expect(html).not.toContain('data-ink-svg="divider-grid"')
    expect(html).not.toContain('data:image/svg+xml')
    expect(html).not.toMatch(/<svg\b/i)
    expect(html).not.toMatch(/\sonload=/i)
    expect(html).not.toMatch(/<foreignObject\b/i)
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

describe('renderZhihuMockHtml — observed editor canvas', () => {
  it('uses the measured 800px Draft.js canvas and neutral editor rhythm', () => {
    const html = renderZhihuMockHtml({ markdown: '## 二级标题\n\n正文' })

    expect(html).toContain('data-platform-editor="zhihu"')
    expect(html).toContain('data-editor-canvas-width="800"')
    expect(html).toContain('max-width:800px')
    expect(html).toContain('font-size:16px')
    expect(html).toContain('line-height:25.6px')
    expect(html).toContain("'Source Han Sans SC'")
    expect(html).toContain('font-size:19.2px')
    expect(html).toContain('line-height:28.8px')
    expect(html).not.toContain('border-radius:8px')
    expect(html).not.toContain('zhihu-mock-watermark')
  })

  it('does not add account, publish, or filtering claims to empty input', () => {
    const html = renderZhihuMockHtml({ markdown: '' })
    expect(html).not.toContain('zhihu-mock-watermark')
    expect(html).not.toContain('知乎 web 编辑器会过滤大部分 CSS')
    expect(html).not.toContain('InkForge')
  })
})
