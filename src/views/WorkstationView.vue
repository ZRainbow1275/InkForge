<script setup lang="ts">
/**
 * WorkstationView - InkForge 工作站
 * 四栏动态力场布局：Manager | Editor | Stage | Inspector
 * 基于 prototype/inkforge_workstation.html 设计稿
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'
import { marked } from 'marked'
import { themePresets, convertToWechat, convertToXiaohongshu, convertToZhihu } from '@/services/export'

const router = useRouter()
const themeStore = useThemeStore()

const { currentPresetId, primaryColor, fontFamily } = storeToRefs(themeStore)

// 面板折叠状态
const managerCollapsed = ref(false)
const stageCollapsed = ref(false)
const inspectorCollapsed = ref(false)
const isFocusMode = ref(false)

// Manager 面板 Tab
const managerTab = ref<'files' | 'versions'>('files')
const currentVersion = ref('v3')

// 编辑器状态
const articleTitle = ref('2024-Year-End-Review')
const editorContent = ref(`# 2024 年终总结：技术与人文的十字路口

站在 2024 的尾巴上回望，这一年我们见证了太多变革。从 AI 的狂飙突进到设计语言的范式转移，每一次技术浪潮都在重塑我们对"创作"的理解。

> 设计不仅仅是外表和感觉。设计是关于它如何工作的。—— 史蒂夫·乔布斯

## 第一章：构成主义的回归

当我们审视 2024 年的设计趋势，会发现一个有趣的现象：源自 1920 年代苏联的\`构成主义\`正以全新的姿态回归。不对称的布局、几何化的形态、以及那抹标志性的红色，正在重新定义数字界面的视觉语言。

这种回归并非简单的复古，而是一种对"功能主义"的重新诠释。在过度装饰的 Web 3.0 时代之后，设计师们开始追问：我们真的需要那么多渐变和阴影吗？

## 第二章：AI 与创作的共生

人工智能不再是工具，而是创作伙伴。这一年，我们学会了与 AI 对话、协作、共同创造。
`)
const isDirty = ref(true)

// 预览状态
const platform = ref<'wechat' | 'xiaohongshu' | 'zhihu'>('wechat')
const previewHtml = ref('')

// 编辑器引用
const editorTextarea = ref<HTMLTextAreaElement | null>(null)
const previewContainer = ref<HTMLElement | null>(null)

// 主题颜色配置（统一定义，避免重复）
const THEME_COLOR_MAP: Record<string, string> = {
  red: '#D32F2F',
  blue: '#1565C0',
  green: '#2E7D32',
  purple: '#7B1FA2',
  orange: '#E65100',
} as const

const themeColors = Object.entries(THEME_COLOR_MAP).map(([id, color]) => ({ id, color }))

// 字体选择 - 使用 store 中的 fontFamily，不再重复声明
// const fontFamily 已在第17行从 themeStore 解构

// 悬浮菜单
const showFloatingMenu = ref(false)

// 斜杠命令
const showSlashMenu = ref(false)
const slashMenuStyle = ref({ top: '0px', left: '0px' })
const slashFilter = ref('')
const slashSelectedIndex = ref(0)

const slashCommands = [
  { id: 'h1', label: '标题 1', icon: 'H1', shortcut: '#', insert: '# ' },
  { id: 'h2', label: '标题 2', icon: 'H2', shortcut: '##', insert: '## ' },
  { id: 'h3', label: '标题 3', icon: 'H3', shortcut: '###', insert: '### ' },
  { id: 'quote', label: '引用块', icon: '❝', shortcut: '>', insert: '> ' },
  { id: 'code', label: '代码块', icon: '⌘', shortcut: '```', insert: '```\n\n```' },
  { id: 'divider', label: '分割线', icon: '—', shortcut: '---', insert: '\n---\n' },
  { id: 'list', label: '无序列表', icon: '•', shortcut: '-', insert: '- ' },
  { id: 'olist', label: '有序列表', icon: '1.', shortcut: '1.', insert: '1. ' },
  { id: 'bold', label: '粗体', icon: 'B', shortcut: '**', insert: '**文本**' },
  { id: 'italic', label: '斜体', icon: 'I', shortcut: '*', insert: '*文本*' },
]

const filteredSlashCommands = computed(() => {
  if (!slashFilter.value) return slashCommands
  return slashCommands.filter(cmd =>
    cmd.label.toLowerCase().includes(slashFilter.value.toLowerCase()) ||
    cmd.id.toLowerCase().includes(slashFilter.value.toLowerCase())
  )
})

// 版本列表
const versions = ref([
  { id: 'v3', label: 'v3', time: '今天 23:45', desc: '添加第二章内容', isCurrent: true },
  { id: 'v2', label: 'v2', time: '今天 21:30', desc: '完善引言部分', isCurrent: false },
  { id: 'v1', label: 'v1', time: '昨天 15:20', desc: '初始版本', isInit: true, isCurrent: false },
])

// 计算属性
const wordCount = computed(() => {
  return editorContent.value.replace(/\s/g, '').replace(/[#*`>\[\]()-]/g, '').length
})

const readingTime = computed(() => Math.ceil(wordCount.value / 500))

// 主题色映射（使用统一定义的 THEME_COLOR_MAP）
// themeColorMap 用于模板中的主题色选择器

// 生成预览 - 根据平台使用不同渲染引擎
watch([editorContent, currentPresetId, fontFamily, platform], async () => {
  const rawHtml = await marked(editorContent.value)

  try {
    let result: string

    switch (platform.value) {
      case 'wechat': {
        const preset = themePresets.find(p => p.id === currentPresetId.value) || themePresets[0]
        result = convertToWechat(rawHtml, preset, {})
        break
      }
      case 'xiaohongshu': {
        result = convertToXiaohongshu(rawHtml, 'xhs-fresh')
        break
      }
      case 'zhihu': {
        result = convertToZhihu(rawHtml)
        break
      }
      default:
        result = rawHtml
    }

    previewHtml.value = result
  } catch (e) {
    previewHtml.value = rawHtml
  }
}, { immediate: true })

// 滚动同步状态
const isScrollingSyncLocked = ref(false)
const scrollSyncSource = ref<'editor' | 'preview' | null>(null)
const scrollSyncEnabled = ref(true)

/**
 * 编辑器 → 预览 同步滚动
 * 使用比例映射，防止循环触发
 */
