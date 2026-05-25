<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  BarChart2,
  Coffee,
  Focus,
  Leaf,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Target,
  Timer,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-vue-next'
import {
  useWritingAssistStore,
  type AmbientSoundType,
} from '@/stores/writingAssist'
import { formatDuration } from '@/services/writing-assist/stats'

const props = defineProps<{
  currentDocumentWords: number
  todayWords: number
  weeklyWords: number
  documentTarget?: number
  dailyTarget?: number
  weeklyTarget?: number
  documentPercent?: number
  dailyPercent?: number
  weeklyPercent?: number
  isFocusMode: boolean
  typewriterMode: boolean
}>()

const emit = defineEmits<{
  toggleFocus: []
  toggleTypewriter: []
}>()

const writingAssistStore = useWritingAssistStore()
const {
  ambientSound,
  ambientSoundName,
  pomodoroState,
  pomodoroTimeDisplay,
  stats,
  vignette,
} = storeToRefs(writingAssistStore)

const soundOptions: ReadonlyArray<{ type: AmbientSoundType; label: string; icon: LucideIcon }> = [
  { type: 'rain', label: '雨声', icon: Waves },
  { type: 'cafe', label: '咖啡馆', icon: Coffee },
  { type: 'whitenoise', label: '白噪声', icon: Wind },
  { type: 'nature', label: '自然声', icon: Leaf },
]

const goalRows = computed(() => [
  {
    label: '当前文稿',
    current: props.currentDocumentWords,
    target: props.documentTarget,
    percent: props.documentPercent,
  },
  {
    label: '今日',
    current: props.todayWords,
    target: props.dailyTarget,
    percent: props.dailyPercent,
  },
  {
    label: '本周',
    current: props.weeklyWords,
    target: props.weeklyTarget,
    percent: props.weeklyPercent,
  },
])

const pomodoroPhaseLabel = computed(() => {
  switch (pomodoroState.value.phase) {
    case 'running':
      return '写作中'
    case 'paused':
      return '已暂停'
    case 'break':
      return '短休息'
    case 'long_break':
      return '长休息'
    case 'idle':
      return '就绪'
    default:
      return '就绪'
  }
})

const estimatedGoalLabel = computed(() => {
  if (stats.value.estimatedMinutesToGoal === null) {
    return '暂无估算'
  }

  return `距目标约 ${stats.value.estimatedMinutesToGoal} 分钟`
})

