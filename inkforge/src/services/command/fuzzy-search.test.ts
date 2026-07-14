import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  CommandContextTag,
  CommandGroup,
  CommandScope,
  type Command,
  type CommandContext,
  type CommandHistoryEntry,
} from '@/types/command-palette'
import { CommandExecutor } from './executor'
import { FuzzySearchEngine, calculateHistoryBonus } from './fuzzy-search'
import { CommandRegistry, isCommandVisible } from './registry'
import { useCommandPaletteStore } from '@/stores/command-palette'

function createCommand(overrides: Partial<Command>): Command {
  return {
    id: 'editor.toggleBold',
    title: 'Toggle Bold',
    subtitle: 'Apply bold formatting',
    keywords: ['bold', 'strong', '加粗'],
    icon: 'Bold',
    scope: CommandScope.Editor,
    group: CommandGroup.Editor,
    contexts: [CommandContextTag.Editor],
    handler: () => undefined,
    ...overrides,
  }
}

function createContext(tags: CommandContextTag[]): CommandContext {
  return {
    activeDocumentId: 'article-1',
    cursorContext: null,
    selection: null,
    editorMode: 'typora',
    currentRoute: '/workstation',
    triggerSource: 'keyboard',
    activeContexts: tags,
    permissions: ['document.read', 'document.write'],
  }
}

describe('CommandRegistry', () => {
  it('registers commands by id, group, and context', () => {
    const registry = new CommandRegistry()
    const command = createCommand({ id: 'editor.toggleBold' })

    registry.register(command)

    expect(registry.get('editor.toggleBold')).toBe(command)
    expect(registry.getByGroup(CommandGroup.Editor)).toEqual([command])
    expect(registry.filterByContext([CommandContextTag.Editor])).toContain(command)
  })

  it('rejects duplicate command ids unless overwrite is explicit', () => {
    const registry = new CommandRegistry()
    registry.register(createCommand({ id: 'document.create' }))

    expect(() => registry.register(createCommand({ id: 'document.create' }))).toThrow(/already registered/u)

    registry.register(createCommand({ id: 'document.create', title: 'Create Document' }), { overwrite: true })
    expect(registry.get('document.create')?.title).toBe('Create Document')
  })

  it('filters global commands and context-specific commands predictably', () => {
    const globalCommand = createCommand({
      id: 'settings.open',
      scope: CommandScope.Global,
      group: CommandGroup.Settings,
      contexts: [CommandContextTag.Global],
    })
    const editorCommand = createCommand({ id: 'editor.toggleBold' })

    expect(isCommandVisible(globalCommand, [CommandContextTag.HubPage])).toBe(true)
    expect(isCommandVisible(editorCommand, [CommandContextTag.HubPage])).toBe(false)
    expect(isCommandVisible(editorCommand, [CommandContextTag.Editor])).toBe(true)
  })
})

describe('CommandExecutor', () => {
  it('requires every declared permission before executing a handler', async () => {
    const registry = new CommandRegistry()
    const handler = vi.fn()
    const command = createCommand({
      requiredPermissions: ['document.write', 'settings.write'],
      handler,
    })
    const context = createContext([CommandContextTag.Global, CommandContextTag.Editor])
    registry.register(command)
    const auditLog = vi.fn()
    const executor = new CommandExecutor(registry, { auditLog })

    const denied = await executor.execute(command.id, context)

    expect(denied.success).toBe(false)
    expect(denied.error?.message).toBe('permission_denied')
    expect(denied.auditLogged).toBe(false)
    expect(handler).not.toHaveBeenCalled()
    expect(auditLog).not.toHaveBeenCalled()

    const allowed = await executor.execute(command.id, {
      ...context,
      permissions: [...context.permissions, 'settings.write'],
    })

    expect(allowed.success).toBe(true)
    expect(allowed.auditLogged).toBe(true)
    expect(handler).toHaveBeenCalledOnce()
    expect(auditLog).toHaveBeenCalledOnce()
    expect(auditLog).toHaveBeenCalledWith({
      commandId: command.id,
      status: 'success',
      executedAt: expect.any(Number),
    })
  })
})

