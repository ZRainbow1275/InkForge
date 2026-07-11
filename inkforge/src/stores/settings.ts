import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { z } from 'zod'
import {
  getDefaultLogLevel,
  logger,
  setLogLevel,
  type LogLevel,
} from '@/services/error'
import { createActivityLogger } from '@/services/activity-logger'
import {
  createSettingsMigrationSnapshot,
  prependSettingsMigrationSnapshot,
  previewSettingsMigration,
  summarizeSettingsMigrationDiff,
  type SettingsMigrationPreview,
  type SettingsMigrationResult,
  type SettingsMigrationValidationResult,
} from '@/services/settings-migration'
import {
  getDefaultSmartPunctuationRuleSettings,
  normalizeSmartPunctuationRuleSettings,
  type SmartPunctuationRuleSettings,
} from '@/services/smart-punctuation'
import {
  CUSTOM_CSS_MAX_LENGTH,
  CUSTOM_CSS_SUSPENDED_REASONS,
} from '@/services/custom-css'
import {
  UPDATER_DISABLED_REASON_VALUES,
  UPDATER_STATUS_VALUES,
  type UpdaterSettings,
} from '@/services/updater/types'

const EDITOR_MODE_VALUES = ['typora', 'source', 'preview'] as const
const EDITOR_WIDTH_VALUES = ['narrow', 'medium', 'wide', 'full'] as const
const LIST_ENTER_BEHAVIOR_VALUES = ['notion', 'typora'] as const
export const FEATURE_FLAG_KEYS = [
  'markdown-hints',
  'multi-tab',
  'ai-autocomplete',
  'performance-metrics',
] as const
const PROXY_PROTOCOL_VALUES = ['http', 'https', 'socks5'] as const
const LOG_LEVEL_VALUES = ['debug', 'info', 'warn', 'error'] as const
export const CURRENT_SETTINGS_SCHEMA_VERSION = 3

export const SETTINGS_TAB_VALUES = ['appearance', 'editor', 'export', 'ai', 'data', 'sync', 'audit', 'profiles', 'extensions', 'shortcuts', 'advanced', 'about'] as const
export const SETTING_SCOPE_VALUES = ['account', 'device', 'shared'] as const

export type EditorMode = typeof EDITOR_MODE_VALUES[number]
export type EditorWidth = typeof EDITOR_WIDTH_VALUES[number]
export type ListEnterBehavior = typeof LIST_ENTER_BEHAVIOR_VALUES[number]
export type FeatureFlagKey = typeof FEATURE_FLAG_KEYS[number]
export type ProxyProtocol = typeof PROXY_PROTOCOL_VALUES[number]
export type AdvancedLogLevel = typeof LOG_LEVEL_VALUES[number]
export type SettingsTabId = typeof SETTINGS_TAB_VALUES[number]
export type SettingScope = typeof SETTING_SCOPE_VALUES[number]

export interface SettingsRegistryItem {
  id: string
  tab: SettingsTabId
  path: string
  label: string
  description: string
  scope: SettingScope
  keywords: readonly string[]
  resettable: boolean
}

