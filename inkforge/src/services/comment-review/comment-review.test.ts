import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { db } from '@/utils/db'
import { auditRepository } from '@/services/audit'
import { useCommentReviewStore } from '@/stores/commentReview'
import { AnchorDriftTracker, buildCommentAnchor } from './anchorDrift'
import { applyTrackChangeToText } from './trackChanges'
import { CommentReviewRepository } from './repository'
import type { CommentRecord, MarginNoteRecord, TrackChangeRecord } from './types'

const comments = new Map<string, CommentRecord>()
const marginNotes = new Map<string, MarginNoteRecord>()
const trackChanges = new Map<string, TrackChangeRecord>()

function rowsByIndex<T extends Record<string, unknown>>(rows: Map<string, T>, index: string, value: unknown): T[] {
  return Array.from(rows.values()).filter(row => row[index] === value)
}

function tableWhere<T extends Record<string, unknown>>(rows: Map<string, T>) {
  return (index: string) => ({
    equals: (value: unknown) => ({
      toArray: async () => rowsByIndex(rows, index, value),
    }),
  })
}

beforeEach(() => {
  comments.clear()
  marginNotes.clear()
  trackChanges.clear()
  setActivePinia(createPinia())

  vi.spyOn(db, 'transaction').mockImplementation((async (...args: unknown[]) => {
    const scope = args[args.length - 1]
    if (typeof scope !== 'function') throw new Error('Missing transaction scope')
    return await scope()
  }) as never)

  vi.spyOn(db.comments, 'add').mockImplementation((async (record: CommentRecord) => {
    comments.set(record.id, record)
    return record.id
  }) as never)
  vi.spyOn(db.comments, 'put').mockImplementation((async (record: CommentRecord) => {
    comments.set(record.id, record)
    return record.id
  }) as never)
  vi.spyOn(db.comments, 'bulkPut').mockImplementation((async (records: CommentRecord[]) => {
    for (const record of records) comments.set(record.id, record)
    return records.map(record => record.id)
  }) as never)
  vi.spyOn(db.comments, 'get').mockImplementation((async (key: string) => comments.get(String(key))) as never)
  vi.spyOn(db.comments, 'where').mockImplementation(tableWhere(comments) as never)

  vi.spyOn(db.marginNotes, 'add').mockImplementation((async (record: MarginNoteRecord) => {
    marginNotes.set(record.id, record)
    return record.id
  }) as never)
  vi.spyOn(db.marginNotes, 'put').mockImplementation((async (record: MarginNoteRecord) => {
    marginNotes.set(record.id, record)
    return record.id
  }) as never)
  vi.spyOn(db.marginNotes, 'get').mockImplementation((async (key: string) => marginNotes.get(String(key))) as never)
  vi.spyOn(db.marginNotes, 'delete').mockImplementation((async (key: string) => {
    marginNotes.delete(String(key))
  }) as never)
  vi.spyOn(db.marginNotes, 'where').mockImplementation(tableWhere(marginNotes) as never)

  vi.spyOn(db.trackChanges, 'add').mockImplementation((async (record: TrackChangeRecord) => {
    trackChanges.set(record.id, record)
    return record.id
  }) as never)
  vi.spyOn(db.trackChanges, 'put').mockImplementation((async (record: TrackChangeRecord) => {
    trackChanges.set(record.id, record)
    return record.id
  }) as never)
  vi.spyOn(db.trackChanges, 'get').mockImplementation((async (key: string) => trackChanges.get(String(key))) as never)
  vi.spyOn(db.trackChanges, 'where').mockImplementation(tableWhere(trackChanges) as never)

  vi.spyOn(auditRepository, 'log').mockResolvedValue(null)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AnchorDriftTracker', () => {
  it('keeps exact anchors stable when document text is unchanged', () => {
    const oldText = 'alpha beta gamma'
    const anchor = buildCommentAnchor({ from: 6, to: 10, text: 'beta', versionId: 'version-1', documentText: oldText, now: 1 })

    const updated = new AnchorDriftTracker().updateAnchor(anchor, oldText, oldText, 2)

    expect(updated.anchorStatus).toBe('exact')
    expect(updated.from).toBe(6)
    expect(updated.to).toBe(10)
    expect(updated.updatedAt).toBe(2)
  })

  it('marks anchors as drifted when text moves after edits before the range', () => {
    const oldText = 'alpha beta gamma'
    const newText = 'intro alpha beta gamma'
    const anchor = buildCommentAnchor({ from: 6, to: 10, text: 'beta', versionId: 'version-1', documentText: oldText, now: 1 })

    const updated = new AnchorDriftTracker().updateAnchor(anchor, oldText, newText, 2)

    expect(updated.anchorStatus).toBe('drifted')
    expect(newText.slice(updated.from, updated.to)).toBe('beta')
    expect(updated.driftedFrom).toBe(updated.from)
  })

  it('marks anchors invalid when the selected text and context are gone', () => {
    const oldText = 'alpha beta gamma'
    const newText = 'alpha gamma'
    const anchor = buildCommentAnchor({ from: 6, to: 10, text: 'beta', versionId: 'version-1', documentText: oldText, now: 1 })

    const updated = new AnchorDriftTracker().updateAnchor(anchor, oldText, newText, 2)

    expect(updated.anchorStatus).toBe('invalid')
    expect(updated.driftedFrom).toBeUndefined()
  })
})

