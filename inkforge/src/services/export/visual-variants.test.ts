import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET_ID } from '@/constants'
import { generateThemeCSS, themePresets } from './themes'
import { darkenForWhiteText, relativeLuminance } from './svg-modules/theme'
import { xiaohongshuPresets } from './xiaohongshu'
import { getZhihuPresets } from './zhihu'
import {
  ARTICLE_PROFILES,
  VISUAL_VARIANTS,
  getPlatformPresetForVariant,
  getVisualVariantCSS,
  getVisualVariantMastheadPresentation,
  resolveArticleProfile,
  resolveVisualVariant,
} from './visual-variants'

const EXPECTED_WECHAT_IDS = [
  'thesis',
  'legal',
  'report',
  'commentary',
  'aigc',
  'code',
  'notes',
  'news',
  'meme',
  'life',
  'elegant',
  'tech',
  'flagship-kiln',
  'flagship-kiln-paste-safe',
  'flagship-tempera',
  'flagship-amber',
] as const

const BASE_WECHAT_IDS = EXPECTED_WECHAT_IDS.slice(0, 12)

const EXPECTED_XHS_IDS = [
  'xhs-fresh',
  'xhs-simple',
  'xhs-warm',
  'xhs-tech',
  'xhs-nature',
] as const

const EXPECTED_ZHIHU_IDS = [
  'zhihu-academic',
  'zhihu-tech',
  'zhihu-insight',
] as const

function getRules(css: string, selector: string, suffix = false): string[] {
  const expected = selector === '&' ? '#nice' : `#nice ${selector}`
  return Array.from(css.matchAll(/([^{}]+)\{([^}]*)\}/g))
    .filter(match => match[1]
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(',')
      .some(candidate => suffix
        ? candidate.trim().startsWith('#nice ') && candidate.trim().endsWith(selector)
        : candidate.trim() === expected))
    .map(match => match[2])
}

function normalizeRule(rule: string): string {
  return rule
    .replace(/#[0-9a-f]{3,8}\b/gi, '#COLOR')
    .replace(/rgba?\([^)]*\)/gi, 'COLOR')
    .replace(/\s+/g, ' ')
    .trim()
}

function getLastColorNormalizedRule(css: string, selector: string): string {
  return normalizeRule(getRules(css, selector).at(-1) ?? '')
}

function getRulePropertySignature(css: string, selector: string): string {
  const rule = getRules(css, selector).at(-1) ?? ''
  return rule
    .split(';')
    .map(declaration => declaration.split(':', 1)[0]?.trim())
    .filter(Boolean)
    .sort()
    .join(',')
}

