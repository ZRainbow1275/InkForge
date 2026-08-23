/**
 * Preview-only trust boundary for Markdown/raw HTML.
 *
 * Registered InkForge decorators run after this function. This is intentional:
 * user-authored SVG/data-ink-svg must never be mistaken for a trusted module,
 * while source-owned decorators may still emit their allowlisted SVG/SMIL.
 */
import {
  sanitizeHTMLString,
  type HtmlSanitizerOptions,
} from '@/services/security/html-sanitizer'

export interface UntrustedPreviewHtmlOptions {
  additionalAttrs?: readonly string[]
}

const DROP_SUBTREE_TAGS = [
  'script',
  'style',
  'svg',
  'math',
  'foreignobject',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'template',
] as const

const STRIP_TAG_ONLY_TAGS = [
  'form',
  'button',
  'input',
  'textarea',
  'select',
  'option',
  'link',
  'meta',
  'base',
  // Remove orphaned SVG nodes left by malformed/unclosed input.
  'animate',
  'animatemotion',
  'animatetransform',
  'circle',
  'clippath',
  'defs',
  'desc',
  'ellipse',
  'filter',
  'g',
  'image',
  'line',
  'lineargradient',
  'marker',
  'mask',
  'metadata',
  'mpath',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialgradient',
  'rect',
  'set',
  'stop',
  'symbol',
  'text',
  'textpath',
  'tspan',
  'use',
  'view',
] as const

const URI_ATTRS = new Set([
  'action',
  'cite',
  'formaction',
  'href',
  'poster',
  'src',
  'xlink:href',
])

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripTagSubtree(html: string, tagName: string): string {
  const escaped = escapeRegExp(tagName)
  const pairedTag = new RegExp(
    `<${escaped}\\b[^>]*>[\\s\\S]*?<\\/${escaped}\\s*>`,
    'gi',
  )
  let result = html

  // A bounded loop also removes simple nesting without risking an unbounded
  // parser loop on malformed input.
  for (let pass = 0; pass < 8; pass += 1) {
    const next = result.replace(pairedTag, '')
    if (next === result) break
    result = next
  }

  return result
    .replace(new RegExp(`<${escaped}\\b[^>]*\\/?>`, 'gi'), '')
    .replace(new RegExp(`<\\/${escaped}\\s*>`, 'gi'), '')
}

function stripTagOnly(html: string, tagName: string): string {
  const escaped = escapeRegExp(tagName)
  return html
    .replace(new RegExp(`<${escaped}\\b[^>]*\\/?>`, 'gi'), '')
    .replace(new RegExp(`<\\/${escaped}\\s*>`, 'gi'), '')
}

function findTagEnd(html: string, start: number): number {
  let quote = ''
  for (let cursor = start + 1; cursor < html.length; cursor += 1) {
    const char = html[cursor]
    if (quote) {
      if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '>') return cursor
  }
  return -1
}

function decodeProtocolCharacters(value: string): string {
  return value
    .replace(/&#(\d+);?/g, (_match, decimal: string) => {
      const codePoint = Number.parseInt(decimal, 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : ''
    })
    .replace(/&#x([0-9a-f]+);?/gi, (_match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : ''
    })
    .replace(/&colon;?/gi, ':')
}

function isActiveUri(value: string): boolean {
  let normalized = ''
  for (const char of decodeProtocolCharacters(value)) {
    const code = char.charCodeAt(0)
    if (code > 32 && (code < 127 || code > 159)) {
      normalized += char
    }
  }
  normalized = normalized.toLowerCase()

  return /^(?:javascript|vbscript):/.test(normalized)
    || /^data:(?:text\/html|application\/(?:xhtml\+xml|xml)|image\/svg\+xml)/.test(normalized)
}

function isAttributeNameChar(char: string): boolean {
  return /[a-z0-9_.:-]/i.test(char)
}

