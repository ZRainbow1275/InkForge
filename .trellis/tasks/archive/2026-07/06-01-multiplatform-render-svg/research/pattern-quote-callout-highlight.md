# Research: Premium WeChat 公众号 Quote-Card / Callout-Box / Key-Sentence Pattern Catalog

- **Query**: Premium WeChat 公众号 QUOTE CARDS, CALLOUT/NOTE boxes, and KEY-SENTENCE highlight — tinted background cards with left accent border, big quotation-mark motif, attribution line, note/warning boxes, inline highlighted key sentences. WeChat-safe inline-style recipes.
- **Scope**: mixed (internal codebase + production WeChat-editor source + external design knowledge)
- **Date**: 2026-06-02
- **Brand palette (LOCKED)**: tempera `#3B7A6B` · kiln `#D95B3F` · amber `#C19A56` · warm paper `#f7f4ef` · ink `#1a1a1a` · muted ink `rgba(26,26,26,.55)` · hairline `rgba(26,26,26,.12)`. Tints = solid lightened brand color, e.g. tempera 8% = `rgba(59,122,107,0.08)`, tempera 14% = `rgba(59,122,107,0.14)`.
- **Design ethos**: 静谧刊印 / quiet press — 单读 / 新世相-tier editorial restraint. One confident accent, generous whitespace, strong type hierarchy. NOT 微商/秀米 gaudy templates.

---

## TL;DR — The Core Gap

The current quote family (`quote-corner`, `quote-vbar`, `quote-mark`, `quote-card` in `svg-modules/quotes.ts`) renders the **quotation body inside SVG `<text>` lines** with a local `wrapCjkLines` hard-wrap at ~18 chars and a 4-line truncation to `…`. That looks fine for a 1–2 line pull-quote, but for real editorial use it has 4 costs: (1) the quote text is no longer selectable / searchable / SEO-visible in WeChat, (2) it cannot reflow with the reader's font-size setting, (3) it silently TRUNCATES anything over 4 lines, (4) there is **no callout/note box family and no inline key-sentence highlight at all** — the two devices premium accounts use most.

**The under-used lever (confirmed)**: WeChat's paste/publish sanitizer and InkForge's own `postProcessForWechat` KEEP inline `background-color` / `background` (solid) / `border` / `border-left` / `border-radius` / `padding` / `margin` / non-inset `box-shadow` / `color` / `font-*` / `text-align` / `line-height` / `letter-spacing` on `<section>` / `<p>` / `<blockquote>`. So a **plain HTML block container with inline styles** is the correct vehicle for quote cards, callout boxes, and highlighted sentences: live, selectable, reflowable text that survives paste — and is cheaper and more faithful than rendering prose into SVG `<text>`.

**Rule of thumb for this family**:
- **Block-CSS** (preferred, default) → tinted quote cards, left-accent rules, callout/note/warning boxes, inline key-sentence highlight, attribution lines. The body text stays live HTML and reflows. This is how doocs/md, mdnice, 135editor, 秀米 all actually ship to WeChat.
- **Inline SVG** (only the GLYPH) → the big decorative quotation mark `"` and the callout ICON (note/tip/warning marks). These are NON-EMOJI vector motifs and belong in SVG `<path>` (constraint 2). Compose: SVG glyph + HTML text in the SAME `<section>`, NOT prose-into-SVG.

### Ground-truth sources (production WeChat editors — they inline CSS, then paste survives)
| Source | What it proves |
|---|---|
| `doocs/md` `packages/shared/src/configs/theme-css/default.css` (fetched 2026-06-02) | `blockquote{ padding:1em; border-left:4px solid <accent>; border-radius:6px; background:<tint>; }` — the canonical WeChat quote card. Inline highlight `.markup-highlight{ background-color:<accent>; padding:2px 4px; border-radius:2px; color:#fff; }`. Inline code `.codespan{ background:<accent 8%>; border:1px solid <accent 20%>; border-radius:4px; padding:3px 5px; }`. |
| `doocs/md` `packages/core/src/extensions/alert.ts` (GFM alert) | Callout = `<blockquote>` + a title `<p>` holding an **inline-SVG octicon `<path>` (no emoji)** + title text, then body. Per-variant accent color. |
| `doocs/md` `theme-css/grace.css` | Same blockquote recipe + non-inset `box-shadow:0 4px 6px rgba(0,0,0,.05)` → confirms shadow survives on the container. |
| `mdnice/markdown-nice` `src/template/markdown/normal.js` | `.multiquote-1/2/3` tiered quotes documented via `border-left-color` + `background`; inline code via `padding`+`background`. Confirms the same kept-property set independently. |
| InkForge `services/export/wechat.ts` `postProcessForWechat` `unsupportedProps` (lines 928–963) | Authoritative strip list for THIS pipeline: strips flex/grid/gap/var/calc/animation/transition/filter/clip-path/mask/`box-shadow ... inset`/text-shadow/class. KEEPS background/border/border-left/border-radius/padding/margin/non-inset box-shadow/position:relative+top. |

