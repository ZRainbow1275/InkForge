import { Extension } from '@tiptap/core'
import Table, { TableView } from '@tiptap/extension-table'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import type { ColumnAlign } from './types'
import {
  createExitTableAfterTransaction,
  createSetColumnAlignTransaction,
  normalizeColumnAlign,
} from './tableCommands'

export { TableRow }
export * from './tableCommands'
export * from './tableMarkdown'
export type * from './types'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableV2: {
      setColumnAlign: (align: ColumnAlign) => ReturnType
      exitTableAfter: () => ReturnType
    }
  }
}

class InkforgeTableView extends TableView {
  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    super(node, cellMinWidth)
    this.dom.classList.add('inkforge-table-wrapper')
    this.table.classList.add('inkforge-table')
  }
}

export const TableV2 = Table.configure({
  resizable: true,
  lastColumnResizable: true,
  View: InkforgeTableView,
  HTMLAttributes: {
    class: 'inkforge-table',
  },
})

export const TableCellV2 = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: createAlignAttribute(),
    }
  },
})

export const TableHeaderV2 = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: createAlignAttribute(),
    }
  },
})

export const TableKeyboardV2 = Extension.create({
  name: 'tableV2Keyboard',

  addCommands() {
    return {
      setColumnAlign: align => ({ state, dispatch }) => {
        const tr = createSetColumnAlignTransaction(state, align)
        if (!tr) {
          return false
        }

        if (dispatch && tr.docChanged) {
          dispatch(tr)
        }
        return true
      },
      exitTableAfter: () => ({ state, dispatch }) => {
        const tr = createExitTableAfterTransaction(state)
        if (!tr) {
          return false
        }

        dispatch?.(tr)
        return true
      },
    }
  },

  addKeyboardShortcuts() {
    const runInTable = (command: () => boolean): boolean => {
      if (!this.editor.isActive('table')) {
        return false
      }

      return command()
    }

    return {
      'Ctrl-Enter': () => this.editor.commands.exitTableAfter(),
      'Mod-Enter': () => this.editor.commands.exitTableAfter(),
      'Ctrl-Shift-I': () => runInTable(() => this.editor.commands.addRowBefore()),
      'Ctrl-Shift-K': () => runInTable(() => this.editor.commands.addRowAfter()),
      'Ctrl-Shift-Delete': () => runInTable(() => this.editor.commands.deleteRow()),
      'Ctrl-Shift-[': () => runInTable(() => this.editor.commands.addColumnBefore()),
      'Ctrl-Shift-]': () => runInTable(() => this.editor.commands.addColumnAfter()),
      'Ctrl-Alt-Delete': () => runInTable(() => this.editor.commands.deleteColumn()),
      'Ctrl-Shift-M': () => runInTable(() => this.editor.commands.mergeCells()),
      'Ctrl-Shift-Alt-M': () => runInTable(() => this.editor.commands.splitCell()),
    }
  },
})

export const TableV2Extensions = [
  TableV2,
  TableRow,
  TableCellV2,
  TableHeaderV2,
  TableKeyboardV2,
]

function createAlignAttribute() {
  return {
    default: null,
    parseHTML: (element: HTMLElement) => normalizeColumnAlign(element.style.textAlign || element.getAttribute('align')),
    renderHTML: (attributes: Record<string, unknown>) => {
      const align = normalizeColumnAlign(attributes.align)
      return align ? { style: `text-align: ${align}` } : {}
    },
  }
}
