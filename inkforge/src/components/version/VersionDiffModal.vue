<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { X, Clock, FileText } from 'lucide-vue-next'
import type { DiffLine } from '@/composables/useVersionManager'
import { computeDiffSummary } from '@/composables/useVersionManager'
import type { Version } from '@/schemas/article'

// ═══════════════════════════════════════════════════════════════════
// Props & Emits
// ═══════════════════════════════════════════════════════════════════

const props = defineProps<{
    oldVersion: Version
    newVersion: Version
    diffLines: DiffLine[]
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

// ═══════════════════════════════════════════════════════════════════
// 计算属性
// ═══════════════════════════════════════════════════════════════════

const summary = computed(() => computeDiffSummary(props.diffLines))

const oldDate = computed(() => formatDate(new Date(props.oldVersion.createdAt)))
const newDate = computed(() => formatDate(new Date(props.newVersion.createdAt)))

// ═══════════════════════════════════════════════════════════════════
// 格式化
// ═══════════════════════════════════════════════════════════════════

function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
}

// ═══════════════════════════════════════════════════════════════════
// 键盘事件
// ═══════════════════════════════════════════════════════════════════

function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
        emit('close')
    }
}

// 绑定/解绑键盘事件
document.addEventListener('keydown', handleKeydown)

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="diff-overlay"
      @click.self="emit('close')"
    >
      <div
        class="diff-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-diff-title"
      >
        <!-- 头部 -->
        <div class="diff-header">
          <div class="diff-title-area">
            <FileText :size="18" />
            <h2
              id="version-diff-title"
              class="diff-title"
            >
              版本对比
              <span
                class="forge-line diff-title-line"
                aria-hidden="true"
              />
            </h2>
            <div class="diff-summary-badges">
              <span class="badge added">+{{ summary.addedCount }}</span>
              <span class="badge removed">-{{ summary.removedCount }}</span>
              <span class="badge unchanged">{{ summary.unchangedCount }} 行未变</span>
            </div>
          </div>
          <button
            type="button"
            class="close-btn"
            aria-label="关闭版本对比"
            title="关闭"
            @click="emit('close')"
          >
            <X :size="18" />
          </button>
        </div>

        <!-- 版本信息栏 -->
        <div class="diff-version-bar">
          <div class="diff-version-info old">
            <span class="version-label-tag">旧版本</span>
            <span class="version-label-name">{{ oldVersion.label }}</span>
            <span class="version-date">
              <Clock :size="11" />
              {{ oldDate }}
            </span>
          </div>
          <div class="diff-arrow">
            <svg
              width="20"
              height="12"
              viewBox="0 0 20 12"
            >
              <path
                d="M0 6h16M12 1l5 5-5 5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="diff-version-info new">
            <span class="version-label-tag">新版本</span>
            <span class="version-label-name">{{ newVersion.label }}</span>
            <span class="version-date">
              <Clock :size="11" />
              {{ newDate }}
            </span>
          </div>
        </div>

        <!-- Diff 内容 -->
        <div class="diff-content">
          <div class="diff-lines">
            <div
              v-for="(line, index) in diffLines"
              :key="index"
              class="diff-line"
              :class="line.type"
            >
              <span class="line-marker">
                <template v-if="line.type === 'added'">+</template>
                <template v-else-if="line.type === 'removed'">-</template>
                <template v-else>&nbsp;</template>
              </span>
              <span
                v-if="line.lineNumber !== undefined"
                class="line-number"
              >
                {{ line.lineNumber }}
              </span>
              <span class="line-content">{{ line.content || ' ' }}</span>
            </div>

            <!-- 无差异提示 -->
            <div
              v-if="diffLines.length === 0"
              class="no-diff"
            >
              两个版本内容完全相同
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div class="diff-footer">
          <div class="footer-stats">
            <span>共 {{ diffLines.length }} 行</span>
          </div>
          <button
            type="button"
            class="footer-close-btn"
            @click="emit('close')"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   VersionDiffModal — Ethereal Constructivism
   ═══════════════════════════════════════════════════════════════════ */

.diff-overlay {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  backdrop-filter: blur(6px);
  animation: fadeIn 200ms ease;
}

