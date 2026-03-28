<script setup lang="ts">
/**
 * WorkstationView - InkForge 工作站 (v2)
 *
 * 四栏动态力场布局：Manager | Editor | Stage | Inspector
 * 设计语言：Ethereal Constructivism
 *
 * 面板折叠/展开 + 快捷键 + 专注模式 + 多平台预览
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FolderOpen,
  History,
  Images,
  Link2,
  List,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Palette,
  Send,
  Type,
  Upload,
} from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'
import { useArticleStore } from '@/stores/article'
import { useSettingsStore } from '@/stores/settings'
import {
  copyToClipboard,
  type Platform,
} from '@/services/export'
import { usePreviewRenderer } from '@/composables/usePreviewRenderer'
import { useFeatureFlag } from '@/composables/useFeatureFlag'
import { themePresets } from '@/services/export/themes'
import { FONT_STACKS } from '@/constants'
import { useTypography } from '@/composables/useTypography'
import { resolveIconComponent } from '@/utils/lucide-icons'

// ─── 子组件 ───
import FileManager from '@/components/file/FileManager.vue'
import VersionPanel from '@/components/version/VersionPanel.vue'
import OutlinePanel from '@/components/outline/OutlinePanel.vue'
import EditorPanel from '@/components/editor/EditorPanel.vue'
import EditorStatusBar from '@/components/editor/EditorStatusBar.vue'
import MarkdownEditor from '@/components/editor/MarkdownEditor.vue'
import MarkdownPreview from '@/components/editor/MarkdownPreview.vue'
import TabBar from '@/components/editor/TabBar.vue'
import AssetManager from '@/components/asset/AssetManager.vue'
import ExportModal from '@/components/export/ExportModal.vue'
import SyncStatusIcon from '@/components/sync/SyncStatusIcon.vue'
import { htmlToMarkdown, markdownToHtml } from '@/utils/markdown'

// ═══════════════════════════════════════════════════════════════════
// Router & Stores
// ═══════════════════════════════════════════════════════════════════

const router = useRouter()
const editorStore = useEditorStore()
const articleStore = useArticleStore()
const settingsStore = useSettingsStore()

const {
  status: editorStatus,
  currentContent,
} = storeToRefs(editorStore)

const { articles, selectedArticle, selectedArticleId } = storeToRefs(articleStore)

// ─── EditorPanel ref (暴露 bodyEditor 给 OutlinePanel) ───
const editorPanelRef = ref<InstanceType<typeof EditorPanel> | null>(null)
const outlineEditor = computed(() => editorPanelRef.value?.bodyEditor ?? undefined)

interface EditorWorkspaceTab {
  id: string
  title: string
  isDirty: boolean
  isActive: boolean
}

const openTabIds = ref<string[]>([])
const editorMode = computed(() => settingsStore.settings.editor.editorMode)
const multiTabFeature = useFeatureFlag('multi-tab')
const multiTabEnabled = computed(() => multiTabFeature.enabled.value)
const markdownSource = ref('')
let syncingMarkdownSource = false

function syncMarkdownSourceFromContent(body: string | undefined): void {
  const nextMarkdown = htmlToMarkdown(body ?? '')
  if (nextMarkdown === markdownSource.value) {
    return
  }

  syncingMarkdownSource = true
  markdownSource.value = nextMarkdown
  queueMicrotask(() => {
    syncingMarkdownSource = false
  })
}

const editorTabs = computed<EditorWorkspaceTab[]>(() => {
  return openTabIds.value
    .map((tabId) => {
      const article = articles.value.find((item) => item.id === tabId)
      if (!article) {
        return null
      }

      return {
        id: tabId,
        title: article.title || '未命名文章',
        isDirty: tabId === selectedArticleId.value && editorStatus.value === 'saving',
        isActive: tabId === selectedArticleId.value,
      }
    })
    .filter((tab): tab is EditorWorkspaceTab => tab !== null)
})

// ═══════════════════════════════════════════════════════════════════
// 面板状态
// ═══════════════════════════════════════════════════════════════════

/** 左栏折叠 */
const managerCollapsed = ref(false)
/** 预览栏折叠 */
const stageCollapsed = ref(false)
/** 右栏折叠 */
const inspectorCollapsed = ref(false)
/** 专注模式 (仅编辑器可见) */
const isFocusMode = ref(false)

// ─── 左栏 Tab ───
type ManagerTab = 'files' | 'versions' | 'outline'
const managerTab = ref<ManagerTab>('files')

// ─── 右栏 Tab ───（已改为滚动式 section，不再需要 tab 切换）

// ─── 排版风格主色选择 ───
const accentColors = [
  { value: '#D32F2F', label: '构成红' },
  { value: '#1565C0', label: '瑞士蓝' },
  { value: '#7B1FA2', label: '典雅紫' },
  { value: '#00796B', label: '墨青' },
  { value: '#263238', label: '雅黑' },
]

function selectAccentColor(color: string): void {
  settingsStore.settings.appearance.accentColor = color
}

// ─── 排版预设快速切换 ───
const topPresets = computed(() => themePresets.slice(0, 5))

function applyPreset(presetId: string): void {
  settingsStore.settings.export.defaultPresetId = presetId
}

// ─── 排版控制（composable） ───
const {
  typography,
  sliderControls: typographySliders,
  updateTypography,
} = useTypography()

const headingStyles: { value: 'underline' | 'background' | 'border-left' | 'none'; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'underline', label: '下划线' },
  { value: 'background', label: '背景' },
  { value: 'border-left', label: '左边框' },
]

// ─── 引用块风格 ───
const blockquoteStyles: { value: 'classic' | 'modern' | 'minimal'; label: string }[] = [
  { value: 'classic', label: '经典' },
  { value: 'modern', label: '现代' },
  { value: 'minimal', label: '极简' },
]

// ─── 字体控制 ───
const fontFamilyMap: Record<string, string> = {
  serif: FONT_STACKS.serif,
  sans: FONT_STACKS.sans,
  kai: 'KaiTi, STKaiti, "AR PL UKai CN", serif',
  mono: FONT_STACKS.mono,
}

const currentFontStack = computed(() => {
  const key = settingsStore.settings.appearance.fontFamily
  return fontFamilyMap[key] ?? FONT_STACKS.sans
})

// ─── 平台选择 ───
const selectedPlatform = ref<Platform>('wechat')

const platformOptions: { value: Platform; label: string }[] = [
  { value: 'wechat', label: '微信公众号' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'zhihu', label: '知乎' },
]

// ─── 标题编辑 ───
const isEditingTitle = ref(false)
const editTitleValue = ref('')

function startEditTitle() {
  editTitleValue.value = currentContent.value?.title ?? ''
  isEditingTitle.value = true
}

function confirmEditTitle() {
  isEditingTitle.value = false
  const newTitle = editTitleValue.value.trim()
  if (newTitle && newTitle !== currentContent.value?.title) {
    editorStore.updateContent({ title: newTitle })
  }
}

