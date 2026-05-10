import { z } from 'zod'
import { filterSnippetsForContext, matchSnippetTrigger } from './matcher'
import { snippetRepository, type SnippetRepository } from './repository'
import { resolveSnippetContent } from './resolver'
import { SnippetRecordSchema, type CreateSnippetInput, type ExpandedSnippetResult, type InkForgeSnippetExportPayload, type SnippetContext, type SnippetImportResult, type SnippetRecord, type UpdateSnippetInput } from './types'

const InkForgeSnippetExportPayloadSchema = z.object({
  format: z.literal('inkforge-snippets'),
  version: z.literal(1),
  exportedAt: z.string(),
  snippets: z.array(SnippetRecordSchema),
})

const VSCodeSnippetEntrySchema = z.object({
  prefix: z.union([z.string(), z.array(z.string())]),
  body: z.union([z.string(), z.array(z.string())]),
  description: z.union([z.string(), z.array(z.string())]).optional(),
  scope: z.string().optional(),
}).passthrough()

const VSCodeSnippetPayloadSchema = z.record(z.string(), VSCodeSnippetEntrySchema)

function serializeDescription(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join('\n')
  return value ?? ''
}

function serializeBody(value: string | string[]): string {
  return Array.isArray(value) ? value.join('\n') : value
}

function uniqueById(records: SnippetRecord[]): SnippetRecord[] {
  const byId = new Map<string, SnippetRecord>()
  for (const record of records) byId.set(record.id, record)
  return Array.from(byId.values())
}

function parseJsonPayload(input: string | unknown): unknown {
  if (typeof input === 'string') {
    return JSON.parse(input) as unknown
  }
  return input
}

export class SnippetService {
  constructor(private readonly snippets: SnippetRepository = snippetRepository) {}

  async listSnippets(): Promise<SnippetRecord[]> {
    return await this.snippets.list()
  }

  async searchSnippets(query: string): Promise<SnippetRecord[]> {
    return await this.snippets.search(query)
  }

  async createSnippet(input: CreateSnippetInput): Promise<SnippetRecord> {
    return await this.snippets.create(input)
  }

  async updateSnippet(id: string, patch: UpdateSnippetInput): Promise<SnippetRecord> {
    return await this.snippets.update(id, patch)
  }

  async deleteSnippet(id: string): Promise<void> {
    await this.snippets.delete(id)
  }

  async recordUsage(id: string): Promise<SnippetRecord> {
    return await this.snippets.recordUsage(id)
  }

  async getEffectiveSnippets(context: Pick<SnippetContext, 'articleId' | 'tags'>): Promise<SnippetRecord[]> {
    return filterSnippetsForContext(await this.snippets.list(), context)
  }

  resolveSnippet(snippet: SnippetRecord, context: SnippetContext) {
    return resolveSnippetContent(snippet.content, context)
  }

  findTrigger(textBeforeCursor: string, snippets: SnippetRecord[]) {
    return matchSnippetTrigger(textBeforeCursor, snippets)
  }

  async expandTrigger(textBeforeCursor: string, context: SnippetContext): Promise<ExpandedSnippetResult | null> {
    const match = matchSnippetTrigger(textBeforeCursor, await this.getEffectiveSnippets(context))
    if (!match) return null
    return {
      snippet: match.snippet,
      match,
      resolved: this.resolveSnippet(match.snippet, context),
    }
  }

  async exportInkForgeJson(): Promise<string> {
    const payload: InkForgeSnippetExportPayload = {
      format: 'inkforge-snippets',
      version: 1,
      exportedAt: new Date().toISOString(),
      snippets: await this.snippets.list(),
    }
    return JSON.stringify(payload, null, 2)
  }

  async importInkForgeJson(input: string | unknown): Promise<SnippetImportResult> {
    const payload = InkForgeSnippetExportPayloadSchema.parse(parseJsonPayload(input))
    const existing = await this.snippets.list()
    const records = uniqueById([...existing, ...payload.snippets.map(record => SnippetRecordSchema.parse({ ...record, scopeType: record.scope.type }))])
    await this.snippets.replaceAll(records)
    return {
      imported: payload.snippets.length,
      skipped: 0,
      records,
      errors: [],
    }
  }

  async importVSCodeJson(input: string | unknown): Promise<SnippetImportResult> {
    const payload = VSCodeSnippetPayloadSchema.parse(parseJsonPayload(input))
    const created: SnippetRecord[] = []
    const errors: string[] = []

    for (const [name, entry] of Object.entries(payload)) {
      const prefixes = Array.isArray(entry.prefix) ? entry.prefix : [entry.prefix]
      for (const prefix of prefixes) {
        try {
          created.push(await this.snippets.create({
            name,
            description: serializeDescription(entry.description),
            type: 'text',
            trigger: prefix,
            triggerCaseSensitive: true,
            content: serializeBody(entry.body),
            scope: { type: 'global', tags: [] },
            icon: null,
            tags: entry.scope ? entry.scope.split(',').map(tag => tag.trim()).filter(Boolean) : [],
          }))
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error))
        }
      }
    }

    return {
      imported: created.length,
      skipped: errors.length,
      records: created,
      errors,
    }
  }
}

export const snippetService = new SnippetService()
