<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAssetStore } from '@/stores/asset'
import type { AssetRecord } from '@/utils/db'
import AssetUploader from './AssetUploader.vue'
import AssetCard from './AssetCard.vue'

const props = defineProps<{
  articleId?: string
}>()

const emit = defineEmits<{
  (e: 'select', asset: AssetRecord): void
  (e: 'insert', assetUrl: string): void
}>()

const assetStore = useAssetStore()

// ─── 视图状态 ───
type ViewMode = 'grid' | 'list'
const viewMode = ref<ViewMode>('grid')
const searchQuery = ref('')
const selectedIds = ref<Set<string>>(new Set())
const showDeleteConfirm = ref(false)

// ─── 右键菜单 ───
const contextMenu = ref<{
  visible: boolean
  x: number
  y: number
  asset: AssetRecord | null
}>({
  visible: false,
  x: 0,
  y: 0,
  asset: null,
})

// ─── 标签编辑 ───
const editingTagsAssetId = ref<string | null>(null)
const editingTagsInput = ref('')

// ─── 计算属性 ───
const filteredAssets = computed(() => {
  if (!searchQuery.value.trim()) {
    return assetStore.assets
  }
  return assetStore.searchAssets(searchQuery.value)
})

const hasAssets = computed(() => assetStore.assets.length > 0)
const hasFilteredResults = computed(() => filteredAssets.value.length > 0)
const selectedCount = computed(() => selectedIds.value.size)
const isAllSelected = computed(() => {
  return filteredAssets.value.length > 0 &&
    filteredAssets.value.every(a => selectedIds.value.has(a.id))
})

/** 格式化总大小 */
const formattedTotalSize = computed(() => {
  const bytes = assetStore.totalSize
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

// ─── 生命周期 ───
onMounted(async () => {
  await assetStore.loadAssets(props.articleId)
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  assetStore.cleanup()
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
})

// 当 articleId 变化时重新加载
watch(() => props.articleId, async (newId) => {
  await assetStore.loadAssets(newId)
  selectedIds.value.clear()
})

// ─── 选择逻辑 ───
function handleSelectAsset(asset: AssetRecord) {
  const newSet = new Set(selectedIds.value)
  if (newSet.has(asset.id)) {
    newSet.delete(asset.id)
  } else {
    newSet.add(asset.id)
  }
  selectedIds.value = newSet
  emit('select', asset)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredAssets.value.map(a => a.id))
  }
}

function clearSelection() {
  selectedIds.value = new Set()
}

// ─── 预览（双击） ───
function handlePreviewAsset(asset: AssetRecord) {
  const url = assetStore.getAssetUrl(asset.id)
  if (url) {
    emit('insert', url)
  }
}

// ─── 右键菜单 ───
function handleContextMenu(event: MouseEvent, asset: AssetRecord) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    asset,
  }
}

function closeContextMenu() {
  contextMenu.value.visible = false
  contextMenu.value.asset = null
}

function handleDocumentClick() {
  closeContextMenu()
  // 关闭标签编辑
  if (editingTagsAssetId.value) {
    confirmTagEdit()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeContextMenu()
    if (editingTagsAssetId.value) {
      cancelTagEdit()
    }
  }
  // Delete 键删除选中
  if (e.key === 'Delete' && selectedCount.value > 0) {
    showDeleteConfirm.value = true
  }
}

// ─── 右键菜单操作 ───
async function contextCopyLink() {
  if (!contextMenu.value.asset) return
  const url = assetStore.getAssetUrl(contextMenu.value.asset.id)
  if (url) {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // 静默处理
    }
  }
  closeContextMenu()
}

function contextEditTags() {
  if (!contextMenu.value.asset) return
  editingTagsAssetId.value = contextMenu.value.asset.id
  editingTagsInput.value = contextMenu.value.asset.tags.join(', ')
  closeContextMenu()
}

async function contextDelete() {
  if (!contextMenu.value.asset) return
  const id = contextMenu.value.asset.id
  closeContextMenu()
  await assetStore.deleteAsset(id)
  selectedIds.value.delete(id)
  selectedIds.value = new Set(selectedIds.value)
}

function contextInsert() {
  if (!contextMenu.value.asset) return
  const url = assetStore.getAssetUrl(contextMenu.value.asset.id)
  if (url) {
    emit('insert', url)
  }
  closeContextMenu()
}

// ─── 标签编辑 ───
async function confirmTagEdit() {
  if (!editingTagsAssetId.value) return
  const tags = editingTagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)
  await assetStore.updateTags(editingTagsAssetId.value, tags)
  editingTagsAssetId.value = null
  editingTagsInput.value = ''
}

