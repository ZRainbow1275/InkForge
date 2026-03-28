<script setup lang="ts">
/**
 * EditorPanel — 纸张风格编辑器
 *
 * ⚠️ 不使用 useEditor() + EditorContent 组合！
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
import { SmartPunctuation } from '@/extensions/SmartPunctuation'
import { TypewriterMode } from '@/extensions/TypewriterMode'
import { SlashCommands } from '@/extensions/SlashCommands'
import { useSettingsStore } from '@/stores/settings'
import SlashCommandMenu from './SlashCommandMenu.vue'

// lowlight 实例 (代码高亮引擎)
const lowlight = createLowlight(common)

const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const { currentContent, status: editorStatus, error: editorError } = storeToRefs(editorStore)

// 派生状态
const isReady = computed(() => editorStatus.value === 'ready' || editorStatus.value === 'saving')
const isLoading = computed(() => editorStatus.value === 'loading')

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

// ═══ 手动 Editor 管理 ═══
// 直接操作 Editor 实例，不使用 useEditor/EditorContent
const editorContainerRef = ref<HTMLElement | null>(null)
const bodyEditor = shallowRef<Editor | null>(null)

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
      SmartPunctuation.configure({
        enabled: settingsStore.settings.editor.smartPunctuation,
      }),
      TypewriterMode.configure({
        enabled: settingsStore.settings.editor.typewriterMode,
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
      SlashCommands,
    ],
    content: '',
    onUpdate: () => {
      autoSave()
    }
  })
})

// 设置 → 扩展实时同步
watch(
  () => settingsStore.settings.editor,
  (editorSettings) => {
    if (!bodyEditor.value) return
    const exts = bodyEditor.value.extensionManager.extensions
    const sp = exts.find(e => e.name === 'smartPunctuation')
    if (sp) sp.options.enabled = editorSettings.smartPunctuation
    const tw = exts.find(e => e.name === 'typewriterMode')
    if (tw) tw.options.enabled = editorSettings.typewriterMode
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
      bodyEditor.value.commands.setContent(content.body || '')
    }
  }
}, { immediate: true })

// 监听状态变化，重置编辑器
watch(editorStatus, (newStatus) => {
  if (newStatus === 'loading' || newStatus === 'idle') {
    titleText.value = ''
    transcriptText.value = ''
    bodyEditor.value?.commands.setContent('')
  }
})

// ═══ Auto Save (防抖) ═══
let saveTimeout: ReturnType<typeof setTimeout>
function autoSave() {
  if (!isReady.value) return
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(saveContent, 2000)
}

async function saveContent() {
  if (!isReady.value) return
  await editorStore.updateContent({
    title: titleText.value,
    body: bodyEditor.value?.getHTML() || '',
    transcript: transcriptText.value
  })
}

// 暴露编辑器实例供外部组件（如 OutlinePanel）使用
defineExpose({ bodyEditor })

onBeforeUnmount(() => {
  bodyEditor.value?.destroy()
  bodyEditor.value = null
  clearTimeout(saveTimeout)
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
        :style="{
          '--paper-font': editorFontFamily,
          '--paper-size': editorFontSize,
          '--paper-lh': editorLineHeight,
        }"
      >
        <!-- 编辑器直接挂载点 — Editor 在 onMounted 时直接挂到这个 div -->
        <div
          ref="editorContainerRef"
          class="tiptap-content"
        />
        <FloatingToolbar :editor="bodyEditor ?? undefined" />
        <SlashCommandMenu :editor="bodyEditor ?? undefined" />
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
  background: #FAFBFC;
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
  max-width: 680px;
  min-height: 800px;
  margin: 0 auto;
  background: var(--bg-surface, #FFFFFF);
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  padding: 64px 72px;
  outline: none;
  transition: box-shadow 0.2s ease;
  align-self: flex-start;
  position: relative;
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

/* ─── H4 标题样式 ─── */
.tiptap-content :deep(.ProseMirror h4) {
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 600;
  margin: 1.2em 0 0.5em;
  color: #455A64;
}

</style>
