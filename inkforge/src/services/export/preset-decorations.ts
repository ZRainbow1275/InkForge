/**
 * Preset decoration recipes — dual-track CSS + post-process injectors.
 *
 * Each recipe ships:
 *   - previewCSS: full CSS3 (pseudo-elements, counters, gradients).
 *   - exportCSS: juice-safe subset that survives platform CSS stripping.
 *   - decorate?: optional HTML post-processor that injects real <span> tags
 *     so pseudo-element-only effects (drop cap, CSS counters, large quote
 *     mark) still render on WeChat / XHS / Zhihu where pseudo elements die.
 *
 * Recipes are composable via `composeRecipes(['cjk-drop-cap', ...], opts)`.
 * Decorate functions MUST be idempotent — running them twice on the same
 * HTML produces identical output (no double-wrapping).
 *
 * See `.trellis/tasks/05-23-preset-typography-overhaul/research/
 *      css-decoration-elements.md` for the CSS-level specs.
 */

import type { ExportTarget } from '@/types'

export interface DecorationRecipe {
  id: string
  description: string
  /** Full CSS3 for preview pane (pseudo-elements, counters, gradients). */
  previewCSS: string
  /** Juice-safe CSS subset for platform exports. */
  exportCSS: string
  /** Optional post-processor for export targets. Idempotent. */
  decorate?: (html: string, target: ExportTarget) => string
}

// ════════════════════════════════════════════════════════════════════════
// Recipe implementations
// ════════════════════════════════════════════════════════════════════════

const HR_TAG_PATTERN = /<hr(?:\s[^>]*)?\s*\/?>/gi

// ─── 1. CJK Drop Cap ────────────────────────────────────────────────────
const cjkDropCap: DecorationRecipe = {
  id: 'cjk-drop-cap',
  description:
    'First character of the first paragraph rendered as a 3.2em drop cap. ' +
    'Preview uses ::first-letter; export wraps the char in <span class="dc">.',
  previewCSS: `
#nice > p:first-of-type::first-letter {
  font-size: 3.2em;
  font-weight: 900;
  float: left;
  line-height: 0.85;
  margin: 0.05em 0.12em -0.08em 0;
  color: var(--ink-accent, #8B0000);
}
`,
  exportCSS: `
#nice .ink-dc {
  font-size: 3.2em;
  font-weight: 900;
  float: left;
  line-height: 1;
  margin: 0.08em 0.12em -0.08em 0;
}
`,
  decorate(html, target) {
    if (target === 'preview') return html
    // Wrap the first non-whitespace, non-tag char of the first <p>.
    // Skip if already wrapped (idempotency).
    return html.replace(
      /<p(\s[^>]*)?>(\s*)([一-鿿㐀-䶿A-Za-z])/,
      (match, attrs: string | undefined, ws: string, char: string) => {
        // Already wrapped? bail.
        if (match.includes('class="ink-dc"')) return match
        const a = attrs ?? ''
        return `<p${a}>${ws}<span class="ink-dc" style="font-size:3.2em;font-weight:900;float:left;line-height:1;margin:0.08em 0.12em -0.08em 0;">${char}</span>`
      },
    )
  },
}

// ─── 2. Ornament HR ─────────────────────────────────────────────────────
const ornamentHr: DecorationRecipe = {
  id: 'ornament-hr',
  description:
    '<hr> rendered as a centered glyph row (❀ ❀ ❀). Preview uses ::before, ' +
    'export replaces <hr> with a real <div class="ink-ornament-hr">.',
  previewCSS: `
#nice hr {
  border: 0;
  text-align: center;
  margin: 2.4em 0;
  height: 0;
  overflow: visible;
}
#nice hr::before {
  content: '❀ ❀ ❀';
  display: inline-block;
  font-size: 14px;
  letter-spacing: 0.6em;
  color: var(--ink-accent, #B8860B);
  opacity: 0.7;
}
`,
  exportCSS: `
#nice .ink-ornament-hr {
  text-align: center;
  margin: 2.4em 0;
  font-size: 14px;
  letter-spacing: 0.6em;
  color: #B8860B;
  opacity: 0.85;
}
`,
  decorate(html, target) {
    if (target === 'preview') return html
    // Already converted? bail.
    if (html.includes('class="ink-ornament-hr"')) return html
    return html.replace(
      HR_TAG_PATTERN,
      '<div class="ink-ornament-hr" style="text-align:center;margin:2.4em 0;font-size:14px;letter-spacing:0.6em;color:#B8860B;opacity:0.85;">❀ ❀ ❀</div>',
    )
  },
}

