<script setup lang="ts">
/**
 * SettingsView - 企业级 7 Tab 设置中心
 *
 * Tab 结构：
 *   1. 外观 (Appearance)
 *   2. 编辑器 (Editor)
 *   3. 导出 (Export)
 *   4. AI 服务 (AI)
 *   5. 数据 (Data)
 *   6. 快捷键 (Shortcuts)
 *   7. 关于 (About)
 *
 * 所有设置项实时绑定到 settingsStore.settings ref，
 * store 已配置 deep watch 自动持久化到 localStorage。
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import { useAIStore } from '@/stores/ai'
import { useArticleStore } from '@/stores/article'
import { useAssetStore } from '@/stores/asset'

// ═══════════════════════════════════════
//  Store & Router
// ═══════════════════════════════════════

const router = useRouter()
const settingsStore = useSettingsStore()
const aiStore = useAIStore()
const articleStore = useArticleStore()
const assetStore = useAssetStore()

const { settings } = storeToRefs(settingsStore)

// ═══════════════════════════════════════
//  Tab 系统
// ═══════════════════════════════════════

type TabId = 'appearance' | 'editor' | 'export' | 'ai' | 'data' | 'shortcuts' | 'about'

const currentTab = ref<TabId>('appearance')

interface TabDef {
  id: TabId
  name: string
}

const tabs: TabDef[] = [
  { id: 'appearance', name: '外观' },
  { id: 'editor', name: '编辑器' },
  { id: 'export', name: '导出' },
  { id: 'ai', name: 'AI 服务' },
  { id: 'data', name: '数据' },
  { id: 'shortcuts', name: '快捷键' },
  { id: 'about', name: '关于' },
]

// ═══════════════════════════════════════
//  Tab 1: 外观
// ═══════════════════════════════════════

interface ThemeOption {
  value: 'light' | 'dark' | 'system'
  label: string
  desc: string
}

const themeOptions: ThemeOption[] = [
  { value: 'light', label: '浅色', desc: '明亮的工作环境' },
  { value: 'dark', label: '深色', desc: '降低眼部疲劳' },
  { value: 'system', label: '跟随系统', desc: '自动适应系统设置' },
]

interface FontOption {
  value: 'serif' | 'sans' | 'kai' | 'mono'
  label: string
  sample: string
}

const fontOptions: FontOption[] = [
  { value: 'serif', label: '宋体', sample: '思源宋体 Noto Serif' },
  { value: 'sans', label: '黑体', sample: '思源黑体 Noto Sans' },
  { value: 'kai', label: '楷体', sample: '楷体 KaiTi' },
  { value: 'mono', label: '等宽', sample: 'JetBrains Mono' },
]

interface AccentOption {
  value: string
  label: string
}

const accentColors: AccentOption[] = [
  { value: '#D32F2F', label: '构成红' },
  { value: '#1565C0', label: '瑞士蓝' },
  { value: '#2E7D32', label: '翠绿' },
  { value: '#7B1FA2', label: '典雅紫' },
  { value: '#E65100', label: '活力橙' },
]

const isCustomAccent = computed(() => {
  return !accentColors.some(c => c.value === settings.value.appearance.accentColor)
})

function getFontStack(value: string): string {
  switch (value) {
    case 'serif': return "'Noto Serif SC', 'Source Han Serif SC', serif"
    case 'sans': return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    case 'kai': return "'KaiTi', 'STKaiti', serif"
    case 'mono': return "'JetBrains Mono', 'SF Mono', 'Consolas', monospace"
    default: return 'inherit'
  }
}

// ═══════════════════════════════════════
//  Tab 3: 导出
// ═══════════════════════════════════════

interface PlatformOption {
  value: 'wechat' | 'xiaohongshu' | 'zhihu'
  label: string
  desc: string
}

const platformOptions: PlatformOption[] = [
  { value: 'wechat', label: '微信公众号', desc: '适配公众号排版规则' },
  { value: 'xiaohongshu', label: '小红书', desc: '适配小红书图文风格' },
  { value: 'zhihu', label: '知乎', desc: '适配知乎专栏样式' },
]

interface PresetOption {
  value: string
  label: string
}

const presetOptions: PresetOption[] = [
  { value: 'thesis', label: '论文翻译' },
  { value: 'legal', label: '法学研讨' },
  { value: 'report', label: '行业研报' },
  { value: 'commentary', label: '时事点评' },
  { value: 'aigc', label: 'AIGC创意' },
  { value: 'code', label: '编程创造' },
  { value: 'notes', label: '学习笔记' },
  { value: 'news', label: '新闻' },
  { value: 'meme', label: '整活' },
  { value: 'life', label: '人生感悟' },
]

interface CodeThemeOption {
  value: string
  label: string
}

const codeThemeOptions: CodeThemeOption[] = [
  { value: 'atom-one-dark', label: 'Atom One Dark' },
  { value: 'atom-one-light', label: 'Atom One Light' },
  { value: 'github', label: 'GitHub' },
  { value: 'monokai', label: 'Monokai' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'vs2015', label: 'VS 2015' },
]

// ═══════════════════════════════════════
//  Tab 4: AI 服务
// ═══════════════════════════════════════

interface ProviderOption {
  value: 'openai' | 'anthropic' | 'deepseek' | 'ollama' | 'none'
  label: string
  desc: string
}

const providerOptions: ProviderOption[] = [
  { value: 'openai', label: 'OpenAI / 兼容', desc: 'GPT-4o / 硅基流动 / 兼容接口' },
  { value: 'anthropic', label: 'Anthropic', desc: 'Claude Opus / Sonnet' },
  { value: 'deepseek', label: 'DeepSeek', desc: '国产高性价比模型' },
  { value: 'ollama', label: 'Ollama', desc: '本地运行，完全离线' },
  { value: 'none', label: '禁用', desc: '不使用 AI 功能' },
]

const aiTestStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')
const aiTestMessage = ref('')
const showApiKey = ref(false)
const ollamaModels = ref<string[]>([])

/** 判断是否为硅基流动 */
const isSiliconFlow = computed(() =>
  settings.value.ai.provider === 'openai' &&
  (settings.value.ai.baseUrl || '').includes('siliconflow')
)

const modelOptions = computed<string[]>(() => {
  switch (settings.value.ai.provider) {
    case 'openai':
      // 硅基流动兼容 OpenAI 接口，显示专属模型列表
      if (isSiliconFlow.value) {
        return [
          'Qwen/Qwen3-8B',
          'Qwen/Qwen3-30B-A3B',
          'Qwen/Qwen2.5-72B-Instruct',
          'deepseek-ai/DeepSeek-V3',
          'deepseek-ai/DeepSeek-R1',
          'THUDM/GLM-4-9B-0414',
          'meta-llama/Llama-3.3-70B-Instruct',
          'Pro/Qwen/Qwen2.5-7B-Instruct',
        ]
      }
      return ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
    case 'anthropic':
      return ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5']
    case 'deepseek':
      return ['deepseek-chat', 'deepseek-reasoner']
    case 'ollama':
      return ollamaModels.value.length > 0
        ? ollamaModels.value
        : ['qwen2.5:7b', 'llama3.2:latest', 'mistral:latest']
    default:
      return []
  }
})

