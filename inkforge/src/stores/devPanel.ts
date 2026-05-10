import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createActivityLogger } from '@/services/activity-logger'
import {
  installDevToolsNetworkInstrumentation,
  resolveDevPanelStartupSignal,
  type DevPanelActivationSource,
  type DevPanelTabId,
} from '@/services/dev-tools'
import { useSettingsStore } from './settings'

const devLogger = createActivityLogger({ module: 'dev', scope: 'global', profileId: 'local-profile' })
let cleanupNetworkInstrumentation: (() => void) | null = null

function ensureNetworkInstrumentation(): void {
  if (!cleanupNetworkInstrumentation) {
    cleanupNetworkInstrumentation = installDevToolsNetworkInstrumentation()
  }
}

export const useDevPanelStore = defineStore('devPanel', () => {
  const settingsStore = useSettingsStore()
  const sessionDeveloperMode = ref(false)
  const isPanelVisible = ref(false)
  const hasLoadedPanel = ref(false)
  const activeTab = ref<DevPanelTabId>('editor')
  const lastActivationSource = ref<DevPanelActivationSource | null>(null)
  const drawerHeightVh = ref(40)

  const persistentDeveloperMode = computed(() => settingsStore.settings.advanced.developerMode)
  const developerModeEnabled = computed(() => persistentDeveloperMode.value || sessionDeveloperMode.value)
  const shouldRenderPanel = computed(() => hasLoadedPanel.value && developerModeEnabled.value)

  function setDrawerHeight(value: number): void {
    drawerHeightVh.value = Math.min(80, Math.max(20, Math.trunc(value)))
  }

  function setPersistentDeveloperMode(enabled: boolean): void {
    settingsStore.settings.advanced.developerMode = enabled
    settingsStore.save()
    if (enabled) {
      ensureNetworkInstrumentation()
      lastActivationSource.value = 'settings'
    } else {
      sessionDeveloperMode.value = false
      isPanelVisible.value = false
    }
    devLogger.info(enabled ? 'dev.mode.enable' : 'dev.mode.disable', { source: 'settings' })
  }

  function enableSessionDeveloperMode(source: DevPanelActivationSource): void {
    sessionDeveloperMode.value = true
    lastActivationSource.value = source
    ensureNetworkInstrumentation()
    devLogger.info('dev.mode.session.enable', { source })
  }

  function initializeFromStartup(): void {
    if (resolveDevPanelStartupSignal()) {
      enableSessionDeveloperMode('startup-flag')
      openPanel('startup-flag')
    } else if (persistentDeveloperMode.value) {
      ensureNetworkInstrumentation()
    }
  }

  function openPanel(source: DevPanelActivationSource): boolean {
    if (!developerModeEnabled.value) return false
    ensureNetworkInstrumentation()
    hasLoadedPanel.value = true
    isPanelVisible.value = true
    lastActivationSource.value = source
    devLogger.info('dev.panel.open', { source, activeTab: activeTab.value })
    return true
  }

  function closePanel(source: DevPanelActivationSource = 'ui'): void {
    if (!isPanelVisible.value) return
    isPanelVisible.value = false
    lastActivationSource.value = source
    devLogger.info('dev.panel.close', { source, activeTab: activeTab.value })
  }

  function togglePanel(source: DevPanelActivationSource): boolean {
    if (!developerModeEnabled.value) return false
    if (isPanelVisible.value) {
      closePanel(source)
      return true
    }
    return openPanel(source)
  }

  function setActiveTab(tab: DevPanelTabId): void {
    activeTab.value = tab
  }

  return {
    sessionDeveloperMode,
    isPanelVisible,
    hasLoadedPanel,
    activeTab,
    lastActivationSource,
    drawerHeightVh,
    persistentDeveloperMode,
    developerModeEnabled,
    shouldRenderPanel,
    setDrawerHeight,
    setPersistentDeveloperMode,
    enableSessionDeveloperMode,
    initializeFromStartup,
    openPanel,
    closePanel,
    togglePanel,
    setActiveTab,
  }
})