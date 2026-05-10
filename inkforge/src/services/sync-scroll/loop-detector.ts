import type { SyncScrollSide } from './types'

interface ScrollLoopEvent {
  side: SyncScrollSide
  at: number
}

export class ScrollLoopDetector {
  private history: ScrollLoopEvent[] = []

  constructor(
    private readonly maxEvents = 5,
    private readonly windowMs = 100,
  ) {}

  reset(): void {
    this.history = []
  }

  record(side: SyncScrollSide, now = performance.now()): boolean {
    this.history.push({ side, at: now })
    const cutoff = now - this.windowMs
    this.history = this.history.filter(event => event.at >= cutoff).slice(-this.maxEvents)
    if (this.history.length < this.maxEvents) return false
    const hasBothSides = new Set(this.history.map(event => event.side)).size > 1
    return hasBothSides && this.history[this.history.length - 1].at - this.history[0].at <= this.windowMs
  }
}