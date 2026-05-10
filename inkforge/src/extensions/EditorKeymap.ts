import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode, NodeType, ResolvedPos } from '@tiptap/pm/model'
import { closeHistory } from '@tiptap/pm/history'
import { liftListItem, sinkListItem, splitListItem } from '@tiptap/pm/schema-list'
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export type ListEnterBehavior = 'notion' | 'typora'
export type EditorKeymapContextKind = 'listItem' | 'taskItem' | 'codeBlock' | 'paragraph'
export type EditorKeymapListAction = 'sink' | 'lift' | 'split'

export interface EditorKeymapContext {
  kind: EditorKeymapContextKind
  depth: number
  node: ProseMirrorNode
  posBefore: number | null
  nestedListItem: boolean
}

export interface EditorKeymapKeyboardEvent {
  key: string
  shiftKey?: boolean
  isComposing?: boolean
  defaultPrevented?: boolean
  preventDefault: () => void
  stopPropagation?: () => void
  stopImmediatePropagation?: () => void
}

export interface EditorKeymapRuntimeOptions {
  listEnterBehavior: ListEnterBehavior
  codeBlockIndent: string
}

export interface EditorKeymapOptions {
  getListEnterBehavior: () => ListEnterBehavior
  getCodeBlockIndent: () => string
}

export interface EditorKeymapHandlerInput {
  state: EditorState
  dispatch?: (tr: Transaction) => void
  event: EditorKeymapKeyboardEvent
  options: EditorKeymapRuntimeOptions
}

export const EDITOR_KEYMAP_META = 'inkforgeEditorKeymap'

const editorKeymapPluginKey = new PluginKey('inkforgeEditorKeymap')

const LIST_ITEM_NODE_NAMES = new Set(['listItem', 'taskItem'])
const DEFAULT_OPTIONS: EditorKeymapOptions = {
  getListEnterBehavior: () => 'notion',
  getCodeBlockIndent: () => '    ',
}

function normalizeIndent(value: string): string {
  return value.length > 0 ? value : DEFAULT_OPTIONS.getCodeBlockIndent()
}

function listItemTypeForContext(state: EditorState, context: EditorKeymapContext): NodeType | null {
  if (context.kind !== 'listItem' && context.kind !== 'taskItem') {
    return null
  }

  return state.schema.nodes[context.kind] ?? null
}

function isListItemNodeName(nodeName: string): boolean {
  return LIST_ITEM_NODE_NAMES.has(nodeName)
}

function metaLabelForListAction(action: EditorKeymapListAction): string {
  if (action === 'sink') {
    return 'list-sink'
  }

  if (action === 'split') {
    return 'list-split'
  }

  return 'list-lift'
}

function dispatchWithUndoBoundary(
  dispatch: ((tr: Transaction) => void) | undefined,
  tr: Transaction,
  undoGroup: string,
): void {
  if (!dispatch) {
    return
  }

  closeHistory(tr)
  tr.setMeta(EDITOR_KEYMAP_META, undoGroup)
  tr.setMeta('undoGroup', undoGroup)
  dispatch(tr)
}

function findNearestEmptyParagraphSelection(doc: ProseMirrorNode, preferredPos: number): number | null {
  let nearestDistance = Number.POSITIVE_INFINITY
  let nearestPos: number | null = null

  doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph' || node.content.size > 0) {
      return true
    }

    const selectionPos = pos + 1
    const distance = Math.abs(selectionPos - preferredPos)

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestPos = selectionPos
    }

    return true
  })

  return nearestPos
}

function preserveEmptyLiftSelection(tr: Transaction, context: EditorKeymapContext): void {
  if (context.posBefore === null) {
    return
  }

  const preferredPos = tr.mapping.map(context.posBefore, 1)
  const selectionPos = findNearestEmptyParagraphSelection(tr.doc, preferredPos)

  if (selectionPos !== null) {
    tr.setSelection(TextSelection.create(tr.doc, selectionPos))
  }
}

function isEditorViewComposing(view: { composing?: boolean }): boolean {
  return Boolean(view.composing)
}

