import { auditLog } from '@/services/audit'
import { CommandRegistry } from '@/services/command/registry'
import type { Command, ExtensionManifest as CommandExtensionManifest, RegisterResult } from '@/types/command-palette'
import { assertGrantedPermissions, parseExtensionManifest } from './manifest'
import { extensionRepository, type ExtensionRepository } from './repository'
import type {
  ExtensionInstallOptions,
  ExtensionLifecycleResult,
  ExtensionManifest,
  ExtensionPermission,
  ExtensionRecord,
} from './types'

const RUNTIME_UNAVAILABLE_REASON = 'extension-runtime-unavailable'

type ExtensionAuditOutcome = 'success' | 'failure' | 'denied'

export class ExtensionHost {
  constructor(private readonly repository: ExtensionRepository = extensionRepository) {}

  async installLocalManifest(input: unknown, options: ExtensionInstallOptions): Promise<ExtensionRecord> {
    const actorId = options.actorId ?? options.profileId
    let parsedManifest: ExtensionManifest | null = null

    try {
      parsedManifest = parseExtensionManifest(input)
      const grantedPermissions = options.grantedPermissions ?? parsedManifest.permissions
      assertGrantedPermissions(parsedManifest.permissions, grantedPermissions)
      const record = await this.repository.install(options.profileId, parsedManifest, grantedPermissions, options.source ?? 'local-manifest')
      await this.auditPluginAction('system.plugin_install', record, actorId, 'success', {
        declaredPermissions: record.declaredPermissions,
        grantedPermissions: record.grantedPermissions,
        commandPermissions: record.commandPermissions,
        source: record.source,
      })
      return record
    } catch (error) {
      await auditLog('system.plugin_install', {
        actorId,
        profileId: options.profileId,
        severity: 'error',
        outcome: 'failure',
        reason: error instanceof Error ? error.message : String(error),
        resourceId: parsedManifest?.id,
        payload: {
          extensionId: parsedManifest?.id ?? readPotentialManifestId(input),
          validationFailed: parsedManifest === null,
        },
        source: 'ExtensionHost.installLocalManifest',
      })
      throw error
    }
  }

  async enableExtension(profileId: string, extensionId: string, actorId = profileId): Promise<ExtensionLifecycleResult> {
    const record = await this.repository.get(profileId, extensionId)
    if (!record) {
      throw new Error(`Extension ${extensionId} is not installed for profile ${profileId}`)
    }

    if (!this.hasRuntimeSandbox()) {
      const blocked = await this.repository.markBlocked(profileId, extensionId, RUNTIME_UNAVAILABLE_REASON)
      await this.auditPluginAction('system.plugin_enable', blocked, actorId, 'failure', {
        runtimeBlockedReason: RUNTIME_UNAVAILABLE_REASON,
        workerProtocolReady: false,
      })
      return {
        record: blocked,
        message: '扩展运行时尚未接入真实 Worker sandbox，已阻止启用。',
      }
    }

    const enabled = await this.repository.setLifecycle(profileId, extensionId, {
      enabled: true,
      status: 'enabled',
      lastActivatedAt: Date.now(),
      runtimeBlockedReason: undefined,
    })
    await this.auditPluginAction('system.plugin_enable', enabled, actorId, 'success', { workerProtocolReady: true })
    return { record: enabled, message: '扩展已启用。' }
  }

  async disableExtension(profileId: string, extensionId: string, actorId = profileId): Promise<ExtensionLifecycleResult> {
    const record = await this.repository.disable(profileId, extensionId)
    await this.auditPluginAction('system.plugin_disable', record, actorId, 'success', {})
    return { record, message: '扩展已停用。' }
  }

  async uninstallExtension(profileId: string, extensionId: string, actorId = profileId): Promise<void> {
    const record = await this.repository.get(profileId, extensionId)
    await this.repository.uninstall(profileId, extensionId)
    await auditLog('system.plugin_uninstall', {
      actorId,
      profileId,
      severity: 'warning',
      outcome: 'success',
      resourceId: extensionId,
      payload: {
        extensionId,
        version: record?.manifest.version,
        storageCleared: true,
      },
      source: 'ExtensionHost.uninstallExtension',
    })
  }

  async registerCommandContributions(
    profileId: string,
    extensionId: string,
    commands: Command[],
    registry: CommandRegistry,
    actorId = profileId,
  ): Promise<RegisterResult> {
    const record = await this.repository.get(profileId, extensionId)
    if (!record) {
      return rejectAll(commands, `Extension ${extensionId} is not installed`)
    }
    if (!record.enabled || record.status !== 'enabled') {
      return rejectAll(commands, `Extension ${extensionId} is not enabled`)
    }
    if (!hasGrantedPermission(record, 'ui:command')) {
      await this.auditPluginAction('system.plugin_enable', record, actorId, 'denied', { missingPermission: 'ui:command' })
      return rejectAll(commands, 'Missing extension permission ui:command')
    }

    const manifest: CommandExtensionManifest = {
      id: record.extensionId,
      name: record.manifest.name,
      version: record.manifest.version,
      permissions: record.commandPermissions,
      sandboxLevel: record.sandboxLevel,
    }
    const result = registry.registerExtension(extensionId, commands, manifest)
    await this.auditPluginAction('system.plugin_enable', record, actorId, result.registered.length > 0 ? 'success' : 'denied', {
      registeredCommands: result.registered,
      rejectedCommands: result.rejected,
    })
    return result
  }

  hasRuntimeSandbox(): boolean {
    return false
  }

  private async auditPluginAction(
    action: 'system.plugin_install' | 'system.plugin_uninstall' | 'system.plugin_enable' | 'system.plugin_disable',
    record: ExtensionRecord,
    actorId: string,
    outcome: ExtensionAuditOutcome,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await auditLog(action, {
      actorId,
      profileId: record.profileId,
      severity: outcome === 'success' ? 'info' : 'warning',
      outcome,
      resourceId: record.extensionId,
      payload: {
        extensionId: record.extensionId,
        version: record.manifest.version,
        status: record.status,
        enabled: record.enabled,
        ...payload,
      },
      source: 'ExtensionHost',
    })
  }
}

function hasGrantedPermission(record: ExtensionRecord, permission: ExtensionPermission): boolean {
  return record.grantedPermissions.includes(permission)
}

function rejectAll(commands: Command[], reason: string): RegisterResult {
  return {
    registered: [],
    rejected: commands.map(command => ({ id: command.id, reason })),
  }
}

function readPotentialManifestId(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null || !('id' in input)) {
    return undefined
  }
  const id = (input as { id?: unknown }).id
  return typeof id === 'string' ? id : undefined
}

export const extensionHost = new ExtensionHost()
