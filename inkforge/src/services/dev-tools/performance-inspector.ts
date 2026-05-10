import { performanceRepository } from '@/services/performance'
import type { DevPanelPerformanceSnapshot } from './types'

export async function readDevPanelPerformanceSnapshot(profileId = 'local-profile'): Promise<DevPanelPerformanceSnapshot> {
  const [samples, events] = await Promise.all([
    performanceRepository.listRecentSamples(profileId, 120),
    performanceRepository.listRecentEvents(profileId, 80),
  ])
  return { samples, events, collectedAt: Date.now() }
}