import Dexie, { type Table } from 'dexie'
import type { Category, Article, EditedContent } from '@/types'
import type { RecoveryPointRecord } from '@/services/crash-recovery/types'
import type { FtueRecord } from '@/services/ftue/types'
import type { SyncConflictRecord, SyncLogRecord, SyncOutboxRecord } from '@/services/sync/repository'
import type { AuditLogRecord } from '@/services/audit'
import type { ExtensionRecord, ExtensionStorageRecord } from '@/services/extensions'
import type { ProfileRecord, ProfileSharedAIConfigRecord, ProfileSharedExportPresetRecord, ProfileSharedTemplateRecord } from '@/services/profile/types'
import type { PerformanceDegradationEventRecord, PerformanceSampleRecord } from '@/services/performance'
import type { AssetLifecycle, AssetMimeCategory, AssetRefRecord, AssetSourceKind } from '@/services/asset-pipeline'
import type { ResourcePermissionRecord } from '@/services/permissions'
import type { CommentRecord, MarginNoteRecord, TrackChangeRecord } from '@/services/comment-review/types'
import type { ActivityLogRecord, ExportLogRecord } from '@/services/activity-logger/types'
import type { LayoutStateRecord } from '@/services/layout-persistence/types'
import type { BacklinkRecord } from '@/services/wiki-link/types'
import type { SnippetRecord } from '@/services/snippet/types'
import type { DocTagRecord, TagRecord } from '@/services/tag-system/types'
import type { SkippedVersionRecord } from '@/services/updater/types'
import { DEFAULT_PRESET_ID, DOCUMENT_STATUS, VERSION } from '@/constants'
import { VERSION_MANAGEMENT } from '@/config/security'
import { CreateDocumentDTOSchema } from '@/schemas/article'
import { encrypt } from '@/utils/crypto'
import { logger } from '@/services/error'

/**
 * 闂佸搫鍊稿ú锕傚Υ閸岀偞鍋嬮柛顐ゅ枑閹烽亶鏌ㄥ妯煎ⅱ閻庢凹鍘剧划鈺冣偓锝庝簽閹界娀鏌涘畝濠勫帨缂?
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
    isPinned?: boolean  // 闂佸搫瀚烽崹浼村箚娴ｈ櫣纾炬い鏇楀亾闁?闂佸搫瀚崰鎰版偉閿濆鏅柛顐犲灮閺嬪倸顪冮妶鍛暢濠⒀勵殜瀵敻顢栫捄銊ф喒婵炴潙鍚嬫穱娲綖閿曞倹鍤婃い蹇撳琚熼梺鍛婂笧婵炩偓婵炲懎閰ｉ弫?
}

/**
 * 闂佸搫鍊稿ú锕傚Υ閸岀偞鏅柛锔芥晢ndle闂?
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
 * 缂備浇浜慨闈涱焽濡ゅ啯濯奸柡澶庢硶缁?
 * 闁诲孩绋掗敋闁稿绉电粙澶嬬節娴ｈ櫣鍊為梺?InkForge 闂佹眹鍔岀€氼剙霉濮椻偓閹囧炊閵夈垹浜惧鎾跺父G 缂備焦绋戦ˇ浼村几閸愨晝顩?
 */
export interface AssetRecord {
    id: string
    articleId: string | null    // Legacy owner article id; null means library-level asset.
    name: string
    type: 'image' | 'svg' | 'video' | 'file'
    mimeType: string
    size: number
    blob: Blob
    thumbnail?: Blob
    width?: number
    height?: number
    tags: string[]
    createdAt: Date
    updatedAt: Date

    // Asset Pipeline v12 compatibility fields. Blob payloads remain unindexed; metadata supports hash dedupe, refs, and orphan cleanup.
    profileId?: string
    originalName?: string
    originalMimeType?: string
    contentHash?: string
    category?: AssetMimeCategory
    sizeBytes?: number
    compressedSizeBytes?: number
    sourceKind?: AssetSourceKind
    externalUrl?: string | null
    cachedAt?: number | null
    refCount?: number
    lifecycle?: AssetLifecycle
    orphanedAt?: number | null
    storageBackend?: 'indexeddb' | 'tauri-mirror-pending'
}

/**
 * 闂佸搫鐗滈崜娆忥耿鐎靛憡瀚婚柨鏃囨閻撴洟鎮规担瑙勭凡缂?
 * 缂?Local-First闂佹寧绋掗懝鎹愩亹瑜庣粚鍗炩攽閸℃瑦鎲奸梺鍝勭墱閸撴艾鈹冮埀顒勬偣瑜嶇€氼參寮搁敓鐘参ュù锝嗘偠娴犲牓鏌涘鍛缂佲偓瀹€鍕骇闁归偊鍓涚粚鍧楁煟椤剙濡奸柟铚傚嵆瀵敻顢楅埀顒€锕?profile 闂佺粯顭堥崺鏍焵椤戝潡妾烽柍? */
export interface AccountRecord {
    id: string
    name: string
    email?: string
    bio?: string
    avatarAssetId?: string
    profileKind: 'local'
    status: 'active' | 'deleted'
    createdAt: Date
    updatedAt: Date
    lastActiveAt: Date
    deletedAt?: Date
}
/**
 * InkForge IndexedDB 闂佽桨鑳舵晶妤€鐣垫担瑙勫劅?
 * 缂備礁鍊藉畷鐢稿吹鎼淬垹顕辨俊顖氭惈鐢儵鎮楀娅亪宕?
 */
