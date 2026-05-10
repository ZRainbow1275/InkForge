import type { Table } from 'dexie'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { db } from '@/utils/db'
import { useSnippetStore } from '@/stores/snippet'
import { SnippetExpansion } from '@/extensions/SnippetExpansion'
import { matchSnippetTrigger } from './matcher'
import { SnippetRepository } from './repository'
import { resolveSnippetContent } from './resolver'
import { SnippetService, snippetService } from './service'
import { SNIPPET_SCHEMA_VERSION, SnippetRecordSchema, type SnippetContext, type SnippetRecord } from './types'

function createSnippetRecord(overrides: Partial<SnippetRecord> = {}): SnippetRecord {
  const now = 1_775_000_000_000
  const scope = overrides.scope ?? { type: 'global' as const, tags: [] }
  return SnippetRecordSchema.parse({
    id: overrides.id ?? 'snippet-1',
    schemaVersion: SNIPPET_SCHEMA_VERSION,
    name: overrides.name ?? 'Signature',
    description: overrides.description ?? 'Reusable signature',
    type: overrides.type ?? 'text',
    trigger: overrides.trigger ?? 'sig',
    triggerCaseSensitive: overrides.triggerCaseSensitive ?? true,
    content: overrides.content ?? 'Regards, $AUTHOR$0',
    scope,
    scopeType: overrides.scopeType ?? scope.type,
    icon: overrides.icon ?? null,
    tags: overrides.tags ?? [],
    usageCount: overrides.usageCount ?? 0,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    lastUsedAt: Object.prototype.hasOwnProperty.call(overrides, 'lastUsedAt') ? overrides.lastUsedAt ?? null : null,
  })
}

function createSnippetContext(overrides: Partial<SnippetContext> = {}): SnippetContext {
  return {
    articleId: overrides.articleId ?? 'article-1',
    articleTitle: overrides.articleTitle ?? 'Launch Note',
    authorName: overrides.authorName ?? 'InkForge',
    selectedText: overrides.selectedText ?? 'selected text',
    clipboardText: overrides.clipboardText ?? 'clipboard text',
    tags: overrides.tags ?? ['guide'],
    now: overrides.now ?? new Date('2026-05-02T09:08:00.000Z'),
  }
}

