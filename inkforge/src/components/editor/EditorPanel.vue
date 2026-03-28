<script setup lang="ts">
/**
 * EditorPanel — 纸张风格编辑器
 *
 * 不使用 useEditor() + EditorContent 组合！
 * useEditor 在 onMounted 创建 Editor 时挂到临时离线 div，
 * 然后 EditorContent 的 watchEffect + nextTick 做元素交换
 * (editor.setOptions + editor.createNodeViews)，
 * 导致 view.docView.updateChildren → localsInner 崩溃。
 *
 * 替代方案：手动在 onMounted 中用 new Editor({ element }) 直接挂载到
 * 已有 DOM 元素上，完全跳过元素交换。
 */
import { ref, watch, computed, shallowRef, onMounted, onBeforeUnmount } from 'vue'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import UnderlineExtension from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import ImageExtension from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Dropcursor from '@tiptap/extension-dropcursor'
import { common, createLowlight } from 'lowlight'
import { useEditorStore } from '@/stores/editor'
import { storeToRefs } from 'pinia'
import { Loader2, AlertTriangle } from 'lucide-vue-next'
import FloatingToolbar from './FloatingToolbar.vue'
import type { EditedContent } from '@/types'
import EditorEmptyState from './EditorEmptyState.vue'
import { WeChatFormat } from '@/extensions/WeChatFormat'
import { MarkdownHints } from '@/extensions/MarkdownHints'
import { SmartPunctuation } from '@/extensions/SmartPunctuation'
import { TypewriterMode } from '@/extensions/TypewriterMode'
import { BracketMatching } from '@/extensions/BracketMatching'
import { SlashCommands } from '@/extensions/SlashCommands'
import { KeyboardShortcuts } from '@/extensions/KeyboardShortcuts'
import { TyporaMode } from '@/extensions/TyporaMode'
import { useFeatureFlag } from '@/composables/useFeatureFlag'
import { useSettingsStore } from '@/stores/settings'
import { useAssetStore } from '@/stores/asset'
import SlashCommandMenu from './SlashCommandMenu.vue'
import FindReplace from './FindReplace.vue'
import EditorContextMenu from './EditorContextMenu.vue'

// lowlight 实例 (代码高亮引擎)
const lowlight = createLowlight(common)

const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const assetStore = useAssetStore()
const markdownHintsFeature = useFeatureFlag('markdown-hints')
const { currentContent, status: editorStatus, error: editorError } = storeToRefs(editorStore)

// 派生状态
const isReady = computed(() => editorStatus.value === 'ready' || editorStatus.value === 'saving')
const isLoading = computed(() => editorStatus.value === 'loading')
const markdownHintsEnabled = computed(() => settingsStore.settings.editor.markdownHints && markdownHintsFeature.enabled.value)

// 本地编辑状态
const titleText = ref('')
const transcriptText = ref('')

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
const editorPaperWidth = computed(() => {
  const paperWidthMap = {
    narrow: '560px',
    medium: '680px',
    wide: '860px',
    full: 'calc(100% - 64px)',
  } as const

  return paperWidthMap[settingsStore.settings.editor.editorWidth] ?? paperWidthMap.medium
})
const editorPaperClasses = computed(() => ({
  'show-line-numbers': settingsStore.settings.editor.showLineNumbers,
  'editor-paper--narrow': settingsStore.settings.editor.editorWidth === 'narrow',
  'editor-paper--wide': settingsStore.settings.editor.editorWidth === 'wide',
  'editor-paper--full': settingsStore.settings.editor.editorWidth === 'full',
}))
const editorContentClasses = computed(() => ({
  'is-no-wrap': !settingsStore.settings.editor.wordWrap,
}))

