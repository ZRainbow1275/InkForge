import { DevToolsRingBuffer } from './events-bus'
import { sanitizeDevToolsValue } from './sanitizer'
import type { NetworkDiagnosticEntry, NetworkDiagnosticsSnapshot } from './types'

const NETWORK_BUFFER_CAPACITY = 500
const REDACTED = '[REDACTED]'
const SECRET_QUERY_PATTERN = /(token|secret|password|api[-_]?key|authorization|auth|code|session|refresh|access)/i
const networkBuffer = new DevToolsRingBuffer<NetworkDiagnosticEntry>(NETWORK_BUFFER_CAPACITY)
let originalFetch: typeof fetch | null = null

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()
}

function epochNow(): number {
  return Date.now()
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase()
  if (input instanceof Request) return input.method.toUpperCase()
  return 'GET'
}

function requestUrl(input: RequestInfo | URL): string {
  if (input instanceof Request) return input.url
  return String(input)
}

export function redactUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl, typeof window === 'undefined' ? 'http://localhost' : window.location.href)
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_QUERY_PATTERN.test(key)) {
        url.searchParams.set(key, REDACTED)
      }
    }
    if (url.username) url.username = REDACTED
    if (url.password) url.password = REDACTED
    return url.toString()
  } catch {
    return rawUrl.replace(/([?&][^=]*(?:token|secret|password|key|auth|code)[^=]*=)[^&]+/gi, `$1${REDACTED}`)
  }
}

function estimateRequestBytes(init?: RequestInit): number | null {
  const body = init?.body
  if (!body) return null
  if (typeof body === 'string') return new Blob([body]).size
  if (body instanceof Blob) return body.size
  if (body instanceof ArrayBuffer) return body.byteLength
  return null
}

export function recordNetworkDiagnostic(entry: Omit<NetworkDiagnosticEntry, 'id'>): NetworkDiagnosticEntry {
  const record: NetworkDiagnosticEntry = {
    ...entry,
    id: `net-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url: redactUrl(entry.url),
    metadata: sanitizeDevToolsValue(entry.metadata) as Record<string, unknown>,
  }
  networkBuffer.push(record)
  return record
}

export function createLoggedFetch(fetchImpl: typeof fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const startedPerf = now()
    const startedAt = epochNow()
    const method = requestMethod(input, init)
    const url = requestUrl(input)
    try {
      const response = await fetchImpl(input, init)
      const finishedAt = epochNow()
      const contentLength = response.headers.get('content-length')
      recordNetworkDiagnostic({
        kind: 'fetch',
        method,
        url,
        status: 'success',
        statusCode: response.status,
        durationMs: Number((now() - startedPerf).toFixed(2)),
        requestBytes: estimateRequestBytes(init),
        responseBytes: contentLength ? Number(contentLength) : null,
        errorMessage: null,
        startedAt,
        finishedAt,
        metadata: { ok: response.ok, redirected: response.redirected, type: response.type },
      })
      return response
    } catch (error) {
      const finishedAt = epochNow()
      recordNetworkDiagnostic({
        kind: 'fetch',
        method,
        url,
        status: 'error',
        statusCode: null,
        durationMs: Number((now() - startedPerf).toFixed(2)),
        requestBytes: estimateRequestBytes(init),
        responseBytes: null,
        errorMessage: error instanceof Error ? error.message : String(error),
        startedAt,
        finishedAt,
        metadata: {},
      })
      throw error
    }
  }) as typeof fetch
}

export function installDevToolsNetworkInstrumentation(): () => void {
  if (typeof globalThis.fetch !== 'function') {
    return () => undefined
  }
  if (originalFetch) {
    return uninstallDevToolsNetworkInstrumentation
  }
  originalFetch = globalThis.fetch.bind(globalThis) as typeof fetch
  globalThis.fetch = createLoggedFetch(originalFetch)
  return uninstallDevToolsNetworkInstrumentation
}

export function uninstallDevToolsNetworkInstrumentation(): void {
  if (originalFetch) {
    globalThis.fetch = originalFetch
    originalFetch = null
  }
}

export function snapshotNetworkDiagnostics(): NetworkDiagnosticsSnapshot {
  return {
    entries: networkBuffer.snapshot().sort((left, right) => right.startedAt - left.startedAt),
    capacity: NETWORK_BUFFER_CAPACITY,
    redactionVersion: 1,
  }
}

export function clearNetworkDiagnostics(): void {
  networkBuffer.clear()
}

export async function recordTauriInvokeDiagnostic<T>(command: string, invoke: () => Promise<T>, metadata: Record<string, unknown> = {}): Promise<T> {
  const startedPerf = now()
  const startedAt = epochNow()
  try {
    const result = await invoke()
    recordNetworkDiagnostic({
      kind: 'tauri-invoke',
      method: command,
      url: `tauri://${command}`,
      status: 'success',
      statusCode: null,
      durationMs: Number((now() - startedPerf).toFixed(2)),
      requestBytes: null,
      responseBytes: null,
      errorMessage: null,
      startedAt,
      finishedAt: epochNow(),
      metadata,
    })
    return result
  } catch (error) {
    recordNetworkDiagnostic({
      kind: 'tauri-invoke',
      method: command,
      url: `tauri://${command}`,
      status: 'error',
      statusCode: null,
      durationMs: Number((now() - startedPerf).toFixed(2)),
      requestBytes: null,
      responseBytes: null,
      errorMessage: error instanceof Error ? error.message : String(error),
      startedAt,
      finishedAt: epochNow(),
      metadata,
    })
    throw error
  }
}