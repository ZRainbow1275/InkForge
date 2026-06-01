/**
 * 封面 / 导语 banner 模块族（cover-* 变体）— 见 prompts/0601/SPEC.md §8。
 *
 * 三个变体共享 1080×620 lead-in banner viewBox（宽度由父容器 `width="100%"`
 * 决定，移动端 375/677 自适应）。所有 render 输出必须通过 assertWechatSafe()，
 * 即仅落微信安全子集：<svg>/<g>/<path>/<rect>/<circle>/<text> + SMIL，颜色
 * 走 hex/rgba，禁 var()/calc()/class/<style>/<div>/defs/渐变/clip/mask/filter。
 *
 * 暗黑模式免疫：若变体使用暗色背景，必先用 darkSafeBg(...) 画整块不透明背景
 * rect，并给每个 <text> 显式 fill（paper / onAccent），不依赖页面底色。
 *
 * 美学（静谧刊印 Quiet Press）：
 * - 大留白，构成主义几何（菱形 / 网格 / 细线），低饱和品牌色板。
 * - ember 每模块 ≤1 次（cover/endmark 各最多 1 处点缀，见 SPEC §3）。
 * - 体量克制：每个变体的几何装饰为「视觉签名」而非满铺纹理。
 */
import {
  circle,
  darkSafeBg,
  diamond,
  hairlineRule,
  path,
  rect,
  svgSection,
  textLine,
} from './primitives'
import type { SvgModuleParams, SvgModuleSpec } from './types'

// banner 视图常量 — 1080 宽固定，620 高（≈16:9 + 视觉富余，作 lead-in banner）
const W = 1080
const H = 620

/**
 * 字体栈写进 SVG `font-family="…"` 表现属性（双引号包裹），内层多词字体名必须用
 * 单引号，否则会提前终止属性（primitives.ts attrs() 不转义）。
 */
const COVER_FONT_SANS = "-apple-system, 'PingFang SC', 'Source Han Sans', sans-serif"
const COVER_FONT_SERIF = "-apple-system, 'PingFang SC', 'Source Han Sans', 'Songti SC', serif"

// ─── 文本切行（SVG <text> 不自动换行；按 CJK 字符数硬切） ────────────────

/**
 * 按近似字符宽度把一行 CJK/拉丁混排切到 N 段；超出 maxLines 用 '…' 截断。
 * SVG 安全考量：在拼装阶段切行，避免引入 <tspan> / wrap 等不稳定特性。
 * 简化算法：每个 char 算 1 单位（CJK ≈ 1.0；拉丁字母会偏紧，可接受）。
 */
function splitLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const src = String(text ?? '').trim()
  if (!src) return []
  const lines: string[] = []
  let i = 0
  while (i < src.length && lines.length < maxLines) {
    lines.push(src.slice(i, i + maxCharsPerLine))
    i += maxCharsPerLine
  }
  // 截断省略号：剩余字符直接用 '…' 收尾在最后一行的末尾。
  if (i < src.length && lines.length > 0) {
    const last = lines[lines.length - 1]
    const cut = Math.max(0, Math.min(last.length, maxCharsPerLine - 1))
    lines[lines.length - 1] = last.slice(0, cut) + '…'
  }
  return lines
}

/** 依据可用 viewBox 宽度与字号估算每行最多 CJK 字符数（CJK≈1em；含字距）。 */
function fitCharsPerLine(availableWidth: number, fontSize: number, letterSpacing = 0): number {
  return Math.max(1, Math.floor(availableWidth / (fontSize + Math.max(0, letterSpacing))))
}

/** persona → 栏目 kicker 标签（杂志感「眉标」，短）。 */
function personaKicker(persona: string): string {
  switch (persona) {
    case 'academic':
      return '深读'
    case 'business':
      return '洞察'
    case 'lifestyle':
      return '生活'
    case 'creative':
    default:
      return '专栏'
  }
}

/**
 * 填色圆角 kicker chip：accent 底 + onAccent 标签文字（杂志眉标）。
 * 全 SVG 安全子集（rect rx + 单行 text）；x/y 为 chip 左上角。
 */
