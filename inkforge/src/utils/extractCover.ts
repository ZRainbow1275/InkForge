import type { Article } from '@/types'

export type CoverKind = 'image' | 'placeholder'

export interface CoverInfo {
  kind: CoverKind
  url?: string
  initial: string
  background: string
}

const PLACEHOLDER_PALETTE: Array<[string, string]> = [
  ['#FFEBEE', '#D32F2F'],
  ['#E3F2FD', '#1565C0'],
  ['#E8F5E9', '#2E7D32'],
  ['#FFF3E0', '#EF6C00'],
  ['#F3E5F5', '#6A1B9A'],
  ['#E0F2F1', '#00838F'],
  ['#FFFDE7', '#A15C00'],
]

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/
const FRONTMATTER_COVER_RE = /^\s*cover\s*:\s*["']?([^"'\n]+?)["']?\s*$/m
const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/
const HTML_IMAGE_RE = /<img[^>]+src=["']([^"']+)["']/i

function pickPaletteIndex(seed: string): number {
  if (!seed) return 0
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash % PLACEHOLDER_PALETTE.length
}

function getInitial(article: Article): string {
  const title = (article.title ?? '').trim()
  if (!title) return '稿'
  return Array.from(title)[0] ?? '稿'
}

function buildPlaceholder(article: Article): CoverInfo {
  const seed = article.id ?? article.title ?? 'inkforge'
  const [bg, fg] = PLACEHOLDER_PALETTE[pickPaletteIndex(String(seed))]
  return {
    kind: 'placeholder',
    initial: getInitial(article),
    background: `linear-gradient(135deg, ${bg} 0%, ${fg}26 100%)`,
  }
}

function readFrontmatterCover(raw: string): string | null {
  const match = raw.match(FRONTMATTER_RE)
  if (!match) return null
  const block = match[1]
  const cover = block.match(FRONTMATTER_COVER_RE)
  if (!cover) return null
  const url = cover[1].trim()
  return url ? url : null
}

function readBodyImage(raw: string): string | null {
  const md = raw.match(MARKDOWN_IMAGE_RE)
  if (md && md[1]) return md[1].trim()
  const html = raw.match(HTML_IMAGE_RE)
  if (html && html[1]) return html[1].trim()
  return null
}

export function extractCover(article: Article): CoverInfo {
  const placeholder = buildPlaceholder(article)
  const raw = article.rawContent ?? ''
  if (!raw) return placeholder

  const fromFrontmatter = readFrontmatterCover(raw)
  if (fromFrontmatter) {
    return { ...placeholder, kind: 'image', url: fromFrontmatter }
  }

  const fromBody = readBodyImage(raw)
  if (fromBody) {
    return { ...placeholder, kind: 'image', url: fromBody }
  }

  return placeholder
}
