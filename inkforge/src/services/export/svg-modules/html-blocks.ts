/**
 * HTML 色块装饰器族 — 旗舰预设的「实色/淡彩色块」排版层。
 *
 * 背景（用户判定「太素」）：旧旗舰输出读起来像干净的 GitHub-markdown→微信 转换，
 * 只有细线 line-art，零实色块。premium 公众号「设计感」主要来自**第二层**——
 * 内联样式的实色/淡彩 HTML 色块容器（见 prompts/0601/research/pattern-*.md 与
 * .trellis/tasks/06-01-multiplatform-render-svg/research/*）。
 *
 * 分工铁律：
 *   - SVG 只承载纯图形母题（封面 banner / 分隔 / 装饰引号 / vessel mark）。
 *   - 承载文字的节点（H2/H3、blockquote→引用卡/callout、列表、文末落款卡）一律
 *     用内联样式 HTML 色块——文字活、可选可重排，且最贴近真机。
 *
 * 微信安全（postProcessForWechat unsupportedProps 已确认）：
 *   保留：color/background-color/background(实色)/border/border-left/border-radius/
 *        padding/margin/box-shadow(非 inset)/font-family/font-size/text-align/line-height/
 *        letter-spacing/display:inline-block/vertical-align/word-break。
 *   剥离：class/id/<style>/var()/calc()/gradient/transform/transition/animation/
 *        filter/flex/grid/clip-path/mask/box-shadow inset/position:fixed。
 *
 * 因此本文件输出：
 *   - 绝不用 class（哨兵走 data-ink-block，下游 data-* 在我方管线存活）。
 *   - 绝不用 <div>（用 <section>），绝不用 gradient/var/calc/transform。
 *   - 图标只用内联 SVG <path>（实色 + opacity），绝不用 emoji。
 *   - 实色之上的文字用 palette.onAccent 自动对比度。
 *
 * 所有装饰器：工厂式 `(palette, opts) => (html, target) => html`，幂等（哨兵），
 * 且 **preview 与 wechat 都执行**（内联 HTML 在两端渲染一致 = 真 WYSIWYG）。
 */
import type { ExportTarget, PresetPersona } from '@/types'
import type { SvgPalette } from './types'
import { renderVesselMark } from './endmarks'
import { renderSeal } from './primitives'
import { buildThemeContext } from './theme'
import { renderStretch } from './interactive'

/** serif 字体栈（方印印文用，宋体优先）。 */
const SEAL_FONT = "'Songti SC', 'SimSun', serif"

export type BlockDecorateFn = (html: string, target: ExportTarget) => string

/** CJK 设备字体栈（HTML 内联 style，多词名用单引号即可）。 */
const HTML_FONT = "-apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"

/** 把行内 HTML 里的标签去掉、取首段纯文本（用于 callout 关键词探测）。 */
function firstText(innerHtml: string): string {
  return String(innerHtml || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 解析 marker 段落：剥掉 `[元素]` 前缀后，按 `||` 切条目、条目内按 `|` 切字段。
 * marker 内容按纯文本处理（不保留 HTML，避免 `|` / `||` 与 HTML 混淆）。
 * 命中返回二维条目数组（每条目=字段数组）；未命中返回 null。
 */
function parseMarkerItems(text: string, tag: string): string[][] | null {
  const re = new RegExp(`^\\s*\\[\\s*${tag}\\s*\\]\\s*([\\s\\S]+)$`)
  const m = re.exec(text)
  if (!m) return null
  return m[1]
    .split('||')
    .map((seg) => seg.split('|').map((s) => s.trim()).filter(Boolean))
    .filter((a) => a.length > 0)
}

// ════════════════════════════════════════════════════════════════════════
// 构成主义几何母题（内联 <svg>）——方格 grid × 菱形 diamond，建立结构节奏（R3）
//
// 全部用 viewBox + 固定 px width/height + display:inline-block + vertical-align，
// 只含 rect/path/line/text；无 class/defs/gradient/transform；非 emoji。
// 与印章/鼎徽/versal/分隔菱形同源——把 H2/H3/引用/列表 重塑为墨铸专属母题。
// ════════════════════════════════════════════════════════════════════════

/**
 * gridNumberSvg — 方格铸号：白描边方框 + 右上套准小方（registration tick）+ 反白号。
 * 用于 H2 满幅 accentDeep 块内（反白白字）。viewBox 0 0 48 48，46×46。
 */
function gridNumberSvg(idx: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="46" height="46" ` +
    `style="display:inline-block;vertical-align:middle;">` +
    `<rect x="1.5" y="1.5" width="45" height="45" rx="4" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2" />` +
    `<rect x="37" y="5" width="5" height="5" fill="#ffffff" />` +
    `<text x="23" y="33" text-anchor="middle" font-size="25" font-weight="800" fill="#ffffff" ` +
    `font-family="${HTML_FONT}">${idx}</text>` +
    `</svg>`
  )
}

/**
 * gridSquareMark — 方格锚（2×2 细线方格：描边 + 内十字 + 左上实心朱文格）。
 * 用于 H3 标题左侧锚记。viewBox 0 0 16 16，15×15。fill/stroke = accent。
 */
function gridSquareMark(accent: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="15" height="15" ` +
    `style="display:inline-block;vertical-align:-2px;">` +
    `<rect x="1" y="1" width="14" height="14" fill="none" stroke="${accent}" stroke-width="1.6" />` +
    `<rect x="7.4" y="1" width="1.2" height="14" fill="${accent}" opacity="0.55" />` +
    `<rect x="1" y="7.4" width="14" height="1.2" fill="${accent}" opacity="0.55" />` +
    `<rect x="1" y="1" width="6.4" height="6.4" fill="${accent}" />` +
    `</svg>`
  )
}

/**
 * diagonalCornerSvg — 左上斜角实色三角 + 内嵌白小方格（构成主义斜角）。
 * 用于引用卡左上角。viewBox 0 0 30 30，26×26。
 */
function diagonalCornerSvg(accent: string, paper: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="26" height="26" ` +
    `style="display:inline-block;vertical-align:top;">` +
    `<path d="M0,0 L30,0 L0,30 Z" fill="${accent}" />` +
    `<rect x="4" y="4" width="7" height="7" fill="${paper}" />` +
    `</svg>`
  )
}

/**
 * diamondTerminalSvg — 实心 accent 菱形收尾签名（引文末尾，与分隔/colophon 菱形同源）。
 * viewBox 0 0 16 16，12×12。菱形顶点 (8,2)(14,8)(8,14)(2,8)。
 */
function diamondTerminalSvg(accent: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" ` +
    `style="display:inline-block;vertical-align:middle;">` +
    `<path d="M8,2 L14,8 L8,14 L2,8 Z" fill="${accent}" />` +
    `</svg>`
  )
}

/**
 * diamondMarkerSvg — UL 列表实心 accent 菱形标记（~9px），与引用收尾/分隔菱形统一。
 * viewBox 0 0 12 12，9×9。
 */
