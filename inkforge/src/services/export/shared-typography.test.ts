/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { convertToNativeFormat } from './index'
import {
  applyWechatTypographyInlineOverrides,
  typographyToCssVars,
  typographyToWechatCss,
  type TypographyConfig,
} from './shared-typography'
import { getPresetById, themePresets } from './themes'
import { convertToWechatWithStats } from './wechat'

const TYPOGRAPHY = {
  fontSize: 20,
  lineHeight: 2,
  letterSpacing: 0.08,
  paragraphSpacing: 28,
  paragraphIndent: true,
  textAlign: 'justify' as const,
  listSpacing: 14,
  headingScale: 'display' as const,
  headingStyle: 'pill' as const,
  blockquoteStyle: 'card' as const,
  dividerStyle: 'ornament' as const,
  mediaStyle: 'framed' as const,
  fontFamily: 'wenkai',
}

const BASE_TYPOGRAPHY: TypographyConfig = {
  fontSize: 16,
  lineHeight: 1.7,
  letterSpacing: 0,
  paragraphSpacing: 16,
  paragraphIndent: false,
  fontFamily: 'serif',
  textAlign: 'left',
  listSpacing: 8,
  headingScale: 'balanced',
  headingStyle: 'none',
  blockquoteStyle: 'classic',
  dividerStyle: 'line',
  mediaStyle: 'plain',
}

const TYPOGRAPHY_EFFECT_CASES: Array<{
  name: keyof TypographyConfig
  markdown: string
  value: TypographyConfig[keyof TypographyConfig]
}> = [
  { name: 'fontSize', markdown: '第一正文段落。\n\n第二正文段落。', value: 20 },
  { name: 'lineHeight', markdown: '第一正文段落。\n\n第二正文段落。', value: 2.1 },
  { name: 'letterSpacing', markdown: '第一正文段落。\n\n第二正文段落。', value: 0.08 },
  { name: 'paragraphSpacing', markdown: '第一正文段落。\n\n第二正文段落。', value: 28 },
  { name: 'paragraphIndent', markdown: '第一正文段落。\n\n第二正文段落。', value: true },
  { name: 'fontFamily', markdown: '第一正文段落。\n\n第二正文段落。', value: 'wenkai' },
  { name: 'textAlign', markdown: '第一正文段落。\n\n第二正文段落。', value: 'justify' },
  { name: 'listSpacing', markdown: '- 第一项\n- 第二项\n- 第三项', value: 14 },
  { name: 'headingScale', markdown: '# 一级标题\n\n## 二级标题\n\n### 三级标题', value: 'display' },
  { name: 'headingStyle', markdown: '## 二级标题\n\n### 三级标题\n\n正文段落。', value: 'pill' },
  { name: 'blockquoteStyle', markdown: '正文段落。\n\n> 引用段落。', value: 'card' },
  { name: 'dividerStyle', markdown: '分隔线上文。\n\n---\n\n分隔线下文。', value: 'ornament' },
  { name: 'mediaStyle', markdown: '![示例图片](https://example.com/inkforge.png)', value: 'framed' },
]

function getParagraphTextIndent(html: string, text: string): string | undefined {
  const template = document.createElement('template')
  template.innerHTML = html
  return Array.from(template.content.querySelectorAll('p'))
    .find(paragraph => paragraph.textContent === text)
    ?.style.textIndent
}

async function renderWechatTypography(
  presetId: string,
  markdown: string,
  typography: TypographyConfig,
): Promise<string> {
  const result = await convertToNativeFormat(markdown, 'wechat', {
    presetId,
    includeQualityReport: false,
    exportOptions: {
      enableReadingTime: false,
      enableCiteStatus: false,
      enableCodeHighlight: false,
      enableEnhancedTable: false,
    },
    overrides: { typography },
  })
  return result.content
}

