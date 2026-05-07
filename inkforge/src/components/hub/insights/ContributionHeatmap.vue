<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays } from 'lucide-vue-next'
import type { HeatmapDay } from './types'
import InsightEmptyState from './InsightEmptyState.vue'

const props = defineProps<{ days: HeatmapDay[] }>()

const hasData = computed(() => props.days.some(day => day.count > 0))
const activeDays = computed(() => props.days.filter(day => day.count > 0).length)
const totalArticles = computed(() => props.days.reduce((sum, day) => sum + day.count, 0))
const totalWords = computed(() => props.days.reduce((sum, day) => sum + day.words, 0))

function getLevel(day: HeatmapDay): number {
  if (day.count === 0) return 0
  if (day.words >= 4000 || day.count >= 4) return 4
  if (day.words >= 2000 || day.count >= 3) return 3
  if (day.words >= 800 || day.count >= 2) return 2
  return 1
}
</script>

<template>
  <article class="insight-card contribution-card">
    <header class="insight-card-head">
      <div>
        <p class="insight-eyebrow">
          贡献热力
        </p>
        <h3>写作热力</h3>
      </div>
      <span>{{ days.length }} 天</span>
    </header>

    <div
      v-if="hasData"
      class="heatmap-body"
    >
      <div
        class="heatmap-grid"
        aria-label="最近写作热力"
      >
        <span
          v-for="day in days"
          :key="day.date"
          class="heatmap-cell"
          :class="`level-${getLevel(day)}`"
          :title="`${day.label}: ${day.count} 篇, ${day.words} 字`"
        />
      </div>
      <footer class="heatmap-footer">
        <span class="heatmap-summary">
          <strong>{{ activeDays }}</strong>/{{ days.length }} 天活跃
          <span class="heatmap-summary-divider" aria-hidden="true">·</span>
          {{ totalArticles }} 篇 · {{ totalWords }} 字
        </span>
        <span class="heatmap-scale" aria-hidden="true">
          <span class="heatmap-scale-label">少</span>
          <i class="heatmap-cell heatmap-cell--legend level-0" />
          <i class="heatmap-cell heatmap-cell--legend level-1" />
          <i class="heatmap-cell heatmap-cell--legend level-2" />
          <i class="heatmap-cell heatmap-cell--legend level-3" />
          <i class="heatmap-cell heatmap-cell--legend level-4" />
          <span class="heatmap-scale-label">多</span>
        </span>
      </footer>
    </div>
    <InsightEmptyState
      v-else
      :icon="CalendarDays"
      title="暂无写作热力"
      description="创建或编辑文章后，这里会按真实日期生成热力格。"
    />
  </article>
</template>

<style scoped>
.contribution-card { min-height: 220px; }

.heatmap-body {
  flex: 1;
  min-height: 0;
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.heatmap-grid {
  flex: 1;
  min-height: 120px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: repeat(5, minmax(0, 1fr));
  gap: 6px;
  padding: 12px;
  border-radius: 14px;
  background:
    radial-gradient(ellipse 200px 80px at 100% 0%, rgba(211, 47, 47, 0.05) 0%, transparent 70%),
    linear-gradient(180deg, rgba(250, 248, 244, 0.78) 0%, rgba(255, 255, 255, 0.42) 100%);
  border: 1px solid rgba(176, 190, 197, 0.22);
}

.heatmap-cell {
  min-width: 0;
  min-height: 0;
  border-radius: 5px;
  background: linear-gradient(135deg, #ECEFF1 0%, #DDE4E8 100%);
  box-shadow: inset 0 0 0 1px rgba(38, 50, 56, 0.10);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  cursor: default;
}

.heatmap-cell:hover {
  transform: scale(1.18);
  box-shadow: inset 0 0 0 1px rgba(211, 47, 47, 0.24), 0 2px 8px rgba(38, 50, 56, 0.12);
  z-index: 2;
  position: relative;
}

.heatmap-cell.level-1 { background: linear-gradient(135deg, #FFCDD2 0%, #FFB4B8 100%); box-shadow: inset 0 0 0 1px rgba(211, 47, 47, 0.22); }
.heatmap-cell.level-2 { background: linear-gradient(135deg, #FF8A80 0%, #FF5252 100%); box-shadow: inset 0 0 0 1px rgba(183, 28, 28, 0.34); }
.heatmap-cell.level-3 { background: linear-gradient(135deg, #EF5350 0%, #D32F2F 100%); box-shadow: inset 0 0 0 1px rgba(127, 18, 18, 0.46); }
.heatmap-cell.level-4 { background: linear-gradient(135deg, #C62828 0%, #8E0000 100%); box-shadow: inset 0 0 0 1px rgba(70, 0, 0, 0.55); }

.heatmap-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px;
  font-size: 11px;
  color: #607D8B;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.heatmap-summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.heatmap-summary strong {
  color: #B71C1C;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}
.heatmap-summary-divider {
  color: #B0BEC5;
  margin: 0 2px;
}

.heatmap-scale {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.heatmap-scale-label {
  font-size: 10px;
  color: #90A4AE;
  letter-spacing: 0.08em;
}
.heatmap-cell--legend {
  width: 11px;
  height: 11px;
  flex: none;
  border-radius: 3px;
  cursor: default;
}
.heatmap-cell--legend:hover { transform: none; }

html.theme-dark .heatmap-grid,
html[data-theme="dark"] .heatmap-grid {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%);
}
html.theme-dark .heatmap-cell,
html[data-theme="dark"] .heatmap-cell {
  background: rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}
html.theme-dark .heatmap-cell.level-1,
html[data-theme="dark"] .heatmap-cell.level-1 { background: rgba(239, 83, 80, 0.22); box-shadow: inset 0 0 0 1px rgba(239, 83, 80, 0.18); }
html.theme-dark .heatmap-cell.level-2,
html[data-theme="dark"] .heatmap-cell.level-2 { background: rgba(239, 83, 80, 0.42); box-shadow: inset 0 0 0 1px rgba(239, 83, 80, 0.26); }
html.theme-dark .heatmap-cell.level-3,
html[data-theme="dark"] .heatmap-cell.level-3 { background: rgba(239, 83, 80, 0.65); box-shadow: inset 0 0 0 1px rgba(239, 83, 80, 0.32); }
html.theme-dark .heatmap-cell.level-4,
html[data-theme="dark"] .heatmap-cell.level-4 { background: #EF5350; box-shadow: inset 0 0 0 1px rgba(255, 167, 167, 0.32); }

html.theme-dark .heatmap-footer,
html[data-theme="dark"] .heatmap-footer {
  color: #B5BFCC;
}
html.theme-dark .heatmap-summary strong,
html[data-theme="dark"] .heatmap-summary strong {
  color: #EF9A9A;
}
html.theme-dark .heatmap-summary-divider,
html[data-theme="dark"] .heatmap-summary-divider,
html.theme-dark .heatmap-scale-label,
html[data-theme="dark"] .heatmap-scale-label {
  color: rgba(181, 191, 204, 0.55);
}
</style>