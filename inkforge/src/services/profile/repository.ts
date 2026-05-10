import { auditLog } from '@/services/audit'
import { db, type AccountRecord } from '@/utils/db'
import { profileDatabaseManager, type ProfileDatabaseManager } from './database'
import {
  DEFAULT_PROFILE_ID,
  PROFILE_ACCENT_PRESETS,
  assertUniqueProfileName,
  buildProfileDatabaseNamespace,
  generateProfileId,
  isRecoverableDeletedProfile,
  parseProfileCreateInput,
  parseProfileRecord,
  validateProfileFileRoot,
  type ProfileCreateInput,
  type ProfileRecord,
} from './types'

type AuditWriter = typeof auditLog

export class ProfileRepository {
  constructor(
    private readonly databaseManager: ProfileDatabaseManager = profileDatabaseManager,
    private readonly auditWriter: AuditWriter = auditLog,
  ) {}

  async listProfiles(options: { includeDeleted?: boolean } = {}): Promise<ProfileRecord[]> {
    const records = await db.profiles.toArray()
    return records
      .filter(record => options.includeDeleted || record.status === 'active')
      .map(record => parseProfileRecord(record))
      .sort(sortByLastActive)
  }

  async listDeletedRecoverable(now = Date.now()): Promise<ProfileRecord[]> {
    const records = await this.listProfiles({ includeDeleted: true })
    return records
      .filter(record => isRecoverableDeletedProfile(record, now))
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
  }

  async get(profileId: string): Promise<ProfileRecord | undefined> {
    const record = await db.profiles.get(profileId)
    return record ? parseProfileRecord(record) : undefined
  }

  async ensureDefaultProfileFromAccount(account: AccountRecord): Promise<ProfileRecord> {
    const now = Date.now()
    const existing = await db.profiles.get(account.id)
    const record = parseProfileRecord({
      id: account.id || DEFAULT_PROFILE_ID,
      name: account.name || '本地账户',
      avatarIcon: existing?.avatarIcon ?? 'UserCircle',
      colorAccent: existing?.colorAccent ?? PROFILE_ACCENT_PRESETS[0],
      fileRoot: existing?.fileRoot ?? null,
      fileRootStatus: existing?.fileRootStatus ?? 'unassigned',
      dbNamespace: buildProfileDatabaseNamespace(account.id || DEFAULT_PROFILE_ID),
      status: 'active',
      createdAt: existing?.createdAt ?? account.createdAt.getTime(),
      updatedAt: now,
      lastActiveAt: Math.max(existing?.lastActiveAt ?? 0, account.lastActiveAt.getTime()),
      sourceAccountId: account.id,
      syncConfig: existing?.syncConfig,
      settingsOverride: existing?.settingsOverride,
    })

    await db.profiles.put(record)
    await this.databaseManager.initializeProfileDatabase(record)
    return record
  }

  async createProfile(input: ProfileCreateInput, actorId?: string): Promise<ProfileRecord> {
    const parsed = parseProfileCreateInput(input)
    const allProfiles = await this.listProfiles({ includeDeleted: true })
    assertUniqueProfileName(parsed.name, allProfiles)
    const fileRoot = validateProfileFileRoot(parsed.fileRoot, allProfiles)
    const id = generateProfileId()
    const now = Date.now()
    const record = parseProfileRecord({
      id,
      name: parsed.name.trim(),
      avatarIcon: parsed.avatarIcon ?? 'User',
      colorAccent: parsed.colorAccent ?? PROFILE_ACCENT_PRESETS[0],
      fileRoot,
      fileRootStatus: fileRoot ? 'selected' : parsed.fileRootStatus ?? 'native-unavailable',
      dbNamespace: buildProfileDatabaseNamespace(id),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      syncConfig: parsed.syncConfig,
      settingsOverride: parsed.settingsOverride,
    })

    await db.profiles.add(record)
    await this.databaseManager.initializeProfileDatabase(record)
    await this.auditWriter('account.create', {
      actorId: actorId ?? record.id,
      profileId: record.id,
      severity: 'info',
      outcome: 'success',
      payload: {
        profileId: record.id,
        dbNamespace: record.dbNamespace,
        fileRootStatus: record.fileRootStatus,
        hasFileRoot: Boolean(record.fileRoot),
      },
      source: 'ProfileRepository.createProfile',
    })
    return record
  }

  async switchProfile(profileId: string, actorId = profileId): Promise<ProfileRecord> {
    const record = await this.get(profileId)
    if (!record || record.status !== 'active') {
      throw new Error('目标工作区不存在或已删除')
    }

    const updated = parseProfileRecord({
      ...record,
      lastActiveAt: Date.now(),
      updatedAt: Date.now(),
    })
    await db.profiles.put(updated)
    await this.databaseManager.initializeProfileDatabase(updated)
    await this.auditWriter('account.switch', {
      actorId,
      profileId: updated.id,
      severity: 'info',
      outcome: 'success',
      payload: {
        profileId: updated.id,
        dbNamespace: updated.dbNamespace,
      },
      source: 'ProfileRepository.switchProfile',
    })
    return updated
  }

  async softDeleteProfile(profileId: string, actorId = profileId): Promise<ProfileRecord> {
    const record = await this.get(profileId)
    if (!record || record.status !== 'active') {
      throw new Error('目标工作区不存在或已删除')
    }

    const activeProfiles = await this.listProfiles()
    if (activeProfiles.length <= 1) {
      throw new Error('至少需要保留一个可用工作区')
    }

    const now = Date.now()
    const updated = parseProfileRecord({
      ...record,
      status: 'deleted',
      deletedAt: now,
      updatedAt: now,
    })
    await db.profiles.put(updated)
    await this.auditWriter('account.delete', {
      actorId,
      profileId: updated.id,
      severity: 'critical',
      outcome: 'success',
      payload: {
        profileId: updated.id,
        dbNamespace: updated.dbNamespace,
        softDeleteRetentionDays: 7,
      },
      source: 'ProfileRepository.softDeleteProfile',
    })
    return updated
  }

  async restoreProfile(profileId: string, actorId = profileId): Promise<ProfileRecord> {
    const record = await this.get(profileId)
    if (!record || record.status !== 'deleted') {
      throw new Error('目标工作区不在可恢复状态')
    }

    const allProfiles = await this.listProfiles({ includeDeleted: true })
    assertUniqueProfileName(record.name, allProfiles, record.id)
    validateProfileFileRoot(record.fileRoot, allProfiles, record.id)

    const updated = parseProfileRecord({
      ...record,
      status: 'active',
      deletedAt: undefined,
      updatedAt: Date.now(),
      lastActiveAt: Date.now(),
    })
    await db.profiles.put(updated)
    await this.databaseManager.initializeProfileDatabase(updated)
    await this.auditWriter('account.restore', {
      actorId,
      profileId: updated.id,
      severity: 'warning',
      outcome: 'success',
      payload: {
        profileId: updated.id,
        dbNamespace: updated.dbNamespace,
      },
      source: 'ProfileRepository.restoreProfile',
    })
    return updated
  }
}

function sortByLastActive(a: ProfileRecord, b: ProfileRecord): number {
  return b.lastActiveAt - a.lastActiveAt || a.name.localeCompare(b.name)
}

export const profileRepository = new ProfileRepository()
