import { describe, it, expect } from 'vitest'
import {
  convertLatexToEquationImg,
  tableToHtmlTable,
  tableToBlockquoteFallback,
  coerceCodeLanguage,
  zhihuMarkdownRulesTransform,
} from './zhihu'

// ═══════════════════════════════════════════════════════════════════
// convertLatexToEquationImg
// ═══════════════════════════════════════════════════════════════════

describe('convertLatexToEquationImg', () => {
  it('converts block-level $$x$$ to equation img with URL-encoded tex + ee_img class', () => {
    const input = `before\n\n$$E=mc^2$$\n\nafter`
    const r = convertLatexToEquationImg(input)
    expect(r.blockCount).toBe(1)
    expect(r.inlineCount).toBe(0)
    expect(r.md).toContain('<img src="https://www.zhihu.com/equation?tex=')
    expect(r.md).toContain('eeimg="1"')
    // 工业标准 class（Markdown4Zhihu / md2zhihu / OpenACID）
    expect(r.md).toContain('class="ee_img tr_noresize"')
    // URL 编码：= 应被编码为 %3D，^ 编码为 %5E
    expect(r.md).toContain('tex=E%3Dmc%5E2')

    // 通过 decodeURIComponent 反向验证 src
    const m = r.md.match(/equation\?tex=([^"\s]+)"/)
    expect(m).not.toBeNull()
    expect(decodeURIComponent(m![1])).toBe('E=mc^2')
  })

  it('preserves LaTeX inside fenced code blocks', () => {
    const input = '```\nLet $x$ be a value, also $$y=1$$\n```'
    const r = convertLatexToEquationImg(input)
    expect(r.blockCount).toBe(0)
    expect(r.inlineCount).toBe(0)
    expect(r.md).toBe(input)
  })

  it('converts inline $a+b$ to equation img with ee_img class', () => {
    const input = 'value $a+b$ here'
    const r = convertLatexToEquationImg(input)
    expect(r.inlineCount).toBe(1)
    expect(r.blockCount).toBe(0)
    expect(r.md).toMatch(/value <img src="https:\/\/www\.zhihu\.com\/equation\?tex=a%2Bb"/)
    expect(r.md).toContain('class="ee_img tr_noresize"')

    const m = r.md.match(/equation\?tex=([^"\s]+)"/)
    expect(decodeURIComponent(m![1])).toBe('a+b')
  })

  it('preserves inline LaTeX inside inline code', () => {
    const input = 'use `$x$` for math'
    const r = convertLatexToEquationImg(input)
    expect(r.inlineCount).toBe(0)
    expect(r.md).toBe(input)
  })

  it('handles both block and inline in same doc', () => {
    const input = 'inline $a$ and block:\n\n$$b$$\n\ndone.'
    const r = convertLatexToEquationImg(input)
    expect(r.blockCount).toBe(1)
    expect(r.inlineCount).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════
// tableToHtmlTable
// ═══════════════════════════════════════════════════════════════════

describe('tableToHtmlTable', () => {
  it('converts a 2-col 2-row table to HTML <table>', () => {
    const input = `intro\n\n| col1 | col2 |\n|---|---|\n| a | b |\n| c | d |\n\nend`
    const r = tableToHtmlTable(input)
    expect(r.tableCount).toBe(1)
    expect(r.md).toContain('<table>')
    expect(r.md).toContain('<thead>')
    expect(r.md).toContain('<th>col1</th>')
    expect(r.md).toContain('<th>col2</th>')
    expect(r.md).toContain('<tbody>')
    expect(r.md).toContain('<td>a</td>')
    expect(r.md).toContain('<td>b</td>')
    expect(r.md).toContain('<td>c</td>')
    expect(r.md).toContain('<td>d</td>')
    expect(r.md).toContain('</table>')
    // 旧降级标记不应再出现
    expect(r.md).not.toContain('> **表格')
    expect(r.md).not.toContain('|---|')
  })

  it('leaves code-fenced tables unchanged', () => {
    const input = '```\n| col1 | col2 |\n|---|---|\n| a | b |\n```'
    const r = tableToHtmlTable(input)
    expect(r.tableCount).toBe(0)
    expect(r.md).toBe(input)
  })

  it('escapes HTML-special characters in cells', () => {
    const input = `| a | b |\n|---|---|\n| <x> | "&" |\n`
    const r = tableToHtmlTable(input)
    expect(r.md).toContain('<td>&lt;x&gt;</td>')
    expect(r.md).toContain('<td>&quot;&amp;&quot;</td>')
  })

  it('emits separate <table> blocks for sequential tables', () => {
    const input = `| h1 | h2 |\n|---|---|\n| 1 | 2 |\n\nmiddle\n\n| h3 | h4 |\n|---|---|\n| 3 | 4 |\n`
    const r = tableToHtmlTable(input)
    expect(r.tableCount).toBe(2)
    const tableMatches = r.md.match(/<table>/g) ?? []
    expect(tableMatches.length).toBe(2)
    expect(r.md).toContain('<th>h1</th>')
    expect(r.md).toContain('<th>h3</th>')
  })

  it('exposes deprecated tableToBlockquoteFallback alias for backwards compat', () => {
    expect(tableToBlockquoteFallback).toBe(tableToHtmlTable)
  })
})

// ═══════════════════════════════════════════════════════════════════
// coerceCodeLanguage
// ═══════════════════════════════════════════════════════════════════

describe('coerceCodeLanguage', () => {
  it('adds default lang to fences without language', () => {
    const input = '```\ncode here\n```'
    const r = coerceCodeLanguage(input)
    expect(r.replacedCount).toBe(1)
    expect(r.md).toBe('```text\ncode here\n```')
  })

  it('does not touch fences with existing language', () => {
    const input = '```ts\nconst x = 1\n```'
    const r = coerceCodeLanguage(input)
    expect(r.replacedCount).toBe(0)
    expect(r.md).toBe(input)
  })

  it('respects custom defaultLang option', () => {
    const input = '```\nfoo\n```'
    const r = coerceCodeLanguage(input, { defaultLang: 'plaintext' })
    expect(r.replacedCount).toBe(1)
    expect(r.md).toBe('```plaintext\nfoo\n```')
  })

  it('handles multiple fences mixed with/without lang', () => {
    const input = '```\na\n```\n\n```js\nb\n```\n\n```\nc\n```'
    const r = coerceCodeLanguage(input)
    expect(r.replacedCount).toBe(2)
    expect(r.md).toContain('```text\na\n```')
    expect(r.md).toContain('```js\nb\n```')
    expect(r.md).toContain('```text\nc\n```')
  })
})

// ═══════════════════════════════════════════════════════════════════
// zhihuMarkdownRulesTransform — 编排器
// ═══════════════════════════════════════════════════════════════════

describe('zhihuMarkdownRulesTransform', () => {
  it('runs all phases by default', () => {
    const input = `# Title\n\nFormula $a$ and:\n\n$$b$$\n\n| h1 | h2 |\n|---|---|\n| 1 | 2 |\n\n\`\`\`\nplain code\n\`\`\``
    const r = zhihuMarkdownRulesTransform(input)
    expect(r.stats.latexBlocks).toBe(1)
    expect(r.stats.latexInlines).toBe(1)
    expect(r.stats.tablesFallback).toBe(1)
    expect(r.stats.codeLangFixed).toBe(1)
    expect(r.md).toContain('eeimg="1"')
    expect(r.md).toContain('class="ee_img tr_noresize"')
    expect(r.md).toContain('<table>')
    expect(r.md).toContain('<th>h1</th>')
    expect(r.md).toContain('<td>1</td>')
    expect(r.md).toContain('```text\nplain code')
  })

  it('skips LaTeX phase when convertLatexToImg=false', () => {
    const input = 'inline $a$ here\n\n$$b$$'
    const r = zhihuMarkdownRulesTransform(input, { convertLatexToImg: false })
    expect(r.stats.latexBlocks).toBe(0)
    expect(r.stats.latexInlines).toBe(0)
    expect(r.md).toContain('$a$')
    expect(r.md).toContain('$$b$$')
  })

  it('preserves tables when tableHandling="preserve"', () => {
    const input = '| h1 | h2 |\n|---|---|\n| a | b |\n'
    const r = zhihuMarkdownRulesTransform(input, { tableHandling: 'preserve' })
    expect(r.stats.tablesFallback).toBe(0)
    expect(r.md).toContain('| h1 | h2 |')
    expect(r.md).toContain('|---|---|')
    expect(r.md).not.toContain('<table>')
  })

  it('emits HTML <table> when tableHandling="html" (default behavior)', () => {
    const input = '| h1 | h2 |\n|---|---|\n| a | b |\n'
    const r = zhihuMarkdownRulesTransform(input, { tableHandling: 'html' })
    expect(r.stats.tablesFallback).toBe(1)
    expect(r.md).toContain('<table>')
    expect(r.md).toContain('<th>h1</th>')
    expect(r.md).toContain('<td>a</td>')
  })

  it('treats deprecated tableHandling="fallback" as alias of "html"', () => {
    const input = '| h1 | h2 |\n|---|---|\n| a | b |\n'
    const r = zhihuMarkdownRulesTransform(input, { tableHandling: 'fallback' })
    expect(r.stats.tablesFallback).toBe(1)
    expect(r.md).toContain('<table>')
    expect(r.md).not.toContain('> **表格')
  })

  it('skips code-lang coercion when codeLangCoerce=false', () => {
    const input = '```\nfoo\n```'
    const r = zhihuMarkdownRulesTransform(input, { codeLangCoerce: false })
    expect(r.stats.codeLangFixed).toBe(0)
    expect(r.md).toBe(input)
  })

  it('honors defaultLang option', () => {
    const input = '```\nfoo\n```'
    const r = zhihuMarkdownRulesTransform(input, { defaultLang: 'shell' })
    expect(r.stats.codeLangFixed).toBe(1)
    expect(r.md).toContain('```shell\nfoo')
  })
})
