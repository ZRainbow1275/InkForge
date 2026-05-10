import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  buildSettingsMigrationDiff,
  createSettingsMigrationSnapshot,
  detectSettingsSchemaVersion,
  prependSettingsMigrationSnapshot,
  previewSettingsMigration,
  summarizeSettingsMigrationDiff,
} from './index'

type TestSettings = z.infer<typeof TestSettingsSchema>

const TestSettingsSchema = z.object({
  schemaVersion: z.literal(3),
  appearance: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('light'),
    fontFamily: z.enum(['serif', 'sans', 'kai', 'mono']).default('serif'),
  }),
  editor: z.object({
    editorMode: z.enum(['typora', 'source', 'preview']).default('typora'),
    editorWidth: z.enum(['narrow', 'medium', 'wide', 'full']).default('medium'),
  }),
  advanced: z.object({
    developerMode: z.boolean().default(false),
    migrationSnapshots: z.array(z.unknown()).default([]),
  }),
  shortcuts: z.record(z.string(), z.string()),
})

function normalizeTestSettings(input: unknown): TestSettings {
  const parsed = typeof input === 'object' && input !== null ? input as Partial<TestSettings> : {}
  return {
    schemaVersion: 3,
    appearance: {
      theme: parsed.appearance?.theme ?? 'light',
      fontFamily: parsed.appearance?.fontFamily ?? 'serif',
    },
    editor: {
      editorMode: parsed.editor?.editorMode ?? 'typora',
      editorWidth: parsed.editor?.editorWidth ?? 'medium',
    },
    advanced: {
      developerMode: parsed.advanced?.developerMode ?? false,
      migrationSnapshots: parsed.advanced?.migrationSnapshots ?? [],
    },
    shortcuts: parsed.shortcuts ?? {},
  }
}

function validateTestSettings(candidate: unknown) {
  const result = TestSettingsSchema.safeParse(candidate)
  return result.success
    ? { success: true as const, data: result.data }
    : { success: false as const, issues: result.error.issues.map(issue => issue.message) }
}

describe('settings migration engine', () => {
  it('detects explicit, meta, and unversioned schema versions', () => {
    expect(detectSettingsSchemaVersion({ schemaVersion: 2 })).toBe(2)
    expect(detectSettingsSchemaVersion({ __meta: { schemaVersion: 1 } })).toBe(1)
    expect(detectSettingsSchemaVersion({ theme: 'dark' })).toBe(0)
  })

  it('previews and applies the v0 to v3 Settings migration chain', () => {
    const result = previewSettingsMigration({
      raw: {
        theme: 'dark',
        font: 'sans',
        paperWidth: 'wide',
        legacyMode: true,
        shortcuts: {
          zoomIn: 'Ctrl+=',
          zoomOut: 'Ctrl+-',
        },
        advanced: {
          devtoolsEnabled: true,
        },
      },
      currentVersion: 3,
      normalize: normalizeTestSettings,
      validate: validateTestSettings,
      now: () => new Date('2026-05-02T00:00:00.000Z'),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.preview.fromVersion).toBe(0)
    expect(result.preview.toVersion).toBe(3)
    expect(result.preview.steps.map(step => step.id)).toEqual([
      'settings-v0-to-v1',
      'settings-v1-to-v2',
      'settings-v2-to-v3',
    ])
    expect(result.preview.candidate.appearance.theme).toBe('dark')
    expect(result.preview.candidate.appearance.fontFamily).toBe('sans')
    expect(result.preview.candidate.editor.editorWidth).toBe('wide')
    expect(result.preview.candidate.advanced.developerMode).toBe(true)
    expect(result.preview.candidate.shortcuts.paperWidthNext).toBe('Ctrl+=')
    expect(result.preview.candidate.shortcuts.paperWidthPrev).toBe('Ctrl+-')
    expect(result.preview.deprecations.map(deprecation => deprecation.path)).toContain('shortcuts.zoomIn')
    expect(result.preview.diff.some(entry => entry.path === 'theme' && entry.kind === 'removed')).toBe(true)
  })

  it('blocks future Settings versions instead of silently downgrading them', () => {
    const result = previewSettingsMigration({
      raw: { schemaVersion: 99 },
      currentVersion: 3,
      normalize: normalizeTestSettings,
      validate: validateTestSettings,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('future-version')
  })

  it('reports validation failures without returning a candidate', () => {
    const result = previewSettingsMigration({
      raw: { schemaVersion: 3, appearance: { theme: 'dark' } },
      currentVersion: 3,
      normalize: () => ({ schemaVersion: 2 }) as unknown,
      validate: validateTestSettings,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('zod-validation-failure')
  })

  it('summarizes semantic diff entries and marks deprecated paths', () => {
    const diff = buildSettingsMigrationDiff(
      { oldPath: true, nested: { a: 1 } },
      { nested: { a: 2 }, added: 'yes' },
      [{ path: 'oldPath', reason: 'deprecated' }],
    )
    const summary = summarizeSettingsMigrationDiff(diff)

    expect(summary.added).toBe(1)
    expect(summary.removed).toBe(1)
    expect(summary.changed).toBe(1)
    expect(diff.find(entry => entry.path === 'oldPath')?.deprecated?.reason).toBe('deprecated')
  })

  it('creates bounded rollback snapshots with the original schema version', () => {
    const snapshot = createSettingsMigrationSnapshot(
      normalizeTestSettings({ advanced: { developerMode: true } }),
      'import:v0-to-v3',
      { now: () => new Date('2026-05-02T01:02:03.000Z') },
    )
    const snapshots = prependSettingsMigrationSnapshot(
      Array.from({ length: 10 }, (_, index) => ({ ...snapshot, id: `older-${index}` })),
      snapshot,
      10,
    )

    expect(snapshot.id).toBe('settings-rollback-monmznco')
    expect(snapshot.schemaVersion).toBe(3)
    expect(snapshots).toHaveLength(10)
    expect(snapshots[0].id).toBe(snapshot.id)
  })
})
