import { describe, expect, it } from 'vitest'
import {
  CommandContextTag,
  CommandGroup,
  CommandScope,
  type Command,
  type CommandContext,
  type CommandHistoryEntry,
} from '@/types/command-palette'
import { FuzzySearchEngine, calculateHistoryBonus } from './fuzzy-search'
import { CommandRegistry, isCommandVisible } from './registry'

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
