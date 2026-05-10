import type {
  CanExecuteResult,
  Command,
  CommandContext,
  ExecuteResult,
} from '@/types/command-palette'
import { CommandContextTag } from '@/types/command-palette'
import { isCommandVisible, type CommandRegistry } from './registry'

export interface CommandAuditEvent {
  commandId: string
  status: 'success' | 'error'
  executedAt: number
  errorMessage?: string
}

export interface CommandExecutorOptions {
  confirmDestructive?: (command: Command) => Promise<boolean> | boolean
  createVersionCheckpoint?: (command: Command, context: CommandContext) => Promise<void> | void
  auditLog?: (event: CommandAuditEvent) => Promise<void> | void
}

function hasRequiredPermission(command: Command, context: CommandContext): boolean {
  if (!command.requiredPermissions?.length) return true
  return command.requiredPermissions.some(permission => context.permissions.includes(permission))
}

async function defaultConfirmDestructive(command: Command): Promise<boolean> {
  if (typeof window === 'undefined') return false
  return window.confirm(`Execute destructive command "${command.title}"?`)
}

export class CommandExecutor {
  constructor(
    private readonly registry: CommandRegistry,
    private readonly options: CommandExecutorOptions = {},
  ) {}

  canExecute(commandId: string, context: CommandContext): CanExecuteResult {
    const command = this.registry.get(commandId)
    if (!command) {
      return { canExecute: false, reason: 'command_not_found' }
    }

    if (!isCommandVisible(command, context.activeContexts)) {
      return { canExecute: false, reason: 'context_mismatch' }
    }

    if (!hasRequiredPermission(command, context)) {
      return { canExecute: false, reason: 'permission_denied' }
    }

    if (command.scope === 'document' && !context.activeContexts.includes(CommandContextTag.Document)) {
      return { canExecute: false, reason: 'context_mismatch' }
    }

    if (command.scope === 'editor' && !context.activeContexts.includes(CommandContextTag.Editor)) {
      return { canExecute: false, reason: 'context_mismatch' }
    }

    return { canExecute: true }
  }

  async execute(commandId: string, context: CommandContext): Promise<ExecuteResult> {
    const command = this.registry.get(commandId)
    if (!command) {
      return {
        success: false,
        commandId,
        error: new Error(`Command not found: ${commandId}`),
        versionCheckpointCreated: false,
        auditLogged: false,
      }
    }

    const canExecute = this.canExecute(commandId, context)
    if (!canExecute.canExecute) {
      return {
        success: false,
        commandId,
        error: new Error(canExecute.reason ?? 'Command cannot execute'),
        versionCheckpointCreated: false,
        auditLogged: false,
      }
    }

    if (command.isDestructive) {
      const confirmed = await (this.options.confirmDestructive ?? defaultConfirmDestructive)(command)
      if (!confirmed) {
        return {
          success: false,
          commandId,
          versionCheckpointCreated: false,
          auditLogged: false,
        }
      }
    }

    let versionCheckpointCreated = false
    let auditLogged = false

    try {
      if (command.requiresVersionCheckpoint && this.options.createVersionCheckpoint) {
        await this.options.createVersionCheckpoint(command, context)
        versionCheckpointCreated = true
      }

      await command.handler(context)

      if (command.auditLogged !== false && this.options.auditLog) {
        await this.options.auditLog({
          commandId,
          status: 'success',
          executedAt: Date.now(),
        })
        auditLogged = true
      }

      return { success: true, commandId, versionCheckpointCreated, auditLogged }
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error))
      if (command.auditLogged !== false && this.options.auditLog) {
        await this.options.auditLog({
          commandId,
          status: 'error',
          executedAt: Date.now(),
          errorMessage: normalizedError.message,
        })
        auditLogged = true
      }

      return {
        success: false,
        commandId,
        error: normalizedError,
        versionCheckpointCreated,
        auditLogged,
      }
    }
  }
}