// ─── 3. Large Opening Quote ─────────────────────────────────────────────
const largeQuote: DecorationRecipe = {
  id: 'large-quote',
  description:
    'Blockquote opens with a large decorative "" mark. Preview uses ::before, ' +
    'export injects a real <span class="ink-quote-mark"> at start of quote.',
  previewCSS: `
#nice blockquote {
  position: relative;
  padding: 1.2em 1.4em 1em 3em;
  border-left: none;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 0 4px 4px 0;
}
#nice blockquote::before {
  content: '\\201C';
  position: absolute;
  top: -0.1em;
  left: 0.4em;
  font-size: 3.6em;
  line-height: 1;
  color: var(--ink-accent, #8B0000);
  opacity: 0.35;
  font-family: Georgia, 'Times New Roman', serif;
}
`,
  exportCSS: `
#nice blockquote {
  padding: 1em 1.2em;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 0 4px 4px 0;
}
#nice .ink-quote-mark {
  font-size: 2.4em;
  line-height: 1;
  color: #8B0000;
  opacity: 0.5;
  margin-right: 0.2em;
  font-family: Georgia, 'Times New Roman', serif;
  vertical-align: -0.15em;
}
`,
  decorate(html, target) {
    if (target === 'preview') return html
    // Inject quote mark into the first <p> of each <blockquote>. Skip if already wrapped.
    return html.replace(
      /<blockquote(\s[^>]*)?>([\s\S]*?)<\/blockquote>/gi,
      (match, attrs: string | undefined, body: string) => {
        if (body.includes('class="ink-quote-mark"')) return match
        const a = attrs ?? ''
        const injected = body.replace(
          /(<p(?:\s[^>]*)?>)(\s*)/,
          (_m: string, openTag: string, ws: string) =>
            `${openTag}${ws}<span class="ink-quote-mark" style="font-size:2.4em;line-height:1;color:#8B0000;opacity:0.5;margin-right:0.2em;font-family:Georgia,serif;vertical-align:-0.15em;">“</span>`,
        )
        return `<blockquote${a}>${injected}</blockquote>`
      },
    )
  },
}

// ─── 4. CJK Decimal H2 Counter ──────────────────────────────────────────
const cjkDecimalH2: DecorationRecipe = {
  id: 'cjk-decimal-h2',
  description:
    'H2 prefixed with "第N章" using CJK decimal counter. Preview uses CSS ' +
    'counters; export injects <span class="ink-ch-num"> with computed numeral.',
  previewCSS: `
#nice { counter-reset: ink-ch; }
#nice h2 {
  counter-increment: ink-ch;
  position: relative;
  padding-left: 0;
}
#nice h2::before {
  content: '第' counter(ink-ch, cjk-decimal) '章  ';
  color: var(--ink-accent, #5a4a3c);
  font-weight: 600;
  font-size: 0.85em;
  margin-right: 0.4em;
  opacity: 0.8;
}
`,
  exportCSS: `
#nice .ink-ch-num {
  color: #5a4a3c;
  font-weight: 600;
  font-size: 0.85em;
  margin-right: 0.4em;
  opacity: 0.85;
}
`,
  decorate(html, target) {
    if (target === 'preview') return html
    if (html.includes('class="ink-ch-num"')) return html
    const cjkDigits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']
    const toCjk = (n: number): string => {
      if (n <= 0) return cjkDigits[0]
      if (n < 10) return cjkDigits[n]
      if (n < 20) return n === 10 ? '十' : `十${cjkDigits[n - 10]}`
      const tens = Math.floor(n / 10)
      const ones = n % 10
      return `${cjkDigits[tens]}十${ones === 0 ? '' : cjkDigits[ones]}`
    }
    let counter = 0
    return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_match, attrs: string | undefined, content: string) => {
      counter += 1
      const a = attrs ?? ''
      const label = `第${toCjk(counter)}章`
      return `<h2${a}><span class="ink-ch-num" style="color:#5a4a3c;font-weight:600;font-size:0.85em;margin-right:0.4em;opacity:0.85;">${label}</span>${content}</h2>`
    })
  },
}

