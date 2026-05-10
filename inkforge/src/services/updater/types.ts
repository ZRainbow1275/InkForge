export const UPDATER_STARTUP_DELAY_MS = 30_000
export const UPDATER_INTERVAL_MS = 6 * 60 * 60 * 1000
export const UPDATER_BACKGROUND_THROTTLE_MS = 30 * 60 * 1000
export const UPDATER_OFFLINE_DISABLE_MS = 24 * 60 * 60 * 1000
export const UPDATER_FALLBACK_RELEASE_URL = 'https://github.com/ZRainbow1275/InkForge/releases'
export const UPDATER_SKIPPED_FALLBACK_KEY = 'inkforge.updater.skippedVersions'
export const UPDATER_NOTIFIED_PREFIX = 'inkforge.updater.notified.'

export const UPDATER_CHECK_SOURCE_VALUES = ['startup', 'interval', 'resume', 'manual'] as const
export type UpdaterCheckSource = typeof UPDATER_CHECK_SOURCE_VALUES[number]

export const UPDATER_STATUS_VALUES = ['idle', 'checking', 'available', 'none', 'disabled', 'failed', 'signature-failed'] as const
export type UpdaterStatus = typeof UPDATER_STATUS_VALUES[number]

export const UPDATER_DISABLED_REASON_VALUES = [
  'user-setting',
  'enterprise-policy',
  'env',
  'offline',
  'runtime-unavailable',
  'build-config',
] as const
export type UpdaterDisabledReason = typeof UPDATER_DISABLED_REASON_VALUES[number]

export const UPDATER_SKIP_REASON_VALUES = ['user', 'auto'] as const
export type UpdaterSkipReason = typeof UPDATER_SKIP_REASON_VALUES[number]

export interface UpdateInfo {
  version: string
  releasedAt: number | null
  notes: string
  size: number | null
  signatureOk: boolean
  releaseUrl: string
}

export interface UpdaterSettings {
  autoCheckDisabled: boolean
  lastCheckAt: string | null
  lastSuccessfulCheckAt: string | null
  lastStatus: UpdaterStatus
  lastDisabledReason: UpdaterDisabledReason | null
  lastErrorMessage: string | null
  latest: UpdateInfo | null
  notifiedVersions: string[]
}

export interface SkippedVersionRecord {
  version: string
  skippedAt: number
  reason?: UpdaterSkipReason
}

export interface UpdaterPolicyInput {
  settings: UpdaterSettings
  now: number
  navigatorOnline?: boolean
  offlineSince?: number | null
  envUpdaterValue?: string | undefined
  enterpriseDisabled?: boolean
  runtimeAvailable?: boolean
  buildActive?: boolean
}

export interface UpdaterPolicyResult {
  disabled: boolean
  reason: UpdaterDisabledReason | null
  message: string | null
}

export interface UpdaterCheckOptions {
  source: UpdaterCheckSource
  force?: boolean
  now?: number
}

export interface UpdaterAdapterResult {
  status: 'available' | 'none' | 'unavailable' | 'signature-failed' | 'failed'
  update: UpdateInfo | null
  message?: string
}

export interface UpdaterCheckResult {
  status: UpdaterStatus
  update: UpdateInfo | null
  skipped: boolean
  disabledReason: UpdaterDisabledReason | null
  message: string | null
  checkedAt: number
  source: UpdaterCheckSource
}

export interface UpdaterAdapter {
  check(): Promise<UpdaterAdapterResult>
}

export interface UpdaterSkipStore {
  list(): Promise<SkippedVersionRecord[]>
  isSkipped(version: string): Promise<boolean>
  skip(version: string, reason?: UpdaterSkipReason, now?: number): Promise<SkippedVersionRecord>
  clear(): Promise<void>
}

export interface RenderedReleaseNotes {
  html: string
  strippedImageCount: number
}
