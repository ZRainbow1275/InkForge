import { describe, expect, it } from 'vitest'
import { schema } from '@tiptap/pm/schema-basic'

import { createDropIndicatorDecorations } from '../decorations'

function testDoc() {
  return schema.nodes.doc.create(null, [
    schema.nodes.paragraph.create(null, schema.text('A')),
    schema.nodes.paragraph.create(null, schema.text('B')),
  ])
}

describe('BlockDragHandle drop indicator decorations', () => {
  it('returns an empty decoration set without a drop target', () => {
    const doc = testDoc()

    expect(createDropIndicatorDecorations(doc, null).find()).toHaveLength(0)
  })

  it('places the before indicator at the target block start', () => {
    const doc = testDoc()
    const decorations = createDropIndicatorDecorations(doc, { pos: 3, side: 'before' }).find()

    expect(decorations).toHaveLength(1)
    expect(decorations[0].from).toBe(3)
    expect(decorations[0].to).toBe(3)
  })

  it('places the after indicator at the target block end', () => {
    const doc = testDoc()
    const decorations = createDropIndicatorDecorations(doc, { pos: 0, side: 'after' }).find()

    expect(decorations).toHaveLength(1)
    expect(decorations[0].from).toBe(3)
    expect(decorations[0].to).toBe(3)
  })

  it('refuses stale drop targets outside the document', () => {
    const doc = testDoc()

    expect(createDropIndicatorDecorations(doc, { pos: 999, side: 'before' }).find()).toHaveLength(0)
  })
})
