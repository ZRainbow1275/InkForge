/**
 * @vitest-environment happy-dom
 */
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SMART_PUNCTUATION_RULE_IDS } from '@/services/smart-punctuation'
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

  it('persists the smart punctuation master switch and complete rule matrix', async () => {
    const store = useSettingsStore()
    store.settings.editor.smartPunctuation = false
    for (const ruleId of SMART_PUNCTUATION_RULE_IDS) {
      store.settings.editor.smartPunctuationRules[ruleId] = false
    }
    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    expect(reloaded.settings.editor.smartPunctuation).toBe(false)
    expect(reloaded.settings.editor.smartPunctuationRules).toEqual(
      Object.fromEntries(SMART_PUNCTUATION_RULE_IDS.map(ruleId => [ruleId, false])),
    )
  })
})
