import { describe, expect, it } from 'vitest'

import { renderMarkdownWithOptionalEnhancements } from '@/services/rendering/optional-renderers'
import { CJK_EMPHASIS_BOUNDARY, normalizeCjkAdjacentEmphasis } from './render'

describe('CJK-adjacent Markdown emphasis', () => {
  it('repairs only CJK-adjacent emphasis and supports nested strong emphasis', async () => {
    const source = [
      '**文章。**这是正文',
      '*提示。*继续阅读',
      '***重点。***然后展开',
      '**foo!**bar',
    ].join('\n\n')

    const normalized = normalizeCjkAdjacentEmphasis(source)
    expect(normalized).toContain(`**文章。**${CJK_EMPHASIS_BOUNDARY}这`)
    expect(normalized).toContain(`***重点。***${CJK_EMPHASIS_BOUNDARY}然`)
    expect(normalized).toContain('**foo!**bar')

    const html = await renderMarkdownWithOptionalEnhancements(source)
    expect(html).toContain('<strong>文章。</strong>这是正文')
    expect(html).toContain('<em>提示。</em>继续阅读')
    expect(html).toContain('<em><strong>重点。</strong></em>然后展开')
    expect(html).toContain('**foo!**bar')
    expect(html).not.toContain(CJK_EMPHASIS_BOUNDARY)
  })

  it('does not alter multi-backtick code spans or shorter fences nested in a longer fence', async () => {
    const source = [
      '``**代码。**这`段`保持`` **正文。**这段修复',
      '',
      '````md',
      '```',
      '**围栏。**这不能改',
      '<TipBlock version="1" content="围栏组件不能渲染" />',
      '```',
      '````',
    ].join('\n')

    const normalized = normalizeCjkAdjacentEmphasis(source)
    expect(normalized).toContain('``**代码。**这`段`保持``')
    expect(normalized).toContain('**围栏。**这不能改')
    expect(normalized).toContain(`**正文。**${CJK_EMPHASIS_BOUNDARY}这段修复`)

    const html = await renderMarkdownWithOptionalEnhancements(source)
    expect(html).toContain('<code>**代码。**这`段`保持</code>')
    expect(html).toContain('**围栏。**这不能改')
    expect(html).toContain('&lt;TipBlock version=&quot;1&quot; content=&quot;围栏组件不能渲染&quot; /&gt;')
    expect(html).not.toContain('data-ink-component-id="TipBlock"')
    expect(html).not.toContain(CJK_EMPHASIS_BOUNDARY)
  })

  it('continues scanning after an unmatched opener and protects a later valid code span', async () => {
    const source = '`未闭合 ``**代码。**这 ==也不是高亮==`` **正文。**这段修复'
    const normalized = normalizeCjkAdjacentEmphasis(source)

    expect(normalized).toContain('`未闭合 ``**代码。**这 ==也不是高亮==``')
    expect(normalized).toContain(`**正文。**${CJK_EMPHASIS_BOUNDARY}这段修复`)

    const html = await renderMarkdownWithOptionalEnhancements(source)
    expect(html).toContain('<code>**代码。**这 ==也不是高亮==</code>')
    expect(html).not.toContain('<mark>也不是高亮</mark>')
  })
})
