import { describe, it, expect } from 'vitest'
import {
  escapeXml,
  rect,
  circle,
  path,
  hairlineRule,
  textLine,
  diamondSig,
  svgSection,
  hiddenFulltext,
  mpStyleTrailer,
  darkSafeBg,
  smilAnimate,
  smilSet,
  smilAnimateTransform,
} from '../primitives'
import { assertWechatSafe, checkWechatSafe } from '../wechat-safe'

describe('escapeXml', () => {
  it('escapes XML special chars', () => {
    expect(escapeXml('a<b>&"\'')).toBe('a&lt;b&gt;&amp;&quot;&apos;')
  })
})

describe('shape builders', () => {
  it('rect renders attributes and omits undefined', () => {
    const r = rect({ x: 0, y: 0, width: 10, height: 1, fill: '#000000' })
    expect(r).toContain('<rect ')
    expect(r).toContain('width="10"')
    expect(r).toContain('fill="#000000"')
    expect(r).not.toContain('stroke=')
  })

  it('circle and path render', () => {
    expect(circle({ cx: 5, cy: 5, r: 3, fill: '#ffffff' })).toContain('<circle ')
    expect(path('M0,0 L10,10', { stroke: '#000000' })).toContain('<path ')
    expect(path('M0,0', {})).toContain('fill="none"')
  })

  it('hairlineRule defaults to height 1', () => {
    expect(hairlineRule({ x: 0, y: 0, width: 100, fill: '#cccccc' })).toContain('height="1"')
  })

  it('diamondSig produces exactly 3 paths', () => {
    const s = diamondSig({ cx: 50, cy: 10, r: 4, fill: '#000000' })
    expect((s.match(/<path /g) || []).length).toBe(3)
  })
})

describe('svgSection', () => {
  const out = svgSection({
    moduleId: 'header-badge-num',
    viewBoxW: 1080,
    viewBoxH: 200,
    body: textLine({ x: 40, y: 120, text: 'Hello 世界 & <test>', fill: '#1a1a1a', fontSize: 48 }),
  })

  it('has viewBox + width 100% + data-ink-svg sentinel, uses section not div', () => {
    expect(out).toContain('viewBox="0 0 1080 200"')
    expect(out).toContain('width="100%"')
    expect(out).toContain('data-ink-svg="header-badge-num"')
    expect(out).toContain('<section')
    expect(out).not.toContain('<div')
  })

  it('escapes text content', () => {
    expect(out).toContain('Hello 世界 &amp; &lt;test&gt;')
  })

  it('is wechat-safe (zero violations)', () => {
    expect(checkWechatSafe(out)).toEqual([])
    expect(() => assertWechatSafe(out)).not.toThrow()
  })
})

describe('scaffolding', () => {
  it('hiddenFulltext, mpStyleTrailer, darkSafeBg are all wechat-safe', () => {
    expect(() => assertWechatSafe(hiddenFulltext('全文内容 fallback'))).not.toThrow()
    expect(() => assertWechatSafe(mpStyleTrailer())).not.toThrow()
    expect(() => assertWechatSafe(darkSafeBg(1080, 600, '#0a0a0a'))).not.toThrow()
  })

  it('mpStyleTrailer is the WeChat-expected sentinel', () => {
    expect(mpStyleTrailer()).toContain('mp-style-type')
    expect(mpStyleTrailer()).toContain('display:none')
  })
})

describe('SMIL builders', () => {
  it('smilAnimate defaults fill=freeze restart=never', () => {
    const a = smilAnimate({ attributeName: 'opacity', values: '0;1', dur: '0.6s', begin: '0s' })
    expect(a).toContain('fill="freeze"')
    expect(a).toContain('restart="never"')
    expect(a).toContain('attributeName="opacity"')
    expect(() => assertWechatSafe(a)).not.toThrow()
  })

  it('smilSet and smilAnimateTransform render and stay safe', () => {
    expect(smilSet({ attributeName: 'opacity', to: '0', begin: 'click' })).toContain('<set ')
    const t = smilAnimateTransform({ type: 'translate', values: '0,20;0,0', dur: '0.5s', begin: '0s' })
    expect(t).toContain('animateTransform')
    expect(t).toContain('type="translate"')
    expect(() => assertWechatSafe(t)).not.toThrow()
  })
})
