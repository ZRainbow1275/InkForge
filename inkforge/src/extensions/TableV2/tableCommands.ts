import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state'
import { findTable, TableMap, type FindNodeResult } from '@tiptap/pm/tables'
import type { ColumnAlign } from './types'

const VALID_COLUMN_ALIGNS = new Set<Exclude<ColumnAlign, null>>(['left', 'center', 'right'])

export interface SelectedTableColumn {
  table: FindNodeResult
  columnIndex: number
}

export function normalizeColumnAlign(value: unknown): ColumnAlign {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return VALID_COLUMN_ALIGNS.has(normalized as Exclude<ColumnAlign, null>)
    ? normalized as Exclude<ColumnAlign, null>
    : null
}

export function findSelectedTableColumn(state: EditorState): SelectedTableColumn | null {
  const table = findTable(state.selection.$from)
  if (!table) {
    return null
  }

  const columnIndex = findColumnIndexAtPosition(table, state.selection.$from.pos)
  if (columnIndex === null) {
    return null
  }

  return { table, columnIndex }
}

export function createSetColumnAlignTransaction(state: EditorState, align: ColumnAlign): Transaction | null {
  const selectedColumn = findSelectedTableColumn(state)
  if (!selectedColumn) {
    return null
  }

  const normalizedAlign = normalizeColumnAlign(align)
  const tableMap = TableMap.get(selectedColumn.table.node)
  const seenCellOffsets = new Set<number>()
  let tr = state.tr

  for (let rowIndex = 0; rowIndex < tableMap.height; rowIndex += 1) {
    const cellOffset = tableMap.map[rowIndex * tableMap.width + selectedColumn.columnIndex]
    if (typeof cellOffset !== 'number' || seenCellOffsets.has(cellOffset)) {
      continue
    }

    seenCellOffsets.add(cellOffset)
    const cell = selectedColumn.table.node.nodeAt(cellOffset)
    if (!isTableCellNode(cell)) {
      continue
    }

    if (normalizeColumnAlign(cell.attrs.align) === normalizedAlign) {
      continue
    }

    tr = tr.setNodeMarkup(
      selectedColumn.table.start + cellOffset,
      undefined,
      { ...cell.attrs, align: normalizedAlign },
      cell.marks,
    )
  }

  return tr
}

export function createExitTableAfterTransaction(state: EditorState): Transaction | null {
  const table = findTable(state.selection.$from)
  const paragraphType = state.schema.nodes.paragraph
  if (!table || !paragraphType) {
    return null
  }

  const paragraph = paragraphType.createAndFill()
  if (!paragraph) {
    return null
  }

  const insertPos = table.pos + table.node.nodeSize
  const tr = state.tr.insert(insertPos, paragraph)
  return tr
    .setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1), 1))
    .scrollIntoView()
}

function findColumnIndexAtPosition(table: FindNodeResult, docPosition: number): number | null {
  const tableMap = TableMap.get(table.node)

  for (let rowIndex = 0; rowIndex < tableMap.height; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < tableMap.width; columnIndex += 1) {
      const cellOffset = tableMap.map[rowIndex * tableMap.width + columnIndex]
      if (typeof cellOffset !== 'number') {
        continue
      }

      const cell = table.node.nodeAt(cellOffset)
      if (!isTableCellNode(cell)) {
        continue
      }

      const cellStart = table.start + cellOffset
      const cellEnd = cellStart + cell.nodeSize
      if (docPosition >= cellStart && docPosition <= cellEnd) {
        return columnIndex
      }
    }
  }

  return null
}

function isTableCellNode(node: ProseMirrorNode | null | undefined): node is ProseMirrorNode {
  return node?.type.spec.tableRole === 'cell' || node?.type.spec.tableRole === 'header_cell'
}
