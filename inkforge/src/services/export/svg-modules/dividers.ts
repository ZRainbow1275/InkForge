/**
 * dividers.ts — R1.2 分隔线/装饰线模块族（5 变体）。
 *
 * 见 prompts/0601/SPEC.md §8。设计语言「静谧刊印」：
 * 克制构成主义、绝不秀米-stock、不撞市面。
 *
 * 安全铁律（assertWechatSafe 强制）：
 * - 仅产微信安全子集（无 class/<style>/var()/calc()/<div>/defs/gradient/clip/mask/filter/use）。
 * - 「渐隐」效果用多段阶梯透明 rect 拼出，绝不 <linearGradient>（依赖 id，微信剥）。
 * - 「光晕」用大半径低透明 <circle>（glow 原子），绝不 <filter>。
 * - 线条全部用 hairlineRule（1px rect），不用 <line>。
 * - 颜色一律取自 p.theme.palette（hex/rgba）；ember 每模块 ≤1 次。
 */
import { circle, diamond, glow, hairlineRule, rect, svgSection, textLine } from './primitives'
import type { SvgModuleParams, SvgModuleSpec } from './types'

// 视觉中心 & 标准 viewBox
const VBW = 1080
const VBH = 60

/** 可选小写居中标签（small caps 风），text-anchor=middle。 */
function centeredLabel(text: string | undefined, y: number, fill: string): string {
  if (!text) return ''
  return textLine({
    x: VBW / 2,
    y,
    text,
    fill,
    anchor: 'middle',
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: 4,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    opacity: 0.7,
  })
}

// ─── divider-grid ─────────────────────────────────────────────────────────
// 品牌母题（加重）：中央 2×2 方格（vessel mark 的方格母题）——accent 描边外框 +
// 一格 accent 实心小方 + 内部十字细线 + 两侧 hairline 长线。一眼可辨的品牌分隔符。
function renderGrid(p: SvgModuleParams): string {
  const { hairline, accent, accentSoft } = p.theme.palette
  const cy = VBH / 2
  const cx = VBW / 2
  // 2×2 方格：外框边长 28，左上格填实心 accent，其余描边。
  const box = 28
  const cell = box / 2
  const gx = cx - cell
  const gy = cy - cell
  const gridParts: string[] = [
    // 左上格实心 accent（品牌焦点）
    rect({ x: gx, y: gy, width: cell, height: cell, fill: accent }),
    // 右下格淡彩 accentSoft（呼应）
    rect({ x: gx + cell, y: gy + cell, width: cell, height: cell, fill: accentSoft }),
    // 外框（4 边 1px accent 描边 → 4 条 rect）
    rect({ x: gx, y: gy, width: box, height: 1, fill: accent }),
    rect({ x: gx, y: gy + box, width: box, height: 1, fill: accent }),
    rect({ x: gx, y: gy, width: 1, height: box, fill: accent }),
    rect({ x: gx + box, y: gy, width: 1, height: box, fill: accent }),
    // 内部十字细线（accent，分出 2×2）
    rect({ x: gx + cell, y: gy, width: 1, height: box, fill: accent }),
    rect({ x: gx, y: gy + cell, width: box, height: 1, fill: accent }),
  ]

  // 两侧 hairline 长线
  const margin = 48
  const ruleW = 360
  const ruleLeft = hairlineRule({ x: cx - margin - ruleW, y: cy, width: ruleW, fill: hairline })
  const ruleRight = hairlineRule({ x: cx + margin, y: cy, width: ruleW, fill: hairline })

  const label = centeredLabel(p.text, cy + 34, p.theme.palette.inkSoft)

  return svgSection({
    moduleId: 'divider-grid',
    viewBoxW: VBW,
    viewBoxH: VBH,
    body: ruleLeft + ruleRight + gridParts.join('') + label,
  })
}

// ─── divider-dots ─────────────────────────────────────────────────────────
// 五点居中：中间 accent 实心，两侧 inkSoft，更外两侧 hairline，节奏感强。
function renderDots(p: SvgModuleParams): string {
  const { hairline, ink, accent } = p.theme.palette
  const cy = VBH / 2
  const gap = 22
  const r = 4
  const cx = VBW / 2
  // [-2,-1,0,1,2]
  const dots = [
    circle({ cx: cx - 2 * gap, cy, r: 2, fill: hairline }),
    circle({ cx: cx - gap, cy, r: 3, fill: ink, opacity: 0.4 }),
    circle({ cx, cy, r, fill: accent }),
    circle({ cx: cx + gap, cy, r: 3, fill: ink, opacity: 0.4 }),
    circle({ cx: cx + 2 * gap, cy, r: 2, fill: hairline }),
  ].join('')

  const label = centeredLabel(p.text, cy + 30, p.theme.palette.inkSoft)

  return svgSection({
    moduleId: 'divider-dots',
    viewBoxW: VBW,
    viewBoxH: VBH,
    body: dots + label,
  })
}