function diamondMarkerSvg(accent: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="9" height="9" ` +
    `style="display:inline-block;vertical-align:middle;margin-right:0.55em;">` +
    `<path d="M6,1 L11,6 L6,11 L1,6 Z" fill="${accent}" />` +
    `</svg>`
  )
}

// ════════════════════════════════════════════════════════════════════════
// Lede — 开篇正文首字下沉成 cast versal 方印（「以笔铸字」品牌母题，NEW R2）
// ════════════════════════════════════════════════════════════════════════

/** 计算 html 中所有 <blockquote>…</blockquote> 的 [start, end) 区间。 */
function blockquoteRanges(html: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  const re = /<blockquote(\s[^>]*)?>[\s\S]*?<\/blockquote>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    ranges.push([m.index, m.index + m[0].length])
  }
  return ranges
}

function isInsideRange(pos: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([s, e]) => pos >= s && pos < e)
}

/**
 * decorateFlagshipLede — 把开篇正文段首字铸成 versal cast initial（首字下沉方印）。
 * **排在 chain 最前**（composeSvgDecorate 之后、H2/quote/list 之前）。
 *
 * 锁定规则（robust，避开阅读 meta + blockquote 内 <p>）：文档序中第一个 <p>…</p>，
 * 满足全部：① 不在任何 <blockquote>…</blockquote> 区间内；② 不含 data-ink；
 * ③ 纯文本长度 ≥ 24；④ 不匹配 /阅读|分钟|全文.*字/。只处理第一个命中段；
 * 幂等哨兵 data-ink-block="flagship-lede"。
 *
 * 切字：跳过段内前导标签/空白，取第一个文本字符替换为 versal span + 该字，保留
 * 其余 HTML（strong/em/code 不破坏）。
 */
export function decorateFlagshipLede(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-lede"')) return html

    const ranges = blockquoteRanges(html)
    const re = /<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      const full = m[0]
      const attrs = m[1] ?? ''
      const inner = m[2]
      const start = m.index
      // ① 跳过 blockquote 内 <p>
      if (isInsideRange(start, ranges)) continue
      // ② 跳过含 data-ink 的段（已被其它装饰器处理 / 阅读 meta 容器）
      if (full.includes('data-ink')) continue
      // ③ 纯文本长度 ≥ 24
      const text = firstText(inner)
      if (text.length < 24) continue
      // ④ 跳过阅读 meta（阅读时长 / 字数）
      if (/阅读|分钟|全文.*字/.test(text)) continue

      // 命中：切首个文本字符（跳过前导标签/空白）。
      const versal = buildLedeVersal(inner, palette)
      if (!versal) continue
      const replaced = `<p${attrs}>${versal}</p>`
      return html.slice(0, start) + replaced + html.slice(start + full.length)
    }
    return html
  }
}

/**
 * 在 inner HTML 的「第一个文本字符」处切出 versal：跳过前导标签/空白，把首字符
 * 替换为 versal span。失败（无文本字符）返回 null。
 */
function buildLedeVersal(inner: string, palette: SvgPalette): string | null {
  // 逐字符扫描，跳过完整标签与空白，定位第一个可见文本字符。
  let i = 0
  let prefix = ''
  while (i < inner.length) {
    const ch = inner[i]
    if (ch === '<') {
      // 整段标签原样保留到 prefix
      const close = inner.indexOf('>', i)
      if (close === -1) return null
      prefix += inner.slice(i, close + 1)
      i = close + 1
      continue
    }
    if (/\s/.test(ch)) {
      prefix += ch
      i += 1
      continue
    }
    break
  }
  if (i >= inner.length) return null
  // 处理可能的 HTML 实体（如 &amp;）——若首字符是实体起点，整体取作首字。
  let firstChar: string
  let restStart: number
  if (inner[i] === '&') {
    const semi = inner.indexOf(';', i)
    if (semi !== -1 && semi - i <= 8) {
      firstChar = inner.slice(i, semi + 1)
      restStart = semi + 1
    } else {
      firstChar = inner[i]
      restStart = i + 1
    }
  } else {
    firstChar = inner[i]
    restStart = i + 1
  }
  const versalSpan =
    `<span data-ink-block="flagship-lede" style="display:inline-block;background-color:${palette.accentDeep};` +
    `color:#ffffff;font-size:40px;font-weight:800;width:52px;height:52px;line-height:52px;` +
    `text-align:center;border-radius:7px;margin:2px 12px 0 0;vertical-align:-9px;` +
    `font-family:'Songti SC','SimSun',serif;">${firstChar}</span>`
  return prefix + versalSpan + inner.slice(restStart)
}

// ════════════════════════════════════════════════════════════════════════
// H2 — 三个旗舰各一种「色块」形态
// ════════════════════════════════════════════════════════════════════════

/**
 * decorateFlagshipH2 — 把 `<h2>…</h2>` 替换为**构成主义满幅章节头**（R3）：保留 R1
 * 满幅 accentDeep 实色块 + 反白（用户认可的「猛」），把内部从「巨号 + 标题」升级为
 * 墨铸构成主义母题——**方格铸号 svg（白描边方框 + 套准小方 + 反白号）+ 反白标题 +
 * 方格节奏基线（border-top 规则 + 3 个实/虚交替小方块）**。计数器在闭包内（每次
 * 文档调用从 0 起），保证幂等 + 编号正确。
 *
 * R3 统一三变体为同一构成主义形态（仅 accentDeep hue 不同）：移除 R2 的
 * kiln/tempera/amber 三套编号差异。`opts.variant` 仅保留签名兼容（不再分流）。
 *
 * 白字始终安全：accentDeep 保证白字 CR≥4.5，直接用 #ffffff / rgba(255,255,255,a)。
 */
export function decorateFlagshipH2(
  palette: SvgPalette,
  _opts: { variant: 'kiln' | 'tempera' | 'amber' },
): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-h2"')) return html
    let n = 0
    return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, _attrs: string | undefined, inner: string) => {
      n += 1
      const idx = String(n).padStart(2, '0')
      // 方格铸号（内联 svg，左）
      const numNode = gridNumberSvg(idx)
      // 反白标题
      const titleP =
        `<p style="margin:12px 0 0;font-size:21px;font-weight:700;line-height:1.45;letter-spacing:0.5px;` +
        `color:#ffffff;font-family:${HTML_FONT};">${inner}</p>`
      // 方格节奏基线：border-top 规则 + 3 个实/虚交替小方块（第 2 个虚框）
      const node = (solid: boolean): string =>
        solid
          ? `<span style="display:inline-block;width:7px;height:7px;margin-right:6px;vertical-align:middle;background-color:#ffffff;"></span>`
          : `<span style="display:inline-block;width:7px;height:7px;margin-right:6px;vertical-align:middle;background-color:transparent;border:1px solid rgba(255,255,255,0.7);"></span>`
      const rhythm =
        `<p style="margin:14px 0 0;padding-top:10px;border-top:1px solid rgba(255,255,255,0.32);">` +
        node(true) + node(false) + node(true) +
        `</p>`
      return (
        `<section data-ink-block="flagship-h2" style="margin:38px 0 22px;">` +
        `<section style="background-color:${palette.accentDeep};border-radius:4px;padding:18px 20px;">` +
        numNode +
        titleP +
        rhythm +
        `</section>` +
        `</section>`
      )
    })
  }
}

// ════════════════════════════════════════════════════════════════════════
// H3 — 构成主义方格锚 + ink 标题 + 底线（R3，弃 R2 左条+淡底 plate）
// ════════════════════════════════════════════════════════════════════════

