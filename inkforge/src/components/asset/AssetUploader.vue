<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAssetStore } from '@/stores/asset'
import { AppError } from '@/services/error'

const props = defineProps<{
  articleId?: string
}>()

const emit = defineEmits<{
  (e: 'uploaded', count: number): void
  (e: 'error', message: string): void
}>()

const assetStore = useAssetStore()

// ─── 状态 ───
type UploadState = 'idle' | 'hover' | 'uploading'
const state = ref<UploadState>('idle')
const uploadingFiles = ref<Array<{ name: string; progress: number; error?: string }>>([])
const errorMessage = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

/** 支持的文件类型 */
const ACCEPTED_TYPES = 'image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp'

/** 最大文件大小 10MB */
const MAX_SIZE_MB = 10

/** 是否正在上传 */
const isUploading = computed(() => state.value === 'uploading')

/** 当前上传进度概要 */
const uploadSummary = computed(() => {
  const total = uploadingFiles.value.length
  const done = uploadingFiles.value.filter(f => f.progress >= 100).length
  const failed = uploadingFiles.value.filter(f => f.error).length
  return { total, done, failed }
})

// ─── 拖拽事件 ───
function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  if (!isUploading.value) {
    state.value = 'hover'
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  if (!isUploading.value) {
    state.value = 'hover'
  }
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  // 只在离开根元素时重置状态（防止子元素触发）
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX
  const y = e.clientY
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    if (!isUploading.value) {
      state.value = 'idle'
    }
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  state.value = 'idle'
  if (isUploading.value) return

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    processFiles(Array.from(files))
  }
}

// ─── 点击选择文件 ───
function triggerFileSelect() {
  if (isUploading.value) return
  fileInputRef.value?.click()
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    processFiles(Array.from(input.files))
    // 重置 input 允许重复选择同一文件
    input.value = ''
  }
}

// ─── 核心上传逻辑 ───
async function processFiles(files: File[]) {
  errorMessage.value = null
  state.value = 'uploading'

  // 初始化上传进度列表
  uploadingFiles.value = files.map(f => ({ name: f.name, progress: 0 }))

  let successCount = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      // 模拟进度开始（IndexedDB 写入是同步式的，无真实 progress 回调）
      uploadingFiles.value[i].progress = 30

      await assetStore.uploadAsset(file, props.articleId)

      uploadingFiles.value[i].progress = 100
      successCount++
    } catch (err) {
      const message = err instanceof AppError
        ? err.message
        : `上传失败: ${file.name}`
      uploadingFiles.value[i].error = message
      uploadingFiles.value[i].progress = 0
    }
  }

  // 上传完成后，短暂保留结果展示
  if (successCount > 0) {
    emit('uploaded', successCount)
  }

  const failedCount = uploadingFiles.value.filter(f => f.error).length
  if (failedCount > 0) {
    const errors = uploadingFiles.value
      .filter(f => f.error)
      .map(f => f.error)
      .join('; ')
    errorMessage.value = errors
    emit('error', errors)
  }

  // 延迟重置
  setTimeout(() => {
    state.value = 'idle'
    uploadingFiles.value = []
    // 错误信息保留更长时间
    if (!failedCount) {
      errorMessage.value = null
    }
  }, 1500)
}

function dismissError() {
  errorMessage.value = null
}
</script>