function cancelTagEdit() {
  editingTagsAssetId.value = null
  editingTagsInput.value = ''
}

// ─── 批量删除 ───
async function confirmBatchDelete() {
  const ids = Array.from(selectedIds.value)
  for (const id of ids) {
    await assetStore.deleteAsset(id)
  }
  selectedIds.value = new Set()
  showDeleteConfirm.value = false
}

function cancelBatchDelete() {
  showDeleteConfirm.value = false
}

// ─── 上传回调 ───
function handleUploaded(_count: number) {
  // 上传完成后自动刷新由 store 处理
}

function handleUploadError(_message: string) {
  // 错误已由 AssetUploader 显示
}
</script>

<template>
  <div class="asset-manager">
    <!-- 上传区域 -->
    <AssetUploader
      :article-id="articleId"
      @uploaded="handleUploaded"
      @error="handleUploadError"
    />

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <!-- 搜索栏 -->
        <div class="search-wrapper">
          <svg
            class="search-icon"
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
            class="search-input"
            placeholder="搜索素材名称或标签..."
          >
          <button
            v-if="searchQuery"
            class="search-clear"
            @click="searchQuery = ''"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
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

        <!-- 统计信息 -->
        <span class="asset-count">
          {{ filteredAssets.length }} 个素材
          <template v-if="assetStore.assets.length > 0">
            / {{ formattedTotalSize }}
          </template>
        </span>
      </div>

      <div class="toolbar-right">
        <!-- 批量操作 -->
        <template v-if="selectedCount > 0">
          <span class="selected-info">已选 {{ selectedCount }} 项</span>
          <button
            class="tool-btn"
            title="取消选择"
            @click="clearSelection"
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
          <button
            class="tool-btn danger"
            title="删除选中"
            @click="showDeleteConfirm = true"
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
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </template>

        <!-- 全选 -->
        <button
          class="tool-btn"
          :class="{ active: isAllSelected }"
          title="全选"
          @click="toggleSelectAll"
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
            <polyline
              v-if="isAllSelected"
              points="9 11 12 14 22 4"
            />
            <rect
              v-else
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              ry="2"
            />
            <path
              v-if="isAllSelected"
              d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
            />
          </svg>
        </button>

        <!-- 视图切换 -->
        <div class="view-toggle">
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'grid' }"
            title="网格视图"
            @click="viewMode = 'grid'"
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
              <rect
                x="3"
                y="3"
                width="7"
                height="7"
              />
              <rect
                x="14"
                y="3"
                width="7"
                height="7"
              />
              <rect
                x="14"
                y="14"
                width="7"
                height="7"
              />
              <rect
                x="3"
                y="14"
                width="7"
                height="7"
              />
            </svg>
          </button>
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'list' }"
            title="列表视图"
            @click="viewMode = 'list'"
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
              <line
                x1="8"
                y1="6"
                x2="21"
                y2="6"
              />
              <line
                x1="8"
                y1="12"
                x2="21"
                y2="12"
              />
              <line
                x1="8"
                y1="18"
                x2="21"
                y2="18"
              />
              <line
                x1="3"
                y1="6"
                x2="3.01"
                y2="6"
              />
              <line
                x1="3"
                y1="12"
                x2="3.01"
                y2="12"
              />
              <line
                x1="3"
                y1="18"
                x2="3.01"
                y2="18"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div
      v-if="assetStore.loading"
      class="loading-state"
    >
      <div class="loading-spinner" />
      <span>加载素材中...</span>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="!hasAssets"
      class="empty-state"
    >
      <svg
        class="empty-icon"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
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
      <h3 class="empty-title">
        素材库为空
      </h3>
      <p class="empty-description">
        拖拽图片到上方区域，或点击上传区域选择文件
      </p>
    </div>

    <!-- 搜索无结果 -->
    <div
      v-else-if="!hasFilteredResults"
      class="empty-state"
    >
      <svg
        class="empty-icon"
        width="48"
        height="48"
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
        <line
          x1="8"
          y1="11"
          x2="14"
          y2="11"
        />
      </svg>
      <h3 class="empty-title">
        未找到匹配素材
      </h3>
      <p class="empty-description">
        尝试调整搜索关键词
      </p>
    </div>

    <!-- 素材列表 -->
    <div
      v-else
      class="asset-grid"
      :class="[viewMode]"
    >
      <AssetCard
        v-for="asset in filteredAssets"
        :key="asset.id"
        :asset="asset"
        :selected="selectedIds.has(asset.id)"
        :view-mode="viewMode"
        @select="handleSelectAsset"
        @preview="handlePreviewAsset"
        @contextmenu="handleContextMenu"
      />
    </div>

    <!-- 标签编辑浮层 -->
    <Teleport to="body">
      <div
        v-if="editingTagsAssetId"
        class="tags-edit-overlay"
        @click.self="confirmTagEdit"
      >
        <div
          class="tags-edit-modal"
          @click.stop
        >
          <h4>编辑标签</h4>
          <p class="tags-hint">
            多个标签用逗号分隔
          </p>
          <input
            v-model="editingTagsInput"
            type="text"
            class="tags-input"
            placeholder="例如：设计, 背景, 素材"
            autofocus
            @keydown.enter="confirmTagEdit"
            @keydown.escape="cancelTagEdit"
          >
          <div class="tags-actions">
            <button
              class="tags-cancel-btn"
              @click="cancelTagEdit"
            >
              取消
            </button>
            <button
              class="tags-confirm-btn"
              @click="confirmTagEdit"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        @click.stop
      >
        <button
          class="context-item"
          @click="contextInsert"
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
          插入到编辑器
        </button>
        <button
          class="context-item"
          @click="contextCopyLink"
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
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          复制链接
        </button>
        <button
          class="context-item"
          @click="contextEditTags"
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
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line
              x1="7"
              y1="7"
              x2="7.01"
              y2="7"
            />
          </svg>
          编辑标签
        </button>
        <div class="context-divider" />
        <button
          class="context-item danger"
          @click="contextDelete"
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
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          删除
        </button>
      </div>
    </Teleport>

    <!-- 批量删除确认 -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="confirm-overlay"
        @click.self="cancelBatchDelete"
      >
        <div class="confirm-modal">
          <h3>确认删除</h3>
          <p>确定要删除选中的 {{ selectedCount }} 个素材吗？此操作不可撤销。</p>
          <div class="confirm-actions">
            <button
              class="cancel-btn"
              @click="cancelBatchDelete"
            >
              取消
            </button>
            <button
              class="delete-confirm-btn"
              @click="confirmBatchDelete"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.asset-manager {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

/* ═══ 工具栏 ═══ */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 搜索 */
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 280px;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted, #90A4AE);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 30px 7px 32px;
  border: 1px solid var(--border, #ECEFF1);
  border-radius: var(--radius-medium, 8px);
  font-size: 12px;
  color: var(--text-primary, #263238);
  background: var(--bg-surface, #FFFFFF);
  transition: border-color var(--duration-fast, 150ms) var(--ease-smooth);
  outline: none;
}

.search-input:focus {
  border-color: var(--accent-primary, #D32F2F);
  box-shadow: 0 0 0 2px var(--accent-primary-light, #FFEBEE);
}

.search-input::placeholder {
  color: var(--text-muted, #90A4AE);
}

.search-clear {
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--text-muted, #90A4AE);
  cursor: pointer;
  border-radius: 50%;
  transition: background var(--duration-fast, 150ms);
}

.search-clear:hover {
  background: var(--border, #ECEFF1);
  color: var(--text-secondary, #607D8B);
}

/* 统计 */
.asset-count {
  font-size: 11px;
  color: var(--text-muted, #90A4AE);
  white-space: nowrap;
  flex-shrink: 0;
}

/* 选中信息 */
.selected-info {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-primary, #D32F2F);
  white-space: nowrap;
}

/* 工具按钮 */
.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border, #ECEFF1);
  border-radius: var(--radius-small, 4px);
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-secondary, #607D8B);
  cursor: pointer;
  transition: all var(--duration-fast, 150ms) var(--ease-smooth);
}

.tool-btn:hover {
  border-color: var(--text-muted, #90A4AE);
  color: var(--text-primary, #263238);
}

.tool-btn.active {
  border-color: var(--accent-primary, #D32F2F);
  color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, #FFEBEE);
}

.tool-btn.danger:hover {
  border-color: var(--error, #C62828);
  color: var(--error, #C62828);
  background: var(--error-light, #FFEBEE);
}

/* 视图切换 */
.view-toggle {
  display: flex;
  border: 1px solid var(--border, #ECEFF1);
  border-radius: var(--radius-small, 4px);
  overflow: hidden;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 28px;
  border: none;
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-muted, #90A4AE);
  cursor: pointer;
  transition: all var(--duration-fast, 150ms) var(--ease-smooth);
}

.toggle-btn:first-child {
  border-right: 1px solid var(--border, #ECEFF1);
}

.toggle-btn:hover {
  color: var(--text-secondary, #607D8B);
}

.toggle-btn.active {
  background: var(--accent-primary, #D32F2F);
  color: #FFFFFF;
}

/* ═══ 素材网格 ═══ */
.asset-grid {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 12px;
}

.asset-grid.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.asset-grid.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ═══ 加载状态 ═══ */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--text-muted, #90A4AE);
  font-size: 13px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border, #ECEFF1);
  border-top-color: var(--accent-primary, #D32F2F);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ═══ 空状态 ═══ */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  color: var(--border, #ECEFF1);
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary, #607D8B);
}

.empty-description {
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
  max-width: 300px;
}

/* ═══ 右键菜单 ═══ */
.context-menu {
  position: fixed;
  z-index: 2000;
  min-width: 160px;
  padding: 4px;
  background: var(--bg-surface, #FFFFFF);
  border: 1px solid var(--border, #ECEFF1);
  border-radius: var(--radius-medium, 8px);
  box-shadow: var(--shadow-float, 0 8px 24px rgba(0, 0, 0, 0.08));
  animation: contextFadeIn 0.12s ease;
}

@keyframes contextFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-small, 4px);
  background: transparent;
  color: var(--text-primary, #263238);
  font-size: 12px;
  cursor: pointer;
  transition: background var(--duration-fast, 150ms);
  text-align: left;
}

.context-item:hover {
  background: var(--bg-rice-paper, #FAFBFC);
}

.context-item.danger {
  color: var(--error, #C62828);
}

.context-item.danger:hover {
  background: var(--error-light, #FFEBEE);
}

.context-divider {
  height: 1px;
  background: var(--border-light, #F5F5F5);
  margin: 4px 0;
}

/* ═══ 标签编辑模态框 ═══ */
.tags-edit-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  backdrop-filter: blur(2px);
}

.tags-edit-modal {
  width: 360px;
  padding: 20px;
  background: var(--bg-surface, #FFFFFF);
  border-radius: var(--radius-large, 12px);
  box-shadow: var(--shadow-elevated, 0 16px 48px rgba(0, 0, 0, 0.12));
}

.tags-edit-modal h4 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #263238);
  margin-bottom: 4px;
}

.tags-hint {
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
  margin-bottom: 12px;
}

.tags-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border, #ECEFF1);
  border-radius: var(--radius-medium, 8px);
  font-size: 13px;
  color: var(--text-primary, #263238);
  background: var(--bg-surface, #FFFFFF);
  outline: none;
  transition: border-color var(--duration-fast, 150ms);
}

.tags-input:focus {
  border-color: var(--accent-primary, #D32F2F);
  box-shadow: 0 0 0 2px var(--accent-primary-light, #FFEBEE);
}

.tags-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.tags-cancel-btn {
  padding: 7px 16px;
  border: 1px solid var(--border, #ECEFF1);
  border-radius: var(--radius-medium, 8px);
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-secondary, #607D8B);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--duration-fast, 150ms);
}

.tags-cancel-btn:hover {
  background: var(--bg-rice-paper, #FAFBFC);
  border-color: var(--text-muted, #90A4AE);
}

.tags-confirm-btn {
  padding: 7px 16px;
  border: none;
  border-radius: var(--radius-medium, 8px);
  background: var(--accent-primary, #D32F2F);
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--duration-fast, 150ms);
}

.tags-confirm-btn:hover {
  background: var(--accent-primary-dark, #B71C1C);
}

/* ═══ 删除确认模态框 ═══ */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  backdrop-filter: blur(2px);
}

.confirm-modal {
  background: var(--bg-surface, #FFFFFF);
  border-radius: var(--radius-large, 12px);
  padding: 24px;
  width: 340px;
  box-shadow: var(--shadow-elevated, 0 16px 48px rgba(0, 0, 0, 0.12));
}

.confirm-modal h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #263238);
  margin-bottom: 10px;
}

.confirm-modal p {
  font-size: 13px;
  color: var(--text-secondary, #607D8B);
  margin-bottom: 20px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.cancel-btn {
  padding: 8px 16px;
  border: 1px solid var(--border, #ECEFF1);
  border-radius: var(--radius-medium, 8px);
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-secondary, #607D8B);
  cursor: pointer;
  font-size: 13px;
  transition: all var(--duration-fast, 150ms);
}

.cancel-btn:hover {
  background: var(--bg-rice-paper, #FAFBFC);
  border-color: var(--text-muted, #90A4AE);
}

.delete-confirm-btn {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-medium, 8px);
  background: var(--error, #C62828);
  color: #FFFFFF;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background var(--duration-fast, 150ms);
}

.delete-confirm-btn:hover {
  background: #B71C1C;
}
</style>
