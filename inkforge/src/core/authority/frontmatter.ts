import { z } from 'zod'
import { ARTICLE_STATUS, type ArticleStatus } from '@/schemas/article'

export const AUTHORITY_SCHEMA_VERSION = 1

const PortableModeSchema = z.enum(['standard', 'mixed', 'inkforge-only'])

export const FrontmatterSchema = z.object({
    title: z.string().min(1),
    summary: z.string().nullable(),
    cover: z.string().nullable(),
    status: z.enum([
        ARTICLE_STATUS.DRAFT,
        ARTICLE_STATUS.WRITING,
        ARTICLE_STATUS.UNDER_REVIEW,
        ARTICLE_STATUS.READY_TO_PUBLISH,
        ARTICLE_STATUS.PUBLISHED,
        ARTICLE_STATUS.ARCHIVED,
        ARTICLE_STATUS.NEW,
        ARTICLE_STATUS.READ,
        ARTICLE_STATUS.PROCESSED,
    ]),
    category: z.string().nullable(),
    tags: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
    published_at: z.string().nullable(),
    inkforge: z.object({
        schema_version: z.number().int().min(1),
        authority: z.literal('markdown'),
        portability: PortableModeSchema,
        extensions: z.array(z.string()),
    }),
}).passthrough()

export type AuthorityFrontmatter = z.infer<typeof FrontmatterSchema>

export interface FrontmatterMirrorInput {
    title: string
    summary?: string | null
    coverImage?: string | null
    status?: ArticleStatus
    categoryId?: string | null
    tags?: string[]
    createdAt?: Date | string | number
    updatedAt?: Date | string | number
    publishedAt?: Date | string | number | null
}

export interface ParsedMarkdownSource {
    frontmatter: Record<string, unknown>
    body: string
    hasFrontmatter: boolean
}

function toIsoString(value: Date | string | number | null | undefined, fallback: Date): string | null {
    if (value === null) return null
    if (value === undefined) return fallback.toISOString()
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString()
}

function parseScalar(raw: string): string | number | boolean | null {
    const value = raw.trim()
    if (value === '' || value === 'null' || value === '~') return null
    if (value === 'true') return true
    if (value === 'false') return false
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1)
    }
    if (/^-?\d+(\.\d+)?$/u.test(value)) return Number(value)
    return value
}

function parseInlineArray(raw: string): string[] | null {
    const value = raw.trim()
    if (!value.startsWith('[') || !value.endsWith(']')) return null
    const inner = value.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map(item => String(parseScalar(item) ?? ''))
}

function parseFrontmatterLines(lines: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    let currentKey: string | null = null
    let currentArray: string[] | null = null
    let currentObjectKey: string | null = null
    let currentObject: Record<string, unknown> | null = null

    const flushArray = () => {
        if (currentKey && currentArray) result[currentKey] = currentArray
        currentKey = null
        currentArray = null
    }
    const flushObject = () => {
        if (currentObjectKey && currentObject) result[currentObjectKey] = currentObject
        currentObjectKey = null
        currentObject = null
    }

    for (const line of lines) {
        if (line.trim() === '' || line.trim().startsWith('#')) continue

        const nestedMatch = line.match(/^\s{2,}([a-zA-Z_][\w-]*)\s*:\s*(.*)$/u)
        if (nestedMatch && currentObject) {
            currentKey = null
            currentArray = null
            const inline = parseInlineArray(nestedMatch[2])
            currentObject[nestedMatch[1]] = inline ?? parseScalar(nestedMatch[2])
            continue
        }

        const listItemMatch = line.match(/^\s+-\s+(.+)$/u)
        if (listItemMatch && currentKey) {
            currentObjectKey = null
            currentObject = null
            currentArray ??= []
            currentArray.push(String(parseScalar(listItemMatch[1]) ?? ''))
            continue
        }

        flushArray()
        flushObject()

        const kvMatch = line.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/u)
        if (!kvMatch) continue

        const key = kvMatch[1]
        const raw = kvMatch[2].trim()
        if (raw === '') {
            currentKey = key
            currentObjectKey = key
            currentObject = {}
            continue
        }

        const inline = parseInlineArray(raw)
        result[key] = inline ?? parseScalar(raw)
    }

    flushArray()
    flushObject()
    return result
}

