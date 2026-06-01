# Research: Audit — covers.ts + badges.ts (WeChat inline-SVG typesetting)

- **Query**: For every exported module/function in `svg-modules/covers.ts` and `svg-modules/badges.ts`, document signature + flagship usage + exact emitted markup + blunt critique + 3-5 WeChat-safe enhancement ideas.
- **Scope**: internal (source audit) + design proposal
- **Date**: 2026-06-02

## Source files audited

| File Path | Role |
|---|---|
| `inkforge/src/services/export/svg-modules/covers.ts` | `cover-*` lead-in banner family (3 variants), `viewBox 1080×620` |
| `inkforge/src/services/export/svg-modules/badges.ts` | `badge-*` decorative chips (3 variants), `viewBox 1080×140` |
| `inkforge/src/services/export/svg-modules/primitives.ts` | atomic constructors (`rect`/`circle`/`path`/`textLine`/`diamond`/`svgSection`/`darkSafeBg`/`hairlineRule`) |
| `inkforge/src/services/export/svg-modules/theme.ts` | `deriveSvgPalette` — palette derivation |
| `inkforge/src/services/export/svg-modules/inject.ts` | `composeSvgDecorate` + `SvgInjectionPlan` (cover/headings/replaceHr/blockquote/endmark slots) |
| `inkforge/src/services/export/themes.ts` | flagship preset plans (`flagshipKilnPlan`/`flagshipTemperaPlan`/`flagshipAmberPlan`) at lines 87-117, presets at 1115-1211 |

### Palette facts (theme.ts) every proposal relies on

`deriveSvgPalette(primaryColor, persona)` produces (for flagship brand-locked colors):
- `ink = #1a1a1a`, `inkSoft = rgba(26, 26, 26, 0.55)`, `paper = #ffffff`, `paperWarm = #f7f4ef`, `hairline = rgba(26, 26, 26, 0.12)`, `ember = #c9362c`.
- `accent = '#' + normalizeHex(primaryColor)` → kiln `#d95b3f` / tempera `#3b7a6b` / amber `#c19a56`.
- `accentSoft = rgba(accent, softAlpha)` where `softAlpha = 0.12` for creative/lifestyle, **`0.08` for academic/business**. So tempera/amber soft fills are an extremely faint 8% wash — a primary cause of "plain/thin".
- `onAccent = relativeLuminance(accent) < 0.5 ? '#ffffff' : INK`. **Critical contrast finding:** kiln `#d95b3f` and tempera `#3b7a6b` are dark enough → `onAccent = #ffffff` (white text reads well). **Amber `#c19a56` is light → `onAccent = #1a1a1a` (ink).** Any "white text on solid accent bar" proposal must NOT hardcode white — use `palette.onAccent`, or amber bars get black text (which actually looks fine on amber). This is the #1 trap for solid-fill header bars.

### Flagship usage map (who calls what)

