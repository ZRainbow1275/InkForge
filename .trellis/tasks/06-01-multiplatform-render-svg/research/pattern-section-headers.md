# Research: Premium WeChat 公众号 Section-Header (H2/H3) Pattern Catalog

- **Query**: Premium WeChat section-header treatments (filled accent bars, number badges/chips, dual-tone blocks, decorative underlines, prefix marks) — which are achievable with inline `background-color`/`border` on a block element (WeChat-safe) vs needing inline SVG.
- **Scope**: mixed (internal codebase + external design knowledge + web verification)
- **Date**: 2026-06-02
- **Brand palette (LOCKED)**: tempera `#3B7A6B` · kiln `#D95B3F` · amber `#C19A56` · warm paper `#f7f4ef` · ink `#1a1a1a` · muted ink `rgba(26,26,26,.55)` · hairline `rgba(26,26,26,.12)`. Tints = solid lightened brand color, e.g. tempera 8% = `rgba(59,122,107,0.08)`.
- **Design ethos**: 静谧刊印 / quiet press — 单读 / 新世相-tier editorial restraint. One confident accent, generous whitespace, strong type hierarchy. NOT 微商/秀米 gaudy templates.

---

## TL;DR — The Core Gap

The current 4 header modules (`header-badge-num`, `header-bracket`, `header-ribbon`, `header-vrule`) all render the **title text inside `<text>` elements of an inline SVG**. That works but has 3 costs: (1) title text is no longer selectable / searchable / SEO-visible inside WeChat, (2) it cannot reflow with reader font-size settings, (3) every title becomes a fixed-viewBox raster-like block.

**The under-used lever**: WeChat's paste/publish sanitizer KEEPS inline `background-color` / `background` (solid) / `border` / `border-left` / `border-radius` / `padding` / `margin` / `box-shadow` / `color` / `font-*` / `text-align` / `line-height` / `letter-spacing` on `<section>` / `<p>` / `<blockquote>`. (Verified against `platform-css.ts` `WECHAT_SUPPORT`, `.trellis/research/platform-rendering-recon.md` §1.1, and `oaker-io/wewrite/references/wechat-constraints.md`.) So a **plain HTML block container with inline styles** can render a "designed" section header that keeps live, selectable, reflowable text — and is *cheaper and more faithful* than SVG for the most common header treatments.

**Rule of thumb**:
- **Block-CSS** (preferred) → filled bars, tinted plates, left-accent rules, dual-tone splits, decorative underlines via `border-bottom`, simple text prefixes. Live text, reflows, zero SVG cost.
- **Inline SVG** (only when needed) → anything requiring a true vector ICON (a custom mark, not emoji), precise geometric corner brackets, non-rectangular shapes, layered-opacity "glow", or animation. Reserve SVG for the badge *glyph*, not the *title text*.

### WeChat-safe CSS confirmed allowed (inline, on section/p/div→section)
`color · background-color · background (SOLID only) · padding · margin · border · border-left/right/top/bottom · border-radius · box-shadow · width · max-width · height · text-align · line-height · letter-spacing · font-size · font-weight · font-family · display:inline-block · vertical-align · white-space`

### WeChat-safe CSS FORBIDDEN (stripped by post-processor / sanitizer)
`class · id · <style> · var(--…) · calc() · linear/radial-gradient · transform · transition · animation · @keyframes · filter · backdrop-filter · position:fixed/sticky · display:flex · flex-* · grid-* · clip-path · mask`

> Implementation note for the codebase: these block-CSS patterns do NOT need the `svg-modules` SVG pipeline. They are best emitted as a sibling family (e.g. a `block-headers` set, or extend `inject.ts` `headings` to allow a renderer that returns plain `<section style="…"><p>…</p></section>` instead of `svgSection`). They still need `data-ink-svg`-style sentinels for idempotency and must keep CJK text outside any `<text>` so the existing `OPAQUE_TAGS`/CJK-spacing logic treats it as normal prose. Constraint (4): ADD these as new modules or ENHANCE the 4 existing header modules — do not delete/rename.

