import { logger } from '@/services/error'
import { auditRepository } from './repository'
import type { AuditAction, AuditLogInput, AuditLogRecord } from './types'

type AuditListener = (entry: AuditLogRecord) => void

class AuditEventBus {
    private readonly listeners = new Set<AuditListener>()

    on(listener: AuditListener): () => void {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    emit(entry: AuditLogRecord): void {
        for (const listener of this.listeners) {
            try {
                listener(entry)
            } catch (err) {
                logger.warn('[AuditEventBus] 审计事件监听器异常', { error: err instanceof Error ? err.message : String(err) })
            }
        }
    }
}

export const auditEventBus = new AuditEventBus()

export class AuditLogger {
    private static instance: AuditLogger | null = null

    static getInstance(): AuditLogger {
        if (!AuditLogger.instance) {
            AuditLogger.instance = new AuditLogger()
        }
        return AuditLogger.instance
    }

    async log(action: AuditAction, options: AuditLogInput): Promise<AuditLogRecord | null> {
        try {
            const entry = await auditRepository.log(action, options)
            if (entry) {
                auditEventBus.emit(entry)
            }
            return entry
        } catch (err) {
            logger.error('[AuditLogger] 审计日志记录失败', err)
            return null
        }
    }
}

const auditLogger = AuditLogger.getInstance()

export const auditLog = auditLogger.log.bind(auditLogger)