describe('Command Palette quick sections', () => {
  it('keeps every visible quick-section command in the keyboard navigation results', () => {
    setActivePinia(createPinia())
    const store = useCommandPaletteStore()
    const commands = Array.from({ length: 15 }, (_, index) => createCommand({
      id: `global.command-${index}`,
      title: `Global command ${index}`,
      scope: CommandScope.Global,
      group: CommandGroup.Hub,
      contexts: [CommandContextTag.Global],
      featured: index >= 5 && index < 10,
    }))
    store.registerCommands(commands)
    store.history = commands.slice(0, 5).map((command, index) => ({
      commandId: command.id,
      executedAt: index,
      query: '',
    }))
    store.favorites = commands.slice(10).map(command => command.id)

    const visibleQuickCommandIds = store.quickSections
      .flatMap(section => section.commands)
      .map(result => result.command.id)

    expect(visibleQuickCommandIds).toHaveLength(15)
    expect(new Set(visibleQuickCommandIds).size).toBe(15)
    expect(store.results.map(result => result.command.id)).toEqual(visibleQuickCommandIds)
  })

  it('keeps every favorite visible when more than five overlap recent and featured commands', () => {
    setActivePinia(createPinia())
    const store = useCommandPaletteStore()
    const commands = Array.from({ length: 7 }, (_, index) => createCommand({
      id: `global.favorite-${index}`,
      title: `Favorite command ${index}`,
      scope: CommandScope.Global,
      group: CommandGroup.Hub,
      contexts: [CommandContextTag.Global],
      featured: true,
    }))
    store.registerCommands(commands)
    store.history = commands.map((command, index) => ({
      commandId: command.id,
      executedAt: index,
      query: '',
    }))
    store.favorites = commands.map(command => command.id)

    const favoriteIds = store.quickSections
      .find(section => section.id === 'favorites')
      ?.commands.map(result => result.command.id)

    expect(favoriteIds).toEqual(commands.map(command => command.id))
    expect(store.results.map(result => result.command.id)).toEqual(favoriteIds)
  })

  it('navigates searched commands in their visually grouped order', () => {
    setActivePinia(createPinia())
    const store = useCommandPaletteStore()
    store.registerCommands([
      createCommand({
        id: 'hub.open-exact',
        title: 'Open',
        scope: CommandScope.Global,
        group: CommandGroup.Hub,
        contexts: [CommandContextTag.Global],
      }),
      createCommand({
        id: 'document.open-archive',
        title: 'Open document archive',
        scope: CommandScope.Global,
        group: CommandGroup.Document,
        contexts: [CommandContextTag.Global],
      }),
    ])

    store.lastError = 'permission_denied'
    store.setQuery('Open')
    const relevanceOrder = store.results.map(result => result.command.id)
    const visualOrder = store.groupedResults.flatMap(group => group.commands.map(result => result.command.id))

    expect(store.lastError).toBeNull()
    expect(relevanceOrder).toEqual(['hub.open-exact', 'document.open-archive'])
    expect(visualOrder).toEqual(['document.open-archive', 'hub.open-exact'])
    expect(store.activeCommandId).toBe(visualOrder[0])
    store.moveFocus('last')
    expect(store.activeCommandId).toBe(visualOrder[visualOrder.length - 1])
  })
})

describe('FuzzySearchEngine', () => {
  it('returns exact and keyword matches ahead of weaker matches', () => {
    const commands = [
      createCommand({ id: 'settings.open', title: 'Open Settings', keywords: ['preferences'] }),
      createCommand({ id: 'editor.toggleBold', title: 'Toggle Bold', keywords: ['bold', 'strong'] }),
    ]
    const engine = new FuzzySearchEngine()
    engine.rebuildIndex(commands)

    const results = engine.search('bold', createContext([CommandContextTag.Global, CommandContextTag.Editor]), [])

    expect(results[0]?.command.id).toBe('editor.toggleBold')
  })

  it('supports abbreviated subsequence search', () => {
    const command = createCommand({ id: 'editor.toggleBold', title: 'Toggle Bold', keywords: ['bold'] })
    const engine = new FuzzySearchEngine()
    engine.rebuildIndex([command])

    const results = engine.search('bld', createContext([CommandContextTag.Global, CommandContextTag.Editor]), [])

    expect(results[0]?.command.id).toBe('editor.toggleBold')
  })

  it('applies recent history bonus', () => {
    const history: CommandHistoryEntry[] = Array.from({ length: 6 }, (_, index) => ({
      commandId: index === 5 ? 'settings.open' : `command.${index}`,
      executedAt: Date.now() + index,
      query: '',
    }))

    expect(calculateHistoryBonus('settings.open', history)).toBe(0.3)
    expect(calculateHistoryBonus('missing.command', history)).toBe(0)
  })
})
