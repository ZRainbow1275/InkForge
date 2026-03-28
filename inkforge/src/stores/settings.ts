import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { z } from 'zod'
import { logger, setLogLevel } from '@/services/error'

// ═══════════════════════════════════════
//  Settings Schema（Zod 运行时验证）
// ═══════════════════════════════════════

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

const EditorSchema = z.object({
  autoSave: z.boolean().default(true),
  autoSaveInterval: z.number().min(10).max(300).default(30),
  spellCheck: z.boolean().default(false),
  editorMode: z.enum(['typora', 'source']).default('typora'),
  editorWidth: z.enum(['narrow', 'medium', 'wide', 'full']).default('medium'),
  typewriterMode: z.boolean().default(false),
  smartPunctuation: z.boolean().default(true),
  markdownHints: z.boolean().default(true),
  wordWrap: z.boolean().default(true),
  tabSize: z.number().min(2).max(8).default(4),
  showLineNumbers: z.boolean().default(false),
  highlightActiveLine: z.boolean().default(true),
  bracketMatching: z.boolean().default(true),
  writingGoal: z.object({
    enabled: z.boolean().default(true),
    targetWords: z.number().min(100).max(50000).default(1000),
    showProgress: z.boolean().default(true),
    celebrateOnComplete: z.boolean().default(true),
  }).default({
    enabled: true,
    targetWords: 1000,
    showProgress: true,
    celebrateOnComplete: true,
  }),
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
})

const AISchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'deepseek', 'ollama', 'none']).default('openai'),
  apiKey: z.string().default(''),
  baseUrl: z.string().optional().default('https://api.siliconflow.cn/v1'),
  model: z.string().default('Qwen/Qwen3-8B'),
  maxTokens: z.number().min(100).max(8000).default(2000),
  temperature: z.number().min(0).max(2).default(0.7),
  ollamaUrl: z.string().default('http://localhost:11434'),
})

const DataSchema = z.object({
  autoBackup: z.boolean().default(false),
  backupInterval: z.number().default(7),
  maxBackups: z.number().default(5),
})

const AccountSettingsSchema = z.object({
  profileId: z.string().min(1).default('local-default'),
})

const SyncTargetSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('none'),
  }),
  z.object({
    type: z.literal('webdav'),
    url: z.string().url(),
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  z.object({
    type: z.literal('s3'),
    endpoint: z.string().url(),
    accessKeyId: z.string().min(1),
    secretAccessKey: z.string().min(1),
    bucket: z.string().min(1),
    region: z.string().min(1).default('auto'),
  }),
  z.object({
    type: z.literal('rest'),
    url: z.string().url(),
    token: z.string().min(1),
  }),
])

const SyncSchema = z.object({
  enabled: z.boolean().default(false),
  target: SyncTargetSchema.default({ type: 'none' }),
  interval: z.enum(['5m', '15m', '30m', '1h', 'manual']).default('15m'),
  conflictStrategy: z.enum(['local-wins', 'remote-wins', 'manual']).default('local-wins'),
  encryptionEnabled: z.boolean().default(true),
  selectedCategoryIds: z.array(z.string()).default([]),
})

const FeatureFlagSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean().default(false),
  experimental: z.boolean().default(true),
})

const DEFAULT_FEATURE_FLAGS = [
  {
    id: 'markdown-hints',
    name: 'Markdown 语法提示',
    description: '在编辑器中显示轻量 Markdown 结构提示。',
    enabled: true,
    experimental: true,
  },
  {
    id: 'multi-tab',
    name: '多标签编辑',
    description: '允许在工作台中同时保留多个文章标签页。',
    enabled: true,
    experimental: true,
  },
  {
    id: 'ai-autocomplete',
    name: 'AI 自动补全',
    description: '预留 AI 补全能力开关，供后续联调启用。',
    enabled: false,
    experimental: true,
  },
  {
    id: 'performance-metrics',
    name: '性能指标面板',
    description: '在界面中显示更详细的渲染与同步指标。',
    enabled: false,
    experimental: true,
  },
]

const ProxySchema = z.object({
  enabled: z.boolean().default(false),
  host: z.string().default(''),
  port: z.number().min(1).max(65535).default(7890),
  username: z.string().default(''),
  password: z.string().default(''),
  protocol: z.enum(['http', 'https', 'socks5']).default('http'),
})

