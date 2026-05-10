import { VersionSchema } from '@/schemas/article'
import { VERSION } from '@/constants'
import { generateId } from '@/utils/uuid'
import type { Version } from '@/types'
import type { CreateVersionSnapshotRequest, VersionDiffLine, VersionDiffResult, VersionSnapshotSource } from './types'

const MARKDOWN_TOKEN_PATTERN = /[`*_>#\-[\]()!|{}~]/g
const HTML_TAG_PATTERN = /<[^>]+>/g
const WORD_PATTERN = /[\p{L}\p{N}]+/gu

export function countMarkdownWords(markdown: string): number {
  const compact = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(HTML_TAG_PATTERN, ' ')
    .replace(MARKDOWN_TOKEN_PATTERN, ' ')

  const matches = compact.match(WORD_PATTERN)
  return matches?.length ?? 0
}

export function calculateDeltaChars(previousBody: string | null | undefined, nextBody: string): number {
  return nextBody.length - (previousBody?.length ?? 0)
}

function resolvePreviousVersion(source: VersionSnapshotSource, explicitPrevious?: Version | null): Version | null {
  if (explicitPrevious !== undefined) return explicitPrevious
  if (!source.versions || source.versions.length === 0) return null
  return source.versions.find(version => version.id === source.currentVersionId) ?? source.versions[source.versions.length - 1] ?? null
}

function defaultLabel(trigger: CreateVersionSnapshotRequest['trigger'], versionNumber: number, at: Date): string {
  if (trigger === 'manual_save') return VERSION.generateLabel(versionNumber)
  if (trigger === 'interval') return `Auto snapshot ${at.toISOString()}`
  if (trigger === 'before_close') return `Before close ${at.toISOString()}`
  if (trigger === 'mode_switch') return `Mode switch ${at.toISOString()}`
  return `Crash recovery ${at.toISOString()}`
}

export function buildVersionSnapshot(
  source: VersionSnapshotSource,
  request: CreateVersionSnapshotRequest,
  previousVersion?: Version | null,
): Version {
  const at = request.now ?? new Date()
  const body = request.body ?? source.body
  const title = request.title ?? source.title
  const transcript = request.transcript ?? source.transcript
  const previous = resolvePreviousVersion(source, previousVersion)
  const versionNumber = (source.versions?.length ?? 0) + 1

  return VersionSchema.parse({
    id: generateId(),
    label: request.label?.trim() || defaultLabel(request.trigger, versionNumber, at),
    title,
    body,
    transcript,
    createdAt: at,
    deltaChars: calculateDeltaChars(previous?.body, body),
    wordCount: countMarkdownWords(body),
    isMilestone: request.isMilestone ?? false,
    trigger: request.trigger,
    authorId: request.authorId,
    updatedAt: at,
  })
}

export function isSameVersionPayload(
  version: Pick<Version, 'title' | 'body' | 'transcript'> | null | undefined,
  source: Pick<Version, 'title' | 'body' | 'transcript'>,
): boolean {
  return Boolean(version) && version!.title === source.title && version!.body === source.body && version!.transcript === source.transcript
}

export function computeVersionDiff(oldText: string, newText: string): VersionDiffResult {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const oldLength = oldLines.length
  const newLength = newLines.length
  const dp: number[][] = Array.from({ length: oldLength + 1 }, () => new Array<number>(newLength + 1).fill(0))

  for (let i = 1; i <= oldLength; i += 1) {
    for (let j = 1; j <= newLength; j += 1) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const left: VersionDiffLine[] = []
  const right: VersionDiffLine[] = []
  let i = oldLength
  let j = newLength
  let added = 0
  let deleted = 0

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      left.push({ type: 'equal', content: oldLines[i - 1], lineNumber: i })
      right.push({ type: 'equal', content: newLines[j - 1], lineNumber: j })
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      left.push({ type: 'equal', content: '' })
      right.push({ type: 'insert', content: newLines[j - 1], lineNumber: j })
      added += 1
      j -= 1
    } else if (i > 0) {
      left.push({ type: 'delete', content: oldLines[i - 1], lineNumber: i })
      right.push({ type: 'equal', content: '' })
      deleted += 1
      i -= 1
    }
  }

  return {
    leftLines: left.reverse(),
    rightLines: right.reverse(),
    stats: {
      added,
      deleted,
      modified: Math.min(added, deleted),
    },
  }
}