export function readMarkdownSource(markdown: string): ParsedMarkdownSource {
    const lines = markdown.split('\n')
    if (lines[0]?.trim() !== '---') {
        return { frontmatter: {}, body: markdown, hasFrontmatter: false }
    }

    const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
    if (endIndex === -1) {
        return { frontmatter: {}, body: markdown, hasFrontmatter: false }
    }

    let bodyStart = endIndex + 1
    if (lines[bodyStart]?.trim() === '') bodyStart += 1

    return {
        frontmatter: parseFrontmatterLines(lines.slice(1, endIndex)),
        body: lines.slice(bodyStart).join('\n'),
        hasFrontmatter: true,
    }
}

function stringArray(value: unknown, fallback: string[] = []): string[] {
    if (!Array.isArray(value)) return fallback
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function validStatus(value: unknown, fallback: ArticleStatus): ArticleStatus {
    return Object.values(ARTICLE_STATUS).includes(value as ArticleStatus) ? value as ArticleStatus : fallback
}

export function buildFrontmatter(existing: Record<string, unknown>, mirror: FrontmatterMirrorInput): AuthorityFrontmatter {
    const now = new Date()
    const existingInkforge = typeof existing.inkforge === 'object' && existing.inkforge !== null
        ? existing.inkforge as Record<string, unknown>
        : {}
    const portability = PortableModeSchema.safeParse(existingInkforge.portability)

    return FrontmatterSchema.parse({
        ...existing,
        title: mirror.title.trim() || '未命名文稿',
        summary: mirror.summary ?? null,
        cover: mirror.coverImage ?? (typeof existing.cover === 'string' ? existing.cover : null),
        status: mirror.status ?? validStatus(existing.status, ARTICLE_STATUS.DRAFT),
        category: mirror.categoryId ?? null,
        tags: mirror.tags ?? stringArray(existing.tags),
        created_at: typeof existing.created_at === 'string' ? existing.created_at : toIsoString(mirror.createdAt, now),
        updated_at: toIsoString(mirror.updatedAt, now),
        published_at: toIsoString(mirror.publishedAt, now),
        inkforge: {
            schema_version: typeof existingInkforge.schema_version === 'number' ? existingInkforge.schema_version : AUTHORITY_SCHEMA_VERSION,
            authority: 'markdown',
            portability: portability.success ? portability.data : 'standard',
            extensions: stringArray(existingInkforge.extensions),
        },
    })
}

function serializeScalar(value: string | number | boolean | null): string {
    if (value === null) return 'null'
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (/^[A-Za-z0-9_./:-]+$/u.test(value)) return value
    return JSON.stringify(value)
}

function serializeValue(key: string, value: unknown, indent = ''): string[] {
    if (Array.isArray(value)) {
        if (value.length === 0) return [`${indent}${key}: []`]
        return [`${indent}${key}:`, ...value.map(item => `${indent}  - ${serializeScalar(String(item))}`)]
    }
    if (typeof value === 'object' && value !== null) {
        const nested = Object.entries(value as Record<string, unknown>).flatMap(([nestedKey, nestedValue]) => serializeValue(nestedKey, nestedValue, `${indent}  `))
        return [`${indent}${key}:`, ...nested]
    }
    return [`${indent}${key}: ${serializeScalar(value as string | number | boolean | null)}`]
}

export function serializeFrontmatter(frontmatter: AuthorityFrontmatter): string {
    const orderedKeys = ['title', 'summary', 'cover', 'status', 'category', 'tags', 'created_at', 'updated_at', 'published_at', 'inkforge']
    return orderedKeys.flatMap(key => serializeValue(key, frontmatter[key as keyof AuthorityFrontmatter])).join('\n')
}

export function writeMarkdownSource(body: string, frontmatter: AuthorityFrontmatter): string {
    const normalizedBody = body.replace(/^\s*\n/u, '')
    return `---\n${serializeFrontmatter(frontmatter)}\n---\n\n${normalizedBody}`
}
