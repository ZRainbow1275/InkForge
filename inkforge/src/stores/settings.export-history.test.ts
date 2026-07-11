/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from './settings'

describe('settings export history', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('persists the latest ten real actions and clears them durably', () => {
    const store = useSettingsStore()
    store.load()

    for (let index = 0; index < 12; index += 1) {
      store.recordExportHistory({
        id: `export-${index}`,
        exportedAt: new Date(Date.UTC(2026, 6, 11, 0, 0, index)).toISOString(),
        platform: 'wechat',
        title: `文章 ${index} · 样式版 HTML`,
        bytes: index + 1,
        action: index % 2 === 0 ? 'copy' : 'download',
      })
    }

    expect(store.settings.export.exportHistory.map(entry => entry.id)).toEqual(
      Array.from({ length: 10 }, (_, offset) => `export-${11 - offset}`),
    )

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    reloaded.load()
    expect(reloaded.settings.export.exportHistory).toHaveLength(10)
    expect(reloaded.settings.export.exportHistory[0]).toMatchObject({
      id: 'export-11',
      platform: 'wechat',
      action: 'download',
      bytes: 12,
    })

    reloaded.clearExportHistory()
    expect(reloaded.settings.export.exportHistory).toEqual([])

    setActivePinia(createPinia())
    const cleared = useSettingsStore()
    cleared.load()
    expect(cleared.settings.export.exportHistory).toEqual([])
  })

  it('normalizes long titles and salvages valid entries around corrupt persisted rows', () => {
    const store = useSettingsStore()
    store.load()
    store.recordExportHistory({
      id: 'existing-valid',
      exportedAt: '2026-07-11T00:00:00.000Z',
      platform: 'wechat',
      title: '已有有效记录',
      bytes: 12,
      action: 'copy',
    })
    store.recordExportHistory({
      id: 'long-title',
      exportedAt: '2026-07-11T00:00:01.000Z',
      platform: 'wechat',
      title: `  ${'长'.repeat(200)}  `,
      bytes: 24,
      action: 'download',
    })

    expect(store.settings.export.exportHistory[0].title).toHaveLength(160)

    const persisted = JSON.parse(localStorage.getItem('inkforge-settings') || '{}')
    persisted.export.exportHistory.splice(1, 0, {
      id: 'invalid-empty-title',
      exportedAt: '2026-07-11T00:00:00.500Z',
      platform: 'wechat',
      title: '',
      bytes: 1,
      action: 'copy',
    })
    localStorage.setItem('inkforge-settings', JSON.stringify(persisted))

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    reloaded.load()
    expect(reloaded.settings.export.exportHistory.map(entry => entry.id)).toEqual([
      'long-title',
      'existing-valid',
    ])
    expect(reloaded.settings.export.exportHistory[0].title).toHaveLength(160)
  })
})
