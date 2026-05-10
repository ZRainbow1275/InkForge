import type { EditedContent, Version } from '@/types'
import { contentRepository } from '@/services/repository'
import { AppError, ErrorCode, logger } from '@/services/error'
import { buildVersionSnapshot, computeVersionDiff, isSameVersionPayload } from './diff'
import {
  VERSION_BUNDLE_DEFAULTS,
  type CreateVersionSnapshotRequest,
  type RecoveryCheckpointPayload,
  type VersionCleanupPolicy,
  type VersionCleanupResult,
  type VersionListItem,
  type VersionMarkdownExportOptions,
  type VersionRestoreProposal,
} from './types'

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value)
}

function findCurrentVersion(content: EditedContent): Version | null {
  return content.versions.find(version => version.id === content.currentVersionId) ?? content.versions[content.versions.length - 1] ?? null
}

function sortByCreatedDesc(versions: Version[]): Version[] {
  return [...versions].sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
}

function toListItem(version: Version, previous: Version | null): VersionListItem {
  const createdAt = toDate(version.createdAt)
  const previousAt = previous ? toDate(previous.createdAt) : null
  return {
    id: version.id,
    label: version.label,
    deltaChars: version.deltaChars ?? (version.body.length - (previous?.body.length ?? 0)),
    wordCount: version.wordCount ?? 0,
    isMilestone: version.isMilestone === true,
    trigger: version.trigger ?? null,
    authorId: version.authorId ?? null,
    createdAt,
    updatedAt: version.updatedAt ? toDate(version.updatedAt) : null,
    elapsedMs: previousAt ? createdAt.getTime() - previousAt.getTime() : null,
  }
}

function escapeFrontmatterValue(value: string): string {
  return JSON.stringify(value)
}

export class VersionBundleRepository {
  async loadContent(contentId: string): Promise<EditedContent> {
    const content = await contentRepository.findById(contentId)
    if (!content) {
      throw new AppError(ErrorCode.DB_READ_FAILED, 'Version content not found', { contentId })
    }
    return content
  }

  async findContentByArticleId(articleId: string): Promise<EditedContent> {
    const content = await contentRepository.findByArticleId(articleId)
    if (!content) {
      throw new AppError(ErrorCode.DB_READ_FAILED, 'Version article content not found', { articleId })
    }
    return content
  }