### WeChat-safe CSS confirmed ALLOWED (inline, on section/p/blockquote)
`color · background-color · background (SOLID only) · padding · margin · border · border-left/right/top/bottom · border-radius · box-shadow (non-inset) · width · max-width · height · text-align · line-height · letter-spacing · font-size · font-weight · font-style · font-family · display:inline-block · vertical-align · white-space · position:relative · top/left`

### WeChat-safe CSS FORBIDDEN (stripped by post-processor / sanitizer)
`class · id · <style> · var(--…) · calc() · linear/radial-gradient · transform · transition · animation · @keyframes · filter · backdrop-filter · box-shadow ...inset · text-shadow(complex) · position:fixed/sticky · display:flex · flex-* · grid-* · gap · clip-path · mask`

### SVG-glyph FORBIDDEN (constraint 1, enforced by `wechat-safe.ts`)
`<defs> · <linearGradient> · <radialGradient> · clipPath · mask · filter · <use> · <symbol> · <pattern> · url(#…) · xlink:href · <image> · style="transform:…"`. Use SOLID fills + opacity layering; transforms ONLY via the XML `transform="…"` attribute.

> **Codebase integration note**: these are best emitted as plain `<section style>`/`<blockquote style>`/`<p style>` block containers, NOT through `svgSection`. They need a `data-ink-block="<id>"` (or reuse `data-ink-svg`) idempotency sentinel. The `<blockquote>` → module seam already exists: `inject.ts` `composeSvgDecorate` `plan.blockquote` replaces `<blockquote>…</blockquote>` (lines 119–127) and `extractText` strips inner tags — for these patterns we want to **preserve** the inner HTML (reflowable text), so either pass `innerHtml` through instead of `extractText`, or add a parallel `blockHtml`/`callout` plan key. Constraint (4): ADD these as new modules or ENHANCE the 4 existing quote modules — do not delete/rename. The CJK-spacing + 22em line-width logic downstream already handles normal prose, so keeping text as HTML is the *correct* path.

---

## Pattern Catalog

Each pattern is the recipe a top-tier 单读/新世相-tier account would actually ship. Markup uses our LOCKED brand colors and is paste-survivable. SVG-glyph parts are flagged and stay within the safe subset.

---

### Pattern 1 — Tinted Quote Card with Left Accent Border (左竖条 + 淡底引用卡)  ★ block-CSS · flagship default

**Looks like**: A soft tempera-tinted plate with a 4px solid tempera left border and gently rounded corners. The quotation text sits as normal serif prose inside, with comfortable padding. The single most recognizable "designed editorial" device — exactly the doocs/md default blockquote, tuned to quiet-press restraint.

**Why block-CSS not SVG**: keeps the quote as live, selectable, reflowing HTML text (no 4-line truncation), and the tint+border is a 3-property recipe. This is the HTML-text successor to the existing SVG `quote-vbar`.

**Recipe** (tempera; swap `#3B7A6B`→`#D95B3F` kiln or `#C19A56` amber per persona; tint = same hue at 6–8%):
```html
<blockquote data-ink-block="quote-tint" style="margin:24px 8px;padding:18px 22px;border-left:4px solid #3B7A6B;border-radius:6px;background-color:rgba(59,122,107,0.06);">
  <p style="margin:0;font-size:16px;line-height:1.9;letter-spacing:0.04em;color:#1a1a1a;">真正的写作，是把混沌的经验，淬炼成一句可以被另一个人记住的话。</p>
</blockquote>
```
**Restraint dials**: tint stays ≤8% (a wash, not a fill); border 4px (3px feels timid, 6px feels 微商); `border-radius:6px` max (8px starts to look app-card-y). One accent only.

**When to apply**: the default for any markdown `>` blockquote that is a genuine quotation or aside. The everyday workhorse.

---

### Pattern 2 — Big Quotation-Mark Motif Card (大引号装饰卡)  ★ block-CSS container + SVG glyph

**Looks like**: A tinted/paper-warm card with an oversized, low-opacity decorative `"` mark in the top-left (brand accent), the quote text flowing beside/under it, and a right-aligned attribution line below. The "literary pull-quote" look of 单读/新世相 feature pieces.