class InkForgeDB extends Dexie {
    categories!: Table<Category>
    articles!: Table<Article>
    contents!: Table<EditedContent>
    documents!: Table<Document>
    versions!: Table<DocumentVersion>
    assets!: Table<AssetRecord>
    accounts!: Table<AccountRecord>
    recoveryPoints!: Table<RecoveryPointRecord>
    ftue!: Table<FtueRecord, string>
    syncOutbox!: Table<SyncOutboxRecord, string>
    syncLogs!: Table<SyncLogRecord, string>
    syncConflicts!: Table<SyncConflictRecord, string>
    auditLogs!: Table<AuditLogRecord, string>
    resourcePermissions!: Table<ResourcePermissionRecord, string>
    extensions!: Table<ExtensionRecord, string>
    extensionStorage!: Table<ExtensionStorageRecord, string>
    profiles!: Table<ProfileRecord, string>
    profileSharedTemplates!: Table<ProfileSharedTemplateRecord, string>
    profileSharedExportPresets!: Table<ProfileSharedExportPresetRecord, string>
    profileSharedAIConfigs!: Table<ProfileSharedAIConfigRecord, string>
    performanceSamples!: Table<PerformanceSampleRecord, string>
    performanceDegradationEvents!: Table<PerformanceDegradationEventRecord, string>
    assetRefs!: Table<AssetRefRecord, string>
    comments!: Table<CommentRecord, string>
    marginNotes!: Table<MarginNoteRecord, string>
    trackChanges!: Table<TrackChangeRecord, string>
    activityLogs!: Table<ActivityLogRecord, string>
    exportLogs!: Table<ExportLogRecord, string>
    layoutStates!: Table<LayoutStateRecord, string>
    backlinks!: Table<BacklinkRecord, string>
    snippets!: Table<SnippetRecord, string>
    tags!: Table<TagRecord, string>
    docTags!: Table<DocTagRecord, string>
    updaterSkipped!: Table<SkippedVersionRecord, string>

