/**
 * covers.test.ts — cover-* 模块族（cover-title / cover-grid / cover-quote）
 *
 * 守护项：
 *  - 4 persona × 3 变体 = 12 组组合，全部通过 checkWechatSafe()（零违规 = AC9 执行体）。
 *  - 含 data-ink-svg / viewBox / width="100%" / <section> 包裹；绝不出现 <div>。
 *  - cover-grid 必含多 <rect>（网格细线）；cover-quote 必含 <path>（引号字形）+ 多 <text>。
 */
import { describe, it, expect } from 'vitest'
import { coverModules } from '../covers'
import { buildThemeContext } from '../theme'
import { checkWechatSafe } from '../wechat-safe'
import type { PresetPersona } from '@/types'

const primaryColors: Record<PresetPersona, string> = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
}

const personas: PresetPersona[] = ['academic', 'business', 'lifestyle', 'creative']

const SAMPLE_TEXT = '标题示例：成为作者吧'
const SAMPLE_SUBTITLE = '副标题 / 导语'

describe('coverModules registry', () => {
  it('exports exactly 3 cover variants with family="cover" and stable ids', () => {
    expect(coverModules).toHaveLength(3)
    const ids = coverModules.map((m) => m.id)
    expect(ids).toEqual(['cover-title', 'cover-grid', 'cover-quote'])
    for (const m of coverModules) {
      expect(m.family).toBe('cover')
      expect(typeof m.description).toBe('string')
      expect(typeof m.render).toBe('function')
    }
  })
})

describe('cover modules × persona — wechat-safe matrix', () => {
  for (const m of coverModules) {
    for (const persona of personas) {
      it(`${m.id} × ${persona} renders zero wechat-safe violations`, () => {
        const theme = buildThemeContext({
          primaryColor: primaryColors[persona],
          persona,
          target: 'wechat',
        })
        const out = m.render({ theme, text: SAMPLE_TEXT, subtitle: SAMPLE_SUBTITLE })

        // 零违规（AC9）
        expect(checkWechatSafe(out)).toEqual([])

        // 必要哨兵 / 自适应保证
        expect(out).toContain(`data-ink-svg="${m.id}"`)
        expect(out).toContain('viewBox="0 0 1080 620"')
        expect(out).toContain('width="100%"')
        expect(out).toContain('<section')

        // 绝不出现 <div>（微信会改写）
        expect(out).not.toContain('<div')
      })
    }
  }
})

describe('cover-title shape requirements', () => {
  it('includes a diamond accent (single <path>) and big-type title text', () => {
    const m = coverModules.find((c) => c.id === 'cover-title')!
    const theme = buildThemeContext({ primaryColor: primaryColors.business, persona: 'business', target: 'wechat' })
    const out = m.render({ theme, text: SAMPLE_TEXT, subtitle: SAMPLE_SUBTITLE })

    // 一个菱形签名 = 一个 <path>
    const pathCount = (out.match(/<path /g) || []).length
    expect(pathCount).toBeGreaterThanOrEqual(1)
    // 标题文本可见
    expect(out).toContain('标题')
    // 字号 96（big type）出现
    expect(out).toContain('font-size="96"')
  })
})

describe('cover-grid shape requirements', () => {
  const m = coverModules.find((c) => c.id === 'cover-grid')!
  const theme = buildThemeContext({ primaryColor: primaryColors.academic, persona: 'academic', target: 'wechat' })
  const out = m.render({ theme, text: SAMPLE_TEXT, subtitle: SAMPLE_SUBTITLE })

  it('contains multiple <rect> elements for the grid (hairlines + bg + frame)', () => {
    const rectCount = (out.match(/<rect /g) || []).length
    // 至少：1 bg + 5 竖线 + 3 横线 + 4 外框 = 13。给宽松下限 8。
    expect(rectCount).toBeGreaterThanOrEqual(8)
  })

  it('contains an accent dot (circle) as grid intersection mark', () => {
    expect(out).toContain('<circle ')
  })

  it('contains the title text', () => {
    expect(out).toContain('标题')
  })
})

describe('cover-quote shape requirements', () => {
  const m = coverModules.find((c) => c.id === 'cover-quote')!
  const theme = buildThemeContext({ primaryColor: primaryColors.creative, persona: 'creative', target: 'wechat' })

  it('contains <path> (quotation glyph) and multiple <text> (导语 lines + attribution)', () => {
    const out = m.render({ theme, text: '在每一个安静的清晨我们都重新成为作者', subtitle: '鲁迅' })

    // <path> 来自引号字形（两片）
    expect(out).toContain('<path ')
    const pathCount = (out.match(/<path /g) || []).length
    expect(pathCount).toBeGreaterThanOrEqual(2)

    // 多 <text>：至少 2 行导语 + 1 行 attribution
    const textCount = (out.match(/<text /g) || []).length
    expect(textCount).toBeGreaterThanOrEqual(2)

    // 署名前缀
    expect(out).toContain('— 鲁迅')
  })

  it('splits long 导语 into ~16-char lines and tops out at 4 lines (… truncation)', () => {
    // 80 字 → 至多 4 行，必须含 '…'
    const longText = '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十'
    const out = m.render({ theme, text: longText, subtitle: SAMPLE_SUBTITLE })
    const textCount = (out.match(/<text /g) || []).length
    // 至多 4 行 + 署名 = 5 个 <text>
    expect(textCount).toBeLessThanOrEqual(5)
    expect(out).toContain('…')
  })
})
