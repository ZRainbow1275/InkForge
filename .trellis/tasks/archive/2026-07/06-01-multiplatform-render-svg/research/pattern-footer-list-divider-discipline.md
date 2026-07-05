# Research: Premium WeChat 公众号 Footer / List / Divider Patterns + Color-Usage Discipline

- **Query**: Premium WeChat editorial typesetting — footer/signature cards, styled list markers, refined dividers, and the color discipline that keeps refined layouts from looking gaudy. WeChat-safe inline techniques only.
- **Scope**: mixed (external design knowledge + internal codebase grounding)
- **Date**: 2026-06-02
- **Task**: `.trellis/tasks/06-01-multiplatform-render-svg`

---

## The Core Insight (read this first)

The current `svg-modules/` system (26 variants) is **inline-SVG only** — every module is `<section><svg viewBox …>…</svg></section>`. That is excellent for headers, dividers, endmark vessels, and covers. But premium 公众号 accounts (单读 / 新世相 / 看理想 tier) look "designed" mostly through a **second, complementary layer the current system does not use at all**: **inline-styled SOLID-COLOR HTML block containers**.

WeChat's paste sanitizer **strips** `id` / `class` / `<style>` and **forbids** gradients / `transform` / filters / `<defs>` / `url(#…)`. But it **KEEPS** these inline declarations on `<section>` / `<div>` / `<p>` / `<blockquote>`:

```
background-color | border | border-left | border-top | border-radius | padding | margin
color | font-size | font-weight | line-height | letter-spacing | text-align
```

This is independently confirmed inside our own codebase — `inkforge/src/services/export/preset-decorations.ts:343`:

> `// background-color + padding + border-radius all survive juice + WeChat`

…and the presets already rely on it for `blockquote` / `code` (`themes.ts:420`, `:448`). The SVG module system simply never produces these block containers. **That is the gap.** SVG is for *marks and geometry*; inline-styled block containers are for *typographic structure that wraps live, selectable, reflowing CJK text*.

### Why block containers, not SVG, for these four jobs

| Job | Wrong tool | Right tool | Why |
|---|---|---|---|
| Footer / signature card | SVG `<text>` | inline-styled `<section>` block | footer text is long, multi-line, must reflow at 375px and stay selectable/copyable; SVG `<text>` does not wrap |
| Styled list markers | SVG | inline-styled `<p>` rows with an SVG/▪ marker `<span>` | list items are live reflowing text; only the *marker* is decorative |
| Section-header bar | SVG ribbon (exists) OR block | both valid | block version lets the title text stay live CJK and reflow |
| Tinted callout / note box | SVG card with `<text>` | inline-styled `<section>` block | callout body is a paragraph that must reflow |
| Key-sentence highlight | n/a | inline-styled `<p>` / `<span>` | inline emphasis on running prose |

**Architecture note for implementation**: these are *not* `svgSection()` outputs — they are a new sibling helper that emits `<section style="…">…live HTML…</section>`. They MUST still pass a (slightly widened) `checkWechatSafe` — no `class`, no `<style>`, no gradient, no `transform:` in style, no `url(#`. Inline `background-color`/`border`/`border-radius`/`padding`/`margin`/`box-shadow` are all allowed (note `platform-css.ts` lists `boxShadow:true, borderRadius:true` for WeChat). Pure-solid-color fills only — no `linear-gradient(...)` even though WeChat tolerates some, because our ethos forbids it and our safety net is solid-fill + opacity-layering.

---

## Brand color tokens (LOCKED — use exactly these)

```
tempera   #3B7A6B   (primary editorial accent — the "one confident accent")
kiln      #D95B3F   (a.k.a. ember/铸红 — RARE, ≤ small dot per screen, never a fill block)
amber     #C19A56   (secondary/metallic — sparingly, e.g. footer hairline, divider tick)
warm paper#f7f4ef   (tinted card background — the workhorse for callout/footer fills)
ink       #1a1a1a   (body text)
muted ink rgba(26,26,26,0.55)  (captions, attribution, labels)
hairline  rgba(26,26,26,0.12)  (borders, rules)
tint      solid lightened brand color, made via rgba(R,G,B,α): e.g.
          rgba(59,122,107,0.08)  tempera 8% tint  (callout fill)
          rgba(59,122,107,0.06)  tempera 6% tint  (footer card fill)
          rgba(217,91,63,0.08)   kiln 8% tint      (warning/important box ONLY)
```

