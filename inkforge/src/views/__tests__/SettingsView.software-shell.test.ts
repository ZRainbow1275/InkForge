import { describe, expect, it } from 'vitest'

import INSPIRATION_SETTINGS_SOURCE from '../../components/settings/InspirationSettingsPanel.vue?raw'
import UPDATE_CARD_SOURCE from '../../components/settings/UpdateCard.vue?raw'
import SETTINGS_SOURCE from '../SettingsView.vue?raw'

describe('SettingsView software shell', () => {
  it('keeps the navigation shell mounted while only the inner tab changes', () => {
    expect(SETTINGS_SOURCE).toContain('<aside class="sv-sidebar">')
    expect(SETTINGS_SOURCE).toMatch(/<main\s+ref="settingsContentRef"\s+class="sv-content"/)
    expect(SETTINGS_SOURCE).toContain('v-show="currentTab === \'appearance\'"')
    expect(SETTINGS_SOURCE).toContain('v-show="currentTab === \'about\'"')
  })

  it('animates the content surface without remounting or animating the sidebar', () => {
    expect(SETTINGS_SOURCE).toMatch(/\.sv-tab\s*\{[^}]*animation:\s*sv-tab-enter/)
    expect(SETTINGS_SOURCE).toContain('@keyframes sv-tab-enter')
    expect(SETTINGS_SOURCE).not.toMatch(/\.sv-sidebar\s*\{[^}]*animation:/)
  })

  it('resets the shared content scroller whenever the active tab changes', () => {
    expect(SETTINGS_SOURCE).toContain('ref="settingsContentRef"')
    expect(SETTINGS_SOURCE).toMatch(/function resetSettingsContentScroll\(\): void \{[\s\S]*?scrollTo\(\{ top: 0, behavior: 'auto' \}\)/)
    expect(SETTINGS_SOURCE).toMatch(/function selectTab\(tabId: TabId\): void \{[\s\S]*?resetSettingsContentScroll\(\)/)
    expect(SETTINGS_SOURCE).toMatch(/async function applyRouteState\(\): Promise<void> \{[\s\S]*?resetSettingsContentScroll\(\)/)
  })

  it('fits the route shell and gives the long navigation its own scroll boundary', () => {
    expect(SETTINGS_SOURCE).toMatch(/\.settings-view\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/)
    expect(SETTINGS_SOURCE).not.toMatch(/\.settings-view\s*\{[^}]*height:\s*100vh;/)
    expect(SETTINGS_SOURCE).toMatch(/\.sv-body\s*\{[^}]*min-height:\s*0;/)
    expect(SETTINGS_SOURCE).toMatch(/\.sv-sidebar\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;/)
  })

  it('uses a compact horizontal About identity block', () => {
    expect(SETTINGS_SOURCE).toContain(':size="96"')
    expect(SETTINGS_SOURCE).toMatch(/\.sv-about-hero\s*\{[^}]*flex-direction:\s*row;/)
    expect(SETTINGS_SOURCE).toMatch(/\.sv-about-hero-info\s*\{[^}]*align-items:\s*flex-start;/)
  })

  it('keeps the updater child self-styled instead of relying on inaccessible parent scoped CSS', () => {
    expect(UPDATE_CARD_SOURCE).toMatch(/\.updater-card \.sv-section-header\s*\{/)
    expect(UPDATE_CARD_SOURCE).toMatch(/\.updater-card \.sv-inline-grid\s*\{/)
    expect(UPDATE_CARD_SOURCE).toMatch(/\.updater-card \.sv-insight-card\s*\{/)
    expect(UPDATE_CARD_SOURCE).toMatch(/\.updater-card \.sv-action-btn\s*\{[^}]*white-space:\s*nowrap;/)
  })

  it('keeps native file inputs hidden behind styled accessible triggers', () => {
    expect(SETTINGS_SOURCE).toContain('class="sv-visually-hidden-input"')
    expect(SETTINGS_SOURCE).toContain('data-settings-action="import"')
    expect(SETTINGS_SOURCE).toContain('data-extension-action="choose-manifest"')
    expect(SETTINGS_SOURCE).toContain('ref="extensionManifestInput"')
    expect(SETTINGS_SOURCE).toContain('function triggerExtensionManifestImport(): void')
    expect(SETTINGS_SOURCE).toContain('extensionManifestInput.value?.click()')
    expect(SETTINGS_SOURCE).not.toMatch(/class="sv-input"\s+type="file"/)
    expect(SETTINGS_SOURCE).toMatch(/\.sv-visually-hidden-input\s*\{[^}]*opacity:\s*0;/)
  })

  it('keeps disabled action buttons visually inert', () => {
    expect(SETTINGS_SOURCE).toMatch(/\.sv-action-btn:hover:not\(:disabled\)\s*\{/)
    expect(SETTINGS_SOURCE).toMatch(/\.sv-action-btn:disabled\s*\{[^}]*opacity:\s*0\.6;[^}]*cursor:\s*not-allowed;/)
    expect(SETTINGS_SOURCE).not.toMatch(/\.sv-action-btn:hover\s*\{/)
  })

  it('uses canonical typography for the export preview without a second indent control', () => {
    expect(SETTINGS_SOURCE).not.toContain('v-model="settings.export.textIndent"')
    expect(SETTINGS_SOURCE).not.toContain('settings.value.export.textIndent')
    expect(SETTINGS_SOURCE).toContain('enableTextIndent: settings.value.appearance.typography.paragraphIndent')
    expect(SETTINGS_SOURCE).toMatch(/typography:\s*\{\s*\.\.\.settings\.value\.appearance\.typography,\s*fontFamily: settings\.value\.appearance\.fontFamily/)
  })

  it('owns local inspiration editing in Settings and keeps the legacy persistence record', () => {
    expect(SETTINGS_SOURCE).toContain("type SettingsSectionId = 'inspiration' | 'writing-goal' | 'updater'")
    expect(SETTINGS_SOURCE).toContain('data-settings-section="inspiration"')
    expect(SETTINGS_SOURCE).toContain('<InspirationSettingsPanel />')
    expect(INSPIRATION_SETTINGS_SOURCE).toContain('loadHubInspirationState()')
    expect(INSPIRATION_SETTINGS_SOURCE).toContain('saveHubInspirationState(nextState)')
    expect(INSPIRATION_SETTINGS_SOURCE).toContain('首页本身保持只读')
  })
})
