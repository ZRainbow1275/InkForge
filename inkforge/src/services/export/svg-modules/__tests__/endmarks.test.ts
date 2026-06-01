/**
 * endmarks.test —— 三变体 × 四 persona 微信安全 + 几何契约。
 *
 * 见 prompts/0601/SPEC.md §8 与本目录 endmarks.ts。
 */
import { describe, it, expect } from 'vitest'
import type { PresetPersona } from '@/types'
import { buildThemeContext } from '../theme'
import { checkWechatSafe } from '../wechat-safe'
import { endmarkModules } from '../endmarks'

const primaryColors: Record<PresetPersona, string> = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
}
const personas: PresetPersona[] = ['academic', 'business', 'lifestyle', 'creative']

describe('endmarkModules — count + ids', () => {
  it('exposes exactly three endmark variants with stable ids', () => {
    expect(endmarkModules.map((m) => m.id)).toEqual(['endmark-fin', 'endmark-vessel', 'endmark-rule'])
    for (const m of endmarkModules) expect(m.family).toBe('endmark')
  })
})

describe('endmarkModules — wechat-safe + scaffold contract', () => {
  for (const mod of endmarkModules) {
    for (const persona of personas) {
      it(`${mod.id} / ${persona} : zero wechat-safe violations + has scaffold attrs`, () => {
        const theme = buildThemeContext({
          primaryColor: primaryColors[persona],
          persona,
          target: 'wechat',
        })
        const out = mod.render({ theme, subtitle: 'InkForge · 墨铸' })

        // 安全子集零违规
        expect(checkWechatSafe(out)).toEqual([])

        // 模块根脚手架
        expect(out).toContain('data-ink-svg')
        expect(out).toContain(`data-ink-svg="${mod.id}"`)
        expect(out).toContain('viewBox')
        expect(out).toContain('width="100%"')

        // 严禁 <div>（微信改写）
        expect(out).not.toContain('<div')
      })
    }
  }
})

describe('endmark-fin geometry', () => {
  const theme = buildThemeContext({
    primaryColor: primaryColors.academic,
    persona: 'academic',
    target: 'wechat',
  })
  const out = endmarkModules.find((m) => m.id === 'endmark-fin')!.render({ theme })

  it('renders ≥3 <path (diamond signature) and the 「全文完」 text', () => {
    const pathCount = (out.match(/<path /g) || []).length
    expect(pathCount).toBeGreaterThanOrEqual(3)
    expect(out).toContain('全文完')
  })
})

describe('endmark-vessel geometry', () => {
  const theme = buildThemeContext({
    primaryColor: primaryColors.creative,
    persona: 'creative',
    target: 'wechat',
  })
  const out = endmarkModules
    .find((m) => m.id === 'endmark-vessel')!
    .render({ theme, subtitle: 'InkForge · 墨铸' })

  it('contains <path geometry for the vessel mark (鼎×笔尖×方格)', () => {
    expect(out).toContain('<path ')
  })

  it('does NOT compose itself as three stacked full-width stripe rects (国旗陷阱)', () => {
    // 国旗陷阱判定：禁止任何 rect 的 width 接近 viewBox 全宽（≥800/1080）。
    // svgSection 用的是 width="100%" + viewBox，故内部 rect 的 width 都是 viewBox 单位。
    const rectMatches = out.match(/<rect [^>]*width="(\d+(?:\.\d+)?)"[^>]*>/g) || []
    const fullWidthish = rectMatches.filter((r) => {
      const m = r.match(/width="(\d+(?:\.\d+)?)"/)
      if (!m) return false
      return Number(m[1]) >= 800
    })
    expect(fullWidthish.length).toBe(0)
  })

  it('carries the subtitle wordmark', () => {
    expect(out).toContain('InkForge')
    expect(out).toContain('墨铸')
  })
})
