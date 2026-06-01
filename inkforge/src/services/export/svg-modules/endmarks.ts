/**
 * 文末签名 / 结束标 — 见 prompts/0601/SPEC.md §8。
 *
 * 三变体：
 * - endmark-fin     ：◇◇◇ + 「全文完」
 * - endmark-vessel  ：品牌 vessel mark（鼎 × 笔尖 × 方格）+ 署名
 * - endmark-rule    ：短细线 + 居中署名
 *
 * 铁律：
 * - 仅微信安全子集（assertWechatSafe 由 wechat-safe 校验）；纯 <path>/<rect>/<circle>/<text>。
 * - viewBox 1080×200，居中留白，<svg width="100%"> 由 svgSection 注入。
 * - 颜色全部从 p.theme.palette 取 hex/rgba；不引入 var()/calc()/class/<style>。
 * - 每模块 ember 用量 ≤1（vessel 上一处 ember 点缀，作为「铸」记号）。
 * - vessel-mark 绝不使用水平整宽条带矩形（国旗陷阱，见 feedback_logo_flag_trap）；
 *   构图：鼎(ding) 容器轮廓 + 顶部下沉的笔尖(nib) + 鼎下的方格(grid square) 基座。
 */
import {
  diamondSig,
  hairlineRule,
  path,
  rect,
  svgSection,
  textLine,
} from './primitives'
import type { SvgModuleParams, SvgModuleSpec } from './types'

// 共享几何常量 —— 1080 宽布板的中线与基本字号
const VBW = 1080
const VBH = 200
const CX = VBW / 2

/**
 * CJK 设备字体栈 —— 与品牌色板一致，全程设备字体，不嵌字。
 * font-family 写进 SVG 表现属性（双引号包裹），多词字体名用单引号以免提前终止属性。
 */
const FONT_CJK = "'PingFang SC', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif"

// ─── endmark-fin ─────────────────────────────────────────────────────────
function renderFin(p: SvgModuleParams): string {
  const { palette } = p.theme
  const text = p.text ?? '全文完'
  // ◇◇◇ 放在上方，文字在下方，整体 200 高度内居中分布。
  const sigY = 70
  const textY = 138
  const body =
    diamondSig({ cx: CX, cy: sigY, r: 7, fill: palette.accent, gap: 28 }) +
    textLine({
      x: CX,
      y: textY,
      text,
      fill: palette.inkSoft,
      fontSize: 30,
      fontFamily: FONT_CJK,
      anchor: 'middle',
      letterSpacing: 8,
    })
  return svgSection({ moduleId: 'endmark-fin', viewBoxW: VBW, viewBoxH: VBH, body })
}

// ─── endmark-vessel ──────────────────────────────────────────────────────

/** vessel mark 几何参数：中心点 + 缩放（1 = 原始紧凑徽章尺度）。 */
export interface VesselMarkOpts {
  /** mark 中心 x */
  cx: number
  /** mark 中心 y */
  cy: number
  /** 缩放系数（默认 1，原始 ≈ 96px 高 viewBox 内的紧凑徽章） */
  scale?: number
  ink: string
  accent: string
  hairline: string
  ember: string
  /** 笔尖中缝色（通常 = paper，用于在 accent 笔尖上勾出裂线） */
  paper: string
}

/**
 * 品牌 vessel mark：鼎(ding) × 笔尖(nib) × 方格(grid square)。
 * 只返回 mark 的 SVG 几何片段（不含 <section>/<svg> 包裹，不含署名行），
 * 供 endmark-vessel 与 footer 落款卡共享（DRY）。
 *
 * 构图（居中、紧凑徽章）：
 *   - 鼎：一只小型三足容器轮廓（path），含腹、口、双耳、三足。
 *   - 笔尖：从鼎口正上方垂入鼎腹的细长三角（path），象征「以笔铸字」。
 *   - 方格：鼎下方居中的小方块（rect），作为「方寸之印」基座。
 *   - 铸记：鼎肩一颗极小 ember 圆点（每模块 ≤1）。
 * 绝不堆叠成 3 条整宽水平 rect（国旗陷阱）。
 */