async function fetchOllamaModels(): Promise<void> {
  try {
    const response = await fetch(settings.value.ai.ollamaUrl + '/api/tags', {
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) {
      const data = await response.json()
      ollamaModels.value = (data.models || []).map((m: { name: string }) => m.name)
    }
  } catch {
    ollamaModels.value = []
  }
}

async function testAIConnection(): Promise<void> {
  aiTestStatus.value = 'testing'
  aiTestMessage.value = '正在测试连接...'

  try {
    const result = await aiStore.testConnection()
    aiTestStatus.value = result.success ? 'success' : 'error'
    aiTestMessage.value = result.message
  } catch (e) {
    aiTestStatus.value = 'error'
    aiTestMessage.value = `连接失败: ${e instanceof Error ? e.message : '未知错误'}`
  }
}

function handleProviderChange(): void {
  if (settings.value.ai.provider === 'ollama') {
    fetchOllamaModels()
  }
  // 重置测试状态
  aiTestStatus.value = 'idle'
  aiTestMessage.value = ''
}

// ═══════════════════════════════════════
//  Tab 5: 数据管理
// ═══════════════════════════════════════

const dataStats = computed(() => ({
  articleCount: articleStore.articles.length,
  assetCount: assetStore.assets.length,
  totalSize: assetStore.totalSize,
}))

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function handleExportSettings(): void {
  const json = settingsStore.exportSettings()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inkforge-settings-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleImportSettings(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const success = settingsStore.importSettings(text)
      if (success) {
        importFeedback.value = { type: 'success', text: '设置导入成功' }
      } else {
        importFeedback.value = { type: 'error', text: '设置文件格式不正确' }
      }
      clearFeedbackTimer()
    } catch {
      importFeedback.value = { type: 'error', text: '读取文件失败' }
      clearFeedbackTimer()
    }
  }
  input.click()
}

const importFeedback = ref<{ type: 'success' | 'error'; text: string } | null>(null)
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

function clearFeedbackTimer(): void {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    importFeedback.value = null
  }, 3000)
}

// 确认弹窗状态
interface ConfirmDialog {
  visible: boolean
  title: string
  message: string
  action: (() => void) | null
}

const confirmDialog = ref<ConfirmDialog>({
  visible: false,
  title: '',
  message: '',
  action: null,
})

function showConfirm(title: string, message: string, action: () => void): void {
  confirmDialog.value = { visible: true, title, message, action }
}

function confirmAction(): void {
  confirmDialog.value.action?.()
  confirmDialog.value.visible = false
}

function cancelConfirm(): void {
  confirmDialog.value.visible = false
}

function handleClearArticles(): void {
  showConfirm(
    '清除所有文章',
    '此操作将永久删除所有文章数据，不可恢复。确定要继续吗？',
    async () => {
      const ids = articleStore.articles.map(a => a.id)
      for (const id of ids) {
        await articleStore.deleteArticle(id)
      }
    }
  )
}

function handleClearAssets(): void {
  showConfirm(
    '清除所有素材',
    '此操作将永久删除所有素材文件，不可恢复。确定要继续吗？',
    async () => {
      const ids = assetStore.assets.map(a => a.id)
      for (const id of ids) {
        await assetStore.deleteAsset(id)
      }
    }
  )
}

function handleResetSettings(): void {
  showConfirm(
    '重置所有设置',
    '此操作将把所有设置恢复为默认值，不可撤销。确定要继续吗？',
    () => {
      settingsStore.reset()
    }
  )
}

// ═══════════════════════════════════════
//  Tab 6: 快捷键
// ═══════════════════════════════════════

const editingShortcut = ref<string | null>(null)
const shortcutConflict = ref<string | null>(null)

const shortcutLabels: Record<string, string> = {
  save: '保存',
  bold: '加粗',
  italic: '斜体',
  undo: '撤销',
  redo: '重做',
  outline: '大纲面板',
  focusMode: '专注模式',
}

function startEditShortcut(key: string): void {
  editingShortcut.value = key
  shortcutConflict.value = null
}

function handleShortcutKeydown(e: KeyboardEvent, key: string): void {
  e.preventDefault()
  e.stopPropagation()

  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')

  if (
    e.key !== 'Control' &&
    e.key !== 'Shift' &&
    e.key !== 'Alt' &&
    e.key !== 'Meta'
  ) {
    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
  }

  // Escape 取消编辑
  if (e.key === 'Escape') {
    editingShortcut.value = null
    shortcutConflict.value = null
    return
  }

  if (parts.length > 1 || (parts.length === 1 && parts[0].length > 1)) {
    const combo = parts.join('+')

    // 冲突检测
    const conflictKey = Object.entries(settings.value.shortcuts).find(
      ([k, v]) => k !== key && v === combo
    )

    if (conflictKey) {
      shortcutConflict.value = `与"${shortcutLabels[conflictKey[0]] || conflictKey[0]}"冲突`
      return
    }

    settings.value.shortcuts[key] = combo
    editingShortcut.value = null
    shortcutConflict.value = null
  }
}

function handleShortcutBlur(): void {
  editingShortcut.value = null
  shortcutConflict.value = null
}

function resetShortcuts(): void {
  settings.value.shortcuts = {
    save: 'Ctrl+S',
    bold: 'Ctrl+B',
    italic: 'Ctrl+I',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Shift+Z',
    outline: 'Ctrl+Shift+O',
    focusMode: 'F11',
  }
}

// ═══════════════════════════════════════
//  导航
// ═══════════════════════════════════════

function goBack(): void {
  router.back()
}

// ═══════════════════════════════════════
//  生命周期
// ═══════════════════════════════════════

// 监听 provider 切换，自动拉取 Ollama 模型列表
watch(() => settings.value.ai.provider, (newProvider) => {
  if (newProvider === 'ollama') {
    fetchOllamaModels()
  }
})

onMounted(() => {
  if (settings.value.ai.provider === 'ollama') {
    fetchOllamaModels()
  }
  // 初始化 asset store 数据
  assetStore.loadAssets()
})

onUnmounted(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer)
})
</script>

