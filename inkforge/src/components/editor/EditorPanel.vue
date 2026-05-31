<script setup lang="ts">
/**
 * EditorPanel — Typora / Source 双模式编辑器
 *
 * 约束：
 * 1. 继续沿用手动 new Editor({ element }) 挂载，避免 EditorContent 交换元素导致的崩溃
 * 2. Typora 模式以 TipTap + TyporaMode 扩展为主，Source 模式复用现有 MarkdownEditor
 * 3. 当前主链以 Markdown 作为跨组件/导出/预览的兼容权威格式
 */
import { ref, watch, computed, shallowRef, onMounted, onBeforeUnmount } from 'vue'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import ListItem from '@tiptap/extension-list-item'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import UnderlineExtension from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import { TableV2Extensions } from '@/extensions/TableV2'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Dropcursor from '@tiptap/extension-dropcursor'
import { useEditorStore } from '@/stores/editor'
import { storeToRefs } from 'pinia'
import { Loader2, AlertTriangle } from 'lucide-vue-next'
import FloatingToolbar from './FloatingToolbar.vue'
import type { EditedContent } from '@/types'
import EditorEmptyState from './EditorEmptyState.vue'
import { WeChatFormat } from '@/extensions/WeChatFormat'
import { SmartPunctuation } from '@/extensions/SmartPunctuation'
import type { SmartPunctuationRuleSettings } from '@/services/smart-punctuation'
import { TypewriterMode } from '@/extensions/TypewriterMode'
import { KeyboardShortcuts, type FindReplaceMode } from '@/extensions/KeyboardShortcuts'
import { EditorKeymap } from '@/extensions/EditorKeymap'
import { SlashCommands } from '@/extensions/SlashCommands'
import { SnippetExpansion } from '@/extensions/SnippetExpansion'
import { useSettingsStore } from '@/stores/settings'
import { useAssetStore } from '@/stores/asset'
import { useSnippetStore } from '@/stores/snippet'
import { useWritingAssistStore } from '@/stores/writingAssist'
import { ImageV2Extension, ImageDropPaste, type ImageIngressState, type InsertedImageAsset } from '@/extensions/ImageV2'
import { RichCodeBlock } from '@/extensions/RichCodeBlock'
import { DetailsBlock } from '@/extensions/DetailsBlock'
import { CitationMarks } from '@/extensions/CitationMarks'
import { BlockDragHandle } from '@/extensions/BlockDragHandle'
import { createInkforgeLowlight } from '@/extensions/codeLanguages'
import { createInkforgeAssetUrl } from '@/utils/asset-url'
import type { SnippetContext } from '@/services/snippet'
import { registerActiveEditor } from '@/services/dev-tools'
import SlashCommandMenu from './SlashCommandMenu.vue'
import TableFloatingToolbar from './TableFloatingToolbar.vue'
import EditorContextMenu from './EditorContextMenu.vue'
import FindReplace from './FindReplace.vue'
import MarkdownEditor from './MarkdownEditor.vue'
import {
  TyporaMode,
  TYPORA_MODE_REFRESH_META,
  type EditorMode,
  type EditorWidth,
  type TyporaSyncState,
  isLikelyHtmlContent,
  renderMarkdownToHtml,
  serializeHtmlToMarkdown,
} from '@/extensions/TyporaMode'

const props = withDefaults(defineProps<{
  editorMode?: EditorMode
  editorWidth?: EditorWidth
  isFocusMode?: boolean
  externalPreviewActive?: boolean
}>(), {
  editorMode: 'typora',
  editorWidth: 'medium',
  isFocusMode: false,
  externalPreviewActive: false,
})

const emit = defineEmits<{
  (e: 'sync-state-change', value: TyporaSyncState): void
  (e: 'toggle-editor-mode'): void
}>()

// lowlight 实例 (代码高亮引擎)
const lowlight = createInkforgeLowlight()

const InkforgeListItem = ListItem.extend({
  addAttributes() {
    return {
      footnoteId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.dataset.footnoteId ?? null,
        renderHTML: attributes => attributes.footnoteId ? { 'data-footnote-id': attributes.footnoteId } : {},
      },
    }
  },

  addKeyboardShortcuts() {
    return {}
  },
})

const InkforgeTaskItem = TaskItem.extend({
  addKeyboardShortcuts() {
    return {}
  },
})

const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const assetStore = useAssetStore()
const snippetStore = useSnippetStore()
const writingAssistStore = useWritingAssistStore()
const { currentContent, status: editorStatus, error: editorError } = storeToRefs(editorStore)

// 派生状态
const isReady = computed(() => editorStatus.value === 'ready' || editorStatus.value === 'saving')
const isLoading = computed(() => editorStatus.value === 'loading')

// 本地编辑状态
const titleText = ref('')
const transcriptText = ref('')
const sourceMarkdown = ref('')

type TyporaExtensionRecord = {
  name: string
  options: {
    enabled?: boolean | (() => boolean)
    rules?: SmartPunctuationRuleSettings | (() => SmartPunctuationRuleSettings)
    cursorPosition?: number
  }
}

const widthMap: Record<EditorWidth, string> = {
  narrow: '560px',
  medium: '680px',
  wide: '860px',
  full: 'calc(100% - 64px)',
}

const isSourceMode = computed(() => props.editorMode === 'source')
const editorMode = computed(() => props.editorMode)
const editorPaperWidth = computed(() => widthMap[props.editorWidth] ?? widthMap.medium)

