<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { marked } from 'marked'
import {
  X, Copy, Download, CheckCircle,
  Hash, Link2, AlertCircle, Loader2, Lightbulb
} from 'lucide-vue-next'
import {
  convertToPlatform, getPlatformPresets,
  convertToNativeFormat, convertToWechatWithStats, copyTextToClipboard,
  copyToClipboard, getDefaultPreset, isClipboardWriteAvailable,
  detectQuality, themePresets
} from '@/services/export'
import { resolveExportIcon } from '@/utils/iconography'
import type {
  Platform, ExportOptions, ExportStats,
  NativeExportResult, QualityReport, QualityIssueSeverity, CodeTheme
} from '@/services/export'
import type { ExportPreset } from '@/types'
import type { Component } from 'vue'

// ─── Constants ───────────────────────────────────────────
const FEEDBACK_DURATION = 2000

const CODE_THEMES: { id: CodeTheme; label: string }[] = [
  { id: 'github-light', label: 'GitHub' },
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'monokai', label: 'Monokai' },
  { id: 'atom-one-light', label: 'Atom One Light' },
  { id: 'atom-one-dark', label: 'Atom One Dark' },
  { id: 'vs2015', label: 'VS2015' },
  { id: 'dracula', label: 'Dracula' },
]

const PLATFORMS = [
  { id: 'wechat' as Platform, name: '微信公众号', icon: 'wechat', copyLabel: '复制到微信' },
  { id: 'xiaohongshu' as Platform, name: '小红书', icon: 'xiaohongshu', copyLabel: '复制到小红书' },
  { id: 'zhihu' as Platform, name: '知乎', icon: 'zhihu', copyLabel: '复制到知乎' },
] as const

const NATIVE_FORMAT_LABELS: Record<NativeExportResult['format'], string> = {
  html: 'HTML',
  text: '纯文本',
  markdown: 'Markdown',
}

const NATIVE_FILE_EXTENSIONS: Record<NativeExportResult['format'], string> = {
  html: 'html',
  text: 'txt',
  markdown: 'md',
}

const NATIVE_MIME_TYPES: Record<NativeExportResult['format'], string> = {
  html: 'text/html;charset=utf-8',
  text: 'text/plain;charset=utf-8',
  markdown: 'text/markdown;charset=utf-8',
}

type FeedbackKind = 'success' | 'error' | 'info'

interface OperationFeedback {
  kind: FeedbackKind
  message: string
}

interface PreflightRow {
  key: string
  label: string
  state: 'ready' | 'blocked' | 'warning'
  detail: string
}

// ─── Props / Emits ───────────────────────────────────────
const props = defineProps<{
  visible: boolean
  content: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// ─── Platform ────────────────────────────────────────────
const selectedPlatform = ref<Platform>('wechat')
const platformInfo = computed(() => PLATFORMS.find(p => p.id === selectedPlatform.value)!)

// ─── Presets (per-platform memory) ───────────────────────
interface PresetDisplay {
  id: string
  name: string
  icon: string
  description?: string
  primaryColor: string
}

const platformPresetIds = ref<Record<Platform, string>>({
  wechat: getDefaultPreset().id,
  xiaohongshu: 'xhs-fresh',
  zhihu: 'zhihu-academic',
})

const selectedPresetId = computed(() => platformPresetIds.value[selectedPlatform.value])

const currentPresets = computed((): PresetDisplay[] => {
  const presets = getPlatformPresets(selectedPlatform.value)
  return presets.map(p => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    primaryColor: p.primaryColor,
    description: 'description' in p ? (p as ExportPreset).description : undefined,
  }))
})

function selectPreset(id: string) {
  platformPresetIds.value[selectedPlatform.value] = id
}

// ─── Export Options ──────────────────────────────────────
const exportOptions = ref<ExportOptions>({
  enableCiteStatus: true,
  enableLineNumbers: false,
  enableReadingTime: true,
  enableCodeHighlight: true,
  enableAlertBlocks: true,
  enableEnhancedTable: true,
  enableMacCodeBlock: false,
  codeTheme: 'atom-one-dark',
  readingSpeed: 300,
})

