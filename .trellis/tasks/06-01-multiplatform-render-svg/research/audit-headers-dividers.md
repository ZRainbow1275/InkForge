# Research: WeChat inline-SVG audit — headers.ts + dividers.ts

- **Query**: Audit every exported module in `svg-modules/headers.ts` + `dividers.ts`. Document signature, flagship usage, EXACT emitted markup (colors/viewBox/fills/stroke/font sizes), blunt "why it's plain" critique + 3-5 WeChat-safe enhancement ideas.
- **Scope**: internal
- **Date**: 2026-06-02

---

## 0. Shared context (read before per-module sections)

### Files in play

| File Path | Role |
|---|---|
| `inkforge/src/services/export/svg-modules/headers.ts` | 4 header modules (audited) |
| `inkforge/src/services/export/svg-modules/dividers.ts` | 5 divider modules (audited) |
| `inkforge/src/services/export/svg-modules/primitives.ts` | `rect/circle/path/textLine/hairlineRule/glow/diamondSig/svgSection` atoms every module emits through |
| `inkforge/src/services/export/svg-modules/theme.ts` | `deriveSvgPalette()` — what `pal.*` resolves to at runtime |
| `inkforge/src/services/export/svg-modules/types.ts` | `SvgPalette`, `SvgModuleParams`, `SvgModuleSpec` |
| `inkforge/src/services/export/themes.ts` | flagship plans (`flagshipKilnPlan` / `TemperaPlan` / `AmberPlan`) wire module IDs to presets |
| `inkforge/src/services/export/svg-modules/inject.ts` | `composeSvgDecorate()` does the `<hN>`/`<hr>`/`<blockquote>` → module replacement |

### Runtime palette (from `deriveSvgPalette`, theme.ts:62-81)

`accent` = the preset's locked brand hex. The three flagships pass these fixed values (themes.ts:83-85):

| Flagship | preset id | persona | `pal.accent` | `pal.onAccent` | `pal.accentSoft` (softAlpha) |
|---|---|---|---|---|---|
| Kiln | `flagship-kiln` | creative | `#D95B3F` (kiln) | `#ffffff` (lum<0.5) | `rgba(217,91,63,0.12)` |
| Tempera | `flagship-tempera` | academic | `#3B7A6B` (tempera) | `#ffffff` | `rgba(59,122,107,0.08)` |
| Amber | `flagship-amber` | business | `#C19A56` (amber) | `#ffffff` | `rgba(193,154,86,0.08)` |

Other resolved tokens (constant across flagships):
- `pal.ink` = `#1a1a1a`
- `pal.inkSoft` = `rgba(26, 26, 26, 0.55)`
- `pal.paper` = `#ffffff`
- `pal.paperWarm` = `#f7f4ef` (warm paper — **currently never used by any header/divider module**)
- `pal.ember` = `#c9362c` (only `divider-forge` uses it)
- `pal.hairline` = `rgba(26, 26, 26, 0.12)`
- `softAlpha` = 0.12 for creative/lifestyle, 0.08 for academic/business

> `softAlpha`/`accentSoft` is the *only* tint the system currently derives, and only `divider-forge` consumes it. **There is no header/divider module today that paints a solid tint card** (`rgba(accent,0.06-0.10)` block) — that is the headline gap (see Constraint 5 in the task brief).

### Flagship usage map (themes.ts:87-117) — WHO USES WHAT

