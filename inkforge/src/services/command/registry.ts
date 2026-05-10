import {
  CommandContextTag,
  DuplicateCommandError,
  type Command,
  type CommandGroup,
  type ExtensionManifest,
  type Permission,
  type RegisterResult,
} from '@/types/command-palette'

export interface RegisterOptions {
  overwrite?: boolean
  source?: string
}

function uniqueCommands(commands: Command[]): Command[] {
  return Array.from(new Map(commands.map(command => [command.id, command])).values())
}

function commandHasPermission(commandPermission: Permission, manifest: ExtensionManifest): boolean {
  return manifest.permissions.includes(commandPermission)
}

export class CommandRegistry {
  private readonly commands = new Map<string, Command>()
  private readonly byGroup = new Map<CommandGroup, Command[]>()
  private readonly byContext = new Map<CommandContextTag, Command[]>()

  register(command: Command, options: RegisterOptions = {}): void {
    if (this.commands.has(command.id) && !options.overwrite) {
      throw new DuplicateCommandError(command.id)
    }

    if (this.commands.has(command.id)) {
      this.unregister(command.id)
    }

    this.commands.set(command.id, command)
    this.byGroup.set(command.group, [...(this.byGroup.get(command.group) ?? []), command])

    for (const context of command.contexts) {
      this.byContext.set(context, [...(this.byContext.get(context) ?? []), command])
    }
  }

  registerBatch(commands: Command[], options: RegisterOptions = {}): void {
    for (const command of commands) {
      this.register(command, options)
    }
  }

  unregister(id: string): void {
    const command = this.commands.get(id)
    if (!command) return

    this.commands.delete(id)
    this.byGroup.set(
      command.group,
      (this.byGroup.get(command.group) ?? []).filter(item => item.id !== id),
    )

    for (const context of command.contexts) {
      this.byContext.set(
        context,
        (this.byContext.get(context) ?? []).filter(item => item.id !== id),
      )
    }
  }

  get(id: string): Command | undefined {
    return this.commands.get(id)
  }

  getByGroup(group: CommandGroup): Command[] {
    return [...(this.byGroup.get(group) ?? [])]
  }

  filterByContext(tags: CommandContextTag[]): Command[] {
    const scopedCommands = tags.flatMap(tag => this.byContext.get(tag) ?? [])
    const globalCommands = this.byContext.get(CommandContextTag.Global) ?? []
    return uniqueCommands([...globalCommands, ...scopedCommands])
  }

  getAll(): Command[] {
    return [...this.commands.values()]
  }

  registerExtension(extensionId: string, commands: Command[], manifest: ExtensionManifest): RegisterResult {
    const registered: string[] = []
    const rejected: { id: string; reason: string }[] = []
    const idPrefix = `ext.${extensionId}.`

    for (const command of commands) {
      if (!command.id.startsWith(idPrefix)) {
        rejected.push({ id: command.id, reason: `Command id must start with ${idPrefix}` })
        continue
      }

      const missingPermission = command.requiredPermissions?.find(
        permission => !commandHasPermission(permission, manifest),
      )

      if (missingPermission) {
        rejected.push({ id: command.id, reason: `Missing permission ${missingPermission}` })
        continue
      }

      this.register(command, { source: `extension:${extensionId}` })
      registered.push(command.id)
    }

    return { registered, rejected }
  }

  unregisterExtensionCommands(extensionId: string): void {
    const idPrefix = `ext.${extensionId}.`
    for (const command of this.getAll()) {
      if (command.id.startsWith(idPrefix)) {
        this.unregister(command.id)
      }
    }
  }
}

export function isCommandVisible(
  command: Command,
  activeContexts: CommandContextTag[],
  contextFilter: CommandContextTag[] = [],
): boolean {
  if (contextFilter.length > 0 && !command.contexts.some(context => contextFilter.includes(context))) {
    return false
  }

  if (command.contexts.includes(CommandContextTag.Global)) {
    return contextFilter.length === 0 || contextFilter.includes(CommandContextTag.Global)
  }

  return command.contexts.some(context => activeContexts.includes(context))
}
