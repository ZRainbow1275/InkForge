import { Extension, type Editor as TiptapEditor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export type InkforgeShortcutAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'inlineCode'
  | 'link'
  | 'clearFormat'
  | 'highlight'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'paragraph'
  | 'blockquote'
  | 'codeBlock'
  | 'orderedList'
  | 'bulletList'
  | 'taskList'
  | 'table'
  | 'horizontalRule'
  | 'save'
  | 'undo'
  | 'redo'
  | 'findReplace'
  | 'find'
  | 'selectAll'
  | 'toggleSidebar'
  | 'togglePreview'
  | 'toggleOutline'
  | 'focusMode'
  | 'typewriterMode'
  | 'switchEditorMode'
  | 'zoomIn'

export interface KeyboardShortcutsOptions {
  getShortcuts: () => Record<string, string>
}

const pluginKey = new PluginKey('keyboardShortcuts')

function buildShortcutCombo(event: KeyboardEvent): string | null {
  const parts: string[] = []

  if (event.ctrlKey || event.metaKey) {
    parts.push('Ctrl')
  }
  if (event.shiftKey) {
    parts.push('Shift')
  }
  if (event.altKey) {
    parts.push('Alt')
  }

  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
    const normalized =
      event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key
    parts.push(normalized)
  }

  return parts.length > 0 ? parts.join('+') : null
}

function dispatchEditorEvent(name: string, detail?: Record<string, unknown>): void {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

function dispatchViewAction(action: InkforgeShortcutAction): boolean {
  dispatchEditorEvent('inkforge:view-action', { action })
  return true
}

function executeAction(editor: TiptapEditor, action: InkforgeShortcutAction): boolean {
  switch (action) {
    case 'bold':
      return editor.chain().focus().toggleBold().run()
    case 'italic':
      return editor.chain().focus().toggleItalic().run()
    case 'underline':
      return editor.chain().focus().toggleUnderline().run()
    case 'strikethrough':
      return editor.chain().focus().toggleStrike().run()
    case 'inlineCode':
      return editor.chain().focus().toggleCode().run()
    case 'link':
      dispatchEditorEvent('inkforge:edit-link')
      return true
    case 'clearFormat': {
      if (editor.state.selection.empty) {
        return dispatchViewAction('switchEditorMode')
      }
      return editor.chain().focus().unsetAllMarks().clearNodes().run()
    }
    case 'highlight':
      return editor.chain().focus().toggleHighlight({ color: '#FFEB3B' }).run()
    case 'heading1':
      return editor.chain().focus().toggleHeading({ level: 1 }).run()
    case 'heading2':
      return editor.chain().focus().toggleHeading({ level: 2 }).run()
    case 'heading3':
      return editor.chain().focus().toggleHeading({ level: 3 }).run()
    case 'heading4':
      return editor.chain().focus().toggleHeading({ level: 4 }).run()
    case 'paragraph':
      return editor.chain().focus().setParagraph().run()
    case 'blockquote':
      return editor.chain().focus().toggleBlockquote().run()
    case 'codeBlock':
      return editor.chain().focus().toggleCodeBlock().run()
    case 'orderedList':
      return editor.chain().focus().toggleOrderedList().run()
    case 'bulletList':
      return editor.chain().focus().toggleBulletList().run()
    case 'taskList':
      return editor.chain().focus().toggleTaskList().run()
    case 'table':
      return editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    case 'horizontalRule':
      return editor.chain().focus().setHorizontalRule().run()
    case 'save':
      dispatchEditorEvent('inkforge:save')
      return true
    case 'undo':
      return editor.chain().focus().undo().run()
    case 'redo':
      return editor.chain().focus().redo().run()
    case 'findReplace':
      dispatchEditorEvent('inkforge:replace')
      return true
    case 'find':
      dispatchEditorEvent('inkforge:find')
      return true
    case 'selectAll':
      return editor.chain().focus().selectAll().run()
    case 'toggleSidebar':
    case 'togglePreview':
    case 'toggleOutline':
    case 'focusMode':
    case 'typewriterMode':
    case 'switchEditorMode':
    case 'zoomIn':
      return dispatchViewAction(action)
    default:
      return false
  }
}

export const KeyboardShortcuts = Extension.create<KeyboardShortcutsOptions>({
  name: 'keyboardShortcuts',

  addOptions() {
    return {
      getShortcuts: () => ({}),
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleKeyDown: (_view: EditorView, event: KeyboardEvent): boolean => {
            if (event.defaultPrevented || event.isComposing) {
              return false
            }

            const combo = buildShortcutCombo(event)
            if (!combo) {
              return false
            }

            const entry = Object.entries(this.options.getShortcuts()).find(([, binding]) => binding === combo)
            if (!entry) {
              return false
            }

            const handled = executeAction(this.editor, entry[0] as InkforgeShortcutAction)
            if (handled) {
              event.preventDefault()
            }

            return handled
          },
        },
      }),
    ]
  },
})
