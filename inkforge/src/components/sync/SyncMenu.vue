<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Calendar, Clock3, GitMerge, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-vue-next'
import { useSyncStore } from '@/stores/sync'
import type { ConflictStrategy } from '@/services/sync/conflict-resolver'
import { getSyncLogs, type SyncLog } from '@/utils/db'
import { formatRelativeTime } from '@/utils/format-relative-time'

interface SyncMenuProps {
    visible: boolean
    anchorEl: HTMLElement | null
}

interface SyncMenuEmits {
    (e: 'close'): void
    (e: 'sync-now'): void
    (e: 'toggle-auto-sync'): void
    (e: 'resolve-conflicts'): void
    (e: 'view-history'): void
}

const props = defineProps<SyncMenuProps>()
const emit = defineEmits<SyncMenuEmits>()

const syncStore = useSyncStore()
const {
    autoSyncEnabled,
    conflictCount,
    conflicts,
    hasConflicts,
    isSyncing,
    lastSyncAt,
    statusText,
} = storeToRefs(syncStore)

const historyEntries = ref<SyncLog[]>([])
const historyLoading = ref(false)
const showHistory = ref(false)
const showConflictActions = ref(false)

const anchorReady = computed(() => Boolean(props.anchorEl))
const lastSyncLabel = computed(() => {
    if (!lastSyncAt.value) {
        return null
    }

    return formatRelativeTime(lastSyncAt.value)
})

watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            showHistory.value = false
            showConflictActions.value = false
        }
    }
)

watch(
    () => lastSyncAt.value?.getTime() ?? 0,
    () => {
        if (props.visible && showHistory.value) {
            void loadHistory()
        }
    }
)

async function loadHistory(): Promise<void> {
    historyLoading.value = true

    try {
        historyEntries.value = await getSyncLogs()
    } catch {
        historyEntries.value = []
    } finally {
        historyLoading.value = false
    }
}

async function handleSyncNow(): Promise<void> {
    emit('sync-now')
    await syncStore.sync()
    if (showHistory.value) {
        await loadHistory()
    }
}

function handleToggleAutoSync(): void {
    emit('toggle-auto-sync')

    if (autoSyncEnabled.value) {
        syncStore.stopAutoSync()
        return
    }

    syncStore.startAutoSync()
}

function toggleHistory(): void {
    emit('view-history')
    showHistory.value = !showHistory.value

    if (showHistory.value) {
        void loadHistory()
    }
}

function toggleConflictActions(): void {
    emit('resolve-conflicts')
    showConflictActions.value = !showConflictActions.value
}

async function handleResolveConflict(
    documentId: string,
    strategy: ConflictStrategy
): Promise<void> {
    await syncStore.resolveConflict(documentId, strategy)

    if (showHistory.value) {
        await loadHistory()
    }

    if (conflictCount.value === 0) {
        showConflictActions.value = false
    }
}

function formatAction(entry: SyncLog): string {
    switch (entry.action) {
        case 'push':
            return '上传'
        case 'pull':
            return '拉取'
        case 'conflict':
            return '冲突'
        case 'resolve':
            return '解决'
        case 'error':
            return '错误'
        default:
            return entry.action
    }
}

function formatStatus(entry: SyncLog): string {
    switch (entry.status) {
        case 'success':
            return '成功'
        case 'pending':
            return '处理中'
        case 'error':
        default:
            return '失败'
    }
}
</script>

