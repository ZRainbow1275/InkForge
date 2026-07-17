<script setup lang="ts">
/**
 * FloatingToolbar — 手动实现的浮动格式工具栏
 *
 * Warning: 不使用 @tiptap/vue-3 的 <BubbleMenu> 组件。
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
  Image,
  Highlighter, Palette,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Superscript, Subscript,
  Table, CheckSquare,
  ArrowUpRight
} from 'lucide-vue-next'

const props = defineProps<{
  editor: Editor | undefined
}>()

const emit = defineEmits<{
  requestImage: []
}>()

// ---- 工具栏可见性与定位 ----
const visible = ref(false)
const toolbarStyle = ref({ top: '0px', left: '0px' })
const toolbarEl = ref<HTMLElement | null>(null)
const isFlipped = ref(false)

function isActive(type: string | Record<string, unknown>, options?: Record<string, unknown>): boolean {
  if (typeof type === 'string') {
    return props.editor?.isActive(type, options) ?? false
  }
  return props.editor?.isActive(type) ?? false
}

/** toolbar 与选区之间的间距 (px) */
const TOOLBAR_GAP = 12
/** 容器内边缘最小安全距离 (px) */
const EDGE_PADDING = 8

/**
 * 根据当前选区更新工具栏位置和可见性
 *
 * 定位策略：
 * 1. 使用原生 window.getSelection() 获取选区的精确 DOM rect
 * 2. 基于 .editor-paper 容器计算相对坐标（absolute 定位）
 * 3. 当上方空间不足时自动翻转到选区下方
 * 4. 水平居中于选区，并做左右边界夹紧
 */
