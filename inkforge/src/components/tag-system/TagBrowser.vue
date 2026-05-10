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

async function handleCreateTag(name: string, color: string): Promise<void> {
  if (!selectedArticleId.value) return
  const tag = await tagStore.createTag({ name, color })
  await tagStore.addTagToDoc(selectedArticleId.value, tag.id)
  await refreshArticles()
  actionMessage.value = `已创建并添加标签：${tag.name}`
}

async function handleAddTag(tag: Tag): Promise<void> {
  if (!selectedArticleId.value) return
  await tagStore.addTagToDoc(selectedArticleId.value, tag.id)
  await refreshArticles()
  actionMessage.value = `已添加标签：${tag.name}`
}

async function handleRemoveTag(tag: Tag): Promise<void> {
  if (!selectedArticleId.value) return
  await tagStore.removeTagFromDoc(selectedArticleId.value, tag.id)
  await refreshArticles()
  actionMessage.value = `已移除标签：${tag.name}`
}

async function handleFilter(): Promise<void> {
  await tagStore.filterDocumentsBySelection()
}

async function handleSelectDocument(id: string): Promise<void> {
  articleStore.selectArticle(id)
  await refreshSelectedDocTags()
}

async function handleManagerUpdate(id: string, patch: { name?: string; color?: string }): Promise<void> {
  await tagStore.updateTag(id, patch)
  await refreshSelectedDocTags()
  await refreshArticles()
  actionMessage.value = '标签已更新'
}

async function handleManagerDelete(id: string): Promise<void> {
  await tagStore.deleteTag(id)
  await refreshSelectedDocTags()
  await refreshArticles()
  actionMessage.value = '标签已删除'
}

async function handleManagerMerge(targetId: string, sourceIds: string[]): Promise<void> {
  await tagStore.mergeTags({ targetId, sourceIds })
  await refreshSelectedDocTags()
  await refreshArticles()
  await handleFilter()
  actionMessage.value = '标签已合并'
}

async function handleCleanup(): Promise<void> {
  const count = await tagStore.cleanupOrphans()
  actionMessage.value = `已清理 ${count} 个孤立标签`
}

onMounted(() => {
  void initializeTags()
})

watch(selectedArticleId, () => {
  void refreshSelectedDocTags()
})
</script>

<template>
  <section class="tag-browser-panel">
    <header class="tag-browser-head">
      <div>
        <p>标签系统</p>
        <h3>文稿标签</h3>
      </div>
      <button
        type="button"
        class="manager-button"
        @click="showManager = true"
      >
        <Settings :size="15" />
        <span>管理</span>
      </button>
    </header>

    <div
      v-if="tagStore.error"
      class="tag-error"
    >
      {{ tagStore.error }}
    </div>
    <div
      v-else-if="actionMessage"
      class="tag-success"
    >
      {{ actionMessage }}
    </div>

    <section class="tag-section current-doc-section">
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

    <section class="tag-section">
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
      <div class="tag-list">
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

    <section class="tag-section filter-section">
      <div class="section-title">
        <Filter :size="15" />
        <span>标签筛选</span>
      </div>
      <div class="filter-toolbar">
        <button
          type="button"
          :class="{ active: tagStore.filterMode === 'OR' }"
          @click="tagStore.setFilterMode('OR')"
        >
          任一
        </button>
        <button
          type="button"
          :class="{ active: tagStore.filterMode === 'AND' }"
          @click="tagStore.setFilterMode('AND')"
        >
          全部
        </button>
        <button
          type="button"
          :disabled="tagStore.selectedTagIds.length === 0 || tagStore.isLoading"
          @click="handleFilter"
        >
          应用
        </button>
        <button
          type="button"
          @click="tagStore.clearSelectedTags()"
        >
          清除
        </button>
      </div>
      <div class="filtered-docs">
        <button
          v-for="doc in tagStore.filteredDocuments"
          :key="doc.id"
          type="button"
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

    <TagManagerModal
      :open="showManager"
      :tags="tagStore.tags"
      :busy="tagStore.isSaving"
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
  display: grid;
  gap: 14px;
  padding: 14px;
  min-height: 100%;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.tag-browser-head,
.section-title,
.filter-toolbar,
.filtered-docs button {
  display: flex;
  align-items: center;
}

.tag-browser-head {
  justify-content: space-between;
  gap: 12px;
}

.tag-browser-head p,
.tag-browser-head h3,
.empty-copy {
  margin: 0;
}

.tag-browser-head p {
  color: #d32f2f;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.tag-browser-head h3 {
  margin-top: 4px;
  color: #263238;
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
  border-radius: 999px;
  padding: 8px 10px;
  color: #263238;
  background: #edf2f7;
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

.tag-section {
  display: grid;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  padding: 12px;
}

.section-title {
  justify-content: flex-start;
  gap: 7px;
  color: #455a64;
  font-size: 12px;
  font-weight: 900;
}

.section-title.split {
  justify-content: space-between;
}

.section-title.split span:last-child {
  color: #90a4ae;
  font-weight: 700;
}

.tag-search {
  width: 100%;
  border: 1px solid #dbe3ea;
  border-radius: 12px;
  padding: 9px 10px;
  color: #263238;
  background: #ffffff;
  outline: none;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.filter-toolbar {
  flex-wrap: wrap;
  gap: 7px;
}

.filter-toolbar button {
  border-radius: 999px;
  padding: 7px 10px;
  color: #455a64;
  background: #edf2f7;
}

.filter-toolbar button.active,
.filter-toolbar button:last-of-type:not(:disabled) {
  color: #ffffff;
  background: #263238;
}

.filter-toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
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
  color: #263238;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  text-align: left;
}

.filtered-docs small {
  color: #78909c;
  white-space: nowrap;
}

.empty-copy {
  color: #90a4ae;
  font-size: 12px;
  font-weight: 700;
}
</style>
