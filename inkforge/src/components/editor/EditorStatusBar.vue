<!--
  EditorStatusBar.vue
  编辑器底部状态栏 -- 左|中|右 三栏布局
  左: 字数 + 段落 + 阅读时间
  中: 可读性评分 + 写作目标
  右: 编辑模式 + 同步状态 + 保存状态 + 行列
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Editor } from '@tiptap/core'
import { storeToRefs } from 'pinia'
import { AlertTriangle, Check, LayoutPanelTop, X } from 'lucide-vue-next'
import { useTextStats, type ReadabilityScore } from '@/composables/useTextStats'
import { useSettingsStore } from '@/stores/settings'
import { useSyncStore } from '@/stores/sync'

interface ArticleMeta {
    createdAt: Date
    updatedAt: Date
    versionCount: number
    documentId?: string
}

const props = defineProps<{
    editor?: Editor
    lastRenderTime?: number
    articleMeta?: ArticleMeta
    editorMode?: 'typora' | 'source'
    saveStatus?: string
}>()

const emit = defineEmits<{
    (e: 'toggle-mode'): void
}>()

const settingsStore = useSettingsStore()
const syncStore = useSyncStore()
const { status: syncStatus, pendingCount, lastSyncAt, statusText: syncStatusText, hasConflicts, lastError } = storeToRefs(syncStore)
const editorRef = computed(() => props.editor)
const { stats, readability, cursor } = useTextStats(editorRef)
const showDetail = ref(false)

const CHINESE_CHAR_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g
const ENGLISH_WORD_RE = /[a-zA-Z]+(?:[''][a-zA-Z]+)*/g

const selectionWordCount = computed(() => {
    const editor = props.editor
    if (!editor) {
        return 0
    }

    const { from, to } = editor.state.selection
    if (from === to) {
        return 0
    }

    const selectionText = editor.state.doc.textBetween(from, to, '\n', '\n').trim()
    if (!selectionText) {
        return 0
    }

    const chineseCount = selectionText.match(CHINESE_CHAR_RE)?.length ?? 0
    const englishCount = selectionText.match(ENGLISH_WORD_RE)?.length ?? 0
    return chineseCount + englishCount
})

const gradeColor = computed(() => {
    const colors: Record<ReadabilityScore['grade'], string> = {
        A: '#4CAF50',
        B: '#8BC34A',
        C: '#FF9800',
        D: '#FF5722',
        F: '#F44336',
    }

    return colors[readability.value.grade]
})

const writingGoalSettings = computed(() => settingsStore.settings.editor.writingGoal)
const currentEditorMode = computed(() => props.editorMode ?? settingsStore.settings.editor.editorMode)
const editorModeLabel = computed(() => currentEditorMode.value === 'source' ? '源码双栏' : 'Typora')
const saveStatusLabel = computed(() => props.saveStatus ?? '已同步')
const syncStatusLabel = computed(() => {
    switch (syncStatus.value) {
        case 'syncing':
            return '同步中'
        case 'conflict':
            return '有冲突'
        case 'error':
            return '同步异常'
        case 'offline':
            return pendingCount.value > 0 ? `离线 ${pendingCount.value}` : '离线'
        case 'idle':
        default:
            return pendingCount.value > 0 ? `待同步 ${pendingCount.value}` : '已同步'
    }
})
const syncStatusTone = computed(() => {
    switch (syncStatus.value) {
        case 'syncing':
            return 'sync-status--syncing'
        case 'conflict':
            return 'sync-status--conflict'
        case 'error':
            return 'sync-status--error'
        case 'offline':
            return 'sync-status--offline'
        case 'idle':
        default:
            return pendingCount.value > 0 ? 'sync-status--pending' : 'sync-status--idle'
    }
})
const syncStatusTitle = computed(() => {
    const segments = [syncStatusText.value]

    if (lastSyncAt.value) {
        segments.push(`最后同步：${formatDateTime(lastSyncAt.value)}`)
    }

    if (hasConflicts.value) {
        segments.push(`冲突数：${syncStore.conflictCount}`)
    }

    if (lastError.value) {
        segments.push(`错误：${lastError.value}`)
    }

    return segments.join(' | ')
})
const writingGoalCompleted = computed(() => {
    const targetWords = writingGoalSettings.value.targetWords
    return targetWords > 0 && stats.value.wordCount >= targetWords
})

