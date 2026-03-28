<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ListX, X, XCircle } from 'lucide-vue-next'

export interface EditorTab {
    id: string
    title: string
    isDirty: boolean
    isActive: boolean
}

interface TabBarProps {
    tabs: EditorTab[]
    activeTabId: string | null
}

interface TabBarEmits {
    (e: 'select', tabId: string): void
    (e: 'close', tabId: string): void
    (e: 'close-others', tabId: string): void
    (e: 'close-all'): void
    (e: 'reorder', fromIndex: number, toIndex: number): void
}

const props = defineProps<TabBarProps>()
const emit = defineEmits<TabBarEmits>()

const draggingTabId = ref<string | null>(null)
const contextMenu = ref<{
    visible: boolean
    tabId: string | null
    x: number
    y: number
} | null>(null)

const tabIds = computed(() => props.tabs.map((tab) => tab.id))

function selectTab(tabId: string): void {
    emit('select', tabId)
}

function closeTab(tabId: string): void {
    emit('close', tabId)
    closeContextMenu()
}

function closeOtherTabs(tabId: string): void {
    emit('close-others', tabId)
    closeContextMenu()
}

function closeAllTabs(): void {
    emit('close-all')
    closeContextMenu()
}

function handleDragStart(event: DragEvent, tabId: string): void {
    draggingTabId.value = tabId
    event.dataTransfer?.setData('text/plain', tabId)
    event.dataTransfer?.setData('application/x-inkforge-tab-id', tabId)
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
    }
}

function handleDrop(event: DragEvent, targetTabId: string): void {
    event.preventDefault()

    const sourceTabId = event.dataTransfer?.getData('application/x-inkforge-tab-id') ?? draggingTabId.value
    draggingTabId.value = null

    if (!sourceTabId || sourceTabId === targetTabId) {
        return
    }

    const fromIndex = tabIds.value.indexOf(sourceTabId)
    const toIndex = tabIds.value.indexOf(targetTabId)

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return
    }

    emit('reorder', fromIndex, toIndex)
}

function openContextMenu(event: MouseEvent, tabId: string): void {
    event.preventDefault()
    contextMenu.value = {
        visible: true,
        tabId,
        x: event.clientX,
        y: event.clientY,
    }
}

function closeContextMenu(): void {
    contextMenu.value = null
}

function handleDocumentClick(event: MouseEvent): void {
    if (!contextMenu.value) {
        return
    }

    const target = event.target as Node
    const menuElement = document.querySelector('.tab-context-menu')

    if (menuElement?.contains(target)) {
        return
    }

    closeContextMenu()
}

function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
        closeContextMenu()
    }
}

onMounted(() => {
    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    document.removeEventListener('click', handleDocumentClick)
    document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    v-if="tabs.length > 0"
    class="tab-bar-shell"
  >
    <div class="tab-bar">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: tab.id === activeTabId }"
        draggable="true"
        @click="selectTab(tab.id)"
        @contextmenu="openContextMenu($event, tab.id)"
        @dragover.prevent
        @dragstart="handleDragStart($event, tab.id)"
        @dragend="draggingTabId = null"
        @drop="handleDrop($event, tab.id)"
      >
        <span
          v-if="tab.isDirty"
          class="tab-dirty-dot"
        />
        <span class="tab-title">{{ tab.title }}</span>
        <button
          type="button"
          class="tab-close"
          title="关闭标签"
          @click.stop="closeTab(tab.id)"
        >
          <X :size="12" />
        </button>
      </div>
    </div>

    <div
      v-if="contextMenu?.visible && contextMenu.tabId"
      class="tab-context-menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
    >
      <button
        type="button"
        class="tab-context-item"
        @click.stop="closeTab(contextMenu.tabId)"
      >
        <X :size="12" />
        <span>关闭</span>
      </button>
      <button
        type="button"
        class="tab-context-item"
        @click.stop="closeOtherTabs(contextMenu.tabId)"
      >
        <XCircle :size="12" />
        <span>关闭其他</span>
      </button>
      <button
        type="button"
        class="tab-context-item"
        @click.stop="closeAllTabs"
      >
        <ListX :size="12" />
        <span>关闭全部</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tab-bar-shell {
    position: relative;
    flex-shrink: 0;
}

.tab-bar-shell::before,
.tab-bar-shell::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 20px;
    z-index: 1;
    pointer-events: none;
}

.tab-bar-shell::before {
    left: 0;
    background: linear-gradient(to right, var(--bg-rice-paper, #FAFBFC), transparent);
}

.tab-bar-shell::after {
    right: 0;
    background: linear-gradient(to left, var(--bg-rice-paper, #FAFBFC), transparent);
}

.tab-bar {
    display: flex;
    align-items: stretch;
    height: 36px;
    background: var(--bg-rice-paper, #FAFBFC);
    border-bottom: 1px solid var(--border, #E5E7EB);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    position: relative;
}

.tab-bar::-webkit-scrollbar {
    display: none;
}

.tab-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    min-width: 100px;
    max-width: 180px;
    border-right: 1px solid var(--border, #E5E7EB);
    background: transparent;
    cursor: pointer;
    transition: background 150ms ease;
    position: relative;
    flex-shrink: 0;
}

.tab-item:hover {
    background: rgba(0, 0, 0, 0.03);
}

.tab-item.active {
    background: var(--bg-surface, #FFFFFF);
    border-bottom: 2px solid var(--accent-primary, #D32F2F);
}

.tab-title {
    font-size: 12px;
    color: var(--text-secondary, #607D8B);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
}

.tab-item.active .tab-title {
    color: var(--text-primary, #263238);
    font-weight: 600;
}

.tab-dirty-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #F57C00;
    flex-shrink: 0;
}

.tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 3px;
    border: none;
    background: transparent;
    color: var(--text-muted, #90A4AE);
    cursor: pointer;
    opacity: 0;
    transition: all 150ms ease;
    flex-shrink: 0;
}

.tab-item:hover .tab-close {
    opacity: 1;
}

.tab-close:hover {
    background: rgba(0, 0, 0, 0.08);
    color: var(--text-primary, #263238);
}

.tab-context-menu {
    position: fixed;
    z-index: 200;
    min-width: 132px;
    padding: 4px;
    border: 1px solid var(--border, #E5E7EB);
    border-radius: 10px;
    background: var(--bg-surface, #FFFFFF);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.tab-context-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-primary, #263238);
    cursor: pointer;
    font-size: 12px;
    text-align: left;
}

.tab-context-item:hover {
    background: var(--bg-rice-paper, #FAFBFC);
}
</style>
