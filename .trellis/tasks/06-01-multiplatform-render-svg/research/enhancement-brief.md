# Enhancement Brief: Flagship WeChat Typesetting — From "Plain Markdown" to "Quiet Press"

- **Task**: `.trellis/tasks/06-01-multiplatform-render-svg`
- **Date**: 2026-06-02
- **Scope**: actionable design + implementation brief, synthesized from all 6 audit files + 4 pattern files in this `research/` dir
- **Status**: design contract for the implement phase (no code written here)

---

## 1. Executive Diagnosis (3 sentences + the lever)

The flagship output reads as "plain markdown" because **100% of the design lives trapped inside transparent `<svg viewBox>` canvases drawn with 1px hairlines (`rgba(26,26,26,0.12)`), 6–8px accent sticks, and 8–12% `accentSoft` washes** — all of which collapse to sub-pixel, near-invisible marks on a 375px phone — while the article's actual **body copy (90% of what a reader sees: `<p>`, `<ul>`, key sentences, the lead paragraph) is decorated by nothing and passes through byte-for-byte identical to a GitHub-markdown→WeChat dump**. The system never touches the one thing premium accounts (单读/新世相-tier) rely on and that WeChat provably KEEPS: **inline-styled SOLID-color block containers (`background-color` / `border-left` / `border-radius` / `padding`) on live, reflowing `<section>`/`<p>`/`<blockquote>` text** — proven in our own codebase (`preset-decorations.ts:343` "background-color + padding + border-radius all survive juice + WeChat"; `themes.ts:420/448` already ship blockquote tint+border-left; `quote-card` already ships `box-shadow`+`border-radius` on its `<section>`; `i-scrollcards` ships `overflow-x`/`scroll-snap`/`inline-block`/`width%`).

**THE SINGLE BIGGEST LEVER:** add a parallel **HTML-block-container layer** — tinted section-header bars, tinted quote cards, callout/note boxes, key-sentence highlights, a lead-in 导语 card, styled list rows, and a footer signature card — emitted as `<section style="…">live HTML…</section>` (NOT `svgSection()`), and wire them into the body via a **new decorator chained after `composeSvgDecorate`** (so the existing 5-slot flagship plans stay intact). Reserve SVG strictly for *geometric marks and icon glyphs* (the cover signature, the vessel/diamond brand mark, callout icons), and stop relying on sub-pixel decoration: floor structural rules at ≥2px, accent marks ≥4px, focal dots ≥6px, and replace 8–12% washes with deliberate solid tints (`rgba(accent, 0.06–0.10)` card fills, `rgba(accent, 0.16)` band strips).

---

## 2. Per-Structural-Node: CURRENT vs PROPOSED

Conventions used in every sketch below:
- `accent` = preset primaryColor (kiln `#D95B3F` / tempera `#3B7A6B` / amber `#C19A56`); `tint` = solid `rgba()` lightened accent; `onAccent` = white for kiln/tempera, **ink `#1a1a1a` for amber** (reuse `theme.ts relativeLuminance` — NEVER hardcode `#fff`).
- Block containers use `<section>`/`<p>`/`<span>` only (never `<div>`), inline styles only, no `class`/`id`/`<style>`/gradient/`transform:`/flex/grid/`var()`/`calc()`. `box-shadow` drop-only (no `inset`). Empty rule elements need `font-size:0;line-height:0;` + `&nbsp;` so WeChat doesn't collapse them.
- Every new HTML-block module carries a `data-ink-block="<id>"` idempotency sentinel (mirrors `data-ink-svg`).
- Samples are written in tempera; swap the hue per preset. Pixel values are quiet-press defaults — confirm against a real-machine 375px screenshot per DoD.

---

### 2.1 TITLE / Opening (cover)

