import { defineStore } from 'pinia'
import { computed, onScopeDispose, ref } from 'vue'
import { z } from 'zod'
import type { Article, Category, EditedContent } from '@/types'
import { AppError, ErrorCode, logger } from '@/services/error'
import { auditLog } from '@/services/audit'
import { profileRepository } from '@/services/profile'
import { db, type AccountRecord, type AssetRecord, type Document, type DocumentVersion } from '@/utils/db'
import { generateId } from '@/utils/uuid'

export const DEFAULT_ACCOUNT_ID = 'local-default'

const CURRENT_ACCOUNT_STORAGE_KEY = 'inkforge.currentAccountId'
const AVATAR_SIZE = 200
const MAX_AVATAR_SOURCE_BYTES = 5 * 1024 * 1024
const SUPPORTED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])

export interface AccountProfileInput {
    name: string
    email?: string
    bio?: string
}

export type AccountProfileData = AccountProfileInput

export const accountProfileInputSchema = z.object({
    name: z.string().min(1, '显示名称不能为空').max(50, '显示名称最多 50 个字符'),
    email: z.string().email('请输入有效邮箱地址').optional(),
    bio: z.string().max(200, '简介最多 200 个字符').optional(),
}) satisfies z.ZodType<AccountProfileData>

export interface AccountSecurityCapability {
    id: 'local-password' | 'windows-hello' | 'remote-sync'
    label: string
    status: 'planned' | 'disabled'
    description: string
}

export const accountSecurityCapabilities: AccountSecurityCapability[] = [
    {
        id: 'local-password',
        label: '本地密码',
        status: 'planned',
        description: '本地密码与高危操作二次确认将在后续安全切片接入。',
    },
    {
        id: 'windows-hello',
        label: 'Windows Hello',
        status: 'planned',
        description: '平台认证只作为本地密钥解锁入口，当前不会伪装为已启用。',
    },
    {
        id: 'remote-sync',
        label: '远程同步',
        status: 'disabled',
        description: '当前版本保持纯本地账户，不接入远程认证或云端 Profile。',
    },
]

type AssetExportRecord = Omit<AssetRecord, 'blob' | 'thumbnail'> & {
    blobSize: number
    thumbnailSize?: number
}

export interface AccountDataExport {
    exportedAt: string
    formatVersion: 1
    activeAccountId: string
    profile: AccountRecord
    accounts: AccountRecord[]
    localWorkspace: {
        categories: Category[]
        articles: Article[]
        contents: EditedContent[]
        documents: Document[]
        versions: DocumentVersion[]
        assets: AssetExportRecord[]
        avatarDataUrl?: string
    }
}

function normalizeAccountInput(data: AccountProfileInput): AccountProfileData {
    const name = data.name.trim()
    const email = data.email?.trim()
    const bio = data.bio?.trim()

    return {
        name,
        email: email && email.length > 0 ? email : undefined,
        bio: bio && bio.length > 0 ? bio : undefined,
    }
}

function parseAccountInput(data: AccountProfileInput): AccountProfileData {
    const normalized = normalizeAccountInput(data)
    const result = accountProfileInputSchema.safeParse(normalized)
    if (result.success) {
        return result.data
    }

    throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        result.error.issues[0]?.message ?? '账户资料验证失败',
        { issues: result.error.issues }
    )
}

function isActiveAccount(account: AccountRecord): boolean {
    return account.status === 'active'
}

function sortAccounts(list: AccountRecord[]): AccountRecord[] {
    return [...list].sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())
}

function createDefaultAccount(now = new Date()): AccountRecord {
    return {
        id: DEFAULT_ACCOUNT_ID,
        name: '本地账户',
        profileKind: 'local',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastActiveAt: now,
    }
}

function getStoredCurrentAccountId(): string | null {
    if (typeof window === 'undefined') {
        return null
    }

    return window.localStorage.getItem(CURRENT_ACCOUNT_STORAGE_KEY)
}

function setStoredCurrentAccountId(accountId: string): void {
    if (typeof window === 'undefined') {
        return
    }

    window.localStorage.setItem(CURRENT_ACCOUNT_STORAGE_KEY, accountId)
}

