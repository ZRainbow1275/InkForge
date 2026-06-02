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
  hairlineRule,
  path,
  rect,
  renderSeal,
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
// 重型杂志感刊头封面（tempera + amber 用）：顶部满幅深 accent 色带（左 kicker +
// 右「墨铸 / MOZHU PRESS · SERIAL」品牌报头）+ 暖纸面巨号标题 + 重 accent tab +
// 双细线报头规则 + byline + 右下角篆刻方印。GQ实验室/三联级 + 墨铸金石品牌系统。
function renderCoverTitle(p: SvgModuleParams): string {
  const { palette } = p.theme
  const title = (p.text ?? '').trim() || '标题'
  const subtitle = (p.subtitle ?? '').trim()

  // 暖纸亮底（不依赖页面背景）
  const bg = darkSafeBg(W, H, palette.paperWarm)

  // ─ 顶部满幅深色色带刊头（accentDeep 实色，能稳吃白字）─
  const bandH = 140
  const band = rect({ x: 0, y: 0, width: W, height: bandH, fill: palette.accentDeep })
  const bandKicker = textLine({
    x: 80,
    y: 92,
    text: personaKicker(p.theme.persona),
    fill: palette.paper,
    fontSize: 48,
    fontWeight: 700,
    fontFamily: COVER_FONT_SANS,
    letterSpacing: 6,
  })
  // 右侧品牌报头（nameplate）：墨铸大字 + MOZHU PRESS · SERIAL 小字。
  const namePlate = textLine({
    x: 1000,
    y: 74,
    text: '墨铸',
    fill: palette.paper,
    fontSize: 36,
    fontWeight: 700,
    fontFamily: COVER_FONT_SERIF,
    anchor: 'end',
    letterSpacing: 4,
  })
  const namePlateSub = textLine({
    x: 1000,
    y: 108,
    text: 'MOZHU PRESS · SERIAL',
    fill: palette.paper,
    fontSize: 20,
    fontWeight: 600,
    fontFamily: COVER_FONT_SANS,
    anchor: 'end',
    letterSpacing: 4,
    opacity: 0.7,
  })

  // ─ 超大标题（纸面，字重 800）─
  // 起点 x=80，左右各留 80 → 可用宽 = W − 160 = 920；fitCharsPerLine(920,100,2)=9。
  // 2 行容 18 字，原 17 字标题完整不截断。
  const titleLines = splitLines(title, fitCharsPerLine(W - 160, 100, 2), 2)
  const titleStartY = 320
  const titleLineH = 120
  const titleNodes = titleLines
    .map((line, idx) =>
      textLine({
        x: 80,
        y: titleStartY + idx * titleLineH,
        text: line,
        fill: palette.ink,
        fontSize: 100,
        fontWeight: 800,
        fontFamily: COVER_FONT_SANS,
        letterSpacing: 2,
      }),
    )
    .join('')

  // ─ 重 accent tab（标题末行下方的粗短色块，杂志味）─
  const tabY = titleStartY + (titleLines.length - 1) * titleLineH + 28
  const tab = rect({ x: 80, y: tabY, width: 96, height: 12, fill: palette.accent })

  // ─ 双细线报头规则（tab 之后，两条平行 hairline，间距 8）─
  const ruleY = tabY + 40
  const ruleW = W - 160
  const doubleRule =
    hairlineRule({ x: 80, y: ruleY, width: ruleW, fill: palette.hairline }) +
    hairlineRule({ x: 80, y: ruleY + 8, width: ruleW, fill: palette.hairline })

  // ─ byline（双线下方；左对齐，避开右下印章）─
  const bylineText = subtitle || '文 / 墨铸'
  const byline = textLine({
    x: 80,
    y: ruleY + 50,
    text: splitLines(bylineText, 24, 1)[0] ?? '',
    fill: palette.inkSoft,
    fontSize: 28,
    fontWeight: 400,
    fontFamily: COVER_FONT_SANS,
    letterSpacing: 1,
  })

  // ─ 右下角篆刻方印（accentDeep 底 + 白印文，全篇最强品牌信号）─
  const seal = renderSeal({
    cx: W - 120,
    cy: H - 110,
    size: 120,
    fill: palette.accentDeep,
    textColor: palette.paper,
    font: COVER_FONT_SERIF,
  })

  return svgSection({
    moduleId: 'cover-title',
    viewBoxW: W,
    viewBoxH: H,
    body:
      bg + band + bandKicker + namePlate + namePlateSub + titleNodes + tab + doubleRule + byline + seal,
  })
}