function kickerChip(opts: {
  x: number
  y: number
  label: string
  accent: string
  onAccent: string
  font: string
  fontSize?: number
}): string {
  const fs = opts.fontSize ?? 30
  const padX = 22
  const padY = 14
  const chars = Array.from(opts.label).length
  // CJK ≈ 1em 宽，加左右内边距
  const w = chars * fs + padX * 2
  const h = fs + padY * 2
  return (
    rect({ x: opts.x, y: opts.y, width: w, height: h, rx: 8, ry: 8, fill: opts.accent }) +
    textLine({
      x: opts.x + w / 2,
      y: opts.y + h / 2 + fs / 3,
      text: opts.label,
      fill: opts.onAccent,
      fontSize: fs,
      fontWeight: 600,
      fontFamily: opts.font,
      anchor: 'middle',
      letterSpacing: 4,
    })
  )
}

// ─── cover-title ──────────────────────────────────────────────────────────
// 大标题封面：暖纸底 + 大标题 + 副标题 + 右下小菱形签名。
// 留白克制、几何点缀仅作锚点；中性 persona 时也成立。
function renderCoverTitle(p: SvgModuleParams): string {
  const { palette } = p.theme
  const title = (p.text ?? '').trim() || '标题'
  const subtitle = (p.subtitle ?? '').trim()

  // 暖纸亮底（不依赖页面背景）
  const bg = darkSafeBg(W, H, palette.paperWarm)
  // 栏目 kicker chip（杂志眉标）—— 左上，给「设计过的」信号
  const kicker = kickerChip({
    x: 80,
    y: 88,
    label: personaKicker(p.theme.persona),
    accent: palette.accent,
    onAccent: palette.onAccent,
    font: COVER_FONT_SANS,
  })
  // kicker 下方的短 accent 细线（与 kicker 呼应）
  const topRule = hairlineRule({ x: 80, y: 178, width: 200, height: 2, fill: palette.accent })
  // 克制留白纹理：右上角两道极低透明度 accent 细线（不抢戏，仅作纸面肌理）
  const texture =
    rect({ x: W - 320, y: 70, width: 240, height: 1, fill: palette.accent, opacity: 0.1 }) +
    rect({ x: W - 260, y: 92, width: 180, height: 1, fill: palette.accent, opacity: 0.08 })

  // 主标题：单行（如过长可让上层提前裁剪；这里只画一行视觉首屏）
  // 字号 96 留白足够，subtitle 用 inkSoft（更低对比度）。
  // 起点 x=80，左右各留 80 → 可用宽 = W − 80 − 80 = 920；每行字数随字号自适应（≈9）。
  const titleLines = splitLines(title, fitCharsPerLine(W - 80 - 80, 96, 2), 2)
  const titleStartY = 270
  const titleLineH = 116
  const titleNodes = titleLines
    .map((line, idx) =>
      textLine({
        x: 80,
        y: titleStartY + idx * titleLineH,
        text: line,
        fill: palette.ink,
        fontSize: 96,
        fontWeight: 700,
        fontFamily: COVER_FONT_SANS,
        letterSpacing: 2,
      }),
    )
    .join('')

  const subtitleNode = subtitle
    ? textLine({
        x: 80,
        y: titleStartY + titleLines.length * titleLineH + 56,
        text: splitLines(subtitle, 28, 1)[0] ?? '',
        fill: palette.inkSoft,
        fontSize: 30,
        fontWeight: 400,
        fontFamily: COVER_FONT_SANS,
        letterSpacing: 1,
      })
    : ''

  // 右下小菱形签名（单菱形 — 比 ◇◇◇ 更克制，符合「大气克制」）
  const diamondMark = diamond(W - 110, H - 92, 14, palette.accent)
  // 底部细规则线（版心收边）
  const bottomRule = hairlineRule({ x: 80, y: H - 80, width: W - 160, height: 1, fill: palette.hairline })

  return svgSection({
    moduleId: 'cover-title',
    viewBoxW: W,
    viewBoxH: H,
    body: bg + texture + kicker + topRule + titleNodes + subtitleNode + diamondMark + bottomRule,
  })
}

