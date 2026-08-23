/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSettingsStore } from './settings'

describe('settings delivery adornments', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('hydrates additive defaults for legacy settings without losing existing export values', () => {
    localStorage.setItem('inkforge-settings', JSON.stringify({
      export: {
        defaultPlatform: 'zhihu',
        defaultPresetId: 'zhihu-academic',
        customCss: '#nice p { color: #123456; }',
      },
    }))

    const store = useSettingsStore()
    store.load()

    expect(store.settings.export.defaultPlatform).toBe('zhihu')
    expect(store.settings.export.defaultPresetId).toBe('zhihu-academic')
    expect(store.settings.export.customCss).toContain('#123456')
    expect(store.settings.export.deliveryAdornment).toEqual({
      readingTime: {
        enabled: true,
        wordsPerMinute: 300,
      },
      license: 'none',
      components: [],
    })
  })

  it('persists one validated ordered snapshot and reads it back through the production store', () => {
    const store = useSettingsStore()
    store.load()
    store.settings.export.deliveryAdornment = {
      readingTime: {
        enabled: false,
        wordsPerMinute: 420,
      },
      license: 'cc-by-4.0',
      components: [
        {
          id: 'persisted-link',
          type: 'link',
          enabled: true,
          url: 'https://example.com/inkforge',
          title: 'InkForge',
          description: '桌面写作与发布',
        },
        {
          id: 'persisted-song',
          type: 'song',
          enabled: true,
          title: '夜航',
          artist: 'InkForge',
          url: '',
        },
      ],
    }
    store.save()

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    reloaded.load()

    expect(reloaded.settings.export.deliveryAdornment).toEqual(
      store.settings.export.deliveryAdornment,
    )
    expect(reloaded.settings.export.deliveryAdornment.components.map(item => item.id)).toEqual([
      'persisted-link',
      'persisted-song',
    ])
  })

  it('fails closed on active-content component URLs instead of persisting an executable payload', () => {
    const baseline = useSettingsStore()
    baseline.load()
    const persisted = JSON.parse(localStorage.getItem('inkforge-settings') || '{}')
    persisted.export = {
      ...persisted.export,
      deliveryAdornment: {
        readingTime: { enabled: true, wordsPerMinute: 300 },
        license: 'none',
        components: [{
          id: 'unsafe-link',
          type: 'link',
          enabled: true,
          url: 'javascript:alert(1)',
          title: '危险链接',
          description: '',
        }],
      },
    }
    localStorage.setItem('inkforge-settings', JSON.stringify(persisted))

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    reloaded.load()

    expect(reloaded.settings.export.deliveryAdornment.components).toEqual([])
    expect(JSON.stringify(reloaded.settings)).not.toContain('javascript:alert(1)')
  })
})
