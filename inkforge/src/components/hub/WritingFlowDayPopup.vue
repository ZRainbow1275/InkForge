<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type { Article } from '@/types'
import { computeContentWordCount } from '@/composables/useTextStats'
import { getArticleStatusClass, getArticleStatusLabel } from '@/core/lifecycle'

interface AnchorRect {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

const props = defineProps<{
  open: boolean
  dayLabel: string
  dateLabel: string
  articles: Article[]
  anchor?: AnchorRect | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-article', id: string): void
}>()

const POPUP_WIDTH = 320
const POPUP_GAP = 12
const VIEWPORT_PAD = 16

const popupStyle = computed<CSSProperties>(() => {
  if (!props.anchor) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  // 默认浮层放在 bar 右上方
  let left = props.anchor.right + POPUP_GAP
  let placement: 'right' | 'left' | 'above' = 'right'
  if (left + POPUP_WIDTH > vw - VIEWPORT_PAD) {
    // 右侧空间不够 → 放左侧
    left = props.anchor.left - POPUP_WIDTH - POPUP_GAP
    placement = 'left'
    if (left < VIEWPORT_PAD) {
      // 左右都不够 → 居中在 bar 上方
      left = Math.max(VIEWPORT_PAD, Math.min(vw - POPUP_WIDTH - VIEWPORT_PAD, props.anchor.left + props.anchor.width / 2 - POPUP_WIDTH / 2))
      placement = 'above'
    }
  }
  // 垂直对齐 bar 顶部上方一点
  let top: number
  if (placement === 'above') {
    top = Math.max(VIEWPORT_PAD, props.anchor.top - 12 - 380)
  } else {
    top = Math.max(VIEWPORT_PAD, Math.min(vh - 380 - VIEWPORT_PAD, props.anchor.top - 16))
  }
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${POPUP_WIDTH}px`,
  }
})

const caretStyle = computed<CSSProperties | null>(() => {
  if (!props.anchor) return null
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
  const placeRight = props.anchor.right + POPUP_GAP + POPUP_WIDTH <= vw - VIEWPORT_PAD
  if (placeRight) {
    return { left: '-6px', top: `${Math.max(20, props.anchor.top + props.anchor.height / 2 - (Math.max(VIEWPORT_PAD, Math.min((typeof window !== 'undefined' ? window.innerHeight : 900) - 380 - VIEWPORT_PAD, props.anchor.top - 16))) - 5)}px`, transform: 'rotate(45deg)' }
  }
  return { right: '-6px', top: `${Math.max(20, props.anchor.top + props.anchor.height / 2 - (Math.max(VIEWPORT_PAD, Math.min((typeof window !== 'undefined' ? window.innerHeight : 900) - 380 - VIEWPORT_PAD, props.anchor.top - 16))) - 5)}px`, transform: 'rotate(45deg)' }
})

const popoverRef = ref<HTMLElement | null>(null)

function handleClickOutside(event: MouseEvent): void {
  if (!props.open) return
  const target = event.target as Node | null
  if (!target) return
  if (popoverRef.value?.contains(target)) return
  // 不是点击 chart-bar（避免 toggle 二次触发）
  const bar = (target as Element).closest?.('.chart-bar')
  if (bar) return
  emit('close')
}

const totalWords = computed<number>(() =>
  props.articles.reduce((sum, article) => sum + computeContentWordCount(article.rawContent ?? ''), 0),
)

function getWords(article: Article): number {
  return computeContentWordCount(article.rawContent ?? '')
}

function formatTime(value: Date | string | number | null | undefined): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function handleEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) {
    emit('close')
  }
}

watch(() => props.open, value => {
  if (value) {
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
  } else {
    document.removeEventListener('keydown', handleEscape)
    document.removeEventListener('mousedown', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <Teleport to="body">
    <transition name="day-popup">
      <div
        v-if="props.open"
        ref="popoverRef"
        class="day-popup-card day-popup-floating"
        :class="{ 'day-popup-floating--centered': !props.anchor }"
        role="dialog"
        :aria-label="`${dayLabel} 的创作记录`"
        :style="popupStyle"
        @click.stop
      >
        <span
          v-if="caretStyle && props.anchor"
          class="day-popup-caret"
          :style="caretStyle"
          aria-hidden="true"
        />
        <header class="day-popup-head">
          <div class="day-popup-text">
            <p class="day-popup-kicker">
              {{ dateLabel }}
            </p>
            <h3>{{ dayLabel }} · {{ articles.length }} 篇</h3>
          </div>
          <button
            type="button"
            class="day-popup-close"
            aria-label="关闭"
            @click="emit('close')"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div
          v-if="articles.length > 0"
          class="day-popup-meta"
        >
          <span>{{ totalWords }} 字</span>
          <span>·</span>
          <span>{{ articles.length }} 篇文章</span>
        </div>

        <ul
          v-if="articles.length > 0"
          class="day-popup-list"
        >
          <li
            v-for="article in articles"
            :key="article.id"
          >
            <button
              type="button"
              class="day-popup-item"
              @click="emit('open-article', article.id)"
            >
              <span class="day-popup-item-title">{{ article.title || '未命名文稿' }}</span>
              <span class="day-popup-item-row">
                <span
                  class="day-popup-status"
                  :class="getArticleStatusClass(article.status)"
                >
                  {{ getArticleStatusLabel(article.status) }}
                </span>
                <span class="day-popup-time">{{ formatTime(article.updatedAt || article.createdAt) }}</span>
                <span class="day-popup-words">{{ getWords(article) }} 字</span>
              </span>
            </button>
          </li>
        </ul>

        <div
          v-else
          class="day-popup-empty"
        >
          今日尚无创作
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.day-popup-floating {
  position: fixed;
  z-index: 500;
}

.day-popup-floating--centered {
  position: fixed;
  max-width: 420px;
  width: 90vw;
}

.day-popup-card {
  max-height: min(70vh, 380px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px 14px;
  background: #FFFFFF;
  border: 1px solid rgba(207, 216, 220, 0.6);
  border-radius: 14px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 18px 48px rgba(38, 50, 56, 0.22),
    0 4px 12px rgba(38, 50, 56, 0.10);
}

.day-popup-caret {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #FFFFFF;
  border-left: 1px solid rgba(207, 216, 220, 0.6);
  border-bottom: 1px solid rgba(207, 216, 220, 0.6);
  border-radius: 0 0 0 3px;
  z-index: -1;
}

html.theme-dark .day-popup-card,
html[data-theme="dark"] .day-popup-card {
  background: #1A222D;
  border-color: rgba(255, 255, 255, 0.10);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.04) inset,
    0 18px 48px rgba(0, 0, 0, 0.55);
}

html.theme-dark .day-popup-caret,
html[data-theme="dark"] .day-popup-caret {
  background: #1A222D;
  border-left-color: rgba(255, 255, 255, 0.10);
  border-bottom-color: rgba(255, 255, 255, 0.10);
}

html.theme-dark .day-popup-text h3,
html[data-theme="dark"] .day-popup-text h3 { color: #ECEFF4; }

html.theme-dark .day-popup-kicker,
html[data-theme="dark"] .day-popup-kicker { color: #8590A0; }

html.theme-dark .day-popup-meta,
html[data-theme="dark"] .day-popup-meta { color: #B5BFCC; }

html.theme-dark .day-popup-item,
html[data-theme="dark"] .day-popup-item {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
}

html.theme-dark .day-popup-item:hover,
html[data-theme="dark"] .day-popup-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(239, 83, 80, 0.32);
}

html.theme-dark .day-popup-item-title,
html[data-theme="dark"] .day-popup-item-title { color: #ECEFF4; }

html.theme-dark .day-popup-item-row,
html[data-theme="dark"] .day-popup-item-row { color: #8590A0; }

html.theme-dark .day-popup-empty,
html[data-theme="dark"] .day-popup-empty {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.10);
  color: #8590A0;
}

html.theme-dark .day-popup-close,
html[data-theme="dark"] .day-popup-close { color: #8590A0; }

html.theme-dark .day-popup-close:hover,
html[data-theme="dark"] .day-popup-close:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ECEFF4;
}

.day-popup-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.day-popup-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.day-popup-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #90A4AE;
  text-transform: uppercase;
}

.day-popup-text h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #263238;
}

.day-popup-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #90A4AE;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  transition: background 0.15s ease, color 0.15s ease;
}

.day-popup-close:hover {
  background: #ECEFF1;
  color: #455A64;
}

.day-popup-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #607D8B;
  font-size: 12px;
}

.day-popup-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.day-popup-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid #ECEFF1;
  border-radius: 10px;
  background: #FAFBFC;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
}

.day-popup-item:hover {
  border-color: #FAD4D8;
  background: #FFFFFF;
  transform: translateY(-1px);
}

.day-popup-item:focus-visible {
  outline: 2px solid #D32F2F;
  outline-offset: 2px;
}

.day-popup-item-title {
  font-size: 14px;
  font-weight: 600;
  color: #263238;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.day-popup-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #607D8B;
}

.day-popup-status {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(96, 125, 139, 0.1);
  color: #455A64;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.day-popup-status.status-draft {
  background: rgba(245, 124, 0, 0.12);
  color: #C26100;
}

.day-popup-status.status-writing {
  background: rgba(21, 101, 192, 0.12);
  color: #0D47A1;
}

.day-popup-status.status-pending,
.day-popup-status.status-review {
  background: rgba(106, 27, 154, 0.12);
  color: #6A1B9A;
}

.day-popup-status.status-publish-ready,
.day-popup-status.status-ready {
  background: rgba(46, 125, 50, 0.12);
  color: #2E7D32;
}

.day-popup-status.status-published {
  background: rgba(46, 125, 50, 0.16);
  color: #1B5E20;
}

.day-popup-status.status-archived {
  background: rgba(96, 125, 139, 0.16);
  color: #37474F;
}

.day-popup-time,
.day-popup-words {
  white-space: nowrap;
}

.day-popup-empty {
  padding: 24px 16px;
  border-radius: 10px;
  background: #FAFBFC;
  border: 1px dashed #CFD8DC;
  text-align: center;
  color: #90A4AE;
  font-size: 13px;
}

.day-popup-enter-active,
.day-popup-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.day-popup-enter-from,
.day-popup-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .day-popup-enter-active,
  .day-popup-leave-active {
    transition: none;
  }
}
</style>
