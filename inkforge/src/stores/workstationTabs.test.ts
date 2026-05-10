import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkstationTabsStore, WORKSTATION_TABS_STORAGE_KEY } from './workstationTabs'

class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>()

  get length(): number {
    return this.entries.size
  }

  clear(): void {
    this.entries.clear()
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.entries.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.entries.delete(key)
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value)
  }
}

function createStorage(): MemoryStorage {
  return new MemoryStorage()
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useWorkstationTabsStore', () => {
  it('opens real article tabs, refreshes titles, and persists session order', () => {
    const storage = createStorage()
    const store = useWorkstationTabsStore()
    store.initialize(storage)

    store.openOrRefreshTab({ articleId: 'article-a', title: 'Alpha' }, { now: 100 })
    store.openOrRefreshTab({ articleId: 'article-b', title: 'Beta' }, { now: 200 })
    store.openOrRefreshTab({ articleId: 'article-a', title: 'Alpha revised' }, { now: 300 })

    expect(store.orderedTabs.map(tab => tab.id)).toEqual(['article-a', 'article-b'])
    expect(store.activeTabId).toBe('article-a')
    expect(store.orderedTabs[0].title).toBe('Alpha revised')

    setActivePinia(createPinia())
    const nextStore = useWorkstationTabsStore()
    nextStore.initialize(storage)

    expect(nextStore.orderedTabs.map(tab => tab.title)).toEqual(['Alpha revised', 'Beta'])
    expect(storage.getItem(WORKSTATION_TABS_STORAGE_KEY)).toContain('Alpha revised')
  })

  it('keeps pinned tabs before regular tabs and protects pinned grouping during reorder', () => {
    const store = useWorkstationTabsStore()
    store.initialize(createStorage())

    store.openOrRefreshTab({ articleId: 'a', title: 'A' }, { now: 100 })
    store.openOrRefreshTab({ articleId: 'b', title: 'B' }, { now: 200 })
    store.openOrRefreshTab({ articleId: 'c', title: 'C' }, { now: 300 })
    store.togglePinnedTab('b')

    expect(store.orderedTabs.map(tab => tab.id)).toEqual(['b', 'a', 'c'])

    store.reorderTab('c', 'b', 'before')
    expect(store.orderedTabs.map(tab => tab.id)).toEqual(['b', 'c', 'a'])

    store.reorderTab('b', 'a', 'after')
    expect(store.orderedTabs.map(tab => tab.id)).toEqual(['b', 'c', 'a'])
  })

  it('closes the active tab, falls back to a remaining real tab, and restores recently closed tabs', () => {
    const store = useWorkstationTabsStore()
    store.initialize(createStorage())

    store.openOrRefreshTab({ articleId: 'a', title: 'A' }, { now: 100 })
    store.openOrRefreshTab({ articleId: 'b', title: 'B' }, { now: 200 })
    store.openOrRefreshTab({ articleId: 'c', title: 'C' }, { now: 300 })

    const result = store.closeTab('c', { now: 400 })

    expect(result?.nextActiveTabId).toBe('b')
    expect(store.orderedTabs.map(tab => tab.id)).toEqual(['a', 'b'])
    expect(store.recentlyClosed[0].id).toBe('c')

    const restored = store.restoreRecentlyClosed(500)

    expect(restored?.id).toBe('c')
    expect(store.activeTabId).toBe('c')
    expect(store.orderedTabs.map(tab => tab.id)).toEqual(['a', 'b', 'c'])
  })

  it('cycles tabs and maps Ctrl+9 behavior to the last available tab', () => {
    const store = useWorkstationTabsStore()
    store.initialize(createStorage())

    store.openOrRefreshTab({ articleId: 'a', title: 'A' }, { now: 100 })
    store.openOrRefreshTab({ articleId: 'b', title: 'B' }, { now: 200 })
    store.openOrRefreshTab({ articleId: 'c', title: 'C' }, { now: 300 })

    expect(store.cycleActiveTab(1, 400)?.id).toBe('a')
    expect(store.cycleActiveTab(-1, 500)?.id).toBe('c')
    expect(store.activateTabAtShortcutIndex(1, 600)?.id).toBe('a')
    expect(store.activateTabAtShortcutIndex(9, 700)?.id).toBe('c')
  })

  it('enforces the LRU limit without closing pinned or active tabs', () => {
    const store = useWorkstationTabsStore()
    store.initialize(createStorage())
    store.setMaxTabs(3)

    store.openOrRefreshTab({ articleId: 'pinned', title: 'Pinned' }, { now: 100 })
    store.togglePinnedTab('pinned')
    store.openOrRefreshTab({ articleId: 'old', title: 'Old' }, { now: 200 })
    store.openOrRefreshTab({ articleId: 'middle', title: 'Middle' }, { now: 300 })
    const result = store.openOrRefreshTab({ articleId: 'active', title: 'Active' }, { now: 400 })

    expect(result.closedByLimit.map(tab => tab.id)).toEqual(['old'])
    expect(store.orderedTabs.map(tab => tab.id)).toEqual(['pinned', 'middle', 'active'])
    expect(store.activeTabId).toBe('active')
  })

  it('serializes durable layout tabs for IndexedDB-backed session restore', () => {
    const store = useWorkstationTabsStore()
    store.initialize(createStorage())

    store.openOrRefreshTab({ articleId: 'article-a', title: 'Alpha' }, { now: 100 })
    store.openOrRefreshTab({ articleId: 'article-b', title: 'Beta' }, { now: 200 })
    store.togglePinnedTab('article-b')

    expect(store.serializeForLayout()).toEqual([
      { id: 'article-b', articleId: 'article-b', title: 'Beta', isPinned: true },
      { id: 'article-a', articleId: 'article-a', title: 'Alpha', isPinned: false },
    ])
  })

  it('restores IndexedDB layout tabs, repairs missing active tabs, and keeps sessionStorage fallback current', () => {
    const storage = createStorage()
    const store = useWorkstationTabsStore()
    store.initialize(storage)

    store.restoreFromLayout([
      { id: 'article-b', articleId: 'article-b', title: 'Beta', isPinned: true },
      { id: 'article-a', articleId: 'article-a', title: 'Alpha', isPinned: false },
    ], 'missing-active-tab', { now: 1_000 })

    expect(store.orderedTabs.map(tab => tab.id)).toEqual(['article-b', 'article-a'])
    expect(store.activeTabId).toBe('article-b')
    expect(store.orderedTabs[0]).toMatchObject({
      articleId: 'article-b',
      title: 'Beta',
      docType: 'article',
      isPinned: true,
      openedAt: 1_000,
      lastAccessedAt: 1_000,
      scrollPosition: 0,
    })
    expect(storage.getItem(WORKSTATION_TABS_STORAGE_KEY)).toContain('article-b')
  })

  it('ignores corrupt persisted payloads instead of booting fake tabs', () => {
    const storage = createStorage()
    storage.setItem(WORKSTATION_TABS_STORAGE_KEY, '{bad json')

    const store = useWorkstationTabsStore()
    store.initialize(storage)

    expect(store.orderedTabs).toEqual([])
    expect(storage.getItem(WORKSTATION_TABS_STORAGE_KEY)).toContain('"tabs":[]')
  })
})