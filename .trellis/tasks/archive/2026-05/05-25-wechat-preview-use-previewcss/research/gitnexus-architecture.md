# Research: WeChat Export/Preview Rendering Architecture (GitNexus Deep Analysis)

- **Query**: GitNexus 10-query deep analysis of WeChat preview/export rendering pipeline
- **Scope**: internal
- **Date**: 2026-05-25

---

## Query 1: `gitnexus_context({name: "convertToWechat"})` -- 360-degree view

### Result (src/ legacy version -- `src/services/export/wechat.ts:524`)

```json
{
  "incoming": {
    "calls": [
      { "name": "markdownToWechat", "filePath": "src/services/export/wechat.ts" },
      { "name": "convertToPlatform", "filePath": "src/services/export/index.ts" }
    ]
  },
  "outgoing": {
    "calls": [
      { "name": "convertToWechatWithStats", "filePath": "src/services/export/wechat.ts" }
    ]
  }
}
```

### Result (inkforge/ active version -- `inkforge/src/services/export/wechat.ts:1034`)

```json
{
  "incoming": {
    "calls": [
      { "name": "markdownToWechat", "filePath": "inkforge/src/services/export/wechat.ts" },
      { "name": "convertToPlatform", "filePath": "inkforge/src/services/export/index.ts" }
    ]
  },
  "outgoing": {
    "calls": [
      { "name": "convertToWechatWithStats", "filePath": "inkforge/src/services/export/wechat.ts" }
    ]
  }
}
```

### Interpretation

`convertToWechat` is a thin wrapper that calls `convertToWechatWithStats` and returns only `.html`. It is called from two paths:
1. **`convertToPlatform`** (the unified routing function) -- this is the path used by the preview panel
2. **`markdownToWechat`** (direct markdown-to-wechat convenience function)

For creating a wechat mock renderer: the mock renderer would **replace the `convertToPlatform` -> `convertToWechat` path** in `usePreviewRenderer.ts`, similar to how XHS/Zhihu already bypass `convertToPlatform`.

---

## Query 2: `gitnexus_context({name: "generateThemeCSS"})` -- who calls it, with what target parameter

### Result (src/ legacy -- `src/services/export/themes.ts:377`)

```json
{
  "incoming": {
    "calls": [
      { "name": "convertToWechatWithStats", "filePath": "src/services/export/wechat.ts" }
    ]
  },
  "outgoing": {}
}
```

### Result (inkforge/ active -- `inkforge/src/services/export/themes.ts:520`)

```json
{
  "incoming": {
    "calls": [
      { "name": "convertToWechatWithStats", "filePath": "inkforge/src/services/export/wechat.ts" }
    ]
  },
  "outgoing": {}
}
```

### Actual Function Signature (inkforge/ active)

```typescript
export function generateThemeCSS(preset: ExportPreset, target: 'preview' | 'export' = 'export'): string
```

**Dual-track behavior (line 909-921 of inkforge/src/services/export/themes.ts):**
- `target === 'preview'` and `preset.previewCSS` present -> uses `baseCSS + previewCSS` (full CSS3: pseudo-elements, counters, gradients)
- `target === 'export'` and `preset.exportCSS` present -> uses `baseCSS + exportCSS` (juice-safe subset)
- Neither present -> falls through to legacy `customCSS` path

### Interpretation

Currently `convertToWechatWithStats` calls `generateThemeCSS(preset, 'export')` (line 1221 of inkforge wechat.ts). The **export** track produces juice-safe CSS that survives `juice()` inlining + WeChat platform stripping. The **preview** track (`previewCSS`) exists on all 10+ wechat presets but is **never used for wechat preview** -- it is currently only consumed by XHS and Zhihu mock renderers (which accept `themeCSS` options).

This is the core problem: wechat preview uses the export pipeline (with juice + DOMPurify + postProcess), losing preview-quality CSS (pseudo-elements, gradients, counters). A wechat mock renderer could call `generateThemeCSS(preset, 'preview')` instead.

