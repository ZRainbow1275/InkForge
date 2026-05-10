import { describe, it, expect } from 'vitest'
import {
  parseToAST,
  walkAST,
  findAll,
  serializeText,
  type InkforgeNode,
  type InkforgeNodeType,
} from './ast'

// ═══════════════════════════════════════════════════════════════════
// parseToAST — 基础结构
// ═══════════════════════════════════════════════════════════════════

describe('parseToAST — basic structure', () => {
  it('parses heading + paragraph and records heading meta', () => {
    const r = parseToAST('# Hi\n\nworld')
    expect(r.root.type).toBe('root')
    expect(r.root.children).toBeDefined()
    expect(r.root.children!.length).toBe(2)
    expect(r.root.children![0].type).toBe('heading')
    expect(r.root.children![0].depth).toBe(1)
    expect(r.root.children![1].type).toBe('paragraph')
    expect(r.meta.headings).toEqual([{ depth: 1, text: 'Hi' }])
  })

  it('records multiple headings with correct depth', () => {
    const r = parseToAST('# A\n\n## B\n\n### C')
    expect(r.meta.headings).toEqual([
      { depth: 1, text: 'A' },
      { depth: 2, text: 'B' },
      { depth: 3, text: 'C' },
    ])
  })
})

// ═══════════════════════════════════════════════════════════════════
// LaTeX 检测
// ═══════════════════════════════════════════════════════════════════

