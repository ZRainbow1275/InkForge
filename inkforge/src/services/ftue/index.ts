import { db } from '@/utils/db'
import {
  FTUE_STATE_ID,
  HELP_KEY_VALUES,
  ONBOARDING_PATH_VALUES,
  type FTUEState,
  type FTUEStep,
  type FtueRecord,
  type FtueStateRecord,
  type HelpKey,
  type HelpSeenRecord,
  type OnboardingPath,
} from './types'

export const DEFAULT_FTUE_STATE: Readonly<FTUEState> = Object.freeze({
  step: 'not_started',
  startedAt: null,
  completedAt: null,
  onboardingPath: null,
})

const HELP_KEY_SET = new Set<HelpKey>(HELP_KEY_VALUES)
const ONBOARDING_PATH_SET = new Set<OnboardingPath>(ONBOARDING_PATH_VALUES)

function now(): number {
  return Date.now()
}

function isStateRecord(record: FtueRecord | undefined): record is FtueStateRecord {
  return record?.kind === 'state' && record.id === FTUE_STATE_ID
}

function isHelpSeenRecord(record: FtueRecord): record is HelpSeenRecord {
  return record.kind === 'help' && HELP_KEY_SET.has(record.helpKey)
}

function createStateRecord(state: FTUEState, updatedAt: number = now()): FtueStateRecord {
  return {
    id: FTUE_STATE_ID,
    kind: 'state',
    step: state.step,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    onboardingPath: state.onboardingPath,
    updatedAt,
  }
}

async function writeState(nextState: FTUEState): Promise<FTUEState> {
  const record = createStateRecord(nextState)
  await db.ftue.put(record)
  return {
    step: record.step,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    onboardingPath: record.onboardingPath,
  }
}

export async function loadFTUEState(): Promise<FTUEState> {
  const record = await db.ftue.get(FTUE_STATE_ID)
  if (!isStateRecord(record)) {
    return { ...DEFAULT_FTUE_STATE }
  }

  return {
    step: record.step,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    onboardingPath: record.onboardingPath,
  }
}

export async function saveFTUEState(state: FTUEState): Promise<FTUEState> {
  return writeState(state)
}

export async function markWelcomeShown(): Promise<FTUEState> {
  const current = await loadFTUEState()
  const timestamp = current.startedAt ?? now()

  return writeState({
    step: 'welcome_shown',
    startedAt: timestamp,
    completedAt: null,
    onboardingPath: null,
  })
}

export async function completeFTUE(onboardingPath: OnboardingPath): Promise<FTUEState> {
  if (!ONBOARDING_PATH_SET.has(onboardingPath)) {
    throw new Error(`Unsupported onboarding path: ${onboardingPath}`)
  }

  const current = await loadFTUEState()
  const timestamp = now()

  return writeState({
    step: 'completed',
    startedAt: current.startedAt ?? timestamp,
    completedAt: timestamp,
    onboardingPath,
  })
}

export async function skipFTUE(): Promise<FTUEState> {
  const current = await loadFTUEState()
  const timestamp = now()

  return writeState({
    step: 'skipped',
    startedAt: current.startedAt ?? timestamp,
    completedAt: timestamp,
    onboardingPath: null,
  })
}

export async function resetFTUE(): Promise<FTUEState> {
  await db.ftue.clear()
  return writeState({ ...DEFAULT_FTUE_STATE })
}

export async function loadSeenHelpKeys(): Promise<HelpKey[]> {
  const records = await db.ftue.where('kind').equals('help').toArray()
  return records.filter(isHelpSeenRecord).map(record => record.helpKey)
}

export async function markHelpSeen(helpKey: HelpKey): Promise<HelpKey[]> {
  if (!HELP_KEY_SET.has(helpKey)) {
    throw new Error(`Unsupported help key: ${helpKey}`)
  }

  const timestamp = now()
  const record: HelpSeenRecord = {
    id: `help:${helpKey}`,
    kind: 'help',
    helpKey,
    seenAt: timestamp,
    updatedAt: timestamp,
  }

  await db.ftue.put(record)
  return loadSeenHelpKeys()
}

export function shouldShowWelcome(step: FTUEStep): boolean {
  return step === 'not_started' || step === 'welcome_shown'
}