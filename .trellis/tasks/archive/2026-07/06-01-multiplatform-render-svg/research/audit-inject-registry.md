# Research: WeChat inline-SVG typesetting subsystem audit (inject / registry / interactive / raster) + premium-upgrade plan

- **Query**: Audit `svg-modules/{inject,index,interactive,raster}.ts` + the 26 modules they wire; for every exported fn document signature, preset usage, literal emitted markup, and a blunt critique + 3–5 WeChat-safe enhancement ideas. Core gap = output is "too plain, no different from GitHub-markdown→WeChat".
- **Scope**: internal
- **Date**: 2026-06-02

## How the system is wired (read this first)

`composeSvgDecorate(plan, opts)` (inject.ts) returns a `(html, target) => string` decorator that finds anchors in the post-DOMPurify HTML and REPLACES them with module SVG, or PREPENDS/APPENDS cover/endmark. The `plan` is an `SvgInjectionPlan` declaring which module id fills each slot. The three flagship presets (themes.ts:87-117, 1143/1176/1209) are the ONLY production consumers:

| Preset (persona) | primaryColor | cover | H2 | H3 | hr | blockquote | endmark |
|---|---|---|---|---|---|---|---|
| **flagship-kiln** (creative) | `#D95B3F` kiln | `cover-grid` | `header-ribbon` | `header-vrule` | `divider-forge` | `quote-mark` | `endmark-vessel` |
| **flagship-tempera** (academic) | `#3B7A6B` tempera | `cover-title` | `header-bracket` | `header-vrule` | `divider-diamond` | `quote-corner` | `endmark-fin` |
| **flagship-amber** (business) | `#C19A56` amber | `cover-title` | `header-vrule` | — | `divider-grid` | `quote-vbar` | `endmark-rule` |

Key consequences for the critique:
- **`palette.accent` = the preset primaryColor** (deriveSvgPalette, theme.ts:67). So kiln modules are kiln-red, tempera green, amber gold automatically.
- **`accentSoft` alpha = 0.12 for creative/lifestyle, 0.08 for academic/business** (theme.ts:69). That is the ONLY tint currently in the whole system — and it is so faint (8–12% on a hairline-bordered white card) it reads as "no fill at all". This is the #1 reason output looks plain.
- **`paperWarm` = `#f7f4ef`, `paper` = `#ffffff`, `ink` = `#1a1a1a`, `inkSoft` = `rgba(26,26,26,0.55)`, `hairline` = `rgba(26,26,26,0.12)`, `ember` = `#c9362c`.** Note: brand kiln per task spec is `#D95B3F` but `BRAND_TOKENS.emberLight` here is `#c9362c` — the `ember` palette slot is a slightly different red than the kiln accent. Tints must be solid-lightened versions of accent (e.g. `rgba(59,122,107,0.08)`); spec rule (3) is satisfied by `rgba(accent, alpha)`.
- **EVERYTHING is drawn inside `<svg viewBox width="100%">`.** That means almost all "design" is thin vector strokes/hairlines on a transparent canvas. The system barely touches the lever in spec rule (5): WeChat-kept inline `background-color`/`border`/`border-left`/`border-radius`/`padding` on `<section>`/`<p>`. The only places that use a `<section>` style beyond `margin` are `quote-card` (box-shadow+border-radius) and `i-scrollcards` (scroll rail). Net: the page is hairlines floating on white = "markdown with a few SVG dividers". Confirmed root cause.

Cross-cutting safety facts (wechat-safe.ts RULES) every proposal below already respects: no `class`/`<style>`/`var()`/`calc()`/`<div>`/gradient/clip/mask/filter/use/`url(#)`/`style="transform:"`/CSS animation. `<section>` is allowed and KEEPS inline `background`/`border`/`padding`/`border-radius`/`box-shadow`/`margin` (proven by quote-card already shipping `box-shadow:` + `border-radius:` on its section). `transform="..."` as an XML attribute is allowed (rule only forbids `style="transform:"`).

---

## FILE 1 — inject.ts (injection hooks)

