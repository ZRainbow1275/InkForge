import type { DesktopRuntimeDetection, DesktopRuntimeSignal } from './types'

type TauriProbe = Record<string, unknown>

function asProbe(source: unknown): TauriProbe | null {
  if (typeof source !== 'object' || source === null) {
    return null
  }
  return source as TauriProbe
}

export function detectTauriRuntimeSignal(source: unknown = typeof window !== 'undefined' ? window : undefined): DesktopRuntimeSignal {
  const probe = asProbe(source)
  if (!probe) {
    return 'none'
  }

  if (probe.__TAURI__ !== undefined) {
    return 'tauri-v1'
  }

  if (probe.__TAURI_INTERNALS__ !== undefined) {
    return 'tauri-v2-internals'
  }

  if (probe.__TAURI_INVOKE__ !== undefined) {
    return 'tauri-v1-invoke'
  }

  if (probe.__TAURI_IPC__ !== undefined) {
    return 'tauri-v1-ipc'
  }

  if (probe.__TAURI_METADATA__ !== undefined) {
    return 'tauri-v1-metadata'
  }

  if (probe.__TAURI_POST_MESSAGE__ !== undefined) {
    return 'tauri-v1-post-message'
  }

  return 'none'
}

export function detectDesktopRuntime(source?: unknown): DesktopRuntimeDetection {
  const signal = detectTauriRuntimeSignal(source)

  return {
    kind: signal === 'none' ? 'web' : 'tauri',
    signal,
    isWebDev: signal === 'none' && Boolean(import.meta.env.DEV),
  }
}

export function isDesktopRuntime(source?: unknown): boolean {
  return detectDesktopRuntime(source).kind === 'tauri'
}
