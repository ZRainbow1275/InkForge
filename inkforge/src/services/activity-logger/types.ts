import { z } from 'zod'

export const ACTIVITY_LOG_LEVEL_VALUES = ['trace', 'info', 'warn', 'error', 'critical'] as const
export const ACTIVITY_LOG_MODULE_VALUES = [
  'editor',
  'sync',
  'account',
  'export',
  'import',
  'ai',
  'asset',
  'command',
  'settings',
  'plugin',
  'performance',
  'diagnostics',
  'crash-recovery',
  'security',
  'review',
  'search',
  'updater',
  'system',
  'dev',
] as const
export const ACTIVITY_LOG_SCOPE_VALUES = ['profile', 'window', 'global'] as const
export const EXPORT_LOG_FORMAT_VALUES = ['jsonl', 'diagnostic-package', 'clipboard', 'file'] as const
export const EXPORT_LOG_OUTCOME_VALUES = ['success', 'failure'] as const
export const DIAGNOSTIC_ERROR_CATEGORY_VALUES = ['notice', 'recoverable', 'blocking', 'data-risk'] as const

export type ActivityLogLevel = typeof ACTIVITY_LOG_LEVEL_VALUES[number]
export type LogModule = typeof ACTIVITY_LOG_MODULE_VALUES[number]
export type ActivityLogScope = typeof ACTIVITY_LOG_SCOPE_VALUES[number]
export type ExportLogFormat = typeof EXPORT_LOG_FORMAT_VALUES[number]
export type ExportLogOutcome = typeof EXPORT_LOG_OUTCOME_VALUES[number]
export type DiagnosticErrorCategory = typeof DIAGNOSTIC_ERROR_CATEGORY_VALUES[number]
export type DiagnosticPayload = Record<string, unknown>

export const ActivityLogLevelSchema = z.enum(ACTIVITY_LOG_LEVEL_VALUES)
export const LogModuleSchema = z.enum(ACTIVITY_LOG_MODULE_VALUES)
export const ActivityLogScopeSchema = z.enum(ACTIVITY_LOG_SCOPE_VALUES)
export const ExportLogFormatSchema = z.enum(EXPORT_LOG_FORMAT_VALUES)
export const ExportLogOutcomeSchema = z.enum(EXPORT_LOG_OUTCOME_VALUES)
export const DiagnosticErrorCategorySchema = z.enum(DIAGNOSTIC_ERROR_CATEGORY_VALUES)

const TimestampMsSchema = z.number().int().nonnegative()
const NonEmptyStringSchema = z.string().min(1)
const PayloadSchema = z.record(z.string(), z.unknown())

export const ActivityLogRecordSchema = z.object({
  id: NonEmptyStringSchema,
  schemaVersion: z.literal(1),
  timestamp: TimestampMsSchema,
  level: ActivityLogLevelSchema,
  module: LogModuleSchema,
  event: NonEmptyStringSchema,
  data: PayloadSchema,
  scope: ActivityLogScopeSchema,
  profileId: NonEmptyStringSchema,
  windowId: z.string().min(1).optional(),
  sessionId: NonEmptyStringSchema,
  correlationId: z.string().min(1).optional(),
  stack: z.string().optional(),
  createdAt: TimestampMsSchema,
})

export type ActivityLogRecord = z.infer<typeof ActivityLogRecordSchema>

export const ExportLogRecordSchema = z.object({
  id: NonEmptyStringSchema,
  schemaVersion: z.literal(1),
  timestamp: TimestampMsSchema,
  profileId: NonEmptyStringSchema,
  format: ExportLogFormatSchema,
  target: NonEmptyStringSchema,
  outcome: ExportLogOutcomeSchema,
  activityLogId: z.string().min(1).optional(),
  diagnosticPackageId: z.string().min(1).optional(),
  errorMessage: z.string().optional(),
  metadata: PayloadSchema.optional(),
  createdAt: TimestampMsSchema,
})

export type ExportLogRecord = z.infer<typeof ExportLogRecordSchema>

export interface ActivityLoggerContext {
  module: LogModule
  scope?: ActivityLogScope
  profileId?: string
  windowId?: string
  sessionId?: string
  correlationId?: string
  data?: DiagnosticPayload
}

export interface ActivityLoggerOptions extends ActivityLoggerContext {
  batchSize?: number
  flushIntervalMs?: number
  maxTraceEntries?: number
  autoFlush?: boolean
}

export interface ActivityLogQuery {
  profileId?: string
  level?: ActivityLogLevel
  module?: LogModule
  event?: string
  from?: number
  to?: number
  limit?: number
}

export interface ActivityLogWriteResult {
  record: ActivityLogRecord
  persisted: boolean
  fallbackKey?: string
  errorMessage?: string
}

export interface ActivityLogFlushResult {
  attempted: number
  persisted: number
  fallback: number
  failed: number
  errorMessage?: string
}

export interface ActivityLogReplayResult {
  scanned: number
  persisted: number
  removed: number
  failed: number
}

export interface ActivityLogCleanupResult {
  deleted: number
  cutoffNormal: number
  cutoffCritical: number
}

export interface ActivityLogExportInput {
  profileId: string
  format: ExportLogFormat
  target: string
  outcome: ExportLogOutcome
  activityLogId?: string
  diagnosticPackageId?: string
  errorMessage?: string
  metadata?: DiagnosticPayload
  now?: number
}

export interface DiagnosticErrorClassification {
  category: DiagnosticErrorCategory
  reason: string
  code?: string
}

export interface DiagnosticsSummary {
  total: number
  byLevel: Record<ActivityLogLevel, number>
  byModule: Partial<Record<LogModule, number>>
  oldestTimestamp: number | null
  newestTimestamp: number | null
  queued: number
  traceBuffered: number
  exportLogCount: number
}