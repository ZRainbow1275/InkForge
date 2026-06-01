import { describe, it, expect } from 'vitest'
import { headerModules } from '../headers'
import { checkWechatSafe } from '../wechat-safe'
import { buildThemeContext } from '../theme'
import type { PresetPersona } from '@/types'

const PERSONAS: { persona: PresetPersona; primary: string }[] = [
  { persona: 'academic', primary: '#5a4a3c' },
  { persona: 'business', primary: '#004080' },
  { persona: 'lifestyle', primary: '#a0522d' },
  { persona: 'creative', primary: '#c0392b' },
]

const ALL_IDS = ['header-badge-num', 'header-bracket', 'header-ribbon', 'header-vrule']

describe('headerModules — registry shape', () => {
  it('exposes exactly the 4 SPEC §8 variants in family=header', () => {
    expect(headerModules.map((m) => m.id).sort()).toEqual([...ALL_IDS].sort())
    for (const m of headerModules) {
      expect(m.family).toBe('header')
      expect(typeof m.render).toBe('function')
      expect(m.description.length).toBeGreaterThan(0)
    }
  })
})

describe('headerModules — WeChat safe & scaffold across personas', () => {
  for (const mod of headerModules) {
    for (const { persona, primary } of PERSONAS) {
      it(`${mod.id} × ${persona} (#${primary}) is safe + has scaffold + no <div>`, () => {
        const theme = buildThemeContext({ primaryColor: primary, persona, target: 'wechat' })
        const out = mod.render({ theme, text: '示例标题 Sample', index: 1, subtitle: '副标题' })

        expect(checkWechatSafe(out)).toEqual([])
        expect(out).toContain(`data-ink-svg="${mod.id}"`)
        expect(out).toContain('viewBox')
        expect(out).toContain('width="100%"')
        expect(out).not.toContain('<div')
        // 标题文本应原样转义出现
        expect(out).toContain('示例标题 Sample')
      })
    }
  }
})

describe('header-badge-num — structure', () => {
  const mod = headerModules.find((m) => m.id === 'header-badge-num')!
  const theme = buildThemeContext({ primaryColor: '#004080', persona: 'business', target: 'wechat' })

  it('contains <circle> badge in accent + index number text + hairline rect', () => {
    const out = mod.render({ theme, text: '章节标题', index: 7 })
    expect(out).toContain('<circle ')
    expect(out).toContain(`fill="${theme.palette.accent}"`)
    // 编号文字
    expect(out).toContain('>7<')
    // hairline 是 1px rect
    expect(out).toContain('height="1"')
  })

  it('handles multi-digit indices without breaking safety', () => {
    const out = mod.render({ theme, text: '章节', index: 128 })
    expect(checkWechatSafe(out)).toEqual([])
    expect(out).toContain('>128<')
  })
})

describe('header-bracket — structure', () => {
  const mod = headerModules.find((m) => m.id === 'header-bracket')!
  const theme = buildThemeContext({ primaryColor: '#5a4a3c', persona: 'academic', target: 'wechat' })

  it('renders 4 corner <path> brackets in accent stroke + centered title', () => {
    const out = mod.render({ theme, text: '研究方法 Methods' })
    const pathCount = (out.match(/<path /g) || []).length
    expect(pathCount).toBe(4)
    expect(out).toContain(`stroke="${theme.palette.accent}"`)
    expect(out).toContain('text-anchor="middle"')
    expect(out).toContain('fill="none"')
  })
})

describe('header-ribbon — structure', () => {
  const mod = headerModules.find((m) => m.id === 'header-ribbon')!
  const theme = buildThemeContext({ primaryColor: '#c0392b', persona: 'creative', target: 'wechat' })

  it('contains a <rect> filled with accent + title in onAccent', () => {
    const out = mod.render({ theme, text: '专题 Feature' })
    expect(out).toContain('<rect ')
    expect(out).toContain(`fill="${theme.palette.accent}"`)
    // 标题文字色 = onAccent（深色 primary 对应白色）
    expect(out).toContain(`fill="${theme.palette.onAccent}"`)
    expect(out).toContain('text-anchor="middle"')
  })
})

describe('header-vrule — structure', () => {
  const mod = headerModules.find((m) => m.id === 'header-vrule')!
  const theme = buildThemeContext({ primaryColor: '#a0522d', persona: 'lifestyle', target: 'wechat' })

  it('renders left vertical accent bar (rect height > width) + title', () => {
    const out = mod.render({ theme, text: '今日所见', subtitle: '一段闲笔' })
    expect(out).toContain('<rect ')
    expect(out).toContain(`fill="${theme.palette.accent}"`)
    // 副题用 inkSoft（rgba 文本字段）— accept either via fill attr
    expect(out).toContain(theme.palette.inkSoft)
    expect(out).toContain('一段闲笔')
  })

  it('drops subtitle line when not provided and stays safe', () => {
    const out = mod.render({ theme, text: '今日所见' })
    expect(checkWechatSafe(out)).toEqual([])
    expect(out).not.toContain('副标题')
    // 仍然有竖条 + 标题
    expect(out).toContain('<rect ')
    expect(out).toContain('今日所见')
  })
})
