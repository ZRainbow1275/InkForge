/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'

import {
  checkWechatSafe,
  SVG_MODULES,
} from './svg-modules'
import { applyWechatOptionSvgModules } from './wechat-svg-options'
import {
  createDefaultWechatSvgInjectionPlan,
  getWechatSvgApplicationSlotModuleId,
  normalizeWechatSvgApplicationPlan,
  setWechatSvgApplicationSlot,
  WECHAT_SVG_APPLICATION_SLOTS,
} from './wechat-svg-application'

const WECHAT_SVG_APPLICATION_HTML = [
  '<h1>Application SVG module chooser</h1>',
  '<h2>Section heading</h2>',
  '<p>Body text before divider.</p>',
  '<hr>',
  '<blockquote>Quote text for module replacement.</blockquote>',
  '<p>Final paragraph.</p>',
].join('')

function extractSvgSection(html: string, moduleId: string): string {
  const pattern = new RegExp(
    `<section\\b(?=[^>]*\\bdata-ink-svg="${moduleId}")[\\s\\S]*?<\\/section>`,
    'i',
  )
  return pattern.exec(html)?.[0] ?? ''
}

describe('WeChat SVG application chooser contract', () => {
  it('exposes semantic slots and an all-module showcase slot for the app UI', () => {
    expect(WECHAT_SVG_APPLICATION_SLOTS.map(slot => slot.id)).toEqual([
      'cover',
      'heading',
      'divider',
      'blockquote',
      'showcase',
    ])

    const showcase = WECHAT_SVG_APPLICATION_SLOTS.find(slot => slot.id === 'showcase')
    expect(showcase?.modules.map(module => module.id)).toEqual(SVG_MODULES.map(module => module.id))
    expect(showcase?.modules).toHaveLength(27)
  })

  it('normalizes an empty application plan to valid registered module ids', () => {
    const plan = normalizeWechatSvgApplicationPlan()
    const registeredIds = new Set(SVG_MODULES.map(module => module.id))

    for (const slot of WECHAT_SVG_APPLICATION_SLOTS) {
      const moduleId = getWechatSvgApplicationSlotModuleId(plan, slot.id)
      expect(registeredIds.has(moduleId), `${slot.id} should resolve to a registered module`).toBe(true)
    }
  })

  it('can apply every registered SVG module from the app showcase slot to WeChat-safe output', () => {
    const preset = {
      primaryColor: '#004080',
      persona: 'business',
    } as const

    for (const module of SVG_MODULES) {
      const plan = setWechatSvgApplicationSlot(
        createDefaultWechatSvgInjectionPlan(),
        'showcase',
        module.id,
      )
      const rendered = applyWechatOptionSvgModules(WECHAT_SVG_APPLICATION_HTML, preset, {
        enableSvgModules: true,
        svgInjectionPlan: plan,
      })
      const section = extractSvgSection(rendered, module.id)

      expect(section, `${module.id} should be injected`).toContain(`data-ink-svg="${module.id}"`)
      expect(section, `${module.id} should keep inline SVG`).toMatch(/<svg\b/i)
      expect(section, `${module.id} should keep responsive width`).toContain('width="100%"')
      expect(section, `${module.id} should keep viewBox`).toMatch(/viewBox="[^"]+"/i)
      expect(checkWechatSafe(section), `${module.id} should remain WeChat-safe`).toEqual([])
    }
  })
})
