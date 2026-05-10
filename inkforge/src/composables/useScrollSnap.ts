import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

export interface UseScrollSnapOptions {
  containerRef: Ref<HTMLElement | null>
  regionRefs: Ref<Array<HTMLElement | null>>
  duration?: number
  cooldown?: number
}

export interface UseScrollSnapReturn {
  activeIndex: Ref<number>
  scrollToIndex: (index: number) => void
  reducedMotion: Ref<boolean>
}

const DEFAULT_DURATION = 600
const DEFAULT_COOLDOWN = 120
const EASE = (t: number): number => 1 - Math.pow(1 - t, 3)

export function useScrollSnap(options: UseScrollSnapOptions): UseScrollSnapReturn {
  const { containerRef, regionRefs } = options
  const duration = options.duration ?? DEFAULT_DURATION
  const cooldown = options.cooldown ?? DEFAULT_COOLDOWN

  const activeIndex = ref<number>(0)
  const reducedMotion = ref<boolean>(false)
  const animating = ref<boolean>(false)
  let lastSnapAt = 0
  let cleanupObserver: (() => void) | null = null
  let mediaQuery: MediaQueryList | null = null

  function readReducedMotion(): boolean {
    if (typeof window === 'undefined') return false
    if (!mediaQuery) {
      mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    }
    return mediaQuery.matches
  }

  function getRegions(): HTMLElement[] {
    return regionRefs.value.filter((node): node is HTMLElement => node instanceof HTMLElement)
  }

  function getOffsetTop(node: HTMLElement, container: HTMLElement): number {
    let top = 0
    let current: HTMLElement | null = node
    while (current && current !== container) {
      top += current.offsetTop
      current = current.offsetParent as HTMLElement | null
    }
    return top
  }

  function animateScroll(container: HTMLElement, target: number): void {
    if (reducedMotion.value) {
      container.scrollTop = target
      animating.value = false
      return
    }
    const start = container.scrollTop
    const distance = target - start
    if (Math.abs(distance) < 2) {
      animating.value = false
      return
    }
    // 容器若挂着 `scroll-behavior:smooth` + `scroll-snap-type:mandatory`，
    // 浏览器会拦截每帧 scrollTop 赋值进入自身的 smooth-scroll 队列，并把
    // 中间值往最近 snap 点拉回，与 RAF 互相打架 → 视觉上滚动几乎停滞。
    // RAF 期间改成 auto/none，结束后恢复；原生 snap 仍可服务滚轮输入。
    const prevBehavior = container.style.scrollBehavior
    const prevSnap = container.style.scrollSnapType
    container.style.scrollBehavior = 'auto'
    container.style.scrollSnapType = 'none'
    const startTime = performance.now()
    animating.value = true
    function step(now: number): void {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = EASE(progress)
      container.scrollTop = start + distance * eased
      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        container.style.scrollBehavior = prevBehavior
        container.style.scrollSnapType = prevSnap
        animating.value = false
        lastSnapAt = performance.now()
      }
    }
    requestAnimationFrame(step)
  }

  function snapTo(index: number): void {
    const container = containerRef.value
    const regions = getRegions()
    if (!container || regions.length === 0) return
    const safe = Math.max(0, Math.min(regions.length - 1, index))
    const node = regions[safe]
    if (!node) return
    const target = getOffsetTop(node, container)
    activeIndex.value = safe
    animateScroll(container, target)
  }

  function handleWheel(event: WheelEvent): void {
    const container = containerRef.value
    if (!container) return
    if (animating.value) {
      event.preventDefault()
      return
    }
    if (Math.abs(event.deltaY) < 8) return
    const now = performance.now()
    if (now - lastSnapAt < cooldown) {
      event.preventDefault()
      return
    }
    const direction = event.deltaY > 0 ? 1 : -1
    const next = activeIndex.value + direction
    const regions = getRegions()
    if (next < 0 || next >= regions.length) return
    event.preventDefault()
    snapTo(next)
  }

  function handleKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    if (event.key === 'PageDown' || (event.key === 'ArrowDown' && event.altKey)) {
      event.preventDefault()
      snapTo(activeIndex.value + 1)
    } else if (event.key === 'PageUp' || (event.key === 'ArrowUp' && event.altKey)) {
      event.preventDefault()
      snapTo(activeIndex.value - 1)
    }
  }

  function setupObserver(): void {
    cleanupObserver?.()
    const container = containerRef.value
    const regions = getRegions()
    if (!container || regions.length === 0 || typeof IntersectionObserver === 'undefined') {
      cleanupObserver = null
      return
    }
    const observer = new IntersectionObserver(entries => {
      // 程序化滚动（snapTo 触发的 RAF 动画）期间忽略 IO 更新 — 否则
      // 中间段会在划过时轮流被判定为"最大 ratio 段"，导致 activeIndex
      // 在 dot indicator 上瞬时跳过中间段，呈现"红点闪烁"轨迹。
      // 同时为动画结束后再保留一个 cooldown 沉淀窗口：scrollTop 在
      // RAF 终态后仍可能被浏览器惯性 / layout 微调推移几十毫秒，
      // 期间 IO 不应基于"中间态"覆盖 snapTo 已锁定的 activeIndex。
      const inSettleWindow = performance.now() - lastSnapAt < cooldown
      if (animating.value || inSettleWindow) {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('hub-region--visible')
          }
        }
        return
      }
      let bestIndex = activeIndex.value
      let bestRatio = 0
      for (const entry of entries) {
        const idx = regions.indexOf(entry.target as HTMLElement)
        if (idx < 0) continue
        if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
          bestRatio = entry.intersectionRatio
          bestIndex = idx
        }
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('hub-region--visible')
        }
      }
      if (bestRatio > 0.45) {
        activeIndex.value = bestIndex
      }
    }, { root: container, threshold: [0, 0.4, 0.55, 0.8] })
    regions.forEach(node => observer.observe(node))
    cleanupObserver = () => observer.disconnect()
  }

  function handleReducedMotionChange(): void {
    reducedMotion.value = readReducedMotion()
  }

  watch(regionRefs, () => {
    setupObserver()
  }, { flush: 'post', deep: true })

  watch(containerRef, () => {
    setupObserver()
  }, { flush: 'post' })

  onMounted(() => {
    reducedMotion.value = readReducedMotion()
    mediaQuery?.addEventListener?.('change', handleReducedMotionChange)
    setupObserver()
    const container = containerRef.value
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
    }
    window.addEventListener('keydown', handleKey)
  })

  onBeforeUnmount(() => {
    cleanupObserver?.()
    cleanupObserver = null
    const container = containerRef.value
    container?.removeEventListener('wheel', handleWheel)
    window.removeEventListener('keydown', handleKey)
    mediaQuery?.removeEventListener?.('change', handleReducedMotionChange)
  })

  return {
    activeIndex,
    scrollToIndex: snapTo,
    reducedMotion,
  }
}
