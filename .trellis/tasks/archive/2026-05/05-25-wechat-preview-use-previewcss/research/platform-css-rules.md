# Research: Platform-Specific CSS Rules and Constraints in InkForge

- **Query**: Platform CSS rules, enforcePlatformCSS, postProcessForWechat, CSS whitelists/blacklists, CSS_INJECTION_PATTERNS
- **Scope**: internal
- **Date**: 2026-05-25

## Findings

### Files Found

| File Path | Description |
|---|---|
| `inkforge/src/services/export/platform-css.ts` | Platform CSS support matrix (data layer) — defines `WECHAT_SUPPORT`, `XIAOHONGSHU_SUPPORT`, `ZHIHU_SUPPORT` |
| `inkforge/src/services/export/css-validator.ts` | CSS compliance engine (logic layer) — `enforcePlatformCSS()`, `validateCSS()`, fallback rules |
| `inkforge/src/services/export/wechat.ts` | WeChat export engine — `postProcessForWechat()`, `convertToWechat()`, full pipeline |
| `inkforge/src/services/export/platform-rules/wechat.ts` | WeChat compliance rules — CJK spacing, 677px clamp, dark-mode metadata |
| `inkforge/src/services/export/platform-rules/zhihu.ts` | Zhihu compliance rules — LaTeX equation img, GFM table to HTML, code lang coercion |
| `inkforge/src/services/export/platform-rules/xiaohongshu.ts` | XHS compliance rules — title split, paragraph tighten, hashtag mix, image placeholders |
| `inkforge/src/services/export/platform-rules/wechat.test.ts` | Unit tests for wechat compliance rules (CJK spacing, clamp, dark-mode) |
| `inkforge/src/services/export/platform-rules/zhihu.test.ts` | Unit tests for zhihu compliance rules |
| `inkforge/src/services/export/platform-rules/xiaohongshu.test.ts` | Unit tests for XHS compliance rules |
| `inkforge/src/services/export/platform-export-rendering.test.ts` | Integration tests covering postProcessForWechat, style stripping, image width, LaTeX/Mermaid degradation |
| `inkforge/src/services/export/__tests__/pipeline-cross-platform.test.ts` | Cross-platform pipeline integration tests |
| `inkforge/src/config/security.ts` | `CSS_INJECTION_PATTERNS` constant — dangerous CSS patterns blocked |

---

### 1. Platform CSS Support Matrix (`platform-css.ts`)

Three platforms with `PlatformCSSSupport` interface:

#### WeChat (`WECHAT_SUPPORT`) — Most restrictive

```ts
{
  display: ['block', 'inline', 'inline-block', 'none', 'table', 'table-row', 'table-cell'],
  flexbox: false,
  grid: false,
  position: ['static', 'relative'],  // No absolute/fixed/sticky
  maxWidth: true,
  boxShadow: true,      // Confirmed via mdnice, doocs/md real-world usage
  borderRadius: true,
  gradient: true,        // linear-gradient confirmed working
  transform: false,
  transition: false,
  opacity: true,
  filter: false,
  customProperties: false,  // No var(--xxx)
  mediaQuery: false,
  calc: false,
  clamp: false,
}
```

#### Xiaohongshu (`XIAOHONGSHU_SUPPORT`) — Medium restrictions

```ts
{
  display: ['block', 'inline', 'inline-block', 'flex', 'none', 'table', 'table-row', 'table-cell'],
  flexbox: true,
  grid: false,
  position: ['static', 'relative', 'absolute'],
  maxWidth: true,
  boxShadow: true,
  borderRadius: true,
  gradient: true,
  transform: true,
  transition: false,
  opacity: true,
  filter: false,
  customProperties: false,
  mediaQuery: false,
  calc: true,
  clamp: false,
}
```

#### Zhihu (`ZHIHU_SUPPORT`) — Most permissive