// ─── Render State ────────────────────────────────────────
const previewHtml = ref('')
const qualityReport = ref<QualityReport | null>(null)
const wechatStats = ref<ExportStats | null>(null)
const nativeResult = ref<NativeExportResult | null>(null)
const renderErrorMessage = ref('')
const isRendering = ref(false)

const nativeFormatLabel = computed(() => {
  if (!nativeResult.value) return '平台原生格式'
  return NATIVE_FORMAT_LABELS[nativeResult.value.format]
})

const publishIntegrationStatus = computed(() => ({
  configured: false,
  detail: `${platformInfo.value.name} 尚未配置真实 API 授权；当前只提供可复制、可下载的真实导出产物。`,
}))

const preflightRows = computed<PreflightRow[]>(() => {
  const rows: PreflightRow[] = [
    {
      key: 'source',
      label: '权威 Markdown 输入',
      state: props.content?.trim() ? 'ready' : 'blocked',
      detail: props.content?.trim() ? '已从当前文稿读取真实内容' : '当前文稿为空，无法导出',
    },
    {
      key: 'render',
      label: '平台渲染产物',
      state: previewHtml.value && nativeResult.value ? 'ready' : renderErrorMessage.value ? 'blocked' : 'warning',
      detail: renderErrorMessage.value || (previewHtml.value && nativeResult.value ? '样式版与原生版均已生成' : '等待渲染完成'),
    },
    {
      key: 'quality',
      label: '发布质量检测',
      state: qualityReport.value?.passed ? 'ready' : qualityReport.value ? 'warning' : 'warning',
      detail: qualityReport.value
        ? `错误 ${qualityReport.value.stats.errors}，警告 ${qualityReport.value.stats.warnings}，建议 ${qualityReport.value.stats.suggestions}`
        : '等待质量检测结果',
    },
    {
      key: 'clipboard',
      label: '剪贴板权限',
      state: isClipboardWriteAvailable() ? 'ready' : 'warning',
      detail: isClipboardWriteAvailable()
        ? '浏览器提供剪贴板写入能力，最终仍受用户手势与权限控制'
        : '当前环境未暴露剪贴板写入能力，可改用下载文件',
    },
    {
      key: 'publish',
      label: '直连发布',
      state: publishIntegrationStatus.value.configured ? 'ready' : 'blocked',
      detail: publishIntegrationStatus.value.detail,
    },
  ]

  return rows
})

let renderVersion = 0

watch(
  [() => props.content, () => props.visible, selectedPlatform, selectedPresetId, exportOptions],
  async () => {
    if (!props.visible || !props.content?.trim()) {
      previewHtml.value = ''
      qualityReport.value = null
      wechatStats.value = null
      nativeResult.value = null
      renderErrorMessage.value = ''
      isRendering.value = false
      return
    }

    const thisVersion = ++renderVersion
    const platform = selectedPlatform.value
    const presetId = selectedPresetId.value

    isRendering.value = true
    renderErrorMessage.value = ''

    // Quality detection (synchronous)
    qualityReport.value = detectQuality(props.content, platform)

    try {
      if (platform === 'wechat') {
        const preset = themePresets.find(p => p.id === presetId) || getDefaultPreset()
        const parsedHtml = await marked.parse(props.content)
        if (renderVersion !== thisVersion) return
        const result = convertToWechatWithStats(parsedHtml, preset, exportOptions.value)
        if (renderVersion !== thisVersion) return
        previewHtml.value = result.html
        wechatStats.value = result.stats
      } else {
        const html = await convertToPlatform(props.content, platform, {
          presetId,
          exportOptions: exportOptions.value,
        })
        if (renderVersion !== thisVersion) return
        previewHtml.value = html
        wechatStats.value = null
      }

      const native = await convertToNativeFormat(props.content, platform, {
        presetId,
        exportOptions: exportOptions.value,
      })
      if (renderVersion !== thisVersion) return
      nativeResult.value = native
    } catch (error) {
      if (renderVersion !== thisVersion) return
      previewHtml.value = ''
      nativeResult.value = null
      wechatStats.value = null
      renderErrorMessage.value = error instanceof Error ? error.message : '导出渲染失败'
      showOperationFeedback('error', `导出渲染失败：${renderErrorMessage.value}`)
    } finally {
      if (renderVersion === thisVersion) {
        isRendering.value = false
      }
    }
  },
  { immediate: true, deep: true }
)