export function decorateFlagshipH3(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-h3"')) return html
    return html.replace(/<h3(\s[^>]*)?>([\s\S]*?)<\/h3>/gi, (_m, _attrs: string | undefined, inner: string) => {
      return (
        `<section data-ink-block="flagship-h3" style="margin:28px 0 14px;padding-bottom:8px;` +
        `border-bottom:1px solid ${palette.accentBorder};">` +
        gridSquareMark(palette.accent) +
        `<span style="margin-left:10px;color:${palette.ink};font-size:18px;font-weight:700;letter-spacing:0.5px;` +
        `line-height:1.5;font-family:${HTML_FONT};vertical-align:middle;">${inner}</span>` +
        `</section>`
      )
    })
  }
}

// ════════════════════════════════════════════════════════════════════════
// Blockquote — 分流：callout 提示框 / 引用卡（保留内部 HTML，文字活、可重排）
// ════════════════════════════════════════════════════════════════════════

/** 非 emoji octicon 风格图标 path（16 viewBox）。fill 由调用方注入。 */
const ICON_INFO =
  'M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM7.25 7a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V7.75H8a.75.75 0 0 1-.75-.75ZM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z'
const ICON_WARN =
  'M8 1.2 0.6 14a1 1 0 0 0 .87 1.5h13.06A1 1 0 0 0 15.4 14L8 1.2Zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.2Zm0 7.1a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z'
const ICON_TIP =
  'M8 1a5 5 0 0 0-3 9v1.5a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 0 .75-.75V10A5 5 0 0 0 8 1ZM6.25 14.25a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75Z'

interface CalloutKind {
  label: string
  color: string
  icon: string
}

function iconSvg(d: string, fill: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="15" height="15" ` +
    `style="display:inline-block;vertical-align:-2px;margin-right:6px;"><path d="${d}" fill="${fill}" /></svg>`
  )
}

/**
 * 探测 blockquote 首段是否为 callout（提示/注意/重点/警告/小结/Note/Tip/Warning…），
 * 命中返回对应配色 + 图标；否则返回 null（→ 引用卡）。
 *
 * 配色映射（按 pattern-quote-callout-highlight.md）：warning→kiln(ember)、tip→amber、
 * note/其余→preset accent。旗舰预设的 accent 即其品牌色，故 note 直接用 palette.accent。
 */
function detectCallout(text: string, palette: SvgPalette): CalloutKind | null {
  const m = /^\s*\[?!?\s*(提示|注意|重点|警告|小结|要点|Note|Tip|Warning|Important)/i.exec(text)
  if (!m) return null
  const kw = m[1].toLowerCase()
  // warning → ember（铸红，每屏 ≤2 次自律由内容控制）；其余 → preset accent。
  if (kw === '警告' || kw === 'warning') {
    return { label: '注意', color: palette.ember, icon: ICON_WARN }
  }
  if (kw === '注意') {
    return { label: '注意', color: palette.ember, icon: ICON_WARN }
  }
  if (kw === '重点' || kw === 'important') {
    return { label: '重点', color: palette.accent, icon: ICON_WARN }
  }
  if (kw === '要点' || kw === 'tip' || kw === '小结') {
    return { label: kw === '小结' ? '小结' : '要点', color: palette.accent, icon: ICON_TIP }
  }
  // 提示 / note
  return { label: '提示', color: palette.accent, icon: ICON_INFO }
}

/**
 * decorateFlagshipBlockquote — 把 `<blockquote>…</blockquote>` 替换为 callout 框或
 * 引用卡。**保留内部 HTML**（不拍平成纯文本），文字活、可重排。
 */
export function decorateFlagshipBlockquote(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (
      html.includes('data-ink-block="flagship-quote"') ||
      html.includes('data-ink-block="flagship-callout"') ||
      html.includes('data-ink-block="flagship-pullquote"')
    ) {
      return html
    }
    return html.replace(/<blockquote(\s[^>]*)?>([\s\S]*?)<\/blockquote>/gi, (_m, _attrs: string | undefined, inner: string) => {
      const text = firstText(inner)
      // 优先：金句大字卡（PULLQUOTE）— 满幅大字 feature 卡。
      if (detectPullquote(text)) {
        const bodyHtml = stripPullquoteLead(inner)
        const card =
          `<section data-ink-block="flagship-pullquote" style="margin:30px 0;padding:26px 22px;` +
          `background-color:${palette.paperWarm};border-radius:10px;text-align:center;">` +
          pullquoteGlyphSvg(palette.accent) +
          `<section style="font-size:22px;font-weight:600;line-height:1.7;letter-spacing:0.04em;color:${palette.ink};` +
          `font-family:${HTML_FONT};">${bodyHtml}</section>` +
          `<p style="margin:14px 0 0;text-align:center;">` +
          `<section style="display:inline-block;width:48px;height:1px;background-color:${palette.accent};margin:0 0 4px;"></section>` +
          `</p>` +
          `<p style="margin:0;text-align:center;">` +
          `<section style="display:inline-block;width:48px;height:1px;background-color:${palette.accent};opacity:0.5;margin:0 0 10px;"></section>` +
          `</p>` +
          `<p style="margin:0;font-size:12px;color:${palette.inkSoft};letter-spacing:4px;font-family:${HTML_FONT};">` +
          `墨铸` +
          `<span style="margin:0 0 0 8px;vertical-align:middle;">` +
          diamondTerminalSvg(palette.accent) +
          `</span>` +
          `</p>` +
          `</section>`
        return card
      }
      const callout = detectCallout(text, palette)
      if (callout) {
        // CALLOUT 框：淡彩底（加重 accentTintStrong）+ 左 5px accent 竖条 + 图标 +
        // 加粗标签行 + 正文。warning 仍用 ember 低透明度底。
        const tint = callout.color === palette.accent ? palette.accentTintStrong : rgbaFor(callout.color, 0.07)
        const labelRow =
          `<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${callout.color};font-family:${HTML_FONT};">` +
          iconSvg(callout.icon, callout.color) +
          callout.label +
          `</p>`
        // 去掉正文首行的关键词前缀，避免「提示提示…」重复。
        const bodyHtml = stripLeadKeyword(inner)
        return (
          `<section data-ink-block="flagship-callout" style="margin:24px 0;padding:14px 18px;` +
          `border-left:5px solid ${callout.color};border-radius:8px;background-color:${tint};">` +
          labelRow +
          `<section style="margin:0;font-size:15px;line-height:1.85;color:${palette.ink};word-break:break-word;">${bodyHtml}</section>` +
          `</section>`
        )
      }
      // QUOTE 卡（R3 构成主义不对称块）：左 7px accent 条 + 左上斜角实色三角（内嵌
      // 白小方格）+ 引文 + 菱形收尾签名（+ 可选署名文字）。弃 R2 对称卡 + 大引号。
      const { body: quoteBody, attribution } = splitAttribution(inner)
      const attrText = attribution
        ? `<span style="margin-left:8px;font-size:13px;letter-spacing:0.04em;color:${palette.inkSoft};vertical-align:middle;">— ${escapeHtmlText(attribution)}</span>`
        : ''
      const terminalRow =
        `<p style="margin:12px 0 0;text-align:right;">` +
        diamondTerminalSvg(palette.accent) +
        attrText +
        `</p>`
      return (
        `<section data-ink-block="flagship-quote" style="margin:26px 0;padding:16px 20px 14px;` +
        `border-left:7px solid ${palette.accent};background-color:${palette.accentTint};border-radius:0 6px 6px 0;">` +
        diagonalCornerSvg(palette.accent, palette.paper) +
        `<section style="margin:6px 0 0;font-size:17px;line-height:1.95;letter-spacing:0.04em;color:${palette.ink};word-break:break-word;">${quoteBody}</section>` +
        terminalRow +
        `</section>`
      )
    })
  }
}

