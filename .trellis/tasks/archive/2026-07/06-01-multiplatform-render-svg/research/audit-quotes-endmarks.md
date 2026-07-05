# Research: quotes.ts & endmarks.ts audit (WeChat inline-SVG premium uplift)

- **Query**: For every exported module/function in `svg-modules/quotes.ts` and `svg-modules/endmarks.ts`, document signature + flagship preset usage + exact emitted markup (colors, viewBox, fills, stroke widths, font sizes) + blunt critique + 3-5 concrete WeChat-safe enhancement ideas.
- **Scope**: internal
- **Date**: 2026-06-02

## Files in scope

| File Path | Description |
|---|---|
| `inkforge/src/services/export/svg-modules/quotes.ts` | 4 quote (blockquote) modules: quote-corner, quote-vbar, quote-mark, quote-card |
| `inkforge/src/services/export/svg-modules/endmarks.ts` | 3 endmark (文末签名) modules: endmark-fin, endmark-vessel, endmark-rule |
| `inkforge/src/services/export/svg-modules/primitives.ts` | Atomic constructors (`rect`, `path`, `circle`, `textLine`, `diamondSig`, `hairlineRule`, `svgSection`) — what the literal markup actually expands to |
| `inkforge/src/services/export/svg-modules/theme.ts` | `deriveSvgPalette` — maps preset primaryColor → palette tokens used below |
| `inkforge/src/services/export/themes.ts:87-117, 1116-1209` | Flagship preset wiring (which preset uses which module) |

## Palette tokens (from `theme.ts:62-81`) — what the color names below resolve to

| token | value | note |
|---|---|---|
| `palette.ink` | `#1a1a1a` | locked ink |
| `palette.inkSoft` | `rgba(26, 26, 26, 0.55)` | locked muted ink |
| `palette.accent` | `'#' + normalizeHex(primaryColor)` | flagship-locked: Kiln `#D95B3F` / Tempera `#3B7A6B` / Amber `#C19A56` |
| `palette.accentSoft` | `rgba(accent, 0.08)` business/academic, `rgba(accent, 0.12)` creative/lifestyle | the ONLY tint currently in use |
| `palette.paper` | `#ffffff` | |
| `palette.paperWarm` | `#f7f4ef` | locked warm paper |
| `palette.ember` | `#c9362c` | ≤1 use/module rule |
| `palette.hairline` | `rgba(26, 26, 26, 0.12)` | |
| `palette.onAccent` | `#ffffff` or `#1a1a1a` (auto by luminance) | **already exists but NEVER used in quotes/endmarks** — this is the unlock for solid-fill backing |

## Flagship preset → module map (from `themes.ts`)

| Preset (id / name / persona / accent) | blockquote module | endmark module |
|---|---|---|
| `flagship-kiln` / 赤陶旗舰 / creative / `#D95B3F` | **quote-mark** | **endmark-vessel** |
| `flagship-tempera` / 铜绿旗舰 / academic / `#3B7A6B` | **quote-corner** | **endmark-fin** |
| `flagship-amber` / 黄铜旗舰 / business / `#C19A56` | **quote-vbar** | **endmark-rule** |
| (none — orphan, opt-in only) | **quote-card** | — |

---

# PART A — quotes.ts

## Shared infra (non-module exports / internals)

### `wrapCjkLines(input, maxCharsPerLine = 18): string[]` (internal, not exported)
Hard-wraps at ~18 CJK chars/line, max 4 lines, appends `…` to a truncated 4th line. **Visual constants:** `MAX_LINES = 4`, `TARGET_CHARS_PER_LINE = 18`, `LINE_HEIGHT = 64`, `QUOTE_FONT = 38`, `SUBTITLE_FONT = 26`, `CANVAS_W = 1080`. `SAFE_FONT_STACK = '-apple-system, PingFang SC, Hiragino Sans GB, Source Han Serif SC, Songti SC, serif'`.

### `computeHeight(lineCount)` → `160 + max(1,lines)*64`
### `renderQuoteLines(...)` → one `<text font-size="38">` per visual line, spaced 64px.
### `renderAttribution(...)` → one `<text font-size="26" fill=inkSoft>` or `''` if no subtitle.