- **CURRENT** — `cover-title` (tempera/amber): warm-paper `<rect>` + a lonely 200×2 accent tick + 96px black title + a 14px diamond "the size of a fly" (<0.1% accent coverage). `cover-grid` (kiln): pure-white page + a 12%-ink graph grid that vanishes on phones + one 8px dot. Both read as "default Word title page."
- **PROPOSED** — Keep the SVG covers (they are the emotional hero) but make the accent *confident*: a full-height solid accent **spine** (`<rect x="0" y="0" width="16" height="620" fill="<accent>"/>`), a **kicker chip** above the title (`<rect rx="6" fill="<accent>"/>` + `onAccent` text — amber→ink), a large low-opacity **ghost numeral** in the right margin (`fill="rgba(accent,0.14)" font-size="220"`), and replace the fly-diamond with the scaled vessel/diamond brand mark. For `cover-grid`, fill ONE grid cell solid accent (Constructivist module block) + lay a `rgba(accent,0.10)` tint row behind the title + switch canvas to `paperWarm`. Add `hiddenFulltext()` so the title is real selectable text. **Edit:** `svg-modules/covers.ts` (`renderCoverTitle`, `renderCoverGrid`); use new `tintPanel()`/`solidChip()` primitives.

### 2.2 Reading-meta row (NEW — author · 字数 · 时长 · 日期)

- **CURRENT** — does not exist. There is no concept of article metadata between cover and body.
- **PROPOSED** — a quiet single muted-ink row directly under the title, items separated by faint middots; optional 6×6 amber dot as a no-emoji icon substitute:
  ```html
  <p data-ink-block="title-meta" style="margin:0 0 24px;font-size:13px;color:rgba(26,26,26,0.55);letter-spacing:1px;line-height:1.6;">
    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:#C19A56;margin-right:8px;vertical-align:middle;"></span>墨问
    <span style="color:rgba(26,26,26,0.25);"> · </span>2&nbsp;800&nbsp;字
    <span style="color:rgba(26,26,26,0.25);"> · </span>约&nbsp;7&nbsp;分钟
    <span style="color:rgba(26,26,26,0.25);"> · </span>2026.06.02</p>
  ```
  Amber dot preserves the ember budget. **Add:** new `text-cards.ts` module `title-meta` (family `header` or new `footer`/`meta`); inject after cover (new plan slot `meta?` or fold into cover output).

### 2.3 H2 header (section header bar)

- **CURRENT** — kiln uses `header-ribbon` (a flat square solid bar — strongest module today, but utilitarian). tempera uses `header-bracket` (four 4px corner ticks around empty white ≈ "faint pencil frame"). **amber uses `header-vrule` for BOTH H2 and H3 → zero hierarchy.** All render title as non-reflowing SVG `<text>`.
- **PROPOSED** — replace the H2 anchor with a **block-CSS tinted header bar with a 4px left rule** (the 新世相 workhorse), keeping the title as live CJK text:
  ```html
  <section data-ink-block="hdr-h2" style="background-color:rgba(59,122,107,0.08);border-left:4px solid #3B7A6B;border-radius:0 6px 6px 0;padding:12px 18px;margin:32px 0 16px;">
    <h2 style="margin:0;font-size:19px;font-weight:700;line-height:1.4;color:#1a1a1a;letter-spacing:1px;">本节标题</h2>
  </section>
  ```
  Creative/kiln keeps the louder **solid filled bar** (`background-color:#D95B3F;color:#fff;`); amber gets this tinted bar so its H2 finally differs from H3. **Add:** `text-cards.ts` `hdr-h2` variants; route via the new chained decorator's `headings` (a block-emitting renderer through the existing `inject.ts` headings seam, which already replaces `<hN>`). For implementers preferring SVG continuity: alternatively ENHANCE `header-ribbon`/`header-bracket` (add `rx`, kicker, tint backing) — but the block-CSS version is preferred for live reflowing text.

### 2.4 H3 header

