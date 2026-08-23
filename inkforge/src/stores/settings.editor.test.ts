/**
 * @vitest-environment happy-dom
 */
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SMART_PUNCTUATION_RULE_IDS } from '@/services/smart-punctuation'
import { normalizeWritingGoalValue, useSettingsStore } from './settings'

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

  it('accepts only safe positive decimal writing goals', () => {
    expect(normalizeWritingGoalValue(1200)).toBe(1200)
    expect(normalizeWritingGoalValue('001200')).toBe(1200)
    expect(normalizeWritingGoalValue('')).toBeUndefined()
    expect(normalizeWritingGoalValue('-1')).toBeUndefined()
    expect(normalizeWritingGoalValue('1.5')).toBeUndefined()
    expect(normalizeWritingGoalValue('1e3')).toBeUndefined()
    expect(normalizeWritingGoalValue(Number.MAX_SAFE_INTEGER + 1)).toBeUndefined()
  })

  it('persists all writing goals and rejects invalid stored values', async () => {
    const store = useSettingsStore()
    store.settings.writingGoal = {
      documentTarget: 3000,
      dailyTarget: 1200,
      weeklyTarget: 8000,
    }
    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    expect(reloaded.settings.writingGoal).toEqual({
      documentTarget: 3000,
      dailyTarget: 1200,
      weeklyTarget: 8000,
    })

    const persisted = JSON.parse(localStorage.getItem('inkforge-settings') || '{}')
    persisted.writingGoal = {
      documentTarget: '4500',
      dailyTarget: '-500',
      weeklyTarget: 2.5,
    }
    localStorage.setItem('inkforge-settings', JSON.stringify(persisted))

    setActivePinia(createPinia())
    const normalized = useSettingsStore()
    expect(normalized.settings.writingGoal).toEqual({
      documentTarget: 4500,
      dailyTarget: undefined,
      weeklyTarget: undefined,
    })
  })

  it('migrates legacy top-level typography values only when canonical values are absent', () => {
    localStorage.setItem('inkforge-settings', JSON.stringify({
      schemaVersion: 2,
      appearance: {
        fontSize: 21,
        lineHeight: 2.1,
      },
      export: {
        textIndent: true,
      },
    }))

    const migrated = useSettingsStore()
    expect(migrated.settings.appearance.typography.fontSize).toBe(21)
    expect(migrated.settings.appearance.typography.lineHeight).toBe(2.1)
    expect(migrated.settings.appearance.typography.paragraphIndent).toBe(true)
    expect(migrated.settings.appearance.typography).toMatchObject({
      textAlign: 'left',
      listSpacing: 8,
      headingScale: 'balanced',
      dividerStyle: 'line',
      mediaStyle: 'plain',
    })
  })

  it('keeps canonical typography values when legacy aliases disagree', () => {
    localStorage.setItem('inkforge-settings', JSON.stringify({
      schemaVersion: 3,
      appearance: {
        fontSize: 22,
        lineHeight: 2.2,
        typography: {
          fontSize: 17,
          lineHeight: 1.7,
          paragraphIndent: false,
        },
      },
      export: {
        textIndent: true,
      },
    }))

    const migrated = useSettingsStore()
    expect(migrated.settings.appearance.typography.fontSize).toBe(17)
    expect(migrated.settings.appearance.typography.lineHeight).toBe(1.7)
    expect(migrated.settings.appearance.typography.paragraphIndent).toBe(false)
  })

  it('persists canonical typography without relying on legacy aliases', async () => {
    const store = useSettingsStore()
    store.settings.appearance.fontFamily = 'wenkai'
    store.settings.appearance.typography = {
      fontSize: 19,
      lineHeight: 1.9,
      letterSpacing: 0.04,
      paragraphSpacing: 24,
      paragraphIndent: true,
      textAlign: 'justify',
      listSpacing: 12,
      headingScale: 'display',
      headingStyle: 'marker',
      blockquoteStyle: 'card',
      dividerStyle: 'dots',
      mediaStyle: 'framed',
    }
    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    expect(reloaded.settings.appearance.fontFamily).toBe('wenkai')
    expect(reloaded.settings.appearance.typography).toEqual({
      fontSize: 19,
      lineHeight: 1.9,
      letterSpacing: 0.04,
      paragraphSpacing: 24,
      paragraphIndent: true,
      textAlign: 'justify',
      listSpacing: 12,
      headingScale: 'display',
      headingStyle: 'marker',
      blockquoteStyle: 'card',
      dividerStyle: 'dots',
      mediaStyle: 'framed',
    })
  })
})
