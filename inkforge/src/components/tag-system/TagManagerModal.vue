<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, GitMerge, Pencil, Trash2, X } from 'lucide-vue-next'
import type { Tag } from '@/services/tag-system'
import { TAG_COLOR_PRESETS } from '@/services/tag-system'
import TagBadge from './TagBadge.vue'

const props = defineProps<{
  open: boolean
  tags: Tag[]
  busy: boolean
}>()

const emit = defineEmits<{
  close: []
  update: [id: string, patch: { name?: string; color?: string }]
  delete: [id: string]
  merge: [targetId: string, sourceIds: string[]]
  cleanup: []
}>()

const editingId = ref<string | null>(null)
const editName = ref('')
const editColor = ref<string>(TAG_COLOR_PRESETS[0].hex)
const targetId = ref('')
const sourceIds = ref<string[]>([])

const sortedTags = computed(() => [...props.tags].sort((a, b) => b.docCount - a.docCount || a.name.localeCompare(b.name)))
const mergeTargets = computed(() => sortedTags.value.filter(tag => !sourceIds.value.includes(tag.id)))
const mergeSources = computed(() => sortedTags.value.filter(tag => tag.id !== targetId.value))

watch(() => props.open, open => {
  if (!open) return
  editingId.value = null
  sourceIds.value = []
  targetId.value = props.tags[0]?.id ?? ''
})

function startEdit(tag: Tag): void {
  editingId.value = tag.id
  editName.value = tag.name
  editColor.value = tag.color
}

function saveEdit(id: string): void {
  emit('update', id, { name: editName.value, color: editColor.value })
  editingId.value = null
}

function toggleSource(id: string): void {
  sourceIds.value = sourceIds.value.includes(id)
    ? sourceIds.value.filter(sourceId => sourceId !== id)
    : [...sourceIds.value, id]
  if (sourceIds.value.includes(targetId.value)) targetId.value = mergeTargets.value[0]?.id ?? ''
}

function requestMerge(): void {
  if (!targetId.value || sourceIds.value.length === 0) return
  emit('merge', targetId.value, sourceIds.value)
  sourceIds.value = []
}
</script>

<template>
  <div
    v-if="open"
    class="tag-manager-backdrop"
  >
    <section class="tag-manager-modal">
      <header class="tag-manager-head">
        <div>
          <p>标签管理</p>
          <h3>重命名、合并并清理真实标签</h3>
        </div>
        <button
          type="button"
          class="ghost-btn"
          @click="emit('close')"
        >
          <X :size="16" />
        </button>
      </header>

      <div class="tag-manager-grid">
        <section class="tag-manager-section">
          <h4>全部标签</h4>
          <div class="tag-manager-list">
            <article
              v-for="tag in sortedTags"
              :key="tag.id"
              class="tag-manager-row"
            >
              <template v-if="editingId === tag.id">
                <input
                  v-model="editName"
                  :disabled="busy"
                  maxlength="50"
                >
                <select
                  v-model="editColor"
                  :disabled="busy"
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
                  class="icon-action"
                  :disabled="busy"
                  @click="saveEdit(tag.id)"
                >
                  <Check :size="14" />
                </button>
              </template>
              <template v-else>
                <TagBadge
                  :tag="tag"
                  muted
                />
                <div class="row-actions">
                  <button
                    type="button"
                    class="icon-action"
                    :disabled="busy"
                    @click="startEdit(tag)"
                  >
                    <Pencil :size="14" />
                  </button>
                  <button
                    type="button"
                    class="icon-action danger"
                    :disabled="busy"
                    @click="emit('delete', tag.id)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </template>
            </article>
            <p
              v-if="sortedTags.length === 0"
              class="empty-copy"
            >
              还没有任何标签。
            </p>
          </div>
        </section>

        <section class="tag-manager-section">
          <h4>合并标签</h4>
          <label class="field-label">
            目标标签
            <select
              v-model="targetId"
              :disabled="busy || mergeTargets.length === 0"
            >
              <option
                v-for="tag in mergeTargets"
                :key="tag.id"
                :value="tag.id"
              >{{ tag.name }}</option>
            </select>
          </label>
          <div class="merge-source-list">
            <button
              v-for="tag in mergeSources"
              :key="tag.id"
              type="button"
              :class="{ active: sourceIds.includes(tag.id) }"
              :disabled="busy"
              @click="toggleSource(tag.id)"
            >
              {{ tag.name }}
            </button>
          </div>
          <button
            type="button"
            class="primary-action"
            :disabled="busy || !targetId || sourceIds.length === 0"
            @click="requestMerge"
          >
            <GitMerge :size="15" />
            合并所选标签到目标
          </button>
          <button
            type="button"
            class="secondary-action"
            :disabled="busy"
            @click="emit('cleanup')"
          >
            移除零引用孤立标签
          </button>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tag-manager-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(8px);
}

.tag-manager-modal {
  width: min(860px, 100%);
  max-height: min(760px, 92vh);
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border-radius: 24px;
  background: #fbfcfd;
  border: 1px solid rgba(203, 213, 225, 0.84);
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.28);
}

.tag-manager-head,
.tag-manager-grid,
.tag-manager-row,
.row-actions {
  display: flex;
  align-items: center;
}

.tag-manager-head {
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.tag-manager-head p,
.tag-manager-head h3,
.tag-manager-section h4,
.empty-copy {
  margin: 0;
}

.tag-manager-head p {
  color: #d32f2f;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.tag-manager-head h3 {
  margin-top: 4px;
  color: #263238;
  font-size: 20px;
}

.tag-manager-grid {
  align-items: stretch;
  gap: 18px;
  min-height: 0;
  overflow: auto;
  padding: 20px;
}

.tag-manager-section {
  flex: 1 1 0;
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  padding: 16px;
}

.tag-manager-list,
.merge-source-list {
  display: grid;
  gap: 9px;
}

.tag-manager-row {
  justify-content: space-between;
  gap: 10px;
  padding: 9px;
  border-radius: 14px;
  background: #f8fafc;
}

.tag-manager-row input,
.tag-manager-row select,
.field-label select {
  min-width: 0;
  border: 1px solid #dbe3ea;
  border-radius: 10px;
  padding: 8px;
  color: #263238;
  background: #ffffff;
}

.row-actions {
  gap: 6px;
}

.ghost-btn,
.icon-action,
.primary-action,
.secondary-action,
.merge-source-list button {
  border: 0;
  cursor: pointer;
  font-weight: 800;
}

.ghost-btn,
.icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: #eef2f6;
  color: #263238;
}

.icon-action.danger {
  color: #b91c1c;
}

.field-label {
  display: grid;
  gap: 6px;
  color: #607d8b;
  font-size: 12px;
  font-weight: 800;
}

.merge-source-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.merge-source-list button {
  border-radius: 999px;
  padding: 8px 10px;
  color: #455a64;
  background: #f1f5f9;
}

.merge-source-list button.active {
  color: #ffffff;
  background: #263238;
}

.primary-action,
.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 13px;
  padding: 10px 12px;
}

.primary-action {
  color: #ffffff;
  background: #263238;
}

.secondary-action {
  color: #263238;
  background: #edf2f7;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.empty-copy {
  color: #90a4ae;
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 760px) {
  .tag-manager-grid {
    flex-direction: column;
  }
}
</style>
