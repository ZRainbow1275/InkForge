import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  buildPerformanceSupportMatrix,
  getReducedMotionPreference,
  performanceCollector,
  performanceRepository,
  type PerformanceCapabilitySupport,
  type PerformanceCollectorStopHandle,
  type PerformanceDegradationEventRecord,
  type PerformanceMetricKind,
  type PerformanceSampleRecord,
  type PerformanceStatus,
  type PerformanceSummary,
} from '@/services/performance'

function getStatusRank(status: PerformanceStatus): number {
  switch (status) {
    case 'breach': return 3
    case 'warn': return 2
    case 'unsupported': return 1
    case 'pass': return 0
  }
}

function buildSummary(
  samples: PerformanceSampleRecord[],
  events: PerformanceDegradationEventRecord[],
  support: PerformanceCapabilitySupport[],
  reducedMotion: boolean | null,
): PerformanceSummary {
  const worst = samples.reduce<PerformanceSampleRecord | null>((current, sample) => {
    if (!current) return sample
    return getStatusRank(sample.status) > getStatusRank(current.status) ? sample : current
  }, null)

  const status = worst?.status ?? (support.some(item => item.supportState === 'unsupported') ? 'unsupported' : 'pass')

  return {
    status,
    sampledAt: samples[0]?.sampledAt ?? null,
    sampleCount: samples.length,
    eventCount: events.length,
    worstMetric: worst?.metric ?? null,
    reducedMotion,
    support,
  }
}

export const usePerformanceStore = defineStore('performance', () => {
  const samples = ref<PerformanceSampleRecord[]>([])
  const events = ref<PerformanceDegradationEventRecord[]>([])
  const supportMatrix = ref<PerformanceCapabilitySupport[]>(buildPerformanceSupportMatrix())
  const reducedMotion = ref<boolean | null>(getReducedMotionPreference())
  const isCollecting = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastActionMessage = ref<string | null>(null)
  let observerHandle: PerformanceCollectorStopHandle | null = null

  const summary = computed(() => buildSummary(samples.value, events.value, supportMatrix.value, reducedMotion.value))
  const recentSamples = computed(() => samples.value.slice(0, 12))
  const recentEvents = computed(() => events.value.slice(0, 8))
  const unsupportedCapabilities = computed(() => supportMatrix.value.filter(item => item.supportState !== 'supported'))

  async function loadRecent(profileId: string): Promise<void> {
    const [nextSamples, nextEvents] = await Promise.all([
      performanceRepository.listRecentSamples(profileId, 60),
      performanceRepository.listRecentEvents(profileId, 30),
    ])
    samples.value = nextSamples
    events.value = nextEvents
  }

  async function refreshSnapshot(profileId: string, actorId: string, route?: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const result = await performanceCollector.collectSnapshot({
        profileId,
        actorId,
        route,
        source: 'settings.performance-slo',
      })
      supportMatrix.value = result.support
      reducedMotion.value = result.reducedMotion
      await loadRecent(profileId)
      lastActionMessage.value = `Recorded ${result.samples.length} real performance samples`
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      lastActionMessage.value = `Performance SLO collection failed: ${message}`
    } finally {
      isLoading.value = false
    }
  }

  async function start(profileId: string, actorId: string, route?: string): Promise<void> {
    stop()
    supportMatrix.value = buildPerformanceSupportMatrix()
    reducedMotion.value = getReducedMotionPreference()
    observerHandle = performanceCollector.startObservers({
      profileId,
      actorId,
      route,
      source: 'settings.performance-observer',
    })
    supportMatrix.value = observerHandle.support
    isCollecting.value = true
    await loadRecent(profileId)
  }

  function stop(): void {
    observerHandle?.stop()
    observerHandle = null
    isCollecting.value = false
  }

  function getLatestSample(metric: PerformanceMetricKind): PerformanceSampleRecord | null {
    return samples.value.find(sample => sample.metric === metric) ?? null
  }

  return {
    samples,
    events,
    supportMatrix,
    reducedMotion,
    isCollecting,
    isLoading,
    error,
    lastActionMessage,
    summary,
    recentSamples,
    recentEvents,
    unsupportedCapabilities,
    loadRecent,
    refreshSnapshot,
    start,
    stop,
    getLatestSample,
  }
})
