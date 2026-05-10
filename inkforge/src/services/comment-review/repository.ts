import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'
import { AppError, ErrorCode, logger } from '@/services/error'
import { auditRepository } from '@/services/audit'
import { anchorDriftTracker } from './anchorDrift'
import { extractMentions } from './markdown'
import { buildTrackChange } from './trackChanges'
import {
  CommentRecordSchema,
  CommentReplySchema,
  MarginNoteRecordSchema,
  TrackChangeRecordSchema,
  type AnchorDriftSummary,
  type CommentRecord,
  type CommentReviewSummary,
  type CreateCommentInput,
  type CreateMarginNoteInput,
  type CreateTrackChangeInput,
  type MarginNoteRecord,
  type ReplyCommentInput,
  type ReviewDecision,
  type TrackChangeRecord,
  type TrackChangeStatus,
} from './types'

function sortByCreatedAt<T extends { createdAt: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.createdAt - b.createdAt)
}

function countSummary(comments: CommentRecord[]): CommentReviewSummary {
  return comments.reduce<CommentReviewSummary>((summary, comment) => {
    summary.total += 1
    summary[comment.status] += 1
    if (comment.reviewDecision === 'request-changes') summary.requestChanges += 1
    if (comment.reviewDecision === 'approve') summary.approvals += 1
    return summary
  }, { total: 0, pending: 0, resolved: 0, deleted: 0, requestChanges: 0, approvals: 0 })
}

function auditActionForDecision(decision: ReviewDecision | undefined): 'comment.create' | 'review.approve' | 'review.request_changes' {
  if (decision === 'approve') return 'review.approve'
  if (decision === 'request-changes') return 'review.request_changes'
  return 'comment.create'
}

export class CommentReviewRepository {
  async listComments(docId: string, options: { includeDeleted?: boolean } = {}): Promise<CommentRecord[]> {
    const rows = await db.comments.where('docId').equals(docId).toArray()
    const filtered = options.includeDeleted ? rows : rows.filter(comment => comment.status !== 'deleted')
    return sortByCreatedAt(filtered.map(row => CommentRecordSchema.parse(row)))
  }

  async getSummary(docId: string): Promise<CommentReviewSummary> {
    return countSummary(await this.listComments(docId, { includeDeleted: true }))
  }

  async createComment(input: CreateCommentInput): Promise<CommentRecord> {
    const now = input.now ?? Date.now()
    const record = CommentRecordSchema.parse({
      id: generateId(),
      docId: input.docId,
      anchor: input.anchor,
      content: input.content,
      status: 'pending',
      authorId: input.authorId,
      reviewDecision: input.reviewDecision,
      createdAt: now,
      replies: [],
      mentions: extractMentions(input.content),
    })

    try {
      await db.transaction('rw', db.comments, db.auditLogs, async () => {
        await db.comments.add(record)
        await auditRepository.log(auditActionForDecision(record.reviewDecision), {
          actorId: record.authorId,
          profileId: record.authorId,
          docId: record.docId,
          resourceId: record.id,
          resourceKind: 'document',
          outcome: 'success',
          payload: { status: record.status, reviewDecision: record.reviewDecision ?? 'comment', mentions: record.mentions },
          source: 'comment-review.createComment',
        })
      })
      return record
    } catch (error) {
      logger.error('Create comment failed', error, { docId: input.docId })
      throw error
    }
  }

  async addReply(commentId: string, input: ReplyCommentInput): Promise<CommentRecord> {
    const comment = await this.requireComment(commentId)
    if (comment.status === 'deleted') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Deleted comments cannot receive replies', { commentId })
    }

    const now = input.now ?? Date.now()
    const reply = CommentReplySchema.parse({
      id: generateId(),
      authorId: input.authorId,
      content: input.content,
      createdAt: now,
      mentions: extractMentions(input.content),
    })
    const updated = CommentRecordSchema.parse({
      ...comment,
      replies: [...comment.replies, reply],
      mentions: Array.from(new Set([...comment.mentions, ...reply.mentions])),
      updatedAt: now,
    })

