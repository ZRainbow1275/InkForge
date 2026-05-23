<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { Article, Category } from '@/types'
import { computeContentWordCount } from '@/composables/useTextStats'
import { useTagStore } from '@/stores/tags'
import ContributionHeatmap from './ContributionHeatmap.vue'
import ProductivityInsights from './ProductivityInsights.vue'
import WordCountTrend from './WordCountTrend.vue'
import WordDistribution from './WordDistribution.vue'
import CategoryDistribution from './CategoryDistribution.vue'
import WritingTimeline from './WritingTimeline.vue'
import TagCloud from './TagCloud.vue'
import type { CategorySlice, HeatmapDay, ProductivityMetric, TagCloudItem, TimelineEvent, TrendPoint, WordBucket } from './types'

const props = defineProps<{ articles: Article[]; categories: Category[] }>()
const tagStore = useTagStore()

const categoryColors = ['#D32F2F', '#1565C0', '#2E7D32', '#F57C00', '#6A1B9A', '#00838F', '#5D4037']
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function shortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatDateTime(date: Date): string {
  return `${shortDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getWordCount(article: Article): number {
  return computeContentWordCount(article.rawContent ?? '')
}

const articleFacts = computed(() => props.articles.map(article => {
  const createdAt = toDate(article.createdAt)
  const updatedAt = toDate(article.updatedAt) ?? createdAt
  return { article, createdAt, updatedAt, words: getWordCount(article) }
}))

const heatmapDays = computed<HeatmapDay[]>(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 35 }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (34 - index))
    const key = dateKey(day)
    const matches = articleFacts.value.filter(item => item.updatedAt && dateKey(item.updatedAt) === key)
    return { date: key, label: shortDate(day), count: matches.length, words: matches.reduce((sum, item) => sum + item.words, 0) }
  })
})

const wordTrendPoints = computed<TrendPoint[]>(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 14 }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (13 - index))
    const key = dateKey(day)
    return {
      date: key,
      label: shortDate(day),
      value: articleFacts.value.filter(item => item.updatedAt && dateKey(item.updatedAt) === key).reduce((sum, item) => sum + item.words, 0),
    }
  })
})

const categorySlices = computed<CategorySlice[]>(() => {
  const categoryCounts = new Map<string, number>()
  for (const item of articleFacts.value) {
    const id = item.article.categoryId ?? 'uncategorized'
    categoryCounts.set(id, (categoryCounts.get(id) ?? 0) + 1)
  }
  const slices = props.categories.map((category, index) => ({
    id: category.id,
    name: category.name,
    count: categoryCounts.get(category.id) ?? 0,
    color: categoryColors[index % categoryColors.length],
  }))
  const uncategorized = categoryCounts.get('uncategorized') ?? 0
  if (uncategorized > 0) slices.push({ id: 'uncategorized', name: '未分类', count: uncategorized, color: '#90A4AE' })
  return slices.filter(slice => slice.count > 0).sort((a, b) => b.count - a.count).slice(0, 6)
})

const writingTimelineEvents = computed<TimelineEvent[]>(() => articleFacts.value
  .flatMap(item => {
    const events: TimelineEvent[] = []
    if (item.createdAt) events.push({ id: `${item.article.id}:created`, timestamp: item.createdAt.getTime(), date: formatDateTime(item.createdAt), title: item.article.title, action: 'created' })
    if (item.updatedAt && (!item.createdAt || Math.abs(item.updatedAt.getTime() - item.createdAt.getTime()) > 300000)) {
      events.push({ id: `${item.article.id}:updated`, timestamp: item.updatedAt.getTime(), date: formatDateTime(item.updatedAt), title: item.article.title, action: 'updated' })
    }
    return events
  })
  .sort((a, b) => b.timestamp - a.timestamp)
  .slice(0, 14))

const productivityMetrics = computed<ProductivityMetric[]>(() => {
  const byHour = Array.from({ length: 24 }, () => 0)
  const byWeekday = Array.from({ length: 7 }, () => 0)
  let totalWords = 0
  let longest = { title: '暂无文章', words: 0 }

  for (const item of articleFacts.value) {
    totalWords += item.words
    if (item.words > longest.words) longest = { title: item.article.title || '未命名文稿', words: item.words }
    if (item.updatedAt) {
      byHour[item.updatedAt.getHours()] += 1
      byWeekday[item.updatedAt.getDay()] += 1
    }
  }

  const avgWords = props.articles.length > 0 ? Math.round(totalWords / props.articles.length) : 0
  const peakHour = byHour.reduce((best, count, hour) => count > byHour[best] ? hour : best, 0)
  const peakWeekday = byWeekday.reduce((best, count, day) => count > byWeekday[best] ? day : best, 0)

  return [
    { key: 'peak-hour', label: '最高产时段', value: byHour[peakHour] > 0 ? `${peakHour}:00` : '暂无', numericValue: byHour[peakHour], detail: `${byHour[peakHour]} 次编辑` },
    { key: 'peak-weekday', label: '最高产星期', value: byWeekday[peakWeekday] > 0 ? weekdays[peakWeekday] : '暂无', numericValue: byWeekday[peakWeekday], detail: `${byWeekday[peakWeekday]} 次活动` },
    { key: 'avg-length', label: '平均长度', value: `${avgWords} 字`, numericValue: avgWords, detail: `${props.articles.length} 篇文章` },
    { key: 'longest', label: '最长文章', value: `${longest.words} 字`, numericValue: longest.words, detail: longest.title },
  ]
})

const wordBuckets = computed<WordBucket[]>(() => {
  const buckets = [
    { label: '0-500', min: 0, max: 500, count: 0 },
    { label: '500-1K', min: 500, max: 1000, count: 0 },
    { label: '1K-2K', min: 1000, max: 2000, count: 0 },
    { label: '2K-5K', min: 2000, max: 5000, count: 0 },
    { label: '5K-10K', min: 5000, max: 10000, count: 0 },
    { label: '10K+', min: 10000, max: Number.POSITIVE_INFINITY, count: 0 },
  ]
  for (const item of articleFacts.value) {
    const bucket = buckets.find(candidate => item.words >= candidate.min && item.words < candidate.max)
    if (bucket) bucket.count += 1
  }
  return buckets.map(({ label, count }) => ({ label, count }))
})

const tagCloudItems = computed<TagCloudItem[]>(() => tagStore.tagCloudNodes.map(node => ({
  tag: node.tag.name,
  count: node.tag.docCount,
  weight: node.weight,
  fontSize: node.fontSize,
  color: node.tag.color,
})))

function refreshRealTagCloud(): void {
  void tagStore.loadTags()
}

onMounted(refreshRealTagCloud)
watch(() => props.articles.map(article => `${article.id}:${(article.tags ?? []).join(',')}`).join('|'), refreshRealTagCloud)
</script>

<template>
  <section
    class="data-insights-section"
    aria-labelledby="hub-data-insights-title"
  >
    <h2
      id="hub-data-insights-title"
      class="sr-only"
    >
      创作数据洞察
    </h2>
    <div class="insights-row insights-row-one">
      <ContributionHeatmap :days="heatmapDays" />
      <ProductivityInsights :metrics="productivityMetrics" />
    </div>
    <div class="insights-row insights-row-three">
      <WordCountTrend :points="wordTrendPoints" />
      <WordDistribution :buckets="wordBuckets" />
      <CategoryDistribution :slices="categorySlices" />
    </div>
    <div class="insights-row insights-row-two">
      <WritingTimeline :events="writingTimelineEvents" />
      <TagCloud :tags="tagCloudItems" />
    </div>
  </section>
</template>

<style scoped>
.data-insights-section {
  max-width: 1680px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.insights-row { display: grid; gap: 12px; min-height: 0; }
.insights-row-one { grid-template-columns: minmax(0, 64fr) minmax(320px, 36fr); flex: 1.0; }
.insights-row-three { grid-template-columns: repeat(3, minmax(0, 1fr)); flex: 0.78; }
.insights-row-two { grid-template-columns: minmax(0, 60fr) minmax(320px, 40fr); flex: 1.0; }
:deep(.insight-card) {
  min-width: 0;
  min-height: 0;
  padding: 14px 18px 12px 22px;
  border-radius: 18px 22px 18px 22px;
  border: 1px solid rgba(207, 216, 220, 0.55);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(250, 252, 253, 0.92) 100%);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 8px 24px rgba(38, 50, 56, 0.05);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
:deep(.insight-card)::before {
  content: '';
  position: absolute;
  top: 16px;
  left: 0;
  width: 3px;
  height: 22px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #D32F2F 0%, #B71C1C 100%);
  z-index: 1;
}
:deep(.insight-card)::after {
  content: '';
  position: absolute;
  top: -32px;
  right: -32px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(211, 47, 47, 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.insights-row-one > :deep(.insight-card:nth-child(2)) {
  border-radius: 22px 18px 22px 18px;
}
.insights-row-one > :deep(.insight-card:nth-child(2))::after {
  top: -32px;
  right: auto;
  left: -32px;
  background: radial-gradient(circle, rgba(21, 101, 192, 0.06) 0%, transparent 70%);
}
.insights-row-three > :deep(.insight-card:nth-child(2)) {
  border-radius: 16px 28px 16px 28px;
}
.insights-row-three > :deep(.insight-card:nth-child(3)) {
  border-radius: 24px 16px 24px 16px;
}
.insights-row-two > :deep(.insight-card:nth-child(2)) {
  border-radius: 22px 16px 32px 16px;
}
.insights-row-two > :deep(.insight-card:nth-child(2))::after {
  background: radial-gradient(circle, rgba(245, 124, 0, 0.06) 0%, transparent 70%);
}
:deep(.insight-card):hover {
  transform: translateY(-2px);
  border-color: rgba(211, 47, 47, 0.24);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 14px 36px rgba(38, 50, 56, 0.10);
}
:deep(.insight-card-head) { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-shrink: 0; }
:deep(.insight-card-head.compact) { min-height: 38px; }
:deep(.insight-card-head h3) { margin: 2px 0 0; color: #1A2730; font-size: 16px; font-weight: 700; letter-spacing: 0.2px; }
:deep(.insight-card-head > span) {
  padding: 3px 9px;
  border-radius: 999px;
  color: #B71C1C;
  background: linear-gradient(135deg, rgba(211, 47, 47, 0.10), rgba(211, 47, 47, 0.04));
  border: 1px solid rgba(211, 47, 47, 0.18);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
:deep(.insight-eyebrow) {
  margin: 0;
  color: #B71C1C;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

html.theme-dark .data-insights-section :deep(.insight-card),
html[data-theme="dark"] .data-insights-section :deep(.insight-card) {
  background: linear-gradient(180deg, rgba(26, 34, 45, 0.96) 0%, rgba(19, 26, 35, 0.94) 100%);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 8px 24px rgba(0, 0, 0, 0.32);
}
html.theme-dark .data-insights-section :deep(.insight-card)::before,
html[data-theme="dark"] .data-insights-section :deep(.insight-card)::before {
  background: linear-gradient(180deg, #EF5350 0%, #B71C1C 100%);
}
html.theme-dark .data-insights-section :deep(.insight-card-head h3),
html[data-theme="dark"] .data-insights-section :deep(.insight-card-head h3) { color: #ECEFF4; }
html.theme-dark .data-insights-section :deep(.insight-card-head > span),
html[data-theme="dark"] .data-insights-section :deep(.insight-card-head > span) {
  color: #EF9A9A;
  background: linear-gradient(135deg, rgba(239, 83, 80, 0.16), rgba(239, 83, 80, 0.06));
  border-color: rgba(239, 83, 80, 0.32);
}
html.theme-dark .data-insights-section :deep(.insight-eyebrow),
html[data-theme="dark"] .data-insights-section :deep(.insight-eyebrow) { color: #EF9A9A; }
@media (max-width: 1200px) { .insights-row-one, .insights-row-three, .insights-row-two { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 800px) { .insights-row-one, .insights-row-three, .insights-row-two { grid-template-columns: 1fr; } }
</style>
