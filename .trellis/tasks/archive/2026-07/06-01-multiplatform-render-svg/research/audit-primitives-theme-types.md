# Research: Audit of svg-modules primitives.ts / theme.ts / types.ts (WeChat premium uplift)

- **Query**: For every exported module/function in primitives.ts, theme.ts, types.ts — document signature + flagship preset usage + exact emitted markup + blunt critique + 3-5 WeChat-safe enhancement ideas. User feedback: current WeChat output is "too plain, no different from a GitHub-markdown to WeChat conversion."
- **Scope**: internal
- **Date**: 2026-06-02

---

## 0. Orientation — how these three files feed the 26 modules

- `types.ts` = contract layer. Defines `SvgPalette`, `SvgThemeContext`, `SvgModuleParams`, `SvgModuleRenderer`, `SvgModuleSpec`, `SvgModuleFamily`. Every module renderer takes `SvgModuleParams` and returns a string.
- `theme.ts` = palette derivation. `buildThemeContext` → `deriveSvgPalette` produces the `SvgPalette` that EVERY module reads via `p.theme.palette`. **Whatever colors/tints these modules can show is 100% gated by this file.**
- `primitives.ts` = the only SVG-emitting atoms. Every one of the 26 modules builds its body by concatenating `rect`/`circle`/`path`/`textLine`/`hairlineRule`/`diamond`/`diamondSig`/`glow`, then wraps with `svgSection`. **No module emits raw SVG except a few inline `<circle>`/`<g>` strings; primitives are the choke point.**

### Flagship preset → module wiring (from `themes.ts:83-117`, `1143/1176/1209`)

| Preset | primaryColor | persona | cover | h2 | h3 | hr | blockquote | endmark |
|---|---|---|---|---|---|---|---|---|
| flagship-kiln | `#D95B3F` | creative | cover-grid | header-ribbon | header-vrule | divider-forge | quote-mark | endmark-vessel |
| flagship-tempera | `#3B7A6B` | academic | cover-title | header-bracket | header-vrule | divider-diamond | quote-corner | endmark-fin |
| flagship-amber | `#C19A56` | business | cover-title | header-vrule | — | divider-grid | quote-vbar | endmark-rule |

`badge-*` and `interactive` (`i-*`) modules are NOT wired into any flagship plan today — they exist in the registry but no preset injects them. `cover-quote`, `header-badge-num`, `divider-dots`, `divider-fade`, `quote-card`, `endmark-vessel`(only kiln) likewise partly unused.

### THE ROOT-CAUSE FINDING (answers the "too plain" feedback directly)

Two structural facts make every flagship output read like plain markdown:

1. **`svgSection` hard-codes `sectionStyle = 'margin:24px 0;'` and nothing else.** It NEVER emits the one thing WeChat actually keeps and that premium accounts rely on: inline `background-color` / `border-left` / `border-radius` / `padding` on the `<section>`/`<div>`/`<p>` wrapper. All "design" is pushed INSIDE a `viewBox` `<svg>` that is full-bleed transparent. So body paragraphs (normal `<p>` markdown) sit on bare white between thin SVG line-art. That is exactly the "GitHub-markdown look."
2. **`deriveSvgPalette` makes tints almost invisible.** `accentSoft` alpha is `0.08` for academic/business (tempera+amber) and `0.12` for creative (kiln). At 8% over white, a "tint card" is imperceptible on a phone. Combined with stroke widths of 1-2px and `hairline = rgba(26,26,26,0.12)`, the whole system is *line art on white* — thin by construction.

The KEY LEVER (constraint 5) — inline-styled SOLID-color block containers on `<section>/<p>/<blockquote>` — is essentially unused. `quote-card` is the ONLY place a `box-shadow`/`border-radius` touches the section style, and even it fills the card *inside* the SVG with `paperWarm` at full white-ish, not a confident accent tint. Fixing #1 and #2 is the highest-leverage change and lives entirely in these two files.

---

## 1. `primitives.ts` — exported functions