function syncEditorToPreview() {
  if (!scrollSyncEnabled.value) return
  if (isScrollingSyncLocked.value && scrollSyncSource.value !== 'editor') return
  if (!editorTextarea.value || !previewContainer.value) return

  const editor = editorTextarea.value
  const preview = previewContainer.value

  // 防止除零
  const editorScrollable = editor.scrollHeight - editor.clientHeight
  if (editorScrollable <= 0) return

  // 锁定防循环
  isScrollingSyncLocked.value = true
  scrollSyncSource.value = 'editor'

  const scrollRatio = editor.scrollTop / editorScrollable
  const previewScrollable = preview.scrollHeight - preview.clientHeight
  preview.scrollTop = scrollRatio * previewScrollable

  // 延迟解锁
  requestAnimationFrame(() => {
    setTimeout(() => {
      isScrollingSyncLocked.value = false
      scrollSyncSource.value = null
    }, 50)
  })
}

/**
 * 预览 → 编辑器 同步滚动
 */
function syncPreviewToEditor() {
  if (!scrollSyncEnabled.value) return
  if (isScrollingSyncLocked.value && scrollSyncSource.value !== 'preview') return
  if (!editorTextarea.value || !previewContainer.value) return

  const editor = editorTextarea.value
  const preview = previewContainer.value

  // 防止除零
  const previewScrollable = preview.scrollHeight - preview.clientHeight
  if (previewScrollable <= 0) return

  // 锁定防循环
  isScrollingSyncLocked.value = true
  scrollSyncSource.value = 'preview'

  const scrollRatio = preview.scrollTop / previewScrollable
  const editorScrollable = editor.scrollHeight - editor.clientHeight
  editor.scrollTop = scrollRatio * editorScrollable

  // 延迟解锁
  requestAnimationFrame(() => {
    setTimeout(() => {
      isScrollingSyncLocked.value = false
      scrollSyncSource.value = null
    }, 50)
  })
}

// 兼容旧函数名
function syncScroll() {
  syncEditorToPreview()
}

// 导航
function goToHub() {
  router.push('/')
}

