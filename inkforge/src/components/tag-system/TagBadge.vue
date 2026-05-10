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
  <button
    type="button"
    class="tag-badge"
    :class="{ selected: props.selected, muted: props.muted, removable: props.removable }"
    :style="{ '--tag-color': props.tag.color }"
    @click="emit('select', props.tag)"
  >
    <span class="tag-dot" />
    <span class="tag-name">{{ props.tag.name }}</span>
    <span
      v-if="props.tag.docCount >= 0"
      class="tag-count"
    >{{ props.tag.docCount }}</span>
    <span
      v-if="props.removable"
      class="tag-remove"
      role="button"
      tabindex="0"
      :aria-label="`Remove ${props.tag.name}`"
      @click.stop="emit('remove', props.tag)"
      @keydown.enter.stop.prevent="emit('remove', props.tag)"
      @keydown.space.stop.prevent="emit('remove', props.tag)"
    >
      <X :size="12" />
    </span>
  </button>
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
  padding: 5px 8px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
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
  border-radius: 50%;
  color: #607d8b;
}

.tag-remove:hover {
  background: rgba(38, 50, 56, 0.09);
  color: #263238;
}
</style>