**Why hybrid**: the body + attribution are live HTML text in a block container; the big `"` is the ONE thing that must be a vector glyph (NOT an emoji `"` — constraint 2). Emit the mark as an inline SVG `<path>` with a SOLID accent fill at low opacity, sitting absolutely-free inside the card via normal flow (place it as the first child with negative-ish margin, since `position:absolute` is risky — prefer letting it sit on its own line).

**Recipe** (paper-warm card, tempera mark at ~14% opacity, attribution in muted ink):
```html
<section data-ink-block="quote-mark" style="margin:26px 8px;padding:20px 24px 16px;border-radius:8px;background-color:#f7f4ef;box-shadow:0 6px 18px rgba(26,26,26,0.05);">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90" width="48" height="36" style="display:block;">
    <path d="M50,80 C50,45 70,24 104,24 L104,46 C86,46 76,56 76,72 L104,72 L104,84 L50,84 Z M0,80 C0,45 20,24 54,24 L54,46 C36,46 26,56 26,72 L54,72 L54,84 L0,84 Z" fill="#3B7A6B" opacity="0.16"/>
  </svg>
  <p style="margin:6px 0 0;font-size:17px;line-height:1.9;letter-spacing:0.04em;color:#1a1a1a;">我们读书，不是为了逃避世界，而是为了更深地走进它。</p>
  <p style="margin:14px 0 0;text-align:right;font-size:13px;color:rgba(26,26,26,0.55);">— 《单读》编辑部</p>
</section>
```
**Notes**: the `"` path is solid-fill + `opacity` (NO gradient, NO filter). Keep the mark small-to-medium (36–56px tall) and low opacity so it reads as a watermark, not a sticker. The em-dash `—` (U+2014) before the attribution is typography, not an icon.

**When to apply**: feature pull-quotes, epigraphs, the one "hero quote" per article. Use sparingly (≤1–2 per piece) so it stays special.

---

### Pattern 3 — Attribution / Source Line (署名 · 出处行)  ★ block-CSS · composable sub-recipe

**Looks like**: A small, muted, right- or left-aligned line under a quote giving the speaker/work, optionally with a tiny accent rule before it. Quiet, secondary, never competes with the quote.

**Recipe** (right-aligned, em-dash; optional accent micro-rule via a left border on an inline-block):
```html
<p style="margin:12px 0 0;text-align:right;font-size:13px;letter-spacing:0.06em;color:rgba(26,26,26,0.55);">— 加缪《西西弗神话》</p>
```
Variant with a short accent tick (inline-block, no flex):
```html
<p style="margin:12px 0 0;font-size:13px;color:rgba(26,26,26,0.55);"><span style="display:inline-block;width:18px;border-top:2px solid #3B7A6B;vertical-align:middle;margin-right:8px;"></span>本刊主笔 · 林深</p>
```

**When to apply**: append to Pattern 1/2 whenever the quote has a real source. Omit for anonymous asides.

---

### Pattern 4 — Callout / Note Box with Icon (提示框 · note/tip/warning)  ★ block-CSS container + SVG icon

**Looks like**: A tinted box (left accent border, like Pattern 1) whose FIRST line is a small inline-SVG icon + a colored label ("提示" / "注意" / "要点"), then the body prose. This is the GFM-alert pattern that doocs/md ships — proven WeChat-safe. The icon makes intent scannable; the tint+border makes it a contained aside.

**Why hybrid + brand mapping**: body/label are live HTML; the icon is a non-emoji vector `<path>` (constraint 2). Map the three semantic variants onto our LOCKED palette instead of GitHub's blue/green/red:
- **note / 提示** → tempera `#3B7A6B` (info, the default)
- **tip / 要点** → amber `#C19A56` (highlight an actionable takeaway)
- **warning / 注意** → kiln `#D95B3F` (caution — counts toward the ember/kiln ≤2-per-screen rule)

