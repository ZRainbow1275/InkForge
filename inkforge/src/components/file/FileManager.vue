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

const props = defineProps<{
    requestArticleSelection: (articleId: string) => Promise<boolean>
}>()

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
type QuickAccessDropPosition = 'before' | 'after'

const FILE_MANAGER_PREF_KEY = 'inkforge:file-manager:prefs:v1'
const QUICK_ACCESS_ORDER_KEY = 'inkforge:file-manager:quick-access-order:v1'
const QUICK_ACCESS_LIMIT = 8
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

interface QuickAccessGroup {
    id: 'active' | 'done'
    label: string
    articles: Article[]
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

function pickStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
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

function readQuickAccessOrder(): string[] {
    if (typeof window === 'undefined') return []
    try {
        return pickStringArray(JSON.parse(window.localStorage.getItem(QUICK_ACCESS_ORDER_KEY) ?? '[]') as unknown)
    } catch {
        return []
    }
}

const initialPrefs = readFileManagerPrefs()
const searchQuery = ref('')
const viewMode = ref<FileManagerViewMode>(initialPrefs.viewMode)
const sortField = ref<FileManagerSortField>(initialPrefs.sortField)
const sortDirection = ref<FileManagerSortDirection>(initialPrefs.sortDirection)
const statusFilter = ref<FileManagerStatusFilter>(initialPrefs.statusFilter)
const quickAccessOrder = ref<string[]>(readQuickAccessOrder())
const draggingQuickAccessId = ref<string | null>(null)

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

function getArticleTimestamp(article: Article): number {
    const timestamp = new Date(article.updatedAt || article.createdAt).getTime()
    return Number.isFinite(timestamp) ? timestamp : 0
}

function isCompletedQuickAccessArticle(article: Article): boolean {
    return article.status === ARTICLE_STATUS.PROCESSED
        || article.status === ARTICLE_STATUS.PUBLISHED
        || article.status === ARTICLE_STATUS.ARCHIVED
}

const quickAccessArticles = computed<Article[]>(() => {
    const articleById = new Map(articles.value.map(article => [article.id, article]))
    const ordered = quickAccessOrder.value
        .map(id => articleById.get(id))
        .filter((article): article is Article => Boolean(article))
    const orderedIds = new Set(ordered.map(article => article.id))
    const recent = [...articles.value]
        .sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a))
        .filter(article => !orderedIds.has(article.id))

    return [...ordered, ...recent].slice(0, QUICK_ACCESS_LIMIT)
})

const quickAccessGroups = computed<QuickAccessGroup[]>(() => {
    const active = quickAccessArticles.value.filter(article => !isCompletedQuickAccessArticle(article))
    const done = quickAccessArticles.value.filter(isCompletedQuickAccessArticle)
    const groups: QuickAccessGroup[] = []

    if (active.length > 0) {
        groups.push({ id: 'active', label: '进行中', articles: active })
    }
    if (done.length > 0) {
        groups.push({ id: 'done', label: '已完成', articles: done })
    }

    return groups
})

// ═══════════════════════════════════════════════════════════════════
// 文件树：按分类分组
// ═══════════════════════════════════════════════════════════════════

interface CategoryNode {
    category: Category | null // null 代表"未分类"
    articles: Article[]
    expanded: boolean
    bucket?: { key: string; label: string }
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

    if (viewMode.value === 'flat') {
        return [{
            category: null,
            articles: filtered,
            expanded: true,
        }]
    }