/** 去掉 callout 正文首行关键词前缀（含可选 `[!Tip]` / `提示：` / `注意 ` 形态）。 */
function stripLeadKeyword(innerHtml: string): string {
  return innerHtml.replace(
    /(<p[^>]*>)?\s*(?:\[?!?\s*)?(提示|注意|重点|警告|小结|要点|Note|Tip|Warning|Important)(?:\s*\]?)?\s*[:：]?\s*/i,
    (_m, openP: string | undefined) => openP ?? '',
  )
}

/**
 * 从引用内部 HTML 中分离出末尾的署名行（以 `—`/`——`/`--` 起头的最后一段）。
 * 找不到则 attribution 为空。仅在纯文本层面探测，HTML 结构尽量保留。
 */
function splitAttribution(innerHtml: string): { body: string; attribution: string } {
  // 取最后一个 <p>…</p> 看是否为署名行
  const pMatches = [...innerHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  if (pMatches.length > 0) {
    const lastP = pMatches[pMatches.length - 1]
    const lastText = firstText(lastP[1])
    const am = /^\s*(?:—{1,2}|--|――)\s*(.+)$/.exec(lastText)
    if (am && pMatches.length > 1) {
      const body = innerHtml.slice(0, lastP.index)
      return { body, attribution: am[1].trim() }
    }
  }
  // 无 <p> 包裹时的纯文本探测
  const plain = firstText(innerHtml)
  const lines = plain.split(/\n+/)
  if (lines.length > 1) {
    const last = lines[lines.length - 1]
    const am = /^\s*(?:—{1,2}|--|――)\s*(.+)$/.exec(last)
    if (am) {
      const body = lines.slice(0, -1).join('\n')
      return { body: innerHtml.replace(plain, body), attribution: am[1].trim() }
    }
  }
  return { body: innerHtml, attribution: '' }
}

function escapeHtmlText(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 临时 rgba（callout warning 用 ember 的低透明度底）。 */
function rgbaFor(hex: string, alpha: number): string {
  const h = String(hex || '').replace(/^#/, '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(0, 0, 0, ${alpha})`
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ════════════════════════════════════════════════════════════════════════
// Lists — UL 实心菱形标记 / OL 方格铸号风方形 chip（R3 构成主义母题）
// ════════════════════════════════════════════════════════════════════════

export function decorateFlagshipLists(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    let result = html

    // UL：list-style:none + 每个顶层 <li> 前置实心 accent 菱形（与分隔/引用菱形统一）。
    if (!result.includes('data-ink-block="flagship-ul"')) {
      result = result.replace(/<ul(\s[^>]*)?>([\s\S]*?)<\/ul>/gi, (match, _ulAttrs: string | undefined, ulBody: string) => {
        if (ulBody.includes('data-ink-block="flagship-ul"')) return match
        // 哨兵 data-ink-block 套在菱形 svg 外的 span 上（保持幂等检测点）。
        const marker =
          `<span data-ink-block="flagship-ul" style="display:inline-block;vertical-align:middle;">` +
          diamondMarkerSvg(palette.accent) +
          `</span>`
        const processed = ulBody.replace(/<li(\s[^>]*)?>([\s\S]*?)<\/li>/gi, (_m, liAttrs: string | undefined, liInner: string) => {
          const la = liAttrs ?? ''
          return `<li${la} style="list-style:none;margin:8px 0;line-height:1.8;">${marker}<span style="vertical-align:middle;">${liInner}</span></li>`
        })
        return `<ul style="list-style:none;padding-left:0;margin:16px 0;">${processed}</ul>`
      })
    }

    // OL：每个 <li> 前置方格铸号风方形 chip（border-radius:3px 方 + 右上套准小白点）。
    if (!result.includes('data-ink-block="flagship-ol"')) {
      result = result.replace(/<ol(\s[^>]*)?>([\s\S]*?)<\/ol>/gi, (match, _olAttrs: string | undefined, olBody: string) => {
        if (olBody.includes('data-ink-block="flagship-ol"')) return match
        let liCounter = 0
        const processed = olBody.replace(/<li(\s[^>]*)?>([\s\S]*?)<\/li>/gi, (_m, liAttrs: string | undefined, liInner: string) => {
          liCounter += 1
          const la = liAttrs ?? ''
          // 方格铸号：accent 底方块(radius 3) + 白号；右上角 1px 套准小白点（registration tick）。
          const tick =
            `<span style="display:inline-block;width:3px;height:3px;background-color:#ffffff;` +
            `vertical-align:top;margin:2px 0 0 -7px;"></span>`
          const chip =
            `<span data-ink-block="flagship-ol" style="display:inline-block;min-width:22px;height:22px;` +
            `line-height:22px;text-align:center;background-color:${palette.accent};color:${palette.onAccent};` +
            `font-size:13px;font-weight:700;border-radius:3px;margin-right:12px;vertical-align:middle;">${liCounter}</span>` +
            tick
          return `<li${la} style="list-style:none;margin:10px 0;line-height:1.8;">${chip}<span style="vertical-align:middle;">${liInner}</span></li>`
        })
        return `<ol style="list-style:none;padding-left:0;margin:16px 0;">${processed}</ol>`
      })
    }

    return result
  }
}

// ════════════════════════════════════════════════════════════════════════
// Footer card — 文末落款卡（vessel mark + 品牌行 + tagline + accent 细线 + 全文完）
// ════════════════════════════════════════════════════════════════════════

export function decorateFlagshipFooterCard(
  palette: SvgPalette,
  opts: { brand: string; tagline: string },
): BlockDecorateFn {
  const { brand, tagline } = opts
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-footer"')) return html

    // vessel mark：小尺寸内联 SVG（width="100%" + viewBox，由窄 section 限宽居中）。
    // viewBox 200×120，mark 中心 (100,52)，scale 0.85 适配紧凑徽章。
    const markBody = renderVesselMark({
      cx: 100,
      cy: 52,
      scale: 0.85,
      ink: palette.ink,
      accent: palette.accent,
      hairline: palette.hairline,
      ember: palette.ember,
      paper: palette.paper,
    })
    const markSvg =
      `<section style="width:72px;margin:0 auto 12px;">` +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="100%" style="display:block;">${markBody}</svg>` +
      `</section>`

    // 双细线（两条上下叠，间距 4）。display:inline-block + 父 text-align:center 居中，
    // 不用 margin:auto（postProcessForWechat 会把 `margin:16px auto` → `margin:16px 0`）。
    const doubleRule =
      `<section style="display:inline-block;width:64px;height:1px;margin:18px 0 0;background-color:${palette.accent};"></section>` +
      `<section style="display:block;text-align:center;">` +
      `<section style="display:inline-block;width:64px;height:1px;margin:4px 0 12px;background-color:${palette.accent};opacity:0.5;"></section>` +
      `</section>`

    // 「全文完」下方居中方印（小，accentDeep 底 + 白印文，品牌钢印）。
    // 居中：父卡 text-align:center + 本节 display:inline-block（避开 margin:auto 被剥）。
    const sealSvg =
      `<section style="display:inline-block;width:64px;margin:14px 0 0;">` +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" style="display:block;">` +
      renderSeal({ cx: 32, cy: 32, size: 60, fill: palette.accentDeep, textColor: palette.paper, font: SEAL_FONT }) +
      `</svg></section>`

    const card =
      `<section data-ink-block="flagship-footer" style="margin:36px 0 8px;padding:24px 20px;` +
      `background-color:${palette.paperWarm};border:1px solid ${palette.hairline};border-radius:14px;text-align:center;">` +
      markSvg +
      `<p style="margin:0;font-size:15px;font-weight:600;color:${palette.ink};letter-spacing:1px;font-family:${HTML_FONT};">${escapeHtmlText(brand)}</p>` +
      `<p style="margin:6px 0 0;font-size:13px;color:${palette.inkSoft};letter-spacing:1px;font-family:${HTML_FONT};">${escapeHtmlText(tagline)}</p>` +
      doubleRule +
      `<p style="margin:0;font-size:12px;color:${palette.inkSoft};letter-spacing:4px;font-family:${HTML_FONT};">全文完</p>` +
      sealSvg +
      `</section>`

    return html + card
  }
}

// ════════════════════════════════════════════════════════════════════════
// R4 元素库 — 5 个 aha 元素（marker + 自动），全部沿用 R1-R3 母题
// 方格 grid × 菱形 diamond × 印章 × 构成主义；零 emoji；幂等 data-ink-block。
// ════════════════════════════════════════════════════════════════════════

/** 小尺寸方格章号 svg（用于阅读条/目录行：白底版面 + accent 描边方框 + 反白号）。 */
function gridSquareSmall(accent: string, size = 18): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" ` +
    `style="display:inline-block;vertical-align:-3px;">` +
    `<rect x="1" y="1" width="14" height="14" fill="none" stroke="${accent}" stroke-width="1.4" />` +
    `<rect x="2.5" y="2.5" width="5.5" height="5.5" fill="${accent}" />` +
    `</svg>`
  )
}

