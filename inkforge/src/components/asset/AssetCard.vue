<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { AssetRecord } from '@/utils/db'

const props = defineProps<{
  asset: AssetRecord
  selected: boolean
  viewMode: 'grid' | 'list'
}>()

const emit = defineEmits<{
  (e: 'select', asset: AssetRecord): void
  (e: 'preview', asset: AssetRecord): void
  (e: 'contextmenu', event: MouseEvent | KeyboardEvent, asset: AssetRecord): void
}>()

const thumbnailUrl = ref<string | null>(null)

function revokeThumbnailUrl(): void {
  if (!thumbnailUrl.value) return
  URL.revokeObjectURL(thumbnailUrl.value)
  thumbnailUrl.value = null
}

watch(
  () => [props.asset.id, props.asset.thumbnail, props.asset.blob] as const,
  () => {
    revokeThumbnailUrl()
    const blob = props.asset.thumbnail ?? props.asset.blob
    thumbnailUrl.value = URL.createObjectURL(blob)
  },
  { immediate: true },
)

onUnmounted(revokeThumbnailUrl)

/** 文件大小格式化：bytes -> KB/MB */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 格式化日期 */
function formatDate(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 格式化后的文件大小 */
const formattedSize = computed(() => formatFileSize(props.asset.size))

/** 格式化后的日期 */
const formattedDate = computed(() => formatDate(props.asset.createdAt))

/** MIME 类型对应的文件类型标签 */
const typeLabel = computed(() => {
  const mime = props.asset.mimeType
  if (mime.includes('png')) return 'PNG'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPG'
  if (mime.includes('gif')) return 'GIF'
  if (mime.includes('svg')) return 'SVG'
  if (mime.includes('webp')) return 'WebP'
  return props.asset.type.toUpperCase()
})

function handleClick() {
  emit('select', props.asset)
}

function handleDblClick() {
  emit('preview', props.asset)
}

function handleContextMenu(event: MouseEvent | KeyboardEvent) {
  event.preventDefault()
  emit('contextmenu', event, props.asset)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
    handleContextMenu(event)
  }
}
</script>

<template>
  <!-- Grid View -->
  <button
    v-if="viewMode === 'grid'"
    type="button"
    class="asset-card-grid"
    :class="{ selected }"
    :aria-pressed="selected"
    :aria-label="`选择素材 ${asset.name}`"
    @click="handleClick"
    @keydown="handleKeydown"
    @dblclick="handleDblClick"
    @contextmenu="handleContextMenu"
  >
    <div class="thumbnail-wrapper">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="asset.name"
        class="thumbnail"
        loading="lazy"
      >
      <div
        v-else
        class="thumbnail-placeholder"
      >
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
      <span class="type-badge">{{ typeLabel }}</span>
      <div
        v-if="selected"
        class="selected-indicator"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
      </div>
    </div>
    <div class="card-info">
      <span
        class="file-name"
        :title="asset.name"
      >{{ asset.name }}</span>
      <span class="file-meta">{{ formattedSize }}</span>
    </div>
  </button>

  <!-- List View -->
  <button
    v-else
    type="button"
    class="asset-card-list"
    :class="{ selected }"
    :aria-pressed="selected"
    :aria-label="`选择素材 ${asset.name}`"
    @click="handleClick"
    @keydown="handleKeydown"
    @dblclick="handleDblClick"
    @contextmenu="handleContextMenu"
  >
    <div class="list-thumbnail-wrapper">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="asset.name"
        class="list-thumbnail"
        loading="lazy"
      >
      <div
        v-else
        class="list-thumbnail-placeholder"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
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
    </div>
    <div class="list-info">
      <span
        class="file-name"
        :title="asset.name"
      >{{ asset.name }}</span>
      <div class="list-meta">
        <span class="type-tag">{{ typeLabel }}</span>
        <span class="meta-separator">-</span>
        <span>{{ formattedSize }}</span>
        <span class="meta-separator">-</span>
        <span>{{ formattedDate }}</span>
      </div>
    </div>
    <div
      v-if="asset.width && asset.height"
      class="list-dimensions"
    >
      {{ asset.width }} x {{ asset.height }}
    </div>
    <div
      v-if="selected"
      class="list-selected-indicator"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
      </svg>
    </div>
  </button>
</template>

<style scoped>
/* ═══ Grid View ═══ */
.asset-card-grid {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  border-radius: var(--radius-medium, 8px);
  border: 1px solid var(--border, #ECEFF1);
  background: var(--bg-surface, #FFFFFF);
  cursor: pointer;
  transition: all var(--duration-fast, 150ms) var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1));
  overflow: hidden;
  user-select: none;
}

.asset-card-grid:hover {
  border-color: var(--text-muted, #90A4AE);
  box-shadow: var(--shadow-medium, 0 4px 12px rgba(0, 0, 0, 0.06));
  transform: translateY(-1px);
}

.asset-card-grid.selected {
  border-color: var(--accent-primary, #D32F2F);
  box-shadow: 0 0 0 2px var(--accent-primary-light, #FFEBEE);
}

.thumbnail-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: var(--bg-rice-paper, #FAFBFC);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  color: var(--text-muted, #90A4AE);
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 6px;
  border-radius: var(--radius-small, 4px);
  background: rgba(0, 0, 0, 0.55);
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.selected-indicator {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-primary, #D32F2F);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-info {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-top: 1px solid var(--border-light, #F5F5F5);
}

.file-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #263238);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 11px;
  color: var(--text-muted, #90A4AE);
}

/* ═══ List View ═══ */
.asset-card-list {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-medium, 8px);
  border: 1px solid transparent;
  background: var(--bg-surface, #FFFFFF);
  cursor: pointer;
  transition: all var(--duration-fast, 150ms) var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1));
  user-select: none;
}

.asset-card-list:hover {
  background: var(--bg-rice-paper, #FAFBFC);
  border-color: var(--border, #ECEFF1);
}

.asset-card-list.selected {
  background: var(--accent-primary-light, #FFEBEE);
  border-color: var(--accent-primary, #D32F2F);
}

.list-thumbnail-wrapper {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-small, 4px);
  background: var(--bg-rice-paper, #FAFBFC);
  border: 1px solid var(--border-light, #F5F5F5);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.list-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.list-thumbnail-placeholder {
  color: var(--text-muted, #90A4AE);
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.list-info .file-name {
  font-size: 13px;
}

.list-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted, #90A4AE);
}

.type-tag {
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--bg-rice-paper, #FAFBFC);
  border: 1px solid var(--border-light, #F5F5F5);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary, #607D8B);
}

.meta-separator {
  color: var(--border, #ECEFF1);
}

.list-dimensions {
  font-size: 11px;
  color: var(--text-muted, #90A4AE);
  white-space: nowrap;
  flex-shrink: 0;
}

.list-selected-indicator {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-primary, #D32F2F);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
