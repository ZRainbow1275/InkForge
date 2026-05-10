import { generateId } from '@/utils/uuid'
import type {
  RenderedTemplate,
  TemplateValidationResult,
  TemplateVariable,
  TemplateVariableContext,
} from './types'

const VARIABLE_PATTERN = /{{\s*([^{}]+?)\s*}}/g
const AUTO_VARIABLES = new Set(['CURSOR', 'author', 'uuid', 'weekNumber'])

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function getIsoWeekNumber(date: Date): number {
  const normalized = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = normalized.getUTCDay() || 7
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1))
  return Math.ceil((((normalized.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
}

export function formatTemplateDate(date: Date, format: string): string {
  return format
    .replace(/YYYY/g, String(date.getFullYear()))
    .replace(/MM/g, pad2(date.getMonth() + 1))
    .replace(/DD/g, pad2(date.getDate()))
    .replace(/HH/g, pad2(date.getHours()))
    .replace(/mm/g, pad2(date.getMinutes()))
}

function resolveVariable(expression: string, context: TemplateVariableContext): string {
  if (expression.startsWith('date:')) {
    return formatTemplateDate(context.createdAt, expression.slice('date:'.length))
  }

  if (expression === 'author') {
    return context.authorName
  }

  if (expression === 'uuid') {
    return context.uuidFactory?.() ?? generateId()
  }

  if (expression === 'weekNumber') {
    return String(getIsoWeekNumber(context.createdAt))
  }

  return context.userInputs[expression] ?? ''
}

export function renderTemplateVariables(templateContent: string, context: TemplateVariableContext): RenderedTemplate {
  let cursorOffset: number | null = null
  let rendered = ''
  let lastIndex = 0

  for (const match of templateContent.matchAll(VARIABLE_PATTERN)) {
    const [token, rawExpression] = match
    const matchIndex = match.index ?? 0
    rendered += templateContent.slice(lastIndex, matchIndex)

    const expression = rawExpression.trim()
    if (expression === 'CURSOR') {
      cursorOffset = rendered.length
    } else {
      rendered += resolveVariable(expression, context)
    }

    lastIndex = matchIndex + token.length
  }

  rendered += templateContent.slice(lastIndex)
  return { content: rendered, cursorOffset }
}

function isAutoVariable(expression: string): boolean {
  return AUTO_VARIABLES.has(expression) || expression.startsWith('date:')
}

function labelFromVariableName(name: string): string {
  const labels: Record<string, string> = {
    title: '文档标题',
    bookTitle: '书名',
    rating: '评分',
  }
  return labels[name] ?? name
}

export function extractUserInputVariables(templateContent: string): TemplateVariable[] {
  const variables = new Map<string, TemplateVariable>()

  for (const match of templateContent.matchAll(VARIABLE_PATTERN)) {
    const expression = match[1].trim()
    if (isAutoVariable(expression) || variables.has(expression)) {
      continue
    }

    variables.set(expression, {
      name: expression,
      label: labelFromVariableName(expression),
      type: expression === 'rating' ? 'number' : 'text',
      required: false,
    })
  }

  return Array.from(variables.values())
}

export function validateTemplateVariables(templateContent: string): TemplateValidationResult {
  const errors: TemplateValidationResult['errors'] = []
  let cursor = 0

  while (cursor < templateContent.length) {
    const openIndex = templateContent.indexOf('{{', cursor)
    const closeIndex = templateContent.indexOf('}}', cursor)

    if (closeIndex !== -1 && (openIndex === -1 || closeIndex < openIndex)) {
      errors.push({ message: 'Unexpected closing template variable braces.', position: closeIndex })
      cursor = closeIndex + 2
      continue
    }

    if (openIndex === -1) {
      break
    }

    const nextCloseIndex = templateContent.indexOf('}}', openIndex + 2)
    if (nextCloseIndex === -1) {
      errors.push({ message: 'Unclosed template variable braces.', position: openIndex })
      break
    }

    const expression = templateContent.slice(openIndex + 2, nextCloseIndex).trim()
    if (!expression) {
      errors.push({ message: 'Empty template variable expression.', position: openIndex })
    }

    cursor = nextCloseIndex + 2
  }

  return { isValid: errors.length === 0, errors }
}
