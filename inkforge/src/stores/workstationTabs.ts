import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { z } from 'zod'
import type { SerializedTab } from '@/services/layout-persistence'

const TAB_SESSION_SCHEMA_VERSION = 1
const DEFAULT_MAX_TABS = 20
const MAX_RECENTLY_CLOSED_TABS = 12
const WORKSTATION_TABS_STORAGE_KEY = 'inkforge.workstation.tabs.v1'

export type WorkstationTabDocType = 'article' | 'draft'
export type WorkstationTabSaveState = 'clean' | 'saving' | 'error'

export interface WorkstationTab {
  id: string
  articleId: string
  title: string
  docType: WorkstationTabDocType
  isPinned: boolean
  openedAt: number
  lastAccessedAt: number
  scrollPosition: number
}

export interface WorkstationClosedTab extends WorkstationTab {
  closedAt: number
}

export interface WorkstationTabInput {
  articleId: string
  title: string
  docType?: WorkstationTabDocType
}

export interface OpenWorkstationTabResult {
  tab: WorkstationTab
  closedByLimit: WorkstationClosedTab[]
}

export interface CloseWorkstationTabResult {
  closedTab: WorkstationClosedTab
  nextActiveTabId: string | null
}

const WorkstationTabSchema = z.object({
  id: z.string().min(1),
  articleId: z.string().min(1),
  title: z.string().min(1),
  docType: z.enum(['article', 'draft']).default('article'),
  isPinned: z.boolean().default(false),
  openedAt: z.number().finite().nonnegative(),
  lastAccessedAt: z.number().finite().nonnegative(),
  scrollPosition: z.number().finite().nonnegative().default(0),
})

const WorkstationClosedTabSchema = WorkstationTabSchema.extend({
  closedAt: z.number().finite().nonnegative(),
})

const PersistedWorkstationTabsSchema = z.object({
  schemaVersion: z.literal(TAB_SESSION_SCHEMA_VERSION),
  tabs: z.array(WorkstationTabSchema),
  activeTabId: z.string().nullable(),
  recentlyClosed: z.array(WorkstationClosedTabSchema),
})

type PersistedWorkstationTabs = z.infer<typeof PersistedWorkstationTabsSchema>

type ReorderPosition = 'before' | 'after'

export interface RestoreWorkstationTabsOptions {
  now?: number
}

function resolveSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage ?? null
}

function normalizeTitle(title: string): string {
  const normalized = title.trim()
  return normalized.length > 0 ? normalized : 'Untitled document'
}

function normalizeTabOrder(items: WorkstationTab[]): WorkstationTab[] {
  const pinned = items.filter(tab => tab.isPinned)
  const regular = items.filter(tab => !tab.isPinned)
  return [...pinned, ...regular]
}

function cloneClosedTab(tab: WorkstationTab, closedAt: number): WorkstationClosedTab {
  return {
    ...tab,
    closedAt,
  }
}

function readPersistedTabs(storage: Storage | null): PersistedWorkstationTabs | null {
  if (!storage) {
    return null
  }

  const raw = storage.getItem(WORKSTATION_TABS_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return PersistedWorkstationTabsSchema.parse(JSON.parse(raw))
  } catch {
    storage.removeItem(WORKSTATION_TABS_STORAGE_KEY)
    return null
  }
}

