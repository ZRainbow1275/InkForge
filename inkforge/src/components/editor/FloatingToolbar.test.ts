/**
 * @vitest-environment happy-dom
 */
import type { Editor } from '@tiptap/core'
import { createApp, h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import FLOATING_TOOLBAR_SOURCE from './FloatingToolbar.vue?raw'
import FloatingToolbar from './FloatingToolbar.vue'

const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
  x: left,
  y: top,
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  toJSON: () => ({}),
})

function mountToolbar(options: {
  blocks?: Array<{ name: string; level?: number; parent?: string }>
  activeTypes?: string[]
  selectionEmpty?: boolean
} = {}) {
  const commandCalls: Array<[string, unknown?]> = []
  const listeners = new Map<string, Set<() => void>>()
  const selection = { empty: options.selectionEmpty ?? false, from: 1, to: 3 }
  const editorDom = document.createElement('div')
  const paper = document.createElement('div')
  const host = document.createElement('div')
  paper.className = 'editor-paper'
  paper.append(editorDom, host)
  document.body.append(paper)
  vi.spyOn(paper, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 680, 500))
  vi.spyOn(window, 'getSelection').mockReturnValue({
    rangeCount: 1,
    getRangeAt: () => ({ getBoundingClientRect: () => rect(120, 120, 80, 24) }),
  } as unknown as Selection)

  const chain = {
    focus: () => {
      commandCalls.push(['focus'])
      return chain
    },
    setParagraph: () => {
      commandCalls.push(['setParagraph'])
      return chain
    },
    toggleHeading: (options: { level: number }) => {
      commandCalls.push(['toggleHeading', options])
      return chain
    },
    toggleBlockquote: () => {
      commandCalls.push(['toggleBlockquote'])
      return chain
    },
    toggleBulletList: () => {
      commandCalls.push(['toggleBulletList'])
      return chain
    },
    toggleOrderedList: () => {
      commandCalls.push(['toggleOrderedList'])
      return chain
    },
    toggleTaskList: () => {
      commandCalls.push(['toggleTaskList'])
      return chain
    },
    toggleCodeBlock: () => {
      commandCalls.push(['toggleCodeBlock'])
      return chain
    },
    run: () => {
      commandCalls.push(['run'])
      return true
    },
  }

  const blocks = options.blocks ?? [{ name: 'paragraph' }]
  const editor = {
    view: { dom: editorDom },
    state: {
      selection,
      doc: {
        nodesBetween: (
          _from: number,
          _to: number,
          callback: (
            node: { type: { name: string }; attrs: { level?: number } },
            position: number,
            parent?: { type: { name: string } },
          ) => void,
        ) => {
          blocks.forEach((block, index) => callback(
            { type: { name: block.name }, attrs: { level: block.level } },
            index,
            block.parent ? { type: { name: block.parent } } : undefined,
          ))
        },
      },
    },
    isFocused: true,
    isActive: (type: string) => options.activeTypes?.includes(type) ?? false,
    chain: () => chain,
    getAttributes: () => ({}),
    on: (event: string, listener: () => void) => {
      const eventListeners = listeners.get(event) ?? new Set()
      eventListeners.add(listener)
      listeners.set(event, eventListeners)
    },
    off: (event: string, listener: () => void) => {
      listeners.get(event)?.delete(listener)
    },
  } as unknown as Editor

  const app = createApp({ render: () => h(FloatingToolbar, { editor }) })
  app.mount(host)

  return {
    host,
    selection,
    commandCalls,
    show: async () => {
      listeners.get('selectionUpdate')?.forEach(listener => listener())
      await nextTick()
      await nextTick()
    },
    cleanup: () => {
      app.unmount()
      paper.remove()
      vi.restoreAllMocks()
    },
  }
}