function goToPublish() {
  router.push('/publish')
}

function goToSettings() {
  router.push('/settings')
}

function goToThemes() {
  router.push('/themes')
}

// 专注模式
function toggleFocusMode() {
  isFocusMode.value = !isFocusMode.value
  if (isFocusMode.value) {
    managerCollapsed.value = true
    inspectorCollapsed.value = true
  }
}

// 版本管理
function createVersion() {
  const newVersion = {
    id: `v${versions.value.length + 1}`,
    label: `v${versions.value.length + 1}`,
    time: '刚刚',
    desc: '新版本',
    isCurrent: true,
  }
  // 不可变更新：创建新数组而非直接修改
  versions.value = [newVersion, ...versions.value.map(v => ({ ...v, isCurrent: false }))]
  currentVersion.value = newVersion.id
  isDirty.value = false
}

function switchVersion(versionId: string) {
  currentVersion.value = versionId
  // 不可变更新：创建新数组
  versions.value = versions.value.map(v => ({ ...v, isCurrent: v.id === versionId }))
}

// 斜杠命令
function handleKeydown(e: KeyboardEvent) {
  // 斜杠触发
  if (e.key === '/' && !showSlashMenu.value) {
    nextTick(() => {
      showSlashMenuAtCursor()
    })
  }

  // 斜杠菜单导航
  if (showSlashMenu.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      slashSelectedIndex.value = (slashSelectedIndex.value + 1) % filteredSlashCommands.value.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      slashSelectedIndex.value = slashSelectedIndex.value <= 0
        ? filteredSlashCommands.value.length - 1
        : slashSelectedIndex.value - 1
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredSlashCommands.value[slashSelectedIndex.value]) {
        executeSlashCommand(filteredSlashCommands.value[slashSelectedIndex.value])
      }
    } else if (e.key === 'Escape') {
      showSlashMenu.value = false
    }
  }

  // 快捷键
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'b') {
      e.preventDefault()
      insertFormat('**', '**')
    }
    if (e.key === 'i') {
      e.preventDefault()
      insertFormat('*', '*')
    }
    if (e.key === 's') {
      e.preventDefault()
      createVersion()
    }
  }
}

function showSlashMenuAtCursor() {
  if (!editorTextarea.value) return

  const textarea = editorTextarea.value
  const rect = textarea.getBoundingClientRect()

  // 获取光标位置
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = editorContent.value.substring(0, cursorPos)
  const lines = textBeforeCursor.split('\n')
  const currentLine = lines.length
  const lineHeight = 27 // 约等于 line-height

  slashMenuStyle.value = {
    top: `${rect.top + currentLine * lineHeight + 20}px`,
    left: `${rect.left + 72}px`
  }
  showSlashMenu.value = true
  slashFilter.value = ''
  slashSelectedIndex.value = 0
}

function executeSlashCommand(cmd: typeof slashCommands[0]) {
  if (!editorTextarea.value) return

  const textarea = editorTextarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  // 删除斜杠
  const beforeSlash = editorContent.value.substring(0, start - 1)
  const afterCursor = editorContent.value.substring(end)

  editorContent.value = beforeSlash + cmd.insert + afterCursor
  showSlashMenu.value = false

  nextTick(() => {
    const newPos = beforeSlash.length + cmd.insert.length
    textarea.focus()
    textarea.setSelectionRange(newPos, newPos)
  })
}

function insertFormat(prefix: string, suffix: string) {
  if (!editorTextarea.value) return

  const textarea = editorTextarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = editorContent.value.substring(start, end) || '文本'

  const before = editorContent.value.substring(0, start)
  const after = editorContent.value.substring(end)

  editorContent.value = before + prefix + selected + suffix + after

  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
  })
}

// 主题色选择
function selectThemeColor(colorId: string) {
  const color = themeColors.find(c => c.id === colorId)
  if (color) {
    themeStore.primaryColor = color.color
  }
}

