import { activityLogToDevToolsEvent, type DevToolsEvent, type DevToolsEventBusSnapshot } from './types'
import type { ActivityLogRecord } from '@/services/activity-logger/types'

const DEFAULT_EVENT_CAPACITY = 1_000
const DEFAULT_RATE_LIMIT_PER_SECOND = 200
const DEFAULT_SAMPLE_RATE = 0.1

export type DevToolsEventListener = (event: DevToolsEvent) => void

function shouldSample(sequence: number, sampleRate: number): boolean {
  if (sampleRate <= 0) return false
  if (sampleRate >= 1) return true
  const interval = Math.max(1, Math.round(1 / sampleRate))
  return sequence % interval === 0
}

export class DevToolsRingBuffer<T> {
  private readonly values: T[] = []

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error('Ring buffer capacity must be a positive integer')
    }
  }

  push(value: T): void {
    if (this.values.length >= this.capacity) {
      this.values.shift()
    }
    this.values.push(value)
  }

  clear(): void {
    this.values.splice(0, this.values.length)
  }

  snapshot(): T[] {
    return [...this.values]
  }

  get size(): number {
    return this.values.length
  }
}

export class DevToolsEventBus {
  private readonly buffer: DevToolsRingBuffer<DevToolsEvent>
  private readonly listeners = new Set<DevToolsEventListener>()
  private windowStartedAt = 0
  private eventsInWindow = 0
  private overflowSequence = 0
  private accepted = 0
  private sampled = 0
  private dropped = 0

  constructor(
    capacity = DEFAULT_EVENT_CAPACITY,
    private readonly rateLimitPerSecond = DEFAULT_RATE_LIMIT_PER_SECOND,
    private readonly sampleRate = DEFAULT_SAMPLE_RATE,
  ) {
    this.buffer = new DevToolsRingBuffer<DevToolsEvent>(capacity)
  }

  publish(event: DevToolsEvent, now = Date.now()): boolean {
    if (now - this.windowStartedAt >= 1_000) {
      this.windowStartedAt = now
      this.eventsInWindow = 0
      this.overflowSequence = 0
    }

    this.eventsInWindow += 1
    let nextEvent = event
    if (this.eventsInWindow > this.rateLimitPerSecond) {
      this.overflowSequence += 1
      if (!shouldSample(this.overflowSequence, this.sampleRate)) {
        this.dropped += 1
        return false
      }
      this.sampled += 1
      nextEvent = { ...event, sampled: true }
    }

    this.accepted += 1
    this.buffer.push(nextEvent)
    for (const listener of this.listeners) {
      listener(nextEvent)
    }
    return true
  }

  subscribe(listener: DevToolsEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  snapshot(): DevToolsEventBusSnapshot {
    return {
      events: this.buffer.snapshot().sort((left, right) => right.timestamp - left.timestamp),
      accepted: this.accepted,
      sampled: this.sampled,
      dropped: this.dropped,
    }
  }

  clear(): void {
    this.buffer.clear()
    this.accepted = 0
    this.sampled = 0
    this.dropped = 0
  }
}

export const devToolsEventBus = new DevToolsEventBus()

export function publishDevToolsEvent(event: DevToolsEvent): boolean {
  return devToolsEventBus.publish(event)
}

export function publishActivityLogRecord(record: ActivityLogRecord): boolean {
  return publishDevToolsEvent(activityLogToDevToolsEvent(record))
}