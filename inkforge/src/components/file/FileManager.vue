<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useArticleStore, type FileImportResult } from '@/stores/article'
import { useCategoryStore } from '@/stores/category'
import { useAssetStore } from '@/stores/asset'
import type { Article, Category } from '@/types'
import { resolveCategoryIcon } from '@/utils/iconography'
import { ARTICLE_STATUS } from '@/constants'
import { getArticleStatusClass, getArticleStatusLabel, isDraftBoxStatus } from '@/core/lifecycle'

// ═══════════════════════════════════════════════════════════════════
// Store 接入（真实数据，零 Mock）
// ═══════════════════════════════════════════════════════════════════

const articleStore = useArticleStore()
const categoryStore = useCategoryStore()
const assetStore = useAssetStore()

const { articles, selectedArticleId } = storeToRefs(articleStore)
const { categories } = storeToRefs(categoryStore)
const { assets } = storeToRefs(assetStore)

// ═══════════════════════════════════════════════════════════════════
// 搜索
// ═══════════════════════════════════════════════════════════════════

type FileManagerViewMode = 'tree' | 'flat' | 'recent'
type FileManagerSortField = 'updatedAt' | 'createdAt' | 'title' | 'status'
type FileManagerSortDirection = 'asc' | 'desc'
type FileManagerStatusFilter = 'all' | 'drafts' | 'review' | 'ready' | 'done'

const FILE_MANAGER_PREF_KEY = 'inkforge:file-manager:prefs:v1'
const FILE_MANAGER_VIEW_MODES: FileManagerViewMode[] = ['tree', 'flat', 'recent']
const FILE_MANAGER_SORT_FIELDS: FileManagerSortField[] = ['updatedAt', 'createdAt', 'title', 'status']
const FILE_MANAGER_SORT_DIRECTIONS: FileManagerSortDirection[] = ['asc', 'desc']
const FILE_MANAGER_STATUS_FILTERS: FileManagerStatusFilter[] = ['all', 'drafts', 'review', 'ready', 'done']

interface FileManagerPrefs {
    viewMode: FileManagerViewMode
    sortField: FileManagerSortField
    sortDirection: FileManagerSortDirection
    statusFilter: FileManagerStatusFilter
    expandedMap: Record<string, boolean>
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickPreferenceValue<T extends string>(value: unknown, allowedValues: readonly T[], fallback: T): T {
    return typeof value === 'string' && allowedValues.includes(value as T) ? value as T : fallback
}

function pickExpandedMap(value: unknown): Record<string, boolean> {
    if (!isRecord(value)) return {}
    return Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
    )
}

function readFileManagerPrefs(): FileManagerPrefs {
    const fallback: FileManagerPrefs = {
        viewMode: 'tree',
        sortField: 'updatedAt',
        sortDirection: 'desc',
        statusFilter: 'all',
        expandedMap: {},
    }
    if (typeof window === 'undefined') return fallback

    try {
        const rawPrefs = JSON.parse(window.localStorage.getItem(FILE_MANAGER_PREF_KEY) ?? '{}') as unknown
        if (!isRecord(rawPrefs)) return fallback
        return {
            viewMode: pickPreferenceValue(rawPrefs.viewMode, FILE_MANAGER_VIEW_MODES, fallback.viewMode),
            sortField: pickPreferenceValue(rawPrefs.sortField, FILE_MANAGER_SORT_FIELDS, fallback.sortField),
            sortDirection: pickPreferenceValue(rawPrefs.sortDirection, FILE_MANAGER_SORT_DIRECTIONS, fallback.sortDirection),
            statusFilter: pickPreferenceValue(rawPrefs.statusFilter, FILE_MANAGER_STATUS_FILTERS, fallback.statusFilter),
            expandedMap: pickExpandedMap(rawPrefs.expandedMap),
        }
    } catch {
        return fallback
    }
}

const initialPrefs = readFileManagerPrefs()
const searchQuery = ref('')
const viewMode = ref<FileManagerViewMode>(initialPrefs.viewMode)
const sortField = ref<FileManagerSortField>(initialPrefs.sortField)
const sortDirection = ref<FileManagerSortDirection>(initialPrefs.sortDirection)
const statusFilter = ref<FileManagerStatusFilter>(initialPrefs.statusFilter)

function matchesStatusFilter(article: Article): boolean {
    switch (statusFilter.value) {
        case 'drafts':
            return isDraftBoxStatus(article.status)
        case 'review':
            return article.status === ARTICLE_STATUS.UNDER_REVIEW
        case 'ready':
            return article.status === ARTICLE_STATUS.READY_TO_PUBLISH
        case 'done':
            return article.status === ARTICLE_STATUS.PROCESSED || article.status === ARTICLE_STATUS.PUBLISHED || article.status === ARTICLE_STATUS.ARCHIVED
        case 'all':
        default:
            return true
    }
}

function compareArticles(a: Article, b: Article, field: FileManagerSortField): number {
    switch (field) {
        case 'title':
            return a.title.localeCompare(b.title, 'zh-CN')
        case 'createdAt':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'status':
            return getArticleStatusLabel(a.status).localeCompare(getArticleStatusLabel(b.status), 'zh-CN')
        case 'updatedAt':
        default:
            return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime()
    }
}

const filteredArticlesMap = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    const filtered = articles.value.filter((article) => {
        if (!matchesStatusFilter(article)) return false
        if (!q) return true
        return [article.title, article.description, article.rawContent, article.sourceName, article.tags.join(' ')]
            .some(value => value?.toLowerCase().includes(q))
    })
    const effectiveSortField: FileManagerSortField = viewMode.value === 'recent' ? 'updatedAt' : sortField.value
    const effectiveSortDirection: FileManagerSortDirection = viewMode.value === 'recent' ? 'desc' : sortDirection.value
    const sorted = [...filtered].sort((a, b) => compareArticles(a, b, effectiveSortField))
    return effectiveSortDirection === 'asc' ? sorted : sorted.reverse()
})

// ═══════════════════════════════════════════════════════════════════
// 文件树：按分类分组
// ═══════════════════════════════════════════════════════════════════

interface CategoryNode {
    category: Category | null // null 代表"未分类"
    articles: Article[]
    expanded: boolean
}

const expandedMap = ref<Record<string, boolean>>(initialPrefs.expandedMap ?? {})

/** 初始化时默认全部展开 */
function ensureExpanded(key: string): boolean {
    if (!(key in expandedMap.value)) {
        expandedMap.value[key] = true
    }
    return expandedMap.value[key]
}

function toggleExpand(key: string): void {
    if (!(key in expandedMap.value)) {
        expandedMap.value[key] = true
    }
    expandedMap.value[key] = !expandedMap.value[key]
}