// 编辑器输入
function onEditorInput() {
  isDirty.value = true

  // 检测斜杠菜单关闭
  if (showSlashMenu.value) {
    const textarea = editorTextarea.value
    if (textarea) {
      const cursorPos = textarea.selectionStart
      const charBefore = editorContent.value.charAt(cursorPos - 1)
      if (charBefore !== '/' && !slashFilter.value) {
        // 更新过滤器或关闭
        const text = editorContent.value.substring(0, cursorPos)
        const slashPos = text.lastIndexOf('/')
        if (slashPos >= 0 && cursorPos - slashPos < 20) {
          slashFilter.value = text.substring(slashPos + 1)
        } else {
          showSlashMenu.value = false
        }
      }
    }
  }
}

// 快捷键 - 使用命名函数便于清理
function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'F11') {
    e.preventDefault()
    toggleFocusMode()
  }
  if (e.key === 'Escape') {
    if (isFocusMode.value) {
      isFocusMode.value = false
      managerCollapsed.value = false
      inspectorCollapsed.value = false
    }
    showSlashMenu.value = false
    showFloatingMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <div class="workstation" :class="{ 'focus-mode': isFocusMode }">
    <div class="focus-overlay"></div>

    <!-- Header -->
    <header class="ws-header">
      <div class="header-brand" @click="goToHub" title="返回首页">
        <div class="logo">IF</div>
        <span class="brand-name">InkForge</span>
      </div>

      <div class="header-title">
        <input type="text" v-model="articleTitle" placeholder="无标题文章">
        <div class="status-indicator" :class="isDirty ? 'unsaved' : 'saved'">
          <span class="status-dot" :class="isDirty ? 'warning' : 'success'"></span>
          {{ isDirty ? '编辑中' : '已保存' }}
        </div>
      </div>

      <div class="header-actions">
        <button class="icon-btn" :class="{ active: isFocusMode }" @click="toggleFocusMode" title="专注模式 (F11)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </button>
        <button class="icon-btn" @click="goToSettings" title="设置">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <button class="publish-btn" @click="goToPublish">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          发布中心
        </button>
      </div>
    </header>

    <!-- Workspace -->
    <main class="ws-main">
      <!-- Manager Panel -->
      <aside class="manager-panel frosted-panel" :class="{ collapsed: managerCollapsed }">
        <div class="panel-header">
          <span class="panel-title">资源管理器</span>
          <button class="icon-btn small" @click="managerCollapsed = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        </div>

        <div class="panel-content">
          <!-- Tabs -->
          <div class="manager-tabs">
            <button class="manager-tab" :class="{ active: managerTab === 'files' }" @click="managerTab = 'files'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              文件
            </button>
            <button class="manager-tab" :class="{ active: managerTab === 'versions' }" @click="managerTab = 'versions'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="6" y1="3" x2="6" y2="15"></line>
                <circle cx="18" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <path d="M18 9a9 9 0 0 1-9 9"></path>
              </svg>
              版本
            </button>
          </div>

          <!-- Files Tab -->
          <div v-show="managerTab === 'files'" class="tab-content">
            <div class="section-label">Bundle 内容</div>
            <div class="file-item active">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              {{ articleTitle }}
            </div>
            <div class="file-item sub">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              main.md
            </div>
            <div class="file-item sub">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              assets/ <span class="count">3</span>
            </div>

            <div class="section-label">草稿箱</div>
            <div class="file-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              </svg>
              Q1-营销方案
            </div>
          </div>

          <!-- Versions Tab -->
          <div v-show="managerTab === 'versions'" class="tab-content">
            <button class="create-version-btn" @click="createVersion">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              创建版本
            </button>

            <div class="section-label">版本历史</div>
            <div
              v-for="version in versions"
              :key="version.id"
              class="version-item"
              :class="{ active: version.isCurrent }"
              @click="switchVersion(version.id)"
            >
              <div class="version-dot" :class="{ current: version.isCurrent }"></div>
              <div class="version-info">
                <div class="version-label">
                  {{ version.label }}
                  <span v-if="version.isCurrent" class="version-tag">当前</span>
                  <span v-else-if="version.isInit" class="version-tag init">初稿</span>
                </div>
                <div class="version-time">{{ version.time }}</div>
                <div class="version-desc">{{ version.desc }}</div>
              </div>
            </div>

            <div class="version-tip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              点击版本可切换，历史版本为只读
            </div>
          </div>
        </div>
      </aside>

      <!-- Edge Trigger Left -->
      <div v-if="managerCollapsed" class="edge-trigger left" @click="managerCollapsed = false">
        <div class="edge-indicator"></div>
      </div>

      <!-- Editor Area -->
      <div class="editor-area">
        <div class="editor-scroll">
          <div class="editor-container">
            <textarea
              ref="editorTextarea"
              class="editor-textarea"
              v-model="editorContent"
              @input="onEditorInput"
              @keydown="handleKeydown"
              @scroll="syncScroll"
              placeholder="开始你的创作... 输入 / 唤起命令菜单"
              spellcheck="false"
            ></textarea>
          </div>
        </div>

        <!-- Slash Menu -->
        <div class="slash-menu" v-if="showSlashMenu" :style="slashMenuStyle">
          <div class="slash-menu-header">插入内容</div>
          <div
            v-for="(cmd, index) in filteredSlashCommands"
            :key="cmd.id"
            class="slash-menu-item"
            :class="{ selected: slashSelectedIndex === index }"
            @click="executeSlashCommand(cmd)"
          >
            <span class="icon">{{ cmd.icon }}</span>
            <span class="label">{{ cmd.label }}</span>
            <span class="shortcut">{{ cmd.shortcut }}</span>
          </div>
        </div>
      </div>

      <!-- Stage Panel -->
      <aside class="stage-panel frosted-panel" :class="{ collapsed: stageCollapsed }">
        <div class="stage-tabs">
          <button
            class="stage-tab"
            :class="{ active: platform === 'wechat' }"
            @click="platform = 'wechat'"
          >微信</button>
          <button
            class="stage-tab"
            :class="{ active: platform === 'xiaohongshu' }"
            @click="platform = 'xiaohongshu'"
          >小红书</button>
          <button
            class="stage-tab"
            :class="{ active: platform === 'zhihu' }"
            @click="platform = 'zhihu'"
          >知乎</button>
        </div>

        <div class="stage-content">
          <div class="device-frame">
            <div class="dynamic-island"></div>
            <div class="device-screen" ref="previewContainer" @scroll="syncPreviewToEditor" v-html="previewHtml"></div>
          </div>
        </div>
      </aside>

      <!-- Inspector Panel -->
      <aside class="inspector-panel frosted-panel" :class="{ collapsed: inspectorCollapsed }">
        <div class="panel-header">
          <span class="panel-title">检查器</span>
        </div>

        <div class="panel-content">
          <!-- Theme Colors -->
          <div class="inspector-section">
            <div class="inspector-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
              </svg>
              排版风格
            </div>
            <div class="theme-colors">
              <button
                v-for="color in themeColors"
                :key="color.id"
                class="theme-color"
                :class="{ active: primaryColor === color.color }"
                :style="{ backgroundColor: color.color }"
                @click="selectThemeColor(color.id)"
              ></button>
            </div>
            <a class="theme-link" @click="goToThemes">查看全部 10 种预设 →</a>
          </div>

          <!-- Font -->
          <div class="inspector-section">
            <div class="inspector-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="4 7 4 4 20 4 20 7"></polyline>
                <line x1="9" y1="20" x2="15" y2="20"></line>
                <line x1="12" y1="4" x2="12" y2="20"></line>
              </svg>
              字体控制
            </div>
            <select class="select" v-model="fontFamily">
              <option value="serif">宋体 (Serif)</option>
              <option value="sans">黑体 (Sans)</option>
              <option value="kai">楷体 (Kai)</option>
            </select>
          </div>

          <!-- Assets -->
          <div class="inspector-section">
            <div class="inspector-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              素材库
            </div>
            <div class="upload-zone">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>拖拽上传图片</span>
            </div>
            <div class="asset-grid">
              <div class="asset-item">
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop"
                  alt="素材图片"
                  @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                >
              </div>
              <div class="asset-item">
                <img
                  src="https://images.unsplash.com/photo-1634017839464-5c339afa5c72?w=200&h=200&fit=crop"
                  alt="素材图片"
                  @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                >
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Edge Trigger Right -->
      <div v-if="inspectorCollapsed" class="edge-trigger right" @click="inspectorCollapsed = false">
        <div class="edge-indicator"></div>
      </div>
    </main>

    <!-- Status Bar -->
    <footer class="ws-footer">
      <div class="status-group">
        <span class="status-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          </svg>
          {{ wordCount }} 字
        </span>
        <span class="status-divider"></span>
        <span class="status-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          约 {{ readingTime }} 分钟
        </span>
        <span class="status-divider"></span>
        <span class="status-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="6" y1="3" x2="6" y2="15"></line>
            <circle cx="18" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <path d="M18 9a9 9 0 0 1-9 9"></path>
          </svg>
          {{ currentVersion }}
        </span>
      </div>
      <div class="status-group">
        <span class="status-item success">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Pre-flight Ready
        </span>
        <span class="status-divider"></span>
        <span class="status-item">
          Platform: {{ platform === 'wechat' ? '微信公众号' : platform === 'xiaohongshu' ? '小红书' : '知乎' }}
        </span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.workstation {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-rice-paper);
  position: relative;
}