| Module ID | flagship-kiln (creative) | flagship-tempera (academic) | flagship-amber (business) |
|---|---|---|---|
| `header-badge-num` | — | — | — **(registered but UNUSED by every flagship)** |
| `header-bracket` | — | H2 | — |
| `header-ribbon` | H2 | — | — |
| `header-vrule` | H3 | H3 | **H2 (this is Amber's ONLY heading style — both H2+H3 collapse to vrule)** |
| `divider-grid` | — | — | `<hr>` |
| `divider-dots` | — | — | — **(registered but UNUSED)** |
| `divider-fade` | — | — | — **(registered but UNUSED)** |
| `divider-diamond` | — | `<hr>` | — |
| `divider-forge` | `<hr>` | — | — |

**Findings worth flagging up front:**
- 3 of the 9 modules (`header-badge-num`, `divider-dots`, `divider-fade`) ship dead — they pass tests but no preset wires them. They are free real estate to repurpose into the missing premium block containers without touching live presets.
- Amber is the weakest visually: a single `header-vrule` for *both* H2 and H3 means no heading hierarchy at all (H2 and H3 render identically).
- Headings/dividers are injected by **replacing the entire `<hN>`/`<hr>`** (inject.ts:98-116) with a standalone `<section><svg>…`. So each is a self-contained block — we can freely make them taller / add a backing `<rect>` band without disturbing surrounding flow.

### Hard safety facts confirmed in code (constraints 1-2)

- `svgSection()` (primitives.ts:173-181) wraps every module in `<section data-ink-svg="id" style="margin:24px 0;"><svg viewBox="0 0 W H" width="100%" style="display:block;">…</svg></section>`. Note: **the `<section>` style is currently ONLY `margin:24px 0`** — `background`/`border`/`padding`/`border-radius` are never set, despite WeChat keeping all of them. This is the single biggest lever and is sitting unused.
- `transform` is only ever emitted as an XML attribute (`rect`/`path` opts), never as CSS `style="transform:"`. Safe. `diamond()` (primitives.ts:144) deliberately builds the 45° rhombus via a `<path>` `M…L…Z`, not a rotate transform — keep that pattern for any new motif.
- No `<defs>/<linearGradient>/<radialGradient>/clipPath/mask/filter/<use>/url(#…)` anywhere. `glow()` (primitives.ts:109) is a big low-opacity `<circle>` standing in for a filter. The "fade" divider fakes a gradient with stepped-opacity solid rects. All proposals below preserve this.
- No emoji anywhere; all motifs are `<circle>/<rect>/<path>`. Keep it.

---

## 1. headers.ts — module-by-module

Shared constant: `VBW = 1080` (logical width; renders at `width="100%"`). `CJK_DISPLAY = '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'`.

### 1.1 `renderBadgeNum` → id `header-badge-num`

- **Signature**: `renderBadgeNum(p: SvgModuleParams): string`. Reads `p.text` (title), `p.index` (badge number, defaults to 1). `viewBoxH = 180`.
- **Used by**: **NONE** (no flagship plan references it; registered at headers.ts:187 and tested only).
- **Exact markup emitted** (headers.ts:36-58):
  - `circle({ cx: 90, cy: 90, r: 50, fill: pal.accent })` — one solid 100px-diameter accent disc, top-left.
  - number `<text>` at `x:90, y:90+numSize/3`, `fill: pal.onAccent`, `fontSize` 44 (1 digit) / 40 (2) / 32 (3+), `fontWeight:700`, anchor middle.
  - title `<text>` at `x:180, y:108`, `fill: pal.ink`, `fontSize:52`, `fontWeight:600`, `letterSpacing:1`.
  - `hairlineRule({ x:180, y:152, width:860, fill: pal.hairline })` — a single **1px** `rgba(26,26,26,0.12)` line under the title.
- **Why it looks plain/thin**: The only "ink" on the page is one accent circle + a 1px near-invisible hairline (12% black). The title sits on bare white. Everything to the right of the badge is empty. It reads like a numbered list item, not a section header. The hairline at 0.12 opacity is essentially invisible on phone screens.
- **Enhancements (WeChat-safe)**:
  1. **Solid backing band**: add a full-width `rect({x:0,y:30,width:1080,height:120,fill: rgba(accent,0.06)})` *behind* the badge+title so the header reads as a tinted plate (solid lightened accent, no gradient). Keeps the disc as the focal point.
  2. **Promote the hairline to an accent under-rule**: replace the 1px `pal.hairline` with a 3px `pal.accent` rule only under the title's text width, plus a 1px hairline continuing to the edge — two-weight rule = stronger hierarchy.
  3. **Index motif inside the disc**: ring the number with a 2px `pal.onAccent` `circle` (`fill:none, stroke`) inset by 8px — gives the badge a "minted seal" depth instead of a flat dot.
  4. **Wire it as Amber's H2** so Amber finally has H2≠H3 hierarchy (currently both are vrule). The numbered-badge persona fits "business".
  5. **Eyebrow line**: add a small `pal.inkSoft` 16px letter-spaced kicker (e.g. section family) above the title using `centeredLabel`-style text, anchored at `x:180`.

### 1.2 `renderBracket` → id `header-bracket`

- **Signature**: `renderBracket(p): string`. Reads `p.text`. `viewBoxH = 220`.
- **Used by**: **flagship-tempera** as H2 (themes.ts:101).
- **Exact markup** (headers.ts:69-101):
  - Four L-shaped corner brackets via `bracketCorner()`, each a `<path d="M{x+dx*len},{y} L{x},{y} L{x},{y+dy*len}">` with `stroke: pal.accent, strokeWidth: 4 (sw), strokeLinecap:'square', fill:'none'`, `len=60`. Inner corners inset 40px (`left=40, right=1040, top=40, bot=180`).
  - centered title `<text>` at `x:540, y:128`, `fill: pal.ink`, `fontSize:56`, `fontWeight:600`, `letterSpacing:2`, anchor middle.
- **Why it looks plain/thin**: Four 4px hairline corners around white space. At phone scale a 4px stroke on a 1080-unit viewBox is ~1.4px — wispy. The enclosed region is empty white, so it reads as "title in a barely-there frame." The 60px corner length on a 1080-wide box is proportionally tiny. No fill, no color mass — the accent appears only as four thin ticks.
- **Enhancements (WeChat-safe)**:
  1. **Tint the enclosed plate**: drop a `rect({x:40,y:40,width:1000,height:140,fill: rgba(accent,0.05)})` inside the brackets — turns the empty frame into a designed card while keeping the constructivist corner language.
  2. **Thicken + lengthen brackets**: `sw` 4→7, `len` 60→96. On phones a 7px stroke (~2.3px) is the minimum to read as "intentional".
  3. **Two-tone corners**: paint the horizontal arm `pal.accent` and the vertical arm `pal.ink` (or vice-versa) by splitting `bracketCorner` into two `<path>`s — adds editorial sophistication without gradients.
  4. **Anchor dot**: a tiny `circle(r:5, fill: pal.accent)` at each inner corner point gives the brackets a "pinned" precision look (single extra atom each).
  5. **Title eyebrow**: small letter-spaced `pal.inkSoft` kicker centered above the title (room exists in the 220-tall box), e.g. an H2 ordinal, to add hierarchy.

### 1.3 `renderRibbon` → id `header-ribbon`

- **Signature**: `renderRibbon(p): string`. Reads `p.text`. `viewBoxH = 180`.
- **Used by**: **flagship-kiln** as H2 (themes.ts:90). This is the *only* solid-fill header in the system today and the closest thing to "premium block".
- **Exact markup** (headers.ts:121-133):
  - `rect({ x:24, y:40, width:1032, height:100, fill: pal.accent })` — solid full-width-ish accent bar (24px side margins, 40px top/bottom air).
  - title `<text>` centered at `x:540, y:96`, `fill: pal.onAccent` (#fff), `fontSize:48`, `fontWeight:600`, `letterSpacing:2`, anchor middle.
- **Why it looks plain/thin**: It's a flat rectangle with centered white text — the most "template" of the four (square corners, dead-centered text = generic banner). No corner radius, no inset detail, no anchor element. On Kiln (#D95B3F) it's a strong color slab but visually it's exactly the "h2-block-ribbon" recipe that the brief calls out as the plain baseline. The 100px bar on a 180 box wastes 80px of vertical air.
- **Enhancements (WeChat-safe)**:
  1. **Left-aligned title + leading mark**: move text to `anchor:start, x:64` and add a small `pal.onAccent` motif (a 4px-wide × 40px tall `rect` or a small diamond) before it — turns a centered banner into an editorial masthead.
  2. **Layered ribbon depth**: keep the solid `pal.accent` bar, then overlay a thin `rect(height:6, fill: rgba(255,255,255,0.18))` along its top edge as a "highlight lip" — a fake bevel using opacity layering, fully safe.
  3. **Corner radius on the section, not the rect**: set the wrapping `<section style="…border-radius">` via a `sectionStyle` override (WeChat keeps border-radius) OR add `rx:4` to the `rect`. Soft corners instantly de-template the slab.
  4. **Notch/tab motif**: append a small `pal.ink` or darker-accent `rect` tab hanging below the bar's left end (a "filing tab"), giving the ribbon a printed-index character — distinctive, not 微商.
  5. **Subtitle support**: ribbon ignores `p.subtitle`; add an optional second `<text>` line in `pal.onAccent` at reduced opacity for a kicker/section number.

### 1.4 `renderVRule` → id `header-vrule`

- **Signature**: `renderVRule(p): string`. Reads `p.text` + **`p.subtitle`** (the only header that supports a subtitle). `viewBoxH` = 200 if subtitle else 160; bar height flexes 130/90.
- **Used by**: **flagship-kiln H3**, **flagship-tempera H3**, **flagship-amber H2 (its only heading)** — the most-used, most load-bearing header. Effectively the system's default heading.
- **Exact markup** (headers.ts:155-178):
  - `rect({ x:60, y:barY, width:6, height:barH, fill: pal.accent })` — a **6px-wide** vertical accent bar (90px or 130px tall).
  - title `<text>` at `x:100, y:titleY`, `fill: pal.ink`, `fontSize:50`, `fontWeight:600`, `letterSpacing:1`, anchor start.
  - optional subtitle `<text>` at `x:100, y:titleY+50`, `fill: pal.inkSoft` (55% black), `fontSize:28`, `fontWeight:400`.
- **Why it looks plain/thin**: This *is* the "border-left + title" markdown look the user complained about — it's literally the H2 default WeChat blockquote/heading cliché rendered in SVG. A 6px bar (~2px on phone) + black title on white. Because all three flagships lean on it (Amber for BOTH levels), the entire flagship family's body reads as "GitHub-md → WeChat." The accent appears as a single thin stick. Zero background mass.
- **Enhancements (WeChat-safe)** — highest priority since it's the most-used:
  1. **Tint card behind title** (the core lever): wrap title+subtitle in a `rect({x:48,y:…,width:992,height:barH+24,fill: rgba(accent,0.06)})` with the 6px bar flush on its left edge → instantly reads as a designed section plate, not a bare heading. This single change lifts all three flagships.
  2. **Widen + cap the bar**: 6px→10px, and/or make it a short solid block with a 3px `pal.ink` foot, or top it with a small accent square — give the rule a terminal so it isn't a naked stick.
  3. **Two-tier bar for level distinction**: H2 = full tint card + 10px bar; H3 = bar only (current look). Encode level via `p.variant`, so Amber regains H2≠H3 hierarchy.
  4. **Numeric/ordinal chip**: optional small `pal.accent` square with `pal.onAccent` index to the left of the bar when `p.index` present — ties header family together with badge-num.
  5. **Subtitle as eyebrow above title**: flip the subtitle to sit *above* the title in letter-spaced `pal.inkSoft` caps (kicker pattern) — stronger editorial hierarchy than a sub-line below.

---

## 2. dividers.ts — module-by-module

Shared constants: `VBW = 1080`, `VBH = 60` (all dividers are 60 tall). Helper `centeredLabel(text,y,fill)` (dividers.ts:22-36) emits an optional centered 16px / `letterSpacing:4` / `opacity:0.7` label in a sans stack — used by ALL five via `p.text`.

### 2.1 `renderGrid` → id `divider-grid`

- **Signature**: `renderGrid(p): string`. Uses `hairline, ink, accent`. Optional `p.text` label.
- **Used by**: **flagship-amber** `<hr>` (themes.ts:114).
- **Exact markup** (dividers.ts:40-66):
  - baseline `hairlineRule({x:280,y:30,width:520,fill: hairline})` (1px, 12% black).
  - tick loop: `rect(x, y:26, width:1, height:8, fill: ink, opacity:0.35)` every 80px (7 ticks).
  - one long accent tick `rect(x:longX, y:16, width:1, height:28, fill: accent)`.
  - optional `centeredLabel` at `y:60`.
- **Why it looks plain/thin**: Everything is **1px wide** at 35% or 12% opacity — on a phone this is a faint gray smudge with one barely-darker accent hair. The "grid/ruler" concept is sound but the execution is sub-pixel. The accent tick (1px, full opacity) is the only visible thing and it's a single hair.
- **Enhancements (WeChat-safe)**:
  1. **Thicken ticks**: minor ticks `width:1→2, height:8→10, opacity:0.35→0.5`; long accent tick `width:1→4, height:28→34`. Make the ruler legible.
  2. **Accent baseline segment**: paint the central ~120px of the baseline in solid `pal.accent` (a second short `rect`) so the line has a colored heart, not just one tick.
  3. **Anchor squares**: cap both baseline ends with small `pal.ink` squares (`rect 4×4`) for a drafted/measured look.
  4. **Numbered tick**: under the long accent tick, a tiny `pal.accent` index digit (constructivist measurement vibe) — distinctive, on-brand.

### 2.2 `renderDots` → id `divider-dots`

- **Signature**: `renderDots(p): string`. Uses `hairline, ink, accent`. Optional `p.text`.
- **Used by**: **NONE** (registered dividers.ts:193, unused).
- **Exact markup** (dividers.ts:71-93): five circles at gap 22 — `r:2 fill:hairline` (outer), `r:3 fill:ink opacity:0.4` (mid), `r:4 fill:accent` (center), mirrored. Optional label at `y:60`.
- **Why it looks plain/thin**: Five tiny dots (max r=4 ≈ 2.8px on phone) clustered in the dead center of a 1080-wide band — 99% of the width is empty. Reads as an afterthought. The graduated opacity is invisible at this size.
- **Enhancements (WeChat-safe)**:
  1. **Scale up + connect**: r 2/3/4 → 4/5/7, and run a faint `hairlineRule` through them so the dots punctuate a line rather than float.
  2. **Diamond center**: swap the center circle for a `diamond()` in `pal.accent` (reuse the brand rhombus from `diamondSig`) — ties dots into the brand-signature language.
  3. **Repurpose as a "section break" tint pill**: since it's unused, redefine as a small centered `rect` pill (`rx`, `fill: rgba(accent,0.08)`) holding three dots — a tinted token divider, filling the premium-container gap.
  4. **Asymmetric rhythm**: widen gaps outward (22/34/22) for a more musical cadence instead of even spacing.

### 2.3 `renderFade` → id `divider-fade`

- **Signature**: `renderFade(p): string`. Uses `ink` only. Optional `p.text`.
- **Used by**: **NONE** (registered dividers.ts:199, unused).
- **Exact markup** (dividers.ts:99-118): 21 segments, each `rect(width:24, height:1, fill: ink, opacity = 0.85*(1-d))` where `d` = normalized distance from center; segments with op≤0.02 skipped; 2px gaps. A stepped-opacity fake gradient line, peak 0.85 black at center.
- **Why it looks plain/thin**: It's a **1px-tall** dotted-fade hairline in plain black — no brand color at all (uses `ink`, never `accent`). At phone scale it's a faint dashed gray line. Conceptually clever (gradient without `<linearGradient>`) but visually the thinnest element in the whole system.
- **Enhancements (WeChat-safe)**:
  1. **Accent-tint the fade**: render segments in `pal.accent` instead of `ink` (or alternate accent/ink) so the brand color participates.
  2. **Thicken to a tapered bar**: height 1→3, and additionally taper segment *height* with distance (center segs 4px, ends 1px) for a true lens/blade shape — far richer than opacity-only.
  3. **Center keystone**: place a solid `pal.accent` diamond or 6px square at the exact center where the fade peaks — gives the eye an anchor.
  4. **Repurpose as a quiet full-bleed rule**: since unused, make it a near-full-width (e.g. 900px) tapered fade as the "chapter break" divider — distinct role from the short `dots`/`diamond`.

### 2.4 `renderDiamond` → id `divider-diamond`

- **Signature**: `renderDiamond(p): string`. Uses `accent, hairline`. Optional `p.text`.
- **Used by**: **flagship-tempera** `<hr>` (themes.ts:104).
- **Exact markup** (dividers.ts:132-153):
  - `diamondSig({cx:540, cy:30, r:5, fill: accent, gap:15})` → three `<path>` rhombuses (◇◇◇) in solid accent, ~50px cluster.
  - two `hairlineRule` (1px, 12% black) flanking: left `x:80,width:360`; right `x:600,width:360`.
  - optional label at `y:60`.
- **Why it looks plain/thin**: The signature diamonds are only r=5 (~3.5px on phone) and the flanking rules are 1px at 12% — so it's three tiny accent specks between two ghost lines. The brand-signature idea is the strongest concept here but it's rendered too small/faint to register as "designed."
- **Enhancements (WeChat-safe)**:
  1. **Enlarge + weight the center diamond**: make the middle rhombus r=9 solid accent and the two flankers r=5 (creating a hierarchy within the signature) rather than three equal specks.
  2. **Promote flanking rules**: 1px→2px and lift opacity, OR taper them (reuse the fade technique) toward the diamonds so the line "points at" the mark.
  3. **Outlined + filled pairing**: center diamond solid `pal.accent`, side diamonds `fill:none, stroke: pal.accent` (outline) — refined two-state motif, very 单读/新世相.
  4. **Inkframe**: a thin `pal.ink` 1px diamond outline around the center accent diamond for a "set stone" look.

### 2.5 `renderForge` → id `divider-forge`

- **Signature**: `renderForge(p): string`. Uses `ember, accentSoft, hairline`. Optional `p.text`. **This is the only header/divider module that touches `pal.ember`** (the locked kiln-red, ≤2/screen rule).
- **Used by**: **flagship-kiln** `<hr>` (themes.ts:93).
- **Exact markup** (dividers.ts:159-181):
  - `glow(540, 30, 18, accentSoft)` — a low-opacity r=18 circle in `rgba(accent,0.12)` (fake halo).
  - `emberDot = circle({cx:540, cy:30, r:3, fill: ember})` — a 3px ember-red dot (the single ember use).
  - two `hairlineRule` (1px, 12%): left `x:120,width:380`; right `x:580,width:380`.
  - optional label at `y:60`.
- **Why it looks plain/thin**: The "forge ember" — the most emotionally on-brand divider — is a **3px red dot** inside a faint 36px-diameter blush, between two 1px ghost lines. The halo at 12% accent is nearly invisible on white. The whole "ember at the forge" metaphor collapses to a near-invisible speck. This is the biggest concept-vs-execution gap in the file.
- **Enhancements (WeChat-safe)**:
  1. **Build a real ember stack**: ember dot r 3→6 solid `pal.ember`; ring it with a 1px `pal.ember` `circle(stroke,fill:none)` at r=12; keep/strengthen the `accentSoft` halo at r=22. Three concentric layers = a glowing coal, all solid+opacity (no filter).
  2. **Heat-haze rules**: replace the flat 1px hairlines with short tapered fade rules (fade technique) warming toward the ember, so the lines read as "iron cooling outward."
  3. **Anvil/vessel echo**: a small `pal.ink` `<path>` glyph (tiny anvil or vessel silhouette, paths only) under the ember as the kiln motif — ties to `endmark-vessel` used by the same Kiln flagship.
  4. **Spark accents**: 2-3 sub-pixel `pal.ember` dots scattered just above the line at low opacity — sparks — but respect the ≤2 ember/screen rule (these would count; gate behind allowMotion/static).
  5. **Center tint plate**: a small `rgba(ember,0.06)` rounded `rect` behind the ember as a "hearth" backing, so the focal mark sits on warm ground.

---

## 3. Cross-cutting recommendations (apply to BOTH files)

1. **Exploit the `<section>` style channel (constraint 5).** `svgSection` already accepts a `sectionStyle` override (primitives.ts:165, 174) but no module passes one. WeChat keeps inline `background-color/border/border-left/border-radius/padding`. Header modules should pass e.g. `sectionStyle: 'margin:24px 0;padding:4px 0;'` and, for tinted variants, a `background`/`border-radius` so the *container itself* (not just SVG content) is a premium plate. This is the cheapest, highest-impact change and needs no new SVG geometry.
2. **Introduce a reusable `tintCard(accent, alpha)` rect helper** in primitives (solid `rgba(accent,0.05-0.08)` backing) so every header/divider can opt into a backing plate consistently — directly answers the "solid-fill backing / tint card" brief.
3. **Stop shipping sub-pixel decoration.** Almost every "thin/plain" complaint traces to 1px rects + 0.12-0.35 opacity on a 1080-unit viewBox (≈0.35px on a 375px phone). Establish a floor: structural rules ≥2px, accent marks ≥4px, focal dots ≥6px.
4. **Reclaim the 3 dead modules** (`header-badge-num`, `divider-dots`, `divider-fade`) as the new premium block containers (tint card header / token divider / chapter rule) and wire them into plans — adds variety without renaming/deleting anything (constraint 4).
5. **Fix Amber's flat hierarchy**: give `flagship-amber` a distinct H2 (badge-num or a tinted vrule variant) vs H3 (plain vrule), so its body stops reading as undifferentiated markdown.
6. **Use `pal.paperWarm` (#f7f4ef)** — currently dead in both files — as the backing for tint cards on white pages to get the "quiet press / warm paper" feel instead of pure-white voids.

---

## Caveats / Not Found

- I did NOT audit quotes/badges/endmarks/covers/interactive — only the two files requested. Their plan wiring is shown for context but their internals are out of scope here.
- "Flagship preset" = the three SVG-driven presets (`flagship-kiln/tempera/amber`) in themes.ts. No other preset references these modules (`preset.decorate` for non-flagship presets uses CSS recipes, not `composeSvgDecorate`).
- Phone-pixel estimates (e.g. "6px ≈ 2px") assume the documented 375px paste width vs 1080 viewBox (~0.347 scale); the codebase comment references 375/677px viewport.
- Opacity/color values quoted are the *resolved runtime* values from `deriveSvgPalette` for the three flagship accents; a user-overridden `primaryColor` would change `accent`/`accentSoft`/`onAccent` but NOT the flagship-locked design intent (themes.ts:79-82 — Inspector override recolors CSS only, SVG keeps brand color).
