import type { FontFamily } from '@/constants'
import type { AppearanceSettings, TypographySettings } from '@/stores/settings'

export type ResolvedTheme = 'light' | 'dark'
export type TypographyPresetId = 'compact' | 'standard' | 'relaxed'
export type TypographyPresetMatch = TypographyPresetId | 'custom'

export interface TypographyPreset {
  id: TypographyPresetId
  label: string
  description: string
  typography: TypographySettings
}

export interface FontStackProfile {
  id: FontFamily
  label: string
  css: string
  cjk: string
  latin: string
  mono: string
}

export interface VisualSystemDiagnostics {
  version: string
  themeMode: AppearanceSettings['theme']
  resolvedTheme: ResolvedTheme
  activeFont: FontStackProfile
  typographyPresetId: TypographyPresetMatch
  typographyPresetLabel: string
  tokenCount: number
  brandFrozen: boolean
  brandTokenNames: readonly string[]
  hasRealCssTokenPipeline: boolean
  pendingCapabilities: readonly string[]
}

export interface VisualSystemSnapshot {
  resolvedTheme: ResolvedTheme
  tokens: Record<string, string>
  diagnostics: VisualSystemDiagnostics
}
