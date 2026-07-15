<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Search } from 'lucide-vue-next'
import type { Tag } from '@/services/tag-system'
import { TAG_COLOR_PRESETS } from '@/services/tag-system'
import TagBadge from './TagBadge.vue'

const props = withDefaults(defineProps<{
  modelValue: Tag[]
  suggestions: Tag[]
  disabled?: boolean
  placeholder?: string
}>(), {
  disabled: false,
  placeholder: 'Add tag or search existing tags',
})

const emit = defineEmits<{
  add: [tag: Tag, complete: () => void]
  create: [name: string, color: string, complete: () => void]
  remove: [tag: Tag]
  search: [query: string]
}>()

const query = ref('')
const color = ref(TAG_COLOR_PRESETS[0].hex)

const selectedIds = computed(() => new Set(props.modelValue.map(tag => tag.id)))
const availableSuggestions = computed(() => props.suggestions.filter(tag => !selectedIds.value.has(tag.id)).slice(0, 8))
const canCreate = computed(() => query.value.trim().length > 0 && !availableSuggestions.value.some(tag => tag.name.toLocaleLowerCase() === query.value.trim().toLocaleLowerCase()))

function updateQuery(value: string): void {
  query.value = value
  emit('search', value)
}

function addTag(tag: Tag): void {
  const submittedQuery = query.value
  emit('add', tag, () => {
    if (query.value === submittedQuery) query.value = ''
  })
}

function createTag(): void {
  const name = query.value.trim()
  if (!name) return
  const submittedQuery = query.value
  emit('create', name, color.value, () => {
    if (query.value === submittedQuery) query.value = ''
  })
}

function handleEnter(): void {
  const first = availableSuggestions.value[0]
  if (first) {
    addTag(first)
    return
  }
  if (canCreate.value) createTag()
}
</script>

<template>
  <div class="tag-input-shell">
    <div class="tag-input-selected">
      <TagBadge
        v-for="tag in modelValue"
        :key="tag.id"
        :tag="tag"
        removable
        @remove="emit('remove', $event)"
      />
      <span
        v-if="modelValue.length === 0"
        class="tag-input-empty"
      >暂无标签</span>
    </div>

    <div class="tag-input-row">
      <Search :size="14" />
      <input
        :value="query"
        :disabled="disabled"
        :placeholder="placeholder"
        aria-label="搜索或创建标签"
        data-tag-query
        @input="updateQuery(($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="handleEnter"
      >
      <select
        v-model="color"
        :disabled="disabled"
        aria-label="标签颜色"
      >
        <option
          v-for="preset in TAG_COLOR_PRESETS"
          :key="preset.hex"
          :value="preset.hex"
        >
          {{ preset.name }}
        </option>
      </select>
      <button
        type="button"
        :disabled="disabled || !canCreate"
        data-tag-create
        @click="createTag"
      >
        <Plus :size="14" />
        <span>创建</span>
      </button>
    </div>

    <div
      v-if="availableSuggestions.length > 0"
      class="tag-suggestions"
    >
      <button
        v-for="tag in availableSuggestions"
        :key="tag.id"
        type="button"
        :style="{ '--tag-color': tag.color }"
        @click="addTag(tag)"
      >
        <span class="suggestion-dot" />
        <span>{{ tag.name }}</span>
        <span class="suggestion-count">{{ tag.docCount }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tag-input-shell {
  display: grid;
  gap: 10px;
}

.tag-input-selected,
.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.tag-input-empty {
  color: #90a4ae;
  font-size: 12px;
  font-weight: 600;
}

.tag-input-row {
  display: grid;
  grid-template-columns: auto minmax(120px, 1fr);
  align-items: center;
  gap: 7px;
  padding: 7px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
}

.tag-input-row input,
.tag-input-row select {
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #263238;
  font: inherit;
  font-size: 12px;
}

.tag-input-row select,
.tag-input-row button {
  grid-column: 1 / -1;
}

.tag-input-row select {
  width: 100%;
  border-top: 1px solid #edf1f5;
  padding-top: 7px;
}

.tag-input-row button,
.tag-suggestions button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 800;
}

.tag-input-row button {
  padding: 7px 9px;
  color: #ffffff;
  background: #263238;
}

.tag-input-row button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.tag-suggestions button {
  --tag-color: #2563eb;
  padding: 6px 8px;
  color: #263238;
  background: color-mix(in srgb, var(--tag-color) 9%, #ffffff);
  border: 1px solid color-mix(in srgb, var(--tag-color) 24%, #d7dee4);
}

.suggestion-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tag-color);
}

.suggestion-count {
  color: #607d8b;
  font-size: 11px;
}
</style>