    constructor() {
        super('InkForgeDB')

        this.version(1).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt'
        })

        // v2: 濠电儑缍€椤曆勬叏閻愬搫妫橀柛銉ｅ妸閳ь剙鍊垮畷顏勭暆閳ь剚鏅跺Δ鍛珘妞ゆ帒鍟ㄩ埀?
        this.version(2).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt'
        })

        // v3: 濠电儑缍€椤曆勬叏閻愬灚顫曢柣妯挎珪缂嶅繘鎮?
        this.version(3).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt'
        })

        // v4: Add local account table while preserving existing article, document, and asset tables.
        this.version(4).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt'
        })

        // v5: Crash Recovery L1 baseline. Adds recovery points without migrating or deleting existing records.
        this.version(5).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey'
        })

        // v6: FTUE/help baseline. Adds first-run state records without touching content, account, or recovery tables.
        this.version(6).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt'
        })

        // v7: SyncProvider baseline. Adds durable sync queue, logs, and conflicts without enabling any fake remote success path.
        this.version(7).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt'
        })

        // v8: Permission audit baseline. Adds append-only audit ledger and resource permission records without mutating content tables.
        this.version(8).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]'
        })

        // v9: Extension plugin baseline. Adds local manifest registry and profile-scoped extension storage only.
        this.version(9).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]'
        })

        // v10: Multi-account Profile baseline. Adds global Profile registry and shared cross-profile area tables.
        this.version(10).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]',
            profiles: 'id, name, dbNamespace, status, fileRootStatus, createdAt, updatedAt, lastActiveAt, deletedAt, sourceAccountId',
            profileSharedTemplates: 'id, name, version, createdAt, updatedAt',
            profileSharedExportPresets: 'id, name, platform, createdAt, updatedAt',
            profileSharedAIConfigs: 'id, provider, createdAt, updatedAt'
        })

        // v11: Performance SLO baseline. Adds local telemetry samples and degradation evidence without remote reporting or fake lab scores.
        this.version(11).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, *tags, createdAt',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]',
            profiles: 'id, name, dbNamespace, status, fileRootStatus, createdAt, updatedAt, lastActiveAt, deletedAt, sourceAccountId',
            profileSharedTemplates: 'id, name, version, createdAt, updatedAt',
            profileSharedExportPresets: 'id, name, platform, createdAt, updatedAt',
            profileSharedAIConfigs: 'id, provider, createdAt, updatedAt',
            performanceSamples: 'id, profileId, metric, status, sampledAt, createdAt, [profileId+sampledAt], [profileId+metric], [profileId+status]',
            performanceDegradationEvents: 'id, profileId, metric, level, status, createdAt, sampleId, [profileId+createdAt], [profileId+metric], [profileId+status]'
        })
        // v12: Asset Pipeline baseline. Adds hash-indexed asset metadata and durable reference tracking while preserving existing Blob fields.
        this.version(12).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, sourceUrl',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, mimeType, category, profileId, contentHash, refCount, lifecycle, orphanedAt, createdAt, updatedAt, *tags, [profileId+contentHash], [profileId+category], [profileId+lifecycle]',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]',
            profiles: 'id, name, dbNamespace, status, fileRootStatus, createdAt, updatedAt, lastActiveAt, deletedAt, sourceAccountId',
            profileSharedTemplates: 'id, name, version, createdAt, updatedAt',
            profileSharedExportPresets: 'id, name, platform, createdAt, updatedAt',
            profileSharedAIConfigs: 'id, provider, createdAt, updatedAt',
            performanceSamples: 'id, profileId, metric, status, sampledAt, createdAt, [profileId+sampledAt], [profileId+metric], [profileId+status]',
            performanceDegradationEvents: 'id, profileId, metric, level, status, createdAt, sampleId, [profileId+createdAt], [profileId+metric], [profileId+status]',
            assetRefs: 'id, assetId, profileId, referrerKind, referrerId, createdAt, updatedAt, [assetId+referrerId], [profileId+assetId]'
        })

        // v13: Trash recycle baseline. Adds soft-delete metadata indexes without removing existing content rows before purge.
        this.version(13).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, updatedAt, sourceUrl, deletedAt, expiresAt, deletedBy, preTrashStatus, [status+deletedAt], [status+expiresAt]',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, mimeType, category, profileId, contentHash, refCount, lifecycle, orphanedAt, createdAt, updatedAt, *tags, [profileId+contentHash], [profileId+category], [profileId+lifecycle]',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]',
            profiles: 'id, name, dbNamespace, status, fileRootStatus, createdAt, updatedAt, lastActiveAt, deletedAt, sourceAccountId',
            profileSharedTemplates: 'id, name, version, createdAt, updatedAt',
            profileSharedExportPresets: 'id, name, platform, createdAt, updatedAt',
            profileSharedAIConfigs: 'id, provider, createdAt, updatedAt',
            performanceSamples: 'id, profileId, metric, status, sampledAt, createdAt, [profileId+sampledAt], [profileId+metric], [profileId+status]',
            performanceDegradationEvents: 'id, profileId, metric, level, status, createdAt, sampleId, [profileId+createdAt], [profileId+metric], [profileId+status]',
            assetRefs: 'id, assetId, profileId, referrerKind, referrerId, createdAt, updatedAt, [assetId+referrerId], [profileId+assetId]'
        })

        // v14: Comment Review baseline. Adds local-first review stores without altering article/content rows.
        this.version(14).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, updatedAt, sourceUrl, deletedAt, expiresAt, deletedBy, preTrashStatus, [status+deletedAt], [status+expiresAt]',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, mimeType, category, profileId, contentHash, refCount, lifecycle, orphanedAt, createdAt, updatedAt, *tags, [profileId+contentHash], [profileId+category], [profileId+lifecycle]',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]',
            profiles: 'id, name, dbNamespace, status, fileRootStatus, createdAt, updatedAt, lastActiveAt, deletedAt, sourceAccountId',
            profileSharedTemplates: 'id, name, version, createdAt, updatedAt',
            profileSharedExportPresets: 'id, name, platform, createdAt, updatedAt',
            profileSharedAIConfigs: 'id, provider, createdAt, updatedAt',
            performanceSamples: 'id, profileId, metric, status, sampledAt, createdAt, [profileId+sampledAt], [profileId+metric], [profileId+status]',
            performanceDegradationEvents: 'id, profileId, metric, level, status, createdAt, sampleId, [profileId+createdAt], [profileId+metric], [profileId+status]',
            assetRefs: 'id, assetId, profileId, referrerKind, referrerId, createdAt, updatedAt, [assetId+referrerId], [profileId+assetId]',
            comments: 'id, docId, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            marginNotes: 'id, docId, paragraphIndex, authorId, createdAt, updatedAt, [docId+paragraphIndex]',
            trackChanges: 'id, docId, kind, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]'
        })

        // v15: Diagnostic Logging baseline. Adds activity/export diagnostics without merging them into audit logs.
        this.version(15).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, updatedAt, sourceUrl, deletedAt, expiresAt, deletedBy, preTrashStatus, [status+deletedAt], [status+expiresAt]',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, mimeType, category, profileId, contentHash, refCount, lifecycle, orphanedAt, createdAt, updatedAt, *tags, [profileId+contentHash], [profileId+category], [profileId+lifecycle]',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]',
            profiles: 'id, name, dbNamespace, status, fileRootStatus, createdAt, updatedAt, lastActiveAt, deletedAt, sourceAccountId',
            profileSharedTemplates: 'id, name, version, createdAt, updatedAt',
            profileSharedExportPresets: 'id, name, platform, createdAt, updatedAt',
            profileSharedAIConfigs: 'id, provider, createdAt, updatedAt',
            performanceSamples: 'id, profileId, metric, status, sampledAt, createdAt, [profileId+sampledAt], [profileId+metric], [profileId+status]',
            performanceDegradationEvents: 'id, profileId, metric, level, status, createdAt, sampleId, [profileId+createdAt], [profileId+metric], [profileId+status]',
            assetRefs: 'id, assetId, profileId, referrerKind, referrerId, createdAt, updatedAt, [assetId+referrerId], [profileId+assetId]',
            comments: 'id, docId, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            marginNotes: 'id, docId, paragraphIndex, authorId, createdAt, updatedAt, [docId+paragraphIndex]',
            trackChanges: 'id, docId, kind, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            activityLogs: 'id, timestamp, level, module, event, scope, profileId, windowId, sessionId, correlationId, createdAt, [level+timestamp], [module+timestamp], [profileId+timestamp]',
            exportLogs: 'id, timestamp, profileId, format, target, outcome, activityLogId, diagnosticPackageId, createdAt, [profileId+timestamp], [outcome+timestamp]'
        })
        // v16: Layout Persistence baseline. Adds profile/window-scoped local UI layout state outside sync payloads.
        this.version(16).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, updatedAt, sourceUrl, deletedAt, expiresAt, deletedBy, preTrashStatus, [status+deletedAt], [status+expiresAt]',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, mimeType, category, profileId, contentHash, refCount, lifecycle, orphanedAt, createdAt, updatedAt, *tags, [profileId+contentHash], [profileId+category], [profileId+lifecycle]',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]',
            profiles: 'id, name, dbNamespace, status, fileRootStatus, createdAt, updatedAt, lastActiveAt, deletedAt, sourceAccountId',
            profileSharedTemplates: 'id, name, version, createdAt, updatedAt',
            profileSharedExportPresets: 'id, name, platform, createdAt, updatedAt',
            profileSharedAIConfigs: 'id, provider, createdAt, updatedAt',
            performanceSamples: 'id, profileId, metric, status, sampledAt, createdAt, [profileId+sampledAt], [profileId+metric], [profileId+status]',
            performanceDegradationEvents: 'id, profileId, metric, level, status, createdAt, sampleId, [profileId+createdAt], [profileId+metric], [profileId+status]',
            assetRefs: 'id, assetId, profileId, referrerKind, referrerId, createdAt, updatedAt, [assetId+referrerId], [profileId+assetId]',
            comments: 'id, docId, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            marginNotes: 'id, docId, paragraphIndex, authorId, createdAt, updatedAt, [docId+paragraphIndex]',
            trackChanges: 'id, docId, kind, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            activityLogs: 'id, timestamp, level, module, event, scope, profileId, windowId, sessionId, correlationId, createdAt, [level+timestamp], [module+timestamp], [profileId+timestamp]',
            exportLogs: 'id, timestamp, profileId, format, target, outcome, activityLogId, diagnosticPackageId, createdAt, [profileId+timestamp], [outcome+timestamp]',
            layoutStates: 'id, profileId, windowId, layoutVersion, savedAt, updatedAt, [profileId+windowId], [profileId+savedAt]'
        })
        // v17: WikiLink backlink baseline. Adds derived local backlink index; source Markdown remains authoritative.
        this.version(17).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, updatedAt, sourceUrl, deletedAt, expiresAt, deletedBy, preTrashStatus, [status+deletedAt], [status+expiresAt]',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, mimeType, category, profileId, contentHash, refCount, lifecycle, orphanedAt, createdAt, updatedAt, *tags, [profileId+contentHash], [profileId+category], [profileId+lifecycle]',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]',
            profiles: 'id, name, dbNamespace, status, fileRootStatus, createdAt, updatedAt, lastActiveAt, deletedAt, sourceAccountId',
            profileSharedTemplates: 'id, name, version, createdAt, updatedAt',
            profileSharedExportPresets: 'id, name, platform, createdAt, updatedAt',
            profileSharedAIConfigs: 'id, provider, createdAt, updatedAt',
            performanceSamples: 'id, profileId, metric, status, sampledAt, createdAt, [profileId+sampledAt], [profileId+metric], [profileId+status]',
            performanceDegradationEvents: 'id, profileId, metric, level, status, createdAt, sampleId, [profileId+createdAt], [profileId+metric], [profileId+status]',
            assetRefs: 'id, assetId, profileId, referrerKind, referrerId, createdAt, updatedAt, [assetId+referrerId], [profileId+assetId]',
            comments: 'id, docId, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            marginNotes: 'id, docId, paragraphIndex, authorId, createdAt, updatedAt, [docId+paragraphIndex]',
            trackChanges: 'id, docId, kind, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            activityLogs: 'id, timestamp, level, module, event, scope, profileId, windowId, sessionId, correlationId, createdAt, [level+timestamp], [module+timestamp], [profileId+timestamp]',
            exportLogs: 'id, timestamp, profileId, format, target, outcome, activityLogId, diagnosticPackageId, createdAt, [profileId+timestamp], [outcome+timestamp]',
            layoutStates: 'id, profileId, windowId, layoutVersion, savedAt, updatedAt, [profileId+windowId], [profileId+savedAt]',
            backlinks: 'id, sourceArticleId, targetArticleId, targetTitle, resolved, updatedAt, [targetArticleId+updatedAt], [sourceArticleId+updatedAt], [targetTitle+updatedAt]'
        })
        // v18: Snippet System baseline. Adds user-authored local snippets without seeding product data.
        this.version(18).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, updatedAt, sourceUrl, deletedAt, expiresAt, deletedBy, preTrashStatus, [status+deletedAt], [status+expiresAt]',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, mimeType, category, profileId, contentHash, refCount, lifecycle, orphanedAt, createdAt, updatedAt, *tags, [profileId+contentHash], [profileId+category], [profileId+lifecycle]',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]',
            profiles: 'id, name, dbNamespace, status, fileRootStatus, createdAt, updatedAt, lastActiveAt, deletedAt, sourceAccountId',
            profileSharedTemplates: 'id, name, version, createdAt, updatedAt',
            profileSharedExportPresets: 'id, name, platform, createdAt, updatedAt',
            profileSharedAIConfigs: 'id, provider, createdAt, updatedAt',
            performanceSamples: 'id, profileId, metric, status, sampledAt, createdAt, [profileId+sampledAt], [profileId+metric], [profileId+status]',
            performanceDegradationEvents: 'id, profileId, metric, level, status, createdAt, sampleId, [profileId+createdAt], [profileId+metric], [profileId+status]',
            assetRefs: 'id, assetId, profileId, referrerKind, referrerId, createdAt, updatedAt, [assetId+referrerId], [profileId+assetId]',
            comments: 'id, docId, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            marginNotes: 'id, docId, paragraphIndex, authorId, createdAt, updatedAt, [docId+paragraphIndex]',
            trackChanges: 'id, docId, kind, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            activityLogs: 'id, timestamp, level, module, event, scope, profileId, windowId, sessionId, correlationId, createdAt, [level+timestamp], [module+timestamp], [profileId+timestamp]',
            exportLogs: 'id, timestamp, profileId, format, target, outcome, activityLogId, diagnosticPackageId, createdAt, [profileId+timestamp], [outcome+timestamp]',
            layoutStates: 'id, profileId, windowId, layoutVersion, savedAt, updatedAt, [profileId+windowId], [profileId+savedAt]',
            backlinks: 'id, sourceArticleId, targetArticleId, targetTitle, resolved, updatedAt, [targetArticleId+updatedAt], [sourceArticleId+updatedAt], [targetTitle+updatedAt]',
            snippets: 'id, type, trigger, triggerCaseSensitive, scopeType, usageCount, updatedAt, lastUsedAt, *tags, [type+trigger], [scopeType+updatedAt]'
        })
        // v19: Tag System baseline. Adds account-scoped tags and doc_tags many-to-many relations.
        this.version(19).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, updatedAt, sourceUrl, deletedAt, expiresAt, deletedBy, preTrashStatus, [status+deletedAt], [status+expiresAt]',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, mimeType, category, profileId, contentHash, refCount, lifecycle, orphanedAt, createdAt, updatedAt, *tags, [profileId+contentHash], [profileId+category], [profileId+lifecycle]',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]',
            profiles: 'id, name, dbNamespace, status, fileRootStatus, createdAt, updatedAt, lastActiveAt, deletedAt, sourceAccountId',
            profileSharedTemplates: 'id, name, version, createdAt, updatedAt',
            profileSharedExportPresets: 'id, name, platform, createdAt, updatedAt',
            profileSharedAIConfigs: 'id, provider, createdAt, updatedAt',
            performanceSamples: 'id, profileId, metric, status, sampledAt, createdAt, [profileId+sampledAt], [profileId+metric], [profileId+status]',
            performanceDegradationEvents: 'id, profileId, metric, level, status, createdAt, sampleId, [profileId+createdAt], [profileId+metric], [profileId+status]',
            assetRefs: 'id, assetId, profileId, referrerKind, referrerId, createdAt, updatedAt, [assetId+referrerId], [profileId+assetId]',
            comments: 'id, docId, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            marginNotes: 'id, docId, paragraphIndex, authorId, createdAt, updatedAt, [docId+paragraphIndex]',
            trackChanges: 'id, docId, kind, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            activityLogs: 'id, timestamp, level, module, event, scope, profileId, windowId, sessionId, correlationId, createdAt, [level+timestamp], [module+timestamp], [profileId+timestamp]',
            exportLogs: 'id, timestamp, profileId, format, target, outcome, activityLogId, diagnosticPackageId, createdAt, [profileId+timestamp], [outcome+timestamp]',
            layoutStates: 'id, profileId, windowId, layoutVersion, savedAt, updatedAt, [profileId+windowId], [profileId+savedAt]',
            backlinks: 'id, sourceArticleId, targetArticleId, targetTitle, resolved, updatedAt, [targetArticleId+updatedAt], [sourceArticleId+updatedAt], [targetTitle+updatedAt]',
            snippets: 'id, type, trigger, triggerCaseSensitive, scopeType, usageCount, updatedAt, lastUsedAt, *tags, [type+trigger], [scopeType+updatedAt]',
            tags: 'id, accountId, name, normalizedName, color, docCount, createdAt, updatedAt, [accountId+normalizedName], [accountId+docCount]',
            docTags: 'id, docId, tagId, addedAt, [docId+tagId], [tagId+docId]'
        })

        // v20: Tauri Updater skip-version table. Adds durable updater skip records without touching content or settings payloads.
        this.version(20).stores({
            categories: 'id, name, createdAt',
            articles: 'id, categoryId, status, createdAt, updatedAt, sourceUrl, deletedAt, expiresAt, deletedBy, preTrashStatus, [status+deletedAt], [status+expiresAt]',
            contents: 'id, articleId, createdAt',
            documents: 'id, categoryId, status, createdAt, updatedAt',
            versions: 'id, documentId, createdAt',
            assets: 'id, articleId, type, name, mimeType, category, profileId, contentHash, refCount, lifecycle, orphanedAt, createdAt, updatedAt, *tags, [profileId+contentHash], [profileId+category], [profileId+lifecycle]',
            accounts: 'id, name, email, status, createdAt, updatedAt, lastActiveAt',
            recoveryPoints: 'id, articleId, createdAt, trigger, consumed, sourceEmergencyKey',
            ftue: 'id, kind, step, helpKey, updatedAt, seenAt',
            syncOutbox: 'id, articleId, operation, status, providerId, profileId, [articleId+operation+status], [profileId+status], createdAt, updatedAt, nextRetryAt',
            syncLogs: 'id, providerId, profileId, operation, status, startedAt, finishedAt, createdAt',
            syncConflicts: 'id, docId, profileId, providerId, status, detectedAt, [profileId+status], createdAt, updatedAt',
            auditLogs: 'id, profileId, action, severity, outcome, timestamp, docId, resourceId, resourceKind, entryHash, prevHash, [profileId+timestamp], [profileId+action], [profileId+docId], [profileId+severity]',
            resourcePermissions: 'id, profileId, resourceKind, resourceId, level, updatedAt, [resourceKind+resourceId], [profileId+resourceKind]',
            extensions: 'id, profileId, extensionId, status, enabled, installedAt, updatedAt, [profileId+extensionId], [profileId+status]',
            extensionStorage: 'id, profileId, extensionId, key, updatedAt, [profileId+extensionId], [profileId+extensionId+key]',
            profiles: 'id, name, dbNamespace, status, fileRootStatus, createdAt, updatedAt, lastActiveAt, deletedAt, sourceAccountId',
            profileSharedTemplates: 'id, name, version, createdAt, updatedAt',
            profileSharedExportPresets: 'id, name, platform, createdAt, updatedAt',
            profileSharedAIConfigs: 'id, provider, createdAt, updatedAt',
            performanceSamples: 'id, profileId, metric, status, sampledAt, createdAt, [profileId+sampledAt], [profileId+metric], [profileId+status]',
            performanceDegradationEvents: 'id, profileId, metric, level, status, createdAt, sampleId, [profileId+createdAt], [profileId+metric], [profileId+status]',
            assetRefs: 'id, assetId, profileId, referrerKind, referrerId, createdAt, updatedAt, [assetId+referrerId], [profileId+assetId]',
            comments: 'id, docId, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            marginNotes: 'id, docId, paragraphIndex, authorId, createdAt, updatedAt, [docId+paragraphIndex]',
            trackChanges: 'id, docId, kind, status, authorId, createdAt, updatedAt, [docId+status], [docId+createdAt]',
            activityLogs: 'id, timestamp, level, module, event, scope, profileId, windowId, sessionId, correlationId, createdAt, [level+timestamp], [module+timestamp], [profileId+timestamp]',
            exportLogs: 'id, timestamp, profileId, format, target, outcome, activityLogId, diagnosticPackageId, createdAt, [profileId+timestamp], [outcome+timestamp]',
            layoutStates: 'id, profileId, windowId, layoutVersion, savedAt, updatedAt, [profileId+windowId], [profileId+savedAt]',
            backlinks: 'id, sourceArticleId, targetArticleId, targetTitle, resolved, updatedAt, [targetArticleId+updatedAt], [sourceArticleId+updatedAt], [targetTitle+updatedAt]',
            snippets: 'id, type, trigger, triggerCaseSensitive, scopeType, usageCount, updatedAt, lastUsedAt, *tags, [type+trigger], [scopeType+updatedAt]',
            tags: 'id, accountId, name, normalizedName, color, docCount, createdAt, updatedAt, [accountId+normalizedName], [accountId+docCount]',
            docTags: 'id, docId, tagId, addedAt, [docId+tagId], [tagId+docId]',
            updaterSkipped: 'version, skippedAt, reason'
        })
    }
}

