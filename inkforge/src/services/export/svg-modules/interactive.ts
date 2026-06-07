/**
 * SMIL 交互模块族（interactive family，i-* 变体）— 见 prompts/0601/SPEC.md §8。
 *
 * 这是唯一含「动效」的模块族。微信安全子集里唯一存活的动效是 SMIL
 * （<animate>/<set>/<animateTransform>，见 research §1 SMIL 表）；CSS animation/
 * transition/@keyframes 全被剥。横滑卡片走纯 CSS scroll-snap（无 SMIL）。
 *
 * 关键铁律（每个变体强制遵守，测试守护）：
 * - p.theme.allowMotion === true（preview/wechat）→ 直出 SMIL（begin="click" 或 "0s"，
 *   fill="freeze" restart="never"）。
 * - p.theme.allowMotion === false（xhs/zhihu，将被栅格化）→ 输出「静态首帧」：完全可见、
 *   无任何 <animate>/<set>，让 raster.ts 截到稳定一帧。
 * - 仅微信安全子集：<section>（绝不 <div>）+ <svg viewBox width="100%"> + <g>/<rect>/
 *   <circle>/<text>/<path> + SMIL；颜色 hex/rgba（取 p.theme.palette）；transform 仅属性。
 * - i-scrollcards 不用 display:flex（enforcePlatformCSS 会把它降级成 block）；用
 *   inline-block + white-space:nowrap + scroll-snap 搭横滑轨。
 *
 * 美学：静谧刊印 Quiet Press — 交互克制、不喧哗；几何作签名而非满铺纹理；本族零 ember。
 */
import {
  rect,
  textLine,
  hairlineRule,
  diamond,
  path,
  svgSection,
  smilAnimate,
} from './primitives'
import { assertWechatSafe } from './wechat-safe'
import type { SvgModuleParams, SvgModuleSpec, SvgScrollItem } from './types'

// 共用画布（1080 宽，width="100%" 让父容器决定真实宽度）
const W = 1080

// 设备字体栈（CJK + Latin），与其它族一致；不引入 web font。
// font-family 写进 SVG 表现属性（双引号包裹），内层多词字体名必须用单引号，
// 否则双引号会提前终止属性（primitives.ts attrs() 不转义）。
const FONT_STACK = "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"

function safe(out: string): string {
  // 开发期/测试期硬断言：任何违规即抛错，CI 守护
  assertWechatSafe(out)
  return out
}

/**
 * 按近似字符宽度把一行 CJK/拉丁混排硬切到 maxChars/行；超出 maxLines 用 '…' 收尾。
 * SVG <text> 不自动换行，故在拼装阶段切行（不用 <tspan>，避免不稳定特性）。
 */
function splitLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const src = String(text ?? '').trim()
  if (!src) return []
  const chars = Array.from(src)
  const lines: string[] = []
  let i = 0
  while (i < chars.length && lines.length < maxLines) {
    lines.push(chars.slice(i, i + maxCharsPerLine).join(''))
    i += maxCharsPerLine
  }
  if (i < chars.length && lines.length > 0) {
    const last = Array.from(lines[lines.length - 1])
    const cut = Math.max(0, Math.min(last.length, maxCharsPerLine - 1))
    lines[lines.length - 1] = last.slice(0, cut).join('') + '…'
  }
  return lines
}

/** 取 items 文案，缺省给样例（保证空入参也能渲染稳定的演示帧）。 */
function frameTitle(p: SvgModuleParams, idx: number, fallback: string): string {
  const item = p.items?.[idx]
  if (item?.title) return item.title.trim()
  if (idx === 0 && p.text) return p.text.trim()
  return fallback
}

