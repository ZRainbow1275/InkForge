import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { renderInkforgeMarkdownExtensions } from '@/services/markdown-ext/render'
import { useTocStore } from '@/stores/toc'
import { buildTocTree, createTocHeadingId, parseTocFromMarkdown, parseTocFromProseMirrorDoc, stripHeadingMarkup } from './parser'

function createFakeDoc(): ProseMirrorNode {
  const heading = (level: number, text: string) => ({
    type: { name: 'heading' },
    attrs: { level },
    textContent: text,
  })
  const paragraph = { type: { name: 'paragraph' }, attrs: {}, textContent: 'body' }
  return {
    descendants: (callback: (node: typeof paragraph, pos: number) => void) => {
      callback(heading(1, 'Intro'), 1)
      callback(paragraph, 8)
      callback(heading(2, 'Details'), 12)
      callback(heading(4, 'Deep'), 21)
    },
  } as unknown as ProseMirrorNode
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('TOC parser', () => {
  it('strips heading inline markup and generates deterministic collision-safe ids', () => {
    expect(stripHeadingMarkup('**Bold** [`Link`](https://example.com)')).toBe('Bold Link')
    const used = new Map<string, number>()
    expect(createTocHeadingId('Intro', 10, used)).toEqual({ id: 'heading-intro-10', slug: 'intro' })
    expect(createTocHeadingId('Intro', 20, used)).toEqual({ id: 'heading-intro-2-20', slug: 'intro-2' })
  })

  it('parses markdown headings outside fences and builds nested numbering', () => {
    const markdown = ['# Title', '```', '## Ignored', '```', '## Section', '#### Deep', '## Next'].join('\n')
    const result = parseTocFromMarkdown(markdown, { maxDepth: 4, numbering: 'nested' })

    expect(result.flat.map(heading => ({ level: heading.level, text: heading.text, numbering: heading.numbering }))).toEqual([
      { level: 1, text: 'Title', numbering: '1' },
      { level: 2, text: 'Section', numbering: '1.1' },
      { level: 4, text: 'Deep', numbering: '1.1.1' },
      { level: 2, text: 'Next', numbering: '1.2' },
    ])
    expect(result.tree[0].children[0].children[0]).toMatchObject({ text: 'Deep', depth: 2 })
  })

  it('builds a tree from flat headings and keeps lower initial headings as roots', () => {
    const result = parseTocFromMarkdown(['### Starts Deep', '#### Child', '## Sibling'].join('\n'))
    const tree = buildTocTree(result.flat)

    expect(tree.map(node => node.text)).toEqual(['Starts Deep', 'Sibling'])
    expect(tree[0].children.map(node => node.text)).toEqual(['Child'])
  })

  it('parses ProseMirror heading nodes through the same tree builder', () => {
    const result = parseTocFromProseMirrorDoc(createFakeDoc(), { maxDepth: 3 })

    expect(result.flat.map(heading => heading.text)).toEqual(['Intro', 'Details'])
    expect(result.tree[0].children.map(heading => heading.text)).toEqual(['Details'])
  })
})

describe('TOC store and markdown renderer integration', () => {
  it('updates store state from markdown and prunes collapsed ids when headings disappear', () => {
    const store = useTocStore()
    store.setOptions({ numbering: 'decimal', maxDepth: 3 })
    const first = store.updateFromMarkdown('# A\n## B')
    const collapsedId = store.flatHeadings[1].id

    store.toggleCollapsed(collapsedId)
    expect(store.isCollapsed(collapsedId)).toBe(true)
    store.setActiveByPosition(store.flatHeadings[1].pos)
    expect(first.total).toBe(2)
    expect(store.activeHeadingId).toBe(collapsedId)

    store.updateFromMarkdown('# A')
    expect(store.isCollapsed(collapsedId)).toBe(false)
    expect(store.activeHeadingId).toBeNull()
  })

  it('keeps existing [toc] markdown rendering source-preserving and anchor-compatible', async () => {
    const rendered = await renderInkforgeMarkdownExtensions('[toc depth=3 numbered=true]\n# Alpha\n## Beta')

    expect(rendered).toContain('class="ink-toc"')
    expect(rendered).toContain('data-numbered="true"')
    expect(rendered).toContain('href="#alpha"')
    expect(rendered).toContain('id="alpha"')
    expect(rendered).toContain('id="beta"')
  })
})
