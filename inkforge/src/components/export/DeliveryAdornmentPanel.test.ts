/**
 * @vitest-environment happy-dom
 */
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import type { DeliveryAdornmentConfig } from '@/services/export'
import DeliveryAdornmentPanel from './DeliveryAdornmentPanel.vue'

describe('DeliveryAdornmentPanel', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => cleanup?.())

  it('edits optional real media fields and links invalid fields to the visible error', async () => {
    const model = ref<DeliveryAdornmentConfig>({
      readingTime: { enabled: true, wordsPerMinute: 300 },
      license: 'none',
      components: [
        {
          id: 'song',
          type: 'song',
          enabled: true,
          title: '夜航',
          artist: '墨铸编辑部',
          url: 'https://example.com/night-flight',
        },
        {
          id: 'profile',
          type: 'contact-card',
          enabled: true,
          displayName: '墨铸公众号',
          accountId: 'inkforge',
          profileUrl: '',
        },
      ],
    })
    const updates: DeliveryAdornmentConfig[] = []
    const host = document.createElement('div')
    document.body.append(host)
    const Root = defineComponent({
      setup() {
        return () => h(DeliveryAdornmentPanel, {
          modelValue: model.value,
          platform: 'wechat',
          'onUpdate:modelValue': (value: DeliveryAdornmentConfig) => {
            updates.push(value)
            model.value = value
          },
        })
      },
    })
    const app = createApp(Root)
    app.mount(host)
    cleanup = () => {
      app.unmount()
      host.remove()
    }
    await nextTick()

    const cover = host.querySelector<HTMLInputElement>('[aria-label="歌曲封面 HTTPS 地址"]')
    expect(cover).not.toBeNull()
    expect(host.querySelector('[aria-label="名片简介"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="名片头像 HTTPS 地址"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="名片二维码 HTTPS 地址"]')).not.toBeNull()

    cover!.value = 'http://images.example.com/cover.png'
    cover!.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextTick()
    expect(cover!.getAttribute('aria-invalid')).toBe('true')
    expect(cover!.getAttribute('aria-describedby')).toBe('delivery-validation')
    expect(host.querySelector('#delivery-validation')?.textContent).toContain('图片仅允许无凭据的 HTTPS URL')

    cover!.value = 'https://images.example.com/cover.png'
    cover!.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextTick()
    expect(cover!.getAttribute('aria-invalid')).not.toBe('true')
    expect(updates.at(-1)?.components[0]).toMatchObject({
      type: 'song',
      coverUrl: 'https://images.example.com/cover.png',
    })
  })
})
