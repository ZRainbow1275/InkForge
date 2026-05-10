import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import type { ResolvedPos } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import {
  getDefaultSmartPunctuationRuleSettings,
  normalizeSmartPunctuationRuleSettings,
  type SmartPunctuationRuleId,
  type SmartPunctuationRuleSettings,
} from '@/services/smart-punctuation'

export const SMART_PUNCTUATION_META = 'inkforgeSmartPunctuation'
export const SMART_PUNCTUATION_UNDO_GROUP = 'smart-punct'

export const smartPunctuationPluginKey = new PluginKey('smartPunctuation')

type OptionGetter<T> = T | (() => T)

export interface SmartPunctuationOptions {
  enabled: OptionGetter<boolean>
  rules: OptionGetter<SmartPunctuationRuleSettings>
}

export interface SmartPunctuationRuntimeOptions {
  enabled: boolean
  rules: SmartPunctuationRuleSettings
}

export interface SmartPunctuationInputContext {
  state: EditorState
  from: number
  to: number
  text: string
  composing: boolean
  options: SmartPunctuationOptions
}

export interface SmartPunctuationDispatchContext extends SmartPunctuationInputContext {
  dispatch: (transaction: Transaction) => void
}

interface SmartPunctuationReplacement {
  ruleId: SmartPunctuationRuleId
  from: number
  to: number
  text: string
}

const DEFAULT_OPTIONS: SmartPunctuationOptions = {
  enabled: true,
  rules: getDefaultSmartPunctuationRuleSettings(),
}

const MAX_LOOKBEHIND = 32
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]|\ud840[\udc00-\udfff]|\ud841[\udc00-\udfff]|\ud842[\udc00-\udfff]|\ud843[\udc00-\udfff]|\ud844[\udc00-\udfff]|\ud845[\udc00-\udfff]|\ud846[\udc00-\udfff]|\ud847[\udc00-\udfff]|\ud848[\udc00-\udfff]|\ud849[\udc00-\udfff]/
const ASCII_ALNUM_RE = /[a-zA-Z0-9]/
const SUPPRESSED_NODE_NAMES = new Set(['codeBlock', 'mathBlock', 'mathInline', 'frontmatter'])
const SUPPRESSED_MARK_NAMES = new Set(['code', 'link'])

function resolveOption<T>(option: OptionGetter<T>): T {
  return typeof option === 'function' ? (option as () => T)() : option
}

export function resolveSmartPunctuationRuntimeOptions(options: SmartPunctuationOptions): SmartPunctuationRuntimeOptions {
  return {
    enabled: resolveOption(options.enabled),
    rules: normalizeSmartPunctuationRuleSettings(resolveOption(options.rules)),
  }
}

function isRuleEnabled(options: SmartPunctuationRuntimeOptions, ruleId: SmartPunctuationRuleId): boolean {
  return options.rules[ruleId]
}

function hasCjk(value: string): boolean {
  return CJK_RE.test(value)
}

function hasAsciiAlnum(value: string): boolean {
  return ASCII_ALNUM_RE.test(value)
}

export function needsPanguSpacing(textBefore: string, insertedText: string): boolean {
  if (insertedText.length !== 1 || !textBefore) {
    return false
  }

  const previous = textBefore[textBefore.length - 1]
  if (!previous || /\s/.test(previous) || /\s/.test(insertedText)) {
    return false
  }

  return (hasCjk(previous) && hasAsciiAlnum(insertedText))
    || (hasAsciiAlnum(previous) && hasCjk(insertedText))
}

function textBeforeCursor($from: ResolvedPos): string {
  const start = Math.max(0, $from.parentOffset - MAX_LOOKBEHIND)
  return $from.parent.textBetween(start, $from.parentOffset, undefined, '\ufffc')
}

function isSuppressedContext(state: EditorState, $from: ResolvedPos): boolean {
  const parentType = $from.parent.type
  if (parentType.spec.code || SUPPRESSED_NODE_NAMES.has(parentType.name)) {
    return true
  }

  const activeMarks = state.storedMarks ?? $from.marks()
  return activeMarks.some(mark => mark.type.spec.code || SUPPRESSED_MARK_NAMES.has(mark.type.name))
}

export function isLikelyUrlContext(textBefore: string, insertedText: string): boolean {
  const candidate = textBefore + insertedText
  const token = candidate.match(/(?:^|\s)(\S+)$/)?.[1] ?? ''

  return /(?:https?:\/\/|mailto:|www\.)/i.test(token)
    || /\]\([^\s)]*$/u.test(candidate)
}

