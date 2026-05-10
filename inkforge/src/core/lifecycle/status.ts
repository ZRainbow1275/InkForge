import { ARTICLE_STATUS, type ArticleStatus } from '@/schemas/article'

export const TARGET_LIFECYCLE_STATUSES = [
    ARTICLE_STATUS.DRAFT,
    ARTICLE_STATUS.WRITING,
    ARTICLE_STATUS.UNDER_REVIEW,
    ARTICLE_STATUS.READY_TO_PUBLISH,
    ARTICLE_STATUS.PUBLISHED,
    ARTICLE_STATUS.ARCHIVED,
] as const

export const LEGACY_ARTICLE_STATUSES = [
    ARTICLE_STATUS.NEW,
    ARTICLE_STATUS.READ,
    ARTICLE_STATUS.PROCESSED,
] as const

export type TargetLifecycleStatus = typeof TARGET_LIFECYCLE_STATUSES[number]
export type LegacyArticleStatus = typeof LEGACY_ARTICLE_STATUSES[number]

export interface LifecycleTextMetrics {
    wordCount: number
    charCount: number
}

export interface LifecycleGuardResult extends LifecycleTextMetrics {
    ok: boolean
    reason?: string
}

const TARGET_STATUS_SET = new Set<string>(TARGET_LIFECYCLE_STATUSES)
const LEGACY_STATUS_SET = new Set<string>(LEGACY_ARTICLE_STATUSES)

export function isTargetLifecycleStatus(status: string): status is TargetLifecycleStatus {
    return TARGET_STATUS_SET.has(status)
}

export function isLegacyArticleStatus(status: string): status is LegacyArticleStatus {
    return LEGACY_STATUS_SET.has(status)
}

export function normalizeArticleStatus(status: string | null | undefined): ArticleStatus {
    return Object.values(ARTICLE_STATUS).includes(status as ArticleStatus)
        ? status as ArticleStatus
        : ARTICLE_STATUS.DRAFT
}

export function isDraftBoxStatus(status: ArticleStatus): boolean {
    return status === ARTICLE_STATUS.DRAFT || status === ARTICLE_STATUS.WRITING
}

export function isDraftLikeStatus(status: ArticleStatus): boolean {
    return isDraftBoxStatus(status) || status === ARTICLE_STATUS.NEW
}

export function isUnfinishedStatus(status: ArticleStatus): boolean {
    return !isCompletedStatus(status)
}

export function isCompletedStatus(status: ArticleStatus): boolean {
    return status === ARTICLE_STATUS.PROCESSED || status === ARTICLE_STATUS.PUBLISHED || status === ARTICLE_STATUS.ARCHIVED
}

export function getLifecycleContinuationPriority(status: ArticleStatus): number {
    switch (status) {
        case ARTICLE_STATUS.WRITING:
            return 0
        case ARTICLE_STATUS.DRAFT:
            return 1
        case ARTICLE_STATUS.NEW:
            return 2
        case ARTICLE_STATUS.READ:
            return 3
        case ARTICLE_STATUS.UNDER_REVIEW:
            return 4
        case ARTICLE_STATUS.READY_TO_PUBLISH:
            return 5
        case ARTICLE_STATUS.PROCESSED:
        case ARTICLE_STATUS.PUBLISHED:
        case ARTICLE_STATUS.ARCHIVED:
            return 6
        default:
            return 7
    }
}

export function getArticleStatusLabel(status: string): string {
    switch (normalizeArticleStatus(status)) {
        case ARTICLE_STATUS.WRITING:
            return '写作中'
        case ARTICLE_STATUS.UNDER_REVIEW:
            return '待审阅'
        case ARTICLE_STATUS.READY_TO_PUBLISH:
            return '待发布'
        case ARTICLE_STATUS.PUBLISHED:
            return '已发布'
        case ARTICLE_STATUS.ARCHIVED:
            return '已归档'
        case ARTICLE_STATUS.PROCESSED:
            return '已完成'
        case ARTICLE_STATUS.READ:
            return '已读'
        case ARTICLE_STATUS.NEW:
            return '待整理'
        case ARTICLE_STATUS.DRAFT:
        default:
            return '草稿'
    }
}

export function getArticleStatusClass(status: string): string {
    switch (normalizeArticleStatus(status)) {
        case ARTICLE_STATUS.PROCESSED:
        case ARTICLE_STATUS.PUBLISHED:
        case ARTICLE_STATUS.ARCHIVED:
            return 'status-done'
        case ARTICLE_STATUS.READ:
            return 'status-read'
        case ARTICLE_STATUS.UNDER_REVIEW:
        case ARTICLE_STATUS.READY_TO_PUBLISH:
            return 'status-read'
        case ARTICLE_STATUS.NEW:
        case ARTICLE_STATUS.DRAFT:
        case ARTICLE_STATUS.WRITING:
        default:
            return 'status-draft'
    }
}

function stripFrontmatter(markdown: string): string {
    if (!markdown.startsWith('---')) return markdown
    const end = markdown.split('\n').findIndex((line, index) => index > 0 && line.trim() === '---')
    if (end === -1) return markdown
    return markdown.split('\n').slice(end + 1).join('\n')
}

function stripMarkdownSyntax(markdown: string): string {
    return stripFrontmatter(markdown)
        .replace(/```[\s\S]*?```/gu, ' ')
        .replace(/`([^`]*)`/gu, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/gu, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
        .replace(/^[#>*\-+\s]+/gmu, '')
        .replace(/[*_~>|#[\](){}:;,.!?，。！？、；：“”‘’]/gu, ' ')
}

export function getLifecycleTextMetrics(markdownOrBody: string): LifecycleTextMetrics {
    const plain = stripMarkdownSyntax(markdownOrBody)
    const wordMatches = plain.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/gu)
    const compactChars = plain.replace(/\s+/gu, '')

    return {
        wordCount: wordMatches?.length ?? 0,
        charCount: compactChars.length,
    }
}

export function checkHasSubstance(markdownOrBody: string): LifecycleGuardResult {
    const metrics = getLifecycleTextMetrics(markdownOrBody)
    const ok = metrics.wordCount >= 50 || metrics.charCount >= 200
    return {
        ...metrics,
        ok,
        reason: ok ? undefined : `need >=50 words or >=200 chars, got ${metrics.wordCount}w/${metrics.charCount}c`,
    }
}

export function getArticleStatusAfterContentChange(
    currentStatus: ArticleStatus,
    markdownOrBody: string,
    requestedStatus?: ArticleStatus,
): ArticleStatus {
    if (requestedStatus && requestedStatus !== ARTICLE_STATUS.DRAFT) {
        return requestedStatus
    }

    const baseStatus = requestedStatus ?? currentStatus
    if (isCompletedStatus(baseStatus)) {
        return baseStatus
    }

    if (baseStatus === ARTICLE_STATUS.DRAFT || baseStatus === ARTICLE_STATUS.NEW || baseStatus === ARTICLE_STATUS.READ) {
        return checkHasSubstance(markdownOrBody).ok ? ARTICLE_STATUS.WRITING : ARTICLE_STATUS.DRAFT
    }

    return baseStatus
}
