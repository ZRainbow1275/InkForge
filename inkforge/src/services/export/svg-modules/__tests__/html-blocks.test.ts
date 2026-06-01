import { describe, it, expect } from 'vitest'
import {
  decorateFlagshipH2,
  decorateFlagshipH3,
  decorateFlagshipBlockquote,
  decorateFlagshipLists,
  decorateFlagshipFooterCard,
} from '../html-blocks'
import { deriveSvgPalette } from '../theme'

const kiln = deriveSvgPalette('#D95B3F', 'creative')
const tempera = deriveSvgPalette('#3B7A6B', 'academic')
const amber = deriveSvgPalette('#C19A56', 'business')

/** 通用「无禁用构造」断言：内联色块装饰输出绝不含微信会剥/不安全的写法或 emoji。 */
function expectNoForbidden(out: string): void {
  expect(out).not.toMatch(/\sclass\s*=/i)
  expect(out).not.toContain('<div')
  expect(out).not.toMatch(/linear-gradient|radial-gradient/i)
  expect(out).not.toMatch(/url\(\s*#/i)
  expect(out).not.toMatch(/<defs[\s>]/i)
  expect(out).not.toMatch(/style\s*=\s*"[^"]*transform\s*:/i)
  expect(out).not.toMatch(/var\(\s*--/i)
  expect(out).not.toMatch(/calc\(/i)
  // emoji（基本面外象形/符号区段）—— 应一律为 lucide/SVG/几何标点
  expect(out).not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/u)
}

describe('decorateFlagshipH2', () => {
  it('kiln: solid filled bar with onAccent text, idempotent', () => {
    const dec = decorateFlagshipH2(kiln, { variant: 'kiln' })
    const once = dec('<h2>第一节 标题</h2>', 'wechat')
    expect(once).toContain('data-ink-block="flagship-h2"')
    expect(once).toContain(`background-color:${kiln.accent}`)
    expect(once).toContain(`color:${kiln.onAccent}`)
    expect(once).toContain('第一节 标题')
    expect(once).not.toContain('<h2')
    // 幂等：二跑 == 一跑
    expect(dec(once, 'wechat')).toBe(once)
    expectNoForbidden(once)
  })

  it('runs for preview as well as wechat (WYSIWYG inline HTML)', () => {
    const dec = decorateFlagshipH2(tempera, { variant: 'tempera' })
    const prev = dec('<h2>标题</h2>', 'preview')
    expect(prev).toContain('data-ink-block="flagship-h2"')
  })

  it('tempera: number chip + accent bottom rule', () => {
    const dec = decorateFlagshipH2(tempera, { variant: 'tempera' })
    const out = dec('<h2>第一节</h2><h2>第二节</h2>', 'wechat')
    expect(out).toContain('>01<')
    expect(out).toContain('>02<')
    expect(out).toContain(`border-bottom:2px solid ${tempera.accent}`)
    expectNoForbidden(out)
  })

  it('amber: left bar + uppercase PART kicker', () => {
    const dec = decorateFlagshipH2(amber, { variant: 'amber' })
    const out = dec('<h2>结构</h2>', 'wechat')
    expect(out).toContain(`border-left:5px solid ${amber.accent}`)
    expect(out).toContain('PART 01')
    expectNoForbidden(out)
  })

  it('counter resets per document call (no cross-call leak)', () => {
    const dec = decorateFlagshipH2(amber, { variant: 'amber' })
    const a = dec('<h2>甲</h2><h2>乙</h2>', 'wechat')
    expect(a).toContain('PART 01')
    expect(a).toContain('PART 02')
    const b = dec('<h2>丙</h2>', 'wechat')
    expect(b).toContain('PART 01')
    expect(b).not.toContain('PART 02')
  })
})

describe('decorateFlagshipH3', () => {
  it('left accent bar + ink title, idempotent, safe', () => {
    const dec = decorateFlagshipH3(tempera)
    const once = dec('<h3>小节标题</h3>', 'wechat')
    expect(once).toContain('data-ink-block="flagship-h3"')
    expect(once).toContain(`border-left:3px solid ${tempera.accent}`)
    expect(once).toContain('小节标题')
    expect(once).not.toContain('<h3')
    expect(dec(once, 'wechat')).toBe(once)
    expectNoForbidden(once)
  })
})

describe('decorateFlagshipBlockquote', () => {
  it('plain quote → quote card with decorative svg mark + tint, preserves inner HTML', () => {
    const dec = decorateFlagshipBlockquote(tempera)
    const out = dec('<blockquote><p>真正高级的版面，懂得<strong>留白</strong>。</p></blockquote>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-quote"')
    expect(out).toContain(`border-left:4px solid ${tempera.accent}`)
    expect(out).toContain(`background-color:${tempera.accentTint}`)
    // 保留内部 HTML（不拍平）
    expect(out).toContain('<strong>留白</strong>')
    // 含装饰引号 SVG path
    expect(out).toContain('<svg')
    expect(out).not.toContain('<blockquote')
    expectNoForbidden(out)
  })

  it('callout branch: 提示 → note box with octicon icon + label', () => {
    const dec = decorateFlagshipBlockquote(tempera)
    const out = dec('<blockquote><p>提示：导出前先在真机预览确认版心。</p></blockquote>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-callout"')
    expect(out).toContain('<svg')
    expect(out).toContain('提示')
    // 正文保留，但首行关键词前缀已去重（不出现「提示提示」）
    expect(out).not.toMatch(/提示[：:]?\s*提示/)
    expectNoForbidden(out)
  })

  it('callout branch: 警告 → maps to ember (warning) color', () => {
    const dec = decorateFlagshipBlockquote(amber)
    const out = dec('<blockquote><p>警告：微信会剥离 class。</p></blockquote>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-callout"')
    expect(out).toContain(amber.ember)
    expectNoForbidden(out)
  })

  it('quote card extracts trailing attribution line', () => {
    const dec = decorateFlagshipBlockquote(kiln)
    const out = dec('<blockquote><p>删繁就简三秋树。</p><p>—— 郑板桥</p></blockquote>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-quote"')
    expect(out).toContain('郑板桥')
    expect(out).toContain('text-align:right')
    expectNoForbidden(out)
  })

  it('idempotent', () => {
    const dec = decorateFlagshipBlockquote(tempera)
    const once = dec('<blockquote><p>引文。</p></blockquote>', 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
  })
})

describe('decorateFlagshipLists', () => {
  it('ul gets list-style none + accent square markers, idempotent, safe', () => {
    const dec = decorateFlagshipLists(tempera)
    const once = dec('<ul><li>甲项</li><li>乙项</li></ul>', 'wechat')
    expect(once).toContain('data-ink-block="flagship-ul"')
    expect(once).toContain('list-style:none')
    expect(once).toContain(`background-color:${tempera.accent}`)
    expect(once).toContain('甲项')
    expect(once).toContain('乙项')
    expect(dec(once, 'wechat')).toBe(once)
    expectNoForbidden(once)
  })

  it('ol gets brand number chips, counter resets per ol', () => {
    const dec = decorateFlagshipLists(amber)
    const out = dec('<ol><li>一</li><li>二</li></ol><ol><li>甲</li></ol>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-ol"')
    expect(out).toContain('>1<')
    expect(out).toContain('>2<')
    expect(out).toContain('border-radius:50%')
    // 第二个 ol 编号从 1 重置
    const chipMatches = out.match(/>1</g) ?? []
    expect(chipMatches.length).toBeGreaterThanOrEqual(2)
    expectNoForbidden(out)
  })
})

describe('decorateFlagshipFooterCard', () => {
  const opts = { brand: '墨铸 · InkForge', tagline: '成为作者吧' }

  it('appends a centered footer card with vessel mark + brand + tagline + 全文完', () => {
    const dec = decorateFlagshipFooterCard(tempera, opts)
    const out = dec('<p>正文。</p>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-footer"')
    expect(out).toContain('墨铸 · InkForge')
    expect(out).toContain('成为作者吧')
    expect(out).toContain('全文完')
    // vessel mark SVG（含 viewBox）
    expect(out).toContain('<svg')
    expect(out).toContain('viewBox')
    expectNoForbidden(out)
  })

  it('appended only once (idempotent)', () => {
    const dec = decorateFlagshipFooterCard(kiln, opts)
    const once = dec('<p>正文。</p>', 'wechat')
    const twice = dec(once, 'wechat')
    expect(twice).toBe(once)
    // 卡片只出现一次
    expect(once.match(/data-ink-block="flagship-footer"/g)?.length).toBe(1)
  })
})
