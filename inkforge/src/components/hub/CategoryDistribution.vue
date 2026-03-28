<script setup lang="ts">
import { computed } from 'vue'
import type { Article, Category } from '@/types'
import { PieChart } from 'lucide-vue-next'

interface CategorySlice {
  id: string
  name: string
  count: number
  color: string
  percentage: number
}

interface ArcPath {
  d: string
  color: string
  name: string
  count: number
  percentage: number
}

const props = defineProps<{
  articles: Article[]
  categories: Category[]
}>()

const CATEGORY_COLORS = [
  '#D32F2F',
  '#1565C0',
  '#2E7D32',
  '#F57C00',
  '#7B1FA2',
  '#00695C',
  '#E91E63',
  '#FF5722',
] as const

function buildCategoryDistribution(categories: Category[], articles: Article[]): CategorySlice[] {
  const total = articles.length
  if (total === 0) return []

  const slices: CategorySlice[] = []

  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index]
    const count = articles.filter((article) => article.categoryId === category.id).length
    if (count === 0) continue
    slices.push({
      id: category.id,
      name: category.name,
      count,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      percentage: Math.round((count / total) * 100),
    })
  }

  const uncategorized = articles.filter((article) => !article.categoryId).length
  if (uncategorized > 0) {
    slices.push({
      id: '__uncategorized',
      name: '未分类',
      count: uncategorized,
      color: '#B0BEC5',
      percentage: Math.round((uncategorized / total) * 100),
    })
  }

  slices.sort((left, right) => right.count - left.count)
  return slices
}

const categorySlices = computed(() => buildCategoryDistribution(props.categories, props.articles))

const donutArcs = computed<ArcPath[]>(() => {
  const slices = categorySlices.value
  if (slices.length === 0) return []

  const total = slices.reduce((sum, slice) => sum + slice.count, 0)
  const cx = 100
  const cy = 100
  const r = 80
  const innerR = 55

  const arcs: ArcPath[] = []
  let currentAngle = -Math.PI / 2

  for (const slice of slices) {
    const sliceAngle = (slice.count / total) * 2 * Math.PI
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle

    const x1Outer = cx + r * Math.cos(startAngle)
    const y1Outer = cy + r * Math.sin(startAngle)
    const x2Outer = cx + r * Math.cos(endAngle)
    const y2Outer = cy + r * Math.sin(endAngle)

    const x1Inner = cx + innerR * Math.cos(endAngle)
    const y1Inner = cy + innerR * Math.sin(endAngle)
    const x2Inner = cx + innerR * Math.cos(startAngle)
    const y2Inner = cy + innerR * Math.sin(startAngle)

    const largeArc = sliceAngle > Math.PI ? 1 : 0

    const d = [
      `M ${x1Outer} ${y1Outer}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
      `L ${x1Inner} ${y1Inner}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
      'Z',
    ].join(' ')

    arcs.push({
      d,
      color: slice.color,
      name: slice.name,
      count: slice.count,
      percentage: slice.percentage,
    })

    currentAngle = endAngle
  }

  return arcs
})
</script>

<template>
  <section class="distribution-card">
    <div class="distribution-card__header">
      <PieChart :size="18" />
      <h3 class="distribution-card__title">
        分类分布
      </h3>
    </div>

    <div
      v-if="props.articles.length === 0"
      class="insight-empty"
    >
      <PieChart
        :size="32"
        class="insight-empty__icon"
      />
      <p class="insight-empty__text">
        为文章指定分类后，分布图将自动生成。
      </p>
    </div>
    <div
      v-else
      class="distribution-card__body"
    >
      <div class="distribution-chart">
        <svg
          viewBox="0 0 200 200"
          class="donut-svg"
        >
          <path
            v-for="arc in donutArcs"
            :key="arc.name"
            :d="arc.d"
            :fill="arc.color"
            stroke="white"
            stroke-width="2"
            class="donut-slice"
          >
            <title>{{ arc.name }}：{{ arc.count }} 篇 ({{ arc.percentage }}%)</title>
          </path>
        </svg>
        <div class="donut-center">
          <div class="donut-center__count">
            {{ props.articles.length }}
          </div>
          <div class="donut-center__label">
            篇文章
          </div>
        </div>
      </div>

      <div class="distribution-legend">
        <div
          v-for="slice in categorySlices"
          :key="slice.id"
          class="legend-item"
        >
          <div
            class="legend-dot"
            :style="{ background: slice.color }"
          />
          <span class="legend-name">{{ slice.name }}</span>
          <span class="legend-count">{{ slice.count }}</span>
          <span class="legend-pct">{{ slice.percentage }}%</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.distribution-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #eceff1;
  border-radius: 16px;
  padding: 24px;
  flex: 1;
}

.distribution-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.distribution-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #263238;
}

.distribution-card__body {
  display: flex;
  align-items: center;
  gap: 24px;
}

.distribution-chart {
  position: relative;
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}

.donut-svg {
  width: 100%;
  height: 100%;
}

.donut-slice {
  transition: opacity 0.15s ease;
  cursor: default;
}

.donut-slice:hover {
  opacity: 0.8;
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.donut-center__count {
  font-size: 28px;
  font-weight: 700;
  color: #263238;
  line-height: 1;
}

.donut-center__label {
  font-size: 11px;
  color: #90a4ae;
  margin-top: 4px;
}

.distribution-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-name {
  color: #263238;
  font-weight: 500;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-count {
  color: #607d8b;
  font-weight: 600;
}

.legend-pct {
  color: #90a4ae;
  min-width: 32px;
  text-align: right;
}

@media (max-width: 767px) {
  .distribution-card__body {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