// ─── i-clickswitch ──────────────────────────────────────────────────────────
// 点击切换 A→B：两层 <g>（帧 A opacity 1、帧 B opacity 0）。begin="click" 时
// B 0→1 且 A 1→0（fill="freeze" restart="never"）。透明全幅热区接收点击。
// 静态兜底（allowMotion=false）：只画帧 A，不放 SMIL。
function renderClickSwitch(p: SvgModuleParams): string {
  const { palette } = p.theme
  const motion = p.theme.allowMotion === true
  const H = 320

  const titleA = frameTitle(p, 0, '点我切换')
  const titleB = frameTitle(p, 1, '已切换')

  // 帧内容构造器：暖纸卡 + accent 细线 + 居中标题 + 角落小菱形签名
  const frame = (title: string, accentColor: string): string => {
    const card = rect({ x: 60, y: 50, width: W - 120, height: H - 100, rx: 18, ry: 18, fill: palette.paperWarm, stroke: palette.hairline, strokeWidth: 1 })
    const topRule = hairlineRule({ x: 100, y: 96, width: 160, height: 2, fill: accentColor })
    const titleLines = splitLines(title, 12, 2)
    const startY = titleLines.length > 1 ? 168 : 188
    const lineH = 66
    const text = titleLines
      .map((line, i) =>
        textLine({ x: W / 2, y: startY + i * lineH, text: line, fill: palette.ink, fontSize: 52, fontWeight: 600, fontFamily: FONT_STACK, anchor: 'middle', letterSpacing: 2 }),
      )
      .join('')
    const sig = diamond(W - 110, H - 86, 11, accentColor)
    return card + topRule + text + sig
  }

  // 提示文案（仅动态时显示「轻点卡片切换」）
  const hint = motion
    ? textLine({ x: W / 2, y: H - 30, text: '轻点切换', fill: palette.inkSoft, fontSize: 22, fontWeight: 400, fontFamily: FONT_STACK, anchor: 'middle', letterSpacing: 4 })
    : ''

  let body: string
  if (!motion) {
    // 静态首帧：只画帧 A，完全可见
    body = `<g opacity="1">${frame(titleA, palette.accent)}</g>` + hint
  } else {
    // 动态：A（默认可见）→ 点击淡出；B（默认隐藏）→ 点击淡入。
    const animOut = smilAnimate({ attributeName: 'opacity', values: '1;0', dur: '0.4s', begin: 'click', fill: 'freeze', restart: 'never' })
    const animIn = smilAnimate({ attributeName: 'opacity', values: '0;1', dur: '0.4s', begin: 'click', fill: 'freeze', restart: 'never' })
    const groupA = `<g opacity="1">${frame(titleA, palette.accent)}${animOut}</g>`
    const groupB = `<g opacity="0">${frame(titleB, palette.accent)}${animIn}</g>`
    // 透明全幅热区（最上层，接收触摸点击）
    const hot = rect({ x: 0, y: 0, width: W, height: H, fill: 'transparent' }).replace('/>', ' pointer-events="visible" />')
    body = groupA + groupB + hint + hot
  }

  return safe(svgSection({ moduleId: 'i-clickswitch', viewBoxW: W, viewBoxH: H, body }))
}

