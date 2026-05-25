<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useSettingsStore } from '@/stores/settings'
import { useVersionManager, computeDiffSummary } from '@/composables/useVersionManager'
import type { DiffLine, VersionMeta } from '@/composables/useVersionManager'
import { Save, GitBranch, Clock, ChevronRight, Diff, RotateCcw, Zap, PenLine } from 'lucide-vue-next'
import VersionDiffModal from './VersionDiffModal.vue'
import type { Version } from '@/schemas/article'

// ═══════════════════════════════════════════════════════════════════
// Store & Composable
// ═══════════════════════════════════════════════════════════════════

const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const { currentContent } = storeToRefs(editorStore)

const {
    versionList,
    currentVersionId,
    createManualVersion,
    diffBetween,
    getVersionById,
    updateAutoSnapshotConfig,
} = useVersionManager(editorStore)

watch(
    () => ({
        enabled: settingsStore.settings.data.autoBackup,
        interval: settingsStore.settings.data.backupInterval,
        maxBackups: settingsStore.settings.data.maxBackups,
    }),
    ({ enabled, interval, maxBackups }) => {
        const safeIntervalMinutes = Number.isFinite(interval) ? Math.min(240, Math.max(1, Math.trunc(interval))) : 7
        const safeMaxBackups = Number.isFinite(maxBackups) ? Math.min(50, Math.max(1, Math.trunc(maxBackups))) : 5

        updateAutoSnapshotConfig({
            enabled,
            intervalMs: safeIntervalMinutes * 60 * 1000,
            maxBackups: safeMaxBackups,
        })
    },
    { immediate: true, deep: true },
)

// ═══════════════════════════════════════════════════════════════════
// 状态
// ═══════════════════════════════════════════════════════════════════

/** 自定义版本标签输入 */
const customLabel = ref('')

/** 版本创建中 */
const isCreating = ref(false)

/** 切换确认对话框 */
const showSwitchConfirm = ref(false)
const pendingSwitchVersion = ref<VersionMeta | null>(null)
const switchDiffSummary = ref<{ addedCount: number; removedCount: number } | null>(null)

/** Diff 对比模式 */
const diffMode = ref(false)
const selectedForDiff = ref<string[]>([])

/** Diff Modal */
const showDiffModal = ref(false)
const diffModalOldVersion = ref<Version | null>(null)
const diffModalNewVersion = ref<Version | null>(null)
const diffModalLines = ref<DiffLine[]>([])

// ═══════════════════════════════════════════════════════════════════
// 计算属性
// ═══════════════════════════════════════════════════════════════════

/** 是否有内容可以操作 */
const hasContent = computed(() => currentContent.value !== null)

/** 版本数量 */
const versionCount = computed(() => versionList.value.length)

// ═══════════════════════════════════════════════════════════════════
// 时间格式化
// ═══════════════════════════════════════════════════════════════════

/**
 * 将日期格式化为相对时间
 */
function formatRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays === 1) return '昨天'

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// ═══════════════════════════════════════════════════════════════════
// 操作
// ═══════════════════════════════════════════════════════════════════

/**
 * 保存为新版本
 */
async function handleCreateVersion(): Promise<void> {
    if (isCreating.value) return
    isCreating.value = true

    try {
        const label = customLabel.value.trim() || undefined
        await createManualVersion(label)
        customLabel.value = ''
    } finally {
        isCreating.value = false
    }
}

/**
 * 点击版本项 - 切换或选择对比
 */
function handleVersionClick(version: VersionMeta): void {
    if (diffMode.value) {
        toggleDiffSelection(version.id)
        return
    }

    // 已经是当前版本，不处理
    if (version.id === currentVersionId.value) return

    // 计算差异摘要
    if (currentVersionId.value) {
        const lines = diffBetween(currentVersionId.value, version.id)
        const summary = computeDiffSummary(lines)
        switchDiffSummary.value = {
            addedCount: summary.addedCount,
            removedCount: summary.removedCount,
        }
    } else {
        switchDiffSummary.value = null
    }

    pendingSwitchVersion.value = version
    showSwitchConfirm.value = true
}

/**
 * 确认切换版本
 */
async function confirmSwitch(): Promise<void> {
    if (!pendingSwitchVersion.value) return

    await editorStore.switchVersion(pendingSwitchVersion.value.id)
    showSwitchConfirm.value = false
    pendingSwitchVersion.value = null
    switchDiffSummary.value = null
}

/**
 * 取消切换
 */
function cancelSwitch(): void {
    showSwitchConfirm.value = false
    pendingSwitchVersion.value = null
    switchDiffSummary.value = null
}

