import { describe, it, expect } from 'vitest'
import {
  normalizeHex,
  hexToRgb,
  rgba,
  relativeLuminance,
  deriveSvgPalette,
  buildThemeContext,
  BRAND_TOKENS,
} from '../theme'

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

  it('persona affects accentSoft alpha (creative/lifestyle stronger)', () => {
    expect(deriveSvgPalette('#004080', 'academic').accentSoft).toContain('0.08')
    expect(deriveSvgPalette('#004080', 'business').accentSoft).toContain('0.08')
    expect(deriveSvgPalette('#004080', 'creative').accentSoft).toContain('0.12')
    expect(deriveSvgPalette('#004080', 'lifestyle').accentSoft).toContain('0.12')
  })

  it('is a pure function (same input → deep equal output)', () => {
    expect(deriveSvgPalette('#5a4a3c', 'academic')).toEqual(deriveSvgPalette('#5a4a3c', 'academic'))
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
