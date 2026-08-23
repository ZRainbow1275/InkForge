import { describe, it, expect } from 'vitest'
import { renderXhsMockHtml, type XhsMockInput } from './xiaohongshu-mock'
import { markdownToXiaohongshuText } from '../xiaohongshu-text'

function stripTags(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

const baseInput = (overrides: Partial<XhsMockInput> = {}): XhsMockInput => ({
  text: '',
  charCount: 0,
  overLimit: false,
  ...overrides,
})

describe('renderXhsMockHtml — basic rendering', () => {
  it('renders the body text and shows hashtag pills', () => {
    const input = baseInput({
      text: 'Hello world\n\n#tech',
      hashtags: ['#tech'],
      charCount: 18,
      overLimit: false,
    })
    const html = renderXhsMockHtml(input)
    expect(html).toContain('Hello world')
    expect(html).toContain('xhs-mock-hashtags')
    expect(html).toContain('xhs-mock-tag')
    expect(html).toContain('#tech')
  })

  it('escapes HTML in text — no unescaped <script> survives', () => {
    const input = baseInput({
      text: '<script>alert(1)</script>\n正文',
      charCount: 28,
      overLimit: false,
    })
    const html = renderXhsMockHtml(input)
    // Output must not contain a raw <script> opening tag
    expect(html).not.toMatch(/<script\b/i)
    // But the literal text "<script>" should appear escaped as &lt;script&gt;
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('alert(1)')
  })

  it('preserves text fidelity — stripped output text matches input within tolerance', () => {
    const sourceMarkdown = [
      '# 【 标题 】',
      '',
      '第一段文字。',
      '第二段文字。',
      '',
      '— 感谢阅读',
      '',
      '#技术 #排版',
    ].join('\n')
    const artifact = markdownToXiaohongshuText(sourceMarkdown)

    const input = baseInput({
      text: artifact.text,
      title: artifact.title,
      body: artifact.body,
      hashtags: artifact.hashtags,
      suggestedTags: artifact.suggestedTags,
      charCount: artifact.charCount,
      overLimit: artifact.overLimit,
    })
    const html = renderXhsMockHtml(input, {
      showTitleHeader: false,
      showHashtagPills: false,
      showCharCounter: false,
    })

    const stripped = decodeBasicEntities(stripTags(html)).trim()
    const diff = Math.abs(stripped.length - artifact.text.length)
    expect(stripped).toContain('第一段文字。')
    expect(stripped).toBe(artifact.text)
    expect(diff).toBe(0)
  })

  it('uses the observed XHS long-article editor canvas instead of an invented marketing card', () => {
    const html = renderXhsMockHtml(
      baseInput({ text: '正文', charCount: 2, overLimit: false }),
      {
        showTitleHeader: false,
        showHashtagPills: false,
        showCharCounter: false,
      }
    )

    expect(html).toContain('data-platform-editor="xiaohongshu"')
    expect(html).toContain('data-editor-canvas-width="896"')
    expect(html).toContain('max-width:896px')
    expect(html).toContain('font-size:16px')
    expect(html).toContain('line-height:28px')
    expect(html).toContain('AlibabaPuHuiTi')
    expect(html).not.toContain('linear-gradient')
    expect(html).not.toContain('box-shadow')
    expect(html).not.toContain('xhs-mock-watermark')
  })

  it('preset switching: fresh primary color #2BBF7C appears in inline style', () => {
    const html = renderXhsMockHtml(
      baseInput({ text: 'body', charCount: 4, overLimit: false }),
      { presetId: 'fresh' }
    )
    expect(html).toContain('#2BBF7C')
    expect(html).toContain('data-preset="fresh"')
  })

  it('all 5 presets emit their distinctive primary color', () => {
    const expectations: Array<['fresh' | 'simple' | 'warm' | 'tech' | 'nature', string]> = [
      ['fresh', '#2BBF7C'],
      ['simple', '#607D8B'],
      ['warm', '#FF6B6B'],
      ['tech', '#2962FF'],
      ['nature', '#43A047'],
    ]
    for (const [preset, color] of expectations) {
      const html = renderXhsMockHtml(
        baseInput({ text: 'body', charCount: 4, overLimit: false }),
        { presetId: preset }
      )
      expect(html).toContain(color)
      expect(html).toContain(`data-preset="${preset}"`)
    }
  })

  it('over-limit (charCount=1100): counter shows text status and red color without emoji', () => {
    const html = renderXhsMockHtml(
      baseInput({ text: 'x'.repeat(1100), charCount: 1100, overLimit: true })
    )
    expect(html).toContain('xhs-mock-counter')
    expect(html).toContain('超限')
    expect(html).not.toContain('⚠')
    // red color #E53935 inline
    expect(html).toContain('#E53935')
    expect(html).toContain('1100 / 1000 字')
  })

  it('empty hashtags → footer not rendered', () => {
    const html = renderXhsMockHtml(
      baseInput({ text: 'body', charCount: 4, overLimit: false, hashtags: [] })
    )
    expect(html).not.toContain('xhs-mock-hashtags')
  })

  it('falls back to suggestedTags when hashtags missing', () => {
    const html = renderXhsMockHtml(
      baseInput({
        text: 'body',
        charCount: 4,
        overLimit: false,
        suggestedTags: ['#fallback'],
      })
    )
    expect(html).toContain('#fallback')
    expect(html).toContain('xhs-mock-hashtags')
  })

  it('primaryColor option overrides preset color', () => {
    const html = renderXhsMockHtml(
      baseInput({ text: 'body', charCount: 4, overLimit: false }),
      { presetId: 'fresh', primaryColor: '#123456' }
    )
    expect(html).toContain('#123456')
    // Original preset color should not appear in any border-top etc.
    expect(html).not.toContain('#2BBF7C')
  })

  it('title is rendered in header when provided', () => {
    const html = renderXhsMockHtml(
      baseInput({
        text: '我的标题\n\n正文',
        title: '我的标题',
        body: '正文',
        charCount: 8,
        overLimit: false,
      })
    )
    expect(html).toContain('xhs-mock-title')
    expect(html).toContain('我的标题')
    expect(html).toContain('font-size:24px')
    expect(html).toContain('line-height:36px')
    expect(html).toContain('text-align:left')
    expect(html).not.toContain('xhs-mock-title-ornament')
    expect(html).not.toMatch(/[🌿📝💕💡🌱]/u)
  })

  it('article preserves whitespace via white-space:pre-wrap', () => {
    const html = renderXhsMockHtml(
      baseInput({ text: 'a\n\n\nb', charCount: 6, overLimit: false })
    )
    expect(html).toMatch(/white-space:\s*pre-wrap/)
  })
})
