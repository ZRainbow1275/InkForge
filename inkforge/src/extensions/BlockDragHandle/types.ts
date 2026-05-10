import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export type BlockDropSide = 'before' | 'after'
export type BlockMoveDirection = 'up' | 'down'

export interface BlockInfo {
  pos: number
  node: ProseMirrorNode
  dom: HTMLElement
}

export interface DropTarget {
  pos: number
  side: BlockDropSide
  dom: HTMLElement
}

export interface BlockDragHandleOptions {
  showDelay: number
  hideDelay: number
  mouseThrottleMs: number
  enabled: () => boolean
}

export interface BlockDragPluginMeta {
  dropTarget?: {
    pos: number
    side: BlockDropSide
  } | null
  draggingPos?: number | null
}

export interface BlockDragPluginState {
  dropTarget: {
    pos: number
    side: BlockDropSide
  } | null
  draggingPos: number | null
}

export interface MoveBlockResult {
  tr: import('@tiptap/pm/state').Transaction
  movedFrom: number
  movedTo: number
}
