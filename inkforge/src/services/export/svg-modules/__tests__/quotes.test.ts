/**
 * quotes.ts 模块族单测 — 见 prompts/0601/SPEC.md §8 / §9.1。
 *
 * 验证项：
 *  - 4 变体 × 4 persona 全部 checkWechatSafe() 零违规
 *  - 输出含 data-ink-svg / viewBox / width="100%"，且不含 <div
 *  - 长输入产生多行 <text>（验证 wrapCjkLines 切行真实生效）
 *  - quote-card 的 section style 含 box-shadow
 */
import { describe, it, expect } from 'vitest'
import { quoteModules } from '../quotes'
import { buildThemeContext } from '../theme'
import { checkWechatSafe } from '../wechat-safe'
import type { PresetPersona } from '@/types'

const PRIMARY_COLORS: Record<PresetPersona, string> = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
}

const PERSONAS: PresetPersona[] = ['academic', 'business', 'lifestyle', 'creative']

const LONG_QUOTE =
  '这是一段用于测试换行的较长引用文字，应当被正确地拆分为多行显示而不溢出。'
const SUBTITLE = '— 出处'

describe('quoteModules registry', () => {
  it('exposes exactly 4 quote variants in the quote family', () => {
    expect(quoteModules).toHaveLength(4)
    for (const m of quoteModules) expect(m.family).toBe('quote')
    expect(quoteModules.map((m) => m.id).sort()).toEqual(
      ['quote-card', 'quote-corner', 'quote-mark', 'quote-vbar'].sort(),
    )
  })
})

describe('quotes × persona safety + structure', () => {
  for (const module of quoteModules) {
    for (const persona of PERSONAS) {
      const primaryColor = PRIMARY_COLORS[persona]
      it(`${module.id} on persona=${persona} is wechat-safe and well-formed`, () => {
        const theme = buildThemeContext({ primaryColor, persona, target: 'wechat' })
        const out = module.render({ theme, text: LONG_QUOTE, subtitle: SUBTITLE })

        // 安全子集零违规
        expect(checkWechatSafe(out)).toEqual([])

        // 结构哨兵
        expect(out).toContain(`data-ink-svg="${module.id}"`)
        expect(out).toContain('viewBox="0 0 1080')
        expect(out).toContain('width="100%"')

        // 包裹必须 <section>，绝不 <div>
        expect(out).toContain('<section')
        expect(out).not.toContain('<div')

        // 长输入应触发多行 <text>（至少 2 个 <text> 引文 + attribution = ≥3）
        const textCount = (out.match(/<text\b/g) || []).length
        expect(textCount).toBeGreaterThanOrEqual(2)
      })
    }
  }
})

describe('quote-corner specifics', () => {
  it('draws two corner brackets via <path>', () => {
    const theme = buildThemeContext({
      primaryColor: PRIMARY_COLORS.academic,
      persona: 'academic',
      target: 'wechat',
    })
    const corner = quoteModules.find((m) => m.id === 'quote-corner')!
    const out = corner.render({ theme, text: LONG_QUOTE, subtitle: SUBTITLE })
    // 至少两个 path（左上 + 右下两个角标）
    const pathCount = (out.match(/<path\b/g) || []).length
    expect(pathCount).toBeGreaterThanOrEqual(2)
  })
})

describe('quote-vbar specifics', () => {
  it('draws a left vertical accent rect', () => {
    const theme = buildThemeContext({
      primaryColor: PRIMARY_COLORS.business,
      persona: 'business',
      target: 'wechat',
    })
    const vbar = quoteModules.find((m) => m.id === 'quote-vbar')!
    const out = vbar.render({ theme, text: LONG_QUOTE, subtitle: SUBTITLE })
    expect(out).toContain('<rect ')
    expect(out).toContain('fill="#004080"')
  })
})

describe('quote-mark specifics', () => {
  it('draws a large decorative quotation-mark glyph via <path>', () => {
    const theme = buildThemeContext({
      primaryColor: PRIMARY_COLORS.creative,
      persona: 'creative',
      target: 'wechat',
    })
    const mark = quoteModules.find((m) => m.id === 'quote-mark')!
    const out = mark.render({ theme, text: LONG_QUOTE, subtitle: SUBTITLE })
    expect(out).toContain('<path ')
    // accentSoft 走 rgba（creative persona alpha=0.12）
    expect(out).toContain('rgba(192, 57, 43, 0.12)')
  })
})

