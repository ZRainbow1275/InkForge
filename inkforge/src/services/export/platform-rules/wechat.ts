/**
 * WeChat platform-specific compliance rules.
 *
 * Pure, side-effect-free transforms applied to inline-CSS HTML before it's
 * pasted into the WeChat editor. References oaker-io/wewrite spacing rules
 * and WeChat Mini Programs' dark-mode `data-darkmode-*` metadata convention.
 *
 * All transforms are idempotent — applying the same rule twice yields the
 * same output as applying it once.
 */

// ════════════════════════════════════════════════════════════════════
// Public types
// ════════════════════════════════════════════════════════════════════

export interface WechatRuleOptions {
  enableCjkSpacing?: boolean
  /** Pixel cap for the wrapping content column. Pass `null` to skip clamping. */
  maxContentWidth?: number | null
  enableDarkMode?: boolean
  darkModeText?: string
  darkModeBg?: string
}

const DEFAULT_MAX_WIDTH = 677
const DEFAULT_DARK_TEXT = '#FFFFFF|'
const DEFAULT_DARK_BG = '#1F1F1F|'
/**
 * Narrow no-break space (U+202F) — typographically correct CJK/Latin gap.
 *
 * Why U+202F over U+00A0 NBSP:
 *   - U+202F renders at ~1/4 em width, matching the InDesign/Word "1/4 汉字宽"
 *     rule from 中文文案排版指北 — the visual goal of CJK/Latin spacing.
 *   - U+00A0 is full-width (same as a regular space) and looks too wide between
 *     CJK and Latin tokens — appropriate for *preserving indentation* in code
 *     blocks (see VerySmallWoods bm.md use case), but NOT for typographic gaps.
 *   - oaker-io/wewrite — the reference WeChat exporter — also uses U+202F.
 *
 * Code-block indentation (a different concern) is preserved by treating
 * <pre>/<code> as opaque in {@link tokenize} above, so this character never
 * leaks into source listings.
 */
const THIN_SPACE = '\u202F'

// ════════════════════════════════════════════════════════════════════
// Tokenization helpers
// ════════════════════════════════════════════════════════════════════

interface HtmlSegment {
  kind: 'tag' | 'text' | 'opaque'
  value: string
}

const OPAQUE_TAGS = new Set(['code', 'pre', 'style', 'script'])

/**
 * Split an HTML string into tag / text / opaque segments. Opaque segments are
 * full element ranges (e.g. `<code>foo</code>`) whose interior must not be
 * rewritten by text-level rules.
 */
function tokenize(html: string): HtmlSegment[] {
  const out: HtmlSegment[] = []
  let cursor = 0

  while (cursor < html.length) {
    const lt = html.indexOf('<', cursor)
    if (lt === -1) {
      if (cursor < html.length) out.push({ kind: 'text', value: html.slice(cursor) })
      break
    }
    if (lt > cursor) {
      out.push({ kind: 'text', value: html.slice(cursor, lt) })
    }

    const tagMatch = /^<\/?([a-zA-Z][a-zA-Z0-9]*)\b/.exec(html.slice(lt))
    if (!tagMatch) {
      // Stray '<' — emit as literal text and advance one char.
      out.push({ kind: 'text', value: '<' })
      cursor = lt + 1
      continue
    }

    const tagEnd = html.indexOf('>', lt)
    if (tagEnd === -1) {
      out.push({ kind: 'text', value: html.slice(lt) })
      break
    }

    const tagName = tagMatch[1].toLowerCase()
    const isClose = html[lt + 1] === '/'
    const tagText = html.slice(lt, tagEnd + 1)

    if (!isClose && OPAQUE_TAGS.has(tagName)) {
      // Locate the matching close tag to capture an opaque range.
      const closeNeedle = `</${tagName}`
      const lower = html.toLowerCase()
      const closeStart = lower.indexOf(closeNeedle, tagEnd + 1)
      if (closeStart === -1) {
        out.push({ kind: 'tag', value: tagText })
        cursor = tagEnd + 1
        continue
      }
      const closeEnd = html.indexOf('>', closeStart)
      if (closeEnd === -1) {
        out.push({ kind: 'tag', value: tagText })
        cursor = tagEnd + 1
        continue
      }
      out.push({ kind: 'opaque', value: html.slice(lt, closeEnd + 1) })
      cursor = closeEnd + 1
      continue
    }

    out.push({ kind: 'tag', value: tagText })
    cursor = tagEnd + 1
  }

  return out
}

// ════════════════════════════════════════════════════════════════════
// CJK / Latin spacing
// ════════════════════════════════════════════════════════════════════

// Unified CJK Ideographs + Hiragana + Katakana + CJK Punctuation core ranges.
// Conservative — matches what wewrite/pangu treat as "CJK letter".
const CJK = '\u4E00-\u9FFF\u3040-\u30FF\u3400-\u4DBF\uF900-\uFAFF'
const LATIN = 'A-Za-z0-9'

// Match an existing thin-space gap so we treat it as already-spaced.
const SPACED_GAP = `[\\s${THIN_SPACE}]`

/**
 * Insert a U+202F thin space between adjacent CJK characters and ASCII
 * letters/digits in either order. Respects code/pre/style/script boundaries
 * and does not touch tag attributes. Idempotent.
 */
export function applyCjkLatinSpacing(html: string): string {
  if (!html) return html
  const tokens = tokenize(html)
  const cjkAfterLatin = new RegExp(`([${LATIN}])(?!${SPACED_GAP})([${CJK}])`, 'g')
  const latinAfterCjk = new RegExp(`([${CJK}])(?!${SPACED_GAP})([${LATIN}])`, 'g')

  for (const seg of tokens) {
    if (seg.kind !== 'text') continue
    let next = seg.value
    // Run both directions twice in case insertions create new boundaries.
    for (let i = 0; i < 2; i++) {
      next = next.replace(cjkAfterLatin, `$1${THIN_SPACE}$2`)
      next = next.replace(latinAfterCjk, `$1${THIN_SPACE}$2`)
    }
    seg.value = next
  }

  return tokens.map((t) => t.value).join('')
}