// ─── cover-grid ───────────────────────────────────────────────────────────
// 构成主义网格封面：低密度细线网格 + 大标题 + 一个 accent 交点标记。
// 网格做「纹理」而不抢戏 — 列 6、行 4，1px 描线，opacity 由 hairline 给。
function renderCoverGrid(p: SvgModuleParams): string {
  const { palette } = p.theme
  const title = (p.text ?? '').trim() || '标题'
  const subtitle = (p.subtitle ?? '').trim()

  const bg = darkSafeBg(W, H, palette.paper)

  // 网格：6 列竖线 + 4 行横线（不含外框），版心 80 内缩
  const padX = 80
  const padY = 80
  const innerW = W - padX * 2
  const innerH = H - padY * 2
  const cols = 6
  const rows = 4
  const colStep = innerW / cols
  const rowStep = innerH / rows
  const gridParts: string[] = []
  for (let c = 1; c < cols; c += 1) {
    gridParts.push(
      rect({
        x: padX + c * colStep,
        y: padY,
        width: 1,
        height: innerH,
        fill: palette.hairline,
      }),
    )
  }
  for (let r = 1; r < rows; r += 1) {
    gridParts.push(
      rect({
        x: padX,
        y: padY + r * rowStep,
        width: innerW,
        height: 1,
        fill: palette.hairline,
      }),
    )
  }
  // 外框（细一点的轮廓）：用 4 条 rect 而非单个 stroke rect（更可控）
  gridParts.push(rect({ x: padX, y: padY, width: innerW, height: 1, fill: palette.hairline }))
  gridParts.push(rect({ x: padX, y: padY + innerH, width: innerW, height: 1, fill: palette.hairline }))
  gridParts.push(rect({ x: padX, y: padY, width: 1, height: innerH, fill: palette.hairline }))
  gridParts.push(rect({ x: padX + innerW, y: padY, width: 1, height: innerH, fill: palette.hairline }))

  // accent 交点标记（在第 2 列 × 第 2 行的交点）— 实心小圆，单点签名
  const markCx = padX + 2 * colStep
  const markCy = padY + 1 * rowStep
  const accentDot = circle({ cx: markCx, cy: markCy, r: 8, fill: palette.accent })

  // 栏目 kicker chip（杂志眉标）—— 网格内左上，能量感封面也保留「设计过」信号
  const kicker = kickerChip({
    x: padX + 24,
    y: padY + 28,
    label: personaKicker(p.theme.persona),
    accent: palette.accent,
    onAccent: palette.onAccent,
    font: COVER_FONT_SANS,
  })

  // 标题区（左对齐版心）
  // 起点 x=padX+24，文字须落在网格内缘 padX+innerW 内 → 可用宽 = innerW − 24（≈896）；每行字数自适应（≈10）。
  const titleLines = splitLines(title, fitCharsPerLine(innerW - 24, 84, 2), 2)
  const titleStartY = 310
  const titleLineH = 104
  const titleNodes = titleLines
    .map((line, idx) =>
      textLine({
        x: padX + 24,
        y: titleStartY + idx * titleLineH,
        text: line,
        fill: palette.ink,
        fontSize: 84,
        fontWeight: 700,
        fontFamily: COVER_FONT_SANS,
        letterSpacing: 2,
      }),
    )
    .join('')

  const subtitleNode = subtitle
    ? textLine({
        x: padX + 24,
        y: titleStartY + titleLines.length * titleLineH + 48,
        text: splitLines(subtitle, 30, 1)[0] ?? '',
        fill: palette.inkSoft,
        fontSize: 28,
        fontWeight: 400,
        fontFamily: COVER_FONT_SANS,
        letterSpacing: 1,
      })
    : ''

  return svgSection({
    moduleId: 'cover-grid',
    viewBoxW: W,
    viewBoxH: H,
    body: bg + gridParts.join('') + accentDot + kicker + titleNodes + subtitleNode,
  })
}