describe('FloatingToolbar semantic controls', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
  })

  it('exposes every block semantic through one Chinese selector and keeps command focus', async () => {
    const fixture = mountToolbar()
    cleanup = fixture.cleanup
    await fixture.show()

    const selector = fixture.host.querySelector<HTMLSelectElement>('select[aria-label="块级语义"]')
    expect(selector).not.toBeNull()
    expect(Array.from(selector!.options, option => [option.value, option.textContent])).toEqual([
      ['paragraph', '正文'],
      ['heading-1', '一级标题'],
      ['heading-2', '二级标题'],
      ['heading-3', '三级标题'],
      ['heading-4', '四级标题'],
      ['heading-5', '五级标题'],
      ['heading-6', '六级标题'],
      ['blockquote', '引用'],
      ['bullet-list', '无序列表'],
      ['ordered-list', '有序列表'],
      ['task-list', '任务列表'],
      ['code-block', '代码块'],
    ])

    const expectedCommands: Array<[string, string, unknown?]> = [
      ['paragraph', 'setParagraph'],
      ['heading-1', 'toggleHeading', { level: 1 }],
      ['heading-2', 'toggleHeading', { level: 2 }],
      ['heading-3', 'toggleHeading', { level: 3 }],
      ['heading-4', 'toggleHeading', { level: 4 }],
      ['heading-5', 'toggleHeading', { level: 5 }],
      ['heading-6', 'toggleHeading', { level: 6 }],
      ['blockquote', 'toggleBlockquote'],
      ['bullet-list', 'toggleBulletList'],
      ['ordered-list', 'toggleOrderedList'],
      ['task-list', 'toggleTaskList'],
      ['code-block', 'toggleCodeBlock'],
    ]

    const originalSelection = fixture.selection
    const pointerDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    selector!.dispatchEvent(pointerDown)
    expect(pointerDown.defaultPrevented).toBe(false)
    expect(fixture.selection).toBe(originalSelection)

    for (const [value, command, options] of expectedCommands) {
      fixture.commandCalls.length = 0
      selector!.value = value
      selector!.dispatchEvent(new Event('change', { bubbles: true }))
      expect(fixture.commandCalls).toEqual([
        ['focus'],
        [command, options].filter(item => item !== undefined),
        ['run'],
      ])
      expect(fixture.selection).toBe(originalSelection)
    }
  })

  it('shows the current block semantic for a focused caret without requiring a text selection', async () => {
    const fixture = mountToolbar({ selectionEmpty: true, activeTypes: ['heading'] })
    cleanup = fixture.cleanup
    await fixture.show()

    expect(fixture.host.querySelector('.floating-toolbar')).not.toBeNull()
    expect(fixture.host.querySelector<HTMLSelectElement>('select.ft-block-select')?.value).toBe('heading-1')
  })

  it('groups character and structure controls, labels every button, and closes outside or on Escape', async () => {
    const buttonTags = FLOATING_TOOLBAR_SOURCE.match(/<button\b[\s\S]*?>/g) ?? []
    expect(buttonTags.length).toBeGreaterThan(0)
    for (const buttonTag of buttonTags) {
      expect(buttonTag).toMatch(/(?::)?aria-label="[^"]*[\u3400-\u9fff]/)
    }
    expect(FLOATING_TOOLBAR_SOURCE).toMatch(/role="group"\s+aria-label="字符格式"/)
    expect(FLOATING_TOOLBAR_SOURCE).toMatch(/role="group"\s+aria-label="结构操作"/)
    expect(FLOATING_TOOLBAR_SOURCE).toContain('box-sizing: border-box')
    expect(FLOATING_TOOLBAR_SOURCE).toContain('width: calc(100vw - 24px)')

    const fixture = mountToolbar()
    cleanup = fixture.cleanup
    await fixture.show()
    expect(fixture.host.querySelector('.floating-toolbar')).not.toBeNull()

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }))
    await nextTick()
    fixture.host.querySelector('.floating-toolbar')?.dispatchEvent(new Event('animationend'))
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(fixture.host.querySelector('.floating-toolbar')).toBeNull()
    expect(fixture.commandCalls.slice(-2)).toEqual([['focus'], ['run']])

    await fixture.show()
    expect(fixture.host.querySelector('.floating-toolbar')).not.toBeNull()
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    fixture.host.querySelector('.floating-toolbar')?.dispatchEvent(new Event('animationend'))
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(fixture.host.querySelector('.floating-toolbar')).toBeNull()
  })

  it('shows mixed block state and disables semantic changes inside table or component atoms', async () => {
    const mixedFixture = mountToolbar({
      blocks: [
        { name: 'heading', level: 2 },
        { name: 'paragraph' },
      ],
    })
    cleanup = mixedFixture.cleanup
    await mixedFixture.show()

    const mixedSelector = mixedFixture.host.querySelector<HTMLSelectElement>('select.ft-block-select')
    expect(mixedSelector?.value).toBe('mixed')
    expect(mixedSelector?.selectedOptions[0]?.textContent?.trim()).toBe('多种格式')
    expect(mixedSelector?.disabled).toBe(false)

    mixedFixture.cleanup()
    cleanup = undefined

    const tableFixture = mountToolbar({ activeTypes: ['tableCell'] })
    cleanup = tableFixture.cleanup
    await tableFixture.show()
    const tableSelector = tableFixture.host.querySelector<HTMLSelectElement>('select.ft-block-select')
    expect(tableSelector?.disabled).toBe(true)
    expect(tableSelector?.getAttribute('aria-label')).toContain('当前组件或表格单元不可切换')

    tableFixture.cleanup()
    cleanup = undefined

    const componentFixture = mountToolbar({ activeTypes: ['inkComponent'] })
    cleanup = componentFixture.cleanup
    await componentFixture.show()
    expect(componentFixture.host.querySelector<HTMLSelectElement>('select.ft-block-select')?.disabled).toBe(true)
  })
})
