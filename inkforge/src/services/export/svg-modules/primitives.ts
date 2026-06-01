/**
 * 安全 SVG 原子构造器 — 见 prompts/0601/SPEC.md §4.1。
 *
 * 只产微信安全子集。所有构造器输出可直接拼接，整体必须通过 assertWechatSafe。
 * 硬规则编码进构造器：
 * - 外层 <svg> 必带 viewBox + width="100%"，绝不固定 px。
 * - 包裹一律 <section>，绝不 <div>。
 * - transform 只走 XML 属性（非 style），颜色 hex/rgba（非 var）。
 * - 模块根 <section> 带 data-ink-svg 幂等哨兵。
 */

export type AttrVal = string | number | undefined

/** XML 文本内容转义（属性值由内部受控，不在此转义）。 */
export function escapeXml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function attrs(map: Record<string, AttrVal>): string {
  return Object.entries(map)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')
}

// ─── 几何 ────────────────────────────────────────────────────────────────

export interface RectOpts {
  x?: AttrVal
  y?: AttrVal
  width: AttrVal
  height: AttrVal
  rx?: AttrVal
  ry?: AttrVal
  fill?: string
  stroke?: string
  strokeWidth?: AttrVal
  opacity?: AttrVal
  transform?: string
}
export function rect(o: RectOpts): string {
  return `<rect ${attrs({
    x: o.x,
    y: o.y,
    width: o.width,
    height: o.height,
    rx: o.rx,
    ry: o.ry,
    fill: o.fill,
    stroke: o.stroke,
    'stroke-width': o.strokeWidth,
    opacity: o.opacity,
    transform: o.transform,
  })} />`
}

export interface CircleOpts {
  cx: AttrVal
  cy: AttrVal
  r: AttrVal
  fill?: string
  stroke?: string
  strokeWidth?: AttrVal
  opacity?: AttrVal
}
export function circle(o: CircleOpts): string {
  return `<circle ${attrs({
    cx: o.cx,
    cy: o.cy,
    r: o.r,
    fill: o.fill,
    stroke: o.stroke,
    'stroke-width': o.strokeWidth,
    opacity: o.opacity,
  })} />`
}

export interface PathOpts {
  fill?: string
  stroke?: string
  strokeWidth?: AttrVal
  opacity?: AttrVal
  transform?: string
  strokeLinecap?: string
}
export function path(d: string, o: PathOpts = {}): string {
  return `<path ${attrs({
    d,
    fill: o.fill ?? 'none',
    stroke: o.stroke,
    'stroke-width': o.strokeWidth,
    'stroke-linecap': o.strokeLinecap,
    opacity: o.opacity,
    transform: o.transform,
  })} />`
}

/** 分隔细线 = 1px 高 rect（微信用 rect 而非 <line>）。 */
export function hairlineRule(o: { x: AttrVal; y: AttrVal; width: AttrVal; height?: AttrVal; fill: string; opacity?: AttrVal }): string {
  return rect({ x: o.x, y: o.y, width: o.width, height: o.height ?? 1, fill: o.fill, opacity: o.opacity })
}

/** 大半径低透明度圆 = 光晕（替代被禁的 SVG filter）。 */
export function glow(cx: AttrVal, cy: AttrVal, r: AttrVal, colorSoft: string): string {
  return circle({ cx, cy, r, fill: colorSoft })
}

// ─── 文字（每视觉行一个 <text>） ──────────────────────────────────────────

export interface TextLineOpts {
  x: AttrVal
  y: AttrVal
  text: string
  fill: string
  fontSize?: AttrVal
  fontWeight?: AttrVal
  fontFamily?: string
  anchor?: 'start' | 'middle' | 'end'
  opacity?: AttrVal
  letterSpacing?: AttrVal
}
export function textLine(o: TextLineOpts): string {
  return `<text ${attrs({
    x: o.x,
    y: o.y,
    fill: o.fill,
    'font-size': o.fontSize,
    'font-weight': o.fontWeight,
    'font-family': o.fontFamily,
    'text-anchor': o.anchor,
    'letter-spacing': o.letterSpacing,
    opacity: o.opacity,
  })}>${escapeXml(o.text)}</text>`
}

