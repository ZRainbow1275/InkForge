<script setup lang="ts">
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Cloud,
  Command,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  Image,
  Info,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-vue-next'
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
  type Component,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import { useFeatureFlag } from '@/composables/useFeatureFlag'
import { assertPasswordValid, PASSWORD_POLICY } from '@/config/security'
import { themePresets } from '@/services/export/themes'
import { logger, getLogLevel, setLogLevel, type LoggerLevel } from '@/services/error'
import { describeProxyConfig, getProxyRuntimeConfig } from '@/services/http-proxy'
import { useAccountStore } from '@/stores/account'
import { useAIStore } from '@/stores/ai'
import { useArticleStore } from '@/stores/article'
import { useCategoryStore } from '@/stores/category'
import { useEditorStore } from '@/stores/editor'
import { DEFAULT_SHORTCUTS, getDefaultSettings, useSettingsStore, type Settings, type SyncTarget } from '@/stores/settings'
import { useSyncStore } from '@/stores/sync'
import {
  exportMasterKey,
  getMasterKey,
  importMasterKey,
  unlockWithPassword,
} from '@/utils/crypto/key-management'
import type { ExportedKeyBundle } from '@/utils/crypto/types'
import {
  db,
  deleteSettingsProfile,
  getDatabaseSize,
  getSettingsProfiles,
  getSyncLogs,
  saveSettingsProfile,
  type DatabaseSizeResult,
  type SettingsProfile,
  type SyncLog,
} from '@/utils/db'

type TabId =
  | 'account'
  | 'appearance'
  | 'editor'
  | 'export'
  | 'ai'
  | 'data'
  | 'sync'
  | 'shortcuts'
  | 'advanced'
  | 'about'

type NoticeTone = 'success' | 'error' | 'info'
type SyncTargetType = Settings['sync']['target']['type']
type MasterKeyDialogMode = 'unlock' | 'export' | 'import'

interface TabDefinition {
  id: TabId
  label: string
  description: string
  icon: Component
}

interface TabResetDefinition {
  category: keyof Settings | 'all'
  label: string
  successMessage: string
}

interface SearchableSettingItem {
  tabId: TabId
  sectionTitle: string
  label: string
  description: string
  anchorId: string
  keywords: string[]
}

interface OllamaTagsResponse {
  models?: Array<{
    name?: string
  }>
}

interface ImportSummaryState {
  success: number
  failed: number
  errors: string[]
}

interface NoticeState {
  tone: NoticeTone
  text: string
}

interface SerializedDate {
  __type: 'date'
  value: string
}

interface SerializedBlob {
  __type: 'blob'
  mimeType: string
  data: string
}

interface DatabaseSnapshot {
  version: number
  exportedAt: string
  tables: Record<string, Array<Record<string, unknown>>>
}

const APP_VERSION = '0.1.0'
const DESIGN_LANGUAGE = 'Ethereal Constructivism'
const TECH_STACK = [
  'Vue 3',
  'Pinia',
  'TipTap',
  'Dexie',
  'Tailwind CSS',
  'Tauri',
  'TypeScript',
  'Zod',
]
const DATABASE_TABLES = [
  'categories',
  'articles',
  'contents',
  'documents',
  'versions',
  'assets',
  'accounts',
  'pending_changes',
  'sync_logs',
  'settings_profiles',
  'activity_logs',
] as const
const SYNC_INTERVAL_MAP: Record<Settings['sync']['interval'], number> = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  manual: 0,
}
const ProfileNameSchema = z.string().trim().min(1).max(100)
const MasterKeyPasswordSchema = z.string().trim().superRefine((value, context) => {
  try {
    assertPasswordValid(value)
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : '密码不符合安全策略',
    })
  }
})
const RecoveryBundleTextSchema = z.string().trim().min(1, '恢复密钥包不能为空')
const ExportedKeyBundleSchema = z.object({
  version: z.number().int().min(1),
  encryptedKey: z.string().min(1),
  iv: z.string().min(1),
  salt: z.string().min(1),
  createdAt: z.string().min(1),
  checksum: z.string().min(1),
})
const DatabaseSnapshotSchema = z.object({
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
})

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const accountStore = useAccountStore()
const aiStore = useAIStore()
const articleStore = useArticleStore()
const categoryStore = useCategoryStore()
const editorStore = useEditorStore()
const syncStore = useSyncStore()
const performanceFlag = useFeatureFlag('performance-metrics')

const tabs: TabDefinition[] = [
  { id: 'account', label: '账户', description: '本地资料与数据归属', icon: Shield },
  { id: 'appearance', label: '外观', description: '主题、字体与界面节奏', icon: Palette },
  { id: 'editor', label: '编辑器', description: '写作体验与辅助能力', icon: BookOpen },
  { id: 'export', label: '导出', description: '默认平台与主题预设', icon: Download },
  { id: 'ai', label: 'AI 服务', description: 'Provider、模型与连接测试', icon: Sparkles },
  { id: 'data', label: '数据', description: '导入导出、备份与清理', icon: Database },
  { id: 'sync', label: '同步', description: '同步目标、冲突与历史', icon: Cloud },
  { id: 'shortcuts', label: '快捷键', description: '工作台热键映射', icon: Command },
  { id: 'advanced', label: '高级', description: '实验特性、代理与档案', icon: Settings2 },
  { id: 'about', label: '关于', description: '版本、架构与运行概览', icon: Info },
]

const tabResetDefinitions: Record<TabId, TabResetDefinition> = {
  account: { category: 'account', label: '重置账户设置', successMessage: '账户设置已恢复默认值' },
  appearance: { category: 'appearance', label: '重置外观设置', successMessage: '外观设置已恢复默认值' },
  editor: { category: 'editor', label: '重置编辑器设置', successMessage: '编辑器设置已恢复默认值' },
  export: { category: 'export', label: '重置导出设置', successMessage: '导出设置已恢复默认值' },
  ai: { category: 'ai', label: '重置 AI 设置', successMessage: 'AI 设置已恢复默认值' },
  data: { category: 'data', label: '重置数据设置', successMessage: '数据设置已恢复默认值' },
  sync: { category: 'sync', label: '重置同步设置', successMessage: '同步设置已恢复默认值' },
  shortcuts: { category: 'shortcuts', label: '重置快捷键设置', successMessage: '快捷键设置已恢复默认值' },
  advanced: { category: 'advanced', label: '重置高级设置', successMessage: '高级设置已恢复默认值' },
  about: { category: 'all', label: '重置全部设置', successMessage: '全部设置已恢复默认值' },
}

function isTabId(value: unknown): value is TabId {
  return typeof value === 'string' && tabs.some((tab) => tab.id === value)
}

const searchableItems: SearchableSettingItem[] = [
  {
    tabId: 'account',
    sectionTitle: '账户资料',
    label: '资料编辑',
    description: '修改本地账户名称、邮箱、简介与头像',
    anchorId: 'account-profile',
    keywords: ['account', 'profile', 'avatar', 'bio', 'email'],
  },
  {
    tabId: 'account',
    sectionTitle: '账户归档',
    label: '账户数据导出',
    description: '导出当前账户与关联数据',
    anchorId: 'account-export',
    keywords: ['export', 'gdpr', 'account data'],
  },
  {
    tabId: 'account',
    sectionTitle: '账户安全',
    label: '本地安全提示',
    description: '查看密码策略与同步主密钥入口',
    anchorId: 'account-security',
    keywords: ['security', 'password', 'master key', 'account security'],
  },
  {
    tabId: 'account',
    sectionTitle: '账户切换',
    label: '切换与创建本地账户',
    description: '在多个本地身份之间切换并创建新账户',
    anchorId: 'account-switching',
    keywords: ['account switch', 'profiles', 'create account', 'local account'],
  },
  {
    tabId: 'appearance',
    sectionTitle: '界面主题',
    label: '主题与主色',
    description: '切换 light、dark、system 与品牌主色',
    anchorId: 'appearance-theme',
    keywords: ['theme', 'accent', 'color'],
  },
  {
    tabId: 'appearance',
    sectionTitle: '排版',
    label: '字体与边栏宽度',
    description: '控制全局字体、字号、行高和侧栏宽度',
    anchorId: 'appearance-typography',
    keywords: ['font', 'sidebar', 'line height', 'typography'],
  },
  {
    tabId: 'editor',
    sectionTitle: '写作体验',
    label: '自动保存与拼写检查',
    description: '控制自动保存、拼写检查、换行与制表宽度',
    anchorId: 'editor-writing',
    keywords: ['autosave', 'spellcheck', 'wrap', 'tab'],
  },
  {
    tabId: 'editor',
    sectionTitle: '增强能力',
    label: 'Markdown 提示与写作目标',
    description: '控制 hints、括号匹配和写作目标进度条',
    anchorId: 'editor-enhancement',
    keywords: ['markdown hints', 'writing goal', 'bracket'],
  },
  {
    tabId: 'export',
    sectionTitle: '导出平台',
    label: '默认平台',
    description: '为发布与导出选择默认平台',
    anchorId: 'export-platform',
    keywords: ['wechat', 'zhihu', 'xiaohongshu'],
  },
  {
    tabId: 'export',
    sectionTitle: '主题市场',
    label: '导出主题模板',
    description: '选择默认的主题预设',
    anchorId: 'export-presets',
    keywords: ['preset', 'theme market'],
  },
  {
    tabId: 'ai',
    sectionTitle: 'Provider',
    label: 'AI 连接配置',
    description: '设置 provider、baseUrl、model 和 temperature',
    anchorId: 'ai-provider',
    keywords: ['provider', 'model', 'api key', 'temperature'],
  },
  {
    tabId: 'ai',
    sectionTitle: '连接检测',
    label: '连接测试与 Ollama',
    description: '测试连接并读取本地 Ollama 模型',
    anchorId: 'ai-connection',
    keywords: ['ollama', 'test connection'],
  },
  {
    tabId: 'data',
    sectionTitle: '存储',
    label: '存储占用与数据库统计',
    description: '查看浏览器配额、表记录数和总体规模',
    anchorId: 'data-storage',
    keywords: ['storage', 'database', 'quota'],
  },
  {
    tabId: 'data',
    sectionTitle: '迁移',
    label: 'Markdown 文件导入',
    description: '从本地文件批量导入 Markdown、HTML、TXT',
    anchorId: 'data-import',
    keywords: ['import', 'markdown', 'html', 'txt'],
  },
  {
    tabId: 'data',
    sectionTitle: '备份',
    label: '设置导入导出与数据库快照',
    description: '导出 JSON 设置、完整 IndexedDB 快照并执行恢复',
    anchorId: 'data-backup',
    keywords: ['backup', 'snapshot', 'restore', 'settings json'],
  },
  {
    tabId: 'data',
    sectionTitle: '危险操作',
    label: '清空文章与素材',
    description: '清空文章相关表、清理素材并重置设置',
    anchorId: 'data-danger',
    keywords: ['danger', 'reset', 'clear assets'],
  },
  {
    tabId: 'sync',
    sectionTitle: '同步目标',
    label: '同步目标表单',
    description: '配置 WebDAV、S3 或 REST 目标',
    anchorId: 'sync-target',
    keywords: ['webdav', 's3', 'rest api'],
  },
  {
    tabId: 'sync',
    sectionTitle: '同步策略',
    label: '自动同步与冲突策略',
    description: '设置间隔、冲突处理和分类过滤',
    anchorId: 'sync-policy',
    keywords: ['interval', 'conflict', 'categories'],
  },
  {
    tabId: 'sync',
    sectionTitle: '同步加密',
    label: '主密钥与恢复密钥',
    description: '初始化或解锁主密钥，并管理恢复密钥导出导入',
    anchorId: 'sync-security',
    keywords: ['encryption', 'master key', 'recovery key', 'unlock'],
  },
  {
    tabId: 'sync',
    sectionTitle: '同步状态',
    label: '同步状态与日志',
    description: '查看实时状态、冲突列表和同步历史',
    anchorId: 'sync-runtime',
    keywords: ['status', 'history', 'logs', 'conflicts'],
  },
  {
    tabId: 'shortcuts',
    sectionTitle: '快捷键',
    label: '快捷键录制',
    description: '为保存、加粗、斜体、撤销等动作绑定组合键',
    anchorId: 'shortcuts-map',
    keywords: ['keyboard', 'shortcut', 'hotkey'],
  },
  {
    tabId: 'advanced',
    sectionTitle: '运行级别',
    label: '日志与性能指标',
    description: '控制日志级别与性能指标面板开关',
    anchorId: 'advanced-runtime',
    keywords: ['log level', 'performance'],
  },
  {
    tabId: 'advanced',
    sectionTitle: '实验功能',
    label: 'Feature Flags',
    description: '启用或关闭实验性功能',
    anchorId: 'advanced-flags',
    keywords: ['feature flag', 'experimental'],
  },
  {
    tabId: 'advanced',
    sectionTitle: '网络',
    label: '代理设置',
    description: '配置 HTTP、HTTPS 或 SOCKS5 代理',
    anchorId: 'advanced-proxy',
    keywords: ['proxy', 'socks5', 'http'],
  },
  {
    tabId: 'advanced',
    sectionTitle: '档案',
    label: '设置 Profile',
    description: '保存、切换、重命名和删除设置档案',
    anchorId: 'advanced-profiles',
    keywords: ['profile', 'settings profile'],
  },
  {
    tabId: 'advanced',
    sectionTitle: '缓存',
    label: '缓存管理',
    description: '查看浏览器缓存、预览缓存和 Service Worker 状态',
    anchorId: 'advanced-cache',
    keywords: ['cache', 'preview cache', 'service worker'],
  },
  {
    tabId: 'advanced',
    sectionTitle: '开发者工具',
    label: '运行时调试信息',
    description: '导出运行时信息、数据库状态和编辑器内部状态',
    anchorId: 'advanced-devtools',
    keywords: ['debug', 'diagnostics', 'dexie', 'editor state'],
  },
  {
    tabId: 'advanced',
    sectionTitle: '性能监控',
    label: '性能指标面板',
    description: '查看渲染 FPS、自动保存延迟和 IndexedDB 延迟',
    anchorId: 'advanced-performance',
    keywords: ['performance', 'fps', 'latency', 'memory'],
  },
  {
    tabId: 'about',
    sectionTitle: '关于',
    label: '版本与技术栈',
    description: '查看当前版本、设计语言与技术栈',
    anchorId: 'about-meta',
    keywords: ['version', 'stack', 'design'],
  },
]

const shortcutDefinitions = [
  { id: 'save', label: '保存', description: '在工作台立即保存当前内容' },
  { id: 'bold', label: '加粗', description: '切换当前选区的加粗状态' },
  { id: 'italic', label: '斜体', description: '切换当前选区的斜体状态' },
  { id: 'undo', label: '撤销', description: '回退上一步编辑操作' },
  { id: 'redo', label: '重做', description: '恢复刚刚撤销的编辑操作' },
  { id: 'outline', label: '大纲', description: '切换工作台大纲视图' },
  { id: 'focusMode', label: '专注模式', description: '切换工作台专注模式' },
] as const

void shortcutDefinitions

