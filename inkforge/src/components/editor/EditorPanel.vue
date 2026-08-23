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
import {
  AlertTriangle,
  BookOpenText,
  ContactRound,
  Loader2,
  Music2,
  Settings2,
} from 'lucide-vue-next'
import FloatingToolbar from './FloatingToolbar.vue'
import type { EditedContent } from '@/types'
import EditorEmptyState from './EditorEmptyState.vue'
import { WeChatFormat } from '@/extensions/WeChatFormat'
import { SmartPunctuation } from '@/extensions/SmartPunctuation'
import type { SmartPunctuationRuleSettings } from '@/services/smart-punctuation'
import {
  findScrollParent as findTypewriterScrollParent,
  TYPEWRITER_MODE_REFRESH_META,
  TypewriterMode,
} from '@/extensions/TypewriterMode'
import { KeyboardShortcuts, type FindReplaceMode } from '@/extensions/KeyboardShortcuts'
import { EditorKeymap } from '@/extensions/EditorKeymap'
import { SlashCommands } from '@/extensions/SlashCommands'
import { InkComponent } from '@/extensions/InkComponent'
import { insertContentAtBlockBoundary, type InsertRange } from '@/extensions/BlockBoundaryInsertion'
import { SnippetExpansion } from '@/extensions/SnippetExpansion'
import { useSettingsStore } from '@/stores/settings'
import { FONT_STACKS } from '@/constants'
import {
  getCreativeCommonsLicenseOption,
  getDeliveryComponentTypeLabel,
  getPlatformPresets,
  resolveDeliveryAdornmentSlots,
  resolveVisualVariant,
  type ExportStats,
} from '@/services/export'
import { darkenForWhiteText } from '@/services/export/svg-modules/theme'
import { useAssetStore } from '@/stores/asset'
import { useSnippetStore } from '@/stores/snippet'
import { useWritingAssistStore } from '@/stores/writingAssist'
import { logger } from '@/services/error'
import {
  ImageV2Extension,
  ImageDropPaste,
  appendMarkdownImage,
  type ImageIngressState,
  type InsertedImageAsset,
} from '@/extensions/ImageV2'
import { RichCodeBlock } from '@/extensions/RichCodeBlock'
import { DetailsBlock } from '@/extensions/DetailsBlock'
import { CitationMarks } from '@/extensions/CitationMarks'
import { BlockDragHandle } from '@/extensions/BlockDragHandle'
import { createInkforgeLowlight } from '@/extensions/codeLanguages'
import { createInkforgeAssetUrl } from '@/utils/asset-url'
import type { AssetRecord } from '@/utils/db'
import type { SnippetContext } from '@/services/snippet'
import { registerActiveEditor } from '@/services/dev-tools'
import SlashCommandMenu from './SlashCommandMenu.vue'
import TableFloatingToolbar from './TableFloatingToolbar.vue'
import EditorContextMenu from './EditorContextMenu.vue'
import FindReplace from './FindReplace.vue'
import MarkdownEditor from './MarkdownEditor.vue'
import WritingComponentLibrary from './WritingComponentLibrary.vue'
import {
  insertWritingComponentSourceAtRange,
  parseWritingComponentSource,
  type WritingComponentValidationStatus,
} from '@/services/writing-components'
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
  articleCategory?: string
  wechatStats?: ExportStats
}>(), {
  editorMode: 'typora',
  editorWidth: 'medium',
  isFocusMode: false,
  externalPreviewActive: false,
})

