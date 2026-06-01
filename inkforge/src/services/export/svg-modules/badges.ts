/**
 * 徽章模块族（R1.4，badge family）— 见 prompts/0601/SPEC.md §8。
 *
 * 三种变体（小巧装饰，独占一段；viewBox 1080×140 留白居中）：
 * - `badge-num`：圆形编号徽章 + 可选标签（accent 填充 + onAccent 文字 + ink 标签）。
 * - `badge-kpi`：rounded-rect KPI 卡片，accentSoft 底 + accent 描边 + 大数字 + 小标签。
 * - `badge-tag`：rounded-rect 小标签（药丸），accentSoft 底 + accent 文字 + 极细描边。
 *
 * 美学：静谧刊印 · 克制装饰 · 不撞市面。每模块 ≤1 次 ember（本族零 ember）。
 * 渲染输出经 assertWechatSafe 把关；颜色取 p.theme.palette；transform 仅以属性形式。
 */
import {
  rect,
  circle,
  textLine,
  hairlineRule,
  svgSection,
} from './primitives'
import { assertWechatSafe } from './wechat-safe'
import type { SvgModuleParams, SvgModuleSpec } from './types'

// 共用度量：1080×140 画布，徽章主体居中竖向对齐
const VBW = 1080
const VBH = 140
const CY = VBH / 2

// 设备字体栈（CJK + Latin），与 research §1/text 行一致；不引入 web font
const FONT_STACK = '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'

function safe(out: string): string {
  // 开发期/测试期硬断言：任何违规即抛错，CI 守护
  assertWechatSafe(out)
  return out
}

// ─── badge-num ────────────────────────────────────────────────────────────
// 圆形编号 + 可选标签（标签在右侧 ink 色，与编号圆水平基线对齐）
function renderBadgeNum(p: SvgModuleParams): string {
  const { palette } = p.theme
  const idx = typeof p.index === 'number' ? p.index : 1
  const label = (p.text ?? '').trim()

  // 几何：圆心略偏左，留出标签空间；半径 36 → 直径 72，舒朗不局促
  const r = 36
  const hasLabel = label.length > 0
  // 无标签时居中；有标签时偏左 1/3 视觉中心
  const cx = hasLabel ? 380 : VBW / 2
  const labelX = cx + r + 28
  // 编号字号按位数小幅缩放，避免 3 位数撑破圆
  const digits = String(idx).length
  const numFont = digits >= 3 ? 32 : digits === 2 ? 38 : 44
  // 文字基线微调：text baseline ≈ y，视觉中心需上抬 ~font*0.35
  const numY = CY + numFont * 0.34

  const body =
    circle({ cx, cy: CY, r, fill: palette.accent }) +
    textLine({
      x: cx,
      y: numY,
      text: String(idx),
      fill: palette.onAccent,
      fontSize: numFont,
      fontWeight: 600,
      fontFamily: FONT_STACK,
      anchor: 'middle',
    }) +
    (hasLabel
      ? textLine({
          x: labelX,
          y: CY + 14,
          text: label,
          fill: palette.ink,
          fontSize: 38,
          fontWeight: 500,
          fontFamily: FONT_STACK,
          anchor: 'start',
          letterSpacing: 1,
        })
      : '')

  return safe(svgSection({ moduleId: 'badge-num', viewBoxW: VBW, viewBoxH: VBH, body }))
}

// ─── badge-kpi ────────────────────────────────────────────────────────────
// rounded-rect 卡片：大数字（p.text）+ 小标签（p.subtitle）竖向堆叠
function renderBadgeKpi(p: SvgModuleParams): string {
  const { palette } = p.theme
  const value = (p.text ?? '').trim() || '0'
  const sub = (p.subtitle ?? '').trim()

  // 卡片尺寸：宽 360 / 高 110，居中放置；rx=14 圆角；accent 1px 描边
  const cardW = 360
  const cardH = 110
  const cardX = (VBW - cardW) / 2
  const cardY = (VBH - cardH) / 2
  const cx = VBW / 2

  // 数字基线（视觉中心略上抬）/ 标签基线（卡片下半）
  const valueFont = 48
  const subFont = 22
  const valueY = sub ? cardY + 52 : cardY + cardH / 2 + valueFont * 0.34
  const subY = cardY + 88

  // 顶部细线（小装饰）：1px hairline 横跨卡片宽度，营造刊印感
  const ruleY = cardY + 26

  const body =
    rect({
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      rx: 14,
      ry: 14,
      fill: palette.accentSoft,
      stroke: palette.accent,
      strokeWidth: 1,
    }) +
    hairlineRule({
      x: cardX + 24,
      y: ruleY,
      width: cardW - 48,
      fill: palette.hairline,
    }) +
    textLine({
      x: cx,
      y: valueY,
      text: value,
      fill: palette.accent,
      fontSize: valueFont,
      fontWeight: 600,
      fontFamily: FONT_STACK,
      anchor: 'middle',
      letterSpacing: 1,
    }) +
    (sub
      ? textLine({
          x: cx,
          y: subY,
          text: sub,
          fill: palette.inkSoft,
          fontSize: subFont,
          fontWeight: 400,
          fontFamily: FONT_STACK,
          anchor: 'middle',
          letterSpacing: 2,
        })
      : '')

  return safe(svgSection({ moduleId: 'badge-kpi', viewBoxW: VBW, viewBoxH: VBH, body }))
}

// ─── badge-tag ────────────────────────────────────────────────────────────
// 药丸标签：accentSoft 底 + accent 文字 + 极细 hairline 描边
function renderBadgeTag(p: SvgModuleParams): string {
  const { palette } = p.theme
  const label = (p.text ?? '').trim() || '标签'

  // 宽度按字数估（中文 ≈ 32px/字 @38pt，再加左右 padding 36）
  const charW = 32
  const padX = 36
  // Array.from 处理代理对（含 emoji，但我们禁 emoji；中文/英文均按字符计）
  const charCount = Array.from(label).length
  const tagW = Math.max(140, charCount * charW + padX * 2)
  const tagH = 64
  const tagX = (VBW - tagW) / 2
  const tagY = (VBH - tagH) / 2
  const cx = VBW / 2
  const textY = tagY + tagH / 2 + 14 // 视觉居中

  const body =
    rect({
      x: tagX,
      y: tagY,
      width: tagW,
      height: tagH,
      rx: tagH / 2, // 完整药丸（半径=高一半）
      ry: tagH / 2,
      fill: palette.accentSoft,
      stroke: palette.hairline,
      strokeWidth: 1,
    }) +
    textLine({
      x: cx,
      y: textY,
      text: label,
      fill: palette.accent,
      fontSize: 32,
      fontWeight: 500,
      fontFamily: FONT_STACK,
      anchor: 'middle',
      letterSpacing: 2,
    })

  return safe(svgSection({ moduleId: 'badge-tag', viewBoxW: VBW, viewBoxH: VBH, body }))
}

export const badgeModules: SvgModuleSpec[] = [
  {
    id: 'badge-num',
    family: 'badge',
    description: '圆形编号徽章 + 可选标签（accent 填充圆 + onAccent 数字 + ink 标签）',
    render: renderBadgeNum,
  },
  {
    id: 'badge-kpi',
    family: 'badge',
    description: 'rounded-rect KPI 卡片：大数字 + 小标签（accentSoft 底 + accent 描边）',
    render: renderBadgeKpi,
  },
  {
    id: 'badge-tag',
    family: 'badge',
    description: '药丸标签：accentSoft 底 + accent 文字 + 极细 hairline 描边',
    render: renderBadgeTag,
  },
]
