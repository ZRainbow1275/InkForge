/**
 * @vitest-environment happy-dom
 */
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import WritingComponentLibrary from './WritingComponentLibrary.vue'

describe('WritingComponentLibrary accessibility', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => cleanup?.())

  it('focuses search, exposes tabs, traps focus, and closes with Escape', async () => {
    const closeEvents: string[] = []
    const host = document.createElement('div')
    document.body.append(host)
    const Root = defineComponent({
      setup() {
        const visible = ref(true)
        return () => h(WritingComponentLibrary, {
          visible: visible.value,
          onClose: () => closeEvents.push('close'),
        })
      },
    })
    const app = createApp(Root)
    app.mount(host)
    cleanup = () => {
      app.unmount()
      host.remove()
      document.querySelector('.component-library-backdrop')?.remove()
    }
    await nextTick()
    await nextTick()

    const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]')
    const search = document.querySelector<HTMLInputElement>('input[aria-label="搜索组件"]')
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'))
    expect(dialog).not.toBeNull()
    expect(search).not.toBeNull()
    expect(document.activeElement).toBe(search)
    expect(tabs).toHaveLength(2)
    expect(tabs.map(tab => tab.getAttribute('aria-selected'))).toEqual(['true', 'false'])

    const focusable = Array.from(dialog!.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    last.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(document.activeElement).toBe(first)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(closeEvents).toEqual(['close'])
  })
})