function cancelEditTitle() {
  isEditingTitle.value = false
}

// ─── 导出模态 ───
const showExportModal = ref(false)

// ─── 复制反馈 ───
const copySuccess = ref(false)
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined

// ═══════════════════════════════════════════════════════════════════
// 保存状态文案
// ═══════════════════════════════════════════════════════════════════

const saveStatusText = computed<string>(() => {
  switch (editorStatus.value) {
    case 'idle':
      return '就绪'
    case 'loading':
      return '加载中...'
    case 'ready':
      return '已保存'
    case 'saving':
      return '保存中...'
    case 'error':
      return '保存失败'
    default:
      return ''
  }
})

// ═══════════════════════════════════════════════════════════════════
// 预览渲染（智能防抖 composable）
// ═══════════════════════════════════════════════════════════════════

const { previewHtml, previewLoading, lastRenderTime } = usePreviewRenderer({
  body: computed(() => currentContent.value?.body),
  platform: selectedPlatform,
  getExportSettings: () => ({ ...settingsStore.settings.export }),
  getAppearance: () => ({
    accentColor: settingsStore.settings.appearance.accentColor,
    fontFamily: settingsStore.settings.appearance.fontFamily,
  }),
})

watch(
  [editorMode, () => currentContent.value?.articleId],
  ([mode]) => {
    if (mode === 'source') {
      syncMarkdownSourceFromContent(currentContent.value?.body)
    }
  },
  { immediate: true }
)

watch(markdownSource, (value) => {
  if (editorMode.value !== 'source' || syncingMarkdownSource) {
    return
  }

  const nextHtml = markdownToHtml(value)
  if (nextHtml !== (currentContent.value?.body ?? '')) {
    editorStore.updateContent({ body: nextHtml })
  }
})

// ═══════════════════════════════════════════════════════════════════
// 引用链接提取
// ═══════════════════════════════════════════════════════════════════

interface ExtractedLink {
  text: string
  href: string
}

const extractedLinks = computed<ExtractedLink[]>(() => {
  const body = currentContent.value?.body
  if (!body) return []

  const links: ExtractedLink[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null

  // Pattern 1: [text](url) — 标准 Markdown 链接
  const mdLinkRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
  while ((match = mdLinkRegex.exec(body)) !== null) {
    const href = match[2]
    if (!seen.has(href)) {
      seen.add(href)
      links.push({ text: match[1] || href, href })
    }
  }

  // Pattern 2: <url> — 自动链接
  const autoLinkRegex = /<(https?:\/\/[^>]+)>/g
  while ((match = autoLinkRegex.exec(body)) !== null) {
    const href = match[1]
    if (!seen.has(href)) {
      seen.add(href)
      links.push({ text: href, href })
    }
  }

  // Pattern 3: [ref]: url — 引用式链接定义
  const refDefRegex = /^\[([^\]]+)\]:\s*(https?:\/\/\S+)/gm
  while ((match = refDefRegex.exec(body)) !== null) {
    const href = match[2]
    if (!seen.has(href)) {
      seen.add(href)
      links.push({ text: match[1], href })
    }
  }

  return links
})

// ─── 链接复制反馈 ───
const copiedLinkIndex = ref<number | null>(null)
let linkCopyTimer: ReturnType<typeof setTimeout> | undefined

async function copyLinkToClipboard(href: string, index: number): Promise<void> {
  try {
    await navigator.clipboard.writeText(href)
    copiedLinkIndex.value = index
    clearTimeout(linkCopyTimer)
    linkCopyTimer = setTimeout(() => {
      copiedLinkIndex.value = null
    }, 1500)
  } catch {
    // 静默处理
  }
}

// ═══════════════════════════════════════════════════════════════════
// 操作
// ═══════════════════════════════════════════════════════════════════

function handleBack() {
  router.push('/')
}

async function handleSave() {
  if (!editorStore.isReady) return

  if (editorPanelRef.value?.saveImmediately) {
    await editorPanelRef.value.saveImmediately()
    return
  }

  await editorStore.updateContent({
    title: currentContent.value?.title ?? '',
    body: currentContent.value?.body ?? '',
    transcript: currentContent.value?.transcript ?? '',
  })
}

void handleSave

async function handleCopyToClipboard() {
  if (!previewHtml.value) return
  const ok = await copyToClipboard(previewHtml.value)
  if (ok) {
    copySuccess.value = true
    clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}

function toggleFocusMode() {
  isFocusMode.value = !isFocusMode.value
  if (isFocusMode.value) {
    managerCollapsed.value = true
    stageCollapsed.value = true
    inspectorCollapsed.value = true
  } else {
    managerCollapsed.value = false
    stageCollapsed.value = false
    inspectorCollapsed.value = false
  }
}

function setActiveArticle(articleId: string | null): void {
  if (articleId) {
    articleStore.selectArticle(articleId)
    return
  }

  selectedArticleId.value = null
}

function handleTabSelect(tabId: string): void {
  setActiveArticle(tabId)
}

function handleTabClose(tabId: string): void {
  const currentIndex = openTabIds.value.indexOf(tabId)
  const nextTabs = openTabIds.value.filter((id) => id !== tabId)
  openTabIds.value = nextTabs

  if (selectedArticleId.value === tabId) {
    const fallbackTabId = nextTabs[currentIndex] ?? nextTabs[currentIndex - 1] ?? null
    setActiveArticle(fallbackTabId)
  }
}

function handleCloseOtherTabs(tabId: string): void {
  openTabIds.value = openTabIds.value.includes(tabId) ? [tabId] : openTabIds.value
  setActiveArticle(tabId)
}

function handleCloseAllTabs(): void {
  openTabIds.value = []
  setActiveArticle(null)
}

function handleTabReorder(fromIndex: number, toIndex: number): void {
  const nextTabs = [...openTabIds.value]
  const [movedTabId] = nextTabs.splice(fromIndex, 1)

  if (!movedTabId) {
    return
  }

  nextTabs.splice(toIndex, 0, movedTabId)
  openTabIds.value = nextTabs
}

function switchToAdjacentTab(direction: 1 | -1): void {
  const currentId = selectedArticleId.value
  if (!currentId || openTabIds.value.length < 2) {
    return
  }

  const currentIndex = openTabIds.value.indexOf(currentId)
  if (currentIndex < 0) {
    return
  }

  const nextIndex = (currentIndex + direction + openTabIds.value.length) % openTabIds.value.length
  setActiveArticle(openTabIds.value[nextIndex] ?? null)
}

watch(selectedArticleId, (articleId) => {
  if (!multiTabEnabled.value) {
    openTabIds.value = articleId ? [articleId] : []
    return
  }

  if (!articleId || openTabIds.value.includes(articleId)) {
    return
  }

  openTabIds.value = [...openTabIds.value, articleId]
}, { immediate: true })

watch(articles, (nextArticles) => {
  if (!multiTabEnabled.value) {
    if (selectedArticleId.value && nextArticles.some((item) => item.id === selectedArticleId.value)) {
      openTabIds.value = [selectedArticleId.value]
    } else {
      openTabIds.value = []
    }
    return
  }

  const validIds = new Set(nextArticles.map((item) => item.id))
  openTabIds.value = openTabIds.value.filter((id) => validIds.has(id))

  if (selectedArticleId.value && validIds.has(selectedArticleId.value) && !openTabIds.value.includes(selectedArticleId.value)) {
    openTabIds.value = [...openTabIds.value, selectedArticleId.value]
  }
}, { deep: true })

watch(multiTabEnabled, (enabled) => {
  if (!enabled) {
    openTabIds.value = selectedArticleId.value ? [selectedArticleId.value] : []
  }
}, { immediate: true })

watch(isFocusMode, (focused) => {
  const editor = editorPanelRef.value?.bodyEditor
  if (!editor) {
    return
  }

  const typewriterExtension = editor.extensionManager.extensions.find((extension) => extension.name === 'typewriterMode')
  if (!typewriterExtension) {
    return
  }

  typewriterExtension.options.enabled = focused || settingsStore.settings.editor.typewriterMode
  editor.view.dispatch(editor.state.tr)
})

function toggleManagerPanel() {
  managerCollapsed.value = !managerCollapsed.value
}

function getShortcutCombo(e: KeyboardEvent): string {
  const parts: string[] = []

  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')

  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
  }

  return parts.join('+')
}

