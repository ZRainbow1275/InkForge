import { markdownRenderSanitizer } from '@/services/security'
import { renderMarkdownWithLazyOptionalEnhancements } from '@/services/rendering/lazy-optional-renderer'

import { readMarkdownSource } from './frontmatter'

export const MARKDOWN_CACHE_VERSION = 1

export async function renderMarkdownHtmlCache(markdownSourceOrBody: string): Promise<string> {
    const { body } = readMarkdownSource(markdownSourceOrBody)
    const rendered = await renderMarkdownWithLazyOptionalEnhancements(body)
    return markdownRenderSanitizer.sanitizeString(rendered)
}
