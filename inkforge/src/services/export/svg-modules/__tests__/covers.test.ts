/**
 * covers.test.ts — cover-* 模块族（cover-title / cover-grid / cover-quote）
 *
 * 守护项：
 *  - 4 persona × 3 变体 = 12 组组合，全部通过 checkWechatSafe()（零违规 = AC9 执行体）。
 *  - 含 data-ink-svg / viewBox / width="100%" / <section> 包裹；绝不出现 <div>。
 *  - cover-grid 必含多 <rect>（网格细线）；cover-quote 必含 <path>（引号字形）+ 多 <text>。
 */
import { describe, it, expect } from 'vitest'
import { coverModules } from '../covers'
import { buildThemeContext } from '../theme'
import { checkWechatSafe } from '../wechat-safe'
import type { PresetPersona } from '@/types'

const primaryColors: Record<PresetPersona, string> = {
  academic: '#5a4a3c',
  business: '#004080',
  lifestyle: '#a0522d',
  creative: '#c0392b',
}

const personas: PresetPersona[] = ['academic', 'business', 'lifestyle', 'creative']

const SAMPLE_TEXT = '标题示例：成为作者吧'
const SAMPLE_SUBTITLE = '副标题 / 导语'

describe('coverModules registry', () => {
  it('exports exactly 3 cover variants with family="cover" and stable ids', () => {
    expect(coverModules).toHaveLength(3)
    const ids = coverModules.map((m) => m.id)
    expect(ids).toEqual(['cover-title', 'cover-grid', 'cover-quote'])
    for (const m of coverModules) {
      expect(m.family).toBe('cover')
      expect(typeof m.description).toBe('string')
      expect(typeof m.render).toBe('function')
    }
  })
})

describe('cover modules × persona — wechat-safe matrix', () => {
  for (const m of coverModules) {
    for (const persona of personas) {
      it(`${m.id} × ${persona} renders zero wechat-safe violations`, () => {
        const theme = buildThemeContext({
          primaryColor: primaryColors[persona],
          persona,
          target: 'wechat',
        })
        const out = m.render({ theme, text: SAMPLE_TEXT, subtitle: SAMPLE_SUBTITLE })

        // 零违规（AC9）
        expect(checkWechatSafe(out)).toEqual([])

        // 必要哨兵 / 自适应保证
        expect(out).toContain(`data-ink-svg="${m.id}"`)
        expect(out).toContain('viewBox="0 0 1080 620"')
        expect(out).toContain('width="100%"')
        expect(out).toContain('<section')

        // 绝不出现 <div>（微信会改写）
        expect(out).not.toContain('<div')
      })
    }
  }
})

describe('cover-title shape requirements', () => {
  const m = coverModules.find((c) => c.id === 'cover-title')!
  const theme = buildThemeContext({ primaryColor: primaryColors.business, persona: 'business', target: 'wechat' })
  const out = m.render({ theme, text: SAMPLE_TEXT, subtitle: SAMPLE_SUBTITLE })

  it('includes a full-bleed band header + accent tab + big-type title', () => {
    // 顶部满幅深色色带（accentDeep）+ 重 accent tab（粗短色块）
    expect(out).toContain(`fill="${theme.palette.accentDeep}"`)
    expect(out).toContain('width="96"') // accent tab 粗短色块
    // 品牌报头 nameplate：墨铸 + MOZHU PRESS · SERIAL
    expect(out).toContain('墨铸')
    expect(out).toContain('MOZHU PRESS · SERIAL')
    // 标题文本可见
    expect(out).toContain('标题')
    // 标题保持杂志感，但不再使用会在宽屏微信编辑器中过度放大的 100px 巨号字。
    expect(out).toContain('font-size="72"')
    expect(out).not.toContain('font-size="100"')
  })

  it('places a 篆刻方印 (seal with 墨/铸) at the corner + a double hairline rule', () => {
    // 方印两字（除报头「墨铸」外，方印竖排两字也出现 → 墨/铸 各 ≥2 次）
    expect((out.match(/墨/g) || []).length).toBeGreaterThanOrEqual(2)
    expect((out.match(/铸/g) || []).length).toBeGreaterThanOrEqual(2)
    // 方印内白描边（stroke=paper）
    expect(out).toContain(`stroke="${theme.palette.paper}"`)
    // 双细线规则：两条 hairline rect（fill=hairline）
    const hairlineRects = (out.match(new RegExp(`<rect [^>]*fill="${theme.palette.hairline.replace(/[()]/g, '\\$&')}"`, 'g')) || []).length
    expect(hairlineRects).toBeGreaterThanOrEqual(2)
  })
})