function dispatchEditorViewAction(action: 'typewriterMode' | 'switchEditorMode' | 'zoomIn'): boolean {
  window.dispatchEvent(new CustomEvent('inkforge:view-action', {
    detail: { action },
  }))
  return true
}

function triggerWorkspaceViewAction(action: string): boolean {
  switch (action) {
    case 'toggleSidebar':
      toggleManagerPanel()
      return true
    case 'togglePreview':
      stageCollapsed.value = !stageCollapsed.value
      return true
    case 'toggleOutline':
      if (managerCollapsed.value) {
        managerCollapsed.value = false
      }
      managerTab.value = 'outline'
      return true
    case 'focusMode':
      toggleFocusMode()
      return true
    case 'typewriterMode':
      return dispatchEditorViewAction('typewriterMode')
    case 'switchEditorMode':
      return dispatchEditorViewAction('switchEditorMode')
    case 'zoomIn':
      return dispatchEditorViewAction('zoomIn')
    default:
      return false
  }
}

function handleViewActionEvent(event: Event): void {
  if (!(event instanceof CustomEvent) || typeof event.detail?.action !== 'string') {
    return
  }

  switch (event.detail.action) {
    case 'toggleSidebar':
    case 'togglePreview':
    case 'toggleOutline':
    case 'focusMode':
      triggerWorkspaceViewAction(event.detail.action)
      break
    default:
      break
  }
}

function handleToggleEditorMode(): void {
  void dispatchEditorViewAction('switchEditorMode')
}

// ═══════════════════════════════════════════════════════════════════
// 快捷键
// ═══════════════════════════════════════════════════════════════════

function handleKeydown(e: KeyboardEvent) {
  if (e.defaultPrevented || e.isComposing) {
    return
  }

  const shortcutCombo = getShortcutCombo(e)
  const matchedShortcut = Object.entries(settingsStore.settings.shortcuts).find(([, binding]) => binding === shortcutCombo)

  if (matchedShortcut && triggerWorkspaceViewAction(matchedShortcut[0])) {
    e.preventDefault()
    return
  }

  // Escape 退出专注模式
  if (e.key === 'Escape' && isFocusMode.value) {
    e.preventDefault()
    isFocusMode.value = false
    managerCollapsed.value = false
    stageCollapsed.value = false
    inspectorCollapsed.value = false
    return
  }

  // F11 专注模式
  if (e.key === 'F11') {
    e.preventDefault()
    toggleFocusMode()
    return
  }

  // Ctrl+\ 折叠/展开左栏
  if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
    e.preventDefault()
    switchToAdjacentTab(e.shiftKey ? -1 : 1)
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('inkforge:view-action', handleViewActionEvent as EventListener)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('inkforge:view-action', handleViewActionEvent as EventListener)
  clearTimeout(copyFeedbackTimer)
  clearTimeout(linkCopyTimer)
})

// ═══════════════════════════════════════════════════════════════════
// 计算属性
// ═══════════════════════════════════════════════════════════════════

const displayTitle = computed(() => {
  return currentContent.value?.title || selectedArticle.value?.title || '未命名文档'
})

const articleMeta = computed(() => {
  const content = currentContent.value
  const article = selectedArticle.value

  if (!content && !article) {
    return undefined
  }

  const createdAt = article?.createdAt ?? content?.createdAt ?? new Date()
  const updatedAt = content?.updatedAt ?? article?.updatedAt ?? createdAt

  return {
    createdAt,
    updatedAt,
    versionCount: content?.versions.length ?? 0,
    documentId: article?.id ?? content?.articleId,
  }
})

const hasContent = computed(() => {
  return editorStatus.value === 'ready' || editorStatus.value === 'saving'
})
</script>

