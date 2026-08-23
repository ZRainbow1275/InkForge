<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, Plus, Search } from 'lucide-vue-next'
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
      <label class="tag-query-field">
        <Search
          :size="14"
          aria-hidden="true"
        />
        <input
          :value="query"
          :disabled="disabled"
          :placeholder="placeholder"
          aria-label="搜索或创建标签"
          data-tag-query
          @input="updateQuery(($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="handleEnter"
        >
      </label>
      <div class="tag-input-actions">
        <label
          class="tag-color-control"
          :class="{ 'is-disabled': disabled }"
          :style="{ '--tag-color': color }"
        >
          <span
            class="tag-color-swatch"
            aria-hidden="true"
          />
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
          <ChevronDown
            :size="14"
            aria-hidden="true"
          />
        </label>
        <button
          type="button"
          class="tag-create-button"
          :disabled="disabled || !canCreate"
          data-tag-create
          @click="createTag"
        >
          <Plus :size="14" />
          <span>创建</span>
        </button>
      </div>
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
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.tag-input-row {
  display: grid;
  gap: 8px;
}

.tag-query-field {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  color: var(--text-muted);
  background: var(--bg-surface);
}

.tag-query-field input {
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 12px;
}

.tag-input-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  min-width: 0;
}

.tag-color-control {
  --tag-color: var(--ember);

  position: relative;
  display: grid;
  align-items: center;
  min-width: 0;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  color: var(--text-secondary);
  background: var(--bg-surface);
}

.tag-color-control select {
  width: 100%;
  min-width: 0;
  min-height: 34px;
  padding: 0 28px 0 30px;
  border: 0;
  outline: none;
  appearance: none;
  color: var(--text-primary);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.tag-color-control.is-disabled {
  opacity: 0.55;
}

.tag-color-control select:disabled {
  cursor: not-allowed;
}

.tag-color-swatch {
  position: absolute;
  left: 10px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--tag-color);
  pointer-events: none;
}

.tag-color-control svg {
  position: absolute;
  right: 8px;
  color: var(--text-muted);
  pointer-events: none;
}

.tag-create-button,
.tag-suggestions button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 800;
}

.tag-create-button {
  justify-content: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  color: #fff;
  background: var(--ember);
}

.tag-create-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.tag-suggestions button {
  --tag-color: #2563eb;
  padding: 6px 8px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--tag-color) 9%, var(--bg-surface));
  border: 1px solid color-mix(in srgb, var(--tag-color) 24%, var(--hairline));
}

.suggestion-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tag-color);
}

.suggestion-count {
  color: var(--text-muted);
  font-size: 11px;
}

.tag-query-field:focus-within,
.tag-color-control:focus-within,
.tag-create-button:focus-visible,
.tag-suggestions button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