let isHydratingFromStore = false
let isApplyingSourceProjection = false
let saveTimeout: ReturnType<typeof setTimeout> | undefined
let sourceProjectionTimeout: ReturnType<typeof setTimeout> | undefined
let pendingSaveSequence = 0
let hydrationSequence = 0
let hydratedArticleId: string | null = null

const syncState = ref<TyporaSyncState>('offline')

function setSyncState(nextState: TyporaSyncState) {
  if (syncState.value === nextState) {
    return
  }

  syncState.value = nextState
  emit('sync-state-change', nextState)
}

// ═══ Settings → CSS Variables ═══
const editorFontFamily = computed(() => {
  const f = settingsStore.settings.appearance.fontFamily
  switch (f) {
    case 'serif': return "'Noto Serif SC', Georgia, 'Times New Roman', serif"
    case 'sans': return "'Noto Sans SC', -apple-system, system-ui, sans-serif"
    case 'mono': return "'JetBrains Mono', 'Fira Code', monospace"
    default: return "'Noto Serif SC', Georgia, serif"
  }
})
const editorFontSize = computed(() => `${settingsStore.settings.appearance.fontSize}px`)
const editorLineHeight = computed(() => String(settingsStore.settings.appearance.lineHeight))

// ═══ 手动 Editor 管理 ═══
// 直接操作 Editor 实例，不使用 useEditor/EditorContent
const editorContainerRef = ref<HTMLElement | null>(null)
const editorScrollRef = ref<HTMLElement | null>(null)
const bodyEditor = shallowRef<Editor | null>(null)
let cleanupDevPanelEditorBridge: (() => void) | null = null

function syncDevPanelEditorBridge(): void {
  cleanupDevPanelEditorBridge?.()
  cleanupDevPanelEditorBridge = null

  if (!bodyEditor.value) return

  cleanupDevPanelEditorBridge = registerActiveEditor({
    editor: bodyEditor.value,
    scrollElement: editorScrollRef.value,
    articleId: currentContent.value?.articleId ?? null,
    title: currentContent.value?.title ?? null,
  })
}
type FloatingToolbarExpose = {
  openLinkEditor: () => void
}

type ManualVueNodeViewEditor = Editor & {
  contentComponent?: unknown
  createNodeViews?: () => void
}

const manualContentComponentSentinel = { source: 'manual-editor-mount' }

function enableManualVueNodeViews(editor: Editor): void {
  const manualEditor = editor as ManualVueNodeViewEditor
  manualEditor.contentComponent ??= manualContentComponentSentinel
  manualEditor.createNodeViews?.()
}

const floatingToolbarRef = ref<FloatingToolbarExpose | null>(null)
const findReplaceVisible = ref(false)
const findReplaceMode = ref<FindReplaceMode>('find')
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

function getShortcutBinding(shortcutId: string): string | undefined {
  return settingsStore.settings.shortcuts[shortcutId]
}

function openFindReplace(mode: FindReplaceMode): void {
  findReplaceMode.value = mode
  findReplaceVisible.value = true
}

function closeFindReplace(): void {
  findReplaceVisible.value = false
}

function openLinkEditorFromShortcut(): void {
  floatingToolbarRef.value?.openLinkEditor()
}

function requestEditorModeToggle(): void {
  emit('toggle-editor-mode')
}

async function readSnippetClipboardText(): Promise<string> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
    return ''
  }

  try {
    return await navigator.clipboard.readText()
  } catch {
    return ''
  }
}

async function buildSnippetContext(): Promise<SnippetContext> {
  const selection = bodyEditor.value?.state.selection
  const selectedText = selection && !selection.empty && bodyEditor.value
    ? bodyEditor.value.state.doc.textBetween(selection.from, selection.to, '\n', '\n')
    : ''

  return {
    articleId: currentContent.value?.articleId ?? null,
    articleTitle: currentContent.value?.title ?? titleText.value,
    authorName: '',
    selectedText,
    clipboardText: await readSnippetClipboardText(),
    tags: [],
    now: new Date(),
  }
}

function openContextMenu(event: MouseEvent): void {
  if (!bodyEditor.value) {
    return
  }

  event.preventDefault()
  contextMenuX.value = Math.min(event.clientX, window.innerWidth - 288)
  contextMenuY.value = Math.min(event.clientY, window.innerHeight - 420)
  contextMenuVisible.value = true
}

function closeContextMenu(): void {
  contextMenuVisible.value = false
}

function requestContextImageInsert(): void {
  if (bodyEditor.value) {
    requestImageFileInsert(bodyEditor.value)
  }
}

function requestContextFindReplace(): void {
  openFindReplace('replace')
}

const imageIngressState = ref<ImageIngressState>('idle')
const imageIngressError = ref<string | null>(null)
const showImageIngressOverlay = computed(() => imageIngressState.value === 'dragging' || imageIngressState.value === 'uploading')

function setImageIngressState(nextState: ImageIngressState): void {
  imageIngressState.value = nextState
  if (nextState !== 'idle') {
    imageIngressError.value = null
  }
}

function reportImageIngressError(message: string): void {
  imageIngressError.value = message
  imageIngressState.value = 'idle'
  window.setTimeout(() => {
    if (imageIngressError.value === message) {
      imageIngressError.value = null
    }
  }, 4200)
}

async function uploadEditorImage(file: File): Promise<InsertedImageAsset> {
  const asset = await assetStore.uploadAsset(file, currentContent.value?.articleId)

  return {
    assetId: asset.id,
    src: createInkforgeAssetUrl(asset.id),
    alt: asset.name,
    title: asset.name,
    width: asset.width,
    height: asset.height,
    naturalWidth: asset.width,
    naturalHeight: asset.height,
    link: null,
  }
}

