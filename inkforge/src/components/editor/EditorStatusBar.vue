<!--
  EditorStatusBar.vue
  编辑器底部状态栏 — 实时统计字数、段落、阅读时间、可读性评分
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Editor } from '@tiptap/core'
import { useTextStats, type ReadabilityScore } from '@/composables/useTextStats'

const props = defineProps<{
    editor?: Editor
    /** 预览渲染耗时 (ms)，由 usePreviewRenderer 提供 */
    lastRenderTime?: number
}>()

// 使用 computed 包装 editor prop 为 Ref
const editorRef = computed(() => props.editor)

const { stats, readability, cursor } = useTextStats(editorRef)

// 详细统计弹窗
const showDetail = ref(false)

// 可读性等级颜色映射
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

// 格式化阅读时间
function formatReadingTime(minutes: number): string {
    if (minutes === 0) return '< 1 分钟'
    if (minutes < 60) return `${minutes} 分钟`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`
}
</script>

<template>
    <div class="status-bar">
        <!-- 左侧：核心统计 -->
        <div class="status-left" @click="showDetail = !showDetail">
            <span class="stat-item" title="字数（中文字符 + 英文单词）">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
                </svg>
                {{ stats.wordCount }} 字
            </span>

            <span class="stat-divider" />

            <span class="stat-item" title="段落数">
                {{ stats.paragraphCount }} 段
            </span>

            <span class="stat-divider" />

            <span class="stat-item" title="预计阅读时间">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                {{ formatReadingTime(stats.readingTime) }}
            </span>

            <span v-if="stats.imageCount > 0" class="stat-divider" />
            <span v-if="stats.imageCount > 0" class="stat-item" title="图片数量">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                </svg>
                {{ stats.imageCount }}
            </span>
        </div>

        <!-- 中间：可读性评分 -->
        <div class="status-center">
            <span
                class="readability-badge"
                :style="{ borderColor: gradeColor, color: gradeColor }"
                :title="`可读性评分: ${readability.score}/100`"
            >
                {{ readability.grade }}
            </span>
        </div>

        <!-- 右侧：渲染耗时 + 光标位置 -->
        <div class="status-right">
            <span v-if="lastRenderTime && lastRenderTime > 0" class="stat-item render-time" title="预览渲染耗时">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                渲染: {{ lastRenderTime }}ms
            </span>
            <span v-if="lastRenderTime && lastRenderTime > 0" class="stat-divider" />
            <span class="stat-item cursor-pos">
                行 {{ cursor.line }}:{{ cursor.column }}
            </span>
        </div>

        <!-- 详细统计弹窗 -->
        <Transition name="detail-fade">
            <div v-if="showDetail" class="detail-panel" @click.stop>
                <div class="detail-header">
                    <h4>详细统计</h4>
                    <button class="detail-close" @click="showDetail = false">&times;</button>
                </div>
                <div class="detail-grid">
                    <div class="detail-row">
                        <span class="detail-label">中文字数</span>
                        <span class="detail-value">{{ stats.chineseChars }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">英文单词</span>
                        <span class="detail-value">{{ stats.englishWords }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">标点符号</span>
                        <span class="detail-value">{{ stats.punctuationCount }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">句子数</span>
                        <span class="detail-value">{{ stats.sentenceCount }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">段落数</span>
                        <span class="detail-value">{{ stats.paragraphCount }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">标题数</span>
                        <span class="detail-value">{{ stats.headingCount }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">链接数</span>
                        <span class="detail-value">{{ stats.linkCount }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">图片数</span>
                        <span class="detail-value">{{ stats.imageCount }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">阅读时间</span>
                        <span class="detail-value">{{ formatReadingTime(stats.readingTime) }}</span>
                    </div>
                </div>

                <!-- 可读性详情 -->
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
                    <div v-if="readability.suggestions.length > 0" class="readability-suggestions">
                        <div
                            v-for="(suggestion, i) in readability.suggestions"
                            :key="i"
                            class="suggestion-item"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF9800" stroke-width="2">
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            {{ suggestion }}
                        </div>
                    </div>
                    <div v-else class="suggestion-item suggestion-ok">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2">
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
    height: 28px;
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
}

.status-left:hover {
    background: rgba(0, 0, 0, 0.04);
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
</style>
