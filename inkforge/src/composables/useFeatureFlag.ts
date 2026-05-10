import { computed } from 'vue'
import { useSettingsStore, type FeatureFlagKey } from '@/stores/settings'

export function useFeatureFlag(flagKey: FeatureFlagKey) {
  const settingsStore = useSettingsStore()

  const enabled = computed({
    get: () => settingsStore.settings.featureFlags[flagKey],
    set: (value: boolean) => {
      settingsStore.settings.featureFlags[flagKey] = value
    },
  })

  function setEnabled(value: boolean): void {
    enabled.value = value
  }

  function toggle(): void {
    enabled.value = !enabled.value
  }

  return {
    key: flagKey,
    enabled,
    setEnabled,
    toggle,
  }
}

export function useFeatureFlags() {
  const settingsStore = useSettingsStore()

  const flags = computed(() => settingsStore.settings.featureFlags)

  function isEnabled(flagKey: FeatureFlagKey): boolean {
    return settingsStore.settings.featureFlags[flagKey]
  }

  return {
    flags,
    isEnabled,
  }
}
