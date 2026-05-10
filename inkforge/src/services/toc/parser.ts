import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { TocHeadingSchema, TocParseOptionsSchema, type NormalizedTocParseOptions, type TocHeading, type TocHeadingLevel, type TocParseOptions, type TocParseResult } from './types'

interface FlatHeadingSeed {
  level: TocHeadingLevel
  text: string
  pos: number
  line: number | null
}

function isFenceLine(line: string): boolean {
  return /^\s*(```|~~~)/.test(line)
}

export function stripHeadingMarkup(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[\\*_~#>=[\](){}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function createTocSlug(value: string): string {
  const normalized = stripHeadingMarkup(value)
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'section'
}

function uniqueSlug(base: string, used: Map<string, number>): string {
  const count = used.get(base) ?? 0
  used.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}

export function createTocHeadingId(text: string, pos: number, used: Map<string, number> = new Map()): { id: string; slug: string } {
  const slug = uniqueSlug(createTocSlug(text), used)
  return { id: `heading-${slug}-${pos}`, slug }
}

function parseMarkdownHeadingLine(line: string): { level: TocHeadingLevel; text: string } | null {
  const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
  if (!match) return null
  return { level: match[1].length as TocHeadingLevel, text: stripHeadingMarkup(match[2]) }
}

export function extractMarkdownHeadingSeeds(markdown: string, options: TocParseOptions = {}): FlatHeadingSeed[] {
  const parsedOptions = TocParseOptionsSchema.parse(options)
  const seeds: FlatHeadingSeed[] = []
  let inFence = false
  let offset = 0
  const lines = markdown.split('\n')

  lines.forEach((line, index) => {
    if (isFenceLine(line)) {
      inFence = !inFence
      offset += line.length + 1
      return
    }

    if (!inFence) {
      const heading = parseMarkdownHeadingLine(line)
      if (heading && heading.level <= parsedOptions.maxDepth && (parsedOptions.includeEmptyHeadings || heading.text.length > 0)) {
        seeds.push({ level: heading.level, text: heading.text, pos: offset, line: index + 1 })
      }
    }
    offset += line.length + 1
  })

  return seeds
}

export function extractProseMirrorHeadingSeeds(doc: ProseMirrorNode, options: TocParseOptions = {}): FlatHeadingSeed[] {
  const parsedOptions = TocParseOptionsSchema.parse(options)
  const seeds: FlatHeadingSeed[] = []

  doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return
    const rawLevel = Number(node.attrs.level)
    if (!Number.isInteger(rawLevel) || rawLevel < 1 || rawLevel > 6) return
    const level = rawLevel as TocHeadingLevel
    if (level > parsedOptions.maxDepth) return
    const text = node.textContent.trim()
    if (!parsedOptions.includeEmptyHeadings && text.length === 0) return
    seeds.push({ level, text, pos, line: null })
  })

  return seeds
}

function buildFlatHeadings(seeds: FlatHeadingSeed[], options: NormalizedTocParseOptions): TocHeading[] {
  const usedSlugs = new Map<string, number>()
  const counters: number[] = []
  const flat = seeds.map((seed) => {
    const { id, slug } = createTocHeadingId(seed.text, seed.pos, usedSlugs)
    counters[seed.level - 1] = (counters[seed.level - 1] ?? 0) + 1
    for (let index = seed.level; index < counters.length; index++) counters[index] = 0
    const currentCounters = counters.slice(0, seed.level).filter(value => value > 0)
    const numbering = options.numbering === 'none'
      ? null
      : options.numbering === 'decimal'
        ? String(counters[seed.level - 1])
        : currentCounters.join('.')

    return TocHeadingSchema.parse({
      id,
      domId: slug,
      slug,
      level: seed.level,
      depth: 0,
      text: seed.text,
      pos: seed.pos,
      line: seed.line,
      numbering,
      children: [],
    })
  })
  return flat
}

function cloneHeadingWithChildren(heading: TocHeading, depth: number): TocHeading {
  return { ...heading, depth, children: [] }
}

export function buildTocTree(flatHeadings: TocHeading[]): TocHeading[] {
  const roots: TocHeading[] = []
  const stack: TocHeading[] = []

  for (const heading of flatHeadings) {
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop()
    }

    const node = cloneHeadingWithChildren(heading, stack.length)
    if (stack.length === 0) {
      roots.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }
    stack.push(node)
  }

  return roots
}

export function flattenTocTree(tree: TocHeading[]): TocHeading[] {
  return tree.flatMap(node => [node, ...flattenTocTree(node.children)])
}

export function parseTocFromMarkdown(markdown: string, options: TocParseOptions = {}): TocParseResult {
  const parsedOptions = TocParseOptionsSchema.parse(options)
  const flat = buildFlatHeadings(extractMarkdownHeadingSeeds(markdown, parsedOptions), parsedOptions)
  return { flat, tree: buildTocTree(flat), options: parsedOptions, parsedAt: Date.now() }
}

export function parseTocFromProseMirrorDoc(doc: ProseMirrorNode, options: TocParseOptions = {}): TocParseResult {
  const parsedOptions = TocParseOptionsSchema.parse(options)
  const flat = buildFlatHeadings(extractProseMirrorHeadingSeeds(doc, parsedOptions), parsedOptions)
  return { flat, tree: buildTocTree(flat), options: parsedOptions, parsedAt: Date.now() }
}

export function findActiveHeadingByPosition(flatHeadings: TocHeading[], position: number): TocHeading | null {
  let active: TocHeading | null = null
  for (const heading of flatHeadings) {
    if (heading.pos <= position) {
      active = heading
    } else {
      break
    }
  }
  return active
}
