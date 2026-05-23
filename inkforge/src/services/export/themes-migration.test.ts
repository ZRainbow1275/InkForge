import { describe, it, expect } from 'vitest'
import { themePresets, generateThemeCSS, getPresetById } from './themes'
import { xiaohongshuPresets } from './xiaohongshu'
import { getZhihuPresets } from './zhihu'

const WECHAT_IDS = [
  'thesis',
  'legal',
  'report',
  'commentary',
  'aigc',
  'code',
  'notes',
  'news',
  'meme',
  'life',
  'elegant',
  'tech',
]

const XHS_IDS = ['xhs-fresh', 'xhs-simple', 'xhs-warm', 'xhs-tech', 'xhs-nature']

const ZHIHU_IDS = ['zhihu-academic', 'zhihu-tech', 'zhihu-insight']

const ALL_PERSONAS = ['academic', 'business', 'lifestyle', 'creative']

describe('PR4 migration — all 12 wechat presets have dual-track schema', () => {
  for (const id of WECHAT_IDS) {
    describe(id, () => {
      const preset = getPresetById(id)

      it('exists', () => {
        expect(preset).toBeDefined()
      })

      it('has persona populated', () => {
        expect(preset?.persona).toBeDefined()
        expect(ALL_PERSONAS).toContain(preset?.persona)
      })

      it('has fonts populated', () => {
        expect(preset?.fonts).toBeDefined()
        expect(preset?.fonts?.cjk.length).toBeGreaterThan(0)
        expect(preset?.fonts?.latin.length).toBeGreaterThan(0)
      })

      it('has non-empty previewCSS', () => {
        expect(preset?.previewCSS).toBeDefined()
        expect(preset?.previewCSS?.length).toBeGreaterThan(0)
      })

      it('has non-empty exportCSS', () => {
        expect(preset?.exportCSS).toBeDefined()
        expect(preset?.exportCSS?.length).toBeGreaterThan(0)
      })

      it('has decorate function', () => {
        expect(typeof preset?.decorate).toBe('function')
      })

      it('exportCSS contains 22em line-length lock from persona base', () => {
        expect(preset?.exportCSS).toContain('max-width: min(22em')
      })

      it('exportCSS does not use CSS variables', () => {
        expect(preset?.exportCSS).not.toMatch(/var\(--/)
      })

      it('generateThemeCSS(preset, "export") returns non-empty', () => {
        if (!preset) throw new Error('preset missing')
        const css = generateThemeCSS(preset, 'export')
        expect(css.length).toBeGreaterThan(0)
        expect(css).toContain('#nice')
      })

      it('generateThemeCSS(preset, "preview") returns non-empty', () => {
        if (!preset) throw new Error('preset missing')
        const css = generateThemeCSS(preset, 'preview')
        expect(css.length).toBeGreaterThan(0)
        expect(css).toContain('#nice')
      })

      it('keeps legacy customCSS for back-compat', () => {
        // Some presets may have empty string customCSS; only require it be defined.
        expect(preset?.customCSS).toBeDefined()
      })
    })
  }

  it('themePresets array has 12 wechat presets', () => {
    expect(themePresets).toHaveLength(12)
  })
})

describe('PR4 migration — all 5 xhs presets have dual-track schema', () => {
  for (const id of XHS_IDS) {
    describe(id, () => {
      const preset = xiaohongshuPresets.find(p => p.id === id)

      it('exists', () => {
        expect(preset).toBeDefined()
      })

      it('has persona populated', () => {
        expect(preset?.persona).toBeDefined()
        expect(ALL_PERSONAS).toContain(preset?.persona)
      })

      it('has fonts populated', () => {
        expect(preset?.fonts).toBeDefined()
        expect(preset?.fonts?.cjk.length).toBeGreaterThan(0)
        expect(preset?.fonts?.latin.length).toBeGreaterThan(0)
      })

      it('has non-empty previewCSS targeting #xhs-note', () => {
        expect(preset?.previewCSS).toBeDefined()
        expect(preset?.previewCSS?.length).toBeGreaterThan(0)
        expect(preset?.previewCSS).toContain('#xhs-note')
      })

      it('has non-empty exportCSS targeting #xhs-note', () => {
        expect(preset?.exportCSS).toBeDefined()
        expect(preset?.exportCSS?.length).toBeGreaterThan(0)
        expect(preset?.exportCSS).toContain('#xhs-note')
      })

      it('has decorate function', () => {
        expect(typeof preset?.decorate).toBe('function')
      })

      it('exportCSS does not use CSS variables', () => {
        expect(preset?.exportCSS).not.toMatch(/var\(--/)
      })
    })
  }

  it('xiaohongshuPresets array has 5 xhs presets', () => {
    expect(xiaohongshuPresets).toHaveLength(5)
  })
})

describe('PR4 migration — all 3 zhihu presets have dual-track schema', () => {
  const zhihuPresets = getZhihuPresets()

  for (const id of ZHIHU_IDS) {
    describe(id, () => {
      const preset = zhihuPresets.find(p => p.id === id)

      it('exists', () => {
        expect(preset).toBeDefined()
      })

      it('has persona populated', () => {
        expect(preset?.persona).toBeDefined()
        expect(ALL_PERSONAS).toContain(preset?.persona)
      })

      it('has fonts populated', () => {
        expect(preset?.fonts).toBeDefined()
        expect(preset?.fonts?.cjk.length).toBeGreaterThan(0)
        expect(preset?.fonts?.latin.length).toBeGreaterThan(0)
      })

      it('has non-empty previewCSS targeting #zhihu-answer', () => {
        expect(preset?.previewCSS).toBeDefined()
        expect(preset?.previewCSS?.length).toBeGreaterThan(0)
        expect(preset?.previewCSS).toContain('#zhihu-answer')
      })

      it('has non-empty exportCSS targeting #zhihu-answer', () => {
        expect(preset?.exportCSS).toBeDefined()
        expect(preset?.exportCSS?.length).toBeGreaterThan(0)
        expect(preset?.exportCSS).toContain('#zhihu-answer')
      })

      it('has decorate function', () => {
        expect(typeof preset?.decorate).toBe('function')
      })

      it('exportCSS does not use CSS variables', () => {
        expect(preset?.exportCSS).not.toMatch(/var\(--/)
      })
    })
  }

  it('zhihu presets array has 3 entries', () => {
    expect(zhihuPresets).toHaveLength(3)
  })
})
