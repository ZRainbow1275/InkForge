<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Pencil, Target } from 'lucide-vue-next'

interface WritingGoalProps {
    currentWords: number
    targetWords: number
    completed: boolean
    showProgress?: boolean
    celebrateOnComplete?: boolean
}

interface WritingGoalEmits {
    (e: 'target-change', newTarget: number): void
    (e: 'completed'): void
}

const props = withDefaults(defineProps<WritingGoalProps>(), {
    showProgress: true,
    celebrateOnComplete: true,
})

const emit = defineEmits<WritingGoalEmits>()

const goalRef = ref<HTMLElement | null>(null)
const editingTarget = ref(false)
const targetDraft = ref(String(props.targetWords))

const progressPercent = computed(() => {
    if (props.targetWords <= 0) {
        return 0
    }

    return Math.min(100, Math.round((props.currentWords / props.targetWords) * 100))
})

watch(
    () => props.targetWords,
    (value) => {
        if (!editingTarget.value) {
            targetDraft.value = String(value)
        }
    }
)

watch(
    () => props.completed,
    (completed, previous) => {
        if (completed && !previous) {
            emit('completed')
            if (props.celebrateOnComplete) {
                triggerCelebration()
            }
        }
    }
)

function startEditing(): void {
    editingTarget.value = true
    targetDraft.value = String(props.targetWords)
}

function cancelEditing(): void {
    editingTarget.value = false
    targetDraft.value = String(props.targetWords)
}

function submitTarget(): void {
    const nextTarget = Number.parseInt(targetDraft.value, 10)

    if (!Number.isFinite(nextTarget) || nextTarget < 100) {
        cancelEditing()
        return
    }

    emit('target-change', nextTarget)
    editingTarget.value = false
}

function triggerCelebration(): void {
    const goalElement = goalRef.value
    if (!goalElement) {
        return
    }

    goalElement.classList.add('celebrating')
    setTimeout(() => {
        goalElement.classList.remove('celebrating')
    }, 1500)

    const colors = ['#D32F2F', '#1565C0', '#2E7D32', '#F57C00', '#7B1FA2']
    const container = document.createElement('div')
    container.className = 'confetti-container'
    container.style.cssText = [
        'position: fixed',
        'bottom: 40px',
        'left: 50%',
        'transform: translateX(-50%)',
        'pointer-events: none',
        'z-index: 9999',
    ].join(';')

    for (let index = 0; index < 8; index += 1) {
        const dot = document.createElement('div')
        dot.style.cssText = [
            'position: absolute',
            'width: 6px',
            'height: 6px',
            'border-radius: 50%',
            `background: ${colors[index % colors.length]}`,
            `left: ${(index - 4) * 12}px`,
            `animation: celebrate-confetti 1.2s ease-out forwards`,
            `animation-delay: ${index * 0.05}s`,
        ].join(';')
        container.appendChild(dot)
    }

    document.body.appendChild(container)
    setTimeout(() => container.remove(), 2000)
}
</script>

<template>
  <div
    ref="goalRef"
    class="writing-goal"
    :class="{ completed }"
  >
    <Target :size="14" />

    <div
      v-if="showProgress"
      class="goal-progress"
      aria-hidden="true"
    >
      <div
        class="goal-progress-fill"
        :class="{ completed }"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>

    <button
      v-if="!editingTarget"
      type="button"
      class="goal-trigger"
      title="点击修改写作目标"
      @click="startEditing"
    >
      <span class="goal-text">{{ currentWords }} / {{ targetWords }}</span>
      <Pencil :size="12" />
    </button>

    <input
      v-else
      v-model="targetDraft"
      type="number"
      min="100"
      step="100"
      class="goal-input"
      @blur="submitTarget"
      @keydown.enter="submitTarget"
      @keydown.escape="cancelEditing"
    >
  </div>
</template>

<style scoped>
.writing-goal {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--bg-rice-paper, #FAFBFC);
    border: 1px solid var(--border, #E5E7EB);
    font-size: 11px;
    color: var(--text-secondary, #607D8B);
    transition: all 200ms ease;
}

.writing-goal.completed {
    background: #E8F5E9;
    border-color: #2E7D32;
    color: #2E7D32;
}

.goal-progress {
    width: 48px;
    height: 4px;
    border-radius: 2px;
    background: var(--border, #E5E7EB);
    overflow: hidden;
}

.goal-progress-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--accent-primary, #D32F2F);
    transition: width 300ms ease;
}

.goal-progress-fill.completed {
    background: #2E7D32;
}

.goal-trigger {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    padding: 0;
}

.goal-text {
    font-variant-numeric: tabular-nums;
}

.goal-input {
    width: 68px;
    border: none;
    border-bottom: 1px solid currentColor;
    background: transparent;
    color: inherit;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    outline: none;
}

.celebrating {
    animation: celebrate-glow 1s ease, celebrate-bounce 0.6s ease;
}

@keyframes celebrate-confetti {
    0% {
        opacity: 1;
        transform: translateY(0) rotate(0deg) scale(1);
    }

    100% {
        opacity: 0;
        transform: translateY(-120px) rotate(720deg) scale(0.3);
    }
}

@keyframes celebrate-glow {
    0% {
        box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.4);
    }

    50% {
        box-shadow: 0 0 0 12px rgba(46, 125, 50, 0);
    }

    100% {
        box-shadow: 0 0 0 0 rgba(46, 125, 50, 0);
    }
}

@keyframes celebrate-bounce {
    0%,
    100% {
        transform: scale(1);
    }

    30% {
        transform: scale(1.15);
    }

    60% {
        transform: scale(0.95);
    }
}
</style>
