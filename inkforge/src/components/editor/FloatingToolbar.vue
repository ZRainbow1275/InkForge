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
  Link, Minus,
  Image,
  Highlighter, Palette,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Superscript, Subscript,
  Table,
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

const blockFormatOptions = [
  { value: 'paragraph', label: '正文' },
  { value: 'heading-1', label: '一级标题' },
  { value: 'heading-2', label: '二级标题' },
  { value: 'heading-3', label: '三级标题' },
  { value: 'heading-4', label: '四级标题' },
  { value: 'heading-5', label: '五级标题' },
  { value: 'heading-6', label: '六级标题' },
  { value: 'blockquote', label: '引用' },
  { value: 'bullet-list', label: '无序列表' },
  { value: 'ordered-list', label: '有序列表' },
  { value: 'task-list', label: '任务列表' },
  { value: 'code-block', label: '代码块' },
] as const

type BlockFormat = typeof blockFormatOptions[number]['value']
type BlockFormatState = BlockFormat | 'mixed'

const currentBlockFormat = ref<BlockFormatState>('paragraph')
const blockFormatUnavailable = ref(false)

function getNodeBlockFormat(nodeName: string, level?: number): BlockFormat | null {
  if (nodeName === 'heading' && level && level >= 1 && level <= 6) {
    return `heading-${level}` as BlockFormat
  }
  const formats: Partial<Record<string, BlockFormat>> = {
    paragraph: 'paragraph',
    blockquote: 'blockquote',
    bulletList: 'bullet-list',
    orderedList: 'ordered-list',
    taskList: 'task-list',
    codeBlock: 'code-block',
  }
  return formats[nodeName] ?? null
}

function resolveBlockFormat(editor: Editor): BlockFormatState {
  const formats = new Set<BlockFormat>()
  const { doc, selection } = editor.state
  if (!selection.empty && typeof doc.nodesBetween === 'function') {
    doc.nodesBetween(selection.from, selection.to, (node, _position, parent) => {
      const parentName = parent?.type.name
      if (
        node.type.name === 'paragraph'
        && ['blockquote', 'listItem', 'taskItem', 'tableCell', 'tableHeader'].includes(parentName ?? '')
      ) {
        return
      }
      const format = getNodeBlockFormat(node.type.name, node.attrs.level as number | undefined)
      if (format) formats.add(format)
    })
  }
  if (formats.size > 1) return 'mixed'
  if (formats.size === 1) return formats.values().next().value ?? 'paragraph'

  if (editor.isActive('taskList')) return 'task-list'
  if (editor.isActive('bulletList')) return 'bullet-list'
  if (editor.isActive('orderedList')) return 'ordered-list'
  if (editor.isActive('blockquote')) return 'blockquote'
  if (editor.isActive('codeBlock')) return 'code-block'
  if (editor.isActive('heading', { level: 1 })) return 'heading-1'
  if (editor.isActive('heading', { level: 2 })) return 'heading-2'
  if (editor.isActive('heading', { level: 3 })) return 'heading-3'
  if (editor.isActive('heading', { level: 4 })) return 'heading-4'
  if (editor.isActive('heading', { level: 5 })) return 'heading-5'
  if (editor.isActive('heading', { level: 6 })) return 'heading-6'
  return 'paragraph'
}

function applyBlockFormat(format: BlockFormatState): void {
  const editor = props.editor
  if (!editor || format === 'mixed' || blockFormatUnavailable.value) return

  const chain = editor.chain().focus()
  switch (format) {
    case 'paragraph': chain.setParagraph().run(); break
    case 'heading-1': chain.toggleHeading({ level: 1 }).run(); break
    case 'heading-2': chain.toggleHeading({ level: 2 }).run(); break
    case 'heading-3': chain.toggleHeading({ level: 3 }).run(); break
    case 'heading-4': chain.toggleHeading({ level: 4 }).run(); break
    case 'heading-5': chain.toggleHeading({ level: 5 }).run(); break
    case 'heading-6': chain.toggleHeading({ level: 6 }).run(); break
    case 'blockquote': chain.toggleBlockquote().run(); break
    case 'bullet-list': chain.toggleBulletList().run(); break
    case 'ordered-list': chain.toggleOrderedList().run(); break
    case 'task-list': chain.toggleTaskList().run(); break
    case 'code-block': chain.toggleCodeBlock().run(); break
  }
  currentBlockFormat.value = resolveBlockFormat(editor)
}

function updateBlockFormatState(editor: Editor): void {
  blockFormatUnavailable.value = editor.isActive('inkComponent')
    || editor.isActive('tableCell')
    || editor.isActive('tableHeader')
  currentBlockFormat.value = resolveBlockFormat(editor)
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

  // 块内光标也要显示当前语义；只有编辑器失焦的空选区才隐藏。
  if (empty && !editor.isFocused) {
    visible.value = false
    return
  }

  updateBlockFormatState(editor)

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
    const shouldRemeasure = !toolbarEl.value
    visible.value = true
    if (shouldRemeasure) void nextTick(updateToolbar)
  } catch {
    // Selection API 异常时静默忽略
    visible.value = false
  }
}