**Why this shared layer is the root of "plain":** every quote is rendered as bare `<text>` glyphs on a transparent canvas. The text size is identical for all 4 lines (no lead line, no emphasis), attribution is the same muted gray everywhere, and there is **zero block-level container** (`background-color`/`border`/`padding`/`border-radius` on `<section>`/`<div>`) except quote-card. Per HARD CONSTRAINT (5), inline-styled solid-color block containers are the #1 lever for "designed vs markdown" and the quote family barely touches them.

---

## Module 1 — `quote-corner` (renderQuoteCorner)

- **Signature:** `renderQuoteCorner(p: SvgModuleParams): string`
- **Registered:** `{ id:'quote-corner', family:'quote', render: renderQuoteCorner }`
- **Used by:** **flagship-tempera (铜绿旗舰, academic, #3B7A6B)**.

**Exact markup emitted** (`quotes.ts:114-146`):
- Two corner brackets via `path(..., { stroke: palette.accent, strokeWidth: 6, strokeLinecap:'square', fill:'none' })`:
  - top-left `M60,50 L60,130 M60,50 L140,50`
  - bottom-right `M{1020},{h-50} L{1020},{h-130} M{1020},{h-50} L{940},{h-50}`
- Body: `renderQuoteLines(lines, { x:160, yStart:110, fill: palette.ink })` → `<text font-size="38" fill="#1a1a1a">`
- Attribution: `<text font-size="26" fill="rgba(26,26,26,0.55)" text-anchor="end">` at `(920, h-70)`
- Wrapper: `svgSection({ viewBoxW:1080, viewBoxH:h, sectionStyle:'margin:24px 0;' })` → `<section data-ink-svg="quote-corner" style="margin:24px 0;"><svg viewBox="0 0 1080 {h}" width="100%" style="display:block;">…</svg></section>`

**Blunt critique:** Two thin (6px) accent hairline elbows floating in a void with no fill behind them. On a phone at 375px the `viewBox` scales the 6px stroke down to ~2px — it reads as a faint, accidental tick mark, not a deliberate quote frame. No background, no card, no tonal separation from body copy. This is literally "indented italic markdown" energy. The corners don't even connect, so there's no enclosure read.

**Enhancement ideas (WeChat-safe):**
1. **Tinted quote card behind the corners.** Add a full-bleed `rect(x=40,y=20,w=1000,h=h-40, fill=palette.accentSoft)` as the FIRST body element (solid lightened accent, e.g. `rgba(59,122,107,0.08)`), then draw the corners on top. Inside the SVG this is allowed (solid fill, no gradient). Instantly gives the "tint card" look from constraint (5).
2. **Thicken + lengthen the corners and make them L-frames** (e.g. 10px stroke, 110px legs) so they scale to a real ~3-4px on mobile and read as a deliberate bracket frame.
3. **Lead-line typographic hierarchy:** render line 1 at `fontSize 44 fontWeight 600`, lines 2+ at 38 — a confident first line is the single cheapest "editorial" upgrade.
4. **Accent rule under attribution:** a short `hairlineRule(width=120, fill=palette.accent)` above the attribution turns a stray gray byline into a signed pull-quote.
5. **Move the tint to the `<section>` level too** (constraint 5 KEY LEVER): set `sectionStyle = 'margin:24px 0;background-color:rgba(59,122,107,0.06);border-left:4px solid #3B7A6B;border-radius:4px;padding:8px 0;'`. WeChat keeps `background-color`/`border-left`/`border-radius`/`padding` on `<section>`, so even outside the rasterized SVG the block reads as a designed quote card. (Caveat: section padding interacts with `width="100%"` SVG — test that the SVG still fills width.)

---

## Module 2 — `quote-vbar` (renderQuoteVbar)

- **Signature:** `renderQuoteVbar(p: SvgModuleParams): string`
- **Used by:** **flagship-amber (黄铜旗舰, business, #C19A56)**.

**Exact markup emitted** (`quotes.ts:150-185`):
- Left bar: `rect({ x:60, y:40, width:8, height:h-140, fill: palette.accent })` — an 8px solid accent vertical bar.
- Body: `renderQuoteLines(lines, { x:100, yStart:90, fill: palette.ink })` (`font-size 38`, ink).
- Attribution: `<text font-size="26" fill=inkSoft>` at `(100, h-60)`, left-anchored.
- Wrapper: `sectionStyle:'margin:24px 0;'`.

**Blunt critique:** This is the textbook "GitHub blockquote → 8px left border" that the user explicitly complained about. An 8px bar at 1080 viewBox = ~2.8px on phone. It is the single most "markdown converter" looking variant in the set. The bar is the only color; the rest is plain ink text on white. Nothing about it says "premium account."

**Enhancement ideas (WeChat-safe):**
1. **Solid-fill tint panel + bar.** Add a `rect(x=60,y=40,w=960,h=h-140, fill=palette.accentSoft)` panel and keep the bar as its left edge — now it's a filled callout, not a naked stripe. Bump the bar to `width:12` and `fill:palette.accent`.
2. **Promote to a `<section>` callout box (KEY LEVER, constraint 5):** `sectionStyle = 'margin:24px 0;background-color:#f7f4ef;border-left:6px solid #C19A56;border-radius:0 8px 8px 0;padding:20px 24px;'`. Warm paper body + amber spine + asymmetric radius = the 单读/新世相 "note box" look, entirely from kept inline styles.
3. **Inline quote glyph as SVG path, not text:** add a small accent `"` mark (path, fill=accentSoft) at the bar top as a quiet motif — no emoji (constraint 2), no `<defs>`.
4. **Hierarchy:** first line `fontSize 42 fontWeight 600 fill ink`; body lines 38; attribution gets a leading em-dash `— ` and `letter-spacing:2` so it reads as a citation, not a stray line.
5. **Tonal label chip:** a tiny rounded `rect(rx=4, fill=palette.accent)` with `<text fill=palette.onAccent fontSize=22>引</text>` (使用 `onAccent`, which already auto-resolves to white/ink) as a solid-fill badge anchoring the top-left — exactly the "filled chip" premium accounts use.

---

## Module 3 — `quote-mark` (renderQuoteMark)

- **Signature:** `renderQuoteMark(p: SvgModuleParams): string`
- **Used by:** **flagship-kiln (赤陶旗舰, creative, #D95B3F)**.

**Exact markup emitted** (`quotes.ts:189-230`):
- Decorative 66-style double quote glyph as a single `path(markD, { fill: palette.accentSoft })`. The path `markD` draws two filled comma shapes at top-left (~180×140 region around x40-200, y70-210).
- Body: `renderQuoteLines(lines, { x:80, yStart:280, fill: palette.ink })`.
- Attribution: `<text font-size="26" fill=inkSoft>` at `(80, h-60)`.
- Wrapper viewBox height is `h + 140` (extra room for the mark). `sectionStyle:'margin:24px 0;'`.

**Blunt critique:** The big quote glyph is filled with `accentSoft` — i.e. `rgba(217,91,63,0.12)`, a barely-there 12%-opacity ghost. On warm/white it nearly disappears; it reads as a smudge, not a designed drop-quote. Body text is again plain ink, attribution again plain gray, no container. The one decorative element is the one element rendered nearly invisible. This is the most ironic "plain" failure: it HAS a motif and then mutes it into nothing.

**Enhancement ideas (WeChat-safe):**
1. **Make the mark confident, not ghostly.** Fill the big quote glyph with full `palette.accent` at `opacity:0.18-0.22` (still tasteful, still 静谧) OR full accent and shrink/position it as a real drop-cap-scale glyph behind line 1. A 22%-opacity solid accent reads 10× stronger than 12% accentSoft.
2. **Tint card backing (constraint 5/3):** put a `rect(fill=palette.accentSoft)` rounded panel behind everything, then the accent glyph on top, then ink body — layered solid fills, the canonical WeChat-safe substitute for gradient depth.
3. **Closing mark + baseline rule:** mirror a smaller closing `"` (path) at the bottom-right and add a short `hairlineRule(width=80, fill=palette.accent)` over the attribution — frames the quote top-and-bottom for real enclosure.
4. **Strong lead line:** render line 1 at `fontSize 46 fontWeight 600`, remaining lines 36 inkSoft-ish — creates the "key sentence" hierarchy constraint (5) calls out as a premium signal.
5. **Section-level kiln card:** `sectionStyle='margin:24px 0;background-color:rgba(217,91,63,0.06);border-radius:10px;padding:24px 28px;'` so even the kept inline-style block (outside the SVG raster) carries the kiln tint card identity.

---

## Module 4 — `quote-card` (renderQuoteCard)

- **Signature:** `renderQuoteCard(p: SvgModuleParams): string`
- **Used by:** **NONE** — registered but not wired into any flagship plan (orphan, opt-in only). It's actually the closest to "designed."

**Exact markup emitted** (`quotes.ts:234-274`):
- Card: `rect({ x:40, y:40, width:1000, height:h-80, rx:20, ry:20, fill: palette.paperWarm, stroke: palette.hairline, strokeWidth:1 })` — warm-paper rounded card with a 1px hairline border.
- Body: `renderQuoteLines(lines, { x:96, yStart:120, fill: palette.ink })`.
- Attribution: `<text font-size="26" fill=inkSoft text-anchor="end">` at `(984, h-72)`.
- Shadow via `<section>` style (`boxShadowFor`): `sectionStyle = 'margin:24px 0;box-shadow:0 12px 28px rgba(accent,0.08-0.12), 0 2px 6px rgba(26,26,26,0.12);border-radius:20px;'`.

**Blunt critique:** Best of the four because it actually has a filled card + radius + shadow. Weakness: the card fill (`paperWarm #f7f4ef`) is almost identical to a white WeChat article background, so on default white it nearly vanishes — the only thing separating it is a 1px hairline + soft shadow. There is **zero accent** anywhere on the card (accent only sneaks into the shadow rgba, which is invisible). It's a beige rectangle. No hierarchy, no motif. (Note: `box-shadow` IS kept by WeChat per constraint 5, so the shadow is real — good.)

**Enhancement ideas (WeChat-safe):**
1. **Add an accent spine or top bar:** an accent `rect(x=40,y=40,w=8,h=h-80,fill=palette.accent)` left edge, OR a solid `rect(x=40,y=40,w=1000,h=10,rx=5,fill=palette.accent)` top cap inside the rounded card — one confident accent on the otherwise-neutral card.
2. **Filled attribution footer band:** bottom strip `rect(fill=palette.accentSoft)` with attribution in `palette.ink`, separating byline from quote — a "signature card" footer (constraint 5).
3. **Inline quote-mark motif (path, accent, opacity:0.15)** top-left of the card as a quiet press flourish — no emoji (constraint 2).
4. **Hierarchy + leading:** first line `fontSize 44 fontWeight 600`; widen `LINE_HEIGHT` inside card to ~70 for generous editorial whitespace (constraint 6).
5. **Wire it into a flagship / promote it:** this is the strongest base; consider making it the default for one persona, or adding a `quote-card-accent` ADD-ON (constraint 4 forbids renaming but ALLOWS adding) that = quote-card + accent spine + footer band.

---

# PART B — endmarks.ts

## Shared infra
Constants: `VBW = 1080`, `VBH = 200` (fixed height, no growth), `CX = 540`. `FONT_CJK = 'PingFang SC, Hiragino Sans GB, Microsoft Yahei, sans-serif'`. All three are centered, ~200px tall, no background fill, no container — pure floating marks on transparent canvas. **This is the same root gap as quotes:** no solid-fill "signature card" block, which constraint (5) names explicitly as a premium signal.

## Module 5 — `endmark-fin` (renderFin)

- **Signature:** `renderFin(p): string`
- **Used by:** **flagship-tempera (铜绿旗舰, academic)**.

**Exact markup** (`endmarks.ts:36-55`):
- `diamondSig({ cx:540, cy:70, r:7, fill: palette.accent, gap:28 })` → three accent diamonds `◇◇◇` (each a `path` `M cx,cy-7 L cx+7,cy L cx,cy+7 L cx-7,cy Z`) at y=70, 28px apart.
- `<text x=540 y=138 fill="rgba(26,26,26,0.55)" font-size="30" letter-spacing="8" text-anchor="middle">全文完</text>` (default text `'全文完'`).
- Wrapper default `sectionStyle:'margin:24px 0;'`.

**Blunt critique:** Three tiny 7px-radius diamonds (~2.4px on phone) + gray "全文完". It's tasteful but utterly minimal — it could be the default footer of any markdown theme. No card, no brand presence, no warmth. Reads as "the end of a plain doc," not "the end of a 单读 essay."

**Enhancement ideas (WeChat-safe):**
1. **Signature card (KEY LEVER):** wrap in `sectionStyle='margin:32px 0;background-color:#f7f4ef;border-radius:12px;padding:28px 0;'` — a warm-paper end card instantly elevates it.
2. **Center accent hairline behind diamonds:** two short `hairlineRule` segments flanking the `◇◇◇` (`fill=palette.hairline`) so the diamonds sit on a "publisher's rule" — classic editorial close.
3. **Bolder mark scale:** raise diamond `r` to 9-10 and add tonal variation (center diamond `fill=palette.accent`, flanks `fill=palette.accentSoft`) for a deliberate composed mark.
4. **Two-line signature:** "全文完" line + a smaller muted brand line ("InkForge · 墨铸", `fontSize 20 letter-spacing 4`) — gives the footer a byline identity.
5. **Confident letter-spacing/weight:** "全文完" at `font-weight 500` + the existing `letter-spacing:8` reads more intentional; consider `fill=palette.ink` (not inkSoft) for the final word so the close has presence.

## Module 6 — `endmark-vessel` (renderVessel)

- **Signature:** `renderVessel(p): string`
- **Used by:** **flagship-kiln (赤陶旗舰, creative)**.

**Exact markup** (`endmarks.ts:68-220`) — the brand vessel mark (鼎×笔尖×方格), centered at `(mx=540, my=80)`:
- **Ding body** `path(dingPath, { fill:'none', stroke: palette.ink, strokeWidth:1.8 })` — outline tripod vessel (mouth 56, shoulder 76, belly 64, base 50).
- **Two ears** `rect(w:8,h:12,rx:2, fill:'none', stroke:ink, strokeWidth:1.6)` at `mx-44/mx+36, my-36`.
- **Three legs** `path(..., stroke:ink, strokeWidth:1.8, strokeLinecap:'round')` short diagonals.
- **Belt** `path('M mx-18,my-4 L mx+18,my-4', stroke: palette.hairline, strokeWidth:1)`.
- **Nib** `path(nibPath, { fill: palette.accent })` — slim downward triangle into the vessel mouth.
- **Nib slit** `path('M mx,my-50 L mx,my-14', stroke: palette.paper, strokeWidth:0.8, opacity:0.85)`.
- **Grid square** `rect(x:mx-8,y:my+44,w:16,h:16, fill:'none', stroke:ink, strokeWidth:1.4)` + inner cross (`gridCrossV`/`gridCrossH`, `stroke:hairline, strokeWidth:0.8`).
- **Ember dot** `<circle cx="mx+34" cy="my-30" r="2.4" fill="#c9362c" />` (the one allowed ember).
- **Signature rule** `hairlineRule(x:450,y:150,width:180,height:1,fill:hairline)`.
- **Signature text** `<text x=540 y=178 fill=inkSoft font-size=22 letter-spacing=4 text-anchor="middle">InkForge · 墨铸</text>` (default subtitle).
- Default `sectionStyle:'margin:24px 0;'`.

**Blunt critique:** This is the richest mark by far (genuine brand motif, good restraint, ember accent). But it's drawn entirely with **1.0-1.8px hairline strokes on `fill:'none'`** — at 1080 viewBox that's sub-pixel/~0.6px on a 375px phone. The vessel risks rendering as faint scratches or disappearing entirely on mobile. It's "thin" in the most literal sense. There's also no backing/card, so a delicate line drawing floats on white with no anchor. The nib (only filled element) is the only thing reliably visible.

**Enhancement ideas (WeChat-safe):**
1. **Give the ding a solid silhouette layer.** Behind the stroked outline, draw the same `dingPath` as a SOLID `fill:palette.accentSoft` (or `paperWarm`) shape — solid fill survives mobile downscaling where 1.5px strokes don't. Layered solid + outline = depth without gradients (constraint 1).
2. **Thicken strokes for mobile:** bump `strokeWidth` 1.8→3, ears 1.6→2.4, grid 1.4→2.2; thin hairlines (0.8) won't survive — promote belt/grid-cross to ≥1.5.
3. **Signature card (KEY LEVER):** `sectionStyle='margin:32px 0;background-color:#f7f4ef;border-radius:14px;padding:32px 0;'` so the mark sits on a warm-paper plate — the difference between "logo floating in void" and "stamped colophon."
4. **Stronger nib/accent read:** the nib is the brand's "casting" gesture — it can afford full `accent` (already is) plus a subtle accent fill on the vessel mouth lip to tie color through; keep ember the single ≤1 dot.
5. **Two-tier signature:** brand line ("InkForge · 墨铸") + a thinner tagline line ("成为作者吧", per brand canonical naming) at `fontSize 18 fill=inkSoft` — colophon richness, still restrained.

## Module 7 — `endmark-rule` (renderRule)

- **Signature:** `renderRule(p): string`
- **Used by:** **flagship-amber (黄铜旗舰, business)**.

**Exact markup** (`endmarks.ts:223-248`):
- `hairlineRule({ x:460, y:92, width:160, height:1, fill: palette.hairline })` — a single 160px × 1px gray line.
- `<text x=540 y=140 fill=inkSoft font-size=26 letter-spacing=10 text-anchor="middle">全文完</text>`.
- Default `sectionStyle:'margin:24px 0;'`.

**Blunt critique:** The single most minimal element in the entire system: one 1px hairline (renders ~0.35px on phone — practically invisible) + gray text. This is indistinguishable from a `<hr>` + caption in raw markdown. Zero brand, zero color, zero presence. For a "business 黄铜旗舰" footer this is a missed branding opportunity at the highest-attention spot (end of article).

**Enhancement ideas (WeChat-safe):**
1. **Accent rule, not hairline.** `fill=palette.accent`, `height:3`, and consider a centered diamond/dot break in the middle (small `path`/`circle` accent) so the rule is a designed divider, not a faint scratch.
2. **Signature card (KEY LEVER):** `sectionStyle='margin:32px 0;background-color:#f7f4ef;border-top:3px solid #C19A56;padding:28px 0;'` — a warm plate with an amber top border reads instantly "designed footer."
3. **Brand byline:** add a second muted line under "全文完" ("InkForge · 墨铸" `fontSize 18`) for identity; the spot is wasted otherwise.
4. **Hierarchy/weight:** "全文完" at `fill=palette.ink font-weight 500` + a short accent underline (`hairlineRule width=64 fill=accent`) centered beneath it.
5. **Tonal end chip:** a small solid `rect(rx=4, fill=palette.accent)` chip with `<text fill=palette.onAccent>完</text>` (uses the unused `onAccent` token) centered — a confident single-accent stamp matching constraint (6).

---

## Cross-cutting recommendations (apply to BOTH families)

1. **Adopt solid-fill block containers everywhere (the named #1 gap, constraint 5).** Neither family currently sets `background-color`/`border`/`padding`/`border-radius` on the `<section>` (except quote-card's shadow). These survive WeChat paste and are the dominant "designed vs markdown" signal. Add tint cards / signature plates via `sectionStyle`.
2. **Stop relying on sub-2px strokes at 1080 viewBox.** Everything thin (1-1.8px lines, 6-8px bars, 7px diamonds) scales to sub-pixel on 375px phones → reads "thin/plain." Use SOLID FILLS + opacity layering for depth (constraint 1), thicken structural strokes, and prefer filled shapes over `fill:'none'` outlines.
3. **Introduce typographic hierarchy.** Every quote line is the same 38px; promote line 1 to ~44-46px `font-weight 600`. A confident lead line is constraint (6)'s "strong typographic hierarchy" at near-zero cost.
4. **Use the already-derived `onAccent` token** (auto white/ink) to enable solid-accent chips/badges/footers — it exists in the palette and is currently unused by both files.
5. **`accentSoft` at 0.08-0.12 is too faint for fill motifs** (see quote-mark's ghost glyph). For tint CARDS keep ~0.06-0.10 (subtle background), but for decorative MOTIFS use full `accent` at `opacity:0.15-0.22` — much stronger read while staying 静谧.
6. **Promote `quote-card`** (orphaned, the strongest base) — either wire it in or add an enhanced `quote-card-accent` variant (constraint 4 allows ADD, forbids rename/delete).

## Caveats / Not Found

- No flagship preset consumes `quote-card`; confirmed via grep across `inkforge/src/services/export` (only test files reference it). It is opt-in only.
- Flagship SVG colors are brand-LOCKED to the preset's primaryColor (Kiln/Tempera/Amber); Inspector primaryColor override only recolors CSS, not SVG (themes.ts:79-82). Any enhancement using `palette.accent` automatically inherits the correct locked flagship color.
- `box-shadow` on `<section>` IS used by quote-card and is asserted WeChat-safe by the codebase (quotes.ts:265-279); other proposals here that touch `<section>` inline styles should still be re-validated against `wechat-safe.ts`/`assertWechatSafe` because that validator is the source of truth and was not re-read in this audit. Specifically verify `background-color`, `border-left`, `border-top`, `border-radius`, `padding` on `<section>` are not stripped by the project's own assertion (constraint 5 says WeChat keeps them; confirm the local validator agrees before implementing).
- I did not modify any code (research-only). Enhancements above are proposals; constraint (4) — no delete/rename of the 26 modules — is respected (all ideas ENHANCE existing or ADD new).
