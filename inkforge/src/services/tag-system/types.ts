import { z } from 'zod'

export const TAG_SYSTEM_SCHEMA_VERSION = 1
export const TAG_NAME_MAX_LENGTH = 50
export const TAGS_PER_DOCUMENT_LIMIT = 20

export const TAG_COLOR_PRESETS = [
  { name: '红木', hex: '#b91c1c' },
  { name: '琥珀', hex: '#d97706' },
  { name: '森林', hex: '#15803d' },
  { name: '青绿', hex: '#0f766e' },
  { name: '蓝色', hex: '#2563eb' },
  { name: '靛蓝', hex: '#4f46e5' },
  { name: '紫罗兰', hex: '#7c3aed' },
  { name: '岩灰', hex: '#475569' },
] as const

export type TagFilterMode = 'AND' | 'OR'
export type TagSortField = 'docCount' | 'name' | 'createdAt'
export type TagSortDirection = 'asc' | 'desc'

export type TagSystemErrorCode =
  | 'TAG_VALIDATION_ERROR'
  | 'TAG_NAME_CONFLICT'
  | 'TAG_LIMIT_EXCEEDED'
  | 'TAG_NOT_FOUND'
  | 'TAG_MERGE_INVALID'

export class TagSystemError extends Error {
  constructor(readonly code: TagSystemErrorCode, message: string, readonly details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'TagSystemError'
    Object.setPrototypeOf(this, TagSystemError.prototype)
  }
}

export class TagValidationError extends TagSystemError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('TAG_VALIDATION_ERROR', message, details)
    this.name = 'TagValidationError'
  }
}

export class TagNameConflictError extends TagSystemError {
  constructor(name: string, accountId: string) {
    super('TAG_NAME_CONFLICT', `Tag already exists: ${name}`, { name, accountId })
    this.name = 'TagNameConflictError'
  }
}

export class TagLimitExceededError extends TagSystemError {
  constructor(docId: string, limit = TAGS_PER_DOCUMENT_LIMIT) {
    super('TAG_LIMIT_EXCEEDED', `A document can have at most ${limit} tags`, { docId, limit })
    this.name = 'TagLimitExceededError'
  }
}

export class TagNotFoundError extends TagSystemError {
  constructor(tagId: string) {
    super('TAG_NOT_FOUND', `Tag not found: ${tagId}`, { tagId })
    this.name = 'TagNotFoundError'
  }
}

export class TagMergeInvalidError extends TagSystemError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('TAG_MERGE_INVALID', message, details)
    this.name = 'TagMergeInvalidError'
  }
}

export const TagNameSchema = z.string()
  .trim()
  .min(1, 'Tag name cannot be empty')
  .max(TAG_NAME_MAX_LENGTH, `Tag name cannot exceed ${TAG_NAME_MAX_LENGTH} characters`)
  .refine(value => !/\s/.test(value), 'Tag name cannot contain whitespace')

export const TagColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Tag color must be a HEX color like #3b82f6')

export const TagRecordSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(TAG_SYSTEM_SCHEMA_VERSION),
  name: TagNameSchema,
  normalizedName: z.string().min(1),
  color: TagColorSchema,
  docCount: z.number().int().nonnegative(),
  accountId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type TagRecord = z.infer<typeof TagRecordSchema>
export type Tag = TagRecord

export const DocTagRecordSchema = z.object({
  id: z.string().min(1),
  docId: z.string().min(1),
  tagId: z.string().min(1),
  addedAt: z.string().datetime(),
})
export type DocTagRecord = z.infer<typeof DocTagRecordSchema>
export type DocTag = DocTagRecord

export const CreateTagParamsSchema = z.object({
  name: TagNameSchema,
  color: TagColorSchema.default(TAG_COLOR_PRESETS[0].hex),
  accountId: z.string().min(1),
})
export type CreateTagParams = z.input<typeof CreateTagParamsSchema>
export type NormalizedCreateTagParams = z.output<typeof CreateTagParamsSchema>

export const UpdateTagParamsSchema = z.object({
  name: TagNameSchema.optional(),
  color: TagColorSchema.optional(),
}).refine(value => value.name !== undefined || value.color !== undefined, 'No tag updates provided')
export type UpdateTagParams = z.input<typeof UpdateTagParamsSchema>
export type NormalizedUpdateTagParams = z.output<typeof UpdateTagParamsSchema>

export const MergeTagsParamsSchema = z.object({
  sourceIds: z.array(z.string().min(1)).min(1),
  targetId: z.string().min(1),
}).superRefine((params, ctx) => {
  const uniqueSourceIds = new Set(params.sourceIds)
  if (uniqueSourceIds.size !== params.sourceIds.length) {
    ctx.addIssue({ code: 'custom', path: ['sourceIds'], message: 'Source tags must be unique' })
  }
  if (uniqueSourceIds.has(params.targetId)) {
    ctx.addIssue({ code: 'custom', path: ['targetId'], message: 'Target tag cannot be one of the source tags' })
  }
})
export type MergeTagsParams = z.input<typeof MergeTagsParamsSchema>
export type NormalizedMergeTagsParams = z.output<typeof MergeTagsParamsSchema>

export interface TagColorPreset {
  name: string
  hex: string
}

export interface TagCloudNode {
  tag: Tag
  weight: number
  fontSize: number
}

export interface TagStoreState {
  tags: Tag[]
  selectedTagIds: string[]
  filterMode: TagFilterMode
  isLoading: boolean
  isSaving: boolean
  searchQuery: string
  sortField: TagSortField
  sortDirection: TagSortDirection
  error: string | null
}

export interface TagBrowserDocument {
  id: string
  title: string
  updatedAt: Date | string | number
}

export function normalizeTagName(name: string): string {
  const parsed = TagNameSchema.parse(name)
  return parsed.toLocaleLowerCase()
}

export function parseTagName(name: string): string {
  try {
    return TagNameSchema.parse(name)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid tag name'
    throw new TagValidationError(message, { name })
  }
}

export function parseTagColor(color: string): string {
  try {
    return TagColorSchema.parse(color).toLocaleLowerCase()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid tag color'
    throw new TagValidationError(message, { color })
  }
}

export function makeDocTagId(docId: string, tagId: string): string {
  return `${docId}::${tagId}`
}

export function computeTagCloudNodes(tags: Tag[], minFontSize = 12, maxFontSize = 28): TagCloudNode[] {
  if (tags.length === 0) return []
  const counts = tags.map(tag => tag.docCount)
  const min = Math.min(...counts)
  const max = Math.max(...counts)
  return tags.map(tag => {
    const weight = max === min ? 0.5 : Math.log1p(tag.docCount - min) / Math.log1p(max - min)
    return {
      tag,
      weight,
      fontSize: Math.round(minFontSize + weight * (maxFontSize - minFontSize)),
    }
  })
}
