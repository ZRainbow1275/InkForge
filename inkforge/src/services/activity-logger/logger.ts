import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'
import { redactDiagnosticPayload } from './redactor'
import { publishActivityLogRecord } from '@/services/dev-tools/events-bus'
import {
  ActivityLogRecordSchema,
  ExportLogRecordSchema,
  type ActivityLoggerContext,
  type ActivityLoggerOptions,
  type ActivityLogCleanupResult,
  type ActivityLogExportInput,
  type ActivityLogFlushResult,
  type ActivityLogLevel,
  type ActivityLogQuery,
  type ActivityLogRecord,
  type ActivityLogReplayResult,
  type ActivityLogWriteResult,
  type DiagnosticPayload,
  type DiagnosticsSummary,
  type ExportLogRecord,
  type LogModule,
} from './types'

const NORMAL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const CRITICAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const DEFAULT_BATCH_SIZE = 100
const DEFAULT_FLUSH_INTERVAL_MS = 1_000
const DEFAULT_TRACE_ENTRIES = 500
const FALLBACK_PREFIX = 'inkforge-activity-log-fallback:'
const CRITICAL_FALLBACK_PREFIX = 'inkforge-critical-log:'

function getStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage
  } catch {
    return null
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function shouldPersist(level: ActivityLogLevel): boolean {
  return level !== 'trace'
}

function normalizeLimit(limit?: number): number {
  if (limit === undefined) return 200
  return Math.min(Math.max(1, Math.floor(limit)), 5_000)
}

function serializeJsonLine(record: ActivityLogRecord): string {
  return JSON.stringify(record)
}

function buildFallbackKey(record: ActivityLogRecord, critical: boolean): string {
  const prefix = critical ? CRITICAL_FALLBACK_PREFIX : FALLBACK_PREFIX
  return `${prefix}${record.timestamp}:${record.id}`
}

function listFallbackKeys(storage: Storage): string[] {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && (key.startsWith(FALLBACK_PREFIX) || key.startsWith(CRITICAL_FALLBACK_PREFIX))) {
      keys.push(key)
    }
  }
  return keys
}

function parseFallbackRecord(raw: string): ActivityLogRecord {
  const parsed = JSON.parse(raw) as { record?: unknown }
  return ActivityLogRecordSchema.parse(parsed.record ?? parsed)
}

export class ActivityLogger {
  private readonly context: Required<Pick<ActivityLoggerContext, 'module' | 'scope' | 'profileId' | 'sessionId'>> &
    Omit<ActivityLoggerContext, 'module' | 'scope' | 'profileId' | 'sessionId'>

  private readonly batchSize: number
  private readonly flushIntervalMs: number
  private readonly maxTraceEntries: number
  private readonly autoFlush: boolean
  private readonly queue: ActivityLogRecord[] = []
  private readonly traceBuffer: ActivityLogRecord[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: ActivityLoggerOptions) {
    this.context = {
      module: options.module,
      scope: options.scope ?? 'profile',
      profileId: options.profileId ?? 'local-profile',
      sessionId: options.sessionId ?? generateId(),
      windowId: options.windowId,
      correlationId: options.correlationId,
      data: options.data,
    }
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS
    this.maxTraceEntries = options.maxTraceEntries ?? DEFAULT_TRACE_ENTRIES
    this.autoFlush = options.autoFlush ?? true
  }

  trace(event: string, data: DiagnosticPayload = {}): ActivityLogRecord {
    const record = this.buildRecord('trace', event, data)
    this.traceBuffer.push(record)
    if (this.traceBuffer.length > this.maxTraceEntries) {
      this.traceBuffer.splice(0, this.traceBuffer.length - this.maxTraceEntries)
    }
    publishActivityLogRecord(record)
    return record
  }

  info(event: string, data: DiagnosticPayload = {}): ActivityLogRecord {
    return this.enqueue(this.buildRecord('info', event, data))
  }

  warn(event: string, data: DiagnosticPayload = {}): ActivityLogRecord {
    return this.enqueue(this.buildRecord('warn', event, data))
  }

  error(event: string, data: DiagnosticPayload = {}, error?: Error): ActivityLogRecord {
    return this.enqueue(this.buildRecord('error', event, this.withErrorData(data, error), error))
  }