### 1.1 `escapeXml(s: string): string`
- **Used by**: `textLine` (internally) and `hiddenFulltext`; transitively every text-bearing module.
- **Emits**: no markup; replaces `& < > " '` with entities.
- **Critique**: fine and necessary. Note it escapes text content only — attribute values are "internally controlled," which is why a future enhancement that lets callers pass arbitrary section styles must keep style strings developer-controlled (never user text).
- **Enhancements**: none needed. Leave as-is.

### 1.2 `attrs(map)` (module-private, not exported)
- Serializes an attr map, dropping `undefined`/`''`. Used by `rect`/`circle`/`path`/`textLine`/`smil*`.
- **Enhancement hook**: this is where you'd centrally add support for a `style` attr if you wanted primitives to carry inline element styles, but SVG children don't need it — the section wrapper does (see `svgSection`).

### 1.3 `rect(o: RectOpts): string`
- **Signature**: `RectOpts = { x?, y?, width, height, rx?, ry?, fill?, stroke?, strokeWidth?, opacity?, transform? }`
- **Used by**: header-ribbon (the accent bar), header-vrule (6px bar), quote-vbar (8px bar), quote-card (the card), badge-kpi/badge-tag (cards/pills), divider-grid (ticks), divider-fade (segments), cover-grid (grid lines + outline), all interactive cards, `hairlineRule`, `darkSafeBg`. **The single most-used primitive for "block" feeling.**
- **Emits** (literal): `<rect x=".." y=".." width=".." height=".." rx=".." ry=".." fill=".." stroke=".." stroke-width=".." opacity=".." transform=".." />` (only non-empty attrs printed).
- **Critique**: capable but always used with thin strokes / faint fills. The ribbon (`header-ribbon`) fills with `pal.accent` solid (good!) but is the only one. Everything else uses it for 1px lines or 8%-tint cards.
- **Enhancements**:
  1. Nothing wrong with the primitive itself — the fix is in *callers* + theme tints. But consider adding an optional `rxOnly`/per-corner is impossible in SVG `rect`; skip.
  2. Keep; it's the workhorse for solid-fill backing blocks once tints get stronger.

### 1.4 `circle(o: CircleOpts): string`
- **Signature**: `CircleOpts = { cx, cy, r, fill?, stroke?, strokeWidth?, opacity? }`
- **Used by**: header-badge-num & badge-num (the numbered disc, `fill: pal.accent` — solid, good), divider-dots, divider-forge (ember dot), cover-grid (accent intersection dot), endmark-vessel ember dot (hand-written inline, NOT via this fn), `glow`.
- **Emits**: `<circle cx=".." cy=".." r=".." fill=".." stroke=".." stroke-width=".." opacity=".." />`
- **Critique**: the numbered-disc usage is the one genuinely "designed-looking" element in the system because it's a SOLID accent fill with onAccent text. Everything else uses tiny r=2..8 dots.
- **Enhancements**: fine as a primitive. Lever is to *use* solid filled circles bigger and as anchors (see header proposals).

### 1.5 `path(d, o: PathOpts): string`
- **Signature**: `PathOpts = { fill?='none', stroke?, strokeWidth?, opacity?, transform?, strokeLinecap? }`
- **Used by**: header-bracket (corner Ls), quote-corner (corner marks), quote-mark (deco quote glyph), cover-quote (quote blocks), endmark-vessel (ding/nib/legs/belt — heavy), diamond.
- **Emits**: `<path d=".." fill="none" stroke=".." stroke-width=".." stroke-linecap=".." opacity=".." transform=".." />` (fill defaults to `none` → **everything path-based is hollow line art by default**).
- **Critique**: `fill: o.fill ?? 'none'` is the thinness engine. The vessel mark, bracket corners, quote corners are ALL hollow 1.4-6px strokes → reads as faint wireframe on a phone. This is the single biggest contributor to "thin."
- **Enhancements**:
  1. Most path-based motifs should gain a *solid filled* variant or a filled backing shape behind the stroke (e.g. vessel ding filled with `accentSoft`-strong, nib already `fill: accent`).
  2. Where a stroke must stay, bump default min stroke-width to ~2 and use `accent` not `hairline` for the hero stroke.
  3. Keep `path` API; add no params — drive richness from callers.

