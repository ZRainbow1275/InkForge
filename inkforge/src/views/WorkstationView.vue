<script setup lang="ts">
/**
 * WorkstationView - InkForge 工作站 (v2)
 *
 * 四栏动态力场布局：Manager | Editor | Stage | Inspector
 * 设计语言：Ethereal Constructivism
 *
 * 面板折叠/展开 + 快捷键 + 专注模式 + 多平台预览
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useArticleStore } from '@/stores/article'
import { useSettingsStore } from '@/stores/settings'
import {
  copyToClipboard,
  type Platform,
} from '@/services/export'
import { usePreviewRenderer } from '@/composables/usePreviewRenderer'
import { themePresets } from '@/services/export/themes'
import { FONT_STACKS } from '@/constants'
import { useTypography } from '@/composables/useTypography'

// ─── 子组件 ───
import FileManager from '@/components/file/FileManager.vue'
import VersionPanel from '@/components/version/VersionPanel.vue'
import OutlinePanel from '@/components/outline/OutlinePanel.vue'
import EditorPanel from '@/components/editor/EditorPanel.vue'
import EditorStatusBar from '@/components/editor/EditorStatusBar.vue'
import AssetManager from '@/components/asset/AssetManager.vue'
import ExportModal from '@/components/export/ExportModal.vue'

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

const { selectedArticle, selectedArticleId } = storeToRefs(articleStore)

// ─── EditorPanel ref (暴露 bodyEditor 给 OutlinePanel) ───
const editorPanelRef = ref<InstanceType<typeof EditorPanel> | null>(null)
const outlineEditor = computed(() => editorPanelRef.value?.bodyEditor ?? undefined)

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
  // EditorPanel 内部有 autoSave，这里触发一次强制保存
  await editorStore.updateContent({
    title: currentContent.value?.title ?? '',
    body: currentContent.value?.body ?? '',
    transcript: currentContent.value?.transcript ?? '',
  })
}

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

function toggleManagerPanel() {
  managerCollapsed.value = !managerCollapsed.value
}

// ═══════════════════════════════════════════════════════════════════
// 快捷键
// ═══════════════════════════════════════════════════════════════════

function handleKeydown(e: KeyboardEvent) {
  // Ctrl+S 保存
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSave()
    return
  }

  // Ctrl+Shift+O 切换大纲
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
    e.preventDefault()
    if (managerCollapsed.value) {
      managerCollapsed.value = false
    }
    managerTab.value = 'outline'
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
  if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
    e.preventDefault()
    toggleManagerPanel()
    return
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  clearTimeout(copyFeedbackTimer)
  clearTimeout(linkCopyTimer)
})

// ═══════════════════════════════════════════════════════════════════
// 计算属性
// ═══════════════════════════════════════════════════════════════════

const displayTitle = computed(() => {
  return currentContent.value?.title || selectedArticle.value?.title || '未命名文档'
})

const hasContent = computed(() => {
  return editorStatus.value === 'ready' || editorStatus.value === 'saving'
})
</script>

<template>
  <div class="workstation" :class="{ 'focus-mode': isFocusMode }">
    <!-- Focus Overlay (专注模式暗角) -->
    <div class="focus-overlay"></div>

    <!-- ═══ Header (52px, 对齐原型) ═══ -->
    <header class="workstation-header">
      <!-- 品牌区 -->
      <div class="header-brand" @click="handleBack" title="返回首页">
        <div class="header-logo">IF</div>
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
          />
        </template>
        <template v-else>
          <input
            type="text"
            class="header-title-input"
            :value="displayTitle"
            readonly
            @dblclick="startEditTitle"
            :title="displayTitle"
          />
        </template>

        <!-- 保存状态 Pill -->
        <div
          class="status-pill"
          :class="editorStatus === 'ready' ? 'saved' : editorStatus === 'saving' ? 'unsaved' : editorStatus === 'error' ? 'error' : ''"
        >
          <span class="status-dot"></span>
          {{ saveStatusText }}
        </div>
      </div>

      <!-- 操作区 -->
      <div class="header-actions">
        <!-- 复制 -->
        <button
          class="icon-btn"
          :class="{ success: copySuccess }"
          :disabled="!hasContent"
          :title="copySuccess ? '已复制' : '复制到剪贴板'"
          @click="handleCopyToClipboard"
        >
          <svg v-if="copySuccess" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>

        <!-- 导出 -->
        <button
          class="icon-btn"
          :disabled="!hasContent"
          title="导出"
          @click="showExportModal = true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>

        <!-- 专注模式 -->
        <button
          class="icon-btn"
          :class="{ active: isFocusMode }"
          :title="isFocusMode ? '退出专注模式 (F11)' : '专注模式 (F11)'"
          @click="toggleFocusMode"
        >
          <svg v-if="!isFocusMode" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </svg>
        </button>

        <!-- 发布按钮 CTA -->
        <button class="publish-btn" @click="showExportModal = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
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
      ></div>

      <!-- ─── 左栏 (Manager) ─── -->
      <aside
        class="panel panel-manager"
        :class="{ collapsed: managerCollapsed }"
      >
        <!-- 折叠态竖标签 -->
        <div v-if="managerCollapsed" class="collapsed-label" @click="managerCollapsed = false">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>文件</span>
            </button>
            <button
              class="panel-tab"
              :class="{ active: managerTab === 'versions' }"
              @click="managerTab = 'versions'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
              </svg>
              <span>版本</span>
            </button>
            <button
              class="panel-tab"
              :class="{ active: managerTab === 'outline' }"
              @click="managerTab = 'outline'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>大纲</span>
            </button>

            <!-- 折叠按钮 -->
            <button class="collapse-trigger" title="折叠左栏 (Ctrl+\)" @click="managerCollapsed = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          </div>

          <!-- Tab 内容 -->
          <div class="panel-body">
            <div v-show="managerTab === 'files'" class="tab-content">
              <FileManager />
            </div>
            <div v-show="managerTab === 'versions'" class="tab-content">
              <VersionPanel />
            </div>
            <div v-show="managerTab === 'outline'" class="tab-content">
              <OutlinePanel :editor="outlineEditor" />
            </div>
          </div>
        </template>
      </aside>

      <!-- ─── 编辑器栏 ─── -->
      <main class="panel panel-editor">
        <div class="editor-wrapper">
          <EditorPanel ref="editorPanelRef" />
        </div>
        <EditorStatusBar :editor="editorPanelRef?.bodyEditor ?? undefined" :last-render-time="lastRenderTime" />
      </main>

      <!-- ─── 预览栏 (Stage) ─── -->
      <aside
        class="panel panel-stage"
        :class="{ collapsed: stageCollapsed }"
      >
        <!-- 折叠态：12px 触发条 + hover 红色指示器 -->
        <div v-if="stageCollapsed" class="stage-collapsed-bar" @click="stageCollapsed = false">
          <div class="stage-collapsed-indicator"></div>
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
            <button class="collapse-trigger" title="折叠预览栏" @click="stageCollapsed = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div class="stage-body">
            <!-- iPhone 设备框 -->
            <div class="device-frame">
              <!-- 刘海（黑色圆角矩形） -->
              <div class="device-notch"></div>
              <!-- 屏幕内容区域 -->
              <div class="device-screen">
                <!-- 加载中 -->
                <div v-if="previewLoading" class="preview-loading">
                  <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span>渲染中...</span>
                </div>

                <!-- 无内容 -->
                <div v-else-if="!previewHtml" class="preview-empty">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>选择文章后查看预览</span>
                </div>

                <!-- 渲染预览 -->
                <div v-else class="preview-content" v-html="previewHtml" />
              </div>
              <!-- Home Indicator（灰色圆角条） -->
              <div class="device-home-indicator"></div>
            </div>

            <!-- 预设快速选择（当前平台前 5 个） -->
            <div class="stage-presets">
              <button
                v-for="preset in topPresets"
                :key="preset.id"
                class="stage-preset-chip"
                :class="{ active: settingsStore.settings.export.defaultPresetId === preset.id }"
                :title="preset.description"
                @click="applyPreset(preset.id)"
              >
                <span class="stage-preset-icon">{{ preset.icon }}</span>
                <span class="stage-preset-name">{{ preset.name }}</span>
              </button>
            </div>

            <!-- 操作按钮组 -->
            <div class="stage-actions">
              <button
                class="stage-btn-primary"
                :class="{ success: copySuccess }"
                :disabled="!hasContent"
                @click="handleCopyToClipboard"
              >
                <svg v-if="copySuccess" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {{ copySuccess ? '已复制' : '复制到平台' }}
              </button>
              <button
                class="stage-btn-secondary"
                :disabled="!hasContent"
                @click="showExportModal = true"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
                全屏导出
              </button>
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
        <div v-if="inspectorCollapsed" class="inspector-collapsed-bar" @click="inspectorCollapsed = false">
          <div class="inspector-collapsed-indicator"></div>
        </div>

        <!-- 展开态内容：4个垂直滚动 Section -->
        <template v-else>
          <div class="inspector-header">
            <span class="inspector-title">检查器</span>
            <button class="collapse-trigger" title="折叠右栏" @click="inspectorCollapsed = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div class="inspector-scroll">
            <!-- Section 1: 排版风格 -->
            <div class="inspector-section">
              <div class="inspector-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
                </svg>
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
                  <svg v-if="settingsStore.settings.appearance.accentColor === color.value" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
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
                  <span class="preset-icon">{{ preset.icon }}</span>
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
                />
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

              <router-link to="/themes" class="inspector-link">查看全部预设 →</router-link>
            </div>

            <!-- Section 2: 字体控制 -->
            <div class="inspector-section">
              <div class="inspector-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
                </svg>
                <span>字体</span>
              </div>
              <!-- 字体族选择按钮组 -->
              <div class="font-family-group">
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'serif' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'serif'"
                >
                  <span class="font-family-preview" :style="{ fontFamily: fontFamilyMap.serif }">Aa</span>
                  <span class="font-family-name">衬线</span>
                </button>
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'sans' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'sans'"
                >
                  <span class="font-family-preview" :style="{ fontFamily: fontFamilyMap.sans }">Aa</span>
                  <span class="font-family-name">无衬线</span>
                </button>
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'kai' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'kai'"
                >
                  <span class="font-family-preview" :style="{ fontFamily: fontFamilyMap.kai }">Aa</span>
                  <span class="font-family-name">楷体</span>
                </button>
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'mono' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'mono'"
                >
                  <span class="font-family-preview" :style="{ fontFamily: fontFamilyMap.mono }">Aa</span>
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
                  min="12" max="24" step="1"
                  :value="settingsStore.settings.appearance.fontSize"
                  @input="settingsStore.settings.appearance.fontSize = Number(($event.target as HTMLInputElement).value)"
                />
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
                  min="1.4" max="2.4" step="0.1"
                  :value="settingsStore.settings.appearance.lineHeight"
                  @input="settingsStore.settings.appearance.lineHeight = Number(($event.target as HTMLInputElement).value)"
                />
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
                <br />The quick brown fox jumps over the lazy dog.
              </div>
            </div>

            <!-- Section 3: 素材库 -->
            <div class="inspector-section">
              <div class="inspector-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
                <span>素材库</span>
              </div>
              <div class="inspector-asset-wrapper">
                <AssetManager :article-id="selectedArticleId ?? undefined" />
              </div>
            </div>

            <!-- Section 4: 引用链接 -->
            <div class="inspector-section">
              <div class="inspector-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>引用链接</span>
                <span v-if="extractedLinks.length > 0" class="inspector-count">{{ extractedLinks.length }}</span>
              </div>
              <div v-if="extractedLinks.length === 0" class="inspector-empty-hint">
                <p>暂无外部链接引用</p>
                <p class="inspector-empty-sub">在 Markdown 中使用 [文字](URL) 添加链接</p>
              </div>
              <div v-else class="inspector-links-list">
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
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
                    <svg v-if="copiedLinkIndex === idx" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
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
      :content="currentContent?.body || ''"
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
  width: 260px;
  min-width: 260px;
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

/* ─── Stage 预设快速选择 ─── */
.stage-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  max-width: 375px;
}

