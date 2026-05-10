import type { Article } from '@/types'
import { articleRepository } from '@/services/repository'
import { ARTICLE_STATUS } from '@/constants'
import { extractWikiLinks } from './parser'
import { wikiLinkRepository, type WikiLinkRepository } from './repository'
import {
  WIKI_LINK_INDEX_VERSION,
  type BacklinkRecord,
  type WikiLinkArticleSearchItem,
  type WikiLinkOccurrence,
  type WikiLinkRebuildAllResult,
  type WikiLinkRebuildResult,
} from './types'

export interface WikiLinkArticleRepository {
  findAllOrderedByDate(): Promise<Article[]>
  findById(id: string): Promise<Article | undefined>
}

function articleContent(article: Article): string {
  return article.markdownSource || article.rawContent || ''
}

function articleTimestamp(value: Date | string | number | null | undefined): number {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function stableHash(input: string): string {
  let hash = 2166136261
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase()
}

function subsequenceScore(query: string, target: string): number | null {
  let cursor = 0
  let first = -1
  let last = -1
  for (const char of query) {
    const found = target.indexOf(char, cursor)
    if (found === -1) return null
    if (first === -1) first = found
    last = found
    cursor = found + 1
  }
  return 0.45 + (last - first) / Math.max(target.length, 1) / 5
}

function scoreArticle(query: string, article: Article): number | null {
  const title = normalizeSearchText(article.title)
  if (!query) return 1
  if (title === query) return 0
  if (title.startsWith(query)) return 0.05
  const includesAt = title.indexOf(query)
  if (includesAt >= 0) return 0.2 + includesAt / Math.max(title.length, 1) / 10
  return subsequenceScore(query, title)
}

export class WikiLinkService {
  constructor(
    private readonly backlinks: WikiLinkRepository = wikiLinkRepository,
    private readonly articles: WikiLinkArticleRepository = articleRepository,
  ) {}

  async searchArticles(query: string, limit = 8): Promise<WikiLinkArticleSearchItem[]> {
    const normalizedQuery = normalizeSearchText(query)
    const allArticles = await this.articles.findAllOrderedByDate()
    return allArticles
      .filter(article => article.status !== ARTICLE_STATUS.TRASHED)
      .map(article => {
        const score = scoreArticle(normalizedQuery, article)
        return score === null ? null : { article, score }
      })
      .filter((entry): entry is { article: Article; score: number } => entry !== null)
      .sort((a, b) => a.score - b.score || articleTimestamp(b.article.updatedAt) - articleTimestamp(a.article.updatedAt))
      .slice(0, limit)
      .map(({ article }) => ({
        id: article.id,
        title: article.title,
        categoryId: article.categoryId,
        status: article.status,
        updatedAt: new Date(article.updatedAt),
      }))
  }

  async rebuildArticleBacklinks(articleId: string): Promise<WikiLinkRebuildResult> {
    const source = await this.articles.findById(articleId)
    if (!source || source.status === ARTICLE_STATUS.TRASHED) {
      await this.backlinks.replaceSourceBacklinks(articleId, [])
      return { sourceArticleId: articleId, indexed: 0, resolved: 0, broken: 0 }
    }

    const allArticles = await this.articles.findAllOrderedByDate()
    const records = this.buildBacklinksForArticle(source, allArticles, Date.now())
    await this.backlinks.replaceSourceBacklinks(articleId, records)
    return this.summarizeArticleRebuild(articleId, records)
  }

  async rebuildAllBacklinks(): Promise<WikiLinkRebuildAllResult> {
    const allArticles = (await this.articles.findAllOrderedByDate())
      .filter(article => article.status !== ARTICLE_STATUS.TRASHED)
    const now = Date.now()
    const records = allArticles.flatMap(article => this.buildBacklinksForArticle(article, allArticles, now))
    await this.backlinks.replaceAll(records)
    return {
      indexedArticles: allArticles.length,
      indexedLinks: records.length,
      resolved: records.filter(record => record.resolved).length,
      broken: records.filter(record => !record.resolved).length,
    }
  }

  async deleteArticleBacklinks(articleId: string): Promise<number> {
    return await this.backlinks.deleteByArticle(articleId)
  }

  async getBacklinks(articleId: string): Promise<BacklinkRecord[]> {
    return await this.backlinks.findBacklinks(articleId)
  }

  async getBrokenLinks(): Promise<BacklinkRecord[]> {
    return await this.backlinks.findBrokenLinks()
  }

  extract(markdown: string): WikiLinkOccurrence[] {
    return extractWikiLinks(markdown)
  }

  private buildBacklinksForArticle(source: Article, allArticles: Article[], now: number): BacklinkRecord[] {
    const titleIndex = this.buildTitleIndex(allArticles)
    return extractWikiLinks(articleContent(source)).map((occurrence) => {
      const targetArticle = titleIndex.get(occurrence.target) ?? null
      return {
        id: `${source.id}:${stableHash(`${occurrence.index}:${occurrence.raw}:${occurrence.context}`)}`,
        indexVersion: WIKI_LINK_INDEX_VERSION,
        sourceArticleId: source.id,
        sourceTitle: source.title,
        targetArticleId: targetArticle?.id ?? null,
        targetTitle: occurrence.target,
        anchor: occurrence.anchor,
        alias: occurrence.alias,
        raw: occurrence.raw,
        context: occurrence.context,
        resolved: Boolean(targetArticle),
        createdAt: now,
        updatedAt: now,
      }
    })
  }

  private buildTitleIndex(articles: Article[]): Map<string, Article> {
    const sorted = [...articles]
      .filter(article => article.status !== ARTICLE_STATUS.TRASHED)
      .sort((a, b) => articleTimestamp(b.updatedAt) - articleTimestamp(a.updatedAt))
    const index = new Map<string, Article>()
    for (const article of sorted) {
      if (!index.has(article.title)) {
        index.set(article.title, article)
      }
    }
    return index
  }

  private summarizeArticleRebuild(sourceArticleId: string, records: BacklinkRecord[]): WikiLinkRebuildResult {
    return {
      sourceArticleId,
      indexed: records.length,
      resolved: records.filter(record => record.resolved).length,
      broken: records.filter(record => !record.resolved).length,
    }
  }
}

export const wikiLinkService = new WikiLinkService()
