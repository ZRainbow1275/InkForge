# Research: WeChat Official Account CSS Capabilities (2025-2026)

- **Query**: What CSS properties does the WeChat public account article renderer actually support? Does WeChat strip `<style>` tags? How do tools like doocs/md and juice handle pseudo-elements?
- **Scope**: mixed (internal codebase + external references)
- **Date**: 2026-05-25

---

## 1. Does WeChat Strip `<style>` Tags?

**YES. WeChat strips `<style>` tags.** This is universally confirmed across all sources.

### Evidence

- **WeChat official docs** (`draft_add` API): The `content` field accepts HTML but WeChat server-side processing removes `<script>`, `<style>`, `<link>`, and JavaScript.
- **doocs/md** (https://github.com/doocs/md): Uses juice to inline all CSS before copy/paste, specifically because `<style>` tags are stripped by WeChat's editor on paste.
- **InkForge codebase** (`platform-css.ts` lines 66-79): Comments state: "`<style>` tags unreliable; all styles must be inline (juice)."
- **InkForge codebase** (`postProcessForWechat` in `wechat.ts` line 807): Explicitly strips any remaining `<style>` tags as safety net.
- **InkForge codebase** (`wechat.ts` line 1234-1238): juice is called with `removeStyleTags: true`, removing all `<style>` after inlining.
- **Community articles** (tencent cloud developer articles, mapoet.github.io): All confirm that WeChat public account editor strips `<style>` tags on paste and only preserves inline `style=""` attributes.

### Implication for the Task

**For the PREVIEW panel** (rendered in InkForge's own iframe/container), `<style>` tags work perfectly fine because the preview is rendered locally, not in WeChat's editor. The restriction only applies to the **export/copy** path. This is the key insight that enables using `previewCSS` as `<style>` blocks in the preview without juice inlining.

---

## 2. Does WeChat Support Inline Pseudo-Elements (via juice's `inlinePseudoElements`)?

### How juice `inlinePseudoElements` Works

Source: `inkforge/node_modules/.pnpm/juice@11.1.1/node_modules/juice/lib/inline.js` lines 270-286

When `inlinePseudoElements: true`, juice:
1. Detects CSS rules targeting `::before` and `::after` pseudo-elements
2. Creates a real `<span>` element with the pseudo-element's computed styles
3. Sets the `content:` value as the `<span>`'s text content (or `<img>` if it's a URL)
4. Prepends the span to the parent element (for `::before`) or appends it (for `::after`)

### What juice CAN inline

- Simple `content: 'text'` values become real text inside a `<span>`
- CSS properties on the pseudo-element become inline `style` on the `<span>`
- `content: url(...)` becomes an `<img src="...">`

### What juice CANNOT inline

| Feature | Why it fails |
|---------|-------------|
| **CSS counters** (`counter()`, `counter-reset`, `counter-increment`) | juice cannot resolve runtime counter values -- they require a CSS engine |
| **`::first-letter`** / **`::first-line`** | Not `::before`/`::after`, juice ignores them entirely |
| **`::marker`** | Not `::before`/`::after`, juice ignores them |
| **Complex `content:` values** | `attr()`, `open-quote`/`close-quote`, multiple concatenated strings with counters |
| **`content: ''`** (empty string used for decorative boxes) | juice creates a `<span>` but with no text content; the span may be invisible depending on whether it has dimensions |
| **Positioning of pseudo-elements** | `position: absolute` on pseudo-elements is converted to inline style, but WeChat then strips `position: absolute`, so the positioning is lost |

### InkForge's Solution: Dual-Track Decoration System

InkForge uses juice's `inlinePseudoElements: true` **plus** a manual `applyHeadingDecorations()` and `preset.decorate()` system that converts pseudo-element effects into real HTML elements after juice runs:

| Effect | previewCSS approach | Export/juice approach |
|--------|--------------------|-----------------------|
| `h3::before { content: '...' }` | CSS pseudo-element (works in preview) | juice creates `<span>` (works in WeChat) |
| `h2::before { counter(cjk-decimal) }` | CSS counter (works in preview) | `decorate()` injects computed `<span>` with literal number |
| `p::first-letter { float:left; font-size:3em }` | CSS pseudo-element (works in preview) | `decorate()` wraps first char in `<span style="float:left;font-size:3.2em">` |
| `hr::before { content: 'ornament' }` | CSS pseudo-element (works in preview) | `decorate()` replaces `<hr>` with `<div>ornament</div>` |
| `blockquote::before { content: large-quote }` | CSS pseudo-element (works in preview) | `decorate()` injects `<span>` with quote mark |

---

## 3. Which CSS3 Properties Actually Work in WeChat Articles?

### Confirmed SUPPORTED (2025-2026)

Based on InkForge's `WECHAT_SUPPORT` matrix (`platform-css.ts`), doocs/md real-world usage, mdnice testing, and community articles:

| Category | Properties | Notes |
|----------|-----------|-------|
| **Typography** | `font-family`, `font-size`, `font-weight`, `font-style`, `color`, `line-height`, `letter-spacing`, `word-spacing`, `word-break`, `white-space`, `text-align`, `text-indent`, `text-decoration` | Core text styling, fully supported |
| **Box Model** | `margin`, `padding`, `border`, `border-radius`, `width`, `height`, `max-width`, `min-width` | Standard box model, reliable |
| **Background** | `background-color`, `background`, `background-image` (with inline base64 or mmbiz URL) | Background colors fully reliable |
| **Gradients** | `linear-gradient()`, `radial-gradient()` in `background` / `background-image` | Confirmed working by doocs/md and mdnice real-world articles. InkForge marks `gradient: true` in `WECHAT_SUPPORT` |
| **Box Shadow** | `box-shadow` (non-inset only) | Confirmed by mdnice issue #264 (Mac code block dots). InkForge marks `boxShadow: true`. **Inset box-shadow is stripped by postProcessForWechat** |
| **Border Radius** | `border-radius` | Fully supported, widely used |
| **Opacity** | `opacity` | Supported |
| **Display** | `block`, `inline`, `inline-block`, `none`, `table`, `table-row`, `table-cell` | Core display values. **No flex, no grid** |
| **Position** | `static`, `relative` | Plus `top`/`left`/`right`/`bottom` when `position: relative` |
| **Float** | `float: left`, `float: right` | Supported (used for Mac code block language labels, drop caps) |
| **Overflow** | `overflow`, `overflow-x`, `overflow-y` | Supported (used for code block scrolling) |
| **Vertical Align** | `vertical-align` | Supported |
| **List Style** | `list-style-type` | Supported |
| **Table** | `border-collapse`, per-cell `border`/`padding`/`background` | Supported, but must be fully inline |

### Confirmed NOT SUPPORTED / STRIPPED

| Category | Properties | What happens |
|----------|-----------|-------------|
| **Flexbox** | `display: flex`, `flex-direction`, `flex-wrap`, `justify-content`, `align-items`, `gap`, `order`, `flex-grow`, `flex-shrink`, `flex-basis` | WeChat editor strips `display:flex`. InkForge's `postProcessForWechat` and `enforcePlatformCSS` both remove these. Use `table-cell` / `float` / `inline-block` instead |
| **Grid** | `display: grid`, `grid-template-*`, `grid-gap`, `grid-column`, `grid-row` | Fully stripped. Use `table` layout instead |
| **Position** | `position: fixed`, `position: sticky`, `position: absolute` | Fixed/sticky are always stripped. Absolute is stripped by enforcePlatformCSS for WeChat (renders unreliably in WebView). Use `position: relative` + offsets or `float` |
| **Transform** | `transform`, `transform-origin` | Stripped. WeChat's `WECHAT_SUPPORT.transform = false`. Cannot use `translateX/Y/Z`, `rotate`, `scale` |
| **Transition** | `transition`, `transition-*` | Stripped. No animation support |
| **Animation** | `animation`, `animation-*`, `@keyframes` | Fully stripped on all platforms |
| **Filter** | `filter`, `backdrop-filter` | Stripped. No blur, brightness, contrast, etc. |
| **CSS Variables** | `var(--xxx)` | Not resolved by WeChat. InkForge replaces them pre-export via `replaceCssVariables()` and strips residuals |
| **calc()** | `calc(...)` expressions | Stripped. Must pre-compute values |
| **clamp()** | `clamp(...)` expressions | Stripped |
| **@media** | Media queries | Stripped. Inline styles have no media query support |
| **Clip/Mask** | `clip-path`, `mask`, `-webkit-mask`, `mask-image` | Fully stripped |
| **Text Shadow** | `text-shadow` | Stripped by `postProcessForWechat` |
| **Background Clip Text** | `background-clip: text`, `-webkit-background-clip: text`, `-webkit-text-fill-color: transparent` | Stripped. Gradient text effects do not work |
| **Inset Box Shadow** | `box-shadow: ... inset ...` | Stripped by `postProcessForWechat` (non-inset box-shadow IS preserved) |
| **`<style>` Tags** | Any `<style>` block | Stripped by WeChat editor on paste. Must use inline `style=""` attributes |
| **`class` Attributes** | `class="..."` | Stripped by WeChat editor. InkForge's `postProcessForWechat` removes all class attributes preemptively |
| **Pseudo-elements** | `::before`, `::after`, `::first-letter`, `::first-line`, `::marker` | Not applicable for inline styles. Must be converted to real HTML elements pre-export |
| **Pseudo-classes** | `:hover`, `:focus`, `:first-of-type`, `:nth-child()`, etc. | Not applicable for inline styles |
| **@font-face** | Custom font declarations | Stripped with `<style>` tag. WeChat uses system fonts only |
| **@import** / **@charset** | CSS imports | Stripped (also blocked by security patterns) |

---

## 4. Custom Fonts (`font-family`)

### Does WeChat support custom fonts?

**NO for `@font-face` / web fonts. YES for system font stacks.**

- WeChat strips `<style>` tags, so `@font-face` declarations are lost
- WeChat does NOT load external font files (no `<link>` for fonts, no remote URLs)
- WeChat DOES respect `font-family` declarations in inline styles, but only resolves fonts that are already installed on the user's device

### Recommended font stacks for WeChat

From InkForge's `wechat.css` and doocs/md conventions:

**Sans-serif (default):**
```
-apple-system-font, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC",
"Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif
```

**Serif:**
```
"Source Serif 4", "Noto Serif SC", "Source Han Serif SC", STSong,
"Songti SC", SimSun, serif
```

**Monospace (code):**
```
"Fira Code", "Roboto Mono", Menlo, Monaco, Consolas, monospace
```

### Key Constraint

InkForge ships 13 woff2 custom fonts for the preview panel, but these **cannot** be used in the WeChat export. The export must fall back to system font stacks. The preview can render custom fonts because it runs in InkForge's own renderer.

---

## 5. Pseudo-Elements (`::before`, `::after`)

### Does WeChat support pseudo-elements?

**NO, indirectly.** WeChat does not strip pseudo-elements per se -- the issue is that:
1. WeChat strips `<style>` tags, which is where pseudo-element rules are defined
2. Inline `style=""` attributes cannot define pseudo-elements (this is a CSS language limitation, not a WeChat limitation)
3. Therefore, pseudo-element effects are impossible in WeChat article HTML

### How InkForge Handles This

InkForge uses a three-layer approach:

1. **previewCSS** (for live preview): Freely uses `::before`, `::after`, `::first-letter`, CSS counters. These work because the preview renders in InkForge's own container with `<style>` tags intact.

2. **juice `inlinePseudoElements: true`** (export step): Converts simple `::before`/`::after` with `content: 'text'` into real `<span>` elements. This handles basic text content pseudo-elements.

3. **`applyHeadingDecorations()` + `preset.decorate()`** (export step, post-juice): Manually converts complex pseudo-element effects (CSS counters, drop caps, ornamental dividers, large quote marks) into real HTML `<span>` / `<div>` elements with inline styles.

---

## 6. How doocs/md and mdnice Handle This

### doocs/md (https://github.com/doocs/md)

- Uses juice for CSS inlining (same approach as InkForge)
- All theme CSS is written as a `<style>` block, then juice inlines everything
- Post-processing: CSS variable replacement, nested list fix, image normalization
- Uses `section#nice` as the root container (InkForge follows this convention)
- Does NOT attempt to support pseudo-element effects in WeChat output -- themes are designed with only inline-safe CSS
- Font strategy: System font stacks only, no custom fonts
- Does NOT use juice's `inlinePseudoElements` option (relies on simpler CSS that avoids pseudo-elements entirely)

### mdnice

- Similar juice-based approach to doocs/md
- Has confirmed that `box-shadow` works in WeChat (issue #264)
- Uses `linear-gradient` in themes (confirmed working)
- Themes avoid pseudo-elements entirely in the CSS that gets juice-inlined

### Key Difference from InkForge

Both doocs/md and mdnice take a **simpler approach**: they design their CSS themes to avoid pseudo-elements entirely, so juice inlining "just works" without needing a dual-track `previewCSS`/`exportCSS` system. InkForge's approach is more ambitious -- it defines rich `previewCSS` with pseudo-elements for visual fidelity, then uses `exportCSS` + `decorate()` hooks to produce equivalent WeChat-safe HTML.

---

## 7. Known Limitations and Quirks

### WeChat Editor Quirks

| Quirk | Description | InkForge Mitigation |
|-------|------------|---------------------|
| **Nested list rendering bug** | `<li>` containing `<ul>`/`<ol>` renders incorrectly | `fixNestedLists()` moves child lists to sibling position |
| **Image width/height as attributes** | `<img width="600">` parsed inconsistently | `normalizeImageAttributes()` converts to inline style |
| **margin: auto** not centering | `margin: 0 auto` does not center elements | Replaced with `margin: 0` |
| **External links blocked** | Non-`mp.weixin.qq.com` links trigger security warning | `convertLinksToFootnotes()` converts to bottom references |
| **SVG boundary issues** | SVG copy/paste loses boundaries | Zero-height `<p>` tags added before/after `<section id="nice">` |
| **Mermaid SVG text color** | `<tspan>` elements lose fill color | `fixMermaidSvg()` forces `fill: #333333` |
| **First element top margin** | Extra whitespace at top of article | First block element gets `margin-top: 0` |
| **Class attributes stripped** | All `class=""` removed by editor | InkForge strips classes after decoration hooks complete |
| **Max image width** | Images wider than ~640px may render incorrectly | Clamped to 640px max in `normalizeImageAttributes()` |
| **Content width** | Article body width is approximately 677px | `clampContentWidth()` wraps content in max-width div |

### iOS vs Android Differences

- Gradient rendering has been reported to vary between iOS and Android WeChat versions
- InkForge's approach: always include a solid-color fallback before gradient declarations (e.g., `background: #6366f1; background: linear-gradient(...)`)

### Dark Mode

WeChat supports dark mode via `data-darkmode-color`, `data-darkmode-bgcolor`, `data-darkmode-original-color`, `data-darkmode-original-bgcolor` attributes on block elements. InkForge's `injectDarkModeMetadata()` handles this (opt-in, default OFF).

---

## 8. Summary: What This Means for the previewCSS Task

The core question for the current task is: **Can the preview panel safely use `previewCSS` (with `<style>` tags, pseudo-elements, CSS3 features) instead of the juice-inlined `exportCSS`?**

**Answer: YES**, because:

1. The preview panel renders in InkForge's own iframe/container, NOT in the WeChat editor
2. `<style>` tags work perfectly in the local browser renderer
3. Pseudo-elements (`::before`, `::after`, `::first-letter`) work in the local browser
4. CSS variables, counters, gradients, filters -- all work in the local browser
5. Custom fonts (woff2) work in the local browser
6. XHS and Zhihu previews already use this exact approach (inject `previewCSS` as `<style>`, no juice)

The **export** path must continue using `exportCSS` + juice + `postProcessForWechat` + `enforcePlatformCSS` to produce WeChat-compatible HTML with all CSS3 features stripped or converted.

---

## 9. Files Found (Internal Codebase)

| File Path | Description |
|---|---|
| `inkforge/src/services/export/platform-css.ts` | Platform CSS support matrix -- `WECHAT_SUPPORT` definition |
| `inkforge/src/services/export/wechat.ts` | Main WeChat export engine -- full pipeline with juice, DOMPurify, postProcess |
| `inkforge/src/services/export/platform-rules/wechat.ts` | CJK spacing, content-width clamp, dark-mode metadata |
| `inkforge/src/services/export/css-validator.ts` | `enforcePlatformCSS()` -- final CSS property validation |
| `inkforge/src/services/export/themes.ts` | All 12 presets with `previewCSS` / `exportCSS` definitions |
| `inkforge/src/services/export/preset-decorations.ts` | Decoration recipes: dual-track CSS + HTML decorate hooks |
| `inkforge/src/composables/usePreviewRenderer.ts` | Preview dispatcher -- WeChat currently uses export path |
| `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts` | XHS mock renderer (reference for previewCSS injection pattern) |
| `inkforge/src/services/export/preview-fidelity/zhihu-mock.ts` | Zhihu mock renderer (reference for previewCSS injection pattern) |
| `inkforge/src/styles/editor/wechat.css` | Editor panel WeChat theme CSS |
| `docs/platform-rendering-rules/wechat-rules.md` | Comprehensive rendering rules document |
| `docs/微信渲染规则.md` | v3.1 rendering rules guide (partially outdated) |
| `inkforge/node_modules/.pnpm/juice@11.1.1/node_modules/juice/lib/inline.js` | juice source: `inlinePseudoElements` implementation |

## 10. External References

| Source | URL | Relevance |
|--------|-----|-----------|
| doocs/md | https://github.com/doocs/md | Reference WeChat Markdown editor; uses juice for CSS inlining |
| md.doocs.org | https://md.doocs.org/ | Live demo of doocs/md |
| WeChat `draft_add` API | https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html | Official API docs for article creation |
| WeChat `uploadImage` API | https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_uploadimage.html | Official image upload API |
| juice library | https://github.com/Automattic/juice | CSS inliner used by InkForge and doocs/md |
| mapoet md2wechat | https://mapoet.github.io/posts/2025/11/md2wechat-intro | Community article on Markdown-to-WeChat |
| Tencent Cloud articles | https://cloud.tencent.com/developer/article/1902464 | Community analysis of WeChat editor CSS support |
| mdnice issue #264 | (mdnice GitHub issues) | Confirmed `box-shadow` works in WeChat |
| oaker-io/wewrite | (GitHub) | Reference for CJK/Latin spacing with U+202F |

## Caveats / Not Found

1. **No official WeChat CSS whitelist exists.** WeChat has never published a complete list of supported CSS properties. All knowledge is empirically derived from testing, community tools, and reverse engineering.
2. **Gradient support varies by device.** While `linear-gradient` generally works, some older Android WeChat versions may not render gradients correctly. Always provide solid-color fallbacks.
3. **The `display: flex` question**: InkForge's `docs/platform-rendering-rules/wechat-rules.md` lists `display: flex` as "supported" in the CSS table, but InkForge's actual code (`WECHAT_SUPPORT.flexbox = false`, `postProcessForWechat` strips `display:flex`) treats it as NOT supported. The code behavior is correct -- `display:flex` is unreliable in WeChat and should be avoided.
4. **`transform` ambiguity**: The older `docs/微信渲染规则.md` suggests using `transform: translateY()` as a replacement for `top`. This is OUTDATED -- current code correctly identifies that `transform` is stripped by WeChat (`WECHAT_SUPPORT.transform = false`) and preserves `position: relative` + `top` instead.
5. **juice `inlinePseudoElements` for empty `content: ''`**: When pseudo-elements use `content: ''` (e.g., decorative colored boxes), juice creates a `<span>` with no text. This works if the span has explicit `width`/`height`/`background` in its style, but may be invisible if it relies on parent context. InkForge's `decorate()` hooks handle the complex cases explicitly.