### `extractText(innerHtml: string): string` — exported
Strips tags, decodes 6 entities, collapses whitespace. Pure util used to lift `<hN>`/`<blockquote>` text into module `params.text`, and to capture the document H1 for the cover.
- **Markup emitted**: none (returns plain text).
- **Critique / enhancement**: it flattens ALL inline emphasis — `<strong>关键</strong>` becomes "关键" with no weight signal, so a heading that was bolded in source loses hierarchy once it becomes an SVG `<text>`. Enhancement: (a) optionally return a lightweight `{text, emphasisRanges}` so header modules can render an emphasized segment in `accent` color; (b) preserve a leading number like "1. 引言" and feed it to a badge-num-style header automatically; (c) trim a trailing ASCII/CJK colon so ribbon/bracket titles don't show a dangling "：".

### `emit(spec, params, target, opts): string` — internal (not exported)
Calls `spec.render(params)`; if target is xhs/zhihu and `opts.rasterize` provided, hands the SVG to the raster callback. Otherwise returns inline SVG.
- **Markup emitted**: passthrough of the module's own markup.
- **Critique**: it is the single funnel where a "premium wrapper" could be added once for every module (e.g. wrap every emitted block in a tinted `<section>` card for flagship targets) — currently it adds nothing. Enhancement: thread an optional `frame` option (tint/padding/border-radius) through `emit` so a preset can request "card-backed" rendering of any module without touching 26 renderers.