describe('parseToAST — LaTeX detection', () => {
  it('detects 1 block + 1 inline LaTeX with raw TeX (no delimiters)', () => {
    const r = parseToAST('$$E=mc^2$$\n\nvalue $a+b$')
    expect(r.meta.latexBlocks).toBe(1)
    expect(r.meta.latexInlines).toBe(1)

    const blocks = findAll(r.root, 'latex-block')
    const inlines = findAll(r.root, 'latex-inline')
    expect(blocks).toHaveLength(1)
    expect(inlines).toHaveLength(1)
    expect(blocks[0].latex).toBe('E=mc^2')
    expect(inlines[0].latex).toBe('a+b')
  })

  it('does NOT detect LaTeX inside fenced code blocks', () => {
    const md = '```\n$x$\n```'
    const r = parseToAST(md)
    expect(r.meta.latexInlines).toBe(0)
    expect(r.meta.latexBlocks).toBe(0)
    expect(findAll(r.root, 'latex-inline')).toHaveLength(0)
    expect(findAll(r.root, 'latex-block')).toHaveLength(0)
    // 代码块本身仍被记录
    expect(r.meta.codeBlocks).toHaveLength(1)
  })

  it('does NOT detect LaTeX inside inline code', () => {
    const r = parseToAST('text with `$x$` inline')
    expect(r.meta.latexInlines).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 代码块行数
// ═══════════════════════════════════════════════════════════════════

describe('parseToAST — code-block lineCount', () => {
  it('records lineCount accurately for fenced code blocks', () => {
    const md = '```ts\nconst a = 1\nconst b = 2\nconst c = 3\n```'
    const r = parseToAST(md)
    expect(r.meta.codeBlocks).toEqual([{ lang: 'ts', lineCount: 3 }])
    const blocks = findAll(r.root, 'code-block')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].lang).toBe('ts')
    expect(blocks[0].value).toBe('const a = 1\nconst b = 2\nconst c = 3')
  })

  it('records null lang for fenced code with no info string', () => {
    const md = '```\nplain\nlines\n```'
    const r = parseToAST(md)
    expect(r.meta.codeBlocks).toEqual([{ lang: null, lineCount: 2 }])
  })

  it('detects mermaid blocks', () => {
    const md = '```mermaid\ngraph TD\nA-->B\n```'
    const r = parseToAST(md)
    expect(r.meta.mermaidBlocks).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════
// walkAST
// ═══════════════════════════════════════════════════════════════════

describe('walkAST', () => {
  it('visits all nodes in pre-order; enter+leave called per node', () => {
    const r = parseToAST('# Hi\n\nworld')
    const enterTypes: InkforgeNodeType[] = []
    const leaveTypes: InkforgeNodeType[] = []
    walkAST(r.root, {
      enter: (n) => enterTypes.push(n.type),
      leave: (n) => leaveTypes.push(n.type),
    })
    // 预序：root 先于 children
    expect(enterTypes[0]).toBe('root')
    // root 出现且为最后离开（后序结束）
    expect(leaveTypes[leaveTypes.length - 1]).toBe('root')
    // 每个 enter 必有对应 leave
    expect(enterTypes.length).toBe(leaveTypes.length)
    // heading 和 paragraph 在子层都被访问
    expect(enterTypes).toContain('heading')
    expect(enterTypes).toContain('paragraph')
  })

  it('parent is correctly tracked', () => {
    const r = parseToAST('# Hi')
    const pairs: Array<[InkforgeNodeType, InkforgeNodeType | null]> = []
    walkAST(r.root, {
      enter: (n, p) => pairs.push([n.type, p ? p.type : null]),
    })
    expect(pairs[0]).toEqual(['root', null])
    const headingPair = pairs.find((p) => p[0] === 'heading')
    expect(headingPair?.[1]).toBe('root')
  })
})

// ═══════════════════════════════════════════════════════════════════
// findAll
// ═══════════════════════════════════════════════════════════════════

describe('findAll', () => {
  it('finds all images (2 expected)', () => {
    const md = '![one](https://a.com/1.png)\n\n![two](https://a.com/2.png)'
    const r = parseToAST(md)
    const imgs = findAll(r.root, 'image')
    expect(imgs).toHaveLength(2)
    expect(imgs[0].url).toBe('https://a.com/1.png')
    expect(imgs[1].url).toBe('https://a.com/2.png')
    // meta.images 同步
    expect(r.meta.images).toEqual([
      { url: 'https://a.com/1.png', alt: 'one' },
      { url: 'https://a.com/2.png', alt: 'two' },
    ])
  })

  it('returns empty array when type not present', () => {
    const r = parseToAST('plain text')
    expect(findAll(r.root, 'table')).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════
// serializeText
// ═══════════════════════════════════════════════════════════════════

describe('serializeText', () => {
  it('preserves order of text content with no markup', () => {
    const md = '# Title\n\nSome **bold** and *italic* text.'
    const r = parseToAST(md)
    const text = serializeText(r.root)
    // 不应包含 markdown 标记
    expect(text).not.toContain('**')
    expect(text).not.toContain('*italic*')
    expect(text).not.toContain('#')
    // 顺序：Title 在 Some 之前
    expect(text.indexOf('Title')).toBeLessThan(text.indexOf('Some'))
    expect(text).toContain('bold')
    expect(text).toContain('italic')
  })

  it('includes inline code, code-block, and image alt', () => {
    const md = 'use `const` here\n\n```\nx = 1\n```\n\n![cat](cat.png)'
    const r = parseToAST(md)
    const text = serializeText(r.root)
    expect(text).toContain('const')
    expect(text).toContain('x = 1')
    expect(text).toContain('cat')
  })
})

// ═══════════════════════════════════════════════════════════════════
// 辅助：node 类型断言
// ═══════════════════════════════════════════════════════════════════

describe('parseToAST — list / blockquote / alert', () => {
  it('parses ordered list with start and items', () => {
    const r = parseToAST('1. one\n2. two')
    const lists = findAll(r.root, 'list')
    expect(lists).toHaveLength(1)
    expect(lists[0].ordered).toBe(true)
    const items = findAll(r.root, 'list-item')
    expect(items).toHaveLength(2)
  })

  it('detects GFM alert block', () => {
    const md = '> [!NOTE]\n> hello'
    const r = parseToAST(md)
    const alerts = findAll(r.root, 'alert-block')
    expect(alerts).toHaveLength(1)
    expect(alerts[0].alertKind).toBe('note')
  })

  it('keeps plain blockquote as blockquote', () => {
    const md = '> just a quote'
    const r = parseToAST(md)
    expect(findAll(r.root, 'alert-block')).toHaveLength(0)
    expect(findAll(r.root, 'blockquote')).toHaveLength(1)
  })
})

describe('parseToAST — wordCount', () => {
  it('counts words in a simple paragraph', () => {
    const r = parseToAST('hello world foo')
    expect(r.meta.wordCount).toBe(3)
  })

  it('counts CJK chars as individual words', () => {
    const r = parseToAST('你好世界')
    expect(r.meta.wordCount).toBe(4)
  })
})

// 类型守卫导出 — 用于消除未使用变量警告
const _typeCheck: InkforgeNode = { type: 'root', children: [] }
void _typeCheck
