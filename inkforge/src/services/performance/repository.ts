import { auditLog } from '@/services/audit'
import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'
import {
  evaluatePerformanceValue,
  getThresholdBoundaryForStatus,
  performanceSampleInputSchema,
  type PerformanceDegradationEventRecord,
  type PerformanceSampleInput,
  type PerformanceSampleRecord,
  type PerformanceStatus,
} from './types'

const MAX_SAMPLES_PER_PROFILE = 300
const MAX_EVENTS_PER_PROFILE = 120

type AuditWriter = typeof auditLog

export interface PerformanceAuditContext {
  actorId: string
  source?: string
}

function statusRank(status: PerformanceStatus): number {
  switch (status) {
    case 'breach': return 3
    case 'warn': return 2
    case 'unsupported': return 1
    case 'pass': return 0
  }
}

function buildDegradationMessage(sample: PerformanceSampleRecord): string {
  const value = sample.value === null ? 'unsupported' : `${sample.value} ${sample.thresholdUnit}`
  return `${sample.metric} ${sample.status}: ${value} crossed ${sample.thresholdValue} ${sample.thresholdUnit}`
}

export class PerformanceRepository {
  constructor(private readonly auditWriter: AuditWriter = auditLog) {}

  async recordSample(input: PerformanceSampleInput, auditContext?: PerformanceAuditContext): Promise<{
    sample: PerformanceSampleRecord
    event: PerformanceDegradationEventRecord | null
  }> {
    const parsed = performanceSampleInputSchema.parse(input)
    const now = Date.now()
    const evaluation = evaluatePerformanceValue(parsed.metric, parsed.value, parsed.supportState)
    const sample: PerformanceSampleRecord = {
      ...parsed,
      id: generateId(),
      schemaVersion: 1,
      status: evaluation.status,
      thresholdValue: getThresholdBoundaryForStatus(evaluation),
      thresholdUnit: evaluation.threshold.unit,
      capabilityTier: evaluation.threshold.tier,
      sampledAt: parsed.sampledAt ?? now,
      createdAt: now,
    }

    await db.performanceSamples.add(sample)
    await this.trimSamples(sample.profileId)

    if (sample.status !== 'warn' && sample.status !== 'breach') {
      return { sample, event: null }
    }

    const event = await this.recordDegradationEvent(sample, auditContext)
    return { sample, event }
  }

  async listRecentSamples(profileId: string, limit = 50): Promise<PerformanceSampleRecord[]> {
    const records = await db.performanceSamples.where('profileId').equals(profileId).toArray()
    return records
      .sort((left, right) => right.sampledAt - left.sampledAt || right.createdAt - left.createdAt)
      .slice(0, Math.max(1, limit))
  }

  async listRecentEvents(profileId: string, limit = 50): Promise<PerformanceDegradationEventRecord[]> {
    const records = await db.performanceDegradationEvents.where('profileId').equals(profileId).toArray()
    return records
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, Math.max(1, limit))
  }

  async buildSummary(profileId: string) {
    const [samples, events] = await Promise.all([
      this.listRecentSamples(profileId, 100),
      this.listRecentEvents(profileId, 100),
    ])
    const worst = samples.reduce<PerformanceSampleRecord | null>((current, sample) => {
      if (!current) return sample
      return statusRank(sample.status) > statusRank(current.status) ? sample : current
    }, null)

    return {
      samples,
      events,
      worst,
    }
  }

  private async recordDegradationEvent(
    sample: PerformanceSampleRecord,
    auditContext?: PerformanceAuditContext,
  ): Promise<PerformanceDegradationEventRecord> {
    const eventStatus = sample.status === 'breach' ? 'breach' : 'warn'
    const auditEntry = auditContext
      ? await this.auditWriter('system.performance_degradation', {
        actorId: auditContext.actorId,
        profileId: sample.profileId,
        severity: sample.status === 'breach' ? 'critical' : 'warning',
        outcome: sample.status === 'breach' ? 'failure' : 'partial',
        reason: sample.status,
        payload: {
          metric: sample.metric,
          value: sample.value,
          unit: sample.thresholdUnit,
          thresholdValue: sample.thresholdValue,
          capabilityTier: sample.capabilityTier,
          route: sample.route,
          supportState: sample.supportState,
          source: sample.source,
        },
        source: auditContext.source ?? 'performance.repository',
      })
      : null

    const event: PerformanceDegradationEventRecord = {
      id: generateId(),
      schemaVersion: 1,
      profileId: sample.profileId,
      sampleId: sample.id,
      metric: sample.metric,
      level: sample.status === 'breach' ? 'critical' : 'warning',
      status: eventStatus,
      value: sample.value,
      thresholdValue: sample.thresholdValue,
      thresholdUnit: sample.thresholdUnit,
      route: sample.route,
      source: sample.source,
      message: buildDegradationMessage(sample),
      auditEntryId: auditEntry?.id,
      createdAt: Date.now(),
    }

    await db.performanceDegradationEvents.add(event)
    await this.trimEvents(sample.profileId)
    return event
  }

  private async trimSamples(profileId: string): Promise<void> {
    const records = await db.performanceSamples.where('profileId').equals(profileId).toArray()
    const stale = records
      .sort((left, right) => right.sampledAt - left.sampledAt || right.createdAt - left.createdAt)
      .slice(MAX_SAMPLES_PER_PROFILE)
      .map(record => record.id)
    if (stale.length > 0) {
      await db.performanceSamples.bulkDelete(stale)
    }
  }

  private async trimEvents(profileId: string): Promise<void> {
    const records = await db.performanceDegradationEvents.where('profileId').equals(profileId).toArray()
    const stale = records
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(MAX_EVENTS_PER_PROFILE)
      .map(record => record.id)
    if (stale.length > 0) {
      await db.performanceDegradationEvents.bulkDelete(stale)
    }
  }
}

export const performanceRepository = new PerformanceRepository()