// ═══════════════════════════════════════════════════════════════════
// Diff 对比
// ═══════════════════════════════════════════════════════════════════

/**
 * 切换对比模式
 */
function toggleDiffMode(): void {
    diffMode.value = !diffMode.value
    selectedForDiff.value = []
}

/**
 * 选择/取消对比版本
 */
function toggleDiffSelection(versionId: string): void {
    const idx = selectedForDiff.value.indexOf(versionId)
    if (idx !== -1) {
        selectedForDiff.value.splice(idx, 1)
    } else if (selectedForDiff.value.length < 2) {
        selectedForDiff.value.push(versionId)
    } else {
        // 已选2个，替换最后一个
        selectedForDiff.value[1] = versionId
    }
}

/**
 * 执行对比
 */
function performDiff(): void {
    if (selectedForDiff.value.length !== 2) return

    const [oldId, newId] = selectedForDiff.value
    const oldVersion = getVersionById(oldId)
    const newVersion = getVersionById(newId)

    if (!oldVersion || !newVersion) return

    // 确保按时间排序：旧在前，新在后
    const oldTime = new Date(oldVersion.createdAt).getTime()
    const newTime = new Date(newVersion.createdAt).getTime()

    if (oldTime <= newTime) {
        diffModalOldVersion.value = oldVersion
        diffModalNewVersion.value = newVersion
    } else {
        diffModalOldVersion.value = newVersion
        diffModalNewVersion.value = oldVersion
    }

    diffModalLines.value = computeDiff(
        diffModalOldVersion.value.body,
        diffModalNewVersion.value.body
    )

    showDiffModal.value = true
}

function closeDiffModal(): void {
    showDiffModal.value = false
    diffModalOldVersion.value = null
    diffModalNewVersion.value = null
    diffModalLines.value = []
}

// 导入 computeDiff 供 performDiff 使用
import { computeDiff } from '@/composables/useVersionManager'
</script>

<template>
  <div class="version-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-title">
        <GitBranch :size="14" />
        <span>版本管理</span>
        <span
          v-if="versionCount > 0"
          class="version-count"
        >{{ versionCount }}</span>
      </div>
    </div>

    <!-- 无内容状态 -->
    <div
      v-if="!hasContent"
      class="empty-state"
    >
      <GitBranch
        :size="28"
        class="empty-icon"
      />
      <span>选择文章后查看版本</span>
    </div>

    <template v-else>
      <!-- 操作区 -->
      <div class="action-area">
        <div class="label-input-row">
          <input
            v-model="customLabel"
            type="text"
            class="label-input"
            placeholder="版本标签（可选）"
            maxlength="50"
            @keydown.enter="handleCreateVersion"
          >
        </div>
        <div class="action-buttons">
          <button
            type="button"
            class="save-btn"
            :disabled="isCreating"
            @click="handleCreateVersion"
          >
            <Save :size="13" />
            <span>{{ isCreating ? '保存中...' : '保存版本' }}</span>
          </button>
          <button
            type="button"
            class="diff-toggle-btn"
            :class="{ active: diffMode }"
            title="对比模式"
            @click="toggleDiffMode"
          >
            <Diff :size="13" />
          </button>
        </div>

        <!-- Diff 操作栏 -->
        <Transition name="slide-down">
          <div
            v-if="diffMode"
            class="diff-action-bar"
          >
            <span class="diff-hint">
              选择两个版本进行对比
              <span
                v-if="selectedForDiff.length > 0"
                class="diff-selected-count"
              >
                ({{ selectedForDiff.length }}/2)
              </span>
            </span>
            <button
              type="button"
              class="diff-execute-btn"
              :disabled="selectedForDiff.length !== 2"
              @click="performDiff"
            >
              <ChevronRight :size="12" />
              对比
            </button>
          </div>
        </Transition>
      </div>

      <!-- 版本列表 -->
      <div class="version-list">
        <TransitionGroup name="version-item">
          <div
            v-for="version in versionList"
            :key="version.id"
            class="version-item"
            :class="{
              active: version.id === currentVersionId,
              'diff-selected': diffMode && selectedForDiff.includes(version.id),
              'diff-mode': diffMode,
            }"
            @click="handleVersionClick(version)"
          >
            <!-- 左侧指示条 -->
            <div class="version-indicator">
              <div
                class="indicator-bar"
                :class="{ current: version.id === currentVersionId }"
              />
            </div>

            <!-- 版本信息 -->
            <div class="version-info">
              <div class="version-top-row">
                <span class="version-label">{{ version.label }}</span>
                <span
                  class="version-type-badge"
                  :class="version.isAuto ? 'auto' : 'manual'"
                >
                  <Zap
                    v-if="version.isAuto"
                    :size="10"
                  />
                  <PenLine
                    v-else
                    :size="10"
                  />
                  {{ version.isAuto ? '自动' : '手动' }}
                </span>
              </div>
              <div class="version-meta-row">
                <span class="version-time">
                  <Clock :size="10" />
                  {{ formatRelativeTime(version.createdAt) }}
                </span>
                <span class="version-words">{{ version.wordCount }} 字</span>
              </div>
            </div>

            <!-- Diff 选中标记 -->
            <div
              v-if="diffMode"
              class="diff-check"
            >
              <div
                class="diff-checkbox"
                :class="{ checked: selectedForDiff.includes(version.id) }"
              />
            </div>
          </div>
        </TransitionGroup>
      </div>
    </template>

    <!-- 切换确认对话框 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showSwitchConfirm"
          class="confirm-overlay"
          @click.self="cancelSwitch"
        >
          <div class="confirm-dialog">
            <div class="confirm-icon">
              <RotateCcw :size="20" />
            </div>
            <h3 class="confirm-title">
              切换版本
            </h3>
            <p class="confirm-desc">
              确定要切换到版本
              <strong>{{ pendingSwitchVersion?.label }}</strong>
              吗？当前未保存的更改将被覆盖。
            </p>
            <div
              v-if="switchDiffSummary"
              class="confirm-diff-summary"
            >
              <span class="diff-added">+{{ switchDiffSummary.addedCount }} 行</span>
              <span class="diff-removed">-{{ switchDiffSummary.removedCount }} 行</span>
            </div>
            <div class="confirm-actions">
              <button
                type="button"
                class="confirm-cancel-btn"
                @click="cancelSwitch"
              >
                取消
              </button>
              <button
                type="button"
                class="confirm-ok-btn"
                @click="confirmSwitch"
              >
                确认切换
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Diff 弹窗 -->
    <VersionDiffModal
      v-if="showDiffModal && diffModalOldVersion && diffModalNewVersion"
      :old-version="diffModalOldVersion"
      :new-version="diffModalNewVersion"
      :diff-lines="diffModalLines"
      @close="closeDiffModal"
    />
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   VersionPanel — Ethereal Constructivism
   ═══════════════════════════════════════════════════════════════════ */

