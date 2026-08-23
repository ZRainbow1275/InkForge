import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { z } from 'zod'
import {
  ambientSoundLabels,
  ambientSoundService,
  type AmbientSoundType,
} from '@/services/writing-assist/ambient-sound'
export type { AmbientSoundType } from '@/services/writing-assist/ambient-sound'
import {
  appendWordCountSample,
  computeGoalPercent,
  computeStreak,
  computeWpm,
  estimateMinutesToGoal,
  formatPomodoroTime,
  isGoalMetToday,
  type WordCountSample,
} from '@/services/writing-assist/stats'

const MAX_ACTIVE_SOUNDS = 2
const MAX_POMODORO_HISTORY = 50

const STORAGE_KEY = 'inkforge-writing-assist'

export interface FocusModeState {
  isActive: boolean
  startedAt: string | null
  startWordCount: number
  goalProgressBefore: number
}

export interface VignetteConfig {
  isEnabled: boolean
  height: number
  intensity: number
}

export type PomodoroPhase = 'idle' | 'running' | 'paused' | 'break' | 'long_break'

type ResumablePomodoroPhase = Exclude<PomodoroPhase, 'idle' | 'paused'>

export interface PomodoroConfig {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakAfter: number
  autoStartBreaks: boolean
  notificationEnabled: boolean
}

export interface PomodoroState {
  phase: PomodoroPhase
  remainingSeconds: number
  completedPomodoros: number
  config: PomodoroConfig
  pausedFromPhase: ResumablePomodoroPhase | null
}

export interface AmbientSoundState {
  activeSounds: AmbientSoundType[]
  currentSound: AmbientSoundType | null
  volume: number
  isPlaying: boolean
  error: string | null
}

export interface PomodoroSession {
  startedAt: string
  endedAt: string
  phase: PomodoroPhase
  wordsAdded: number
}

export interface GoalStreak {
  currentDays: number
  longestDays: number
  lastDate: string
}

export interface WritingStats {
  currentDocWords: number
  todayAddedWords: number
  weeklyWords: number
  wpm: number
  estimatedMinutesToGoal: number | null
  sessionSeconds: number
}

export interface FocusSessionSummary {
  durationSeconds: number
  wordsAdded: number
  goalProgressBefore: number
  goalProgressAfter: number
  dailyGoalAchieved: boolean
  endedAt: string
}

const PomodoroConfigSchema = z.object({
  workMinutes: z.number().int().min(1).max(120).default(25),
  shortBreakMinutes: z.number().int().min(1).max(60).default(5),
  longBreakMinutes: z.number().int().min(1).max(120).default(15),
  longBreakAfter: z.number().int().min(1).max(12).default(4),
  autoStartBreaks: z.boolean().default(true),
  notificationEnabled: z.boolean().default(true),
})

const VignetteSchema = z.object({
  isEnabled: z.boolean().default(false),
  height: z.number().int().min(40).max(200).default(80),
  intensity: z.number().min(0.08).max(0.32).default(0.18),
})

const AmbientSoundTypeSchema = z.enum([
  'rain',
  'cafe',
  'whitenoise',
  'nature',
  'thunderstorm',
  'keyboard',
  'fireplace',
  'birdsong',
])

const PomodoroPhaseSchema = z.enum(['idle', 'running', 'paused', 'break', 'long_break'])

const PomodoroSessionSchema = z.object({
  startedAt: z.string(),
  endedAt: z.string(),
  phase: PomodoroPhaseSchema,
  wordsAdded: z.number().int().min(0).default(0),
})

const GoalStreakSchema = z.object({
  currentDays: z.number().int().min(0).default(0),
  longestDays: z.number().int().min(0).default(0),
  lastDate: z.string().default(''),
})

