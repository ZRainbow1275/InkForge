import { getActivePinia } from 'pinia'
import { createActivityLogger } from '@/services/activity-logger'
import { parsePrimitiveInput, sanitizeDevToolsValue, isPrimitiveEditableValue, type JsonPrimitive } from './sanitizer'
import type { StoreInspectorEntry, StorePatchResult } from './types'

export const STORE_PATCH_CONFIRMATION = 'PATCH_STORE_STATE'
const devLogger = createActivityLogger({ module: 'dev', scope: 'global', profileId: 'local-profile', autoFlush: false })

function rootState(): Record<string, unknown> {
  const pinia = getActivePinia()
  return (pinia?.state.value ?? {}) as Record<string, unknown>
}

function resolvePath(root: unknown, path: string): { parent: Record<string, unknown>; key: string; value: unknown } | null {
  const parts = path.split('.').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0 || parts.length > 8) return null

  let cursor: unknown = root
  for (const part of parts.slice(0, -1)) {
    if (typeof cursor !== 'object' || cursor === null || Array.isArray(cursor)) return null
    cursor = (cursor as Record<string, unknown>)[part]
  }

  if (typeof cursor !== 'object' || cursor === null || Array.isArray(cursor)) return null
  const key = parts[parts.length - 1]
  return { parent: cursor as Record<string, unknown>, key, value: (cursor as Record<string, unknown>)[key] }
}

function countPrimitiveLeaves(value: unknown): number {
  if (isPrimitiveEditableValue(value)) return 1
  if (Array.isArray(value)) return value.reduce((total, item) => total + countPrimitiveLeaves(item), 0)
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).reduce((total, item) => total + countPrimitiveLeaves(item), 0)
  }
  return 0
}

export function listPiniaStores(): StoreInspectorEntry[] {
  const state = rootState()
  return Object.entries(state)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, storeState]) => ({
      id,
      keys: typeof storeState === 'object' && storeState !== null ? Object.keys(storeState as Record<string, unknown>).sort() : [],
      primitiveCount: countPrimitiveLeaves(storeState),
      state: sanitizeDevToolsValue(storeState),
    }))
}

export function patchPiniaStorePrimitive(input: {
  storeId: string
  path: string
  nextValue: JsonPrimitive | string
  confirmation: string
}): StorePatchResult {
  if (input.confirmation !== STORE_PATCH_CONFIRMATION) {
    throw new Error('Store patch requires explicit confirmation')
  }

  const state = rootState()
  const storeState = state[input.storeId]
  if (!storeState) {
    throw new Error(`Pinia store not found: ${input.storeId}`)
  }

  const resolved = resolvePath(storeState, input.path)
  if (!resolved) {
    throw new Error(`Invalid store path: ${input.path}`)
  }
  if (!isPrimitiveEditableValue(resolved.value)) {
    throw new Error('Only primitive store values can be patched from DevPanel')
  }

  const nextValue = typeof input.nextValue === 'string' ? parsePrimitiveInput(input.nextValue) : input.nextValue
  if (!isPrimitiveEditableValue(nextValue)) {
    throw new Error('DevPanel store patch value must be string, number, boolean, or null')
  }

  const oldValue = resolved.value
  resolved.parent[resolved.key] = nextValue
  const patchedAt = Date.now()
  devLogger.warn('dev.store.patch', {
    storeId: input.storeId,
    path: input.path,
    oldValue,
    newValue: nextValue,
    patchedAt,
  })
  void devLogger.flush()

  return { storeId: input.storeId, path: input.path, oldValue, newValue: nextValue, patchedAt }
}