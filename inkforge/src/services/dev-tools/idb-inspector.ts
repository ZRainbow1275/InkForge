import { db } from '@/utils/db'
import { sanitizeDevToolsValue } from './sanitizer'
import type { IndexedDbRowsResult, IndexedDbTableSummary } from './types'

const SENSITIVE_TABLES = new Set([
  'auditLogs',
  'activityLogs',
  'exportLogs',
  'recoveryPoints',
  'recovery_journal',
  'audit_logs',
])

export interface IndexedDbReadOptions {
  page?: number
  pageSize?: number
  search?: string
}

export function isSensitiveIndexedDbTable(tableName: string): boolean {
  return SENSITIVE_TABLES.has(tableName)
}

export function normalizeIndexedDbReadOptions(options: IndexedDbReadOptions = {}): Required<IndexedDbReadOptions> {
  return {
    page: Math.max(1, Math.trunc(options.page ?? 1)),
    pageSize: Math.min(100, Math.max(1, Math.trunc(options.pageSize ?? 50))),
    search: options.search?.trim() ?? '',
  }
}

export async function listIndexedDbTables(): Promise<IndexedDbTableSummary[]> {
  const summaries = await Promise.all(db.tables.map(async table => ({
    name: table.name,
    rowCount: await table.count(),
    primaryKey: table.schema.primKey.name || table.schema.primKey.keyPath?.toString() || 'inbound',
    indexes: table.schema.indexes.map(index => index.name || index.keyPath?.toString()).filter((value): value is string => Boolean(value)),
    sensitive: isSensitiveIndexedDbTable(table.name),
  })))
  return summaries.sort((left, right) => left.name.localeCompare(right.name))
}

export async function readIndexedDbRows(tableName: string, options: IndexedDbReadOptions = {}): Promise<IndexedDbRowsResult> {
  const table = db.tables.find(candidate => candidate.name === tableName)
  if (!table) {
    throw new Error(`IndexedDB table not found: ${tableName}`)
  }

  const normalized = normalizeIndexedDbReadOptions(options)
  const rows = await table.toArray()
  const filtered = normalized.search
    ? rows.filter(row => JSON.stringify(sanitizeDevToolsValue(row)).toLowerCase().includes(normalized.search.toLowerCase()))
    : rows
  const offset = (normalized.page - 1) * normalized.pageSize
  const summaries = await listIndexedDbTables()
  const summary = summaries.find(item => item.name === tableName)
  if (!summary) {
    throw new Error(`IndexedDB table summary unavailable: ${tableName}`)
  }

  return {
    table: summary,
    rows: filtered.slice(offset, offset + normalized.pageSize).map(row => sanitizeDevToolsValue(row)),
    page: normalized.page,
    pageSize: normalized.pageSize,
    totalRows: rows.length,
    filteredRows: filtered.length,
  }
}