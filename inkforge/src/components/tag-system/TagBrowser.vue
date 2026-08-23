<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Filter, Settings, Tags } from 'lucide-vue-next'
import { useArticleStore } from '@/stores/article'
import { useTagStore } from '@/stores/tags'
import type { Tag } from '@/services/tag-system'
import TagBadge from './TagBadge.vue'
import TagInput from './TagInput.vue'
import TagManagerModal from './TagManagerModal.vue'

const props = defineProps<{
  requestArticleSelection: (articleId: string) => Promise<boolean>
}>()

const articleStore = useArticleStore()
const tagStore = useTagStore()
const { selectedArticle, selectedArticleId } = storeToRefs(articleStore)

const localSearch = ref('')
const showManager = ref(false)
const actionMessage = ref<string | null>(null)

const currentDocTags = computed(() => {
  const docId = selectedArticleId.value
  return docId ? tagStore.docTagsByDocId[docId] ?? [] : []
})

const suggestions = computed(() => tagStore.suggestions(localSearch.value, currentDocTags.value.map(tag => tag.id)))
const selectedTagSet = computed(() => new Set(tagStore.selectedTagIds))

async function runTagAction(
  action: () => Promise<string | null>,
  complete?: () => void,
): Promise<void> {
  actionMessage.value = null
  try {
    actionMessage.value = await action()
    complete?.()
  } catch {
    return
  }
}

async function refreshSelectedDocTags(): Promise<void> {
  if (!selectedArticleId.value) return
  await tagStore.getDocTags(selectedArticleId.value)
}

async function refreshArticles(): Promise<void> {
  await articleStore.loadArticles()
}

async function initializeTags(): Promise<void> {
  await tagStore.loadTags()
  await refreshSelectedDocTags()
}

async function handleCreateTag(name: string, color: string, complete: () => void): Promise<void> {
  const docId = selectedArticleId.value
  if (!docId) return
  await runTagAction(async () => {
    const tag = await tagStore.createTag({ name, color })
    await tagStore.addTagToDoc(docId, tag.id)
    await refreshArticles()
    return `已创建并添加标签：${tag.name}`
  }, complete)
}

async function handleAddTag(tag: Tag, complete: () => void): Promise<void> {
  const docId = selectedArticleId.value
  if (!docId) return
  await runTagAction(async () => {
    await tagStore.addTagToDoc(docId, tag.id)
    await refreshArticles()
    return `已添加标签：${tag.name}`
  }, complete)
}

async function handleRemoveTag(tag: Tag): Promise<void> {
  const docId = selectedArticleId.value
  if (!docId) return
  await runTagAction(async () => {
    await tagStore.removeTagFromDoc(docId, tag.id)
    await refreshArticles()
    return `已移除标签：${tag.name}`
  })
}

async function handleFilter(): Promise<void> {
  await runTagAction(async () => {
    const documents = await tagStore.filterDocumentsBySelection()
    return `已找到 ${documents.length} 篇文稿`
  })
}

async function handleSelectDocument(id: string): Promise<void> {
  await runTagAction(async () => {
    if (await props.requestArticleSelection(id)) {
      await refreshSelectedDocTags()
    }
    return null
  })
}

async function handleManagerUpdate(
  id: string,
  patch: { name?: string; color?: string },
  complete: () => void,
): Promise<void> {
  await runTagAction(async () => {
    await tagStore.updateTag(id, patch)
    await refreshSelectedDocTags()
    await refreshArticles()
    return '标签已更新'
  }, complete)
}

async function handleManagerDelete(id: string): Promise<void> {
  await runTagAction(async () => {
    await tagStore.deleteTag(id)
    await refreshSelectedDocTags()
    await refreshArticles()
    return '标签已删除'
  })
}

async function handleManagerMerge(
  targetId: string,
  sourceIds: string[],
  complete: () => void,
): Promise<void> {
  await runTagAction(async () => {
    await tagStore.mergeTags({ targetId, sourceIds })
    await refreshSelectedDocTags()
    await refreshArticles()
    await tagStore.filterDocumentsBySelection()
    return '标签已合并'
  }, complete)
}

