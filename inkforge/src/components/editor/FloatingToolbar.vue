<script setup lang="ts">
/**
 * FloatingToolbar — 手动实现的浮动格式工具栏
 *
 * 不使用 @tiptap/vue-3 的 <BubbleMenu> 组件！
 * BubbleMenu 在 onMounted 中调用 editor.registerPlugin() → view.updateState()，
 * 而 EditorContent 的元素交换用了 nextTick 延迟，存在不可避免的竞态条件，
 * 导致 view.docView.localsInner 崩溃。
 *
 * 替代方案：监听 editor 的 selectionUpdate / transaction 事件，
 * 手动计算选区位置并用 CSS absolute 定位工具栏。
 */
import { ref, watch, onBeforeUnmount, onMounted, nextTick } from 'vue'
import type { Editor } from '@tiptap/core'
import {
  Bold, Italic, Underline, Strikethrough, Code,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  Link, Code2, Minus,
  Highlighter, Palette,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Superscript, Subscript,
  Table, CheckSquare
} from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{
  editor: Editor | undefined
}>()

// ---- 工具栏可见性与定位 ----
const visible = ref(false)
const compactToolbar = ref(false)
const toolbarStyle = ref<Record<string, string>>({ top: '0px', left: '0px', maxWidth: '680px' })
const toolbarEl = ref<HTMLElement | null>(null)
const settingsStore = useSettingsStore()

let layoutResizeObserver: ResizeObserver | null = null

function isActive(type: string | Record<string, unknown>, options?: Record<string, unknown>): boolean {
  if (typeof type === 'string') {
    return props.editor?.isActive(type, options) ?? false
  }
  return props.editor?.isActive(type) ?? false
}

/**
 * 根据当前选区更新工具栏位置和可见性
 */
function updateToolbar(): void {
  const editor = props.editor
  if (!editor || !editor.view) {
    visible.value = false
    return
  }

  const { state, view } = editor
  const { selection } = state
  const { from, to, empty } = selection

  // 空选区 → 隐藏
  if (empty) {
    visible.value = false
    return
  }

  // 获取选区的 DOM 范围
  try {
    const start = view.coordsAtPos(from)
    const end = view.coordsAtPos(to)

    // 计算中心位置（相对于编辑器容器）
    const editorRect = view.dom.closest('.editor-paper')?.getBoundingClientRect()
      ?? view.dom.getBoundingClientRect()
    const toolbarWidth = toolbarEl.value?.offsetWidth ?? 360
    const toolbarHeight = toolbarEl.value?.offsetHeight ?? 44

    const centerX = (start.left + end.right) / 2 - editorRect.left
    const preferredTop = start.top - editorRect.top - toolbarHeight - 12
    const fallbackTop = end.bottom - editorRect.top + 12
    const preferredLeft = centerX - toolbarWidth / 2
    const leftEdge = 8
    const rightEdge = Math.max(8, editorRect.width - toolbarWidth - 8)
    const adjustedLeft = editorRect.width <= toolbarWidth + 16
      ? 8
      : Math.min(Math.max(preferredLeft, leftEdge), rightEdge)
    const maxTop = Math.max(4, editorRect.height - toolbarHeight - 4)
    const adjustedTop = preferredTop >= 4
      ? preferredTop
      : Math.min(Math.max(4, fallbackTop), maxTop)

    compactToolbar.value = editorRect.width < 480 || toolbarWidth > editorRect.width - 24

    toolbarStyle.value = {
      top: `${adjustedTop}px`,
      left: `${adjustedLeft}px`,
      maxWidth: `${Math.max(220, editorRect.width - 16)}px`,
    }
    visible.value = true
  } catch {
    // coordsAtPos 可能在 docView 未就绪时抛异常，静默忽略
    visible.value = false
  }
}

// ---- 监听 editor 事件 ----
let unsubscribe: (() => void) | null = null