### 1.6 `hairlineRule(o): string`
- **Signature**: `{ x, y, width, height?=1, fill, opacity? }` → delegates to `rect` with height default 1.
- **Used by**: header-badge-num, divider-grid/-diamond/-forge, badge-kpi top rule, cover-title/-grid/-quote rules, endmark-vessel/-rule sig lines, interactive top rules. Ubiquitous.
- **Emits**: a 1px-high `<rect ... height="1" />` with `fill` typically `pal.hairline` = `rgba(26,26,26,0.12)`.
- **Critique**: 1px @ 12% ink is invisible-thin on retina phones; it's the literal definition of "plain." Used as the primary separator everywhere.
- **Enhancements**:
  1. Add optional `weight` semantics in callers: hero rules should be 2-3px in `accent` (full opacity), only true sub-dividers stay hairline.
  2. Offer a paired "rule + thicker accent cap" pattern (short bold accent segment + long faint tail) for editorial feel — compose in callers from two `hairlineRule` calls.
  3. Keep primitive; raise default contrast at the theme level (see theme `hairline`).

### 1.7 `glow(cx, cy, r, colorSoft): string`
- **Signature**: `glow(cx, cy, r, colorSoft)` → `circle({cx,cy,r,fill:colorSoft})`.
- **Used by**: divider-forge ONLY (`glow(W/2, cy, 18, accentSoft)`).
- **Emits**: a single low-alpha `<circle>` (the gradient/filter-free "halo").
- **Critique**: at `accentSoft` 8-12% over white, an 18px radius glow is basically invisible. It pretends to be a filter but can't blur, so it's just a faint flat disc.
- **Enhancements**:
  1. Make it a *stacked* glow: 3 concentric circles at e.g. 26/18/10px radius with rising opacity (0.06/0.12/0.22 of accent) to fake a radial falloff with solid fills only — WeChat-safe, no `radialGradient`.
  2. Allow `glow` to take an array of (r, alpha) rings; default to the 3-ring stack.
  3. Pair the halo with a solid accent core dot so there's a crisp focal point.