// ═══ 手动 Editor 管理 ═══
// 直接操作 Editor 实例，不使用 useEditor/EditorContent
const editorContainerRef = ref<HTMLElement | null>(null)
const bodyEditor = shallowRef<Editor | null>(null)
const hasPendingChanges = ref(false)
const activeLineElement = shallowRef<HTMLElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const isFindReplaceVisible = ref(false)
const findReplaceMode = ref<'find' | 'replace'>('find')
const findQuery = ref('')
const replaceQuery = ref('')
const findMatches = ref<Array<{ from: number; to: number }>>([])
const activeFindMatchIndex = ref(-1)
const contextMenuState = ref({
  visible: false,
  x: 0,
  y: 0,
})

let suppressEditorUpdate = false
let autoSaveIntervalId: ReturnType<typeof setInterval> | null = null

function recordSaveMetric(source: 'auto' | 'manual', duration: number): void {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedDuration = Math.max(0, Math.round(duration))

  try {
    window.sessionStorage.setItem('inkforge:last-editor-save-ms', String(normalizedDuration))
    window.sessionStorage.setItem('inkforge:last-editor-save-source', source)
    window.sessionStorage.setItem('inkforge:last-editor-save-at', new Date().toISOString())
  } catch {
    // ignore diagnostics cache write failures
  }

  window.dispatchEvent(new CustomEvent('inkforge:editor-save-metric', {
    detail: {
      source,
      duration: normalizedDuration,
      at: new Date().toISOString(),
    },
  }))
}

function getEditorDom(): HTMLElement | null {
  return bodyEditor.value?.view.dom as HTMLElement | null
}

function updateExtensionOptions(): void {
  if (!bodyEditor.value) {
    return
  }

  const exts = bodyEditor.value.extensionManager.extensions
  const editorSettings = settingsStore.settings.editor

  const smartPunctuation = exts.find((extension) => extension.name === 'smartPunctuation')
  if (smartPunctuation) smartPunctuation.options.enabled = editorSettings.smartPunctuation

  const typewriterMode = exts.find((extension) => extension.name === 'typewriterMode')
  if (typewriterMode) typewriterMode.options.enabled = editorSettings.typewriterMode

  const markdownHints = exts.find((extension) => extension.name === 'markdownHints')
  if (markdownHints) markdownHints.options.enabled = markdownHintsEnabled.value

  const typoraMode = exts.find((extension) => extension.name === 'typoraMode')
  if (typoraMode) typoraMode.options.enabled = editorSettings.editorMode === 'typora'

  const bracketMatching = exts.find((extension) => extension.name === 'bracketMatching')
  if (bracketMatching) bracketMatching.options.enabled = editorSettings.bracketMatching
}

function clearActiveLineDecoration(): void {
  if (activeLineElement.value) {
    activeLineElement.value.classList.remove('editor-active-line')
    activeLineElement.value = null
  }
}

function findTopLevelBlockElement(element: HTMLElement | null): HTMLElement | null {
  const container = editorContainerRef.value
  let current = element

  while (current && current !== container) {
    if (current.parentElement === container) {
      return current
    }

    current = current.parentElement
  }

  return null
}

function updateActiveLineDecoration(): void {
  clearActiveLineDecoration()

  if (!settingsStore.settings.editor.highlightActiveLine || !bodyEditor.value) {
    return
  }

  const { from } = bodyEditor.value.state.selection
  const domAnchor = bodyEditor.value.view.domAtPos(from)
  const anchorElement = domAnchor.node instanceof HTMLElement ? domAnchor.node : domAnchor.node.parentElement
  const blockElement = findTopLevelBlockElement(anchorElement)

  if (!blockElement) {
    return
  }

  blockElement.classList.add('editor-active-line')
  activeLineElement.value = blockElement
}

function applyEditorSurfaceSettings(): void {
  const dom = getEditorDom()
  if (!dom) {
    return
  }

  const editorSettings = settingsStore.settings.editor
  dom.setAttribute('spellcheck', String(editorSettings.spellCheck))
  dom.style.whiteSpace = editorSettings.wordWrap ? 'pre-wrap' : 'pre'
  dom.style.wordBreak = editorSettings.wordWrap ? 'break-word' : 'normal'
  dom.style.setProperty('tab-size', String(editorSettings.tabSize))

  updateActiveLineDecoration()
}

