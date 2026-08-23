/**
 * @vitest-environment happy-dom
 *
 * Regression: Workstation vignette must be independent of focus mode.
 *
 * The vignette feature in 0526 task is supposed to bind to
 * `writingAssistStore.vignette.isEnabled` *alone*, not to
 * `(isFocusMode && vignette.isEnabled)`. Earlier revisions of WorkstationView
 * coupled vignette to focus mode, so this test pins the contract by:
 *   1. Reading the actual `:class` binding for the `.workstation` root.
 *   2. Reading the actual `v-if` on the `.vignette-overlay` overlay div.
 * Both must reference `writingAssistStore.vignette.isEnabled` without an
 * AND-with-isFocusMode guard.
 *
 * Additionally the writingAssist store is exercised directly to confirm that
 * `setVignetteEnabled(true)` flips the public field used by the binding.
 *
 * WorkstationView.vue is ~5670 lines and pulls in 20+ stores/services. A full
 * SFC mount is intentionally avoided here per PRD’s permitted downgrade:
 * “直接 DOM-snapshot 测 … 或在 component 测里只 shallowMount + 测顶层 div class”.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useWritingAssistStore } from '@/stores/writingAssist'
// Vite ?raw imports keep the test type-clean (no @types/node dependency).
import WORKSTATION_SOURCE from '../WorkstationView.vue?raw'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('WorkstationView — vignette class binding decoupled from focus mode', () => {
  it('root .workstation :class includes focus-vignette bound to writingAssistStore.vignette.isEnabled alone', () => {
    // Match the actual binding line, e.g.
    //   :class="{ 'focus-mode': isFocusMode, 'focus-vignette': writingAssistStore.vignette.isEnabled, ... }"
    const classBindingMatch = WORKSTATION_SOURCE.match(/:class="\{([^"]*?'focus-vignette'[^"]*?)\}"/)
    expect(classBindingMatch, 'WorkstationView root :class must declare focus-vignette').not.toBeNull()
    const binding = classBindingMatch![1]

    // Must bind to writingAssistStore.vignette.isEnabled
    expect(binding).toMatch(/'focus-vignette':\s*writingAssistStore\.vignette\.isEnabled/)

    // The 'focus-vignette' key must NOT be ANDed with isFocusMode. The exact
    // forbidden patterns are `isFocusMode && writingAssistStore...` or
    // `writingAssistStore.vignette.isEnabled && isFocusMode`.
    const focusVignetteSegment = binding.match(/'focus-vignette':\s*([^,}]+)/)![1]
    expect(focusVignetteSegment).not.toMatch(/isFocusMode\s*&&/)
    expect(focusVignetteSegment).not.toMatch(/&&\s*isFocusMode/)
  })

  it('renders <div class="vignette-overlay"> guarded by writingAssistStore.vignette.isEnabled only', () => {
    // The overlay markup should look like:
    //   <div v-if="writingAssistStore.vignette.isEnabled" class="vignette-overlay" ... />
    const overlayPattern = /v-if="writingAssistStore\.vignette\.isEnabled"\s+class="vignette-overlay"/
    expect(WORKSTATION_SOURCE).toMatch(overlayPattern)

    // Defensive: there must be no AND with isFocusMode in the same v-if.
    const overlayBlock = WORKSTATION_SOURCE.match(/<div[^>]*class="vignette-overlay"[^>]*>/)
    expect(overlayBlock, 'WorkstationView must render a .vignette-overlay div').not.toBeNull()
    expect(overlayBlock![0]).not.toMatch(/isFocusMode/)
  })

  it('anchors the soft focus band to the configured cursor position and intensity', () => {
    expect(WORKSTATION_SOURCE).toContain("'--focus-cursor-position': `${writingAssistStore.cursorPosition * 100}%`")
    expect(WORKSTATION_SOURCE).toMatch(
      /'--focus-vignette-intensity': `\$\{Number\.isFinite\(writingAssistStore\.vignette\.intensity\)[\s\S]{0,120}?: 0\.18\}`/,
    )
    expect(WORKSTATION_SOURCE).toMatch(
      /\.focus-vignette \.vignette-overlay\s*\{[\s\S]{0,800}?at 50% var\(--focus-cursor-position\)/,
    )
    expect(WORKSTATION_SOURCE).toContain('var(--focus-vignette-intensity)')
  })
})

describe('WorkstationView — writingAssistStore.vignette state surface', () => {
  it('defaults vignette.isEnabled to false', () => {
    const store = useWritingAssistStore()
    expect(store.vignette.isEnabled).toBe(false)
  })

  it('setVignetteEnabled(true) flips the public field consumed by the :class binding', () => {
    const store = useWritingAssistStore()
    store.setVignetteEnabled(true)
    expect(store.vignette.isEnabled).toBe(true)

    // And it must round-trip through localStorage so a reload restores it.
    const persisted = JSON.parse(localStorage.getItem('inkforge-writing-assist') ?? '{}')
    expect(persisted.vignette?.isEnabled).toBe(true)
  })

  it('vignette enabled status is independent of focus mode state', () => {
    const store = useWritingAssistStore()
    // focusMode starts inactive; vignette state must be independently toggleable.
    expect(store.focusMode.isActive).toBe(false)
    store.setVignetteEnabled(true)
    expect(store.focusMode.isActive).toBe(false)
    expect(store.vignette.isEnabled).toBe(true)
  })
})
