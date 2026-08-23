<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  BarChart2,
  Bird,
  ChevronDown,
  ChevronUp,
  CloudLightning,
  Coffee,
  Flame,
  Focus,
  Keyboard,
  Leaf,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
  Target,
  Timer,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-vue-next'
import {
  useWritingAssistStore,
  type AmbientSoundType,
} from '@/stores/writingAssist'
import { normalizeWritingGoalValue, useSettingsStore } from '@/stores/settings'
import { formatDuration, computeWpm } from '@/services/writing-assist/stats'

const props = withDefaults(defineProps<{
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
  showOverview?: boolean
}>(), {
  showOverview: true,
})

const emit = defineEmits<{
  toggleFocus: []
  toggleTypewriter: []
}>()

type GoalRowKey = 'document' | 'daily' | 'weekly'

interface GoalRow {
  key: GoalRowKey
  label: string
  current: number
  target: number | undefined
  percent: number | undefined
}

type SoundPreset = {
  id: string
  label: string
  sounds: AmbientSoundType[]
}

const writingAssistStore = useWritingAssistStore()
const settingsStore = useSettingsStore()
const {
  ambientSound,
  ambientSoundName,
  pomodoroState,
  pomodoroTimeDisplay,
  stats,
  vignette,
  pomodoroHistory,
  goalStreak,
  wordCountHistory,
  cursorPosition,
} = storeToRefs(writingAssistStore)

const cursorPositionPercent = computed(() => Math.round(cursorPosition.value * 100))
const vignetteIntensityPercent = computed(() => Math.round(
  (Number.isFinite(vignette.value.intensity) ? vignette.value.intensity : 0.18) * 100,
))

const soundOptions: ReadonlyArray<{ type: AmbientSoundType; label: string; icon: LucideIcon }> = [
  { type: 'rain', label: '雨声', icon: Waves },
  { type: 'cafe', label: '咖啡馆', icon: Coffee },
  { type: 'whitenoise', label: '白噪声', icon: Wind },
  { type: 'nature', label: '自然声', icon: Leaf },
  { type: 'thunderstorm', label: '雷暴', icon: CloudLightning },
  { type: 'keyboard', label: '键盘', icon: Keyboard },
  { type: 'fireplace', label: '壁炉', icon: Flame },
  { type: 'birdsong', label: '鸟鸣', icon: Bird },
]

const soundPresets: ReadonlyArray<SoundPreset> = [
  { id: 'night-study', label: '深夜书房', sounds: ['rain', 'keyboard'] },
  { id: 'outdoor-cafe', label: '户外咖啡', sounds: ['cafe', 'birdsong'] },
  { id: 'library', label: '图书馆', sounds: ['whitenoise'] },
]

const showPomodoroConfig = ref(false)
const showSessionHistory = ref(false)
const editingGoalKey = ref<GoalRowKey | null>(null)
const editingGoalValue = ref<string>('')
const goalEditError = ref('')

