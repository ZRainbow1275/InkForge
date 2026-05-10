export type DesktopRuntimeKind = 'tauri' | 'web'

export type DesktopRuntimeSignal = 'tauri-v1' | 'tauri-v2-internals' | 'none'

export type DesktopCapabilityId =
  | 'app-info'
  | 'window-management'
  | 'native-file-dialog'
  | 'file-reveal'
  | 'shell-open'
  | 'clipboard-text'
  | 'file-watch'
  | 'system-tray'
  | 'global-shortcut'
  | 'updater'
  | 'platform-auth'
  | 'package-signing'

export type DesktopCapabilityState = 'available' | 'degraded' | 'unavailable' | 'planned'

export interface DesktopRuntimeDetection {
  kind: DesktopRuntimeKind
  signal: DesktopRuntimeSignal
  isWebDev: boolean
}

export interface DesktopCapabilityStatus {
  id: DesktopCapabilityId
  label: string
  state: DesktopCapabilityState
  detail: string
}

export interface DesktopWindowInfo {
  label: string
  title?: string | null
}

export interface DesktopRuntimeInfo {
  productName: string
  version: string
  targetOs: string
  appDataDir: string | null
  windows: DesktopWindowInfo[]
}

export interface DesktopRuntimeSnapshot {
  runtime: DesktopRuntimeDetection
  app: {
    name: string
    version: string
    targetOs: string
    appDataDir: string | null
  }
  currentWindow: DesktopWindowInfo | null
  windows: DesktopWindowInfo[]
  capabilities: DesktopCapabilityStatus[]
  sampledAt: string
  note: string
}

export type DesktopCommandUnavailableReason = 'unavailable' | 'cancelled' | 'failed' | 'invalid-input'

export type DesktopCommandResult<T> =
  | { ok: true; value: T; source: DesktopRuntimeKind }
  | { ok: false; reason: DesktopCommandUnavailableReason; message: string; source: DesktopRuntimeKind }
