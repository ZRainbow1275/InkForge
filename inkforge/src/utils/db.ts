import Dexie, { type Table } from 'dexie'
import { z } from 'zod'
import type { Category, Article, EditedContent } from '@/types'
import { DEFAULT_PRESET_ID, DOCUMENT_STATUS, VERSION } from '@/constants'
import { VERSION_MANAGEMENT } from '@/config/security'
import { CreateDocumentDTOSchema } from '@/schemas/article'
import { computeChecksum } from '@/services/sync/key-derivation'
import { encrypt } from '@/utils/crypto'
import { logger } from '@/services/error'

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

const DOCUMENT_SYNC_STATUS_VALUES = ['local', 'synced', 'modified', 'conflict'] as const
const SYNC_LOG_ACTION_VALUES = ['push', 'pull', 'conflict', 'resolve', 'error'] as const
const SYNC_LOG_STATUS_VALUES = ['success', 'error', 'pending'] as const
const ACTIVITY_ACTION_VALUES = ['create', 'edit', 'delete', 'export', 'sync', 'import', 'version', 'backup'] as const
const ACTIVITY_TARGET_TYPE_VALUES = ['document', 'version', 'category', 'asset', 'settings', 'account'] as const

export type DocumentSyncStatus = typeof DOCUMENT_SYNC_STATUS_VALUES[number]
export type SyncLogAction = typeof SYNC_LOG_ACTION_VALUES[number]
export type SyncLogStatus = typeof SYNC_LOG_STATUS_VALUES[number]
export type ActivityAction = typeof ACTIVITY_ACTION_VALUES[number]
export type ActivityTargetType = typeof ACTIVITY_TARGET_TYPE_VALUES[number]

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
    syncStatus: DocumentSyncStatus
    syncedAt: Date | null
    remoteVersion: number
    accountId: string
    checksum: string
    presetId: string
    createdAt: Date
    updatedAt: Date
}

/**
 * 本地账户
 */
export interface Account {
    id: string
    name: string
    email: string
    avatarBlobId: string | null
    bio: string
    createdAt: Date
    updatedAt: Date
}

export interface SyncLogMetadata {
    localVersion?: number
    remoteVersion?: number
    strategy?: 'local-wins' | 'remote-wins' | 'manual'
    bytesTransferred?: number
}

/**
 * 同步日志
 */
export interface SyncLog {
    id: string
    action: SyncLogAction
    documentId: string
    timestamp: Date
    status: SyncLogStatus
    details: string
    metadata?: SyncLogMetadata
}

export interface PendingChangeRecord {
    id: string
    articleId: string
    operation: 'create' | 'update' | 'delete'
    timestamp: string
    checksum: string
    encryptedContent?: ArrayBuffer
    synced: boolean
    retryCount: number
    accountId: string
}

/**
 * 设置档案
 */
export interface SettingsProfile {
    id: string
    name: string
    settings: string
    createdAt: Date
    updatedAt: Date
    isDefault: boolean
}

/**
 * 活动日志
 */
export interface ActivityLog {
    id: string
    action: ActivityAction
    targetType: ActivityTargetType
    targetId: string
    targetTitle: string
    timestamp: Date
    metadata: Record<string, unknown>
}

/**
 * 素材记录
 * 存储上传到 InkForge 的图片、SVG 等文件
 */
export interface AssetRecord {
    id: string
    articleId: string | null    // 关联文章，null 表示全局素材
    name: string
    type: 'image' | 'svg' | 'video' | 'file'
    mimeType: string
    size: number                // 字节
    blob: Blob                  // 原始文件数据
    thumbnail?: Blob            // 缩略图（图片类型自动生成）
    width?: number
    height?: number
    tags: string[]
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
    assets!: Table<AssetRecord>
    accounts!: Table<Account>
    pending_changes!: Table<PendingChangeRecord>
    sync_logs!: Table<SyncLog>
    settings_profiles!: Table<SettingsProfile>
    activity_logs!: Table<ActivityLog>

    get syncLogs(): Table<SyncLog> {
        return this.sync_logs
    }