<template>
  <div
    class="workstation"
    :class="{ 'focus-mode': isFocusMode }"
  >
    <!-- Focus Overlay (专注模式暗角) -->
    <div class="focus-overlay" />

    <!-- ═══ Header (52px, 对齐原型) ═══ -->
    <header class="workstation-header">
      <!-- 品牌区 -->
      <div
        class="header-brand"
        title="返回首页"
        @click="handleBack"
      >
        <div class="header-logo">
          IF
        </div>
        <span class="header-brand-name">InkForge</span>
      </div>

      <!-- 标题区 -->
      <div class="header-title">
        <template v-if="isEditingTitle">
          <input
            v-model="editTitleValue"
            class="header-title-input"
            autofocus
            placeholder="无标题文章"
            @blur="confirmEditTitle"
            @keydown.enter="confirmEditTitle"
            @keydown.escape="cancelEditTitle"
          >
        </template>
        <template v-else>
          <input
            type="text"
            class="header-title-input"
            :value="displayTitle"
            readonly
            :title="displayTitle"
            @dblclick="startEditTitle"
          >
        </template>

        <!-- 保存状态 Pill -->
        <div
          class="status-pill"
          :class="editorStatus === 'ready' ? 'saved' : editorStatus === 'saving' ? 'unsaved' : editorStatus === 'error' ? 'error' : ''"
        >
          <span class="status-dot" />
          {{ saveStatusText }}
        </div>
      </div>

      <!-- 操作区 -->
      <div class="header-actions">
        <SyncStatusIcon />

        <!-- 复制 -->
        <button
          class="icon-btn"
          :class="{ success: copySuccess }"
          :disabled="!hasContent"
          :title="copySuccess ? '已复制' : '复制到剪贴板'"
          @click="handleCopyToClipboard"
        >
          <Check
            v-if="copySuccess"
            :size="16"
          />
          <Copy
            v-else
            :size="16"
          />
        </button>

        <!-- 导出 -->
        <button
          class="icon-btn"
          :disabled="!hasContent"
          title="导出"
          @click="showExportModal = true"
        >
          <Upload :size="16" />
        </button>

        <!-- 专注模式 -->
        <button
          class="icon-btn"
          :class="{ active: isFocusMode }"
          :title="isFocusMode ? '退出专注模式 (F11)' : '专注模式 (F11)'"
          @click="toggleFocusMode"
        >
          <Maximize2
            v-if="!isFocusMode"
            :size="16"
          />
          <Minimize2
            v-else
            :size="16"
          />
        </button>

        <!-- 发布按钮 CTA -->
        <button
          class="publish-btn"
          @click="showExportModal = true"
        >
          <Send :size="14" />
          发布
        </button>
      </div>
    </header>

    <!-- ═══ 主内容区 ═══ -->
    <div class="main-content">
      <!-- Edge Trigger 左 -->
      <div
        v-if="managerCollapsed"
        class="edge-trigger left"
        @mouseenter="managerCollapsed = false"
      />

      <!-- ─── 左栏 (Manager) ─── -->
      <aside
        class="panel panel-manager"
        :class="{ collapsed: managerCollapsed }"
      >
        <!-- 折叠态竖标签 -->
        <div
          v-if="managerCollapsed"
          class="collapsed-label"
          @click="managerCollapsed = false"
        >
          <ChevronRight :size="14" />
          <span>管理</span>
        </div>

        <!-- 展开态内容 -->
        <template v-else>
          <!-- Tab 栏 -->
          <div class="panel-tabs">
            <button
              class="panel-tab"
              :class="{ active: managerTab === 'files' }"
              @click="managerTab = 'files'"
            >
              <FolderOpen :size="14" />
              <span>文件</span>
            </button>
            <button
              class="panel-tab"
              :class="{ active: managerTab === 'versions' }"
              @click="managerTab = 'versions'"
            >
              <History :size="14" />
              <span>版本</span>
            </button>
            <button
              class="panel-tab"
              :class="{ active: managerTab === 'outline' }"
              @click="managerTab = 'outline'"
            >
              <List :size="14" />
              <span>大纲</span>
            </button>

            <!-- 折叠按钮 -->
            <button
              class="collapse-trigger"
              title="折叠左栏 (Ctrl+\)"
              @click="managerCollapsed = true"
            >
              <ChevronLeft :size="14" />
            </button>
          </div>

          <!-- Tab 内容 -->
          <div class="panel-body">
            <div
              v-show="managerTab === 'files'"
              class="tab-content"
            >
              <FileManager />
            </div>
            <div
              v-show="managerTab === 'versions'"
              class="tab-content"
            >
              <VersionPanel />
            </div>
            <div
              v-show="managerTab === 'outline'"
              class="tab-content"
            >
              <OutlinePanel :editor="outlineEditor" />
            </div>
          </div>
        </template>
      </aside>

      <!-- ─── 编辑器栏 ─── -->
      <main class="panel panel-editor">
        <button
          v-if="isFocusMode"
          type="button"
          class="focus-exit-btn"
          title="退出专注模式 (Esc)"
          @click="toggleFocusMode"
        >
          <Minimize2 :size="14" />
          <span>退出专注</span>
        </button>
        <TabBar
          v-show="!isFocusMode && multiTabEnabled"
          :tabs="editorTabs"
          :active-tab-id="selectedArticleId"
          @select="handleTabSelect"
          @close="handleTabClose"
          @close-others="handleCloseOtherTabs"
          @close-all="handleCloseAllTabs"
          @reorder="handleTabReorder"
        />
        <div
          class="editor-wrapper"
          :class="{ 'editor-wrapper--source': editorMode === 'source' }"
        >
          <EditorPanel
            v-if="editorMode === 'typora'"
            ref="editorPanelRef"
          />
          <div
            v-else
            class="editor-source-dual"
          >
            <div class="source-pane">
              <MarkdownEditor
                v-model="markdownSource"
                placeholder="# 开始编写 Markdown"
              />
            </div>
            <div class="preview-pane">
              <MarkdownPreview :markdown="markdownSource" />
            </div>
          </div>
        </div>
        <EditorStatusBar
          v-show="!isFocusMode"
          :editor="editorPanelRef?.bodyEditor ?? undefined"
          :last-render-time="lastRenderTime"
          :article-meta="articleMeta"
          :editor-mode="editorMode"
          :save-status="saveStatusText"
          @toggle-mode="handleToggleEditorMode"
        />
      </main>

      <!-- ─── 预览栏 (Stage) ─── -->
      <aside
        v-if="editorMode === 'typora'"
        class="panel panel-stage"
        :class="{ collapsed: stageCollapsed }"
      >
        <!-- 折叠态：12px 触发条 + hover 红色指示器 -->
        <div
          v-if="stageCollapsed"
          class="stage-collapsed-bar"
          @click="stageCollapsed = false"
        >
          <div class="stage-collapsed-indicator" />
        </div>

        <!-- 展开态内容 -->
        <template v-else>
          <!-- 平台 Tab 切换（圆角药丸按钮） -->
          <div class="stage-header">
            <div class="stage-platform-tabs">
              <button
                v-for="opt in platformOptions"
                :key="opt.value"
                class="stage-tab"
                :class="{ active: selectedPlatform === opt.value }"
                @click="selectedPlatform = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
            <button
              class="collapse-trigger"
              title="折叠预览栏"
              @click="stageCollapsed = true"
            >
              <ChevronRight :size="14" />
            </button>
          </div>

          <div class="stage-body">
            <!-- iPhone 设备框 -->
            <div class="device-frame">
              <!-- 刘海（黑色圆角矩形） -->
              <div class="device-notch" />
              <!-- 屏幕内容区域 -->
              <div class="device-screen">
                <!-- 加载中 -->
                <div
                  v-if="previewLoading"
                  class="preview-loading"
                >
                  <LoaderCircle
                    class="spinner"
                    :size="20"
                  />
                  <span>渲染中...</span>
                </div>

                <!-- 无内容 -->
                <div
                  v-else-if="!previewHtml"
                  class="preview-empty"
                >
                  <Eye :size="28" />
                  <span>选择文章后查看预览</span>
                </div>

                <!-- 渲染预览 -->
                <!-- eslint-disable vue/no-v-html -->
                <div
                  v-else
                  class="preview-content"
                  v-html="previewHtml"
                />
                <!-- eslint-enable vue/no-v-html -->
              </div>
              <!-- Home Indicator（灰色圆角条） -->
              <div class="device-home-indicator" />
            </div>
          </div>
        </template>
      </aside>

      <!-- ─── 右栏 (Inspector) ─── -->
      <aside
        class="panel panel-inspector"
        :class="{ collapsed: inspectorCollapsed }"
      >
        <!-- 折叠态：12px 触发条 + hover 红色指示器 -->
        <div
          v-if="inspectorCollapsed"
          class="inspector-collapsed-bar"
          @click="inspectorCollapsed = false"
        >
          <div class="inspector-collapsed-indicator" />
        </div>

        <!-- 展开态内容：4个垂直滚动 Section -->
        <template v-else>
          <div class="inspector-header">
            <span class="inspector-title">检查器</span>
            <button
              class="collapse-trigger"
              title="折叠右栏"
              @click="inspectorCollapsed = true"
            >
              <ChevronRight :size="14" />
            </button>
          </div>

          <div class="inspector-scroll">
            <!-- Section 1: 排版风格 -->
            <div class="inspector-section">
              <div class="panel-section-title">
                <Palette
                  class="section-icon"
                  :size="14"
                />
                <span>排版风格</span>
              </div>
              <!-- 主色选择器 -->
              <div class="accent-picker">
                <button
                  v-for="color in accentColors"
                  :key="color.value"
                  class="accent-dot"
                  :class="{ active: settingsStore.settings.appearance.accentColor === color.value }"
                  :style="{ background: color.value }"
                  :title="color.label"
                  @click="selectAccentColor(color.value)"
                >
                  <Check
                    v-if="settingsStore.settings.appearance.accentColor === color.value"
                    :size="12"
                    color="white"
                  />
                </button>
              </div>

              <!-- 预设快速切换条 -->
              <div class="preset-strip">
                <button
                  v-for="preset in topPresets"
                  :key="preset.id"
                  class="preset-chip"
                  :class="{ active: settingsStore.settings.export.defaultPresetId === preset.id }"
                  :title="preset.description"
                  @click="applyPreset(preset.id)"
                >
                  <span class="preset-icon">
                    <component
                      :is="resolveIconComponent(preset.icon, 'Palette')"
                      :size="12"
                    />
                  </span>
                  <span class="preset-name">{{ preset.name }}</span>
                </button>
              </div>

              <!-- 排版参数滑块（来自 useTypography composable） -->
              <div
                v-for="(ctrl, key) in typographySliders"
                :key="key"
                class="inspector-control"
              >
                <label class="control-label">
                  <span>{{ ctrl.label }}</span>
                  <span class="control-value">{{ ctrl.unit === '' ? Number(ctrl.value).toFixed(1) : ctrl.value }}{{ ctrl.unit }}</span>
                </label>
                <input
                  type="range"
                  class="control-slider"
                  :min="ctrl.min"
                  :max="ctrl.max"
                  :step="ctrl.step"
                  :value="ctrl.value"
                  @input="updateTypography(key as string, Number(($event.target as HTMLInputElement).value))"
                >
              </div>

              <!-- 首行缩进开关 -->
              <label class="control-toggle">
                <span>首行缩进</span>
                <button
                  class="indent-toggle"
                  :class="{ active: typography.paragraphIndent }"
                  @click="updateTypography('paragraphIndent', !typography.paragraphIndent)"
                >
                  {{ typography.paragraphIndent ? '2em' : '无' }}
                </button>
              </label>

              <!-- 标题装饰风格 -->
              <div class="control-group">
                <label>标题风格</label>
                <div class="style-options">
                  <button
                    v-for="style in headingStyles"
                    :key="style.value"
                    class="style-option"
                    :class="{ active: typography.headingStyle === style.value }"
                    @click="typography.headingStyle = style.value"
                  >
                    {{ style.label }}
                  </button>
                </div>
              </div>

              <!-- 引用块风格 -->
              <div class="control-group">
                <label>引用块</label>
                <div class="style-options">
                  <button
                    v-for="style in blockquoteStyles"
                    :key="style.value"
                    class="style-option"
                    :class="{ active: typography.blockquoteStyle === style.value }"
                    @click="typography.blockquoteStyle = style.value"
                  >
                    {{ style.label }}
                  </button>
                </div>
              </div>

              <router-link
                to="/themes"
                class="inspector-link"
              >
                查看全部预设 →
              </router-link>
            </div>

            <!-- Section 2: 字体控制 -->
            <div class="inspector-section">
              <div class="panel-section-title">
                <Type
                  class="section-icon"
                  :size="14"
                />
                <span>字体</span>
              </div>
              <!-- 字体族选择按钮组 -->
              <div class="font-family-group">
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'serif' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'serif'"
                >
                  <span
                    class="font-family-preview"
                    :style="{ fontFamily: fontFamilyMap.serif }"
                  >Aa</span>
                  <span class="font-family-name">衬线</span>
                </button>
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'sans' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'sans'"
                >
                  <span
                    class="font-family-preview"
                    :style="{ fontFamily: fontFamilyMap.sans }"
                  >Aa</span>
                  <span class="font-family-name">无衬线</span>
                </button>
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'kai' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'kai'"
                >
                  <span
                    class="font-family-preview"
                    :style="{ fontFamily: fontFamilyMap.kai }"
                  >Aa</span>
                  <span class="font-family-name">楷体</span>
                </button>
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'mono' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'mono'"
                >
                  <span
                    class="font-family-preview"
                    :style="{ fontFamily: fontFamilyMap.mono }"
                  >Aa</span>
                  <span class="font-family-name">等宽</span>
                </button>
              </div>

              <!-- 字号滑块 (12-24px, 步进 1px) -->
              <div class="inspector-control">
                <label class="control-label">
                  <span>正文字号</span>
                  <span class="control-value">{{ settingsStore.settings.appearance.fontSize }}px</span>
                </label>
                <input
                  type="range"
                  class="control-slider"
                  min="12"
                  max="24"
                  step="1"
                  :value="settingsStore.settings.appearance.fontSize"
                  @input="settingsStore.settings.appearance.fontSize = Number(($event.target as HTMLInputElement).value)"
                >
              </div>

              <!-- 行高滑块 (1.4-2.4, 步进 0.1) -->
              <div class="inspector-control">
                <label class="control-label">
                  <span>行高</span>
                  <span class="control-value">{{ settingsStore.settings.appearance.lineHeight.toFixed(1) }}</span>
                </label>
                <input
                  type="range"
                  class="control-slider"
                  min="1.4"
                  max="2.4"
                  step="0.1"
                  :value="settingsStore.settings.appearance.lineHeight"
                  @input="settingsStore.settings.appearance.lineHeight = Number(($event.target as HTMLInputElement).value)"
                >
              </div>

              <!-- 字体预览 -->
              <div
                class="font-preview"
                :style="{
                  fontFamily: currentFontStack,
                  fontSize: settingsStore.settings.appearance.fontSize + 'px',
                  lineHeight: settingsStore.settings.appearance.lineHeight,
                }"
              >
                永远相信美好的事情即将发生。
                <br>The quick brown fox jumps over the lazy dog.
              </div>
            </div>

            <!-- Section 3: 素材库 -->
            <div class="inspector-section">
              <div class="panel-section-title">
                <Images
                  class="section-icon"
                  :size="14"
                />
                <span>素材库</span>
              </div>
              <div class="inspector-asset-wrapper">
                <AssetManager :article-id="selectedArticleId ?? undefined" />
              </div>
            </div>

            <!-- Section 4: 引用链接 -->
            <div class="inspector-section">
              <div class="panel-section-title">
                <Link2
                  class="section-icon"
                  :size="14"
                />
                <span>引用链接</span>
                <span
                  v-if="extractedLinks.length > 0"
                  class="inspector-count"
                >{{ extractedLinks.length }}</span>
              </div>
              <div
                v-if="extractedLinks.length === 0"
                class="inspector-empty-hint"
              >
                <p>暂无外部链接引用</p>
                <p class="inspector-empty-sub">
                  在 Markdown 中使用 [文字](URL) 添加链接
                </p>
              </div>
              <div
                v-else
                class="inspector-links-list"
              >
                <div
                  v-for="(link, idx) in extractedLinks"
                  :key="idx"
                  class="link-item"
                >
                  <a
                    :href="link.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link-item-main"
                    :title="link.href"
                  >
                    <ExternalLink :size="12" />
                    <div class="link-item-content">
                      <span class="link-text">{{ link.text }}</span>
                      <span class="link-href">{{ link.href }}</span>
                    </div>
                  </a>
                  <button
                    class="link-copy-btn"
                    :class="{ copied: copiedLinkIndex === idx }"
                    :title="copiedLinkIndex === idx ? '已复制' : '复制链接'"
                    @click="copyLinkToClipboard(link.href, idx)"
                  >
                    <Check
                      v-if="copiedLinkIndex === idx"
                      :size="12"
                    />
                    <Copy
                      v-else
                      :size="12"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </aside>
    </div>

    <!-- ═══ 导出模态框 ═══ -->
    <ExportModal
      :visible="showExportModal"
      :article-id="currentContent?.articleId"
      :content="currentContent?.body || ''"
      :title="currentContent?.title || displayTitle"
      :updated-at="currentContent?.updatedAt"
      @close="showExportModal = false"
    />
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   WorkstationView - Ethereal Constructivism
   四栏动态力场布局
   ═══════════════════════════════════════════════════════════════════ */

