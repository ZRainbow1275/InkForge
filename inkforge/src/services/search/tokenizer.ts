const CJK_RANGE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u
const BACKTICK = String.fromCharCode(96)
const MARKDOWN_TOKEN_PATTERN = new RegExp(
  BACKTICK + '{3}[\\s\\S]*?' + BACKTICK + '{3}'
    + '|' + BACKTICK + '([^' + BACKTICK + ']+)' + BACKTICK
    + '|!\\[[^\\]]*\\]\\([^)]*\\)'
    + '|\\[([^\\]]+)\\]\\([^)]*\\)'
    + '|[#>*_~\\-|]+'
    + '|<[^>]+>'
    + '|&[a-z]+;',
  'gi',
)

function isCjkChar(char: string): boolean {
  return CJK_RANGE.test(char)
}

function pushLatinTokens(tokens: string[], value: string): void {
  for (const token of value.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)) {
    tokens.push(token)
  }
}

export function tokenizeSearchText(text: string): string[] {
  const tokens: string[] = []
  let latinBuffer = ''
  const cjkBuffer: string[] = []

  function flushLatin(): void {
    if (!latinBuffer) return
    pushLatinTokens(tokens, latinBuffer)
    latinBuffer = ''
  }

  function flushCjk(): void {
    if (cjkBuffer.length === 0) return
    tokens.push(...cjkBuffer)
    for (let index = 0; index < cjkBuffer.length - 1; index += 1) {
      tokens.push(cjkBuffer[index] + cjkBuffer[index + 1])
    }
    cjkBuffer.length = 0
  }

  for (const char of text) {
    if (isCjkChar(char)) {
      flushLatin()
      cjkBuffer.push(char)
      continue
    }

    flushCjk()
    latinBuffer += char
  }

  flushLatin()
  flushCjk()
  return tokens
}

export function normalizeSearchTerm(term: string): string | false {
  const value = term.trim().toLowerCase()
  return value.length > 0 ? value : false
}

export function stripSearchMarkup(value: string): string {
  return value
    .replace(/---[\s\S]*?---/, ' ')
    .replace(MARKDOWN_TOKEN_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function countSearchWords(value: string): number {
  return tokenizeSearchText(stripSearchMarkup(value)).length
}

