<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { AlertTriangle, RefreshCw, RotateCcw, Trash2, X } from 'lucide-vue-next'
import { useArticleStore } from '@/stores/article'
import { useTrashStore } from '@/stores/trash'
import type { Article } from '@/types'

const emit = defineEmits<{
  close: []
}>()

const articleStore = useArticleStore()
const trashStore = useTrashStore()
const { items, summary, isLoading, isMutating, error, warning } = storeToRefs(trashStore)
const panel = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const confirmDialog = ref<HTMLElement | null>(null)
const confirmCancelButton = ref<HTMLButtonElement | null>(null)
const pendingPurge = ref<Article | null>(null)
const actionMessage = ref('')
const purgeError = ref('')
let panelReturnFocus: HTMLElement | null = null
let purgeReturnFocus: HTMLElement | null = null

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )).filter(element => !element.hasAttribute('hidden'))
}

function trapFocus(event: KeyboardEvent, container: HTMLElement): void {
  const focusable = getFocusableElements(container)
  if (focusable.length === 0) {
    event.preventDefault()
    container.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  const activeIndex = active instanceof HTMLElement ? focusable.indexOf(active) : -1
  if (activeIndex === -1) {
    event.preventDefault()
    const target = event.shiftKey ? last : first
    target.focus()
  } else if (event.shiftKey && activeIndex === 0) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && activeIndex === focusable.length - 1) {
    event.preventDefault()
    first.focus()
  }
}

function requestPurge(article: Article): void {
  purgeReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  purgeError.value = ''
  pendingPurge.value = article
}

function cancelPurge(): void {
  if (isMutating.value) return
  purgeError.value = ''
  pendingPurge.value = null
}

function formatDate(value: Date | string | number | null | undefined): string {
  if (!value) return '时间未知'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function loadTrash(): Promise<void> {
  actionMessage.value = ''
  try {
    await trashStore.loadTrash()
  } catch {
    actionMessage.value = '回收站加载失败，请重试。'
  }
}

async function restoreArticle(articleId: string): Promise<void> {
  actionMessage.value = ''
  let restored: Article
  try {
    restored = await trashStore.restore(articleId)
  } catch {
    actionMessage.value = '恢复失败，请根据错误信息重试。'
    return
  }

  try {
    await articleStore.loadArticles()
    actionMessage.value = `已恢复《${restored.title}》`
  } catch {
    actionMessage.value = `已恢复《${restored.title}》，但文稿列表刷新失败；重新进入工作台即可刷新。`
  }
}

async function confirmPurge(): Promise<void> {
  const article = pendingPurge.value
  if (!article || isMutating.value) return
  actionMessage.value = ''
  purgeError.value = ''
  try {
    await trashStore.purge(article.id)
    pendingPurge.value = null
    actionMessage.value = `已永久删除《${article.title}》`
  } catch {
    purgeError.value = error.value ?? '永久删除失败，请重试。'
  }
}

function closePanel(): void {
  if (!isMutating.value) emit('close')
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (pendingPurge.value) {
      cancelPurge()
    } else {
      closePanel()
    }
    return
  }

  if (event.key !== 'Tab') return
  const activeDialog = pendingPurge.value ? confirmDialog.value : panel.value
  if (activeDialog) trapFocus(event, activeDialog)
}

watch(pendingPurge, async article => {
  await nextTick()
  if (article) {
    confirmCancelButton.value?.focus()
    return
  }

  const returnTarget = purgeReturnFocus
  purgeReturnFocus = null
  if (returnTarget?.isConnected) {
    returnTarget.focus()
  } else {
    closeButton.value?.focus()
  }
})

onMounted(async () => {
  panelReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.addEventListener('keydown', handleKeydown)
  await loadTrash()
  await nextTick()
  closeButton.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (panelReturnFocus?.isConnected) panelReturnFocus.focus()
})
</script>