function restartAutoSaveTimer(): void {
  if (autoSaveIntervalId) {
    clearInterval(autoSaveIntervalId)
    autoSaveIntervalId = null
  }

  if (!settingsStore.settings.editor.autoSave) {
    return
  }

  autoSaveIntervalId = setInterval(() => {
    if (!hasPendingChanges.value || !isReady.value) {
      return
    }

    void saveContent(true, 'auto')
  }, settingsStore.settings.editor.autoSaveInterval * 1000)
}

function collectTextMatches(query: string): Array<{ from: number; to: number }> {
  if (!bodyEditor.value || !query.trim()) {
    return []
  }

  const source = query.toLowerCase()
  const matches: Array<{ from: number; to: number }> = []

  bodyEditor.value.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return
    }

    const haystack = node.text.toLowerCase()
    let offset = 0

    while (offset <= haystack.length) {
      const foundAt = haystack.indexOf(source, offset)
      if (foundAt === -1) {
        break
      }

      matches.push({
        from: pos + foundAt,
        to: pos + foundAt + query.length,
      })
      offset = foundAt + Math.max(source.length, 1)
    }
  })

  return matches
}

function activateFindMatch(index: number): void {
  if (!bodyEditor.value || findMatches.value.length === 0) {
    activeFindMatchIndex.value = -1
    return
  }

  const normalizedIndex = (index + findMatches.value.length) % findMatches.value.length
  const match = findMatches.value[normalizedIndex]
  activeFindMatchIndex.value = normalizedIndex
  bodyEditor.value.chain().focus().setTextSelection({ from: match.from, to: match.to }).scrollIntoView().run()
}

function refreshFindMatches(autoFocus = false): void {
  findMatches.value = collectTextMatches(findQuery.value)

  if (findMatches.value.length === 0) {
    activeFindMatchIndex.value = -1
    return
  }

  const nextIndex = autoFocus ? 0 : Math.min(activeFindMatchIndex.value, findMatches.value.length - 1)
  activateFindMatch(nextIndex < 0 ? 0 : nextIndex)
}

function openFindReplace(mode: 'find' | 'replace'): void {
  findReplaceMode.value = mode
  isFindReplaceVisible.value = true
  refreshFindMatches(true)
}

function closeFindReplace(): void {
  isFindReplaceVisible.value = false
  activeFindMatchIndex.value = -1
}

function handleFindNext(): void {
  activateFindMatch(activeFindMatchIndex.value + 1)
}

function handleFindPrevious(): void {
  activateFindMatch(activeFindMatchIndex.value - 1)
}

function handleReplaceCurrent(): void {
  if (!bodyEditor.value || activeFindMatchIndex.value < 0 || !findMatches.value[activeFindMatchIndex.value]) {
    return
  }

  const match = findMatches.value[activeFindMatchIndex.value]
  bodyEditor.value.chain().focus().insertContentAt({ from: match.from, to: match.to }, replaceQuery.value).run()
  refreshFindMatches()
}

function handleReplaceAll(): void {
  if (!bodyEditor.value || findMatches.value.length === 0) {
    return
  }

  const transaction = bodyEditor.value.state.tr
  const orderedMatches = [...findMatches.value].sort((left, right) => right.from - left.from)
  orderedMatches.forEach((match) => {
    transaction.insertText(replaceQuery.value, match.from, match.to)
  })
  bodyEditor.value.view.dispatch(transaction)
  refreshFindMatches()
}

const findMatchLabel = computed(() => {
  if (!findQuery.value.trim()) {
    return '输入关键词后开始查找'
  }
  if (findMatches.value.length === 0) {
    return '没有匹配结果'
  }
  return `${activeFindMatchIndex.value + 1} / ${findMatches.value.length}`
})

watch(findQuery, () => {
  if (isFindReplaceVisible.value) {
    refreshFindMatches(true)
  }
})