    if (viewMode.value === 'recent') {
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000
        const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000
        const startOfMonth = startOfToday - 29 * 24 * 60 * 60 * 1000

        type BucketKey = 'today' | 'yesterday' | 'week' | 'month' | 'earlier'
        const bucketOrder: BucketKey[] = ['today', 'yesterday', 'week', 'month', 'earlier']
        const bucketLabels: Record<BucketKey, string> = {
            today: '今天',
            yesterday: '昨天',
            week: '本周',
            month: '本月',
            earlier: '更早',
        }
        const buckets: Record<BucketKey, Article[]> = {
            today: [], yesterday: [], week: [], month: [], earlier: [],
        }

        const limited = filtered.slice(0, 100)
        for (const article of limited) {
            const ts = new Date(article.updatedAt ?? article.createdAt ?? 0).getTime()
            if (ts >= startOfToday) buckets.today.push(article)
            else if (ts >= startOfYesterday) buckets.yesterday.push(article)
            else if (ts >= startOfWeek) buckets.week.push(article)
            else if (ts >= startOfMonth) buckets.month.push(article)
            else buckets.earlier.push(article)
        }

        const nodes: CategoryNode[] = []
        for (const key of bucketOrder) {
            if (buckets[key].length === 0) continue
            nodes.push({
                category: null,
                articles: buckets[key],
                expanded: ensureExpanded(`__recent_${key}__`),
                bucket: { key: `__recent_${key}__`, label: bucketLabels[key] },
            })
        }
        return nodes
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

function persistQuickAccessOrder(ids: string[]): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(QUICK_ACCESS_ORDER_KEY, JSON.stringify(ids))
    } catch {
        // Quick access ordering is a convenience preference; document operations continue.
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

watch(articles, () => {
    const knownIds = new Set(articles.value.map(article => article.id))
    const nextOrder = quickAccessOrder.value.filter(id => knownIds.has(id))
    if (nextOrder.length !== quickAccessOrder.value.length) {
        quickAccessOrder.value = nextOrder
        persistQuickAccessOrder(nextOrder)
    }
})

function getQuickAccessDropPosition(event: DragEvent): QuickAccessDropPosition {
    if (!(event.currentTarget instanceof HTMLElement)) return 'after'
    const rect = event.currentTarget.getBoundingClientRect()
    return event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'
}

function reorderQuickAccessIds(
    ids: string[],
    draggedId: string,
    targetId: string,
    position: QuickAccessDropPosition
): string[] {
    const withoutDragged = ids.filter(id => id !== draggedId)
    const targetIndex = withoutDragged.indexOf(targetId)
    if (targetIndex === -1) return ids
    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex
    return [
        ...withoutDragged.slice(0, insertIndex),
        draggedId,
        ...withoutDragged.slice(insertIndex),
    ]
}

function handleQuickAccessDragStart(event: DragEvent, articleId: string): void {
    draggingQuickAccessId.value = articleId
    event.dataTransfer?.setData('text/plain', articleId)
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
    }
}

function handleQuickAccessDragOver(event: DragEvent): void {
    event.preventDefault()
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
    }
}

function handleQuickAccessDrop(event: DragEvent, targetArticleId: string): void {
    event.preventDefault()
    const draggedId = event.dataTransfer?.getData('text/plain') || draggingQuickAccessId.value
    if (!draggedId || draggedId === targetArticleId) return

    const visibleIds = quickAccessArticles.value.map(article => article.id)
    if (!visibleIds.includes(draggedId) || !visibleIds.includes(targetArticleId)) return

    const nextOrder = reorderQuickAccessIds(
        visibleIds,
        draggedId,
        targetArticleId,
        getQuickAccessDropPosition(event)
    )
    quickAccessOrder.value = nextOrder
    persistQuickAccessOrder(nextOrder)
}

function handleQuickAccessDragEnd(): void {
    draggingQuickAccessId.value = null
}

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
            sourceName: 'InkForge 本地新建',
            rawContent: '',
            description: '',
            status: ARTICLE_STATUS.DRAFT,
            categoryId: categoryStore.selectedCategoryId ?? undefined,
        })
        await props.requestArticleSelection(article.id)
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
const categoryMutationPending = ref(false)
const categoryActionStatus = ref<{ tone: 'success' | 'error'; message: string } | null>(null)

function getCategoryActionError(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback
}

function startNewCategory(): void {
    if (categoryMutationPending.value) return
    showNewMenu.value = false
    showNewCategoryInput.value = true
    newCategoryName.value = ''
    categoryActionStatus.value = null
    nextTick(() => {
        newCategoryInputRef.value?.focus()
    })
}

async function confirmNewCategory(): Promise<void> {
    if (categoryMutationPending.value) return
    const name = newCategoryName.value.trim()
    if (!name) {
        showNewCategoryInput.value = false
        return
    }
    categoryMutationPending.value = true
    categoryActionStatus.value = null
    let shouldRefocus = false
    try {
        await categoryStore.addCategory(name)
        showNewCategoryInput.value = false
        newCategoryName.value = ''
        categoryActionStatus.value = { tone: 'success', message: `已创建分类“${name}”` }
    } catch (error) {
        categoryActionStatus.value = { tone: 'error', message: getCategoryActionError(error, '创建分类失败') }
        shouldRefocus = true
    } finally {
        categoryMutationPending.value = false
    }
    if (shouldRefocus) {
        await nextTick()
        newCategoryInputRef.value?.focus()
    }
}

function cancelNewCategory(): void {
    if (categoryMutationPending.value) return
    showNewCategoryInput.value = false
    newCategoryName.value = ''
}

// ═══════════════════════════════════════════════════════════════════
// 文章选择
// ═══════════════════════════════════════════════════════════════════