export const SETTINGS_REGISTRY: readonly SettingsRegistryItem[] = [
  { id: 'appearance.theme', tab: 'appearance', path: 'appearance.theme', label: '主题模式', description: '浅色、深色或跟随系统。', scope: 'account', keywords: ['theme', 'dark', 'light', 'system', '主题', '深色', '浅色'], resettable: true },
  { id: 'appearance.fontFamily', tab: 'appearance', path: 'appearance.fontFamily', label: '预览字体', description: '编辑器与预览区域的中文字体族。', scope: 'account', keywords: ['font', '字体', '宋体', '黑体', '楷体', 'mono'], resettable: true },
  { id: 'appearance.accentColor', tab: 'appearance', path: 'appearance.accentColor', label: '主题色', description: '全局强调色与按钮高亮色。', scope: 'account', keywords: ['accent', 'color', '主题色', '颜色', 'hex'], resettable: true },
  { id: 'appearance.typography', tab: 'appearance', path: 'appearance.typography', label: '排版细节', description: '段落、字距、标题和引用块样式。', scope: 'account', keywords: ['typography', 'paragraph', 'line-height', '排版', '段落', '字距'], resettable: true },
  { id: 'appearance.visualSystem', tab: 'appearance', path: 'appearance.visualSystem', label: '视觉系统基线', description: 'ThemeEngine、FontSystem 与 Typography 的实时 token 诊断。', scope: 'device', keywords: ['visual', 'token', 'theme-engine', 'font-system', '视觉', '主题引擎', '字体系统'], resettable: false },
  { id: 'editor.mode', tab: 'editor', path: 'editor.editorMode', label: '编辑模式', description: 'Typora、Source、Preview 三种编辑视图。', scope: 'account', keywords: ['editor', 'typora', 'source', 'preview', '编辑模式'], resettable: true },
  { id: 'editor.width', tab: 'editor', path: 'editor.editorWidth', label: '版心宽度', description: '纸张宽度的四档选择。', scope: 'account', keywords: ['width', 'paper', '版心', '宽度'], resettable: true },
  { id: 'editor.autosave', tab: 'editor', path: 'editor.autoSave', label: '自动保存', description: '编辑器自动保存与保存间隔。', scope: 'account', keywords: ['autosave', 'save', '自动保存'], resettable: true },
  { id: 'editor.listEnterBehavior', tab: 'editor', path: 'editor.listEnterBehavior', label: '嵌套列表 Enter', description: '控制空嵌套列表项 Enter 是逐级减缩还是沿用 Typora 默认行为。', scope: 'account', keywords: ['list', 'enter', 'notion', 'typora', '列表', '缩进'], resettable: true },
  { id: 'editor.smartPunctuation', tab: 'editor', path: 'editor.smartPunctuationRules', label: '智能标点规则', description: 'SmartPunctuation 的规则矩阵、默认值和逐项开关。', scope: 'account', keywords: ['smart', 'punctuation', 'pangu', 'quote', 'dash', '智能标点', '中英文空格'], resettable: true },
  { id: 'editor.writingGoal', tab: 'editor', path: 'writingGoal', label: '写作目标', description: '文稿、每日与每周目标字数。', scope: 'account', keywords: ['goal', 'writing', '字数', '目标'], resettable: true },
  { id: 'export.platform', tab: 'export', path: 'export.defaultPlatform', label: '默认导出平台', description: '微信、小红书、知乎的默认导出目标。', scope: 'account', keywords: ['export', 'platform', 'wechat', 'xiaohongshu', 'zhihu', '导出', '平台'], resettable: true },
  { id: 'export.customCss', tab: 'export', path: 'export.customCss', label: '自定义 CSS', description: '追加到导出 HTML 的本地 CSS。', scope: 'account', keywords: ['css', 'style', 'html', '自定义', '样式'], resettable: true },
  { id: 'export.history', tab: 'export', path: 'export.exportHistory', label: '导出历史', description: '最近 10 次导出或复制记录。', scope: 'account', keywords: ['history', 'recent', 'export', '历史'], resettable: true },
  { id: 'ai.provider', tab: 'ai', path: 'ai.provider', label: 'AI 服务提供商', description: 'OpenAI 兼容、Anthropic、DeepSeek、Ollama 或禁用。', scope: 'account', keywords: ['ai', 'provider', 'openai', 'anthropic', 'deepseek', 'ollama'], resettable: true },
  { id: 'ai.systemPrompt', tab: 'ai', path: 'ai.systemPrompt', label: '系统提示词', description: '追加到 AI 任务提示词之前的用户自定义约束。', scope: 'account', keywords: ['prompt', 'system', 'ai', '提示词'], resettable: true },
  { id: 'data.backup', tab: 'data', path: 'data.autoBackup', label: '自动备份', description: '真实版本管理链路的自动快照配置。', scope: 'account', keywords: ['backup', 'snapshot', 'version', '备份', '快照'], resettable: true },
  { id: 'data.storage', tab: 'data', path: 'runtime.storage', label: '存储诊断', description: 'StorageManager、Dexie、Cache Storage 与 Service Worker 状态。', scope: 'device', keywords: ['storage', 'indexeddb', 'dexie', 'cache', '存储'], resettable: false },
  { id: 'sync.status', tab: 'sync', path: 'sync.status', label: '同步状态', description: 'SyncProvider、待同步队列、冲突数量与最后同步时间。', scope: 'shared', keywords: ['sync', 'provider', 'webdav', 'git', 'self-hosted', '同步', '冲突'], resettable: false },
  { id: 'sync.manual', tab: 'sync', path: 'sync.manual', label: '手动同步', description: '真实调用 SyncEngine.sync，不配置 provider 时保留待同步队列。', scope: 'shared', keywords: ['sync', 'manual', 'outbox', 'queue', '手动同步', '队列'], resettable: false },
  { id: 'audit.ledger', tab: 'audit', path: 'audit.ledger', label: '审计日志', description: '权限、同步、文档和高危操作的本地审计链路。', scope: 'shared', keywords: ['audit', 'permission', 'security', 'ledger', '审计', '权限', '安全'], resettable: false },
  { id: 'audit.integrity', tab: 'audit', path: 'audit.integrity', label: '完整性校验', description: '审计记录的 prevHash 与 entryHash 链式校验。', scope: 'shared', keywords: ['audit', 'hash', 'integrity', 'tamper', '完整性', '哈希'], resettable: false },
  { id: 'profiles.registry', tab: 'profiles', path: 'profiles.registry', label: '工作区注册表', description: '本地 Profile registry、活动工作区、软删除恢复期和数据库 namespace。', scope: 'shared', keywords: ['profile', 'workspace', 'account', 'registry', '工作区', '账户'], resettable: false },
  { id: 'profiles.database', tab: 'profiles', path: 'profiles.database', label: 'Profile 数据库隔离', description: '每个 Profile 使用独立 IndexedDB namespace，当前基线初始化 metadata 表。', scope: 'shared', keywords: ['indexeddb', 'dexie', 'database', 'namespace', '隔离'], resettable: false },
  { id: 'profiles.nativeBoundary', tab: 'profiles', path: 'profiles.nativeBoundary', label: '原生文件根边界', description: '浏览器 runtime 不伪造 Tauri 目录选择或多窗口能力。', scope: 'device', keywords: ['tauri', 'fileRoot', 'window', 'native', '文件根'], resettable: false },
  { id: 'extensions.registry', tab: 'extensions', path: 'extensions.registry', label: '本地扩展注册表', description: '严格校验本地 inkforge-plugin.json manifest，并持久化安装状态。', scope: 'shared', keywords: ['extension', 'plugin', 'manifest', 'registry', '扩展', '插件'], resettable: false },
  { id: 'extensions.permissions', tab: 'extensions', path: 'extensions.permissions', label: '扩展权限', description: '展示 declared/granted permissions、命令权限和运行时阻断原因。', scope: 'shared', keywords: ['permission', 'sandbox', 'worker', '权限', '沙箱'], resettable: false },
  { id: 'shortcuts.registry', tab: 'shortcuts', path: 'shortcuts', label: '快捷键绑定', description: '完整快捷键清单、录制、冲突检测和重置。', scope: 'account', keywords: ['shortcut', 'keyboard', 'hotkey', '快捷键', '键盘'], resettable: true },
  { id: 'advanced.customCss', tab: 'advanced', path: 'advanced.customCss', label: 'CustomCSS', description: '仅作用于 .editor-content 的运行时自定义 CSS、沙箱检查和导入导出。', scope: 'account', keywords: ['customcss', 'css', 'style', 'editor-content', '高级', '自定义样式'], resettable: true },
  { id: 'about.updater', tab: 'about', path: 'advanced.updater', label: 'Tauri Updater', description: '仅检查通知、不自动下载的桌面更新状态、跳过版本和禁用策略。', scope: 'device', keywords: ['updater', 'release', 'tauri', 'version', '更新', '版本'], resettable: true },
  { id: 'about.logLevel', tab: 'about', path: 'advanced.logLevel', label: '日志级别', description: '统一 logger 的 runtime 日志级别。', scope: 'device', keywords: ['log', 'debug', 'logger', '日志'], resettable: true },
  { id: 'about.devPanel', tab: 'about', path: 'advanced.developerMode', label: 'Developer Mode', description: '启用生产保留的 InkForge DevPanel 诊断抽屉。', scope: 'device', keywords: ['developer', 'devpanel', 'diagnostics', 'debug', '开发者', '诊断'], resettable: true },
  { id: 'about.featureFlags', tab: 'about', path: 'featureFlags', label: 'Feature Flags', description: 'Markdown hints、多标签、AI autocomplete、性能监测开关。', scope: 'device', keywords: ['feature', 'flag', 'toggle', '功能开关'], resettable: true },
  { id: 'about.performanceSlo', tab: 'about', path: 'performance.slo', label: '性能 SLO 账本', description: '真实 PerformanceObserver、Navigation、FPS、IndexedDB 与内存采样的本地阈值和降级事件。', scope: 'device', keywords: ['performance', 'slo', 'longtask', 'fps', '性能', '降级'], resettable: false },
  { id: 'about.proxy', tab: 'about', path: 'proxy', label: '代理设置', description: 'HTTP、HTTPS、SOCKS5 本机代理配置。', scope: 'device', keywords: ['proxy', 'http', 'socks', '代理'], resettable: true },
  { id: 'about.migration', tab: 'about', path: 'advanced.migrationSnapshots', label: 'Schema 与回滚点', description: 'Settings schema version、迁移证据和回滚快照。', scope: 'account', keywords: ['schema', 'migration', 'rollback', '迁移', '回滚'], resettable: false },
  { id: 'about.ftue', tab: 'about', path: 'ftue', label: '首次使用与帮助', description: '欢迎弹窗、帮助中心和引导重置。', scope: 'device', keywords: ['ftue', 'help', 'onboarding', '帮助', '引导'], resettable: true },
] as const