async function insertUploadedImage(file: File): Promise<void> {
  const articleId = currentContent.value?.articleId
  const asset = await assetStore.uploadAsset(file, articleId)
  const src = assetStore.getAssetUrl(asset.id)

  if (!src || !bodyEditor.value) {
    return
  }

  bodyEditor.value.chain().focus().setImage({ src, alt: asset.name, title: asset.name }).run()
}

async function handleImageFiles(files: FileList | File[]): Promise<void> {
  const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
  for (const file of imageFiles) {
    await insertUploadedImage(file)
  }
}

function handleImageInputChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) {
    return
  }

  void handleImageFiles(input.files)
  input.value = ''
}

function handleEditorDrop(event: DragEvent): void {
  if (!event.dataTransfer?.files?.length) {
    return
  }

  const hasImage = Array.from(event.dataTransfer.files).some((file) => file.type.startsWith('image/'))
  if (!hasImage) {
    return
  }

  event.preventDefault()
  void handleImageFiles(event.dataTransfer.files)
}

function handleEditorPaste(event: ClipboardEvent): void {
  const files = event.clipboardData?.files
  if (!files?.length) {
    return
  }

  const hasImage = Array.from(files).some((file) => file.type.startsWith('image/'))
  if (!hasImage) {
    return
  }

  event.preventDefault()
  void handleImageFiles(files)
}

function hideContextMenu(): void {
  contextMenuState.value.visible = false
}

function handleContextMenu(event: MouseEvent): void {
  if (!bodyEditor.value || !isReady.value) {
    return
  }

  event.preventDefault()
  const containerRect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect()
  const rawX = containerRect ? event.clientX - containerRect.left : event.offsetX
  const rawY = containerRect ? event.clientY - containerRect.top : event.offsetY
  const menuWidth = 280
  const menuHeight = 520
  const maxX = containerRect ? Math.max(12, containerRect.width - menuWidth - 12) : rawX
  const maxY = containerRect ? Math.max(12, containerRect.height - menuHeight - 12) : rawY
  contextMenuState.value = {
    visible: true,
    x: Math.min(Math.max(12, rawX), maxX),
    y: Math.min(Math.max(12, rawY), maxY),
  }
}

async function handleContextMenuCommand(command: string): Promise<void> {
  hideContextMenu()

  switch (command) {
    case 'copy':
      document.execCommand('copy')
      return
    case 'cut':
      document.execCommand('cut')
      return
    case 'paste': {
      try {
        const text = await navigator.clipboard.readText()
        bodyEditor.value?.chain().focus().insertContent(text).run()
      } catch {
        document.execCommand('paste')
      }
      return
    }
    case 'selectAll':
      bodyEditor.value?.chain().focus().selectAll().run()
      return
    case 'bold':
      bodyEditor.value?.chain().focus().toggleBold().run()
      return
    case 'italic':
      bodyEditor.value?.chain().focus().toggleItalic().run()
      return
    case 'underline':
      bodyEditor.value?.chain().focus().toggleUnderline().run()
      return
    case 'strikethrough':
      bodyEditor.value?.chain().focus().toggleStrike().run()
      return
    case 'inlineCode':
      bodyEditor.value?.chain().focus().toggleCode().run()
      return
    case 'blockquote':
      bodyEditor.value?.chain().focus().toggleBlockquote().run()
      return
    case 'bulletList':
      bodyEditor.value?.chain().focus().toggleBulletList().run()
      return
    case 'orderedList':
      bodyEditor.value?.chain().focus().toggleOrderedList().run()
      return
    case 'codeBlock':
      bodyEditor.value?.chain().focus().toggleCodeBlock().run()
      return
    case 'table':
      bodyEditor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      return
    case 'horizontalRule':
      bodyEditor.value?.chain().focus().setHorizontalRule().run()
      return
    case 'link':
      window.dispatchEvent(new CustomEvent('inkforge:edit-link'))
      return
    case 'image':
      imageInputRef.value?.click()
      return
    case 'findReplace':
      openFindReplace('replace')
      return
    case 'clearFormat':
      bodyEditor.value?.chain().focus().clearNodes().unsetAllMarks().run()
      return
    default:
      return
  }
}

