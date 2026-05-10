import { FONT_STACKS, type FontFamily } from '@/constants'
import type { AppearanceSettings, TypographySettings } from '@/stores/settings'
import type {
  FontStackProfile,
  ResolvedTheme,
  TypographyPreset,
  TypographyPresetId,
  TypographyPresetMatch,
  VisualSystemSnapshot,
} from './types'
export type {
  FontStackProfile,
  ResolvedTheme,
  TypographyPreset,
  TypographyPresetId,
  TypographyPresetMatch,
  VisualSystemDiagnostics,
  VisualSystemSnapshot,
} from './types'

export const VISUAL_SYSTEM_VERSION = '2.1-compatible-baseline'

export const BUILT_IN_BRAND_TOKENS = [
  '--chrome-brand-red',
  '--chrome-ink-900',
  '--chrome-text-primary',
] as const

export const VISUAL_SYSTEM_PENDING_CAPABILITIES = [
  'theme-json-import-export',
  'user-font-file-import',
  'font-license-detection',
  'full-token-theme-editor',
] as const

const DEFAULT_ACCENT_COLOR = '#D32F2F'
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export const FONT_STACK_PROFILES: Record<FontFamily, FontStackProfile> = {
  sans: {
    id: 'sans',
    label: '黑体 / Sans',
    css: FONT_STACKS.sans,
    cjk: 'PingFang SC, Microsoft YaHei UI, Microsoft YaHei, sans-serif',
    latin: '-apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif',
    mono: FONT_STACKS.mono,
  },
  serif: {
    id: 'serif',
    label: '宋体 / Serif',
    css: FONT_STACKS.serif,
    cjk: 'Noto Serif SC, Source Han Serif SC, STSong, serif',
    latin: 'Georgia, Times New Roman, Times, serif',
    mono: FONT_STACKS.mono,
  },
  kai: {
    id: 'kai',
    label: '楷体 / Kai',
    css: FONT_STACKS.kai,
    cjk: 'KaiTi, STKaiti, KaiTi_GB2312, serif',
    latin: 'Georgia, Times New Roman, Times, serif',
    mono: FONT_STACKS.mono,
  },
  mono: {
    id: 'mono',
    label: '等宽 / Mono',
    css: FONT_STACKS.mono,
    cjk: 'JetBrains Mono, Fira Code, Consolas, monospace',
    latin: 'JetBrains Mono, Fira Code, Consolas, monospace',
    mono: FONT_STACKS.mono,
  },
}

export const TYPOGRAPHY_PRESETS: readonly TypographyPreset[] = [
  {
    id: 'compact',
    label: '紧凑',
    description: '适合笔记、清单与高信息密度编辑。',
    typography: {
      fontSize: 15,
      lineHeight: 1.48,
      paragraphSpacing: 8,
      paragraphIndent: false,
      letterSpacing: -0.01,
      headingStyle: 'none',
      blockquoteStyle: 'minimal',
    },
  },
  {
    id: 'standard',
    label: '标准',
    description: '保持 InkForge 默认纸张节奏。',
    typography: {
      fontSize: 16,
      lineHeight: 1.618,
      paragraphSpacing: 16,
      paragraphIndent: false,
      letterSpacing: 0,
      headingStyle: 'none',
      blockquoteStyle: 'classic',
    },
  },
  {
    id: 'relaxed',
    label: '舒展',
    description: '适合长文、深度阅读与审稿。',
    typography: {
      fontSize: 18,
      lineHeight: 1.9,
      paragraphSpacing: 24,
      paragraphIndent: true,
      letterSpacing: 0.02,
      headingStyle: 'border-left',
      blockquoteStyle: 'modern',
    },
  },
]

export function normalizeAccentColor(value: string): string {
  const normalized = value.trim()
  return HEX_COLOR_PATTERN.test(normalized)
    ? normalized.toUpperCase()
    : DEFAULT_ACCENT_COLOR
}

export function resolveThemeMode(theme: AppearanceSettings['theme'], systemPrefersDark: boolean): ResolvedTheme {
  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }

  return theme
}