### `composeSvgDecorate(plan: SvgInjectionPlan, opts: SvgDecorateOptions): (html, target) => string` — exported
The orchestrator. Order: (0) capture first `<h1>` text; (1) replace `<hN>` per `plan.headings` with `getSvgModule(...).render`; (2) replace `<hr>`; (3) replace `<blockquote>`; (4) prepend cover (consumes/removes the first `<h1>`, sentinel `data-ink-svg="<id>"` guards re-run); (5) append endmark. `buildThemeContext` derives the palette from `opts.primaryColor`+`persona`.
- **Used by**: all three flagship presets.
- **Markup emitted**: only the concatenation of module outputs; the decorator itself emits no chrome.
- **Critique — THE central gap**: it ONLY touches H1/H2/H3, `<hr>`, `<blockquote>`. It never decorates `<p>`, `<ul>/<li>`, `<h4-6>`, `<pre>/<code>`, `<table>`, or "key sentence" runs. So body copy — the 90% of the article a reader actually sees — is byte-for-byte the same as a plain markdown→WeChat dump. That is exactly the user complaint.
- **Enhancement ideas (WeChat-safe, additive — extend `SvgInjectionPlan`, do NOT rename existing modules)**:
  1. **`calloutBlocks`**: add a plan slot that wraps `<blockquote>`-style or `[!NOTE]`-marked paragraphs in a SOLID tinted `<section>` card via pure inline CSS — `style="background:rgba(59,122,107,0.08);border-left:4px solid #3B7A6B;border-radius:8px;padding:16px 20px;margin:20px 0;"` + an inline-SVG icon path (no emoji) at top-left. This is the single highest-leverage add and needs only one new module + one plan field.
  2. **`leadParagraph`**: detect the first `<p>` after the cover and wrap it in a `paperWarm` (`#f7f4ef`) tinted `<section>` with larger `font-size`/`letter-spacing` inline style → an editorial "导语" block (单读-tier).
  3. **`listStyling`**: map `<ul><li>` to `<section>` rows each with an inline-SVG bullet (a small `accent` diamond/square `<path>`, never a CSS `•`) and a tinted left rule — turns flat bullets into a designed feature list.
  4. **`keySentence`**: a plan field + regex (e.g. `==text==` or `<mark>`) to wrap an emphasized run in an inline `<section>` with `background:rgba(accent,0.12);padding:2px 8px;border-radius:4px` — a highlighter that survives WeChat.
  5. **`h4plus`**: currently H4-H6 fall through untouched; give them a lightweight `header-vrule`-style mini variant so deep structure still reads as designed.
  6. Replace the brittle string `.replace`/regex anchor matching (e.g. nested blockquotes inside lists won't match cleanly) — but that's robustness, not visual; lower priority.

### `chainSvgDecorators(...fns): (html, target) => string` — exported
Left-to-right reduce over decorators. Lets a preset stack the SVG decorator after its CSS-class decorator.
- **Markup emitted**: none of its own.
- **Critique/enhancement**: fine as-is. Enhancement: it would let us ship the new `<p>`/list/callout decorator as a SEPARATE composable pass chained after `composeSvgDecorate`, so we add premium body styling without modifying the existing flagship plans. This is the cleanest delivery vehicle for ideas 1–5 above.

---

## FILE 2 — index.ts (barrel + registry)

### `SVG_MODULES: SvgModuleSpec[]` — exported const
Concatenates `headerModules`(4) + `dividerModules`(5) + `quoteModules`(4) + `badgeModules`(3) + `endmarkModules`(3) + `coverModules`(3) + `interactiveModules`(4) = **26**.
- **Critique**: families are skewed toward *separators* (dividers 5, headers 4, quotes 4) and away from *body-content containers* (callout/note/tip/warning cards = 0, feature-list = 0, lead/导语 = 0, footer signature CARD = 0; endmarks are tiny centered marks, not cards). The registry composition itself reflects the "plain" problem: there is no module whose job is a solid-color filled content box.
- **Enhancement**: add a new `callout` (or `panel`) family — e.g. `callout-note`, `callout-tip`, `callout-warning`, `callout-quote-card`, `panel-lead`, `panel-keyline`, `footer-card` — all built as inline-styled `<section>` containers (solid tint background + border-left + radius + padding) carrying inline-SVG icon paths. Register via the existing `interactiveModules`-style pattern (push into `SVG_MODULES`). Spec rule (4) honored: pure addition.

### `SVG_MODULE_REGISTRY: Record<string, SvgModuleSpec>` — exported const
`Object.fromEntries(SVG_MODULES.map(m => [m.id, m]))`. id→spec lookup.

### `getSvgModule(id): SvgModuleSpec | undefined` — exported
Registry lookup used by inject.ts to resolve plan ids.

### `getSvgModulesByFamily(family): SvgModuleSpec[]` — exported
Filter by `family`. Currently unused in the production path (only tests). Enhancement: a preset could randomly/round-robin pick a header variant per H2 via this, so a long article doesn't repeat the identical ribbon 8 times — variety is a cheap premium signal.
- **Markup emitted by all four**: none (data plumbing).

---

## FILE 3 — interactive.ts (4 SMIL/scroll modules, `i-*`)

Shared: `W=1080`, `FONT_STACK='-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'`. `splitLines()` and `frameTitle()` are internal helpers. NONE of these `i-*` modules are referenced by any flagship plan — they are registered but **dormant in production** (no preset wires them). That itself is worth flagging: the only "wow" family ships disabled.

### `renderClickSwitch(p): string` → module `i-clickswitch` (interactive:true)
- **Emits**: `svgSection(viewBoxW=1080, viewBoxH=320)`. Each frame = `rect{x:60,y:50,width:960,height:220,rx:18,ry:18,fill:paperWarm,stroke:hairline,strokeWidth:1}` + `hairlineRule{x:100,y:96,width:160,height:2,fill:accent}` + centered title `<text>` `fontSize:52,fontWeight:600,letterSpacing:2,fill:ink` + corner `diamond(970,234,11,accent)`. Motion: two `<g opacity>` frames with `<animate attributeName="opacity" values="1;0"/"0;1" dur="0.4s" begin="click" fill="freeze" restart="never"/>` + transparent `<rect ... fill="transparent" pointer-events="visible"/>` hotzone + hint `<text>轻点切换 fontSize:22 fill:inkSoft>`. Static fallback: frame A only.
- **Critique**: it's a white card with one 160px hairline and a tiny corner diamond — the SAME visual recipe as i-fadein and the quote-card. The 2px accent rule is the only color; on a white WeChat feed it looks like an empty box. "Click to flip" has no affordance beyond 22px gray text.
- **Enhancements**: (1) back the card with a SOLID accentSoft fill (`rgba(accent,0.10)`) instead of `paperWarm`, and put a SOLID accent header bar (filled `rect` h≈64 with `onAccent` label) so the card has a strong top zone; (2) replace the lone corner diamond with a real inline-SVG "tap/flip" icon path (two overlapping rounded squares) in accent — gives affordance without emoji; (3) add a filled accent "A / B" pill indicator (two small `rect rx` pills, active one solid accent, inactive hairline) so state is legible; (4) increase top rule to a 6px accent block flush-left as a masthead, matching header-vrule language for consistency.

### `renderScrollCards(p): string` → module `i-scrollcards` (interactive:true)
- **Emits**: outer `<section data-ink-svg="i-scrollcards" style="margin:24px 0;overflow-x:auto;...white-space:nowrap;scroll-snap-type:x mandatory;...">`; each card = `<section style="display:inline-block;white-space:normal;width:86%;margin-right:3%;scroll-snap-align:center;vertical-align:top;">` wrapping an inner `<svg viewBox="0 0 760 460" width="100%">` with `rect{...rx:22,fill:paperWarm,stroke:hairline,sw:1}` + index `<text>` `01` `fontSize:44,fontWeight:700,fill:accent` + `hairlineRule width:96 fill:accent` + title `<text> fontSize:46 fill:ink` + body `<text> fontSize:28 fill:inkSoft` + `diamond(690,400,10,accent)`.
- **Critique**: this is the ONE module that uses the WeChat container lever (inline-block sections + scroll-snap) — good. But each card is again paperWarm + hairline border + tiny diamond = pale. The "01" index in accent is the only color accent.
- **Enhancements**: (1) give each card a SOLID-fill header band (`rect` top strip h≈90, fill accent, with `onAccent` index + title) so cards read as designed tiles; (2) alternate card fills (`accentSoft`/`paperWarm`) for rhythm; (3) add a real inline-SVG number-badge circle (filled accent) instead of bare "01" text; (4) add a faint inline-styled `box-shadow` on the card `<section>` (allowed, same as quote-card) for depth: `box-shadow:0 8px 20px rgba(accent,0.10)`.

### `renderFadeIn(p): string` → module `i-fadein` (interactive:true)
- **Emits**: `svgSection(1080×260)`. `rect{x:60,y:40,w:960,h:180,rx:18,fill:paperWarm,stroke:hairline,sw:1}` + `hairlineRule{x:100,y:86,w:160,h:2,fill:accent}` + centered title `<text> fontSize:48 fontWeight:600 fill:ink` + `diamond(970,190,11,accent)`. Motion: `<g opacity="0">` + `<animate opacity 0;1 dur=0.8s begin=0s fill=freeze>`. Static: opacity 1.
- **Critique**: literally the i-clickswitch card minus the second frame — third instance of the identical pale-white-card recipe. A fade-in on a colorless box is imperceptible as "premium".
- **Enhancements**: (1) make it a real attention/lead card with SOLID accent left-bar (`rect w:8 fill:accent`) + accentSoft body fill; (2) animate a SOLID accent underline growing via `<animate>` on a `rect`'s `width` (0→160) under the title — motion that reads; (3) drop the generic diamond for an inline-SVG keyline mark; (4) raise contrast: title in `ink` on `accentSoft` instead of on near-white paperWarm.

### `renderSequence(p): string` → module `i-sequence` (interactive:true)
- **Emits**: `svgSection(1080×300)`. Per frame: `rect{x:60,y:44,w:960,h:212,rx:18,fill:paperWarm,stroke:hairline}` + number `<text> 01 fontSize:40 fontWeight:700 fill:accent` + `hairlineRule w:88 fill:accent` + title `<text> fontSize:50 fill:ink`. Motion: 3 `<g>` toggled by discrete `<animate opacity>` at `begin=0s/1.2s/2.4s fill=freeze restart=never`. Static: frame 1.
- **Critique**: same pale card; the "sequence" reads as three near-identical white boxes flashing. No progress affordance, no visual连接 between steps.
- **Enhancements**: (1) add a persistent SOLID step-rail at top: three `rect` pills, the active step solid accent, others hairline (a real stepper); (2) filled accent number circle per step; (3) accentSoft card fill so steps stand out from the article; (4) connect steps with an inline-SVG arrow `<path>` in accent.

### Registry & re-exports
`interactiveModules: SvgModuleSpec[]` (4 specs, all `interactive:true`), plus named re-exports `renderClickSwitch/renderScrollCards/renderFadeIn/renderSequence` and `__interactiveRenderers` (test hook). All emit markup as above.

---

## FILE 4 — raster.ts (SVG → PNG for xhs/zhihu; not WeChat)

This file never feeds WeChat (WeChat is inline-SVG); it rasterizes for 小红书 poster cards / 知乎 img. Visual-premium critique mostly N/A, but listed per instruction.

### `RasterOptions` — exported interface
`{ width, height, scale?, background? }`.

### `posterViewBox(ratio: '3:4'|'1:1'): {width,height}` — exported
Returns `{1080,1440}` for 3:4, `{1080,1080}` for 1:1. Pure.

### `buildSvgDataUri(svgHtml, width, height): string` — exported
`'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(injectSvgSize(...))`. The ONLY place a fixed px `<svg width/height>` is intentionally injected (feeds canvas, not WeChat).

### `injectSvgSize(svgHtml,width,height): string` — internal
Overwrites/injects `width`/`height` on outer `<svg>` (strips `%`), ensures `xmlns`; wraps in a viewBox shell if no `<svg>`.
- **Critique**: emits no design; but note the rasterized poster inherits whatever pale recipe the source module had — so fixing the inline modules automatically fixes the poster output. No separate work needed.

### `svgToImgTag(dataUrl, moduleId, alt): string` — exported
Emits `<img data-ink-svg="<id>" src="<dataUrl>" alt="<alt>" style="width:100%;height:auto;display:block;" />` (sentinel for idempotent rescans).

### `hasDom(): boolean` — exported
`typeof document !== 'undefined' && typeof Image !== 'undefined'` SSR guard.

### `rasterizeSvg(svgHtml, opts): Promise<string>` — exported async
DOM-only. `scale=opts.scale??2`; sizes to `width*scale × height*scale`; `buildSvgDataUri` → `loadImage` → draw to canvas (optional `background` fill) → `toDataURL('image/png')`. Throws if `!hasDom()`.

### `loadImage(src): Promise<HTMLImageElement>` — internal
`new Image()`, resolve onload / reject onerror.

### `renderXhsPosterCard(svgHtml, ratio, background?): Promise<string>` — exported async
`posterViewBox(ratio)` → `rasterizeSvg(..., {scale:1, background})`.
- **Enhancement (raster-specific, optional)**: 小红书 posters live in a feed of full-bleed colorful cards; a paperWarm-on-white poster will look anemic there even more than in WeChat. When the callout/lead/card family lands, give the poster path a flagship variant with a SOLID accent band or full accentSoft background so the PNG holds its own. Pass an explicit `background` (e.g. `#f7f4ef` or `rgba(accent,0.06)` flattened) so transparent SVG regions don't render white on a colored feed.

---

## Synthesis — the premium plan (WeChat-safe, additive only)

1. **Adopt the container lever everywhere.** The 26 modules paint hairlines inside transparent SVGs; premium accounts paint SOLID-fill `<section>` blocks. Ship a new `callout`/`panel`/`footer-card` family of inline-styled `<section>` containers (`background:rgba(accent,0.08–0.12)` solid tint, `border-left:4px solid <accent>`, `border-radius:8–12px`, `padding:16–24px`, optional `box-shadow` — all proven-kept by quote-card). This is the single biggest lever and respects every constraint.
2. **Decorate the body, not just the chrome.** Extend `SvgInjectionPlan` (lead paragraph, callout blocks, key-sentence highlight, list styling, H4+). Deliver as a separate decorator chained via `chainSvgDecorators` so existing flagship plans stay intact.
3. **Kill the pale-card monotony.** quote-card, i-fadein, i-clickswitch, i-sequence, scroll-cards all repeat `paperWarm rect + 1px hairline + 160px accent rule + corner diamond`. Replace with SOLID accent masthead bands + accentSoft body fills + filled number circles; reserve the lone-diamond recipe for endmarks only.
4. **Use color confidently, once.** Per Quiet Press, one accent used boldly (a filled ribbon/band/left-bar) beats many faint hairlines. Bump `accentSoft` usage from 8–12% washes to deliberate solid tints, and let header-ribbon / a new filled section-header bar carry the masthead role on every H2.
5. **Icons via inline `<path>` only** (no emoji) for callout note/tip/warning — three small geometric glyphs (i, light-mark, alert-triangle) drawn as `<path fill="accent">`.
6. **Activate or retire the i-* family** — it's registered but no flagship plan uses it; either wire `i-scrollcards`/`i-sequence` into a flagship plan (great for 步骤/对比 content) after the visual upgrade, or document it as preview-only.

## Caveats / Not found
- I did NOT find any production consumer of the `i-*` interactive modules (only tests + the registry). Confirmed via grep of `src/services/export/themes.ts` plan definitions — they wire only header/divider/quote/cover/endmark ids.
- `ember` palette slot (`#c9362c`) differs from the locked kiln accent (`#D95B3F`); only `divider-forge` and `endmark-vessel` use `ember` (one dot each). Not a bug, but worth confirming the intended red before any new module reaches for `palette.ember`.
- I read the 6 static module files (headers/dividers/quotes/badges/endmarks/covers), primitives.ts, theme.ts, types.ts, wechat-safe.ts to ground the literal-markup claims; the task named only 4 files but the critique of inject/index requires the modules they wire.
- I did not run the renderers; markup quotes are transcribed directly from source (file:line cited inline above). No dynamic verification performed.