const detailRows = computed(() => {
    const rows = [
        { label: '中文字数', value: String(stats.value.chineseChars) },
        { label: '英文单词', value: String(stats.value.englishWords) },
        { label: '标点符号', value: String(stats.value.punctuationCount) },
        { label: '句子数', value: String(stats.value.sentenceCount) },
        { label: '段落数', value: String(stats.value.paragraphCount) },
        { label: '标题数', value: String(stats.value.headingCount) },
        { label: '链接数', value: String(stats.value.linkCount) },
        { label: '图片数', value: String(stats.value.imageCount) },
        { label: '阅读时间', value: formatReadingTime(stats.value.readingTime) },
        { label: '选区字数', value: String(selectionWordCount.value) },
        { label: '版本计数', value: String(props.articleMeta?.versionCount ?? 0) },
    ]

    if (props.articleMeta) {
        rows.push(
            { label: '创建时间', value: formatDateTime(props.articleMeta.createdAt) },
            { label: '最后修改', value: formatDateTime(props.articleMeta.updatedAt) },
            { label: '文档 ID', value: props.articleMeta.documentId ?? '未关联' },
        )
    }

    return rows
})

function formatReadingTime(minutes: number): string {
    if (minutes === 0) return '< 1 分钟'
    if (minutes < 60) return `${minutes} 分钟`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`
}

function formatDateTime(value: Date): string {
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
}

function handleToggleMode(): void {
    emit('toggle-mode')
}
</script>

<template>
  <div class="editor-status-bar">
    <!-- 左侧: 字数 + 段落 + 阅读时间 -->
    <div
      class="status-group"
      title="点击查看详细统计"
      @click="showDetail = !showDetail"
    >
      <span class="status-item">{{ stats.wordCount }} 字</span>
      <span class="status-sep" />
      <span class="status-item status-item--paragraphs">{{ stats.paragraphCount }} 段</span>
      <span class="status-sep status-sep--reading" />
      <span class="status-item status-item--reading">{{ formatReadingTime(stats.readingTime) }}</span>

      <template v-if="selectionWordCount > 0">
        <span class="status-sep status-sep--selection" />
        <span
          class="status-item status-item--selection"
          title="当前选区字数"
        >
          选区 {{ selectionWordCount }}
        </span>
      </template>
    </div>

    <!-- 中部: 可读性评分 + 写作目标 -->
    <div class="status-group status-group--center">
      <span
        class="status-item"
        :style="{ color: gradeColor }"
        :title="`可读性评分: ${readability.score}/100`"
      >
        可读性 {{ readability.score }}
      </span>

      <template v-if="writingGoalSettings.enabled && writingGoalSettings.targetWords > 0">
        <span class="status-sep" />
        <span
          class="status-item status-item--goal"
          :class="{ 'status-item--goal-done': writingGoalCompleted }"
          :title="`写作目标: ${stats.wordCount} / ${writingGoalSettings.targetWords}`"
        >
          {{ stats.wordCount }} / {{ writingGoalSettings.targetWords }}
        </span>
      </template>
    </div>

    <!-- 右侧: 编辑模式 + 同步 + 保存 + 行列 -->
    <div class="status-group">
      <button
        class="status-mode-btn"
        type="button"
        :title="`当前模式：${editorModeLabel}`"
        @click="handleToggleMode"
      >
        <LayoutPanelTop :size="14" />
        {{ editorModeLabel }}
      </button>

      <span class="status-sep status-sep--sync" />

      <span
        class="sync-badge"
        :class="syncStatusTone"
        :title="syncStatusTitle"
      >
        {{ syncStatusLabel }}
      </span>

      <span class="status-sep status-sep--save" />

      <span
        class="status-item status-item--save"
        :title="`保存状态：${saveStatusLabel}`"
      >
        {{ saveStatusLabel }}
      </span>

      <span class="status-sep status-sep--cursor" />

      <span class="status-item status-item--cursor">
        行 {{ cursor.line }}:{{ cursor.column }}
      </span>
    </div>

    <!-- 详细统计弹出面板 -->
    <Transition name="detail-fade">
      <div
        v-if="showDetail"
        class="detail-panel"
        @click.stop
      >
        <div class="detail-header">
          <h4>详细统计</h4>
          <button
            class="detail-close"
            type="button"
            title="关闭统计面板"
            @click="showDetail = false"
          >
            <X :size="14" />
          </button>
        </div>

        <div class="detail-grid">
          <div
            v-for="row in detailRows"
            :key="row.label"
            class="detail-row"
          >
            <span class="detail-label">{{ row.label }}</span>
            <span
              class="detail-value"
              :title="row.value"
            >{{ row.value }}</span>
          </div>
        </div>

        <div class="readability-section">
          <div class="readability-header">
            <span>可读性评分</span>
            <span
              class="readability-score"
              :style="{ color: gradeColor }"
            >
              {{ readability.score }} / 100
            </span>
          </div>

          <div
            v-if="readability.suggestions.length > 0"
            class="readability-suggestions"
          >
            <div
              v-for="(suggestion, index) in readability.suggestions"
              :key="index"
              class="suggestion-item"
            >
              <AlertTriangle
                :size="12"
                class="suggestion-icon warning"
              />
              {{ suggestion }}
            </div>
          </div>

          <div
            v-else
            class="suggestion-item suggestion-ok"
          >
            <Check
              :size="12"
              class="suggestion-icon success"
            />
            文章结构良好
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ===== 状态栏主容器 ===== */
.editor-status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    padding: 0 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 12px;
    color: #475569;
    background: white;
    user-select: none;
    position: relative;
    flex-shrink: 0;
}

/* ===== 状态组 ===== */
.status-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.status-group--center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
}

/* 左侧组可点击 */
.status-group:first-child {
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    transition: background 0.15s ease;
}

.status-group:first-child:hover {
    background: rgba(0, 0, 0, 0.04);
}

/* ===== 状态项 ===== */
.status-item {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    color: #64748b;
}

/* ===== 竖线分隔符 ===== */
.status-sep {
    width: 1px;
    height: 14px;
    background: #e2e8f0;
    flex-shrink: 0;
}

/* ===== 写作目标 (紧凑数字) ===== */
.status-item--goal {
    font-variant-numeric: tabular-nums;
}

.status-item--goal-done {
    color: #2E7D32;
    font-weight: 600;
}

/* ===== 编辑模式按钮 ===== */
.status-mode-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 22px;
    padding: 4px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
    color: #64748b;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    line-height: 1;
}

.status-mode-btn:hover {
    background: rgba(0, 0, 0, 0.04);
    border-color: #cbd5e1;
}

/* ===== 行列位置 ===== */
.status-item--cursor {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: #94a3b8;
}

/* ===== 同步状态 badge ===== */
.sync-badge {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    border: 1px solid transparent;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
}

.sync-status--idle {
    color: #2E7D32;
    background: rgba(46, 125, 50, 0.08);
    border-color: rgba(46, 125, 50, 0.16);
}

.sync-status--pending {
    color: #B26A00;
    background: rgba(255, 152, 0, 0.08);
    border-color: rgba(255, 152, 0, 0.18);
}

.sync-status--syncing {
    color: #1565C0;
    background: rgba(21, 101, 192, 0.08);
    border-color: rgba(21, 101, 192, 0.18);
}

.sync-status--conflict,
.sync-status--error {
    color: #C62828;
    background: rgba(198, 40, 40, 0.08);
    border-color: rgba(198, 40, 40, 0.18);
}

.sync-status--offline {
    color: #546E7A;
    background: rgba(84, 110, 122, 0.08);
    border-color: rgba(84, 110, 122, 0.18);
}

/* ===== 保存状态 ===== */
.status-item--save {
    color: #94a3b8;
}

/* ===== 详细统计弹出面板 ===== */
.detail-panel {
    position: absolute;
    bottom: 36px;
    left: 12px;
    width: 320px;
    max-width: calc(100vw - 24px);
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 16px;
    z-index: 100;
}

.detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.detail-header h4 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
}

.detail-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
}

.detail-close:hover {
    background: rgba(0, 0, 0, 0.04);
    color: #1e293b;
}

.detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
}

.detail-label {
    font-size: 12px;
    color: #94a3b8;
}

.detail-value {
    max-width: 124px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 600;
    color: #1e293b;
    font-family: 'SF Mono', 'Fira Code', monospace;
    text-align: right;
}

.readability-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
}

.readability-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
    color: #94a3b8;
}

.readability-score {
    font-weight: 700;
    font-size: 13px;
}

.readability-suggestions {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.suggestion-item {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 11px;
    color: #64748b;
    line-height: 1.5;
}

.suggestion-icon {
    flex-shrink: 0;
    margin-top: 2px;
}

.suggestion-icon.warning {
    color: #FF9800;
}

.suggestion-icon.success {
    color: #4CAF50;
}

.suggestion-ok {
    color: #4CAF50;
}

/* ===== 面板过渡动画 ===== */
.detail-fade-enter-active,
.detail-fade-leave-active {
    transition: all 0.2s ease;
}

.detail-fade-enter-from,
.detail-fade-leave-to {
    opacity: 0;
    transform: translateY(8px);
}

/* ===== 响应式: 1180px 以下隐藏行列 ===== */
@media (max-width: 1180px) {
    .status-item--cursor,
    .status-sep--cursor {
        display: none;
    }
}

/* ===== 响应式: 900px 以下隐藏中部 + 选区 ===== */
@media (max-width: 900px) {
    .status-group--center,
    .status-item--selection,
    .status-sep--selection {
        display: none;
    }
}

/* ===== 响应式: 768px 以下极简模式 ===== */
@media (max-width: 768px) {
    .editor-status-bar {
        padding: 0 8px;
        gap: 8px;
    }

    .status-group {
        min-width: 0;
        gap: 6px;
    }

    .status-group:last-child {
        margin-left: auto;
    }

    .status-mode-btn,
    .status-item--save,
    .status-sep--save,
    .status-item--reading,
    .status-sep--reading {
        display: none;
    }

    .sync-badge {
        max-width: 86px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
</style>
