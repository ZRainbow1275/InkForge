/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'

import { getDefaultPreset } from './themes'
import { markdownToWechatWithStats } from './wechat'
import {
  checkWechatSafe,
  SVG_MODULES,
} from './svg-modules'
import type { SvgInjectionPlan } from './svg-modules'

const WECHAT_SVG_OPTION_MARKDOWN = [
  '# InkForge SVG option contract',
  '## Section title',
  'Body text before the divider.',
  '---',
  '> Quote text for SVG replacement.',
  'Final paragraph.',
].join('\n\n')

function extractSvgModuleSection(html: string, moduleId: string): string {
  const pattern = new RegExp(
    `<section\\b(?=[^>]*\\bdata-ink-svg="${moduleId}")[\\s\\S]*?<\\/section>`,
    'i',
  )
  return pattern.exec(html)?.[0] ?? ''
}

describe('WeChat SVG option injection', () => {
  it('keeps the existing default preset output unchanged unless SVG modules are explicitly enabled', async () => {
    const preset = getDefaultPreset()
    const plan: SvgInjectionPlan = {
      cover: 'cover-title',
      headings: [{ level: 2, module: 'header-ribbon' }],
      replaceHr: 'divider-diamond',
      blockquote: 'quote-vbar',
      endmark: 'endmark-fin',
    }

    const disabled = await markdownToWechatWithStats(WECHAT_SVG_OPTION_MARKDOWN, preset, {
      enableReadingTime: false,
      svgInjectionPlan: plan,
    })
    const emptyEnabled = await markdownToWechatWithStats(WECHAT_SVG_OPTION_MARKDOWN, preset, {
      enableReadingTime: false,
      enableSvgModules: true,
    })

    expect(disabled.html).not.toContain('data-ink-svg')
    expect(emptyEnabled.html).not.toContain('data-ink-svg')
  })

  it('applies an explicit SVG injection plan through the real WeChat export pipeline', async () => {
    const preset = getDefaultPreset()
    const plan: SvgInjectionPlan = {
      cover: 'cover-title',
      headings: [{ level: 2, module: 'header-ribbon' }],
      replaceHr: 'divider-diamond',
      blockquote: 'quote-vbar',
      endmark: 'endmark-fin',
    }

    const result = await markdownToWechatWithStats(WECHAT_SVG_OPTION_MARKDOWN, preset, {
      enableReadingTime: false,
      enableSvgModules: true,
      svgInjectionPlan: plan,
    })

    for (const moduleId of ['cover-title', 'header-ribbon', 'divider-diamond', 'quote-vbar', 'endmark-fin']) {
      const section = extractSvgModuleSection(result.html, moduleId)
      expect(section, `${moduleId} should be injected`).toContain(`data-ink-svg="${moduleId}"`)
      expect(section, `${moduleId} should keep inline SVG`).toMatch(/<svg\b/i)
      expect(section, `${moduleId} should keep responsive width`).toContain('width="100%"')
      expect(section, `${moduleId} should keep viewBox`).toMatch(/viewBox="[^"]+"/i)
      expect(checkWechatSafe(section), `${moduleId} should stay WeChat-safe`).toEqual([])
    }

    expect(result.html).not.toMatch(/<script\b/i)
    expect(result.html).not.toMatch(/<style\b/i)
    expect(result.html).not.toMatch(/foreignObject/i)
    expect(result.html).toContain('<section id="nice"')
    expect(result.html).toContain('data-wechat-clamp="1"')
    expect(result.html).toContain('max-width:677px')
    expect(result.html).toMatch(/font-size:\s*16px/i)
  })

  it('can apply every registered SVG module as an explicit WeChat export option module', async () => {
    const preset = getDefaultPreset()

    for (const module of SVG_MODULES) {
      const result = await markdownToWechatWithStats(WECHAT_SVG_OPTION_MARKDOWN, preset, {
        enableReadingTime: false,
        enableSvgModules: true,
        svgInjectionPlan: { endmark: module.id },
      })
      const section = extractSvgModuleSection(result.html, module.id)

      expect(section, `${module.id} should be injected from WeChat options`).toContain(`data-ink-svg="${module.id}"`)
      expect(section, `${module.id} should keep inline SVG`).toMatch(/<svg\b/i)
      expect(section, `${module.id} should keep responsive width`).toContain('width="100%"')
      expect(section, `${module.id} should keep viewBox`).toMatch(/viewBox="[^"]+"/i)
      expect(checkWechatSafe(section), `${module.id} should stay WeChat-safe`).toEqual([])
    }
  })
})
