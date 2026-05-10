import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  layoutPersistenceService,
  type LayoutCleanupResult,
  type LayoutInitializeResult,
  type LayoutSaveResult,
  type LayoutStatePatch,
  type LayoutStateRecord,
} from '@/services/layout-persistence'

interface LayoutPersistenceActionState {
  kind: 'initialize' | 'load' | 'save' | 'schedule' | 'clear' | 'cleanup'
  profileId: string
  windowId: string
  affectedCount: number
  at: number
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const useLayoutPersistenceStore = defineStore('layoutPersistence', () => {
  const currentRecord = ref<LayoutStateRecord | null>(null)
  const profileId = ref<string | null>(null)
  const windowId = ref<string>(layoutPersistenceService.currentWindowId)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const lastAction = ref<LayoutPersistenceActionState | null>(null)

  async function initialize(nextProfileId: string, nextWindowId?: string): Promise<LayoutInitializeResult> {
    isLoading.value = true
    error.value = null
    try {
      const result = await layoutPersistenceService.initialize(nextProfileId, nextWindowId)
      profileId.value = nextProfileId
      windowId.value = layoutPersistenceService.currentWindowId
      currentRecord.value = result.record
      lastAction.value = { kind: 'initialize', profileId: nextProfileId, windowId: windowId.value, affectedCount: result.record ? 1 : 0, at: Date.now() }
      return result
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function load(nextProfileId = profileId.value, nextWindowId = windowId.value): Promise<LayoutStateRecord | null> {
    if (!nextProfileId) return null
    isLoading.value = true
    error.value = null
    try {
      const record = await layoutPersistenceService.load(nextProfileId, nextWindowId)
      currentRecord.value = record
      profileId.value = nextProfileId
      windowId.value = nextWindowId
      lastAction.value = { kind: 'load', profileId: nextProfileId, windowId: nextWindowId, affectedCount: record ? 1 : 0, at: Date.now() }
      return record
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function save(patch: LayoutStatePatch, nextProfileId = profileId.value, nextWindowId = windowId.value): Promise<LayoutSaveResult> {
    if (!nextProfileId) throw new Error('profileId is required before saving layout state')
    isSaving.value = true
    error.value = null
    try {
      const result = await layoutPersistenceService.save(patch, nextProfileId, nextWindowId)
      currentRecord.value = result.record
      profileId.value = nextProfileId
      windowId.value = nextWindowId
      lastAction.value = { kind: 'save', profileId: nextProfileId, windowId: nextWindowId, affectedCount: 1, at: Date.now() }
      return result
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function scheduleSave(patch: LayoutStatePatch, nextProfileId = profileId.value, nextWindowId = windowId.value): void {
    if (!nextProfileId) return
    layoutPersistenceService.scheduleSave(patch, nextProfileId, nextWindowId)
    lastAction.value = { kind: 'schedule', profileId: nextProfileId, windowId: nextWindowId, affectedCount: 1, at: Date.now() }
  }

  async function flushScheduledSave(): Promise<LayoutSaveResult | null> {
    isSaving.value = true
    error.value = null
    try {
      const result = await layoutPersistenceService.flushScheduledSave()
      if (result) currentRecord.value = result.record
      return result
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function clear(nextProfileId = profileId.value, nextWindowId = windowId.value): Promise<void> {
    if (!nextProfileId) return
    isSaving.value = true
    error.value = null
    try {
      await layoutPersistenceService.clear(nextProfileId, nextWindowId)
      currentRecord.value = null
      lastAction.value = { kind: 'clear', profileId: nextProfileId, windowId: nextWindowId, affectedCount: 1, at: Date.now() }
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function cleanupStaleLayouts(nextProfileId = profileId.value, currentWindowId = windowId.value): Promise<LayoutCleanupResult> {
    if (!nextProfileId) return { deleted: 0, cutoff: Date.now() }
    isSaving.value = true
    error.value = null
    try {
      const result = await layoutPersistenceService.cleanupStaleLayouts(nextProfileId, currentWindowId)
      lastAction.value = { kind: 'cleanup', profileId: nextProfileId, windowId: currentWindowId, affectedCount: result.deleted, at: Date.now() }
      return result
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  return {
    currentRecord,
    profileId,
    windowId,
    isLoading,
    isSaving,
    error,
    lastAction,
    initialize,
    load,
    save,
    scheduleSave,
    flushScheduledSave,
    clear,
    cleanupStaleLayouts,
  }
})