  async critical(event: string, data: DiagnosticPayload = {}, error?: Error): Promise<ActivityLogWriteResult> {
    const record = this.buildRecord('critical', event, this.withErrorData(data, error), error)
    publishActivityLogRecord(record)
    const fallbackKey = this.writeFallback(record, true)
    try {
      await db.activityLogs.add(record)
      return { record, persisted: true, fallbackKey }
    } catch (err) {
      return { record, persisted: false, fallbackKey, errorMessage: errorMessage(err) }
    }
  }

  withModule(module: LogModule): ActivityLogger {
    return new ActivityLogger({ ...this.context, module, batchSize: this.batchSize, flushIntervalMs: this.flushIntervalMs, maxTraceEntries: this.maxTraceEntries, autoFlush: this.autoFlush })
  }

  withCorrelation(correlationId: string): ActivityLogger {
    return new ActivityLogger({ ...this.context, correlationId, batchSize: this.batchSize, flushIntervalMs: this.flushIntervalMs, maxTraceEntries: this.maxTraceEntries, autoFlush: this.autoFlush })
  }

  child(context: Partial<ActivityLoggerContext> & { data?: DiagnosticPayload }): ActivityLogger {
    return new ActivityLogger({
      ...this.context,
      ...context,
      data: { ...(this.context.data ?? {}), ...(context.data ?? {}) },
      batchSize: this.batchSize,
      flushIntervalMs: this.flushIntervalMs,
      maxTraceEntries: this.maxTraceEntries,
      autoFlush: this.autoFlush,
    })
  }

  getTraceBuffer(): ActivityLogRecord[] {
    return [...this.traceBuffer]
  }

  getQueuedCount(): number {
    return this.queue.length
  }

  async flush(): Promise<ActivityLogFlushResult> {
    this.clearFlushTimer()
    const records = this.queue.splice(0, this.queue.length)
    if (records.length === 0) {
      return { attempted: 0, persisted: 0, fallback: 0, failed: 0 }
    }

    try {
      await db.activityLogs.bulkAdd(records)
      return { attempted: records.length, persisted: records.length, fallback: 0, failed: 0 }
    } catch (err) {
      let fallback = 0
      for (const record of records) {
        if (this.writeFallback(record, false)) fallback += 1
      }
      return {
        attempted: records.length,
        persisted: 0,
        fallback,
        failed: records.length - fallback,
        errorMessage: errorMessage(err),
      }
    }
  }

  async queryActivityLogs(query: ActivityLogQuery = {}): Promise<ActivityLogRecord[]> {
    const rows = await db.activityLogs.toArray()
    const limit = normalizeLimit(query.limit)
    return rows
      .map(row => ActivityLogRecordSchema.parse(row))
      .filter(record => this.matchesQuery(record, query))
      .sort((left, right) => right.timestamp - left.timestamp || right.createdAt - left.createdAt)
      .slice(0, limit)
  }

  async recordExportLog(input: ActivityLogExportInput): Promise<ExportLogRecord> {
    const now = input.now ?? Date.now()
    const record = ExportLogRecordSchema.parse({
      id: generateId(),
      schemaVersion: 1,
      timestamp: now,
      profileId: input.profileId,
      format: input.format,
      target: input.target,
      outcome: input.outcome,
      activityLogId: input.activityLogId,
      diagnosticPackageId: input.diagnosticPackageId,
      errorMessage: input.errorMessage,
      metadata: redactDiagnosticPayload(input.metadata ?? {}),
      createdAt: now,
    })
    await db.exportLogs.add(record)
    return record
  }

  async listExportLogs(profileId: string, limit = 100): Promise<ExportLogRecord[]> {
    const rows = await db.exportLogs.where('profileId').equals(profileId).toArray()
    return rows
      .map(row => ExportLogRecordSchema.parse(row))
      .sort((left, right) => right.timestamp - left.timestamp || right.createdAt - left.createdAt)
      .slice(0, normalizeLimit(limit))
  }

  async exportActivityLogsJsonl(query: ActivityLogQuery = {}): Promise<string> {
    const records = await this.queryActivityLogs(query)
    return records.map(serializeJsonLine).join('\n')
  }

  async cleanupExpired(now: number = Date.now(), maxDelete = 5_000): Promise<ActivityLogCleanupResult> {
    const cutoffNormal = now - NORMAL_RETENTION_MS
    const cutoffCritical = now - CRITICAL_RETENTION_MS
    const rows = await db.activityLogs.toArray()
    const staleIds = rows
      .map(row => ActivityLogRecordSchema.parse(row))
      .filter(record => {
        const cutoff = record.level === 'critical' ? cutoffCritical : cutoffNormal
        return shouldPersist(record.level) && record.timestamp < cutoff
      })
      .sort((left, right) => left.timestamp - right.timestamp)
      .slice(0, Math.max(1, maxDelete))
      .map(record => record.id)

    if (staleIds.length > 0) {
      await db.activityLogs.bulkDelete(staleIds)
    }

    return { deleted: staleIds.length, cutoffNormal, cutoffCritical }
  }

