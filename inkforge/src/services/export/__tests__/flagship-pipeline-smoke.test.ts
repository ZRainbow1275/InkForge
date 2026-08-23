/**
 * @vitest-environment happy-dom
 *
 * PR7 (AC1-AC10 验证) — SVG 旗舰预设「全管线冒烟」端到端真测。
 *
 * 这是一条 REAL、RUNNABLE 的 Node/vitest 管线冒烟：把一段预渲染 HTML（命中
 * 旗舰 plan 的每一个注入锚点：cover / h2 / h3 / hr / blockquote / endmark）
 * 真实喂入完整 wechat 导出链 —— convertToWechatWithStats → juice 内联 →
 * applyHeadingDecorations → preset.decorate(composeSvgDecorate) →
 * postProcessForWechat → enforcePlatformCSS → wechatComplianceTransform ——
 * 不 mock、不模拟、无 GUI，直接断言 SVG 旗舰排版系统端到端存活、安全、可读。
 *
 * 与既有 flagship-svg.test.ts 互补（不重复）：
 * - flagship-svg 只断言「有 SVG / 有正文 / 至少一个 section safe」；
 * - 本文件按每个 plan 的「确切 module id」逐个核对注入命中（AC2/AC7），
 *   全量校验每个 SVG section 的 WeChat-safe 零违规（AC9），
 *   核对 20-22 字/行宽度锁不被破坏（AC3），
 *   并新增 端到端幂等（decorate idempotent）与 非旗舰预设 opt-in 守护。
 *
 * 故意走 convertToWechatWithStats（入参=已渲染 HTML）以避开 mermaid 懒加载慢路径。
 */
import { describe, expect, it } from 'vitest'
import { convertToWechatWithStats } from '../wechat'
import { themePresets, getDefaultPreset } from '../themes'
import { checkWechatSafe } from '../svg-modules'
import { generatePersonaBaseCSS } from '../preset-fonts'
import type { ExportPreset, PresetPersona } from '@/types'

// ─── 旗舰预设 + 各自 plan 的「确切 module id」（读自 themes.ts 的三个 plan） ──
// flagshipKilnPlan / flagshipTemperaPlan / flagshipAmberPlan，逐字核对，不靠猜。
interface FlagshipFixture {
  id: string
  persona: PresetPersona
  /**
   * 该 plan 注入后应出现的 SVG 图形 module id（仅「纯图形」母题：cover + divider）。
   * 标题/引用/列表/落款已迁到 html-blocks 内联色块（见 expectedBlockIds）。
   */
  expectedModuleIds: string[]
  /** 内联 HTML 色块装饰器哨兵（标题/引用卡/列表/落款卡）。 */
  expectedBlockIds: string[]
}

const FLAGSHIPS: FlagshipFixture[] = [
  {
    id: 'flagship-kiln',
    persona: 'creative',
    expectedModuleIds: [
      'cover-grid', // plan.cover
      'divider-forge', // hr
    ],
    expectedBlockIds: [
      'flagship-h2',
      'flagship-h3',
      'flagship-quote',
      'flagship-ul',
      'flagship-footer',
    ],
  },
  {
    id: 'flagship-kiln-paste-safe',
    persona: 'creative',
    expectedModuleIds: [
      'cover-title',
      'divider-forge',
    ],
    expectedBlockIds: [
      'flagship-h2',
      'flagship-h3',
      'flagship-quote',
      'flagship-ul',
      'flagship-footer',
    ],
  },
  {
    id: 'flagship-tempera',
    persona: 'academic',
    expectedModuleIds: [
      'cover-title',
      'divider-diamond', // hr
    ],
    expectedBlockIds: [
      'flagship-h2',
      'flagship-h3',
      'flagship-quote',
      'flagship-ul',
      'flagship-footer',
    ],
  },
  {
    id: 'flagship-amber',
    persona: 'business',
    expectedModuleIds: [
      'cover-title',
      'divider-grid', // hr
    ],
    expectedBlockIds: [
      'flagship-h2',
      'flagship-h3',
      'flagship-quote',
      'flagship-ul',
      'flagship-footer',
    ],
  },
]

// 代表性预渲染文档：命中 EVERY 注入锚点 —— h2 / h3 / hr / blockquote / 多段 CJK
// 正文。cover 由 plan 自动前插、endmark 自动追加 → 6 个模块族全部触发。
const REPRESENTATIVE_HTML =
  '<h2>炉火与匠心</h2>' +
  '<p>这是第一段中文正文内容，用于验证移动端二十到二十二字每行的排版铁律。</p>' +
  '<h3>第二节标题</h3>' +
  '<p>第二段正文继续测试中文断行与字距规则的稳定性表现。</p>' +
  '<ul><li>无序列表项一</li><li>无序列表项二</li></ul>' +
  '<hr/>' +
  '<blockquote><p>这是一段被引用的文字内容，应被引用卡模块接管。</p></blockquote>' +
  '<p>结尾段落收束全文，确认正文不丢失。</p>'

// 应在最终 HTML 中保留的正文片段（去标点的稳定子串）。
const BODY_TEXTS = ['炉火与匠心', '第一段中文正文', '第二节标题', '被引用的文字', '收束全文']

