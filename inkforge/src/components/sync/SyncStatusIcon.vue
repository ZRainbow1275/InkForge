<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Cloud, CloudAlert, CloudOff, CloudUpload, RefreshCw, WifiOff } from 'lucide-vue-next'
import { useSyncStore } from '@/stores/sync'
import SyncMenu from './SyncMenu.vue'

interface SyncStatusIconProps {
    showBadge?: boolean
    size?: number
}

interface SyncStatusIconEmits {
    (e: 'click'): void
    (e: 'sync-request'): void
}

const props = withDefaults(defineProps<SyncStatusIconProps>(), {
    showBadge: true,
    size: 16,
})

const emit = defineEmits<SyncStatusIconEmits>()

const syncStore = useSyncStore()
const { pendingCount, status, statusText } = storeToRefs(syncStore)

const containerRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLElement | null>(null)
const menuVisible = ref(false)

const displayState = computed(() => {
    if (status.value === 'offline') {
        return 'offline'
    }

    if (status.value === 'syncing') {
        return 'syncing'
    }

    if (status.value === 'conflict') {
        return 'conflict'
    }

    if (status.value === 'error') {
        return 'error'
    }

    return pendingCount.value > 0 ? 'pending' : 'synced'
})

const badgeText = computed(() => {
    if (pendingCount.value <= 0) {
        return ''
    }

    return pendingCount.value > 99 ? '99+' : String(pendingCount.value)
})

const titleText = computed(() => {
    switch (displayState.value) {
        case 'pending':
            return `${statusText.value}，点击查看同步菜单`
        case 'syncing':
            return '正在同步，点击查看同步菜单'
        case 'conflict':
            return '存在同步冲突，点击查看同步菜单'
        case 'offline':
            return '当前处于离线模式'
        case 'error':
            return statusText.value
        case 'synced':
        default:
            return '已同步，点击查看同步菜单'
    }
})

function closeMenu(): void {
    menuVisible.value = false
}

function toggleMenu(): void {
    menuVisible.value = !menuVisible.value
    emit('click')
}

function handleDocumentClick(event: MouseEvent): void {
    if (!menuVisible.value) {
        return
    }

    if (containerRef.value?.contains(event.target as Node)) {
        return
    }

    closeMenu()
}

function handleDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
        closeMenu()
    }
}

function handleSyncNow(): void {
    emit('sync-request')
}

onMounted(() => {
    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleDocumentKeydown)
})

onUnmounted(() => {
    document.removeEventListener('click', handleDocumentClick)
    document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<template>
  <div
    ref="containerRef"
    class="sync-status"
  >
    <button
      ref="buttonRef"
      type="button"
      class="sync-status-btn"
      :class="`sync-status-btn--${displayState}`"
      :title="titleText"
      @click.stop="toggleMenu"
    >
      <RefreshCw
        v-if="displayState === 'syncing'"
        class="sync-status-icon sync-status-icon--spin"
        :size="props.size"
      />
      <CloudAlert
        v-else-if="displayState === 'conflict'"
        class="sync-status-icon sync-status-icon--pulse"
        :size="props.size"
      />
      <CloudOff
        v-else-if="displayState === 'error'"
        class="sync-status-icon"
        :size="props.size"
      />
      <WifiOff
        v-else-if="displayState === 'offline'"
        class="sync-status-icon"
        :size="props.size"
      />
      <CloudUpload
        v-else-if="displayState === 'pending'"
        class="sync-status-icon"
        :size="props.size"
      />
      <Cloud
        v-else
        class="sync-status-icon"
        :size="props.size"
      />

      <span
        v-if="props.showBadge && pendingCount > 0"
        class="sync-badge"
      >{{ badgeText }}</span>
    </button>

    <SyncMenu
      :visible="menuVisible"
      :anchor-el="buttonRef"
      @close="closeMenu"
      @sync-now="handleSyncNow"
    />
  </div>
</template>

<style scoped>
.sync-status {
    position: relative;
    display: inline-flex;
    align-items: center;
}

.sync-status-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.88);
    color: var(--text-secondary, #607D8B);
    cursor: pointer;
    transition: transform 150ms ease, border-color 150ms ease, color 150ms ease, background 150ms ease;
}

.sync-status-btn:hover {
    transform: translateY(-1px);
}

.sync-status-btn--synced {
    color: #2E7D32;
}

.sync-status-btn--pending {
    color: #F57C00;
}

.sync-status-btn--syncing {
    color: #1565C0;
    border-color: rgba(21, 101, 192, 0.2);
}

.sync-status-btn--conflict,
.sync-status-btn--error {
    color: #C62828;
    border-color: rgba(198, 40, 40, 0.2);
}

.sync-status-btn--offline {
    color: #90A4AE;
}

.sync-status-icon--spin {
    animation: sync-spin 1s linear infinite;
}

.sync-status-icon--pulse {
    animation: sync-pulse 1.2s ease-in-out infinite;
}

.sync-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 14px;
    height: 14px;
    padding: 0 3px;
    border-radius: 7px;
    background: #F57C00;
    color: #FFFFFF;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
}

@keyframes sync-spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@keyframes sync-pulse {
    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.45;
    }
}
</style>