`onAccent` text on a filled tempera bar = `#ffffff` (tempera luminance < 0.5 → white, per `theme.ts:relativeLuminance`).

---

## PART A — FOOTER / SIGNATURE CARDS (the biggest missing win)

The single highest-leverage premium signal. Top accounts end articles with a restrained "card" containing: a thin top rule, an author/account line, a one-line tagline, and (optionally) a tiny brand mark + a faux "阅读原文 / 关注" affordance rendered as a bordered pill (NOT a real button — just styled text).

### Pattern A1 — `footer-card-quiet` (DEFAULT footer card)
- **Looks like**: a full-width `warm-paper`-tinted block with a 1px `tempera` rule across the top, generous padding, centered author name in ink + a muted-ink tagline below, and a hairline-bordered pill ("关注 · 墨铸") at the bottom. Restrained, no gradient, one accent.
- **Recipe (inline-style block; live reflowing text)**:
```html
<section style="margin:40px 0 8px;padding:32px 28px;background-color:rgba(59,122,107,0.06);
  border-top:2px solid #3B7A6B;border-radius:2px;text-align:center;">
  <p style="margin:0;font-size:17px;font-weight:600;color:#1a1a1a;letter-spacing:1px;">墨铸 · InkForge</p>
  <p style="margin:8px 0 0;font-size:14px;color:rgba(26,26,26,0.55);letter-spacing:0.5px;line-height:1.7;">成为作者吧 · 静谧刊印</p>
  <p style="margin:18px auto 0;display:inline-block;padding:6px 18px;font-size:13px;color:#3B7A6B;
    border:1px solid rgba(59,122,107,0.4);border-radius:999px;letter-spacing:2px;">关注 InkForge</p>
</section>
```
- **When to apply**: default footer for every flagship-SVG preset. Pair with the existing `endmark-vessel` SVG mark placed *above* it (vessel = the brand glyph; card = the metadata). Author/tagline/pill text come from preset/options, never hard-coded.
- **Notes**: pill is a `<p style="display:inline-block">`, not `<button>`/`<a class>` — survives sanitizer, looks like a CTA, does nothing (correct, since WeChat manages real "关注"). The top `border-top:2px solid` is the "designed" tell at near-zero cost.

### Pattern A2 — `footer-card-mark` (signature card with inline SVG vessel mark)
- **Looks like**: same tinted block, but a small (≤72px) inline-SVG brand vessel mark sits centered at the top *inside* the block, above the name. Combines the two layers: SVG mark + HTML card.
- **Recipe**: identical container to A1, but first child is a centered inline SVG (reuse the vessel-mark geometry from `endmarks.ts:renderVessel`, scaled to a small `<svg width="100%" viewBox="0 0 200 120">` wrapped in a width-capped `<section style="width:72px;margin:0 auto 12px;">`). The mark is solid `ink` strokes + one tiny `kiln` dot (the ≤1 ember rule). Text rows below exactly as A1.
- **When to apply**: the most premium "literary" presets where the brand glyph should re-appear as a colophon. Use instead of A1, not in addition.

### Pattern A3 — `footer-byline-rule` (minimalist colophon, no fill)
- **Looks like**: NO background fill — just a short centered `amber` hairline (160px), then a single muted-ink line "文 / 墨铸编辑部 · 2026". The 单读-style restraint footer.
- **Recipe**:
```html
<section style="margin:40px 0 8px;text-align:center;">
  <section style="width:160px;height:1px;margin:0 auto 16px;background-color:rgba(193,154,86,0.6);"></section>
  <p style="margin:0;font-size:13px;color:rgba(26,26,26,0.55);letter-spacing:4px;">文 · 墨铸编辑部</p>
</section>
```
- **When to apply**: academic / literary presets where any fill block feels too "marketing". This is the "less is more" footer. (Hairline via 1px-tall `<section>`, mirroring `hairlineRule` in SVG land.)