function insertUploadedImage(editor: Editor, image: InsertedImageAsset): void {
  editor.chain().focus().insertContent({
    type: 'image',
    attrs: {
      src: image.src,
      alt: image.alt,
      title: image.title ?? null,
      assetId: image.assetId,
      width: image.width ?? null,
      height: image.height ?? null,
      naturalWidth: image.naturalWidth ?? image.width ?? null,
      naturalHeight: image.naturalHeight ?? image.height ?? null,
      align: 'center',
      caption: '',
      link: image.link ?? null,
    },
  }).run()
}

function requestImageFileInsert(editor: Editor): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) {
      return
    }

    setImageIngressState('uploading')
    void uploadEditorImage(file)
      .then((image) => insertUploadedImage(editor, image))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Image insertion failed'
        reportImageIngressError(message)
      })
      .finally(() => setImageIngressState('idle'))
  }
  input.click()
}

function initializeBodyEditor(): void {
  if (!editorContainerRef.value || bodyEditor.value) return

  void snippetStore.loadSnippets()

  // 直接在真实 DOM 元素上创建 Editor，跳过元素交换
  bodyEditor.value = new Editor({
    element: editorContainerRef.value,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
        dropcursor: false,
        listItem: false,
      }),
      InkforgeListItem,
      Placeholder.configure({
        placeholder: '开始写作...'
      }),
      CharacterCount,
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        HTMLAttributes: {
          class: 'editor-link',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      WeChatFormat,
      SmartPunctuation.configure({
        enabled: () => settingsStore.settings.editor.smartPunctuation && !isSourceMode.value,
        rules: () => settingsStore.settings.editor.smartPunctuationRules,
      }),
      TypewriterMode.configure({
        enabled: settingsStore.settings.editor.typewriterMode,
        cursorPosition: writingAssistStore.cursorPosition,
      }),
      TyporaMode.configure({
        enabled: props.editorMode === 'typora' && settingsStore.settings.editor.highlightActiveLine,
      }),
      KeyboardShortcuts.configure({
        getBinding: getShortcutBinding,
        onFindReplace: openFindReplace,
        onLinkRequested: openLinkEditorFromShortcut,
        onToggleEditorMode: requestEditorModeToggle,
      }),
      EditorKeymap.configure({
        getListEnterBehavior: () => settingsStore.settings.editor.listEnterBehavior,
        getCodeBlockIndent: () => ' '.repeat(settingsStore.settings.editor.tabSize),
      }),
      SnippetExpansion.configure({
        getSnippets: () => snippetStore.snippets,
        getContext: buildSnippetContext,
        onSnippetExpanded: async (snippetId) => {
          await snippetStore.recordUsage(snippetId)
        },
        enabled: () => !isSourceMode.value,
      }),
      ImageV2Extension.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'editor-image' },
      }),
      ImageDropPaste.configure({
        uploadImage: uploadEditorImage,
        onStateChange: setImageIngressState,
        onError: reportImageIngressError,
      }),
      ...TableV2Extensions,
      TaskList,
      InkforgeTaskItem.configure({ nested: true }),
      RichCodeBlock.configure({ lowlight }),
      DetailsBlock,
      BlockDragHandle.configure({
        enabled: () => editorMode.value === 'typora',
      }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      ...CitationMarks,
      Subscript,
      Superscript,
      Dropcursor.configure({ color: '#D32F2F', width: 2 }),
      SlashCommands.configure({
        onImageRequested: requestImageFileInsert,
        onLinkRequested: () => openLinkEditorFromShortcut(),
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (isHydratingFromStore || isApplyingSourceProjection || isSourceMode.value) {
        return
      }

      const nextMarkdown = serializeHtmlToMarkdown(editor.getHTML())
      if (nextMarkdown !== sourceMarkdown.value) {
        sourceMarkdown.value = nextMarkdown
      }

      schedulePersist(nextMarkdown)
    }
  })

  enableManualVueNodeViews(bodyEditor.value)
  if (import.meta.env.DEV) {
    ;(window as unknown as { __inkforgeEditor?: unknown }).__inkforgeEditor = bodyEditor.value
  }
  syncDevPanelEditorBridge()

  setSyncState(editorStatus.value === 'ready' || editorStatus.value === 'saving' ? 'synced' : 'offline')

  if (currentContent.value && isReady.value) {
    void hydrateEditorContent(currentContent.value)
  }
}

onMounted(() => {
  initializeBodyEditor()
})

watch(
  () => [isReady.value, editorContainerRef.value] as const,
  () => initializeBodyEditor(),
  { flush: 'post' },
)

// 设置 → 扩展实时同步
watch(
  () => settingsStore.settings.editor,
  (editorSettings) => {
    if (!bodyEditor.value) return
    const exts = bodyEditor.value.extensionManager.extensions as TyporaExtensionRecord[]
    const sp = exts.find(e => e.name === 'smartPunctuation')
    if (sp) {
      sp.options.enabled = () => editorSettings.smartPunctuation && !isSourceMode.value
      sp.options.rules = () => editorSettings.smartPunctuationRules
    }
    const tw = exts.find(e => e.name === 'typewriterMode')
    if (tw) {
      tw.options.enabled = editorSettings.typewriterMode
      tw.options.cursorPosition = writingAssistStore.cursorPosition
    }
    const typora = exts.find(e => e.name === 'typoraMode')
    if (typora) {
      typora.options.enabled = props.editorMode === 'typora' && editorSettings.highlightActiveLine
    }
    bodyEditor.value.view.dispatch(bodyEditor.value.state.tr.setMeta(TYPORA_MODE_REFRESH_META, Date.now()))
  },
  { deep: true }
)