// ─── cover-quote ──────────────────────────────────────────────────────────
// 导语 / 引言封面：左上大引号字形（<path>）+ 多行导语 + 细线 + 署名。
// 引号用 path 绘制，避免依赖字体 glyph metrics 的对齐风险。
function renderCoverQuote(p: SvgModuleParams): string {
  const { palette } = p.theme
  const title = (p.text ?? '').trim() || '导语'
  const subtitle = (p.subtitle ?? '').trim()

  // 浅暖纸底（保证暗黑模式不让导语黑底）
  const bg = darkSafeBg(W, H, palette.paperWarm)

  // 大引号字形「" 」 — 两片逗号状几何，accentSoft 填充作大体量低对比留白点
  // 路径以 (140, 120) 为锚点：两个粗短逗号块（不画 typographic glyph，画构成主义抽象引号）
  // 单块尺寸约 70×84，间距 60。
  const quoteY = 120
  const quoteX = 140
  const blockW = 70
  const blockH = 84
  const gap = 60
  // 「单个引号块」= 一个粗矩形 + 下方斜尾（path）。这里用 path 一次性勾勒：
  // 起点 (x,y) → 右下走顶边 → 右边下沿 → 斜向左下出尾 → 回 (x,y)
  const quoteBlock = (x: number, y: number): string => {
    const d = `M${x},${y} L${x + blockW},${y} L${x + blockW},${y + blockH * 0.55} L${x + blockW * 0.45},${y + blockH} L${x + blockW * 0.2},${y + blockH * 0.95} L${x + blockW * 0.55},${y + blockH * 0.55} L${x},${y + blockH * 0.55} Z`
    return path(d, { fill: palette.accentSoft })
  }
  const quote1 = quoteBlock(quoteX, quoteY)
  const quote2 = quoteBlock(quoteX + blockW + gap, quoteY)

  // 多行导语（≤4 行；起点 x=140，左右各留 140 → 可用宽 = W − 140 − 140 = 800；每行 ~16 字，超出 …）
  const lines = splitLines(title, fitCharsPerLine(W - 140 - 140, 48, 2), 4)
  const lineH = 70
  const textStartY = 300
  const textNodes = lines
    .map((line, idx) =>
      textLine({
        x: 140,
        y: textStartY + idx * lineH,
        text: line,
        fill: palette.ink,
        fontSize: 48,
        fontWeight: 500,
        fontFamily: COVER_FONT_SERIF,
        letterSpacing: 2,
      }),
    )
    .join('')

  // 细线 + 署名（subtitle 作 attribution，类似「— 鲁迅」）
  const ruleY = textStartY + lines.length * lineH + 36
  const rule = hairlineRule({ x: 140, y: ruleY, width: 80, height: 2, fill: palette.accent })
  const attribution = subtitle
    ? textLine({
        x: 240,
        y: ruleY + 10,
        text: '— ' + (splitLines(subtitle, 28, 1)[0] ?? ''),
        fill: palette.inkSoft,
        fontSize: 26,
        fontWeight: 400,
        fontFamily: COVER_FONT_SANS,
        letterSpacing: 1,
      })
    : ''

  return svgSection({
    moduleId: 'cover-quote',
    viewBoxW: W,
    viewBoxH: H,
    body: bg + quote1 + quote2 + textNodes + rule + attribution,
  })
}

// ─── 注册表导出 ──────────────────────────────────────────────────────────

export const coverModules: SvgModuleSpec[] = [
  {
    id: 'cover-title',
    family: 'cover',
    description: '大标题封面：暖纸底 + 大字标题 + 副题 + 右下菱形签名（克制留白）',
    render: renderCoverTitle,
  },
  {
    id: 'cover-grid',
    family: 'cover',
    description: '构成主义网格封面：低密度细线网格 + 大标题 + accent 交点签名',
    render: renderCoverGrid,
  },
  {
    id: 'cover-quote',
    family: 'cover',
    description: '导语封面：大引号几何 + 多行导语（按 16 字切行）+ 细线 + 署名',
    render: renderCoverQuote,
  },
]

// 不修改 index.ts；如需注册让上层显式 import { coverModules } from './covers'。
// 仍单独导出渲染器便于测试单点引用。
export const __renderers = {
  renderCoverTitle,
  renderCoverGrid,
  renderCoverQuote,
}
