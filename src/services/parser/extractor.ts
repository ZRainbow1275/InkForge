/**
 * URL 解析服务 - HTML 内容提取器
 */

import DOMPurify from 'dompurify'
import { PARSER_CONFIG } from '@/constants'
import { HTML_SECURITY } from '@/config/security'
import { logger } from '../error'
import type { ParseResult, JsonLdData } from './types'

/** 描述截断最大长度 */
const DESCRIPTION_MAX_LENGTH = Number(import.meta.env.VITE_PARSE_MAX_DESCRIPTION) || PARSER_CONFIG.DESCRIPTION_MAX_LENGTH

/** 内容截断最大长度 */
const CONTENT_MAX_LENGTH = Number(import.meta.env.VITE_PARSE_MAX_CONTENT) || PARSER_CONFIG.CONTENT_MAX_LENGTH

/** 最大链接提取数量 */
const MAX_LINKS = PARSER_CONFIG.MAX_LINKS

/** 最大图片提取数量 */
const MAX_IMAGES = PARSER_CONFIG.MAX_IMAGES

/**
 * 从 DOMPurify 返回的 Node 中安全提取 Document
 */
function getDocumentFromNode(node: Node): Document {
    if (node.nodeType === Node.DOCUMENT_NODE) {
        return node as Document
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element
        if (element.ownerDocument) {
            return element.ownerDocument
        }
    }
    const doc = document.implementation.createHTMLDocument('')
    doc.body.appendChild(doc.importNode(node, true))
    return doc
}

/**
 * 提取标题
 */
function extractTitle(doc: Document): string {
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
    if (ogTitle) return ogTitle.trim()

    const twitterTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
    if (twitterTitle) return twitterTitle.trim()

    const h1 = doc.querySelector('article h1, .article-title, .post-title, h1')?.textContent
    if (h1) return h1.trim()

    const title = doc.querySelector('title')?.textContent
    if (title) return title.split(' - ')[0].split(' | ')[0].trim()

    return '无标题'
}

/**
 * 提取描述
 */
function extractDescription(doc: Document): string {
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
    if (ogDesc) return ogDesc.trim()

    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')
    if (metaDesc) return metaDesc.trim()

    const twitterDesc = doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content')
    if (twitterDesc) return twitterDesc.trim()

    const firstP = doc.querySelector('article p, .article-content p, .post-content p')?.textContent
    if (firstP) return firstP.trim().slice(0, DESCRIPTION_MAX_LENGTH)

    return ''
}

/**
 * 提取作者
 */
function extractAuthors(doc: Document): string[] {
    const authors: string[] = []

    const metaAuthor = doc.querySelector('meta[name="author"]')?.getAttribute('content')
    if (metaAuthor) authors.push(metaAuthor.trim())

    const articleAuthor = doc.querySelector('.author, .byline, [rel="author"]')?.textContent
    if (articleAuthor) authors.push(articleAuthor.trim())

    const jsonLd = doc.querySelector('script[type="application/ld+json"]')?.textContent
    if (jsonLd) {
        try {
            const data = JSON.parse(jsonLd) as JsonLdData
            if (data.author && typeof data.author === 'object' && 'name' in data.author && data.author.name) {
                authors.push(data.author.name)
            } else if (Array.isArray(data.author)) {
                data.author.forEach((a) => {
                    if (a.name) authors.push(a.name)
                })
            }
        } catch (err) {
            logger.debug('JSON-LD 作者解析失败', { error: err instanceof Error ? err.message : String(err) })
        }
    }

    return [...new Set(authors)]
}

/**
 * 提取发布时间
 */
function extractPublishedDate(doc: Document): Date | undefined {
    const publishedTime = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content')
    if (publishedTime) return new Date(publishedTime)

    const timeEl = doc.querySelector('time[datetime]')?.getAttribute('datetime')
    if (timeEl) return new Date(timeEl)

    const jsonLd = doc.querySelector('script[type="application/ld+json"]')?.textContent
    if (jsonLd) {
        try {
            const data = JSON.parse(jsonLd) as JsonLdData
            if (data.datePublished) return new Date(data.datePublished)
        } catch (err) {
            logger.debug('JSON-LD 日期解析失败', { error: err instanceof Error ? err.message : String(err) })
        }
    }

    return undefined
}

/**
 * 提取正文内容
 */