function toAssetExportRecord(asset: AssetRecord): AssetExportRecord {
    const { blob, thumbnail, ...metadata } = asset
    return {
        ...metadata,
        blobSize: blob.size,
        thumbnailSize: thumbnail?.size,
    }
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result)
                return
            }
            reject(new Error('头像导出结果格式无效'))
        }
        reader.onerror = () => reject(new Error('头像导出失败'))
        reader.readAsDataURL(blob)
    })
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const image = new Image()
        image.onload = () => {
            URL.revokeObjectURL(url)
            resolve(image)
        }
        image.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new AppError(ErrorCode.VALIDATION_ERROR, '无法读取头像图片'))
        }
        image.src = url
    })
}

async function cropAvatarToPng(file: File): Promise<Blob> {
    if (file.size > MAX_AVATAR_SOURCE_BYTES) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, '头像文件不能超过 5 MB')
    }

    if (!SUPPORTED_AVATAR_TYPES.has(file.type)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, '头像仅支持 PNG、JPG、WEBP')
    }

    const image = await loadImage(file)
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
    const sourceX = Math.round((image.naturalWidth - sourceSize) / 2)
    const sourceY = Math.round((image.naturalHeight - sourceSize) / 2)
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE

    const context = canvas.getContext('2d')
    if (!context) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, '当前环境无法处理头像裁剪')
    }

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, AVATAR_SIZE, AVATAR_SIZE)

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob)
                return
            }
            reject(new AppError(ErrorCode.VALIDATION_ERROR, '头像裁剪失败'))
        }, 'image/png')
    })
}