const shortcutDefinitionsFull = [
  { id: 'bold', group: 'formatting', label: '加粗', description: '切换当前选区的加粗状态' },
  { id: 'italic', group: 'formatting', label: '斜体', description: '切换当前选区的斜体状态' },
  { id: 'underline', group: 'formatting', label: '下划线', description: '切换当前选区的下划线样式' },
  { id: 'strikethrough', group: 'formatting', label: '删除线', description: '切换当前选区的删除线样式' },
  { id: 'inlineCode', group: 'formatting', label: '行内代码', description: '将当前选区转为行内代码' },
  { id: 'link', group: 'formatting', label: '编辑链接', description: '为当前选区创建或编辑链接' },
  { id: 'clearFormat', group: 'formatting', label: '清除格式', description: '清除选区格式，或在空选区时切换编辑模式' },
  { id: 'highlight', group: 'formatting', label: '高亮', description: '为当前选区应用高亮颜色' },
  { id: 'heading1', group: 'headings', label: '一级标题', description: '切换为 H1 标题' },
  { id: 'heading2', group: 'headings', label: '二级标题', description: '切换为 H2 标题' },
  { id: 'heading3', group: 'headings', label: '三级标题', description: '切换为 H3 标题' },
  { id: 'heading4', group: 'headings', label: '四级标题', description: '切换为 H4 标题' },
  { id: 'paragraph', group: 'headings', label: '正文段落', description: '恢复为正文段落' },
  { id: 'blockquote', group: 'blocks', label: '引用块', description: '切换为引用块' },
  { id: 'codeBlock', group: 'blocks', label: '代码块', description: '切换为代码块' },
  { id: 'orderedList', group: 'blocks', label: '有序列表', description: '切换为有序列表' },
  { id: 'bulletList', group: 'blocks', label: '无序列表', description: '切换为无序列表' },
  { id: 'taskList', group: 'blocks', label: '任务列表', description: '切换为任务列表' },
  { id: 'table', group: 'blocks', label: '插入表格', description: '插入 3x3 带表头表格' },
  { id: 'horizontalRule', group: 'blocks', label: '分割线', description: '插入水平分割线' },
  { id: 'save', group: 'editing', label: '保存', description: '立即保存当前文稿' },
  { id: 'undo', group: 'editing', label: '撤销', description: '撤销上一步编辑' },
  { id: 'redo', group: 'editing', label: '重做', description: '恢复刚刚撤销的编辑' },
  { id: 'findReplace', group: 'editing', label: '查找替换', description: '打开查找替换面板' },
  { id: 'find', group: 'editing', label: '查找', description: '打开查找面板' },
  { id: 'selectAll', group: 'editing', label: '全选', description: '选中当前文稿全部内容' },
  { id: 'toggleSidebar', group: 'view', label: '切换管理栏', description: '折叠或展开左侧管理栏' },
  { id: 'togglePreview', group: 'view', label: '切换预览栏', description: '折叠或展开预览栏' },
  { id: 'toggleOutline', group: 'view', label: '打开大纲', description: '切换到大纲面板' },
  { id: 'focusMode', group: 'view', label: '专注模式', description: '切换工作台专注模式' },
  { id: 'typewriterMode', group: 'view', label: '打字机模式', description: '切换打字机跟随光标模式' },
  { id: 'switchEditorMode', group: 'view', label: '切换编辑模式', description: '切换 Typora 与源码双栏模式' },
  { id: 'zoomIn', group: 'view', label: '放大字号', description: '提升当前工作台的阅读字号' },
] as const

const shortcutGroups = [
  { id: 'formatting', label: '格式化', description: '文本样式、链接与高亮' },
  { id: 'headings', label: '标题层级', description: '正文与标题切换' },
  { id: 'blocks', label: '块级结构', description: '列表、引用、代码块与表格' },
  { id: 'editing', label: '编辑操作', description: '保存、撤销、查找与全选' },
  { id: 'view', label: '视图控制', description: '工作台面板与模式切换' },
] as const

const shortcutSections = computed(() => shortcutGroups.map((group) => ({
  ...group,
  items: shortcutDefinitionsFull.filter((shortcut) => shortcut.group === group.id),
})))

void shortcutSections

const currentTab = ref<TabId>(isTabId(route.query.tab) ? route.query.tab : 'account')
const searchQuery = ref('')
const highlightedAnchor = ref<string | null>(null)
const editingShortcut = ref<string | null>(null)
const shortcutConflict = ref<string | null>(null)
const revealApiKey = ref(false)
const revealSyncSecret = ref(false)
const revealProxyPassword = ref(false)
const notice = ref<NoticeState | null>(null)
const aiConnectionMessage = ref('')
const ollamaModels = ref<string[]>([])
const settingsProfiles = ref<SettingsProfile[]>([])
const syncLogs = ref<SyncLog[]>([])
const databaseSize = ref<DatabaseSizeResult | null>(null)
const importSummary = ref<ImportSummaryState | null>(null)
const currentTabTitle = computed(() => tabs.find((tab) => tab.id === currentTab.value) ?? tabs[0])

watch(
  () => route.query.tab,
  (value) => {
    if (isTabId(value)) {
      currentTab.value = value
    }
  },
  { immediate: true }
)

watch(
  currentTab,
  (value) => {
    if (route.query.tab === value) {
      return
    }

    void router.replace({
      query: {
        ...route.query,
        tab: value,
      },
    })
  }
)

const avatarInputRef = ref<HTMLInputElement | null>(null)
const settingsImportInputRef = ref<HTMLInputElement | null>(null)
const snapshotImportInputRef = ref<HTMLInputElement | null>(null)

const accountSaving = ref(false)
const avatarUploading = ref(false)
const aiTesting = ref(false)
const ollamaLoading = ref(false)
const syncBusy = ref(false)
const syncTesting = ref(false)
const snapshotBusy = ref(false)
const profileBusy = ref(false)
const dataBusy = ref(false)
const syncLogLoading = ref(false)
const masterKeyBusy = ref(false)
const masterKeyUnlocked = ref(false)
const masterKeyDialogMode = ref<MasterKeyDialogMode | null>(null)
const masterKeyDialogError = ref<string | null>(null)
const masterKeyDialogPrimaryInputRef = ref<HTMLInputElement | null>(null)
const lastExportedRecoveryBundle = ref('')
const lastExportedRecoveryBundleAt = ref<string | null>(null)

const storageEstimate = reactive({
  usage: 0,
  quota: 0,
})

const createAccountDraft = reactive({
  name: '',
  email: '',
  bio: '',
})

const accountForm = reactive({
  name: '',
  email: '',
  bio: '',
})

const accountSwitchingId = ref<string | null>(null)
const accountCreating = ref(false)
const cacheSize = ref('计算中...')
const previewCacheActive = ref(false)
const swRegistered = ref(false)
const editorNodeCount = ref(0)
const editorRuntimeStatus = ref('idle')
const renderFPS = ref(60)
const autoSaveLatency = ref(0)
const idbLatency = ref(0)
const memoryUsage = ref('--')
const runtimeLogLevel = ref<LoggerLevel>(getLogLevel())
const lastPreviewRenderMetric = ref<{ duration: number; platform?: string; at: string } | null>(null)
const lastSaveMetric = ref<{ duration: number; source?: string; at: string } | null>(null)

const syncTargetDraft = reactive({
  type: 'none' as SyncTargetType,
  url: '',
  username: '',
  password: '',
  endpoint: '',
  accessKeyId: '',
  secretAccessKey: '',
  bucket: '',
  region: 'auto',
  restUrl: '',
  token: '',
})
const masterKeyDialogForm = reactive({
  password: '',
  exportPassword: '',
  newPassword: '',
  bundleText: '',
})
const revealMasterKeySecrets = reactive({
  password: false,
  exportPassword: false,
  newPassword: false,
})

let highlightTimer: number | null = null
let performanceFrameId: number | null = null
let performanceSnapshotTimerId: ReturnType<typeof setInterval> | null = null
let lastFrameSampleAt = 0
let frameCount = 0