// ─── 5. Fine Hairline H2 Underline ──────────────────────────────────────
const h2UnderlineFine: DecorationRecipe = {
  id: 'h2-underline-fine',
  description: 'H2 gets a single 1px hairline underline in accent color. No spans needed.',
  previewCSS: `
#nice h2 {
  border-bottom: 1px solid var(--ink-accent, #5a4a3c);
  padding-bottom: 0.3em;
  margin-bottom: 0.9em;
  font-weight: 700;
}
`,
  exportCSS: `
#nice h2 {
  border-bottom: 1px solid #5a4a3c;
  padding-bottom: 0.3em;
  margin-bottom: 0.9em;
  font-weight: 700;
}
`,
}

// ─── 6. Pull-quote with bordered accent ─────────────────────────────────
const pullQuoteBordered: DecorationRecipe = {
  id: 'pull-quote-bordered',
  description: 'Blockquote framed with top + bottom accent bars, centered text.',
  previewCSS: `
#nice blockquote {
  border-top: 2px solid var(--ink-accent, #004080);
  border-bottom: 2px solid var(--ink-accent, #004080);
  border-left: none;
  background: transparent;
  padding: 1em 0;
  margin: 1.6em 0;
  text-align: center;
  font-style: italic;
  color: #2a2a2a;
}
`,
  exportCSS: `
#nice blockquote {
  border-top: 2px solid #004080;
  border-bottom: 2px solid #004080;
  border-left: none;
  background: transparent;
  padding: 1em 0;
  margin: 1.6em 0;
  text-align: center;
  font-style: italic;
  color: #2a2a2a;
}
`,
}

// ─── 7. Numbered list with Roman numerals ───────────────────────────────
const numberedListRoman: DecorationRecipe = {
  id: 'numbered-list-roman',
  description:
    'Ordered lists use upper-roman markers (I, II, III). Pure CSS — ' +
    'list-style is widely supported, no export-time HTML mutation needed.',
  previewCSS: `
#nice ol {
  list-style-type: upper-roman;
  padding-left: 2.4em;
}
#nice ol > li::marker {
  color: var(--ink-accent, #1a1a2e);
  font-weight: 600;
}
`,
  exportCSS: `
#nice ol {
  list-style-type: upper-roman;
  padding-left: 2.4em;
}
#nice ol > li {
  color: #1a1a1a;
}
`,
}

// ─── 8. H3 with left vertical accent bar ────────────────────────────────
const h3VerticalAccent: DecorationRecipe = {
  id: 'h3-vertical-accent',
  description: 'H3 has a 2px accent bar on its left edge.',
  previewCSS: `
#nice h3 {
  border-left: 2px solid var(--ink-accent, #c0392b);
  padding-left: 0.6em;
  margin-top: 1.4em;
  font-weight: 600;
}
`,
  exportCSS: `
#nice h3 {
  border-left: 2px solid #c0392b;
  padding-left: 0.6em;
  margin-top: 1.4em;
  font-weight: 600;
}
`,
}

