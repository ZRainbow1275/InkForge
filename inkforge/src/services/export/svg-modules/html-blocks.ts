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
import type { ExportTarget } from '@/types'
import type { SvgPalette } from './types'
import { renderVesselMark } from './endmarks'

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

// ════════════════════════════════════════════════════════════════════════
// H2 — 三个旗舰各一种「色块」形态
// ════════════════════════════════════════════════════════════════════════

/**
 * decorateFlagshipH2 — 把 `<h2>…</h2>` 替换为色块标题（保留内部文字）。
 * 计数器在返回函数内部声明（每次文档调用从 0 起），保证幂等 + 编号正确。
 *
 * 变体：
 *   - kiln    ：实色填充条（accent 底 + onAccent 文字 + 小前导序号）。
 *   - tempera ：序号 chip「01」(accent 底) + ink 标题 + 2px accent 底线。
 *   - amber   ：左 5px accent 竖条 + 小写 kicker「PART 0N」+ ink 标题。
 */
export function decorateFlagshipH2(
  palette: SvgPalette,
  opts: { variant: 'kiln' | 'tempera' | 'amber' },
): BlockDecorateFn {
  const { variant } = opts
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-h2"')) return html
    let n = 0
    return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, _attrs: string | undefined, inner: string) => {
      n += 1
      const idx = String(n).padStart(2, '0')
      if (variant === 'kiln') {
        // 实色填充条 + 前导序号（onAccent）。
        const lead = `<span style="display:inline-block;font-size:0.7em;font-weight:700;letter-spacing:1px;color:${palette.onAccent};opacity:0.7;margin-right:0.7em;vertical-align:middle;">${idx}</span>`
        return (
          `<section data-ink-block="flagship-h2" style="margin:34px 0 18px;">` +
          `<p style="margin:0;background-color:${palette.accent};color:${palette.onAccent};` +
          `font-family:${HTML_FONT};font-size:19px;font-weight:700;letter-spacing:1px;` +
          `line-height:1.5;padding:11px 18px;border-radius:4px;">${lead}<span style="vertical-align:middle;">${inner}</span></p>` +
          `</section>`
        )
      }
      if (variant === 'tempera') {
        // 序号 chip + ink 标题 + accent 底线。学术克制。
        const chip = `<span style="display:inline-block;background-color:${palette.accent};color:${palette.onAccent};` +
          `font-size:15px;font-weight:700;letter-spacing:1px;padding:3px 9px;border-radius:4px;` +
          `vertical-align:middle;margin-right:12px;">${idx}</span>`
        return (
          `<section data-ink-block="flagship-h2" style="margin:34px 0 18px;">` +
          `<p style="margin:0;line-height:1.4;padding-bottom:0.35em;border-bottom:2px solid ${palette.accent};">` +
          `${chip}<span style="color:${palette.ink};font-family:${HTML_FONT};font-size:19px;font-weight:600;` +
          `letter-spacing:0.5px;vertical-align:middle;">${inner}</span></p>` +
          `</section>`
        )
      }
      // amber：左竖条 + 小写 kicker + ink 标题。商务编辑感。
      const kicker = `<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:2px;` +
        `color:${palette.accent};line-height:1;font-family:${HTML_FONT};">PART ${idx}</p>`
      return (
        `<section data-ink-block="flagship-h2" style="margin:34px 0 18px;border-left:5px solid ${palette.accent};padding-left:0.7em;">` +
        kicker +
        `<p style="margin:0;color:${palette.ink};font-family:${HTML_FONT};font-size:19px;font-weight:700;` +
        `letter-spacing:0.5px;line-height:1.4;">${inner}</p>` +
        `</section>`
      )
    })
  }
}

// ════════════════════════════════════════════════════════════════════════
// H3 — 左 3px accent 竖条 + ink 标题（三旗舰统一，弱于 H2）
// ════════════════════════════════════════════════════════════════════════