async function handleSelectArticle(id: string): Promise<void> {
    await props.requestArticleSelection(id)
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

let renameBlurTimeout: ReturnType<typeof setTimeout> | null = null

function clearRenameBlurTimeout(): void {
    if (renameBlurTimeout !== null) {
        clearTimeout(renameBlurTimeout)
        renameBlurTimeout = null
    }
}

function handleStableRenameBlur(
    event: FocusEvent,
    confirm: () => void | Promise<void>
): void {
    const input = event.currentTarget
    if (!(input instanceof HTMLInputElement)) return
    clearRenameBlurTimeout()
    renameBlurTimeout = setTimeout(() => {
        renameBlurTimeout = null
        if (document.hasFocus() && document.activeElement !== input) {
            void confirm()
        }
    }, 100)
}

onMounted(async () => {
    document.addEventListener('click', handleGlobalClick)
    await categoryStore.loadCategories()
})

onUnmounted(() => {
    document.removeEventListener('click', handleGlobalClick)
    clearRenameBlurTimeout()
    assetStore.cleanup()
})

// ─── 右键菜单操作：打开文章 ───
async function ctxOpenArticle(): Promise<void> {
    const targetId = contextMenu.value.targetId
    closeContextMenu()
    if (targetId) {
        await props.requestArticleSelection(targetId)
    }
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
    clearRenameBlurTimeout()
    renamingArticleId.value = id
    renameValue.value = article.title
    closeContextMenu()
    nextTick(() => {
        renameInputRef.value?.focus()
        renameInputRef.value?.select()
    })
}

async function confirmRenameArticle(): Promise<void> {
    clearRenameBlurTimeout()
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
    clearRenameBlurTimeout()
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
    if (categoryMutationPending.value) return
    if (!pendingDeleteId.value) {
        showDeleteConfirm.value = false
        return
    }
    const deletingCategory = pendingDeleteType.value === 'category'
    categoryMutationPending.value = true
    if (deletingCategory) categoryActionStatus.value = null
    try {
        if (pendingDeleteType.value === 'article') {
            await articleStore.deleteArticle(pendingDeleteId.value)
        } else if (pendingDeleteType.value === 'category') {
            await categoryStore.deleteCategory(pendingDeleteId.value)
        }
        if (deletingCategory) {
            categoryActionStatus.value = { tone: 'success', message: '分类已删除，关联文章已迁移到未分类' }
        }
    } catch (error) {
        if (deletingCategory) {
            categoryActionStatus.value = { tone: 'error', message: getCategoryActionError(error, '删除分类失败') }
            return
        }
    } finally {
        categoryMutationPending.value = false
    }
    showDeleteConfirm.value = false
    pendingDeleteType.value = null
    pendingDeleteId.value = null
}

function cancelDelete(): void {
    if (categoryMutationPending.value) return
    showDeleteConfirm.value = false
    pendingDeleteType.value = null
    pendingDeleteId.value = null
}

// ─── 右键菜单操作：分类 - 重命名 ───
const renamingCategoryId = ref<string | null>(null)
const renameCategoryValue = ref('')
const renameCategoryInputRef = ref<HTMLInputElement | null>(null)

function ctxStartRenameCategory(): void {
    if (categoryMutationPending.value) return
    const id = contextMenu.value.targetCategoryId
    if (!id) return
    const cat = categories.value.find(c => c.id === id)
    if (!cat) return
    clearRenameBlurTimeout()
    renamingCategoryId.value = id
    renameCategoryValue.value = cat.name
    categoryActionStatus.value = null
    closeContextMenu()
    nextTick(() => {
        renameCategoryInputRef.value?.focus()
        renameCategoryInputRef.value?.select()
    })
}

async function confirmRenameCategory(): Promise<void> {
    clearRenameBlurTimeout()
    if (categoryMutationPending.value) return
    const id = renamingCategoryId.value
    if (!id) return
    const newName = renameCategoryValue.value.trim()
    if (!newName) {
        categoryActionStatus.value = { tone: 'error', message: '分类名称不能为空' }
        return
    }
    categoryMutationPending.value = true
    categoryActionStatus.value = null
    let shouldRefocus = false
    try {
        await categoryStore.updateCategory(id, { name: newName })
        renamingCategoryId.value = null
        renameCategoryValue.value = ''
        categoryActionStatus.value = { tone: 'success', message: `已重命名为“${newName}”` }
    } catch (error) {
        categoryActionStatus.value = { tone: 'error', message: getCategoryActionError(error, '重命名分类失败') }
        shouldRefocus = true
    } finally {
        categoryMutationPending.value = false
    }
    if (shouldRefocus) {
        await nextTick()
        renameCategoryInputRef.value?.focus()
        renameCategoryInputRef.value?.select()
    }
}

function cancelRenameCategory(): void {
    clearRenameBlurTimeout()
    if (categoryMutationPending.value) return
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
            sourceName: 'InkForge 本地新建',
            rawContent: '',
            description: '',
            status: ARTICLE_STATUS.DRAFT,
            categoryId: categoryId ?? undefined,
        })
        await props.requestArticleSelection(article.id)
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
    if (node.bucket) return node.bucket.key
    return node.category?.id ?? '__uncategorized__'
}

