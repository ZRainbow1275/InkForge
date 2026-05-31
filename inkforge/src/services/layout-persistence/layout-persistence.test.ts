import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { db } from '@/utils/db'
import { useLayoutPersistenceStore } from '@/stores/layoutPersistence'
import { createDefaultLayoutState, layoutStateKey } from './defaults'
import { normalizeLayoutStatePatch } from './migration'
import { LayoutPersistenceService, SYNC_EXCLUDED_LAYOUT_TABLES } from './service'
import type { LayoutStateRecord } from './types'

function stubLayoutStateTable(initial: LayoutStateRecord[] = []) {
  const table = new Map<string, LayoutStateRecord | Record<string, unknown>>(initial.map(record => [record.id, record]))
  const getSpy = vi.spyOn(db.layoutStates, 'get')
  const putSpy = vi.spyOn(db.layoutStates, 'put')
  const deleteSpy = vi.spyOn(db.layoutStates, 'delete')
  const bulkDeleteSpy = vi.spyOn(db.layoutStates, 'bulkDelete')
  const whereSpy = vi.spyOn(db.layoutStates, 'where')

  getSpy.mockImplementation(((key: unknown) => Promise.resolve(table.get(String(key)))) as never)
  putSpy.mockImplementation(((record: LayoutStateRecord) => {
    table.set(record.id, record)
    return Promise.resolve(record.id)
  }) as never)
  deleteSpy.mockImplementation(((key: unknown) => {
    table.delete(String(key))
    return Promise.resolve()
  }) as never)
  bulkDeleteSpy.mockImplementation(((keys: readonly unknown[]) => {
    for (const key of keys) table.delete(String(key))
    return Promise.resolve()
  }) as never)
  whereSpy.mockImplementation(((indexName: string) => ({
    equals: (value: string) => ({
      toArray: async () => Array.from(table.values()).filter(record => {
        if (indexName !== 'profileId') return false
        return record.profileId === value
      }),
    }),
  })) as never)

  return { table }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('LayoutPersistenceService', () => {
  it('saves, loads, clears, and isolates layout state by profile and window', async () => {
    const { table } = stubLayoutStateTable()
    const service = new LayoutPersistenceService()

    await service.save({
      managerCollapsed: true,
      editorMode: 'source',
      splitViewEnabled: true,
      splitViewRatio: 0.7,
      splitViewSyncScroll: false,
      splitViewLeftFontScale: 18,
      splitViewRightFontScale: 15,
    }, 'profile-a', 'window-1')
    await service.save({ managerCollapsed: false, editorMode: 'preview' }, 'profile-a', 'window-2')
    await service.save({ managerCollapsed: false, editorMode: 'typora' }, 'profile-b', 'window-1')

    expect((await service.load('profile-a', 'window-1'))?.managerCollapsed).toBe(true)
    const splitRecord = await service.load('profile-a', 'window-1')
    expect(splitRecord?.editorMode).toBe('source')
    expect(splitRecord?.splitViewEnabled).toBe(true)
    expect(splitRecord?.splitViewRatio).toBe(0.7)
    expect(splitRecord?.splitViewSyncScroll).toBe(false)
    expect(splitRecord?.splitViewLeftFontScale).toBe(18)
    expect(splitRecord?.splitViewRightFontScale).toBe(15)
    expect((await service.load('profile-a', 'window-2'))?.editorMode).toBe('preview')
    expect((await service.load('profile-b', 'window-1'))?.editorMode).toBe('typora')

    await service.clear('profile-a', 'window-1')
    expect(table.has(layoutStateKey('profile-a', 'window-1'))).toBe(false)
    expect(await service.load('profile-a', 'window-1')).toBeNull()
  })

  it('persists IndexedDB session restore tab metadata with tags manager compatibility', async () => {
    stubLayoutStateTable()
    const service = new LayoutPersistenceService()

    await service.save({
      managerTab: 'tags',
      openTabs: [
        { id: 'article-a', articleId: 'article-a', title: 'Alpha', isPinned: false },
        { id: 'article-b', articleId: 'article-b', title: 'Beta', isPinned: true },
      ],
      tabOrder: ['article-a', 'article-b'],
      activeTabId: 'article-b',
      activeArticleId: 'article-b',
    }, 'profile-session', 'window-session')

    const record = await service.load('profile-session', 'window-session')

    expect(record?.managerTab).toBe('tags')
    expect(record?.openTabs).toEqual([
      { id: 'article-a', articleId: 'article-a', title: 'Alpha', isPinned: false },
      { id: 'article-b', articleId: 'article-b', title: 'Beta', isPinned: true },
    ])
    expect(record?.tabOrder).toEqual(['article-a', 'article-b'])
    expect(record?.activeTabId).toBe('article-b')
    expect(record?.activeArticleId).toBe('article-b')
  })

  it('round-trips the ai manager tab and self-corrects unknown tabs to files', async () => {
    stubLayoutStateTable()
    const service = new LayoutPersistenceService()

    await service.save({ managerTab: 'ai' }, 'profile-ai', 'window-ai')
    expect((await service.load('profile-ai', 'window-ai'))?.managerTab).toBe('ai')

    await service.save({ managerTab: 'bogus' as never }, 'profile-ai', 'window-unknown')
    expect((await service.load('profile-ai', 'window-unknown'))?.managerTab).toBe('files')
  })

  it('migrates raw legacy rows during initialize and persists the normalized record', async () => {
    const { table } = stubLayoutStateTable()
    const service = new LayoutPersistenceService()
    const key = layoutStateKey('profile-a', 'window-old')
    table.set(key, {
      id: key,
      profileId: 'profile-a',
      windowId: 'window-old',
      schemaVersion: 0,
      layoutVersion: 0,
      managerCollapsed: 'invalid',
      panelWidths: { manager: 900, stage: 120, inspector: 999 },
      managerTab: 'versions',
      savedAt: 1_700_000_000_000,
      createdAt: 1_700_000_000_000,
    })

    const result = await service.initialize('profile-a', 'window-old')

    expect(result.migrated).toBe(true)
    expect(result.record?.layoutVersion).toBe(1)
    expect(result.record?.managerCollapsed).toBe(false)
    expect(result.record?.managerTab).toBe('versions')
    expect(result.record?.panelWidths.manager).toBe(380)
    expect(result.record?.splitViewEnabled).toBe(false)
    expect(result.record?.splitViewRatio).toBe(0.5)
    expect(result.record?.splitViewSyncScroll).toBe(true)
    expect(result.record?.splitViewLeftFontScale).toBe(16)
    expect(result.record?.splitViewRightFontScale).toBe(16)
    expect((table.get(key) as LayoutStateRecord).layoutVersion).toBe(1)
  })

  it('debounces and merges scheduled saves before writing IndexedDB', async () => {
    vi.useFakeTimers()
    stubLayoutStateTable()
    const service = new LayoutPersistenceService()

    service.scheduleSave({ managerCollapsed: true }, 'profile-a', 'window-1', 25)
    service.scheduleSave({ stageCollapsed: true, editorWidth: 'wide' }, 'profile-a', 'window-1', 25)
    service.scheduleSave({ splitViewEnabled: true, splitViewRatio: 0.68, splitViewSyncScroll: false }, 'profile-a', 'window-1', 25)

    await vi.advanceTimersByTimeAsync(24)
    expect(await service.load('profile-a', 'window-1')).toBeNull()

    await vi.advanceTimersByTimeAsync(1)
    const record = await service.load('profile-a', 'window-1')
    expect(record?.managerCollapsed).toBe(true)
    expect(record?.stageCollapsed).toBe(true)
    expect(record?.editorWidth).toBe('wide')
    expect(record?.splitViewEnabled).toBe(true)
    expect(record?.splitViewRatio).toBe(0.68)
    expect(record?.splitViewSyncScroll).toBe(false)
  })

  it('cleans stale windows without deleting the current window state', async () => {
    const now = 1_800_000_000_000
    const stale = createDefaultLayoutState('profile-a', 'window-stale', now - 31 * 24 * 60 * 60 * 1000)
    const current = createDefaultLayoutState('profile-a', 'window-current', now - 31 * 24 * 60 * 60 * 1000)
    const fresh = createDefaultLayoutState('profile-a', 'window-fresh', now)
    const { table } = stubLayoutStateTable([stale, current, fresh])
    const service = new LayoutPersistenceService()

    const result = await service.cleanupStaleLayouts('profile-a', 'window-current', now)

    expect(result.deleted).toBe(1)
    expect(table.has(stale.id)).toBe(false)
    expect(table.has(current.id)).toBe(true)
    expect(table.has(fresh.id)).toBe(true)
  })

  it('validates serialized tabs against existing articles and repairs the active tab', () => {
    const service = new LayoutPersistenceService()

    const result = service.validateSerializedTabs([
      { id: 'tab-1', articleId: 'article-1', title: 'Kept', isPinned: false },
      { id: 'tab-2', articleId: 'missing-article', title: 'Removed', isPinned: true },
      { id: '', articleId: 'article-1', title: 'Invalid', isPinned: false },
    ], 'tab-2', ['article-1'])

    expect(result.openTabs).toHaveLength(1)
    expect(result.tabOrder).toEqual(['tab-1'])
    expect(result.activeTabId).toBe('tab-1')
    expect(result.removedTabIds).toEqual(['tab-2'])
  })

  it('preserves existing nullable fields and filters invalid tab payloads while normalizing a patch', () => {
    const base = createDefaultLayoutState('profile-a', 'window-1')
    const normalized = normalizeLayoutStatePatch({
      managerCollapsed: true,
      openTabs: [
        { id: 'tab-1', articleId: 'article-1', title: 'Valid', isPinned: false },
        { id: 'tab-bad', articleId: '', title: 'Invalid', isPinned: false },
      ],
      tabOrder: ['tab-bad', 'tab-1'],
      activeTabId: 'tab-bad',
      statusBarFieldVisibility: undefined,
      splitViewEnabled: true,
      splitViewRatio: 0.95,
      splitViewSyncScroll: false,
      splitViewLeftFontScale: 99,
      splitViewRightFontScale: 2,
    }, {
      ...base,
      activeArticleId: 'article-existing',
      statusBarFieldVisibility: { words: true },
    })

    expect(normalized.managerCollapsed).toBe(true)
    expect(normalized.openTabs).toEqual([{ id: 'tab-1', articleId: 'article-1', title: 'Valid', isPinned: false }])
    expect(normalized.tabOrder).toEqual(['tab-1'])
    expect(normalized.activeTabId).toBe('tab-1')
    expect(normalized.activeArticleId).toBe('article-existing')
    expect(normalized.statusBarFieldVisibility).toEqual({ words: true })
    expect(normalized.splitViewEnabled).toBe(true)
    expect(normalized.splitViewRatio).toBe(0.8)
    expect(normalized.splitViewSyncScroll).toBe(false)
    expect(normalized.splitViewLeftFontScale).toBe(24)
    expect(normalized.splitViewRightFontScale).toBe(12)
  })

  it('keeps layout states local-only and outside sync table lists', () => {
    expect(SYNC_EXCLUDED_LAYOUT_TABLES).toEqual(['layoutStates'])
  })
})

describe('useLayoutPersistenceStore', () => {
  it('surfaces loading, saving, and current record state around the real service contract', async () => {
    stubLayoutStateTable()
    const store = useLayoutPersistenceStore()

    const init = await store.initialize('profile-store', 'window-store')
    expect(init.record).toBeNull()
    expect(store.profileId).toBe('profile-store')
    expect(store.windowId).toBe('window-store')

    await store.save({ managerTab: 'outline', editorWidth: 'full', splitViewEnabled: true, splitViewRatio: 0.6 })

    expect(store.currentRecord?.managerTab).toBe('outline')
    expect(store.currentRecord?.editorWidth).toBe('full')
    expect(store.currentRecord?.splitViewEnabled).toBe(true)
    expect(store.currentRecord?.splitViewRatio).toBe(0.6)
    expect(store.isLoading).toBe(false)
    expect(store.isSaving).toBe(false)
    expect(store.error).toBeNull()
    expect(store.lastAction?.kind).toBe('save')
  })
})
