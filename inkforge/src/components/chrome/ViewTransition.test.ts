/**
 * @vitest-environment happy-dom
 */
import { createApp, defineComponent, h, nextTick, onMounted } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it } from 'vitest'
import ViewTransition from './ViewTransition.vue'

describe('ViewTransition route identity', () => {
  let unmount: (() => void) | undefined

  afterEach(() => unmount?.())

  it('keeps the settings shell mounted while only the tab query changes', async () => {
    let mountCount = 0
    const SettingsShell = defineComponent({
      setup() {
        onMounted(() => { mountCount += 1 })
        return () => h('div', 'Settings shell')
      },
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/settings' },
        { path: '/settings', component: SettingsShell },
      ],
    })
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp(ViewTransition)
    app.use(router)

    await router.push('/settings?tab=appearance')
    await router.isReady()
    app.mount(host)
    unmount = () => {
      app.unmount()
      host.remove()
    }
    await nextTick()

    await router.push('/settings?tab=editor')
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 300))

    expect(mountCount).toBe(1)
  })
})