// writingAssist → TypewriterMode 光标位置实时同步
// 不触发 TYPORA_MODE_REFRESH_META：cursorPosition 仅影响下一次光标移动的滚动计算，无需重绘装饰
watch(
  () => writingAssistStore.cursorPosition,
  (nextCursorPosition) => {
    if (!bodyEditor.value) return
    const exts = bodyEditor.value.extensionManager.extensions as TyporaExtensionRecord[]
    const tw = exts.find(e => e.name === 'typewriterMode')
    if (tw) {
      tw.options.cursorPosition = nextCursorPosition
    }
  },
  { flush: 'post' },
)

watch(
  () => [props.editorMode, settingsStore.settings.editor.highlightActiveLine] as const,
  ([mode, highlightActiveLine]) => {
    if (!bodyEditor.value) return
    const exts = bodyEditor.value.extensionManager.extensions as TyporaExtensionRecord[]
    const typora = exts.find(e => e.name === 'typoraMode')
    if (typora) {
      typora.options.enabled = mode === 'typora' && highlightActiveLine
    }
    bodyEditor.value.view.dispatch(bodyEditor.value.state.tr.setMeta(TYPORA_MODE_REFRESH_META, Date.now()))

    if (mode === 'typora' && sourceMarkdown.value) {
      void projectMarkdownToTypora(sourceMarkdown.value)
    }
  },
)

async function hydrateEditorContent(content: EditedContent): Promise<void> {
  const currentHydration = ++hydrationSequence
  const rawBody = content.body ?? ''
  const markdown = isLikelyHtmlContent(rawBody)
    ? serializeHtmlToMarkdown(rawBody)
    : rawBody
  const html = isLikelyHtmlContent(rawBody)
    ? rawBody
    : await renderMarkdownToHtml(markdown)

  if (hydrationSequence !== currentHydration) {
    return
  }

  isHydratingFromStore = true
  titleText.value = content.title
  transcriptText.value = content.transcript
  sourceMarkdown.value = markdown
  void assetStore.loadAssets(content.articleId)

  if (bodyEditor.value && bodyEditor.value.getHTML() !== html) {
    bodyEditor.value.commands.setContent(html || '', true)
  }
  hydratedArticleId = content.articleId

  requestAnimationFrame(() => {
    isHydratingFromStore = false
  })

  setSyncState(isReady.value ? 'synced' : 'offline')
}

// 同步内容 (仅当 Ready 时)
watch(currentContent, (content: EditedContent | null) => {
  syncDevPanelEditorBridge()
  if (!content || !isReady.value) {
    return
  }

  const rawBody = content.body ?? ''
  const normalizedBody = isLikelyHtmlContent(rawBody)
    ? serializeHtmlToMarkdown(rawBody)
    : rawBody
  const isLocalPersistenceEcho =
    hydratedArticleId === content.articleId &&
    normalizedBody === sourceMarkdown.value &&
    titleText.value === content.title &&
    transcriptText.value === content.transcript

  if (isLocalPersistenceEcho) {
    setSyncState('synced')
    return
  }

  void hydrateEditorContent(content)
}, { immediate: true })

// 监听状态变化，重置编辑器
watch(editorStatus, (newStatus) => {
  if (newStatus === 'loading' || newStatus === 'idle') {
    titleText.value = ''
    transcriptText.value = ''
    sourceMarkdown.value = ''
    hydratedArticleId = null
    bodyEditor.value?.commands.setContent('')
    setSyncState('offline')
    return
  }

  if (newStatus === 'error') {
    setSyncState('offline')
    return
  }

  setSyncState('synced')
})

// ═══ Auto Save (防抖) ═══
function schedulePersist(markdown: string) {
  if (!isReady.value) return

  setSyncState('syncing')
  const saveSequence = ++pendingSaveSequence
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    void persistMarkdown(markdown, saveSequence)
  }, 900)
}

async function persistMarkdown(markdown: string, saveSequence: number) {
  if (!isReady.value) return
  const currentBody = currentContent.value?.body ?? ''
  const normalizedCurrentBody = isLikelyHtmlContent(currentBody)
    ? serializeHtmlToMarkdown(currentBody)
    : currentBody

  if (
    normalizedCurrentBody === markdown &&
    titleText.value === (currentContent.value?.title ?? '') &&
    transcriptText.value === (currentContent.value?.transcript ?? '')
  ) {
    if (saveSequence === pendingSaveSequence) {
      setSyncState('synced')
    }
    return
  }

  await editorStore.updateContent({
    title: titleText.value,
    body: markdown,
    transcript: transcriptText.value
  })

  if (saveSequence === pendingSaveSequence) {
    setSyncState('synced')
  }
}

async function projectMarkdownToTypora(markdown: string): Promise<void> {
  if (!bodyEditor.value) {
    return
  }

  const html = await renderMarkdownToHtml(markdown)
  if (bodyEditor.value.getHTML() === html) {
    return
  }

  isApplyingSourceProjection = true
  bodyEditor.value.commands.setContent(html || '', true)
  requestAnimationFrame(() => {
    isApplyingSourceProjection = false
  })
}