---

## Query 3: `gitnexus_context({name: "convertToPlatform"})` -- the routing function

### Result (src/ legacy -- `src/services/export/index.ts:85`)

```json
{
  "incoming": {
    "calls": [
      { "name": "renderPreview", "filePath": "inkforge/src/composables/usePreviewRenderer.ts" }
    ]
  },
  "outgoing": {
    "calls": [
      { "name": "convertToZhihu", "filePath": "src/services/export/zhihu.ts" },
      { "name": "convertToXiaohongshu", "filePath": "src/services/export/xiaohongshu.ts" },
      { "name": "convertToWechat", "filePath": "src/services/export/wechat.ts" },
      { "name": "getPresetById", "filePath": "src/services/export/themes.ts" },
      { "name": "getDefaultPreset", "filePath": "src/services/export/themes.ts" }
    ]
  }
}
```

### Result (inkforge/ active -- `inkforge/src/services/export/index.ts:237`)

```json
{
  "incoming": {
    "calls": [
      { "name": "convertToNativeFormat", "filePath": "inkforge/src/services/export/index.ts" }
    ]
  },
  "outgoing": {
    "calls": [
      { "name": "renderMarkdownWithLazyOptionalEnhancements" },
      { "name": "convertToZhihu" },
      { "name": "convertToXiaohongshu" },
      { "name": "convertToWechat" },
      { "name": "getPresetById" },
      { "name": "getDefaultPreset" },
      { "name": "mapSettingsFontToPresetFont" }
    ]
  }
}
```

### Interpretation

`convertToPlatform` is the unified routing switch. In `usePreviewRenderer.ts`, the wechat path (the `else` branch at line 225-253) calls `convertToPlatform(body, platform, {...})`. This contrasts with XHS and Zhihu which have **dedicated preview paths** that bypass `convertToPlatform` entirely.

**Key architectural asymmetry**: XHS and Zhihu preview paths go through:
- `markdownToXiaohongshuText` -> `renderXhsMockHtml` (self-contained mock)
- `markdownToZhihuClean` -> `renderZhihuMockHtml` (self-contained mock)

WeChat preview path goes through:
- `convertToPlatform` -> `convertToWechat` -> `convertToWechatWithStats` (full export pipeline with juice, DOMPurify, postProcess)

A wechat mock renderer would add a third dedicated preview path in the `usePreviewRenderer.ts` `renderPreview` function.

---

## Query 4: `gitnexus_impact({target: "convertToWechat", direction: "upstream"})` -- blast radius

### Result

```json
{
  "risk": "LOW",
  "impactedCount": 4,
  "summary": { "direct": 2, "processes_affected": 1, "modules_affected": 2 },
  "affected_processes": [
    { "name": "renderPreview", "filePath": "inkforge/src/composables/usePreviewRenderer.ts",
      "affected_process_count": 4, "earliest_broken_step": 1 }
  ],
  "byDepth": {
    "1": ["markdownToWechat", "convertToPlatform"],
    "2": ["renderPreview"],
    "3": ["scheduleRender"]
  }
}
```

### Interpretation

Risk is LOW. Only 4 symbols affected. The critical dependency chain:
- d=1 (WILL BREAK): `markdownToWechat`, `convertToPlatform`
- d=2 (LIKELY AFFECTED): `renderPreview`
- d=3 (MAY NEED TESTING): `scheduleRender`

For creating a wechat mock renderer: **we do NOT need to modify `convertToWechat` itself**. The mock renderer would be an alternative path in `renderPreview`, only changing how preview renders wechat -- the export pipeline (`convertToWechat`) stays untouched.

---

## Query 5: `gitnexus_impact({target: "generateThemeCSS", direction: "upstream"})` -- blast radius

### Result

