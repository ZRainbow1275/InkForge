import { describe, expect, it } from 'vitest'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { EditorState, TextSelection, type Transaction } from '@tiptap/pm/state'
import {
  SMART_PUNCTUATION_META,
  createSmartPunctuationTransaction,
  handleSmartPunctuationTextInput,
  isLikelyUrlContext,
  needsPanguSpacing,
  type SmartPunctuationOptions,
} from './SmartPunctuation'
import { getDefaultSmartPunctuationRuleSettings } from '@/services/smart-punctuation'

const schema = getSchema([StarterKit])

const defaultOptions: SmartPunctuationOptions = {
  enabled: true,
  rules: getDefaultSmartPunctuationRuleSettings(),
}

interface TextInputRunResult {
  handled: boolean
  state: EditorState
  transaction: Transaction | null
}

function createState(doc: ProseMirrorNode, selectionPos: number): EditorState {
  return EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, selectionPos),
  })
}

function createParagraphState(text = ''): EditorState {
  const doc = schema.nodes.doc.create(null, [
    schema.nodes.paragraph.create(null, text ? schema.text(text) : null),
  ])
  return createState(doc, 1 + text.length)
}

function createCodeBlockState(text = ''): EditorState {
  const doc = schema.nodes.doc.create(null, [
    schema.nodes.codeBlock.create(null, text ? schema.text(text) : null),
  ])
  return createState(doc, 1 + text.length)
}

function createInlineCodeState(text: string): EditorState {
  const doc = schema.nodes.doc.create(null, [
    schema.nodes.paragraph.create(null, schema.text(text, [schema.marks.code.create()])),
  ])
  return createState(doc, 1 + text.length)
}

function runTextInput(
  initialState: EditorState,
  text: string,
  options: SmartPunctuationOptions = defaultOptions,
  composing = false,
): TextInputRunResult {
  let nextState = initialState
  let transaction: Transaction | null = null
  const handled = handleSmartPunctuationTextInput({
    state: initialState,
    from: initialState.selection.from,
    to: initialState.selection.to,
    text,
    composing,
    options,
    dispatch: (tr) => {
      transaction = tr
      nextState = initialState.apply(tr)
    },
  })

  return { handled, state: nextState, transaction }
}

describe('SmartPunctuation rule matching', () => {
  it('converts enabled em dash and records transaction metadata', () => {
    const result = runTextInput(createParagraphState('Ink-'), '-')

    expect(result.handled).toBe(true)
    expect(result.state.doc.textContent).toBe('Ink—')
    expect(result.transaction?.getMeta(SMART_PUNCTUATION_META)).toBe('emDash')
    expect(result.transaction?.getMeta('undoGroup')).toBe('smart-punct')
  })

  it('converts ellipsis and copyright-family symbols', () => {
    const ellipsis = runTextInput(createParagraphState('Wait..'), '.')
    const copyright = runTextInput(createParagraphState('(tm'), ')')

    expect(ellipsis.handled).toBe(true)
    expect(ellipsis.state.doc.textContent).toBe('Wait…')
    expect(copyright.handled).toBe(true)
    expect(copyright.state.doc.textContent).toBe('™')
  })

  it('uses opening and closing curly quotes from local context', () => {
    const opening = runTextInput(createParagraphState(''), '"')
    const closing = runTextInput(createParagraphState('“Ink'), '"')
    const apostrophe = runTextInput(createParagraphState('can'), "'")

    expect(opening.state.doc.textContent).toBe('“')
    expect(closing.state.doc.textContent).toBe('“Ink”')
    expect(apostrophe.state.doc.textContent).toBe('can’')
  })

  it('adds Pangu spacing between CJK and ASCII text', () => {
    const cjkThenAscii = runTextInput(createParagraphState('使用'), 'V')
    const asciiThenCjk = runTextInput(createParagraphState('Vue'), '文')

    expect(cjkThenAscii.handled).toBe(true)
    expect(cjkThenAscii.state.doc.textContent).toBe('使用 V')
    expect(asciiThenCjk.handled).toBe(true)
    expect(asciiThenCjk.state.doc.textContent).toBe('Vue 文')
  })

  it('keeps conservative rules disabled by default until explicitly enabled', () => {
    const disabledArrow = runTextInput(createParagraphState('A -'), '>')
    const enabledRules = { ...getDefaultSmartPunctuationRuleSettings(), arrows: true, fractions: true }
    const enabledArrow = runTextInput(createParagraphState('A -'), '>', { enabled: true, rules: enabledRules })
    const enabledFraction = runTextInput(createParagraphState('1/'), '2', { enabled: true, rules: enabledRules })

    expect(disabledArrow.handled).toBe(false)
    expect(enabledArrow.handled).toBe(true)
    expect(enabledArrow.state.doc.textContent).toBe('A →')
    expect(enabledFraction.handled).toBe(true)
    expect(enabledFraction.state.doc.textContent).toBe('½')
  })

  it('honors dynamic master and per-rule settings', () => {
    let enabled = false
    const rules = { ...getDefaultSmartPunctuationRuleSettings(), emDash: false }
    const dynamicOptions: SmartPunctuationOptions = {
      enabled: () => enabled,
      rules: () => rules,
    }

    expect(runTextInput(createParagraphState('A-'), '-', dynamicOptions).handled).toBe(false)
    enabled = true
    expect(runTextInput(createParagraphState('A-'), '-', dynamicOptions).handled).toBe(false)
    rules.emDash = true
    expect(runTextInput(createParagraphState('A-'), '-', dynamicOptions).state.doc.textContent).toBe('A—')
  })
})

describe('SmartPunctuation context safeguards', () => {
  it('skips IME composition, code blocks, and inline code marks', () => {
    expect(runTextInput(createParagraphState('A-'), '-', defaultOptions, true).handled).toBe(false)
    expect(runTextInput(createCodeBlockState('A-'), '-').handled).toBe(false)
    expect(runTextInput(createInlineCodeState('A-'), '-').handled).toBe(false)
  })

  it('skips likely URL and markdown-link URL contexts', () => {
    expect(isLikelyUrlContext('https://example.test/-', '-')).toBe(true)
    expect(isLikelyUrlContext('[site](https://example.test/-', '-')).toBe(true)
    expect(runTextInput(createParagraphState('https://example.test/-'), '-').handled).toBe(false)
  })

  it('does not scan or transform ordinary text that has no rule match', () => {
    const state = createParagraphState('plain')
    const tr = createSmartPunctuationTransaction({
      state,
      from: state.selection.from,
      to: state.selection.to,
      text: 'x',
      composing: false,
      options: { enabled: true, rules: { ...getDefaultSmartPunctuationRuleSettings(), panguSpacing: false } },
    })

    expect(tr).toBeNull()
    expect(needsPanguSpacing('plain ', 'x')).toBe(false)
  })
})
