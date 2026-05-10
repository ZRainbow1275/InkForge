import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AppError, ErrorCode } from '@/services/error'
import { db } from '@/utils/db'
import { useDiagnosticsStore } from '@/stores/diagnostics'
import { ActivityLogger, createActivityLogger, redactDiagnosticPayload, classifyDiagnosticError } from './index'
import type { ActivityLogRecord, ExportLogRecord } from './types'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

function createWhereResult<T>(records: T[]) {
  return {
    equals: () => ({
      toArray: async () => records,
    }),
  } as unknown as ReturnType<typeof db.exportLogs.where>
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createMemoryStorage())
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('diagnostic redaction and classification', () => {
  it('redacts sensitive fields recursively before persistence', () => {
    const redacted = redactDiagnosticPayload({
      token: 'secret-token',
      nested: { password: 'pw', safe: 'kept' },
      markdownSource: '# private draft',
      visible: 'x'.repeat(2_050),
    })

    expect(redacted.token).toBe('[REDACTED]')
    expect((redacted.nested as Record<string, unknown>).password).toBe('[REDACTED]')
    expect((redacted.nested as Record<string, unknown>).safe).toBe('kept')
    expect(redacted.markdownSource).toBe('[REDACTED]')
    expect(String(redacted.visible)).toContain('[TRUNCATED:2050]')
  })

  it('classifies known and unknown errors into safe diagnostic categories', () => {
    expect(classifyDiagnosticError(new AppError(ErrorCode.DB_WRITE_FAILED, 'write failed')).category).toBe('blocking')
    expect(classifyDiagnosticError(new Error('hash chain integrity mismatch')).category).toBe('data-risk')
    expect(classifyDiagnosticError(new Error('network timeout, retry later')).category).toBe('recoverable')
    expect(classifyDiagnosticError(new Error('unclassified')).category).toBe('blocking')
  })
})

