import { db } from '@/utils/db'
import { createDefaultLayoutState, getLayoutWindowId, layoutStateKey } from './defaults'
import { migrateLayoutState, normalizeLayoutStatePatch } from './migration'
import {
  LAYOUT_RETENTION_MS,
  LayoutStateRecordSchema,
  SerializedTabSchema,
  type LayoutCleanupResult,
  type LayoutInitializeResult,
  type LayoutSaveResult,
  type LayoutStatePatch,
  type LayoutStateRecord,
  type LayoutTabValidationResult,
  type SerializedTab,
} from './types'

export const SYNC_EXCLUDED_LAYOUT_TABLES = ['layoutStates'] as const

interface PendingSaveState {
  patch: LayoutStatePatch
  profileId: string
  windowId: string
}

export class LayoutPersistenceService {
  private profileId = 'local-profile'
  private windowId = getLayoutWindowId()
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private pendingSave: PendingSaveState | null = null

  get currentProfileId(): string {
    return this.profileId
  }

  get currentWindowId(): string {
    return this.windowId
  }

  key(profileId = this.profileId, windowId = this.windowId): string {
    return layoutStateKey(profileId, windowId)
  }

  async initialize(profileId: string, windowId: string = getLayoutWindowId()): Promise<LayoutInitializeResult> {
    this.profileId = profileId
    this.windowId = windowId
    const raw = await db.layoutStates.get(layoutStateKey(profileId, windowId))
    if (!raw) {
      return { record: null, migrated: false }
    }

    const parsed = LayoutStateRecordSchema.safeParse(raw)
    if (parsed.success) {
      return { record: parsed.data, migrated: false }
    }

    const migrated = migrateLayoutState(raw, profileId, windowId)
    await this.saveRaw(migrated)
    return { record: migrated, migrated: true }
  }

  async load(profileId = this.profileId, windowId = this.windowId): Promise<LayoutStateRecord | null> {
    const raw = await db.layoutStates.get(layoutStateKey(profileId, windowId))
    if (!raw) return null
    try {
      return LayoutStateRecordSchema.parse(raw)
    } catch {
      return migrateLayoutState(raw, profileId, windowId)
    }
  }

  async save(patch: LayoutStatePatch, profileId = this.profileId, windowId = this.windowId): Promise<LayoutSaveResult> {
    this.profileId = profileId
    this.windowId = windowId
    const now = patch.savedAt ?? Date.now()
    const existing = await this.load(profileId, windowId)
    const base = existing ?? createDefaultLayoutState(profileId, windowId, now)
    const normalizedPatch = normalizeLayoutStatePatch(patch, base)
    const record = LayoutStateRecordSchema.parse({
      ...base,
      ...normalizedPatch,
      id: layoutStateKey(profileId, windowId),
      schemaVersion: 1,
      profileId,
      windowId,
      layoutVersion: 1,
      savedAt: now,
      updatedAt: now,
    })
    await this.saveRaw(record)
    return { record, persisted: true }
  }

  scheduleSave(patch: LayoutStatePatch, profileId = this.profileId, windowId = this.windowId, delayMs = 500): void {
    this.pendingSave = {
      profileId,
      windowId,
      patch: {
        ...(this.pendingSave?.patch ?? {}),
        ...patch,
      },
    }
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      void this.flushScheduledSave()
    }, delayMs)
  }

  async flushScheduledSave(): Promise<LayoutSaveResult | null> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    const pending = this.pendingSave
    this.pendingSave = null
    if (!pending) return null
    return this.save(pending.patch, pending.profileId, pending.windowId)
  }

  async clear(profileId = this.profileId, windowId = this.windowId): Promise<void> {
    await db.layoutStates.delete(layoutStateKey(profileId, windowId))
  }

  async cleanupStaleLayouts(profileId: string, currentWindowId = this.windowId, now = Date.now()): Promise<LayoutCleanupResult> {
    const cutoff = now - LAYOUT_RETENTION_MS
    const rows = await db.layoutStates.where('profileId').equals(profileId).toArray()
    const staleIds = rows
      .map(row => {
        const parsed = LayoutStateRecordSchema.safeParse(row)
        if (parsed.success) return parsed.data
        const rawRow = row as { profileId?: unknown, windowId?: unknown }
        const rowProfileId = typeof rawRow.profileId === 'string' ? rawRow.profileId : profileId
        const rowWindowId = typeof rawRow.windowId === 'string' ? rawRow.windowId : currentWindowId
        return migrateLayoutState(row, rowProfileId, rowWindowId)
      })
      .filter(row => row.windowId !== currentWindowId && row.savedAt < cutoff)
      .map(row => row.id)
    if (staleIds.length > 0) {
      await db.layoutStates.bulkDelete(staleIds)
    }
    return { deleted: staleIds.length, cutoff }
  }

  validateSerializedTabs(tabs: unknown[], activeTabId: string | null, existingArticleIds: readonly string[]): LayoutTabValidationResult {
    const articleIds = new Set(existingArticleIds)
    const removedTabIds: string[] = []
    const openTabs = tabs.reduce<SerializedTab[]>((accepted, rawTab) => {
      const parsed = SerializedTabSchema.safeParse(rawTab)
      if (!parsed.success || !articleIds.has(parsed.data.articleId)) {
        if (rawTab && typeof rawTab === 'object' && 'id' in rawTab) {
          const rejectedTabId = (rawTab as { id?: unknown }).id
          if (typeof rejectedTabId === 'string' && rejectedTabId.length > 0) {
            removedTabIds.push(rejectedTabId)
          }
        }
        return accepted
      }
      accepted.push(parsed.data)
      return accepted
    }, [])
    const acceptedTabIds = new Set(openTabs.map(tab => tab.id))
    const tabOrder = openTabs.map(tab => tab.id)
    const nextActiveTabId = activeTabId && acceptedTabIds.has(activeTabId) ? activeTabId : openTabs[0]?.id ?? null
    return { openTabs, tabOrder, activeTabId: nextActiveTabId, removedTabIds }
  }

  private async saveRaw(record: LayoutStateRecord): Promise<void> {
    await db.layoutStates.put(record)
  }
}

export const layoutPersistenceService = new LayoutPersistenceService()