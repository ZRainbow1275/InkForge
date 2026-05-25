# Research: WeChat Export Pipeline — Full CSS Transform Chain

- **Query**: What CSS features does the WeChat export pipeline strip/transform, how does each stage work, and what differs between previewCSS and exportCSS?
- **Scope**: internal
- **Date**: 2026-05-25

---

## 1. Pipeline Overview (`convertToWechatWithStats`)

**File**: `inkforge/src/services/export/wechat.ts` (lines 1073-1277)

The function executes these stages in order:

```
Input HTML
  |-> applyWechatStyleOptions (merge font/color overrides into preset)
  |-> calculateStats
  |-> convertTaskListCheckboxes (before DOMPurify strips <input>)
  |-> degradeWechatLatexHtml (KaTeX -> text fallback)
  |-> degradeWechatMermaidHtml (Mermaid SVG -> text fallback)
  |-> DOMPurify sanitize (strict allowlist)
  |-> cleanEmptyParagraphs + limitConsecutiveBreaks
  |-> highlightCodeBlocks (highlight.js)
  |-> renderAlertBlocks (GitHub-style alerts)
  |-> convertLinksToFootnotes (external links -> footnotes)
  |-> buildReadingTimeHeader + buildFootnoteSection
  |-> wrap in <section id="nice">
  |-> generateThemeCSS(preset, 'export') + codeThemeCSS -> <style> block
  |-> juice() CSS inlining
  |-> applyHeadingDecorations (pseudo-element -> real HTML)
  |-> preset.decorate() hook (recipe-level decoration)
  |-> enhanceTableStyles
  |-> postProcessForWechat (WeChat-specific CSS stripping)
  |-> enforcePlatformCSS('wechat') (final CSS safety net)
  |-> wechatComplianceTransform (CJK spacing, width clamp, dark-mode)
  |-> Output
```

---

## 2. `juice` CSS Inlining (line 1234-1238)

```ts
const inlinedHtml = juice(styledHtml, {
  removeStyleTags: true,
  preserveImportant: true,
  inlinePseudoElements: true
})
```

### What juice preserves
- All standard CSS properties that can be expressed as `style=""` attributes
- `!important` declarations (preserveImportant: true)
- Pseudo-element content gets partially inlined (inlinePseudoElements: true) -- juice creates real `<div>` or `<span>` for `::before`/`::after` with `content:` values

### What juice strips / cannot inline
- **CSS counters** (`counter-reset`, `counter-increment`, `counter()` function) -- juice cannot resolve runtime counters
- **Pseudo-element positioning** (`:first-letter`, `::first-line`) -- not convertible to inline styles
- **`::marker`** pseudo-elements -- not inlineable
- **CSS variables** (`var(--xxx)`) -- juice passes them through literally, they must be replaced beforehand
- **`@font-face`** / `@keyframes` / `@media` rules -- removed with `<style>` tag
- **Complex selectors** (`:first-of-type`, `:nth-child`) -- juice resolves simple ones but complex may be lost
- **`:hover`, `:focus`** interactive states -- not applicable inline

---

## 3. `enforcePlatformCSS` (css-validator.ts, line 444-457)

**File**: `inkforge/src/services/export/css-validator.ts`

This is the **final safety net** -- it scans every `style=""` attribute in the output HTML and validates each CSS declaration against the `WECHAT_SUPPORT` matrix.

### WeChat CSS Support Matrix (platform-css.ts, lines 81-98)

