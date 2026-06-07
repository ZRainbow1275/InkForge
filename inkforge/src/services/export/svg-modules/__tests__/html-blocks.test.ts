import { describe, it, expect } from 'vitest'
import {
  decorateFlagshipLede,
  decorateFlagshipH2,
  decorateFlagshipH3,
  decorateFlagshipBlockquote,
  decorateFlagshipLists,
  decorateFlagshipFooterCard,
  decorateFlagshipReadingBar,
  decorateFlagshipTOC,
  decorateFlagshipStat,
  decorateFlagshipFigure,
  decorateFlagshipBanner,
  decorateFlagshipCompare,
  decorateFlagshipTimeline,
  decorateFlagshipGallery,
  decorateFlagshipCitation,
  decorateFlagshipStretch,
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

// ════════════════════════════════════════════════════════════════════════
// R4 — 5 个 aha 元素：阅读条 / 目录 / 金句 / 数据 / 图片框
// ════════════════════════════════════════════════════════════════════════

const READING_HEADER = `<div style="margin:0 0 24px;padding:0 0 14px;border-bottom:1px solid #E8EAED;color:#8E959D;font-size:13px;letter-spacing:0.2px;line-height:1.6;">
  <span>阅读约 5 分钟</span><span aria-hidden="true" style="display:inline-block;width:3px;height:3px;border-radius:50%;background:#C7CDD3;vertical-align:middle;margin:0 10px;"></span><span>全文 1200 字</span>
</div>`

describe('decorateFlagshipReadingBar — E1 品牌阅读条', () => {
  it('replaces the bare reading-time header with a branded reading bar (字数 + 分钟 + persona栏目 + sep + 第 01 期)', () => {
    const dec = decorateFlagshipReadingBar(tempera, { variant: 'tempera' })
    const out = dec(`${READING_HEADER}<p>正文段落。</p>`, 'wechat')
    expect(out).toContain('data-ink-block="flagship-readbar"')
    // 提取的字数 / 分钟
    expect(out).toContain('全文 1200 字')
    expect(out).toContain('约 5 分钟')
    // persona 栏目 (tempera → 深读)
    expect(out).toContain('墨铸 · 深读')
    // 第 01 期占位
    expect(out).toContain('第 01 期')
    // 上下细线（accentBorder）
    expect(out).toContain(`border-top:1px solid ${tempera.accentBorder}`)
    expect(out).toContain(`border-bottom:1px solid ${tempera.accentBorder}`)
    // 菱形分隔符 svg
    expect(out).toContain('viewBox="0 0 12 12"')
    expect(out).toContain('d="M6,1 L11,6 L6,11 L1,6 Z"')
    // 原裸阅读头 <div> 已被替换
    expect(out).not.toContain('color:#8E959D')
    expectNoForbidden(out)
  })

  it('kiln variant uses 专栏 kicker, amber uses 洞察', () => {
    const kilnOut = decorateFlagshipReadingBar(kiln, { variant: 'kiln' })(READING_HEADER, 'wechat')
    expect(kilnOut).toContain('墨铸 · 专栏')
    const amberOut = decorateFlagshipReadingBar(amber, { variant: 'amber' })(READING_HEADER, 'wechat')
    expect(amberOut).toContain('墨铸 · 洞察')
  })

  it('returns unchanged HTML when reading header is absent (enableReadingTime=false)', () => {
    const dec = decorateFlagshipReadingBar(tempera, { variant: 'tempera' })
    const input = '<p>没有阅读头的正文。</p>'
    expect(dec(input, 'wechat')).toBe(input)
  })

  it('is idempotent', () => {
    const dec = decorateFlagshipReadingBar(kiln, { variant: 'kiln' })
    const once = dec(`${READING_HEADER}<p>正文。</p>`, 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
  })
})

describe('decorateFlagshipTOC — E2 篇目目录', () => {
  it('generates a TOC card listing all <h2> titles in order with grid-numbered rows', () => {
    const dec = decorateFlagshipTOC(tempera)
    const out = dec('<h2>第一节 标题</h2><p>...</p><h2>第二节 标题</h2><p>...</p>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-toc"')
    expect(out).toContain('本 期 目 录')
    expect(out).toContain('第一节 标题')
    expect(out).toContain('第二节 标题')
    // 方格小号（accent 底色版）
    expect(out).toContain('viewBox="0 0 48 48"')
    expect(out).toContain('>01</text>')
    expect(out).toContain('>02</text>')
    expectNoForbidden(out)
  })

  it('does NOT generate when there is only ≤1 <h2>', () => {
    const dec = decorateFlagshipTOC(amber)
    const out0 = dec('<h1>只一个</h1><p>...</p>', 'wechat')
    expect(out0).not.toContain('flagship-toc')
    const out1 = dec('<h2>唯一一节</h2><p>...</p>', 'wechat')
    expect(out1).not.toContain('flagship-toc')
  })

  it('inserts after a cover SVG section (data-ink-svg="cover-*")', () => {
    const dec = decorateFlagshipTOC(tempera)
    const cover = '<section data-ink-svg="cover-title" style="margin:24px 0;"><svg viewBox="0 0 1080 620" width="100%"><rect width="1080" height="620" fill="#fff"/></svg></section>'
    const out = dec(`${cover}<h2>A</h2><p>x</p><h2>B</h2>`, 'wechat')
    // TOC 卡应在 cover 关闭后立刻出现，且在第一个 <h2> 之前
    const tocSecIdx = out.indexOf('<section data-ink-block="flagship-toc"')
    const coverEndIdx = out.indexOf('</section>') + '</section>'.length
    const firstH2Idx = out.indexOf('<h2')
    expect(tocSecIdx).toBeGreaterThan(0)
    expect(tocSecIdx).toBe(coverEndIdx)
    expect(tocSecIdx).toBeLessThan(firstH2Idx)
  })

  it('inserts after the reading bar when present', () => {
    const dec = decorateFlagshipTOC(kiln)
    const readbar = '<section data-ink-block="flagship-readbar"><p>...</p></section>'
    const out = dec(`${readbar}<h2>A</h2><h2>B</h2>`, 'wechat')
    const tocSecIdx = out.indexOf('<section data-ink-block="flagship-toc"')
    const readbarEnd = out.indexOf('</section>', out.indexOf('flagship-readbar')) + '</section>'.length
    expect(tocSecIdx).toBe(readbarEnd)
  })

  it('is idempotent', () => {
    const dec = decorateFlagshipTOC(tempera)
    const once = dec('<h2>甲</h2><h2>乙</h2>', 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
  })
})

describe('decorateFlagshipBlockquote — E3 金句大字卡（PULLQUOTE 分支）', () => {
  it('marker `金句：…` produces a centered feature card with big decorative quote svg + ink large text + 墨铸 + diamond', () => {
    const dec = decorateFlagshipBlockquote(kiln)
    const out = dec('<blockquote><p>金句：克制是版面的最高修辞。</p></blockquote>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-pullquote"')
    // 满幅大字 feature 卡：paperWarm 底 + 居中
    expect(out).toContain(`background-color:${kiln.paperWarm}`)
    expect(out).toContain('text-align:center')
    // 22px 居中正文
    expect(out).toContain('font-size:22px')
    // 大装饰引号 svg（pullquoteGlyphSvg）
    expect(out).toContain('viewBox="0 0 64 64"')
    // 「墨铸」品牌签名 + 收尾菱形 svg
    expect(out).toContain('墨铸')
    expect(out).toContain('d="M8,2 L14,8 L8,14 L2,8 Z"')
    // 「金句：」前缀已被去掉，正文仍在
    expect(out).toContain('克制是版面的最高修辞。')
    expect(out).not.toMatch(/金句\s*[:：]/)
    expectNoForbidden(out)
  })

  it('triggers on `[金句]` and `金句` (no colon) variants', () => {
    const dec = decorateFlagshipBlockquote(amber)
    const outA = dec('<blockquote><p>[金句]删繁就简三秋树。</p></blockquote>', 'wechat')
    expect(outA).toContain('data-ink-block="flagship-pullquote"')
    const outB = dec('<blockquote><p>金句 让笔画呼吸</p></blockquote>', 'wechat')
    expect(outB).toContain('data-ink-block="flagship-pullquote"')
  })

  it('preserves CALLOUT branch (提示) — pullquote and callout do NOT collide', () => {
    const dec = decorateFlagshipBlockquote(tempera)
    const out = dec('<blockquote><p>提示：导出前先在真机预览。</p></blockquote>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-callout"')
    expect(out).not.toContain('flagship-pullquote')
  })

  it('preserves plain QUOTE branch (R3 asymmetric block)', () => {
    const dec = decorateFlagshipBlockquote(tempera)
    const out = dec('<blockquote><p>真正高级的版面，懂得<strong>留白</strong>。</p></blockquote>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-quote"')
    expect(out).not.toContain('flagship-pullquote')
  })

  it('pullquote is idempotent', () => {
    const dec = decorateFlagshipBlockquote(kiln)
    const once = dec('<blockquote><p>金句：呼吸即设计。</p></blockquote>', 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
  })
})

describe('decorateFlagshipStat — E4 数据大数字块', () => {
  it('marker `<p>[数据] 大数字 | 标签 | 描述</p>` → grid-framed big-number stat block', () => {
    const dec = decorateFlagshipStat(amber)
    const out = dec('<p>[数据] 20-22 | 汉字/行 | 移动端竖屏舒适区间</p>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-stat"')
    // 大数字 accent 实色（≠ accentDeep 反白；区别于 H2 满幅块）
    expect(out).toContain(`color:${amber.accent}`)
    expect(out).toContain('font-size:40px')
    expect(out).toContain('20-22')
    expect(out).toContain('汉字/行')
    expect(out).toContain('移动端竖屏舒适区间')
    // 方格铸框：accentBorder 描边 + accentTint 底
    expect(out).toContain(`border:1px solid ${amber.accentBorder}`)
    expect(out).toContain(`background-color:${amber.accentTint}`)
    // 收尾菱形
    expect(out).toContain('d="M8,2 L14,8 L8,14 L2,8 Z"')
    expectNoForbidden(out)
  })

  it('marker with 2 segments (no description) still works', () => {
    const dec = decorateFlagshipStat(kiln)
    const out = dec('<p>[数据] 374 | 像素</p>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-stat"')
    expect(out).toContain('374')
    expect(out).toContain('像素')
  })

  it('non-marker `<p>` paragraphs are untouched', () => {
    const dec = decorateFlagshipStat(tempera)
    const input = '<p>普通的正文段落不含 marker。</p>'
    expect(dec(input, 'wechat')).toBe(input)
  })

  it('is idempotent', () => {
    const dec = decorateFlagshipStat(amber)
    const once = dec('<p>[数据] 22 | 字/行</p>', 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
  })
})

describe('decorateFlagshipFigure — E5 品牌图框', () => {
  it('wraps a <p><img></p> figure in a paperWarm bordered frame with alt caption row containing grid svg', () => {
    const dec = decorateFlagshipFigure(tempera)
    const out = dec('<p><img src="https://example.com/x.png" alt="示意图：版心宽度示例"></p>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-figure"')
    // 恰好包裹 1 次（杜绝双重包裹 bug）
    expect((out.match(/data-ink-block="flagship-figure"/g) || []).length).toBe(1)
    // 题注 caption span 仅出现 1 次（alt 文本作为 caption 内容；alt 属性自身不算）
    expect((out.match(/<span[^>]*vertical-align:middle;">示意图：版心宽度示例<\/span>/g) || []).length).toBe(1)
    // paperWarm 衬纸 + hairline 边
    expect(out).toContain(`background-color:${tempera.paperWarm}`)
    expect(out).toContain(`border:1px solid ${tempera.hairline}`)
    // img 补 style
    expect(out).toContain('display:block;width:100%')
    // src / alt 保留
    expect(out).toContain('src="https://example.com/x.png"')
    expect(out).toContain('alt="示意图：版心宽度示例"')
    // 题注行（含 alt 文本 + 小方格 svg）
    expect(out).toContain('viewBox="0 0 16 16"')
    // img 标签合法：恰好一个 style="…"（无重复 style 属性 / 残缺自闭合）
    const imgMatch = /<img\b[^>]*>/i.exec(out)
    expect(imgMatch).toBeTruthy()
    if (imgMatch) {
      const imgTag = imgMatch[0]
      expect((imgTag.match(/\sstyle\s*=/g) || []).length).toBe(1)
      // 正确自闭合（无 ` /` 后再跟下一个属性）
      expect(imgTag).not.toMatch(/\/\s+\w/)
      // 旧版残留：原 imgAttrs 里的 height/原 style 不该再出现
      expect(imgTag).not.toMatch(/\sheight\s*=/i)
      expect(imgTag).not.toMatch(/max-width\s*:\s*100%/i)
    }
    expectNoForbidden(out)
  })

  it('wraps a bare <img> (no <p>) too — exactly once', () => {
    const dec = decorateFlagshipFigure(kiln)
    const out = dec('<img src="https://x.png" alt="x">', 'wechat')
    expect(out).toContain('data-ink-block="flagship-figure"')
    expect((out.match(/data-ink-block="flagship-figure"/g) || []).length).toBe(1)
    expect(out).toContain('alt="x"')
    expect(out).toContain('src="https://x.png"')
    // img 也只有 1 个 style
    const imgMatch = /<img\b[^>]*>/i.exec(out)
    expect(imgMatch).toBeTruthy()
    if (imgMatch) {
      expect((imgMatch[0].match(/\sstyle\s*=/g) || []).length).toBe(1)
    }
  })

  it('img without alt: no caption row', () => {
    const dec = decorateFlagshipFigure(amber)
    const out = dec('<p><img src="x.png"></p>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-figure"')
    // 无 alt → 无题注 <p>
    expect(out).not.toMatch(/<p[^>]*font-size:13px[^>]*>[^<]*</)
  })

  it('strips dirty pre-existing attrs (style/height) — single clean style on img', () => {
    const dec = decorateFlagshipFigure(tempera)
    // 模拟 enhanceImageWrappers 已写入 style/height 的真实输入
    const dirty = '<p><img src="a.png" alt="A" style="max-width:100%;height:auto;margin:18px 0;" height="auto"></p>'
    const out = dec(dirty, 'wechat')
    const imgMatch = /<img\b[^>]*>/i.exec(out)
    expect(imgMatch).toBeTruthy()
    if (imgMatch) {
      const imgTag = imgMatch[0]
      expect((imgTag.match(/\sstyle\s*=/g) || []).length).toBe(1)
      expect(imgTag).not.toMatch(/\sheight\s*=/i)
      expect(imgTag).not.toMatch(/max-width\s*:\s*100%/i)
      expect(imgTag).toContain('display:block;width:100%')
    }
  })

  it('returns unchanged HTML when there is no <img>', () => {
    const dec = decorateFlagshipFigure(tempera)
    const input = '<p>没有图片。</p>'
    expect(dec(input, 'wechat')).toBe(input)
  })

  it('is idempotent', () => {
    const dec = decorateFlagshipFigure(amber)
    const once = dec('<p><img src="a.png" alt="A"></p>', 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
    // 二跑不应产出第二层 figure
    expect((once.match(/data-ink-block="flagship-figure"/g) || []).length).toBe(1)
  })
})

// ════════════════════════════════════════════════════════════════════════
// R5 — 6 marker 元素：横幅 / 对比 / 时间线 / 相册 / 出处 / 折叠
// ════════════════════════════════════════════════════════════════════════

describe('decorateFlagshipBanner — B1 强调横幅', () => {
  it('marker `[横幅] 文字` → full-bleed accentDeep banner with centered white diamond + bold white text', () => {
    const dec = decorateFlagshipBanner(kiln)
    const out = dec('<p>[横幅] 工具的终点，是让创作回到表达本身。</p>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-banner"')
    expect(out).toContain(`background-color:${kiln.accentDeep}`)
    expect(out).toContain('text-align:center')
    expect(out).toContain('color:#ffffff')
    expect(out).toContain('font-size:21px')
    expect(out).toContain('工具的终点，是让创作回到表达本身。')
    // 白菱形 svg
    expect(out).toContain('<svg')
    expect(out).toContain('d="M8,2 L14,8 L8,14 L2,8 Z"')
    expect(out).toContain('fill="#ffffff"')
    expectNoForbidden(out)
  })

  it('non-marker `<p>` is untouched', () => {
    const dec = decorateFlagshipBanner(tempera)
    const input = '<p>普通段落。</p>'
    expect(dec(input, 'wechat')).toBe(input)
  })

  it('strips inline HTML from marker content (firstText flattens then escapeHtmlText)', () => {
    const dec = decorateFlagshipBanner(amber)
    const out = dec('<p>[横幅] <strong>不被信任</strong> 与正文</p>', 'wechat')
    // marker content 走 firstText 拍平 → 不应保留 <strong> 标签也不应有字面 &lt;strong&gt;
    const bannerIdx = out.indexOf('data-ink-block="flagship-banner"')
    expect(bannerIdx).toBeGreaterThan(0)
    const banner = out.slice(bannerIdx)
    expect(banner).not.toContain('<strong>')
    expect(banner).not.toContain('</strong>')
    // 文本内容仍在
    expect(banner).toContain('不被信任')
    expect(banner).toContain('与正文')
  })

  it('is idempotent', () => {
    const dec = decorateFlagshipBanner(kiln)
    const once = dec('<p>[横幅] 工具的终点</p>', 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
  })
})

describe('decorateFlagshipCompare — B2 对比双栏', () => {
  const input2 =
    '<p>[对比] 模板工具 | 千篇一律的通用组件，换个颜色还是同一张脸 || 墨铸旗舰 | 方格×菱形×印章长出专属母题</p>'

  it('two inline-block columns: left accentTint solid / right accentBorder framed, no flex', () => {
    const dec = decorateFlagshipCompare(tempera)
    const out = dec(input2, 'wechat')
    expect(out).toContain('data-ink-block="flagship-compare"')
    // 47% 宽度（两列并排）
    expect((out.match(/width:47%/g) || []).length).toBe(2)
    // font-size:0 抑制 inline-block 间隙
    expect(out).toContain('font-size:0')
    // 左 accentTint 实底
    expect(out).toContain(`background-color:${tempera.accentTint}`)
    // 右 accentBorder 描边 + paper 底
    expect(out).toContain(`border:1px solid ${tempera.accentBorder}`)
    expect(out).toContain(`background-color:${tempera.paper}`)
    // 字段正确拆分 + escape
    expect(out).toContain('模板工具')
    expect(out).toContain('墨铸旗舰')
    expect(out).toContain('千篇一律的通用组件，换个颜色还是同一张脸')
    expect(out).toContain('方格×菱形×印章长出专属母题')
    // 无 flex
    expect(out).not.toMatch(/display\s*:\s*flex/i)
    expectNoForbidden(out)
  })

  it('only 1 entry → returned unchanged', () => {
    const dec = decorateFlagshipCompare(kiln)
    const input = '<p>[对比] 只有左 | 只有左内容</p>'
    expect(dec(input, 'wechat')).toBe(input)
  })

  it('entry without ≥2 fields → returned unchanged', () => {
    const dec = decorateFlagshipCompare(amber)
    const input = '<p>[对比] 只有标题 || 也只有标题</p>'
    expect(dec(input, 'wechat')).toBe(input)
  })

  it('is idempotent', () => {
    const dec = decorateFlagshipCompare(tempera)
    const once = dec(input2, 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
  })
})

describe('decorateFlagshipTimeline — B3 时间线 / 步骤条', () => {
  const input3 =
    '<p>[时间线] 立意 | 先想清楚要对谁说什么 || 结构 | 用章节头与目录搭骨架 || 润色 | 金句、数据、图框点睛 || 成稿 | 一键导出公众号</p>'

  it('vertical steps: grid-numbered chip + inline-block text col with border-left timeline rail', () => {
    const dec = decorateFlagshipTimeline(kiln)
    const out = dec(input3, 'wechat')
    expect(out).toContain('data-ink-block="flagship-timeline"')
    // 方格铸号 chip（accent 底 + radius:3 + 白号）
    expect(out).toContain(`background-color:${kiln.accent}`)
    expect(out).toContain('border-radius:3px')
    // 4 步：01 / 02 / 03 / 04
    expect(out).toContain('>01</span>')
    expect(out).toContain('>02</span>')
    expect(out).toContain('>03</span>')
    expect(out).toContain('>04</span>')
    // border-left 时间线轨
    expect(out).toContain(`border-left:2px solid ${kiln.accentBorder}`)
    // 字段
    expect(out).toContain('立意')
    expect(out).toContain('先想清楚要对谁说什么')
    expect(out).toContain('成稿')
    expectNoForbidden(out)
  })

  it('description field empty → only title row, no descNode', () => {
    const dec = decorateFlagshipTimeline(tempera)
    const out = dec('<p>[时间线] 只有标题</p>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-timeline"')
    expect(out).toContain('只有标题')
    // 无 desc 文本
    expect(out).not.toMatch(/font-size:14px;line-height:1\.7/)
  })

  it('non-marker `<p>` untouched', () => {
    const dec = decorateFlagshipTimeline(amber)
    const input = '<p>没有 marker。</p>'
    expect(dec(input, 'wechat')).toBe(input)
  })

  it('is idempotent', () => {
    const dec = decorateFlagshipTimeline(kiln)
    const once = dec(input3, 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
  })
})

describe('decorateFlagshipGallery — B4 横滑相册', () => {
  const input4 =
    '<p>[相册] 封面 | 满幅色带刊头 + 篆刻方印 || 章节头 | 构成主义满幅反白 || 版权页 | vessel mark + 双线</p>'

  it('CSS scroll-snap rail (overflow-x:auto + scroll-snap-type, NO flex) + 80% wide cards', () => {
    const dec = decorateFlagshipGallery(tempera)
    const out = dec(input4, 'wechat')
    expect(out).toContain('data-ink-block="flagship-gallery"')
    expect(out).toContain('overflow-x:auto')
    expect(out).toContain('scroll-snap-type:x mandatory')
    expect(out).toContain('white-space:nowrap')
    // 卡宽 80% 留露头
    const cardCount = (out.match(/width:80%/g) || []).length
    expect(cardCount).toBe(3)
    // 卡内 paperWarm + hairline
    expect(out).toContain(`background-color:${tempera.paperWarm}`)
    expect(out).toContain(`border:1px solid ${tempera.hairline}`)
    // 序号 svg（方格 number small）
    expect(out).toContain('>01</text>')
    expect(out).toContain('>02</text>')
    expect(out).toContain('>03</text>')
    // 字段
    expect(out).toContain('封面')
    expect(out).toContain('vessel mark + 双线')
    // **零 flex**
    expect(out).not.toMatch(/display\s*:\s*flex/i)
    expectNoForbidden(out)
  })

  it('<2 entries → returned unchanged', () => {
    const dec = decorateFlagshipGallery(kiln)
    const input = '<p>[相册] 只有一张 | 内容</p>'
    expect(dec(input, 'wechat')).toBe(input)
  })

  it('is idempotent', () => {
    const dec = decorateFlagshipGallery(amber)
    const once = dec(input4, 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
  })
})

describe('decorateFlagshipCitation — B5 出处 / 注释卡', () => {
  it('marker `[出处] 引文 | 来源` → left-line citation card + right-aligned source row', () => {
    const dec = decorateFlagshipCitation(tempera)
    const out = dec('<p>[出处] 克制不是寡淡，而是节制点缀的次数。 | 墨铸设计手记</p>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-citation"')
    // 左 3px accentBorder 细线 + paperWarm 底
    expect(out).toContain(`border-left:3px solid ${tempera.accentBorder}`)
    expect(out).toContain(`background-color:${tempera.paperWarm}`)
    // 引文
    expect(out).toContain('克制不是寡淡，而是节制点缀的次数。')
    // 来源右对齐 + dash
    expect(out).toContain('text-align:right')
    expect(out).toContain('— 墨铸设计手记')
    // 菱形分隔 svg
    expect(out).toContain('viewBox="0 0 12 12"')
    expect(out).toContain('d="M6,1 L11,6 L6,11 L1,6 Z"')
    expectNoForbidden(out)
  })

  it('source field empty → no source row', () => {
    const dec = decorateFlagshipCitation(kiln)
    const out = dec('<p>[出处] 引文一段</p>', 'wechat')
    expect(out).toContain('data-ink-block="flagship-citation"')
    expect(out).toContain('引文一段')
    expect(out).not.toContain('text-align:right')
  })

  it('non-marker `<p>` untouched', () => {
    const dec = decorateFlagshipCitation(amber)
    const input = '<p>普通段落。</p>'
    expect(dec(input, 'wechat')).toBe(input)
  })

  it('is idempotent', () => {
    const dec = decorateFlagshipCitation(tempera)
    const once = dec('<p>[出处] 引文 | 来源</p>', 'wechat')
    expect(dec(once, 'wechat')).toBe(once)
  })
})

describe('decorateFlagshipStretch — B6 折叠 marker 接线（i-stretch）', () => {
  it('preview target: marker `[折叠] 标题 | 内容` → i-stretch SVG with cover + animate (motion=true)', () => {
    const dec = decorateFlagshipStretch(kiln, { primaryColor: '#D95B3F', persona: 'creative' })
    const out = dec('<p>[折叠] 为什么不用渐变？ | 微信 sanitizer 对 url(#id) 行为不可预测，全行业量产工具一致回避。</p>', 'preview')
    expect(out).toContain('data-ink-svg="i-stretch"')
    // motion=true → 含 cover SMIL animate
    expect(out).toContain('<animate')
    expect(out).toContain('begin="click"')
    expect(out).toContain('fill="freeze"')
    expect(out).toContain('restart="never"')
    // 标题
    expect(out).toContain('为什么不用渐变？')
    expectNoForbidden(out)
  })

  it('wechat target: also motion=true (allowMotion = preview/wechat)', () => {
    const dec = decorateFlagshipStretch(tempera, { primaryColor: '#3B7A6B', persona: 'academic' })
    const out = dec('<p>[折叠] 标题 | 内容</p>', 'wechat')
    expect(out).toContain('data-ink-svg="i-stretch"')
    expect(out).toContain('<animate')
  })

  it('xhs target: motion=false → static, no animate, no cover', () => {
    const dec = decorateFlagshipStretch(amber, { primaryColor: '#C19A56', persona: 'business' })
    const out = dec('<p>[折叠] 标题 | 内容</p>', 'xhs')
    expect(out).toContain('data-ink-svg="i-stretch"')
    expect(out).not.toContain('<animate')
    expect(out).not.toContain('begin="click"')
  })

  it('non-marker `<p>` untouched', () => {
    const dec = decorateFlagshipStretch(kiln, { primaryColor: '#D95B3F', persona: 'creative' })
    const input = '<p>普通段落。</p>'
    expect(dec(input, 'preview')).toBe(input)
  })

  it('is idempotent (i-stretch self-sentinel)', () => {
    const dec = decorateFlagshipStretch(tempera, { primaryColor: '#3B7A6B', persona: 'academic' })
    const once = dec('<p>[折叠] 标题 | 内容</p>', 'preview')
    expect(dec(once, 'preview')).toBe(once)
  })
})
