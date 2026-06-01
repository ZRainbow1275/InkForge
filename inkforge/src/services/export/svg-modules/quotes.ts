/**
 * R1.3 引用卡（quote）模块族 — 见 prompts/0601/SPEC.md §8。
 *
 * 4 个变体，全部产微信安全子集（assertWechatSafe 零违规）：
 *   - quote-corner  「 」 角标卡（path 角 + 多行 <text>）
 *   - quote-vbar    左竖条引用（rect 竖条 + 多行 <text>）
 *   - quote-mark    大引号装饰（path 引号 + 多行 <text>）
 *   - quote-card    圆角卡片（rect rx + box-shadow on <section>）
 *
 * 实现要点：
 * - SVG <text> 不换行：每视觉行一个 <text>，本地 wrapCjkLines 按 ~18 CJK 字/行
 *   拆分（兼容显式 '\n'），超 4 行截断为 …。
 * - viewBox 1080×height；height = 160 + 64*lines（动态高随行数生长）。
 * - 颜色一律走 p.theme.palette（hex/rgba），禁 var()/class/<style>。
 * - ember 在 quote 族不使用（保留给 endmark/cover 的 ≤1 次点缀）。
 */

import {
  path,
  rect,
  textLine,
  svgSection,
} from './primitives'
import type { SvgModuleParams, SvgModuleSpec, SvgPalette } from './types'

// ─── 文本换行（CJK 友好） ────────────────────────────────────────────────

const MAX_LINES = 4
const TARGET_CHARS_PER_LINE = 18
const ELLIPSIS = '…'

/**
 * 按 ~18 CJK 字/行拆分输入文本，最多 MAX_LINES 行。
 * 规则：先按显式 '\n' 切；再对每段按字符数切（CJK 与拉丁字符同权）。
 * 超出最后一行的剩余字符用 … 截断进最后一行末尾。
 */
function wrapCjkLines(input: string, maxCharsPerLine = TARGET_CHARS_PER_LINE): string[] {
  const text = String(input ?? '').trim()
  if (!text) return ['']
  const segments = text.split(/\r?\n/)
  const lines: string[] = []
  for (const seg of segments) {
    if (seg.length === 0) {
      lines.push('')
      continue
    }
    // 按字符数硬切（中文场景下足够；不引入额外断词库以保持轻量）
    const chars = Array.from(seg)
    for (let i = 0; i < chars.length; i += maxCharsPerLine) {
      lines.push(chars.slice(i, i + maxCharsPerLine).join(''))
    }
  }
  if (lines.length <= MAX_LINES) return lines
  const kept = lines.slice(0, MAX_LINES)
  // 把最后一行末尾改为 …（避免溢出感）
  const last = kept[MAX_LINES - 1] ?? ''
  const trimmedLast = last.length >= maxCharsPerLine
    ? Array.from(last).slice(0, maxCharsPerLine - 1).join('') + ELLIPSIS
    : last + ELLIPSIS
  kept[MAX_LINES - 1] = trimmedLast
  return kept
}

// ─── 视觉常量 ────────────────────────────────────────────────────────────

const CANVAS_W = 1080
const LINE_HEIGHT = 64
const QUOTE_FONT = 38
const SUBTITLE_FONT = 26
const SAFE_FONT_STACK = '-apple-system, PingFang SC, Hiragino Sans GB, Source Han Serif SC, Songti SC, serif'

function computeHeight(lineCount: number): number {
  // base 160 (上下安全区 + attribution 区) + 每行 64
  return 160 + Math.max(1, lineCount) * LINE_HEIGHT
}

function renderQuoteLines(
  lines: string[],
  opts: { x: number; yStart: number; fill: string; anchor?: 'start' | 'middle' | 'end' },
): string {
  return lines
    .map((ln, i) =>
      textLine({
        x: opts.x,
        y: opts.yStart + i * LINE_HEIGHT,
        text: ln,
        fill: opts.fill,
        fontSize: QUOTE_FONT,
        fontFamily: SAFE_FONT_STACK,
        anchor: opts.anchor,
      }),
    )
    .join('')
}

function renderAttribution(
  subtitle: string | undefined,
  opts: { x: number; y: number; fill: string; anchor?: 'start' | 'middle' | 'end' },
): string {
  if (!subtitle) return ''
  return textLine({
    x: opts.x,
    y: opts.y,
    text: subtitle,
    fill: opts.fill,
    fontSize: SUBTITLE_FONT,
    fontFamily: SAFE_FONT_STACK,
    anchor: opts.anchor,
  })
}

// ─── 变体 1: quote-corner（角标） ────────────────────────────────────────

function renderQuoteCorner(p: SvgModuleParams): string {
  const palette = p.theme.palette
  const lines = wrapCjkLines(p.text ?? '')
  const h = computeHeight(lines.length)

  // 角标：「 」 用 <path> 描两条折线，左上角与右下角对角呼应。
  // 角标厚度 6（stroke-width），覆盖 ~80×80 的方角。
  const corner = (cmds: string, stroke: string) =>
    path(cmds, { stroke, strokeWidth: 6, strokeLinecap: 'square', fill: 'none' })

  // 左上角「：从 (60, 130) 向下 80，再向右 80
  const topLeft = corner('M60,50 L60,130 M60,50 L140,50', palette.accent)
  // 右下角」：从 (CANVAS_W-60, h-50) 向上 80，再向左 80
  const brX = CANVAS_W - 60
  const brY = h - 50
  const bottomRight = corner(`M${brX},${brY} L${brX},${brY - 80} M${brX},${brY} L${brX - 80},${brY}`, palette.accent)

  const body = renderQuoteLines(lines, { x: 160, yStart: 110, fill: palette.ink })
  const attribution = renderAttribution(p.subtitle, {
    x: CANVAS_W - 160,
    y: h - 70,
    fill: palette.inkSoft,
    anchor: 'end',
  })

  return svgSection({
    moduleId: 'quote-corner',
    viewBoxW: CANVAS_W,
    viewBoxH: h,
    body: topLeft + bottomRight + body + attribution,
    sectionStyle: 'margin:24px 0;',
  })
}

