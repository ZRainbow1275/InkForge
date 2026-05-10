import type { DiagnosticPayload } from './types'

export const DEFAULT_DIAGNOSTIC_STRING_LIMIT = 2_000
export const DEFAULT_DIAGNOSTIC_ARRAY_LIMIT = 100
export const DEFAULT_DIAGNOSTIC_DEPTH_LIMIT = 8

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passphrase/i,
  /secret/i,
  /token/i,
  /api[-_]?key/i,
  /authorization/i,
  /cookie/i,
  /credential/i,
  /session[-_]?secret/i,
  /raw[-_]?content/i,
  /html[-_]?cache/i,
  /markdown[-_]?source/i,
  /^content$/i,
  /^body$/i,
  /^document$/i,
]

export interface RedactionOptions {
  maxStringLength?: number
  maxArrayItems?: number
  maxDepth?: number
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key))
}

function truncateString(value: string, limit: number): string {
  if (value.length <= limit) return value
  return `${value.slice(0, limit)}...[TRUNCATED:${value.length}]`
}

function redactValue(
  value: unknown,
  options: Required<RedactionOptions>,
  depth: number,
  visited: WeakSet<object>,
): unknown {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    return truncateString(value, options.maxStringLength)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (typeof value === 'symbol' || typeof value === 'function') {
    return `[${typeof value}]`
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(value.message, options.maxStringLength),
      stack: value.stack ? truncateString(value.stack, options.maxStringLength) : undefined,
    }
  }

  if (depth >= options.maxDepth) {
    return '[MAX_DEPTH]'
  }

  if (visited.has(value)) {
    return '[CIRCULAR]'
  }
  visited.add(value)

  if (Array.isArray(value)) {
    const visible = value.slice(0, options.maxArrayItems).map(item => redactValue(item, options, depth + 1, visited))
    if (value.length > options.maxArrayItems) {
      visible.push(`[TRUNCATED_ARRAY:${value.length}]`)
    }
    return visible
  }

  const output: DiagnosticPayload = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSensitiveKey(key)
      ? '[REDACTED]'
      : redactValue(entry, options, depth + 1, visited)
  }
  return output
}

export function redactDiagnosticPayload(payload: unknown, redactionOptions: RedactionOptions = {}): DiagnosticPayload {
  const options: Required<RedactionOptions> = {
    maxStringLength: redactionOptions.maxStringLength ?? DEFAULT_DIAGNOSTIC_STRING_LIMIT,
    maxArrayItems: redactionOptions.maxArrayItems ?? DEFAULT_DIAGNOSTIC_ARRAY_LIMIT,
    maxDepth: redactionOptions.maxDepth ?? DEFAULT_DIAGNOSTIC_DEPTH_LIMIT,
  }

  const redacted = redactValue(payload ?? {}, options, 0, new WeakSet<object>())
  if (!redacted || typeof redacted !== 'object' || Array.isArray(redacted)) {
    return { value: redacted }
  }
  return redacted as DiagnosticPayload
}