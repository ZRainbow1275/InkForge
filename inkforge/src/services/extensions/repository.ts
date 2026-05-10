import { db } from '@/utils/db'
import {
  buildExtensionRecordId,
  buildExtensionStorageRecordId,
  extensionStorageKeySchema,
  extensionStorageValueSchemaStrict,
  type ExtensionManifest,
  type ExtensionPermission,
  type ExtensionRecord,
  type ExtensionSource,
  type ExtensionStatus,
  type ExtensionStorageRecord,
  type ExtensionStorageValue,
} from './types'

const ERROR_DISABLE_THRESHOLD = 5

export class ExtensionRepository {
  async listByProfile(profileId: string): Promise<ExtensionRecord[]> {
    const records = await db.extensions.toArray()
    return records
      .filter(record => record.profileId === profileId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async get(profileId: string, extensionId: string): Promise<ExtensionRecord | undefined> {
    return db.extensions.get(buildExtensionRecordId(profileId, extensionId))
  }

  async install(
    profileId: string,
    manifest: ExtensionManifest,
    grantedPermissions: readonly ExtensionPermission[] = manifest.permissions,
    source: ExtensionSource = 'local-manifest',
  ): Promise<ExtensionRecord> {
    const now = Date.now()
    const existing = await this.get(profileId, manifest.id)
    const record: ExtensionRecord = {
      id: buildExtensionRecordId(profileId, manifest.id),
      profileId,
      extensionId: manifest.id,
      manifest,
      status: existing?.status ?? 'installed',
      enabled: existing?.enabled ?? false,
      declaredPermissions: [...manifest.permissions],
      grantedPermissions: [...grantedPermissions],
      sandboxLevel: manifest.sandboxLevel,
      commandPermissions: [...manifest.commandPermissions],
      source,
      installedAt: existing?.installedAt ?? now,
      updatedAt: now,
      lastActivatedAt: existing?.lastActivatedAt,
      lastErrorMessage: existing?.lastErrorMessage,
      runtimeBlockedReason: existing?.runtimeBlockedReason,
      errorCount: existing?.errorCount ?? 0,
    }

    await db.extensions.put(record)
    return record
  }

  async setLifecycle(
    profileId: string,
    extensionId: string,
    next: { enabled: boolean; status: ExtensionStatus; lastActivatedAt?: number; lastErrorMessage?: string; runtimeBlockedReason?: string },
  ): Promise<ExtensionRecord> {
    const record = await this.requireRecord(profileId, extensionId)
    const updated: ExtensionRecord = {
      ...record,
      enabled: next.enabled,
      status: next.status,
      lastActivatedAt: next.lastActivatedAt ?? record.lastActivatedAt,
      lastErrorMessage: next.lastErrorMessage,
      runtimeBlockedReason: next.runtimeBlockedReason,
      updatedAt: Date.now(),
    }
    await db.extensions.put(updated)
    return updated
  }

  async markBlocked(profileId: string, extensionId: string, reason: string): Promise<ExtensionRecord> {
    return this.setLifecycle(profileId, extensionId, {
      enabled: false,
      status: 'blocked',
      lastErrorMessage: reason,
      runtimeBlockedReason: reason,
    })
  }

  async disable(profileId: string, extensionId: string): Promise<ExtensionRecord> {
    return this.setLifecycle(profileId, extensionId, {
      enabled: false,
      status: 'disabled',
      runtimeBlockedReason: undefined,
    })
  }

  async recordError(profileId: string, extensionId: string, message: string): Promise<ExtensionRecord> {
    const record = await this.requireRecord(profileId, extensionId)
    const errorCount = record.errorCount + 1
    const updated: ExtensionRecord = {
      ...record,
      enabled: errorCount < ERROR_DISABLE_THRESHOLD && record.enabled,
      status: errorCount >= ERROR_DISABLE_THRESHOLD ? 'error' : record.status,
      errorCount,
      lastErrorMessage: message,
      updatedAt: Date.now(),
    }
    await db.extensions.put(updated)
    return updated
  }

  async uninstall(profileId: string, extensionId: string): Promise<void> {
    const id = buildExtensionRecordId(profileId, extensionId)
    const storageRows = await db.extensionStorage.toArray()
    const storageIds = storageRows
      .filter(record => record.profileId === profileId && record.extensionId === extensionId)
      .map(record => record.id)

    await db.transaction('rw', [db.extensions, db.extensionStorage], async () => {
      await db.extensions.delete(id)
      if (storageIds.length > 0) {
        await db.extensionStorage.bulkDelete(storageIds)
      }
    })
  }

  async getStorage(profileId: string, extensionId: string, key: string): Promise<ExtensionStorageValue | undefined> {
    const parsedKey = extensionStorageKeySchema.parse(key)
    const record = await db.extensionStorage.get(buildExtensionStorageRecordId(profileId, extensionId, parsedKey))
    return record ? cloneStorageValue(record.value) : undefined
  }

  async setStorage(profileId: string, extensionId: string, key: string, value: ExtensionStorageValue): Promise<ExtensionStorageRecord> {
    const parsedKey = extensionStorageKeySchema.parse(key)
    const parsedValue = extensionStorageValueSchemaStrict.parse(value)
    const id = buildExtensionStorageRecordId(profileId, extensionId, parsedKey)
    const existing = await db.extensionStorage.get(id)
    const now = Date.now()
    const record: ExtensionStorageRecord = {
      id,
      profileId,
      extensionId,
      key: parsedKey,
      value: cloneStorageValue(parsedValue),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await db.extensionStorage.put(record)
    return record
  }

  async deleteStorage(profileId: string, extensionId: string, key: string): Promise<void> {
    const parsedKey = extensionStorageKeySchema.parse(key)
    await db.extensionStorage.delete(buildExtensionStorageRecordId(profileId, extensionId, parsedKey))
  }

  async listStorage(profileId: string, extensionId: string): Promise<ExtensionStorageRecord[]> {
    const records = await db.extensionStorage.toArray()
    return records
      .filter(record => record.profileId === profileId && record.extensionId === extensionId)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(record => ({ ...record, value: cloneStorageValue(record.value) }))
  }

  async clearStorage(profileId: string, extensionId: string): Promise<void> {
    const records = await this.listStorage(profileId, extensionId)
    if (records.length === 0) return
    await db.extensionStorage.bulkDelete(records.map(record => record.id))
  }

  private async requireRecord(profileId: string, extensionId: string): Promise<ExtensionRecord> {
    const record = await this.get(profileId, extensionId)
    if (!record) {
      throw new Error(`Extension ${extensionId} is not installed for profile ${profileId}`)
    }
    return record
  }
}

function cloneStorageValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

export const extensionRepository = new ExtensionRepository()