.version-panel {
  width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-rice-paper, #FAFBFC);
  border-left: 1px solid var(--border, #E5E7EB);
  font-size: 12px;
  overflow: hidden;
}

/* ─── 头部 ─────────────────────────────────────────────── */

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border, #E5E7EB);
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #263238);
}

.version-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--accent-primary-light, #FFEBEE);
  color: var(--accent-primary, #D32F2F);
  font-size: 10px;
  font-weight: 700;
}

/* ─── 空状态 ───────────────────────────────────────────── */

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted, #90A4AE);
  font-size: 12px;
}

.empty-icon {
  opacity: 0.4;
}

/* ─── 操作区 ───────────────────────────────────────────── */

.action-area {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border, #E5E7EB);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-input-row {
  display: flex;
}

.label-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border, #E5E7EB);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-primary, #263238);
  background: var(--bg-surface, #FFFFFF);
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.label-input:focus {
  border-color: var(--accent-primary, #D32F2F);
  box-shadow: 0 0 0 2px var(--accent-primary-light, #FFEBEE);
}

.label-input::placeholder {
  color: var(--text-muted, #90A4AE);
}

.action-buttons {
  display: flex;
  gap: 6px;
}

.save-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 0;
  border: none;
  border-radius: 6px;
  background: var(--accent-primary, #D32F2F);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.save-btn:hover:not(:disabled) {
  background: var(--accent-primary-dark, #B71C1C);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.diff-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border, #E5E7EB);
  border-radius: 6px;
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-secondary, #607D8B);
  cursor: pointer;
  transition: all 150ms ease;
}

.diff-toggle-btn:hover {
  border-color: var(--accent-secondary, #1565C0);
  color: var(--accent-secondary, #1565C0);
  background: var(--accent-secondary-light, #E3F2FD);
}

.diff-toggle-btn.active {
  border-color: var(--accent-secondary, #1565C0);
  background: var(--accent-secondary, #1565C0);
  color: white;
}

/* ─── Diff 操作栏 ──────────────────────────────────────── */

.diff-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--accent-secondary-light, #E3F2FD);
  border-radius: 6px;
  border: 1px solid rgba(21, 101, 192, 0.15);
}

.diff-hint {
  font-size: 11px;
  color: var(--accent-secondary, #1565C0);
}

.diff-selected-count {
  font-weight: 600;
}

.diff-execute-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: var(--accent-secondary, #1565C0);
  color: white;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.diff-execute-btn:hover:not(:disabled) {
  background: #0D47A1;
}

.diff-execute-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ─── 版本列表 ─────────────────────────────────────────── */

.version-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.version-item {
  display: flex;
  align-items: stretch;
  padding: 8px 14px 8px 0;
  cursor: pointer;
  transition: background-color 150ms ease;
  position: relative;
}

.version-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.version-item.active {
  background: var(--accent-primary-light, #FFEBEE);
}

.version-item.diff-selected {
  background: var(--accent-secondary-light, #E3F2FD);
}

.version-item.diff-mode {
  cursor: crosshair;
}

/* ─── 指示条 ───────────────────────────────────────────── */

.version-indicator {
  width: 14px;
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-shrink: 0;
}

.indicator-bar {
  width: 3px;
  border-radius: 2px;
  background: transparent;
  transition: background-color 200ms ease;
}

.indicator-bar.current {
  background: var(--accent-primary, #D32F2F);
}

/* ─── 版本信息 ─────────────────────────────────────────── */

.version-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.version-top-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.version-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #263238);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.version-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.version-type-badge.auto {
  background: var(--warning-light, #FFF3E0);
  color: var(--warning, #F57C00);
}

.version-type-badge.manual {
  background: var(--success-light, #E8F5E9);
  color: var(--success, #2E7D32);
}

.version-meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-time {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--text-muted, #90A4AE);
}

.version-words {
  font-size: 11px;
  color: var(--text-muted, #90A4AE);
}

/* ─── Diff 选中标记 ────────────────────────────────────── */

.diff-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  flex-shrink: 0;
}

.diff-checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border, #E5E7EB);
  border-radius: 4px;
  transition: all 150ms ease;
}

.diff-checkbox.checked {
  background: var(--accent-secondary, #1565C0);
  border-color: var(--accent-secondary, #1565C0);
  position: relative;
}

.diff-checkbox.checked::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 4px;
  width: 4px;
  height: 7px;
  border: 2px solid white;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

/* ═══════════════════════════════════════════════════════════════════
   切换确认对话框
   ═══════════════════════════════════════════════════════════════════ */

.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  background: var(--bg-surface, #FFFFFF);
  border-radius: 12px;
  padding: 24px;
  width: 340px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
  text-align: center;
  animation: scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.confirm-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  border-radius: 12px;
  background: var(--accent-primary-light, #FFEBEE);
  color: var(--accent-primary, #D32F2F);
}

.confirm-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #263238);
  margin-bottom: 8px;
}

.confirm-desc {
  font-size: 13px;
  color: var(--text-secondary, #607D8B);
  line-height: 1.5;
  margin-bottom: 16px;
}

.confirm-diff-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 10px;
  margin-bottom: 16px;
  background: var(--bg-rice-paper, #FAFBFC);
  border-radius: 8px;
  border: 1px solid var(--border, #E5E7EB);
}

.diff-added {
  font-size: 13px;
  font-weight: 600;
  color: var(--success, #2E7D32);
}

.diff-removed {
  font-size: 13px;
  font-weight: 600;
  color: var(--error, #C62828);
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.confirm-cancel-btn {
  flex: 1;
  padding: 8px 0;
  border: 1px solid var(--border, #E5E7EB);
  border-radius: 8px;
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-secondary, #607D8B);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.confirm-cancel-btn:hover {
  background: var(--bg-rice-paper, #FAFBFC);
  border-color: var(--text-muted, #90A4AE);
}

.confirm-ok-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 8px;
  background: var(--accent-primary, #D32F2F);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.confirm-ok-btn:hover {
  background: var(--accent-primary-dark, #B71C1C);
}

/* ═══════════════════════════════════════════════════════════════════
   动画
   ═══════════════════════════════════════════════════════════════════ */

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

/* Modal Fade */
.modal-fade-enter-active {
  transition: opacity 200ms ease;
}

.modal-fade-leave-active {
  transition: opacity 150ms ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .confirm-dialog {
  animation: scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Slide Down */
.slide-down-enter-active {
  transition: all 200ms ease;
}

.slide-down-leave-active {
  transition: all 150ms ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 60px;
}

/* Version Item List */
.version-item-enter-active {
  transition: all 250ms ease;
}

.version-item-leave-active {
  transition: all 200ms ease;
}

.version-item-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.version-item-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

.version-item-move {
  transition: transform 250ms ease;
}

/* ═══════════════════════════════════════════════════════════════════
   Reduced Motion
   ═══════════════════════════════════════════════════════════════════ */

@media (prefers-reduced-motion: reduce) {
  .version-panel *,
  .version-panel *::before,
  .version-panel *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