```ts
{
  display: ['block', 'inline', 'inline-block', 'flex', 'grid', 'none', 'table', 'table-row', 'table-cell', 'inline-flex'],
  flexbox: true,
  grid: true,
  position: ['static', 'relative', 'absolute'],
  maxWidth: true,
  boxShadow: true,
  borderRadius: true,
  gradient: true,
  transform: true,
  transition: true,
  opacity: true,
  filter: true,
  customProperties: false,  // Still no var(--xxx) for zhihu
  mediaQuery: true,
  calc: true,
  clamp: true,
}
```

---

### 2. `enforcePlatformCSS()` function (`css-validator.ts`)

**Location**: `inkforge/src/services/export/css-validator.ts`, line 444

**What it does**: Scans all `style="..."` attributes in the HTML, validates each CSS declaration against the platform support matrix, and applies fallback or removal.

**Pipeline position**: Called as the "final safety net" after platform-specific `postProcess` functions.

**Behavior per platform**:
- Iterates over inline styles via regex `style="([^"]*)"`
- For each declaration, checks against `FALLBACK_RULES` array (line 71-207) in order:
  - `display:flex` -> `display:block` (when `flexbox=false`, i.e., WeChat)
  - `display:inline-flex` -> `display:inline-block` (when `flexbox=false`)
  - `display:grid` -> `display:block` (when `grid=false`, i.e., WeChat/XHS)
  - Flexbox sub-properties (flex-direction, justify-content, etc.) -> removed
  - Grid sub-properties -> removed
  - `position:fixed` -> `position:relative`
  - `position:sticky` -> `position:relative`
  - `position:absolute` -> `position:relative` (WeChat only)
  - `box-shadow` -> `border:1px solid #e0e0e0` (if boxShadow=false; NOT triggered for WeChat since boxShadow=true)
  - `transform` -> removed (WeChat)
  - `transition` -> removed (WeChat/XHS)
  - `animation*` -> always removed (all platforms)
  - `filter`/`backdrop-filter` -> removed (when filter=false)
  - `clip-path`/`mask` -> always removed
  - `border-image` with gradient -> removed (when gradient=false)
- Also removes: CSS var() references, calc() when unsupported, clamp() when unsupported, gradient functions when unsupported
- If empty after cleanup, removes entire `style` attribute

---

### 3. `postProcessForWechat()` function (`wechat.ts`)

**Location**: `inkforge/src/services/export/wechat.ts`, line 800

**Full transformation chain** (in order):

1. **CSS variable replacement** (line 803): `var(--md-primary-color)` -> concrete values
2. **Forbidden tag stripping** (line 807-813):
   - Paired tags removed: `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<button>`
   - Start tags removed: `<input>`, `<object>`, `<embed>`, `<form>`, `<button>`
   - Unsafe attributes stripped: `on*` event handlers, `javascript:` href/src
3. **First-element margin-top reset** (line 816): Sets first block element's `margin-top:0`
4. **Image normalization** (line 822): `width`/`height` attrs -> inline style; max image width clamped to 640px; `max-width:100%;height:auto` ensured
5. **Nested list fix** (line 825): Moves `<ul>`/`<ol>` children out of `<li>` (WeChat rendering bug)
6. **Mermaid SVG text color fix** (line 828): Adds `fill:#333333` to `<tspan>`
7. **LaTeX degradation** (line 831): KaTeX/math-fallback nodes -> readable text blocks ("formula: E=mc^2")
8. **`margin:auto` removal** (line 834-835): `margin:Npx auto` -> `margin:Npx 0`
9. **Unsupported CSS property removal** (line 843-882): Regex-based strip of:
   - `background-clip:text`, `-webkit-background-clip:text`, `-webkit-text-fill-color:transparent`
   - `position:fixed|sticky`
   - `display:flex` (but not inline-flex), flex sub-properties
   - `display:grid`, grid sub-properties
   - Residual `var(--...)`
   - `animation*`, `transition`
   - `backdrop-filter`, `filter`
   - `box-shadow:...inset...`, `text-shadow`
   - `clip-path`, `mask`, `-webkit-mask`