// ─── divider-fade ─────────────────────────────────────────────────────────
// 多段实色 rect 拼接的「假渐隐」线 —— 中央最浓两端最淡。
// CRITICAL: 不使用 <linearGradient>（依赖 id，微信剥后失效）。
function renderFade(p: SvgModuleParams): string {
  const { ink } = p.theme.palette
  const cy = VBH / 2
  const segCount = 21 // 奇数，正中央一段最浓
  const segW = 24
  const segGap = 2
  const totalW = segCount * segW + (segCount - 1) * segGap
  const startX = (VBW - totalW) / 2
  const center = (segCount - 1) / 2
  const segs: string[] = []
  for (let i = 0; i < segCount; i++) {
    // 距离中心的归一化 [0,1]
    const d = Math.abs(i - center) / center
    // 中央 0.85，两端 0.0；阶梯感（不写满 1 以避免视觉撞硬）
    const op = Math.max(0, 0.85 * (1 - d))
    // op==0 的段干脆不画，省字节
    if (op <= 0.02) continue
    const x = startX + i * (segW + segGap)
    segs.push(rect({ x, y: cy, width: segW, height: 1, fill: ink, opacity: Number(op.toFixed(2)) }))
  }

  const label = centeredLabel(p.text, cy + 30, p.theme.palette.inkSoft)

  return svgSection({
    moduleId: 'divider-fade',
    viewBoxW: VBW,
    viewBoxH: VBH,
    body: segs.join('') + label,
  })
}

// ─── divider-diamond ──────────────────────────────────────────────────────
// 品牌签名（加重）：中央实心 accent 大菱形（R≈14）+ 左右各一枚 accentSoft 小菱形
// （R≈8）+ 两侧 hairline 长线。一眼可辨的「墨铸」金石菱形分隔符。
function renderDiamond(p: SvgModuleParams): string {
  const { accent, accentSoft, hairline } = p.theme.palette
  const cy = VBH / 2
  const cx = VBW / 2
  const bigR = 14
  const smallR = 8
  const sideGap = 40 // 大菱形中心到小菱形中心
  const centerBig = diamond(cx, cy, bigR, accent)
  const sideLeft = diamond(cx - sideGap, cy, smallR, accentSoft)
  const sideRight = diamond(cx + sideGap, cy, smallR, accentSoft)
  const sig = sideLeft + centerBig + sideRight

  // 三菱形占位约到 cx ± (sideGap + smallR) = ±48 → 取 72 留呼吸
  const sigHalfWidth = 72
  const ruleW = 340
  const leftX = cx - sigHalfWidth - ruleW
  const rightX = cx + sigHalfWidth
  const ruleLeft = hairlineRule({ x: leftX, y: cy, width: ruleW, fill: hairline })
  const ruleRight = hairlineRule({ x: rightX, y: cy, width: ruleW, fill: hairline })

  const label = centeredLabel(p.text, cy + 30, p.theme.palette.inkSoft)

  return svgSection({
    moduleId: 'divider-diamond',
    viewBoxW: VBW,
    viewBoxH: VBH,
    body: ruleLeft + ruleRight + sig + label,
  })
}

// ─── divider-forge ────────────────────────────────────────────────────────
// Forge Line — 品牌「ember」可在此模块出现一次：
// 中央 ember 光晕（低透明大圆）+ ember 小实点 + 两侧 hairline 长线。
function renderForge(p: SvgModuleParams): string {
  const { ember, accentSoft, hairline } = p.theme.palette
  const cy = VBH / 2
  // 光晕：用 ember 系列的极低透明大圆。glow 原子需要软色 → 我们直接传一个 rgba。
  // 这里复用 accentSoft（与品牌色协调）作为软光基底；ember 自身只用一次（实心点）。
  const halo = glow(VBW / 2, cy, 22, accentSoft)
  // ember 实心点（加大；每屏 ≤1 次自律：本模块全树只此一处用 ember）
  const emberDot = circle({ cx: VBW / 2, cy, r: 6, fill: ember })

  const ruleW = 380
  const margin = 48 // 距中心（随光晕加大略增）
  const ruleLeft = hairlineRule({ x: VBW / 2 - margin - ruleW, y: cy, width: ruleW, fill: hairline })
  const ruleRight = hairlineRule({ x: VBW / 2 + margin, y: cy, width: ruleW, fill: hairline })

  const label = centeredLabel(p.text, cy + 30, p.theme.palette.inkSoft)

  // glow 在最底层，dot 覆于其上
  return svgSection({
    moduleId: 'divider-forge',
    viewBoxW: VBW,
    viewBoxH: VBH,
    body: halo + ruleLeft + ruleRight + emberDot + label,
  })
}

// ─── 注册表 ───────────────────────────────────────────────────────────────
export const dividerModules: SvgModuleSpec[] = [
  {
    id: 'divider-grid',
    family: 'divider',
    description: '构成主义网格细线：基线 + 等距刻度 + 单根 accent 长竖。',
    render: renderGrid,
  },
  {
    id: 'divider-dots',
    family: 'divider',
    description: '点列：五个圆点居中，中间 accent，外侧渐弱。',
    render: renderDots,
  },
  {
    id: 'divider-fade',
    family: 'divider',
    description: 'opacity 渐隐线：多段实色 rect 拼出中浓两淡（非渐变元素）。',
    render: renderFade,
  },
  {
    id: 'divider-diamond',
    family: 'divider',
    description: '品牌签名 ◇◇◇ + 两侧 hairline 长线。',
    render: renderDiamond,
  },
  {
    id: 'divider-forge',
    family: 'divider',
    description: 'Forge Line：中央 accentSoft 光晕 + ember 实心点 + 两侧 hairline。',
    render: renderForge,
  },
]
