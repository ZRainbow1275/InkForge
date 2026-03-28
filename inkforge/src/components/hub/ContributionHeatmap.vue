<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Article } from '@/types'
import { CalendarDays, Flame } from 'lucide-vue-next'

interface HeatmapCell {
  key: string
  x: number
  y: number
  count: number
  dateLabel: string
  dayOfWeek: number
  weekIndex: number
}

const props = defineProps<{
  articles: Article[]
}>()

const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth)

const visibleWeeks = computed(() => {
  if (viewportWidth.value < 768) return 13
  if (viewportWidth.value < 1024) return 26
  return 52
})

function handleResize() {
  viewportWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildHeatmapData(articles: Article[]): Map<string, number> {
  const data = new Map<string, number>()

  for (const article of articles) {
    const date = new Date(article.updatedAt || article.createdAt)
    const key = formatDateKey(date)
    data.set(key, (data.get(key) ?? 0) + 1)
  }

  return data
}

function getHeatmapColor(count: number): string {
  if (count === 0) return 'var(--heatmap-empty)'
  if (count === 1) return 'var(--heatmap-level-1)'
  if (count === 2) return 'var(--heatmap-level-2)'
  if (count <= 4) return 'var(--heatmap-level-3)'
  return 'var(--heatmap-level-4)'
}

const legendColors = [
  'var(--heatmap-empty)',
  'var(--heatmap-level-1)',
  'var(--heatmap-level-2)',
  'var(--heatmap-level-3)',
  'var(--heatmap-level-4)',
]

const heatmapCells = computed<HeatmapCell[]>(() => {
  const cells: HeatmapCell[] = []
  const data = buildHeatmapData(props.articles)
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1
  const totalWeeks = visibleWeeks.value

  const startDate = new Date(today)
  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - ((totalWeeks - 1) * 7 + todayDow))

  const cellSize = 12
  const cellGap = 3
  const labelOffsetX = 30
  const labelOffsetY = 20

  for (let week = 0; week < totalWeeks; week += 1) {
    for (let day = 0; day < 7; day += 1) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + week * 7 + day)

      if (currentDate > today) {
        continue
      }

      const key = formatDateKey(currentDate)
      const count = data.get(key) ?? 0

      cells.push({
        key,
        x: labelOffsetX + week * (cellSize + cellGap),
        y: labelOffsetY + day * (cellSize + cellGap),
        count,
        dateLabel: currentDate.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        dayOfWeek: day,
        weekIndex: week,
      })
    }
  }

  return cells
})

const monthLabels = computed(() => {
  const labels: Array<{ key: string; x: number; text: string }> = []
  const seen = new Set<string>()
  const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' })

  for (const cell of heatmapCells.value) {
    if (cell.dayOfWeek !== 0) continue
    const date = new Date(cell.key)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    if (seen.has(monthKey)) continue
    seen.add(monthKey)
    labels.push({
      key: monthKey,
      x: cell.x,
      text: monthFormatter.format(date),
    })
  }

  return labels
})

const totalActivities = computed(() =>
  heatmapCells.value.reduce((sum, cell) => sum + cell.count, 0)
)

const svgWidth = computed(() => 30 + visibleWeeks.value * 15)
</script>

<template>
  <section class="heatmap-card">
    <div class="heatmap-card__header">
      <h3 class="heatmap-card__title">
        <Flame :size="18" />
        <span>创作热力图</span>
      </h3>
      <div class="heatmap-card__year-total">
        <strong>{{ totalActivities }}</strong> 次创作活动
      </div>
    </div>

    <div
      v-if="props.articles.length === 0"
      class="insight-empty"
    >
      <CalendarDays
        :size="32"
        class="insight-empty__icon"
      />
      <p class="insight-empty__text">
        还没有写作活动数据，创作后热力图将自动填充。
      </p>
    </div>

    <div
      v-else
      class="heatmap-svg-wrapper"
    >
      <svg
        :viewBox="`0 0 ${svgWidth} 122`"
        class="heatmap-svg"
        :style="{ minWidth: `${svgWidth}px` }"
        preserveAspectRatio="xMinYMin meet"
      >
        <text
          v-for="label in monthLabels"
          :key="label.key"
          :x="label.x"
          y="12"
          fill="var(--text-muted)"
          font-size="9"
        >
          {{ label.text }}
        </text>

        <text
          x="0"
          y="28"
          fill="var(--text-muted)"
          font-size="9"
        >
          Mon
        </text>
        <text
          x="0"
          y="58"
          fill="var(--text-muted)"
          font-size="9"
        >
          Wed
        </text>
        <text
          x="0"
          y="88"
          fill="var(--text-muted)"
          font-size="9"
        >
          Fri
        </text>

        <rect
          v-for="cell in heatmapCells"
          :key="cell.key"
          :x="cell.x"
          :y="cell.y"
          :width="12"
          :height="12"
          :rx="2"
          :ry="2"
          :fill="getHeatmapColor(cell.count)"
          class="heatmap-cell"
        >
          <title>{{ cell.dateLabel }}：{{ cell.count > 0 ? `${cell.count} 次创作活动` : '无活动' }}</title>
        </rect>
      </svg>
    </div>

    <div
      v-if="props.articles.length > 0"
      class="heatmap-legend"
    >
      <span class="heatmap-legend__label">少</span>
      <div
        v-for="color in legendColors"
        :key="color"
        class="heatmap-legend__cell"
        :style="{ background: color }"
      />
      <span class="heatmap-legend__label">多</span>
    </div>
  </section>
</template>

<style scoped>
.heatmap-card {
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  flex: 2;
}

.heatmap-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.heatmap-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.heatmap-card__year-total {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
}

.heatmap-card__year-total strong {
  color: var(--accent);
  font-weight: 700;
}

.heatmap-svg-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.heatmap-svg {
  width: 100%;
  height: auto;
}

.heatmap-cell {
  transition: opacity 0.1s ease;
  cursor: default;
}

.heatmap-cell:hover {
  opacity: 0.75;
  stroke: var(--text-primary);
  stroke-width: 1;
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 10px;
  color: var(--text-muted);
}

.heatmap-legend__label {
  margin: 0 6px;
}

.heatmap-legend__cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

@media (max-width: 767px) {
  .heatmap-card {
    padding: 20px;
  }

  .heatmap-card__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