function getCategoryLabel(node: CategoryNode): string {
    if (node.bucket) return node.bucket.label
    if (node.category) return node.category.name
    if (viewMode.value === 'flat') return '全部文档'
    if (viewMode.value === 'recent') return '最近更新'
    return '未分类'
}

function getCategoryIconComponent(node: CategoryNode) {
    if (node.bucket) return resolveCategoryIcon('clock', 'clock')
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
          type="button"
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
              type="button"
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
              type="button"
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
              type="button"
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
          type="button"
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

    <Transition name="fm-fade">
      <div
        v-if="categoryActionStatus"
        class="fm-import-result"
        :class="categoryActionStatus.tone === 'error' ? 'fm-import-warning' : 'fm-import-success'"
        :role="categoryActionStatus.tone === 'error' ? 'alert' : 'status'"
        :data-tone="categoryActionStatus.tone"
        data-category-action-status
      >
        <span class="fm-import-text">{{ categoryActionStatus.message }}</span>
        <button
          type="button"
          class="fm-import-close"
          aria-label="关闭分类操作提示"
          @click="categoryActionStatus = null"
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
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
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
        data-category-new-input
        maxlength="50"
        :disabled="categoryMutationPending"
        @keydown.enter.prevent="confirmNewCategory"
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
    <section
      v-if="quickAccessGroups.length > 0"
      class="fm-quick-access"
      aria-label="快速访问"
    >
      <header class="fm-quick-access-head">
        <span>快速访问</span>
        <strong>{{ quickAccessArticles.length }}</strong>
      </header>
      <div class="fm-quick-access-list">
        <details
          v-for="group in quickAccessGroups"
          :key="group.id"
          class="fm-quick-access-group"
          open
        >
          <summary class="fm-quick-access-summary">
            <span>{{ group.label }}</span>
            <strong>{{ group.articles.length }}</strong>
          </summary>
          <button
            v-for="article in group.articles"
            :key="article.id"
            type="button"
            class="fm-quick-access-item"
            :class="{ 'fm-quick-access-item--active': selectedArticleId === article.id }"
            :data-file-article-id="article.id"
            draggable="true"
            @click="handleSelectArticle(article.id)"
            @dragstart="handleQuickAccessDragStart($event, article.id)"
            @dragover="handleQuickAccessDragOver"
            @drop="handleQuickAccessDrop($event, article.id)"
            @dragend="handleQuickAccessDragEnd"
          >
            <span class="fm-quick-access-dot" />
            <span class="fm-quick-access-title">{{ article.title }}</span>
            <span
              class="fm-status"
              :class="getStatusClass(article.status)"
            >
              {{ getStatusLabel(article.status) }}
            </span>
            <time class="fm-quick-access-time">{{ formatRelativeTime(article.updatedAt) }}</time>
          </button>
        </details>
      </div>
    </section>

    <div class="fm-tree">
      <template v-if="fileTree.length === 0 && (searchQuery.trim() || statusFilter !== 'all')">
        <div class="fm-empty-search">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
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

      <template
        v-else-if="articles.length === 0
          && !searchQuery.trim()
          && (viewMode !== 'tree' || categories.length === 0)"
      >
        <div class="fm-empty-state">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
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
          <span
            class="forge-line fm-empty-line"
            aria-hidden="true"
          />
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
            :class="[
              `fm-mode-${viewMode}`,
              { 'fm-node-bucket': !!node.bucket },
            ]"
          >
            <!-- 分类行 -->
            <div
              class="fm-category-row"
              :class="{ 'fm-expanded': node.expanded }"
              :data-file-category-id="node.category?.id"
              @click="toggleExpand(getCategoryKey(node))"
              @contextmenu="openCategoryContextMenu($event, node.category?.id ?? null)"
            >
              <!-- 展开/折叠箭头 (flat 模式隐藏) -->
              <svg
                v-if="viewMode !== 'flat'"
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
                  data-category-rename-input
                  maxlength="50"
                  :disabled="categoryMutationPending"
                  @keydown.enter.prevent="confirmRenameCategory"
                  @keydown.escape="cancelRenameCategory"
                  @blur="handleStableRenameBlur($event, confirmRenameCategory)"
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
                  :data-file-article-id="article.id"
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
                      @blur="handleStableRenameBlur($event, confirmRenameArticle)"
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
              type="button"
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
              type="button"
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
                type="button"
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
                    type="button"
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
                    type="button"
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
              type="button"
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
                type="button"
                class="fm-ctx-item"
                data-category-action="rename"
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
              type="button"
              class="fm-ctx-item"
              data-category-action="new-article"
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
                type="button"
                class="fm-ctx-item fm-ctx-danger"
                data-category-action="delete"
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
          data-category-delete-confirm
          @click.self="cancelDelete"
        >
          <div
            class="fm-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="file-manager-delete-title"
          >
            <h3
              id="file-manager-delete-title"
              class="fm-confirm-title"
            >
              确认删除
            </h3>
            <p class="fm-confirm-text">
              {{ deleteConfirmText }}
            </p>
            <div class="fm-confirm-actions">
              <button
                type="button"
                class="fm-btn fm-btn-cancel"
                :disabled="categoryMutationPending"
                @click="cancelDelete"
              >
                取消
              </button>
              <button
                type="button"
                class="fm-btn fm-btn-danger"
                data-category-delete-submit
                :disabled="categoryMutationPending"
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
    background: var(--bg-rice-paper);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    font-size: 13px;
    color: var(--text-primary);
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
    border-bottom: 1px solid var(--hairline);
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
    overflow: visible;
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
    transition: flex-grow var(--motion-slow) var(--ease-out-quart), transform var(--motion-base) var(--ease-out-quart);
}