const emit = defineEmits<{
  (e: 'sync-state-change', value: TyporaSyncState): void
  (e: 'toggle-editor-mode'): void
  (e: 'open-delivery-settings', section?: 'overview' | 'song' | 'profile' | 'license'): void
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
const isEditorHydrating = ref(false)
const isReady = computed(() => editorStatus.value === 'ready' || editorStatus.value === 'saving')
const isLoading = computed(() => editorStatus.value === 'loading' || isEditorHydrating.value)

// 本地编辑状态
const titleText = ref('')
const transcriptText = ref('')
const sourceMarkdown = ref('')

interface EditorSaveRequest {
  contentId: string
  articleId: string
  markdown: string
  title: string
  transcript: string
  saveSequence: number
}

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
let completedSaveSequence = 0
let hydrationSequence = 0
let hydratedArticleId: string | null = null
let activeEditorHydration: { content: EditedContent; promise: Promise<void> } | null = null

const syncState = ref<TyporaSyncState>('offline')

function setSyncState(nextState: TyporaSyncState) {
  if (syncState.value === nextState) {
    return
  }

  syncState.value = nextState
  emit('sync-state-change', nextState)
}

// ═══ Settings → CSS Variables ═══
const HEADING_SCALE_VALUES = {
  compact: { h1: 1.55, h2: 1.22, h3: 1.08 },
  balanced: { h1: 1.75, h2: 1.38, h3: 1.12 },
  display: { h1: 2, h2: 1.55, h3: 1.2 },
} as const
const editorFontFamily = computed(() => FONT_STACKS[settingsStore.settings.appearance.fontFamily])
const editorFontSize = computed(() => `${settingsStore.settings.appearance.typography.fontSize}px`)
const editorLineHeight = computed(() => String(settingsStore.settings.appearance.typography.lineHeight))
const editorLetterSpacing = computed(() => `${settingsStore.settings.appearance.typography.letterSpacing}em`)
const editorParagraphSpacing = computed(() => `${settingsStore.settings.appearance.typography.paragraphSpacing}px`)
const editorTextIndent = computed(() => settingsStore.settings.appearance.typography.paragraphIndent ? '2em' : '0')
const editorTextAlign = computed(() => settingsStore.settings.appearance.typography.textAlign)
const editorListSpacing = computed(() => `${settingsStore.settings.appearance.typography.listSpacing}px`)
const editorHeadingScale = computed(() => (
  HEADING_SCALE_VALUES[settingsStore.settings.appearance.typography.headingScale]
))
const editorPlatform = computed(() => settingsStore.settings.export.defaultPlatform)
const editorPreset = computed(() => {
  const presets = getPlatformPresets(editorPlatform.value)
  return presets.find(preset => preset.id === settingsStore.settings.export.defaultPresetId)
    ?? presets[0]
})
const editorPresetId = computed(() => (
  editorPreset.value?.id ?? settingsStore.settings.export.defaultPresetId
))
const editorVisualVariantId = computed(() => (
  resolveVisualVariant(editorPlatform.value, editorPresetId.value).variantId
))
const editorPresetPersona = computed(() => editorPreset.value?.persona ?? '')
const editorPresetAccent = computed(() => (
  editorPreset.value?.primaryColor ?? settingsStore.settings.appearance.accentColor
))
const editorPresetTextAccent = computed(() => darkenForWhiteText(editorPresetAccent.value, 4.8))
const editorPresetFontFamily = computed(() => {
  const fonts = editorPreset.value?.fonts
  return fonts ? `${fonts.cjk}, ${fonts.latin}` : editorFontFamily.value
})
const editorPresetClasses = computed(() => [
  `editor-preset-${editorPresetId.value}`,
  `editor-variant-${editorVisualVariantId.value}`,
  editorPresetPersona.value ? `editor-persona-${editorPresetPersona.value}` : null,
])
const deliverySlots = computed(() => (
  resolveDeliveryAdornmentSlots(settingsStore.settings.export.deliveryAdornment)
))
const deliveryMastheadSong = computed(() => deliverySlots.value.mastheadSong)
const deliveryEndProfile = computed(() => deliverySlots.value.afterBodyProfile)
const deliveryLicense = computed(() => getCreativeCommonsLicenseOption(
  settingsStore.settings.export.deliveryAdornment.license,
))
const deliveryRemainderLabels = computed(() => (
  deliverySlots.value.remainderComponents
    .filter(component => component.enabled)
    .map(component => getDeliveryComponentTypeLabel(component.type))
))
const deliveryProjectionSummary = computed(() => {
  const stats = props.wechatStats
  const parts = [
    deliveryMastheadSong.value ? `文前歌曲：${deliveryMastheadSong.value.title}` : '文前歌曲未配置',
    settingsStore.settings.export.deliveryAdornment.readingTime.enabled
      ? stats ? `阅读约 ${stats.readingTime} 分钟 · 全文 ${stats.wordCount} 字` : '微信阅读统计待生成'
      : stats ? `全文 ${stats.wordCount} 字 · 阅读时间已关闭` : '阅读时间已关闭',
    deliveryEndProfile.value ? `文末名片：${deliveryEndProfile.value.displayName}` : '文末名片未配置',
    deliveryLicense.value.url ? deliveryLicense.value.shortLabel : '未附加 CC 协议',
  ]
  return parts.join(' · ')
})

// ═══ 手动 Editor 管理 ═══
// 直接操作 Editor 实例，不使用 useEditor/EditorContent
const editorContainerRef = ref<HTMLElement | null>(null)
const editorScrollRef = ref<HTMLElement | null>(null)
const sourceModeLayoutRef = ref<HTMLElement | null>(null)
const bodyEditor = shallowRef<Editor | null>(null)
type SourceEditorBridge = {
  state: {
    selection: { main: { from: number; to: number } }
  }
  dispatch: (spec: {
    changes?: { from: number; to: number; insert: string }
    selection?: { anchor: number }
    scrollIntoView?: boolean
  }) => void
  focus: () => void
}
const sourceEditorView = shallowRef<SourceEditorBridge | null>(null)
const componentLibraryVisible = ref(false)
const componentLibraryInitialSource = ref<string | undefined>()
const savedTyporaRange = ref<InsertRange | null>(null)
const savedSourceRange = ref<InsertRange | null>(null)
const editingComponentRange = ref<InsertRange | null>(null)
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

function handleSourceEditorReady(payload: { view: unknown }): void {
  sourceEditorView.value = payload.view as SourceEditorBridge
}

function openComponentLibrary(source?: string, position?: number | null): boolean {
  if (props.editorMode === 'preview') return false

  componentLibraryInitialSource.value = source
  editingComponentRange.value = null
  if (isSourceMode.value) {
    const selection = sourceEditorView.value?.state.selection.main
    const fallback = sourceMarkdown.value.length
    savedSourceRange.value = selection
      ? { from: selection.from, to: selection.to }
      : { from: fallback, to: fallback }
    savedTyporaRange.value = null
  } else {
    const editor = bodyEditor.value
    if (!editor) return false
    if (source && typeof position === 'number') {
      const node = editor.state.doc.nodeAt(position)
      if (node?.type.name === 'inkComponent') {
        editingComponentRange.value = { from: position, to: position + node.nodeSize }
      }
    }
    const range = editingComponentRange.value ?? editor.state.selection
    savedTyporaRange.value = { from: range.from, to: range.to }
    savedSourceRange.value = null
  }
  componentLibraryVisible.value = true
  return true
}

function restoreComponentInsertionFocus(): void {
  if (isSourceMode.value) {
    const view = sourceEditorView.value
    const range = savedSourceRange.value
    if (view && range) {
      view.dispatch({ selection: { anchor: Math.min(range.from, sourceMarkdown.value.length) } })
      view.focus()
    }
    return
  }
  const editor = bodyEditor.value
  const range = savedTyporaRange.value
  if (editor && range) {
    editor.commands.setTextSelection(range)
    editor.commands.focus()
  }
}

function closeComponentLibrary(): void {
  componentLibraryVisible.value = false
  restoreComponentInsertionFocus()
  componentLibraryInitialSource.value = undefined
  editingComponentRange.value = null
}

function insertWritingComponent(source: string): void {
  if (isSourceMode.value) {
    const range = savedSourceRange.value ?? {
      from: sourceMarkdown.value.length,
      to: sourceMarkdown.value.length,
    }
    const insertion = insertWritingComponentSourceAtRange(sourceMarkdown.value, source, range)
    if (sourceEditorView.value) {
      sourceEditorView.value.dispatch({
        changes: { from: range.from, to: range.to, insert: insertion.insertedText },
        selection: { anchor: insertion.cursor },
        scrollIntoView: true,
      })
      sourceEditorView.value.focus()
    } else {
      handleSourceUpdate(insertion.markdown)
    }
  } else {
    const editor = bodyEditor.value
    const parsed = parseWritingComponentSource(source)
    if (!editor || !parsed) return
    const componentId = parsed.node?.componentId ?? parsed.definition?.id ?? 'Unknown'
    const status: WritingComponentValidationStatus = parsed.status
    const content = {
      type: 'inkComponent',
      attrs: {
        source,
        componentId,
        label: parsed.definition?.label ?? componentId,
        status,
      },
    }
    if (editingComponentRange.value) {
      editor.chain().focus().insertContentAt(editingComponentRange.value, content, {
        updateSelection: true,
      }).run()
    } else {
      const range = savedTyporaRange.value
      if (range) editor.commands.setTextSelection(range)
      insertContentAtBlockBoundary(editor, {
        mode: 'block',
        content,
        replaceRange: range ?? undefined,
      })
    }
    editor.commands.focus()
  }

  componentLibraryVisible.value = false
  componentLibraryInitialSource.value = undefined
  savedTyporaRange.value = null
  savedSourceRange.value = null
  editingComponentRange.value = null
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

  return toInsertedImageAsset(asset)
}

function toInsertedImageAsset(asset: AssetRecord): InsertedImageAsset {
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

function insertAssetImage(asset: AssetRecord): boolean {
  if (asset.type !== 'image' && asset.type !== 'svg') return false
  if (props.editorMode === 'preview') return false

  const image = toInsertedImageAsset(asset)
  if (isSourceMode.value) {
    const nextMarkdown = appendMarkdownImage(sourceMarkdown.value, {
      src: image.src,
      alt: image.alt,
      title: image.title ?? null,
      width: image.width ?? null,
      height: image.height ?? null,
      caption: '',
      link: null,
      align: 'center',
    })
    if (nextMarkdown === sourceMarkdown.value) return false
    handleSourceUpdate(nextMarkdown)
    return true
  }

  if (!bodyEditor.value) return false
  insertUploadedImage(bodyEditor.value, image)
  return true
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
        heading: { levels: [1, 2, 3, 4, 5, 6] },
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
      InkComponent.configure({
        onEditRequested: (source, position) => {
          openComponentLibrary(source, position)
        },
      }),
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
        onComponentRequested: () => openComponentLibrary(),
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

  setSyncState('offline')

  if (currentContent.value && isReady.value) {
    void requestEditorHydration(currentContent.value)
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
    const refreshToken = Date.now()
    bodyEditor.value.view.dispatch(
      bodyEditor.value.state.tr
        .setMeta(TYPORA_MODE_REFRESH_META, refreshToken)
        .setMeta(TYPEWRITER_MODE_REFRESH_META, refreshToken),
    )
  },
  { deep: true }
)

// writingAssist → TypewriterMode 光标位置实时同步
watch(
  () => writingAssistStore.cursorPosition,
  (nextCursorPosition) => {
    if (!bodyEditor.value) return
    const exts = bodyEditor.value.extensionManager.extensions as TyporaExtensionRecord[]
    const tw = exts.find(e => e.name === 'typewriterMode')
    if (tw) {
      tw.options.cursorPosition = nextCursorPosition
      bodyEditor.value.view.dispatch(
        bodyEditor.value.state.tr.setMeta(TYPEWRITER_MODE_REFRESH_META, nextCursorPosition),
      )
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
  const articleId = content.articleId
  isEditorHydrating.value = true
  setSyncState('offline')

  try {
    const rawBody = content.body ?? ''
    const markdown = isLikelyHtmlContent(rawBody)
      ? serializeHtmlToMarkdown(rawBody)
      : rawBody
    const html = isLikelyHtmlContent(rawBody)
      ? rawBody
      : await renderMarkdownToHtml(markdown)

    if (
      hydrationSequence !== currentHydration
      || currentContent.value?.articleId !== articleId
      || !isReady.value
    ) {
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
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (
      hydrationSequence !== currentHydration
      || currentContent.value?.articleId !== articleId
      || !isReady.value
    ) {
      return
    }

    // `setContent()` can finish while the editor's scroll owner is still settling.
    // Request one explicit post-layout alignment so a restored first/last caret is
    // placed in the configured typewriter focus band without altering the document.
    if (bodyEditor.value) {
      bodyEditor.value.view.dispatch(
        bodyEditor.value.state.tr.setMeta(
          TYPEWRITER_MODE_REFRESH_META,
          currentHydration,
        ),
      )
    }

    hydratedArticleId = articleId
    completedSaveSequence = pendingSaveSequence
    isHydratingFromStore = false
    setSyncState('synced')
  } finally {
    if (hydrationSequence === currentHydration) {
      isHydratingFromStore = false
      isEditorHydrating.value = false
    }
  }
}

function requestEditorHydration(content: EditedContent): Promise<void> {
  if (activeEditorHydration?.content === content) {
    return activeEditorHydration.promise
  }

  const promise = hydrateEditorContent(content)
  activeEditorHydration = { content, promise }
  void promise
    .catch((error: unknown) => {
      if (activeEditorHydration?.promise !== promise) {
        return
      }
      setSyncState('offline')
      logger.warn('[EditorPanel] content hydration failed', {
        articleId: content.articleId,
        error: error instanceof Error ? error.message : String(error),
      })
    })
    .finally(() => {
      if (activeEditorHydration?.promise === promise) {
        activeEditorHydration = null
      }
    })
  return promise
}

function invalidateEditorHydration(clearHydratedArticle: boolean): void {
  hydrationSequence += 1
  activeEditorHydration = null
  isHydratingFromStore = false
  isEditorHydrating.value = false
  if (clearHydratedArticle) {
    hydratedArticleId = null
  }
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
  const hasNewerLocalRevision =
    hydratedArticleId === content.articleId &&
    completedSaveSequence < pendingSaveSequence

  if (hasNewerLocalRevision) {
    return
  }

  const isLocalPersistenceEcho =
    hydratedArticleId === content.articleId &&
    normalizedBody === sourceMarkdown.value &&
    titleText.value === content.title &&
    transcriptText.value === content.transcript

  if (isLocalPersistenceEcho) {
    if (!isEditorHydrating.value) {
      setSyncState('synced')
    }
    return
  }

  void requestEditorHydration(content)
}, { immediate: true })

// 监听状态变化，重置编辑器
watch(editorStatus, (newStatus) => {
  if (newStatus === 'loading' || newStatus === 'idle') {
    invalidateEditorHydration(true)
    titleText.value = ''
    transcriptText.value = ''
    sourceMarkdown.value = ''
    bodyEditor.value?.commands.setContent('')
    setSyncState('offline')
    return
  }

  if (newStatus === 'error') {
    if (isEditorHydrating.value) {
      invalidateEditorHydration(false)
    }
    setSyncState('offline')
    return
  }

  if (newStatus === 'saving') {
    setSyncState('syncing')
    return
  }

  if (
    newStatus === 'ready' &&
    currentContent.value &&
    hydratedArticleId !== currentContent.value.articleId
  ) {
    void requestEditorHydration(currentContent.value)
    return
  }

  if (
    newStatus === 'ready'
    && !isEditorHydrating.value
    && completedSaveSequence >= pendingSaveSequence
  ) {
    setSyncState('synced')
  }
})

// ═══ Auto Save (防抖) ═══
function createEditorSaveRequest(markdown: string): EditorSaveRequest | null {
  const content = currentContent.value
  if (!content) {
    return null
  }

  return {
    contentId: content.id,
    articleId: content.articleId,
    markdown,
    title: titleText.value,
    transcript: transcriptText.value,
    saveSequence: ++pendingSaveSequence,
  }
}

function schedulePersist(markdown: string): void {
  if (!isReady.value && editorStatus.value !== 'error') return

  const request = createEditorSaveRequest(markdown)
  if (!request) return

  setSyncState('syncing')
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    void persistMarkdown(request)
  }, 900)
}

async function persistMarkdown(request: EditorSaveRequest, throwOnFailure = false): Promise<void> {
  if (!isReady.value && editorStatus.value !== 'error') return

  const content = currentContent.value
  if (
    !content
    || content.id !== request.contentId
    || content.articleId !== request.articleId
  ) {
    if (throwOnFailure) {
      throw new Error('Editor content changed before save started')
    }
    return
  }

  const currentBody = content.body ?? ''
  const normalizedCurrentBody = isLikelyHtmlContent(currentBody)
    ? serializeHtmlToMarkdown(currentBody)
    : currentBody

  if (
    editorStore.status !== 'error' &&
    normalizedCurrentBody === request.markdown &&
    request.title === content.title &&
    request.transcript === content.transcript
  ) {
    completedSaveSequence = Math.max(completedSaveSequence, request.saveSequence)
    if (request.saveSequence === pendingSaveSequence) {
      setSyncState('synced')
    }
    return
  }

  await editorStore.updateContent({
    title: request.title,
    body: request.markdown,
    transcript: request.transcript,
  })

  const savedContent = currentContent.value
  if (
    !savedContent
    || savedContent.id !== request.contentId
    || savedContent.articleId !== request.articleId
  ) {
    if (throwOnFailure) {
      throw new Error('Editor content changed before save completed')
    }
    return
  }

  if (editorStore.status === 'error') {
    if (request.saveSequence === pendingSaveSequence) {
      setSyncState('dirty')
    }
    if (throwOnFailure) {
      throw new Error(editorStore.error ?? 'Editor persistence failed')
    }
    return
  }

  completedSaveSequence = Math.max(completedSaveSequence, request.saveSequence)
  if (request.saveSequence === pendingSaveSequence) {
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

  const content = currentContent.value
  if (content && (hydratedArticleId !== content.articleId || isEditorHydrating.value)) {
    if (!isReady.value) {
      throw new Error('Editor content is not ready to flush')
    }
    await requestEditorHydration(content)
    if (
      currentContent.value?.articleId !== content.articleId
      || hydratedArticleId !== content.articleId
      || isEditorHydrating.value
    ) {
      throw new Error('Editor content changed before hydration completed')
    }
  }

  const markdown = isSourceMode.value
    ? sourceMarkdown.value
    : serializeHtmlToMarkdown(bodyEditor.value?.getHTML() ?? '')

  if (isSourceMode.value) {
    await projectMarkdownToTypora(markdown)
  } else {
    sourceMarkdown.value = markdown
  }

  const request = createEditorSaveRequest(markdown)
  if (request) {
    await persistMarkdown(request, true)
  }
}

function getEditorScrollElement(): HTMLElement | null {
  if (!isSourceMode.value) {
    const editorDom = bodyEditor.value?.view.dom
    return editorDom
      ? findTypewriterScrollParent(editorDom)
      : editorScrollRef.value
  }
  return sourceModeLayoutRef.value?.querySelector<HTMLElement>('.cm-scroller') ?? null
}

// 暴露编辑器实例供外部组件（如 OutlinePanel）使用
defineExpose({
  getBodyEditor: () => bodyEditor.value ?? undefined,
  getEditorScrollElement,
  insertAssetImage,
  openComponentLibrary,
  flushPendingChanges,
})

onBeforeUnmount(() => {
  invalidateEditorHydration(false)
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
      v-show="isReady && !isEditorHydrating"
      class="editor-mode-shell"
      :class="[`mode-${editorMode}`, editorPresetClasses]"
      :data-editor-platform="editorPlatform"
      :data-preset-id="editorPresetId"
      :data-visual-variant="editorVisualVariantId"
      :data-preset-persona="editorPresetPersona || undefined"
    >
      <div
        v-show="!isSourceMode"
        ref="editorScrollRef"
        class="editor-scroll"
      >
        <div
          class="editor-paper"
          :class="editorPresetClasses"
          :data-editor-platform="editorPlatform"
          :data-preset-id="editorPresetId"
          :data-preset-name="editorPreset?.name"
          :data-visual-variant="editorVisualVariantId"
          :data-preset-persona="editorPresetPersona || undefined"
          :data-heading-scale="settingsStore.settings.appearance.typography.headingScale"
          :data-heading-style="settingsStore.settings.appearance.typography.headingStyle"
          :data-blockquote-style="settingsStore.settings.appearance.typography.blockquoteStyle"
          :data-divider-style="settingsStore.settings.appearance.typography.dividerStyle"
          :data-media-style="settingsStore.settings.appearance.typography.mediaStyle"
          :style="{
            '--paper-font': editorFontFamily,
            '--paper-preset-font': editorPresetFontFamily,
            '--paper-preset-accent': editorPresetAccent,
            '--paper-preset-text-accent': editorPresetTextAccent,
            '--accent-primary': editorPresetAccent,
            '--accent-primary-light': `color-mix(in srgb, ${editorPresetAccent} 14%, transparent)`,
            '--ember': editorPresetAccent,
            '--ember-soft': `color-mix(in srgb, ${editorPresetAccent} 10%, transparent)`,
            '--ember-border': `color-mix(in srgb, ${editorPresetAccent} 34%, transparent)`,
            '--paper-size': editorFontSize,
            '--paper-lh': editorLineHeight,
            '--paper-letter-spacing': editorLetterSpacing,
            '--paper-paragraph-spacing': editorParagraphSpacing,
            '--paper-text-indent': editorTextIndent,
            '--paper-text-align': editorTextAlign,
            '--paper-list-spacing': editorListSpacing,
            '--paper-h1-scale': editorHeadingScale.h1,
            '--paper-h2-scale': editorHeadingScale.h2,
            '--paper-h3-scale': editorHeadingScale.h3,
            '--paper-max-width': editorPaperWidth,
          }"
        >
          <section
            v-if="editorPlatform === 'wechat'"
            class="editor-delivery-projection editor-delivery-projection--front"
            data-editor-projection="wechat-front"
            contenteditable="false"
            aria-label="微信文章文前投影"
          >
            <header class="editor-projection-brandline">
              <span>INKFORGE · {{ editorPresetPersona || editorPreset?.name }}</span>
              <span>文章值得您享受</span>
            </header>
            <button
              type="button"
              class="editor-projection-config"
              aria-label="配置文前歌曲、阅读信息与文末名片"
              @click="emit('open-delivery-settings', 'overview')"
            >
              <Settings2 :size="14" />
              配置
            </button>
            <section
              v-if="deliveryMastheadSong"
              class="editor-projection-song"
              data-editor-delivery-slot="masthead-song"
            >
              <img
                v-if="deliveryMastheadSong.coverUrl"
                :src="deliveryMastheadSong.coverUrl"
                :alt="`${deliveryMastheadSong.title} 封面`"
              >
              <span v-else class="editor-projection-song__mark" aria-hidden="true">
                <Music2 :size="18" />
              </span>
              <span class="editor-projection-song__copy">
                <small>文前歌曲</small>
                <strong>{{ deliveryMastheadSong.title }}</strong>
                <span v-if="deliveryMastheadSong.artist">{{ deliveryMastheadSong.artist }}</span>
              </span>
            </section>
            <button
              v-else
              type="button"
              class="editor-projection-empty-slot"
              @click="emit('open-delivery-settings', 'song')"
            >
              <Music2 :size="16" />
              添加真实文前歌曲
            </button>
            <section class="editor-projection-identity">
              <span class="editor-projection-identity__index">I</span>
              <span>
                <small>{{ props.articleCategory || '未分类' }}</small>
                <strong>{{ titleText || '未命名文章' }}</strong>
              </span>
            </section>
            <footer class="editor-projection-metrics">
              <span>
                <BookOpenText :size="14" />
                <template v-if="settingsStore.settings.export.deliveryAdornment.readingTime.enabled">
                  {{ props.wechatStats ? `阅读约 ${props.wechatStats.readingTime} 分钟` : '阅读统计待生成' }}
                </template>
                <template v-else>阅读时间已关闭</template>
              </span>
              <span>{{ props.wechatStats ? `全文 ${props.wechatStats.wordCount} 字` : '全文统计待生成' }}</span>
              <span v-if="props.articleCategory">{{ props.articleCategory }}</span>
            </footer>
          </section>
          <!-- 编辑器直接挂载点 — Editor 在 onMounted 时直接挂到这个 div -->
          <div
            ref="editorContainerRef"
            class="tiptap-content"
            :data-editor-platform="editorPlatform"
            :data-preset-id="editorPresetId"
            :data-visual-variant="editorVisualVariantId"
            @contextmenu="openContextMenu"
          />
          <section
            v-if="editorPlatform === 'wechat'"
            class="editor-delivery-projection editor-delivery-projection--end"
            data-editor-projection="wechat-end"
            contenteditable="false"
            aria-label="微信文章文末投影"
          >
            <section
              v-if="deliveryEndProfile"
              class="editor-projection-profile"
              data-editor-delivery-slot="after-body-profile"
            >
              <img
                v-if="deliveryEndProfile.avatarUrl"
                :src="deliveryEndProfile.avatarUrl"
                :alt="`${deliveryEndProfile.displayName} 头像`"
              >
              <span v-else class="editor-projection-profile__mark" aria-hidden="true">
                <ContactRound :size="22" />
              </span>
              <span class="editor-projection-profile__copy">
                <small>欢迎关注</small>
                <strong>{{ deliveryEndProfile.displayName }}</strong>
                <span v-if="deliveryEndProfile.accountId">{{ deliveryEndProfile.accountId }}</span>
                <span v-if="deliveryEndProfile.description">{{ deliveryEndProfile.description }}</span>
              </span>
              <img
                v-if="deliveryEndProfile.qrImageUrl"
                class="editor-projection-profile__qr"
                :src="deliveryEndProfile.qrImageUrl"
                :alt="`${deliveryEndProfile.displayName} 二维码`"
              >
            </section>
            <button
              v-else
              type="button"
              class="editor-projection-empty-slot"
              @click="emit('open-delivery-settings', 'profile')"
            >
              <ContactRound :size="16" />
              配置作者公众号名片
            </button>
            <footer class="editor-projection-close">
              <span v-if="deliveryRemainderLabels.length">
                后续组件：{{ deliveryRemainderLabels.join(' · ') }}
              </span>
              <span>{{ deliveryLicense.url ? deliveryLicense.shortLabel : '未附加 CC 协议' }}</span>
              <span>InkForge 品牌收尾由当前预设生成</span>
              <button type="button" @click="emit('open-delivery-settings', 'license')">
                <Settings2 :size="13" />
                调整文末
              </button>
            </footer>
          </section>
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
            @request-image="requestContextImageInsert"
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
        ref="sourceModeLayoutRef"
        class="source-mode-layout"
      >
        <section class="source-pane source-pane-editor">
          <section
            v-if="editorPlatform === 'wechat'"
            class="source-delivery-status"
            contenteditable="false"
            aria-label="微信自动首尾投递状态"
          >
            <span>{{ deliveryProjectionSummary }}</span>
            <button type="button" @click="emit('open-delivery-settings', 'overview')">
              <Settings2 :size="13" />
              配置
            </button>
          </section>
          <MarkdownEditor
            :model-value="sourceMarkdown"
            placeholder="# 开始写作..."
            @update:model-value="handleSourceUpdate"
            @ready="handleSourceEditorReady"
          />
        </section>
      </div>
    </div>
    <WritingComponentLibrary
      :visible="componentLibraryVisible"
      :initial-source="componentLibraryInitialSource"
      @close="closeComponentLibrary"
      @insert="insertWritingComponent"
    />
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
  border-top: 4px solid var(--paper-preset-accent, var(--ember));
  border-radius: 2px;
  box-shadow: var(--elev-1);
  padding: 64px 72px;
  outline: none;
  transition:
    border-color var(--motion-base) var(--ease-out-quart),
    box-shadow var(--motion-base) var(--ease-out-quart);
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
  font-family: var(--paper-font, var(--paper-preset-font, 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif));
  font-size: var(--paper-size, 17px);
  line-height: var(--paper-lh, 1.618);
  color: #37474F;
  letter-spacing: var(--paper-letter-spacing, 0.01em);
  caret-color: var(--paper-preset-accent, var(--ember));
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
  background: color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 4%, transparent);
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
  background: color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 16%, transparent);
}

.tiptap-content :deep(.ProseMirror h1) {
  font-family: var(--paper-preset-font, var(--paper-font, 'Noto Serif SC', serif));
  font-size: calc(var(--paper-size, 16px) * var(--paper-h1-scale, 1.75));
  font-weight: 700;
  color: #263238;
  margin: 1.2em 0 0.6em;
  line-height: 1.4;
}

.tiptap-content :deep(.ProseMirror h2) {
  font-family: var(--paper-preset-font, var(--paper-font, 'Noto Serif SC', serif));
  font-size: calc(var(--paper-size, 16px) * var(--paper-h2-scale, 1.38));
  font-weight: 600;
  margin: 1em 0 0.5em;
  color: #263238;
  letter-spacing: -0.2px;
}

.tiptap-content :deep(.ProseMirror h3) {
  font-family: var(--paper-preset-font, var(--paper-font, 'Noto Serif SC', serif));
  font-size: calc(var(--paper-size, 16px) * var(--paper-h3-scale, 1.12));
  font-weight: 600;
  margin: 0.8em 0 0.4em;
  color: #37474F;
}

.tiptap-content :deep(.ProseMirror p) {
  font-family: var(--paper-font, 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif);
  font-size: var(--paper-size, 17px);
  line-height: var(--paper-lh, 1.618);
  color: #37474F;
  margin-bottom: var(--paper-paragraph-spacing, 0.8em);
  text-indent: var(--paper-text-indent, 0);
  text-align: var(--paper-text-align, left);
}

.tiptap-content :deep(.ProseMirror blockquote) {
  border-left: 3px solid var(--hairline);
  background: var(--bg-rice-paper);
  padding: 12px 16px;
  margin: 16px 0;
  color: #607D8B;
  font-style: italic;
}

.editor-paper[data-heading-style="underline"] .tiptap-content :deep(.ProseMirror :is(h1, h2, h3)) {
  border-bottom: 2px solid var(--accent-primary, #D32F2F);
  padding-bottom: 0.18em;
}

.editor-paper[data-heading-style="background"] .tiptap-content :deep(.ProseMirror :is(h1, h2, h3)) {
  background: var(--accent-primary-light, rgba(211, 47, 47, 0.1));
  padding: 0.12em 0.4em;
  border-radius: 6px;
}

.editor-paper[data-heading-style="border-left"] .tiptap-content :deep(.ProseMirror :is(h1, h2, h3)) {
  border-left: 4px solid var(--accent-primary, #D32F2F);
  padding-left: 0.5em;
}

.editor-paper[data-heading-style="pill"] .tiptap-content :deep(.ProseMirror :is(h1, h2, h3)) {
  display: table;
  max-width: 100%;
  padding: 0.18em 0.72em;
  border: 1px solid var(--accent-primary, #D32F2F);
  border-radius: 999px;
  background: var(--accent-primary-light, rgba(211, 47, 47, 0.1));
  box-sizing: border-box;
}

.editor-paper[data-heading-style="marker"] .tiptap-content :deep(.ProseMirror :is(h1, h2, h3)) {
  background: linear-gradient(
    to bottom,
    transparent 62%,
    var(--accent-primary-light, rgba(211, 47, 47, 0.1)) 62%
  );
  padding: 0 0.08em 0.08em;
}

.editor-paper[data-blockquote-style="minimal"] .tiptap-content :deep(.ProseMirror blockquote) {
  border-left-width: 2px;
  background: transparent;
  padding: 0 0 0 12px;
}

.editor-paper[data-blockquote-style="modern"] .tiptap-content :deep(.ProseMirror blockquote) {
  border-left: 0;
  border-radius: 8px;
  background: var(--bg-rice-paper);
  box-shadow: inset 4px 0 0 var(--accent-primary, #D32F2F);
  padding: 14px 18px;
}

.editor-paper[data-blockquote-style="card"] .tiptap-content :deep(.ProseMirror blockquote) {
  padding: 16px 18px;
  border: 1px solid var(--accent-primary-light, rgba(211, 47, 47, 0.1));
  border-left: 4px solid var(--accent-primary, #D32F2F);
  border-radius: 10px;
  background: var(--bg-surface);
  box-shadow: 0 8px 24px rgba(38, 50, 56, 0.08);
}

.editor-paper[data-blockquote-style="double-line"] .tiptap-content :deep(.ProseMirror blockquote) {
  padding: 14px 4px;
  border: 0;
  border-top: 2px solid var(--accent-primary, #D32F2F);
  border-bottom: 2px solid var(--accent-primary, #D32F2F);
  background: transparent;
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
  margin-bottom: var(--paper-list-spacing, 8px);
}

.tiptap-content :deep(.ProseMirror hr) {
  border: none;
  height: 1px;
  background: var(--hairline);
  margin: 24px 0;
}

.editor-paper[data-divider-style="dots"] .tiptap-content :deep(.ProseMirror hr) {
  width: 120px;
  height: 0;
  border-top: 3px dotted var(--accent-primary, #D32F2F);
  background: transparent;
}

.editor-paper[data-divider-style="ornament"] .tiptap-content :deep(.ProseMirror hr) {
  width: 72px;
  height: 0;
  border-top: 3px double var(--accent-primary, #D32F2F);
  background: transparent;
}

.tiptap-content :deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 16px 0;
}

.editor-paper[data-media-style="plain"] .tiptap-content :deep(.ProseMirror img) {
  padding: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  box-sizing: border-box;
}

.editor-paper[data-media-style="rounded"] .tiptap-content :deep(.ProseMirror img) {
  padding: 0;
  border: 0;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(38, 50, 56, 0.12);
  box-sizing: border-box;
}

.editor-paper[data-media-style="framed"] .tiptap-content :deep(.ProseMirror img) {
  padding: 6px;
  border: 1px solid var(--accent-primary-light, rgba(211, 47, 47, 0.1));
  border-radius: 8px;
  background: var(--bg-surface);
  box-shadow: 0 8px 24px rgba(38, 50, 56, 0.12);
  box-sizing: border-box;
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

/* ─── H4-H6 标题样式 ─── */
.tiptap-content :deep(.ProseMirror :is(h4, h5, h6)) {
  font-family: var(--paper-preset-font, var(--paper-font, 'Noto Serif SC', serif));
  font-weight: 600;
  margin: 1.2em 0 0.5em;
  color: #455A64;
}

.tiptap-content :deep(.ProseMirror h4) {
  font-size: calc(var(--paper-size, 16px) * 0.98);
}

.tiptap-content :deep(.ProseMirror h5) {
  font-size: calc(var(--paper-size, 16px) * 0.9);
}

.tiptap-content :deep(.ProseMirror h6) {
  font-size: calc(var(--paper-size, 16px) * 0.82);
  letter-spacing: 0.04em;
}

/* The editor projects the selected canonical preset/variant without copying export mastheads. */
.editor-paper[data-visual-variant] .tiptap-content :deep(.ProseMirror :is(h1, h2, h3, h4, h5, h6)) {
  color: color-mix(in srgb, var(--text-primary, #263238) 78%, var(--paper-preset-accent));
}

.editor-paper[data-visual-variant] .tiptap-content :deep(.ProseMirror blockquote) {
  border-color: var(--paper-preset-accent);
}

.editor-paper[data-visual-variant] .tiptap-content :deep(.ProseMirror strong) {
  color: var(--paper-preset-text-accent);
}

.editor-paper[data-visual-variant] .tiptap-content :deep(.ProseMirror a) {
  color: var(--paper-preset-text-accent);
}

.editor-paper[data-visual-variant="critical-translation"] {
  border-top-width: 5px;
  border-top-style: double;
}

.editor-paper[data-visual-variant="critical-translation"] .tiptap-content :deep(.ProseMirror h2) {
  padding-block: 0.34em;
  border-top: 1px solid var(--paper-preset-accent);
  border-bottom: 1px solid var(--paper-preset-accent);
  text-align: center;
}

.editor-paper[data-visual-variant="jurisprudence-atlas"] {
  border-top-width: 6px;
  border-top-style: double;
}

.editor-paper[data-visual-variant="jurisprudence-atlas"] .tiptap-content :deep(.ProseMirror h2) {
  padding-block: 0.38em;
  border-top: 3px double var(--paper-preset-accent);
  border-bottom: 3px double var(--paper-preset-accent);
}

.editor-paper[data-visual-variant="industry-section"] {
  border-top-width: 6px;
}

.editor-paper[data-visual-variant="industry-section"] .tiptap-content :deep(.ProseMirror h2) {
  padding-left: 0.65em;
  box-shadow: inset 5px 0 0 var(--paper-preset-accent);
}

.editor-paper[data-visual-variant="fact-wire"] {
  border-top-width: 8px;
}

.editor-paper[data-visual-variant="fact-wire"] .tiptap-content :deep(.ProseMirror h1) {
  padding-block: 0.42em;
  border-top: 8px solid var(--paper-preset-accent);
  border-bottom: 1px solid var(--paper-preset-accent);
}

.editor-paper[data-visual-variant="fact-wire"] .tiptap-content :deep(.ProseMirror h2) {
  padding-left: 0.62em;
  box-shadow: inset 4px 0 0 var(--paper-preset-accent);
}

.editor-paper[data-visual-variant="fact-wire"] .tiptap-content :deep(.ProseMirror blockquote) {
  font-style: normal;
}

.editor-paper[data-visual-variant="machine-foundry"] {
  border-top-width: 8px;
  border-radius: 0;
  background:
    linear-gradient(
      to right,
      color-mix(in srgb, var(--paper-preset-accent) 4%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--paper-preset-accent) 4%, transparent) 1px,
      transparent 1px
    ),
    var(--bg-surface, #FFFFFF);
  background-size: 28px 28px;
}

.editor-paper[data-visual-variant="machine-foundry"] .tiptap-content :deep(.ProseMirror h1) {
  padding: 0.5em 0.72em;
  border: 1px solid color-mix(in srgb, var(--paper-preset-accent) 46%, transparent);
  box-shadow: inset 10px 0 0 var(--paper-preset-accent);
}

.editor-paper[data-visual-variant="machine-foundry"] .tiptap-content :deep(.ProseMirror h2) {
  padding: 0.34em 0.66em;
  border-top: 1px solid color-mix(in srgb, var(--paper-preset-accent) 42%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--paper-preset-accent) 42%, transparent);
  box-shadow: inset 6px 0 0 var(--paper-preset-accent);
}

.editor-paper[data-visual-variant="machine-foundry"] .tiptap-content :deep(.ProseMirror h3) {
  padding-left: 0.62em;
  border-left: 3px solid var(--paper-preset-accent);
  letter-spacing: 0.06em;
}

.editor-paper[data-visual-variant="machine-foundry"] .tiptap-content :deep(.ProseMirror blockquote) {
  outline: 1px solid color-mix(in srgb, var(--paper-preset-accent) 34%, transparent);
  outline-offset: -1px;
  font-style: normal;
}

.editor-paper[data-visual-variant="machine-foundry"] .tiptap-content :deep(.ProseMirror strong) {
  padding-inline: 0.12em;
  background: color-mix(in srgb, var(--paper-preset-accent) 12%, transparent);
  border-bottom: 2px solid color-mix(in srgb, var(--paper-preset-accent) 48%, transparent);
}

.editor-paper[data-visual-variant="knowledge-weave"] {
  border-top-width: 5px;
  border-top-style: dashed;
}

.editor-paper[data-visual-variant="knowledge-weave"] .tiptap-content :deep(.ProseMirror h2) {
  padding: 0.3em 0.68em;
  border-left: 4px solid var(--paper-preset-accent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--paper-preset-accent) 9%, var(--bg-surface));
}

.editor-paper[data-visual-variant="human-margins"] {
  border-top-width: 2px;
}

.editor-paper[data-visual-variant="human-margins"] .tiptap-content :deep(.ProseMirror h2) {
  padding-bottom: 0.36em;
  border-bottom: 1px solid color-mix(in srgb, var(--paper-preset-accent) 46%, transparent);
  font-weight: 500;
  text-align: center;
}

.editor-delivery-projection {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--paper-preset-accent) 34%, var(--hairline));
  background: color-mix(in srgb, var(--paper-preset-accent) 4%, var(--bg-surface));
  color: var(--text-primary);
  font-family: var(--paper-preset-font, var(--paper-font));
}

.editor-delivery-projection--front {
  margin: 0 0 42px;
  border-top: 5px solid var(--paper-preset-accent);
}

.editor-delivery-projection--end {
  margin: 48px 0 0;
  padding: 20px;
  border-left: 5px solid var(--paper-preset-accent);
}

.editor-projection-brandline {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--paper-preset-accent) 28%, var(--hairline));
  color: var(--paper-preset-text-accent);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.editor-projection-config {
  position: absolute;
  z-index: 2;
  top: 52px;
  right: 14px;
}

.editor-projection-config,
.editor-projection-empty-slot,
.editor-projection-close button,
.source-delivery-status button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--paper-preset-accent) 36%, var(--hairline));
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--paper-preset-text-accent, var(--text-primary));
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.editor-projection-config:focus-visible,
.editor-projection-empty-slot:focus-visible,
.editor-projection-close button:focus-visible,
.source-delivery-status button:focus-visible {
  outline: 2px solid var(--paper-preset-accent);
  outline-offset: 2px;
}

.editor-projection-song {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin: 18px 88px 0 16px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--paper-preset-accent) 28%, var(--hairline));
  background: var(--bg-surface);
}

.editor-projection-song > img,
.editor-projection-song__mark {
  display: grid;
  box-sizing: border-box;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 4px;
  background: var(--paper-preset-accent);
  color: #fff;
  object-fit: cover;
}

.editor-projection-song__copy,
.editor-projection-profile__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.editor-projection-song__copy small,
.editor-projection-profile__copy small {
  color: var(--paper-preset-text-accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.editor-projection-song__copy strong,
.editor-projection-profile__copy strong {
  overflow: hidden;
  font-size: 15px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-projection-song__copy > span,
.editor-projection-profile__copy > span {
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.45;
}

.editor-projection-empty-slot {
  margin: 18px 16px 0;
  border-style: dashed;
  border-radius: 7px;
  background: transparent;
}

.editor-projection-identity {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  align-items: stretch;
  gap: 0;
  margin-top: 18px;
  border-top: 4px solid var(--paper-preset-accent);
  border-bottom: 1px solid color-mix(in srgb, var(--paper-preset-accent) 32%, var(--hairline));
}

.editor-projection-identity__index {
  display: grid;
  min-height: 86px;
  place-items: center;
  background: var(--paper-preset-accent);
  color: #fff;
  font-family: Georgia, serif;
  font-size: 34px;
}

.editor-projection-identity > span:last-child {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 7px;
  padding: 16px 18px;
}

.editor-projection-identity small {
  color: var(--paper-preset-text-accent);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
}

.editor-projection-identity strong {
  overflow-wrap: anywhere;
  font-size: clamp(22px, 4.4vw, 34px);
  line-height: 1.25;
}

.editor-projection-metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  padding: 11px 16px;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}

.editor-projection-metrics span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.editor-projection-profile {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
}

.editor-projection-profile > img:not(.editor-projection-profile__qr),
.editor-projection-profile__mark {
  display: grid;
  box-sizing: border-box;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--paper-preset-accent) 14%, var(--bg-surface));
  color: var(--paper-preset-text-accent);
  object-fit: cover;
}

.editor-projection-profile__qr {
  width: 62px;
  height: 62px;
  object-fit: contain;
}

.editor-projection-close {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--paper-preset-accent) 28%, var(--hairline));
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.5;
}

