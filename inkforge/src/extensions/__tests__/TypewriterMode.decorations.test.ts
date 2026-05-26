/**
 * @vitest-environment happy-dom
 *
 * Regression: TypewriterMode plugin 2 (decorations).
 *
 * Verifies the real ProseMirror decoration set produced by the dim/sentence/
 * sidebar logic. Uses a real ProseMirror schema (list nodes spliced into
 * schema-basic) so nested-list anchoring and sentence dimming exercise the
 * same code paths the editor runs in production.
 */
import { describe, expect, it } from 'vitest'
import { Schema, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { schema as basicSchema } from '@tiptap/pm/schema-basic'
import { addListNodes } from '@tiptap/pm/schema-list'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import { DecorationSet } from '@tiptap/pm/view'

import { TypewriterMode } from '../TypewriterMode'

// Build a schema with paragraph, heading, code-block + list nodes so we can
// exercise nested-list anchoring and sentence-split skip rules.
const listSchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
  marks: basicSchema.spec.marks,
})

interface ExtensionShape {
  options: { enabled: boolean; cursorPosition: number; scrollBehavior: ScrollBehavior; dimInactiveParagraphs: boolean }
  addProseMirrorPlugins: () => unknown[]
}

function instantiateExtension(opts: Partial<ExtensionShape['options']>): ExtensionShape {
  const defaults = { enabled: false, cursorPosition: 0.5, scrollBehavior: 'smooth' as ScrollBehavior, dimInactiveParagraphs: true }
  const options = { ...defaults, ...opts }
  // TypewriterMode is a Tiptap Extension. We invoke its plugin factory through
  // a hand-rolled `this` to avoid pulling the full Tiptap Editor into the
  // happy-dom test (which would require a DOM, schema wiring, etc.).
  const ext = TypewriterMode as unknown as { config: { addProseMirrorPlugins: (this: { options: typeof options }) => unknown[] } }
  return {
    options,
    addProseMirrorPlugins: () => ext.config.addProseMirrorPlugins.call({ options }),
  }
}

interface PMPlugin {
  props?: {
    decorations?: (state: EditorState) => DecorationSet | null | undefined
  }
}

function getDecorationsPlugin(plugins: unknown[]): PMPlugin {
  // Plugin 2 is the dim/sentence/sidebar decorations plugin.
  const plugin = plugins[1] as PMPlugin
  if (!plugin?.props?.decorations) {
    throw new Error('expected decorations plugin at index 1')
  }
  return plugin
}

function decorationClasses(set: DecorationSet, doc: ProseMirrorNode): string[] {
  return set.find(0, doc.content.size).map(deco => {
    // `Decoration` exposes `.type.attrs.class` for both node + inline decos
    // when constructed via Decoration.node / Decoration.inline with a class
    // attribute (which TypewriterMode does).
    const type = (deco as unknown as { type: { attrs?: { class?: string } } }).type
    return type?.attrs?.class ?? ''
  })
}

function buildState(doc: ProseMirrorNode, selectionFrom: number, options: Partial<ExtensionShape['options']>): { state: EditorState; plugin: PMPlugin } {
  const ext = instantiateExtension(options)
  const plugin = getDecorationsPlugin(ext.addProseMirrorPlugins())
  const state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, selectionFrom),
  })
  return { state, plugin }
}