.fm-search-wrap:focus-within {
    flex: 0 0 min(480px, calc(100vw - 360px));
    width: min(480px, calc(100vw - 360px));
    max-width: min(480px, calc(100vw - 360px));
    z-index: 4;
    transform: scale(1.015);
}

.fm-search-icon {
    position: absolute;
    left: 10px;
    color: var(--text-muted);
    pointer-events: none;
    transition: transform var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart);
}

.fm-search-wrap:focus-within .fm-search-icon {
    transform: scale(1.1);
    color: var(--ember);
}

.fm-search-input {
    width: 100%;
    min-width: 0;
    height: 34px;
    padding: 0 12px 0 32px;
    border: 1px solid var(--hairline);
    border-radius: 10px;
    background: var(--bg-surface);
    font-size: 13px;
    color: var(--text-primary);
    outline: none;
    text-overflow: ellipsis;
    transition: border-color var(--motion-base) var(--ease-out-quart), box-shadow var(--motion-base) var(--ease-out-quart), height var(--motion-base) var(--ease-out-quart), font-size var(--motion-base) var(--ease-out-quart);
}

.fm-search-input:focus {
    height: 36px;
    font-size: 14px;
    border-color: var(--ember-border);
    box-shadow: var(--focus-ring);
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

.fm-search-input::placeholder {
    color: var(--text-muted);
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
    background: var(--bg-rice-paper);
    border-radius: 999px;
    flex: 0 0 auto;
}

.fm-seg-tab {
    flex: 1 1 0;
    min-width: 38px;
    padding: 7px 4px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    border-radius: 999px;
    cursor: pointer;
    transition: background var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart), box-shadow var(--motion-base) var(--ease-out-quart), font-weight var(--motion-base) var(--ease-out-quart);
}

.fm-seg-tab:hover:not(.active) {
    color: var(--text-primary);
    background: var(--bg-surface);
}

.fm-seg-tab.active {
    background: var(--bg-surface);
    color: var(--ember);
    font-weight: 600;
    box-shadow: var(--elev-1);
}

.fm-seg-tab:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
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
    border: 1px solid var(--hairline);
    border-radius: 10px;
    background: var(--bg-surface);
    color: var(--text-secondary);
    font-size: 13px;
    outline: none;
    transition: border-color var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart), box-shadow var(--motion-base) var(--ease-out-quart);
}

.fm-toolbar-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.fm-toolbar-select:focus,
.fm-toolbar-select:hover:not(:disabled) {
    border-color: var(--ember-border);
    color: var(--text-primary);
}

/* Icon-led sort direction button */
.fm-sort-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 34px;
    padding: 0 6px;
    border: 1px solid var(--hairline);
    border-radius: 10px;
    background: var(--bg-surface);
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    outline: none;
    transition: border-color var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart), background var(--motion-base) var(--ease-out-quart), transform var(--motion-base) var(--ease-out-quart);
}

.fm-sort-toggle .fm-sort-icon {
    transition: transform var(--motion-slow) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart);
}