describe('ActivityLogger persistence', () => {
  it('keeps trace logs memory-only and never writes them during flush', async () => {
    const bulkAdd = vi.spyOn(db.activityLogs, 'bulkAdd').mockResolvedValue([] as never)
    const logger = createActivityLogger({ module: 'editor', profileId: 'profile-1', autoFlush: false })

    const trace = logger.trace('editor.input', { rawContent: 'draft text' })
    const result = await logger.flush()

    expect(trace.level).toBe('trace')
    expect(logger.getTraceBuffer()).toHaveLength(1)
    expect(trace.data.rawContent).toBe('[REDACTED]')
    expect(result.attempted).toBe(0)
    expect(bulkAdd).not.toHaveBeenCalled()
  })

  it('flushes info/warn/error records in one bulk write with redacted payloads', async () => {
    const persisted: ActivityLogRecord[] = []
    vi.spyOn(db.activityLogs, 'bulkAdd').mockImplementation(((records: readonly ActivityLogRecord[]) => {
      persisted.push(...records)
      return Promise.resolve(records.map(record => record.id))
    }) as never)
    const logger = createActivityLogger({ module: 'sync', profileId: 'profile-1', autoFlush: false })

    logger.info('sync.queue.created', { count: 2 })
    logger.warn('sync.retry', { authorization: 'Bearer secret' })
    logger.error('sync.push.fail', { articleId: 'a1' }, new Error('network timeout'))
    const result = await logger.flush()

    expect(result.persisted).toBe(3)
    expect(persisted).toHaveLength(3)
    expect(persisted[1].data.authorization).toBe('[REDACTED]')
    expect(persisted[2].stack).toBeDefined()
  })

  it('writes critical logs immediately and leaves replayable fallback evidence', async () => {
    const persisted: ActivityLogRecord[] = []
    vi.spyOn(db.activityLogs, 'add').mockImplementation(((record: ActivityLogRecord) => {
      persisted.push(record)
      return Promise.resolve(record.id)
    }) as never)
    vi.spyOn(db.activityLogs, 'put').mockImplementation(((record: ActivityLogRecord) => {
      persisted.push(record)
      return Promise.resolve(record.id)
    }) as never)
    const logger = createActivityLogger({ module: 'diagnostics', profileId: 'profile-1', autoFlush: false })

    const result = await logger.critical('diagnostics.db.corrupt', { cookie: 'sensitive' }, new Error('hash corrupt'))
    const fallbackKey = result.fallbackKey ?? ''

    expect(result.persisted).toBe(true)
    expect(fallbackKey.startsWith('inkforge-critical-log:')).toBe(true)
    expect(localStorage.getItem(fallbackKey)).toContain('diagnostics.db.corrupt')
    expect(result.record.data.cookie).toBe('[REDACTED]')

    const replay = await logger.replayCriticalFallback()
    expect(replay.persisted).toBe(1)
    expect(replay.removed).toBe(1)
    expect(localStorage.getItem(fallbackKey)).toBeNull()
  })

  it('falls back to localStorage when bulk IndexedDB persistence fails', async () => {
    vi.spyOn(db.activityLogs, 'bulkAdd').mockRejectedValue(new Error('QuotaExceededError'))
    const logger = createActivityLogger({ module: 'asset', profileId: 'profile-1', autoFlush: false })

    logger.info('asset.cache.write', { assetId: 'asset-1' })
    const result = await logger.flush()

    expect(result.persisted).toBe(0)
    expect(result.fallback).toBe(1)
    expect(localStorage.length).toBe(1)
    expect(localStorage.key(0)?.startsWith('inkforge-activity-log-fallback:')).toBe(true)
  })

  it('cleans normal logs after 7 days while preserving critical logs until 30 days', async () => {
    const now = Date.now()
    const oldInfo = new ActivityLogger({ module: 'system', profileId: 'profile-1', autoFlush: false }).info('system.old', { value: 1 })
    const recentInfo = { ...oldInfo, id: 'recent-info', timestamp: now - 1_000, createdAt: now - 1_000 }
    const oldCritical = { ...oldInfo, id: 'old-critical', level: 'critical' as const, timestamp: now - 31 * 24 * 60 * 60 * 1000, createdAt: now - 31 * 24 * 60 * 60 * 1000 }
    const retainedCritical = { ...oldInfo, id: 'retained-critical', level: 'critical' as const, timestamp: now - 10 * 24 * 60 * 60 * 1000, createdAt: now - 10 * 24 * 60 * 60 * 1000 }
    const deleted: string[] = []
    vi.spyOn(db.activityLogs, 'toArray').mockResolvedValue([
      { ...oldInfo, timestamp: now - 8 * 24 * 60 * 60 * 1000, createdAt: now - 8 * 24 * 60 * 60 * 1000 },
      recentInfo,
      oldCritical,
      retainedCritical,
    ])
    vi.spyOn(db.activityLogs, 'bulkDelete').mockImplementation(((keys: string[]) => {
      deleted.push(...keys)
      return Promise.resolve()
    }) as never)
    const logger = createActivityLogger({ module: 'system', profileId: 'profile-1', autoFlush: false })

    const result = await logger.cleanupExpired(now)

    expect(result.deleted).toBe(2)
    expect(deleted).toContain(oldInfo.id)
    expect(deleted).toContain('old-critical')
    expect(deleted).not.toContain('retained-critical')
    expect(deleted).not.toContain('recent-info')
  })

  it('records export logs and exports queried activity logs as JSONL', async () => {
    const logs: ActivityLogRecord[] = []
    const exportRows: ExportLogRecord[] = []
    vi.spyOn(db.activityLogs, 'toArray').mockResolvedValue(logs)
    vi.spyOn(db.exportLogs, 'add').mockImplementation(((record: ExportLogRecord) => {
      exportRows.push(record)
      return Promise.resolve(record.id)
    }) as never)
    const logger = createActivityLogger({ module: 'export', profileId: 'profile-1', autoFlush: false })
    logs.push(logger.info('export.started', { target: 'jsonl' }))

    const jsonl = await logger.exportActivityLogsJsonl({ profileId: 'profile-1' })
    const exportLog = await logger.recordExportLog({ profileId: 'profile-1', format: 'jsonl', target: 'download', outcome: 'success', metadata: { token: 'secret' } })

    expect(jsonl).toContain('export.started')
    expect(exportLog.metadata?.token).toBe('[REDACTED]')
    expect(exportRows).toHaveLength(1)
  })
})

describe('diagnostics store', () => {
  it('exposes real async loading, flush, export, and error state', async () => {
    const logs: ActivityLogRecord[] = []
    const exportRows: ExportLogRecord[] = []
    vi.spyOn(db.activityLogs, 'toArray').mockResolvedValue(logs)
    vi.spyOn(db.activityLogs, 'bulkAdd').mockImplementation(((records: readonly ActivityLogRecord[]) => {
      logs.push(...records)
      return Promise.resolve(records.map(record => record.id))
    }) as never)
    vi.spyOn(db.exportLogs, 'where').mockReturnValue(createWhereResult(exportRows) as never)
    vi.spyOn(db.exportLogs, 'toArray').mockResolvedValue(exportRows)
    vi.spyOn(db.exportLogs, 'add').mockImplementation(((record: ExportLogRecord) => {
      exportRows.push(record)
      return Promise.resolve(record.id)
    }) as never)

    const logger = createActivityLogger({ module: 'settings', profileId: 'profile-1', autoFlush: false })
    logger.info('settings.open', { tab: 'advanced' })
    await logger.flush()

    const store = useDiagnosticsStore()
    const loaded = await store.loadLogs({ profileId: 'profile-1' })
    const jsonl = await store.exportJsonl({ profileId: 'profile-1' }, { profileId: 'profile-1', target: 'unit-test' })

    expect(loaded).toHaveLength(1)
    expect(store.summary.total).toBe(1)
    expect(store.hasDiagnostics).toBe(true)
    expect(jsonl).toContain('settings.open')
    expect(store.exportLogs).toHaveLength(1)
    expect(store.error).toBeNull()
  })
})