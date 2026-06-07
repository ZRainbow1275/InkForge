import { describe, it, expect } from 'vitest'
import { dividerModules } from '../dividers'
import { buildThemeContext } from '../theme'
import { checkWechatSafe } from '../wechat-safe'
import type { PresetPersona } from '@/types'

const PRIMARY: Record<PresetPersona, string> = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
}

const PERSONAS: PresetPersona[] = ['academic', 'business', 'lifestyle', 'creative']

describe('dividerModules registry', () => {
  it('exports exactly 5 variants in the divider family with the expected ids', () => {
    expect(dividerModules).toHaveLength(5)
    expect(dividerModules.map((m) => m.id).sort()).toEqual(
      ['divider-diamond', 'divider-dots', 'divider-fade', 'divider-forge', 'divider-grid'].sort(),
    )
    for (const m of dividerModules) {
      expect(m.family).toBe('divider')
      expect(typeof m.description).toBe('string')
      expect(m.description.length).toBeGreaterThan(0)
    }
  })
})

describe('dividerModules × persona — wechat-safe & required scaffolding', () => {
  for (const m of dividerModules) {
    for (const persona of PERSONAS) {
      it(`${m.id} / ${persona} renders zero wechat violations`, () => {
        const theme = buildThemeContext({ primaryColor: PRIMARY[persona], persona, target: 'wechat' })
        const out = m.render({ theme })

        // 安全子集零违规
        expect(checkWechatSafe(out)).toEqual([])

        // 强制脚手架
        expect(out).toContain(`data-ink-svg="${m.id}"`)
        expect(out).toContain('viewBox=')
        expect(out).toContain('width="100%"')

        // 禁用结构
        expect(out).not.toContain('<div')
        expect(out).not.toContain('<linearGradient')
        expect(out).not.toContain('<defs')
        expect(out).not.toContain('<filter')
        expect(out).not.toContain('url(#')

        // 颜色取自 palette（hex 或 rgba），不出现 CSS var()
        expect(out).not.toContain('var(--')
      })
    }
  }
})

describe('divider-grid', () => {
  const theme = buildThemeContext({ primaryColor: PRIMARY.business, persona: 'business', target: 'wechat' })
  const out = dividerModules.find((m) => m.id === 'divider-grid')!.render({ theme })

  it('uses multiple hairline rects forming a grid', () => {
    const rects = (out.match(/<rect /g) || []).length
    // 基线 1 + 刻度 ≥ 5 + accent 长竖 1
    expect(rects).toBeGreaterThanOrEqual(7)
  })

  it('includes accent color from theme on the long tick', () => {
    expect(out).toContain(theme.palette.accent)
  })
})

describe('divider-dots', () => {
  const theme = buildThemeContext({ primaryColor: PRIMARY.lifestyle, persona: 'lifestyle', target: 'wechat' })
  const out = dividerModules.find((m) => m.id === 'divider-dots')!.render({ theme })

  it('contains multiple <circle> elements (≥5 dots)', () => {
    const circles = (out.match(/<circle /g) || []).length
    expect(circles).toBeGreaterThanOrEqual(5)
  })

  it('center circle uses the accent color', () => {
    expect(out).toContain(theme.palette.accent)
  })
})

describe('divider-fade', () => {
  const theme = buildThemeContext({ primaryColor: PRIMARY.academic, persona: 'academic', target: 'wechat' })
  const out = dividerModules.find((m) => m.id === 'divider-fade')!.render({ theme })

  it('contains many <rect> segments (multi-step opacity fade, NOT a gradient)', () => {
    const rects = (out.match(/<rect /g) || []).length
    // 21 段中央最浓，两端淡到被过滤，应仍有 ≥7 段
    expect(rects).toBeGreaterThanOrEqual(7)
  })

  it('NEVER emits <linearGradient>', () => {
    expect(out).not.toContain('<linearGradient')
  })

  it('uses varied opacity values to fake the gradient', () => {
    const opacities = new Set(out.match(/opacity="[\d.]+"/g) || [])
    expect(opacities.size).toBeGreaterThanOrEqual(2)
  })
})

describe('divider-diamond', () => {
  const theme = buildThemeContext({ primaryColor: PRIMARY.creative, persona: 'creative', target: 'wechat' })
  const out = dividerModules.find((m) => m.id === 'divider-diamond')!.render({ theme })

  it('contains at least 3 <path> (central big + 2 flanking small brand diamonds)', () => {
    const paths = (out.match(/<path /g) || []).length
    expect(paths).toBeGreaterThanOrEqual(3)
  })

  it('central diamond uses solid accent; flanks use accentSoft (brand motif, heavier)', () => {
    expect(out).toContain(`fill="${theme.palette.accent}"`)
    expect(out).toContain(`fill="${theme.palette.accentSoft}"`)
  })

  it('has 2 hairline rect rules flanking the signature', () => {
    const rects = (out.match(/<rect /g) || []).length
    expect(rects).toBeGreaterThanOrEqual(2)
  })
})

