<script setup lang="ts">
/**
 * SlashCommandMenu — 斜杠命令浮动菜单
 *
 * 通过轮询 editor.storage.slashCommands 获取状态，
 * 渲染命令列表并支持点击选择。
 */
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/core'
import {
  AlignCenter, AlignRight, ChevronDown,
  Blocks, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  Highlighter, ImagePlus, Link,
  List, ListOrdered, CheckSquare,
  MessageSquare, Minus, Palette, Pilcrow,
  Quote, Code2, RemoveFormatting, Table,
} from 'lucide-vue-next'
import type { SlashCommandCategory, SlashCommandItem } from '@/extensions/SlashCommands'

const props = defineProps<{
  editor: Editor | undefined
}>()

/** Lucide 图标名 → 组件映射 */
const iconMap: Record<string, ReturnType<typeof Heading1>> = {
  AlignCenter, AlignRight, Blocks, ChevronDown,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  Highlighter, ImagePlus, Link,
  List, ListOrdered, CheckSquare,
  MessageSquare, Minus, Palette, Pilcrow,
  Quote, Code2, RemoveFormatting, Table,
}

const categoryLabels: Record<SlashCommandCategory, string> = {
  heading: '标题',
  block: '块级',
  list: '列表',
  insert: '插入',
  advanced: '高级',
}

const categoryOrder: SlashCommandCategory[] = ['heading', 'block', 'list', 'insert', 'advanced']

type GroupedSlashCommand = {
  category: SlashCommandCategory
  label: string
  items: Array<{ command: SlashCommandItem; index: number }>
}

// ═══ 响应式状态（从 storage 同步） ═══
const active = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const filteredCommands = ref<SlashCommandItem[]>([])
const menuPosition = ref({ top: 0, left: 0 })

const groupedCommands = computed<GroupedSlashCommand[]>(() =>
  categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category],
      items: filteredCommands.value
        .map((command, index) => ({ command, index }))
        .filter((item) => item.command.category === category),
    }))
    .filter((group) => group.items.length > 0)
)

let pollTimer: ReturnType<typeof setInterval> | null = null

/**
 * 轮询 editor.storage.slashCommands 状态
 * TipTap storage 不是响应式的，需要定时同步到 Vue ref
 */
function startPolling() {
  pollTimer = setInterval(() => {
    if (!props.editor) return
    const storage = props.editor.storage.slashCommands
    if (!storage) return

    active.value = storage.active
    query.value = storage.query
    selectedIndex.value = storage.selectedIndex
    filteredCommands.value = storage.filteredCommands
    menuPosition.value = storage.menuPosition
  }, 50)
}

/**
 * 点击命令项：删除 /query 文本 → 执行命令 → 关闭菜单
 */
function setHoveredIndex(index: number): void {
  selectedIndex.value = index
  const editor = props.editor
  if (editor?.storage.slashCommands) {
    editor.storage.slashCommands.selectedIndex = index
  }
}

function selectCommand(cmd: SlashCommandItem) {
  if (!props.editor) return
  const storage = props.editor.storage.slashCommands
  if (!storage) return

  // 删除 /query 文本
  const { tr, selection } = props.editor.state
  tr.delete(storage.triggerPos - 1, selection.from)
  props.editor.view.dispatch(tr)

  // 执行命令
  cmd.action(props.editor, storage.actionContext)
  storage.active = false
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
        top: menuPosition.top + 'px',
        left: menuPosition.left + 'px',
      }"
      @mousedown.prevent
    >
      <div class="slash-menu-header">
        <span class="slash-menu-label">命令</span>
        <span
          v-if="query"
          class="slash-menu-query"
        >{{ query }}</span>
      </div>
      <div class="slash-menu-list">
        <section
          v-for="group in groupedCommands"
          :key="group.category"
          class="slash-menu-group"
        >
          <div class="slash-menu-group-label">
            {{ group.label }}
          </div>
          <button
            v-for="item in group.items"
            :key="item.command.id"
            class="slash-menu-item"
            :class="{ selected: item.index === selectedIndex }"
            @click="selectCommand(item.command)"
            @mouseenter="setHoveredIndex(item.index)"
          >
            <span class="slash-item-icon">
              <component
                :is="iconMap[item.command.icon]"
                v-if="iconMap[item.command.icon]"
                :size="16"
              />
            </span>
            <span class="slash-item-content">
              <span class="slash-item-label">{{ item.command.label }}</span>
              <span class="slash-item-desc">{{ item.command.description }}</span>
            </span>
          </button>
        </section>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slash-menu {
  position: absolute;
  z-index: 200;
  min-width: 220px;
  max-width: 280px;
  max-height: 300px;
  overflow-y: auto;
  background: var(--bg-surface);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  box-shadow: var(--elev-3);
  padding: 4px;
}

.slash-menu-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--hairline);
  margin-bottom: 4px;
}

.slash-menu-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.slash-menu-query {
  font-size: 11px;
  color: var(--ember);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.slash-menu-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.slash-menu-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.slash-menu-group + .slash-menu-group {
  border-top: 1px solid var(--hairline);
  padding-top: 4px;
}

.slash-menu-group-label {
  padding: 5px 8px 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.slash-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart);
}

.slash-menu-item:hover,
.slash-menu-item.selected {
  background: var(--bg-rice-paper);
}

.slash-menu-item.selected {
  box-shadow: inset 2px 0 0 var(--ember);
}

.slash-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.slash-menu-item.selected .slash-item-icon {
  background: var(--ember-soft);
  color: var(--ember);
}

.slash-item-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.slash-item-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.slash-item-desc {
  font-size: 11px;
  color: var(--text-muted);
}

/* Transition */
.slash-fade-enter-active {
  animation: slashAppear 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slash-fade-leave-active {
  animation: slashAppear 0.1s ease reverse;
}

@keyframes slashAppear {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 滚动条 */
.slash-menu::-webkit-scrollbar {
  width: 4px;
}

.slash-menu::-webkit-scrollbar-track {
  background: transparent;
}

.slash-menu::-webkit-scrollbar-thumb {
  background: var(--hairline);
  border-radius: 2px;
}
</style>