function getStructureOnlyRule(css: string, selector: string): string {
  return normalizeRule(getRules(css, selector).at(-1) ?? '')
    .replace(/(['"])[\s\S]*?\1/g, 'TEXT')
    .replace(/-?\d+(?:\.\d+)?(?:px|em|rem|%|deg|s|ms)?/gi, 'NUMBER')
}

function getNumericDeclarations(rules: readonly string[], property: string, unit: string): number[] {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `${escapedProperty}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)(?:(${escapedUnit}))?(?:\\s*!important)?(?=\\s*(?:;|$))`,
    'gi',
  )
  return rules.flatMap(rule => Array.from(rule.matchAll(pattern), (match) => {
    const value = Number(match[1])
    return match[2] || value === 0 ? [value] : []
  })).flat()
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('canonical visual variant registry', () => {
  it('keeps all seven variants and ten article profiles closed and unique', () => {
    expect(VISUAL_VARIANTS).toHaveLength(7)
    expect(ARTICLE_PROFILES).toHaveLength(10)
    expect(new Set(VISUAL_VARIANTS.map(variant => variant.id)).size).toBe(7)
    expect(new Set(ARTICLE_PROFILES.map(profile => profile.id)).size).toBe(10)
    expect(new Set(ARTICLE_PROFILES.map(profile => profile.variantId))).toEqual(new Set(
      VISUAL_VARIANTS.map(variant => variant.id),
    ))
    expect(new Set(VISUAL_VARIANTS.map(variant =>
      JSON.stringify(getVisualVariantMastheadPresentation(variant.id)),
    )).size).toBe(VISUAL_VARIANTS.length)
  })

  it('covers every existing platform preset without deleting or renaming an id', () => {
    expect(themePresets.map(preset => preset.id)).toEqual(EXPECTED_WECHAT_IDS)
    expect(xiaohongshuPresets.map(preset => preset.id)).toEqual(EXPECTED_XHS_IDS)
    expect(getZhihuPresets().map(preset => preset.id)).toEqual(EXPECTED_ZHIHU_IDS)

    for (const presetId of EXPECTED_WECHAT_IDS) {
      expect(resolveVisualVariant('wechat', presetId).fallback, presetId).toBe(false)
    }
    for (const presetId of EXPECTED_XHS_IDS) {
      expect(resolveVisualVariant('xiaohongshu', presetId).fallback, presetId).toBe(false)
    }
    for (const presetId of EXPECTED_ZHIHU_IDS) {
      expect(resolveVisualVariant('zhihu', presetId).fallback, presetId).toBe(false)
    }
  })

  it('preserves the approved profile and flagship compatibility mapping', () => {
    expect(resolveArticleProfile('thesis-translation').variantId).toBe('critical-translation')
    expect(resolveArticleProfile('legal-study').variantId).toBe('jurisprudence-atlas')
    expect(resolveArticleProfile('industry-report').variantId).toBe('industry-section')
    expect(resolveArticleProfile('current-commentary').variantId).toBe('fact-wire')
    expect(resolveArticleProfile('news').variantId).toBe('fact-wire')
    expect(resolveArticleProfile('aigc').variantId).toBe('machine-foundry')
    expect(resolveArticleProfile('software-creation').variantId).toBe('machine-foundry')
    expect(resolveArticleProfile('study-notes').variantId).toBe('knowledge-weave')
    expect(resolveArticleProfile('playful').variantId).toBe('human-margins')
    expect(resolveArticleProfile('life-reflection').variantId).toBe('human-margins')

    expect(resolveVisualVariant('wechat', 'flagship-kiln').variantId).toBe('machine-foundry')
    expect(resolveVisualVariant('wechat', 'flagship-kiln-paste-safe').variantId).toBe('machine-foundry')
    expect(resolveVisualVariant('wechat', 'flagship-tempera').variantId).toBe('knowledge-weave')
    expect(resolveVisualVariant('wechat', 'flagship-amber').variantId).toBe('industry-section')
  })

  it('resolves each variant back to an existing platform preset and keeps profile-specific choices', () => {
    for (const variant of VISUAL_VARIANTS) {
      for (const platform of ['wechat', 'xiaohongshu', 'zhihu'] as const) {
        const presetId = getPlatformPresetForVariant(variant.id, platform)
        const platformIds = platform === 'wechat'
          ? EXPECTED_WECHAT_IDS
          : platform === 'xiaohongshu'
            ? EXPECTED_XHS_IDS
            : EXPECTED_ZHIHU_IDS
        expect(platformIds, `${variant.id}:${platform}`).toContain(presetId)
      }
    }

    expect(getPlatformPresetForVariant('fact-wire', 'wechat', 'news')).toBe('news')
    expect(getPlatformPresetForVariant('machine-foundry', 'wechat', 'software-creation')).toBe('code')
    expect(getPlatformPresetForVariant('human-margins', 'wechat', 'playful')).toBe('meme')
    expect(getPlatformPresetForVariant('human-margins', 'xiaohongshu', 'life-reflection')).toBe('xhs-warm')
  })

  it('uses a diagnosable platform fallback for unknown ids without inventing presets', () => {
    expect(resolveVisualVariant('wechat', 'missing')).toMatchObject({
      requestedPresetId: 'missing',
      presetId: DEFAULT_PRESET_ID,
      variantId: 'industry-section',
      fallback: true,
    })
    expect(resolveVisualVariant('xiaohongshu', 'missing').presetId).toBe('xhs-fresh')
    expect(resolveVisualVariant('zhihu', 'missing').presetId).toBe('zhihu-academic')
  })
})

describe('batch visual variant CSS', () => {
  it('is connected to every existing platform preview and export preset', () => {
    for (const preset of themePresets) {
      expect(generateThemeCSS(preset, 'preview'), preset.id).toContain('inkforge-variant:')
      expect(generateThemeCSS(preset, 'export'), preset.id).toContain('inkforge-variant:')
    }
    for (const preset of xiaohongshuPresets) {
      expect(preset.previewCSS, preset.id).toContain('inkforge-variant:')
      expect(preset.exportCSS, preset.id).toContain('inkforge-variant:')
    }
    for (const preset of getZhihuPresets()) {
      expect(preset.previewCSS, preset.id).toContain('inkforge-variant:')
      expect(preset.exportCSS, preset.id).toContain('inkforge-variant:')
    }
  })

  it('gives every variant a platform-scoped, export-safe body and component treatment', () => {
    const canonicalWechatPreset = {
      'critical-translation': 'thesis',
      'jurisprudence-atlas': 'legal',
      'industry-section': 'report',
      'fact-wire': 'commentary',
      'machine-foundry': 'aigc',
      'knowledge-weave': 'notes',
      'human-margins': 'life',
    } as const

    const fingerprints = VISUAL_VARIANTS.map((variant) => {
      const css = getVisualVariantCSS('wechat', canonicalWechatPreset[variant.id], 'export')
      expect(css).toContain(`#nice`)
      expect(css).toContain(`inkforge-variant:${variant.id}`)
      expect(css).toContain('.ink-article-masthead__identity')
      expect(css).toContain('.ink-article-masthead__meta')
      expect(css).toContain('#nice > p')
      expect(css).toContain('.ink-writing-component')
      expect(css).toContain('.ink-article-colophon')
      expect(css).toContain('.ink-delivery-link')
      for (const selector of [
        'h4', 'h5', 'h6', 'strong', 'em', 'del', 'a', 'ul', 'ol', 'li',
        'blockquote p', 'hr', 'table', 'code', 'pre', 'figure', 'figcaption',
      ]) {
        expect(css, `${variant.id}:${selector}`).toContain(`#nice ${selector}`)
      }
      const paragraphRules = Array.from(css.matchAll(/#nice\s*>\s*p\s*\{([^}]*)\}/g), match => match[1])
      expect(paragraphRules.length, variant.id).toBeGreaterThan(0)
      const paragraphCss = paragraphRules.join('\n')
      expect(paragraphCss, variant.id).toContain('padding: 0;')
      expect(paragraphCss, variant.id).toContain('border: 0;')
      expect(paragraphCss, variant.id).toContain('background-color: transparent;')
      expect(paragraphCss, variant.id).not.toMatch(/border-(?:left|right|top|bottom)\s*:/i)
      expect(paragraphCss.match(/\bpadding\s*:/gi), variant.id).toHaveLength(1)
      expect(paragraphCss.match(/\bbackground-color\s*:/gi), variant.id).toHaveLength(1)
      expect(css).not.toMatch(/::|position\s*:|display\s*:\s*(?:flex|grid)|(?:linear|radial)-gradient|var\(|calc\(|filter\s*:|mask\s*:/i)
      return css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/#[0-9a-f]{3,8}\b/gi, '#COLOR')
        .replace(/rgba?\([^)]*\)/gi, 'COLOR')
    })

    expect(new Set(fingerprints).size).toBe(VISUAL_VARIANTS.length)
    const footerFingerprints = VISUAL_VARIANTS.map((variant) => {
      const css = getVisualVariantCSS('wechat', canonicalWechatPreset[variant.id], 'export')
      const rule = /\.ink-article-colophon\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
      expect(rule, variant.id).not.toBe('')
      return rule
        .replace(/#[0-9a-f]{3,8}\b/gi, '#COLOR')
        .replace(/\s+/g, ' ')
        .trim()
    })
    expect(new Set(footerFingerprints).size).toBe(VISUAL_VARIANTS.length)
  })

  it('keeps every WeChat preset on the readable CJK mobile baseline before user overrides', () => {
    for (const presetId of EXPECTED_WECHAT_IDS) {
      const css = getVisualVariantCSS('wechat', presetId, 'export')
      const preset = themePresets.find(candidate => candidate.id === presetId)
      expect(preset, presetId).toBeDefined()
      const completeCss = generateThemeCSS(preset!, 'export')
      const rootRules = getRules(css, '&').join('\n')
      const paragraphRules = getRules(css, '> p').join('\n')
      const mastheadTitleRules = getRules(css, '.ink-article-masthead__title', true)
      const h1Rules = getRules(css, 'h1')
      const h2Rules = getRules(css, 'h2')
      const h3Rules = getRules(css, 'h3')
      const paragraphLetterSpacing = getNumericDeclarations([paragraphRules], 'letter-spacing', 'em').map(Math.abs)
      const mastheadTitleFontSizes = getNumericDeclarations(mastheadTitleRules, 'font-size', 'px')
      const mastheadTitleLetterSpacing = getNumericDeclarations(mastheadTitleRules, 'letter-spacing', 'em').map(Math.abs)
      const h1FontSizes = getNumericDeclarations(h1Rules, 'font-size', 'px')
      const h2FontSizes = getNumericDeclarations(h2Rules, 'font-size', 'px')
      const h3FontSizes = getNumericDeclarations(h3Rules, 'font-size', 'px')

      expect(rootRules, presetId).toContain('letter-spacing: 0;')
      expect(paragraphRules, presetId).toContain('font-size: inherit;')
      expect(paragraphRules, presetId).toContain('font-family: inherit;')
      expect(completeCss, presetId).toMatch(/font-size:\s*16px/)
      expect(completeCss, presetId).toMatch(/Source Han|Noto (?:Sans|Serif) SC|Songti SC|STSong|SimSun|PingFang SC|Microsoft YaHei/)
      expect(paragraphLetterSpacing.length, `${presetId}:paragraph letter-spacing`).toBeGreaterThan(0)
      expect(mastheadTitleFontSizes.length, `${presetId}:masthead title font-size`).toBeGreaterThan(0)
      expect(mastheadTitleLetterSpacing.length, `${presetId}:masthead title letter-spacing`).toBeGreaterThan(0)
      expect(h1FontSizes.length, `${presetId}:h1 font-size`).toBeGreaterThan(0)
      expect(h2FontSizes.length, `${presetId}:h2 font-size`).toBeGreaterThan(0)
      expect(h3FontSizes.length, `${presetId}:h3 font-size`).toBeGreaterThan(0)
      expect(Math.max(...paragraphLetterSpacing), presetId)
        .toBeLessThanOrEqual(0.02)
      expect(Math.max(...mastheadTitleFontSizes), presetId)
        .toBeLessThanOrEqual(26)
      expect(Math.max(...mastheadTitleLetterSpacing), presetId)
        .toBeLessThanOrEqual(0.035)
      expect(Math.max(...h1FontSizes), presetId)
        .toBeLessThanOrEqual(25)
      expect(Math.max(...h2FontSizes), presetId)
        .toBeLessThanOrEqual(20)
      expect(Math.max(...h3FontSizes), presetId)
        .toBeLessThanOrEqual(17)
    }
  })

  it('keeps dynamic preset text accents at WCAG AA contrast on the editor paper', () => {
    for (const preset of themePresets) {
      const textAccent = darkenForWhiteText(preset.primaryColor, 4.8)
      expect(contrastRatio(textAccent, '#FFFFFF'), preset.id).toBeGreaterThanOrEqual(4.8)
    }
  })

  it('keeps common small-text accents readable without darkening decorative borders', () => {
    const cases = [
      ['thesis', '#FBF8F1'],
      ['legal', '#FCFBF6'],
      ['report', '#FCFBF7'],
      ['commentary', '#FFFFFF'],
      ['aigc', '#FAFAF7'],
      ['notes', '#FBFCF9'],
      ['life', '#FCFAF6'],
    ] as const

    for (const [presetId, paper] of cases) {
      const css = getVisualVariantCSS('wechat', presetId, 'export')
      for (const selector of ['.ink-writing-component__accent', 'h4', 'strong', 'a', 'code']) {
        const rule = getRules(css, selector)[0] ?? ''
        const color = /(?:^|;)\s*color:\s*(#[0-9a-f]{6})/i.exec(rule)?.[1]
        expect(color, `${presetId}:${selector}`).toBeDefined()
        expect(contrastRatio(color!, paper), `${presetId}:${selector}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('keeps the three contrast families structurally distinct across the complete article grammar', () => {
    const samples = ['thesis', 'aigc', 'life'] as const
    const selectors = [
      'h1',
      'h2',
      'h3',
      'blockquote',
      'ul',
      'ol',
      'table',
      'code',
      'pre',
      '.katex-display',
      'img',
      'figure',
      'figcaption',
      'hr',
      '.ink-article-colophon',
      '.ink-delivery-link',
    ] as const

    for (const selector of selectors) {
      const signatures = samples.map((presetId) => {
        const css = getVisualVariantCSS('wechat', presetId, 'export')
        const rule = getRules(css, selector).at(-1) ?? ''
        expect(rule, `${presetId}:${selector}`).not.toBe('')
        return normalizeRule(rule)
      })
      expect(new Set(signatures).size, selector).toBe(samples.length)
    }
  })

  it('uses the native root selector for each platform', () => {
    expect(getVisualVariantCSS('wechat', 'report', 'preview')).toContain('#nice')
    expect(getVisualVariantCSS('xiaohongshu', 'xhs-tech', 'preview')).toContain('#xhs-note')
    expect(getVisualVariantCSS('zhihu', 'zhihu-insight', 'preview')).toContain('#zhihu-answer')
  })

  it('keeps playful and quiet human-margins profiles visually distinct without emoji', () => {
    const playful = getVisualVariantCSS('wechat', 'meme', 'export')
    const quiet = getVisualVariantCSS('wechat', 'life', 'export')
    expect(playful).not.toBe(quiet)
    expect(playful).toContain('human-margins-playful')
    expect(quiet).toContain('human-margins-quiet')
    expect(`${playful}${quiet}`).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it.each([
    ['fact-wire', ['commentary', 'news']],
    ['machine-foundry', ['aigc', 'code', 'tech']],
    ['human-margins', ['meme', 'life', 'elegant']],
  ] as const)(
    'gives every %s profile a structural CSS signature rather than a color-only alias',
    (variantId, presetIds) => {
      const fingerprints = presetIds.map(presetId =>
        getVisualVariantCSS('wechat', presetId, 'export', variantId)
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/#[0-9a-f]{3,8}\b/gi, '#COLOR')
          .replace(/rgba?\([^)]*\)/gi, 'COLOR')
          .replace(/\s+/g, ' ')
          .trim(),
      )

      expect(new Set(fingerprints).size).toBe(presetIds.length)
    },
  )

  it('keeps every base WeChat preset structurally unique after colors are normalized', () => {
    const fingerprints = BASE_WECHAT_IDS.map(presetId =>
      getVisualVariantCSS('wechat', presetId, 'export')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/#[0-9a-f]{3,8}\b/gi, '#COLOR')
        .replace(/rgba?\([^)]*\)/gi, 'COLOR')
        .replace(/\s+/g, ' ')
        .trim(),
    )

    expect(new Set(fingerprints).size).toBe(BASE_WECHAT_IDS.length)
  })

  it('gives all 16 WeChat presets distinct song, metrics, component, and profile geometry', () => {
    const selectors = [
      '.ink-article-song[data-ink-masthead-song="true"]',
      '.ink-article-masthead__meta',
      '.ink-writing-component',
      '.ink-delivery-profile[data-ink-delivery="profile"]',
    ] as const

    const fingerprints = EXPECTED_WECHAT_IDS.map((presetId) => {
      const css = getVisualVariantCSS('wechat', presetId, 'export')
      const rules = selectors.map((selector) => {
        const rule = getRules(css, selector).at(-1) ?? ''
        expect(rule, `${presetId}:${selector}`).not.toBe('')
        expect(rule, `${presetId}:${selector}`).toContain('!important')
        return getRulePropertySignature(css, selector)
      })
      return rules.join('|')
    })

    // Values, colors, names, ids, text, and numbers are deliberately excluded.
    expect(new Set(fingerprints).size).toBe(EXPECTED_WECHAT_IDS.length)
  })

  it('keeps every pair of WeChat presets distinct in at least three non-color component categories', () => {
    const categories = [
      ['.ink-article-song[data-ink-masthead-song="true"]'],
      ['.ink-article-masthead__meta'],
      ['.ink-writing-component'],
      ['.ink-delivery-profile[data-ink-delivery="profile"]', '.ink-article-colophon'],
      ['.ink-article-masthead__identity', '.ink-article-masthead__title'],
    ] as const
    const categoryLabels = ['song', 'metrics', 'component', 'profile-close', 'masthead'] as const
    const signatures = EXPECTED_WECHAT_IDS.map((presetId) => {
      const css = getVisualVariantCSS('wechat', presetId, 'export')
      return categories.map(selectors => selectors
        .map(selector => getStructureOnlyRule(css, selector))
        .join('|'))
    })

    const violations: string[] = []
    for (let left = 0; left < EXPECTED_WECHAT_IDS.length; left += 1) {
      for (let right = left + 1; right < EXPECTED_WECHAT_IDS.length; right += 1) {
        const differentCategories = signatures[left]
          .filter((signature, index) => signature !== signatures[right][index])
        if (differentCategories.length < 3) {
          const matchingCategories = categoryLabels.filter(
            (_, index) => signatures[left][index] === signatures[right][index],
          )
          violations.push(
            `${EXPECTED_WECHAT_IDS[left]} vs ${EXPECTED_WECHAT_IDS[right]}: ${differentCategories.length}; same=${matchingCategories.join(',')}`,
          )
        }
      }
    }
    expect(violations).toEqual([])
  })

  it.each([
    ['fact-wire', ['commentary', 'news']],
    ['machine-foundry', ['aigc', 'code', 'tech']],
    ['human-margins', ['meme', 'life', 'elegant']],
  ] as const)(
    'keeps %s sibling profiles distinct beyond their mastheads',
    (variantId, presetIds) => {
      const signatures = presetIds.map((presetId) => {
        const css = getVisualVariantCSS('wechat', presetId, 'export', variantId)
        return [
          getLastColorNormalizedRule(css, 'h3'),
          getLastColorNormalizedRule(css, '.ink-writing-component'),
          getLastColorNormalizedRule(css, '.ink-article-colophon'),
        ].join('|')
      })

      expect(new Set(signatures).size).toBe(presetIds.length)
    },
  )
})