/* ─── 根容器 ─── */
.workstation {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FAFBFC;
  overflow: hidden;
  color: #263238;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif;
}

/* ═══════════════════════════════════════════════════════════════════
   Header (52px, 对齐原型)
   ═══════════════════════════════════════════════════════════════════ */

.workstation-header {
  height: 52px;
  min-height: 52px;
  background: #FFFFFF;
  border-bottom: 1px solid #ECEFF1;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  backdrop-filter: blur(12px);
  z-index: 10;
}

/* ─── 品牌区 ─── */
.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 16px;
  border-right: 1px solid #ECEFF1;
  cursor: pointer;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.header-brand:hover {
  opacity: 0.7;
}

.header-logo {
  width: 28px;
  height: 28px;
  background: #D32F2F;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
}

.header-brand-name {
  font-size: 14px;
  font-weight: 600;
  color: #263238;
}

/* ─── 标题区 ─── */
.header-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.header-title-input {
  font-size: 14px;
  font-weight: 500;
  color: #263238;
  background: transparent;
  border: none;
  outline: none;
  padding: 6px 10px;
  border-radius: 6px;
  min-width: 280px;
  max-width: 400px;
  transition: background 0.15s;
}

.header-title-input:hover {
  background: #FAFBFC;
}

.header-title-input:focus {
  background: #FFEBEE;
}

