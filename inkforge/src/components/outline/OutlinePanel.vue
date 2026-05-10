<script setup lang="ts">
import { computed } from 'vue'
import { List } from 'lucide-vue-next'
import type { Editor } from '@tiptap/core'
import { useOutline, type OutlineItem } from '@/composables/useOutline'
import OutlineTreeNode from './OutlineTreeNode.vue'

const props = defineProps<{
  editor?: Editor
}>()

const editorRef = computed(() => props.editor)
const { outline, activeId, scrollToHeading, toggleCollapse, isCollapsed } = useOutline(editorRef)
const isEmpty = computed(() => outline.value.length === 0)

function handleItemClick(item: OutlineItem): void {
  scrollToHeading(item.pos)
}
</script>

<template>
  <aside class="outline-panel">
    <div class="outline-header">
      <List :size="14" />
      <span class="outline-header-text">大纲</span>
    </div>

    <div
      v-if="isEmpty"
      class="outline-empty"
    >
      <p class="outline-empty-text">
        暂无标题。使用 <code>#</code>、<code>##</code> 或更深层级的 Markdown 标题后，将自动生成实时大纲。
      </p>
    </div>

    <nav
      v-else
      class="outline-tree"
      aria-label="文稿大纲"
    >
      <ul class="outline-list">
        <OutlineTreeNode
          v-for="item in outline"
          :key="item.id"
          :item="item"
          :active-id="activeId"
          :is-collapsed="isCollapsed"
          @select="handleItemClick"
          @toggle="toggleCollapse"
        />
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
.outline-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #FAFBFC;
  overflow: hidden;
}

.outline-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 12px;
  color: var(--color-text-secondary, #6b7280);
  user-select: none;
}

.outline-header-text {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.outline-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.outline-empty-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary, #9ca3af);
  text-align: center;
}

.outline-empty-text code {
  display: inline-block;
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: #D32F2F;
}

.outline-tree {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 8px 16px;
}

.outline-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.outline-tree::-webkit-scrollbar {
  width: 4px;
}

.outline-tree::-webkit-scrollbar-track {
  background: transparent;
}

.outline-tree::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 2px;
}

.outline-tree::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}
</style>
