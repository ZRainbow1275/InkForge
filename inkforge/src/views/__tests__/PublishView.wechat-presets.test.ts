import { describe, expect, it } from 'vitest'

import { themePresets } from '@/services/export'
import PUBLISH_SOURCE from '../PublishView.vue?raw'

const FLAGSHIP_PRESET_IDS = [
  'flagship-kiln',
  'flagship-kiln-paste-safe',
  'flagship-tempera',
  'flagship-amber',
] as const

describe('PublishView — WeChat preset selector coverage', () => {
  it('uses the full export themePresets list instead of the legacy five-item article preset slice', () => {
    expect(PUBLISH_SOURCE).toContain("import { useThemeStore } from '@/stores/theme'")
    expect(PUBLISH_SOURCE).not.toContain('ARTICLE_PRESETS')
    expect(PUBLISH_SOURCE).not.toContain('.slice(0, 5)')
    expect(PUBLISH_SOURCE).toMatch(/const\s+quickPresets\s*=\s*computed\(\(\)\s*=>\s*themePresets\s*\)/)
  })

  it('keeps all SVG flagship presets selectable from the publish center contract', () => {
    const presetIds = themePresets.map(preset => preset.id)

    expect(themePresets).toHaveLength(16)
    expect(presetIds).toEqual(expect.arrayContaining([...FLAGSHIP_PRESET_IDS]))
  })
})