---

## Findings

### Existing modules (context)

| File | Relevant content |
|---|---|
| `inkforge/src/services/export/svg-modules/headers.ts` | 4 SVG header variants; titles live inside `<text>` (not live HTML text) |
| `inkforge/src/services/export/svg-modules/theme.ts` | `deriveSvgPalette` → `accent / accentSoft / onAccent / ink / inkSoft / paperWarm / hairline`; `relativeLuminance` picks white-vs-ink on accent |
| `inkforge/src/services/export/svg-modules/primitives.ts` | `svgSection` wrapper; `rect/circle/path/textLine`; `box-shadow` allowed on the wrapping `<section>` |
| `inkforge/src/services/export/svg-modules/wechat-safe.ts` | `checkWechatSafe` rules — note these target SVG; block-CSS headers are even safer (no SVG constructs at all) |
| `inkforge/src/services/export/svg-modules/inject.ts` | `composeSvgDecorate` replaces `<hN>…</hN>` with a module's `render()`; the seam where new block-header renderers plug in |

---

## Pattern Catalog

Each pattern below is the **recipe a top-tier account would actually ship**. Markup uses our brand colors. All block-CSS samples are paste-survivable; SVG-only patterns are flagged.

---

### Pattern 1 — Filled Accent Bar (实色标题条)  ★ block-CSS, flagship default

**Looks like**: A solid full-bleed (or near-bleed) brand-color block; the title sits in white/ink (auto-contrast) inside it. The single most recognizable "this is a designed account" device. Confident, restrained, one color.

**Why block-CSS not SVG**: keeps the title as live HTML text, reflows with reader font scale, and `onAccent` contrast is a simple color swap. This is the HTML-text successor to the existing SVG `header-ribbon`.

**Recipe** (tempera, white text — kiln gives `#fff`, amber gives ink `#1a1a1a` via luminance):
```html
<section data-ink-block="hdr-bar" style="margin:34px 0 18px;">
  <p style="background-color:#3B7A6B;color:#ffffff;font-size:19px;font-weight:600;
            letter-spacing:1px;line-height:1.4;padding:11px 18px;margin:0;
            border-radius:4px;">小标题文字</p>
</section>
```
Variants: square corners (`border-radius:0`) reads more editorial/severe; `border-radius:4px` reads modern. Keep padding generous (`11–14px` vertical) — cramped bars look 微商.

**When to apply**: H2 in flagship presets where you want maximum "designed" signal; one per screen is plenty. Pair with plenty of whitespace above (`margin-top:34px`).

---

### Pattern 2 — Left Accent Rule + Tinted Plate (左竖条 + 浅色底板)  ★ block-CSS, the quiet-press workhorse

**Looks like**: A thin solid accent bar on the LEFT edge, title in ink, sitting on a very faint tint of the same accent. The "单读 / 新世相" default — designed but whisper-quiet. This is the live-HTML successor to SVG `header-vrule`, upgraded with a tint plate.

**Why block-CSS**: `border-left` + `background-color` (solid tint via rgba) are both kept by WeChat. Live text, reflows.

**Recipe** (tempera 8% tint plate + solid left bar):
```html
<section data-ink-block="hdr-rule" style="margin:32px 0 16px;">
  <p style="border-left:4px solid #3B7A6B;background-color:rgba(59,122,107,0.08);
            color:#1a1a1a;font-size:19px;font-weight:600;line-height:1.5;
            padding:9px 16px;margin:0;border-radius:0 4px 4px 0;">小标题文字</p>
</section>
```
- **No-plate variant** (even quieter): drop `background-color`, keep only `border-left:4px solid` + `padding-left:14px`. Closest to print column rules.
- **Subtitle line**: add a second `<p>` with `color:rgba(26,26,26,.55);font-size:14px;margin:4px 0 0;` inside the same section.

