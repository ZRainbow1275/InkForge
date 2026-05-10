import type { BooleanOp, FieldFilter, SearchFilterOperator, SearchQuery } from './types'

const FIELD_ALIASES: Record<string, FieldFilter['field']> = {
  tag: 'tags',
  tags: 'tags',
  status: 'status',
  author: 'author',
  source: 'source',
  category: 'category',
  title: 'title',
  content: 'content',
  wordcount: 'wordCount',
  words: 'wordCount',
  created: 'createdAt',
  createdat: 'createdAt',
  updated: 'updatedAt',
  updatedat: 'updatedAt',
}

function scanTokens(input: string): string[] {
  const tokens: string[] = []
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|(\S+)/g
  let match = pattern.exec(input)
  while (match) {
    const quoted = match[1]
    const bare = match[2]
    tokens.push(quoted !== undefined ? '"' + quoted.replace(/\\"/g, '"') + '"' : bare)
    match = pattern.exec(input)
  }
  return tokens
}

function coerceFilterValue(field: FieldFilter['field'], rawValue: string): string | number {
  const value = rawValue.replace(/^"|"$/g, '').trim()
  if (field === 'wordCount') {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : value
  }
  return value
}

function parseFilter(token: string): FieldFilter | null {
  const match = /^([a-zA-Z]+)(:|=|>=|<=|>|<)(.+)$/.exec(token)
  if (!match) return null

  const field = FIELD_ALIASES[match[1].toLowerCase()]
  if (!field) return null

  const rawOperator = match[2]
  const value = coerceFilterValue(field, match[3])
  if (value === '') return null

  const operator = (rawOperator === ':' ? 'contains' : rawOperator) as SearchFilterOperator
  return { field, operator, value }
}

export function parseSearchQuery(raw: string): SearchQuery {
  const terms: string[] = []
  const phrases: string[] = []
  const excludeTerms: string[] = []
  const filters: FieldFilter[] = []
  const warnings: string[] = []
  let rootOp: BooleanOp = 'AND'

  for (const token of scanTokens(raw.trim())) {
    if (!token) continue
    if (token.toUpperCase() === 'OR') {
      rootOp = 'OR'
      continue
    }
    if (token.toUpperCase() === 'AND') {
      rootOp = 'AND'
      continue
    }

    const negated = token.startsWith('-') && token.length > 1
    const normalizedToken = negated ? token.slice(1) : token
    const filter = parseFilter(normalizedToken)
    if (filter) {
      filters.push(filter)
      continue
    }

    if (/^[a-zA-Z]+[:=><]/.test(normalizedToken)) {
      warnings.push('ignored-filter:' + normalizedToken)
      continue
    }

    const phrase = normalizedToken.startsWith('"') && normalizedToken.endsWith('"')
      ? normalizedToken.slice(1, -1).trim()
      : ''

    if (phrase) {
      if (negated) excludeTerms.push(phrase)
      else phrases.push(phrase)
      continue
    }

    const term = normalizedToken.trim()
    if (!term) continue
    if (negated) excludeTerms.push(term)
    else terms.push(term)
  }

  return { raw, terms, phrases, excludeTerms, filters, rootOp, warnings }
}