const AdvancedSchema = z.object({
  logLevel: z.enum(['off', 'error', 'warn', 'info', 'debug']).default('warn'),
  showPerformanceMetrics: z.boolean().default(false),
  featureFlags: z.array(FeatureFlagSchema).default(DEFAULT_FEATURE_FLAGS),
  proxy: ProxySchema.default({
    enabled: false,
    host: '',
    port: 7890,
    username: '',
    password: '',
    protocol: 'http',
  }),
})

const ShortcutSchema = z.record(z.string(), z.string())

const SettingsSchema = z.object({
  appearance: AppearanceSchema,
  editor: EditorSchema,
  export: ExportSchema,
  ai: AISchema,
  data: DataSchema,
  account: AccountSettingsSchema,
  sync: SyncSchema,
  advanced: AdvancedSchema,
  shortcuts: ShortcutSchema,
})

export type Settings = z.infer<typeof SettingsSchema>
export type AppearanceSettings = z.infer<typeof AppearanceSchema>
export type TypographySettings = z.infer<typeof TypographySchema>
export type EditorSettings = z.infer<typeof EditorSchema>
export type ExportSettings = z.infer<typeof ExportSchema>
export type AISettings = z.infer<typeof AISchema>
export type AccountSettings = z.infer<typeof AccountSettingsSchema>
export type SyncSettings = z.infer<typeof SyncSchema>
export type SyncTarget = z.infer<typeof SyncTargetSchema>
export type AdvancedSettings = z.infer<typeof AdvancedSchema>

export const DEFAULT_SHORTCUTS: Record<string, string> = {
  // 格式化
  bold: 'Ctrl+B',
  italic: 'Ctrl+I',
  underline: 'Ctrl+U',
  strikethrough: 'Ctrl+Shift+S',
  inlineCode: 'Ctrl+Shift+`',
  link: 'Ctrl+K',
  clearFormat: 'Ctrl+\\',
  highlight: 'Ctrl+Shift+H',
  // 标题
  heading1: 'Ctrl+1',
  heading2: 'Ctrl+2',
  heading3: 'Ctrl+3',
  heading4: 'Ctrl+4',
  paragraph: 'Ctrl+0',
  // 块级
  blockquote: 'Ctrl+Shift+Q',
  codeBlock: 'Ctrl+Shift+K',
  orderedList: 'Ctrl+Shift+[',
  bulletList: 'Ctrl+Shift+]',
  taskList: 'Ctrl+Shift+X',
  table: 'Ctrl+T',
  horizontalRule: 'Ctrl+Enter',
  // 编辑
  save: 'Ctrl+S',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Shift+Z',
  findReplace: 'Ctrl+H',
  find: 'Ctrl+F',
  selectAll: 'Ctrl+A',
  // 视图
  toggleSidebar: 'Ctrl+Shift+E',
  togglePreview: 'Ctrl+Shift+P',
  toggleOutline: 'Ctrl+Shift+O',
  focusMode: 'F11',
  typewriterMode: 'F9',
  switchEditorMode: 'Ctrl+\\',
  zoomIn: 'Ctrl+=',
}

const STORAGE_KEY = 'inkforge-settings'

