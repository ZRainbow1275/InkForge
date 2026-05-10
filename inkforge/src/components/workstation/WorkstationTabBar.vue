<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { AlertTriangle, FileText, Loader2, Pin, PinOff, RotateCcw, X } from 'lucide-vue-next'
import type { WorkstationTab, WorkstationTabSaveState } from '@/stores/workstationTabs'

export interface WorkstationTabBarItem extends WorkstationTab {
  saveState: WorkstationTabSaveState
}

const props = defineProps<{
  tabs: WorkstationTabBarItem[]
  activeTabId: string | null
  recentlyClosedCount: number
}>()

const emit = defineEmits<{
  activate: [tabId: string]
  close: [tabId: string]
  togglePin: [tabId: string]
  restoreClosed: []
  reorder: [payload: { draggedTabId: string; targetTabId: string; position: 'before' | 'after' }]
}>()

const scrollContainerRef = ref<HTMLElement | null>(null)
const tabRefs = ref<HTMLElement[]>([])
const draggedTabId = ref<string | null>(null)
const dragOverTabId = ref<string | null>(null)
const dragInsertPosition = ref<'before' | 'after'>('after')

interface HorizontalWheelEvent extends Event {
  deltaX: number
  deltaY: number
}

function getTabLabel(tab: WorkstationTabBarItem): string {
  const statusText = tab.saveState === 'saving'
    ? 'Saving'
    : tab.saveState === 'error'
      ? 'Save failed'
      : 'Saved'
  return `${tab.title} - ${statusText}`
}

function handleWheel(event: HorizontalWheelEvent): void {
  const container = scrollContainerRef.value
  if (!container || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
    return
  }

  event.preventDefault()
  container.scrollLeft += event.deltaY
}

function handleTabKeydown(event: KeyboardEvent, tabId: string): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('activate', tabId)
    return
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    emit('close', tabId)
  }
}

function handleAuxClick(event: MouseEvent, tabId: string): void {
  if (event.button !== 1) {
    return
  }

  event.preventDefault()
  emit('close', tabId)
}