// ─── Copy ────────────────────────────────────────────────
const copySuccess = ref(false)
const nativeCopySuccess = ref(false)
const operationFeedback = ref<OperationFeedback | null>(null)

let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined
let nativeCopyFeedbackTimer: ReturnType<typeof setTimeout> | undefined
let operationFeedbackTimer: ReturnType<typeof setTimeout> | undefined

function showOperationFeedback(kind: FeedbackKind, message: string) {
  operationFeedback.value = { kind, message }
  clearTimeout(operationFeedbackTimer)
  operationFeedbackTimer = setTimeout(() => {
    operationFeedback.value = null
  }, FEEDBACK_DURATION + 1000)
}

function buildExportFilename(kind: 'styled' | 'native'): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')

  if (kind === 'native' && nativeResult.value) {
    const extension = NATIVE_FILE_EXTENSIONS[nativeResult.value.format]
    return `inkforge-${selectedPlatform.value}-native-${timestamp}.${extension}`
  }

  return `inkforge-${selectedPlatform.value}-styled-${timestamp}.html`
}

function downloadArtifact(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

async function handleCopy() {
  const content = previewHtml.value
  if (!content || isRendering.value) return

  showOperationFeedback('info', '正在写入剪贴板，请等待浏览器权限返回。')
  const success = await copyToClipboard(content)

  if (success) {
    copySuccess.value = true
    showOperationFeedback('success', `已复制 ${platformInfo.value.name} 样式版 HTML，可粘贴到平台编辑器。`)
    clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = setTimeout(() => { copySuccess.value = false }, FEEDBACK_DURATION)
  } else {
    showOperationFeedback('error', '复制失败：浏览器拒绝剪贴板写入，请使用下载文件或检查剪贴板权限。')
  }
}

async function handleCopyNative() {
  const result = nativeResult.value
  if (!result?.content || isRendering.value) return

  showOperationFeedback('info', `正在复制 ${platformInfo.value.name} ${NATIVE_FORMAT_LABELS[result.format]} 原生产物。`)
  const success = result.format === 'html'
    ? await copyToClipboard(result.content)
    : await copyTextToClipboard(result.content)

  if (success) {
    nativeCopySuccess.value = true
    showOperationFeedback('success', `已复制 ${platformInfo.value.name} ${NATIVE_FORMAT_LABELS[result.format]} 原生产物。`)
    clearTimeout(nativeCopyFeedbackTimer)
    nativeCopyFeedbackTimer = setTimeout(() => { nativeCopySuccess.value = false }, FEEDBACK_DURATION)
  } else {
    showOperationFeedback('error', '复制原生产物失败：当前浏览器或权限不允许写入剪贴板。')
  }
}

// ─── Download ────────────────────────────────────────────
function handleDownload() {
  const content = previewHtml.value
  if (!content || isRendering.value) return

  try {
    downloadArtifact(content, buildExportFilename('styled'), 'text/html;charset=utf-8')
    showOperationFeedback('success', '已生成样式版 HTML 下载文件。')
  } catch {
    showOperationFeedback('error', '下载失败：浏览器未能创建本地文件，请稍后重试。')
  }
}

function handleDownloadNative() {
  const result = nativeResult.value
  if (!result?.content || isRendering.value) return

  try {
    downloadArtifact(result.content, buildExportFilename('native'), NATIVE_MIME_TYPES[result.format])
    showOperationFeedback('success', `已生成 ${NATIVE_FORMAT_LABELS[result.format]} 原生下载文件。`)
  } catch {
    showOperationFeedback('error', '下载原生产物失败：浏览器未能创建本地文件，请稍后重试。')
  }
}

// ─── Quality Helpers ─────────────────────────────────────
function severityIcon(severity: QualityIssueSeverity): Component {
  switch (severity) {
    case 'error': return X
    case 'warning': return AlertCircle
    case 'suggestion': return Lightbulb
    default: {
      const _exhaustiveCheck: never = severity
      return _exhaustiveCheck
    }
  }
}

// ─── Keyboard ────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(() => props.visible, (visible) => {
  if (visible) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  clearTimeout(copyFeedbackTimer)
  clearTimeout(nativeCopyFeedbackTimer)
  clearTimeout(operationFeedbackTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="export-overlay"
      @click.self="emit('close')"
    >
      <div class="export-panel">
        <!-- ════ Header ════ -->
        <div class="export-header">
          <h2 class="export-title">
            导出文章
          </h2>
          <button
            class="header-close"
            title="关闭"
            @click="emit('close')"
          >
            <X :size="18" />
          </button>
        </div>

        <!-- ════ Body: Two Columns ════ -->
        <div class="export-body">
          <!-- ── Left: Control Area ── -->
          <div class="control-column">
            <div class="control-scroll">
              <!-- Platform Selection -->
              <div class="ctrl-section">
                <div class="platform-pills">
                  <button
                    v-for="p in PLATFORMS"
                    :key="p.id"
                    class="pill-btn"
                    :class="{ active: selectedPlatform === p.id }"
                    @click="selectedPlatform = p.id"
                  >
                    <component
                      :is="resolveExportIcon(p.icon, p.id)"
                      class="pill-icon"
                      :size="14"
                      :stroke-width="2"
                    />
                    <span class="pill-label">{{ p.name }}</span>
                  </button>
                </div>
              </div>

              <!-- Preset Theme Grid -->
              <div class="ctrl-section">
                <div class="section-label">
                  选择风格
                </div>
                <div class="preset-grid">
                  <button
                    v-for="preset in currentPresets"
                    :key="preset.id"
                    class="preset-card"
                    :class="{ active: selectedPresetId === preset.id }"
                    @click="selectPreset(preset.id)"
                  >
                    <component
                      :is="resolveExportIcon(preset.id || preset.icon, preset.id)"
                      class="preset-icon"
                      :size="16"
                      :stroke-width="2"
                    />
                    <span class="preset-name">{{ preset.name }}</span>
                    <span
                      class="preset-color-bar"
                      :style="{ backgroundColor: preset.primaryColor }"
                    />
                  </button>
                </div>
              </div>

              <!-- Export Options -->
              <div class="ctrl-section">
                <div class="section-label">
                  导出选项
                </div>

                <!-- Code Theme Dropdown -->
                <div class="option-row">
                  <label
                    class="option-label"
                    for="code-theme-select"
                  >代码主题</label>
                  <select
                    id="code-theme-select"
                    v-model="exportOptions.codeTheme"
                    class="option-select"
                  >
                    <option
                      v-for="theme in CODE_THEMES"
                      :key="theme.id"
                      :value="theme.id"
                    >
                      {{ theme.label }}
                    </option>
                  </select>
                </div>

                <!-- Toggle Options -->
                <div class="toggle-list">
                  <label class="toggle-item">
                    <input
                      v-model="exportOptions.enableMacCodeBlock"
                      type="checkbox"
                    >
                    <span class="toggle-text">Mac 窗口风格代码块</span>
                  </label>
                  <label class="toggle-item">
                    <input
                      v-model="exportOptions.enableLineNumbers"
                      type="checkbox"
                    >
                    <Hash
                      :size="13"
                      class="toggle-icon"
                    />
                    <span class="toggle-text">显示行号</span>
                  </label>
                  <label
                    v-if="selectedPlatform !== 'xiaohongshu'"
                    class="toggle-item"
                  >
                    <input
                      v-model="exportOptions.enableCiteStatus"
                      type="checkbox"
                    >
                    <Link2
                      :size="13"
                      class="toggle-icon"
                    />
                    <span class="toggle-text">外链转脚注</span>
                  </label>
                </div>
              </div>

              <!-- Quality Detection -->
              <div
                v-if="qualityReport"
                class="ctrl-section quality-area"
              >
                <div class="section-label">
                  质量检测
                </div>
                <div
                  class="quality-banner"
                  :class="qualityReport.passed ? 'quality-passed' : 'quality-failed'"
                >
                  <span>{{ qualityReport.passed ? '检测通过' : '发现问题' }}</span>
                  <div class="quality-counts">
                    <span
                      v-if="qualityReport.stats.errors"
                      class="qc-badge qc-error"
                    >
                      {{ qualityReport.stats.errors }} 错误
                    </span>
                    <span
                      v-if="qualityReport.stats.warnings"
                      class="qc-badge qc-warning"
                    >
                      {{ qualityReport.stats.warnings }} 警告
                    </span>
                    <span
                      v-if="qualityReport.stats.suggestions"
                      class="qc-badge qc-info"
                    >
                      {{ qualityReport.stats.suggestions }} 建议
                    </span>
                  </div>
                </div>
                <div
                  v-if="qualityReport.issues.length"
                  class="quality-list"
                >
                  <div
                    v-for="issue in qualityReport.issues"
                    :key="issue.id"
                    class="quality-item"
                    :class="issue.severity"
                  >
                    <component
                      :is="severityIcon(issue.severity)"
                      class="qi-icon"
                      :size="14"
                    />
                    <div class="qi-body">
                      <p class="qi-message">
                        {{ issue.message }}
                      </p>
                      <p
                        v-if="issue.suggestion"
                        class="qi-tip"
                      >
                        {{ issue.suggestion }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Export Preflight -->
              <div class="ctrl-section preflight-area">
                <div class="section-label">
                  导出预检
                </div>
                <div class="preflight-list">
                  <div
                    v-for="row in preflightRows"
                    :key="row.key"
                    class="preflight-row"
                    :class="`preflight-${row.state}`"
                  >
                    <span
                      class="preflight-dot"
                      aria-hidden="true"
                    />
                    <div class="preflight-copy">
                      <span class="preflight-label">{{ row.label }}</span>
                      <span class="preflight-detail">{{ row.detail }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Native Output -->
              <div class="ctrl-section native-area">
                <div class="section-label">
                  平台原生产物
                </div>
                <div
                  v-if="nativeResult"
                  class="native-card"
                >
                  <div class="native-card-main">
                    <span class="native-format">{{ nativeFormatLabel }}</span>
                    <span class="native-detail">
                      {{ platformInfo.name }} 推荐复制格式，{{ nativeResult.content.length }} 字符
                    </span>
                  </div>
                  <div class="native-actions">
                    <button
                      class="mini-action"
                      :class="{ success: nativeCopySuccess }"
                      :disabled="isRendering || !nativeResult.content"
                      @click="handleCopyNative"
                    >
                      {{ nativeCopySuccess ? '已复制' : '复制原生' }}
                    </button>
                    <button
                      class="mini-action"
                      :disabled="isRendering || !nativeResult.content"
                      @click="handleDownloadNative"
                    >
                      下载原生
                    </button>
                  </div>
                </div>
                <div
                  v-else
                  class="native-empty"
                >
                  原生产物会在真实渲染完成后生成。
                </div>
              </div>

              <div
                v-if="operationFeedback"
                class="ctrl-section feedback-area"
                :class="`feedback-${operationFeedback.kind}`"
                aria-live="polite"
              >
                {{ operationFeedback.message }}
              </div>

              <!-- WeChat Stats (when available) -->
              <div
                v-if="wechatStats && selectedPlatform === 'wechat'"
                class="ctrl-section"
              >
                <div class="section-label">
                  文章统计
                </div>
                <div class="stats-row">
                  <div class="stat-chip">
                    <span class="stat-num">{{ wechatStats.wordCount }}</span>
                    <span class="stat-unit">字数</span>
                  </div>
                  <div class="stat-chip">
                    <span class="stat-num">{{ wechatStats.readingTime }}</span>
                    <span class="stat-unit">分钟</span>
                  </div>
                  <div class="stat-chip">
                    <span class="stat-num">{{ wechatStats.codeBlockCount }}</span>
                    <span class="stat-unit">代码块</span>
                  </div>
                  <div class="stat-chip">
                    <span class="stat-num">{{ wechatStats.linkCount }}</span>
                    <span class="stat-unit">链接</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons (pinned to bottom) -->
            <div class="action-bar">
              <button
                class="act-btn act-secondary"
                :disabled="isRendering || !previewHtml"
                @click="handleDownload"
              >
                <Download :size="14" />
                <span>下载样式版</span>
              </button>
              <button
                class="act-btn act-primary"
                :class="{ 'act-success': copySuccess }"
                :disabled="isRendering || !previewHtml"
                @click="handleCopy"
              >
                <CheckCircle
                  v-if="copySuccess"
                  :size="14"
                />
                <Copy
                  v-else
                  :size="14"
                />
                <span>{{ copySuccess ? '已复制' : `${platformInfo.copyLabel}样式版` }}</span>
              </button>
            </div>
          </div>

          <!-- ── Right: Preview Area ── -->
          <div class="preview-column">
            <div class="preview-topbar">
              <span class="preview-topbar-label preview-topbar-title">
                <component
                  :is="resolveExportIcon(platformInfo.icon, platformInfo.id)"
                  class="preview-topbar-icon"
                  :size="14"
                  :stroke-width="2"
                />
                <span>{{ platformInfo.name }} 预览</span>
              </span>
            </div>
            <div class="preview-viewport">
              <!-- Loading Spinner -->
              <div
                v-if="isRendering"
                class="preview-loading"
              >
                <Loader2
                  :size="28"
                  class="spinner"
                />
                <span class="loading-text">渲染中...</span>
              </div>
              <!-- Empty State -->
              <div
                v-else-if="!previewHtml"
                class="preview-empty"
              >
                <AlertCircle
                  :size="32"
                  class="empty-icon"
                />
                <span class="empty-text">暂无内容可预览</span>
              </div>
              <!-- v-html Preview -->
              <div
                v-else
                class="preview-render"
                v-html="previewHtml"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   Ethereal Constructivism Design Language
   ═══════════════════════════════════════════════════════════ */

/* ── Overlay ── */
.export-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* ── Panel ── */
.export-panel {
  width: 92vw;
  max-width: 900px;
  max-height: 80vh;
  background: #FFFFFF;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.08);
}

/* ── Header ── */
.export-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #ECEFF1;
  flex-shrink: 0;
}

.export-title {
  font-size: 16px;
  font-weight: 600;
  color: #263238;
  margin: 0;
  letter-spacing: 0.2px;
}

.header-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #607D8B;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.header-close:hover {
  background: #ECEFF1;
  color: #263238;
}

/* ── Body (Two Columns) ── */
.export-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* ═══════════════════════════════════════════════════════════
   Left Column: Controls (400px)
   ═══════════════════════════════════════════════════════════ */
.control-column {
  width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ECEFF1;
  background: #FFFFFF;
}

.control-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
}

/* Section spacing */
.ctrl-section {
  padding: 16px 20px;
  border-bottom: 1px solid #ECEFF1;
}

.ctrl-section:last-child {
  border-bottom: none;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #607D8B;
  margin-bottom: 12px;
}

/* ── Platform Pills ── */
.platform-pills {
  display: flex;
  gap: 6px;
  background: #F5F5F5;
  border-radius: 8px;
  padding: 3px;
}

.pill-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #607D8B;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.pill-btn:hover {
  color: #263238;
  background: rgba(255, 255, 255, 0.6);
}