const fileTree = computed<CategoryNode[]>(() => {
    const filtered = filteredArticlesMap.value

    if (filtered.length === 0 && (searchQuery.value.trim() || statusFilter.value !== 'all')) return []

    if (viewMode.value === 'flat' || viewMode.value === 'recent') {
        return [{
            category: null,
            articles: viewMode.value === 'recent' ? filtered.slice(0, 100) : filtered,
            expanded: true,
        }]
    }

    const catMap = new Map<string, Article[]>()
    const uncategorized: Article[] = []

    for (const article of filtered) {
        if (article.categoryId) {
            const existing = catMap.get(article.categoryId)
            if (existing) {
                existing.push(article)
            } else {
                catMap.set(article.categoryId, [article])
            }
        } else {
            uncategorized.push(article)
        }
    }

    const nodes: CategoryNode[] = []

    for (const cat of categories.value) {
        const catArticles = catMap.get(cat.id) ?? []
        if ((searchQuery.value.trim() || statusFilter.value !== 'all') && catArticles.length === 0) continue
        nodes.push({
            category: cat,
            articles: catArticles,
            expanded: ensureExpanded(cat.id),
        })
    }

    if (!searchQuery.value.trim() || uncategorized.length > 0 || statusFilter.value !== 'all') {
        nodes.push({
            category: null,
            articles: uncategorized,
            expanded: ensureExpanded('__uncategorized__'),
        })
    }

    return nodes
})

// ═══════════════════════════════════════════════════════════════════
// 素材区域
// ═══════════════════════════════════════════════════════════════════

const assetsExpanded = ref(true)

// 当选中文章变化时，加载对应素材
watch(() => selectedArticleId.value, async (newId) => {
    if (newId) {
        await assetStore.loadAssets(newId)
    }
}, { immediate: true })

const currentAssets = computed(() => {
    if (!selectedArticleId.value) return []
    return assets.value.filter(a => a.articleId === selectedArticleId.value)
})

const smartFolderCounts = computed(() => ({
    all: articles.value.length,
    drafts: articles.value.filter(article => isDraftBoxStatus(article.status)).length,
    review: articles.value.filter(article => article.status === ARTICLE_STATUS.UNDER_REVIEW).length,
    ready: articles.value.filter(article => article.status === ARTICLE_STATUS.READY_TO_PUBLISH).length,
    done: articles.value.filter(article => article.status === ARTICLE_STATUS.PROCESSED || article.status === ARTICLE_STATUS.PUBLISHED || article.status === ARTICLE_STATUS.ARCHIVED).length,
}))

function setStatusFilter(nextFilter: FileManagerStatusFilter): void {
    statusFilter.value = nextFilter
}

function persistFileManagerPrefs(prefs: FileManagerPrefs): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(FILE_MANAGER_PREF_KEY, JSON.stringify(prefs))
    } catch {
        // UI preferences are non-critical; failed persistence must not block document operations.
    }
}

watch([viewMode, sortField, sortDirection, statusFilter, expandedMap], () => {
    persistFileManagerPrefs({
        viewMode: viewMode.value,
        sortField: sortField.value,
        sortDirection: sortDirection.value,
        statusFilter: statusFilter.value,
        expandedMap: expandedMap.value,
    })
}, { deep: true })

function getAssetThumbnail(assetId: string): string | null {
    return assetStore.getThumbnailUrl(assetId)
}

// ═══════════════════════════════════════════════════════════════════
// 新建菜单（下拉）
// ═══════════════════════════════════════════════════════════════════

const showNewMenu = ref(false)
const newMenuRef = ref<HTMLElement | null>(null)

function toggleNewMenu(): void {
    showNewMenu.value = !showNewMenu.value
}

async function createBlankArticle(): Promise<void> {
    showNewMenu.value = false
    try {
        const article = await articleStore.addArticle({
            title: '无标题文章',
            sourceUrl: 'https://local.inkforge.app/blank',
            categoryId: categoryStore.selectedCategoryId ?? undefined,
        })
        articleStore.selectArticle(article.id)
    } catch {
        // 静默失败，store 内部已有错误处理
    }
}

// ═══════════════════════════════════════════════════════════════════
// 文件导入
// ═══════════════════════════════════════════════════════════════════

const importing = ref(false)
const importResult = ref<FileImportResult | null>(null)
let importResultTimer: ReturnType<typeof setTimeout> | null = null

async function handleImportFiles(): Promise<void> {
    showNewMenu.value = false
    if (importing.value) return

    importing.value = true
    try {
        const result = await articleStore.importFromFiles()
        // 用户取消选择时（success=0, failed=0, skippedOversize=0）不显示通知
        if (result.success > 0 || result.failed > 0 || result.skippedOversize > 0) {
            importResult.value = result
            // 5 秒后自动关闭通知
            if (importResultTimer) clearTimeout(importResultTimer)
            importResultTimer = setTimeout(() => {
                importResult.value = null
            }, 5000)
        }
    } catch (err) {
        importResult.value = {
            success: 0,
            failed: 1,
            skippedOversize: 0,
            errors: [err instanceof Error ? err.message : '导入失败'],
        }
    } finally {
        importing.value = false
    }
}

function dismissImportResult(): void {
    importResult.value = null
    if (importResultTimer) {
        clearTimeout(importResultTimer)
        importResultTimer = null
    }
}

const showNewCategoryInput = ref(false)
const newCategoryName = ref('')
const newCategoryInputRef = ref<HTMLInputElement | null>(null)

function startNewCategory(): void {
    showNewMenu.value = false
    showNewCategoryInput.value = true
    newCategoryName.value = ''
    nextTick(() => {
        newCategoryInputRef.value?.focus()
    })
}

async function confirmNewCategory(): Promise<void> {
    const name = newCategoryName.value.trim()
    if (!name) {
        showNewCategoryInput.value = false
        return
    }
    try {
        await categoryStore.addCategory(name)
    } catch {
        // 静默失败
    }
    showNewCategoryInput.value = false
    newCategoryName.value = ''
}

function cancelNewCategory(): void {
    showNewCategoryInput.value = false
    newCategoryName.value = ''
}

// ═══════════════════════════════════════════════════════════════════
// 文章选择
// ═══════════════════════════════════════════════════════════════════

function handleSelectArticle(id: string): void {
    articleStore.selectArticle(id)
}

// ═══════════════════════════════════════════════════════════════════
// 右键菜单
// ═══════════════════════════════════════════════════════════════════

interface ContextMenuState {
    visible: boolean
    x: number
    y: number
    type: 'article' | 'category' | null
    targetId: string | null
    /** 分类右键时为 null 代表"未分类" */
    targetCategoryId: string | null
}

const contextMenu = ref<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    type: null,
    targetId: null,
    targetCategoryId: null,
})

const showMoveSubmenu = ref(false)

function openArticleContextMenu(event: MouseEvent, articleId: string): void {
    event.preventDefault()
    event.stopPropagation()
    showMoveSubmenu.value = false
    contextMenu.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        type: 'article',
        targetId: articleId,
        targetCategoryId: null,
    }
}

function openCategoryContextMenu(event: MouseEvent, categoryId: string | null): void {
    event.preventDefault()
    event.stopPropagation()
    showMoveSubmenu.value = false
    contextMenu.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        type: 'category',
        targetId: null,
        targetCategoryId: categoryId,
    }
}

function closeContextMenu(): void {
    contextMenu.value.visible = false
    showMoveSubmenu.value = false
}

// 右键菜单位置修正（避免超出视口）
const adjustedMenuPosition = computed(() => {
    const menuWidth = 200
    const menuHeight = 180
    let x = contextMenu.value.x
    let y = contextMenu.value.y

    if (typeof window !== 'undefined') {
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 8
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 8
        }
    }

    return { x, y }
})

