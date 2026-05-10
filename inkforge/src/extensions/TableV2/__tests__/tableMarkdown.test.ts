import { describe, expect, it } from 'vitest'
import {
  alignmentToDelimiter,
  delimiterToAlignment,
  escapePipeCell,
  parsePipeTable,
  serializePipeTable,
  splitPipeRow,
  unescapePipeCell,
} from '../tableMarkdown'

describe('TableV2 GFM pipe table utilities', () => {
  it('converts column alignment values to deterministic GFM delimiters', () => {
    expect(alignmentToDelimiter('left')).toBe(':--')
    expect(alignmentToDelimiter('center')).toBe(':-:')
    expect(alignmentToDelimiter('right')).toBe('--:')
    expect(alignmentToDelimiter(null)).toBe('---')
  })

  it('parses GFM alignment delimiters', () => {
    expect(delimiterToAlignment(':---')).toBe('left')
    expect(delimiterToAlignment(':---:')).toBe('center')
    expect(delimiterToAlignment('---:')).toBe('right')
    expect(delimiterToAlignment('---')).toBeNull()
    expect(delimiterToAlignment('--')).toBeUndefined()
  })

  it('escapes and unescapes literal pipes, backslashes, and cell newlines', () => {
    const escaped = escapePipeCell('A|B\\C\nD')

    expect(escaped).toBe('A\\|B\\\\C<br>D')
    expect(unescapePipeCell(escaped)).toBe('A|B\\C\nD')
  })

  it('splits escaped pipe rows without treating literal pipes as separators', () => {
    expect(splitPipeRow('| A\\|B | C |')).toEqual(['A|B', 'C'])
    expect(splitPipeRow('A | B\\\\C | D')).toEqual(['A', 'B\\C', 'D'])
  })

  it('parses rows and normalizes short body rows to the header column count', () => {
    const parsed = parsePipeTable(`
      | Name | Age | City |
      | :--- | ---: | :---: |
      | Alice | 30 |
      | Bob | 41 | Paris |
    `)

    expect(parsed).toEqual({
      rows: [
        ['Name', 'Age', 'City'],
        ['Alice', '30', ''],
        ['Bob', '41', 'Paris'],
      ],
      aligns: ['left', 'right', 'center'],
    })
  })

  it('rejects invalid delimiter rows instead of guessing table structure', () => {
    expect(parsePipeTable('| A | B |\n| --- | nope |')).toBeNull()
    expect(parsePipeTable('| A | B |')).toBeNull()
  })

  it('serializes readable outer-pipe tables with alignment rows', () => {
    expect(serializePipeTable({
      rows: [
        ['Name', 'Score', 'Note'],
        ['Alice', '10', 'A|B'],
      ],
      aligns: ['left', 'right', null],
    })).toBe([
      '| Name  | Score | Note |',
      '| :---- | ----: | ---- |',
      '| Alice | 10    | A\\|B |',
    ].join('\n'))
  })

  it('round-trips plain text, escaped pipes, line breaks, and alignment', () => {
    const table = {
      rows: [
        ['Header|One', 'Header Two'],
        ['A\nB', 'C\\D'],
      ],
      aligns: ['center' as const, null],
    }

    expect(parsePipeTable(serializePipeTable(table))).toEqual(table)
  })
})
