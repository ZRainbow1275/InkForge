// @vitest-environment happy-dom
import { Editor } from '@tiptap/core'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import ListItem from '@tiptap/extension-list-item'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'

import { CitationMarks } from './CitationMarks'
import { InkComponent } from './InkComponent'
import { isLikelyHtmlContent, renderMarkdownToHtml, serializeHtmlToMarkdown } from './TyporaMode'

const InkforgeListItem = ListItem.extend({
  addAttributes() {
    return {
      footnoteId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.dataset.footnoteId ?? null,
        renderHTML: attributes => attributes.footnoteId ? { 'data-footnote-id': attributes.footnoteId } : {},
      },
    }
  },
})

describe('TyporaMode writing component round-trip', () => {
  it('preserves H1-H6, quote, list, task, and code semantics through source round-trip', async () => {
    const source = [
      '# 一级标题',
      '## 二级标题',
      '### 三级标题',
      '#### 四级标题',
      '##### 五级标题',
      '###### 六级标题',
      '',
      '> 引用内容',
      '',
      '- 无序条目',
      '',
      '1. 有序条目',
      '',
      '- [ ] 待办条目',
      '',
      '```ts',
      'const preserved = true',
      '```',
    ].join('\n')

    const firstHtml = await renderMarkdownToHtml(source)
    const markdown = serializeHtmlToMarkdown(firstHtml)
    const secondHtml = await renderMarkdownToHtml(markdown)
    const document = new DOMParser().parseFromString(secondHtml, 'text/html')

    for (let level = 1; level <= 6; level += 1) {
      expect(document.querySelector(`h${level}`)?.textContent).toBe(`${'一二三四五六'[level - 1]}级标题`)
    }
    expect(document.querySelector('blockquote')?.textContent).toContain('引用内容')
    expect(document.querySelector('ul')?.textContent).toContain('无序条目')
    expect(document.querySelector('ol')?.textContent).toContain('有序条目')
    expect(secondHtml).toContain('待办条目')
    expect(document.querySelector('pre code')?.textContent).toContain('const preserved = true')
  })

  it('preserves registered component source and order', async () => {
    const source = '<StatBlock version="1" label="完成率" value="42%" description="实测" source="2026 年报" />'
    const html = await renderMarkdownToHtml(`上文\n\n${source}\n\n下文`)
    expect(html).toContain('data-ink-component-source=')

    const markdown = serializeHtmlToMarkdown(html)
    expect(markdown).toContain(source)
    expect(markdown.indexOf('上文')).toBeLessThan(markdown.indexOf(source))
    expect(markdown.indexOf(source)).toBeLessThan(markdown.indexOf('下文'))
  })

  it('treats paired inline HTML in a Markdown document as Markdown and renders writing components', async () => {
    const source = [
      '# 混合文稿',
      '',
      '正文含 <u>下划线</u>、<mark>高亮</mark>、H<sub>2</sub>O 与 x<sup>2</sup>。',
      '',
      '- 列表条目',
      '',
      '```ts',
      "const inlineHtml = '<mark>代码示例</mark>'",
      '```',
      '',
      '<TipBlock version="1" title="混合文稿组件" content="真实渲染" />',
    ].join('\n')

    expect(isLikelyHtmlContent(source)).toBe(false)

    const html = await renderMarkdownToHtml(source)
    const document = new DOMParser().parseFromString(html, 'text/html')
    expect(document.querySelector('h1')?.textContent).toBe('混合文稿')
    expect(document.querySelector('li')?.textContent).toContain('列表条目')
    expect(document.querySelector('pre code')?.textContent).toContain("const inlineHtml = '<mark>代码示例</mark>'")
    expect(document.querySelector('[data-ink-component-id="TipBlock"]')).not.toBeNull()
  })

  it('distinguishes legacy HTML fragments from pure Markdown', () => {
    const legacyHtml = [
      '<h2>旧版标题</h2>',
      '<p>旧版正文含 <mark>重点</mark>。</p>',
      '<ul><li>旧版列表</li></ul>',
    ].join('')

    expect(isLikelyHtmlContent(legacyHtml)).toBe(true)
    expect(serializeHtmlToMarkdown(legacyHtml)).toContain('## 旧版标题')
    expect(isLikelyHtmlContent('# 纯 Markdown\n\n- 列表条目')).toBe(false)
    expect(isLikelyHtmlContent('<TipBlock version="1" title="组件" content="内容" />')).toBe(false)
  })

  it('rebuilds a registered component as an atomic TipTap node', async () => {
    const source = '<TipBlock version="1" title="原生组件验收" content="真实内容" />'
    const html = await renderMarkdownToHtml(source)
    const editor = new Editor({
      extensions: [StarterKit, InkComponent],
      content: html,
    })

    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: 'inkComponent',
      attrs: {
        componentId: 'TipBlock',
        source,
        status: 'ready',
      },
    })
    editor.destroy()
  })

  it('preserves CJK emphasis before adjacent prose without touching code', async () => {
    const markdown = serializeHtmlToMarkdown([
      '<p><strong>文章值得您享受。</strong>这是一段正文，<em>请留意。</em>然后继续。</p>',
      '<p><code>**代码。**这</code></p>',
      '<pre><code>**围栏。**这</code></pre>',
    ].join(''))
    const html = await renderMarkdownToHtml(markdown)
    const document = new DOMParser().parseFromString(html, 'text/html')

    expect(document.querySelector('strong')?.textContent).toBe('文章值得您享受。')
    expect(document.querySelector('em')?.textContent).toBe('请留意。')
    expect(document.querySelector('p code')?.textContent).toBe('**代码。**这')
    expect(document.querySelector('pre code')?.textContent?.trim()).toBe('**围栏。**这')
    expect(html).not.toContain('ink-cjk-emphasis-boundary')
  })

  it('preserves inline semantics and footnotes through three production Tiptap round trips', async () => {
    const source = [
      '###### 相邻标题',
      '本文包含 **加粗**、*斜体*、~~删除线~~、`inlineCode()`、[公开仓库链接](https://github.com/ZRainbow1275/InkForge)、<u>下划线</u>、<mark>高亮</mark>、H<sub>2</sub>O 与 x<sup>2</sup>。',
      '',
      '参考资料：InkForge 公开仓库与本次当前 release 的结构化读回。[^inkforge]',
      '',
      '[^inkforge]: https://github.com/ZRainbow1275/InkForge',
      '',
      '- 外层条目',
      '  - 嵌套条目',
      '',
      '- [x] 已完成任务',
      '- [ ] 待处理任务',
      '',
      '行内公式 $E = mc^2$。',
      '',
      '$$',
      'a^2 + b^2 = c^2',
      '$$',
      '',
      '```mermaid',
      'graph LR',
      '  InkForge --> WeChat',
      '```',
    ].join('\n')
    const extensions = [
      StarterKit.configure({ listItem: false }),
      InkforgeListItem,
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Link.configure({ openOnClick: false, autolink: false, linkOnPaste: false }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      ...CitationMarks,
      Subscript,
      Superscript,
    ]
    let markdown = source

    for (let round = 0; round < 3; round += 1) {
      const rendered = await renderMarkdownToHtml(markdown)
      const editor = new Editor({ extensions, content: rendered })
      const editorHtml = editor.getHTML()
      markdown = serializeHtmlToMarkdown(editorHtml)
      editor.destroy()

      expect(markdown).toContain('**加粗**')
      expect(markdown).toContain('*斜体*')
      expect(markdown).toContain('~~删除线~~')
      expect(markdown).toContain('`inlineCode()`')
      expect(markdown).toContain('[公开仓库链接](https://github.com/ZRainbow1275/InkForge)')
      expect(markdown).toContain('<u>下划线</u>')
      expect(markdown).toContain('==高亮==')
      expect(markdown).toContain('H<sub>2</sub>O 与 x<sup>2</sup>')
      expect(markdown).toContain('。[^inkforge]')
      expect(markdown).toMatch(/\[\^inkforge\]: .*https:\/\/github\.com\/ZRainbow1275\/InkForge/)
      expect(markdown).toContain('- 外层条目\n  - 嵌套条目')
      expect(markdown).toContain('- [x] 已完成任务')
      expect(markdown).toContain('- [ ] 待处理任务')
      expect(markdown).toContain('行内公式 $E = mc^2$。')
      expect(markdown).toContain('$$\na^2 + b^2 = c^2\n$$')
      expect(markdown).toContain('```mermaid\ngraph LR\n  InkForge --> WeChat\n```')
      expect(markdown).not.toContain('[[^inkforge]]')
      expect(markdown).not.toContain('#wikilink-')
      expect(markdown).not.toContain('## Footnotes')
      expect(markdown).not.toContain('back')
      expect(markdown).not.toContain('\\*\\*')
    }

    const rendered = await renderMarkdownToHtml(markdown)
    const document = new DOMParser().parseFromString(rendered, 'text/html')
    expect(document.querySelector('strong')?.textContent).toBe('加粗')
    expect(document.querySelector('em')?.textContent).toBe('斜体')
    expect(document.querySelector('del')?.textContent).toBe('删除线')
    expect(document.querySelector('code')?.textContent).toBe('inlineCode()')
    expect(document.querySelector('a[href="https://github.com/ZRainbow1275/InkForge"]')?.textContent).toBe('公开仓库链接')
    expect(document.querySelector('u')?.textContent).toBe('下划线')
    expect(document.querySelector('mark')?.textContent).toBe('高亮')
    expect(document.querySelector('sub')?.textContent).toBe('2')
    expect(document.querySelector('sup:not(.ink-footnote-ref)')?.textContent).toBe('2')
    expect(document.querySelector('.ink-footnote-ref [data-footnote-id]')?.getAttribute('data-footnote-id')).toBe('inkforge')
    expect(document.querySelector('li[data-footnote-id="inkforge"]')?.textContent).toContain('github.com/ZRainbow1275/InkForge')
    expect(document.querySelector('ul[data-type="taskList"] li[data-checked="true"]')?.textContent).toContain('已完成任务')
    expect(document.querySelector('ul[data-type="taskList"] li[data-checked="false"]')?.textContent).toContain('待处理任务')
    expect(document.body.textContent).toContain('行内公式 $E = mc^2$。')
    expect(document.body.textContent).toContain('a^2 + b^2 = c^2')
    expect(document.querySelector('pre code.language-mermaid')?.textContent).toContain('InkForge --> WeChat')
  })
})