describe('shared typography rendering', () => {
  it('generates a complete WeChat-safe override for every canonical control', () => {
    const css = typographyToWechatCss(TYPOGRAPHY, '#1565C0')

    expect(css).toContain('font-size: 20px')
    expect(css).toContain('line-height: 2')
    expect(css).toContain('letter-spacing: 0.08em')
    expect(css).toContain('margin-bottom: 28px')
    expect(css).toContain('text-indent: 2em')
    expect(css).toContain('text-align: justify')
    expect(css).toContain('margin-bottom: 14px')
    expect(css).toContain('font-size: 2em')
    expect(css).toContain('border-radius: 999px')
    expect(css).toContain('box-shadow: 0 8px 24px')
    expect(css).toContain('border-top: 3px double #1565C0')
    expect(css).toContain('box-sizing: border-box')
    expect(css).toContain('LXGW WenKai')
  })

  it('keeps the default WeChat reading target at 16px with neutral CJK spacing', () => {
    const css = typographyToWechatCss(BASE_TYPOGRAPHY)

    expect(css).toMatch(/#nice \{[^}]*font-size: 16px;[^}]*letter-spacing: 0em;/)
    expect(css).toMatch(/#nice p \{[^}]*font-size: 16px;[^}]*line-height: 1\.7;[^}]*letter-spacing: 0em;/)
    expect(css).toContain('font-size: 1.75em')
    expect(css).toContain('font-size: 1.38em')
    expect(css).toContain('font-size: 1.12em')
  })

  it('keeps valid explicit typography authoritative across editor and WeChat output', () => {
    const explicit: TypographyConfig = {
      ...BASE_TYPOGRAPHY,
      fontFamily: 'mono',
      fontSize: 20,
      lineHeight: 1.3,
      letterSpacing: 0.11,
      headingScale: 'display',
    }
    const snapshot = { ...explicit }

    const editorVars = typographyToCssVars(explicit)
    const wechatCss = typographyToWechatCss(explicit)

    expect(editorVars['--ink-font-size']).toBe('20px')
    expect(editorVars['--ink-line-height']).toBe('1.3')
    expect(editorVars['--ink-letter-spacing']).toBe('0.11em')
    expect(editorVars['--ink-font-family']).toContain('Fira Code')
    expect(wechatCss).toMatch(/#nice \{[^}]*font-size: 20px;[^}]*line-height: 1\.3;[^}]*letter-spacing: 0\.11em;/)
    expect(wechatCss).toContain('"Fira Code", "JetBrains Mono"')
    expect(wechatCss).toContain('font-size: 2em')
    expect(wechatCss).toContain('font-size: 1.55em')
    expect(wechatCss).toContain('font-size: 1.2em')
    expect(explicit).toEqual(snapshot)
  })

  it('applies explicit values unchanged when they are already inside the readable WeChat range', () => {
    const css = typographyToWechatCss({
      ...BASE_TYPOGRAPHY,
      fontFamily: 'humanist',
      fontSize: 17,
      lineHeight: 1.82,
      letterSpacing: 0.015,
      headingScale: 'compact',
    })

    expect(css).toMatch(/#nice \{[^}]*font-size: 17px;[^}]*line-height: 1\.82;[^}]*letter-spacing: 0\.015em;/)
    expect(css).toContain('HarmonyOS Sans SC')
    expect(css).toContain('font-size: 1.55em')
    expect(css).toContain('font-size: 1.22em')
    expect(css).toContain('font-size: 1.08em')
  })

  it('inlines canonical typography into the real WeChat artifact', async () => {
    const result = await convertToNativeFormat([
      '# 标题',
      '',
      '正文段落。',
      '',
      '> 引用段落。',
      '',
      '- 第一项',
      '- 第二项',
      '',
      '---',
      '',
      '![示例图片](https://example.com/inkforge.png)',
    ].join('\n'), 'wechat', {
      includeQualityReport: false,
      exportOptions: { enableReadingTime: false },
      overrides: {
        primaryColor: '#1565C0',
        typography: TYPOGRAPHY,
      },
    })

    expect(result.format).toBe('html')
    expect(result.content).toMatch(/<section[^>]+font-size:\s*20px/i)
    expect(result.content).toMatch(/<p[^>]+font-size:\s*20px/i)
    expect(result.content).toMatch(/<p[^>]+line-height:\s*2/i)
    expect(result.content).toMatch(/<p[^>]+letter-spacing:\s*0\.08em/i)
    expect(result.content).toMatch(/<p[^>]+margin-bottom:\s*28px/i)
    expect(result.content).toMatch(/<p[^>]+text-indent:\s*2em/i)
    expect(result.content).toMatch(/<p[^>]+text-align:\s*justify/i)
    expect(result.content).toMatch(/<h1[^>]+font-size:\s*2em/i)
    expect(result.content).toMatch(/<h1[^>]+border-radius:\s*999px/i)
    expect(result.content).toMatch(/<blockquote[^>]+box-shadow:\s*0 8px 24px/i)
    expect(result.content).toMatch(/<li[^>]+margin-bottom:\s*14px/i)
    expect(result.content).toMatch(/<hr[^>]+border-top:\s*3px double #1565C0/i)
    expect(result.content).toMatch(/<img[^>]+box-sizing:\s*border-box/i)
    expect(result.content).not.toMatch(/<style\b/i)
    expect(getParagraphTextIndent(result.content, '正文段落。')).toBe('2em')
    expect(getParagraphTextIndent(result.content, '引用段落。')).toBe('0px')
  })

  it.each(['background', 'pill'] as const)(
    'keeps the %s heading override readable across every WeChat preset',
    async headingStyle => {
      for (const preset of themePresets) {
        const html = await renderWechatTypography(
          preset.id,
          '# 一级标题\n\n## 二级标题\n\n### 三级标题',
          { ...BASE_TYPOGRAPHY, headingStyle },
        )
        const template = document.createElement('template')
        template.innerHTML = html

        for (const heading of template.content.querySelectorAll('h1, h2, h3')) {
          const style = heading.getAttribute('style') ?? ''
          expect(style, `${preset.id} ${heading.tagName}`).toMatch(/color:\s*#252933/i)
        }
      }
    },
    15_000,
  )

  it('lets the explicit indent option override preset first-paragraph specificity without indenting quotes', () => {
    const preset = getPresetById('thesis')
    expect(preset).toBeDefined()

    const result = convertToWechatWithStats(
      '<p>第一正文段落。</p><p>第二正文段落。</p><blockquote><p>引用段落。</p></blockquote>',
      preset!,
      {
        enableTextIndent: true,
        enableReadingTime: false,
        enableCiteStatus: false,
        enableCodeHighlight: false,
        enableEnhancedTable: false,
        enableCjkSpacing: false,
      },
    )

    expect(getParagraphTextIndent(result.html, '第一正文段落。')).toBe('2em')
    expect(getParagraphTextIndent(result.html, '第二正文段落。')).toBe('2em')
    expect(getParagraphTextIndent(result.html, '引用段落。')).toBe('0px')
  })

  it('keeps every canonical typography control effective in every WeChat preset', async () => {
    const noEffect: Array<{ presetId: string; control: keyof TypographyConfig }> = []

    for (const preset of themePresets) {
      for (const entry of TYPOGRAPHY_EFFECT_CASES) {
        const baseline = await renderWechatTypography(preset.id, entry.markdown, BASE_TYPOGRAPHY)
        const changed = await renderWechatTypography(preset.id, entry.markdown, {
          ...BASE_TYPOGRAPHY,
          [entry.name]: entry.value,
        } as TypographyConfig)
        if (baseline === changed) {
          noEffect.push({ presetId: preset.id, control: entry.name })
        }
      }
    }

    expect(noEffect).toEqual([])
  }, 15_000)
  it('resolves inline shorthand conflicts without broad !important locks', () => {
    const source = [
      '<blockquote style="background-color:#111111 !important;color:#FFFFFF !important;',
      'border:8px solid #FF0000 !important;padding-left:99px !important">引用段落。</blockquote>',
    ].join('')

    const unlocked = applyWechatTypographyInlineOverrides(
      source,
      BASE_TYPOGRAPHY,
      '#004080',
    )
    const unlockedStyle = /style="([^"]+)"/.exec(unlocked)?.[1] ?? ''
    expect(unlockedStyle).not.toMatch(/background-color:#111111|border:8px|padding-left:99px/i)
    expect(unlockedStyle).toContain('background:#F7F8FA')
    expect(unlockedStyle).toContain('color:inherit')
    expect(unlockedStyle).toContain('border-left:4px solid #004080')
    expect(unlockedStyle).toContain('padding:12px 16px')

    const preserved = applyWechatTypographyInlineOverrides(
      source,
      BASE_TYPOGRAPHY,
      '#004080',
      true,
    )
    const preservedStyle = /style="([^"]+)"/.exec(preserved)?.[1] ?? ''
    expect(preservedStyle).toMatch(/background-color:#111111 !important/i)
    expect(preservedStyle).toMatch(/color:#FFFFFF !important/i)
    expect(preservedStyle).not.toContain('background:#F7F8FA')
    expect(preservedStyle).not.toContain('color:inherit')
    expect(preservedStyle).not.toMatch(/border:8px|padding-left:99px/i)
    expect(preservedStyle).toContain('border-left:4px solid #004080')
    expect(preservedStyle).toContain('padding:12px 16px')
  })

  it('removes every border-image longhand when canonical typography normalizes border shorthand', () => {
    const source = [
      '<blockquote style="border-image-source:url(https://example.com/frame.png);',
      'border-image-slice:30;border-image-width:2;border-image-outset:1;',
      'border-image-repeat:round">引用段落。</blockquote>',
    ].join('')

    const rendered = applyWechatTypographyInlineOverrides(
      source,
      { ...BASE_TYPOGRAPHY, blockquoteStyle: 'modern' },
      '#004080',
    )
    const style = /style="([^"]+)"/.exec(rendered)?.[1] ?? ''

    expect(style).toContain('border:0')
    expect(style).toContain('border-left:0')
    expect(style).not.toMatch(/border-image-(?:source|slice|width|outset|repeat)/i)
  })

  it('keeps quoted greater-than characters intact while inlining tag styles', () => {
    const source = '<img alt="a > b" src="https://example.com/a.png" style="width:100%">'
    const rendered = applyWechatTypographyInlineOverrides(source, BASE_TYPOGRAPHY)

    const template = document.createElement('template')
    template.innerHTML = rendered
    const image = template.content.querySelector('img')
    expect(image?.getAttribute('alt')).toBe('a > b')
    expect(image?.getAttribute('src')).toBe('https://example.com/a.png')
    expect(image?.getAttribute('style')).toContain('box-sizing:border-box')
  })

  it('keeps flagship heading overrides inside the matching section', () => {
    const source = [
      '<section data-ink-block="flagship-h2"><p id="target">目标标题</p></section>',
      '<section data-ink-block="flagship-h2"></section>',
      '<p id="ordinary">普通正文</p>',
    ].join('')
    const rendered = applyWechatTypographyInlineOverrides(source, BASE_TYPOGRAPHY)
    const template = document.createElement('template')
    template.innerHTML = rendered

    expect(template.content.querySelector<HTMLElement>('#target')?.style.fontSize).toBe('1.38em')
    expect(template.content.querySelector<HTMLElement>('#ordinary')?.style.fontSize).toBe('')
  })
})