10. **Empty style cleanup** (line 886-889)
11. **Class attribute removal** (line 892): All `class="..."` stripped
12. **SVG compatibility wrappers** (line 895-901): Zero-height `<p>` tags around `<section id="nice">`
13. **Table width enforcement** (line 904-938): `width:100%;max-width:100%;border-collapse:collapse` on tables; inline borders on `<th>`/`<td>`
14. **Section base styles** (line 941-944): `font-size:15px;line-height:1.8;color:#333;padding:16px`
15. **Blockquote enhancement** (line 948-963): Left border, background, border-radius
16. **Figure/figcaption styles** (line 966-973): Centered with italic captions

---

### 4. WeChat CSS Whitelist/Blacklist Summary

**Effectively allowed (whitelist)**:
- Basic display: `block`, `inline`, `inline-block`, `none`, `table*`
- Position: `static`, `relative`
- Box model: `margin`, `padding`, `border`, `width`, `height`, `max-width`
- Typography: `font-family`, `font-size`, `font-weight`, `line-height`, `color`, `text-align`, `text-indent`, `text-decoration`, `letter-spacing`, `word-break`, `word-spacing`, `white-space`
- Decorative: `background`, `background-color`, `background-image` (with gradient), `border-radius`, `box-shadow` (non-inset), `opacity`
- Table: `border-collapse`

**Blocked (blacklist)**:
- Layout: `display:flex`, `display:grid`, all flex/grid sub-properties
- Position: `fixed`, `sticky`, `absolute`
- Transform/animation: `transform`, `transition`, `animation*`
- Filters: `filter`, `backdrop-filter`
- Advanced: `clip-path`, `mask`, `-webkit-mask`, `text-shadow`, `box-shadow:...inset`
- Functions: `var()`, `calc()`, `clamp()`
- Gradient text: `background-clip:text`, `-webkit-text-fill-color:transparent`
- CSS import/charset: `@import`, `@charset`
- `<style>` tag: Not reliable; all styles must be inline (juice handles this)

---

### 5. `CSS_INJECTION_PATTERNS` constant (`config/security.ts`)

**Location**: `inkforge/src/config/security.ts`, line 398

Three categories of blocked patterns:

#### `DANGEROUS_PATTERNS` (line 400-422):
- `expression()` (IE expression)
- `javascript:` protocol
- `vbscript:` protocol
- `-moz-binding:` (Firefox XBL)
- `behavior:` (IE behavior)
- `binding:` (generic)
- `-o-link:`, `-o-link-source:` (Opera)
- `url(...data:...)` (data URI injection)
- `url(...javascript:...)` (JS URL)
- `@import`, `@charset`
- `src:url(...)` (font injection)
- Unicode escape sequences for "javascript" and "expression"

#### `DANGEROUS_URL_PATTERN` (line 425):
- `url\s*\([^)]*\)` — removes all `url()` declarations

#### `TRACKING_PATTERNS` (line 428-432):
- `background-image:url(...)` — background tracking
- `list-style-image:url(...)` — list image tracking
- `cursor:url(...)` — cursor tracking

**Usage**: Applied during DOMPurify `uponSanitizeAttribute` hook in the WeChat export pipeline (wechat.ts lines 1119-1131). Each pattern string is compiled to a fresh RegExp instance per invocation to avoid regex state pollution.

---

### 6. WeChat Platform Documentation / Comments

Key comments found in source code about WeChat editor support:

From `platform-css.ts` (lines 66-79):
> "Wechat: most restrictive. 
> - Flex/Grid: editor strips `display:flex`, need `-webkit-box` fallback; mainstream tools (doocs/md, mdnice) avoid; marked false.
> - CSS variables, filters, animations, calc/clamp: editor filters out.
> - position: absolute/fixed/sticky: WebView rendering unstable, only static/relative kept.
> - `<style>` tags unreliable; all styles must be inline (juice)."