.editor-projection-close button {
  margin-left: auto;
}

.source-delivery-status {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 14px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--hairline);
  background: color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 5%, var(--bg-surface));
  color: var(--text-secondary);
  font-size: 11px;
}

.source-delivery-status > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-delivery-status button {
  flex: 0 0 auto;
  margin-left: auto;
}

.tiptap-content :deep(.ink-component-card) {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin: 22px 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 32%, var(--hairline));
  border-left: 5px solid var(--paper-preset-accent, var(--ember));
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-surface) 96%, var(--paper-preset-accent, var(--ember)));
  color: var(--text-primary);
  cursor: default;
}

.tiptap-content :deep(.ink-component-card.is-selected) {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 18%, transparent);
}

.tiptap-content :deep(.ink-component-card.has-error) {
  border-color: color-mix(in srgb, var(--error) 52%, var(--hairline));
  border-left-color: var(--error);
}

.tiptap-content :deep(.ink-component-card__chrome) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 20%, var(--hairline));
  background: color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 5%, var(--bg-surface));
}

.tiptap-content :deep(.ink-component-card__copy) {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.tiptap-content :deep(.ink-component-card__header) {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.tiptap-content :deep(.ink-component-card__type) {
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 34%, transparent);
  border-radius: 4px;
  color: var(--paper-preset-text-accent, var(--text-primary));
  background: color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 8%, transparent);
  font-family: var(--paper-preset-font, 'JetBrains Mono', monospace);
  font-size: 10px;
  line-height: 1.4;
  letter-spacing: 0.04em;
}