function extractContent(doc: Document): string {
    const selectors = [
        'article',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.content',
        'main',
        '#content'
    ]

    let contentEl: Element | null = null
    for (const selector of selectors) {
        contentEl = doc.querySelector(selector)
        if (contentEl) {
            logger.debug('通过选择器找到内容', { selector })
            break
        }
    }

    if (!contentEl) {
        if ('body' in doc && doc.body) {
            contentEl = doc.body
            logger.debug('回退到 doc.body')
        } else if (doc instanceof Element) {
            contentEl = doc
            logger.debug('回退到 doc 根元素')
        }
    }

    if (!contentEl) {
        logger.warn('未找到内容元素')
        return ''
    }

    if (typeof contentEl.cloneNode !== 'function') {
        logger.error('contentEl 不是有效的 Node', new Error('Invalid Node'))
        return ''
    }

    const removeSelectors = [
        'script', 'style', 'nav', 'header', 'footer', 'aside',
        '.comments', '.sidebar', '.advertisement', '.ad', '.share',
        '[role="navigation"]', '[role="banner"]', '[role="complementary"]'
    ]

    const clone = contentEl.cloneNode(true) as Element
    removeSelectors.forEach(selector => {
        clone.querySelectorAll(selector).forEach(el => el.remove())
    })

    const result: string[] = []

    clone.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, ul, ol, pre, code').forEach(el => {
        const tag = el.tagName.toLowerCase()
        const text = el.textContent?.trim()
        if (text) {
            result.push(`<${tag}>${text}</${tag}>`)
        }
    })

    return result.join('\n') || clone.textContent?.slice(0, CONTENT_MAX_LENGTH) || ''
}

/**
 * 提取链接
 */
function extractLinks(doc: Document, baseUrl: string): string[] {
    const links: string[] = []
    const base = new URL(baseUrl)

    doc.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href')
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return

        try {
            const url = new URL(href, base)
            if (url.protocol === 'http:' || url.protocol === 'https:') {
                links.push(url.href)
            }
        } catch {
            // 无效URL静默跳过
        }
    })

    return [...new Set(links)].slice(0, MAX_LINKS)
}

/**
 * 提取图片
 */
function extractImages(doc: Document, baseUrl: string): string[] {
    const images: string[] = []
    const base = new URL(baseUrl)

    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
    if (ogImage) images.push(ogImage)

    doc.querySelectorAll('article img, .content img, .post-content img').forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src')
        if (src) {
            try {
                const url = new URL(src, base)
                images.push(url.href)
            } catch {
                // 无效图片URL静默跳过
            }
        }
    })

    return [...new Set(images)].slice(0, MAX_IMAGES)
}

/**
 * 提取来源名称
 */
function extractSourceName(doc: Document, url: string): string {
    const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')
    if (ogSiteName) return ogSiteName.trim()

    try {
        return new URL(url).hostname.replace('www.', '')
    } catch {
        return url.slice(0, 30)
    }
}

/**
 * 解析 HTML 提取结构化数据
 */
export function parseHtml(html: string, url: string): ParseResult {
    const cleanNode = DOMPurify.sanitize(html, {
        WHOLE_DOCUMENT: true,
        RETURN_DOM: true,
        ALLOWED_TAGS: [...HTML_SECURITY.SAFE_TAGS],
        ALLOWED_ATTR: [...HTML_SECURITY.SAFE_ATTRS],
        ALLOW_DATA_ATTR: true,
        ALLOW_ARIA_ATTR: true
    })

    const doc = getDocumentFromNode(cleanNode)

    const title = extractTitle(doc) || new URL(url).pathname.slice(0, 50)
    const description = extractDescription(doc)
    const authors = extractAuthors(doc)
    const publishedAt = extractPublishedDate(doc)
    const rawContent = extractContent(doc)
    const links = extractLinks(doc, url)
    const images = extractImages(doc, url)
    const sourceName = extractSourceName(doc, url)

    return {
        title,
        description,
        authors,
        publishedAt,
        rawContent,
        links,
        images,
        sourceName
    }
}

/**
 * 估算内容质量分数 (1-10)
 */
export function calculateScore(result: ParseResult): number {
    let score = 5.0

    if (result.title.length > 10 && result.title.length < 100) score += 1
    if (result.description.length > 50) score += 1
    if (result.authors.length > 0) score += 0.5
    if (result.publishedAt) score += 0.5
    if (result.rawContent.length > 500) score += 1
    if (result.rawContent.length > 2000) score += 0.5
    if (result.images.length > 0) score += 0.5

    return Math.min(10, Math.round(score * 10) / 10)
}
