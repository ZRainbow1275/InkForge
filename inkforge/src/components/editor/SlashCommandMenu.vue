<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Component } from 'vue'
import type { Editor } from '@tiptap/core'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Replace,
  Search,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Underline,
} from 'lucide-vue-next'
import type { SlashCommandCategory, SlashCommandItem } from '@/extensions/SlashCommands'

const props = defineProps<{
  editor: Editor | undefined
}>()

const iconMap: Record<string, Component> = {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Code,
  Superscript,
  Subscript,
  Quote,
  Code2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Minus,
  Table,
  Link2,
  ImagePlus,
  Search,
  Replace,
}

const categoryMeta: Record<SlashCommandCategory, string> = {
  heading: '标题结构',
  format: '文本格式',
  block: '块级布局',
  list: '列表与任务',
  insert: '插入内容',
  tool: '工具',
}

const active = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const filteredCommands = ref<SlashCommandItem[]>([])
const menuPosition = ref({ top: 0, left: 0 })

const groupedCommands = computed(() => {
  const groups: Array<{
    id: SlashCommandCategory
    label: string
    items: Array<{ command: SlashCommandItem; globalIndex: number }>
  }> = []
  const order: SlashCommandCategory[] = ['heading', 'format', 'block', 'list', 'insert', 'tool']

  for (const category of order) {
    const items = filteredCommands.value
      .map((command, globalIndex) => ({ command, globalIndex }))
      .filter((entry) => entry.command.category === category)

    if (items.length === 0) {
      continue
    }

    groups.push({
      id: category,
      label: categoryMeta[category],
      items,
    })
  }

  return groups
})

let pollTimer: ReturnType<typeof setInterval> | null = null

function syncFromStorage(): void {
  const storage = props.editor?.storage.slashCommands
  if (!storage) {
    active.value = false
    query.value = ''
    selectedIndex.value = 0
    filteredCommands.value = []
    return
  }

  active.value = storage.active
  query.value = storage.query
  selectedIndex.value = storage.selectedIndex
  filteredCommands.value = storage.filteredCommands
  menuPosition.value = storage.menuPosition
}

function startPolling(): void {
  pollTimer = setInterval(syncFromStorage, 50)
}

function setSelectedIndex(index: number): void {
  selectedIndex.value = index
  const storage = props.editor?.storage.slashCommands
  if (storage) {
    storage.selectedIndex = index
  }
}

function selectCommand(command: SlashCommandItem, index: number): void {
  if (!props.editor) {
    return
  }

  const storage = props.editor.storage.slashCommands
  if (!storage) {
    return
  }

  setSelectedIndex(index)

  const { tr, selection } = props.editor.state
  tr.delete(storage.triggerPos - 1, selection.from)
  props.editor.view.dispatch(tr)

  command.action(props.editor)
  storage.active = false
  storage.filteredCommands = []
  syncFromStorage()
}

