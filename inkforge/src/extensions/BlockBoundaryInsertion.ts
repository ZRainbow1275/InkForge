import type { Content, Editor, JSONContent } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'

export interface TextSelectionOffset {
  from: number
  to: number
}

export interface InsertRange {
  from: number
  to: number
}

export type BlockBoundaryInsertMode = 'auto' | 'block' | 'inline'

export interface BlockBoundaryInsertOptions {
  content: Content
  mode?: BlockBoundaryInsertMode
  replaceRange?: InsertRange
  selectionOffset?: TextSelectionOffset
}

interface TopLevelBlockBoundary {
  from: number
  to: number
  node: ProseMirrorNode
}

interface NormalizedBoundaryContent {
  content: Content
  textSelectionBaseDelta: number | null
}

const BLOCK_HTML_TAG_PATTERN = /^\s*<(address|article|aside|blockquote|details|div|figure|figcaption|h[1-6]|hr|ol|p|pre|section|table|ul)\b/i

const BLOCK_JSON_TYPES = new Set([
  'blockquote',
  'bulletList',
  'codeBlock',
  'detailsBlock',
  'doc',
  'heading',
  'horizontalRule',
  'orderedList',
  'paragraph',
  'richCodeBlock',
  'table',
  'taskList',
])

export function isBlockBoundaryContent(content: Content): boolean {
  if (typeof content === 'string') {
    return BLOCK_HTML_TAG_PATTERN.test(content)
  }

  if (Array.isArray(content)) {
    return content.some(isBlockJsonContent)
  }

  return isBlockJsonContent(content)
}

function isBlockJsonContent(content: JSONContent | null): boolean {
  if (!content?.type) {
    return false
  }

  return BLOCK_JSON_TYPES.has(content.type)
}

function resolveCurrentTopLevelBlockBoundary(state: EditorState): TopLevelBlockBoundary | null {
  const { $from } = state.selection

  if ($from.depth < 1) {
    return null
  }

  const from = $from.before(1)
  const node = state.doc.nodeAt(from)

  if (!node?.isBlock) {
    return null
  }

  return {
    from,
    to: from + node.nodeSize,
    node,
  }
}

function textNode(text: string): JSONContent[] {
  return text.length > 0 ? [{ type: 'text', text }] : []
}

function plainTextToParagraphBlocks(content: string): JSONContent[] {
  const blocks = content
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map(block => block.trimEnd())
    .filter(block => block.length > 0)

  const paragraphBlocks = blocks.length > 0 ? blocks : ['']

  return paragraphBlocks.map(block => ({
    type: 'paragraph',
    content: textNode(block),
  }))
}

function normalizeBoundaryContent(content: Content): NormalizedBoundaryContent {
  if (typeof content !== 'string') {
    return {
      content,
      textSelectionBaseDelta: null,
    }
  }

  if (BLOCK_HTML_TAG_PATTERN.test(content)) {
    return {
      content,
      textSelectionBaseDelta: null,
    }
  }

  const paragraphBlocks = plainTextToParagraphBlocks(content)

  return {
    content: paragraphBlocks,
    textSelectionBaseDelta: paragraphBlocks.length === 1 ? 1 : null,
  }
}

function currentBlockIsEmptyTextBlock(boundary: TopLevelBlockBoundary): boolean {
  return boundary.node.isTextblock && !boundary.node.type.spec.code && boundary.node.textContent.trim().length === 0
}

function rangeText(state: EditorState, range: InsertRange): string {
  return state.doc.textBetween(range.from, range.to, '\n', '\n')
}

function replacementEmptiesCurrentTextBlock(state: EditorState, boundary: TopLevelBlockBoundary, replaceRange?: InsertRange): boolean {
  if (!replaceRange || !boundary.node.isTextblock || boundary.node.type.spec.code) {
    return false
  }

  if (replaceRange.from < boundary.from || replaceRange.to > boundary.to) {
    return false
  }

  return boundary.node.textContent.trim() === rangeText(state, replaceRange).trim()
}

function clampTextSelectionOffset(editor: Editor, base: number, offset: TextSelectionOffset): TextSelectionOffset {
  const docSize = editor.state.doc.content.size
  const from = Math.min(Math.max(base + offset.from, 0), docSize)
  const to = Math.min(Math.max(base + offset.to, from), docSize)
  return { from, to }
}

function setSelectionFromOffset(editor: Editor, base: number | null, offset?: TextSelectionOffset): void {
  if (base === null || !offset) {
    return
  }

  const selection = clampTextSelectionOffset(editor, base, offset)
  editor.commands.setTextSelection(selection)
}

function insertInlineContent(editor: Editor, options: BlockBoundaryInsertOptions): boolean {
  const selectionBase = options.replaceRange?.from ?? editor.state.selection.from
  let chain = editor.chain().focus()

  if (options.replaceRange) {
    chain = chain.deleteRange(options.replaceRange)
  }

  const inserted = chain.insertContent(options.content).run()
  if (inserted) {
    setSelectionFromOffset(editor, selectionBase, options.selectionOffset)
  }

  return inserted
}

export function insertContentAtBlockBoundary(editor: Editor, options: BlockBoundaryInsertOptions): boolean {
  const mode = options.mode ?? 'auto'
  const shouldUseBoundary = mode === 'block' || (mode === 'auto' && isBlockBoundaryContent(options.content))

  if (!shouldUseBoundary) {
    return insertInlineContent(editor, options)
  }

  const boundary = resolveCurrentTopLevelBlockBoundary(editor.state)
  if (!boundary) {
    return insertInlineContent(editor, options)
  }

  const normalized = normalizeBoundaryContent(options.content)
  const shouldReplaceCurrentBlock = currentBlockIsEmptyTextBlock(boundary)
    || replacementEmptiesCurrentTextBlock(editor.state, boundary, options.replaceRange)

  const insertStart = shouldReplaceCurrentBlock
    ? boundary.from
    : boundary.to - (options.replaceRange ? options.replaceRange.to - options.replaceRange.from : 0)

  const selectionBase = normalized.textSelectionBaseDelta === null
    ? null
    : insertStart + normalized.textSelectionBaseDelta

  let chain = editor.chain().focus()

  if (shouldReplaceCurrentBlock) {
    chain = chain.insertContentAt({ from: boundary.from, to: boundary.to }, normalized.content, { updateSelection: true })
  } else {
    if (options.replaceRange) {
      chain = chain.deleteRange(options.replaceRange)
    }
    chain = chain.insertContentAt(insertStart, normalized.content, { updateSelection: true })
  }

  const inserted = chain.run()
  if (inserted) {
    setSelectionFromOffset(editor, selectionBase, options.selectionOffset)
  }

  return inserted
}
