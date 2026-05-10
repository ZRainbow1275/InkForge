import { generateId } from '@/utils/uuid'
import type { ResolvedSnippet, SnippetContext, SnippetTabStop } from './types'

const VARIABLE_NAMES = [
  'SELECTED_TEXT',
  'DATETIME',
  'CLIPBOARD',
  'AUTHOR',
  'TITLE',
  'DATE',
  'TIME',
  'UUID',
] as const

type VariableName = typeof VARIABLE_NAMES[number]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatSnippetDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatSnippetTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatSnippetDateTime(date: Date): string {
  return `${formatSnippetDate(date)} ${formatSnippetTime(date)}`
}

function resolveVariable(name: VariableName, context: SnippetContext): string {
  switch (name) {
    case 'DATE': return formatSnippetDate(context.now)
    case 'TIME': return formatSnippetTime(context.now)
    case 'DATETIME': return formatSnippetDateTime(context.now)
    case 'UUID': return generateId()
    case 'CLIPBOARD': return context.clipboardText
    case 'TITLE': return context.articleTitle
    case 'AUTHOR': return context.authorName
    case 'SELECTED_TEXT': return context.selectedText
  }
}

function sortedTabStops(tabStops: SnippetTabStop[]): SnippetTabStop[] {
  return [...tabStops].sort((a, b) => a.index - b.index || a.from - b.from)
}

export function resolveSnippetContent(template: string, context: SnippetContext): ResolvedSnippet {
  let output = ''
  let cursor = 0
  let finalCursorOffset: number | null = null
  const tabStops: SnippetTabStop[] = []

  const append = (value: string): void => {
    output += value
    cursor += value.length
  }

  for (let index = 0; index < template.length;) {
    const char = template[index]
    const next = template[index + 1]

    if (char === '\\' && next === '$') {
      append('$')
      index += 2
      continue
    }

    if (char !== '$') {
      append(char)
      index += 1
      continue
    }

    if (next === '{') {
      const end = template.indexOf('}', index + 2)
      if (end === -1) {
        append('$')
        index += 1
        continue
      }

      const expression = template.slice(index + 2, end)
      const tabStopMatch = expression.match(/^(\d+)(?::([\s\S]*))?$/)
      if (tabStopMatch) {
        const tabIndex = Number.parseInt(tabStopMatch[1], 10)
        const placeholder = tabStopMatch[2] ?? ''
        if (tabIndex === 0) {
          finalCursorOffset = cursor
        } else {
          const from = cursor
          append(placeholder)
          tabStops.push({ index: tabIndex, from, to: from + placeholder.length, placeholder })
        }
        index = end + 1
        continue
      }

      const variable = VARIABLE_NAMES.find(name => expression === name)
      if (variable) {
        append(resolveVariable(variable, context))
        index = end + 1
        continue
      }
    }

    const numberMatch = template.slice(index + 1).match(/^\d+/)
    if (numberMatch) {
      const tabIndex = Number.parseInt(numberMatch[0], 10)
      if (tabIndex === 0) {
        finalCursorOffset = cursor
      } else {
        tabStops.push({ index: tabIndex, from: cursor, to: cursor, placeholder: '' })
      }
      index += 1 + numberMatch[0].length
      continue
    }

    const variable = VARIABLE_NAMES.find(name => template.startsWith(name, index + 1))
    if (variable) {
      append(resolveVariable(variable, context))
      index += 1 + variable.length
      continue
    }

    append('$')
    index += 1
  }

  const orderedStops = sortedTabStops(tabStops)
  return {
    content: output,
    tabStops: orderedStops,
    finalCursorOffset: finalCursorOffset ?? (orderedStops[0]?.from ?? output.length),
  }
}