/* ─── 保存状态 Pill ─── */
.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
  background: #F5F5F5;
  color: #90A4AE;
}

.status-pill .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-pill.saved {
  background: #E8F5E9;
  color: #2E7D32;
}

.status-pill.unsaved {
  background: #FFF3E0;
  color: #F57C00;
}

.status-pill.error {
  background: #FFEBEE;
  color: #C62828;
}

/* ─── Header 操作区 ─── */
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #90A4AE;
  cursor: pointer;
  transition: all 0.15s;
}

.icon-btn:hover {
  background: #FAFBFC;
  color: #607D8B;
  transform: scale(1.05);
}

.icon-btn.active {
  background: #FFEBEE;
  color: #D32F2F;
}

.icon-btn.success {
  background: #E8F5E9;
  color: #2E7D32;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* ─── 发布按钮 CTA ─── */
.publish-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: #D32F2F;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.25);
}

/* ═══════════════════════════════════════════════════════════════════
   主内容区域
   ═══════════════════════════════════════════════════════════════════ */

.main-content {
  position: relative;
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* ═══════════════════════════════════════════════════════════════════
   Edge Triggers (边缘触发器)
   ═══════════════════════════════════════════════════════════════════ */

.edge-trigger {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  z-index: 100;
  cursor: pointer;
}

.edge-trigger.left {
  left: 0;
}

.edge-trigger.right {
  right: 0;
}

.edge-trigger::before {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 48px;
  background: #D32F2F;
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.edge-trigger.left::before {
  left: 4px;
}

.edge-trigger.right::before {
  right: 4px;
}

.edge-trigger:hover::before {
  opacity: 0.6;
  transform: translateY(-50%) scaleY(1.2);
}

/* ═══════════════════════════════════════════════════════════════════
   通用面板
   ═══════════════════════════════════════════════════════════════════ */

.panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #E5E7EB;
  overflow: hidden;
  transition: width 0.15s ease, min-width 0.15s ease, flex-basis 0.15s ease;
}

.panel:last-child {
  border-right: none;
}

/* ─── 左栏 ─── */
.panel-manager {
  width: var(--sidebar-width, 260px);
  min-width: var(--sidebar-width, 260px);
  flex-shrink: 0;
}

.panel-manager.collapsed {
  width: 36px;
  min-width: 36px;
}

/* ─── 编辑器栏 ─── */
.panel-editor {
  flex: 1;
  min-width: 0;
  border-right: 1px solid #E5E7EB;
  position: relative;
}

.editor-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ─── 预览栏 ─── */
.panel-stage {
  width: 360px;
  min-width: 360px;
  flex-shrink: 0;
  transition: width 0.25s ease, min-width 0.25s ease;
}

.panel-stage.collapsed {
  width: 12px;
  min-width: 12px;
  overflow: hidden;
}

/* ─── Stage 折叠触发条 ─── */
.stage-collapsed-bar {
  width: 100%;
  height: 100%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.stage-collapsed-indicator {
  width: 4px;
  height: 100%;
  background: transparent;
  transition: background 0.15s ease;
  border-radius: 2px;
}

.stage-collapsed-bar:hover .stage-collapsed-indicator {
  background: #D32F2F;
}

/* ─── 右栏 ─── */
.panel-inspector {
  width: 280px;
  min-width: 280px;
  flex-shrink: 0;
  border-right: none;
  border-left: 1px solid #E5E7EB;
  transition: width 0.3s ease, min-width 0.3s ease;
}

.panel-inspector.collapsed {
  width: 12px;
  min-width: 12px;
  overflow: hidden;
  border-left: none;
}

/* ─── Inspector 折叠触发条 ─── */
.inspector-collapsed-bar {
  width: 100%;
  height: 100%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.inspector-collapsed-indicator {
  width: 4px;
  height: 100%;
  background: transparent;
  transition: background 0.15s ease;
  border-radius: 2px;
}

.inspector-collapsed-bar:hover .inspector-collapsed-indicator {
  background: #D32F2F;
}

/* ═══════════════════════════════════════════════════════════════════
   折叠态竖标签
   ═══════════════════════════════════════════════════════════════════ */

.collapsed-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  width: 100%;
  height: 100%;
  cursor: pointer;
  color: #90A4AE;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s ease;
  user-select: none;
}

.collapsed-label:hover {
  color: #D32F2F;
  background: #FFEBEE;
}

.collapsed-label svg {
  writing-mode: horizontal-tb;
}

/* ═══════════════════════════════════════════════════════════════════
   面板 Tab 栏
   ═══════════════════════════════════════════════════════════════════ */

.panel-tabs {
  display: flex;
  align-items: center;
  height: 36px;
  border-bottom: 1px solid #E5E7EB;
  flex-shrink: 0;
  padding: 0 4px;
  gap: 0;
}

.panel-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: #90A4AE;
  font-size: 12px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.panel-tab:hover {
  color: #607D8B;
}

.panel-tab.active {
  color: #D32F2F;
  border-bottom-color: #D32F2F;
}

.collapse-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: auto;
  border: none;
  background: transparent;
  color: #CFD8DC;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.collapse-trigger:hover {
  background: #FFEBEE;
  color: #D32F2F;
}

/* ═══════════════════════════════════════════════════════════════════
   面板内容
   ═══════════════════════════════════════════════════════════════════ */

.panel-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  overflow: hidden;
}