**Recipe** (note, tempera; the icon row uses `inline-block`/`vertical-align`, NOT flex):
```html
<section data-ink-block="callout-note" style="margin:24px 8px;padding:14px 18px;border-left:4px solid #3B7A6B;border-radius:6px;background-color:rgba(59,122,107,0.07);">
  <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#3B7A6B;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="15" height="15" style="display:inline-block;vertical-align:-2px;margin-right:6px;"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM7.25 7a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V7.75H8a.75.75 0 0 1-.75-.75ZM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" fill="#3B7A6B"/></svg>提示
  </p>
  <p style="margin:0;font-size:15px;line-height:1.85;color:#1a1a1a;">导出前先在真机预览里确认 20–22 字/行的版心没有被破坏。</p>
</section>
```
**Warning variant** (kiln `#D95B3F`, triangle-bang icon — counts as 1 ember use):
```html
<section data-ink-block="callout-warn" style="margin:24px 8px;padding:14px 18px;border-left:4px solid #D95B3F;border-radius:6px;background-color:rgba(217,91,63,0.07);">
  <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#D95B3F;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="15" height="15" style="display:inline-block;vertical-align:-2px;margin-right:6px;"><path d="M8 1.2 0.6 14a1 1 0 0 0 .87 1.5h13.06A1 1 0 0 0 15.4 14L8 1.2Zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.2Zm0 7.1a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" fill="#D95B3F"/></svg>注意
  </p>
  <p style="margin:0;font-size:15px;line-height:1.85;color:#1a1a1a;">微信会剥离 class / id / &lt;style&gt;，所有样式必须内联。</p>
</section>
```
**Tip variant** uses amber `#C19A56` + a lightbulb `<path>`. Icon `fill` matches the border/label color exactly.

**When to apply**: editor's notes, key takeaways, cautions, definitions. The most useful NEW family — there is currently no callout module at all. Keep variants to 3 (note/tip/warning); more colors = 微商 dashboard.

---

### Pattern 5 — Inline Key-Sentence Highlight (要点句内联高亮)  ★ block-CSS · inline

**Looks like**: A short, important clause inside a normal paragraph wearing a soft accent-tint background "marker" (like a highlighter swipe) OR a solid accent fill with white text for a true key sentence. Survives WeChat because it is just inline `background-color`+`padding`+`border-radius` on a `<span>` (no class). The doocs/md `.markup-highlight` recipe.

**Why block-CSS**: a `<span style>` is the lightest possible device; the text stays live and reflows; no SVG needed.

**Recipe A — soft marker (default, restrained; tint background, ink text)**:
```html
<p style="margin:1.5em 8px;font-size:16px;line-height:1.9;color:#1a1a1a;">写作的全部秘密，在于<span style="background-color:rgba(193,154,86,0.28);padding:1px 4px;border-radius:2px;">把抽象的感受变成具体的细节</span>，其余都是技巧。</p>
```
**Recipe B — solid key sentence (stronger; accent fill, auto-contrast text)**:
```html
<span style="background-color:#3B7A6B;color:#ffffff;padding:2px 6px;border-radius:3px;font-weight:600;">真正重要的只有一句话。</span>
```
**Recipe C — underline-only (most restrained; accent text-decoration, no fill)**:
```html
<span style="border-bottom:2px solid rgba(59,122,107,0.55);padding-bottom:1px;">值得记住的判断</span>
```
**Restraint dials**: soft-marker tint 24–30% of an accent (high enough to read as a marker, low enough to keep text legible — amber/tempera work, kiln is loud so reserve it). Use a highlight at most once or twice per screen; highlighting everything = highlighting nothing. NEVER use `text-shadow` or gradient (stripped).

**When to apply**: A (marker) for the takeaway clause in a paragraph; B (solid) for a one-line thesis statement that deserves a beat; C (underline) when even a tint feels too much. This is a NEW capability — there is no inline-highlight module today.

---

### Pattern 6 — Centered Epigraph / Lead-in (居中题记 · 导语)  ★ block-CSS · no border

**Looks like**: A short centered quotation set off by generous top/bottom whitespace and thin accent rules above and below (or just italic muted prose), no box. The "导语/题记" device that opens 新世相-style essays — air, not chrome.

**Recipe** (centered, italic-ish via font-style, hairline rules via `border-top`/`border-bottom` on the `<p>`):
```html
<section data-ink-block="epigraph" style="margin:30px 24px;text-align:center;">
  <span style="display:inline-block;width:32px;border-top:2px solid #3B7A6B;margin-bottom:14px;"></span>
  <p style="margin:0;font-size:16px;font-style:italic;line-height:2;letter-spacing:0.06em;color:rgba(26,26,26,0.7);">所有的故事都是关于离开，<br/>以及离开之后如何重新找到自己。</p>
  <span style="display:inline-block;width:32px;border-top:2px solid #3B7A6B;margin-top:14px;"></span>
</section>
```
**When to apply**: article lead-in / epigraph, or a between-section "breath." Uses whitespace as the design — the most quiet-press of all. The accent ticks are optional; pure italic-muted-centered also reads premium.

---

### Pattern 7 — Footer Signature / Editor's Card (文末署名卡)  ★ block-CSS container + SVG mark

