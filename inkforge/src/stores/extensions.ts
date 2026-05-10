import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  extensionHost,
  extensionRepository,
  type ExtensionRecord,
  type ExtensionStorageRecord,
  type ExtensionStorageValue,
} from '@/services/extensions'
import { DEFAULT_ACCOUNT_ID } from './account'

export const useExtensionStore = defineStore('extensions', () => {
  const records = ref<ExtensionRecord[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastActionMessage = ref<string | null>(null)

  const installedCount = computed(() => records.value.length)
  const enabledCount = computed(() => records.value.filter(record => record.enabled && record.status === 'enabled').length)
  const blockedCount = computed(() => records.value.filter(record => record.status === 'blocked').length)
  const errorCount = computed(() => records.value.filter(record => record.status === 'error').length)
  const hasExtensions = computed(() => records.value.length > 0)

  async function load(profileId = DEFAULT_ACCOUNT_ID): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      records.value = await extensionRepository.listByProfile(profileId)
    } catch (err) {
      error.value = getErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function installLocalManifest(input: unknown, profileId = DEFAULT_ACCOUNT_ID, actorId = profileId): Promise<ExtensionRecord> {
    const record = await extensionHost.installLocalManifest(input, { profileId, actorId })
    await load(profileId)
    lastActionMessage.value = `已安装本地扩展 ${record.manifest.name}`
    return record
  }

  async function enableExtension(profileId: string, extensionId: string, actorId = profileId): Promise<ExtensionRecord> {
    const result = await extensionHost.enableExtension(profileId, extensionId, actorId)
    await load(profileId)
    lastActionMessage.value = result.message
    return result.record
  }

  async function disableExtension(profileId: string, extensionId: string, actorId = profileId): Promise<ExtensionRecord> {
    const result = await extensionHost.disableExtension(profileId, extensionId, actorId)
    await load(profileId)
    lastActionMessage.value = result.message
    return result.record
  }

  async function uninstallExtension(profileId: string, extensionId: string, actorId = profileId): Promise<void> {
    await extensionHost.uninstallExtension(profileId, extensionId, actorId)
    await load(profileId)
    lastActionMessage.value = `已卸载扩展 ${extensionId}`
  }

  async function getStorage(profileId: string, extensionId: string, key: string): Promise<ExtensionStorageValue | undefined> {
    return extensionRepository.getStorage(profileId, extensionId, key)
  }

  async function setStorage(profileId: string, extensionId: string, key: string, value: ExtensionStorageValue): Promise<ExtensionStorageRecord> {
    return extensionRepository.setStorage(profileId, extensionId, key, value)
  }

  async function clearStorage(profileId: string, extensionId: string): Promise<void> {
    await extensionRepository.clearStorage(profileId, extensionId)
  }

  return {
    records,
    isLoading,
    error,
    lastActionMessage,
    installedCount,
    enabledCount,
    blockedCount,
    errorCount,
    hasExtensions,
    load,
    installLocalManifest,
    enableExtension,
    disableExtension,
    uninstallExtension,
    getStorage,
    setStorage,
    clearStorage,
  }
})

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
