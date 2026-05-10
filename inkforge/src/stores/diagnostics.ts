import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  activityLogger,
  type ActivityLogCleanupResult,
  type ActivityLogExportInput,
  type ActivityLogFlushResult,
  type ActivityLogQuery,
  type ActivityLogRecord,
  type ActivityLogReplayResult,
  type DiagnosticsSummary,
  type ExportLogRecord,
} from '@/services/activity-logger'

interface DiagnosticsActionState {
  kind: 'load' | 'flush' | 'cleanup' | 'export' | 'replay'
  affectedCount: number
  at: number
  message: string
}

function emptySummary(): DiagnosticsSummary {
  return {
    total: 0,
    byLevel: { trace: 0, info: 0, warn: 0, error: 0, critical: 0 },
    byModule: {},
    oldestTimestamp: null,
    newestTimestamp: null,
    queued: activityLogger.getQueuedCount(),
    traceBuffered: activityLogger.getTraceBuffer().length,
    exportLogCount: 0,
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const useDiagnosticsStore = defineStore('diagnostics', () => {
  const logs = ref<ActivityLogRecord[]>([])
  const exportLogs = ref<ExportLogRecord[]>([])
  const summary = ref<DiagnosticsSummary>(emptySummary())
  const activeProfileId = ref<string | null>(null)
  const isLoading = ref(false)
  const isFlushing = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)
  const lastAction = ref<DiagnosticsActionState | null>(null)

  const criticalCount = computed(() => summary.value.byLevel.critical)
  const hasDiagnostics = computed(() => logs.value.length > 0 || exportLogs.value.length > 0 || summary.value.traceBuffered > 0)

  async function refreshSummary(profileId?: string): Promise<void> {
    summary.value = await activityLogger.buildSummary(profileId)
  }

  async function loadLogs(query: ActivityLogQuery = {}): Promise<ActivityLogRecord[]> {
    isLoading.value = true
    error.value = null
    try {
      activeProfileId.value = query.profileId ?? activeProfileId.value
      const rows = await activityLogger.queryActivityLogs(query)
      logs.value = rows
      await refreshSummary(query.profileId ?? activeProfileId.value ?? undefined)
      lastAction.value = { kind: 'load', affectedCount: rows.length, at: Date.now(), message: `Loaded ${rows.length} diagnostic activity logs` }
      return rows
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loadExportLogs(profileId: string, limit = 100): Promise<ExportLogRecord[]> {
    isLoading.value = true
    error.value = null
    try {
      activeProfileId.value = profileId
      const rows = await activityLogger.listExportLogs(profileId, limit)
      exportLogs.value = rows
      await refreshSummary(profileId)
      lastAction.value = { kind: 'load', affectedCount: rows.length, at: Date.now(), message: `Loaded ${rows.length} diagnostic export logs` }
      return rows
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function flush(): Promise<ActivityLogFlushResult> {
    isFlushing.value = true
    error.value = null
    try {
      const result = await activityLogger.flush()
      await refreshSummary(activeProfileId.value ?? undefined)
      lastAction.value = { kind: 'flush', affectedCount: result.persisted + result.fallback, at: Date.now(), message: `Flushed ${result.persisted} diagnostic logs with ${result.fallback} fallback records` }
      return result
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isFlushing.value = false
    }
  }

  async function cleanupExpired(now: number = Date.now()): Promise<ActivityLogCleanupResult> {
    isMutating.value = true
    error.value = null
    try {
      const result = await activityLogger.cleanupExpired(now)
      await loadLogs({ profileId: activeProfileId.value ?? undefined })
      lastAction.value = { kind: 'cleanup', affectedCount: result.deleted, at: Date.now(), message: `Deleted ${result.deleted} expired diagnostic logs` }
      return result
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  async function replayCriticalFallback(): Promise<ActivityLogReplayResult> {
    isMutating.value = true
    error.value = null
    try {
      const result = await activityLogger.replayCriticalFallback()
      await refreshSummary(activeProfileId.value ?? undefined)
      lastAction.value = { kind: 'replay', affectedCount: result.persisted, at: Date.now(), message: `Replayed ${result.persisted} diagnostic fallback records` }
      return result
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  async function recordExportLog(input: ActivityLogExportInput): Promise<ExportLogRecord> {
    isMutating.value = true
    error.value = null
    try {
      const record = await activityLogger.recordExportLog(input)
      exportLogs.value = [record, ...exportLogs.value]
      await refreshSummary(input.profileId)
      lastAction.value = { kind: 'export', affectedCount: 1, at: Date.now(), message: `Recorded diagnostic export ${record.outcome}` }
      return record
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  async function exportJsonl(query: ActivityLogQuery, exportInput?: Omit<ActivityLogExportInput, 'format' | 'outcome'> & { outcome?: ActivityLogExportInput['outcome'] }): Promise<string> {
    isMutating.value = true
    error.value = null
    try {
      const jsonl = await activityLogger.exportActivityLogsJsonl(query)
      if (exportInput) {
        const record = await activityLogger.recordExportLog({
          ...exportInput,
          format: 'jsonl',
          outcome: exportInput.outcome ?? 'success',
          metadata: { ...(exportInput.metadata ?? {}), bytes: jsonl.length, query },
        })
        exportLogs.value = [record, ...exportLogs.value]
      }
      await refreshSummary(query.profileId ?? activeProfileId.value ?? undefined)
      lastAction.value = { kind: 'export', affectedCount: jsonl.length, at: Date.now(), message: `Exported ${jsonl.length} bytes of diagnostic JSONL` }
      return jsonl
    } catch (err) {
      error.value = messageOf(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  return {
    logs,
    exportLogs,
    summary,
    activeProfileId,
    isLoading,
    isFlushing,
    isMutating,
    error,
    lastAction,
    criticalCount,
    hasDiagnostics,
    loadLogs,
    loadExportLogs,
    flush,
    cleanupExpired,
    replayCriticalFallback,
    recordExportLog,
    exportJsonl,
  }
})