function handleSourceUpdate(nextMarkdown: string) {
  sourceMarkdown.value = nextMarkdown
  setSyncState('syncing')

  clearTimeout(sourceProjectionTimeout)
  sourceProjectionTimeout = setTimeout(() => {
    void projectMarkdownToTypora(nextMarkdown)
  }, 120)

  schedulePersist(nextMarkdown)
}

async function flushPendingChanges(): Promise<void> {
  clearTimeout(saveTimeout)
  clearTimeout(sourceProjectionTimeout)

  if (isSourceMode.value) {
    await projectMarkdownToTypora(sourceMarkdown.value)
    await persistMarkdown(sourceMarkdown.value, ++pendingSaveSequence)
    return
  }

  const currentMarkdown = serializeHtmlToMarkdown(bodyEditor.value?.getHTML() ?? '')
  sourceMarkdown.value = currentMarkdown
  await persistMarkdown(currentMarkdown, ++pendingSaveSequence)
}

// 暴露编辑器实例供外部组件（如 OutlinePanel）使用
defineExpose({
  getBodyEditor: () => bodyEditor.value ?? undefined,
  getEditorScrollElement: () => editorScrollRef.value,
  flushPendingChanges,
})

onBeforeUnmount(() => {
  cleanupDevPanelEditorBridge?.()
  cleanupDevPanelEditorBridge = null
  bodyEditor.value?.destroy()
  bodyEditor.value = null
  clearTimeout(saveTimeout)
  clearTimeout(sourceProjectionTimeout)
})
</script>

<template>
  <div class="editor-panel">
    <!-- 1. Loading -->
    <div
      v-if="isLoading"
      class="state-container loading"
    >
      <Loader2
        :size="32"
        class="animate-spin"
      />
      <p>正在加载内容...</p>
    </div>

    <!-- 2. Error -->
    <div
      v-else-if="editorStatus === 'error'"
      class="state-container error"
    >
      <AlertTriangle :size="32" />
      <h3>发生错误</h3>
      <p>{{ editorError }}</p>
    </div>

    <!-- 3. Idle (空状态) -->
    <EditorEmptyState v-else-if="editorStatus === 'idle'" />

    <!--
      4. 编辑器层 — 始终挂载在 DOM 中（v-show）
      Editor 直接用 new Editor({ element }) 挂载到 editorContainerRef，
      不使用 EditorContent 的元素交换流程，彻底避免 localsInner 崩溃。
    -->
    <div
      v-else-if="isReady"
      class="editor-mode-shell"
      :class="[`mode-${editorMode}`]"
    >
      <div
        v-show="!isSourceMode"
        ref="editorScrollRef"
        class="editor-scroll"
      >
        <div
          class="editor-paper"
          :style="{
            '--paper-font': editorFontFamily,
            '--paper-size': editorFontSize,
            '--paper-lh': editorLineHeight,
            '--paper-max-width': editorPaperWidth,
          }"
        >
          <!-- 编辑器直接挂载点 — Editor 在 onMounted 时直接挂到这个 div -->
          <div
            ref="editorContainerRef"
            class="tiptap-content"
            @contextmenu="openContextMenu"
          />
          <div
            v-if="showImageIngressOverlay"
            class="image-ingress-overlay"
            :class="imageIngressState"
          >
            <Loader2
              v-if="imageIngressState === 'uploading'"
              :size="28"
              class="animate-spin"
            />
            <span>{{ imageIngressState === 'uploading' ? '正在写入图片资产...' : '释放以插入图片' }}</span>
          </div>
          <div
            v-if="imageIngressError"
            class="image-ingress-error"
          >
            <AlertTriangle :size="16" />
            <span>{{ imageIngressError }}</span>
          </div>
          <FloatingToolbar
            ref="floatingToolbarRef"
            :editor="bodyEditor ?? undefined"
          />
          <TableFloatingToolbar :editor="bodyEditor ?? undefined" />
          <FindReplace
            v-if="findReplaceVisible"
            :editor="bodyEditor ?? undefined"
            :mode="findReplaceMode"
            @close="closeFindReplace"
          />
          <SlashCommandMenu :editor="bodyEditor ?? undefined" />
          <EditorContextMenu
            :editor="bodyEditor ?? undefined"
            :visible="contextMenuVisible"
            :x="contextMenuX"
            :y="contextMenuY"
            @close="closeContextMenu"
            @request-link="openLinkEditorFromShortcut"
            @request-image="requestContextImageInsert"
            @request-find-replace="requestContextFindReplace"
          />
        </div>
      </div>

      <div
        v-if="isSourceMode"
        class="source-mode-layout"
      >
        <section class="source-pane source-pane-editor">
          <MarkdownEditor
            :model-value="sourceMarkdown"
            placeholder="# 开始写作..."
            @update:model-value="handleSourceUpdate"
          />
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   EditorPanel — Paper-style (Ethereal Constructivism)
   参考: prototype/inkforge_workstation.html
   ═══════════════════════════════════════════════════════════════════ */

.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-rice-paper);
  position: relative;
  overflow: hidden;
}

/* ─── 居中滚动容器 ─── */
.editor-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 32px;
  background: var(--bg-rice-paper, #FAFBFC);
}

