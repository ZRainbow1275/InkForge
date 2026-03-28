<script setup lang="ts">
import { computed, defineExpose, ref } from 'vue'
import type { Article, Category } from '@/types'
import {
  ArrowDownWideNarrow,
  FolderOpen,
  Inbox,
  Search,
  Sparkles,
} from 'lucide-vue-next'
import ArticleCard from './ArticleCard.vue'

type FilterMode = 'all' | 'week' | 'category'
type SortMode = 'recent' | 'title' | 'wordcount'

interface CategoryMeta {
  name: string
  color: string
}

const props = defineProps<{
  articles: Article[]
  categories: Category[]
}>()

const emit = defineEmits<{
  (e: 'open-article', articleId: string): void
}>()

const searchQuery = ref('')
const filterMode = ref<FilterMode>('all')
const filterCategoryId = ref('')
const sortMode = ref<SortMode>('recent')
const searchInputRef = ref<HTMLInputElement | null>(null)

const CATEGORY_COLORS = [
  '#D32F2F',
  '#1565C0',
  '#2E7D32',
  '#F57C00',
  '#7B1FA2',
  '#00695C',
  '#E91E63',
  '#546E7A',
] as const

function getMondayOfWeek(): Date {
  const today = new Date()
  const currentDay = today.getDay()
  const diffToMonday = currentDay === 0 ? 6 : currentDay - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - diffToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function focusSearch(): void {
  searchInputRef.value?.focus()
}

function getCategoryMeta(categoryId: string | null): CategoryMeta {
  if (!categoryId) {
    return {
      name: '未分类',
      color: '#B0BEC5',
    }
  }

  const index = props.categories.findIndex((category) => category.id === categoryId)
  const category = props.categories[index]

  if (!category || index < 0) {
    return {
      name: '未分类',
      color: '#B0BEC5',
    }
  }

  return {
    name: category.name,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }
}

const filteredArticles = computed(() => {
  let result = [...props.articles]

  if (filterMode.value === 'week') {
    const monday = getMondayOfWeek()
    result = result.filter((article) => new Date(article.updatedAt || article.createdAt) >= monday)
  } else if (filterMode.value === 'category' && filterCategoryId.value) {
    result = result.filter((article) => article.categoryId === filterCategoryId.value)
  }

  const normalizedQuery = searchQuery.value.trim().toLowerCase()
  if (normalizedQuery) {
    result = result.filter((article) =>
      article.title.toLowerCase().includes(normalizedQuery)
      || article.description.toLowerCase().includes(normalizedQuery)
      || article.rawContent.toLowerCase().includes(normalizedQuery)
    )
  }

  switch (sortMode.value) {
    case 'title':
      result.sort((left, right) => left.title.localeCompare(right.title, 'zh-CN'))
      break
    case 'wordcount':
      result.sort((left, right) => (right.rawContent?.length ?? 0) - (left.rawContent?.length ?? 0))
      break
    case 'recent':
    default:
      result.sort(
        (left, right) =>
          new Date(right.updatedAt || right.createdAt).getTime()
          - new Date(left.updatedAt || left.createdAt).getTime()
      )
      break
  }

  return result
})

const resultSummary = computed(() => `${filteredArticles.value.length} / ${props.articles.length}`)

const emptyState = computed(() => {
  if (props.articles.length === 0) {
    return {
      title: '文章库还是空的',
      description: '从空白草稿、导入文件或模板创建开始，作品会自动沉淀到这里。',
    }
  }

  return {
    title: '没有匹配到结果',
    description: '试着切换筛选条件或更换搜索词，IndexedDB 中的真实数据仍然保留。',
  }
})

defineExpose({
  focusSearch,
})
</script>

<template>
  <section class="article-waterfall">
    <header class="article-waterfall__header">
      <div>
        <p class="article-waterfall__eyebrow">
          Archive
        </p>
        <h2 class="article-waterfall__title">
          文章资料库
        </h2>
      </div>
      <div class="article-waterfall__count">
        {{ resultSummary }}
      </div>
    </header>

    <div class="article-waterfall__controls">
      <div class="article-waterfall__filters">
        <button
          type="button"
          class="article-waterfall__filter"
          :class="{ 'article-waterfall__filter--active': filterMode === 'all' }"
          @click="filterMode = 'all'"
        >
          全部
        </button>
        <button
          type="button"
          class="article-waterfall__filter"
          :class="{ 'article-waterfall__filter--active': filterMode === 'week' }"
          @click="filterMode = 'week'"
        >
          本周
        </button>
        <button
          type="button"
          class="article-waterfall__filter"
          :class="{ 'article-waterfall__filter--active': filterMode === 'category' }"
          @click="filterMode = 'category'"
        >
          分类
        </button>
      </div>

      <div class="article-waterfall__toolbar">
        <label class="article-waterfall__search">
          <Search :size="16" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            placeholder="搜索标题、摘要、正文"
          >
        </label>

        <label class="article-waterfall__select article-waterfall__select--sort">
          <ArrowDownWideNarrow :size="15" />
          <select v-model="sortMode">
            <option value="recent">
              最近更新
            </option>
            <option value="title">
              标题排序
            </option>
            <option value="wordcount">
              字数优先
            </option>
          </select>
        </label>

        <label class="article-waterfall__select">
          <FolderOpen :size="15" />
          <select
            v-model="filterCategoryId"
            :disabled="filterMode !== 'category'"
          >
            <option value="">
              全部分类
            </option>
            <option
              v-for="category in props.categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div
      v-if="filteredArticles.length > 0"
      class="article-waterfall__columns"
    >
      <ArticleCard
        v-for="(article, index) in filteredArticles"
        :key="article.id"
        :article="article"
        :category-name="getCategoryMeta(article.categoryId).name"
        :category-color="getCategoryMeta(article.categoryId).color"
        :animation-index="index"
        @open="emit('open-article', $event)"
      />
    </div>

    <div
      v-else
      class="article-waterfall__empty"
    >
      <div class="article-waterfall__empty-icon">
        <component
          :is="props.articles.length === 0 ? Sparkles : Inbox"
          :size="22"
        />
      </div>
      <h3 class="article-waterfall__empty-title">
        {{ emptyState.title }}
      </h3>
      <p class="article-waterfall__empty-desc">
        {{ emptyState.description }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.article-waterfall {
  width: min(1400px, 100%);
  margin: 0 auto;
  padding: 32px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(250, 251, 252, 0.96) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid #eceff1;
  box-shadow: 0 28px 60px rgba(38, 50, 56, 0.08);
}

.article-waterfall__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.article-waterfall__eyebrow {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #d32f2f;
}

.article-waterfall__title {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  color: #263238;
}

.article-waterfall__count {
  min-width: 88px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #d32f2f;
  background: rgba(211, 47, 47, 0.08);
}

.article-waterfall__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.article-waterfall__filters {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  border-radius: 16px;
  background: #f7f9fb;
  border: 1px solid #eceff1;
}

.article-waterfall__filter {
  border: none;
  background: transparent;
  color: #607d8b;
  font-size: 13px;
  font-weight: 700;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.article-waterfall__filter:hover,
.article-waterfall__filter--active {
  color: #d32f2f;
  background: rgba(211, 47, 47, 0.08);
}

.article-waterfall__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.article-waterfall__search,
.article-waterfall__select {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid #eceff1;
  background: #ffffff;
  color: #607d8b;
}

.article-waterfall__search {
  width: min(340px, 100%);
}

.article-waterfall__search input,
.article-waterfall__select select {
  border: none;
  outline: none;
  background: transparent;
  color: #263238;
  font-size: 13px;
  width: 100%;
}

.article-waterfall__select {
  min-width: 160px;
}

.article-waterfall__select--sort {
  min-width: 144px;
}

.article-waterfall__select select:disabled {
  color: #b0bec5;
  cursor: not-allowed;
}

.article-waterfall__columns {
  columns: 3 320px;
  column-gap: 20px;
}

.article-waterfall__empty {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  border-radius: 22px;
  border: 1px dashed #cfd8dc;
  background:
    linear-gradient(135deg, rgba(211, 47, 47, 0.04) 0%, rgba(255, 255, 255, 0.96) 55%);
}

.article-waterfall__empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #d32f2f;
  background: rgba(211, 47, 47, 0.08);
}

.article-waterfall__empty-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #263238;
}

.article-waterfall__empty-desc {
  margin: 0;
  max-width: 420px;
  font-size: 13px;
  line-height: 1.8;
  color: #607d8b;
}

@media (max-width: 1023px) {
  .article-waterfall {
    padding: 24px;
  }

  .article-waterfall__title {
    font-size: 28px;
  }
}

@media (max-width: 767px) {
  .article-waterfall {
    padding: 20px;
  }

  .article-waterfall__header,
  .article-waterfall__controls {
    align-items: stretch;
  }

  .article-waterfall__count {
    align-self: flex-start;
  }

  .article-waterfall__toolbar {
    width: 100%;
  }

  .article-waterfall__search,
  .article-waterfall__select {
    width: 100%;
  }

  .article-waterfall__columns {
    columns: 1;
  }
}
</style>
