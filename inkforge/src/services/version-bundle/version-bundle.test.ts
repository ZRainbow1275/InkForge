import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EditedContent, Version } from '@/types'
import { contentRepository } from '@/services/repository'
import { VersionBundleRepository } from './repository'

const CONTENT_ID = '11111111-1111-4111-8111-111111111111'
const ARTICLE_ID = '22222222-2222-4222-8222-222222222222'
const V1 = '33333333-3333-4333-8333-333333333333'
const V2 = '44444444-4444-4444-8444-444444444444'
const V3 = '55555555-5555-4555-8555-555555555555'
const V4 = '66666666-6666-4666-8666-666666666666'

const rows = new Map<string, EditedContent>()

function version(overrides: Partial<Version> = {}): Version {
  const createdAt = overrides.createdAt ?? new Date('2026-05-02T00:00:00.000Z')
  return {
    id: overrides.id ?? V1,
    label: overrides.label ?? 'v1',
    title: overrides.title ?? 'Versioned document',
    body: overrides.body ?? 'alpha body',
    transcript: overrides.transcript ?? '',
    createdAt,
    deltaChars: overrides.deltaChars,
    wordCount: overrides.wordCount,
    isMilestone: overrides.isMilestone,
    trigger: overrides.trigger,
    authorId: overrides.authorId,
    updatedAt: overrides.updatedAt,
  }
}

function content(overrides: Partial<EditedContent> = {}): EditedContent {
  const now = new Date('2026-05-02T00:00:00.000Z')
  const versions = overrides.versions ?? [version()]
  return {
    id: overrides.id ?? CONTENT_ID,
    articleId: overrides.articleId ?? ARTICLE_ID,
    title: overrides.title ?? 'Versioned document',
    body: overrides.body ?? 'alpha body',
    transcript: overrides.transcript ?? '',
    selectedLinks: overrides.selectedLinks ?? [],
    selectedImages: overrides.selectedImages ?? [],
    versions,
    currentVersionId: overrides.currentVersionId ?? versions[versions.length - 1].id,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

beforeEach(() => {
  rows.clear()
  vi.spyOn(contentRepository, 'findById').mockImplementation(async (id: string) => rows.get(id))
  vi.spyOn(contentRepository, 'findByArticleId').mockImplementation(async (articleId: string) => {
    return Array.from(rows.values()).find(row => row.articleId === articleId)
  })
  vi.spyOn(contentRepository, 'update').mockImplementation(async (id: string, updates: Partial<EditedContent>) => {
    const current = rows.get(id)
    if (!current) throw new Error('missing content')
    rows.set(id, { ...current, ...updates })
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('VersionBundleRepository', () => {
  it('skips unchanged snapshots without mutating persisted content', async () => {
    const base = content()
    rows.set(base.id, base)
    const repository = new VersionBundleRepository()

    const snapshot = await repository.createVersionIfChanged(base.id, {
      trigger: 'manual_save',
      now: new Date('2026-05-02T01:00:00.000Z'),
    })

    expect(snapshot).toBeNull()
    expect(contentRepository.update).not.toHaveBeenCalled()
    expect(rows.get(base.id)?.versions).toHaveLength(1)
  })

  it('creates changed snapshots with trigger, word count, and delta metadata', async () => {
    const base = content()
    rows.set(base.id, base)
    const repository = new VersionBundleRepository()

    const snapshot = await repository.createVersionIfChanged(base.id, {
      body: 'alpha body plus two words',
      trigger: 'manual_save',
      authorId: 'profile-1',
      now: new Date('2026-05-02T01:00:00.000Z'),
    })

    const persisted = rows.get(base.id)
    expect(snapshot).not.toBeNull()
    expect(snapshot?.trigger).toBe('manual_save')
    expect(snapshot?.authorId).toBe('profile-1')
    expect(snapshot?.wordCount).toBe(5)
    expect(snapshot?.deltaChars).toBe('alpha body plus two words'.length - 'alpha body'.length)
    expect(persisted?.versions).toHaveLength(2)
    expect(persisted?.currentVersionId).toBe(snapshot?.id)
    expect(persisted?.body).toBe('alpha body plus two words')
  })

  it('forces crash recovery snapshots even when content is unchanged', async () => {
    const base = content()
    rows.set(base.id, base)
    const repository = new VersionBundleRepository()

    const versionId = await repository.recordRecoveryCheckpoint(ARTICLE_ID, {
      content: 'alpha body',
      profileId: 'profile-1',
      savedAt: '2026-05-02T02:00:00.000Z',
    })

    const persisted = rows.get(base.id)
    expect(versionId).toBeTruthy()
    expect(persisted?.versions).toHaveLength(2)
    expect(persisted?.versions[1].trigger).toBe('crash_recovery')
    expect(persisted?.versions[1].authorId).toBe('profile-1')
  })

  it('protects milestones from delete and cleanup', async () => {
    const base = content({
      body: 'current body',
      versions: [
        version({ id: V1, label: 'old', body: 'old', createdAt: new Date('2026-03-01T00:00:00.000Z') }),
        version({ id: V2, label: 'release', body: 'release', isMilestone: true, createdAt: new Date('2026-03-02T00:00:00.000Z') }),
        version({ id: V3, label: 'middle', body: 'middle', createdAt: new Date('2026-03-03T00:00:00.000Z') }),
        version({ id: V4, label: 'current', body: 'current body', createdAt: new Date('2026-05-02T00:00:00.000Z') }),
      ],
      currentVersionId: V4,
    })
    rows.set(base.id, base)
    const repository = new VersionBundleRepository()

    await expect(repository.deleteVersion(base.id, V2)).rejects.toThrow('Milestone versions cannot be deleted')
    const result = await repository.cleanupVersions(base.id, {
      maxNonMilestoneVersions: 1,
      maxAgeMs: 1,
      now: new Date('2026-05-02T00:00:00.000Z'),
    })

    expect(result.removedIds).toEqual([V1, V3])
    expect(result.milestoneIds).toEqual([V2])
    expect(rows.get(base.id)?.versions.map(item => item.id)).toEqual([V2, V4])
  })

  it('exports a real markdown snapshot with frontmatter', async () => {
    const base = content({ body: '# Current', versions: [version({ id: V1, title: 'Export me', body: '# Exported\nBody', trigger: 'manual_save', isMilestone: true })] })
    rows.set(base.id, base)
    const repository = new VersionBundleRepository()

    const markdown = await repository.exportVersionMarkdown(base.id, V1, { exportedAt: new Date('2026-05-02T03:00:00.000Z') })

    expect(markdown).toContain('version_id: "33333333-3333-4333-8333-333333333333"')
    expect(markdown).toContain('is_milestone: true')
    expect(markdown).toContain('# Exported\nBody')
  })

  it('builds restore proposals without mutating the current content row', async () => {
    const base = content({
      body: 'current line\nnew line',
      versions: [
        version({ id: V1, label: 'old', body: 'old line' }),
        version({ id: V2, label: 'current', body: 'current line\nnew line', createdAt: new Date('2026-05-02T01:00:00.000Z') }),
      ],
      currentVersionId: V2,
    })
    rows.set(base.id, base)
    const repository = new VersionBundleRepository()

    const proposal = await repository.buildRestoreProposal(base.id, V1)

    expect(proposal.proposed.body).toBe('old line')
    expect(proposal.diff.stats.deleted + proposal.diff.stats.added).toBeGreaterThan(0)
    expect(rows.get(base.id)?.body).toBe('current line\nnew line')
    expect(rows.get(base.id)?.currentVersionId).toBe(V2)
  })
})