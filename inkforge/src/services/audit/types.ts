import { z } from 'zod'
import { RESOURCE_KIND_VALUES, type ResourceKind } from '@/services/permissions/types'

export const AUDIT_SEVERITY_VALUES = ['info', 'warning', 'error', 'critical'] as const
export const AUDIT_OUTCOME_VALUES = ['success', 'failure', 'partial', 'allowed', 'denied', 'info'] as const

export const AUDIT_ACTION_VALUES = [
    'document.create',
    'document.read',
    'document.update',
    'document.delete',
    'document.restore',
    'document.export',
    'document.import',
    'document.share',
    'document.shared_access',
    'document.publish',
    'document.version.create',
    'document.version.restore',
    'comment.create',
    'comment.resolve',
    'comment.delete',
    'review.approve',
    'review.request_changes',
    'account.create',
    'account.delete',
    'account.restore',
    'account.switch',
    'account.export',
    'account.import',
    'account.settings_change',
    'sync.push',
    'sync.pull',
    'sync.conflict.resolve',
    'sync.conflict.deferred',
    'permission.check',
    'permission.grant',
    'permission.revoke',
    'permission.share_link.create',
    'permission.share_link.revoke',
    'permission.shared_access',
    'ai.apply',
    'ai.reject',
    'command.execute',
    'command.batch_execute',
    'knowledge.fetch',
    'knowledge.cite',
    'knowledge.refresh',
    'system.db_reset',
    'system.cache_clear',
    'system.custom_css_inject',
    'system.plugin_install',
    'system.plugin_enable',
    'system.plugin_disable',
    'system.plugin_uninstall',
    'system.performance_degradation',
    'updater.user-check',
    'updater.skip-version',
    'updater.open-release',
    'updater.toggle-disabled',
] as const

export type AuditSeverity = typeof AUDIT_SEVERITY_VALUES[number]
export type AuditOutcome = typeof AUDIT_OUTCOME_VALUES[number]
export type AuditAction = typeof AUDIT_ACTION_VALUES[number]
export type AuditPayload = Record<string, unknown>
export type AuditIntegrityStatus = 'verified' | 'unavailable'

export interface AuditEntry {
    id: string
    action: AuditAction
    actorId: string
    profileId: string
    docId?: string
    resourceId?: string
    resourceKind?: ResourceKind
    timestamp: number
    severity: AuditSeverity
    outcome: AuditOutcome
    reason?: string
    payload: AuditPayload
    sessionId?: string
    traceId?: string
    source?: string
}

export interface AuditLogRecord extends AuditEntry {
    schemaVersion: 1
    integrityVersion: 1
    prevHash: string | null
    entryHash: string
    integrityStatus: AuditIntegrityStatus
    createdAt: number
}

export interface AuditLogInput {
    actorId: string
    profileId: string
    docId?: string
    resourceId?: string
    resourceKind?: ResourceKind
    severity?: AuditSeverity
    outcome?: AuditOutcome
    reason?: string
    payload?: AuditPayload
    sessionId?: string
    traceId?: string
    source?: string
}

export interface AuditQueryParams {
    profileId: string
    from?: number
    to?: number
    actions?: AuditAction[]
    severities?: AuditSeverity[]
    outcomes?: AuditOutcome[]
    docId?: string
    resourceId?: string
    keyword?: string
    offset?: number
    limit?: number
}

export interface AuditQueryResult {
    entries: AuditLogRecord[]
    total: number
}

export interface AuditExportResult {
    fileName: string
    mimeType: string
    content: string
    totalCount: number
}

export interface AuditIntegrityReport {
    checked: number
    valid: boolean
    firstBrokenEntryId: string | null
    reason: string | null
}

export const auditLogInputSchema = z.object({
    actorId: z.string().min(1),
    profileId: z.string().min(1),
    docId: z.string().min(1).optional(),
    resourceId: z.string().min(1).optional(),
    resourceKind: z.enum(RESOURCE_KIND_VALUES).optional(),
    severity: z.enum(AUDIT_SEVERITY_VALUES).optional(),
    outcome: z.enum(AUDIT_OUTCOME_VALUES).optional(),
    reason: z.string().max(500).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    sessionId: z.string().min(1).optional(),
    traceId: z.string().min(1).optional(),
    source: z.string().min(1).optional(),
}) satisfies z.ZodType<AuditLogInput>

export const auditActionSchema = z.enum(AUDIT_ACTION_VALUES)

export function isAuditAction(value: string): value is AuditAction {
    return AUDIT_ACTION_VALUES.includes(value as AuditAction)
}

export function isAuditSeverity(value: string): value is AuditSeverity {
    return AUDIT_SEVERITY_VALUES.includes(value as AuditSeverity)
}