<template>
  <div
    v-if="visible"
    class="sync-menu"
    :data-anchor-ready="anchorReady ? 'true' : 'false'"
    role="menu"
  >
    <button
      class="sync-menu-item"
      type="button"
      :disabled="isSyncing"
      title="立即执行同步"
      @click="handleSyncNow"
    >
      <RefreshCw
        :size="14"
        :class="{ 'sync-menu-spin': isSyncing }"
      />
      <span>{{ isSyncing ? '同步中...' : '立即同步' }}</span>
    </button>

    <button
      class="sync-menu-item"
      type="button"
      :title="autoSyncEnabled ? '关闭自动同步' : '开启自动同步'"
      @click="handleToggleAutoSync"
    >
      <component
        :is="autoSyncEnabled ? ToggleRight : ToggleLeft"
        :size="14"
      />
      <span>{{ autoSyncEnabled ? '自动同步已开启' : '自动同步已关闭' }}</span>
    </button>

    <button
      v-if="hasConflicts"
      class="sync-menu-item"
      type="button"
      title="查看并解决同步冲突"
      @click="toggleConflictActions"
    >
      <GitMerge :size="14" />
      <span>解决冲突</span>
      <span class="sync-menu-item-meta">{{ conflictCount }}</span>
    </button>

    <button
      class="sync-menu-item"
      type="button"
      title="查看最近同步历史"
      @click="toggleHistory"
    >
      <Clock3 :size="14" />
      <span>同步历史</span>
    </button>

    <div
      v-if="showConflictActions && hasConflicts"
      class="sync-menu-panel"
    >
      <div
        v-for="conflict in conflicts"
        :key="conflict.id"
        class="sync-conflict-card"
      >
        <div class="sync-conflict-title">
          文档 {{ conflict.documentId.slice(0, 8) }}
        </div>
        <div class="sync-conflict-meta">
          本地 v{{ conflict.localVersion }} / 远端 v{{ conflict.remoteVersion }}
        </div>
        <div class="sync-conflict-actions">
          <button
            class="sync-chip"
            type="button"
            title="保留本地版本"
            @click="handleResolveConflict(conflict.documentId, 'local-wins')"
          >
            保留本地
          </button>
          <button
            class="sync-chip"
            type="button"
            title="采用远端版本"
            @click="handleResolveConflict(conflict.documentId, 'remote-wins')"
          >
            采用远端
          </button>
          <button
            class="sync-chip"
            type="button"
            title="标记为手动处理"
            @click="handleResolveConflict(conflict.documentId, 'manual')"
          >
            手动处理
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showHistory"
      class="sync-menu-panel"
    >
      <div
        v-if="historyLoading"
        class="sync-menu-empty"
      >
        正在读取同步历史...
      </div>
      <div
        v-else-if="historyEntries.length === 0"
        class="sync-menu-empty"
      >
        暂无同步记录
      </div>
      <div
        v-else
        class="sync-history-list"
      >
        <div
          v-for="entry in historyEntries.slice(0, 10)"
          :key="entry.id"
          class="sync-history-item"
        >
          <div class="sync-history-main">
            <span class="sync-history-action">{{ formatAction(entry) }}</span>
            <span
              class="sync-history-status"
              :class="`sync-history-status--${entry.status}`"
            >{{ formatStatus(entry) }}</span>
          </div>
          <div class="sync-history-sub">
            <span class="sync-history-detail">{{ entry.details }}</span>
            <span class="sync-history-time">{{ formatRelativeTime(entry.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="sync-menu-separator" />

    <div class="sync-menu-status">
      <span>{{ statusText }}</span>
      <span
        v-if="lastSyncLabel"
        class="sync-menu-status-time"
      >
        <Calendar :size="12" />
        {{ lastSyncLabel }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.sync-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    width: 240px;
    background: var(--bg-surface, #FFFFFF);
    border: 1px solid var(--border, #E5E7EB);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 4px;
    z-index: 120;
    animation: sync-fade-in 150ms ease;
}

.sync-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-primary, #263238);
    cursor: pointer;
    font-size: 13px;
    text-align: left;
    transition: background 150ms ease, color 150ms ease;
}

.sync-menu-item:hover:not(:disabled) {
    background: var(--bg-rice-paper, #FAFBFC);
}

.sync-menu-item:disabled {
    cursor: default;
    opacity: 0.6;
}

.sync-menu-item-meta {
    margin-left: auto;
    color: var(--accent-primary, #D32F2F);
    font-size: 11px;
    font-weight: 700;
}

.sync-menu-panel {
    margin: 4px 4px 0;
    padding: 8px;
    border-radius: 8px;
    background: rgba(21, 101, 192, 0.04);
    border: 1px solid rgba(21, 101, 192, 0.08);
}

.sync-menu-empty {
    color: var(--text-muted, #90A4AE);
    font-size: 11px;
}

.sync-conflict-card + .sync-conflict-card {
    margin-top: 8px;
}

.sync-conflict-title {
    color: var(--text-primary, #263238);
    font-size: 12px;
    font-weight: 600;
}

.sync-conflict-meta {
    margin-top: 2px;
    color: var(--text-secondary, #607D8B);
    font-size: 11px;
}

.sync-conflict-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
}

.sync-chip {
    border: 1px solid var(--border, #E5E7EB);
    border-radius: 999px;
    background: var(--bg-surface, #FFFFFF);
    color: var(--text-primary, #263238);
    cursor: pointer;
    font-size: 11px;
    line-height: 1;
    padding: 6px 8px;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
}

.sync-chip:hover {
    background: var(--bg-rice-paper, #FAFBFC);
    border-color: rgba(211, 47, 47, 0.24);
    color: var(--accent-primary, #D32F2F);
}

.sync-history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 220px;
    overflow-y: auto;
}

.sync-history-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.sync-history-main,
.sync-history-sub {
    display: flex;
    align-items: center;
    gap: 8px;
}

.sync-history-action {
    color: var(--text-primary, #263238);
    font-size: 12px;
    font-weight: 600;
}

.sync-history-status {
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    padding: 3px 6px;
}

.sync-history-status--success {
    background: rgba(46, 125, 50, 0.12);
    color: #2E7D32;
}

.sync-history-status--pending {
    background: rgba(21, 101, 192, 0.12);
    color: #1565C0;
}

.sync-history-status--error {
    background: rgba(198, 40, 40, 0.12);
    color: #C62828;
}

.sync-history-detail {
    flex: 1;
    min-width: 0;
    color: var(--text-secondary, #607D8B);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sync-history-time {
    color: var(--text-muted, #90A4AE);
    font-size: 10px;
    white-space: nowrap;
}

.sync-menu-separator {
    height: 1px;
    background: var(--border, #E5E7EB);
    margin: 4px 8px;
}

.sync-menu-status {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    color: var(--text-muted, #90A4AE);
    font-size: 11px;
}

.sync-menu-status-time {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.sync-menu-spin {
    animation: sync-spin 1s linear infinite;
}

@keyframes sync-spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@keyframes sync-fade-in {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
