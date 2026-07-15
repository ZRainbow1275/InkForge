/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'

import WORKSTATION_TAB_BAR_SOURCE from './WorkstationTabBar.vue?raw'

describe('WorkstationTabBar dark-mode active state', () => {
  it('applies the active color to the actual tab button inside the dark media rule', () => {
    expect(WORKSTATION_TAB_BAR_SOURCE).toMatch(
      /@media \(prefers-color-scheme: dark\)[\s\S]*?\.workstation-tabbar__tab--active\s+\.workstation-tabbar__tab\s*\{\s*color:\s*#EF9A9A;/,
    )
  })
})