// ---- 监听 editor 事件 ----
let unsubscribe: (() => void) | null = null

function attachListeners(editor: Editor): void {
  detachListeners()

  const onEditorUpdate = () => {
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

  editor.on('selectionUpdate', onEditorUpdate)
  editor.on('transaction', onEditorUpdate)
  editor.on('blur', onBlur)

  unsubscribe = () => {
    editor.off('selectionUpdate', onEditorUpdate)
    editor.off('transaction', onEditorUpdate)
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

function closeToolbar(restoreEditorFocus = false): void {
  visible.value = false
  showHighlightPanel.value = false
  showTextColorPanel.value = false
  showLinkInput.value = false
  linkUrl.value = ''
  linkError.value = ''
  if (restoreEditorFocus) props.editor?.chain().focus().run()
}

// ---- 点击外部或 Escape 关闭 ----
function handleClickOutside(e: MouseEvent): void {
  if (!(e.target instanceof Node) || toolbarEl.value?.contains(e.target)) return
  closeToolbar()
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || !visible.value) return
  e.preventDefault()
  closeToolbar(true)
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('keydown', handleKeydown)
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
      role="toolbar"
      aria-label="文本格式工具栏"
      @mousedown.prevent
    >
      <div
        class="ft-group ft-block-group"
        role="group"
        aria-label="块级语义"
      >
        <label class="ft-block-selector">
          <span class="ft-group-label">块级</span>
          <select
            v-model="currentBlockFormat"
            class="ft-block-select"
            :disabled="blockFormatUnavailable"
            :aria-label="blockFormatUnavailable ? '块级语义：当前组件或表格单元不可切换' : '块级语义'"
            :title="blockFormatUnavailable ? '当前组件或表格单元不支持切换块级语义' : '选择正文、标题、引用、列表或代码块'"
            @mousedown.stop
            @change="applyBlockFormat(currentBlockFormat)"
            @keydown.escape.stop.prevent="closeToolbar(true)"
          >
            <option
              v-if="currentBlockFormat === 'mixed'"
              value="mixed"
              disabled
            >
              多种格式
            </option>
            <option
              v-for="format in blockFormatOptions"
              :key="format.value"
              :value="format.value"
            >
              {{ format.label }}
            </option>
          </select>
        </label>
      </div>

      <div
        class="ft-group ft-character-group"
        role="group"
        aria-label="字符格式"
      >
        <span class="ft-group-label">字符</span>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive('bold') }"
          title="加粗 (Ctrl+B)"
          aria-label="加粗"
          @click="editor?.chain().focus().toggleBold().run()"
        >
          <Bold
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive('italic') }"
          title="斜体 (Ctrl+I)"
          aria-label="斜体"
          @click="editor?.chain().focus().toggleItalic().run()"
        >
          <Italic
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive('underline') }"
          title="下划线 (Ctrl+U)"
          aria-label="下划线"
          @click="editor?.chain().focus().toggleUnderline().run()"
        >
          <Underline
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive('strike') }"
          title="删除线 (Ctrl+Shift+S)"
          aria-label="删除线"
          @click="editor?.chain().focus().toggleStrike().run()"
        >
          <Strikethrough
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive('code') }"
          title="行内代码 (Ctrl+Shift+`)"
          aria-label="行内代码"
          @click="editor?.chain().focus().toggleCode().run()"
        >
          <Code
            :size="15"
            aria-hidden="true"
          />
        </button>
        <div
          ref="highlightPanelEl"
          class="ft-btn-wrapper"
        >
          <button
            type="button"
            class="ft-btn"
            :class="{ active: isActive('highlight') }"
            title="高亮标记 (Ctrl+Shift+H)"
            aria-label="高亮标记"
            aria-haspopup="true"
            :aria-expanded="showHighlightPanel"
            @click="toggleHighlightPanel"
          >
            <Highlighter
              :size="15"
              aria-hidden="true"
            />
          </button>
          <div
            v-if="showHighlightPanel"
            class="ft-color-panel"
            role="group"
            aria-label="高亮颜色"
          >
            <button
              v-for="hc in highlightColors"
              :key="hc.color"
              type="button"
              class="ft-color-swatch"
              :style="{ background: hc.color }"
              :title="hc.label"
              :aria-label="`高亮：${hc.label}`"
              @click="applyHighlight(hc.color)"
            />
            <button
              type="button"
              class="ft-color-reset"
              title="清除高亮"
              aria-label="清除高亮"
              @click="removeHighlight"
            >
              清除
            </button>
          </div>
        </div>
        <div
          ref="textColorPanelEl"
          class="ft-btn-wrapper"
        >
          <button
            type="button"
            class="ft-btn"
            :class="{ active: isActive('textStyle') }"
            title="文字颜色"
            aria-label="文字颜色"
            aria-haspopup="true"
            :aria-expanded="showTextColorPanel"
            @click="toggleTextColorPanel"
          >
            <Palette
              :size="15"
              aria-hidden="true"
            />
          </button>
          <div
            v-if="showTextColorPanel"
            class="ft-color-panel"
            role="group"
            aria-label="文字颜色"
          >
            <button
              v-for="tc in textColors"
              :key="tc.color"
              type="button"
              class="ft-color-swatch"
              :style="{ background: tc.color }"
              :title="tc.label"
              :aria-label="`文字颜色：${tc.label}`"
              @click="applyTextColor(tc.color)"
            />
            <button
              type="button"
              class="ft-color-reset"
              title="重置颜色"
              aria-label="重置文字颜色"
              @click="resetTextColor"
            >
              重置
            </button>
          </div>
        </div>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive('superscript') }"
          title="上标"
          aria-label="上标"
          @click="editor?.chain().focus().toggleSuperscript().run()"
        >
          <Superscript
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive('subscript') }"
          title="下标"
          aria-label="下标"
          @click="editor?.chain().focus().toggleSubscript().run()"
        >
          <Subscript
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive('link') }"
          title="链接 (Ctrl+K)"
          aria-label="链接"
          @click="handleLinkClick"
        >
          <Link
            :size="15"
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        class="ft-group ft-structure-group"
        role="group"
        aria-label="结构操作"
      >
        <span class="ft-group-label">结构</span>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive({ textAlign: 'left' }) }"
          title="左对齐"
          aria-label="左对齐"
          @click="editor?.chain().focus().setTextAlign('left').run()"
        >
          <AlignLeft
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive({ textAlign: 'center' }) }"
          title="居中对齐"
          aria-label="居中对齐"
          @click="editor?.chain().focus().setTextAlign('center').run()"
        >
          <AlignCenter
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive({ textAlign: 'right' }) }"
          title="右对齐"
          aria-label="右对齐"
          @click="editor?.chain().focus().setTextAlign('right').run()"
        >
          <AlignRight
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          :class="{ active: isActive({ textAlign: 'justify' }) }"
          title="两端对齐"
          aria-label="两端对齐"
          @click="editor?.chain().focus().setTextAlign('justify').run()"
        >
          <AlignJustify
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          title="插入图片"
          aria-label="插入图片"
          @click="emit('requestImage')"
        >
          <Image
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          title="分割线 (Ctrl+Enter)"
          aria-label="插入分割线"
          @click="editor?.chain().focus().setHorizontalRule().run()"
        >
          <Minus
            :size="15"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ft-btn"
          title="插入表格 (Ctrl+Alt+Shift+T)"
          aria-label="插入表格"
          @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
        >
          <Table
            :size="15"
            aria-hidden="true"
          />
        </button>
      </div>

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
          aria-label="确认链接"
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
          aria-label="取消链接"
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
  box-sizing: border-box;
  width: max-content;
  max-width: min(calc(100vw - 32px), calc(100% - 16px));
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
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

