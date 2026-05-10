import { z } from 'zod'

export const SNIPPET_SCHEMA_VERSION = 1

export const SnippetTypeSchema = z.enum(['text', 'block'])
export type SnippetType = z.infer<typeof SnippetTypeSchema>

export const SnippetScopeTypeSchema = z.enum(['global', 'document', 'tags'])
export type SnippetScopeType = z.infer<typeof SnippetScopeTypeSchema>

export const SnippetScopeSchema = z.object({
  type: SnippetScopeTypeSchema,
  articleId: z.string().min(1).nullable().optional(),
  tags: z.array(z.string().min(1)).default([]),
}).superRefine((scope, ctx) => {
  if (scope.type === 'document' && !scope.articleId) {
    ctx.addIssue({ code: 'custom', path: ['articleId'], message: 'Document scoped snippets require articleId' })
  }
  if (scope.type === 'tags' && scope.tags.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['tags'], message: 'Tag scoped snippets require at least one tag' })
  }
})
export type SnippetScope = z.infer<typeof SnippetScopeSchema>

export const SnippetRecordSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(SNIPPET_SCHEMA_VERSION),
  name: z.string().trim().min(1),
  description: z.string(),
  type: SnippetTypeSchema,
  trigger: z.string(),
  triggerCaseSensitive: z.boolean(),
  content: z.string(),
  scope: SnippetScopeSchema,
  scopeType: SnippetScopeTypeSchema,
  icon: z.string().min(1).nullable(),
  tags: z.array(z.string().min(1)),
  usageCount: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  lastUsedAt: z.number().int().nonnegative().nullable(),
}).superRefine((record, ctx) => {
  if (record.scope.type !== record.scopeType) {
    ctx.addIssue({ code: 'custom', path: ['scopeType'], message: 'scopeType must mirror scope.type for Dexie indexing' })
  }
  if (record.type === 'text' && record.trigger.trim().length === 0) {
    ctx.addIssue({ code: 'custom', path: ['trigger'], message: 'Text snippets require a trigger' })
  }
  if (record.content.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['content'], message: 'Snippet content cannot be empty' })
  }
})
export type SnippetRecord = z.infer<typeof SnippetRecordSchema>

export const CreateSnippetInputSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  type: SnippetTypeSchema.default('text'),
  trigger: z.string().default(''),
  triggerCaseSensitive: z.boolean().default(true),
  content: z.string().min(1),
  scope: SnippetScopeSchema.default({ type: 'global', tags: [] }),
  icon: z.string().min(1).nullable().optional(),
  tags: z.array(z.string().min(1)).default([]),
})
export type CreateSnippetInput = z.input<typeof CreateSnippetInputSchema>
export type NormalizedCreateSnippetInput = z.output<typeof CreateSnippetInputSchema>

export const UpdateSnippetInputSchema = CreateSnippetInputSchema.partial().extend({
  usageCount: z.number().int().nonnegative().optional(),
  lastUsedAt: z.number().int().nonnegative().nullable().optional(),
})
export type UpdateSnippetInput = z.input<typeof UpdateSnippetInputSchema>
export type NormalizedUpdateSnippetInput = z.output<typeof UpdateSnippetInputSchema>

export interface SnippetContext {
  articleId: string | null
  articleTitle: string
  authorName: string
  selectedText: string
  clipboardText: string
  tags: string[]
  now: Date
}

export interface SnippetTabStop {
  index: number
  from: number
  to: number
  placeholder: string
}

export interface ResolvedSnippet {
  content: string
  tabStops: SnippetTabStop[]
  finalCursorOffset: number
}

export interface SnippetTriggerMatch {
  snippet: SnippetRecord
  trigger: string
  fromOffset: number
  toOffset: number
}

export interface ExpandedSnippetResult {
  snippet: SnippetRecord
  match: SnippetTriggerMatch
  resolved: ResolvedSnippet
}

export interface InkForgeSnippetExportPayload {
  format: 'inkforge-snippets'
  version: 1
  exportedAt: string
  snippets: SnippetRecord[]
}

export interface SnippetImportResult {
  imported: number
  skipped: number
  records: SnippetRecord[]
  errors: string[]
}
