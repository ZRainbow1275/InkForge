/**
 * PR6 集成守护 — 注入式 SVG 模块在 preview-fidelity 管线中存活验证。
 *
 * 背景：composeSvgDecorate(...) 在微信导出管线 DOMPurify 之后注入带
 * `data-ink-svg` 哨兵的 inline SVG。preview-fidelity 是独立的保真通道：
 * 微信保留可信 inline SVG；知乎只允许注册表 module id 生成 image fallback，
 * 不得把用户 Markdown 中伪造的 SVG 当成可信模块。
 *
 * 本测试锁定各平台 preview mock 对注入 SVG 的预览契约：
 *   - wechat-mock：直接包裹 content.html，inline SVG 原样保留。
 *   - zhihu-mock：把带 `data-ink-svg` 的 inline SVG 模块转成 image fallback，
 *     避免预览暗示知乎发布路径可接受 inline SVG。
 */
import { describe, it, expect } from 'vitest'
import { renderWechatMockHtml } from './wechat-mock'
import { renderZhihuMockHtml } from './zhihu-mock'

// 模拟 composeSvgDecorate 注入的标题头模块片段（简化但结构等价：
// <section data-ink-svg="..."> 包裹 inline <svg viewBox width="100%"> + SMIL）。
const INJECTED_SVG = [
  '<section data-ink-svg="header-ribbon" style="display:block">',
  '<svg viewBox="0 0 600 80" width="100%" xmlns="http://www.w3.org/2000/svg">',
  '<rect x="0" y="0" width="600" height="80" rx="6" fill="#b34a2f"></rect>',
  '<text x="24" y="48" font-size="28" font-weight="700" fill="#ffffff" text-anchor="start">章节标题</text>',
  '<animate attributeName="opacity" begin="0s" dur="0.4s" from="0" to="1" fill="freeze" restart="never"></animate>',
  '</svg>',
  '</section>',
].join('')

describe('preview-fidelity — 注入式 SVG 模块存活（PR6）', () => {
  it('wechat-mock 原样保留 inline SVG 模块与哨兵', () => {
    const html = renderWechatMockHtml({ html: `<p>正文</p>${INJECTED_SVG}` })
    expect(html).toContain('data-platform-editor="wechat"')
    expect(html).toContain('data-editor-canvas-width="586"')
    expect(html).toContain('max-width:586px')
    expect(html).toContain('font-size:17px')
    expect(html).toContain('line-height:27.2px')
    expect(html).not.toContain('wechat-mock-chrome')
    expect(html).not.toContain('wechat-mock-watermark')
    expect(html).toContain('data-ink-svg="header-ribbon"')
    expect(html).toContain('<svg viewBox="0 0 600 80" width="100%"')
    expect(html).toContain('<text x="24" y="48"')
    // SMIL 动画节点未被剥离
    expect(html).toContain('<animate attributeName="opacity"')
    // body 包裹层内仍含 SVG（未被搬移到容器外）
    expect(html).toMatch(/wechat-mock-body[^>]*>[\s\S]*data-ink-svg="header-ribbon"/)
  })

  it('zhihu-mock converts a registered module id to image fallback', () => {
    const html = renderZhihuMockHtml({
      markdown: '# 标题\n\n正文段落',
      trustedSvgModuleIds: ['header-ribbon'],
    })
    expect(html).toContain('data-ink-svg="header-ribbon"')
    expect(html).toContain('<img data-ink-svg="header-ribbon"')
    expect(html).toContain('src="data:image/svg+xml;charset=utf-8,')
    expect(html).toContain('alt="InkForge header-ribbon image fallback"')
    expect(html).not.toContain('<svg viewBox="0 0 600 80"')
    expect(html).not.toContain('<animate attributeName="opacity"')
  })
})
