export const SETTINGS_FILE_KIND_VALUES = [
  'settings',
  'keybindings',
  'theme',
  'template',
  'exportPreset',
  'extensionConfig',
] as const

export type SettingsFileKind = typeof SETTINGS_FILE_KIND_VALUES[number]

export interface DeprecationRecord {
  path: string
  reason: string
  replacement?: string
  fallbackValue?: unknown
}

export interface SettingsMigrationStep {
  id: string
  from: number
  to: number
  description: string
  deprecations: readonly DeprecationRecord[]
}

export type SettingsMigrationDiffKind = 'added' | 'removed' | 'changed'

export interface SettingsMigrationDiffEntry {
  path: string
  kind: SettingsMigrationDiffKind
  before?: unknown
  after?: unknown
  deprecated?: DeprecationRecord
}

export interface SettingsMigrationPreview<T = unknown> {
  fileKind: SettingsFileKind
  fromVersion: number
  toVersion: number
  requiresMigration: boolean
  steps: readonly SettingsMigrationStep[]
  diff: readonly SettingsMigrationDiffEntry[]
  deprecations: readonly DeprecationRecord[]
  candidate: T
  durationMs: number
  generatedAt: string
}

export type SettingsMigrationFailureCode =
  | 'parse-failure'
  | 'unsupported-version'
  | 'future-version'
  | 'zod-validation-failure'
  | 'migration-function-thrown'

export interface SettingsMigrationFailure {
  code: SettingsMigrationFailureCode
  message: string
  fromVersion?: number
  toVersion?: number
  details?: readonly string[]
}

export type SettingsMigrationResult<T = unknown> =
  | { ok: true; preview: SettingsMigrationPreview<T> }
  | { ok: false; error: SettingsMigrationFailure }

export type SettingsMigrationValidationResult<T> =
  | { success: true; data: T }
  | { success: false; issues: readonly string[] }

export type SettingsMigrationNormalizer<T> = (input: unknown) => T
export type SettingsMigrationValidator<T> = (candidate: unknown) => SettingsMigrationValidationResult<T>

export interface PreviewSettingsMigrationOptions<T> {
  raw: unknown
  currentVersion: number
  normalize: SettingsMigrationNormalizer<T>
  validate: SettingsMigrationValidator<T>
  fileKind?: SettingsFileKind
  minSupportedVersion?: number
  now?: () => Date
}

export interface SettingsMigrationSnapshotRecord<T = unknown> {
  id: string
  createdAt: string
  reason: string
  schemaVersion: number
  settings: T
}

export interface CreateSettingsMigrationSnapshotOptions {
  idPrefix?: string
  now?: () => Date
}