export const db = new InkForgeDB()

// 闂佸磭鍎ら崝蹇涘疾閺屻儱鐓涢柟鑸妽濞呮粓鏌嶉悜妯哄闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸?
// 闂佺粯顨呴悧濠傦耿閹殿喚涓嶉柨娑樺閸婄偤鏌￠崼婵埿㈠┑?
// 闂佸磭鍎ら崝蹇涘疾閺屻儱鐓涢柟鑸妽濞呮粓鏌嶉悜妯哄闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸闁硅埇鍔嶅▍婊堟煃閻戞ê濮€闁哄懏鐓￠崺锟犲箛閵婏附鐝抽梺宕囧劋閸斿繘寮查弻銉ョ厸?

/** 濠殿噯绲界换瀣煂濠婂牆妫橀柛銉ｅ妸閳ь剙鍊块幆鍐礋椤掍椒绮繝銏犵垻閸涱収鏆梺鍝勭墱閸撴岸寮抽悢鍏肩厒闊洦绋掗娆撴煕閹烘洦鍟囩紒杈ㄧ懄缁傛帗鎯旈敍鍕闂佺绻堥崝鎴﹀储閵堝洨纾炬い鏃傗拡閸ゃ倝鏌涜箛瀣姷缂佽鲸绱榠ngle Source of Truth闂?*/
const MAX_VERSIONS_PER_DOCUMENT = VERSION_MANAGEMENT.MAX_VERSIONS_PER_DOCUMENT

