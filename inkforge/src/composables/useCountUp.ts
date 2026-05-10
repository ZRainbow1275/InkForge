import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue'

type NumericSource = Ref<number> | ComputedRef<number>

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3)
}

export function useCountUp(target: NumericSource, durationMs = 1000): ComputedRef<number> {
  const value = ref(0)
  let frameId: number | null = null

  function cancel(): void {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId)
      frameId = null
    }
  }

  function animate(nextValue: number, previousValue: number): void {
    cancel()

    if (typeof window === 'undefined' || durationMs <= 0) {
      value.value = nextValue
      return
    }

    const startedAt = window.performance.now()
    const delta = nextValue - previousValue

    const tick = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / durationMs)
      value.value = previousValue + delta * easeOutCubic(progress)

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick)
      } else {
        frameId = null
      }
    }

    frameId = window.requestAnimationFrame(tick)
  }

  watch(
    target,
    (nextValue, previousValue) => {
      animate(Number.isFinite(nextValue) ? nextValue : 0, Number.isFinite(previousValue ?? value.value) ? (previousValue ?? value.value) : value.value)
    },
    { immediate: true },
  )

  onScopeDispose(cancel)

  return computed(() => Math.round(value.value))
}