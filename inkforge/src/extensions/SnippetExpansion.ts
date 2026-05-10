import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/core'
import { matchSnippetTrigger } from '@/services/snippet/matcher'
import { resolveSnippetContent } from '@/services/snippet/resolver'
import type { SnippetContext, SnippetRecord } from '@/services/snippet/types'

export interface SnippetExpansionOptions {
  getSnippets: () => SnippetRecord[]
  getContext: () => SnippetContext | Promise<SnippetContext>
  onSnippetExpanded: (snippetId: string) => void | Promise<void>
  enabled: () => boolean
}

function shouldIgnoreTab(event: KeyboardEvent): boolean {
  return event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.isComposing
}

function textBeforeCursor(editor: Editor): string | null {
  const { selection } = editor.state
  if (!selection.empty) return null
  const { $from } = selection
  return $from.parent.textBetween(0, $from.parentOffset, '\n', '\n')
}

function stillHasTrigger(editor: Editor, from: number, to: number, trigger: string): boolean {
  return editor.state.doc.textBetween(from, to, '\n', '\n') === trigger
}

function applyResolvedSnippet(editor: Editor, from: number, to: number, content: string, selectionOffset: { from: number; to: number }): void {
  editor
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent(content)
    .setTextSelection({ from: from + selectionOffset.from, to: from + selectionOffset.to })
    .run()
}

export const SnippetExpansion = Extension.create<SnippetExpansionOptions>({
  name: 'snippetExpansion',

  addOptions() {
    return {
      getSnippets: () => [],
      getContext: () => ({
        articleId: null,
        articleTitle: '',
        authorName: '',
        selectedText: '',
        clipboardText: '',
        tags: [],
        now: new Date(),
      }),
      onSnippetExpanded: () => undefined,
      enabled: () => true,
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown: (_view, event) => {
            if (!this.options.enabled() || shouldIgnoreTab(event)) return false

            const before = textBeforeCursor(this.editor)
            if (before === null) return false

            const match = matchSnippetTrigger(before, this.options.getSnippets())
            if (!match) return false

            const cursor = this.editor.state.selection.from
            const from = cursor - match.trigger.length
            const to = cursor
            const snippetId = match.snippet.id
            const trigger = match.trigger

            event.preventDefault()
            void Promise.resolve(this.options.getContext())
              .then((context) => {
                if (!stillHasTrigger(this.editor, from, to, trigger)) return
                const resolved = resolveSnippetContent(match.snippet.content, context)
                const firstStop = resolved.tabStops[0]
                const selectionOffset = firstStop
                  ? { from: firstStop.from, to: firstStop.to }
                  : { from: resolved.finalCursorOffset, to: resolved.finalCursorOffset }
                applyResolvedSnippet(this.editor, from, to, resolved.content, selectionOffset)
                return this.options.onSnippetExpanded(snippetId)
              })
            return true
          },
        },
      }),
    ]
  },
})