const goalRows = computed<GoalRow[]>(() => [
  {
    key: 'document',
    label: '当前文稿',
    current: props.currentDocumentWords,
    target: props.documentTarget,
    percent: props.documentPercent,
  },
  {
    key: 'daily',
    label: '今日',
    current: props.todayWords,
    target: props.dailyTarget,
    percent: props.dailyPercent,
  },
  {
    key: 'weekly',
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

const pomodoroRoundsTotal = computed(() => pomodoroState.value.config.longBreakAfter)

const pomodoroRoundsCurrent = computed(() => {
  const total = pomodoroRoundsTotal.value
  if (total <= 0) {
    return 0
  }
  const completed = pomodoroState.value.completedPomodoros
  const inCycle = completed % total
  if (inCycle === 0 && completed > 0) {
    return total
  }
  return inCycle
})

const pomodoroRoundDots = computed(() => {
  const total = pomodoroRoundsTotal.value
  const current = pomodoroRoundsCurrent.value
  return Array.from({ length: total }, (_, index) => index < current)
})

const estimatedGoalLabel = computed(() => {
  if (stats.value.estimatedMinutesToGoal === null) {
    return '暂无估算'
  }

  return `距目标约 ${stats.value.estimatedMinutesToGoal} 分钟`
})

const recentSessions = computed(() => {
  const items = pomodoroHistory.value
  return items.slice(-5).reverse()
})

const localPomodoroConfig = ref({
  workMinutes: pomodoroState.value.config.workMinutes,
  shortBreakMinutes: pomodoroState.value.config.shortBreakMinutes,
  longBreakMinutes: pomodoroState.value.config.longBreakMinutes,
  longBreakAfter: pomodoroState.value.config.longBreakAfter,
})

function openPomodoroConfig(): void {
  localPomodoroConfig.value = {
    workMinutes: pomodoroState.value.config.workMinutes,
    shortBreakMinutes: pomodoroState.value.config.shortBreakMinutes,
    longBreakMinutes: pomodoroState.value.config.longBreakMinutes,
    longBreakAfter: pomodoroState.value.config.longBreakAfter,
  }
  showPomodoroConfig.value = !showPomodoroConfig.value
}

function commitPomodoroConfig(): void {
  writingAssistStore.updatePomodoroConfig({
    workMinutes: clampNumber(localPomodoroConfig.value.workMinutes, 1, 90),
    shortBreakMinutes: clampNumber(localPomodoroConfig.value.shortBreakMinutes, 1, 30),
    longBreakMinutes: clampNumber(localPomodoroConfig.value.longBreakMinutes, 1, 60),
    longBreakAfter: clampNumber(localPomodoroConfig.value.longBreakAfter, 1, 8),
  })
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.max(min, Math.min(max, Math.trunc(value)))
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatSessionTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function sessionPhaseLabel(phase: string): string {
  switch (phase) {
    case 'running':
      return '专注'
    case 'break':
      return '短休'
    case 'long_break':
      return '长休'
    case 'paused':
      return '暂停'
    default:
      return phase
  }
}

async function handleSoundClick(type: AmbientSoundType): Promise<void> {
  await writingAssistStore.toggleSound(type)
}

async function applySoundPreset(preset: SoundPreset): Promise<void> {
  await writingAssistStore.stopSound()
  for (const sound of preset.sounds) {
    await writingAssistStore.playSound(sound)
  }
}

function startEditGoal(row: GoalRow): void {
  editingGoalKey.value = row.key
  editingGoalValue.value = row.target ? String(row.target) : ''
  goalEditError.value = ''
}

function commitGoalEdit(): void {
  if (!editingGoalKey.value) {
    return
  }
  const raw = editingGoalValue.value.trim()
  const next = normalizeWritingGoalValue(raw)
  if (raw && next === undefined) {
    goalEditError.value = '请输入大于等于 1 的整数'
    return
  }

  const goal = settingsStore.settings.writingGoal
  switch (editingGoalKey.value) {
    case 'document':
      goal.documentTarget = next
      break
    case 'daily':
      goal.dailyTarget = next
      break
    case 'weekly':
      goal.weeklyTarget = next
      break
  }
  editingGoalKey.value = null
  editingGoalValue.value = ''
  goalEditError.value = ''
}

function cancelGoalEdit(): void {
  editingGoalKey.value = null
  editingGoalValue.value = ''
  goalEditError.value = ''
}

const sparklinePoints = computed(() => {
  const history = wordCountHistory.value
  if (history.length < 2) {
    return ''
  }
  const windowMs = 60_000
  const samples = history.slice(-30)
  const wpmSeries: number[] = []

  for (let index = 1; index < samples.length; index += 1) {
    const sliceSamples = samples.slice(0, index + 1)
    const wpmValue = computeWpm(sliceSamples, sliceSamples[sliceSamples.length - 1].time, windowMs, 0)
    wpmSeries.push(wpmValue)
  }

  if (wpmSeries.length < 2) {
    return ''
  }

  const maxWpm = Math.max(...wpmSeries, 1)
  const width = 120
  const height = 30
  const stepX = wpmSeries.length > 1 ? width / (wpmSeries.length - 1) : 0

  return wpmSeries
    .map((value, index) => {
      const x = index * stepX
      const y = height - (value / maxWpm) * (height - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const sparklineLastY = computed(() => {
  const pts = sparklinePoints.value
  if (!pts) {
    return null
  }
  const parts = pts.trim().split(/\s+/)
  const last = parts[parts.length - 1]
  if (!last) {
    return null
  }
  const [, y] = last.split(',')
  return y ? Number.parseFloat(y) : null
})

const RING_SIZE = 40
const RING_STROKE = 4
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ringOffset(percent: number | undefined): number {
  const safe = Math.max(0, Math.min(100, percent ?? 0))
  return RING_CIRCUMFERENCE * (1 - safe / 100)
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

    <div
      v-if="showOverview"
      class="assist-grid"
    >
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
        <svg
          v-if="sparklinePoints"
          class="wpm-sparkline"
          viewBox="0 0 120 30"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            :points="sparklinePoints"
            fill="none"
            stroke="#607D8B"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            v-if="sparklineLastY !== null"
            :cx="120"
            :cy="sparklineLastY"
            r="2"
            fill="#D32F2F"
          />
        </svg>
        <div
          v-else
          class="wpm-sparkline placeholder"
          aria-hidden="true"
        />
      </article>
    </div>

    <div class="assist-section">
      <div class="assist-section-title">
        <span>写作目标</span>
        <span
          v-if="goalStreak.currentDays > 0"
          class="streak-badge"
          :title="`历史最长 ${goalStreak.longestDays} 天`"
        >
          <Flame :size="11" />
          连续 {{ goalStreak.currentDays }} 天达标
        </span>
      </div>
      <div
        v-for="row in goalRows"
        :key="row.label"
        class="goal-row"
      >
        <div class="goal-row-main">
          <div class="goal-row-label">
            <span>{{ row.label }}</span>
            <span class="goal-row-current">
              {{ formatCount(row.current) }}
              <template v-if="row.target && editingGoalKey !== row.key">
                / <button
                  type="button"
                  class="goal-target-btn"
                  :title="`编辑${row.label}目标`"
                  @click="startEditGoal(row)"
                >
                  {{ formatCount(row.target) }}
                  <Pencil :size="10" />
                </button>
              </template>
              <template v-else-if="!row.target && editingGoalKey !== row.key">
                / <button
                  type="button"
                  class="goal-target-btn placeholder"
                  @click="startEditGoal(row)"
                >
                  设置
                  <Pencil :size="10" />
                </button>
              </template>
              <template v-else>
                /
                <span class="goal-target-editor">
                  <input
                    v-model="editingGoalValue"
                    type="number"
                    min="1"
                    step="1"
                    class="goal-target-input"
                    :aria-label="`${row.label}目标`"
                    :aria-invalid="Boolean(goalEditError)"
                    :aria-describedby="goalEditError ? `goal-target-error-${row.key}` : undefined"
                    @blur="commitGoalEdit"
                    @keydown.enter.prevent="commitGoalEdit"
                    @keydown.escape.prevent="cancelGoalEdit"
                  >
                  <span
                    v-if="goalEditError"
                    :id="`goal-target-error-${row.key}`"
                    class="goal-target-error"
                    role="alert"
                  >{{ goalEditError }}</span>
                </span>
              </template>
            </span>
          </div>
        </div>
        <div
          class="goal-ring-wrap"
          :class="{ complete: (row.percent ?? 0) >= 100 }"
          :aria-label="`${row.label} ${row.percent ?? 0}%`"
        >
          <svg
            :width="RING_SIZE"
            :height="RING_SIZE"
            class="goal-ring"
            aria-hidden="true"
          >
            <circle
              :cx="RING_SIZE / 2"
              :cy="RING_SIZE / 2"
              :r="RING_RADIUS"
              fill="none"
              stroke="#ECEFF1"
              :stroke-width="RING_STROKE"
            />
            <circle
              :cx="RING_SIZE / 2"
              :cy="RING_SIZE / 2"
              :r="RING_RADIUS"
              fill="none"
              :stroke-width="RING_STROKE"
              stroke-linecap="round"
              class="goal-ring-progress"
              :stroke-dasharray="RING_CIRCUMFERENCE"
              :stroke-dashoffset="ringOffset(row.percent)"
              :transform="`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`"
            />
            <text
              :x="RING_SIZE / 2"
              :y="RING_SIZE / 2"
              text-anchor="middle"
              dominant-baseline="central"
              class="goal-ring-text"
            >{{ row.percent ?? 0 }}%</text>
          </svg>
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
        <span>{{ vignette.isEnabled ? `${vignetteIntensityPercent}%` : '关闭' }}</span>
      </button>
      <label
        class="assist-range"
        :class="{ disabled: !vignette.isEnabled }"
      >
        <span>聚焦范围 {{ vignette.height }}px</span>
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
      <label
        class="assist-range"
        :class="{ disabled: !vignette.isEnabled }"
        :aria-label="`暗处强度 ${vignetteIntensityPercent}%`"
      >
        <span>暗处强度 {{ vignetteIntensityPercent }}%</span>
        <input
          type="range"
          min="0.08"
          max="0.32"
          step="0.02"
          :disabled="!vignette.isEnabled"
          :value="vignette.intensity"
          @input="writingAssistStore.setVignetteIntensity(Number(($event.target as HTMLInputElement).value))"
        >
      </label>
      <label
        class="assist-range"
        :class="{ disabled: !typewriterMode }"
        :aria-label="`光标位置 ${cursorPositionPercent}%`"
      >
        <span>光标锚点 {{ cursorPositionPercent }}%</span>
        <input
          type="range"
          min="0.3"
          max="0.7"
          step="0.05"
          :disabled="!typewriterMode"
          :value="cursorPosition"
          @input="writingAssistStore.setCursorPosition(Number(($event.target as HTMLInputElement).value))"
        >
      </label>
    </div>

    <div class="assist-section pomodoro-card">
      <div class="pomodoro-top">
        <div class="pomodoro-display">
          <Timer :size="16" />
          <div>
            <strong>{{ pomodoroTimeDisplay }}</strong>
            <span>
              {{ pomodoroPhaseLabel }} ·
              {{ pomodoroRoundsCurrent }}/{{ pomodoroRoundsTotal }}
            </span>
          </div>
        </div>
        <button
          type="button"
          class="pomodoro-gear"
          :class="{ active: showPomodoroConfig }"
          title="配置番茄钟"
          @click="openPomodoroConfig"
        >
          <Settings2 :size="14" />
        </button>
      </div>

      <div
        class="pomodoro-rounds"
        :aria-label="`${pomodoroRoundsCurrent}/${pomodoroRoundsTotal} 轮`"
      >
        <span
          v-for="(filled, index) in pomodoroRoundDots"
          :key="index"
          class="round-dot"
          :class="{ filled }"
        />
      </div>

      <div
        v-if="showPomodoroConfig"
        class="pomodoro-config"
      >
        <label>
          <span>专注 (分)</span>
          <input
            v-model.number="localPomodoroConfig.workMinutes"
            type="number"
            min="1"
            max="90"
            @blur="commitPomodoroConfig"
            @keydown.enter.prevent="commitPomodoroConfig"
          >
        </label>
        <label>
          <span>短休 (分)</span>
          <input
            v-model.number="localPomodoroConfig.shortBreakMinutes"
            type="number"
            min="1"
            max="30"
            @blur="commitPomodoroConfig"
            @keydown.enter.prevent="commitPomodoroConfig"
          >
        </label>
        <label>
          <span>长休 (分)</span>
          <input
            v-model.number="localPomodoroConfig.longBreakMinutes"
            type="number"
            min="1"
            max="60"
            @blur="commitPomodoroConfig"
            @keydown.enter.prevent="commitPomodoroConfig"
          >
        </label>
        <label>
          <span>长休周期</span>
          <input
            v-model.number="localPomodoroConfig.longBreakAfter"
            type="number"
            min="1"
            max="8"
            @blur="commitPomodoroConfig"
            @keydown.enter.prevent="commitPomodoroConfig"
          >
        </label>
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

      <button
        type="button"
        class="session-history-toggle"
        @click="showSessionHistory = !showSessionHistory"
      >
        <component
          :is="showSessionHistory ? ChevronUp : ChevronDown"
          :size="13"
        />
        最近记录 ({{ pomodoroHistory.length }})
      </button>
      <div
        v-if="showSessionHistory"
        class="session-history"
      >
        <p
          v-if="recentSessions.length === 0"
          class="session-empty"
        >
          暂无记录
        </p>
        <div
          v-for="(session, index) in recentSessions"
          :key="`${session.endedAt}-${index}`"
          class="session-row"
        >
          <span class="session-time">{{ formatSessionTime(session.endedAt) }}</span>
          <span class="session-phase">{{ sessionPhaseLabel(session.phase) }}</span>
          <span class="session-words">+{{ formatCount(session.wordsAdded) }} 字</span>
        </div>
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

      <div class="sound-presets">
        <button
          v-for="preset in soundPresets"
          :key="preset.id"
          type="button"
          class="preset-btn"
          :title="`应用预设：${preset.sounds.join('+')}`"
          @click="void applySoundPreset(preset)"
        >
          <Zap :size="11" />
          {{ preset.label }}
        </button>
      </div>

      <div class="sound-grid">
        <button
          v-for="sound in soundOptions"
          :key="sound.type"
          type="button"
          :class="{ active: ambientSound.activeSounds.includes(sound.type) }"
          @click="void handleSoundClick(sound.type)"
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
.goal-row-label {
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
  position: relative;
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

.wpm-sparkline {
  display: block;
  width: 100%;
  height: 26px;
  margin-top: 8px;
  overflow: visible;
}

.wpm-sparkline.placeholder {
  height: 26px;
  border-radius: 6px;
  background: repeating-linear-gradient(
    90deg,
    #F5F7F8 0,
    #F5F7F8 4px,
    transparent 4px,
    transparent 8px
  );
  opacity: 0.55;
}

.assist-section {
  padding: 12px;
}

.assist-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  color: #607D8B;
  font-size: 12px;
  font-weight: 600;
}

.streak-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #FFEDD5 0%, #FED7AA 100%);
  color: #B45309;
  font-size: 11px;
  font-weight: 600;
}

.goal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.goal-row + .goal-row {
  margin-top: 10px;
}

.goal-row-main {
  flex: 1 1 auto;
  min-width: 0;
}

.goal-row-label {
  justify-content: space-between;
  gap: 8px;
  color: #90A4AE;
  font-size: 11px;
  font-weight: 500;
}

.goal-row-current {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #37474F;
}

.goal-target-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 5px;
  border: 1px dashed transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease;
}

.goal-target-btn:hover {
  border-color: #CFD8DC;
  color: #263238;
}

.goal-target-btn.placeholder {
  color: #90A4AE;
}

.goal-target-input {
  width: 60px;
  padding: 1px 4px;
  border: 1px solid #CFD8DC;
  border-radius: 6px;
  font: inherit;
  color: #263238;
}

.goal-target-input:focus {
  outline: none;
  border-color: #607D8B;
}

.goal-target-editor {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.goal-target-input[aria-invalid="true"] {
  border-color: #C62828;
}

.goal-target-error {
  color: #C62828;
  font-size: 9px;
  line-height: 1.2;
  white-space: nowrap;
}

.goal-ring-wrap {
  flex: 0 0 auto;
  position: relative;
  width: 40px;
  height: 40px;
}

.goal-ring {
  display: block;
}

.goal-ring-progress {
  stroke: #607D8B;
  transition: stroke-dashoffset 0.35s ease, stroke 0.35s ease;
}

.goal-ring-text {
  font-size: 11px;
  font-weight: 600;
  fill: #37474F;
}

.goal-ring-wrap.complete .goal-ring-progress {
  stroke: #F59E0B;
  animation: ring-pulse 1.6s ease-in-out infinite;
}

.goal-ring-wrap.complete::before,
.goal-ring-wrap.complete::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #F59E0B;
  opacity: 0;
  pointer-events: none;
}

.goal-ring-wrap.complete::before {
  animation: confetti-burst 2s ease-in-out infinite;
}

.goal-ring-wrap.complete::after {
  background: #D32F2F;
  animation: confetti-burst 2s ease-in-out infinite 0.7s;
}

@keyframes ring-pulse {
  0%, 100% {
    stroke: #F59E0B;
  }
  50% {
    stroke: #D32F2F;
  }
}

@keyframes confetti-burst {
  0% {
    transform: translate(-50%, -50%) scale(0.4);
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + 16px), calc(-50% - 16px)) scale(1.2);
    opacity: 0;
  }
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

.pomodoro-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
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

.pomodoro-gear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #ECEFF1;
  border-radius: 999px;
  background: #FFFFFF;
  color: #607D8B;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;
}

.pomodoro-gear:hover {
  border-color: #CFD8DC;
  color: #37474F;
}

.pomodoro-gear.active {
  background: #263238;
  border-color: #263238;
  color: #FFFFFF;
}

.pomodoro-rounds {
  display: flex;
  align-items: center;
  gap: 6px;
}

.round-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid #CFD8DC;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.round-dot.filled {
  background: #607D8B;
  border-color: #607D8B;
}

.pomodoro-config {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 10px;
  border: 1px solid #ECEFF1;
  border-radius: 11px;
  background: #FAFBFC;
}

.pomodoro-config label {
  display: grid;
  gap: 4px;
  color: #90A4AE;
  font-size: 11px;
  font-weight: 500;
}

.pomodoro-config input {
  padding: 4px 6px;
  border: 1px solid #CFD8DC;
  border-radius: 6px;
  font-size: 12px;
  color: #263238;
}

.pomodoro-config input:focus {
  outline: none;
  border-color: #607D8B;
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

.session-history-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border: 1px dashed #CFD8DC;
  border-radius: 8px;
  background: transparent;
  color: #607D8B;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  justify-self: start;
}

.session-history-toggle:hover {
  border-color: #607D8B;
  color: #263238;
}

.session-history {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid #ECEFF1;
  border-radius: 10px;
  background: #FAFBFC;
}

.session-empty {
  margin: 0;
  color: #90A4AE;
  font-size: 11px;
}

.session-row {
  display: grid;
  grid-template-columns: 44px 44px 1fr;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: #37474F;
}

.session-time {
  font-variant-numeric: tabular-nums;
  color: #607D8B;
  font-weight: 600;
}

.session-phase {
  color: #90A4AE;
}

.session-words {
  text-align: right;
  color: #1B5E20;
  font-weight: 600;
}

.ambient-header {
  justify-content: space-between;
  color: #607D8B;
  font-size: 12px;
  font-weight: 600;
}

.sound-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border: 1px solid #ECEFF1;
  border-radius: 999px;
  background: linear-gradient(135deg, #FFFFFF 0%, #F5F7F8 100%);
  color: #37474F;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.preset-btn:hover {
  transform: translateY(-1px);
  border-color: #607D8B;
  color: #263238;
}

.ambient-error {
  margin: 0;
  color: #B91C1C;
  font-size: 11px;
  line-height: 1.45;
}
</style>