function createShortcutEvent(key: string, shiftKey: boolean, isComposing: boolean): EditorKeymapKeyboardEvent {
  return {
    key,
    shiftKey,
    isComposing,
    defaultPrevented: false,
    preventDefault: () => undefined,
  }
}

export function isEmptyListItem(node: ProseMirrorNode): boolean {
  return node.textContent.trim().length === 0
}

export function isNestedListItem($from: ResolvedPos, listItemDepth: number): boolean {
  for (let depth = listItemDepth - 1; depth > 0; depth -= 1) {
    if (isListItemNodeName($from.node(depth).type.name)) {
      return true
    }
  }

  return false
}

function exitTopLevelEmptyListItem(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  context: EditorKeymapContext,
): boolean {
  const paragraphType = state.schema.nodes.paragraph
  const listDepth = context.depth - 1

  if (!paragraphType || context.posBefore === null || listDepth <= 0) {
    return false
  }

  if (!dispatch) {
    return true
  }

  const $from = state.selection.$from
  const parentList = $from.node(listDepth)
  const listStart = $from.before(listDepth)
  const listEnd = $from.after(listDepth)
  const itemStart = context.posBefore
  const itemEnd = $from.after(context.depth)
  const tr = state.tr
  const insertPos = (() => {
    if (parentList.childCount <= 1) {
      tr.delete(listStart, listEnd)
      return tr.mapping.map(listStart, -1)
    }

    tr.delete(itemStart, itemEnd)
    return tr.mapping.map(listEnd, -1)
  })()

  tr.insert(insertPos, paragraphType.create())
  tr.setSelection(TextSelection.create(tr.doc, insertPos + 1))
  dispatchWithUndoBoundary(dispatch, tr, 'list-lift')
  return true
}

export function findActiveEditorKeymapContext(state: EditorState): EditorKeymapContext {
  const { $from } = state.selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    const nodeName = node.type.name

    if (nodeName === 'codeBlock') {
      return {
        kind: 'codeBlock',
        depth,
        node,
        posBefore: $from.before(depth),
        nestedListItem: false,
      }
    }

    if (isListItemNodeName(nodeName)) {
      return {
        kind: nodeName as 'listItem' | 'taskItem',
        depth,
        node,
        posBefore: $from.before(depth),
        nestedListItem: isNestedListItem($from, depth),
      }
    }
  }

  return {
    kind: 'paragraph',
    depth: $from.depth,
    node: $from.parent,
    posBefore: $from.depth > 0 ? $from.before($from.depth) : null,
    nestedListItem: false,
  }
}

export function runListItemCommand(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  context: EditorKeymapContext,
  action: EditorKeymapListAction,
  preserveLiftSelection = false,
): boolean {
  const itemType = listItemTypeForContext(state, context)
  if (!itemType) {
    return false
  }

  const command = action === 'sink'
    ? sinkListItem(itemType)
    : action === 'split'
      ? splitListItem(itemType)
      : liftListItem(itemType)
  const undoGroup = metaLabelForListAction(action)

  return command(state, tr => {
    if (preserveLiftSelection && action === 'lift') {
      preserveEmptyLiftSelection(tr, context)
    }

    dispatchWithUndoBoundary(dispatch, tr, undoGroup)
  })
}

export function handleListEnter(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  behavior: ListEnterBehavior,
): boolean {
  if (behavior === 'typora' || !state.selection.empty) {
    return false
  }

  const context = findActiveEditorKeymapContext(state)
  if (context.kind !== 'listItem' && context.kind !== 'taskItem') {
    return false
  }

  if (!isEmptyListItem(context.node)) {
    return runListItemCommand(state, dispatch, context, 'split')
  }

  if (!context.nestedListItem) {
    return exitTopLevelEmptyListItem(state, dispatch, context)
  }

  return runListItemCommand(state, dispatch, context, 'lift', true)
}

export function insertCodeBlockIndent(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  indent: string,
): boolean {
  const normalizedIndent = normalizeIndent(indent)
  const tr = state.tr.insertText(normalizedIndent, state.selection.from, state.selection.to)
  dispatchWithUndoBoundary(dispatch, tr, 'code-block-indent')
  return true
}

