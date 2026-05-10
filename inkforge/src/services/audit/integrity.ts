import { sha256Hex } from '@/core/authority/hash'
import type { AuditEntry, AuditLogRecord } from './types'

function normalize(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString()
    if (Array.isArray(value)) return value.map(normalize)
    if (typeof value === 'object' && value !== null) {
        return Object.keys(value as Record<string, unknown>)
            .sort()
            .reduce<Record<string, unknown>>((acc, key) => {
                acc[key] = normalize((value as Record<string, unknown>)[key])
                return acc
            }, {})
    }
    return value
}

export function stableStringify(value: unknown): string {
    return JSON.stringify(normalize(value))
}

export function buildAuditHashSource(entry: AuditEntry, prevHash: string | null): string {
    return stableStringify({
        prevHash,
        id: entry.id,
        action: entry.action,
        actorId: entry.actorId,
        profileId: entry.profileId,
        docId: entry.docId ?? null,
        resourceId: entry.resourceId ?? null,
        resourceKind: entry.resourceKind ?? null,
        timestamp: entry.timestamp,
        severity: entry.severity,
        outcome: entry.outcome,
        reason: entry.reason ?? null,
        payload: entry.payload,
        sessionId: entry.sessionId ?? null,
        traceId: entry.traceId ?? null,
        source: entry.source ?? null,
    })
}

export async function computeAuditHash(entry: AuditEntry, prevHash: string | null): Promise<string> {
    return sha256Hex(buildAuditHashSource(entry, prevHash))
}

export async function verifyAuditRecord(record: AuditLogRecord): Promise<boolean> {
    if (record.integrityStatus !== 'verified') return false
    const expected = await computeAuditHash(record, record.prevHash)
    return expected === record.entryHash
}
