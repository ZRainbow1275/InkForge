import { normalizeImageAlign, normalizeImageLink } from './imageAttrs'
import type { ImageAlign, MarkdownImage, SerializeMarkdownImageOptions } from './types'

const DEFAULT_IMAGE_ALIGN: ImageAlign = 'center'

export function escapeMarkdownImageAlt(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/]/g, '\\]')
}

export function unescapeMarkdownImageAlt(value: string): string {
  return value.replace(/\\]/g, ']').replace(/\\\\/g, '\\')
}

export function serializeMarkdownImage(
  image: MarkdownImage,
  options: SerializeMarkdownImageOptions = {},
): string {
  const src = image.src.trim()
  if (!src) {
    return ''
  }

  const title = image.title?.trim()
  const size = image.width && image.height ? ` =${image.width}x${image.height}` : ''
  const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : ''
  const imageMarkdown = `![${escapeMarkdownImageAlt(image.alt)}](${src}${titlePart}${size})`
  const safeLink = normalizeImageLink(image.link)
  const linked = safeLink ? `[${imageMarkdown}](${safeLink})` : imageMarkdown
  const caption = image.caption.trim() ? `\n*${image.caption.trim()}*` : ''
  const align = normalizeImageAlign(image.align)
  const alignPrefix = options.includeAlignmentComment && align !== DEFAULT_IMAGE_ALIGN
    ? `<!-- align: ${align} -->\n`
    : ''

  return `${alignPrefix}${linked}${caption}`
}

export function appendMarkdownImage(markdown: string, image: MarkdownImage): string {
  const serialized = serializeMarkdownImage(image)
  if (!serialized) {
    return markdown
  }

  const separator = markdown.length === 0 || markdown.endsWith('\n\n')
    ? ''
    : markdown.endsWith('\n') ? '\n' : '\n\n'
  return `${markdown}${separator}${serialized}`
}

export function parseMarkdownImage(markdown: string): MarkdownImage | null {
  let value = markdown.trim()
  const alignMatch = value.match(/^<!--\s*align:\s*(left|center|right|float-left|float-right)\s*-->\s*/i)
  const align = alignMatch ? normalizeImageAlign(alignMatch[1]) : DEFAULT_IMAGE_ALIGN
  if (alignMatch) {
    value = value.slice(alignMatch[0].length).trim()
  }

  const captionMatch = value.match(/\n\*([^\n*][\s\S]*?)\*\s*$/)
  const caption = captionMatch?.[1]?.trim() ?? ''
  if (captionMatch) {
    value = value.slice(0, captionMatch.index).trim()
  }

  const linkedMatch = value.match(/^\[(!\[[\s\S]*\]\([\s\S]*\))\]\(([^)]+)\)$/)
  const link = normalizeImageLink(linkedMatch?.[2]?.trim())
  const imagePart = linkedMatch?.[1] ?? value
  const imageMatch = imagePart.match(/^!\[((?:\\.|[^\]])*)\]\(([^)]*)\)$/)
  if (!imageMatch) {
    return null
  }

  const target = parseMarkdownImageTarget(imageMatch[2])
  if (!target) {
    return null
  }

  return {
    src: target.src,
    alt: unescapeMarkdownImageAlt(imageMatch[1]),
    title: target.title,
    width: target.width,
    height: target.height,
    caption,
    link,
    align,
  }
}

function parseMarkdownImageTarget(target: string): Pick<MarkdownImage, 'src' | 'title' | 'width' | 'height'> | null {
  let value = target.trim()
  if (!value) {
    return null
  }

  const sizeMatch = value.match(/\s=(\d+)x(\d+)\s*$/)
  const width = sizeMatch ? Number(sizeMatch[1]) : null
  const height = sizeMatch ? Number(sizeMatch[2]) : null
  if (sizeMatch) {
    value = value.slice(0, sizeMatch.index).trim()
  }

  const titleMatch = value.match(/\s"((?:\\"|[^"])*)"\s*$/)
  const title = titleMatch ? titleMatch[1].replace(/\\"/g, '"') : null
  if (titleMatch) {
    value = value.slice(0, titleMatch.index).trim()
  }

  return value ? { src: value, title, width, height } : null
}