/* ─── 让子组件自适应容器 ─── */
.tab-content > :deep(*) {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  height: 100%;
}

/* ═══════════════════════════════════════════════════════════════════
   预览栏 (Stage) — iPhone 设备框风格
   ═══════════════════════════════════════════════════════════════════ */

.stage-header {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid #E5E7EB;
  flex-shrink: 0;
}

.stage-platform-tabs {
  display: flex;
  gap: 4px;
  flex: 1;
  background: #F5F5F5;
  border-radius: 20px;
  padding: 3px;
}

.stage-tab {
  padding: 4px 12px;
  border: none;
  background: transparent;
  color: #90A4AE;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 16px;
  transition: all 0.2s ease;
  flex: 1;
  text-align: center;
  white-space: nowrap;
}

.stage-tab:hover {
  color: #607D8B;
}

.stage-tab.active {
  background: #FFFFFF;
  color: #D32F2F;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stage-header .collapse-trigger {
  margin-left: 4px;
  flex-shrink: 0;
}

.stage-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  gap: 12px;
  background: #F0F1F3;
}

/* ─── iPhone 设备框 ─── */
.device-frame {
  width: 100%;
  max-width: 375px;
  min-height: 500px;
  background: #FFFFFF;
  border-radius: 40px;
  border: 1px solid #E0E0E0;
  padding: 16px;
  position: relative;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

/* 刘海 */
.device-notch {
  width: 120px;
  height: 28px;
  background: #1A1A1A;
  border-radius: 14px;
  margin: 0 auto 12px;
  flex-shrink: 0;
}

/* 屏幕内容区 */
.device-screen {
  background: #FFFFFF;
  border-radius: 24px;
  flex: 1;
  min-height: 400px;
  max-height: 560px;
  overflow-y: auto;
  padding: 16px;
  position: relative;
}

/* Home Indicator */
.device-home-indicator {
  width: 134px;
  height: 5px;
  background: #BDBDBD;
  border-radius: 3px;
  margin: 12px auto 0;
  flex-shrink: 0;
}

/* 设备屏幕内滚动条 */
.device-screen::-webkit-scrollbar {
  width: 2px;
}

.device-screen::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 1px;
}

.device-screen::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* ─── 预览状态 ─── */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 200px;
  color: #90A4AE;
  font-size: 12px;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 200px;
  color: #CFD8DC;
  font-size: 12px;
  text-align: center;
}

