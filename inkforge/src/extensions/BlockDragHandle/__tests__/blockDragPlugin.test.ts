import { describe, expect, it } from 'vitest'
import { schema } from '@tiptap/pm/schema-basic'
import { EditorState } from '@tiptap/pm/state'

import { blockDragPluginKey, createBlockDragPlugin } from '../blockDragPlugin'
import type { BlockDragHandleOptions } from '../types'

const OPTIONS: BlockDragHandleOptions = {
  showDelay: 200,
  hideDelay: 400,
  mouseThrottleMs: 33,
  enabled: () => true,
}

function createState() {
  return EditorState.create({
    doc: schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, schema.text('A')),
      schema.nodes.paragraph.create(null, schema.text('B')),
    ]),
    plugins: [createBlockDragPlugin(OPTIONS)],
  })
}

describe('BlockDragHandle plugin state', () => {
  it('starts without transient drag state', () => {
    const state = createState()

    expect(blockDragPluginKey.getState(state)).toEqual({
      dropTarget: null,
      draggingPos: null,
    })
  })

  it('stores transient drag metadata without changing document content', () => {
    const state = createState()
    const nextState = state.apply(
      state.tr.setMeta(blockDragPluginKey, {
        dropTarget: { pos: 3, side: 'before' },
        draggingPos: 0,
      }),
    )

    expect(nextState.doc.eq(state.doc)).toBe(true)
    expect(blockDragPluginKey.getState(nextState)).toEqual({
      dropTarget: { pos: 3, side: 'before' },
      draggingPos: 0,
    })
  })

  it('clears transient drag state after document changes', () => {
    const state = createState()
    const draggingState = state.apply(
      state.tr.setMeta(blockDragPluginKey, {
        dropTarget: { pos: 3, side: 'after' },
        draggingPos: 0,
      }),
    )

    const changedState = draggingState.apply(draggingState.tr.insertText('!', 1))

    expect(blockDragPluginKey.getState(changedState)).toEqual({
      dropTarget: null,
      draggingPos: null,
    })
  })
})
