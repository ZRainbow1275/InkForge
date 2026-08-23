/**
 * Markdown preprocessor for the 数字人民币 fidelity fixture.
 *
 * Compensates for two known issues observed in v1 render:
 *  1. marked's CommonMark flanking rules reject **X** when the asterisk sits
 *     adjacent to CJK punctuation (`“X”`, `《X》`). Result: 77 literal `**`
 *     leaked into v1 output. Fix: rewrite every well-formed `**X**` (no nested
 *     asterisks, no newline) to `<strong>X</strong>` HTML, bypassing marked.
 *  2. Source uses ONLY `### third-level` for the 6 chapter headings AND for
 *     each 1.x / 2.x subsection. v1 renderer applied identical H3 styling to
 *     both. Fix: promote `### 第X部分…` lines to `## …`, strip their `**`
 *     wrapping. Insert two missing chapters (`第三部分` / `第四部分`) the
 *     source author elided.
 *
 * Additionally adds a top-level `# 中国数字人民币战略全景报告` so the preset's
 * `h1` decoration (drop cap underline / centered title) actually fires.
 */

const CHINESE_NUMERAL = /第[一二三四五六七八九十]+部分/

export interface PreprocessOutput {
  markdown: string
  stats: {
    boldReplacements: number
    italicReplacements: number
    h3PromotedToH2: number
    h2ChaptersInserted: number
    h1TitleInserted: boolean
  }
}

export function preprocessArticleForWechat(raw: string): PreprocessOutput {
  let md = raw
  const stats = {
    boldReplacements: 0,
    italicReplacements: 0,
    h3PromotedToH2: 0,
    h2ChaptersInserted: 0,
    h1TitleInserted: false,
  }

  // 1. Promote `### **第X部分：标题**` to `## 标题` — strip BOTH the bold wrapper
  //    AND the "第X部分" prefix. Reason: the `elegant` preset uses recipe
  //    `cjk-decimal-h2` which auto-injects `第N章` numbering. Leaving "第X部分:"
  //    in the heading text would render double-numbered like "第一章第一部分:...".
  //    Drop the prefix → recipe gives clean `第一章 架构蓝图——…`.
  md = md.replace(
    /^### \*\*第[一二三四五六七八九十]+部分[：:\s]+([^*\n]+?)\*\*\s*$/gm,
    (_m, title: string) => {
      stats.h3PromotedToH2 += 1
      return `## ${title.trim()}`
    },
  )

  // 1.5 Insert the two chapter headings the source skipped — 第三部分 / 第四部分.
  //     Source uses `### **3.1 ...**` / `### **4.1 ...**` for the first subsection
  //     inside each missing chapter. We insert a clean `## 标题` H2 (no "第X部分"
  //     prefix; the cjk-decimal-h2 recipe will inject "第三章 / 第四章" at render
  //     time). MUST run before step 1.75's `**` strip — otherwise the marker
  //     pattern `### **N.1` no longer exists.
  const chapter3Marker = /^### \*\*3\.1\s/m
  if (chapter3Marker.test(md)) {
    md = md.replace(
      chapter3Marker,
      '## 全球范式革命——重构跨境金融基础设施\n\n### **3.1 ',
    )
    stats.h2ChaptersInserted += 1
  }
  const chapter4Marker = /^### \*\*4\.1\s/m
  if (chapter4Marker.test(md)) {
    md = md.replace(
      chapter4Marker,
      '## 沪港双城——一国两制下的战略二元论\n\n### **4.1 ',
    )
    stats.h2ChaptersInserted += 1
  }

  // 1.75 Strip `**` wrappers from `### `/`#### ` heading lines. The author wraps
  //      every subsection title in `**...**`, but a heading inside a heading
  //      creates `<h3><strong>...</strong></h3>` after rendering, which collapses
  //      the H3-vs-H4 visual hierarchy (layout review item #1). The preset
  //      already colors h3/h4 — the `<strong>` adds no information.
  md = md.replace(/^(#{3,4} )\*\*([^*\n]+?)\*\*\s*$/gm, (_m, prefix: string, title: string) => {
    return `${prefix}${title.trim()}`
  })

  // 2. Inject article title H1 + subtitle (em) at the top.
  if (!/^# /.test(md.trimStart())) {
    md = '# 中国数字人民币战略全景报告\n\n*——从内部威胁到全球范式革命的十年布局*\n\n' + md
    stats.h1TitleInserted = true
  }

  // 3a. Rewrite `***X***` → `<strong><em>X</em></strong>` FIRST so the leftover
  //     `**X**` regex (step 3b) doesn't capture the inner asterisks and leave
  //     stray `*` on either side. Source line 54 uses `***假设央行…？***`.
  md = md.replace(/\*\*\*([^*\n]+?)\*\*\*/g, (_m, content: string) => {
    stats.boldReplacements += 1
    return `<strong><em>${content}</em></strong>`
  })

  // 3b. Rewrite `**X**` → `<strong>X</strong>`. Regex constraints:
  //    - `[^*\n]+?` forbids nested asterisks AND line breaks → safe against `***` HR
  //      and against multi-line accidents.
  //    - non-greedy so adjacent pairs like `**A** **B**` stay separate.
  md = md.replace(/\*\*([^*\n]+?)\*\*/g, (_m, content: string) => {
    stats.boldReplacements += 1
    return `<strong>${content}</strong>`
  })

  // 3c. Rewrite single `*X*` → `<em>X</em>`. CJK-flanked italics fail CommonMark
  //     flanking rules the same way `**` did. Lookaround guards keep us from
  //     touching the `***` HR or eating the boundary of consumed bolds:
  //     - `(?<!\*)` / `(?!\*)` ensures we're at a standalone `*`, not the edge
  //       of an unconsumed `**`/`***` cluster.
  //     - `(?!\s)` after opening / `(?<!\s)` before closing keeps whitespace
  //       padding out of the capture (CommonMark emphasis rule).
  md = md.replace(/(?<!\*)\*(?!\*|\s)([^*\n]+?)(?<!\s)\*(?!\*)/g, (_m, content: string) => {
    stats.italicReplacements += 1
    return `<em>${content}</em>`
  })

  // 4. Tighten the table cells: source has `**X**<br>**Y**` patterns that v1
  //    produced ugly nested-strong glitches. After step 3 these become
  //    `<strong>X</strong><br><strong>Y</strong>` which renders cleanly.
  //    (no extra rule needed — listed for documentation.)

  return { markdown: md, stats }
}

// Sanity check: at least one promotion + several bold rewrites + title inserted.
// Throws are checked from the fidelity fixture so a misshapen input fails fast.
export function assertPreprocessLooksReasonable(stats: PreprocessOutput['stats']): void {
  if (stats.boldReplacements < 50) {
    throw new Error(`expected ≥50 bold replacements, got ${stats.boldReplacements}`)
  }
  if (stats.h3PromotedToH2 < 1) {
    throw new Error('expected at least one 第X部分 H3→H2 promotion')
  }
  if (!stats.h1TitleInserted) {
    throw new Error('expected H1 title insertion')
  }
}