.pill-btn.active {
  background: #D32F2F;
  color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
}

.pill-icon {
  font-size: 13px;
}

.pill-label {
  font-size: 12px;
}

/* ── Preset Grid (2 columns) ── */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px 0;
  border: 1px solid #ECEFF1;
  border-radius: 12px;
  background: #FFFFFF;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  overflow: hidden;
}

.preset-card:hover {
  border-color: #D32F2F;
  background: #FFEBEE;
}

.pill-icon {
  flex-shrink: 0;
}

.preset-card.active {
  border-color: #D32F2F;
  background: #FFEBEE;
  box-shadow: 0 0 0 1px #D32F2F;
}

.preset-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #607D8B;
}

.preset-name {
  font-size: 12px;
  font-weight: 500;
  color: #263238;
  line-height: 1.3;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-color-bar {
  display: block;
  width: 100%;
  height: 4px;
  border-radius: 0 0 11px 11px;
  margin-top: 4px;
}

/* ── Export Options ── */
.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.option-label {
  font-size: 13px;
  color: #263238;
  font-weight: 500;
  white-space: nowrap;
}

.option-select {
  flex: 1;
  max-width: 180px;
  padding: 6px 10px;
  border: 1px solid #ECEFF1;
  border-radius: 8px;
  background: #FFFFFF;
  font-size: 12px;
  color: #263238;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease;
  appearance: auto;
}

.option-select:hover {
  border-color: #B0BEC5;
}

.option-select:focus {
  border-color: #D32F2F;
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #ECEFF1;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #263238;
  transition: all 0.15s ease;
  background: #FFFFFF;
}

.toggle-item:hover {
  border-color: #B0BEC5;
  background: #FAFAFA;
}

.toggle-item input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: #D32F2F;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle-icon {
  color: #607D8B;
  flex-shrink: 0;
}

