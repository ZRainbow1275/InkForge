import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/utils/db'
import { buildPerformanceSupportMatrix, PerformanceRepository, evaluatePerformanceValue } from './index'
import type { PerformanceDegradationEventRecord, PerformanceSampleRecord } from './types'

function createWhereResult<T>(records: T[]) {
  return {
    equals: () => ({
      toArray: async () => records,
    }),
  } as unknown as ReturnType<typeof db.performanceSamples.where>
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('performance SLO threshold evaluation', () => {
  it('evaluates higher-is-worse and lower-is-worse thresholds deterministically', () => {
    expect(evaluatePerformanceValue('longtask', 49).status).toBe('pass')
    expect(evaluatePerformanceValue('longtask', 75).status).toBe('warn')
    expect(evaluatePerformanceValue('longtask', 125).status).toBe('breach')
    expect(evaluatePerformanceValue('fps', 60).status).toBe('pass')
    expect(evaluatePerformanceValue('fps', 40).status).toBe('warn')
    expect(evaluatePerformanceValue('fps', 24).status).toBe('breach')
  })

  it('marks unsupported runtime samples without fabricating metric values', () => {
    const result = evaluatePerformanceValue('memory', null, 'unsupported')

    expect(result.status).toBe('unsupported')
    expect(result.value).toBeNull()
  })
})

describe('performance browser support matrix', () => {
  it('reports unsupported observer capabilities when the browser API is absent', () => {
    vi.stubGlobal('PerformanceObserver', undefined)

    const support = buildPerformanceSupportMatrix()

    expect(support.find(item => item.key === 'longtask')?.supportState).toBe('unsupported')
    expect(support.find(item => item.key === 'event')?.supportState).toBe('unsupported')
    expect(support.find(item => item.key === 'layout-shift')?.supportState).toBe('unsupported')
  })
})

describe('performance repository', () => {
  it('persists real threshold breach events and writes audit evidence', async () => {
    const samples: PerformanceSampleRecord[] = []
    const events: PerformanceDegradationEventRecord[] = []
    vi.spyOn(db.performanceSamples, 'add').mockImplementation(((record: unknown) => {
      samples.push(record as PerformanceSampleRecord)
      return Promise.resolve((record as PerformanceSampleRecord).id) as never
    }) as never)
    vi.spyOn(db.performanceSamples, 'where').mockReturnValue(createWhereResult(samples))
    vi.spyOn(db.performanceSamples, 'bulkDelete').mockResolvedValue(undefined)
    vi.spyOn(db.performanceDegradationEvents, 'add').mockImplementation(((record: unknown) => {
      events.push(record as PerformanceDegradationEventRecord)
      return Promise.resolve((record as PerformanceDegradationEventRecord).id) as never
    }) as never)
    vi.spyOn(db.performanceDegradationEvents, 'where').mockReturnValue(createWhereResult(events) as never)
    vi.spyOn(db.performanceDegradationEvents, 'bulkDelete').mockResolvedValue(undefined)
    const auditWriter = vi.fn(async () => ({ id: 'audit-performance' }))
    const repository = new PerformanceRepository(auditWriter as never)

    const result = await repository.recordSample({
      profileId: 'profile-1',
      metric: 'longtask',
      value: 140,
      route: '/settings?tab=about',
      source: 'performance.test',
    }, { actorId: 'profile-1', source: 'performance.test' })

    expect(result.sample.status).toBe('breach')
    expect(result.event?.level).toBe('critical')
    expect(result.event?.auditEntryId).toBe('audit-performance')
    expect(auditWriter).toHaveBeenCalledWith('system.performance_degradation', expect.objectContaining({
      profileId: 'profile-1',
      severity: 'critical',
      outcome: 'failure',
    }))
    expect(samples).toHaveLength(1)
    expect(events).toHaveLength(1)
  })

  it('does not create degradation events for unsupported API evidence', async () => {
    const samples: PerformanceSampleRecord[] = []
    vi.spyOn(db.performanceSamples, 'add').mockImplementation(((record: unknown) => {
      samples.push(record as PerformanceSampleRecord)
      return Promise.resolve((record as PerformanceSampleRecord).id) as never
    }) as never)
    vi.spyOn(db.performanceSamples, 'where').mockReturnValue(createWhereResult(samples))
    vi.spyOn(db.performanceSamples, 'bulkDelete').mockResolvedValue(undefined)
    vi.spyOn(db.performanceDegradationEvents, 'add').mockRejectedValue(new Error('should not be called'))
    const repository = new PerformanceRepository(vi.fn() as never)

    const result = await repository.recordSample({
      profileId: 'profile-1',
      metric: 'memory',
      value: null,
      supportState: 'unsupported',
      source: 'performance.test',
    })

    expect(result.sample.status).toBe('unsupported')
    expect(result.event).toBeNull()
    expect(db.performanceDegradationEvents.add).not.toHaveBeenCalled()
  })
})
