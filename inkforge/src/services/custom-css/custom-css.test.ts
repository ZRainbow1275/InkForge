import { describe, expect, it } from 'vitest'
import {
  CUSTOM_CSS_STYLE_ID,
  appendCustomCssErrorLog,
  applyCustomCssRuntime,
  countRecentCustomCssErrors,
  sandboxCustomCss,
  scopeCustomCssSelector,
  shouldSuspendForCustomCssErrors,
} from './index'

function createSettings(overrides: Partial<Parameters<typeof applyCustomCssRuntime>[0]> = {}): Parameters<typeof applyCustomCssRuntime>[0] {
  return {
    enabled: false,
    draft: '',
    published: '',
    confirmedAt: null,
    suspendedReason: null,
    lastAppliedAt: null,
    errorLog: [],
    ...overrides,
  }
}

describe('CustomCSS sandbox', () => {
  it('scopes ordinary selectors to editor-content', () => {
    expect(scopeCustomCssSelector('h1, .note')).toEqual({
      selector: '.editor-content h1, .editor-content .note',
      rewritten: true,
    })
  })

  it('does not duplicate existing editor-content selectors', () => {
    expect(scopeCustomCssSelector('.editor-content blockquote')).toEqual({
      selector: '.editor-content blockquote',
      rewritten: false,
    })
  })

  it('rewrites global root selectors to the editor-content container', () => {
    const result = sandboxCustomCss('body { background: red; } html h1, * > p { color: blue; }')

    expect(result.ok).toBe(true)
    expect(result.css).toContain('.editor-content { background: red; }')
    expect(result.css).toContain('.editor-content h1, .editor-content > p { color: blue; }')
  })

  it('rejects import rules and remote urls', () => {
    const imported = sandboxCustomCss('@import url("https://example.com/a.css");')
    const remote = sandboxCustomCss('p { background: url(https://example.com/a.png); }')

    expect(imported.ok).toBe(false)
    expect(imported.errors.map(error => error.code)).toContain('forbidden-import')
    expect(remote.ok).toBe(false)
    expect(remote.errors.map(error => error.code)).toContain('forbidden-remote-url')
  })

  it('allows small data image urls and rejects oversized data images', () => {
    const small = sandboxCustomCss('p { background: url(data:image/png;base64,aGVsbG8=); }')
    const largeData = 'a'.repeat(70_000)
    const large = sandboxCustomCss(`p { background: url(data:image/png;base64,${largeData}); }`)

    expect(small.ok).toBe(true)
    expect(large.ok).toBe(false)
    expect(large.errors.map(error => error.code)).toContain('forbidden-data-url')
  })

  it('rejects active content, important, and forbidden host selectors', () => {
    const result = sandboxCustomCss(':host { color: red !important; background: url(javascript:alert(1)); behavior: url(x.htc); }')

    expect(result.ok).toBe(false)
    expect(result.errors.map(error => error.code)).toEqual(expect.arrayContaining([
      'forbidden-host-selector',
      'forbidden-important',
      'forbidden-active-protocol',
      'forbidden-behavior',
    ]))
  })

  it('warns without rejecting frozen tokens and risky layout declarations', () => {
    const result = sandboxCustomCss(':root { --chrome-brand-red: #000; } .panel { position: fixed; contain: strict; }')

    expect(result.ok).toBe(true)
    expect(result.frozenTokens).toContain('--chrome-brand-red')
    expect(result.warnings.map(warning => warning.code)).toEqual(expect.arrayContaining([
      'frozen-token-override',
      'fixed-position-warning',
      'contain-strict-warning',
    ]))
  })

  it('enforces css length and rule count limits', () => {
    const tooLong = sandboxCustomCss('a'.repeat(50_001))
    const tooMany = sandboxCustomCss(Array.from({ length: 1001 }, (_, index) => `.x${index} { color: red; }`).join('\n'))

    expect(tooLong.ok).toBe(false)
    expect(tooLong.errors.map(error => error.code)).toContain('css-too-long')
    expect(tooMany.ok).toBe(false)
    expect(tooMany.errors.map(error => error.code)).toContain('css-too-many-rules')
  })
})