export const EDITOR_MODE_OPTIONS = [
  {
    value: 'typora',
    label: 'Typora',
    description: 'Typora 风格的实时渲染写作流，适合沉浸式编辑。',
  },
  {
    value: 'source',
    label: 'Source',
    description: '更接近源码编辑的工作方式，保留 Markdown 结构感。',
  },
  {
    value: 'preview',
    label: 'Preview',
    description: '只读渲染视图，适合排版检查与导出前审阅。',
  },
] as const satisfies ReadonlyArray<{
  value: EditorMode
  label: string
  description: string
}>

export const EDITOR_WIDTH_OPTIONS = [
  { value: 'narrow', label: '窄', description: '560px 版心', maxWidth: '560px' },
  { value: 'medium', label: '中', description: '680px 版心', maxWidth: '680px' },
  { value: 'wide', label: '宽', description: '860px 版心', maxWidth: '860px' },
  { value: 'full', label: '全宽', description: '使用全部可用宽度', maxWidth: 'calc(100% - 64px)' },
] as const satisfies ReadonlyArray<{
  value: EditorWidth
  label: string
  description: string
  maxWidth: string
}>

export const FEATURE_FLAG_DEFINITIONS = [
  {
    key: 'markdown-hints',
    label: 'Markdown 提示',
    description: '在编辑流程中显示更明确的 Markdown 语义提示。',
  },
  {
    key: 'multi-tab',
    label: '多标签草稿',
    description: '为后续多文稿并行编辑预留状态开关。',
  },
  {
    key: 'ai-autocomplete',
    label: 'AI 自动补全',
    description: '控制 AI 自动补全链路的灰度启用状态。',
  },
  {
    key: 'performance-metrics',
    label: '性能监测',
    description: '启用实时性能诊断与额外监测面板。',
  },
] as const satisfies ReadonlyArray<{
  key: FeatureFlagKey
  label: string
  description: string
}>

const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  'markdown-hints': true,
  'multi-tab': false,
  'ai-autocomplete': false,
  'performance-metrics': false,
}

export const SHORTCUT_GROUPS = [
  {
    id: 'formatting',
    label: '格式化',
    description: '常用行内样式与标记操作。',
  },
  {
    id: 'headings',
    label: '标题',
    description: '快速切换标题层级与正文段落。',
  },
  {
    id: 'blocks',
    label: '块级',
    description: '插入常用块级结构与内容容器。',
  },
  {
    id: 'editing',
    label: '编辑',
    description: '编辑器基本操作与文本处理。',
  },
  {
    id: 'view',
    label: '视图',
    description: '工作区布局与视图切换。',
  },
] as const

export type ShortcutGroupId = typeof SHORTCUT_GROUPS[number]['id']

export interface ShortcutDefinition {
  id: string
  group: ShortcutGroupId
  label: string
  description: string
  defaultBinding: string
}

