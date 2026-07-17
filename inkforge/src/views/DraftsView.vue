<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Archive,
  ArrowDownNarrowWide,
  ArrowLeft,
  ArrowUpNarrowWide,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilePlus2,
  FileText,
  Filter,
  FolderOpen,
  Grid2X2,
  List,
  PenSquare,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Square,
  Tag,
  Target,
  Trash2,
} from 'lucide-vue-next'
import TrashPanel from '@/components/trash/TrashPanel.vue'
import { useArticleStore } from '@/stores/article'
import { useCategoryStore } from '@/stores/category'
import { ARTICLE_STATUS, type ArticleStatus } from '@/constants'
import { isDraftBoxStatus } from '@/core/lifecycle'
import { computeContentWordCount, extractContentPreviewText } from '@/composables/useTextStats'
import type { Article } from '@/types'
import { generateId } from '@/utils/uuid'

type DraftSortMode = 'updated' | 'created' | 'title' | 'wordcount'
type DraftSortDirection = 'asc' | 'desc'
type DraftActivityFilter = 'all' | 'recent7d' | 'stale30d'
type DraftViewMode = 'list' | 'grid'

interface DraftBatchUndoEntry {
  articleId: string
  previousStatus: ArticleStatus
}

const router = useRouter()
const articleStore = useArticleStore()
const categoryStore = useCategoryStore()

const { articles } = storeToRefs(articleStore)
const { categories } = storeToRefs(categoryStore)

const searchQuery = ref('')
const selectedCategoryId = ref<string>('all')
const selectedTag = ref<string>('all')
const activityFilter = ref<DraftActivityFilter>('all')
const sortMode = ref<DraftSortMode>('updated')
const sortDirection = ref<DraftSortDirection>('desc')
const viewMode = ref<DraftViewMode>('list')
const showTrashPanel = ref(false)
const activePreviewDraftId = ref<string | null>(null)
const selectedDraftIds = ref<Set<string>>(new Set())
const isBatchUpdating = ref(false)
const latestBatchUndo = ref<{ label: string; entries: DraftBatchUndoEntry[] } | null>(null)

// 分页：filteredDrafts 全量返回会让数量上百时整页 v-for 卡顿/不可用。
// pageSize 12 与 grid 4 列 / list 单列均能整除，避免末页只剩 1-2 条的零碎感。
const PAGE_SIZE_OPTIONS = [12, 24, 48] as const
const pageSize = ref<number>(12)
const currentPage = ref<number>(1)

const draftArticles = computed(() =>
  articles.value.filter((article: Article) => isDraftBoxStatus(article.status)),
)

const legacyDraftCandidates = computed(() =>
  articles.value.filter((article: Article) => (
    article.status === ARTICLE_STATUS.NEW || article.status === ARTICLE_STATUS.READ
  )),
)

const draftWordCountMap = computed(() => new Map(
  draftArticles.value.map((article: Article) => [article.id, computeContentWordCount(article.rawContent ?? '')]),
))

