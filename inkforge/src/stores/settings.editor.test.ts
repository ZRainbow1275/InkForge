/**
 * @vitest-environment happy-dom
 */
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from './settings'

describe('settings editor preferences', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('persists list Enter behavior through the debounced settings save', async () => {
    const store = useSettingsStore()
    expect(store.settings.editor.listEnterBehavior).toBe('notion')

    store.settings.editor.listEnterBehavior = 'typora'
    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    expect(reloaded.settings.editor.listEnterBehavior).toBe('typora')
  })

  it('falls back to the Notion behavior for an invalid persisted value', () => {
    const store = useSettingsStore()
    store.save()

    const persisted = JSON.parse(localStorage.getItem('inkforge-settings') || '{}')
    persisted.editor.listEnterBehavior = 'unsupported'
    localStorage.setItem('inkforge-settings', JSON.stringify(persisted))

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    expect(reloaded.settings.editor.listEnterBehavior).toBe('notion')
  })
})
