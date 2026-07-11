import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_ACCOUNT_ID, useAccountStore } from '@/stores/account'
import { useSyncStore } from '@/stores/sync'
import type { AccountRecord } from '@/utils/db'
import {
  DEFAULT_PROFILE_ID,
  PROFILE_SOFT_DELETE_RETENTION_MS,
  isRecoverableDeletedProfile,
  profileRepository,
  type ProfileCreateInput,
  type ProfileRecord,
} from '@/services/profile'

const ACTIVE_PROFILE_STORAGE_KEY = 'inkforge.activeProfileId'

function getStoredActiveProfileId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY)
}

function setStoredActiveProfileId(profileId: string): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileId)
}

export const useProfileStore = defineStore('profile', () => {
  const profiles = ref<ProfileRecord[]>([])
  const activeProfileId = ref<string | null>(null)
  const previousProfileId = ref<string | null>(null)
  const isLoading = ref(false)
  const isSwitching = ref(false)
  const error = ref<string | null>(null)
  const lastActionMessage = ref<string | null>(null)

  const sortedProfiles = computed(() => profiles.value.filter(profile => profile.status === 'active'))
  const deletedProfiles = computed(() => profiles.value.filter(profile => isRecoverableDeletedProfile(profile)))
  const activeProfile = computed(() => profiles.value.find(profile => profile.id === activeProfileId.value && profile.status === 'active') ?? null)
  const profileCount = computed(() => sortedProfiles.value.length)
  const deletedProfileCount = computed(() => deletedProfiles.value.length)
  const canDeleteActiveProfile = computed(() => profileCount.value > 1)

  const syncStore = useSyncStore()

  function setActiveProfile(profileId: string): void {
    syncStore.setProfile(profileId)
    activeProfileId.value = profileId
    setStoredActiveProfileId(profileId)
  }

  function getById(profileId: string): ProfileRecord | undefined {
    return profiles.value.find(profile => profile.id === profileId)
  }

  async function refreshLists(): Promise<void> {
    const [active, deleted] = await Promise.all([
      profileRepository.listProfiles(),
      profileRepository.listDeletedRecoverable(),
    ])
    profiles.value = [...active, ...deleted]
  }

  async function resolveAccount(account?: AccountRecord): Promise<AccountRecord> {
    if (account) {
      return account
    }
    const accountStore = useAccountStore()
    return accountStore.currentAccount ?? await accountStore.ensureDefaultAccount()
  }

  function chooseActiveProfile(defaultProfile: ProfileRecord): ProfileRecord {
    const storedId = getStoredActiveProfileId()
    const stored = storedId ? profiles.value.find(profile => profile.id === storedId && profile.status === 'active') : undefined
    const chosen = stored ?? profiles.value.find(profile => profile.id === defaultProfile.id && profile.status === 'active') ?? sortedProfiles.value[0] ?? defaultProfile
    setActiveProfile(chosen.id)
    return chosen
  }

  async function loadProfiles(account?: AccountRecord): Promise<ProfileRecord> {
    isLoading.value = true
    error.value = null
    try {
      const resolvedAccount = await resolveAccount(account)
      const defaultProfile = await profileRepository.ensureDefaultProfileFromAccount(resolvedAccount)
      await refreshLists()
      return chooseActiveProfile(defaultProfile)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '工作区初始化失败'
      error.value = message
      throw caught
    } finally {
      isLoading.value = false
    }
  }

  async function createProfile(input: ProfileCreateInput, actorId?: string): Promise<ProfileRecord> {
    isLoading.value = true
    error.value = null
    lastActionMessage.value = null
    try {
      const accountStore = useAccountStore()
      const actor = actorId ?? activeProfileId.value ?? accountStore.currentAccount?.id ?? DEFAULT_ACCOUNT_ID
      const created = await profileRepository.createProfile(input, actor)
      await refreshLists()
      previousProfileId.value = activeProfileId.value
      setActiveProfile(created.id)
      lastActionMessage.value = `已创建并切换到工作区：${created.name}`
      return created
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '创建工作区失败'
      error.value = message
      throw caught
    } finally {
      isLoading.value = false
    }
  }

  async function switchProfile(profileId: string, actorId?: string): Promise<ProfileRecord> {
    if (profileId === activeProfileId.value) {
      const current = activeProfile.value
      if (!current) {
        throw new Error('当前工作区不存在')
      }
      return current
    }

    isSwitching.value = true
    error.value = null
    lastActionMessage.value = null
    try {
      const switched = await profileRepository.switchProfile(profileId, actorId ?? activeProfileId.value ?? profileId)
      previousProfileId.value = activeProfileId.value
      setActiveProfile(switched.id)
      await refreshLists()
      lastActionMessage.value = `已切换到工作区：${switched.name}`
      return switched
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '切换工作区失败'
      error.value = message
      throw caught
    } finally {
      isSwitching.value = false
    }
  }

  async function softDeleteProfile(profileId: string, actorId?: string): Promise<ProfileRecord> {
    isLoading.value = true
    error.value = null
    lastActionMessage.value = null
    try {
      const deleted = await profileRepository.softDeleteProfile(profileId, actorId ?? activeProfileId.value ?? profileId)
      await refreshLists()
      if (activeProfileId.value === profileId) {
        const fallback = sortedProfiles.value[0]
        setActiveProfile(fallback?.id ?? DEFAULT_PROFILE_ID)
      }
      lastActionMessage.value = `工作区已进入 7 天恢复期：${deleted.name}`
      return deleted
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '删除工作区失败'
      error.value = message
      throw caught
    } finally {
      isLoading.value = false
    }
  }

  async function restoreProfile(profileId: string, actorId?: string): Promise<ProfileRecord> {
    isLoading.value = true
    error.value = null
    lastActionMessage.value = null
    try {
      const restored = await profileRepository.restoreProfile(profileId, actorId ?? activeProfileId.value ?? profileId)
      await refreshLists()
      lastActionMessage.value = `已恢复工作区：${restored.name}`
      return restored
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '恢复工作区失败'
      error.value = message
      throw caught
    } finally {
      isLoading.value = false
    }
  }

  function daysUntilPermanentDelete(profile: ProfileRecord): number | null {
    if (profile.status !== 'deleted' || typeof profile.deletedAt !== 'number') {
      return null
    }
    const remaining = PROFILE_SOFT_DELETE_RETENTION_MS - (Date.now() - profile.deletedAt)
    return Math.max(0, Math.ceil(remaining / 86_400_000))
  }

  return {
    profiles,
    activeProfileId,
    previousProfileId,
    isLoading,
    isSwitching,
    error,
    lastActionMessage,
    sortedProfiles,
    deletedProfiles,
    activeProfile,
    profileCount,
    deletedProfileCount,
    canDeleteActiveProfile,
    loadProfiles,
    createProfile,
    switchProfile,
    softDeleteProfile,
    restoreProfile,
    daysUntilPermanentDelete,
    getById,
  }
})