**When to apply**: Default H2/H3 for editorial/academic personas; safest "designed but tasteful" choice. Use the tint sparingly — tint plate on H2, bare rule on H3, so hierarchy reads.

---

### Pattern 3 — Number Chip + Title (序号 chip + 标题)  ★ hybrid: chip can be block-CSS OR SVG

**Looks like**: A small filled square/rounded accent "chip" carrying a sequence number (01 / 02 / 03), title in ink to its right, optional hairline under. The "listicle backbone" of 一条 / 新世相 multi-section pieces. Restrained, gives strong scan-ability.

**Two builds**:

**(a) Block-CSS chip** (preferred — live text, simplest). The chip is an `inline-block` `<span>` with solid bg; number is real text:
```html
<section data-ink-block="hdr-chip" style="margin:32px 0 16px;">
  <p style="margin:0;line-height:1.4;">
    <span style="display:inline-block;background-color:#D95B3F;color:#ffffff;
                 font-size:15px;font-weight:700;letter-spacing:1px;
                 padding:3px 9px;border-radius:3px;vertical-align:middle;">01</span>
    <span style="color:#1a1a1a;font-size:19px;font-weight:600;letter-spacing:.5px;
                 vertical-align:middle;margin-left:10px;">小标题文字</span>
  </p>
</section>
```
- Round-chip look: use a fixed-size square + `border-radius:50%` — but WeChat keeps it square unless width≈height; for a true circle use the SVG build (b).
- Outline chip (quieter): `background:transparent;border:1.5px solid #D95B3F;color:#D95B3F;`.

**(b) SVG circle badge** — only when you want a *true circle* number badge with auto-contrast and precise centering. This is the existing `header-badge-num` (`circle({cx,cy,r,fill:accent}) + textLine(number) + textLine(title)`); keep it. Cost: title is `<text>`, not live HTML.

**When to apply**: Numbered/sequential sections. Prefer build (a) for live text; reach for SVG (b) only when a perfect circle is the design intent.

---

### Pattern 4 — Dual-Tone Split Block (双色块标题)  ★ block-CSS

**Looks like**: Title block split into two tones of the SAME accent — a solid accent "tab" segment butted against a faint-tint segment, or a solid block with a darker/lighter accent underline. Reads as deliberate, magazine-cover-ish, still one-color-family so it stays quiet.

**Why block-CSS**: achieved with two adjacent `inline-block` spans (solid + tint) OR one block with `border-bottom` in a deeper accent. NO gradient needed (gradients are stripped) — we layer SOLID tones, exactly per constraint (1).

**Recipe — tab + tint** (kiln solid tab, kiln 10% body):
```html
<section data-ink-block="hdr-dual" style="margin:32px 0 16px;">
  <p style="margin:0;line-height:1.4;white-space:nowrap;">
    <span style="display:inline-block;background-color:#D95B3F;width:8px;height:30px;
                 vertical-align:middle;border-radius:2px 0 0 2px;"></span><span
          style="display:inline-block;background-color:rgba(217,91,63,0.10);
                 color:#1a1a1a;font-size:19px;font-weight:600;padding:5px 16px;
                 vertical-align:middle;border-radius:0 4px 4px 0;">小标题文字</span>
  </p>
</section>
```
**Recipe — solid block + deeper underline** (amber block, ink-amber underline):
```html
<p style="display:inline-block;background-color:#C19A56;color:#1a1a1a;font-size:19px;
          font-weight:600;padding:8px 16px;margin:0;border-bottom:3px solid #8a6a32;
          border-radius:3px 3px 0 0;">小标题文字</p>
```

**When to apply**: Hero / feature section headers where Pattern 1 feels too flat. Use at most once or twice per article — it is the loudest of the quiet options.

---

