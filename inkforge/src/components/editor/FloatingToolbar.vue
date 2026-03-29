<script setup lang="ts">
/**
 * FloatingToolbar — 手动实现的浮动格式工具栏
 *
 * ⚠️ 不使用 @tiptap/vue-3 的 <BubbleMenu> 组件！
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

const props = defineProps<{
  editor: Editor | undefined
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
        @click="editor?.chain().focus().toggleBold().run()"
        title="加粗 (Ctrl+B)"
      >
        <Bold :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('italic') }"
        @click="editor?.chain().focus().toggleItalic().run()"
        title="斜体 (Ctrl+I)"
      >
        <Italic :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('underline') }"
        @click="editor?.chain().focus().toggleUnderline().run()"
        title="下划线 (Ctrl+U)"
      >
        <Underline :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('strike') }"
        @click="editor?.chain().focus().toggleStrike().run()"
        title="删除线 (Ctrl+Shift+X)"
      >
        <Strikethrough :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('code') }"
        @click="editor?.chain().focus().toggleCode().run()"
        title="行内代码 (Ctrl+E)"
      >
        <Code :size="15" />
      </button>
      <!-- 高亮 (带颜色面板) -->
      <div class="ft-btn-wrapper" ref="highlightPanelEl">
        <button
          class="ft-btn"
          :class="{ active: isActive('highlight') }"
          @click="toggleHighlightPanel"
          title="高亮标记"
        >
          <Highlighter :size="15" />
        </button>
        <div v-if="showHighlightPanel" class="ft-color-panel">
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
      <div class="ft-btn-wrapper" ref="textColorPanelEl">
        <button
          class="ft-btn"
          :class="{ active: isActive('textStyle') }"
          @click="toggleTextColorPanel"
          title="文字颜色"
        >
          <Palette :size="15" />
        </button>
        <div v-if="showTextColorPanel" class="ft-color-panel">
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
        @click="editor?.chain().focus().toggleSuperscript().run()"
        title="上标"
      >
        <Superscript :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('subscript') }"
        @click="editor?.chain().focus().toggleSubscript().run()"
        title="下标"
      >
        <Subscript :size="15" />
      </button>

      <div class="ft-divider" />

      <!-- 标题组: H1 / H2 / H3 -->
      <button
        class="ft-btn"
        :class="{ active: isActive('heading', { level: 1 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
        title="一级标题"
      >
        <Heading1 :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('heading', { level: 2 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
        title="二级标题"
      >
        <Heading2 :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('heading', { level: 3 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
        title="三级标题"
      >
        <Heading3 :size="15" />
      </button>

      <div class="ft-divider" />

      <!-- 块级组: Blockquote / BulletList / OrderedList -->
      <button
        class="ft-btn"
        :class="{ active: isActive('blockquote') }"
        @click="editor?.chain().focus().toggleBlockquote().run()"
        title="引用 (Ctrl+Shift+B)"
      >
        <Quote :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('bulletList') }"
        @click="editor?.chain().focus().toggleBulletList().run()"
        title="无序列表"
      >
        <List :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('orderedList') }"
        @click="editor?.chain().focus().toggleOrderedList().run()"
        title="有序列表"
      >
        <ListOrdered :size="15" />
      </button>
      <!-- 任务列表 -->
      <button
        class="ft-btn"
        :class="{ active: isActive('taskList') }"
        @click="editor?.chain().focus().toggleTaskList().run()"
        title="任务列表"
      >
        <CheckSquare :size="15" />
      </button>

      <div class="ft-divider" />

      <!-- 对齐组: Left / Center / Right / Justify -->
      <button
        class="ft-btn"
        :class="{ active: isActive({ textAlign: 'left' }) }"
        @click="editor?.chain().focus().setTextAlign('left').run()"
        title="左对齐"
      >
        <AlignLeft :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive({ textAlign: 'center' }) }"
        @click="editor?.chain().focus().setTextAlign('center').run()"
        title="居中对齐"
      >
        <AlignCenter :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive({ textAlign: 'right' }) }"
        @click="editor?.chain().focus().setTextAlign('right').run()"
        title="右对齐"
      >
        <AlignRight :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive({ textAlign: 'justify' }) }"
        @click="editor?.chain().focus().setTextAlign('justify').run()"
        title="两端对齐"
      >
        <AlignJustify :size="15" />
      </button>

      <div class="ft-divider" />

      <!-- 插入组: Link / CodeBlock / HorizontalRule / Table -->
      <button
        class="ft-btn"
        :class="{ active: isActive('link') }"
        @click="handleLinkClick"
        title="链接 (Ctrl+K)"
      >
        <Link :size="15" />
      </button>
      <button
        class="ft-btn"
        :class="{ active: isActive('codeBlock') }"
        @click="editor?.chain().focus().toggleCodeBlock().run()"
        title="代码块"
      >
        <Code2 :size="15" />
      </button>
      <button
        class="ft-btn"
        @click="editor?.chain().focus().setHorizontalRule().run()"
        title="分割线"
      >
        <Minus :size="15" />
      </button>
      <!-- 插入表格 -->
      <button
        class="ft-btn"
        @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
        title="插入表格"
      >
        <Table :size="15" />
      </button>

      <!-- 链接输入浮层 -->
      <div v-if="showLinkInput" class="ft-link-input">
        <input
          v-model="linkUrl"
          type="url"
          placeholder="输入链接地址..."
          class="ft-link-field"
          @keydown.enter.prevent="confirmLink"
          @keydown.escape.prevent="cancelLink"
        />
        <button class="ft-link-confirm" @click="confirmLink">确定</button>
        <button class="ft-link-cancel" @click="cancelLink">取消</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.floating-toolbar {
  position: absolute;
  z-index: 100;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04);
  pointer-events: auto;
  white-space: nowrap;
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
  color: rgba(0, 0, 0, 0.55);
  transition: all 0.1s ease;
}

.ft-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.85);
}

.ft-btn.active {
  background: var(--accent-color, #D32F2F);
  color: white;
}

.ft-divider {
  width: 1px;
  height: 16px;
  background: rgba(0, 0, 0, 0.08);
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
  background: rgba(38, 50, 56, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05);
  white-space: nowrap;
  z-index: 110;
}

.ft-color-swatch {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.1s ease;
  padding: 0;
}

.ft-color-swatch:hover {
  border-color: white;
  transform: scale(1.15);
}

.ft-color-reset {
  height: 20px;
  padding: 0 6px;
  margin-left: 2px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.1s ease;
  white-space: nowrap;
}

.ft-color-reset:hover {
  color: white;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.08);
}

/* ---- 链接输入浮层 ---- */
.ft-link-input {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  margin-left: 4px;
  border-left: 1px solid rgba(255, 255, 255, 0.15);
}

.ft-link-field {
  width: 180px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s;
}

.ft-link-field::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.ft-link-field:focus {
  border-color: rgba(211, 47, 47, 0.6);
}

.ft-link-confirm,
.ft-link-cancel {
  height: 26px;
  padding: 0 8px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.1s ease;
}

.ft-link-confirm {
  background: rgba(211, 47, 47, 0.85);
  color: white;
}

.ft-link-confirm:hover {
  background: rgba(211, 47, 47, 1);
}

.ft-link-cancel {
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
}

.ft-link-cancel:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
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
