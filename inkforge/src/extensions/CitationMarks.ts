import { Mark, mergeAttributes } from '@tiptap/core'

function readFootnoteId(element: HTMLElement): string | null {
  return element.dataset.footnoteId ?? element.querySelector<HTMLElement>('[data-footnote-id]')?.dataset.footnoteId ?? null
}

export const FootnoteReferenceMark = Mark.create({
  name: 'footnoteReference',
  inclusive: false,
  excludes: '',

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => readFootnoteId(element),
        renderHTML: attributes => attributes.id ? { 'data-footnote-id': attributes.id } : {},
      },
      index: {
        default: null,
        parseHTML: (element: HTMLElement) => element.dataset.footnoteIndex ?? element.querySelector<HTMLElement>('[data-footnote-index]')?.dataset.footnoteIndex ?? null,
        renderHTML: attributes => attributes.index ? { 'data-footnote-index': attributes.index } : {},
      },
      refIndex: {
        default: null,
        parseHTML: (element: HTMLElement) => element.dataset.footnoteRefIndex ?? element.querySelector<HTMLElement>('[data-footnote-ref-index]')?.dataset.footnoteRefIndex ?? null,
        renderHTML: attributes => attributes.refIndex ? { 'data-footnote-ref-index': attributes.refIndex } : {},
      },
      title: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('title'),
        renderHTML: attributes => attributes.title ? { title: attributes.title } : {},
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'sup.ink-footnote-ref' },
      { tag: 'sup[data-footnote-id]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes, {
      class: 'ink-footnote-ref',
      role: 'doc-noteref',
    }), 0]
  },
})

export const AcademicCitationMark = Mark.create({
  name: 'academicCitation',
  inclusive: false,
  excludes: '',

  addAttributes() {
    return {
      raw: {
        default: null,
        parseHTML: (element: HTMLElement) => element.dataset.citationRaw ?? null,
        renderHTML: attributes => attributes.raw ? { 'data-citation-raw': attributes.raw } : {},
      },
      keys: {
        default: null,
        parseHTML: (element: HTMLElement) => element.dataset.citationKeys ?? null,
        renderHTML: attributes => attributes.keys ? { 'data-citation-keys': attributes.keys } : {},
      },
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.dataset.citationStyle ?? null,
        renderHTML: attributes => attributes.style ? { 'data-citation-style': attributes.style } : {},
      },
      missing: {
        default: null,
        parseHTML: (element: HTMLElement) => element.dataset.citationMissing ?? null,
        renderHTML: attributes => attributes.missing ? { 'data-citation-missing': attributes.missing } : {},
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'cite.ink-academic-citation' },
      { tag: 'cite[data-citation-raw]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const unresolved = HTMLAttributes['data-citation-missing'] ? ' ink-academic-citation--unresolved' : ''
    return ['cite', mergeAttributes(HTMLAttributes, {
      class: `ink-academic-citation${unresolved}`,
    }), 0]
  },
})

export const CitationMarks = [FootnoteReferenceMark, AcademicCitationMark]
