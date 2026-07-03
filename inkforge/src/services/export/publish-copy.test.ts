/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'

import {
  PUBLISH_COPY_ALLOWED_ATTR,
  PUBLISH_COPY_ALLOWED_TAGS,
  markdownToWechatWithStats,
  sanitizePublishRichCopyHtml,
  themePresets,
} from './index'
import { buildThemeContext, checkWechatSafe, SVG_MODULES } from './svg-modules'
import type { PresetPersona } from '@/types'

const SVG_COPY_MARKDOWN = [
  '# WeChat SVG Copy Fixture',
  '',
  'This paragraph proves the fallback copy sanitizer keeps real article text.',
  '',
  '> SVG flagship styling must survive into the rich-copy fallback payload.',
].join('\n')

const PERSONAS: PresetPersona[] = ['academic', 'business', 'lifestyle', 'creative']
const SAMPLE_COLORS: Record<PresetPersona, string> = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
}

function textContentOf(html: string): string {
  const container = document.createElement('div')
  container.innerHTML = html
  return container.textContent ?? ''
}

describe('Publish Center rich-copy fallback sanitizer', () => {
  it('keeps the explicitly supported WeChat-safe SVG tag and attribute subset', () => {
    expect(PUBLISH_COPY_ALLOWED_TAGS).toEqual(expect.arrayContaining([
      'svg',
      'path',
      'rect',
      'text',
      'tspan',
      'animate',
      'animateTransform',
      'set',
    ]))
    expect(PUBLISH_COPY_ALLOWED_ATTR).toEqual(expect.arrayContaining([
      'data-ink-svg',
      'data-ink-block',
      'viewBox',
      'width',
      'height',
      'attributeName',
      'begin',
      'dur',
      'values',
    ]))
  })

  it('preserves flagship SVG output while stripping scriptable or foreign SVG constructs', async () => {
    const preset = themePresets.find(item => item.id === 'flagship-amber')
    expect(preset).toBeDefined()
    if (!preset) return

    const generated = await markdownToWechatWithStats(SVG_COPY_MARKDOWN, preset, {
      enableCjkSpacing: true,
      enableReadingTime: false,
      enableCiteStatus: false,
    })

    const hostileSuffix = [
      '<script>alert(1)</script>',
      '<style>svg { display: none; }</style>',
      '<svg data-ink-svg="bad" onload="alert(1)" viewBox="0 0 10 10">',
      '<foreignObject><div>not allowed</div></foreignObject>',
      '<a href="javascript:alert(2)"><text>bad link</text></a>',
      '</svg>',
    ].join('')

    const sanitized = sanitizePublishRichCopyHtml(`${generated.html}${hostileSuffix}`)

    expect(textContentOf(sanitized)).toContain('This paragraph proves the fallback copy sanitizer keeps real article text.')
    expect(sanitized).toContain('data-ink-svg')
    expect(sanitized).toMatch(/<svg\b/i)
    expect(sanitized).toContain('width="100%"')
    expect(sanitized).toMatch(/viewBox="[^"]+"/i)
    expect(sanitized).toContain('data-ink-block')
    expect(sanitized).not.toMatch(/<script\b/i)
    expect(sanitized).not.toMatch(/<style\b/i)
    expect(sanitized).not.toMatch(/onload=/i)
    expect(sanitized).not.toMatch(/<foreignObject\b/i)
    expect(sanitized).not.toMatch(/javascript:/i)
  })

  it('preserves every registered WeChat SVG module through the rich-copy fallback sanitizer', () => {
    expect(SVG_MODULES).toHaveLength(27)

    for (const module of SVG_MODULES) {
      for (const persona of PERSONAS) {
        const theme = buildThemeContext({
          primaryColor: SAMPLE_COLORS[persona],
          persona,
          target: 'wechat',
        })
        const rendered = module.render({
          theme,
          text: 'InkForge module sanitizer coverage',
          subtitle: 'Publish Center rich-copy fallback',
          index: 2,
          items: [
            { title: 'Card One', body: 'First body' },
            { title: 'Card Two', body: 'Second body' },
          ],
        })

        const sanitized = sanitizePublishRichCopyHtml(rendered)

        expect(checkWechatSafe(sanitized), `${module.id}/${persona} should remain WeChat-safe`).toEqual([])
        expect(sanitized, `${module.id}/${persona} sentinel`).toContain(`data-ink-svg="${module.id}"`)
        expect(sanitized, `${module.id}/${persona} inline svg`).toMatch(/<svg\b/i)
        expect(sanitized, `${module.id}/${persona} viewBox`).toContain('viewBox')
        expect(sanitized, `${module.id}/${persona} responsive width`).toContain('width="100%"')
        expect(sanitized, `${module.id}/${persona} script`).not.toMatch(/<script\b/i)
        expect(sanitized, `${module.id}/${persona} style`).not.toMatch(/<style\b/i)
        expect(sanitized, `${module.id}/${persona} foreignObject`).not.toMatch(/<foreignObject\b/i)
        expect(sanitized, `${module.id}/${persona} events`).not.toMatch(/\son[a-z]+\s*=/i)
        expect(sanitized, `${module.id}/${persona} javascript uri`).not.toMatch(/javascript:/i)
      }
    }
  })
})