const PersistedWritingAssistSchema = z.object({
  vignette: VignetteSchema.default({ isEnabled: false, height: 80, intensity: 0.18 }),
  pomodoroConfig: PomodoroConfigSchema.default({
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakAfter: 4,
    autoStartBreaks: true,
    notificationEnabled: true,
  }),
  ambientVolume: z.number().min(0).max(1).default(0.5),
  activeSounds: z.array(AmbientSoundTypeSchema).max(MAX_ACTIVE_SOUNDS).default([]),
  pomodoroHistory: z.array(PomodoroSessionSchema).default([]),
  goalStreak: GoalStreakSchema.default({ currentDays: 0, longestDays: 0, lastDate: '' }),
  cursorPosition: z.number().min(0.3).max(0.7).default(0.5),
})

const CURSOR_POSITION_MIN = 0.3
const CURSOR_POSITION_MAX = 0.7
const CURSOR_POSITION_DEFAULT = 0.5
const VIGNETTE_INTENSITY_MIN = 0.08
const VIGNETTE_INTENSITY_MAX = 0.32
const VIGNETTE_INTENSITY_DEFAULT = 0.18

function clampCursorPosition(value: number): number {
  if (!Number.isFinite(value)) {
    return CURSOR_POSITION_DEFAULT
  }
  return Math.max(CURSOR_POSITION_MIN, Math.min(CURSOR_POSITION_MAX, value))
}

function clampVignetteIntensity(value: number): number {
  if (!Number.isFinite(value)) {
    return VIGNETTE_INTENSITY_DEFAULT
  }
  return Math.max(VIGNETTE_INTENSITY_MIN, Math.min(VIGNETTE_INTENSITY_MAX, value))
}

type PersistedWritingAssist = z.infer<typeof PersistedWritingAssistSchema>

function readPersistedWritingAssist(): PersistedWritingAssist {
  if (typeof localStorage === 'undefined') {
    return PersistedWritingAssistSchema.parse({})
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return PersistedWritingAssistSchema.parse(raw ? JSON.parse(raw) : {})
  } catch {
    return PersistedWritingAssistSchema.parse({})
  }
}

function writePersistedWritingAssist(value: PersistedWritingAssist): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function secondsFromMinutes(minutes: number): number {
  return Math.max(60, Math.trunc(minutes) * 60)
}

function isRunningPhase(phase: PomodoroPhase): phase is ResumablePomodoroPhase {
  return phase === 'running' || phase === 'break' || phase === 'long_break'
}

function makeInitialPomodoroState(config: PomodoroConfig): PomodoroState {
  return {
    phase: 'idle',
    remainingSeconds: secondsFromMinutes(config.workMinutes),
    completedPomodoros: 0,
    config,
    pausedFromPhase: null,
  }
}

