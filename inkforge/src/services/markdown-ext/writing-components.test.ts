// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { renderInkforgeMarkdownExtensions } from './render'

describe('writing component markdown extension', () => {
  it('renders registered components while preserving code examples', async () => {
    const rendered = await renderInkforgeMarkdownExtensions([
      '<TipBlock version="1" title="提示" content="真实内容" />',
      '',
      '```md',
      '<TipBlock version="1" title="代码" content="不应渲染" />',
      '```',
    ].join('\n'))

    expect(rendered).toContain('data-ink-component-id="TipBlock"')
    expect(rendered).toContain('真实内容')
    expect(rendered).toContain('<TipBlock version="1" title="代码" content="不应渲染" />')
  })

  it('keeps component source and metadata opaque to inline Markdown extensions', async () => {
    const source = '<TipBlock version="1" title="术语" content="见 [[术语]] 与 ==重点==" />'
    const rendered = await renderInkforgeMarkdownExtensions(source)
    const template = document.createElement('template')
    template.innerHTML = rendered
    const component = template.content.querySelector('section[data-ink-component-source]')

    expect(component?.getAttribute('data-ink-component-source')).toBe(source)
    expect(component?.getAttribute('data-ink-component-id')).toBe('TipBlock')
    expect(component?.getAttribute('data-ink-component-status')).toBe('ready')
    expect(rendered).not.toContain('inkforge-opaque-writing-component')
  })

  it('restores an opaque component as a block inside a details container', async () => {
    const rendered = await renderInkforgeMarkdownExtensions([
      ':::details 组件详情',
      '<TipBlock version="1" title="术语" content="见 [[术语]] 与 ==重点==" />',
      ':::',
    ].join('\n'))
    const template = document.createElement('template')
    template.innerHTML = rendered

    expect(template.content.querySelector('details section[data-ink-component-id="TipBlock"]')).not.toBeNull()
    expect(template.content.querySelector('details p > section[data-ink-component-id]')).toBeNull()
  })
})