function handleOpenImagePicker(): void {
  imageInputRef.value?.click()
}

function handleEditorCustomEvent(event: Event): void {
  if (!(event instanceof CustomEvent)) {
    return
  }

  const action = event.detail?.action
  if (action === 'switchEditorMode') {
    settingsStore.settings.editor.editorMode =
      settingsStore.settings.editor.editorMode === 'typora' ? 'source' : 'typora'
    return
  }

  if (action === 'typewriterMode') {
    settingsStore.settings.editor.typewriterMode = !settingsStore.settings.editor.typewriterMode
    return
  }

  if (action === 'zoomIn') {
    settingsStore.settings.appearance.fontSize = Math.min(24, settingsStore.settings.appearance.fontSize + 1)
  }
}

function handleSaveEvent(): void {
  void saveContent(true, 'manual')
}

function handleFindEvent(): void {
  openFindReplace('find')
}

function handleReplaceEvent(): void {
  openFindReplace('replace')
}

onMounted(() => {
  if (!editorContainerRef.value) return

  // 直接在真实 DOM 元素上创建 Editor，跳过元素交换
  bodyEditor.value = new Editor({
    element: editorContainerRef.value,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
        dropcursor: false,
      }),
      Placeholder.configure({
        placeholder: '开始写作...'
      }),
      CharacterCount,
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      WeChatFormat,
      MarkdownHints.configure({
        enabled: markdownHintsEnabled.value,
        cursorAware: true,
      }),
      TyporaMode.configure({
        enabled: settingsStore.settings.editor.editorMode === 'typora',
      }),
      SmartPunctuation.configure({
        enabled: settingsStore.settings.editor.smartPunctuation,
      }),
      TypewriterMode.configure({
        enabled: settingsStore.settings.editor.typewriterMode,
      }),
      BracketMatching.configure({
        enabled: settingsStore.settings.editor.bracketMatching,
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'editor-image' },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
      Dropcursor.configure({ color: '#D32F2F', width: 2 }),
      KeyboardShortcuts.configure({
        getShortcuts: () => settingsStore.settings.shortcuts,
      }),
      SlashCommands,
    ],
    content: '',
    onUpdate: () => {
      if (suppressEditorUpdate) {
        return
      }

      hasPendingChanges.value = true
    },
    onSelectionUpdate: () => {
      updateActiveLineDecoration()
    },
    onFocus: () => {
      updateActiveLineDecoration()
    },
    onBlur: () => {
      clearActiveLineDecoration()
    },
  })

  editorContainerRef.value.addEventListener('drop', handleEditorDrop)
  editorContainerRef.value.addEventListener('paste', handleEditorPaste)
  editorContainerRef.value.addEventListener('contextmenu', handleContextMenu)
  document.addEventListener('click', hideContextMenu, true)
  window.addEventListener('inkforge:save', handleSaveEvent as EventListener)
  window.addEventListener('inkforge:find', handleFindEvent as EventListener)
  window.addEventListener('inkforge:replace', handleReplaceEvent as EventListener)
  window.addEventListener('inkforge:open-image-picker', handleOpenImagePicker as EventListener)
  window.addEventListener('inkforge:view-action', handleEditorCustomEvent as EventListener)

  updateExtensionOptions()
  applyEditorSurfaceSettings()
  restartAutoSaveTimer()
})

// 设置 → 扩展实时同步
watch(
  () => settingsStore.settings.editor,
  () => {
    if (!bodyEditor.value) return

    updateExtensionOptions()
    applyEditorSurfaceSettings()
    restartAutoSaveTimer()
    bodyEditor.value.view.dispatch(bodyEditor.value.state.tr)
  },
  { deep: true }
)

