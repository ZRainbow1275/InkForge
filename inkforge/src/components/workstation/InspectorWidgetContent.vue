<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { Check, Copy, ExternalLink, Link2 } from 'lucide-vue-next'
import { openExternalUrl, writeClipboardText } from '@/services/desktop'
import {
  INSPECTOR_WIDGET_META,
  type InspectorWidgetId,
  type InspectorWidgetPayload,
} from '@/services/inspector-widgets'

const props = withDefaults(defineProps<{
  surfaceId: InspectorWidgetId
  payload: InspectorWidgetPayload
  variant?: 'panel' | 'stage'
}>(), {
  variant: 'panel',
})

const copiedHref = ref<string | null>(null)
const actionMessage = ref('')
let copiedTimer: ReturnType<typeof setTimeout> | undefined

const title = computed(() => INSPECTOR_WIDGET_META[props.surfaceId].title)

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

async function copyLink(href: string): Promise<void> {
  const result = await writeClipboardText(href)
  if (!result.ok) {
    actionMessage.value = `复制失败：${result.message}`
    return
  }

  actionMessage.value = '链接已复制'
  copiedHref.value = href
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copiedHref.value = null
    actionMessage.value = ''
  }, 1500)
}

async function openLink(href: string): Promise<void> {
  const result = await openExternalUrl(href)
  if (!result.ok) {
    actionMessage.value = `无法打开链接：${result.message}`
  }
}

onUnmounted(() => clearTimeout(copiedTimer))
</script>

<template>
  <section
    class="widget-content"
    :class="[`widget-content--${surfaceId}`, `widget-content--${variant}`]"
    :data-platform="surfaceId === 'platform-preview' ? payload.platform : undefined"
    :aria-label="title"
  >
    <template v-if="surfaceId === 'platform-preview'">
      <div
        v-if="payload.previewLoading"
        class="widget-preview-state"
        role="status"
      >
        <span class="widget-preview-spinner" />
        正在生成{{ payload.platformLabel }}预览
      </div>
      <div
        v-else-if="!payload.previewHtml"
        class="widget-preview-state widget-preview-state--empty"
      >
        <span>暂无可预览内容</span>
        <small>选择或编辑文稿后，这里会显示当前平台的真实渲染结果。</small>
      </div>
      <div
        v-else
        class="widget-preview-scroll"
      >
        <span
          v-if="payload.previewIsSample"
          class="widget-preview-sample"
        >示例内容</span>
        <div
          class="widget-preview-html preview-content"
          :class="`preview-content--${payload.platform}`"
          :data-platform-editor-host="payload.platform"
          v-html="payload.previewHtml"
        />
      </div>
    </template>

    <template v-else-if="surfaceId === 'references'">
      <div
        v-if="payload.links.length === 0"
        class="widget-reference-empty"
      >
        <Link2 :size="24" />
        <strong>暂无外部引用</strong>
        <span>在 Markdown 中使用 `[说明文字](https://…)` 添加引用链接。</span>
      </div>
      <div
        v-else
        class="widget-reference-list"
        aria-label="引用链接列表"
      >
        <article
          v-for="link in payload.links"
          :key="link.href"
          class="widget-reference-row"
        >
          <div class="widget-reference-copy">
            <strong>{{ link.text }}</strong>
            <span>{{ link.href }}</span>
          </div>
          <div class="widget-reference-actions">
            <button
              type="button"
              :aria-label="`打开引用：${link.text}`"
              :title="`打开 ${link.href}`"
              @click="openLink(link.href)"
            >
              <ExternalLink :size="14" />
            </button>
            <button
              type="button"
              :aria-label="`复制引用链接：${link.text}`"
              :title="copiedHref === link.href ? '已复制' : '复制链接'"
              @click="copyLink(link.href)"
            >
              <Check
                v-if="copiedHref === link.href"
                :size="14"
              />
              <Copy
                v-else
                :size="14"
              />
            </button>
          </div>
        </article>
      </div>
      <p
        v-if="actionMessage"
        class="widget-action-message"
        role="status"
      >
        {{ actionMessage }}
      </p>
    </template>

    <template v-else>
      <div class="widget-stat-grid">
        <article class="widget-stat widget-stat--primary">
          <span>文稿字数</span>
          <strong>{{ formatNumber(payload.statistics.words) }}</strong>
        </article>
        <article class="widget-stat">
          <span>预计阅读</span>
          <strong>{{ payload.statistics.readingMinutes }}<small> 分钟</small></strong>
        </article>
        <article class="widget-stat">
          <span>非空字符</span>
          <strong>{{ formatNumber(payload.statistics.nonWhitespaceCharacters) }}</strong>
        </article>
        <article class="widget-stat">
          <span>段落</span>
          <strong>{{ formatNumber(payload.statistics.paragraphs) }}</strong>
        </article>
        <article class="widget-stat">
          <span>标题</span>
          <strong>{{ formatNumber(payload.statistics.headings) }}</strong>
        </article>
        <article class="widget-stat">
          <span>引用</span>
          <strong>{{ formatNumber(payload.statistics.links) }}</strong>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
