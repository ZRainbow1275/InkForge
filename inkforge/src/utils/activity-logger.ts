import { logger } from '@/services/error'
import { logActivity, type ActivityAction, type ActivityTargetType } from '@/utils/db'

type ActivityMetadata = Record<string, unknown>
const DOCUMENT_EDIT_LOG_WINDOW_MS = 30_000
const recentDocumentEditLogTimestamps = new Map<string, number>()

async function safeLogActivity(
    action: ActivityAction,
    targetType: ActivityTargetType,
    targetId: string,
    targetTitle: string,
    metadata: ActivityMetadata = {}
): Promise<void> {
    try {
        await logActivity(action, targetType, targetId, targetTitle, metadata)
    } catch (error) {
        logger.warn('活动日志记录失败', {
            action,
            targetType,
            targetId,
            error: error instanceof Error ? error.message : String(error)
        })
    }
}

export async function logDocumentCreate(documentId: string, title: string): Promise<void> {
    await safeLogActivity('create', 'document', documentId, title)
}

export async function logDocumentEdit(documentId: string, title: string): Promise<void> {
    const now = Date.now()
    const lastLoggedAt = recentDocumentEditLogTimestamps.get(documentId) ?? 0

    // 编辑器会频繁自动保存，这里做窗口节流，避免活动日志按击键级别膨胀。
    if (now - lastLoggedAt < DOCUMENT_EDIT_LOG_WINDOW_MS) {
        return
    }

    recentDocumentEditLogTimestamps.set(documentId, now)
    await safeLogActivity('edit', 'document', documentId, title)
}

export async function logDocumentDelete(documentId: string, title: string): Promise<void> {
    await safeLogActivity('delete', 'document', documentId, title)
}

export async function logVersionCreate(documentId: string, versionLabel: string): Promise<void> {
    await safeLogActivity('version', 'version', documentId, versionLabel)
}

export async function logCategoryCreate(categoryId: string, name: string): Promise<void> {
    await safeLogActivity('create', 'category', categoryId, name)
}

export async function logExport(documentId: string, platform: string): Promise<void> {
    await safeLogActivity('export', 'document', documentId, `导出到 ${platform}`, { platform })
}

export async function logSync(documentId: string, action: 'push' | 'pull'): Promise<void> {
    await safeLogActivity('sync', 'document', documentId, `同步 ${action}`, { action })
}

export async function logImport(count: number, source: string): Promise<void> {
    await safeLogActivity('import', 'settings', source, `导入 ${count} 项数据`, { count, source })
}