function updateToolbar(): void {
  const editor = props.editor
  if (!editor || !editor.view) {
    visible.value = false
    return
  }

  if (showLinkInput.value && toolbarEl.value) {
    visible.value = true
    return
  }

  const { state } = editor
  const { selection } = state
  const { empty } = selection

  // 空选区 → 隐藏
  if (empty) {
    visible.value = false
    return
  }

  // 使用原生 Selection API 获取精确选区矩形
  try {
    const domSelection = window.getSelection()
    if (!domSelection || domSelection.rangeCount === 0) {
      visible.value = false
      return
    }

    const selectionRect = domSelection.getRangeAt(0).getBoundingClientRect()

    // 不可见选区防护（零宽高选区）
    if (selectionRect.width === 0 && selectionRect.height === 0) {
      visible.value = false
      return
    }

    // 获取定位参照容器 (.editor-paper)
    const paperEl = toolbarEl.value?.closest('.editor-paper')
      ?? editor.view.dom.closest('.editor-paper')
      ?? editor.view.dom.parentElement

    if (!paperEl) {
      visible.value = false
      return
    }

    const paperRect = paperEl.getBoundingClientRect()
    const toolbarHeight = toolbarEl.value?.offsetHeight ?? 44

    // ---- 垂直定位 ----
    let topY = selectionRect.top - paperRect.top - toolbarHeight - TOOLBAR_GAP

    // 上下翻转：当上方空间不够时翻转到选区下方
    const needFlip = topY < EDGE_PADDING
    if (needFlip) {
      topY = selectionRect.bottom - paperRect.top + TOOLBAR_GAP
    }
    isFlipped.value = needFlip

    // ---- 水平定位 ----
    // CSS 中 .floating-toolbar 使用 transform: translateX(-50%) 居中
    const toolbarWidth = toolbarEl.value?.offsetWidth ?? 400
    const halfWidth = toolbarWidth / 2
    let centerX = selectionRect.left - paperRect.left + selectionRect.width / 2

    // 左右边界夹紧：确保 toolbar 不超出容器
    const minLeft = halfWidth + EDGE_PADDING
    const maxLeft = paperRect.width - halfWidth - EDGE_PADDING
    if (minLeft < maxLeft) {
      centerX = Math.max(minLeft, Math.min(maxLeft, centerX))
    }

    toolbarStyle.value = {
      top: `${Math.max(4, topY)}px`,
      left: `${centerX}px`,
    }
    visible.value = true
  } catch {
    // Selection API 异常时静默忽略
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
      const toolbarHasFocus = toolbarEl.value?.contains(document.activeElement) ?? false
      if (!editor.isFocused && !toolbarHasFocus) {
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

watch(
  () => props.editor,
  (editor, oldEditor) => {
    if (oldEditor) detachListeners()
    if (editor) attachListeners(editor)
  },
  { immediate: true }
)

onBeforeUnmount(detachListeners)

// ---- 链接插入逻辑 ----
const showLinkInput = ref(false)
const linkUrl = ref('')
const linkError = ref('')
const linkInputEl = ref<HTMLInputElement | null>(null)

watch(linkUrl, () => {
  linkError.value = ''
})

function handleLinkClick(): void {
  if (!props.editor) return

  if (isActive('link')) {
    props.editor.chain().focus().unsetLink().run()
    return
  }

  openLinkEditor()
}

function openLinkEditor(): void {
  if (!props.editor) return

  const existingHref = props.editor.getAttributes('link').href as string | undefined
  linkUrl.value = existingHref ?? ''
  linkError.value = ''
  showHighlightPanel.value = false
  showTextColorPanel.value = false
  showLinkInput.value = true
  visible.value = true
  props.editor.chain().focus().run()
  void nextTick(() => {
    updateToolbar()
    linkInputEl.value?.focus()
  })
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
    if (!isValidLinkUrl(url)) {
      linkError.value = '请输入安全的 http(s)、mailto、相对路径或域名'
      visible.value = true
      void nextTick(() => linkInputEl.value?.focus())
      return
    }
    const safeUrl = /^https?:/i.test(url) || /^[/#]/.test(url) || /^mailto:/i.test(url)
      ? url
      : `https://${url}`
    props.editor.chain().focus().setLink({ href: safeUrl }).run()
  } else {
    props.editor.chain().focus().unsetLink().run()
  }
  linkError.value = ''
  showLinkInput.value = false
  linkUrl.value = ''
}

function cancelLink(): void {
  linkError.value = ''
  showLinkInput.value = false
  linkUrl.value = ''
  props.editor?.chain().focus().run()
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
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
})

defineExpose({ openLinkEditor })
</script>

<template>
  <Transition name="ft-fade">
    <div
      v-if="visible && editor"
      ref="toolbarEl"
      class="floating-toolbar"
      :class="{ flipped: isFlipped }"
      :style="toolbarStyle"
      @mousedown.prevent
    >
      <!-- 格式组: Bold / Italic / Underline / Strikethrough / Code -->
      <button
        class="ft-btn"
        :class="{ active: isActive('bold') }"
        title="加粗 (Ctrl+B)"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <Bold :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('italic') }"
        title="斜体 (Ctrl+I)"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <Italic :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('underline') }"
        title="下划线 (Ctrl+U)"
        @click="editor?.chain().focus().toggleUnderline().run()"
      >
        <Underline :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('strike') }"
        title="删除线 (Ctrl+Shift+S)"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <Strikethrough :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('code') }"
        title="行内代码 (Ctrl+Shift+`)"
        @click="editor?.chain().focus().toggleCode().run()"
      >
        <Code :size="15" />
      </button>
      <!-- 高亮 (带颜色面板) -->
      <div
        ref="highlightPanelEl"
        class="ft-btn-wrapper"
      >
        <button
          class="ft-btn"
          :class="{ active: isActive('highlight') }"
          title="高亮标记 (Ctrl+Shift+H)"
          @click="toggleHighlightPanel"
        >
          <Highlighter :size="15" />
        </button>
        <div
          v-if="showHighlightPanel"
          class="ft-color-panel"
        >
          <button
            v-for="hc in highlightColors"
            :key="hc.color"
            class="ft-color-swatch"
            :style="{ background: hc.color }"
            :title="hc.label"
            @click="applyHighlight(hc.color)"
          />
          <button
            class="ft-color-reset"
            title="清除高亮"
            @click="removeHighlight"
          >
            清除
          </button>
        </div>
      </div>
      <!-- 文字颜色 (带颜色面板) -->
      <div
        ref="textColorPanelEl"
        class="ft-btn-wrapper"
      >
        <button
          class="ft-btn"
          :class="{ active: isActive('textStyle') }"
          title="文字颜色"
          @click="toggleTextColorPanel"
        >
          <Palette :size="15" />
        </button>
        <div
          v-if="showTextColorPanel"
          class="ft-color-panel"
        >
          <button
            v-for="tc in textColors"
            :key="tc.color"
            class="ft-color-swatch"
            :style="{ background: tc.color }"
            :title="tc.label"
            @click="applyTextColor(tc.color)"
          />
          <button
            class="ft-color-reset"
            title="重置颜色"
            @click="resetTextColor"
          >
            重置
          </button>
        </div>
      </div>
      <!-- 上标 / 下标 -->
      <button
        class="ft-btn"
        :class="{ active: isActive('superscript') }"
        title="上标"
        @click="editor?.chain().focus().toggleSuperscript().run()"
      >
        <Superscript :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('subscript') }"
        title="下标"
        @click="editor?.chain().focus().toggleSubscript().run()"
      >
        <Subscript :size="15" />
      </button>

      <div class="ft-divider" />

      <!-- 标题组: H1 / H2 / H3 -->
      <button
        class="ft-btn"
        :class="{ active: isActive('heading', { level: 1 }) }"
        title="一级标题 (Ctrl+1)"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        <Heading1 :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('heading', { level: 2 }) }"
        title="二级标题 (Ctrl+2)"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <Heading2 :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('heading', { level: 3 }) }"
        title="三级标题 (Ctrl+3)"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        <Heading3 :size="15" />
      </button>

      <div class="ft-divider" />

      <!-- 块级组: Blockquote / BulletList / OrderedList -->
      <button
        class="ft-btn"
        :class="{ active: isActive('blockquote') }"
        title="引用 (Ctrl+Shift+Q)"
        @click="editor?.chain().focus().toggleBlockquote().run()"
      >
        <Quote :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('bulletList') }"
        title="无序列表 (Ctrl+Shift+])"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <List :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('orderedList') }"
        title="有序列表 (Ctrl+Shift+[)"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered :size="15" />
      </button>
      <!-- 任务列表 -->
      <button
        class="ft-btn"
        :class="{ active: isActive('taskList') }"
        title="任务列表 (Ctrl+Shift+X)"
        @click="editor?.chain().focus().toggleTaskList().run()"
      >
        <CheckSquare :size="15" />
      </button>

      <div class="ft-divider" />

      <!-- 对齐组: Left / Center / Right / Justify -->
      <button
        class="ft-btn"
        :class="{ active: isActive({ textAlign: 'left' }) }"
        title="左对齐"
        @click="editor?.chain().focus().setTextAlign('left').run()"
      >
        <AlignLeft :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive({ textAlign: 'center' }) }"
        title="居中对齐"
        @click="editor?.chain().focus().setTextAlign('center').run()"
      >
        <AlignCenter :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive({ textAlign: 'right' }) }"
        title="右对齐"
        @click="editor?.chain().focus().setTextAlign('right').run()"
      >
        <AlignRight :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive({ textAlign: 'justify' }) }"
        title="两端对齐"
        @click="editor?.chain().focus().setTextAlign('justify').run()"
      >
        <AlignJustify :size="15" />
      </button>

      <div class="ft-divider" />

      <!-- 插入组: Link / CodeBlock / HorizontalRule / Table -->
      <button
        class="ft-btn"
        title="插入图片"
        @click="emit('requestImage')"
      >
        <Image :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('link') }"
        title="链接 (Ctrl+K)"
        @click="handleLinkClick"
      >
        <Link :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('codeBlock') }"
        title="代码块 (Ctrl+Shift+K)"
        @click="editor?.chain().focus().toggleCodeBlock().run()"
      >
        <Code2 :size="15" />
      </button>
      <button
        class="ft-btn"
        title="分割线 (Ctrl+Enter)"
        @click="editor?.chain().focus().setHorizontalRule().run()"
      >
        <Minus :size="15" />
      </button>
      <!-- 插入表格 -->
      <button
        class="ft-btn"
        title="插入表格 (Ctrl+Alt+Shift+T)"
        @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
      >
        <Table :size="15" />
      </button>

      <!-- 链接输入浮层 -->
      <div
        v-if="showLinkInput"
        class="ft-link-input"
      >
        <input
          ref="linkInputEl"
          v-model="linkUrl"
          type="url"
          placeholder="输入链接地址..."
          class="ft-link-field"
          :aria-invalid="linkError ? 'true' : undefined"
          :aria-describedby="linkError ? 'floating-toolbar-link-error' : undefined"
          @keydown.enter.prevent="confirmLink"
          @keydown.escape.prevent="cancelLink"
        >
        <button
          type="button"
          class="ft-link-confirm"
          @click="confirmLink"
        >
          确定
          <ArrowUpRight
            :size="13"
            class="ft-link-confirm-nib"
          />
        </button>
        <button
          type="button"
          class="ft-link-cancel"
          @click="cancelLink"
        >
          取消
        </button>
        <span
          v-if="linkError"
          id="floating-toolbar-link-error"
          class="ft-link-error"
          role="alert"
        >{{ linkError }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.floating-toolbar {
  position: absolute;
  z-index: 100;
  max-width: min(calc(100vw - 32px), calc(var(--paper-max-width, 680px) - 16px));
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 8px;
  background: var(--bg-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 10px;
  border: 1px solid var(--hairline);
  box-shadow: var(--elev-2);
  pointer-events: auto;
  white-space: normal;
}

.ft-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart);
}