.widget-content {
  min-width: 0;
  height: 100%;
  color: var(--text-primary);
}

.widget-content--platform-preview {
  display: flex;
  min-height: 220px;
}

.widget-preview-scroll {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 220px;
  overflow: auto;
  background: var(--bg-surface);
}

.widget-preview-html {
  min-height: 100%;
}

.widget-content--panel .widget-preview-html {
  padding: 18px;
  box-sizing: border-box;
}

.widget-preview-state {
  width: 100%;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: 12px;
}

.widget-preview-state--empty {
  flex-direction: column;
  padding: 28px;
  text-align: center;
  box-sizing: border-box;
}

.widget-preview-state--empty small {
  max-width: 280px;
  line-height: 1.6;
}

.widget-preview-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--hairline);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: widget-spin 0.8s linear infinite;
}

.widget-preview-sample {
  position: sticky;
  top: 8px;
  z-index: 1;
  float: right;
  margin: 8px 8px -28px 0;
  padding: 3px 7px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-medium);
  background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
  color: var(--text-muted);
  font-size: 10px;
}

.widget-content--references {
  min-height: 180px;
  display: flex;
  flex-direction: column;
}

.widget-content--references.widget-content--panel {
  height: clamp(240px, 44vh, 420px);
  min-height: 240px;
}

.widget-reference-list {
  flex: 1;
  min-height: 0;
  max-height: 100%;
  overflow: auto;
  padding: 2px;
}

.widget-reference-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid var(--hairline);
}

.widget-reference-row:last-child {
  border-bottom: 0;
}

.widget-reference-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.widget-reference-copy strong {
  overflow-wrap: anywhere;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
}

.widget-reference-copy span {
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.widget-reference-actions {
  display: flex;
  gap: 4px;
}

.widget-reference-actions button {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-medium);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.widget-reference-actions button:hover {
  border-color: var(--hairline);
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.widget-reference-empty {
  flex: 1;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 22px;
  text-align: center;
  color: var(--text-muted);
  box-sizing: border-box;
}

.widget-reference-empty strong {
  color: var(--text-secondary);
  font-size: 13px;
}

.widget-reference-empty span {
  max-width: 300px;
  font-size: 11px;
  line-height: 1.6;
}

.widget-action-message {
  margin: 6px 8px 0;
  color: var(--text-muted);
  font-size: 11px;
}

.widget-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.widget-stat {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-large);
  background: var(--bg-surface);
}

.widget-stat--primary {
  border-color: color-mix(in srgb, var(--accent-primary) 28%, var(--hairline));
  background: color-mix(in srgb, var(--accent-primary) 7%, var(--bg-surface));
}

.widget-stat span {
  display: block;
  margin-bottom: 5px;
  color: var(--text-muted);
  font-size: 11px;
}

.widget-stat strong {
  font-size: 20px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.widget-stat strong small {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
}

@keyframes widget-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .widget-preview-spinner { animation: none; }
}
</style>
