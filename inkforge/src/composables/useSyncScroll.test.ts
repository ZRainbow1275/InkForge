/** @vitest-environment happy-dom */

import { effectScope, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useSyncScroll } from './useSyncScroll'

function createScrollSurface(): HTMLElement {
  const element = document.createElement('div')
  Object.defineProperties(element, {
    scrollHeight: { configurable: true, value: 1000 },
    clientHeight: { configurable: true, value: 400 },
  })
  return element
}

function waitForScrollFrame(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 30))
}

describe('useSyncScroll', () => {
  it('rebinds scroll listeners when the editor surface changes', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const enabled = ref(true)
    const active = ref(true)
    const leftA = createScrollSurface()
    const leftB = createScrollSurface()
    const right = createScrollSurface()
    let currentLeft = leftA
    const scope = effectScope()
    const syncScroll = scope.run(() => useSyncScroll({
      enabled,
      active,
      leftScrollElement: () => currentLeft,
      rightScrollElement: () => right,
      previewRootElement: () => right,
      editor: () => undefined,
      headings: () => [],
    }))!

    try {
      await nextTick()
      leftA.scrollTop = 300
      leftA.dispatchEvent(new Event('scroll'))
      await waitForScrollFrame()
      expect(right.scrollTop).toBe(300)

      currentLeft = leftB
      syncScroll.rebind()
      right.scrollTop = 0
      leftA.scrollTop = 500
      leftA.dispatchEvent(new Event('scroll'))
      await waitForScrollFrame()
      expect(right.scrollTop).toBe(0)

      leftB.scrollTop = 450
      leftB.dispatchEvent(new Event('scroll'))
      await waitForScrollFrame()
      expect(right.scrollTop).toBe(450)
    } finally {
      syncScroll.dispose()
      scope.stop()
      warnSpy.mockRestore()
    }
  })
})
