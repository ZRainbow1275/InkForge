import type { CommentAnchor } from './types'

const DEFAULT_CONTEXT_LENGTH = 32

export interface BuildCommentAnchorInput {
  from: number
  to: number
  text: string
  versionId: string
  documentText?: string
  now?: number
}

function clampOffset(value: number, max: number): number {
  return Math.max(0, Math.min(value, max))
}

function nearestIndexOf(text: string, needle: string, near: number): number {
  if (!needle) return -1
  let best = -1
  let bestDistance = Number.POSITIVE_INFINITY
  let cursor = text.indexOf(needle)

  while (cursor !== -1) {
    const distance = Math.abs(cursor - near)
    if (distance < bestDistance) {
      best = cursor
      bestDistance = distance
    }
    cursor = text.indexOf(needle, cursor + 1)
  }

  return best
}

function exactAnchor(anchor: CommentAnchor, now: number): CommentAnchor {
  const rest = { ...anchor }
  delete rest.driftedFrom
  delete rest.driftedTo
  return {
    ...rest,
    anchorStatus: 'exact',
    updatedAt: now,
  }
}

function driftedAnchor(anchor: CommentAnchor, from: number, to: number, now: number): CommentAnchor {
  return {
    ...anchor,
    from,
    to,
    anchorStatus: 'drifted',
    driftedFrom: from,
    driftedTo: to,
    updatedAt: now,
  }
}

function invalidAnchor(anchor: CommentAnchor, now: number): CommentAnchor {
  const rest = { ...anchor }
  delete rest.driftedFrom
  delete rest.driftedTo
  return {
    ...rest,
    anchorStatus: 'invalid',
    updatedAt: now,
  }
}

function contextRange(anchor: CommentAnchor, newContent: string): { from: number; to: number } | null {
  if (!anchor.prefix && !anchor.suffix) return null

  const prefixIndex = anchor.prefix ? nearestIndexOf(newContent, anchor.prefix, anchor.from - anchor.prefix.length) : -1
  const suffixIndex = anchor.suffix ? nearestIndexOf(newContent, anchor.suffix, anchor.to) : -1

  if (prefixIndex >= 0 && suffixIndex >= 0) {
    const from = prefixIndex + (anchor.prefix?.length ?? 0)
    if (suffixIndex >= from) return { from, to: suffixIndex }
  }

  if (prefixIndex >= 0 && anchor.text) {
    const from = prefixIndex + (anchor.prefix?.length ?? 0)
    const nearby = newContent.indexOf(anchor.text, from)
    if (nearby >= 0) return { from: nearby, to: nearby + anchor.text.length }
  }

  if (suffixIndex >= 0 && anchor.text) {
    const start = Math.max(0, suffixIndex - anchor.text.length - DEFAULT_CONTEXT_LENGTH)
    const nearby = newContent.indexOf(anchor.text, start)
    if (nearby >= 0 && nearby <= suffixIndex) return { from: nearby, to: nearby + anchor.text.length }
  }

  return null
}

export function buildCommentAnchor(input: BuildCommentAnchorInput): CommentAnchor {
  const doc = input.documentText ?? ''
  const from = clampOffset(input.from, doc.length || input.from)
  const to = clampOffset(input.to, doc.length || input.to)
  const prefix = doc ? doc.slice(Math.max(0, from - DEFAULT_CONTEXT_LENGTH), from) : undefined
  const suffix = doc ? doc.slice(to, Math.min(doc.length, to + DEFAULT_CONTEXT_LENGTH)) : undefined

  return {
    from,
    to,
    text: input.text,
    versionId: input.versionId,
    anchorStatus: 'exact',
    prefix,
    suffix,
    updatedAt: input.now,
  }
}

export class AnchorDriftTracker {
  updateAnchor(anchor: CommentAnchor, oldContent: string, newContent: string, now: number = Date.now()): CommentAnchor {
    const safeFrom = clampOffset(anchor.from, newContent.length)
    const safeTo = clampOffset(anchor.to, newContent.length)
    const currentSlice = newContent.slice(safeFrom, safeTo)

    if (currentSlice === anchor.text) {
      if (anchor.anchorStatus === 'exact' && safeFrom === anchor.from && safeTo === anchor.to) {
        return exactAnchor(anchor, now)
      }
      return driftedAnchor(anchor, safeFrom, safeTo, now)
    }

    const positionDelta = newContent.length - oldContent.length
    const shiftedFrom = clampOffset(anchor.from + positionDelta, newContent.length)
    const shiftedTo = clampOffset(anchor.to + positionDelta, newContent.length)
    if (newContent.slice(shiftedFrom, shiftedTo) === anchor.text) {
      return driftedAnchor(anchor, shiftedFrom, shiftedTo, now)
    }

    const exactMatch = nearestIndexOf(newContent, anchor.text, anchor.from)
    if (exactMatch >= 0) {
      return driftedAnchor(anchor, exactMatch, exactMatch + anchor.text.length, now)
    }

    const contextual = contextRange(anchor, newContent)
    if (contextual && contextual.to >= contextual.from) {
      return driftedAnchor(anchor, contextual.from, contextual.to, now)
    }

    return invalidAnchor(anchor, now)
  }
}

export const anchorDriftTracker = new AnchorDriftTracker()