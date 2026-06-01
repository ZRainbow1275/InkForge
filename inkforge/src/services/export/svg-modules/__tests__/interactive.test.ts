import { describe, it, expect } from 'vitest'
import { interactiveModules } from '../interactive'
import { buildThemeContext } from '../theme'
import { checkWechatSafe } from '../wechat-safe'
import type { PresetPersona } from '@/types'

// persona → 品牌色板（同步 prompts/0601 旗舰预设思路；每 persona 一个代表色）
const primaryColors: Record<PresetPersona, string> = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
}
const personas = Object.keys(primaryColors) as PresetPersona[]

// 两个目标：wechat 允许动效（SMIL），xhs 栅格化取静态首帧
const motionTargets = [
  { target: 'wechat' as const, allowMotion: true },
  { target: 'xhs' as const, allowMotion: false },
]

const sampleParams = (theme: ReturnType<typeof buildThemeContext>) => ({
  theme,
  text: '交互标题',
  items: [
    { title: '卡片A', body: '内容A' },
    { title: '卡片B', body: '内容B' },
    { title: '卡片C', body: '内容C' },
  ],
  index: 1,
})

describe('interactiveModules — registry shape', () => {
  it('exports exactly 4 interactive variants with the expected ids', () => {
    expect(interactiveModules).toHaveLength(4)
    const ids = interactiveModules.map((m) => m.id).sort()
    expect(ids).toEqual(['i-clickswitch', 'i-fadein', 'i-scrollcards', 'i-sequence'])
    for (const m of interactiveModules) {
      expect(m.family).toBe('interactive')
      expect(m.interactive).toBe(true)
      expect(typeof m.render).toBe('function')
      expect(m.description.length).toBeGreaterThan(0)
    }
  })
})

describe('interactiveModules — wechat-safe + scaffolding across modules × personas × targets', () => {
  for (const m of interactiveModules) {
    for (const persona of personas) {
      for (const { target } of motionTargets) {
        it(`${m.id} / ${persona} / ${target}: zero violations + scaffolding contract`, () => {
          const theme = buildThemeContext({
            primaryColor: primaryColors[persona],
            persona,
            target,
          })
          const out = m.render(sampleParams(theme))

          expect(checkWechatSafe(out)).toEqual([])
          expect(out).toContain('data-ink-svg')
          expect(out).toContain('viewBox')
          expect(out).toContain('width="100%"')
          expect(out).not.toContain('<div')
        })
      }
    }
  }
})

describe('interactiveModules — SMIL vs static-frame fallback', () => {
  const smilModuleIds = ['i-clickswitch', 'i-fadein', 'i-sequence']

  for (const id of smilModuleIds) {
    const mod = interactiveModules.find((m) => m.id === id)!

    it(`${id}: wechat(allowMotion) emits SMIL with freeze/never + valid begin`, () => {
      const theme = buildThemeContext({
        primaryColor: primaryColors.creative,
        persona: 'creative',
        target: 'wechat',
      })
      const out = mod.render(sampleParams(theme))
      // 含 SMIL 元素
      expect(out).toMatch(/<animate|<set/)
      // 合法触发器：begin="click" 或 begin="0s"
      expect(out).toMatch(/begin="(click|0s)"/)
      // 点击/序列动画必须 fill="freeze" restart="never" 才能「定住」
      expect(out).toContain('restart="never"')
    })

    it(`${id}: xhs(static) emits NO SMIL (fully-visible first frame)`, () => {
      const theme = buildThemeContext({
        primaryColor: primaryColors.creative,
        persona: 'creative',
        target: 'xhs',
      })
      const out = mod.render(sampleParams(theme))
      expect(out).not.toContain('<animate')
      expect(out).not.toContain('<set')
    })
  }
})

describe('i-scrollcards — pure CSS scroll-snap (no flex, no SMIL)', () => {
  const mod = interactiveModules.find((m) => m.id === 'i-scrollcards')!

  for (const { target } of motionTargets) {
    it(`${target}: never uses display:flex and always has scroll-snap`, () => {
      const theme = buildThemeContext({
        primaryColor: primaryColors.business,
        persona: 'business',
        target,
      })
      const out = mod.render(sampleParams(theme))
      expect(out).not.toContain('display:flex')
      expect(out).toContain('scroll-snap')
      // 横滑轨与每卡都不能是 <div>
      expect(out).not.toContain('<div')
      // 每张卡都有独立 inline svg（width="100%" + viewBox）
      expect(out).toContain('width="100%"')
      expect(out).toContain('viewBox')
    })
  }

  it('renders default sample cards when items is empty (still safe)', () => {
    const theme = buildThemeContext({
      primaryColor: primaryColors.lifestyle,
      persona: 'lifestyle',
      target: 'wechat',
    })
    const out = mod.render({ theme })
    expect(checkWechatSafe(out)).toEqual([])
    expect(out).toContain('data-ink-svg="i-scrollcards"')
    // 同构：scrollcards 永不含 SMIL（纯 CSS 滑动）
    expect(out).not.toContain('<animate')
    expect(out).not.toContain('<set')
  })
})

describe('i-clickswitch — frame A/B from items titles', () => {
  const mod = interactiveModules.find((m) => m.id === 'i-clickswitch')!

  it('wechat: builds both frame A and frame B layers + transparent hot-zone', () => {
    const theme = buildThemeContext({
      primaryColor: primaryColors.academic,
      persona: 'academic',
      target: 'wechat',
    })
    const out = mod.render({
      theme,
      items: [{ title: '正面' }, { title: '反面' }],
    })
    expect(out).toContain('正面')
    expect(out).toContain('反面')
    // 透明热区接收点击
    expect(out).toContain('fill="transparent"')
    expect(out).toContain('pointer-events="visible"')
    // 两个 begin="click" SMIL（A 淡出、B 淡入）
    const clickCount = (out.match(/begin="click"/g) ?? []).length
    expect(clickCount).toBeGreaterThanOrEqual(2)
  })

  it('xhs: shows frame A only (no frame B / no SMIL)', () => {
    const theme = buildThemeContext({
      primaryColor: primaryColors.academic,
      persona: 'academic',
      target: 'xhs',
    })
    const out = mod.render({
      theme,
      items: [{ title: '正面' }, { title: '反面' }],
    })
    expect(out).toContain('正面')
    expect(out).not.toContain('反面')
    expect(out).not.toContain('<animate')
    expect(out).not.toContain('<set')
  })
})
