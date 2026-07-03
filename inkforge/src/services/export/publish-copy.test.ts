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

const SVG_COPY_MARKDOWN = [
  '# WeChat SVG Copy Fixture',
  '',
  'This paragraph proves the fallback copy sanitizer keeps real article text.',
  '',
  '> SVG flagship styling must survive into the rich-copy fallback payload.',
].join('\n')

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
})
