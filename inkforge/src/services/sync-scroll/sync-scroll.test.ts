import { describe, expect, it } from 'vitest'
import {
  ScrollLoopDetector,
  calculateRatioScrollTop,
  calculateSyncedScrollTop,
  createResizeRebuildObserver,
  setScrollTopImmediate,
  type SyncScrollAnchorOffset,
  type SyncScrollSide,
} from './index'

function anchor(id: string, leftOffset: number, rightOffset: number): SyncScrollAnchorOffset {
  return {
    id,
    pos: leftOffset,
    leftOffset,
    rightOffset,
    leftElement: {} as Element,
    rightElement: {} as Element,
  }
}

function registry(anchors: SyncScrollAnchorOffset[]) {
  return {
    count: anchors.length,
    findNearestAbove(scrollTop: number, side: SyncScrollSide): SyncScrollAnchorOffset | null {
      const key = side === 'left' ? 'leftOffset' : 'rightOffset'
      const matches = anchors.filter(item => item[key] <= scrollTop + 1)
      return matches.length > 0 ? matches[matches.length - 1] : null
    },
    findNext(current: SyncScrollAnchorOffset, side: SyncScrollSide): SyncScrollAnchorOffset | null {
      const key = side === 'left' ? 'leftOffset' : 'rightOffset'
      return anchors.find(item => item[key] > current[key]) ?? null
    },
  }
}

describe('sync scroll algorithms', () => {
  it('falls back to proportional mapping when no anchors exist', () => {
    expect(calculateRatioScrollTop(250, 1000, 400)).toBe(100)
    expect(calculateSyncedScrollTop({
      sourceSide: 'left',
      sourceScrollTop: 250,
      sourceMaxScrollTop: 1000,
      targetMaxScrollTop: 400,
      registry: registry([]),
    })).toBe(100)
  })

  it('keeps top and bottom positions exact', () => {
    const anchors = registry([anchor('a', 100, 40)])
    expect(calculateSyncedScrollTop({ sourceSide: 'left', sourceScrollTop: 0, sourceMaxScrollTop: 1000, targetMaxScrollTop: 500, registry: anchors })).toBe(0)
    expect(calculateSyncedScrollTop({ sourceSide: 'left', sourceScrollTop: 999, sourceMaxScrollTop: 1000, targetMaxScrollTop: 500, registry: anchors })).toBe(500)
  })

  it('interpolates between matching left and right anchors', () => {
    const anchors = registry([
      anchor('intro', 100, 50),
      anchor('details', 500, 350),
    ])

    expect(calculateSyncedScrollTop({
      sourceSide: 'left',
      sourceScrollTop: 300,
      sourceMaxScrollTop: 900,
      targetMaxScrollTop: 700,
      registry: anchors,
    })).toBe(200)
  })

  it('maps right-to-left using the same anchor semantics', () => {
    const anchors = registry([
      anchor('intro', 100, 50),
      anchor('details', 500, 350),
    ])

    expect(calculateSyncedScrollTop({
      sourceSide: 'right',
      sourceScrollTop: 200,
      sourceMaxScrollTop: 700,
      targetMaxScrollTop: 900,
      registry: anchors,
    })).toBe(300)
  })

  it('uses remaining height after the final anchor', () => {
    const anchors = registry([
      anchor('intro', 100, 50),
      anchor('details', 500, 350),
    ])

    expect(calculateSyncedScrollTop({
      sourceSide: 'left',
      sourceScrollTop: 700,
      sourceMaxScrollTop: 900,
      targetMaxScrollTop: 750,
      registry: anchors,
    })).toBe(550)
  })
})

describe('sync scroll runtime guards', () => {
  it('detects alternating scroll loops inside the configured window', () => {
    const detector = new ScrollLoopDetector(5, 100)
    expect(detector.record('left', 0)).toBe(false)
    expect(detector.record('right', 20)).toBe(false)
    expect(detector.record('left', 40)).toBe(false)
    expect(detector.record('right', 60)).toBe(false)
    expect(detector.record('left', 80)).toBe(true)
  })

  it('sets scrollTop immediately and restores scroll behavior', () => {
    const element = {
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 400,
      style: { scrollBehavior: 'smooth' },
    } as unknown as HTMLElement

    setScrollTopImmediate(element, 900)
    expect(element.scrollTop).toBe(600)
    expect(element.style.scrollBehavior).toBe('smooth')
  })

  it('creates a safe no-op observer when ResizeObserver is unavailable', () => {
    const observer = createResizeRebuildObserver(() => undefined)
    expect(() => observer.observe({ querySelectorAll: () => [] } as unknown as HTMLElement)).not.toThrow()
    expect(() => observer.disconnect()).not.toThrow()
  })
})