.tiptap-content :deep(.ink-component-card__copy strong) {
  font-size: 14px;
}

.tiptap-content :deep(.ink-component-card__summary) {
  overflow: hidden;
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tiptap-content :deep(.ink-component-card__visual) {
  box-sizing: border-box;
  width: 100%;
  padding: 12px;
  overflow: hidden;
}

.tiptap-content :deep(.ink-component-card__visual .ink-writing-component) {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin: 0 !important;
  background: var(--bg-surface) !important;
  border-color: color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 40%, var(--hairline)) !important;
  border-left-color: var(--paper-preset-accent, var(--ember)) !important;
}

.tiptap-content :deep(.ink-component-card__visual img) {
  max-width: 100%;
  height: auto;
}

.tiptap-content :deep(.ink-component-card__visual a) {
  color: var(--paper-preset-text-accent, var(--text-primary));
  cursor: default;
}

.tiptap-content :deep(.ink-component-card__status) {
  color: var(--text-muted);
  font-size: 11px;
}

.tiptap-content :deep(.ink-component-card.has-error .ink-component-card__status) {
  color: var(--error);
}

.tiptap-content :deep(.ink-component-card__edit) {
  flex: 0 0 auto;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 36%, transparent);
  border-radius: 7px;
  background: color-mix(in srgb, var(--paper-preset-accent, var(--ember)) 10%, transparent);
  color: var(--paper-preset-text-accent, var(--text-primary));
  font: inherit;
  cursor: pointer;
}

.tiptap-content :deep(.ink-component-card__edit:focus-visible) {
  outline: 2px solid var(--paper-preset-accent, var(--ember));
  outline-offset: 2px;
}

@media (max-width: 760px) {
  .editor-projection-brandline {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
    padding-block: 9px;
  }

  .editor-projection-config {
    top: 58px;
  }

  .editor-projection-song {
    margin-right: 16px;
    margin-top: 52px;
  }

  .editor-projection-profile {
    grid-template-columns: 50px minmax(0, 1fr);
  }

  .editor-projection-profile__qr {
    grid-column: 1 / -1;
    width: 86px;
    height: 86px;
    margin: 4px auto 0;
  }

  .tiptap-content :deep(.ink-component-card__summary) {
    white-space: normal;
  }
}

@media (prefers-reduced-motion: reduce) {
  .editor-delivery-projection *,
  .tiptap-content :deep(.ink-component-card *) {
    transition: none !important;
  }
}

</style>