export const useWorkstationTabsStore = defineStore('workstationTabs', () => {
  const tabs = ref<WorkstationTab[]>([])
  const activeTabId = ref<string | null>(null)
  const recentlyClosed = ref<WorkstationClosedTab[]>([])
  const maxTabs = ref(DEFAULT_MAX_TABS)
  const initialized = ref(false)
  const storageRef = ref<Storage | null>(null)

  const orderedTabs = computed(() => normalizeTabOrder(tabs.value))
  const activeTab = computed(() => orderedTabs.value.find(tab => tab.id === activeTabId.value) ?? null)
  const canRestoreRecentlyClosed = computed(() => recentlyClosed.value.length > 0)

  function persist(): void {
    if (!storageRef.value) {
      return
    }

    const payload: PersistedWorkstationTabs = {
      schemaVersion: TAB_SESSION_SCHEMA_VERSION,
      tabs: normalizeTabOrder(tabs.value),
      activeTabId: activeTabId.value,
      recentlyClosed: recentlyClosed.value.slice(0, MAX_RECENTLY_CLOSED_TABS),
    }

    storageRef.value.setItem(WORKSTATION_TABS_STORAGE_KEY, JSON.stringify(payload))
  }

  function initialize(storage: Storage | null = resolveSessionStorage()): void {
    storageRef.value = storage
    const persisted = readPersistedTabs(storage)

    if (persisted) {
      tabs.value = normalizeTabOrder(persisted.tabs)
      const persistedActiveExists = persisted.activeTabId
        ? tabs.value.some(tab => tab.id === persisted.activeTabId)
        : false
      activeTabId.value = persistedActiveExists ? persisted.activeTabId : (tabs.value[0]?.id ?? null)
      recentlyClosed.value = persisted.recentlyClosed.slice(0, MAX_RECENTLY_CLOSED_TABS)
    }

    initialized.value = true
    persist()
  }

  function serializeForLayout(): SerializedTab[] {
    ensureInitialized()
    return normalizeTabOrder(tabs.value).map(tab => ({
      id: tab.id,
      articleId: tab.articleId,
      title: tab.title,
      isPinned: tab.isPinned,
    }))
  }

  function restoreFromLayout(openTabs: readonly SerializedTab[], nextActiveTabId: string | null, options: RestoreWorkstationTabsOptions = {}): void {
    ensureInitialized()
    const now = options.now ?? Date.now()
    const existingById = new Map(tabs.value.map(tab => [tab.id, tab]))
    const seenTabIds = new Set<string>()
    const restoredTabs = openTabs.reduce<WorkstationTab[]>((accepted, serializedTab) => {
      if (seenTabIds.has(serializedTab.id)) {
        return accepted
      }
      seenTabIds.add(serializedTab.id)
      const existing = existingById.get(serializedTab.id)
      accepted.push({
        id: serializedTab.id,
        articleId: serializedTab.articleId,
        title: normalizeTitle(serializedTab.title),
        docType: existing?.docType ?? 'article',
        isPinned: serializedTab.isPinned,
        openedAt: existing?.openedAt ?? now,
        lastAccessedAt: serializedTab.id === nextActiveTabId ? now : existing?.lastAccessedAt ?? now,
        scrollPosition: existing?.scrollPosition ?? 0,
      })
      return accepted
    }, [])

    tabs.value = normalizeTabOrder(restoredTabs)
    activeTabId.value = nextActiveTabId && tabs.value.some(tab => tab.id === nextActiveTabId)
      ? nextActiveTabId
      : tabs.value[0]?.id ?? null
    enforceMaxTabs(now)
    persist()
  }

  function ensureInitialized(): void {
    if (!initialized.value) {
      initialize()
    }
  }

  function setMaxTabs(nextMaxTabs: number): void {
    maxTabs.value = Math.max(1, Math.floor(nextMaxTabs))
    enforceMaxTabs(Date.now())
    persist()
  }

  function rememberClosedTab(tab: WorkstationTab, closedAt: number): WorkstationClosedTab {
    const closed = cloneClosedTab(tab, closedAt)
    recentlyClosed.value = [
      closed,
      ...recentlyClosed.value.filter(entry => entry.id !== tab.id),
    ].slice(0, MAX_RECENTLY_CLOSED_TABS)
    return closed
  }

  function enforceMaxTabs(now: number): WorkstationClosedTab[] {
    const closedByLimit: WorkstationClosedTab[] = []

    while (tabs.value.length > maxTabs.value) {
      const candidates = tabs.value
        .filter(tab => !tab.isPinned && tab.id !== activeTabId.value)
        .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)

      const victim = candidates[0]
      if (!victim) {
        break
      }

      tabs.value = tabs.value.filter(tab => tab.id !== victim.id)
      closedByLimit.push(rememberClosedTab(victim, now))
    }

    return closedByLimit
  }

  function openOrRefreshTab(input: WorkstationTabInput, options: { activate?: boolean; now?: number } = {}): OpenWorkstationTabResult {
    ensureInitialized()
    const now = options.now ?? Date.now()
    const shouldActivate = options.activate ?? true
    const id = input.articleId
    const title = normalizeTitle(input.title)
    const docType = input.docType ?? 'article'
    const existingIndex = tabs.value.findIndex(tab => tab.id === id)
    let tab: WorkstationTab

    if (existingIndex === -1) {
      tab = {
        id,
        articleId: input.articleId,
        title,
        docType,
        isPinned: false,
        openedAt: now,
        lastAccessedAt: now,
        scrollPosition: 0,
      }
      tabs.value = normalizeTabOrder([...tabs.value, tab])
    } else {
      const existing = tabs.value[existingIndex]
      tab = {
        ...existing,
        title,
        docType,
        lastAccessedAt: shouldActivate ? now : existing.lastAccessedAt,
      }
      tabs.value = normalizeTabOrder([
        ...tabs.value.slice(0, existingIndex),
        tab,
        ...tabs.value.slice(existingIndex + 1),
      ])
    }

    if (shouldActivate) {
      activeTabId.value = id
      recentlyClosed.value = recentlyClosed.value.filter(entry => entry.id !== id)
    }

    const closedByLimit = enforceMaxTabs(now)
    persist()

    return { tab, closedByLimit }
  }

  function activateTab(id: string, now = Date.now()): WorkstationTab | null {
    ensureInitialized()
    const index = tabs.value.findIndex(tab => tab.id === id)
    if (index === -1) {
      return null
    }

    const tab = {
      ...tabs.value[index],
      lastAccessedAt: now,
    }
    tabs.value = normalizeTabOrder([
      ...tabs.value.slice(0, index),
      tab,
      ...tabs.value.slice(index + 1),
    ])
    activeTabId.value = tab.id
    persist()

    return tab
  }

  function activateTabAtShortcutIndex(shortcutIndex: number, now = Date.now()): WorkstationTab | null {
    ensureInitialized()
    if (orderedTabs.value.length === 0) {
      return null
    }

    const targetIndex = shortcutIndex === 9
      ? orderedTabs.value.length - 1
      : Math.min(Math.max(shortcutIndex - 1, 0), orderedTabs.value.length - 1)
    return activateTab(orderedTabs.value[targetIndex].id, now)
  }

  function cycleActiveTab(direction: 1 | -1, now = Date.now()): WorkstationTab | null {
    ensureInitialized()
    const currentTabs = orderedTabs.value
    if (currentTabs.length === 0) {
      activeTabId.value = null
      persist()
      return null
    }

    const currentIndex = currentTabs.findIndex(tab => tab.id === activeTabId.value)
    const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex
    const nextIndex = (safeCurrentIndex + direction + currentTabs.length) % currentTabs.length
    return activateTab(currentTabs[nextIndex].id, now)
  }

  function closeTab(id: string, options: { now?: number; remember?: boolean } = {}): CloseWorkstationTabResult | null {
    ensureInitialized()
    const index = tabs.value.findIndex(tab => tab.id === id)
    if (index === -1) {
      return null
    }

    const now = options.now ?? Date.now()
    const [target] = tabs.value.slice(index, index + 1)
    const nextTabs = tabs.value.filter(tab => tab.id !== id)
    tabs.value = normalizeTabOrder(nextTabs)
    const closedTab = options.remember === false
      ? cloneClosedTab(target, now)
      : rememberClosedTab(target, now)

    if (activeTabId.value === id) {
      const fallbackTab = tabs.value[index] ?? tabs.value[index - 1] ?? tabs.value[tabs.value.length - 1] ?? null
      activeTabId.value = fallbackTab?.id ?? null
      if (fallbackTab) {
        void activateTab(fallbackTab.id, now)
      }
    } else if (activeTabId.value && !tabs.value.some(tab => tab.id === activeTabId.value)) {
      activeTabId.value = tabs.value[0]?.id ?? null
    }

    persist()
    return { closedTab, nextActiveTabId: activeTabId.value }
  }

  function closeActiveTab(now = Date.now()): CloseWorkstationTabResult | null {
    if (!activeTabId.value) {
      return null
    }

    return closeTab(activeTabId.value, { now })
  }

  function restoreRecentlyClosed(now = Date.now()): WorkstationTab | null {
    ensureInitialized()
    const [entry, ...remaining] = recentlyClosed.value
    if (!entry) {
      return null
    }

    recentlyClosed.value = remaining
    const restored: WorkstationTab = {
      id: entry.id,
      articleId: entry.articleId,
      title: entry.title,
      docType: entry.docType,
      isPinned: entry.isPinned,
      openedAt: entry.openedAt,
      lastAccessedAt: now,
      scrollPosition: entry.scrollPosition,
    }

    tabs.value = normalizeTabOrder([
      ...tabs.value.filter(tab => tab.id !== restored.id),
      restored,
    ])
    activeTabId.value = restored.id
    enforceMaxTabs(now)
    persist()

    return restored
  }

  function togglePinnedTab(id: string): WorkstationTab | null {
    ensureInitialized()
    const index = tabs.value.findIndex(tab => tab.id === id)
    if (index === -1) {
      return null
    }

    const updated = {
      ...tabs.value[index],
      isPinned: !tabs.value[index].isPinned,
    }
    tabs.value = normalizeTabOrder([
      ...tabs.value.slice(0, index),
      updated,
      ...tabs.value.slice(index + 1),
    ])
    persist()

    return updated
  }

  function reorderTab(draggedTabId: string, targetTabId: string, position: ReorderPosition): void {
    ensureInitialized()
    if (draggedTabId === targetTabId) {
      return
    }

    const dragged = tabs.value.find(tab => tab.id === draggedTabId)
    const target = tabs.value.find(tab => tab.id === targetTabId)
    if (!dragged || !target) {
      return
    }

    const remainingTabs = tabs.value.filter(tab => tab.id !== draggedTabId)
    const nextPinned = remainingTabs.filter(tab => tab.isPinned)
    const nextRegular = remainingTabs.filter(tab => !tab.isPinned)
    const targetGroup = dragged.isPinned ? nextPinned : nextRegular

    if (target.isPinned === dragged.isPinned) {
      const targetIndex = targetGroup.findIndex(tab => tab.id === targetTabId)
      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
      targetGroup.splice(Math.max(0, insertIndex), 0, dragged)
    } else if (dragged.isPinned) {
      targetGroup.push(dragged)
    } else {
      targetGroup.unshift(dragged)
    }

    tabs.value = [...nextPinned, ...nextRegular]
    persist()
  }

  function clearSession(): void {
    tabs.value = []
    activeTabId.value = null
    recentlyClosed.value = []
    storageRef.value?.removeItem(WORKSTATION_TABS_STORAGE_KEY)
  }

  return {
    tabs,
    orderedTabs,
    activeTabId,
    activeTab,
    recentlyClosed,
    maxTabs,
    initialized,
    canRestoreRecentlyClosed,
    initialize,
    serializeForLayout,
    restoreFromLayout,
    setMaxTabs,
    openOrRefreshTab,
    activateTab,
    activateTabAtShortcutIndex,
    cycleActiveTab,
    closeTab,
    closeActiveTab,
    restoreRecentlyClosed,
    togglePinnedTab,
    reorderTab,
    clearSession,
  }
})

export { WORKSTATION_TABS_STORAGE_KEY }