import { afterEach, describe, expect, it, vi } from 'vitest'
import { readText as tauriReadText, writeText as tauriWriteText } from '@tauri-apps/api/clipboard'
import {
  buildDesktopCapabilityMatrix,
  pickNativeDirectory,
  readClipboardText,
  writeClipboardText,
} from './index'

vi.mock('@tauri-apps/api/clipboard', () => ({
  readText: vi.fn(),
  writeText: vi.fn(),
}))

afterEach(() => {
  vi.mocked(tauriReadText).mockReset()
  vi.mocked(tauriWriteText).mockReset()
  vi.unstubAllGlobals()
})

describe('desktop clipboard text boundary', () => {
  it('keeps clipboard-text capability honest across web and Tauri runtime matrices', () => {
    expect(buildDesktopCapabilityMatrix('tauri').find(capability => capability.id === 'clipboard-text'))
      .toMatchObject({
        state: 'available',
        detail: 'Tauri allowlist includes clipboard text access; rich clipboard remains future scope.',
      })

    expect(buildDesktopCapabilityMatrix('web').find(capability => capability.id === 'clipboard-text'))
      .toMatchObject({
        state: 'degraded',
        detail: 'Browser Clipboard API depends on secure context and user gesture.',
      })
  })

  it('writes and reads through the Tauri clipboard API when a real Tauri signal exists', async () => {
    vi.stubGlobal('window', { __TAURI_IPC__: () => undefined })
    vi.mocked(tauriWriteText).mockResolvedValueOnce(undefined)
    vi.mocked(tauriReadText).mockResolvedValueOnce('InkForge clipboard probe')

    await expect(writeClipboardText('InkForge clipboard probe')).resolves.toMatchObject({
      ok: true,
      source: 'tauri',
    })
    await expect(readClipboardText()).resolves.toMatchObject({
      ok: true,
      value: 'InkForge clipboard probe',
      source: 'tauri',
    })

    expect(tauriWriteText).toHaveBeenCalledWith('InkForge clipboard probe')
    expect(tauriReadText).toHaveBeenCalledTimes(1)
  })

  it('returns typed unavailable results in web runtime when Clipboard API is absent or insecure', async () => {
    vi.stubGlobal('window', { isSecureContext: false })
    vi.stubGlobal('navigator', {})

    await expect(writeClipboardText('text')).resolves.toMatchObject({
      ok: false,
      reason: 'unavailable',
      source: 'web',
    })
    await expect(readClipboardText()).resolves.toMatchObject({
      ok: false,
      reason: 'unavailable',
      source: 'web',
    })

    expect(tauriWriteText).not.toHaveBeenCalled()
    expect(tauriReadText).not.toHaveBeenCalled()
  })

  it('uses the browser Clipboard API as a degraded but real web boundary when available', async () => {
    const writeText = vi.fn(async (_text: string): Promise<void> => undefined)
    const readText = vi.fn(async (): Promise<string> => 'browser clipboard text')
    const clipboard: Pick<Clipboard, 'readText' | 'writeText'> = { readText, writeText }
    vi.stubGlobal('window', { isSecureContext: true })
    vi.stubGlobal('navigator', { clipboard })

    await expect(writeClipboardText('browser clipboard text')).resolves.toMatchObject({
      ok: true,
      source: 'web',
    })
    await expect(readClipboardText()).resolves.toMatchObject({
      ok: true,
      value: 'browser clipboard text',
      source: 'web',
    })

    expect(writeText).toHaveBeenCalledWith('browser clipboard text')
    expect(readText).toHaveBeenCalledTimes(1)
  })

  it('maps clipboard API failures to typed failed results without fake success', async () => {
    vi.stubGlobal('window', { __TAURI_IPC__: () => undefined })
    vi.mocked(tauriWriteText).mockRejectedValueOnce(new Error('clipboard locked'))
    vi.mocked(tauriReadText).mockRejectedValueOnce(new Error('clipboard unavailable'))

    await expect(writeClipboardText('text')).resolves.toMatchObject({
      ok: false,
      reason: 'failed',
      message: 'clipboard locked',
      source: 'tauri',
    })
    await expect(readClipboardText()).resolves.toMatchObject({
      ok: false,
      reason: 'failed',
      message: 'clipboard unavailable',
      source: 'tauri',
    })
  })
})

describe('desktop directory selection boundary', () => {
  it('fails closed without opening a native dialog in web runtime', async () => {
    vi.stubGlobal('window', { isSecureContext: true })

    await expect(pickNativeDirectory()).resolves.toMatchObject({
      ok: false,
      reason: 'unavailable',
      source: 'web',
    })
  })
})
