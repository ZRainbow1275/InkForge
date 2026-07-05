import { describe, expect, it } from 'vitest'
import { detectDesktopRuntime, detectTauriRuntimeSignal, isDesktopRuntime } from './environment'

describe('desktop runtime environment detection', () => {
  it('detects web runtime when no Tauri globals are present', () => {
    const source = {}

    expect(detectTauriRuntimeSignal(source)).toBe('none')
    expect(detectDesktopRuntime(source)).toMatchObject({
      kind: 'web',
      signal: 'none',
    })
    expect(isDesktopRuntime(source)).toBe(false)
  })

  it('detects classic Tauri v1 and v2 global markers', () => {
    expect(detectTauriRuntimeSignal({ __TAURI__: {} })).toBe('tauri-v1')
    expect(detectDesktopRuntime({ __TAURI__: {} }).kind).toBe('tauri')
    expect(detectTauriRuntimeSignal({ __TAURI_INTERNALS__: {} })).toBe('tauri-v2-internals')
    expect(detectDesktopRuntime({ __TAURI_INTERNALS__: {} }).kind).toBe('tauri')
  })

  it('detects Tauri v1 IPC-only globals used when withGlobalTauri is disabled', () => {
    const ipcOnlySignals = [
      ['__TAURI_INVOKE__', 'tauri-v1-invoke'],
      ['__TAURI_IPC__', 'tauri-v1-ipc'],
      ['__TAURI_METADATA__', 'tauri-v1-metadata'],
      ['__TAURI_POST_MESSAGE__', 'tauri-v1-post-message'],
    ] as const

    for (const [globalName, expectedSignal] of ipcOnlySignals) {
      const source = { [globalName]: () => undefined }
      expect(detectTauriRuntimeSignal(source)).toBe(expectedSignal)
      expect(detectDesktopRuntime(source)).toMatchObject({
        kind: 'tauri',
        signal: expectedSignal,
      })
      expect(isDesktopRuntime(source)).toBe(true)
    }
  })
})