describe('TypewriterMode plugin 2 — decorations()', () => {
  it('returns DecorationSet.empty when enabled = false', () => {
    const doc = listSchema.nodes.doc.create(null, [
      listSchema.nodes.paragraph.create(null, listSchema.text('Hello world.')),
    ])
    const { state, plugin } = buildState(doc, 2, { enabled: false })
    const result = plugin.props!.decorations!(state)
    expect(result).toBe(DecorationSet.empty)
  })

  it('returns DecorationSet.empty when dimInactiveParagraphs = false', () => {
    const doc = listSchema.nodes.doc.create(null, [
      listSchema.nodes.paragraph.create(null, listSchema.text('Hello world.')),
    ])
    const { state, plugin } = buildState(doc, 2, { enabled: true, dimInactiveParagraphs: false })
    const result = plugin.props!.decorations!(state)
    expect(result).toBe(DecorationSet.empty)
  })

  it('emits active + near + far classes for five-paragraph doc with cursor in middle', () => {
    const para = (text: string) => listSchema.nodes.paragraph.create(null, listSchema.text(text))
    const doc = listSchema.nodes.doc.create(null, [
      para('First paragraph one.'),
      para('Second paragraph two.'),
      para('Third middle paragraph three.'),
      para('Fourth paragraph four.'),
      para('Fifth paragraph five.'),
    ])

    // Cursor sits inside the 3rd paragraph (index 2). Paragraphs 1 and 3 are
    // distance 1 (near) and paragraphs 0, 4 are distance 2 (far).
    const p1Size = doc.child(0).nodeSize
    const p2Size = doc.child(1).nodeSize
    const thirdParagraphStart = p1Size + p2Size
    const cursor = thirdParagraphStart + 5
    const { state, plugin } = buildState(doc, cursor, { enabled: true })
    const set = plugin.props!.decorations!(state) as DecorationSet
    const classes = decorationClasses(set, doc)

    expect(classes).toContain('typewriter-block-active')
    expect(classes.some(c => c.includes('typewriter-dim-near'))).toBe(true)
    expect(classes.some(c => c.includes('typewriter-dim-far'))).toBe(true)
  })

  it('anchors block-active to the inner paragraph inside a list-item, not the wrapping list', () => {
    const text = listSchema.text('Item A sentence.')
    const p = listSchema.nodes.paragraph.create(null, text)
    const li = listSchema.nodes.list_item.create(null, [p])
    const ul = listSchema.nodes.bullet_list.create(null, [li])
    const doc = listSchema.nodes.doc.create(null, [ul])

    // Cursor inside the paragraph inside the list item:
    //  doc-start=0, ul-open=1, li-open=2, p-open=3, text-start=3 (positions 3..3+len)
    // Place cursor at content offset 1 inside the paragraph text.
    const cursor = 3 + 1
    const { state, plugin } = buildState(doc, cursor, { enabled: true })
    const set = plugin.props!.decorations!(state) as DecorationSet
    const decos = set.find(0, doc.content.size)

    const activeDeco = decos.find(d => {
      const cls = (d as unknown as { type: { attrs?: { class?: string } } }).type?.attrs?.class
      return cls === 'typewriter-block-active'
    })
    expect(activeDeco).toBeTruthy()

    // The active decoration must NOT span the entire bullet_list. It should
    // cover the inner paragraph only. bullet_list spans [0 .. doc.content.size).
    const ulSize = doc.firstChild!.nodeSize
    expect(activeDeco!.from).toBeGreaterThan(0)
    expect(activeDeco!.to).toBeLessThan(ulSize)
  })

  it('emits sentence-dim inline decorations excluding the cursor sentence', () => {
    // Three Chinese sentences in one paragraph.
    const text = listSchema.text('句一。句二。句三。')
    const para = listSchema.nodes.paragraph.create(null, text)
    const doc = listSchema.nodes.doc.create(null, [para])

    // Cursor inside the middle sentence "句二。" (index 3..6 in content).
    // Paragraph content starts at position 1; place cursor at content offset 4.
    const cursor = 1 + 4
    const { state, plugin } = buildState(doc, cursor, { enabled: true })
    const set = plugin.props!.decorations!(state) as DecorationSet
    const decos = set.find(0, doc.content.size)
    const sentenceDims = decos.filter(d => {
      const cls = (d as unknown as { type: { attrs?: { class?: string } } }).type?.attrs?.class
      return cls === 'typewriter-sentence-dim'
    })

    // Two non-active sentences → at least 2 sentence-dim decorations.
    expect(sentenceDims.length).toBeGreaterThanOrEqual(2)

    // The cursor sentence (中段 "句二。") must NOT be among the dim ranges.
    // Sentence "句二。" lives at text content offsets 3..6, so decoration
    // doc-positions are 4..7.
    const cursorSentenceFrom = 1 + 3
    const cursorSentenceTo = 1 + 6
    const cursorDimmed = sentenceDims.find(d => d.from === cursorSentenceFrom && d.to === cursorSentenceTo)
    expect(cursorDimmed).toBeUndefined()
  })

  it('marks the only paragraph as active without near/far when document has a single block', () => {
    const doc = listSchema.nodes.doc.create(null, [
      listSchema.nodes.paragraph.create(null, listSchema.text('Solo paragraph.')),
    ])
    const { state, plugin } = buildState(doc, 2, { enabled: true })
    const set = plugin.props!.decorations!(state) as DecorationSet
    const classes = decorationClasses(set, doc)

    expect(classes).toContain('typewriter-block-active')
    expect(classes.some(c => c.includes('typewriter-dim-near'))).toBe(false)
    expect(classes.some(c => c.includes('typewriter-dim-far'))).toBe(false)
  })
})
