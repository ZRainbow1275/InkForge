import { describe, expect, it } from 'vitest'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import { TableV2Extensions } from '../index'
import {
  createExitTableAfterTransaction,
  createSetColumnAlignTransaction,
  findSelectedTableColumn,
  normalizeColumnAlign,
} from '../tableCommands'

const schema = getSchema([
  StarterKit,
  ...TableV2Extensions,
])

function paragraph(text = ''): ProseMirrorNode {
  return schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined)
}

function tableCell(text: string, align: string | null = null): ProseMirrorNode {
  return schema.nodes.tableCell.create({ align }, [paragraph(text)])
}

function tableHeader(text: string, align: string | null = null): ProseMirrorNode {
  return schema.nodes.tableHeader.create({ align }, [paragraph(text)])
}

function tableRow(cells: ProseMirrorNode[]): ProseMirrorNode {
  return schema.nodes.tableRow.create(null, cells)
}

function table(rows: ProseMirrorNode[]): ProseMirrorNode {
  return schema.nodes.table.create(null, rows)
}

function createDocWithTable(): ProseMirrorNode {
  return schema.nodes.doc.create(null, [
    table([
      tableRow([tableHeader('H1'), tableHeader('H2')]),
      tableRow([tableCell('A1'), tableCell('A2')]),
      tableRow([tableCell('B1'), tableCell('B2')]),
    ]),
  ])
}

function createState(doc: ProseMirrorNode, selectionPos: number): EditorState {
  return EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, selectionPos),
  })
}

function findTextSelection(doc: ProseMirrorNode, textContent: string): number {
  let found: number | null = null

  doc.descendants((node, pos) => {
    if (found !== null || node.type.name !== 'paragraph' || node.textContent !== textContent) {
      return true
    }

    found = pos + 1 + node.content.size
    return false
  })

  if (found === null) {
    throw new Error(`Selection text not found: ${textContent}`)
  }

  return found
}

function tableAlignMatrix(doc: ProseMirrorNode): Array<Array<string | null>> {
  const matrix: Array<Array<string | null>> = []

  doc.descendants((node) => {
    if (node.type.name !== 'tableRow') {
      return true
    }

    const row: Array<string | null> = []
    node.forEach((cell) => row.push(cell.attrs.align ?? null))
    matrix.push(row)
    return false
  })

  return matrix
}

describe('TableV2 table commands', () => {
  it('normalizes only supported column alignment values', () => {
    expect(normalizeColumnAlign('left')).toBe('left')
    expect(normalizeColumnAlign('CENTER')).toBe('center')
    expect(normalizeColumnAlign(' right ')).toBe('right')
    expect(normalizeColumnAlign('justify')).toBeNull()
    expect(normalizeColumnAlign(null)).toBeNull()
  })

  it('finds the current logical table column from a text selection', () => {
    const doc = createDocWithTable()
    const state = createState(doc, findTextSelection(doc, 'A2'))

    expect(findSelectedTableColumn(state)?.columnIndex).toBe(1)
  })

  it('updates every real cell in the selected column through a single transaction', () => {
    const doc = createDocWithTable()
    const state = createState(doc, findTextSelection(doc, 'A2'))
    const tr = createSetColumnAlignTransaction(state, 'center')
    if (!tr) {
      throw new Error('Expected table alignment transaction')
    }

    expect(tableAlignMatrix(state.apply(tr).doc)).toEqual([
      [null, 'center'],
      [null, 'center'],
      [null, 'center'],
    ])
  })

  it('clears column alignment by writing null attrs to the selected column', () => {
    const baseTable = table([
      tableRow([tableHeader('H1', 'right'), tableHeader('H2', 'right')]),
      tableRow([tableCell('A1', 'right'), tableCell('A2', 'right')]),
    ])
    const doc = schema.nodes.doc.create(null, [baseTable])
    const state = createState(doc, findTextSelection(doc, 'A1'))
    const tr = createSetColumnAlignTransaction(state, null)
    if (!tr) {
      throw new Error('Expected table alignment transaction')
    }

    expect(tableAlignMatrix(state.apply(tr).doc)).toEqual([
      [null, 'right'],
      [null, 'right'],
    ])
  })

  it('returns null outside tables instead of mutating ordinary text', () => {
    const doc = schema.nodes.doc.create(null, [paragraph('outside')])
    const state = createState(doc, findTextSelection(doc, 'outside'))

    expect(createSetColumnAlignTransaction(state, 'left')).toBeNull()
    expect(createExitTableAfterTransaction(state)).toBeNull()
  })

  it('inserts a paragraph after the table and moves selection out of the table', () => {
    const doc = createDocWithTable()
    const state = createState(doc, findTextSelection(doc, 'B2'))
    const tr = createExitTableAfterTransaction(state)
    if (!tr) {
      throw new Error('Expected exit-table transaction')
    }

    const nextState = state.apply(tr)
    expect(nextState.doc.childCount).toBe(2)
    expect(nextState.doc.child(0).type.name).toBe('table')
    expect(nextState.doc.child(1).type.name).toBe('paragraph')
    expect(nextState.selection.$from.parent.type.name).toBe('paragraph')
  })
})
