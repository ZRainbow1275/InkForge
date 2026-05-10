import { computed, markRaw, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  CommandContextTag,
  CommandGroup,
  type Command,
  type CommandContext,
  type CommandHistoryEntry,
  type GroupedResults,
  type OpenOptions,
  type QuickCommandSection,
  type SearchResult,
  type WorkstationCommandBridge,
} from '@/types/command-palette'
import { CommandExecutor } from '@/services/command/executor'
import { FuzzySearchEngine, toSearchResult } from '@/services/command/fuzzy-search'
import { CommandPalettePersistence } from '@/services/command/history'
import { CommandRegistry } from '@/services/command/registry'
import { logger } from '@/services/error'
import { auditLog as writeAuditLog } from '@/services/audit'
import { DEFAULT_ACCOUNT_ID, useAccountStore } from './account'

const GROUP_LABELS: Record<CommandGroup, string> = {
  [CommandGroup.Editor]: 'Editor',
  [CommandGroup.Document]: 'Document',
  [CommandGroup.Hub]: 'Hub',
  [CommandGroup.Export]: 'Export',
  [CommandGroup.Publish]: 'Publish',
  [CommandGroup.View]: 'View',
  [CommandGroup.Settings]: 'Settings',
  [CommandGroup.AI]: 'AI',
  [CommandGroup.Extension]: 'Extensions',
}

const GROUP_ORDER: CommandGroup[] = [
  CommandGroup.Document,
  CommandGroup.View,
  CommandGroup.Editor,
  CommandGroup.Hub,
  CommandGroup.Export,
  CommandGroup.Publish,
  CommandGroup.Settings,
  CommandGroup.AI,
  CommandGroup.Extension,
]

function uniqueCommandIds(entries: CommandHistoryEntry[]): string[] {
  return Array.from(new Set([...entries].reverse().map(entry => entry.commandId)))
}

function createPermissionSet(context: {
  activeDocumentId: string | null
  hasEditorBridge: boolean
  canExport: boolean
}): CommandContext['permissions'] {
  const permissions = new Set<CommandContext['permissions'][number]>([
    'document.read',
    'document.write',
    'settings.read',
  ])

  if (context.activeDocumentId && context.hasEditorBridge && context.canExport) {
    permissions.add('export.execute')
  }

  if (context.activeDocumentId) {
    permissions.add('publish.execute')
  }

  return [...permissions]
}

function resolveCommandAuditProfileId(): string {
  try {
    return useAccountStore().currentAccount?.id ?? DEFAULT_ACCOUNT_ID
  } catch {
    return DEFAULT_ACCOUNT_ID
  }
}

