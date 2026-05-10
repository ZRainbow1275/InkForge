import type { Article } from '@/types'

import { MARKDOWN_CACHE_VERSION, renderMarkdownHtmlCache } from './cache'
import { buildFrontmatter, readMarkdownSource, writeMarkdownSource, type FrontmatterMirrorInput } from './frontmatter'
import { sha256Hex } from './hash'

export interface ArticleAuthorityFields {
    markdownSource: string
    htmlCache: string | null
    sourceHash: string
    cacheVersion: number
    cacheGeneratedAt: Date
}

export interface ArticleAuthorityVerification {
    ok: boolean
    errors: string[]
    expectedHash: string
    actualHash: string
}

export interface ArticleAuthorityRepairResult {
    article: Article
    updates: Partial<Article>
    repaired: boolean
}

export function pickArticleAuthorityMirror(article: Pick<Article,
    'title' | 'description' | 'status' | 'tags' | 'categoryId' | 'createdAt' | 'updatedAt' | 'publishedAt'
>): FrontmatterMirrorInput {
    return {
        title: article.title,
        summary: article.description,
        status: article.status,
        tags: article.tags,
        categoryId: article.categoryId,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        publishedAt: article.publishedAt ?? null,
    }
}

export async function buildArticleAuthorityFields(
    body: string,
    mirror: FrontmatterMirrorInput,
    existingMarkdownSource?: string,
): Promise<ArticleAuthorityFields> {
    const parsed = existingMarkdownSource ? readMarkdownSource(existingMarkdownSource) : { frontmatter: {}, body, hasFrontmatter: false }
    const frontmatter = buildFrontmatter(parsed.frontmatter, mirror)
    const markdownSource = writeMarkdownSource(body, frontmatter)
    const htmlCache = await renderMarkdownHtmlCache(body)
    const sourceHash = await sha256Hex(markdownSource)

    return {
        markdownSource,
        htmlCache,
        sourceHash,
        cacheVersion: MARKDOWN_CACHE_VERSION,
        cacheGeneratedAt: new Date(),
    }
}

export async function verifyArticleAuthority(article: Pick<Article, 'markdownSource' | 'sourceHash' | 'htmlCache' | 'cacheVersion'>): Promise<ArticleAuthorityVerification> {
    const markdownSource = article.markdownSource ?? ''
    const actualHash = article.sourceHash ?? ''
    const expectedHash = markdownSource ? await sha256Hex(markdownSource) : ''
    const errors: string[] = []

    if (!markdownSource) errors.push('markdownSource is empty')
    if (!actualHash) errors.push('sourceHash is empty')
    if (expectedHash && actualHash && expectedHash !== actualHash) errors.push('sourceHash does not match markdownSource')
    if (article.htmlCache === undefined) errors.push('htmlCache field is missing')
    if (article.cacheVersion !== MARKDOWN_CACHE_VERSION) errors.push('cacheVersion is stale')

    return {
        ok: errors.length === 0,
        errors,
        expectedHash,
        actualHash,
    }
}

export async function ensureArticleAuthorityFields(article: Article): Promise<ArticleAuthorityRepairResult> {
    const hasSource = typeof article.markdownSource === 'string' && article.markdownSource.length > 0
    const parsed = hasSource ? readMarkdownSource(article.markdownSource) : null
    const body = hasSource ? parsed!.body : article.rawContent ?? ''
    const next = await buildArticleAuthorityFields(body, pickArticleAuthorityMirror(article), hasSource ? article.markdownSource : undefined)

    const updates: Partial<Article> = {}
    if (article.markdownSource !== next.markdownSource) updates.markdownSource = next.markdownSource
    if (article.sourceHash !== next.sourceHash) updates.sourceHash = next.sourceHash
    if (article.htmlCache !== next.htmlCache) updates.htmlCache = next.htmlCache
    if (article.cacheVersion !== next.cacheVersion) updates.cacheVersion = next.cacheVersion
    if (article.markdownSource !== next.markdownSource || article.sourceHash !== next.sourceHash || article.htmlCache !== next.htmlCache || article.cacheVersion !== next.cacheVersion || !article.cacheGeneratedAt) {
        updates.cacheGeneratedAt = next.cacheGeneratedAt
    }
    if (!article.rawContent && body) updates.rawContent = body

    return {
        article: Object.keys(updates).length > 0 ? { ...article, ...updates } : article,
        updates,
        repaired: Object.keys(updates).length > 0,
    }
}
