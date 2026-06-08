/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { insertContentAtBlockBoundary } from './BlockBoundaryInsertion'

const editors: Editor[] = []

function createEditor(content: string): Editor {
  const element = document.createElement('div')
  document.body.appendChild(element)

  const editor = new Editor({
    element,
    extensions: [StarterKit],
    content,
  })

  editors.push(editor)
  return editor
}

function findTextRange(editor: Editor, needle: string): { from: number; to: number } {
  let range: { from: number; to: number } | null = null

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true
    }

    const index = node.text.indexOf(needle)
    if (index === -1) {
      return true
    }

    range = {
      from: pos + index,
      to: pos + index + needle.length,
    }
    return false
  })

  if (!range) {
    throw new Error(`Text not found: ${needle}`)
  }

  return range
}

function topLevelTypes(editor: Editor): string[] {
  const types: string[] = []
  editor.state.doc.forEach(node => types.push(node.type.name))
  return types
}

function topLevelTexts(editor: Editor): string[] {
  const texts: string[] = []
  editor.state.doc.forEach(node => texts.push(node.textContent))
  return texts
}

afterEach(() => {
  while (editors.length > 0) {
    editors.pop()?.destroy()
  }
  document.body.innerHTML = ''
})

describe('BlockBoundaryInsertion', () => {
  it('keeps inline snippet text inside the current paragraph', () => {
    const editor = createEditor('<p>Alpha sig Beta</p>')
    const trigger = findTextRange(editor, 'sig')
    editor.commands.setTextSelection(trigger.to)

    const inserted = insertContentAtBlockBoundary(editor, {
      mode: 'inline',
      replaceRange: trigger,
      content: 'Regards',
      selectionOffset: { from: 'Regards'.length, to: 'Regards'.length },
    })

    expect(inserted).toBe(true)
    expect(topLevelTypes(editor)).toEqual(['paragraph'])
    expect(topLevelTexts(editor)).toEqual(['Alpha Regards Beta'])
  })

  it('inserts block content after the current non-empty top-level block', () => {
    const editor = createEditor('<p>Alpha</p><p>Beta</p>')
    const alpha = findTextRange(editor, 'Alpha')
    editor.commands.setTextSelection(alpha.from + 2)

    const inserted = insertContentAtBlockBoundary(editor, {
      mode: 'block',
      content: {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Market-safe callout' }],
          },
        ],
      },
    })

    expect(inserted).toBe(true)
    expect(topLevelTypes(editor)).toEqual(['paragraph', 'blockquote', 'paragraph'])
    expect(topLevelTexts(editor)).toEqual(['Alpha', 'Market-safe callout', 'Beta'])
  })

  it('replaces an empty command paragraph instead of leaving a blank block', () => {
    const editor = createEditor('<p></p><p>Beta</p>')
    editor.commands.setTextSelection(1)

    const inserted = insertContentAtBlockBoundary(editor, {
      mode: 'block',
      content: {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '提示：在这里补充重点信息。' }],
          },
        ],
      },
    })

    expect(inserted).toBe(true)
    expect(topLevelTypes(editor)).toEqual(['blockquote', 'paragraph'])
    expect(topLevelTexts(editor)).toEqual(['提示：在这里补充重点信息。', 'Beta'])
  })

  it('turns a block snippet trigger into its own top-level paragraph and keeps the first tab stop', () => {
    const editor = createEditor('<p>blk</p><p>After</p>')
    const trigger = findTextRange(editor, 'blk')
    editor.commands.setTextSelection(trigger.to)

    const inserted = insertContentAtBlockBoundary(editor, {
      mode: 'block',
      replaceRange: trigger,
      content: 'Inserted block',
      selectionOffset: { from: 9, to: 14 },
    })

    expect(inserted).toBe(true)
    expect(topLevelTypes(editor)).toEqual(['paragraph', 'paragraph'])
    expect(topLevelTexts(editor)).toEqual(['Inserted block', 'After'])
    expect(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)).toBe('block')
  })
})