---

## PART B — STYLED LIST MARKERS (custom bullets / numbered chips)

WeChat keeps the marker styling if you render each list item as a `<p>` (or `<section>`) row with the marker as a leading inline-styled `<span>` (or a tiny inline SVG). Do **not** rely on `<ul>`/`<ol>` default markers (WeChat re-styles them inconsistently and you cannot color the native bullet). Convert list items into marker-row layout. Marker may be a colored square/diamond `<span>` or a numbered chip; **never an emoji** (constraint 2) — for an icon use an inline SVG path.

### Pattern B1 — `list-tempera-square` (square accent bullet, default UL)
- **Looks like**: each item = a small solid `tempera` square (8×8, slightly rounded) baseline-aligned, then the item text in ink. Constructivist, not a round dot — matches our "quiet press" geometry.
- **Recipe (per item)**:
```html
<p style="margin:8px 0;padding-left:0;line-height:1.8;color:#1a1a1a;">
  <span style="display:inline-block;width:8px;height:8px;border-radius:1px;background-color:#3B7A6B;
    margin-right:12px;vertical-align:1px;"></span>列表项内容文字……
</p>
```
- **When to apply**: default unordered-list replacement across flagship presets. The square reads as "designed bullet" without any template-y flourish.

### Pattern B2 — `list-num-chip` (numbered chip, default OL)
- **Looks like**: each item leads with a small solid `tempera` square/rounded chip containing a white number (the same `onAccent` logic as `badge-num`), then the text. Premium "编号" rhythm.
- **Recipe (per item, n = index)**:
```html
<p style="margin:10px 0;line-height:1.8;color:#1a1a1a;">
  <span style="display:inline-block;min-width:22px;height:22px;line-height:22px;text-align:center;
    background-color:#3B7A6B;color:#ffffff;font-size:13px;font-weight:600;border-radius:4px;
    margin-right:12px;vertical-align:2px;">1</span>有序列表项文字……
</p>
```
- **When to apply**: ordered lists in report/business/editorial presets. For ≥10 items the chip auto-widens via `min-width` + horizontal `padding`.

### Pattern B3 — `list-hairline-rows` (rule-separated list, no bullets)
- **Looks like**: items stacked with a 1px `hairline` divider *between* rows (top border on each item except the first); marker replaced by a tiny `amber` tick or just indentation. Reads like a refined table-of-contents / index.
- **Recipe (per item)**:
```html
<p style="margin:0;padding:12px 0;border-top:1px solid rgba(26,26,26,0.12);line-height:1.7;color:#1a1a1a;">
  <span style="color:rgba(193,154,86,0.9);margin-right:10px;">—</span>条目文字……
</p>
```
(first item: drop the `border-top`.)
- **When to apply**: lists that are really an index/menu (链接合集, 往期目录, 要点清单). Pairs beautifully under a `header-vrule`.

### Pattern B4 — `list-icon-svg` (inline-SVG path marker)
- **Looks like**: each item leads with a tiny (16px) inline SVG glyph (e.g. a constructivist check / arrow / diamond drawn with `<path>`), then text. The ONLY compliant way to get an "icon bullet" (no emoji).
- **Recipe (per item)**: marker is a width-capped inline SVG, e.g. a diamond reusing `diamond()` from `primitives.ts`:
```html
<p style="margin:8px 0;line-height:1.8;color:#1a1a1a;">
  <span style="display:inline-block;width:14px;margin-right:12px;vertical-align:-1px;"><svg
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="100%" style="display:block;"><path
    d="M10,3 L17,10 L10,17 L3,10 Z" fill="#3B7A6B"/></svg></span>列表项文字……
</p>
```
- **When to apply**: "key takeaways / 划重点" lists where each point deserves a deliberate mark. Keep the glyph monochrome solid `tempera`; never gradient/filter.

