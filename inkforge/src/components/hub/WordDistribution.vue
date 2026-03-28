<script setup lang="ts">
import { computed } from 'vue'
import { BarChart2 } from 'lucide-vue-next'
import type { Article } from '@/types'
import { getArticleWordCount } from './insight-utils'

interface DistributionBucket {
  label: string
  min: number
  max: number
  count: number
  percentage: number
}

const props = defineProps<{
  articles: Article[]
}>()

const bucketRanges = [
  { label: '0-500', min: 0, max: 500 },
  { label: '500-1K', min: 500, max: 1000 },
  { label: '1K-2K', min: 1000, max: 2000 },
  { label: '2K-5K', min: 2000, max: 5000 },
  { label: '5K-10K', min: 5000, max: 10000 },
  { label: '10K+', min: 10000, max: Number.POSITIVE_INFINITY },
] as const

const buckets = computed<DistributionBucket[]>(() => {
  const counts = bucketRanges.map((range) => ({
    ...range,
    count: props.articles.filter((article) => {
      const value = getArticleWordCount(article)
      return value >= range.min && value < range.max
    }).length,
  }))

  const maxCount = Math.max(...counts.map((bucket) => bucket.count), 0)
  return counts.map((bucket) => ({
    ...bucket,
    percentage: maxCount === 0 ? 0 : Math.max(bucket.count === 0 ? 0 : 14, Math.round((bucket.count / maxCount) * 100)),
  }))
})

const hasNoData = computed(() => props.articles.length === 0)
</script>

<template>
  <section class="insight-card word-distribution-card">
    <div class="insight-eyebrow">
      Word Distribution
    </div>
    <h3 class="insight-heading word-distribution-card__heading">
      <BarChart2 :size="18" />
      字数分布
    </h3>

    <div
      v-if="hasNoData"
      class="insight-empty"
    >
      <BarChart2
        :size="32"
        class="insight-empty__icon"
      />
      <p class="insight-empty__text">
        还没有文章数据，字数分布将在创作后自动生成。
      </p>
    </div>

    <div
      v-else
      class="distribution-chart"
    >
      <div
        v-for="bucket in buckets"
        :key="bucket.label"
        class="distribution-column"
      >
        <span class="distribution-column__count">{{ bucket.count }}</span>
        <div class="distribution-column__track">
          <div
            class="distribution-column__bar"
            :style="{ height: `${bucket.percentage}%` }"
          />
        </div>
        <span class="distribution-column__label">{{ bucket.label }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.word-distribution-card__heading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
}

.distribution-chart {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
  min-height: 220px;
}

.distribution-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.distribution-column__count {
  font-size: 12px;
  font-weight: 700;
  color: #607d8b;
}

.distribution-column__track {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: 160px;
  padding: 8px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.8), rgba(236, 239, 241, 0.92));
}

.distribution-column__bar {
  width: min(42px, 100%);
  min-height: 4px;
  border-radius: 14px 14px 8px 8px;
  background: linear-gradient(180deg, #ef5350 0%, #d32f2f 100%);
  box-shadow: 0 10px 18px rgba(211, 47, 47, 0.18);
}

.distribution-column__label {
  font-size: 11px;
  font-weight: 600;
  color: #90a4ae;
}

@media (max-width: 767px) {
  .distribution-chart {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

[data-theme='dark'] .distribution-column__count,
[data-theme='dark'] .distribution-column__label {
  color: #94a3b8;
}

[data-theme='dark'] .distribution-column__track {
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.56), rgba(15, 23, 42, 0.72));
}
</style>