export const SHORTCUT_DEFINITIONS: readonly ShortcutDefinition[] = [
  { id: 'bold', group: 'formatting', label: '加粗', description: '切换加粗样式。', defaultBinding: 'Ctrl+B' },
  { id: 'italic', group: 'formatting', label: '斜体', description: '切换斜体样式。', defaultBinding: 'Ctrl+I' },
  { id: 'underline', group: 'formatting', label: '下划线', description: '切换下划线样式。', defaultBinding: 'Ctrl+U' },
  { id: 'strikethrough', group: 'formatting', label: '删除线', description: '切换删除线样式。', defaultBinding: 'Ctrl+Shift+S' },
  { id: 'inlineCode', group: 'formatting', label: '行内代码', description: '切换行内代码标记。', defaultBinding: 'Ctrl+Shift+`' },
  { id: 'link', group: 'formatting', label: '插入链接', description: '为选区添加或编辑链接。', defaultBinding: 'Ctrl+K' },
  { id: 'clearFormat', group: 'formatting', label: '清除格式', description: '移除当前选区样式。', defaultBinding: 'Ctrl+Alt+\\' },
  { id: 'highlight', group: 'formatting', label: '高亮', description: '切换文本高亮。', defaultBinding: 'Ctrl+Shift+H' },

  { id: 'heading1', group: 'headings', label: '一级标题', description: '切换为一级标题。', defaultBinding: 'Ctrl+1' },
  { id: 'heading2', group: 'headings', label: '二级标题', description: '切换为二级标题。', defaultBinding: 'Ctrl+2' },
  { id: 'heading3', group: 'headings', label: '三级标题', description: '切换为三级标题。', defaultBinding: 'Ctrl+3' },
  { id: 'heading4', group: 'headings', label: '四级标题', description: '切换为四级标题。', defaultBinding: 'Ctrl+4' },
  { id: 'paragraph', group: 'headings', label: '正文段落', description: '恢复为正文段落。', defaultBinding: 'Ctrl+Alt+0' },

  { id: 'blockquote', group: 'blocks', label: '引用块', description: '切换引用块。', defaultBinding: 'Ctrl+Shift+Q' },
  { id: 'codeBlock', group: 'blocks', label: '代码块', description: '插入代码块。', defaultBinding: 'Ctrl+Shift+K' },
  { id: 'orderedList', group: 'blocks', label: '有序列表', description: '切换有序列表。', defaultBinding: 'Ctrl+Shift+[' },
  { id: 'bulletList', group: 'blocks', label: '无序列表', description: '切换无序列表。', defaultBinding: 'Ctrl+Shift+]' },
  { id: 'taskList', group: 'blocks', label: '任务列表', description: '切换任务列表。', defaultBinding: 'Ctrl+Shift+X' },
  { id: 'table', group: 'blocks', label: '插入表格', description: '插入默认表格结构。', defaultBinding: 'Ctrl+Alt+Shift+T' },
  { id: 'divider', group: 'blocks', label: '分割线', description: '插入分割线。', defaultBinding: 'Ctrl+Enter' },

  { id: 'save', group: 'editing', label: '保存', description: '立即保存当前内容。', defaultBinding: 'Ctrl+S' },
  { id: 'undo', group: 'editing', label: '撤销', description: '撤销上一步操作。', defaultBinding: 'Ctrl+Z' },
  { id: 'redo', group: 'editing', label: '重做', description: '恢复刚撤销的操作。', defaultBinding: 'Ctrl+Shift+Z' },
  { id: 'find', group: 'editing', label: '查找', description: '打开查找面板。', defaultBinding: 'Ctrl+F' },
  { id: 'replace', group: 'editing', label: '替换', description: '打开查找替换面板。', defaultBinding: 'Ctrl+H' },
  { id: 'selectAll', group: 'editing', label: '全选', description: '选中全文。', defaultBinding: 'Ctrl+A' },

  { id: 'toggleSplitView', group: 'view', label: '切换分栏', description: '在当前工作区开启或关闭分栏预览。', defaultBinding: 'Ctrl+Shift+E' },
  { id: 'toggleSidebar', group: 'view', label: '切换侧栏', description: '显示或隐藏工作区侧栏。', defaultBinding: 'Ctrl+Shift+B' },
  { id: 'togglePreview', group: 'view', label: '切换预览', description: '进入或退出 Preview 只读渲染模式。', defaultBinding: 'Ctrl+Shift+V' },
  { id: 'toggleOutline', group: 'view', label: '切换大纲', description: '显示或隐藏大纲面板。', defaultBinding: 'Ctrl+Shift+O' },
  { id: 'focusMode', group: 'view', label: '专注模式', description: '切换专注写作模式。', defaultBinding: 'F11' },
  { id: 'typewriterMode', group: 'view', label: '打字机模式', description: '切换打字机模式。', defaultBinding: 'F9' },
  { id: 'toggleEditorMode', group: 'view', label: '模式正向循环', description: '按 Typora → Source → Preview 顺序循环切换。', defaultBinding: 'Ctrl+\\' },
  { id: 'toggleEditorModeReverse', group: 'view', label: '模式反向循环', description: '按 Preview → Source → Typora 顺序反向切换。', defaultBinding: 'Ctrl+Shift+\\' },
  { id: 'setTyporaMode', group: 'view', label: '直接进入 Typora', description: '不经过循环，直接切换到 Typora 模式。', defaultBinding: 'Ctrl+Alt+T' },
  { id: 'setSourceMode', group: 'view', label: '直接进入 Source', description: '不经过循环，直接切换到 Source 模式。', defaultBinding: 'Ctrl+Alt+S' },
  { id: 'setPreviewMode', group: 'view', label: '直接进入 Preview', description: '不经过循环，直接切换到 Preview 只读模式。', defaultBinding: 'Ctrl+Alt+P' },
  { id: 'paperWidthNext', group: 'view', label: '版心下一档', description: '将纸张宽度切换到下一档位。', defaultBinding: 'Ctrl+=' },
  { id: 'paperWidthPrev', group: 'view', label: '版心上一档', description: '将纸张宽度切换到上一档位。', defaultBinding: 'Ctrl+-' },
] as const

export const DEFAULT_SHORTCUTS = Object.freeze(
  Object.fromEntries(
    SHORTCUT_DEFINITIONS.map(({ id, defaultBinding }) => [id, defaultBinding]),
  ) as Record<string, string>,
)

export function getDefaultShortcuts(): Record<string, string> {
  return { ...DEFAULT_SHORTCUTS }
}

const TypographySchema = z.object({
  paragraphIndent: z.boolean().default(false),
  paragraphSpacing: z.number().min(0).max(32).default(16),
  letterSpacing: z.number().min(-0.05).max(0.2).default(0),
  headingStyle: z.enum(['underline', 'background', 'border-left', 'none']).default('none'),
  blockquoteStyle: z.enum(['classic', 'modern', 'minimal']).default('classic'),
  fontSize: z.number().min(12).max(24).default(16),
  lineHeight: z.number().min(1.2).max(2.4).default(1.618),
})
const AppearanceSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('light'),
  fontFamily: z.enum(['serif', 'sans', 'kai', 'mono']).default('serif'),
  fontSize: z.number().min(12).max(24).default(16),
  lineHeight: z.number().min(1.4).max(2.4).default(1.8),
  accentColor: z.string().default('#D32F2F'),
  sidebarWidth: z.number().min(180).max(400).default(240),
  reducedMotion: z.boolean().default(false),
  typography: TypographySchema.default({
    paragraphIndent: false,
    paragraphSpacing: 16,
    letterSpacing: 0,
    headingStyle: 'none',
    blockquoteStyle: 'classic',
    fontSize: 16,
    lineHeight: 1.618,
  }),
})

const SmartPunctuationRulesSchema = z.preprocess(
  normalizeSmartPunctuationRuleSettings,
  z.object({
    curlyQuotes: z.boolean(),
    emDash: z.boolean(),
    ellipsis: z.boolean(),
    spacedDash: z.boolean(),
    arrows: z.boolean(),
    fractions: z.boolean(),
    multiplication: z.boolean(),
    copyrightSymbols: z.boolean(),
    degree: z.boolean(),
    panguSpacing: z.boolean(),
  }),
).default(getDefaultSmartPunctuationRuleSettings())

const EditorSchema = z.object({
  autoSave: z.boolean().default(true),
  autoSaveInterval: z.number().min(10).max(300).default(30),
  spellCheck: z.boolean().default(false),
  typewriterMode: z.boolean().default(false),
  smartPunctuation: z.boolean().default(true),
  smartPunctuationRules: SmartPunctuationRulesSchema,
  wordWrap: z.boolean().default(true),
  tabSize: z.number().min(2).max(8).default(4),
  showLineNumbers: z.boolean().default(false),
  highlightActiveLine: z.boolean().default(true),
  bracketMatching: z.boolean().default(true),
  listEnterBehavior: z.enum(LIST_ENTER_BEHAVIOR_VALUES).default('notion'),
  editorMode: z.enum(EDITOR_MODE_VALUES).default('typora'),
  editorWidth: z.enum(EDITOR_WIDTH_VALUES).default('medium'),
  statusBarVisible: z.boolean().default(true),
})

