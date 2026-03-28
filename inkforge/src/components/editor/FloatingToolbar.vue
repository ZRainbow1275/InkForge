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
  Table, CheckSquare,
  MoreHorizontal
} from 'lucide-vue-next'

const props = defineProps<{
  editor: Editor | undefined
}>()

// ---- Compact 模式 (窄屏 < 480px) ----
const isCompact = ref(false)
const isExpanded = ref(false)
let resizeObserver: ResizeObserver | null = null

function toggleExpanded(): void {
  isExpanded.value = !isExpanded.value
}

/** 观察 .editor-paper 容器宽度，切换 compact 模式 */
function setupResizeObserver(): void {
  cleanupResizeObserver()

  const editor = props.editor
  if (!editor?.view) return

  const paperEl = editor.view.dom.closest('.editor-paper') as HTMLElement | null
  if (!paperEl) return

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width = entry.contentRect.width
      const wasCompact = isCompact.value
      isCompact.value = width < 480
      // 退出 compact 模式时重置展开状态
      if (wasCompact && !isCompact.value) {
        isExpanded.value = false
      }
    }
  })
  resizeObserver.observe(paperEl)
}

function cleanupResizeObserver(): void {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}

// ---- 工具栏可见性与定位 ----
const visible = ref(false)
const toolbarStyle = ref({ top: '0px', left: '0px' })
const toolbarEl = ref<HTMLElement | null>(null)

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

    const centerX = (start.left + end.right) / 2 - editorRect.left
    const topY = start.top - editorRect.top - 50 // 工具栏在选区上方

    toolbarStyle.value = {
      top: `${Math.max(4, topY)}px`,
      left: `${centerX}px`,
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

watch(
  () => props.editor,
  (editor, oldEditor) => {
    if (oldEditor) detachListeners()
    if (editor) {
      attachListeners(editor)
      // editor 就绪后观察容器宽度
      nextTick(setupResizeObserver)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  detachListeners()
  cleanupResizeObserver()
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
      :style="toolbarStyle"
      @mousedown.prevent
    >
      <!-- ====== Compact 模式: 只显示核心按钮 + 更多 ====== -->
      <template v-if="isCompact && !isExpanded">
        <!-- 核心按钮: Bold, Italic, Underline, Link, Heading1, CodeBlock -->
        <div class="ft-group">
          <button
            class="ft-btn"
            :class="{ active: isActive('bold') }"
            title="加粗 (Ctrl+B)"
            @click="editor?.chain().focus().toggleBold().run()"
          >
            <Bold :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('italic') }"
            title="斜体 (Ctrl+I)"
            @click="editor?.chain().focus().toggleItalic().run()"
          >
            <Italic :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('underline') }"
            title="下划线 (Ctrl+U)"
            @click="editor?.chain().focus().toggleUnderline().run()"
          >
            <Underline :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('link') }"
            title="链接 (Ctrl+K)"
            @click="handleLinkClick"
          >
            <Link :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('heading', { level: 1 }) }"
            title="一级标题"
            @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
          >
            <Heading1 :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('codeBlock') }"
            title="代码块"
            @click="editor?.chain().focus().toggleCodeBlock().run()"
          >
            <Code2 :size="14" />
          </button>
        </div>
        <!-- 更多按钮 -->
        <button
          class="ft-btn ft-btn-more"
          title="更多"
          @click="toggleExpanded"
        >
          <MoreHorizontal :size="14" />
        </button>
      </template>

      <!-- ====== 完整模式 (含 compact 展开) ====== -->
      <template v-else>
        <!-- 组1: 格式 — B I U S Code Highlight Color -->
        <div class="ft-group">
          <button
            class="ft-btn"
            :class="{ active: isActive('bold') }"
            title="加粗 (Ctrl+B)"
            @click="editor?.chain().focus().toggleBold().run()"
          >
            <Bold :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('italic') }"
            title="斜体 (Ctrl+I)"
            @click="editor?.chain().focus().toggleItalic().run()"
          >
            <Italic :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('underline') }"
            title="下划线 (Ctrl+U)"
            @click="editor?.chain().focus().toggleUnderline().run()"
          >
            <Underline :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('strike') }"
            title="删除线 (Ctrl+Shift+X)"
            @click="editor?.chain().focus().toggleStrike().run()"
          >
            <Strikethrough :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('code') }"
            title="行内代码 (Ctrl+E)"
            @click="editor?.chain().focus().toggleCode().run()"
          >
            <Code :size="14" />
          </button>
          <!-- 高亮 (带颜色面板) -->
          <div
            ref="highlightPanelEl"
            class="ft-btn-wrapper"
          >
            <button
              class="ft-btn"
              :class="{ active: isActive('highlight') }"
              title="高亮标记"
              @click="toggleHighlightPanel"
            >
              <Highlighter :size="14" />
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
              <Palette :size="14" />
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
        </div>

        <!-- 组2: 上标 / 下标 -->
        <div class="ft-group">
          <button
            class="ft-btn"
            :class="{ active: isActive('superscript') }"
            title="上标"
            @click="editor?.chain().focus().toggleSuperscript().run()"
          >
            <Superscript :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('subscript') }"
            title="下标"
            @click="editor?.chain().focus().toggleSubscript().run()"
          >
            <Subscript :size="14" />
          </button>
        </div>

        <!-- 组3: H1 H2 H3 -->
        <div class="ft-group">
          <button
            class="ft-btn"
            :class="{ active: isActive('heading', { level: 1 }) }"
            title="一级标题"
            @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
          >
            <Heading1 :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('heading', { level: 2 }) }"
            title="二级标题"
            @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
          >
            <Heading2 :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('heading', { level: 3 }) }"
            title="三级标题"
            @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
          >
            <Heading3 :size="14" />
          </button>
        </div>

        <!-- 组4: 块级 — 引用 无序 有序 任务 -->
        <div class="ft-group">
          <button
            class="ft-btn"
            :class="{ active: isActive('blockquote') }"
            title="引用 (Ctrl+Shift+B)"
            @click="editor?.chain().focus().toggleBlockquote().run()"
          >
            <Quote :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('bulletList') }"
            title="无序列表"
            @click="editor?.chain().focus().toggleBulletList().run()"
          >
            <List :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('orderedList') }"
            title="有序列表"
            @click="editor?.chain().focus().toggleOrderedList().run()"
          >
            <ListOrdered :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('taskList') }"
            title="任务列表"
            @click="editor?.chain().focus().toggleTaskList().run()"
          >
            <CheckSquare :size="14" />
          </button>
        </div>

        <!-- 组5: 对齐 — 左 中 右 两端 -->
        <div class="ft-group">
          <button
            class="ft-btn"
            :class="{ active: isActive({ textAlign: 'left' }) }"
            title="左对齐"
            @click="editor?.chain().focus().setTextAlign('left').run()"
          >
            <AlignLeft :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive({ textAlign: 'center' }) }"
            title="居中对齐"
            @click="editor?.chain().focus().setTextAlign('center').run()"
          >
            <AlignCenter :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive({ textAlign: 'right' }) }"
            title="右对齐"
            @click="editor?.chain().focus().setTextAlign('right').run()"
          >
            <AlignRight :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive({ textAlign: 'justify' }) }"
            title="两端对齐"
            @click="editor?.chain().focus().setTextAlign('justify').run()"
          >
            <AlignJustify :size="14" />
          </button>
        </div>

        <!-- 组6: 插入 — 链接 代码块 分割线 表格 -->
        <div class="ft-group">
          <button
            class="ft-btn"
            :class="{ active: isActive('link') }"
            title="链接 (Ctrl+K)"
            @click="handleLinkClick"
          >
            <Link :size="14" />
          </button>
          <button
            class="ft-btn"
            :class="{ active: isActive('codeBlock') }"
            title="代码块"
            @click="editor?.chain().focus().toggleCodeBlock().run()"
          >
            <Code2 :size="14" />
          </button>
          <button
            class="ft-btn"
            title="分割线"
            @click="editor?.chain().focus().setHorizontalRule().run()"
          >
            <Minus :size="14" />
          </button>
          <button
            class="ft-btn"
            title="插入表格"
            @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
          >
            <Table :size="14" />
          </button>
        </div>

        <!-- compact 展开模式下的收起按钮 -->
        <button
          v-if="isCompact && isExpanded"
          class="ft-btn ft-btn-more"
          title="收起"
          @click="toggleExpanded"
        >
          <MoreHorizontal :size="14" />
        </button>
      </template>

      <!-- 链接输入浮层 -->
      <div
        v-if="showLinkInput"
        class="ft-link-input"
      >
        <input
          v-model="linkUrl"
          type="url"
          placeholder="输入链接地址..."
          class="ft-link-field"
          @keydown.enter.prevent="confirmLink"
          @keydown.escape.prevent="cancelLink"
        >
        <button
          class="ft-link-confirm"
          @click="confirmLink"
        >
          确定
        </button>
        <button
          class="ft-link-cancel"
          @click="cancelLink"
        >
          取消
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ====== Ethereal Constructivism 浮动工具栏 ====== */