<template>
  <div class="settings-view">
    <!-- Header -->
    <header class="sv-header">
      <button class="sv-back-btn" @click="goBack" title="返回上一页">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>返回</span>
      </button>
      <h1 class="sv-header-title">设置</h1>
      <div class="sv-header-spacer" />
    </header>

    <!-- Body: Sidebar + Content -->
    <div class="sv-body">
      <!-- Sidebar Navigation -->
      <aside class="sv-sidebar">
        <nav class="sv-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="sv-nav-item"
            :class="{ active: currentTab === tab.id }"
            @click="currentTab = tab.id"
          >
            <!-- Palette / Appearance -->
            <svg v-if="tab.id === 'appearance'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
            </svg>
            <!-- Edit / Editor -->
            <svg v-else-if="tab.id === 'editor'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <!-- Share / Export -->
            <svg v-else-if="tab.id === 'export'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <!-- Sparkles / AI -->
            <svg v-else-if="tab.id === 'ai'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" /><path d="M3 5h4" />
              <path d="M19 17v4" /><path d="M17 19h4" />
            </svg>
            <!-- Database / Data -->
            <svg v-else-if="tab.id === 'data'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <!-- Keyboard / Shortcuts -->
            <svg v-else-if="tab.id === 'shortcuts'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
              <path d="M6 8h.001" /><path d="M10 8h.001" />
              <path d="M14 8h.001" /><path d="M18 8h.001" />
              <path d="M8 12h.001" /><path d="M12 12h.001" />
              <path d="M16 12h.001" /><path d="M7 16h10" />
            </svg>
            <!-- Info / About -->
            <svg v-else-if="tab.id === 'about'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{{ tab.name }}</span>
          </button>
        </nav>
      </aside>

      <!-- Content Area -->
      <main class="sv-content">
        <!-- ═════════════════════════════════════ -->
        <!--  Tab 1: 外观                         -->
        <!-- ═════════════════════════════════════ -->
        <section v-show="currentTab === 'appearance'" class="sv-tab">
          <h2 class="sv-tab-title">外观</h2>
          <p class="sv-tab-desc">自定义界面外观和视觉风格</p>

          <!-- 主题模式 -->
          <div class="sv-section">
            <h3 class="sv-section-title">主题模式</h3>
            <div class="sv-card-group">
              <label
                v-for="opt in themeOptions"
                :key="opt.value"
                class="sv-theme-card"
                :class="{ selected: settings.appearance.theme === opt.value }"
              >
                <input
                  type="radio"
                  :value="opt.value"
                  v-model="settings.appearance.theme"
                  class="sv-hidden-radio"
                >
                <div class="sv-theme-card-preview" :data-theme="opt.value">
                  <div class="sv-theme-preview-bar" />
                  <div class="sv-theme-preview-body">
                    <div class="sv-theme-preview-line" />
                    <div class="sv-theme-preview-line short" />
                  </div>
                </div>
                <div class="sv-theme-card-info">
                  <span class="sv-theme-card-label">{{ opt.label }}</span>
                  <span class="sv-theme-card-desc">{{ opt.desc }}</span>
                </div>
              </label>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 字体选择 -->
          <div class="sv-section">
            <h3 class="sv-section-title">预览字体</h3>
            <div class="sv-font-group">
              <label
                v-for="font in fontOptions"
                :key="font.value"
                class="sv-font-card"
                :class="{ selected: settings.appearance.fontFamily === font.value }"
              >
                <input
                  type="radio"
                  :value="font.value"
                  v-model="settings.appearance.fontFamily"
                  class="sv-hidden-radio"
                >
                <span class="sv-font-card-label">{{ font.label }}</span>
                <span class="sv-font-card-sample" :style="{ fontFamily: getFontStack(font.value) }">
                  {{ font.sample }}
                </span>
              </label>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 字体大小 -->
          <div class="sv-row">
            <div class="sv-row-info">
              <span class="sv-row-label">字体大小</span>
              <span class="sv-row-desc">编辑器与预览的基础字号</span>
            </div>
            <div class="sv-range-control">
              <input
                type="range"
                v-model.number="settings.appearance.fontSize"
                min="12" max="24" step="1"
                class="sv-range"
              >
              <span class="sv-range-value">{{ settings.appearance.fontSize }}px</span>
            </div>
          </div>

          <!-- 行高 -->
          <div class="sv-row">
            <div class="sv-row-info">
              <span class="sv-row-label">行高</span>
              <span class="sv-row-desc">正文内容的行距倍数</span>
            </div>
            <div class="sv-range-control">
              <input
                type="range"
                v-model.number="settings.appearance.lineHeight"
                min="1.4" max="2.4" step="0.1"
                class="sv-range"
              >
              <span class="sv-range-value">{{ settings.appearance.lineHeight.toFixed(1) }}</span>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 主题色 -->
          <div class="sv-section">
            <h3 class="sv-section-title">主题色</h3>
            <div class="sv-accent-row">
              <button
                v-for="color in accentColors"
                :key="color.value"
                class="sv-accent-swatch"
                :class="{ selected: settings.appearance.accentColor === color.value }"
                :style="{ '--swatch-color': color.value }"
                :title="color.label"
                @click="settings.appearance.accentColor = color.value"
              >
                <svg v-if="settings.appearance.accentColor === color.value" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <div class="sv-accent-custom" :class="{ active: isCustomAccent }">
                <input
                  type="color"
                  v-model="settings.appearance.accentColor"
                  class="sv-color-input"
                  title="自定义颜色"
                >
                <span class="sv-accent-custom-label">自定义</span>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 侧边栏宽度 -->
          <div class="sv-row">
            <div class="sv-row-info">
              <span class="sv-row-label">侧边栏宽度</span>
              <span class="sv-row-desc">工作站左侧面板宽度</span>
            </div>
            <div class="sv-range-control">
              <input
                type="range"
                v-model.number="settings.appearance.sidebarWidth"
                min="180" max="400" step="10"
                class="sv-range"
              >
              <span class="sv-range-value">{{ settings.appearance.sidebarWidth }}px</span>
            </div>
          </div>

          <!-- 减弱动效 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">减弱动效</span>
              <span class="sv-toggle-desc">减少界面动画和过渡效果</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.appearance.reducedMotion">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 2: 编辑器                       -->
        <!-- ═════════════════════════════════════ -->
        <section v-show="currentTab === 'editor'" class="sv-tab">
          <h2 class="sv-tab-title">编辑器</h2>
          <p class="sv-tab-desc">编辑器行为和功能设置</p>

          <!-- 自动保存 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">自动保存</span>
              <span class="sv-toggle-desc">定时自动保存编辑内容</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.editor.autoSave">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <!-- 保存间隔（仅自动保存开启时显示） -->
          <div v-if="settings.editor.autoSave" class="sv-row">
            <div class="sv-row-info">
              <span class="sv-row-label">保存间隔</span>
              <span class="sv-row-desc">自动保存的时间间隔</span>
            </div>
            <div class="sv-range-control">
              <input
                type="range"
                v-model.number="settings.editor.autoSaveInterval"
                min="10" max="300" step="10"
                class="sv-range"
              >
              <span class="sv-range-value">{{ settings.editor.autoSaveInterval }}s</span>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 拼写检查 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">拼写检查</span>
              <span class="sv-toggle-desc">启用浏览器原生拼写检查</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.editor.spellCheck">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <!-- 打字机模式 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">打字机模式</span>
              <span class="sv-toggle-desc">输入时保持光标始终在屏幕中央区域</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.editor.typewriterMode">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <!-- 智能标点 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">智能标点</span>
              <span class="sv-toggle-desc">自动转换中英文标点符号</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.editor.smartPunctuation">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <!-- 自动换行 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">自动换行</span>
              <span class="sv-toggle-desc">长文本自动换行显示</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.editor.wordWrap">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <div class="sv-divider" />

          <!-- Tab 大小 -->
          <div class="sv-row">
            <div class="sv-row-info">
              <span class="sv-row-label">Tab 宽度</span>
              <span class="sv-row-desc">缩进使用的空格数</span>
            </div>
            <div class="sv-tab-size-group">
              <button
                v-for="size in [2, 4, 8]"
                :key="size"
                class="sv-tab-size-btn"
                :class="{ selected: settings.editor.tabSize === size }"
                @click="settings.editor.tabSize = size"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 显示行号 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">显示行号</span>
              <span class="sv-toggle-desc">在编辑器左侧显示行号</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.editor.showLineNumbers">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <!-- 高亮当前行 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">高亮当前行</span>
              <span class="sv-toggle-desc">高亮显示光标所在行</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.editor.highlightActiveLine">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <!-- 括号匹配 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">括号匹配</span>
              <span class="sv-toggle-desc">自动高亮匹配的括号对</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.editor.bracketMatching">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 3: 导出                         -->
        <!-- ═════════════════════════════════════ -->
        <section v-show="currentTab === 'export'" class="sv-tab">
          <h2 class="sv-tab-title">导出</h2>
          <p class="sv-tab-desc">导出和发布相关的默认设置</p>

          <!-- 默认平台 -->
          <div class="sv-section">
            <h3 class="sv-section-title">默认导出平台</h3>
            <div class="sv-platform-group">
              <label
                v-for="p in platformOptions"
                :key="p.value"
                class="sv-platform-card"
                :class="{ selected: settings.export.defaultPlatform === p.value }"
              >
                <input
                  type="radio"
                  :value="p.value"
                  v-model="settings.export.defaultPlatform"
                  class="sv-hidden-radio"
                >
                <span class="sv-platform-label">{{ p.label }}</span>
                <span class="sv-platform-desc">{{ p.desc }}</span>
              </label>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 默认预设 -->
          <div class="sv-row">
            <div class="sv-row-info">
              <span class="sv-row-label">默认主题预设</span>
              <span class="sv-row-desc">新建导出时使用的预设方案</span>
            </div>
            <select v-model="settings.export.defaultPresetId" class="sv-select">
              <option v-for="opt in presetOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="sv-divider" />

          <!-- 代码块样式 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">Mac 风格代码块</span>
              <span class="sv-toggle-desc">为代码块添加红黄绿圆点装饰</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.export.macCodeBlock">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">代码行号</span>
              <span class="sv-toggle-desc">在代码块中显示行号</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.export.lineNumbers">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <div class="sv-divider" />

          <!-- 排版选项 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">外链转脚注</span>
              <span class="sv-toggle-desc">将外部链接转换为底部脚注引用</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.export.convertFootnotes">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">首行缩进</span>
              <span class="sv-toggle-desc">段落自动首行缩进两格</span>
            </div>
            <label class="sv-switch">
              <input type="checkbox" v-model="settings.export.textIndent">
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <div class="sv-divider" />

          <!-- 图片最大宽度 -->
          <div class="sv-row">
            <div class="sv-row-info">
              <span class="sv-row-label">图片最大宽度</span>
              <span class="sv-row-desc">导出时图片的最大显示宽度</span>
            </div>
            <div class="sv-range-control">
              <input
                type="range"
                v-model.number="settings.export.imageMaxWidth"
                min="320" max="1080" step="20"
                class="sv-range"
              >
              <span class="sv-range-value">{{ settings.export.imageMaxWidth }}px</span>
            </div>
          </div>

          <!-- 代码高亮主题 -->
          <div class="sv-row">
            <div class="sv-row-info">
              <span class="sv-row-label">代码高亮主题</span>
              <span class="sv-row-desc">代码块的语法高亮配色方案</span>
            </div>
            <select v-model="settings.export.codeTheme" class="sv-select">
              <option v-for="opt in codeThemeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 4: AI 服务                      -->
        <!-- ═════════════════════════════════════ -->
        <section v-show="currentTab === 'ai'" class="sv-tab">
          <h2 class="sv-tab-title">AI 服务</h2>
          <p class="sv-tab-desc">配置 AI 辅助写作功能</p>

          <!-- Provider 选择 -->
          <div class="sv-section">
            <h3 class="sv-section-title">服务提供商</h3>
            <div class="sv-provider-grid">
              <label
                v-for="prov in providerOptions"
                :key="prov.value"
                class="sv-provider-card"
                :class="{ selected: settings.ai.provider === prov.value, disabled: prov.value === 'none' }"
              >
                <input
                  type="radio"
                  :value="prov.value"
                  v-model="settings.ai.provider"
                  class="sv-hidden-radio"
                  @change="handleProviderChange"
                >
                <div class="sv-provider-icon">
                  <!-- OpenAI -->
                  <svg v-if="prov.value === 'openai'" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                  </svg>
                  <!-- Anthropic -->
                  <svg v-else-if="prov.value === 'anthropic'" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.604L16.742 20.48h-3.603L6.569 3.52zM0 20.48h3.604L7.173 9.42l-1.8-4.648L0 20.48z" />
                  </svg>
                  <!-- DeepSeek -->
                  <svg v-else-if="prov.value === 'deepseek'" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5v-3.07c-2.02-.46-3.39-1.56-3.97-2.67-.19-.36-.03-.79.35-.94.35-.13.73.03.89.36.44.92 1.58 1.73 2.73 2.05V9.88c-2.47-.55-4-1.82-4-3.88 0-2.19 1.78-3.64 4-4v-.5c0-.28.22-.5.5-.5s.5.22.5.5v.5c1.63.26 2.93 1.12 3.54 2.26.17.33.02.73-.33.87-.33.14-.71 0-.87-.31-.44-.81-1.38-1.42-2.34-1.68v3.13c2.59.58 4 1.88 4 3.95 0 2.28-1.71 3.74-4 4.06v.72c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-.69zM11 5.17c-1.33.31-2 1.15-2 2.01 0 .94.64 1.72 2 2.19V5.17zm2 8.7v4.01c1.39-.29 2-1.17 2-2.09 0-1-.63-1.56-2-1.92z" />
                  </svg>
                  <!-- Ollama -->
                  <svg v-else-if="prov.value === 'ollama'" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7zm-2 15v-1h4v1h-4zm3.5-5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM12 20a2 2 0 0 0 1.93-1.5h-3.86A2 2 0 0 0 12 20z" />
                  </svg>
                  <!-- None -->
                  <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </div>
                <span class="sv-provider-name">{{ prov.label }}</span>
                <span class="sv-provider-desc">{{ prov.desc }}</span>
              </label>
            </div>
          </div>

          <template v-if="settings.ai.provider !== 'none'">
            <div class="sv-divider" />

            <!-- Ollama URL -->
            <div v-if="settings.ai.provider === 'ollama'" class="sv-row sv-row-vertical">
              <div class="sv-row-info">
                <span class="sv-row-label">Ollama 服务地址</span>
                <span class="sv-row-desc">本地 Ollama 服务的 API 地址</span>
              </div>
              <input
                type="text"
                v-model="settings.ai.ollamaUrl"
                class="sv-input"
                placeholder="http://localhost:11434"
              >
            </div>

            <!-- API Key（非 Ollama） -->
            <div v-if="settings.ai.provider !== 'ollama'" class="sv-row sv-row-vertical">
              <div class="sv-row-info">
                <span class="sv-row-label">API Key</span>
                <span class="sv-row-desc">您的密钥仅存储在本地设备，不会上传到任何服务器</span>
              </div>
              <div class="sv-input-group">
                <input
                  :type="showApiKey ? 'text' : 'password'"
                  v-model="settings.ai.apiKey"
                  class="sv-input sv-input-with-btn"
                  placeholder="sk-..."
                >
                <button class="sv-input-addon" @click="showApiKey = !showApiKey" :title="showApiKey ? '隐藏' : '显示'">
                  <!-- Eye -->
                  <svg v-if="!showApiKey" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <!-- Eye Off -->
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Base URL（非 Ollama） -->
            <div v-if="settings.ai.provider !== 'ollama'" class="sv-row sv-row-vertical">
              <div class="sv-row-info">
                <span class="sv-row-label">自定义 Base URL</span>
                <span class="sv-row-desc">
                  {{ isSiliconFlow ? '当前已配置硅基流动 SiliconFlow API' : '留空使用官方默认地址，适合使用代理或自托管服务' }}
                </span>
              </div>
              <input
                type="text"
                v-model="settings.ai.baseUrl"
                class="sv-input"
                :placeholder="settings.ai.provider === 'openai' ? 'https://api.siliconflow.cn/v1' : '留空使用默认'"
              >
            </div>

            <div class="sv-divider" />

            <!-- 模型选择 -->
            <div class="sv-row">
              <div class="sv-row-info">
                <span class="sv-row-label">模型</span>
                <span class="sv-row-desc">选择使用的 AI 模型</span>
              </div>
              <select v-model="settings.ai.model" class="sv-select">
                <option v-for="model in modelOptions" :key="model" :value="model">
                  {{ model }}
                </option>
              </select>
            </div>

            <!-- Max Tokens -->
            <div class="sv-row">
              <div class="sv-row-info">
                <span class="sv-row-label">最大 Token 数</span>
                <span class="sv-row-desc">单次生成的最大 Token 数量</span>
              </div>
              <div class="sv-range-control">
                <input
                  type="range"
                  v-model.number="settings.ai.maxTokens"
                  min="100" max="8000" step="100"
                  class="sv-range"
                >
                <span class="sv-range-value">{{ settings.ai.maxTokens }}</span>
              </div>
            </div>

            <!-- Temperature -->
            <div class="sv-row">
              <div class="sv-row-info">
                <span class="sv-row-label">Temperature</span>
                <span class="sv-row-desc">值越高生成内容越随机，越低越确定</span>
              </div>
              <div class="sv-range-control">
                <input
                  type="range"
                  v-model.number="settings.ai.temperature"
                  min="0" max="2" step="0.1"
                  class="sv-range"
                >
                <span class="sv-range-value">{{ settings.ai.temperature.toFixed(1) }}</span>
              </div>
            </div>

            <div class="sv-divider" />

            <!-- 连接测试 -->
            <div class="sv-section">
              <button
                class="sv-test-btn"
                :class="{ testing: aiTestStatus === 'testing' }"
                :disabled="aiTestStatus === 'testing'"
                @click="testAIConnection"
              >
                <svg v-if="aiTestStatus === 'testing'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sv-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                {{ aiTestStatus === 'testing' ? '测试中...' : '测试连接' }}
              </button>
              <div
                v-if="aiTestMessage"
                class="sv-test-result"
                :class="aiTestStatus"
              >
                {{ aiTestMessage }}
              </div>
            </div>
          </template>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 5: 数据                         -->
        <!-- ═════════════════════════════════════ -->
        <section v-show="currentTab === 'data'" class="sv-tab">
          <h2 class="sv-tab-title">数据管理</h2>
          <p class="sv-tab-desc">管理应用数据、备份和重置</p>

          <!-- 设置导入导出 -->
          <div class="sv-section">
            <h3 class="sv-section-title">设置数据</h3>
            <div class="sv-btn-group">
              <button class="sv-action-btn" @click="handleExportSettings">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                导出设置
              </button>
              <button class="sv-action-btn" @click="handleImportSettings">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                导入设置
              </button>
            </div>
            <div
              v-if="importFeedback"
              class="sv-feedback"
              :class="importFeedback.type"
            >
              {{ importFeedback.text }}
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 数据统计 -->
          <div class="sv-section">
            <h3 class="sv-section-title">数据统计</h3>
            <div class="sv-stats-grid">
              <div class="sv-stat-card">
                <span class="sv-stat-value">{{ dataStats.articleCount }}</span>
                <span class="sv-stat-label">文章</span>
              </div>
              <div class="sv-stat-card">
                <span class="sv-stat-value">{{ dataStats.assetCount }}</span>
                <span class="sv-stat-label">素材</span>
              </div>
              <div class="sv-stat-card">
                <span class="sv-stat-value">{{ formatBytes(dataStats.totalSize) }}</span>
                <span class="sv-stat-label">存储空间</span>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 危险操作 -->
          <div class="sv-section">
            <h3 class="sv-section-title sv-danger-title">危险区域</h3>
            <p class="sv-danger-desc">以下操作不可恢复，请谨慎操作</p>
            <div class="sv-danger-actions">
              <div class="sv-danger-row">
                <div class="sv-danger-row-info">
                  <span class="sv-danger-row-label">清除所有文章</span>
                  <span class="sv-danger-row-desc">永久删除所有文章及其编辑内容</span>
                </div>
                <button class="sv-danger-btn" @click="handleClearArticles">清除</button>
              </div>
              <div class="sv-danger-row">
                <div class="sv-danger-row-info">
                  <span class="sv-danger-row-label">清除所有素材</span>
                  <span class="sv-danger-row-desc">永久删除所有上传的图片和文件</span>
                </div>
                <button class="sv-danger-btn" @click="handleClearAssets">清除</button>
              </div>
              <div class="sv-danger-row">
                <div class="sv-danger-row-info">
                  <span class="sv-danger-row-label">重置所有设置</span>
                  <span class="sv-danger-row-desc">将所有设置恢复为默认值</span>
                </div>
                <button class="sv-danger-btn" @click="handleResetSettings">重置</button>
              </div>
            </div>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 6: 快捷键                       -->
        <!-- ═════════════════════════════════════ -->
        <section v-show="currentTab === 'shortcuts'" class="sv-tab">
          <h2 class="sv-tab-title">快捷键</h2>
          <p class="sv-tab-desc">自定义键盘快捷键映射</p>

          <div class="sv-shortcuts-table">
            <div class="sv-shortcuts-header">
              <span class="sv-shortcuts-col-name">操作</span>
              <span class="sv-shortcuts-col-key">快捷键</span>
              <span class="sv-shortcuts-col-action">编辑</span>
            </div>
            <div
              v-for="(value, key) in settings.shortcuts"
              :key="key"
              class="sv-shortcut-row"
              :class="{ editing: editingShortcut === key }"
            >
              <span class="sv-shortcuts-col-name">{{ shortcutLabels[key as string] || key }}</span>
              <div
                class="sv-shortcut-key"
                :class="{ recording: editingShortcut === key }"
                tabindex="0"
                @keydown="editingShortcut === key && handleShortcutKeydown($event, key as string)"
                @blur="handleShortcutBlur"
              >
                <template v-if="editingShortcut === key">
                  <span class="sv-shortcut-recording-text">按下新的快捷键...</span>
                </template>
                <template v-else>
                  <kbd v-for="(part, i) in (value as string).split('+')" :key="i" class="sv-kbd">{{ part }}</kbd>
                </template>
              </div>
              <button
                class="sv-shortcut-edit-btn"
                :class="{ active: editingShortcut === key }"
                @click="editingShortcut === key ? (editingShortcut = null) : startEditShortcut(key as string)"
              >
                <svg v-if="editingShortcut !== key" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <!-- 冲突提示 -->
          <div v-if="shortcutConflict" class="sv-shortcut-conflict">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {{ shortcutConflict }}
          </div>

          <div class="sv-shortcuts-footer">
            <button class="sv-action-btn sv-action-btn-sm" @click="resetShortcuts">
              恢复默认快捷键
            </button>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 7: 关于                         -->
        <!-- ═════════════════════════════════════ -->
        <section v-show="currentTab === 'about'" class="sv-tab">
          <h2 class="sv-tab-title">关于</h2>
          <p class="sv-tab-desc">应用信息与致谢</p>

          <!-- Logo Card -->
          <div class="sv-about-hero">
            <div class="sv-about-logo">
              <span class="sv-about-logo-text">IF</span>
            </div>
            <div class="sv-about-hero-info">
              <h3 class="sv-about-name">InkForge Studio</h3>
              <span class="sv-about-version">v0.1.0-alpha</span>
              <p class="sv-about-slogan">专为内容创作者打造的下一代写作工作站</p>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 技术栈 -->
          <div class="sv-section">
            <h3 class="sv-section-title">技术栈</h3>
            <div class="sv-tech-grid">
              <span class="sv-tech-badge">Vue 3</span>
              <span class="sv-tech-badge">TypeScript</span>
              <span class="sv-tech-badge">TipTap</span>
              <span class="sv-tech-badge">Pinia</span>
              <span class="sv-tech-badge">Dexie.js</span>
              <span class="sv-tech-badge">Tauri</span>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 致谢 -->
          <div class="sv-section">
            <h3 class="sv-section-title">致谢</h3>
            <div class="sv-credits">
              <div class="sv-credit-item">
                <span class="sv-credit-name">doocs/md</span>
                <span class="sv-credit-desc">Markdown 编辑器灵感来源</span>
              </div>
              <div class="sv-credit-item">
                <span class="sv-credit-name">TipTap</span>
                <span class="sv-credit-desc">富文本编辑框架</span>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 开源协议 -->
          <div class="sv-section">
            <h3 class="sv-section-title">开源协议</h3>
            <p class="sv-license-text">MIT License</p>
            <p class="sv-license-desc">
              本项目基于 MIT 协议开源，允许自由使用、修改和分发。
            </p>
          </div>
        </section>
      </main>
    </div>

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <div v-if="confirmDialog.visible" class="sv-overlay" @click.self="cancelConfirm">
        <div class="sv-confirm-dialog">
          <h3 class="sv-confirm-title">{{ confirmDialog.title }}</h3>
          <p class="sv-confirm-message">{{ confirmDialog.message }}</p>
          <div class="sv-confirm-actions">
            <button class="sv-confirm-cancel" @click="cancelConfirm">取消</button>
            <button class="sv-confirm-ok" @click="confirmAction">确认</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════
   Settings View - Ethereal Constructivism Design
   ═══════════════════════════════════════════════════════ */