<template>
  <div
    class="asset-uploader"
    :class="[state]"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="triggerFileSelect"
  >
    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      :accept="ACCEPTED_TYPES"
      multiple
      class="hidden-input"
      @change="handleFileSelect"
      @click.stop
    />

    <!-- Idle 状态 -->
    <div v-if="state === 'idle' && uploadingFiles.length === 0" class="uploader-content idle-content">
      <div class="upload-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <div class="upload-text">
        <span class="upload-primary-text">拖拽文件到此处，或点击选择</span>
        <span class="upload-hint">支持 PNG / JPG / GIF / SVG / WebP，单文件最大 {{ MAX_SIZE_MB }}MB</span>
      </div>
    </div>

    <!-- Hover 状态 -->
    <div v-if="state === 'hover'" class="uploader-content hover-content">
      <div class="upload-icon pulse">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <span class="upload-primary-text">松开以上传文件</span>
    </div>

    <!-- Uploading 状态 -->
    <div v-if="state === 'uploading'" class="uploader-content uploading-content" @click.stop>
      <div class="upload-progress-header">
        <span class="uploading-title">
          正在上传 ({{ uploadSummary.done }}/{{ uploadSummary.total }})
        </span>
      </div>
      <div class="upload-file-list">
        <div
          v-for="(file, index) in uploadingFiles"
          :key="index"
          class="upload-file-item"
          :class="{ error: file.error, done: file.progress >= 100 }"
        >
          <span class="upload-file-name">{{ file.name }}</span>
          <div v-if="file.error" class="upload-file-error">{{ file.error }}</div>
          <div v-else class="upload-file-bar">
            <div class="upload-file-bar-fill" :style="{ width: `${file.progress}%` }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示条 -->
    <div v-if="errorMessage && state === 'idle'" class="error-banner" @click.stop>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <span class="error-text">{{ errorMessage }}</span>
      <button class="error-dismiss" @click.stop="dismissError">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.asset-uploader {
  position: relative;
  border: 2px dashed var(--border, #ECEFF1);
  border-radius: var(--radius-medium, 8px);
  background: var(--bg-surface, #FFFFFF);
  cursor: pointer;
  transition: all var(--duration-normal, 250ms) var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1));
  min-height: 100px;
}

.asset-uploader.hover {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, #FFEBEE);
}

.asset-uploader.uploading {
  border-color: var(--accent-secondary, #1565C0);
  border-style: solid;
  cursor: default;
}

.hidden-input {
  display: none;
}

.uploader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px 16px;
}

/* Idle */
.idle-content .upload-icon {
  color: var(--text-muted, #90A4AE);
  transition: color var(--duration-fast, 150ms) var(--ease-smooth);
}

.asset-uploader:hover .idle-content .upload-icon {
  color: var(--accent-primary, #D32F2F);
}

.upload-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.upload-primary-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #607D8B);
}

.upload-hint {
  font-size: 11px;
  color: var(--text-muted, #90A4AE);
}

/* Hover */
.hover-content {
  padding: 28px 16px;
}

.hover-content .upload-icon {
  color: var(--accent-primary, #D32F2F);
}

.hover-content .upload-primary-text {
  color: var(--accent-primary, #D32F2F);
  font-weight: 600;
}

.upload-icon.pulse {
  animation: uploadPulse 1s var(--ease-bounce, cubic-bezier(0.34, 1.56, 0.64, 1)) infinite;
}

@keyframes uploadPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Uploading */
.uploading-content {
  align-items: stretch;
  gap: 8px;
  padding: 16px;
}

.upload-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.uploading-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-secondary, #1565C0);
}

.upload-file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
}

.upload-file-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-radius: var(--radius-small, 4px);
  background: var(--bg-rice-paper, #FAFBFC);
}

.upload-file-item.done {
  background: var(--success-light, #E8F5E9);
}

.upload-file-item.error {
  background: var(--error-light, #FFEBEE);
}

.upload-file-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #263238);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-file-error {
  font-size: 11px;
  color: var(--error, #C62828);
}

.upload-file-bar {
  height: 3px;
  border-radius: 2px;
  background: var(--border, #ECEFF1);
  overflow: hidden;
}

.upload-file-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--accent-secondary, #1565C0);
  transition: width 0.3s var(--ease-smooth);
}

.upload-file-item.done .upload-file-bar-fill {
  background: var(--success, #2E7D32);
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin: 0 8px 8px;
  border-radius: var(--radius-small, 4px);
  background: var(--error-light, #FFEBEE);
  color: var(--error, #C62828);
  font-size: 12px;
  cursor: default;
}

.error-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-dismiss {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--error, #C62828);
  cursor: pointer;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background var(--duration-fast, 150ms);
}

.error-dismiss:hover {
  background: rgba(198, 40, 40, 0.1);
}
</style>
