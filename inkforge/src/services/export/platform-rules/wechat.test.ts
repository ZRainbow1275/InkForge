import { describe, expect, it } from 'vitest'
import wechatRules, {
  applyCjkLatinSpacing,
  clampContentWidth,
  injectDarkModeMetadata,
  wechatComplianceTransform,
} from './wechat'

const THIN = '\u202F'

describe('applyCjkLatinSpacing', () => {
  it('inserts a thin space between CJK and trailing ASCII letters', () => {
    expect(applyCjkLatinSpacing('中文word')).toBe(`中文${THIN}word`)
  })

  it('inserts a thin space between CJK and trailing digits', () => {
    expect(applyCjkLatinSpacing('中文123')).toBe(`中文${THIN}123`)
  })

  it('inserts a thin space between leading Latin and CJK', () => {
    expect(applyCjkLatinSpacing('Vue3很好')).toBe(`Vue3${THIN}很好`)
  })

  it('is idempotent — running twice equals once', () => {
    const once = applyCjkLatinSpacing('在Vue3里写代码123次')
    const twice = applyCjkLatinSpacing(once)
    expect(twice).toBe(once)
  })

  it('does not insert spaces inside <code> blocks', () => {
    const input = '<p>正常text</p><code>foo中bar</code>'
    const output = applyCjkLatinSpacing(input)
    expect(output).toContain(`正常${THIN}text`)
    expect(output).toContain('<code>foo中bar</code>')
  })

  it('does not insert spaces inside <pre> or <style> blocks', () => {
    const input = '<pre>code中en</pre><style>.x{color:red}/*中en*/</style>'
    const output = applyCjkLatinSpacing(input)
    expect(output).toContain('<pre>code中en</pre>')
    expect(output).toContain('/*中en*/')
  })

  it('does not modify tag attribute values', () => {
    const input = '<a href="https://example.com" title="标题title">中文word</a>'
    const output = applyCjkLatinSpacing(input)
    expect(output).toContain('title="标题title"')
    expect(output).toContain(`中文${THIN}word`)
  })

  it('skips when an existing space already separates the run', () => {
    expect(applyCjkLatinSpacing('中文 word')).toBe('中文 word')
  })
})

describe('clampContentWidth', () => {
  it('wraps the inner content of section#nice with a max-width div', () => {
    const out = clampContentWidth('<section id="nice"><p>x</p></section>')
    expect(out).toMatch(/<section id="nice"><div [^>]*max-width:677px[^>]*>\s*<p>x<\/p>\s*<\/div><\/section>/)
  })

  it('respects a custom maxWidth', () => {
    const out = clampContentWidth('<section id="nice"><p>x</p></section>', 800)
    expect(out).toContain('max-width:800px')
  })

  it('falls back to wrapping the whole input when section#nice is absent', () => {
    const out = clampContentWidth('<p>plain</p>')
    expect(out.startsWith('<div ')).toBe(true)
    expect(out).toContain('max-width:677px')
    expect(out).toContain('<p>plain</p>')
  })

  it('is idempotent — running twice equals once', () => {
    const once = clampContentWidth('<section id="nice"><p>x</p></section>')
    const twice = clampContentWidth(once)
    expect(twice).toBe(once)
  })
})

describe('injectDarkModeMetadata', () => {
  it('adds dark-mode metadata to a styled heading', () => {
    const input = '<h2 style="color:#333">x</h2>'
    const out = injectDarkModeMetadata(input)
    expect(out).toContain('data-darkmode-color=')
    expect(out).toContain('data-darkmode-bgcolor=')
    expect(out).toContain('data-darkmode-original-color="#333|#333"')
  })

  it('adds metadata to multiple eligible block elements', () => {
    const input =
      '<h1 style="color:#000">A</h1>' +
      '<blockquote style="background-color:#eee">B</blockquote>' +
      '<table><th style="color:#111">C</th><td>D</td></table>'
    const out = injectDarkModeMetadata(input)
    const matches = out.match(/data-darkmode-color=/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(4)
    expect(out).toContain('data-darkmode-original-bgcolor="#eee|#eee"')
  })

  it('is idempotent — existing attributes are not duplicated', () => {
    const once = injectDarkModeMetadata('<h2 style="color:#333">x</h2>')
    const twice = injectDarkModeMetadata(once)
    expect(twice).toBe(once)
    expect((once.match(/data-darkmode-color=/g) ?? []).length).toBe(1)
  })

  it('honors custom text and bg colors', () => {
    const out = injectDarkModeMetadata('<pre style="color:#000">x</pre>', {
      textColor: '#FAFAFA|',
      bgColor: '#222|',
    })
    expect(out).toContain('data-darkmode-color="#FAFAFA|"')
    expect(out).toContain('data-darkmode-bgcolor="#222|"')
  })

  it('skips elements outside the target tag list', () => {
    const out = injectDarkModeMetadata('<p style="color:#333">x</p>')
    expect(out).not.toContain('data-darkmode-color')
  })
})

describe('wechatComplianceTransform', () => {
  const sample = '<section id="nice"><h2 style="color:#333">中文word</h2><p>Vue3好</p></section>'

  it('applies all default phases (spacing + clamp, dark-mode opt-in)', () => {
    const out = wechatComplianceTransform(sample)
    expect(out).toContain(`中文${THIN}word`)
    expect(out).toContain(`Vue3${THIN}好`)
    expect(out).toContain('max-width:677px')
    expect(out).not.toContain('data-darkmode-color')
  })

  it('skips CJK spacing when disabled', () => {
    const out = wechatComplianceTransform(sample, { enableCjkSpacing: false })
    expect(out).toContain('中文word')
    expect(out).not.toContain(`中文${THIN}word`)
  })

  it('skips clamp when maxContentWidth is null', () => {
    const out = wechatComplianceTransform(sample, { maxContentWidth: null })
    expect(out).not.toContain('max-width:677px')
  })

  it('runs dark-mode metadata only when explicitly enabled', () => {
    const off = wechatComplianceTransform(sample)
    const on = wechatComplianceTransform(sample, { enableDarkMode: true })
    expect(off).not.toContain('data-darkmode-color')
    expect(on).toContain('data-darkmode-color')
  })

  it('exposes all four functions on the default export', () => {
    expect(wechatRules.applyCjkLatinSpacing).toBe(applyCjkLatinSpacing)
    expect(wechatRules.clampContentWidth).toBe(clampContentWidth)
    expect(wechatRules.injectDarkModeMetadata).toBe(injectDarkModeMetadata)
    expect(wechatRules.wechatComplianceTransform).toBe(wechatComplianceTransform)
  })
})
