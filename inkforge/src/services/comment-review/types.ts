import { z } from 'zod'

export const COMMENT_STATUS_VALUES = ['pending', 'resolved', 'deleted'] as const
export const REVIEW_DECISION_VALUES = ['comment', 'request-changes', 'approve'] as const
export const ANCHOR_STATUS_VALUES = ['exact', 'drifted', 'invalid'] as const
export const TRACK_CHANGE_KIND_VALUES = ['insert', 'delete', 'format'] as const
export const TRACK_CHANGE_STATUS_VALUES = ['pending', 'accepted', 'rejected'] as const

export type CommentStatus = typeof COMMENT_STATUS_VALUES[number]
export type ReviewDecision = typeof REVIEW_DECISION_VALUES[number]
export type AnchorStatus = typeof ANCHOR_STATUS_VALUES[number]
export type TrackChangeKind = typeof TRACK_CHANGE_KIND_VALUES[number]
export type TrackChangeStatus = typeof TRACK_CHANGE_STATUS_VALUES[number]

const TimestampMsSchema = z.number().int().nonnegative()
const NonEmptyStringSchema = z.string().min(1)

export const CommentStatusSchema = z.enum(COMMENT_STATUS_VALUES)
export const ReviewDecisionSchema = z.enum(REVIEW_DECISION_VALUES)
export const AnchorStatusSchema = z.enum(ANCHOR_STATUS_VALUES)
export const TrackChangeKindSchema = z.enum(TRACK_CHANGE_KIND_VALUES)
export const TrackChangeStatusSchema = z.enum(TRACK_CHANGE_STATUS_VALUES)

export const CommentAnchorSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  text: z.string(),
  versionId: NonEmptyStringSchema,
  anchorStatus: AnchorStatusSchema,
  driftedFrom: z.number().int().nonnegative().optional(),
  driftedTo: z.number().int().nonnegative().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  updatedAt: TimestampMsSchema.optional(),
}).refine(anchor => anchor.to >= anchor.from, {
  message: 'Comment anchor end must be greater than or equal to start',
  path: ['to'],
})

export type CommentAnchor = z.infer<typeof CommentAnchorSchema>

export const CommentReplySchema = z.object({
  id: NonEmptyStringSchema,
  authorId: NonEmptyStringSchema,
  content: NonEmptyStringSchema,
  createdAt: TimestampMsSchema,
  updatedAt: TimestampMsSchema.optional(),
  mentions: z.array(z.string()),
})

export type CommentReply = z.infer<typeof CommentReplySchema>

export const CommentRecordSchema = z.object({
  id: NonEmptyStringSchema,
  docId: NonEmptyStringSchema,
  anchor: CommentAnchorSchema,
  content: NonEmptyStringSchema,
  status: CommentStatusSchema,
  authorId: NonEmptyStringSchema,
  reviewDecision: ReviewDecisionSchema.optional(),
  createdAt: TimestampMsSchema,
  updatedAt: TimestampMsSchema.optional(),
  resolvedAt: TimestampMsSchema.optional(),
  resolvedBy: z.string().optional(),
  deletedAt: TimestampMsSchema.optional(),
  replies: z.array(CommentReplySchema),
  mentions: z.array(z.string()),
})

export type CommentRecord = z.infer<typeof CommentRecordSchema>

export const MarginNoteRecordSchema = z.object({
  id: NonEmptyStringSchema,
  docId: NonEmptyStringSchema,
  content: NonEmptyStringSchema,
  authorId: NonEmptyStringSchema,
  paragraphIndex: z.number().int().nonnegative(),
  createdAt: TimestampMsSchema,
  updatedAt: TimestampMsSchema.optional(),
})

export type MarginNoteRecord = z.infer<typeof MarginNoteRecordSchema>

export const TrackChangeRecordSchema = z.object({
  id: NonEmptyStringSchema,
  docId: NonEmptyStringSchema,
  kind: TrackChangeKindSchema,
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  content: z.string().optional(),
  markAttrs: z.record(z.string(), z.unknown()).optional(),
  authorId: NonEmptyStringSchema,
  createdAt: TimestampMsSchema,
  updatedAt: TimestampMsSchema.optional(),
  status: TrackChangeStatusSchema,
}).refine(change => change.to >= change.from, {
  message: 'Track change end must be greater than or equal to start',
  path: ['to'],
})

export type TrackChangeRecord = z.infer<typeof TrackChangeRecordSchema>

export interface CreateCommentInput {
  docId: string
  anchor: CommentAnchor
  content: string
  authorId: string
  reviewDecision?: ReviewDecision
  now?: number
}

export interface ReplyCommentInput {
  authorId: string
  content: string
  now?: number
}

export interface CreateMarginNoteInput {
  docId: string
  content: string
  authorId: string
  paragraphIndex: number
  now?: number
}

export interface CreateTrackChangeInput {
  docId: string
  kind: TrackChangeKind
  from: number
  to: number
  content?: string
  markAttrs?: Record<string, unknown>
  authorId: string
  now?: number
}

export interface AnchorDriftSummary {
  docId: string
  total: number
  exact: number
  drifted: number
  invalid: number
  updatedIds: string[]
}

export interface CommentReviewSummary {
  total: number
  pending: number
  resolved: number
  deleted: number
  requestChanges: number
  approvals: number
}