// 点击外部关闭右键菜单和新建菜单
function handleGlobalClick(event: MouseEvent): void {
    // 关闭右键菜单
    if (contextMenu.value.visible) {
        closeContextMenu()
    }
    // 关闭新建菜单
    if (showNewMenu.value && newMenuRef.value && !newMenuRef.value.contains(event.target as Node)) {
        showNewMenu.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
    document.removeEventListener('click', handleGlobalClick)
    assetStore.cleanup()
})

// ─── 右键菜单操作：打开文章 ───
function ctxOpenArticle(): void {
    if (contextMenu.value.targetId) {
        articleStore.selectArticle(contextMenu.value.targetId)
    }
    closeContextMenu()
}

// ─── 右键菜单操作：重命名文章（inline） ───
const renamingArticleId = ref<string | null>(null)
const renameValue = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

function ctxStartRenameArticle(): void {
    const id = contextMenu.value.targetId
    if (!id) return
    const article = articles.value.find(a => a.id === id)
    if (!article) return
    renamingArticleId.value = id
    renameValue.value = article.title
    closeContextMenu()
    nextTick(() => {
        renameInputRef.value?.focus()
        renameInputRef.value?.select()
    })
}

async function confirmRenameArticle(): Promise<void> {
    const id = renamingArticleId.value
    if (!id) return
    const newTitle = renameValue.value.trim()
    if (newTitle) {
        try {
            await articleStore.updateArticle(id, { title: newTitle })
        } catch {
            // 静默
        }
    }
    renamingArticleId.value = null
    renameValue.value = ''
}

function cancelRenameArticle(): void {
    renamingArticleId.value = null
    renameValue.value = ''
}

// ─── 右键菜单操作：移动到分类 ───
function ctxToggleMoveSubmenu(): void {
    showMoveSubmenu.value = !showMoveSubmenu.value
}

async function ctxMoveToCategory(categoryId: string | null): Promise<void> {
    const articleId = contextMenu.value.targetId
    if (!articleId) return
    try {
        await articleStore.moveToCategory(articleId, categoryId)
    } catch {
        // 静默
    }
    closeContextMenu()
}

// ─── 右键菜单操作：删除文章（确认） ───
const showDeleteConfirm = ref(false)
const pendingDeleteType = ref<'article' | 'category' | null>(null)
const pendingDeleteId = ref<string | null>(null)

function ctxDeleteArticle(): void {
    pendingDeleteType.value = 'article'
    pendingDeleteId.value = contextMenu.value.targetId
    showDeleteConfirm.value = true
    closeContextMenu()
}

async function confirmDelete(): Promise<void> {
    if (!pendingDeleteId.value) {
        showDeleteConfirm.value = false
        return
    }
    try {
        if (pendingDeleteType.value === 'article') {
            await articleStore.deleteArticle(pendingDeleteId.value)
        } else if (pendingDeleteType.value === 'category') {
            await categoryStore.deleteCategory(pendingDeleteId.value)
        }
    } catch {
        // 静默
    }
    showDeleteConfirm.value = false
    pendingDeleteType.value = null
    pendingDeleteId.value = null
}

function cancelDelete(): void {
    showDeleteConfirm.value = false
    pendingDeleteType.value = null
    pendingDeleteId.value = null
}

// ─── 右键菜单操作：分类 - 重命名 ───
const renamingCategoryId = ref<string | null>(null)
const renameCategoryValue = ref('')
const renameCategoryInputRef = ref<HTMLInputElement | null>(null)

function ctxStartRenameCategory(): void {
    const id = contextMenu.value.targetCategoryId
    if (!id) return
    const cat = categories.value.find(c => c.id === id)
    if (!cat) return
    renamingCategoryId.value = id
    renameCategoryValue.value = cat.name
    closeContextMenu()
    nextTick(() => {
        renameCategoryInputRef.value?.focus()
        renameCategoryInputRef.value?.select()
    })
}

async function confirmRenameCategory(): Promise<void> {
    const id = renamingCategoryId.value
    if (!id) return
    const newName = renameCategoryValue.value.trim()
    if (newName) {
        try {
            await categoryStore.updateCategory(id, { name: newName })
        } catch {
            // 静默
        }
    }
    renamingCategoryId.value = null
    renameCategoryValue.value = ''
}

function cancelRenameCategory(): void {
    renamingCategoryId.value = null
    renameCategoryValue.value = ''
}

// ─── 右键菜单操作：分类 - 新建文章 ───
async function ctxNewArticleInCategory(): Promise<void> {
    const categoryId = contextMenu.value.targetCategoryId
    closeContextMenu()
    try {
        const article = await articleStore.addArticle({
            title: '无标题文章',
            sourceUrl: 'https://local.inkforge.app/blank',
            categoryId: categoryId ?? undefined,
        })
        articleStore.selectArticle(article.id)
    } catch {
        // 静默
    }
}

// ─── 右键菜单操作：分类 - 删除 ───
function ctxDeleteCategory(): void {
    const id = contextMenu.value.targetCategoryId
    if (!id) {
        closeContextMenu()
        return
    }
    pendingDeleteType.value = 'category'
    pendingDeleteId.value = id
    showDeleteConfirm.value = true
    closeContextMenu()
}

// ═══════════════════════════════════════════════════════════════════
// 时间格式化
// ═══════════════════════════════════════════════════════════════════