// ─── i-scrollcards ────────────────────────────────────────────────────────
// 横滑卡片：纯 CSS scroll-snap 轨（无 SMIL，动/静同构）。
// 不用 display:flex（会被 enforcePlatformCSS 降级）；用 inline-block + nowrap。
// 每张卡是一个独立 inline <svg viewBox width="100%">（标题 + 正文行）。
function renderScrollCards(p: SvgModuleParams): string {
  const { palette } = p.theme
  const items: SvgScrollItem[] =
    p.items && p.items.length > 0
      ? p.items
      : [
          { title: '卡片一', body: '横滑查看更多内容' },
          { title: '卡片二', body: '纯 CSS scroll-snap' },
          { title: '卡片三', body: '无需 JS 即可滑动' },
        ]

  // 单张卡的内部 SVG（独立 viewBox + width="100%"，随外层卡片宽度自适应）
  const CARD_W = 760
  const CARD_H = 460
  const cardSvg = (item: SvgScrollItem, n: number): string => {
    const bg = rect({ x: 0, y: 0, width: CARD_W, height: CARD_H, rx: 22, ry: 22, fill: palette.paperWarm, stroke: palette.hairline, strokeWidth: 1 })
    const idxBadge =
      textLine({ x: 56, y: 96, text: String(n).padStart(2, '0'), fill: palette.accent, fontSize: 44, fontWeight: 700, fontFamily: FONT_STACK, anchor: 'start', letterSpacing: 2 }) +
      hairlineRule({ x: 56, y: 122, width: 96, height: 2, fill: palette.accent })

    const titleLines = splitLines(item.title || '卡片', 12, 2)
    const titleNodes = titleLines
      .map((line, i) =>
        textLine({ x: 56, y: 210 + i * 60, text: line, fill: palette.ink, fontSize: 46, fontWeight: 600, fontFamily: FONT_STACK, anchor: 'start', letterSpacing: 2 }),
      )
      .join('')

    const bodyLines = splitLines(item.body ?? '', 16, 3)
    const bodyStartY = 210 + titleLines.length * 60 + 36
    const bodyNodes = bodyLines
      .map((line, i) =>
        textLine({ x: 56, y: bodyStartY + i * 44, text: line, fill: palette.inkSoft, fontSize: 28, fontWeight: 400, fontFamily: FONT_STACK, anchor: 'start', letterSpacing: 1 }),
      )
      .join('')

    const sig = diamond(CARD_W - 70, CARD_H - 60, 10, palette.accent)
    const inner = bg + idxBadge + titleNodes + bodyNodes + sig
    // 内层 svg 也必须 width="100%"（no-fixed-svg-width 规则覆盖嵌套 svg）
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="100%" style="display:block;">${inner}</svg>`
  }

  // 每张卡用 inline-block <section> 包裹（width 86% + scroll-snap-align）
  const cardSections = items
    .map(
      (item, i) =>
        `<section style="display:inline-block;white-space:normal;width:86%;margin-right:3%;scroll-snap-align:center;vertical-align:top;">` +
        cardSvg(item, i + 1) +
        `</section>`,
    )
    .join('')

  // 外层轨：横向滚动 + scroll-snap（不用 flex）。data-ink-svg 哨兵挂在轨上。
  const rail =
    `<section data-ink-svg="i-scrollcards" style="margin:24px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;white-space:nowrap;scroll-snap-type:x mandatory;-webkit-user-select:none;">` +
    cardSections +
    `</section>`

  return safe(rail)
}

// ─── i-fadein ────────────────────────────────────────────────────────────
// 入场淡入：<g> 包裹内容，begin="0s" dur="0.8s" opacity 0→1 fill="freeze"。
// 静态兜底：opacity 1，无 <animate>。
function renderFadeIn(p: SvgModuleParams): string {
  const { palette } = p.theme
  const motion = p.theme.allowMotion === true
  const H = 260

  const title = frameTitle(p, 0, '标题')
  const titleLines = splitLines(title, 16, 2)
  const startY = titleLines.length > 1 ? 110 : 130
  const lineH = 64

  const card = rect({ x: 60, y: 40, width: W - 120, height: H - 80, rx: 18, ry: 18, fill: palette.paperWarm, stroke: palette.hairline, strokeWidth: 1 })
  const topRule = hairlineRule({ x: 100, y: 86, width: 160, height: 2, fill: palette.accent })
  const text = titleLines
    .map((line, i) =>
      textLine({ x: W / 2, y: startY + i * lineH, text: line, fill: palette.ink, fontSize: 48, fontWeight: 600, fontFamily: FONT_STACK, anchor: 'middle', letterSpacing: 2 }),
    )
    .join('')
  const sig = diamond(W - 110, H - 70, 11, palette.accent)
  const content = card + topRule + text + sig

  let body: string
  if (!motion) {
    // 静态：完全可见、无 SMIL
    body = `<g opacity="1">${content}</g>`
  } else {
    const anim = smilAnimate({ attributeName: 'opacity', values: '0;1', dur: '0.8s', begin: '0s', fill: 'freeze', restart: 'never' })
    body = `<g opacity="0">${content}${anim}</g>`
  }

  return safe(svgSection({ moduleId: 'i-fadein', viewBoxW: W, viewBoxH: H, body }))
}

// ─── i-stretch ────────────────────────────────────────────────────────────
// 点击展开折叠（点击揭示式，非高度塌缩 — 见研究 §2.2 / feasibility §2）：
// header 始终可见（accentDeep 满条 + 标题 + 右侧雪佛龙 + 「点击展开」小字仅动态显示）；
// content 区为完整正文；cover 盖层在 motion 时覆盖 content，begin="click" opacity 1→0
// fill="freeze" restart="never" 揭示正文；透明热区接收点击。
// 静态兜底（allowMotion=false）：完全展开、无 cover、无 SMIL。
function renderStretch(p: SvgModuleParams): string {
  const { palette } = p.theme
  const motion = p.theme.allowMotion === true

  const titleRaw = frameTitle(p, 0, '点击展开')
  const titleLines = splitLines(titleRaw, 16, 1)
  const titleText = titleLines[0] ?? titleRaw

  const bodyRaw = p.items?.[0]?.body ?? p.subtitle ?? ''
  const bodyLines = splitLines(bodyRaw, 18, 6)

  const headerH = 132
  const contentH = 64 + bodyLines.length * 46 + 28
  const H = headerH + contentH

  // ── Header（始终可见）：accentDeep 满条 + 白标题 + 右侧雪佛龙下三角 + 动态小字 ──
  const headerBg = rect({
    x: 0,
    y: 0,
    width: W,
    height: headerH,
    rx: 14,
    ry: 14,
    fill: palette.accentDeep,
  })
  const headerTitle = textLine({
    x: 56,
    y: 78,
    text: titleText,
    fill: '#ffffff',
    fontSize: 46,
    fontWeight: 700,
    fontFamily: FONT_STACK,
    anchor: 'start',
    letterSpacing: 2,
  })
  // 雪佛龙下三角（path，非 emoji）
  const chevronD = `M${W - 96},${56} L${W - 56},${56} L${W - 76},${84} Z`
  const chevron = path(chevronD, { fill: '#ffffff', opacity: 0.9 })
  // 「点击展开」小字（仅动态时显示）
  const hint = motion
    ? textLine({
        x: W - 110,
        y: 104,
        text: '点击展开',
        fill: 'rgba(255, 255, 255, 0.85)',
        fontSize: 22,
        fontWeight: 400,
        fontFamily: FONT_STACK,
        anchor: 'end',
        letterSpacing: 2,
      })
    : ''
  const header = headerBg + headerTitle + chevron + hint

  // ── Content（header 下方，paperWarm 卡）──
  const contentBg = rect({
    x: 0,
    y: headerH + 8,
    width: W,
    height: contentH - 8,
    rx: 12,
    ry: 12,
    fill: palette.paperWarm,
    stroke: palette.hairline,
    strokeWidth: 1,
  })
  const bodyNodes = bodyLines
    .map((line, i) =>
      textLine({
        x: 56,
        y: headerH + 64 + i * 46,
        text: line,
        fill: palette.ink,
        fontSize: 30,
        fontWeight: 400,
        fontFamily: FONT_STACK,
        anchor: 'start',
        letterSpacing: 1,
      }),
    )
    .join('')
  // 收尾菱形
  const tailSig = diamond(W - 70, H - 46, 10, palette.accent)
  const content = contentBg + bodyNodes + tailSig

  let body: string
  if (!motion) {
    // 静态：完全展开、无 cover、无 SMIL
    body = `<g opacity="1">${header}${content}</g>`
  } else {
    // Cover：不透明 paperWarm 覆盖 content + 居中省略提示 + opacity 1→0 + 透明热区
    const coverBg = rect({
      x: 0,
      y: headerH + 8,
      width: W,
      height: contentH - 8,
      rx: 12,
      ry: 12,
      fill: palette.paperWarm,
    })
    const coverCenterY = headerH + contentH / 2
    const coverText = textLine({
      x: W / 2,
      y: coverCenterY,
      text: '— 点击展开全文 —',
      fill: palette.inkSoft,
      fontSize: 28,
      fontWeight: 400,
      fontFamily: FONT_STACK,
      anchor: 'middle',
      letterSpacing: 2,
    })
    const coverAnim = smilAnimate({
      attributeName: 'opacity',
      values: '1;0',
      dur: '0.4s',
      begin: 'click',
      fill: 'freeze',
      restart: 'never',
    })
    // 全幅透明热区（最上层、本 g 内），pointer-events="visible"
    const hot = rect({ x: 0, y: 0, width: W, height: H, fill: 'transparent' }).replace(
      '/>',
      ' pointer-events="visible" />',
    )
    body =
      `<g opacity="1">${header}${content}</g>` +
      `<g opacity="1">${coverBg}${coverText}${coverAnim}${hot}</g>`
  }

  return safe(svgSection({ moduleId: 'i-stretch', viewBoxW: W, viewBoxH: H, body }))
}

// ─── i-sequence ────────────────────────────────────────────────────────────
// 序列帧：3 帧依次显示（链式 begin："0s" → "seqA.end+1.2s" → "seqB.end+1.2s"），用
// SMIL animate 切 opacity（discrete 阶跃）。研究 §9.5：链式 begin 比时钟同步更稳健。
// 静态兜底：只画帧 1，无 SMIL。begin 只用 {Ns, id.end+Ns}（无 click/触摸触发器）。
function renderSequence(p: SvgModuleParams): string {
  const { palette } = p.theme
  const motion = p.theme.allowMotion === true
  const H = 300

  const titles = [
    frameTitle(p, 0, '第一帧'),
    frameTitle(p, 1, '第二帧'),
    frameTitle(p, 2, '第三帧'),
  ]

  // 帧内容：暖纸卡 + 序号 + 标题
  const frame = (title: string, n: number): string => {
    const card = rect({ x: 60, y: 44, width: W - 120, height: H - 88, rx: 18, ry: 18, fill: palette.paperWarm, stroke: palette.hairline, strokeWidth: 1 })
    const num = textLine({ x: 100, y: 116, text: String(n).padStart(2, '0'), fill: palette.accent, fontSize: 40, fontWeight: 700, fontFamily: FONT_STACK, anchor: 'start', letterSpacing: 2 })
    const numRule = hairlineRule({ x: 100, y: 138, width: 88, height: 2, fill: palette.accent })
    const titleLines = splitLines(title, 13, 1)
    const text = textLine({ x: W / 2, y: 210, text: titleLines[0] ?? title, fill: palette.ink, fontSize: 50, fontWeight: 600, fontFamily: FONT_STACK, anchor: 'middle', letterSpacing: 2 })
    return card + num + numRule + text
  }

  // 三帧链式 begin：帧 0 自启 0s 并 id="seqA"；帧 1 begin="seqA.end+1.2s" id="seqB"；
  // 帧 2 begin="seqB.end+1.2s"。hide 同步跟随下一帧的 show begin 表达式。
  const showIds = ['seqA', 'seqB', undefined] as const
  const showBegins = ['0s', 'seqA.end+1.2s', 'seqB.end+1.2s']
  const total = 3

  let body: string
  if (!motion) {
    // 静态：只显示首帧
    body = `<g opacity="1">${frame(titles[0], 1)}</g>`
  } else {
    body = titles
      .map((title, i) => {
        const initial = i === 0 ? 1 : 0
        // 帧 i 在自己的窗口起点变为可见，在下一帧起点变为不可见（discrete 阶跃）。
        // 用 smilAnimate（带 fill="freeze" restart="never"）而非裸 <set>，让点击只触发一次且定住。
        const showAt = showBegins[i]
        const hideAt = showBegins[(i + 1) % total]
        const show = smilAnimate({
          id: showIds[i],
          attributeName: 'opacity',
          values: `${initial};1`,
          keyTimes: '0;1',
          calcMode: 'discrete',
          dur: '0.01s',
          begin: showAt,
          fill: 'freeze',
          restart: 'never',
        })
        // 末帧不主动隐藏（停在末帧，避免空白）；前两帧在下一帧起点隐藏。
        const hide =
          i < total - 1
            ? smilAnimate({
                attributeName: 'opacity',
                values: '1;0',
                keyTimes: '0;1',
                calcMode: 'discrete',
                dur: '0.01s',
                begin: hideAt,
                fill: 'freeze',
                restart: 'never',
              })
            : ''
        return `<g opacity="${initial}">${frame(title, i + 1)}${show}${hide}</g>`
      })
      .join('')
  }

  return safe(svgSection({ moduleId: 'i-sequence', viewBoxW: W, viewBoxH: H, body }))
}

// ─── 注册表导出 ──────────────────────────────────────────────────────────

export const interactiveModules: SvgModuleSpec[] = [
  {
    id: 'i-clickswitch',
    family: 'interactive',
    description: '点击切换 A→B：双层 <g> + SMIL opacity（begin=click, fill=freeze, restart=never）+ 透明热区；静态取帧 A',
    render: renderClickSwitch,
    interactive: true,
  },
  {
    id: 'i-scrollcards',
    family: 'interactive',
    description: '横滑卡片：纯 CSS scroll-snap 轨（inline-block，非 flex）+ 每卡独立 inline <svg>；动静同构',
    render: renderScrollCards,
    interactive: true,
  },
  {
    id: 'i-fadein',
    family: 'interactive',
    description: '入场淡入：<g> + SMIL opacity 0→1（begin=0s, fill=freeze）；静态 opacity 1 无 SMIL',
    render: renderFadeIn,
    interactive: true,
  },
  {
    id: 'i-sequence',
    family: 'interactive',
    description: '序列帧：3 帧用 SMIL <animate> 链式 begin（seqA→seqB→…）依次切 opacity；静态取帧 1',
    render: renderSequence,
    interactive: true,
  },
  {
    id: 'i-stretch',
    family: 'interactive',
    description:
      '点击展开折叠：双层 <g> + cover opacity SMIL（begin=click,freeze,never）；静态完全展开',
    render: renderStretch,
    interactive: true,
  },
]

// 不修改 index.ts；如需注册让上层显式 import { interactiveModules } from './interactive'。
// 同时单独导出渲染器便于测试单点引用。
export {
  renderClickSwitch,
  renderScrollCards,
  renderFadeIn,
  renderSequence,
  renderStretch,
}

export const __interactiveRenderers = {
  renderClickSwitch,
  renderScrollCards,
  renderFadeIn,
  renderSequence,
  renderStretch,
}
