<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Activity,
  Circle,
  Code2,
  Columns2,
  CornerDownLeft,
  Eye,
  FileCode,
  FileEdit,
  FilePlus,
  Focus,
  FolderOpen,
  Home,
  Keyboard,
  Loader2,
  Palette,
  PanelLeft,
  RefreshCw,
  Search,
  Send,
  Settings,
  Star,
  Target,
  Type,
  X,
  FileText,
  TextCursorInput,
} from 'lucide-vue-next'
import { useCommandPaletteStore } from '@/stores/command-palette'
import type { Command, CommandGroup, SearchResult } from '@/types/command-palette'

const emit = defineEmits<{
  'command-executed': [commandId: string]
  close: []
}>()

const store = useCommandPaletteStore()
const { isOpen, query, activeCommandId, activeCommand, groupedResults, quickSections, showQuickPanel, isLoading, lastError } = storeToRefs(store)
const overlayRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const commandIconMap: Record<string, Component> = {
  Activity,
  Circle,
  Code2,
  Columns2,
  Eye,
  FileCode,
  FileEdit,
  FilePlus,
  FileText,
  Focus,
  FolderOpen,
  Home,
  Keyboard,
  Palette,
  PanelLeft,
  RefreshCw,
  Send,
  Settings,
  Target,
  TextCursorInput,
  Type,
}

const flattenedResults = computed(() => groupedResults.value.flatMap(group => group.commands))
const displaySections = computed(() => showQuickPanel.value
  ? quickSections.value.map(section => ({
    id: section.id,
    domId: undefined,
    label: section.title,
    commands: section.commands,
  }))
  : groupedResults.value.map(group => ({
    id: group.group,
    domId: getGroupId(group.group),
    label: group.label,
    commands: group.commands,
  })))
function resolveIcon(command: Command): Component {
  return commandIconMap[command.icon] ?? Circle
}

function getGroupId(group: CommandGroup): string {
  return `command-palette-group-${group}`
}

function getOptionId(command: Command): string {
  return `command-palette-option-${command.id}`
}

function getFavoriteLabel(command: Command): string {
  return store.favorites.includes(command.id)
    ? `Remove ${command.title} from favorites`
    : `Add ${command.title} to favorites`
}

function setQuery(value: string): void {
  store.setQuery(value)
}

function handleClose(): void {
  store.close()
  emit('close')
}

async function execute(commandId: string): Promise<void> {
  await store.executeCommand(commandId)
  if (!store.lastError) {
    emit('command-executed', commandId)
    return
  }

  await nextTick()
  searchInputRef.value?.focus()
}

function focusActiveOption(): void {
  if (!activeCommandId.value) return
  const option = document.getElementById(getOptionId({ id: activeCommandId.value } as Command))
  option?.scrollIntoView({ block: 'nearest' })
}