const searchResults = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) {
    return []
  }

  return searchableItems
    .map((item) => {
      let score = 0
      if (item.label.toLowerCase().includes(keyword)) score += 3
      if (item.sectionTitle.toLowerCase().includes(keyword)) score += 1
      if (item.description.toLowerCase().includes(keyword)) score += 1
      if (item.keywords.some((entry) => entry.toLowerCase().includes(keyword))) score += 2
      return { item, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((entry) => entry.item)
})

const storageUsageLabel = computed(() => formatBytes(storageEstimate.usage))
const storageQuotaLabel = computed(() => formatBytes(storageEstimate.quota))
const passwordPolicyHint = computed(() => {
  const rules = [
    `至少 ${PASSWORD_POLICY.MIN_LENGTH} 个字符`,
    '包含大写字母',
    '包含小写字母',
    '包含数字',
  ]
  if (PASSWORD_POLICY.REQUIRE_SPECIAL) {
    rules.push('包含特殊字符')
  }
  return rules.join('，')
})
const storageRatio = computed(() => {
  if (!storageEstimate.quota) {
    return 0
  }
  return Math.min(100, Math.round((storageEstimate.usage / storageEstimate.quota) * 100))
})
const performanceMetricsVisible = computed(() => {
  return performanceFlag.enabled.value && settingsStore.settings.advanced.showPerformanceMetrics
})
const dexieVersion = computed(() => db.verno)
const proxyRuntimeConfig = computed(() => getProxyRuntimeConfig(settingsStore.settings.advanced))
const proxyRuntimeDescription = computed(() => describeProxyConfig(settingsStore.settings.advanced))
const currentTabResetMeta = computed(() => tabResetDefinitions[currentTab.value])
const currentTabResetLabel = computed(() => currentTabResetMeta.value.label)

const selectedThemePreset = computed(() => {
  return themePresets.find((preset) => preset.id === settingsStore.settings.export.defaultPresetId) ?? themePresets[0]
})

const syncStatusTone = computed<NoticeTone>(() => {
  switch (syncStore.status) {
    case 'error':
    case 'conflict':
      return 'error'
    case 'syncing':
      return 'info'
    default:
      return 'success'
  }
})

const syncSummaryText = computed(() => {
  if (syncStore.status === 'conflict') {
    return `${syncStore.conflicts.length} 个冲突待处理`
  }
  if (syncStore.status === 'syncing') {
    return '同步引擎正在处理变更'
  }
  if (syncStore.status === 'error') {
    return syncStore.lastError ?? '同步执行失败'
  }
  return syncStore.statusText
})
const masterKeyStatusTone = computed<NoticeTone>(() => (masterKeyUnlocked.value ? 'success' : 'info'))
const masterKeyStatusLabel = computed(() => (masterKeyUnlocked.value ? '已解锁' : '未初始化或未解锁'))
const masterKeyStatusDescription = computed(() => {
  if (masterKeyUnlocked.value) {
    return '同步运行时可直接复用当前主密钥。'
  }
  return '同步加密需要先在此初始化或解锁主密钥。'
})
const recoveryBundleSummary = computed(() => {
  if (!lastExportedRecoveryBundleAt.value) {
    return '尚未生成恢复密钥包。'
  }
  return `最近一次导出：${formatDateTime(lastExportedRecoveryBundleAt.value)}`
})
const masterKeyDialogTitle = computed(() => {
  switch (masterKeyDialogMode.value) {
    case 'unlock':
      return '初始化或解锁主密钥'
    case 'export':
      return '导出恢复密钥'
    case 'import':
      return '导入恢复密钥'
    default:
      return ''
  }
})
const masterKeyDialogDescription = computed(() => {
  switch (masterKeyDialogMode.value) {
    case 'unlock':
      return '输入主密码后，InkForge 会初始化新的主密钥或解锁已有主密钥。'
    case 'export':
      return '导出恢复密钥包前需要单独的导出密码，用于保护离线备份。'
    case 'import':
      return '导入恢复密钥包会用新的主密码重新包装主密钥，并立即用于当前会话。'
    default:
      return ''
  }
})
const masterKeyDialogSubmitLabel = computed(() => {
  switch (masterKeyDialogMode.value) {
    case 'unlock':
      return masterKeyBusy.value ? '处理中...' : '初始化 / 解锁'
    case 'export':
      return masterKeyBusy.value ? '导出中...' : '生成恢复密钥'
    case 'import':
      return masterKeyBusy.value ? '导入中...' : '导入恢复密钥'
    default:
      return '提交'
  }
})
const hasCachedRecoveryBundle = computed(() => lastExportedRecoveryBundle.value.trim().length > 0)

watch(
  () => accountStore.currentAccount,
  (account) => {
    accountForm.name = account?.name ?? ''
    accountForm.email = account?.email ?? ''
    accountForm.bio = account?.bio ?? ''
  },
  { immediate: true },
)

watch(
  () => settingsStore.settings.sync.target,
  () => {
    syncDraftFromSettings()
  },
  { deep: true, immediate: true },
)

watch(
  () => [settingsStore.settings.sync.enabled, settingsStore.settings.sync.interval] as const,
  ([enabled, interval]) => {
    if (!enabled || interval === 'manual') {
      syncStore.stopAutoSync()
      return
    }

    syncStore.startAutoSync(SYNC_INTERVAL_MAP[interval])
  },
  { immediate: true },
)

watch(
  () => settingsStore.settings.ai.provider,
  (provider) => {
    aiConnectionMessage.value = ''
    if (provider === 'ollama') {
      void loadOllamaModels()
    } else {
      ollamaModels.value = []
    }
  },
  { immediate: true },
)

watch(
  () => settingsStore.settings.advanced.logLevel,
  (level) => {
    setLogLevel(level)
    runtimeLogLevel.value = getLogLevel()
  },
  { immediate: true },
)

watch(
  () => settingsStore.settings.account.profileId,
  (profileId) => {
    if (!profileId || accountStore.currentAccount?.id === profileId) {
      return
    }

    void accountStore.loadAccount(profileId)
  },
  { immediate: true },
)

watch(
  performanceMetricsVisible,
  (enabled) => {
    if (enabled) {
      startPerformanceMonitor()
      return
    }

    stopPerformanceMonitor()
  },
  { immediate: true },
)

onMounted(async () => {
  window.addEventListener('inkforge:editor-save-metric', handleEditorSaveMetric as EventListener)
  window.addEventListener('inkforge:preview-render-metric', handlePreviewRenderMetric as EventListener)

  await Promise.all([
    accountStore.loadAccount(settingsStore.settings.account.profileId),
    accountStore.listAccounts(),
    refreshStorageEstimate(),
    refreshDatabaseStats(),
    refreshSettingsProfilesList(),
    refreshSyncLogsList(),
    refreshMasterKeyRuntimeState(),
    refreshCacheStats(),
    refreshPerformanceSnapshot(),
  ])
})

onUnmounted(() => {
  if (highlightTimer !== null) {
    window.clearTimeout(highlightTimer)
    highlightTimer = null
  }
  window.removeEventListener('keydown', handleShortcutRecording)
  window.removeEventListener('keydown', handleMasterKeyDialogKeydown)
  window.removeEventListener('inkforge:editor-save-metric', handleEditorSaveMetric as EventListener)
  window.removeEventListener('inkforge:preview-render-metric', handlePreviewRenderMetric as EventListener)
  stopPerformanceMonitor()
})

window.addEventListener('keydown', handleShortcutRecording)
window.addEventListener('keydown', handleMasterKeyDialogKeydown)

function goBack(): void {
  void router.push('/')
}

function setNotice(tone: NoticeTone, text: string): void {
  notice.value = { tone, text }
}

function clearNotice(): void {
  notice.value = null
}

function syncDraftFromSettings(): void {
  const target = settingsStore.settings.sync.target
  syncTargetDraft.type = target.type
  syncTargetDraft.url = target.type === 'webdav' ? target.url : ''
  syncTargetDraft.username = target.type === 'webdav' ? target.username : ''
  syncTargetDraft.password = target.type === 'webdav' ? target.password : ''
  syncTargetDraft.endpoint = target.type === 's3' ? target.endpoint : ''
  syncTargetDraft.accessKeyId = target.type === 's3' ? target.accessKeyId : ''
  syncTargetDraft.secretAccessKey = target.type === 's3' ? target.secretAccessKey : ''
  syncTargetDraft.bucket = target.type === 's3' ? target.bucket : ''
  syncTargetDraft.region = target.type === 's3' ? target.region : 'auto'
  syncTargetDraft.restUrl = target.type === 'rest' ? target.url : ''
  syncTargetDraft.token = target.type === 'rest' ? target.token : ''
}

function isHighlighted(anchorId: string): boolean {
  return highlightedAnchor.value === anchorId
}

async function jumpToSetting(item: SearchableSettingItem): Promise<void> {
  currentTab.value = item.tabId
  searchQuery.value = ''
  await nextTick()

  const anchorElement = document.getElementById(item.anchorId)
  if (anchorElement instanceof HTMLElement) {
    anchorElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    highlightedAnchor.value = item.anchorId

    if (highlightTimer !== null) {
      window.clearTimeout(highlightTimer)
    }

    highlightTimer = window.setTimeout(() => {
      highlightedAnchor.value = null
      highlightTimer = null
    }, 1800)
  }
}

function jumpToSyncSecurity(): void {
  void jumpToSetting({
    tabId: 'sync',
    sectionTitle: '同步加密',
    label: '主密钥与恢复密钥',
    description: '跳转到同步安全与主密钥管理区块',
    anchorId: 'sync-security',
    keywords: ['sync', 'security', 'master key'],
  })
}

function syncMetricsFromSession(): void {
  if (typeof window === 'undefined') {
    return
  }

  const savedLatency = Number(window.sessionStorage.getItem('inkforge:last-editor-save-ms') ?? '0')
  const savedAt = window.sessionStorage.getItem('inkforge:last-editor-save-at')
  const savedSource = window.sessionStorage.getItem('inkforge:last-editor-save-source') ?? undefined
  if (Number.isFinite(savedLatency) && savedLatency >= 0) {
    autoSaveLatency.value = Math.round(savedLatency)
  }
  if (savedAt) {
    lastSaveMetric.value = {
      duration: autoSaveLatency.value,
      source: savedSource,
      at: savedAt,
    }
  }

  const previewLatency = Number(window.sessionStorage.getItem('inkforge:last-preview-render-ms') ?? '0')
  const previewAt = window.sessionStorage.getItem('inkforge:last-preview-render-at')
  if (Number.isFinite(previewLatency) && previewLatency >= 0 && previewAt) {
    lastPreviewRenderMetric.value = {
      duration: Math.round(previewLatency),
      at: previewAt,
    }
    previewCacheActive.value = true
  } else {
    previewCacheActive.value = false
  }
}

function refreshEditorDevInfo(): void {
  const editorElement = document.querySelector('.ProseMirror')
  if (!(editorElement instanceof HTMLElement)) {
    editorNodeCount.value = 0
    editorRuntimeStatus.value = 'idle'
    return
  }

  editorNodeCount.value = editorElement.querySelectorAll('*').length
  editorRuntimeStatus.value = editorStore.status === 'idle'
    ? 'idle'
    : editorStore.status === 'error'
      ? 'error'
      : 'active'
}

function handleEditorSaveMetric(event: Event): void {
  const detail = (event as CustomEvent<{ duration?: number; source?: string; at?: string }>).detail
  autoSaveLatency.value = Math.max(0, Math.round(detail?.duration ?? 0))
  lastSaveMetric.value = {
    duration: autoSaveLatency.value,
    source: detail?.source,
    at: detail?.at ?? new Date().toISOString(),
  }
}

function handlePreviewRenderMetric(event: Event): void {
  const detail = (event as CustomEvent<{ duration?: number; platform?: string; at?: string }>).detail
  lastPreviewRenderMetric.value = {
    duration: Math.max(0, Math.round(detail?.duration ?? 0)),
    platform: detail?.platform,
    at: detail?.at ?? new Date().toISOString(),
  }
  previewCacheActive.value = true
}

async function refreshStorageEstimate(): Promise<void> {
  if (!('storage' in navigator) || typeof navigator.storage.estimate !== 'function') {
    storageEstimate.usage = 0
    storageEstimate.quota = 0
    return
  }

  try {
    const estimate = await navigator.storage.estimate()
    storageEstimate.usage = estimate.usage ?? 0
    storageEstimate.quota = estimate.quota ?? 0
  } catch (error) {
    logger.warn('读取浏览器存储配额失败', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function refreshCacheStats(): Promise<void> {
  if (typeof window === 'undefined') {
    cacheSize.value = '不可用'
    previewCacheActive.value = false
    swRegistered.value = false
    return
  }

  syncMetricsFromSession()

  if ('caches' in window) {
    try {
      const keys = await caches.keys()
      let totalBytes = 0

      for (const key of keys) {
        const cache = await caches.open(key)
        const requests = await cache.keys()

        for (const request of requests) {
          const response = await cache.match(request)
          if (!response) {
            continue
          }

          totalBytes += (await response.blob()).size
        }
      }

      cacheSize.value = formatBytes(totalBytes)
    } catch (error) {
      logger.warn('读取渲染缓存失败', {
        error: error instanceof Error ? error.message : String(error),
      })
      cacheSize.value = '不可用'
    }
  } else {
    cacheSize.value = '不可用'
  }

  if ('serviceWorker' in navigator) {
    try {
      swRegistered.value = Boolean(await navigator.serviceWorker.getRegistration())
    } catch (error) {
      logger.warn('读取 Service Worker 状态失败', {
        error: error instanceof Error ? error.message : String(error),
      })
      swRegistered.value = false
    }
  } else {
    swRegistered.value = false
  }
}

async function refreshDatabaseStats(): Promise<void> {
  try {
    databaseSize.value = await getDatabaseSize()
  } catch (error) {
    logger.error('读取数据库统计失败', error)
    setNotice('error', '读取数据库统计失败')
  }
}

async function refreshPerformanceSnapshot(): Promise<void> {
  syncMetricsFromSession()
  refreshEditorDevInfo()

  const startedAt = performance.now()
  try {
    await db.articles.limit(1).toArray()
    idbLatency.value = Math.max(0, Math.round(performance.now() - startedAt))
  } catch (error) {
    logger.warn('采集 IndexedDB 延迟失败', {
      error: error instanceof Error ? error.message : String(error),
    })
    idbLatency.value = 0
  }

  const performanceWithMemory = performance as Performance & {
    memory?: {
      usedJSHeapSize?: number
    }
  }

  const usedHeap = performanceWithMemory.memory?.usedJSHeapSize
  memoryUsage.value = typeof usedHeap === 'number' ? formatBytes(usedHeap) : '不可用'
}

function startPerformanceMonitor(): void {
  stopPerformanceMonitor()
  lastFrameSampleAt = performance.now()
  frameCount = 0

  const tick = (now: number): void => {
    frameCount += 1

    if (now - lastFrameSampleAt >= 1000) {
      renderFPS.value = Math.max(1, Math.round((frameCount * 1000) / (now - lastFrameSampleAt)))
      frameCount = 0
      lastFrameSampleAt = now
    }

    performanceFrameId = window.requestAnimationFrame(tick)
  }

  performanceFrameId = window.requestAnimationFrame(tick)
  void refreshPerformanceSnapshot()
  performanceSnapshotTimerId = window.setInterval(() => {
    void refreshPerformanceSnapshot()
  }, 2500)
}

function stopPerformanceMonitor(): void {
  if (performanceFrameId !== null) {
    window.cancelAnimationFrame(performanceFrameId)
    performanceFrameId = null
  }

  if (performanceSnapshotTimerId !== null) {
    window.clearInterval(performanceSnapshotTimerId)
    performanceSnapshotTimerId = null
  }
}

async function clearRenderCache(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }

  await refreshCacheStats()
  setNotice('success', '渲染缓存已清除')
}

function clearPreviewCache(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('inkforge:last-preview-render-ms')
    window.sessionStorage.removeItem('inkforge:last-preview-render-at')
    window.dispatchEvent(new CustomEvent('inkforge:clear-preview-cache'))
  }

  previewCacheActive.value = false
  lastPreviewRenderMetric.value = null
  setNotice('success', '预览缓存已清除')
}

function exportDebugInfo(): void {
  refreshEditorDevInfo()

  const payload = {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    runtimeLogLevel: runtimeLogLevel.value,
    settings: settingsStore.exportSettings(),
    proxy: proxyRuntimeConfig.value,
    databaseVersion: dexieVersion.value,
    databaseSize: databaseSize.value,
    indexedDbTables: DATABASE_TABLES.length,
    storageUsage: {
      usage: storageEstimate.usage,
      quota: storageEstimate.quota,
    },
    account: {
      currentId: settingsStore.settings.account.profileId,
      total: accountStore.accounts.length,
    },
    sync: {
      status: syncStore.status,
      lastSyncAt: syncStore.lastSyncAt,
      pendingChanges: syncStore.pendingCount,
    },
    editor: {
      storeStatus: editorStore.status,
      runtimeStatus: editorRuntimeStatus.value,
      nodeCount: editorNodeCount.value,
      renderFPS: renderFPS.value,
      previewMetric: lastPreviewRenderMetric.value,
      saveMetric: lastSaveMetric.value,
      autoSaveLatency: autoSaveLatency.value,
      indexedDbLatency: idbLatency.value,
      memoryUsage: memoryUsage.value,
    },
    featureFlags: settingsStore.settings.advanced.featureFlags.map((flag) => ({
      id: flag.id,
      enabled: flag.enabled,
      experimental: flag.experimental,
    })),
  }

  downloadTextFile(`inkforge-debug-${Date.now()}.json`, JSON.stringify(payload, null, 2))
  setNotice('success', '调试信息已导出')
}

async function refreshSettingsProfilesList(): Promise<void> {
  try {
    settingsProfiles.value = await getSettingsProfiles()
  } catch (error) {
    logger.error('读取设置档案失败', error)
    setNotice('error', '读取设置档案失败')
  }
}

async function refreshSyncLogsList(): Promise<void> {
  syncLogLoading.value = true
  try {
    syncLogs.value = await getSyncLogs()
  } catch (error) {
    logger.error('读取同步日志失败', error)
    setNotice('error', '读取同步日志失败')
  } finally {
    syncLogLoading.value = false
  }
}

function openAvatarPicker(): void {
  avatarInputRef.value?.click()
}

function openSettingsImport(): void {
  settingsImportInputRef.value?.click()
}

function openSnapshotImport(): void {
  snapshotImportInputRef.value?.click()
}

async function saveAccountProfile(): Promise<void> {
  accountSaving.value = true
  clearNotice()

  try {
    await accountStore.updateAccount({
      name: accountForm.name,
      email: accountForm.email,
      bio: accountForm.bio,
    })
    setNotice('success', '账户资料已保存')
  } catch (error) {
    logger.error('保存账户资料失败', error)
    setNotice('error', error instanceof Error ? error.message : '保存账户资料失败')
  } finally {
    accountSaving.value = false
  }
}

async function handleAvatarSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  avatarUploading.value = true
  clearNotice()

  try {
    await accountStore.updateAvatar(file)
    setNotice('success', '头像已更新')
  } catch (error) {
    logger.error('更新头像失败', error)
    setNotice('error', error instanceof Error ? error.message : '更新头像失败')
  } finally {
    input.value = ''
    avatarUploading.value = false
  }
}

async function exportAccountDataFile(): Promise<void> {
  try {
    const payload = await accountStore.exportAccountData()
    downloadTextFile(`inkforge-account-${Date.now()}.json`, payload)
    setNotice('success', '账户数据已导出')
  } catch (error) {
    logger.error('导出账户数据失败', error)
    setNotice('error', '导出账户数据失败')
  }
}

async function resetCurrentAccount(): Promise<void> {
  const confirmed = window.confirm('这会重置当前本地账户资料，是否继续？')
  if (!confirmed) {
    return
  }

  try {
    await accountStore.deleteCurrentAccount()
    setNotice('success', '本地账户已重置')
  } catch (error) {
    logger.error('重置账户失败', error)
    setNotice('error', '重置账户失败')
  }
}

async function switchAccountFromSettings(accountId: string): Promise<void> {
  if (!accountId || accountId === accountStore.currentAccount?.id) {
    return
  }

  accountSwitchingId.value = accountId
  clearNotice()

  try {
    const switched = await accountStore.switchAccount(accountId)
    if (!switched) {
      throw new Error(accountStore.error ?? '账户切换失败')
    }

    await accountStore.listAccounts()
    setNotice('success', `已切换到账户「${switched.name}」`)
  } catch (error) {
    logger.error('切换本地账户失败', error)
    setNotice('error', error instanceof Error ? error.message : '切换本地账户失败')
  } finally {
    accountSwitchingId.value = null
  }
}

async function createLocalAccountFromSettings(): Promise<void> {
  if (!createAccountDraft.name.trim()) {
    setNotice('error', '请输入账户名称')
    return
  }

  accountCreating.value = true
  clearNotice()

  try {
    const created = await accountStore.createNewAccount({
      name: createAccountDraft.name.trim(),
      email: createAccountDraft.email.trim(),
      bio: createAccountDraft.bio.trim(),
    })
    if (!created) {
      throw new Error(accountStore.error ?? '创建本地账户失败')
    }

    await accountStore.listAccounts()
    createAccountDraft.name = ''
    createAccountDraft.email = ''
    createAccountDraft.bio = ''
    setNotice('success', `本地账户「${created.name}」已创建并切换`)
  } catch (error) {
    logger.error('创建本地账户失败', error)
    setNotice('error', error instanceof Error ? error.message : '创建本地账户失败')
  } finally {
    accountCreating.value = false
  }
}

async function testAIConnection(): Promise<void> {
  aiTesting.value = true
  clearNotice()

  try {
    const result = await aiStore.testConnection()
    aiConnectionMessage.value = result.message
    setNotice(result.success ? 'success' : 'error', result.message)
  } catch (error) {
    logger.error('AI 连接测试失败', error)
    setNotice('error', 'AI 连接测试失败')
  } finally {
    aiTesting.value = false
  }
}

async function loadOllamaModels(): Promise<void> {
  if (settingsStore.settings.ai.provider !== 'ollama') {
    return
  }

  ollamaLoading.value = true

  try {
    const response = await fetch(`${settingsStore.settings.ai.ollamaUrl.replace(/\/+$/, '')}/api/tags`)
    if (!response.ok) {
      throw new Error(`Ollama 请求失败 (${response.status})`)
    }

    const payload = await response.json() as OllamaTagsResponse
    ollamaModels.value = (payload.models ?? [])
      .map((model) => model.name ?? '')
      .filter((name): name is string => Boolean(name))
  } catch (error) {
    logger.warn('加载 Ollama 模型失败', {
      error: error instanceof Error ? error.message : String(error),
    })
    ollamaModels.value = []
    aiConnectionMessage.value = error instanceof Error ? error.message : '读取 Ollama 模型失败'
  } finally {
    ollamaLoading.value = false
  }
}

async function handleSettingsImport(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  try {
    const text = await file.text()
    const imported = settingsStore.importSettings(text)
    if (!imported) {
      throw new Error('设置文件校验失败')
    }

    syncDraftFromSettings()
    setNotice('success', '设置文件已导入')
  } catch (error) {
    logger.error('导入设置失败', error)
    setNotice('error', error instanceof Error ? error.message : '导入设置失败')
  } finally {
    input.value = ''
  }
}

function exportSettingsFile(): void {
  downloadTextFile(`inkforge-settings-${Date.now()}.json`, settingsStore.exportSettings())
  setNotice('success', '设置 JSON 已导出')
}

async function importMarkdownFiles(): Promise<void> {
  dataBusy.value = true
  clearNotice()

  try {
    importSummary.value = await articleStore.importFromFiles()
    await Promise.all([
      refreshDatabaseStats(),
      refreshStorageEstimate(),
      categoryStore.loadCategories(),
    ])
    setNotice('success', `导入完成：成功 ${importSummary.value.success}，失败 ${importSummary.value.failed}`)
  } catch (error) {
    logger.error('导入 Markdown 文件失败', error)
    setNotice('error', '导入 Markdown 文件失败')
  } finally {
    dataBusy.value = false
  }
}

async function clearArticlesData(): Promise<void> {
  const confirmed = window.confirm('将清空文章、内容、文档与版本数据，是否继续？')
  if (!confirmed) {
    return
  }

  dataBusy.value = true

  try {
      await db.transaction(
        'rw',
        [db.articles, db.contents, db.documents, db.versions, db.pendingChanges, db.syncLogs, db.categories],
        async () => {
          await db.articles.clear()
          await db.contents.clear()
          await db.documents.clear()
          await db.versions.clear()
          await db.pendingChanges.clear()
          await db.syncLogs.clear()
          await db.categories.toCollection().modify({ articleCount: 0 })
        },
    )

    await Promise.all([
      articleStore.loadArticles(),
      categoryStore.loadCategories(),
      refreshDatabaseStats(),
      refreshStorageEstimate(),
      refreshSyncLogsList(),
      syncStore.reloadPendingChanges(),
    ])
    setNotice('success', '文章相关数据已清空')
  } catch (error) {
    logger.error('清空文章数据失败', error)
    setNotice('error', '清空文章数据失败')
  } finally {
    dataBusy.value = false
  }
}

async function clearAssetsData(): Promise<void> {
  const confirmed = window.confirm('将清理素材库（保留当前头像素材），是否继续？')
  if (!confirmed) {
    return
  }

  dataBusy.value = true

  try {
    const preservedIds = new Set<string>()
    if (accountStore.currentAccount?.avatarBlobId) {
      preservedIds.add(accountStore.currentAccount.avatarBlobId)
    }

    const assetIdsToDelete = (await db.assets.toArray())
      .filter((asset) => !preservedIds.has(asset.id))
      .map((asset) => asset.id)

    if (assetIdsToDelete.length > 0) {
      await db.assets.bulkDelete(assetIdsToDelete)
    }

    await Promise.all([
      refreshDatabaseStats(),
      refreshStorageEstimate(),
      accountStore.loadAccount(settingsStore.settings.account.profileId),
    ])
    setNotice('success', '素材库已清理')
  } catch (error) {
    logger.error('清理素材库失败', error)
    setNotice('error', '清理素材库失败')
  } finally {
    dataBusy.value = false
  }
}

function resetSettingsToDefault(): void {
  const confirmed = window.confirm('将恢复所有设置到默认值，是否继续？')
  if (!confirmed) {
    return
  }

  settingsStore.reset()
  syncDraftFromSettings()
  setNotice('success', '设置已恢复默认值')
}

function buildSyncTargetFromDraft(): SyncTarget {
  switch (syncTargetDraft.type) {
    case 'none':
      return { type: 'none' }
    case 'webdav':
      assertValidUrl(syncTargetDraft.url, 'WebDAV URL')
      assertRequired(syncTargetDraft.username, 'WebDAV 用户名')
      assertRequired(syncTargetDraft.password, 'WebDAV 密码')
      return {
        type: 'webdav',
        url: syncTargetDraft.url,
        username: syncTargetDraft.username,
        password: syncTargetDraft.password,
      }
    case 's3':
      assertValidUrl(syncTargetDraft.endpoint, 'S3 Endpoint')
      assertRequired(syncTargetDraft.accessKeyId, 'Access Key')
      assertRequired(syncTargetDraft.secretAccessKey, 'Secret Key')
      assertRequired(syncTargetDraft.bucket, 'Bucket')
      assertRequired(syncTargetDraft.region, 'Region')
      return {
        type: 's3',
        endpoint: syncTargetDraft.endpoint,
        accessKeyId: syncTargetDraft.accessKeyId,
        secretAccessKey: syncTargetDraft.secretAccessKey,
        bucket: syncTargetDraft.bucket,
        region: syncTargetDraft.region,
      }
    case 'rest':
      assertValidUrl(syncTargetDraft.restUrl, 'REST API URL')
      assertRequired(syncTargetDraft.token, 'Bearer Token')
      return {
        type: 'rest',
        url: syncTargetDraft.restUrl,
        token: syncTargetDraft.token,
      }
  }

  throw new Error('未知同步目标类型')
}

function applySyncTarget(): void {
  try {
    settingsStore.settings.sync.target = buildSyncTargetFromDraft()
    setNotice('success', '同步目标已保存')
  } catch (error) {
    setNotice('error', error instanceof Error ? error.message : '同步目标校验失败')
  }
}

async function testSyncConnection(): Promise<void> {
  syncTesting.value = true
  clearNotice()

  try {
    const target = buildSyncTargetFromDraft()
    const result = await syncStore.testConnection(target)
    setNotice(result.success ? 'success' : 'error', result.message)
  } catch (error) {
    logger.error('同步目标连接测试失败', error)
    setNotice('error', error instanceof Error ? error.message : '同步目标连接测试失败')
  } finally {
    syncTesting.value = false
  }
}

function toggleSyncCategory(categoryId: string): void {
  const selected = settingsStore.settings.sync.selectedCategoryIds
  const index = selected.indexOf(categoryId)

  if (index >= 0) {
    selected.splice(index, 1)
    return
  }

  selected.push(categoryId)
}

async function runManualSync(): Promise<void> {
  syncBusy.value = true
  clearNotice()

  try {
    const result = await syncStore.sync()
    await refreshSyncLogsList()
    if (result.success) {
      setNotice('success', `同步完成：上传 ${result.uploaded}，下载 ${result.downloaded}`)
    } else {
      setNotice('error', result.error ?? '同步失败')
    }
  } catch (error) {
    logger.error('立即同步失败', error)
    setNotice('error', '立即同步失败')
  } finally {
    syncBusy.value = false
  }
}

async function resolveSyncConflict(documentId: string, strategy: 'local-wins' | 'remote-wins' | 'manual'): Promise<void> {
  await syncStore.resolveConflict(documentId, strategy)
  await refreshSyncLogsList()
  setNotice('success', '冲突策略已提交')
}

async function refreshMasterKeyRuntimeState(): Promise<void> {
  try {
    await getMasterKey()
    masterKeyUnlocked.value = true
  } catch {
    masterKeyUnlocked.value = false
  }
}

function openMasterKeyDialog(mode: MasterKeyDialogMode): void {
  masterKeyDialogMode.value = mode
  masterKeyDialogError.value = null
  masterKeyDialogForm.password = ''
  masterKeyDialogForm.exportPassword = ''
  masterKeyDialogForm.newPassword = ''
  masterKeyDialogForm.bundleText = mode === 'import' ? lastExportedRecoveryBundle.value : ''
  revealMasterKeySecrets.password = false
  revealMasterKeySecrets.exportPassword = false
  revealMasterKeySecrets.newPassword = false

  void nextTick(() => {
    masterKeyDialogPrimaryInputRef.value?.focus()
  })
}

function closeMasterKeyDialog(): void {
  masterKeyDialogMode.value = null
  masterKeyDialogError.value = null
  masterKeyDialogForm.password = ''
  masterKeyDialogForm.exportPassword = ''
  masterKeyDialogForm.newPassword = ''
  masterKeyDialogForm.bundleText = ''
  revealMasterKeySecrets.password = false
  revealMasterKeySecrets.exportPassword = false
  revealMasterKeySecrets.newPassword = false
}

function handleMasterKeyDialogKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !masterKeyDialogMode.value) {
    return
  }

  event.preventDefault()
  closeMasterKeyDialog()
}

