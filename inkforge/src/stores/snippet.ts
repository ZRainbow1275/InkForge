import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { snippetService, type CreateSnippetInput, type ExpandedSnippetResult, type SnippetContext, type SnippetRecord, type SnippetImportResult, type UpdateSnippetInput } from '@/services/snippet'

export type SnippetActionKind = 'load' | 'search' | 'create' | 'update' | 'delete' | 'expand' | 'usage' | 'export' | 'import'

export const useSnippetStore = defineStore('snippet', () => {
  const snippets = ref<SnippetRecord[]>([])
  const searchResults = ref<SnippetRecord[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const lastAction = ref<{ kind: SnippetActionKind; at: number; count: number } | null>(null)

  const snippetCount = computed(() => snippets.value.length)
  const textSnippetCount = computed(() => snippets.value.filter(snippet => snippet.type === 'text').length)

  function setError(errorValue: unknown): void {
    error.value = errorValue instanceof Error ? errorValue.message : String(errorValue)
  }

  function replaceSnippetInState(record: SnippetRecord): void {
    snippets.value = [record, ...snippets.value.filter(snippet => snippet.id !== record.id)]
    searchResults.value = searchResults.value.map(snippet => snippet.id === record.id ? record : snippet)
  }

  async function loadSnippets(): Promise<SnippetRecord[]> {
    isLoading.value = true
    error.value = null
    try {
      const result = await snippetService.listSnippets()
      snippets.value = result
      lastAction.value = { kind: 'load', at: Date.now(), count: result.length }
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function searchSnippets(query: string): Promise<SnippetRecord[]> {
    isLoading.value = true
    error.value = null
    try {
      const result = await snippetService.searchSnippets(query)
      searchResults.value = result
      lastAction.value = { kind: 'search', at: Date.now(), count: result.length }
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createSnippet(input: CreateSnippetInput): Promise<SnippetRecord> {
    isSaving.value = true
    error.value = null
    try {
      const record = await snippetService.createSnippet(input)
      snippets.value = [record, ...snippets.value]
      lastAction.value = { kind: 'create', at: Date.now(), count: 1 }
      return record
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updateSnippet(id: string, patch: UpdateSnippetInput): Promise<SnippetRecord> {
    isSaving.value = true
    error.value = null
    try {
      const record = await snippetService.updateSnippet(id, patch)
      replaceSnippetInState(record)
      lastAction.value = { kind: 'update', at: Date.now(), count: 1 }
      return record
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function deleteSnippet(id: string): Promise<void> {
    isSaving.value = true
    error.value = null
    try {
      await snippetService.deleteSnippet(id)
      snippets.value = snippets.value.filter(snippet => snippet.id !== id)
      searchResults.value = searchResults.value.filter(snippet => snippet.id !== id)
      lastAction.value = { kind: 'delete', at: Date.now(), count: 1 }
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function expandSnippet(textBeforeCursor: string, context: SnippetContext): Promise<ExpandedSnippetResult | null> {
    error.value = null
    try {
      const result = await snippetService.expandTrigger(textBeforeCursor, context)
      lastAction.value = { kind: 'expand', at: Date.now(), count: result ? 1 : 0 }
      return result
    } catch (err) {
      setError(err)
      throw err
    }
  }

  async function recordUsage(id: string): Promise<SnippetRecord> {
    error.value = null
    try {
      const record = await snippetService.recordUsage(id)
      replaceSnippetInState(record)
      lastAction.value = { kind: 'usage', at: Date.now(), count: 1 }
      return record
    } catch (err) {
      setError(err)
      throw err
    }
  }

  async function exportAll(): Promise<string> {
    isLoading.value = true
    error.value = null
    try {
      const payload = await snippetService.exportInkForgeJson()
      lastAction.value = { kind: 'export', at: Date.now(), count: snippets.value.length }
      return payload
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function importInkForgeJson(input: string | unknown): Promise<SnippetImportResult> {
    isSaving.value = true
    error.value = null
    try {
      const result = await snippetService.importInkForgeJson(input)
      snippets.value = await snippetService.listSnippets()
      lastAction.value = { kind: 'import', at: Date.now(), count: result.imported }
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function importVSCodeJson(input: string | unknown): Promise<SnippetImportResult> {
    isSaving.value = true
    error.value = null
    try {
      const result = await snippetService.importVSCodeJson(input)
      snippets.value = await snippetService.listSnippets()
      lastAction.value = { kind: 'import', at: Date.now(), count: result.imported }
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  return {
    snippets,
    searchResults,
    isLoading,
    isSaving,
    error,
    lastAction,
    snippetCount,
    textSnippetCount,
    loadSnippets,
    searchSnippets,
    createSnippet,
    updateSnippet,
    deleteSnippet,
    expandSnippet,
    recordUsage,
    exportAll,
    importInkForgeJson,
    importVSCodeJson,
  }
})