.fm-sort-toggle.is-asc .fm-sort-icon {
    transform: scaleY(-1);
}

.fm-sort-toggle:not(:disabled):hover {
    border-color: var(--ember-border);
    color: var(--text-primary);
}

.fm-sort-toggle.is-active:not(:disabled),
.fm-sort-toggle.is-asc:not(:disabled) {
    color: var(--ember);
}

.fm-sort-toggle.is-active:not(:disabled) .fm-sort-icon,
.fm-sort-toggle.is-asc:not(:disabled) .fm-sort-icon {
    color: var(--ember);
}

.fm-sort-toggle:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
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

.fm-new-wrap {
    position: relative;
    flex-shrink: 0;
    grid-area: new;
    z-index: 6;
}

.fm-new-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 34px;
    padding: 0 12px;
    border: 1px solid var(--hairline);
    border-radius: 10px;
    background: var(--bg-surface);
    color: var(--text-secondary);
    cursor: pointer;
    transition: border-color var(--motion-fast) var(--ease-out-quart), color var(--motion-fast) var(--ease-out-quart), background var(--motion-fast) var(--ease-out-quart);
}

.fm-new-btn:hover {
    border-color: var(--ember-border);
    color: var(--ember);
    background: var(--ember-soft);
}

/* ─── 下拉菜单 ─── */

.fm-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 170px;
    background: var(--bg-surface);
    border: 1px solid var(--hairline);
    border-radius: 8px;
    box-shadow: var(--elev-2);
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
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: background var(--motion-instant) var(--ease-out-quart);
    text-align: left;
}

.fm-dropdown-item:hover {
    background: var(--bg-rice-paper);
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
    background: var(--hairline);
}

/* ─── 导入结果通知 ─── */

.fm-import-result {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: 12px;
    border-bottom: 1px solid transparent;
    animation: fm-slide-in var(--motion-base) var(--ease-out-quart);
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
    background: var(--success-light);
    border-bottom-color: var(--success);
    color: var(--success);
}

.fm-import-warning {
    background: var(--warning-light);
    border-bottom-color: var(--warning);
    color: var(--warning);
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
    transition: opacity var(--motion-instant) var(--ease-out-quart);
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
    border-bottom: 1px solid var(--hairline);
    background: var(--bg-rice-paper);
}

.fm-inline-input svg {
    color: var(--text-muted);
    flex-shrink: 0;
}

/* ─── 智能文件夹（状态筛选 chips） ─── */

.fm-smart-folders {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 6px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--hairline);
    background: var(--bg-rice-paper);
}

.fm-smart-folder {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    flex: 1 1 auto;
    min-width: 0;
    padding: 4px 8px;
    border: 1px solid var(--hairline);
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: border-color var(--motion-base) var(--ease-out-quart), background var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart), transform var(--motion-base) var(--ease-out-quart);
}

.fm-smart-folder:hover {
    transform: translateY(-1px);
    border-color: var(--ember-border);
    color: var(--text-primary);
}

@media (prefers-reduced-motion: reduce) {
    .fm-smart-folder,
    .fm-smart-folder:hover {
        transform: none;
        transition: border-color var(--motion-base) var(--ease-out-quart), background var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart);
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
    background: var(--bg-surface);
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    line-height: 1.5;
    text-align: center;
    transition: background var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart);
}

.fm-smart-folder.active {
    color: var(--ember);
    border-color: var(--ember-border);
    background: var(--ember-soft);
    font-weight: 600;
}

.fm-smart-folder.active strong {
    background: var(--ember-soft);
    color: var(--ember);
}

.fm-smart-folder:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
}

/* ─── 文件树 ─── */

.fm-tree {
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 4px 0;
}

.fm-quick-access {
    flex: 0 0 auto;
    margin: 6px 8px 8px;
    padding: 8px;
    border: 1px solid var(--hairline);
    border-radius: 10px;
    background: var(--bg-rice-paper);
    overflow: hidden;
}

.fm-quick-access-head,
.fm-quick-access-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.fm-quick-access-head {
    height: 22px;
    color: var(--text-primary);
    font-size: 12px;
    font-weight: 700;
}

.fm-quick-access-head strong,
.fm-quick-access-summary strong {
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 600;
}

.fm-quick-access-list {
    display: grid;
    gap: 6px;
    margin-top: 6px;
    overflow: hidden;
}

.fm-quick-access-group {
    display: grid;
    gap: 4px;
}

.fm-quick-access-summary {
    height: 24px;
    padding: 0 4px;
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    list-style: none;
}

.fm-quick-access-summary::-webkit-details-marker {
    display: none;
}

