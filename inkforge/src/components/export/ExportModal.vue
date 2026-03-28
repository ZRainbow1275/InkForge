<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { marked } from 'marked'
import {
  X, Copy, Download, CheckCircle,
  Hash, Link2, AlertCircle, Loader2
} from 'lucide-vue-next'
import {
  convertToPlatform, getPlatformPresets,
  convertToWechatWithStats, copyToClipboard, getDefaultPreset,
  detectQuality, themePresets
} from '@/services/export'
import type {
  Platform, ExportOptions, ExportStats,
  QualityReport, QualityIssueSeverity, CodeTheme
} from '@/services/export'
import type { ExportPreset } from '@/types'

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
  { id: 'wechat' as Platform, name: '微信公众号', icon: '\uD83D\uDCAC', copyLabel: '复制到微信' },
  { id: 'xiaohongshu' as Platform, name: '小红书', icon: '\uD83D\uDCD5', copyLabel: '复制到小红书' },
  { id: 'zhihu' as Platform, name: '知乎', icon: '\uD83D\uDD35', copyLabel: '复制到知乎' },
] as const

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
const isRendering = ref(false)

let renderVersion = 0

watch(
  [() => props.content, () => props.visible, selectedPlatform, selectedPresetId, exportOptions],
  async () => {
    if (!props.visible || !props.content?.trim()) {
      previewHtml.value = ''
      qualityReport.value = null
      wechatStats.value = null
      isRendering.value = false
      return
    }

    const thisVersion = ++renderVersion
    const platform = selectedPlatform.value
    const presetId = selectedPresetId.value

    isRendering.value = true

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

async function handleCopy() {
  const content = previewHtml.value
  if (!content || isRendering.value) return

  const success = await copyToClipboard(content)

  if (success) {
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, FEEDBACK_DURATION)
  }
}

// ─── Download ────────────────────────────────────────────
function handleDownload() {
  const content = previewHtml.value
  if (!content || isRendering.value) return

  try {
    const filename = `article-${selectedPlatform.value}.html`
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // fail silently
  }
}

// ─── Quality Helpers ─────────────────────────────────────
function severityIcon(severity: QualityIssueSeverity): string {
  switch (severity) {
    case 'error': return '\u274C'
    case 'warning': return '\u26A0\uFE0F'
    case 'suggestion': return '\uD83D\uDCA1'
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
                    <span class="pill-icon">{{ p.icon }}</span>
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
                    <span class="preset-icon">{{ preset.icon }}</span>
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
                    <span class="qi-icon">{{ severityIcon(issue.severity) }}</span>
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
                <span>下载HTML</span>
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
                <span>{{ copySuccess ? '已复制!' : platformInfo.copyLabel }}</span>
              </button>
            </div>
          </div>

          <!-- ── Right: Preview Area ── -->
          <div class="preview-column">
            <div class="preview-topbar">
              <span class="preview-topbar-label">
                {{ platformInfo.icon }} {{ platformInfo.name }} 预览
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

.preset-card.active {
  border-color: #D32F2F;
  background: #FFEBEE;
  box-shadow: 0 0 0 1px #D32F2F;
}

.preset-icon {
  font-size: 24px;
  line-height: 1;
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