**Looks like**: A small paper-warm or hairline-bordered card at the end of the piece holding a tiny brand mark (the ◇◇◇ diamond signature already in `primitives.ts`), an author line, and a muted one-liner (column name / issue). The "刊印落款" that signs off an issue.

**Why hybrid**: text is live HTML; the ◇◇◇ mark is the existing `diamondSig` SVG primitive (solid fill, no gradient) — already brand-safe.

**Recipe** (hairline-bordered card, tempera diamonds, two text lines):
```html
<section data-ink-block="sign-card" style="margin:34px 8px 8px;padding:18px 22px;border:1px solid rgba(26,26,26,0.12);border-radius:8px;background-color:#f7f4ef;text-align:center;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 16" width="56" height="11" style="display:block;margin:0 auto 10px;">
    <path d="M16,8 L24,2 L32,8 L24,14 Z" fill="#3B7A6B"/><path d="M32,8 L40,2 L48,8 L40,14 Z" fill="#3B7A6B"/><path d="M48,8 L56,2 L64,8 L56,14 Z" fill="#3B7A6B"/>
  </svg>
  <p style="margin:0;font-size:14px;font-weight:600;color:#1a1a1a;">墨铸编辑部</p>
  <p style="margin:6px 0 0;font-size:12px;letter-spacing:0.1em;color:rgba(26,26,26,0.55);">成为作者吧 · 第 012 期</p>
</section>
```
**When to apply**: end-of-article sign-off. Complements the existing endmark family; this is the textual "落款" sibling. Tagline 「成为作者吧」 and 「墨铸」 per brand-canonical naming.

---

## Cross-cutting design rules (apply to all 7)

1. **Tints are SOLID lightened brand colors via rgba alpha, never gradients.** tempera 6–8% wash for cards, 24–30% for inline marker, 100% for solid key-sentence. (Constraint 3.)
2. **One accent per block.** Mixing tempera + kiln + amber in one card reads 微商. Pick the persona accent; kiln/ember counts toward ≤2-per-screen.
3. **Icons & marks are inline-SVG `<path>` with solid fill, NEVER emoji.** (Constraint 2.) Icon `fill` = the block's accent. Octicon-style 16-viewBox paths are compact and proven.
4. **Body text stays live HTML, reflows, never truncates.** This is the whole reason to prefer block-CSS over the SVG-`<text>` quote modules for prose. Reserve SVG `<text>` for the poster/raster (xhs) path only.
5. **Spacing is the luxury.** `margin:24–34px` between blocks, `padding:14–22px` inside, `line-height:1.85–2`, `letter-spacing:0.04–0.06em`. Generous whitespace > decoration.
6. **Geometry restraint**: `border-radius` ≤ 8px; `border-left` 4px (cards) / accent border 1px (signature); `box-shadow` only soft + non-inset (`0 6px 18px rgba(26,26,26,0.05)`) — inset shadows are stripped.

---

## Caveats / Not Found

- **`inject.ts` currently flattens blockquote inner HTML** via `extractText` before passing to a module (loses reflowable text + nested formatting). To ship Patterns 1/2/4 with live text, the inject seam needs a path that forwards `innerHtml` instead of plain text, or a new `callout`/`blockHtml` plan key. This is an integration design decision, not a blocker — flagged for the implement phase.
- **`box-shadow` survival is asymmetric**: soft drop shadows survive (grace.css ships them; `WECHAT_SUPPORT.boxShadow=true`), but `postProcessForWechat` explicitly strips any `box-shadow` containing `inset`. Keep shadows drop-only.
- **`onAccent` contrast**: amber `#C19A56` has high luminance → solid amber key-sentence (Pattern 5B) needs INK text, not white. The existing `relativeLuminance`/`onAccent` in `theme.ts` already computes this; reuse it.
- **WeChat real-machine verification still required**: all recipes are triangulated from doocs/md + mdnice production source and InkForge's own `postProcessForWechat` strip list, but the PRD's AC requires a real-machine paste screenshot. Patterns 1, 3, 5A, 6 are lowest-risk (pure kept-properties); Patterns 2, 4, 7 add an inline SVG glyph that must additionally pass `assertWechatSafe` (no defs/gradient/url(#)). I did not find a primary WeChat doc enumerating the sanitizer; the evidence is the consistent behavior of the three production sources, which is strong but should be screenshot-confirmed.
- **No `position:absolute` in samples**: I avoided absolute positioning for the big-quote glyph (Pattern 2) because its survival is less certain than normal flow; the mark sits as a flow child instead. If a future test proves `position:relative`+`top` reliably anchors a watermark mark, Pattern 2 could overlap mark + text more tightly.