.focus-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  opacity: 0;
  transition: opacity 0.5s;
  background: radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, rgba(0,0,0,0.03) 60%, rgba(0,0,0,0.08) 100%);
}

.focus-mode .focus-overlay { opacity: 1; }
.focus-mode .ws-header,
.focus-mode .ws-footer { opacity: 0.3; transition: opacity 0.3s; }
.focus-mode .ws-header:hover,
.focus-mode .ws-footer:hover { opacity: 1; }

/* Header */
.ws-header {
  height: 52px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 var(--space-medium);
  gap: var(--space-medium);
  flex-shrink: 0;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: var(--space-medium);
  border-right: 1px solid var(--border);
  cursor: pointer;
  transition: opacity 0.15s;
}

.header-brand:hover { opacity: 0.7; }

.logo {
  width: 28px;
  height: 28px;
  background: var(--accent-primary);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 11px;
}

.brand-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-small);
}

.header-title input {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  padding: 6px 10px;
  border-radius: 6px;
  min-width: 280px;
  transition: background 0.15s;
}

.header-title input:hover { background: var(--bg-rice-paper); }
.header-title input:focus { background: var(--accent-primary-light); }

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.status-indicator.saved { background: var(--success-light); color: var(--success); }
.status-indicator.unsaved { background: var(--warning-light); color: var(--warning); }

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.status-dot.success { background: var(--success); }
.status-dot.warning { background: var(--warning); }

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-small);
}

