import { describe, it, expect } from 'vitest'
import {
  decorateFlagshipLede,
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

const LONG_PARA = '在内容爆炸的时代，读者的注意力比任何时候都更稀缺，排版正是那道隐形门槛。'

describe('decorateFlagshipLede — 首字下沉 versal 方印', () => {
  it('casts the first text char of the opening body paragraph into a versal block', () => {
    const dec = decorateFlagshipLede(kiln)
    const out = dec(`<p>${LONG_PARA}</p>`, 'wechat')
    expect(out).toContain('data-ink-block="flagship-lede"')
    // versal 用 accentDeep 实底 + 反白
    expect(out).toContain(`background-color:${kiln.accentDeep}`)
    expect(out).toContain('color:#ffffff')
    // 首字「在」被铸进 versal span，余下文本保留
    expect(out).toContain('>在</span>')
    expect(out).toContain('注意力')
    expectNoForbidden(out)
  })

  it('applies to ONLY the first qualifying paragraph (not the second)', () => {
    const dec = decorateFlagshipLede(tempera)
    const out = dec(`<p>${LONG_PARA}</p><p>${LONG_PARA}</p>`, 'wechat')
    expect((out.match(/data-ink-block="flagship-lede"/g) || []).length).toBe(1)
  })

  it('skips <p> inside a <blockquote> (picks the body paragraph after it)', () => {
    const dec = decorateFlagshipLede(tempera)
    const out = dec(`<blockquote><p>${LONG_PARA}</p></blockquote><p>${LONG_PARA}</p>`, 'wechat')
    expect((out.match(/data-ink-block="flagship-lede"/g) || []).length).toBe(1)
    // versal 不应落在 blockquote 区间内：blockquote 内文本仍完整无 versal span
    const bq = out.slice(out.indexOf('<blockquote'), out.indexOf('</blockquote>'))
    expect(bq).not.toContain('flagship-lede')
  })

  it('skips a 阅读 meta paragraph (reading-time / word-count)', () => {
    const dec = decorateFlagshipLede(amber)
    const meta = '<p>预计阅读 5 分钟 · 全文 1200 字 · 一篇关于排版克制力量的长文导引</p>'
    const out = dec(`${meta}<p>${LONG_PARA}</p>`, 'wechat')
    // versal 落在正文段而非 meta 段
    const metaPart = out.slice(0, out.indexOf('</p>') + 4)
    expect(metaPart).not.toContain('flagship-lede')
    expect(out).toContain('data-ink-block="flagship-lede"')
  })

  it('skips short paragraphs (< 24 chars)', () => {
    const dec = decorateFlagshipLede(kiln)
    const out = dec('<p>太短了。</p>', 'wechat')
    expect(out).not.toContain('flagship-lede')
  })

  it('preserves inner HTML (leading <strong> kept, first text char cast)', () => {
    const dec = decorateFlagshipLede(kiln)
    const out = dec(`<p><strong>真</strong>正高级的版面懂得在恰当之处大胆地留白以让文字呼吸。</p>`, 'wechat')
    expect(out).toContain('data-ink-block="flagship-lede"')
    // 前导 <strong> 标签保留，首个文本字符「真」被铸进 versal
    expect(out).toContain('<strong>')
    expect(out).toContain('>真</span>')
    expectNoForbidden(out)
  })

  it('is idempotent', () => {
    const dec = decorateFlagshipLede(tempera)
    const once = dec(`<p>${LONG_PARA}</p>`, 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
  })
})

describe('decorateFlagshipH2 — 构成主义满幅章节头（R3）', () => {
  it('kiln: full-bleed accentDeep block + grid cast-number svg + reverse-white title + rhythm baseline, idempotent', () => {
    const dec = decorateFlagshipH2(kiln, { variant: 'kiln' })
    const once = dec('<h2>第一节 标题</h2>', 'wechat')
    expect(once).toContain('data-ink-block="flagship-h2"')
    // 仍满幅深色实色块（accentDeep）—— 用户认可的「猛」
    expect(once).toContain(`background-color:${kiln.accentDeep}`)
    // 方格铸号 svg：白描边方框 + 右上套准小方 + 反白号
    expect(once).toContain('<svg')
    expect(once).toContain('viewBox="0 0 48 48"')
    expect(once).toContain('stroke="rgba(255,255,255,0.85)"')
    expect(once).toContain('<rect x="37" y="5" width="5" height="5" fill="#ffffff"')
    expect(once).toContain('>01</text>')
    // 反白标题
    expect(once).toContain('color:#ffffff')
    expect(once).toContain('第一节 标题')
    // 方格节奏基线：border-top 规则 + 3 个小方块（其中虚框 1 个）
    expect(once).toContain('border-top:1px solid rgba(255,255,255,0.32)')
    expect(once).toContain('background-color:transparent;border:1px solid rgba(255,255,255,0.7)')
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

  it('all 3 hues share the SAME constructivist form (only accentDeep differs)', () => {
    for (const [pal, variant] of [
      [tempera, 'tempera'],
      [amber, 'amber'],
    ] as const) {
      const out = dec2(pal, variant, '<h2>结构</h2>')
      expect(out).toContain(`background-color:${pal.accentDeep}`)
      // 统一方格铸号形态（不再有 PART / 白描边编号框差异）
      expect(out).toContain('viewBox="0 0 48 48"')
      expect(out).toContain('>01</text>')
      expect(out).not.toContain('PART')
      expect(out).not.toContain('border:2px solid rgba(255,255,255,0.55)')
      expectNoForbidden(out)
    }
  })

  it('counter resets per document call (no cross-call leak)', () => {
    const dec = decorateFlagshipH2(amber, { variant: 'amber' })
    const a = dec('<h2>甲</h2><h2>乙</h2>', 'wechat')
    expect(a).toContain('>01</text>')
    expect(a).toContain('>02</text>')
    const b = dec('<h2>丙</h2>', 'wechat')
    expect(b).toContain('>01</text>')
    expect(b).not.toContain('>02</text>')
  })
})

function dec2(pal: typeof kiln, variant: 'kiln' | 'tempera' | 'amber', html: string): string {
  return decorateFlagshipH2(pal, { variant })(html, 'wechat')
}

describe('decorateFlagshipH3 — 构成主义方格锚 + 底线（R3）', () => {
  it('grid anchor svg + ink title + bottom rule, idempotent, safe', () => {
    const dec = decorateFlagshipH3(tempera)
    const once = dec('<h3>小节标题</h3>', 'wechat')
    expect(once).toContain('data-ink-block="flagship-h3"')
    // 方格锚 svg（2×2 方格）
    expect(once).toContain('<svg')
    expect(once).toContain('viewBox="0 0 16 16"')
    expect(once).toContain(`stroke="${tempera.accent}"`)
    // 底线（accentBorder）
    expect(once).toContain(`border-bottom:1px solid ${tempera.accentBorder}`)
    // 不再有 R2 的左 5px 条 + 淡底 plate
    expect(once).not.toContain('border-left:5px solid')
    expect(once).toContain('小节标题')
    expect(once).not.toContain('<h3')
    expect(dec(once, 'wechat')).toBe(once)
    expectNoForbidden(once)
  })
})

describe('decorateFlagshipBlockquote', () => {
  it('plain quote → constructivist asymmetric block: 7px bar + diagonal corner svg + diamond terminal, preserves inner HTML', () => {
    const dec = decorateFlagshipBlockquote(tempera)
    const out = dec('<blockquote><p>真正高级的版面，懂得<strong>留白</strong>。</p></blockquote>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-quote"')
    // 左 7px accent 条
    expect(out).toContain(`border-left:7px solid ${tempera.accent}`)
    expect(out).toContain(`background-color:${tempera.accentTint}`)
    // 左上斜角实色三角 svg（path M0,0 L30,0 L0,30 Z + 内嵌白小方格）
    expect(out).toContain('viewBox="0 0 30 30"')
    expect(out).toContain('d="M0,0 L30,0 L0,30 Z"')
    expect(out).toContain(`fill="${tempera.paper}"`)
    // 菱形收尾 svg
    expect(out).toContain('viewBox="0 0 16 16"')
    expect(out).toContain('d="M8,2 L14,8 L8,14 L2,8 Z"')
    // 保留内部 HTML（不拍平）
    expect(out).toContain('<strong>留白</strong>')
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
  it('ul gets list-style none + accent diamond svg markers, idempotent, safe', () => {
    const dec = decorateFlagshipLists(tempera)
    const once = dec('<ul><li>甲项</li><li>乙项</li></ul>', 'wechat')
    expect(once).toContain('data-ink-block="flagship-ul"')
    expect(once).toContain('list-style:none')
    // R3：UL 标记改为内联 svg 实心菱形（弃旧的 background-color 小方）。
    expect(once).toContain('<svg')
    expect(once).toContain('viewBox="0 0 12 12"')
    expect(once).toContain('d="M6,1 L11,6 L6,11 L1,6 Z"')
    expect(once).toContain(`fill="${tempera.accent}"`)
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
    // R3：OL chip 从圆形改为方格铸号风方形（border-radius:3px）。
    expect(out).toContain('border-radius:3px')
    // 第二个 ol 编号从 1 重置
    const chipMatches = out.match(/>1</g) ?? []
    expect(chipMatches.length).toBeGreaterThanOrEqual(2)
    expectNoForbidden(out)
  })
})

describe('decorateFlagshipFooterCard', () => {
  const opts = { brand: '墨铸 · InkForge', tagline: '成为作者吧' }

  it('appends a centered colophon card: vessel mark + brand + tagline + double rule + 全文完 + seal', () => {
    const dec = decorateFlagshipFooterCard(tempera, opts)
    const out = dec('<p>正文。</p>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-footer"')
    expect(out).toContain('墨铸 · InkForge')
    expect(out).toContain('成为作者吧')
    expect(out).toContain('全文完')
    // vessel mark SVG（含 viewBox）
    expect(out).toContain('<svg')
    expect(out).toContain('viewBox')
    // 双细线：两条 accent 线段（一条实色 + 一条 opacity:0.5）
    expect(out).toContain('opacity:0.5')
    // 文末方印（墨/铸 两字，accentDeep 底 + 白印文）
    expect(out).toContain('墨')
    expect(out).toContain('铸')
    expect(out).toContain(`fill="${tempera.accentDeep}"`)
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
