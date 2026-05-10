import { db } from '@/utils/db'
import {
  UPDATER_SKIPPED_FALLBACK_KEY,
  type SkippedVersionRecord,
  type UpdaterSkipReason,
  type UpdaterSkipStore,
} from './types'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function readFallback(storage: StorageLike | null): SkippedVersionRecord[] {
  if (!storage) {
    return []
  }

  try {
    const raw = storage.getItem(UPDATER_SKIPPED_FALLBACK_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((entry): entry is SkippedVersionRecord => (
      typeof entry === 'object'
      && entry !== null
      && typeof (entry as SkippedVersionRecord).version === 'string'
      && typeof (entry as SkippedVersionRecord).skippedAt === 'number'
    ))
  } catch {
    return []
  }
}

function writeFallback(storage: StorageLike | null, records: SkippedVersionRecord[]): void {
  if (!storage) {
    return
  }

  storage.setItem(UPDATER_SKIPPED_FALLBACK_KEY, JSON.stringify(records))
}

export class DexieUpdaterSkipStore implements UpdaterSkipStore {
  constructor(private readonly storage: StorageLike | null = typeof localStorage === 'undefined' ? null : localStorage) {}

  async list(): Promise<SkippedVersionRecord[]> {
    try {
      return await db.updaterSkipped.orderBy('skippedAt').reverse().toArray()
    } catch {
      return readFallback(this.storage)
    }
  }

  async isSkipped(version: string): Promise<boolean> {
    try {
      const record = await db.updaterSkipped.get(version)
      if (record) {
        return true
      }
    } catch {
      return readFallback(this.storage).some(entry => entry.version === version)
    }

    return readFallback(this.storage).some(entry => entry.version === version)
  }

  async skip(version: string, reason: UpdaterSkipReason = 'user', now = Date.now()): Promise<SkippedVersionRecord> {
    const record: SkippedVersionRecord = { version, skippedAt: now, reason }

    try {
      await db.updaterSkipped.put(record)
    } catch {
      const existing = readFallback(this.storage).filter(entry => entry.version !== version)
      writeFallback(this.storage, [record, ...existing])
    }

    return record
  }

  async clear(): Promise<void> {
    try {
      await db.updaterSkipped.clear()
    } catch {
      // Fall back below.
    }

    this.storage?.removeItem(UPDATER_SKIPPED_FALLBACK_KEY)
  }
}

export function createUpdaterSkipStore(storage?: StorageLike | null): UpdaterSkipStore {
  return new DexieUpdaterSkipStore(storage)
}
