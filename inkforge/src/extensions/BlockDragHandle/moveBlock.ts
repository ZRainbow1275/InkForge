import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state'
import type { BlockDropSide, BlockMoveDirection, MoveBlockResult } from './types'

export const SUPPORTED_BLOCK_NODE_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'taskList',
  'codeBlock',
  'richCodeBlock',
  'table',
  'horizontalRule',
  'detailsBlock',
])

export interface TopLevelBlockRange {
  pos: number
  node: ProseMirrorNode
  from: number
  to: number
}

export function isSupportedDraggableBlock(node: ProseMirrorNode): boolean {
  return node.isBlock && SUPPORTED_BLOCK_NODE_TYPES.has(node.type.name)
}

export function getTopLevelBlockRanges(doc: ProseMirrorNode): TopLevelBlockRange[] {
  const ranges: TopLevelBlockRange[] = []

  doc.forEach((node, offset) => {
    if (!isSupportedDraggableBlock(node)) {
      return
    }

    ranges.push({
      pos: offset,
      node,
      from: offset,
      to: offset + node.nodeSize,
    })
  })

  return ranges
}

export function findTopLevelBlockRange(doc: ProseMirrorNode, pos: number): TopLevelBlockRange | null {
  return getTopLevelBlockRanges(doc).find(range => range.pos === pos) ?? null
}

export function resolveCurrentTopLevelBlock(state: EditorState): TopLevelBlockRange | null {
  const { $from } = state.selection

  if ($from.depth < 1) {
    return null
  }

  const blockPos = $from.before(1)
  return findTopLevelBlockRange(state.doc, blockPos)
}

function setSelectionNearMovedBlock(tr: Transaction, movedTo: number): Transaction {
  const selectionPos = Math.min(Math.max(movedTo + 1, 0), tr.doc.content.size)

  try {
    return tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1))
  } catch {
    return tr
  }
}

export function createMoveTopLevelBlockTransaction(
  state: EditorState,
  sourcePos: number,
  targetPos: number,
  side: BlockDropSide,
): MoveBlockResult | null {
  const source = findTopLevelBlockRange(state.doc, sourcePos)
  const target = findTopLevelBlockRange(state.doc, targetPos)

  if (!source || !target) {
    return null
  }

  const rawInsertPos = side === 'before' ? target.from : target.to

  if (source.from === target.from || rawInsertPos === source.from || rawInsertPos === source.to) {
    return null
  }

  if (rawInsertPos > source.from && rawInsertPos < source.to) {
    return null
  }

  const tr = state.tr
  let movedTo = rawInsertPos

  if (rawInsertPos > source.from) {
    movedTo = rawInsertPos - source.node.nodeSize
    tr.delete(source.from, source.to)
    tr.insert(movedTo, source.node.copy(source.node.content))
  } else {
    tr.insert(rawInsertPos, source.node.copy(source.node.content))
    tr.delete(source.from + source.node.nodeSize, source.to + source.node.nodeSize)
  }

  tr.setMeta('addToHistory', true)
  setSelectionNearMovedBlock(tr, movedTo)
  tr.scrollIntoView()

  return {
    tr,
    movedFrom: source.from,
    movedTo,
  }
}

export function moveCurrentTopLevelBlock(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  direction: BlockMoveDirection,
): boolean {
  const current = resolveCurrentTopLevelBlock(state)
  if (!current) {
    return false
  }

  const ranges = getTopLevelBlockRanges(state.doc)
  const currentIndex = ranges.findIndex(range => range.pos === current.pos)

  if (currentIndex === -1) {
    return false
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  const target = ranges[targetIndex]

  if (!target) {
    return false
  }

  const move = createMoveTopLevelBlockTransaction(
    state,
    current.pos,
    target.pos,
    direction === 'up' ? 'before' : 'after',
  )

  if (!move) {
    return false
  }

  if (dispatch) {
    dispatch(move.tr)
  }

  return true
}
