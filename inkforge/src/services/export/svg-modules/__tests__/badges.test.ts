import { describe, it, expect } from 'vitest'
import { badgeModules } from '../badges'
import { buildThemeContext } from '../theme'
import { checkWechatSafe } from '../wechat-safe'
import type { PresetPersona } from '@/types'

// persona → 品牌色板（同步 prompts/0601 旗舰预设思路；每 persona 拿一个代表色）
const primaryColors: Record<PresetPersona, string> = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
}

const personas = Object.keys(primaryColors) as PresetPersona[]

describe('badgeModules — registry shape', () => {
  it('exports exactly 3 badge variants with the expected ids', () => {
    expect(badgeModules).toHaveLength(3)
    const ids = badgeModules.map((m) => m.id).sort()
    expect(ids).toEqual(['badge-kpi', 'badge-num', 'badge-tag'])
    for (const m of badgeModules) {
      expect(m.family).toBe('badge')
      expect(typeof m.render).toBe('function')
      expect(m.description.length).toBeGreaterThan(0)
    }
  })
})

describe('badgeModules — wechat-safe across modules × personas', () => {
  for (const m of badgeModules) {
    for (const persona of personas) {
      it(`${m.id} / ${persona}: zero wechat-safe violations + scaffolding contract`, () => {
        const theme = buildThemeContext({
          primaryColor: primaryColors[persona],
          persona,
          target: 'wechat',
        })
        const out = m.render({ theme, text: '要点', index: 3, subtitle: 'KPI' })

        expect(checkWechatSafe(out)).toEqual([])
        // Scaffolding contract from primitives.svgSection
        expect(out).toContain('data-ink-svg')
        expect(out).toContain(`data-ink-svg="${m.id}"`)
        expect(out).toContain('viewBox')
        expect(out).toContain('width="100%"')
        // <section> wrapper, never <div>
        expect(out).toContain('<section')
        expect(out).not.toContain('<div')
        // accent (= normalized primaryColor) shows up somewhere — palette wiring guard
        expect(out.toLowerCase()).toContain(primaryColors[persona].toLowerCase())
      })
    }
  }
})

describe('badge-num variant specifics', () => {
  const mod = badgeModules.find((m) => m.id === 'badge-num')!

  it('contains a <circle> and renders the supplied index', () => {
    const theme = buildThemeContext({
      primaryColor: primaryColors.academic,
      persona: 'academic',
      target: 'wechat',
    })
    const out = mod.render({ theme, text: '要点', index: 3, subtitle: 'KPI' })
    expect(out).toContain('<circle ')
    // index 3 must appear as the badge number text node
    expect(out).toContain('>3</text>')
  })

  it('still renders (and stays safe) when label is omitted', () => {
    const theme = buildThemeContext({
      primaryColor: primaryColors.business,
      persona: 'business',
      target: 'wechat',
    })
    const out = mod.render({ theme, index: 7 })
    expect(checkWechatSafe(out)).toEqual([])
    expect(out).toContain('<circle ')
    expect(out).toContain('>7</text>')
  })
})

describe('badge-kpi variant specifics', () => {
  const mod = badgeModules.find((m) => m.id === 'badge-kpi')!

  it('contains a rounded rect (rx) and renders both value and subtitle', () => {
    const theme = buildThemeContext({
      primaryColor: primaryColors.creative,
      persona: 'creative',
      target: 'wechat',
    })
    const out = mod.render({ theme, text: '128', subtitle: '篇章' })
    // KPI card rect MUST be rounded
    expect(out).toMatch(/<rect [^>]*\brx="\d+/i)
    expect(out).toContain('>128</text>')
    expect(out).toContain('>篇章</text>')
  })
})

describe('badge-tag variant specifics', () => {
  const mod = badgeModules.find((m) => m.id === 'badge-tag')!

  it('contains a rounded rect (rx) hosting the tag label', () => {
    const theme = buildThemeContext({
      primaryColor: primaryColors.lifestyle,
      persona: 'lifestyle',
      target: 'wechat',
    })
    const out = mod.render({ theme, text: '精选' })
    expect(out).toMatch(/<rect [^>]*\brx="\d+/i)
    expect(out).toContain('>精选</text>')
  })
})
