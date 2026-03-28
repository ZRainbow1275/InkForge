<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ArrowLeftRight, Copy, FileText, X } from 'lucide-vue-next'
import type { Version } from '@/schemas/article'
import { computeDiff } from '@/composables/useVersionManager'
import { computeChunkedDiff, toUnifiedDiff } from '@/utils/diff'
import DiffViewer from './DiffViewer.vue'

interface VersionDiffModalProps {
    baseVersion: Version
    compareVersion: Version
    initialMode?: 'unified' | 'side-by-side'
}

const props = withDefaults(defineProps<VersionDiffModalProps>(), {
    initialMode: 'unified',
})

const emit = defineEmits<{
    (e: 'close'): void
}>()

const mode = ref<'unified' | 'side-by-side'>(props.initialMode)
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

const diffLines = computed(() => computeDiff(props.baseVersion.body, props.compareVersion.body))
const diffChunks = computed(() => computeChunkedDiff(diffLines.value))
const unifiedDiff = computed(() => {
    return toUnifiedDiff(diffChunks.value, props.baseVersion.label, props.compareVersion.label)
})

const baseTimestamp = computed(() => formatDateTime(new Date(props.baseVersion.createdAt)))
const compareTimestamp = computed(() => formatDateTime(new Date(props.compareVersion.createdAt)))

async function copyUnifiedDiff(): Promise<void> {
    try {
        await navigator.clipboard.writeText(unifiedDiff.value)
        copied.value = true
        if (copyTimer) clearTimeout(copyTimer)
        copyTimer = setTimeout(() => {
            copied.value = false
        }, 1500)
    } catch {
        copied.value = false
    }
}

function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
        emit('close')
    }
}

onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    if (copyTimer) clearTimeout(copyTimer)
})

function formatDateTime(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
}
</script>

<template>
  <Teleport to="body">
    <div
      class="diff-modal-overlay"
      @click.self="emit('close')"
    >
      <div class="diff-modal">
        <div class="diff-modal__header">
          <div class="diff-modal__title-group">
            <FileText
              class="diff-modal__title-icon"
              :size="18"
            />
            <div>
              <h2 class="diff-modal__title">
                版本对比
              </h2>
              <p class="diff-modal__subtitle">
                {{ props.baseVersion.label }} → {{ props.compareVersion.label }}
              </p>
            </div>
          </div>

          <div class="diff-modal__header-actions">
            <button
              type="button"
              class="diff-modal__copy-btn"
              :title="copied ? '已复制' : '复制 Unified Diff'"
              @click="copyUnifiedDiff"
            >
              <Copy :size="14" />
              <span>{{ copied ? '已复制' : '复制 Unified' }}</span>
            </button>

            <button
              type="button"
              class="diff-modal__close-btn"
              title="关闭"
              @click="emit('close')"
            >
              <X :size="18" />
            </button>
          </div>
        </div>

        <div class="diff-modal__version-bar">
          <div class="diff-modal__version-card diff-modal__version-card--base">
            <span class="diff-modal__version-tag">旧版本</span>
            <strong>{{ props.baseVersion.label }}</strong>
            <span>{{ baseTimestamp }}</span>
          </div>

          <ArrowLeftRight
            class="diff-modal__version-arrow"
            :size="16"
          />

          <div class="diff-modal__version-card diff-modal__version-card--compare">
            <span class="diff-modal__version-tag">新版本</span>
            <strong>{{ props.compareVersion.label }}</strong>
            <span>{{ compareTimestamp }}</span>
          </div>

          <div class="diff-modal__mode-switch">
            <button
              type="button"
              class="diff-modal__mode-btn"
              :class="{ 'diff-modal__mode-btn--active': mode === 'unified' }"
              @click="mode = 'unified'"
            >
              Unified
            </button>
            <button
              type="button"
              class="diff-modal__mode-btn"
              :class="{ 'diff-modal__mode-btn--active': mode === 'side-by-side' }"
              @click="mode = 'side-by-side'"
            >
              Side by Side
            </button>
          </div>
        </div>

        <div class="diff-modal__body">
          <DiffViewer
            :lines="diffLines"
            :mode="mode"
            :context-lines="3"
            :show-line-numbers="true"
            :max-height="460"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.diff-modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(8px);
    z-index: 1100;
}

.diff-modal {
    width: min(1120px, 92vw);
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 18px;
    background: rgba(250, 251, 252, 0.96);
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
    overflow: hidden;
}

.diff-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px;
    border-bottom: 1px solid var(--border, #E5E7EB);
}

.diff-modal__title-group {
    display: flex;
    align-items: center;
    gap: 12px;
}

.diff-modal__title-icon {
    color: var(--accent-primary, #D32F2F);
}

.diff-modal__title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary, #263238);
}

.diff-modal__subtitle {
    margin-top: 2px;
    font-size: 12px;
    color: var(--text-secondary, #607D8B);
}

.diff-modal__header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.diff-modal__copy-btn,
.diff-modal__close-btn,
.diff-modal__mode-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid var(--border, #E5E7EB);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.88);
    color: var(--text-secondary, #607D8B);
    cursor: pointer;
    transition: all 150ms ease;
}

.diff-modal__copy-btn {
    height: 34px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 600;
}

.diff-modal__close-btn {
    width: 34px;
    height: 34px;
}

.diff-modal__copy-btn:hover,
.diff-modal__close-btn:hover,
.diff-modal__mode-btn:hover {
    border-color: var(--accent-secondary, #1565C0);
    color: var(--accent-secondary, #1565C0);
    background: #F0F7FF;
}

.diff-modal__version-bar {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border, #E5E7EB);
    background: rgba(255, 255, 255, 0.56);
}

.diff-modal__version-card {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid var(--border, #E5E7EB);
    font-size: 12px;
    color: var(--text-secondary, #607D8B);
}

.diff-modal__version-card strong {
    font-size: 13px;
    color: var(--text-primary, #263238);
}

.diff-modal__version-card--base {
    border-left: 3px solid var(--error, #C62828);
}

.diff-modal__version-card--compare {
    border-left: 3px solid var(--success, #2E7D32);
}

.diff-modal__version-tag {
    font-size: 10px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: var(--text-muted, #90A4AE);
}

.diff-modal__version-arrow {
    flex-shrink: 0;
    color: var(--text-muted, #90A4AE);
}

.diff-modal__mode-switch {
    display: inline-flex;
    margin-left: auto;
    padding: 4px;
    border-radius: 12px;
    background: rgba(38, 50, 56, 0.06);
}

.diff-modal__mode-btn {
    height: 32px;
    padding: 0 12px;
    border-color: transparent;
    background: transparent;
    font-size: 12px;
    font-weight: 600;
}

.diff-modal__mode-btn--active {
    border-color: rgba(21, 101, 192, 0.16);
    background: rgba(255, 255, 255, 0.88);
    color: var(--accent-secondary, #1565C0);
}

.diff-modal__body {
    flex: 1;
    min-height: 0;
    background: rgba(255, 255, 255, 0.72);
}

@media (max-width: 900px) {
    .diff-modal {
        width: 96vw;
        max-height: 94vh;
    }

    .diff-modal__version-bar {
        flex-wrap: wrap;
    }

    .diff-modal__mode-switch {
        width: 100%;
        margin-left: 0;
    }

    .diff-modal__mode-btn {
        flex: 1;
    }
}
</style>