function parseProtectedPassword(rawValue: string, label: string): string {
  const result = MasterKeyPasswordSchema.safeParse(rawValue)
  if (result.success) {
    return result.data
  }

  throw new Error(`${label}：${result.error.issues[0]?.message ?? '输入无效'}`)
}

function parseRecoveryBundle(rawValue: string): ExportedKeyBundle {
  const textResult = RecoveryBundleTextSchema.safeParse(rawValue)
  if (!textResult.success) {
    throw new Error(textResult.error.issues[0]?.message ?? '恢复密钥包不能为空')
  }

  let parsedBundle: unknown
  try {
    parsedBundle = JSON.parse(textResult.data)
  } catch {
    throw new Error('恢复密钥包必须是合法的 JSON')
  }

  const bundleResult = ExportedKeyBundleSchema.safeParse(parsedBundle)
  if (!bundleResult.success) {
    throw new Error('恢复密钥包字段不完整')
  }

  return bundleResult.data
}

async function submitMasterKeyDialog(): Promise<void> {
  if (!masterKeyDialogMode.value) {
    return
  }

  masterKeyBusy.value = true
  masterKeyDialogError.value = null

  try {
    if (masterKeyDialogMode.value === 'unlock') {
      const password = parseProtectedPassword(masterKeyDialogForm.password, '主密码')
      const unlocked = await unlockWithPassword(password)
      if (!unlocked) {
        throw new Error('主密码不正确，无法解锁现有主密钥')
      }

      await refreshMasterKeyRuntimeState()
      closeMasterKeyDialog()
      setNotice('success', '主密钥已可用于同步')
      return
    }

    if (masterKeyDialogMode.value === 'export') {
      const exportPassword = parseProtectedPassword(masterKeyDialogForm.exportPassword, '导出密码')
      const bundle = await exportMasterKey(exportPassword)
      lastExportedRecoveryBundle.value = JSON.stringify(bundle, null, 2)
      lastExportedRecoveryBundleAt.value = bundle.createdAt
      setNotice('success', '恢复密钥已生成，请立即复制或下载')
      return
    }

    const bundle = parseRecoveryBundle(masterKeyDialogForm.bundleText)
    const exportPassword = parseProtectedPassword(masterKeyDialogForm.exportPassword, '导出密码')
    const newPassword = parseProtectedPassword(masterKeyDialogForm.newPassword, '新主密码')
    const imported = await importMasterKey(bundle, exportPassword, newPassword)

    if (!imported) {
      throw new Error('恢复密钥导入失败')
    }

    await refreshMasterKeyRuntimeState()
    lastExportedRecoveryBundleAt.value = bundle.createdAt
    closeMasterKeyDialog()
    setNotice('success', '恢复密钥导入成功，主密钥已重新解锁')
  } catch (error) {
    logger.error('主密钥管理操作失败', error)
    masterKeyDialogError.value = error instanceof Error ? error.message : '主密钥管理操作失败'
  } finally {
    masterKeyBusy.value = false
  }
}

async function copyRecoveryBundle(): Promise<void> {
  if (!hasCachedRecoveryBundle.value) {
    setNotice('error', '当前没有可复制的恢复密钥包')
    return
  }

  const fallbackCopy = (): boolean => {
    const textarea = document.createElement('textarea')
    textarea.value = lastExportedRecoveryBundle.value
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)

    try {
      return document.execCommand('copy')
    } finally {
      document.body.removeChild(textarea)
    }
  }

  try {
    await navigator.clipboard.writeText(lastExportedRecoveryBundle.value)
    setNotice('success', '恢复密钥包已复制到剪贴板')
  } catch (error) {
    logger.warn('系统剪贴板写入失败，尝试回退复制', {
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    })

    if (fallbackCopy()) {
      setNotice('success', '恢复密钥包已复制到剪贴板')
      return
    }

    logger.error('复制恢复密钥包失败', error)
    setNotice('error', '复制恢复密钥包失败')
  }
}

