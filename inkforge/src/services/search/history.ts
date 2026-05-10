import type { SearchHistoryItem, SearchHistoryStorage } from './types'

const DEFAULT_HISTORY_LIMIT = 10
const DEFAULT_HISTORY_KEY = 'inkforge.search.history.v1'

class MemorySearchHistoryStorage implements SearchHistoryStorage {
  private values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

function createDefaultStorage(): SearchHistoryStorage {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return new MemorySearchHistoryStorage()
}

function parseHistory(value: string | null): SearchHistoryItem[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is SearchHistoryItem => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<SearchHistoryItem>
      return typeof candidate.query === 'string'
        && typeof candidate.timestamp === 'string'
        && typeof candidate.resultCount === 'number'
    })
  } catch {
    return []
  }
}

export class SearchHistoryRepository {
  constructor(
    private readonly storage: SearchHistoryStorage = createDefaultStorage(),
    private readonly key: string = DEFAULT_HISTORY_KEY,
    private readonly limit: number = DEFAULT_HISTORY_LIMIT,
  ) {}

  load(): SearchHistoryItem[] {
    return parseHistory(this.storage.getItem(this.key)).slice(0, this.limit)
  }

  record(query: string, resultCount: number, timestamp = new Date().toISOString()): SearchHistoryItem[] {
    const normalized = query.trim()
    if (!normalized) return this.load()

    const withoutDuplicate = this.load().filter(item => item.query !== normalized)
    const next = [{ query: normalized, timestamp, resultCount }, ...withoutDuplicate].slice(0, this.limit)
    this.storage.setItem(this.key, JSON.stringify(next))
    return next
  }

  clear(): void {
    this.storage.removeItem(this.key)
  }
}

export function createMemorySearchHistoryStorage(): SearchHistoryStorage {
  return new MemorySearchHistoryStorage()
}

