import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommandContextTag, CommandGroup, CommandScope, type Command } from '@/types/command-palette'
import { CommandRegistry } from '@/services/command/registry'
import { db } from '@/utils/db'
import { ExtensionHost } from './host'
import { ExtensionRepository } from './repository'
import { ExtensionManifestError, parseExtensionManifest } from './manifest'
import type { ExtensionManifest, ExtensionPermission, ExtensionRecord, ExtensionStorageRecord } from './types'

const auditLogMock = vi.hoisted(() => vi.fn(async () => ({ id: 'audit-extension' })))

vi.mock('@/services/audit', () => ({
  auditLog: auditLogMock,
}))

function createManifest(overrides: Partial<ExtensionManifest> = {}): ExtensionManifest {
  return parseExtensionManifest({
    id: 'local.word-counter',
    name: 'Word Counter',
    version: '1.0.0',
    author: 'local',
    description: 'Counts words without runtime execution.',
    entry: './dist/index.js',
    inkforgeVersion: '>=0.1.0',
    permissions: ['storage:read', 'ui:command'],
    sandboxLevel: 'strict',
    commandPermissions: ['document.read'],
    configDefaults: { enabled: true },
    ...overrides,
  })
}

function createRecord(overrides: Partial<ExtensionRecord> = {}): ExtensionRecord {
  const manifest = overrides.manifest ?? createManifest()
  return {
    id: `profile-1::${manifest.id}`,
    profileId: 'profile-1',
    extensionId: manifest.id,
    manifest,
    status: 'installed',
    enabled: false,
    declaredPermissions: [...manifest.permissions],
    grantedPermissions: [...manifest.permissions],
    sandboxLevel: manifest.sandboxLevel,
    commandPermissions: [...manifest.commandPermissions],
    source: 'local-manifest',
    installedAt: 1_712_000_000_000,
    updatedAt: 1_712_000_000_000,
    errorCount: 0,
    ...overrides,
  }
}

function createCommand(overrides: Partial<Command> = {}): Command {
  return {
    id: 'ext.local.word-counter.count',
    title: 'Count Words',
    keywords: ['words'],
    icon: 'Puzzle',
    scope: CommandScope.Document,
    group: CommandGroup.Extension,
    contexts: [CommandContextTag.Document],
    requiredPermissions: ['document.read'],
    handler: () => undefined,
    ...overrides,
  }
}

function createHostRepository(initialRecord: ExtensionRecord | undefined) {
  let currentRecord = initialRecord
  const repository = {
    listByProfile: vi.fn(async () => currentRecord ? [currentRecord] : []),
    get: vi.fn(async () => currentRecord),
    install: vi.fn(async (profileId: string, manifest: ExtensionManifest, grantedPermissions: readonly ExtensionPermission[]) => {
      currentRecord = createRecord({
        id: `${profileId}::${manifest.id}`,
        profileId,
        extensionId: manifest.id,
        manifest,
        declaredPermissions: [...manifest.permissions],
        grantedPermissions: [...grantedPermissions],
        commandPermissions: [...manifest.commandPermissions],
      })
      return currentRecord
    }),
    setLifecycle: vi.fn(async (_profileId: string, _extensionId: string, next: { enabled: boolean; status: ExtensionRecord['status']; lastActivatedAt?: number; lastErrorMessage?: string; runtimeBlockedReason?: string }) => {
      if (!currentRecord) throw new Error('missing record')
      currentRecord = { ...currentRecord, ...next, updatedAt: Date.now() }
      return currentRecord
    }),
    markBlocked: vi.fn(async (_profileId: string, _extensionId: string, reason: string) => {
      if (!currentRecord) throw new Error('missing record')
      currentRecord = { ...currentRecord, enabled: false, status: 'blocked', lastErrorMessage: reason, runtimeBlockedReason: reason, updatedAt: Date.now() }
      return currentRecord
    }),
    disable: vi.fn(async () => {
      if (!currentRecord) throw new Error('missing record')
      currentRecord = { ...currentRecord, enabled: false, status: 'disabled', updatedAt: Date.now() }
      return currentRecord
    }),
    recordError: vi.fn(async (_profileId: string, _extensionId: string, message: string) => {
      if (!currentRecord) throw new Error('missing record')
      currentRecord = { ...currentRecord, errorCount: currentRecord.errorCount + 1, lastErrorMessage: message, updatedAt: Date.now() }
      return currentRecord
    }),
    uninstall: vi.fn(async () => {
      currentRecord = undefined
    }),
    getStorage: vi.fn(),
    setStorage: vi.fn(),
    deleteStorage: vi.fn(),
    listStorage: vi.fn(),
    clearStorage: vi.fn(),
  } as unknown as ExtensionRepository

  return { repository, getCurrentRecord: () => currentRecord }
}

afterEach(() => {
  auditLogMock.mockClear()
  vi.restoreAllMocks()
})