```json
{
  "risk": "LOW",
  "impactedCount": 4,
  "summary": { "direct": 1, "processes_affected": 0, "modules_affected": 1 },
  "byDepth": {
    "1": ["convertToWechatWithStats"],
    "2": ["convertToWechat"],
    "3": ["markdownToWechat", "convertToPlatform"]
  }
}
```

### Interpretation

The only direct caller of `generateThemeCSS` in the wechat context is `convertToWechatWithStats`. A wechat mock renderer would call `generateThemeCSS(preset, 'preview')` directly (new call site), which adds no upstream risk to existing callers.

---

## Query 6: `gitnexus_query({query: "wechat preview rendering pipeline"})` -- execution flows

### Result

No direct processes found matching the query. Key definitions returned:
- `inkforge/src-tauri/src/commands/wechat.rs` -- Rust Tauri backend for WeChat API
- `inkforge/src/services/export/wechat-publish.ts` -- WeChat publish flow (separate from preview)
- `inkforge/src/services/export/quality-detector.ts` -- `detectQuality`, `detectWechatIssues`
- `inkforge/src/services/security/html-sanitizer.ts` -- HTML sanitizer
- `inkforge/src/services/export/wechat.ts` -- `createCssVariableMap`, `replaceCssVariables`

### Interpretation

The wechat preview rendering pipeline is implicit -- it flows through `usePreviewRenderer.renderPreview` -> `convertToPlatform` -> `convertToWechat` -> `convertToWechatWithStats`. GitNexus found the relevant satellite services (quality detection, security, CSS variable handling) but no dedicated "preview" process since wechat currently reuses the export path.

---

## Query 7: `gitnexus_query({query: "preview fidelity mock renderer"})` -- mock renderer patterns

### Result

Key definitions found:
- `inkforge/src/composables/usePreviewRenderer.ts` -- PreviewMeta, PreviewRendererOptions interfaces
- `inkforge/src/services/export/preview-fidelity/zhihu-mock.ts` -- ZhihuMockOptions, ZhihuMockInput
- `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts` -- XhsMockOptions, XhsMockInput

Process matches:
- `proc_268_renderpreview`: RenderPreview -> HexToTintBackground (XHS mock)
- `proc_269_renderpreview`: RenderPreview -> EscapeHtml (XHS mock)

### Interpretation

The preview-fidelity directory (`inkforge/src/services/export/preview-fidelity/`) currently contains two mock renderers:
1. `xiaohongshu-mock.ts` -- XHS card-style preview
2. `zhihu-mock.ts` -- Zhihu answer-style preview

**No `wechat-mock.ts` exists yet.** This is where the new mock renderer would be created, following the established pattern.

---

## Query 8: `gitnexus_query({query: "juice CSS inline"})` -- where juice is used

### Result

Relevant definitions found in CSS-related files:
- `inkforge/src/services/export/renderers/ast.ts` -- InkforgeNode, InkforgeMeta
- `inkforge/src/services/security/css-sanitizer.ts` -- CSSSecurityError
- `inkforge/src/services/export/platform-rules/zhihu.ts` -- ZhihuRuleOptions
- `inkforge/src/services/export/css-validator.ts` -- CSSValidationResult
- `inkforge/src/services/custom-css/runtime.ts` -- CustomCssRuntimeResult

### Supplemental Grep Results (juice usage across codebase)

Juice is used in 3 export engines (all in `src/services/export/`):
1. **wechat.ts:1234** -- `juice(styledHtml, { removeStyleTags: true, preserveImportant: true, inlinePseudoElements: true })`
2. **xiaohongshu.ts:622** -- `juice(styledHtml, { ... })`
3. **zhihu.ts:538** -- `juice(styledHtml, { ... })`

### Interpretation

`juice` is the CSS-inlining library used in all three **export** pipelines. It converts `<style>` blocks into inline `style=""` attributes -- required because WeChat/XHS editors strip `<style>` tags.

