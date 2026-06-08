/**
 * PR6 集成守护 — 注入式 SVG 模块在 preview-fidelity 管线中存活验证。
 *
 * 背景：composeSvgDecorate(...) 在 wechat/xhs/zhihu 导出管线 DOMPurify 之后注入
 * 带 `data-ink-svg` 哨兵的 inline SVG。preview-fidelity mock 是独立的「保真预览」
 * 通道，必须让这些 SVG 模块按目标平台契约呈现，而不是被无声剥离。
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
    expect(html).toContain('data-ink-svg="header-ribbon"')
    expect(html).toContain('<svg viewBox="0 0 600 80" width="100%"')
    expect(html).toContain('<text x="24" y="48"')
    // SMIL 动画节点未被剥离
    expect(html).toContain('<animate attributeName="opacity"')
    // body 包裹层内仍含 SVG（未被搬移到容器外）
    expect(html).toMatch(/wechat-mock-body[^>]*>[\s\S]*data-ink-svg="header-ribbon"/)
  })

  it('zhihu-mock converts injected inline SVG modules to image fallback', () => {
    // markdown 中以原始 HTML 块嵌入注入 SVG（与 xhs/zhihu 栅格化前的 inline 形态一致）
    const md = `# 标题\n\n${INJECTED_SVG}\n\n正文段落`
    const html = renderZhihuMockHtml({ markdown: md })
    expect(html).toContain('data-ink-svg="header-ribbon"')
    expect(html).toContain('<img data-ink-svg="header-ribbon"')
    expect(html).toContain('src="data:image/svg+xml;charset=utf-8,')
    expect(html).toContain('alt="InkForge header-ribbon image fallback"')
    expect(html).not.toContain('<svg viewBox="0 0 600 80"')
    expect(html).not.toContain('<animate attributeName="opacity"')
  })
})
