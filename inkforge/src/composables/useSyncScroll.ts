import type { ComputedRef, Ref } from 'vue'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Editor } from '@tiptap/core'
import type { TocHeading } from '@/services/toc'
import {
  AnchorRegistry,
  ScrollLoopDetector,
  calculateSyncedScrollTop,
  createResizeRebuildObserver,
  getScrollMax,
  setScrollTopImmediate,
  type SyncScrollSide,
} from '@/services/sync-scroll'

type ReadableBoolean = Ref<boolean> | ComputedRef<boolean>

export interface UseSyncScrollOptions {
  enabled: ReadableBoolean
  active: ReadableBoolean
  leftScrollElement: () => HTMLElement | null
  rightScrollElement: () => HTMLElement | null
  previewRootElement: () => HTMLElement | null
  editor: () => Editor | undefined
  headings: () => TocHeading[]
  onBeforeRebuild?: (editor: Editor) => void
  onLoopDetected?: () => void
}

export interface UseSyncScrollReturn {
  anchorCount: Readonly<Ref<number>>
  rebuildAnchors: () => void
  scheduleRebuild: (delayMs?: number) => void
  alignFromLeft: () => void
  dispose: () => void
}

const SYNC_RELEASE_DELAY_MS = 80
const REBUILD_DELAY_MS = 120
const CONTENT_REBUILD_DELAY_MS = 320

function requestFrame(callback: () => void): number {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback)
  }
  return globalThis.setTimeout(callback, 16) as unknown as number
}

function cancelFrame(id: number): void {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(id)
    return
  }
  globalThis.clearTimeout(id)
}

export function useSyncScroll(options: UseSyncScrollOptions): UseSyncScrollReturn {
  const registry = new AnchorRegistry()
  const loopDetector = new ScrollLoopDetector()
  const resizeObserver = createResizeRebuildObserver(() => scheduleRebuild(REBUILD_DELAY_MS))
  const anchorCount = ref(0)

  let disposeListeners: (() => void) | null = null
  let rafId: number | null = null
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null
  let syncReleaseTimer: ReturnType<typeof setTimeout> | null = null
  let syncingFrom: SyncScrollSide | null = null

  function isReady(): boolean {
    return options.enabled.value && options.active.value
  }

  function clearScheduledWork(): void {
    if (rafId !== null) {
      cancelFrame(rafId)
      rafId = null
    }
    if (rebuildTimer) {
      clearTimeout(rebuildTimer)
      rebuildTimer = null
    }
    if (syncReleaseTimer) {
      clearTimeout(syncReleaseTimer)
      syncReleaseTimer = null
    }
  }

  function releaseSyncFlag(): void {
    if (syncReleaseTimer) clearTimeout(syncReleaseTimer)
    syncReleaseTimer = setTimeout(() => {
      syncingFrom = null
    }, SYNC_RELEASE_DELAY_MS)
  }

  function rebuildAnchors(): void {
    if (!isReady()) {
      registry.clear()
      anchorCount.value = 0
      resizeObserver.disconnect()
      return
    }

    const editor = options.editor()
    const leftScrollElement = options.leftScrollElement()
    const rightScrollElement = options.rightScrollElement()
    const previewRootElement = options.previewRootElement()

    if (!editor || editor.isDestroyed || !leftScrollElement || !rightScrollElement || !previewRootElement) {
      registry.clear()
      anchorCount.value = 0
      return
    }

    options.onBeforeRebuild?.(editor)
    const snapshot = registry.rebuild({
      headings: options.headings(),
      editor,
      leftScrollElement,
      rightScrollElement,
      previewRootElement,
    })
    anchorCount.value = snapshot.anchors.length
    resizeObserver.observe(previewRootElement)
  }

  function scheduleRebuild(delayMs = CONTENT_REBUILD_DELAY_MS): void {
    if (rebuildTimer) clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null
      void nextTick(() => rebuildAnchors())
    }, delayMs)
  }

  function performSync(sourceSide: SyncScrollSide): void {
    if (!isReady()) return
    const sourceElement = sourceSide === 'left' ? options.leftScrollElement() : options.rightScrollElement()
    const targetElement = sourceSide === 'left' ? options.rightScrollElement() : options.leftScrollElement()
    if (!sourceElement || !targetElement) return

    const targetScrollTop = calculateSyncedScrollTop({
      sourceSide,
      sourceScrollTop: sourceElement.scrollTop,
      sourceMaxScrollTop: getScrollMax(sourceElement),
      targetMaxScrollTop: getScrollMax(targetElement),
      registry,
    })

    syncingFrom = sourceSide
    setScrollTopImmediate(targetElement, targetScrollTop)
    releaseSyncFlag()
  }

  function handleScroll(sourceSide: SyncScrollSide): void {
    if (!isReady()) return
    if (syncingFrom !== null) return

    if (loopDetector.record(sourceSide)) {
      loopDetector.reset()
      options.onLoopDetected?.()
      return
    }

    if (rafId !== null) return
    rafId = requestFrame(() => {
      rafId = null
      performSync(sourceSide)
    })
  }

  function bindListeners(): void {
    disposeListeners?.()
    disposeListeners = null
    resizeObserver.disconnect()
    registry.clear()
    anchorCount.value = 0

    if (!isReady()) return
    const leftScrollElement = options.leftScrollElement()
    const rightScrollElement = options.rightScrollElement()
    if (!leftScrollElement || !rightScrollElement) return

    const onLeftScroll = () => handleScroll('left')
    const onRightScroll = () => handleScroll('right')
    leftScrollElement.addEventListener('scroll', onLeftScroll, { passive: true })
    rightScrollElement.addEventListener('scroll', onRightScroll, { passive: true })
    disposeListeners = () => {
      leftScrollElement.removeEventListener('scroll', onLeftScroll)
      rightScrollElement.removeEventListener('scroll', onRightScroll)
    }

    scheduleRebuild(REBUILD_DELAY_MS)
  }

  function alignFromLeft(): void {
    if (!isReady()) return
    if (registry.count === 0) rebuildAnchors()
    performSync('left')
  }

  function dispose(): void {
    disposeListeners?.()
    disposeListeners = null
    resizeObserver.disconnect()
    clearScheduledWork()
    registry.clear()
    anchorCount.value = 0
    syncingFrom = null
  }

  watch(
    () => [options.enabled.value, options.active.value] as const,
    () => {
      clearScheduledWork()
      loopDetector.reset()
      void nextTick(() => bindListeners())
    },
    { immediate: true },
  )

  onBeforeUnmount(dispose)

  return { anchorCount, rebuildAnchors, scheduleRebuild, alignFromLeft, dispose }
}