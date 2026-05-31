<script setup lang="ts">
import { computed } from 'vue'
import { BarChart3 } from 'lucide-vue-next'
import { useCountUp } from '@/composables/useCountUp'
import type { ProductivityMetric } from './types'
import InsightEmptyState from './InsightEmptyState.vue'

const props = defineProps<{ metrics: ProductivityMetric[] }>()

const hasData = computed(() => props.metrics.some(metric => metric.numericValue > 0))
const primaryMetricValue = computed(() => props.metrics[0]?.numericValue ?? 0)
const animatedPrimary = useCountUp(primaryMetricValue, 1000)
</script>

<template>
  <article class="insight-card productivity-card">
    <header class="insight-card-head">
      <div>
        <p class="insight-eyebrow">
          效率指标
        </p>
        <h3>生产力洞察</h3>
      </div>
      <span v-if="hasData">{{ animatedPrimary }}</span>
    </header>

    <div
      v-if="hasData"
      class="productivity-grid"
    >
      <div
        v-for="metric in metrics"
        :key="metric.key"
        class="productivity-metric"
      >
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <p>{{ metric.detail }}</p>
      </div>
    </div>
    <InsightEmptyState
      v-else
      :icon="BarChart3"
      title="积累更多数据后显示"
      description="生产力指标全部基于真实文章时间、字数和分类计算。"
    />
  </article>
</template>

<style scoped>
.productivity-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.productivity-metric {
  padding: 11px 12px;
  border-radius: 14px;
  background: var(--bg-rice-paper);
  border: 1px solid var(--hairline);
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.productivity-metric span {
  display: block;
  color: var(--text-muted);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.productivity-metric strong {
  display: block;
  margin-top: 3px;
  color: var(--text-primary);
  font-size: 19px;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}
.productivity-metric p {
  margin: 3px 0 0;
  color: var(--text-secondary);
  font-size: 11.5px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>