.floating-toolbar {
  position: absolute;
  z-index: 100;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  pointer-events: auto;
  white-space: nowrap;
}

/* ---- 分组容器: 组间 8px 间距替代分割线 ---- */
.ft-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.ft-group + .ft-group {
  margin-left: 8px;
}

/* ---- 按钮: 28x28, slate-600 图标 ---- */
.ft-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #475569; /* slate-600 */
  transition: all 0.12s ease;
}

.ft-btn:hover {
  background: rgba(211, 47, 47, 0.08);
  color: #D32F2F;
}

.ft-btn.active {
  background: rgba(211, 47, 47, 0.12);
  color: #D32F2F;
}

/* ---- "更多" 按钮 ---- */
.ft-btn-more {
  margin-left: 4px;
  color: #94a3b8; /* slate-400 */
}

.ft-btn-more:hover {
  color: #D32F2F;
  background: rgba(211, 47, 47, 0.08);
}

/* ---- 按钮容器 (用于包含弹出面板的按钮) ---- */
.ft-btn-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

/* ---- 颜色选择面板 (白色毛玻璃风格) ---- */
.ft-color-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  white-space: nowrap;
  z-index: 110;
}

.ft-color-swatch {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.1s ease;
  padding: 0;
}

.ft-color-swatch:hover {
  border-color: #D32F2F;
  transform: scale(1.15);
}