function downloadRecoveryBundle(): void {
  if (!hasCachedRecoveryBundle.value) {
    setNotice('error', '当前没有可下载的恢复密钥包')
    return
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const blob = new Blob([lastExportedRecoveryBundle.value], { type: 'application/json;charset=utf-8' })
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `inkforge-master-key-${timestamp}.json`
  link.click()
  URL.revokeObjectURL(downloadUrl)
  setNotice('success', '恢复密钥包已下载')
}

function startShortcutRecording(actionId: string): void {
  editingShortcut.value = actionId
  shortcutConflict.value = null
}

function cancelShortcutRecording(): void {
  editingShortcut.value = null
  shortcutConflict.value = null
}

function resetShortcut(actionId: string): void {
  settingsStore.settings.shortcuts[actionId] = DEFAULT_SHORTCUTS[actionId] ?? ''
}

function handleShortcutRecording(event: KeyboardEvent): void {
  if (!editingShortcut.value) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  if (event.key === 'Escape') {
    cancelShortcutRecording()
    return
  }

  const combo = buildShortcutFromEvent(event)
  if (!combo) {
    return
  }

  const conflictEntry = Object.entries(settingsStore.settings.shortcuts).find(
    ([action, binding]) => action !== editingShortcut.value && binding === combo,
  )

  if (conflictEntry) {
    shortcutConflict.value = `已与“${resolveShortcutLabel(conflictEntry[0])}”冲突`
    return
  }

  settingsStore.settings.shortcuts[editingShortcut.value] = combo
  shortcutConflict.value = null
  setNotice('success', `${resolveShortcutLabel(editingShortcut.value)} 已绑定为 ${combo}`)
  editingShortcut.value = null
}

async function saveCurrentProfile(): Promise<void> {
  const rawName = window.prompt('输入新的设置 Profile 名称')
  if (rawName === null) {
    return
  }

  profileBusy.value = true
  clearNotice()

  try {
    const name = ProfileNameSchema.parse(rawName)
    await saveSettingsProfile({
      name,
      settings: settingsStore.exportSettings(),
    })
    await refreshSettingsProfilesList()
    setNotice('success', `Profile「${name}」已保存`)
  } catch (error) {
    logger.error('保存设置 Profile 失败', error)
    setNotice('error', error instanceof Error ? error.message : '保存设置 Profile 失败')
  } finally {
    profileBusy.value = false
  }
}

function applyProfile(profile: SettingsProfile): void {
  const imported = settingsStore.importSettings(profile.settings)
  if (!imported) {
    setNotice('error', `Profile「${profile.name}」内容无效`)
    return
  }

  syncDraftFromSettings()
  setNotice('success', `已应用 Profile「${profile.name}」`)
}

async function renameProfile(profile: SettingsProfile): Promise<void> {
  const rawName = window.prompt('输入新的 Profile 名称', profile.name)
  if (rawName === null) {
    return
  }

  profileBusy.value = true

  try {
    const name = ProfileNameSchema.parse(rawName)
    await saveSettingsProfile({
      id: profile.id,
      name,
      settings: profile.settings,
      isDefault: profile.isDefault,
    })
    await refreshSettingsProfilesList()
    setNotice('success', `Profile 已重命名为「${name}」`)
  } catch (error) {
    logger.error('重命名设置 Profile 失败', error)
    setNotice('error', error instanceof Error ? error.message : '重命名设置 Profile 失败')
  } finally {
    profileBusy.value = false
  }
}

async function removeProfile(profileId: string): Promise<void> {
  const confirmed = window.confirm('删除该设置 Profile 后不可恢复，是否继续？')
  if (!confirmed) {
    return
  }

  profileBusy.value = true

  try {
    await deleteSettingsProfile(profileId)
    await refreshSettingsProfilesList()
    setNotice('success', '设置 Profile 已删除')
  } catch (error) {
    logger.error('删除设置 Profile 失败', error)
    setNotice('error', '删除设置 Profile 失败')
  } finally {
    profileBusy.value = false
  }
}

function resetCategory(category: keyof Settings): void {
  const defaults = getDefaultSettings()
  const nextValue = defaults[category] as Settings[typeof category]
  const settingsRecord = settingsStore.settings as unknown as Record<keyof Settings, Settings[keyof Settings]>
  settingsRecord[category] = nextValue as Settings[keyof Settings]
  settingsStore.save()
}

async function syncRuntimeAfterReset(category: keyof Settings | 'all'): Promise<void> {
  runtimeLogLevel.value = getLogLevel()
  syncDraftFromSettings()
  syncMetricsFromSession()

  if (category === 'account' || category === 'all') {
    await accountStore.loadAccount(settingsStore.settings.account.profileId)
    await accountStore.listAccounts()
  }

  if (category === 'data' || category === 'advanced' || category === 'all') {
    await Promise.all([
      refreshStorageEstimate(),
      refreshDatabaseStats(),
      refreshCacheStats(),
    ])
  }

  if (category === 'advanced' || category === 'all') {
    await refreshPerformanceSnapshot()
  }

  if (category === 'sync' || category === 'all') {
    await Promise.all([
      refreshSyncLogsList(),
      refreshMasterKeyRuntimeState(),
    ])
  }

  if (category === 'shortcuts' || category === 'all') {
    editingShortcut.value = null
    shortcutConflict.value = null
  }
}

async function handleResetCurrentTab(): Promise<void> {
  const config = currentTabResetMeta.value
  const confirmed = window.confirm(`确定要执行“${config.label}”吗？`)
  if (!confirmed) {
    return
  }

  clearNotice()

  if (config.category === 'all') {
    settingsStore.reset()
  } else {
    resetCategory(config.category)
  }

  await syncRuntimeAfterReset(config.category)
  setNotice('success', config.successMessage)
}

function formatBytes(value: number): string {
  if (!value) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let current = value
  let unitIndex = 0

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024
    unitIndex += 1
  }

  return `${current.toFixed(current >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) {
    return '尚无记录'
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '尚无记录'
  }

  return date.toLocaleString('zh-CN', { hour12: false })
}

function formatSyncAction(entry: SyncLog): string {
  switch (entry.action) {
    case 'push':
      return '上传'
    case 'pull':
      return '拉取'
    case 'conflict':
      return '冲突'
    case 'resolve':
      return '解决'
    case 'error':
      return '错误'
    default:
      return entry.action
  }
}

function formatSyncStatus(entry: SyncLog): string {
  switch (entry.status) {
    case 'success':
      return '成功'
    case 'pending':
      return '处理中'
    case 'error':
    default:
      return '失败'
  }
}

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function buildShortcutFromEvent(event: KeyboardEvent): string | null {
  const parts: string[] = []

  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.shiftKey) parts.push('Shift')
  if (event.altKey) parts.push('Alt')

  const ignoredKeys = new Set(['Control', 'Shift', 'Alt', 'Meta'])
  if (!ignoredKeys.has(event.key)) {
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
    parts.push(key)
  }

  return parts.length > 0 ? parts.join('+') : null
}

function resolveShortcutLabel(actionId: string): string {
  return shortcutDefinitionsFull.find((item) => item.id === actionId)?.label ?? actionId
}

function resolveShortcutGroupLabel(groupId: string): string {
  return shortcutGroups.find((item) => item.id === groupId)?.label ?? groupId
}

void resolveShortcutGroupLabel

function assertRequired(value: string, label: string): void {
  if (!value.trim()) {
    throw new Error(`${label}不能为空`)
  }
}

function assertValidUrl(value: string, label: string): void {
  try {
    const url = new URL(value)
    if (!url.protocol.startsWith('http')) {
      throw new Error()
    }
  } catch {
    throw new Error(`${label}格式无效`)
  }
}

async function exportDatabaseSnapshot(): Promise<void> {
  snapshotBusy.value = true
  clearNotice()

  try {
    const snapshot = await buildDatabaseSnapshot()
    downloadTextFile(`inkforge-db-snapshot-${Date.now()}.json`, JSON.stringify(snapshot, null, 2))
    setNotice('success', '数据库快照已导出')
  } catch (error) {
    logger.error('导出数据库快照失败', error)
    setNotice('error', '导出数据库快照失败')
  } finally {
    snapshotBusy.value = false
  }
}

async function handleSnapshotImport(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  const confirmed = window.confirm('恢复快照会覆盖当前 IndexedDB 数据，是否继续？')
  if (!confirmed) {
    input.value = ''
    return
  }

  snapshotBusy.value = true

  try {
    const text = await file.text()
    const raw = JSON.parse(text)
    const snapshot = DatabaseSnapshotSchema.parse(raw)
    await restoreDatabaseSnapshot({
      version: snapshot.version ?? 5,
      exportedAt: snapshot.exportedAt ?? new Date().toISOString(),
      tables: snapshot.tables,
    })

    await Promise.all([
      articleStore.loadArticles(),
      categoryStore.loadCategories(),
      accountStore.loadAccount(settingsStore.settings.account.profileId),
      refreshDatabaseStats(),
      refreshStorageEstimate(),
      refreshSyncLogsList(),
      refreshSettingsProfilesList(),
      syncStore.reloadPendingChanges(),
    ])

    setNotice('success', '数据库快照已恢复')
  } catch (error) {
    logger.error('恢复数据库快照失败', error)
    setNotice('error', error instanceof Error ? error.message : '恢复数据库快照失败')
  } finally {
    input.value = ''
    snapshotBusy.value = false
  }
}

async function buildDatabaseSnapshot(): Promise<DatabaseSnapshot> {
  const tables: DatabaseSnapshot['tables'] = {}

  for (const tableName of DATABASE_TABLES) {
    const rows = await db.table(tableName).toArray()
    tables[tableName] = await Promise.all(
      rows.map(async (row) => {
        return await serializeSnapshotRecord(row as Record<string, unknown>)
      }),
    )
  }

  return {
    version: 5,
    exportedAt: new Date().toISOString(),
    tables,
  }
}

async function restoreDatabaseSnapshot(snapshot: DatabaseSnapshot): Promise<void> {
  const tables = [
    db.categories,
    db.articles,
    db.contents,
    db.documents,
    db.versions,
    db.assets,
    db.accounts,
    db.pendingChanges,
    db.syncLogs,
    db.settingsProfiles,
    db.activityLogs,
  ]

  await db.transaction('rw', tables, async () => {
    for (const tableName of DATABASE_TABLES) {
      await db.table(tableName).clear()
    }

    for (const tableName of DATABASE_TABLES) {
      const rows = (snapshot.tables[tableName] ?? []).map((row) => deserializeSnapshotValue(row) as Record<string, unknown>)
      if (rows.length > 0) {
        await db.table(tableName).bulkPut(rows)
      }
    }
  })
}

async function serializeSnapshotRecord(record: Record<string, unknown>): Promise<Record<string, unknown>> {
  return await serializeSnapshotValue(record) as Record<string, unknown>
}

async function serializeSnapshotValue(value: unknown): Promise<unknown> {
  if (value instanceof Date) {
    const payload: SerializedDate = {
      __type: 'date',
      value: value.toISOString(),
    }
    return payload
  }

  if (value instanceof Blob) {
    const payload: SerializedBlob = {
      __type: 'blob',
      mimeType: value.type,
      data: arrayBufferToBase64(await value.arrayBuffer()),
    }
    return payload
  }

  if (Array.isArray(value)) {
    return await Promise.all(value.map((entry) => serializeSnapshotValue(entry)))
  }

  if (isPlainObject(value)) {
    const nextEntries = await Promise.all(
      Object.entries(value).map(async ([key, entryValue]) => {
        return [key, await serializeSnapshotValue(entryValue)] as const
      }),
    )
    return Object.fromEntries(nextEntries)
  }

  return value
}

function deserializeSnapshotValue(value: unknown): unknown {
  if (isSerializedDate(value)) {
    return new Date(value.value)
  }

  if (isSerializedBlob(value)) {
    return base64ToBlob(value.data, value.mimeType)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => deserializeSnapshotValue(entry))
  }

  if (isPlainObject(value)) {
    const nextEntries = Object.entries(value).map(([key, entryValue]) => {
      return [key, deserializeSnapshotValue(entryValue)] as const
    })
    return Object.fromEntries(nextEntries)
  }

  return value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSerializedDate(value: unknown): value is SerializedDate {
  return isPlainObject(value) && value.__type === 'date' && typeof value.value === 'string'
}

function isSerializedBlob(value: unknown): value is SerializedBlob {
  return (
    isPlainObject(value)
    && value.__type === 'blob'
    && typeof value.mimeType === 'string'
    && typeof value.data === 'string'
  )
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return window.btoa(binary)
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}
</script>

<template>
  <div class="settings-view">
    <input
      ref="avatarInputRef"
      class="visually-hidden"
      type="file"
      accept="image/*"
      @change="handleAvatarSelected"
    >
    <input
      ref="settingsImportInputRef"
      class="visually-hidden"
      type="file"
      accept="application/json,.json"
      @change="handleSettingsImport"
    >
    <input
      ref="snapshotImportInputRef"
      class="visually-hidden"
      type="file"
      accept="application/json,.json"
      @change="handleSnapshotImport"
    >

    <header class="settings-header">
      <div class="header-main">
        <button
          class="ghost-btn"
          type="button"
          title="返回首页"
          @click="goBack"
        >
          <ArrowLeft :size="16" />
        </button>
        <div>
          <p class="eyebrow">
            InkForge v2.1 / Enterprise Settings
          </p>
          <h1 class="page-title">
            设置中心
          </h1>
          <p class="page-subtitle">
            当前分区：{{ currentTabTitle.label }}，所有数据均来自 Pinia + Dexie 真实存储。
          </p>
        </div>
      </div>

      <div class="header-search">
        <Search :size="15" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="搜索设置项、动作或同步能力"
        >
        <div
          v-if="searchQuery.trim()"
          class="search-results"
        >
          <button
            v-for="item in searchResults"
            :key="item.anchorId"
            class="search-result"
            type="button"
            @click="jumpToSetting(item)"
          >
            <span class="search-result__title">{{ item.label }}</span>
            <span class="search-result__meta">{{ item.sectionTitle }} / {{ tabs.find((tab) => tab.id === item.tabId)?.label }}</span>
          </button>
          <p
            v-if="searchResults.length === 0"
            class="search-empty"
          >
            没有匹配项
          </p>
        </div>
      </div>
    </header>

    <div
      v-if="notice"
      class="notice"
      :class="`notice--${notice.tone}`"
    >
      <CheckCircle
        v-if="notice.tone === 'success'"
        :size="16"
      />
      <AlertTriangle
        v-else-if="notice.tone === 'error'"
        :size="16"
      />
      <Info
        v-else
        :size="16"
      />
      <span>{{ notice.text }}</span>
      <button
        class="notice-close"
        type="button"
        title="关闭提示"
        @click="clearNotice"
      >
        ×
      </button>
    </div>

    <div class="settings-layout">
      <aside class="settings-sidebar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-link"
          :class="{ 'tab-link--active': currentTab === tab.id }"
          type="button"
          :title="tab.description"
          @click="currentTab = tab.id"
        >
          <component
            :is="tab.icon"
            :size="16"
          />
          <span class="tab-link__copy">
            <span class="tab-link__title">{{ tab.label }}</span>
            <span class="tab-link__desc">{{ tab.description }}</span>
          </span>
        </button>
      </aside>

      <main class="settings-content">
        <section
          v-if="currentTab === 'account'"
          class="settings-section-stack"
        >
          <section
            id="account-profile"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('account-profile') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  账户资料
                </h2>
                <p class="card-subtitle">
                  当前 Profile：{{ accountStore.currentAccount?.id ?? 'local-default' }}
                </p>
              </div>
              <button
                class="action-btn"
                type="button"
                :disabled="accountSaving"
                title="保存账户资料"
                @click="saveAccountProfile"
              >
                <Save :size="14" />
                <span>{{ accountSaving ? '保存中...' : '保存资料' }}</span>
              </button>
            </header>

            <div class="account-grid">
              <div class="account-avatar-panel">
                <div class="avatar-shell">
                  <img
                    v-if="accountStore.avatarUrl"
                    :src="accountStore.avatarUrl"
                    alt="当前头像"
                  >
                  <span v-else>{{ accountStore.avatarInitial }}</span>
                </div>
                <button
                  class="secondary-btn"
                  type="button"
                  :disabled="avatarUploading"
                  title="上传头像"
                  @click="openAvatarPicker"
                >
                  <Upload :size="14" />
                  <span>{{ avatarUploading ? '处理中...' : '上传头像' }}</span>
                </button>
              </div>

              <div class="field-grid">
                <label class="field">
                  <span>显示名称</span>
                  <input
                    v-model="accountForm.name"
                    type="text"
                    maxlength="50"
                    placeholder="输入本地账户名称"
                  >
                </label>
                <label class="field">
                  <span>邮箱</span>
                  <input
                    v-model="accountForm.email"
                    type="email"
                    placeholder="name@example.com"
                  >
                </label>
                <label class="field field--full">
                  <span>个人简介</span>
                  <textarea
                    v-model="accountForm.bio"
                    rows="4"
                    maxlength="200"
                    placeholder="写一点关于你的写作偏好"
                  />
                  <small>{{ accountForm.bio.length }}/200</small>
                </label>
              </div>
            </div>
          </section>

          <section
            id="account-export"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('account-export') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  数据归属
                </h2>
                <p class="card-subtitle">
                  导出当前账户数据或重置本地账户。
                </p>
              </div>
            </header>

            <div class="button-row">
              <button
                class="action-btn"
                type="button"
                title="导出账户数据"
                @click="exportAccountDataFile"
              >
                <Download :size="14" />
                <span>导出账户数据</span>
              </button>
              <button
                class="danger-btn"
                type="button"
                title="重置本地账户"
                @click="resetCurrentAccount"
              >
                <Trash2 :size="14" />
                <span>重置本地账户</span>
              </button>
            </div>
          </section>

          <section
            id="account-security"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('account-security') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  安全（即将推出）
                </h2>
                <p class="card-subtitle">
                  本地密码改造将跟随后续认证体系上线；当前主密钥管理仍放在同步分区中维护。
                </p>
              </div>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-card__label">当前账户</span>
                <strong>{{ accountStore.currentAccount?.name ?? '未加载' }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">密码策略</span>
                <strong>{{ passwordPolicyHint }}</strong>
              </div>
            </div>

            <div class="button-row">
              <button
                class="secondary-btn"
                type="button"
                title="跳转到同步分区的主密钥管理"
                @click="jumpToSyncSecurity"
              >
                <Shield :size="14" />
                <span>前往主密钥管理</span>
              </button>
            </div>
          </section>

          <section
            id="account-switching"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('account-switching') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  账户切换
                </h2>
                <p class="card-subtitle">
                  当前所有身份均来自 IndexedDB，本地创建后会立即同步回 Settings 与 Account Center。
                </p>
              </div>
              <span class="status-pill status-pill--info">
                {{ accountStore.accounts.length }} 个账户
              </span>
            </header>

            <div
              v-if="accountStore.accounts.length > 0"
              class="account-switch-list"
            >
              <article
                v-for="account in accountStore.accounts"
                :key="account.id"
                class="account-switch-item"
              >
                <div class="account-switch-item__meta">
                  <strong>{{ account.name }}</strong>
                  <p>{{ account.email || '未设置邮箱' }}</p>
                </div>
                <div class="button-row">
                  <span
                    v-if="account.id === accountStore.currentAccount?.id"
                    class="status-pill status-pill--success"
                  >
                    当前
                  </span>
                  <button
                    v-else
                    class="secondary-btn"
                    type="button"
                    :disabled="accountSwitchingId === account.id"
                    :title="`切换到账户 ${account.name}`"
                    @click="switchAccountFromSettings(account.id)"
                  >
                    <Loader2
                      v-if="accountSwitchingId === account.id"
                      :size="14"
                      class="spin"
                    />
                    <Users
                      v-else
                      :size="14"
                    />
                    <span>{{ accountSwitchingId === account.id ? '切换中...' : '切换到账户' }}</span>
                  </button>
                </div>
              </article>
            </div>
            <div
              v-else
              class="empty-box"
            >
              当前还没有可切换的本地账户。
            </div>

            <div class="field-grid">
              <label class="field">
                <span>新账户名称</span>
                <input
                  v-model="createAccountDraft.name"
                  type="text"
                  maxlength="50"
                  placeholder="例如：写作团队"
                >
              </label>
              <label class="field">
                <span>邮箱</span>
                <input
                  v-model="createAccountDraft.email"
                  type="email"
                  maxlength="100"
                  placeholder="可选邮箱"
                >
              </label>
              <label class="field field--full">
                <span>简介</span>
                <textarea
                  v-model="createAccountDraft.bio"
                  rows="3"
                  maxlength="200"
                  placeholder="描述这个本地账户的写作用途"
                />
              </label>
            </div>

            <div class="button-row">
              <button
                class="action-btn"
                type="button"
                :disabled="accountCreating || !createAccountDraft.name.trim()"
                title="创建新的本地账户并立即切换"
                @click="createLocalAccountFromSettings"
              >
                <Loader2
                  v-if="accountCreating"
                  :size="14"
                  class="spin"
                />
                <UserPlus
                  v-else
                  :size="14"
                />
                <span>{{ accountCreating ? '创建中...' : '创建并切换本地账户' }}</span>
              </button>
            </div>
          </section>
        </section>

        <section
          v-else-if="currentTab === 'appearance'"
          class="settings-section-stack"
        >
          <section
            id="appearance-theme"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('appearance-theme') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  主题与主色
                </h2>
                <p class="card-subtitle">
                  这些值会实时同步到全局 CSS 变量。
                </p>
              </div>
            </header>

            <div class="field-grid">
              <label class="field">
                <span>主题</span>
                <select v-model="settingsStore.settings.appearance.theme">
                  <option value="light">
                    Light
                  </option>
                  <option value="dark">
                    Dark
                  </option>
                  <option value="system">
                    System
                  </option>
                </select>
              </label>
              <label class="field">
                <span>主色</span>
                <div class="color-field">
                  <input
                    v-model="settingsStore.settings.appearance.accentColor"
                    type="color"
                  >
                  <input
                    v-model="settingsStore.settings.appearance.accentColor"
                    type="text"
                    placeholder="#D32F2F"
                  >
                </div>
              </label>
            </div>
          </section>

          <section
            id="appearance-typography"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('appearance-typography') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  排版与侧栏宽度
                </h2>
                <p class="card-subtitle">
                  所有变更会直接影响 Hub、Workstation 和编辑器视图。
                </p>
              </div>
            </header>

            <div class="field-grid">
              <label class="field">
                <span>字体家族</span>
                <select v-model="settingsStore.settings.appearance.fontFamily">
                  <option value="serif">
                    Serif
                  </option>
                  <option value="sans">
                    Sans
                  </option>
                  <option value="kai">
                    Kai
                  </option>
                  <option value="mono">
                    Mono
                  </option>
                </select>
              </label>
              <label class="field">
                <span>减少动效</span>
                <input
                  v-model="settingsStore.settings.appearance.reducedMotion"
                  type="checkbox"
                >
              </label>
              <label class="field field--full">
                <span>字号 {{ settingsStore.settings.appearance.fontSize }}px</span>
                <input
                  v-model.number="settingsStore.settings.appearance.fontSize"
                  type="range"
                  min="12"
                  max="24"
                >
              </label>
              <label class="field field--full">
                <span>行高 {{ settingsStore.settings.appearance.lineHeight.toFixed(1) }}</span>
                <input
                  v-model.number="settingsStore.settings.appearance.lineHeight"
                  type="range"
                  min="1.4"
                  max="2.4"
                  step="0.1"
                >
              </label>
              <label class="field field--full">
                <span>侧栏宽度 {{ settingsStore.settings.appearance.sidebarWidth }}px</span>
                <input
                  v-model.number="settingsStore.settings.appearance.sidebarWidth"
                  type="range"
                  min="180"
                  max="400"
                >
              </label>
            </div>
          </section>
        </section>

        <section
          v-else-if="currentTab === 'editor'"
          class="settings-section-stack"
        >
          <section
            id="editor-writing"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('editor-writing') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  写作体验
                </h2>
                <p class="card-subtitle">
                  已接入 EditorPanel 的自动保存、换行、行号与高亮开关。
                </p>
              </div>
            </header>

            <div class="field-grid">
              <label class="field">
                <span>自动保存</span>
                <input
                  v-model="settingsStore.settings.editor.autoSave"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>自动保存间隔（秒）</span>
                <input
                  v-model.number="settingsStore.settings.editor.autoSaveInterval"
                  type="number"
                  min="10"
                  max="300"
                >
              </label>
              <label class="field">
                <span>拼写检查</span>
                <input
                  v-model="settingsStore.settings.editor.spellCheck"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>编辑模式</span>
                <select v-model="settingsStore.settings.editor.editorMode">
                  <option value="typora">Typora 即时渲染</option>
                  <option value="source">源码双栏</option>
                </select>
              </label>
              <label class="field">
                <span>纸张宽度</span>
                <select v-model="settingsStore.settings.editor.editorWidth">
                  <option value="narrow">窄栏</option>
                  <option value="medium">中等</option>
                  <option value="wide">宽栏</option>
                  <option value="full">全宽</option>
                </select>
              </label>
              <label class="field">
                <span>自动换行</span>
                <input
                  v-model="settingsStore.settings.editor.wordWrap"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>Tab 宽度</span>
                <input
                  v-model.number="settingsStore.settings.editor.tabSize"
                  type="number"
                  min="2"
                  max="8"
                >
              </label>
              <label class="field">
                <span>显示行号</span>
                <input
                  v-model="settingsStore.settings.editor.showLineNumbers"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>高亮当前行</span>
                <input
                  v-model="settingsStore.settings.editor.highlightActiveLine"
                  type="checkbox"
                >
              </label>
            </div>
          </section>

          <section
            id="editor-enhancement"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('editor-enhancement') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  增强能力
                </h2>
                <p class="card-subtitle">
                  MarkdownHints、智能标点、括号匹配与写作目标。
                </p>
              </div>
            </header>

            <div class="field-grid">
              <label class="field">
                <span>Markdown 提示</span>
                <input
                  v-model="settingsStore.settings.editor.markdownHints"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>智能标点</span>
                <input
                  v-model="settingsStore.settings.editor.smartPunctuation"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>打字机模式</span>
                <input
                  v-model="settingsStore.settings.editor.typewriterMode"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>括号匹配</span>
                <input
                  v-model="settingsStore.settings.editor.bracketMatching"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>启用写作目标</span>
                <input
                  v-model="settingsStore.settings.editor.writingGoal.enabled"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>显示进度条</span>
                <input
                  v-model="settingsStore.settings.editor.writingGoal.showProgress"
                  type="checkbox"
                >
              </label>
              <label class="field field--full">
                <span>目标字数 {{ settingsStore.settings.editor.writingGoal.targetWords }}</span>
                <input
                  v-model.number="settingsStore.settings.editor.writingGoal.targetWords"
                  type="range"
                  min="100"
                  max="50000"
                  step="100"
                >
              </label>
            </div>
          </section>
        </section>

        <section
          v-else-if="currentTab === 'export'"
          class="settings-section-stack"
        >
          <section
            id="export-platform"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('export-platform') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  默认平台
                </h2>
                <p class="card-subtitle">
                  发布视图与导出链路会读取这里的默认平台。
                </p>
              </div>
            </header>

            <div class="field-grid">
              <label class="field">
                <span>默认平台</span>
                <select v-model="settingsStore.settings.export.defaultPlatform">
                  <option value="wechat">
                    微信公众号
                  </option>
                  <option value="xiaohongshu">
                    小红书
                  </option>
                  <option value="zhihu">
                    知乎
                  </option>
                </select>
              </label>
              <label class="field">
                <span>代码主题</span>
                <input
                  v-model="settingsStore.settings.export.codeTheme"
                  type="text"
                  placeholder="atom-one-dark"
                >
              </label>
              <label class="field">
                <span>代码块 mac 风格</span>
                <input
                  v-model="settingsStore.settings.export.macCodeBlock"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>显示行号</span>
                <input
                  v-model="settingsStore.settings.export.lineNumbers"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>转换脚注</span>
                <input
                  v-model="settingsStore.settings.export.convertFootnotes"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>首行缩进</span>
                <input
                  v-model="settingsStore.settings.export.textIndent"
                  type="checkbox"
                >
              </label>
              <label class="field field--full">
                <span>图片最大宽度 {{ settingsStore.settings.export.imageMaxWidth }}px</span>
                <input
                  v-model.number="settingsStore.settings.export.imageMaxWidth"
                  type="range"
                  min="320"
                  max="1080"
                  step="20"
                >
              </label>
            </div>
          </section>

          <section
            id="export-presets"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('export-presets') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  默认主题预设
                </h2>
                <p class="card-subtitle">
                  当前选择：{{ selectedThemePreset.name }}
                </p>
              </div>
            </header>

            <div class="preset-grid">
              <button
                v-for="preset in themePresets"
                :key="preset.id"
                class="preset-card"
                :class="{ 'preset-card--active': settingsStore.settings.export.defaultPresetId === preset.id }"
                type="button"
                :title="preset.description"
                @click="settingsStore.settings.export.defaultPresetId = preset.id"
              >
                <span class="preset-card__name">{{ preset.name }}</span>
                <span class="preset-card__description">{{ preset.description }}</span>
              </button>
            </div>
          </section>
        </section>

        <section
          v-else-if="currentTab === 'ai'"
          class="settings-section-stack"
        >
          <section
            id="ai-provider"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('ai-provider') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  Provider 与模型
                </h2>
                <p class="card-subtitle">
                  这些参数会直接驱动 AI store 的 provider computed。
                </p>
              </div>
            </header>

            <div class="field-grid">
              <label class="field">
                <span>Provider</span>
                <select v-model="settingsStore.settings.ai.provider">
                  <option value="openai">
                    OpenAI
                  </option>
                  <option value="anthropic">
                    Anthropic
                  </option>
                  <option value="deepseek">
                    DeepSeek
                  </option>
                  <option value="ollama">
                    Ollama
                  </option>
                  <option value="none">
                    禁用
                  </option>
                </select>
              </label>
              <label class="field">
                <span>Base URL</span>
                <input
                  v-model="settingsStore.settings.ai.baseUrl"
                  type="text"
                  placeholder="https://api.example.com/v1"
                >
              </label>
              <label class="field field--full">
                <span>API Key</span>
                <div class="secret-field">
                  <input
                    v-model="settingsStore.settings.ai.apiKey"
                    :type="revealApiKey ? 'text' : 'password'"
                    placeholder="输入 Provider API Key"
                  >
                  <button
                    class="ghost-btn"
                    type="button"
                    :title="revealApiKey ? '隐藏 API Key' : '显示 API Key'"
                    @click="revealApiKey = !revealApiKey"
                  >
                    <Eye
                      v-if="!revealApiKey"
                      :size="14"
                    />
                    <EyeOff
                      v-else
                      :size="14"
                    />
                  </button>
                </div>
              </label>
              <label class="field">
                <span>模型</span>
                <input
                  v-model="settingsStore.settings.ai.model"
                  type="text"
                  placeholder="Qwen/Qwen3-8B"
                >
              </label>
              <label class="field">
                <span>最大 Tokens</span>
                <input
                  v-model.number="settingsStore.settings.ai.maxTokens"
                  type="number"
                  min="100"
                  max="8000"
                >
              </label>
              <label class="field field--full">
                <span>Temperature {{ settingsStore.settings.ai.temperature.toFixed(1) }}</span>
                <input
                  v-model.number="settingsStore.settings.ai.temperature"
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                >
              </label>
            </div>
          </section>

          <section
            id="ai-connection"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('ai-connection') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  连接测试
                </h2>
                <p class="card-subtitle">
                  Ollama 模型列表会直接从 {{ settingsStore.settings.ai.ollamaUrl }} 读取。
                </p>
              </div>
              <div class="button-row">
                <button
                  class="action-btn"
                  type="button"
                  :disabled="aiTesting"
                  title="测试 AI 连接"
                  @click="testAIConnection"
                >
                  <RefreshCw
                    v-if="aiTesting"
                    :size="14"
                    class="spin"
                  />
                  <Sparkles
                    v-else
                    :size="14"
                  />
                  <span>{{ aiTesting ? '测试中...' : '测试连接' }}</span>
                </button>
                <button
                  v-if="settingsStore.settings.ai.provider === 'ollama'"
                  class="secondary-btn"
                  type="button"
                  :disabled="ollamaLoading"
                  title="刷新 Ollama 模型"
                  @click="loadOllamaModels"
                >
                  <Loader2
                    v-if="ollamaLoading"
                    :size="14"
                    class="spin"
                  />
                  <RefreshCw
                    v-else
                    :size="14"
                  />
                  <span>{{ ollamaLoading ? '读取中...' : '刷新模型' }}</span>
                </button>
              </div>
            </header>

            <div class="field-grid">
              <label class="field field--full">
                <span>Ollama URL</span>
                <input
                  v-model="settingsStore.settings.ai.ollamaUrl"
                  type="text"
                  placeholder="http://localhost:11434"
                >
              </label>
              <label
                v-if="ollamaModels.length > 0"
                class="field field--full"
              >
                <span>本地模型</span>
                <select v-model="settingsStore.settings.ai.model">
                  <option
                    v-for="model in ollamaModels"
                    :key="model"
                    :value="model"
                  >
                    {{ model }}
                  </option>
                </select>
              </label>
            </div>

            <p
              v-if="aiConnectionMessage"
              class="helper-text"
            >
              {{ aiConnectionMessage }}
            </p>
          </section>
        </section>

        <section
          v-else-if="currentTab === 'data'"
          class="settings-section-stack"
        >
          <section
            id="data-storage"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('data-storage') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  存储与数据库统计
                </h2>
                <p class="card-subtitle">
                  浏览器配额 {{ storageUsageLabel }} / {{ storageQuotaLabel }}
                </p>
              </div>
              <span
                class="status-pill"
                :class="`status-pill--${storageRatio > 80 ? 'error' : 'success'}`"
              >
                {{ storageRatio }}%
              </span>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-card__label">文章数量</span>
                <strong>{{ databaseSize?.tables.articles ?? 0 }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">文档数量</span>
                <strong>{{ databaseSize?.tables.documents ?? 0 }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">版本数量</span>
                <strong>{{ databaseSize?.tables.versions ?? 0 }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">素材数量</span>
                <strong>{{ databaseSize?.tables.assets ?? 0 }}</strong>
              </div>
            </div>
          </section>

          <section
            id="data-import"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('data-import') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  Markdown 文件迁移
                </h2>
                <p class="card-subtitle">
                  通过真实文件选择器导入 Markdown / HTML / TXT。
                </p>
              </div>
              <button
                class="action-btn"
                type="button"
                :disabled="dataBusy"
                title="导入文件"
                @click="importMarkdownFiles"
              >
                <FileText :size="14" />
                <span>{{ dataBusy ? '处理中...' : '导入文件' }}</span>
              </button>
            </header>

            <div
              v-if="importSummary"
              class="result-box"
            >
              <p>成功 {{ importSummary.success }}，失败 {{ importSummary.failed }}</p>
              <p
                v-for="error in importSummary.errors"
                :key="error"
                class="helper-text helper-text--error"
              >
                {{ error }}
              </p>
            </div>
          </section>

          <section
            id="data-backup"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('data-backup') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  设置与数据库快照
                </h2>
                <p class="card-subtitle">
                  设置保存在 localStorage，快照覆盖完整 IndexedDB。
                </p>
              </div>
            </header>

            <div class="button-row">
              <button
                class="action-btn"
                type="button"
                title="导出设置 JSON"
                @click="exportSettingsFile"
              >
                <Download :size="14" />
                <span>导出设置</span>
              </button>
              <button
                class="secondary-btn"
                type="button"
                title="导入设置 JSON"
                @click="openSettingsImport"
              >
                <Upload :size="14" />
                <span>导入设置</span>
              </button>
              <button
                class="action-btn"
                type="button"
                :disabled="snapshotBusy"
                title="导出 IndexedDB 快照"
                @click="exportDatabaseSnapshot"
              >
                <Database :size="14" />
                <span>{{ snapshotBusy ? '处理中...' : '导出快照' }}</span>
              </button>
              <button
                class="secondary-btn"
                type="button"
                :disabled="snapshotBusy"
                title="恢复 IndexedDB 快照"
                @click="openSnapshotImport"
              >
                <Upload :size="14" />
                <span>恢复快照</span>
              </button>
            </div>
          </section>

          <section
            id="data-danger"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('data-danger') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  危险操作
                </h2>
                <p class="card-subtitle">
                  不做 mock，不做空壳，所有操作都直接落到真实 Dexie 表。
                </p>
              </div>
            </header>

            <div class="button-row">
              <button
                class="danger-btn"
                type="button"
                title="清空文章相关表"
                @click="clearArticlesData"
              >
                <Trash2 :size="14" />
                <span>清空文章</span>
              </button>
              <button
                class="danger-btn"
                type="button"
                title="清理素材库"
                @click="clearAssetsData"
              >
                <Image :size="14" />
                <span>清理素材</span>
              </button>
              <button
                class="secondary-btn"
                type="button"
                title="重置设置"
                @click="resetSettingsToDefault"
              >
                <RefreshCw :size="14" />
                <span>重置设置</span>
              </button>
            </div>
          </section>
        </section>

        <section
          v-else-if="currentTab === 'sync'"
          class="settings-section-stack"
        >
          <section
            id="sync-target"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('sync-target') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  同步目标
                </h2>
                <p class="card-subtitle">
                  使用草稿表单规避无效 URL 直接写入 settings 的问题。
                </p>
              </div>
              <div class="button-row">
                <button
                  class="secondary-btn"
                  type="button"
                  :disabled="syncTesting"
                  title="测试同步目标连接"
                  @click="testSyncConnection"
                >
                  <RefreshCw
                    v-if="syncTesting"
                    :size="14"
                    class="spin"
                  />
                  <Cloud
                    v-else
                    :size="14"
                  />
                  <span>{{ syncTesting ? '测试中...' : '连接测试' }}</span>
                </button>
                <button
                  class="action-btn"
                  type="button"
                  title="保存同步目标"
                  @click="applySyncTarget"
                >
                  <Save :size="14" />
                  <span>保存目标</span>
                </button>
              </div>
            </header>

            <div class="field-grid">
              <label class="field field--full">
                <span>目标类型</span>
                <select v-model="syncTargetDraft.type">
                  <option value="none">
                    未配置
                  </option>
                  <option value="webdav">
                    WebDAV
                  </option>
                  <option value="s3">
                    S3
                  </option>
                  <option value="rest">
                    REST API
                  </option>
                </select>
              </label>

              <template v-if="syncTargetDraft.type === 'webdav'">
                <label class="field field--full">
                  <span>WebDAV URL</span>
                  <input
                    v-model="syncTargetDraft.url"
                    type="text"
                    placeholder="https://example.com/webdav"
                  >
                </label>
                <label class="field">
                  <span>用户名</span>
                  <input
                    v-model="syncTargetDraft.username"
                    type="text"
                  >
                </label>
                <label class="field">
                  <span>密码</span>
                  <div class="secret-field">
                    <input
                      v-model="syncTargetDraft.password"
                      :type="revealSyncSecret ? 'text' : 'password'"
                    >
                    <button
                      class="ghost-btn"
                      type="button"
                      @click="revealSyncSecret = !revealSyncSecret"
                    >
                      <Eye
                        v-if="!revealSyncSecret"
                        :size="14"
                      />
                      <EyeOff
                        v-else
                        :size="14"
                      />
                    </button>
                  </div>
                </label>
              </template>

              <template v-else-if="syncTargetDraft.type === 's3'">
                <label class="field field--full">
                  <span>Endpoint</span>
                  <input
                    v-model="syncTargetDraft.endpoint"
                    type="text"
                    placeholder="https://s3.example.com"
                  >
                </label>
                <label class="field">
                  <span>Access Key</span>
                  <input
                    v-model="syncTargetDraft.accessKeyId"
                    type="text"
                  >
                </label>
                <label class="field">
                  <span>Secret Key</span>
                  <input
                    v-model="syncTargetDraft.secretAccessKey"
                    type="password"
                  >
                </label>
                <label class="field">
                  <span>Bucket</span>
                  <input
                    v-model="syncTargetDraft.bucket"
                    type="text"
                  >
                </label>
                <label class="field">
                  <span>Region</span>
                  <input
                    v-model="syncTargetDraft.region"
                    type="text"
                  >
                </label>
              </template>

              <template v-else-if="syncTargetDraft.type === 'rest'">
                <label class="field field--full">
                  <span>REST URL</span>
                  <input
                    v-model="syncTargetDraft.restUrl"
                    type="text"
                    placeholder="https://api.example.com/sync"
                  >
                </label>
                <label class="field field--full">
                  <span>Bearer Token</span>
                  <input
                    v-model="syncTargetDraft.token"
                    type="password"
                  >
                </label>
              </template>
            </div>
          </section>

          <section
            id="sync-policy"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('sync-policy') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  同步策略
                </h2>
                <p class="card-subtitle">
                  自动同步状态会直接驱动 sync store。
                </p>
              </div>
            </header>

            <div class="field-grid">
              <label class="field">
                <span>启用同步</span>
                <input
                  v-model="settingsStore.settings.sync.enabled"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>自动同步间隔</span>
                <select v-model="settingsStore.settings.sync.interval">
                  <option value="5m">5 分钟</option>
                  <option value="15m">15 分钟</option>
                  <option value="30m">30 分钟</option>
                  <option value="1h">1 小时</option>
                  <option value="manual">手动</option>
                </select>
              </label>
              <label class="field">
                <span>冲突策略</span>
                <select v-model="settingsStore.settings.sync.conflictStrategy">
                  <option value="local-wins">本地优先</option>
                  <option value="remote-wins">远端优先</option>
                  <option value="manual">手动合并</option>
                </select>
              </label>
              <label class="field">
                <span>端对端加密</span>
                <input
                  v-model="settingsStore.settings.sync.encryptionEnabled"
                  type="checkbox"
                >
              </label>
            </div>

            <div class="category-chip-group">
              <button
                v-for="category in categoryStore.categories"
                :key="category.id"
                class="chip-btn"
                :class="{ 'chip-btn--active': settingsStore.settings.sync.selectedCategoryIds.includes(category.id) }"
                type="button"
                @click="toggleSyncCategory(category.id)"
              >
                {{ category.name }}
              </button>
              <p
                v-if="categoryStore.categories.length === 0"
                class="helper-text"
              >
                暂无分类，当前为全量同步。
              </p>
            </div>
          </section>

          <section
            id="sync-security"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('sync-security') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  同步加密与主密钥
                </h2>
                <p class="card-subtitle">
                  当前同步运行时依赖主密钥解锁；恢复密钥包用于离线备份与迁移。
                </p>
              </div>
              <span
                class="status-pill"
                :class="`status-pill--${masterKeyStatusTone}`"
              >
                {{ masterKeyStatusLabel }}
              </span>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-card__label">端对端加密</span>
                <strong>{{ settingsStore.settings.sync.encryptionEnabled ? '已启用' : '已关闭' }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">主密钥运行时</span>
                <strong>{{ masterKeyStatusLabel }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">恢复密钥</span>
                <strong>{{ recoveryBundleSummary }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">密码策略</span>
                <strong>{{ passwordPolicyHint }}</strong>
              </div>
            </div>

            <p class="helper-text">
              {{ masterKeyStatusDescription }}
            </p>
            <p class="helper-text">
              同步导出或远端上传时会临时申请可导出主密钥；日常缓存仍保持不可导出，避免长期暴露原始密钥字节。
            </p>

            <div class="button-row">
              <button
                class="action-btn"
                type="button"
                title="初始化或解锁主密钥"
                :disabled="masterKeyBusy"
                @click="openMasterKeyDialog('unlock')"
              >
                <Shield :size="14" />
                <span>{{ masterKeyUnlocked ? '重新解锁主密钥' : '初始化 / 解锁主密钥' }}</span>
              </button>
              <button
                class="secondary-btn"
                type="button"
                title="导出恢复密钥"
                :disabled="masterKeyBusy || !masterKeyUnlocked"
                @click="openMasterKeyDialog('export')"
              >
                <Download :size="14" />
                <span>导出恢复密钥</span>
              </button>
              <button
                class="secondary-btn"
                type="button"
                title="导入恢复密钥"
                :disabled="masterKeyBusy"
                @click="openMasterKeyDialog('import')"
              >
                <Upload :size="14" />
                <span>导入恢复密钥</span>
              </button>
              <button
                class="ghost-btn"
                type="button"
                title="刷新主密钥状态"
                :disabled="masterKeyBusy"
                @click="refreshMasterKeyRuntimeState"
              >
                <RefreshCw :size="14" />
                <span>刷新状态</span>
              </button>
            </div>

            <div
              v-if="hasCachedRecoveryBundle"
              class="result-box"
            >
              <p>最近一次恢复密钥已缓存在当前会话，关闭页面后需要重新导出。</p>
              <div class="button-row">
                <button
                  class="secondary-btn"
                  type="button"
                  title="复制恢复密钥包"
                  @click="copyRecoveryBundle"
                >
                  <Copy :size="14" />
                  <span>复制恢复密钥</span>
                </button>
                <button
                  class="secondary-btn"
                  type="button"
                  title="下载恢复密钥包"
                  @click="downloadRecoveryBundle"
                >
                  <Download :size="14" />
                  <span>下载恢复密钥</span>
                </button>
              </div>
            </div>
          </section>

          <section
            id="sync-runtime"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('sync-runtime') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  同步状态与历史
                </h2>
                <p class="card-subtitle">
                  {{ syncSummaryText }}
                </p>
              </div>
              <div class="button-row">
                <span
                  class="status-pill"
                  :class="`status-pill--${syncStatusTone}`"
                >
                  {{ syncStore.status }}
                </span>
                <button
                  class="action-btn"
                  type="button"
                  :disabled="syncBusy"
                  title="立即同步"
                  @click="runManualSync"
                >
                  <RefreshCw
                    v-if="syncBusy"
                    :size="14"
                    class="spin"
                  />
                  <Cloud
                    v-else
                    :size="14"
                  />
                  <span>{{ syncBusy ? '同步中...' : '立即同步' }}</span>
                </button>
              </div>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-card__label">最后同步</span>
                <strong>{{ formatDateTime(syncStore.lastSyncAt) }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">待同步变更</span>
                <strong>{{ syncStore.pendingCount }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">冲突数量</span>
                <strong>{{ syncStore.conflictCount }}</strong>
              </div>
            </div>

            <div
              v-if="syncStore.conflicts.length > 0"
              class="conflict-list"
            >
              <article
                v-for="conflict in syncStore.conflicts"
                :key="conflict.id"
                class="conflict-card"
              >
                <div>
                  <h3>文档 {{ conflict.documentId.slice(0, 8) }}</h3>
                  <p>本地 v{{ conflict.localVersion }} / 远端 v{{ conflict.remoteVersion }}</p>
                </div>
                <div class="button-row">
                  <button
                    class="secondary-btn"
                    type="button"
                    @click="resolveSyncConflict(conflict.documentId, 'local-wins')"
                  >
                    保留本地
                  </button>
                  <button
                    class="secondary-btn"
                    type="button"
                    @click="resolveSyncConflict(conflict.documentId, 'remote-wins')"
                  >
                    采用远端
                  </button>
                  <button
                    class="secondary-btn"
                    type="button"
                    @click="resolveSyncConflict(conflict.documentId, 'manual')"
                  >
                    手动处理
                  </button>
                </div>
              </article>
            </div>

            <div
              v-if="syncLogLoading"
              class="empty-box"
            >
              同步日志加载中...
            </div>
            <div
              v-else-if="syncLogs.length === 0"
              class="empty-box"
            >
              还没有同步日志。
            </div>
            <div
              v-else
              class="log-list"
            >
              <article
                v-for="log in syncLogs.slice(0, 12)"
                :key="log.id"
                class="log-item"
              >
                <div>
                  <strong>{{ formatSyncAction(log) }}</strong>
                  <p>{{ log.details }}</p>
                </div>
                <div class="log-meta">
                  <span>{{ formatSyncStatus(log) }}</span>
                  <span>{{ formatDateTime(log.timestamp) }}</span>
                </div>
              </article>
            </div>
          </section>
        </section>

        <section
          v-else-if="currentTab === 'shortcuts'"
          class="settings-section-stack"
        >
          <section
            id="shortcuts-map"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('shortcuts-map') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  快捷键映射
                </h2>
                <p class="card-subtitle">
                  Workstation 已接入 save / bold / italic / undo / redo / outline / focusMode。
                </p>
              </div>
            </header>

            <div class="shortcut-section-list">
              <section
                v-for="group in shortcutSections"
                :key="group.id"
                class="shortcut-section"
              >
                <header class="shortcut-section__header">
                  <div>
                    <p class="shortcut-section__eyebrow">{{ group.label }}</p>
                    <h3>{{ group.label }}</h3>
                  </div>
                  <span class="shortcut-section__count">{{ group.items.length }} 项</span>
                </header>
                <p class="shortcut-section__description">
                  {{ group.description }}
                </p>
                <div class="shortcut-list">
              <article
                v-for="shortcut in group.items"
                :key="shortcut.id"
                class="shortcut-item"
              >
                <div>
                  <span class="shortcut-item__group">{{ group.label }}</span>
                  <h3>{{ shortcut.label }}</h3>
                  <p>{{ shortcut.description }}</p>
                </div>
                <div class="shortcut-actions">
                  <code>{{ settingsStore.settings.shortcuts[shortcut.id] || '未设置' }}</code>
                  <button
                    class="secondary-btn"
                    type="button"
                    @click="startShortcutRecording(shortcut.id)"
                  >
                    {{ editingShortcut === shortcut.id ? '按下组合键' : '录制' }}
                  </button>
                  <button
                    class="ghost-btn"
                    type="button"
                    @click="resetShortcut(shortcut.id)"
                  >
                    默认
                  </button>
                </div>
              </article>
                </div>
              </section>
            </div>

            <p
              v-if="shortcutConflict"
              class="helper-text helper-text--error"
            >
              {{ shortcutConflict }}
            </p>
          </section>
        </section>

        <section
          v-else-if="currentTab === 'advanced'"
          class="settings-section-stack"
        >
          <section
            id="advanced-runtime"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('advanced-runtime') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  运行级别
                </h2>
                <p class="card-subtitle">
                  控制日志级别与性能指标面板。
                </p>
              </div>
            </header>

            <div class="field-grid">
              <label class="field">
                <span>日志级别</span>
                <select v-model="settingsStore.settings.advanced.logLevel">
                  <option value="off">关闭</option>
                  <option value="error">Error</option>
                  <option value="warn">Warn</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>
              </label>
              <label class="field">
                <span>性能指标</span>
                <input
                  v-model="settingsStore.settings.advanced.showPerformanceMetrics"
                  type="checkbox"
                >
              </label>
              <div class="stat-card">
                <span class="stat-card__label">运行时日志</span>
                <strong>{{ runtimeLogLevel }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">性能面板 Flag</span>
                <strong>{{ performanceFlag.enabled.value ? '已启用' : '已关闭' }}</strong>
              </div>
              <div class="stat-card field--full">
                <span class="stat-card__label">数据库总记录数</span>
                <strong>{{ databaseSize?.total ?? 0 }}</strong>
              </div>
            </div>
            <p class="helper-text">
              当前网络出站：{{ proxyRuntimeDescription }}
            </p>
          </section>

          <section
            id="advanced-flags"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('advanced-flags') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  实验功能
                </h2>
                <p class="card-subtitle">
                  开启或关闭 feature flags，修改会直接写入 settings store。
                </p>
              </div>
            </header>

            <div class="flag-list">
              <label
                v-for="flag in settingsStore.settings.advanced.featureFlags"
                :key="flag.id"
                class="flag-item"
              >
                <div>
                  <strong>{{ flag.name }}</strong>
                  <p>{{ flag.description }}</p>
                </div>
                <input
                  v-model="flag.enabled"
                  type="checkbox"
                >
              </label>
            </div>
          </section>

          <section
            id="advanced-proxy"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('advanced-proxy') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  代理设置
                </h2>
                <p class="card-subtitle">
                  网络层参数会持久化到 settings.advanced.proxy。
                </p>
              </div>
            </header>

            <div class="field-grid">
              <label class="field">
                <span>启用代理</span>
                <input
                  v-model="settingsStore.settings.advanced.proxy.enabled"
                  type="checkbox"
                >
              </label>
              <label class="field">
                <span>协议</span>
                <select v-model="settingsStore.settings.advanced.proxy.protocol">
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </label>
              <label class="field">
                <span>主机</span>
                <input
                  v-model="settingsStore.settings.advanced.proxy.host"
                  type="text"
                  placeholder="127.0.0.1"
                >
              </label>
              <label class="field">
                <span>端口</span>
                <input
                  v-model.number="settingsStore.settings.advanced.proxy.port"
                  type="number"
                  min="1"
                  max="65535"
                >
              </label>
              <label class="field">
                <span>用户名</span>
                <input
                  v-model="settingsStore.settings.advanced.proxy.username"
                  type="text"
                >
              </label>
              <label class="field">
                <span>密码</span>
                <div class="secret-field">
                  <input
                    v-model="settingsStore.settings.advanced.proxy.password"
                    :type="revealProxyPassword ? 'text' : 'password'"
                  >
                  <button
                    class="ghost-btn"
                    type="button"
                    @click="revealProxyPassword = !revealProxyPassword"
                  >
                    <Eye
                      v-if="!revealProxyPassword"
                      :size="14"
                    />
                    <EyeOff
                      v-else
                      :size="14"
                    />
                  </button>
                </div>
              </label>
            </div>
          </section>

          <section
            id="advanced-profiles"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('advanced-profiles') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  设置 Profiles
                </h2>
                <p class="card-subtitle">
                  将当前 settings 快照保存为可切换档案。
                </p>
              </div>
              <button
                class="action-btn"
                type="button"
                :disabled="profileBusy"
                @click="saveCurrentProfile"
              >
                <Save :size="14" />
                <span>{{ profileBusy ? '处理中...' : '保存为新 Profile' }}</span>
              </button>
            </header>

            <div
              v-if="settingsProfiles.length === 0"
              class="empty-box"
            >
              还没有保存任何设置 Profile。
            </div>
            <div
              v-else
              class="profile-list"
            >
              <article
                v-for="profile in settingsProfiles"
                :key="profile.id"
                class="profile-item"
              >
                <div>
                  <h3>{{ profile.name }}</h3>
                  <p>{{ formatDateTime(profile.updatedAt) }}</p>
                </div>
                <div class="button-row">
                  <button
                    class="secondary-btn"
                    type="button"
                    @click="applyProfile(profile)"
                  >
                    应用
                  </button>
                  <button
                    class="ghost-btn"
                    type="button"
                    @click="renameProfile(profile)"
                  >
                    重命名
                  </button>
                  <button
                    class="danger-btn"
                    type="button"
                    @click="removeProfile(profile.id)"
                  >
                    删除
                  </button>
                </div>
              </article>
            </div>
          </section>

          <section
            id="advanced-cache"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('advanced-cache') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  缓存管理
                </h2>
                <p class="card-subtitle">
                  管理浏览器 Cache API 存储和内存中的预览缓存。
                </p>
              </div>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-card__label">浏览器缓存</span>
                <strong>{{ cacheSize }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">预览缓存</span>
                <strong>{{ previewCacheActive ? '活跃' : '空闲' }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">Service Worker</span>
                <strong>{{ swRegistered ? '已注册' : '未注册' }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">代理状态</span>
                <strong>{{ proxyRuntimeConfig.enabled ? '已生效' : '未启用' }}</strong>
              </div>
            </div>

            <div class="button-row">
              <button
                class="secondary-btn"
                type="button"
                title="清除浏览器中的渲染缓存"
                @click="clearRenderCache"
              >
                <Trash2 :size="14" />
                <span>清除渲染缓存</span>
              </button>
              <button
                class="secondary-btn"
                type="button"
                title="清除内存中的预览缓存"
                @click="clearPreviewCache"
              >
                <Trash2 :size="14" />
                <span>清除预览缓存</span>
              </button>
            </div>
          </section>

          <section
            id="advanced-devtools"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('advanced-devtools') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  开发者工具
                </h2>
                <p class="card-subtitle">
                  查看运行时环境、数据库状态和编辑器内部状态。
                </p>
              </div>
              <button
                class="secondary-btn"
                type="button"
                title="导出当前调试信息"
                @click="exportDebugInfo"
              >
                <Download :size="14" />
                <span>导出调试信息</span>
              </button>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-card__label">Dexie 版本</span>
                <strong>v{{ dexieVersion }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">数据库总记录</span>
                <strong>{{ databaseSize?.total ?? 0 }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">TipTap 状态</span>
                <strong>{{ editorRuntimeStatus }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">编辑器节点数</span>
                <strong>{{ editorNodeCount }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">IndexedDB 表</span>
                <strong>{{ DATABASE_TABLES.length }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">浏览器存储</span>
                <strong>{{ storageUsageLabel }}</strong>
              </div>
            </div>
          </section>

          <section
            v-if="performanceFlag.enabled.value"
            id="advanced-performance"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('advanced-performance') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  性能监控
                </h2>
                <p class="card-subtitle">
                  实时监控编辑器渲染性能和数据库 I/O 延迟。
                </p>
              </div>
            </header>

            <div
              v-if="performanceMetricsVisible"
              class="stats-grid"
            >
              <div class="stat-card">
                <span class="stat-card__label">编辑器渲染 FPS</span>
                <strong>{{ renderFPS }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">自动保存延迟</span>
                <strong>{{ autoSaveLatency }}ms</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">IndexedDB 延迟</span>
                <strong>{{ idbLatency }}ms</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">内存使用</span>
                <strong>{{ memoryUsage }}</strong>
              </div>
            </div>
            <div
              v-else
              class="empty-box"
            >
              运行时性能采样已关闭，请先在“运行级别”中打开性能指标开关。
            </div>

            <p class="helper-text">
              最近预览渲染：{{ lastPreviewRenderMetric ? `${lastPreviewRenderMetric.duration}ms` : '暂无记录' }}
              ，最近保存：{{ lastSaveMetric ? `${lastSaveMetric.duration}ms` : '暂无记录' }}。
            </p>
          </section>
        </section>

        <section
          v-else
          class="settings-section-stack"
        >
          <section
            id="about-meta"
            class="setting-card"
            :class="{ 'setting-card--highlight': isHighlighted('about-meta') }"
          >
            <header class="card-header">
              <div>
                <h2 class="card-title">
                  关于 InkForge
                </h2>
                <p class="card-subtitle">
                  当前运行信息与设计基线。
                </p>
              </div>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-card__label">版本</span>
                <strong>{{ APP_VERSION }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">设计语言</span>
                <strong>{{ DESIGN_LANGUAGE }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">同步状态</span>
                <strong>{{ syncStore.status }}</strong>
              </div>
              <div class="stat-card">
                <span class="stat-card__label">账户</span>
                <strong>{{ accountStore.displayName }}</strong>
              </div>
            </div>

            <div class="stack-list">
              <span
                v-for="item in TECH_STACK"
                :key="item"
                class="stack-pill"
              >
                {{ item }}
              </span>
            </div>
          </section>
        </section>

        <footer class="settings-footer">
          <div class="settings-footer__copy">
            <strong>{{ currentTabTitle.label }}</strong>
            <p>
              {{ currentTab === 'about' ? '此操作会恢复全部设置并重新同步当前运行态。' : '仅恢复当前分类，不影响其他分区的真实数据。' }}
            </p>
          </div>
          <button
            class="secondary-btn settings-footer__button"
            type="button"
            :title="currentTabResetLabel"
            @click="handleResetCurrentTab"
          >
            <RefreshCw :size="14" />
            <span>{{ currentTabResetLabel }}</span>
          </button>
        </footer>
      </main>
    </div>

    <div
      v-if="masterKeyDialogMode"
      class="settings-dialog-overlay"
      @click.self="closeMasterKeyDialog"
    >
      <form
        class="settings-dialog"
        @submit.prevent="submitMasterKeyDialog"
      >
        <header class="settings-dialog__header">
          <div>
            <h2 class="card-title">
              {{ masterKeyDialogTitle }}
            </h2>
            <p class="card-subtitle">
              {{ masterKeyDialogDescription }}
            </p>
          </div>
          <button
            class="ghost-btn"
            type="button"
            title="关闭主密钥对话框"
            @click="closeMasterKeyDialog"
          >
            ×
          </button>
        </header>

        <div class="settings-dialog__body">
          <template v-if="masterKeyDialogMode === 'unlock'">
            <label class="field field--full">
              <span>主密码</span>
              <div class="secret-field">
                <input
                  ref="masterKeyDialogPrimaryInputRef"
                  v-model="masterKeyDialogForm.password"
                  :type="revealMasterKeySecrets.password ? 'text' : 'password'"
                  placeholder="输入主密码以初始化或解锁主密钥"
                >
                <button
                  class="ghost-btn"
                  type="button"
                  title="切换主密码显示状态"
                  @click="revealMasterKeySecrets.password = !revealMasterKeySecrets.password"
                >
                  <Eye
                    v-if="!revealMasterKeySecrets.password"
                    :size="14"
                  />
                  <EyeOff
                    v-else
                    :size="14"
                  />
                </button>
              </div>
            </label>
          </template>

          <template v-else-if="masterKeyDialogMode === 'export'">
            <label class="field field--full">
              <span>导出密码</span>
              <div class="secret-field">
                <input
                  ref="masterKeyDialogPrimaryInputRef"
                  v-model="masterKeyDialogForm.exportPassword"
                  :type="revealMasterKeySecrets.exportPassword ? 'text' : 'password'"
                  placeholder="输入用于保护恢复密钥包的导出密码"
                >
                <button
                  class="ghost-btn"
                  type="button"
                  title="切换导出密码显示状态"
                  @click="revealMasterKeySecrets.exportPassword = !revealMasterKeySecrets.exportPassword"
                >
                  <Eye
                    v-if="!revealMasterKeySecrets.exportPassword"
                    :size="14"
                  />
                  <EyeOff
                    v-else
                    :size="14"
                  />
                </button>
              </div>
            </label>

            <div
              v-if="hasCachedRecoveryBundle"
              class="field field--full"
            >
              <span>恢复密钥包</span>
              <textarea
                v-model="lastExportedRecoveryBundle"
                class="settings-dialog__textarea"
                rows="10"
                readonly
              />
            </div>
          </template>

          <template v-else>
            <label class="field field--full">
              <span>恢复密钥包</span>
              <textarea
                ref="masterKeyDialogPrimaryInputRef"
                v-model="masterKeyDialogForm.bundleText"
                class="settings-dialog__textarea"
                rows="10"
                placeholder="粘贴恢复密钥包 JSON"
              />
            </label>
            <label class="field field--full">
              <span>导出密码</span>
              <div class="secret-field">
                <input
                  v-model="masterKeyDialogForm.exportPassword"
                  :type="revealMasterKeySecrets.exportPassword ? 'text' : 'password'"
                  placeholder="输入导出恢复密钥时设置的密码"
                >
                <button
                  class="ghost-btn"
                  type="button"
                  title="切换导出密码显示状态"
                  @click="revealMasterKeySecrets.exportPassword = !revealMasterKeySecrets.exportPassword"
                >
                  <Eye
                    v-if="!revealMasterKeySecrets.exportPassword"
                    :size="14"
                  />
                  <EyeOff
                    v-else
                    :size="14"
                  />
                </button>
              </div>
            </label>
            <label class="field field--full">
              <span>新主密码</span>
              <div class="secret-field">
                <input
                  v-model="masterKeyDialogForm.newPassword"
                  :type="revealMasterKeySecrets.newPassword ? 'text' : 'password'"
                  placeholder="输入新的主密码以重新包装主密钥"
                >
                <button
                  class="ghost-btn"
                  type="button"
                  title="切换新主密码显示状态"
                  @click="revealMasterKeySecrets.newPassword = !revealMasterKeySecrets.newPassword"
                >
                  <Eye
                    v-if="!revealMasterKeySecrets.newPassword"
                    :size="14"
                  />
                  <EyeOff
                    v-else
                    :size="14"
                  />
                </button>
              </div>
            </label>
          </template>

          <p class="helper-text">
            当前密码策略：{{ passwordPolicyHint }}
          </p>
          <p
            v-if="masterKeyDialogError"
            class="helper-text helper-text--error"
          >
            {{ masterKeyDialogError }}
          </p>
        </div>

        <footer class="settings-dialog__footer">
          <button
            class="ghost-btn"
            type="button"
            title="取消主密钥操作"
            :disabled="masterKeyBusy"
            @click="closeMasterKeyDialog"
          >
            取消
          </button>
          <button
            class="action-btn"
            type="submit"
            :disabled="masterKeyBusy"
            :title="masterKeyDialogSubmitLabel"
          >
            <Loader2
              v-if="masterKeyBusy"
              :size="14"
              class="spin"
            />
            <span>{{ masterKeyDialogSubmitLabel }}</span>
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.settings-view {
  min-height: 100vh;
  padding: 28px;
  background:
    radial-gradient(circle at top left, rgba(211, 47, 47, 0.08), transparent 28%),
    linear-gradient(180deg, #f6f5f2 0%, #eef1f4 100%);
  color: #263238;
}

.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.header-main {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #d32f2f;
}

.page-title {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.page-subtitle {
  margin: 8px 0 0;
  color: #607d8b;
  max-width: 640px;
}

.header-search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 320px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(96, 125, 139, 0.16);
  border-radius: 16px;
  min-height: 48px;
  box-shadow: 0 10px 30px rgba(38, 50, 56, 0.05);
}

.header-search input,
.field input,
.field select,
.field textarea {
  width: 100%;
  border: 1px solid rgba(96, 125, 139, 0.18);
  border-radius: 12px;
  padding: 11px 12px;
  background: rgba(255, 255, 255, 0.9);
  color: #263238;
  font: inherit;
}

.header-search input {
  border: none;
  background: transparent;
  padding-left: 0;
}

.header-search input:focus,
.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: rgba(211, 47, 47, 0.45);
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.12);
}

.search-results {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  left: 0;
  z-index: 20;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgba(96, 125, 139, 0.18);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 20px 40px rgba(38, 50, 56, 0.1);
  backdrop-filter: blur(10px);
}

.search-result,
.tab-link,
.ghost-btn,
.action-btn,
.secondary-btn,
.danger-btn,
.chip-btn,
.preset-card {
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease;
}

.search-result {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.search-result:hover {
  transform: translateY(-1px);
  background: rgba(211, 47, 47, 0.06);
}

.search-result__title {
  font-weight: 600;
}

.search-result__meta,
.search-empty,
.card-subtitle,
.helper-text,
.log-item p,
.shortcut-item p,
.profile-item p,
.flag-item p,
.tab-link__desc,
.stat-card__label,
.page-subtitle {
  font-size: 13px;
  color: #607d8b;
}

.notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
  border-radius: 14px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.88);
}

.notice--success {
  border-color: rgba(46, 125, 50, 0.2);
  color: #2e7d32;
}

.notice--error {
  border-color: rgba(198, 40, 40, 0.2);
  color: #c62828;
}

.notice--info {
  border-color: rgba(21, 101, 192, 0.2);
  color: #1565c0;
}

.notice-close {
  margin-left: auto;
  border: none;
  background: transparent;
  color: currentColor;
  font-size: 18px;
  cursor: pointer;
}

.settings-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(38, 50, 56, 0.28);
  backdrop-filter: blur(12px);
}

.settings-dialog {
  width: min(680px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 22px;
  border-radius: 28px;
  border: 1px solid rgba(96, 125, 139, 0.16);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 247, 250, 0.96));
  box-shadow: 0 28px 80px rgba(38, 50, 56, 0.18);
}

.settings-dialog__header,
.settings-dialog__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.settings-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 18px 0;
}

.settings-dialog__footer {
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.settings-dialog__textarea {
  min-height: 220px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  line-height: 1.5;
}

.settings-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;
  min-height: calc(100vh - 170px);
}

.settings-sidebar,
.settings-content {
  border: 1px solid rgba(96, 125, 139, 0.12);
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 40px rgba(38, 50, 56, 0.06);
}

.settings-sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 24px;
}

.tab-link {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid transparent;
  border-radius: 18px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.tab-link:hover,
.ghost-btn:hover,
.action-btn:hover,
.secondary-btn:hover,
.danger-btn:hover,
.preset-card:hover,
.chip-btn:hover {
  transform: translateY(-1px);
}

.tab-link--active {
  border-color: rgba(211, 47, 47, 0.18);
  background: linear-gradient(135deg, rgba(211, 47, 47, 0.12), rgba(211, 47, 47, 0.04));
  color: #b71c1c;
}

.tab-link__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tab-link__title,
.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #607d8b;
}

.settings-content {
  padding: 18px;
  border-radius: 28px;
  overflow: auto;
}

.settings-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding: 18px;
  border-radius: 22px;
  border: 1px dashed rgba(96, 125, 139, 0.18);
  background: rgba(255, 255, 255, 0.7);
}

.settings-footer__copy {
  min-width: 0;
}

.settings-footer__copy strong {
  display: block;
  color: #263238;
}

.settings-footer__copy p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #607d8b;
}

.settings-footer__button {
  flex-shrink: 0;
}

.settings-section-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-card {
  padding: 20px;
  border-radius: 22px;
  border: 1px solid rgba(96, 125, 139, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.setting-card--highlight {
  border-color: rgba(211, 47, 47, 0.35);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 0 0 3px rgba(211, 47, 47, 0.1);
}

.card-header,
.button-row,
.shortcut-actions,
.log-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-header {
  justify-content: space-between;
  margin-bottom: 18px;
}

.card-title {
  margin: 0;
  font-size: 18px;
  color: #263238;
}

.card-subtitle {
  margin: 6px 0 0;
}

.ghost-btn,
.action-btn,
.secondary-btn,
.danger-btn,
.chip-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  cursor: pointer;
  font: inherit;
}

.ghost-btn {
  border: 1px solid rgba(96, 125, 139, 0.16);
  background: transparent;
  color: #607d8b;
}

.action-btn {
  border: 1px solid rgba(211, 47, 47, 0.2);
  background: linear-gradient(135deg, #d32f2f, #b71c1c);
  color: #fff;
}

.secondary-btn,
.chip-btn {
  border: 1px solid rgba(96, 125, 139, 0.18);
  background: rgba(255, 255, 255, 0.88);
  color: #455a64;
}

.danger-btn {
  border: 1px solid rgba(198, 40, 40, 0.2);
  background: rgba(198, 40, 40, 0.08);
  color: #b71c1c;
}

.field-grid,
.stats-grid,
.preset-grid,
.flag-list,
.profile-list,
.shortcut-list,
.log-list,
.conflict-list {
  display: grid;
  gap: 14px;
}

.field-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
  font-size: 13px;
  font-weight: 600;
  color: #455a64;
}

.field small {
  color: #78909c;
}

.field--full {
  grid-column: 1 / -1;
}

.field textarea {
  resize: vertical;
}

.color-field,
.secret-field {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
}

.color-field input[type='color'] {
  width: 48px;
  padding: 4px;
}

.account-grid {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 18px;
}

.account-switch-list {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.account-switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(96, 125, 139, 0.14);
  background: rgba(255, 255, 255, 0.72);
}

.account-switch-item__meta {
  min-width: 0;
}

.account-switch-item__meta strong {
  display: block;
  color: #263238;
}

.account-switch-item__meta p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #607d8b;
}

.account-avatar-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-shell {
  width: 108px;
  height: 108px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(211, 47, 47, 0.16), rgba(211, 47, 47, 0.04));
  border: 1px solid rgba(211, 47, 47, 0.18);
  font-size: 32px;
  font-weight: 700;
  color: #b71c1c;
  overflow: hidden;
}

.avatar-shell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preset-grid,
.stats-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.preset-card,
.stat-card,
.result-box,
.empty-box,
.conflict-card,
.shortcut-item,
.flag-item,
.profile-item,
.log-item {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(96, 125, 139, 0.14);
  background: rgba(255, 255, 255, 0.72);
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}

.preset-card--active,
.chip-btn--active {
  border-color: rgba(211, 47, 47, 0.25);
  background: rgba(211, 47, 47, 0.08);
  color: #b71c1c;
}

.preset-card__name,
.stat-card strong,
.conflict-card h3,
.shortcut-item h3,
.profile-item h3 {
  font-weight: 700;
}

.category-chip-group,
.stack-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-pill,
.stack-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-pill--success {
  background: rgba(46, 125, 50, 0.12);
  color: #2e7d32;
}

.status-pill--error {
  background: rgba(198, 40, 40, 0.12);
  color: #c62828;
}

.status-pill--info {
  background: rgba(21, 101, 192, 0.12);
  color: #1565c0;
}

.stack-pill {
  background: rgba(96, 125, 139, 0.1);
  color: #455a64;
}

.helper-text--error {
  color: #c62828;
}

.shortcut-actions,
.profile-item .button-row {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.shortcut-actions code {
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(38, 50, 56, 0.06);
  color: #263238;
}

.shortcut-section-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.shortcut-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-section__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.shortcut-section__header h3 {
  margin: 4px 0 0;
  font-size: 18px;
  color: #263238;
}

.shortcut-section__eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d32f2f;
}

.shortcut-section__description {
  margin: 0;
  color: #607d8b;
}

.shortcut-section__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(211, 47, 47, 0.08);
  color: #b71c1c;
  font-size: 12px;
  font-weight: 700;
}

.log-item,
.profile-item,
.shortcut-item,
.flag-item,
.conflict-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.spin {
  animation: spin 900ms linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }

  .settings-sidebar {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .tab-link {
    width: auto;
    flex: 1 1 220px;
  }
}

@media (max-width: 860px) {
  .settings-view {
    padding: 18px;
  }

  .settings-header,
  .card-header,
  .account-grid,
  .settings-footer,
  .account-switch-item,
  .log-item,
  .profile-item,
  .shortcut-item,
  .flag-item,
  .conflict-card {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .header-search,
  .field-grid,
  .stats-grid,
  .preset-grid {
    min-width: 0;
    grid-template-columns: 1fr;
  }

  .button-row,
  .shortcut-actions {
    flex-wrap: wrap;
  }
}
</style>