export function removeCodeBlockIndent(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  context: EditorKeymapContext,
  indent: string,
): boolean {
  if (context.kind !== 'codeBlock') {
    return false
  }

  const normalizedIndent = normalizeIndent(indent)
  const blockStart = state.selection.$from.start(context.depth)
  const blockEnd = state.selection.$from.end(context.depth)
  const textBeforeCursor = state.doc.textBetween(blockStart, state.selection.from, '\n', '\n')
  const previousLineBreakIndex = textBeforeCursor.lastIndexOf('\n')
  const lineStart = blockStart + previousLineBreakIndex + 1
  const linePrefix = state.doc.textBetween(lineStart, Math.min(blockEnd, lineStart + normalizedIndent.length), '\n', '\n')

  const deleteLength = (() => {
    if (linePrefix.startsWith(normalizedIndent)) {
      return normalizedIndent.length
    }

    if (linePrefix.startsWith('\t')) {
      return 1
    }

    const leadingSpaces = linePrefix.match(/^ +/u)?.[0].length ?? 0
    return Math.min(leadingSpaces, normalizedIndent.length)
  })()

  if (deleteLength <= 0) {
    return true
  }

  const tr = state.tr.delete(lineStart, lineStart + deleteLength)
  dispatchWithUndoBoundary(dispatch, tr, 'code-block-outdent')
  return true
}

export function handleTabKey(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  shiftKey: boolean,
  indent: string,
): boolean {
  const context = findActiveEditorKeymapContext(state)

  if (context.kind === 'codeBlock') {
    return shiftKey
      ? removeCodeBlockIndent(state, dispatch, context, indent)
      : insertCodeBlockIndent(state, dispatch, indent)
  }

  if (context.kind === 'listItem' || context.kind === 'taskItem') {
    return runListItemCommand(state, dispatch, context, shiftKey ? 'lift' : 'sink')
  }

  return false
}

export function handleEditorKeyDown(input: EditorKeymapHandlerInput): boolean {
  const { event, state, dispatch, options } = input

  if (event.defaultPrevented || event.isComposing) {
    return false
  }

  let handled = false

  if (event.key === 'Enter' && !event.shiftKey) {
    handled = handleListEnter(state, dispatch, options.listEnterBehavior)
  } else if (event.key === 'Tab') {
    handled = handleTabKey(state, dispatch, Boolean(event.shiftKey), options.codeBlockIndent)
  }

  if (handled) {
    event.preventDefault()
    event.stopImmediatePropagation?.()
    event.stopPropagation?.()
  }

  return handled
}

export const EditorKeymap = Extension.create<EditorKeymapOptions>({
  name: 'editorKeymap',
  priority: 10000,

  addOptions() {
    return { ...DEFAULT_OPTIONS }
  },

  addKeyboardShortcuts() {
    const runShortcut = (key: string, shiftKey = false): boolean => {
      const view = this.editor.view

      return handleEditorKeyDown({
        state: view.state,
        dispatch: view.dispatch.bind(view),
        event: createShortcutEvent(key, shiftKey, isEditorViewComposing(view)),
        options: {
          listEnterBehavior: this.options.getListEnterBehavior(),
          codeBlockIndent: this.options.getCodeBlockIndent(),
        },
      })
    }

    return {
      Enter: () => runShortcut('Enter'),
      Tab: () => runShortcut('Tab'),
      'Shift-Tab': () => runShortcut('Tab', true),
    }
  },

  addProseMirrorPlugins() {
    const runKeyDown = (view: EditorView, event: KeyboardEvent): boolean => handleEditorKeyDown({
      state: view.state,
      dispatch: view.dispatch.bind(view),
      event,
      options: {
        listEnterBehavior: this.options.getListEnterBehavior(),
        codeBlockIndent: this.options.getCodeBlockIndent(),
      },
    })

    return [
      new Plugin({
        key: editorKeymapPluginKey,
        props: {
          handleDOMEvents: {
            keydown: runKeyDown,
          },
          handleKeyDown: runKeyDown,
        },
      }),
    ]
  },
})
