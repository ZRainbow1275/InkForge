<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { OutlineItem } from '@/composables/useOutline'

defineOptions({ name: 'OutlineTreeNode' })

const props = defineProps<{
  item: OutlineItem
  activeId: string | null
  isCollapsed: (id: string) => boolean
}>()

const emit = defineEmits<{
  (event: 'select', item: OutlineItem): void
  (event: 'toggle', id: string): void
}>()

function selectItem(): void {
  emit('select', props.item)
}

function toggleItem(): void {
  emit('toggle', props.item.id)
}
</script>

<template>
  <li class="outline-node">
    <div
      class="outline-item"
      :class="[`level-${item.level}`, { active: activeId === item.id }]"
      :style="{ '--outline-depth': String(item.depth) }"
      :aria-current="activeId === item.id ? 'location' : undefined"
      @click="selectItem"
    >
      <button
        v-if="item.children.length > 0"
        class="collapse-btn"
        :aria-expanded="!isCollapsed(item.id)"
        :aria-label="isCollapsed(item.id) ? 'Expand heading' : 'Collapse heading'"
        @click.stop="toggleItem"
      >
        <ChevronRight
          :size="12"
          class="collapse-icon"
          :class="{ expanded: !isCollapsed(item.id) }"
        />
      </button>
      <span
        v-else
        class="collapse-placeholder"
      />
      <span
        v-if="item.numbering"
        class="outline-number"
      >{{ item.numbering }}</span>
      <span
        class="outline-text"
        :title="item.text || '(empty heading)'"
      >
        {{ item.text || '(empty heading)' }}
      </span>
    </div>

    <ul
      v-if="item.children.length > 0 && !isCollapsed(item.id)"
      class="outline-children"
    >
      <OutlineTreeNode
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :active-id="activeId"
        :is-collapsed="isCollapsed"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
.outline-node {
  margin: 0;
  padding: 0;
}

.outline-children {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.outline-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  padding-left: calc(8px + var(--outline-depth, 0) * 16px);
  border-radius: 6px;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;
  border-left: 2px solid transparent;
  user-select: none;
}

.outline-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.outline-item.active {
  border-left-color: #D32F2F;
  background: rgba(211, 47, 47, 0.06);
}

.outline-item.level-1 .outline-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text, #1f2937);
}

.outline-item.level-2 .outline-text {
  font-size: 13px;
  font-weight: 650;
  color: var(--color-text, #1f2937);
}

.outline-item.level-3 .outline-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #4b5563);
}

.outline-item.level-4 .outline-text,
.outline-item.level-5 .outline-text,
.outline-item.level-6 .outline-text {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-secondary, #6b7280);
}

.outline-number {
  flex-shrink: 0;
  min-width: 18px;
  font-size: 11px;
  color: var(--color-text-secondary, #9ca3af);
  font-variant-numeric: tabular-nums;
}

.outline-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  color: var(--color-text-secondary, #9ca3af);
  transition: color 150ms ease, background 150ms ease;
}

.collapse-btn:hover {
  color: var(--color-text, #1f2937);
  background: rgba(0, 0, 0, 0.06);
}

.collapse-icon {
  transition: transform 150ms ease;
}

.collapse-icon.expanded {
  transform: rotate(90deg);
}

.collapse-placeholder {
  display: inline-block;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
</style>
