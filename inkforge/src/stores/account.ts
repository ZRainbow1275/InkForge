import { computed, onScopeDispose, ref } from 'vue'
import { defineStore } from 'pinia'
import { z } from 'zod'
import {
  createAccount as createAccountRecord,
  db,
  deleteAccount as removeAccount,
  getAccount,
  getActivityLogs,
  getSettingsProfiles,
  getSyncLogs,
  type Account,
  type AssetRecord,
  updateAccount as persistAccountUpdate,
} from '@/utils/db'
import { generateId } from '@/utils/uuid'
import { logger } from '@/services/error'
import { useSettingsStore } from '@/stores/settings'

const DEFAULT_ACCOUNT_ID = 'local-default'
const AVATAR_SIZE = 200
const MAX_AVATAR_SIZE = 5 * 1024 * 1024

const AccountUpdateSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  email: z.string().trim().email().or(z.literal('')).optional(),
  bio: z.string().trim().max(200).optional(),
  avatarBlobId: z.string().nullable().optional(),
})

type AccountUpdateInput = z.infer<typeof AccountUpdateSchema>

export const useAccountStore = defineStore('account', () => {
  const settingsStore = useSettingsStore()

  const accounts = ref<Account[]>([])
  const currentAccount = ref<Account | null>(null)
  const avatarUrl = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function revokeAvatarUrl(): void {
    if (avatarUrl.value) {
      URL.revokeObjectURL(avatarUrl.value)
      avatarUrl.value = null
    }
  }

  async function ensureDefaultAccount(): Promise<Account> {
    const existing = await getAccount(DEFAULT_ACCOUNT_ID)
    if (existing) {
      return existing
    }

    return createAccountRecord({
      id: DEFAULT_ACCOUNT_ID,
      name: 'InkForge 用户',
      email: '',
      bio: '',
      avatarBlobId: null,
    })
  }

  async function syncAvatarUrl(): Promise<void> {
    revokeAvatarUrl()

    const avatarBlobId = currentAccount.value?.avatarBlobId
    if (!avatarBlobId) {
      return
    }

    const asset = await db.assets.get(avatarBlobId)
    if (!asset) {
      return
    }

    avatarUrl.value = URL.createObjectURL(asset.blob)
  }

  async function listAccounts(): Promise<Account[]> {
    try {
      accounts.value = await db.accounts.orderBy('updatedAt').reverse().toArray()
      return accounts.value
    } catch (err) {
      error.value = '加载账户列表失败'
      logger.error('加载账户列表失败', err)
      return []
    }
  }

  async function loadAccount(accountId: string = settingsStore.settings.account.profileId): Promise<Account | null> {
    loading.value = true
    error.value = null

    try {
      const fallbackAccount = await ensureDefaultAccount()
      const nextAccount = await getAccount(accountId) ?? fallbackAccount
      currentAccount.value = nextAccount
      settingsStore.settings.account.profileId = nextAccount.id
      await syncAvatarUrl()
      await listAccounts()
      return nextAccount
    } catch (err) {
      error.value = '加载账户失败'
      logger.error('加载账户失败', err)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateAccount(updates: AccountUpdateInput): Promise<Account | null> {
    if (!currentAccount.value) {
      return null
    }

    const validated = AccountUpdateSchema.parse(updates)

    try {
      await persistAccountUpdate(currentAccount.value.id, validated)
      return loadAccount(currentAccount.value.id)
    } catch (err) {
      error.value = '更新账户失败'
      logger.error('更新账户失败', err, { accountId: currentAccount.value.id })
      return null
    }
  }

  async function saveAvatarAsset(blob: Blob): Promise<AssetRecord> {
    const now = new Date()
    const asset: AssetRecord = {
      id: generateId(),
      articleId: null,
      name: `avatar-${now.getTime()}.png`,
      type: 'image',
      mimeType: 'image/png',
      size: blob.size,
      blob,
      thumbnail: blob,
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      tags: ['avatar', 'account'],
      createdAt: now,
      updatedAt: now,
    }

    await db.assets.put(asset)
    return asset
  }

  async function updateAvatar(file: File): Promise<Account | null> {
    if (file.size > MAX_AVATAR_SIZE) {
      throw new Error('头像图片不能超过 5MB')
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('头像必须是图片文件')
    }

    const normalizedAvatar = await cropAvatarToSquare(file)
    const nextAsset = await saveAvatarAsset(normalizedAvatar)
    const previousAvatarId = currentAccount.value?.avatarBlobId
    const updatedAccount = await updateAccount({ avatarBlobId: nextAsset.id })

    if (previousAvatarId && previousAvatarId !== nextAsset.id) {
      await db.assets.delete(previousAvatarId)
    }

    return updatedAccount
  }

  async function switchAccount(accountId: string): Promise<Account | null> {
    const nextAccount = await getAccount(accountId)

    if (!nextAccount) {
      error.value = '目标账户不存在'
      return null
    }

    settingsStore.settings.account.profileId = nextAccount.id
    settingsStore.save()
    return loadAccount(nextAccount.id)
  }

  async function createNewAccount(input: { name: string; email?: string; bio?: string }): Promise<Account | null> {
    const normalizedName = input.name.trim()
    if (!normalizedName) {
      throw new Error('账户名称不能为空')
    }

    try {
      const account = await createAccountRecord({
        name: normalizedName,
        email: (input.email ?? '').trim(),
        bio: (input.bio ?? '').trim(),
        avatarBlobId: null,
      })
      await listAccounts()
      await switchAccount(account.id)
      return account
    } catch (err) {
      error.value = '创建账户失败'
      logger.error('创建账户失败', err)
      return null
    }
  }

  async function createAccount(input: { name: string; email?: string; bio?: string }): Promise<Account | null> {
    return createNewAccount(input)
  }

  async function exportAccountData(): Promise<string> {
    const account = currentAccount.value ?? await loadAccount()

    const [articles, categories, contents, documents, versions, assets, syncLogs, activityLogs, settingsProfiles] =
      await Promise.all([
        db.articles.toArray(),
        db.categories.toArray(),
        db.contents.toArray(),
        db.documents.toArray(),
        db.versions.toArray(),
        db.assets.toArray(),
        getSyncLogs(),
        getActivityLogs(200),
        getSettingsProfiles(),
      ])

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      account,
      settings: settingsStore.settings,
      data: {
        articles,
        categories,
        contents,
        documents,
        versions,
        assets,
        syncLogs,
        activityLogs,
        settingsProfiles,
      },
    }, null, 2)
  }

  async function deleteCurrentAccount(): Promise<void> {
    const accountId = currentAccount.value?.id
    if (!accountId) {
      return
    }

    try {
      const avatarBlobId = currentAccount.value?.avatarBlobId

      if (accountId === DEFAULT_ACCOUNT_ID) {
        await persistAccountUpdate(DEFAULT_ACCOUNT_ID, {
          name: 'InkForge 用户',
          email: '',
          bio: '',
          avatarBlobId: null,
        })
      } else {
        await removeAccount(accountId)
      }

      if (avatarBlobId) {
        await db.assets.delete(avatarBlobId)
      }

      await loadAccount(DEFAULT_ACCOUNT_ID)
      await listAccounts()
    } catch (err) {
      error.value = '删除账户失败'
      logger.error('删除账户失败', err, { accountId })
      throw err
    }
  }

  const displayName = computed(() => currentAccount.value?.name || 'InkForge 用户')
  const avatarInitial = computed(() => displayName.value.trim().charAt(0).toUpperCase() || 'I')

  onScopeDispose(() => {
    revokeAvatarUrl()
  })

  return {
    accounts,
    currentAccount,
    avatarUrl,
    loading,
    error,
    displayName,
    avatarInitial,
    ensureDefaultAccount,
    listAccounts,
    loadAccount,
    switchAccount,
    createNewAccount,
    createAccount,
    updateAccount,
    updateAvatar,
    exportAccountData,
    deleteCurrentAccount,
    cleanup: revokeAvatarUrl,
  }
})

async function cropAvatarToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = AVATAR_SIZE
      canvas.height = AVATAR_SIZE

      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('无法初始化头像裁剪画布'))
        URL.revokeObjectURL(image.src)
        return
      }

      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
      const sourceX = (image.naturalWidth - sourceSize) / 2
      const sourceY = (image.naturalHeight - sourceSize) / 2

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        AVATAR_SIZE,
        AVATAR_SIZE,
      )

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(image.src)

        if (!blob) {
          reject(new Error('头像裁剪失败'))
          return
        }

        resolve(blob)
      }, 'image/png', 0.92)
    }

    image.onerror = () => {
      URL.revokeObjectURL(image.src)
      reject(new Error('头像图片读取失败'))
    }

    image.src = URL.createObjectURL(file)
  })
}
