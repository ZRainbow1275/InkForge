# Research: XHS & Zhihu Preview/Export Pipeline Architecture

- **Query**: How do XHS and Zhihu handle preview vs export CSS rendering differently from WeChat? Is there a wechat-mock.ts equivalent?
- **Scope**: internal
- **Date**: 2026-05-25

## Findings

### Files Found

| File Path | Description |
|---|---|
| `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts` | XHS high-fidelity mock renderer for preview |
| `inkforge/src/services/export/preview-fidelity/zhihu-mock.ts` | Zhihu high-fidelity mock renderer for preview |
| `inkforge/src/services/export/xiaohongshu.ts` | XHS HTML export engine (preview-only, uses juice) |
| `inkforge/src/services/export/xiaohongshu-text.ts` | XHS plain-text export engine (actual publish format) |
| `inkforge/src/services/export/zhihu.ts` | Zhihu HTML export engine (preview-only, uses juice) |
| `inkforge/src/services/export/zhihu-markdown.ts` | Zhihu Markdown export engine (actual publish format) |
| `inkforge/src/services/export/themes.ts` | WeChat preset definitions with previewCSS/exportCSS |
| `inkforge/src/services/export/wechat.ts` | WeChat export engine (uses juice + postProcess) |
| `inkforge/src/composables/usePreviewRenderer.ts` | Preview composable: dispatches rendering per platform |
| `inkforge/src/services/export/preview-fidelity/` | Directory: only xhs-mock.ts and zhihu-mock.ts exist; NO wechat-mock.ts |

### Architecture Overview: Three Tiers Per Platform

Each platform has three tiers:
1. **Native artifact engine** -- produces the format the platform actually accepts (text for XHS, markdown for Zhihu, HTML for WeChat)
2. **HTML export engine** -- produces styled HTML for WYSIWYG preview/export (all three use juice to inline CSS)
3. **Mock renderer** (XHS/Zhihu only) -- wraps the native artifact in a platform-specific visual shell for the live preview panel

### How usePreviewRenderer.ts Dispatches

File: `inkforge/src/composables/usePreviewRenderer.ts` (lines 126-253)

```
platform === 'xiaohongshu':
  markdownToXiaohongshuText(body) --> renderXhsMockHtml(textResult, { themeCSS: preset.previewCSS })

platform === 'zhihu':
  markdownToZhihuClean(body) --> renderZhihuMockHtml(mdResult, { themeCSS: preset.previewCSS })

platform === 'wechat' (else branch):
  convertToPlatform(body, platform, ...) --> uses convertToWechat() internally
```

Key difference: XHS and Zhihu preview flows use `previewCSS` from their respective presets; WeChat preview uses `convertToPlatform()` which calls `generateThemeCSS(preset, 'export')` (line 1221 of wechat.ts), meaning WeChat always uses the **export** CSS path even for preview rendering.

### XHS Mock Renderer (`renderXhsMockHtml`)

File: `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts`

