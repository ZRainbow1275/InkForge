import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'
import { logger } from '@/services/error'
import { auditActionSchema, auditLogInputSchema, type AuditAction, type AuditExportResult, type AuditIntegrityReport, type AuditLogInput, type AuditLogRecord, type AuditQueryParams, type AuditQueryResult } from './types'
import { computeAuditHash, verifyAuditRecord } from './integrity'
import { sanitizeAuditPayload } from './sanitize'

const DEFAULT_QUERY_LIMIT = 50
const MAX_QUERY_LIMIT = 100_000
const AUDIT_FALLBACK_PREFIX = 'inkforge-audit-fallback-'

function clampLimit(limit: number | undefined): number {
    if (limit === undefined) return DEFAULT_QUERY_LIMIT
    return Math.max(1, Math.min(limit, MAX_QUERY_LIMIT))
}

function quoteCsv(value: unknown): string {
    const text = value === undefined || value === null ? '' : String(value)
    return `"${text.replace(/"/g, '""')}"`
}

function buildExportFileName(profileId: string, from: number | undefined, to: number | undefined, extension: 'csv' | 'json'): string {
    const start = from ? new Date(from).toISOString().slice(0, 10) : 'all'
    const end = to ? new Date(to).toISOString().slice(0, 10) : 'now'
    return `inkforge-audit-${profileId}-${start}-${end}.${extension}`
}

export class AuditRepository {
    async log(action: AuditAction, input: AuditLogInput): Promise<AuditLogRecord | null> {
        const parsedAction = auditActionSchema.parse(action)
        const parsedInput = auditLogInputSchema.parse(input)
        const now = Date.now()
        const entry = {
            id: generateId(),
            action: parsedAction,
            actorId: parsedInput.actorId,
            profileId: parsedInput.profileId,
            docId: parsedInput.docId,
            resourceId: parsedInput.resourceId,
            resourceKind: parsedInput.resourceKind,
            timestamp: now,
            severity: parsedInput.severity ?? 'info',
            outcome: parsedInput.outcome ?? 'info',
            reason: parsedInput.reason,
            payload: sanitizeAuditPayload(parsedInput.payload ?? {}),
            sessionId: parsedInput.sessionId,
            traceId: parsedInput.traceId,
            source: parsedInput.source,
        } satisfies Omit<AuditLogRecord, 'schemaVersion' | 'integrityVersion' | 'prevHash' | 'entryHash' | 'integrityStatus' | 'createdAt'>

        const record = await this.buildRecord(entry)

        try {
            await db.auditLogs.add(record)
            return record
        } catch (err) {
            logger.error('[AuditRepository] 审计日志写入 IndexedDB 失败', err)
            this.fallbackLog(record, err)
            return null
        }
    }

    async query(params: AuditQueryParams): Promise<AuditQueryResult> {
        let entries = await db.auditLogs
            .where('[profileId+timestamp]')
            .between([params.profileId, params.from ?? 0], [params.profileId, params.to ?? Number.MAX_SAFE_INTEGER])
            .toArray()

        if (params.actions?.length) {
            const actions = new Set(params.actions)
            entries = entries.filter(entry => actions.has(entry.action))
        }
        if (params.severities?.length) {
            const severities = new Set(params.severities)
            entries = entries.filter(entry => severities.has(entry.severity))
        }
        if (params.outcomes?.length) {
            const outcomes = new Set(params.outcomes)
            entries = entries.filter(entry => outcomes.has(entry.outcome))
        }
        if (params.docId) {
            entries = entries.filter(entry => entry.docId === params.docId)
        }
        if (params.resourceId) {
            entries = entries.filter(entry => entry.resourceId === params.resourceId)
        }
        if (params.keyword?.trim()) {
            const keyword = params.keyword.trim().toLowerCase()
            entries = entries.filter(entry => {
                const haystack = [
                    entry.action,
                    entry.actorId,
                    entry.profileId,
                    entry.docId ?? '',
                    entry.resourceId ?? '',
                    entry.reason ?? '',
                    JSON.stringify(entry.payload),
                ].join(' ').toLowerCase()
                return haystack.includes(keyword)
            })
        }

        entries = entries.sort((a, b) => b.timestamp - a.timestamp || b.createdAt - a.createdAt)
        const total = entries.length
        const offset = Math.max(0, params.offset ?? 0)
        const limit = clampLimit(params.limit)
        return { entries: entries.slice(offset, offset + limit), total }
    }