.icon-btn.active {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.publish-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.25);
}

.publish-btn:hover {
  background: var(--accent-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.35);
}

/* Main */
.ws-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* Panels */
.manager-panel,
.inspector-panel {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.3s var(--ease-panel), opacity 0.3s;
  overflow: hidden;
}

.manager-panel { width: 240px; border-right: 1px solid var(--border); }
.inspector-panel { width: 280px; border-left: 1px solid var(--border); }

.manager-panel.collapsed,
.inspector-panel.collapsed {
  width: 0;
  border: none;
  opacity: 0;
}

.stage-panel {
  width: 360px;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.panel-header {
  padding: var(--space-medium);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-small);
}

.icon-btn.small {
  width: 24px;
  height: 24px;
}

/* Manager Tabs */
.manager-tabs {
  display: flex;
  gap: 4px;
  padding: var(--space-small);
  border-bottom: 1px solid var(--border-light);
}

.manager-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.manager-tab:hover { background: var(--bg-rice-paper); color: var(--text-secondary); }
.manager-tab.active { background: var(--accent-primary-light); color: var(--accent-primary); }

.section-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: var(--space-small);
  margin-top: var(--space-small);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--space-small);
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.1s;
}

.file-item:hover { background: var(--bg-rice-paper); color: var(--text-primary); }
.file-item.active { background: var(--accent-primary-light); color: var(--accent-primary); }
.file-item.sub { padding-left: 28px; }
.file-item .count {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-rice-paper);
  padding: 2px 6px;
  border-radius: 4px;
}

/* Versions */
.create-version-btn {
  width: calc(100% - 16px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  margin: var(--space-small);
}

.create-version-btn:hover { background: var(--accent-primary-dark); }

.version-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  margin: 0 4px 4px;
}

.version-item:hover { background: var(--bg-rice-paper); }
.version-item.active { background: var(--accent-primary-light); }

.version-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
  margin-top: 4px;
  flex-shrink: 0;
}

.version-dot.current {
  background: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-primary-light);
}

.version-info { flex: 1; min-width: 0; }