/** 目录行用的方格小号（accent 描边方 + 反白号），width=26。 */
function gridNumberSmall(accent: string, idx: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="26" height="26" ` +
    `style="display:inline-block;vertical-align:middle;">` +
    `<rect x="1.5" y="1.5" width="45" height="45" rx="4" fill="${accent}" stroke="${accent}" stroke-width="2" />` +
    `<rect x="37" y="5" width="5" height="5" fill="#ffffff" />` +
    `<text x="23" y="33" text-anchor="middle" font-size="25" font-weight="800" fill="#ffffff" ` +
    `font-family="${HTML_FONT}">${idx}</text>` +
    `</svg>`
  )
}

/** 实心 accent 小菱形（阅读条/版心点缀分隔符）。viewBox 0 0 12 12，width=6。 */
function diamondSep(accent: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="6" height="6" ` +
    `style="display:inline-block;vertical-align:middle;margin:0 8px;">` +
    `<path d="M6,1 L11,6 L6,11 L1,6 Z" fill="${accent}" />` +
    `</svg>`
  )
}

/** persona → 阅读条栏目名（kiln=专栏 / tempera=深读 / amber=洞察 / 其余=深读）。 */
function readbarKicker(variant: 'kiln' | 'tempera' | 'amber' | string): string {
  switch (variant) {
    case 'kiln':
      return '专栏'
    case 'amber':
      return '洞察'
    case 'tempera':
    default:
      return '深读'
  }
}

// ─── E1. 品牌阅读条 ──────────────────────────────────────────────────────
/**
 * decorateFlagshipReadingBar — 自动定位 wechat 管线 `buildReadingTimeHeader`
 * 注入的裸阅读头（文本含 阅读+分钟+全文+字），提取字数 Y / 分钟 X，替换为品牌
 * 阅读条（墨铸·persona栏目 ◆ 全文Y字 ◆ 约X分钟 ◆ 第01期 + 上下细线 + 方格 svg + 实心菱形 sep）。
 * 找不到（enableReadingTime=false）则原样返回；幂等 data-ink-block="flagship-readbar"。
 */
export function decorateFlagshipReadingBar(
  palette: SvgPalette,
  opts?: { variant?: 'kiln' | 'tempera' | 'amber' },
): BlockDecorateFn {
  const kicker = readbarKicker(opts?.variant ?? 'tempera')
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-readbar"')) return html

    // buildReadingTimeHeader 注入的是 <div style="...">…<span>阅读约 X 分钟</span>…<span>全文 Y 字</span>…</div>。
    // 严格只匹配 <div>（真品形态）——避免误吞 <section id="nice"> 内层（会吞掉全文 body）。
    // 关键词必须 4-of-4 全中（阅读+分钟+全文+字）以防误判。
    const blockRe = /<div\b([^>]*)>([\s\S]*?)<\/div>/gi
    let m: RegExpExecArray | null
    while ((m = blockRe.exec(html)) !== null) {
      const full = m[0]
      const inner = m[2]
      const text = firstText(inner)
      const hits =
        Number(/阅读/.test(text)) +
        Number(/分钟/.test(text)) +
        Number(/全文/.test(text)) +
        Number(/字/.test(text))
      if (hits < 4) continue
      // 跳过已被其它装饰器处理的块。
      if (full.includes('data-ink')) continue
      // 提取数字。
      const minMatch = /(\d+)\s*分钟/.exec(text)
      const wordMatch = /全文\s*(\d+)\s*字/.exec(text)
      if (!minMatch || !wordMatch) continue
      const minutes = minMatch[1]
      const words = wordMatch[1]

      const sep = diamondSep(palette.accent)
      const square = gridSquareSmall(palette.accent, 14)
      const bar =
        `<section data-ink-block="flagship-readbar" style="margin:0 0 24px;padding:9px 0;` +
        `border-top:1px solid ${palette.accentBorder};border-bottom:1px solid ${palette.accentBorder};">` +
        `<p style="margin:0;font-size:13px;color:${palette.inkSoft};letter-spacing:1px;font-family:${HTML_FONT};">` +
        square +
        `<span style="margin-left:8px;vertical-align:middle;">墨铸 · ${kicker}</span>` +
        sep +
        `<span style="vertical-align:middle;">全文 ${words} 字</span>` +
        sep +
        `<span style="vertical-align:middle;">约 ${minutes} 分钟</span>` +
        sep +
        `<span style="vertical-align:middle;">第 01 期</span>` +
        `</p>` +
        `</section>`
      return html.slice(0, m.index) + bar + html.slice(m.index + full.length)
    }
    return html
  }
}

// ─── E2. 篇目目录 ────────────────────────────────────────────────────────
/**
 * decorateFlagshipTOC — 按文档序收集 `<h2>…</h2>` 纯文本，编号 01..0N，
 * 生成「本期目录」卡。插入到封面 section（首个 data-ink-svg="cover-…" 的 </section>）
 * 之后；若有 readbar 则插其后。≤1 个 H2 不生成。幂等。
 *
 * chain 顺序：必须在 decorateFlagshipH2 之前（需读原始 `<h2>`）。
 */