**Critical for mock renderer design**: The mock renderer should NOT use juice. The XHS and Zhihu mock renderers prove this pattern -- they inject a `<style>` tag directly (via `renderThemeStyle()`) because the preview pane is a controlled environment (v-html in Vue), not a hostile platform editor. This means the wechat mock can use `<style>` blocks with full CSS3 (pseudo-elements, gradients, counters).

---

## Query 9: `gitnexus_context({name: "renderXhsMockHtml"})` -- XHS reference architecture

### Result

```json
{
  "symbol": {
    "filePath": "inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts",
    "startLine": 123, "endLine": 198
  },
  "incoming": {
    "calls": [
      { "name": "xiaohongshu-mock.test.ts" },
      { "name": "xiaohongshu-mock.test.ts" }
    ]
  },
  "outgoing": {
    "calls": [
      { "name": "escapeHtml" },
      { "name": "renderHeader" },
      { "name": "renderHashtagPills" }
    ]
  },
  "processes": [
    { "id": "proc_268_renderpreview", "name": "RenderPreview -> HexToTintBackground", "step_index": 2 },
    { "id": "proc_269_renderpreview", "name": "RenderPreview -> EscapeHtml", "step_index": 2 }
  ]
}
```

### Architecture Pattern

The XHS mock renderer:
1. **Input**: `XhsMockInput` (text, title, body, hashtags, charCount, overLimit)
2. **Options**: `XhsMockOptions` (presetId, primaryColor, showTitleHeader, showHashtagPills, showCharCounter, **themeCSS**)
3. **Self-contained**: No external dependencies beyond its own file
4. **Inline styles**: All styling via inline `style=""` attributes (fallback)
5. **Theme CSS injection**: Accepts `themeCSS` from preset.previewCSS, wraps in `<style>` block, rescopes `#nice` -> `#xhs-note`
6. **Container ID**: `id="xhs-note"` with `class="xhs-mock"`
7. **No juice**: Styles are either inline (fallback) or via injected `<style>` block
8. **Returns**: Complete HTML string for v-html

### How it's called from `usePreviewRenderer.ts` (lines 152-189):

```typescript
// 1. Run text engine
const textResult = markdownToXiaohongshuText(body)
// 2. Look up preset's previewCSS
const xhsThemeCSS = getXiaohongshuPresets().find(p => p.id === xhsPresetId)?.previewCSS
// 3. Render mock
previewHtml.value = renderXhsMockHtml(input, { presetId, primaryColor, themeCSS: xhsThemeCSS })
// 4. Set metadata
previewMeta.value = { platform: 'xiaohongshu', charCount, overLimit, ... }
```

---

## Query 10: `gitnexus_context({name: "renderZhihuMockHtml"})` -- Zhihu reference architecture

### Result

```json
{
  "symbol": {
    "filePath": "inkforge/src/services/export/preview-fidelity/zhihu-mock.ts",
    "startLine": 118, "endLine": 156
  },
  "incoming": {
    "calls": [
      { "name": "zhihu-mock.test.ts" },
      { "name": "zhihu-mock.test.ts" }
    ]
  },
  "outgoing": {
    "calls": [
      { "name": "convertLatexToEquationImg" },
      { "name": "resolveTokens" },
      { "name": "escapeAttr" },
      { "name": "injectCodeLanguageBadges" },
      { "name": "applyInlineThemeAccents" }
    ]
  },
  "processes": []
}
```

### Architecture Pattern

The Zhihu mock renderer:
1. **Input**: `ZhihuMockInput` (markdown, latexBlocks, latexInlines, mermaidCount, taskListCount)
2. **Options**: `ZhihuMockOptions` (presetId, primaryColor, showLatexAsImg, showCodeLanguageBadge, **themeCSS**)
3. **Uses `marked`**: Renders markdown to HTML internally (unlike XHS which works with pre-processed text)
4. **Post-processing**: Injects code language badges, applies inline theme accents (h1/h2/h3/strong/a/blockquote/table styling)
5. **Theme CSS injection**: Same pattern as XHS -- accepts `themeCSS`, rescopes `#nice` -> `#zhihu-answer` via `renderThemeStyle()`
6. **Container ID**: `id="zhihu-answer"` with `class="zhihu-mock"`
7. **Watermark**: Adds a note about CSS filtering
8. **No juice**: All inline styles set directly