.ft-btn:hover {
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.ft-btn.active {
  background: var(--ember-soft);
  color: var(--ember);
  box-shadow: inset 0 -2px 0 var(--ember);
}

.ft-btn:focus-visible,
.ft-color-swatch:focus-visible,
.ft-color-reset:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

@media (max-width: 480px) {
  .floating-toolbar {
    max-width: calc(100vw - 24px);
    padding: 6px;
  }

  .ft-btn {
    width: 30px;
    height: 30px;
  }
}

.ft-divider {
  width: 1px;
  height: 16px;
  background: var(--hairline);
  margin: 0 4px;
  flex-shrink: 0;
}

/* ---- 按钮容器 (用于包含弹出面板的按钮) ---- */
.ft-btn-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

/* ---- 颜色选择面板 ---- */
.ft-color-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: var(--bg-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 8px;
  border: 1px solid var(--hairline);
  box-shadow: var(--elev-2);
  white-space: nowrap;
  z-index: 110;
}

.ft-color-swatch {
  width: 20px;
  height: 20px;
  border: 2px solid var(--hairline);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart);
  padding: 0;
}

.ft-color-swatch:hover {
  border-color: var(--text-secondary);
  transform: scale(1.15);
}

.ft-color-reset {
  height: 20px;
  padding: 0 6px;
  margin-left: 2px;
  border: 1px solid var(--hairline);
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart),
    border-color var(--motion-fast) var(--ease-out-quart);
  white-space: nowrap;
}