// ════════════════════════════════════════════════════════════════════
// Content-width clamp
// ════════════════════════════════════════════════════════════════════

const CLAMP_MARKER = 'data-wechat-clamp="1"'

/**
 * Wrap the inner content of `<section id="nice">` (or, when absent, the whole
 * input) in a centered max-width column. Idempotent via a sentinel attribute.
 */
export function clampContentWidth(html: string, maxWidth: number = DEFAULT_MAX_WIDTH): string {
  if (!html) return html
  if (html.includes(CLAMP_MARKER)) return html

  const wrapperOpen = `<div ${CLAMP_MARKER} style="max-width:${maxWidth}px;margin:0 auto;">`
  const wrapperClose = '</div>'

  const sectionOpen = /<section\b[^>]*id=["']nice["'][^>]*>/i
  const openMatch = sectionOpen.exec(html)

  if (!openMatch) {
    return `${wrapperOpen}${html}${wrapperClose}`
  }

  const openEnd = openMatch.index + openMatch[0].length
  // Match the LAST </section> so we wrap the entire inner content.
  const closeIdx = html.toLowerCase().lastIndexOf('</section>')
  if (closeIdx === -1 || closeIdx < openEnd) {
    return html
  }

  const before = html.slice(0, openEnd)
  const inner = html.slice(openEnd, closeIdx)
  const after = html.slice(closeIdx)

  return `${before}${wrapperOpen}${inner}${wrapperClose}${after}`
}

// ════════════════════════════════════════════════════════════════════
// Dark-mode metadata
// ════════════════════════════════════════════════════════════════════

const DARKMODE_TARGETS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'table', 'th', 'td']

function readStyleProp(style: string, prop: string): string | undefined {
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i')
  const m = re.exec(style)
  return m ? m[1].trim() : undefined
}

function ensureAttr(tag: string, attrName: string, attrValue: string): string {
  // Only inject if the attribute is missing — preserves idempotency.
  const re = new RegExp(`\\b${attrName}\\s*=`, 'i')
  if (re.test(tag)) return tag
  // Insert before the closing '>' (handles self-closing too).
  return tag.replace(/(\s*\/?>)$/, ` ${attrName}="${attrValue}"$1`)
}

/**
 * For each WeChat dark-mode-eligible block element, attach
 * `data-darkmode-color`, `data-darkmode-bgcolor`, and the matching
 * `data-darkmode-original-*` attributes. WeChat reads these when rendering
 * dark mode in the article view. Idempotent — existing attributes are kept.
 */
export function injectDarkModeMetadata(
  html: string,
  opts?: { textColor?: string; bgColor?: string }
): string {
  if (!html) return html
  const darkText = opts?.textColor ?? DEFAULT_DARK_TEXT
  const darkBg = opts?.bgColor ?? DEFAULT_DARK_BG

  const tagPattern = new RegExp(`<(${DARKMODE_TARGETS.join('|')})\\b[^>]*>`, 'gi')

  return html.replace(tagPattern, (raw) => {
    const styleMatch = /\sstyle=("[^"]*"|'[^']*')/i.exec(raw)
    const styleValue = styleMatch ? styleMatch[1].slice(1, -1) : ''

    const originalColor = readStyleProp(styleValue, 'color')
    const originalBg = readStyleProp(styleValue, 'background-color') || readStyleProp(styleValue, 'background')

    let updated = raw
    updated = ensureAttr(updated, 'data-darkmode-color', darkText)
    updated = ensureAttr(updated, 'data-darkmode-bgcolor', darkBg)
    if (originalColor) {
      updated = ensureAttr(updated, 'data-darkmode-original-color', `${originalColor}|${originalColor}`)
    }
    if (originalBg) {
      updated = ensureAttr(updated, 'data-darkmode-original-bgcolor', `${originalBg}|${originalBg}`)
    }
    return updated
  })
}

// ════════════════════════════════════════════════════════════════════
// Orchestrator
// ════════════════════════════════════════════════════════════════════

/**
 * Apply WeChat compliance rules in canonical order:
 *   1. CJK / Latin spacing
 *   2. Content-width clamp
 *   3. Dark-mode metadata
 *
 * Each phase respects its individual toggle. Defaults: spacing on, clamp on,
 * dark-mode off (opt-in because color inversion is theme-dependent).
 */
export function wechatComplianceTransform(html: string, options: WechatRuleOptions = {}): string {
  const {
    enableCjkSpacing = true,
    maxContentWidth = DEFAULT_MAX_WIDTH,
    enableDarkMode = false,
    darkModeText,
    darkModeBg,
  } = options

  let result = html
  if (enableCjkSpacing) {
    result = applyCjkLatinSpacing(result)
  }
  if (maxContentWidth !== null && maxContentWidth !== undefined) {
    result = clampContentWidth(result, maxContentWidth)
  }
  if (enableDarkMode) {
    result = injectDarkModeMetadata(result, { textColor: darkModeText, bgColor: darkModeBg })
  }
  return result
}

// ════════════════════════════════════════════════════════════════════
// Default export bundle (for callers that prefer namespaced access)
// ════════════════════════════════════════════════════════════════════

const wechatRules = {
  applyCjkLatinSpacing,
  clampContentWidth,
  injectDarkModeMetadata,
  wechatComplianceTransform,
}

export default wechatRules