```ts
WECHAT_SUPPORT = {
  display: ['block', 'inline', 'inline-block', 'none', 'table', 'table-row', 'table-cell'],
  flexbox: false,
  grid: false,
  position: ['static', 'relative'],         // NO absolute, fixed, sticky
  maxWidth: true,
  boxShadow: true,                           // SUPPORTED (verified 2026-05)
  borderRadius: true,                        // SUPPORTED
  gradient: true,                            // SUPPORTED (linear-gradient, etc.)
  transform: false,                          // STRIPPED
  transition: false,                         // STRIPPED
  opacity: true,                             // SUPPORTED
  filter: false,                             // STRIPPED (filter + backdrop-filter)
  customProperties: false,                   // var(--xxx) STRIPPED
  mediaQuery: false,                         // @media STRIPPED
  calc: false,                               // calc() STRIPPED
  clamp: false,                              // clamp() STRIPPED
}
```

### What enforcePlatformCSS does per property

| Action | Properties |
|--------|-----------|
| **Downgrade to `display:block`** | `display:flex`, `display:grid` |
| **Downgrade to `display:inline-block`** | `display:inline-flex` |
| **Downgrade to `position:relative`** | `position:fixed`, `position:sticky`, `position:absolute` |
| **Downgrade to `border:1px solid #e0e0e0`** | `box-shadow` (only if platform doesn't support it -- WeChat DOES support it, so box-shadow is PRESERVED) |
| **Remove entirely** | `transform`, `transition`, `transition-*`, `animation`, `animation-*`, `filter`, `backdrop-filter`, `clip-path`, `mask`, `-webkit-mask`, `mask-image` |
| **Remove entirely** | Any value containing `var(--...)`, `calc()`, `clamp()` |
| **Remove entirely** | Gradient values in `background(-image)`, `border-image(-source)`, `list-style-image` -- BUT ONLY if `gradient:false` (WeChat has `gradient:true`, so **gradients are PRESERVED** by enforcePlatformCSS) |
| **Remove entirely** | Flex sub-props: `flex-direction`, `flex-wrap`, `justify-content`, `align-items`, `gap`, `order`, etc. |
| **Remove entirely** | Grid sub-props: `grid-template-*`, `grid-column`, `grid-row`, `grid-gap`, etc. |

### Key insight: enforcePlatformCSS PRESERVES these on WeChat
- `box-shadow` (including non-inset)
- `border-radius`
- `linear-gradient`, `radial-gradient` in backgrounds
- `opacity`
- `max-width`

---

## 4. `postProcessForWechat` (wechat.ts, lines 800-976)

This runs BEFORE enforcePlatformCSS and handles WeChat-specific quirks.

### Full processing chain (in order):

1. **CSS variable replacement** (`replaceCssVariables`) -- resolves `var(--md-primary-color)` etc. to literal values
2. **Forbidden tag stripping** -- removes `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<button>`, `<input>` (paired and unpaired)
3. **Unsafe attribute stripping** -- removes `on*` event handlers, `javascript:` URLs
4. **First element margin-top zeroing** -- sets `margin-top:0` on the first block element
5. **Image normalization** -- converts `width`/`height` attributes to inline styles, clamps to 640px max, adds `max-width:100%;height:auto`
6. **Nested list fix** -- moves `<ul>/<ol>` children out of `<li>` for WeChat rendering
7. **Mermaid SVG fix** -- forces `fill:#333` on `<tspan>` elements
8. **KaTeX degradation** (redundant safety -- also done pre-DOMPurify)
9. **`margin:auto` replacement** -- `margin: Npx auto` -> `margin: Npx 0`; `margin: auto` -> `margin: 0`

10. **CSS property stripping** (the big regex-based removal, lines 843-878):

    | Category | Properties removed |
    |----------|-------------------|
    | Background-clip text | `background-clip:text`, `-webkit-background-clip:text`, `-webkit-text-fill-color:transparent` |
    | Position | `position:fixed`, `position:sticky` |
    | Flex | `display:flex` (but NOT `inline-flex`), `flex-direction`, `flex-wrap`, `justify-content`, `align-items`, `flex:` |
    | Grid | `display:grid`, `grid-template*`, `grid-gap`, `gap` |
    | CSS variables | residual `var(--xxx)` references |
    | Animation | `animation:`, `animation-*:`, `transition:` |
    | Filters | `backdrop-filter:`, `filter:` |
    | Shadows | `box-shadow:*inset*` (inset only!), `text-shadow:` |
    | Clipping | `clip-path:`, `mask:`, `-webkit-mask:` |

11. **Empty style cleanup** -- removes empty `style=""`, extra semicolons
12. **Class attribute stripping** (line 891) -- removes ALL `class="..."` attributes (WeChat editor doesn't preserve class names)
13. **SVG compat** -- adds zero-height `<p>` tags around `<section id="nice">`
14. **Table width enforcement** -- ensures all `<table>` have `width:100%;max-width:100%`
15. **Table cell border enforcement** -- adds `border:1px solid #ddd;padding:10px 12px` to `<th>` and `<td>`
16. **Section base style** -- adds fallback font-size/line-height/color to `<section id="nice">`
17. **Blockquote enhancement** -- adds border-left, background, border-radius
18. **Figure/figcaption styling** -- adds centered layout, italic caption

### Critical: what is NOT removed by postProcessForWechat
- `box-shadow` (non-inset) -- preserved
- `border-radius` -- preserved
- `linear-gradient` / `radial-gradient` -- preserved
- `opacity` -- preserved
- `position:relative` + `top`/`left` -- preserved
- `float` -- preserved
- `font-*` properties -- preserved
- `letter-spacing`, `word-break`, `line-height` -- preserved
- `text-align`, `text-indent`, `text-decoration` -- preserved

---

## 5. `applyHeadingDecorations` (themes.ts, lines 991-1088)

Runs AFTER juice, BEFORE postProcessForWechat. Converts pseudo-element effects into real inline HTML since juice/WeChat lose pseudo-elements.

| Preset | What it does |
|--------|-------------|
| **thesis** | Injects gold star `&#9733;` spans before/after h2 content |
| **report** | No-op (CSS border handles it) |
| **news** | No-op (CSS border handles it) |
| **meme** | Adds yellow highlight `background:#FFFACD;background:linear-gradient(...)` to all `<strong>` tags (pure-color fallback + gradient) |
| **elegant** | Injects book-bracket `&#12302;` / `&#12303;` spans around h2 + double-line bottom border |
| **tech** | Injects inline `background:#6366f1;background:linear-gradient(135deg,#6366f1,#8b5cf6)` on h2 (pure-color fallback + gradient) |
| **legal, commentary, aigc, code, notes, life** | No-op -- handled by pure CSS inline styles |

---

## 6. Recipe `decorate` Hooks (preset-decorations.ts)

**File**: `inkforge/src/services/export/preset-decorations.ts`

Called at wechat.ts line 1248: `effectivePreset.decorate(decoratedHtml, 'wechat')`.

Each recipe's `decorate()` function only runs for non-preview targets (i.e., export/wechat). For preview, it returns the HTML unchanged and relies on CSS pseudo-elements instead.

| Recipe | Preview CSS technique | Export decorate action |
|--------|----------------------|----------------------|
| **cjk-drop-cap** | `::first-letter { font-size:3.2em; float:left }` | Wraps first char of first `<p>` in `<span class="ink-dc" style="font-size:3.2em;font-weight:900;float:left;...">` |
| **ornament-hr** | `hr::before { content:'❀ ❀ ❀' }` | Replaces `<hr>` with `<div class="ink-ornament-hr" style="text-align:center;...">❀ ❀ ❀</div>` |
| **large-quote** | `blockquote::before { content:'\201C'; position:absolute; font-size:3.6em }` | Injects `<span class="ink-quote-mark" style="font-size:2.4em;...">"</span>` into first `<p>` of each `<blockquote>` |
| **cjk-decimal-h2** | `h2::before { content:'第' counter(ink-ch, cjk-decimal) '章  ' }` (CSS counters) | Injects `<span class="ink-ch-num">第N章</span>` with computed CJK numeral before h2 content |
| **h2-underline-fine** | `h2 { border-bottom:1px solid var(--ink-accent) }` | No decorate needed (pure CSS) |
| **pull-quote-bordered** | `blockquote { border-top/bottom:2px solid var(--ink-accent) }` | No decorate needed (pure CSS) |
| **numbered-list-roman** | `ol { list-style-type:upper-roman }` + `li::marker { color:var(--ink-accent) }` | No decorate needed (pure CSS) |
| **h3-vertical-accent** | `h3 { border-left:2px solid var(--ink-accent) }` | No decorate needed (pure CSS) |
| **h2-block-ribbon** | `h2 { background:var(--ink-accent); color:#fff; padding; border-radius }` | No decorate needed (pure CSS) |

All decorate functions are idempotent -- they check for sentinel class names before injecting.

---

## 7. `wechatComplianceTransform` (platform-rules/wechat.ts)

**File**: `inkforge/src/services/export/platform-rules/wechat.ts`

Runs LAST in the pipeline (after enforcePlatformCSS). Three phases:

1. **CJK/Latin spacing** (`applyCjkLatinSpacing`) -- inserts U+202F thin space between CJK and Latin characters. Tokenizes HTML to avoid touching `<code>`/`<pre>`/`<style>`/`<script>` interiors. Default: ON.

2. **Content-width clamp** (`clampContentWidth`) -- wraps inner content of `<section id="nice">` in a `<div data-wechat-clamp="1" style="max-width:677px;margin:0 auto;">`. Default: ON, 677px.

3. **Dark-mode metadata** (`injectDarkModeMetadata`) -- adds `data-darkmode-color`, `data-darkmode-bgcolor`, `data-darkmode-original-color`, `data-darkmode-original-bgcolor` attributes to h1-h6, blockquote, pre, code, table, th, td. Default: OFF (opt-in).

---

## 8. previewCSS vs exportCSS Comparison (3 presets)

### `generateThemeCSS` routing (themes.ts, line 909-921)

When `target === 'export'`, uses `preset.exportCSS`; when `target === 'preview'`, uses `preset.previewCSS`. Both are layered on top of `baseCSS`.

### Preset: THESIS

**previewCSS has but exportCSS lacks:**
- `font-family` declaration with full bilingual stack (exportCSS relies on persona base only)
- `--ink-accent` CSS variable definition
- `counter-reset: legal-section` (no counter in export -- handled by decorate hook)
- `p:first-of-type { text-indent: 0 }` selector
- `h3::before { content: '§ ' }` pseudo-element
- `hr::before { content: '· · ·' }` pseudo-element
- `font-variant-numeric: oldstyle-nums` on multiple elements
- Detailed heading sizes/weights/spacing/color
- `a { border-bottom: 1px solid #b8a589 }` link underline style
- `ul li::marker { color: ... }` marker color

**exportCSS is deliberately minimal:**
- Basic heading colors + weights
- Blockquote background + border
- Table header color
- Recipe export CSS (from `thesisRecipesExport.css`)

### Preset: COMMENTARY

**previewCSS has but exportCSS lacks:**
- `--ink-accent: #c0392b`
- `h1::after { content:''; display:block; width:80px; height:5px; background:#c0392b }` (decorative line under h1)
- `h2::before` absolute-positioned red bar
- `h3::after` decorative underline
- `em { border-bottom: 1px dashed #c0392b }`
- `blockquote::before { content:'"'; font-size:3em }` large quote mark
- `ul li::marker { content:'— ' }` custom dash markers
- `hr::after { content:'◆'; transform:translateX(-50%) }` centered diamond
- Full color/font specifications for all elements

**exportCSS provides:**
- h1/h2 sizes and weights/colors
- strong color
- hr simple 2px border
- Recipe export CSS

### Preset: AIGC

**previewCSS and exportCSS are IDENTICAL** (rare case):
- Both have the same h1, h2, strong, code, blockquote, a styles
- Both use `aigcRecipesPreview.css` / `aigcRecipesExport.css` respectively
- The only difference is the recipe CSS layer (preview recipes use `var(--ink-accent)`, export recipes use hardcoded color values)

---

## 9. CSS Variables Flow

The entire pipeline systematically eliminates CSS variables:

1. **previewCSS** freely uses `var(--ink-accent, fallback)` -- browser resolves them live
2. **exportCSS** hardcodes literal color values instead of variables
3. **Recipe exportCSS** also hardcodes values (e.g., `color: #5a4a3c` instead of `var(--ink-accent)`)
4. **`replaceCssVariables`** in postProcessForWechat replaces known vars (`--md-primary-color`, `--md-font-family`, `--md-font-size`, `--foreground`, etc.)
5. **`enforcePlatformCSS`** strips any remaining `var(--...)` as final safety net
6. **`postProcessForWechat`** regex also catches residual `var(--xxx)` patterns

---

## 10. Files Found

| File Path | Description |
|---|---|
| `inkforge/src/services/export/wechat.ts` | Main WeChat export engine -- `convertToWechatWithStats`, `postProcessForWechat`, image/latex/mermaid handlers |
| `inkforge/src/services/export/platform-rules/wechat.ts` | CJK spacing, content-width clamp, dark-mode metadata injection |
| `inkforge/src/services/export/platform-css.ts` | CSS support matrix -- defines what WeChat/XHS/Zhihu support |
| `inkforge/src/services/export/css-validator.ts` | `enforcePlatformCSS` -- final CSS property validation + fallback |
| `inkforge/src/services/export/themes.ts` | `generateThemeCSS`, `applyHeadingDecorations`, all 11 preset definitions with previewCSS/exportCSS |
| `inkforge/src/services/export/preset-decorations.ts` | 9 decoration recipes with dual-track CSS + decorate hooks |
| `inkforge/src/services/export/preset-fonts.ts` | Persona font stacks, `@font-face` specs, `generatePersonaBaseCSS` |
| `inkforge/src/services/export/types.ts` | Type definitions for `WechatExportOptions`, `ExportPreset`, `Platform`, etc. |

---

## 11. Summary: Three Layers of CSS Stripping for WeChat

| Layer | Location | What it removes |
|-------|----------|----------------|
| **postProcessForWechat** | wechat.ts:800-976 | CSS vars, forbidden tags, event attrs, flex/grid display, position:fixed/sticky, background-clip:text, -webkit-text-fill-color, inset box-shadow, text-shadow, animation, transition, filter, clip-path, mask, ALL class attributes, margin:auto |
| **enforcePlatformCSS** | css-validator.ts:444-457 | Any remaining flex/grid props, transform, transition-*, animation-*, filter/backdrop-filter, clip-path/mask, var(--), calc(), clamp(), unsupported display/position values |
| **wechatComplianceTransform** | platform-rules/wechat.ts:265-285 | (Does not strip CSS -- adds CJK spacing, width clamp wrapper, dark-mode attrs) |

## Caveats

- The `postProcessForWechat` regex for `display:flex` uses a negative lookahead `(?!-)` to avoid matching `display:flex-` but this means `display:inline-flex` is NOT caught by postProcess (it IS caught by enforcePlatformCSS later).
- `box-shadow` without `inset` survives both postProcess and enforcePlatformCSS -- WeChat genuinely supports it.
- `linear-gradient` survives enforcePlatformCSS (WeChat `gradient:true`) but postProcess does NOT explicitly strip gradients either. Gradients in backgrounds are preserved end-to-end.
- The `class=""` stripping at line 891 happens after decorate hooks inject `class="ink-dc"` etc. The class names are stripped but the inline `style=""` attributes on those spans are preserved -- this is by design.