const ExportHistoryEntrySchema = z.object({
  id: z.string().min(1),
  platform: z.enum(['wechat', 'xiaohongshu', 'zhihu']),
  title: z.string().min(1).max(160),
  exportedAt: z.string().min(1),
  bytes: z.number().int().min(0),
  action: z.enum(['copy', 'download', 'settings-preview']).default('settings-preview'),
})

const ExportSchema = z.object({
  defaultPlatform: z.enum(['wechat', 'xiaohongshu', 'zhihu']).default('wechat'),
  defaultPresetId: z.string().default('thesis'),
  macCodeBlock: z.boolean().default(true),
  lineNumbers: z.boolean().default(false),
  convertFootnotes: z.boolean().default(true),
  textIndent: z.boolean().default(false),
  imageMaxWidth: z.number().min(320).max(1080).default(680),
  codeTheme: z.string().default('atom-one-dark'),
  customCss: z.string().max(50000).default(''),
  exportHistory: z.array(ExportHistoryEntrySchema).max(10).default([]),
})

const AISchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'deepseek', 'ollama', 'none']).default('openai'),
  apiKey: z.string().default(''),
  baseUrl: z.string().optional().default('https://api.siliconflow.cn/v1'),
  model: z.string().default('Qwen/Qwen3-8B'),
  maxTokens: z.number().min(100).max(8000).default(2000),
  temperature: z.number().min(0).max(2).default(0.7),
  ollamaUrl: z.string().default('http://localhost:11434'),
  systemPrompt: z.string().max(4000).default(''),
  lastConnectionAt: z.string().nullable().default(null),
})

const DataSchema = z.object({
  autoBackup: z.boolean().default(false),
  backupInterval: z.number().min(1).max(240).default(7),
  maxBackups: z.number().int().min(1).max(50).default(5),
})

const SettingsMigrationSnapshotSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  reason: z.string().min(1),
  schemaVersion: z.number().int().min(1),
  settings: z.unknown(),
})

const CustomCssErrorLogEntrySchema = z.object({
  id: z.string().min(1),
  occurredAt: z.string().min(1),
  type: z.enum(['parse', 'sandbox', 'runtime', 'safe-mode']),
  message: z.string().min(1).max(1000),
  snippet: z.string().max(500).optional(),
})

const CustomCssSchema = z.object({
  enabled: z.boolean().default(false),
  draft: z.string().max(CUSTOM_CSS_MAX_LENGTH).default(''),
  published: z.string().max(CUSTOM_CSS_MAX_LENGTH).default(''),
  confirmedAt: z.string().nullable().default(null),
  suspendedReason: z.enum(CUSTOM_CSS_SUSPENDED_REASONS).nullable().default(null),
  lastAppliedAt: z.string().nullable().default(null),
  errorLog: z.array(CustomCssErrorLogEntrySchema).max(20).default([]),
})

const UpdateInfoSchema = z.object({
  version: z.string().min(1).max(80),
  releasedAt: z.number().nullable().default(null),
  notes: z.string().max(100000).default(''),
  size: z.number().int().min(0).nullable().default(null),
  signatureOk: z.boolean().default(false),
  releaseUrl: z.string().url().default('https://github.com/ZRainbow1275/InkForge/releases'),
})

const UpdaterSchema = z.object({
  autoCheckDisabled: z.boolean().default(false),
  lastCheckAt: z.string().nullable().default(null),
  lastSuccessfulCheckAt: z.string().nullable().default(null),
  lastStatus: z.enum(UPDATER_STATUS_VALUES).default('idle'),
  lastDisabledReason: z.enum(UPDATER_DISABLED_REASON_VALUES).nullable().default(null),
  lastErrorMessage: z.string().max(1000).nullable().default(null),
  latest: UpdateInfoSchema.nullable().default(null),
  notifiedVersions: z.array(z.string().min(1).max(80)).max(20).default([]),
})

const AdvancedSchema = z.object({
  logLevel: z.enum(LOG_LEVEL_VALUES).default(getDefaultLogLevel()),
  developerMode: z.boolean().default(false),
  customCss: CustomCssSchema.default({
    enabled: false,
    draft: '',
    published: '',
    confirmedAt: null,
    suspendedReason: null,
    lastAppliedAt: null,
    errorLog: [],
  }),
  updater: UpdaterSchema.default({
    autoCheckDisabled: false,
    lastCheckAt: null,
    lastSuccessfulCheckAt: null,
    lastStatus: 'idle',
    lastDisabledReason: null,
    lastErrorMessage: null,
    latest: null,
    notifiedVersions: [],
  }),
  migrationSnapshots: z.array(SettingsMigrationSnapshotSchema).max(10).default([]),
})

const FeatureFlagsSchema = z.object({
  'markdown-hints': z.boolean().default(DEFAULT_FEATURE_FLAGS['markdown-hints']),
  'multi-tab': z.boolean().default(DEFAULT_FEATURE_FLAGS['multi-tab']),
  'ai-autocomplete': z.boolean().default(DEFAULT_FEATURE_FLAGS['ai-autocomplete']),
  'performance-metrics': z.boolean().default(DEFAULT_FEATURE_FLAGS['performance-metrics']),
})

const ProxySchema = z.object({
  enabled: z.boolean().default(false),
  protocol: z.enum(PROXY_PROTOCOL_VALUES).default('http'),
  host: z.string().default(''),
  port: z.number().int().min(1).max(65535).default(7890),
  username: z.string().default(''),
  password: z.string().default(''),
})

const WritingGoalSchema = z.object({
  documentTarget: z.number().int().min(1).optional(),
  dailyTarget: z.number().int().min(1).optional(),
  weeklyTarget: z.number().int().min(1).optional(),
})

const ShortcutSchema = z.record(z.string(), z.string().min(1))

const SettingsSchema = z.object({
  schemaVersion: z.number().int().min(1).default(CURRENT_SETTINGS_SCHEMA_VERSION),
  appearance: AppearanceSchema,
  editor: EditorSchema,
  export: ExportSchema,
  ai: AISchema,
  data: DataSchema,
  advanced: AdvancedSchema,
  featureFlags: FeatureFlagsSchema,
  proxy: ProxySchema,
  writingGoal: WritingGoalSchema,
  shortcuts: ShortcutSchema,
})