.version-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.version-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 3px;
  background: var(--accent-primary);
  color: white;
  text-transform: uppercase;
}

.version-tag.init { background: var(--text-muted); }

.version-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.version-desc {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.version-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 16px 8px 8px;
  padding: 10px;
  background: var(--bg-rice-paper);
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

/* Edge Trigger */
.edge-trigger {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  z-index: 100;
  cursor: pointer;
}

.edge-trigger.left { left: 0; }
.edge-trigger.right { right: 0; }

.edge-indicator {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 48px;
  background: var(--accent-primary);
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s var(--ease-bounce);
}

.edge-trigger.left .edge-indicator { left: 4px; }
.edge-trigger.right .edge-indicator { right: 4px; }

.edge-trigger:hover .edge-indicator {
  opacity: 0.6;
  transform: translateY(-50%) scaleY(1.2);
}

/* Editor Area */
.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
}

.editor-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: var(--space-large);
}

.editor-container {
  width: 100%;
  max-width: 680px;
}

.editor-textarea {
  width: 100%;
  min-height: 800px;
  background: var(--bg-surface);
  border-radius: 2px;
  box-shadow: var(--shadow-soft);
  padding: var(--space-macro) 72px;
  outline: none;
  border: none;
  resize: none;
  font-family: var(--font-mono);
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
}

.editor-textarea:focus {
  box-shadow: var(--shadow-medium);
}

.editor-textarea::placeholder {
  color: var(--text-muted);
}

/* Slash Menu */
.slash-menu {
  position: fixed;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-float);
  padding: 8px;
  min-width: 200px;
  z-index: 1001;
  animation: slashMenuIn 0.15s var(--ease-bounce);
}

@keyframes slashMenuIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.slash-menu-header {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 4px;
}

.slash-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.1s;
}

.slash-menu-item:hover,
.slash-menu-item.selected {
  background: var(--accent-primary-light);
}

.slash-menu-item .icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-rice-paper);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
}

.slash-menu-item .label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.slash-menu-item .shortcut {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* Stage */
.stage-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-light);
  padding: var(--space-small);
  gap: 4px;
}

.stage-tab {
  flex: 1;
  padding: 8px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.stage-tab:hover { background: var(--bg-rice-paper); color: var(--text-secondary); }
.stage-tab.active { background: var(--accent-primary-light); color: var(--accent-primary); }

.stage-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-medium);
  overflow: hidden;
}

.device-frame {
  width: 280px;
  height: 560px;
  background: #1C1C1E;
  border-radius: 36px;
  padding: 12px;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.1) inset, 0 20px 40px rgba(0,0,0,0.2);
  position: relative;
}

.dynamic-island {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  height: 28px;
  background: #000;
  border-radius: 20px;
  z-index: 10;
}

.device-screen {
  width: 100%;
  height: 100%;
  background: var(--bg-surface);
  border-radius: 28px;
  overflow-y: auto;
  padding: 48px 16px 16px;
  font-size: 14px;
  line-height: 1.6;
}

/* Inspector */
.inspector-section {
  padding: var(--space-medium);
  border-bottom: 1px solid var(--border-light);
}

.inspector-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-muted);
  margin-bottom: var(--space-small);
  display: flex;
  align-items: center;
  gap: 6px;
}

.theme-colors {
  display: flex;
  gap: var(--space-small);
}

.theme-color {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
}

.theme-color:hover { transform: scale(1.15); }
.theme-color.active {
  border-color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.theme-link {
  display: block;
  font-size: 12px;
  color: var(--accent-primary);
  text-decoration: none;
  margin-top: var(--space-small);
  cursor: pointer;
}

.theme-link:hover { text-decoration: underline; }

.upload-zone {
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: var(--space-medium);
  text-align: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-zone:hover {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-small);
  margin-top: var(--space-medium);
}

.asset-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
  background: var(--bg-rice-paper);
}

.asset-item:hover {
  border-color: var(--accent-primary);
}

.asset-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Footer */
.ws-footer {
  height: 26px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-medium);
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.status-group {
  display: flex;
  align-items: center;
  gap: var(--space-medium);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-item.success {
  color: var(--success);
}

.status-divider {
  width: 1px;
  height: 12px;
  background: var(--border);
}
</style>
