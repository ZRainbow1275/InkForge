/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { generateThemeCSS, themePresets } from '@/services/export/themes'
import { typographyToWechatCss } from '@/services/export/shared-typography'
import { useSettingsStore } from './settings'
import { ARTICLE_PRESETS, useThemeStore } from './theme'
import CMS_TOOLS_SOURCE from '@/components/cms/CMSTools.vue?raw'

describe('legacy theme compatibility projection', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('projects every canonical WeChat preset without a second registry', () => {
    expect(ARTICLE_PRESETS.map(preset => preset.id)).toEqual(
      themePresets.map(preset => preset.id),
    )
  })

  it('migrates a valid legacy preset only when canonical Settings are absent', () => {
    localStorage.setItem('inkforge_theme_preset', 'tech')
    useThemeStore()
    const settingsStore = useSettingsStore()

    expect(settingsStore.settings.export.defaultPlatform).toBe('wechat')
    expect(settingsStore.settings.export.defaultPresetId).toBe('tech')
  })

  it('keeps an existing canonical platform/preset pair ahead of the legacy id', () => {
    localStorage.setItem('inkforge-settings', JSON.stringify({
      export: {
        defaultPlatform: 'xiaohongshu',
        defaultPresetId: 'xhs-warm',
      },
    }))
    localStorage.setItem('inkforge_theme_preset', 'tech')
    const store = useThemeStore()
    const settingsStore = useSettingsStore()

    expect(settingsStore.settings.export.defaultPlatform).toBe('xiaohongshu')
    expect(settingsStore.settings.export.defaultPresetId).toBe('xhs-warm')
    expect(store.currentPresetId).toBe('tech')
  })

  it('keeps the retained CMS tool on the canonical native artifact path', () => {
    expect(CMS_TOOLS_SOURCE).toContain('convertToNativeFormat')
    expect(CMS_TOOLS_SOURCE).toContain('copyWechatHtmlToClipboard')
    expect(CMS_TOOLS_SOURCE).not.toContain('marked.parse')
    expect(CMS_TOOLS_SOURCE).not.toContain('convertToWechat')
    expect(CMS_TOOLS_SOURCE).not.toContain('ARTICLE_PRESETS')
  })

  it('adapts the canonical renderer and proxies writable fields to Settings', () => {
    const store = useThemeStore()
    const settingsStore = useSettingsStore()
    store.applyPreset('flagship-amber')
    const canonicalPreset = themePresets.find(preset => preset.id === 'flagship-amber')!
    const canonicalCSS = generateThemeCSS(canonicalPreset, 'preview')
      .replace(/#nice/g, '.preview-content')
    const typographyCSS = typographyToWechatCss({
      ...settingsStore.settings.appearance.typography,
      fontFamily: settingsStore.settings.appearance.fontFamily,
    }, settingsStore.settings.appearance.accentColor)
      .replace(/#nice/g, '.preview-content')

    expect(store.currentPresetId).toBe('flagship-amber')
    expect(settingsStore.settings.export.defaultPlatform).toBe('wechat')
    expect(settingsStore.settings.export.defaultPresetId).toBe('flagship-amber')
    expect(store.generatedCSS).toContain(canonicalCSS.trim())
    expect(store.generatedCSS).toContain(typographyCSS.trim())
    expect(store.generatedCSS).not.toContain('InkForge Generated Theme CSS')

    store.fontSize += 1
    store.customCSS = '.preview-content { outline: 1px solid currentColor; }'
    expect(settingsStore.settings.appearance.typography.fontSize).toBe(store.fontSize)
    expect(settingsStore.settings.export.customCss).toBe(store.customCSS)
    expect(store.generatedCSS).toContain(`font-size: ${store.fontSize}px`)
    expect(store.generatedCSS).toContain(store.customCSS)
  })
})