describe('CommentReviewRepository', () => {
  it('persists comments, replies, resolution, deletion, mentions, and audit attempts', async () => {
    const repository = new CommentReviewRepository()
    const anchor = buildCommentAnchor({ from: 0, to: 5, text: 'alpha', versionId: 'version-1', documentText: 'alpha beta', now: 100 })

    const comment = await repository.createComment({ docId: 'doc-1', anchor, content: 'Please check @profile-2', authorId: 'profile-1', reviewDecision: 'request-changes', now: 101 })
    const replied = await repository.addReply(comment.id, { authorId: 'profile-2', content: 'Handled @profile-1', now: 102 })
    const resolved = await repository.resolveComment(comment.id, 'profile-1', 103)
    const deleted = await repository.deleteComment(comment.id, 'profile-1', 104)
    const visible = await repository.listComments('doc-1')
    const summary = await repository.getSummary('doc-1')

    expect(comment.mentions).toEqual(['profile-2'])
    expect(replied.replies).toHaveLength(1)
    expect(replied.mentions).toEqual(['profile-2', 'profile-1'])
    expect(resolved.status).toBe('resolved')
    expect(deleted.status).toBe('deleted')
    expect(visible).toHaveLength(0)
    expect(summary.deleted).toBe(1)
    expect(auditRepository.log).toHaveBeenCalledWith('review.request_changes', expect.objectContaining({ docId: 'doc-1', resourceId: comment.id }))
    expect(auditRepository.log).toHaveBeenCalledWith('comment.resolve', expect.objectContaining({ docId: 'doc-1', resourceId: comment.id }))
    expect(auditRepository.log).toHaveBeenCalledWith('comment.delete', expect.objectContaining({ docId: 'doc-1', resourceId: comment.id }))
  })

  it('refreshes anchors and persists exact, drifted, and invalid states honestly', async () => {
    const repository = new CommentReviewRepository()
    const oldText = 'alpha beta gamma delta'
    const stable = await repository.createComment({
      docId: 'doc-1',
      anchor: buildCommentAnchor({ from: 0, to: 5, text: 'alpha', versionId: 'version-1', documentText: oldText }),
      content: 'stable',
      authorId: 'profile-1',
    })
    const moved = await repository.createComment({
      docId: 'doc-1',
      anchor: buildCommentAnchor({ from: 6, to: 10, text: 'beta', versionId: 'version-1', documentText: oldText }),
      content: 'moved',
      authorId: 'profile-1',
    })
    const invalid = await repository.createComment({
      docId: 'doc-1',
      anchor: buildCommentAnchor({ from: 17, to: 22, text: 'delta', versionId: 'version-1', documentText: oldText }),
      content: 'invalid',
      authorId: 'profile-1',
    })

    const summary = await repository.refreshAnchorsForDocument('doc-1', oldText, 'alpha intro beta gamma', 200)

    expect(summary.exact).toBe(1)
    expect(summary.drifted).toBe(1)
    expect(summary.invalid).toBe(1)
    expect(comments.get(stable.id)?.anchor.anchorStatus).toBe('exact')
    expect(comments.get(moved.id)?.anchor.anchorStatus).toBe('drifted')
    expect(comments.get(invalid.id)?.anchor.anchorStatus).toBe('invalid')
  })

  it('persists margin notes and track changes with explicit status transitions', async () => {
    const repository = new CommentReviewRepository()

    const note = await repository.createMarginNote({ docId: 'doc-1', content: 'Margin note', authorId: 'profile-1', paragraphIndex: 2, now: 300 })
    const updatedNote = await repository.updateMarginNote(note.id, 'Updated note', 301)
    const change = await repository.createTrackChange({ docId: 'doc-1', kind: 'insert', from: 5, to: 5, content: ' brave', authorId: 'profile-1', now: 302 })
    const accepted = await repository.setTrackChangeStatus(change.id, 'accepted', 303)

    expect((await repository.listMarginNotes('doc-1')).map(item => item.content)).toEqual(['Updated note'])
    expect(updatedNote.updatedAt).toBe(301)
    expect(accepted.status).toBe('accepted')
    expect(await repository.listTrackChanges('doc-1')).toHaveLength(0)
    expect(await repository.listTrackChanges('doc-1', { includeFinal: true })).toHaveLength(1)
    expect(applyTrackChangeToText('hello world', { ...change, status: 'pending' }, 'accepted')).toBe('hello brave world')
  })
})

describe('useCommentReviewStore', () => {
  it('loads and mutates review state through repository-backed actions', async () => {
    const store = useCommentReviewStore()
    const anchor = buildCommentAnchor({ from: 0, to: 5, text: 'alpha', versionId: 'version-1', documentText: 'alpha beta' })

    const comment = await store.createComment({ docId: 'doc-store', anchor, content: 'Store comment', authorId: 'profile-1' })
    await store.addReply(comment.id, { authorId: 'profile-2', content: 'Reply' })
    await store.createMarginNote({ docId: 'doc-store', content: 'Note', authorId: 'profile-1', paragraphIndex: 0 })
    const change = await store.createTrackChange({ docId: 'doc-store', kind: 'delete', from: 0, to: 5, content: 'alpha', authorId: 'profile-1' })
    await store.setTrackChangeStatus(change.id, 'rejected')
    await store.resolveComment(comment.id, 'profile-1')

    expect(store.activeDocId).toBe('doc-store')
    expect(store.comments).toHaveLength(1)
    expect(store.comments[0].replies).toHaveLength(1)
    expect(store.marginNotes).toHaveLength(1)
    expect(store.trackChanges).toHaveLength(0)
    expect(store.resolvedCount).toBe(1)
    expect(store.hasOpenReviewItems).toBe(false)
    expect(store.lastAction?.kind).toBe('resolve')
  })
})