| Module | Used by flagship? | Where |
|---|---|---|
| `cover-grid` | **flagship-kiln** (creative, #D95B3F) | `flagshipKilnPlan.cover` (themes.ts:88) |
| `cover-title` | **flagship-tempera** (academic, #3B7A6B) AND **flagship-amber** (business, #C19A56) | `flagshipTemperaPlan.cover` (:99), `flagshipAmberPlan.cover` (:111) |
| `cover-quote` | **NOT used by any flagship plan** | registered only; manual/test invocation |
| `badge-num` / `badge-kpi` / `badge-tag` | **NONE used by any flagship plan** | `SvgInjectionPlan` has no `badge` slot (inject.ts:22-33) — registered + safety-tested but never auto-injected |

So today: covers appear once at article top; badges effectively never render in production output. That alone explains "no different from GitHub-markdown→WeChat."

---

# Part A — covers.ts

All three share `W=1080`, `H=620` and wrap via `svgSection({ moduleId, viewBoxW:1080, viewBoxH:620, body })` →
`<section data-ink-svg="<id>" style="margin:24px 0;"><svg xmlns=... viewBox="0 0 1080 620" width="100%" style="display:block;">…</svg></section>`.

Helper functions (file-local, not exported):
- `splitLines(text, maxCharsPerLine, maxLines)` — hard-cuts CJK by char count, `'…'` truncation on overflow. No `<tspan>`, intentional.
- `fitCharsPerLine(availableWidth, fontSize, letterSpacing=0)` — `floor(availableWidth / (fontSize + letterSpacing))`.

Exported surface: `coverModules: SvgModuleSpec[]` and `__renderers = { renderCoverTitle, renderCoverGrid, renderCoverQuote }`.

## A1. `renderCoverTitle(p: SvgModuleParams): string` → id `cover-title`

**Used by:** flagship-tempera (#3B7A6B, academic), flagship-amber (#C19A56, business).

**Exact markup emitted** (body, in order):
- `bg = darkSafeBg(1080, 620, palette.paperWarm)` → `<rect x="0" y="0" width="1080" height="620" fill="#f7f4ef" />`
- `topRule = hairlineRule({ x:80, y:96, width:200, height:2, fill: palette.accent })` → `<rect x="80" y="96" width="200" height="2" fill="<accent>" />` — a 200×2 accent tick.
- Title lines (`splitLines(title, fitCharsPerLine(920, 96, 2), 2)`, start y=270, lineH=116): each
  `<text x="80" y="270…" fill="#1a1a1a" font-size="96" font-weight="700" font-family='-apple-system, "PingFang SC", "Source Han Sans", sans-serif' letter-spacing="2">…</text>`
- Optional subtitle: `<text x="80" y="…+56" fill="rgba(26, 26, 26, 0.55)" font-size="30" font-weight="400" … letter-spacing="1">…</text>`
- `diamondMark = diamond(970, 528, 14, palette.accent)` → `<path d="M970,514 L984,528 L970,542 L956,528 Z" fill="<accent>" />` (single 14px diamond, bottom-right).
- `bottomRule = hairlineRule({ x:80, y:540, width:920, height:1, fill: palette.hairline })` → `<rect x="80" y="540" width="920" height="1" fill="rgba(26, 26, 26, 0.12)" />`.

**Blunt critique — why it looks plain/thin:**
- The ENTIRE composition is: one beige rectangle, two near-invisible hairlines (one is 12%-ink, basically gray fog), a 96px black title, gray subtitle, and a single 14px diamond the size of a fly. The accent color appears in exactly **two tiny places** (a 200×2 tick = 400px² and a 14px diamond). On a 1080×620 canvas that is <0.1% accent coverage. It reads as "default Word title page," not a designed press cover.
- Black title on beige with no color block = textbook markdown. There is zero "solid color block" — the single biggest lever per the brief.
- The diamond signature is so small it looks like a stray dot, not a brand mark. The bottom hairline at 12% ink is invisible on most screens.

**Enhancement ideas (WeChat-safe — solid fills + opacity, no defs/gradient/filter, transform via attribute only):**
1. **Solid accent side-rail + tinted backing.** Replace the lonely 200×2 tick with a confident full-height left rail: `<rect x="0" y="0" width="16" height="620" fill="<accent>" />`, and lay a solid tint panel behind the title block, e.g. `<rect x="80" y="170" width="760" height="300" fill="rgba(59,122,107,0.10)" />` (lightened accent = "tint card" from brief §3). This gives a real color zone without any gradient.
2. **Eyebrow kicker label on a filled chip.** Above the title add a small solid accent bar with `onAccent` text: `<rect x="80" y="150" width="180" height="44" rx="6" fill="<accent>" /><text x="170" y="180" fill="<onAccent>" font-size="24" font-weight="600" text-anchor="middle">序章 / 导读</text>`. Strong hierarchy cue (单读-style kicker). MUST use `palette.onAccent` (amber→ink).
3. **Stronger geometric signature (diamond cluster, not a fly).** Swap the 14px lone diamond for `diamondSig` (the existing `◇◇◇` primitive) or a larger 28px diamond plus two 10px companions, all `palette.accent`, anchored bottom-right — turns a stray dot into an intentional colophon.
4. **Index number / date motif as a large ghost numeral.** A big low-opacity accent numeral or vertical date in the right margin, e.g. `<text x="980" y="320" fill="rgba(59,122,107,0.14)" font-size="220" font-weight="700" text-anchor="middle">01</text>` — adds editorial depth/hierarchy with one solid color at low alpha (gradient-free "ghost layer").
5. **Footer wordmark band.** Replace the invisible 12%-ink bottom hairline with a thin solid accent rule `height=3 fill="<accent>"` plus a small `inkSoft` kicker ("InkForge · 墨铸") right-aligned — confident closure instead of fog.

## A2. `renderCoverGrid(p: SvgModuleParams): string` → id `cover-grid`

**Used by:** flagship-kiln (#D95B3F, creative).

**Exact markup emitted:**
- `bg = darkSafeBg(1080, 620, palette.paper)` → `<rect x="0" y="0" width="1080" height="620" fill="#ffffff" />` (pure white, NOT warm paper).
- Grid: padX=padY=80, innerW=920, innerH=460, cols=6, rows=4. 5 vertical 1px rects + 3 horizontal 1px rects + 4 border rects, **all** `fill="rgba(26, 26, 26, 0.12)"` (hairline). e.g. verticals `<rect x="80+c*153.3" y="80" width="1" height="460" fill="rgba(26, 26, 26, 0.12)" />`.
- `accentDot = circle({ cx: 386.6, cy: 195, r: 8, fill: palette.accent })` → `<circle cx="386.66…" cy="195" r="8" fill="<accent>" />` (one 8px dot at the col2×row1 intersection).
- Title (`splitLines(title, fitCharsPerLine(896, 84, 2), 2)`, x=104, startY=310, lineH=104): `<text x="104" y="310…" fill="#1a1a1a" font-size="84" font-weight="700" … letter-spacing="2">…</text>`
- Optional subtitle: `<text x="104" y="…+48" fill="rgba(26, 26, 26, 0.55)" font-size="28" font-weight="400" … letter-spacing="1">…</text>`

**Blunt critique — why it looks plain/thin:**
- It's a white page with a faint 12%-ink graph-paper grid and a single 8px accent dot. On most phone screens at 100% width the grid lines are sub-pixel gray and nearly vanish — so it degrades to "white page, black title, one tiny dot." That is *less* designed than cover-title (which at least has warm paper).
- The kiln brand is fiery, energetic creative red — yet this cover shows **one 8px dot** of it. Massive missed brand statement.
- The grid is decorative noise that the brief explicitly warns against ("geometric decoration as signature, not full texture") yet provides no hierarchy, no color zone, no focal mass.

**Enhancement ideas (WeChat-safe):**
1. **Fill a grid cell as a solid accent "module" block.** Instead of just dotting an intersection, paint one or two whole grid cells solid: `<rect x="80" y="80" width="153.3" height="115" fill="<accent>" />` (top-left module) — instantly turns graph paper into a Constructivist poster. Place the kicker/number in `onAccent` inside it.
2. **Tint band behind the title.** Lay a solid accent-tint row over the title rows: `<rect x="80" y="270" width="920" height="180" fill="rgba(217,91,63,0.10)" />` under the 84px title (creative softAlpha is already 0.12, so even `palette.accentSoft` works as a real visible wash for kiln).
3. **Warm the canvas + thicken grid hierarchy.** Switch `palette.paper` → `palette.paperWarm` for consistency with the other covers, and make one "major" axis line solid accent at 2-3px (`fill="<accent>"`) while keeping minors at hairline — gives the grid a focal cross instead of uniform fog.
4. **Accent corner registration marks.** Replace the single dot with 3-4 small solid accent squares/diamonds at grid nodes (8-12px) forming an asymmetric Constructivist rhythm — reads as intentional composition, not a stray pixel.
5. **Bold numeral in a corner cell.** A large accent numeral ("01"/issue no.) seated inside a solid or tinted corner cell adds the editorial issue-number hierarchy that top design accounts use.

## A3. `renderCoverQuote(p: SvgModuleParams): string` → id `cover-quote`

**Used by:** NONE (registered but no flagship plan references it).

**Exact markup emitted:**
- `bg = darkSafeBg(1080, 620, palette.paperWarm)` → `<rect ... fill="#f7f4ef" />`.
- Two quote-mark blocks via `quoteBlock(x,y)`, each a single `<path>` filled `palette.accentSoft`:
  `quote1` at (140,120), `quote2` at (270,120). blockW=70, blockH=84. Path `d="M140,120 L210,120 L210,166.2 L171.5,204 L154,199.8 L178.5,166.2 L140,166.2 Z"` `fill="<accentSoft>"`.
- Quote lines (`splitLines(title, fitCharsPerLine(800, 48, 2), 4)`, x=140, startY=300, lineH=70): `<text x="140" y="300…" fill="#1a1a1a" font-size="48" font-weight="500" font-family='… "Songti SC", serif' letter-spacing="2">…</text>`
- `rule = hairlineRule({ x:140, y:ruleY, width:80, height:2, fill: palette.accent })` → 80×2 accent tick.
- Optional attribution: `<text x="240" y="ruleY+10" fill="rgba(26, 26, 26, 0.55)" font-size="26" … letter-spacing="1">— …</text>`

**Blunt critique — why it looks plain/thin:**
- The hero element — the giant quotation marks — is filled with `accentSoft`, i.e. an 8-12% wash of accent. On warm paper that is a barely-there pale smudge; the "big quote" gesture is wasted because it's nearly invisible. It looks like a print error, not a design flourish.
- Apart from one 80×2 accent tick, there is again zero solid color, zero card, zero hierarchy beyond font size. It's a serif paragraph on beige.
- Two identical comma-blocks 130px apart read as one weird shape, not as a typographic opening quote.

**Enhancement ideas (WeChat-safe):**
1. **Tinted quote card with solid accent left-border.** Wrap the quote text in a solid tint panel with a thick accent left rail: `<rect x="100" y="260" width="880" height="220" fill="rgba(59,122,107,0.08)" /><rect x="100" y="260" width="10" height="220" fill="<accent>" />`. This is the canonical "tinted quote card / key-sentence highlight" from the brief — the single highest-impact change.
2. **Make the quotation mark a confident solid accent glyph.** Render the big quote path in `palette.accent` (or a strong `rgba(accent,0.85)`), larger (e.g. blockH≈120), so it reads as an intentional oversized opening quote — the literary-account signature.
3. **Solid accent attribution chip.** Replace the 80×2 tick + gray "— name" with a small solid accent underline rule (3px) and the attribution in accent color, or seat the byline in a small `onAccent`-on-`accent` chip for a designed colophon.
4. **Wire it into a flagship plan.** It is currently dead. Recommend the academic/tempera or a new literary flagship use `cover-quote` (or add it as an opt-in cover) so the work isn't wasted.
5. **Add an accent serif "drop" or vertical rule.** A thin full-height accent vertical rule at x≈100 anchoring the quote (Constructivist editorial bar) gives strong left-edge hierarchy that pairs with the serif body.

---

# Part B — badges.ts

Shared: `VBW=1080`, `VBH=140`, `CY=70`, `FONT_STACK = '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'`. Each renderer wraps body through local `safe(out)` → `assertWechatSafe(out)` then `svgSection({ moduleId, viewBoxW:1080, viewBoxH:140, body })`.

Exported surface: `badgeModules: SvgModuleSpec[]` (3 specs). **No `__renderers` export here.**

**Production reality (applies to ALL three):** `SvgInjectionPlan` (inject.ts:22-33) only has `cover`/`headings`/`replaceHr`/`blockquote`/`endmark` slots — **there is no badge injection path**, so none of these ever appear in flagship output. They pass `assertWechatSafe` in tests and are otherwise dead. Any enhancement should be paired with a way to actually surface them (new plan slot, or repurposing as header/callout building blocks).

## B1. `renderBadgeNum(p): string` → id `badge-num`

**Used by:** none (registry/tests only).

**Exact markup:** circle + number, optional right label.
- `circle({ cx, cy:70, r:36, fill: palette.accent })` → `<circle cx="<380 or 540>" cy="70" r="36" fill="<accent>" />` (cx=380 if label present else 540 center).
- Number `<text x="<cx>" y="70+numFont*0.34" fill="<onAccent>" font-size="<44|38|32>" font-weight="600" font-family=FONT_STACK text-anchor="middle">N</text>` (font shrinks by digit count).
- Optional label `<text x="cx+64" y="84" fill="#1a1a1a" font-size="38" font-weight="500" … text-anchor="start" letter-spacing="1">…</text>`.

**Blunt critique:** A single 72px solid accent circle with a number, plus black label text floating on transparent background. The circle is the only colored object on an otherwise empty 1080×140 band; the label sits on nothing (no card), so it reads as a loose bullet. Fine as a list bullet, but as a standalone "badge" section it's sparse and unanchored — and it never renders anyway.

**Enhancements (WeChat-safe):**
1. **Tinted pill backing behind the whole row.** Add `<rect x="320" y="30" width="<dynamic>" height="80" rx="40" fill="rgba(accent,0.08)" />` so number-circle + label live inside one tinted capsule — instant "designed section divider / step marker."
2. **Step connector rule** to the next item: a thin solid accent rule trailing the circle, so a sequence of badge-num reads as numbered steps (新世相-style numbered narrative).
3. **Two-tone label hierarchy:** label in `ink` with an `inkSoft` sub-caption beneath, raising it from "bullet" to "section heading + dek."
4. **Surface it:** add an `orderedListMarker`/`stepMarker` injection slot, or reuse this geometry inside `header-badge-num` styling so the work is visible.

## B2. `renderBadgeKpi(p): string` → id `badge-kpi`

**Used by:** none (registry/tests only).

**Exact markup:** rounded-rect card + top hairline + big value + small sub.
- `rect({ x:360, y:15, width:360, height:110, rx:14, ry:14, fill: palette.accentSoft, stroke: palette.accent, strokeWidth:1 })` → `<rect x="360" y="15" width="360" height="110" rx="14" ry="14" fill="<accentSoft>" stroke="<accent>" stroke-width="1" />`.
- Top hairline `<rect x="384" y="41" width="312" height="1" fill="rgba(26, 26, 26, 0.12)" />`.
- Value `<text x="540" y="<67 or 39+...>" fill="<accent>" font-size="48" font-weight="600" … text-anchor="middle" letter-spacing="1">…</text>`.
- Optional sub `<text x="540" y="103" fill="rgba(26, 26, 26, 0.55)" font-size="22" font-weight="400" … text-anchor="middle" letter-spacing="2">…</text>`.

**Blunt critique — the core "thin" exemplar:** This is the brief's complaint incarnate. The card fill is `accentSoft` = **8% accent for business/academic** — on white that is almost indistinguishable from the page; combined with a **1px** accent stroke and a 12%-ink hairline, the whole card is a faint outline. A 48px accent number on a near-white card with a 1px border = the definition of "thin." Top-tier accounts use *solid* KPI tiles, not 8% washes with hairline borders.

**Enhancements (WeChat-safe):**
1. **Solid accent KPI tile** (highest impact): fill the card `fill="<accent>"`, value + sub in `palette.onAccent` (white for kiln/tempera, ink for amber). Drop the 1px stroke. One confident solid tile beats a faint outline.
2. **If keeping light card, make the tint real:** use a fixed stronger tint (e.g. `rgba(accent,0.14-0.16)`) independent of the 8% persona alpha, and thicken the accent to a **left-border block** (`<rect ... width="8" fill="<accent>" />`) instead of a 1px outline → reads as a designed stat card.
3. **Value/label hierarchy split:** value in `accent` bold + unit in `inkSoft` smaller; label as an `onAccent`/`ink` caption — two-tier hierarchy instead of one centered number.
4. **Multi-tile row:** support 2-3 KPI tiles side by side (still solid fills) for a real "data strip," which is a hallmark of premium business accounts.
5. **Surface it** via a new injection path (e.g. a fenced `:::kpi` block → badge-kpi) so it stops being dead code.

## B3. `renderBadgeTag(p): string` → id `badge-tag`

**Used by:** none (registry/tests only).

**Exact markup:** pill + centered label.
- `rect({ x, y:38, width:tagW, height:64, rx:32, ry:32, fill: palette.accentSoft, stroke: palette.hairline, strokeWidth:1 })` → `<rect x="<center>" y="38" width="<≥140>" height="64" rx="32" ry="32" fill="<accentSoft>" stroke="rgba(26, 26, 26, 0.12)" stroke-width="1" />` (tagW = max(140, charCount*32 + 72)).
- Label `<text x="540" y="84" fill="<accent>" font-size="32" font-weight="500" … text-anchor="middle" letter-spacing="2">…</text>`.

**Blunt critique:** An 8%-accent-fill pill with a **12%-ink (gray) border** and accent text. The gray hairline border clashes with the accent text and makes it look like a disabled/ghost button, not a confident tag. It's the weakest of the three: faint fill + gray outline + thin text. Centered alone on a 1080×140 band it floats in a sea of whitespace.

**Enhancements (WeChat-safe):**
1. **Solid accent pill** with `onAccent` text — a real tag/label chip (the 单读 section-label look). Or, for a lighter touch, keep tint fill but switch the border from gray hairline to **solid accent** (`stroke="<accent>"`) so border and text agree.
2. **Left dot / category motif:** prepend a small solid accent `<circle r="6">` inside the pill before the text → "category tag" semantics, stronger than bare text.
3. **Tag row + section rule:** allow multiple tags left-aligned (not lonely-centered) above a hairline, forming a real "topics" strip; pairs with a section header.
4. **Use it as the eyebrow/kicker primitive** for the cover/header enhancements above (A1.2, A2.5) so one safe pill component is reused everywhere.
5. **Surface it** (tag slot or inline `#tag` → badge-tag) so it renders in production.

---

## Cross-cutting recommendations (the real fix)

1. **Stop hiding behind `accentSoft`/8% washes and 1px strokes.** The dominant "thin" signature across BOTH files is: faint 8-12% tint + 1-2px lines + 12%-ink hairlines (effectively invisible). The brief's KEY LEVER is solid-color block containers — adopt solid accent fills (`fill="<accent>"` with `palette.onAccent` text) and solid tint panels (`rgba(accent, 0.08-0.16)` as visible cards), and replace 1px outlines with 6-10px solid side-rails.
2. **`palette.onAccent` is mandatory for any text-on-solid-accent.** Amber `#c19a56` resolves `onAccent=#1a1a1a` (ink), kiln/tempera resolve white. Never hardcode `#fff` on accent bars or amber breaks.
3. **All proposed enhancements are WeChat-safe by construction:** they use only `<rect>` (incl. `rx`/`ry`/solid `fill`/`opacity`), `<circle>`, `<path>`, `<text>` with hex/rgba fills — no `<defs>`, gradients, `clipPath`, `mask`, `filter`, `<use>`, `url(#…)`, no `style="transform:"`. Any rotation uses the `transform="…"` XML attribute (already supported by `rect`/`path` primitives). All would still pass `assertWechatSafe`.
4. **No deletions/renames needed** — every idea ENHANCES an existing renderer's `body` or ADDS a sibling helper/variant. Two new shared primitives would unlock most of it cleanly: a `tintPanel(x,y,w,h,accent,alpha)` (solid rgba rect) and a `solidChip(x,y,w,h,fill,onAccent,text)` (eyebrow/kicker pill).
5. **Wire up dead modules.** `cover-quote` and all 3 badges never render in flagship output. Either add injection slots (badge/kpi/tag/step) or reuse their geometry as building blocks for cover/header upgrades, otherwise the visual work is invisible.

## Caveats / Not Found

- No flagship plan injects badges (no badge slot in `SvgInjectionPlan`) — confirmed via grep; badges only appear in `__tests__/badges.test.ts`. If product intends badges to show, that is a separate wiring task.
- Brand `#f7f4ef`/`#1a1a1a`/`inkSoft` confirmed in theme.ts; `ember #c9362c` (token) differs slightly from the brief's stated `#D95B3F` kiln — kiln is the *accent/primaryColor*, ember is a separate brand red token used elsewhere (endmarks). Don't conflate the two in proposals.
- I did not measure on-device rendering; pixel "invisibility" claims for 12%-ink hairlines and 8% tints are reasoned from alpha values, not screenshots.