function handleDragStart(event: DragEvent, tabId: string): void {
  draggedTabId.value = tabId
  event.dataTransfer?.setData('text/plain', tabId)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handleDragOver(event: DragEvent, tabId: string): void {
  if (!draggedTabId.value || draggedTabId.value === tabId) {
    return
  }

  event.preventDefault()
  const target = event.currentTarget as HTMLElement
  const bounds = target.getBoundingClientRect()
  dragOverTabId.value = tabId
  dragInsertPosition.value = event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after'
}

function clearDragState(): void {
  draggedTabId.value = null
  dragOverTabId.value = null
  dragInsertPosition.value = 'after'
}

function handleDrop(event: DragEvent, targetTabId: string): void {
  event.preventDefault()
  const sourceTabId = event.dataTransfer?.getData('text/plain') || draggedTabId.value
  if (sourceTabId && sourceTabId !== targetTabId) {
    emit('reorder', {
      draggedTabId: sourceTabId,
      targetTabId,
      position: dragInsertPosition.value,
    })
  }
  clearDragState()
}

function scrollActiveTabIntoView(): void {
  const activeIndex = props.tabs.findIndex(tab => tab.id === props.activeTabId)
  const activeEl = tabRefs.value[activeIndex]
  activeEl?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

watch(
  () => [props.activeTabId, props.tabs.map(tab => `${tab.id}:${tab.title}:${tab.isPinned}`).join('|')],
  async () => {
    await nextTick()
    scrollActiveTabIntoView()
  },
  { immediate: true },
)
</script>

<template>
  <nav
    class="workstation-tabbar"
    aria-label="Open documents"
  >
    <div
      ref="scrollContainerRef"
      class="workstation-tabbar__scroll"
      role="tablist"
      aria-label="Open Workstation documents"
      @wheel="handleWheel"
    >
      <div
        v-for="tab in tabs"
        :key="tab.id"
        ref="tabRefs"
        class="workstation-tabbar__tab"
        :class="{
          'workstation-tabbar__tab--active': tab.id === activeTabId,
          'workstation-tabbar__tab--pinned': tab.isPinned,
          'workstation-tabbar__tab--dragging': draggedTabId === tab.id,
          'workstation-tabbar__tab--drag-before': dragOverTabId === tab.id && dragInsertPosition === 'before',
          'workstation-tabbar__tab--drag-after': dragOverTabId === tab.id && dragInsertPosition === 'after',
          'workstation-tabbar__tab--saving': tab.saveState === 'saving',
          'workstation-tabbar__tab--error': tab.saveState === 'error',
        }"
        role="tab"
        :aria-selected="tab.id === activeTabId"
        :aria-controls="`workstation-document-${tab.articleId}`"
        :aria-label="getTabLabel(tab)"
        :tabindex="tab.id === activeTabId ? 0 : -1"
        :title="tab.title"
        draggable="true"
        :data-tab-id="tab.id"
        @click="emit('activate', tab.id)"
        @keydown="handleTabKeydown($event, tab.id)"
        @auxclick="handleAuxClick($event, tab.id)"
        @dragstart="handleDragStart($event, tab.id)"
        @dragover="handleDragOver($event, tab.id)"
        @drop="handleDrop($event, tab.id)"
        @dragend="clearDragState"
      >
        <FileText
          class="workstation-tabbar__icon"
          aria-hidden="true"
          :size="15"
        />
        <span
          class="workstation-tabbar__state"
          aria-hidden="true"
        >
          <Loader2
            v-if="tab.saveState === 'saving'"
            class="workstation-tabbar__spinner"
            :size="13"
          />
          <AlertTriangle
            v-else-if="tab.saveState === 'error'"
            :size="13"
          />
        </span>
        <span
          v-if="!tab.isPinned"
          class="workstation-tabbar__title"
        >{{ tab.title }}</span>
        <span
          v-else
          class="workstation-tabbar__pinned-label"
        >Pinned</span>
        <button
          type="button"
          class="workstation-tabbar__pin"
          :aria-label="tab.isPinned ? `Unpin ${tab.title}` : `Pin ${tab.title}`"
          @click.stop="emit('togglePin', tab.id)"
        >
          <PinOff
            v-if="tab.isPinned"
            :size="13"
            aria-hidden="true"
          />
          <Pin
            v-else
            :size="13"
            aria-hidden="true"
          />
        </button>
        <button
          v-if="!tab.isPinned"
          type="button"
          class="workstation-tabbar__close"
          :aria-label="`Close ${tab.title}`"
          @click.stop="emit('close', tab.id)"
        >
          <X
            :size="14"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>

    <button
      type="button"
      class="workstation-tabbar__restore"
      :disabled="recentlyClosedCount === 0"
      :title="recentlyClosedCount > 0 ? 'Restore recently closed tab (Ctrl+Shift+T)' : 'No recently closed tabs'"
      aria-label="Restore recently closed tab"
      @click="emit('restoreClosed')"
    >
      <RotateCcw
        :size="15"
        aria-hidden="true"
      />
    </button>
  </nav>
</template>

<style scoped>
.workstation-tabbar {
  height: 42px;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
  border: none;
  border-top: 3px solid #D32F2F;
  border-radius: 12px;
  box-shadow:
    0 6px 20px -6px rgba(38, 50, 56, 0.18),
    0 2px 6px rgba(38, 50, 56, 0.08);
  z-index: 9;
}

.workstation-tabbar__scroll {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-inline: contain;
  scroll-padding-inline: 32px;
  scrollbar-width: none;
}

.workstation-tabbar__scroll::-webkit-scrollbar {
  display: none;
}

.workstation-tabbar__tab {
  position: relative;
  min-width: 0;
  max-width: 220px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #607D8B;
  font-size: 12px;
  font-weight: 500;
  cursor: default;
  user-select: none;
  transition: background 0.16s ease, color 0.16s ease;
}

.workstation-tabbar__tab:hover {
  background: rgba(207, 216, 220, 0.32);
  color: #455A64;
}

.workstation-tabbar__tab:focus-visible {
  outline: 2px solid rgba(211, 47, 47, 0.55);
  outline-offset: 2px;
  box-shadow: none;
}

.workstation-tabbar__tab--active {
  background: rgba(211, 47, 47, 0.10);
  color: #D32F2F;
  font-weight: 600;
}

.workstation-tabbar__tab--pinned {
  min-width: 32px;
  max-width: 32px;
  justify-content: center;
  padding: 0 6px;
}

.workstation-tabbar__tab--dragging {
  opacity: 0.48;
}

.workstation-tabbar__tab--drag-before::before,
.workstation-tabbar__tab--drag-after::after {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 2px;
  border-radius: 999px;
  background: #D32F2F;
}

.workstation-tabbar__tab--drag-before::before {
  left: -4px;
}

.workstation-tabbar__tab--drag-after::after {
  right: -4px;
}

.workstation-tabbar__icon,
.workstation-tabbar__state {
  flex-shrink: 0;
}

.workstation-tabbar__state {
  width: 13px;
  height: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: transparent;
}

.workstation-tabbar__tab--saving .workstation-tabbar__state {
  color: #7a7167;
}

.workstation-tabbar__tab--error .workstation-tabbar__state {
  color: #d32f2f;
}

.workstation-tabbar__spinner {
  animation: workstation-tabbar-spin 0.9s linear infinite;
}

.workstation-tabbar__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workstation-tabbar__pinned-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.workstation-tabbar__pin,
.workstation-tabbar__close,
.workstation-tabbar__restore {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: currentColor;
  opacity: 0.58;
  cursor: pointer;
  transition: background 0.16s ease, opacity 0.16s ease;
}

.workstation-tabbar__pin:hover,
.workstation-tabbar__close:hover,
.workstation-tabbar__restore:hover:not(:disabled) {
  background: rgba(96, 125, 139, 0.16);
  opacity: 1;
}

.workstation-tabbar__pin:focus-visible,
.workstation-tabbar__close:focus-visible,
.workstation-tabbar__restore:focus-visible {
  outline: 2px solid rgba(211, 47, 47, 0.55);
  outline-offset: 2px;
}

.workstation-tabbar__tab--pinned .workstation-tabbar__pin {
  position: static;
  width: 18px;
  height: 18px;
  background: transparent;
  border: none;
  opacity: 0.6;
}

.workstation-tabbar__tab--pinned:hover .workstation-tabbar__pin,
.workstation-tabbar__tab--pinned:focus-within .workstation-tabbar__pin {
  opacity: 1;
}

.workstation-tabbar__restore {
  width: 26px;
  height: 26px;
  align-self: center;
  margin-top: 0;
  border: none;
  background: transparent;
  color: #607D8B;
}

.workstation-tabbar__restore:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

@keyframes workstation-tabbar-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-color-scheme: dark) {
  .workstation-tabbar {
    background: rgba(26, 34, 45, 0.92);
    backdrop-filter: blur(8px) saturate(140%);
    -webkit-backdrop-filter: blur(8px) saturate(140%);
    border-top-color: #EF5350;
  }

  .workstation-tabbar__tab {
    color: #90A4AE;
  }

  .workstation-tabbar__tab:hover {
    background: rgba(207, 216, 220, 0.12);
    color: #CFD8DC;
  }

  .workstation-tabbar__tab--active {
    color: #EF9A9A;
    background: rgba(239, 83, 80, 0.18);
  }

  .workstation-tabbar__pin:hover,
  .workstation-tabbar__close:hover,
  .workstation-tabbar__restore:hover:not(:disabled) {
    background: rgba(207, 216, 220, 0.14);
  }

  .workstation-tabbar__restore {
    color: #90A4AE;
  }

  .workstation-tabbar__tab--drag-before::before,
  .workstation-tabbar__tab--drag-after::after {
    background: #EF5350;
  }
}
</style>