async function handleCleanup(): Promise<void> {
  await runTagAction(async () => {
    const count = await tagStore.cleanupOrphans()
    return `已清理 ${count} 个孤立标签`
  })
}

onMounted(() => {
  void initializeTags().catch(() => undefined)
})

watch(selectedArticleId, () => {
  void refreshSelectedDocTags().catch(() => undefined)
})
</script>

<template>
  <section
    class="tag-browser-panel"
    data-tag-browser
  >
    <header class="tag-browser-head">
      <div>
        <p>标签系统</p>
        <h3>文稿标签</h3>
      </div>
      <button
        type="button"
        class="manager-button"
        data-tag-manager-open
        @click="showManager = true"
      >
        <Settings :size="15" />
        <span>管理</span>
      </button>
    </header>

    <div class="tag-browser-scroll">
      <div
        v-if="tagStore.error"
        class="tag-error"
        role="alert"
        data-tag-error
      >
        {{ tagStore.error }}
      </div>
      <div
        v-else-if="actionMessage"
        class="tag-success"
        role="status"
        data-tag-success
      >
        {{ actionMessage }}
      </div>

      <section class="tag-browser-group current-doc-section">
        <div class="section-title">
          <Tags :size="15" />
          <span>{{ selectedArticle?.title ?? '尚未选择文稿' }}</span>
        </div>
        <TagInput
          :model-value="currentDocTags"
          :suggestions="suggestions"
          :disabled="!selectedArticleId || tagStore.isSaving"
          placeholder="搜索或创建此文稿的标签"
          @search="localSearch = $event"
          @create="handleCreateTag"
          @add="handleAddTag"
          @remove="handleRemoveTag"
        />
      </section>

      <section class="tag-browser-group">
        <div class="section-title split">
          <span>全部标签</span>
          <span>共 {{ tagStore.tagCount }} 个</span>
        </div>
        <input
          class="tag-search"
          :value="tagStore.searchQuery"
          placeholder="筛选标签"
          @input="tagStore.setSearchQuery(($event.target as HTMLInputElement).value)"
        >
        <div
          class="tag-list"
          data-tag-all-list
        >
          <TagBadge
            v-for="tag in tagStore.visibleTags"
            :key="tag.id"
            :tag="tag"
            :selected="selectedTagSet.has(tag.id)"
            @select="tagStore.toggleSelectTag($event.id)"
          />
          <p
            v-if="tagStore.visibleTags.length === 0"
            class="empty-copy"
          >
            当前筛选条件下没有匹配的标签。
          </p>
        </div>
      </section>

      <section class="tag-browser-group filter-section">
        <div class="section-title">
          <Filter :size="15" />
          <span>标签筛选</span>
        </div>
        <div class="filter-toolbar">
          <div
            class="filter-mode-switch"
            role="group"
            aria-label="标签匹配方式"
          >
            <button
              type="button"
              :class="{ active: tagStore.filterMode === 'OR' }"
              :aria-pressed="tagStore.filterMode === 'OR'"
              data-tag-filter-mode="OR"
              @click="tagStore.setFilterMode('OR')"
            >
              任一匹配
            </button>
            <button
              type="button"
              :class="{ active: tagStore.filterMode === 'AND' }"
              :aria-pressed="tagStore.filterMode === 'AND'"
              data-tag-filter-mode="AND"
              @click="tagStore.setFilterMode('AND')"
            >
              全部匹配
            </button>
          </div>
          <div class="filter-actions">
            <button
              type="button"
              class="filter-apply"
              :disabled="tagStore.selectedTagIds.length === 0 || tagStore.isLoading"
              data-tag-filter-apply
              @click="handleFilter"
            >
              应用筛选
            </button>
            <button
              type="button"
              class="filter-clear"
              :disabled="tagStore.selectedTagIds.length === 0"
              @click="tagStore.clearSelectedTags()"
            >
              清除
            </button>
          </div>
        </div>
        <div class="filtered-docs">
          <button
            v-for="doc in tagStore.filteredDocuments"
            :key="doc.id"
            type="button"
            :data-tag-filtered-doc-id="doc.id"
            @click="handleSelectDocument(doc.id)"
          >
            <span>{{ doc.title }}</span>
            <small>{{ new Date(doc.updatedAt).toLocaleDateString() }}</small>
          </button>
          <p
            v-if="tagStore.selectedTagIds.length > 0 && tagStore.filteredDocuments.length === 0"
            class="empty-copy"
          >
            应用筛选后将列出匹配的文稿。
          </p>
        </div>
      </section>
    </div>

    <TagManagerModal
      :open="showManager"
      :tags="tagStore.tags"
      :busy="tagStore.isSaving"
      :error="tagStore.error"
      @close="showManager = false"
      @update="handleManagerUpdate"
      @delete="handleManagerDelete"
      @merge="handleManagerMerge"
      @cleanup="handleCleanup"
    />
  </section>