/** 闂佺粯顨呴悧濠傦耿娴兼潙鏋佸ù鍏兼綑濞呫倝鎮归埀顒勬晝閳ь剟骞夐敓鐘斥挀闁割偅绺鹃崑鎾舵兜妞嬪海顦╂繛瀵稿Т妤犳悂鎮鹃妸鈺佺闁靛ň鏅涚敮宕囩磽閸愭儳鏋涙い鏇憾瀹曟濡烽婊咁槴 */
const VERSION_WARNING_THRESHOLD = VERSION_MANAGEMENT.VERSION_WARNING_THRESHOLD

/**
 * 闂佺粯顨呴悧濠傦耿閻楀牏鈹嶆繝闈涙閹界姷绱撴担瑙勫鞍闁诲繐顦甸弫宥夊醇濠靛棛妯侀梺鍛婂嚬閸嬪顢楅悢鐓庡窛濠电姳妞掔换鍡涙煙椤撗冪伈缂?
 */
export interface SaveVersionResult {
    version: DocumentVersion
    /** 闂佺粯顨呴悧濠傦耿娴兼潙鏋佸ù鍏兼綑濞呫倝鎮归埀顒勬晝閳ь剟骞夐敓鐘虫櫖闁割偆鍠庢径宥夊级閳哄倸鐏ｇ紒妤€鍊垮浠嬪箛椤撶噥妲柡澶嗘櫆閺屻劌煤閺嶎厽鏅?*/
    warning?: {
        message: string
        currentCount: number
        maxCount: number
        /** 閻庣偣鍊濈紓姘额敊閸涘瓨鏅慨妯夸含閺嬪倸顪冮妶鍛煟闁革絽鎽滈幉鐗堟媴閸濆嫷鏆梺鍝勭墱閸撴岸宕归妸褉鍋撻悽闈涘付闁搞値鍘藉鍕炊閿曗偓閺?*/
        suggestions: string[]
    }
}