export const useCommandPaletteStore = defineStore('commandPalette', () => {
  const registry = markRaw(new CommandRegistry())
  const searchEngine = markRaw(new FuzzySearchEngine())
  const persistence = markRaw(new CommandPalettePersistence())
  const executor = markRaw(new CommandExecutor(registry, {
    auditLog: async event => {
      if (event.status === 'error') {
        logger.warn('[CommandPalette] command execution failed', { ...event })
      } else {
        logger.info('[CommandPalette] command executed', { ...event })
      }
      const profileId = resolveCommandAuditProfileId()
      await writeAuditLog(event.commandId.includes('batch') ? 'command.batch_execute' : 'command.execute', {
        actorId: profileId,
        profileId,
        severity: event.status === 'error' ? 'warning' : 'info',
        outcome: event.status === 'error' ? 'failure' : 'success',
        reason: event.errorMessage,
        payload: {
          commandId: event.commandId,
          status: event.status,
          executedAt: event.executedAt,
        },
        source: 'useCommandPaletteStore',
      })
    },
  }))

  const isOpen = ref(false)
  const query = ref('')
  const activeCommandId = ref<string | null>(null)
  const isLoading = ref(false)
  const history = ref<CommandHistoryEntry[]>([])
  const favorites = ref<string[]>([])
  const expandedSubcommandParent = ref<string | null>(null)
  const lastError = ref<string | null>(null)
  const currentRoute = ref('/')
  const currentRouteName = ref<string | null>(null)
  const activeDocumentId = ref<string | null>(null)
  const triggerSource = ref<CommandContext['triggerSource']>('keyboard')
  const contextFilter = ref<CommandContextTag[]>([])
  const returnFocusTarget = shallowRef<HTMLElement | null>(null)
  const workstationBridge = shallowRef<WorkstationCommandBridge | null>(null)
  let persistenceLoadVersion = 0

  const activeContexts = computed<CommandContextTag[]>(() => {
    const tags = new Set<CommandContextTag>([CommandContextTag.Global])

    if (currentRouteName.value === 'Hub' || currentRoute.value === '/') {
      tags.add(CommandContextTag.HubPage)
    }

    if (currentRouteName.value === 'Settings') {
      tags.add(CommandContextTag.SettingsPage)
    }

    if (activeDocumentId.value || workstationBridge.value?.activeDocumentId) {
      tags.add(CommandContextTag.Document)
    }

    if (workstationBridge.value) {
      tags.add(CommandContextTag.Editor)
    }

    return [...tags]
  })

  const commandContext = computed<CommandContext>(() => ({
    activeDocumentId: workstationBridge.value?.activeDocumentId ?? activeDocumentId.value,
    cursorContext: null,
    selection: null,
    editorMode: workstationBridge.value?.editorMode ?? null,
    currentRoute: currentRoute.value,
    triggerSource: triggerSource.value,
    activeContexts: activeContexts.value,
    permissions: createPermissionSet({
      activeDocumentId: workstationBridge.value?.activeDocumentId ?? activeDocumentId.value,
      hasEditorBridge: Boolean(workstationBridge.value),
      canExport: Boolean(workstationBridge.value?.canExport),
    }),
  }))

  const results = computed<SearchResult[]>(() => {
    if (!query.value.trim()) {
      return quickPanelResults.value
    }

    return searchEngine.search(query.value, commandContext.value, history.value, contextFilter.value)
  })

  const activeCommand = computed<Command | null>(() => {
    if (!activeCommandId.value) return null
    return registry.get(activeCommandId.value) ?? null
  })

  const groupedResults = computed<GroupedResults>(() => groupResults(results.value))

  const showQuickPanel = computed(() => !query.value.trim())

  const quickSections = computed<QuickCommandSection[]>(() => {
    const visibleCommands = searchEngine.filterByContext(commandContext.value, contextFilter.value)
    const commandById = new Map(visibleCommands.map(command => [command.id, command]))

    const recent = uniqueCommandIds(history.value)
      .map(commandId => commandById.get(commandId))
      .filter((command): command is Command => Boolean(command))
      .slice(0, 5)
      .map(command => toSearchResult(command, -0.3))

    const favoriteResults = favorites.value
      .map(commandId => commandById.get(commandId))
      .filter((command): command is Command => Boolean(command))
      .slice(0, 5)
      .map(command => toSearchResult(command, -0.2))

    const featured = visibleCommands
      .filter(command => command.featured)
      .filter(command => !recent.some(result => result.command.id === command.id))
      .slice(0, 5)
      .map(command => toSearchResult(command, -0.1))

    const sections: QuickCommandSection[] = [
      { id: 'recent', title: 'Recent', commands: recent },
      { id: 'featured', title: 'Featured', commands: featured },
      { id: 'favorites', title: 'Favorites', commands: favoriteResults },
    ]

    return sections.filter(section => section.commands.length > 0)
  })

  const quickPanelResults = computed<SearchResult[]>(() => {
    const flattened = quickSections.value.flatMap(section => section.commands)
    const seen = new Set<string>()
    return flattened.filter(result => {
      if (seen.has(result.command.id)) return false
      seen.add(result.command.id)
      return true
    }).slice(0, 12)
  })

  function groupResults(source: SearchResult[]): GroupedResults {
    return GROUP_ORDER
      .map(group => ({
        group,
        label: GROUP_LABELS[group],
        commands: source.filter(result => result.command.group === group),
      }))
      .filter(group => group.commands.length > 0)
  }

  function rebuildSearchIndex(): void {
    searchEngine.rebuildIndex(registry.getAll())
    if (!activeCommandId.value || !results.value.some(result => result.command.id === activeCommandId.value)) {
      activeCommandId.value = results.value[0]?.command.id ?? null
    }
  }

  function registerCommands(commands: Command[]): void {
    registry.registerBatch(commands, { overwrite: true, source: 'builtin' })
    rebuildSearchIndex()
  }

  function setAppContext(payload: { routePath: string; routeName: string | null; activeDocumentId: string | null }): void {
    currentRoute.value = payload.routePath
    currentRouteName.value = payload.routeName
    activeDocumentId.value = payload.activeDocumentId
  }

  function registerWorkstationBridge(bridge: WorkstationCommandBridge): void {
    workstationBridge.value = bridge
  }

  function clearWorkstationBridge(): void {
    workstationBridge.value = null
  }

  async function loadHistory(): Promise<void> {
    const loadVersion = ++persistenceLoadVersion
    const [nextHistory, nextFavorites] = await Promise.all([
      persistence.loadHistory(),
      persistence.loadFavorites(),
    ])

    if (loadVersion !== persistenceLoadVersion) {
      return
    }

    history.value = nextHistory
    favorites.value = nextFavorites
    rebuildSearchIndex()
  }

  function open(options: OpenOptions = {}): void {
    returnFocusTarget.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
    triggerSource.value = options.triggerSource ?? 'keyboard'
    contextFilter.value = options.contextFilter ?? []
    query.value = options.initialQuery ?? ''
    lastError.value = null
    isOpen.value = true
    void loadHistory()
    rebuildSearchIndex()
  }

  function close(): void {
    isOpen.value = false
    query.value = ''
    activeCommandId.value = null
    expandedSubcommandParent.value = null
    contextFilter.value = []

    window.setTimeout(() => {
      returnFocusTarget.value?.focus()
      returnFocusTarget.value = null
    }, 0)
  }

  function setQuery(nextQuery: string): void {
    query.value = nextQuery
    activeCommandId.value = results.value[0]?.command.id ?? null
  }

  function moveFocus(direction: 'up' | 'down' | 'first' | 'last'): void {
    const commandIds = results.value.map(result => result.command.id)
    if (!commandIds.length) {
      activeCommandId.value = null
      return
    }

    if (direction === 'first') {
      activeCommandId.value = commandIds[0]
      return
    }

    if (direction === 'last') {
      activeCommandId.value = commandIds[commandIds.length - 1]
      return
    }

    const currentIndex = Math.max(0, commandIds.indexOf(activeCommandId.value ?? commandIds[0]))
    const offset = direction === 'down' ? 1 : -1
    const nextIndex = (currentIndex + offset + commandIds.length) % commandIds.length
    activeCommandId.value = commandIds[nextIndex]
  }

  async function persistSuccessfulCommand(commandId: string): Promise<void> {
    persistenceLoadVersion += 1
    const persistedHistory = await persistence.loadHistory()
    const nextHistory = [
      ...persistedHistory,
      { commandId, executedAt: Date.now(), query: query.value.trim() },
    ].slice(-20)

    history.value = nextHistory
    await persistence.saveHistory(nextHistory)
  }

  async function executeCommand(commandId: string): Promise<void> {
    isLoading.value = true
    lastError.value = null

    try {
      const result = await executor.execute(commandId, commandContext.value)
      if (result.success) {
        await persistSuccessfulCommand(commandId)
        close()
        return
      }

      if (result.error) {
        lastError.value = result.error.message
      }
    } finally {
      isLoading.value = false
    }
  }

  async function executeActive(): Promise<void> {
    if (!activeCommandId.value) return
    await executeCommand(activeCommandId.value)
  }

  async function toggleFavorite(commandId: string): Promise<void> {
    favorites.value = favorites.value.includes(commandId)
      ? favorites.value.filter(id => id !== commandId)
      : [...favorites.value, commandId]
    await persistence.saveFavorites(favorites.value)
  }

  async function clearHistory(): Promise<void> {
    history.value = []
    await persistence.clearHistory()
    rebuildSearchIndex()
  }

  return {
    isOpen,
    query,
    activeCommandId,
    activeCommand,
    results,
    groupedResults,
    quickSections,
    showQuickPanel,
    isLoading,
    history,
    favorites,
    expandedSubcommandParent,
    lastError,
    activeContexts,
    workstationBridge,
    registerCommands,
    setAppContext,
    registerWorkstationBridge,
    clearWorkstationBridge,
    open,
    close,
    setQuery,
    moveFocus,
    executeActive,
    executeCommand,
    loadHistory,
    toggleFavorite,
    clearHistory,
  }
})
