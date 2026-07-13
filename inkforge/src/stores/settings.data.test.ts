/**
 * @vitest-environment happy-dom
 */
import { nextTick, toRaw } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from './settings'

describe('settings data backup preferences', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('persists the real automatic-backup configuration', async () => {
    const store = useSettingsStore()
    store.settings.data = {
      autoBackup: true,
      backupInterval: 1,
      maxBackups: 2,
    }

    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)

    setActivePinia(createPinia())
    expect(useSettingsStore().settings.data).toEqual({
      autoBackup: true,
      backupInterval: 1,
      maxBackups: 2,
    })
  })

  it('normalizes live bounds and resets the complete Data tab', async () => {
    const store = useSettingsStore()
    const defaults = structuredClone(toRaw(store.settings.data))

    store.settings.data.backupInterval = -20
    store.settings.data.maxBackups = 500
    await nextTick()
    expect(store.settings.data.backupInterval).toBe(1)
    expect(store.settings.data.maxBackups).toBe(50)

    store.settings.data.autoBackup = true
    store.resetTab('data')
    expect(store.settings.data).toEqual(defaults)

    setActivePinia(createPinia())
    expect(useSettingsStore().settings.data).toEqual(defaults)
  })
})