// ─── 变体 2: quote-vbar（左竖条） ────────────────────────────────────────

function renderQuoteVbar(p: SvgModuleParams): string {
  const palette = p.theme.palette
  const lines = wrapCjkLines(p.text ?? '')
  const h = computeHeight(lines.length)

  // 左竖条：宽 8，从 y=40 延伸到 h-100（给 attribution 留空间）
  const barX = 60
  const barTop = 40
  const barH = h - 140
  const bar = rect({
    x: barX,
    y: barTop,
    width: 8,
    height: barH,
    fill: palette.accent,
  })

  const body = renderQuoteLines(lines, {
    x: barX + 40,
    yStart: 90,
    fill: palette.ink,
  })
  const attribution = renderAttribution(p.subtitle, {
    x: barX + 40,
    y: h - 60,
    fill: palette.inkSoft,
  })

  return svgSection({
    moduleId: 'quote-vbar',
    viewBoxW: CANVAS_W,
    viewBoxH: h,
    body: bar + body + attribution,
    sectionStyle: 'margin:24px 0;',
  })
}

// ─── 变体 3: quote-mark（大引号） ────────────────────────────────────────

function renderQuoteMark(p: SvgModuleParams): string {
  const palette = p.theme.palette
  const lines = wrapCjkLines(p.text ?? '')
  const h = computeHeight(lines.length)

  // 大装饰引号（西文 66 形），由两个豆点 + 弯钩构成，用 <path> 一次描出。
  // 位置：viewBox 左上 (60, 20)，整体尺寸 ~180×140；accentSoft 低饱和。
  const markD =
    'M120,150 ' +
    'C120,100 150,70 200,70 ' +
    'L200,110 ' +
    'C175,110 160,125 160,150 ' +
    'L200,150 L200,210 L120,210 Z ' +
    'M40,150 ' +
    'C40,100 70,70 120,70 ' +
    'L120,110 ' +
    'C95,110 80,125 80,150 ' +
    'L120,150 L120,210 L40,210 Z'
  const decoMark = path(markD, { fill: palette.accentSoft })

  // 引文从大引号下方开始，给 mark 让位
  const body = renderQuoteLines(lines, {
    x: 80,
    yStart: 280,
    fill: palette.ink,
  })
  const attribution = renderAttribution(p.subtitle, {
    x: 80,
    y: h - 60,
    fill: palette.inkSoft,
  })

  // mark 占空间：把 viewBox 高度抬升一个 yStart 偏移（不动 computeHeight 契约）
  const totalH = h + 140
  return svgSection({
    moduleId: 'quote-mark',
    viewBoxW: CANVAS_W,
    viewBoxH: totalH,
    body: decoMark + body + attribution,
    sectionStyle: 'margin:24px 0;',
  })
}

// ─── 变体 4: quote-card（圆角卡 + 阴影） ─────────────────────────────────

function renderQuoteCard(p: SvgModuleParams): string {
  const palette = p.theme.palette
  const lines = wrapCjkLines(p.text ?? '')
  const h = computeHeight(lines.length)

  // 卡片填充 paperWarm，发丝 stroke
  const cardMargin = 40
  const card = rect({
    x: cardMargin,
    y: cardMargin,
    width: CANVAS_W - cardMargin * 2,
    height: h - cardMargin * 2,
    rx: 20,
    ry: 20,
    fill: palette.paperWarm,
    stroke: palette.hairline,
    strokeWidth: 1,
  })

  const body = renderQuoteLines(lines, {
    x: cardMargin + 56,
    yStart: cardMargin + 80,
    fill: palette.ink,
  })
  const attribution = renderAttribution(p.subtitle, {
    x: CANVAS_W - cardMargin - 56,
    y: h - cardMargin - 32,
    fill: palette.inkSoft,
    anchor: 'end',
  })

  // box-shadow 走 <section> 内联 style（微信支持），不污染 inner svg
  const shadow = boxShadowFor(palette)
  return svgSection({
    moduleId: 'quote-card',
    viewBoxW: CANVAS_W,
    viewBoxH: h,
    body: card + body + attribution,
    sectionStyle: `margin:24px 0;box-shadow:${shadow};border-radius:20px;`,
  })
}

function boxShadowFor(palette: SvgPalette): string {
  // 一层柔阴影 + 一层细描边阴影，accentSoft 提供调性
  // 颜色全部 rgba/hex；不引入 var()/calc()
  return `0 12px 28px ${palette.accentSoft}, 0 2px 6px ${palette.hairline}`
}

// ─── 注册表 ──────────────────────────────────────────────────────────────

export const quoteModules: SvgModuleSpec[] = [
  {
    id: 'quote-corner',
    family: 'quote',
    description: '「 」角标卡：左上 + 右下对角引号点缀，attribution 右下',
    render: renderQuoteCorner,
  },
  {
    id: 'quote-vbar',
    family: 'quote',
    description: '左竖条引用：accent 竖条 + 多行正文 + attribution 左下',
    render: renderQuoteVbar,
  },
  {
    id: 'quote-mark',
    family: 'quote',
    description: '大引号装饰：accentSoft 大装饰引号 + 正文 + attribution',
    render: renderQuoteMark,
  },
  {
    id: 'quote-card',
    family: 'quote',
    description: '圆角卡片：paperWarm 填充 + 发丝描边 + section box-shadow',
    render: renderQuoteCard,
  },
]
