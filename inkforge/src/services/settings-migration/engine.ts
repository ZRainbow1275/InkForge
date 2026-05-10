import { buildSettingsMigrationDiff } from './diff'
import type {
  CreateSettingsMigrationSnapshotOptions,
  DeprecationRecord,
  PreviewSettingsMigrationOptions,
  SettingsMigrationResult,
  SettingsMigrationSnapshotRecord,
  SettingsMigrationStep,
} from './types'

export const MIN_SUPPORTED_SETTINGS_SCHEMA_VERSION = 0

export const SETTINGS_MIGRATION_STEPS: readonly SettingsMigrationStep[] = [
  {
    id: 'settings-v0-to-v1',
    from: 0,
    to: 1,
    description: 'Normalize unversioned Settings into the structured Settings registry shape.',
    deprecations: [
      {
        path: 'theme',
        reason: 'Root theme was replaced by appearance.theme.',
        replacement: 'appearance.theme',
      },
      {
        path: 'font',
        reason: 'Root font was replaced by appearance.fontFamily.',
        replacement: 'appearance.fontFamily',
      },
      {
        path: 'paperWidth',
        reason: 'Root paperWidth was replaced by editor.editorWidth.',
        replacement: 'editor.editorWidth',
      },
      {
        path: 'legacyMode',
        reason: 'Legacy mode is no longer stored as a root setting.',
        replacement: 'editor.editorMode',
        fallbackValue: 'typora',
      },
    ],
  },
  {
    id: 'settings-v1-to-v2',
    from: 1,
    to: 2,
    description: 'Rename legacy paper-width shortcuts and normalize bounded settings values.',
    deprecations: [
      {
        path: 'shortcuts.zoomIn',
        reason: 'Zoom-in shortcut was renamed to paperWidthNext.',
        replacement: 'shortcuts.paperWidthNext',
      },
      {
        path: 'shortcuts.zoomOut',
        reason: 'Zoom-out shortcut was renamed to paperWidthPrev.',
        replacement: 'shortcuts.paperWidthPrev',
      },
    ],
  },
  {
    id: 'settings-v2-to-v3',
    from: 2,
    to: 3,
    description: 'Add developer diagnostics metadata and bounded rollback snapshot support.',
    deprecations: [
      {
        path: 'advanced.devtoolsEnabled',
        reason: 'Dev tools state is now stored as advanced.developerMode.',
        replacement: 'advanced.developerMode',
        fallbackValue: false,
      },
    ],
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneSerializableRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {}
  }

  try {
    const cloned = JSON.parse(JSON.stringify(value)) as unknown
    return isRecord(cloned) ? cloned : {}
  } catch {
    return { ...value }
  }
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function ensureRecord(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  const current = parent[key]
  if (isRecord(current)) {
    return current
  }

  const next: Record<string, unknown> = {}
  parent[key] = next
  return next
}

function coerceEnumValue<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : undefined
}

function detectObjectSchemaVersion(value: unknown): number {
  if (!isRecord(value)) {
    return 0
  }

  const explicitVersion = value.schemaVersion
  if (typeof explicitVersion === 'number' && Number.isInteger(explicitVersion) && explicitVersion >= 0) {
    return explicitVersion
  }

  const meta = value.__meta
  if (isRecord(meta)) {
    const metaVersion = meta.schemaVersion
    if (typeof metaVersion === 'number' && Number.isInteger(metaVersion) && metaVersion >= 0) {
      return metaVersion
    }
  }

  return 0
}

export function detectSettingsSchemaVersion(value: unknown): number {
  return detectObjectSchemaVersion(value)
}

function collectSteps(fromVersion: number, targetVersion: number): SettingsMigrationStep[] {
  const steps: SettingsMigrationStep[] = []
  let cursor = fromVersion

  while (cursor < targetVersion) {
    const step = SETTINGS_MIGRATION_STEPS.find(candidate => candidate.from === cursor)
    if (!step) {
      throw new Error(`No Settings migration registered from v${cursor} to v${cursor + 1}`)
    }

    steps.push(step)
    cursor = step.to
  }

  return steps
}

function applyV0ToV1(input: Record<string, unknown>): Record<string, unknown> {
  const output = cloneSerializableRecord(input)
  const appearance = ensureRecord(output, 'appearance')
  const editor = ensureRecord(output, 'editor')

  const theme = coerceEnumValue(output.theme, ['light', 'dark', 'system'] as const)
  if (theme && !hasOwn(appearance, 'theme')) {
    appearance.theme = theme
  }

  const fontFamily = coerceEnumValue(output.font, ['serif', 'sans', 'kai', 'mono'] as const)
  if (fontFamily && !hasOwn(appearance, 'fontFamily')) {
    appearance.fontFamily = fontFamily
  }

  const editorWidth = coerceEnumValue(output.paperWidth, ['narrow', 'medium', 'wide', 'full'] as const)
  if (editorWidth && !hasOwn(editor, 'editorWidth')) {
    editor.editorWidth = editorWidth
  }

  if (!hasOwn(editor, 'editorMode') && (output.legacyMode === true || editor.legacyMode === true)) {
    editor.editorMode = 'typora'
  }

  delete output.theme
  delete output.font
  delete output.paperWidth
  delete output.legacyMode
  delete editor.legacyMode
  output.schemaVersion = 1
  return output
}

