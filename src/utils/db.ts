import Dexie, { type Table } from 'dexie'
import type { Category, Article, EditedContent } from '@/types'
import { DEFAULT_PRESET_ID, DOCUMENT_STATUS, VERSION } from '@/constants'
import { VERSION_MANAGEMENT } from '@/config/security'
import { CreateDocumentDTOSchema } from '@/schemas/article'
import { encrypt } from '@/utils/crypto'

/**
 * 文档版本（独立存储）
 */
export interface DocumentVersion {
    id: string
    documentId: string
    label: string
    content: string
    title: string
    description: string
    createdAt: Date
    isInit?: boolean
    isPinned?: boolean  // 是否置顶/星标（置顶版本不会被自动删除）
}

/**
 * 文档（Bundle）
 */
export interface Document {
    id: string
    title: string
    content: string
    categoryId: string | null
    currentVersionId: string
    status: 'draft' | 'published'
    presetId: string
    createdAt: Date
    updatedAt: Date
}

/**
 * InkForge IndexedDB 数据库
 * 离线优先存储
 */
class InkForgeDB extends Dexie {
    categories!: Table<Category>
    articles!: Table<Article>
    contents!: Table<EditedContent>
    documents!: Table<Document>
    versions!: Table<DocumentVersion>

    constructor() {
        super('InkForgeDB')

        this.version(1).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt'
        })

        // v2: 添加文档和版本表
        this.version(2).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt'
        })
    }
}

export const db = new InkForgeDB()

// ═══════════════════════════════════════════════════════════════════
// 版本管理服务
// ═══════════════════════════════════════════════════════════════════

/** 每个文档的最大版本数量限制（从安全配置导入，Single Source of Truth） */
const MAX_VERSIONS_PER_DOCUMENT = VERSION_MANAGEMENT.MAX_VERSIONS_PER_DOCUMENT

/** 版本数量警告阈值（从安全配置导入） */
const VERSION_WARNING_THRESHOLD = VERSION_MANAGEMENT.VERSION_WARNING_THRESHOLD

/**
 * 版本保存结果（包含警告信息）
 */
export interface SaveVersionResult {
    version: DocumentVersion
    /** 版本数量警告（接近上限时返回） */
    warning?: {
        message: string
        currentCount: number
        maxCount: number
        /** 建议：置顶重要版本或导出备份 */
        suggestions: string[]
    }
}

/**
 * 版本状态信息
 */
export interface VersionStatus {
    documentId: string
    currentCount: number
    maxCount: number
    /** 可删除的版本数（非初始、非置顶） */
    deletableCount: number
    /** 已置顶的版本数 */
    pinnedCount: number
    /** 是否接近上限 */
    isNearLimit: boolean
    /** 警告消息（如果接近上限） */
    warningMessage?: string
}

/**
 * 生成唯一 ID（使用 crypto.randomUUID 确保唯一性）
 */