.settings-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-rice-paper);
}

/* ─── Header ─── */
.sv-header {
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 32px;
  gap: 16px;
  flex-shrink: 0;
}

.sv-back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.sv-back-btn span {
  display: none;
}

.sv-back-btn:hover {
  background: var(--accent-primary-light, #FFEBEE);
  border-color: var(--accent-primary, #D32F2F);
  color: var(--accent-primary, #D32F2F);
}

.sv-header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.sv-header-spacer {
  display: none;
}

/* ─── Body Layout ─── */
.sv-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  padding: 32px;
  gap: 32px;
}

/* ─── Sidebar ─── */
.sv-sidebar {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 32px;
  align-self: flex-start;
}

.sv-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-surface, #FFFFFF);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.sv-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 6px;
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #607D8B);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.sv-nav-item:hover {
  background: #F5F5F5;
  color: var(--text-primary, #263238);
}

.sv-nav-item.active {
  background: var(--accent-primary-light, #FFEBEE);
  color: var(--accent-primary, #D32F2F);
  border-left-color: var(--accent-primary, #D32F2F);
}

/* ─── Content ─── */
.sv-content {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}

.sv-tab {
  max-width: 100%;
  background: var(--bg-surface, #FFFFFF);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.sv-tab-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #263238);
  margin-bottom: 4px;
}

.sv-tab-desc {
  font-size: 12px;
  color: var(--text-secondary, #607D8B);
  margin-bottom: 20px;
}

/* ─── Section ─── */
.sv-section {
  margin-bottom: 16px;
}

.sv-section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #263238);
  margin-bottom: 16px;
}

.sv-divider {
  height: 1px;
  background: #F5F5F5;
  margin: 20px 0;
}

/* ─── Row (label+control) ─── */
.sv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #F5F5F5;
}

.sv-row:last-child {
  border-bottom: none;
}

.sv-row-vertical {
  flex-direction: column;
  align-items: stretch;
}

.sv-row-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sv-row-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #263238);
}

.sv-row-desc {
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
}

/* ─── Toggle Row ─── */
.sv-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #F5F5F5;
  background: transparent;
  border-left: none;
  border-right: none;
  border-top: none;
  border-radius: 0;
  margin-bottom: 0;
}

.sv-toggle-row:last-child,
.sv-toggle-row:last-of-type {
  border-bottom: none;
}

.sv-toggle-row:hover {
  /* no border change in flat row style */
}

.sv-toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sv-toggle-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #263238);
}

.sv-toggle-desc {
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
}

/* ─── Switch ─── */
.sv-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;
}

.sv-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.sv-switch-track {
  position: absolute;
  inset: 0;
  background: #E0E0E0;
  border-radius: 10px;
  transition: background 0.2s;
}

.sv-switch-thumb {
  position: absolute;
  width: 16px;
  height: 16px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.sv-switch input:checked + .sv-switch-track {
  background: var(--accent-primary, #D32F2F);
}

.sv-switch input:checked + .sv-switch-track .sv-switch-thumb {
  transform: translateX(20px);
}

/* ─── Range ─── */
.sv-range-control {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.sv-range {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #F5F5F5;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
}

.sv-range::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent-primary, #D32F2F);
  border: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  box-shadow: 0 1px 4px rgba(211, 47, 47, 0.3);
  transition: transform 0.15s;
}

.sv-range::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.sv-range-value {
  min-width: 40px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #263238);
  text-align: right;
  font-family: var(--font-mono);
}

/* ─── Select ─── */
.sv-select {
  min-width: 180px;
  height: 36px;
  padding: 0 12px;
  background: var(--bg-surface, #FFFFFF);
  border: 1px solid #ECEFF1;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary, #263238);
  cursor: pointer;
  transition: border-color 0.15s;
  outline: none;
}

.sv-select:focus {
  border-color: var(--accent-primary, #D32F2F);
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.08);
}

/* ─── Input ─── */
.sv-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  background: var(--bg-surface, #FFFFFF);
  border: 1px solid #ECEFF1;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary, #263238);
  outline: none;
  transition: border-color 0.15s;
}

.sv-input:focus {
  border-color: var(--accent-primary, #D32F2F);
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.08);
}

.sv-input-group {
  position: relative;
  display: flex;
}

.sv-input-with-btn {
  padding-right: 40px;
}

.sv-input-addon {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-small);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.sv-input-addon:hover {
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
}

.sv-hidden-radio {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* ═══ Tab 1: Appearance Specifics ═══ */

/* Theme Cards */
.sv-card-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.sv-theme-card {
  display: flex;
  flex-direction: column;
  border: 2px solid #ECEFF1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  padding: 20px;
  text-align: center;
  transition: all 0.15s;
}

.sv-theme-card:hover {
  border-color: var(--text-muted, #90A4AE);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.sv-theme-card.selected {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, #FFEBEE);
}

.sv-theme-card-preview {
  height: 64px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sv-theme-card-preview[data-theme="light"] {
  background: #FAFBFC;
}

.sv-theme-card-preview[data-theme="dark"] {
  background: #1E1E2E;
}

.sv-theme-card-preview[data-theme="system"] {
  background: linear-gradient(135deg, #FAFBFC 50%, #1E1E2E 50%);
}

.sv-theme-preview-bar {
  height: 6px;
  width: 60%;
  border-radius: 3px;
}

.sv-theme-card-preview[data-theme="light"] .sv-theme-preview-bar {
  background: #E0E0E0;
}

.sv-theme-card-preview[data-theme="dark"] .sv-theme-preview-bar {
  background: #3A3A4A;
}

.sv-theme-card-preview[data-theme="system"] .sv-theme-preview-bar {
  background: linear-gradient(90deg, #E0E0E0 50%, #3A3A4A 50%);
}

.sv-theme-preview-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-content: center;
}

.sv-theme-preview-line {
  height: 4px;
  width: 80%;
  border-radius: 2px;
}

.sv-theme-preview-line.short {
  width: 50%;
}

.sv-theme-card-preview[data-theme="light"] .sv-theme-preview-line {
  background: #E8E8E8;
}

.sv-theme-card-preview[data-theme="dark"] .sv-theme-preview-line {
  background: #2C2C3C;
}

.sv-theme-card-preview[data-theme="system"] .sv-theme-preview-line {
  background: linear-gradient(90deg, #E8E8E8 50%, #2C2C3C 50%);
}

.sv-theme-card-info {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sv-theme-card-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.sv-theme-card-desc {
  font-size: 11px;
  color: var(--text-muted);
}

/* Font Cards */
.sv-font-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-small);
}

.sv-font-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: var(--radius-medium);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-smooth);
}

.sv-font-card:hover {
  border-color: var(--text-muted);
}

.sv-font-card.selected {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
}

.sv-font-card-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.sv-font-card-sample {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Accent Color */
.sv-accent-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sv-accent-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--swatch-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
}

.sv-accent-swatch:hover {
  transform: scale(1.15);
}

.sv-accent-swatch.selected {
  box-shadow: 0 0 0 3px var(--swatch-color);
}

.sv-accent-custom {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  border: 2px solid var(--border);
  border-radius: var(--radius-round);
  transition: border-color var(--duration-fast);
}

.sv-accent-custom.active {
  border-color: var(--accent-primary);
}

.sv-color-input {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  background: transparent;
}

.sv-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.sv-color-input::-webkit-color-swatch {
  border: none;
  border-radius: 50%;
}

.sv-accent-custom-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

/* ═══ Tab 3: Export - Platform Cards ═══ */

.sv-platform-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.sv-platform-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px 12px;
  border: 2px solid #ECEFF1;
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}

.sv-platform-card:hover {
  border-color: var(--text-muted, #90A4AE);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.sv-platform-card.selected {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, #FFEBEE);
}

.sv-platform-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.sv-platform-desc {
  font-size: 11px;
  color: var(--text-muted);
}

/* ═══ Tab 4: AI - Provider Grid ═══ */

.sv-provider-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.sv-provider-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px 12px;
  border: 2px solid #ECEFF1;
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}

.sv-provider-card:hover {
  border-color: var(--text-muted, #90A4AE);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.sv-provider-card.selected {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, #FFEBEE);
}

.sv-provider-card.disabled.selected {
  border-color: var(--text-muted, #90A4AE);
  background: #F5F5F5;
}

.sv-provider-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.sv-provider-card.selected .sv-provider-icon {
  color: var(--accent-primary);
}

.sv-provider-card.disabled.selected .sv-provider-icon {
  color: var(--text-muted);
}

.sv-provider-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.sv-provider-desc {
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.3;
}

/* AI Test */
.sv-test-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--accent-primary, #D32F2F);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.sv-test-btn:hover:not(:disabled) {
  background: var(--accent-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.25);
}

.sv-test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sv-spin {
  animation: sv-spin 1s linear infinite;
}

@keyframes sv-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sv-test-result {
  margin-top: var(--space-small);
  padding: 10px 14px;
  border-radius: var(--radius-medium);
  font-size: 13px;
  font-weight: 500;
}

.sv-test-result.success {
  background: var(--success-light);
  color: var(--success);
}

.sv-test-result.error {
  background: var(--error-light);
  color: var(--error);
}

.sv-test-result.testing {
  background: var(--warning-light);
  color: var(--warning);
}

/* ═══ Tab 5: Data ═══ */

.sv-btn-group {
  display: flex;
  gap: 10px;
}

.sv-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #ECEFF1;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #37474F;
  cursor: pointer;
  transition: all 0.15s;
}

.sv-action-btn:hover {
  background: #FAFBFC;
  border-color: var(--accent-primary, #D32F2F);
  color: var(--accent-primary, #D32F2F);
}

.sv-action-btn-sm {
  padding: 8px 16px;
  font-size: 12px;
}

.sv-feedback {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.sv-feedback.success {
  background: var(--success-light);
  color: var(--success);
}

.sv-feedback.error {
  background: var(--error-light);
  color: var(--error);
}

/* Stats */
.sv-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.sv-stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  background: #FAFBFC;
  border: 1px solid #ECEFF1;
  border-radius: 12px;
}

.sv-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary, #263238);
  font-family: var(--font-mono);
}

.sv-stat-label {
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
  font-weight: 500;
}

/* Danger Zone */
.sv-danger-title {
  color: var(--accent-primary, #D32F2F);
}

.sv-danger-desc {
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
  margin-bottom: 16px;
}

.sv-danger-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sv-danger-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border: 1px solid #FFCDD2;
  border-radius: 6px;
}

.sv-danger-row-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sv-danger-row-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #263238);
}

.sv-danger-row-desc {
  font-size: 11px;
  color: var(--text-muted, #90A4AE);
}

.sv-danger-btn {
  padding: 8px 20px;
  background: transparent;
  border: 1px solid var(--accent-primary, #D32F2F);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-primary, #D32F2F);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.sv-danger-btn:hover {
  background: var(--accent-primary, #D32F2F);
  color: white;
}

/* ═══ Tab 6: Shortcuts ═══ */

.sv-shortcuts-table {
  width: 100%;
  border: 1px solid #ECEFF1;
  border-radius: 12px;
  overflow: hidden;
  border-collapse: collapse;
}

.sv-shortcuts-header {
  display: grid;
  grid-template-columns: 1fr 200px 60px;
  padding: 8px 16px;
  background: #FAFBFC;
  border-bottom: 1px solid #ECEFF1;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #90A4AE);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.sv-shortcut-row {
  display: grid;
  grid-template-columns: 1fr 200px 60px;
  padding: 12px 16px;
  align-items: center;
  border-bottom: 1px solid #F5F5F5;
  transition: background 0.15s;
}

.sv-shortcut-row:last-child {
  border-bottom: none;
}

.sv-shortcut-row:hover {
  background: #FAFBFC;
}

.sv-shortcut-row.editing {
  background: var(--accent-primary-light, #FFEBEE);
}

.sv-shortcuts-col-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.sv-shortcut-key {
  display: flex;
  align-items: center;
  gap: 4px;
  outline: none;
  padding: 4px 0;
  cursor: pointer;
  border-radius: var(--radius-small);
}

.sv-shortcut-key.recording {
  padding: 4px 8px;
  background: var(--accent-primary-light);
  border-radius: var(--radius-medium);
  animation: sv-pulse-border 1s infinite;
}

@keyframes sv-pulse-border {
  0%, 100% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.4); }
  50% { box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.1); }
}

.sv-shortcut-recording-text {
  font-size: 12px;
  color: var(--accent-primary);
  font-weight: 500;
}

.sv-kbd {
  display: inline-block;
  padding: 3px 8px;
  background: #F5F5F5;
  border: 1px solid #ECEFF1;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #607D8B);
  line-height: 1.6;
  box-shadow: 0 1px 0 #ECEFF1;
}

.sv-shortcut-edit-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-medium);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--duration-fast);
  justify-self: center;
}

.sv-shortcut-edit-btn:hover {
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
}

.sv-shortcut-edit-btn.active {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.sv-shortcut-conflict {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: var(--space-medium);
  padding: 10px 14px;
  background: var(--warning-light);
  color: var(--warning);
  border-radius: var(--radius-medium);
  font-size: 12px;
  font-weight: 500;
}

.sv-shortcuts-footer {
  margin-top: var(--space-medium);
  display: flex;
  justify-content: flex-end;
}

/* ═══ Tab 2: Editor - Tab Size ═══ */

.sv-tab-size-group {
  display: flex;
  gap: 4px;
  background: var(--bg-rice-paper);
  border-radius: var(--radius-medium);
  padding: 3px;
}

.sv-tab-size-btn {
  padding: 6px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-smooth);
}

.sv-tab-size-btn:hover {
  color: var(--text-primary);
}

.sv-tab-size-btn.selected {
  background: var(--bg-surface);
  color: var(--accent-primary);
  box-shadow: var(--shadow-soft);
}

/* ═══ Tab 7: About ═══ */

.sv-about-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px;
  gap: 16px;
  margin-bottom: 20px;
}

.sv-about-logo {
  width: 48px;
  height: 48px;
  background: var(--accent-primary, #D32F2F);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sv-about-logo-text {
  color: white;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: -1px;
}

.sv-about-hero-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.sv-about-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #263238);
}

.sv-about-version {
  display: inline-block;
  padding: 2px 10px;
  background: #F5F5F5;
  border-radius: 20px;
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted, #90A4AE);
  width: fit-content;
}

.sv-about-slogan {
  font-size: 13px;
  color: var(--text-secondary, #607D8B);
  margin-top: 4px;
}

.sv-tech-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sv-tech-badge {
  padding: 6px 14px;
  background: #FAFBFC;
  border: 1px solid #ECEFF1;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #607D8B);
  transition: all 0.15s;
}

.sv-tech-badge:hover {
  border-color: var(--accent-primary, #D32F2F);
  color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, #FFEBEE);
}

.sv-credits {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sv-credit-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 14px;
  background: #FAFBFC;
  border: 1px solid #ECEFF1;
  border-radius: 6px;
}

.sv-credit-name {
  font-size: 13px;
  font-weight: 600;
  color: #1565C0;
}

.sv-credit-desc {
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
}

.sv-license-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.sv-license-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ═══ Confirm Dialog ═══ */

.sv-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: sv-fade-in 0.15s ease;
}

@keyframes sv-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sv-confirm-dialog {
  width: 400px;
  max-width: 90vw;
  background: var(--bg-surface);
  border-radius: var(--radius-xlarge);
  padding: var(--space-large);
  box-shadow: var(--shadow-elevated);
  animation: sv-scale-in 0.2s var(--ease-bounce);
}

@keyframes sv-scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.sv-confirm-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--error);
  margin-bottom: var(--space-small);
}

.sv-confirm-message {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: var(--space-large);
}

.sv-confirm-actions {
  display: flex;
  gap: var(--space-small);
  justify-content: flex-end;
}

.sv-confirm-cancel {
  padding: 8px 20px;
  background: var(--bg-rice-paper);
  border: 1px solid var(--border);
  border-radius: var(--radius-medium);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.sv-confirm-cancel:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.sv-confirm-ok {
  padding: 8px 20px;
  background: var(--error);
  border: none;
  border-radius: var(--radius-medium);
  font-size: 13px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.sv-confirm-ok:hover {
  background: var(--accent-primary-dark);
  transform: translateY(-1px);
}
</style>
