<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Bell, ExternalLink, SkipForward, X } from 'lucide-vue-next'
import { useUpdaterStore } from '@/stores/updater'

const updaterStore = useUpdaterStore()
const { toastUpdate } = storeToRefs(updaterStore)
</script>

<template>
  <Teleport to="body">
    <aside
      v-if="toastUpdate"
      class="updater-toast"
      role="status"
      aria-live="polite"
    >
      <div class="updater-toast__icon">
        <Bell :size="18" />
      </div>
      <div class="updater-toast__body">
        <strong>InkForge v{{ toastUpdate.version }} 已发布</strong>
        <span>查看更新日志，或跳过此版本的重复提醒。</span>
      </div>
      <div class="updater-toast__actions">
        <button
          type="button"
          @click="updaterStore.showDetails"
        >
          <ExternalLink :size="14" />
          查看详情
        </button>
        <button
          type="button"
          @click="updaterStore.skipLatest"
        >
          <SkipForward :size="14" />
          跳过
        </button>
        <button
          type="button"
          aria-label="稍后再说"
          @click="updaterStore.dismissToast"
        >
          <X :size="14" />
        </button>
      </div>
    </aside>
  </Teleport>
</template>

<style scoped>
.updater-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2000;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  width: min(560px, calc(100vw - 32px));
  padding: 14px;
  border: 1px solid rgba(207, 91, 65, 0.25);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.98), rgba(251, 232, 218, 0.98));
  box-shadow: 0 18px 50px rgba(38, 50, 56, 0.2);
  color: var(--text-primary, #263238);
}

.updater-toast__icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(207, 91, 65, 0.12);
  color: var(--chrome-brand-red, #cf5b41);
}

.updater-toast__body {
  display: grid;
  gap: 3px;
}

.updater-toast__body span {
  color: var(--text-muted, #607d8b);
  font-size: 12px;
}

.updater-toast__actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.updater-toast__actions button {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  border: 1px solid rgba(38, 50, 56, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  color: var(--text-primary, #263238);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 7px 10px;
}

@media (max-width: 720px) {
  .updater-toast {
    grid-template-columns: auto 1fr;
    right: 16px;
    bottom: 16px;
  }

  .updater-toast__actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}
</style>
