/**
 * @vitest-environment happy-dom
 *
 * Regression: Focus-mode header collision (Approach A) — when focus mode is
 * active, the workstation header’s header-actions, layout-presets, and
 * publish-btn must be hidden so they do not visually collide with the
 * `.focus-exit-btn` floating at top:18 / right:20.
 *
 * The PRD permits a downgrade to text-level CSS rule assertions: happy-dom
 * does not run a full layout engine that would let us measure actual
 * `display: none` computed values without painting. WorkstationView.vue is
 * ~5670 lines so we read its scoped <style> block directly and verify the
 * three required rules exist alongside the `:class="{ 'focus-mode': ... }"`
 * binding on the root element.
 *
 * If a future refactor moves these styles out of WorkstationView.vue (e.g.
 * into design-system.css), the test will fall back to also scanning
 * design-system.css before failing.
 */
import { describe, expect, it } from 'vitest'

// Vite ?raw imports keep the test type-clean and bundle the real file body.
import WORKSTATION_SOURCE from '../WorkstationView.vue?raw'
import DESIGN_SYSTEM_SOURCE from '@/styles/design-system.css?raw'

const COMBINED_STYLE_SOURCE = [WORKSTATION_SOURCE, DESIGN_SYSTEM_SOURCE].join('\n')

function findRuleBlock(selector: string, source: string): string | null {
  // Escape regex metachars in the selector
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Match either single-selector rule or grouped selector rule that contains
  // this selector as one of the comma-separated entries.
  const pattern = new RegExp(`(^|[\\s,}])${escaped}\\s*(,[^{]*?)?\\{([^}]*)\\}`, 'm')
  const m = source.match(pattern)
  return m ? m[3] : null
}

describe('WorkstationView — focus-mode root class binding', () => {
  it('binds focus-mode class on the .workstation root to the reactive isFocusMode ref', () => {
    const classBindingMatch = WORKSTATION_SOURCE.match(/:class="\{([^"]*?'focus-mode'[^"]*?)\}"/)
    expect(classBindingMatch, 'WorkstationView root :class must declare focus-mode').not.toBeNull()
    const binding = classBindingMatch![1]
    expect(binding).toMatch(/'focus-mode':\s*isFocusMode/)
  })
})

describe('WorkstationView — focus-mode collision CSS rules', () => {
  it('hides .workstation-header .header-actions in focus-mode', () => {
    const ruleSelector = '.focus-mode .workstation-header .header-actions'
    const block = findRuleBlock(ruleSelector, COMBINED_STYLE_SOURCE)
    expect(block, `Missing CSS rule for ${ruleSelector}`).not.toBeNull()
    expect(block!.replace(/\s+/g, ' ')).toMatch(/display:\s*none/)
  })

  it('hides .workstation-header .layout-presets in focus-mode', () => {
    const ruleSelector = '.focus-mode .workstation-header .layout-presets'
    const block = findRuleBlock(ruleSelector, COMBINED_STYLE_SOURCE)
    expect(block, `Missing CSS rule for ${ruleSelector}`).not.toBeNull()
    expect(block!.replace(/\s+/g, ' ')).toMatch(/display:\s*none/)
  })

  it('hides .workstation-header .publish-btn in focus-mode', () => {
    const ruleSelector = '.focus-mode .workstation-header .publish-btn'
    const block = findRuleBlock(ruleSelector, COMBINED_STYLE_SOURCE)
    expect(block, `Missing CSS rule for ${ruleSelector}`).not.toBeNull()
    expect(block!.replace(/\s+/g, ' ')).toMatch(/display:\s*none/)
  })

  it('keeps the rules grouped under a single .focus-mode header selector chain', () => {
    // Defensive: the three child selectors must be qualified by the same
    // `.focus-mode .workstation-header` prefix, not orphan rules that would
    // affect non-focus-mode layouts.
    expect(WORKSTATION_SOURCE).toMatch(/\.focus-mode\s+\.workstation-header\s+\.header-actions/)
    expect(WORKSTATION_SOURCE).toMatch(/\.focus-mode\s+\.workstation-header\s+\.layout-presets/)
    expect(WORKSTATION_SOURCE).toMatch(/\.focus-mode\s+\.workstation-header\s+\.publish-btn/)
  })
})
