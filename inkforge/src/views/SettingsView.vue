<script setup lang="ts">
/**
 * SettingsView - 企业级 11 Tab 设置中心
 *
 * Tab 结构：
 *   1. 外观 (Appearance)
 *   2. 编辑器 (Editor)
 *   3. 导出 (Export)
 *   4. AI 服务 (AI)
 *   5. 数据 (Data)
 *   6. 同步 (Sync)
 *   7. 审计日志 (Audit)
 *   8. 工作区 (Profiles)
 *   9. 扩展插件 (Extensions)
 *   10. 快捷键 (Shortcuts)
 *   11. 关于 (About)
 *
 * 所有设置项实时绑定到 settingsStore.settings ref，
 * store 已配置 deep watch 自动持久化到 localStorage。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Trash2 } from 'lucide-vue-next'
import ForgeNibMark from '@/components/chrome/ForgeNibMark.vue'
import ShortcutInput from '@/components/settings/ShortcutInput.vue'
import UpdateCard from '@/components/settings/UpdateCard.vue'
import CssEditor from '@/components/editor/CssEditor.vue'
import { useFeatureFlag } from '@/composables/useFeatureFlag'
import { LOG_LEVELS, getLogLevel, logger, type LogLevel } from '@/services/error'
import { detectDesktopRuntime, pickNativeDirectory } from '@/services/desktop'
import { getProxyPreview } from '@/services/http-proxy'
import { convertToPlatform, copyToClipboard, type CodeTheme, type Platform } from '@/services/export'
import {
  FONT_STACK_PROFILES,
  TYPOGRAPHY_PRESETS,
  buildVisualSystemTokens,
  getTypographyPresetById,
  resolveTypographyPresetId,
  type TypographyPresetId,
} from '@/services/visual-system'
import { useAIStore } from '@/stores/ai'
import { useArticleStore } from '@/stores/article'
import { useAssetStore } from '@/stores/asset'
import { useDesktopStore } from '@/stores/desktop'
import { useEditorStore } from '@/stores/editor'
import { useFTUEStore } from '@/stores/ftue'
import { DEFAULT_ACCOUNT_ID, useAccountStore } from '@/stores/account'
import { useProfileStore } from '@/stores/profile'
import { usePerformanceStore } from '@/stores/performance'
import { useSyncStore } from '@/stores/sync'
import { useAuditStore } from '@/stores/audit'
import { useExtensionStore } from '@/stores/extensions'
import { useDevPanelStore } from '@/stores/devPanel'
import { AUDIT_ACTION_VALUES, AUDIT_SEVERITY_VALUES, auditLog, type AuditAction, type AuditSeverity } from '@/services/audit'
import type { ExtensionRecord } from '@/services/extensions'
import { PROFILE_ACCENT_PRESETS, PROFILE_AVATAR_ICON_VALUES, type ProfileAvatarIcon, type ProfileRecord } from '@/services/profile'
import { PERFORMANCE_THRESHOLDS, type PerformanceMetricKind, type PerformanceSampleRecord, type PerformanceStatus } from '@/services/performance'
import { db } from '@/utils/db'
import {
  CURRENT_SETTINGS_SCHEMA_VERSION,
  EDITOR_MODE_OPTIONS,
  EDITOR_WIDTH_OPTIONS,
  FEATURE_FLAG_DEFINITIONS,
  SETTINGS_REGISTRY,
  SHORTCUT_DEFINITIONS,
  SHORTCUT_GROUPS,
  normalizeWritingGoalValue,
  type SettingsRegistryItem,
  type WritingGoalSettings,
  useSettingsStore,
} from '@/stores/settings'
import {
  SMART_PUNCTUATION_RULE_DEFINITIONS,
  getDefaultSmartPunctuationRuleSettings,
  type SmartPunctuationRuleDefinition,
} from '@/services/smart-punctuation'
import {
  CUSTOM_CSS_MAX_LENGTH,
  CUSTOM_CSS_SNIPPETS,
  CUSTOM_CSS_STYLE_ID,
  appendCustomCssErrorLog,
  applyCustomCssRuntime,
  firstCustomCssErrorMessage,
  sandboxCustomCss,
  shouldSuspendForCustomCssErrors,
  summarizeCustomCssIssues,
  type CustomCssIssue,
  type CustomCssSandboxResult,
} from '@/services/custom-css'

// ═══════════════════════════════════════
//  Store & Router
// ═══════════════════════════════════════

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const aiStore = useAIStore()
const articleStore = useArticleStore()
const assetStore = useAssetStore()
const accountStore = useAccountStore()
const profileStore = useProfileStore()
const performanceStore = usePerformanceStore()
const desktopStore = useDesktopStore()
const editorStore = useEditorStore()
const ftueStore = useFTUEStore()
const syncStore = useSyncStore()
const auditStore = useAuditStore()
const extensionStore = useExtensionStore()
const devPanelStore = useDevPanelStore()

const { settings, lastMigrationPreview } = storeToRefs(settingsStore)
const { developerModeEnabled, isPanelVisible } = storeToRefs(devPanelStore)
const { cachedUrlCount } = storeToRefs(assetStore)
const {
  summary: performanceSloSummary,
  recentSamples: performanceRecentSamples,
  recentEvents: performanceRecentEvents,
  supportMatrix: performanceSupportMatrix,
  unsupportedCapabilities: performanceUnsupportedCapabilities,
  reducedMotion: performanceReducedMotion,
  isCollecting: performanceSloCollecting,
  isLoading: performanceSloLoading,
  error: performanceSloError,
  lastActionMessage: performanceSloMessage,
} = storeToRefs(performanceStore)
const aiTestStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')
const aiTestMessage = ref('')
const showApiKey = ref(false)
const showProxyPassword = ref(false)
const ollamaModels = ref<string[]>([])
const shortcutSearch = ref('')
const settingsSearch = ref('')
const activeRegistryMatchId = ref<string | null>(null)
const exportPreviewCopyStatus = ref<'idle' | 'copied' | 'error'>('idle')
const settingsImportInput = ref<HTMLInputElement | null>(null)
const customCssImportInput = ref<HTMLInputElement | null>(null)
const customCssSandboxResult = ref<CustomCssSandboxResult | null>(null)
const customCssActionMessage = ref<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
const selectedCustomCssSnippet = ref('')
const customCssStylePresent = ref(false)
const importFeedback = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const syncActionBusy = computed(() => syncStore.isSyncing)
const syncActionMessage = computed<{ type: 'success' | 'error'; text: string } | null>(() => {
  const result = syncStore.lastResult
  if (!result) return null
  return result.success
    ? {
        type: 'success',
        text: `同步完成：上传 ${result.uploaded}，下载 ${result.downloaded}，冲突 ${result.newConflicts}`,
      }
    : {
        type: 'error',
        text: result.error ?? '同步失败，待同步队列已保留',
      }
})
const auditKeyword = ref('')
const auditSeverityFilter = ref<'all' | AuditSeverity>('all')
const auditActionFilter = ref<'all' | AuditAction>('all')
const auditExportMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const extensionManifestText = ref('')
const extensionActionMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const profileNameDraft = ref('')
const profileAvatarDraft = ref<ProfileAvatarIcon>('User')
const profileAccentDraft = ref<string>(PROFILE_ACCENT_PRESETS[0])
const profileFileRootDraft = ref<string | null>(null)
const profileFileRootPickerBusy = ref(false)
const profileNativeDirectoryAvailable = detectDesktopRuntime().kind === 'tauri'
const profileActionMessage = ref<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
const latestMigrationSnapshot = computed(() => settings.value.advanced.migrationSnapshots[0] ?? null)
const smartPunctuationRuleDefinitions: readonly SmartPunctuationRuleDefinition[] = SMART_PUNCTUATION_RULE_DEFINITIONS
const migrationPreviewSummaryText = computed(() => {
  const preview = lastMigrationPreview.value
  if (!preview) {
    return ''
  }

  const added = preview.diff.filter(entry => entry.kind === 'added').length
  const changed = preview.diff.filter(entry => entry.kind === 'changed').length
  const removed = preview.diff.filter(entry => entry.kind === 'removed').length
  return `v${preview.fromVersion} → v${preview.toVersion}；新增 ${added}，变更 ${changed}，移除 ${removed}，废弃 ${preview.deprecations.length}`
})
const migrationPreviewDiffRows = computed(() => lastMigrationPreview.value?.diff.slice(0, 6) ?? [])
const migrationPreviewDeprecationText = computed(() => (
  lastMigrationPreview.value?.deprecations
    .map(deprecation => deprecation.replacement
      ? `${deprecation.path} → ${deprecation.replacement}`
      : deprecation.path)
    .join('；') ?? ''
))
let feedbackTimer: ReturnType<typeof setTimeout> | null = null
let registryHighlightTimer: ReturnType<typeof setTimeout> | null = null
let exportPreviewCopyTimer: ReturnType<typeof setTimeout> | null = null

// ═══════════════════════════════════════
//  Tab 系统
// ═══════════════════════════════════════

type TabId = 'appearance' | 'editor' | 'export' | 'ai' | 'data' | 'sync' | 'audit' | 'profiles' | 'extensions' | 'shortcuts' | 'advanced' | 'about'
type SettingsSectionId = 'writing-goal' | 'updater'
type WritingGoalField = keyof WritingGoalSettings

const currentTab = ref<TabId>('appearance')
const writingGoalErrors = ref<Record<WritingGoalField, string>>({
  documentTarget: '',
  dailyTarget: '',
  weeklyTarget: '',
})
const writingGoalDrafts = ref<Record<WritingGoalField, string>>({
  documentTarget: formatWritingGoalValue('documentTarget'),
  dailyTarget: formatWritingGoalValue('dailyTarget'),
  weeklyTarget: formatWritingGoalValue('weeklyTarget'),
})

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
  { id: 'sync', name: '同步' },
  { id: 'audit', name: '审计日志' },
  { id: 'profiles', name: '工作区' },
  { id: 'extensions', name: '扩展插件' },
  { id: 'shortcuts', name: '快捷键' },
  { id: 'advanced', name: '高级' },
  { id: 'about', name: '关于' },
]
const auditActionOptions = AUDIT_ACTION_VALUES
const auditSeverityOptions = AUDIT_SEVERITY_VALUES

const editorModeOptions = EDITOR_MODE_OPTIONS
const editorWidthOptions = EDITOR_WIDTH_OPTIONS
const profileAvatarOptions = PROFILE_AVATAR_ICON_VALUES
const profileAccentOptions = PROFILE_ACCENT_PRESETS


function resolveQueryValue(value: unknown): string | null {
  const resolved = Array.isArray(value) ? value[0] : value
  return typeof resolved === 'string' && resolved.trim().length > 0
    ? resolved.trim()
    : null
}

function isTabId(value: string | null): value is TabId {
  return Boolean(value) && tabs.some(tab => tab.id === value)
}

function isSettingsSectionId(value: string | null): value is SettingsSectionId {
  return value === 'writing-goal' || value === 'updater'
}

function updateRouteState(tabId: TabId, section: SettingsSectionId | null = null): void {
  const currentTabQuery = resolveQueryValue(route.query.tab)
  const currentSectionQuery = resolveQueryValue(route.query.section)

  if (currentTabQuery === tabId && currentSectionQuery === section) {
    return
  }

  const nextQuery: LocationQueryRaw = {
    ...route.query,
    tab: tabId,
  }

  if (section) {
    nextQuery.section = section
  } else {
    delete nextQuery.section
  }

  void router.replace({ query: nextQuery })
}

async function scrollToSection(section: SettingsSectionId): Promise<void> {
  await nextTick()

  const target =
    document.querySelector<HTMLElement>(`[data-settings-section="${section}"]`)
    ?? document.getElementById(`${section}-section`)

  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function applyRouteState(): Promise<void> {
  const sectionQuery = resolveQueryValue(route.query.section)
  const requestedSection = isSettingsSectionId(sectionQuery) ? sectionQuery : null
  const tabQuery = resolveQueryValue(route.query.tab)
  const requestedTab = isTabId(tabQuery)
    ? tabQuery
    : requestedSection
      ? 'editor'
      : currentTab.value

  if (requestedTab !== currentTab.value) {
    currentTab.value = requestedTab
  }

  if (requestedTab === 'editor' && requestedSection) {
    await scrollToSection(requestedSection)
  }
}

function selectTab(tabId: TabId): void {
  currentTab.value = tabId
  updateRouteState(tabId)
}

function getTabName(tabId: TabId): string {
  return tabs.find(tab => tab.id === tabId)?.name ?? tabId
}

const currentTabName = computed(() => getTabName(currentTab.value))
const customCssSnippetOptions = CUSTOM_CSS_SNIPPETS
const customCssDraftLength = computed(() => settings.value.advanced.customCss.draft.length)
const customCssDraftIssues = computed<CustomCssIssue[]>(() => {
  const draft = settings.value.advanced.customCss.draft
  if (!draft.trim()) {
    return []
  }
  return sandboxCustomCss(draft).issues
})
const customCssDraftErrors = computed(() => customCssDraftIssues.value.filter(issue => issue.severity === 'error'))
const customCssDraftWarnings = computed(() => customCssDraftIssues.value.filter(issue => issue.severity === 'warning'))
const customCssStatusLabel = computed(() => {
  const customCss = settings.value.advanced.customCss
  if (customCss.suspendedReason) {
    return `已暂停：${customCss.suspendedReason}`
  }
  if (!customCss.enabled) {
    return '未启用'
  }
  return customCssStylePresent.value ? '已注入' : '等待应用'
})

const normalizedSettingsSearch = computed(() => settingsSearch.value.trim().toLowerCase())

const settingsRegistryMatches = computed<SettingsRegistryItem[]>(() => {
  const query = normalizedSettingsSearch.value
  const items = SETTINGS_REGISTRY.filter(item => {
    if (!query) {
      return item.tab === currentTab.value
    }

    return [
      item.id,
      item.path,
      item.label,
      item.description,
      item.scope,
      ...item.keywords,
    ].some(candidate => candidate.toLowerCase().includes(query))
  })

  return items.slice(0, query ? 12 : 8)
})

function getRegistryScopeLabel(scope: SettingsRegistryItem['scope']): string {
  switch (scope) {
    case 'account':
      return '账户级'
    case 'device':
      return '设备级'
    case 'shared':
      return '共享级'
    default: {
      const exhaustive: never = scope
      return exhaustive
    }
  }
}

async function focusSettingsRegistryItem(item: SettingsRegistryItem): Promise<void> {
  currentTab.value = item.tab
  updateRouteState(item.tab)
  activeRegistryMatchId.value = item.id

  if (registryHighlightTimer) {
    clearTimeout(registryHighlightTimer)
  }

  await nextTick()

  const exactTarget = Array.from(document.querySelectorAll<HTMLElement>('[data-settings-entry]'))
    .find(element => element.dataset.settingsEntry === item.id)
  const tabTarget = Array.from(document.querySelectorAll<HTMLElement>('[data-settings-tab]'))
    .find(element => element.dataset.settingsTab === item.tab)

  ;(exactTarget ?? tabTarget)?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  registryHighlightTimer = setTimeout(() => {
    activeRegistryMatchId.value = null
    registryHighlightTimer = null
  }, 2200)
}

function formatWritingGoalValue(field: WritingGoalField): string {
  const value = settings.value.writingGoal[field]
  return typeof value === 'number' ? String(value) : ''
}

function updateWritingGoal(field: WritingGoalField, rawValue: string): void {
  if (!rawValue.trim()) {
    writingGoalErrors.value[field] = ''
    return
  }

  const normalized = normalizeWritingGoalValue(rawValue)
  if (normalized === undefined) {
    writingGoalErrors.value[field] = '请输入大于等于 1 的整数'
    return
  }

  writingGoalErrors.value[field] = ''
  settings.value.writingGoal[field] = normalized
}

function commitWritingGoal(field: WritingGoalField, rawValue: string): void {
  if (!rawValue.trim()) {
    writingGoalErrors.value[field] = ''
    settings.value.writingGoal[field] = undefined
    return
  }

  updateWritingGoal(field, rawValue)
}

watch(
  () => settings.value.writingGoal,
  () => {
    writingGoalDrafts.value.documentTarget = formatWritingGoalValue('documentTarget')
    writingGoalDrafts.value.dailyTarget = formatWritingGoalValue('dailyTarget')
    writingGoalDrafts.value.weeklyTarget = formatWritingGoalValue('weeklyTarget')
    writingGoalErrors.value.documentTarget = ''
    writingGoalErrors.value.dailyTarget = ''
    writingGoalErrors.value.weeklyTarget = ''
  },
  { deep: true },
)

function resetSmartPunctuationRule(rule: SmartPunctuationRuleDefinition): void {
  settings.value.editor.smartPunctuationRules[rule.id] = rule.defaultEnabled
}

function resetSmartPunctuationRules(): void {
  settings.value.editor.smartPunctuationRules = getDefaultSmartPunctuationRuleSettings()
}

const writingGoalEnabledCount = computed(() => {
  const goal = settings.value.writingGoal
  return [goal.documentTarget, goal.dailyTarget, goal.weeklyTarget]
    .filter((value): value is number => typeof value === 'number' && value >= 1)
    .length
})

const writingGoalStatus = computed(() => {
  if (writingGoalEnabledCount.value === 0) {
    return {
      label: '未配置',
      className: 'sv-inline-status sv-inline-status--disabled',
    }
  }

  return {
    label: `已配置 ${writingGoalEnabledCount.value} 项`,
    className: 'sv-inline-status sv-inline-status--ready',
  }
})

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

function getFontStack(value: FontOption['value']): string {
  return FONT_STACK_PROFILES[value].css
}

const typographyPresetOptions = TYPOGRAPHY_PRESETS
const activeTypographyPresetId = computed(() => resolveTypographyPresetId(settings.value.appearance.typography))
const visualSystemSnapshot = computed(() => buildVisualSystemTokens(
  settings.value.appearance,
  window.matchMedia('(prefers-color-scheme: dark)').matches,
))
const visualSystemDiagnostics = computed(() => visualSystemSnapshot.value.diagnostics)
const visualSystemTokenPreview = computed(() => Object.entries(visualSystemSnapshot.value.tokens)
  .slice(0, 8)
  .map(([name, value]) => ({ name, value })))

function updateAppearanceFontSize(value: number): void {
  settings.value.appearance.fontSize = value
  settings.value.appearance.typography.fontSize = value
}

function updateAppearanceLineHeight(value: number): void {
  settings.value.appearance.lineHeight = value
  settings.value.appearance.typography.lineHeight = value
}

function applyTypographyPreset(presetId: TypographyPresetId): void {
  const preset = getTypographyPresetById(presetId)
  settings.value.appearance.typography = { ...preset.typography }
  settings.value.appearance.fontSize = preset.typography.fontSize
  settings.value.appearance.lineHeight = preset.typography.lineHeight
}

function isTypographyPresetSelected(presetId: TypographyPresetId): boolean {
  return activeTypographyPresetId.value === presetId
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

const proxyProtocolOptions = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks5', label: 'SOCKS5' },
] as const

const proxyPreview = computed(() => getProxyPreview(settings.value.proxy))

const markdownHintsFlag = useFeatureFlag('markdown-hints')
const multiTabFlag = useFeatureFlag('multi-tab')
const aiAutocompleteFlag = useFeatureFlag('ai-autocomplete')
const performanceMetricsFlag = useFeatureFlag('performance-metrics')

const featureFlagRows = [
  {
    ...FEATURE_FLAG_DEFINITIONS[0],
    isEnabled: () => markdownHintsFlag.enabled.value,
    setEnabled: markdownHintsFlag.setEnabled,
  },
  {
    ...FEATURE_FLAG_DEFINITIONS[1],
    isEnabled: () => multiTabFlag.enabled.value,
    setEnabled: multiTabFlag.setEnabled,
  },
  {
    ...FEATURE_FLAG_DEFINITIONS[2],
    isEnabled: () => aiAutocompleteFlag.enabled.value,
    setEnabled: aiAutocompleteFlag.setEnabled,
  },
  {
    ...FEATURE_FLAG_DEFINITIONS[3],
    isEnabled: () => performanceMetricsFlag.enabled.value,
    setEnabled: performanceMetricsFlag.setEnabled,
  },
] as const

async function fetchOllamaModels(): Promise<void> {
  try {
    const response = await fetch(settings.value.ai.ollamaUrl + '/api/tags', {
      signal: globalThis.AbortSignal.timeout(5000),
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

    if (result.success) {
      settingsStore.markAIConnectionSuccess()
    }
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

interface StorageBreakdownItem {
  key: string
  label: string
  value: number
}

interface StorageHealthSnapshot {
  state: 'ready' | 'limited' | 'unsupported'
  usage: number
  quota: number
  localStorageBytes: number
  localStorageKeys: number
  breakdown: StorageBreakdownItem[]
  message: string
}

interface CacheBucketSnapshot {
  name: string
  entryCount: number
}

interface CacheHealthSnapshot {
  state: 'ready' | 'empty' | 'unsupported' | 'error'
  buckets: CacheBucketSnapshot[]
  serviceWorkerSummary: string
  message: string
}

interface RuntimeDiagnosticsSnapshot {
  state: 'idle' | 'ready' | 'error'
  message: string
  dbName: string
  dbVersion: number
  tableCounts: Array<{ name: string; count: number }>
  currentLogLevel: LogLevel
  featureFlagsEnabled: number
  lastUpdated: string | null
  userAgent: string
  secureContext: boolean
}

interface PerformanceSnapshot {
  sampledAt: string | null
  fps: number | null
  indexedDbReadMs: number | null
  settingsWriteMs: number | null
  navigationMs: number | null
  memoryBytes: number | null
  memorySource: 'measureUserAgentSpecificMemory' | 'performance.memory' | 'unsupported'
  note: string
}

interface ExtendedStorageEstimate extends globalThis.StorageEstimate {
  usageDetails?: Record<string, number | undefined>
}

interface PerformanceWithMemory extends globalThis.Performance {
  memory?: {
    usedJSHeapSize?: number
    totalJSHeapSize?: number
    jsHeapSizeLimit?: number
  }
  measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>
}

const logLevelLabels: Record<LogLevel, string> = {
  debug: 'Debug',
  info: 'Info',
  warn: 'Warn',
  error: 'Error',
}

const logLevelOptions = LOG_LEVELS.map(level => ({
  value: level,
  label: logLevelLabels[level],
})) satisfies Array<{ value: LogLevel; label: string }>

const storageHealth = ref<StorageHealthSnapshot>({
  state: 'limited',
  usage: 0,
  quota: 0,
  localStorageBytes: 0,
  localStorageKeys: 0,
  breakdown: [],
  message: '尚未采集存储信息',
})

const cacheHealth = ref<CacheHealthSnapshot>({
  state: 'unsupported',
  buckets: [],
  serviceWorkerSummary: '尚未检测',
  message: '尚未采集缓存信息',
})

const runtimeDiagnostics = ref<RuntimeDiagnosticsSnapshot>({
  state: 'idle',
  message: '尚未采集 IndexedDB 信息',
  dbName: db.name,
  dbVersion: db.verno,
  tableCounts: [],
  currentLogLevel: getLogLevel(),
  featureFlagsEnabled: 0,
  lastUpdated: null,
  userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
  secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
})

const performanceSnapshot = ref<PerformanceSnapshot>({
  sampledAt: null,
  fps: null,
  indexedDbReadMs: null,
  settingsWriteMs: null,
  navigationMs: null,
  memoryBytes: null,
  memorySource: 'unsupported',
  note: '性能诊断尚未采集',
})

const runtimePanelBusy = ref(false)
const runtimePanelStatus = ref<'idle' | 'ready' | 'limited'>('idle')
const runtimePanelMessage = ref('尚未刷新诊断')
const runtimeExportBusy = ref(false)
const manualBackupStatus = ref<'idle' | 'working' | 'success' | 'error'>('idle')
const manualBackupMessage = ref('')
const canCreateManualBackup = computed(() => editorStore.currentContent !== null)

function formatSyncDate(value: Date | null): string {
  if (!value) return '从未同步'

  return value.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatPercent(usage: number, quota: number): string {
  if (!usage || !quota) return '0%'
  return `${Math.min(100, (usage / quota) * 100).toFixed(1)}%`
}

function formatTimestamp(value: string | null): string {
  if (!value) return '未采样'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function estimateLocalStorageUsage(): { bytes: number; keys: number } {
  let bytes = 0
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index) ?? ''
    const value = localStorage.getItem(key) ?? ''
    bytes += (key.length + value.length) * 2
  }

  return {
    bytes,
    keys: localStorage.length,
  }
}

function normalizeStorageBreakdownKey(key: string): string {
  switch (key) {
    case 'indexedDB':
      return 'IndexedDB'
    case 'caches':
      return 'Cache Storage'
    case 'serviceWorkerRegistrations':
      return 'Service Worker'
    case 'fileSystem':
      return 'File System'
    default:
      return key
  }
}

async function sampleFps(durationMs = 600): Promise<number | null> {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return null
  }

  return new Promise((resolve) => {
    let frameCount = 0
    const start = performance.now()

    const tick = (timestamp: number) => {
      frameCount += 1

      if (timestamp - start >= durationMs) {
        const elapsedSeconds = (timestamp - start) / 1000
        resolve(elapsedSeconds > 0 ? Math.round(frameCount / elapsedSeconds) : null)
        return
      }

      window.requestAnimationFrame(tick)
    }

    window.requestAnimationFrame(tick)
  })
}

async function measureIndexedDbReadLatency(): Promise<number | null> {
  const start = performance.now()
  await db.documents.limit(1).toArray()
  return Number((performance.now() - start).toFixed(2))
}

function measureSettingsWriteLatency(): number | null {
  const probeKey = '__inkforge-settings-latency-probe__'
  const start = performance.now()

  try {
    localStorage.setItem(probeKey, JSON.stringify({ timestamp: Date.now() }))
    localStorage.removeItem(probeKey)
    return Number((performance.now() - start).toFixed(2))
  } catch {
    return null
  }
}

async function measureMemoryUsage(): Promise<{
  bytes: number | null
  source: PerformanceSnapshot['memorySource']
  note: string
}> {
  const perf = performance as PerformanceWithMemory

  if (typeof perf.measureUserAgentSpecificMemory === 'function' && window.crossOriginIsolated) {
    try {
      const result = await perf.measureUserAgentSpecificMemory()
      return {
        bytes: result.bytes,
        source: 'measureUserAgentSpecificMemory',
        note: '使用标准化实验性内存 API 采样',
      }
    } catch (error) {
      return {
        bytes: null,
        source: 'unsupported',
        note: `内存采样失败：${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  if (typeof perf.memory?.usedJSHeapSize === 'number') {
    return {
      bytes: perf.memory.usedJSHeapSize,
      source: 'performance.memory',
      note: '当前环境回退到 Chromium 专有 performance.memory',
    }
  }

  return {
    bytes: null,
    source: 'unsupported',
    note: '当前环境不支持内存采样，或未满足 cross-origin isolated 条件',
  }
}

async function refreshStorageHealth(): Promise<void> {
  const localStorageUsage = estimateLocalStorageUsage()

  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    storageHealth.value = {
      state: 'unsupported',
      usage: 0,
      quota: 0,
      localStorageBytes: localStorageUsage.bytes,
      localStorageKeys: localStorageUsage.keys,
      breakdown: [],
      message: '当前环境不支持 StorageManager.estimate()',
    }
    return
  }

  try {
    const estimate = await navigator.storage.estimate() as ExtendedStorageEstimate
    const usage = estimate.usage ?? 0
    const quota = estimate.quota ?? 0
    const breakdown = Object.entries(estimate.usageDetails ?? {})
      .filter(([, value]) => typeof value === 'number' && value > 0)
      .map(([key, value]) => ({
        key,
        label: normalizeStorageBreakdownKey(key),
        value: value ?? 0,
      }))
      .sort((left, right) => right.value - left.value)

    storageHealth.value = {
      state: 'ready',
      usage,
      quota,
      localStorageBytes: localStorageUsage.bytes,
      localStorageKeys: localStorageUsage.keys,
      breakdown,
      message: quota > 0
        ? `已使用 ${formatBytes(usage)} / ${formatBytes(quota)}`
        : '浏览器未返回可用配额',
    }
  } catch (error) {
    storageHealth.value = {
      state: 'limited',
      usage: 0,
      quota: 0,
      localStorageBytes: localStorageUsage.bytes,
      localStorageKeys: localStorageUsage.keys,
      breakdown: [],
      message: `存储估算失败：${error instanceof Error ? error.message : '未知错误'}`,
    }
  }
}

async function refreshCacheHealth(): Promise<void> {
  const serviceWorkerSummary = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    ? await navigator.serviceWorker.getRegistrations()
      .then((registrations) => (
        registrations.length > 0
          ? `${registrations.length} 个注册`
          : '未注册 Service Worker'
      ))
      .catch((error) => `Service Worker 状态读取失败：${getErrorMessage(error)}`)
    : '当前环境不支持 Service Worker'

  if (typeof window === 'undefined' || !('caches' in window)) {
    cacheHealth.value = {
      state: 'unsupported',
      buckets: [],
      serviceWorkerSummary,
      message: '当前环境不支持 Cache Storage',
    }
    return
  }

  try {
    const names = await globalThis.caches.keys()
    const buckets = await Promise.all(
      names.map(async (name) => {
        const cache = await globalThis.caches.open(name)
        const keys = await cache.keys()
        return {
          name,
          entryCount: keys.length,
        }
      }),
    )

    cacheHealth.value = {
      state: buckets.length > 0 ? 'ready' : 'empty',
      buckets,
      serviceWorkerSummary,
      message: buckets.length > 0
        ? `共发现 ${buckets.length} 个 Cache bucket`
        : '当前没有已命名的 Cache bucket',
    }
  } catch (error) {
    cacheHealth.value = {
      state: 'error',
      buckets: [],
      serviceWorkerSummary,
      message: `Cache Storage 读取失败：${getErrorMessage(error)}`,
    }
  }
}

async function refreshRuntimeDiagnostics(): Promise<void> {
  const snapshotBase = {
    dbName: db.name,
    dbVersion: db.verno,
    currentLogLevel: getLogLevel(),
    featureFlagsEnabled: featureFlagRows.filter(row => row.isEnabled()).length,
    lastUpdated: new Date().toISOString(),
    userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
    secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
  }

  try {
    const tableCounts = await Promise.all(
      db.tables.map(async table => ({
        name: table.name,
        count: await table.count(),
      })),
    )

    runtimeDiagnostics.value = {
      ...snapshotBase,
      state: 'ready',
      message: `已读取 ${tableCounts.length} 张 IndexedDB 表`,
      tableCounts,
    }
  } catch (error) {
    logger.error('运行时诊断刷新失败', error instanceof Error ? error : new Error(String(error)))
    runtimeDiagnostics.value = {
      ...snapshotBase,
      state: 'error',
      message: `IndexedDB 读取失败：${getErrorMessage(error)}`,
      tableCounts: [],
    }
  }
}

async function refreshPerformanceSnapshot(): Promise<void> {
  if (!performanceMetricsFlag.enabled.value) {
    performanceSnapshot.value = {
      sampledAt: new Date().toISOString(),
      fps: null,
      indexedDbReadMs: null,
      settingsWriteMs: null,
      navigationMs: null,
      memoryBytes: null,
      memorySource: 'unsupported',
      note: '未启用 performance-metrics 功能开关',
    }
    return
  }

  try {
    const navigationEntry = typeof globalThis.performance !== 'undefined'
      ? globalThis.performance.getEntriesByType('navigation')[0] as globalThis.PerformanceNavigationTiming | undefined
      : undefined
    const [fps, indexedDbReadMs, memory] = await Promise.all([
      sampleFps(),
      measureIndexedDbReadLatency(),
      measureMemoryUsage(),
    ])

    performanceSnapshot.value = {
      sampledAt: new Date().toISOString(),
      fps,
      indexedDbReadMs,
      settingsWriteMs: measureSettingsWriteLatency(),
      navigationMs: navigationEntry ? Number(navigationEntry.duration.toFixed(2)) : null,
      memoryBytes: memory.bytes,
      memorySource: memory.source,
      note: memory.note,
    }
    await performanceStore.refreshSnapshot(currentProfileId(), currentProfileId(), route.fullPath)
  } catch (error) {
    logger.error('性能采样失败', error instanceof Error ? error : new Error(String(error)))
    performanceSnapshot.value = {
      sampledAt: new Date().toISOString(),
      fps: null,
      indexedDbReadMs: null,
      settingsWriteMs: null,
      navigationMs: null,
      memoryBytes: null,
      memorySource: 'unsupported',
      note: `性能采样失败：${getErrorMessage(error)}`,
    }
  }
}

async function refreshRuntimePanels(): Promise<void> {
  if (runtimePanelBusy.value) {
    return
  }

  runtimePanelBusy.value = true
  runtimePanelStatus.value = 'idle'
  runtimePanelMessage.value = '正在刷新诊断...'

  try {
    const results = await Promise.allSettled([
      refreshStorageHealth(),
      refreshCacheHealth(),
      refreshRuntimeDiagnostics(),
      refreshPerformanceSnapshot(),
    ])

    const rejectedCount = results.filter(result => result.status === 'rejected').length
    if (rejectedCount > 0) {
      logger.warn('运行时诊断存在降级项', {
        rejectedCount,
      })
    }

    const unavailableSegments: string[] = []
    if (storageHealth.value.state !== 'ready') unavailableSegments.push('StorageManager')
    if (!['ready', 'empty'].includes(cacheHealth.value.state)) unavailableSegments.push('Cache Storage')
    if (runtimeDiagnostics.value.state !== 'ready') unavailableSegments.push('IndexedDB')
    if (rejectedCount > 0) unavailableSegments.push(`${rejectedCount} 个未处理诊断`)

    runtimePanelStatus.value = unavailableSegments.length > 0 ? 'limited' : 'ready'
    runtimePanelMessage.value = unavailableSegments.length > 0
      ? `部分诊断不可用：${unavailableSegments.join('、')}`
      : '诊断已刷新'
  } finally {
    runtimePanelBusy.value = false
  }
}

async function handleCreateManualBackup(): Promise<void> {
  if (manualBackupStatus.value === 'working') return

  if (!editorStore.currentContent) {
    manualBackupStatus.value = 'error'
    manualBackupMessage.value = '请先在工作台打开文稿，再创建备份。'
    return
  }

  manualBackupStatus.value = 'working'
  manualBackupMessage.value = '正在写入版本历史...'

  try {
    const version = await editorStore.createVersion('manual_save')
    if (!version) {
      manualBackupStatus.value = 'error'
      manualBackupMessage.value = '当前没有可备份的活动文稿。'
      return
    }

    manualBackupStatus.value = 'success'
    manualBackupMessage.value = `已创建备份：${version.label}`
  } catch (error) {
    const message = getErrorMessage(error)
    logger.error('手动创建备份失败', error instanceof Error ? error : new Error(message))
    manualBackupStatus.value = 'error'
    manualBackupMessage.value = `创建备份失败：${message}`
  }
}

async function handleClearRuntimeCaches(): Promise<void> {
  const profileId = accountStore.currentAccount?.id ?? DEFAULT_ACCOUNT_ID
  const cachedAssetsBeforeClear = assetStore.assets.length
  let browserCacheCount = 0

  try {
    assetStore.cleanup()

    if (typeof window !== 'undefined' && 'caches' in window) {
      const names = await globalThis.caches.keys()
      browserCacheCount = names.length
      await Promise.all(names.map(name => globalThis.caches.delete(name)))
    }

    await auditLog('system.cache_clear', {
      actorId: profileId,
      profileId,
      severity: 'warning',
      outcome: 'success',
      payload: { cachedAssetsBeforeClear, browserCacheCount },
      source: 'SettingsView.handleClearRuntimeCaches',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('清理运行时缓存失败', error instanceof Error ? error : new Error(message))
    await auditLog('system.cache_clear', {
      actorId: profileId,
      profileId,
      severity: 'error',
      outcome: 'failure',
      reason: message,
      payload: { cachedAssetsBeforeClear, browserCacheCount },
      source: 'SettingsView.handleClearRuntimeCaches',
    })
  }

  await Promise.allSettled([
    refreshCacheHealth(),
    refreshStorageHealth(),
  ])
}

function buildDiagnosticsPayload(): Record<string, unknown> {
  return {
    generatedAt: new Date().toISOString(),
    runtime: runtimeDiagnostics.value,
    storage: {
      ...storageHealth.value,
      usageLabel: formatBytes(storageHealth.value.usage),
      quotaLabel: formatBytes(storageHealth.value.quota),
    },
    cache: {
      ...cacheHealth.value,
      previewCacheCount: cachedUrlCount.value,
    },
    performance: {
      ...performanceSnapshot.value,
      memoryLabel: performanceSnapshot.value.memoryBytes === null
        ? null
        : formatBytes(performanceSnapshot.value.memoryBytes),
    },
    settingsSummary: {
      theme: settings.value.appearance.theme,
      editorMode: settings.value.editor.editorMode,
      editorWidth: settings.value.editor.editorWidth,
      autoBackup: settings.value.data.autoBackup,
      backupInterval: settings.value.data.backupInterval,
      maxBackups: settings.value.data.maxBackups,
      logLevel: settings.value.advanced.logLevel,
      featureFlags: {
        ...settings.value.featureFlags,
      },
      proxy: {
        enabled: settings.value.proxy.enabled,
        protocol: settings.value.proxy.protocol,
        host: settings.value.proxy.host,
        port: settings.value.proxy.port,
        hasCredentials: Boolean(settings.value.proxy.username.trim() || settings.value.proxy.password.trim()),
      },
      ai: {
        provider: settings.value.ai.provider,
        model: settings.value.ai.model,
        hasApiKey: settings.value.ai.apiKey.trim().length > 0,
      },
    },
  }
}

function handleDeveloperModeChange(): void {
  devPanelStore.setPersistentDeveloperMode(settings.value.advanced.developerMode)
}

function refreshCustomCssStyleState(): void {
  customCssStylePresent.value = Boolean(document.getElementById(CUSTOM_CSS_STYLE_ID))
}

function setCustomCssActionMessage(type: 'success' | 'error' | 'warning', text: string): void {
  customCssActionMessage.value = { type, text }
}

function ensureCustomCssConfirmed(): boolean {
  const customCss = settings.value.advanced.customCss
  if (customCss.confirmedAt) {
    return true
  }

  const confirmed = window.confirm([
    '启用自定义 CSS',
    '',
    '自定义 CSS 可能导致纸张视觉异常或编辑器不可用。',
    '若出现严重问题，应用将在下次启动自动禁用。',
    '',
    '是否仍然启用？',
  ].join('\n'))

  if (!confirmed) {
    customCss.enabled = false
    settingsStore.save()
    return false
  }

  customCss.confirmedAt = new Date().toISOString()
  settingsStore.save()
  return true
}

function recordCustomCssError(type: 'parse' | 'sandbox' | 'runtime' | 'safe-mode', message: string, snippet: string | undefined, countForSuspension = true): boolean {
  const now = Date.now()
  const customCss = settings.value.advanced.customCss
  customCss.errorLog = appendCustomCssErrorLog(customCss.errorLog, { type, message, snippet }, now)

  if (countForSuspension && shouldSuspendForCustomCssErrors(customCss.errorLog, now)) {
    customCss.enabled = false
    customCss.suspendedReason = 'sandbox-error-limit'
    applyCustomCssRuntime(customCss)
    refreshCustomCssStyleState()
    setCustomCssActionMessage('error', 'CustomCSS 已因 1 分钟内 3 次错误自动停用。')
    settingsStore.save()
    return true
  }

  settingsStore.save()
  return false
}

function applyCustomCssFromSettings(): void {
  const result = applyCustomCssRuntime(settings.value.advanced.customCss)
  refreshCustomCssStyleState()

  if (result.status === 'rejected') {
    const suspended = recordCustomCssError('runtime', result.message, result.sandboxResult?.sourceCss.slice(0, 500), true)
    if (!suspended) {
      setCustomCssActionMessage('error', result.message)
    }
    return
  }

  if (result.status === 'suspended') {
    settings.value.advanced.customCss.enabled = false
    settings.value.advanced.customCss.suspendedReason = 'safe-mode'
    recordCustomCssError('safe-mode', result.message, undefined, false)
    setCustomCssActionMessage('warning', result.message)
    return
  }

  if (result.status === 'applied') {
    setCustomCssActionMessage('success', result.message)
  }
}

function handleCustomCssEnabledChange(): void {
  const customCss = settings.value.advanced.customCss
  if (!customCss.enabled) {
    customCss.suspendedReason = null
    applyCustomCssFromSettings()
    settingsStore.save()
    return
  }

  if (!ensureCustomCssConfirmed()) {
    return
  }

  customCss.suspendedReason = null
  if (!customCss.published.trim()) {
    setCustomCssActionMessage('warning', 'CustomCSS 已启用，但尚未应用任何 CSS。请编辑后点击应用。')
    applyCustomCssFromSettings()
    settingsStore.save()
    return
  }

  applyCustomCssFromSettings()
  settingsStore.save()
}

function handleApplyCustomCss(): void {
  if (!ensureCustomCssConfirmed()) {
    return
  }

  const customCss = settings.value.advanced.customCss
  const sandboxResult = sandboxCustomCss(customCss.draft)
  customCssSandboxResult.value = sandboxResult

  if (!sandboxResult.ok) {
    const message = firstCustomCssErrorMessage(sandboxResult.errors)
    const isParseOnly = sandboxResult.errors.some(error => error.code === 'css-parse-error')
    const suspended = recordCustomCssError(isParseOnly ? 'parse' : 'sandbox', message, customCss.draft.slice(0, 500), !isParseOnly)
    if (!suspended) {
      setCustomCssActionMessage('error', summarizeCustomCssIssues(sandboxResult.errors))
    }
    return
  }

  customCss.enabled = true
  customCss.suspendedReason = null
  customCss.published = customCss.draft
  customCss.lastAppliedAt = new Date().toISOString()
  applyCustomCssFromSettings()
  settingsStore.save()
}

function handleResetCustomCss(): void {
  const confirmed = window.confirm('重置 CustomCSS 会清空草稿、已应用 CSS 和错误日志，并移除运行时样式。是否继续？')
  if (!confirmed) {
    return
  }

  settings.value.advanced.customCss = {
    enabled: false,
    draft: '',
    published: '',
    confirmedAt: null,
    suspendedReason: null,
    lastAppliedAt: null,
    errorLog: [],
  }
  customCssSandboxResult.value = null
  applyCustomCssFromSettings()
  setCustomCssActionMessage('success', 'CustomCSS 已重置并移除运行时样式。')
  settingsStore.save()
}

function handleInsertCustomCssSnippet(): void {
  const snippet = customCssSnippetOptions.find(item => item.id === selectedCustomCssSnippet.value)
  if (!snippet) {
    return
  }

  const current = settings.value.advanced.customCss.draft.trimEnd()
  settings.value.advanced.customCss.draft = current ? `${current}\n\n${snippet.css}\n` : `${snippet.css}\n`
  selectedCustomCssSnippet.value = ''
  customCssSandboxResult.value = sandboxCustomCss(settings.value.advanced.customCss.draft)
  settingsStore.save()
}

function handleExportCustomCss(): void {
  const exportedAt = new Date().toISOString()
  const sourceCss = settings.value.advanced.customCss.draft
  const content = [
    '/*!',
    ' * InkForge Custom CSS',
    ` * Exported at: ${exportedAt}`,
    ' * InkForge version: 2.1',
    ' * Notes: Scoped to .editor-content and the live ProseMirror editor; @import/remote url/!important are forbidden.',
    ' */',
    '',
    sourceCss,
  ].join('\n')

  downloadAuditExport(content, 'inkforge-custom.css', 'text/css')
  setCustomCssActionMessage('success', '已导出 inkforge-custom.css。')
}