function createSnippetTable(initial: SnippetRecord[] = []) {
  const rows = new Map<string, SnippetRecord>(initial.map(record => [record.id, record]))
  const table = {
    toArray: async () => Array.from(rows.values()),
    get: async (id: string) => rows.get(id),
    put: async (record: SnippetRecord) => {
      rows.set(record.id, record)
      return record.id
    },
    delete: async (id: string) => {
      rows.delete(id)
    },
    clear: async () => {
      rows.clear()
    },
    bulkPut: async (records: SnippetRecord[]) => {
      for (const record of records) rows.set(record.id, record)
      return records.map(record => record.id)
    },
    count: async () => rows.size,
  }
  return { rows, table: table as unknown as Table<SnippetRecord, string> }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

describe('Snippet schemas and resolver', () => {
  it('rejects invalid text snippets at the runtime schema boundary', () => {
    expect(() => createSnippetRecord({ name: '', trigger: 'x' })).toThrow()
    expect(() => createSnippetRecord({ trigger: '', type: 'text' })).toThrow()
    expect(() => createSnippetRecord({ scope: { type: 'document', tags: [] }, scopeType: 'document' })).toThrow()
  })

  it('resolves built-in variables, placeholders, tab stops, and final cursor', () => {
    const result = resolveSnippetContent(
      'Title $TITLE on $DATE $TIME / $DATETIME by $AUTHOR from $CLIPBOARD and $SELECTED_TEXT ${1:topic}$0 $UUID',
      createSnippetContext(),
    )

    expect(result.content).toContain('Title Launch Note on 2026-05-02 17:08 / 2026-05-02 17:08 by InkForge')
    expect(result.content).toContain('from clipboard text and selected text topic')
    expect(result.content).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
    expect(result.tabStops).toEqual([{ index: 1, from: result.content.indexOf('topic'), to: result.content.indexOf('topic') + 5, placeholder: 'topic' }])
    expect(result.finalCursorOffset).toBe(result.content.indexOf('topic') + 5)
  })

  it('keeps escaped dollar signs as literal text', () => {
    expect(resolveSnippetContent('Price \\$DATE $1', createSnippetContext()).content).toBe('Price $DATE ')
  })
})

describe('Snippet matcher and repository', () => {
  it('matches longest trigger with case behavior and boundary protection', () => {
    const snippets = [
      createSnippetRecord({ id: 'short', trigger: 'sig', usageCount: 10 }),
      createSnippetRecord({ id: 'long', trigger: 'sigfull', usageCount: 0 }),
      createSnippetRecord({ id: 'lower', trigger: 'date', triggerCaseSensitive: false }),
      createSnippetRecord({ id: 'case', trigger: 'CASE', triggerCaseSensitive: true }),
    ]

    expect(matchSnippetTrigger('sigfull', snippets)?.snippet.id).toBe('long')
    expect(matchSnippetTrigger('hello sig', snippets)?.snippet.id).toBe('short')
    expect(matchSnippetTrigger('helloDate', snippets)).toBeNull()
    expect(matchSnippetTrigger('DATE', snippets)?.snippet.id).toBe('lower')
    expect(matchSnippetTrigger('case', snippets)).toBeNull()
  })

  it('creates, searches, updates, records usage, deletes, and replaces real rows through the repository contract', async () => {
    const { table } = createSnippetTable()
    const repository = new SnippetRepository(table)

    const created = await repository.create({ name: 'Meeting', trigger: 'mtg', content: '## ${1:Agenda}', scope: { type: 'global', tags: [] } }, 100)
    expect(await repository.count()).toBe(1)
    expect((await repository.search('agenda')).map(record => record.id)).toEqual([created.id])

    const updated = await repository.update(created.id, { description: 'Meeting template', tags: ['work', 'work'] }, 200)
    expect(updated.tags).toEqual(['work'])

    const used = await repository.recordUsage(created.id, 300)
    expect(used.usageCount).toBe(1)
    expect(used.lastUsedAt).toBe(300)

    await repository.replaceAll([createSnippetRecord({ id: 'replacement', updatedAt: 400 })])
    expect((await repository.list()).map(record => record.id)).toEqual(['replacement'])

    await repository.delete('replacement')
    expect(await repository.count()).toBe(0)
  })
})

describe('SnippetService', () => {
  it('filters snippets by scope and expands a matched trigger without rewriting unrelated text', async () => {
    const { table } = createSnippetTable([
      createSnippetRecord({ id: 'global', trigger: 'sig', content: 'Regards, $AUTHOR$0' }),
      createSnippetRecord({ id: 'doc', trigger: 'doc', scope: { type: 'document', articleId: 'article-1', tags: [] }, scopeType: 'document', content: '$TITLE' }),
      createSnippetRecord({ id: 'tag', trigger: 'tag', scope: { type: 'tags', tags: ['guide'] }, scopeType: 'tags', content: '$SELECTED_TEXT' }),
      createSnippetRecord({ id: 'other-doc', trigger: 'other', scope: { type: 'document', articleId: 'article-2', tags: [] }, scopeType: 'document' }),
    ])
    const service = new SnippetService(new SnippetRepository(table))
    const context = createSnippetContext()

    expect((await service.getEffectiveSnippets(context)).map(record => record.id)).toEqual(['global', 'doc', 'tag'])
    const expanded = await service.expandTrigger('Please sig', context)

    expect(expanded?.snippet.id).toBe('global')
    expect(expanded?.resolved.content).toBe('Regards, InkForge')
    expect(expanded?.match.fromOffset).toBe('Please '.length)
  })

  it('exports and imports InkForge JSON as validated local-first records', async () => {
    const { table } = createSnippetTable([createSnippetRecord({ id: 'exported' })])
    const service = new SnippetService(new SnippetRepository(table))

    const payload = await service.exportInkForgeJson()
    await service.importInkForgeJson(payload)

    expect(JSON.parse(payload)).toMatchObject({ format: 'inkforge-snippets', version: 1 })
    expect((await service.listSnippets()).map(record => record.id)).toEqual(['exported'])
  })

  it('normalizes VS Code snippet JSON into durable text snippets', async () => {
    const { table } = createSnippetTable()
    const service = new SnippetService(new SnippetRepository(table))

    const result = await service.importVSCodeJson({
      'Article header': {
        prefix: ['hdr', 'head'],
        body: ['# ${1:Title}', 'Written on $DATE'],
        description: 'Header block',
        scope: 'article,writing',
      },
    })

    expect(result.imported).toBe(2)
    expect((await service.searchSnippets('header')).map(record => record.trigger).sort()).toEqual(['hdr', 'head'].sort())
    expect((await service.searchSnippets('writing'))).toHaveLength(2)
  })
})

describe('useSnippetStore and editor extension surface', () => {
  it('surfaces service-backed state for load, search, expansion, usage, export, and import', async () => {
    const store = useSnippetStore()
    const record = createSnippetRecord({ id: 'store-snippet' })
    vi.spyOn(snippetService, 'listSnippets').mockResolvedValue([record])
    vi.spyOn(snippetService, 'searchSnippets').mockResolvedValue([record])
    vi.spyOn(snippetService, 'expandTrigger').mockResolvedValue({
      snippet: record,
      match: { snippet: record, trigger: 'sig', fromOffset: 0, toOffset: 3 },
      resolved: { content: 'Regards', tabStops: [], finalCursorOffset: 7 },
    })
    vi.spyOn(snippetService, 'recordUsage').mockResolvedValue(createSnippetRecord({ id: 'store-snippet', usageCount: 1, lastUsedAt: 200 }))
    vi.spyOn(snippetService, 'exportInkForgeJson').mockResolvedValue('{"format":"inkforge-snippets"}')
    vi.spyOn(snippetService, 'importVSCodeJson').mockResolvedValue({ imported: 1, skipped: 0, records: [record], errors: [] })

    await store.loadSnippets()
    await store.searchSnippets('sig')
    const expanded = await store.expandSnippet('sig', createSnippetContext())
    await store.recordUsage(record.id)
    const exported = await store.exportAll()
    const imported = await store.importVSCodeJson({})

    expect(store.snippetCount).toBe(1)
    expect(store.searchResults[0]).toMatchObject({ id: record.id, usageCount: 1, lastUsedAt: 200 })
    expect(expanded?.resolved.content).toBe('Regards')
    expect(store.textSnippetCount).toBe(1)
    expect(exported).toContain('inkforge-snippets')
    expect(imported.imported).toBe(1)
    expect(store.isLoading).toBe(false)
    expect(store.isSaving).toBe(false)
    expect(store.error).toBeNull()
    expect(store.lastAction?.kind).toBe('import')
  })

  it('keeps the snippet extension additive and named for TipTap integration', () => {
    expect(SnippetExpansion.name).toBe('snippetExpansion')
  })
})

describe('Snippet Dexie schema integration', () => {
  it('keeps the v18 snippet table available without removing backlinks', () => {
    expect(db.verno).toBeGreaterThanOrEqual(18)
    expect(db.snippets.name).toBe('snippets')
    expect(db.snippets.schema.idxByName.trigger).toBeDefined()
    expect(db.snippets.schema.idxByName.scopeType).toBeDefined()
    expect(db.backlinks.name).toBe('backlinks')
  })
})