export const useWritingAssistStore = defineStore('writingAssist', () => {
  const persisted = readPersistedWritingAssist()
  const focusMode = ref<FocusModeState>({
    isActive: false,
    startedAt: null,
    startWordCount: 0,
    goalProgressBefore: 0,
  })
  const vignette = ref<VignetteConfig>(persisted.vignette)
  const pomodoroState = ref<PomodoroState>(makeInitialPomodoroState(persisted.pomodoroConfig))
  const ambientSound = ref<AmbientSoundState>({
    activeSounds: [...persisted.activeSounds],
    currentSound: persisted.activeSounds[0] ?? null,
    volume: persisted.ambientVolume,
    isPlaying: false,
    error: null,
  })
  const stats = ref<WritingStats>({
    currentDocWords: 0,
    todayAddedWords: 0,
    weeklyWords: 0,
    wpm: 0,
    estimatedMinutesToGoal: null,
    sessionSeconds: 0,
  })
  const lastSummary = ref<FocusSessionSummary | null>(null)
  const wordCountHistory = ref<WordCountSample[]>([])
  const pomodoroHistory = ref<PomodoroSession[]>([...persisted.pomodoroHistory])
  const goalStreak = ref<GoalStreak>({ ...persisted.goalStreak })
  const cursorPosition = ref<number>(clampCursorPosition(persisted.cursorPosition))

  let pomodoroTimer: ReturnType<typeof setInterval> | null = null
  let focusSessionTimer: ReturnType<typeof setInterval> | null = null

  const pomodoroTimeDisplay = computed(() => formatPomodoroTime(pomodoroState.value.remainingSeconds))
  const documentGoalPercent = computed(() => computeGoalPercent(stats.value.currentDocWords, undefined))
  const isPomodoroActive = computed(() => isRunningPhase(pomodoroState.value.phase))
  const currentSound = computed<AmbientSoundType | null>(() => ambientSound.value.activeSounds[0] ?? null)
  const ambientSoundName = computed(() => {
    const sounds = ambientSound.value.activeSounds
    if (sounds.length === 0) {
      return 'None'
    }
    return sounds.map(sound => ambientSoundLabels[sound]).join(' + ')
  })

  function persistSettings(): void {
    writePersistedWritingAssist({
      vignette: vignette.value,
      pomodoroConfig: pomodoroState.value.config,
      ambientVolume: ambientSound.value.volume,
      activeSounds: [...ambientSound.value.activeSounds],
      pomodoroHistory: pomodoroHistory.value.slice(-MAX_POMODORO_HISTORY),
      goalStreak: { ...goalStreak.value },
      cursorPosition: cursorPosition.value,
    })
  }

  function startFocusSessionTicker(): void {
    if (focusSessionTimer) {
      return
    }

    focusSessionTimer = setInterval(() => {
      if (!focusMode.value.startedAt) {
        return
      }

      const startedAt = new Date(focusMode.value.startedAt).getTime()
      stats.value.sessionSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
  }

  function stopFocusSessionTicker(): void {
    if (focusSessionTimer) {
      clearInterval(focusSessionTimer)
      focusSessionTimer = null
    }
  }

  function enterFocusMode(startWordCount: number, goalProgressBefore: number): void {
    focusMode.value = {
      isActive: true,
      startedAt: new Date().toISOString(),
      startWordCount,
      goalProgressBefore,
    }
    stats.value.sessionSeconds = 0
    lastSummary.value = null
    startFocusSessionTicker()
  }

  function exitFocusMode(currentWordCount: number, goalProgressAfter: number, dailyGoalAchieved: boolean): FocusSessionSummary | null {
    if (!focusMode.value.isActive || !focusMode.value.startedAt) {
      focusMode.value.isActive = false
      stopFocusSessionTicker()
      return null
    }

    const startedAt = new Date(focusMode.value.startedAt).getTime()
    const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
    const summary: FocusSessionSummary = {
      durationSeconds,
      wordsAdded: currentWordCount - focusMode.value.startWordCount,
      goalProgressBefore: focusMode.value.goalProgressBefore,
      goalProgressAfter,
      dailyGoalAchieved,
      endedAt: new Date().toISOString(),
    }

    lastSummary.value = summary
    focusMode.value = {
      isActive: false,
      startedAt: null,
      startWordCount: 0,
      goalProgressBefore: 0,
    }
    stats.value.sessionSeconds = durationSeconds
    stopFocusSessionTicker()
    return summary
  }

  function dismissSummary(): void {
    lastSummary.value = null
  }

  function setVignetteEnabled(isEnabled: boolean): void {
    vignette.value = {
      ...vignette.value,
      isEnabled,
      intensity: clampVignetteIntensity(vignette.value.intensity),
    }
    persistSettings()
  }

  function setVignetteHeight(height: number): void {
    vignette.value = {
      ...vignette.value,
      height: Math.max(40, Math.min(200, Math.trunc(height))),
      intensity: clampVignetteIntensity(vignette.value.intensity),
    }
    persistSettings()
  }

  function setVignetteIntensity(intensity: number): void {
    vignette.value = {
      ...vignette.value,
      intensity: clampVignetteIntensity(intensity),
    }
    persistSettings()
  }

  function setCursorPosition(value: number): void {
    cursorPosition.value = clampCursorPosition(value)
    persistSettings()
  }

  function updateStats(input: {
    currentDocWords: number
    todayWords: number
    weeklyWords: number
    documentTarget?: number
  }): void {
    wordCountHistory.value = appendWordCountSample(wordCountHistory.value, input.currentDocWords)
    const wpm = computeWpm(wordCountHistory.value)
    stats.value = {
      ...stats.value,
      currentDocWords: input.currentDocWords,
      todayAddedWords: input.todayWords,
      weeklyWords: input.weeklyWords,
      wpm,
      estimatedMinutesToGoal: estimateMinutesToGoal(input.currentDocWords, input.documentTarget, wpm),
    }
  }

  function ensurePomodoroTimer(): void {
    if (pomodoroTimer) {
      return
    }

    pomodoroTimer = setInterval(() => {
      tickPomodoro()
    }, 1000)
  }

  function stopPomodoroTimerIfInactive(): void {
    if (!pomodoroTimer || isRunningPhase(pomodoroState.value.phase)) {
      return
    }

    clearInterval(pomodoroTimer)
    pomodoroTimer = null
  }

  function completeWorkPhase(): void {
    const completedPomodoros = pomodoroState.value.completedPomodoros + 1
    const shouldLongBreak = completedPomodoros % pomodoroState.value.config.longBreakAfter === 0
    const nextPhase: ResumablePomodoroPhase = shouldLongBreak ? 'long_break' : 'break'
    const nextSeconds = secondsFromMinutes(
      shouldLongBreak
        ? pomodoroState.value.config.longBreakMinutes
        : pomodoroState.value.config.shortBreakMinutes,
    )

    pomodoroState.value = {
      ...pomodoroState.value,
      phase: pomodoroState.value.config.autoStartBreaks ? nextPhase : 'paused',
      remainingSeconds: nextSeconds,
      completedPomodoros,
      pausedFromPhase: pomodoroState.value.config.autoStartBreaks ? null : nextPhase,
    }
  }

  function completeBreakPhase(): void {
    pomodoroState.value = {
      ...pomodoroState.value,
      phase: 'running',
      remainingSeconds: secondsFromMinutes(pomodoroState.value.config.workMinutes),
      pausedFromPhase: null,
    }
  }

  function tickPomodoro(): void {
    if (!isRunningPhase(pomodoroState.value.phase)) {
      stopPomodoroTimerIfInactive()
      return
    }

    if (pomodoroState.value.remainingSeconds > 0) {
      pomodoroState.value = {
        ...pomodoroState.value,
        remainingSeconds: pomodoroState.value.remainingSeconds - 1,
      }
      return
    }

    if (pomodoroState.value.phase === 'running') {
      completeWorkPhase()
    } else {
      completeBreakPhase()
    }
    stopPomodoroTimerIfInactive()
  }

  function startPomodoro(): void {
    if (pomodoroState.value.phase === 'idle') {
      pomodoroState.value = {
        ...pomodoroState.value,
        phase: 'running',
        remainingSeconds: secondsFromMinutes(pomodoroState.value.config.workMinutes),
        pausedFromPhase: null,
      }
    } else if (pomodoroState.value.phase === 'paused') {
      pomodoroState.value = {
        ...pomodoroState.value,
        phase: pomodoroState.value.pausedFromPhase ?? 'running',
        pausedFromPhase: null,
      }
    }

    ensurePomodoroTimer()
  }

  function pausePomodoro(): void {
    if (!isRunningPhase(pomodoroState.value.phase)) {
      return
    }

    pomodoroState.value = {
      ...pomodoroState.value,
      phase: 'paused',
      pausedFromPhase: pomodoroState.value.phase,
    }
    stopPomodoroTimerIfInactive()
  }

  function resetPomodoro(): void {
    pomodoroState.value = makeInitialPomodoroState(pomodoroState.value.config)
    stopPomodoroTimerIfInactive()
  }

  function skipToNextPhase(): void {
    if (pomodoroState.value.phase === 'running') {
      completeWorkPhase()
    } else if (pomodoroState.value.phase === 'break' || pomodoroState.value.phase === 'long_break') {
      completeBreakPhase()
    }
    stopPomodoroTimerIfInactive()
  }

  function updatePomodoroConfig(config: Partial<PomodoroConfig>): void {
    const nextConfig = PomodoroConfigSchema.parse({
      ...pomodoroState.value.config,
      ...config,
    })
    pomodoroState.value = makeInitialPomodoroState(nextConfig)
    persistSettings()
    stopPomodoroTimerIfInactive()
  }

  async function playSound(type: AmbientSoundType): Promise<void> {
    if (ambientSound.value.activeSounds.includes(type)) {
      return
    }
    const next = [...ambientSound.value.activeSounds, type]
    const trimmed = next.length > MAX_ACTIVE_SOUNDS ? next.slice(next.length - MAX_ACTIVE_SOUNDS) : next
    const removed = next.length > MAX_ACTIVE_SOUNDS ? next.slice(0, next.length - MAX_ACTIVE_SOUNDS) : []

    try {
      for (const removeType of removed) {
        await ambientSoundService.stopType(removeType)
      }
      await ambientSoundService.play(type, ambientSound.value.volume)
      ambientSound.value = {
        ...ambientSound.value,
        activeSounds: trimmed,
        currentSound: trimmed[0] ?? null,
        isPlaying: trimmed.length > 0,
        error: null,
      }
      persistSettings()
    } catch (error) {
      ambientSound.value = {
        ...ambientSound.value,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async function stopSound(type?: AmbientSoundType): Promise<void> {
    if (type === undefined) {
      await ambientSoundService.stop()
      ambientSound.value = {
        ...ambientSound.value,
        activeSounds: [],
        currentSound: null,
        isPlaying: false,
        error: null,
      }
      persistSettings()
      return
    }

    if (!ambientSound.value.activeSounds.includes(type)) {
      return
    }
    await ambientSoundService.stopType(type)
    const next = ambientSound.value.activeSounds.filter(item => item !== type)
    ambientSound.value = {
      ...ambientSound.value,
      activeSounds: next,
      currentSound: next[0] ?? null,
      isPlaying: next.length > 0,
      error: null,
    }
    persistSettings()
  }

  async function toggleSound(type: AmbientSoundType): Promise<void> {
    if (ambientSound.value.activeSounds.includes(type)) {
      await stopSound(type)
      return
    }
    await playSound(type)
  }

  function recordPomodoroSession(session: PomodoroSession): void {
    const next = [...pomodoroHistory.value, session]
    pomodoroHistory.value = next.length > MAX_POMODORO_HISTORY
      ? next.slice(next.length - MAX_POMODORO_HISTORY)
      : next
    persistSettings()
  }

  function bumpGoalStreak(dailyTarget: number | undefined, todayWords?: number): GoalStreak {
    const wordCount = todayWords ?? stats.value.todayAddedWords
    const met = isGoalMetToday(wordCount, dailyTarget)
    const next = computeStreak(met, goalStreak.value)
    goalStreak.value = next
    persistSettings()
    return next
  }

  function setVolume(volume: number): void {
    const nextVolume = Math.max(0, Math.min(1, volume))
    ambientSound.value = {
      ...ambientSound.value,
      volume: nextVolume,
    }
    ambientSoundService.setVolume(nextVolume)
    persistSettings()
  }

  async function cleanup(): Promise<void> {
    stopFocusSessionTicker()
    if (pomodoroTimer) {
      clearInterval(pomodoroTimer)
      pomodoroTimer = null
    }
    await stopSound()
  }

  return {
    focusMode,
    vignette,
    pomodoroState,
    ambientSound,
    stats,
    lastSummary,
    pomodoroHistory,
    goalStreak,
    wordCountHistory,
    cursorPosition,
    pomodoroTimeDisplay,
    documentGoalPercent,
    isPomodoroActive,
    currentSound,
    ambientSoundName,
    enterFocusMode,
    exitFocusMode,
    dismissSummary,
    setVignetteEnabled,
    setVignetteHeight,
    setVignetteIntensity,
    setCursorPosition,
    updateStats,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    skipToNextPhase,
    updatePomodoroConfig,
    tickPomodoro,
    playSound,
    stopSound,
    toggleSound,
    recordPomodoroSession,
    bumpGoalStreak,
    setVolume,
    cleanup,
  }
})