- **CURRENT** — all three flagships collapse H3 onto `header-vrule`: a 6px accent stick + black title = "literally the default CSS border-left heading the user complained about," and it is the highest-traffic module in the system.
- **PROPOSED** — the quieter sibling of H2 so hierarchy reads: a **bare left rule (no fill)** or a **prefix-mark + title**. Keep H2=tinted bar, H3=bare rule:
  ```html
  <p data-ink-block="hdr-h3" style="border-left:3px solid #3B7A6B;padding-left:14px;margin:26px 0 12px;font-size:17px;font-weight:600;color:#1a1a1a;letter-spacing:.5px;line-height:1.5;">小标题文字</p>
  ```
  Prefix-mark alternative (runs of H3): `<span style="color:#3B7A6B;margin-right:8px;">■</span>` (Unicode geometric glyph = text, allowed; NOT emoji). **Add:** `text-cards.ts` `hdr-h3`; same headings seam. If staying in SVG, ENHANCE `header-vrule` with a `variant:'h2'` (tint card + 10px bar) vs `variant:'h3'` (bare bar) using the already-present `SvgModuleParams.variant` field.

### 2.5 Body emphasis & key-sentence (NEW)

- **CURRENT** — does not exist. `composeSvgDecorate` never touches `<p>` or emphasized runs; `<strong>` is plain bold. This is the largest invisible gap (body = 90% of the page).
- **PROPOSED** — three escalating devices, used sparingly (≤1–2 highlights per screen):
  - (a) **bare key paragraph** — whole para in accent + bold, no box (the punchline device): `<p style="font-size:16px;font-weight:700;line-height:1.9;color:#D95B3F;word-break:break-all;">…</p>` (kiln use counts toward ≤2 ember/screen).
  - (b) **inline marker highlight** — `<span style="background-color:rgba(193,154,86,0.28);padding:1px 4px;border-radius:2px;">关键短语</span>` (amber/tempera marker; kiln too loud).
  - (c) **centered tint callout** for the single thesis line — `<section style="background-color:rgba(217,91,63,0.08);border-radius:8px;padding:18px 22px;"><p style="margin:0;color:#D95B3F;font-weight:600;text-align:center;line-height:1.9;">全文最重的一句</p></section>` (≤1 per article).
  - **Underline-only** for max restraint: `border-bottom:2px solid rgba(59,122,107,0.55)`.
  **Add:** decorator field `keySentence?` matching `==text==`/`<mark>`/`> [!KEY]`; emits inline `<span>`/`<p>`/`<section>`. **Edit:** new chained decorator + `inject.ts` plan extension.

### 2.6 Bullet list (unordered)

- **CURRENT** — does not exist; `<ul><li>` passes through to WeChat's inconsistent native bullets (uncolorable). Pure markdown look.
- **PROPOSED** — transform each `<li>` into a marker-row `<p>` with a solid accent square (Constructivist, not a round dot) or a tiny inline-SVG diamond glyph:
  ```html
  <p data-ink-block="li-ul" style="margin:8px 0;line-height:1.8;color:#1a1a1a;">
    <span style="display:inline-block;width:8px;height:8px;border-radius:1px;background-color:#3B7A6B;margin-right:12px;vertical-align:1px;"></span>列表项内容……</p>
  ```
  Index/menu variant: rule-separated rows (`border-top:1px solid rgba(26,26,26,0.12)` between items) with an amber `—` tick. **Add:** decorator field `listStyling?` (transform `<ul><li>`→marker rows). **Edit:** new chained decorator; the marker square is a `<span>`, a true icon is inline `<svg><path fill="<accent>">` (reuse `diamond()` from `primitives.ts`).

### 2.7 Ordered list