function progressStyle(percent: number | undefined): Record<string, string> {
  return { width: `${Math.max(0, Math.min(100, percent ?? 0))}%` }
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatPercent(value: number | undefined): string {
  return typeof value === 'number' ? `${value}%` : '未设置'
}

async function toggleSound(type: AmbientSoundType): Promise<void> {
  if (ambientSound.value.currentSound === type && ambientSound.value.isPlaying) {
    await writingAssistStore.stopSound()
    return
  }

  await writingAssistStore.playSound(type)
}
</script>

<template>
  <section
    class="writing-assist-panel"
    aria-label="写作辅助"
  >
    <header class="writing-assist-header">
      <div>
        <h3>写作辅助</h3>
      </div>
      <button
        type="button"
        class="assist-focus-btn"
        :class="{ active: isFocusMode }"
        :title="isFocusMode ? '退出专注模式' : '进入专注模式'"
        @click="emit('toggleFocus')"
      >
        <Focus :size="15" />
        {{ isFocusMode ? '退出' : '专注' }}
      </button>
    </header>

    <div class="assist-grid">
      <article class="assist-card primary">
        <div class="assist-card-label">
          <Target :size="14" /> 当前文稿
        </div>
        <strong>{{ formatCount(currentDocumentWords) }}</strong>
        <span>{{ estimatedGoalLabel }}</span>
      </article>
      <article class="assist-card">
        <div class="assist-card-label">
          <BarChart2 :size="14" /> 每分钟字数
        </div>
        <strong>{{ stats.wpm }}</strong>
        <span>本轮 {{ formatDuration(stats.sessionSeconds) }}</span>
      </article>
    </div>

    <div class="assist-section">
      <div class="assist-section-title">
        写作目标
      </div>
      <div
        v-for="row in goalRows"
        :key="row.label"
        class="goal-row"
      >
        <div class="goal-row-top">
          <span>{{ row.label }}</span>
          <span>{{ formatCount(row.current) }}<template v-if="row.target"> / {{ formatCount(row.target) }}</template></span>
        </div>
        <div
          class="goal-track"
          :aria-label="`${row.label} ${formatPercent(row.percent)}`"
        >
          <div
            class="goal-fill"
            :class="{ complete: (row.percent ?? 0) >= 100 }"
            :style="progressStyle(row.percent)"
          />
        </div>
      </div>
    </div>

    <div class="assist-section split">
      <button
        type="button"
        class="assist-toggle"
        :class="{ active: typewriterMode }"
        @click="emit('toggleTypewriter')"
      >
        打字机模式
        <span>{{ typewriterMode ? '开启' : '关闭' }}</span>
      </button>
      <button
        type="button"
        class="assist-toggle"
        :class="{ active: vignette.isEnabled }"
        @click="writingAssistStore.setVignetteEnabled(!vignette.isEnabled)"
      >
        暗角聚焦
        <span>{{ vignette.isEnabled ? `${vignette.height}px` : '关闭' }}</span>
      </button>
      <label
        class="assist-range"
        :class="{ disabled: !vignette.isEnabled }"
      >
        <span>暗角高度</span>
        <input
          type="range"
          min="40"
          max="200"
          step="10"
          :disabled="!vignette.isEnabled"
          :value="vignette.height"
          @input="writingAssistStore.setVignetteHeight(Number(($event.target as HTMLInputElement).value))"
        >
      </label>
    </div>

    <div class="assist-section pomodoro-card">
      <div class="pomodoro-display">
        <Timer :size="16" />
        <div>
          <strong>{{ pomodoroTimeDisplay }}</strong>
          <span>{{ pomodoroPhaseLabel }} · 已完成 {{ pomodoroState.completedPomodoros }} 轮</span>
        </div>
      </div>
      <div class="pomodoro-actions">
        <button
          type="button"
          @click="writingAssistStore.startPomodoro()"
        >
          <Play :size="13" /> 开始
        </button>
        <button
          type="button"
          @click="writingAssistStore.pausePomodoro()"
        >
          <Pause :size="13" /> 暂停
        </button>
        <button
          type="button"
          @click="writingAssistStore.resetPomodoro()"
        >
          <RotateCcw :size="13" /> 重置
        </button>
        <button
          type="button"
          @click="writingAssistStore.skipToNextPhase()"
        >
          <SkipForward :size="13" /> 跳过
        </button>
      </div>
    </div>

    <div class="assist-section ambient-card">
      <div class="ambient-header">
        <span>{{ ambientSound.isPlaying ? ambientSoundName : '环境音' }}</span>
        <Volume2
          v-if="ambientSound.isPlaying"
          :size="14"
        />
        <VolumeX
          v-else
          :size="14"
        />
      </div>
      <div class="sound-grid">
        <button
          v-for="sound in soundOptions"
          :key="sound.type"
          type="button"
          :class="{ active: ambientSound.currentSound === sound.type && ambientSound.isPlaying }"
          @click="void toggleSound(sound.type)"
        >
          <component
            :is="sound.icon"
            :size="13"
          />
          {{ sound.label }}
        </button>
      </div>
      <label class="assist-range">
        <span>音量 {{ Math.round(ambientSound.volume * 100) }}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="ambientSound.volume"
          @input="writingAssistStore.setVolume(Number(($event.target as HTMLInputElement).value))"
        >
      </label>
      <p
        v-if="ambientSound.error"
        class="ambient-error"
      >
        {{ ambientSound.error }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.writing-assist-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.writing-assist-header,
.assist-card-label,
.pomodoro-display,
.pomodoro-actions,
.ambient-header,
.sound-grid,
.assist-toggle,
.goal-row-top {
  display: flex;
  align-items: center;
}

.writing-assist-header {
  justify-content: space-between;
  gap: 12px;
}

.writing-assist-header h3 {
  margin: 0;
  color: #607D8B;
  font-size: 12px;
  font-weight: 600;
}

.assist-focus-btn,
.assist-toggle,
.pomodoro-actions button,
.sound-grid button {
  border: 1px solid #ECEFF1;
  background: #FFFFFF;
  color: #37474F;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.assist-focus-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.assist-focus-btn:hover,
.assist-toggle:hover,
.pomodoro-actions button:hover,
.sound-grid button:hover {
  transform: translateY(-1px);
  border-color: rgba(211, 47, 47, 0.32);
}

.assist-focus-btn.active,
.assist-toggle.active,
.sound-grid button.active {
  background: #263238;
  border-color: #263238;
  color: #FFFFFF;
}

.assist-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.assist-card,
.assist-section {
  border: 1px solid #ECEFF1;
  border-radius: 14px;
  background: #FFFFFF;
  box-shadow: 0 10px 28px rgba(38, 50, 56, 0.04);
}

.assist-card {
  padding: 12px;
}

.assist-card.primary {
  background: linear-gradient(135deg, #FFFFFF 0%, #FFF7ED 100%);
}

.assist-card-label {
  gap: 6px;
  margin-bottom: 8px;
  color: #90A4AE;
  font-size: 11px;
  font-weight: 500;
}

.assist-card strong {
  display: block;
  color: #263238;
  font-size: 22px;
  line-height: 1;
}

.assist-card span {
  display: block;
  margin-top: 6px;
  color: #90A4AE;
  font-size: 11px;
  font-weight: 500;
}

.assist-section {
  padding: 12px;
}

.assist-section-title {
  margin-bottom: 10px;
  color: #607D8B;
  font-size: 12px;
  font-weight: 600;
}

.goal-row + .goal-row {
  margin-top: 10px;
}

.goal-row-top {
  justify-content: space-between;
  gap: 8px;
  color: #90A4AE;
  font-size: 11px;
  font-weight: 500;
}

.goal-track {
  height: 7px;
  margin-top: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #ECEFF1;
}

.goal-fill {
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #607D8B 0%, #1976D2 58%, #2E7D32 100%);
  transition: width 0.25s ease;
}

.goal-fill.complete {
  background: linear-gradient(90deg, #B45309 0%, #F59E0B 100%);
}

.assist-section.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.assist-toggle {
  justify-content: space-between;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 600;
}

.assist-toggle span {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.72;
}

.assist-range {
  grid-column: 1 / -1;
  display: grid;
  gap: 7px;
  color: #90A4AE;
  font-size: 11px;
  font-weight: 500;
}

.assist-range.disabled {
  opacity: 0.48;
}

.assist-range input {
  width: 100%;
  accent-color: #D32F2F;
}

.pomodoro-card,
.ambient-card {
  display: grid;
  gap: 11px;
}

.pomodoro-display {
  gap: 10px;
  color: #37474F;
}

.pomodoro-display strong {
  display: block;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.pomodoro-display span {
  display: block;
  color: #90A4AE;
  font-size: 11px;
  font-weight: 500;
}

.pomodoro-actions,
.sound-grid {
  flex-wrap: wrap;
  gap: 7px;
}

.pomodoro-actions button,
.sound-grid button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.ambient-header {
  justify-content: space-between;
  color: #607D8B;
  font-size: 12px;
  font-weight: 600;
}

.ambient-error {
  margin: 0;
  color: #B91C1C;
  font-size: 11px;
  line-height: 1.45;
}
</style>
