import { z } from 'zod'

export const PERFORMANCE_METRIC_KIND_VALUES = [
  'longtask',
  'event',
  'layout-shift',
  'navigation',
  'fps',
  'indexeddb-read',
  'settings-write',
  'memory',
] as const

export const PERFORMANCE_STATUS_VALUES = ['pass', 'warn', 'breach', 'unsupported'] as const
export const PERFORMANCE_SUPPORT_STATE_VALUES = ['supported', 'limited', 'unsupported'] as const
export const PERFORMANCE_CAPABILITY_TIER_VALUES = ['critical', 'durable', 'deferrable'] as const
export const PERFORMANCE_DEGRADATION_LEVEL_VALUES = ['info', 'warning', 'critical'] as const
export const PERFORMANCE_THRESHOLD_DIRECTION_VALUES = ['higher-is-worse', 'lower-is-worse'] as const

export type PerformanceMetricKind = typeof PERFORMANCE_METRIC_KIND_VALUES[number]
export type PerformanceStatus = typeof PERFORMANCE_STATUS_VALUES[number]
export type PerformanceSupportState = typeof PERFORMANCE_SUPPORT_STATE_VALUES[number]
export type PerformanceCapabilityTier = typeof PERFORMANCE_CAPABILITY_TIER_VALUES[number]
export type PerformanceDegradationLevel = typeof PERFORMANCE_DEGRADATION_LEVEL_VALUES[number]
export type PerformanceThresholdDirection = typeof PERFORMANCE_THRESHOLD_DIRECTION_VALUES[number]

export interface PerformanceThreshold {
  metric: PerformanceMetricKind
  label: string
  unit: 'ms' | 'fps' | 'score' | 'bytes'
  tier: PerformanceCapabilityTier
  direction: PerformanceThresholdDirection
  warnAt: number
  breachAt: number
  source: string
}

export const PERFORMANCE_THRESHOLDS = {
  longtask: {
    metric: 'longtask',
    label: 'Long task',
    unit: 'ms',
    tier: 'critical',
    direction: 'higher-is-worse',
    warnAt: 50,
    breachAt: 100,
    source: 'Spec 27 main-thread guardrail',
  },
  event: {
    metric: 'event',
    label: 'Interaction event',
    unit: 'ms',
    tier: 'critical',
    direction: 'higher-is-worse',
    warnAt: 120,
    breachAt: 200,
    source: 'Spec 27 input latency and INP-aligned local guardrail',
  },
  'layout-shift': {
    metric: 'layout-shift',
    label: 'Layout shift',
    unit: 'score',
    tier: 'durable',
    direction: 'higher-is-worse',
    warnAt: 0.1,
    breachAt: 0.25,
    source: 'Spec 27 visual stability guardrail',
  },
  navigation: {
    metric: 'navigation',
    label: 'Navigation duration',
    unit: 'ms',
    tier: 'durable',
    direction: 'higher-is-worse',
    warnAt: 1_000,
    breachAt: 3_000,
    source: 'Spec 27 first interactive route budget',
  },
  fps: {
    metric: 'fps',
    label: 'Frame rate',
    unit: 'fps',
    tier: 'durable',
    direction: 'lower-is-worse',
    warnAt: 45,
    breachAt: 30,
    source: 'Spec 27 perceived smoothness guardrail',
  },
  'indexeddb-read': {
    metric: 'indexeddb-read',
    label: 'IndexedDB read probe',
    unit: 'ms',
    tier: 'durable',
    direction: 'higher-is-worse',
    warnAt: 100,
    breachAt: 250,
    source: 'Spec 27 local persistence responsiveness budget',
  },
  'settings-write': {
    metric: 'settings-write',
    label: 'Settings write probe',
    unit: 'ms',
    tier: 'deferrable',
    direction: 'higher-is-worse',
    warnAt: 50,
    breachAt: 100,
    source: 'Spec 27 device settings write budget',
  },
  memory: {
    metric: 'memory',
    label: 'JS memory estimate',
    unit: 'bytes',
    tier: 'deferrable',
    direction: 'higher-is-worse',
    warnAt: 512 * 1024 * 1024,
    breachAt: 768 * 1024 * 1024,
    source: 'Spec 27 local diagnostic memory budget',
  },
} as const satisfies Record<PerformanceMetricKind, PerformanceThreshold>

export interface PerformanceEvaluation {
  metric: PerformanceMetricKind
  value: number | null
  status: PerformanceStatus
  threshold: PerformanceThreshold
  supportState: PerformanceSupportState
}