// ─── 品牌签名几何 ──────────────────────────────────────────────────────────

/** 单个菱形（45° 方块），用 path 而非 transform 旋转，避免 style transform 风险。 */
export function diamond(cx: number, cy: number, r: number, fill: string, opacity?: number): string {
  const d = `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`
  return path(d, { fill, opacity })
}

/** ◇◇◇ 品牌签名线（三菱形）。 */
export function diamondSig(o: { cx: number; cy: number; r: number; fill: string; gap?: number }): string {
  const gap = o.gap ?? o.r * 3
  return [-1, 0, 1].map((i) => diamond(o.cx + i * gap, o.cy, o.r, o.fill)).join('')
}

// ─── 包裹与脚手架 ──────────────────────────────────────────────────────────

export interface SvgSectionOpts {
  /** data-ink-svg 哨兵值（模块 id） */
  moduleId: string
  viewBoxW: number
  viewBoxH: number
  /** svg 内部内容 */
  body: string
  /** <section> 内联样式（默认上下留白） */
  sectionStyle?: string
  /** <svg> 额外内联样式（display:block 已内置） */
  svgStyle?: string
}
/**
 * 模块根包裹：<section data-ink-svg><svg viewBox width="100%">…</svg></section>。
 * width="100%" + viewBox 保证 375/677px 自适应，不破坏 20-22 字/行。
 */
export function svgSection(o: SvgSectionOpts): string {
  const secStyle = o.sectionStyle ?? 'margin:24px 0;'
  const svgStyle = `display:block;${o.svgStyle ?? ''}`
  return (
    `<section data-ink-svg="${o.moduleId}" style="${secStyle}">` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.viewBoxW} ${o.viewBoxH}" width="100%" style="${svgStyle}">` +
    o.body +
    `</svg></section>`
  )
}

/** 顶部隐藏全文（无障碍/SEO），用安全隐藏样式（不用 position:absolute/clip，避免被剥）。 */
export function hiddenFulltext(text: string): string {
  return `<p style="height:0;line-height:0;font-size:0;color:transparent;overflow:hidden;">${escapeXml(text)}</p>`
}

/** 微信编辑器期望的尾标。 */
export function mpStyleTrailer(): string {
  return '<p style="display:none;"><mp-style-type data-value="10000"></mp-style-type></p>'
}

/** 深色模块自有不透明背景 rect（暗黑模式免疫）。 */
export function darkSafeBg(w: number, h: number, color: string): string {
  return rect({ x: 0, y: 0, width: w, height: h, fill: color })
}

// ─── SMIL（仅 interactive 族用；preview/wechat allowMotion 时） ────────────

export interface SmilAnimateOpts {
  attributeName: string
  values: string
  dur: string
  begin?: string
  keyTimes?: string
  keySplines?: string
  calcMode?: string
  repeatCount?: AttrVal
  fill?: string
  restart?: string
}
export function smilAnimate(o: SmilAnimateOpts): string {
  return `<animate ${attrs({
    attributeName: o.attributeName,
    values: o.values,
    dur: o.dur,
    begin: o.begin,
    keyTimes: o.keyTimes,
    keySplines: o.keySplines,
    calcMode: o.calcMode,
    repeatCount: o.repeatCount,
    fill: o.fill ?? 'freeze',
    restart: o.restart ?? 'never',
  })} />`
}

export function smilSet(o: { attributeName: string; to: string; begin?: string; dur?: string }): string {
  return `<set ${attrs({
    attributeName: o.attributeName,
    to: o.to,
    begin: o.begin,
    dur: o.dur,
    fill: 'freeze',
  })} />`
}

export function smilAnimateTransform(o: {
  type: 'translate' | 'scale' | 'rotate'
  values: string
  dur: string
  begin?: string
  keySplines?: string
  calcMode?: string
  restart?: string
}): string {
  return `<animateTransform ${attrs({
    attributeName: 'transform',
    type: o.type,
    values: o.values,
    dur: o.dur,
    begin: o.begin,
    keySplines: o.keySplines,
    calcMode: o.calcMode,
    fill: 'freeze',
    restart: o.restart ?? 'never',
  })} />`
}
