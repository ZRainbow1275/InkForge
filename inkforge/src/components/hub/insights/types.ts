export interface HeatmapDay {
  date: string
  label: string
  count: number
  words: number
}

export interface TrendPoint {
  date: string
  label: string
  value: number
}

export interface CategorySlice {
  id: string
  name: string
  count: number
  color: string
}

export interface TimelineEvent {
  id: string
  timestamp: number
  date: string
  title: string
  action: 'created' | 'updated'
}

export interface ProductivityMetric {
  key: string
  label: string
  value: string
  numericValue: number
  detail: string
}

export interface WordBucket {
  label: string
  count: number
}

export interface TagCloudItem {
  tag: string
  count: number
  weight: number
  color?: string
}

export interface RecentActivityItem {
  id: string
  timestamp: number
  title: string
  description: string
  timeLabel: string
  action: 'created' | 'updated'
}

export interface ExportFrequencyItem {
  platform: string
  label: string
  count: number
  color: string
}