import { computed, onBeforeUnmount, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue'
import type { Editor } from '@tiptap/core'
import { useTocStore } from '@/stores/toc'
import type { TocHeading } from '@/services/toc'

export type OutlineItem = TocHeading

export function useOutline(editorRef: Ref<Editor | undefined> | ShallowRef<Editor | undefined> | ComputedRef<Editor | undefined>) {
  const tocStore = useTocStore()

  let updateTimer: ReturnType<typeof setTimeout> | null = null
  let selectionTimer: ReturnType<typeof setTimeout> | null = null
  let unbindUpdate: (() => void) | null = null
  let unbindSelectionUpdate: (() => void) | null = null

  const outline = computed(() => tocStore.headings)
  const activeId = computed(() => tocStore.activeHeadingId)

  function extractOutline(): void {
    tocStore.updateFromEditor(editorRef.value)
  }

  function updateActiveItem(): void {
    const editor = editorRef.value
    if (!editor || editor.isDestroyed) {
      tocStore.setActiveHeading(null)
      return
    }
    tocStore.setActiveByPosition(editor.state.selection.from)
  }

  function debouncedExtract(): void {
    if (updateTimer !== null) clearTimeout(updateTimer)
    updateTimer = setTimeout(() => {
      extractOutline()
      updateTimer = null
    }, 300)
  }

  function debouncedSelectionUpdate(): void {
    if (selectionTimer !== null) clearTimeout(selectionTimer)
    selectionTimer = setTimeout(() => {
      updateActiveItem()
      selectionTimer = null
    }, 100)
  }

  function bindEditorEvents(editor: Editor): void {
    unbindEditorEvents()
    editor.on('update', debouncedExtract)
    editor.on('selectionUpdate', debouncedSelectionUpdate)
    unbindUpdate = () => editor.off('update', debouncedExtract)
    unbindSelectionUpdate = () => editor.off('selectionUpdate', debouncedSelectionUpdate)
    extractOutline()
    updateActiveItem()
  }

  function unbindEditorEvents(): void {
    unbindUpdate?.()
    unbindSelectionUpdate?.()
    unbindUpdate = null
    unbindSelectionUpdate = null
  }

  function scrollToHeading(position: number): void {
    const editor = editorRef.value
    if (!editor || editor.isDestroyed) return
    editor.chain().focus().setTextSelection(position).scrollIntoView().run()
    const active = tocStore.setActiveByPosition(position)
    if (active) tocStore.setActiveHeading(active.id)
  }

  function toggleCollapse(id: string): void {
    tocStore.toggleCollapsed(id)
  }

  function isCollapsed(id: string): boolean {
    return tocStore.isCollapsed(id)
  }

  watch(
    () => editorRef.value,
    (newEditor, oldEditor) => {
      if (oldEditor && !oldEditor.isDestroyed) unbindEditorEvents()
      if (newEditor && !newEditor.isDestroyed) {
        bindEditorEvents(newEditor)
      } else {
        tocStore.updateFromEditor(null)
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    unbindEditorEvents()
    if (updateTimer !== null) clearTimeout(updateTimer)
    if (selectionTimer !== null) clearTimeout(selectionTimer)
  })

  return {
    outline,
    activeId,
    scrollToHeading,
    toggleCollapse,
    isCollapsed,
  }
}