    await db.transaction('rw', db.comments, db.auditLogs, async () => {
      await db.comments.put(updated)
      await auditRepository.log('comment.create', {
        actorId: input.authorId,
        profileId: input.authorId,
        docId: updated.docId,
        resourceId: updated.id,
        resourceKind: 'document',
        outcome: 'success',
        payload: { replyId: reply.id, mentions: reply.mentions },
        source: 'comment-review.addReply',
      })
    })
    return updated
  }

  async resolveComment(commentId: string, profileId: string, now: number = Date.now()): Promise<CommentRecord> {
    const comment = await this.requireComment(commentId)
    if (comment.status === 'resolved') return comment
    if (comment.status === 'deleted') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Deleted comments cannot be resolved', { commentId })
    }

    const updated = CommentRecordSchema.parse({ ...comment, status: 'resolved', resolvedAt: now, resolvedBy: profileId, updatedAt: now })
    await db.transaction('rw', db.comments, db.auditLogs, async () => {
      await db.comments.put(updated)
      await auditRepository.log('comment.resolve', {
        actorId: profileId,
        profileId,
        docId: updated.docId,
        resourceId: updated.id,
        resourceKind: 'document',
        outcome: 'success',
        payload: { resolvedAt: now },
        source: 'comment-review.resolveComment',
      })
    })
    return updated
  }

  async deleteComment(commentId: string, profileId: string, now: number = Date.now()): Promise<CommentRecord> {
    const comment = await this.requireComment(commentId)
    if (comment.status === 'deleted') return comment

    const updated = CommentRecordSchema.parse({ ...comment, status: 'deleted', deletedAt: now, updatedAt: now })
    await db.transaction('rw', db.comments, db.auditLogs, async () => {
      await db.comments.put(updated)
      await auditRepository.log('comment.delete', {
        actorId: profileId,
        profileId,
        docId: updated.docId,
        resourceId: updated.id,
        resourceKind: 'document',
        outcome: 'success',
        payload: { deletedAt: now },
        source: 'comment-review.deleteComment',
      })
    })
    return updated
  }

  async refreshAnchorsForDocument(docId: string, oldText: string, newText: string, now: number = Date.now()): Promise<AnchorDriftSummary> {
    const comments = await this.listComments(docId)
    const updated = comments.map(comment => CommentRecordSchema.parse({
      ...comment,
      anchor: anchorDriftTracker.updateAnchor(comment.anchor, oldText, newText, now),
      updatedAt: now,
    }))

    await db.comments.bulkPut(updated)

    return updated.reduce<AnchorDriftSummary>((summary, comment) => {
      summary.total += 1
      summary[comment.anchor.anchorStatus] += 1
      summary.updatedIds.push(comment.id)
      return summary
    }, { docId, total: 0, exact: 0, drifted: 0, invalid: 0, updatedIds: [] })
  }

  async createMarginNote(input: CreateMarginNoteInput): Promise<MarginNoteRecord> {
    const now = input.now ?? Date.now()
    const record = MarginNoteRecordSchema.parse({
      id: generateId(),
      docId: input.docId,
      content: input.content,
      authorId: input.authorId,
      paragraphIndex: input.paragraphIndex,
      createdAt: now,
    })
    await db.marginNotes.add(record)
    return record
  }

  async listMarginNotes(docId: string): Promise<MarginNoteRecord[]> {
    const rows = await db.marginNotes.where('docId').equals(docId).toArray()
    return sortByCreatedAt(rows.map(row => MarginNoteRecordSchema.parse(row)))
  }

  async updateMarginNote(noteId: string, content: string, now: number = Date.now()): Promise<MarginNoteRecord> {
    const current = await db.marginNotes.get(noteId)
    if (!current) throw new AppError(ErrorCode.DB_NOT_FOUND, 'Margin note not found', { noteId })
    const updated = MarginNoteRecordSchema.parse({ ...current, content, updatedAt: now })
    await db.marginNotes.put(updated)
    return updated
  }

  async deleteMarginNote(noteId: string): Promise<void> {
    await db.marginNotes.delete(noteId)
  }

  async createTrackChange(input: CreateTrackChangeInput): Promise<TrackChangeRecord> {
    const record = TrackChangeRecordSchema.parse(buildTrackChange(input, generateId()))
    await db.trackChanges.add(record)
    return record
  }

  async listTrackChanges(docId: string, options: { includeFinal?: boolean } = {}): Promise<TrackChangeRecord[]> {
    const rows = await db.trackChanges.where('docId').equals(docId).toArray()
    const parsed = rows.map(row => TrackChangeRecordSchema.parse(row))
    const filtered = options.includeFinal ? parsed : parsed.filter(change => change.status === 'pending')
    return sortByCreatedAt(filtered)
  }

  async setTrackChangeStatus(changeId: string, status: Exclude<TrackChangeStatus, 'pending'>, now: number = Date.now()): Promise<TrackChangeRecord> {
    const current = await db.trackChanges.get(changeId)
    if (!current) throw new AppError(ErrorCode.DB_NOT_FOUND, 'Track change not found', { changeId })
    const parsed = TrackChangeRecordSchema.parse(current)
    if (parsed.status !== 'pending') return parsed
    const updated = TrackChangeRecordSchema.parse({ ...parsed, status, updatedAt: now })
    await db.trackChanges.put(updated)
    return updated
  }

  private async requireComment(commentId: string): Promise<CommentRecord> {
    const comment = await db.comments.get(commentId)
    if (!comment) throw new AppError(ErrorCode.DB_NOT_FOUND, 'Comment not found', { commentId })
    return CommentRecordSchema.parse(comment)
  }
}

export const commentReviewRepository = new CommentReviewRepository()