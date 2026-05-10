import { AppError, ErrorCode } from '@/services/error'
import type { CreateTrackChangeInput, TrackChangeRecord, TrackChangeStatus } from './types'

export function buildTrackChange(input: CreateTrackChangeInput, id: string): TrackChangeRecord {
  const now = input.now ?? Date.now()
  return {
    id,
    docId: input.docId,
    kind: input.kind,
    from: input.from,
    to: input.to,
    content: input.content,
    markAttrs: input.markAttrs,
    authorId: input.authorId,
    createdAt: now,
    status: 'pending',
  }
}

export function applyTrackChangeToText(text: string, change: TrackChangeRecord, decision: Exclude<TrackChangeStatus, 'pending'>): string {
  if (change.status !== 'pending') {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Only pending track changes can be applied', { changeId: change.id, status: change.status })
  }

  if (decision === 'rejected') return text

  const from = Math.max(0, Math.min(change.from, text.length))
  const to = Math.max(from, Math.min(change.to, text.length))

  if (change.kind === 'insert') {
    return `${text.slice(0, from)}${change.content ?? ''}${text.slice(from)}`
  }

  if (change.kind === 'delete') {
    return `${text.slice(0, from)}${text.slice(to)}`
  }

  return text
}