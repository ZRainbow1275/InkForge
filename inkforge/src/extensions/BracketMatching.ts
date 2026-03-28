import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const OPENING_TO_CLOSING = {
  '(': ')',
  '[': ']',
  '{': '}',
  '（': '）',
  '【': '】',
  '《': '》',
  '“': '”',
  '‘': '’',
} as const

const CLOSING_TO_OPENING = Object.entries(OPENING_TO_CLOSING).reduce<Record<string, string>>((acc, [opening, closing]) => {
  acc[closing] = opening
  return acc
}, {})

interface BracketMatchingOptions {
  enabled: boolean
  className: string
}

function findForwardMatch(text: string, startIndex: number, opening: string, closing: string): number | null {
  let depth = 0

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index]

    if (char === opening) {
      depth += 1
    } else if (char === closing) {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }

  return null
}

function findBackwardMatch(text: string, startIndex: number, opening: string, closing: string): number | null {
  let depth = 0

  for (let index = startIndex; index >= 0; index -= 1) {
    const char = text[index]

    if (char === closing) {
      depth += 1
    } else if (char === opening) {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }

  return null
}

export const BracketMatching = Extension.create<BracketMatchingOptions>({
  name: 'bracketMatching',

  addOptions() {
    return {
      enabled: true,
      className: 'matching-bracket',
    }
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options

    return [
      new Plugin({
        key: new PluginKey('bracketMatching'),
        props: {
          decorations(state) {
            if (!extensionOptions.enabled || !state.selection.empty) {
              return DecorationSet.empty
            }

            const { $from } = state.selection
            const text = $from.parent.textContent
            const offset = $from.parentOffset
            const parentStart = $from.start()

            if (!text) {
              return DecorationSet.empty
            }

            const before = offset > 0 ? text[offset - 1] : ''
            const after = offset < text.length ? text[offset] : ''

            let startIndex: number | null = null
            let endIndex: number | null = null

            if (before in OPENING_TO_CLOSING) {
              const opening = before as keyof typeof OPENING_TO_CLOSING
              startIndex = offset - 1
              endIndex = findForwardMatch(text, startIndex, opening, OPENING_TO_CLOSING[opening])
            } else if (before in CLOSING_TO_OPENING) {
              const closing = before
              endIndex = offset - 1
              startIndex = findBackwardMatch(text, endIndex, CLOSING_TO_OPENING[closing], closing)
            } else if (after in OPENING_TO_CLOSING) {
              const opening = after as keyof typeof OPENING_TO_CLOSING
              startIndex = offset
              endIndex = findForwardMatch(text, startIndex, opening, OPENING_TO_CLOSING[opening])
            } else if (after in CLOSING_TO_OPENING) {
              const closing = after
              endIndex = offset
              startIndex = findBackwardMatch(text, endIndex, CLOSING_TO_OPENING[closing], closing)
            }

            if (startIndex === null || endIndex === null) {
              return DecorationSet.empty
            }

            const className = extensionOptions.className

            return DecorationSet.create(state.doc, [
              Decoration.inline(parentStart + startIndex, parentStart + startIndex + 1, { class: className }),
              Decoration.inline(parentStart + endIndex, parentStart + endIndex + 1, { class: className }),
            ])
          },
        },
      }),
    ]
  },
})
