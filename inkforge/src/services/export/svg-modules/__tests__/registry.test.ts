import { describe, it, expect } from 'vitest'
import {
  SVG_MODULES,
  SVG_MODULE_REGISTRY,
  getSvgModule,
  getSvgModulesByFamily,
} from '../index'
import { buildThemeContext } from '../theme'
import { checkWechatSafe } from '../wechat-safe'
import type { PresetPersona } from '@/types'

const PERSONAS: PresetPersona[] = ['academic', 'business', 'lifestyle', 'creative']
const SAMPLE_COLORS: Record<PresetPersona, string> = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
}

describe('SVG module registry', () => {
  it('contains all 26 modules (22 static PR2 + 4 interactive PR4)', () => {
    expect(SVG_MODULES.length).toBe(26)
  })

  it('has unique module ids and a registry of matching size', () => {
    const ids = SVG_MODULES.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.keys(SVG_MODULE_REGISTRY).length).toBe(SVG_MODULES.length)
  })

  it('family counts match the SPEC §8 taxonomy', () => {
    expect(getSvgModulesByFamily('header').length).toBe(4)
    expect(getSvgModulesByFamily('divider').length).toBe(5)
    expect(getSvgModulesByFamily('quote').length).toBe(4)
    expect(getSvgModulesByFamily('badge').length).toBe(3)
    expect(getSvgModulesByFamily('endmark').length).toBe(3)
    expect(getSvgModulesByFamily('cover').length).toBe(3)
    expect(getSvgModulesByFamily('interactive').length).toBe(4)
  })

  it('getSvgModule resolves by id', () => {
    for (const m of SVG_MODULES) {
      expect(getSvgModule(m.id)).toBe(m)
    }
    expect(getSvgModule('does-not-exist')).toBeUndefined()
  })

  it('every module × every persona renders WeChat-safe markup with sentinel + viewBox + width 100%', () => {
    for (const m of SVG_MODULES) {
      for (const persona of PERSONAS) {
        const theme = buildThemeContext({
          primaryColor: SAMPLE_COLORS[persona],
          persona,
          target: 'wechat',
        })
        const out = m.render({
          theme,
          text: '测试标题与正文内容用于跨族渲染验证',
          subtitle: 'InkForge · 墨铸',
          index: 2,
          items: [
            { title: '卡片一', body: '内容一' },
            { title: '卡片二', body: '内容二' },
          ],
        })
        const violations = checkWechatSafe(out)
        expect(violations, `${m.id}/${persona}: ${JSON.stringify(violations)}`).toEqual([])
        expect(out, `${m.id} sentinel`).toContain(`data-ink-svg="${m.id}"`)
        expect(out, `${m.id} viewBox`).toContain('viewBox')
        expect(out, `${m.id} responsive`).toContain('width="100%"')
        expect(out, `${m.id} no div`).not.toContain('<div')
      }
    }
  })
})