onMounted(startPolling)

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<template>
  <Transition name="slash-fade">
    <div
      v-if="active && filteredCommands.length > 0"
      class="slash-menu"
      :style="{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
      }"
      @mousedown.prevent
    >
      <div class="slash-menu__header">
        <div>
          <span class="slash-menu__eyebrow">斜杠命令</span>
          <p class="slash-menu__hint">
            {{ query ? `匹配 “${query}”` : '输入关键词筛选命令' }}
          </p>
        </div>
        <span class="slash-menu__meta">Enter / Tab 执行</span>
      </div>

      <div class="slash-menu__body">
        <section
          v-for="group in groupedCommands"
          :key="group.id"
          class="slash-group"
        >
          <header class="slash-group__header">
            {{ group.label }}
          </header>
          <div class="slash-group__list">
            <button
              v-for="entry in group.items"
              :key="entry.command.id"
              class="slash-item"
              :class="{ 'is-selected': entry.globalIndex === selectedIndex }"
              type="button"
              @mouseenter="setSelectedIndex(entry.globalIndex)"
              @click="selectCommand(entry.command, entry.globalIndex)"
            >
              <span class="slash-item__icon">
                <component
                  :is="iconMap[entry.command.icon]"
                  v-if="iconMap[entry.command.icon]"
                  :size="16"
                />
              </span>
              <span class="slash-item__content">
                <span class="slash-item__label">{{ entry.command.label }}</span>
                <span class="slash-item__description">{{ entry.command.description }}</span>
              </span>
              <span
                v-if="entry.command.shortcut"
                class="slash-item__shortcut"
              >
                {{ entry.command.shortcut }}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slash-menu {
  position: absolute;
  z-index: 200;
  width: min(320px, calc(100vw - 48px));
  max-height: min(420px, calc(100vh - 120px));
  overflow-y: auto;
  border: 1px solid rgba(96, 125, 139, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(18px);
  box-shadow: 0 16px 36px rgba(38, 50, 56, 0.14), 0 2px 8px rgba(38, 50, 56, 0.08);
  padding: 8px;
}

.slash-menu__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px 12px;
  border-bottom: 1px solid rgba(96, 125, 139, 0.12);
}

.slash-menu__eyebrow {
  display: inline-flex;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #d32f2f;
}

.slash-menu__hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #607d8b;
}

.slash-menu__meta {
  flex-shrink: 0;
  font-size: 11px;
  color: #90a4ae;
}

.slash-menu__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 4px 4px;
}

.slash-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slash-group__header {
  padding: 0 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #90a4ae;
}

.slash-group__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slash-item {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.14s ease, transform 0.14s ease;
}

.slash-item:hover,
.slash-item.is-selected {
  background: rgba(211, 47, 47, 0.08);
}

.slash-item.is-selected {
  transform: translateX(2px);
}

.slash-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(236, 239, 241, 0.8);
  color: #546e7a;
}

.slash-item.is-selected .slash-item__icon {
  background: rgba(211, 47, 47, 0.12);
  color: #d32f2f;
}

.slash-item__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.slash-item__label {
  font-size: 13px;
  font-weight: 600;
  color: #263238;
}

.slash-item__description {
  font-size: 11px;
  color: #90a4ae;
}

.slash-item__shortcut {
  padding-left: 8px;
  font-size: 11px;
  color: #78909c;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  white-space: nowrap;
}

.slash-fade-enter-active,
.slash-fade-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.slash-fade-enter-from,
.slash-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.slash-menu::-webkit-scrollbar {
  width: 6px;
}

.slash-menu::-webkit-scrollbar-track {
  background: transparent;
}

.slash-menu::-webkit-scrollbar-thumb {
  background: rgba(96, 125, 139, 0.22);
  border-radius: 999px;
}

[data-theme='dark'] .slash-menu {
  background: rgba(30, 41, 59, 0.96);
  border-color: rgba(148, 163, 184, 0.18);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.36);
}

[data-theme='dark'] .slash-menu__header {
  border-bottom-color: rgba(148, 163, 184, 0.12);
}

[data-theme='dark'] .slash-menu__hint,
[data-theme='dark'] .slash-menu__meta,
[data-theme='dark'] .slash-group__header,
[data-theme='dark'] .slash-item__description,
[data-theme='dark'] .slash-item__shortcut {
  color: #94a3b8;
}

[data-theme='dark'] .slash-item__label {
  color: #f1f5f9;
}

[data-theme='dark'] .slash-item__icon {
  background: rgba(51, 65, 85, 0.92);
  color: #cbd5e1;
}

[data-theme='dark'] .slash-item:hover,
[data-theme='dark'] .slash-item.is-selected {
  background: rgba(239, 83, 80, 0.14);
}

[data-theme='dark'] .slash-item.is-selected .slash-item__icon {
  background: rgba(239, 83, 80, 0.18);
  color: #fecaca;
}
</style>