From `wechat.ts` (line 838-840):
> "Step 5 [REMOVED]: top->transform conversion was removed because WeChat doesn't support transform (WECHAT_SUPPORT.transform=false). Converting would cause enforcePlatformCSS to strip transform, losing both top and transform. WeChat supports position:relative + top, keep original top property."

From `platform-rules/wechat.ts` (lines 1-9):
> "Pure, side-effect-free transforms applied to inline-CSS HTML before pasting into WeChat editor. References oaker-io/wewrite spacing rules and WeChat Mini Programs dark-mode data-darkmode-* metadata convention."

---

### 7. Test Coverage

#### Unit tests (`platform-rules/wechat.test.ts`):
- CJK/Latin spacing with U+202F thin space (7 cases)
- Content-width clamping to 677px (4 cases)
- Dark-mode metadata injection (5 cases)
- Full wechatComplianceTransform orchestrator (5 cases)

#### Integration tests (`platform-export-rendering.test.ts`):
- WeChat HTML sanitization (no `<style>`, no `class=`, no `javascript:`, no flex/grid/var)
- WeChat unsupported CSS stripping (flex, grid, sticky, background-clip, grid-template)
- WeChat image width clamping to 640px
- WeChat LaTeX degradation to readable text
- WeChat Mermaid degradation to image placeholder
- WeChat style controls (primary color, font, Mac code blocks)
- WeChat primary color XSS prevention
- CJK spacing, 677px clamp, dark-mode metadata in full pipeline

#### Cross-platform integration tests (`__tests__/pipeline-cross-platform.test.ts`):
- Full markdown -> WeChat pipeline compliance check
- Xiaohongshu native + preview dual path
- Zhihu native + preview dual path
- Fidelity comparison (preview vs native artifact)
- Hard-limit boundaries (ReDoS threshold, char limits)

---

### Pipeline Order for WeChat Export

The full WeChat export pipeline in `convertToWechatWithStats()` (wechat.ts):

1. `convertTaskListCheckboxes()` — checkbox to styled spans
2. `degradeWechatLatexHtml()` — KaTeX/MathML to readable text (pre-DOMPurify)
3. `degradeWechatMermaidHtml()` — SVG to text placeholder (pre-DOMPurify)
4. `DOMPurify.sanitize()` — XSS protection with CSS_INJECTION_PATTERNS hook
5. `cleanEmptyParagraphs()` + `limitConsecutiveBreaks()`
6. `highlightCodeBlocks()` — syntax highlighting
7. `renderAlertBlocks()` — GitHub-style alerts
8. `convertLinksToFootnotes()` — external links to footnotes
9. Build final content (reading time header, footnote section)
10. Wrap in `<section id="nice">`
11. `generateThemeCSS()` + `codeThemeCSS` — theme CSS generation
12. `juice()` — CSS inlining (removes `<style>` tags)
13. `applyHeadingDecorations()` — pseudo-element to real HTML
14. `preset.decorate()` — dual-track decoration hook
15. `enhanceTableStyles()` — striped rows, rounded corners
16. **`postProcessForWechat()`** — WeChat compatibility (step 3 above)
17. **`enforcePlatformCSS(html, 'wechat')`** — final safety net (step 2 above)
18. **`wechatComplianceTransform()`** — CJK spacing + 677px clamp + dark-mode metadata

## Caveats / Not Found

- No standalone whitelist/blacklist file exists; the allowed/blocked properties are implicitly defined by the combination of `WECHAT_SUPPORT` matrix + `FALLBACK_RULES` + `postProcessForWechat()` regex strips.
- No `src/services/export/__tests__/` directory exists (flat test files instead).
- The `unsupportedProps` array in `postProcessForWechat()` partially overlaps with what `enforcePlatformCSS()` does; this is intentional dual-layer defense.
