<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { Minus, PanelRightOpen, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import InspectorWidgetContent from '@/components/workstation/InspectorWidgetContent.vue'
import { computeContentWordCount } from '@/composables/useTextStats'
import { usePreviewRenderer } from '@/composables/usePreviewRenderer'
import { isLikelyHtmlContent, serializeHtmlToMarkdown } from '@/extensions/TyporaMode'
import {
  buildDocumentStatistics,
  extractExternalLinks,
  INSPECTOR_WIDGET_CHANNEL,
  INSPECTOR_WIDGET_EVENTS,
  INSPECTOR_WIDGET_META,
  InspectorWidgetChannelMessageSchema,
  InspectorWidgetHandshakeSchema,
  InspectorWidgetStateEnvelopeSchema,
  type InspectorWidgetPayload,
  type InspectorWidgetRequest,
} from '@/services/inspector-widgets'
import type { Platform } from '@/services/export'
import { useArticleStore } from '@/stores/article'
import { useEditorStore } from '@/stores/editor'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{
  request: InspectorWidgetRequest
}>()

const articleStore = useArticleStore()
const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const { currentContent } = storeToRefs(editorStore)
const livePayload = ref<InspectorWidgetPayload | null>(null)
const activeArticleId = ref(props.request.articleId)
const runtimeMessage = ref('')
const firstControlRef = ref<HTMLButtonElement | null>(null)
const previousDocumentTitle = document.title
let unlistenState: (() => void) | null = null
let unlistenCloseRequested: (() => void) | null = null
let inspectorWidgetChannel: InstanceType<typeof window.BroadcastChannel> | null = null
let nativeCloseAuthorized = false

const selectedPlatform = computed<Platform>(() => settingsStore.settings.export.defaultPlatform)
const platformLabel = computed(() => ({
  wechat: '微信',
  xiaohongshu: '小红书',
  zhihu: '知乎',
})[selectedPlatform.value])
const normalizedBody = computed(() => {
  const articleId = activeArticleId.value
  const article = articleStore.articles.find(candidate => candidate.id === articleId)
  const body = currentContent.value?.articleId === articleId
    ? currentContent.value.body
    : article?.markdownSource || article?.rawContent || ''
  return isLikelyHtmlContent(body) ? serializeHtmlToMarkdown(body) : body
})
const links = computed(() => extractExternalLinks(normalizedBody.value))

const { previewHtml, previewLoading, previewMeta } = usePreviewRenderer({
  body: normalizedBody,
  platform: selectedPlatform,
  getExportSettings: () => ({ ...settingsStore.settings.export }),
  getAppearance: () => ({
    accentColor: settingsStore.settings.appearance.accentColor,
    fontFamily: settingsStore.settings.appearance.fontFamily,
    typography: {
      ...settingsStore.settings.appearance.typography,
      fontFamily: settingsStore.settings.appearance.fontFamily,
    },
  }),
})

const localPayload = computed<InspectorWidgetPayload>(() => {
  const articleId = activeArticleId.value
  const article = articleStore.articles.find(candidate => candidate.id === articleId)
  return {
    articleId,
    articleTitle: (currentContent.value?.articleId === articleId ? currentContent.value.title : '')
      || article?.title
      || '未命名文稿',
    platform: selectedPlatform.value,
    platformLabel: platformLabel.value,
    previewHtml: previewHtml.value,
    previewLoading: previewLoading.value,
    previewIsSample: Boolean(previewMeta.value?.isSample),
    links: links.value,
    statistics: buildDocumentStatistics(
      normalizedBody.value,
      computeContentWordCount(normalizedBody.value),
      links.value.length,
    ),
    updatedAt: Date.now(),
  }
})

const payload = computed(() => livePayload.value ?? localPayload.value)
const widgetTitle = computed(() => INSPECTOR_WIDGET_META[props.request.surfaceId].title)

function inspectorWidgetHandshake() {
  return {
    surfaceId: props.request.surfaceId,
    articleId: activeArticleId.value,
    windowLabel: props.request.windowLabel,
  }
}

function applyInspectorWidgetContext(value: unknown): boolean {
  const parsed = InspectorWidgetHandshakeSchema.safeParse(value)
  if (!parsed.success
    || parsed.data.surfaceId !== props.request.surfaceId
    || parsed.data.windowLabel !== props.request.windowLabel) return false

  activeArticleId.value = parsed.data.articleId
  livePayload.value = null
  const targetArticle = articleStore.articles.find(article => article.id === parsed.data.articleId)
  if (targetArticle) {
    articleStore.selectArticle(targetArticle.id)
    runtimeMessage.value = ''
  } else {
    runtimeMessage.value = '正在从 InkForge 主窗口同步文稿上下文。'
  }
  return true
}

function applyInspectorWidgetState(value: unknown): void {
  const parsed = InspectorWidgetStateEnvelopeSchema.safeParse(value)
  if (parsed.success && parsed.data.windowLabel === props.request.windowLabel) {
    if (parsed.data.payload.articleId) activeArticleId.value = parsed.data.payload.articleId
    livePayload.value = parsed.data.payload
    runtimeMessage.value = ''
  }
}

function postInspectorWidgetAction(action: 'ready' | 'redock' | 'close'): void {
  inspectorWidgetChannel?.postMessage({
    type: action,
    data: inspectorWidgetHandshake(),
  })
}

async function minimizeWindow(): Promise<void> {
  const { appWindow } = await import('@tauri-apps/api/window')
  await appWindow.minimize()
}

async function closeWindow(action: 'redock' | 'close'): Promise<void> {
  const { emit } = await import('@tauri-apps/api/event')
  nativeCloseAuthorized = true
  try {
    postInspectorWidgetAction(action)
    await emit(INSPECTOR_WIDGET_EVENTS[action], inspectorWidgetHandshake())
  } catch (error) {
    nativeCloseAuthorized = false
    throw error
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return
  event.preventDefault()
  void closeWindow('close')
}

onMounted(async () => {
  document.title = `InkForge · ${widgetTitle.value}`
  const targetArticle = articleStore.articles.find(article => article.id === activeArticleId.value)
  if (targetArticle) {
    articleStore.selectArticle(targetArticle.id)
  } else {
    runtimeMessage.value = '原文稿已不存在，当前只保留最后收到的运行时内容。'
  }

  await nextTick()
  firstControlRef.value?.focus()
  window.addEventListener('keydown', handleKeydown)

  if (typeof window.BroadcastChannel !== 'undefined') {
    inspectorWidgetChannel = new window.BroadcastChannel(INSPECTOR_WIDGET_CHANNEL)
    inspectorWidgetChannel.onmessage = event => {
      const parsed = InspectorWidgetChannelMessageSchema.safeParse(event.data)
      if (!parsed.success) {
        runtimeMessage.value = '小组件通道消息校验失败'
      } else if (parsed.data.type === 'state') {
        applyInspectorWidgetState(parsed.data.data)
      }
    }
  }

  const [{ emit, listen }, { appWindow }] = await Promise.all([
    import('@tauri-apps/api/event'),
    import('@tauri-apps/api/window'),
  ])
  unlistenCloseRequested = await appWindow.onCloseRequested(event => {
    if (nativeCloseAuthorized) return
    event.preventDefault()
    void closeWindow('close').catch(error => {
      runtimeMessage.value = `关闭小组件失败：${error instanceof Error ? error.message : String(error)}`
    })
  })
  unlistenState = await listen<unknown>(INSPECTOR_WIDGET_EVENTS.state, event => {
    const parsed = InspectorWidgetStateEnvelopeSchema.safeParse(event.payload)
    if (parsed.success) {
      applyInspectorWidgetState(parsed.data)
      return
    }
    if (!applyInspectorWidgetContext(event.payload)) {
      runtimeMessage.value = '桌面事件消息校验失败'
      return
    }
    postInspectorWidgetAction('ready')
    void emit(INSPECTOR_WIDGET_EVENTS.ready, inspectorWidgetHandshake()).catch(error => {
      runtimeMessage.value = `文稿上下文握手失败：${error instanceof Error ? error.message : String(error)}`
    })
  })
  postInspectorWidgetAction('ready')
  await emit(INSPECTOR_WIDGET_EVENTS.ready, inspectorWidgetHandshake())
})

onUnmounted(() => {
  document.title = previousDocumentTitle
  window.removeEventListener('keydown', handleKeydown)
  inspectorWidgetChannel?.close()
  unlistenCloseRequested?.()
  unlistenState?.()
})
</script>

<template>
  <main
    class="utility-widget"
    :data-inspector-article-id="payload.articleId"
    :data-inspector-context-source="livePayload ? 'live' : 'local'"
  >
    <header
      class="utility-widget__header"
      data-tauri-drag-region
    >
      <div
        class="utility-widget__identity"
        data-tauri-drag-region
      >
        <span class="utility-widget__mark" />
        <div data-tauri-drag-region>
          <strong>{{ widgetTitle }}</strong>
          <span>{{ payload.articleTitle }} · {{ payload.platformLabel }}</span>
        </div>
      </div>
      <div class="utility-widget__controls">
        <button
          ref="firstControlRef"
          type="button"
          :aria-label="`将${widgetTitle}重新停靠到 InkForge`"
          title="重新停靠到 InkForge"
          @click="closeWindow('redock')"
        >
          <PanelRightOpen :size="14" />
        </button>
        <button
          type="button"
          aria-label="最小化小组件"
          title="最小化"
          @click="minimizeWindow"
        >
          <Minus :size="14" />
        </button>
        <button
          type="button"
          aria-label="关闭小组件"
          title="关闭"
          @click="closeWindow('close')"
        >
          <X :size="14" />
        </button>
      </div>
    </header>

    <p
      v-if="runtimeMessage"
      class="utility-widget__message"
      role="status"
    >
      {{ runtimeMessage }}
    </p>

    <div class="utility-widget__body">
      <InspectorWidgetContent
        :surface-id="request.surfaceId"
        :payload="payload"
      />
    </div>
  </main>
</template>

<style scoped>
.utility-widget {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-surface);
  color: var(--text-primary);
}

.utility-widget__header {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 12px;
  border-bottom: 1px solid var(--hairline);
  background: color-mix(in srgb, var(--bg-surface) 94%, var(--bg-rice-paper));
  user-select: none;
}

.utility-widget__identity {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 9px;
}

.utility-widget__identity > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.utility-widget__identity strong,
.utility-widget__identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.utility-widget__identity strong {
  font-size: 12px;
}

.utility-widget__identity span {
  color: var(--text-muted);
  font-size: 10px;
}

.utility-widget__mark {
  width: 3px;
  height: 22px;
  border-radius: 999px;
  background: var(--accent-primary);
}

.utility-widget__controls {
  align-self: stretch;
  display: flex;
}

.utility-widget__controls button {
  width: 38px;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.utility-widget__controls button:hover {
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.utility-widget__controls button:last-child:hover {
  background: var(--error);
  color: white;
}

.utility-widget__message {
  margin: 0;
  padding: 8px 12px;
  border-bottom: 1px solid var(--hairline);
  color: var(--text-muted);
  font-size: 11px;
}

.utility-widget__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
}

.utility-widget__body :deep(.widget-content--platform-preview) {
  margin: -12px;
  height: calc(100% + 24px);
}
</style>
