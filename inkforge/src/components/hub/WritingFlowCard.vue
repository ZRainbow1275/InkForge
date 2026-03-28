<script setup lang="ts">
import { computed } from 'vue'
import { BarChart3 } from 'lucide-vue-next'
import type { Article } from '@/types'
import DayDetailPopover from './DayDetailPopover.vue'

interface WritingFlowCardProps {
  counts: number[]
  labels: string[]
  todayIndex: number
  selectedIndex: number | null
  selectedArticles: Article[]
  selectedDayTitle: string
  anchorRect: globalThis.DOMRect | null
  weeklyTotal: number
}

const props = defineProps<WritingFlowCardProps>()

const emit = defineEmits<{
  (e: 'select-day', index: number, event: MouseEvent): void
  (e: 'open-article', articleId: string): void
  (e: 'close-popover'): void
}>()

const maxCount = computed(() => Math.max(...props.counts, 1))

function getBarHeight(count: number): string {
  const minHeight = 8
  const percentage = (count / maxCount.value) * 100
  return `${Math.max(percentage, minHeight)}%`
}

function handleBarClick(index: number, event: MouseEvent) {
  emit('select-day', index, event)
}
</script>

<template>
  <section class="writing-flow-card">
    <div class="writing-flow-card__header">
      <div>
        <h2 class="writing-flow-card__title">
          <BarChart3 :size="18" />
          <span>创作流</span>
        </h2>
        <p class="writing-flow-card__subtitle">
          本周产出 {{ props.weeklyTotal }} 篇
        </p>
      </div>
    </div>

    <div class="chart-grid">
      <div
        v-for="(count, index) in props.counts"
        :key="`bar-${index}`"
        class="chart-bar-wrapper"
      >
        <button
          type="button"
          class="chart-bar"
          :class="{
            active: index === props.todayIndex,
            selected: index === props.selectedIndex,
          }"
          :style="{ height: getBarHeight(count) }"
          :title="`${props.labels[index]}：${count} 篇`"
          @click="handleBarClick(index, $event)"
        >
          <span class="chart-tooltip">{{ count }} 篇</span>
        </button>
      </div>

      <div
        v-for="label in props.labels"
        :key="`label-${label}`"
        class="chart-label"
      >
        {{ label }}
      </div>
    </div>

    <DayDetailPopover
      :visible="props.selectedIndex !== null"
      :date-title="props.selectedDayTitle"
      :articles="props.selectedArticles"
      :anchor-rect="props.anchorRect"
      @close="emit('close-popover')"
      @open-article="emit('open-article', $event)"
    />
  </section>
</template>

<style scoped>
.writing-flow-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  min-height: 360px;
  padding: 28px;
  border-radius: 20px;
  color: #fff;
  background:
    radial-gradient(circle at 85% 20%, rgba(255, 255, 255, 0.16), transparent 28%),
    linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
  box-shadow: 0 18px 36px rgba(211, 47, 47, 0.18);
}

.writing-flow-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.writing-flow-card__title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
}

.writing-flow-card__subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: 1fr auto;
  gap: 0 10px;
  flex: 1;
  min-height: 220px;
  padding-top: 8px;
  align-items: end;
}

.chart-bar-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 100%;
}

.chart-bar {
  width: 100%;
  max-width: 48px;
  min-height: 12px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px 6px 0 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
  position: relative;
  padding: 0;
}

.chart-bar:hover,
.chart-bar.selected {
  background: rgba(255, 255, 255, 0.88);
}

.chart-bar.active {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
}

.chart-bar.selected {
  transform: translateY(-4px);
}

.chart-tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #d32f2f;
  background: rgba(255, 255, 255, 0.95);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.chart-bar:hover .chart-tooltip,
.chart-bar.selected .chart-tooltip {
  opacity: 1;
}

.chart-label {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.72;
  padding-top: 10px;
  color: inherit;
}

@media (max-width: 767px) {
  .writing-flow-card {
    min-height: 320px;
    padding: 22px;
  }

  .chart-grid {
    gap: 0 6px;
    min-height: 180px;
  }
}
</style>
