<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ExternalLink, ShieldAlert, ShieldCheck, SkipForward, X } from 'lucide-vue-next'
import { useUpdaterStore } from '@/stores/updater'

const updaterStore = useUpdaterStore()
const { latest, detailsVisible, renderedNotes, latestSkipped } = storeToRefs(updaterStore)
const notesContainer = ref<HTMLElement | null>(null)

function formatReleasedAt(value: number | null | undefined): string {
  if (!value) return '发布时间未知'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function formatSize(value: number | null | undefined): string {
  if (!value) return '未知大小'
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

async function syncRenderedNotes(): Promise<void> {
  await nextTick()
  if (notesContainer.value) {
    notesContainer.value.innerHTML = renderedNotes.value?.html ?? '<p>No release notes are available.</p>'
  }
}

watch(
  () => [detailsVisible.value, renderedNotes.value?.html] as const,
  () => {
    void syncRenderedNotes()
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="detailsVisible && latest"
      class="updater-modal__overlay"
      @click.self="updaterStore.hideDetails"
    >
      <section
        class="updater-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="updater-modal-title"
      >
        <header class="updater-modal__header">
          <div>
            <p class="updater-modal__eyebrow">
              InkForge Release
            </p>
            <h3 id="updater-modal-title">
              v{{ latest.version }} 更新日志
            </h3>
            <p>{{ formatReleasedAt(latest.releasedAt) }} / {{ formatSize(latest.size) }}</p>
          </div>
          <button
            type="button"
            class="updater-modal__close"
            aria-label="关闭更新详情"
            @click="updaterStore.hideDetails"
          >
            <X :size="18" />
          </button>
        </header>

        <div class="updater-modal__status">
          <span
            class="sv-inline-status"
            :class="latest.signatureOk ? 'sv-inline-status--ready' : 'sv-inline-status--invalid'"
          >
            <ShieldCheck
              v-if="latest.signatureOk"
              :size="14"
            />
            <ShieldAlert
              v-else
              :size="14"
            />
            {{ latest.signatureOk ? '签名可信' : '签名异常，已禁用下载入口' }}
          </span>
          <span
            v-if="latestSkipped"
            class="sv-inline-status sv-inline-status--disabled"
          >已跳过提醒</span>
        </div>

        <article
          ref="notesContainer"
          class="updater-modal__notes markdown-body"
        />

        <p
          v-if="renderedNotes && renderedNotes.strippedImageCount > 0"
          class="updater-modal__warning"
        >
          已移除 {{ renderedNotes.strippedImageCount }} 个非白名单图片链接。
        </p>

        <footer class="updater-modal__actions">
          <button
            type="button"
            class="sv-action-btn"
            :disabled="!latest.signatureOk"
            @click="updaterStore.openReleasePage"
          >
            <ExternalLink :size="16" />
            去下载
          </button>
          <button
            type="button"
            class="sv-action-btn"
            @click="updaterStore.skipLatest"
          >
            <SkipForward :size="16" />
            跳过此版本
          </button>
          <button
            type="button"
            class="sv-action-btn"
            @click="updaterStore.hideDetails"
          >
            稍后再说
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.updater-modal__overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(8px);
}

.updater-modal {
  width: min(760px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid rgba(38, 50, 56, 0.14);
  border-radius: 20px;
  background: var(--bg-surface, #fffaf0);
  box-shadow: 0 24px 80px rgba(38, 50, 56, 0.28);
}

.updater-modal__header,
.updater-modal__actions,
.updater-modal__status {
  display: flex;
  gap: 12px;
  align-items: center;
}

.updater-modal__header {
  justify-content: space-between;
  padding: 22px 24px 16px;
  border-bottom: 1px solid rgba(38, 50, 56, 0.1);
}

.updater-modal__header h3 {
  margin: 0;
  color: var(--text-primary, #263238);
}

.updater-modal__header p {
  margin: 4px 0 0;
  color: var(--text-muted, #607d8b);
}

.updater-modal__eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
}

.updater-modal__close {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(38, 50, 56, 0.12);
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted, #607d8b);
  cursor: pointer;
}

.updater-modal__status {
  flex-wrap: wrap;
  padding: 16px 24px 0;
}

.updater-modal__status .sv-inline-status {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.updater-modal__notes {
  padding: 20px 24px;
  color: var(--text-primary, #263238);
}

.updater-modal__warning {
  margin: 0 24px 16px;
  color: var(--color-warning, #9a6700);
}

.updater-modal__actions {
  justify-content: flex-end;
  padding: 16px 24px 22px;
  border-top: 1px solid rgba(38, 50, 56, 0.1);
}

.updater-modal__actions .sv-action-btn {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
</style>
