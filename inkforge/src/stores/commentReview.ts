import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { logger } from '@/services/error'
import {
  commentReviewRepository,
  type AnchorDriftSummary,
  type CommentRecord,
  type CommentReviewSummary,
  type CreateCommentInput,
  type CreateMarginNoteInput,
  type CreateTrackChangeInput,
  type MarginNoteRecord,
  type ReplyCommentInput,
  type TrackChangeRecord,
} from '@/services/comment-review'

interface CommentReviewActionState {
  kind: 'load' | 'comment' | 'reply' | 'resolve' | 'delete' | 'anchorDrift' | 'marginNote' | 'trackChange'
  docId: string
  recordId?: string
  affectedCount: number
  at: number
}

function emptySummary(): CommentReviewSummary {
  return { total: 0, pending: 0, resolved: 0, deleted: 0, requestChanges: 0, approvals: 0 }
}

export const useCommentReviewStore = defineStore('commentReview', () => {
  const activeDocId = ref<string | null>(null)
  const comments = ref<CommentRecord[]>([])
  const marginNotes = ref<MarginNoteRecord[]>([])
  const trackChanges = ref<TrackChangeRecord[]>([])
  const summary = ref<CommentReviewSummary>(emptySummary())
  const selectedCommentId = ref<string | null>(null)
  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)
  const lastAction = ref<CommentReviewActionState | null>(null)

  const pendingCount = computed(() => summary.value.pending)
  const resolvedCount = computed(() => summary.value.resolved)
  const hasOpenReviewItems = computed(() => summary.value.pending > 0 || trackChanges.value.some(change => change.status === 'pending'))

  function captureError(err: unknown, message: string): never {
    const resolved = err instanceof Error ? err.message : String(err)
    error.value = resolved
    logger.error(message, err)
    throw err
  }

  async function refresh(docId: string = activeDocId.value ?? ''): Promise<void> {
    if (!docId) return
    const [nextComments, nextMarginNotes, nextTrackChanges, nextSummary] = await Promise.all([
      commentReviewRepository.listComments(docId),
      commentReviewRepository.listMarginNotes(docId),
      commentReviewRepository.listTrackChanges(docId),
      commentReviewRepository.getSummary(docId),
    ])
    activeDocId.value = docId
    comments.value = nextComments
    marginNotes.value = nextMarginNotes
    trackChanges.value = nextTrackChanges
    summary.value = nextSummary
  }

  async function loadReview(docId: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      await refresh(docId)
      lastAction.value = { kind: 'load', docId, affectedCount: comments.value.length + marginNotes.value.length + trackChanges.value.length, at: Date.now() }
    } catch (err) {
      captureError(err, 'Load comment review failed')
    } finally {
      isLoading.value = false
    }
  }

  async function createComment(input: CreateCommentInput): Promise<CommentRecord> {
    isMutating.value = true
    error.value = null
    try {
      const comment = await commentReviewRepository.createComment(input)
      await refresh(input.docId)
      selectedCommentId.value = comment.id
      lastAction.value = { kind: 'comment', docId: input.docId, recordId: comment.id, affectedCount: 1, at: Date.now() }
      return comment
    } catch (err) {
      captureError(err, 'Create comment failed')
    } finally {
      isMutating.value = false
    }
  }

  async function addReply(commentId: string, input: ReplyCommentInput): Promise<CommentRecord> {
    isMutating.value = true
    error.value = null
    try {
      const comment = await commentReviewRepository.addReply(commentId, input)
      await refresh(comment.docId)
      lastAction.value = { kind: 'reply', docId: comment.docId, recordId: comment.id, affectedCount: 1, at: Date.now() }
      return comment
    } catch (err) {
      captureError(err, 'Add comment reply failed')
    } finally {
      isMutating.value = false
    }
  }

  async function resolveComment(commentId: string, profileId: string): Promise<CommentRecord> {
    isMutating.value = true
    error.value = null
    try {
      const comment = await commentReviewRepository.resolveComment(commentId, profileId)
      await refresh(comment.docId)
      lastAction.value = { kind: 'resolve', docId: comment.docId, recordId: comment.id, affectedCount: 1, at: Date.now() }
      return comment
    } catch (err) {
      captureError(err, 'Resolve comment failed')
    } finally {
      isMutating.value = false
    }
  }

  async function deleteComment(commentId: string, profileId: string): Promise<CommentRecord> {
    isMutating.value = true
    error.value = null
    try {
      const comment = await commentReviewRepository.deleteComment(commentId, profileId)
      await refresh(comment.docId)
      lastAction.value = { kind: 'delete', docId: comment.docId, recordId: comment.id, affectedCount: 1, at: Date.now() }
      return comment
    } catch (err) {
      captureError(err, 'Delete comment failed')
    } finally {
      isMutating.value = false
    }
  }

  async function refreshAnchors(docId: string, oldText: string, newText: string): Promise<AnchorDriftSummary> {
    isMutating.value = true
    error.value = null
    try {
      const result = await commentReviewRepository.refreshAnchorsForDocument(docId, oldText, newText)
      await refresh(docId)
      lastAction.value = { kind: 'anchorDrift', docId, affectedCount: result.updatedIds.length, at: Date.now() }
      return result
    } catch (err) {
      captureError(err, 'Refresh comment anchors failed')
    } finally {
      isMutating.value = false
    }
  }

  async function createMarginNote(input: CreateMarginNoteInput): Promise<MarginNoteRecord> {
    isMutating.value = true
    error.value = null
    try {
      const note = await commentReviewRepository.createMarginNote(input)
      await refresh(input.docId)
      lastAction.value = { kind: 'marginNote', docId: input.docId, recordId: note.id, affectedCount: 1, at: Date.now() }
      return note
    } catch (err) {
      captureError(err, 'Create margin note failed')
    } finally {
      isMutating.value = false
    }
  }

  async function createTrackChange(input: CreateTrackChangeInput): Promise<TrackChangeRecord> {
    isMutating.value = true
    error.value = null
    try {
      const change = await commentReviewRepository.createTrackChange(input)
      await refresh(input.docId)
      lastAction.value = { kind: 'trackChange', docId: input.docId, recordId: change.id, affectedCount: 1, at: Date.now() }
      return change
    } catch (err) {
      captureError(err, 'Create track change failed')
    } finally {
      isMutating.value = false
    }
  }

  async function setTrackChangeStatus(changeId: string, status: 'accepted' | 'rejected'): Promise<TrackChangeRecord> {
    isMutating.value = true
    error.value = null
    try {
      const change = await commentReviewRepository.setTrackChangeStatus(changeId, status)
      await refresh(change.docId)
      lastAction.value = { kind: 'trackChange', docId: change.docId, recordId: change.id, affectedCount: 1, at: Date.now() }
      return change
    } catch (err) {
      captureError(err, 'Set track change status failed')
    } finally {
      isMutating.value = false
    }
  }

  function clearSelection(): void {
    selectedCommentId.value = null
  }

  return {
    activeDocId,
    comments,
    marginNotes,
    trackChanges,
    summary,
    selectedCommentId,
    isLoading,
    isMutating,
    error,
    lastAction,
    pendingCount,
    resolvedCount,
    hasOpenReviewItems,
    refresh,
    loadReview,
    createComment,
    addReply,
    resolveComment,
    deleteComment,
    refreshAnchors,
    createMarginNote,
    createTrackChange,
    setTrackChangeStatus,
    clearSelection,
  }
})