/* ─── 纸张 ─── */
.editor-paper {
  width: 100%;
  max-width: var(--paper-max-width, 680px);
  min-height: 800px;
  margin: 0 auto;
  background: var(--bg-surface, #FFFFFF);
  border-radius: 2px;
  box-shadow: var(--elev-1);
  padding: 64px 72px;
  outline: none;
  transition: box-shadow var(--motion-base) var(--ease-out-quart);
  align-self: flex-start;
  position: relative;
}

.editor-paper:focus-within {
  box-shadow: var(--elev-2);
}

.image-ingress-overlay {
  position: absolute;
  inset: 22px;
  z-index: 35;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--ember);
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  pointer-events: none;
  background: var(--bg-surface);
  border: 2px dashed var(--ember-border);
  border-radius: 18px;
  box-shadow: inset 0 0 0 1px var(--ember-soft);
  backdrop-filter: blur(6px);
}

.image-ingress-overlay.uploading {
  color: var(--warning);
  background: var(--bg-surface);
  border-color: var(--warning);
}

.image-ingress-error {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 36;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(420px, calc(100% - 36px));
  padding: 10px 12px;
  color: var(--error);
  font-size: 0.86rem;
  background: var(--error-light);
  border: 1px solid var(--ember-border);
  border-radius: 12px;
  box-shadow: var(--elev-2);
}

/* ─── TipTap ProseMirror ─── */
.tiptap-content {
  position: relative;
}

/* ─── Block drag handle ─── */
.tiptap-content :deep(.block-drag-handle) {
  position: absolute;
  z-index: 42;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 6px;
  opacity: 0;
  cursor: grab;
  pointer-events: none;
  transition: opacity var(--motion-base) var(--ease-out-quart),
    color var(--motion-base) var(--ease-out-quart),
    background var(--motion-base) var(--ease-out-quart);
}

.tiptap-content :deep(.block-drag-handle[data-visible="true"]) {
  opacity: 1;
  pointer-events: auto;
}

.tiptap-content :deep(.block-drag-handle:hover) {
  color: var(--text-secondary);
  background: var(--ember-soft);
}

.tiptap-content :deep(.block-drag-handle:active) {
  color: var(--ember);
  cursor: grabbing;
}

.tiptap-content :deep(.block-drag-source) {
  opacity: 0.42;
}

.tiptap-content :deep(.block-drag-insert-line) {
  height: 2px;
  margin: 6px 0;
  background: var(--ember);
  border-radius: 999px;
  box-shadow: 0 0 0 1px var(--ember-soft), var(--glow-ember);
  pointer-events: none;
}

:global(.block-drag-ghost) {
  position: fixed;
  top: -10000px;
  left: -10000px;
  z-index: 9999;
  max-height: 220px;
  overflow: hidden;
  padding: 8px 12px;
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px dashed var(--hairline);
  border-radius: 8px;
  box-shadow: var(--elev-3);
  opacity: 0.78;
  pointer-events: none;
}

.tiptap-content :deep(.ProseMirror) {
  outline: none;
  min-height: 600px;
  font-family: var(--paper-font, 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif);
  font-size: var(--paper-size, 17px);
  line-height: var(--paper-lh, 1.618);
  color: #37474F;
  letter-spacing: 0.01em;
  caret-color: #D32F2F;
}

.tiptap-content :deep(.ProseMirror.typora-mode-enabled) {
  position: relative;
}

/*
 * TyporaMode active-line marker.
 *
 * Background/highlight is gated on `[data-typora-node]` instead of the bare
 * `.typora-active-line` class because the class attribute can leak across
 * renders when ProseMirror's per-plugin decoration diff fails to strip the
 * class from previously-active blocks (data attributes from the same
 * Decoration.node are still cleaned up reliably). Gating on the data attribute
 * keeps the active-line highlight constrained to the single block whose data
 * attributes are currently present.
 */
.tiptap-content :deep(.ProseMirror .typora-active-line) {
  position: relative;
  border-radius: 6px;
}

.tiptap-content :deep(.ProseMirror .typora-active-line[data-typora-node]) {
  background: rgba(211, 47, 47, 0.035);
}

.tiptap-content :deep(.ProseMirror .typora-active-line[data-typora-block-token]:not([data-typora-block-token=""]))::before {
  content: attr(data-typora-block-token);
  position: absolute;
  right: calc(100% + 12px);
  top: 0;
  color: rgba(55, 71, 79, 0.45);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: inherit;
  letter-spacing: 0;
  white-space: nowrap;
  pointer-events: none;
}

.tiptap-content :deep(.ProseMirror .typora-active-line[data-typora-inline-tokens]:not([data-typora-inline-tokens=""]))::after {
  content: attr(data-typora-inline-tokens);
  position: absolute;
  left: calc(100% + 12px);
  top: 0;
  color: rgba(55, 71, 79, 0.38);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  line-height: inherit;
  white-space: nowrap;
  pointer-events: none;
}

/* ─── Selection 样式 ─── */
.tiptap-content :deep(.ProseMirror ::selection) {
  background: rgba(211, 47, 47, 0.12);
}

.tiptap-content :deep(.ProseMirror h1) {
  font-family: 'Noto Serif SC', serif;
  font-size: 26px;
  font-weight: 700;
  color: #263238;
  margin: 1.2em 0 0.6em;
  line-height: 1.4;
}

.tiptap-content :deep(.ProseMirror h2) {
  font-family: 'Noto Serif SC', serif;
  font-size: 20px;
  font-weight: 600;
  margin: 1em 0 0.5em;
  color: #263238;
  letter-spacing: -0.2px;
}

.tiptap-content :deep(.ProseMirror h3) {
  font-family: 'Noto Serif SC', serif;
  font-size: 17px;
  font-weight: 600;
  margin: 0.8em 0 0.4em;
  color: #37474F;
}

