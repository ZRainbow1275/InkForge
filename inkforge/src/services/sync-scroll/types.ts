import type { Editor } from '@tiptap/core'
import type { TocHeading } from '@/services/toc'

export type SyncScrollSide = 'left' | 'right'

export interface SyncScrollAnchorOffset {
  id: string
  pos: number
  leftOffset: number
  rightOffset: number
  leftElement: Element
  rightElement: Element
}

export interface SyncScrollRebuildInput {
  headings: TocHeading[]
  editor: Editor
  leftScrollElement: HTMLElement
  rightScrollElement: HTMLElement
  previewRootElement: HTMLElement
}

export interface SyncScrollRegistrySnapshot {
  anchors: SyncScrollAnchorOffset[]
  rebuiltAt: number | null
}

export interface SyncScrollCalculationInput {
  sourceSide: SyncScrollSide
  sourceScrollTop: number
  sourceMaxScrollTop: number
  targetMaxScrollTop: number
  registry: {
    count: number
    findNearestAbove(scrollTop: number, side: SyncScrollSide): SyncScrollAnchorOffset | null
    findNext(anchor: SyncScrollAnchorOffset, side: SyncScrollSide): SyncScrollAnchorOffset | null
  }
}