const availableTags = computed(() => {
  const tagSet = new Set<string>()
  for (const article of draftArticles.value) {
    for (const tag of article.tags) {
      const normalized = tag.trim()
      if (normalized.length > 0) {
        tagSet.add(normalized)
      }
    }
  }

  return [...tagSet].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const categoryOptions = computed(() => {
  const categoryIds = new Set(
    draftArticles.value
      .map(article => article.categoryId)
      .filter((categoryId): categoryId is string => Boolean(categoryId)),
  )

  return categories.value
    .filter(category => categoryIds.has(category.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
})

const latestDraft = computed(() => {
  const sorted = [...draftArticles.value].sort((a: Article, b: Article) => {
    return getArticleTimestamp(b) - getArticleTimestamp(a)
  })

  return sorted[0] ?? null
})

const previewDraft = computed(() => (
  paginatedDrafts.value.find(article => article.id === activePreviewDraftId.value)
  ?? paginatedDrafts.value[0]
  ?? null
))

const filteredDrafts = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  const nextDrafts = draftArticles.value.filter((article: Article) => {
    if (selectedCategoryId.value === 'none') {
      if (article.categoryId) {
        return false
      }
    } else if (selectedCategoryId.value !== 'all' && article.categoryId !== selectedCategoryId.value) {
      return false
    }

    if (selectedTag.value !== 'all' && !article.tags.includes(selectedTag.value)) {
      return false
    }

    if (activityFilter.value === 'recent7d' && !isUpdatedWithinDays(article, 7)) {
      return false
    }

    if (activityFilter.value === 'stale30d' && !isUpdatedBeforeDays(article, 30)) {
      return false
    }

    if (!keyword) {
      return true
    }

    const haystacks = [
      article.title,
      article.description,
      article.rawContent,
      article.sourceName,
      getCategoryName(article.categoryId),
      article.tags.join(' '),
    ]

    return haystacks.some(field => field?.toLowerCase().includes(keyword))
  })

  const sortedDrafts = [...nextDrafts].sort((a: Article, b: Article) => {
    switch (sortMode.value) {
      case 'created':
        return getArticleCreatedTimestamp(a) - getArticleCreatedTimestamp(b)
      case 'title':
        return a.title.localeCompare(b.title, 'zh-CN')
      case 'wordcount':
        return getDraftWordCount(a) - getDraftWordCount(b)
      case 'updated':
      default:
        return getArticleTimestamp(a) - getArticleTimestamp(b)
    }
  })

  return sortDirection.value === 'asc' ? sortedDrafts : sortedDrafts.reverse()
})

// 分页派生：基于 filteredDrafts 切片。totalPages 至少为 1，避免空集时跳页器消失但 page=0 的边界。
const totalPages = computed(() => Math.max(1, Math.ceil(filteredDrafts.value.length / pageSize.value)))
const safeCurrentPage = computed(() => Math.min(Math.max(1, currentPage.value), totalPages.value))
const paginatedDrafts = computed(() => {
  const start = (safeCurrentPage.value - 1) * pageSize.value
  return filteredDrafts.value.slice(start, start + pageSize.value)
})
const pageRangeStart = computed(() =>
  filteredDrafts.value.length === 0 ? 0 : (safeCurrentPage.value - 1) * pageSize.value + 1,
)
const pageRangeEnd = computed(() =>
  Math.min(filteredDrafts.value.length, safeCurrentPage.value * pageSize.value),
)
// 滑动窗口式页号（最多 7 个），把当前页放在中间，超界自动夹边。
const visiblePageNumbers = computed<number[]>(() => {
  const total = totalPages.value
  const current = safeCurrentPage.value
  const window = 7
  if (total <= window) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const half = Math.floor(window / 2)
  let start = Math.max(1, current - half)
  let end = Math.min(total, start + window - 1)
  if (end - start + 1 < window) {
    start = Math.max(1, end - window + 1)
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const totalDraftWords = computed(() =>
  draftArticles.value.reduce((sum, article) => sum + getDraftWordCount(article), 0),
)

const visibleDraftWords = computed(() =>
  filteredDrafts.value.reduce((sum, article) => sum + getDraftWordCount(article), 0),
)

const recentDraftCount = computed(() =>
  draftArticles.value.filter(article => isUpdatedWithinDays(article, 7)).length,
)

const staleDraftCount = computed(() =>
  draftArticles.value.filter(article => isUpdatedBeforeDays(article, 30)).length,
)

const uncategorizedDraftCount = computed(() =>
  draftArticles.value.filter(article => !article.categoryId).length,
)

const selectedVisibleDraftIds = computed(() => (
  filteredDrafts.value
    .filter(article => selectedDraftIds.value.has(article.id))
    .map(article => article.id)
))

const selectedDraftCount = computed(() => selectedVisibleDraftIds.value.length)

const allVisibleDraftsSelected = computed(() => (
  filteredDrafts.value.length > 0 && selectedDraftCount.value === filteredDrafts.value.length
))

const hasPartiallySelectedVisibleDrafts = computed(() => (
  selectedDraftCount.value > 0 && !allVisibleDraftsSelected.value
))

const hasActiveFilters = computed(() => (
  searchQuery.value.trim().length > 0
  || selectedCategoryId.value !== 'all'
  || selectedTag.value !== 'all'
  || activityFilter.value !== 'all'
))

const activeFilterLabels = computed(() => {
  const labels: string[] = []

  if (searchQuery.value.trim()) {
    labels.push(`关键词：${searchQuery.value.trim()}`)
  }

  if (selectedCategoryId.value !== 'all') {
    labels.push(`分类：${selectedCategoryId.value === 'none' ? '未分类' : (getCategoryName(selectedCategoryId.value) || '未分类')}`)
  }

  if (selectedTag.value !== 'all') {
    labels.push(`标签：${selectedTag.value}`)
  }

  if (activityFilter.value === 'recent7d') {
    labels.push('最近 7 天有更新')
  }

  if (activityFilter.value === 'stale30d') {
    labels.push('30 天未更新')
  }

  return labels
})

const latestDraftLabel = computed(() => {
  if (!latestDraft.value) {
    return '暂无草稿'
  }

  return formatRelativeTime(latestDraft.value.updatedAt || latestDraft.value.createdAt)
})

function getArticleTimestamp(article: Article): number {
  return toTimestamp(article.updatedAt || article.createdAt)
}

function getArticleCreatedTimestamp(article: Article): number {
  return toTimestamp(article.createdAt)
}

function toTimestamp(value: Date | string | number): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

function getDraftWordCount(article: Article): number {
  return draftWordCountMap.value.get(article.id) ?? 0
}

function getCategoryName(categoryId: string | null): string {
  if (!categoryId) {
    return ''
  }

  return categories.value.find(category => category.id === categoryId)?.name ?? ''
}

function getDraftExcerpt(article: Article): string {
  const preview = extractContentPreviewText(article.rawContent ?? '', 180)
  if (preview.trim().length > 0) {
    return preview
  }

  const fallbackDescription = article.description.trim()
  if (fallbackDescription.length > 0) {
    return fallbackDescription
  }

  return '还没有写下正文，打开后可以继续补全标题、摘要和内容。'
}

function getVisibleTags(article: Article): string[] {
  return article.tags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .slice(0, 3)
}

function isUpdatedWithinDays(article: Article, days: number): boolean {
  const now = Date.now()
  const diffMs = now - getArticleTimestamp(article)
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000
}

function isUpdatedBeforeDays(article: Article, days: number): boolean {
  const now = Date.now()
  const diffMs = now - getArticleTimestamp(article)
  return diffMs > days * 24 * 60 * 60 * 1000
}

function formatRelativeTime(date: Date | string | number): string {
  const targetDate = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - targetDate.getTime()

  if (diffMs < 0) {
    return formatAbsoluteDate(targetDate)
  }

  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return '刚才'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`

  return formatAbsoluteDate(targetDate)
}

function formatAbsoluteDate(date: Date | string | number): string {
  const targetDate = date instanceof Date ? date : new Date(date)
  return targetDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function clearFilters(): void {
  searchQuery.value = ''
  selectedCategoryId.value = 'all'
  selectedTag.value = 'all'
  activityFilter.value = 'all'
  currentPage.value = 1
}

function toggleSortDirection(): void {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

function setViewMode(mode: DraftViewMode): void {
  viewMode.value = mode
}

function goToPage(page: number): void {
  const next = Math.min(Math.max(1, Math.floor(page)), totalPages.value)
  currentPage.value = next
}

function goToPreviousPage(): void {
  goToPage(safeCurrentPage.value - 1)
}

function goToNextPage(): void {
  goToPage(safeCurrentPage.value + 1)
}

function setPageSize(size: number): void {
  if (!PAGE_SIZE_OPTIONS.includes(size as (typeof PAGE_SIZE_OPTIONS)[number])) return
  pageSize.value = size
  currentPage.value = 1
}

// 任意筛选/排序/视图变更后，把页码归位，避免站在不存在的页（如 page 5 但筛后只剩 1 页）。
watch(
  [searchQuery, selectedCategoryId, selectedTag, activityFilter, sortMode, sortDirection, pageSize],
  () => {
    currentPage.value = 1
  },
)

function setPreviewDraft(articleId: string): void {
  activePreviewDraftId.value = articleId
}

function isDraftSelected(articleId: string): boolean {
  return selectedDraftIds.value.has(articleId)
}

function checkedFromEvent(event: Event): boolean {
  return event.target instanceof HTMLInputElement ? event.target.checked : false
}

function replaceSelectedDraftIds(nextIds: Iterable<string>): void {
  selectedDraftIds.value = new Set(nextIds)
}

function toggleDraftSelection(articleId: string, selected: boolean): void {
  const next = new Set<string>(selectedDraftIds.value)
  if (selected) {
    next.add(articleId)
  } else {
    next.delete(articleId)
  }
  replaceSelectedDraftIds(next)
}

function toggleVisibleDraftSelection(selected: boolean): void {
  if (!selected) {
    replaceSelectedDraftIds([])
    return
  }

  replaceSelectedDraftIds(filteredDrafts.value.map(article => article.id))
}

function clearSelectedDrafts(): void {
  replaceSelectedDraftIds([])
}

async function applyBatchStatus(targetStatus: ArticleStatus, label: string): Promise<void> {
  if (isBatchUpdating.value || selectedDraftIds.value.size === 0) {
    return
  }

  const entries = draftArticles.value
    .filter(article => selectedDraftIds.value.has(article.id) && article.status !== targetStatus)
    .map((article): DraftBatchUndoEntry => ({
      articleId: article.id,
      previousStatus: article.status,
    }))

  if (entries.length === 0) {
    clearSelectedDrafts()
    return
  }

  isBatchUpdating.value = true
  try {
    for (const entry of entries) {
      await articleStore.updateArticle(entry.articleId, { status: targetStatus })
    }
    latestBatchUndo.value = { label, entries }
    clearSelectedDrafts()
  } finally {
    isBatchUpdating.value = false
  }
}

async function batchArchiveSelectedDrafts(): Promise<void> {
  await applyBatchStatus(ARTICLE_STATUS.ARCHIVED, '归档')
}

async function batchMarkReadyToPublish(): Promise<void> {
  await applyBatchStatus(ARTICLE_STATUS.READY_TO_PUBLISH, '待发布')
}

async function undoLatestBatchStatusUpdate(): Promise<void> {
  const undo = latestBatchUndo.value
  if (!undo || isBatchUpdating.value) {
    return
  }

  isBatchUpdating.value = true
  try {
    for (const entry of undo.entries) {
      await articleStore.updateArticle(entry.articleId, { status: entry.previousStatus })
    }
    latestBatchUndo.value = null
  } finally {
    isBatchUpdating.value = false
  }
}

async function openDraft(articleId: string): Promise<void> {
  articleStore.selectArticle(articleId)
  await router.push({
    name: 'Workstation',
    query: { id: articleId },
  })
}

async function continueLatestDraft(): Promise<void> {
  if (!latestDraft.value) {
    return
  }

  await openDraft(latestDraft.value.id)
}

async function createBlankDraft(): Promise<void> {
  const article = await articleStore.addArticle({
    title: '未命名文稿',
    sourceUrl: `inkforge://blank/${generateId()}`,
    sourceName: 'InkForge 本地新建',
    rawContent: '',
    description: '',
    status: ARTICLE_STATUS.DRAFT,
  })

  articleStore.selectArticle(article.id)
  await router.push({
    name: 'Workstation',
    query: { id: article.id },
  })
}

async function goHome(): Promise<void> {
  await router.push({ name: 'Hub' })
}
</script>

<template>
  <section class="drafts-view">
    <header class="drafts-hero">
      <div class="drafts-hero-copy">
        <h1>草稿箱</h1>

        <div class="drafts-meta">
          <span>{{ draftArticles.length }} 篇</span>
          <span>{{ totalDraftWords }} 字</span>
          <span>未分类 {{ uncategorizedDraftCount }}</span>
          <span>最近更新 {{ latestDraftLabel }}</span>
          <button
            v-if="legacyDraftCandidates.length > 0"
            type="button"
            class="drafts-legacy-chip"
            :title="`包含 ${legacyDraftCandidates.length} 篇尚未归入草稿箱的旧文稿，点击回到首页继续打开`"
            @click="void goHome()"
          >
            <Clock3
              :size="12"
              :stroke-width="2.2"
            />
            <span>另有 {{ legacyDraftCandidates.length }} 篇旧文稿</span>
          </button>
        </div>
      </div>

      <div class="drafts-actions">
        <button
          type="button"
          class="drafts-action drafts-action-tertiary"
          @click="void goHome()"
        >
          <ArrowLeft
            :size="16"
            :stroke-width="2.2"
          />
          <span>返回首页</span>
        </button>
        <button
          type="button"
          class="drafts-action drafts-action-tertiary"
          data-drafts-action="open-trash"
          @click="showTrashPanel = true"
        >
          <Trash2
            :size="16"
            :stroke-width="2.2"
          />
          <span>回收站</span>
        </button>
        <button
          v-if="latestDraft"
          type="button"
          class="drafts-action drafts-action-secondary"
          @click="void continueLatestDraft()"
        >
          <Target
            :size="16"
            :stroke-width="2.2"
          />
          <span>继续最近草稿</span>
        </button>
        <button
          type="button"
          class="drafts-action drafts-action-primary"
          @click="void createBlankDraft()"
        >
          <FilePlus2
            :size="16"
            :stroke-width="2.2"
          />
          <span>新建空白草稿</span>
        </button>
      </div>
    </header>

    <section
      class="drafts-summary-grid"
      aria-label="草稿箱摘要"
    >
      <article class="draft-summary-card">
        <div class="draft-summary-icon">
          <FileText
            :size="18"
            :stroke-width="2.1"
          />
        </div>
        <div>
          <p>当前可见</p>
          <strong>{{ filteredDrafts.length }}</strong>
        </div>
      </article>

      <article class="draft-summary-card">
        <div class="draft-summary-icon">
          <PenSquare
            :size="18"
            :stroke-width="2.1"
          />
        </div>
        <div>
          <p>可见字数</p>
          <strong>{{ visibleDraftWords }}</strong>
        </div>
      </article>

      <article class="draft-summary-card">
        <div class="draft-summary-icon">
          <RefreshCw
            :size="18"
            :stroke-width="2.1"
          />
        </div>
        <div>
          <p>7 日内更新</p>
          <strong>{{ recentDraftCount }}</strong>
        </div>
      </article>

      <article class="draft-summary-card">
        <div class="draft-summary-icon">
          <Clock3
            :size="18"
            :stroke-width="2.1"
          />
        </div>
        <div>
          <p>30 天未动</p>
          <strong>{{ staleDraftCount }}</strong>
        </div>
      </article>
    </section>

    <div class="drafts-toolbar">
      <label class="drafts-search">
        <Search
          :size="16"
          :stroke-width="2.1"
        />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="搜索标题、摘要、正文、标签或分类"
        >
      </label>

      <label class="drafts-select">
        <span>分类</span>
        <select v-model="selectedCategoryId">
          <option value="all">全部分类</option>
          <option value="none">未分类</option>
          <option
            v-for="category in categoryOptions"
            :key="category.id"
            :value="category.id"
          >
            {{ category.name }}
          </option>
        </select>
      </label>

      <label class="drafts-select">
        <span>标签</span>
        <select v-model="selectedTag">
          <option value="all">全部标签</option>
          <option
            v-for="tag in availableTags"
            :key="tag"
            :value="tag"
          >
            {{ tag }}
          </option>
        </select>
      </label>

      <label class="drafts-select">
        <span>活动性</span>
        <select v-model="activityFilter">
          <option value="all">全部</option>
          <option value="recent7d">最近 7 天更新</option>
          <option value="stale30d">30 天未更新</option>
        </select>
      </label>

      <label class="drafts-select">
        <span>排序</span>
        <select v-model="sortMode">
          <option value="updated">最近更新</option>
          <option value="created">创建时间</option>
          <option value="title">标题</option>
          <option value="wordcount">字数</option>
        </select>
      </label>

      <button
        type="button"
        class="drafts-sort-toggle"
        :class="{ 'drafts-sort-toggle-active': sortDirection === 'asc' }"
        :aria-pressed="sortDirection === 'asc'"
        :aria-label="sortDirection === 'asc' ? '当前升序，切换为降序' : '当前降序，切换为升序'"
        @click="toggleSortDirection"
      >
        <ArrowUpNarrowWide
          v-if="sortDirection === 'asc'"
          :size="14"
          :stroke-width="2.1"
        />
        <ArrowDownNarrowWide
          v-else
          :size="14"
          :stroke-width="2.1"
        />
        <span>排序 · {{ sortDirection === 'asc' ? '升序' : '降序' }}</span>
      </button>

      <div
        class="drafts-view-toggle"
        role="group"
        aria-label="草稿视图模式"
      >
        <button
          type="button"
          class="drafts-view-segment"
          :class="{ 'drafts-view-segment-active': viewMode === 'list' }"
          :aria-pressed="viewMode === 'list'"
          @click="setViewMode('list')"
        >
          <List
            :size="14"
            :stroke-width="2.1"
          />
          <span>列表</span>
        </button>
        <button
          type="button"
          class="drafts-view-segment"
          :class="{ 'drafts-view-segment-active': viewMode === 'grid' }"
          :aria-pressed="viewMode === 'grid'"
          @click="setViewMode('grid')"
        >
          <Grid2X2
            :size="14"
            :stroke-width="2.1"
          />
          <span>网格</span>
        </button>
      </div>

      <button
        v-if="hasActiveFilters"
        type="button"
        class="drafts-icon-button drafts-icon-button-secondary"
        @click="clearFilters"
      >
        <Filter
          :size="16"
          :stroke-width="2.1"
        />
        <span>清空筛选</span>
      </button>
    </div>

    <div
      v-if="activeFilterLabels.length > 0"
      class="drafts-filter-pills"
      aria-label="当前筛选条件"
    >
      <span
        v-for="label in activeFilterLabels"
        :key="label"
        class="drafts-filter-pill"
      >
        {{ label }}
      </span>
    </div>

    <div
      v-if="filteredDrafts.length > 0 || latestBatchUndo"
      class="drafts-batch-toolbar"
      role="toolbar"
      aria-label="草稿批量操作"
    >
      <label class="drafts-batch-select">
        <input
          type="checkbox"
          :checked="allVisibleDraftsSelected"
          :aria-checked="hasPartiallySelectedVisibleDrafts ? 'mixed' : allVisibleDraftsSelected"
          @change="toggleVisibleDraftSelection(checkedFromEvent($event))"
        >
        <span>选择当前 {{ filteredDrafts.length }} 篇</span>
      </label>
      <span class="drafts-batch-count">已选 {{ selectedDraftCount }} 篇</span>
      <button
        type="button"
        class="drafts-action drafts-action-secondary"
        :disabled="selectedDraftCount === 0 || isBatchUpdating"
        @click="void batchArchiveSelectedDrafts()"
      >
        <Archive
          :size="16"
          :stroke-width="2.2"
        />
        <span>批量归档</span>
      </button>
      <button
        type="button"
        class="drafts-action drafts-action-secondary"
        :disabled="selectedDraftCount === 0 || isBatchUpdating"
        @click="void batchMarkReadyToPublish()"
      >
        <Send
          :size="16"
          :stroke-width="2.2"
        />
        <span>标记待发布</span>
      </button>
      <button
        v-if="selectedDraftCount > 0"
        type="button"
        class="drafts-icon-button drafts-icon-button-secondary"
        :disabled="isBatchUpdating"
        @click="clearSelectedDrafts"
      >
        <Square
          :size="16"
          :stroke-width="2.1"
        />
        <span>取消选择</span>
      </button>
      <button
        v-if="latestBatchUndo"
        type="button"
        class="drafts-icon-button drafts-icon-button-secondary"
        :disabled="isBatchUpdating"
        @click="void undoLatestBatchStatusUpdate()"
      >
        <RotateCcw
          :size="16"
          :stroke-width="2.1"
        />
        <span>撤销{{ latestBatchUndo.label }}</span>
      </button>
    </div>

    <div
      v-if="filteredDrafts.length > 0"
      class="drafts-list-shell"
    >
      <ul
        class="drafts-list"
        :class="{ 'drafts-list-grid': viewMode === 'grid' }"
        aria-label="草稿列表"
      >
        <li
          v-for="article in paginatedDrafts"
          :key="article.id"
          class="draft-list-item"
          :class="{ 'draft-list-item-selected': isDraftSelected(article.id) }"
          @mouseenter="setPreviewDraft(article.id)"
          @focusin="setPreviewDraft(article.id)"
        >
          <label
            class="draft-card-select"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="isDraftSelected(article.id)"
              :aria-label="'选择草稿：' + (article.title || '未命名文稿')"
              @change="toggleDraftSelection(article.id, checkedFromEvent($event))"
            >
            <CheckSquare
              v-if="isDraftSelected(article.id)"
              :size="16"
              :stroke-width="2.2"
              aria-hidden="true"
            />
            <Square
              v-else
              :size="16"
              :stroke-width="2.2"
              aria-hidden="true"
            />
          </label>
          <button
            type="button"
            class="draft-card"
            @click="void openDraft(article.id)"
          >
            <div class="draft-card-copy">
              <div class="draft-card-head">
                <div class="draft-card-title-group">
                  <h2>{{ article.title || '未命名文稿' }}</h2>
                  <span class="draft-card-status">草稿</span>
                  <span
                    v-if="isUpdatedBeforeDays(article, 30)"
                    class="draft-card-flag draft-card-flag-stale"
                  >
                    30 天未更新
                  </span>
                  <span
                    v-else-if="isUpdatedWithinDays(article, 7)"
                    class="draft-card-flag draft-card-flag-fresh"
                  >
                    近 7 天更新
                  </span>
                </div>
                <span class="draft-card-time">{{ formatRelativeTime(article.updatedAt || article.createdAt) }}</span>
              </div>

              <p class="draft-card-excerpt">
                {{ getDraftExcerpt(article) }}
              </p>

              <div class="draft-card-badges">
                <span class="draft-card-badge">
                  <FolderOpen
                    :size="14"
                    :stroke-width="2.1"
                  />
                  {{ getCategoryName(article.categoryId) || '未分类' }}
                </span>
                <span
                  v-if="article.sourceName"
                  class="draft-card-badge"
                >
                  <Target
                    :size="14"
                    :stroke-width="2.1"
                  />
                  {{ article.sourceName }}
                </span>
                <span
                  v-for="tag in getVisibleTags(article)"
                  :key="`${article.id}-${tag}`"
                  class="draft-card-badge"
                >
                  <Tag
                    :size="14"
                    :stroke-width="2.1"
                  />
                  {{ tag }}
                </span>
              </div>

              <div class="draft-card-meta">
                <span>
                  <FileText
                    :size="14"
                    :stroke-width="2.1"
                  />
                  {{ getDraftWordCount(article) }} 字
                </span>
                <span>
                  最后更新 {{ formatAbsoluteDate(article.updatedAt || article.createdAt) }}
                </span>
                <span>
                  创建于 {{ formatAbsoluteDate(article.createdAt) }}
                </span>
              </div>
            </div>

            <div
              class="draft-card-open"
              aria-hidden="true"
            >
              <PenSquare
                :size="18"
                :stroke-width="2.2"
              />
            </div>
          </button>
        </li>
      </ul>

      <aside
        v-if="previewDraft"
        class="drafts-peek"
        aria-label="草稿预览"
      >
        <h2>{{ previewDraft.title || '未命名文稿' }}</h2>
        <p class="drafts-peek-excerpt">
          {{ getDraftExcerpt(previewDraft) }}
        </p>
        <div class="drafts-peek-meta">
          <span>{{ getDraftWordCount(previewDraft) }} 字</span>
          <span>{{ getCategoryName(previewDraft.categoryId) || '未分类' }}</span>
          <span>{{ formatRelativeTime(previewDraft.updatedAt || previewDraft.createdAt) }}</span>
        </div>
        <div
          v-if="getVisibleTags(previewDraft).length > 0"
          class="drafts-peek-tags"
        >
          <span
            v-for="tag in getVisibleTags(previewDraft)"
            :key="'peek-' + previewDraft.id + '-' + tag"
          >
            {{ tag }}
          </span>
        </div>
        <button
          type="button"
          class="drafts-action drafts-action-primary"
          @click="void openDraft(previewDraft.id)"
        >
          <PenSquare
            :size="16"
            :stroke-width="2.2"
          />
          <span>打开</span>
        </button>
      </aside>

      <nav
        v-if="totalPages > 1 || filteredDrafts.length > pageSize"
        class="drafts-pager"
        aria-label="草稿分页"
      >
        <div class="drafts-pager-status">
          <span>显示 {{ pageRangeStart }}-{{ pageRangeEnd }} / {{ filteredDrafts.length }} 篇</span>
          <label class="drafts-pager-size">
            <span>每页</span>
            <select
              :value="pageSize"
              @change="setPageSize(Number(($event.target as HTMLSelectElement).value))"
            >
              <option
                v-for="size in PAGE_SIZE_OPTIONS"
                :key="size"
                :value="size"
              >
                {{ size }}
              </option>
            </select>
          </label>
        </div>
        <div class="drafts-pager-controls">
          <button
            type="button"
            class="drafts-pager-btn"
            :disabled="safeCurrentPage <= 1"
            aria-label="上一页"
            @click="goToPreviousPage"
          >
            <ChevronLeft
              :size="16"
              :stroke-width="2.2"
            />
          </button>
          <button
            v-if="visiblePageNumbers[0] > 1"
            type="button"
            class="drafts-pager-btn drafts-pager-btn-num"
            @click="goToPage(1)"
          >
            1
          </button>
          <span
            v-if="visiblePageNumbers[0] > 2"
            class="drafts-pager-ellipsis"
            aria-hidden="true"
          >…</span>
          <button
            v-for="num in visiblePageNumbers"
            :key="num"
            type="button"
            class="drafts-pager-btn drafts-pager-btn-num"
            :class="{ 'drafts-pager-btn-active': num === safeCurrentPage }"
            :aria-current="num === safeCurrentPage ? 'page' : undefined"
            @click="goToPage(num)"
          >
            {{ num }}
          </button>
          <span
            v-if="visiblePageNumbers[visiblePageNumbers.length - 1] < totalPages - 1"
            class="drafts-pager-ellipsis"
            aria-hidden="true"
          >…</span>
          <button
            v-if="visiblePageNumbers[visiblePageNumbers.length - 1] < totalPages"
            type="button"
            class="drafts-pager-btn drafts-pager-btn-num"
            @click="goToPage(totalPages)"
          >
            {{ totalPages }}
          </button>
          <button
            type="button"
            class="drafts-pager-btn"
            :disabled="safeCurrentPage >= totalPages"
            aria-label="下一页"
            @click="goToNextPage"
          >
            <ChevronRight
              :size="16"
              :stroke-width="2.2"
            />
          </button>
        </div>
      </nav>
    </div>

    <div
      v-else-if="draftArticles.length > 0"
      class="drafts-empty drafts-empty-search"
    >
      <div class="drafts-empty-icon">
        <Search
          :size="28"
          :stroke-width="2.1"
        />
      </div>
      <h2>没有匹配的草稿</h2>
      <p>试试放宽筛选条件。</p>
      <div class="drafts-empty-actions">
        <button
          type="button"
          class="drafts-action drafts-action-primary"
          @click="clearFilters"
        >
          <Filter
            :size="16"
            :stroke-width="2.2"
          />
          <span>清空筛选</span>
        </button>
        <button
          v-if="latestDraft"
          type="button"
          class="drafts-action drafts-action-secondary"
          @click="void continueLatestDraft()"
        >
          <Target
            :size="16"
            :stroke-width="2.2"
          />
          <span>继续最近草稿</span>
        </button>
      </div>
    </div>

    <div
      v-else
      class="drafts-empty"
    >
      <div class="drafts-empty-icon">
        <FileText
          :size="28"
          :stroke-width="2.1"
        />
      </div>
      <h2>还没有草稿</h2>
      <p>新建一篇空白草稿，或回到首页继续创作。</p>
      <div class="drafts-empty-actions">
        <button
          type="button"
          class="drafts-action drafts-action-primary"
          @click="void createBlankDraft()"
        >
          <FilePlus2
            :size="16"
            :stroke-width="2.2"
          />
          <span>创建草稿</span>
        </button>
        <button
          type="button"
          class="drafts-action drafts-action-secondary"
          @click="void goHome()"
        >
          <ArrowLeft
            :size="16"
            :stroke-width="2.2"
          />
          <span>回到首页</span>
        </button>
      </div>
    </div>

    <TrashPanel
      v-if="showTrashPanel"
      @close="showTrashPanel = false"
    />
  </section>
</template>

<style scoped>
/* ====== Editorial Constructivism — Drafts View ====== */
.drafts-view {
  position: relative;
  height: 100vh;
  overflow-y: auto;
  padding: 32px 32px 140px;
  color: var(--text-primary, #263238);
  background: var(--bg-page, #FAFAF7);
  box-sizing: border-box;
}

/* ---- Hero ---- */
.drafts-hero {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 8px 4px 24px;
  border-bottom: 1px solid var(--border, #ECEFF1);
  background: transparent;
}

.drafts-hero h1 {
  margin: 0;
  font-size: clamp(28px, 3.2vw, 40px);
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--text-primary, #263238);
}

.drafts-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.drafts-meta span {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--bg-page, transparent);
  border: 1px solid var(--border, #ECEFF1);
  font-size: 12px;
  color: var(--text-secondary, #455A64);
}

.drafts-legacy-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 152, 0, 0.08);
  border: 1px solid rgba(255, 152, 0, 0.32);
  color: #B26A00;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.drafts-legacy-chip:hover {
  background: rgba(255, 152, 0, 0.14);
  border-color: rgba(255, 152, 0, 0.46);
}

/* ---- Header buttons: tertiary / secondary / primary ---- */
.drafts-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 8px;
  min-width: 260px;
}

.drafts-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease,
    border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.drafts-action:hover {
  transform: translateY(-1px);
}

.drafts-action:disabled {
  cursor: not-allowed;
  opacity: 0.48;
  transform: none;
}

.drafts-action-primary {
  background: var(--accent-primary, #D32F2F);
  color: #FFFFFF;
  border-color: var(--accent-primary, #D32F2F);
  box-shadow: 0 4px 12px -4px rgba(211, 47, 47, 0.40);
}

.drafts-action-primary:hover {
  background: var(--accent-primary-hover, #C62828);
  border-color: var(--accent-primary-hover, #C62828);
  box-shadow: 0 6px 16px -4px rgba(211, 47, 47, 0.48);
}

.drafts-action-secondary {
  background: transparent;
  color: var(--text-secondary, #455A64);
  border-color: var(--border-strong, #CFD8DC);
}

.drafts-action-secondary:hover {
  border-color: rgba(211, 47, 47, 0.20);
  color: var(--accent-primary, #D32F2F);
  background: rgba(211, 47, 47, 0.04);
}

.drafts-action-tertiary {
  background: transparent;
  color: var(--text-tertiary, #607D8B);
  border-color: transparent;
  padding: 0 12px;
}

.drafts-action-tertiary:hover {
  color: var(--accent-primary, #D32F2F);
  background: rgba(211, 47, 47, 0.04);
}

/* ---- Stat ribbon ---- */
.drafts-summary-grid {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-top: 18px;
  padding: 0;
  border: none;
  background: transparent;
}

.draft-summary-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 18px;
  border: none;
  border-right: 1px solid var(--border, #ECEFF1);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.draft-summary-card:last-child {
  border-right: none;
}

.draft-summary-card p,
.draft-summary-card strong {
  display: block;
}

.draft-summary-card p {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-tertiary, #607D8B);
  text-transform: uppercase;
}

.draft-summary-card strong {
  margin-top: 2px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text-primary, #263238);
}

.draft-summary-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(211, 47, 47, 0.06);
  color: var(--accent-primary, #D32F2F);
  flex-shrink: 0;
}

/* ---- Toolbar ---- */
.drafts-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) repeat(4, minmax(0, 170px)) auto auto auto;
  gap: 10px;
  margin-top: 22px;
  align-items: center;
}

.drafts-search,
.drafts-select {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--border, #ECEFF1);
  background: var(--bg-surface, #FFFFFF);
  transition: border-color 0.18s ease;
}

.drafts-search:focus-within,
.drafts-select:focus-within {
  border-color: rgba(211, 47, 47, 0.32);
}

.drafts-search :deep(svg),
.drafts-select :deep(svg) {
  color: var(--text-tertiary, #607D8B);
  flex-shrink: 0;
}

.drafts-search input,
.drafts-select select {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary, #263238);
  font-size: 13px;
  outline: none;
}

.drafts-select {
  position: relative;
}

.drafts-select select {
  appearance: none;
  -webkit-appearance: none;
  padding-right: 18px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23607D8B' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 0 center;
  background-size: 12px;
  cursor: pointer;
}

.drafts-select span {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary, #607D8B);
}

/* Sort toggle (compact pill, outline) */
.drafts-sort-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border-strong, #CFD8DC);
  background: transparent;
  color: var(--text-secondary, #455A64);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;
}

.drafts-sort-toggle:hover {
  border-color: rgba(211, 47, 47, 0.20);
  color: #D32F2F;
}

.drafts-sort-toggle-active {
  border-color: rgba(211, 47, 47, 0.32);
  color: #D32F2F;
  background: rgba(211, 47, 47, 0.06);
}

/* Segmented control for view-mode toggle */
.drafts-view-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0;
  padding: 2px;
  border-radius: 999px;
  background: rgba(207, 216, 220, 0.32);
  border: 1px solid #ECEFF1;
}

.drafts-view-segment {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #607D8B;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.drafts-view-segment:hover:not(.drafts-view-segment-active) {
  color: #455A64;
}

.drafts-view-segment-active {
  background: #FFFFFF;
  color: #D32F2F;
  box-shadow: 0 1px 3px rgba(38, 50, 56, 0.10);
}

/* ---- Generic icon button (used by 清空筛选 / 取消选择 / 撤销) ---- */
.drafts-icon-button,
.drafts-icon-button-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid #CFD8DC;
  background: transparent;
  color: #455A64;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease,
    transform 0.18s ease;
}

.drafts-icon-button:hover,
.drafts-icon-button-secondary:hover {
  border-color: rgba(211, 47, 47, 0.20);
  color: #D32F2F;
  background: rgba(211, 47, 47, 0.04);
}

.drafts-icon-button:disabled,
.drafts-icon-button-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

/* ---- Active filter pills ---- */
.drafts-filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.drafts-filter-pill {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(211, 47, 47, 0.32);
  background: rgba(211, 47, 47, 0.06);
  color: #D32F2F;
  font-size: 12px;
  font-weight: 600;
}

/* ---- Selection toolbar ---- */
.drafts-batch-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding: 14px 20px;
  border: 1px solid #ECEFF1;
  border-radius: 12px;
  background: #FFFFFF;
  box-shadow:
    0 6px 20px -6px rgba(38, 50, 56, 0.10),
    0 2px 6px rgba(38, 50, 56, 0.05);
}

.drafts-batch-select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(207, 216, 220, 0.24);
  color: #455A64;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.drafts-batch-select input {
  width: 14px;
  height: 14px;
  accent-color: #D32F2F;
}

.drafts-batch-count {
  font-size: 12px;
  color: #607D8B;
  font-weight: 600;
}

/* ---- List shell + list ---- */
.drafts-list-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  align-items: start;
  gap: 24px;
  margin-top: 18px;
}

.drafts-list {
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  list-style: none;
  border-top: 1px solid var(--border, #ECEFF1);
}

.draft-list-item {
  position: relative;
  margin: 0;
  border-bottom: 1px solid var(--border, #ECEFF1);
}

.draft-list-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: transparent;
  transition: background 0.18s ease;
}

.draft-list-item:hover::before {
  background: var(--accent-primary, #D32F2F);
}

.draft-list-item:has(.draft-card-flag-stale)::before {
  background: rgba(255, 152, 0, 0.6);
}

.draft-list-item:has(.draft-card-flag-fresh)::before {
  background: rgba(33, 150, 243, 0.45);
}

.draft-list-item-selected::before {
  background: var(--accent-primary, #D32F2F) !important;
}

.draft-list-item-selected {
  background: rgba(211, 47, 47, 0.04);
}

.drafts-list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  border-top: none;
}

.drafts-list-grid .draft-list-item {
  border: 1px solid var(--border, #ECEFF1);
  border-radius: 12px;
  padding-left: 8px;
}

.drafts-list-grid .draft-card {
  min-height: 100%;
  flex-direction: column;
  align-items: flex-start;
  padding: 18px 18px 16px 48px;
}

.drafts-list-grid .draft-card-head {
  flex-direction: column;
  align-items: flex-start;
}

.drafts-list-grid .draft-card-open {
  align-self: flex-end;
}

.draft-card-select {
  position: absolute;
  top: 22px;
  left: 14px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--border, #ECEFF1);
  border-radius: 6px;
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-tertiary, #607D8B);
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease;
}

.draft-card-select:hover {
  border-color: rgba(211, 47, 47, 0.32);
  color: var(--accent-primary, #D32F2F);
}

.draft-list-item-selected .draft-card-select {
  border-color: var(--accent-primary, #D32F2F);
  color: var(--accent-primary, #D32F2F);
}

.draft-card-select input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.draft-card {
  display: flex;
  align-items: center;
  gap: 18px;
  width: 100%;
  padding: 22px 16px 22px 56px;
  border: none;
  border-radius: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease;
  box-shadow: none;
}

.draft-card:hover {
  background: rgba(96, 125, 139, 0.03);
}

.draft-card-copy {
  flex: 1;
  min-width: 0;
}

.draft-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.draft-card-title-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.draft-card-title-group h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary, #263238);
}

.draft-card-status,
.draft-card-flag,
.draft-card-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.draft-card-status {
  background: rgba(76, 175, 80, 0.08);
  color: #2E7D32;
  border: 1px solid rgba(76, 175, 80, 0.18);
}

.draft-card-flag-stale {
  background: rgba(255, 152, 0, 0.08);
  color: #C77700;
  border: 1px solid rgba(255, 152, 0, 0.20);
}

.draft-card-flag-fresh {
  background: rgba(33, 150, 243, 0.08);
  color: #1565C0;
  border: 1px solid rgba(33, 150, 243, 0.20);
}

.draft-card-time {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-tertiary, #607D8B);
}

.draft-card-excerpt {
  margin: 8px 0 0;
  color: var(--text-secondary, #455A64);
  line-height: 1.65;
  font-size: 13.5px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.draft-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.draft-card-badge {
  background: transparent;
  color: var(--text-tertiary, #607D8B);
  font-weight: 500;
  border: 1px solid var(--border, #ECEFF1);
}

.draft-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 10px;
  color: var(--text-tertiary, #607D8B);
  font-size: 12px;
}

.draft-card-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.draft-card-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: transparent;
  color: var(--text-tertiary, #607D8B);
  flex-shrink: 0;
  border: 1px solid var(--border, #ECEFF1);
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.draft-card:hover .draft-card-open {
  background: rgba(211, 47, 47, 0.06);
  color: var(--accent-primary, #D32F2F);
  border-color: rgba(211, 47, 47, 0.20);
}

/* ---- Preview peek ---- */
.drafts-peek {
  position: sticky;
  top: 24px;
  padding: 22px;
  border: 1px solid var(--border, #ECEFF1);
  border-radius: 12px;
  background: var(--bg-surface, #FFFFFF);
  box-shadow: none;
}

.drafts-peek h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  color: var(--text-primary, #263238);
}

.drafts-peek-excerpt {
  margin: 12px 0 0;
  color: var(--text-secondary, #455A64);
  line-height: 1.7;
  font-size: 14px;
}

.drafts-peek-meta,
.drafts-peek-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0;
}

.drafts-peek-meta span,
.drafts-peek-tags span {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(96, 125, 139, 0.08);
  border: 1px solid var(--border, #ECEFF1);
  color: var(--text-secondary, #455A64);
  font-size: 12px;
  font-weight: 600;
}

/* ---- Empty state ---- */
.drafts-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding: 56px 24px;
  border: 1px dashed var(--border-strong, #CFD8DC);
  border-radius: 12px;
  background: transparent;
  text-align: center;
}

.drafts-empty-search {
  border-style: solid;
  border-color: var(--border, #ECEFF1);
}

.drafts-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(211, 47, 47, 0.06);
  color: var(--accent-primary, #D32F2F);
}

.drafts-empty h2 {
  margin: 0;
  font-size: 22px;
  color: var(--text-primary, #263238);
}

.drafts-empty p {
  max-width: 560px;
  margin: 0;
  color: var(--text-tertiary, #607D8B);
  line-height: 1.7;
  font-size: 14px;
}

.drafts-empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
}

/* ====== Responsive ====== */
@media (max-width: 1320px) {
  .drafts-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .drafts-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .drafts-list-shell {
    grid-template-columns: 1fr;
  }

  .drafts-peek {
    position: static;
  }
}

@media (max-width: 920px) {
  .drafts-view {
    padding: 20px;
  }

  .drafts-hero,
  .drafts-card-head {
    flex-direction: column;
    align-items: stretch;
  }

  .drafts-actions {
    justify-content: flex-start;
  }

  .drafts-summary-grid {
    grid-template-columns: 1fr;
  }

  .drafts-toolbar {
    grid-template-columns: 1fr;
  }

  .draft-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .draft-card-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .draft-card-open {
    align-self: flex-end;
  }
}

/* ====== Pagination ====== */
.drafts-pager {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  margin-top: 16px;
  background: var(--bg-surface, #FFFFFF);
  border: 1px solid var(--border, #ECEFF1);
  border-radius: 14px;
  color: var(--text-primary, #263238);
}

.drafts-pager-status {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary, #607D8B);
}

.drafts-pager-size {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.drafts-pager-size select {
  height: 28px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid var(--border, #CFD8DC);
  background: var(--bg-input, #FFFFFF);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
}

.drafts-pager-controls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.drafts-pager-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid var(--border, #ECEFF1);
  background: var(--bg-input, #FFFFFF);
  color: var(--text-primary, #263238);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.drafts-pager-btn:hover:not(:disabled) {
  background: var(--bg-hover, #F3F4F6);
  border-color: var(--accent-primary, #D32F2F);
}

.drafts-pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.drafts-pager-btn-active {
  background: var(--accent-primary, #D32F2F);
  border-color: var(--accent-primary, #D32F2F);
  color: #FFFFFF;
  font-weight: 700;
}

.drafts-pager-btn-active:hover:not(:disabled) {
  background: var(--accent-primary, #D32F2F);
  color: #FFFFFF;
}

.drafts-pager-ellipsis {
  padding: 0 4px;
  color: var(--text-muted, #90A4AE);
  user-select: none;
}

@media (max-width: 720px) {
  .drafts-pager {
    flex-direction: column;
    align-items: stretch;
  }
  .drafts-pager-status {
    justify-content: space-between;
  }
  .drafts-pager-controls {
    justify-content: center;
    flex-wrap: wrap;
  }
}

/* ====== Dark mode 全局对齐 ====== */
html.theme-dark .drafts-view,
html[data-theme="dark"] .drafts-view {
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}
html.theme-dark .drafts-hero,
html[data-theme="dark"] .drafts-hero,
html.theme-dark .drafts-toolbar,
html[data-theme="dark"] .drafts-toolbar,
html.theme-dark .drafts-batch-toolbar,
html[data-theme="dark"] .drafts-batch-toolbar,
html.theme-dark .drafts-empty,
html[data-theme="dark"] .drafts-empty,
html.theme-dark .draft-summary-card,
html[data-theme="dark"] .draft-summary-card,
html.theme-dark .draft-list-item,
html[data-theme="dark"] .draft-list-item,
html.theme-dark .draft-card,
html[data-theme="dark"] .draft-card,
html.theme-dark .drafts-peek,
html[data-theme="dark"] .drafts-peek {
  background: var(--bg-surface);
  border-color: var(--border);
  color: var(--text-primary);
}
html.theme-dark .drafts-meta,
html[data-theme="dark"] .drafts-meta,
html.theme-dark .draft-summary-card p,
html[data-theme="dark"] .draft-summary-card p,
html.theme-dark .draft-card-excerpt,
html[data-theme="dark"] .draft-card-excerpt,
html.theme-dark .draft-card-meta,
html[data-theme="dark"] .draft-card-meta,
html.theme-dark .draft-card-time,
html[data-theme="dark"] .draft-card-time,
html.theme-dark .drafts-peek-meta,
html[data-theme="dark"] .drafts-peek-meta,
html.theme-dark .drafts-peek-excerpt,
html[data-theme="dark"] .drafts-peek-excerpt {
  color: var(--text-secondary);
}
html.theme-dark .drafts-hero h1,
html[data-theme="dark"] .drafts-hero h1,
html.theme-dark .draft-summary-card strong,
html[data-theme="dark"] .draft-summary-card strong,
html.theme-dark .draft-card-title-group h2,
html[data-theme="dark"] .draft-card-title-group h2,
html.theme-dark .drafts-peek h2,
html[data-theme="dark"] .drafts-peek h2,
html.theme-dark .drafts-empty h2,
html[data-theme="dark"] .drafts-empty h2 {
  color: var(--text-primary);
}
html.theme-dark .drafts-search,
html[data-theme="dark"] .drafts-search,
html.theme-dark .drafts-select,
html[data-theme="dark"] .drafts-select,
html.theme-dark .drafts-sort-toggle,
html[data-theme="dark"] .drafts-sort-toggle,
html.theme-dark .drafts-view-segment,
html[data-theme="dark"] .drafts-view-segment,
html.theme-dark .drafts-icon-button,
html[data-theme="dark"] .drafts-icon-button,
html.theme-dark .drafts-action-tertiary,
html[data-theme="dark"] .drafts-action-tertiary,
html.theme-dark .drafts-action-secondary,
html[data-theme="dark"] .drafts-action-secondary,
html.theme-dark .drafts-filter-pill,
html[data-theme="dark"] .drafts-filter-pill,
html.theme-dark .draft-card-badge,
html[data-theme="dark"] .draft-card-badge,
html.theme-dark .drafts-peek-tags span,
html[data-theme="dark"] .drafts-peek-tags span {
  background: var(--bg-input);
  border-color: var(--border);
  color: var(--text-primary);
}
html.theme-dark .drafts-search input,
html[data-theme="dark"] .drafts-search input,
html.theme-dark .drafts-select select,
html[data-theme="dark"] .drafts-select select {
  background: transparent;
  color: var(--text-primary);
}
html.theme-dark .drafts-search input::placeholder,
html[data-theme="dark"] .drafts-search input::placeholder {
  color: var(--text-muted);
}
html.theme-dark .drafts-view-segment-active,
html[data-theme="dark"] .drafts-view-segment-active,
html.theme-dark .drafts-sort-toggle-active,
html[data-theme="dark"] .drafts-sort-toggle-active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #FFFFFF;
}
html.theme-dark .drafts-action-primary,
html[data-theme="dark"] .drafts-action-primary {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #FFFFFF;
}
html.theme-dark .draft-list-item-selected,
html[data-theme="dark"] .draft-list-item-selected,
html.theme-dark .draft-list-item-selected .draft-card,
html[data-theme="dark"] .draft-list-item-selected .draft-card {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
}
html.theme-dark .draft-card-status,
html[data-theme="dark"] .draft-card-status,
html.theme-dark .draft-card-flag-fresh,
html[data-theme="dark"] .draft-card-flag-fresh {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  border-color: var(--accent-border);
}
html.theme-dark .draft-card-flag-stale,
html[data-theme="dark"] .draft-card-flag-stale {
  background: var(--warning-light);
  color: var(--warning);
  border-color: var(--warning);
}
html.theme-dark .drafts-pager,
html[data-theme="dark"] .drafts-pager,
html.theme-dark .drafts-pager-btn,
html[data-theme="dark"] .drafts-pager-btn,
html.theme-dark .drafts-pager-size select,
html[data-theme="dark"] .drafts-pager-size select {
  background: var(--bg-input);
  border-color: var(--border);
  color: var(--text-primary);
}
html.theme-dark .drafts-pager-btn-active,
html[data-theme="dark"] .drafts-pager-btn-active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #FFFFFF;
}
</style>
