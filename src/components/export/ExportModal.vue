<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { X, Copy, Download, CheckCircle, Smartphone, Monitor, Settings, BookOpen, Hash, Link2, Eye, AlertCircle } from 'lucide-vue-next'
import { themePresets, convertToWechatWithStats, copyToClipboard, getDefaultPreset } from '@/services/export'
import type { ExportPreset } from '@/types'
import type { ExportOptions, ExportResult } from '@/services/export'

// 常量定义
const FEEDBACK_DISPLAY_DURATION_MS = 2000

const props = defineProps<{
  visible: boolean
  content: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 预设选择
const selectedPresetId = ref(getDefaultPreset().id)
const selectedPreset = computed(() => 
  themePresets.find(p => p.id === selectedPresetId.value) || getDefaultPreset()
)

// 预览模式
type PreviewMode = 'mobile' | 'desktop'
const previewMode = ref<PreviewMode>('mobile')

// 导出选项
const exportOptions = ref<ExportOptions>({
  enableCiteStatus: true,
  enableLineNumbers: false,
  enableReadingTime: true,
  enableCodeHighlight: true,
  readingSpeed: 300
})

// 导出结果
const exportResult = computed<ExportResult | null>(() => {
  if (!props.content) return null
  return convertToWechatWithStats(props.content, selectedPreset.value, exportOptions.value)
})

// 预览HTML
const previewHtml = computed(() => exportResult.value?.html || '')

// 统计信息
const stats = computed(() => exportResult.value?.stats)

// 复制状态
const copySuccess = ref(false)

// 错误提示状态
const downloadError = ref(false)

// 复制到微信
async function copyToWechat() {
  if (!previewHtml.value) return

  const success = await copyToClipboard(previewHtml.value)
  if (success) {
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, FEEDBACK_DISPLAY_DURATION_MS)
  }
}

// 下载HTML
function downloadHtml() {
  try {
    const blob = new Blob([previewHtml.value], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'article.html'
    a.click()
    URL.revokeObjectURL(url)
  } catch (_e) {
    // 下载失败，显示错误提示
    downloadError.value = true
    setTimeout(() => {
      downloadError.value = false
    }, FEEDBACK_DISPLAY_DURATION_MS)
  }
}

// 选择预设
function selectPreset(preset: ExportPreset) {
  selectedPresetId.value = preset.id
}

// ESC 关闭
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

// 监听键盘
watch(() => props.visible, (visible) => {
  if (visible) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

// 组件卸载时清理事件监听器，防止内存泄漏
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-container">
        <!-- 头部 -->
        <div class="modal-header">
          <h2>📤 导出到微信</h2>
          <button class="close-btn" @click="emit('close')">
            <X :size="20" />
          </button>
        </div>

        <div class="modal-body">
          <!-- 左侧：预设选择 + 选项 -->
          <div class="preset-sidebar">
            <h3>选择风格</h3>
            <div class="preset-list">
              <button
                v-for="preset in themePresets"
                :key="preset.id"
                class="preset-item"
                :class="{ active: selectedPresetId === preset.id }"
                @click="selectPreset(preset)"
              >
                <span class="preset-icon">{{ preset.icon }}</span>
                <div class="preset-info">
                  <span class="preset-name">{{ preset.name }}</span>
                  <span class="preset-desc">{{ preset.description }}</span>
                </div>
              </button>
            </div>

            <!-- 导出选项 -->
            <div class="options-section">
              <h3><Settings :size="14" /> 导出选项</h3>
              <div class="option-list">
                <label class="option-item">
                  <input type="checkbox" v-model="exportOptions.enableReadingTime" />
                  <BookOpen :size="14" />
                  <span>显示阅读时间</span>
                </label>
                <label class="option-item">
                  <input type="checkbox" v-model="exportOptions.enableLineNumbers" />
                  <Hash :size="14" />
                  <span>代码显示行号</span>
                </label>
                <label class="option-item">
                  <input type="checkbox" v-model="exportOptions.enableCiteStatus" />
                  <Link2 :size="14" />
                  <span>外链转脚注</span>
                </label>
                <label class="option-item">
                  <input type="checkbox" v-model="exportOptions.enableCodeHighlight" />
                  <Eye :size="14" />
                  <span>代码语法高亮</span>
                </label>
              </div>
            </div>

            <!-- 统计信息 -->
            <div v-if="stats" class="stats-section">
              <h3>📊 文章统计</h3>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-value">{{ stats.wordCount }}</span>
                  <span class="stat-label">字数</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ stats.readingTime }}</span>
                  <span class="stat-label">分钟</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ stats.codeBlockCount }}</span>
                  <span class="stat-label">代码块</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ stats.linkCount }}</span>
                  <span class="stat-label">链接</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：预览 -->
          <div class="preview-area">
            <!-- 预览模式切换 -->
            <div class="preview-header">
              <div class="preview-tabs">
                <button 
                  :class="{ active: previewMode === 'mobile' }"
                  @click="previewMode = 'mobile'"
                >
                  <Smartphone :size="16" />
                  手机预览
                </button>
                <button 
                  :class="{ active: previewMode === 'desktop' }"
                  @click="previewMode = 'desktop'"
                >
                  <Monitor :size="16" />
                  桌面预览
                </button>
              </div>
            </div>

            <!-- 预览框 -->
            <div class="preview-wrapper" :class="previewMode">
              <div class="preview-frame">
                <iframe
                  class="preview-iframe"
                  sandbox="allow-same-origin"
                  :srcdoc="previewHtml"
                  title="文章预览"
                ></iframe>
              </div>
            </div>
          </div>
        </div>

        <!-- 错误提示 Toast -->
        <Transition name="toast">
          <div v-if="downloadError" class="error-toast">
            <AlertCircle :size="16" />
            <span>下载失败，请重试</span>
          </div>
        </Transition>

        <!-- 底部操作 -->
        <div class="modal-footer">
          <div class="footer-info">
            <span class="preset-tag">{{ selectedPreset.icon }} {{ selectedPreset.name }}</span>
          </div>
          <div class="footer-actions">
            <button class="action-btn" @click="downloadHtml">
              <Download :size="16" />
              下载 HTML
            </button>
            <button 
              class="action-btn primary" 
              @click="copyToWechat"
              :class="{ success: copySuccess }"
            >
              <CheckCircle v-if="copySuccess" :size="16" />
              <Copy v-else :size="16" />
              {{ copySuccess ? '已复制!' : '复制到微信' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-container {
  width: 90vw;
  max-width: 1200px;
  height: 85vh;
  background: var(--color-bg);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.modal-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 预设侧栏 */
.preset-sidebar {
  width: 280px;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preset-sidebar h3 {
  padding: 16px 20px;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--color-border);
}

.preset-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.preset-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg);
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 8px;
  text-align: left;
}

.preset-item:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-secondary);
}