- **CURRENT** — does not exist; native `<ol>` markers, uncolorable.
- **PROPOSED** — numbered chip per item (the listicle backbone; reuses `badge-num`'s `onAccent` logic as live text):
  ```html
  <p data-ink-block="li-ol" style="margin:10px 0;line-height:1.8;color:#1a1a1a;">
    <span style="display:inline-block;min-width:22px;height:22px;line-height:22px;text-align:center;background-color:#3B7A6B;color:#ffffff;font-size:13px;font-weight:600;border-radius:4px;margin-right:12px;vertical-align:2px;">1</span>有序列表项……</p>
  ```
  `min-width`+padding auto-widens for ≥10 items; amber uses `color:#1a1a1a` chip text. **Add:** `listStyling?.ordered`; same decorator/seam as 2.6.

### 2.8 Blockquote

- **CURRENT** — kiln `quote-mark` (big quote glyph at `accentSoft` 12% = a ghost smudge), tempera `quote-corner` (two 6px corner ticks floating in a void), amber `quote-vbar` (8px accent stick = "textbook GitHub blockquote"). All render prose as non-reflowing SVG `<text>` that TRUNCATES past 4 lines and is non-selectable.
- **PROPOSED** — the canonical **tinted quote card with solid left accent border**, prose as live reflowing HTML (the doocs/md default, tuned to restraint):
  ```html
  <blockquote data-ink-block="quote-tint" style="margin:24px 8px;padding:18px 22px;border-left:4px solid #3B7A6B;border-radius:6px;background-color:rgba(59,122,107,0.06);">
    <p style="margin:0;font-size:16px;line-height:1.9;letter-spacing:0.04em;color:#1a1a1a;">真正的写作，是把混沌的经验淬炼成一句可以被记住的话。</p>
    <p style="margin:12px 0 0;text-align:right;font-size:13px;color:rgba(26,26,26,0.55);">— 《单读》</p>
  </blockquote>
  ```
  Hero/feature variant: paper-warm card + an oversized low-opacity SVG `"` glyph (`fill="<accent>" opacity="0.16"`, 36–56px) as first child + soft drop shadow. Restraint dials: tint ≤8%, border 4px, radius ≤6–8px. **Edit:** the `blockquote` seam in `inject.ts` currently flattens inner HTML via `extractText` — add a path that **forwards `innerHtml`** (preserve reflowing text) or add a parallel `calloutBlock?`/`blockHtml` plan key. ENHANCE `quote-vbar`/`quote-corner`/`quote-mark` to set `sectionStyle` tint, OR add new block module `quote-tint`.

### 2.9 Callout / Note box (NEW)

- **CURRENT** — does not exist. There is no module whose job is a filled content box; the registry is skewed entirely toward separators.
- **PROPOSED** — the GFM-alert pattern (proven WeChat-safe in doocs/md): tinted box + left accent border + a first line carrying a **non-emoji inline-SVG icon `<path>`** + colored label, then live body prose. Map 3 variants onto LOCKED palette:
  - **note / 提示** → tempera `#3B7A6B` (default, info circle icon)
  - **tip / 要点** → amber `#C19A56` (lightbulb icon)
  - **warning / 注意** → kiln `#D95B3F` (alert-triangle icon; counts as 1 ember/screen)
  ```html
  <section data-ink-block="callout-note" style="margin:24px 8px;padding:14px 18px;border-left:4px solid #3B7A6B;border-radius:6px;background-color:rgba(59,122,107,0.07);">
    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#3B7A6B;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="15" height="15" style="display:inline-block;vertical-align:-2px;margin-right:6px;"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 11.5a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 1.5 0ZM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" fill="#3B7A6B"/></svg>提示</p>
    <p style="margin:0;font-size:15px;line-height:1.85;color:#1a1a1a;">导出前在真机预览确认 20–22 字/行的版心未被破坏。</p>
  </section>
  ```
  Icon `fill` always equals the label/border color. **Add:** new `callout` family in `text-cards.ts`; decorator field `callout?` matching `> [!NOTE|TIP|WARNING]` blockquotes; register icons as inline-SVG paths. **Edit:** `inject.ts` plan + new decorator; `types.ts` add `'callout'` to `SvgModuleFamily`.

### 2.10 Code block

- **CURRENT** — presets already style `code`/`pre` via CSS (kept by WeChat). `code` is in `OPAQUE_TAGS` so the CJK spacer leaves it alone. Not the core gap, but visually flat.
- **PROPOSED** — leave the existing `pre`/`code` CSS recipe; OPTIONALLY add a tinted code surface consistent with the tint system: `background-color:rgba(accent,0.06)` + `border-radius:6px` + `border-left:3px solid <accent>` on the `<pre>`, monospace preserved. Inline code: `background:rgba(accent,0.08);border:1px solid rgba(accent,0.20);border-radius:4px;padding:3px 5px;` (the doocs/md `.codespan` recipe). **Edit:** preset `customCSS`/`exportCSS` in `themes.ts` (CSS, not SVG) — low priority; do not over-decorate.

### 2.11 Divider

- **CURRENT** — kiln `divider-forge` (the "ember at the forge" reduced to a 3px ember dot in a near-invisible 12% halo), tempera `divider-diamond` (three 5px specks between 1px ghost lines), amber `divider-grid` (a 1px ruler that's sub-pixel). `divider-dots`/`divider-fade` ship dead. All concept-strong, execution-sub-pixel.
- **PROPOSED** — (a) thicken: structural rules ≥2px, accent ticks ≥4px, focal dots ≥6px; build `divider-forge` into a real 3-ring ember stack (`r=6` solid ember + `r=12` ember-stroke ring + `r=22` `rgba(ember,0.10)` halo, still ≤1 ember); enlarge `divider-diamond` center to `r=9` with `r=5` flankers (size hierarchy). (b) ADD lightweight block-CSS dividers for sub-section breaks: short left-aligned bar `<section style="margin:36px 0;height:2px;width:64px;background-color:#3B7A6B;border-radius:1px;"></section>`; or a labeled break (`——— 下篇 ———` via inline-block rules + a letter-spaced CJK label). **Edit:** `svg-modules/dividers.ts` (enhance forge/diamond/grid; reclaim dead `divider-dots`/`divider-fade`); ADD block dividers in `text-cards.ts`.

### 2.12 Footer / Signature card (NEW)

- **CURRENT** — kiln `endmark-vessel` (a beautiful brand mark drawn in 0.8–1.8px strokes = "faint gray scratches" on phones), tempera `endmark-fin` (◇◇◇ + gray "全文完"), amber `endmark-rule` (a single ~0.35px hairline + gray text = the single thinnest element in the system). No card, no brand metadata, no warmth.
- **PROPOSED** — a restrained closing **signature card**: warm-paper/tinted block, thin top accent rule, brand line, tagline, and a print-style (non-clickable) outlined pill. Keep the SVG vessel mark *above or inside* the card (thicken its strokes to ≥2.5px and give the ding a solid `accentTint` silhouette layer so it survives downscaling):
  ```html
  <section data-ink-block="footer-card" style="margin:40px 0 8px;padding:32px 28px;background-color:rgba(59,122,107,0.06);border-top:2px solid #3B7A6B;border-radius:2px;text-align:center;">
    <p style="margin:0;font-size:17px;font-weight:600;color:#1a1a1a;letter-spacing:1px;">墨铸 · InkForge</p>
    <p style="margin:8px 0 0;font-size:14px;color:rgba(26,26,26,0.55);letter-spacing:0.5px;line-height:1.7;">成为作者吧 · 静谧刊印</p>
    <p style="margin:18px auto 0;display:inline-block;padding:6px 18px;font-size:13px;color:#3B7A6B;border:1px solid rgba(59,122,107,0.4);border-radius:999px;letter-spacing:2px;">关注 · 墨铸</p>
  </section>
  ```
  Brand text 「墨铸」/「成为作者吧」 per canonical naming, fed from preset/options (never hard-coded). **Add:** new `footer` family in `text-cards.ts`; decorator field `footer?` (append, sentinel-guarded like `endmark`). Thicken `endmark-vessel` strokes. **Edit:** `text-cards.ts` (new), `svg-modules/endmarks.ts` (thicken vessel), `inject.ts` plan.

### 2.13 Endmark

- **CURRENT** — see 2.12 (endmark-fin/vessel/rule); tiny centered marks floating on transparent canvas with no anchor.
- **PROPOSED** — keep the SVG endmark as the *glyph* (◇◇◇ / vessel), but seat it on the footer signature card (2.12) so it's a stamped colophon, not a mark in a void. Enlarge `endmark-fin` center diamond, accent the "全文完" word (use `ink` not `inkSoft` for presence), and for `endmark-rule` swap the hairline for a 3px accent rule + a small `onAccent`-on-accent "完" chip. **Edit:** `svg-modules/endmarks.ts`; compose with `footer-card`.

---

## 3. Prioritized Implementation Plan (grouped by file, P0 first)

The delivery vehicle that respects "do not touch the 5-slot flagship plans": **build a new block-container layer and a new decorator, then chain it after each flagship's `composeSvgDecorate` via `chainSvgDecorators`.** Existing modules are ENHANCED in place; nothing is renamed or deleted.

### PASS P0 — The lever: palette + new block-container layer (highest impact, unblocks everything)

1. **`svg-modules/theme.ts` + `types.ts`** — widen `SvgPalette` (additive, optional `?` fields to keep snapshots stable): add `accentTint` (`rgba(accent,0.08)` business/academic, `0.12` creative), `accentBand` (`rgba(accent,0.16)`), `accentLine` (`rgba(accent,0.85)`), `accentDeep` (solid darkened hex for text-on-tint), `cardBg` (warm solid tint); raise `hairline` to ~0.16 or add `hairlineStrong`. Add `'callout'|'footer'|'meta'|'list'` to `SvgModuleFamily`.
2. **`svg-modules/primitives.ts`** — ADD sibling helpers (no SVG): `blockSection({style, inner})` → `<section data-ink-block style="…">inner</section>`; `tintCardStyle(palette,{strength})`; `solidChip()`; `kicker()`. Extend `svgSection` with an optional `card?:{bg,border,radius,pad}` so SVG modules can also gain a tinted wrapper. Add `tintPanel()` and `solidBand()` SVG atoms.
3. **`svg-modules/text-cards.ts` (NEW FILE)** — the new families as inline-styled HTML modules: `quote-tint`, `callout-note`/`callout-tip`/`callout-warn` (with inline-SVG `<path>` icons), `key-line` + inline `key-span`, `lead-card` (导语), `hdr-h2`/`hdr-h3` block headers, `li-ul`/`li-ol` list rows, `footer-card`, `title-meta`, `title-kicker`, block dividers (`rule-thin`/`labeled`/`dot`). Register in `index.ts` `SVG_MODULES` spread.
4. **`svg-modules/wechat-safe.ts`** — add a parallel **HTML-block safety check** (assert only `<section>/<p>/<span>/<h1-6>/<blockquote>`; no `class=`/`id=`/`<style>`/`transform:`/`transition:`/`animation:`/`var(`/`calc(`/gradient/flex/grid in inline style; `box-shadow` non-inset only). Move `assertWechatSafe` into `svgSection`/`blockSection` so every module is runtime-checked (currently only badges/interactive are). Fix the "17 vs 18 rules" comment.
5. **`platform-rules/wechat.ts`** — add `'section'` to `DARKMODE_TARGETS` (scoped to sections carrying `background-color`) so tinted cards survive WeChat dark mode; keep `'svg'` opaque. Expose `cardSafeStyle(palette)` returning the canonical card style string.

### PASS P1 — Decorate the body (the 90% the reader sees)

6. **`svg-modules/inject.ts`** — extend `SvgInjectionPlan` with `lead?`, `callout?`, `keySentence?`, `listStyling?:{ordered,unordered}`, `footer?`, and a block-header path; add a **`composeBlockDecorate(plan, opts)`** (or extend the existing) that: forwards blockquote `innerHtml` (don't flatten via `extractText`) for tinted quote cards; transforms `<ul>/<ol><li>` into marker rows; wraps `> [!NOTE]` blockquotes into callouts; highlights `==text==`/`<mark>`; wraps the first post-cover `<p>` as a 导语 lead card; appends the footer card. All sentinel-guarded for idempotency.
7. **`themes.ts`** — chain the new block decorator after each flagship's existing `composeSvgDecorate` using `chainSvgDecorators` (the 5-slot SVG plans stay byte-identical). Wire per-preset block plan options (see §4). Optionally add the tinted code-block CSS to `customCSS`/`exportCSS`.

### PASS P2 — Strengthen the existing SVG modules (stop sub-pixel decoration)

8. **`svg-modules/headers.ts`** — `header-vrule` (highest traffic): tint-card backing + `variant` h2/h3 split (fixes amber). `header-ribbon`: `rx`, left tab cap, optional kicker. `header-bracket`: faint tint fill inside frame + thicken to 6px. Wire `header-badge-num` as amber's H2.
9. **`svg-modules/quotes.ts`** — set `sectionStyle` tint on `quote-vbar`/`quote-corner`; raise `quote-mark` glyph to full accent @ opacity 0.18–0.22; promote/wire `quote-card`.
10. **`svg-modules/dividers.ts`** — thicken forge/diamond/grid per §2.11; reclaim dead `divider-dots`/`divider-fade`.
11. **`svg-modules/endmarks.ts`** — thicken `endmark-vessel` strokes (≥2.5px) + solid silhouette layer; compose all three with `footer-card`; accent the "全文完" word; `endmark-rule` → 3px accent rule + chip.
12. **`svg-modules/covers.ts`** — accent spine + kicker chip + ghost numeral + brand mark per §2.1; `cover-grid` solid module cell + tint title row + warm canvas; add `hiddenFulltext`.

### PASS P3 — Verify

13. Real-machine WeChat paste screenshots (per DoD evidence dir) for: tinted quote card, callout box, key-sentence, footer card, header bars, list rows, dark-mode. Confirm `border-radius:999px` pill survives (fallback `16px`); confirm `box-shadow` (non-inset) and `display:inline-block` spans survive. Re-run `svg-modules/__tests__` after palette widening (optional fields prevent snapshot churn).

---

## 4. Per-Preset Differentiation (distinct *feel*, not just recolor)

The three flagships must read as three different *kinds of publication*. Differentiation comes from **device selection, hierarchy weight, fill confidence, and font register** — not only hue. One accent each, used confidently; ember (`#c9362c`/kiln) stays ≤2/screen.

### flagship-kiln — `#D95B3F` · creative · "the bold feature"
- **Feel**: confident, warm, editorial-poster energy. The loudest of the three (it's the only one allowed solid accent fills as a default).
- **Devices**: H2 = **solid filled accent bar** (`header-ribbon` look, white text) — kiln gets the reversed-out banner the others don't. Cover = `cover-grid` with a **solid accent module cell** (Constructivist). Quote = `quote-mark` with a **confident full-accent oversized `"` glyph**. Key-sentence = the **bare red-bold paragraph** punchline is *its* signature device (this is where the ember budget is spent). Divider = the **3-ring ember forge** (the one warm focal moment). Callout-warn (kiln tint) lands naturally here.
- **Register**: sans display, tighter rhythm, slightly larger headline weight (700). Whitespace generous but the page has more colored mass than the others.

### flagship-tempera — `#3B7A6B` · academic · "the literary journal"
- **Feel**: calm, serif, 单读-tier restraint. The quietest, most type-first. Color is a whisper.
- **Devices**: H2 = **tinted bar + 4px left rule** (never a solid fill — too loud for academic); H3 = **bare left rule** or `■` prefix mark. Cover = `cover-title` with a thin spine + serif title. Quote = **tinted quote card** with a refined corner motif, serif body. Key-sentence = **underline-only** or soft tint marker (NOT red-bold — tempera never shouts). Divider = the **◇◇◇ diamond** (size-hierarchied). Lead-in 导语 card in serif. Footer = the **minimalist byline rule** (`footer-byline-rule`, no fill) — "文 · 墨铸编辑部".
- **Register**: serif H1/body (`Source Han Serif`/`Songti SC`), the most whitespace, lowest fill density, widest letter-spacing on CJK labels. Reads like print column rules.

### flagship-amber — `#C19A56` · business · "the report / brief"
- **Feel**: structured, metallic, scannable. Clear wayfinding hierarchy; data-forward.
- **Devices**: **FIX the flat hierarchy first** — H2 = tinted bar OR **numbered chip header** (`01 / 02` business backbone), H3 = bare rule, so H2≠H3. Cover = `cover-title` with a **kicker chip carrying taxonomy** (栏目/期号). Ordered lists with **numbered chips** are amber's signature (listicle/report rhythm); enable a **KPI/stat tile** (solid amber tile, `onAccent`=**ink**) from `badge-kpi` for data callouts. Quote = `quote-vbar`→tinted card. Footer = the **full signature card** with metadata + outlined pill (most "刊物版权页"). Tip-callout (amber) is its natural accent.
- **Register**: clean sans, metallic amber as *punctuation* (footer rule, divider tick, chip) more than fill; `onAccent`=ink everywhere (amber is light — critical, never white text on amber). Tighter, denser, more numbered structure than the other two.

**Cross-preset discipline (keeps it 单读, not 微商):** one confident accent per article; tints are solid `rgba()` ≤0.10 for card fills; at most ~1 solid-fill bar per screen, a few tint blocks per screen; borders do structural work, fills do emphasis work; whitespace is the dominant background; ember/kiln red is rare and meaningful (≤2/screen, counted across the warning callout + key-sentence + vessel dot); every icon is an inline-SVG `<path>`, never emoji; auto-contrast via `onAccent` on every solid fill.

---

## Files to Edit / Add (quick index)

| File | Action |
|---|---|
| `svg-modules/text-cards.ts` | **NEW** — all HTML-block modules (quote-tint, callouts, key-line, lead-card, block headers, list rows, footer-card, title-meta/kicker, block dividers) |
| `svg-modules/theme.ts` | widen palette (`accentTint/accentBand/accentLine/accentDeep/cardBg`, raise hairline) |
| `svg-modules/types.ts` | optional palette fields; add `'callout'|'footer'|'meta'|'list'` families |
| `svg-modules/primitives.ts` | ADD `blockSection`/`tintCardStyle`/`solidChip`/`kicker`/`tintPanel`/`solidBand`; `card?` option on `svgSection` |
| `svg-modules/wechat-safe.ts` | parallel HTML-block check; move assert into wrappers; fix rule-count comment |
| `svg-modules/inject.ts` | extend `SvgInjectionPlan` (lead/callout/keySentence/listStyling/footer/block-headers); block decorator that forwards `innerHtml`; idempotency sentinels |
| `svg-modules/headers.ts` | ENHANCE vrule (variant h2/h3 + tint), ribbon (rx/kicker), bracket (tint fill); wire badge-num |
| `svg-modules/quotes.ts` | ENHANCE sectionStyle tints; strengthen quote-mark glyph; promote quote-card |
| `svg-modules/dividers.ts` | ENHANCE forge/diamond/grid thickness; reclaim dots/fade |
| `svg-modules/endmarks.ts` | thicken vessel; accent text; compose with footer-card |
| `svg-modules/covers.ts` | spine/kicker/numeral/brand-mark; grid cell + tint row; hiddenFulltext |
| `svg-modules/index.ts` | register new modules in `SVG_MODULES` |
| `platform-rules/wechat.ts` | add `'section'` to `DARKMODE_TARGETS`; `cardSafeStyle()` |
| `themes.ts` | chain block decorator after `composeSvgDecorate`; per-preset block plan options + tinted code CSS |
