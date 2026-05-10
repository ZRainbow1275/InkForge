import { db } from '@/utils/db'
import { logger } from '@/services/error'
import { performanceRepository, type PerformanceAuditContext, type PerformanceRepository } from './repository'
import {
  PERFORMANCE_METRIC_KIND_VALUES,
  type PerformanceCapabilitySupport,
  type PerformanceMetricKind,
  type PerformanceSampleInput,
} from './types'

interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize?: number
    totalJSHeapSize?: number
    jsHeapSizeLimit?: number
  }
  measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>
}

type EntryWithValue = PerformanceEntry & { value?: number; hadRecentInput?: boolean }

type ObserverInit = PerformanceObserverInit & { durationThreshold?: number }

export interface PerformanceCollectionContext {
  profileId: string
  actorId: string
  route?: string
  source?: string
}

export interface PerformanceCollectorStopHandle {
  stop: () => void
  support: PerformanceCapabilitySupport[]
}

const OBSERVED_ENTRY_TYPES: Array<{ type: PerformanceMetricKind; label: string }> = [
  { type: 'longtask', label: 'Long Task API' },
  { type: 'event', label: 'Event Timing API' },
  { type: 'layout-shift', label: 'Layout Instability API' },
]

function getSupportedEntryTypes(): Set<string> {
  const ObserverCtor = globalThis.PerformanceObserver
  const supported = ObserverCtor?.supportedEntryTypes
  return new Set(Array.isArray(supported) ? supported : [])
}

export function getReducedMotionPreference(): boolean | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function buildPerformanceSupportMatrix(): PerformanceCapabilitySupport[] {
  const hasObserver = typeof globalThis.PerformanceObserver === 'function'
  const supportedTypes = getSupportedEntryTypes()
  const support: PerformanceCapabilitySupport[] = OBSERVED_ENTRY_TYPES.map(({ type, label }) => ({
    key: type,
    label,
    supportState: hasObserver && supportedTypes.has(type) ? 'supported' : 'unsupported',
    reason: hasObserver && supportedTypes.has(type)
      ? `${type} entries can be observed in this runtime`
      : `${type} entries are not exposed by this browser runtime`,
  }))

  const perf = globalThis.performance as PerformanceWithMemory | undefined
  support.push({
    key: 'navigation',
    label: 'Navigation Timing',
    supportState: typeof perf?.getEntriesByType === 'function' ? 'supported' : 'unsupported',
    reason: typeof perf?.getEntriesByType === 'function'
      ? 'Navigation entries can be read from the performance timeline'
      : 'performance.getEntriesByType is unavailable',
  })
  support.push({
    key: 'memory',
    label: 'Browser memory estimate',
    supportState: typeof perf?.measureUserAgentSpecificMemory === 'function'
      ? 'supported'
      : perf?.memory ? 'limited' : 'unsupported',
    reason: typeof perf?.measureUserAgentSpecificMemory === 'function'
      ? 'measureUserAgentSpecificMemory is available'
      : perf?.memory
        ? 'Using Chromium performance.memory fallback'
        : 'No browser memory API is available',
  })
  support.push({
    key: 'reduced-motion',
    label: 'Reduced motion preference',
    supportState: typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? 'supported' : 'unsupported',
    reason: typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? 'matchMedia can evaluate prefers-reduced-motion'
      : 'matchMedia is unavailable in this runtime',
  })

  return support
}

function buildEntrySample(entry: PerformanceEntry, context: PerformanceCollectionContext): PerformanceSampleInput | null {
  if (entry.entryType === 'layout-shift') {
    const shift = entry as EntryWithValue
    if (shift.hadRecentInput) {
      return null
    }
    return {
      profileId: context.profileId,
      metric: 'layout-shift',
      value: typeof shift.value === 'number' ? Number(shift.value.toFixed(4)) : null,
      route: context.route,
      source: context.source ?? 'performance.observer',
      metadata: { name: entry.name, startTime: entry.startTime },
    }
  }

  if (entry.entryType === 'event') {
    return {
      profileId: context.profileId,
      metric: 'event',
      value: Number(entry.duration.toFixed(2)),
      route: context.route,
      source: context.source ?? 'performance.observer',
      metadata: { name: entry.name, startTime: entry.startTime },
    }
  }

  if (entry.entryType === 'longtask') {
    return {
      profileId: context.profileId,
      metric: 'longtask',
      value: Number(entry.duration.toFixed(2)),
      route: context.route,
      source: context.source ?? 'performance.observer',
      metadata: { name: entry.name, startTime: entry.startTime },
    }
  }

  return null
}

async function measureFps(durationMs = 600): Promise<number | null> {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return null
  }

  return new Promise(resolve => {
    let frames = 0
    const start = performance.now()
    const tick = (timestamp: number) => {
      frames += 1
      if (timestamp - start >= durationMs) {
        const seconds = (timestamp - start) / 1000
        resolve(seconds > 0 ? Math.round(frames / seconds) : null)
        return
      }
      window.requestAnimationFrame(tick)
    }
    window.requestAnimationFrame(tick)
  })
}