  async listVersions(contentId: string): Promise<VersionListItem[]> {
    const content = await this.loadContent(contentId)
    const ascending = [...content.versions].sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime())
    const previousById = new Map<string, Version | null>()
    ascending.forEach((version, index) => previousById.set(version.id, index > 0 ? ascending[index - 1] : null))
    return sortByCreatedDesc(content.versions).map(version => toListItem(version, previousById.get(version.id) ?? null))
  }

  async createVersionIfChanged(contentId: string, request: CreateVersionSnapshotRequest): Promise<Version | null> {
    return this.createVersion(contentId, { ...request, force: false })
  }

  async forceCreateVersion(contentId: string, request: CreateVersionSnapshotRequest): Promise<Version> {
    const version = await this.createVersion(contentId, { ...request, force: true })
    if (!version) {
      throw new AppError(ErrorCode.DB_WRITE_FAILED, 'Forced version snapshot was not created', { contentId })
    }
    return version
  }

  private async createVersion(contentId: string, request: CreateVersionSnapshotRequest): Promise<Version | null> {
    const content = await this.loadContent(contentId)
    const currentVersion = findCurrentVersion(content)
    const snapshotSource = {
      title: request.title ?? content.title,
      body: request.body ?? content.body,
      transcript: request.transcript ?? content.transcript,
    }

    if (!request.force && isSameVersionPayload(currentVersion, snapshotSource)) {
      return null
    }

    const version = buildVersionSnapshot(
      {
        title: content.title,
        body: content.body,
        transcript: content.transcript,
        versions: content.versions,
        currentVersionId: content.currentVersionId,
      },
      request,
      currentVersion,
    )
    const nextContent: EditedContent = {
      ...content,
      title: version.title,
      body: version.body,
      transcript: version.transcript,
      versions: [...content.versions, version],
      currentVersionId: version.id,
      updatedAt: request.now ?? new Date(),
    }

    await contentRepository.update(content.id, nextContent)
    return version
  }

  async setMilestone(contentId: string, versionId: string, label?: string, now: Date = new Date()): Promise<Version> {
    const content = await this.loadContent(contentId)
    let updatedVersion: Version | null = null
    const versions = content.versions.map(version => {
      if (version.id !== versionId) return version
      updatedVersion = {
        ...version,
        label: label?.trim() || version.label,
        isMilestone: true,
        updatedAt: now,
      }
      return updatedVersion
    })

    if (!updatedVersion) {
      throw new AppError(ErrorCode.DB_READ_FAILED, 'Version not found for milestone update', { contentId, versionId })
    }

    await contentRepository.update(content.id, { versions })
    return updatedVersion
  }

  async deleteVersion(contentId: string, versionId: string): Promise<void> {
    const content = await this.loadContent(contentId)
    const version = content.versions.find(item => item.id === versionId)
    if (!version) {
      throw new AppError(ErrorCode.DB_READ_FAILED, 'Version not found for delete', { contentId, versionId })
    }
    if (version.isMilestone === true) {
      throw new AppError(ErrorCode.DB_WRITE_FAILED, 'Milestone versions cannot be deleted', { contentId, versionId })
    }
    if (version.id === content.currentVersionId) {
      throw new AppError(ErrorCode.DB_WRITE_FAILED, 'Current version cannot be deleted by history cleanup', { contentId, versionId })
    }
    if (content.versions.length <= 1) {
      throw new AppError(ErrorCode.DB_WRITE_FAILED, 'At least one version must remain', { contentId, versionId })
    }

    await contentRepository.update(content.id, {
      versions: content.versions.filter(item => item.id !== versionId),
    })
  }

  async cleanupVersions(contentId: string, policy: VersionCleanupPolicy = {}): Promise<VersionCleanupResult> {
    const content = await this.loadContent(contentId)
    const now = policy.now ?? new Date()
    const maxNonMilestoneVersions = policy.maxNonMilestoneVersions ?? VERSION_BUNDLE_DEFAULTS.maxNonMilestoneVersions
    const maxAgeMs = policy.maxAgeMs ?? VERSION_BUNDLE_DEFAULTS.maxAgeMs
    const sortedNonMilestones = sortByCreatedDesc(content.versions.filter(version => version.isMilestone !== true))
    const newestAllowed = new Set(sortedNonMilestones.slice(0, maxNonMilestoneVersions).map(version => version.id))
    const kept = new Set<string>()
    const removed: string[] = []
    const milestoneIds: string[] = []

    for (const version of content.versions) {
      if (version.isMilestone === true) {
        kept.add(version.id)
        milestoneIds.push(version.id)
        continue
      }
      if (version.id === content.currentVersionId) {
        kept.add(version.id)
        continue
      }
      const ageMs = now.getTime() - toDate(version.createdAt).getTime()
      if (newestAllowed.has(version.id) || ageMs <= maxAgeMs) {
        kept.add(version.id)
      } else {
        removed.push(version.id)
      }
    }

    if (removed.length > 0) {
      await contentRepository.update(content.id, {
        versions: content.versions.filter(version => kept.has(version.id)),
      })
    }

    return {
      contentId,
      removedIds: removed,
      keptIds: content.versions.filter(version => kept.has(version.id)).map(version => version.id),
      milestoneIds,
    }
  }

  async buildRestoreProposal(contentId: string, versionId: string): Promise<VersionRestoreProposal> {
    const content = await this.loadContent(contentId)
    const version = content.versions.find(item => item.id === versionId)
    if (!version) {
      throw new AppError(ErrorCode.DB_READ_FAILED, 'Version not found for restore proposal', { contentId, versionId })
    }

    return {
      contentId,
      versionId,
      current: {
        title: content.title,
        body: content.body,
        transcript: content.transcript,
        updatedAt: content.updatedAt,
      },
      historical: {
        title: version.title,
        body: version.body,
        transcript: version.transcript,
        createdAt: version.createdAt,
        label: version.label,
      },
      proposed: {
        title: version.title,
        body: version.body,
        transcript: version.transcript,
      },
      diff: computeVersionDiff(version.body, content.body),
      createdAt: new Date(),
    }
  }

  async exportVersionMarkdown(
    contentId: string,
    versionId: string,
    options: VersionMarkdownExportOptions = {},
  ): Promise<string> {
    const content = await this.loadContent(contentId)
    const version = content.versions.find(item => item.id === versionId)
    if (!version) {
      throw new AppError(ErrorCode.DB_READ_FAILED, 'Version not found for markdown export', { contentId, versionId })
    }

    if (options.includeFrontmatter === false) return version.body

    const exportedAt = options.exportedAt ?? new Date()
    const frontmatter = [
      '---',
      `title: ${escapeFrontmatterValue(version.title)}`,
      `version_id: ${escapeFrontmatterValue(version.id)}`,
      `content_id: ${escapeFrontmatterValue(content.id)}`,
      `article_id: ${escapeFrontmatterValue(content.articleId)}`,
      `label: ${escapeFrontmatterValue(version.label)}`,
      `trigger: ${escapeFrontmatterValue(version.trigger ?? 'unknown')}`,
      `is_milestone: ${version.isMilestone === true}`,
      `created_at: ${escapeFrontmatterValue(toDate(version.createdAt).toISOString())}`,
      `exported_at: ${escapeFrontmatterValue(exportedAt.toISOString())}`,
      '---',
      '',
    ].join('\n')

    return `${frontmatter}${version.body}`
  }

  async recordRecoveryCheckpoint(articleId: string, payload: RecoveryCheckpointPayload): Promise<string> {
    try {
      const content = await this.findContentByArticleId(articleId)
      const at = payload.savedAt ? toDate(payload.savedAt) : new Date()
      const version = await this.forceCreateVersion(content.id, {
        title: payload.title ?? content.title,
        body: payload.content,
        transcript: payload.transcript ?? content.transcript,
        label: payload.label ?? `Crash recovery ${at.toISOString()}`,
        trigger: 'crash_recovery',
        authorId: payload.profileId,
        now: at,
      })
      return version.id
    } catch (error) {
      logger.error('Record recovery checkpoint failed', error, { articleId })
      throw error
    }
  }

  async loadForRecovery(articleId: string, before: number | Date): Promise<Version | null> {
    const content = await this.findContentByArticleId(articleId)
    const beforeTime = toDate(before).getTime()
    return sortByCreatedDesc(content.versions).find(version => toDate(version.createdAt).getTime() <= beforeTime) ?? null
  }
}

export const versionBundleRepository = new VersionBundleRepository()