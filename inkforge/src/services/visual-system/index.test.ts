import { describe, expect, it } from 'vitest'
import { FONT_STACK_PROFILES, TYPOGRAPHY_PRESETS, buildVisualSystemTokens, resolveTypographyPresetId } from './index'
import type { AppearanceSettings } from '@/stores/settings'

const APPEARANCE: AppearanceSettings = {
  theme: 'light',
  fontFamily: 'wenkai',
  fontSize: 16,
  lineHeight: 1.8,
  accentColor: '#D32F2F',
  sidebarWidth: 240,
  reducedMotion: false,
  typography: {
    fontSize: 18,
    lineHeight: 1.9,
    letterSpacing: 0.02,
    paragraphSpacing: 24,
    paragraphIndent: true,
    textAlign: 'justify',
    listSpacing: 12,
    headingScale: 'display',
    headingStyle: 'marker',
    blockquoteStyle: 'card',
    dividerStyle: 'ornament',
    mediaStyle: 'framed',
  },
}

describe('visual-system typography', () => {
  it('offers a cross-platform-safe font stack matrix with deterministic fallbacks', () => {
    expect(Object.keys(FONT_STACK_PROFILES)).toEqual([
      'sans',
      'serif',
      'kai',
      'fangsong',
      'wenkai',
      'humanist',
      'mono',
    ])
    expect(FONT_STACK_PROFILES.wenkai.css).toContain('LXGW WenKai')
    expect(FONT_STACK_PROFILES.fangsong.css).toContain('FangSong')
    expect(FONT_STACK_PROFILES.humanist.css).toContain('HarmonyOS Sans SC')
  })

  it('keeps every typography preset complete and uniquely matchable', () => {
    expect(TYPOGRAPHY_PRESETS).toHaveLength(6)
    const signatures = new Set(TYPOGRAPHY_PRESETS.map(preset => JSON.stringify(preset.typography)))
    expect(signatures.size).toBe(TYPOGRAPHY_PRESETS.length)

    for (const preset of TYPOGRAPHY_PRESETS) {
      expect(resolveTypographyPresetId(preset.typography)).toBe(preset.id)
      expect(preset.typography).toEqual(expect.objectContaining({
        textAlign: expect.any(String),
        listSpacing: expect.any(Number),
        headingScale: expect.any(String),
        dividerStyle: expect.any(String),
        mediaStyle: expect.any(String),
      }))
    }
  })

  it('projects every canonical typography field into the live token pipeline', () => {
    const snapshot = buildVisualSystemTokens(APPEARANCE)

    expect(snapshot.tokens).toMatchObject({
      '--font-body': FONT_STACK_PROFILES.wenkai.css,
      '--typography-text-align': 'justify',
      '--typography-list-spacing': '12px',
      '--typography-heading-scale': 'display',
      '--typography-heading-style': 'marker',
      '--typography-blockquote-style': 'card',
      '--typography-divider-style': 'ornament',
      '--typography-media-style': 'framed',
    })
  })
})