async function measureIndexedDbReadLatency(): Promise<number | null> {
  const startedAt = performance.now()
  await db.documents.limit(1).toArray()
  return Number((performance.now() - startedAt).toFixed(2))
}

function measureSettingsWriteLatency(): number | null {
  const probeKey = '__inkforge-performance-slo-probe__'
  const startedAt = performance.now()
  try {
    localStorage.setItem(probeKey, JSON.stringify({ sampledAt: Date.now() }))
    localStorage.removeItem(probeKey)
    return Number((performance.now() - startedAt).toFixed(2))
  } catch {
    return null
  }
}

async function measureMemoryBytes(): Promise<{ value: number | null; source: string; supportState: 'supported' | 'limited' | 'unsupported' }> {
  const perf = performance as PerformanceWithMemory
  if (typeof perf.measureUserAgentSpecificMemory === 'function') {
    const measurement = await perf.measureUserAgentSpecificMemory()
    return { value: measurement.bytes, source: 'measureUserAgentSpecificMemory', supportState: 'supported' }
  }

  if (perf.memory?.usedJSHeapSize) {
    return { value: perf.memory.usedJSHeapSize, source: 'performance.memory', supportState: 'limited' }
  }

  return { value: null, source: 'unsupported', supportState: 'unsupported' }
}

function readNavigationDuration(): number | null {
  if (typeof performance.getEntriesByType !== 'function') {
    return null
  }
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  return navigation ? Number(navigation.duration.toFixed(2)) : null
}

export class PerformanceCollector {
  constructor(private readonly repository: PerformanceRepository = performanceRepository) {}

  startObservers(context: PerformanceCollectionContext): PerformanceCollectorStopHandle {
    const support = buildPerformanceSupportMatrix()
    const supportedTypes = getSupportedEntryTypes()
    const observers: PerformanceObserver[] = []

    if (typeof globalThis.PerformanceObserver !== 'function') {
      return { stop: () => undefined, support }
    }

    for (const { type } of OBSERVED_ENTRY_TYPES) {
      if (!supportedTypes.has(type)) {
        continue
      }

      try {
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries()
          for (const entry of entries) {
            const sample = buildEntrySample(entry, context)
            if (!sample) continue
            void this.repository.recordSample(sample, this.buildAuditContext(context)).catch(error => {
              logger.warn('[PerformanceCollector] failed to persist observed performance sample', {
                metric: sample.metric,
                error: error instanceof Error ? error.message : String(error),
              })
            })
          }
        })
        const init: ObserverInit = type === 'event'
          ? { type, buffered: true, durationThreshold: 16 }
          : { type, buffered: true }
        observer.observe(init)
        observers.push(observer)
      } catch (error) {
        logger.warn('[PerformanceCollector] performance observer unavailable for entry type', {
          type,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return {
      support,
      stop: () => observers.forEach(observer => observer.disconnect()),
    }
  }

  async collectSnapshot(context: PerformanceCollectionContext) {
    const support = buildPerformanceSupportMatrix()
    const reducedMotion = getReducedMotionPreference()
    const auditContext = this.buildAuditContext(context)
    const samples: PerformanceSampleInput[] = [
      {
        profileId: context.profileId,
        metric: 'navigation',
        value: readNavigationDuration(),
        route: context.route,
        source: context.source ?? 'performance.snapshot',
        supportState: typeof performance.getEntriesByType === 'function' ? 'supported' : 'unsupported',
      },
      {
        profileId: context.profileId,
        metric: 'fps',
        value: await measureFps(),
        route: context.route,
        source: context.source ?? 'performance.snapshot',
        supportState: typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function' ? 'supported' : 'unsupported',
      },
      {
        profileId: context.profileId,
        metric: 'indexeddb-read',
        value: await measureIndexedDbReadLatency(),
        route: context.route,
        source: context.source ?? 'performance.snapshot',
        supportState: 'supported',
      },
      {
        profileId: context.profileId,
        metric: 'settings-write',
        value: measureSettingsWriteLatency(),
        route: context.route,
        source: context.source ?? 'performance.snapshot',
        supportState: typeof localStorage !== 'undefined' ? 'supported' : 'unsupported',
      },
    ]
    const memory = await measureMemoryBytes()
    samples.push({
      profileId: context.profileId,
      metric: 'memory',
      value: memory.value,
      route: context.route,
      source: context.source ?? 'performance.snapshot',
      supportState: memory.supportState,
      metadata: { memorySource: memory.source },
    })

    const results = []
    for (const sample of samples) {
      results.push(await this.repository.recordSample(sample, auditContext))
    }

    return {
      support,
      reducedMotion,
      samples: results.map(result => result.sample),
      events: results.map(result => result.event).filter(event => event !== null),
    }
  }

  private buildAuditContext(context: PerformanceCollectionContext): PerformanceAuditContext {
    return {
      actorId: context.actorId,
      source: context.source ?? 'performance.collector',
    }
  }
}

export const performanceCollector = new PerformanceCollector()
export const performanceMetricKinds = PERFORMANCE_METRIC_KIND_VALUES