function getPaletteFocusableElements(): HTMLElement[] {
  if (!overlayRef.value) return []
  return Array.from(overlayRef.value.querySelectorAll<HTMLElement>(
    'input:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  )).filter(element => element.getClientRects().length > 0)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    handleClose()
    return
  }

  if (event.key === 'Tab') {
    const focusableElements = getPaletteFocusableElements()
    if (!focusableElements.length) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement
    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    store.moveFocus('down')
    focusActiveOption()
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    store.moveFocus('up')
    focusActiveOption()
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    store.moveFocus('first')
    focusActiveOption()
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    store.moveFocus('last')
    focusActiveOption()
    return
  }

  if (event.key === 'Enter') {
    const target = event.target as HTMLElement | null
    if (target?.closest('.cp-close, .cp-favorite-button')) return

    event.preventDefault()
    if (activeCommandId.value) void execute(activeCommandId.value)
  }
}

function handleWindowKeydown(event: KeyboardEvent): void {
  if (!store.isOpen) return

  if (event.key === 'Escape') {
    event.preventDefault()
    handleClose()
    return
  }

  if (event.key === 'Tab' && !overlayRef.value?.contains(document.activeElement)) {
    const focusableElements = getPaletteFocusableElements()
    const target = event.shiftKey
      ? focusableElements[focusableElements.length - 1]
      : focusableElements[0]
    if (!target) return
    event.preventDefault()
    target.focus()
  }
}

function renderTitleSegments(result: SearchResult): { text: string; highlighted: boolean }[] {
  const titleMatch = result.matches.find(match => match.key === 'title')
  if (!titleMatch) {
    return [{ text: result.command.title, highlighted: false }]
  }

  const ranges = [...titleMatch.indices].sort((a, b) => a[0] - b[0])
  const segments: { text: string; highlighted: boolean }[] = []
  let cursor = 0

  for (const [start, end] of ranges) {
    if (start > cursor) {
      segments.push({ text: result.command.title.slice(cursor, start), highlighted: false })
    }
    segments.push({ text: result.command.title.slice(start, end + 1), highlighted: true })
    cursor = end + 1
  }

  if (cursor < result.command.title.length) {
    segments.push({ text: result.command.title.slice(cursor), highlighted: false })
  }

  return segments.filter(segment => segment.text.length > 0)
}

watch(isOpen, async value => {
  if (!value) return
  await nextTick()
  searchInputRef.value?.focus()
})

onMounted(() => window.addEventListener('keydown', handleWindowKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleWindowKeydown))

defineExpose({
  open: store.open,
  close: store.close,
  setQuery: store.setQuery,
})
</script>

<template>
  <Teleport to="body">
    <Transition name="cp-overlay">
      <div
        v-if="isOpen"
        ref="overlayRef"
        class="cp-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        @keydown="handleKeydown"
        @mousedown.self="handleClose"
      >
        <Transition
          name="cp-panel"
          appear
        >
          <section
            class="cp-panel"
            aria-describedby="command-palette-help"
          >
            <header class="cp-search-row">
              <Search
                class="cp-search-icon"
                :size="18"
                aria-hidden="true"
              />
              <h2
                id="command-palette-title"
                class="cp-sr-only"
              >
                Command Palette
              </h2>
              <input
                ref="searchInputRef"
                class="cp-search-input"
                type="text"
                role="searchbox"
                aria-label="Search commands"
                autocomplete="off"
                spellcheck="false"
                aria-controls="command-palette-results"
                :value="query"
                placeholder="Search commands..."
                @input="setQuery(($event.target as HTMLInputElement).value)"
              >
              <button
                class="cp-close"
                type="button"
                aria-label="Close command palette"
                @click="handleClose"
              >
                <X
                  :size="16"
                  aria-hidden="true"
                />
                <span>Esc</span>
              </button>
            </header>

            <p
              id="command-palette-help"
              class="cp-help"
            >
              Use arrow keys to navigate, Enter to run, and Escape to close.
            </p>

            <p
              id="command-palette-active-status"
              class="cp-sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {{ activeCommand ? `Selected command: ${activeCommand.title}` : 'No command selected' }}
            </p>

            <p
              v-if="lastError"
              class="cp-error"
              role="status"
            >
              {{ lastError }}
            </p>

            <div
              v-if="isLoading"
              class="cp-loading"
              role="status"
            >
              <Loader2
                class="cp-spin"
                :size="18"
                aria-hidden="true"
              />
              Executing command...
            </div>

            <div
              v-else-if="flattenedResults.length > 0"
              id="command-palette-results"
              class="cp-results"
              role="list"
              aria-label="Command results"
            >
              <section
                v-for="section in displaySections"
                :id="section.domId"
                :key="section.id"
                class="cp-group"
                role="group"
                :aria-label="section.label"
                :data-command-section="section.id"
              >
                <div class="cp-group-label">
                  {{ section.label }}
                </div>
                <div
                  v-for="(result, index) in section.commands"
                  :key="result.command.id"
                  class="cp-item-row"
                  role="listitem"
                  :style="{ '--cp-stagger-delay': `${Math.min(index * 20, 200)}ms` }"
                >
                  <button
                    :id="getOptionId(result.command)"
                    class="cp-item"
                    :class="{ active: activeCommandId === result.command.id, destructive: result.command.isDestructive }"
                    type="button"
                    :data-command-id="result.command.id"
                    @mouseenter="activeCommandId = result.command.id"
                    @focus="activeCommandId = result.command.id"
                    @click="execute(result.command.id)"
                  >
                    <component
                      :is="resolveIcon(result.command)"
                      class="cp-item-icon"
                      :size="18"
                      aria-hidden="true"
                    />
                    <span class="cp-item-copy">
                      <span class="cp-item-title">
                        <template
                          v-for="(segment, segmentIndex) in renderTitleSegments(result)"
                          :key="`${result.command.id}-${segmentIndex}`"
                        >
                          <mark
                            v-if="segment.highlighted"
                            class="cp-highlight"
                          >{{ segment.text }}</mark>
                          <span v-else>{{ segment.text }}</span>
                        </template>
                      </span>
                      <span
                        v-if="result.command.subtitle"
                        class="cp-item-subtitle"
                      >{{ result.command.subtitle }}</span>
                    </span>
                    <span
                      v-if="result.command.shortcut"
                      class="cp-shortcut"
                      tabindex="-1"
                    >{{ result.command.shortcut }}</span>
                  </button>
                  <button
                    class="cp-favorite-button"
                    type="button"
                    :aria-label="getFavoriteLabel(result.command)"
                    :aria-pressed="store.favorites.includes(result.command.id)"
                    :data-command-favorite="result.command.id"
                    @mouseenter="activeCommandId = result.command.id"
                    @focus="activeCommandId = result.command.id"
                    @click="store.toggleFavorite(result.command.id)"
                  >
                    <Star
                      class="cp-favorite"
                      :class="{ active: store.favorites.includes(result.command.id) }"
                      :size="14"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </section>
            </div>

            <div
              v-else
              class="cp-empty"
              role="status"
            >
              <Circle
                :size="20"
                aria-hidden="true"
              />
              <span>No matching command.</span>
            </div>

            <footer class="cp-footer">
              <span><CornerDownLeft
                :size="14"
                aria-hidden="true"
              /> Run</span>
              <span>Ctrl+Shift+K opens document commands</span>
            </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cp-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  background: var(--scrim);
  backdrop-filter: blur(4px);
}

