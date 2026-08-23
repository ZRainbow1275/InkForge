/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'

import { getPlatformPresets } from '@/services/export'
import THEMES_SOURCE from '../ThemesView.vue?raw'

describe('ThemesView canonical preset registry', () => {
  it('uses the shared platform registries and real renderer instead of legacy preview data', () => {
    expect(THEMES_SOURCE).toContain('getPlatformPresets')
    expect(THEMES_SOURCE).toContain('convertToPlatform')
    expect(THEMES_SOURCE).not.toContain('ARTICLE_PRESETS')
    expect(THEMES_SOURCE).not.toContain('useThemeStore')
    expect(THEMES_SOURCE).not.toContain('themeStore.applyPreset')
    expect(THEMES_SOURCE).not.toContain('const previewHtml = computed')
  })

  it('exposes every canonical platform preset family', () => {
    expect(getPlatformPresets('wechat')).toHaveLength(16)
    expect(getPlatformPresets('xiaohongshu')).toHaveLength(5)
    expect(getPlatformPresets('zhihu')).toHaveLength(3)
    expect(THEMES_SOURCE).toContain('v-for="option in PLATFORM_OPTIONS"')
    expect(THEMES_SOURCE).toContain('v-for="theme in themes"')
  })

  it('shows the real visual signature categories in cards and the selected preview', () => {
    expect(THEMES_SOURCE).toContain('visualSignature: preset.visualSignature')
    expect(THEMES_SOURCE).toContain('theme.signatureDetails.slice(0, 3)')
    expect(THEMES_SOURCE).toContain('selectedThemeData.signatureDetails')
    expect(THEMES_SOURCE).toContain('selectedThemeData.visualSignature.modules')
    expect(THEMES_SOURCE).toContain('class="theme-card-motif"')
  })
})