function applyV1ToV2(input: Record<string, unknown>): Record<string, unknown> {
  const output = cloneSerializableRecord(input)
  const shortcuts = ensureRecord(output, 'shortcuts')

  if (typeof shortcuts.zoomIn === 'string' && !hasOwn(shortcuts, 'paperWidthNext')) {
    shortcuts.paperWidthNext = shortcuts.zoomIn
  }

  if (typeof shortcuts.zoomOut === 'string' && !hasOwn(shortcuts, 'paperWidthPrev')) {
    shortcuts.paperWidthPrev = shortcuts.zoomOut
  }

  delete shortcuts.zoomIn
  delete shortcuts.zoomOut
  output.schemaVersion = 2
  return output
}

function applyV2ToV3(input: Record<string, unknown>): Record<string, unknown> {
  const output = cloneSerializableRecord(input)
  const advanced = ensureRecord(output, 'advanced')

  if (typeof advanced.devtoolsEnabled === 'boolean' && !hasOwn(advanced, 'developerMode')) {
    advanced.developerMode = advanced.devtoolsEnabled
  }

  delete advanced.devtoolsEnabled
  output.schemaVersion = 3
  return output
}

function applyStep(input: Record<string, unknown>, step: SettingsMigrationStep): Record<string, unknown> {
  if (step.from === 0 && step.to === 1) {
    return applyV0ToV1(input)
  }

  if (step.from === 1 && step.to === 2) {
    return applyV1ToV2(input)
  }

  if (step.from === 2 && step.to === 3) {
    return applyV2ToV3(input)
  }

  throw new Error(`Settings migration ${step.id} has no implementation`)
}

function collectDeprecations(steps: readonly SettingsMigrationStep[]): DeprecationRecord[] {
  return steps.flatMap(step => [...step.deprecations])
}

export function previewSettingsMigration<T>(options: PreviewSettingsMigrationOptions<T>): SettingsMigrationResult<T> {
  const startedAt = Date.now()
  const now = options.now ?? (() => new Date())
  const fileKind = options.fileKind ?? 'settings'
  const minSupportedVersion = options.minSupportedVersion ?? MIN_SUPPORTED_SETTINGS_SCHEMA_VERSION
  const fromVersion = detectSettingsSchemaVersion(options.raw)
  const toVersion = options.currentVersion

  if (fromVersion < minSupportedVersion) {
    return {
      ok: false,
      error: {
        code: 'unsupported-version',
        message: `Settings schema v${fromVersion} is below the minimum supported v${minSupportedVersion}.`,
        fromVersion,
        toVersion,
      },
    }
  }

  if (fromVersion > toVersion) {
    return {
      ok: false,
      error: {
        code: 'future-version',
        message: `Settings schema v${fromVersion} is newer than this app supports (v${toVersion}).`,
        fromVersion,
        toVersion,
      },
    }
  }

  try {
    const steps = collectSteps(fromVersion, toVersion)
    const deprecations = collectDeprecations(steps)
    let migrated = cloneSerializableRecord(options.raw)

    for (const step of steps) {
      migrated = applyStep(migrated, step)
    }

    if (fromVersion === toVersion) {
      migrated.schemaVersion = toVersion
    }

    const normalized = options.normalize(migrated)
    const validation = options.validate(normalized)

    if (!validation.success) {
      return {
        ok: false,
        error: {
          code: 'zod-validation-failure',
          message: 'Settings migration output failed runtime validation.',
          fromVersion,
          toVersion,
          details: validation.issues,
        },
      }
    }

    const diff = buildSettingsMigrationDiff(options.raw, validation.data, deprecations)

    return {
      ok: true,
      preview: {
        fileKind,
        fromVersion,
        toVersion,
        requiresMigration: fromVersion < toVersion || diff.length > 0,
        steps,
        diff,
        deprecations,
        candidate: validation.data,
        durationMs: Math.max(0, Date.now() - startedAt),
        generatedAt: now().toISOString(),
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'migration-function-thrown',
        message: error instanceof Error ? error.message : String(error),
        fromVersion,
        toVersion,
      },
    }
  }
}

export function createSettingsMigrationSnapshot<T extends { schemaVersion: number }>(
  settings: T,
  reason: string,
  options: CreateSettingsMigrationSnapshotOptions = {},
): SettingsMigrationSnapshotRecord<T> {
  const createdAt = options.now?.() ?? new Date()
  const idPrefix = options.idPrefix ?? 'settings-rollback'
  const clonedSettings = JSON.parse(JSON.stringify(settings)) as T

  return {
    id: `${idPrefix}-${createdAt.getTime().toString(36)}`,
    createdAt: createdAt.toISOString(),
    reason,
    schemaVersion: settings.schemaVersion,
    settings: clonedSettings,
  }
}

export function prependSettingsMigrationSnapshot<T>(
  snapshots: readonly SettingsMigrationSnapshotRecord<T>[],
  snapshot: SettingsMigrationSnapshotRecord<T>,
  limit = 10,
): SettingsMigrationSnapshotRecord<T>[] {
  return [snapshot, ...snapshots].slice(0, Math.max(1, limit))
}
