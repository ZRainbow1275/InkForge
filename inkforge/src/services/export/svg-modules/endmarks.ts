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

/** CJK 设备字体栈 —— 与品牌色板一致，全程设备字体，不嵌字。 */
const FONT_CJK = 'PingFang SC, Hiragino Sans GB, Microsoft Yahei, sans-serif'

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
/**
 * 品牌 vessel mark：鼎(ding) × 笔尖(nib) × 方格(grid square)。
 *
 * 构图（居中、紧凑徽章）：
 *   - 鼎：一只小型三足容器轮廓（path），含腹、口、双耳、三足。
 *   - 笔尖：从鼎口正上方垂入鼎腹的细长三角（path），象征「以笔铸字」。
 *   - 方格：鼎下方居中的小方块（rect），作为「方寸之印」基座。
 *   - 铸记：鼎肩一颗极小 ember 圆点（每模块 ≤1）。
 * 绝不堆叠成 3 条整宽水平 rect（国旗陷阱）。
 */
function renderVessel(p: SvgModuleParams): string {
  const { palette } = p.theme
  const subtitle = p.subtitle ?? p.text ?? 'InkForge · 墨铸'
  const ink = palette.ink
  const accent = palette.accent
  const hairline = palette.hairline
  const ember = palette.ember

  // 徽章中心略偏上，让下方留出署名行空间。
  const mx = CX
  const my = 80 // mark center y

  // 鼎主体轮廓（容器腹 + 口沿）。一笔 path 绘出口、肩、腹、底；用细描边表现金石感。
  // 口宽 56，肩宽 76，腹宽 64，底宽 50。
  const dingPath = [
    `M${mx - 28},${my - 28}`, // 左口沿
    `L${mx + 28},${my - 28}`, // 右口沿
    `L${mx + 38},${my - 22}`, // 右肩外
    `L${mx + 32},${my + 8}`, // 右腹收
    `L${mx + 25},${my + 22}`, // 右底
    `L${mx - 25},${my + 22}`, // 左底
    `L${mx - 32},${my + 8}`,
    `L${mx - 38},${my - 22}`,
    `Z`,
  ].join(' ')

  // 鼎双耳：两个小弧（用闭合矩形+圆角近似，但避免横向条带感 —— 单独的小矩形）。
  const earL = rect({
    x: mx - 44,
    y: my - 36,
    width: 8,
    height: 12,
    rx: 2,
    ry: 2,
    fill: 'none',
    stroke: ink,
    strokeWidth: 1.6,
  })
  const earR = rect({
    x: mx + 36,
    y: my - 36,
    width: 8,
    height: 12,
    rx: 2,
    ry: 2,
    fill: 'none',
    stroke: ink,
    strokeWidth: 1.6,
  })

  // 三足：三条短斜线 path，左/中/右。
  const legL = path(`M${mx - 22},${my + 22} L${mx - 26},${my + 38}`, {
    stroke: ink,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
  })
  const legM = path(`M${mx},${my + 22} L${mx},${my + 38}`, {
    stroke: ink,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
  })
  const legR = path(`M${mx + 22},${my + 22} L${mx + 26},${my + 38}`, {
    stroke: ink,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
  })

  // 鼎腹腰线（金石分铸感）—— 中段一段短弧/横向短笔，宽度 < 鼎腹宽度，避免国旗条带。
  const beltD = `M${mx - 18},${my - 4} L${mx + 18},${my - 4}`
  const belt = path(beltD, { stroke: hairline, strokeWidth: 1 })

  // 笔尖：从鼎口正上方下沉的细长三角（尖端入腹）。
  const nibPath = [
    `M${mx - 5},${my - 56}`, // 笔尖左肩
    `L${mx + 5},${my - 56}`, // 笔尖右肩
    `L${mx + 2},${my - 6}`, // 入腹收口右
    `L${mx},${my + 2}`, // 笔尖入腹底点
    `L${mx - 2},${my - 6}`, // 入腹收口左
    `Z`,
  ].join(' ')

  // 笔尖中缝（小裂线），单条短 path —— 不形成全宽水平条。
  const nibSlit = path(`M${mx},${my - 50} L${mx},${my - 14}`, {
    stroke: palette.paper,
    strokeWidth: 0.8,
    opacity: 0.85,
  })

  // 方格：鼎下方的小方块基座（grid square），居中。
  const grid = rect({
    x: mx - 8,
    y: my + 44,
    width: 16,
    height: 16,
    fill: 'none',
    stroke: ink,
    strokeWidth: 1.4,
  })
  // 方格内一小十字格，强化「方格」语意（短笔，不全宽）。
  const gridCrossV = path(`M${mx},${my + 44} L${mx},${my + 60}`, {
    stroke: hairline,
    strokeWidth: 0.8,
  })
  const gridCrossH = path(`M${mx - 8},${my + 52} L${mx + 8},${my + 52}`, {
    stroke: hairline,
    strokeWidth: 0.8,
  })

  // 「铸」记 —— 鼎肩处一颗极小 ember 圆点（本模块唯一 ember 用量）。
  const emberDot = `<circle cx="${mx + 34}" cy="${my - 30}" r="2.4" fill="${ember}" />`

  // 署名行 + 上方一段短细线作为压版尺。
  const sigLineY = 150
  const sigLine = hairlineRule({
    x: CX - 90,
    y: sigLineY,
    width: 180,
    height: 1,
    fill: hairline,
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

  const ding = path(dingPath, { fill: 'none', stroke: ink, strokeWidth: 1.8 })
  const nib = path(nibPath, { fill: accent })

  const body =
    ding +
    belt +
    earL +
    earR +
    legL +
    legM +
    legR +
    nib +
    nibSlit +
    grid +
    gridCrossV +
    gridCrossH +
    emberDot +
    sigLine +
    sigText

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
