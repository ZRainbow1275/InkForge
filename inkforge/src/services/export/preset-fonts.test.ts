import { describe, it, expect } from 'vitest'
import {
  PERSONA_FONTS,
  FONT_FACE_SPECS,
  generateFontFaceCSS,
  generatePersonaBaseCSS,
} from './preset-fonts'
import type { PresetPersona } from '@/types'

const PERSONAS: PresetPersona[] = ['academic', 'business', 'lifestyle', 'creative']

describe('PERSONA_FONTS', () => {
  it('covers all four personas', () => {
    for (const persona of PERSONAS) {
      expect(PERSONA_FONTS[persona]).toBeDefined()
      expect(PERSONA_FONTS[persona].cjk).toBeTruthy()
      expect(PERSONA_FONTS[persona].latin).toBeTruthy()
    }
  })

  it('uses persona-specific CJK leads', () => {
    expect(PERSONA_FONTS.academic.cjk).toContain('Source Han Serif SC')
    expect(PERSONA_FONTS.business.cjk).toContain('Source Han Sans SC')
    expect(PERSONA_FONTS.lifestyle.cjk).toContain('LXGW WenKai Lite')
    expect(PERSONA_FONTS.creative.cjk).toContain('Smiley Sans')
  })
})

describe('FONT_FACE_SPECS', () => {
  it('declares at least one weight for every bundled family', () => {
    const families = new Set(FONT_FACE_SPECS.map(s => s.family))
    for (const family of [
      'Source Han Serif SC',
      'Source Han Sans SC',
      'LXGW WenKai Lite',
      'Smiley Sans',
      'EB Garamond',
      'Inter',
      'Fraunces',
      'Crimson Pro',
      'Space Grotesk',
    ]) {
      expect(families.has(family)).toBe(true)
    }
  })

  it('points every spec at /fonts/*.woff2', () => {
    for (const spec of FONT_FACE_SPECS) {
      expect(spec.file).toMatch(/^\/fonts\/.+\.woff2$/)
      expect(['swap', 'block', 'fallback']).toContain(spec.fontDisplay)
    }
  })
})

describe('generateFontFaceCSS', () => {
  it('emits one @font-face block per spec', () => {
    const css = generateFontFaceCSS()
    const blocks = css.match(/@font-face\s*\{/g) ?? []
    expect(blocks.length).toBe(FONT_FACE_SPECS.length)
  })

  it('includes family, weight, style, src, and font-display per block', () => {
    const css = generateFontFaceCSS()
    expect(css).toContain("font-family: 'Source Han Serif SC'")
    expect(css).toContain('font-weight: 400')
    expect(css).toContain('font-style: italic')
    expect(css).toContain('font-display: swap')
    expect(css).toContain("format('woff2')")
  })
})

describe('generatePersonaBaseCSS', () => {
  it('produces a #nice block for each persona', () => {
    for (const persona of PERSONAS) {
      const css = generatePersonaBaseCSS(persona)
      expect(css).toContain('#nice {')
      expect(css).toContain('width: 100%')
      expect(css).toContain('max-width: min(24em, calc(100vw - 16px))')
      expect(css).toContain('box-sizing: border-box')
      expect(css).toContain('font-size: 16px')
      expect(css).toContain("font-feature-settings: 'palt'")
    }
  })

  it('keeps a 375px WeChat canvas at the confirmed 22–24 CJK characters per line', () => {
    const css = generatePersonaBaseCSS('academic')
    const viewportWidth = 375
    const horizontalGutter = 16
    const fontSize = 16
    const maxLineWidth = Math.min(24 * fontSize, viewportWidth - horizontalGutter)

    expect(maxLineWidth / fontSize).toBeGreaterThanOrEqual(22)
    expect(maxLineWidth / fontSize).toBeLessThanOrEqual(24)
    expect(css).toContain('overflow-wrap: anywhere')
  })

  it('provides a safe default rule for every supported semantic article element', () => {
    const css = generatePersonaBaseCSS('business')
    for (const selector of [
      '#nice h1,',
      '#nice h2,',
      '#nice h3,',
      '#nice h4,',
      '#nice h5,',
      '#nice h6',
      '#nice del,',
      '#nice code',
      '#nice pre',
      '#nice blockquote',
      '#nice ul,',
      '#nice ol',
      '#nice table',
      '#nice img',
      '#nice figcaption',
      '#nice hr',
      '#nice .katex',
      '#nice .katex-display',
      '#nice .mermaid,',
      '#nice .ink-citation,',
      '#nice .ink-footnotes',
    ]) {
      expect(css).toContain(selector)
    }
  })

  it('uses tighter line-height for academic / business', () => {
    expect(generatePersonaBaseCSS('academic')).toContain('line-height: 1.75')
    expect(generatePersonaBaseCSS('business')).toContain('line-height: 1.75')
  })

  it('uses looser line-height for lifestyle / creative', () => {
    expect(generatePersonaBaseCSS('lifestyle')).toContain('line-height: 1.85')
    expect(generatePersonaBaseCSS('creative')).toContain('line-height: 1.85')
  })

  it('embeds the persona-specific CJK + Latin pair', () => {
    expect(generatePersonaBaseCSS('academic')).toContain('Source Han Serif SC')
    expect(generatePersonaBaseCSS('academic')).toContain('EB Garamond')
    expect(generatePersonaBaseCSS('lifestyle')).toContain('LXGW WenKai Lite')
    expect(generatePersonaBaseCSS('lifestyle')).toContain('Fraunces')
  })
})
