/**
 * Header 模块族 — 见 prompts/0601/SPEC.md §8。
 *
 * 4 个变体（全部 WeChat-safe；每个模块根带 data-ink-svg 哨兵）：
 *   - header-badge-num  圆形编号 + 标题 + 细线
 *   - header-bracket    四角括号框 + 居中标题
 *   - header-ribbon     实色 ribbon 标题条（onAccent 文字）
 *   - header-vrule      左竖线 accent + 标题 + 可选副题
 *
 * 设计纪律（参见 inkforge-brand-identity §4 + Quiet Press 记忆）：
 *   - 大量留白；不做「border-left 色块 + 背景块」PPT 套路。
 *   - palette 全部来自 p.theme.palette，禁 var()/class/<style>。
 *   - 每个模块最多用 1 次 ember；本族整体倾向 0 次（ember 留给 endmark/cover）。
 *   - <text> 不换行 → 标题一行；副题只在 vrule 变体支持一行。
 */
import { svgSection, rect, circle, path, textLine, hairlineRule } from './primitives'
import type { SvgModuleParams, SvgModuleSpec } from './types'

/**
 * CJK 显示字体栈（设备字体，无 web font 加载）。
 * 注意：font-family 写进 SVG 表现属性 `font-family="…"`（双引号包裹），内层多词
 * 字体名必须用单引号，否则双引号会提前终止属性（primitives.ts attrs() 不转义）。
 */
const CJK_DISPLAY = "-apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"

// ─── header-badge-num ────────────────────────────────────────────────────────
//   左圆形编号徽章 + 标题 + 标题下细线。
//   构图：圆心 (90,90) r=50；标题左对齐 x=180；hairline y=156 x=[180..1040]。

const VBW = 1080
const HB_VBH = 180

function renderBadgeNum(p: SvgModuleParams): string {
  const pal = p.theme.palette
  const title = p.text ?? ''
  const idx = String(p.index ?? 1)
  // 长编号字号略缩，避免溢出圆形
  const numSize = idx.length >= 3 ? 32 : idx.length === 2 ? 40 : 44

  const body =
    circle({ cx: 90, cy: 90, r: 50, fill: pal.accent }) +
    textLine({
      x: 90,
      y: 90 + numSize / 3, // 视觉居中（baseline 微调）
      text: idx,
      fill: pal.onAccent,
      fontSize: numSize,
      fontWeight: 700,
      fontFamily: CJK_DISPLAY,
      anchor: 'middle',
    }) +
    textLine({
      x: 180,
      y: 108,
      text: title,
      fill: pal.ink,
      fontSize: 52,
      fontWeight: 600,
      fontFamily: CJK_DISPLAY,
      letterSpacing: 1,
    }) +
    hairlineRule({ x: 180, y: 152, width: 860, fill: pal.hairline })

  return svgSection({ moduleId: 'header-badge-num', viewBoxW: VBW, viewBoxH: HB_VBH, body })
}

// ─── header-bracket ──────────────────────────────────────────────────────────
//   四角 L 形括号 + 居中标题。括号长 60，距边距 40，stroke accent。
//   这是 inkforge 风格的「【】」边角变体，构成主义而非装饰主义。

const HBR_VBH = 220

function bracketCorner(x: number, y: number, len: number, dx: number, dy: number, stroke: string, sw: number): string {
  // (x,y) 为内拐点；(x+dx*len, y) 水平短边；(x, y+dy*len) 垂直短边
  const d = `M${x + dx * len},${y} L${x},${y} L${x},${y + dy * len}`
  return path(d, { stroke, strokeWidth: sw, strokeLinecap: 'square', fill: 'none' })
}

