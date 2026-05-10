import { describe, expect, it } from 'vitest'
import {
  appendWordCountSample,
  computeGoalPercent,
  computeWpm,
  estimateMinutesToGoal,
  formatPomodoroTime,
} from './stats'

describe('writing assist stats', () => {
  it('computes WPM from the most recent one-minute window', () => {
    const now = 1_000_000
    const samples = [
      { time: now - 70_000, count: 10 },
      { time: now - 60_000, count: 100 },
      { time: now, count: 145 },
    ]

    expect(computeWpm(samples, now)).toBe(45)
  })

  it('defends WPM against paste bursts and unrealistic spikes', () => {
    const now = 1_000_000

    expect(computeWpm([
      { time: now - 500, count: 0 },
      { time: now, count: 199 },
    ], now)).toBe(0)

    expect(computeWpm([
      { time: now - 60_000, count: 0 },
      { time: now, count: 1_000 },
    ], now)).toBe(300)
  })

  it('keeps word count samples bounded and avoids duplicate rapid samples', () => {
    const now = 1_000_000
    const samples = appendWordCountSample([
      { time: now - 310_000, count: 1 },
      { time: now - 4_000, count: 20 },
    ], 20, now)

    expect(samples).toEqual([{ time: now - 4_000, count: 20 }])
  })

  it('clamps goal progress and estimates remaining minutes defensively', () => {
    expect(computeGoalPercent(125, 100)).toBe(100)
    expect(computeGoalPercent(25, 100)).toBe(25)
    expect(estimateMinutesToGoal(100, 160, 30)).toBe(2)
    expect(estimateMinutesToGoal(160, 160, 30)).toBeNull()
    expect(estimateMinutesToGoal(100, 160, 0)).toBeNull()
  })

  it('formats pomodoro time with a stable tabular contract', () => {
    expect(formatPomodoroTime(0)).toBe('00:00')
    expect(formatPomodoroTime(65)).toBe('01:05')
    expect(formatPomodoroTime(25 * 60)).toBe('25:00')
  })
})