.tiptap-content :deep(.ProseMirror p) {
  font-family: var(--paper-font, 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif);
  font-size: var(--paper-size, 17px);
  line-height: var(--paper-lh, 1.618);
  color: #37474F;
  margin-bottom: 0.8em;
}

.tiptap-content :deep(.ProseMirror blockquote) {
  border-left: 3px solid var(--hairline);
  background: var(--bg-rice-paper);
  padding: 12px 16px;
  margin: 16px 0;
  color: #607D8B;
  font-style: italic;
}

.tiptap-content :deep(.ProseMirror code) {
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg-rice-paper);
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 14px;
  color: #37474F;
}

.tiptap-content :deep(.ProseMirror pre) {
  background: #263238;
  color: #ECEFF1;
  padding: 16px 20px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  overflow-x: auto;
  margin: 24px 0;
}

.tiptap-content :deep(.ProseMirror pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

.tiptap-content :deep(.ProseMirror ul),
.tiptap-content :deep(.ProseMirror ol) {
  margin-left: 1.2em;
  margin-top: 12px;
  margin-bottom: 12px;
  padding-left: 0;
}

.tiptap-content :deep(.ProseMirror li) {
  margin-bottom: 0.4em;
}

.tiptap-content :deep(.ProseMirror hr) {
  border: none;
  height: 1px;
  background: var(--hairline);
  margin: 24px 0;
}

.tiptap-content :deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 16px 0;
}

/* Placeholder */
.tiptap-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #90A4AE;
  pointer-events: none;
  height: 0;
  font-style: italic;
}

/* ─── 链接样式 ─── */
.tiptap-content :deep(.ProseMirror a),
.tiptap-content :deep(.ProseMirror .editor-link) {
  color: #1565C0;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  transition: color 0.15s ease;
}

.tiptap-content :deep(.ProseMirror a:hover),
.tiptap-content :deep(.ProseMirror .editor-link:hover) {
  color: #0D47A1;
}

/* ─── 下划线样式 ─── */
.tiptap-content :deep(.ProseMirror u) {
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ─── 状态容器 ─── */
.state-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-muted);
}

.state-container.error {
  color: var(--error);
}

/* ─── 滚动条 ─── */
.editor-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

.editor-scroll::-webkit-scrollbar {
  width: 8px;
}

.editor-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.editor-scroll::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.editor-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--ember-border);
  background-clip: padding-box;
}

.editor-mode-shell {
  display: flex;
  flex: 1;
  min-height: 0;
}

.source-mode-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  background: var(--bg-rice-paper);
}

.source-pane {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.source-pane-editor {
  min-width: 0;
}

.source-pane :deep(.markdown-editor) {
  flex: 1;
  min-height: 0;
  background: var(--bg-rice-paper);
}

/* ─── 动画 ─── */
.animate-spin {
  animation: spin 1s linear infinite;
}

/* ─── 表格样式 ─── */
.tiptap-content :deep(.ProseMirror .tableWrapper) {
  max-width: 100%;
  margin: 24px 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--ember-border) transparent;
}

.tiptap-content :deep(.ProseMirror .tableWrapper::-webkit-scrollbar) {
  height: 6px;
}

.tiptap-content :deep(.ProseMirror .tableWrapper::-webkit-scrollbar-thumb) {
  background: var(--ember-border);
  border-radius: 999px;
}

.tiptap-content :deep(.ProseMirror .tableWrapper > table) {
  margin: 0;
}

.tiptap-content :deep(.ProseMirror table) {
  border-collapse: collapse;
  width: 100%;
  margin: 24px 0;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid var(--hairline);
}

.tiptap-content :deep(.ProseMirror .tableWrapper > table) {
  margin: 0;
}

.tiptap-content :deep(.ProseMirror th),
.tiptap-content :deep(.ProseMirror td) {
  border: 1px solid var(--hairline);
  padding: 8px 12px;
  text-align: left;
  vertical-align: top;
  min-width: 80px;
}

.tiptap-content :deep(.ProseMirror th) {
  background: var(--bg-rice-paper);
  font-weight: 600;
  font-size: 0.95em;
  color: var(--text-primary);
}

.tiptap-content :deep(.ProseMirror td) {
  background: var(--bg-surface);
}

.tiptap-content :deep(.ProseMirror tr:nth-child(even) td) {
  background: var(--bg-rice-paper);
}

.tiptap-content :deep(.ProseMirror .selectedCell) {
  background: var(--ember-soft);
}

.tiptap-content :deep(.ProseMirror .column-resize-handle) {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--text-muted);
  cursor: col-resize;
}

/* ─── 任务列表样式 ─── */
.tiptap-content :deep(.ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 4px;
  margin: 12px 0;
}

.tiptap-content :deep(.ProseMirror ul[data-type="taskList"] li) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.tiptap-content :deep(.ProseMirror ul[data-type="taskList"] li label) {
  display: flex;
  align-items: center;
  margin-top: 3px;
}

.tiptap-content :deep(.ProseMirror ul[data-type="taskList"] li label input[type="checkbox"]) {
  width: 16px;
  height: 16px;
  accent-color: #D32F2F;
  cursor: pointer;
  border-radius: 3px;
}

.tiptap-content :deep(.ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div > p) {
  text-decoration: line-through;
  color: #90A4AE;
}

/* ─── 代码高亮样式 ─── */
.tiptap-content :deep(.ProseMirror pre) {
  position: relative;
}

