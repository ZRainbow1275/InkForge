<script setup lang="ts">
import { computed } from 'vue'
import type { Article } from '@/types'
import { TrendingUp } from 'lucide-vue-next'
import { formatNumber } from '@/data/quotes'

interface TrendDataPoint {
  date: string
  fullDate: string
  totalWords: number
}

const props = defineProps<{
  articles: Article[]
}>()

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildTrendData(articles: Article[]): TrendDataPoint[] {
  const points: TrendDataPoint[] = []
  const today = new Date()

  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - index)
    date.setHours(23, 59, 59, 999)

    const totalWords = articles
      .filter((article) => new Date(article.createdAt) <= date)
      .reduce((sum, article) => sum + (article.rawContent?.length ?? 0), 0)

    points.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      fullDate: formatDateKey(date),
      totalWords,
    })
  }

  return points
}

const trendData = computed(() => buildTrendData(props.articles))

const maxWords = computed(() =>
  Math.max(...trendData.value.map((point) => point.totalWords), 1)
)

const chartPath = computed(() => {
  const data = trendData.value
  if (data.length === 0) {
    return { line: '', area: '' }
  }

  const xStep = 340 / (data.length - 1)
  const yScale = 110 / maxWords.value

  const points = data.map((point, index) => ({
    x: 50 + index * xStep,
    y: 130 - point.totalWords * yScale,
  }))

  const line = points
    .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(' ')

  const area = `${line} L ${points[points.length - 1].x} 130 L 50 130 Z`

  return { line, area }
})

const yGridLines = computed(() =>
  Array.from({ length: 5 }, (_, index) => {
    const value = Math.round((maxWords.value / 4) * (4 - index))
    return {
      value,
      pos: 20 + index * (110 / 4),
    }
  })
)

const xLabels = computed(() =>
  trendData.value
    .map((point, index) => {
      if (index % 5 !== 0 && index !== trendData.value.length - 1) {
        return null
      }

      return {
        x: 50 + index * (340 / (trendData.value.length - 1)),
        text: point.date,
      }
    })
    .filter((label): label is { x: number; text: string } => label !== null)
)

const currentTotal = computed(() => trendData.value[trendData.value.length - 1]?.totalWords ?? 0)
</script>

<template>
  <section class="trend-card">
    <div class="trend-card__header">
      <h3 class="trend-card__title">
        <TrendingUp :size="18" />
        <span>字数趋势</span>
      </h3>
      <div class="trend-card__current">
        {{ formatNumber(currentTotal) }}
      </div>
    </div>

    <div
      v-if="props.articles.length === 0"
      class="insight-empty"
    >
      <TrendingUp
        :size="32"
        class="insight-empty__icon"
      />
      <p class="insight-empty__text">
        字数趋势将在创建文章后自动生成。
      </p>
    </div>
    <svg
      v-else
      viewBox="0 0 400 160"
      class="trend-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <line
        v-for="line in yGridLines"
        :key="line.value"
        :x1="50"
        :y1="line.pos"
        :x2="390"
        :y2="line.pos"
        stroke="#ECEFF1"
        stroke-width="1"
        stroke-dasharray="4 4"
      />
      <text
        v-for="line in yGridLines"
        :key="`label-${line.value}`"
        :x="46"
        :y="line.pos + 4"
        text-anchor="end"
        fill="#90A4AE"
        font-size="9"
      >
        {{ formatNumber(line.value) }}
      </text>

      <path
        :d="chartPath.area"
        fill="#D32F2F"
        fill-opacity="0.1"
      />
      <path
        :d="chartPath.line"
        fill="none"
        stroke="#D32F2F"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <text
        v-for="(label, index) in xLabels"
        :key="`x-${index}`"
        :x="label.x"
        y="148"
        text-anchor="middle"
        fill="#90A4AE"
        font-size="9"
      >
        {{ label.text }}
      </text>
    </svg>
  </section>
</template>

<style scoped>
.trend-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #eceff1;
  border-radius: 16px;
  padding: 24px;
  flex: 1;
}

.trend-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.trend-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #263238;
  display: flex;
  align-items: center;
  gap: 8px;
}

.trend-card__current {
  font-size: 24px;
  font-weight: 700;
  color: #d32f2f;
}

.trend-svg {
  width: 100%;
  height: auto;
}

</style>
