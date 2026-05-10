import { createActivityLogger } from '@/services/activity-logger'
import { auditLog } from '@/services/audit'
import {
  UPDATER_BACKGROUND_THROTTLE_MS,
  UPDATER_FALLBACK_RELEASE_URL,
  type SkippedVersionRecord,
  type UpdateInfo,
  type UpdaterAdapter,
  type UpdaterCheckOptions,
  type UpdaterCheckResult,
  type UpdaterSettings,
  type UpdaterSkipStore,
} from './types'
import { compareSemver, isVersionGreaterThan } from './semver'
import { evaluateUpdaterPolicy, readEnterpriseUpdaterDisabled, readUpdaterEnvValue } from './policy'
import { createTauriUpdaterAdapter } from './tauri-adapter'
import { createUpdaterSkipStore } from './skip-store'
import { openExternalUrl } from '@/services/desktop'

const updaterLogger = createActivityLogger({ module: 'updater', scope: 'global', profileId: 'local-profile' })

interface UpdaterServiceOptions {
  currentVersion: string
  adapter?: UpdaterAdapter
  skipStore?: UpdaterSkipStore
  releaseBaseUrl?: string
  now?: () => number
  readEnterpriseDisabled?: () => Promise<boolean>
  readEnvValue?: () => string | undefined
  buildActive?: () => boolean
}

function isTauriUpdaterBuildActive(): boolean {
  const env = import.meta.env as Record<string, string | undefined>
  return env.VITE_INKFORGE_TAURI_UPDATER_ACTIVE === '1'
}

function navigatorOnline(): boolean | undefined {
  if (typeof navigator === 'undefined') {
    return undefined
  }

  return navigator.onLine
}

function offlineSinceFromStorage(now: number): number | null {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const key = 'inkforge.updater.offlineSince'
  if (navigatorOnline() !== false) {
    localStorage.removeItem(key)
    return null
  }

  const existing = Number(localStorage.getItem(key))
  if (Number.isFinite(existing) && existing > 0) {
    return existing
  }

  localStorage.setItem(key, String(now))
  return now
}

function resultFromAdapterStatus(
  adapterResult: Awaited<ReturnType<UpdaterAdapter['check']>>,
  checkedAt: number,
  source: UpdaterCheckOptions['source'],
): UpdaterCheckResult {
  if (adapterResult.status === 'available' && adapterResult.update) {
    return {
      status: 'available',
      update: adapterResult.update,
      skipped: false,
      disabledReason: null,
      message: null,
      checkedAt,
      source,
    }
  }

  if (adapterResult.status === 'signature-failed') {
    return {
      status: 'signature-failed',
      update: null,
      skipped: false,
      disabledReason: null,
      message: adapterResult.message ?? 'Updater signature verification failed.',
      checkedAt,
      source,
    }
  }

  if (adapterResult.status === 'unavailable') {
    return {
      status: 'disabled',
      update: null,
      skipped: false,
      disabledReason: 'runtime-unavailable',
      message: adapterResult.message ?? 'Tauri updater runtime is unavailable.',
      checkedAt,
      source,
    }
  }

  if (adapterResult.status === 'failed') {
    return {
      status: 'failed',
      update: null,
      skipped: false,
      disabledReason: null,
      message: adapterResult.message ?? 'Updater check failed.',
      checkedAt,
      source,
    }
  }

  return {
    status: 'none',
    update: null,
    skipped: false,
    disabledReason: null,
    message: null,
    checkedAt,
    source,
  }
}

function manualAuditFields(status: UpdaterCheckResult['status']): { severity: 'info' | 'warning'; outcome: 'success' | 'failure' | 'info' } {
  if (status === 'failed' || status === 'signature-failed') {
    return { severity: 'warning', outcome: 'failure' }
  }

  if (status === 'disabled') {
    return { severity: 'info', outcome: 'info' }
  }

  return { severity: 'info', outcome: 'success' }
}

async function auditManualCheckResult(result: UpdaterCheckResult): Promise<void> {
  const fields = manualAuditFields(result.status)
  await auditLog('updater.user-check', {
    actorId: 'local-profile',
    profileId: 'local-profile',
    severity: fields.severity,
    outcome: fields.outcome,
    resourceKind: 'version',
    resourceId: result.update?.version ?? result.status,
    reason: result.message ?? undefined,
    payload: {
      status: result.status,
      source: result.source,
      version: result.update?.version ?? null,
      disabledReason: result.disabledReason,
      skipped: result.skipped,
    },
    source: 'UpdaterService.checkNow',
  })
}

export class UpdaterService {
  private readonly adapter: UpdaterAdapter
  private readonly skipStore: UpdaterSkipStore
  private readonly now: () => number
  private readonly readEnterpriseDisabled: () => Promise<boolean>
  private readonly readEnvValue: () => string | undefined
  private readonly buildActive: () => boolean

  constructor(private readonly options: UpdaterServiceOptions) {
    this.adapter = options.adapter ?? createTauriUpdaterAdapter(options.currentVersion, options.releaseBaseUrl)
    this.skipStore = options.skipStore ?? createUpdaterSkipStore()
    this.now = options.now ?? Date.now
    this.readEnterpriseDisabled = options.readEnterpriseDisabled ?? readEnterpriseUpdaterDisabled
    this.readEnvValue = options.readEnvValue ?? readUpdaterEnvValue
    this.buildActive = options.buildActive ?? isTauriUpdaterBuildActive
  }