---

## PART C — REFINED DIVIDER MOTIFS (block-container variants to complement existing SVG dividers)

The existing 5 SVG dividers (`divider-grid/dots/fade/diamond/forge`) are strong. These add **block-container** dividers (cheaper bytes, live reflow) and one labeled-section-break motif premium accounts use.

### Pattern C1 — `divider-rule-thin` (asymmetric hairline)
- **Looks like**: a short, *left-aligned* (not centered) 1px rule — ~80px of `tempera` then the rest `hairline`, or just an 80px tempera segment. Editorial, asymmetric, confident.
- **Recipe**:
```html
<section style="margin:36px 0;height:2px;width:64px;background-color:#3B7A6B;border-radius:1px;"></section>
```
- **When to apply**: between sub-sections within a longer section, where a full SVG divider is too heavy. The short left-aligned bar is a hallmark of restrained design accounts.

### Pattern C2 — `divider-labeled` (centered label between two rules)
- **Looks like**: `——— 下篇 ———` style: a small muted-ink label centered, flanked by two `hairline` rules. Survives as three inline-styled blocks OR one SVG (SVG version already coverable by `centeredLabel` in `dividers.ts`, but a block version keeps the label as live text).
- **Recipe (block version, table-free using inline-block)**:
```html
<section style="margin:36px 0;text-align:center;">
  <section style="display:inline-block;width:80px;height:1px;background-color:rgba(26,26,26,0.12);vertical-align:middle;"></section>
  <span style="margin:0 16px;font-size:13px;color:rgba(26,26,26,0.55);letter-spacing:4px;vertical-align:middle;">下 篇</span>
  <section style="display:inline-block;width:80px;height:1px;background-color:rgba(26,26,26,0.12);vertical-align:middle;"></section>
</section>
```
- **When to apply**: chapter/part breaks where the break should be *named*. The letter-spacing on a 2-char CJK label is the whole effect.

### Pattern C3 — `divider-dot-amber` (single centered accent dot)
- **Looks like**: one small `amber` (or `tempera`) dot centered with whitespace above/below — the quietest possible break. Block version of `divider-dots` reduced to a single confident mark.
- **Recipe**:
```html
<section style="margin:40px 0;text-align:center;">
  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background-color:rgba(193,154,86,0.85);"></span>
</section>
```
- **When to apply**: literary essays where even three dots is too much. Maximum restraint.

---

## PART D — SECTION-HEADER BARS, CALLOUTS, KEY-SENTENCE HIGHLIGHTS (block containers that make "designed" sections)

These are the block-container companions to the SVG `header-*` family. They wrap **live CJK title/body text** so it reflows and stays selectable.

### Pattern D1 — `header-bar-fill` (solid section-header bar)
- **Looks like**: a solid `tempera` bar with white title text, full-width (small side inset), generous vertical padding. The block-container twin of `header-ribbon`.
- **Recipe**:
```html
<section style="margin:32px 0 16px;padding:12px 20px;background-color:#3B7A6B;border-radius:3px;">
  <p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;letter-spacing:2px;">本节标题</p>
</section>
```
- **When to apply**: H2 in bold/report presets. Use sparingly — at most one solid bar per "screen" so it stays a focal point, not wallpaper.

### Pattern D2 — `header-bar-tint` (tinted bar + left accent rule)
- **Looks like**: a `tempera` 6–8% **tint** fill (not solid) with a 4px solid `tempera` `border-left`, ink title. The everyday, lower-key section header — the 新世相 workhorse.
- **Recipe**:
```html
<section style="margin:32px 0 16px;padding:10px 18px;background-color:rgba(59,122,107,0.08);
  border-left:4px solid #3B7A6B;border-radius:0 3px 3px 0;">
  <p style="margin:0;color:#1a1a1a;font-size:17px;font-weight:600;letter-spacing:1px;">本节标题</p>
</section>
```
- **When to apply**: default H2/H3 across editorial presets. The tint+rule combo is the single most "premium-but-calm" header device. (Mirrors the blockquote recipe already in `themes.ts:448`.)