export interface PerformanceSampleInput {
  profileId: string
  metric: PerformanceMetricKind
  value: number | null
  route?: string
  source: string
  supportState?: PerformanceSupportState
  note?: string
  metadata?: Record<string, unknown>
  sampledAt?: number
}

export interface PerformanceSampleRecord extends PerformanceSampleInput {
  id: string
  schemaVersion: 1
  status: PerformanceStatus
  thresholdValue: number
  thresholdUnit: PerformanceThreshold['unit']
  sampledAt: number
  capabilityTier: PerformanceCapabilityTier
  createdAt: number
}

export interface PerformanceDegradationEventRecord {
  id: string
  schemaVersion: 1
  profileId: string
  sampleId: string
  metric: PerformanceMetricKind
  level: PerformanceDegradationLevel
  status: Exclude<PerformanceStatus, 'pass' | 'unsupported'>
  value: number | null
  thresholdValue: number
  thresholdUnit: PerformanceThreshold['unit']
  route?: string
  source: string
  message: string
  auditEntryId?: string
  createdAt: number
}

export interface PerformanceCapabilitySupport {
  key: string
  label: string
  supportState: PerformanceSupportState
  reason: string
}

export interface PerformanceSummary {
  status: PerformanceStatus
  sampledAt: number | null
  sampleCount: number
  eventCount: number
  worstMetric: PerformanceMetricKind | null
  reducedMotion: boolean | null
  support: PerformanceCapabilitySupport[]
}

export const performanceSampleInputSchema = z.object({
  profileId: z.string().min(1),
  metric: z.enum(PERFORMANCE_METRIC_KIND_VALUES),
  value: z.number().finite().nullable(),
  route: z.string().min(1).optional(),
  source: z.string().min(1),
  supportState: z.enum(PERFORMANCE_SUPPORT_STATE_VALUES).default('supported'),
  note: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sampledAt: z.number().int().positive().optional(),
}) satisfies z.ZodType<PerformanceSampleInput>

export const performanceSampleRecordSchema = performanceSampleInputSchema.extend({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  status: z.enum(PERFORMANCE_STATUS_VALUES),
  thresholdValue: z.number().finite(),
  thresholdUnit: z.enum(['ms', 'fps', 'score', 'bytes']),
  sampledAt: z.number().int().positive(),
  capabilityTier: z.enum(PERFORMANCE_CAPABILITY_TIER_VALUES),
  createdAt: z.number().int().positive(),
}) satisfies z.ZodType<PerformanceSampleRecord>

export const performanceDegradationEventRecordSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  profileId: z.string().min(1),
  sampleId: z.string().min(1),
  metric: z.enum(PERFORMANCE_METRIC_KIND_VALUES),
  level: z.enum(PERFORMANCE_DEGRADATION_LEVEL_VALUES),
  status: z.enum(['warn', 'breach']),
  value: z.number().finite().nullable(),
  thresholdValue: z.number().finite(),
  thresholdUnit: z.enum(['ms', 'fps', 'score', 'bytes']),
  route: z.string().min(1).optional(),
  source: z.string().min(1),
  message: z.string().min(1),
  auditEntryId: z.string().min(1).optional(),
  createdAt: z.number().int().positive(),
}) satisfies z.ZodType<PerformanceDegradationEventRecord>

export function evaluatePerformanceValue(
  metric: PerformanceMetricKind,
  value: number | null,
  supportState: PerformanceSupportState = 'supported',
): PerformanceEvaluation {
  const threshold = PERFORMANCE_THRESHOLDS[metric]

  if (supportState === 'unsupported' || value === null) {
    return { metric, value, status: 'unsupported', threshold, supportState }
  }

  if (threshold.direction === 'higher-is-worse') {
    if (value >= threshold.breachAt) return { metric, value, status: 'breach', threshold, supportState }
    if (value >= threshold.warnAt) return { metric, value, status: 'warn', threshold, supportState }
    return { metric, value, status: 'pass', threshold, supportState }
  }

  if (value <= threshold.breachAt) return { metric, value, status: 'breach', threshold, supportState }
  if (value <= threshold.warnAt) return { metric, value, status: 'warn', threshold, supportState }
  return { metric, value, status: 'pass', threshold, supportState }
}

export function getThresholdBoundaryForStatus(evaluation: PerformanceEvaluation): number {
  if (evaluation.status === 'breach') return evaluation.threshold.breachAt
  return evaluation.threshold.warnAt
}