const PIPELINE_OPTS = {
  enableCjkSpacing: true,
  enableReadingTime: false,
  enableCiteStatus: false,
} as const

function getFlagshipPreset(id: string): ExportPreset {
  const preset = themePresets.find((p) => p.id === id)
  if (!preset) throw new Error(`flagship preset missing from themePresets: ${id}`)
  return preset
}

/**
 * 抽取最终 HTML 中所有 `<section data-ink-svg="...">…</svg></section>` 块。
 * 旗舰 plan 不含嵌套 section（无 i-scrollcards），贪婪到 `</svg></section>`
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

describe('PR7 — flagship SVG pipeline smoke (real end-to-end, no mock)', () => {
  for (const fixture of FLAGSHIPS) {
    describe(fixture.id, () => {
      const preset = getFlagshipPreset(fixture.id)
      const result = convertToWechatWithStats(REPRESENTATIVE_HTML, preset, PIPELINE_OPTS)

      it('SVG survives the full wechat pipeline (juice→decorate→postProcess→enforce→compliance)', () => {
        expect(result.html).toContain('data-ink-svg')
        expect(result.html).toContain('<svg')
      })

      it('injects EVERY expected SVG graphic module id from this plan (AC2/AC7)', () => {
        for (const moduleId of fixture.expectedModuleIds) {
          expect(result.html, `missing module ${moduleId} in ${fixture.id} output`).toContain(
            `data-ink-svg="${moduleId}"`,
          )
        }
      })

      it('injects EVERY expected HTML color-block id (premium upgrade, fixes 太素)', () => {
        for (const blockId of fixture.expectedBlockIds) {
          expect(result.html, `missing block ${blockId} in ${fixture.id} output`).toContain(
            `data-ink-block="${blockId}"`,
          )
        }
        // 旗舰输出不再把标题/引用渲成 SVG <text>（文字活、可重排）。
        expect(result.html).not.toContain('data-ink-svg="header-')
        expect(result.html).not.toContain('data-ink-svg="quote-')
      })

      it('every injected SVG section is WeChat-safe with zero violations (AC9)', () => {
        const sections = extractSvgSections(result.html)
        expect(sections.length).toBeGreaterThan(0)
        for (const section of sections) {
          expect(checkWechatSafe(section), section.slice(0, 200)).toEqual([])
        }
      })

      it('every outer <svg> uses width="100%" + a viewBox (no fixed px width)', () => {
        const sections = extractSvgSections(result.html)
        expect(sections.length).toBeGreaterThan(0)
        for (const section of sections) {
          expect(section).toMatch(/<svg[^>]*\bwidth="100%"/i)
          expect(section).toMatch(/<svg[^>]*\bviewBox="[^"]+"/i)
        }
      })

      it('preserves the body text (正文 not dropped)', () => {
        for (const text of BODY_TEXTS) {
          expect(result.html).toContain(text)
        }
      })

      // ─── AC3: 22-24 字/行铁律不被破坏 ────────────────────────────────────
      it('keeps the #nice 22-24 chars/line width lock unchanged (AC3)', () => {
        // 1) 源头权威锁：persona base CSS 带 min(24em …) + font-size: 16px。
        const baseCss = generatePersonaBaseCSS(fixture.persona)
        expect(baseCss).toContain('min(24em')
        expect(baseCss).toContain('font-size: 16px')

        // 2) 预设 export/preview CSS 内嵌该锁（旗舰装饰未覆盖正文宽度）。
        expect(preset.exportCSS ?? '').toContain('min(24em')
        expect(preset.previewCSS ?? '').toContain('min(24em')

        // 3) 渲染产物仍带 max-width 约束（677 clamp 包裹），且注入的 SVG
        //    全部 width="100%" —— 是全宽块，不会强加固定内宽改写 #nice 行宽。
        expect(result.html).toContain('max-width')
        expect(result.html).toContain('width="100%"')
      })

      // ─── 端到端幂等：跑两次应字节级相等 ───────────────────────────────────
      it('is idempotent end-to-end (running the pipeline twice yields identical html)', () => {
        const first = convertToWechatWithStats(REPRESENTATIVE_HTML, preset, PIPELINE_OPTS)
        const second = convertToWechatWithStats(REPRESENTATIVE_HTML, preset, PIPELINE_OPTS)
        expect(second.html).toEqual(first.html)
      })
    })
  }
})

// ─── opt-in 守护：非旗舰预设绝不注入装饰 SVG ──────────────────────────────────
describe('PR7 guard — non-flagship preset opts out of SVG modules entirely', () => {
  it('default preset emits NO data-ink-svg and NO <svg', () => {
    const preset = getDefaultPreset()
    const result = convertToWechatWithStats(REPRESENTATIVE_HTML, preset, PIPELINE_OPTS)
    expect(result.html).not.toContain('data-ink-svg')
    expect(result.html).not.toMatch(/<svg\b/i)
    // 但正文仍完整保留。
    for (const text of BODY_TEXTS) {
      expect(result.html).toContain(text)
    }
  })
})
