import { describe, it, expect } from 'vitest'
import { RECIPES, composeRecipes } from './preset-decorations'
import { themePresets, getPresetById } from './themes'

describe('RECIPES registry', () => {
  it('declares all 9 recipes (8 PR3 + 1 PR4)', () => {
    const expected = [
      'cjk-drop-cap',
      'ornament-hr',
      'large-quote',
      'cjk-decimal-h2',
      'h2-underline-fine',
      'pull-quote-bordered',
      'numbered-list-roman',
      'h3-vertical-accent',
      'h2-block-ribbon',
    ]
    for (const id of expected) {
      expect(RECIPES[id]).toBeDefined()
      expect(RECIPES[id].id).toBe(id)
    }
  })

  it('each recipe ships both previewCSS and exportCSS', () => {
    for (const recipe of Object.values(RECIPES)) {
      expect(recipe.previewCSS.length).toBeGreaterThan(0)
      expect(recipe.exportCSS.length).toBeGreaterThan(0)
    }
  })

  it('previewCSS may contain ::before/::after; exportCSS must NOT', () => {
    for (const recipe of Object.values(RECIPES)) {
      // exportCSS is juice-safe — no pseudo-elements that pseudo-die on WeChat
      expect(recipe.exportCSS).not.toMatch(/::before|::after|::first-letter|::marker/)
    }
  })

  it('exportCSS does not use CSS variables or calc()', () => {
    for (const recipe of Object.values(RECIPES)) {
      expect(recipe.exportCSS).not.toMatch(/var\(--/)
      expect(recipe.exportCSS).not.toMatch(/calc\(/)
    }
  })
})

describe('composeRecipes', () => {
  it('joins CSS from multiple recipes', () => {
    const composed = composeRecipes(['h2-underline-fine', 'h3-vertical-accent'], { target: 'preview' })
    expect(composed.css).toContain('#nice h2')
    expect(composed.css).toContain('#nice h3')
  })

  it('selects export CSS when target is export', () => {
    const composed = composeRecipes(['cjk-drop-cap'], { target: 'export' })
    // export CSS uses .ink-dc class, NOT ::first-letter
    expect(composed.css).toContain('.ink-dc')
    expect(composed.css).not.toMatch(/::first-letter/)
  })

  it('silently skips unknown recipe ids', () => {
    const composed = composeRecipes(['cjk-drop-cap', 'does-not-exist'], { target: 'export' })
    expect(composed.css).toContain('.ink-dc')
  })

  it('returns a no-op decorate when no recipes have a decorate fn', () => {
    const composed = composeRecipes(['h2-underline-fine'], { target: 'export' })
    const html = '<h2>hello</h2>'
    expect(composed.decorate(html, 'wechat')).toBe(html)
  })

  it('returns no-op decorate for preview target even when recipes have decorate fns', () => {
    const composed = composeRecipes(['cjk-drop-cap'], { target: 'preview' })
    const html = '<p>中文段落</p>'
    // decorate function is still attached but its body bails out on preview
    expect(composed.decorate(html, 'preview')).toBe(html)
  })
})

describe('cjk-drop-cap decorate', () => {
  const { decorate } = composeRecipes(['cjk-drop-cap'], { target: 'export' })

  it('wraps the first CJK char of the first <p> in <span class="ink-dc">', () => {
    const input = '<p>中文段落开头</p><p>第二段</p>'
    const out = decorate(input, 'wechat')
    expect(out).toMatch(/<p><span class="ink-dc"[^>]*>中<\/span>文段落开头<\/p>/)
    expect(out).toContain('<p>第二段</p>') // second paragraph untouched
  })

  it('wraps the first Latin char of the first <p>', () => {
    const input = '<p>Hello world</p>'
    const out = decorate(input, 'wechat')
    expect(out).toMatch(/<p><span class="ink-dc"[^>]*>H<\/span>ello world<\/p>/)
  })

  it('is idempotent — double decorate produces identical output', () => {
    const input = '<p>中文段落开头</p>'
    const once = decorate(input, 'wechat')
    const twice = decorate(once, 'wechat')
    expect(twice).toBe(once)
    // sanity: only one wrapper
    expect((twice.match(/class="ink-dc"/g) ?? []).length).toBe(1)
  })

  it('does nothing for preview target', () => {
    const input = '<p>中文段落开头</p>'
    expect(decorate(input, 'preview')).toBe(input)
  })
})

describe('ornament-hr decorate', () => {
  const { decorate } = composeRecipes(['ornament-hr'], { target: 'export' })

  it('replaces <hr> with a real ornament div', () => {
    const input = '<p>before</p><hr><p>after</p>'
    const out = decorate(input, 'wechat')
    expect(out).toContain('class="ink-ornament-hr"')
    expect(out).toContain('❀ ❀ ❀')
    expect(out).not.toMatch(/<hr\s*\/?>/)
  })

  it('is idempotent', () => {
    const input = '<hr><hr>'
    const once = decorate(input, 'wechat')
    const twice = decorate(once, 'wechat')
    expect(twice).toBe(once)
  })
})

describe('large-quote decorate', () => {
  const { decorate } = composeRecipes(['large-quote'], { target: 'export' })

  it('injects a quote-mark span at the start of the first <p> in each blockquote', () => {
    const input = '<blockquote><p>quoted text</p></blockquote>'
    const out = decorate(input, 'wechat')
    expect(out).toContain('class="ink-quote-mark"')
    expect(out).toContain('“')
  })

  it('is idempotent', () => {
    const input = '<blockquote><p>quoted text</p></blockquote>'
    const once = decorate(input, 'wechat')
    const twice = decorate(once, 'wechat')
    expect(twice).toBe(once)
    expect((twice.match(/class="ink-quote-mark"/g) ?? []).length).toBe(1)
  })
})

describe('cjk-decimal-h2 decorate', () => {
  const { decorate } = composeRecipes(['cjk-decimal-h2'], { target: 'export' })

  it('injects 第N章 prefix with CJK numerals', () => {
    const input = '<h2>引言</h2><h2>方法</h2><h2>结果</h2>'
    const out = decorate(input, 'wechat')
    expect(out).toContain('第一章')
    expect(out).toContain('第二章')
    expect(out).toContain('第三章')
  })

  it('handles numerals beyond 10', () => {
    const input = Array.from({ length: 11 }, (_, i) => `<h2>章节${i + 1}</h2>`).join('')
    const out = decorate(input, 'wechat')
    expect(out).toContain('第十章')
    expect(out).toContain('第十一章')
  })

  it('is idempotent', () => {
    const input = '<h2>引言</h2>'
    const once = decorate(input, 'wechat')
    const twice = decorate(once, 'wechat')
    expect(twice).toBe(once)
    expect((twice.match(/class="ink-ch-num"/g) ?? []).length).toBe(1)
  })
})

describe('migrated presets (thesis, legal, report, commentary, aigc)', () => {
  const migrated = ['thesis', 'legal', 'report', 'commentary', 'aigc']

  for (const id of migrated) {
    describe(id, () => {
      const preset = getPresetById(id)

      it('exists in themePresets', () => {
        expect(preset).toBeDefined()
      })

      it('has persona populated', () => {
        expect(preset?.persona).toBeDefined()
        expect(['academic', 'business', 'lifestyle', 'creative']).toContain(preset?.persona)
      })

      it('has fonts populated', () => {
        expect(preset?.fonts).toBeDefined()
        expect(preset?.fonts?.cjk).toBeTruthy()
        expect(preset?.fonts?.latin).toBeTruthy()
      })

      it('has previewCSS populated', () => {
        expect(preset?.previewCSS).toBeDefined()
        expect(preset?.previewCSS?.length).toBeGreaterThan(0)
      })

      it('has exportCSS populated', () => {
        expect(preset?.exportCSS).toBeDefined()
        expect(preset?.exportCSS?.length).toBeGreaterThan(0)
      })

      it('has decorate fn populated', () => {
        expect(typeof preset?.decorate).toBe('function')
      })

      it('exportCSS contains 22em line-length lock', () => {
        expect(preset?.exportCSS).toContain('max-width: min(22em')
      })

      it('keeps legacy customCSS for back-compat', () => {
        expect(preset?.customCSS).toBeTruthy()
      })
    })
  }

  it('PR4 migrated lifestyle/creative presets now also have dual-track fields', () => {
    const notesPreset = getPresetById('notes')
    expect(notesPreset).toBeDefined()
    expect(notesPreset?.previewCSS).toBeDefined()
    expect(notesPreset?.exportCSS).toBeDefined()
    expect(typeof notesPreset?.decorate).toBe('function')
  })

  it('themePresets array still has all 12 wechat presets', () => {
    expect(themePresets).toHaveLength(12)
  })
})

describe('h2-block-ribbon recipe (PR4)', () => {
  it('renders identical block ribbon for preview and export', () => {
    const previewCSS = RECIPES['h2-block-ribbon'].previewCSS
    const exportCSS = RECIPES['h2-block-ribbon'].exportCSS
    expect(previewCSS).toContain('background')
    expect(previewCSS).toContain('color: #fff')
    expect(previewCSS).toContain('border-radius')
    expect(exportCSS).toContain('background')
    expect(exportCSS).toContain('color: #fff')
    expect(exportCSS).toContain('border-radius')
  })

  it('exportCSS uses literal hex color, no CSS variables', () => {
    const exportCSS = RECIPES['h2-block-ribbon'].exportCSS
    expect(exportCSS).not.toMatch(/var\(--/)
    expect(exportCSS).toContain('#0f172a')
  })

  it('has no decorate function (pure CSS recipe)', () => {
    expect(RECIPES['h2-block-ribbon'].decorate).toBeUndefined()
  })
})