### 1.8 `diamond(cx, cy, r, fill, opacity?): string`
- **Signature**: `diamond(cx, cy, r, fill, opacity?)` — emits a rotated square via path, no transform.
- **Used by**: cover-title (single mark), cover-grid via none, diamondSig, interactive sigs (i-clickswitch/i-fadein/i-scrollcards corner sigs), divider-diamond.
- **Emits** (literal): `<path d="M{cx},{cy-r} L{cx+r},{cy} L{cx},{cy+r} L{cx-r},{cy} Z" fill=".." opacity=".." />` — a SOLID filled diamond (good — it's filled, not hollow).
- **Critique**: small (r=5..14), low presence. Fine as a quiet signature; it's not the problem.
- **Enhancements**:
  1. Offer an outlined+filled "double diamond" (a filled accent diamond inside a slightly larger hairline diamond) for a crisper jewel.
  2. Keep solid-fill default. No change needed for restraint.

### 1.9 `diamondSig(o): string`
- **Signature**: `{ cx, cy, r, fill, gap?=r*3 }` → three `diamond`s.
- **Used by**: divider-diamond, endmark-fin.
- **Emits**: three solid diamonds `◇◇◇` at `gap` spacing.
- **Critique**: the brand signature; tasteful and correct. Not "plain" in a bad way — it's intentional restraint.
- **Enhancements**:
  1. Optional center-emphasis variant: middle diamond solid accent, flanks at 50% opacity, for subtle hierarchy.
  2. Keep as is for endmark-fin.

### 1.10 `textLine(o: TextLineOpts): string`
- **Signature**: `{ x, y, text, fill, fontSize?, fontWeight?, fontFamily?, anchor?, opacity?, letterSpacing? }`
- **Used by**: every text-bearing module.
- **Emits**: `<text x y fill font-size font-weight font-family text-anchor letter-spacing opacity>{escaped text}</text>`
- **Critique**: solid and flexible. The weakness is in callers: body text in quotes is 38px regular `pal.ink`, attribution 26px `inkSoft` — competent but never bold/large enough to create the strong hierarchy premium accounts use. Single-line only (no wrap) forces tiny CJK in cards.
- **Enhancements**:
  1. Provide a `textBlock` helper (NEW) that wraps multi-line + supports a leading **bold accent first line** (kicker) above a title — premium accounts always have a small caps kicker.
  2. Encourage 2-weight hierarchy (700 hero / 400 body) in callers.
  3. Keep `textLine` primitive untouched; add helpers.

### 1.11 `svgSection(o: SvgSectionOpts): string` ★ HIGHEST LEVERAGE
- **Signature**: `{ moduleId, viewBoxW, viewBoxH, body, sectionStyle?, svgStyle? }`
- **Used by**: EVERY module (the root wrapper).
- **Emits** (literal):
  ```
  <section data-ink-svg="{moduleId}" style="{secStyle}">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="100%" style="display:block;{svgStyle}">
      {body}
    </svg>
  </section>
  ```
  Default `secStyle = 'margin:24px 0;'`. So the `<section>` is a bare transparent margin box — **no background, no border, no padding, no radius** unless a caller passes `sectionStyle` (only quote-card does, and only for shadow/radius).
- **Critique**: THIS is the core gap. WeChat keeps `<section>` inline `background-color/border/border-left/border-radius/padding/margin`. We emit none of them. Every module's "design" is trapped inside a full-bleed transparent SVG, so the surrounding article body looks like raw markdown. Premium accounts get their look from filled `<section>` cards behind/around content — we have zero.
- **Enhancements** (all WeChat-safe; this is where most premium uplift lives):
  1. **Add a `card` option** to `SvgSectionOpts`: when set, emit `background-color:{tint};border-radius:14px;padding:20px 24px;` on the `<section>` (solid lightened brand tint, e.g. `rgba(59,122,107,0.08)`→make it 0.10-0.14). Lets headers/quotes/badges sit ON a tinted block, not floating.
  2. **Add `accentBar` option**: emit `border-left:4px solid {accent};padding-left:18px;` on the `<section>` — the canonical premium "key sentence / note box" left rule, on the HTML wrapper (crisp at any DPI, unlike a 6px SVG rect that scales with viewBox).
  3. **Add `divider top/bottom border`**: `border-top:2px solid {accent}` for section-header bars without needing an SVG at all.
  4. Keep `data-ink-svg` sentinel and `width="100%"`/viewBox invariants — just enrich the wrapper style.
  5. Add a sibling helper `htmlBlock(...)` (NEW, see §1.16) for modules that need NO SVG at all — pure inline-styled `<section><p>` (filled callout/note/key-sentence) which renders sharper and lighter than SVG text and is the real premium lever.

### 1.12 `hiddenFulltext(text): string`
- **Emits**: `<p style="height:0;line-height:0;font-size:0;color:transparent;overflow:hidden;">{escaped}</p>` — a11y/SEO mirror of SVG text.
- **Used by**: not referenced by current modules (intended for cover/headers to restore searchable text).
- **Critique**: good idea, currently dormant. Because cover/header text lives in SVG `<text>` (not real DOM text), search/copy/SEO suffer — another subtle "this isn't a real article" signal.
- **Enhancements**:
  1. Actually wire it into cover-title/cover-grid/header-* so the visible title also exists as hidden real text.
  2. No markup change needed.

### 1.13 `mpStyleTrailer(): string`
- **Emits**: `<p style="display:none;"><mp-style-type data-value="10000"></mp-style-type></p>` — WeChat editor trailer.
- **Used by**: not referenced in module families (likely appended at pipeline level).
- **Critique/Enhancements**: leave as-is; infra, not visual.

### 1.14 `darkSafeBg(w, h, color): string`
- **Emits**: `rect({x:0,y:0,width:w,height:h,fill:color})` — full-canvas opaque background INSIDE the svg.
- **Used by**: cover-title (`paperWarm`), cover-grid (`paper` = `#ffffff`), cover-quote (`paperWarm`).
- **Critique**: only covers fill a background, and only with near-white paper. Covers therefore read as "white box with a thin title" — plain. cover-grid filling pure white `#ffffff` over the page is the plainest possible cover.
- **Enhancements**:
  1. Offer a **solid accent or deep-ink cover background** variant: e.g. cover-title on `paperWarm` but with a bold full-bleed accent band/side-block (solid `rect` fill accent) and onAccent title — instant magazine cover.
  2. Add a duotone option: large solid accent block + paperWarm block split, title spanning.
  3. Keep darkSafeBg for dark-mode immunity; just let covers fill richer surfaces.

### 1.15 SMIL: `smilAnimate`, `smilSet`, `smilAnimateTransform`
- **Used by**: interactive family only (i-clickswitch, i-fadein, i-sequence), gated on `theme.allowMotion`.
- **Emits**: `<animate .../>`, `<set .../>`, `<animateTransform attributeName="transform" .../>` with `fill="freeze" restart="never"` defaults.
- **Critique**: out of scope for "plain" (motion ≠ thinness), and interactive family isn't wired into flagships anyway. Fine.
- **Enhancements**: none for this task. If interactive modules later join flagships, they share the same thin-card problem (paperWarm cards, 1px hairline rules) and would benefit from the §1.11 card/tint enhancements.

### 1.16 (NEW primitives to ADD — not deletions/renames)
- `htmlBlock(o)`: pure inline-styled `<section style="background-color:{tint};border-left:4px solid {accent};border-radius:12px;padding:18px 22px;margin:24px 0;">{innerHtmlParas}</section>` — no SVG. The real premium callout/note/key-sentence container. WeChat-safe (only kept properties).
- `tintCardStyle(palette, {strength})`: returns a style string for §1.11 card option, centralizing the lightened-brand-tint recipe so tints are STRONG (0.10-0.14) and consistent.
- `kicker(textLine wrapper)`: small-caps accent label helper for hierarchy.

---

## 2. `theme.ts` — exported functions/constants

### 2.1 `BRAND_TOKENS` (const)
- `{ emberLight:'#c9362c', emberDark:'#e15a4e', paperWarmLight:'#f7f4ef', paperWarmDark:'#1b2230' }`.
- **Used by**: `deriveSvgPalette` (paperWarm = `#f7f4ef`, ember = `#c9362c`).
- Note: spec brand accents in the task (tempera `#3B7A6B`, kiln `#D95B3F`, amber `#C19A56`) come in as `primaryColor` per preset, NOT from here. `ember` here `#c9362c` is the ≤2/screen accent.
- **Critique**: fine. Only the light variants are ever used (dark variants dormant).
- **Enhancements**: add lightened "tint" tokens (solid % over white) so cards have a canonical strong tint, e.g. derive `accentTintStrong = rgba(accent, 0.12)` and `accentTintBlock = rgba(accent, 0.14)` here rather than ad-hoc.

### 2.2 `normalizeHex`, `hexToRgb`, `rgba`, `relativeLuminance`
- Pure color utils. `rgba(color, alpha)` clamps alpha and trims float tails (snapshot-stable). `relativeLuminance` picks white-vs-ink text on accent (`onAccent`).
- **Used by**: `deriveSvgPalette` and any module needing a tint (via palette).
- **Critique**: solid and correct. `onAccent` logic is exactly right for solid accent blocks — which means we CAN confidently put text on solid accent backgrounds (good news for premium cards).
- **Enhancements**: none to the math. They're the safe foundation for stronger tints.

### 2.3 `deriveSvgPalette(primaryColor, persona, _accentColor?): SvgPalette` ★ SECOND HIGHEST LEVERAGE
- **Returns** (literal):
  ```
  ink: '#1a1a1a'
  inkSoft: rgba(26,26,26,0.55)
  accent: '#'+normalizeHex(primaryColor)
  accentSoft: rgba(accent, persona==='creative'||'lifestyle' ? 0.12 : 0.08)
  paper: '#ffffff'
  paperWarm: '#f7f4ef'
  ember: '#c9362c'
  hairline: rgba(26,26,26,0.12)
  onAccent: luminance(accent)<0.5 ? '#ffffff' : '#1a1a1a'
  ```
- **Used by**: every module via `p.theme.palette`.
- **Critique**: this is why the system looks faint. `accentSoft` at 0.08 (tempera/amber) / 0.12 (kiln) is below the visible threshold for fills on white phones; `hairline` 0.12 ink is a ghost line. There is no "strong tint," no "block fill," no mid-tone in the palette — just accent(solid), accent(8%), ink, ink(55%), ink(12%), two papers. Modules literally cannot make a confident tinted card because the palette doesn't expose one.
- **Enhancements** (WeChat-safe, brand-locked):
  1. **Add `accentTint`** = `rgba(accent, 0.12)` and **`accentBlock`** = `rgba(accent, 0.16)` (solid lightened brand color, never a gradient) for filled section cards. Bump per-persona: academic/business 0.10, creative/lifestyle 0.14.
  2. **Add `accentStrong`** alias = `accent` and **`accentLine`** = `rgba(accent, 0.85)` for 2-3px hero rules that read as confident, not hairline.
  3. **Raise `hairline`** to `rgba(26,26,26,0.16)` (still restrained) OR add `hairlineStrong` for primary dividers, keep 0.12 for sub-lines.
  4. **Add `inkMute`/`paperShade`** (`rgba(26,26,26,0.04)` solid card backing on white) for neutral note boxes that aren't accent-tinted.
  5. Keep `onAccent` exactly — it unlocks confident solid-accent header bars and footer signature cards with correct contrast.

### 2.4 `buildThemeContext(opts): SvgThemeContext`
- **Signature**: `{ primaryColor, persona, target, accentColor? }` → `{ ...opts, palette, allowMotion: target==='preview'||'wechat' }`.
- **Used by**: `composeSvgDecorate` (inject.ts) — builds theme once per decorate call.
- **Critique**: clean. `allowMotion` correct. No issue.
- **Enhancements**: when new tint fields are added to palette, they flow through automatically. Optionally thread a `density`/`richness` flag from preset → theme so flagship can opt into stronger cards while neutral presets stay quiet — but the task forbids restructuring scope, so prefer baking richness into the palette + svgSection card options.

---

## 3. `types.ts` — exported types

(Types emit no markup; critique = "does the contract ALLOW premium output?")

### 3.1 `SvgPalette`
- Fields: `ink, inkSoft, accent, accentSoft, paper, paperWarm, ember, hairline, onAccent`.
- **Critique**: the contract has no slot for a strong tint, block fill, neutral card shade, or strong line. Modules can only reach for the faint colors above. **Widen this interface** (additive) with the §2.3 fields: `accentTint`, `accentBlock`, `accentLine`, `paperShade` (optional `?` to avoid breaking snapshot tests, then populate in `deriveSvgPalette`).

### 3.2 `SvgThemeContext`
- `{ primaryColor, persona, accentColor?, target, palette, allowMotion }`. Fine; no change needed beyond palette widening.

### 3.3 `SvgModuleParams`
- `{ theme, text?, subtitle?, index?, items?, variant? }`. `variant` exists but is unused by current modules. **Enhancement**: use `variant` to let one module id render plain vs. tint-card vs. solid-accent versions, so we ENHANCE existing modules (constraint 4) rather than add ids. e.g. `header-ribbon` variant `'block'` could fill the whole `<section>` accent instead of an inner rect.

### 3.4 `SvgModuleRenderer`, `SvgModuleFamily`, `SvgModuleSpec`
- `SvgModuleFamily = 'header'|'divider'|'quote'|'badge'|'endmark'|'cover'|'interactive'` — note NO `callout`/`note`/`keysentence`/`footer-card` family. The premium "tinted callout box" and "key-sentence highlight" and "footer signature card" the task calls out have **no home family**. **Enhancement**: ADD families (`callout`, `keyline`, `footer`) — additive, breaks nothing — to host new inline-styled-`<section>` block modules built on the new `htmlBlock`/svgSection-card primitives.
- `SvgModuleSpec` has `interactive?` + `rasterizeOn?` — fine.

---

## 4. Cross-cutting blunt critique (the "why it looks plain" summary)

1. **Everything is line art on white.** Default `path` fill=`none`; primary separators are 1px @ 12% ink; tints are 8-12% accent. On a retina phone this is near-invisible — exactly "GitHub markdown."
2. **The `<section>` wrapper is wasted.** WeChat keeps `background/border-left/border-radius/padding` on it; we emit only `margin`. The biggest premium lever in the whole platform is unused.
3. **No tint card / callout / key-sentence / footer-card surfaces exist** — neither in palette, nor types, nor primitives. The body text between SVG ornaments is undecorated.
4. **Covers fill near-white paper** and rely on a thin title + tiny diamond. No bold color block, no kicker, no solid backing.
5. **Hierarchy is weak**: 700 hero vs 400 body exists, but sizes are modest and there's no kicker/eyebrow label convention.

## 5. Top WeChat-safe, brand-locked recommendations (priority order)

1. **`svgSection` + new `htmlBlock`**: emit inline `background-color` (strong brand tint) / `border-left:4px solid accent` / `border-radius` / `padding` on the `<section>`. Add `callout`/`keysentence`/`footer-card` modules that are pure inline-styled HTML (no SVG) for crisp, light, premium blocks. *(Highest impact, lives in primitives.ts + types.ts families.)*
2. **`deriveSvgPalette`**: add `accentTint`(~0.12), `accentBlock`(~0.16), `accentLine`(~0.85), `paperShade`(~0.04); raise default rule contrast. *(Unlocks every module to look filled, not faint.)*
3. **`path`/motif callers**: give vessel/bracket/quote-corner a solid `accentTint` backing shape behind the stroke; bump hero strokes to 2-3px accent. Stacked-ring `glow`.
4. **Covers**: bold solid accent side-block or band + onAccent title + kicker, instead of near-white paper only.
5. **Wire dormant modules + `variant`**: use `badge-*`, `hiddenFulltext`, and `SvgModuleParams.variant` to add tint/solid variants of existing ids (enhance, not rename).

All proposals use SOLID fills + opacity layering only, transforms via XML attribute (diamond already does), inline SVG path icons (vessel/nib/diamond) — no emoji, no `<defs>`/gradient/filter/mask/clip/use/`url(#)`/`style="transform:"`. Brand accents stay locked to the per-preset primaryColor + ember.

## Caveats / Not Found

- `badge-*` and `interactive` (`i-*`) modules are registered but NOT injected by any flagship preset today — confirmed via `themes.ts` plans (only `cover/headings/replaceHr/blockquote/endmark` keys exist in `SvgInjectionPlan`; there is no hook for badges/callouts/key-sentence). Adding callout/key-sentence injection would also need a new `SvgInjectionPlan` field + matching regex in `inject.ts` (out of these 3 files, but flagged for the implement step).
- I did not run the test suite; snapshot tests under `__tests__/` will change if `deriveSvgPalette` output shape changes — make new palette fields optional (`?`) and additive to minimize churn.
- Exact ember-per-screen budget (≤2) is enforced by convention, not code; stronger tints use accent (preset color), not ember, so the budget is unaffected.