// ─── cover-grid ───────────────────────────────────────────────────────────
// 满幅实色封面（kiln 用，最猛）：整封面 accentDeep 深实色 + 白色低透明网格残迹
// （保留构成主义身份）+ 白底 chip kicker（accentDeep 字，反差最大）+ 巨号白标题
// + 白 tab。满幅深色彩底强吃白字（accentDeep 保证 CR≥4.5）。
function renderCoverGrid(p: SvgModuleParams): string {
  const { palette } = p.theme
  const title = (p.text ?? '').trim() || '标题'
  const subtitle = (p.subtitle ?? '').trim()

  // 整封面深 accent 实色（暗黑模式免疫 + 白字基底）
  const bg = darkSafeBg(W, H, palette.accentDeep)

  const padX = 80
  const innerW = W - padX * 2

  // 白色低透明网格残迹（2 竖 + 2 横，不满铺，仅留构成主义肌理签名）
  const whiteGrid = palette.paper
  const gridParts: string[] = [
    rect({ x: 360, y: 0, width: 1, height: H, fill: whiteGrid, opacity: 0.1 }),
    rect({ x: 760, y: 0, width: 1, height: H, fill: whiteGrid, opacity: 0.1 }),
    rect({ x: 0, y: 200, width: W, height: 1, fill: whiteGrid, opacity: 0.1 }),
    rect({ x: 0, y: 460, width: W, height: 1, fill: whiteGrid, opacity: 0.1 }),
  ]

  // 低调白交点圆点（单点签名，替代原 accent 交点）
  const accentDot = circle({ cx: 360, cy: 200, r: 8, fill: whiteGrid, opacity: 0.5 })

  // 白底 chip + accentDeep 文字（彩底上反差最大）
  const kicker = kickerChip({
    x: 80,
    y: 80,
    label: personaKicker(p.theme.persona),
    accent: palette.paper,
    onAccent: palette.accentDeep,
    font: COVER_FONT_SANS,
  })

  // 右侧白报头（nameplate）：墨铸 + MOZHU PRESS · SERIAL（全白字，彩底）。
  const namePlate = textLine({
    x: 1000,
    y: 88,
    text: '墨铸',
    fill: palette.paper,
    fontSize: 36,
    fontWeight: 700,
    fontFamily: COVER_FONT_SERIF,
    anchor: 'end',
    letterSpacing: 4,
  })
  const namePlateSub = textLine({
    x: 1000,
    y: 122,
    text: 'MOZHU PRESS · SERIAL',
    fill: palette.paper,
    fontSize: 20,
    fontWeight: 600,
    fontFamily: COVER_FONT_SANS,
    anchor: 'end',
    letterSpacing: 4,
    opacity: 0.7,
  })

  // 超大白标题（字重 800）。可用宽 = innerW = 920；fitCharsPerLine(920,100,2)=9。
  const titleLines = splitLines(title, fitCharsPerLine(innerW, 100, 2), 2)
  const titleStartY = 330
  const titleLineH = 120
  const titleNodes = titleLines
    .map((line, idx) =>
      textLine({
        x: padX,
        y: titleStartY + idx * titleLineH,
        text: line,
        fill: palette.paper,
        fontSize: 100,
        fontWeight: 800,
        fontFamily: COVER_FONT_SANS,
        letterSpacing: 2,
      }),
    )
    .join('')

  // 重 白 tab（标题末行下方）
  const tabY = titleStartY + (titleLines.length - 1) * titleLineH + 28
  const tab = rect({ x: padX, y: tabY, width: 96, height: 12, fill: palette.paper })

  // 双细线报头规则（白 opacity 0.3，彩底报头质感）
  const ruleY = tabY + 40
  const ruleW = innerW
  const doubleRule =
    rect({ x: padX, y: ruleY, width: ruleW, height: 1, fill: palette.paper, opacity: 0.3 }) +
    rect({ x: padX, y: ruleY + 8, width: ruleW, height: 1, fill: palette.paper, opacity: 0.3 })

  const subtitleNode = subtitle
    ? textLine({
        x: padX,
        y: ruleY + 50,
        text: splitLines(subtitle, 24, 1)[0] ?? '',
        fill: palette.paper,
        fontSize: 28,
        fontWeight: 400,
        fontFamily: COVER_FONT_SANS,
        opacity: 0.85,
        letterSpacing: 1,
      })
    : ''

  // 右下角白方印（彩底上白印反差最大：fill=paper, textColor=accentDeep）。
  const seal = renderSeal({
    cx: W - 120,
    cy: H - 110,
    size: 120,
    fill: palette.paper,
    textColor: palette.accentDeep,
    font: COVER_FONT_SERIF,
  })

  return svgSection({
    moduleId: 'cover-grid',
    viewBoxW: W,
    viewBoxH: H,
    body:
      bg +
      gridParts.join('') +
      accentDot +
      kicker +
      namePlate +
      namePlateSub +
      titleNodes +
      tab +
      doubleRule +
      subtitleNode +
      seal,
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
