import type { ColumnAlign, PipeTable, SerializePipeTableOptions } from './types'

const MIN_GFM_SEPARATOR_WIDTH = 3

export function escapePipeCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

export function unescapePipeCell(value: string): string {
  let result = ''
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    const next = value[index + 1]

    if (char === '\\' && (next === '|' || next === '\\')) {
      result += next
      index += 1
      continue
    }

    result += char
  }

  return result.replace(/<br\s*\/?>/gi, '\n').trim()
}

export function alignmentToDelimiter(align: ColumnAlign, width = MIN_GFM_SEPARATOR_WIDTH): string {
  const normalizedWidth = Math.max(MIN_GFM_SEPARATOR_WIDTH, width)
  const dashes = '-'.repeat(normalizedWidth)

  if (align === 'left') {
    return `:${dashes.slice(1)}`
  }
  if (align === 'center') {
    return `:${'-'.repeat(Math.max(1, normalizedWidth - 2))}:`
  }
  if (align === 'right') {
    return `${dashes.slice(0, -1)}:`
  }

  return dashes
}

export function delimiterToAlignment(delimiter: string): ColumnAlign | undefined {
  const value = delimiter.trim()
  if (!/^:?-{3,}:?$/.test(value)) {
    return undefined
  }

  const startsWithColon = value.startsWith(':')
  const endsWithColon = value.endsWith(':')

  if (startsWithColon && endsWithColon) {
    return 'center'
  }
  if (startsWithColon) {
    return 'left'
  }
  if (endsWithColon) {
    return 'right'
  }

  return null
}

export function splitPipeRow(row: string): string[] {
  const trimmed = row.trim()
  const withoutOuterStart = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed
  const withoutOuter = withoutOuterStart.endsWith('|') ? withoutOuterStart.slice(0, -1) : withoutOuterStart
  const cells: string[] = []
  let cell = ''
  let escaped = false

  for (const char of withoutOuter) {
    if (escaped) {
      cell += `\\${char}`
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '|') {
      cells.push(unescapePipeCell(cell))
      cell = ''
      continue
    }

    cell += char
  }

  if (escaped) {
    cell += '\\'
  }

  cells.push(unescapePipeCell(cell))
  return cells
}

export function parsePipeTable(markdown: string): PipeTable | null {
  const lines = markdown
    .trim()
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return null
  }

  const header = splitPipeRow(lines[0])
  const delimiters = splitPipeRow(lines[1])
  if (header.length === 0 || delimiters.length !== header.length) {
    return null
  }

  const aligns = delimiters.map(delimiterToAlignment)
  if (aligns.some(align => align === undefined)) {
    return null
  }

  const bodyRows = lines.slice(2).map(splitPipeRow)
  const normalizedRows = [header, ...bodyRows].map(row => normalizeRow(row, header.length))

  return {
    rows: normalizedRows,
    aligns: aligns as ColumnAlign[],
  }
}

export function serializePipeTable(table: PipeTable, options: SerializePipeTableOptions = {}): string {
  if (table.rows.length === 0) {
    return ''
  }

  const columnCount = Math.max(...table.rows.map(row => row.length), table.aligns.length)
  const rows = table.rows.map(row => normalizeRow(row, columnCount))
  const aligns = normalizeAligns(table.aligns, columnCount)
  const minColumnWidth = Math.max(MIN_GFM_SEPARATOR_WIDTH, options.minColumnWidth ?? MIN_GFM_SEPARATOR_WIDTH)
  const escapedRows = rows.map(row => row.map(escapePipeCell))
  const widths = Array.from({ length: columnCount }, (_, columnIndex) => {
    return Math.max(
      minColumnWidth,
      ...escapedRows.map(row => row[columnIndex]?.length ?? 0),
    )
  })

  const header = formatRow(escapedRows[0], widths)
  const delimiter = formatRow(aligns.map((align, index) => alignmentToDelimiter(align, widths[index])), widths)
  const body = escapedRows.slice(1).map(row => formatRow(row, widths))

  return [header, delimiter, ...body].join('\n')
}

function normalizeRow(row: string[], columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, index) => row[index] ?? '')
}

function normalizeAligns(aligns: ColumnAlign[], columnCount: number): ColumnAlign[] {
  return Array.from({ length: columnCount }, (_, index) => aligns[index] ?? null)
}

function formatRow(row: string[], widths: number[]): string {
  return `| ${row.map((cell, index) => cell.padEnd(widths[index])).join(' | ')} |`
}
