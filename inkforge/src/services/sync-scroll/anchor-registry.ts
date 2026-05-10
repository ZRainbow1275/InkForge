import { getElementScrollOffset, queryElementById } from './dom'
import type { SyncScrollAnchorOffset, SyncScrollRebuildInput, SyncScrollRegistrySnapshot, SyncScrollSide } from './types'

function asElement(value: Node | null): Element | null {
  if (!value) return null
  return value instanceof Element ? value : value.parentElement
}

function offsetForSide(anchor: SyncScrollAnchorOffset, side: SyncScrollSide): number {
  return side === 'left' ? anchor.leftOffset : anchor.rightOffset
}

export class AnchorRegistry {
  private anchors: SyncScrollAnchorOffset[] = []
  private rebuiltAt: number | null = null

  get count(): number {
    return this.anchors.length
  }

  clear(): void {
    this.anchors = []
    this.rebuiltAt = null
  }

  snapshot(): SyncScrollRegistrySnapshot {
    return { anchors: [...this.anchors], rebuiltAt: this.rebuiltAt }
  }

  rebuild(input: SyncScrollRebuildInput): SyncScrollRegistrySnapshot {
    const nextAnchors: SyncScrollAnchorOffset[] = []

    for (const heading of input.headings) {
      const leftElement = asElement(input.editor.view.nodeDOM(heading.pos))
      const rightElement = queryElementById(input.previewRootElement, heading.domId)
      if (!leftElement || !rightElement) continue

      nextAnchors.push({
        id: heading.id,
        pos: heading.pos,
        leftElement,
        rightElement,
        leftOffset: getElementScrollOffset(leftElement, input.leftScrollElement),
        rightOffset: getElementScrollOffset(rightElement, input.rightScrollElement),
      })
    }

    this.anchors = nextAnchors.sort((first, second) => first.leftOffset - second.leftOffset || first.rightOffset - second.rightOffset)
    this.rebuiltAt = Date.now()
    return this.snapshot()
  }

  findNearestAbove(scrollTop: number, side: SyncScrollSide): SyncScrollAnchorOffset | null {
    let nearest: SyncScrollAnchorOffset | null = null
    for (const anchor of this.anchors) {
      if (offsetForSide(anchor, side) <= scrollTop + 1) {
        nearest = anchor
      } else {
        break
      }
    }
    return nearest
  }

  findNext(anchor: SyncScrollAnchorOffset, side: SyncScrollSide): SyncScrollAnchorOffset | null {
    const index = this.anchors.findIndex(candidate => candidate.id === anchor.id && candidate.pos === anchor.pos)
    if (index < 0) return null
    for (let nextIndex = index + 1; nextIndex < this.anchors.length; nextIndex += 1) {
      const next = this.anchors[nextIndex]
      if (offsetForSide(next, side) > offsetForSide(anchor, side)) {
        return next
      }
    }
    return null
  }
}