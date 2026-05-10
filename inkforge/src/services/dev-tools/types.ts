import type { ActivityLogLevel, ActivityLogRecord, LogModule } from '@/services/activity-logger/types'
import type { PerformanceDegradationEventRecord, PerformanceSampleRecord } from '@/services/performance/types'

export const DEV_PANEL_TAB_VALUES = [
  'editor',
  'prosemirror',
  'stores',
  'performance',
  'events',
  'indexeddb',
  'network',
] as const

export type DevPanelTabId = typeof DEV_PANEL_TAB_VALUES[number]
export type DevPanelActivationSource = 'settings' | 'triple-shortcut' | 'startup-flag' | 'command-palette' | 'keyboard' | 'ui'
export type DevToolsEventSource = 'activity-log' | 'editor' | 'command' | 'tauri-ipc' | 'network' | 'system'

export interface DevToolsEvent {
  id: string
  timestamp: number
  level: ActivityLogLevel
  module: LogModule
  event: string
  source: DevToolsEventSource
  summary: string
  data: Record<string, unknown>
  sampled?: boolean
}

export interface DevToolsEventBusSnapshot {
  events: DevToolsEvent[]
  accepted: number
  sampled: number
  dropped: number
}

export interface EditorSelectionSnapshot {
  from: number
  to: number
  anchor: number
  head: number
  empty: boolean
  fromParent: string
  toParent: string
}

export interface EditorScrollSnapshot {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

export interface TipTapEditorSnapshot {
  available: boolean
  articleId: string | null
  title: string | null
  jsonSizeBytes: number
  autoUpdateDisabled: boolean
  doc: unknown
  activeMarks: Array<{ name: string; attrs: Record<string, unknown> }>
  selection: EditorSelectionSnapshot | null
  scroll: EditorScrollSnapshot | null
  characters: number
  words: number
  updatedAt: number
}

export interface ProseMirrorPluginSnapshot {
  key: string
  props: string[]
  state: unknown
  stateReadable: boolean
}

export interface ProseMirrorTransactionSnapshot {
  id: string
  timestamp: number
  docChanged: boolean
  selectionSet: boolean
  stepCount: number
  beforeSize: number | null
  afterSize: number | null
}

export interface ProseMirrorSnapshot {
  available: boolean
  doc: unknown
  plugins: ProseMirrorPluginSnapshot[]
  transactions: ProseMirrorTransactionSnapshot[]
  updatedAt: number
}

export interface StoreInspectorEntry {
  id: string
  keys: string[]
  primitiveCount: number
  state: unknown
}

export interface StorePatchResult {
  storeId: string
  path: string
  oldValue: string | number | boolean | null
  newValue: string | number | boolean | null
  patchedAt: number
}

export interface IndexedDbTableSummary {
  name: string
  rowCount: number
  primaryKey: string
  indexes: string[]
  sensitive: boolean
}

export interface IndexedDbRowsResult {
  table: IndexedDbTableSummary
  rows: unknown[]
  page: number
  pageSize: number
  totalRows: number
  filteredRows: number
}

export type NetworkDiagnosticKind = 'fetch' | 'tauri-invoke' | 'websocket'
export type NetworkDiagnosticStatus = 'success' | 'error' | 'pending'

export interface NetworkDiagnosticEntry {
  id: string
  kind: NetworkDiagnosticKind
  method: string
  url: string
  status: NetworkDiagnosticStatus
  statusCode: number | null
  durationMs: number
  requestBytes: number | null
  responseBytes: number | null
  errorMessage: string | null
  startedAt: number
  finishedAt: number
  metadata: Record<string, unknown>
}

export interface NetworkDiagnosticsSnapshot {
  entries: NetworkDiagnosticEntry[]
  capacity: number
  redactionVersion: 1
}

export interface DevPanelPerformanceSnapshot {
  samples: PerformanceSampleRecord[]
  events: PerformanceDegradationEventRecord[]
  collectedAt: number
}

export function activityLogToDevToolsEvent(record: ActivityLogRecord): DevToolsEvent {
  return {
    id: record.id,
    timestamp: record.timestamp,
    level: record.level,
    module: record.module,
    event: record.event,
    source: 'activity-log',
    summary: `${record.module}.${record.event}`,
    data: record.data,
  }
}