.ft-group {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.ft-group + .ft-group {
  margin-left: 4px;
  padding-left: 6px;
  border-left: 1px solid var(--hairline);
}

.ft-group-label {
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.ft-block-selector {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 2px;
}

.ft-block-select {
  box-sizing: border-box;
  min-width: 128px;
  height: 32px;
  padding: 0 26px 0 8px;
  border: 1px solid var(--hairline);
  border-radius: 6px;
  background: var(--bg-rice-paper);
  color: var(--text-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.ft-block-select:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
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
    width: calc(100vw - 24px);
    max-width: calc(100% - 16px);
    padding: 6px;
  }

  .ft-group {
    flex: 1 1 100%;
  }

  .ft-group + .ft-group {
    margin-top: 4px;
    margin-left: 0;
    padding-top: 4px;
    padding-left: 0;
    border-top: 1px solid var(--hairline);
    border-left: 0;
  }

  .ft-block-selector {
    width: 100%;
  }

  .ft-block-select {
    min-width: 0;
    flex: 1;
  }

  .ft-btn {
    width: 30px;
    height: 30px;
  }

  .ft-color-panel {
    right: 0;
    left: auto;
    max-width: calc(100vw - 40px);
    transform: none;
    flex-wrap: wrap;
  }
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
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 6px;
  margin-left: 4px;
  border-left: 1px solid var(--hairline);
}

.ft-link-field {
  width: 180px;
  min-width: 0;
  flex: 1 1 140px;
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

@media (prefers-reduced-motion: reduce) {
  .ft-fade-enter-active,
  .ft-fade-leave-active,
  .floating-toolbar.flipped.ft-fade-enter-active,
  .floating-toolbar.flipped.ft-fade-leave-active {
    animation: none;
  }
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
