<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, FileText, Target, Timer } from 'lucide-vue-next'
import type { FocusSessionSummary } from '@/stores/writingAssist'
import { formatDuration } from '@/services/writing-assist/stats'

const props = defineProps<{
  summary: FocusSessionSummary | null
  todayWords: number
  dailyTarget?: number
}>()

const emit = defineEmits<{
  continueWriting: []
  returnHub: []
}>()

const progressPercent = computed(() => Math.max(0, Math.min(100, props.summary?.goalProgressAfter ?? 0)))
const progressStyle = computed<Record<string, string>>(() => ({ width: `${progressPercent.value}%` }))
const title = computed(() => props.summary?.dailyGoalAchieved ? '今日目标已达成' : '专注写作已完成')

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="summary"
      class="focus-summary-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-summary-title"
    >
      <section class="focus-summary-modal">
        <header class="focus-summary-header">
          <p class="focus-summary-eyebrow">
            专注总结
          </p>
          <h2
            id="focus-summary-title"
            :class="{ achieved: summary.dailyGoalAchieved }"
          >
            {{ title }}
          </h2>
        </header>

        <div class="focus-summary-metrics">
          <article>
            <Timer :size="18" />
            <span>持续时间</span>
            <strong>{{ formatDuration(summary.durationSeconds) }}</strong>
          </article>
          <article>
            <FileText :size="18" />
            <span>新增字数</span>
            <strong>{{ summary.wordsAdded >= 0 ? '+' : '' }}{{ formatCount(summary.wordsAdded) }}</strong>
          </article>
          <article>
            <Target :size="18" />
            <span>今日进度</span>
            <strong>{{ Math.round(summary.goalProgressBefore) }}% <ArrowRight :size="13" /> {{ Math.round(summary.goalProgressAfter) }}%</strong>
          </article>
        </div>

        <div
          class="focus-summary-progress"
          :class="{ achieved: summary.dailyGoalAchieved }"
        >
          <div class="focus-summary-track">
            <div
              class="focus-summary-fill"
              :style="progressStyle"
            />
          </div>
          <span>
            今日 {{ formatCount(todayWords) }}<template v-if="dailyTarget"> / {{ formatCount(dailyTarget) }}</template> 字
          </span>
        </div>

        <footer class="focus-summary-actions">
          <button
            type="button"
            class="summary-secondary"
            @click="emit('returnHub')"
          >
            返回首页
          </button>
          <button
            type="button"
            class="summary-primary"
            autofocus
            @click="emit('continueWriting')"
          >
            继续写作
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.focus-summary-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(38, 50, 56, 0.28);
  backdrop-filter: blur(8px);
}

.focus-summary-modal {
  width: min(520px, 100%);
  padding: 26px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 24px;
  background: linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 100%);
  color: #263238;
  box-shadow: 0 30px 80px rgba(38, 50, 56, 0.24);
}

.focus-summary-header {
  margin-bottom: 20px;
}

.focus-summary-eyebrow {
  margin: 0 0 4px;
  color: #90A4AE;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.focus-summary-header h2 {
  margin: 0;
  color: #263238;
  font-size: 25px;
  line-height: 1.15;
}

.focus-summary-header h2.achieved {
  color: #B45309;
}

.focus-summary-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.focus-summary-metrics article {
  display: grid;
  gap: 7px;
  min-height: 112px;
  padding: 14px;
  border: 1px solid rgba(236, 239, 241, 0.9);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}

.focus-summary-metrics svg {
  color: #D32F2F;
}

.focus-summary-metrics span {
  color: #78909C;
  font-size: 11px;
  font-weight: 800;
}

.focus-summary-metrics strong {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #263238;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.focus-summary-progress {
  margin-top: 18px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.64);
}

.focus-summary-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #ECEFF1;
}

.focus-summary-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #607D8B 0%, #1976D2 60%, #2E7D32 100%);
  transition: width 0.28s ease;
}

.focus-summary-progress.achieved .focus-summary-fill {
  background: linear-gradient(90deg, #B45309 0%, #F59E0B 100%);
  animation: focus-goal-pulse 1.2s ease-in-out 3;
}

.focus-summary-progress span {
  display: block;
  margin-top: 8px;
  color: #607D8B;
  font-size: 12px;
  font-weight: 800;
}

.focus-summary-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.focus-summary-actions button {
  height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.summary-secondary {
  border: 1px solid #CFD8DC;
  background: #FFFFFF;
  color: #455A64;
}

.summary-primary {
  border: 1px solid #263238;
  background: #263238;
  color: #FFFFFF;
}

@keyframes focus-goal-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.38); }
  50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
}

@media (max-width: 620px) {
  .focus-summary-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