function isOpeningQuote(textBefore: string): boolean {
  if (!textBefore) {
    return true
  }

  const previous = textBefore[textBefore.length - 1]
  return /[\s([{<"'“‘]/u.test(previous)
}

function makeReplacement(
  context: SmartPunctuationInputContext,
  ruleId: SmartPunctuationRuleId,
  matchedLength: number,
  replacementText: string,
): SmartPunctuationReplacement | null {
  const replaceFrom = context.from - (matchedLength - context.text.length)
  const parentStart = context.from - context.state.doc.resolve(context.from).parentOffset

  if (replaceFrom < parentStart) {
    return null
  }

  return {
    ruleId,
    from: replaceFrom,
    to: context.to,
    text: replacementText,
  }
}

function matchPatternReplacement(
  context: SmartPunctuationInputContext,
  ruleId: SmartPunctuationRuleId,
  pattern: RegExp,
  replacement: string | ((match: RegExpMatchArray) => string),
): SmartPunctuationReplacement | null {
  const candidate = textBeforeCursor(context.state.doc.resolve(context.from)) + context.text
  const match = candidate.match(pattern)
  if (!match) {
    return null
  }

  return makeReplacement(
    context,
    ruleId,
    match[0].length,
    typeof replacement === 'function' ? replacement(match) : replacement,
  )
}

function findRuleReplacement(
  context: SmartPunctuationInputContext,
  runtimeOptions: SmartPunctuationRuntimeOptions,
): SmartPunctuationReplacement | null {
  const textBefore = textBeforeCursor(context.state.doc.resolve(context.from))

  if (isLikelyUrlContext(textBefore, context.text)) {
    return null
  }

  if (isRuleEnabled(runtimeOptions, 'curlyQuotes')) {
    if (context.text === '"') {
      return makeReplacement(context, 'curlyQuotes', 1, isOpeningQuote(textBefore) ? '“' : '”')
    }
    if (context.text === "'") {
      return makeReplacement(context, 'curlyQuotes', 1, isOpeningQuote(textBefore) ? '‘' : '’')
    }
  }

  if (context.text === '-' && isRuleEnabled(runtimeOptions, 'spacedDash')) {
    const match = matchPatternReplacement(context, 'spacedDash', /- -$/, '—')
    if (match) return match
  }

  if (context.text === '-' && isRuleEnabled(runtimeOptions, 'emDash')) {
    const match = matchPatternReplacement(context, 'emDash', /--$/, '—')
    if (match) return match
  }

  if (context.text === '.' && isRuleEnabled(runtimeOptions, 'ellipsis')) {
    const match = matchPatternReplacement(context, 'ellipsis', /\.\.\.$/, '…')
    if (match) return match
  }

  if ((context.text === '>' || context.text === '-') && isRuleEnabled(runtimeOptions, 'arrows')) {
    const match = matchPatternReplacement(context, 'arrows', /(->|<-|=>)$/, value => {
      if (value[1] === '->') return '→'
      if (value[1] === '<-') return '←'
      return '⇒'
    })
    if (match) return match
  }

  if ((context.text === '2' || context.text === '4') && isRuleEnabled(runtimeOptions, 'fractions')) {
    const match = matchPatternReplacement(context, 'fractions', /(1\/2|1\/4|3\/4)$/, value => {
      if (value[1] === '1/2') return '½'
      if (value[1] === '1/4') return '¼'
      return '¾'
    })
    if (match) return match
  }

  if (/\d/.test(context.text) && isRuleEnabled(runtimeOptions, 'multiplication')) {
    const match = matchPatternReplacement(context, 'multiplication', /(\d+)x(\d+)$/i, value => `${value[1]}×${value[2]}`)
    if (match) return match
  }

  if (context.text === ')' && isRuleEnabled(runtimeOptions, 'copyrightSymbols')) {
    const match = matchPatternReplacement(context, 'copyrightSymbols', /(\(c\)|\(r\)|\(tm\))$/i, value => {
      const normalized = value[1].toLowerCase()
      if (normalized === '(c)') return '©'
      if (normalized === '(r)') return '®'
      return '™'
    })
    if (match) return match
  }

  if ((context.text === 'g' || context.text === 'G') && isRuleEnabled(runtimeOptions, 'degree')) {
    const match = matchPatternReplacement(context, 'degree', /(\d+)\sdeg$/i, value => `${value[1]}°`)
    if (match) return match
  }

  if (isRuleEnabled(runtimeOptions, 'panguSpacing') && needsPanguSpacing(textBefore, context.text)) {
    return makeReplacement(context, 'panguSpacing', context.text.length, ` ${context.text}`)
  }

  return null
}

export function createSmartPunctuationTransaction(context: SmartPunctuationInputContext): Transaction | null {
  const runtimeOptions = resolveSmartPunctuationRuntimeOptions(context.options)
  if (!runtimeOptions.enabled || context.composing || context.text.length !== 1) {
    return null
  }

  const $from = context.state.doc.resolve(context.from)
  if (isSuppressedContext(context.state, $from)) {
    return null
  }

  const replacement = findRuleReplacement(context, runtimeOptions)
  if (!replacement) {
    return null
  }

  const tr = context.state.tr.insertText(replacement.text, replacement.from, replacement.to)
  tr.setMeta(SMART_PUNCTUATION_META, replacement.ruleId)
  tr.setMeta('undoGroup', SMART_PUNCTUATION_UNDO_GROUP)
  return tr
}

export function handleSmartPunctuationTextInput(context: SmartPunctuationDispatchContext): boolean {
  const tr = createSmartPunctuationTransaction(context)
  if (!tr) {
    return false
  }

  context.dispatch(tr)
  return true
}

export const SmartPunctuation = Extension.create<SmartPunctuationOptions>({
  name: 'smartPunctuation',

  addOptions() {
    return { ...DEFAULT_OPTIONS }
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options

    return [
      new Plugin({
        key: smartPunctuationPluginKey,
        props: {
          handleTextInput(view: EditorView, from: number, to: number, text: string) {
            return handleSmartPunctuationTextInput({
              state: view.state,
              from,
              to,
              text,
              composing: view.composing,
              options: extensionOptions,
              dispatch: tr => view.dispatch(tr),
            })
          },
        },
      }),
    ]
  },
})