export function renderVesselMark(o: VesselMarkOpts): string {
  const { ink, accent, hairline, ember, paper } = o
  const s = o.scale ?? 1
  const mx = o.cx
  const my = o.cy
  // 缩放后的描边宽度，保持笔触比例。
  const sw = (n: number) => Number((n * s).toFixed(3))

  // 鼎主体轮廓（容器腹 + 口沿）。一笔 path 绘出口、肩、腹、底；用细描边表现金石感。
  // 口宽 56，肩宽 76，腹宽 64，底宽 50。坐标全部相对中心 × scale。
  const P = (dx: number, dy: number) => `${Number((mx + dx * s).toFixed(3))},${Number((my + dy * s).toFixed(3))}`
  const dingPath = [
    `M${P(-28, -28)}`,
    `L${P(28, -28)}`,
    `L${P(38, -22)}`,
    `L${P(32, 8)}`,
    `L${P(25, 22)}`,
    `L${P(-25, 22)}`,
    `L${P(-32, 8)}`,
    `L${P(-38, -22)}`,
    `Z`,
  ].join(' ')

  const earL = rect({
    x: Number((mx - 44 * s).toFixed(3)),
    y: Number((my - 36 * s).toFixed(3)),
    width: sw(8),
    height: sw(12),
    rx: sw(2),
    ry: sw(2),
    fill: 'none',
    stroke: ink,
    strokeWidth: sw(1.6),
  })
  const earR = rect({
    x: Number((mx + 36 * s).toFixed(3)),
    y: Number((my - 36 * s).toFixed(3)),
    width: sw(8),
    height: sw(12),
    rx: sw(2),
    ry: sw(2),
    fill: 'none',
    stroke: ink,
    strokeWidth: sw(1.6),
  })

  const legL = path(`M${P(-22, 22)} L${P(-26, 38)}`, { stroke: ink, strokeWidth: sw(1.8), strokeLinecap: 'round' })
  const legM = path(`M${P(0, 22)} L${P(0, 38)}`, { stroke: ink, strokeWidth: sw(1.8), strokeLinecap: 'round' })
  const legR = path(`M${P(22, 22)} L${P(26, 38)}`, { stroke: ink, strokeWidth: sw(1.8), strokeLinecap: 'round' })

  const belt = path(`M${P(-18, -4)} L${P(18, -4)}`, { stroke: hairline, strokeWidth: sw(1) })

  const nibPath = [`M${P(-5, -56)}`, `L${P(5, -56)}`, `L${P(2, -6)}`, `L${P(0, 2)}`, `L${P(-2, -6)}`, `Z`].join(' ')
  const nibSlit = path(`M${P(0, -50)} L${P(0, -14)}`, { stroke: paper, strokeWidth: sw(0.8), opacity: 0.85 })

  const grid = rect({
    x: Number((mx - 8 * s).toFixed(3)),
    y: Number((my + 44 * s).toFixed(3)),
    width: sw(16),
    height: sw(16),
    fill: 'none',
    stroke: ink,
    strokeWidth: sw(1.4),
  })
  const gridCrossV = path(`M${P(0, 44)} L${P(0, 60)}`, { stroke: hairline, strokeWidth: sw(0.8) })
  const gridCrossH = path(`M${P(-8, 52)} L${P(8, 52)}`, { stroke: hairline, strokeWidth: sw(0.8) })

  const emberDot = `<circle cx="${Number((mx + 34 * s).toFixed(3))}" cy="${Number((my - 30 * s).toFixed(3))}" r="${sw(2.4)}" fill="${ember}" />`

  const ding = path(dingPath, { fill: 'none', stroke: ink, strokeWidth: sw(1.8) })
  const nib = path(nibPath, { fill: accent })

  return (
    ding + belt + earL + earR + legL + legM + legR + nib + nibSlit + grid + gridCrossV + gridCrossH + emberDot
  )
}

function renderVessel(p: SvgModuleParams): string {
  const { palette } = p.theme
  const subtitle = p.subtitle ?? p.text ?? 'InkForge · 墨铸'

  // 徽章中心略偏上，让下方留出署名行空间。
  const mark = renderVesselMark({
    cx: CX,
    cy: 80,
    scale: 1,
    ink: palette.ink,
    accent: palette.accent,
    hairline: palette.hairline,
    ember: palette.ember,
    paper: palette.paper,
  })

  // 署名行 + 上方一段短细线作为压版尺。
  const sigLine = hairlineRule({
    x: CX - 90,
    y: 150,
    width: 180,
    height: 1,
    fill: palette.hairline,
  })
  const sigText = textLine({
    x: CX,
    y: 178,
    text: subtitle,
    fill: palette.inkSoft,
    fontSize: 22,
    fontFamily: FONT_CJK,
    anchor: 'middle',
    letterSpacing: 4,
  })

  const body = mark + sigLine + sigText

  return svgSection({ moduleId: 'endmark-vessel', viewBoxW: VBW, viewBoxH: VBH, body })
}

// ─── endmark-rule ────────────────────────────────────────────────────────
function renderRule(p: SvgModuleParams): string {
  const { palette } = p.theme
  const text = p.text ?? '全文完'
  // 一段短居中细线 + 下方居中署名（克制留白）。
  const ruleY = 92
  const ruleWidth = 160
  const body =
    hairlineRule({
      x: CX - ruleWidth / 2,
      y: ruleY,
      width: ruleWidth,
      height: 1,
      fill: palette.hairline,
    }) +
    textLine({
      x: CX,
      y: 140,
      text,
      fill: palette.inkSoft,
      fontSize: 26,
      fontFamily: FONT_CJK,
      anchor: 'middle',
      letterSpacing: 10,
    })
  return svgSection({ moduleId: 'endmark-rule', viewBoxW: VBW, viewBoxH: VBH, body })
}

// ─── 注册表 ──────────────────────────────────────────────────────────────
export const endmarkModules: SvgModuleSpec[] = [
  {
    id: 'endmark-fin',
    family: 'endmark',
    description: '◇◇◇ 品牌签名行 + 「全文完」小字',
    render: renderFin,
  },
  {
    id: 'endmark-vessel',
    family: 'endmark',
    description: '品牌 vessel mark（鼎×笔尖×方格）+ 署名',
    render: renderVessel,
  },
  {
    id: 'endmark-rule',
    family: 'endmark',
    description: '短细线压版尺 + 居中署名',
    render: renderRule,
  },
]
