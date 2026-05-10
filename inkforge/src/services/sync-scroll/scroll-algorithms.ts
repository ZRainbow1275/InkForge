import { clampScrollTop } from './dom'
import type { SyncScrollAnchorOffset, SyncScrollCalculationInput, SyncScrollSide } from './types'

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function offsetForSide(anchor: SyncScrollAnchorOffset, side: SyncScrollSide): number {
  return side === 'left' ? anchor.leftOffset : anchor.rightOffset
}

export function calculateRatioScrollTop(
  sourceScrollTop: number,
  sourceMaxScrollTop: number,
  targetMaxScrollTop: number,
): number {
  if (sourceMaxScrollTop <= 0 || targetMaxScrollTop <= 0) return 0
  return clampScrollTop((sourceScrollTop / sourceMaxScrollTop) * targetMaxScrollTop, targetMaxScrollTop)
}

export function calculateSyncedScrollTop(input: SyncScrollCalculationInput): number {
  const sourceMax = Math.max(0, input.sourceMaxScrollTop)
  const targetMax = Math.max(0, input.targetMaxScrollTop)
  if (sourceMax <= 0 || targetMax <= 0) return 0

  const sourceScrollTop = clampScrollTop(input.sourceScrollTop, sourceMax)
  if (sourceScrollTop <= 0) return 0
  if (sourceScrollTop >= sourceMax - 2) return targetMax

  const targetSide: SyncScrollSide = input.sourceSide === 'left' ? 'right' : 'left'
  const anchor = input.registry.findNearestAbove(sourceScrollTop, input.sourceSide)
  if (!anchor || input.registry.count === 0) {
    return calculateRatioScrollTop(sourceScrollTop, sourceMax, targetMax)
  }

  const sourceAnchorOffset = offsetForSide(anchor, input.sourceSide)
  const targetAnchorOffset = offsetForSide(anchor, targetSide)
  const distanceFromAnchor = Math.max(0, sourceScrollTop - sourceAnchorOffset)
  const nextAnchor = input.registry.findNext(anchor, input.sourceSide)

  if (nextAnchor) {
    const sourceSection = offsetForSide(nextAnchor, input.sourceSide) - sourceAnchorOffset
    const targetSection = offsetForSide(nextAnchor, targetSide) - targetAnchorOffset
    if (sourceSection <= 0 || targetSection === 0) {
      return clampScrollTop(targetAnchorOffset, targetMax)
    }
    return clampScrollTop(targetAnchorOffset + clampRatio(distanceFromAnchor / sourceSection) * targetSection, targetMax)
  }

  const sourceRemain = sourceMax - sourceAnchorOffset
  const targetRemain = targetMax - targetAnchorOffset
  if (sourceRemain <= 0 || targetRemain <= 0) {
    return clampScrollTop(targetAnchorOffset, targetMax)
  }
  return clampScrollTop(targetAnchorOffset + clampRatio(distanceFromAnchor / sourceRemain) * targetRemain, targetMax)
}