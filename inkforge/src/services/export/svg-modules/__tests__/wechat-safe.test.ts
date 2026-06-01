import { describe, it, expect } from 'vitest'
import { checkWechatSafe, assertWechatSafe } from '../wechat-safe'

describe('checkWechatSafe — flags forbidden constructs', () => {
  const bad: [string, string][] = [
    ['no-class', '<section class="x"></section>'],
    ['no-style-block', '<style>.a{}</style>'],
    ['no-css-var', '<rect fill="var(--x)" />'],
    ['no-calc', '<svg style="width:calc(100% - 1px)"></svg>'],
    ['no-div', '<div>x</div>'],
    ['no-foreign-object', '<foreignObject><p>x</p></foreignObject>'],
    ['no-id-referenced', '<defs><linearGradient id="g"></linearGradient></defs>'],
    ['no-url-ref', '<rect fill="url(#g)" />'],
    ['no-style-transform', '<g style="transform:translate(1px,2px)"></g>'],
    ['no-keyframes', '@keyframes spin {}'],
    ['no-script', '<script>alert(1)</script>'],
    ['no-xlink', '<use xlink:href="#a" />'],
    ['no-svg-image', '<image href="x.png" />'],
    ['no-bad-smil-trigger', '<animate begin="touchstart" />'],
    ['no-fixed-svg-width', '<svg width="1080" viewBox="0 0 1080 10"></svg>'],
    ['no-iframe', '<iframe src="x"></iframe>'],
  ]

  it.each(bad)('flags %s', (rule: string, html: string) => {
    const v = checkWechatSafe(html)
    expect(v.map((x) => x.rule)).toContain(rule)
    expect(() => assertWechatSafe(html)).toThrow()
  })
})

describe('checkWechatSafe — passes a clean safe svg', () => {
  it('clean svg has zero violations', () => {
    const ok =
      '<section data-ink-svg="x" style="margin:24px 0;">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 200" width="100%" style="display:block;">' +
      '<rect x="0" y="0" width="1080" height="1" fill="#cccccc" />' +
      '<text x="40" y="120" fill="#1a1a1a" font-size="48" transform="translate(0 0)">标题 Title</text>' +
      '<animate attributeName="opacity" values="0;1" dur="0.6s" begin="0s" fill="freeze" restart="never" />' +
      '</svg></section>'
    expect(checkWechatSafe(ok)).toEqual([])
    expect(() => assertWechatSafe(ok)).not.toThrow()
  })

  it('width="100%" on svg is NOT flagged as fixed width', () => {
    expect(checkWechatSafe('<svg width="100%" viewBox="0 0 10 10"></svg>')).toEqual([])
  })
})