.preset-item.active {
  border-color: var(--color-primary);
  background: rgba(0, 102, 204, 0.1);
}

.preset-icon {
  font-size: 28px;
}

.preset-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preset-name {
  font-size: 14px;
  font-weight: 600;
}

.preset-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 导出选项区域 */
.options-section {
  padding: 12px;
  border-top: 1px solid var(--color-border);
}

.options-section h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 12px 0;
  border-bottom: none;
  font-size: 13px;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.option-item:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-primary);
}

.option-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
}

/* 统计信息区域 */
.stats-section {
  padding: 12px;
  border-top: 1px solid var(--color-border);
}

.stats-section h3 {
  padding: 0 0 12px 0;
  border-bottom: none;
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
}

.stat-label {
  font-size: 11px;
  opacity: 0.9;
}

/* 预览区域 */
.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg-secondary);
}

.preview-header {
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
}

.preview-tabs {
  display: flex;
  gap: 8px;
}

.preview-tabs button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.preview-tabs button:hover {
  background: var(--color-bg-secondary);
}

.preview-tabs button.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.preview-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 24px;
  overflow: auto;
}

.preview-wrapper.mobile .preview-frame {
  width: 375px;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.preview-wrapper.desktop .preview-frame {
  width: 100%;
  max-width: 800px;
  border-radius: 8px;
}

.preview-frame {
  background: white;
  border: 1px solid var(--color-border);
  overflow: hidden;
  max-height: 100%;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: none;
  background: white;
}

/* 错误提示 Toast */
.error-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #ef4444;
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  font-size: 14px;
  z-index: 1001;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* 底部 */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preset-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-bg-secondary);
  border-radius: 6px;
  font-size: 13px;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--color-bg-secondary);
}

.action-btn.primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.action-btn.primary:hover {
  opacity: 0.9;
}

.action-btn.success {
  background: #10b981;
  border-color: #10b981;
}
</style>