class FakeStyleElement {
  id = ''
  type = ''
  textContent: string | null = null
  parentElement: FakeHeadElement | null = null

  get nextSibling(): FakeStyleElement | null {
    if (!this.parentElement) {
      return null
    }
    const index = this.parentElement.children.indexOf(this)
    return index >= 0 ? this.parentElement.children[index + 1] ?? null : null
  }

  remove(): void {
    this.parentElement?.removeChild(this)
  }
}

class FakeHeadElement {
  children: FakeStyleElement[] = []

  appendChild(element: FakeStyleElement): FakeStyleElement {
    element.parentElement?.removeChild(element)
    element.parentElement = this
    this.children.push(element)
    return element
  }

  removeChild(element: FakeStyleElement): void {
    this.children = this.children.filter(child => child !== element)
    element.parentElement = null
  }
}

class FakeDocument {
  head = new FakeHeadElement()

  createElement(): FakeStyleElement {
    return new FakeStyleElement()
  }

  getElementById(id: string): FakeStyleElement | null {
    return this.head.children.find(child => child.id === id) ?? null
  }

  querySelectorAll(idSelector: string): FakeStyleElement[] {
    const id = idSelector.startsWith('#') ? idSelector.slice(1) : idSelector
    return this.head.children.filter(child => child.id === id)
  }
}

describe('CustomCSS runtime', () => {
  it('does not inject a style tag when disabled', () => {
    const fakeDocument = new FakeDocument()
    const result = applyCustomCssRuntime(createSettings({ enabled: false, draft: 'h1 { color: red; }' }), { documentRef: fakeDocument as unknown as Document })

    expect(result.status).toBe('disabled')
    expect(fakeDocument.getElementById(CUSTOM_CSS_STYLE_ID)).toBeNull()
  })

  it('injects a singleton scoped style tag when enabled', () => {
    const fakeDocument = new FakeDocument()
    const first = applyCustomCssRuntime(createSettings({ enabled: true, published: 'h1 { color: rgb(1, 2, 3); }' }), { documentRef: fakeDocument as unknown as Document })
    const second = applyCustomCssRuntime(createSettings({ enabled: true, published: 'p { color: rgb(4, 5, 6); }' }), { documentRef: fakeDocument as unknown as Document })

    const styles = fakeDocument.querySelectorAll(`#${CUSTOM_CSS_STYLE_ID}`)
    expect(first.status).toBe('applied')
    expect(second.status).toBe('applied')
    expect(styles).toHaveLength(1)
    expect(styles[0].textContent).toContain('.editor-content p')
    expect(styles[0].textContent).not.toContain('rgb(1, 2, 3)')
  })

  it('removes runtime style when safe mode is active', () => {
    const fakeDocument = new FakeDocument()
    const style = fakeDocument.createElement()
    style.id = CUSTOM_CSS_STYLE_ID
    style.textContent = '.editor-content h1 { color: red; }'
    fakeDocument.head.appendChild(style)

    const result = applyCustomCssRuntime(createSettings({ enabled: true, published: 'h1 { color: red; }' }), {
      documentRef: fakeDocument as unknown as Document,
      safeMode: true,
    })

    expect(result.status).toBe('suspended')
    expect(fakeDocument.getElementById(CUSTOM_CSS_STYLE_ID)).toBeNull()
  })

  it('tracks recent errors for the three-per-minute suspension rule', () => {
    const base = Date.parse('2026-05-03T00:00:00.000Z')
    let log = appendCustomCssErrorLog([], { type: 'sandbox', message: 'one' }, base)
    log = appendCustomCssErrorLog(log, { type: 'sandbox', message: 'two' }, base + 10_000)
    log = appendCustomCssErrorLog(log, { type: 'runtime', message: 'three' }, base + 20_000)

    expect(countRecentCustomCssErrors(log, base + 20_000)).toBe(3)
    expect(shouldSuspendForCustomCssErrors(log, base + 20_000)).toBe(true)
    expect(countRecentCustomCssErrors(log, base + 70_001)).toBe(1)
  })
})
