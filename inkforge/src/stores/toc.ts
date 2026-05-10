import type { Editor } from '@tiptap/core'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { tocService, type TocHeading, type TocNumbering, type TocParseOptions, type TocUpdateSummary } from '@/services/toc'

export const useTocStore = defineStore('toc', () => {
  const headings = ref<TocHeading[]>([])
  const flatHeadings = ref<TocHeading[]>([])
  const activeHeadingId = ref<string | null>(null)
  const collapsedIds = ref<Set<string>>(new Set())
  const maxDepth = ref<1 | 2 | 3 | 4 | 5 | 6>(6)
  const numbering = ref<TocNumbering>('none')
  const error = ref<string | null>(null)
  const lastUpdated = ref<number | null>(null)

  const headingCount = computed(() => flatHeadings.value.length)
  const hasHeadings = computed(() => headingCount.value > 0)

  function options(overrides: TocParseOptions = {}): TocParseOptions {
    return { maxDepth: maxDepth.value, numbering: numbering.value, ...overrides }
  }

  function pruneCollapsedIds(nextFlat: TocHeading[]): void {
    const ids = new Set(nextFlat.map(heading => heading.id))
    collapsedIds.value = new Set(Array.from(collapsedIds.value).filter(id => ids.has(id)))
  }

  function applyResult(tree: TocHeading[], flat: TocHeading[], parsedAt: number): TocUpdateSummary {
    headings.value = tree
    flatHeadings.value = flat
    pruneCollapsedIds(flat)
    if (activeHeadingId.value && !flat.some(heading => heading.id === activeHeadingId.value)) {
      activeHeadingId.value = null
    }
    lastUpdated.value = parsedAt
    return { total: flat.length, visible: flat.length, activeHeadingId: activeHeadingId.value, parsedAt }
  }

  function setError(errorValue: unknown): void {
    error.value = errorValue instanceof Error ? errorValue.message : String(errorValue)
  }

  function updateFromMarkdown(markdown: string, overrides: TocParseOptions = {}): TocUpdateSummary {
    error.value = null
    try {
      const result = tocService.parseMarkdown(markdown, options(overrides))
      return applyResult(result.tree, result.flat, result.parsedAt)
    } catch (err) {
      setError(err)
      throw err
    }
  }

  function updateFromEditor(editor: Editor | null | undefined, overrides: TocParseOptions = {}): TocUpdateSummary {
    error.value = null
    if (!editor || editor.isDestroyed) {
      return applyResult([], [], Date.now())
    }
    try {
      const result = tocService.parseEditorDoc(editor.state.doc, options(overrides))
      return applyResult(result.tree, result.flat, result.parsedAt)
    } catch (err) {
      setError(err)
      throw err
    }
  }

  function setActiveHeading(id: string | null): void {
    activeHeadingId.value = id
  }

  function setActiveByPosition(position: number): TocHeading | null {
    const active = tocService.findActive(flatHeadings.value, position)
    activeHeadingId.value = active?.id ?? null
    return active
  }

  function toggleCollapsed(id: string): void {
    const next = new Set(collapsedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    collapsedIds.value = next
  }

  function isCollapsed(id: string): boolean {
    return collapsedIds.value.has(id)
  }

  function expandAll(): void {
    collapsedIds.value = new Set()
  }

  function collapseAll(): void {
    collapsedIds.value = new Set(flatHeadings.value.map(heading => heading.id))
  }

  function setOptions(next: { maxDepth?: 1 | 2 | 3 | 4 | 5 | 6; numbering?: TocNumbering }): void {
    if (next.maxDepth) maxDepth.value = next.maxDepth
    if (next.numbering) numbering.value = next.numbering
  }

  return {
    headings,
    flatHeadings,
    activeHeadingId,
    collapsedIds,
    maxDepth,
    numbering,
    error,
    lastUpdated,
    headingCount,
    hasHeadings,
    updateFromMarkdown,
    updateFromEditor,
    setActiveHeading,
    setActiveByPosition,
    toggleCollapsed,
    isCollapsed,
    expandAll,
    collapseAll,
    setOptions,
  }
})