export function decorateFlagshipTOC(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-toc"')) return html

    // 收集原始 <h2>...</h2>（必须在 decorateFlagshipH2 之前，否则 H2 已被替换为
    // <section data-ink-block="flagship-h2">…）。
    const h2Re = /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi
    const titles: string[] = []
    let h: RegExpExecArray | null
    while ((h = h2Re.exec(html)) !== null) {
      const t = firstText(h[2])
      if (t) titles.push(t)
    }
    if (titles.length <= 1) return html

    // 目录卡 HTML
    const rows = titles
      .map((title, i) => {
        const idx = String(i + 1).padStart(2, '0')
        return (
          `<p style="margin:7px 0;font-size:15px;color:${palette.ink};line-height:1.5;font-family:${HTML_FONT};">` +
          gridNumberSmall(palette.accent, idx) +
          `<span style="margin-left:8px;vertical-align:middle;">${escapeHtmlText(title)}</span>` +
          `</p>`
        )
      })
      .join('')

    const card =
      `<section data-ink-block="flagship-toc" style="margin:22px 0;padding:16px 18px;` +
      `background-color:${palette.accentTint};border-radius:8px;border-left:5px solid ${palette.accent};">` +
      `<p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:3px;color:${palette.accent};` +
      `font-family:${HTML_FONT};">本 期 目 录</p>` +
      rows +
      `</section>`

    // 锚定插入位置：优先 readbar </section> 之后；否则 cover-* </section> 之后；
    // 都没有则放最前。
    const readbarIdx = html.indexOf('data-ink-block="flagship-readbar"')
    if (readbarIdx !== -1) {
      const close = html.indexOf('</section>', readbarIdx)
      if (close !== -1) {
        const insertAt = close + '</section>'.length
        return html.slice(0, insertAt) + card + html.slice(insertAt)
      }
    }
    // cover-* 哨兵（data-ink-svg="cover-…"）
    const coverRe = /data-ink-svg="cover-[^"]*"/
    const cm = coverRe.exec(html)
    if (cm) {
      const close = html.indexOf('</section>', cm.index)
      if (close !== -1) {
        const insertAt = close + '</section>'.length
        return html.slice(0, insertAt) + card + html.slice(insertAt)
      }
    }
    return card + html
  }
}

// ─── E3. 金句大字卡（扩 decorateFlagshipBlockquote 的 PULLQUOTE 分支）─────
// 见 decorateFlagshipBlockquote 内的 detectPullquote 路径。

/** 探测 blockquote 首段是否为「金句」标记（金句 / 金句： / [金句]）。 */
function detectPullquote(text: string): boolean {
  return /^\s*\[?\s*金句\s*\]?\s*[:：]?/.test(text)
}

/** 去掉金句前缀（保留正文，HTML 结构尽量保留）。 */
function stripPullquoteLead(innerHtml: string): string {
  return innerHtml.replace(
    /(<p[^>]*>)?\s*\[?\s*金句\s*\]?\s*[:：]?\s*/,
    (_m, openP: string | undefined) => openP ?? '',
  )
}

/** 装饰引号 svg（大号，用于 pullquote 顶部居中）。viewBox 0 0 64 64，width=64。 */
function pullquoteGlyphSvg(accent: string): string {
  // 引号字形：两枚弯月+点（构成主义抽象引号）。
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="36" ` +
    `style="display:block;margin:0 auto 8px;">` +
    `<path d="M14,10 C8,16 6,24 6,34 L18,34 L18,20 L10,20 C10,16 12,12 16,10 Z" fill="${accent}" opacity="0.85" />` +
    `<path d="M46,10 C40,16 38,24 38,34 L50,34 L50,20 L42,20 C42,16 44,12 48,10 Z" fill="${accent}" opacity="0.85" />` +
    `</svg>`
  )
}

// ─── E4. 数据 callout（[数据] 大数字 | 标签 | 描述）───────────────────────
/**
 * decorateFlagshipStat — 匹配 `<p>[数据] …</p>`，解析 `|` 分段：
 *   [数据] <大数字> | <标签> | <描述?>
 * 替换为方格铸框大数字块（accent 实色大数字 + ink 标签 + inkSoft 描述）。
 * 幂等 data-ink-block="flagship-stat"。
 */
export function decorateFlagshipStat(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-stat"')) return html
    return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (match, _attrs: string | undefined, inner: string) => {
      const text = firstText(inner)
      const m = /^\s*\[\s*数据\s*\]\s*(.+)$/.exec(text)
      if (!m) return match
      const segs = m[1].split('|').map((s) => s.trim()).filter(Boolean)
      if (segs.length < 2) return match
      const num = segs[0]
      const label = segs[1]
      const desc = segs[2] ?? ''
      const descNode = desc
        ? `<p style="margin:6px 0 0;font-size:13px;color:${palette.inkSoft};font-family:${HTML_FONT};line-height:1.6;">${escapeHtmlText(desc)}</p>`
        : ''
      const term =
        `<p style="margin:8px 0 0;text-align:right;">` +
        diamondTerminalSvg(palette.accent) +
        `</p>`
      return (
        `<section data-ink-block="flagship-stat" style="margin:24px 0;padding:18px 20px;` +
        `border:1px solid ${palette.accentBorder};border-radius:8px;background-color:${palette.accentTint};">` +
        `<p style="margin:0;font-size:40px;font-weight:800;line-height:1.05;color:${palette.accent};` +
        `letter-spacing:1px;font-family:${HTML_FONT};">${escapeHtmlText(num)}</p>` +
        `<p style="margin:6px 0 0;font-size:15px;font-weight:700;color:${palette.ink};font-family:${HTML_FONT};">${escapeHtmlText(label)}</p>` +
        descNode +
        term +
        `</section>`
      )
    })
  }
}

// ─── E5. 图片框（自动）────────────────────────────────────────────────────
/**
 * decorateFlagshipFigure — 把 `<img …>`（含被 `<p>` 包裹的）包成品牌图框：
 * paperWarm 衬纸 + 圆角 + 1px hairline 边 + 若 alt 非空 → 题注行（含小方格 svg）。
 * 真微信外链 img 需上传后才显示，本元素只负责设计；img 本身上传由作者完成。
 * 幂等 data-ink-block="flagship-figure"。
 */
export function decorateFlagshipFigure(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-figure"')) return html

    // 单次匹配：alternation 一次处理「<p> 包裹的单图」与「裸 <img>」两种形态——
    // 杜绝旧版「pass1 包成 figure → pass2 在裸图扫描里再包一次」的双重包裹 bug。
    // 捕获组 1 = <p>…<img …> 形态的 imgAttrs；捕获组 2 = 裸 <img …> 的 imgAttrs。
    return html.replace(
      /<p(?:\s[^>]*)?>\s*<img\b([^>]*?)\/?>\s*<\/p>|<img\b([^>]*?)\/?>/gi,
      (_m, pImgAttrs: string | undefined, bareImgAttrs: string | undefined) => {
        const imgAttrs = pImgAttrs ?? bareImgAttrs ?? ''
        return buildFigureFrame(imgAttrs, palette)
      },
    )
  }
}