describe('divider-grid (brand 2×2 motif)', () => {
  const theme = buildThemeContext({ primaryColor: PRIMARY.business, persona: 'business', target: 'wechat' })
  const out = dividerModules.find((m) => m.id === 'divider-grid')!.render({ theme })

  it('renders a 2×2 grid motif (accent solid cell + soft cell + frame/cross)', () => {
    expect(out).toContain(`fill="${theme.palette.accent}"`)
    expect(out).toContain(`fill="${theme.palette.accentSoft}"`)
    // 多 rect（实心 2 格 + 外框 4 + 十字 2 + 两侧 hairline 2 = 10）
    const rects = (out.match(/<rect /g) || []).length
    expect(rects).toBeGreaterThanOrEqual(8)
  })
})

describe('divider-forge (enlarged brand ember dot)', () => {
  const theme = buildThemeContext({ primaryColor: PRIMARY.creative, persona: 'creative', target: 'wechat' })
  const out = dividerModules.find((m) => m.id === 'divider-forge')!.render({ theme })

  it('enlarges the ember dot (r=6) and accentSoft halo (r=22), ember still once', () => {
    expect(out).toContain('r="6"')
    expect(out).toContain('r="22"')
    expect(out).toContain(`fill="${theme.palette.accentSoft}"`)
    const occurrences = out.split(theme.palette.ember).length - 1
    expect(occurrences).toBe(1)
  })
})

describe('divider-forge', () => {
  const theme = buildThemeContext({ primaryColor: PRIMARY.business, persona: 'business', target: 'wechat' })
  const out = dividerModules.find((m) => m.id === 'divider-forge')!.render({ theme })

  it('uses ember exactly once (≤1 per module rule)', () => {
    const ember = theme.palette.ember
    // 在输出里出现的次数
    const occurrences = out.split(ember).length - 1
    expect(occurrences).toBe(1)
  })

  it('uses a low-opacity glow <circle> (no <filter>)', () => {
    expect(out).toContain('<circle ')
    expect(out).not.toContain('<filter')
  })

  it('has hairline rules on both sides', () => {
    const rects = (out.match(/<rect /g) || []).length
    expect(rects).toBeGreaterThanOrEqual(2)
  })
})

describe('optional centered label via p.text', () => {
  const theme = buildThemeContext({ primaryColor: PRIMARY.business, persona: 'business', target: 'wechat' })

  for (const m of dividerModules) {
    it(`${m.id} renders the label when p.text is provided`, () => {
      const out = m.render({ theme, text: 'INTERLUDE' })
      expect(out).toContain('<text ')
      expect(out).toContain('INTERLUDE')
      expect(checkWechatSafe(out)).toEqual([])
    })

    it(`${m.id} omits <text> when p.text is empty/undefined`, () => {
      const out = m.render({ theme })
      // 默认不画 label → 不应含 <text
      expect(out).not.toContain('<text ')
    })
  }
})

describe('divider-forge — gated SMIL breathing on the ember dot (motion ON only)', () => {
  const forge = dividerModules.find((m) => m.id === 'divider-forge')!

  it('motion=true (wechat): wraps ember dot in <g> + opacity breathing animate (indefinite)', () => {
    const theme = buildThemeContext({
      primaryColor: PRIMARY.creative,
      persona: 'creative',
      target: 'wechat',
    })
    const out = forge.render({ theme })
    // 呼吸 animate（循环、opacity、0s 起始、indefinite 循环）
    expect(out).toMatch(/<animate[^>]+attributeName="opacity"/)
    expect(out).toContain('values="0.55;1;0.55"')
    expect(out).toContain('dur="3.2s"')
    expect(out).toContain('begin="0s"')
    expect(out).toContain('repeatCount="indefinite"')
    // ember 出现仍只 1 次（同一颗点）
    const occurrences = out.split(theme.palette.ember).length - 1
    expect(occurrences).toBe(1)
    // wechat-safe
    expect(checkWechatSafe(out)).toEqual([])
  })

  it('motion=false (xhs): NO <animate>, output is unchanged from pre-motion baseline', () => {
    const theme = buildThemeContext({
      primaryColor: PRIMARY.creative,
      persona: 'creative',
      target: 'xhs',
    })
    const out = forge.render({ theme })
    expect(out).not.toContain('<animate')
    // 仍含 ember 点、光晕、两侧细线
    expect(out).toContain('<circle ')
    expect(out).toContain(theme.palette.ember)
  })
})

describe('non-forge dividers stay byte-identical across motion states (zero regression)', () => {
  const nonForge = dividerModules.filter((m) => m.id !== 'divider-forge')
  const personas: PresetPersona[] = ['academic', 'business', 'lifestyle', 'creative']

  for (const m of nonForge) {
    for (const persona of personas) {
      it(`${m.id} / ${persona}: wechat (motion=true) === xhs (motion=false) byte-for-byte`, () => {
        const themeMotion = buildThemeContext({ primaryColor: PRIMARY[persona], persona, target: 'wechat' })
        const themeStatic = buildThemeContext({ primaryColor: PRIMARY[persona], persona, target: 'xhs' })
        expect(m.render({ theme: themeMotion })).toBe(m.render({ theme: themeStatic }))
      })
    }
  }
})
