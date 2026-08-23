// @vitest-environment happy-dom
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { NodeSelection } from '@tiptap/pm/state'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { InkComponent } from './InkComponent'

const editors: Editor[] = []

afterEach(() => {
  editors.splice(0).forEach(editor => editor.destroy())
  document.body.replaceChildren()
})

function mountInkComponent(source: string, status: string): HTMLElement {
  const element = document.createElement('div')
  document.body.append(element)
  const editor = new Editor({
    element,
    extensions: [StarterKit, InkComponent],
    content: `<section data-ink-component-source="${source.replace(/"/g, '&quot;')}" data-ink-component-id="TipBlock" data-ink-component-label="提示框" data-ink-component-status="${status}"></section>`,
  })
  editors.push(editor)
  return element
}

describe('InkComponent', () => {
  it('parses a rendered component as an atomic selectable block', () => {
    const source = '<TipBlock version="1" content="真实提示" />'
    const editor = new Editor({
      extensions: [StarterKit, InkComponent],
      content: `<section data-ink-component-source="${source.replace(/"/g, '&quot;')}" data-ink-component-id="TipBlock" data-ink-component-label="提示框" data-ink-component-status="ready"><p>正文不会进入节点</p></section>`,
    })
    editors.push(editor)

    const node = editor.getJSON().content?.[0]
    expect(node?.type).toBe('inkComponent')
    expect(node?.attrs?.source).toBe(source)
    expect(node?.attrs?.status).toBe('ready')
    expect(editor.getHTML()).toContain('data-ink-component-source=')
    expect(editor.getHTML()).not.toContain('正文不会进入节点')
  })

  it('renders the real component type and payload summary in the node view', () => {
    const source = '<TipBlock version="1" title="注意" content="真实提示" />'
    const element = mountInkComponent(source, 'ready')
    const card = element.querySelector<HTMLElement>('.ink-component-card')

    expect(card?.dataset.inkComponentId).toBe('TipBlock')
    expect(card?.dataset.inkComponentStatus).toBe('ready')
    expect(card?.querySelector('.ink-component-card__type')?.textContent).toBe('TipBlock')
    expect(card?.querySelector('.ink-component-card__summary')?.textContent).toContain('标题：注意')
    expect(card?.querySelector('.ink-component-card__summary')?.textContent).toContain('内容：真实提示')
    expect(card?.querySelector('.ink-component-card__status')?.textContent).toBe('已通过组件校验')
    expect(card?.hasAttribute('aria-invalid')).toBe(false)
  })

  it('renders the validated component visual once without nesting canonical source markup', () => {
    const source = '<TipBlock version="1" title="注意" content="真实提示" />'
    const element = mountInkComponent(source, 'ready')
    const card = element.querySelector<HTMLElement>('.ink-component-card')

    expect(card?.querySelector('[data-ink-writing-component="TipBlock"]')?.textContent).toContain('真实提示')
    expect(card?.querySelectorAll('[data-ink-component-source]')).toHaveLength(0)
    expect(element.querySelectorAll('[data-ink-component-source]')).toHaveLength(1)
  })

  it('keeps visual links out of the tab order and prevents editor-time navigation', () => {
    const source = '<LinkBlock version="1" title="真实链接" description="编辑态不可跳转" url="https://example.com/read" />'
    const element = mountInkComponent(source, 'ready')
    const link = element.querySelector<HTMLAnchorElement>('.ink-component-card__visual a')

    expect(link?.tabIndex).toBe(-1)
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    link?.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)

    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      link?.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    }
  })

  it('derives an incomplete payload error from the saved source instead of a generic state', () => {
    const source = '<TipBlock version="1" />'
    const element = mountInkComponent(source, 'ready')
    const card = element.querySelector<HTMLElement>('.ink-component-card')

    expect(card?.dataset.inkComponentStatus).toBe('incomplete')
    expect(card?.classList.contains('has-error')).toBe(true)
    expect(card?.getAttribute('aria-invalid')).toBe('true')
    expect(card?.querySelector('.ink-component-card__summary')?.textContent).toContain(source)
    expect(card?.querySelector('.ink-component-card__status')?.textContent).not.toBe('待补充或待恢复')
    expect(card?.querySelector('.ink-component-card__status')?.textContent?.length).toBeGreaterThan(0)
  })

  it('sends the exact saved source and document position through the edit action', () => {
    const source = '<TipBlock version="1" title="注意" content="真实提示" />'
    const onEditRequested = vi.fn()
    const element = document.createElement('div')
    document.body.append(element)
    const editor = new Editor({
      element,
      extensions: [StarterKit, InkComponent.configure({ onEditRequested })],
      content: `<section data-ink-component-source="${source.replace(/"/g, '&quot;')}" data-ink-component-id="TipBlock" data-ink-component-label="提示框" data-ink-component-status="ready"></section>`,
    })
    editors.push(editor)

    element.querySelector<HTMLButtonElement>('.ink-component-card__edit')?.click()

    expect(onEditRequested).toHaveBeenCalledTimes(1)
    expect(onEditRequested).toHaveBeenCalledWith(source, expect.any(Number))
    expect(onEditRequested.mock.calls[0]?.[1]).toBeGreaterThanOrEqual(0)
  })

  it('supports atomic selection, deletion, undo, and serialized reopen without losing source', () => {
    const source = '<TipBlock version="1" title="注意" content="真实提示" />'
    const element = document.createElement('div')
    document.body.append(element)
    const editor = new Editor({
      element,
      extensions: [StarterKit, InkComponent],
      content: `<p>前文</p><section data-ink-component-source="${source.replace(/"/g, '&quot;')}" data-ink-component-id="TipBlock" data-ink-component-label="提示框" data-ink-component-status="ready"></section><p>后文</p>`,
    })
    editors.push(editor)
    let componentPosition = -1
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === 'inkComponent') componentPosition = position
    })

    expect(componentPosition).toBeGreaterThan(-1)
    expect(editor.commands.setNodeSelection(componentPosition)).toBe(true)
    expect(editor.state.selection).toBeInstanceOf(NodeSelection)
    expect((editor.state.selection as NodeSelection).node.type.name).toBe('inkComponent')
    expect(element.querySelector('.ink-component-card')?.classList.contains('is-selected')).toBe(true)

    expect(editor.commands.deleteSelection()).toBe(true)
    expect(editor.getJSON().content?.some(node => node.type === 'inkComponent')).toBe(false)
    expect(editor.commands.undo()).toBe(true)
    expect(editor.getJSON().content?.some(node => node.type === 'inkComponent')).toBe(true)

    const serialized = editor.getHTML()
    const reopenedElement = document.createElement('div')
    document.body.append(reopenedElement)
    const reopened = new Editor({
      element: reopenedElement,
      extensions: [StarterKit, InkComponent],
      content: serialized,
    })
    editors.push(reopened)
    expect(reopened.getJSON().content?.find(node => node.type === 'inkComponent')?.attrs?.source).toBe(source)
  })
})
