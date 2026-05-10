import { BibEntrySchema, type BibAuthorName, type BibEntry } from './types'

function normalizeBibValue(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\{\s+/g, '{')
    .replace(/\s+\}/g, '}')
    .trim()
}

function skipWhitespace(value: string, index: number): number {
  let cursor = index
  while (cursor < value.length && /\s/.test(value[cursor])) cursor += 1
  return cursor
}

function readBalancedValue(value: string, index: number, opener: '{' | '('): { value: string; next: number } {
  const closer = opener === '{' ? '}' : ')'
  let cursor = index + 1
  let depth = 1
  let result = ''

  while (cursor < value.length && depth > 0) {
    const char = value[cursor]
    if (char === '\\') {
      result += char
      if (cursor + 1 < value.length) {
        result += value[cursor + 1]
        cursor += 2
        continue
      }
    }
    if (char === opener) {
      depth += 1
      result += char
      cursor += 1
      continue
    }
    if (char === closer) {
      depth -= 1
      if (depth > 0) result += char
      cursor += 1
      continue
    }
    result += char
    cursor += 1
  }

  return { value: normalizeBibValue(result), next: cursor }
}

function readQuotedValue(value: string, index: number): { value: string; next: number } {
  let cursor = index + 1
  let result = ''

  while (cursor < value.length) {
    const char = value[cursor]
    if (char === '\\' && cursor + 1 < value.length) {
      result += value[cursor + 1]
      cursor += 2
      continue
    }
    if (char === '"') {
      return { value: normalizeBibValue(result), next: cursor + 1 }
    }
    result += char
    cursor += 1
  }

  return { value: normalizeBibValue(result), next: cursor }
}

function readBareValue(value: string, index: number): { value: string; next: number } {
  let cursor = index
  let result = ''
  while (cursor < value.length && value[cursor] !== ',' && value[cursor] !== '}' && value[cursor] !== ')') {
    result += value[cursor]
    cursor += 1
  }
  return { value: normalizeBibValue(result), next: cursor }
}

function readFieldValue(value: string, index: number): { value: string; next: number } {
  const cursor = skipWhitespace(value, index)
  const char = value[cursor]
  if (char === '{' || char === '(') return readBalancedValue(value, cursor, char)
  if (char === '"') return readQuotedValue(value, cursor)
  return readBareValue(value, cursor)
}

function readEntryBody(content: string, openIndex: number, opener: '{' | '('): { body: string; next: number } {
  const closer = opener === '{' ? '}' : ')'
  let cursor = openIndex + 1
  let depth = 1
  let body = ''
  let inQuote = false

  while (cursor < content.length && depth > 0) {
    const char = content[cursor]
    if (char === '\\') {
      body += char
      if (cursor + 1 < content.length) {
        body += content[cursor + 1]
        cursor += 2
        continue
      }
    }
    if (char === '"') {
      inQuote = !inQuote
      body += char
      cursor += 1
      continue
    }
    if (!inQuote && char === opener) {
      depth += 1
      body += char
      cursor += 1
      continue
    }
    if (!inQuote && char === closer) {
      depth -= 1
      if (depth > 0) body += char
      cursor += 1
      continue
    }
    body += char
    cursor += 1
  }

  return { body, next: cursor }
}

function parseEntryFields(body: string): { key: string; fields: Record<string, string> } | null {
  const firstComma = body.indexOf(',')
  if (firstComma === -1) return null

  const key = body.slice(0, firstComma).trim()
  if (!key) return null

  const fields: Record<string, string> = {}
  let cursor = firstComma + 1

  while (cursor < body.length) {
    cursor = skipWhitespace(body, cursor)
    if (body[cursor] === ',') {
      cursor += 1
      continue
    }

    const nameMatch = /^[A-Za-z][A-Za-z0-9_-]*/.exec(body.slice(cursor))
    if (!nameMatch) break
    const name = nameMatch[0].toLowerCase()
    cursor += nameMatch[0].length
    cursor = skipWhitespace(body, cursor)
    if (body[cursor] !== '=') break
    cursor += 1

    const parsed = readFieldValue(body, cursor)
    fields[name] = parsed.value
    cursor = parsed.next

    while (cursor < body.length && body[cursor] !== ',') {
      if (!/\s/.test(body[cursor])) break
      cursor += 1
    }
    if (body[cursor] === ',') cursor += 1
  }

  return { key, fields }
}

export function parseBibTeX(content: string): BibEntry[] {
  const entries: BibEntry[] = []
  let cursor = 0

  while (cursor < content.length) {
    const atIndex = content.indexOf('@', cursor)
    if (atIndex === -1) break

    const typeMatch = /^@\s*([A-Za-z]+)\s*/.exec(content.slice(atIndex))
    if (!typeMatch) {
      cursor = atIndex + 1
      continue
    }

    const rawType = typeMatch[1].toLowerCase()
    const openIndex = atIndex + typeMatch[0].length
    const opener = content[openIndex]
    if (opener !== '{' && opener !== '(') {
      cursor = openIndex + 1
      continue
    }

    const { body, next } = readEntryBody(content, openIndex, opener)
    cursor = next

    if (rawType === 'comment' || rawType === 'preamble' || rawType === 'string') {
      continue
    }

    const parsed = parseEntryFields(body)
    if (!parsed) continue

    const candidate = BibEntrySchema.safeParse({ key: parsed.key, type: rawType, fields: parsed.fields })
    if (candidate.success) entries.push(candidate.data)
  }

  return entries
}

export function parseBibAuthors(value: string | undefined): BibAuthorName[] {
  if (!value) return []
  return value
    .split(/\s+and\s+/i)
    .map(part => part.trim())
    .filter(Boolean)
    .map((original): BibAuthorName => {
      if (original.includes(',')) {
        const [family, ...rest] = original.split(',')
        return {
          original,
          family: family.trim(),
          given: rest.join(',').trim(),
        }
      }
      const pieces = original.split(/\s+/).filter(Boolean)
      if (pieces.length === 1) return { original, family: pieces[0], given: '' }
      return {
        original,
        family: pieces[pieces.length - 1],
        given: pieces.slice(0, -1).join(' '),
      }
    })
}

export function getBibYear(entry: BibEntry): string {
  const explicitYear = entry.fields.year?.match(/\d{4}/)?.[0]
  if (explicitYear) return explicitYear
  const issued = entry.fields.date ?? entry.fields.issued
  return issued?.match(/\d{4}/)?.[0] ?? 'n.d.'
}