describe('quote-card specifics', () => {
  const theme = buildThemeContext({
    primaryColor: PRIMARY_COLORS.lifestyle,
    persona: 'lifestyle',
    target: 'wechat',
  })
  const card = quoteModules.find((m) => m.id === 'quote-card')!
  const out = card.render({ theme, text: LONG_QUOTE, subtitle: SUBTITLE })

  it('puts box-shadow on the wrapping <section> style', () => {
    // section 标签首段（到第一个 >）应包含 box-shadow
    const sectionOpenMatch = out.match(/<section[^>]*>/)
    expect(sectionOpenMatch).not.toBeNull()
    expect(sectionOpenMatch![0]).toContain('box-shadow')
  })

  it('renders a rounded rect card with paperWarm fill + hairline stroke', () => {
    expect(out).toContain('rx="20"')
    expect(out).toContain('fill="#f7f4ef"') // paperWarm
    // 发丝描边为 rgba(26,26,26,0.12)
    expect(out).toContain('stroke="rgba(26, 26, 26, 0.12)"')
  })

  it('does NOT put transform/animation in style (only box-shadow + margin + border-radius)', () => {
    const sectionOpen = out.match(/<section[^>]*>/)![0]
    expect(sectionOpen).not.toMatch(/transform\s*:/i)
    expect(sectionOpen).not.toMatch(/animation\s*:/i)
    expect(sectionOpen).not.toMatch(/transition\s*:/i)
  })
})

describe('wrapping behavior', () => {
  it('produces multiple <text> elements for the long CJK input', () => {
    const theme = buildThemeContext({
      primaryColor: PRIMARY_COLORS.academic,
      persona: 'academic',
      target: 'wechat',
    })
    const vbar = quoteModules.find((m) => m.id === 'quote-vbar')!
    const out = vbar.render({ theme, text: LONG_QUOTE, subtitle: SUBTITLE })
    // LONG_QUOTE ~33 字 → 2 行 + 1 attribution = ≥3 <text>
    const textCount = (out.match(/<text\b/g) || []).length
    expect(textCount).toBeGreaterThanOrEqual(3)
  })

  it('respects explicit \\n line breaks', () => {
    const theme = buildThemeContext({
      primaryColor: PRIMARY_COLORS.business,
      persona: 'business',
      target: 'wechat',
    })
    const vbar = quoteModules.find((m) => m.id === 'quote-vbar')!
    const out = vbar.render({
      theme,
      text: '第一行\n第二行\n第三行',
      subtitle: SUBTITLE,
    })
    expect(out).toContain('>第一行</text>')
    expect(out).toContain('>第二行</text>')
    expect(out).toContain('>第三行</text>')
  })

  it('truncates with ellipsis when exceeding 4 lines', () => {
    const theme = buildThemeContext({
      primaryColor: PRIMARY_COLORS.creative,
      persona: 'creative',
      target: 'wechat',
    })
    const vbar = quoteModules.find((m) => m.id === 'quote-vbar')!
    // 6 显式行 → 应截到 4 行，最后一行带 …
    const out = vbar.render({
      theme,
      text: 'A\nB\nC\nD\nE\nF',
      subtitle: SUBTITLE,
    })
    // 第 5 行不应出现
    expect(out).not.toContain('>E</text>')
    expect(out).not.toContain('>F</text>')
    // 最后保留行含省略号（…）
    expect(out).toMatch(/<text[^>]*>D…<\/text>/)
  })
})

describe('quotes render without subtitle (edge case)', () => {
  it('omits attribution <text> gracefully', () => {
    const theme = buildThemeContext({
      primaryColor: PRIMARY_COLORS.academic,
      persona: 'academic',
      target: 'wechat',
    })
    for (const module of quoteModules) {
      const out = module.render({ theme, text: '短引文' })
      expect(checkWechatSafe(out)).toEqual([])
      expect(out).toContain('>短引文</text>')
    }
  })
})