.stage-preset-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #FFFFFF;
  font-size: 11px;
  color: #607D8B;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.stage-preset-chip:hover {
  border-color: #CFD8DC;
  background: #F5F5F5;
  color: #263238;
}

.stage-preset-chip.active {
  border-color: #D32F2F;
  background: #FFEBEE;
  color: #D32F2F;
  font-weight: 500;
}

.stage-preset-icon {
  font-size: 13px;
  line-height: 1;
}

.stage-preset-name {
  font-size: 11px;
}

/* ─── Stage 操作按钮组 ─── */
.stage-actions {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 375px;
}

.stage-btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #D32F2F;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.stage-btn-primary:hover:not(:disabled) {
  background: #C62828;
}

.stage-btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stage-btn-primary.success {
  background: #4CAF50;
}

.stage-btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  background: #FFFFFF;
  color: #607D8B;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.stage-btn-secondary:hover:not(:disabled) {
  border-color: #BDBDBD;
  background: #FAFAFA;
  color: #263238;
}

.stage-btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

.inspector-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #607D8B;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
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
  font-size: 12px;
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
}

.focus-mode .panel-manager.collapsed,
.focus-mode .panel-stage.collapsed,
.focus-mode .panel-inspector.collapsed {
  width: 0;
  min-width: 0;
}

.focus-mode .workstation-header {
  opacity: 0.3;
  transition: opacity 0.3s;
}

.focus-mode .workstation-header:hover {
  opacity: 1;
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
</style>
