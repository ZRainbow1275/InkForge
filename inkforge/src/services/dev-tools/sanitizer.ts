const SENSITIVE_KEY_PATTERN = /(token|secret|password|api[-_]?key|authorization|cookie|credential|session|refresh|access|code)/i
const MAX_STRING_LENGTH = 1_000
const MAX_OBJECT_DEPTH = 5
const MAX_ARRAY_LENGTH = 50

export type JsonPrimitive = string | number | boolean | null

export function isPrimitiveEditableValue(value: unknown): value is JsonPrimitive {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value)
}

function redactString(value: string): string {
  return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}[TRUNCATED:${value.length}]` : value
}

export function sanitizeDevToolsValue(value: unknown, depth = 0, keyHint = ''): unknown {
  if (SENSITIVE_KEY_PATTERN.test(keyHint)) {
    return '[REDACTED]'
  }

  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return redactString(value)
  }

  if (typeof value === 'undefined') {
    return '[UNDEFINED]'
  }

  if (typeof value === 'function') {
    return '[FUNCTION]'
  }

  if (typeof value === 'symbol') {
    return '[SYMBOL]'
  }

  if (depth >= MAX_OBJECT_DEPTH) {
    return '[MAX_DEPTH]'
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof Blob) {
    return { type: 'Blob', size: value.size, mimeType: value.type }
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item, index) => sanitizeDevToolsValue(item, depth + 1, String(index)))
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizeDevToolsValue(child, depth + 1, key)
    }
    return result
  }

  return '[UNSERIALIZABLE]'
}

export function safeJsonSizeBytes(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size
  } catch {
    return 0
  }
}

export function parsePrimitiveInput(input: string): JsonPrimitive {
  const trimmed = input.trim()
  if (trimmed === 'null') return null
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (/^-?\d+(\.\d+)?$/u.test(trimmed)) return Number(trimmed)
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (isPrimitiveEditableValue(parsed)) return parsed
  } catch {
    // Treat non-JSON text as a string below.
  }
  return input
}