.tiptap-content :deep(.ProseMirror pre .hljs-comment),
.tiptap-content :deep(.ProseMirror pre .hljs-quote) {
  color: #5c6370;
  font-style: italic;
}

.tiptap-content :deep(.ProseMirror pre .hljs-keyword),
.tiptap-content :deep(.ProseMirror pre .hljs-doctag),
.tiptap-content :deep(.ProseMirror pre .hljs-formula) {
  color: #c678dd;
}

.tiptap-content :deep(.ProseMirror pre .hljs-section),
.tiptap-content :deep(.ProseMirror pre .hljs-name),
.tiptap-content :deep(.ProseMirror pre .hljs-selector-tag),
.tiptap-content :deep(.ProseMirror pre .hljs-deletion),
.tiptap-content :deep(.ProseMirror pre .hljs-subst) {
  color: #e06c75;
}

.tiptap-content :deep(.ProseMirror pre .hljs-literal) {
  color: #56b6c2;
}

.tiptap-content :deep(.ProseMirror pre .hljs-string),
.tiptap-content :deep(.ProseMirror pre .hljs-regexp),
.tiptap-content :deep(.ProseMirror pre .hljs-addition),
.tiptap-content :deep(.ProseMirror pre .hljs-attribute),
.tiptap-content :deep(.ProseMirror pre .hljs-meta .hljs-string) {
  color: #98c379;
}

.tiptap-content :deep(.ProseMirror pre .hljs-attr),
.tiptap-content :deep(.ProseMirror pre .hljs-variable),
.tiptap-content :deep(.ProseMirror pre .hljs-template-variable),
.tiptap-content :deep(.ProseMirror pre .hljs-type),
.tiptap-content :deep(.ProseMirror pre .hljs-selector-class),
.tiptap-content :deep(.ProseMirror pre .hljs-selector-attr),
.tiptap-content :deep(.ProseMirror pre .hljs-selector-pseudo),
.tiptap-content :deep(.ProseMirror pre .hljs-number) {
  color: #d19a66;
}

.tiptap-content :deep(.ProseMirror pre .hljs-symbol),
.tiptap-content :deep(.ProseMirror pre .hljs-bullet),
.tiptap-content :deep(.ProseMirror pre .hljs-link),
.tiptap-content :deep(.ProseMirror pre .hljs-meta),
.tiptap-content :deep(.ProseMirror pre .hljs-selector-id),
.tiptap-content :deep(.ProseMirror pre .hljs-title) {
  color: #61aeee;
}

.tiptap-content :deep(.ProseMirror pre .hljs-built_in),
.tiptap-content :deep(.ProseMirror pre .hljs-title.class_) {
  color: #e6c07b;
}

.tiptap-content :deep(.ProseMirror pre .hljs-emphasis) {
  font-style: italic;
}

.tiptap-content :deep(.ProseMirror pre .hljs-strong) {
  font-weight: bold;
}

/* ─── 文字高亮样式 ─── */
.tiptap-content :deep(.ProseMirror mark) {
  background: #FFFDE7;
  padding: 2px 4px;
  border-radius: 2px;
}

/* ─── 图片样式 ─── */
.tiptap-content :deep(.ProseMirror .editor-image) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 16px 0;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
}

.tiptap-content :deep(.ProseMirror .editor-image:hover) {
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.2);
}

.tiptap-content :deep(.ProseMirror .ProseMirror-selectednode .editor-image),
.tiptap-content :deep(.ProseMirror img.ProseMirror-selectednode) {
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.4);
}

/* ─── 下标/上标 ─── */
.tiptap-content :deep(.ProseMirror sub) {
  font-size: 0.75em;
  vertical-align: sub;
}

.tiptap-content :deep(.ProseMirror sup) {
  font-size: 0.75em;
  vertical-align: super;
}

.tiptap-content :deep(.ProseMirror .ink-footnote-ref a) {
  color: #1d4ed8;
  text-decoration: none;
}

.tiptap-content :deep(.ProseMirror .ink-footnotes) {
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid var(--hairline);
  color: #475569;
}

.tiptap-content :deep(.ProseMirror .ink-footnotes__title),
.tiptap-content :deep(.ProseMirror .ink-bibliography__title) {
  font-size: 0.9rem;
  color: #64748b;
}

.tiptap-content :deep(.ProseMirror .ink-footnote-backs) {
  margin-left: 0.5em;
  white-space: nowrap;
}

.tiptap-content :deep(.ProseMirror .ink-academic-citation) {
  padding: 0.05em 0.25em;
  border-radius: 0.35em;
  background: #eef6ff;
  color: #1d4ed8;
  font-style: normal;
}

.tiptap-content :deep(.ProseMirror .ink-academic-citation--unresolved) {
  background: var(--warning-light);
  color: var(--warning);
  border-bottom: 1px dashed currentColor;
}

.tiptap-content :deep(.ProseMirror .ink-bibliography) {
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid var(--hairline);
}

/* ─── 文字对齐 ─── */
.tiptap-content :deep(.ProseMirror [style*="text-align: center"]) {
  text-align: center;
}

.tiptap-content :deep(.ProseMirror [style*="text-align: right"]) {
  text-align: right;
}

.tiptap-content :deep(.ProseMirror [style*="text-align: justify"]) {
  text-align: justify;
}

/* ─── H4 标题样式 ─── */
.tiptap-content :deep(.ProseMirror h4) {
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 600;
  margin: 1.2em 0 0.5em;
  color: #455A64;
}

</style>
