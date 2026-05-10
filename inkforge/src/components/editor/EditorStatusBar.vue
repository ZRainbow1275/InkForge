<!--
  EditorStatusBar.vue
  编辑器底部状态栏 — 实时统计字数、段落、阅读时间、可读性评分
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Editor } from '@tiptap/core'
import type { ArticleStatus } from '@/types'
import {
  type WritingGoalProgress,
  computeReadabilityScore,
  computeTextStats,
  useTextStats,
  type ReadabilityScore,
} from '@/composables/useTextStats'
import { Code2, Eye, FileText, Settings2, Target } from 'lucide-vue-next'
import { getArticleStatusClass, getArticleStatusLabel, isDraftBoxStatus } from '@/core/lifecycle'
import type { EditorMode } from '@/extensions/TyporaMode'

const props = defineProps<{
  editor?: Editor
  /** 预览渲染耗时 (ms)，由 usePreviewRenderer 提供 */
  lastRenderTime?: number
  editorMode: EditorMode
  articleStatus?: ArticleStatus | null
  fallbackMarkdown?: string
  fallbackHtml?: string
  writingGoal?: WritingGoalProgress
}>()

const emit = defineEmits<{
  (e: 'set-mode', value: EditorMode): void
  (e: 'open-editor-settings'): void
  (e: 'open-writing-goal'): void
  (e: 'open-document-status'): void
}>()

// 使用 computed 包装 editor prop 为 Ref
const editorRef = computed(() => props.editor)

const { stats, readability, cursor } = useTextStats(editorRef)
const fallbackStats = computed(() =>
  computeTextStats(props.fallbackMarkdown ?? '', props.fallbackHtml ?? ''),
)
const fallbackReadability = computed(() =>
  computeReadabilityScore(fallbackStats.value, props.fallbackMarkdown ?? ''),
)
const activeStats = computed(() => (props.editor ? stats.value : fallbackStats.value))
const activeReadability = computed(() => (props.editor ? readability.value : fallbackReadability.value))
const activeCursor = computed(() => (props.editor ? cursor.value : { line: 1, column: 1 }))
const showCursor = computed(() => Boolean(props.editor))

// 详细统计弹窗
const showDetail = ref(false)

function getStatusBarBadgeClass(status: ArticleStatus): string {
  const statusClass = getArticleStatusClass(status)
  if (statusClass === 'status-done') return 'status-processed'
  if (statusClass === 'status-draft') return 'status-draft'
  return statusClass
}

const documentStatusDisplay = computed(() => {
  const status = props.articleStatus
  if (!status) return null

  const label = getArticleStatusLabel(status)
  const target = isDraftBoxStatus(status) ? '草稿箱' : '首页'

  return {
    label,
    className: getStatusBarBadgeClass(status),
    title: `当前文稿状态：${label}，点击打开${target}`,
    ariaLabel: `当前文稿状态：${label}，点击打开${target}`,
  }
})

// 可读性等级颜色映射
const gradeColor = computed(() => {
  const colors: Record<ReadabilityScore['grade'], string> = {
    A: '#4CAF50',
    B: '#8BC34A',
    C: '#FF9800',
    D: '#FF5722',
    F: '#F44336',
  }
  return colors[activeReadability.value.grade]
})

