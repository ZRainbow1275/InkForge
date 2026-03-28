<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
    AlertTriangle,
    ArrowUpDown,
    Check,
    ChevronDown,
    ChevronRight,
    Cloud,
    CloudAlert,
    CloudUpload,
    Copy,
    ExternalLink,
    FileText,
    Folder,
    FolderOpen,
    HardDrive,
    Image,
    ImageOff,
    PenLine,
    Plus,
    Search,
    Trash2,
    Upload,
    X,
} from 'lucide-vue-next'
import { useArticleStore, type FileImportResult } from '@/stores/article'
import { useCategoryStore } from '@/stores/category'
import { useAssetStore } from '@/stores/asset'
import { useSyncStore } from '@/stores/sync'
import { ARTICLE_STATUS } from '@/constants'
import type { Article, Category } from '@/types'
import { getAllDocuments, type AssetRecord, type Document } from '@/utils/db'
import { resolveIconComponent } from '@/utils/lucide-icons'
import { formatRelativeTime } from '@/utils/format-relative-time'
import DraftBox from './DraftBox.vue'
import AssetPreview from './AssetPreview.vue'

// ═══════════════════════════════════════════════════════════════════
// Store 接入（真实数据，零 Mock）
// ═══════════════════════════════════════════════════════════════════

const articleStore = useArticleStore()
const categoryStore = useCategoryStore()
const assetStore = useAssetStore()
const syncStore = useSyncStore()

const { articles, selectedArticleId } = storeToRefs(articleStore)
const { categories } = storeToRefs(categoryStore)
const { assets } = storeToRefs(assetStore)
const { trackedDocumentIds, lastSyncAt } = storeToRefs(syncStore)

// ═══════════════════════════════════════════════════════════════════
// 搜索
// ═══════════════════════════════════════════════════════════════════

const searchQuery = ref('')

type SortMode = 'updated' | 'created' | 'title' | 'status'

interface SortConfig {
    mode: SortMode
    ascending: boolean
}

const sortOptions: Array<{ mode: SortMode; label: string; defaultAscending: boolean }> = [
    { mode: 'updated', label: '最近更新', defaultAscending: false },
    { mode: 'created', label: '创建时间', defaultAscending: false },
    { mode: 'title', label: '标题', defaultAscending: true },
    { mode: 'status', label: '状态', defaultAscending: true },
]

const sortConfig = ref<SortConfig>({
    mode: 'updated',
    ascending: false,
})

const showSortMenu = ref(false)
const sortMenuRef = ref<HTMLElement | null>(null)

const filteredArticlesMap = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    const all = articles.value
    if (!q) return all
    return all.filter(a => a.title.toLowerCase().includes(q))
})

const sortedArticles = computed(() => {
    const statusOrder = {
        [ARTICLE_STATUS.NEW]: 0,
        [ARTICLE_STATUS.READ]: 1,
        [ARTICLE_STATUS.PROCESSED]: 2,
    } as const

    return [...filteredArticlesMap.value].sort((left, right) => {
        let result: number

        switch (sortConfig.value.mode) {
            case 'created':
                result = left.createdAt.getTime() - right.createdAt.getTime()
                break
            case 'title':
                result = left.title.localeCompare(right.title, 'zh-Hans-CN')
                break
            case 'status':
                result = statusOrder[left.status] - statusOrder[right.status]
                break
            case 'updated':
            default:
                result = left.updatedAt.getTime() - right.updatedAt.getTime()
                break
        }

        if (result === 0) {
            result = left.title.localeCompare(right.title, 'zh-Hans-CN')
        }

        return sortConfig.value.ascending ? result : -result
    })
})

function toggleSortMenu(): void {
    showSortMenu.value = !showSortMenu.value
}

function selectSortMode(mode: SortMode): void {
    const option = sortOptions.find(item => item.mode === mode)
    if (!option) return

    if (sortConfig.value.mode === mode) {
        sortConfig.value = {
            ...sortConfig.value,
            ascending: !sortConfig.value.ascending,
        }
    } else {
        sortConfig.value = {
            mode,
            ascending: option.defaultAscending,
        }
    }

    showSortMenu.value = false
}

// ═══════════════════════════════════════════════════════════════════
// 文件树：按分类分组
// ═══════════════════════════════════════════════════════════════════

interface CategoryNode {
    category: Category | null // null 代表"未分类"
    articles: Article[]
    expanded: boolean
}