### Pattern D3 — `callout-note` (tinted note/callout box)
- **Looks like**: a `warm-paper` or `tempera`-tint block with a 4px `border-left`, an optional tiny inline-SVG icon, a small bold label ("注 / 提示"), then body text. The note box premium accounts use for asides.
- **Recipe**:
```html
<section style="margin:20px 0;padding:16px 20px;background-color:rgba(59,122,107,0.08);
  border-left:4px solid #3B7A6B;border-radius:0 4px 4px 0;">
  <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#3B7A6B;letter-spacing:2px;">注</p>
  <p style="margin:0;font-size:15px;line-height:1.8;color:#1a1a1a;">提示/补充说明的正文，可多行自动换行……</p>
</section>
```
- **Variant `callout-warn`**: swap to `kiln` tint `rgba(217,91,63,0.08)` + `border-left:4px solid #D95B3F` + label "重要". This is the ONLY licensed use of kiln as a (very faint) fill, reserved for genuine warnings — keeps kiln "rare and meaningful".
- **When to apply**: editor's notes, definitions, caveats. tempera tint = neutral note; kiln tint = warning (rare).

### Pattern D4 — `keysentence-highlight` (key-sentence emphasis block)
- **Looks like**: a single important sentence set larger, with a `warm-paper` fill and centered or left-indented, used as a pull-quote-lite *inside* running prose (distinct from `blockquote`). One per article-ish.
- **Recipe**:
```html
<section style="margin:24px 0;padding:20px 24px;background-color:#f7f4ef;border-radius:4px;">
  <p style="margin:0;font-size:18px;line-height:1.9;color:#1a1a1a;font-weight:500;letter-spacing:0.5px;">
    这句话是全文的核心论点，值得被单独抬升、加重、留白。</p>
</section>
```
- **Inline-only variant `keyspan-underline`**: emphasize a phrase inside a paragraph with a colored bottom border (faux highlighter) — `<span style="border-bottom:2px solid rgba(193,154,86,0.6);padding-bottom:1px;">关键短语</span>`. WeChat keeps `border-bottom` on inline `<span>`; avoid `background:linear-gradient` highlighter tricks (forbidden).
- **When to apply**: the one or two sentences per piece that carry the argument. Discipline: at most 1 highlight block + a few key-spans per article.

---

## PART E — COLOR-USAGE DISCIPLINE (the rule set that keeps it from going gaudy)

This is *why* the above looks like 单读 and not like a 微商 template. Encode these as lint-style rules in the module/preset layer.

1. **One confident accent.** `tempera #3B7A6B` is THE accent. Use it for: header rules/bars, list markers, footer top-rule, pill borders. Do not introduce a second hue as a co-equal accent in the same article.
2. **kiln #D95B3F is rare and meaningful.** Treat exactly like the existing "ember ≤ 1–2 per screen" rule: kiln appears as a *single small mark* (a dot in the vessel mark) OR as the faint fill of a genuine `callout-warn` — never as a header bar, never as a list marker, never twice on one screen.
3. **amber #C19A56 is metallic punctuation, not structure.** Footer hairline, a single divider dot, a key-span underline. Never a fill block, never body text.
4. **Tints, not new colors.** Backgrounds are SOLID lightened brand colors via `rgba(brand, 0.06–0.10)` (or `warm paper #f7f4ef`). Never a hue you cannot derive from the four brand colors. Keep fill alpha ≤ 0.10 so text contrast stays high and the block reads "tinted paper", not "colored box".
5. **Fill blocks are scarce.** At most ~1 solid-fill bar (D1) per screen; tint blocks (D2/D3/D4) a few per screen. If every section has a colored box, none stand out — that is the template look. Whitespace is the dominant background.
6. **Borders do the structural work; fills do the emphasis work.** Prefer a 1px `hairline` or 4px `border-left` to define structure; reserve fills for things that genuinely deserve highlighting.
7. **Solid + opacity only — never gradient/filter/transform.** This is both a brand rule and a survival rule. Depth comes from opacity layering and one soft `box-shadow` (allowed), never from `linear-gradient` or `filter`.
8. **Generous, consistent rhythm.** Block margins on a small scale (16/20/24/32/40px). Letter-spacing 1–4px on CJK headings/labels reads "typeset". Line-height 1.7–1.9 on body. Consistency *is* the premium signal.
9. **Text on accent = auto-contrast.** White on tempera, ink on tint — reuse the existing `relativeLuminance`/`onAccent` logic (`theme.ts`) so any preset primaryColor stays legible.
10. **No icon may be an emoji.** Every "icon" is an inline SVG `<path>` (constraint 2). Markers that are not icons may be a colored `<span>` square/dot.

