import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { auditLog } from '@/services/audit'
import {
  UPDATER_INTERVAL_MS,
  UPDATER_STARTUP_DELAY_MS,
  UPDATER_FALLBACK_RELEASE_URL,
  UPDATER_NOTIFIED_PREFIX,
  type SkippedVersionRecord,
  type UpdateInfo,
  type UpdaterCheckResult,
  type UpdaterCheckSource,
  type UpdaterStatus,
  createUpdaterService,
  renderReleaseNotesMarkdown,
} from '@/services/updater'
import type { RenderedReleaseNotes } from '@/services/updater'
import { useSettingsStore } from '@/stores/settings'

const FALLBACK_APP_VERSION = '0.1.0'

function hasTauriRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const candidate = window as typeof window & { __TAURI__?: unknown; __TAURI_IPC__?: unknown }
  return Boolean(candidate.__TAURI__ || candidate.__TAURI_IPC__)
}

async function resolveAppVersion(): Promise<string> {
  if (!hasTauriRuntime()) {
    return FALLBACK_APP_VERSION
  }

  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    return await getVersion()
  } catch {
    return FALLBACK_APP_VERSION
  }
}

export const useUpdaterStore = defineStore('updater', () => {
  const settingsStore = useSettingsStore()
  const currentVersion = ref(FALLBACK_APP_VERSION)
  const status = ref<UpdaterStatus>('idle')
  const busy = ref(false)
  const actionMessage = ref<{ type: 'success' | 'warning' | 'error' | 'info'; text: string } | null>(null)
  const latest = ref<UpdateInfo | null>(settingsStore.settings.advanced.updater.latest)
  const skippedVersions = ref<SkippedVersionRecord[]>([])
  const lastResult = ref<UpdaterCheckResult | null>(null)
  const toastUpdate = ref<UpdateInfo | null>(null)
  const detailsVisible = ref(false)
  const renderedNotes = ref<RenderedReleaseNotes | null>(null)
  const initialized = ref(false)
  const startupTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const intervalTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const resumeHandlersAttached = ref(false)

  const service = computed(() => createUpdaterService({ currentVersion: currentVersion.value, releaseBaseUrl: UPDATER_FALLBACK_RELEASE_URL }))
  const updaterSettings = computed(() => settingsStore.settings.advanced.updater)
  const isDisabled = computed(() => updaterSettings.value.autoCheckDisabled || status.value === 'disabled')
  const latestSkipped = computed(() => Boolean(latest.value && skippedVersions.value.some(entry => entry.version === latest.value?.version)))
  const currentReleaseUrl = computed(() => latest.value?.releaseUrl ?? UPDATER_FALLBACK_RELEASE_URL)

  function setActionMessage(type: 'success' | 'warning' | 'error' | 'info', text: string): void {
    actionMessage.value = { type, text }
  }

  function getNotificationStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      return window.localStorage
    } catch {
      return null
    }
  }

  function hasNotifiedVersion(version: string): boolean {
    if (updaterSettings.value.notifiedVersions.includes(version)) {
      return true
    }

    return getNotificationStorage()?.getItem(`${UPDATER_NOTIFIED_PREFIX}${version}`) === '1'
  }

  function markNotifiedVersion(version: string): void {
    try {
      getNotificationStorage()?.setItem(`${UPDATER_NOTIFIED_PREFIX}${version}`, '1')
    } catch {
      // Settings persistence below remains the primary durable dedupe path.
    }

    updaterSettings.value.notifiedVersions = Array.from(new Set([
      ...updaterSettings.value.notifiedVersions,
      version,
    ])).slice(-20)
    settingsStore.save()
  }

  function syncSettingsFromResult(result: UpdaterCheckResult): void {
    const checkedAtIso = new Date(result.checkedAt).toISOString()
    const settings = updaterSettings.value
    settings.lastCheckAt = checkedAtIso
    settings.lastStatus = result.status
    settings.lastDisabledReason = result.disabledReason
    settings.lastErrorMessage = result.status === 'failed' || result.status === 'signature-failed' ? result.message : null

    if (['available', 'none'].includes(result.status)) {
      settings.lastSuccessfulCheckAt = checkedAtIso
    }

    if (result.update) {
      settings.latest = result.update
      latest.value = result.update
    } else if (result.status === 'none') {
      settings.latest = null
      latest.value = null
    }

    settingsStore.save()
  }

  async function refreshSkippedVersions(): Promise<void> {
    skippedVersions.value = [...await service.value.listSkippedVersions()]
  }

  async function initialize(): Promise<void> {
    if (initialized.value) {
      return
    }

    currentVersion.value = await resolveAppVersion()
    latest.value = updaterSettings.value.latest
    await refreshSkippedVersions()
    status.value = updaterSettings.value.lastStatus === 'checking' ? 'idle' : updaterSettings.value.lastStatus
    initialized.value = true
  }

  async function runCheck(source: UpdaterCheckSource, force = source === 'manual'): Promise<UpdaterCheckResult> {
    await initialize()
    busy.value = true
    status.value = 'checking'

    try {
      const result = await service.value.checkNow(updaterSettings.value, { source, force })
      lastResult.value = result
      status.value = result.status
      syncSettingsFromResult(result)

      if (result.status === 'available' && result.update) {
        latest.value = result.update
        const skipped = result.skipped || skippedVersions.value.some(entry => entry.version === result.update?.version)
        if (!skipped && service.value.shouldNotifyVersion(updaterSettings.value, result.update) && !hasNotifiedVersion(result.update.version)) {
          toastUpdate.value = result.update
          markNotifiedVersion(result.update.version)
        }
        if (source === 'manual' || !skipped) {
          setActionMessage(skipped ? 'info' : 'success', skipped ? `v${result.update.version} 已跳过，仍可在此查看。` : `发现新版本 v${result.update.version}。`)
        }
        return result
      }

      if (result.status === 'disabled') {
        if (source === 'manual') {
          setActionMessage('info', result.message ?? '更新检查已禁用。')
        }
        return result
      }

      if (result.status === 'signature-failed') {
        if (source === 'manual') {
          setActionMessage('warning', '检测到签名异常的更新，已按安全策略忽略。')
        }
        return result
      }

      if (result.status === 'failed') {
        if (source === 'manual') {
          setActionMessage('warning', result.message ?? '更新检查失败。')
        }
        return result
      }

      if (source === 'manual') {
        setActionMessage('success', '当前已是最新版本。')
      }
      return result
    } finally {
      busy.value = false
    }
  }

  async function checkNow(): Promise<void> {
    await runCheck('manual', true)
  }

  function scheduleStartupCheck(): void {
    if (startupTimer.value || updaterSettings.value.autoCheckDisabled) {
      return
    }

    startupTimer.value = setTimeout(() => {
      startupTimer.value = null
      void runCheck('startup', false)
    }, UPDATER_STARTUP_DELAY_MS)
  }


  function runResumeCheck(): void {
    if (updaterSettings.value.autoCheckDisabled || busy.value) {
      return
    }

    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return
    }

    void runCheck('resume', false)
  }

  function handleVisibilityResume(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      runResumeCheck()
    }
  }

  function handleOnlineResume(): void {
    runResumeCheck()
  }

  function attachResumeListeners(): void {
    if (resumeHandlersAttached.value || typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    document.addEventListener('visibilitychange', handleVisibilityResume)
    window.addEventListener('online', handleOnlineResume)
    resumeHandlersAttached.value = true
  }

  function detachResumeListeners(): void {
    if (!resumeHandlersAttached.value || typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    document.removeEventListener('visibilitychange', handleVisibilityResume)
    window.removeEventListener('online', handleOnlineResume)
    resumeHandlersAttached.value = false
  }

  function startIntervalChecks(): void {
    if (updaterSettings.value.autoCheckDisabled) {
      return
    }

    attachResumeListeners()

    if (intervalTimer.value) {
      return
    }

    intervalTimer.value = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return
      }
      void runCheck('interval', false)
    }, UPDATER_INTERVAL_MS)
  }

  function stopScheduledChecks(): void {
    if (startupTimer.value) {
      clearTimeout(startupTimer.value)
      startupTimer.value = null
    }

    if (intervalTimer.value) {
      clearInterval(intervalTimer.value)
      intervalTimer.value = null
    }

    detachResumeListeners()
  }

  async function setAutoCheckDisabled(disabled: boolean): Promise<void> {
    updaterSettings.value.autoCheckDisabled = disabled
    settingsStore.save()
    if (disabled) {
      stopScheduledChecks()
      status.value = 'disabled'
      setActionMessage('info', '自动更新检查已禁用。')
    } else {
      status.value = 'idle'
      scheduleStartupCheck()
      startIntervalChecks()
      setActionMessage('success', '自动更新检查已恢复。')
    }

    await auditLog('updater.toggle-disabled', {
      actorId: 'local-profile',
      profileId: 'local-profile',
      severity: 'info',
      outcome: 'success',
      resourceKind: 'version',
      resourceId: 'auto-check',
      payload: { disabled },
      source: 'useUpdaterStore.setAutoCheckDisabled',
    })
  }

  async function skipLatest(): Promise<void> {
    if (!latest.value) {
      return
    }

    await service.value.skip(latest.value.version)
    await refreshSkippedVersions()
    toastUpdate.value = null
    setActionMessage('info', `已跳过 v${latest.value.version} 的重复提醒。`)
  }

  async function resetSkippedVersions(): Promise<void> {
    await service.value.resetSkippedVersions()
    await refreshSkippedVersions()
    setActionMessage('success', '已清空跳过记录。')
  }

  async function openReleasePage(): Promise<void> {
    const ok = await service.value.openReleasePage(latest.value)
    setActionMessage(ok ? 'success' : 'warning', ok ? '已打开默认浏览器。' : '浏览器阻止了外部链接。')
  }

  async function showDetails(): Promise<void> {
    detailsVisible.value = true
    renderedNotes.value = latest.value?.notes
      ? await renderReleaseNotesMarkdown(latest.value.notes)
      : { html: '<p>No release notes are available.</p>', strippedImageCount: 0 }
  }

  function hideDetails(): void {
    detailsVisible.value = false
  }

  function dismissToast(): void {
    toastUpdate.value = null
  }

  return {
    currentVersion,
    status,
    busy,
    actionMessage,
    latest,
    skippedVersions,
    lastResult,
    toastUpdate,
    detailsVisible,
    renderedNotes,
    initialized,
    updaterSettings,
    isDisabled,
    latestSkipped,
    currentReleaseUrl,
    initialize,
    checkNow,
    runCheck,
    scheduleStartupCheck,
    startIntervalChecks,
    stopScheduledChecks,
    setAutoCheckDisabled,
    skipLatest,
    resetSkippedVersions,
    openReleasePage,
    showDetails,
    hideDetails,
    dismissToast,
    refreshSkippedVersions,
  }
})
