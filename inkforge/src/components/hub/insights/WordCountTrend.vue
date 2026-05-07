<script setup lang="ts">
import { computed } from 'vue'
import { TrendingUp } from 'lucide-vue-next'
import type { TrendPoint } from './types'
import InsightEmptyState from './InsightEmptyState.vue'

const props = defineProps<{ points: TrendPoint[] }>()

const totalWords = computed(() => props.points.reduce((sum, point) => sum + point.value, 0))
const activeDays = computed(() => props.points.filter(point => point.value > 0).length)
const maxValue = computed(() => Math.max(80, ...props.points.map(point => point.value)))
// 只在累计 >= 100 字 或 活跃日 >= 3 天 时切换到真实柱状，避免单日极小值产生独峰
const hasData = computed(() => totalWords.value >= 100 || activeDays.value >= 3)
</script>

<template>
  <article class="insight-card trend-card">
    <header class="insight-card-head compact">
      <div>
        <p class="insight-eyebrow">
          字数曲线
        </p>
        <h3>字数趋势</h3>
      </div>
    </header>

    <div
      v-if="hasData"
      class="trend-bars"
      aria-label="最近 14 天字数趋势"
    >
      <span
        v-for="point in points"
        :key="point.date"
        class="trend-bar"
        :style="{ height: `${Math.max(8, Math.round(point.value / maxValue * 100))}%` }"
        :title="`${point.label}: ${point.value} 字`"
      />
    </div>
    <div
      v-else
      class="trend-bars trend-bars--placeholder"
      aria-label="暂无字数趋势"
    >
      <svg
        class="trend-curve"
        viewBox="0 0 280 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="trend-empty-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(211, 47, 47, 0.10)" />
            <stop offset="100%" stop-color="rgba(211, 47, 47, 0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,90 C30,82 50,68 80,60 S130,42 160,52 S210,78 240,66 S275,40 280,34 L280,120 L0,120 Z"
          fill="url(#trend-empty-fill)"
        />
        <path
          d="M0,90 C30,82 50,68 80,60 S130,42 160,52 S210,78 240,66 S275,40 280,34"
          fill="none"
          stroke="rgba(211, 47, 47, 0.32)"
          stroke-width="1.4"
          stroke-dasharray="5 4"
          stroke-linecap="round"
        />
      </svg>
      <p class="trend-empty-hint">
        <TrendingUp :size="14" :stroke-width="2" />
        <span>开始写作后将聚合每日字数</span>
      </p>
    </div>
  </article>
</template>

<style scoped>
.trend-bars {
  height: 170px;
  display: flex;
  align-items: flex-end;
  gap: 7px;
  padding-top: 16px;
  position: relative;
}

.trend-bar {
  flex: 1;
  min-width: 6px;
  border-radius: 999px 999px 5px 5px;
  background: linear-gradient(180deg, #D32F2F, #FFB4A8);
}

.trend-bars--placeholder {
  display: block;
  padding: 0;
  position: relative;
  overflow: hidden;
}

.trend-curve {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.trend-empty-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  color: #90A4AE;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.3px;
  pointer-events: none;
}

html.theme-dark .trend-curve path[fill*="url"],
html[data-theme="dark"] .trend-curve path[fill*="url"] {
  opacity: 0.7;
}

html.theme-dark .trend-empty-hint,
html[data-theme="dark"] .trend-empty-hint {
  color: #8590A0;
}
</style>