.ft-color-reset:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
  background: var(--bg-rice-paper);
}

/* ---- 链接输入浮层 ---- */
.ft-link-input {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  margin-left: 4px;
  border-left: 1px solid var(--hairline);
}

.ft-link-field {
  width: 180px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--hairline);
  border-radius: 4px;
  background: var(--bg-rice-paper);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart);
}

.ft-link-field::placeholder {
  color: var(--text-muted);
}

.ft-link-field:focus {
  border-color: var(--ember);
  box-shadow: var(--focus-ring);
}

.ft-link-error {
  flex-basis: 100%;
  color: var(--danger, #B42318);
  font-size: 11px;
  line-height: 1.35;
}

.ft-link-confirm,
.ft-link-cancel {
  height: 26px;
  padding: 0 8px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart);
}

.ft-link-confirm {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--ember);
  color: #fff;
  box-shadow: var(--elev-1);
}

.ft-link-confirm:hover {
  box-shadow: var(--glow-ember);
  transform: translateY(-1px);
}

.ft-link-confirm-nib {
  transition: transform var(--motion-fast) var(--ease-out-quart);
}

.ft-link-confirm:hover .ft-link-confirm-nib {
  transform: translate(2px, -2px);
}

.ft-link-confirm:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.ft-link-cancel {
  background: transparent;
  color: var(--text-muted);
}

.ft-link-cancel:hover {
  color: var(--text-primary);
  background: var(--bg-rice-paper);
}

/* ---- Transition ---- */
.ft-fade-enter-active {
  animation: ftAppear 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ft-fade-leave-active {
  animation: ftAppear 0.1s ease reverse;
}

/* 翻转到选区下方时，动画方向反转 */
.floating-toolbar.flipped.ft-fade-enter-active {
  animation: ftAppearFlipped 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.floating-toolbar.flipped.ft-fade-leave-active {
  animation: ftAppearFlipped 0.1s ease reverse;
}

@keyframes ftAppear {
  from {
    opacity: 0;
    transform: translateX(-50%) scale(0.95) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) scale(1) translateY(0);
  }
}

@keyframes ftAppearFlipped {
  from {
    opacity: 0;
    transform: translateX(-50%) scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) scale(1) translateY(0);
  }
}
</style>
