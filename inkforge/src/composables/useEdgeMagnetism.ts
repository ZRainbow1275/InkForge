import { ref, watch, onBeforeUnmount, type Ref } from 'vue'

export interface EdgeMagnetismOptions {
  /** 触发右边缘呼出的 X 距离阈值（像素） */
  triggerWidth?: number
  /** 鼠标停留在右边缘多久才触发（毫秒） */
  triggerHoldMs?: number
  /** 鼠标向左离开多远才触发自动收起（像素，相对窗口右侧） */
  collapseDistance?: number
  /** 鼠标离开后保持多久再收起（毫秒） */
  collapseDelayMs?: number
  /** 面板默认是否折叠 */
  initialCollapsed?: boolean
  /** 强制保持收起（如审阅模式开启时） */
  forceCollapsed?: Ref<boolean>
  /** 钉住后磁吸禁用 */
  pinned?: Ref<boolean>
  /** 暂停整个磁吸（专注模式 / preview 等） */
  paused?: Ref<boolean>
}

export interface EdgeMagnetismHandle {
  collapsed: Ref<boolean>
  pinned: Ref<boolean>
  togglePinned: () => void
  setCollapsed: (next: boolean) => void
  destroy: () => void
}

/**
 * 检查器磁吸 composable
 *
 * 鼠标移到窗口右边缘 triggerWidth 像素内并停留 triggerHoldMs 毫秒 → 自动呼出
 * 鼠标离开面板且 X < window.innerWidth - collapseDistance 持续 collapseDelayMs 毫秒 → 自动收起
 * 钉住状态下完全禁用磁吸（用户手动控制）
 */
export function useEdgeMagnetism(
  panelEl: Ref<HTMLElement | null>,
  options: EdgeMagnetismOptions = {},
): EdgeMagnetismHandle {
  const {
    triggerWidth = 48,
    triggerHoldMs = 200,
    collapseDistance = 480,
    collapseDelayMs = 600,
    initialCollapsed = true,
    forceCollapsed,
    pinned: externalPinned,
    paused,
  } = options

  const collapsed = ref(initialCollapsed)
  const internalPinned = ref(false)
  const pinned = externalPinned ?? internalPinned

  let triggerTimer: ReturnType<typeof setTimeout> | null = null
  let collapseTimer: ReturnType<typeof setTimeout> | null = null
  let lastPointerX = 0

  function clearTriggerTimer(): void {
    if (triggerTimer) {
      clearTimeout(triggerTimer)
      triggerTimer = null
    }
  }

  function clearCollapseTimer(): void {
    if (collapseTimer) {
      clearTimeout(collapseTimer)
      collapseTimer = null
    }
  }

  function setCollapsed(next: boolean): void {
    if (next === collapsed.value) {
      return
    }
    collapsed.value = next
  }

  function isPanelHovered(): boolean {
    const el = panelEl.value
    if (!el) return false
    const rect = el.getBoundingClientRect()
    return (
      lastPointerX >= rect.left
      && lastPointerX <= rect.right
    )
  }

  function shouldSuspend(): boolean {
    if (paused?.value) return true
    if (forceCollapsed?.value) return true
    if (pinned.value) return true
    return false
  }

  function handleMouseMove(event: MouseEvent): void {
    lastPointerX = event.clientX

    if (forceCollapsed?.value && !collapsed.value) {
      setCollapsed(true)
    }

    if (shouldSuspend()) {
      clearTriggerTimer()
      clearCollapseTimer()
      return
    }

    const winWidth = window.innerWidth
    const distanceFromRight = winWidth - event.clientX

    // 折叠态 → 检测呼出
    if (collapsed.value) {
      clearCollapseTimer()
      if (distanceFromRight <= triggerWidth) {
        if (!triggerTimer) {
          triggerTimer = setTimeout(() => {
            triggerTimer = null
            if (!shouldSuspend()) {
              setCollapsed(false)
            }
          }, triggerHoldMs)
        }
      } else {
        clearTriggerTimer()
      }
      return
    }

    // 展开态 → 检测自动收起
    clearTriggerTimer()
    const insidePanel = isPanelHovered()
    const farFromEdge = distanceFromRight > collapseDistance

    if (!insidePanel && farFromEdge) {
      if (!collapseTimer) {
        collapseTimer = setTimeout(() => {
          collapseTimer = null
          if (!shouldSuspend() && !isPanelHovered()) {
            setCollapsed(true)
          }
        }, collapseDelayMs)
      }
    } else {
      clearCollapseTimer()
    }
  }

  function handleMouseLeave(): void {
    clearTriggerTimer()
    clearCollapseTimer()
  }

  function togglePinned(): void {
    if (externalPinned) {
      externalPinned.value = !externalPinned.value
    } else {
      internalPinned.value = !internalPinned.value
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mouseleave', handleMouseLeave)
  }

  if (forceCollapsed) {
    watch(forceCollapsed, (next) => {
      if (next) {
        setCollapsed(true)
      }
    })
  }

  function destroy(): void {
    clearTriggerTimer()
    clearCollapseTimer()
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }

  onBeforeUnmount(destroy)

  return {
    collapsed,
    pinned,
    togglePinned,
    setCollapsed,
    destroy,
  }
}
