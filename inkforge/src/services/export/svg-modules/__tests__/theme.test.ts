import { describe, it, expect } from 'vitest'
import {
  normalizeHex,
  hexToRgb,
  rgba,
  relativeLuminance,
  darkenForWhiteText,
  deriveSvgPalette,
  buildThemeContext,
  BRAND_TOKENS,
} from '../theme'

/** WCAG 对比度（与 theme.ts 内私有实现等价；测试自算 accentDeep 白字 CR）。 */
function whiteContrast(hex: string): number {
  const lw = relativeLuminance('#ffffff')
  const lc = relativeLuminance(hex)
  const hi = Math.max(lw, lc)
  const lo = Math.min(lw, lc)
  return (hi + 0.05) / (lo + 0.05)
}

describe('theme color utils', () => {
  it('normalizeHex expands shorthand and lowercases, falls back on bad input', () => {
    expect(normalizeHex('#ABC')).toBe('aabbcc')
    expect(normalizeHex('C9362C')).toBe('c9362c')
    expect(normalizeHex('xyz')).toBe('000000') // non-hex chars
    expect(normalizeHex('nothex')).toBe('000000')
    expect(normalizeHex('')).toBe('000000')
  })

  it('hexToRgb parses correctly', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#c9362c')).toEqual({ r: 201, g: 54, b: 44 })
  })

  it('rgba clamps alpha and formats stably', () => {
    expect(rgba('#c9362c', 0.08)).toBe('rgba(201, 54, 44, 0.08)')
    expect(rgba('#000000', 2)).toBe('rgba(0, 0, 0, 1)')
    expect(rgba('#000000', -1)).toBe('rgba(0, 0, 0, 0)')
  })

  it('relativeLuminance: white brighter than black', () => {
    expect(relativeLuminance('#ffffff')).toBeGreaterThan(relativeLuminance('#000000'))
  })
})

describe('deriveSvgPalette', () => {
  it('normalizes accent and picks white onAccent for dark color', () => {
    const p = deriveSvgPalette('#004080', 'business')
    expect(p.accent).toBe('#004080')
    expect(p.onAccent).toBe('#ffffff')
    expect(p.paperWarm).toBe(BRAND_TOKENS.paperWarmLight)
    expect(p.ember).toBe(BRAND_TOKENS.emberLight)
    expect(p.accentSoft).toContain('rgba(0, 64, 128')
  })

  it('picks ink onAccent for light color', () => {
    const p = deriveSvgPalette('#ffe4e6', 'creative')
    expect(p.onAccent).toBe('#1a1a1a')
  })

  // 白优先 + AA 大字门槛 3.0：实色填充条/chip 文字。三个旗舰预设的边界行为锁定，
  // 保证「饱和实色条用醒目白字」的设计一致性，同时把白字达不到 AA 大字的中明度
  // 暖色（Amber）回退到墨字（可达性）。非每预设硬编码，纯对比度门槛驱动。
  it('flagship onAccent: white-preferred with a 3.0 AA-large floor', () => {
    // Kiln #D95B3F：白 CR≈3.81 ≥ 3.0 → 白（最强处理保留白字冲击力）
    expect(deriveSvgPalette('#D95B3F', 'creative').onAccent).toBe('#ffffff')
    // Tempera #3B7A6B：白 CR≈5.02 → 白
    expect(deriveSvgPalette('#3B7A6B', 'academic').onAccent).toBe('#ffffff')
    // Amber #C19A56：白 CR≈2.0 < 3.0 → 墨（白字连 AA 大字都不到，墨 CR≈6.65）
    expect(deriveSvgPalette('#C19A56', 'business').onAccent).toBe('#1a1a1a')
  })

  it('persona affects accentSoft alpha (creative/lifestyle stronger)', () => {
    expect(deriveSvgPalette('#004080', 'academic').accentSoft).toContain('0.08')
    expect(deriveSvgPalette('#004080', 'business').accentSoft).toContain('0.08')
    expect(deriveSvgPalette('#004080', 'creative').accentSoft).toContain('0.12')
    expect(deriveSvgPalette('#004080', 'lifestyle').accentSoft).toContain('0.12')
  })

  it('is a pure function (same input → deep equal output)', () => {
    expect(deriveSvgPalette('#5a4a3c', 'academic')).toEqual(deriveSvgPalette('#5a4a3c', 'academic'))
  })

  // accentDeep：满幅反白块/色带封面专用深色 accent，白字 CR≥4.5（不硬编码 hex，
  // 让算法算；只断言「白字 CR≥4.5」+「amber accentDeep≠accent」+ 确定性）。
  it('accentDeep guarantees white-text CR ≥ 4.5 for all 3 flagships', () => {
    for (const [primary, persona] of [
      ['#D95B3F', 'creative'],
      ['#3B7A6B', 'academic'],
      ['#C19A56', 'business'],
    ] as const) {
      const p = deriveSvgPalette(primary, persona)
      expect(whiteContrast(p.accentDeep)).toBeGreaterThanOrEqual(4.5)
      // 6 位 hex（带 #）
      expect(p.accentDeep).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('amber accentDeep is darkened away from accent (white CR was below 4.5)', () => {
    const amber = deriveSvgPalette('#C19A56', 'business')
    expect(amber.accentDeep).not.toBe(amber.accent)
    // kiln 白 CR 3.81 < 4.5 → 也必被加深
    const kiln = deriveSvgPalette('#D95B3F', 'creative')
    expect(kiln.accentDeep).not.toBe(kiln.accent)
  })

  it('tempera accentDeep stays equal to accent (white CR already ≥ 4.5, t=0)', () => {
    const tempera = deriveSvgPalette('#3B7A6B', 'academic')
    expect(tempera.accentDeep).toBe(tempera.accent)
  })

  it('darkenForWhiteText is deterministic (same input → same output)', () => {
    expect(darkenForWhiteText('#C19A56')).toBe(darkenForWhiteText('#C19A56'))
    expect(darkenForWhiteText('#D95B3F')).toBe(darkenForWhiteText('#D95B3F'))
    // 已达标的色不变（白字 CR≥4.5 → t=0）
    expect(darkenForWhiteText('#000000')).toBe('#000000')
  })
})

describe('buildThemeContext', () => {
  it('allowMotion true for preview/wechat, false for xhs/zhihu', () => {
    const base = { primaryColor: '#004080', persona: 'business' as const }
    expect(buildThemeContext({ ...base, target: 'wechat' }).allowMotion).toBe(true)
    expect(buildThemeContext({ ...base, target: 'preview' }).allowMotion).toBe(true)
    expect(buildThemeContext({ ...base, target: 'xhs' }).allowMotion).toBe(false)
    expect(buildThemeContext({ ...base, target: 'zhihu' }).allowMotion).toBe(false)
  })

  it('carries palette + accentColor through', () => {
    const ctx = buildThemeContext({ primaryColor: '#c0392b', persona: 'creative', target: 'wechat', accentColor: '#ffe4e6' })
    expect(ctx.palette.accent).toBe('#c0392b')
    expect(ctx.accentColor).toBe('#ffe4e6')
    expect(ctx.target).toBe('wechat')
  })
})
