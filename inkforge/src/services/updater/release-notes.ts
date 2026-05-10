import { marked } from 'marked'
import { sanitizeHTMLMarkdown } from '@/services/security'
import type { RenderedReleaseNotes } from './types'

const ALLOWED_IMAGE_HOSTS = new Set(['github.com', 'raw.githubusercontent.com', 'releases.inkforge.app'])
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

function isAllowedImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return ['https:'].includes(parsed.protocol) && ALLOWED_IMAGE_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

export function stripUnsafeReleaseNoteImages(markdown: string): { markdown: string; strippedImageCount: number } {
  let strippedImageCount = 0
  const cleaned = markdown.replace(MARKDOWN_IMAGE_PATTERN, (full, alt: string, url: string) => {
    if (isAllowedImageUrl(url)) {
      return full
    }

    strippedImageCount += 1
    return alt.trim() ? `[${alt.trim()}]` : ''
  })

  return { markdown: cleaned, strippedImageCount }
}

export async function renderReleaseNotesMarkdown(markdown: string): Promise<RenderedReleaseNotes> {
  const stripped = stripUnsafeReleaseNoteImages(markdown)
  const html = await marked.parse(stripped.markdown, {
    async: false,
    gfm: true,
    breaks: false,
  })

  return {
    html: sanitizeHTMLMarkdown(String(html)),
    strippedImageCount: stripped.strippedImageCount,
  }
}