    async exportCSV(params: AuditQueryParams): Promise<AuditExportResult> {
        const result = await this.query({ ...params, offset: 0, limit: MAX_QUERY_LIMIT })
        const header = ['timestamp', 'action', 'actor_profile', 'doc_id', 'resource_id', 'resource_kind', 'severity', 'outcome', 'reason', 'entry_hash', 'payload']
        const rows = result.entries.map(entry => [
            new Date(entry.timestamp).toISOString(),
            entry.action,
            entry.actorId,
            entry.docId ?? '',
            entry.resourceId ?? '',
            entry.resourceKind ?? '',
            entry.severity,
            entry.outcome,
            entry.reason ?? '',
            entry.entryHash,
            JSON.stringify(entry.payload),
        ].map(quoteCsv).join(','))

        return {
            fileName: buildExportFileName(params.profileId, params.from, params.to, 'csv'),
            mimeType: 'text/csv;charset=utf-8',
            content: [header.map(quoteCsv).join(','), ...rows].join('\n'),
            totalCount: result.total,
        }
    }

    async exportJSON(params: AuditQueryParams): Promise<AuditExportResult> {
        const result = await this.query({ ...params, offset: 0, limit: MAX_QUERY_LIMIT })
        return {
            fileName: buildExportFileName(params.profileId, params.from, params.to, 'json'),
            mimeType: 'application/json;charset=utf-8',
            content: JSON.stringify({
                exportedAt: new Date().toISOString(),
                profileId: params.profileId,
                range: {
                    from: params.from ? new Date(params.from).toISOString() : null,
                    to: params.to ? new Date(params.to).toISOString() : null,
                },
                totalCount: result.total,
                entries: result.entries,
            }, null, 2),
            totalCount: result.total,
        }
    }

    async cleanup(profileId: string, retentionDays = 90): Promise<number> {
        const cutoff = Date.now() - retentionDays * 86_400_000
        const keys = await db.auditLogs
            .where('[profileId+timestamp]')
            .between([profileId, 0], [profileId, cutoff])
            .primaryKeys()
        await db.auditLogs.bulkDelete(keys)
        return keys.length
    }

    async verifyIntegrity(profileId: string): Promise<AuditIntegrityReport> {
        const entries = await db.auditLogs
            .where('profileId')
            .equals(profileId)
            .toArray()
        const ordered = entries.sort((a, b) => a.timestamp - b.timestamp || a.createdAt - b.createdAt)

        let previousHash: string | null = ordered[0]?.prevHash ?? null
        for (let index = 0; index < ordered.length; index += 1) {
            const entry = ordered[index]
            if (index > 0 && entry.prevHash !== previousHash) {
                return {
                    checked: index,
                    valid: false,
                    firstBrokenEntryId: entry.id,
                    reason: 'prevHash does not match previous retained entry hash',
                }
            }
            if (!(await verifyAuditRecord(entry))) {
                return {
                    checked: index,
                    valid: false,
                    firstBrokenEntryId: entry.id,
                    reason: 'entryHash verification failed',
                }
            }
            previousHash = entry.entryHash
        }

        return { checked: ordered.length, valid: true, firstBrokenEntryId: null, reason: null }
    }

    private async buildRecord(entry: Omit<AuditLogRecord, 'schemaVersion' | 'integrityVersion' | 'prevHash' | 'entryHash' | 'integrityStatus' | 'createdAt'>): Promise<AuditLogRecord> {
        const previous = await this.getLatestRecord(entry.profileId)
        const prevHash = previous?.entryHash ?? null
        try {
            return {
                ...entry,
                schemaVersion: 1,
                integrityVersion: 1,
                prevHash,
                entryHash: await computeAuditHash(entry, prevHash),
                integrityStatus: 'verified',
                createdAt: Date.now(),
            }
        } catch (err) {
            logger.warn('[AuditRepository] 审计完整性哈希不可用，将记录降级状态', { error: err instanceof Error ? err.message : String(err) })
            return {
                ...entry,
                schemaVersion: 1,
                integrityVersion: 1,
                prevHash,
                entryHash: `unavailable:${entry.id}`,
                integrityStatus: 'unavailable',
                createdAt: Date.now(),
            }
        }
    }

    private async getLatestRecord(profileId: string): Promise<AuditLogRecord | undefined> {
        const records = await db.auditLogs
            .where('profileId')
            .equals(profileId)
            .toArray()
        return records.sort((a, b) => b.timestamp - a.timestamp || b.createdAt - a.createdAt)[0]
    }

    private fallbackLog(record: AuditLogRecord, err: unknown): void {
        if (typeof localStorage === 'undefined') return
        try {
            localStorage.setItem(`${AUDIT_FALLBACK_PREFIX}${record.createdAt}-${record.id}`, JSON.stringify({
                record,
                failedAt: new Date().toISOString(),
                error: err instanceof Error ? err.message : String(err),
            }))
        } catch (fallbackErr) {
            logger.error('[AuditRepository] 审计日志 fallback 写入失败', fallbackErr)
        }
    }
}

export const auditRepository = new AuditRepository()