function sanitizeOpeningTag(tag: string): string {
  if (
    tag.startsWith('</')
    || tag.startsWith('<!')
    || tag.startsWith('<?')
  ) {
    return tag.startsWith('</') ? tag : ''
  }

  let cursor = 1
  while (cursor < tag.length && /\s/.test(tag[cursor])) cursor += 1
  const nameStart = cursor
  while (cursor < tag.length && /[a-z0-9:-]/i.test(tag[cursor])) cursor += 1
  if (nameStart === cursor) return ''

  const tagName = tag.slice(nameStart, cursor).toLowerCase()
  let result = tag.slice(0, cursor)
  const keptAttributes = new Set<string>()
  const imageDimensions = new Map<'width' | 'height', string>()

  while (cursor < tag.length) {
    while (cursor < tag.length && /\s/.test(tag[cursor])) cursor += 1
    if (cursor >= tag.length || tag[cursor] === '>') break
    if (tag[cursor] === '/' && tag[cursor + 1] === '>') {
      result += '/'
      break
    }

    const attrStart = cursor
    while (cursor < tag.length && isAttributeNameChar(tag[cursor])) cursor += 1
    if (attrStart === cursor) {
      cursor += 1
      continue
    }

    const attrName = tag.slice(attrStart, cursor).toLowerCase()
    while (cursor < tag.length && /\s/.test(tag[cursor])) cursor += 1

    let attrValue = ''
    if (tag[cursor] === '=') {
      cursor += 1
      while (cursor < tag.length && /\s/.test(tag[cursor])) cursor += 1
      const quote = tag[cursor]
      if (quote === '"' || quote === "'") {
        cursor += 1
        const valueStart = cursor
        while (cursor < tag.length && tag[cursor] !== quote) cursor += 1
        attrValue = tag.slice(valueStart, cursor)
        if (tag[cursor] === quote) cursor += 1
      } else {
        const valueStart = cursor
        while (
          cursor < tag.length
          && !/\s/.test(tag[cursor])
          && tag[cursor] !== '>'
        ) {
          cursor += 1
        }
        attrValue = tag.slice(valueStart, cursor)
      }
    }

    const unsafeAttribute = attrName === 'style'
      || attrName === 'srcdoc'
      || attrName.startsWith('on')
      || attrName.startsWith('data-')
      || (URI_ATTRS.has(attrName) && isActiveUri(attrValue))

    if (tagName === 'img' && attrName === 'style') {
      for (const match of attrValue.matchAll(/(?:^|;)\s*(width|height)\s*:\s*(\d{1,6})px\s*(?=;|$)/gi)) {
        imageDimensions.set(match[1].toLowerCase() as 'width' | 'height', match[2])
      }
    }

    if (!unsafeAttribute) {
      result += ` ${tag.slice(attrStart, cursor)}`
      keptAttributes.add(attrName)
    }
  }

  if (tagName === 'img') {
    for (const dimension of ['width', 'height'] as const) {
      const value = imageDimensions.get(dimension)
      if (value && !keptAttributes.has(dimension)) {
        result += ` ${dimension}="${value}"`
      }
    }
  }

  return `${result}>`
}

function stripActivePreviewMarkup(html: string): string {
  let result = html

  for (const tagName of DROP_SUBTREE_TAGS) {
    result = stripTagSubtree(result, tagName)
  }
  for (const tagName of STRIP_TAG_ONLY_TAGS) {
    result = stripTagOnly(result, tagName)
  }

  let output = ''
  let cursor = 0
  while (cursor < result.length) {
    const tagStart = result.indexOf('<', cursor)
    if (tagStart === -1) {
      output += result.slice(cursor)
      break
    }

    output += result.slice(cursor, tagStart)
    const tagEnd = findTagEnd(result, tagStart)
    if (tagEnd === -1) {
      // A malformed trailing tag is discarded rather than rendered as markup.
      break
    }

    output += sanitizeOpeningTag(result.slice(tagStart, tagEnd + 1))
    cursor = tagEnd + 1
  }

  return output
}

function hasBrowserDom(): boolean {
  return typeof window !== 'undefined'
    && typeof document !== 'undefined'
    && typeof document.createElement === 'function'
}

export function sanitizeUntrustedPreviewHtml(
  html: string,
  options: UntrustedPreviewHtmlOptions = {},
): string {
  const preStripped = stripActivePreviewMarkup(html)
  if (!hasBrowserDom()) return preStripped

  const sanitizerOptions: HtmlSanitizerOptions = {
    mode: 'custom',
    allowExternalLinks: true,
    allowDataAttributes: false,
    allowMediaElements: true,
    allowStyles: false,
    additionalAttrs: [...(options.additionalAttrs ?? [])],
  }
  const domSanitized = sanitizeHTMLString(preStripped, sanitizerOptions)

  // Keep a deterministic final safety net because the DOM implementation
  // differs between Vitest, WebView2 and browser runtimes.
  return stripActivePreviewMarkup(domSanitized)
}
