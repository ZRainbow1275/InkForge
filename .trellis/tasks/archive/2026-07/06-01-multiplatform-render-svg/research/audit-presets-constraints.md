# Research: WeChat inline-SVG typesetting subsystem — flagship presets, platform rules, safe-subset, and module-by-module enhancement audit

- **Query**: Audit the WeChat inline-SVG typesetting subsystem (themes.ts flagship presets + platform-rules/wechat.ts + svg-modules/) to make output dramatically more premium. Document every exported module/function: signature, which flagship uses it, EXACT markup emitted, blunt critique + 3-5 concrete WeChat-safe enhancements.
- **Scope**: internal
- **Date**: 2026-06-02

---

## 0. Executive summary — why it looks "plain"

The current flagship system is built almost entirely from **thin strokes, 1px hairlines, low-opacity tints, and isolated geometric dots**. Every module is a "visual signature" rather than a designed block. The single biggest premium lever — **WeChat-retained inline `background-color` / `border-left` / `border-radius` / `padding` on `<section>`/`<p>`/`<blockquote>`** — is used by *exactly one* SVG module (`quote-card`'s `box-shadow` on its `<section>`) and *zero* heading/quote/callout block containers. There are **no filled section-header bars, no tinted quote cards, no callout/note boxes, no key-sentence highlights, and no footer signature cards** as HTML block containers. The SVG modules paint onto a transparent SVG canvas instead, so they read as "a small graphic" floating in a markdown wall, not as "designed page furniture."

Two structural facts that make this gap exploitable:

1. **`<section>` is the SVG module wrapper everywhere** (`svgSection()` in primitives.ts). Today its style is just `margin:24px 0;`. WeChat keeps `background-color`/`border`/`border-radius`/`padding` on `<section>`, so the wrapper itself can become a tinted card *for free* — no SVG change needed, just a richer `sectionStyle`.
2. **`OPAQUE_TAGS` in wechat.ts includes `'svg'`** — so the CJK/Latin spacer never touches SVG interiors. But `<section>` and `<p>` are NOT opaque, so any HTML-block enhancement (tint cards, callout boxes) flows through the spacing/clamp/darkmode pipeline normally and stays safe.

The palette derivation (`deriveSvgPalette`) is the other choke point: `accentSoft` alpha is **0.08** (academic/business) or **0.12** (creative/lifestyle) — far too faint to read as a "color block." `hairline` is `rgba(26,26,26,0.12)`. These two values alone make almost everything look washed out.

---

## 1. `svg-modules/wechat-safe.ts` — the 18 enforced rules (spec says "17", code ships 18)

**Note:** The task brief and the file header say "17 rules"; the actual `RULES` array (lines 21–60) contains **18 entries**. Listed below in source order.

### Exported types & functions

| Export | Signature | Used by |
|---|---|---|
| `SafeViolation` (interface) | `{ rule: string; detail: string }` | return type of `checkWechatSafe` |
| `checkWechatSafe` | `(svgHtml: string) => SafeViolation[]` | `badges.ts` `safe()`, `interactive.ts` `safe()`, tests (`__tests__`) |
| `assertWechatSafe` | `(svgHtml: string) => void` (throws on violation) | `badges.ts`, `interactive.ts`; **NOT** called by headers/dividers/quotes/covers/endmarks (they rely on test-suite coverage, not runtime assert) |

### The 18 rules (literal regex + intent)

| # | rule | regex (literal) | what it forbids |
|---|---|---|---|
| 1 | `no-class` | `/\sclass\s*=/i` | `class=` (WeChat strips class) |
| 2 | `no-style-block` | `/<style[\s>]/i` | `<style>` tag |
| 3 | `no-css-var` | `/var\(\s*--/i` | `var(--…)` |
| 4 | `no-calc` | `/calc\(/i` | `calc()` |
| 5 | `no-div` | `/<div[\s>]/i` | `<div>` (must use `<section>`) |
| 6 | `no-foreign-object` | `/<foreignObject[\s>]/i` | `<foreignObject>` |
| 7 | `no-id-referenced` | `/<(defs\|linearGradient\|radialGradient\|clipPath\|mask\|filter\|feGaussianBlur\|feColorMatrix\|use\|symbol\|pattern)[\s>]/i` | every id-referenced SVG element (gradients/clip/mask/filter/use/pattern/symbol) |
| 8 | `no-url-ref` | `/url\(\s*#/i` | `fill="url(#…)"` |
| 9 | `no-style-transform` | `/style\s*=\s*"[^"]*transform\s*:/i` | CSS `transform:` in inline style (use `transform="…"` XML attr) |
| 10 | `no-style-animation` | `/style\s*=\s*"[^"]*(animation\|transition)\s*:/i` | CSS animation/transition |
| 11 | `no-keyframes` | `/@keyframes/i` | `@keyframes` |
| 12 | `no-script` | `/<script[\s>]/i` | `<script>` |
| 13 | `no-xlink` | `/xlink:href/i` | `xlink:href` |
| 14 | `no-svg-image` | `/<image[\s>]/i` | SVG `<image>` |
| 15 | `no-bad-smil-trigger` | `/begin\s*=\s*"[^"]*(touchstart\|touchend\|mouseover\|mouseout\|focusin\|focusout)/i` | unreliable SMIL triggers (use `begin="click"`) |
| 16 | `no-fixed-svg-width` | `/<svg[^>]*\bwidth\s*=\s*"\d+(?:px)?"/i` | fixed-px `<svg width>` (must be `width="100%"`+viewBox) |
| 17 | `no-iframe` | `/<iframe[\s>]/i` | `<iframe>` |
| 18 | `no-media` | `/<(video\|audio)[\s>]/i` | `<video>`/`<audio>` |

### Critique + enhancement ideas (the validator)

**Blunt critique:** The validator is a *negative* contract (a denylist). It guarantees safety but says nothing about quality, and it has **two blind spots that actively let "plain" output through**:
- Rule 9 (`no-style-transform`) only matches `transform:` inside `style="…"`. It does **not** restrict the `transform="…"` XML attribute — good, that's the intended safe path — but there's no helper to *encourage* using it for rotation/skew on rects, so modules avoid transforms entirely and stay axis-aligned and flat.
- Nothing validates that block-container styles (`background-color`, `border-radius`, `padding` on `<section>`) are used — i.e. it can't push authors toward the premium lever.

**Concrete enhancements (all keep the validator's safety guarantees intact):**
1. **Make `assertWechatSafe` mandatory at the wrapper level.** Move the `safe()` call into `svgSection()` in primitives.ts so *every* module (headers/dividers/quotes/covers/endmarks — currently unchecked at runtime) is asserted, not just badges/interactive. This lets you add richer markup confidently without fear of a regression silently shipping.
2. **Add a positive lint helper `assertSectionStyled(html)`** (advisory, dev-only) that warns when a `data-ink-svg` `<section>` has *only* `margin` in its style — flagging modules that fail to use the background/border/padding lever.
3. **Add an explicit allowlist note for `transform="rotate(...)"`** as a doc constant so future contributors know skewed/rotated accent shapes (e.g. a 45°-rotated corner flag) are safe.
4. **Keep the rule count honest:** rename the "17 rules" comment to 18 (or split rule 10 animation/transition into two) so the AC9 spec text matches reality.

---

## 2. `platform-rules/wechat.ts` — OPAQUE_TAGS + sanitize/compliance behavior

This file does **not** sanitize/strip — it is the *post-inline compliance transform* (CJK spacing + width clamp + dark-mode metadata). All transforms are pure & idempotent.

### Exported symbols

| Export | Signature | Used by flagships? |
|---|---|---|
| `WechatRuleOptions` (interface) | `{ enableCjkSpacing?, maxContentWidth?: number\|null, enableDarkMode?, darkModeText?, darkModeBg? }` | options bag for `wechatComplianceTransform` |
| `applyCjkLatinSpacing` | `(html: string) => string` | runs on all WeChat exports (inserts U+202F between CJK↔Latin) |
| `clampContentWidth` | `(html: string, maxWidth = 677) => string` | wraps content in centered max-width column |
| `injectDarkModeMetadata` | `(html, { textColor?, bgColor? }) => string` | opt-in; adds `data-darkmode-*` attrs to block + inline tags |
| `wechatComplianceTransform` | `(html, options = {}) => string` | orchestrator; default spacing on, clamp@677 on, darkmode off |
| `default` export `wechatRules` | `{ applyCjkLatinSpacing, clampContentWidth, injectDarkModeMetadata, wechatComplianceTransform }` | namespaced access |

### Key constants & literal markup emitted

- `OPAQUE_TAGS = new Set(['code', 'pre', 'style', 'script', 'svg'])` (line 57). **`svg` is opaque** → CJK spacer never injects U+202F inside SVG `<text>` (would corrupt glyph layout). **Critically, `section`, `p`, `blockquote`, `div` are NOT opaque** → any HTML block-container enhancement flows through spacing/clamp/darkmode normally.
- `THIN_SPACE = ' '` (narrow no-break space, ~1/4 em).
- `DEFAULT_MAX_WIDTH = 677`.
- `clampContentWidth` emits literally: `<div data-wechat-clamp="1" style="max-width:677px;margin:0 auto;">…</div>` — **wait, this emits a `<div>`**, which rule 5 (`no-div`) forbids. It is safe here only because this transform runs on the *whole article* (which WeChat rewrites `<div>`→`<section>` itself), NOT inside an SVG module. (The SVG-module `no-div` rule applies to module output, which is wrapped before this step.)
- `DARKMODE_TARGETS = ['h1','h2','h3','h4','h5','h6','blockquote','pre','code','table','th','td','strong','em','a']` — note: **`section` and `div` are NOT in this list**, so SVG-module wrapper sections and any new callout `<section>` boxes get **no dark-mode metadata** today.
- `injectDarkModeMetadata` emits attrs like: `data-darkmode-color="#FFFFFF|"`, `data-darkmode-bgcolor="#1F1F1F|"`, `data-darkmode-original-color="<c>|<c>"`, `data-darkmode-original-bgcolor="<bg>|<bg>"`.

### Critique + enhancement ideas (platform layer)

**Blunt critique:** This layer is solid and safe, but it is **invisible to the SVG modules** and does nothing to make output premium. The real problem it reveals: because `section`/`div` are excluded from `DARKMODE_TARGETS`, *if* we adopt the key lever (tinted `<section>` callout cards), those cards will look wrong in WeChat dark mode (a `rgba(59,122,107,0.08)` tint on a dark page goes muddy and the dark text vanishes). So enhancements here are a **prerequisite** for the premium block-container work, not optional.

**Concrete enhancements:**
1. **Add `'section'` to `DARKMODE_TARGETS`** so new tinted-card sections get `data-darkmode-bgcolor`/`-color` and survive WeChat dark mode. (Be careful to scope to cards that carry a `background-color`, e.g. only inject when `readStyleProp(style,'background-color')` is present — already the pattern used for `originalBg`.)
2. **Keep `'svg'` opaque (do NOT change)** — confirm this stays so future richer SVG `<text>` blocks aren't corrupted by the spacer.
3. **Expose a `cardSafeStyle(palette)` helper** in this file (or a new `wechat-blocks.ts`) that returns a canonical premium card style string (`background-color:<tint>;border-left:4px solid <accent>;border-radius:0 10px 10px 0;padding:18px 22px;margin:22px 0;`) so every module and the decorator reuse one audited, dark-mode-aware definition.
4. **Add an idempotent "key-sentence highlight" transform** (opt-in, like darkmode) that wraps the first `<strong>` in each section or a marked `==text==` in a tinted inline `<span style="background-color:<tint>;border-radius:3px;padding:1px 5px;">` — pure text-level, safe, and a hallmark of premium accounts.

---

## 3. `themes.ts` — flagship presets, color tokens, decorate() hook, module wiring

### Locked brand tokens (themes.ts lines 83-85, theme.ts lines 11-19)
- `FLAGSHIP_KILN = '#D95B3F'` (creative persona)
- `FLAGSHIP_TEMPERA = '#3B7A6B'` (academic persona)
- `FLAGSHIP_AMBER = '#C19A56'` (business persona)
- `BRAND_TOKENS.emberLight = '#c9362c'`, `paperWarmLight = '#f7f4ef'`; `INK = '#1a1a1a'`, `PAPER = '#ffffff'`.

### The three flagship `SvgInjectionPlan`s (themes.ts lines 87-117)

| Plan | cover | headings | replaceHr | blockquote | endmark |
|---|---|---|---|---|---|
| `flagshipKilnPlan` (creative/Kiln) | `cover-grid` | h2→`header-ribbon`, h3→`header-vrule` | `divider-forge` | `quote-mark` | `endmark-vessel` |
| `flagshipTemperaPlan` (academic/Tempera) | `cover-title` | h2→`header-bracket`, h3→`header-vrule` | `divider-diamond` | `quote-corner` | `endmark-fin` |
| `flagshipAmberPlan` (business/Amber) | `cover-title` | h2→`header-vrule` | `divider-grid` | `quote-vbar` | `endmark-rule` |

### Preset `decorate` hook wiring (themes.ts lines 1143, 1176, 1209)
Each flagship's `decorate` is:
```
decorate: composeSvgDecorate(<plan>, { primaryColor: <FLAGSHIP_*>, persona: <persona> })
```
- `composeSvgDecorate(plan, opts)` (inject.ts lines 78-156) returns `(html, target) => string`. Order of operations: (1) capture first `<h1>` text for cover echo; (2) replace `<hN>` per `plan.headings`; (3) replace `<hr>`; (4) replace `<blockquote>`; (5) prepend cover (consuming/removing the first `<h1>`); (6) append endmark. Idempotent via `data-ink-svg="<id>"` sentinels.
- The flagships' `previewCSS`/`exportCSS` are deliberately minimal: persona base CSS + accent-colored `h2/h3/strong/a/code/table th` only (e.g. lines 1128-1141 for Kiln). **`customCSS: ''`** for all three — they intentionally delegate all visual identity to the SVG modules. **This is why the gap matters so much: the SVG modules ARE the entire design; if they're thin, the flagship is thin.**

### Palette derivation (theme.ts `deriveSvgPalette`, lines 62-81)
```
accent     = '#' + normalizeHex(primaryColor)
accentSoft = rgba(accent, 0.08)  // academic/business
           = rgba(accent, 0.12)  // creative/lifestyle
ink        = '#1a1a1a'
inkSoft    = rgba(26,26,26,0.55)
paper      = '#ffffff'
paperWarm  = '#f7f4ef'
ember      = '#c9362c'
hairline   = rgba(26,26,26,0.12)
onAccent   = '#ffffff' if luminance(accent)<0.5 else '#1a1a1a'
```
**Critique:** `accentSoft` at 0.08-0.12 is the root cause of "washed out." A premium tinted card needs ~0.06-0.10 for a *whisper* fill but the accent BAR/border needs full-strength accent at meaningful width. Amber `#C19A56` at luminance ≈ 0.42 → `onAccent` = white, but `#C19A56` on white text is borderline AA (~2.6:1) for the `header-ribbon`/`table th` usage — worth verifying.

**Concrete enhancements (palette):**
1. **Add a second, stronger tint** `accentTint = rgba(accent, 0.10)` AND a `accentBand = rgba(accent, 0.16)` so cards can layer two opacities (whisper fill + slightly stronger header strip) for depth without gradients.
2. **Add `accentDeep`** = a solid darkened hex of the accent (computed, not gradient) for text-on-tint contrast (e.g. Amber body text on amber tint should be `#8a6c2e`, which the preset already hardcodes for `code` on line 1199 — promote it to the palette).
3. **Add `cardBg`** = a near-paper warm tint (`#faf8f4`-ish, solid) for footer/signature cards so they read as "paper stock," not transparent.
4. **Bump `hairline` to `rgba(26,26,26,0.16)`** — 0.12 is nearly invisible on `#f7f4ef`/white at WeChat's typical render scale.

---

## 4. SVG MODULE-BY-MODULE AUDIT (all 26)

For each: family, render fn, signature, flagship usage, EXACT emitted markup (literal fragments), critique, enhancements. All enhancements respect: solid fills + opacity layering (no gradients/filters), inline-SVG paths for icons (no emoji), locked accents, no deletes/renames, quiet-press ethos, and the `<section>`-block-container key lever.

### 4.1 primitives.ts — shared emitters (not modules, but every module's literal output comes from here)

| fn | signature | emits (literal) |
|---|---|---|
| `escapeXml` | `(s)=>string` | XML-escapes `& < > " '` |
| `rect` | `(RectOpts)=>string` | `<rect x="" y="" width="" height="" rx="" ry="" fill="" stroke="" stroke-width="" opacity="" transform="" />` |
| `circle` | `(CircleOpts)=>string` | `<circle cx="" cy="" r="" fill="" stroke="" stroke-width="" opacity="" />` |
| `path` | `(d, PathOpts)=>string` | `<path d="" fill="none" stroke="" stroke-width="" stroke-linecap="" opacity="" transform="" />` (fill defaults `'none'`) |
| `hairlineRule` | `({x,y,width,height?=1,fill,opacity?})=>string` | a 1px-high `rect` (WeChat uses rect not `<line>`) |
| `glow` | `(cx,cy,r,colorSoft)=>string` | a large low-opacity `circle` (filter substitute) |
| `textLine` | `(TextLineOpts)=>string` | `<text x="" y="" fill="" font-size="" font-weight="" font-family="" text-anchor="" letter-spacing="" opacity="">escaped</text>` |
| `diamond` | `(cx,cy,r,fill,opacity?)=>string` | `<path d="M{cx},{cy-r} L{cx+r},{cy} L{cx},{cy+r} L{cx-r},{cy} Z" fill="" />` |
| `diamondSig` | `({cx,cy,r,fill,gap?})=>string` | three diamonds at `-1,0,1 * gap` → ◇◇◇ |
| `svgSection` | `({moduleId,viewBoxW,viewBoxH,body,sectionStyle?,svgStyle?})=>string` | `<section data-ink-svg="{id}" style="{sectionStyle\|\|'margin:24px 0;'}"><svg xmlns=… viewBox="0 0 W H" width="100%" style="display:block;{svgStyle}">{body}</svg></section>` |
| `hiddenFulltext` | `(text)=>string` | `<p style="height:0;line-height:0;font-size:0;color:transparent;overflow:hidden;">…</p>` |
| `mpStyleTrailer` | `()=>string` | `<p style="display:none;"><mp-style-type data-value="10000"></mp-style-type></p>` |
| `darkSafeBg` | `(w,h,color)=>string` | full-canvas opaque `rect({x:0,y:0,width:w,height:h,fill:color})` |
| `smilAnimate`/`smilSet`/`smilAnimateTransform` | SMIL emitters | `<animate …/>`, `<set …/>`, `<animateTransform attributeName="transform" …/>` |

**Critique:** `svgSection`'s default `sectionStyle = 'margin:24px 0;'` is the smoking gun — **the wrapper that WeChat keeps `background-color`/`border`/`padding`/`border-radius` on is styled with margin only.** This single default makes every module a transparent floating graphic. `path` defaults `fill:'none'` which biases the whole system toward outline/stroke art (thin look).

**Concrete enhancements (primitives = system-wide leverage):**
1. **Add a `cardSection()` (or extend `svgSection` with a `card?: {bg, border, radius, pad}` option)** that emits `<section data-ink-svg="{id}" style="background-color:<tint>;border-radius:12px;padding:20px 24px;margin:22px 0;">`. Adopting this in headers/quotes/endmarks instantly converts "floating graphic" → "designed card" with zero SVG-geometry change.
2. **Add a `solidBand({x,y,w,h,fill})` helper** = full-opacity accent rect, to encourage solid backing instead of hairlines.
3. **Add a `nibMark()` brand glyph primitive** (the vessel/nib motif, reusable) so headers/dividers can carry a tiny brand icon (inline path, not emoji) for cohesion.
4. **Add `roundedTopBar()`** (an accent rect with only top corners rounded) for filled section-header strips that sit flush above body text.

---

### 4.2 covers.ts (family `cover`) — 1080×620 banner

#### `renderCoverTitle` → id `cover-title`
- **Signature:** `(p: SvgModuleParams) => string`. **Used by:** flagship-tempera, flagship-amber.
- **Emits:** `darkSafeBg(1080,620, paperWarm '#f7f4ef')` + top hairline `rect x=80 y=96 w=200 h=2 fill=accent` + title `<text>` lines at `x=80 y=270` step 116, `font-size=96 font-weight=700` fill `ink #1a1a1a`, font `-apple-system,"PingFang SC","Source Han Sans",sans-serif`, `letter-spacing=2` + optional subtitle `<text x=80 font-size=30 fill=inkSoft>` + bottom-right `diamond(970,528,14,accent)` + bottom hairline `rect x=80 y=540 w=920 h=1 fill=hairline`.
- **Critique:** A 96px black title on warm paper with a single 14px diamond and two hairlines = elegant but **empty and indistinguishable from a default serif cover**. No color block, no brand anchor, accent appears only as a 2px line + a tiny diamond. Reads as "blank page with big text."
- **Enhancements:** (1) Add a **solid accent side-bar** (`rect x=0 y=0 w=14 h=620 fill=accent`) as a publication spine — bold, tasteful, single confident accent. (2) Add a **kicker label** above the title in a small filled accent pill (`rect rx=4 fill=accent` + `onAccent` text, e.g. category/issue No.) — strong hierarchy. (3) Replace the lone diamond with the **vessel/nib brand mark** (reuse `endmark-vessel` geometry, scaled) bottom-right for brand identity. (4) Add a **second-opacity tint block** behind the subtitle (`rect fill=accentTint`) so the subtitle sits on a faint card. (5) Wrap the whole `<section>` with `background-color:#f7f4ef;padding:0` so the warm paper extends edge-to-edge as a real banner card.

#### `renderCoverGrid` → id `cover-grid`
- **Used by:** flagship-kiln.
- **Emits:** `darkSafeBg(1080,620, paper '#ffffff')` + 5 vertical + 3 horizontal 1px `hairline` grid rects + 4 border rects (1px hairline frame, inner 80) + `circle cx cy r=8 fill=accent` at col2×row1 intersection + title `<text>` `font-size=84 font-weight=700` fill `ink` at `x=104 y=310` step 104 + optional subtitle `font-size=28 fill=inkSoft`.
- **Critique:** A 1px `rgba(26,26,26,0.12)` grid on white is **almost invisible** at WeChat scale; the single 8px accent dot is the only color. This is the most "GitHub-to-WeChat" of all — a faint grid + black text. The constructivist intent doesn't survive the low opacity.
- **Enhancements:** (1) Make the **frame a solid accent rule** (one or two edges at full accent, 3-4px) instead of a 1px hairline frame — the "press" look. (2) Fill **one grid cell** with `accentTint` as a solid color block (constructivist accent block, no gradient). (3) Bump grid lines to `hairline@0.18` or use `accentSoft` for select lines so the grid actually reads. (4) Add a filled **kicker pill** + larger accent corner mark. (5) Section wrapper `background-color:#ffffff;border:1px solid <hairline>` to define the banner edge.

#### `renderCoverQuote` → id `cover-quote`
- **Used by:** none of the three flagships (registered but unwired). Available module.
- **Emits:** `darkSafeBg(…paperWarm)` + two `quoteBlock` paths (`fill=accentSoft`, ~70×84 each) + lead-in `<text>` lines `font-size=48 font-weight=500` fill `ink`, serif stack + `hairlineRule(140,…,80,2,accent)` + attribution `<text>` `'— '+subtitle` `font-size=26 fill=inkSoft`.
- **Critique:** The big quote glyph is `accentSoft` (0.08-0.12) → a ghost. Reads faint. Otherwise the most "designed" cover but undercut by the faint mark.
- **Enhancements:** (1) Paint the quote glyph at **full accent** (or `accentBand@0.16`) so it carries weight. (2) Wrap quote in a `paperWarm` `<section>` card with `border-left:6px solid accent`. (3) Add a solid accent attribution rule. (4) Wire it into a flagship variant so it's not dead code.

---

### 4.3 headers.ts (family `header`) — 1080×(160-220)

#### `renderBadgeNum` → id `header-badge-num` (VBW 1080, VBH 180)
- **Signature:** `(p)=>string` (uses `p.text`, `p.index`). **Used by:** none of the three flagships (registered, unwired).
- **Emits:** `circle cx=90 cy=90 r=50 fill=accent` + number `<text anchor=middle fill=onAccent font-size=44/40/32 (by digits) font-weight=700>` + title `<text x=180 y=108 font-size=52 font-weight=600 fill=ink letter-spacing=1>` + `hairlineRule(180,152,860,fill=hairline)`.
- **Critique:** The accent circle is the only color; title sits on white with a faint hairline under it. "Enterprise" but minimal. Hairline barely visible.
- **Enhancements:** (1) Put the whole header in a **filled-strip `<section>`** (`background-color:accentTint;border-left:4px solid accent;padding`) so the H2 reads as a bar. (2) Thicken the underline to a 3px accent rule. (3) Add a small section number kicker. (4) Right-align a faint section progress tick row.

#### `renderBracket` → id `header-bracket` (VBH 220)
- **Used by:** flagship-tempera (h2).
- **Emits:** 4 `bracketCorner` paths (L-shaped, `stroke=accent stroke-width=4 stroke-linecap=square fill=none`, len 60, inset 40) + centered title `<text anchor=middle font-size=56 font-weight=600 fill=ink letter-spacing=2>`.
- **Critique:** Four thin 4px corner brackets around centered black text = tasteful but **very light**; on a phone the brackets read as faint pencil ticks. Pure outline, no fill, no color block — quintessential "thin."
- **Enhancements:** (1) Add a **faint `accentTint` fill rect inside the bracket frame** (solid color block backing the title — depth without gradient). (2) Thicken brackets to 5-6px and/or extend their length for presence. (3) Color the title in accent (Tempera) for confident single-accent use. (4) Wrap section with `paperWarm` background so the frame sits on stock. (5) Add a tiny center nib mark above the title.

#### `renderRibbon` → id `header-ribbon` (VBH 180)
- **Used by:** flagship-kiln (h2). **This is the ONE module that already uses a solid fill bar.**
- **Emits:** `rect x=24 y=40 width=1032 height=100 fill=accent` + centered title `<text anchor=middle font-size=48 font-weight=600 fill=onAccent letter-spacing=2>`.
- **Critique:** Actually the strongest header — a solid accent bar with onAccent text. But it's a **plain rectangle**: no rounded corners, no kicker, no secondary strip, no brand mark. It's a flat block, one step above a CSS `background` h2. Square hard edges feel utilitarian.
- **Enhancements:** (1) **Round corners** (`rx=8`) and add a thin `paperWarm` inset/notch for editorial polish. (2) Add a **left accent-deep cap** (a darker solid rect at the bar's left, 12px) for a "tab/spine" look — depth via two solid opacities. (3) Add a small `onAccent` kicker line ("章 / SECTION") above the title within the bar. (4) Optionally extend as a filled `<section>` so the bar bleeds to content width.

#### `renderVRule` → id `header-vrule` (VBH 160/200)
- **Used by:** ALL THREE flagships (kiln h3, tempera h3, amber h2). **Highest-traffic header.**
- **Emits:** `rect x=60 y=barY width=6 height=barH(90/130) fill=accent` + title `<text x=100 y=titleY font-size=50 font-weight=600 fill=ink letter-spacing=1>` + optional subtitle `<text x=100 font-size=28 fill=inkSoft>`.
- **Critique:** A **6px accent vertical bar + black text**. This is *literally* the default CSS `border-left` heading look the user complained about ("no different from GitHub-markdown to WeChat"). Because all three flagships use it (amber uses it for H2, the primary heading!), it dominates the perceived design — and it's the thinnest possible treatment.
- **Enhancements (highest priority — touches every flagship):** (1) Back the title with a **solid `accentTint` block** (`rect fill=accentTint` behind the text, full module width) → instant "filled section header." (2) Thicken the bar to 8-10px and add an `accentDeep` inner sliver. (3) Color the title accent or `accentDeep` for hierarchy. (4) Add an underline accent rule beneath the title. (5) Promote amber's H2 use to `header-ribbon` (filled bar) and keep vrule for H3 only, so the primary heading carries more weight.

---

### 4.4 dividers.ts (family `divider`) — 1080×60

#### `renderGrid` → id `divider-grid`
- **Used by:** flagship-amber. **Emits:** baseline `hairlineRule(280,30,520,hairline)` + tick `rect`s (1px wide, 8px tall, `fill=ink opacity=0.35`, gap 80) + one long accent tick `rect 1×28 fill=accent` + optional centered label `font-size=16 letter-spacing=4 fill=inkSoft opacity=0.7`.
- **Critique:** Hairline + 1px ticks = extremely faint ruler. The "accent long tick" is a single 1px line. Nearly invisible. The most minimal divider.
- **Enhancements:** (1) Make the long tick a **solid accent block** (4-6px wide). (2) Add a small filled accent diamond or nib at center. (3) Bump tick opacity / use accentSoft. (4) Optionally a thin `accentTint` band behind the whole ruler.

#### `renderDots` → id `divider-dots`
- **Used by:** none (registered). **Emits:** 5 circles centered: outer `r=2 hairline`, inner `r=3 ink@0.4`, center `r=4 accent` (gap 22).
- **Critique:** Tiny faint dots; center accent dot is 4px. Minimal but acceptable as a quiet break; just very small.
- **Enhancements:** (1) Enlarge center accent dot + add a thin accent ring. (2) Use a diamond instead of circle for brand cohesion. (3) Add flanking solid short accent rules.

#### `renderFade` → id `divider-fade`
- **Used by:** none. **Emits:** 21 segments of `rect w=24 h=1 fill=ink opacity=0.85*(1-d)` (faux gradient via stepped opacity; segments with op≤0.02 skipped).
- **Critique:** Clever no-gradient fade, but it's a **1px-tall ink fade** — whisper-thin and grayscale, no brand color at all.
- **Enhancements:** (1) Use `accent` instead of ink for the segments so the fade carries brand color. (2) Make the central segments 2-3px tall for a tapered-rule look. (3) Add a center diamond anchor.

#### `renderDiamond` → id `divider-diamond`
- **Used by:** flagship-tempera. **Emits:** `diamondSig({cx:540,cy:30,r:5,fill:accent,gap:15})` (◇◇◇) + two `hairlineRule` 360px wide flanks (`fill=hairline`) + optional label.
- **Critique:** ◇◇◇ accent + two faint hairlines. The diamonds are 5px; hairlines 1px@0.12. Tasteful brand signature but very light.
- **Enhancements:** (1) Solid the flanking rules (2px accent or `accentSoft`). (2) Enlarge center diamond, flank with smaller ones (size hierarchy). (3) Fill center diamond accent, side diamonds `accentSoft`.

#### `renderForge` → id `divider-forge` (the one ember user)
- **Used by:** flagship-kiln. **Emits:** `glow(540,30,18,accentSoft)` halo + 2 `hairlineRule` 380px flanks (`fill=hairline`) + `circle cx=540 cy=30 r=3 fill=ember(#c9362c)` (the single ember dot) + optional label.
- **Critique:** Ember dot is **3px**; halo is `accentSoft` (0.08-0.12, ~invisible). The signature "forge" moment is a barely-visible speck. Underwhelming for a branded divider.
- **Enhancements:** (1) Enlarge ember dot + give it a solid accent ring (two concentric solid circles, no filter). (2) Make the halo a slightly stronger solid `rgba(ember,0.10)` larger circle so it actually glows. (3) Thicken/lengthen the flanking rules with a tapered center. (4) Keep ember-≤1 discipline (still one ember element, just larger).

---

### 4.5 quotes.ts (family `quote`) — 1080×(160+64*lines)

Shared: `wrapCjkLines` (~18 CJK/line, ≤4 lines, … truncation), `QUOTE_FONT=38`, `SUBTITLE_FONT=26`, serif `SAFE_FONT_STACK`, `computeHeight = 160 + lines*64`.

#### `renderQuoteCorner` → id `quote-corner`
- **Used by:** flagship-tempera. **Emits:** top-left + bottom-right corner `path`s (`stroke=accent stroke-width=6 stroke-linecap=square fill=none`, ~80×80) + quote `<text>` lines `font-size=38 fill=ink` (serif) + attribution `<text anchor=end fill=inkSoft font-size=26>`.
- **Critique:** Two thin 6px accent corners around black serif text on a **transparent** canvas. No fill, no card — the quote floats. Identical in spirit to the bracket header: outline-only, thin.
- **Enhancements:** (1) **Tinted card lever:** set `sectionStyle` to `background-color:<accentTint>;border-radius:12px;padding` so the quote sits in a real card. (2) Add a faint full-bleed accent corner triangle (solid `path fill=accentSoft`) behind the corner marks for depth. (3) Color the attribution accent. (4) Thicken corners or add an oversized solid quote glyph.

#### `renderQuoteVbar` → id `quote-vbar`
- **Used by:** flagship-amber. **Emits:** `rect x=60 y=40 width=8 height=barH fill=accent` + quote `<text x=100>` lines `font-size=38 fill=ink` + attribution `<text x=100 fill=inkSoft>`.
- **Critique:** An **8px accent vertical bar + serif text on transparent** = exactly the default CSS blockquote look the user is tired of. The most "plain blockquote" of the set. Used by amber as its only quote.
- **Enhancements (high priority):** (1) **Tinted-card `<section>`** (`background-color:accentTint;border-left:8px solid accent;border-radius:0 10px 10px 0;padding:18px 24px`) — this is THE canonical premium quote card. (2) Add a large solid accent quote glyph top-left. (3) Color the attribution in `accentDeep`. (4) Add a hairline rule above attribution.

#### `renderQuoteMark` → id `quote-mark`
- **Used by:** flagship-kiln. **Emits:** big decorative `path markD` (66-style quote, `fill=accentSoft`) at top-left + quote `<text x=80 yStart=280>` `font-size=38 fill=ink` + attribution. `viewBox` height bumped +140 for the mark.
- **Critique:** The big quote glyph is `accentSoft` (0.08-0.12) → **a ghost**. So it reads as black text with a faint blob. The most-promising decorative idea, killed by opacity.
- **Enhancements:** (1) Paint the glyph at **`accentBand@0.16`-0.22 or full accent** so it's a confident mark. (2) Wrap in a `paperWarm` card section. (3) Add a solid accent rule under the attribution. (4) Mirror a second faint glyph bottom-right.

#### `renderQuoteCard` → id `quote-card` (THE ONLY module using the block-container lever today)
- **Used by:** none of the three flagships (registered, unwired). **Emits:** `rect rx=20 ry=20 fill=paperWarm stroke=hairline stroke-width=1` + quote text + attribution, **with `sectionStyle = 'margin:24px 0;box-shadow:0 12px 28px <accentSoft>, 0 2px 6px <hairline>;border-radius:20px;'`** via `boxShadowFor(palette)`.
- **Critique:** This is the **template** for what the others should do — it actually styles the `<section>` (box-shadow + radius). But the shadow color is `accentSoft` (0.08-0.12 → very soft shadow) and the card fill is `paperWarm` only (no accent tint), so it's tasteful but understated. Crucially, **it's not wired into any flagship.**
- **Enhancements:** (1) **Wire it into a flagship** (or make it the default quote). (2) Add a solid `accentTint` header strip inside the card or a `border-left:6px solid accent`. (3) Strengthen the shadow a touch. (4) Add a brand nib mark in the card corner. `boxShadowFor` is the proof box-shadow on `<section>` survives WeChat — generalize it into the shared `cardSection` helper.

---

### 4.6 badges.ts (family `badge`) — 1080×140 (none wired into flagships; runtime-asserted via `safe()`)

#### `renderBadgeNum` → id `badge-num`
- **Emits:** `circle cx cy=70 r=36 fill=accent` + number `<text anchor=middle fill=onAccent font-size=44/38/32>` + optional label `<text fill=ink font-size=38 letter-spacing=1>`.
- **Critique:** Solid accent circle (good) but label on transparent; whole thing floats. Fine as a numbered marker, plain as a feature.
- **Enhancements:** (1) Put on a tinted card section. (2) Add an underline rule. (3) Larger label hierarchy.

#### `renderBadgeKpi` → id `badge-kpi`
- **Emits:** `rect rx=14 ry=14 fill=accentSoft stroke=accent stroke-width=1` card (360×110) + top `hairlineRule` + big value `<text fill=accent font-size=48>` + sub `<text fill=inkSoft font-size=22>`.
- **Critique:** `accentSoft` fill is faint; 1px accent border. Reads as an outline chip, not a confident stat card.
- **Enhancements:** (1) Use stronger `accentTint`/`accentBand` fill + 2px accent border or a solid accent top strip. (2) Value in `accentDeep`. (3) Section-level card styling. (4) Add a small unit/label kicker.

#### `renderBadgeTag` → id `badge-tag`
- **Emits:** pill `rect rx=tagH/2 fill=accentSoft stroke=hairline stroke-width=1` + label `<text anchor=middle fill=accent font-size=32 letter-spacing=2>`.
- **Critique:** Pale pill (`accentSoft` + hairline border). Looks like a disabled chip.
- **Enhancements:** (1) Solid accent pill with `onAccent` text (a confident tag), OR stronger tint + accent text + accent border. (2) Add a leading nib/dot. (3) Offer a "filled" vs "outline" variant param.

---

### 4.7 endmarks.ts (family `endmark`) — 1080×200

#### `renderFin` → id `endmark-fin`
- **Used by:** flagship-tempera. **Emits:** `diamondSig({cx:540,cy:70,r:7,fill:accent,gap:28})` (◇◇◇) + `<text x=540 y=138 anchor=middle fill=inkSoft font-size=30 letter-spacing=8>` (default "全文完").
- **Critique:** ◇◇◇ + gray small-caps text. Tasteful, restrained — but generic; could be any blog footer. No brand, no card.
- **Enhancements:** (1) Put in a footer **signature card** `<section background-color:paperWarm/accentTint;border-radius>`. (2) Larger center diamond, accent the text. (3) Add a thin solid accent rule above.

#### `renderVessel` → id `endmark-vessel` (brand mark, single ember user)
- **Used by:** flagship-kiln. **Emits:** ding outline `path (fill=none stroke=ink stroke-width=1.8)` + belt `path (stroke=hairline 1)` + two ear `rect`s (`fill=none stroke=ink 1.6`) + 3 leg `path`s (`stroke=ink 1.8 linecap=round`) + nib `path (fill=accent)` + nib slit `path (stroke=paper 0.8 opacity=0.85)` + grid square `rect (fill=none stroke=ink 1.4)` + grid cross paths (`stroke=hairline 0.8`) + ember dot `<circle r=2.4 fill=ember>` + sig hairline (180px) + sig `<text fill=inkSoft font-size=22 letter-spacing=4>` (default "InkForge · 墨铸").
- **Critique:** Beautiful brand mark but rendered in **0.8-1.8px strokes** — it's a tiny pencil-line etching. At WeChat scale the whole vessel reads as faint gray scratches; the only fill is the accent nib. This is the brand moment and it's whisper-thin.
- **Enhancements:** (1) **Thicken all strokes** (ding 2.5-3px, legs 2.5px) for presence. (2) Fill the ding body with `accentTint` (solid) so the vessel reads as a shape, not an outline. (3) Enlarge + solid the ember "铸" dot with a ring. (4) Put the whole mark + signature in a centered footer card `<section background-color:paperWarm>`. (5) Color the grid square accent.

#### `renderRule` → id `endmark-rule`
- **Used by:** flagship-amber. **Emits:** `hairlineRule(460,92,160,1,hairline)` + `<text x=540 y=140 anchor=middle fill=inkSoft font-size=26 letter-spacing=10>` (default "全文完").
- **Critique:** A 1px 160px hairline + gray text. **The single thinnest endmark** — used by amber, so the business flagship ends on a near-invisible line. Maximally plain.
- **Enhancements:** (1) Footer signature **card** with `accentTint` background. (2) Replace hairline with a short solid accent rule + center diamond. (3) Accent the text or add a small nib mark. (4) Add the brand name line.

---

### 4.8 interactive.ts (family `interactive`) — SMIL/scroll (none wired into the three flagships)

#### `renderClickSwitch` → id `i-clickswitch` (W×320)
- **Emits:** `card rect rx=18 fill=paperWarm stroke=hairline` + `topRule hairline 160×2 fill=accent` + title `<text font-size=52 fill=ink>` + corner `diamond(…,11,accent)`; motion: two `<g opacity>` frames + `smilAnimate opacity 1;0 / 0;1 begin="click" fill="freeze" restart="never"` + transparent hot `rect ... pointer-events="visible"`; hint `<text fill=inkSoft>` "轻点切换".
- **Critique:** Frame is a `paperWarm` card with hairline border + tiny accent line + 11px diamond. Same thin vocabulary; interactivity doesn't fix the flat visual.
- **Enhancements:** (1) Stronger card (accentTint header strip / accent border). (2) Solid accent "切换" affordance chip. (3) Bigger corner brand mark.

#### `renderScrollCards` → id `i-scrollcards`
- **Emits:** outer rail `<section style="margin:24px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;white-space:nowrap;scroll-snap-type:x mandatory;…">` + per-item inline-block `<section style="display:inline-block;width:86%;margin-right:3%;scroll-snap-align:center;vertical-align:top;">` wrapping an inner `<svg viewBox width="100%">` card (`bg rect rx=22 fill=paperWarm stroke=hairline` + 2-digit index `<text fill=accent font-size=44>` + accent rule + title + body `<text fill=inkSoft>` + corner diamond).
- **Critique:** Good UX pattern (pure CSS scroll-snap, no flex), but each card is the same pale paperWarm + hairline + faint accent. **Note this is the one module that proves rich inline styles on `<section>` (`overflow-x`, `scroll-snap-type`, `inline-block`, `width%`, `margin%`) survive WeChat** — strong evidence the block-container lever is wide open.
- **Enhancements:** (1) Solid accent index strip per card. (2) Alternate card tints. (3) Page-dot indicator row (solid accent dots). (4) Card border/shadow via section style.

#### `renderFadeIn` → id `i-fadein` (W×260)
- **Emits:** `card rect rx=18 fill=paperWarm stroke=hairline` + accent topRule + title `<text font-size=48 fill=ink>` + corner diamond; motion: `<g opacity=0>` + `smilAnimate opacity 0;1 dur=0.8s begin="0s" fill="freeze"`.
- **Critique:** Same pale card; the fade is the only feature.
- **Enhancements:** Same card-strengthening as above; add a staged fade for the accent strip.

#### `renderSequence` → id `i-sequence` (W×300)
- **Emits:** 3 `<g>` frames, each `card rect rx=18 fill=paperWarm stroke=hairline` + 2-digit num `<text fill=accent>` + accent rule + title `<text font-size=50 fill=ink>`; motion via `smilAnimate opacity discrete dur=0.01s begin=0s/1.2s/2.4s fill="freeze" restart="never"`.
- **Critique:** Same pale card vocabulary; the sequencing is fine but visually flat.
- **Enhancements:** Strong per-frame accent header strip; progress dots; bolder numerals in `accentDeep`.

#### Other interactive exports
- `renderClickSwitch`/`renderScrollCards`/`renderFadeIn`/`renderSequence` are also re-exported individually + as `__interactiveRenderers` (test hooks). `covers.ts` exports `__renderers` similarly.

---

## 5. index.ts / inject.ts exported registry functions

| Export | Signature | Role |
|---|---|---|
| `SVG_MODULES` | `SvgModuleSpec[]` (26) | all modules: 4 header + 5 divider + 4 quote + 3 badge + 3 endmark + 3 cover + 4 interactive |
| `SVG_MODULE_REGISTRY` | `Record<string, SvgModuleSpec>` | id→spec |
| `getSvgModule` | `(id)=>SvgModuleSpec\|undefined` | used by inject.ts |
| `getSvgModulesByFamily` | `(family)=>SvgModuleSpec[]` | family filter |
| `composeSvgDecorate` | `(plan, opts)=>(html,target)=>string` | **the flagship decorate hook**; replaces hN/hr/blockquote, prepends cover, appends endmark |
| `chainSvgDecorators` | `(...fns)=>(html,target)=>string` | compose decorators |
| `extractText` | `(innerHtml)=>string` | strips tags/entities for SVG `<text>` |
| `SvgInjectionPlan` / `SvgDecorateOptions` | interfaces | plan + opts (incl. `rasterize` callback seam for xhs/zhihu) |

**Critique:** `composeSvgDecorate` is the right seam to add premium block containers — it already has the HTML at the point WeChat-safe is guaranteed. Today it only swaps in SVG modules. It does **not** add any HTML callout/note/key-sentence containers, and it does not pass any "card style" to modules.

**Concrete enhancements (decorator seam — highest leverage, touches all flagships at once):**
1. **Add a `paragraphCallout`/`noteBox` plan field** that wraps `> [!NOTE]`-style blockquotes (or a marked paragraph) in a tinted `<section style="background-color:<tint>;border-left:4px solid <accent>;border-radius:0 10px 10px 0;padding:16px 20px;margin:20px 0;">` — the single most "designed account" element, pure HTML, fully safe.
2. **Add a `keySentence` field** that highlights the first `<strong>` per section in an inline tinted span.
3. **Pass `card: true` through `SvgModuleParams`** so modules (via the new `cardSection` primitive) render their `<section>` as a tinted card consistently.
4. **Add a footer signature `<section>` card** around `endmark` output (background paperWarm/accentTint) instead of bare margin.

---

## 6. Cross-cutting recommendations (ranked by impact)

1. **Raise the tint floor in `deriveSvgPalette`** — add `accentTint (~0.10)`, `accentBand (~0.16)`, `accentDeep` (solid darkened hex), `cardBg`; bump `hairline` to ~0.16. Everything downstream gets richer for free.
2. **Style the `<section>` wrapper** — extend `svgSection`/add `cardSection` so module wrappers carry `background-color`/`border`/`border-radius`/`padding`. `quote-card` + `i-scrollcards` already prove these survive WeChat.
3. **Fix the three highest-traffic thin modules first:** `header-vrule` (all 3 flagships), `quote-vbar` (amber), `quote-mark`/`divider-forge` (kiln) — convert to filled tint cards / full-strength accents.
4. **Add HTML block-container elements via `composeSvgDecorate`:** note/callout boxes, key-sentence highlights, footer signature card — the core gap per the brief.
5. **Add `'section'` to `DARKMODE_TARGETS`** in wechat.ts so the new tinted cards survive WeChat dark mode.
6. **Thicken brand strokes** (`endmark-vessel`, brackets, dividers) and **strengthen brand moments** (ember dot in `divider-forge`, quote glyph in `quote-mark`/`cover-quote`).

## Caveats / Not Found
- Spec/header say "17 rules"; code ships **18** (see §1). Confirm against `prompts/0601/SPEC.md §4.2` before citing a count.
- `cover-quote`, `header-badge-num`, all 3 badges, and all 4 interactive modules are **registered but NOT wired into any of the three flagship plans** — they're available modules, not part of the current flagship visual. Enhancing them won't change flagship output unless also wired in.
- Amber `#C19A56` `onAccent`=white contrast (header-ribbon/table th) is borderline AA (~2.6:1) — not verified against a tool here; flag for a contrast check.
- `clampContentWidth` emits a `<div>` at the article level (safe there; WeChat rewrites div→section), but do NOT reuse that pattern inside SVG modules (rule 5 forbids div in module output).
- I did not run the test suite in `svg-modules/__tests__`; the "emits exactly" fragments above are read from source, not from snapshot fixtures.