function attachListeners(editor: Editor): void {
  detachListeners()

  const onSelectionUpdate = () => {
    nextTick(updateToolbar)
  }
  const onBlur = () => {
    // 延迟隐藏，让按钮点击事件先触发
    setTimeout(() => {
      if (!editor.isFocused) {
        visible.value = false
      }
    }, 150)
  }

  editor.on('selectionUpdate', onSelectionUpdate)
  editor.on('blur', onBlur)

  unsubscribe = () => {
    editor.off('selectionUpdate', onSelectionUpdate)
    editor.off('blur', onBlur)
  }
}

function detachListeners(): void {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}

function detachLayoutObserver(): void {
  if (layoutResizeObserver) {
    layoutResizeObserver.disconnect()
    layoutResizeObserver = null
  }
}

function attachLayoutObserver(): void {
  detachLayoutObserver()

  if (typeof ResizeObserver === 'undefined' || !visible.value) {
    return
  }

  layoutResizeObserver = new ResizeObserver(() => {
    void nextTick(updateToolbar)
  })

  if (toolbarEl.value) {
    layoutResizeObserver.observe(toolbarEl.value)
  }

  const paperEl = props.editor?.view.dom.closest('.editor-paper')
  if (paperEl instanceof HTMLElement) {
    layoutResizeObserver.observe(paperEl)
  }
}

function handleViewportResize(): void {
  if (visible.value) {
    void nextTick(updateToolbar)
  }
}

function formatTitle(label: string, shortcutKey?: string): string {
  if (!shortcutKey) {
    return label
  }

  const shortcut = settingsStore.settings.shortcuts[shortcutKey]
  return shortcut ? `${label} (${shortcut})` : label
}

watch(
  () => props.editor,
  (editor, oldEditor) => {
    if (oldEditor) detachListeners()
    if (editor) attachListeners(editor)
  },
  { immediate: true }
)

watch(
  [visible, toolbarEl, () => props.editor],
  () => {
    void nextTick(() => {
      if (visible.value) {
        attachLayoutObserver()
      } else {
        detachLayoutObserver()
      }
    })
  },
)

onBeforeUnmount(() => {
  detachListeners()
  detachLayoutObserver()
})

// ---- 链接插入逻辑 ----
const showLinkInput = ref(false)
const linkUrl = ref('')

function handleLinkClick(): void {
  if (!props.editor) return

  if (isActive('link')) {
    props.editor.chain().focus().unsetLink().run()
    return
  }

  const existingHref = props.editor.getAttributes('link').href as string | undefined
  linkUrl.value = existingHref ?? ''
  showLinkInput.value = true
}

