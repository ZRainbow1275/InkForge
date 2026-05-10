import { describe, expect, it } from 'vitest'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { EditorState, TextSelection, type Transaction } from '@tiptap/pm/state'
import {
  EDITOR_KEYMAP_META,
  findActiveEditorKeymapContext,
  handleEditorKeyDown,
  isEmptyListItem,
  isNestedListItem,
  type EditorKeymapKeyboardEvent,
  type EditorKeymapRuntimeOptions,
} from './EditorKeymap'

const schema = getSchema([
  StarterKit,
  TaskList,
  TaskItem.configure({ nested: true }),
])

const defaultOptions: EditorKeymapRuntimeOptions = {
  listEnterBehavior: 'notion',
  codeBlockIndent: '    ',
}

interface KeyRunResult {
  handled: boolean
  prevented: boolean
  state: EditorState
  transactions: Transaction[]
}

function createState(doc: ProseMirrorNode, selectionPos: number): EditorState {
  return EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, selectionPos),
  })
}

function findParagraphSelection(doc: ProseMirrorNode, textContent: string, offset: number = textContent.length): number {
  let found: number | null = null

  doc.descendants((node, pos) => {
    if (found !== null || node.type.name !== 'paragraph' || node.textContent !== textContent) {
      return true
    }

    found = pos + 1 + Math.min(offset, node.content.size)
    return false
  })

  if (found === null) {
    throw new Error(`Paragraph not found: ${textContent}`)
  }

  return found
}

function findCodeBlockSelection(doc: ProseMirrorNode, offset: number): number {
  let found: number | null = null

  doc.descendants((node, pos) => {
    if (found !== null || node.type.name !== 'codeBlock') {
      return true
    }

    found = pos + 1 + Math.min(offset, node.content.size)
    return false
  })

  if (found === null) {
    throw new Error('Code block not found')
  }

  return found
}

function lastTransaction(transactions: Transaction[]): Transaction | undefined {
  return transactions[transactions.length - 1]
}

function runKey(
  initialState: EditorState,
  key: string,
  shiftKey = false,
  options: EditorKeymapRuntimeOptions = defaultOptions,
): KeyRunResult {
  let currentState = initialState
  let prevented = false
  const transactions: Transaction[] = []
  const event: EditorKeymapKeyboardEvent = {
    key,
    shiftKey,
    isComposing: false,
    defaultPrevented: false,
    preventDefault: () => {
      prevented = true
    },
  }

  const handled = handleEditorKeyDown({
    state: currentState,
    dispatch: (tr) => {
      transactions.push(tr)
      currentState = currentState.apply(tr)
    },
    event,
    options,
  })

  return { handled, prevented, state: currentState, transactions }
}