function renderBracket(p: SvgModuleParams): string {
  const pal = p.theme.palette
  const title = p.text ?? ''
  const sw = 4
  const len = 60
  // 内拐点坐标：四角内缩 40
  const left = 40
  const right = VBW - 40
  const top = 40
  const bot = HBR_VBH - 40

  const body =
    bracketCorner(left, top, len, +1, +1, pal.accent, sw) +
    bracketCorner(right, top, len, -1, +1, pal.accent, sw) +
    bracketCorner(left, bot, len, +1, -1, pal.accent, sw) +
    bracketCorner(right, bot, len, -1, -1, pal.accent, sw) +
    textLine({
      x: VBW / 2,
      y: HBR_VBH / 2 + 18,
      text: title,
      fill: pal.ink,
      fontSize: 56,
      fontWeight: 600,
      fontFamily: CJK_DISPLAY,
      anchor: 'middle',
      letterSpacing: 2,
    })

  return svgSection({ moduleId: 'header-bracket', viewBoxW: VBW, viewBoxH: HBR_VBH, body })
}

// ─── header-ribbon ───────────────────────────────────────────────────────────
//   实色 accent ribbon 条；标题在 onAccent 颜色（自动对比度）。
//   ribbon 留上下空气（不全幅），保留克制感。

const HRB_VBH = 180

function renderRibbon(p: SvgModuleParams): string {
  const pal = p.theme.palette
  const title = p.text ?? ''
  // 左右各内缩 24，留窄边白；高 100；上下留 40
  const x0 = 24
  const y0 = 40
  const w = VBW - 48
  const h = 100

  const body =
    rect({ x: x0, y: y0, width: w, height: h, fill: pal.accent }) +
    textLine({
      x: VBW / 2,
      y: y0 + h / 2 + 16, // baseline 微调
      text: title,
      fill: pal.onAccent,
      fontSize: 48,
      fontWeight: 600,
      fontFamily: CJK_DISPLAY,
      anchor: 'middle',
      letterSpacing: 2,
    })

  return svgSection({ moduleId: 'header-ribbon', viewBoxW: VBW, viewBoxH: HRB_VBH, body })
}

// ─── header-vrule ────────────────────────────────────────────────────────────
//   左竖线 accent + 标题 + 可选副题（inkSoft）。
//   竖线高度随是否有副题伸缩；标题与副题左对齐到 x=100。

function renderVRule(p: SvgModuleParams): string {
  const pal = p.theme.palette
  const title = p.text ?? ''
  const subtitle = p.subtitle ?? ''
  const hasSub = subtitle.length > 0
  const vbh = hasSub ? 200 : 160

  const barH = hasSub ? 130 : 90
  const barY = (vbh - barH) / 2

  const titleY = hasSub ? 90 : vbh / 2 + 18
  const subY = titleY + 50

  const body =
    rect({ x: 60, y: barY, width: 6, height: barH, fill: pal.accent }) +
    textLine({
      x: 100,
      y: titleY,
      text: title,
      fill: pal.ink,
      fontSize: 50,
      fontWeight: 600,
      fontFamily: CJK_DISPLAY,
      letterSpacing: 1,
    }) +
    (hasSub
      ? textLine({
          x: 100,
          y: subY,
          text: subtitle,
          fill: pal.inkSoft,
          fontSize: 28,
          fontWeight: 400,
          fontFamily: CJK_DISPLAY,
          letterSpacing: 1,
        })
      : '')

  return svgSection({ moduleId: 'header-vrule', viewBoxW: VBW, viewBoxH: vbh, body })
}

// ─── 注册表 ──────────────────────────────────────────────────────────────────

export const headerModules: SvgModuleSpec[] = [
  {
    id: 'header-badge-num',
    family: 'header',
    description: '圆形编号徽章 + 标题 + 标题下细线（克制的「企业级」H2 替代）',
    render: renderBadgeNum,
  },
  {
    id: 'header-bracket',
    family: 'header',
    description: '四角 L 形括号框 + 居中标题（构成主义边角，不撞秀米模版）',
    render: renderBracket,
  },
  {
    id: 'header-ribbon',
    family: 'header',
    description: '实色 accent ribbon 条 + onAccent 标题（自动对比度文字）',
    render: renderRibbon,
  },
  {
    id: 'header-vrule',
    family: 'header',
    description: '左竖线 accent + 标题 + 可选副题（Quiet Press 默认款）',
    render: renderVRule,
  },
]