export type Settings = z.infer<typeof SettingsSchema>
export type { SmartPunctuationRuleSettings }
export type AppearanceSettings = z.infer<typeof AppearanceSchema>
export type TypographySettings = z.infer<typeof TypographySchema>
export type EditorSettings = z.infer<typeof EditorSchema>
export type ExportSettings = z.infer<typeof ExportSchema>
export type ExportHistoryEntry = z.infer<typeof ExportHistoryEntrySchema>
export type AISettings = z.infer<typeof AISchema>
export type DataSettings = z.infer<typeof DataSchema>
export type AdvancedSettings = z.infer<typeof AdvancedSchema>
export type SettingsUpdater = z.infer<typeof UpdaterSchema> & UpdaterSettings
export type SettingsCustomCss = z.infer<typeof CustomCssSchema>
export type SettingsCustomCssErrorLogEntry = z.infer<typeof CustomCssErrorLogEntrySchema>
export type SettingsMigrationSnapshot = z.infer<typeof SettingsMigrationSnapshotSchema>
export type SettingsImportPreview = SettingsMigrationPreview<Settings>
export type SettingsImportPreviewResult = SettingsMigrationResult<Settings>
export type FeatureFlagsSettings = z.infer<typeof FeatureFlagsSchema>
export type ProxySettings = z.infer<typeof ProxySchema>
export type WritingGoalSettings = z.infer<typeof WritingGoalSchema>

const STORAGE_KEY = 'inkforge-settings'

function getDefaultSettings(): Settings {
  return {
    schemaVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
    appearance: AppearanceSchema.parse({}),
    editor: EditorSchema.parse({}),
    export: ExportSchema.parse({}),
    ai: AISchema.parse({}),
    data: DataSchema.parse({}),
    advanced: AdvancedSchema.parse({}),
    featureFlags: FeatureFlagsSchema.parse({}),
    proxy: ProxySchema.parse({}),
    writingGoal: WritingGoalSchema.parse({}),
    shortcuts: getDefaultShortcuts(),
  }
}

function normalizeWritingGoalValue(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.trunc(value)
    return normalized >= 1 ? normalized : undefined
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return undefined
    }

    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) {
      const normalized = Math.trunc(parsed)
      return normalized >= 1 ? normalized : undefined
    }
  }

  return undefined
}

function normalizeWritingGoalCandidate(input: unknown): WritingGoalSettings {
  const candidate = (typeof input === 'object' && input !== null ? input : {}) as Partial<Record<keyof WritingGoalSettings, unknown>>

  return {
    documentTarget: normalizeWritingGoalValue(candidate.documentTarget),
    dailyTarget: normalizeWritingGoalValue(candidate.dailyTarget),
    weeklyTarget: normalizeWritingGoalValue(candidate.weeklyTarget),
  }
}

function normalizeExportHistoryCandidate(input: unknown): ExportHistoryEntry[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input.flatMap((entry) => {
    const parsed = ExportHistoryEntrySchema.safeParse(entry)
    return parsed.success ? [parsed.data] : []
  }).slice(0, 10)
}

function normalizeMigrationSnapshotsCandidate(input: unknown): SettingsMigrationSnapshot[] {
  const parsed = z.array(SettingsMigrationSnapshotSchema).safeParse(input)
  return parsed.success ? parsed.data.slice(0, 10) : []
}

function normalizeCustomCssErrorLogCandidate(input: unknown): SettingsCustomCssErrorLogEntry[] {
  const parsed = z.array(CustomCssErrorLogEntrySchema).safeParse(input)
  return parsed.success ? parsed.data.slice(0, 20) : []
}

function normalizeCustomCssCandidate(input: unknown): SettingsCustomCss {
  const parsed = (typeof input === 'object' && input !== null ? input : {}) as Partial<SettingsCustomCss>
  const defaults = CustomCssSchema.parse({})

  return CustomCssSchema.parse({
    ...defaults,
    ...parsed,
    errorLog: normalizeCustomCssErrorLogCandidate(parsed.errorLog),
  })
}

function normalizeUpdaterCandidate(input: unknown): SettingsUpdater {
  const parsed = (typeof input === 'object' && input !== null ? input : {}) as Partial<SettingsUpdater>
  const defaults = UpdaterSchema.parse({})

  return UpdaterSchema.parse({
    ...defaults,
    ...parsed,
    notifiedVersions: Array.isArray(parsed.notifiedVersions) ? parsed.notifiedVersions.slice(-20) : defaults.notifiedVersions,
  }) as SettingsUpdater
}

function cloneSettingsForSnapshot(input: Settings): Settings {
  return JSON.parse(JSON.stringify(input)) as Settings
}

function migrateLegacyShortcuts(shortcuts: Partial<Record<string, string>> | undefined): Record<string, string> {
  const nextShortcuts = {
    ...shortcuts,
  } as Record<string, string>

  if (nextShortcuts.togglePreview === 'Ctrl+Shift+P') {
    nextShortcuts.togglePreview = 'Ctrl+Shift+V'
  }

  if (nextShortcuts.toggleEditorMode === 'Ctrl+Shift+M') {
    nextShortcuts.toggleEditorMode = 'Ctrl+\\'
  }

  if (nextShortcuts.clearFormat === 'Ctrl+\\') {
    nextShortcuts.clearFormat = 'Ctrl+Alt+\\'
  }

  if (nextShortcuts.paragraph === 'Ctrl+0') {
    nextShortcuts.paragraph = 'Ctrl+Alt+0'
  }

  if (nextShortcuts.table === 'Ctrl+Alt+T') {
    nextShortcuts.table = 'Ctrl+Alt+Shift+T'
  }

  if (nextShortcuts.table === 'Cmd+Alt+T') {
    nextShortcuts.table = 'Cmd+Alt+Shift+T'
  }

  if (!nextShortcuts.toggleSplitView) {
    nextShortcuts.toggleSplitView = 'Ctrl+Shift+E'
  }

  if (nextShortcuts.toggleSidebar === 'Ctrl+Shift+E') {
    nextShortcuts.toggleSidebar = 'Ctrl+Shift+B'
  }

  if (nextShortcuts.zoomIn && !nextShortcuts.paperWidthNext) {
    nextShortcuts.paperWidthNext = nextShortcuts.zoomIn
  }

  if (nextShortcuts.zoomOut && !nextShortcuts.paperWidthPrev) {
    nextShortcuts.paperWidthPrev = nextShortcuts.zoomOut
  }

  delete nextShortcuts.zoomIn
  delete nextShortcuts.zoomOut

  return nextShortcuts
}

