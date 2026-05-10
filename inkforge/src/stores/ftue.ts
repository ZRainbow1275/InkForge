import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_FTUE_STATE,
  completeFTUE,
  loadFTUEState,
  loadSeenHelpKeys,
  markHelpSeen,
  markWelcomeShown,
  resetFTUE,
  shouldShowWelcome,
  skipFTUE,
} from '@/services/ftue'
import type { FTUEState, HelpCenterTab, HelpKey, OnboardingPath } from '@/services/ftue/types'

const COMPLETED_LABELS: Record<FTUEState['step'], string> = {
  not_started: '未开始',
  welcome_shown: '欢迎已显示',
  account_setup: '账户设置中',
  completed: '已完成',
  skipped: '已跳过',
}

export const useFTUEStore = defineStore('ftue', () => {
  const ftueState = ref<FTUEState>({ ...DEFAULT_FTUE_STATE })
  const seenHelpKeys = ref<HelpKey[]>([])
  const initialized = ref(false)
  const loading = ref(false)
  const welcomeVisible = ref(false)
  const helpCenterOpen = ref(false)
  const activeHelpTab = ref<HelpCenterTab>('markdown')
  const helpSearchQuery = ref('')
  const lastError = ref<string | null>(null)

  const shouldShowFirstRun = computed(() => shouldShowWelcome(ftueState.value.step))
  const completedLabel = computed(() => COMPLETED_LABELS[ftueState.value.step])

  function hasSeenHelp(helpKey: HelpKey): boolean {
    return seenHelpKeys.value.includes(helpKey)
  }

  async function initialize(): Promise<void> {
    if (loading.value) {
      return
    }

    loading.value = true
    lastError.value = null

    try {
      const [loadedState, loadedHelpKeys] = await Promise.all([
        loadFTUEState(),
        loadSeenHelpKeys(),
      ])

      seenHelpKeys.value = loadedHelpKeys

      if (loadedState.step === 'not_started') {
        // 0506 决策 G-3 / L1-50：默认不弹欢迎引导；将状态推进至 welcome_shown，
        // 后续如需查看欢迎可由用户主动从设置触发 reset() 或显式 openWelcome()。
        ftueState.value = await markWelcomeShown()
        welcomeVisible.value = false
      } else {
        ftueState.value = loadedState
        welcomeVisible.value = false
      }

      initialized.value = true
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
    } finally {
      loading.value = false
    }
  }

  async function skipWelcome(): Promise<void> {
    loading.value = true
    lastError.value = null

    try {
      ftueState.value = await skipFTUE()
      welcomeVisible.value = false
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
    } finally {
      loading.value = false
    }
  }

  async function completeWelcome(onboardingPath: OnboardingPath): Promise<void> {
    loading.value = true
    lastError.value = null

    try {
      ftueState.value = await completeFTUE(onboardingPath)
      welcomeVisible.value = false
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
    } finally {
      loading.value = false
    }
  }

  async function reset(): Promise<void> {
    loading.value = true
    lastError.value = null

    try {
      ftueState.value = await resetFTUE()
      seenHelpKeys.value = []
      welcomeVisible.value = true
      helpCenterOpen.value = false
      activeHelpTab.value = 'markdown'
      helpSearchQuery.value = ''
      initialized.value = true
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
    } finally {
      loading.value = false
    }
  }

  async function acknowledgeHelp(helpKey: HelpKey): Promise<void> {
    lastError.value = null

    try {
      seenHelpKeys.value = await markHelpSeen(helpKey)
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
    }
  }

  function openHelpCenter(tab: HelpCenterTab = 'markdown', query = ''): void {
    activeHelpTab.value = tab
    helpSearchQuery.value = query
    helpCenterOpen.value = true
  }

  function closeHelpCenter(): void {
    helpCenterOpen.value = false
  }

  function setHelpTab(tab: HelpCenterTab): void {
    activeHelpTab.value = tab
  }

  function setHelpSearchQuery(query: string): void {
    helpSearchQuery.value = query
  }

  return {
    ftueState,
    seenHelpKeys,
    initialized,
    loading,
    welcomeVisible,
    helpCenterOpen,
    activeHelpTab,
    helpSearchQuery,
    lastError,
    shouldShowFirstRun,
    completedLabel,
    hasSeenHelp,
    initialize,
    skipWelcome,
    completeWelcome,
    reset,
    acknowledgeHelp,
    openHelpCenter,
    closeHelpCenter,
    setHelpTab,
    setHelpSearchQuery,
  }
})