// ─── 9. H2 full-width colored block ribbon ──────────────────────────────
// Used by meme / news / creative presets to give h2 a strong visual hit.
// Pure CSS recipe — both preview and export render identically because
// background-color + padding + border-radius all survive juice + WeChat
// CSS strip. No <span> injection needed.
const h2BlockRibbon: DecorationRecipe = {
  id: 'h2-block-ribbon',
  description:
    'H2 rendered as a full-width colored block with reversed text color. ' +
    'Pure CSS, no post-process — both engines support background + padding.',
  previewCSS: `
#nice h2 {
  background: var(--ink-accent, #0f172a);
  color: #fff;
  padding: 0.5em 0.8em;
  border-radius: 4px;
  margin-top: 1.6em;
  margin-bottom: 0.9em;
  border-left: none;
  font-weight: 700;
}
`,
  exportCSS: `
#nice h2 {
  background: #0f172a;
  color: #fff;
  padding: 0.5em 0.8em;
  border-radius: 4px;
  margin-top: 1.6em;
  margin-bottom: 0.9em;
  border-left: none;
  font-weight: 700;
}
`,
}

// ════════════════════════════════════════════════════════════════════════
// Preset-specific decorate helpers
// ════════════════════════════════════════════════════════════════════════
// These functions handle pseudo-element effects that are unique to a
// single preset and are NOT covered by the generic recipe system above.
// They follow the same contract: idempotent, regex-based, skip preview.

/**
 * THESIS — h3::before { content: '§ ' }
 * Injects a section-mark span before h3 text content.
 */
export function decorateThesisH3Section(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (html.includes('class="ink-thesis-h3s"')) return html
  return html.replace(
    /<h3(\s[^>]*)?>([\s\S]*?)<\/h3>/gi,
    (_match: string, attrs: string | undefined, content: string) => {
      const a = attrs ?? ''
      return `<h3${a}><span class="ink-thesis-h3s" style="color:#8a7659;font-weight:400;font-style:normal;">§ </span>${content}</h3>`
    },
  )
}

/**
 * THESIS — hr::before { content: '· · ·' }
 * Replaces <hr> with a centered ornamental dots divider.
 */
export function decorateThesisHrDots(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (html.includes('class="ink-thesis-hr"')) return html
  return html.replace(
    HR_TAG_PATTERN,
    '<div class="ink-thesis-hr" style="text-align:center;margin:2em 0;color:#8a7659;letter-spacing:1em;font-size:1.2em;">· · ·</div>',
  )
}

/**
 * LEGAL — p:first-of-type::first-letter drop cap
 * Wraps the first character of the first paragraph in a drop-cap span.
 */
export function decorateLegalDropCap(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (html.includes('class="ink-legal-dc"')) return html
  return html.replace(
    /<p(\s[^>]*)?>(\s*)([一-鿿㐀-䶿A-Za-z])/,
    (match, attrs: string | undefined, ws: string, char: string) => {
      if (match.includes('class="ink-legal-dc"')) return match
      const a = attrs ?? ''
      return `<p${a}>${ws}<span class="ink-legal-dc" style="font-family:'EB Garamond','Crimson Pro',Georgia,serif;font-size:3em;font-weight:700;float:left;line-height:0.9;margin:0.05em 0.12em -0.05em 0;color:#1a1a2e;">${char}</span>`
    },
  )
}

/**
 * LEGAL — h2::before { content: '§ ' counter(legal-section, upper-roman) '. ' }
 * Injects incrementing Roman numeral section marks before each h2.
 */
export function decorateLegalH2Roman(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (html.includes('class="ink-legal-h2r"')) return html
  const toRoman = (n: number): string => {
    const pairs: [number, string][] = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
    ]
    let result = ''
    let remaining = n
    for (const [value, numeral] of pairs) {
      while (remaining >= value) {
        result += numeral
        remaining -= value
      }
    }
    return result
  }
  let counter = 0
  return html.replace(
    /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi,
    (_match: string, attrs: string | undefined, content: string) => {
      counter += 1
      const a = attrs ?? ''
      const label = `§ ${toRoman(counter)}. `
      return `<h2${a}><span class="ink-legal-h2r" style="font-family:'EB Garamond',Georgia,serif;font-weight:400;margin-right:0.3em;color:#3d3d52;">${label}</span>${content}</h2>`
    },
  )
}

/**
 * LEGAL — blockquote::before { content: '"' }
 * Injects a large opening quote mark into each blockquote.
 */