  async replayCriticalFallback(): Promise<ActivityLogReplayResult> {
    const storage = getStorage()
    if (!storage) return { scanned: 0, persisted: 0, removed: 0, failed: 0 }

    const keys = listFallbackKeys(storage)
    let persisted = 0
    let removed = 0
    let failed = 0

    for (const key of keys) {
      const raw = storage.getItem(key)
      if (!raw) continue
      try {
        const record = parseFallbackRecord(raw)
        await db.activityLogs.put(record)
        storage.removeItem(key)
        persisted += 1
        removed += 1
      } catch {
        failed += 1
      }
    }

    return { scanned: keys.length, persisted, removed, failed }
  }

  async buildSummary(profileId?: string): Promise<DiagnosticsSummary> {
    const [logs, exportRows] = await Promise.all([
      this.queryActivityLogs({ profileId, limit: 5_000 }),
      profileId ? this.listExportLogs(profileId, 5_000) : db.exportLogs.toArray(),
    ])

    return logs.reduce<DiagnosticsSummary>((summary, record) => {
      summary.total += 1
      summary.byLevel[record.level] += 1
      summary.byModule[record.module] = (summary.byModule[record.module] ?? 0) + 1
      summary.oldestTimestamp = summary.oldestTimestamp === null ? record.timestamp : Math.min(summary.oldestTimestamp, record.timestamp)
      summary.newestTimestamp = summary.newestTimestamp === null ? record.timestamp : Math.max(summary.newestTimestamp, record.timestamp)
      return summary
    }, {
      total: 0,
      byLevel: { trace: 0, info: 0, warn: 0, error: 0, critical: 0 },
      byModule: {},
      oldestTimestamp: null,
      newestTimestamp: null,
      queued: this.getQueuedCount(),
      traceBuffered: this.traceBuffer.length,
      exportLogCount: exportRows.length,
    })
  }

  private enqueue(record: ActivityLogRecord): ActivityLogRecord {
    this.queue.push(record)
    publishActivityLogRecord(record)
    if (this.queue.length >= this.batchSize) {
      void this.flush()
    } else if (this.autoFlush) {
      this.scheduleFlush()
    }
    return record
  }

  private buildRecord(level: ActivityLogLevel, event: string, data: DiagnosticPayload = {}, error?: Error): ActivityLogRecord {
    const now = Date.now()
    return ActivityLogRecordSchema.parse({
      id: generateId(),
      schemaVersion: 1,
      timestamp: now,
      level,
      module: this.context.module,
      event,
      data: redactDiagnosticPayload({ ...(this.context.data ?? {}), ...data }),
      scope: this.context.scope,
      profileId: this.context.profileId,
      windowId: this.context.windowId,
      sessionId: this.context.sessionId,
      correlationId: this.context.correlationId,
      stack: level === 'error' || level === 'critical' ? error?.stack : undefined,
      createdAt: now,
    })
  }

  private withErrorData(data: DiagnosticPayload, error?: Error): DiagnosticPayload {
    if (!error) return data
    return {
      ...data,
      errorName: error.name,
      errorMessage: error.message,
    }
  }

  private matchesQuery(record: ActivityLogRecord, query: ActivityLogQuery): boolean {
    if (query.profileId && record.profileId !== query.profileId) return false
    if (query.level && record.level !== query.level) return false
    if (query.module && record.module !== query.module) return false
    if (query.event && record.event !== query.event) return false
    if (query.from !== undefined && record.timestamp < query.from) return false
    if (query.to !== undefined && record.timestamp > query.to) return false
    return true
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      void this.flush()
    }, this.flushIntervalMs)
  }

  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }

  private writeFallback(record: ActivityLogRecord, critical: boolean): string | undefined {
    const storage = getStorage()
    if (!storage) return undefined
    const key = buildFallbackKey(record, critical)
    storage.setItem(key, JSON.stringify({ record, savedAt: Date.now(), critical }))
    return key
  }
}

export function createActivityLogger(options: ActivityLoggerOptions): ActivityLogger {
  return new ActivityLogger(options)
}

export const activityLogger = createActivityLogger({ module: 'system', scope: 'global', profileId: 'local-profile' })