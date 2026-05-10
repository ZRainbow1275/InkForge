import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_ACCOUNT_ID, useAccountStore } from '@/stores/account'
import { articleRepository } from '@/services/repository'
import {
  TAG_COLOR_PRESETS,
  computeTagCloudNodes,
  tagRepository,
  type CreateTagParams,
  type MergeTagsParams,
  type Tag,
  type TagCloudNode,
  type TagFilterMode,
  type TagSortDirection,
  type TagSortField,
  type UpdateTagParams,
} from '@/services/tag-system'
import type { Article } from '@/types'

export type TagActionKind = 'load' | 'create' | 'update' | 'delete' | 'merge' | 'cleanup' | 'assign' | 'remove' | 'filter' | 'backfill'

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase()
}

export const useTagStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])
  const selectedTagIds = ref<string[]>([])
  const filterMode = ref<TagFilterMode>('OR')
  const searchQuery = ref('')
  const sortField = ref<TagSortField>('docCount')
  const sortDirection = ref<TagSortDirection>('desc')
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const docTagsByDocId = ref<Record<string, Tag[]>>({})
  const filteredDocuments = ref<Article[]>([])
  const lastAction = ref<{ kind: TagActionKind; at: number; count: number } | null>(null)

  const accountId = computed(() => useAccountStore().currentAccount?.id ?? DEFAULT_ACCOUNT_ID)

  const tagCount = computed(() => tags.value.length)
  const selectedTags = computed(() => selectedTagIds.value.map(id => tags.value.find(tag => tag.id === id)).filter((tag): tag is Tag => tag !== undefined))

  const sortedTags = computed(() => {
    const direction = sortDirection.value === 'asc' ? 1 : -1
    return [...tags.value].sort((a, b) => {
      if (sortField.value === 'name') return a.name.localeCompare(b.name) * direction
      if (sortField.value === 'createdAt') return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction
      return (a.docCount - b.docCount) * direction || a.name.localeCompare(b.name)
    })
  })

  const visibleTags = computed(() => {
    const query = normalizeSearchQuery(searchQuery.value)
    if (!query) return sortedTags.value
    return sortedTags.value.filter(tag => tag.name.toLocaleLowerCase().includes(query))
  })

  const tagCloudNodes = computed<TagCloudNode[]>(() => computeTagCloudNodes(
    [...tags.value].filter(tag => tag.docCount > 0).sort((a, b) => b.docCount - a.docCount).slice(0, 50),
  ))

  const suggestions = computed(() => (query: string, excludeIds: string[] = []) => {
    const normalized = normalizeSearchQuery(query)
    const excluded = new Set(excludeIds)
    return tags.value
      .filter(tag => !excluded.has(tag.id))
      .filter(tag => !normalized || tag.name.toLocaleLowerCase().includes(normalized))
      .sort((a, b) => b.docCount - a.docCount || a.name.localeCompare(b.name))
      .slice(0, 12)
  })

  function setError(value: unknown): void {
    error.value = errorToMessage(value)
  }

  function rememberAction(kind: TagActionKind, count: number): void {
    lastAction.value = { kind, at: Date.now(), count }
  }

  function replaceTagInState(tag: Tag): void {
    tags.value = [tag, ...tags.value.filter(item => item.id !== tag.id)]
  }

  async function loadTags(nextAccountId = accountId.value): Promise<Tag[]> {
    isLoading.value = true
    error.value = null
    try {
      await tagRepository.backfillFromArticleTags(nextAccountId)
      const loaded = await tagRepository.listTags(nextAccountId)
      tags.value = loaded
      rememberAction('load', loaded.length)
      return loaded
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createTag(params: Omit<CreateTagParams, 'accountId'> & { accountId?: string }): Promise<Tag> {
    isSaving.value = true
    error.value = null
    try {
      const created = await tagRepository.createTag({ ...params, accountId: params.accountId ?? accountId.value })
      replaceTagInState(created)
      rememberAction('create', 1)
      return created
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updateTag(id: string, params: UpdateTagParams): Promise<Tag> {
    isSaving.value = true
    error.value = null
    try {
      const updated = await tagRepository.updateTag(id, params)
      replaceTagInState(updated)
      rememberAction('update', 1)
      return updated
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function deleteTag(id: string): Promise<void> {
    isSaving.value = true
    error.value = null
    try {
      await tagRepository.deleteTag(id)
      tags.value = tags.value.filter(tag => tag.id !== id)
      selectedTagIds.value = selectedTagIds.value.filter(tagId => tagId !== id)
      rememberAction('delete', 1)
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function mergeTags(params: MergeTagsParams): Promise<void> {
    isSaving.value = true
    error.value = null
    try {
      await tagRepository.mergeTags(params)
      await loadTags()
      selectedTagIds.value = selectedTagIds.value.filter(id => !params.sourceIds.includes(id))
      if (!selectedTagIds.value.includes(params.targetId)) selectedTagIds.value = [...selectedTagIds.value, params.targetId]
      rememberAction('merge', params.sourceIds.length)
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function cleanupOrphans(): Promise<number> {
    isSaving.value = true
    error.value = null
    try {
      const count = await tagRepository.cleanupOrphans(accountId.value)
      await loadTags()
      rememberAction('cleanup', count)
      return count
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function addTagToDoc(docId: string, tagId: string): Promise<void> {
    isSaving.value = true
    error.value = null
    try {
      await tagRepository.addTagToDoc(docId, tagId)
      docTagsByDocId.value = { ...docTagsByDocId.value, [docId]: await tagRepository.getDocTags(docId) }
      await loadTags()
      rememberAction('assign', 1)
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function removeTagFromDoc(docId: string, tagId: string): Promise<void> {
    isSaving.value = true
    error.value = null
    try {
      await tagRepository.removeTagFromDoc(docId, tagId)
      docTagsByDocId.value = { ...docTagsByDocId.value, [docId]: await tagRepository.getDocTags(docId) }
      await loadTags()
      rememberAction('remove', 1)
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function getDocTags(docId: string): Promise<Tag[]> {
    error.value = null
    try {
      const result = await tagRepository.getDocTags(docId)
      docTagsByDocId.value = { ...docTagsByDocId.value, [docId]: result }
      return result
    } catch (err) {
      setError(err)
      throw err
    }
  }

  function toggleSelectTag(id: string): void {
    selectedTagIds.value = selectedTagIds.value.includes(id)
      ? selectedTagIds.value.filter(tagId => tagId !== id)
      : [...selectedTagIds.value, id]
  }

  function clearSelectedTags(): void {
    selectedTagIds.value = []
    filteredDocuments.value = []
  }

  function setFilterMode(mode: TagFilterMode): void {
    filterMode.value = mode
  }

  function setSearchQuery(query: string): void {
    searchQuery.value = query
  }

  function setSort(field: TagSortField, direction: TagSortDirection): void {
    sortField.value = field
    sortDirection.value = direction
  }

  async function filterDocumentsBySelection(): Promise<Article[]> {
    isLoading.value = true
    error.value = null
    try {
      const docIds = await tagRepository.filterDocsByTags(selectedTagIds.value, filterMode.value)
      const docs = await Promise.all(docIds.map(id => articleRepository.findById(id)))
      filteredDocuments.value = docs.filter((article): article is Article => article !== undefined)
      rememberAction('filter', filteredDocuments.value.length)
      return filteredDocuments.value
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function backfillFromArticleTags(): Promise<{ created: number; relations: number }> {
    isSaving.value = true
    error.value = null
    try {
      const result = await tagRepository.backfillFromArticleTags(accountId.value)
      await loadTags()
      rememberAction('backfill', result.created + result.relations)
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  return {
    tags,
    selectedTagIds,
    filterMode,
    searchQuery,
    sortField,
    sortDirection,
    isLoading,
    isSaving,
    error,
    docTagsByDocId,
    filteredDocuments,
    lastAction,
    accountId,
    tagCount,
    selectedTags,
    sortedTags,
    visibleTags,
    tagCloudNodes,
    suggestions,
    colorPresets: TAG_COLOR_PRESETS,
    loadTags,
    createTag,
    updateTag,
    deleteTag,
    mergeTags,
    cleanupOrphans,
    addTagToDoc,
    removeTagFromDoc,
    getDocTags,
    toggleSelectTag,
    clearSelectedTags,
    setFilterMode,
    setSearchQuery,
    setSort,
    filterDocumentsBySelection,
    backfillFromArticleTags,
  }
})