export function decorateFlagshipH3(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-h3"')) return html
    return html.replace(/<h3(\s[^>]*)?>([\s\S]*?)<\/h3>/gi, (_m, _attrs: string | undefined, inner: string) => {
      return (
        `<section data-ink-block="flagship-h3" style="margin:26px 0 14px;border-left:3px solid ${palette.accent};` +
        `background-color:${palette.accentTint};border-radius:0 4px 4px 0;padding:7px 14px;">` +
        `<p style="margin:0;color:${palette.ink};font-family:${HTML_FONT};font-size:17px;font-weight:600;` +
        `letter-spacing:0.5px;line-height:1.5;">${inner}</p>` +
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
 * 大装饰引号 mark（左上水印），非 emoji，内联 SVG <path> 实色 + opacity。
 */
function quoteGlyph(fill: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90" width="44" height="33" ` +
    `style="display:block;margin:0 0 2px;">` +
    `<path d="M50,80 C50,45 70,24 104,24 L104,46 C86,46 76,56 76,72 L104,72 L104,84 L50,84 Z ` +
    `M0,80 C0,45 20,24 54,24 L54,46 C36,46 26,56 26,72 L54,72 L54,84 L0,84 Z" fill="${fill}" opacity="0.16" /></svg>`
  )
}

/**
 * decorateFlagshipBlockquote — 把 `<blockquote>…</blockquote>` 替换为 callout 框或
 * 引用卡。**保留内部 HTML**（不拍平成纯文本），文字活、可重排。
 */
export function decorateFlagshipBlockquote(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    if (html.includes('data-ink-block="flagship-quote"') || html.includes('data-ink-block="flagship-callout"')) {
      return html
    }
    return html.replace(/<blockquote(\s[^>]*)?>([\s\S]*?)<\/blockquote>/gi, (_m, _attrs: string | undefined, inner: string) => {
      const text = firstText(inner)
      const callout = detectCallout(text, palette)
      if (callout) {
        // CALLOUT 框：淡彩底 + 左 4px accent 竖条 + 图标 + 加粗标签行 + 正文。
        const tint = callout.color === palette.accent ? palette.accentTint : rgbaFor(callout.color, 0.07)
        const labelRow =
          `<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${callout.color};font-family:${HTML_FONT};">` +
          iconSvg(callout.icon, callout.color) +
          callout.label +
          `</p>`
        // 去掉正文首行的关键词前缀，避免「提示提示…」重复。
        const bodyHtml = stripLeadKeyword(inner)
        return (
          `<section data-ink-block="flagship-callout" style="margin:24px 0;padding:14px 18px;` +
          `border-left:4px solid ${callout.color};border-radius:8px;background-color:${tint};">` +
          labelRow +
          `<section style="margin:0;font-size:15px;line-height:1.85;color:${palette.ink};word-break:break-word;">${bodyHtml}</section>` +
          `</section>`
        )
      }
      // QUOTE 卡：左 4px accent 竖条 + 淡彩底 + 大装饰引号水印 + 正文（+ 可选署名）。
      const { body: quoteBody, attribution } = splitAttribution(inner)
      const attrNode = attribution
        ? `<p style="margin:12px 0 0;text-align:right;font-size:13px;letter-spacing:0.04em;color:${palette.inkSoft};">— ${escapeHtmlText(attribution)}</p>`
        : ''
      return (
        `<section data-ink-block="flagship-quote" style="margin:26px 0;padding:18px 22px;` +
        `border-left:4px solid ${palette.accent};border-radius:8px;background-color:${palette.accentTint};">` +
        quoteGlyph(palette.accent) +
        `<section style="margin:0;font-size:16px;line-height:1.9;letter-spacing:0.04em;color:${palette.ink};word-break:break-word;">${quoteBody}</section>` +
        attrNode +
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
// Lists — UL 方块标记 / OL 圆角编号 chip（品牌色）
// ════════════════════════════════════════════════════════════════════════

export function decorateFlagshipLists(palette: SvgPalette): BlockDecorateFn {
  return (html: string, _target: ExportTarget): string => {
    if (!html) return html
    let result = html

    // UL：list-style:none + 每个顶层 <li> 前置 accent 方块标记。
    if (!result.includes('data-ink-block="flagship-ul"')) {
      result = result.replace(/<ul(\s[^>]*)?>([\s\S]*?)<\/ul>/gi, (match, _ulAttrs: string | undefined, ulBody: string) => {
        if (ulBody.includes('data-ink-block="flagship-ul"')) return match
        const marker =
          `<span data-ink-block="flagship-ul" style="display:inline-block;width:7px;height:7px;` +
          `background-color:${palette.accent};border-radius:1px;margin-right:0.6em;vertical-align:middle;"></span>`
        const processed = ulBody.replace(/<li(\s[^>]*)?>([\s\S]*?)<\/li>/gi, (_m, liAttrs: string | undefined, liInner: string) => {
          const la = liAttrs ?? ''
          return `<li${la} style="list-style:none;margin:8px 0;line-height:1.8;">${marker}<span style="vertical-align:middle;">${liInner}</span></li>`
        })
        return `<ul style="list-style:none;padding-left:0;margin:16px 0;">${processed}</ul>`
      })
    }

    // OL：每个 <li> 前置圆形品牌编号 chip（每个 <ol> 计数重置）。
    if (!result.includes('data-ink-block="flagship-ol"')) {
      result = result.replace(/<ol(\s[^>]*)?>([\s\S]*?)<\/ol>/gi, (match, _olAttrs: string | undefined, olBody: string) => {
        if (olBody.includes('data-ink-block="flagship-ol"')) return match
        let liCounter = 0
        const processed = olBody.replace(/<li(\s[^>]*)?>([\s\S]*?)<\/li>/gi, (_m, liAttrs: string | undefined, liInner: string) => {
          liCounter += 1
          const la = liAttrs ?? ''
          const chip =
            `<span data-ink-block="flagship-ol" style="display:inline-block;min-width:22px;height:22px;` +
            `line-height:22px;text-align:center;background-color:${palette.accent};color:${palette.onAccent};` +
            `font-size:13px;font-weight:600;border-radius:50%;margin-right:12px;vertical-align:middle;">${liCounter}</span>`
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

    const card =
      `<section data-ink-block="flagship-footer" style="margin:36px 0 8px;padding:24px 20px;` +
      `background-color:${palette.paperWarm};border:1px solid ${palette.hairline};border-radius:14px;text-align:center;">` +
      markSvg +
      `<p style="margin:0;font-size:15px;font-weight:600;color:${palette.ink};letter-spacing:1px;font-family:${HTML_FONT};">${escapeHtmlText(brand)}</p>` +
      `<p style="margin:6px 0 0;font-size:13px;color:${palette.inkSoft};letter-spacing:1px;font-family:${HTML_FONT};">${escapeHtmlText(tagline)}</p>` +
      // 短 accent 细线居中：用 display:inline-block + 父级 text-align:center 居中，
      // 不用 margin:auto（postProcessForWechat 会把 `margin:16px auto` 改写成
      // `margin:16px 0` → 居中失效、靠左）。
      `<section style="display:inline-block;width:48px;height:2px;margin:16px 0 12px;background-color:${palette.accent};border-radius:1px;"></section>` +
      `<p style="margin:0;font-size:12px;color:${palette.inkSoft};letter-spacing:4px;font-family:${HTML_FONT};">全文完</p>` +
      `</section>`

    return html + card
  }
}