</template>

<style scoped>
.tag-browser-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg-rice-paper);
}

.tag-browser-head,
.section-title,
.filtered-docs button {
  display: flex;
  align-items: center;
}

.tag-browser-head {
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
  min-height: 58px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--hairline);
  background: var(--bg-surface);
}

.tag-browser-head p,
.tag-browser-head h3,
.empty-copy {
  margin: 0;
}

.tag-browser-head p {
  color: var(--ember);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.tag-browser-head h3 {
  margin-top: 4px;
  color: var(--text-primary);
  font-size: 17px;
}

.manager-button,
.filter-toolbar button,
.filtered-docs button {
  border: 0;
  cursor: pointer;
  font-weight: 800;
}

.manager-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  padding: 0 10px;
  color: var(--text-secondary);
  background: var(--bg-surface);
}

.tag-browser-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 12px 14px;
}

.tag-error,
.tag-success {
  border-radius: 12px;
  padding: 9px 10px;
  font-size: 12px;
  font-weight: 700;
}

.tag-error {
  color: #991b1b;
  background: #fee2e2;
}

.tag-success {
  color: #166534;
  background: #dcfce7;
}

.tag-browser-group {
  display: grid;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid var(--hairline);
}

.tag-browser-group:last-child {
  border-bottom: 0;
}

.section-title {
  justify-content: flex-start;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 900;
}

.section-title.split {
  justify-content: space-between;
}

.section-title.split span:last-child {
  color: var(--text-muted);
  font-weight: 700;
}

.tag-search {
  width: 100%;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  padding: 9px 10px;
  color: var(--text-primary);
  background: var(--bg-surface);
  outline: none;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.filter-toolbar {
  display: grid;
  gap: 8px;
}

.filter-mode-switch,
.filter-actions {
  display: grid;
  gap: 4px;
}

.filter-mode-switch {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 3px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  background: var(--bg-rice-paper);
}

.filter-actions {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.filter-toolbar button {
  min-height: 34px;
  border-radius: 8px;
  padding: 0 10px;
  color: var(--text-secondary);
  background: transparent;
}

.filter-mode-switch button.active {
  color: var(--ember);
  background: var(--bg-surface);
  box-shadow: var(--elev-1);
}

.filter-actions .filter-apply {
  color: #fff;
  background: var(--ember);
}

.filter-actions .filter-clear {
  border: 1px solid var(--hairline);
  color: var(--text-secondary);
  background: var(--bg-surface);
}

.filter-toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.manager-button:hover,
.filter-mode-switch button:hover:not(:disabled),
.filter-actions .filter-clear:hover:not(:disabled) {
  border-color: var(--ember-border);
  color: var(--text-primary);
}

.filtered-docs {
  display: grid;
  gap: 7px;
}

.filtered-docs button {
  justify-content: space-between;
  gap: 10px;
  border-radius: 13px;
  padding: 10px;
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--hairline);
  text-align: left;
}

.filtered-docs small {
  color: var(--text-muted);
  white-space: nowrap;
}

.empty-copy {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.manager-button:focus-visible,
.filter-toolbar button:focus-visible,
.filtered-docs button:focus-visible,
.tag-search:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