export function adjustHexColor(hex: string, amount: number): string {
  const color = normalizeAccentColor(hex)
  const value = Number.parseInt(color.slice(1), 16)
  const r = Math.min(255, Math.max(0, (value >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((value >> 8) & 0x00FF) + amount))
  const b = Math.min(255, Math.max(0, (value & 0x0000FF) + amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`
}

export function hexToRgba(hex: string, alpha: number): string {
  const color = normalizeAccentColor(hex)
  const value = Number.parseInt(color.slice(1), 16)
  const r = value >> 16
  const g = (value >> 8) & 0x00FF
  const b = value & 0x0000FF
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getTypographyPresetById(presetId: TypographyPresetId): TypographyPreset {
  const preset = TYPOGRAPHY_PRESETS.find(candidate => candidate.id === presetId)
  if (!preset) {
    throw new Error(`Unknown typography preset: ${presetId}`)
  }

  return preset
}

export function resolveTypographyPresetId(typography: TypographySettings): TypographyPresetMatch {
  return TYPOGRAPHY_PRESETS.find(preset => matchesTypographyPreset(typography, preset))?.id ?? 'custom'
}

export function buildVisualSystemTokens(
  appearance: AppearanceSettings,
  systemPrefersDark = false,
): VisualSystemSnapshot {
  const accentColor = normalizeAccentColor(appearance.accentColor)
  const resolvedTheme = resolveThemeMode(appearance.theme, systemPrefersDark)
  const activeFont = FONT_STACK_PROFILES[appearance.fontFamily] ?? FONT_STACK_PROFILES.serif
  const typography = appearance.typography
  const typographyPresetId = resolveTypographyPresetId(typography)
  const typographyPresetLabel = typographyPresetId === 'custom'
    ? '自定义'
    : getTypographyPresetById(typographyPresetId).label
  const isDark = resolvedTheme === 'dark'

  const tokens: Record<string, string> = {
    '--accent-primary': accentColor,
    '--accent-primary-light': hexToRgba(accentColor, 0.1),
    '--accent-primary-dark': adjustHexColor(accentColor, -22),
    '--color-primary': accentColor,
    '--color-primary-light': hexToRgba(accentColor, 0.1),
    '--color-primary-muted': hexToRgba(accentColor, 0.18),

    '--font-body': activeFont.css,
    '--font-cjk': activeFont.cjk,
    '--font-latin': activeFont.latin,
    '--font-mono': activeFont.mono,
    '--font-size-body': `${appearance.fontSize}px`,
    '--line-height-body': String(appearance.lineHeight),

    '--typography-font-size': `${typography.fontSize}px`,
    '--typography-line-height': String(typography.lineHeight),
    '--typography-paragraph-spacing': `${typography.paragraphSpacing}px`,
    '--typography-letter-spacing': `${typography.letterSpacing}em`,
    '--typography-text-indent': typography.paragraphIndent ? '2em' : '0',
    '--typography-heading-style': typography.headingStyle,
    '--typography-blockquote-style': typography.blockquoteStyle,

    '--chrome-brand-red': '#D32F2F',
    '--chrome-brand-red-a10': 'rgba(211, 47, 47, 0.1)',
    '--chrome-brand-red-a20': 'rgba(211, 47, 47, 0.2)',
    '--chrome-ink-900': '#263238',
    '--chrome-ink-800': '#37474F',
    '--chrome-ink-700': '#455A64',
    '--chrome-ink-600': '#546E7A',
    '--chrome-ink-500': '#607D8B',
    '--chrome-ink-100': '#CFD8DC',
    '--chrome-ink-50': '#ECEFF1',
    '--chrome-ink-0': '#FFFFFF',
    '--chrome-bg-canvas': isDark ? '#11171A' : '#ECEFF1',
    '--chrome-bg-sidebar': isDark ? '#172024' : '#FFFFFF',
    '--chrome-bg-topbar': isDark ? '#172024' : '#FFFFFF',
    '--chrome-bg-statusbar': isDark ? '#11171A' : '#ECEFF1',
    '--chrome-bg-hover': isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(38, 50, 56, 0.04)',
    '--chrome-bg-active': isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(38, 50, 56, 0.08)',
    '--chrome-text-primary': isDark ? '#ECEFF1' : '#263238',
    '--chrome-text-secondary': isDark ? '#B0BEC5' : '#546E7A',
    '--chrome-border-default': isDark ? '#263238' : '#CFD8DC',

    '--paper-bg': isDark ? '#171A1C' : '#FAFAF7',
    '--paper-bg-raised': isDark ? '#1F2427' : '#FFFFFF',
    '--paper-surface-1': isDark ? '#202629' : '#F5F5F0',
    '--paper-surface-2': isDark ? '#273034' : '#EEEEE8',
    '--paper-text-primary': isDark ? '#ECEFF1' : '#263238',
    '--paper-text-secondary': isDark ? '#CFD8DC' : '#455A64',
    '--paper-text-tertiary': isDark ? '#90A4AE' : '#78909C',
    '--paper-text-syntax': isDark ? '#78909C' : '#B0BEC5',
    '--paper-heading-h1': isDark ? '#FFCDD2' : '#1A237E',
    '--paper-heading-h2': isDark ? '#F8BBD0' : '#283593',
    '--paper-heading-h3': isDark ? '#E1BEE7' : '#3949AB',
    '--paper-blockquote-bg': isDark ? '#202629' : '#F5F5F0',
    '--paper-blockquote-border': accentColor,
    '--paper-blockquote-text': isDark ? '#CFD8DC' : '#455A64',
    '--paper-link': isDark ? '#90CAF9' : '#1565C0',
    '--paper-link-hover': isDark ? '#BBDEFB' : '#0D47A1',
  }

  return {
    resolvedTheme,
    tokens,
    diagnostics: {
      version: VISUAL_SYSTEM_VERSION,
      themeMode: appearance.theme,
      resolvedTheme,
      activeFont,
      typographyPresetId,
      typographyPresetLabel,
      tokenCount: Object.keys(tokens).length,
      brandFrozen: true,
      brandTokenNames: BUILT_IN_BRAND_TOKENS,
      hasRealCssTokenPipeline: true,
      pendingCapabilities: VISUAL_SYSTEM_PENDING_CAPABILITIES,
    },
  }
}

export function syncVisualSystemRoot(root: HTMLElement, snapshot: VisualSystemSnapshot): void {
  Object.entries(snapshot.tokens).forEach(([token, value]) => {
    root.style.setProperty(token, value)
  })
}

function matchesTypographyPreset(typography: TypographySettings, preset: TypographyPreset): boolean {
  return numericEqual(typography.fontSize, preset.typography.fontSize)
    && numericEqual(typography.lineHeight, preset.typography.lineHeight)
    && numericEqual(typography.paragraphSpacing, preset.typography.paragraphSpacing)
    && numericEqual(typography.letterSpacing, preset.typography.letterSpacing)
    && typography.paragraphIndent === preset.typography.paragraphIndent
    && typography.headingStyle === preset.typography.headingStyle
    && typography.blockquoteStyle === preset.typography.blockquoteStyle
}

function numericEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.001
}
