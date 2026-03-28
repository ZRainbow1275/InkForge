import { formatNumber } from '@/data/quotes'
import type { Article } from '@/types'

export function getArticleWordCount(article: Article): number {
  return article.rawContent?.length ?? 0
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  })
}

export function formatWordCount(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}W 字`
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K 字`
  }

  return `${formatNumber(value)} 字`
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const today = startOfDay(now)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const value = startOfDay(date)

  if (formatDateKey(value) === formatDateKey(today)) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  if (formatDateKey(value) === formatDateKey(yesterday)) {
    return '昨天'
  }

  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  })
}