const expandedMap = ref<Record<string, boolean>>({})

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
    const filtered = sortedArticles.value
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

    // 有分类的节点
    for (const cat of categories.value) {
        const catArticles = catMap.get(cat.id) ?? []
        // 搜索时只显示有匹配文章的分类；无搜索时显示全部分类
        if (searchQuery.value.trim() && catArticles.length === 0) continue
        nodes.push({
            category: cat,
            articles: catArticles,
            expanded: ensureExpanded(cat.id),
        })
    }

    // 未分类节点（始终显示，除非搜索时无匹配）
    if (!searchQuery.value.trim() || uncategorized.length > 0) {
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
const selectedAssetId = ref<string | null>(null)

// 当选中文章变化时，加载对应素材
watch(() => selectedArticleId.value, async (newId) => {
    selectedAssetId.value = null
    if (newId) {
        await assetStore.loadAssets(newId)
    }
}, { immediate: true })

const currentAssets = computed(() => {
    if (!selectedArticleId.value) return []
    return assets.value.filter(a => a.articleId === selectedArticleId.value)
})

type ArticleSyncDisplayStatus = 'synced' | 'pending' | 'conflict' | 'local-only'

const documentStateMap = ref<Record<string, Document>>({})

async function refreshDocumentStateMap(): Promise<void> {
    try {
        const documents = await getAllDocuments()
        documentStateMap.value = documents.reduce<Record<string, Document>>((acc, document) => {
            acc[document.id] = document
            return acc
        }, {})
    } catch {
        // 使用现有内存状态回退，避免因单次读取失败清空 UI
    }
}

watch(
    [
        () => articles.value.length,
        () => selectedArticleId.value,
        () => trackedDocumentIds.value.join('|'),
        () => lastSyncAt.value?.getTime() ?? 0,
    ],
    () => {
        void refreshDocumentStateMap()
    },
    { immediate: true }
)

function getArticleSyncStatus(articleId: string): ArticleSyncDisplayStatus {
    if (syncStore.getConflictForDocument(articleId)) {
        return 'conflict'
    }

    if (trackedDocumentIds.value.includes(articleId)) {
        return 'pending'
    }

    const document = documentStateMap.value[articleId]
    if (!document) {
        return 'local-only'
    }

    if (document.syncStatus === 'conflict') {
        return 'conflict'
    }

    return document.syncStatus === 'synced' ? 'synced' : 'local-only'
}

function getArticleSyncIcon(articleId: string) {
    switch (getArticleSyncStatus(articleId)) {
        case 'synced':
            return Cloud
        case 'pending':
            return CloudUpload
        case 'conflict':
            return CloudAlert
        case 'local-only':
        default:
            return HardDrive
    }
}

function getArticleSyncLabel(articleId: string): string {
    switch (getArticleSyncStatus(articleId)) {
        case 'synced':
            return '已同步'
        case 'pending':
            return '待同步'
        case 'conflict':
            return '同步冲突'
        case 'local-only':
        default:
            return '仅本地'
    }
}

function getArticleSyncClass(articleId: string): string {
    return `fm-sync-icon--${getArticleSyncStatus(articleId)}`
}

function getAssetThumbnail(assetId: string): string | null {
    return assetStore.getThumbnailUrl(assetId)
}

const visibleAssets = computed(() => currentAssets.value.slice(0, 8))

const overflowAssetCount = computed(() => {
    return Math.max(0, currentAssets.value.length - visibleAssets.value.length)
})

function handleAssetSelect(asset: AssetRecord): void {
    selectedAssetId.value = asset.id
}

function handleAssetDragStart(event: DragEvent, asset: AssetRecord): void {
    const dataTransfer = event.dataTransfer
    const assetUrl = assetStore.getAssetUrl(asset.id)

    if (!dataTransfer || !assetUrl) return

    const safeName = asset.name.replace(/[[\]]/g, '').trim() || 'image'
    const markdown = `![${safeName}](${assetUrl})`

    dataTransfer.effectAllowed = 'copy'
    dataTransfer.setData('text/plain', markdown)
    dataTransfer.setData('text/uri-list', assetUrl)
}

async function handleAssetDelete(assetId: string): Promise<void> {
    try {
        await assetStore.deleteAsset(assetId)
        if (selectedAssetId.value === assetId) {
            selectedAssetId.value = null
        }
    } catch {
        // 静默失败，store 内部已有错误处理
    }
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
        // 用户取消选择时（success=0, failed=0）不显示通知
        if (result.success > 0 || result.failed > 0) {
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

async function handleDraftDelete(articleId: string): Promise<void> {
    try {
        await articleStore.deleteArticle(articleId)
    } catch {
        // 静默失败，store 内部已有错误处理
    }
}

async function handleDraftPublish(articleId: string): Promise<void> {
    try {
        await articleStore.updateArticle(articleId, { status: ARTICLE_STATUS.PROCESSED })
    } catch {
        // 静默失败，store 内部已有错误处理
    }
}

const draggingArticleId = ref<string | null>(null)
const dragOverCategoryId = ref<string | null>(null)

function getDropCategoryKey(categoryId: string | null): string {
    return categoryId ?? '__uncategorized__'
}

function handleArticleDragStart(event: DragEvent, articleId: string): void {
    const dataTransfer = event.dataTransfer
    draggingArticleId.value = articleId

    if (!dataTransfer) return

    dataTransfer.effectAllowed = 'move'
    dataTransfer.setData('application/x-inkforge-article-id', articleId)
    dataTransfer.setData('text/plain', articleId)
}

function handleArticleDragEnd(): void {
    draggingArticleId.value = null
    dragOverCategoryId.value = null
}

function handleCategoryDragOver(event: DragEvent, categoryId: string | null): void {
    if (!draggingArticleId.value) return
    event.preventDefault()
    dragOverCategoryId.value = getDropCategoryKey(categoryId)
}

function handleCategoryDragLeave(categoryId: string | null): void {
    const targetKey = getDropCategoryKey(categoryId)
    if (dragOverCategoryId.value === targetKey) {
        dragOverCategoryId.value = null
    }
}

async function handleCategoryDrop(event: DragEvent, categoryId: string | null): Promise<void> {
    event.preventDefault()

    const articleId = event.dataTransfer?.getData('application/x-inkforge-article-id') || draggingArticleId.value
    dragOverCategoryId.value = null
    draggingArticleId.value = null

    if (!articleId) return

    const article = articles.value.find(item => item.id === articleId)
    if (!article || article.categoryId === categoryId) return

    try {
        await articleStore.moveToCategory(articleId, categoryId)
    } catch {
        // 静默失败，store 内部已有错误处理
    }
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
    const menuHeight = contextMenu.value.type === 'article' ? 220 : 160
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
    // 关闭排序菜单
    if (showSortMenu.value && sortMenuRef.value && !sortMenuRef.value.contains(event.target as Node)) {
        showSortMenu.value = false
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

async function ctxDuplicateArticle(): Promise<void> {
    const articleId = contextMenu.value.targetId
    if (!articleId) return

    const original = articles.value.find(article => article.id === articleId)
    if (!original) {
        closeContextMenu()
        return
    }

    closeContextMenu()

    try {
        const duplicated = await articleStore.addArticle({
            title: `${original.title} (副本)`,
            sourceUrl: original.sourceUrl,
            sourceName: original.sourceName,
            categoryId: original.categoryId ?? undefined,
            description: original.description,
            authors: [...original.authors],
            rawContent: original.rawContent,
            links: [...original.links],
            images: [...original.images],
            tags: [...original.tags],
        })
        articleStore.selectArticle(duplicated.id)
    } catch {
        // 静默
    }
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
// 状态标记映射
// ═══════════════════════════════════════════════════════════════════

function getStatusLabel(status: string): string {
    switch (status) {
        case 'new': return '新'
        case 'read': return '已读'
        case 'processed': return '已处理'
        default: return ''
    }
}

function getStatusClass(status: string): string {
    switch (status) {
        case 'new': return 'status-new'
        case 'read': return 'status-read'
        case 'processed': return 'status-processed'
        default: return ''
    }
}

// ═══════════════════════════════════════════════════════════════════
// 节点 key 辅助
// ═══════════════════════════════════════════════════════════════════

function getCategoryKey(node: CategoryNode): string {
    return node.category?.id ?? '__uncategorized__'
}

function getCategoryLabel(node: CategoryNode): string {
    return node.category?.name ?? '未分类'
}

function getCategoryIcon(node: CategoryNode): string {
    return node.category?.icon ?? 'FileText'
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
    <div class="panel-section-title">
      <FolderOpen
        class="section-icon"
        :size="14"
      />
      <span>文件管理</span>
      <span
        v-if="articles.length > 0"
        class="section-count"
      >{{ articles.length }}</span>
    </div>

    <!-- 顶部工具栏 -->
    <div class="fm-toolbar">
      <div class="fm-search-wrap">
        <Search
          class="fm-search-icon"
          :size="14"
        />
        <input
          v-model="searchQuery"
          type="text"
          class="fm-search-input"
          placeholder="搜索文章..."
        >
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
          <Plus :size="14" />
          <ChevronDown :size="10" />
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
              <FileText :size="14" />
              <span>新建空白文章</span>
            </button>
            <button
              class="fm-dropdown-item"
              @click.stop="startNewCategory"
            >
              <Folder :size="14" />
              <span>新建分类</span>
            </button>
            <div class="fm-dropdown-separator" />
            <button
              class="fm-dropdown-item"
              :disabled="importing"
              @click.stop="handleImportFiles"
            >
              <Upload :size="14" />
              <span>{{ importing ? '导入中...' : '导入文件' }}</span>
            </button>
          </div>
        </Transition>
      </div>

      <div
        ref="sortMenuRef"
        class="fm-sort-wrap"
      >
        <button
          class="fm-sort-btn"
          :title="`排序：${sortOptions.find(option => option.mode === sortConfig.mode)?.label ?? '最近更新'}`"
          @click.stop="toggleSortMenu"
        >
          <ArrowUpDown :size="14" />
        </button>

        <Transition name="fm-fade">
          <div
            v-if="showSortMenu"
            class="fm-sort-menu"
          >
            <button
              v-for="option in sortOptions"
              :key="option.mode"
              class="fm-sort-option"
              :class="{ 'fm-sort-option-active': sortConfig.mode === option.mode }"
              @click.stop="selectSortMode(option.mode)"
            >
              <span>{{ option.label }}</span>
              <span class="fm-sort-direction">
                {{
                  sortConfig.mode === option.mode
                    ? (sortConfig.ascending ? '升序' : '降序')
                    : (option.defaultAscending ? '升序' : '降序')
                }}
              </span>
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
        <AlertTriangle
          v-if="importResult.failed > 0"
          :size="14"
        />
        <Check
          v-else
          :size="14"
        />
        <span class="fm-import-text">{{ importResult.success }} 成功<template v-if="importResult.failed > 0"> / {{ importResult.failed }} 失败</template></span>
        <button
          class="fm-import-close"
          title="关闭"
          @click="dismissImportResult"
        >
          <X :size="12" />
        </button>
      </div>
    </Transition>

    <!-- 新建分类 inline 输入 -->
    <div
      v-if="showNewCategoryInput"
      class="fm-inline-input"
    >
      <Folder :size="14" />
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

    <DraftBox
      :selected-article-id="selectedArticleId"
      @select="handleSelectArticle"
      @delete="handleDraftDelete"
      @publish="handleDraftPublish"
    />

    <!-- 文件树 -->
    <div class="fm-tree">
      <template v-if="fileTree.length === 0 && searchQuery.trim()">
        <div class="fm-empty-search">
          <Search
            :size="32"
            color="#9CA3AF"
          />
          <p>未找到匹配的文章</p>
        </div>
      </template>

      <template v-else-if="articles.length === 0 && !searchQuery.trim()">
        <div class="fm-empty-state">
          <FileText
            :size="40"
            color="#9CA3AF"
          />
          <p class="fm-empty-title">
            还没有任何文章
          </p>
          <p class="fm-empty-hint">
            点击上方 + 号新建文章或分类
          </p>
        </div>
      </template>

      <template v-else>
        <div
          v-for="node in fileTree"
          :key="getCategoryKey(node)"
          class="fm-category-node"
        >
          <!-- 分类行 -->
          <div
            class="fm-category-row"
            :class="{
              'fm-expanded': expandedMap[getCategoryKey(node)],
              'fm-category-row--drag-over': dragOverCategoryId === getCategoryKey(node),
            }"
            @click="toggleExpand(getCategoryKey(node))"
            @contextmenu="openCategoryContextMenu($event, node.category?.id ?? null)"
            @dragover="handleCategoryDragOver($event, node.category?.id ?? null)"
            @dragleave="handleCategoryDragLeave(node.category?.id ?? null)"
            @drop="handleCategoryDrop($event, node.category?.id ?? null)"
          >
            <!-- 展开/折叠箭头 -->
            <ChevronRight
              class="fm-chevron"
              :class="{ 'fm-chevron-open': expandedMap[getCategoryKey(node)] }"
              :size="12"
            />

            <!-- 分类图标 -->
            <span class="fm-cat-icon">
              <component
                :is="resolveIconComponent(getCategoryIcon(node), 'Folder')"
                :size="14"
              />
            </span>

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
            :class="{ 'fm-articles-expanded': expandedMap[getCategoryKey(node)] }"
          >
            <div
              v-for="article in node.articles"
              :key="article.id"
              class="fm-article-row"
              :class="{
                'fm-article-active': selectedArticleId === article.id,
                'fm-article-row--dragging': draggingArticleId === article.id,
              }"
              draggable="true"
              @click="handleSelectArticle(article.id)"
              @contextmenu="openArticleContextMenu($event, article.id)"
              @dragstart="handleArticleDragStart($event, article.id)"
              @dragend="handleArticleDragEnd"
            >
              <!-- 文件图标 -->
              <FileText
                class="fm-file-icon"
                :size="14"
              />

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
                v-if="article.status === 'new'"
                class="fm-status"
                :class="getStatusClass(article.status)"
              >
                {{ getStatusLabel(article.status) }}
              </span>

              <div class="fm-article-sync">
                <component
                  :is="getArticleSyncIcon(article.id)"
                  class="fm-sync-icon"
                  :class="getArticleSyncClass(article.id)"
                  :size="12"
                  :title="getArticleSyncLabel(article.id)"
                />
                <span class="fm-article-time">{{ formatRelativeTime(article.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 素材区域 -->
    <div
      v-if="selectedArticleId"
      class="fm-assets-section"
    >
      <div
        class="fm-assets-header"
        @click="assetsExpanded = !assetsExpanded"
      >
        <ChevronRight
          class="fm-chevron"
          :class="{ 'fm-chevron-open': assetsExpanded }"
          :size="12"
        />
        <Image :size="14" />
        <span class="fm-assets-label">素材库</span>
        <span
          v-if="currentAssets.length > 0"
          class="section-count"
        >{{ currentAssets.length }}</span>
        <span
          v-if="overflowAssetCount > 0"
          class="fm-assets-overflow-badge"
        >+{{ overflowAssetCount }}</span>
      </div>
      <div
        class="fm-assets-grid"
        :class="{ 'fm-assets-grid-expanded': assetsExpanded }"
      >
        <div
          v-if="currentAssets.length === 0"
          class="fm-assets-empty"
        >
          <ImageOff :size="16" />
          <span>暂无素材</span>
        </div>
        <template v-else>
          <AssetPreview
            v-for="asset in visibleAssets"
            :key="asset.id"
            :asset="asset"
            :thumbnail-url="getAssetThumbnail(asset.id)"
            :selected="selectedAssetId === asset.id"
            @click="handleAssetSelect"
            @dragstart="handleAssetDragStart"
            @delete="handleAssetDelete"
          />
          <div
            v-if="overflowAssetCount > 0"
            class="fm-assets-more"
          >
            +{{ overflowAssetCount }}
          </div>
        </template>
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
              <ExternalLink :size="14" />
              <span>打开</span>
            </button>
            <button
              class="fm-ctx-item"
              @click="ctxStartRenameArticle"
            >
              <PenLine :size="14" />
              <span>重命名</span>
            </button>
            <div class="fm-ctx-separator" />
            <div class="fm-ctx-submenu-wrap">
              <button
                class="fm-ctx-item fm-ctx-has-submenu"
                @click.stop="ctxToggleMoveSubmenu"
              >
                <Folder :size="14" />
                <span>移动到分类</span>
                <ChevronRight
                  class="fm-ctx-arrow"
                  :size="10"
                />
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
                    <span class="fm-ctx-label">
                      <component
                        :is="resolveIconComponent('FileText', 'FileText')"
                        :size="14"
                      />
                      <span>未分类</span>
                    </span>
                  </button>
                  <button
                    v-for="cat in categories"
                    :key="cat.id"
                    class="fm-ctx-item"
                    @click="ctxMoveToCategory(cat.id)"
                  >
                    <span class="fm-ctx-label">
                      <component
                        :is="resolveIconComponent(cat.icon, 'Folder')"
                        :size="14"
                      />
                      <span>{{ cat.name }}</span>
                    </span>
                  </button>
                </div>
              </Transition>
            </div>
            <button
              class="fm-ctx-item"
              @click="ctxDuplicateArticle"
            >
              <Copy :size="14" />
              <span>复制文档</span>
            </button>
            <div class="fm-ctx-separator" />
            <button
              class="fm-ctx-item fm-ctx-danger"
              @click="ctxDeleteArticle"
            >
              <Trash2 :size="14" />
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
                <PenLine :size="14" />
                <span>重命名</span>
              </button>
            </template>
            <button
              class="fm-ctx-item"
              @click="ctxNewArticleInCategory"
            >
              <FileText :size="14" />
              <span>在此分类新建文章</span>
            </button>
            <template v-if="contextMenu.targetCategoryId">
              <div class="fm-ctx-separator" />
              <button
                class="fm-ctx-item fm-ctx-danger"
                @click="ctxDeleteCategory"
              >
                <Trash2 :size="14" />
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
    overflow-y: auto;
    user-select: none;
}

/* ─── 工具栏 ─── */

.fm-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid #E5E7EB;
    flex-shrink: 0;
}

.fm-search-wrap {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
}

.fm-search-icon {
    position: absolute;
    left: 8px;
    color: #9CA3AF;
    pointer-events: none;
}

.fm-search-input {
    width: 100%;
    height: 28px;
    padding: 0 8px 0 28px;
    border: 1px solid #E5E7EB;
    border-radius: 6px;
    background: #fff;
    font-size: 12px;
    color: #1a1a1a;
    outline: none;
    transition: border-color 0.15s ease;
}

.fm-search-input:focus {
    border-color: #1565C0;
    box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.1);
}

.fm-search-input::placeholder {
    color: #9CA3AF;
}

.fm-new-wrap {
    position: relative;
    flex-shrink: 0;
}

.fm-sort-wrap {
    position: relative;
    flex-shrink: 0;
}

.fm-new-btn {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 28px;
    padding: 0 8px;
    border: 1px solid #E5E7EB;
    border-radius: 6px;
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

.fm-sort-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid #E5E7EB;
    border-radius: 6px;
    background: #fff;
    color: #4B5563;
    cursor: pointer;
    transition: all 0.15s ease;
}

.fm-sort-btn:hover {
    border-color: #1565C0;
    color: #1565C0;
    background: #F0F7FF;
}

.fm-sort-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 160px;
    padding: 6px;
    background: #fff;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    z-index: 40;
}

.fm-sort-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 7px 8px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #374151;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s ease, color 0.1s ease;
}

.fm-sort-option:hover,
.fm-sort-option-active {
    background: #F3F4F6;
}

.fm-sort-option-active {
    color: #1565C0;
    font-weight: 600;
}

.fm-sort-direction {
    font-size: 11px;
    color: #90A4AE;
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

/* ─── 文件树 ─── */

.fm-tree {
    flex: 1;
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
    padding: 0 10px;
    cursor: pointer;
    transition: background 0.1s ease;
    font-weight: 500;
    font-size: 12px;
    color: #374151;
}

.fm-category-row:hover {
    background: #F3F4F6;
}

.fm-category-row--drag-over {
    background: rgba(211, 47, 47, 0.08);
    box-shadow: inset 0 0 0 2px rgba(211, 47, 47, 0.32);
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    line-height: 1;
    color: #607D8B;
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
    padding: 0 10px 0 34px;
    cursor: pointer;
    transition: all 0.1s ease;
    position: relative;
    font-size: 12px;
    color: #4B5563;
}

.fm-article-row:hover {
    background: #F3F4F6;
}

.fm-article-row--dragging {
    opacity: 0.52;
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

.fm-article-sync {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    min-width: 0;
}

.fm-sync-icon {
    flex-shrink: 0;
}

.fm-sync-icon--synced {
    color: #2E7D32;
}

.fm-sync-icon--pending {
    color: #F57C00;
}

.fm-sync-icon--conflict {
    color: #C62828;
}

.fm-sync-icon--local-only {
    color: #90A4AE;
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

.fm-assets-overflow-badge {
    flex-shrink: 0;
    font-size: 11px;
    color: #90A4AE;
}

.fm-assets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
    gap: 6px;
    padding: 0 10px;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.25s ease, padding 0.25s ease;
}

.fm-assets-grid-expanded {
    max-height: 180px;
    padding: 6px 10px 10px;
}

.fm-assets-empty {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 68px;
    color: var(--text-muted, #90A4AE);
    font-size: 12px;
}

.fm-assets-more {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 6px;
    border: 1px dashed #CFD8DC;
    background: rgba(250, 251, 252, 0.88);
    color: #607D8B;
    font-size: 11px;
    font-weight: 600;
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

.fm-ctx-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
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
</style>
