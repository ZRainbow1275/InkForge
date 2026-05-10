import type { EditedContent, Version } from '@/types'
import type { VersionTrigger } from '@/schemas/article'

export { type VersionTrigger }

export const VERSION_BUNDLE_DEFAULTS = {
  maxNonMilestoneVersions: 100,
  maxAgeMs: 30 * 24 * 60 * 60 * 1000,
} as const

export interface VersionSnapshotSource {
  title: string
  body: string
  transcript: string
  versions?: Version[]
  currentVersionId?: string
}

export interface CreateVersionSnapshotRequest {
  title?: string
  body?: string
  transcript?: string
  label?: string
  trigger: VersionTrigger
  authorId?: string
  now?: Date
  force?: boolean
  isMilestone?: boolean
}

export interface VersionListItem {
  id: string
  label: string
  deltaChars: number
  wordCount: number
  isMilestone: boolean
  trigger: VersionTrigger | null
  authorId: string | null
  createdAt: Date
  updatedAt: Date | null
  elapsedMs: number | null
}

export type VersionDiffLineKind = 'equal' | 'insert' | 'delete'

export interface VersionDiffLine {
  type: VersionDiffLineKind
  content: string
  lineNumber?: number
}

export interface VersionDiffResult {
  leftLines: VersionDiffLine[]
  rightLines: VersionDiffLine[]
  stats: {
    added: number
    deleted: number
    modified: number
  }
}

export interface VersionRestoreProposal {
  contentId: string
  versionId: string
  current: Pick<EditedContent, 'title' | 'body' | 'transcript' | 'updatedAt'>
  historical: Pick<Version, 'title' | 'body' | 'transcript' | 'createdAt' | 'label'>
  proposed: Pick<Version, 'title' | 'body' | 'transcript'>
  diff: VersionDiffResult
  createdAt: Date
}

export interface VersionCleanupPolicy {
  maxNonMilestoneVersions?: number
  maxAgeMs?: number
  now?: Date
}

export interface VersionCleanupResult {
  contentId: string
  removedIds: string[]
  keptIds: string[]
  milestoneIds: string[]
}

export interface VersionMarkdownExportOptions {
  includeFrontmatter?: boolean
  exportedAt?: Date
}

export interface RecoveryCheckpointPayload {
  title?: string
  content: string
  transcript?: string
  profileId?: string
  savedAt?: number | string | Date
  label?: string
}