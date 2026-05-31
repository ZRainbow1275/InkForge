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
          <span
            class="heatmap-summary-divider"
            aria-hidden="true"
          >·</span>
          {{ totalArticles }} 篇 · {{ totalWords }} 字
        </span>
        <span
          class="heatmap-scale"
          aria-hidden="true"
        >
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
    radial-gradient(ellipse 200px 80px at 100% 0%, var(--ember-soft) 0%, transparent 70%),
    var(--bg-rice-paper);
  border: 1px solid var(--hairline);
}

.heatmap-cell {
  min-width: 0;
  min-height: 0;
  border-radius: 5px;
  background: var(--bg-surface);
  box-shadow: inset 0 0 0 1px var(--hairline);
  transition: transform var(--motion-fast) var(--ease-out-quart), box-shadow var(--motion-fast) var(--ease-out-quart);
  cursor: default;
}

.heatmap-cell:hover {
  transform: scale(1.18);
  box-shadow: inset 0 0 0 1px var(--ember-border), var(--elev-1);
  z-index: 2;
  position: relative;
}

.heatmap-cell.level-1 { background: color-mix(in srgb, var(--ember) 24%, transparent); box-shadow: inset 0 0 0 1px var(--ember-border); }
.heatmap-cell.level-2 { background: color-mix(in srgb, var(--ember) 48%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ember) 34%, transparent); }
.heatmap-cell.level-3 { background: color-mix(in srgb, var(--ember) 72%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ember) 46%, transparent); }
.heatmap-cell.level-4 { background: var(--ember); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ember) 60%, transparent); }

.heatmap-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px;
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.heatmap-summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.heatmap-summary strong {
  color: var(--ember);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}
.heatmap-summary-divider {
  color: var(--text-muted);
  margin: 0 2px;
}

.heatmap-scale {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.heatmap-scale-label {
  font-size: 10px;
  color: var(--text-muted);
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
</style>