**CSS injection method**: `<style>` block via `renderThemeStyle()` (line 221-226)
- Takes `options.themeCSS` (the preset's `previewCSS`)
- Rescopes `#nice` selectors to `#xhs-note`: `css.replace(/#nice\b/g, '#xhs-note')`
- Escapes `</style>` to prevent injection
- Outputs: `<style data-preset-theme="xhs-note">${safe}</style>`
- Injected inside the `<section id="xhs-note">` container, before the article body

**Does NOT use juice**: The mock renderer is entirely self-contained. HTML is built by concatenating template strings with inline styles for the card/header/counter/hashtag/watermark chrome. The `themeCSS` `<style>` block layers on top via normal CSS cascade, overriding the inline fallback styles.

**Article body**: Plain text, HTML-escaped via `escapeHtml()`, rendered with `white-space:pre-wrap`. No HTML formatting is preserved -- it is pure text (matching XHS platform behavior).

### Zhihu Mock Renderer (`renderZhihuMockHtml`)

File: `inkforge/src/services/export/preview-fidelity/zhihu-mock.ts`

**CSS injection method**: `<style>` block via `renderThemeStyle()` (line 180-185)
- Takes `options.themeCSS` (the preset's `previewCSS`)
- Rescopes `#nice` selectors to `#zhihu-answer`: `css.replace(/#nice\b/g, '#zhihu-answer')`
- Escapes `</style>` to prevent injection
- Outputs: `<style data-preset-theme="zhihu-answer">${safe}</style>`
- Injected inside `<section id="zhihu-answer">` before the themed body HTML

**Does NOT use juice**: The mock renderer uses `marked.parse()` to render markdown to HTML, then applies inline styles via regex post-processing (`applyInlineThemeAccents`). The `themeCSS` `<style>` block is injected as a standard `<style>` element for cascade-based theming.

**Body content**: Rich HTML from marked, with inline theme accents (h1/h2/h3/strong/a/blockquote/table styles) applied via regex replacement. Code language badges injected. LaTeX forcibly converted to equation images.

### XHS Export Pipeline (`convertToXiaohongshu`)

File: `inkforge/src/services/export/xiaohongshu.ts`

**Uses juice**: Yes (line 622)
- Builds CSS from `xiaohongshuBaseCSS` + dynamic primary color rules + `preset.customCSS`
- Wraps HTML in `<section id="xhs-note">`, prepends `<style>`, runs through `juice()` to inline everything
- Post-processing: `postProcessForXiaohongshu()` + `enforcePlatformCSS('xiaohongshu')`
- PR4 `preset.decorate()` hook runs after juice (line 631)

**Presets define both previewCSS and exportCSS**: Each XHS preset in `xiaohongshu.ts` (lines 258-408) has:
- `previewCSS`: CSS3 rules with composeRecipes preview variants
- `exportCSS`: juice-safe rules with composeRecipes export variants
- The `decorate` function (HTML-level span injection for pseudo-element effects)

### Zhihu Export Pipeline (`convertToZhihu`)

File: `inkforge/src/services/export/zhihu.ts`

**Uses juice**: Yes (line 538)
- Builds CSS from `generateZhihuCSS(preset)` + `preset.exportCSS`
- Wraps in `<section id="zhihu-answer">`, inlines via `juice()`
- Post-processing: `postProcessForZhihu()` + `enforcePlatformCSS('zhihu')`
- PR4 `preset.decorate()` hook after juice (line 548)

**Presets in ZHIHU_PRESETS** (lines 56-133): Each has:
- `previewCSS`: Used by zhihu-mock.ts via `themeCSS` option
- `exportCSS`: Used by convertToZhihu via juice pipeline

### WeChat Export Pipeline (`convertToWechat` / `convertToWechatWithStats`)

File: `inkforge/src/services/export/wechat.ts`

**Uses juice**: Yes (line 1234)
- CSS: `generateThemeCSS(effectivePreset, 'export')` + `codeThemeCSS`
- Target is always `'export'` -- see line 1221
- Wraps in `<section id="nice">`, inlines via `juice()`
- Post-processing: `applyHeadingDecorations()` + `preset.decorate()` + `enhanceTableStyles()` + `postProcessForWechat()` + `enforcePlatformCSS('wechat')` + `wechatComplianceTransform()`

**WeChat presets in themes.ts** (lines 334-898): Each has:
- `previewCSS`: Full CSS3 with persona base, pseudo-elements, counters, gradients, etc.
- `exportCSS`: juice-safe subset (no pseudo-elements, simpler rules)
- The `generateThemeCSS()` function (lines 909-967) selects based on `target` parameter

### Key Comparison: previewCSS vs exportCSS in themes.ts

The WeChat presets in `themes.ts` demonstrate the most extreme preview/export divergence:

**previewCSS** (e.g., `thesis` preset, lines 349-369):
- Has `::before`/`::after` pseudo-elements (`h3::before { content: '...' }`)
- Uses CSS counters (`counter-reset: legal-section`)
- Uses `::first-letter` pseudo-element for drop cap
- Uses `text-decoration-color`, `font-variant-numeric`, custom `content:` values
- Uses `::after` content decorators on hr

**exportCSS** (e.g., `thesis` preset, lines 370-377):
- Stripped-down version: no pseudo-elements, no counters
- Only basic font/color/margin rules that survive juice inlining
- The `decorate()` function injects equivalent HTML `<span>` wrappers for effects that juice cannot inline

**XHS presets** (in xiaohongshu.ts): previewCSS and exportCSS are nearly identical for most presets, differing only in the `composeRecipes` target ('preview' vs 'export'). The CSS rules themselves are the same.

**Zhihu presets** (in zhihu.ts): Same pattern as XHS -- previewCSS and exportCSS share the same CSS rules, only the composeRecipes target differs.

### The Missing wechat-mock.ts

**Confirmed: There is NO `wechat-mock.ts` in `preview-fidelity/`.**

The `preview-fidelity/` directory contains only:
- `xiaohongshu-mock.ts`
- `xiaohongshu-mock.test.ts`
- `zhihu-mock.ts`
- `zhihu-mock.test.ts`

For the WeChat preview, `usePreviewRenderer.ts` falls into the `else` branch (line 225) and calls `convertToPlatform()`, which ultimately calls `convertToWechat()` with `generateThemeCSS(preset, 'export')`. This means:

1. WeChat preview uses the **export** CSS path (juice-inlined), not the `previewCSS` path
2. XHS and Zhihu previews use the **previewCSS** path (injected as `<style>` blocks, no juice)
3. WeChat is the only platform whose preview rendering does not leverage its `previewCSS` definitions

### Summary: Key Architectural Differences

| Aspect | XHS Preview | Zhihu Preview | WeChat Preview |
|---|---|---|---|
| Mock renderer? | Yes (`xiaohongshu-mock.ts`) | Yes (`zhihu-mock.ts`) | **No** |
| Uses juice? | No | No | **Yes** (via `convertToWechat`) |
| CSS injection | `<style>` block in DOM | `<style>` block in DOM | Inline via juice |
| CSS source | `preset.previewCSS` | `preset.previewCSS` | `generateThemeCSS(preset, 'export')` |
| Body format | Escaped plain text | marked HTML + inline accents | Full export pipeline HTML |
| Pseudo-elements visible? | Yes (via `<style>`) | Yes (via `<style>`) | **No** (juice strips them) |
| Recipe CSS target | `'preview'` | `'preview'` | `'export'` |
| Rescoping | `#nice` -> `#xhs-note` | `#nice` -> `#zhihu-answer` | N/A (stays `#nice`) |

## Caveats / Not Found

- WeChat presets' `previewCSS` is defined in themes.ts but is **never used** in the actual preview rendering path. The `generateThemeCSS()` function supports `target: 'preview'` but `convertToWechat` / `usePreviewRenderer` always passes `'export'`.
- The XHS and Zhihu preview/export CSS differences are minimal (just composeRecipes target). The WeChat preview/export CSS differences are substantial (pseudo-elements, counters, gradients in previewCSS vs stripped-down exportCSS).
