/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDevPanelStore } from './devPanel'
import { useSettingsStore } from './settings'

describe('DevPanel desktop lifecycle', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('does not open before developer mode is explicitly enabled', () => {
    const devPanelStore = useDevPanelStore()

    expect(devPanelStore.developerModeEnabled).toBe(false)
    expect(devPanelStore.openPanel('settings')).toBe(false)
    expect(devPanelStore.hasLoadedPanel).toBe(false)
    expect(devPanelStore.isPanelVisible).toBe(false)
  })

  it('persists the setting, opens on demand, and closes when the mode is disabled', () => {
    const settingsStore = useSettingsStore()
    const devPanelStore = useDevPanelStore()

    devPanelStore.setPersistentDeveloperMode(true)
    expect(settingsStore.settings.advanced.developerMode).toBe(true)
    expect(devPanelStore.developerModeEnabled).toBe(true)
    expect(devPanelStore.openPanel('settings')).toBe(true)
    expect(devPanelStore.hasLoadedPanel).toBe(true)
    expect(devPanelStore.isPanelVisible).toBe(true)
    expect(devPanelStore.shouldRenderPanel).toBe(true)

    devPanelStore.closePanel('settings')
    expect(devPanelStore.isPanelVisible).toBe(false)
    expect(devPanelStore.shouldRenderPanel).toBe(true)

    expect(devPanelStore.openPanel('settings')).toBe(true)
    devPanelStore.setPersistentDeveloperMode(false)
    expect(settingsStore.settings.advanced.developerMode).toBe(false)
    expect(devPanelStore.developerModeEnabled).toBe(false)
    expect(devPanelStore.isPanelVisible).toBe(false)
    expect(devPanelStore.shouldRenderPanel).toBe(false)
  })
})