/** 验证 URL 协议安全性，仅允许 http/https/mailto */
function isValidLinkUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase()
  // 禁止 javascript:、data:、vbscript: 等危险协议
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return false
  // 允许 http/https/mailto 或相对路径
  if (/^(https?:|mailto:)/i.test(trimmed)) return true
  // 允许以 / 或 # 开头的相对路径
  if (/^[/#]/.test(trimmed)) return true
  // 允许无协议前缀的域名（自动补 https）
  if (/^[a-z0-9][\w.-]*\.[a-z]{2,}/i.test(trimmed)) return true
  return false
}

function confirmLink(): void {
  if (!props.editor) return

  const url = linkUrl.value.trim()
  if (url) {
    if (!isValidLinkUrl(url)) return // 拒绝危险协议
    // 无协议前缀的域名自动补 https
    const safeUrl = /^https?:/i.test(url) || /^[/#]/.test(url) || /^mailto:/i.test(url)
      ? url
      : `https://${url}`
    props.editor.chain().focus().setLink({ href: safeUrl }).run()
  } else {
    props.editor.chain().focus().unsetLink().run()
  }
  showLinkInput.value = false
  linkUrl.value = ''
}

function cancelLink(): void {
  showLinkInput.value = false
  linkUrl.value = ''
  props.editor?.chain().focus().run()
}

function handleExternalLinkEdit(): void {
  handleLinkClick()
}

// ---- 高亮颜色面板 ----
const showHighlightPanel = ref(false)
const highlightPanelEl = ref<HTMLElement | null>(null)

const highlightColors: Array<{ color: string; label: string }> = [
  { color: '#FFEB3B', label: '黄色' },
  { color: '#A5D6A7', label: '绿色' },
  { color: '#90CAF9', label: '蓝色' },
  { color: '#F48FB1', label: '粉色' },
  { color: '#FFCC80', label: '橙色' },
]

function toggleHighlightPanel(): void {
  showTextColorPanel.value = false
  showHighlightPanel.value = !showHighlightPanel.value
}

function applyHighlight(color: string): void {
  if (!props.editor) return
  props.editor.chain().focus().toggleHighlight({ color }).run()
  showHighlightPanel.value = false
}

function removeHighlight(): void {
  if (!props.editor) return
  props.editor.chain().focus().unsetHighlight().run()
  showHighlightPanel.value = false
}

// ---- 文字颜色面板 ----
const showTextColorPanel = ref(false)
const textColorPanelEl = ref<HTMLElement | null>(null)

const textColors: Array<{ color: string; label: string }> = [
  { color: '#D32F2F', label: '红色' },
  { color: '#1565C0', label: '蓝色' },
  { color: '#2E7D32', label: '绿色' },
  { color: '#7B1FA2', label: '紫色' },
  { color: '#E65100', label: '橙色' },
  { color: '#00695C', label: '青色' },
  { color: '#546E7A', label: '灰色' },
  { color: '#212121', label: '黑色' },
]

function toggleTextColorPanel(): void {
  showHighlightPanel.value = false
  showTextColorPanel.value = !showTextColorPanel.value
}

function applyTextColor(color: string): void {
  if (!props.editor) return
  props.editor.chain().focus().setColor(color).run()
  showTextColorPanel.value = false
}

function resetTextColor(): void {
  if (!props.editor) return
  props.editor.chain().focus().unsetColor().run()
  showTextColorPanel.value = false
}

// ---- 点击外部关闭颜色面板 ----
function handleClickOutside(e: MouseEvent): void {
  const target = e.target as Node
  if (showHighlightPanel.value && highlightPanelEl.value && !highlightPanelEl.value.contains(target)) {
    showHighlightPanel.value = false
  }
  if (showTextColorPanel.value && textColorPanelEl.value && !textColorPanelEl.value.contains(target)) {
    showTextColorPanel.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  window.addEventListener('inkforge:edit-link', handleExternalLinkEdit as EventListener)
  window.addEventListener('resize', handleViewportResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
  window.removeEventListener('inkforge:edit-link', handleExternalLinkEdit as EventListener)
  window.removeEventListener('resize', handleViewportResize)
})
</script>

<template>
  <Transition name="ft-fade">
    <div
      v-if="visible && editor"
      ref="toolbarEl"
      class="floating-toolbar"
      :class="{ 'is-compact': compactToolbar }"
      :style="toolbarStyle"
      @mousedown.prevent
    >
      <!-- 格式组 -->
      <button :class="{ active: isActive('bold') }" :title="formatTitle('加粗', 'bold')" @click="editor?.chain().focus().toggleBold().run()"><Bold :size="15" /></button>
      <button :class="{ active: isActive('italic') }" :title="formatTitle('斜体', 'italic')" @click="editor?.chain().focus().toggleItalic().run()"><Italic :size="15" /></button>
      <button :class="{ active: isActive('underline') }" :title="formatTitle('下划线', 'underline')" @click="editor?.chain().focus().toggleUnderline().run()"><Underline :size="15" /></button>
      <button :class="{ active: isActive('strike') }" :title="formatTitle('删除线', 'strikethrough')" @click="editor?.chain().focus().toggleStrike().run()"><Strikethrough :size="15" /></button>
      <button :class="{ active: isActive('code') }" :title="formatTitle('行内代码', 'inlineCode')" @click="editor?.chain().focus().toggleCode().run()"><Code :size="15" /></button>

      <!-- 高亮 (带颜色面板) -->
      <div ref="highlightPanelEl" class="toolbar-btn-wrapper">
        <button :class="{ active: isActive('highlight') }" :title="formatTitle('高亮标记', 'highlight')" @click="toggleHighlightPanel"><Highlighter :size="15" /></button>
        <div v-if="showHighlightPanel" class="toolbar-color-panel">
          <button v-for="hc in highlightColors" :key="hc.color" class="toolbar-color-swatch" :style="{ background: hc.color }" :title="hc.label" @click="applyHighlight(hc.color)" />
          <button class="toolbar-color-reset" title="清除高亮" @click="removeHighlight">清除</button>
        </div>
      </div>

      <!-- 文字颜色 (带颜色面板) -->
      <div ref="textColorPanelEl" class="toolbar-btn-wrapper">
        <button :class="{ active: isActive('textStyle') }" :title="formatTitle('文字颜色')" @click="toggleTextColorPanel"><Palette :size="15" /></button>
        <div v-if="showTextColorPanel" class="toolbar-color-panel">
          <button v-for="tc in textColors" :key="tc.color" class="toolbar-color-swatch" :style="{ background: tc.color }" :title="tc.label" @click="applyTextColor(tc.color)" />
          <button class="toolbar-color-reset" title="重置颜色" @click="resetTextColor">重置</button>
        </div>
      </div>

      <span class="toolbar-sep" />

      <!-- 上标 / 下标 -->
      <button :class="{ active: isActive('superscript') }" :title="formatTitle('上标')" @click="editor?.chain().focus().toggleSuperscript().run()"><Superscript :size="15" /></button>
      <button :class="{ active: isActive('subscript') }" :title="formatTitle('下标')" @click="editor?.chain().focus().toggleSubscript().run()"><Subscript :size="15" /></button>

      <span class="toolbar-sep" />

      <!-- 标题组 -->
      <button :class="{ active: isActive('heading', { level: 1 }) }" :title="formatTitle('一级标题', 'heading1')" @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"><Heading1 :size="15" /></button>
      <button :class="{ active: isActive('heading', { level: 2 }) }" :title="formatTitle('二级标题', 'heading2')" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"><Heading2 :size="15" /></button>
      <button :class="{ active: isActive('heading', { level: 3 }) }" :title="formatTitle('三级标题', 'heading3')" @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"><Heading3 :size="15" /></button>

      <span class="toolbar-sep" />

      <!-- 块级组 -->
      <button :class="{ active: isActive('blockquote') }" :title="formatTitle('引用', 'blockquote')" @click="editor?.chain().focus().toggleBlockquote().run()"><Quote :size="15" /></button>
      <button :class="{ active: isActive('bulletList') }" :title="formatTitle('无序列表', 'bulletList')" @click="editor?.chain().focus().toggleBulletList().run()"><List :size="15" /></button>
      <button :class="{ active: isActive('orderedList') }" :title="formatTitle('有序列表', 'orderedList')" @click="editor?.chain().focus().toggleOrderedList().run()"><ListOrdered :size="15" /></button>
      <button :class="{ active: isActive('taskList') }" :title="formatTitle('任务列表', 'taskList')" @click="editor?.chain().focus().toggleTaskList().run()"><CheckSquare :size="15" /></button>

      <span class="toolbar-sep" />

      <!-- 对齐组 -->
      <button :class="{ active: isActive({ textAlign: 'left' }) }" :title="formatTitle('左对齐')" @click="editor?.chain().focus().setTextAlign('left').run()"><AlignLeft :size="15" /></button>
      <button :class="{ active: isActive({ textAlign: 'center' }) }" :title="formatTitle('居中对齐')" @click="editor?.chain().focus().setTextAlign('center').run()"><AlignCenter :size="15" /></button>
      <button :class="{ active: isActive({ textAlign: 'right' }) }" :title="formatTitle('右对齐')" @click="editor?.chain().focus().setTextAlign('right').run()"><AlignRight :size="15" /></button>
      <button :class="{ active: isActive({ textAlign: 'justify' }) }" :title="formatTitle('两端对齐')" @click="editor?.chain().focus().setTextAlign('justify').run()"><AlignJustify :size="15" /></button>

      <span class="toolbar-sep" />

      <!-- 插入组 -->
      <button :class="{ active: isActive('link') }" :title="formatTitle('链接', 'link')" @click="handleLinkClick"><Link :size="15" /></button>
      <button :class="{ active: isActive('codeBlock') }" :title="formatTitle('代码块', 'codeBlock')" @click="editor?.chain().focus().toggleCodeBlock().run()"><Code2 :size="15" /></button>
      <button :title="formatTitle('分割线', 'horizontalRule')" @click="editor?.chain().focus().setHorizontalRule().run()"><Minus :size="15" /></button>
      <button :title="formatTitle('插入表格', 'table')" @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"><Table :size="15" /></button>

      <!-- 链接输入浮层 -->
      <div v-if="showLinkInput" class="toolbar-link-input">
        <input
          v-model="linkUrl"
          type="url"
          placeholder="输入链接地址..."
          class="toolbar-link-field"
          @keydown.enter.prevent="confirmLink"
          @keydown.escape.prevent="cancelLink"
        >
        <button class="toolbar-link-confirm" @click="confirmLink">确定</button>
        <button class="toolbar-link-cancel" @click="cancelLink">取消</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ---- 浮动工具栏主容器 ---- */
.floating-toolbar {
  position: absolute;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;
  max-width: calc(var(--paper-width, 680px) - 16px);
  pointer-events: auto;
  white-space: normal;
}

/* ---- 按钮 ---- */
.floating-toolbar button {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #475569;
  cursor: pointer;
  transition: all 0.12s ease;
  flex-shrink: 0;
}

.floating-toolbar button:hover {
  background: rgba(211, 47, 47, 0.08);
  color: #1e293b;
}

.floating-toolbar button.active {
  background: rgba(211, 47, 47, 0.12);
  color: #D32F2F;
}

/* ---- 分隔线 ---- */
.toolbar-sep {
  width: 1px;
  height: 16px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0 4px;
  flex-shrink: 0;
}

/* ---- Compact 模式 ---- */
.floating-toolbar.is-compact button:nth-child(n+8) {
  display: none;
}
.floating-toolbar.is-compact .toolbar-sep {
  display: none;
}

/* ---- 按钮容器 (用于包含弹出面板的按钮) ---- */
.toolbar-btn-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

/* ---- 颜色选择面板 ---- */
.toolbar-color-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.10), 0 2px 6px rgba(0, 0, 0, 0.05);
  white-space: nowrap;
  z-index: 110;
}

.toolbar-color-swatch {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
  padding: 0;
}

.toolbar-color-swatch:hover {
  border-color: #D32F2F;
  transform: scale(1.15);
}

.toolbar-color-reset {
  height: 20px;
  padding: 0 6px;
  margin-left: 2px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  border-radius: 4px;
  background: transparent;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.toolbar-color-reset:hover {
  color: #1e293b;
  border-color: rgba(0, 0, 0, 0.20);
  background: rgba(0, 0, 0, 0.04);
}

/* ---- 链接输入浮层 ---- */
.toolbar-link-input {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 6px;
  margin-left: 4px;
  border-left: 1px solid rgba(0, 0, 0, 0.08);
}

.floating-toolbar.is-compact .toolbar-link-input {
  width: 100%;
  margin-left: 0;
  padding: 8px 0 0;
  border-left: none;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.toolbar-link-field {
  width: 180px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.03);
  color: #1e293b;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s;
}

.floating-toolbar.is-compact .toolbar-link-field {
  width: 100%;
}

.toolbar-link-field::placeholder {
  color: #94a3b8;
}

.toolbar-link-field:focus {
  border-color: rgba(211, 47, 47, 0.5);
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.08);
}

.toolbar-link-confirm,
.toolbar-link-cancel {
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.toolbar-link-confirm {
  background: #D32F2F;
  color: white;
}

.toolbar-link-confirm:hover {
  background: #c62828;
}

.toolbar-link-cancel {
  background: transparent;
  color: #64748b;
}

.toolbar-link-cancel:hover {
  color: #1e293b;
  background: rgba(0, 0, 0, 0.05);
}

/* ---- Transition ---- */
.ft-fade-enter-active {
  animation: ftAppear 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ft-fade-leave-active {
  animation: ftAppear 0.1s ease reverse;
}

@keyframes ftAppear {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
