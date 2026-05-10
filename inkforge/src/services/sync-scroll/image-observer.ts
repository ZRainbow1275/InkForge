export interface ResizeRebuildObserver {
  observe(root: HTMLElement): void
  disconnect(): void
}

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

export function createResizeRebuildObserver(onChange: () => void): ResizeRebuildObserver {
  if (typeof ResizeObserver === 'undefined') {
    return { observe: () => undefined, disconnect: () => undefined }
  }

  let frameId: number | null = null
  const schedule = () => {
    if (frameId !== null) return
    frameId = requestFrame(() => {
      frameId = null
      onChange()
    })
  }
  const observer = new ResizeObserver(schedule)

  return {
    observe(root: HTMLElement): void {
      observer.disconnect()
      observer.observe(root)
      root.querySelectorAll('img, svg, table, pre, .katex-display, .mermaid-rendered').forEach(element => {
        observer.observe(element)
      })
    },
    disconnect(): void {
      if (frameId !== null) {
        cancelFrame(frameId)
        frameId = null
      }
      observer.disconnect()
    },
  }
}