describe('cover-grid shape requirements', () => {
  const m = coverModules.find((c) => c.id === 'cover-grid')!
  const theme = buildThemeContext({ primaryColor: primaryColors.academic, persona: 'academic', target: 'wechat' })
  const out = m.render({ theme, text: SAMPLE_TEXT, subtitle: SAMPLE_SUBTITLE })

  it('is a full-bleed accentDeep solid cover with white grid residue', () => {
    // 整封面深 accent 实色底（accentDeep）
    expect(out).toContain(`fill="${theme.palette.accentDeep}"`)
    // 白色低透明网格残迹（opacity=0.1 的白线 rect）
    const rectCount = (out.match(/<rect /g) || []).length
    // bg(1) + 4 网格残迹 + kicker chip(1) + 白 tab(1) = 7。给宽松下限 6。
    expect(rectCount).toBeGreaterThanOrEqual(6)
    expect(out).toContain('opacity="0.1"')
  })

  it('contains a low-key white dot (circle) as grid intersection mark', () => {
    expect(out).toContain('<circle ')
  })

  it('contains a restrained, readable title', () => {
    expect(out).toContain('标题')
    expect(out).toContain('font-size="72"')
    expect(out).not.toContain('font-size="100"')
  })

  it('has a white nameplate header + white 方印 (墨/铸 ≥2 each) on the colored ground', () => {
    expect(out).toContain('墨铸')
    expect(out).toContain('MOZHU PRESS · SERIAL')
    // 白印：fill=paper 底 + accentDeep 印文（彩底白印）
    expect(out).toContain(`stroke="${theme.palette.accentDeep}"`)
    expect((out.match(/墨/g) || []).length).toBeGreaterThanOrEqual(2)
    expect((out.match(/铸/g) || []).length).toBeGreaterThanOrEqual(2)
  })
})

