import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { logger } from '@/services/error'
import {
  versionBundleRepository,
  type CreateVersionSnapshotRequest,
  type VersionCleanupPolicy,
  type VersionCleanupResult,
  type VersionListItem,
  type VersionMarkdownExportOptions,
  type VersionRestoreProposal,
} from '@/services/version-bundle'
import type { Version } from '@/types'

interface VersionBundleActionState {
  kind: 'load' | 'snapshot' | 'milestone' | 'delete' | 'cleanup' | 'export' | 'restoreProposal'
  contentId: string
  versionId?: string
  affectedCount: number
  at: Date
}

export const useVersionBundleStore = defineStore('versionBundle', () => {
  const activeContentId = ref<string | null>(null)
  const versions = ref<VersionListItem[]>([])
  const restoreProposal = ref<VersionRestoreProposal | null>(null)
  const lastExport = ref<string | null>(null)
  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)
  const lastAction = ref<VersionBundleActionState | null>(null)

  const totalCount = computed(() => versions.value.length)
  const milestoneCount = computed(() => versions.value.filter(version => version.isMilestone).length)
  const hasVersions = computed(() => versions.value.length > 0)

  function captureError(err: unknown, message: string): never {
    const resolved = err instanceof Error ? err.message : String(err)
    error.value = resolved
    logger.error(message, err)
    throw err
  }

  async function refresh(contentId: string = activeContentId.value ?? ''): Promise<VersionListItem[]> {
    if (!contentId) return []
    versions.value = await versionBundleRepository.listVersions(contentId)
    activeContentId.value = contentId
    return versions.value
  }

  async function loadVersions(contentId: string): Promise<VersionListItem[]> {
    isLoading.value = true
    error.value = null
    try {
      const result = await refresh(contentId)
      lastAction.value = { kind: 'load', contentId, affectedCount: result.length, at: new Date() }
      return result
    } catch (err) {
      captureError(err, 'Load version bundle failed')
    } finally {
      isLoading.value = false
    }
  }

  async function createSnapshot(contentId: string, request: CreateVersionSnapshotRequest): Promise<Version | null> {
    isMutating.value = true
    error.value = null
    try {
      const version = request.force
        ? await versionBundleRepository.forceCreateVersion(contentId, request)
        : await versionBundleRepository.createVersionIfChanged(contentId, request)
      await refresh(contentId)
      lastAction.value = { kind: 'snapshot', contentId, versionId: version?.id, affectedCount: version ? 1 : 0, at: new Date() }
      return version
    } catch (err) {
      captureError(err, 'Create version snapshot failed')
    } finally {
      isMutating.value = false
    }
  }

  async function setMilestone(contentId: string, versionId: string, label?: string): Promise<Version> {
    isMutating.value = true
    error.value = null
    try {
      const version = await versionBundleRepository.setMilestone(contentId, versionId, label)
      await refresh(contentId)
      lastAction.value = { kind: 'milestone', contentId, versionId, affectedCount: 1, at: new Date() }
      return version
    } catch (err) {
      captureError(err, 'Set version milestone failed')
    } finally {
      isMutating.value = false
    }
  }

  async function deleteVersion(contentId: string, versionId: string): Promise<void> {
    isMutating.value = true
    error.value = null
    try {
      await versionBundleRepository.deleteVersion(contentId, versionId)
      await refresh(contentId)
      lastAction.value = { kind: 'delete', contentId, versionId, affectedCount: 1, at: new Date() }
    } catch (err) {
      captureError(err, 'Delete version failed')
    } finally {
      isMutating.value = false
    }
  }

  async function cleanupVersions(contentId: string, policy: VersionCleanupPolicy = {}): Promise<VersionCleanupResult> {
    isMutating.value = true
    error.value = null
    try {
      const result = await versionBundleRepository.cleanupVersions(contentId, policy)
      await refresh(contentId)
      lastAction.value = { kind: 'cleanup', contentId, affectedCount: result.removedIds.length, at: new Date() }
      return result
    } catch (err) {
      captureError(err, 'Cleanup versions failed')
    } finally {
      isMutating.value = false
    }
  }

  async function exportMarkdown(contentId: string, versionId: string, options: VersionMarkdownExportOptions = {}): Promise<string> {
    isMutating.value = true
    error.value = null
    try {
      const markdown = await versionBundleRepository.exportVersionMarkdown(contentId, versionId, options)
      lastExport.value = markdown
      lastAction.value = { kind: 'export', contentId, versionId, affectedCount: 1, at: new Date() }
      return markdown
    } catch (err) {
      captureError(err, 'Export version markdown failed')
    } finally {
      isMutating.value = false
    }
  }

  async function buildRestoreProposal(contentId: string, versionId: string): Promise<VersionRestoreProposal> {
    isMutating.value = true
    error.value = null
    try {
      const proposal = await versionBundleRepository.buildRestoreProposal(contentId, versionId)
      restoreProposal.value = proposal
      lastAction.value = { kind: 'restoreProposal', contentId, versionId, affectedCount: 1, at: new Date() }
      return proposal
    } catch (err) {
      captureError(err, 'Build restore proposal failed')
    } finally {
      isMutating.value = false
    }
  }

  function clearRestoreProposal(): void {
    restoreProposal.value = null
  }

  return {
    activeContentId,
    versions,
    restoreProposal,
    lastExport,
    isLoading,
    isMutating,
    error,
    lastAction,
    totalCount,
    milestoneCount,
    hasVersions,
    loadVersions,
    refresh,
    createSnapshot,
    setMilestone,
    deleteVersion,
    cleanupVersions,
    exportMarkdown,
    buildRestoreProposal,
    clearRestoreProposal,
  }
})