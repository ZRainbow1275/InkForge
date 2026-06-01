/**
 * @vitest-environment happy-dom
 *
 * PR6 (R7) — SVG 旗舰预设端到端集成测试（SPEC §7.2 / §9.1 回归）。
 *
 * 这三个旗舰预设的 `decorate` 全量使用 svg-modules inline-SVG 排版系统。本测试
 * 把一段预渲染 HTML 喂入完整 wechat 导出管线（convertToWechatWithStats →
 * juice 内联 → applyHeadingDecorations → preset.decorate → postProcessForWechat
 * → enforcePlatformCSS → wechatComplianceTransform），断言注入的 SVG 完整存活、
 * 仍满足微信安全子集、且正文文本不丢失。
 *
 * 故意使用 convertToWechatWithStats（入参为已渲染 HTML）而非 markdownToWechat*，
 * 以避开 mermaid 懒加载的慢路径。
 */
import { describe, expect, it } from 'vitest'
import { convertToWechatWithStats } from '../wechat'
import { getPresetById } from '../themes'
import { checkWechatSafe } from '../svg-modules'

const FLAGSHIP_IDS = ['flagship-kiln', 'flagship-tempera', 'flagship-amber'] as const

// 简单文档：h2 标题 + 正文 + hr + 引用块。命中每个旗舰 plan 的 heading /
// replaceHr / blockquote 锚点；cover + endmark 由 plan 自动前插/追加。
const SIMPLE_HTML = '<h2>章节标题</h2><p>正文段落内容。</p><hr/><blockquote><p>引用文字。</p></blockquote>'

const BODY_TEXTS = ['章节标题', '正文段落内容', '引用文字']

/**
 * 从最终 HTML 抽取所有 `<section data-ink-svg="...">…</section>` 块。
 * 旗舰 plan 不含嵌套 section 的 i-scrollcards，故贪婪到 `</svg></section>`
 * 边界即可可靠切块。
 */
function extractSvgSections(html: string): string[] {
  const out: string[] = []
  const re = /<section\s+data-ink-svg="[^"]*"[\s\S]*?<\/svg><\/section>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    out.push(m[0])
  }
  return out
}

describe('PR6 SVG flagship presets — full wechat pipeline integration', () => {
  for (const id of FLAGSHIP_IDS) {
    describe(id, () => {
      const preset = getPresetById(id)
      if (!preset) throw new Error(`flagship preset missing: ${id}`)

      const result = convertToWechatWithStats(SIMPLE_HTML, preset, {
        enableCjkSpacing: true,
        enableReadingTime: false,
        enableCiteStatus: false,
      })

      it('SVG survives juice + postProcess + enforce + compliance', () => {
        expect(result.html).toContain('data-ink-svg')
        expect(result.html).toContain('<svg')
      })

      it('keeps the body text', () => {
        for (const text of BODY_TEXTS) {
          expect(result.html).toContain(text)
        }
      })

      it('emits at least one SVG section block', () => {
        const sections = extractSvgSections(result.html)
        expect(sections.length).toBeGreaterThan(0)
      })

      it('every injected SVG section is WeChat-safe (no stray class= etc.)', () => {
        const sections = extractSvgSections(result.html)
        expect(sections.length).toBeGreaterThan(0)
        for (const section of sections) {
          expect(checkWechatSafe(section), section.slice(0, 160)).toEqual([])
        }
      })

      it('outer <svg> uses width="100%" + viewBox (no fixed px width)', () => {
        const sections = extractSvgSections(result.html)
        for (const section of sections) {
          expect(section).toMatch(/<svg[^>]*\bwidth="100%"/i)
          expect(section).toMatch(/<svg[^>]*\bviewBox="[^"]+"/i)
        }
        // 确认全局至少出现一次 viewBox 与 width="100%"
        expect(result.html).toMatch(/viewBox="[^"]+"/i)
        expect(result.html).toContain('width="100%"')
      })
    })
  }
})

// 守护既有契约：非旗舰预设遇到已渲染的 Mermaid SVG 时应降级为占位，绝不嵌入 SVG。
describe('PR6 guard — non-flagship preset still degrades rendered Mermaid (no svg leak)', () => {
  it('mermaid-rendered div degrades to placeholder, no <svg> survives', () => {
    const mermaidHtml =
      '<div class="mermaid-rendered" data-source="graph TD A--&gt;B">' +
      '<svg><style>#x{font-family:sans-serif}</style><text>A</text><text>B</text></svg></div>' +
      '<p>正文。</p>'
    const preset = getPresetById('aigc')
    if (!preset) throw new Error('aigc preset missing')
    const result = convertToWechatWithStats(mermaidHtml, preset, {
      enableReadingTime: false,
      enableCiteStatus: false,
    })
    // 非旗舰预设不注入装饰 SVG；Mermaid SVG 被降级，最终无 <svg>/data-ink-svg。
    expect(result.html).not.toMatch(/<svg\b/i)
    expect(result.html).not.toContain('data-ink-svg')
    expect(result.html).toContain('正文')
  })
})