.preview-content {
  font-size: 14px;
  line-height: 1.6;
  color: #263238;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* ═══════════════════════════════════════════════════════════════════
   右栏 Inspector — 滚动式 Section
   ═══════════════════════════════════════════════════════════════════ */

.inspector-header {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-bottom: 1px solid #E5E7EB;
  flex-shrink: 0;
}

.inspector-title {
  font-size: 12px;
  font-weight: 600;
  color: #607D8B;
  flex: 1;
}

.inspector-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.inspector-section {
  padding: 16px;
  border-bottom: 1px solid #F0F1F3;
}

.inspector-section:last-child {
  border-bottom: none;
}

/* ─── 主色选择器 ─── */
.accent-picker {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.accent-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.accent-dot:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.accent-dot.active {
  border-color: #263238;
  box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px currentColor;
}

.inspector-link {
  font-size: 12px;
  color: var(--accent-primary, #D32F2F);
  text-decoration: none;
  font-weight: 500;
  display: block;
}

.inspector-link:hover {
  text-decoration: underline;
}

/* ─── 字体族按钮组 ─── */
.font-family-group {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.font-family-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #FFFFFF;
  cursor: pointer;
  transition: all 0.15s ease;
}

.font-family-btn:hover {
  border-color: #CFD8DC;
  background: #F5F5F5;
}

.font-family-btn.active {
  border-color: var(--accent-primary, #D32F2F);
  background: #FFEBEE;
}

.font-family-preview {
  font-size: 18px;
  font-weight: 500;
  color: #263238;
  line-height: 1.2;
}

.font-family-btn.active .font-family-preview {
  color: var(--accent-primary, #D32F2F);
}

.font-family-name {
  font-size: 10px;
  color: #90A4AE;
  white-space: nowrap;
}

.font-family-btn.active .font-family-name {
  color: var(--accent-primary, #D32F2F);
  font-weight: 500;
}

/* ─── 素材区域 ─── */
.inspector-asset-wrapper {
  min-height: 120px;
}

.inspector-asset-wrapper > :deep(*) {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
}

/* ─── 空提示 ─── */
.inspector-empty-hint {
  text-align: center;
  padding: 16px 0;
  color: #CFD8DC;
  font-size: 12px;
}

.inspector-empty-hint p {
  margin: 0;
}

.inspector-empty-sub {
  margin-top: 4px;
  font-size: 11px;
  color: #E0E0E0;
}

/* ─── 引用链接列表 ─── */
.inspector-count {
  margin-left: auto;
  background: #ECEFF1;
  color: #607D8B;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 8px;
  line-height: 1.4;
}

.inspector-links-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  transition: background 0.15s;
}

.link-item:hover {
  background: rgba(21, 101, 192, 0.04);
}

.link-item-main {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #607D8B;
  text-decoration: none;
  transition: color 0.15s;
  overflow: hidden;
}

.link-item-main:hover {
  color: #1565C0;
}

.link-item-main svg {
  flex-shrink: 0;
  opacity: 0.5;
  margin-top: 2px;
}

.link-item-main:hover svg {
  opacity: 1;
}

.link-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.link-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: inherit;
}

.link-href {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  color: #B0BEC5;
  max-width: 100%;
}

.link-copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #CFD8DC;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.link-copy-btn:hover {
  background: #ECEFF1;
  color: #607D8B;
}

.link-copy-btn.copied {
  color: #4CAF50;
}

/* ─── 排版参数滑块控件 (useTypography) ─── */
.inspector-control {
  padding: 6px 0;
}

.control-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #607D8B;
  margin-bottom: 6px;
}

.control-value {
  font-variant-numeric: tabular-nums;
  color: #263238;
  font-weight: 500;
}

.control-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #E5E7EB;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.control-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-primary, #D32F2F);
  border: 2px solid #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.control-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #607D8B;
  padding: 6px 0;
  cursor: default;
}

/* ─── 预设快速切换条 ─── */
.preset-strip {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.preset-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  background: #FFFFFF;
  font-size: 11px;
  color: #607D8B;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.preset-chip:hover {
  border-color: #CFD8DC;
  background: #F5F5F5;
  color: #263238;
}

.preset-chip.active {
  border-color: var(--accent-primary, #D32F2F);
  background: #FFEBEE;
  color: var(--accent-primary, #D32F2F);
  font-weight: 500;
}

.preset-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.preset-name {
  font-size: 11px;
}

/* ─── 控制组 ─── */
.control-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.control-group label {
  font-size: 12px;
  color: #607D8B;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ─── 首行缩进切换 ─── */
.indent-toggle {
  padding: 4px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  background: #FFFFFF;
  color: #90A4AE;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 48px;
  text-align: center;
}

.indent-toggle:hover {
  border-color: #CFD8DC;
}

.indent-toggle.active {
  border-color: var(--accent-primary, #D32F2F);
  background: #FFEBEE;
  color: var(--accent-primary, #D32F2F);
  font-weight: 500;
}

/* ─── 范围滑块 ─── */
.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.inspector-range {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #E5E7EB;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.inspector-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-primary, #D32F2F);
  border: 2px solid #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.range-value {
  font-size: 11px;
  color: #90A4AE;
  min-width: 36px;
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* ─── 标题风格选项 ─── */
.style-options {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.style-option {
  padding: 3px 8px;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  background: #FFFFFF;
  color: #90A4AE;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.style-option:hover {
  border-color: #CFD8DC;
  color: #607D8B;
}

.style-option.active {
  border-color: var(--accent-primary, #D32F2F);
  background: #FFEBEE;
  color: var(--accent-primary, #D32F2F);
  font-weight: 500;
}

/* ─── 字号步进器 ─── */
.stepper {
  display: flex;
  align-items: center;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  overflow: hidden;
}

.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: #FFFFFF;
  color: #607D8B;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.stepper-btn:hover:not(:disabled) {
  background: #F5F5F5;
  color: #263238;
}

.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stepper-value {
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: #263238;
  border-left: 1px solid #E5E7EB;
  border-right: 1px solid #E5E7EB;
  min-width: 48px;
  text-align: center;
  line-height: 28px;
  font-variant-numeric: tabular-nums;
}

/* ─── 字体预览 ─── */
.font-preview {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #F0F1F3;
  border-radius: 6px;
  background: #FAFBFC;
  color: #607D8B;
  word-break: break-word;
}

/* ═══════════════════════════════════════════════════════════════════
   Spinner 动画
   ═══════════════════════════════════════════════════════════════════ */

.spinner {
  animation: spin 1s linear infinite;
}

/* ═══════════════════════════════════════════════════════════════════
   Focus Overlay (专注模式暗角)
   ═══════════════════════════════════════════════════════════════════ */

.focus-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  opacity: 0;
  transition: opacity 0.5s;
  background: radial-gradient(
    ellipse 80% 60% at 50% 50%,
    transparent 0%,
    rgba(0, 0, 0, 0.03) 60%,
    rgba(0, 0, 0, 0.08) 100%
  );
}

.focus-mode .focus-overlay {
  opacity: 1;
}

/* ═══════════════════════════════════════════════════════════════════
   专注模式
   ═══════════════════════════════════════════════════════════════════ */

.focus-mode .panel-manager,
.focus-mode .panel-stage,
.focus-mode .panel-inspector {
  width: 0;
  min-width: 0;
  border-width: 0;
  overflow: hidden;
  transition:
    width 350ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 250ms ease,
    transform 300ms ease;
}

.focus-mode .panel-manager.collapsed {
  width: 0;
  min-width: 0;
  opacity: 0;
  transform: translateX(-20px);
}

.focus-mode .panel-stage.collapsed,
.focus-mode .panel-inspector.collapsed {
  width: 0;
  min-width: 0;
  opacity: 0;
  transform: translateX(20px);
}

.focus-mode .workstation-header {
  opacity: 0.3;
  transition: opacity 0.3s;
}

.focus-mode .workstation-header:hover {
  opacity: 1;
}

.focus-mode .panel-editor {
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.04);
  transition: box-shadow 400ms ease;
  z-index: 6;
}

.focus-exit-btn {
  position: absolute;
  top: 16px;
  right: 18px;
  z-index: 8;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 30px rgba(38, 50, 56, 0.08);
  color: #37474F;
  font-size: 12px;
  font-weight: 700;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.focus-exit-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(211, 47, 47, 0.2);
  box-shadow: 0 16px 36px rgba(38, 50, 56, 0.12);
}

/* ═══════════════════════════════════════════════════════════════════
   滚动条
   ═══════════════════════════════════════════════════════════════════ */

.stage-body::-webkit-scrollbar,
.panel-body::-webkit-scrollbar,
.inspector-scroll::-webkit-scrollbar {
  width: 4px;
}

.stage-body::-webkit-scrollbar-track,
.panel-body::-webkit-scrollbar-track,
.inspector-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.stage-body::-webkit-scrollbar-thumb,
.panel-body::-webkit-scrollbar-thumb,
.inspector-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.stage-body::-webkit-scrollbar-thumb:hover,
.panel-body::-webkit-scrollbar-thumb:hover,
.inspector-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* ═══════════════════════════════════════════════════════════════════
   Reduced Motion
   ═══════════════════════════════════════════════════════════════════ */

@media (prefers-reduced-motion: reduce) {
  .workstation *,
  .workstation *::before,
  .workstation *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
.editor-wrapper--source {
  padding: 20px;
}

.editor-source-dual {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.source-pane,
.preview-pane {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(38, 50, 56, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 40px rgba(38, 50, 56, 0.08);
  backdrop-filter: blur(18px);
}

.preview-pane :deep(.markdown-preview) {
  height: 100%;
  padding: 20px;
  background: transparent;
}

@media (max-width: 1200px) {
  .editor-source-dual {
    grid-template-columns: minmax(0, 1fr);
  }

  .preview-pane {
    min-height: 280px;
  }
}
</style>