describe('EditorKeymap list Enter behavior', () => {
  it('lifts an empty nested bullet list item one level at a time', () => {
    const { doc, bulletList, listItem, paragraph } = schema.nodes
    const pmDoc = doc.create(null, [
      bulletList.create(null, [
        listItem.create(null, [
          paragraph.create(null, schema.text('A')),
          bulletList.create(null, [listItem.create(null, [paragraph.create()])]),
        ]),
      ]),
    ])
    const state = createState(pmDoc, findParagraphSelection(pmDoc, ''))
    const context = findActiveEditorKeymapContext(state)

    expect(context.kind).toBe('listItem')
    expect(context.nestedListItem).toBe(true)
    expect(isNestedListItem(state.selection.$from, context.depth)).toBe(true)
    expect(isEmptyListItem(context.node)).toBe(true)

    const result = runKey(state, 'Enter')
    const rootList = result.state.doc.child(0)

    expect(result.handled).toBe(true)
    expect(result.prevented).toBe(true)
    expect(lastTransaction(result.transactions)?.getMeta(EDITOR_KEYMAP_META)).toBe('list-lift')
    expect(rootList.type.name).toBe('bulletList')
    expect(rootList.childCount).toBe(2)
    expect(rootList.child(0).textContent).toBe('A')
    expect(rootList.child(1).textContent).toBe('')
  })

  it('keeps selection on the lifted empty item so the next Enter exits the list', () => {
    const { doc, bulletList, listItem, paragraph } = schema.nodes
    const pmDoc = doc.create(null, [
      bulletList.create(null, [
        listItem.create(null, [paragraph.create(null, schema.text('A'))]),
        listItem.create(null, [
          paragraph.create(null, schema.text('B')),
          bulletList.create(null, [listItem.create(null, [paragraph.create()])]),
        ]),
      ]),
    ])
    const state = createState(pmDoc, findParagraphSelection(pmDoc, ''))
    const liftedResult = runKey(state, 'Enter')
    const exitResult = runKey(liftedResult.state, 'Enter')

    expect(liftedResult.handled).toBe(true)
    expect(liftedResult.state.doc.child(0).childCount).toBe(3)
    expect(liftedResult.state.selection.$from.parent.type.name).toBe('paragraph')
    expect(liftedResult.state.selection.$from.parent.content.size).toBe(0)
    expect(exitResult.handled).toBe(true)
    expect(exitResult.prevented).toBe(true)
    expect(exitResult.state.doc.childCount).toBe(2)
    expect(exitResult.state.doc.child(0).type.name).toBe('bulletList')
    expect(exitResult.state.doc.child(1).type.name).toBe('paragraph')
    expect(exitResult.state.selection.$from.parent.type.name).toBe('paragraph')
  })

  it('exits an empty top-level list item into a normal paragraph', () => {
    const { doc, bulletList, listItem, paragraph } = schema.nodes
    const pmDoc = doc.create(null, [
      bulletList.create(null, [
        listItem.create(null, [paragraph.create(null, schema.text('A'))]),
        listItem.create(null, [paragraph.create()]),
      ]),
    ])
    const state = createState(pmDoc, findParagraphSelection(pmDoc, ''))
    const result = runKey(state, 'Enter')

    expect(result.handled).toBe(true)
    expect(result.prevented).toBe(true)
    expect(lastTransaction(result.transactions)?.getMeta(EDITOR_KEYMAP_META)).toBe('list-lift')
    expect(result.state.doc.childCount).toBe(2)
    expect(result.state.doc.child(0).type.name).toBe('bulletList')
    expect(result.state.doc.child(1).type.name).toBe('paragraph')
    expect(result.state.selection.$from.parent.type.name).toBe('paragraph')
  })

  it('splits a non-empty list item through the custom structural keymap', () => {
    const { doc, bulletList, listItem, paragraph } = schema.nodes
    const pmDoc = doc.create(null, [bulletList.create(null, [listItem.create(null, [paragraph.create(null, schema.text('A'))])])])
    const state = createState(pmDoc, findParagraphSelection(pmDoc, 'A'))
    const result = runKey(state, 'Enter')
    const rootList = result.state.doc.child(0)

    expect(result.handled).toBe(true)
    expect(result.prevented).toBe(true)
    expect(lastTransaction(result.transactions)?.getMeta(EDITOR_KEYMAP_META)).toBe('list-split')
    expect(rootList.type.name).toBe('bulletList')
    expect(rootList.childCount).toBe(2)
    expect(rootList.child(0).textContent).toBe('A')
    expect(rootList.child(1).textContent).toBe('')
  })

  it('can be switched back to Typora-compatible Enter behavior', () => {
    const { doc, bulletList, listItem, paragraph } = schema.nodes
    const pmDoc = doc.create(null, [
      bulletList.create(null, [
        listItem.create(null, [
          paragraph.create(null, schema.text('A')),
          bulletList.create(null, [listItem.create(null, [paragraph.create()])]),
        ]),
      ]),
    ])
    const state = createState(pmDoc, findParagraphSelection(pmDoc, ''))
    const result = runKey(state, 'Enter', false, { ...defaultOptions, listEnterBehavior: 'typora' })

    expect(result.handled).toBe(false)
    expect(result.prevented).toBe(false)
    expect(result.state.doc.eq(pmDoc)).toBe(true)
  })

  it('lifts an empty nested task list item through the task item schema', () => {
    const { doc, taskList, taskItem, paragraph } = schema.nodes
    const pmDoc = doc.create(null, [
      taskList.create(null, [
        taskItem.create({ checked: false }, [
          paragraph.create(null, schema.text('Task')),
          taskList.create(null, [taskItem.create({ checked: false }, [paragraph.create()])]),
        ]),
      ]),
    ])
    const state = createState(pmDoc, findParagraphSelection(pmDoc, ''))
    const result = runKey(state, 'Enter')
    const rootList = result.state.doc.child(0)

    expect(result.handled).toBe(true)
    expect(rootList.type.name).toBe('taskList')
    expect(rootList.childCount).toBe(2)
    expect(rootList.child(1).type.name).toBe('taskItem')
  })
})

