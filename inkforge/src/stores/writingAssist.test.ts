/**
 * @vitest-environment happy-dom
 *
 * Regression: writingAssist store cursorPosition clamp + localStorage persist.
 *
 * Phase 2 of TypewriterMode upgrade introduces a Inspector slider that drives
 * `tw.options.cursorPosition` in [0.3, 0.7]. The store must clamp out-of-range
 * inputs to the canonical bounds (or default for non-finite) and persist the
 * value through the `inkforge-writing-assist` localStorage key so a hard reload
 * restores the last selected position.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWritingAssistStore } from './writingAssist'

const STORAGE_KEY = 'inkforge-writing-assist'

function readPersistedCursorPosition(): number | undefined {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as { cursorPosition?: number }
    return parsed.cursorPosition
  } catch {
    return undefined
  }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('useWritingAssistStore — cursorPosition', () => {
  it('defaults to 0.5 when no persisted value exists', () => {
    const store = useWritingAssistStore()
    expect(store.cursorPosition).toBeCloseTo(0.5, 5)
  })

  it('clamps below-range input to the lower bound (0.3) and persists', () => {
    const store = useWritingAssistStore()
    store.setCursorPosition(0.1)
    expect(store.cursorPosition).toBeCloseTo(0.3, 5)
    expect(readPersistedCursorPosition()).toBeCloseTo(0.3, 5)
  })

  it('clamps above-range input to the upper bound (0.7) and persists', () => {
    const store = useWritingAssistStore()
    store.setCursorPosition(0.95)
    expect(store.cursorPosition).toBeCloseTo(0.7, 5)
    expect(readPersistedCursorPosition()).toBeCloseTo(0.7, 5)
  })

  it('accepts in-range values verbatim and persists them', () => {
    const store = useWritingAssistStore()
    store.setCursorPosition(0.55)
    expect(store.cursorPosition).toBeCloseTo(0.55, 5)
    expect(readPersistedCursorPosition()).toBeCloseTo(0.55, 5)
  })

  it('falls back to default 0.5 for non-finite values', () => {
    const store = useWritingAssistStore()
    store.setCursorPosition(Number.NaN)
    expect(store.cursorPosition).toBeCloseTo(0.5, 5)
    expect(readPersistedCursorPosition()).toBeCloseTo(0.5, 5)
  })

  it('hydrates the stored value on next store activation', () => {
    const first = useWritingAssistStore()
    first.setCursorPosition(0.4)
    expect(readPersistedCursorPosition()).toBeCloseTo(0.4, 5)

    setActivePinia(createPinia())
    const next = useWritingAssistStore()
    expect(next.cursorPosition).toBeCloseTo(0.4, 5)
  })

  it('falls back to default when persisted payload is malformed', () => {
    localStorage.setItem(STORAGE_KEY, '{ not-json }')
    const store = useWritingAssistStore()
    expect(store.cursorPosition).toBeCloseTo(0.5, 5)
  })
})
