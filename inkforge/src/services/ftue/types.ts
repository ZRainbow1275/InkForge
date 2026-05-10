export const FTUE_STATE_ID = 'state'

export const FTUE_STEP_VALUES = [
  'not_started',
  'welcome_shown',
  'account_setup',
  'completed',
  'skipped',
] as const

export const ONBOARDING_PATH_VALUES = ['create', 'import'] as const

export const HELP_KEY_VALUES = [
  'hub-welcome',
  'workstation-modes',
  'markdown-cheatsheet',
  'keyboard-shortcuts',
  'export-preflight',
  'settings-reset',
] as const

export const HELP_CENTER_TAB_VALUES = ['markdown', 'shortcuts', 'topics', 'search'] as const

export type FTUEStep = typeof FTUE_STEP_VALUES[number]
export type OnboardingPath = typeof ONBOARDING_PATH_VALUES[number]
export type HelpKey = typeof HELP_KEY_VALUES[number]
export type HelpCenterTab = typeof HELP_CENTER_TAB_VALUES[number]

export interface FTUEState {
  step: FTUEStep
  startedAt: number | null
  completedAt: number | null
  onboardingPath: OnboardingPath | null
}

export interface FtueStateRecord extends FTUEState {
  id: typeof FTUE_STATE_ID
  kind: 'state'
  updatedAt: number
}

export interface HelpSeenRecord {
  id: `help:${HelpKey}`
  kind: 'help'
  helpKey: HelpKey
  seenAt: number
  updatedAt: number
}

export type FtueRecord = FtueStateRecord | HelpSeenRecord

export interface MarkdownCheatsheetSection {
  id: string
  title: string
  summary: string
  examples: readonly {
    label: string
    markdown: string
    description: string
  }[]
}

export interface HelpTopic {
  id: HelpKey
  title: string
  summary: string
  body: readonly string[]
  tags: readonly string[]
}

export interface ShortcutHelpItem {
  id: string
  label: string
  description: string
  binding: string
}

export interface ShortcutHelpGroup {
  id: string
  label: string
  description: string
  shortcuts: ShortcutHelpItem[]
}

export interface HelpSearchResult {
  id: string
  source: 'markdown' | 'shortcut' | 'topic'
  title: string
  description: string
  binding?: string
}