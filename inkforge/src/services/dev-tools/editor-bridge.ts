import type { Editor } from '@tiptap/core'
import type { Mark } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { publishDevToolsEvent } from './events-bus'
import { safeJsonSizeBytes, sanitizeDevToolsValue } from './sanitizer'
import type { ProseMirrorSnapshot, ProseMirrorTransactionSnapshot, TipTapEditorSnapshot } from './types'

const TRANSACTION_LIMIT = 50
const LARGE_JSON_AUTOFOLD_BYTES = 1 * 1024 * 1024
const HUGE_JSON_DISABLE_AUTO_BYTES = 5 * 1024 * 1024

interface ActiveEditorRegistration {
  editor: Editor
  scrollElement: HTMLElement | null
  articleId: string | null
  title: string | null
  cleanup: () => void
}

let activeEditor: ActiveEditorRegistration | null = null
const transactions: ProseMirrorTransactionSnapshot[] = []

function markToSnapshot(mark: Mark): { name: string; attrs: Record<string, unknown> } {
  return {
    name: mark.type.name,
    attrs: sanitizeDevToolsValue(mark.attrs) as Record<string, unknown>,
  }
}

function pushTransaction(transaction: Transaction): void {
  const snapshot: ProseMirrorTransactionSnapshot = {
    id: `tr-${Date.now()}-${transactions.length}`,
    timestamp: Date.now(),
    docChanged: transaction.docChanged,
    selectionSet: transaction.selectionSet,
    stepCount: transaction.steps.length,
    beforeSize: transaction.before.content.size,
    afterSize: transaction.doc.content.size,
  }
  transactions.unshift(snapshot)
  transactions.splice(TRANSACTION_LIMIT)
}

function publishEditorEvent(event: string, data: Record<string, unknown>): void {
  publishDevToolsEvent({
    id: `editor-${event}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    level: 'trace',
    module: 'editor',
    event,
    source: 'editor',
    summary: event,
    data,
  })
}

export function registerActiveEditor(input: {
  editor: Editor
  scrollElement: HTMLElement | null
  articleId: string | null
  title: string | null
}): () => void {
  activeEditor?.cleanup()

  const handleUpdate = ({ editor }: { editor: Editor }) => {
    publishEditorEvent('editor.update', {
      articleId: input.articleId,
      jsonSizeBytes: safeJsonSizeBytes(editor.getJSON()),
    })
  }
  const handleSelectionUpdate = ({ editor }: { editor: Editor }) => {
    publishEditorEvent('editor.selection.update', {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
      empty: editor.state.selection.empty,
    })
  }
  const handleTransaction = ({ transaction }: { transaction: Transaction }) => {
    pushTransaction(transaction)
    publishEditorEvent('editor.transaction', {
      docChanged: transaction.docChanged,
      selectionSet: transaction.selectionSet,
      stepCount: transaction.steps.length,
    })
  }

  input.editor.on('update', handleUpdate)
  input.editor.on('selectionUpdate', handleSelectionUpdate)
  input.editor.on('transaction', handleTransaction)

  const cleanup = () => {
    input.editor.off('update', handleUpdate)
    input.editor.off('selectionUpdate', handleSelectionUpdate)
    input.editor.off('transaction', handleTransaction)
    if (activeEditor?.editor === input.editor) {
      activeEditor = null
    }
  }

  activeEditor = { ...input, cleanup }
  return cleanup
}

export function getActiveTipTapEditor(): Editor | null {
  return activeEditor?.editor ?? null
}

export function getTipTapEditorSnapshot(): TipTapEditorSnapshot {
  const registration = activeEditor
  const editor = registration?.editor
  if (!editor) {
    return {
      available: false,
      articleId: null,
      title: null,
      jsonSizeBytes: 0,
      autoUpdateDisabled: false,
      doc: null,
      activeMarks: [],
      selection: null,
      scroll: null,
      characters: 0,
      words: 0,
      updatedAt: Date.now(),
    }
  }

  const doc = editor.getJSON()
  const jsonSizeBytes = safeJsonSizeBytes(doc)
  const selection = editor.state.selection
  const marks = editor.state.storedMarks ?? selection.$from.marks()
  const scrollElement = registration.scrollElement
  const storage = editor.storage as { characterCount?: { characters?: () => number; words?: () => number } }

  return {
    available: true,
    articleId: registration.articleId,
    title: registration.title,
    jsonSizeBytes,
    autoUpdateDisabled: jsonSizeBytes > HUGE_JSON_DISABLE_AUTO_BYTES,
    doc: sanitizeDevToolsValue(doc),
    activeMarks: marks.map(markToSnapshot),
    selection: {
      from: selection.from,
      to: selection.to,
      anchor: selection.anchor,
      head: selection.head,
      empty: selection.empty,
      fromParent: selection.$from.parent.type.name,
      toParent: selection.$to.parent.type.name,
    },
    scroll: scrollElement
      ? {
          scrollTop: scrollElement.scrollTop,
          scrollHeight: scrollElement.scrollHeight,
          clientHeight: scrollElement.clientHeight,
        }
      : null,
    characters: storage.characterCount?.characters?.() ?? 0,
    words: storage.characterCount?.words?.() ?? 0,
    updatedAt: Date.now(),
  }
}

export function getProseMirrorSnapshot(): ProseMirrorSnapshot {
  const editor = activeEditor?.editor
  if (!editor) {
    return { available: false, doc: null, plugins: [], transactions: [...transactions], updatedAt: Date.now() }
  }

  return {
    available: true,
    doc: sanitizeDevToolsValue(editor.state.doc.toJSON()),
    plugins: editor.state.plugins.map((plugin, index) => {
      let state: unknown
      let stateReadable = true
      try {
        state = plugin.getState(editor.state)
      } catch (error) {
        stateReadable = false
        state = error instanceof Error ? error.message : String(error)
      }
      const pluginKey = (plugin as unknown as { key?: string }).key ?? `plugin-${index}`
      return {
        key: pluginKey,
        props: Object.keys(plugin.props ?? {}),
        state: sanitizeDevToolsValue(state),
        stateReadable,
      }
    }),
    transactions: [...transactions],
    updatedAt: Date.now(),
  }
}

export function getLargeJsonThresholdBytes(): number {
  return LARGE_JSON_AUTOFOLD_BYTES
}