.fm-quick-access-item {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 36px;
    padding: 0 8px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary);
    cursor: grab;
    font: inherit;
    text-align: left;
    transition: background var(--motion-base) var(--ease-out-quart), border-color var(--motion-base) var(--ease-out-quart), transform var(--motion-base) var(--ease-out-quart);
}

.fm-quick-access-item:hover {
    border-color: var(--ember-border);
    background: var(--ember-soft);
    transform: translateX(2px);
}

.fm-quick-access-item:active {
    cursor: grabbing;
}

.fm-quick-access-item--active {
    border-color: var(--ember-border);
    background: var(--ember-soft);
}

.fm-quick-access-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--ember);
}

.fm-quick-access-title {
    overflow: hidden;
    color: var(--text-primary);
    font-size: 12px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.fm-quick-access-time {
    color: var(--text-muted);
    font-size: 10px;
    white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
    .fm-quick-access-item,
    .fm-quick-access-item:hover {
        transform: none;
        transition: background var(--motion-base) var(--ease-out-quart), border-color var(--motion-base) var(--ease-out-quart);
    }
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
    transition: background var(--motion-base) var(--ease-out-quart), transform var(--motion-base) var(--ease-out-quart), box-shadow var(--motion-base) var(--ease-out-quart);
    font-weight: 500;
    font-size: 12px;
    color: var(--text-secondary);
    border-left: 2px solid transparent;
    will-change: transform;
}

.fm-category-row:hover {
    background: var(--bg-rice-paper);
    transform: translateX(2px);
    border-left-color: var(--ember-border);
}

@media (prefers-reduced-motion: reduce) {
    .fm-category-row,
    .fm-category-row:hover {
        transform: none;
        transition: background var(--motion-base) var(--ease-out-quart);
    }
}

.fm-chevron {
    flex-shrink: 0;
    color: var(--text-muted);
    transition: transform var(--motion-base) var(--ease-out-quart);
}

.fm-chevron-open {
    transform: rotate(90deg);
}

.fm-cat-icon {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    color: var(--text-muted);
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
    color: var(--text-muted);
    font-weight: 400;
}

/* ─── 视图模式差异 ─── */

.fm-mode-flat .fm-category-row {
    height: 28px;
    background: transparent;
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    border-bottom: 1px solid var(--hairline);
    border-left: none;
    cursor: default;
}

.fm-mode-flat .fm-category-row:hover {
    background: transparent;
    transform: none;
    border-left: none;
}

.fm-node-bucket .fm-category-row {
    height: 26px;
    padding-left: 10px;
    background: transparent;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    border-left: none;
    margin-top: 4px;
}

.fm-node-bucket .fm-cat-icon {
    width: 12px;
    height: 12px;
    color: var(--text-muted);
}

.fm-node-bucket .fm-category-row:hover {
    background: var(--ember-soft);
    transform: none;
    border-left: none;
}

.fm-mode-tree .fm-articles-inner {
    padding-left: 8px;
    border-left: 1px dashed var(--hairline);
    margin-left: 12px;
}

/* ─── 文章列表（展开/折叠） ─── */

.fm-articles-wrap {
    max-height: 0;
    overflow: hidden;
    transition: max-height var(--motion-slow) var(--ease-out-quart);
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
    transition: background var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart), transform var(--motion-base) var(--ease-out-quart), box-shadow var(--motion-base) var(--ease-out-quart);
    position: relative;
    font-size: 12px;
    color: var(--text-secondary);
    will-change: transform;
    border-left: 2px solid transparent;
}

.fm-article-row:hover {
    background: var(--ember-soft);
    color: var(--text-primary);
    transform: translateX(2px);
    border-left-color: var(--ember-border);
}

.fm-article-row:active {
    transform: translateX(1px) scale(0.995);
}

@media (prefers-reduced-motion: reduce) {
    .fm-article-row,
    .fm-article-row:hover,
    .fm-article-row:active {
        transform: none;
        transition: background var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart);
    }
}

.fm-article-row.fm-article-active {
    background: var(--ember-soft);
    border-left: 3px solid var(--ember);
    padding-left: 31px;
}

.fm-article-row.fm-article-active .fm-article-title {
    color: var(--text-primary);
    font-weight: 500;
}

.fm-file-icon {
    flex-shrink: 0;
    color: var(--text-muted);
}

.fm-article-active .fm-file-icon {
    color: var(--ember);
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
    background: var(--warning-light);
    color: var(--warning);
}

.fm-status.status-read {
    background: var(--bg-rice-paper);
    color: var(--text-muted);
}

.fm-status.status-processed {
    background: var(--success-light);
    color: var(--success);
}

.fm-article-time {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
}

/* ─── 重命名输入 ─── */