function extractAlt(attrs: string): string {
  const m = /alt\s*=\s*"([^"]*)"|alt\s*=\s*'([^']*)'/i.exec(attrs)
  if (!m) return ''
  return (m[1] ?? m[2] ?? '').trim()
}

function extractSrc(attrs: string): string {
  const m = /src\s*=\s*"([^"]*)"|src\s*=\s*'([^']*)'/i.exec(attrs)
  if (!m) return ''
  return (m[1] ?? m[2] ?? '').trim()
}

/**
 * 重建 img：**不原样拼接 imgAttrs**（旧版拼接 + 再追加 style 会产出重复 style 属性 +
 * 残缺自闭合）；从 imgAttrs 解析出 src/alt，重建一个干净 `<img>` 节点，丢弃原 style/
 * height 等脏属性，避免重复属性与坏闭合。
 */
function buildFigureFrame(imgAttrs: string, palette: SvgPalette): string {
  const alt = extractAlt(imgAttrs)
  const src = extractSrc(imgAttrs)
  const altAttr = alt ? ` alt="${escapeHtmlAttr(alt)}"` : ''
  const srcAttr = src ? ` src="${escapeHtmlAttr(src)}"` : ''
  const styledImg = `<img${srcAttr}${altAttr} style="display:block;width:100%;border-radius:6px;" />`
  const caption = alt
    ? `<p style="margin:8px 4px 2px;font-size:13px;color:${palette.inkSoft};letter-spacing:0.5px;text-align:center;font-family:${HTML_FONT};">` +
      gridSquareSmall(palette.accent, 12) +
      `<span style="margin-left:6px;vertical-align:middle;">${escapeHtmlText(alt)}</span>` +
      `</p>`
    : ''
  return (
    `<section data-ink-block="flagship-figure" style="margin:24px 0;padding:8px;` +
    `background-color:${palette.paperWarm};border:1px solid ${palette.hairline};border-radius:10px;">` +
    styledImg +
    caption +
    `</section>`
  )
}

/** 属性值转义（src/alt 写回 attribute 时，避免引号/`<>` 破坏标签）。 */
function escapeHtmlAttr(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ════════════════════════════════════════════════════════════════════════
// R5 元素库 — 5 个 HTML 色块装饰器 + 折叠 marker 接线
// 统一 marker 语法 [元素] 字段 | 字段 || 项2字段 …，沿用 R1-R4 母题
// （方格 / 菱形 / 印章 / accentDeep 满幅），preview+wechat 双轨，幂等 data-ink-block。
// ════════════════════════════════════════════════════════════════════════

/**
 * 白色（onAccentDeep）小菱形 svg，居中显示在 banner 顶部。
 * viewBox 0 0 16 16，width=14，display:block + margin:0 auto。
 */
function diamondCenterWhite(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" ` +
    `style="display:block;margin:0 auto 10px;">` +
    `<path d="M8,2 L14,8 L8,14 L2,8 Z" fill="#ffffff" />` +
    `</svg>`
  )
}

// ─── B1. 强调横幅 ──────────────────────────────────────────────────────────
/**
 * decorateFlagshipBanner — marker `[横幅] 文字`：满幅 accentDeep 居中强调，
 * 区别于 H2（H2 是左对齐编号章节头；横幅是居中金句式强调）。
 *
 * 仅取首条目首字段为正文；非命中段原样返回。幂等 data-ink-block="flagship-banner"。
 */
export function decorateFlagshipBanner(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-banner"')) return html
    return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (match, _attrs: string | undefined, inner: string) => {
      const text = firstText(inner)
      const items = parseMarkerItems(text, '横幅')
      if (!items) return match
      const content = items[0]?.[0] ?? ''
      if (!content) return match
      return (
        `<section data-ink-block="flagship-banner" style="margin:30px 0;background-color:${palette.accentDeep};` +
        `border-radius:8px;padding:26px 24px;text-align:center;">` +
        diamondCenterWhite() +
        `<p style="margin:0;font-size:21px;font-weight:800;line-height:1.65;letter-spacing:1.5px;` +
        `color:#ffffff;font-family:${HTML_FONT};">${escapeHtmlText(content)}</p>` +
        `<p style="margin:14px 0 0;text-align:center;">` +
        `<section style="display:inline-block;width:54px;height:1px;background-color:rgba(255,255,255,0.6);"></section>` +
        `</p>` +
        `</section>`
      )
    })
  }
}

// ─── B2. 对比双栏 ──────────────────────────────────────────────────────────
/**
 * decorateFlagshipCompare — marker `[对比] 左标题 | 左内容 || 右标题 | 右内容`：
 * 两 inline-block 列（非 flex），左 accentTint 实底（主张/正），右 accentBorder 描边
 * + paper 底（对照/反）。需 ≥2 条目、各 ≥2 字段；否则原样返回。
 *
 * 移动端 393px 校验：47%+47%+6% margin = 100%，两列并排，font-size:0 消 inline-block 间隙。
 * 幂等 data-ink-block="flagship-compare"。
 */
export function decorateFlagshipCompare(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-compare"')) return html
    return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (match, _attrs: string | undefined, inner: string) => {
      const text = firstText(inner)
      const items = parseMarkerItems(text, '对比')
      if (!items || items.length < 2) return match
      const left = items[0]
      const right = items[1]
      if (left.length < 2 || right.length < 2) return match
      const leftTitle = escapeHtmlText(left[0])
      const leftBody = escapeHtmlText(left[1])
      const rightTitle = escapeHtmlText(right[0])
      const rightBody = escapeHtmlText(right[1])
      const leftCol =
        `<section style="display:inline-block;width:47%;vertical-align:top;background-color:${palette.accentTint};` +
        `border-radius:8px;padding:14px 14px;">` +
        `<p style="margin:0 0 8px;font-size:15px;font-weight:700;color:${palette.accent};font-family:${HTML_FONT};">` +
        gridSquareMark(palette.accent) +
        `<span style="margin-left:6px;vertical-align:middle;">${leftTitle}</span>` +
        `</p>` +
        `<p style="margin:0;font-size:14px;line-height:1.75;color:${palette.ink};font-family:${HTML_FONT};">${leftBody}</p>` +
        `</section>`
      const rightCol =
        `<section style="display:inline-block;width:47%;margin-left:6%;vertical-align:top;background-color:${palette.paper};` +
        `border:1px solid ${palette.accentBorder};border-radius:8px;padding:13px 13px;">` +
        `<p style="margin:0 0 8px;font-size:15px;font-weight:700;color:${palette.inkSoft};font-family:${HTML_FONT};">` +
        gridSquareMark(palette.accent) +
        `<span style="margin-left:6px;vertical-align:middle;">${rightTitle}</span>` +
        `</p>` +
        `<p style="margin:0;font-size:14px;line-height:1.75;color:${palette.ink};font-family:${HTML_FONT};">${rightBody}</p>` +
        `</section>`
      return (
        `<section data-ink-block="flagship-compare" style="margin:24px 0;font-size:0;">` +
        leftCol +
        rightCol +
        `</section>`
      )
    })
  }
}

// ─── B3. 时间线 / 步骤条 ──────────────────────────────────────────────────
/**
 * decorateFlagshipTimeline — marker `[时间线] 标题1 | 说明1 || 标题2 | 说明2 || …`：
 * 竖向步骤条，每步左侧方格铸号 chip（accent 底 radius:3 白号 + 套准小白点），右侧
 * inline-block 文本列带 border-left 当时间线轨。说明字段可空。
 *
 * 幂等 data-ink-block="flagship-timeline"。
 */