function buildSettingsCandidate(input: unknown): Settings {
  const defaults = getDefaultSettings()
  const parsed = (typeof input === 'object' && input !== null ? input : {}) as Partial<Settings>
  const migratedShortcuts = migrateLegacyShortcuts(parsed.shortcuts)
  const normalizedWritingGoal = normalizeWritingGoalCandidate(parsed.writingGoal)
  const normalizedExportHistory = normalizeExportHistoryCandidate(parsed.export?.exportHistory)
  const normalizedMigrationSnapshots = normalizeMigrationSnapshotsCandidate(parsed.advanced?.migrationSnapshots)
  const normalizedCustomCss = normalizeCustomCssCandidate(parsed.advanced?.customCss)
  const normalizedUpdater = normalizeUpdaterCandidate(parsed.advanced?.updater)

  return {
    ...defaults,
    ...parsed,
    schemaVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
    appearance: {
      ...defaults.appearance,
      ...parsed.appearance,
      typography: {
        ...defaults.appearance.typography,
        ...parsed.appearance?.typography,
      },
    },
    editor: { ...defaults.editor, ...parsed.editor },
    export: {
      ...defaults.export,
      ...parsed.export,
      exportHistory: normalizedExportHistory,
    },
    ai: { ...defaults.ai, ...parsed.ai },
    data: { ...defaults.data, ...parsed.data },
    advanced: {
      ...defaults.advanced,
      ...parsed.advanced,
      customCss: normalizedCustomCss,
      updater: normalizedUpdater,
      migrationSnapshots: normalizedMigrationSnapshots,
    },
    featureFlags: {
      ...defaults.featureFlags,
      ...parsed.featureFlags,
    },
    proxy: {
      ...defaults.proxy,
      ...parsed.proxy,
    },
    writingGoal: {
      ...defaults.writingGoal,
      ...normalizedWritingGoal,
    },
    shortcuts: {
      ...defaults.shortcuts,
      ...migratedShortcuts,
    },
  }
}

