import { describe, expect, it } from 'vitest'
import { schema } from '@tiptap/pm/schema-basic'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import {
  createMoveTopLevelBlockTransaction,
  getTopLevelBlockRanges,
  isSupportedDraggableBlock,
  moveCurrentTopLevelBlock,
} from '../moveBlock'

function paragraph(text: string) {
  return schema.nodes.paragraph.create(null, schema.text(text))
}

function heading(text: string, level = 2) {
  return schema.nodes.heading.create({ level }, schema.text(text))
}

function stateFromBlocks(blocks: ReturnType<typeof paragraph>[]): EditorState {
  return EditorState.create({ doc: schema.nodes.doc.create(null, blocks) })
}

function blockTexts(state: EditorState): string[] {
  const texts: string[] = []
  state.doc.forEach((node) => texts.push(node.textContent))
  return texts
}

function applyMove(state: EditorState, sourcePos: number, targetPos: number, side: 'before' | 'after'): EditorState {
  const move = createMoveTopLevelBlockTransaction(state, sourcePos, targetPos, side)
  if (!move) {
    throw new Error('Expected move transaction')
  }
  return state.apply(move.tr)
}

describe('BlockDragHandle moveBlock helpers', () => {
  it('lists supported top-level blocks with real ProseMirror positions', () => {
    const state = stateFromBlocks([paragraph('A'), heading('B'), paragraph('C')])

    expect(getTopLevelBlockRanges(state.doc).map(range => ({ pos: range.pos, text: range.node.textContent }))).toEqual([
      { pos: 0, text: 'A' },
      { pos: 3, text: 'B' },
      { pos: 6, text: 'C' },
    ])
  })

  it('keeps image nodes outside the generic block drag scope', () => {
    const image = schema.nodes.image.create({ src: 'inkforge://asset/real-image', alt: 'asset image' })

    expect(isSupportedDraggableBlock(image)).toBe(false)
  })

  it('moves a block after a later block using a single transaction', () => {
    const state = stateFromBlocks([paragraph('A'), paragraph('B'), paragraph('C')])
    const nextState = applyMove(state, 0, 3, 'after')

    expect(blockTexts(nextState)).toEqual(['B', 'A', 'C'])
  })

  it('moves a later block before an earlier block without duplicating content', () => {
    const state = stateFromBlocks([paragraph('A'), paragraph('B'), paragraph('C')])
    const nextState = applyMove(state, 6, 0, 'before')

    expect(blockTexts(nextState)).toEqual(['C', 'A', 'B'])
  })

  it('refuses no-op moves that target the source boundary', () => {
    const state = stateFromBlocks([paragraph('A'), paragraph('B')])

    expect(createMoveTopLevelBlockTransaction(state, 0, 3, 'before')).toBeNull()
    expect(createMoveTopLevelBlockTransaction(state, 3, 0, 'after')).toBeNull()
  })

  it('moves the selected current block down with the keyboard helper', () => {
    const base = stateFromBlocks([paragraph('A'), paragraph('B'), paragraph('C')])
    const state = base.apply(base.tr.setSelection(TextSelection.create(base.doc, 1)))
    let nextState = state

    const moved = moveCurrentTopLevelBlock(state, (tr) => {
      nextState = state.apply(tr)
    }, 'down')

    expect(moved).toBe(true)
    expect(blockTexts(nextState)).toEqual(['B', 'A', 'C'])
  })

  it('refuses keyboard moves past document boundaries', () => {
    const base = stateFromBlocks([paragraph('A'), paragraph('B')])
    const firstSelected = base.apply(base.tr.setSelection(TextSelection.create(base.doc, 1)))
    const lastSelected = base.apply(base.tr.setSelection(TextSelection.create(base.doc, 4)))

    expect(moveCurrentTopLevelBlock(firstSelected, undefined, 'up')).toBe(false)
    expect(moveCurrentTopLevelBlock(lastSelected, undefined, 'down')).toBe(false)
  })
})