.ft-color-reset {
  height: 20px;
  padding: 0 6px;
  margin-left: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  background: transparent;
  color: #64748b; /* slate-500 */
  font-size: 11px;
  cursor: pointer;
  transition: all 0.1s ease;
  white-space: nowrap;
}

.ft-color-reset:hover {
  color: #D32F2F;
  border-color: rgba(211, 47, 47, 0.3);
  background: rgba(211, 47, 47, 0.05);
}

/* ---- 链接输入浮层 (白色风格) ---- */
.ft-link-input {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  margin-left: 4px;
  border-left: 1px solid rgba(0, 0, 0, 0.08);
}

.ft-link-field {
  width: 180px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.03);
  color: #1e293b; /* slate-800 */
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s;
}

.ft-link-field::placeholder {
  color: #94a3b8; /* slate-400 */
}

.ft-link-field:focus {
  border-color: rgba(211, 47, 47, 0.5);
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.1);
}

.ft-link-confirm,
.ft-link-cancel {
  height: 26px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.1s ease;
}

.ft-link-confirm {
  background: #D32F2F;
  color: white;
}

.ft-link-confirm:hover {
  background: #c62828;
}

.ft-link-cancel {
  background: transparent;
  color: #64748b; /* slate-500 */
}

.ft-link-cancel:hover {
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
    transform: translateX(-50%) scale(0.95) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) scale(1) translateY(0);
  }
}
</style>