---

## WeChat-safety checklist for these block-container patterns

Every pattern above must satisfy (extend `checkWechatSafe` to accept `<section>`/`<p>`/`<span>` block HTML, not only `<svg>`):
- [x] No `class=` / no `<style>` / no `id`-referenced anything
- [x] No `var(...)` / no `calc(...)`
- [x] No `transform:` inside `style="…"` (none of these need it)
- [x] No `linear-gradient` / `radial-gradient` — solid + `rgba` alpha only
- [x] No `<div>` — use `<section>` (existing rule `no-div`)
- [x] `box-shadow` / `border-radius` / `border*` / `background-color` / `padding` / `margin` inline = allowed (confirmed in `platform-css.ts` WeChat matrix + `preset-decorations.ts:343`)
- [x] Marker icons are inline SVG `<path>` solid-fill, not emoji
- [x] Faux CTA pills are `<p style="display:inline-block">`, never `<a class>`/`<button>`

---

## Integration map (where these plug in — additive, no deletions)

- **New sibling helper** alongside `svgSection()` in `primitives.ts`: e.g. `blockSection({ style, inner })` emitting `<section style="…">inner</section>`, plus the same `assertWechatSafe` gate widened to allow block HTML.
- **New module families** (ADD, do not rename existing 26): `footer` (A1–A3), `list` (B1–B4), and block-variant additions to `divider` (C1–C3) and a new `callout`/`section` family (D1–D4). All registered in `index.ts` via the existing `SVG_MODULES` spread.
- **Injection** (`inject.ts`): extend `SvgInjectionPlan` with `footer` (append, sentinel-guarded like `endmark`), `list?: { ordered: string; unordered: string }` (transform `<li>` rows), `callout?` (transform `<blockquote>`-with-marker or alert syntax), and `header*` block options. List transform replaces `<ul>/<ol><li>…` with marker-row `<p>`s. All sentinel-guarded for idempotency (`data-ink-svg="<id>"`).
- These are **opt-in flagship-preset** additions (D3 in the PRD: redundant double-build, default off, zero regression).

---

## Caveats / Not Found

- I could not run live external web fetches in this session (no exa/WebSearch tool surfaced); the WeChat-survival behavior is instead grounded in (a) the hard constraints supplied with the task, and (b) **direct codebase evidence** — `preset-decorations.ts:343` explicitly comments "background-color + padding + border-radius all survive juice + WeChat", and `themes.ts:420/448` ship blockquote tint+border-left into the WeChat pipeline today. The block-container survival claim is therefore verified against the project's own shipped, tested presets rather than an external blog.
- Exact pixel values (padding 16/20/32, marker 8px, chip 22px, footer rule 2px) are *reasoned defaults* in the project's existing rhythm scale (`svgSection` uses `margin:24px 0`); tune against real-machine 375px screenshots during implementation (evidence dir per DoD).
- `display:inline-block` survival on `<span>`/`<section>` is relied upon by patterns B2/C2/A1-pill — already used by shipped presets (`preset-decorations.ts:515/578` use `display:inline-block` spans into WeChat). Confirmed safe.
- Whether WeChat keeps `border-radius:999px` (pill) vs clamps it: shipped code uses small radii; pill uses a large radius — verify on real machine, fall back to `border-radius:16px` if clamped.