export const useAccountStore = defineStore('account', () => {
    const accounts = ref<AccountRecord[]>([])
    const currentAccount = ref<AccountRecord | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)
    const avatarUrl = ref<string | null>(null)

    let currentAvatarObjectUrl: string | null = null

    const displayName = computed(() => currentAccount.value?.name ?? '本地账户')

    const avatarInitial = computed(() => {
        const normalized = displayName.value.trim()
        return normalized.length > 0 ? normalized.slice(0, 1).toUpperCase() : 'I'
    })

    function clearAvatarUrl(): void {
        if (currentAvatarObjectUrl) {
            URL.revokeObjectURL(currentAvatarObjectUrl)
            currentAvatarObjectUrl = null
        }
        avatarUrl.value = null
    }

    async function refreshAvatarUrl(account = currentAccount.value): Promise<void> {
        clearAvatarUrl()
        if (!account?.avatarAssetId) {
            return
        }

        const asset = await db.assets.get(account.avatarAssetId)
        if (!asset) {
            return
        }

        currentAvatarObjectUrl = URL.createObjectURL(asset.blob)
        avatarUrl.value = currentAvatarObjectUrl
    }

    async function readActiveAccounts(): Promise<AccountRecord[]> {
        const rows = await db.accounts.toArray()
        return sortAccounts(rows.filter(isActiveAccount))
    }

    async function listAccounts(): Promise<AccountRecord[]> {
        try {
            const rows = await readActiveAccounts()
            accounts.value = rows
            return rows
        } catch (caught) {
            logger.error('读取本地账户列表失败', caught)
            throw caught
        }
    }

    async function setCurrentAccount(account: AccountRecord): Promise<void> {
        currentAccount.value = account
        setStoredCurrentAccountId(account.id)
        await refreshAvatarUrl(account)
    }

    async function ensureDefaultAccount(): Promise<AccountRecord> {
        loading.value = true
        error.value = null
        try {
            let rows = await readActiveAccounts()
            if (rows.length === 0) {
                const account = createDefaultAccount()
                await db.accounts.put(account)
                rows = [account]
            }

            accounts.value = rows
            const storedAccountId = getStoredCurrentAccountId()
            const selected = rows.find(account => account.id === storedAccountId)
                ?? rows.find(account => account.id === DEFAULT_ACCOUNT_ID)
                ?? rows[0]
            await profileRepository.ensureDefaultProfileFromAccount(selected)
            await setCurrentAccount(selected)
            return selected
        } catch (caught) {
            error.value = caught instanceof Error ? caught.message : '账户初始化失败'
            logger.error('本地账户初始化失败', caught)
            throw caught
        } finally {
            loading.value = false
        }
    }

    async function loadAccount(accountId?: string): Promise<AccountRecord> {
        const targetAccountId = accountId ?? getStoredCurrentAccountId() ?? DEFAULT_ACCOUNT_ID
        const account = await db.accounts.get(targetAccountId)
        if (!account || !isActiveAccount(account)) {
            return ensureDefaultAccount()
        }

        await setCurrentAccount(account)
        await listAccounts()
        return account
    }

    async function createNewAccount(data: AccountProfileInput): Promise<AccountRecord> {
        const parsed = parseAccountInput(data)
        const now = new Date()
        const account: AccountRecord = {
            id: generateId(),
            name: parsed.name,
            email: parsed.email,
            bio: parsed.bio,
            profileKind: 'local',
            status: 'active',
            createdAt: now,
            updatedAt: now,
            lastActiveAt: now,
        }

        await db.accounts.add(account)
        await profileRepository.ensureDefaultProfileFromAccount(account)
        accounts.value = sortAccounts([account, ...accounts.value])
        await setCurrentAccount(account)
        await auditLog('account.create', {
            actorId: account.id,
            profileId: account.id,
            severity: 'info',
            outcome: 'success',
            payload: { profileKind: account.profileKind, hasEmail: Boolean(account.email) },
            source: 'useAccountStore.createNewAccount',
        })
        return account
    }

    async function switchAccount(accountId: string): Promise<void> {
        const account = await db.accounts.get(accountId)
        if (!account || !isActiveAccount(account)) {
            throw new AppError(ErrorCode.DB_NOT_FOUND, '目标本地账户不存在或已删除', { accountId })
        }

        const now = new Date()
        const nextAccount: AccountRecord = {
            ...account,
            lastActiveAt: now,
            updatedAt: now,
        }
        await db.accounts.update(accountId, {
            lastActiveAt: now,
            updatedAt: now,
        })
        await profileRepository.ensureDefaultProfileFromAccount(nextAccount)
        await setCurrentAccount(nextAccount)
        await listAccounts()
        await auditLog('account.switch', {
            actorId: nextAccount.id,
            profileId: nextAccount.id,
            severity: 'info',
            outcome: 'success',
            payload: { accountId: nextAccount.id },
            source: 'useAccountStore.switchAccount',
        })
    }

    async function updateAccount(updates: AccountProfileInput): Promise<AccountRecord> {
        const base = currentAccount.value ?? await ensureDefaultAccount()
        const parsed = parseAccountInput(updates)
        const nextAccount: AccountRecord = {
            ...base,
            name: parsed.name,
            email: parsed.email,
            bio: parsed.bio,
            updatedAt: new Date(),
        }

        await db.accounts.put(nextAccount)
        await profileRepository.ensureDefaultProfileFromAccount(nextAccount)
        await setCurrentAccount(nextAccount)
        accounts.value = sortAccounts(accounts.value.map(account => account.id === nextAccount.id ? nextAccount : account))
        await auditLog('account.settings_change', {
            actorId: nextAccount.id,
            profileId: nextAccount.id,
            severity: 'info',
            outcome: 'success',
            payload: { changedFields: Object.keys(parsed), hasEmail: Boolean(nextAccount.email) },
            source: 'useAccountStore.updateAccount',
        })
        return nextAccount
    }

    async function updateAvatar(file: File): Promise<AssetRecord> {
        const account = currentAccount.value ?? await ensureDefaultAccount()
        const blob = await cropAvatarToPng(file)
        const now = new Date()
        const asset: AssetRecord = {
            id: generateId(),
            articleId: null,
            name: `${account.id}-avatar.png`,
            type: 'image',
            mimeType: 'image/png',
            size: blob.size,
            blob,
            thumbnail: blob,
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            tags: ['account-avatar', account.id],
            createdAt: now,
            updatedAt: now,
        }

        await db.transaction('rw', [db.assets, db.accounts], async () => {
            await db.assets.add(asset)
            await db.accounts.update(account.id, {
                avatarAssetId: asset.id,
                updatedAt: now,
            })
        })

        const nextAccount: AccountRecord = {
            ...account,
            avatarAssetId: asset.id,
            updatedAt: now,
        }
        currentAccount.value = nextAccount
        accounts.value = accounts.value.map(item => item.id === nextAccount.id ? nextAccount : item)
        await refreshAvatarUrl(nextAccount)
        return asset
    }

    async function exportAccountData(): Promise<AccountDataExport> {
        const account = currentAccount.value ?? await ensureDefaultAccount()
        const allAccounts = await db.accounts.toArray()
        const [categories, articles, contents, documents, versions, assets] = await Promise.all([
            db.categories.toArray(),
            db.articles.toArray(),
            db.contents.toArray(),
            db.documents.toArray(),
            db.versions.toArray(),
            db.assets.toArray(),
        ])

        const avatarAsset = account.avatarAssetId
            ? assets.find(asset => asset.id === account.avatarAssetId)
            : undefined

        await auditLog('account.export', {
            actorId: account.id,
            profileId: account.id,
            severity: 'warning',
            outcome: 'success',
            payload: {
                accountCount: allAccounts.length,
                categoryCount: categories.length,
                articleCount: articles.length,
                documentCount: documents.length,
                assetCount: assets.length,
            },
            source: 'useAccountStore.exportAccountData',
        })

        return {
            exportedAt: new Date().toISOString(),
            formatVersion: 1,
            activeAccountId: account.id,
            profile: account,
            accounts: allAccounts,
            localWorkspace: {
                categories,
                articles,
                contents,
                documents,
                versions,
                assets: assets.map(toAssetExportRecord),
                avatarDataUrl: avatarAsset ? await blobToDataUrl(avatarAsset.blob) : undefined,
            },
        }
    }

    async function deleteCurrentAccount(): Promise<void> {
        const account = currentAccount.value ?? await ensureDefaultAccount()
        const now = new Date()

        if (account.id === DEFAULT_ACCOUNT_ID) {
            const resetAccount: AccountRecord = {
                ...createDefaultAccount(account.createdAt),
                updatedAt: now,
                lastActiveAt: now,
            }
            await db.accounts.put(resetAccount)
            await setCurrentAccount(resetAccount)
            accounts.value = [resetAccount]
            await auditLog('account.delete', {
                actorId: resetAccount.id,
                profileId: resetAccount.id,
                severity: 'critical',
                outcome: 'partial',
                reason: 'default-account-reset-instead-of-delete',
                payload: { accountId: account.id },
                source: 'useAccountStore.deleteCurrentAccount',
            })
            return
        }

        await db.accounts.update(account.id, {
            status: 'deleted',
            deletedAt: now,
            updatedAt: now,
        })

        let rows = await readActiveAccounts()
        if (rows.length === 0) {
            const fallback = createDefaultAccount(now)
            await db.accounts.put(fallback)
            rows = [fallback]
        }

        accounts.value = rows
        await auditLog('account.delete', {
            actorId: account.id,
            profileId: account.id,
            severity: 'critical',
            outcome: 'success',
            payload: { accountId: account.id, fallbackCount: rows.length },
            source: 'useAccountStore.deleteCurrentAccount',
        })
        const fallback = rows.find(item => item.id === DEFAULT_ACCOUNT_ID) ?? rows[0]
        await switchAccount(fallback.id)
    }

    onScopeDispose(clearAvatarUrl)

    return {
        accounts,
        currentAccount,
        loading,
        error,
        avatarUrl,
        displayName,
        avatarInitial,
        ensureDefaultAccount,
        loadAccount,
        listAccounts,
        createNewAccount,
        switchAccount,
        updateAccount,
        updateAvatar,
        exportAccountData,
        deleteCurrentAccount,
        clearAvatarUrl,
    }
})