/**
 * 闂佺粯顨呴悧濠傦耿娴煎瓨鍋愰柤鍝ヮ暯閸嬫挻鎷呴摎鍌滅畾闂?
 */
export interface VersionStatus {
    documentId: string
    currentCount: number
    maxCount: number
    /** 闂佸憡鐟崹浼村垂瑜版帗鈷旈柕鍫濇处閻ｉ亶鏌ｅΔ鈧悧濠傦耿娴兼潙鏋侀悽顖ｅ枤缁€鍕⒒閸垹浠滈柛銊ョ仛閹便劎鈧絻鍔夐崑鎾寸瑹閳ь剙顭囬鍡欑＞妞ゆ洍鍋撻柕鍡楋躬閺?*/
    deletableCount: number
    /** 閻庤鐡曠亸娆撴偪閸℃ǜ浜滈柛鎾茬劍閻ｉ亶鏌ｅΔ鈧悧濠傦耿娴兼潙鏋?*/
    pinnedCount: number
    /** 闂佸搫瀚烽崹浼村箚娓氣偓楠炴帡濡烽妸褏顔呮繛鎴炴尭閿曨亜顬?*/
    isNearLimit: boolean
    /** 闁荤姭鍋撻柨鏇楀亾闁规祴鈧枼妲堥柛顐ゅ枍缁辨牠鏌ㄥ妯煎妞も敪鍥у嚑婵犲﹤瀚径宥夊级閳哄倸鐏ｇ紒妤€鍊垮浠嬪箛閸撲胶顦?*/
    warningMessage?: string
}

/**
 * 闂佹眹鍨婚崰鎰板垂濮樿泛鑸规い鏍ㄧ懅椤?ID闂佹寧绋戦悧鍛箾閸ヮ剚鍋ㄩ柕濞垮妽绾埖顨ラ悙鎻掓毐鐟滅増鎸冲畷妤呮偂鎼搭喖鏅ｉ梺?UUID 闂佹眹鍨婚崰鎰板垂濮樿埖鏅?
 */
