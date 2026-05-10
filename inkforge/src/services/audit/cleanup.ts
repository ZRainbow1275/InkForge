import { auditRepository } from './repository'

export const AUDIT_RETENTION_DAYS = 90

export class AuditCleanupService {
    async cleanup(profileId: string, retentionDays = AUDIT_RETENTION_DAYS): Promise<{ deleted: number }> {
        return { deleted: await auditRepository.cleanup(profileId, retentionDays) }
    }

    async estimateSize(profileId: string): Promise<number> {
        const result = await auditRepository.query({ profileId, limit: 1 })
        return result.total * 512
    }
}

export const auditCleanupService = new AuditCleanupService()