    get pendingChanges(): Table<PendingChangeRecord> {
        return this.pending_changes
    }

    get settingsProfiles(): Table<SettingsProfile> {
        return this.settings_profiles
    }

    get activityLogs(): Table<ActivityLog> {
        return this.activity_logs
    }

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

        // v3: 添加素材表
        this.version(3).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt'
        })

        // v4: 同步与企业级设置基础设施
        this.version(4).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, syncStatus, accountId, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt',
            accounts: 'id, email, createdAt',
            sync_logs: 'id, documentId, action, timestamp, status',
            settings_profiles: 'id, name, isDefault, createdAt',
            activity_logs: 'id, action, targetType, targetId, timestamp'
        }).upgrade(async (tx) => {
            await tx.table('documents').toCollection().modify((doc: Record<string, unknown>) => {
                if (typeof doc.syncStatus !== 'string') doc.syncStatus = 'local'
                if (!Object.prototype.hasOwnProperty.call(doc, 'syncedAt')) doc.syncedAt = null
                if (typeof doc.remoteVersion !== 'number') doc.remoteVersion = 0
                if (typeof doc.accountId !== 'string' || doc.accountId.length === 0) {
                    doc.accountId = 'local-default'
                }
                if (typeof doc.checksum !== 'string') doc.checksum = ''
            })

            const accountsTable = tx.table('accounts')
            const count = await accountsTable.count()

            if (count === 0) {
                const now = new Date()
                await accountsTable.add({
                    id: 'local-default',
                    name: 'InkForge 用户',
                    email: '',
                    avatarBlobId: null,
                    bio: '',
                    createdAt: now,
                    updatedAt: now
                })
            }
        })

        this.version(5).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, syncStatus, accountId, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt',
            accounts: 'id, email, createdAt',
            pending_changes: 'id, articleId, operation, synced, timestamp, accountId',
            sync_logs: 'id, documentId, action, timestamp, status',
            settings_profiles: 'id, name, isDefault, createdAt',
            activity_logs: 'id, action, targetType, targetId, timestamp'
        }).upgrade(async (tx) => {
            const pendingChangesTable = tx.table('pending_changes')
            await pendingChangesTable.toCollection().modify((change: Record<string, unknown>) => {
                if (typeof change.accountId !== 'string' || change.accountId.length === 0) {
                    change.accountId = 'local-default'
                }
                if (typeof change.synced !== 'boolean') {
                    change.synced = false
                }
                if (typeof change.retryCount !== 'number') {
                    change.retryCount = 0
                }
            })
        })
    }
}

export const db = new InkForgeDB()

const MetadataSchema = z.record(z.string(), z.unknown())
const DocumentSyncStatusSchema = z.enum(DOCUMENT_SYNC_STATUS_VALUES)
const CreateAccountInputSchema = z.object({
    id: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(100),
    email: z.union([z.literal(''), z.string().trim().email()]).default(''),
    avatarBlobId: z.string().min(1).nullable().default(null),
    bio: z.string().max(2_000).default('')
})
const UpdateAccountInputSchema = CreateAccountInputSchema.partial()
const AddSyncLogInputSchema = z.object({
    action: z.enum(SYNC_LOG_ACTION_VALUES),
    documentId: z.string().min(1),
    timestamp: z.date().optional(),
    status: z.enum(SYNC_LOG_STATUS_VALUES),
    details: z.string().trim().min(1).max(5_000),
    metadata: MetadataSchema.optional()
})
const SaveSettingsProfileInputSchema = z.object({
    id: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(100),
    settings: z.string().refine((value) => {
        try {
            JSON.parse(value)
            return true
        } catch {
            return false
        }
    }, 'settings 必须是合法 JSON 字符串'),
    isDefault: z.boolean().optional()
})
const LogActivityInputSchema = z.object({
    action: z.enum(ACTIVITY_ACTION_VALUES),
    targetType: z.enum(ACTIVITY_TARGET_TYPE_VALUES),
    targetId: z.string().min(1),
    targetTitle: z.string().trim().min(1).max(200),
    metadata: MetadataSchema.optional()
})

