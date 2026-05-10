export const CUSTOM_CSS_STYLE_ID = 'inkforge-custom-css'
export const CUSTOM_CSS_SCOPE = '.editor-content'
export const CUSTOM_CSS_MAX_LENGTH = 50_000
export const CUSTOM_CSS_MAX_RULES = 1_000
export const CUSTOM_CSS_MAX_DATA_IMAGE_BYTES = 50 * 1024
export const CUSTOM_CSS_ERROR_WINDOW_MS = 60_000
export const CUSTOM_CSS_ERROR_THRESHOLD = 3

export const CUSTOM_CSS_SUSPENDED_REASONS = [
  'sandbox-error-limit',
  'safe-mode',
  'runtime-layout',
] as const

export type CustomCssSuspendedReason = typeof CUSTOM_CSS_SUSPENDED_REASONS[number]
export type CustomCssIssueSeverity = 'error' | 'warning' | 'info'

export type CustomCssIssueCode =
  | 'css-empty'
  | 'css-too-long'
  | 'css-parse-error'
  | 'css-too-many-rules'
  | 'forbidden-import'
  | 'forbidden-remote-url'
  | 'forbidden-data-url'
  | 'forbidden-active-protocol'
  | 'forbidden-important'
  | 'forbidden-behavior'
  | 'forbidden-host-selector'
  | 'frozen-token-override'
  | 'fixed-position-warning'
  | 'contain-strict-warning'
  | 'selector-specificity-warning'
  | 'scope-rewrite'
  | 'runtime-style-missing'
  | 'runtime-layout-suspension'
  | 'safe-mode-suspension'

export interface CustomCssIssue {
  code: CustomCssIssueCode
  severity: CustomCssIssueSeverity
  message: string
  line?: number
  column?: number
  snippet?: string
}

export interface CustomCssSandboxResult {
  ok: boolean
  sourceCss: string
  css: string
  ruleCount: number
  issues: CustomCssIssue[]
  errors: CustomCssIssue[]
  warnings: CustomCssIssue[]
  frozenTokens: string[]
}

export type CustomCssErrorType = 'parse' | 'sandbox' | 'runtime' | 'safe-mode'

export interface CustomCssErrorLogEntry {
  id: string
  occurredAt: string
  type: CustomCssErrorType
  message: string
  snippet?: string
}

export interface CustomCssSettings {
  enabled: boolean
  draft: string
  published: string
  confirmedAt: string | null
  suspendedReason: CustomCssSuspendedReason | null
  lastAppliedAt: string | null
  errorLog: CustomCssErrorLogEntry[]
}

export interface CustomCssSnippet {
  id: string
  label: string
  description: string
  css: string
}