  async listSkippedVersions(): Promise<readonly SkippedVersionRecord[]> {
    return this.skipStore.list()
  }

  async resetSkippedVersions(): Promise<void> {
    await this.skipStore.clear()
    updaterLogger.info('updater.skip-reset', { count: 0 })
  }

  async skip(version: string, now = this.now()): Promise<void> {
    await this.skipStore.skip(version, 'user', now)
    updaterLogger.info('updater.skip-version', { version })
    await auditLog('updater.skip-version', {
      actorId: 'local-profile',
      profileId: 'local-profile',
      severity: 'info',
      outcome: 'success',
      resourceKind: 'version',
      resourceId: version,
      payload: { version },
      source: 'UpdaterService.skip',
    })
  }

  async openReleasePage(update: UpdateInfo | null): Promise<boolean> {
    const url = update?.releaseUrl ?? UPDATER_FALLBACK_RELEASE_URL
    const result = await openExternalUrl(url)
    updaterLogger.info(result.ok ? 'updater.open-release' : 'updater.open-release.fail', {
      version: update?.version ?? null,
      url,
      reason: result.ok ? null : result.reason,
    })
    await auditLog('updater.open-release', {
      actorId: 'local-profile',
      profileId: 'local-profile',
      severity: result.ok ? 'info' : 'warning',
      outcome: result.ok ? 'success' : 'failure',
      resourceKind: 'version',
      resourceId: update?.version ?? 'latest',
      reason: result.ok ? undefined : result.reason,
      payload: { url, version: update?.version ?? null },
      source: 'UpdaterService.openReleasePage',
    })
    return result.ok
  }

  shouldNotifyVersion(settings: UpdaterSettings, update: UpdateInfo | null): boolean {
    if (!update || settings.notifiedVersions.includes(update.version)) {
      return false
    }

    return compareSemver(update.version, settings.latest?.version ?? this.options.currentVersion) >= 0
  }

  isHigherThanSkipped(update: UpdateInfo, skippedVersions: readonly { version: string }[]): boolean {
    if (skippedVersions.length === 0) {
      return true
    }

    const sortedSkipped = skippedVersions
      .map(entry => entry.version)
      .sort(compareSemver)
    const highestSkipped = sortedSkipped[sortedSkipped.length - 1]

    return highestSkipped ? isVersionGreaterThan(update.version, highestSkipped) : true
  }

  async checkNow(settings: UpdaterSettings, options: UpdaterCheckOptions): Promise<UpdaterCheckResult> {
    const checkedAt = options.now ?? this.now()

    if (!options.force && settings.lastCheckAt) {
      const lastCheckMs = Date.parse(settings.lastCheckAt)
      if (Number.isFinite(lastCheckMs) && checkedAt - lastCheckMs < UPDATER_BACKGROUND_THROTTLE_MS) {
        return {
          status: settings.lastStatus === 'idle' ? 'none' : settings.lastStatus,
          update: settings.latest,
          skipped: false,
          disabledReason: settings.lastDisabledReason,
          message: 'Updater background check skipped because a recent check already ran.',
          checkedAt,
          source: options.source,
        }
      }
    }

    const enterpriseDisabled = await this.readEnterpriseDisabled()
    const policy = evaluateUpdaterPolicy({
      settings,
      now: checkedAt,
      navigatorOnline: navigatorOnline(),
      offlineSince: offlineSinceFromStorage(checkedAt),
      envUpdaterValue: this.readEnvValue(),
      enterpriseDisabled,
      buildActive: this.buildActive(),
    })

    if (policy.disabled) {
      updaterLogger.info('updater.disabled', {
        source: options.source,
        reason: policy.reason,
        message: policy.message,
      })
      const disabledResult: UpdaterCheckResult = {
        status: 'disabled',
        update: settings.latest,
        skipped: false,
        disabledReason: policy.reason,
        message: policy.message,
        checkedAt,
        source: options.source,
      }
      if (options.source === 'manual') {
        await auditManualCheckResult(disabledResult)
      }
      return disabledResult
    }

    updaterLogger.info('updater.check.start', { source: options.source })
    const adapterResult = await this.adapter.check()
    const result = resultFromAdapterStatus(adapterResult, checkedAt, options.source)

    if (result.status === 'available' && result.update) {
      const skipped = await this.skipStore.isSkipped(result.update.version)
      updaterLogger.info(skipped ? 'updater.available.skipped' : 'updater.available', {
        version: result.update.version,
        source: options.source,
      })
      const finalResult: UpdaterCheckResult = { ...result, skipped }
      if (options.source === 'manual') {
        await auditManualCheckResult(finalResult)
      }
      return finalResult
    }

    if (result.status === 'signature-failed') {
      updaterLogger.error('updater.signature.fail', { source: options.source, message: result.message })
      if (options.source === 'manual') {
        await auditManualCheckResult(result)
      }
      return result
    }

    if (result.status === 'failed') {
      updaterLogger.warn('updater.check.fail', { source: options.source, message: result.message })
      if (options.source === 'manual') {
        await auditManualCheckResult(result)
      }
      return result
    }

    updaterLogger.info('updater.check.none', { source: options.source, status: result.status })
    if (options.source === 'manual') {
      await auditManualCheckResult(result)
    }
    return result
  }
}

export function createUpdaterService(options: UpdaterServiceOptions): UpdaterService {
  return new UpdaterService(options)
}