// 同步内容 (仅当 Ready 时)
watch(currentContent, (content: EditedContent | null) => {
  if (content && isReady.value) {
    if (titleText.value !== content.title) {
      titleText.value = content.title
    }
    if (transcriptText.value !== content.transcript) {
      transcriptText.value = content.transcript
    }
    if (bodyEditor.value && bodyEditor.value.getHTML() !== content.body) {
      suppressEditorUpdate = true
      bodyEditor.value.commands.setContent(content.body || '')
      window.queueMicrotask(() => {
        suppressEditorUpdate = false
        hasPendingChanges.value = false
        applyEditorSurfaceSettings()
      })
    } else {
      hasPendingChanges.value = false
    }
  }
}, { immediate: true })

// 监听状态变化，重置编辑器
watch(editorStatus, (newStatus) => {
  if (newStatus === 'loading' || newStatus === 'idle') {
    titleText.value = ''
    transcriptText.value = ''
    suppressEditorUpdate = true
    bodyEditor.value?.commands.setContent('')
    window.queueMicrotask(() => {
      suppressEditorUpdate = false
    })
    hasPendingChanges.value = false
    clearActiveLineDecoration()
  }
})

async function saveContent(force: boolean = false, source: 'auto' | 'manual' = 'manual') {
  if (!isReady.value || (!force && !hasPendingChanges.value)) return
  const startedAt = performance.now()
  await editorStore.updateContent({
    title: titleText.value,
    body: bodyEditor.value?.getHTML() || '',
    transcript: transcriptText.value
  })
  hasPendingChanges.value = false
  recordSaveMetric(source, performance.now() - startedAt)
}

// 暴露编辑器实例供外部组件（如 OutlinePanel）使用
defineExpose({
  bodyEditor,
  saveImmediately: () => saveContent(true, 'manual'),
})

onBeforeUnmount(() => {
  editorContainerRef.value?.removeEventListener('drop', handleEditorDrop)
  editorContainerRef.value?.removeEventListener('paste', handleEditorPaste)
  editorContainerRef.value?.removeEventListener('contextmenu', handleContextMenu)
  document.removeEventListener('click', hideContextMenu, true)
  window.removeEventListener('inkforge:save', handleSaveEvent as EventListener)
  window.removeEventListener('inkforge:find', handleFindEvent as EventListener)
  window.removeEventListener('inkforge:replace', handleReplaceEvent as EventListener)
  window.removeEventListener('inkforge:open-image-picker', handleOpenImagePicker as EventListener)
  window.removeEventListener('inkforge:view-action', handleEditorCustomEvent as EventListener)
  bodyEditor.value?.destroy()
  bodyEditor.value = null
  clearActiveLineDecoration()
  if (autoSaveIntervalId) {
    clearInterval(autoSaveIntervalId)
    autoSaveIntervalId = null
  }
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
      v-show="isReady"
      class="editor-scroll"
    >
      <div
        class="editor-paper"
        :class="editorPaperClasses"
        :style="{
          '--paper-font': editorFontFamily,
          '--paper-size': editorFontSize,
          '--paper-lh': editorLineHeight,
          '--paper-width': editorPaperWidth,
        }"
      >
        <!-- 编辑器直接挂载点 — Editor 在 onMounted 时直接挂到这个 div -->
        <div
          ref="editorContainerRef"
          class="tiptap-content"
          :class="editorContentClasses"
        />
        <FindReplace
          :visible="isFindReplaceVisible"
          :mode="findReplaceMode"
          :query="findQuery"
          :replacement="replaceQuery"
          :match-label="findMatchLabel"
          @close="closeFindReplace"
          @update:query="findQuery = $event"
          @update:replacement="replaceQuery = $event"
          @next="handleFindNext"
          @previous="handleFindPrevious"
          @replace="handleReplaceCurrent"
          @replace-all="handleReplaceAll"
        />
        <EditorContextMenu
          :visible="contextMenuState.visible"
          :x="contextMenuState.x"
          :y="contextMenuState.y"
          @command="handleContextMenuCommand"
        />
        <FloatingToolbar :editor="bodyEditor ?? undefined" />
        <SlashCommandMenu :editor="bodyEditor ?? undefined" />
        <input
          ref="imageInputRef"
          type="file"
          accept="image/*"
          class="editor-image-input"
          hidden
          @change="handleImageInputChange"
        >
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
  --editor-panel-bg: #FAFBFC;
  --editor-paper-bg: #FFFFFF;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--editor-panel-bg);
  position: relative;
  overflow: hidden;
}