.diff-modal {
  width: 90vw;
  max-width: 800px;
  max-height: 85vh;
  background: var(--bg-surface, #FFFFFF);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--elev-3);
  animation: scaleIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ─── 头部 ─────────────────────────────────────────────── */

.diff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #E5E7EB);
  flex-shrink: 0;
}

.diff-title-area {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary, #263238);
}

.diff-title {
  position: relative;
  font-size: 16px;
  font-weight: 700;
}

.diff-title-line {
  position: absolute;
  left: 0;
  bottom: -7px;
}

.diff-summary-badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
}

.badge.added {
  background: var(--success-light);
  color: var(--success);
}

.badge.removed {
  background: var(--error-light);
  color: var(--error);
}

.badge.unchanged {
  background: var(--bg-rice-paper);
  color: var(--text-muted);
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
  color: var(--text-muted, #90A4AE);
  transition: all 150ms ease;
}

.close-btn:hover {
  background: var(--bg-rice-paper, #FAFBFC);
  color: var(--text-primary, #263238);
}

/* ─── 版本信息栏 ───────────────────────────────────────── */

.diff-version-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 20px;
  background: var(--bg-rice-paper, #FAFBFC);
  border-bottom: 1px solid var(--border, #E5E7EB);
  flex-shrink: 0;
}

.diff-version-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--bg-surface, #FFFFFF);
  border: 1px solid var(--border, #E5E7EB);
}

.diff-version-info.old {
  border-left: 3px solid var(--error, #C62828);
}

.diff-version-info.new {
  border-left: 3px solid var(--success, #2E7D32);
}

.version-label-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted, #90A4AE);
}

.version-label-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #263238);
}

.version-date {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--text-muted, #90A4AE);
}

.diff-arrow {
  color: var(--text-muted, #90A4AE);
  flex-shrink: 0;
}

/* ─── Diff 内容 ────────────────────────────────────────── */

.diff-content {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}

.diff-lines {
  font-family: var(--font-mono, 'JetBrains Mono', 'SF Mono', 'Consolas', monospace);
  font-size: 12px;
  line-height: 1.6;
}

.diff-line {
  display: flex;
  align-items: baseline;
  padding: 1px 16px 1px 0;
  border-left: 3px solid transparent;
  min-height: 22px;
  transition: background-color 100ms ease;
}

.diff-line.added {
  background: var(--success-light);
  border-left-color: var(--success);
}

.diff-line.removed {
  background: var(--error-light);
  border-left-color: var(--error);
}

.diff-line.unchanged {
  border-left-color: transparent;
}

.diff-line:hover {
  background: var(--bg-rice-paper);
}

.diff-line.added:hover {
  background: var(--success-light);
}

.diff-line.removed:hover {
  background: var(--error-light);
}

.line-marker {
  width: 20px;
  text-align: center;
  color: var(--text-muted, #90A4AE);
  flex-shrink: 0;
  font-weight: 700;
  user-select: none;
}

.diff-line.added .line-marker {
  color: var(--success, #2E7D32);
}

.diff-line.removed .line-marker {
  color: var(--error, #C62828);
}

.line-number {
  width: 36px;
  text-align: right;
  padding-right: 12px;
  color: var(--text-muted, #90A4AE);
  flex-shrink: 0;
  user-select: none;
  opacity: 0.6;
}

.line-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-primary, #263238);
}

.diff-line.removed .line-content {
  text-decoration: line-through;
  opacity: 0.7;
}

.no-diff {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-muted, #90A4AE);
  font-family: var(--font-sans, sans-serif);
  font-size: 14px;
}

/* ─── 底部 ─────────────────────────────────────────────── */

.diff-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid var(--border, #E5E7EB);
  flex-shrink: 0;
}

.footer-stats {
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
}

.footer-close-btn {
  padding: 7px 20px;
  border: 1px solid var(--border, #E5E7EB);
  border-radius: 8px;
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-secondary, #607D8B);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.footer-close-btn:hover {
  background: var(--bg-rice-paper, #FAFBFC);
  border-color: var(--text-muted, #90A4AE);
}

/* ═══════════════════════════════════════════════════════════════════
   动画
   ═══════════════════════════════════════════════════════════════════ */

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Reduced Motion
   ═══════════════════════════════════════════════════════════════════ */

@media (prefers-reduced-motion: reduce) {
  .diff-overlay,
  .diff-modal,
  .diff-line {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