### How it's called from `usePreviewRenderer.ts` (lines 190-224):

```typescript
// 1. Run markdown engine
const mdResult = markdownToZhihuClean(body)
// 2. Look up preset's previewCSS
const zhihuThemeCSS = getZhihuPresets().find(p => p.id === zhihuPresetId)?.previewCSS
// 3. Render mock
previewHtml.value = renderZhihuMockHtml(input, { presetId, primaryColor, themeCSS: zhihuThemeCSS })
// 4. Set metadata
previewMeta.value = { platform: 'zhihu', latexBlocks, latexInlines, ... }
```

---

## Summary: Architecture for a WeChat Mock Renderer

### Current WeChat Preview Path (the problem)

```
usePreviewRenderer.renderPreview()
  -> convertToPlatform(body, 'wechat', { presetId, exportOptions, overrides })
    -> renderMarkdownWithLazyOptionalEnhancements(markdown)   // markdown -> HTML
    -> convertToWechat(html, preset, options)                  // full export pipeline
      -> convertToWechatWithStats(html, preset, options)
        -> DOMPurify sanitize
        -> highlightCodeBlocks
        -> convertLinksToFootnotes
        -> generateThemeCSS(preset, 'export')  <-- uses EXPORT track, not preview
        -> juice(styledHtml, ...)              <-- CSS inlining kills pseudo-elements
        -> applyHeadingDecorations             <-- post-hoc HTML injection for lost effects
        -> postProcessForWechat                <-- strips unsupported CSS
        -> enforcePlatformCSS                  <-- strips more CSS
```

### Proposed WeChat Preview Path (following XHS/Zhihu pattern)

```
usePreviewRenderer.renderPreview()
  -> renderMarkdownWithLazyOptionalEnhancements(body)         // markdown -> HTML
  -> renderWechatMockHtml(input, {                             // new mock renderer
       presetId,
       primaryColor,
       themeCSS: getPresetById(presetId)?.previewCSS,          // uses PREVIEW track!
     })
    -> <style> block with previewCSS (rescoped #nice -> #wechat-article)
    -> inline theme accents (h1/h2/h3/blockquote/table etc.)
    -> WeChat-specific visual chrome (phone frame, article header, etc.)
    -> NO juice, NO DOMPurify, NO postProcessForWechat
```

### Key Files

| File | Role |
|------|------|
| `inkforge/src/composables/usePreviewRenderer.ts` | Router -- needs new `platform === 'wechat'` branch |
| `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts` | Reference implementation (XHS mock) |
| `inkforge/src/services/export/preview-fidelity/zhihu-mock.ts` | Reference implementation (Zhihu mock) |
| `inkforge/src/services/export/themes.ts` | `generateThemeCSS(preset, 'preview')` -- already supports preview track |
| `inkforge/src/services/export/wechat.ts` | Current export engine (NOT to be modified for preview) |
| `inkforge/src/services/export/index.ts` | `convertToPlatform` routing (wechat branch will be bypassed for preview) |
| `inkforge/src/services/export/platform-css.ts` | WECHAT_SUPPORT matrix (reference for what CSS works) |
| `inkforge/src/services/export/types.ts` | ExportPreset type with `previewCSS` field |
| `inkforge/src/services/export/preset-decorations.ts` | Recipe system generating previewCSS/exportCSS |

### Dual Codebase Note

The repository has two parallel source trees:
- `src/` -- legacy version (simpler, fewer features)
- `inkforge/` -- active version (dual-track CSS, preset personas, mock renderers)

All 10 GitNexus queries returned results from both trees. The active development target is `inkforge/`.
