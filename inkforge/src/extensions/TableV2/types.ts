export type ColumnAlign = 'left' | 'center' | 'right' | null

export interface PipeTableCell {
  text: string
}

export interface PipeTable {
  rows: string[][]
  aligns: ColumnAlign[]
}

export interface SerializePipeTableOptions {
  minColumnWidth?: number
}