export function decorateLegalBlockquote(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  return html.replace(
    /<blockquote(\s[^>]*)?>([\s\S]*?)<\/blockquote>/gi,
    (match, attrs: string | undefined, body: string) => {
      if (body.includes('class="ink-legal-qm"')) return match
      const a = attrs ?? ''
      const injected = body.replace(
        /(<p(?:\s[^>]*)?>)(\s*)/,
        (_m: string, openTag: string, ws: string) =>
          `${openTag}${ws}<span class="ink-legal-qm" style="font-family:'EB Garamond',Georgia,serif;font-size:2.5em;color:#1a1a2e;line-height:0;vertical-align:-0.4em;margin-right:0.1em;opacity:0.4;">“</span>`,
      )
      return `<blockquote${a}>${injected}</blockquote>`
    },
  )
}

/**
 * REPORT — h1::after { content:''; display:block; width:60px; height:3px; background:#004080 }
 * Appends an underline accent bar after h1 content.
 */
export function decorateReportH1Bar(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (html.includes('class="ink-report-h1b"')) return html
  return html.replace(
    /<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi,
    (_match: string, attrs: string | undefined, content: string) => {
      const a = attrs ?? ''
      return `<h1${a}>${content}<span class="ink-report-h1b" style="display:block;width:60px;height:3px;background:#004080;margin-top:0.4em;"></span></h1>`
    },
  )
}

/**
 * REPORT — h2::before with counter(report-h2, decimal-leading-zero) badge
 * Injects incrementing 01, 02, ... numbered badge spans before each h2.
 */
export function decorateReportH2Badge(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (html.includes('class="ink-report-h2n"')) return html
  let counter = 0
  return html.replace(
    /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi,
    (_match: string, attrs: string | undefined, content: string) => {
      counter += 1
      const a = attrs ?? ''
      const label = String(counter).padStart(2, '0')
      return `<h2${a}><span class="ink-report-h2n" style="font-family:'Inter',sans-serif;font-weight:800;color:#fff;background:#004080;padding:0.1em 0.5em;font-size:0.7em;border-radius:3px;letter-spacing:0.05em;margin-right:0.6em;display:inline-block;">${label}</span>${content}</h2>`
    },
  )
}

/**
 * REPORT — ol li::before { content: counter(report-li, decimal-leading-zero) }
 * Injects zero-padded numbers before each <li> inside <ol>.
 */
export function decorateReportOlNumbers(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (html.includes('class="ink-report-oln"')) return html
  // Process each <ol>...</ol> block independently so counters reset per list.
  return html.replace(
    /<ol(\s[^>]*)?>([\s\S]*?)<\/ol>/gi,
    (match, olAttrs: string | undefined, olBody: string) => {
      if (olBody.includes('class="ink-report-oln"')) return match
      let liCounter = 0
      const processed = olBody.replace(
        /<li(\s[^>]*)?>([\s\S]*?)<\/li>/gi,
        (_m: string, liAttrs: string | undefined, liContent: string) => {
          liCounter += 1
          const la = liAttrs ?? ''
          const num = String(liCounter).padStart(2, '0')
          return `<li${la}><span class="ink-report-oln" style="color:#004080;font-family:'Inter',sans-serif;font-weight:700;font-size:0.95em;margin-right:0.5em;">${num}</span>${liContent}</li>`
        },
      )
      const oa = olAttrs ?? ''
      return `<ol${oa}>${processed}</ol>`
    },
  )
}

/**
 * COMMENTARY — h1::after { content:''; display:block; width:80px; height:5px; background:#c0392b }
 * Appends a red accent bar after h1 content.
 */
export function decorateCommentaryH1Bar(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (html.includes('class="ink-comm-h1b"')) return html
  return html.replace(
    /<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi,
    (_match: string, attrs: string | undefined, content: string) => {
      const a = attrs ?? ''
      return `<h1${a}>${content}<span class="ink-comm-h1b" style="display:block;width:80px;height:5px;background:#c0392b;margin-top:0.4em;"></span></h1>`
    },
  )
}

