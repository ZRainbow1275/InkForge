import type { AuditPayload } from './types'

const SENSITIVE_KEY_PATTERN = /(password|passphrase|token|secret|credential|authorization|session|rawContent|markdownSource|content)$/i
const MAX_STRING_LENGTH = 2_000
const MAX_ARRAY_LENGTH = 50
const MAX_DEPTH = 5

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function redactValue(key: string, value: unknown, depth: number): unknown {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
        return '[redacted]'
    }

    if (value instanceof Date) {
        return value.toISOString()
    }

    if (typeof File !== 'undefined' && value instanceof File) {
        return { kind: 'File', name: value.name, size: value.size, type: value.type }
    }

    if (typeof Blob !== 'undefined' && value instanceof Blob) {
        return { kind: 'Blob', size: value.size, type: value.type }
    }

    if (typeof value === 'string') {
        return value.length > MAX_STRING_LENGTH
            ? `${value.slice(0, MAX_STRING_LENGTH)}...`
            : value
    }

    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
        return value
    }

    if (Array.isArray(value)) {
        if (depth >= MAX_DEPTH) return '[max-depth]'
        return value.slice(0, MAX_ARRAY_LENGTH).map((item, index) => redactValue(String(index), item, depth + 1))
    }

    if (isPlainRecord(value)) {
        if (depth >= MAX_DEPTH) return '[max-depth]'
        return sanitizeAuditPayload(value, depth + 1)
    }

    return String(value)
}

export function sanitizeAuditPayload(payload: AuditPayload = {}, depth = 0): AuditPayload {
    const sanitized: AuditPayload = {}

    for (const [key, value] of Object.entries(payload)) {
        sanitized[key] = redactValue(key, value, depth)
    }

    return sanitized
}
