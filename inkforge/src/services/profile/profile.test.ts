import { afterEach, describe, expect, it, vi } from 'vitest'
import { db, type AccountRecord } from '@/utils/db'
import { ProfileDatabaseManager } from './database'
import { ProfileRepository } from './repository'
import {
  buildProfileDatabaseNamespace,
  generateProfileId,
  isRecoverableDeletedProfile,
  validateProfileFileRoot,
  type ProfileRecord,
} from './types'

function createProfile(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  const now = 1_712_000_000_000
  const id = overrides.id ?? 'abcdefghijklmnopqrstu'
  return {
    id,
    name: '工作',
    avatarIcon: 'User',
    colorAccent: '#2563EB',
    fileRoot: null,
    fileRootStatus: 'native-unavailable',
    dbNamespace: buildProfileDatabaseNamespace(id),
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    ...overrides,
  }
}

function createAccount(overrides: Partial<AccountRecord> = {}): AccountRecord {
  const now = new Date('2026-05-02T00:00:00.000Z')
  return {
    id: 'local-default',
    name: '本地账户',
    profileKind: 'local',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    ...overrides,
  }
}

function stubProfileTable(initial: ProfileRecord[] = []) {
  const table = new Map<string, ProfileRecord>(initial.map(profile => [profile.id, profile]))
  const getSpy = vi.spyOn(db.profiles, 'get')
  const toArraySpy = vi.spyOn(db.profiles, 'toArray')
  const putSpy = vi.spyOn(db.profiles, 'put')
  const addSpy = vi.spyOn(db.profiles, 'add')

  getSpy.mockImplementation(((key: unknown) => Promise.resolve(table.get(String(key)))) as unknown as Parameters<typeof getSpy.mockImplementation>[0])
  toArraySpy.mockImplementation((() => Promise.resolve(Array.from(table.values()))) as unknown as Parameters<typeof toArraySpy.mockImplementation>[0])
  putSpy.mockImplementation(((record: ProfileRecord) => {
    table.set(record.id, record)
    return Promise.resolve(record.id)
  }) as unknown as Parameters<typeof putSpy.mockImplementation>[0])
  addSpy.mockImplementation(((record: ProfileRecord) => {
    if (table.has(record.id)) {
      return Promise.reject(new Error('duplicate profile'))
    }
    table.set(record.id, record)
    return Promise.resolve(record.id)
  }) as unknown as Parameters<typeof addSpy.mockImplementation>[0])

  return { table }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('profile id and namespace', () => {
  it('generates URL-safe 21-character ids and namespaces', () => {
    const ids = new Set<string>()
    for (let index = 0; index < 1000; index += 1) {
      const id = generateProfileId()
      expect(id).toMatch(/^[A-Za-z0-9_-]{21}$/u)
      ids.add(id)
    }
    expect(ids.size).toBe(1000)
    const sample = Array.from(ids)[0]
    expect(buildProfileDatabaseNamespace(sample)).toBe(`inkforge-${sample}`)
  })

  it('returns distinct dynamic database instances per namespace without opening them', () => {
    const manager = new ProfileDatabaseManager()
    const first = manager.getDatabase(createProfile({ id: 'abcdefghijklmnopqrstu' }))
    const second = manager.getDatabase(createProfile({ id: 'bcdefghijklmnopqrstuv', name: '个人' }))

    expect(first.name).toBe('inkforge-abcdefghijklmnopqrstu')
    expect(second.name).toBe('inkforge-bcdefghijklmnopqrstuv')
    expect(first).not.toBe(second)
    manager.closeAll()
  })
})

describe('profile validation helpers', () => {
  it('rejects duplicate and nested file roots', () => {
    const profiles = [createProfile({ fileRoot: 'C:/Users/HP/Documents/InkForge/Work', fileRootStatus: 'selected' })]

    expect(() => validateProfileFileRoot('C:/Users/HP/Documents/InkForge/Work', profiles)).toThrow('重叠')
    expect(() => validateProfileFileRoot('C:/Users/HP/Documents/InkForge/Work/Drafts', profiles)).toThrow('重叠')
    expect(() => validateProfileFileRoot('C:/Users/HP/Documents/InkForge', profiles)).toThrow('重叠')
    expect(validateProfileFileRoot('C:/Users/HP/Documents/InkForge/Personal', profiles)).toBe('C:/Users/HP/Documents/InkForge/Personal')
  })

  it('filters deleted profiles within the seven-day recovery window', () => {
    const now = 1_712_604_800_000
    expect(isRecoverableDeletedProfile(createProfile({ status: 'deleted', deletedAt: now - 2 * 86_400_000 }), now)).toBe(true)
    expect(isRecoverableDeletedProfile(createProfile({ status: 'deleted', deletedAt: now - 8 * 86_400_000 }), now)).toBe(false)
  })
})

describe('profile repository lifecycle', () => {
  it('mirrors the existing default account without deleting account data', async () => {
    const { table } = stubProfileTable()
    const manager = { initializeProfileDatabase: vi.fn(async () => ({ id: 'profile-meta' })) }
    const auditWriter = vi.fn(async () => ({ id: 'audit-profile' }))
    const repository = new ProfileRepository(manager as unknown as ProfileDatabaseManager, auditWriter as never)

    const profile = await repository.ensureDefaultProfileFromAccount(createAccount())

    expect(profile.id).toBe('local-default')
    expect(profile.dbNamespace).toBe('inkforge-local-default')
    expect(profile.sourceAccountId).toBe('local-default')
    expect(table.get('local-default')).toEqual(profile)
    expect(manager.initializeProfileDatabase).toHaveBeenCalledWith(profile)
    expect(auditWriter).not.toHaveBeenCalled()
  })

  it('creates, switches, soft-deletes, and restores profiles with audit evidence', async () => {
    const defaultProfile = createProfile({ id: 'local-default', name: '本地账户', dbNamespace: 'inkforge-local-default', fileRootStatus: 'unassigned' })
    const { table } = stubProfileTable([defaultProfile])
    const manager = { initializeProfileDatabase: vi.fn(async () => ({ id: 'profile-meta' })) }
    const auditWriter = vi.fn(async () => ({ id: 'audit-profile' }))
    const repository = new ProfileRepository(manager as unknown as ProfileDatabaseManager, auditWriter as never)

    const created = await repository.createProfile({ name: '个人创作', colorAccent: '#059669', avatarIcon: 'UserCircle', fileRootStatus: 'native-unavailable' }, 'local-default')
    expect(created.name).toBe('个人创作')
    expect(created.status).toBe('active')
    expect(created.fileRoot).toBeNull()
    expect(created.fileRootStatus).toBe('native-unavailable')
    expect(table.has(created.id)).toBe(true)
    expect(auditWriter).toHaveBeenCalledWith('account.create', expect.objectContaining({ profileId: created.id, outcome: 'success' }))

    const switched = await repository.switchProfile(created.id, 'local-default')
    expect(switched.lastActiveAt).toBeGreaterThanOrEqual(created.lastActiveAt)
    expect(auditWriter).toHaveBeenCalledWith('account.switch', expect.objectContaining({ profileId: created.id, outcome: 'success' }))

    const deleted = await repository.softDeleteProfile(created.id, 'local-default')
    expect(deleted.status).toBe('deleted')
    expect(deleted.deletedAt).toEqual(expect.any(Number))
    expect(auditWriter).toHaveBeenCalledWith('account.delete', expect.objectContaining({ profileId: created.id, severity: 'critical' }))

    const restored = await repository.restoreProfile(created.id, 'local-default')
    expect(restored.status).toBe('active')
    expect(restored.deletedAt).toBeUndefined()
    expect(auditWriter).toHaveBeenCalledWith('account.restore', expect.objectContaining({ profileId: created.id, outcome: 'success' }))
  })

  it('rejects duplicate active profile names and deleting the last active profile', async () => {
    const only = createProfile({ id: 'local-default', name: '本地账户', dbNamespace: 'inkforge-local-default', fileRootStatus: 'unassigned' })
    stubProfileTable([only])
    const manager = { initializeProfileDatabase: vi.fn(async () => ({ id: 'profile-meta' })) }
    const auditWriter = vi.fn(async () => ({ id: 'audit-profile' }))
    const repository = new ProfileRepository(manager as unknown as ProfileDatabaseManager, auditWriter as never)

    await expect(repository.createProfile({ name: '本地账户' }, 'local-default')).rejects.toThrow('工作区名称已存在')
    await expect(repository.softDeleteProfile('local-default', 'local-default')).rejects.toThrow('至少需要保留一个可用工作区')
  })
})
