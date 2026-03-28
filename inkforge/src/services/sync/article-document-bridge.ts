import type { Version } from '@/schemas/article'
import { DEFAULT_PRESET_ID, VERSION, type DocumentStatus } from '@/constants'
import { logger } from '@/services/error'
import { db, type Document, type DocumentVersion } from '@/utils/db'
import { computeChecksum } from './key-derivation'

interface SyncArticleDocumentInput {
    articleId: string
    title: string
    body: string
    categoryId: string | null
    currentVersion: Version
    createdAt: Date
    updatedAt: Date
    status: DocumentStatus
}

interface SyncArticleDocumentOptions {
    markDirty?: boolean
}

function resolveNextSyncStatus(
    currentStatus: Document['syncStatus'] | undefined,
    markDirty: boolean
): Document['syncStatus'] {
    if (!currentStatus) {
        return 'local'
    }

    if (!markDirty) {
        return currentStatus
    }

    if (currentStatus === 'conflict') {
        return 'conflict'
    }

    return currentStatus === 'synced' ? 'modified' : currentStatus
}

function toDocumentVersion(
    articleId: string,
    version: Version,
    existingVersion: DocumentVersion | undefined
): DocumentVersion {
    const isInit = version.label === VERSION.INITIAL_LABEL

    return {
        id: version.id,
        documentId: articleId,
        label: version.label,
        title: version.title,
        content: version.body,
        description: isInit ? VERSION.INITIAL_DESCRIPTION : version.label,
        createdAt: new Date(version.createdAt),
        isInit,
        isPinned: existingVersion?.isPinned,
    }
}

export async function syncArticleDocumentSnapshot(
    input: SyncArticleDocumentInput,
    options: SyncArticleDocumentOptions = {}
): Promise<Document> {
    const { markDirty = false } = options

    try {
        const checksum = await computeChecksum(new TextEncoder().encode(input.body))

        const [existingDocument, existingVersion] = await Promise.all([
            db.documents.get(input.articleId),
            db.versions.get(input.currentVersion.id),
        ])

        const document: Document = {
            id: input.articleId,
            title: input.title,
            content: input.body,
            categoryId: input.categoryId,
            currentVersionId: input.currentVersion.id,
            status: input.status,
            syncStatus: resolveNextSyncStatus(existingDocument?.syncStatus, markDirty),
            syncedAt: existingDocument?.syncedAt ?? null,
            remoteVersion: existingDocument?.remoteVersion ?? 0,
            accountId: existingDocument?.accountId ?? 'local-default',
            checksum,
            presetId: existingDocument?.presetId ?? DEFAULT_PRESET_ID,
            createdAt: existingDocument?.createdAt ?? input.createdAt,
            updatedAt: input.updatedAt,
        }

        const currentVersion = toDocumentVersion(input.articleId, input.currentVersion, existingVersion)

        await db.transaction('rw', [db.documents, db.versions], async () => {
            await db.documents.put(document)
            await db.versions.put(currentVersion)
        })

        return document
    } catch (error) {
        logger.error('[ArticleDocumentBridge] 镜像文档快照失败', error, {
            articleId: input.articleId,
            versionId: input.currentVersion.id,
        })
        throw error
    }
}
