<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Bell, ExternalLink, RefreshCw, ShieldCheck, SkipForward, XCircle } from 'lucide-vue-next'
import { useUpdaterStore } from '@/stores/updater'

const updaterStore = useUpdaterStore()
const {
  currentVersion,
  status,
  busy,
  actionMessage,
  latest,
  skippedVersions,
  updaterSettings,
  latestSkipped,
} = storeToRefs(updaterStore)

const statusLabel = computed(() => {
  if (busy.value) return '检查中'
  if (status.value === 'available') return latestSkipped.value ? '已跳过' : '发现更新'
  if (status.value === 'none') return '已是最新'
  if (status.value === 'disabled') return '已禁用'
  if (status.value === 'signature-failed') return '签名异常'
  if (status.value === 'failed') return '检查失败'
  return '待检查'
})

const statusClass = computed(() => {
  if (status.value === 'available' && !latestSkipped.value) return 'sv-inline-status--warning'
  if (status.value === 'none') return 'sv-inline-status--ready'
  if (status.value === 'failed' || status.value === 'signature-failed') return 'sv-inline-status--invalid'
  return 'sv-inline-status--disabled'
})

const latestMeta = computed(() => {
  if (!latest.value) return '暂无可用更新信息'
  const released = latest.value.releasedAt ? new Date(latest.value.releasedAt).toLocaleDateString('zh-CN') : '发布时间未知'
  return `${released} / ${latest.value.signatureOk ? '签名可信' : '签名未通过'}`
})

function formatTimestamp(value: string | null): string {
  if (!value) return '从未'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

async function handleToggleAutoCheck(event: Event): Promise<void> {
  const checked = event.target instanceof HTMLInputElement ? event.target.checked : false
  await updaterStore.setAutoCheckDisabled(!checked)
}

onMounted(() => {
  void updaterStore.initialize()
})
</script>

<template>
  <section
    id="updater-section"
    class="sv-section updater-card"
    data-settings-section="updater"
    data-settings-entry="about.updater"
  >
    <div class="sv-section-header">
      <div>
        <h3 class="sv-section-title">
          Tauri Updater
        </h3>
        <p class="sv-section-note">
          仅检查和通知，不自动下载、不静默安装、不强制升级。
        </p>
      </div>
      <span
        class="sv-inline-status"
        :class="statusClass"
      >{{ statusLabel }}</span>
    </div>

    <div class="sv-inline-grid sv-inline-grid--four updater-card__metrics">
      <div class="sv-insight-card">
        <span class="sv-insight-card__label">当前版本</span>
        <span class="sv-insight-card__value">v{{ currentVersion }}</span>
        <span class="sv-insight-card__meta">来自真实运行时或 package fallback</span>
      </div>
      <div class="sv-insight-card">
        <span class="sv-insight-card__label">最新版本</span>
        <span class="sv-insight-card__value">{{ latest ? `v${latest.version}` : '--' }}</span>
        <span class="sv-insight-card__meta">{{ latestMeta }}</span>
      </div>
      <div class="sv-insight-card">
        <span class="sv-insight-card__label">上次检查</span>
        <span class="sv-insight-card__value updater-card__time">{{ formatTimestamp(updaterSettings.lastCheckAt) }}</span>
        <span class="sv-insight-card__meta">{{ updaterSettings.lastDisabledReason ?? updaterSettings.lastStatus }}</span>
      </div>
      <div class="sv-insight-card">
        <span class="sv-insight-card__label">跳过记录</span>
        <span class="sv-insight-card__value">{{ skippedVersions.length }}</span>
        <span class="sv-insight-card__meta">IndexedDB primary，localStorage fallback</span>
      </div>
    </div>

    <div class="sv-form-grid updater-card__controls">
      <label class="sv-toggle-row">
        <input
          type="checkbox"
          :checked="!updaterSettings.autoCheckDisabled"
          @change="handleToggleAutoCheck"
        >
        <span>
          <strong>启用启动/定时检查</strong>
          <small>启动后延迟 30s，后台每 6 小时检查一次；失败只写 ActivityLog。</small>
        </span>
      </label>

      <div class="updater-card__actions">
        <button
          type="button"
          class="sv-action-btn"
          :disabled="busy"
          @click="updaterStore.checkNow"
        >
          <RefreshCw :size="16" />
          {{ busy ? '检查中...' : '检查更新' }}
        </button>
        <button
          type="button"
          class="sv-action-btn"
          :disabled="!latest"
          @click="updaterStore.showDetails"
        >
          <Bell :size="16" />
          查看详情
        </button>
        <button
          type="button"
          class="sv-action-btn"
          :disabled="!latest || !latest.signatureOk"
          @click="updaterStore.openReleasePage"
        >
          <ExternalLink :size="16" />
          去下载
        </button>
      </div>
    </div>

    <div class="updater-card__policy">
      <div class="sv-static-card">
        <ShieldCheck :size="16" />
        <span>安全策略：签名失败的更新不会显示下载入口；当前实现不会调用 install/download/relaunch API。</span>
      </div>
      <div
        v-if="latestSkipped"
        class="sv-static-card"
      >
        <SkipForward :size="16" />
        <span>当前版本已跳过提醒，但仍可手动查看详情和下载页。</span>
      </div>
      <div
        v-if="updaterSettings.lastErrorMessage"
        class="sv-static-card updater-card__error"
      >
        <XCircle :size="16" />
        <span>{{ updaterSettings.lastErrorMessage }}</span>
      </div>
    </div>

    <div class="sv-btn-group updater-card__secondary-actions">
      <button
        type="button"
        class="sv-action-btn sv-action-btn-sm"
        :disabled="!latest"
        @click="updaterStore.skipLatest"
      >
        跳过此版本
      </button>
      <button
        type="button"
        class="sv-action-btn sv-action-btn-sm"
        :disabled="skippedVersions.length === 0"
        @click="updaterStore.resetSkippedVersions"
      >
        重置跳过记录
      </button>
    </div>

    <p
      v-if="actionMessage"
      class="sv-feedback"
      :class="actionMessage.type"
    >
      {{ actionMessage.text }}
    </p>
  </section>
</template>

<style scoped>
.updater-card {
  display: grid;
  gap: 16px;
}

.updater-card__metrics {
  align-items: stretch;
}

.updater-card__time {
  font-size: 16px;
}

.updater-card__controls {
  align-items: center;
}

.updater-card__actions,
.updater-card__secondary-actions,
.updater-card__policy {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.updater-card__actions .sv-action-btn,
.updater-card__policy .sv-static-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.updater-card__error {
  color: var(--color-danger, #b42318);
}
</style>
