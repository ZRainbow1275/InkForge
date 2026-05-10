import Dexie, { type Table } from 'dexie'
import type { ProfileDatabaseMetadataRecord, ProfileRecord } from './types'

export const PROFILE_DATABASE_METADATA_ID = 'profile-meta'

export class ProfileDatabase extends Dexie {
  metadata!: Table<ProfileDatabaseMetadataRecord, string>

  constructor(readonly profileId: string, readonly namespace: string) {
    super(namespace)

    this.version(1).stores({
      metadata: 'id, profileId, dbNamespace, createdAt, updatedAt, schemaVersion',
    })
  }

  async initialize(profile: ProfileRecord): Promise<ProfileDatabaseMetadataRecord> {
    const existing = await this.metadata.get(PROFILE_DATABASE_METADATA_ID)
    const now = Date.now()
    const record: ProfileDatabaseMetadataRecord = {
      id: PROFILE_DATABASE_METADATA_ID,
      profileId: profile.id,
      profileName: profile.name,
      dbNamespace: profile.dbNamespace,
      schemaVersion: 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await this.metadata.put(record)
    return record
  }
}

export class ProfileDatabaseManager {
  private readonly instances = new Map<string, ProfileDatabase>()

  getDatabase(profile: Pick<ProfileRecord, 'id' | 'dbNamespace'>): ProfileDatabase {
    const existing = this.instances.get(profile.dbNamespace)
    if (existing) {
      return existing
    }

    const created = new ProfileDatabase(profile.id, profile.dbNamespace)
    this.instances.set(profile.dbNamespace, created)
    return created
  }

  async initializeProfileDatabase(profile: ProfileRecord): Promise<ProfileDatabaseMetadataRecord> {
    const database = this.getDatabase(profile)
    await database.open()
    return database.initialize(profile)
  }

  closeDatabase(dbNamespace: string): void {
    const database = this.instances.get(dbNamespace)
    if (!database) {
      return
    }
    database.close()
    this.instances.delete(dbNamespace)
  }

  closeAll(): void {
    for (const database of this.instances.values()) {
      database.close()
    }
    this.instances.clear()
  }

  async databaseExists(dbNamespace: string): Promise<boolean> {
    if (typeof Dexie.exists === 'function') {
      return Dexie.exists(dbNamespace)
    }
    const names = await this.listProfileDatabaseNames()
    return names.includes(dbNamespace)
  }

  async listProfileDatabaseNames(): Promise<string[]> {
    if (typeof Dexie.getDatabaseNames !== 'function') {
      return []
    }
    const names = await Dexie.getDatabaseNames()
    return names.filter(name => name.startsWith('inkforge-')).sort((a, b) => a.localeCompare(b))
  }

  async deleteDatabase(dbNamespace: string): Promise<void> {
    this.closeDatabase(dbNamespace)
    await Dexie.delete(dbNamespace)
  }
}

export const profileDatabaseManager = new ProfileDatabaseManager()
