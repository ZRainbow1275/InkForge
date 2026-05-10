import type { DeprecationRecord, SettingsMigrationDiffEntry } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function flattenValue(value: unknown, path: string, output: Map<string, unknown>): void {
  if (isRecord(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0 && path) {
      output.set(path, {})
      return
    }

    for (const [key, child] of entries) {
      flattenValue(child, path ? `${path}.${key}` : key, output)
    }
    return
  }

  if (path) {
    output.set(path, value)
  }
}

function findDeprecation(path: string, deprecations: readonly DeprecationRecord[]): DeprecationRecord | undefined {
  return deprecations.find(deprecation => path === deprecation.path || path.startsWith(`${deprecation.path}.`))
}

export function buildSettingsMigrationDiff(
  before: unknown,
  after: unknown,
  deprecations: readonly DeprecationRecord[] = [],
): SettingsMigrationDiffEntry[] {
  const beforeMap = new Map<string, unknown>()
  const afterMap = new Map<string, unknown>()
  flattenValue(before, '', beforeMap)
  flattenValue(after, '', afterMap)

  const paths = Array.from(new Set([...beforeMap.keys(), ...afterMap.keys()])).sort((left, right) => left.localeCompare(right))
  const diff: SettingsMigrationDiffEntry[] = []

  for (const path of paths) {
    const hasBefore = beforeMap.has(path)
    const hasAfter = afterMap.has(path)
    const beforeValue = beforeMap.get(path)
    const afterValue = afterMap.get(path)

    if (hasBefore && hasAfter && stableStringify(beforeValue) === stableStringify(afterValue)) {
      continue
    }

    const deprecated = findDeprecation(path, deprecations)
    if (!hasBefore && hasAfter) {
      diff.push({ path, kind: 'added', after: afterValue, deprecated })
      continue
    }

    if (hasBefore && !hasAfter) {
      diff.push({ path, kind: 'removed', before: beforeValue, deprecated })
      continue
    }

    diff.push({ path, kind: 'changed', before: beforeValue, after: afterValue, deprecated })
  }

  return diff
}

export function summarizeSettingsMigrationDiff(diff: readonly SettingsMigrationDiffEntry[]): Record<SettingsMigrationDiffEntry['kind'], number> {
  return diff.reduce<Record<SettingsMigrationDiffEntry['kind'], number>>(
    (summary, entry) => ({ ...summary, [entry.kind]: summary[entry.kind] + 1 }),
    { added: 0, removed: 0, changed: 0 },
  )
}