[data-theme='dark'] .editor-panel {
  --editor-panel-bg: #FAFBFC;
  --editor-paper-bg: #FFFFFF;
}

/* ─── 居中滚动容器 ─── */
.editor-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 32px;
  background: var(--editor-panel-bg);
}

/* ─── 纸张 ─── */
.editor-paper {
  width: 100%;
  max-width: var(--paper-width, 680px);
  min-height: 800px;
  margin: 0 auto;
  background: var(--editor-paper-bg);
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  padding: 64px 72px;
  outline: none;
  transition: box-shadow 0.2s ease;
  align-self: flex-start;
  position: relative;
}

.editor-paper.show-line-numbers {
  padding-left: 88px;
}

.editor-paper:focus-within {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* ─── TipTap ProseMirror ─── */
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

.tiptap-content.is-no-wrap :deep(.ProseMirror) {
  white-space: pre;
  word-break: normal;
  overflow-x: auto;
}

.editor-paper.show-line-numbers .tiptap-content :deep(.ProseMirror) {
  counter-reset: block-line;
}

.editor-paper.show-line-numbers .tiptap-content :deep(.ProseMirror > *) {
  position: relative;
}

.editor-paper.show-line-numbers .tiptap-content :deep(.ProseMirror > *::before) {
  counter-increment: block-line;
  content: counter(block-line);
  position: absolute;
  left: -52px;
  top: 0;
  width: 36px;
  color: #B0BEC5;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  text-align: right;
}

.tiptap-content :deep(.editor-active-line) {
  background: linear-gradient(90deg, rgba(211, 47, 47, 0.08), rgba(211, 47, 47, 0));
  border-radius: 6px;
}

.tiptap-content :deep(.matching-bracket) {
  color: #D32F2F;
  background: rgba(211, 47, 47, 0.12);
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgba(211, 47, 47, 0.18);
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
  border-left: 3px solid #D32F2F;
  background: #FAFAFA;
  padding: 12px 16px;
  margin: 16px 0;
  color: #607D8B;
  font-style: italic;
}

.tiptap-content :deep(.ProseMirror code) {
  font-family: 'JetBrains Mono', monospace;
  background: #FFF3E0;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 14px;
  color: #D32F2F;
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
  background: #ECEFF1;
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
  color: #90A4AE;
}

.state-container.error {
  color: #C62828;
}

/* ─── 滚动条 ─── */
.editor-scroll::-webkit-scrollbar {
  width: 4px;
}

.editor-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.editor-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
}

.editor-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.15);
}

/* ─── 动画 ─── */
.animate-spin {
  animation: spin 1s linear infinite;
}

/* ─── 表格样式 ─── */
.tiptap-content :deep(.ProseMirror table) {
  border-collapse: collapse;
  width: 100%;
  margin: 24px 0;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid #ECEFF1;
}

.tiptap-content :deep(.ProseMirror th),
.tiptap-content :deep(.ProseMirror td) {
  border: 1px solid #ECEFF1;
  padding: 8px 12px;
  text-align: left;
  vertical-align: top;
  min-width: 80px;
}

.tiptap-content :deep(.ProseMirror th) {
  background: #F5F5F5;
  font-weight: 600;
  font-size: 0.95em;
  color: #263238;
}

.tiptap-content :deep(.ProseMirror td) {
  background: #FFFFFF;
}

.tiptap-content :deep(.ProseMirror tr:nth-child(even) td) {
  background: #FAFBFC;
}

.tiptap-content :deep(.ProseMirror .selectedCell) {
  background: rgba(211, 47, 47, 0.08);
}

.tiptap-content :deep(.ProseMirror .column-resize-handle) {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #D32F2F;
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

.tiptap-content :deep(.md-hint) {
  color: #90A4AE;
  opacity: 0.4;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85em;
  user-select: none;
  pointer-events: none;
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