describe('extension manifest validation', () => {
  it('accepts a strict local manifest with exact network origins', () => {
    const manifest = createManifest({
      permissions: ['network:fetch', 'storage:read'],
      networkPolicy: { allowedOrigins: ['https://api.example.com'] },
    })

    expect(manifest.id).toBe('local.word-counter')
    expect(manifest.networkPolicy?.allowedOrigins).toEqual(['https://api.example.com'])
  })

  it('rejects invalid id, unsafe entry paths, and broad network grants', () => {
    expect(() => createManifest({ id: 'Bad.Id' })).toThrow(ExtensionManifestError)
    expect(() => createManifest({ entry: '../dist/index.js' })).toThrow(ExtensionManifestError)
    expect(() => createManifest({ permissions: ['network:fetch'], networkPolicy: undefined })).toThrow(ExtensionManifestError)
    expect(() => createManifest({ permissions: ['network:fetch'], networkPolicy: { allowedOrigins: ['https://*.example.com'] } })).toThrow(ExtensionManifestError)
  })
})

describe('extension repository storage namespace', () => {
  it('isolates storage records by profile and extension id', async () => {
    const table = new Map<string, ExtensionStorageRecord>()
    const getSpy = vi.spyOn(db.extensionStorage, 'get')
    const putSpy = vi.spyOn(db.extensionStorage, 'put')
    const toArraySpy = vi.spyOn(db.extensionStorage, 'toArray')
    getSpy.mockImplementation(((key: unknown) => Promise.resolve(table.get(String(key)))) as unknown as Parameters<typeof getSpy.mockImplementation>[0])
    putSpy.mockImplementation(((record: ExtensionStorageRecord) => {
      table.set(record.id, record)
      return Promise.resolve(record.id)
    }) as unknown as Parameters<typeof putSpy.mockImplementation>[0])
    toArraySpy.mockImplementation((() => Promise.resolve(Array.from(table.values()))) as unknown as Parameters<typeof toArraySpy.mockImplementation>[0])

    const repository = new ExtensionRepository()
    await repository.setStorage('profile-1', 'local.word-counter', 'settings', { count: 1 })
    await repository.setStorage('profile-2', 'local.word-counter', 'settings', { count: 2 })
    await repository.setStorage('profile-1', 'local.other', 'settings', { count: 3 })

    await expect(repository.getStorage('profile-1', 'local.word-counter', 'settings')).resolves.toEqual({ count: 1 })
    await expect(repository.listStorage('profile-1', 'local.word-counter')).resolves.toHaveLength(1)
    await expect(repository.listStorage('profile-2', 'local.word-counter')).resolves.toEqual([
      expect.objectContaining({ profileId: 'profile-2', value: { count: 2 } }),
    ])
  })
})

describe('extension host lifecycle', () => {
  it('installs a local manifest and writes audit evidence', async () => {
    const stub = createHostRepository(undefined)
    const host = new ExtensionHost(stub.repository)

    const record = await host.installLocalManifest(createManifest(), { profileId: 'profile-1', actorId: 'actor-1' })

    expect(record.extensionId).toBe('local.word-counter')
    expect(auditLogMock).toHaveBeenCalledWith('system.plugin_install', expect.objectContaining({
      actorId: 'actor-1',
      profileId: 'profile-1',
      outcome: 'success',
      payload: expect.objectContaining({ extensionId: 'local.word-counter' }),
    }))
  })

  it('fails closed when runtime activation is unavailable', async () => {
    const stub = createHostRepository(createRecord())
    const host = new ExtensionHost(stub.repository)

    const result = await host.enableExtension('profile-1', 'local.word-counter', 'actor-1')

    expect(result.record.enabled).toBe(false)
    expect(result.record.status).toBe('blocked')
    expect(result.record.runtimeBlockedReason).toBe('extension-runtime-unavailable')
    expect(auditLogMock).toHaveBeenCalledWith('system.plugin_enable', expect.objectContaining({
      actorId: 'actor-1',
      outcome: 'failure',
      payload: expect.objectContaining({ workerProtocolReady: false }),
    }))
  })

  it('requires ui:command and command permission declarations before registering commands', async () => {
    const registry = new CommandRegistry()
    const withoutUiCommand = createRecord({
      enabled: true,
      status: 'enabled',
      grantedPermissions: ['storage:read'],
      commandPermissions: ['document.read'],
    })
    const deniedStub = createHostRepository(withoutUiCommand)
    const deniedHost = new ExtensionHost(deniedStub.repository)

    await expect(deniedHost.registerCommandContributions('profile-1', 'local.word-counter', [createCommand()], registry)).resolves.toEqual({
      registered: [],
      rejected: [{ id: 'ext.local.word-counter.count', reason: 'Missing extension permission ui:command' }],
    })

    const allowedRecord = createRecord({
      enabled: true,
      status: 'enabled',
      grantedPermissions: ['ui:command'],
      commandPermissions: ['document.read'],
    })
    const allowedStub = createHostRepository(allowedRecord)
    const allowedHost = new ExtensionHost(allowedStub.repository)
    const result = await allowedHost.registerCommandContributions('profile-1', 'local.word-counter', [
      createCommand(),
      createCommand({ id: 'ext.local.word-counter.write', requiredPermissions: ['settings.write'] }),
    ], registry)

    expect(result.registered).toEqual(['ext.local.word-counter.count'])
    expect(result.rejected).toEqual([{ id: 'ext.local.word-counter.write', reason: 'Missing permission settings.write' }])
    expect(registry.get('ext.local.word-counter.count')?.title).toBe('Count Words')
  })
})
