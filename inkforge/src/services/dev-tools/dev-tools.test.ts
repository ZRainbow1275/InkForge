import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { DevPanelKeyChordActivator, resolveDevPanelStartupSignal } from './activation'
import { DevToolsRingBuffer } from './events-bus'
import { normalizeIndexedDbReadOptions, isSensitiveIndexedDbTable } from './idb-inspector'
import { createLoggedFetch, clearNetworkDiagnostics, redactUrl, snapshotNetworkDiagnostics } from './net-inspector'
import { STORE_PATCH_CONFIRMATION, patchPiniaStorePrimitive } from './store-inspector'

function createShortcutEvent(): KeyboardEvent {
  return {
    ctrlKey: true,
    metaKey: false,
    shiftKey: true,
    key: 'D',
    isComposing: false,
    defaultPrevented: false,
    target: null,
  } as KeyboardEvent
}

beforeEach(() => {
  setActivePinia(createPinia())
  clearNetworkDiagnostics()
  vi.stubGlobal('HTMLElement', class HTMLElement {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('DevPanel activation helpers', () => {
  it('requires three Ctrl+Shift+D presses inside the 500ms activation window', () => {
    const activator = new DevPanelKeyChordActivator()

    expect(activator.record(createShortcutEvent(), 1_000)).toBe(false)
    expect(activator.record(createShortcutEvent(), 1_200)).toBe(false)
    expect(activator.record(createShortcutEvent(), 1_420)).toBe(true)
    expect(activator.record(createShortcutEvent(), 1_430)).toBe(false)
  })

  it('does not activate when the triple press window expires', () => {
    const activator = new DevPanelKeyChordActivator()

    expect(activator.record(createShortcutEvent(), 1_000)).toBe(false)
    expect(activator.record(createShortcutEvent(), 1_300)).toBe(false)
    expect(activator.record(createShortcutEvent(), 1_801)).toBe(false)
  })

  it('accepts query and global startup signals without enabling normal startup', () => {
    expect(resolveDevPanelStartupSignal({ search: '' }, {})).toBe(false)
    expect(resolveDevPanelStartupSignal({ search: '?dev-panel=1' }, {})).toBe(true)
    expect(resolveDevPanelStartupSignal({ search: '?devPanel=1' }, {})).toBe(true)
    expect(resolveDevPanelStartupSignal({ search: '' }, { __INKFORGE_DEV_PANEL_ARGV__: true })).toBe(true)
  })
})

describe('DevPanel bounded diagnostics', () => {
  it('keeps ring buffers bounded and ordered by insertion', () => {
    const buffer = new DevToolsRingBuffer<number>(3)
    buffer.push(1)
    buffer.push(2)
    buffer.push(3)
    buffer.push(4)

    expect(buffer.snapshot()).toEqual([2, 3, 4])
    expect(buffer.size).toBe(3)
  })

  it('redacts URL secrets and records fetch diagnostics without body capture', async () => {
    const fetchImpl: typeof fetch = async () => new Response('ok', {
      status: 200,
      headers: { 'content-length': '2' },
    })
    const loggedFetch = createLoggedFetch(fetchImpl)

    expect(redactUrl('https://example.test/path?token=secret&safe=1')).not.toContain('secret')

    const response = await loggedFetch('https://example.test/api?token=secret&safe=1', {
      method: 'POST',
      body: 'real-body',
    })

    expect(response.status).toBe(200)
    const [entry] = snapshotNetworkDiagnostics().entries
    expect(entry.url).toContain('REDACTED')
    expect(entry.url).not.toContain('secret')
    expect(entry.requestBytes).toBe(9)
    expect(entry.responseBytes).toBe(2)
    expect(entry.metadata).toEqual({ ok: true, redirected: false, type: 'default' })
  })
})

describe('DevPanel IndexedDB guardrails', () => {
  it('clamps paged read options and marks sensitive tables read-only', () => {
    expect(normalizeIndexedDbReadOptions({ page: -5, pageSize: 10_000, search: '  title  ' })).toEqual({
      page: 1,
      pageSize: 100,
      search: 'title',
    })
    expect(isSensitiveIndexedDbTable('activityLogs')).toBe(true)
    expect(isSensitiveIndexedDbTable('articles')).toBe(false)
  })
})

describe('DevPanel Pinia store patching', () => {
  const useTargetStore = defineStore('dev-panel-test-store', {
    state: () => ({
      count: 1,
      title: 'Original',
      nested: { immutable: { child: true } },
    }),
  })

  it('requires explicit confirmation and only patches primitive leaves', () => {
    const targetStore = useTargetStore()

    expect(() => patchPiniaStorePrimitive({
      storeId: 'dev-panel-test-store',
      path: 'count',
      nextValue: '2',
      confirmation: 'NO',
    })).toThrow('confirmation')

    const result = patchPiniaStorePrimitive({
      storeId: 'dev-panel-test-store',
      path: 'count',
      nextValue: '2',
      confirmation: STORE_PATCH_CONFIRMATION,
    })

    expect(result.oldValue).toBe(1)
    expect(result.newValue).toBe(2)
    expect(targetStore.count).toBe(2)
    expect(() => patchPiniaStorePrimitive({
      storeId: 'dev-panel-test-store',
      path: 'nested',
      nextValue: 'blocked',
      confirmation: STORE_PATCH_CONFIRMATION,
    })).toThrow('Only primitive')
  })
})