describe('EditorKeymap Tab behavior', () => {
  it('sinks a list item when Tab is pressed in a valid list context', () => {
    const { doc, bulletList, listItem, paragraph } = schema.nodes
    const pmDoc = doc.create(null, [
      bulletList.create(null, [
        listItem.create(null, [paragraph.create(null, schema.text('A'))]),
        listItem.create(null, [paragraph.create(null, schema.text('B'))]),
      ]),
    ])
    const state = createState(pmDoc, findParagraphSelection(pmDoc, 'B'))
    const result = runKey(state, 'Tab')
    const firstItem = result.state.doc.child(0).child(0)

    expect(result.handled).toBe(true)
    expect(result.prevented).toBe(true)
    expect(lastTransaction(result.transactions)?.getMeta(EDITOR_KEYMAP_META)).toBe('list-sink')
    expect(firstItem.child(1).type.name).toBe('bulletList')
    expect(firstItem.child(1).child(0).textContent).toBe('B')
  })

  it('lifts a nested list item when Shift+Tab is pressed', () => {
    const { doc, bulletList, listItem, paragraph } = schema.nodes
    const pmDoc = doc.create(null, [
      bulletList.create(null, [
        listItem.create(null, [
          paragraph.create(null, schema.text('A')),
          bulletList.create(null, [listItem.create(null, [paragraph.create(null, schema.text('B'))])]),
        ]),
      ]),
    ])
    const state = createState(pmDoc, findParagraphSelection(pmDoc, 'B'))
    const result = runKey(state, 'Tab', true)
    const rootList = result.state.doc.child(0)

    expect(result.handled).toBe(true)
    expect(result.prevented).toBe(true)
    expect(lastTransaction(result.transactions)?.getMeta(EDITOR_KEYMAP_META)).toBe('list-lift')
    expect(rootList.childCount).toBe(2)
    expect(rootList.child(1).textContent).toBe('B')
  })

  it('inserts the configured indentation inside code blocks', () => {
    const { doc, codeBlock } = schema.nodes
    const pmDoc = doc.create(null, [codeBlock.create(null, schema.text('const x = 1;'))])
    const state = createState(pmDoc, findCodeBlockSelection(pmDoc, 0))
    const result = runKey(state, 'Tab', false, { ...defaultOptions, codeBlockIndent: '  ' })

    expect(result.handled).toBe(true)
    expect(result.prevented).toBe(true)
    expect(lastTransaction(result.transactions)?.getMeta(EDITOR_KEYMAP_META)).toBe('code-block-indent')
    expect(result.state.doc.child(0).textContent).toBe('  const x = 1;')
  })

  it('removes one configured indentation unit with Shift+Tab inside code blocks', () => {
    const { doc, codeBlock } = schema.nodes
    const pmDoc = doc.create(null, [codeBlock.create(null, schema.text('    const x = 1;'))])
    const state = createState(pmDoc, findCodeBlockSelection(pmDoc, 8))
    const result = runKey(state, 'Tab', true)

    expect(result.handled).toBe(true)
    expect(result.prevented).toBe(true)
    expect(lastTransaction(result.transactions)?.getMeta(EDITOR_KEYMAP_META)).toBe('code-block-outdent')
    expect(result.state.doc.child(0).textContent).toBe('const x = 1;')
  })

  it('does not trap Tab focus in ordinary paragraphs', () => {
    const { doc, paragraph } = schema.nodes
    const pmDoc = doc.create(null, [paragraph.create(null, schema.text('plain text'))])
    const state = createState(pmDoc, findParagraphSelection(pmDoc, 'plain text'))
    const result = runKey(state, 'Tab')

    expect(result.handled).toBe(false)
    expect(result.prevented).toBe(false)
  })

  it('does not handle structural keys during IME composition', () => {
    const { doc, bulletList, listItem, paragraph } = schema.nodes
    const pmDoc = doc.create(null, [
      bulletList.create(null, [
        listItem.create(null, [
          paragraph.create(null, schema.text('A')),
          bulletList.create(null, [listItem.create(null, [paragraph.create()])]),
        ]),
      ]),
    ])
    const state = createState(pmDoc, findParagraphSelection(pmDoc, ''))
    let prevented = false
    const event: EditorKeymapKeyboardEvent = {
      key: 'Enter',
      isComposing: true,
      preventDefault: () => {
        prevented = true
      },
    }
    const handled = handleEditorKeyDown({ state, event, options: defaultOptions })

    expect(handled).toBe(false)
    expect(prevented).toBe(false)
  })
})