.cp-panel {
  width: min(640px, calc(100vw - 32px));
  max-height: min(480px, calc(100vh - 96px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: var(--elev-3);
}

.cp-search-row {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 14px;
  border-bottom: 1px solid var(--hairline);
}

.cp-search-icon {
  color: var(--text-secondary);
}

.cp-search-input {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: 500 16px/1.4 ui-serif, Georgia, 'Times New Roman', serif;
}

.cp-search-input::placeholder {
  color: var(--text-muted);
}

.cp-close {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 8px;
  padding: 5px 8px;
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
  font: 600 12px/1 ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
}

.cp-close:hover {
  background: var(--ember-soft);
  color: var(--ember);
}

.cp-close:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.cp-help,
.cp-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.cp-results {
  overflow-y: auto;
  padding: 10px 12px 12px;
}

.cp-group + .cp-group {
  margin-top: 8px;
}

.cp-group-label {
  min-height: 28px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  color: var(--text-muted);
  font: 700 11px/1 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cp-item-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  align-items: center;
  gap: 4px;
}

.cp-item {
  width: 100%;
  min-height: 48px;
  display: grid;
  grid-template-columns: 26px 1fr auto;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 10px;
  padding: 7px 9px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  animation: cp-result-in var(--motion-instant) var(--ease-out-quart) both;
  animation-delay: var(--cp-stagger-delay, 0ms);
}

.cp-item:hover,
.cp-item.active {
  background: var(--ember-soft);
}

/* Active row gets a 2px ember rail on its leading edge (inset box-shadow keeps
   it inside the rounded corner without shifting layout). */
.cp-item.active {
  box-shadow: inset 2px 0 0 var(--ember);
}

.cp-item.destructive {
  color: var(--danger);
}

.cp-item-icon {
  color: currentColor;
  opacity: 0.84;
}

.cp-item-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cp-item-title {
  font: 700 14px/1.2 ui-sans-serif, system-ui, sans-serif;
}

.cp-item-subtitle {
  overflow: hidden;
  color: var(--text-secondary);
  font: 500 12px/1.2 ui-sans-serif, system-ui, sans-serif;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-shortcut {
  border-radius: 6px;
  padding: 4px 6px;
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
  font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.cp-favorite {
  color: var(--text-muted);
  opacity: 0.55;
  pointer-events: none;
}

.cp-favorite.active {
  color: var(--ember);
  opacity: 1;
  fill: currentColor;
}

.cp-favorite-button {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.cp-favorite-button:hover {
  background: var(--ember-soft);
}

.cp-favorite-button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.cp-highlight {
  background: transparent;
  color: var(--ember);
  font-weight: 800;
}

.cp-error,
.cp-loading,
.cp-empty {
  margin: 12px;
  border-radius: 10px;
  padding: 12px;
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
  font: 600 13px/1.4 ui-sans-serif, system-ui, sans-serif;
}

.cp-error {
  background: var(--danger-soft);
  color: var(--danger);
}

.cp-loading,
.cp-empty {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cp-spin {
  animation: cp-spin 800ms linear infinite;
}

.cp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--hairline);
  padding: 8px 14px;
  color: var(--text-muted);
  font: 600 11px/1 ui-sans-serif, system-ui, sans-serif;
}

.cp-footer span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

/* "↵ Run" affordance — the primary footer action gets an ember glyph so the
   eye lands on the run hint. */
.cp-footer span:first-child {
  color: var(--ember);
}

.cp-overlay-enter-active {
  transition: opacity var(--motion-instant) var(--ease-out-quart);
}

.cp-overlay-leave-active {
  transition: opacity var(--motion-fast) var(--ease-out-quart);
}

.cp-overlay-enter-from,
.cp-overlay-leave-to {
  opacity: 0;
}

.cp-panel-enter-active {
  transition: opacity var(--motion-instant) var(--ease-out-quart), transform var(--motion-instant) var(--ease-out-quart);
}

.cp-panel-leave-active {
  transition: opacity var(--motion-fast) var(--ease-out-quart), transform var(--motion-fast) var(--ease-out-quart);
}

.cp-panel-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.cp-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes cp-result-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cp-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-contrast: high) {
  .cp-panel,
  .cp-item.active {
    outline: 2px solid currentColor;
  }
}

@media (max-width: 640px) {
  .cp-overlay {
    padding-top: 8vh;
  }

  .cp-panel {
    max-height: calc(100vh - 48px);
  }

  .cp-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