function triggerCustomCssImport(): void {
  customCssImportInput.value?.click()
}

async function handleImportCustomCssFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) {
    return
  }

  if (settings.value.advanced.customCss.draft.trim()) {
    const confirmed = window.confirm('当前 CustomCSS 草稿将被导入文件覆盖。是否继续？')
    if (!confirmed) {
      return
    }
  }

  const text = await file.text()
  if (text.length > CUSTOM_CSS_MAX_LENGTH) {
    recordCustomCssError('sandbox', `导入文件超过 ${CUSTOM_CSS_MAX_LENGTH} 字符上限。`, text.slice(0, 500), true)
    return
  }

  settings.value.advanced.customCss.draft = text
  customCssSandboxResult.value = sandboxCustomCss(text)
  setCustomCssActionMessage(
    customCssSandboxResult.value.ok ? 'success' : 'warning',
    customCssSandboxResult.value.ok ? '已导入 CSS；点击应用后生效。' : '已导入 CSS，但应用前需要修复校验问题。',
  )
  settingsStore.save()
}

function handleClearCustomCssLog(): void {
  settings.value.advanced.customCss.errorLog = []
  setCustomCssActionMessage('success', 'CustomCSS 错误日志已清空。')
  settingsStore.save()
}

function handleToggleDevPanel(): void {
  if (isPanelVisible.value) {
    devPanelStore.closePanel('settings')
    return
  }

  devPanelStore.openPanel('settings')
}
function handleExportDiagnostics(): void {
  runtimeExportBusy.value = true

  try {
    const payload = buildDiagnosticsPayload()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `inkforge-diagnostics-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  } finally {
    runtimeExportBusy.value = false
  }
}

function getCurrentExportPlatform(): Platform {
  return settings.value.export.defaultPlatform
}

function getExportPlatformLabel(platform: Platform): string {
  return platformOptions.find(option => option.value === platform)?.label ?? platform
}

function getExportActionLabel(action: string): string {
  switch (action) {
    case 'copy':
      return '复制到剪贴板'
    case 'download':
      return '下载文件'
    case 'settings-preview':
      return '设置预览复制'
    default:
      return action
  }
}

function buildExportSettingsMarkdown(): string {
  const selectedArticle = articleStore.selectedArticle
  if (selectedArticle?.rawContent?.trim()) {
    return selectedArticle.rawContent
  }

  return [
    '# InkForge 导出设置预览',
    '',
    `- 当前平台：${getExportPlatformLabel(getCurrentExportPlatform())}`,
    `- 主题预设：${settings.value.export.defaultPresetId}`,
    `- 代码主题：${settings.value.export.codeTheme}`,
    `- Mac 风格代码块：${settings.value.export.macCodeBlock ? '启用' : '关闭'}`,
    `- 代码行号：${settings.value.export.lineNumbers ? '启用' : '关闭'}`,
    `- 外链转脚注：${settings.value.export.convertFootnotes ? '启用' : '关闭'}`,
    `- 首行缩进：${settings.value.export.textIndent ? '启用' : '关闭'}`,
    selectedArticle?.title ? `- 当前选中文章：${selectedArticle.title}` : '- 当前选中文章：无',
  ].join('\n')
}

function appendCustomCssToExportHtml(html: string): string {
  const customCss = settings.value.export.customCss.trim()
  if (!customCss) {
    return html
  }

  const safeCss = customCss.replace(/<\/style/gi, '<\\/style')
  return `${html}\n<style data-inkforge-custom-css="settings">\n${safeCss}\n</style>`
}

async function buildExportSettingsPreviewHtml(): Promise<string> {
  const html = await convertToPlatform(buildExportSettingsMarkdown(), getCurrentExportPlatform(), {
    presetId: settings.value.export.defaultPresetId,
    exportOptions: {
      enableCiteStatus: settings.value.export.convertFootnotes,
      enableLineNumbers: settings.value.export.lineNumbers,
      enableCodeHighlight: true,
      enableMacCodeBlock: settings.value.export.macCodeBlock,
      enableTextIndent: settings.value.export.textIndent,
      codeTheme: settings.value.export.codeTheme as CodeTheme,
      customCss: settings.value.export.customCss,
    },
    overrides: {
      primaryColor: settings.value.appearance.accentColor,
      fontFamily: settings.value.appearance.fontFamily,
    },
  })

  return getCurrentExportPlatform() === 'wechat'
    ? html
    : appendCustomCssToExportHtml(html)
}

function setExportPreviewCopyStatus(status: 'idle' | 'copied' | 'error'): void {
  exportPreviewCopyStatus.value = status

  if (exportPreviewCopyTimer) {
    clearTimeout(exportPreviewCopyTimer)
  }

  if (status !== 'idle') {
    exportPreviewCopyTimer = setTimeout(() => {
      exportPreviewCopyStatus.value = 'idle'
      exportPreviewCopyTimer = null
    }, 2200)
  }
}

async function handleCopyExportSettingsPreviewHtml(): Promise<void> {
  try {
    const html = await buildExportSettingsPreviewHtml()
    const copied = await copyToClipboard(html)

    if (!copied) {
      setExportPreviewCopyStatus('error')
      return
    }

    const selectedArticle = articleStore.selectedArticle
    settingsStore.recordExportHistory({
      platform: getCurrentExportPlatform(),
      title: selectedArticle?.title?.trim() || '设置预览 HTML',
      bytes: new Blob([html]).size,
      action: 'settings-preview',
    })
    setExportPreviewCopyStatus('copied')
  } catch (error) {
    logger.error('复制导出预览 HTML 失败', error instanceof Error ? error : new Error(String(error)))
    setExportPreviewCopyStatus('error')
  }
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
  settingsStore.recordExportHistory({
    platform: getCurrentExportPlatform(),
    title: 'Settings JSON',
    bytes: blob.size,
    action: 'download',
  })
}

function handleClearExportHistory(): void {
  showConfirm(
    '清空导出历史',
    '仅清空最近 10 次应用内导出与复制记录，不会修改文章、排版预设或导出设置。',
    () => settingsStore.clearExportHistory(),
    'CLEAR',
  )
}

function formatSettingsMigrationError(code: string, message: string): string {
  if (code === 'parse-failure') {
    return 'Settings JSON 解析失败，请确认文件内容完整。'
  }

  if (code === 'future-version') {
    return 'Settings 文件来自更新版本的 InkForge，请先升级当前应用。'
  }

  if (code === 'unsupported-version') {
    return 'Settings 文件版本过旧，需要通过导入向导处理。'
  }

  if (code === 'zod-validation-failure') {
    return 'Settings 文件迁移后未通过运行时校验，当前设置未被覆盖。'
  }

  return `Settings 迁移预览失败：${message}`
}

function formatMigrationDiffKindLabel(kind: 'added' | 'removed' | 'changed'): string {
  const labels: Record<'added' | 'removed' | 'changed', string> = {
    added: '新增',
    removed: '移除',
    changed: '变更',
  }
  return labels[kind]
}

function triggerSettingsImport(): void {
  settingsImportInput.value?.click()
}

async function handleImportSettings(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) return

  try {
    const text = await file.text()
    const preview = settingsStore.previewImportSettings(text)
    if (!preview.ok) {
      importFeedback.value = {
        type: 'error',
        text: formatSettingsMigrationError(preview.error.code, preview.error.message),
      }
      clearFeedbackTimer()
      return
    }

    showConfirm(
      '确认导入 Settings',
      `将导入 Settings schema v${preview.preview.fromVersion} → v${preview.preview.toVersion}。${migrationPreviewSummaryText.value}。导入前会自动创建回滚点，并保留最近 10 个快照。`,
      () => {
        const success = settingsStore.importSettings(text)
        importFeedback.value = success
          ? { type: 'success', text: `设置导入成功：${migrationPreviewSummaryText.value}` }
          : { type: 'error', text: '设置文件迁移或校验失败，当前设置未被覆盖' }
        clearFeedbackTimer()
      },
      'IMPORT',
    )
  } catch {
    importFeedback.value = { type: 'error', text: '读取文件失败' }
    clearFeedbackTimer()
  }
}
function clearFeedbackTimer(): void {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    importFeedback.value = null
  }, 3000)
}

async function handleManualSync(): Promise<void> {
  if (syncActionBusy.value) {
    return
  }
  await syncStore.sync()
}

function formatAuditTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
}

function getAuditSeverityLabel(severity: AuditSeverity): string {
  const labels: Record<AuditSeverity, string> = {
    info: '信息',
    warning: '警告',
    error: '错误',
    critical: '严重',
  }
  return labels[severity]
}

function formatAuditPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2)
}

function downloadAuditExport(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

async function refreshAuditEntriesForProfile(profileId: string): Promise<void> {
  await auditStore.fetchEntries({
    profileId,
    keyword: auditKeyword.value.trim() || undefined,
    actions: auditActionFilter.value === 'all' ? undefined : [auditActionFilter.value],
    severities: auditSeverityFilter.value === 'all' ? undefined : [auditSeverityFilter.value],
    offset: 0,
  })
}

async function refreshAuditEntries(): Promise<void> {
  await refreshAuditEntriesForProfile(currentProfileId())
}

async function handleAuditExport(kind: 'csv' | 'json'): Promise<void> {
  auditExportMessage.value = null
  try {
    const exported = kind === 'csv'
      ? await auditStore.exportCSV()
      : await auditStore.exportJSON()
    downloadAuditExport(exported.content, exported.fileName, exported.mimeType)
    auditExportMessage.value = { type: 'success', text: `已导出 ${exported.totalCount} 条审计记录：${exported.fileName}` }
  } catch (error) {
    auditExportMessage.value = { type: 'error', text: getErrorMessage(error) }
  }
}

async function handleAuditIntegrityCheck(): Promise<void> {
  await auditStore.verifyIntegrity()
}

function currentProfileId(): string {
  return profileStore.activeProfileId ?? accountStore.currentAccount?.id ?? DEFAULT_ACCOUNT_ID
}

function getProfileFileRootLabel(profile: ProfileRecord): string {
  if (profile.fileRoot) {
    return profile.fileRoot
  }

  if (profile.fileRootStatus === 'native-unavailable') {
    return '浏览器运行时未接入 Tauri 目录选择，未伪造文件根'
  }

  return '尚未分配文件根'
}

function getProfileFileRootStatusLabel(profile: ProfileRecord): string {
  const labels: Record<ProfileRecord['fileRootStatus'], string> = {
    unassigned: '未分配',
    selected: '已选择',
    'native-unavailable': '原生边界不可用',
  }
  return labels[profile.fileRootStatus]
}

function formatProfileTime(timestamp: number): string {
  return formatAuditTime(timestamp)
}

async function syncProfileScopedStores(profileId = currentProfileId()): Promise<void> {
  auditStore.setProfile(profileId)
  await Promise.allSettled([
    refreshAuditEntriesForProfile(profileId),
    extensionStore.load(profileId),
    syncPerformanceCollection(profileId),
  ])
}

async function refreshProfiles(): Promise<void> {
  profileActionMessage.value = null
  try {
    await profileStore.loadProfiles(accountStore.currentAccount ?? undefined)
    await syncProfileScopedStores()
  } catch (error) {
    profileActionMessage.value = { type: 'error', text: getErrorMessage(error) }
  }
}

async function handlePickProfileDirectory(): Promise<void> {
  profileActionMessage.value = null
  profileFileRootPickerBusy.value = true
  try {
    const result = await pickNativeDirectory('选择工作区文件根目录')
    if (result.ok) {
      profileFileRootDraft.value = result.value
      profileActionMessage.value = { type: 'success', text: '已选择原生文件根目录。' }
    } else if (result.reason === 'cancelled') {
      profileActionMessage.value = { type: 'warning', text: '已取消目录选择，原有选择未更改。' }
    } else {
      profileActionMessage.value = { type: 'error', text: result.message }
    }
  } catch (error) {
    profileActionMessage.value = { type: 'error', text: getErrorMessage(error) }
  } finally {
    profileFileRootPickerBusy.value = false
  }
}

async function handleCreateProfile(): Promise<void> {
  profileActionMessage.value = null
  try {
    const created = await profileStore.createProfile({
      name: profileNameDraft.value,
      avatarIcon: profileAvatarDraft.value,
      colorAccent: profileAccentDraft.value,
      fileRoot: profileFileRootDraft.value,
      fileRootStatus: profileFileRootDraft.value
        ? 'selected'
        : profileNativeDirectoryAvailable ? 'unassigned' : 'native-unavailable',
    }, currentProfileId())
    profileNameDraft.value = ''
    profileFileRootDraft.value = null
    await syncProfileScopedStores(created.id)
    profileActionMessage.value = { type: 'success', text: `已创建并切换到工作区：${created.name}` }
  } catch (error) {
    profileActionMessage.value = { type: 'error', text: getErrorMessage(error) }
  }
}

async function handleSwitchProfile(profile: ProfileRecord): Promise<void> {
  profileActionMessage.value = null
  try {
    const switched = await profileStore.switchProfile(profile.id, currentProfileId())
    await syncProfileScopedStores(switched.id)
    profileActionMessage.value = { type: 'success', text: `已切换到工作区：${switched.name}` }
  } catch (error) {
    profileActionMessage.value = { type: 'error', text: getErrorMessage(error) }
  }
}

async function handleSoftDeleteProfile(profile: ProfileRecord): Promise<void> {
  showConfirm(
    '删除工作区',
    `工作区「${profile.name}」将进入 7 天恢复期。此操作不会删除文件系统内容，也不会伪造彻底清除。`,
    async () => {
      try {
        await profileStore.softDeleteProfile(profile.id, currentProfileId())
        await syncProfileScopedStores()
        profileActionMessage.value = { type: 'success', text: `工作区已进入恢复期：${profile.name}` }
      } catch (error) {
        profileActionMessage.value = { type: 'error', text: getErrorMessage(error) }
      }
    },
    profile.name,
  )
}

async function handleRestoreProfile(profile: ProfileRecord): Promise<void> {
  profileActionMessage.value = null
  try {
    const restored = await profileStore.restoreProfile(profile.id, currentProfileId())
    await syncProfileScopedStores(restored.id)
    profileActionMessage.value = { type: 'success', text: `已恢复工作区：${restored.name}` }
  } catch (error) {
    profileActionMessage.value = { type: 'error', text: getErrorMessage(error) }
  }
}

async function refreshExtensions(): Promise<void> {
  await extensionStore.load(currentProfileId())
}

function getExtensionStatusLabel(status: ExtensionRecord['status']): string {
  const labels: Record<ExtensionRecord['status'], string> = {
    installed: '已安装',
    enabled: '已启用',
    disabled: '已停用',
    error: '错误',
    blocked: '已阻断',
  }
  return labels[status]
}

function formatExtensionPermission(permission: string): string {
  return permission.replace(':', ' / ')
}

async function handleExtensionManifestFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  extensionManifestText.value = await file.text()
  input.value = ''
}

async function handleInstallExtensionManifest(): Promise<void> {
  extensionActionMessage.value = null
  try {
    const parsed = JSON.parse(extensionManifestText.value) as unknown
    const record = await extensionStore.installLocalManifest(parsed, currentProfileId(), currentProfileId())
    extensionActionMessage.value = { type: 'success', text: `已安装本地扩展：${record.manifest.name}` }
    extensionManifestText.value = ''
  } catch (error) {
    extensionActionMessage.value = { type: 'error', text: getErrorMessage(error) }
  }
}

async function handleToggleExtension(record: ExtensionRecord): Promise<void> {
  extensionActionMessage.value = null
  try {
    const result = record.enabled
      ? await extensionStore.disableExtension(record.profileId, record.extensionId, currentProfileId())
      : await extensionStore.enableExtension(record.profileId, record.extensionId, currentProfileId())
    extensionActionMessage.value = {
      type: result.enabled ? 'success' : 'error',
      text: extensionStore.lastActionMessage ?? (result.enabled ? '扩展已启用。' : '扩展未启用。'),
    }
  } catch (error) {
    extensionActionMessage.value = { type: 'error', text: getErrorMessage(error) }
  }
}

async function handleUninstallExtension(record: ExtensionRecord): Promise<void> {
  extensionActionMessage.value = null
  try {
    await extensionStore.uninstallExtension(record.profileId, record.extensionId, currentProfileId())
    extensionActionMessage.value = { type: 'success', text: `已卸载扩展：${record.manifest.name}` }
  } catch (error) {
    extensionActionMessage.value = { type: 'error', text: getErrorMessage(error) }
  }
}

// 确认弹窗状态
interface ConfirmDialog {
  visible: boolean
  title: string
  message: string
  action: (() => Promise<void> | void) | null
  requiresText: string | null
  input: string
  busy: boolean
  error: string | null
}

const confirmDialog = ref<ConfirmDialog>({
  visible: false,
  title: '',
  message: '',
  action: null,
  requiresText: null,
  input: '',
  busy: false,
  error: null,
})

const dangerActionFeedback = ref<{
  type: 'success' | 'warning' | 'error'
  text: string
} | null>(null)

function showConfirm(
  title: string,
  message: string,
  action: () => Promise<void> | void,
  requiresText: string | null = null,
): void {
  confirmDialog.value = {
    visible: true,
    title,
    message,
    action,
    requiresText,
    input: '',
    busy: false,
    error: null,
  }
}

const confirmActionDisabled = computed(() => {
  if (confirmDialog.value.busy) {
    return true
  }

  if (!confirmDialog.value.requiresText) {
    return false
  }

  return confirmDialog.value.input.trim() !== confirmDialog.value.requiresText
})

async function confirmAction(): Promise<void> {
  if (confirmActionDisabled.value) {
    return
  }

  confirmDialog.value.busy = true
  confirmDialog.value.error = null

  try {
    await confirmDialog.value.action?.()
    confirmDialog.value.busy = false
    cancelConfirm()
  } catch (error) {
    confirmDialog.value.error = error instanceof Error ? error.message : '操作失败，请重试。'
  } finally {
    confirmDialog.value.busy = false
  }
}

function cancelConfirm(): void {
  if (confirmDialog.value.busy) {
    return
  }

  confirmDialog.value = {
    visible: false,
    title: '',
    message: '',
    action: null,
    requiresText: null,
    input: '',
    busy: false,
    error: null,
  }
}


function openHelpCenter(): void {
  ftueStore.openHelpCenter('topics')
}

function handleResetFTUE(): void {
  showConfirm(
    '重置首次使用状态',
    '这会清空欢迎弹窗和帮助已读状态，并在确认后立即重新打开轻量欢迎流程；正常启动仍遵循不重复打扰策略。该操作不会创建、删除或修改任何文章、素材、账户或设置内容。',
    async () => {
      await ftueStore.reset()
      importFeedback.value = { type: 'success', text: '首次使用状态已重置' }
      clearFeedbackTimer()
    },
  )
}
function handleClearArticles(): void {
  dangerActionFeedback.value = null
  showConfirm(
    '将所有文章移入回收站',
    '这会将当前全部文章移入回收站，正文和版本历史会保留，可在回收站中恢复。确定要继续吗？',
    async () => {
      const ids = articleStore.articles.map(article => article.id)
      const warnings = new Set<string>()

      try {
        for (const id of ids) {
          const warning = await articleStore.deleteArticle(id)
          if (warning) warnings.add(warning)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '移入回收站失败'
        dangerActionFeedback.value = {
          type: 'error',
          text: `批量操作未完成：${message}。已成功处理的文章仍可在回收站中恢复。`,
        }
        throw error
      }

      dangerActionFeedback.value = warnings.size > 0
        ? {
            type: 'warning',
            text: `文章已移入回收站，但有后续处理警告：${Array.from(warnings).join(' ')}`,
          }
        : {
            type: 'success',
            text: `已将 ${ids.length} 篇文章移入回收站，可在回收站中恢复。`,
          }
    },
    'DELETE',
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
      await auditLog('system.cache_clear', {
        actorId: accountStore.currentAccount?.id ?? DEFAULT_ACCOUNT_ID,
        profileId: accountStore.currentAccount?.id ?? DEFAULT_ACCOUNT_ID,
        severity: 'warning',
        outcome: 'success',
        payload: { clearedAssetCount: ids.length },
        source: 'SettingsView.handleClearAssets',
      })
    },
    'DELETE',
  )
}

function handleResetSettings(): void {
  showConfirm(
    '重置所有设置',
    '此操作将把所有设置恢复为默认值，不可撤销。确定要继续吗？',
    async () => {
      settingsStore.reset()
      await auditLog('account.settings_change', {
        actorId: accountStore.currentAccount?.id ?? DEFAULT_ACCOUNT_ID,
        profileId: accountStore.currentAccount?.id ?? DEFAULT_ACCOUNT_ID,
        severity: 'warning',
        outcome: 'success',
        payload: { scope: 'all' },
        source: 'SettingsView.handleResetSettings',
      })
    },
    'DELETE',
  )
}

function handleResetCurrentTab(): void {
  showConfirm(
    `重置${currentTabName.value} Tab`,
    `此操作会先创建回滚点，然后将${currentTabName.value} Tab 的设置恢复为默认值。`,
    async () => {
      const tabId = currentTab.value
      settingsStore.resetTab(tabId)
      await auditLog('account.settings_change', {
        actorId: accountStore.currentAccount?.id ?? DEFAULT_ACCOUNT_ID,
        profileId: accountStore.currentAccount?.id ?? DEFAULT_ACCOUNT_ID,
        severity: 'warning',
        outcome: 'success',
        payload: { scope: 'tab', tabId },
        source: 'SettingsView.handleResetCurrentTab',
      })
    },
    'RESET',
  )
}

function handleCreateRollbackPoint(): void {
  const snapshotId = settingsStore.createRollbackPoint('manual:' + currentTab.value)
  importFeedback.value = { type: 'success', text: `已创建回滚点 ${snapshotId}` }
  clearFeedbackTimer()
}

function handleRestoreRollbackPoint(snapshotId: string): void {
  showConfirm(
    '恢复设置回滚点',
    '此操作会用所选快照恢复设置，并保留现有回滚点列表。',
    () => {
      const restored = settingsStore.restoreRollbackPoint(snapshotId)
      importFeedback.value = restored
        ? { type: 'success', text: '已恢复设置回滚点' }
        : { type: 'error', text: '回滚点校验失败或不存在' }
      clearFeedbackTimer()
    },
    'RESTORE',
  )
}

function handleRestoreLatestRollbackPoint(): void {
  const latestSnapshot = latestMigrationSnapshot.value
  if (!latestSnapshot) {
    importFeedback.value = { type: 'error', text: '当前没有可恢复的回滚点' }
    clearFeedbackTimer()
    return
  }

  handleRestoreRollbackPoint(latestSnapshot.id)
}
// ═══════════════════════════════════════
//  Tab 6: 快捷键
// ═══════════════════════════════════════

const shortcutDefinitionMap = Object.fromEntries(
  SHORTCUT_DEFINITIONS.map(definition => [definition.id, definition]),
) as Record<string, (typeof SHORTCUT_DEFINITIONS)[number]>

const shortcutLabels = Object.fromEntries(
  SHORTCUT_DEFINITIONS.map(definition => [definition.id, definition.label]),
) as Record<string, string>

const normalizedShortcutSearch = computed(() => shortcutSearch.value.trim().toLowerCase())

const filteredShortcutGroups = computed(() => {
  return SHORTCUT_GROUPS
    .map(group => {
      const items = SHORTCUT_DEFINITIONS.filter(definition => {
        if (definition.group !== group.id) {
          return false
        }

        const query = normalizedShortcutSearch.value
        if (!query) {
          return true
        }

        const binding = settings.value.shortcuts[definition.id] ?? definition.defaultBinding
        return [definition.id, definition.label, definition.description, binding]
          .some(candidate => candidate.toLowerCase().includes(query))
      })

      return {
        ...group,
        items,
      }
    })
    .filter(group => group.items.length > 0)
})

const filteredShortcutCount = computed(() => {
  return filteredShortcutGroups.value.reduce((total, group) => total + group.items.length, 0)
})

const duplicateShortcutEntries = computed(() => {
  const bindingMap = new Map<string, string[]>()

  for (const definition of SHORTCUT_DEFINITIONS) {
    const binding = settings.value.shortcuts[definition.id] ?? definition.defaultBinding
    if (!binding) {
      continue
    }

    const duplicates = bindingMap.get(binding) ?? []
    duplicates.push(definition.id)
    bindingMap.set(binding, duplicates)
  }

  return Array.from(bindingMap.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([binding, ids]) => ({
      binding,
      labels: ids.map(id => shortcutLabels[id] ?? id),
    }))
})

function getShortcutBinding(shortcutId: string): string {
  return settings.value.shortcuts[shortcutId]
    ?? shortcutDefinitionMap[shortcutId]?.defaultBinding
    ?? ''
}

function updateShortcut(shortcutId: string, nextBinding: string): void {
  settings.value.shortcuts[shortcutId] = nextBinding
}

function resetShortcut(shortcutId: string): void {
  settingsStore.resetShortcut(shortcutId)
}

function resetAllShortcuts(): void {
  settingsStore.resetShortcuts()
}

// ═══════════════════════════════════════
//  导航
// ═══════════════════════════════════════

function getPerformanceStatusLabel(status: PerformanceStatus): string {
  const labels: Record<PerformanceStatus, string> = {
    pass: '达标',
    warn: '预警',
    breach: '超阈值',
    unsupported: '能力受限',
  }
  return labels[status]
}

function getPerformanceStatusClass(status: PerformanceStatus): string {
  const classes: Record<PerformanceStatus, string> = {
    pass: 'sv-inline-status--ready',
    warn: 'sv-inline-status--invalid',
    breach: 'sv-inline-status--danger',
    unsupported: 'sv-inline-status--disabled',
  }
  return classes[status]
}

function getPerformanceMetricLabel(metric: PerformanceMetricKind): string {
  return PERFORMANCE_THRESHOLDS[metric].label
}

function formatPerformanceMetricValue(sample: PerformanceSampleRecord): string {
  if (sample.value === null) {
    return 'unsupported'
  }

  if (sample.thresholdUnit === 'bytes') {
    return formatBytes(sample.value)
  }

  return `${sample.value} ${sample.thresholdUnit}`
}

async function syncPerformanceCollection(profileId = currentProfileId()): Promise<void> {
  if (!performanceMetricsFlag.enabled.value) {
    performanceStore.stop()
    return
  }

  await performanceStore.start(profileId, profileId, route.fullPath)
}
function goBack(): void {
  router.back()
}

function goToAccount(): void {
  void router.push('/account')
}

// ═══════════════════════════════════════
//  生命周期
// ═══════════════════════════════════════

// 监听 provider 切换，自动拉取 Ollama 模型列表
watch(
  () => [route.query.tab, route.query.section],
  () => {
    void applyRouteState()
  },
  { immediate: true },
)

watch(() => settings.value.ai.provider, (newProvider) => {
  if (newProvider === 'ollama') {
    fetchOllamaModels()
  }
})

watch(
  () => settings.value.advanced.logLevel,
  () => {
    runtimeDiagnostics.value = {
      ...runtimeDiagnostics.value,
      currentLogLevel: getLogLevel(),
    }
  },
  { immediate: true },
)

watch(
  () => settings.value.advanced.customCss,
  () => {
    customCssSandboxResult.value = settings.value.advanced.customCss.draft.trim()
      ? sandboxCustomCss(settings.value.advanced.customCss.draft)
      : null
    refreshCustomCssStyleState()
  },
  { deep: true, immediate: true },
)

watch(
  () => performanceMetricsFlag.enabled.value,
  (enabled) => {
    if (enabled) {
      void syncPerformanceCollection()
      void refreshPerformanceSnapshot()
      return
    }

    performanceStore.stop()

    performanceSnapshot.value = {
      sampledAt: new Date().toISOString(),
      fps: null,
      indexedDbReadMs: null,
      settingsWriteMs: null,
      navigationMs: null,
      memoryBytes: null,
      memorySource: 'unsupported',
      note: '未启用 performance-metrics 功能开关',
    }
  },
  { immediate: true },
)

onMounted(() => {
  refreshCustomCssStyleState()
  if (settings.value.ai.provider === 'ollama') {
    fetchOllamaModels()
  }
  void accountStore.ensureDefaultAccount().then(async account => {
    const profile = await profileStore.loadProfiles(account)
    auditStore.setProfile(profile.id)
    void refreshAuditEntries()
    void extensionStore.load(profile.id)
  })
  void desktopStore.refresh()
  // 初始化 asset store 数据
  void assetStore.loadAssets().finally(() => {
    void refreshRuntimePanels()
  })
  void applyRouteState()
})

onUnmounted(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  if (registryHighlightTimer) clearTimeout(registryHighlightTimer)
  if (exportPreviewCopyTimer) clearTimeout(exportPreviewCopyTimer)
  performanceStore.stop()
})
</script>

<template>
  <div class="settings-view">
    <!-- Header -->
    <header class="sv-header">
      <button
        type="button"
        class="sv-back-btn"
        aria-label="返回上一页"
        title="返回上一页"
        @click="goBack"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>返回</span>
      </button>
      <h1 class="sv-header-title">
        设置
      </h1>
      <div class="sv-header-spacer" />
      <div class="sv-header-actions">
        <button
          type="button"
          class="sv-action-btn sv-action-btn-sm"
          data-settings-action="reset-current-tab"
          @click="handleResetCurrentTab"
        >
          重置{{ currentTabName }} Tab
        </button>
        <button
          type="button"
          class="sv-action-btn sv-action-btn-sm"
          @click="handleCreateRollbackPoint"
        >
          创建回滚点
        </button>
      </div>
    </header>

    <!-- Body: Sidebar + Content -->
    <div class="sv-body">
      <!-- Sidebar Navigation -->
      <aside class="sv-sidebar">
        <div class="sv-settings-search-panel">
          <label
            class="sv-settings-search-label"
            for="settings-search-input"
          >设置搜索</label>
          <input
            id="settings-search-input"
            v-model.trim="settingsSearch"
            type="search"
            class="sv-input sv-settings-search-input"
            placeholder="搜索设置、作用域或关键词"
            @keydown.enter.prevent="settingsRegistryMatches[0] && focusSettingsRegistryItem(settingsRegistryMatches[0])"
          >
          <div
            class="sv-settings-search-results"
            role="listbox"
            aria-label="设置搜索结果"
          >
            <button
              v-for="item in settingsRegistryMatches"
              :key="item.id"
              type="button"
              class="sv-settings-search-result"
              :class="{ active: activeRegistryMatchId === item.id }"
              :data-settings-search-result="item.id"
              @click="focusSettingsRegistryItem(item)"
            >
              <span class="sv-settings-search-result__label">{{ item.label }}</span>
              <span class="sv-settings-search-result__meta">
                {{ getTabName(item.tab) }} / {{ getRegistryScopeLabel(item.scope) }}
              </span>
            </button>
            <div
              v-if="settingsRegistryMatches.length === 0"
              class="sv-settings-search-empty"
            >
              没有匹配的设置项
            </div>
          </div>
        </div>

        <nav class="sv-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="sv-nav-item"
            :class="{ active: currentTab === tab.id }"
            @click="selectTab(tab.id)"
          >
            <!-- Palette / Appearance -->
            <svg
              v-if="tab.id === 'appearance'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle
                cx="13.5"
                cy="6.5"
                r=".5"
                fill="currentColor"
              />
              <circle
                cx="17.5"
                cy="10.5"
                r=".5"
                fill="currentColor"
              />
              <circle
                cx="8.5"
                cy="7.5"
                r=".5"
                fill="currentColor"
              />
              <circle
                cx="6.5"
                cy="12.5"
                r=".5"
                fill="currentColor"
              />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
            </svg>
            <!-- Edit / Editor -->
            <svg
              v-else-if="tab.id === 'editor'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <!-- Share / Export -->
            <svg
              v-else-if="tab.id === 'export'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line
                x1="12"
                y1="2"
                x2="12"
                y2="15"
              />
            </svg>
            <!-- Sparkles / AI -->
            <svg
              v-else-if="tab.id === 'ai'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" /><path d="M3 5h4" />
              <path d="M19 17v4" /><path d="M17 19h4" />
            </svg>
            <!-- Database / Data -->
            <svg
              v-else-if="tab.id === 'data'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <ellipse
                cx="12"
                cy="5"
                rx="9"
                ry="3"
              />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <!-- Refresh / Sync -->
            <svg
              v-else-if="tab.id === 'sync'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
              <path d="M21 21v-5h-5" />
            </svg>
            <!-- Shield / Audit -->
            <svg
              v-else-if="tab.id === 'audit'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="M9 12l2 2 4-5" />
            </svg>
            <!-- User Square / Profiles -->
            <svg
              v-else-if="tab.id === 'profiles'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="4"
              />
              <circle
                cx="12"
                cy="10"
                r="3"
              />
              <path d="M7 19c1.2-2.4 2.9-3.6 5-3.6s3.8 1.2 5 3.6" />
            </svg>
            <!-- Puzzle / Extensions -->
            <svg
              v-else-if="tab.id === 'extensions'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M19.4 13.5a1.9 1.9 0 1 0 0-3.8H17V7.3a1.9 1.9 0 1 0-3.8 0V9H11.5V6.6a1.9 1.9 0 1 0-3.8 0V9H5.3a1.9 1.9 0 1 0 0 3.8H7v1.7H4.6a1.9 1.9 0 1 0 0 3.8H7v.4a1.3 1.3 0 0 0 1.3 1.3h8.4a1.3 1.3 0 0 0 1.3-1.3v-3.2h1.4Z" />
            </svg>
            <!-- Keyboard / Shortcuts -->
            <svg
              v-else-if="tab.id === 'shortcuts'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect
                x="2"
                y="4"
                width="20"
                height="16"
                rx="2"
                ry="2"
              />
              <path d="M6 8h.001" /><path d="M10 8h.001" />
              <path d="M14 8h.001" /><path d="M18 8h.001" />
              <path d="M8 12h.001" /><path d="M12 12h.001" />
              <path d="M16 12h.001" /><path d="M7 16h10" />
            </svg>
            <!-- Info / About -->
            <svg
              v-else-if="tab.id === 'about'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
              <line
                x1="12"
                y1="16"
                x2="12"
                y2="12"
              />
              <line
                x1="12"
                y1="8"
                x2="12.01"
                y2="8"
              />
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
        <section
          v-show="currentTab === 'appearance'"
          class="sv-tab"
          data-settings-tab="appearance"
        >
          <h2 class="sv-tab-title">
            外观
          </h2>
          <p class="sv-tab-desc">
            自定义界面外观和视觉风格
          </p>

          <div class="sv-divider" />

          <!-- 主题模式 -->
          <div class="sv-section">
            <h3 class="sv-section-title">
              主题模式
            </h3>
            <div class="sv-card-group">
              <label
                v-for="opt in themeOptions"
                :key="opt.value"
                class="sv-theme-card"
                :class="{ selected: settings.appearance.theme === opt.value }"
              >
                <input
                  v-model="settings.appearance.theme"
                  type="radio"
                  :value="opt.value"
                  class="sv-hidden-radio"
                >
                <div
                  class="sv-theme-card-preview"
                  :data-theme="opt.value"
                >
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
            <h3 class="sv-section-title">
              预览字体
            </h3>
            <div class="sv-font-group">
              <label
                v-for="font in fontOptions"
                :key="font.value"
                class="sv-font-card"
                :class="{ selected: settings.appearance.fontFamily === font.value }"
              >
                <input
                  v-model="settings.appearance.fontFamily"
                  type="radio"
                  :value="font.value"
                  class="sv-hidden-radio"
                >
                <span class="sv-font-card-label">{{ font.label }}</span>
                <span
                  class="sv-font-card-sample"
                  :style="{ fontFamily: getFontStack(font.value) }"
                >
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
                aria-label="字体大小"
                :value="settings.appearance.fontSize"
                min="12"
                max="24"
                step="1"
                class="sv-range"
                @input="updateAppearanceFontSize(Number(($event.target as HTMLInputElement).value))"
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
                aria-label="行高"
                :value="settings.appearance.lineHeight"
                min="1.4"
                max="2.4"
                step="0.1"
                class="sv-range"
                @input="updateAppearanceLineHeight(Number(($event.target as HTMLInputElement).value))"
              >
              <span class="sv-range-value">{{ settings.appearance.lineHeight.toFixed(1) }}</span>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 排版预设 -->
          <div
            class="sv-section"
            data-settings-entry="appearance.typography"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  排版预设
                </h3>
                <p class="sv-section-note">
                  写入现有 Typography 设置并实时同步到 CSS token。
                </p>
              </div>
              <span class="sv-inline-status sv-inline-status--ready">{{ visualSystemDiagnostics.typographyPresetLabel }}</span>
            </div>
            <div class="sv-typography-grid">
              <button
                v-for="preset in typographyPresetOptions"
                :key="preset.id"
                type="button"
                class="sv-typography-card"
                :class="{ selected: isTypographyPresetSelected(preset.id) }"
                @click="applyTypographyPreset(preset.id)"
              >
                <span class="sv-typography-card__label">{{ preset.label }}</span>
                <span class="sv-typography-card__desc">{{ preset.description }}</span>
                <span class="sv-typography-card__meta">
                  {{ preset.typography.fontSize }}px / {{ preset.typography.lineHeight }} / {{ preset.typography.paragraphSpacing }}px
                </span>
              </button>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 主题色 -->
          <div class="sv-section">
            <h3 class="sv-section-title">
              主题色
            </h3>
            <div class="sv-accent-row">
              <button
                v-for="color in accentColors"
                :key="color.value"
                type="button"
                class="sv-accent-swatch"
                :class="{ selected: settings.appearance.accentColor === color.value }"
                :style="{ '--swatch-color': color.value }"
                :aria-label="`主题色：${color.label}`"
                :title="color.label"
                @click="settings.appearance.accentColor = color.value"
              >
                <svg
                  v-if="settings.appearance.accentColor === color.value"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <div
                class="sv-accent-custom"
                :class="{ active: isCustomAccent }"
              >
                <input
                  v-model="settings.appearance.accentColor"
                  type="color"
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
                v-model.number="settings.appearance.sidebarWidth"
                type="range"
                aria-label="侧边栏宽度"
                min="180"
                max="400"
                step="10"
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
              <input
                v-model="settings.appearance.reducedMotion"
                type="checkbox"
                aria-label="减弱动效"
              >
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <div class="sv-divider" />

          <!-- 视觉系统基线 -->
          <div
            class="sv-section"
            data-settings-entry="appearance.visualSystem"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  视觉系统基线
                </h3>
                <p class="sv-section-note">
                  ThemeEngine、FontSystem 与 Typography 的实时 token 状态。
                </p>
              </div>
              <span class="sv-inline-status sv-inline-status--ready">{{ visualSystemDiagnostics.version }}</span>
            </div>

            <div class="sv-visual-grid">
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">解析主题</span>
                <span class="sv-insight-card__value">{{ visualSystemDiagnostics.resolvedTheme }}</span>
                <span class="sv-insight-card__meta">来源：{{ visualSystemDiagnostics.themeMode }}</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">字体栈</span>
                <span class="sv-insight-card__value">{{ visualSystemDiagnostics.activeFont.label }}</span>
                <span class="sv-insight-card__meta">CJK / Latin / Mono 已拆分</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">Token 数量</span>
                <span class="sv-insight-card__value">{{ visualSystemDiagnostics.tokenCount }}</span>
                <span class="sv-insight-card__meta">写入 documentElement</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">品牌冻结</span>
                <span class="sv-insight-card__value">{{ visualSystemDiagnostics.brandFrozen ? '启用' : '关闭' }}</span>
                <span class="sv-insight-card__meta">内置主题保护核心品牌色</span>
              </div>
            </div>

            <div class="sv-token-preview">
              <div
                v-for="token in visualSystemTokenPreview"
                :key="token.name"
                class="sv-token-row"
              >
                <span class="sv-token-row__name">{{ token.name }}</span>
                <span class="sv-token-row__value">{{ token.value }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 2: 编辑器                       -->
        <!-- ═════════════════════════════════════ -->
        <section
          v-show="currentTab === 'editor'"
          class="sv-tab"
          data-settings-tab="editor"
        >
          <h2 class="sv-tab-title">
            编辑器
          </h2>
          <p class="sv-tab-desc">
            编辑器行为和功能设置
          </p>

          <div class="sv-section">
            <h3 class="sv-section-title">
              编辑模式
            </h3>
            <div class="sv-chip-group">
              <button
                v-for="option in editorModeOptions"
                :key="option.value"
                type="button"
                class="sv-chip-btn"
                :class="{ selected: settings.editor.editorMode === option.value }"
                @click="settings.editor.editorMode = option.value"
              >
                <span class="sv-chip-btn__label">{{ option.label }}</span>
                <span class="sv-chip-btn__desc">{{ option.description }}</span>
              </button>
            </div>
          </div>

          <div class="sv-divider" />

          <div class="sv-section">
            <h3 class="sv-section-title">
              版心宽度
            </h3>
            <div class="sv-chip-group">
              <button
                v-for="option in editorWidthOptions"
                :key="option.value"
                type="button"
                class="sv-chip-btn"
                :class="{ selected: settings.editor.editorWidth === option.value }"
                @click="settings.editor.editorWidth = option.value"
              >
                <span class="sv-chip-btn__label">{{ option.label }}</span>
                <span class="sv-chip-btn__desc">{{ option.description }}</span>
              </button>
            </div>
            <p class="sv-section-note">
              Workstation 已支持通过状态栏或 <code>Ctrl+=</code> / <code>Ctrl+-</code> 在四档版心之间循环切换。
            </p>
          </div>

          <!-- 自动保存 -->
          <div class="sv-divider" />

          <div
            id="writing-goal-section"
            class="sv-section"
            data-settings-section="writing-goal"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  写作目标
                </h3>
                <p class="sv-section-note">
                  当前文稿、今日与本周目标会驱动工作台状态栏和首页进度卡片。留空表示关闭对应目标。
                </p>
              </div>
              <span :class="writingGoalStatus.className">{{ writingGoalStatus.label }}</span>
            </div>

            <div class="sv-form-grid">
              <div>
                <label
                  class="sv-row-label"
                  for="writing-goal-document"
                >当前文稿目标字数</label>
                <input
                  id="writing-goal-document"
                  class="sv-input"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  step="1"
                  placeholder="例如 3000"
                  :aria-invalid="Boolean(writingGoalErrors.documentTarget)"
                  :aria-describedby="writingGoalErrors.documentTarget ? 'writing-goal-document-error' : undefined"
                  v-model="writingGoalDrafts.documentTarget"
                  @input="updateWritingGoal('documentTarget', ($event.target as HTMLInputElement).value)"
                  @blur="commitWritingGoal('documentTarget', ($event.target as HTMLInputElement).value)"
                >
                <span
                  v-if="writingGoalErrors.documentTarget"
                  id="writing-goal-document-error"
                  class="sv-field-error"
                  role="alert"
                >{{ writingGoalErrors.documentTarget }}</span>
                <span class="sv-row-desc">用于工作台底部状态栏展示当前文稿的实时达成进度。</span>
              </div>

              <div>
                <label
                  class="sv-row-label"
                  for="writing-goal-daily"
                >每日目标字数</label>
                <input
                  id="writing-goal-daily"
                  class="sv-input"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  step="1"
                  placeholder="例如 1200"
                  :aria-invalid="Boolean(writingGoalErrors.dailyTarget)"
                  :aria-describedby="writingGoalErrors.dailyTarget ? 'writing-goal-daily-error' : undefined"
                  v-model="writingGoalDrafts.dailyTarget"
                  @input="updateWritingGoal('dailyTarget', ($event.target as HTMLInputElement).value)"
                  @blur="commitWritingGoal('dailyTarget', ($event.target as HTMLInputElement).value)"
                >
                <span
                  v-if="writingGoalErrors.dailyTarget"
                  id="writing-goal-daily-error"
                  class="sv-field-error"
                  role="alert"
                >{{ writingGoalErrors.dailyTarget }}</span>
                <span class="sv-row-desc">按真实文章更新时间窗口统计今日累计字数，不使用 mock 或虚构日志。</span>
              </div>

              <div class="sv-form-grid__full">
                <label
                  class="sv-row-label"
                  for="writing-goal-weekly"
                >每周目标字数</label>
                <input
                  id="writing-goal-weekly"
                  class="sv-input"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  step="1"
                  placeholder="例如 8000"
                  :aria-invalid="Boolean(writingGoalErrors.weeklyTarget)"
                  :aria-describedby="writingGoalErrors.weeklyTarget ? 'writing-goal-weekly-error' : undefined"
                  v-model="writingGoalDrafts.weeklyTarget"
                  @input="updateWritingGoal('weeklyTarget', ($event.target as HTMLInputElement).value)"
                  @blur="commitWritingGoal('weeklyTarget', ($event.target as HTMLInputElement).value)"
                >
                <span
                  v-if="writingGoalErrors.weeklyTarget"
                  id="writing-goal-weekly-error"
                  class="sv-field-error"
                  role="alert"
                >{{ writingGoalErrors.weeklyTarget }}</span>
                <span class="sv-row-desc">首页优先展示每日目标进度；若未配置每日目标，则回退为本周目标进度。</span>
              </div>
            </div>
          </div>

          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">自动保存</span>
              <span class="sv-toggle-desc">定时自动保存编辑内容</span>
            </div>
            <label class="sv-switch">
              <input
                v-model="settings.editor.autoSave"
                type="checkbox"
                aria-label="自动保存"
              >
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <!-- 保存间隔（仅自动保存开启时显示） -->
          <div
            v-if="settings.editor.autoSave"
            class="sv-row"
          >
            <div class="sv-row-info">
              <span class="sv-row-label">保存间隔</span>
              <span class="sv-row-desc">自动保存的时间间隔</span>
            </div>
            <div class="sv-range-control">
              <input
                v-model.number="settings.editor.autoSaveInterval"
                type="range"
                aria-label="自动保存间隔"
                min="10"
                max="300"
                step="10"
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
              <input
                v-model="settings.editor.spellCheck"
                type="checkbox"
                aria-label="拼写检查"
              >
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
              <input
                v-model="settings.editor.typewriterMode"
                type="checkbox"
                aria-label="打字机模式"
              >
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <!-- 智能标点 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">智能标点</span>
              <span class="sv-toggle-desc">自动转换中英文标点符号；Source、代码块、链接和 IME 合成期不会触发。</span>
            </div>
            <label class="sv-switch">
              <input
                v-model="settings.editor.smartPunctuation"
                type="checkbox"
                aria-label="智能标点"
              >
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <div
            class="sv-smart-punctuation-panel"
            :class="{ 'is-disabled': !settings.editor.smartPunctuation }"
          >
            <div class="sv-smart-punctuation-header">
              <div>
                <span class="sv-row-label">智能标点规则矩阵</span>
                <span class="sv-row-desc">每条规则独立持久化；关闭总开关时全部规则暂停，但保留逐项配置。</span>
              </div>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                @click="resetSmartPunctuationRules"
              >
                重置本组
              </button>
            </div>
            <div class="sv-smart-rule-grid">
              <div
                v-for="rule in smartPunctuationRuleDefinitions"
                :key="rule.id"
                class="sv-smart-rule-card"
              >
                <div class="sv-smart-rule-copy">
                  <span class="sv-smart-rule-title">{{ rule.label }}</span>
                  <span class="sv-smart-rule-desc">{{ rule.description }}</span>
                  <span class="sv-smart-rule-preview">
                    <code>{{ rule.previewBefore }}</code>
                    <span>→</span>
                    <code>{{ rule.previewAfter }}</code>
                  </span>
                </div>
                <div class="sv-smart-rule-actions">
                  <button
                    type="button"
                    class="sv-action-btn sv-action-btn-sm"
                    @click="resetSmartPunctuationRule(rule)"
                  >
                    默认
                  </button>
                  <label class="sv-switch">
                    <input
                      v-model="settings.editor.smartPunctuationRules[rule.id]"
                      type="checkbox"
                      :aria-label="`智能标点规则：${rule.label}`"
                    >
                    <span class="sv-switch-track">
                      <span class="sv-switch-thumb" />
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="sv-row">
            <div class="sv-row-info">
              <span class="sv-row-label">空嵌套列表 Enter</span>
              <span class="sv-row-desc">Notion 模式逐级减少缩进；Typora 模式交给默认列表退出行为。</span>
            </div>
            <div class="sv-tab-size-group">
              <button
                type="button"
                class="sv-tab-size-btn"
                :class="{ selected: settings.editor.listEnterBehavior === 'notion' }"
                @click="settings.editor.listEnterBehavior = 'notion'"
              >
                逐级减缩
              </button>
              <button
                type="button"
                class="sv-tab-size-btn"
                :class="{ selected: settings.editor.listEnterBehavior === 'typora' }"
                @click="settings.editor.listEnterBehavior = 'typora'"
              >
                Typora 默认
              </button>
            </div>
          </div>

          <!-- 自动换行 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">自动换行</span>
              <span class="sv-toggle-desc">长文本自动换行显示</span>
            </div>
            <label class="sv-switch">
              <input
                v-model="settings.editor.wordWrap"
                type="checkbox"
                aria-label="自动换行"
              >
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
                type="button"
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
              <input
                v-model="settings.editor.showLineNumbers"
                type="checkbox"
                aria-label="显示行号"
              >
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
              <input
                v-model="settings.editor.highlightActiveLine"
                type="checkbox"
                aria-label="高亮当前行"
              >
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
              <input
                v-model="settings.editor.bracketMatching"
                type="checkbox"
                aria-label="括号匹配"
              >
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>

          <!-- 显示底部状态栏 -->
          <div class="sv-toggle-row">
            <div class="sv-toggle-info">
              <span class="sv-toggle-label">显示工作台状态栏</span>
              <span class="sv-toggle-desc">关闭后获得最干净的写作画面；字数 / 模式 / 同步等仍通过快捷键查询</span>
            </div>
            <label class="sv-switch">
              <input
                v-model="settings.editor.statusBarVisible"
                type="checkbox"
                aria-label="显示工作台状态栏"
              >
              <span class="sv-switch-track">
                <span class="sv-switch-thumb" />
              </span>
            </label>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 3: 导出                         -->
        <!-- ═════════════════════════════════════ -->
        <section
          v-show="currentTab === 'export'"
          class="sv-tab"
          data-settings-tab="export"
        >
          <h2 class="sv-tab-title">
            导出
          </h2>
          <p class="sv-tab-desc">
            导出和发布相关的默认设置
          </p>

          <!-- 默认平台 -->
          <div
            class="sv-section"
            data-settings-entry="export.platform"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'export.platform' }"
          >
            <h3 class="sv-section-title">
              默认导出平台
            </h3>
            <div class="sv-platform-group">
              <label
                v-for="p in platformOptions"
                :key="p.value"
                class="sv-platform-card"
                :class="{ selected: settings.export.defaultPlatform === p.value }"
              >
                <input
                  v-model="settings.export.defaultPlatform"
                  type="radio"
                  :value="p.value"
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
            <select
              v-model="settings.export.defaultPresetId"
              class="sv-select"
            >
              <option
                v-for="opt in presetOptions"
                :key="opt.value"
                :value="opt.value"
              >
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
              <input
                v-model="settings.export.macCodeBlock"
                type="checkbox"
              >
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
              <input
                v-model="settings.export.lineNumbers"
                type="checkbox"
              >
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
              <input
                v-model="settings.export.convertFootnotes"
                type="checkbox"
              >
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
              <input
                v-model="settings.export.textIndent"
                type="checkbox"
              >
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
                v-model.number="settings.export.imageMaxWidth"
                type="range"
                aria-label="导出图片最大宽度"
                min="320"
                max="1080"
                step="20"
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
            <select
              v-model="settings.export.codeTheme"
              class="sv-select"
            >
              <option
                v-for="opt in codeThemeOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="export.customCss"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'export.customCss' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  自定义 CSS
                </h3>
                <p class="sv-section-note">
                  追加到复制预览 HTML 尾部，不改写任何现有导出预设。
                </p>
              </div>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                @click="handleCopyExportSettingsPreviewHtml"
              >
                {{
                  exportPreviewCopyStatus === 'copied'
                    ? '已复制 HTML'
                    : exportPreviewCopyStatus === 'error'
                      ? '复制失败'
                      : '复制预览 HTML'
                }}
              </button>
            </div>
            <textarea
              v-model="settings.export.customCss"
              class="sv-textarea sv-code-textarea"
              spellcheck="false"
              maxlength="50000"
              placeholder=".inkforge-export { }"
            />
            <p class="sv-section-note">
              当前 CSS 长度 {{ settings.export.customCss.length }} / 50000；复制时会使用当前选中文章正文，没有选中文章时输出真实设置预览。
            </p>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="export.history"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'export.history' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  导出历史
                </h3>
                <p class="sv-section-note">
                  保留最近 10 次应用内成功导出或复制记录；下载记录只表示应用已触发文件生成，不代表操作系统已完成落盘。
                </p>
              </div>
              <div class="sv-btn-group">
                <span class="sv-inline-status sv-inline-status--ready">{{ settings.export.exportHistory.length }} / 10</span>
                <button
                  v-if="settings.export.exportHistory.length > 0"
                  type="button"
                  class="sv-action-btn sv-action-btn-sm"
                  data-export-history-action="clear"
                  @click="handleClearExportHistory"
                >
                  <Trash2
                    :size="14"
                    aria-hidden="true"
                  />
                  清空历史
                </button>
              </div>
            </div>

            <div
              v-if="settings.export.exportHistory.length > 0"
              class="sv-history-list"
            >
              <div
                v-for="entry in settings.export.exportHistory"
                :key="entry.id"
                class="sv-history-row"
                data-export-history-entry
              >
                <div class="sv-history-row__main">
                  <span class="sv-row-label">{{ entry.title }}</span>
                  <span class="sv-row-desc">
                    {{ getExportPlatformLabel(entry.platform) }} / {{ getExportActionLabel(entry.action) }} / {{ formatBytes(entry.bytes) }}
                  </span>
                </div>
                <time class="sv-history-row__time">{{ formatTimestamp(entry.exportedAt) }}</time>
              </div>
            </div>
            <div
              v-else
              class="sv-placeholder-card"
            >
              暂无导出历史。执行“导出设置”或“复制预览 HTML”后会写入这里。
            </div>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 4: AI 服务                      -->
        <!-- ═════════════════════════════════════ -->
        <section
          v-show="currentTab === 'ai'"
          class="sv-tab"
          data-settings-tab="ai"
        >
          <h2 class="sv-tab-title">
            AI 服务
          </h2>
          <p class="sv-tab-desc">
            配置 AI 辅助写作功能
          </p>

          <!-- Provider 选择 -->
          <div
            class="sv-section"
            data-settings-entry="ai.provider"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'ai.provider' }"
          >
            <h3 class="sv-section-title">
              服务提供商
            </h3>
            <div class="sv-provider-grid">
              <label
                v-for="prov in providerOptions"
                :key="prov.value"
                class="sv-provider-card"
                :class="{ selected: settings.ai.provider === prov.value, disabled: prov.value === 'none' }"
              >
                <input
                  v-model="settings.ai.provider"
                  type="radio"
                  :value="prov.value"
                  class="sv-hidden-radio"
                  @change="handleProviderChange"
                >
                <div class="sv-provider-icon">
                  <!-- OpenAI -->
                  <svg
                    v-if="prov.value === 'openai'"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                  </svg>
                  <!-- Anthropic -->
                  <svg
                    v-else-if="prov.value === 'anthropic'"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.604L16.742 20.48h-3.603L6.569 3.52zM0 20.48h3.604L7.173 9.42l-1.8-4.648L0 20.48z" />
                  </svg>
                  <!-- DeepSeek -->
                  <svg
                    v-else-if="prov.value === 'deepseek'"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5v-3.07c-2.02-.46-3.39-1.56-3.97-2.67-.19-.36-.03-.79.35-.94.35-.13.73.03.89.36.44.92 1.58 1.73 2.73 2.05V9.88c-2.47-.55-4-1.82-4-3.88 0-2.19 1.78-3.64 4-4v-.5c0-.28.22-.5.5-.5s.5.22.5.5v.5c1.63.26 2.93 1.12 3.54 2.26.17.33.02.73-.33.87-.33.14-.71 0-.87-.31-.44-.81-1.38-1.42-2.34-1.68v3.13c2.59.58 4 1.88 4 3.95 0 2.28-1.71 3.74-4 4.06v.72c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-.69zM11 5.17c-1.33.31-2 1.15-2 2.01 0 .94.64 1.72 2 2.19V5.17zm2 8.7v4.01c1.39-.29 2-1.17 2-2.09 0-1-.63-1.56-2-1.92z" />
                  </svg>
                  <!-- Ollama -->
                  <svg
                    v-else-if="prov.value === 'ollama'"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7zm-2 15v-1h4v1h-4zm3.5-5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM12 20a2 2 0 0 0 1.93-1.5h-3.86A2 2 0 0 0 12 20z" />
                  </svg>
                  <!-- None -->
                  <svg
                    v-else
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                    />
                    <line
                      x1="4.93"
                      y1="4.93"
                      x2="19.07"
                      y2="19.07"
                    />
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
            <div
              v-if="settings.ai.provider === 'ollama'"
              class="sv-row sv-row-vertical"
            >
              <div class="sv-row-info">
                <span class="sv-row-label">Ollama 服务地址</span>
                <span class="sv-row-desc">本地 Ollama 服务的 API 地址</span>
              </div>
              <input
                v-model="settings.ai.ollamaUrl"
                type="text"
                class="sv-input"
                placeholder="http://localhost:11434"
              >
            </div>

            <!-- API Key（非 Ollama） -->
            <div
              v-if="settings.ai.provider !== 'ollama'"
              class="sv-row sv-row-vertical"
            >
              <div class="sv-row-info">
                <span class="sv-row-label">API Key</span>
                <span class="sv-row-desc">您的密钥仅存储在本地设备，不会上传到任何服务器</span>
              </div>
              <div class="sv-input-group">
                <input
                  v-model="settings.ai.apiKey"
                  :type="showApiKey ? 'text' : 'password'"
                  class="sv-input sv-input-with-btn"
                  placeholder="sk-..."
                >
                <button
                  type="button"
                  class="sv-input-addon"
                  :title="showApiKey ? '隐藏' : '显示'"
                  @click="showApiKey = !showApiKey"
                >
                  <!-- Eye -->
                  <svg
                    v-if="!showApiKey"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                    />
                  </svg>
                  <!-- Eye Off -->
                  <svg
                    v-else
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line
                      x1="1"
                      y1="1"
                      x2="23"
                      y2="23"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Base URL（非 Ollama） -->
            <div
              v-if="settings.ai.provider !== 'ollama'"
              class="sv-row sv-row-vertical"
            >
              <div class="sv-row-info">
                <span class="sv-row-label">自定义 Base URL</span>
                <span class="sv-row-desc">
                  {{ isSiliconFlow ? '当前已配置硅基流动 SiliconFlow API' : '留空使用官方默认地址，适合使用代理或自托管服务' }}
                </span>
              </div>
              <input
                v-model="settings.ai.baseUrl"
                type="text"
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
              <select
                v-model="settings.ai.model"
                class="sv-select"
              >
                <option
                  v-for="model in modelOptions"
                  :key="model"
                  :value="model"
                >
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
                  v-model.number="settings.ai.maxTokens"
                  type="range"
                  aria-label="AI 最大 Token 数"
                  min="100"
                  max="8000"
                  step="100"
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
                  v-model.number="settings.ai.temperature"
                  type="range"
                  aria-label="AI Temperature"
                  min="0"
                  max="2"
                  step="0.1"
                  class="sv-range"
                >
                <span class="sv-range-value">{{ settings.ai.temperature.toFixed(1) }}</span>
              </div>
            </div>

            <div
              class="sv-row sv-row-vertical"
              data-settings-entry="ai.systemPrompt"
              :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'ai.systemPrompt' }"
            >
              <div class="sv-row-info">
                <span class="sv-row-label">系统提示词</span>
                <span class="sv-row-desc">追加到 AI 写作任务前的全局约束，最多 4000 字。</span>
              </div>
              <textarea
                v-model="settings.ai.systemPrompt"
                class="sv-textarea"
                maxlength="4000"
                placeholder="例如：保持事实核验、输出结构化提纲、避免虚构来源。"
              />
              <span class="sv-row-desc">{{ settings.ai.systemPrompt.length }} / 4000</span>
            </div>

            <div class="sv-divider" />

            <!-- 连接测试 -->
            <div class="sv-section">
              <button
                type="button"
                class="sv-test-btn"
                :class="{ testing: aiTestStatus === 'testing' }"
                :disabled="aiTestStatus === 'testing'"
                @click="testAIConnection"
              >
                <svg
                  v-if="aiTestStatus === 'testing'"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="sv-spin"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                {{ aiTestStatus === 'testing' ? '测试中...' : '测试连接' }}
              </button>
              <p class="sv-section-note">
                最近成功连接：{{ settings.ai.lastConnectionAt ? formatTimestamp(settings.ai.lastConnectionAt) : '尚未记录' }}
              </p>
              <div
                v-if="aiTestMessage"
                class="sv-test-result"
                :class="aiTestStatus"
              >
                {{ aiTestMessage }}
              </div>
            </div>
          </template>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="about.featureFlags"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'about.featureFlags' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  实验功能
                </h3>
                <p class="sv-section-note">
                  这些开关直接写入本地设置，用于灰度控制正在建设中的能力链路。
                </p>
              </div>
            </div>

            <div class="sv-flag-list">
              <div
                v-for="row in featureFlagRows"
                :key="row.key"
                class="sv-flag-card"
                :data-feature-flag-card="row.key"
              >
                <div class="sv-flag-card__copy">
                  <span class="sv-row-label">{{ row.label }}</span>
                  <span class="sv-row-desc">{{ row.description }}</span>
                  <span
                    class="sv-inline-status"
                    :class="row.key === 'performance-metrics' ? 'sv-inline-status--ready' : 'sv-inline-status--disabled'"
                  >
                    {{ row.key === 'performance-metrics' ? '已接入性能账本' : '预留配置' }}
                  </span>
                </div>
                <label class="sv-switch">
                  <input
                    type="checkbox"
                    :checked="row.isEnabled()"
                    :aria-label="`功能开关：${row.label}`"
                    :data-feature-flag="row.key"
                    :data-feature-flag-consumer="row.key === 'performance-metrics' ? 'performance-slo' : 'reserved'"
                    @change="row.setEnabled(!row.isEnabled())"
                  >
                  <span class="sv-switch-track">
                    <span class="sv-switch-thumb" />
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="about.proxy"
            :data-proxy-status="proxyPreview.status"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'about.proxy' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  网络代理
                </h3>
                <p class="sv-section-note">
                  仅管理 InkForge 当前设置中的代理配置与预览，不在本轮改动全局请求栈。
                </p>
              </div>
              <span
                class="sv-inline-status"
                :class="`sv-inline-status--${proxyPreview.status}`"
              >
                {{
                  proxyPreview.status === 'ready'
                    ? '已就绪'
                    : proxyPreview.status === 'invalid'
                      ? '待完善'
                      : '未启用'
                }}
              </span>
            </div>

            <div class="sv-toggle-row">
              <div class="sv-toggle-info">
                <span class="sv-toggle-label">启用代理</span>
                <span class="sv-toggle-desc">开启后，后续接入代理能力的请求链路可读取当前配置。</span>
              </div>
              <label class="sv-switch">
                <input
                  v-model="settings.proxy.enabled"
                  type="checkbox"
                  aria-label="启用代理"
                  data-proxy-field="enabled"
                >
                <span class="sv-switch-track">
                  <span class="sv-switch-thumb" />
                </span>
              </label>
            </div>

            <div class="sv-form-grid">
              <div>
                <span class="sv-row-label">协议</span>
                <select
                  v-model="settings.proxy.protocol"
                  class="sv-select"
                  aria-label="代理协议"
                  data-proxy-field="protocol"
                >
                  <option
                    v-for="option in proxyProtocolOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>

              <div>
                <span class="sv-row-label">端口</span>
                <input
                  v-model.number="settings.proxy.port"
                  type="number"
                  min="1"
                  max="65535"
                  class="sv-input"
                  placeholder="7890"
                  aria-label="代理端口"
                  data-proxy-field="port"
                >
              </div>

              <div class="sv-form-grid__full">
                <span class="sv-row-label">主机地址</span>
                <input
                  v-model.trim="settings.proxy.host"
                  type="text"
                  class="sv-input"
                  placeholder="127.0.0.1"
                  aria-label="代理主机地址"
                  data-proxy-field="host"
                >
              </div>

              <div>
                <span class="sv-row-label">用户名</span>
                <input
                  v-model.trim="settings.proxy.username"
                  type="text"
                  class="sv-input"
                  placeholder="可选"
                  aria-label="代理用户名"
                  data-proxy-field="username"
                >
              </div>

              <div>
                <span class="sv-row-label">密码</span>
                <div class="sv-input-group">
                  <input
                    v-model="settings.proxy.password"
                    :type="showProxyPassword ? 'text' : 'password'"
                    class="sv-input sv-input-with-btn"
                    placeholder="可选"
                    aria-label="代理密码"
                    data-proxy-field="password"
                  >
                  <button
                    type="button"
                    class="sv-input-addon"
                    :title="showProxyPassword ? '隐藏密码' : '显示密码'"
                    :aria-label="showProxyPassword ? '隐藏代理密码' : '显示代理密码'"
                    data-proxy-action="toggle-password"
                    @click="showProxyPassword = !showProxyPassword"
                  >
                    <svg
                      v-if="!showProxyPassword"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                      />
                    </svg>
                    <svg
                      v-else
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line
                        x1="1"
                        y1="1"
                        x2="23"
                        y2="23"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="sv-form-grid__full">
                <p class="sv-section-note">
                  {{ proxyPreview.message }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 5: 数据                         -->
        <!-- ═════════════════════════════════════ -->
        <section
          v-show="currentTab === 'data'"
          class="sv-tab"
          data-settings-tab="data"
        >
          <h2 class="sv-tab-title">
            数据管理
          </h2>
          <p class="sv-tab-desc">
            管理应用数据、备份和重置
          </p>

          <!-- 设置导入导出 -->
          <div class="sv-section">
            <h3 class="sv-section-title">
              设置数据
            </h3>
            <div class="sv-btn-group">
              <button
                type="button"
                class="sv-action-btn"
                data-settings-action="export"
                @click="handleExportSettings"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line
                    x1="12"
                    y1="15"
                    x2="12"
                    y2="3"
                  />
                </svg>
                导出设置
              </button>
              <button
                type="button"
                class="sv-action-btn"
                data-settings-action="import"
                @click="triggerSettingsImport"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line
                    x1="12"
                    y1="3"
                    x2="12"
                    y2="15"
                  />
                </svg>
                导入设置
              </button>
              <input
                ref="settingsImportInput"
                class="sv-visually-hidden-input"
                type="file"
                data-settings-import-input
                aria-label="导入 Settings JSON 文件"
                aria-hidden="true"
                tabindex="-1"
                accept="application/json,.json"
                @change="handleImportSettings"
              >
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

          <div
            class="sv-section"
            data-settings-entry="data.storage"
            :data-storage-state="storageHealth.state"
            :data-storage-usage="storageHealth.usage"
            :data-storage-quota="storageHealth.quota"
            :data-local-storage-bytes="storageHealth.localStorageBytes"
            :data-local-storage-keys="storageHealth.localStorageKeys"
            :data-indexeddb-state="runtimeDiagnostics.state"
            :data-indexeddb-records="runtimeDiagnostics.tableCounts.reduce((sum, item) => sum + item.count, 0)"
            :data-indexeddb-tables="runtimeDiagnostics.tableCounts.length"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'data.storage' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  存储占用
                </h3>
                <p class="sv-section-note">
                  直接读取 StorageManager、localStorage 与 Dexie 表的真实状态。
                </p>
              </div>
              <div class="sv-btn-group">
                <span
                  id="data-runtime-diagnostics-status"
                  class="sv-inline-status"
                  :class="runtimePanelStatus === 'ready' ? 'sv-inline-status--ready' : runtimePanelStatus === 'limited' ? 'sv-inline-status--invalid' : 'sv-inline-status--disabled'"
                >{{ runtimePanelMessage }}</span>
                <button
                  type="button"
                  class="sv-action-btn sv-action-btn-sm"
                  data-data-action="refresh-diagnostics"
                  :disabled="runtimePanelBusy"
                  @click="refreshRuntimePanels"
                >
                  {{ runtimePanelBusy ? '刷新中...' : '刷新诊断' }}
                </button>
              </div>
            </div>

            <div class="sv-meter">
              <div class="sv-meter__track">
                <span
                  class="sv-meter__fill"
                  :style="{ width: storageHealth.quota > 0 ? formatPercent(storageHealth.usage, storageHealth.quota) : '0%' }"
                />
              </div>
              <div class="sv-meter__meta">
                <span>{{ storageHealth.message }}</span>
                <span>{{ formatPercent(storageHealth.usage, storageHealth.quota) }}</span>
              </div>
            </div>

            <div class="sv-inline-grid sv-inline-grid--three">
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">LocalStorage</span>
                <span class="sv-insight-card__value">{{ formatBytes(storageHealth.localStorageBytes) }}</span>
                <span class="sv-insight-card__meta">{{ storageHealth.localStorageKeys }} 个键</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">IndexedDB 记录</span>
                <span
                  id="data-indexeddb-record-count"
                  class="sv-insight-card__value"
                >{{ runtimeDiagnostics.state === 'error' ? '读取失败' : runtimeDiagnostics.tableCounts.reduce((sum, item) => sum + item.count, 0) }}</span>
                <span
                  id="data-indexeddb-message"
                  class="sv-insight-card__meta"
                >{{ runtimeDiagnostics.message }}</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">存储状态</span>
                <span class="sv-insight-card__value">{{ storageHealth.state }}</span>
                <span class="sv-insight-card__meta">{{ storageHealth.quota > 0 ? formatBytes(storageHealth.quota) : '无配额信息' }}</span>
              </div>
            </div>

            <div
              v-if="storageHealth.breakdown.length > 0"
              class="sv-breakdown-list"
            >
              <div
                v-for="item in storageHealth.breakdown"
                :key="item.key"
                class="sv-breakdown-row"
              >
                <span>{{ item.label }}</span>
                <strong>{{ formatBytes(item.value) }}</strong>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="data.backup"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'data.backup' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  自动备份
                </h3>
                <p class="sv-section-note">
                  已真实接入版本历史自动快照链路，开关和间隔会实时作用于版本管理器。
                </p>
              </div>
              <span
                class="sv-inline-status"
                :class="settings.data.autoBackup ? 'sv-inline-status--ready' : 'sv-inline-status--disabled'"
              >
                {{ settings.data.autoBackup ? '配置已启用' : '未启用' }}
              </span>
            </div>

            <div class="sv-toggle-row">
              <div class="sv-toggle-info">
                <span class="sv-toggle-label">启用自动备份</span>
                <span class="sv-toggle-desc">将当前文稿按设定间隔自动写入版本历史，避免编辑过程丢失。</span>
              </div>
              <label class="sv-switch">
                <input
                  v-model="settings.data.autoBackup"
                  type="checkbox"
                >
                <span class="sv-switch-track">
                  <span class="sv-switch-thumb" />
                </span>
              </label>
            </div>

            <div class="sv-form-grid">
              <div>
                <span class="sv-row-label">备份间隔（分钟）</span>
                <input
                  v-model.number="settings.data.backupInterval"
                  type="number"
                  aria-label="备份间隔（分钟）"
                  min="1"
                  max="240"
                  class="sv-input"
                >
              </div>
              <div>
                <span class="sv-row-label">保留数量</span>
                <input
                  v-model.number="settings.data.maxBackups"
                  type="number"
                  aria-label="备份保留数量"
                  min="1"
                  max="50"
                  class="sv-input"
                >
              </div>
              <div class="sv-form-grid__full">
                <span class="sv-row-label">备份位置</span>
                <div class="sv-static-card">
                  Dexie `{{ runtimeDiagnostics.dbName }}` / 版本历史
                </div>
              </div>
            </div>

            <div class="sv-section-header sv-section-header--compact">
              <div>
                <span class="sv-row-label">立即备份当前文稿</span>
                <p class="sv-section-note">
                  {{ canCreateManualBackup ? '通过当前文稿的真实版本历史创建快照。' : '请先在工作台打开文稿；自动备份也只在文稿打开时运行。' }}
                </p>
              </div>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                data-data-action="create-backup"
                :disabled="manualBackupStatus === 'working' || !canCreateManualBackup"
                @click="handleCreateManualBackup"
              >
                {{ manualBackupStatus === 'working' ? '备份中...' : '立即创建备份' }}
              </button>
            </div>
            <div
              v-if="manualBackupMessage"
              id="data-manual-backup-result"
              class="sv-test-result"
              :class="manualBackupStatus"
            >
              {{ manualBackupMessage }}
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 数据统计 -->
          <div class="sv-section">
            <h3 class="sv-section-title">
              数据统计
            </h3>
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

          <div
            class="sv-section"
            data-settings-entry="data.cache"
            :data-cache-state="cacheHealth.state"
            :data-cache-buckets="cacheHealth.buckets.length"
            :data-service-worker-summary="cacheHealth.serviceWorkerSummary"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  缓存管理
                </h3>
                <p class="sv-section-note">
                  覆盖 Cache Storage、Service Worker 注册态与编辑器预览对象 URL 缓存。
                </p>
              </div>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                @click="handleClearRuntimeCaches"
              >
                清理缓存
              </button>
            </div>

            <div class="sv-inline-grid sv-inline-grid--three">
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">Cache Storage</span>
                <span class="sv-insight-card__value">{{ cacheHealth.buckets.length }}</span>
                <span class="sv-insight-card__meta">{{ cacheHealth.message }}</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">Service Worker</span>
                <span class="sv-insight-card__value">{{ cacheHealth.serviceWorkerSummary }}</span>
                <span class="sv-insight-card__meta">真实注册态</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">预览缓存句柄</span>
                <span class="sv-insight-card__value">{{ cachedUrlCount }}</span>
                <span class="sv-insight-card__meta">素材 Object URL</span>
              </div>
            </div>

            <div
              v-if="cacheHealth.buckets.length > 0"
              class="sv-cache-list"
            >
              <div
                v-for="bucket in cacheHealth.buckets"
                :key="bucket.name"
                class="sv-cache-row"
              >
                <span>{{ bucket.name }}</span>
                <strong>{{ bucket.entryCount }} 项</strong>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <!-- 危险操作 -->
          <div class="sv-section">
            <h3 class="sv-section-title sv-danger-title">
              危险区域
            </h3>
            <p class="sv-danger-desc">
              以下操作会批量修改或清除本地数据。文章会移入回收站，其余清除操作不可恢复；确认前必须输入 <code>DELETE</code>。
            </p>
            <div
              v-if="dangerActionFeedback"
              class="sv-feedback"
              :class="dangerActionFeedback.type"
              :role="dangerActionFeedback.type === 'error' ? 'alert' : 'status'"
              data-settings-danger-feedback
            >
              {{ dangerActionFeedback.text }}
            </div>
            <div class="sv-danger-actions">
              <div class="sv-danger-row">
                <div class="sv-danger-row-info">
                  <span class="sv-danger-row-label">将所有文章移入回收站</span>
                  <span class="sv-danger-row-desc">保留正文和版本历史，可在回收站恢复</span>
                </div>
                <button
                  type="button"
                  class="sv-danger-btn"
                  @click="handleClearArticles"
                >
                  清除
                </button>
              </div>
              <div class="sv-danger-row">
                <div class="sv-danger-row-info">
                  <span class="sv-danger-row-label">清除所有素材</span>
                  <span class="sv-danger-row-desc">永久删除所有上传的图片和文件</span>
                </div>
                <button
                  type="button"
                  class="sv-danger-btn"
                  @click="handleClearAssets"
                >
                  清除
                </button>
              </div>
              <div class="sv-danger-row">
                <div class="sv-danger-row-info">
                  <span class="sv-danger-row-label">重置所有设置</span>
                  <span class="sv-danger-row-desc">将所有设置恢复为默认值</span>
                </div>
                <button
                  type="button"
                  class="sv-danger-btn"
                  @click="handleResetSettings"
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 6: 同步                         -->
        <!-- ═════════════════════════════════════ -->
        <section
          v-show="currentTab === 'sync'"
          class="sv-tab"
          data-settings-tab="sync"
          data-settings-entry="sync.status"
          :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'sync.status' }"
        >
          <h2 class="sv-tab-title">
            同步
          </h2>
          <p class="sv-tab-desc">
            查看真实 SyncProvider 状态、待同步队列与冲突入口
          </p>

          <div class="sv-section">
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  Provider 状态
                </h3>
                <p class="sv-section-note">
                  同步 baseline 只展示真实引擎状态；未配置 WebDAV、Git 或自有服务时不会伪造远端成功。
                </p>
              </div>
              <span
                class="sv-inline-status"
                :class="syncStore.providerId ? 'sv-inline-status--ready' : 'sv-inline-status--disabled'"
              >
                {{ syncStore.providerId ?? '未配置' }}
              </span>
            </div>

            <div class="sv-inline-grid sv-inline-grid--four">
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">同步状态</span>
                <span class="sv-insight-card__value">{{ syncStore.statusText }}</span>
                <span class="sv-insight-card__meta">{{ syncStore.status }}</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">待同步队列</span>
                <span class="sv-insight-card__value">{{ syncStore.pendingCount }}</span>
                <span class="sv-insight-card__meta">ChangeTracker 与 IndexedDB outbox</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">冲突记录</span>
                <span class="sv-insight-card__value">{{ syncStore.conflictCount }}</span>
                <span class="sv-insight-card__meta">需要人工或三方合并决策</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">最后同步</span>
                <span class="sv-insight-card__value">{{ formatSyncDate(syncStore.lastSyncAt) }}</span>
                <span class="sv-insight-card__meta">来自 SyncEngine 状态</span>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="sync.manual"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'sync.manual' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  手动同步
                </h3>
                <p class="sv-section-note">
                  直接调用 SyncEngine.sync()。若没有真实 provider，会返回失败并保留待同步队列。
                </p>
              </div>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                :disabled="syncActionBusy"
                @click="handleManualSync"
              >
                {{ syncActionBusy ? '同步中...' : '立即同步' }}
              </button>
            </div>

            <div
              v-if="!syncStore.providerId"
              class="sv-placeholder-card"
            >
              当前未绑定同步提供者。WebDAV 需要真实 HTTPS endpoint 与运行期凭据；Git 需要 Tauri Git 命令和 HTTPS/SSH remote；SelfHosted 需要可访问的 InkForge Server API。系统不会把本地队列标记为远端成功。
            </div>
            <div
              v-else
              class="sv-placeholder-card"
            >
              当前 provider 为 {{ syncStore.providerId }}。同步结果以远端 ack、pull 响应和冲突列表为准。
            </div>

            <div
              v-if="syncActionMessage"
              class="sv-feedback"
              :class="syncActionMessage.type"
            >
              {{ syncActionMessage.text }}
            </div>
            <div
              v-if="syncStore.lastError && syncStore.lastError !== syncActionMessage?.text"
              class="sv-feedback error"
            >
              {{ syncStore.lastError }}
            </div>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 7: 审计日志                     -->
        <!-- ═════════════════════════════════════ -->
        <section
          v-show="currentTab === 'audit'"
          class="sv-tab"
          data-settings-tab="audit"
          data-settings-entry="audit.ledger"
          :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'audit.ledger' }"
        >
          <h2 class="sv-tab-title">
            审计日志
          </h2>
          <p class="sv-tab-desc">
            查看权限、文档、同步与高危操作的真实本地审计链路
          </p>

          <div class="sv-section">
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  审计总览
                </h3>
                <p class="sv-section-note">
                  记录来自 IndexedDB `auditLogs` 表，包含 prevHash/entryHash 链式完整性证据。
                </p>
              </div>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                :disabled="auditStore.isLoading"
                @click="refreshAuditEntries"
              >
                {{ auditStore.isLoading ? '刷新中...' : '刷新审计' }}
              </button>
            </div>

            <div class="sv-inline-grid sv-inline-grid--four">
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">记录总数</span>
                <span class="sv-insight-card__value">{{ auditStore.totalCount }}</span>
                <span class="sv-insight-card__meta">当前过滤条件内</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">当前页</span>
                <span class="sv-insight-card__value">{{ auditStore.page }} / {{ auditStore.pageCount }}</span>
                <span class="sv-insight-card__meta">每页 {{ auditStore.queryParams.limit ?? 50 }} 条</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">完整性</span>
                <span class="sv-insight-card__value">{{ auditStore.integrityStatus }}</span>
                <span class="sv-insight-card__meta">本地链式哈希，不等同远端 WORM</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">Profile</span>
                <span class="sv-insight-card__value">{{ auditStore.queryParams.profileId }}</span>
                <span class="sv-insight-card__meta">当前本地账户审计范围</span>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="audit.integrity"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'audit.integrity' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  过滤与导出
                </h3>
                <p class="sv-section-note">
                  导出内容来自当前过滤结果，payload 已经过敏感字段脱敏。
                </p>
              </div>
              <div class="sv-btn-group">
                <button
                  type="button"
                  class="sv-action-btn sv-action-btn-sm"
                  @click="handleAuditIntegrityCheck"
                >
                  校验完整性
                </button>
                <button
                  type="button"
                  class="sv-action-btn sv-action-btn-sm"
                  @click="handleAuditExport('csv')"
                >
                  导出 CSV
                </button>
                <button
                  type="button"
                  class="sv-action-btn sv-action-btn-sm"
                  @click="handleAuditExport('json')"
                >
                  导出 JSON
                </button>
              </div>
            </div>

            <div class="sv-form-grid">
              <div>
                <label class="sv-row-label">关键词</label>
                <input
                  v-model.trim="auditKeyword"
                  class="sv-input"
                  type="search"
                  placeholder="action / actor / docId / payload"
                  @keyup.enter="refreshAuditEntries"
                >
              </div>
              <div>
                <label class="sv-row-label">操作类型</label>
                <select
                  v-model="auditActionFilter"
                  class="sv-select"
                  @change="refreshAuditEntries"
                >
                  <option value="all">
                    全部操作
                  </option>
                  <option
                    v-for="action in auditActionOptions"
                    :key="action"
                    :value="action"
                  >
                    {{ action }}
                  </option>
                </select>
              </div>
              <div>
                <label class="sv-row-label">严重级别</label>
                <select
                  v-model="auditSeverityFilter"
                  class="sv-select"
                  @change="refreshAuditEntries"
                >
                  <option value="all">
                    全部级别
                  </option>
                  <option
                    v-for="severity in auditSeverityOptions"
                    :key="severity"
                    :value="severity"
                  >
                    {{ getAuditSeverityLabel(severity) }}
                  </option>
                </select>
              </div>
              <div>
                <label class="sv-row-label">查询</label>
                <button
                  type="button"
                  class="sv-action-btn"
                  :disabled="auditStore.isLoading"
                  @click="refreshAuditEntries"
                >
                  应用过滤
                </button>
              </div>
            </div>

            <div
              v-if="auditStore.integrityMessage"
              class="sv-feedback"
              :class="auditStore.integrityStatus === 'broken' ? 'error' : 'success'"
            >
              {{ auditStore.integrityMessage }}
            </div>
            <div
              v-if="auditExportMessage"
              class="sv-feedback"
              :class="auditExportMessage.type"
            >
              {{ auditExportMessage.text }}
            </div>
            <div
              v-if="auditStore.error"
              class="sv-feedback error"
            >
              {{ auditStore.error }}
            </div>
          </div>

          <div class="sv-divider" />

          <div class="sv-section">
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  最近记录
                </h3>
                <p class="sv-section-note">
                  只显示审计摘要和已脱敏 payload，不展示正文、密码、token 或密钥。
                </p>
              </div>
              <div class="sv-btn-group">
                <button
                  type="button"
                  class="sv-action-btn sv-action-btn-sm"
                  :disabled="auditStore.page <= 1"
                  @click="auditStore.previousPage()"
                >
                  上一页
                </button>
                <button
                  type="button"
                  class="sv-action-btn sv-action-btn-sm"
                  :disabled="auditStore.page >= auditStore.pageCount"
                  @click="auditStore.nextPage()"
                >
                  下一页
                </button>
              </div>
            </div>

            <div
              v-if="auditStore.entries.length > 0"
              class="sv-history-list"
            >
              <details
                v-for="entry in auditStore.entries"
                :key="entry.id"
                class="sv-history-row"
              >
                <summary class="sv-history-row__main">
                  <strong>{{ entry.action }}</strong>
                  <span>{{ entry.outcome }} / {{ getAuditSeverityLabel(entry.severity) }}</span>
                  <time class="sv-history-row__time">{{ formatAuditTime(entry.timestamp) }}</time>
                </summary>
                <div class="sv-static-card sv-static-card--mono">
                  <div>actor={{ entry.actorId }} profile={{ entry.profileId }}</div>
                  <div>resource={{ entry.resourceKind ?? 'none' }}:{{ entry.resourceId ?? entry.docId ?? 'none' }}</div>
                  <div>hash={{ entry.entryHash }}</div>
                  <pre>{{ formatAuditPayload(entry.payload) }}</pre>
                </div>
              </details>
            </div>
            <div
              v-else
              class="sv-placeholder-card"
            >
              当前过滤条件下暂无审计记录。执行文档创建、删除、同步或权限检查后，这里会显示真实 IndexedDB 审计条目。
            </div>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 8: 工作区 Profile               -->
        <!-- ═════════════════════════════════════ -->
        <section
          v-show="currentTab === 'profiles'"
          class="sv-tab"
          data-settings-tab="profiles"
          data-settings-entry="profiles.registry"
          :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'profiles.registry' }"
        >
          <h2 class="sv-tab-title">
            工作区 Profile
          </h2>
          <p class="sv-tab-desc">
            管理本地 Profile 注册表、独立 IndexedDB namespace、软删除恢复和真实原生边界
          </p>

          <div class="sv-section">
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  隔离总览
                </h3>
                <p class="sv-section-note">
                  Profile registry 来自 IndexedDB `profiles` 表；每个工作区会初始化独立 `inkforge-{profileId}` 数据库。本基线不迁移现有文章，也不伪造 Tauri 文件根或多窗口成功。
                </p>
              </div>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                :disabled="profileStore.isLoading"
                @click="refreshProfiles"
              >
                {{ profileStore.isLoading ? '刷新中...' : '刷新工作区' }}
              </button>
            </div>

            <div class="sv-inline-grid sv-inline-grid--four">
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">活跃工作区</span>
                <span class="sv-insight-card__value">{{ profileStore.profileCount }}</span>
                <span class="sv-insight-card__meta">active registry rows</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">恢复期</span>
                <span class="sv-insight-card__value">{{ profileStore.deletedProfileCount }}</span>
                <span class="sv-insight-card__meta">7 天软删除缓冲</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">当前 ID</span>
                <span
                  class="sv-insight-card__value sv-insight-card__value--small"
                  data-profile-current-id
                >{{ profileStore.activeProfileId || '未加载' }}</span>
                <span class="sv-insight-card__meta">active Profile pointer</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">数据库</span>
                <span
                  class="sv-insight-card__value sv-insight-card__value--small"
                  data-profile-current-db
                >{{ profileStore.activeProfile?.dbNamespace || '待初始化' }}</span>
                <span class="sv-insight-card__meta">独立 IndexedDB namespace</span>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="profiles.database"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'profiles.database' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  创建工作区
                </h3>
                <p class="sv-section-note">
                  创建会写入真实 Profile registry、初始化独立 Profile 数据库并记录审计日志。Tauri 可通过原生选择器绑定文件根；浏览器 runtime 不接受手动路径。
                </p>
              </div>
            </div>

            <div class="sv-form-grid">
              <div>
                <label
                  class="sv-row-label"
                  for="profile-name-input"
                >工作区名称</label>
                <input
                  id="profile-name-input"
                  v-model.trim="profileNameDraft"
                  class="sv-input"
                  maxlength="50"
                  placeholder="例如：工作、个人创作、学习笔记"
                >
              </div>
              <div>
                <label
                  class="sv-row-label"
                  for="profile-avatar-select"
                >头像图标</label>
                <select
                  id="profile-avatar-select"
                  v-model="profileAvatarDraft"
                  class="sv-select"
                >
                  <option
                    v-for="iconName in profileAvatarOptions"
                    :key="iconName"
                    :value="iconName"
                  >
                    {{ iconName }}
                  </option>
                </select>
              </div>
              <div class="sv-form-grid__full">
                <label class="sv-row-label">强调色</label>
                <div class="sv-profile-accent-list">
                  <button
                    v-for="color in profileAccentOptions"
                    :key="color"
                    type="button"
                    class="sv-profile-accent"
                    :class="{ selected: profileAccentDraft === color }"
                    :style="{ backgroundColor: color }"
                    :aria-label="`选择强调色 ${color}`"
                    @click="profileAccentDraft = color"
                  />
                </div>
              </div>
              <div class="sv-form-grid__full">
                <label class="sv-row-label">文件根目录（可选）</label>
                <div class="sv-btn-group">
                  <button
                    type="button"
                    class="sv-action-btn sv-action-btn-sm"
                    data-profile-file-root-picker
                    :disabled="!profileNativeDirectoryAvailable || profileFileRootPickerBusy || profileStore.isLoading"
                    @click="handlePickProfileDirectory"
                  >
                    {{ profileFileRootPickerBusy ? '选择中...' : profileFileRootDraft ? '重新选择目录' : '选择原生目录' }}
                  </button>
                  <button
                    v-if="profileFileRootDraft"
                    type="button"
                    class="sv-action-btn sv-action-btn-sm"
                    data-profile-file-root-clear
                    @click="profileFileRootDraft = null; profileActionMessage = null"
                  >
                    清除选择
                  </button>
                </div>
                <div
                  class="sv-placeholder-card"
                  data-profile-file-root-status
                >
                  <template v-if="profileFileRootDraft">
                    已选择：{{ profileFileRootDraft }}
                  </template>
                  <template v-else-if="profileNativeDirectoryAvailable">
                    尚未分配文件根；创建后状态为“未分配”。路径只接受 Tauri 原生目录选择器返回值。
                  </template>
                  <template v-else>
                    当前为 Web 运行时，原生目录选择不可用；不会接受手动路径或写入伪造目录。
                  </template>
                </div>
              </div>
              <div class="sv-form-grid__full">
                <button
                  type="button"
                  class="sv-action-btn"
                  data-profile-create
                  :disabled="profileNameDraft.trim().length === 0 || profileStore.isLoading || profileFileRootPickerBusy"
                  @click="handleCreateProfile"
                >
                  {{ profileStore.isLoading ? '创建中...' : '创建真实工作区' }}
                </button>
              </div>
            </div>

            <div
              v-if="profileActionMessage"
              class="sv-feedback"
              data-profile-feedback="action"
              :class="profileActionMessage.type"
            >
              {{ profileActionMessage.text }}
            </div>
            <div
              v-if="profileStore.error"
              class="sv-feedback error"
              data-profile-feedback="store-error"
            >
              {{ profileStore.error }}
            </div>
            <div
              v-if="profileStore.lastActionMessage"
              class="sv-feedback success"
            >
              {{ profileStore.lastActionMessage }}
            </div>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="profiles.nativeBoundary"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'profiles.nativeBoundary' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  工作区列表
                </h3>
                <p class="sv-section-note">
                  切换只更新当前 Profile 指针、lastActiveAt 和审计证据，不会自动关闭文档；彻底删除数据库和文件根不在本基线内执行。
                </p>
              </div>
            </div>

            <div
              v-if="profileStore.sortedProfiles.length > 0"
              class="sv-history-list"
            >
              <details
                v-for="profile in profileStore.sortedProfiles"
                :key="profile.id"
                class="sv-history-row"
                :data-profile-id="profile.id"
                open
              >
                <summary class="sv-history-row__main">
                  <span
                    class="sv-profile-avatar"
                    :style="{ backgroundColor: profile.colorAccent }"
                  >{{ profile.name.slice(0, 1).toUpperCase() }}</span>
                  <strong>{{ profile.name }}</strong>
                  <span>{{ profile.avatarIcon }} / {{ getProfileFileRootStatusLabel(profile) }}</span>
                  <time class="sv-history-row__time">{{ formatProfileTime(profile.lastActiveAt) }}</time>
                </summary>
                <div class="sv-static-card sv-profile-detail-card">
                  <div class="sv-inline-grid sv-inline-grid--three">
                    <div class="sv-insight-card">
                      <span class="sv-insight-card__label">Profile ID</span>
                      <span class="sv-insight-card__value sv-insight-card__value--small">{{ profile.id }}</span>
                      <span class="sv-insight-card__meta">全局唯一标识</span>
                    </div>
                    <div class="sv-insight-card">
                      <span class="sv-insight-card__label">DB Namespace</span>
                      <span class="sv-insight-card__value sv-insight-card__value--small">{{ profile.dbNamespace }}</span>
                      <span class="sv-insight-card__meta">独立数据库名称</span>
                    </div>
                    <div class="sv-insight-card">
                      <span class="sv-insight-card__label">创建时间</span>
                      <span class="sv-insight-card__value sv-insight-card__value--small">{{ formatProfileTime(profile.createdAt) }}</span>
                      <span class="sv-insight-card__meta">registry createdAt</span>
                    </div>
                  </div>
                  <div class="sv-placeholder-card">
                    文件根：{{ getProfileFileRootLabel(profile) }}
                  </div>
                  <div class="sv-btn-group">
                    <button
                      type="button"
                      class="sv-action-btn sv-action-btn-sm"
                      data-profile-action="switch"
                      :disabled="profile.id === profileStore.activeProfileId || profileStore.isSwitching"
                      @click="handleSwitchProfile(profile)"
                    >
                      {{ profile.id === profileStore.activeProfileId ? '当前工作区' : '切换到此工作区' }}
                    </button>
                    <button
                      type="button"
                      class="sv-danger-btn"
                      data-profile-action="soft-delete"
                      :disabled="!profileStore.canDeleteActiveProfile"
                      @click="handleSoftDeleteProfile(profile)"
                    >
                      进入恢复期
                    </button>
                  </div>
                </div>
              </details>
            </div>
            <div
              v-else
              class="sv-placeholder-card"
            >
              Profile registry 尚未初始化。刷新后会从当前本地账户创建默认工作区，不会删除账户或文章数据。
            </div>
          </div>

          <div
            v-if="profileStore.deletedProfiles.length > 0"
            class="sv-section"
          >
            <h3 class="sv-section-title">
              已删除的工作区
            </h3>
            <div class="sv-history-list">
              <div
                v-for="profile in profileStore.deletedProfiles"
                :key="profile.id"
                class="sv-history-row"
                :data-profile-deleted-id="profile.id"
              >
                <div class="sv-history-row__main">
                  <span
                    class="sv-profile-avatar"
                    :style="{ backgroundColor: profile.colorAccent }"
                  >{{ profile.name.slice(0, 1).toUpperCase() }}</span>
                  <strong>{{ profile.name }}</strong>
                  <span>剩余 {{ profileStore.daysUntilPermanentDelete(profile) }} 天可恢复</span>
                  <button
                    type="button"
                    class="sv-action-btn sv-action-btn-sm"
                    data-profile-action="restore"
                    @click="handleRestoreProfile(profile)"
                  >
                    恢复
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 8: 扩展插件                     -->
        <!-- ═════════════════════════════════════ -->
        <section
          v-show="currentTab === 'extensions'"
          class="sv-tab"
          data-settings-tab="extensions"
          data-settings-entry="extensions.registry"
          :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'extensions.registry' }"
        >
          <h2 class="sv-tab-title">
            扩展插件
          </h2>
          <p class="sv-tab-desc">
            管理本地 manifest 注册表、扩展权限和运行时阻断证据
          </p>

          <div class="sv-section">
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  扩展总览
                </h3>
                <p class="sv-section-note">
                  记录来自 IndexedDB `extensions` 与 `extensionStorage` 表；当前不接入在线市场，也不会伪装第三方代码已运行。
                </p>
              </div>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                :disabled="extensionStore.isLoading"
                @click="refreshExtensions"
              >
                {{ extensionStore.isLoading ? '刷新中...' : '刷新扩展' }}
              </button>
            </div>

            <div class="sv-inline-grid sv-inline-grid--four">
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">已安装</span>
                <span class="sv-insight-card__value">{{ extensionStore.installedCount }}</span>
                <span class="sv-insight-card__meta">本地 manifest registry</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">已启用</span>
                <span class="sv-insight-card__value">{{ extensionStore.enabledCount }}</span>
                <span class="sv-insight-card__meta">需要真实 Worker runtime</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">已阻断</span>
                <span class="sv-insight-card__value">{{ extensionStore.blockedCount }}</span>
                <span class="sv-insight-card__meta">fail-closed sandbox policy</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">错误</span>
                <span class="sv-insight-card__value">{{ extensionStore.errorCount }}</span>
                <span class="sv-insight-card__meta">真实 lifecycle 状态</span>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="extensions.permissions"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'extensions.permissions' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  安装本地 manifest
                </h3>
                <p class="sv-section-note">
                  选择或粘贴真实 `inkforge-plugin.json`。安装只写入本地 registry 和审计日志，不复制插件包、不执行 entry 文件。
                </p>
              </div>
            </div>

            <div class="sv-form-grid">
              <div>
                <label class="sv-row-label">Manifest 文件</label>
                <input
                  class="sv-input"
                  type="file"
                  aria-label="选择扩展 manifest 文件"
                  accept="application/json,.json"
                  @change="handleExtensionManifestFile"
                >
              </div>
              <div>
                <label class="sv-row-label">安装操作</label>
                <button
                  type="button"
                  class="sv-action-btn"
                  data-extension-action="install"
                  :disabled="extensionManifestText.trim().length === 0"
                  @click="handleInstallExtensionManifest"
                >
                  安装本地 manifest
                </button>
              </div>
              <div class="sv-form-grid__full">
                <label class="sv-row-label">Manifest JSON</label>
                <textarea
                  v-model="extensionManifestText"
                  class="sv-textarea sv-code-textarea"
                  aria-label="扩展 manifest JSON"
                  rows="8"
                  placeholder="{\n  &quot;id&quot;: &quot;local.word-counter&quot;,\n  &quot;name&quot;: &quot;Word Counter&quot;,\n  &quot;version&quot;: &quot;1.0.0&quot;,\n  &quot;author&quot;: &quot;local&quot;,\n  &quot;entry&quot;: &quot;./dist/index.js&quot;,\n  &quot;inkforgeVersion&quot;: &quot;&gt;=0.1.0&quot;,\n  &quot;permissions&quot;: [&quot;storage:read&quot;],\n  &quot;sandboxLevel&quot;: &quot;strict&quot;\n}"
                />
              </div>
            </div>

            <div
              v-if="extensionActionMessage"
              class="sv-feedback"
              :class="extensionActionMessage.type"
            >
              {{ extensionActionMessage.text }}
            </div>
            <div
              v-if="extensionStore.error"
              class="sv-feedback error"
            >
              {{ extensionStore.error }}
            </div>
          </div>

          <div class="sv-divider" />

          <div class="sv-section">
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  已安装扩展
                </h3>
                <p class="sv-section-note">
                  启用会先检查真实 Worker sandbox。当前运行时未接入时会写入阻断状态与审计记录。
                </p>
              </div>
            </div>

            <div
              v-if="extensionStore.records.length > 0"
              class="sv-history-list"
            >
              <details
                v-for="record in extensionStore.records"
                :key="record.id"
                class="sv-history-row"
                :data-extension-id="record.extensionId"
                open
              >
                <summary class="sv-history-row__main">
                  <strong>{{ record.manifest.name }}</strong>
                  <span>{{ record.extensionId }} / {{ record.manifest.version }} / {{ getExtensionStatusLabel(record.status) }}</span>
                  <time class="sv-history-row__time">{{ formatAuditTime(record.updatedAt) }}</time>
                </summary>
                <div class="sv-static-card">
                  <div class="sv-inline-grid sv-inline-grid--three">
                    <div class="sv-insight-card">
                      <span class="sv-insight-card__label">Sandbox</span>
                      <span class="sv-insight-card__value">{{ record.sandboxLevel }}</span>
                      <span class="sv-insight-card__meta">声明级别</span>
                    </div>
                    <div class="sv-insight-card">
                      <span class="sv-insight-card__label">Granted</span>
                      <span class="sv-insight-card__value">{{ record.grantedPermissions.length }}</span>
                      <span class="sv-insight-card__meta">已授权权限</span>
                    </div>
                    <div class="sv-insight-card">
                      <span class="sv-insight-card__label">Errors</span>
                      <span class="sv-insight-card__value">{{ record.errorCount }}</span>
                      <span class="sv-insight-card__meta">连续错误计数</span>
                    </div>
                  </div>

                  <div class="sv-chip-group">
                    <span
                      v-for="permission in record.grantedPermissions"
                      :key="permission"
                      class="sv-chip-btn selected"
                    >
                      <span class="sv-chip-btn__label">{{ formatExtensionPermission(permission) }}</span>
                    </span>
                    <span
                      v-if="record.commandPermissions.length === 0"
                      class="sv-chip-btn"
                    >
                      <span class="sv-chip-btn__label">无命令权限</span>
                    </span>
                    <span
                      v-for="permission in record.commandPermissions"
                      :key="permission"
                      class="sv-chip-btn"
                    >
                      <span class="sv-chip-btn__label">command: {{ permission }}</span>
                    </span>
                  </div>

                  <div
                    v-if="record.lastErrorMessage"
                    class="sv-feedback error"
                  >
                    {{ record.lastErrorMessage }}
                  </div>
                  <div
                    v-if="record.runtimeBlockedReason"
                    class="sv-placeholder-card"
                  >
                    运行时阻断原因：{{ record.runtimeBlockedReason }}。这是真实 fail-closed 状态，不是模拟启用。
                  </div>

                  <div class="sv-btn-group">
                    <button
                      type="button"
                      class="sv-action-btn sv-action-btn-sm"
                      data-extension-action="toggle"
                      @click="handleToggleExtension(record)"
                    >
                      {{ record.enabled ? '停用' : '启用' }}
                    </button>
                    <button
                      type="button"
                      class="sv-danger-btn"
                      data-extension-action="uninstall"
                      @click="handleUninstallExtension(record)"
                    >
                      卸载
                    </button>
                  </div>
                </div>
              </details>
            </div>
            <div
              v-else
              class="sv-placeholder-card"
            >
              当前没有已安装扩展。请导入真实本地 manifest；在线市场、签名校验、插件包复制和 Worker 执行将在后续完整 runtime 切片接入。
            </div>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 9: 快捷键                       -->
        <!-- ═════════════════════════════════════ -->
        <section
          v-show="currentTab === 'shortcuts'"
          class="sv-tab"
          data-settings-tab="shortcuts"
          data-settings-entry="shortcuts.registry"
          :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'shortcuts.registry' }"
        >
          <h2 class="sv-tab-title">
            快捷键
          </h2>
          <p class="sv-tab-desc">
            自定义键盘快捷键映射
          </p>

          <div class="sv-shortcut-toolbar">
            <div class="sv-shortcut-search">
              <input
                v-model.trim="shortcutSearch"
                type="text"
                class="sv-input"
                aria-label="搜索快捷键"
                placeholder="搜索操作、描述或快捷键"
              >
            </div>

            <div class="sv-shortcut-summary">
              <div class="sv-shortcut-summary-item">
                <span class="sv-row-label">{{ SHORTCUT_DEFINITIONS.length }}</span>
                <span class="sv-row-desc">默认快捷键</span>
              </div>
              <div class="sv-shortcut-summary-item">
                <span class="sv-row-label">{{ filteredShortcutCount }}</span>
                <span class="sv-row-desc">当前结果</span>
              </div>
              <div class="sv-shortcut-summary-item">
                <span class="sv-row-label">{{ duplicateShortcutEntries.length }}</span>
                <span class="sv-row-desc">冲突项</span>
              </div>
            </div>
          </div>

          <div
            v-if="duplicateShortcutEntries.length > 0"
            class="sv-shortcut-conflict"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line
                x1="12"
                y1="9"
                x2="12"
                y2="13"
              />
              <line
                x1="12"
                y1="17"
                x2="12.01"
                y2="17"
              />
            </svg>
            <span>
              检测到重复绑定：
              {{
                duplicateShortcutEntries
                  .map(entry => `${entry.binding}（${entry.labels.join('、')}）`)
                  .join('；')
              }}
            </span>
          </div>

          <div
            v-if="filteredShortcutGroups.length > 0"
            class="sv-shortcut-groups"
          >
            <section
              v-for="group in filteredShortcutGroups"
              :key="group.id"
              class="sv-shortcut-card"
            >
              <header class="sv-shortcut-card__header">
                <div>
                  <h3 class="sv-shortcut-card__title">
                    {{ group.label }}
                  </h3>
                  <p class="sv-shortcut-card__desc">
                    {{ group.description }}
                  </p>
                </div>
                <span class="sv-inline-status sv-inline-status--disabled">{{ group.items.length }} 项</span>
              </header>

              <div class="sv-shortcut-list">
                <div
                  v-for="definition in group.items"
                  :key="definition.id"
                  class="sv-shortcut-item"
                >
                  <div class="sv-shortcut-item__copy">
                    <span class="sv-shortcut-item__title">{{ definition.label }}</span>
                    <span class="sv-shortcut-item__desc">{{ definition.description }}</span>
                  </div>

                  <div class="sv-shortcut-item__actions">
                    <ShortcutInput
                      :model-value="getShortcutBinding(definition.id)"
                      :shortcut-id="definition.id"
                      :all-shortcuts="settings.shortcuts"
                      :shortcut-labels="shortcutLabels"
                      @update:model-value="updateShortcut(definition.id, $event)"
                    />

                    <button
                      type="button"
                      class="sv-action-btn sv-action-btn-sm"
                      @click="resetShortcut(definition.id)"
                    >
                      重置
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div
            v-else
            class="sv-shortcut-empty"
          >
            没有找到匹配的快捷键，请调整搜索条件。
          </div>

          <div class="sv-shortcuts-footer">
            <button
              type="button"
              class="sv-action-btn sv-action-btn-sm"
              @click="resetAllShortcuts"
            >
              恢复默认快捷键
            </button>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 11: 高级                        -->
        <!-- ═════════════════════════════════════ -->
        <section
          v-show="currentTab === 'advanced'"
          class="sv-tab"
          data-settings-tab="advanced"
          data-settings-entry="advanced.customCss"
        >
          <h2 class="sv-tab-title">
            高级
          </h2>
          <p class="sv-tab-desc">
            面向高级用户的真实运行时控制；CustomCSS 只作用于 .editor-content 与真实 ProseMirror 编辑区，不会定制应用外壳。
          </p>

          <div
            class="sv-section sv-custom-css-section"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'advanced.customCss' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  CustomCSS
                </h3>
                <p class="sv-section-note">
                  自动限定到 .editor-content 与真实 ProseMirror 编辑区；禁止 @import、远程 url、主动内容协议和 !important。关闭后不注入 style，但保留草稿。
                </p>
              </div>
              <span
                class="sv-inline-status"
                :class="settings.advanced.customCss.enabled && customCssStylePresent ? 'sv-inline-status--ready' : settings.advanced.customCss.suspendedReason ? 'sv-inline-status--invalid' : 'sv-inline-status--disabled'"
              >
                {{ customCssStatusLabel }}
              </span>
            </div>

            <div class="sv-custom-css-toolbar">
              <label class="sv-toggle-row sv-custom-css-toggle">
                <input
                  v-model="settings.advanced.customCss.enabled"
                  type="checkbox"
                  @change="handleCustomCssEnabledChange"
                >
                <span>
                  <strong>启用 CustomCSS</strong>
                  <small>首次启用会二次确认；SafeMode 或错误过载时会自动停用。</small>
                </span>
              </label>

              <select
                v-model="selectedCustomCssSnippet"
                class="sv-select sv-custom-css-snippet"
                @change="handleInsertCustomCssSnippet"
              >
                <option value="">
                  插入片段...
                </option>
                <option
                  v-for="snippet in customCssSnippetOptions"
                  :key="snippet.id"
                  :value="snippet.id"
                >
                  {{ snippet.label }} - {{ snippet.description }}
                </option>
              </select>
            </div>

            <CssEditor
              v-model="settings.advanced.customCss.draft"
              title="CustomCSS Source"
              placeholder="h1 {\n  color: var(--paper-brand);\n}"
              min-height="300px"
              :dark="settings.appearance.theme === 'dark'"
            />

            <div class="sv-custom-css-meta">
              <span>长度 {{ customCssDraftLength }} / {{ CUSTOM_CSS_MAX_LENGTH }}</span>
              <span>规则 {{ customCssSandboxResult?.ruleCount ?? 0 }} / 1000</span>
              <span>style id: {{ CUSTOM_CSS_STYLE_ID }}</span>
              <span v-if="settings.advanced.customCss.lastAppliedAt">上次应用 {{ formatTimestamp(settings.advanced.customCss.lastAppliedAt) }}</span>
            </div>

            <div class="sv-btn-group sv-custom-css-actions">
              <button
                type="button"
                class="sv-action-btn"
                :disabled="customCssDraftLength > CUSTOM_CSS_MAX_LENGTH"
                @click="handleApplyCustomCss"
              >
                应用
              </button>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                @click="handleResetCustomCss"
              >
                重置
              </button>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                @click="triggerCustomCssImport"
              >
                导入
              </button>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                @click="handleExportCustomCss"
              >
                导出
              </button>
              <input
                ref="customCssImportInput"
                class="sv-visually-hidden-input"
                type="file"
                aria-label="导入 CustomCSS 文件"
                accept="text/css,.css"
                @change="handleImportCustomCssFile"
              >
            </div>

            <div
              v-if="customCssActionMessage"
              class="sv-feedback"
              :class="customCssActionMessage.type"
            >
              {{ customCssActionMessage.text }}
            </div>

            <div
              v-if="customCssDraftErrors.length > 0 || customCssDraftWarnings.length > 0"
              class="sv-custom-css-diagnostics"
            >
              <div
                v-if="customCssDraftErrors.length > 0"
                class="sv-feedback error"
              >
                <strong>阻断项</strong>
                <ul>
                  <li
                    v-for="issue in customCssDraftErrors"
                    :key="`${issue.code}-${issue.line ?? 0}-${issue.column ?? 0}-${issue.message}`"
                  >
                    {{ issue.line ? `L${issue.line}: ` : '' }}{{ issue.message }}
                  </li>
                </ul>
              </div>
              <div
                v-if="customCssDraftWarnings.length > 0"
                class="sv-feedback warning"
              >
                <strong>警告项</strong>
                <ul>
                  <li
                    v-for="issue in customCssDraftWarnings"
                    :key="`${issue.code}-${issue.line ?? 0}-${issue.column ?? 0}-${issue.message}`"
                  >
                    {{ issue.line ? `L${issue.line}: ` : '' }}{{ issue.message }}
                  </li>
                </ul>
              </div>
            </div>

            <details class="sv-history-row sv-custom-css-log">
              <summary>
                错误日志（{{ settings.advanced.customCss.errorLog.length }} / 20）
              </summary>
              <div
                v-if="settings.advanced.customCss.errorLog.length > 0"
                class="sv-history-list"
              >
                <div
                  v-for="entry in settings.advanced.customCss.errorLog"
                  :key="entry.id"
                  class="sv-history-row"
                >
                  <div class="sv-history-row__main">
                    <span class="sv-row-label">{{ entry.type }} / {{ entry.message }}</span>
                    <span class="sv-row-desc">{{ entry.snippet ?? '无 CSS 片段' }}</span>
                  </div>
                  <time class="sv-history-row__time">{{ formatTimestamp(entry.occurredAt) }}</time>
                </div>
                <button
                  type="button"
                  class="sv-action-btn sv-action-btn-sm"
                  @click="handleClearCustomCssLog"
                >
                  清空日志
                </button>
              </div>
              <div
                v-else
                class="sv-placeholder-card"
              >
                当前没有 CustomCSS 错误记录。
              </div>
            </details>
          </div>
        </section>

        <!-- ═════════════════════════════════════ -->
        <!--  Tab 12: 关于                        -->
        <!-- ═════════════════════════════════════ -->
        <section
          v-show="currentTab === 'about'"
          class="sv-tab"
          data-settings-tab="about"
        >
          <h2 class="sv-tab-title">
            关于
          </h2>
          <p class="sv-tab-desc">
            应用信息与致谢
          </p>

          <!-- Logo Card — full 印×笔 lockup composition per §9 -->
          <div class="sv-about-hero">
            <div class="ink-logo-lockup ink-logo-lockup--hero">
              <div
                class="ink-logo-lockup__mark"
                role="img"
                aria-label="InkForge 墨铸"
              >
                <ForgeNibMark
                  :size="160"
                  :tier="1024"
                  interactive
                />
              </div>
              <div class="ink-logo-lockup__wordmark">
                <span class="ink-logo-lockup__name">InkForge</span>
                <span class="ink-logo-lockup__dot">·</span>
                <span class="ink-logo-lockup__cn">墨铸</span>
              </div>
              <div class="ink-logo-lockup__tagline">
                成为作者吧
              </div>
            </div>
            <div class="sv-about-hero-info">
              <h3 class="sv-about-name">
                InkForge Studio
              </h3>
              <span class="sv-about-version">v0.1.0-alpha</span>
              <p class="sv-about-slogan">
                专为内容创作者打造的下一代写作工作站
              </p>
            </div>
          </div>

          <div class="sv-divider" />

          <UpdateCard />

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="about.desktopRuntime"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  Desktop Runtime
                </h3>
                <p class="sv-section-note">
                  Tauri desktop baseline uses real runtime detection and explicit web fallback. Web mode does not mock native success.
                </p>
              </div>
              <button
                type="button"
                class="sv-action-btn sv-action-btn-sm"
                :disabled="desktopStore.loading"
                @click="desktopStore.refresh()"
              >
                {{ desktopStore.loading ? '刷新中' : '刷新' }}
              </button>
            </div>

            <div class="sv-inline-grid sv-inline-grid--three">
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">Runtime</span>
                <span class="sv-insight-card__value">{{ desktopStore.runtimeKindLabel }}</span>
                <span class="sv-insight-card__meta">{{ desktopStore.snapshot?.runtime.signal ?? 'not-sampled' }}</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">Window</span>
                <span class="sv-insight-card__value">{{ desktopStore.snapshot?.currentWindow?.label ?? 'web' }}</span>
                <span class="sv-insight-card__meta">{{ desktopStore.snapshot?.windows.length ?? 0 }} native window(s)</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">App Data</span>
                <span class="sv-insight-card__value">{{ desktopStore.snapshot?.app.targetOs ?? 'web' }}</span>
                <span class="sv-insight-card__meta">{{ desktopStore.snapshot?.app.appDataDir ?? 'native path unavailable' }}</span>
              </div>
            </div>

            <div class="sv-tech-grid sv-tech-grid--desktop">
              <span
                v-for="capability in desktopStore.capabilityGroups"
                :key="capability.id"
                class="sv-tech-badge"
                :data-status="capability.state"
                :title="capability.detail"
              >
                {{ capability.label }}: {{ capability.state }}
              </span>
            </div>

            <p class="sv-section-note">
              {{ desktopStore.snapshot?.note ?? 'Desktop runtime has not been sampled yet.' }}
              <span v-if="desktopStore.error"> / {{ desktopStore.error }}</span>
            </p>
          </div>
          <div
            class="sv-section"
            data-settings-entry="about.ftue"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'about.ftue' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  首次使用与帮助
                </h3>
                <p class="sv-section-note">
                  轻量欢迎、内置帮助和真实快捷键卡片。重置只影响 FTUE 状态，不会改动文章或账户。
                </p>
              </div>
              <span
                class="sv-inline-status sv-inline-status--ready"
                :data-ftue-step="ftueStore.ftueState.step"
              >{{ ftueStore.completedLabel }}</span>
            </div>

            <div class="sv-inline-grid sv-inline-grid--three">
              <button
                type="button"
                class="sv-account-card sv-account-card--action"
                data-ftue-action="open-help"
                @click="openHelpCenter"
              >
                <span class="sv-account-card__kicker">帮助中心</span>
                <strong>打开内置帮助</strong>
                <span>Markdown 速查、快捷键和主题文档均来自当前真实配置。</span>
              </button>
              <button
                type="button"
                class="sv-account-card sv-account-card--action"
                data-ftue-action="reset"
                @click="handleResetFTUE"
              >
                <span class="sv-account-card__kicker">FTUE</span>
                <strong>重置欢迎流程</strong>
                <span>确认后立即重新打开欢迎弹窗；正常启动仍遵循不重复打扰策略，不会生成示例数据。</span>
              </button>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">已读帮助</span>
                <span class="sv-insight-card__value">{{ ftueStore.seenHelpKeys.length }}</span>
                <span class="sv-insight-card__meta">IndexedDB ftue records</span>
              </div>
            </div>
          </div>


          <div
            class="sv-section"
            data-settings-entry="about.migration"
            :data-migration-snapshot-count="settings.advanced.migrationSnapshots.length"
            :data-settings-schema-version="settings.schemaVersion"
            :data-current-settings-schema-version="CURRENT_SETTINGS_SCHEMA_VERSION"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'about.migration' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  Schema 与回滚点
                </h3>
                <p class="sv-section-note">
                  每次全量、Tab 或快捷键重置都会先写入回滚点；这里展示真实 schema 与快照。
                </p>
              </div>
              <span class="sv-inline-status sv-inline-status--ready">v{{ settings.schemaVersion }} / current {{ CURRENT_SETTINGS_SCHEMA_VERSION }}</span>
            </div>

            <div class="sv-inline-grid sv-inline-grid--three">
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">当前 Schema</span>
                <span class="sv-insight-card__value">{{ settings.schemaVersion }}</span>
                <span class="sv-insight-card__meta">Store schema version</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">回滚点</span>
                <span class="sv-insight-card__value">{{ settings.advanced.migrationSnapshots.length }}</span>
                <span class="sv-insight-card__meta">最多保留 10 个</span>
              </div>
              <button
                type="button"
                class="sv-account-card sv-account-card--action"
                data-migration-action="create"
                @click="handleCreateRollbackPoint"
              >
                <span class="sv-account-card__kicker">手动快照</span>
                <strong>创建当前设置回滚点</strong>
                <span>用于高风险调整前的本地恢复。</span>
              </button>
            </div>

            <div
              v-if="lastMigrationPreview"
              class="sv-placeholder-card"
            >
              <strong>最近迁移预览</strong>
              <span>{{ migrationPreviewSummaryText }}</span>
              <span v-if="migrationPreviewDeprecationText">废弃字段：{{ migrationPreviewDeprecationText }}</span>
              <div
                v-if="migrationPreviewDiffRows.length > 0"
                class="sv-history-list"
              >
                <div
                  v-for="entry in migrationPreviewDiffRows"
                  :key="entry.path"
                  class="sv-history-row"
                >
                  <div class="sv-history-row__main">
                    <span class="sv-row-label">{{ entry.path }}</span>
                    <span class="sv-row-desc">{{ formatMigrationDiffKindLabel(entry.kind) }}</span>
                  </div>
                  <span
                    v-if="entry.deprecated"
                    class="sv-inline-status sv-inline-status--warning"
                  >废弃</span>
                </div>
              </div>
            </div>

            <button
              v-if="latestMigrationSnapshot"
              type="button"
              class="sv-account-card sv-account-card--action"
              data-migration-action="restore-latest"
              @click="handleRestoreLatestRollbackPoint"
            >
              <span class="sv-account-card__kicker">最近快照</span>
              <strong>恢复最近回滚点</strong>
              <span>{{ latestMigrationSnapshot.reason }} / Schema v{{ latestMigrationSnapshot.schemaVersion }}</span>
            </button>
            <div
              v-if="settings.advanced.migrationSnapshots.length > 0"
              class="sv-history-list"
            >
              <div
                v-for="snapshot in settings.advanced.migrationSnapshots"
                :key="snapshot.id"
                class="sv-history-row"
              >
                <div class="sv-history-row__main">
                  <span class="sv-row-label">{{ snapshot.reason }}</span>
                  <span class="sv-row-desc">Schema v{{ snapshot.schemaVersion }} / {{ snapshot.id }}</span>
                </div>
                <div class="sv-history-row__actions">
                  <time class="sv-history-row__time">{{ formatTimestamp(snapshot.createdAt) }}</time>
                  <button
                    type="button"
                    class="sv-action-btn sv-action-btn-sm"
                    data-migration-action="restore"
                    :data-migration-snapshot-id="snapshot.id"
                    @click="handleRestoreRollbackPoint(snapshot.id)"
                  >
                    恢复
                  </button>
                </div>
              </div>
            </div>
            <div
              v-else
              class="sv-placeholder-card"
            >
              当前没有回滚点。执行重置或手动创建后会显示在这里。
            </div>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="about.logLevel"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'about.logLevel' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  运行时控制
                </h3>
                <p class="sv-section-note">
                  日志级别会实时绑定到统一 logger，并随设置导入导出一并保留。
                </p>
              </div>
              <span
                class="sv-inline-status sv-inline-status--ready"
                :data-runtime-log-level="runtimeDiagnostics.currentLogLevel"
              >{{ runtimeDiagnostics.currentLogLevel.toUpperCase() }}</span>
            </div>

            <div class="sv-form-grid">
              <div>
                <span class="sv-row-label">日志级别</span>
                <select
                  v-model="settings.advanced.logLevel"
                  class="sv-select"
                  aria-label="日志级别"
                  data-about-log-level
                >
                  <option
                    v-for="option in logLevelOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              <div>
                <span class="sv-row-label">安全上下文</span>
                <div class="sv-static-card">
                  {{ runtimeDiagnostics.secureContext ? '已启用' : '未启用' }}
                </div>
              </div>
              <div class="sv-form-grid__full">
                <span class="sv-row-label">用户代理</span>
                <div class="sv-static-card sv-static-card--mono">
                  {{ runtimeDiagnostics.userAgent }}
                </div>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="about.devPanel"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'about.devPanel' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  Developer Mode
                </h3>
                <p class="sv-section-note">
                  启用生产保留的 DevPanel；正常启动不会挂载面板，首次激活后才动态加载诊断抽屉。
                </p>
              </div>
              <span
                class="sv-inline-status"
                :class="developerModeEnabled ? 'sv-inline-status--ready' : 'sv-inline-status--disabled'"
              >
                {{ developerModeEnabled ? '已启用' : '已隐藏' }}
              </span>
            </div>

            <div class="sv-form-grid">
              <label class="sv-toggle-row">
                <input
                  v-model="settings.advanced.developerMode"
                  type="checkbox"
                  @change="handleDeveloperModeChange"
                >
                <span>
                  <strong>启用开发者模式</strong>
                  <small>Ctrl+Shift+D 三连可临时启用；持久开关会保存到本机 Settings。</small>
                </span>
              </label>
              <div>
                <span class="sv-row-label">Panel</span>
                <button
                  type="button"
                  class="sv-action-btn"
                  :disabled="!developerModeEnabled"
                  @click="handleToggleDevPanel"
                >
                  {{ isPanelVisible ? '关闭开发者面板' : '打开开发者面板' }}
                </button>
              </div>
              <div class="sv-form-grid__full">
                <span class="sv-row-label">数据策略</span>
                <div class="sv-static-card">
                  只读取真实 TipTap、Pinia、ActivityLogger、Performance、IndexedDB 与 Network 诊断；URL query 与敏感字段会脱敏，IndexedDB 写回在 baseline 中禁用。
                </div>
              </div>
            </div>
          </div>

          <div class="sv-divider" />
          <div class="sv-section">
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  开发者工具
                </h3>
                <p class="sv-section-note">
                  导出调试快照前会自动脱敏 AI Key、代理密码等敏感字段。
                </p>
              </div>
              <div class="sv-btn-group">
                <button
                  type="button"
                  class="sv-action-btn sv-action-btn-sm"
                  :disabled="runtimePanelBusy"
                  @click="refreshRuntimePanels"
                >
                  刷新
                </button>
                <button
                  type="button"
                  class="sv-action-btn sv-action-btn-sm"
                  :disabled="runtimeExportBusy"
                  @click="handleExportDiagnostics"
                >
                  {{ runtimeExportBusy ? '导出中...' : '导出调试 JSON' }}
                </button>
              </div>
            </div>

            <div class="sv-inline-grid sv-inline-grid--four">
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">数据库</span>
                <span class="sv-insight-card__value">{{ runtimeDiagnostics.dbName }}</span>
                <span class="sv-insight-card__meta">Dexie v{{ runtimeDiagnostics.dbVersion }}</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">功能开关</span>
                <span class="sv-insight-card__value">{{ runtimeDiagnostics.featureFlagsEnabled }}</span>
                <span class="sv-insight-card__meta">当前启用数量</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">文章 / 素材</span>
                <span class="sv-insight-card__value">{{ dataStats.articleCount }} / {{ dataStats.assetCount }}</span>
                <span class="sv-insight-card__meta">真实业务数据</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">更新时间</span>
                <span class="sv-insight-card__value">{{ formatTimestamp(runtimeDiagnostics.lastUpdated) }}</span>
                <span class="sv-insight-card__meta">最近一次刷新</span>
              </div>
            </div>

            <div class="sv-breakdown-list">
              <div
                v-for="table in runtimeDiagnostics.tableCounts"
                :key="table.name"
                class="sv-breakdown-row"
              >
                <span>{{ table.name }}</span>
                <strong>{{ table.count }} 条</strong>
              </div>
            </div>
          </div>

          <div class="sv-divider" />

          <div
            class="sv-section"
            data-settings-entry="about.performanceSlo"
            :data-performance-enabled="String(performanceMetricsFlag.enabled.value)"
            :class="{ 'sv-registry-highlight': activeRegistryMatchId === 'about.performanceSlo' }"
          >
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  性能监测
                </h3>
                <p class="sv-section-note">
                  基于 requestAnimationFrame、Dexie 读取、浏览器导航指标和内存 API 实时采样。
                </p>
              </div>
              <span
                class="sv-inline-status"
                :class="performanceMetricsFlag.enabled.value ? 'sv-inline-status--ready' : 'sv-inline-status--disabled'"
              >
                {{ performanceMetricsFlag.enabled.value ? '已启用' : '需开启 feature flag' }}
              </span>
            </div>

            <div
              v-if="performanceMetricsFlag.enabled.value"
              class="sv-inline-grid sv-inline-grid--five"
            >
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">FPS</span>
                <span class="sv-insight-card__value">{{ performanceSnapshot.fps ?? '--' }}</span>
                <span class="sv-insight-card__meta">约 600ms 窗口采样</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">IDB 读取延迟</span>
                <span class="sv-insight-card__value">{{ performanceSnapshot.indexedDbReadMs ?? '--' }} ms</span>
                <span class="sv-insight-card__meta">Dexie documents 读样本</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">设置写入延迟</span>
                <span class="sv-insight-card__value">{{ performanceSnapshot.settingsWriteMs ?? '--' }} ms</span>
                <span class="sv-insight-card__meta">localStorage 探针</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">Navigation</span>
                <span class="sv-insight-card__value">{{ performanceSnapshot.navigationMs ?? '--' }} ms</span>
                <span class="sv-insight-card__meta">当前页面导航耗时</span>
              </div>
              <div class="sv-insight-card">
                <span class="sv-insight-card__label">内存</span>
                <span class="sv-insight-card__value">{{ performanceSnapshot.memoryBytes === null ? '--' : formatBytes(performanceSnapshot.memoryBytes) }}</span>
                <span class="sv-insight-card__meta">{{ performanceSnapshot.memorySource }}</span>
              </div>
            </div>
            <div
              v-else
              class="sv-placeholder-card"
            >
              在 AI 服务页启用 <code>performance-metrics</code> 后，这里会显示真实采样结果。
            </div>

            <p class="sv-section-note">
              {{ performanceSnapshot.note }}；最近采样：{{ formatTimestamp(performanceSnapshot.sampledAt) }}
            </p>
            <div
              v-if="performanceMetricsFlag.enabled.value"
              class="sv-section sv-section--nested"
              data-performance-slo-ledger
              :data-performance-sample-count="performanceSloSummary.sampleCount"
              :data-performance-event-count="performanceSloSummary.eventCount"
            >
              <div class="sv-section-header">
                <div>
                  <h4 class="sv-section-title">
                    Performance SLO 账本
                  </h4>
                  <p class="sv-section-note">
                    真实采样写入 IndexedDB `performanceSamples`，超阈值会生成 `performanceDegradationEvents` 并尝试写入审计日志；Lighthouse 与大型压测仍标记为待真实运行。
                  </p>
                </div>
                <span
                  class="sv-inline-status"
                  :class="getPerformanceStatusClass(performanceSloSummary.status)"
                >
                  {{ getPerformanceStatusLabel(performanceSloSummary.status) }}
                </span>
              </div>

              <div class="sv-inline-grid sv-inline-grid--five">
                <div class="sv-insight-card">
                  <span class="sv-insight-card__label">样本</span>
                  <span class="sv-insight-card__value">{{ performanceSloSummary.sampleCount }}</span>
                  <span class="sv-insight-card__meta">bounded local samples</span>
                </div>
                <div class="sv-insight-card">
                  <span class="sv-insight-card__label">降级事件</span>
                  <span class="sv-insight-card__value">{{ performanceSloSummary.eventCount }}</span>
                  <span class="sv-insight-card__meta">durable events</span>
                </div>
                <div class="sv-insight-card">
                  <span class="sv-insight-card__label">最差指标</span>
                  <span class="sv-insight-card__value">{{ performanceSloSummary.worstMetric ? getPerformanceMetricLabel(performanceSloSummary.worstMetric) : '--' }}</span>
                  <span class="sv-insight-card__meta">threshold evaluation</span>
                </div>
                <div class="sv-insight-card">
                  <span class="sv-insight-card__label">Reduced motion</span>
                  <span class="sv-insight-card__value">{{ performanceReducedMotion === null ? '--' : performanceReducedMotion ? 'reduce' : 'no-preference' }}</span>
                  <span class="sv-insight-card__meta">matchMedia</span>
                </div>
                <div class="sv-insight-card">
                  <span class="sv-insight-card__label">Collector</span>
                  <span class="sv-insight-card__value">{{ performanceSloCollecting ? 'on' : 'off' }}</span>
                  <span class="sv-insight-card__meta">{{ performanceSloLoading ? 'sampling' : performanceSupportMatrix.length + ' capabilities' }}</span>
                </div>
              </div>

              <div class="sv-breakdown-list">
                <div
                  v-for="sample in performanceRecentSamples"
                  :key="sample.id"
                  class="sv-breakdown-row"
                >
                  <span>{{ getPerformanceMetricLabel(sample.metric) }}</span>
                  <strong>{{ formatPerformanceMetricValue(sample) }} · {{ getPerformanceStatusLabel(sample.status) }}</strong>
                </div>
              </div>

              <div
                v-if="performanceRecentEvents.length > 0"
                class="sv-breakdown-list"
              >
                <div
                  v-for="event in performanceRecentEvents"
                  :key="event.id"
                  class="sv-breakdown-row"
                >
                  <span>{{ getPerformanceMetricLabel(event.metric) }}</span>
                  <strong>{{ event.level }} · {{ formatTimestamp(new Date(event.createdAt).toISOString()) }}</strong>
                </div>
              </div>

              <div
                v-if="performanceUnsupportedCapabilities.length > 0"
                class="sv-placeholder-card"
                data-performance-unsupported
              >
                <strong>运行时能力受限</strong>
                <span
                  v-for="item in performanceUnsupportedCapabilities"
                  :key="item.key"
                  :data-performance-capability="item.key"
                  :data-performance-support-state="item.supportState"
                >{{ item.label }}: {{ item.reason }}</span>
              </div>

              <p class="sv-section-note">
                {{ performanceSloError || performanceSloMessage || 'Performance SLO collector ready' }}
              </p>
            </div>
          </div>

          <div class="sv-divider" />

          <div class="sv-section">
            <div class="sv-section-header">
              <div>
                <h3 class="sv-section-title">
                  本地账户与安全
                </h3>
                <p class="sv-section-note">
                  账户资料来自本机 IndexedDB accounts 表，安全能力只展示真实状态。
                </p>
              </div>
              <span class="sv-inline-status sv-inline-status--ready">{{ accountStore.displayName }}</span>
            </div>

            <div class="sv-account-grid">
              <button
                type="button"
                class="sv-account-card sv-account-card--action"
                @click="goToAccount"
              >
                <span class="sv-account-card__kicker">账户切换</span>
                <strong>{{ accountStore.currentAccount?.email || accountStore.displayName }}</strong>
                <span>进入 /account 创建、切换、导出本地 Profile。</span>
              </button>
              <div
                class="sv-account-card sv-account-card--disabled"
                aria-disabled="true"
              >
                <span class="sv-account-card__kicker">安全</span>
                <strong>本地密码 / Windows Hello 即将推出</strong>
                <span>当前不伪造认证状态，高危二次认证将在后续安全切片接入。</span>
              </div>
            </div>
          </div>

          <!-- 技术栈 -->
          <div class="sv-section">
            <h3 class="sv-section-title">
              技术栈
            </h3>
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
            <h3 class="sv-section-title">
              致谢
            </h3>
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
            <h3 class="sv-section-title">
              开源协议
            </h3>
            <p class="sv-license-text">
              MIT License
            </p>
            <p class="sv-license-desc">
              本项目基于 MIT 协议开源，允许自由使用、修改和分发。
            </p>
          </div>
        </section>
      </main>
    </div>

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <div
        v-if="confirmDialog.visible"
        class="sv-overlay"
        @click.self="cancelConfirm"
      >
        <div
          class="sv-confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="settings-confirm-title"
          :aria-describedby="confirmDialog.error
            ? 'settings-confirm-description settings-confirm-error'
            : 'settings-confirm-description'"
        >
          <h3
            id="settings-confirm-title"
            class="sv-confirm-title"
          >
            {{ confirmDialog.title }}
          </h3>
          <p
            id="settings-confirm-description"
            class="sv-confirm-message"
          >
            {{ confirmDialog.message }}
          </p>
          <div
            v-if="confirmDialog.requiresText"
            class="sv-confirm-verify"
          >
            <label class="sv-confirm-label">
              请输入 <code>{{ confirmDialog.requiresText }}</code> 继续
            </label>
            <input
              v-model.trim="confirmDialog.input"
              type="text"
              class="sv-input"
              aria-label="确认操作校验文本"
              :placeholder="confirmDialog.requiresText"
            >
          </div>
          <p
            v-if="confirmDialog.error"
            id="settings-confirm-error"
            class="sv-feedback error"
            role="alert"
            data-settings-confirm-error
          >
            {{ confirmDialog.error }}
          </p>
          <div class="sv-confirm-actions">
            <button
              type="button"
              class="sv-confirm-cancel"
              :disabled="confirmDialog.busy"
              @click="cancelConfirm"
            >
              取消
            </button>
            <button
              type="button"
              class="sv-confirm-ok"
              :disabled="confirmActionDisabled"
              @click="confirmAction"
            >
              {{ confirmDialog.busy ? '处理中...' : '确认' }}
            </button>
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

.sv-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
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
  box-shadow: var(--elev-1);
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
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart),
              border-left-color var(--motion-fast) var(--ease-out-quart),
              box-shadow var(--motion-fast) var(--ease-out-quart);
  text-align: left;
}

.sv-nav-item:hover {
  background: rgba(37, 41, 51, 0.04);
  color: var(--text-primary, #263238);
}

/* Ulysses pattern: selected row gets a Kiln left-edge accent bar.
   No full-row fill; lets typography lead the active state. */
.sv-nav-item.active {
  background: transparent;
  color: var(--accent-primary, #D32F2F);
  border-left-color: var(--accent-primary, #D32F2F);
}

.sv-nav-item:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.sv-settings-search-panel {
  margin-bottom: 14px;
  padding: 12px;
  background: var(--bg-surface, #FFFFFF);
  border: 1px solid var(--hairline-light);
  border-radius: 12px;
  box-shadow: var(--elev-1);
}

.sv-settings-search-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary, #263238);
}

.sv-settings-search-input {
  width: 100%;
}

.sv-settings-search-results {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  max-height: 260px;
  overflow-y: auto;
}

.sv-settings-search-result {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 8px 10px;
  background: #FAFBFC;
  border: 1px solid var(--hairline-light);
  border-radius: 9px;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart),
              box-shadow var(--motion-fast) var(--ease-out-quart);
}

.sv-settings-search-result:hover,
.sv-settings-search-result.active {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, #FFEBEE);
}

.sv-settings-search-result:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.sv-settings-search-result__label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary, #263238);
}

.sv-settings-search-result__meta,
.sv-settings-search-empty {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-muted, #90A4AE);
}

.sv-settings-search-empty {
  padding: 10px;
  text-align: center;
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
  box-shadow: var(--elev-1);
}

.sv-tab-title {
  font-family: var(--font-serif);
  /* Use a clamped serif scale that anchors to var(--type-step-3) (34px) but
     leaves room for the existing dense Settings page layout. */
  font-size: clamp(20px, 2.4vw, var(--type-step-3));
  font-weight: var(--type-weight-emphasis);
  color: var(--text-primary, #263238);
  letter-spacing: 0.02em;
  line-height: 1.2;
  margin-bottom: 6px;
}

.sv-tab-desc {
  font-family: var(--font-sans);
  font-size: var(--type-step-1);
  color: var(--text-secondary, #607D8B);
  line-height: 1.5;
  margin-bottom: 22px;
}

/* ─── Section ─── */
.sv-section {
  margin-bottom: 16px;
}

.sv-section-title {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: var(--type-weight-emphasis);
  color: var(--text-primary, #263238);
  letter-spacing: 0.02em;
  margin-bottom: 16px;
}

.sv-divider {
  height: 1px;
  background: var(--hairline-light);
  margin: 20px 0;
}

/* ─── Row (label+control) ─── */
.sv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--hairline-light);
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
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: var(--type-weight-emphasis);
  color: var(--text-primary, #263238);
}

.sv-row-desc {
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
}

/* ─── Toggle Row ─── */
.sv-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--hairline-light);
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
  transition: transform var(--motion-base) var(--ease-out-quart);
  box-shadow: var(--elev-1);
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
  border: 1px solid var(--hairline-light);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary, #263238);
  cursor: pointer;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
              box-shadow var(--motion-fast) var(--ease-out-quart);
  outline: none;
}

.sv-select:focus,
.sv-select:focus-visible {
  border-color: transparent;
  box-shadow: var(--focus-ring);
}

/* ─── Input ─── */
.sv-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  background: var(--bg-surface, #FFFFFF);
  border: 1px solid var(--hairline-light);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary, #263238);
  outline: none;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
              box-shadow var(--motion-fast) var(--ease-out-quart);
}

.sv-input:focus,
.sv-input:focus-visible {
  border-color: transparent;
  box-shadow: var(--focus-ring);
}

.sv-input[aria-invalid="true"] {
  border-color: var(--error);
}

.sv-field-error {
  display: block;
  margin-top: 4px;
  color: var(--error);
  font-size: 11px;
  line-height: 1.4;
}

.sv-textarea {
  width: 100%;
  min-height: 88px;
  padding: 12px;
  background: var(--bg-surface, #FFFFFF);
  border: 1px solid var(--hairline-light);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #263238);
  resize: vertical;
  outline: none;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
              box-shadow var(--motion-fast) var(--ease-out-quart);
}

.sv-textarea:focus,
.sv-textarea:focus-visible {
  border-color: transparent;
  box-shadow: var(--focus-ring);
}

.sv-code-textarea {
  min-height: 132px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
}

.sv-custom-css-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sv-custom-css-toolbar,
.sv-custom-css-actions,
.sv-custom-css-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.sv-custom-css-toggle {
  flex: 1 1 320px;
  margin: 0;
}

.sv-custom-css-snippet {
  min-width: 240px;
  flex: 0 1 360px;
}

.sv-custom-css-meta {
  padding: 10px 12px;
  background: rgba(38, 50, 56, 0.04);
  border: 1px solid rgba(38, 50, 56, 0.08);
  border-radius: 10px;
  color: var(--text-muted, #607D8B);
  font-size: 12px;
}

.sv-custom-css-diagnostics {
  display: grid;
  gap: 10px;
}

.sv-custom-css-diagnostics ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.sv-custom-css-log summary {
  cursor: pointer;
}

.sv-visually-hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.sv-registry-highlight {
  border-radius: 12px;
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.12);
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
  box-shadow: var(--elev-1);
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

/* Typography Presets */
.sv-typography-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.sv-typography-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 116px;
  padding: 14px;
  text-align: left;
  background: var(--bg-surface, #FFFFFF);
  border: 2px solid var(--border, #ECEFF1);
  border-radius: var(--radius-large, 12px);
  color: var(--text-primary, #263238);
  cursor: pointer;
  transition: border-color var(--duration-fast), background var(--duration-fast), transform var(--duration-fast);
}

.sv-typography-card:hover {
  border-color: var(--text-muted, #90A4AE);
  transform: translateY(-1px);
}

.sv-typography-card.selected {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, rgba(211, 47, 47, 0.1));
}

.sv-typography-card__label {
  font-size: 15px;
  font-weight: 700;
}

.sv-typography-card__desc,
.sv-typography-card__meta {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted, #90A4AE);
}

.sv-typography-card__meta {
  margin-top: auto;
  font-family: var(--font-mono, monospace);
}

/* Visual System Diagnostics */
.sv-visual-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.sv-token-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: var(--bg-rice-paper, #FAFBFC);
  border: 1px solid var(--border, #ECEFF1);
  border-radius: var(--radius-large, 12px);
}

.sv-token-row {
  display: grid;
  grid-template-columns: minmax(180px, 0.65fr) minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-width: 0;
  font-family: var(--font-mono, monospace);
  font-size: 11px;
}

.sv-token-row__name {
  color: var(--text-secondary, #546E7A);
}

.sv-token-row__value {
  min-width: 0;
  color: var(--text-primary, #263238);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  box-shadow: var(--elev-1);
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
  box-shadow: var(--elev-1);
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
  border: 1px solid var(--hairline-light);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #37474F;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart),
              box-shadow var(--motion-fast) var(--ease-out-quart);
}

.sv-action-btn:hover {
  background: #FAFBFC;
  border-color: var(--accent-primary, #D32F2F);
  color: var(--accent-primary, #D32F2F);
}

.sv-action-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
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

.sv-feedback.warning {
  background: rgba(239, 108, 0, 0.1);
  color: #B45309;
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
  border: 1px solid var(--hairline-light);
  border-radius: 12px;
  box-shadow: var(--elev-1);
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
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart),
              box-shadow var(--motion-fast) var(--ease-out-quart);
  flex-shrink: 0;
}

.sv-danger-btn:hover {
  background: var(--accent-primary, #D32F2F);
  color: white;
}

.sv-danger-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* ═══ Shared Enhancement Blocks ═══ */

.sv-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.sv-section-header .sv-section-title {
  margin-bottom: 4px;
}

.sv-section-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted, #90A4AE);
}

.sv-inline-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.sv-inline-status--ready {
  background: var(--success-light, #E8F5E9);
  color: var(--success, #2E7D32);
}

.sv-inline-status--invalid {
  background: var(--warning-light, #FFF8E1);
  color: var(--warning, #ED6C02);
}

.sv-inline-status--disabled {
  background: #F5F5F5;
  color: var(--text-muted, #90A4AE);
}

.sv-insight-card__value--small {
  font-size: 13px;
  line-height: 1.35;
  word-break: break-all;
}

.sv-profile-accent-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.sv-profile-accent {
  width: 30px;
  height: 30px;
  border: 2px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(38, 50, 56, 0.12);
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.sv-profile-accent:hover,
.sv-profile-accent.selected {
  border-color: var(--text-primary, #263238);
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(38, 50, 56, 0.18);
}

.sv-profile-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(38, 50, 56, 0.16);
}

.sv-static-card.sv-profile-detail-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.sv-profile-detail-card > .sv-inline-grid {
  grid-column: 1 / -1;
}

.sv-profile-detail-card > .sv-placeholder-card {
  min-width: 0;
}

.sv-profile-detail-card > .sv-btn-group {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.sv-profile-detail-card .sv-action-btn,
.sv-profile-detail-card .sv-danger-btn {
  white-space: nowrap;
}

@media (max-width: 768px) {
  .sv-profile-detail-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .sv-profile-detail-card > * {
    grid-column: 1;
  }

  .sv-profile-detail-card > .sv-btn-group {
    justify-content: flex-start;
  }
}

.sv-account-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.sv-account-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-height: 118px;
  padding: 16px;
  border: 1px solid var(--hairline-light);
  border-radius: 14px;
  background: #FAFBFC;
  color: var(--text-primary, #263238);
  text-align: left;
}

.sv-account-card--action {
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.sv-account-card--action:hover {
  border-color: var(--accent-primary, #D32F2F);
  box-shadow: 0 10px 24px rgba(211, 47, 47, 0.10);
  transform: translateY(-1px);
}

.sv-account-card--disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.sv-account-card__kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-primary, #D32F2F);
}

.sv-account-card strong {
  font-size: 15px;
}

.sv-account-card span:last-child {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary, #607D8B);
}

/* ═══ Tab 2: Editor Enhancements ═══ */

.sv-chip-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.sv-chip-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px 16px;
  background: #FAFBFC;
  border: 1px solid var(--hairline-light);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.sv-chip-btn:hover {
  border-color: var(--text-muted, #90A4AE);
  transform: translateY(-1px);
}

.sv-chip-btn.selected {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, #FFEBEE);
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.08);
}

.sv-chip-btn__label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #263238);
}

.sv-chip-btn__desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted, #90A4AE);
}

/* ═══ Tab 4: AI Enhancements ═══ */

.sv-flag-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.sv-flag-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: #FAFBFC;
  border: 1px solid var(--hairline-light);
  border-radius: 12px;
}

.sv-flag-card__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sv-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.sv-form-grid > div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sv-form-grid__full {
  grid-column: 1 / -1;
}

.sv-inline-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.sv-inline-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.sv-inline-grid--four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.sv-inline-grid--five {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.sv-insight-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--hairline-light);
  border-radius: 12px;
  background: #FAFBFC;
  min-width: 0;
}

.sv-insight-card__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted, #90A4AE);
}

.sv-insight-card__value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #263238);
  word-break: break-word;
}

.sv-insight-card__meta {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary, #607D8B);
}

.sv-static-card {
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--hairline-light);
  border-radius: 10px;
  background: #FAFBFC;
  color: var(--text-primary, #263238);
  line-height: 1.5;
}

.sv-static-card--mono {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  word-break: break-all;
}

.sv-meter {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.sv-meter__track {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: #ECEFF1;
  overflow: hidden;
}

.sv-meter__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent-primary);
}

.sv-meter__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary, #607D8B);
}

.sv-breakdown-list,
.sv-cache-list,
.sv-history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.sv-breakdown-row,
.sv-cache-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--hairline-light);
  border-radius: 10px;
  background: var(--bg-surface, #FFFFFF);
  font-size: 13px;
  color: var(--text-secondary, #607D8B);
}

.sv-history-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--hairline-light);
  border-radius: 12px;
  background: var(--bg-surface, #FFFFFF);
}

.sv-history-row__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sv-history-row__time {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
}

.sv-history-row__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.sv-history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

details.sv-history-row {
  display: block;
}

details.sv-history-row summary {
  cursor: pointer;
  list-style: none;
}

details.sv-history-row summary::-webkit-details-marker {
  display: none;
}

.sv-static-card pre {
  margin: 10px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.sv-placeholder-card {
  padding: 14px 16px;
  border: 1px dashed #CFD8DC;
  border-radius: 12px;
  background: #FAFBFC;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary, #607D8B);
}

/* ═══ Tab 6: Shortcuts ═══ */

.sv-shortcut-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.sv-shortcut-search {
  flex: 1;
  max-width: 320px;
}

.sv-shortcut-summary {
  display: flex;
  gap: 10px;
}

.sv-shortcut-summary-item {
  min-width: 92px;
  padding: 10px 12px;
  background: #FAFBFC;
  border: 1px solid var(--hairline-light);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sv-shortcut-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sv-shortcut-card {
  border: 1px solid var(--hairline-light);
  border-radius: 14px;
  background: var(--bg-surface, #FFFFFF);
  overflow: hidden;
}

.sv-shortcut-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  background: #FAFBFC;
  border-bottom: 1px solid var(--hairline-light);
}

.sv-shortcut-card__title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #263238);
}

.sv-shortcut-card__desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted, #90A4AE);
}

.sv-shortcut-list {
  display: flex;
  flex-direction: column;
}

.sv-shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--hairline-light);
}

.sv-shortcut-item:last-child {
  border-bottom: none;
}

.sv-shortcut-item__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.sv-shortcut-item__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #263238);
}

.sv-shortcut-item__desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted, #90A4AE);
}

.sv-shortcut-item__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.sv-shortcut-item__actions > :first-child {
  flex: 1;
  max-width: 280px;
}

.sv-shortcut-conflict {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: var(--warning-light, #FFF8E1);
  color: var(--warning, #ED6C02);
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.6;
  font-weight: 500;
}

.sv-shortcut-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 1px dashed #CFD8DC;
  border-radius: 12px;
  color: var(--text-muted, #90A4AE);
  font-size: 13px;
  background: #FAFBFC;
}

.sv-shortcuts-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* ═══ Tab 2: Editor - Smart Punctuation ═══ */

.sv-smart-punctuation-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 8px 0 14px;
  padding: 14px;
  border: 1px solid rgba(211, 47, 47, 0.12);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 252, 249, 0.96), rgba(250, 250, 250, 0.88));
}

.sv-smart-punctuation-panel.is-disabled {
  opacity: 0.72;
}

.sv-smart-punctuation-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.sv-smart-punctuation-header > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sv-smart-rule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
}

.sv-smart-rule-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-height: 116px;
  padding: 12px;
  border: 1px solid rgba(207, 216, 220, 0.72);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.84);
}

.sv-smart-rule-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.sv-smart-rule-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #263238);
}

.sv-smart-rule-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted, #90A4AE);
}

.sv-smart-rule-preview {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary, #607D8B);
}

.sv-smart-rule-preview code {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(236, 239, 241, 0.7);
  color: var(--text-primary, #263238);
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
}

.sv-smart-rule-actions {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
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

/* 印×笔 lockup composition — host-side wordmark per §9.
   Mark is iconography only; Latin / 简体 wordmark + tagline composed here
   using the app font stack so the SVG stays 0-font-dependency. */
.ink-logo-lockup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.ink-logo-lockup__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ink-logo-lockup__wordmark {
  display: flex;
  align-items: baseline;
  gap: 0.4em;
  font-family: var(--font-serif, 'EB Garamond', 'Source Han Serif SC', 'Noto Serif SC', Georgia, serif);
  font-size: 22px;
  font-weight: var(--type-weight-emphasis, 600);
  letter-spacing: 0.06em;
  color: var(--ink-text, #252933);
}

.ink-logo-lockup__name {
  font-family: 'EB Garamond', 'Crimson Pro', Georgia, serif;
  font-weight: 600;
}

.ink-logo-lockup__dot {
  color: var(--ink-accent, #D95B3F);
  opacity: 0.78;
  font-weight: 400;
}

.ink-logo-lockup__cn {
  font-family: 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', 'STSong', serif;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.ink-logo-lockup__tagline {
  font-family: 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', 'STSong', serif;
  font-style: italic;
  font-size: 13px;
  letter-spacing: 0.25em;
  color: var(--ink-text-muted, #6E7580);
}

:global(:root[data-theme='dark']) .ink-logo-lockup__wordmark {
  color: #E8E4DC;
}
:global(:root[data-theme='dark']) .ink-logo-lockup__dot {
  color: #E8734F;
}
:global(:root[data-theme='dark']) .ink-logo-lockup__tagline {
  color: #9B958D;
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
  background: var(--bg-rice-paper, #F5F5F5);
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
  background: var(--bg-rice-paper, #FAFBFC);
  border: 1px solid var(--hairline-light);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #607D8B);
  transition: border-color var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart),
    background-color var(--motion-fast) var(--ease-out-quart);
}

.sv-tech-badge:hover {
  border-color: var(--accent-primary, #D32F2F);
  color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, #FFEBEE);
}

.sv-tech-grid--desktop {
  margin-top: 16px;
}

.sv-tech-badge[data-status="available"] {
  border-color: var(--success-light, #E8F5E9);
  color: var(--success, #2E7D32);
}

.sv-tech-badge[data-status="degraded"] {
  border-color: var(--warning-light, #FFF8E1);
  color: var(--warning, #ED6C02);
}

.sv-tech-badge[data-status="unavailable"],
.sv-tech-badge[data-status="planned"] {
  color: var(--text-muted, #90A4AE);
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
  background: var(--bg-rice-paper, #FAFBFC);
  border: 1px solid var(--hairline-light);
  border-radius: 6px;
}

.sv-credit-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #1565C0);
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

.sv-confirm-verify {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: var(--space-large);
}

.sv-confirm-label {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
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

.sv-confirm-cancel:disabled,
.sv-confirm-ok:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.sv-confirm-ok:hover {
  background: var(--accent-primary-dark);
  transform: translateY(-1px);
}

@media (max-width: 1024px) {
  .sv-inline-grid--three,
  .sv-inline-grid--four,
  .sv-inline-grid--five,
  .sv-typography-grid,
  .sv-visual-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .sv-header {
    height: auto;
    align-items: flex-start;
    padding: 12px 16px;
    flex-wrap: wrap;
  }

  .sv-header-actions {
    width: 100%;
    margin-left: 0;
    justify-content: stretch;
  }

  .sv-header-actions .sv-action-btn {
    flex: 1;
  }

  .sv-body {
    flex-direction: column;
    padding: 16px;
    gap: 16px;
  }

  .sv-sidebar {
    width: 100%;
    position: static;
  }

  .sv-nav {
    flex-direction: row;
    overflow-x: auto;
  }

  .sv-nav-item {
    flex: 0 0 auto;
  }

  .sv-form-grid,
  .sv-inline-grid--three,
  .sv-inline-grid--four,
  .sv-inline-grid--five,
  .sv-typography-grid,
  .sv-visual-grid,
  .sv-token-row {
    grid-template-columns: 1fr;
  }

  .sv-shortcut-toolbar,
  .sv-shortcut-item,
  .sv-section-header,
  .sv-history-row,
  .sv-history-row__actions,
  .sv-confirm-actions,
  .sv-meter__meta {
    flex-direction: column;
    align-items: stretch;
  }

  .sv-shortcut-item__actions {
    width: 100%;
    justify-content: stretch;
    flex-direction: column;
    align-items: stretch;
  }

  .sv-shortcut-item__actions > :first-child {
    max-width: none;
  }
}

/* P2-09 settings overflow and dark polish */
.sv-body,
.sv-sidebar,
.sv-content,
.sv-nav-item,
.sv-row,
.sv-toggle-row,
.sv-platform-card,
.sv-provider-card,
.sv-shortcut-item,
.sv-theme-card-info,
.sv-font-card,
.sv-typography-card,
.sv-token-row,
.sv-token-row__value,
.sv-account-card,
.sv-chip-btn,
.sv-insight-card,
.sv-static-card {
  min-width: 0;
}

@media (max-width: 768px) {
  .sv-nav {
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 40px), transparent 100%);
    mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 40px), transparent 100%);
  }

  .sv-nav::-webkit-scrollbar {
    display: none;
  }
}

.sv-nav-item span,
.sv-row-label,
.sv-toggle-label,
.sv-platform-label,
.sv-provider-name,
.sv-theme-card-label,
.sv-font-card-label,
.sv-typography-card__label,
.sv-shortcut-card__title,
.sv-shortcut-item__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sv-tab-desc,
.sv-row-desc,
.sv-toggle-desc,
.sv-platform-desc,
.sv-provider-desc,
.sv-theme-card-desc,
.sv-shortcut-card__desc,
.sv-shortcut-item__desc,
.sv-license-desc,
.sv-credit-desc,
.sv-danger-desc,
.sv-danger-row-desc,
.sv-chip-btn__desc,
.sv-insight-card__meta,
.sv-typography-card__desc,
.sv-typography-card__meta {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  min-width: 0;
  overflow: hidden;
}

html.theme-dark .settings-view,
html[data-theme="dark"] .settings-view {
  background: var(--bg-page);
  color: var(--text-primary);
}

html.theme-dark .sv-header,
html.theme-dark .sv-sidebar,
html.theme-dark .sv-content,
html[data-theme="dark"] .sv-header,
html[data-theme="dark"] .sv-sidebar,
html[data-theme="dark"] .sv-content {
  background: var(--bg-surface);
  border-color: var(--border);
}

html.theme-dark .sv-section,
html.theme-dark .sv-card-group,
html.theme-dark .sv-theme-card,
html.theme-dark .sv-font-card,
html.theme-dark .sv-typography-card,
html.theme-dark .sv-token-preview,
html.theme-dark .sv-platform-card,
html.theme-dark .sv-provider-card,
html.theme-dark .sv-stat-card,
html.theme-dark .sv-danger-row,
html.theme-dark .sv-account-card,
html.theme-dark .sv-chip-btn,
html.theme-dark .sv-flag-card,
html.theme-dark .sv-insight-card,
html.theme-dark .sv-static-card,
html.theme-dark .sv-placeholder-card,
html.theme-dark .sv-shortcut-card,
html.theme-dark .sv-shortcut-card__header,
html.theme-dark .sv-shortcut-item,
html[data-theme="dark"] .sv-section,
html[data-theme="dark"] .sv-card-group,
html[data-theme="dark"] .sv-theme-card,
html[data-theme="dark"] .sv-font-card,
html[data-theme="dark"] .sv-typography-card,
html[data-theme="dark"] .sv-token-preview,
html[data-theme="dark"] .sv-platform-card,
html[data-theme="dark"] .sv-provider-card,
html[data-theme="dark"] .sv-stat-card,
html[data-theme="dark"] .sv-danger-row,
html[data-theme="dark"] .sv-account-card,
html[data-theme="dark"] .sv-chip-btn,
html[data-theme="dark"] .sv-flag-card,
html[data-theme="dark"] .sv-insight-card,
html[data-theme="dark"] .sv-static-card,
html[data-theme="dark"] .sv-placeholder-card,
html[data-theme="dark"] .sv-shortcut-card,
html[data-theme="dark"] .sv-shortcut-card__header,
html[data-theme="dark"] .sv-shortcut-item {
  background: var(--bg-elevated);
  border-color: var(--border);
  color: var(--text-primary);
}

html.theme-dark .sv-typography-card.selected,
html[data-theme="dark"] .sv-typography-card.selected {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
}

html.theme-dark .sv-tab-title,
html.theme-dark .sv-section-title,
html.theme-dark .sv-row-label,
html.theme-dark .sv-toggle-label,
html.theme-dark .sv-platform-label,
html.theme-dark .sv-provider-name,
html.theme-dark .sv-header-title,
html[data-theme="dark"] .sv-tab-title,
html[data-theme="dark"] .sv-section-title,
html[data-theme="dark"] .sv-row-label,
html[data-theme="dark"] .sv-toggle-label,
html[data-theme="dark"] .sv-platform-label,
html[data-theme="dark"] .sv-provider-name,
html[data-theme="dark"] .sv-header-title {
  color: var(--text-primary);
}

html.theme-dark .sv-row-desc,
html.theme-dark .sv-toggle-desc,
html.theme-dark .sv-tab-desc,
html.theme-dark .sv-platform-desc,
html.theme-dark .sv-provider-desc,
html.theme-dark .sv-credit-desc,
html.theme-dark .sv-license-desc,
html[data-theme="dark"] .sv-row-desc,
html[data-theme="dark"] .sv-toggle-desc,
html[data-theme="dark"] .sv-tab-desc,
html[data-theme="dark"] .sv-platform-desc,
html[data-theme="dark"] .sv-provider-desc,
html[data-theme="dark"] .sv-credit-desc,
html[data-theme="dark"] .sv-license-desc {
  color: var(--text-secondary);
}

html.theme-dark .sv-input,
html.theme-dark .sv-select,
html.theme-dark .sv-textarea,
html[data-theme="dark"] .sv-input,
html[data-theme="dark"] .sv-select,
html[data-theme="dark"] .sv-textarea {
  background: var(--bg-input);
  border-color: var(--border);
  color: var(--text-primary);
}

</style>