.toggle-text {
  flex: 1;
  font-size: 13px;
}

/* ── Quality Detection ── */
.quality-area {
  /* no extra style needed */
}

.quality-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.quality-passed {
  background: rgba(46, 125, 50, 0.08);
  color: #2E7D32;
}

.quality-failed {
  background: rgba(245, 124, 0, 0.08);
  color: #F57C00;
}

.quality-counts {
  display: flex;
  gap: 6px;
}

.qc-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.qc-error {
  background: rgba(198, 40, 40, 0.1);
  color: #C62828;
}

.qc-warning {
  background: rgba(245, 124, 0, 0.1);
  color: #F57C00;
}

.qc-info {
  background: rgba(21, 101, 192, 0.1);
  color: #1565C0;
}

.quality-list {
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quality-item {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.quality-item.error {
  background: rgba(198, 40, 40, 0.04);
}

.quality-item.warning {
  background: rgba(245, 124, 0, 0.04);
}

.quality-item.suggestion {
  background: rgba(21, 101, 192, 0.04);
}

.qi-icon {
  flex-shrink: 0;
  font-size: 13px;
}

.qi-body {
  flex: 1;
  min-width: 0;
}

.qi-message {
  margin: 0;
  color: #263238;
  font-size: 12px;
}

.qi-tip {
  margin: 3px 0 0;
  color: #607D8B;
  font-size: 11px;
}

/* ── Export preflight ── */
.preflight-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preflight-row {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 9px 10px;
  border: 1px solid #ECEFF1;
  border-radius: 9px;
  background: #FAFBFC;
}

.preflight-dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: #90A4AE;
  flex-shrink: 0;
}

.preflight-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.preflight-label {
  font-size: 12px;
  font-weight: 700;
  color: #263238;
}

.preflight-detail {
  font-size: 11px;
  line-height: 1.45;
  color: #607D8B;
}

.preflight-ready .preflight-dot {
  background: #2E7D32;
}

.preflight-warning .preflight-dot {
  background: #F57C00;
}

.preflight-blocked .preflight-dot {
  background: #C62828;
}

/* ── Native output ── */
.native-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid #ECEFF1;
  border-radius: 10px;
  background: linear-gradient(135deg, #FFFFFF 0%, #FFF8F8 100%);
}

.native-card-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.native-format {
  font-size: 13px;
  font-weight: 800;
  color: #C62828;
}

.native-detail,
.native-empty {
  font-size: 12px;
  line-height: 1.5;
  color: #607D8B;
}

.native-actions {
  display: flex;
  gap: 8px;
}

.mini-action {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid #ECEFF1;
  border-radius: 7px;
  background: #FFFFFF;
  color: #263238;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.mini-action:hover:not(:disabled) {
  border-color: #D32F2F;
  color: #D32F2F;
}

.mini-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini-action.success {
  border-color: #2E7D32;
  background: #E8F5E9;
  color: #2E7D32;
}

.feedback-area {
  font-size: 12px;
  line-height: 1.5;
  font-weight: 600;
}

.feedback-success {
  background: #E8F5E9;
  color: #1B5E20;
}

.feedback-error {
  background: #FFEBEE;
  color: #B71C1C;
}

.feedback-info {
  background: #E3F2FD;
  color: #0D47A1;
}

/* ── Stats ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px;
  background: #FFEBEE;
  border-radius: 8px;
}

.stat-num {
  font-size: 18px;
  font-weight: 700;
  color: #D32F2F;
}

.stat-unit {
  font-size: 11px;
  color: #607D8B;
  margin-top: 2px;
}

/* ── Action Bar (pinned bottom) ── */
.action-bar {
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #ECEFF1;
  background: #FFFFFF;
}

.act-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.act-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.act-secondary {
  background: #FFFFFF;
  color: #263238;
  border: 1px solid #ECEFF1;
}

.act-secondary:hover:not(:disabled) {
  border-color: #B0BEC5;
  background: #FAFAFA;
}

.act-primary {
  background: #D32F2F;
  color: #FFFFFF;
}

.act-primary:hover:not(:disabled) {
  background: #C62828;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
}

.act-success {
  background: #2E7D32 !important;
}

.act-success:hover:not(:disabled) {
  background: #1B5E20 !important;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.3);
}

/* ═══════════════════════════════════════════════════════════
   Right Column: Preview
   ═══════════════════════════════════════════════════════════ */
.preview-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #F5F5F5;
  min-width: 0;
}