function normalizeBoundedInteger(
  value: number,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function normalizeLiveDataSettings(candidate: Settings): void {
  const defaults = getDefaultSettings().data

  candidate.data.backupInterval = normalizeBoundedInteger(
    candidate.data.backupInterval,
    defaults.backupInterval,
    1,
    240,
  )

  candidate.data.maxBackups = normalizeBoundedInteger(
    candidate.data.maxBackups,
    defaults.maxBackups,
    1,
    50,
  )

  candidate.advanced.customCss = normalizeCustomCssCandidate(candidate.advanced.customCss)
  candidate.advanced.updater = normalizeUpdaterCandidate(candidate.advanced.updater)
}

function validateSettingsCandidate(candidate: unknown): SettingsMigrationValidationResult<Settings> {
  const result = SettingsSchema.safeParse(candidate)

  return result.success
    ? { success: true, data: result.data }
    : { success: false, issues: result.error.issues.map(issue => issue.message) }
}

function previewSettingsCandidate(input: unknown): SettingsImportPreviewResult {
  return previewSettingsMigration({
    raw: input,
    currentVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
    normalize: buildSettingsCandidate,
    validate: validateSettingsCandidate,
  })
}

const settingsMigrationLogger = createActivityLogger({
  module: 'settings',
  scope: 'profile',
  profileId: 'local-profile',
})
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(getDefaultSettings())
  const isLoaded = ref(false)
  const lastMigrationPreview = ref<SettingsImportPreview | null>(null)

  function load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const result = SettingsSchema.safeParse(buildSettingsCandidate(parsed))

        if (result.success) {
          settings.value = result.data
          normalizeLiveDataSettings(settings.value)
          setLogLevel(settings.value.advanced.logLevel as LogLevel)
        } else {
          logger.warn('设置数据校验失败，使用默认值', {
            zodErrors: result.error.issues.map(issue => issue.message),
          })
          settings.value = getDefaultSettings()
          normalizeLiveDataSettings(settings.value)
          setLogLevel(settings.value.advanced.logLevel as LogLevel)
        }
      }
      isLoaded.value = true
    } catch (error) {
      logger.error('加载设置失败', error instanceof Error ? error : new Error(String(error)))
      settings.value = getDefaultSettings()
      normalizeLiveDataSettings(settings.value)
      setLogLevel(settings.value.advanced.logLevel as LogLevel)
      isLoaded.value = true
    }
  }

  function save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    } catch (error) {
      logger.error('保存设置失败', error instanceof Error ? error : new Error(String(error)))
    }
  }

  function createRollbackPoint(reason: string): string {
    const snapshotSource = cloneSettingsForSnapshot(settings.value)
    snapshotSource.advanced.migrationSnapshots = []

    const snapshot: SettingsMigrationSnapshot = createSettingsMigrationSnapshot(snapshotSource, reason)
    settings.value.advanced.migrationSnapshots = prependSettingsMigrationSnapshot(
      settings.value.advanced.migrationSnapshots,
      snapshot,
      10,
    )
    settingsMigrationLogger.info('settings.migration.rollback', {
      snapshotId: snapshot.id,
      reason,
      schemaVersion: snapshot.schemaVersion,
    })
    void settingsMigrationLogger.flush()
    save()
    return snapshot.id
  }
  function restoreRollbackPoint(snapshotId: string): boolean {
    const snapshot = settings.value.advanced.migrationSnapshots.find(item => item.id === snapshotId)
    if (!snapshot) {
      return false
    }

    const retainedSnapshots = settings.value.advanced.migrationSnapshots
    const result = SettingsSchema.safeParse(buildSettingsCandidate(snapshot.settings))
    if (!result.success) {
      logger.warn('回滚点校验失败', { snapshotId })
      settingsMigrationLogger.warn('settings.migration.failure', {
        errorType: 'rollback-validation',
        snapshotId,
        zodErrors: result.error.issues.map(issue => issue.message),
      })
      void settingsMigrationLogger.flush()
      return false
    }

    settings.value = result.data
    settings.value.advanced.migrationSnapshots = retainedSnapshots
    lastMigrationPreview.value = null
    normalizeLiveDataSettings(settings.value)
    setLogLevel(settings.value.advanced.logLevel as LogLevel)
    settingsMigrationLogger.info('settings.migration.rollback', {
      snapshotId,
      reason: snapshot.reason,
      schemaVersion: snapshot.schemaVersion,
    })
    void settingsMigrationLogger.flush()
    save()
    return true
  }

  function restoreLatestRollbackPoint(): boolean {
    const [latestSnapshot] = settings.value.advanced.migrationSnapshots
    return latestSnapshot ? restoreRollbackPoint(latestSnapshot.id) : false
  }
  function reset(): void {
    createRollbackPoint('reset:all')
    const retainedSnapshots = settings.value.advanced.migrationSnapshots
    settings.value = getDefaultSettings()
    settings.value.advanced.migrationSnapshots = retainedSnapshots
    normalizeLiveDataSettings(settings.value)
    setLogLevel(settings.value.advanced.logLevel as LogLevel)
    save()
  }

  function resetTab(tabId: SettingsTabId): void {
    createRollbackPoint('reset-tab:' + tabId)
    const defaults = getDefaultSettings()
    const retainedSnapshots = settings.value.advanced.migrationSnapshots

    switch (tabId) {
      case 'appearance':
        settings.value.appearance = defaults.appearance
        break
      case 'editor':
        settings.value.editor = defaults.editor
        settings.value.writingGoal = defaults.writingGoal
        break
      case 'export':
        settings.value.export = defaults.export
        break
      case 'ai':
        settings.value.ai = defaults.ai
        break
      case 'data':
        settings.value.data = defaults.data
        break
      case 'sync':
        break
      case 'audit':
        break
      case 'profiles':
        break
      case 'extensions':
        break
      case 'shortcuts':
        settings.value.shortcuts = getDefaultShortcuts()
        break
      case 'advanced':
        settings.value.advanced.customCss = defaults.advanced.customCss
        break
      case 'about':
        settings.value.advanced = {
          ...defaults.advanced,
          customCss: settings.value.advanced.customCss,
        }
        settings.value.featureFlags = defaults.featureFlags
        settings.value.proxy = defaults.proxy
        break
      default: {
        const exhaustive: never = tabId
        return exhaustive
      }
    }

    settings.value.schemaVersion = CURRENT_SETTINGS_SCHEMA_VERSION
    settings.value.advanced.migrationSnapshots = retainedSnapshots
    normalizeLiveDataSettings(settings.value)
    setLogLevel(settings.value.advanced.logLevel as LogLevel)
    save()
  }

  function resetShortcuts(): void {
    createRollbackPoint('reset:shortcuts')
    settings.value.shortcuts = getDefaultShortcuts()
    save()
  }

  function resetShortcut(shortcutId: string): void {
    const nextBinding = DEFAULT_SHORTCUTS[shortcutId]
    if (nextBinding) {
      createRollbackPoint('reset-shortcut:' + shortcutId)
      settings.value.shortcuts[shortcutId] = nextBinding
      save()
    }
  }

  function recordExportHistory(entry: Omit<ExportHistoryEntry, 'id' | 'exportedAt'> & Partial<Pick<ExportHistoryEntry, 'id' | 'exportedAt'>>): void {
    const parsed = ExportHistoryEntrySchema.safeParse({
      id: entry.id?.trim() || 'export-' + Date.now(),
      exportedAt: entry.exportedAt?.trim() || new Date().toISOString(),
      platform: entry.platform,
      title: entry.title.trim().slice(0, 160) || '未命名导出',
      bytes: entry.bytes,
      action: entry.action,
    })
    if (!parsed.success) {
      logger.warn('忽略无效导出历史记录', { issueCount: parsed.error.issues.length })
      return
    }

    settings.value.export.exportHistory = [
      parsed.data,
      ...normalizeExportHistoryCandidate(settings.value.export.exportHistory),
    ].slice(0, 10)
    save()
  }

  function clearExportHistory(): void {
    settings.value.export.exportHistory = []
    save()
  }

  function markAIConnectionSuccess(): void {
    settings.value.ai.lastConnectionAt = new Date().toISOString()
    save()
  }

  function exportSettings(): string {
    return JSON.stringify(settings.value, null, 2)
  }

  function previewImportSettings(json: string): SettingsImportPreviewResult {
    try {
      const parsed = JSON.parse(json) as unknown
      const preview = previewSettingsCandidate(parsed)
      lastMigrationPreview.value = preview.ok ? preview.preview : null
      return preview
    } catch (error) {
      lastMigrationPreview.value = null
      return {
        ok: false,
        error: {
          code: 'parse-failure',
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }

  function importSettings(json: string): boolean {
    const preview = previewImportSettings(json)

    if (!preview.ok) {
      logger.warn('导入设置迁移预览失败', {
        code: preview.error.code,
        message: preview.error.message,
        details: preview.error.details ?? [],
      })
      settingsMigrationLogger.warn('settings.migration.failure', {
        errorType: preview.error.code,
        errorMessage: preview.error.message,
        from: preview.error.fromVersion,
        to: preview.error.toVersion,
      })
      void settingsMigrationLogger.flush()
      return false
    }

    try {
      const migrationPreview = preview.preview
      settingsMigrationLogger.info('settings.migration.start', {
        from: migrationPreview.fromVersion,
        to: migrationPreview.toVersion,
        fileKind: migrationPreview.fileKind,
      })
      const rollbackSnapshotId = createRollbackPoint(
        `import:v${migrationPreview.fromVersion}-to-v${migrationPreview.toVersion}`,
      )
      settings.value = migrationPreview.candidate
      normalizeLiveDataSettings(settings.value)
      setLogLevel(settings.value.advanced.logLevel as LogLevel)
      lastMigrationPreview.value = migrationPreview
      save()
      settingsMigrationLogger.info('settings.migration.success', {
        from: migrationPreview.fromVersion,
        to: migrationPreview.toVersion,
        rollbackSnapshotId,
        deprecations: migrationPreview.deprecations.map(deprecation => deprecation.path),
        diffSummary: summarizeSettingsMigrationDiff(migrationPreview.diff),
      })
      void settingsMigrationLogger.flush()
      return true
    } catch (error) {
      logger.error('导入设置失败', error instanceof Error ? error : new Error(String(error)))
      settingsMigrationLogger.error(
        'settings.migration.failure',
        { errorType: 'import-apply', errorMessage: error instanceof Error ? error.message : String(error) },
        error instanceof Error ? error : new Error(String(error)),
      )
      void settingsMigrationLogger.flush()
      return false
    }
  }
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function debouncedSave(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }

    saveTimer = setTimeout(() => {
      save()
      saveTimer = null
    }, 5000)
  }

  watch(settings, debouncedSave, { deep: true })
  watch(
    () => [settings.value.data.backupInterval, settings.value.data.maxBackups],
    () => {
      normalizeLiveDataSettings(settings.value)
    },
    { immediate: true },
  )
  watch(
    () => settings.value.advanced.logLevel,
    level => {
      setLogLevel(level as LogLevel)
    },
    { immediate: true },
  )

  load()

  return {
    settings,
    isLoaded,
    lastMigrationPreview,
    load,
    save,
    reset,
    resetTab,
    resetShortcuts,
    resetShortcut,
    createRollbackPoint,
    restoreRollbackPoint,
    restoreLatestRollbackPoint,
    recordExportHistory,
    clearExportHistory,
    markAIConnectionSuccess,
    exportSettings,
    previewImportSettings,
    importSettings,
  }
})
