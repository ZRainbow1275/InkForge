import type { CommandHistoryEntry } from '@/types/command-palette'

const DB_NAME = 'inkforge-command-palette'
const DB_VERSION = 1
const STORE_NAME = 'kv'
const HISTORY_KEY = 'history'
const FAVORITES_KEY = 'favorites'
const MAX_HISTORY = 20

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined'
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  if (!hasIndexedDB()) {
    return Promise.reject(new Error('IndexedDB is unavailable'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open command palette database'))
  })
}

async function readKey<T>(key: string, fallback: T): Promise<T> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const value = await requestToPromise<T | undefined>(store.get(key))
    return value ?? fallback
  } finally {
    db.close()
  }
}

async function writeKey<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase()
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await requestToPromise(store.put(value, key))
  } finally {
    db.close()
  }
}

export class CommandPalettePersistence {
  async loadHistory(): Promise<CommandHistoryEntry[]> {
    try {
      const history = await readKey<CommandHistoryEntry[]>(HISTORY_KEY, [])
      return history
        .filter(entry => typeof entry.commandId === 'string' && Number.isFinite(entry.executedAt))
        .slice(-MAX_HISTORY)
    } catch {
      return []
    }
  }

  async saveHistory(entries: CommandHistoryEntry[]): Promise<void> {
    try {
      await writeKey(HISTORY_KEY, entries.slice(-MAX_HISTORY))
    } catch {
      // History persistence must never block command execution.
    }
  }

  async clearHistory(): Promise<void> {
    await this.saveHistory([])
  }

  async loadFavorites(): Promise<string[]> {
    try {
      const favorites = await readKey<string[]>(FAVORITES_KEY, [])
      return favorites.filter((id): id is string => typeof id === 'string')
    } catch {
      return []
    }
  }

  async saveFavorites(commandIds: string[]): Promise<void> {
    try {
      await writeKey(FAVORITES_KEY, Array.from(new Set(commandIds)))
    } catch {
      // Favorite persistence is best-effort; UI keeps in-memory state.
    }
  }
}