/** 构造完整的默认设置对象（利用各子 Schema 的字段默认值） */
export function getDefaultSettings(): Settings {
  return {
    appearance: AppearanceSchema.parse({}),
    editor: EditorSchema.parse({}),
    export: ExportSchema.parse({}),
    ai: AISchema.parse({}),
    data: DataSchema.parse({}),
    account: AccountSettingsSchema.parse({}),
    sync: SyncSchema.parse({}),
    advanced: {
      ...AdvancedSchema.parse({}),
      featureFlags: DEFAULT_FEATURE_FLAGS.map((flag) => ({ ...flag })),
    },
    shortcuts: {
      ...DEFAULT_SHORTCUTS,
    },
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function buildSettingsCandidate(raw: unknown): unknown {
  const defaults = getDefaultSettings()
  const source = asObject(raw)
  const appearance = asObject(source.appearance)
  const typography = asObject(appearance.typography)
  const editor = asObject(source.editor)
  const legacyEditorMode = editor.editorMode === 'split' ? 'source' : editor.editorMode
  const writingGoal = asObject(editor.writingGoal)
  const exportSettings = asObject(source.export)
  const ai = asObject(source.ai)
  const data = asObject(source.data)
  const account = asObject(source.account)
  const sync = asObject(source.sync)
  const syncTarget = asObject(sync.target)
  const advanced = asObject(source.advanced)
  const proxy = asObject(advanced.proxy)
  const shortcutEntries = Object.entries(asObject(source.shortcuts))
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  const normalizedShortcutEntries = shortcutEntries.map(([key, value]) => {
    if (key === 'outline') {
      return ['toggleOutline', value] as const
    }
    if (key === 'preview') {
      return ['togglePreview', value] as const
    }
    return [key, value] as const
  })

  return {
    ...defaults,
    ...source,
    appearance: {
      ...defaults.appearance,
      ...appearance,
      typography: {
        ...defaults.appearance.typography,
        ...typography,
      },
    },
    editor: {
      ...defaults.editor,
      ...editor,
      editorMode: legacyEditorMode,
      writingGoal: {
        ...defaults.editor.writingGoal,
        ...writingGoal,
      },
    },
    export: {
      ...defaults.export,
      ...exportSettings,
    },
    ai: {
      ...defaults.ai,
      ...ai,
    },
    data: {
      ...defaults.data,
      ...data,
    },
    account: {
      ...defaults.account,
      ...account,
    },
    sync: {
      ...defaults.sync,
      ...sync,
      target: typeof syncTarget.type === 'string' ? syncTarget : defaults.sync.target,
    },
    advanced: {
      ...defaults.advanced,
      ...advanced,
      proxy: {
        ...defaults.advanced.proxy,
        ...proxy,
      },
      featureFlags: Array.isArray(advanced.featureFlags)
        ? advanced.featureFlags
        : defaults.advanced.featureFlags.map((flag) => ({ ...flag })),
    },
    shortcuts: {
      ...DEFAULT_SHORTCUTS,
      ...Object.fromEntries(normalizedShortcutEntries),
    },
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(getDefaultSettings())
  const isLoaded = ref(false)

  // ─── 加载 ───
  function load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const result = SettingsSchema.safeParse(buildSettingsCandidate(parsed))
        if (result.success) {
          settings.value = result.data
        } else {
          logger.warn('设置数据校验失败，使用默认值', { zodErrors: result.error.issues.map(i => i.message) })
          settings.value = getDefaultSettings()
        }
      }
      setLogLevel(settings.value.advanced.logLevel)
      isLoaded.value = true
    } catch (e) {
      logger.error('加载设置失败', e instanceof Error ? e : new Error(String(e)))
      settings.value = getDefaultSettings()
      setLogLevel(settings.value.advanced.logLevel)
      isLoaded.value = true
    }
  }

  // ─── 保存 ───
  function save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    } catch (e) {
      logger.error('保存设置失败', e instanceof Error ? e : new Error(String(e)))
    }
  }

  // ─── 重置 ───
  function reset(): void {
    settings.value = getDefaultSettings()
    setLogLevel(settings.value.advanced.logLevel)
    save()
  }

  // ─── 导出 ───
  function exportSettings(): string {
    return JSON.stringify(settings.value, null, 2)
  }

  // ─── 导入 ───
  function importSettings(json: string): boolean {
    try {
      const parsed = JSON.parse(json)
      const result = SettingsSchema.safeParse(buildSettingsCandidate(parsed))
      if (result.success) {
        settings.value = result.data
        setLogLevel(settings.value.advanced.logLevel)
        save()
        return true
      }
      logger.warn('导入设置校验失败', { zodErrors: result.error.issues.map(i => i.message) })
      return false
    } catch (e) {
      logger.error('导入设置失败', e instanceof Error ? e : new Error(String(e)))
      return false
    }
  }

  // ─── 自动持久化（5秒 debounce，避免频繁写 localStorage） ───
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  function debouncedSave(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      save()
      saveTimer = null
    }, 5000)
  }
  watch(settings, debouncedSave, { deep: true })
  watch(() => settings.value.advanced.logLevel, (level) => {
    setLogLevel(level)
  }, { immediate: true })

  // 初始加载
  load()

  return {
    settings,
    isLoaded,
    load,
    save,
    reset,
    exportSettings,
    importSettings,
  }
})