<template>
  <Teleport to="body">
    <div
      class="trash-overlay"
      @click.self="closePanel"
    >
      <section
        ref="panel"
        class="trash-panel"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trash-panel-title"
      >
        <header class="trash-header">
          <div>
            <p class="trash-kicker">本地文稿生命周期</p>
            <h2 id="trash-panel-title">
              回收站
            </h2>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="trash-icon-button"
            aria-label="关闭回收站"
            :disabled="isMutating"
            @click="closePanel"
          >
            <X :size="18" />
          </button>
        </header>

        <div class="trash-summary">
          <span>{{ summary.totalCount }} 篇文稿</span>
          <span>{{ summary.expiredCount }} 篇已到期</span>
          <span>{{ formatBytes(summary.storageBytes) }}</span>
          <button
            type="button"
            class="trash-refresh"
            :disabled="isLoading || isMutating"
            data-trash-action="refresh"
            @click="void loadTrash()"
          >
            <RefreshCw :size="14" />
            刷新
          </button>
        </div>

        <p
          v-if="error"
          class="trash-feedback trash-feedback-error"
          role="alert"
        >
          {{ error }}
        </p>
        <p
          v-else-if="warning"
          class="trash-feedback trash-feedback-warning"
          role="status"
        >
          {{ warning }}
        </p>
        <p
          v-else-if="actionMessage"
          class="trash-feedback"
          role="status"
        >
          {{ actionMessage }}
        </p>

        <div
          v-if="isLoading"
          class="trash-empty"
          role="status"
        >
          正在读取真实回收站数据…
        </div>
        <div
          v-else-if="items.length === 0"
          class="trash-empty"
        >
          <Trash2 :size="28" />
          <strong>回收站为空</strong>
          <span>从工作台删除的文稿会保留在这里，直到永久删除。</span>
        </div>
        <ul
          v-else
          class="trash-list"
          aria-label="已删除文稿"
        >
          <li
            v-for="article in items"
            :key="article.id"
            class="trash-item"
            :data-trash-article-id="article.id"
          >
            <div class="trash-item-copy">
              <strong>{{ article.title }}</strong>
              <span>删除于 {{ formatDate(article.deletedAt ?? article.updatedAt) }}</span>
              <span>保留至 {{ formatDate(article.expiresAt) }}</span>
            </div>
            <div class="trash-item-actions">
              <button
                type="button"
                class="trash-button trash-button-restore"
                :disabled="isMutating"
                data-trash-action="restore"
                @click="void restoreArticle(article.id)"
              >
                <RotateCcw :size="14" />
                恢复
              </button>
              <button
                type="button"
                class="trash-button trash-button-danger"
                :disabled="isMutating"
                data-trash-action="purge"
                @click="requestPurge(article)"
              >
                <Trash2 :size="14" />
                永久删除
              </button>
            </div>
          </li>
        </ul>

        <div
          v-if="pendingPurge"
          class="trash-confirm-overlay"
          @click.self="cancelPurge"
        >
          <div
            ref="confirmDialog"
            class="trash-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="trash-purge-title"
            :aria-describedby="purgeError ? 'trash-purge-description trash-purge-error' : 'trash-purge-description'"
            tabindex="-1"
          >
            <AlertTriangle :size="22" />
            <h3 id="trash-purge-title">
              永久删除文稿
            </h3>
            <p id="trash-purge-description">《{{ pendingPurge.title }}》的正文和版本历史将被永久删除。</p>
            <p
              v-if="purgeError"
              id="trash-purge-error"
              class="trash-confirm-error"
              role="alert"
              data-trash-purge-error
            >
              {{ purgeError }}
            </p>
            <div class="trash-confirm-actions">
              <button
                ref="confirmCancelButton"
                type="button"
                class="trash-button"
                data-trash-action="cancel-purge"
                :disabled="isMutating"
                @click="cancelPurge"
              >
                取消
              </button>
              <button
                type="button"
                class="trash-button trash-button-danger"
                :disabled="isMutating"
                data-trash-action="confirm-purge"
                @click="void confirmPurge()"
              >
                {{ isMutating ? '删除中...' : '确认永久删除' }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.trash-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--scrim);
  backdrop-filter: blur(6px);
}

.trash-panel {
  position: relative;
  width: min(760px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--bg-surface);
  box-shadow: var(--elev-3);
  color: var(--text-primary);
}

.trash-header,
.trash-summary,
.trash-item,
.trash-item-actions,
.trash-confirm-actions {
  display: flex;
  align-items: center;
}

.trash-header {
  justify-content: space-between;
  padding: 20px 22px 14px;
  border-bottom: 1px solid var(--border);
}

.trash-kicker {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.trash-header h2 {
  margin: 0;
  font-size: 22px;
}

.trash-icon-button,
.trash-refresh,
.trash-button {
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: inherit;
  cursor: pointer;
}

.trash-icon-button {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
}

.trash-summary {
  gap: 14px;
  padding: 12px 22px;
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
  font-size: 12px;
}

.trash-refresh {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 8px;
}

.trash-feedback {
  margin: 12px 22px 0;
  padding: 9px 12px;
  border-radius: 8px;
  background: var(--success-light);
  color: var(--success);
  font-size: 12px;
}

.trash-feedback-error {
  background: var(--error-light);
  color: var(--error);
}

.trash-feedback-warning {
  background: var(--ember-soft);
  color: var(--ember);
}

.trash-empty {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  color: var(--text-muted);
  text-align: center;
}

.trash-list {
  margin: 0;
  padding: 12px 22px 22px;
  overflow-y: auto;
  list-style: none;
}

.trash-item {
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.trash-item-copy {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 4px;
}

.trash-item-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trash-item-copy span {
  color: var(--text-muted);
  font-size: 11px;
}

.trash-item-actions {
  gap: 8px;
}

.trash-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 11px;
  border-radius: 8px;
  font-size: 12px;
}

.trash-button-restore {
  border-color: var(--ember-border);
  color: var(--ember);
}

.trash-button-danger {
  border-color: var(--error);
  color: var(--error);
}

.trash-button:disabled,
.trash-icon-button:disabled,
.trash-refresh:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.trash-button:focus-visible,
.trash-icon-button:focus-visible,
.trash-refresh:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.trash-confirm-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--scrim);
}

.trash-confirm {
  width: min(420px, 100%);
  padding: 24px;
  border-radius: 14px;
  background: var(--bg-surface);
  box-shadow: var(--elev-3);
  text-align: center;
}

.trash-confirm h3 {
  margin: 10px 0 8px;
}

.trash-confirm p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.trash-confirm .trash-confirm-error {
  color: var(--danger, #b42318);
  font-size: 13px;
}

.trash-confirm-actions {
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

@media (max-width: 640px) {
  .trash-overlay {
    padding: 12px;
  }

  .trash-panel {
    max-height: calc(100vh - 24px);
  }

  .trash-summary,
  .trash-item {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .trash-item-actions {
    width: 100%;
  }
}
</style>