.fm-rename-input {
    height: 22px;
    padding: 0 6px;
    border: 1px solid var(--ember-border);
    border-radius: 3px;
    background: var(--bg-surface);
    font-size: 12px;
    color: var(--text-primary);
    outline: none;
    box-shadow: var(--focus-ring);
}

.fm-rename-inline {
    flex: 1;
    min-width: 0;
}

/* ─── 素材区域 ─── */

.fm-assets-section {
    flex-shrink: 0;
    border-top: 1px solid var(--hairline);
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
    color: var(--text-secondary);
    transition: background var(--motion-fast) var(--ease-out-quart);
}

.fm-assets-header:hover {
    background: var(--bg-rice-paper);
}

.fm-assets-header svg {
    color: var(--text-muted);
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
    transition: max-height var(--motion-slow) var(--ease-out-quart), padding var(--motion-slow) var(--ease-out-quart);
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
    border: 1px solid var(--hairline);
    background: var(--bg-rice-paper);
}

.fm-asset-placeholder {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    border: 1px solid var(--hairline);
    background: var(--bg-rice-paper);
    color: var(--text-muted);
}

.fm-asset-name {
    font-size: 10px;
    color: var(--text-muted);
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
    color: var(--text-muted);
}

.fm-empty-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    margin: 4px 0 0;
}

.fm-empty-line {
    margin: 2px 0 4px;
    opacity: 0.85;
}

.fm-empty-hint {
    font-size: 12px;
    color: var(--text-muted);
}

.fm-empty-search p {
    font-size: 13px;
}

/* ─── 右键菜单 ─── */

.fm-context-menu {
    position: fixed;
    min-width: 180px;
    background: var(--bg-surface);
    border: 1px solid var(--hairline);
    border-radius: 8px;
    box-shadow: var(--elev-3);
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
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: background var(--motion-fast) var(--ease-out-quart);
    text-align: left;
}

.fm-ctx-item:hover {
    background: var(--bg-rice-paper);
}

.fm-ctx-item svg {
    flex-shrink: 0;
    color: var(--text-muted);
}

.fm-ctx-item-icon {
    flex-shrink: 0;
    color: var(--text-muted);
}

.fm-ctx-danger {
    color: var(--danger);
}

.fm-ctx-danger svg {
    color: var(--danger);
}

.fm-ctx-danger:hover {
    background: var(--danger-soft);
}

.fm-ctx-separator {
    height: 1px;
    background: var(--hairline);
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
    color: var(--text-muted);
}

.fm-ctx-submenu-wrap {
    position: relative;
}

.fm-ctx-submenu {
    position: absolute;
    left: calc(100% - 4px);
    top: -4px;
    min-width: 160px;
    background: var(--bg-surface);
    border: 1px solid var(--hairline);
    border-radius: 8px;
    box-shadow: var(--elev-3);
    padding: 4px;
    z-index: 10000;
}

/* ─── 删除确认模态框 ─── */

.fm-confirm-overlay {
    position: fixed;
    inset: 0;
    background: var(--scrim);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.fm-confirm-modal {
    background: var(--bg-surface);
    border-radius: 12px;
    padding: 24px;
    width: 340px;
    max-width: 90vw;
    box-shadow: var(--elev-3);
}

.fm-confirm-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 10px;
}

.fm-confirm-text {
    font-size: 13px;
    color: var(--text-secondary);
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
    transition: background var(--motion-fast) var(--ease-out-quart), opacity var(--motion-fast) var(--ease-out-quart);
    border: none;
}

.fm-btn-cancel {
    background: var(--bg-rice-paper);
    color: var(--text-secondary);
    border: 1px solid var(--hairline);
}

.fm-btn-cancel:hover {
    background: var(--bg-surface);
}

.fm-btn-danger {
    background: var(--danger);
    color: #fff;
}

.fm-btn-danger:hover {
    opacity: 0.9;
}

/* ─── 过渡动画 ─── */

.fm-fade-enter-active,
.fm-fade-leave-active {
    transition: opacity var(--motion-fast) var(--ease-out-quart), transform var(--motion-fast) var(--ease-out-quart);
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
    background: var(--hairline);
    border-radius: 2px;
}

.fm-root::-webkit-scrollbar-thumb:hover,
.fm-tree::-webkit-scrollbar-thumb:hover,
.fm-assets-grid::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
}

/* ─── List enter/leave (TransitionGroup name="fm-list") ─── */

.fm-list-enter-active,
.fm-list-leave-active {
    transition: transform var(--motion-slow) var(--ease-out-quart), opacity var(--motion-base) var(--ease-out-quart);
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

</style>