// ─── 长标题不溢出 viewBox 右内缘（真机微信实测发现的回归守护） ──────────────
// 背景：flagship-kiln 封面 17 字标题第一行排了 14 字溢出 viewBox 右边界被裁切。
// 根因：splitLines 的 maxCharsPerLine 硬编码（14），不随字号/可用宽度自适应。
// 修复后：每行字数 = floor(可用宽 / (字号 + 字距))，右缘 ≤ viewBox 右内缘。
describe('cover long-title viewBox overflow guard', () => {
  const theme = buildThemeContext({ primaryColor: primaryColors.creative, persona: 'creative', target: 'wechat' })
  const LONG_TITLE = '静谧刊印：当排版成为一种克制的力量' // 17 CJK 字符

  // 从一个 <text ...>内容</text> 节点抽取属性与内容文本
  const parseTexts = (svg: string): { x: number; fontSize: number; letterSpacing: number; chars: number }[] => {
    const out: { x: number; fontSize: number; letterSpacing: number; chars: number }[] = []
    const re = /<text ([^>]*)>([^<]*)<\/text>/g
    let mm: RegExpExecArray | null
    while ((mm = re.exec(svg)) !== null) {
      const attrStr = mm[1]
      const content = mm[2]
      const xm = /\bx="([\d.]+)"/.exec(attrStr)
      const fsm = /font-size="([\d.]+)"/.exec(attrStr)
      const lsm = /letter-spacing="([\d.]+)"/.exec(attrStr)
      // 仅收集封面标题节点（fontSize >= 70），跳过 subtitle/署名小字。
      const fontSize = fsm ? Number(fsm[1]) : 0
      if (fontSize < 70) continue
      out.push({
        x: xm ? Number(xm[1]) : 0,
        fontSize,
        letterSpacing: lsm ? Number(lsm[1]) : 0,
        chars: content.length,
      })
    }
    return out
  }

  it('cover-title: each title line fits ≤9 chars and right edge ≤ 1000 (no overflow)', () => {
    const m = coverModules.find((c) => c.id === 'cover-title')!
    const out = m.render({ theme, text: LONG_TITLE, subtitle: SAMPLE_SUBTITLE })
    const titles = parseTexts(out)
    expect(titles.length).toBeGreaterThanOrEqual(1)
    for (const t of titles) {
      // 可用宽仍充足，但视觉合同主动限制为每行最多 9 字，形成均衡两行。
      expect(t.chars).toBeLessThanOrEqual(9)
      // 估算右缘 = x + chars × (fontSize + letterSpacing) ≤ viewBox 右内缘（1080 − 80 = 1000）
      const rightEdge = t.x + t.chars * (t.fontSize + t.letterSpacing)
      expect(rightEdge).toBeLessThanOrEqual(1000)
    }
  })

  it('cover-grid: each title line fits ≤9 chars and right edge ≤ 1000 (no overflow)', () => {
    const m = coverModules.find((c) => c.id === 'cover-grid')!
    const out = m.render({ theme, text: LONG_TITLE, subtitle: SAMPLE_SUBTITLE })
    const titles = parseTexts(out)
    expect(titles.length).toBeGreaterThanOrEqual(1)
    for (const t of titles) {
      // 满幅封面使用同一可读字号合同，但保留独立网格构图。
      expect(t.chars).toBeLessThanOrEqual(9)
      // 估算右缘 = x + chars × (fontSize + letterSpacing) ≤ viewBox 右内缘（padX + innerW = 80 + 920 = 1000）
      const rightEdge = t.x + t.chars * (t.fontSize + t.letterSpacing)
      expect(rightEdge).toBeLessThanOrEqual(1000)
    }
  })

  it('cover-title / cover-grid: a 40-char title is still maxLines-truncated with … (ellipsis intact)', () => {
    const huge = '一二三四五六七八九十'.repeat(4) // 40 CJK 字符
    for (const id of ['cover-title', 'cover-grid'] as const) {
      const m = coverModules.find((c) => c.id === id)!
      const out = m.render({ theme, text: huge, subtitle: SAMPLE_SUBTITLE })
      // 标题被 maxLines(=2) 截断 → 含省略号
      expect(out).toContain('…')
      // 大字号标题节点至多 2 行（maxLines），不会无限扩行
      const titles = parseTexts(out)
      expect(titles.length).toBeLessThanOrEqual(2)
    }
  })
})

describe('cover-quote shape requirements', () => {
  const m = coverModules.find((c) => c.id === 'cover-quote')!
  const theme = buildThemeContext({ primaryColor: primaryColors.creative, persona: 'creative', target: 'wechat' })

  it('contains <path> (quotation glyph) and multiple <text> (导语 lines + attribution)', () => {
    const out = m.render({ theme, text: '在每一个安静的清晨我们都重新成为作者', subtitle: '鲁迅' })

    // <path> 来自引号字形（两片）
    expect(out).toContain('<path ')
    const pathCount = (out.match(/<path /g) || []).length
    expect(pathCount).toBeGreaterThanOrEqual(2)

    // 多 <text>：至少 2 行导语 + 1 行 attribution
    const textCount = (out.match(/<text /g) || []).length
    expect(textCount).toBeGreaterThanOrEqual(2)

    // 署名前缀
    expect(out).toContain('— 鲁迅')
  })

  it('splits long 导语 into ~16-char lines and tops out at 4 lines (… truncation)', () => {
    // 80 字 → 至多 4 行，必须含 '…'
    const longText = '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十' + '一二三四五六七八九十'
    const out = m.render({ theme, text: longText, subtitle: SAMPLE_SUBTITLE })
    const textCount = (out.match(/<text /g) || []).length
    // 至多 4 行 + 署名 = 5 个 <text>
    expect(textCount).toBeLessThanOrEqual(5)
    expect(out).toContain('…')
  })
})