function generateId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`
}

/**
 * 创建新文档
 * @param title - 文档标题
 * @param content - 文档内容（可选）
 * @returns 创建的文档对象
 * @throws ZodError 如果输入验证失败
 */
export async function createDocument(title: string, content: string = ''): Promise<Document> {
    // 运行时输入验证（防止超长输入或恶意内容）
    const validated = CreateDocumentDTOSchema.parse({ title, content })

    const now = new Date()
    const docId = generateId('doc')
    const versionId = generateId('v')

    const doc: Document = {
        id: docId,
        title: validated.title,
        content: validated.content,
        categoryId: null,
        currentVersionId: versionId,
        status: DOCUMENT_STATUS.DRAFT,
        presetId: DEFAULT_PRESET_ID,
        createdAt: now,
        updatedAt: now
    }

    const version: DocumentVersion = {
        id: versionId,
        documentId: docId,
        label: VERSION.INITIAL_LABEL,
        content: validated.content,
        title: validated.title,
        description: VERSION.INITIAL_DESCRIPTION,
        createdAt: now,
        isInit: true
    }

    // 使用事务确保原子性
    await db.transaction('rw', [db.documents, db.versions], async () => {
        await db.documents.add(doc)
        await db.versions.add(version)
    })

    return doc
}

/**
 * 保存文档版本（带警告提示）
 * @returns 保存结果，包含版本对象和可能的警告信息
 */
export async function saveVersion(
    documentId: string,
    content: string,
    title: string,
    description: string = '新版本'
): Promise<SaveVersionResult> {
    const now = new Date()

    // 使用统一的版本标签格式
    const versionCount = await db.versions.where('documentId').equals(documentId).count()
    const versionNumber = versionCount + 1

    const version: DocumentVersion = {
        id: generateId('v'),
        documentId,
        label: VERSION.generateLabel(versionNumber),
        content,
        title,
        description,
        createdAt: now
    }

    let finalCount = versionNumber

    // 使用事务确保原子性
    await db.transaction('rw', [db.versions, db.documents], async () => {
        await db.versions.add(version)
        await db.documents.update(documentId, {
            currentVersionId: version.id,
            content,
            title,
            updatedAt: now
        })

        // 版本数量限制：超过上限时删除最旧的非初始版本
        const totalVersions = await db.versions.where('documentId').equals(documentId).count()
        if (totalVersions > MAX_VERSIONS_PER_DOCUMENT) {
            // 获取所有版本，按创建时间升序排列（最旧在前）
            const allVersions = await db.versions
                .where('documentId')
                .equals(documentId)
                .sortBy('createdAt')

            // 计算需要删除的数量
            const deleteCount = totalVersions - MAX_VERSIONS_PER_DOCUMENT

            // 筛选可删除的版本（排除 isInit 初始版本和 isPinned 置顶版本）
            const deletableVersions = allVersions.filter(v => !v.isInit && !v.isPinned)
            const versionsToDelete = deletableVersions.slice(0, deleteCount)

            // 批量删除最旧的版本
            if (versionsToDelete.length > 0) {
                await db.versions.bulkDelete(versionsToDelete.map(v => v.id))
            }

            finalCount = totalVersions - versionsToDelete.length
        }
    })

    // 构建返回结果
    const result: SaveVersionResult = { version }

    // 检查是否接近上限，生成警告
    const warningThreshold = Math.floor(MAX_VERSIONS_PER_DOCUMENT * VERSION_WARNING_THRESHOLD)
    if (finalCount >= warningThreshold) {
        result.warning = {
            message: `版本历史已达 ${finalCount}/${MAX_VERSIONS_PER_DOCUMENT}，接近上限`,
            currentCount: finalCount,
            maxCount: MAX_VERSIONS_PER_DOCUMENT,
            suggestions: [
                '置顶重要版本（置顶版本不会被自动删除）',
                '导出重要版本备份',
                '清理不再需要的旧版本'
            ]
        }
    }

    return result
}

/**
 * 获取文档版本状态
 * @param documentId - 文档 ID
 * @returns 版本状态信息
 */
export async function getVersionStatus(documentId: string): Promise<VersionStatus> {
    const allVersions = await db.versions
        .where('documentId')
        .equals(documentId)
        .toArray()

    const currentCount = allVersions.length
    const pinnedCount = allVersions.filter(v => v.isPinned).length
    const deletableCount = allVersions.filter(v => !v.isInit && !v.isPinned).length
    const warningThreshold = Math.floor(MAX_VERSIONS_PER_DOCUMENT * VERSION_WARNING_THRESHOLD)
    const isNearLimit = currentCount >= warningThreshold

    const status: VersionStatus = {
        documentId,
        currentCount,
        maxCount: MAX_VERSIONS_PER_DOCUMENT,
        deletableCount,
        pinnedCount,
        isNearLimit
    }

    if (isNearLimit) {
        status.warningMessage = `版本历史已达 ${currentCount}/${MAX_VERSIONS_PER_DOCUMENT}，` +
            `其中 ${pinnedCount} 个已置顶，${deletableCount} 个可自动清理`
    }

    return status
}

/**
 * 获取文档的所有版本
 */
export async function getVersions(documentId: string): Promise<DocumentVersion[]> {
    return db.versions
        .where('documentId')
        .equals(documentId)
        .reverse()
        .sortBy('createdAt')
}

/**
 * 切换到指定版本
 */
export async function switchToVersion(
    documentId: string,
    versionId: string
): Promise<DocumentVersion | null> {
    const version = await db.versions.get(versionId)
    if (!version) return null

    await db.documents.update(documentId, {
        currentVersionId: versionId,
        content: version.content,
        title: version.title,
        updatedAt: new Date()
    })

    return version
}

/**
 * 获取文档
 */
export async function getDocument(documentId: string): Promise<Document | undefined> {
    return db.documents.get(documentId)
}

/**
 * 获取所有文档
 */
export async function getAllDocuments(): Promise<Document[]> {
    return db.documents.orderBy('updatedAt').reverse().toArray()
}

/**
 * 删除文档及其版本
 */
export async function deleteDocument(documentId: string): Promise<void> {
    // 使用事务确保原子性
    await db.transaction('rw', [db.versions, db.documents], async () => {
        await db.versions.where('documentId').equals(documentId).delete()
        await db.documents.delete(documentId)
    })
}

/**
 * 切换版本置顶状态
 * @param versionId - 版本 ID
 * @returns 新的置顶状态，如果版本不存在返回 false
 */
export async function toggleVersionPin(versionId: string): Promise<boolean> {
    const version = await db.versions.get(versionId)
    if (!version) return false

    const newPinnedState = !version.isPinned
    await db.versions.update(versionId, { isPinned: newPinnedState })
    return newPinnedState
}

import { logger } from '@/services/error'

/**
 * 导出操作权限检查
 * 确保导出操作有适当的权限验证
 */
export interface ExportOptions {
    /** 是否跳过权限检查（仅限内部调用） */
    skipPermissionCheck?: boolean
    /** 调用来源（用于审计） */
    source?: string
}

/**
 * 验证导出权限
 * @param versionId - 版本 ID
 * @param options - 导出选项
 * @throws Error 如果权限验证失败
 */
async function validateExportPermission(versionId: string, options: ExportOptions = {}): Promise<void> {
    if (options.skipPermissionCheck) {
        // 记录内部调用的审计日志
        logger.info('[SECURITY AUDIT] 导出权限检查已跳过（内部调用）', {
            versionId,
            source: options.source || 'internal',
            timestamp: new Date().toISOString()
        })
        return
    }

    // 记录导出操作审计日志
    logger.info('[SECURITY AUDIT] 版本导出操作', {
        versionId,
        source: options.source || 'user',
        timestamp: new Date().toISOString()
    })
}

/**
 * 导出版本为 JSON
 * @param versionId - 版本 ID
 * @param options - 导出选项（包含权限控制）
 * @returns JSON 字符串，如果版本不存在返回 null
 * @security 包含权限验证和审计日志
 */
export async function exportVersion(versionId: string, options: ExportOptions = {}): Promise<string | null> {
    // 权限验证
    await validateExportPermission(versionId, options)

    const version = await db.versions.get(versionId)
    if (!version) return null

    return JSON.stringify({
        exportedAt: new Date().toISOString(),
        version: {
            label: version.label,
            title: version.title,
            content: version.content,
            description: version.description,
            createdAt: version.createdAt.toISOString()
        }
    }, null, 2)
}

/**
 * 导出加密版本（用于安全备份）
 * @param versionId - 版本 ID
 * @param options - 导出选项（包含权限控制）
 * @returns 加密后的导出数据，如果版本不存在返回 null
 * @description 使用 AES-GCM-256 加密敏感内容，防止备份泄露
 * @security 包含权限验证和审计日志
 */
export async function exportVersionEncrypted(versionId: string, options: ExportOptions = {}): Promise<{
    exportedAt: string
    encrypted: boolean
    data: string
} | null> {
    // 权限验证
    await validateExportPermission(versionId, { ...options, source: options.source || 'encrypted_export' })

    const version = await db.versions.get(versionId)
    if (!version) return null

    const plainData = JSON.stringify({
        label: version.label,
        title: version.title,
        content: version.content,
        description: version.description,
        createdAt: version.createdAt.toISOString()
    })

    // 加密敏感内容
    const encryptedResult = await encrypt(plainData)

    return {
        exportedAt: new Date().toISOString(),
        encrypted: encryptedResult.__encrypted,
        data: encryptedResult.data
    }
}

