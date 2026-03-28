import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { z } from 'zod'
import { logger } from '@/services/error'

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
  typewriterMode: z.boolean().default(false),
  smartPunctuation: z.boolean().default(true),
  wordWrap: z.boolean().default(true),
  tabSize: z.number().min(2).max(8).default(4),
  showLineNumbers: z.boolean().default(false),
  highlightActiveLine: z.boolean().default(true),
  bracketMatching: z.boolean().default(true),
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

const ShortcutSchema = z.record(z.string(), z.string())

const SettingsSchema = z.object({
  appearance: AppearanceSchema,
  editor: EditorSchema,
  export: ExportSchema,
  ai: AISchema,
  data: DataSchema,
  shortcuts: ShortcutSchema,
})

export type Settings = z.infer<typeof SettingsSchema>
export type AppearanceSettings = z.infer<typeof AppearanceSchema>
export type TypographySettings = z.infer<typeof TypographySchema>
export type EditorSettings = z.infer<typeof EditorSchema>
export type ExportSettings = z.infer<typeof ExportSchema>
export type AISettings = z.infer<typeof AISchema>

const STORAGE_KEY = 'inkforge-settings'

/** 构造完整的默认设置对象（利用各子 Schema 的字段默认值） */
function getDefaultSettings(): Settings {
  return {
    appearance: AppearanceSchema.parse({}),
    editor: EditorSchema.parse({}),
    export: ExportSchema.parse({}),
    ai: AISchema.parse({}),
    data: DataSchema.parse({}),
    shortcuts: {
      'save': 'Ctrl+S',
      'bold': 'Ctrl+B',
      'italic': 'Ctrl+I',
      'undo': 'Ctrl+Z',
      'redo': 'Ctrl+Shift+Z',
      'outline': 'Ctrl+Shift+O',
      'focusMode': 'F11',
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
        // 使用 safeParse 合并用户数据与默认值，容忍部分字段缺失
        const result = SettingsSchema.safeParse({
          ...getDefaultSettings(),
          ...parsed,
          appearance: {
            ...getDefaultSettings().appearance,
            ...parsed.appearance,
            typography: { ...getDefaultSettings().appearance.typography, ...parsed.appearance?.typography },
          },
          editor: { ...getDefaultSettings().editor, ...parsed.editor },
          export: { ...getDefaultSettings().export, ...parsed.export },
          ai: { ...getDefaultSettings().ai, ...parsed.ai },
          data: { ...getDefaultSettings().data, ...parsed.data },
          shortcuts: { ...getDefaultSettings().shortcuts, ...parsed.shortcuts },
        })
        if (result.success) {
          settings.value = result.data
        } else {
          logger.warn('设置数据校验失败，使用默认值', { zodErrors: result.error.issues.map(i => i.message) })
          settings.value = getDefaultSettings()
        }
      }
      isLoaded.value = true
    } catch (e) {
      logger.error('加载设置失败', e instanceof Error ? e : new Error(String(e)))
      settings.value = getDefaultSettings()
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
      const result = SettingsSchema.safeParse(parsed)
      if (result.success) {
        settings.value = result.data
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