function formatRelativeTime(date: Date | string | number): string {
    const d = date instanceof Date ? date : new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()

    if (diffMs < 0) return formatDate(d)

    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`

    // 检查是否是昨天
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (
        d.getFullYear() === yesterday.getFullYear() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getDate() === yesterday.getDate()
    ) {
        return '昨天'
    }

    if (diffDays < 30) return `${diffDays}天前`

    return formatDate(d)
}

function formatDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

// ═══════════════════════════════════════════════════════════════════
// 状态标记映射
// ═══════════════════════════════════════════════════════════════════

function getStatusLabel(status: string): string {
    return getArticleStatusLabel(status)
}

function getStatusClass(status: string): string {
    const statusClass = getArticleStatusClass(status)
    if (statusClass === 'status-draft') return 'status-new'
    if (statusClass === 'status-done') return 'status-processed'
    return statusClass
}

// ═══════════════════════════════════════════════════════════════════
// 节点 key 辅助
// ═══════════════════════════════════════════════════════════════════

function getCategoryKey(node: CategoryNode): string {
    return node.category?.id ?? '__uncategorized__'
}

function getCategoryLabel(node: CategoryNode): string {
    if (node.category) return node.category.name
    if (viewMode.value === 'flat') return '全部文档'
    if (viewMode.value === 'recent') return '最近更新'
    return '未分类'
}

function getCategoryIconComponent(node: CategoryNode) {
    return resolveCategoryIcon(node.category?.icon, node.category ? 'folder' : 'uncategorized')
}

function getMoveTargetIcon(icon?: string, fallback: string = 'folder') {
    return resolveCategoryIcon(icon, fallback)
}

function getArticleCount(node: CategoryNode): number {
    return node.articles.length
}

/** 删除确认文案 */
const deleteConfirmText = computed(() => {
    if (pendingDeleteType.value === 'article') {
        return '确定要删除这篇文章吗？此操作不可撤销。'
    }
    return '确定要删除这个分类吗？分类下的文章将移至"未分类"。'
})
</script>

<template>
  <div class="fm-root">
    <!-- 顶部工具栏 -->
    <div class="fm-toolbar">
      <div class="fm-toolbar-row fm-toolbar-row--search">
        <div class="fm-search-wrap">
          <!-- 搜索图标 SVG -->
          <svg
            class="fm-search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            />
            <line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="fm-search-input"
            placeholder="搜索文章..."
          >
        </div>
      </div>
      <div
        class="fm-toolbar-row fm-toolbar-row--actions fm-view-controls"
        aria-label="文件管理器视图控制"
      >
        <div
          class="fm-segmented"
          role="tablist"
          aria-label="视图模式"
        >
          <button
            type="button"
            class="fm-seg-tab"
            :class="{ active: viewMode === 'tree' }"
            role="tab"
            :aria-selected="viewMode === 'tree'"
            title="树形视图"
            @click="viewMode = 'tree'"
          >
            树形
          </button>
          <button
            type="button"
            class="fm-seg-tab"
            :class="{ active: viewMode === 'flat' }"
            role="tab"
            :aria-selected="viewMode === 'flat'"
            title="平铺视图"
            @click="viewMode = 'flat'"
          >
            平铺
          </button>
          <button
            type="button"
            class="fm-seg-tab"
            :class="{ active: viewMode === 'recent' }"
            role="tab"
            :aria-selected="viewMode === 'recent'"
            title="最近视图"
            @click="viewMode = 'recent'"
          >
            最近
          </button>
        </div>
        <select
          v-model="sortField"
          class="fm-toolbar-select"
          title="排序字段"
          :disabled="viewMode === 'recent'"
        >
          <option value="updatedAt">
            更新
          </option>
          <option value="createdAt">
            创建
          </option>
          <option value="title">
            标题
          </option>
          <option value="status">
            状态
          </option>
        </select>
        <button
          type="button"
          class="fm-sort-toggle"
          :class="{ 'is-active': sortDirection !== 'asc' && viewMode !== 'recent', 'is-asc': sortDirection === 'asc' && viewMode !== 'recent' }"
          :disabled="viewMode === 'recent'"
          :title="viewMode === 'recent' ? '最近视图固定按更新时间降序' : sortDirection === 'asc' ? '升序，点击切换为降序' : '降序，点击切换为升序'"
          :aria-label="sortDirection === 'asc' ? '升序排列' : '降序排列'"
          @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'"
        >
          <svg
            class="fm-sort-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h13" />
            <path d="M3 12h9" />
            <path d="M3 18h5" />
            <path d="M21 6v14" />
            <path d="M17 16l4 4 4-4" />
          </svg>
          <span class="fm-sort-label">{{ viewMode === 'recent' ? '降序' : sortDirection === 'asc' ? '升序' : '降序' }}</span>
        </button>
      </div>
      <div
        ref="newMenuRef"
        class="fm-new-wrap"
      >
        <button
          class="fm-new-btn"
          title="新建"
          @click.stop="toggleNewMenu"
        >
          <!-- Plus SVG -->
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line
              x1="12"
              y1="5"
              x2="12"
              y2="19"
            />
            <line
              x1="5"
              y1="12"
              x2="19"
              y2="12"
            />
          </svg>
          <!-- Chevron down SVG -->
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <!-- 新建下拉菜单 -->
        <Transition name="fm-fade">
          <div
            v-if="showNewMenu"
            class="fm-dropdown"
          >
            <button
              class="fm-dropdown-item"
              @click.stop="createBlankArticle"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line
                  x1="12"
                  y1="18"
                  x2="12"
                  y2="12"
                />
                <line
                  x1="9"
                  y1="15"
                  x2="15"
                  y2="15"
                />
              </svg>
              <span>新建空白文章</span>
            </button>
            <button
              class="fm-dropdown-item"
              @click.stop="startNewCategory"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                />
                <line
                  x1="12"
                  y1="11"
                  x2="12"
                  y2="17"
                />
                <line
                  x1="9"
                  y1="14"
                  x2="15"
                  y2="14"
                />
              </svg>
              <span>新建分类</span>
            </button>
            <div class="fm-dropdown-separator" />
            <button
              class="fm-dropdown-item"
              :disabled="importing"
              @click.stop="handleImportFiles"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line
                  x1="12"
                  y1="3"
                  x2="12"
                  y2="15"
                />
              </svg>
              <span>{{ importing ? '导入中...' : '导入文件' }}</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 导入结果通知 -->
    <Transition name="fm-fade">
      <div
        v-if="importResult"
        class="fm-import-result"
        :class="importResult.failed > 0 ? 'fm-import-warning' : 'fm-import-success'"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <template v-if="importResult.failed > 0">
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            />
            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            />
          </template>
          <template v-else>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </template>
        </svg>
        <span class="fm-import-text">{{ importResult.success }} 成功<template v-if="importResult.failed > 0"> / {{ importResult.failed }} 失败</template><template v-if="importResult.skippedOversize > 0"> / {{ importResult.skippedOversize }} 超限跳过</template></span>
        <button
          class="fm-import-close"
          title="关闭"
          @click="dismissImportResult"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line
              x1="18"
              y1="6"
              x2="6"
              y2="18"
            />
            <line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- 新建分类 inline 输入 -->
    <div
      v-if="showNewCategoryInput"
      class="fm-inline-input"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <input
        ref="newCategoryInputRef"
        v-model="newCategoryName"
        type="text"
        class="fm-rename-input"
        placeholder="分类名称..."
        @keydown.enter="confirmNewCategory"
        @keydown.escape="cancelNewCategory"
        @blur="confirmNewCategory"
      >
    </div>

    <div
      class="fm-smart-folders"
      aria-label="智能文件夹"
    >
      <button
        type="button"
        class="fm-smart-folder"
        :class="{ active: statusFilter === 'all' }"
        @click="setStatusFilter('all')"
      >
        <span>全部</span>
        <strong>{{ smartFolderCounts.all }}</strong>
      </button>
      <button
        type="button"
        class="fm-smart-folder"
        :class="{ active: statusFilter === 'drafts' }"
        @click="setStatusFilter('drafts')"
      >
        <span>草稿/写作</span>
        <strong>{{ smartFolderCounts.drafts }}</strong>
      </button>
      <button
        type="button"
        class="fm-smart-folder"
        :class="{ active: statusFilter === 'review' }"
        @click="setStatusFilter('review')"
      >
        <span>审阅</span>
        <strong>{{ smartFolderCounts.review }}</strong>
      </button>
      <button
        type="button"
        class="fm-smart-folder"
        :class="{ active: statusFilter === 'ready' }"
        @click="setStatusFilter('ready')"
      >
        <span>待发布</span>
        <strong>{{ smartFolderCounts.ready }}</strong>
      </button>
      <button
        type="button"
        class="fm-smart-folder"
        :class="{ active: statusFilter === 'done' }"
        @click="setStatusFilter('done')"
      >
        <span>完成</span>
        <strong>{{ smartFolderCounts.done }}</strong>
      </button>
    </div>

    <!-- 文件树 -->
    <div class="fm-tree">
      <template v-if="fileTree.length === 0 && (searchQuery.trim() || statusFilter !== 'all')">
        <div class="fm-empty-search">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9CA3AF"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            />
            <line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            />
          </svg>
          <p>未找到匹配的文章</p>
        </div>
      </template>

      <template v-else-if="articles.length === 0 && !searchQuery.trim()">
        <div class="fm-empty-state">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9CA3AF"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p class="fm-empty-title">
            还没有任何文章
          </p>
          <p class="fm-empty-hint">
            点击上方 + 号新建文章或分类
          </p>
        </div>
      </template>

      <template v-else>
        <TransitionGroup
          name="fm-list"
          tag="div"
          class="fm-category-list"
        >
        <div
          v-for="node in fileTree"
          :key="getCategoryKey(node)"
          class="fm-category-node"
        >
          <!-- 分类行 -->
          <div
            class="fm-category-row"
            :class="{ 'fm-expanded': node.expanded }"
            @click="toggleExpand(getCategoryKey(node))"
            @contextmenu="openCategoryContextMenu($event, node.category?.id ?? null)"
          >
            <!-- 展开/折叠箭头 -->
            <svg
              class="fm-chevron"
              :class="{ 'fm-chevron-open': node.expanded }"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>

            <!-- 分类图标 -->
            <component
              :is="getCategoryIconComponent(node)"
              class="fm-cat-icon"
              :size="14"
              :stroke-width="2"
            />

            <!-- 重命名模式 -->
            <template v-if="renamingCategoryId === node.category?.id && node.category">
              <input
                ref="renameCategoryInputRef"
                v-model="renameCategoryValue"
                type="text"
                class="fm-rename-input fm-rename-inline"
                @keydown.enter="confirmRenameCategory"
                @keydown.escape="cancelRenameCategory"
                @blur="confirmRenameCategory"
                @click.stop
              >
            </template>
            <template v-else>
              <span class="fm-cat-name">{{ getCategoryLabel(node) }}</span>
            </template>

            <span class="fm-cat-count">({{ getArticleCount(node) }})</span>
          </div>

          <!-- 分类下的文章列表（展开/折叠动画） -->
          <div
            class="fm-articles-wrap"
            :class="{ 'fm-articles-expanded': node.expanded }"
          >
            <TransitionGroup
              name="fm-list"
              tag="div"
              class="fm-articles-inner"
            >
            <div
              v-for="article in node.articles"
              :key="article.id"
              class="fm-article-row"
              :class="{
                'fm-article-active': selectedArticleId === article.id,
              }"
              @click="handleSelectArticle(article.id)"
              @contextmenu="openArticleContextMenu($event, article.id)"
            >
              <!-- 文件图标 -->
              <svg
                class="fm-file-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>

              <!-- 重命名模式 -->
              <template v-if="renamingArticleId === article.id">
                <input
                  ref="renameInputRef"
                  v-model="renameValue"
                  type="text"
                  class="fm-rename-input fm-rename-inline"
                  @keydown.enter="confirmRenameArticle"
                  @keydown.escape="cancelRenameArticle"
                  @blur="confirmRenameArticle"
                  @click.stop
                >
              </template>
              <template v-else>
                <span class="fm-article-title">{{ article.title }}</span>
              </template>

              <!-- 状态标记 -->
              <span
                class="fm-status"
                :class="getStatusClass(article.status)"
              >
                {{ getStatusLabel(article.status) }}
              </span>

              <!-- 更新时间 -->
              <span class="fm-article-time">{{ formatRelativeTime(article.updatedAt) }}</span>
            </div>
            </TransitionGroup>
          </div>
        </div>
        </TransitionGroup>
      </template>
    </div>

    <!-- 素材区域 -->
    <div
      v-if="selectedArticleId && currentAssets.length > 0"
      class="fm-assets-section"
    >
      <div
        class="fm-assets-header"
        @click="assetsExpanded = !assetsExpanded"
      >
        <svg
          class="fm-chevron"
          :class="{ 'fm-chevron-open': assetsExpanded }"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <!-- 图片图标 -->
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            ry="2"
          />
          <circle
            cx="8.5"
            cy="8.5"
            r="1.5"
          />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span class="fm-assets-label">素材 ({{ currentAssets.length }})</span>
      </div>
      <div
        class="fm-assets-grid"
        :class="{ 'fm-assets-grid-expanded': assetsExpanded }"
      >
        <div
          v-for="asset in currentAssets"
          :key="asset.id"
          class="fm-asset-item"
          :title="asset.name"
        >
          <img
            v-if="getAssetThumbnail(asset.id)"
            :src="getAssetThumbnail(asset.id)!"
            :alt="asset.name"
            class="fm-asset-thumb"
          >
          <div
            v-else
            class="fm-asset-placeholder"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9CA3AF"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                ry="2"
              />
              <circle
                cx="8.5"
                cy="8.5"
                r="1.5"
              />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <span class="fm-asset-name">{{ asset.name }}</span>
        </div>
      </div>
    </div>

    <!-- 右键菜单（Teleport to body） -->
    <Teleport to="body">
      <Transition name="fm-fade">
        <div
          v-if="contextMenu.visible"
          class="fm-context-menu"
          :style="{ left: adjustedMenuPosition.x + 'px', top: adjustedMenuPosition.y + 'px' }"
          @click.stop
        >
          <!-- 文章右键菜单 -->
          <template v-if="contextMenu.type === 'article'">
            <button
              class="fm-ctx-item"
              @click="ctxOpenArticle"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line
                  x1="10"
                  y1="14"
                  x2="21"
                  y2="3"
                />
              </svg>
              <span>打开</span>
            </button>
            <button
              class="fm-ctx-item"
              @click="ctxStartRenameArticle"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>重命名</span>
            </button>
            <div class="fm-ctx-separator" />
            <div class="fm-ctx-submenu-wrap">
              <button
                class="fm-ctx-item fm-ctx-has-submenu"
                @click.stop="ctxToggleMoveSubmenu"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                  />
                </svg>
                <span>移动到分类</span>
                <svg
                  class="fm-ctx-arrow"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <!-- 子菜单 -->
              <Transition name="fm-fade">
                <div
                  v-if="showMoveSubmenu"
                  class="fm-ctx-submenu"
                >
                  <button
                    class="fm-ctx-item"
                    @click="ctxMoveToCategory(null)"
                  >
                    <component
                      :is="getMoveTargetIcon(undefined, 'uncategorized')"
                      class="fm-ctx-item-icon"
                      :size="14"
                      :stroke-width="2"
                    />
                    <span>未分类</span>
                  </button>
                  <button
                    v-for="cat in categories"
                    :key="cat.id"
                    class="fm-ctx-item"
                    @click="ctxMoveToCategory(cat.id)"
                  >
                    <component
                      :is="getMoveTargetIcon(cat.icon)"
                      class="fm-ctx-item-icon"
                      :size="14"
                      :stroke-width="2"
                    />
                    <span>{{ cat.name }}</span>
                  </button>
                </div>
              </Transition>
            </div>
            <div class="fm-ctx-separator" />
            <button
              class="fm-ctx-item fm-ctx-danger"
              @click="ctxDeleteArticle"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
              <span>删除</span>
            </button>
          </template>

          <!-- 分类右键菜单 -->
          <template v-if="contextMenu.type === 'category'">
            <!-- 仅对真实分类（非"未分类"）显示重命名和删除 -->
            <template v-if="contextMenu.targetCategoryId">
              <button
                class="fm-ctx-item"
                @click="ctxStartRenameCategory"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>重命名</span>
              </button>
            </template>
            <button
              class="fm-ctx-item"
              @click="ctxNewArticleInCategory"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line
                  x1="12"
                  y1="18"
                  x2="12"
                  y2="12"
                />
                <line
                  x1="9"
                  y1="15"
                  x2="15"
                  y2="15"
                />
              </svg>
              <span>在此分类新建文章</span>
            </button>
            <template v-if="contextMenu.targetCategoryId">
              <div class="fm-ctx-separator" />
              <button
                class="fm-ctx-item fm-ctx-danger"
                @click="ctxDeleteCategory"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path
                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  />
                </svg>
                <span>删除分类</span>
              </button>
            </template>
          </template>
        </div>
      </Transition>
    </Teleport>

    <!-- 删除确认模态框 -->
    <Teleport to="body">
      <Transition name="fm-fade">
        <div
          v-if="showDeleteConfirm"
          class="fm-confirm-overlay"
          @click.self="cancelDelete"
        >
          <div class="fm-confirm-modal">
            <h3 class="fm-confirm-title">
              确认删除
            </h3>
            <p class="fm-confirm-text">
              {{ deleteConfirmText }}
            </p>
            <div class="fm-confirm-actions">
              <button
                class="fm-btn fm-btn-cancel"
                @click="cancelDelete"
              >
                取消
              </button>
              <button
                class="fm-btn fm-btn-danger"
                @click="confirmDelete"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   FileManager - Ethereal Constructivism Design
   ═══════════════════════════════════════════════════════════════════ */

.fm-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: #FAFBFC;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    font-size: 13px;
    color: #1a1a1a;
    overflow-x: hidden;
    overflow-y: auto;
    user-select: none;
}

/* ─── 工具栏 ─── */

.fm-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
        "search new"
        "actions actions";
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid #E5E7EB;
    flex-shrink: 0;
}

/* Toolbar rows — narrow-panel safe layout */
.fm-toolbar-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.fm-toolbar-row--search {
    grid-area: search;
}

.fm-toolbar-row--actions {
    grid-area: actions;
    overflow-x: auto;
    scrollbar-width: none;
}

.fm-toolbar-row--actions::-webkit-scrollbar {
    display: none;
}

.fm-toolbar-row--search > .fm-search-wrap {
    flex: 1 1 auto;
    min-width: 0;
}

.fm-search-wrap {
    flex: 1 1 auto;
    min-width: 0;
    position: relative;
    display: flex;
    align-items: center;
    transform-origin: left center;
    transition: flex-grow 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.18s ease;
}

.fm-search-wrap:focus-within {
    flex-grow: 999;
    z-index: 4;
    transform: scale(1.015);
}

.fm-search-icon {
    position: absolute;
    left: 10px;
    color: #90A4AE;
    pointer-events: none;
    transition: transform 0.18s ease, color 0.18s ease;
}

.fm-search-wrap:focus-within .fm-search-icon {
    transform: scale(1.1);
    color: #D32F2F;
}

.fm-search-input {
    width: 100%;
    min-width: 0;
    height: 34px;
    padding: 0 12px 0 32px;
    border: 1px solid #ECEFF1;
    border-radius: 10px;
    background: #FFFFFF;
    font-size: 13px;
    color: #263238;
    outline: none;
    text-overflow: ellipsis;
    transition: border-color 0.18s ease, box-shadow 0.18s ease, height 0.18s ease, font-size 0.18s ease;
}

.fm-search-input:focus {
    height: 36px;
    font-size: 14px;
    border-color: rgba(211, 47, 47, 0.42);
    box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.16);
}

@media (prefers-reduced-motion: reduce) {
    .fm-search-wrap,
    .fm-search-input,
    .fm-search-icon {
        transition: none;
    }
    .fm-search-wrap:focus-within,
    .fm-search-wrap:focus-within .fm-search-icon {
        transform: none;
    }
}

html.theme-dark .fm-search-input:focus {
    border-color: rgba(239, 83, 80, 0.55);
    box-shadow: 0 0 0 3px rgba(239, 83, 80, 0.22);
}

html.theme-dark .fm-search-wrap:focus-within .fm-search-icon {
    color: #EF5350;
}

.fm-search-input::placeholder {
    color: #9CA3AF;
}

.fm-view-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1 1 auto;
    min-width: 0;
}

/* Actions row — child sizing */
.fm-toolbar-row--actions > .fm-segmented {
    flex: 1 1 auto;
    max-width: 60%;
}

.fm-toolbar-row--actions > .fm-toolbar-select {
    flex: 0 0 auto;
    min-width: 0;
}

.fm-toolbar-row--actions > .fm-sort-toggle {
    flex: 0 0 auto;
    min-width: 0;
}

@media (max-width: 320px) {
    .fm-toolbar-row--actions > .fm-sort-toggle .fm-sort-label {
        display: none;
    }
}

/* Segmented control — viewMode (树形 / 平铺 / 最近) */
.fm-segmented {
    display: inline-flex;
    align-items: stretch;
    gap: 3px;
    padding: 4px;
    background: rgba(207, 216, 220, 0.32);
    border-radius: 999px;
    flex: 0 0 auto;
}

.fm-seg-tab {
    flex: 1 1 0;
    min-width: 38px;
    padding: 7px 4px;
    border: none;
    background: transparent;
    color: #607D8B;
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, font-weight 0.18s ease;
}

.fm-seg-tab:hover:not(.active) {
    color: #455A64;
    background: rgba(255, 255, 255, 0.5);
}

.fm-seg-tab.active {
    background: #FFFFFF;
    color: #D32F2F;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(38, 50, 56, 0.10);
}

.fm-seg-tab:focus-visible {
    outline: 2px solid rgba(211, 47, 47, 0.42);
    outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
    .fm-seg-tab {
        transition: none;
    }
}

/* Sort field select — kept compact + paper aesthetic */
.fm-toolbar-select {
    height: 34px;
    max-width: 60px;
    padding: 0 6px;
    border: 1px solid #ECEFF1;
    border-radius: 10px;
    background: #FFFFFF;
    color: #455A64;
    font-size: 13px;
    outline: none;
    transition: border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.fm-toolbar-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.fm-toolbar-select:focus,
.fm-toolbar-select:hover:not(:disabled) {
    border-color: rgba(211, 47, 47, 0.32);
    color: #263238;
}

/* Icon-led sort direction button */
.fm-sort-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 34px;
    padding: 0 6px;
    border: 1px solid #ECEFF1;
    border-radius: 10px;
    background: #FFFFFF;
    color: #455A64;
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    outline: none;
    transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fm-sort-toggle .fm-sort-icon {
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), color 0.18s ease;
}

.fm-sort-toggle.is-asc .fm-sort-icon {
    transform: scaleY(-1);
}

.fm-sort-toggle:not(:disabled):hover {
    border-color: rgba(211, 47, 47, 0.32);
    color: #263238;
}

.fm-sort-toggle.is-active:not(:disabled),
.fm-sort-toggle.is-asc:not(:disabled) {
    color: #D32F2F;
}

.fm-sort-toggle.is-active:not(:disabled) .fm-sort-icon,
.fm-sort-toggle.is-asc:not(:disabled) .fm-sort-icon {
    color: #D32F2F;
}

.fm-sort-toggle:focus-visible {
    outline: 2px solid rgba(211, 47, 47, 0.42);
    outline-offset: 2px;
}

.fm-sort-toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.fm-sort-label {
    font-weight: 500;
    white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
    .fm-sort-toggle,
    .fm-sort-toggle .fm-sort-icon,
    .fm-toolbar-select {
        transition: none;
    }
    .fm-sort-toggle.is-asc .fm-sort-icon {
        transform: none;
    }
}

/* Dark mode — toolbar */
html.theme-dark .fm-segmented {
    background: rgba(255, 255, 255, 0.06);
}

html.theme-dark .fm-seg-tab {
    color: #90A4AE;
}

html.theme-dark .fm-seg-tab:hover:not(.active) {
    color: #ECEFF4;
    background: rgba(255, 255, 255, 0.04);
}

html.theme-dark .fm-seg-tab.active {
    background: rgba(255, 255, 255, 0.10);
    color: #EF9A9A;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.30);
}

html.theme-dark .fm-toolbar-select,
html.theme-dark .fm-sort-toggle {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
    color: #ECEFF4;
}

html.theme-dark .fm-toolbar-select:focus,
html.theme-dark .fm-toolbar-select:hover:not(:disabled),
html.theme-dark .fm-sort-toggle:not(:disabled):hover {
    border-color: rgba(239, 83, 80, 0.42);
    color: #ECEFF4;
}

html.theme-dark .fm-sort-toggle.is-active:not(:disabled),
html.theme-dark .fm-sort-toggle.is-asc:not(:disabled),
html.theme-dark .fm-sort-toggle.is-active:not(:disabled) .fm-sort-icon,
html.theme-dark .fm-sort-toggle.is-asc:not(:disabled) .fm-sort-icon {
    color: #EF9A9A;
}

.fm-new-wrap {
    position: relative;
    flex-shrink: 0;
    grid-area: new;
}

.fm-new-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 34px;
    padding: 0 12px;
    border: 1px solid #E5E7EB;
    border-radius: 10px;
    background: #fff;
    color: #4B5563;
    cursor: pointer;
    transition: all 0.15s ease;
}

.fm-new-btn:hover {
    border-color: #1565C0;
    color: #1565C0;
    background: #F0F7FF;
}

/* ─── 下拉菜单 ─── */

.fm-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 170px;
    background: #fff;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    z-index: 100;
    padding: 4px;
    overflow: hidden;
}

.fm-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #374151;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s ease;
    text-align: left;
}

.fm-dropdown-item:hover {
    background: #F3F4F6;
}

.fm-dropdown-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.fm-dropdown-item:disabled:hover {
    background: transparent;
}

.fm-dropdown-separator {
    height: 1px;
    margin: 3px 6px;
    background: #E5E7EB;
}

/* ─── 导入结果通知 ─── */

.fm-import-result {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: 12px;
    border-bottom: 1px solid transparent;
    animation: fm-slide-in 0.2s ease;
}

@keyframes fm-slide-in {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.fm-import-success {
    background: #ECFDF5;
    border-bottom-color: #A7F3D0;
    color: #059669;
}

.fm-import-warning {
    background: #FFFBEB;
    border-bottom-color: #FDE68A;
    color: #B45309;
}

.fm-import-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.fm-import-close {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.1s ease;
}

.fm-import-close:hover {
    opacity: 1;
}

/* ─── 新建分类 inline 输入 ─── */

.fm-inline-input {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    border-bottom: 1px solid #E5E7EB;
    background: #F9FAFB;
}

.fm-inline-input svg {
    color: #9CA3AF;
    flex-shrink: 0;
}

/* ─── 智能文件夹（状态筛选 chips） ─── */

.fm-smart-folders {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid #ECEFF1;
    background: #FAFAF7;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.fm-smart-folders::-webkit-scrollbar {
    display: none;
}

.fm-smart-folder {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    min-width: 0;
    padding: 4px 10px;
    border: 1px solid #ECEFF1;
    border-radius: 999px;
    background: transparent;
    color: #607D8B;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.fm-smart-folder:hover {
    transform: translateY(-1px);
    border-color: #CFD8DC;
    color: #455A64;
}

@media (prefers-reduced-motion: reduce) {
    .fm-smart-folder,
    .fm-smart-folder:hover {
        transform: none;
        transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
    }
}

.fm-smart-folder span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
}

.fm-smart-folder strong {
    flex-shrink: 0;
    min-width: 16px;
    padding: 0 5px;
    border-radius: 999px;
    background: rgba(96, 125, 139, 0.10);
    color: #607D8B;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.5;
    text-align: center;
    transition: background 0.18s ease, color 0.18s ease;
}

.fm-smart-folder.active {
    color: #D32F2F;
    border-color: rgba(211, 47, 47, 0.32);
    background: rgba(211, 47, 47, 0.06);
    font-weight: 600;
}

.fm-smart-folder.active strong {
    background: rgba(211, 47, 47, 0.12);
    color: #D32F2F;
}

.fm-smart-folder:focus-visible {
    outline: 2px solid rgba(211, 47, 47, 0.42);
    outline-offset: 2px;
}

/* Dark mode */
html.theme-dark .fm-smart-folders {
    background: #1A222D;
    border-bottom-color: rgba(255, 255, 255, 0.06);
}

html.theme-dark .fm-smart-folder {
    border-color: rgba(255, 255, 255, 0.08);
    color: #90A4AE;
}

html.theme-dark .fm-smart-folder:hover {
    border-color: rgba(255, 255, 255, 0.16);
    color: #ECEFF4;
}

html.theme-dark .fm-smart-folder strong {
    background: rgba(255, 255, 255, 0.06);
    color: #90A4AE;
}

html.theme-dark .fm-smart-folder.active {
    color: #EF9A9A;
    border-color: rgba(239, 83, 80, 0.42);
    background: rgba(239, 83, 80, 0.10);
}

html.theme-dark .fm-smart-folder.active strong {
    background: rgba(239, 83, 80, 0.18);
    color: #EF9A9A;
}

/* ─── 文件树 ─── */

.fm-tree {
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 4px 0;
}

/* ─── 分类节点 ─── */

.fm-category-node {
    margin-bottom: 2px;
}

.fm-category-row {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 30px;
    padding: 0 10px 0 8px;
    cursor: pointer;
    transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    font-weight: 500;
    font-size: 12px;
    color: #374151;
    border-left: 2px solid transparent;
    will-change: transform;
}

.fm-category-row:hover {
    background: #F3F4F6;
    transform: translateX(2px);
    border-left-color: rgba(211, 47, 47, 0.35);
}

@media (prefers-reduced-motion: reduce) {
    .fm-category-row,
    .fm-category-row:hover {
        transform: none;
        transition: background 0.1s ease;
    }
}

.fm-chevron {
    flex-shrink: 0;
    color: #9CA3AF;
    transition: transform 0.2s ease;
}

.fm-chevron-open {
    transform: rotate(90deg);
}

.fm-cat-icon {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    color: #6B7280;
}

.fm-cat-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.fm-cat-count {
    flex-shrink: 0;
    font-size: 11px;
    color: #9CA3AF;
    font-weight: 400;
}

/* ─── 文章列表（展开/折叠） ─── */

.fm-articles-wrap {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.25s ease;
}

.fm-articles-expanded {
    max-height: 10000px;
}

.fm-article-row {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 10px 0 32px;
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    position: relative;
    font-size: 12px;
    color: #4B5563;
    will-change: transform;
    border-left: 2px solid transparent;
}

.fm-article-row:hover {
    background: #F9F1F1;
    color: #1f2937;
    transform: translateX(2px);
    border-left-color: rgba(211, 47, 47, 0.45);
}

.fm-article-row:active {
    transform: translateX(1px) scale(0.995);
}

@media (prefers-reduced-motion: reduce) {
    .fm-article-row,
    .fm-article-row:hover,
    .fm-article-row:active {
        transform: none;
        transition: background 0.1s ease, color 0.1s ease;
    }
}

.fm-article-row.fm-article-active {
    background: #FEF2F2;
    border-left: 3px solid #D32F2F;
    padding-left: 31px;
}

.fm-article-row.fm-article-active .fm-article-title {
    color: #1a1a1a;
    font-weight: 500;
}

.fm-file-icon {
    flex-shrink: 0;
    color: #9CA3AF;
}

.fm-article-active .fm-file-icon {
    color: #D32F2F;
}

.fm-article-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

.fm-status {
    flex-shrink: 0;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    line-height: 1.4;
}

.fm-status.status-new {
    background: #DBEAFE;
    color: #1565C0;
}

.fm-status.status-read {
    background: #F3F4F6;
    color: #6B7280;
}

.fm-status.status-processed {
    background: #D1FAE5;
    color: #059669;
}

.fm-article-time {
    flex-shrink: 0;
    font-size: 11px;
    color: #9CA3AF;
    white-space: nowrap;
}

/* ─── 重命名输入 ─── */

.fm-rename-input {
    height: 22px;
    padding: 0 6px;
    border: 1px solid #1565C0;
    border-radius: 3px;
    background: #fff;
    font-size: 12px;
    color: #1a1a1a;
    outline: none;
    box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.15);
}

.fm-rename-inline {
    flex: 1;
    min-width: 0;
}

/* ─── 素材区域 ─── */

.fm-assets-section {
    flex-shrink: 0;
    border-top: 1px solid #E5E7EB;
}

.fm-assets-header {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    transition: background 0.1s ease;
}

.fm-assets-header:hover {
    background: #F3F4F6;
}

.fm-assets-header svg {
    color: #9CA3AF;
}

.fm-assets-label {
    flex: 1;
}

.fm-assets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 6px;
    padding: 0 10px;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.25s ease, padding 0.25s ease;
}

.fm-assets-grid-expanded {
    max-height: 400px;
    padding: 6px 10px 10px;
    overflow-y: auto;
}

.fm-asset-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    cursor: default;
}

.fm-asset-thumb {
    width: 56px;
    height: 56px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #E5E7EB;
    background: #F9FAFB;
}

.fm-asset-placeholder {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    border: 1px solid #E5E7EB;
    background: #F9FAFB;
}

.fm-asset-name {
    font-size: 10px;
    color: #6B7280;
    max-width: 64px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
}

/* ─── 空状态 ─── */

.fm-empty-state,
.fm-empty-search {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    gap: 8px;
    color: #9CA3AF;
}

.fm-empty-title {
    font-size: 14px;
    font-weight: 500;
    color: #6B7280;
    margin: 4px 0 0;
}

.fm-empty-hint {
    font-size: 12px;
    color: #9CA3AF;
}

.fm-empty-search p {
    font-size: 13px;
}

/* ─── 右键菜单 ─── */

.fm-context-menu {
    position: fixed;
    min-width: 180px;
    background: #fff;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    z-index: 9999;
    padding: 4px;
    overflow: visible;
}

.fm-ctx-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #374151;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s ease;
    text-align: left;
}

.fm-ctx-item:hover {
    background: #F3F4F6;
}

.fm-ctx-item svg {
    flex-shrink: 0;
    color: #6B7280;
}

.fm-ctx-item-icon {
    flex-shrink: 0;
    color: #6B7280;
}

.fm-ctx-danger {
    color: #DC2626;
}

.fm-ctx-danger svg {
    color: #DC2626;
}

.fm-ctx-danger:hover {
    background: #FEF2F2;
}

.fm-ctx-separator {
    height: 1px;
    background: #E5E7EB;
    margin: 3px 6px;
}

.fm-ctx-has-submenu {
    position: relative;
}

.fm-ctx-has-submenu span {
    flex: 1;
}

.fm-ctx-arrow {
    flex-shrink: 0;
    color: #9CA3AF;
}

.fm-ctx-submenu-wrap {
    position: relative;
}

.fm-ctx-submenu {
    position: absolute;
    left: calc(100% - 4px);
    top: -4px;
    min-width: 160px;
    background: #fff;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    padding: 4px;
    z-index: 10000;
}

/* ─── 删除确认模态框 ─── */

.fm-confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.fm-confirm-modal {
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    width: 340px;
    max-width: 90vw;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.fm-confirm-title {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 10px;
}

.fm-confirm-text {
    font-size: 13px;
    color: #6B7280;
    line-height: 1.5;
    margin: 0 0 20px;
}

.fm-confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.fm-btn {
    padding: 7px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
}

.fm-btn-cancel {
    background: #F3F4F6;
    color: #374151;
    border: 1px solid #E5E7EB;
}

.fm-btn-cancel:hover {
    background: #E5E7EB;
}

.fm-btn-danger {
    background: #DC2626;
    color: #fff;
}

.fm-btn-danger:hover {
    background: #B91C1C;
}

/* ─── 过渡动画 ─── */

.fm-fade-enter-active,
.fm-fade-leave-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.fm-fade-enter-from,
.fm-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

/* ─── 滚动条（细条） ─── */

.fm-root::-webkit-scrollbar,
.fm-tree::-webkit-scrollbar,
.fm-assets-grid::-webkit-scrollbar {
    width: 4px;
}

.fm-root::-webkit-scrollbar-track,
.fm-tree::-webkit-scrollbar-track,
.fm-assets-grid::-webkit-scrollbar-track {
    background: transparent;
}

.fm-root::-webkit-scrollbar-thumb,
.fm-tree::-webkit-scrollbar-thumb,
.fm-assets-grid::-webkit-scrollbar-thumb {
    background: #D1D5DB;
    border-radius: 2px;
}

.fm-root::-webkit-scrollbar-thumb:hover,
.fm-tree::-webkit-scrollbar-thumb:hover,
.fm-assets-grid::-webkit-scrollbar-thumb:hover {
    background: #9CA3AF;
}

/* ─── List enter/leave (TransitionGroup name="fm-list") ─── */

.fm-list-enter-active,
.fm-list-leave-active {
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease;
}

.fm-list-enter-from {
    opacity: 0;
    transform: translateX(-4px);
}

.fm-list-leave-to {
    opacity: 0;
    transform: translateX(4px);
}

.fm-articles-inner,
.fm-category-list {
    position: relative;
}

@media (prefers-reduced-motion: reduce) {
    .fm-list-enter-active,
    .fm-list-leave-active {
        transition: none;
    }
    .fm-list-enter-from,
    .fm-list-leave-to {
        transform: none;
    }
}

/* ─── Dark mode: red glow + tints ─── */

html.theme-dark .fm-article-row:hover {
    background: rgba(239, 83, 80, 0.10);
    border-left-color: rgba(239, 83, 80, 0.55);
}

html.theme-dark .fm-category-row:hover {
    border-left-color: rgba(239, 83, 80, 0.45);
}
</style>