export function decorateFlagshipTimeline(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-timeline"')) return html
    return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (match, _attrs: string | undefined, inner: string) => {
      const text = firstText(inner)
      const items = parseMarkerItems(text, '时间线')
      if (!items || items.length === 0) return match
      const steps = items
        .map((seg, i) => {
          const idx = String(i + 1).padStart(2, '0')
          const title = seg[0] ?? ''
          const desc = seg[1] ?? ''
          if (!title) return ''
          const tick =
            `<span style="display:inline-block;width:3px;height:3px;background-color:#ffffff;` +
            `vertical-align:top;margin:2px 0 0 -7px;"></span>`
          const chip =
            `<span style="display:inline-block;min-width:24px;height:24px;line-height:24px;text-align:center;` +
            `background-color:${palette.accent};color:${palette.onAccent};font-size:13px;font-weight:700;` +
            `border-radius:3px;vertical-align:top;margin-right:12px;font-family:${HTML_FONT};">${idx}</span>` +
            tick
          const descNode = desc
            ? `<p style="margin:4px 0 0;font-size:14px;line-height:1.7;color:${palette.inkSoft};font-family:${HTML_FONT};">${escapeHtmlText(desc)}</p>`
            : ''
          return (
            `<section style="margin:0 0 14px;">` +
            chip +
            `<section style="display:inline-block;width:80%;vertical-align:top;border-left:2px solid ${palette.accentBorder};` +
            `padding:0 0 6px 14px;">` +
            `<p style="margin:0;font-size:16px;font-weight:700;color:${palette.ink};line-height:1.5;font-family:${HTML_FONT};">${escapeHtmlText(title)}</p>` +
            descNode +
            `</section>` +
            `</section>`
          )
        })
        .join('')
      if (!steps) return match
      return (
        `<section data-ink-block="flagship-timeline" style="margin:24px 0;">` +
        steps +
        `</section>`
      )
    })
  }
}

// ─── B4. 横滑相册 ─────────────────────────────────────────────────────────
/**
 * decorateFlagshipGallery — marker `[相册] 卡标题1 | 卡内容1 || 卡标题2 | 卡内容2 || …`：
 * 纯 CSS scroll-snap 轨（沿用 i-scrollcards 形态：overflow-x:auto + scroll-snap-type
 * + white-space:nowrap，**不用 flex**），卡片 live HTML 文字，卡宽 80% 留露头。
 *
 * 需 ≥2 条目；否则原样返回。幂等 data-ink-block="flagship-gallery"。
 */
export function decorateFlagshipGallery(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-gallery"')) return html
    return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (match, _attrs: string | undefined, inner: string) => {
      const text = firstText(inner)
      const items = parseMarkerItems(text, '相册')
      if (!items || items.length < 2) return match
      const cards = items
        .map((seg, i) => {
          const idx = String(i + 1).padStart(2, '0')
          const title = seg[0] ?? ''
          const body = seg[1] ?? ''
          if (!title) return ''
          return (
            `<section style="display:inline-block;white-space:normal;width:80%;margin-right:3%;scroll-snap-align:center;` +
            `vertical-align:top;background-color:${palette.paperWarm};border:1px solid ${palette.hairline};border-radius:12px;padding:16px 16px;">` +
            `<p style="margin:0;font-size:13px;font-weight:700;color:${palette.accent};letter-spacing:1px;font-family:${HTML_FONT};">` +
            gridNumberSmall(palette.accent, idx) +
            `<span style="margin-left:8px;vertical-align:middle;">${escapeHtmlText(title)}</span>` +
            `</p>` +
            `<p style="margin:10px 0 0;font-size:15px;line-height:1.8;color:${palette.ink};font-family:${HTML_FONT};">${escapeHtmlText(body)}</p>` +
            `<p style="margin:10px 0 0;text-align:right;">${diamondTerminalSvg(palette.accent)}</p>` +
            `</section>`
          )
        })
        .join('')
      if (!cards) return match
      return (
        `<section data-ink-block="flagship-gallery" style="margin:24px 0;overflow-x:auto;` +
        `-webkit-overflow-scrolling:touch;white-space:nowrap;scroll-snap-type:x mandatory;-webkit-user-select:none;">` +
        cards +
        `</section>`
      )
    })
  }
}

// ─── B5. 出处 / 注释卡 ────────────────────────────────────────────────────
/**
 * decorateFlagshipCitation — marker `[出处] 引文 | 来源`：正式引文/脚注，小字号、
 * 细左边线、右对齐来源署名。区别于 blockquote 引用卡（那是 `>` 行内引用的不对称构成块）。
 * 来源字段可空。幂等 data-ink-block="flagship-citation"。
 */
export function decorateFlagshipCitation(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-citation"')) return html
    return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (match, _attrs: string | undefined, inner: string) => {
      const text = firstText(inner)
      const items = parseMarkerItems(text, '出处')
      if (!items || items.length === 0) return match
      const seg = items[0]
      const quote = seg[0] ?? ''
      const source = seg[1] ?? ''
      if (!quote) return match
      const sourceNode = source
        ? `<p style="margin:10px 0 0;font-size:12px;color:${palette.inkSoft};letter-spacing:0.5px;text-align:right;font-family:${HTML_FONT};">` +
          `<span style="vertical-align:middle;">— ${escapeHtmlText(source)}</span>` +
          diamondSep(palette.accent) +
          `</p>`
        : ''
      return (
        `<section data-ink-block="flagship-citation" style="margin:22px 0;padding:14px 18px;` +
        `background-color:${palette.paperWarm};border-radius:8px;border-left:3px solid ${palette.accentBorder};">` +
        `<p style="margin:0;font-size:14px;line-height:1.85;color:${palette.ink};font-family:${HTML_FONT};">${escapeHtmlText(quote)}</p>` +
        sourceNode +
        `</section>`
      )
    })
  }
}

// ─── B6. 折叠 marker 接线 → i-stretch ─────────────────────────────────────
/**
 * decorateFlagshipStretch — marker `[折叠] 标题 | 内容`：调 i-stretch SMIL 折叠模块
 * （点击揭示式，非高度塌缩）。opts.primaryColor + opts.persona 用于建 theme 取 allowMotion。
 *
 * preview/wechat → motion=true（含 cover + animate）；xhs/zhihu → motion=false（静态展开）。
 * 幂等：i-stretch 自身 data-ink-svg="i-stretch" 哨兵。
 */
export function decorateFlagshipStretch(
  _palette: SvgPalette,
  opts: { primaryColor: string; persona: PresetPersona },
): BlockDecorateFn {
  return (html: string, target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-svg="i-stretch"')) return html
    return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (match, _attrs: string | undefined, inner: string) => {
      const text = firstText(inner)
      const items = parseMarkerItems(text, '折叠')
      if (!items || items.length === 0) return match
      const seg = items[0]
      const title = seg[0] ?? ''
      const body = seg[1] ?? ''
      if (!title) return match
      const theme = buildThemeContext({
        primaryColor: opts.primaryColor,
        persona: opts.persona,
        target,
      })
      return renderStretch({ theme, text: title, items: [{ title, body }] })
    })
  }
}