.preview-topbar {
  flex-shrink: 0;
  padding: 10px 20px;
  background: #FFFFFF;
  border-bottom: 1px solid #ECEFF1;
}

.preview-topbar-label {
  font-size: 12px;
  font-weight: 500;
  color: #607D8B;
  letter-spacing: 0.3px;
}

.preview-topbar-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.preview-topbar-icon {
  flex-shrink: 0;
}

.preview-viewport {
  flex: 1;
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
}

/* Loading */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 200px;
  color: #607D8B;
}

.spinner {
  animation: spin 1s linear infinite;
  color: #D32F2F;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 13px;
  color: #607D8B;
}

/* Empty State */
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 200px;
}

.empty-icon {
  color: #CFD8DC;
}

.empty-text {
  font-size: 13px;
  color: #607D8B;
}

/* v-html Preview Container */
.preview-render {
  background: #FFFFFF;
  border: 1px solid #ECEFF1;
  border-radius: 12px;
  padding: 24px;
  min-height: 200px;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.7;
  font-size: 15px;
  color: #263238;
}

/* Ensure nested content respects container */
.preview-render :deep(img) {
  max-width: 100%;
  height: auto;
}

.preview-render :deep(pre) {
  overflow-x: auto;
  max-width: 100%;
}

.preview-render :deep(table) {
  max-width: 100%;
  overflow-x: auto;
  display: block;
}

/* ═══════════════════════════════════════════════════════════
   Scrollbar Styling
   ═══════════════════════════════════════════════════════════ */
.control-scroll::-webkit-scrollbar,
.preview-viewport::-webkit-scrollbar,
.quality-list::-webkit-scrollbar {
  width: 4px;
}

.control-scroll::-webkit-scrollbar-track,
.preview-viewport::-webkit-scrollbar-track,
.quality-list::-webkit-scrollbar-track {
  background: transparent;
}

.control-scroll::-webkit-scrollbar-thumb,
.preview-viewport::-webkit-scrollbar-thumb,
.quality-list::-webkit-scrollbar-thumb {
  background: #CFD8DC;
  border-radius: 2px;
}

.control-scroll::-webkit-scrollbar-thumb:hover,
.preview-viewport::-webkit-scrollbar-thumb:hover,
.quality-list::-webkit-scrollbar-thumb:hover {
  background: #B0BEC5;
}
</style>