/**
 * COMMENTARY — h2::before { content:''; left vertical bar }
 * Injects a colored bar span before h2 content.
 * Since position:absolute is WeChat-unsupported, we use a simple inline
 * border-left approach instead (the preset exportCSS already sets
 * padding-left on h2 — this span provides the visual marker).
 */
export function decorateCommentaryH2Bar(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (html.includes('class="ink-comm-h2b"')) return html
  return html.replace(
    /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi,
    (_match: string, attrs: string | undefined, content: string) => {
      const a = attrs ?? ''
      return `<h2${a}><span class="ink-comm-h2b" style="display:inline-block;width:6px;height:0.9em;background:#c0392b;margin-right:0.5em;vertical-align:baseline;border-radius:1px;"></span>${content}</h2>`
    },
  )
}

/**
 * COMMENTARY — h3::after { content:''; display:block; width:28px; height:2px; background:#c0392b }
 * Appends a short red underline after h3 content.
 */
export function decorateCommentaryH3Line(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (html.includes('class="ink-comm-h3l"')) return html
  return html.replace(
    /<h3(\s[^>]*)?>([\s\S]*?)<\/h3>/gi,
    (_match: string, attrs: string | undefined, content: string) => {
      const a = attrs ?? ''
      return `<h3${a}>${content}<span class="ink-comm-h3l" style="display:block;width:28px;height:2px;background:#c0392b;margin-top:0.3em;"></span></h3>`
    },
  )
}

/**
 * COMMENTARY — hr::after { content:'◆' } diamond ornament
 * Replaces <hr> with a centered diamond ornament on a red rule.
 */
export function decorateCommentaryHrDiamond(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (html.includes('class="ink-comm-hrd"')) return html
  return html.replace(
    HR_TAG_PATTERN,
    '<div class="ink-comm-hrd" style="text-align:center;margin:2.4em 0;border-top:3px solid #c0392b;position:relative;"><span style="display:inline-block;color:#c0392b;background:#ffffff;padding:0 0.6em;font-size:0.9em;position:relative;top:-0.6em;">◆</span></div>',
  )
}

// ════════════════════════════════════════════════════════════════════════
// Registry + composer
// ════════════════════════════════════════════════════════════════════════

export const RECIPES: Record<string, DecorationRecipe> = {
  'cjk-drop-cap': cjkDropCap,
  'ornament-hr': ornamentHr,
  'large-quote': largeQuote,
  'cjk-decimal-h2': cjkDecimalH2,
  'h2-underline-fine': h2UnderlineFine,
  'pull-quote-bordered': pullQuoteBordered,
  'numbered-list-roman': numberedListRoman,
  'h3-vertical-accent': h3VerticalAccent,
  'h2-block-ribbon': h2BlockRibbon,
}

export interface ComposeOptions {
  target: 'preview' | 'export'
}

export interface ComposedDecoration {
  css: string
  decorate: (html: string, target: ExportTarget) => string
}

/**
 * Compose multiple recipes into one CSS bundle + one decorate pipeline.
 * Recipes are applied in order; unknown ids are silently skipped.
 */
export function composeRecipes(ids: string[], options: ComposeOptions): ComposedDecoration {
  const recipes = ids.map(id => RECIPES[id]).filter((r): r is DecorationRecipe => Boolean(r))
  const css = recipes
    .map(r => (options.target === 'preview' ? r.previewCSS : r.exportCSS))
    .join('\n')
    .trim()
  const decorate = (html: string, target: ExportTarget): string =>
    recipes.reduce((current, recipe) => (recipe.decorate ? recipe.decorate(current, target) : current), html)
  return { css, decorate }
}

/** Decorate function signature used by presets. */
export type DecorateFn = (html: string, target: ExportTarget) => string

/**
 * Chain multiple decorate functions into one. Functions are applied
 * left-to-right (first function in the array runs first). Each function
 * receives the output of the previous one.
 */
export function chainDecorators(...fns: DecorateFn[]): DecorateFn {
  return (html: string, target: ExportTarget): string =>
    fns.reduce((current, fn) => fn(current, target), html)
}
