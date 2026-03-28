<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type Component } from 'vue'
import {
  Award,
  BarChart3,
  CalendarDays,
  Clock3,
  FileText,
  FolderOpen,
  TrendingDown,
  TrendingUp,
} from 'lucide-vue-next'
import type { Article, Category } from '@/types'
import { formatWordCount, getArticleWordCount } from './insight-utils'

interface InsightMetric {
  key: string
  label: string
  value: string
  subtitle?: string
  icon: Component
  tone: 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'teal'
  numericTarget?: number
  formatNumeric?: (value: number) => string
}

const props = defineProps<{
  articles: Article[]
  categories: Category[]
}>()

const animatedValues = ref<Record<string, number>>({})
let animationFrames: number[] = []

function cancelAnimations(): void {
  for (const frame of animationFrames) {
    cancelAnimationFrame(frame)
  }
  animationFrames = []
}

function animateMetricValue(key: string, target: number): void {
  const startValue = animatedValues.value[key] ?? 0
  const diff = target - startValue
  const startTime = performance.now()
  const duration = 700

  const step = (time: number) => {
    const progress = Math.min((time - startTime) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    animatedValues.value = {
      ...animatedValues.value,
      [key]: Math.round(startValue + diff * eased),
    }

    if (progress < 1) {
      const frame = requestAnimationFrame(step)
      animationFrames.push(frame)
    }
  }

  const frame = requestAnimationFrame(step)
  animationFrames.push(frame)
}

function getRangeWordCount(articles: Article[], startOffset: number, endOffset: number): number {
  const today = new Date()
  const rangeEnd = new Date(today)
  rangeEnd.setDate(today.getDate() - startOffset)
  rangeEnd.setHours(23, 59, 59, 999)
  const rangeStart = new Date(today)
  rangeStart.setDate(today.getDate() - endOffset)
  rangeStart.setHours(0, 0, 0, 0)

  return articles
    .filter((article) => {
      const createdAt = new Date(article.createdAt)
      return createdAt >= rangeStart && createdAt <= rangeEnd
    })
    .reduce((sum, article) => sum + getArticleWordCount(article), 0)
}

const metrics = computed<InsightMetric[]>(() => {
  const articles = props.articles
  if (articles.length === 0) {
    return []
  }

  const hourCounts = new Map<number, number>()
  const dayCounts = new Map<number, number>()
  const categoryCounts = new Map<string, number>()

  for (const article of articles) {
    const createdAt = new Date(article.createdAt)
    const wordCount = getArticleWordCount(article)
    hourCounts.set(createdAt.getHours(), (hourCounts.get(createdAt.getHours()) ?? 0) + 1)
    dayCounts.set(createdAt.getDay(), (dayCounts.get(createdAt.getDay()) ?? 0) + 1)
    categoryCounts.set(article.categoryId ?? '__uncategorized', (categoryCounts.get(article.categoryId ?? '__uncategorized') ?? 0) + 1)
    if (wordCount === 0) {
      continue
    }
  }

  const peakHour = [...hourCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 0
  const peakDay = [...dayCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 0
  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  const totalWords = articles.reduce((sum, article) => sum + getArticleWordCount(article), 0)
  const averageLength = Math.round(totalWords / Math.max(articles.length, 1))

  const longestArticle = [...articles].sort(
    (left, right) => getArticleWordCount(right) - getArticleWordCount(left),
  )[0]
  const longestWordCount = longestArticle ? getArticleWordCount(longestArticle) : 0

  const recentWords = getRangeWordCount(articles, 0, 6)
  const previousWords = getRangeWordCount(articles, 7, 13)
  const trendValue = previousWords === 0
    ? (recentWords > 0 ? 100 : 0)
    : Math.round(((recentWords - previousWords) / previousWords) * 100)

  const activeCategoryId = [...categoryCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '__uncategorized'
  const activeCategory = activeCategoryId === '__uncategorized'
    ? '未分类'
    : props.categories.find((category) => category.id === activeCategoryId)?.name ?? '未分类'

  return [
    {
      key: 'peakHour',
      label: '最高产时段',
      value: `${String(peakHour).padStart(2, '0')}:00-${String((peakHour + 1) % 24).padStart(2, '0')}:00`,
      icon: Clock3,
      tone: 'red',
    },
    {
      key: 'peakDay',
      label: '最高产星期',
      value: weekNames[peakDay],
      icon: CalendarDays,
      tone: 'blue',
    },
    {
      key: 'avgLength',
      label: '平均文章长度',
      value: formatWordCount(averageLength),
      icon: FileText,
      tone: 'green',
      numericTarget: averageLength,
      formatNumeric: formatWordCount,
    },
    {
      key: 'longest',
      label: '最长文章',
      value: longestArticle?.title || '未命名文稿',
      subtitle: formatWordCount(longestWordCount),
      icon: Award,
      tone: 'amber',
    },
    {
      key: 'trend',
      label: '写作速度趋势',
      value: `${trendValue >= 0 ? '+' : ''}${trendValue}%`,
      subtitle: `近 7 天 ${recentWords} 字 / 前 7 天 ${previousWords} 字`,
      icon: trendValue >= 0 ? TrendingUp : TrendingDown,
      tone: trendValue >= 0 ? 'purple' : 'teal',
      numericTarget: trendValue,
      formatNumeric: (value) => `${value >= 0 ? '+' : ''}${value}%`,
    },
    {
      key: 'category',
      label: '最活跃分类',
      value: activeCategory,
      icon: FolderOpen,
      tone: 'teal',
    },
  ]
})

watch(
  metrics,
  (nextMetrics) => {
    cancelAnimations()
    const nextValues: Record<string, number> = {}

    for (const metric of nextMetrics) {
      if (metric.numericTarget === undefined) {
        continue
      }
      nextValues[metric.key] = animatedValues.value[metric.key] ?? 0
      animateMetricValue(metric.key, metric.numericTarget)
    }

    animatedValues.value = {
      ...animatedValues.value,
      ...nextValues,
    }
  },
  { immediate: true },
)

onBeforeUnmount(cancelAnimations)
</script>

<template>
  <section class="insight-card productivity-card">
    <div class="insight-eyebrow">
      Productivity Insights
    </div>
    <h3 class="insight-heading productivity-card__heading">
      <BarChart3 :size="18" />
      生产力洞察
    </h3>

    <div
      v-if="metrics.length === 0"
      class="insight-empty"
    >
      <BarChart3
        :size="32"
        class="insight-empty__icon"
      />
      <p class="insight-empty__text">
        数据不足以生成洞察，请创建更多文章。
      </p>
    </div>

    <div
      v-else
      class="productivity-grid"
    >
      <article
        v-for="metric in metrics"
        :key="metric.key"
        class="productivity-metric"
        :class="`is-${metric.tone}`"
      >
        <div class="productivity-metric__icon">
          <component
            :is="metric.icon"
            :size="16"
          />
        </div>
        <p class="productivity-metric__label">
          {{ metric.label }}
        </p>
        <p class="productivity-metric__value text-clamp-2">
          {{
            metric.numericTarget !== undefined && metric.formatNumeric
              ? metric.formatNumeric(animatedValues[metric.key] ?? 0)
              : metric.value
          }}
        </p>
        <p
          v-if="metric.subtitle"
          class="productivity-metric__subtitle text-clamp-2"
        >
          {{ metric.subtitle }}
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.productivity-card__heading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
}

.productivity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.productivity-metric {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(96, 125, 139, 0.1);
  background: rgba(248, 250, 252, 0.72);
}

.productivity-metric__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  margin-bottom: 10px;
}

.productivity-metric__label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #90a4ae;
}

.productivity-metric__value {
  margin: 8px 0 0;
  font-size: 17px;
  font-weight: 700;
  color: #263238;
  line-height: 1.3;
}

.productivity-metric__subtitle {
  margin: 6px 0 0;
  font-size: 11px;
  color: #607d8b;
  line-height: 1.5;
}

.productivity-metric.is-red .productivity-metric__icon {
  background: rgba(211, 47, 47, 0.12);
  color: #d32f2f;
}

.productivity-metric.is-blue .productivity-metric__icon {
  background: rgba(21, 101, 192, 0.12);
  color: #1565c0;
}

.productivity-metric.is-green .productivity-metric__icon {
  background: rgba(46, 125, 50, 0.12);
  color: #2e7d32;
}

.productivity-metric.is-amber .productivity-metric__icon {
  background: rgba(245, 124, 0, 0.12);
  color: #f57c00;
}

.productivity-metric.is-purple .productivity-metric__icon {
  background: rgba(123, 31, 162, 0.12);
  color: #7b1fa2;
}

.productivity-metric.is-teal .productivity-metric__icon {
  background: rgba(0, 105, 92, 0.12);
  color: #00695c;
}

@media (max-width: 767px) {
  .productivity-grid {
    grid-template-columns: 1fr;
  }
}

[data-theme='dark'] .productivity-metric {
  border-color: rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.42);
}

[data-theme='dark'] .productivity-metric__label,
[data-theme='dark'] .productivity-metric__subtitle {
  color: #94a3b8;
}

[data-theme='dark'] .productivity-metric__value {
  color: #f1f5f9;
}
</style>
