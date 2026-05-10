import { describe, it, expect } from 'vitest'
import { renderXhsMockHtml, type XhsMockInput } from './xiaohongshu-mock'

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
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
    const articleText = [
      '【 标题 】',
      '',
      '第一段文字。',
      '第二段文字。',
      '',
      '— 感谢阅读',
    ].join('\n')

    const input = baseInput({
      text: articleText,
      charCount: articleText.length,
      overLimit: false,
    })
    const html = renderXhsMockHtml(input, {
      showTitleHeader: false,
      showHashtagPills: false,
      showCharCounter: false,
    })

    const stripped = decodeBasicEntities(stripTags(html)).trim()
    // tolerance ≤5 chars accounts for watermark / counter inline copy
    const diff = Math.abs(stripped.length - articleText.length)
    expect(stripped).toContain('第一段文字。')
    // when chrome disabled, only watermark adds chars; check tight tolerance
    expect(diff).toBeLessThanOrEqual(WATERMARK_LEN_TOLERANCE)
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

  it('over-limit (charCount=1100): counter shows ⚠️ and red color', () => {
    const html = renderXhsMockHtml(
      baseInput({ text: 'x'.repeat(1100), charCount: 1100, overLimit: true })
    )
    expect(html).toContain('xhs-mock-counter')
    // ⚠️ glyph is escaped via emoji - we placed it raw in code, so it should appear as-is
    expect(html).toMatch(/⚠/)
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
  })

  it('article preserves whitespace via white-space:pre-wrap', () => {
    const html = renderXhsMockHtml(
      baseInput({ text: 'a\n\n\nb', charCount: 6, overLimit: false })
    )
    expect(html).toMatch(/white-space:\s*pre-wrap/)
  })
})

// Tolerance constant: watermark "预览 · 实际发布为纯文本" (12 chars CJK) plus possible padding
const WATERMARK_LEN_TOLERANCE = 16
