/**
 * @vitest-environment happy-dom
 *
 * P2-T8 双引擎接入测试：
 *  - markdown engine (zhihu-markdown.ts) 通过 platform-rules/zhihu 应用合规变换
 *  - HTML engine (zhihu.ts) 仅做预览级渲染，不接 rules transform
 */

import { describe, expect, it } from 'vitest'
import { markdownToZhihuClean } from './zhihu-markdown'
import { convertToZhihu } from './zhihu'

describe('markdown engine — platform-rules wired', () => {
  it('converts $$E=mc^2$$ to zhihu equation img with eeimg flag + ee_img class', () => {
    const r = markdownToZhihuClean('正文：\n\n$$E=mc^2$$\n')
    expect(r.markdown).toMatch(
      /<img src="https:\/\/www\.zhihu\.com\/equation\?tex=E%3Dmc%5E2"[^>]*class="ee_img tr_noresize"[^>]*eeimg="1"/
    )
    expect(r.latexBlocksConverted).toBe(1)
    expect(r.latexInlinesConverted).toBe(0)

    // URL 编码反向校验
    const m = r.markdown.match(/equation\?tex=([^"\s]+)"/)
    expect(m).not.toBeNull()
    expect(decodeURIComponent(m![1])).toBe('E=mc^2')
  })

  it('converts inline $a+b$ to equation img with ee_img class', () => {
    const r = markdownToZhihuClean('value $a+b$ here')
    expect(r.markdown).toMatch(/value <img src="https:\/\/www\.zhihu\.com\/equation\?tex=a%2Bb"/)
    expect(r.markdown).toContain('class="ee_img tr_noresize"')
    expect(r.latexInlinesConverted).toBe(1)
    expect(r.latexBlocksConverted).toBe(0)
  })

  it('preserves LaTeX inside fenced code blocks (not converted)', () => {
    const input = '```\nLet $x$ be a value, also $$y=1$$\n```'
    const r = markdownToZhihuClean(input)
    expect(r.latexBlocksConverted).toBe(0)
    expect(r.latexInlinesConverted).toBe(0)
    // 围栏内原文仍包含 $ 表达式
    expect(r.markdown).toContain('$x$')
    expect(r.markdown).toContain('$$y=1$$')
  })

  it('converts GFM table to HTML <table> by default (zhihu native consumes HTML tables)', () => {
    const md =
      'before\n\n| col1 | col2 |\n| --- | --- |\n| a | b |\n| c | d |\n\nafter'
    const r = markdownToZhihuClean(md)
    expect(r.tablesConverted).toBe(1)
    expect(r.markdown).toContain('<table>')
    expect(r.markdown).toContain('<th>col1</th>')
    expect(r.markdown).toContain('<th>col2</th>')
    expect(r.markdown).toContain('<td>a</td>')
    expect(r.markdown).toContain('<td>b</td>')
    expect(r.markdown).toContain('<td>c</td>')
    expect(r.markdown).toContain('<td>d</td>')
    expect(r.markdown).toContain('</table>')
    expect(r.markdown).not.toContain('| col1 | col2 |')
    expect(r.markdown).not.toContain('> **表格')
  })

  it('treats deprecated tableHandling="fallback" option as alias of "html"', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |\n'
    const r = markdownToZhihuClean(md, { tableHandling: 'fallback' })
    expect(r.tablesConverted).toBe(1)
    expect(r.markdown).toContain('<table>')
    expect(r.markdown).toContain('<td>1</td>')
  })

  it('coerces fences without language to default lang text', () => {
    const md = '```\nplain code\n```'
    const r = markdownToZhihuClean(md)
    expect(r.codeLangsFixed).toBeGreaterThanOrEqual(1)
    expect(r.markdown).toContain('```text\nplain code')
  })

  it('does not touch fences that already have a language', () => {
    const md = '```ts\nconst x = 1\n```'
    const r = markdownToZhihuClean(md)
    expect(r.codeLangsFixed).toBe(0)
    expect(r.markdown).toContain('```ts')
    expect(r.markdown).not.toContain('```text')
  })

  it('honors legacy preserveLatex: true (disables LaTeX conversion)', () => {
    const r = markdownToZhihuClean('$$x=1$$ inline $y=2$', { preserveLatex: true })
    expect(r.latexBlocksConverted).toBe(0)
    expect(r.latexInlinesConverted).toBe(0)
    expect(r.markdown).toContain('$$x=1$$')
    expect(r.markdown).toContain('$y=2$')
    // 但 latexCount 仍记录保护阶段命中
    expect(r.latexCount).toBe(2)
  })

  it('explicit convertLatexToImg overrides legacy preserveLatex', () => {
    const r = markdownToZhihuClean('$$x=1$$', {
      preserveLatex: true,
      convertLatexToImg: true,
    })
    expect(r.latexBlocksConverted).toBe(1)
    expect(r.markdown).not.toContain('$$x=1$$')
    expect(r.markdown).toMatch(/equation\?tex=x%3D1/)
  })

  it('honors tableHandling: preserve to keep GFM tables intact', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |\n'
    const r = markdownToZhihuClean(md, { tableHandling: 'preserve' })
    expect(r.tablesConverted).toBe(0)
    expect(r.markdown).toContain('| a | b |')
    expect(r.markdown).toContain('|---|---|')
  })

  it('honors codeLangCoerce: false', () => {
    const r = markdownToZhihuClean('```\nfoo\n```', { codeLangCoerce: false })
    expect(r.codeLangsFixed).toBe(0)
    expect(r.markdown).toContain('```\nfoo')
    expect(r.markdown).not.toContain('```text')
  })

  it('honors custom defaultLang', () => {
    const r = markdownToZhihuClean('```\nfoo\n```', { defaultLang: 'plaintext' })
    expect(r.codeLangsFixed).toBe(1)
    expect(r.markdown).toContain('```plaintext\nfoo')
  })

  it('aggregates stats across all rules in one call', () => {
    const md = [
      'inline $a$ and:',
      '',
      '$$b$$',
      '',
      '| h1 | h2 |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      '```',
      'plain',
      '```',
    ].join('\n')
    const r = markdownToZhihuClean(md)
    expect(r.latexBlocksConverted).toBe(1)
    expect(r.latexInlinesConverted).toBe(1)
    expect(r.tablesConverted).toBe(1)
    expect(r.codeLangsFixed).toBe(1)
  })
})

describe('HTML engine — preview-only smoke', () => {
  it('wraps content in #zhihu-answer section', () => {
    const out = convertToZhihu('<p>hello</p>')
    expect(out).toContain('zhihu-answer')
    expect(out).toContain('hello')
  })
})
