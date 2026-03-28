<script setup lang="ts">
/**
 * SlashCommandMenu — 斜杠命令浮动菜单
 *
 * 通过轮询 editor.storage.slashCommands 获取状态，
 * 渲染命令列表并支持点击选择。
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/core'
import {
  Heading1, Heading2, Heading3,
  Quote, Code2, Minus,
  List, ListOrdered, CheckSquare,
  Table, ImagePlus,
} from 'lucide-vue-next'
import type { SlashCommandItem } from '@/extensions/SlashCommands'

const props = defineProps<{
  editor: Editor | undefined
}>()

/** Lucide 图标名 → 组件映射 */
const iconMap: Record<string, ReturnType<typeof Heading1>> = {
  Heading1, Heading2, Heading3,
  Quote, Code2, Minus,
  List, ListOrdered, CheckSquare,
  Table, ImagePlus,
}

// ═══ 响应式状态（从 storage 同步） ═══
const active = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const filteredCommands = ref<SlashCommandItem[]>([])
const menuPosition = ref({ top: 0, left: 0 })

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
function selectCommand(cmd: SlashCommandItem) {
  if (!props.editor) return
  const storage = props.editor.storage.slashCommands
  if (!storage) return

  // 删除 /query 文本
  const { tr, selection } = props.editor.state
  tr.delete(storage.triggerPos - 1, selection.from)
  props.editor.view.dispatch(tr)

  // 执行命令
  cmd.action(props.editor)
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
        <button
          v-for="(cmd, index) in filteredCommands"
          :key="cmd.id"
          class="slash-menu-item"
          :class="{ selected: index === selectedIndex }"
          @click="selectCommand(cmd)"
          @mouseenter="selectedIndex = index"
        >
          <span class="slash-item-icon">
            <component
              :is="iconMap[cmd.icon]"
              v-if="iconMap[cmd.icon]"
              :size="16"
            />
          </span>
          <span class="slash-item-content">
            <span class="slash-item-label">{{ cmd.label }}</span>
            <span class="slash-item-desc">{{ cmd.description }}</span>
          </span>
        </button>
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
  background: #FFFFFF;
  border: 1px solid #ECEFF1;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 4px;
}

.slash-menu-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid #F5F5F5;
  margin-bottom: 4px;
}

.slash-menu-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #90A4AE;
}

.slash-menu-query {
  font-size: 11px;
  color: #D32F2F;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.slash-menu-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
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
  transition: all 0.1s ease;
}

.slash-menu-item:hover,
.slash-menu-item.selected {
  background: #FFEBEE;
}

.slash-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #FAFBFC;
  color: #607D8B;
  flex-shrink: 0;
}

.slash-menu-item.selected .slash-item-icon {
  background: rgba(211, 47, 47, 0.1);
  color: #D32F2F;
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
  color: #263238;
}

.slash-item-desc {
  font-size: 11px;
  color: #90A4AE;
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
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}
</style>