### Pattern 5 — Decorative Underline / Highlight Sweep (装饰下划线 / 色块衬底)  ★ block-CSS

**Looks like**: Title in plain ink with a thick accent rule UNDER it (full-width or text-width), OR a "highlighter" tint band sitting behind only the text. Maximum restraint — the title still reads as text-first; the accent is a quiet flourish. Very 单读.

**Why block-CSS**: `border-bottom` survives; a behind-text highlight is an `inline` span with solid `background-color` (NOT the CSS `background-image:linear-gradient` highlighter trick — that gets stripped; use a flat tint).

**Recipe — full-width thick underline**:
```html
<section data-ink-block="hdr-underline" style="margin:30px 0 16px;">
  <p style="display:inline-block;color:#1a1a1a;font-size:19px;font-weight:600;
            letter-spacing:.5px;padding-bottom:6px;margin:0;
            border-bottom:3px solid #3B7A6B;">小标题文字</p>
</section>
```
**Recipe — highlighter band behind text** (amber 22% behind ink text):
```html
<p style="margin:30px 0 14px;line-height:1.6;">
  <span style="background-color:rgba(193,154,86,0.22);color:#1a1a1a;font-size:19px;
               font-weight:600;padding:2px 6px;">小标题文字</span></p>
```
- Double-rule variant: stack a `border-bottom` plus a thin hairline by giving the section a `border-bottom:1px solid rgba(26,26,26,.12)` and the `<p>` the thick accent rule.

**When to apply**: H3 / sub-sections, or any time Patterns 1–4 would over-decorate a long article. The default for "text must stay the hero".

---

### Pattern 6 — Prefix Mark + Title (前缀符号 + 标题)  ★ block-CSS for typographic marks; SVG for icon glyphs

**Looks like**: A small accent-colored typographic prefix before the title — a filled square `■`, diamond `◆`, slash `/`, bracket `〔〕`, or section pilcrow `§`. Editorial, minimal, gives rhythm to a sequence of H3s without any block fill.

**Why block-CSS for marks**: the mark is a colored `<span>` with a real Unicode glyph (■ ◆ ／ 〔〕 ·) — kept verbatim, live text. **Per constraint (2): NEVER use emoji as a mark.** Unicode geometric punctuation (■◆▌〕·—) is text, not emoji, and is allowed. A custom brand glyph (e.g. the InkForge vessel/diamond sig) must be **inline SVG `<path>`**, not emoji.

**Recipe — filled-square prefix** (tempera mark):
```html
<p style="margin:30px 0 14px;line-height:1.4;">
  <span style="color:#3B7A6B;font-size:16px;vertical-align:middle;margin-right:8px;">■</span>
  <span style="color:#1a1a1a;font-size:19px;font-weight:600;letter-spacing:.5px;
               vertical-align:middle;">小标题文字</span></p>
```
**Recipe — vertical bar prefix** (kiln `▌`): swap glyph to `▌` and color `#D95B3F`.

**SVG variant (icon glyph, NOT emoji)**: if the prefix must be the brand mark, render it via the existing `diamond()` / `diamondSig()` / `path()` primitives in `primitives.ts` as a tiny inline `<svg>` before a live-text `<span>` title. Reserve for flagship signature headers; costs the SVG pipeline.

**When to apply**: Runs of H3 inside one section where block fills would be visually noisy; gives quiet rhythm. The cheapest "designed" touch.

---

### Pattern 7 — Bracket / Corner-Framed Title (角框 / 括号标题)  ★ SVG-only (precise) OR block-CSS (approx.)

**Looks like**: Title framed by four L-shaped corner brackets, or wrapped in oversized 〔 〕 / 【 】 brackets. Constructivist, gallery-label feel. This is the existing SVG `header-bracket`.

