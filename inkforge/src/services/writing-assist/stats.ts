export interface WordCountSample {
  time: number
  count: number
}

export interface GoalStreakInput {
  currentDays: number
  longestDays: number
  lastDate: string
}

const DEFAULT_WPM_MINIMUM_ELAPSED_MS = 10_000
const MAX_REASONABLE_WPM = 300

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

export function computeGoalPercent(current: number, target: number | undefined): number {
  if (!target || target < 1) {
    return 0
  }

  return clampPercent((current / target) * 100)
}

export function estimateMinutesToGoal(currentWords: number, targetWords: number | undefined, wpm: number): number | null {
  if (!targetWords || targetWords <= currentWords || wpm <= 0) {
    return null
  }

  return Math.max(1, Math.ceil((targetWords - currentWords) / wpm))
}

export function appendWordCountSample(
  samples: readonly WordCountSample[],
  count: number,
  now: number = Date.now(),
  retentionMs: number = 5 * 60_000,
): WordCountSample[] {
  const retained = samples.filter(sample => now - sample.time <= retentionMs)
  const previous = retained[retained.length - 1]

  if (previous && previous.count === count && now - previous.time < 5_000) {
    return retained
  }

  return [...retained, { time: now, count }]
}

export function computeWpm(
  samples: readonly WordCountSample[],
  now: number = Date.now(),
  windowMs: number = 60_000,
  minimumElapsedMs: number = DEFAULT_WPM_MINIMUM_ELAPSED_MS,
): number {
  const windowSamples = samples.filter(sample => now - sample.time <= windowMs)
  if (windowSamples.length < 2) {
    return 0
  }

  const first = windowSamples[0]
  const last = windowSamples[windowSamples.length - 1]
  const deltaWords = last.count - first.count
  const deltaMs = last.time - first.time
  const deltaMinutes = deltaMs / 60_000

  if (deltaWords <= 0 || deltaMs < minimumElapsedMs || deltaMinutes <= 0) {
    return 0
  }

  return Math.min(MAX_REASONABLE_WPM, Math.round(deltaWords / deltaMinutes))
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  if (hours > 0) {
    return `${hours}时 ${minutes}分 ${seconds}秒`
  }

  if (minutes > 0) {
    return `${minutes}分 ${seconds}秒`
  }

  return `${seconds}秒`
}

export function formatPomodoroTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function isGoalMetToday(todayWords: number, dailyTarget: number | undefined): boolean {
  if (!dailyTarget || dailyTarget < 1) {
    return false
  }

  return todayWords >= dailyTarget
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysBetween(a: string, b: string): number {
  const parse = (value: string): number => {
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) {
      return Number.NaN
    }
    return Date.UTC(year, month - 1, day)
  }
  const left = parse(a)
  const right = parse(b)
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return Number.NaN
  }
  return Math.round((right - left) / 86_400_000)
}

export function computeStreak(
  dailyGoalMet: boolean,
  current: GoalStreakInput,
  today: Date = new Date(),
): GoalStreakInput {
  const todayKey = formatLocalDate(today)

  if (!dailyGoalMet) {
    return { ...current }
  }

  if (current.lastDate === todayKey) {
    return { ...current }
  }

  const gap = current.lastDate ? daysBetween(current.lastDate, todayKey) : Number.NaN
  const continuing = Number.isFinite(gap) && gap === 1
  const nextCurrent = continuing ? current.currentDays + 1 : 1

  return {
    currentDays: nextCurrent,
    longestDays: Math.max(current.longestDays, nextCurrent),
    lastDate: todayKey,
  }
}
