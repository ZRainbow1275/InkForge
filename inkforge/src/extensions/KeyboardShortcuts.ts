import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import {
  matchesKeyboardShortcut,
  shouldIgnoreShortcutEvent,
} from '@/utils/shortcuts'

export type FindReplaceMode = 'find' | 'replace'

export interface KeyboardShortcutsOptions {
  getBinding: (shortcutId: string) => string | undefined
  onFindReplace: (mode: FindReplaceMode) => void
  onLinkRequested: () => void
  onToggleEditorMode: () => void
}

function consumeShortcut(event: KeyboardEvent, action: () => void): true {
  event.preventDefault()
  action()
  return true
}

export const KeyboardShortcuts = Extension.create<KeyboardShortcutsOptions>({
  name: 'keyboardShortcuts',

  addOptions() {
    return {
      getBinding: () => undefined,
      onFindReplace: () => undefined,
      onLinkRequested: () => undefined,
      onToggleEditorMode: () => undefined,
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown: (_view, event) => {
            if (shouldIgnoreShortcutEvent(event)) {
              return false
            }

            const binding = (shortcutId: string) => this.options.getBinding(shortcutId)
            const matches = (shortcutId: string) => matchesKeyboardShortcut(event, binding(shortcutId))
            const { editor } = this

            if (matches('toggleEditorMode')) {
              if (editor.state.selection.empty) {
                return consumeShortcut(event, () => this.options.onToggleEditorMode())
              }

              return consumeShortcut(event, () => {
                editor.chain().focus().clearNodes().unsetAllMarks().run()
              })
            }

            if (matches('clearFormat')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().clearNodes().unsetAllMarks().run()
              })
            }

            if (matches('link')) {
              return consumeShortcut(event, () => this.options.onLinkRequested())
            }

            if (matches('find')) {
              return consumeShortcut(event, () => this.options.onFindReplace('find'))
            }

            if (matches('replace')) {
              return consumeShortcut(event, () => this.options.onFindReplace('replace'))
            }

            if (matches('bold')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleBold().run()
              })
            }

            if (matches('italic')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleItalic().run()
              })
            }

            if (matches('underline')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleUnderline().run()
              })
            }

            if (matches('strikethrough')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleStrike().run()
              })
            }

            if (matches('inlineCode')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleCode().run()
              })
            }

            if (matches('highlight')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleHighlight().run()
              })
            }

            if (matches('heading1')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              })
            }

            if (matches('heading2')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              })
            }

            if (matches('heading3')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              })
            }

            if (matches('heading4')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleHeading({ level: 4 }).run()
              })
            }

            if (matches('paragraph')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().setParagraph().run()
              })
            }

            if (matches('blockquote')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleBlockquote().run()
              })
            }

            if (matches('codeBlock')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleCodeBlock().run()
              })
            }

            if (matches('orderedList')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleOrderedList().run()
              })
            }

            if (matches('bulletList')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleBulletList().run()
              })
            }

            if (matches('taskList')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().toggleTaskList().run()
              })
            }

            if (matches('table')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              })
            }

            if (matches('divider')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().setHorizontalRule().run()
              })
            }

            if (matches('undo')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().undo().run()
              })
            }

            if (matches('redo')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().redo().run()
              })
            }

            if (matches('selectAll')) {
              return consumeShortcut(event, () => {
                editor.chain().focus().setTextSelection({ from: 0, to: editor.state.doc.content.size }).run()
              })
            }

            return false
          },
        },
      }),
    ]
  },
})
