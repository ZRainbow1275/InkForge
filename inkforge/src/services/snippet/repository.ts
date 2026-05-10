import type { Table } from 'dexie'
import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'
import { CreateSnippetInputSchema, SnippetRecordSchema, SNIPPET_SCHEMA_VERSION, type CreateSnippetInput, type NormalizedCreateSnippetInput, type SnippetRecord, type UpdateSnippetInput } from './types'

function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map(tag => tag.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function normalizeCreateInput(input: CreateSnippetInput): NormalizedCreateSnippetInput {
  const parsed = CreateSnippetInputSchema.parse(input)
  return {
    ...parsed,
    description: parsed.description ?? '',
    icon: parsed.icon ?? null,
    tags: normalizeTags(parsed.tags),
  }
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function sortSnippets(records: SnippetRecord[]): SnippetRecord[] {
  return [...records].sort((a, b) => {
    const usedDelta = (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)
    if (usedDelta !== 0) return usedDelta
    const usageDelta = b.usageCount - a.usageCount
    if (usageDelta !== 0) return usageDelta
    return b.updatedAt - a.updatedAt || a.name.localeCompare(b.name)
  })
}

export class SnippetRepository {
  constructor(private readonly table: Table<SnippetRecord, string> = db.snippets) {}

  async list(): Promise<SnippetRecord[]> {
    return sortSnippets(await this.table.toArray())
  }

  async getById(id: string): Promise<SnippetRecord | undefined> {
    return await this.table.get(id)
  }

  async create(input: CreateSnippetInput, now = Date.now()): Promise<SnippetRecord> {
    const normalized = normalizeCreateInput(input)
    const record = SnippetRecordSchema.parse({
      ...normalized,
      id: generateId(),
      schemaVersion: SNIPPET_SCHEMA_VERSION,
      scopeType: normalized.scope.type,
      tags: normalizeTags(normalized.tags),
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
    })
    await this.table.put(record)
    return record
  }

  async put(record: SnippetRecord): Promise<SnippetRecord> {
    const parsed = SnippetRecordSchema.parse({ ...record, tags: normalizeTags(record.tags), scopeType: record.scope.type })
    await this.table.put(parsed)
    return parsed
  }

  async update(id: string, patch: UpdateSnippetInput, now = Date.now()): Promise<SnippetRecord> {
    const existing = await this.table.get(id)
    if (!existing) {
      throw new Error(`Snippet not found: ${id}`)
    }
    const next = SnippetRecordSchema.parse({
      ...existing,
      ...patch,
      description: patch.description ?? existing.description,
      icon: patch.icon === undefined ? existing.icon : patch.icon,
      tags: normalizeTags(patch.tags ?? existing.tags),
      scope: patch.scope ?? existing.scope,
      scopeType: (patch.scope ?? existing.scope).type,
      updatedAt: now,
    })
    await this.table.put(next)
    return next
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id)
  }

  async search(query: string): Promise<SnippetRecord[]> {
    const normalized = normalizeSearch(query)
    if (!normalized) return await this.list()
    const records = await this.table.toArray()
    return sortSnippets(records.filter(record => {
      const haystack = [record.name, record.description, record.trigger, record.content, ...record.tags].join('\n').toLocaleLowerCase()
      return haystack.includes(normalized)
    }))
  }

  async recordUsage(id: string, now = Date.now()): Promise<SnippetRecord> {
    const existing = await this.table.get(id)
    if (!existing) {
      throw new Error(`Snippet not found: ${id}`)
    }
    const next = SnippetRecordSchema.parse({
      ...existing,
      usageCount: existing.usageCount + 1,
      lastUsedAt: now,
      updatedAt: now,
    })
    await this.table.put(next)
    return next
  }

  async replaceAll(records: SnippetRecord[]): Promise<void> {
    await this.table.clear()
    if (records.length > 0) {
      await this.table.bulkPut(records.map(record => SnippetRecordSchema.parse({ ...record, scopeType: record.scope.type, tags: normalizeTags(record.tags) })))
    }
  }

  async count(): Promise<number> {
    return await this.table.count()
  }
}

export const snippetRepository = new SnippetRepository()