function generatePrefixedId(prefix: string): string {
    // 闂佸憡鍔曢幊鎾寸?fallback 闂備緡鍓欓悘婵嬪储閵堝拋鍤楁い蹇撴缁犳艾銆掑顓犵畾缂佸倸妫濋弫宥夊锤婵?ts 闂佸搫瀚烽崹鎵姳瀹曞洣娌柛灞句腹娓氣偓瀹曠螖鐎ｎ剛顦?
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
 * 闂佸憡甯楃粙鎴犵磽閹捐妫橀柣妤€鐗婇悗顔戒繆?
 * @param title - 闂佸搫鍊稿ú锕傚Υ閸岀偛鍐€闁搞儺鍓﹂弳?
 * @param content - 闂佸搫鍊稿ú锕傚Υ閸岀偛绀冮柛娑卞弾閸熷洭鏌ㄥ妯煎鐟滅増鐓￠弻鍛緞濞戞氨顦?
 * @returns 闂佸憡甯楃粙鎴犵磽閹剧粯鍎嶉柛鏇ㄥ墯閻庮喗淇婂Δ瀣埌妞ゆ洦鍠氶幐?
 * @throws ZodError 婵犵鈧啿鈧綊鎮樻径瀣秶闁规儳鍟垮鍐参旈悩鑼劮闁伙箑顦板鍕綇椤愩儛?
 */
export async function createDocument(title: string, content: string = ''): Promise<Document> {
    // 闁哄鏅滈崝姗€銆侀幋锕€绫嶉柟顖涘缂堝鏌涜箛瀣姦闁绘稒鐟ч幏鐘崇瑹婵犲嫮顦╅梻鍌氬暙瀵爼顢楀姘儱闁告稑鐡ㄥВ鎰板级閸喐灏柛娆忔楠炲寮介妸銈囧闂佽婢樼换鎰板船鐎电硶鍋撻崷顓燁仧缂?
    const validated = CreateDocumentDTOSchema.parse({ title, content })

    const now = new Date()
    const docId = generatePrefixedId('doc')
    const versionId = generatePrefixedId('v')

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

    // 婵炶揪缍€濞夋洟寮妶鍡欘洸閻庯綆浜滈～銈囩棯椤撗冩灆缂佺粯宀稿畷銏ゆ偄妞嬪孩鎲ら梺?
    await db.transaction('rw', [db.documents, db.versions], async () => {
        await db.documents.add(doc)
        await db.versions.add(version)
    })

    return doc
}

/**
 * 婵烇絽娲︾换鍌炴偤閵娾晛妫橀柛銉ｅ妸閳ь剙鍊块幃褔宕奸悢鍛婂闂佹寧绋戦悧鍡涙偨椤愩倖濯伴柨鏇楀亾闁硅绻濋獮鎾诲箛椤旇桨绮甸梺?
 * @returns 婵烇絽娲︾换鍌炴偤閵娧呯＜闁规儳顕禍顖炴煥濞戞瀚伴悗鍨耿瀹曘儵顢曢妶鍜佹毉闂佸搫鐗滈崜娆擃敋椤旂偓瀵柍銉ㄦ珪鐎氭煡鏌涘▎妯虹仴闁稿繑锕㈤幆鍐礋椤曞懎濡抽梺鍛婄閿曪絾绌辨繝鍥х畳?
 */
export async function saveVersion(
    documentId: string,
    content: string,
    title: string,
    description: string = 'New version'
): Promise<SaveVersionResult> {
    const now = new Date()

    // 婵炶揪缍€濞夋洟寮妶鍥╃＜闁绘柨澧庨閬嶆煟閵娿儱顏褎顨婂鐢割敆娴ｅ搫鐏辩紓浣圭〒閸嬫捇鎮х粙娆惧殨?
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

    // 婵炶揪缍€濞夋洟寮妶鍡欘洸閻庯綆浜滈～銈囩棯椤撗冩灆缂佺粯宀稿畷銏ゆ偄妞嬪孩鎲ら梺?
    await db.transaction('rw', [db.versions, db.documents], async () => {
        await db.versions.add(version)
        await db.documents.update(documentId, {
            currentVersionId: version.id,
            content,
            title,
            updatedAt: now
        })

        // 闂佺粯顨呴悧濠傦耿娴兼潙鏋佸ù鍏兼綑濞呫倝姊婚崟顒€濮囬柛鈺傤殜閺佸秴顫濆畷鍥嗐垽寮堕埡浣圭煑缂佹鍊垮浠嬪箛椤撶噥妲梺鍛婂笧婵炩偓婵炲懎閰ｅ鐢稿焵椤掑嫬绫嶇憸蹇撯枔閹达附顥堥柣鎰絻閻忋儱鈹戦纰卞剳濠⒀勵殜瀵?
        const totalVersions = await db.versions.where('documentId').equals(documentId).count()
        if (totalVersions > MAX_VERSIONS_PER_DOCUMENT) {
            // 闂佸吋鍎抽崲鑼躲亹閸ヮ剙绠ラ柍褜鍓熷鍨緞鐏炵瓔鏆梺鍝勭墱閸撱劎妲愬┑瀣濠㈣泛锕ら悘锛勨偓鐐瑰€楅崕銈咁渻閸岀偞鈷掗柡澶嬪灥绾炬娊骞栭弶鎴犵閻㈩垱鎹囧畷姘旂€ｎ剛顦╅梺鍝勭墐閸嬫捇鏌￠崘鍕暞闊剟鏌涢幘宕団枌缂?
            const allVersions = await db.versions
                .where('documentId')
                .equals(documentId)
                .sortBy('createdAt')

            // 闁荤姳绶ょ槐鏇㈡偩婵犳碍顥嗛柍褜鍓涢幉鐗堟媴缁嬭法浠奸梻鍌氬閸婃鈻撻幋锕€鏋佸ù鍏兼綑濞?
            const deleteCount = totalVersions - MAX_VERSIONS_PER_DOCUMENT

            // 缂備焦绋掗惄顖炲焵椤掆偓椤︻垵銇愰弻銉ョ闁绘绮悵鐔兼煟閵娿儱顏褎顨婂鐢割敆婵犲嫮顦╅梺鍦劋鐢€斥枍?isInit 闂佸憡甯楃换鍌烇綖閹扮増鍋嬮柛顐ゅ枑閹烽亶鏌?isPinned 缂傚倸鍠氶崳锝夊Υ婵犲洦鍋嬮柛顐ゅ枑閹烽亶鏌?
            const deletableVersions = allVersions.filter(v => !v.isInit && !v.isPinned)
            const versionsToDelete = deletableVersions.slice(0, deleteCount)

            // 闂佸綊娼х紞濠囧闯濞差亜绀嗛柣妯肩帛閻濈喖鏌￠崼姘壕闂佸搫鍞查崨顔炬殸闂佺粯顨呴悧濠傦耿?
            if (versionsToDelete.length > 0) {
                await db.versions.bulkDelete(versionsToDelete.map(v => v.id))
            }

            finalCount = totalVersions - versionsToDelete.length
        }
    })

    // 闂佸搫顑呯€氼剛绱撻幘瀛樹氦闁哄倹瀵х粈鈧紓鍌欑劍閹稿鎮?
    const result: SaveVersionResult = { version }

    // Build a warning when version history is close to the configured retention limit.
    const warningThreshold = Math.floor(MAX_VERSIONS_PER_DOCUMENT * VERSION_WARNING_THRESHOLD)
    if (finalCount >= warningThreshold) {
        result.warning = {
            message: `Version history reached ${finalCount}/${MAX_VERSIONS_PER_DOCUMENT}; close to the configured limit`,
            currentCount: finalCount,
            maxCount: MAX_VERSIONS_PER_DOCUMENT,
            suggestions: [
                'Pin important versions so they are not cleaned automatically',
                'Export important version backups',
                'Clean old versions that are no longer needed'
            ]
        }
    }

    return result
}

/**
 * 闂佸吋鍎抽崲鑼躲亹閸ヮ剙妫橀柛銉ｅ妸閳ь剙鍊块幃褔宕奸悢鍛婂闂佺粯顭堥崺鏍焵?
 * @param documentId - 闂佸搫鍊稿ú锕傚Υ?ID
 * @returns 闂佺粯顨呴悧濠傦耿娴煎瓨鍋愰柤鍝ヮ暯閸嬫挻鎷呴摎鍌滅畾闂?
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
            status.warningMessage = `Version history reached ${currentCount}/${MAX_VERSIONS_PER_DOCUMENT}; ${pinnedCount} pinned, ${deletableCount} can be cleaned automatically`
        }

        return status
    } catch (error) {
        logger.error('Failed to read version status', { documentId, error })
        throw error
    }
}

/**
 * 闁诲海鏁搁崢褔宕甸銏犵鐎广儱瀚粙濠囨煛婢跺﹤鏆ｆ俊鎯ф惈铻為柍褜鍓熷?
 * 缂佺虎鍙庨崰鏇犳崲濮樻墎鍋撻悽闈涘付闁搞値鍙冮獮娆忣吋閸曨厾鈻曢梺鍝勭墕椤︾敻鍩€椤掆偓閸婂摜绱炵€ｎ喗鍎嶉柛鏇ㄥ墯缂嶁偓闂傚倸瀚崝娆撴偘濞嗘垶瀚?
 */
export interface ExportOptions {
    /** 闂佸搫瀚烽崹浼村箚娴ｇ儤宕夐悗鍦Х缁犳牠鏌℃径濠傛殻婵℃儳鎼灋闁逞屽墴瀵濡烽婊咁槱婵炲濮撮幊妯侯瀶濞差亜绀冮柛娑欐綑閸斻儵鎮圭€ｎ亜鏆熼柡浣靛€濋弫?*/
    skipPermissionCheck?: boolean
    /** Call source for audit */
    source?: string
}

/**
 * 婵°倗濮撮惌渚€鎯佹径灞稿亾閻㈤潧甯堕柛銈庡弮瀵爼宕橀绛嬧偓?
 * @param versionId - 闂佺粯顨呴悧濠傦耿?ID
 * @param options - 闁诲海鏁搁崢褔宕甸銏＄劵濠㈣埖鍔戦埀?
 * @throws Error 婵犵鈧啿鈧綊鎮樻径鎰骇闁告劦鍠楅娆徫旈悩鑼劮闁伙箑顦板鍕綇椤愩儛?
 */
async function validateExportPermission(versionId: string, options: ExportOptions = {}): Promise<void> {
    if (options.skipPermissionCheck) {
        // 闁荤姳鐒﹀妯肩礊瀹ュ绀冮柛娑欐綑閸斻儵鎮圭€ｎ亜鏆熼柡浣靛€濋幆鍐礋椤愵偄鎮侀柣鐘辫閸撴繂螞閳哄嫮鐤€?
        logger.info('[SECURITY AUDIT] Export permission bypass requested', {
            versionId,
            source: options.source || 'internal',
            timestamp: new Date().toISOString()
        })
        return
    }

    // 闁荤姳鐒﹀妯肩礊瀹ュ洠鍋撻悽闈涘付闁搞値鍙冮獮娆忣吋閸曨厾鈻曢柣搴劃閵堝骸鎮侀梺鍝勫暔閸庤京鎹?
    logger.info('[SECURITY AUDIT] Export permission check requested', {
        versionId,
        source: options.source || 'user',
        timestamp: new Date().toISOString()
    })
}

/**
 * Export a document version as JSON.
 * @param versionId - 闂佺粯顨呴悧濠傦耿?ID
 * @param options - 闁诲海鏁搁崢褔宕甸銏＄劵濠㈣埖鍔戦埀顒€绉归弫宥夊醇濠靛棛妯侀梺鍛婂嚬閸嬪懎顭囬崼銉︹挃闁归偊鍘兼禒姗€鏌涢幒鏇ㄥ晣缂?
 * @returns JSON export payload or null when the version does not exist.
 * @security 闂佸憡鐗曢幊搴ㄥ箚閸儱绾ч柛鎰靛枟椤庢瑥螖閻樿尙鐒烽柣锕€顦靛畷顏嗕沪缁涘鎮侀柣鐘辫閸撴繂螞閳哄嫮鐤€?
 */
export async function exportVersion(versionId: string, options: ExportOptions = {}): Promise<string | null> {
    try {
        // 闂佸搫顦崯鏉戭瀶閻戞﹩娈界€光偓閸愵亝顫?
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
        logger.error('Failed to export version JSON', { versionId, error })
        throw error
    }
}

/**
 * 闁诲海鏁搁崢褔宕甸銏犵闁绘灏欏Σ鏇㈡煟濡も偓閻楀﹤锕㈡导瀛樻櫖闁割偁鍨洪弳蹇撁瑰鍐€楅柣锝冨姂瀹曟濡搁妷顔叫ｆ繛瀵稿У閺嬭崵妲?
 * @param versionId - 闂佺粯顨呴悧濠傦耿?ID
 * @param options - 闁诲海鏁搁崢褔宕甸銏＄劵濠㈣埖鍔戦埀顒€绉归弫宥夊醇濠靛棛妯侀梺鍛婂嚬閸嬪懎顭囬崼銉︹挃闁归偊鍘兼禒姗€鏌涢幒鏇ㄥ晣缂?
 * @returns 闂佸憡姊绘慨鎾儊閹达箑瑙﹂幖杈剧稻閻ｉ亶鎮楅悽闈涘付闁搞値鍙冨顐︽偋閸繄銈﹂梺鎸庣閼活垶銆呰瀵顭ㄩ崨顓ф毉闂佸搫鐗滈崗娑氱箔婢跺备鍋撳娅亜锕㈤鍛氦闁哄倹瀵х粈鈧?null
 * @description 婵炶揪缍€濞夋洟寮?AES-GCM-256 闂佸憡姊绘慨鎾儊閹达箑鏋侀煫鍥ㄦ煥婵℃娊鏌涢幇顒佸櫣妞ゆ梹鍔欓弫宥呯暆閸曨儷鈺傛叏濠靛嫬鐏╂い锔诲墯缁傛帡鎳為妷褜鏁熼梻?
 * @security 闂佸憡鐗曢幊搴ㄥ箚閸儱绾ч柛鎰靛枟椤庢瑥螖閻樿尙鐒烽柣锕€顦靛畷顏嗕沪缁涘鎮侀柣鐘辫閸撴繂螞閳哄嫮鐤€?
 */
export async function exportVersionEncrypted(versionId: string, options: ExportOptions = {}): Promise<{
    exportedAt: string
    encrypted: boolean
    data: string
} | null> {
    // 闂佸搫顦崯鏉戭瀶閻戞﹩娈界€光偓閸愵亝顫?
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

    // 闂佸憡姊绘慨鎾儊閹达箑鏋侀煫鍥ㄦ煥婵℃娊鏌涢幇顒佸櫣妞?
    const encryptedResult = await encrypt(plainData)

    return {
        exportedAt: new Date().toISOString(),
        encrypted: encryptedResult.__encrypted,
        data: encryptedResult.data
    }
}

