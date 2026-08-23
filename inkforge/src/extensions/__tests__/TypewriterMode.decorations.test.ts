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
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Schema, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { schema as basicSchema } from '@tiptap/pm/schema-basic'
import { addListNodes } from '@tiptap/pm/schema-list'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import { DecorationSet } from '@tiptap/pm/view'

import { TYPEWRITER_MODE_REFRESH_META, TypewriterMode } from '../TypewriterMode'

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
  spec?: {
    view?: (view: unknown) => {
      update: (view: unknown, prevState: EditorState) => void
      destroy: () => void
    }
  }
  props?: {
    decorations?: (state: EditorState) => DecorationSet | null | undefined
  }
}

afterEach(() => {
  delete document.documentElement.dataset.reducedMotion
  vi.unstubAllGlobals()
})

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

function spacerPixels(editorDom: HTMLElement, property: '--typewriter-head-space' | '--typewriter-tail-space'): number {
  return Number.parseFloat(editorDom.style.getPropertyValue(property)) || 0
}

function bindEditorScrollGeometry(
  editorDom: HTMLElement,
  baseScrollHeight: number,
  clientHeight = 1000,
): void {
  Object.defineProperties(editorDom, {
    scrollHeight: {
      configurable: true,
      get: () => (
        baseScrollHeight
        + spacerPixels(editorDom, '--typewriter-head-space')
        + spacerPixels(editorDom, '--typewriter-tail-space')
      ),
    },
    clientHeight: { configurable: true, value: clientHeight },
  })
  editorDom.getBoundingClientRect = () => ({ top: 0, height: clientHeight }) as DOMRect
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

describe('TypewriterMode plugin 1 — cursor scrolling()', () => {
  it('aligns a restored caret on initial mount instead of leaving the document at its stale scroll position', () => {
    const paragraph = listSchema.nodes.paragraph.create(null, listSchema.text('Restored caret target.'))
    const doc = listSchema.nodes.doc.create(null, [paragraph])
    const state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 8),
    })
    const editorDom = document.createElement('div')
    editorDom.style.overflowY = 'auto'
    bindEditorScrollGeometry(editorDom, 1200)
    const scrollBy = vi.fn()
    editorDom.scrollBy = scrollBy
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    const extension = instantiateExtension({
      enabled: true,
      cursorPosition: 0.5,
      scrollBehavior: 'smooth',
    })
    const plugin = extension.addProseMirrorPlugins()[0] as PMPlugin
    const lastPosition = doc.content.size - 1
    const view = {
      dom: editorDom,
      state,
      coordsAtPos: (position: number) => {
        const headSpace = spacerPixels(editorDom, '--typewriter-head-space')
        if (position === 1) return { top: 100 + headSpace, bottom: 120 + headSpace }
        if (position === lastPosition) return { top: 900 + headSpace, bottom: 920 + headSpace }
        return { top: 650 + headSpace, bottom: 670 + headSpace }
      },
    }
    const pluginView = plugin.spec?.view?.(view)

    expect(pluginView).toBeDefined()
    // 500px target minus the real 110px paper/content inset.
    expect(editorDom.style.getPropertyValue('--typewriter-head-space')).toBe('390px')
    // 500px lower viewport reserve minus the real 290px trailing inset.
    expect(editorDom.style.getPropertyValue('--typewriter-tail-space')).toBe('210px')
    expect(scrollBy).toHaveBeenCalledWith({ top: 550, behavior: 'auto' })
    pluginView!.destroy()
    expect(editorDom.style.getPropertyValue('--typewriter-head-space')).toBe('')
  })

  it('recalculates the anchor when hydration replaces the document at the same selection position', () => {
    const previousDoc = listSchema.nodes.doc.create(null, [
      listSchema.nodes.paragraph.create(null, listSchema.text('Loading.')),
    ])
    const hydratedDoc = listSchema.nodes.doc.create(null, [
      listSchema.nodes.paragraph.create(null, listSchema.text('Hydrated first paragraph.')),
      listSchema.nodes.paragraph.create(null, listSchema.text('Hydrated final paragraph.')),
    ])
    const previousState = EditorState.create({
      doc: previousDoc,
      selection: TextSelection.create(previousDoc, 1),
    })
    const state = EditorState.create({
      doc: hydratedDoc,
      selection: TextSelection.create(hydratedDoc, 1),
    })
    const editorDom = document.createElement('div')
    editorDom.style.overflowY = 'auto'
    bindEditorScrollGeometry(editorDom, 1200)
    editorDom.scrollBy = vi.fn()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    const extension = instantiateExtension({ enabled: true, cursorPosition: 0.5 })
    const plugin = extension.addProseMirrorPlugins()[0] as PMPlugin
    const previousLastPosition = previousDoc.content.size - 1
    const hydratedLastPosition = hydratedDoc.content.size - 1
    const previousView = {
      dom: editorDom,
      state: previousState,
      coordsAtPos: (position: number) => {
        const headSpace = spacerPixels(editorDom, '--typewriter-head-space')
        if (position === 1) return { top: 100 + headSpace, bottom: 120 + headSpace }
        if (position === previousLastPosition) return { top: 200 + headSpace, bottom: 220 + headSpace }
        return { top: 100 + headSpace, bottom: 120 + headSpace }
      },
    }
    const pluginView = plugin.spec?.view?.(previousView)

    expect(pluginView).toBeDefined()
    expect(editorDom.style.getPropertyValue('--typewriter-head-space')).toBe('390px')
    expect(editorDom.style.getPropertyValue('--typewriter-tail-space')).toBe('0px')

    const hydratedView = {
      dom: editorDom,
      state,
      coordsAtPos: (position: number) => {
        const headSpace = spacerPixels(editorDom, '--typewriter-head-space')
        if (position === 1) return { top: 100 + headSpace, bottom: 120 + headSpace }
        if (position === hydratedLastPosition) return { top: 1100 + headSpace, bottom: 1120 + headSpace }
        return { top: 100 + headSpace, bottom: 120 + headSpace }
      },
    }
    pluginView!.update(hydratedView, previousState)

    expect(editorDom.style.getPropertyValue('--typewriter-head-space')).toBe('390px')
    expect(editorDom.style.getPropertyValue('--typewriter-tail-space')).toBe('410px')
    pluginView!.destroy()
  })

  it('honors an explicit refresh transaction after asynchronous editor hydration settles', () => {
    const doc = listSchema.nodes.doc.create(null, [
      listSchema.nodes.paragraph.create(null, listSchema.text('First paragraph.')),
      listSchema.nodes.paragraph.create(null, listSchema.text('Final paragraph.')),
    ])
    const extension = instantiateExtension({ enabled: true, cursorPosition: 0.5 })
    const plugin = extension.addProseMirrorPlugins()[0] as PMPlugin
    const state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 1),
      plugins: [plugin as never],
    })
    const editorDom = document.createElement('div')
    editorDom.style.overflowY = 'auto'
    bindEditorScrollGeometry(editorDom, 1200)
    editorDom.scrollBy = vi.fn()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    let lastCaretTop = 200
    const lastPosition = doc.content.size - 1
    const coordsAtPos = (position: number) => {
      const headSpace = spacerPixels(editorDom, '--typewriter-head-space')
      if (position === 1) return { top: 100 + headSpace, bottom: 120 + headSpace }
      if (position === lastPosition) {
        return { top: lastCaretTop + headSpace, bottom: lastCaretTop + 20 + headSpace }
      }
      return { top: 100 + headSpace, bottom: 120 + headSpace }
    }
    const view = { dom: editorDom, state, coordsAtPos }
    const pluginView = plugin.spec?.view?.(view)

    expect(pluginView).toBeDefined()
    expect(editorDom.style.getPropertyValue('--typewriter-tail-space')).toBe('0px')

    lastCaretTop = 1100
    const refreshedState = state.apply(
      state.tr.setMeta(TYPEWRITER_MODE_REFRESH_META, 'hydration-settled'),
    )
    pluginView!.update({ ...view, state: refreshedState }, state)

    expect(editorDom.style.getPropertyValue('--typewriter-tail-space')).toBe('410px')
    pluginView!.destroy()
  })

  it('uses the native DOM scroll chain when a restored caret is outside the declared scroll owner', () => {
    const paragraph = listSchema.nodes.paragraph.create(
      null,
      listSchema.text('Restored caret needs the real nested scroll owner.'),
    )
    const doc = listSchema.nodes.doc.create(null, [paragraph])
    const state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 8),
    })
    const editorDom = document.createElement('div')
    editorDom.style.overflowY = 'auto'
    bindEditorScrollGeometry(editorDom, 2400)
    const scrollBy = vi.fn()
    editorDom.scrollBy = scrollBy
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    let caretBaseTop = 1800
    const nativeScrollIntoView = vi.fn(() => {
      caretBaseTop = 100
    })
    const nativeCaretNode = {
      nodeType: Node.ELEMENT_NODE,
      scrollIntoView: nativeScrollIntoView,
    }
    const lastPosition = doc.content.size - 1
    const extension = instantiateExtension({ enabled: true, cursorPosition: 0.5 })
    const plugin = extension.addProseMirrorPlugins()[0] as PMPlugin
    const view = {
      dom: editorDom,
      state,
      coordsAtPos: (position: number) => {
        const headSpace = spacerPixels(editorDom, '--typewriter-head-space')
        if (position === 1) return { top: 100 + headSpace, bottom: 120 + headSpace }
        if (position === lastPosition) return { top: 2200 + headSpace, bottom: 2220 + headSpace }
        return { top: caretBaseTop + headSpace, bottom: caretBaseTop + 20 + headSpace }
      },
      domAtPos: () => ({ node: nativeCaretNode, offset: 0 }),
    }
    const pluginView = plugin.spec?.view?.(view)

    expect(pluginView).toBeDefined()
    expect(nativeScrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'center',
      inline: 'nearest',
    })
    expect(scrollBy).not.toHaveBeenCalled()
    pluginView!.destroy()
  })

  it.each(['app preference', 'system preference'])('disables smooth scrolling for %s reduced motion', (preference) => {
    const paragraph = listSchema.nodes.paragraph.create(null, listSchema.text('Cursor movement target.'))
    const doc = listSchema.nodes.doc.create(null, [paragraph])
    const previousState = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 1),
    })
    const state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 5),
    })
    const editorDom = document.createElement('div')
    editorDom.style.overflowY = 'auto'
    bindEditorScrollGeometry(editorDom, 1200)
    const scrollBy = vi.fn()
    editorDom.scrollBy = scrollBy
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    if (preference === 'app preference') {
      document.documentElement.dataset.reducedMotion = 'true'
    } else {
      vi.stubGlobal('matchMedia', () => ({ matches: true }))
    }

    const extension = instantiateExtension({ enabled: true, scrollBehavior: 'smooth' })
    const plugin = extension.addProseMirrorPlugins()[0] as PMPlugin
    const lastPosition = doc.content.size - 1
    const view = {
      dom: editorDom,
      state,
      coordsAtPos: (position: number) => {
        const headSpace = spacerPixels(editorDom, '--typewriter-head-space')
        if (position === 1) return { top: 100 + headSpace, bottom: 120 + headSpace }
        if (position === lastPosition) return { top: 1100 + headSpace, bottom: 1120 + headSpace }
        return { top: 700 + headSpace, bottom: 720 + headSpace }
      },
    }
    const pluginView = plugin.spec?.view?.({ ...view, state: previousState })

    expect(pluginView).toBeDefined()
    pluginView!.update(view, previousState)
    expect(scrollBy).toHaveBeenCalledWith({ top: 600, behavior: 'auto' })

    scrollBy.mockClear()
    extension.options.enabled = false
    pluginView!.update(view, state)
    extension.options.enabled = true
    pluginView!.update(view, state)
    expect(scrollBy).toHaveBeenCalledWith({ top: 600, behavior: 'auto' })
    pluginView!.destroy()
  })

  it('sizes the tail spacer from the cursor anchor and keeps typing-sized corrections immediate', () => {
    const paragraph = listSchema.nodes.paragraph.create(null, listSchema.text('Stable typewriter anchor.'))
    const doc = listSchema.nodes.doc.create(null, [paragraph])
    const previousState = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 1),
    })
    const state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 6),
    })
    const editorDom = document.createElement('div')
    editorDom.style.overflowY = 'auto'
    bindEditorScrollGeometry(editorDom, 1200)
    const scrollBy = vi.fn()
    editorDom.scrollBy = scrollBy
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    const extension = instantiateExtension({
      enabled: true,
      cursorPosition: 0.65,
      scrollBehavior: 'smooth',
    })
    const plugin = extension.addProseMirrorPlugins()[0] as PMPlugin
    const lastPosition = doc.content.size - 1
    const view = {
      dom: editorDom,
      state,
      coordsAtPos: (position: number) => {
        const headSpace = spacerPixels(editorDom, '--typewriter-head-space')
        if (position === 1) return { top: 90 + headSpace, bottom: 110 + headSpace }
        if (position === lastPosition) return { top: 1100 + headSpace, bottom: 1120 + headSpace }
        return { top: 180 + headSpace, bottom: 200 + headSpace }
      },
    }
    const pluginView = plugin.spec?.view?.({ ...view, state: previousState })

    expect(pluginView).toBeDefined()
    expect(editorDom.style.getPropertyValue('--typewriter-head-space')).toBe('550px')
    expect(editorDom.style.getPropertyValue('--typewriter-tail-space')).toBe('260px')
    pluginView!.update(view, previousState)
    expect(scrollBy).toHaveBeenCalledWith({ top: 90, behavior: 'auto' })
    pluginView!.destroy()
    expect(editorDom.style.getPropertyValue('--typewriter-tail-space')).toBe('')
  })

  it('repositions the current caret and tail spacer when the live cursor anchor changes', () => {
    const paragraph = listSchema.nodes.paragraph.create(null, listSchema.text('Live typewriter anchor.'))
    const doc = listSchema.nodes.doc.create(null, [paragraph])
    const state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 6),
    })
    const editorDom = document.createElement('div')
    editorDom.style.overflowY = 'auto'
    bindEditorScrollGeometry(editorDom, 1200)
    const scrollBy = vi.fn()
    editorDom.scrollBy = scrollBy
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })

    const extension = instantiateExtension({
      enabled: true,
      cursorPosition: 0.5,
      scrollBehavior: 'smooth',
    })
    const plugin = extension.addProseMirrorPlugins()[0] as PMPlugin
    const lastPosition = doc.content.size - 1
    const view = {
      dom: editorDom,
      state,
      coordsAtPos: (position: number) => {
        const headSpace = spacerPixels(editorDom, '--typewriter-head-space')
        if (position === 1) return { top: 90 + headSpace, bottom: 110 + headSpace }
        if (position === lastPosition) return { top: 1100 + headSpace, bottom: 1120 + headSpace }
        return { top: 350 + headSpace, bottom: 370 + headSpace }
      },
    }
    const pluginView = plugin.spec?.view?.(view)

    expect(pluginView).toBeDefined()
    expect(editorDom.style.getPropertyValue('--typewriter-head-space')).toBe('400px')
    expect(editorDom.style.getPropertyValue('--typewriter-tail-space')).toBe('410px')

    extension.options.cursorPosition = 0.65
    pluginView!.update(view, state)

    expect(editorDom.style.getPropertyValue('--typewriter-head-space')).toBe('550px')
    expect(editorDom.style.getPropertyValue('--typewriter-tail-space')).toBe('260px')
    expect(scrollBy).toHaveBeenCalledWith({ top: 260, behavior: 'auto' })
    pluginView!.destroy()
  })
})