**Two builds**:
- **SVG (precise)** — keep `header-bracket` (`bracketCorner` `<path>` ×4 + centered `<text>`). The only way to get true four-corner L-brackets with exact geometry. Title is `<text>`.
- **Block-CSS approximation** — wrap a `<p>` in solid Unicode brackets as live text, OR use `border` on two sides only:
```html
<p style="display:inline-block;color:#1a1a1a;font-size:19px;font-weight:600;
          padding:6px 14px;margin:30px 0 14px;letter-spacing:1px;
          border-top:2px solid #3B7A6B;border-bottom:2px solid #3B7A6B;">小标题文字</p>
```
or live-text brackets: `〔<span style="color:#3B7A6B">小标题文字</span>〕` sized up.

**When to apply**: Special / flagship section headers where the constructivist corner is the brand statement. Default to block-CSS top+bottom rules for everyday use; reserve true SVG corner brackets for hero headers.

---

## Cross-cutting recipe conventions (apply to ALL block-CSS headers)

- **Auto-contrast on solid fills**: white `#ffffff` on tempera/kiln; ink `#1a1a1a` on amber and on all tints (reuse `relativeLuminance` from `theme.ts` — `<0.5 → #fff else #1a1a1a`).
- **Tints = solid rgba of the brand color**, never gradients: tempera 8% `rgba(59,122,107,0.08)`, kiln 10% `rgba(217,91,63,0.10)`, amber 22% `rgba(193,154,86,0.22)`.
- **Spacing for "quiet press"**: `margin-top` 30–34px (big top air), `margin-bottom` 14–18px, padding vertical ≥9px. Cramped = 微商.
- **Hierarchy**: H2 = filled/tinted block (Pattern 1/2/4); H3 = underline/prefix (Pattern 5/6). Never give every level a block fill.
- **One accent, confidently**: pick ONE brand color per article's headers; do not alternate tempera/kiln/amber across sibling headers.
- **Idempotency + sentinel**: emit a `data-*` sentinel on the wrapper `<section>` so `inject.ts` re-runs are no-ops, mirroring `data-ink-svg`.
- **Font**: reuse the CJK display stack already in `headers.ts` (`-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`).

## External References

- `oaker-io/wewrite/references/wechat-constraints.md` — WeChat allows inline `color/background/padding/margin/border/border-radius/box-shadow/font-*/text-align/line-height/letter-spacing`; forbids `<style>`/`<link>`, `position:fixed/sticky`, `transform`, `animation`, `@keyframes`, `filter`, `backdrop-filter`. (Note: it optimistically lists flex/box-shadow as supported; Inkforge's matrix treats flex as false — trust the matrix.)
- MDN `border-left-color`, `border-color`, `background-color` (verified syntax) — confirm `rgba()` and per-side border values are standard inline CSS, fully kept by WeChat's inline-style allowlist.
- 微信开放社区 thread (2025-03-28) — `position` filtered server-side after `Add_draft`; confirms the strip-list direction.

## Caveats / Not Found

- Targeted web search did not surface clean, copy-pasteable inline-style header recipes from 135编辑器/秀米/壹伴 directly (those tools' emitted HTML is behind their editors; results were mostly generic CSS-cleaner pages). The block-CSS recipes above are derived from the verified WeChat CSS allowlist + the project's own `platform-css.ts` matrix and recon doc, which are the authoritative ground truth here.
- `display:flex` is listed as supported by one third-party doc but Inkforge's `postProcessForWechat` strips it (`'display:\\s*flex(?!-)'`). All recipes above therefore avoid flex and use `display:inline-block` + `vertical-align:middle` for chip/title alignment.
- `box-shadow` is allowed on the wrapping `<section>` per existing `quote-card`, but `enforcePlatformCSS`'s box-shadow downgrade path exists for the export-validator branch; keep header shadows subtle and prefer borders for crisp edges.
- True circular number badges and four-corner L-brackets remain SVG-only; everything else (Patterns 1, 2, 4, 5, 6, and the chip build of 3) is best done as live-text block-CSS.
