<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { Tag } from '@/services/tag-system'

const props = withDefaults(defineProps<{
  tag: Tag
  selected?: boolean
  removable?: boolean
  muted?: boolean
}>(), {
  selected: false,
  removable: false,
  muted: false,
})

const emit = defineEmits<{
  select: [tag: Tag]
  remove: [tag: Tag]
}>()
</script>

<template>
  <span
    class="tag-badge"
    :class="{ selected: props.selected, muted: props.muted, removable: props.removable }"
    :style="{ '--tag-color': props.tag.color }"
    :data-tag-id="props.tag.id"
  >
    <button
      type="button"
      class="tag-select"
      :aria-pressed="props.selected"
      :data-tag-select-id="props.tag.id"
      @click="emit('select', props.tag)"
    >
      <span class="tag-dot" />
      <span class="tag-name">{{ props.tag.name }}</span>
      <span
        v-if="props.tag.docCount >= 0"
        class="tag-count"
      >{{ props.tag.docCount }}</span>
    </button>
    <button
      v-if="props.removable"
      type="button"
      class="tag-remove"
      :aria-label="`移除标签 ${props.tag.name}`"
      :data-tag-remove-id="props.tag.id"
      @click="emit('remove', props.tag)"
    >
      <X
        :size="12"
        aria-hidden="true"
      />
    </button>
  </span>
</template>

<style scoped>
.tag-badge {
  --tag-color: #2563eb;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  border: 1px solid color-mix(in srgb, var(--tag-color) 24%, #d7dee4);
  border-radius: 999px;
  background: color-mix(in srgb, var(--tag-color) 9%, #ffffff);
  color: #24323b;
  padding: 0;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
}

.tag-badge:hover,
.tag-badge.selected {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--tag-color) 58%, #d7dee4);
  background: color-mix(in srgb, var(--tag-color) 16%, #ffffff);
}

.tag-badge.muted {
  opacity: 0.72;
}

.tag-select {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 5px 8px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.tag-badge.removable .tag-select {
  padding-right: 2px;
}

.tag-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tag-color);
  flex: 0 0 auto;
}

.tag-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-count {
  color: color-mix(in srgb, var(--tag-color) 65%, #2d3b45);
  font-size: 11px;
}

.tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #607d8b;
  cursor: pointer;
}

.tag-remove:hover {
  background: rgba(38, 50, 56, 0.09);
  color: #263238;
}
</style>