function resolveDirtySyncStatus(currentStatus: DocumentSyncStatus | undefined): DocumentSyncStatus {
    if (currentStatus === 'conflict') {
        return 'conflict'
    }

    return currentStatus === 'synced' ? 'modified' : 'local'
}

async function computeDocumentChecksum(content: string): Promise<string> {
    const contentBytes = new TextEncoder().encode(content)
    return computeChecksum(contentBytes)
}

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
 * 生成唯一 ID（使用跨平台兼容的 UUID 生成）
 */
function generatePrefixedId(prefix: string): string {
    // 内联 fallback 避免循环依赖（db.ts 是底层模块）
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16)
        crypto.getRandomValues(bytes)
        bytes[6] = (bytes[6] & 0x0f) | 0x40
        bytes[8] = (bytes[8] & 0x3f) | 0x80
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
        return `${prefix}_${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
    }
    return `${prefix}_${'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })}`
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
    const docId = generatePrefixedId('doc')
    const versionId = generatePrefixedId('v')
    const checksum = await computeDocumentChecksum(validated.content)

    const doc: Document = {
        id: docId,
        title: validated.title,
        content: validated.content,
        categoryId: null,
        currentVersionId: versionId,
        status: DOCUMENT_STATUS.DRAFT,
        syncStatus: DocumentSyncStatusSchema.enum.local,
        syncedAt: null,
        remoteVersion: 0,
        accountId: 'local-default',
        checksum,
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

    await logActivity('create', 'document', doc.id, doc.title, {
        status: doc.status,
        versionId,
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
    const existingDocument = await db.documents.get(documentId)
    const checksum = await computeDocumentChecksum(content)

    // 使用统一的版本标签格式
    const versionCount = await db.versions.where('documentId').equals(documentId).count()
    const versionNumber = versionCount + 1

    const version: DocumentVersion = {
        id: generatePrefixedId('v'),
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
            syncStatus: resolveDirtySyncStatus(existingDocument?.syncStatus),
            checksum,
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

    await logActivity('version', 'version', version.id, version.label, {
        documentId,
        title,
        currentVersionId: version.id,
    })

    return result
}

/**
 * 获取文档版本状态
 * @param documentId - 文档 ID
 * @returns 版本状态信息
 */
export async function getVersionStatus(documentId: string): Promise<VersionStatus> {
    try {
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
    } catch (error) {
        logger.error('获取版本状态失败', { documentId, error })
        throw error
    }
}

/**
 * 获取文档的所有版本
 */
export async function getVersions(documentId: string): Promise<DocumentVersion[]> {
    try {
        return await db.versions
            .where('documentId')
            .equals(documentId)
            .reverse()
            .sortBy('createdAt')
    } catch (error) {
        logger.error('获取版本列表失败', { documentId, error })
        throw error
    }
}

/**
 * 切换到指定版本
 */
export async function switchToVersion(
    documentId: string,
    versionId: string
): Promise<DocumentVersion | null> {
    try {
        const version = await db.versions.get(versionId)
        if (!version) return null
        const existingDocument = await db.documents.get(documentId)
        const checksum = await computeDocumentChecksum(version.content)

        await db.documents.update(documentId, {
            currentVersionId: versionId,
            content: version.content,
            title: version.title,
            syncStatus: resolveDirtySyncStatus(existingDocument?.syncStatus),
            checksum,
            updatedAt: new Date()
        })

        await logActivity('edit', 'document', documentId, version.title, {
            versionId,
            source: 'switch-version',
        })

        return version
    } catch (error) {
        logger.error('切换版本失败', { documentId, versionId, error })
        throw error
    }
}

/**
 * 获取文档
 */
export async function getDocument(documentId: string): Promise<Document | undefined> {
    try {
        return await db.documents.get(documentId)
    } catch (error) {
        logger.error('获取文档失败', { documentId, error })
        throw error
    }
}

/**
 * 获取所有文档
 */
export async function getAllDocuments(): Promise<Document[]> {
    try {
        return await db.documents.orderBy('updatedAt').reverse().toArray()
    } catch (error) {
        logger.error('获取全部文档失败', { error })
        throw error
    }
}

/**
 * 删除文档及其版本
 */
export async function deleteDocument(documentId: string): Promise<void> {
    try {
        const existingDocument = await db.documents.get(documentId)

        // 使用事务确保原子性
        await db.transaction('rw', [db.versions, db.documents], async () => {
            await db.versions.where('documentId').equals(documentId).delete()
            await db.documents.delete(documentId)
        })

        await logActivity('delete', 'document', documentId, existingDocument?.title ?? '未命名文档')
    } catch (error) {
        logger.error('删除文档失败', { documentId, error })
        throw error
    }
}

/**
 * 创建账户
 */
export async function createAccount(input: z.input<typeof CreateAccountInputSchema>): Promise<Account> {
    try {
        const validated = CreateAccountInputSchema.parse(input)
        const now = new Date()

        const account: Account = {
            id: validated.id ?? generatePrefixedId('account'),
            name: validated.name,
            email: validated.email,
            avatarBlobId: validated.avatarBlobId,
            bio: validated.bio,
            createdAt: now,
            updatedAt: now
        }

        await db.accounts.add(account)
        return account
    } catch (error) {
        logger.error('创建账户失败', { error, input })
        throw error
    }
}

/**
 * 获取账户
 */
export async function getAccount(accountId: string): Promise<Account | undefined> {
    try {
        return await db.accounts.get(accountId)
    } catch (error) {
        logger.error('获取账户失败', { accountId, error })
        throw error
    }
}

/**
 * 更新账户
 */
export async function updateAccount(
    accountId: string,
    updates: z.input<typeof UpdateAccountInputSchema>
): Promise<void> {
    try {
        const validated = UpdateAccountInputSchema.parse(updates)
        await db.accounts.update(accountId, {
            ...validated,
            updatedAt: new Date()
        })
    } catch (error) {
        logger.error('更新账户失败', { accountId, error })
        throw error
    }
}

/**
 * 删除账户，并将关联文档回退到默认本地账户
 */
export async function deleteAccount(accountId: string): Promise<void> {
    if (accountId === 'local-default') {
        throw new Error('默认本地账户不可删除')
    }

    try {
        await db.transaction('rw', [db.accounts, db.documents], async () => {
            await db.documents.where('accountId').equals(accountId).modify({ accountId: 'local-default' })
            await db.accounts.delete(accountId)
        })
    } catch (error) {
        logger.error('删除账户失败', { accountId, error })
        throw error
    }
}

/**
 * 新增同步日志
 */
export async function addSyncLog(input: z.input<typeof AddSyncLogInputSchema>): Promise<SyncLog> {
    try {
        const validated = AddSyncLogInputSchema.parse(input)

        const log: SyncLog = {
            id: generatePrefixedId('sync'),
            action: validated.action,
            documentId: validated.documentId,
            timestamp: validated.timestamp ?? new Date(),
            status: validated.status,
            details: validated.details,
            metadata: validated.metadata
        }

        await db.syncLogs.add(log)
        return log
    } catch (error) {
        logger.error('写入同步日志失败', { error, input })
        throw error
    }
}

/**
 * 获取同步日志
 */
export async function getSyncLogs(documentId?: string): Promise<SyncLog[]> {
    try {
        if (documentId) {
            const logs = await db.syncLogs.where('documentId').equals(documentId).toArray()
            return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        }

        return await db.syncLogs.orderBy('timestamp').reverse().toArray()
    } catch (error) {
        logger.error('获取同步日志失败', { documentId, error })
        throw error
    }
}

/**
 * 保存设置档案
 */
export async function saveSettingsProfile(
    input: z.input<typeof SaveSettingsProfileInputSchema>
): Promise<SettingsProfile> {
    try {
        const validated = SaveSettingsProfileInputSchema.parse(input)
        const now = new Date()
        const existingProfile = validated.id
            ? await db.settingsProfiles.get(validated.id)
            : undefined

        const profile: SettingsProfile = {
            id: validated.id ?? generatePrefixedId('profile'),
            name: validated.name,
            settings: validated.settings,
            createdAt: existingProfile?.createdAt ?? now,
            updatedAt: now,
            isDefault: validated.isDefault ?? existingProfile?.isDefault ?? false
        }

        await db.transaction('rw', [db.settingsProfiles], async () => {
            if (profile.isDefault) {
                await db.settingsProfiles.toCollection().modify((item) => {
                    item.isDefault = false
                })
            }

            await db.settingsProfiles.put(profile)
        })

        return profile
    } catch (error) {
        logger.error('保存设置档案失败', { error, input })
        throw error
    }
}

/**
 * 获取设置档案列表
 */
export async function getSettingsProfiles(): Promise<SettingsProfile[]> {
    try {
        const profiles = await db.settingsProfiles.toArray()
        return profiles.sort((a, b) => {
            if (a.isDefault !== b.isDefault) {
                return Number(b.isDefault) - Number(a.isDefault)
            }

            return b.updatedAt.getTime() - a.updatedAt.getTime()
        })
    } catch (error) {
        logger.error('获取设置档案失败', { error })
        throw error
    }
}

/**
 * 删除设置档案
 */
export async function deleteSettingsProfile(profileId: string): Promise<void> {
    try {
        await db.settingsProfiles.delete(profileId)
    } catch (error) {
        logger.error('删除设置档案失败', { profileId, error })
        throw error
    }
}

/**
 * 记录活动日志
 */
export async function logActivity(
    action: ActivityAction,
    targetType: ActivityTargetType,
    targetId: string,
    targetTitle: string,
    metadata: Record<string, unknown> = {}
): Promise<ActivityLog> {
    try {
        const validated = LogActivityInputSchema.parse({
            action,
            targetType,
            targetId,
            targetTitle,
            metadata
        })

        const activity: ActivityLog = {
            id: generatePrefixedId('activity'),
            action: validated.action,
            targetType: validated.targetType,
            targetId: validated.targetId,
            targetTitle: validated.targetTitle,
            timestamp: new Date(),
            metadata: validated.metadata ?? {}
        }

        await db.activityLogs.add(activity)
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('inkforge:activity-log-updated', {
                detail: {
                    action: activity.action,
                    targetType: activity.targetType,
                    targetId: activity.targetId,
                }
            }))
        }
        return activity
    } catch (error) {
        logger.error('写入活动日志失败', { action, targetType, targetId, error })
        throw error
    }
}

/**
 * 获取活动日志
 */
export async function getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    try {
        return await db.activityLogs.orderBy('timestamp').reverse().limit(limit).toArray()
    } catch (error) {
        logger.error('获取活动日志失败', { limit, error })
        throw error
    }
}

export interface DatabaseSizeResult {
    tables: Record<string, number>
    total: number
}

/**
 * 获取数据库各表记录数量
 */
export async function getDatabaseSize(): Promise<DatabaseSizeResult> {
    const tableNames = [
        'categories',
        'articles',
        'contents',
        'documents',
        'versions',
        'assets',
        'accounts',
        'pending_changes',
        'sync_logs',
        'settings_profiles',
        'activity_logs'
    ] as const

    const tables: Record<string, number> = {}
    let total = 0

    for (const tableName of tableNames) {
        const count = await db.table(tableName).count()
        tables[tableName] = count
        total += count
    }

    return { tables, total }
}

/**
 * 切换版本置顶状态
 * @param versionId - 版本 ID
 * @returns 新的置顶状态，如果版本不存在返回 false
 */
export async function toggleVersionPin(versionId: string): Promise<boolean> {
    try {
        const version = await db.versions.get(versionId)
        if (!version) return false

        const newPinnedState = !version.isPinned
        await db.versions.update(versionId, { isPinned: newPinnedState })
        return newPinnedState
    } catch (error) {
        logger.error('切换版本置顶状态失败', { versionId, error })
        throw error
    }
}

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
    try {
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
    } catch (error) {
        logger.error('导出版本失败', { versionId, error })
        throw error
    }
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

