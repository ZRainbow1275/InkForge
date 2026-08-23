import { resolveAssetSnapshot } from '@/services/asset-pipeline/snapshot'
import type { LocalDeliveryFileInput } from '@/services/desktop'
import { renderMarkdownWithLazyOptionalEnhancements } from '@/services/rendering/lazy-optional-renderer'
import { extractInkforgeAssetId, INKFORGE_ASSET_SCHEME } from '@/utils/asset-url'

export type LocalDeliveryTarget = 'folder' | 'blog'
export type LocalDeliveryFormat = 'markdown' | 'html'

export interface LocalDeliveryBundleOptions {
  target: LocalDeliveryTarget
  format: LocalDeliveryFormat
  title: string
  markdown: string
  exportedAt?: Date
}

export interface LocalDeliveryBundle {
  target: LocalDeliveryTarget
  format: LocalDeliveryFormat
  slug: string
  entryPath: string
  files: LocalDeliveryFileInput[]
}

interface MarkdownParts {
  frontmatter: string | null
  body: string
}

const ASSET_SOURCE_PATTERN = /inkforge-asset:\/\/[^\s)'"<>{}\]]+/gu
const WINDOWS_RESERVED_NAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu

export function createLocalDeliverySlug(title: string): string {
  const normalized = title
    .normalize('NFKC')
    .trim()
    .replace(/[\p{Cc}<>:"/\\|?*]+/gu, '-')
    .replace(/[\s_-]+/gu, '-')
    .replace(/^[.\s-]+|[.\s-]+$/gu, '')
    .slice(0, 80)
    .toLocaleLowerCase('en-US')

  if (!normalized) return 'untitled'
  return WINDOWS_RESERVED_NAME_PATTERN.test(normalized) ? `article-${normalized}` : normalized
}

function splitMarkdownFrontmatter(markdown: string): MarkdownParts {
  const opening = markdown.match(/^---[ \t]*(?:\r?\n)/u)
  if (!opening) return { frontmatter: null, body: markdown }

  let cursor = opening[0].length
  while (cursor <= markdown.length) {
    const nextLf = markdown.indexOf('\n', cursor)
    const lineEnd = nextLf === -1 ? markdown.length : nextLf + 1
    const line = markdown.slice(cursor, nextLf === -1 ? markdown.length : nextLf).replace(/\r$/u, '')
    if (line.trim() === '---') {
      let bodyStart = lineEnd
      if (markdown.startsWith('\r\n', bodyStart)) bodyStart += 2
      else if (markdown.startsWith('\n', bodyStart)) bodyStart += 1
      return {
        frontmatter: markdown.slice(0, nextLf === -1 ? markdown.length : nextLf).replace(/\r?\n$/u, ''),
        body: markdown.slice(bodyStart),
      }
    }
    if (nextLf === -1) break
    cursor = lineEnd
  }

  return { frontmatter: null, body: markdown }
}

function buildBlogFrontmatter(title: string, exportedAt: Date): string {
  return [
    '---',
    `title: ${JSON.stringify(title.trim() || '未命名文章')}`,
    `date: ${JSON.stringify(exportedAt.toISOString())}`,
    'draft: false',
    '---',
  ].join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
}

function buildHtmlDocument(title: string, bodyHtml: string): string {
  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(title.trim() || '未命名文章')}</title>`,
    '</head>',
    '<body>',
    `  <main>${bodyHtml}</main>`,
    '</body>',
    '</html>',
  ].join('\n')
}

function dataUrlBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex < 0 || !/;base64$/iu.test(dataUrl.slice(0, commaIndex))) {
    throw new Error('本地资产不是可写入的 Base64 数据。')
  }
  return dataUrl.slice(commaIndex + 1)
}

async function materializeAssets(
  markdown: string,
  target: LocalDeliveryTarget,
  slug: string,
): Promise<{ markdown: string; files: LocalDeliveryFileInput[] }> {
  const sources = [...new Set(markdown.match(ASSET_SOURCE_PATTERN) ?? [])]
  if (sources.length === 0) return { markdown, files: [] }

  let rewritten = markdown
  const files: LocalDeliveryFileInput[] = []

  for (const source of sources) {
    const assetId = extractInkforgeAssetId(source)
    if (!assetId) throw new Error(`无法识别本地资产引用：${source}`)

    const [relative, inline] = await Promise.all([
      resolveAssetSnapshot(assetId, 'local-relative'),
      resolveAssetSnapshot(assetId, 'inline-base64'),
    ])
    if (relative.status !== 'local-relative' || !relative.relativePath) {
      throw new Error(`本地资产不存在或无法生成相对路径：${assetId}`)
    }
    if (inline.status !== 'inline-base64' || !inline.dataUrl) {
      throw new Error(`本地资产无法读取：${assetId}`)
    }

    const fileName = relative.relativePath.split('/').pop()
    if (!fileName) throw new Error(`本地资产文件名无效：${assetId}`)
    const relativePath = target === 'blog'
      ? `assets/${slug}/${fileName}`
      : `${slug}.assets/${fileName}`

    rewritten = rewritten.split(source).join(relativePath)
    files.push({ relativePath, base64: dataUrlBase64(inline.dataUrl) })
  }

  return { markdown: rewritten, files }
}

export async function buildLocalDeliveryBundle(options: LocalDeliveryBundleOptions): Promise<LocalDeliveryBundle> {
  if (!options.markdown.trim()) throw new Error('当前文稿为空，无法写入本地目录。')

  const title = options.title.trim() || '未命名文章'
  const slug = createLocalDeliverySlug(title)
  const materialized = await materializeAssets(options.markdown, options.target, slug)
  const parts = splitMarkdownFrontmatter(materialized.markdown)
  const frontmatter = options.target === 'blog'
    ? (parts.frontmatter ?? buildBlogFrontmatter(title, options.exportedAt ?? new Date()))
    : parts.frontmatter
  const extension = options.format === 'markdown' ? 'md' : 'html'
  const entryPath = `${slug}.${extension}`

  let content: string
  if (options.format === 'markdown') {
    content = frontmatter ? `${frontmatter}\n\n${parts.body}` : parts.body
  } else {
    const html = buildHtmlDocument(title, await renderMarkdownWithLazyOptionalEnhancements(parts.body))
    content = frontmatter ? `${frontmatter}\n\n${html}` : html
  }

  return {
    target: options.target,
    format: options.format,
    slug,
    entryPath,
    files: [{ relativePath: entryPath, content }, ...materialized.files],
  }
}

export function containsInkforgeAssetReference(content: string): boolean {
  return content.includes(INKFORGE_ASSET_SCHEME)
}
