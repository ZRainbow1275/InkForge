import { computed, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import type { Settings } from '@/stores/settings'
import { useSettingsStore } from '@/stores/settings'

type FeatureFlag = Settings['advanced']['featureFlags'][number]

export interface FeatureFlagState {
  flag: Readonly<ComputedRef<FeatureFlag | null>>
  enabled: Readonly<ComputedRef<boolean>>
  experimental: Readonly<ComputedRef<boolean>>
}

export function useFeatureFlag(flagId: string): FeatureFlagState {
  const settingsStore = useSettingsStore()
  const { settings } = storeToRefs(settingsStore)

  const flag = computed(() => settings.value.advanced.featureFlags.find((entry) => entry.id === flagId) ?? null)
  const enabled = computed(() => Boolean(flag.value?.enabled))
  const experimental = computed(() => Boolean(flag.value?.experimental))

  return {
    flag,
    enabled,
    experimental,
  }
}
