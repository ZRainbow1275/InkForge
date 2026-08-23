/**
 * @vitest-environment happy-dom
 */
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DeliveryAdornmentConfig } from '@/services/export'
import DeliverySettingsModal from './DeliverySettingsModal.vue'

const emptyConfig: DeliveryAdornmentConfig = {
  readingTime: { enabled: true, wordsPerMinute: 300 },
  license: 'none',
  components: [],
}

describe('DeliverySettingsModal', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('opens the requested real component control without entering export', async () => {
    const visible = ref(false)
    const closed = ref(false)
    const opener = document.createElement('button')
    const backgroundKeydown = vi.fn()
    document.addEventListener('keydown', backgroundKeydown)
    document.body.append(opener)
    opener.focus()

    const host = document.createElement('div')
    document.body.append(host)
    const Root = defineComponent({
      setup() {
        return () => h(DeliverySettingsModal, {
          visible: visible.value,
          modelValue: emptyConfig,
          platform: 'wechat',
          initialSection: 'song',
          onClose: () => {
            closed.value = true
            visible.value = false
          },
        })
      },
    })
    const app = createApp(Root)
    app.mount(host)
    cleanup = () => {
      document.removeEventListener('keydown', backgroundKeydown)
      app.unmount()
      host.remove()
      opener.remove()
    }

    visible.value = true
    await nextTick()
    await nextTick()

    const dialog = document.body.querySelector('[role="dialog"]')
    const songButton = document.body.querySelector<HTMLElement>('[data-delivery-add-type="song"]')
    expect(dialog?.getAttribute('aria-labelledby')).toBe('delivery-settings-title')
    expect(document.activeElement).toBe(songButton)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.textContent).not.toContain('导出文章')

    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', ctrlKey: true, bubbles: true }))
    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(closed.value).toBe(true)
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(opener)
    expect(backgroundKeydown).not.toHaveBeenCalled()
  })
})