// 格式化阅读时间
function formatReadingTime(minutes: number): string {
  if (minutes === 0) return '< 1 分钟'
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`
}

const modeTagDisplay = computed(() => {
  switch (props.editorMode) {
    case 'source':
      return { label: '源码', icon: Code2 }
    case 'preview':
      return { label: '预览', icon: Eye }
    default:
      return { label: 'Typora', icon: FileText }
  }
})

function clampPercent(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

function formatGoalCount(current: number, target: number): string {
  return `${current} / ${target} 字`
}

const writingGoalBadges = computed(() => {
  const goal = props.writingGoal
  if (!goal) {
    return []
  }

  const badges: Array<{
    key: 'document' | 'daily' | 'weekly'
    label: string
    current: number
    target: number
    percent: number
  }> = []

  if (goal.documentTarget) {
    badges.push({
      key: 'document',
      label: '文稿',
      current: goal.currentDocumentWords,
      target: goal.documentTarget,
      percent: clampPercent(goal.documentPercent),
    })
  }

  if (goal.dailyTarget) {
    badges.push({
      key: 'daily',
      label: '今日',
      current: goal.todayWords,
      target: goal.dailyTarget,
      percent: clampPercent(goal.dailyPercent),
    })
  } else if (goal.weeklyTarget) {
    badges.push({
      key: 'weekly',
      label: '本周',
      current: goal.weeklyWords,
      target: goal.weeklyTarget,
      percent: clampPercent(goal.weeklyPercent),
    })
  }

  return badges
})

const writingGoalDetails = computed(() => {
  const goal = props.writingGoal
  if (!goal) {
    return []
  }

  const details: Array<{
    key: 'document' | 'daily' | 'weekly'
    label: string
    current: number
    target: number
    percent: number
  }> = []

  if (goal.documentTarget) {
    details.push({
      key: 'document',
      label: '当前文稿',
      current: goal.currentDocumentWords,
      target: goal.documentTarget,
      percent: clampPercent(goal.documentPercent),
    })
  }

  if (goal.dailyTarget) {
    details.push({
      key: 'daily',
      label: '今日目标',
      current: goal.todayWords,
      target: goal.dailyTarget,
      percent: clampPercent(goal.dailyPercent),
    })
  }

  if (goal.weeklyTarget) {
    details.push({
      key: 'weekly',
      label: '本周目标',
      current: goal.weeklyWords,
      target: goal.weeklyTarget,
      percent: clampPercent(goal.weeklyPercent),
    })
  }

  return details
})
</script>

<template>
  <div class="status-bar">
    <!-- 左侧：核心统计 -->
    <div
      class="status-left"
      @click="showDetail = !showDetail"
    >
      <button
        v-if="documentStatusDisplay"
        type="button"
        class="document-status-badge"
        :class="documentStatusDisplay.className"
        :title="documentStatusDisplay.title"
        :aria-label="documentStatusDisplay.ariaLabel"
        @click.stop="emit('open-document-status')"
      >
        <span
          class="document-status-dot"
          aria-hidden="true"
        />
        <span>{{ documentStatusDisplay.label }}</span>
      </button>

      <span
        v-if="documentStatusDisplay"
        class="stat-divider"
      />
      <span
        class="stat-item"
        title="字数（中文字符 + 英文单词）"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
        </svg>
        {{ activeStats.wordCount }} 字
      </span>

      <span class="stat-divider" />

      <span
        class="stat-item"
        title="段落数"
      >
        {{ activeStats.paragraphCount }} 段
      </span>

      <span class="stat-divider" />

      <span
        class="stat-item"
        title="预计阅读时间"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
          /><path d="M12 6v6l4 2" />
        </svg>
        {{ formatReadingTime(activeStats.readingTime) }}
      </span>

      <span
        v-if="activeStats.imageCount > 0"
        class="stat-divider"
      />
      <span
        v-if="activeStats.imageCount > 0"
        class="stat-item"
        title="图片数量"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
          /><circle
            cx="8.5"
            cy="8.5"
            r="1.5"
          /><path d="m21 15-5-5L5 21" />
        </svg>
        {{ activeStats.imageCount }}
      </span>
    </div>

    <!-- 中间：可读性评分 -->
    <div class="status-center">
      <div
        v-if="writingGoalBadges.length > 0"
        class="goal-pill-group"
      >
        <button
          v-for="goal in writingGoalBadges"
          :key="goal.key"
          type="button"
          class="goal-pill"
          :title="`${goal.label}目标：${formatGoalCount(goal.current, goal.target)}`"
          @click.stop="emit('open-writing-goal')"
        >
          <Target :size="12" />
          <span class="goal-pill__label">{{ goal.label }}</span>
          <strong>{{ goal.percent }}%</strong>
        </button>
      </div>

      <span
        class="readability-badge"
        :style="{ borderColor: gradeColor, color: gradeColor }"
        :title="`可读性评分: ${activeReadability.score}/100`"
      >
        {{ activeReadability.grade }}
      </span>
    </div>

    <!-- 右侧：模式标签 + 同步/保存 + 渲染耗时 + 光标位置 -->
    <div class="status-right">
      <span
        class="mode-tag"
        :title="`当前模式：${modeTagDisplay.label} · Ctrl+\\ 切换`"
        :aria-label="`当前模式：${modeTagDisplay.label}`"
      >
        <component
          :is="modeTagDisplay.icon"
          :size="12"
        />
        <span>{{ modeTagDisplay.label }}</span>
      </span>

      <button
        type="button"
        class="status-icon-btn"
        title="打开编辑器设置"
        aria-label="打开编辑器设置"
        @click="emit('open-editor-settings')"
      >
        <Settings2 :size="13" />
      </button>

      <span
        v-if="lastRenderTime && lastRenderTime > 0"
        class="stat-divider"
      />
      <span
        v-if="lastRenderTime && lastRenderTime > 0"
        class="stat-item render-time"
        title="预览渲染耗时"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        渲染: {{ lastRenderTime }}ms
      </span>
      <span
        v-if="showCursor"
        class="stat-divider"
      />
      <span
        v-if="showCursor"
        class="stat-item cursor-pos"
      >
        行 {{ activeCursor.line }}:{{ activeCursor.column }}
      </span>
    </div>

    <!-- 详细统计弹窗 -->
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
            @click="showDetail = false"
          >
            &times;
          </button>
        </div>
        <div class="detail-grid">
          <div class="detail-row">
            <span class="detail-label">中文字数</span>
            <span class="detail-value">{{ activeStats.chineseChars }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">英文单词</span>
            <span class="detail-value">{{ activeStats.englishWords }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">标点符号</span>
            <span class="detail-value">{{ activeStats.punctuationCount }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">句子数</span>
            <span class="detail-value">{{ activeStats.sentenceCount }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">段落数</span>
            <span class="detail-value">{{ activeStats.paragraphCount }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">标题数</span>
            <span class="detail-value">{{ activeStats.headingCount }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">链接数</span>
            <span class="detail-value">{{ activeStats.linkCount }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">图片数</span>
            <span class="detail-value">{{ activeStats.imageCount }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">阅读时间</span>
            <span class="detail-value">{{ formatReadingTime(activeStats.readingTime) }}</span>
          </div>
        </div>

        <!-- 可读性详情 -->
        <div
          v-if="writingGoalDetails.length > 0"
          class="goal-detail-section"
        >
          <div class="goal-detail-header">
            <span>写作目标</span>
            <button
              type="button"
              class="goal-detail-link"
              @click="emit('open-writing-goal')"
            >
              调整
            </button>
          </div>
          <div class="goal-detail-list">
            <div
              v-for="goal in writingGoalDetails"
              :key="goal.key"
              class="goal-detail-row"
            >
              <div class="goal-detail-copy">
                <span class="detail-label">{{ goal.label }}</span>
                <strong class="detail-value">{{ formatGoalCount(goal.current, goal.target) }}</strong>
              </div>
              <span class="goal-detail-percent">{{ goal.percent }}%</span>
            </div>
          </div>
        </div>

        <div class="readability-section">
          <div class="readability-header">
            <span>可读性评分</span>
            <span
              class="readability-score"
              :style="{ color: gradeColor }"
            >
              {{ activeReadability.score }} / 100
            </span>
          </div>
          <div
            v-if="activeReadability.suggestions.length > 0"
            class="readability-suggestions"
          >
            <div
              v-for="(suggestion, i) in activeReadability.suggestions"
              :key="i"
              class="suggestion-item"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FF9800"
                stroke-width="2"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line
                  x1="12"
                  y1="9"
                  x2="12"
                  y2="13"
                /><line
                  x1="12"
                  y1="17"
                  x2="12.01"
                  y2="17"
                />
              </svg>
              {{ suggestion }}
            </div>
          </div>
          <div
            v-else
            class="suggestion-item suggestion-ok"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4CAF50"
              stroke-width="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
            </svg>
            文章结构良好
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    height: 32px;
    padding: 0 12px;
    background: var(--color-surface, #FAFBFC);
    border-top: 1px solid var(--color-border, #E5E7EB);
    font-size: 12px;
    color: var(--color-text-tertiary, #9CA3AF);
    user-select: none;
    position: relative;
    flex-shrink: 0;
}

.status-left {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    transition: background 0.15s;
    flex: 0 0 auto;
}

.status-left:hover {
    background: rgba(0, 0, 0, 0.04);
}

.document-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 22px;
    padding: 0 10px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.82);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.document-status-badge:hover {
    transform: translateY(-1px);
}

.document-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
}

.document-status-badge.status-draft {
    background: rgba(53, 82, 65, 0.12);
    color: #355241;
    border-color: rgba(53, 82, 65, 0.18);
}

.document-status-badge.status-new {
    background: rgba(251, 192, 45, 0.16);
    color: #8D6E00;
    border-color: rgba(251, 192, 45, 0.26);
}

.document-status-badge.status-read {
    background: rgba(123, 31, 162, 0.12);
    color: #7B1FA2;
    border-color: rgba(123, 31, 162, 0.22);
}

.document-status-badge.status-processed {
    background: rgba(46, 125, 50, 0.12);
    color: #2E7D32;
    border-color: rgba(46, 125, 50, 0.22);
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
}

.stat-divider {
    width: 1px;
    height: 12px;
    background: var(--color-border, #E5E7EB);
}

.status-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.goal-pill-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.goal-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 22px;
    padding: 0 10px;
    border: 1px solid rgba(198, 40, 40, 0.18);
    border-radius: 999px;
    background: rgba(255, 235, 238, 0.92);
    color: #C62828;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.goal-pill:hover {
    border-color: rgba(198, 40, 40, 0.32);
    background: rgba(255, 235, 238, 1);
    transform: translateY(-1px);
}

.goal-pill__label {
    white-space: nowrap;
}

.readability-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: 1.5px solid;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
}

.status-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.mode-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 22px;
    padding: 0 10px;
    border: 1px solid var(--color-border, #E5E7EB);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
    color: var(--color-text-secondary, #546E7A);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    user-select: none;
}

.width-control {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px;
    border: 1px solid var(--color-border, #E5E7EB);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
}

.width-btn,
.status-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--color-text-tertiary, #78909C);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
}

.width-btn:hover,
.status-icon-btn:hover {
    background: rgba(255, 235, 238, 0.92);
    color: #C62828;
}

.width-label {
    min-width: 48px;
    padding: 0 6px;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
    color: var(--color-text-secondary, #546E7A);
    white-space: nowrap;
}

.cursor-pos {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    letter-spacing: 0.5px;
}

.render-time {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: var(--color-text-quaternary, #B0B7C3);
}

.save-status {
    color: var(--color-text-secondary, #607D8B);
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.sync-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.03);
}

.sync-dot.sync-syncing {
    background: #F57C00;
}

.sync-dot.sync-synced {
    background: #2E7D32;
}

.sync-dot.sync-offline {
    background: #90A4AE;
}

/* 详细统计弹窗 */
.detail-panel {
    position: absolute;
    bottom: 32px;
    left: 12px;
    width: 280px;
    background: #FFFFFF;
    border: 1px solid var(--color-border, #E5E7EB);
    border-radius: 8px;
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
    color: var(--color-text-primary, #1F2937);
}

.detail-close {
    border: none;
    background: none;
    font-size: 18px;
    color: var(--color-text-tertiary, #9CA3AF);
    cursor: pointer;
    padding: 0;
    line-height: 1;
}

.detail-close:hover {
    color: var(--color-text-primary, #1F2937);
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
    padding: 3px 0;
}

.detail-label {
    font-size: 12px;
    color: var(--color-text-tertiary, #9CA3AF);
}

.detail-value {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-primary, #1F2937);
    font-family: 'SF Mono', 'Fira Code', monospace;
}

.goal-detail-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border, #E5E7EB);
}

.goal-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--color-text-tertiary, #9CA3AF);
}

.goal-detail-link {
    border: none;
    background: none;
    color: #C62828;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
}

.goal-detail-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.goal-detail-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.goal-detail-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.goal-detail-percent {
    font-size: 12px;
    font-weight: 700;
    color: #C62828;
}

.readability-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border, #E5E7EB);
}

.readability-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--color-text-tertiary, #9CA3AF);
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
    color: var(--color-text-secondary, #6B7280);
    line-height: 1.5;
}

.suggestion-item svg {
    flex-shrink: 0;
    margin-top: 2px;
}

.suggestion-ok {
    color: #4CAF50;
}

/* 过渡动画 */
.detail-fade-enter-active,
.detail-fade-leave-active {
    transition: all 0.2s ease;
}

.detail-fade-enter-from,
.detail-fade-leave-to {
    opacity: 0;
    transform: translateY(8px);
}

/* P2-09 status bar overflow polish */
.status-bar,
.status-left,
.status-center,
.status-right {
    min-width: 0;
}

.status-bar {
    overflow: hidden;
}

.status-left {
    flex: 0 0 auto;
    overflow: hidden;
}

.status-center {
    flex: 0 1 auto;
    max-width: 42%;
    overflow: hidden;
}

.status-right {
    flex: 0 0 auto;
    justify-content: flex-end;
    overflow: hidden;
}

.stat-item,
.goal-pill__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

@media (max-width: 980px) {
    .render-time,
    .cursor-pos,
    .status-right > .stat-divider:nth-last-of-type(-n + 2) {
        display: none;
    }

    .mode-tag span {
        display: none;
    }
}

@media (max-width: 720px) {
    .status-center,
    .status-icon-btn {
        display: none;
    }

    .status-left {
        max-width: 100%;
    }
}

html.theme-dark .status-bar,
html[data-theme="dark"] .status-bar {
    background: var(--bg-surface-elevated);
    border-top-color: var(--border);
    color: var(--text-muted);
}

html.theme-dark .mode-tag,
html.theme-dark .width-control,
html.theme-dark .document-status-badge,
html.theme-dark .detail-panel,
html[data-theme="dark"] .mode-tag,
html[data-theme="dark"] .width-control,
html[data-theme="dark"] .document-status-badge,
html[data-theme="dark"] .detail-panel {
    background: var(--bg-elevated);
    border-color: var(--border);
}

</style>
