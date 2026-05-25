# Research: Mock Renderer Architecture & WeChat Mock Design

- **Query**: Deep dive into XHS/Zhihu mock renderers, usePreviewRenderer composable, themes.ts decorate pattern, and design for a WeChat mock renderer
- **Scope**: internal
- **Date**: 2026-05-25

---

## 1. Existing Mock Renderers

### 1.1 Xiaohongshu Mock — `renderXhsMockHtml`

**File**: `src/services/export/preview-fidelity/xiaohongshu-mock.ts`

**Function Signature**:
```ts
export function renderXhsMockHtml(
  input: XhsMockInput,
  options: XhsMockOptions = {}
): string
```

**Input Type** (`XhsMockInput`):
| Field | Type | Description |
|---|---|---|
| `text` | `string` | Full published text from `markdownToXiaohongshuText(...).text` |
| `title` | `string?` | Title from `result.title` |
| `body` | `string?` | Body from `result.body` |
| `hashtags` | `string[]?` | Platform-rules processed hashtags |
| `suggestedTags` | `string[]?` | Text engine suggested tags (fallback) |
| `charCount` | `number` | Total character count |
| `overLimit` | `boolean` | Whether exceeds 1000 char limit |

**Options Type** (`XhsMockOptions`):
| Field | Type | Description |
|---|---|---|
| `presetId` | `XhsMockPresetId?` | `'fresh' \| 'simple' \| 'warm' \| 'tech' \| 'nature'` |
| `primaryColor` | `string?` | Override preset primary color |
| `showTitleHeader` | `boolean?` | Show title bar (default true) |
| `showHashtagPills` | `boolean?` | Show hashtag pills (default true) |
| `showCharCounter` | `boolean?` | Show char counter (default true) |
| `themeCSS` | `string?` | From `themes.ts` xhs preset's `previewCSS` |

**HTML Structure Generated**:
```html
<section id="xhs-note" class="xhs-mock" data-preset="{presetId}" style="{sectionStyle}">
  {themeStyle}          <!-- <style data-preset-theme="xhs-note">...</style> -->
  {headerSection}       <!-- <header class="xhs-mock-meta"> with counter + title -->
  <article class="xhs-mock-body" style="{articleStyle}">{escaped body text}</article>
  {hashtagSection}      <!-- <footer class="xhs-mock-hashtags"> with pill spans -->
  <div class="xhs-mock-watermark" style="{watermarkStyle}">...</div>
</section>
```

**Container ID**: `xhs-note`

**CSS Rescoping** (line 223):
```ts
const rescoped = css.replace(/#nice\b/g, '#xhs-note')
const safe = rescoped.replace(/<\/style/gi, '<\\/style')
return `<style data-preset-theme="xhs-note">${safe}</style>`
```

**Key Design Notes**:
- Self-contained: no external dependencies, no marked, no DOMPurify
- Content is **plain text** (escaped with `escapeHtml`), not HTML
- Has 5 internal preset tokens (colors, font, background)
- Title emoji decorations per preset
- Watermark text: `'小红书 . 发布预览'`

---

### 1.2 Zhihu Mock — `renderZhihuMockHtml`

**File**: `src/services/export/preview-fidelity/zhihu-mock.ts`

**Function Signature**:
```ts
export function renderZhihuMockHtml(
  input: ZhihuMockInput,
  options?: ZhihuMockOptions
): string
```

**Input Type** (`ZhihuMockInput`):
| Field | Type | Description |
|---|---|---|
| `markdown` | `string` | From `markdownToZhihuClean(...).markdown` |
| `latexBlocks` | `number?` | Block-level LaTeX count (metadata only) |
| `latexInlines` | `number?` | Inline LaTeX count (metadata only) |
| `mermaidCount` | `number?` | Mermaid block count (metadata only) |
| `taskListCount` | `number?` | Task list count (metadata only) |

**Options Type** (`ZhihuMockOptions`):
| Field | Type | Description |
|---|---|---|
| `presetId` | `ZhihuMockPresetId?` | `'academic' \| 'tech' \| 'insight'` |
| `primaryColor` | `string?` | Override preset primary color |
| `showLatexAsImg` | `boolean?` | Force LaTeX to equation img (default true) |
| `showCodeLanguageBadge` | `boolean?` | Show code language badge (default true) |
| `themeCSS` | `string?` | From `themes.ts` zhihu preset's `previewCSS` |

**HTML Structure Generated**:
```html
<section id="zhihu-answer" class="zhihu-mock zhihu-mock-{presetId}"
         data-primary="{primaryColor}" style="{containerStyle}">
  {themeStyle}         <!-- <style data-preset-theme="zhihu-answer">...</style> -->
  {themedHtml}         <!-- marked-rendered HTML with inline theme accents -->
  {watermark}          <!-- <div class="zhihu-mock-watermark">...</div> -->
</section>
```

**Container ID**: `zhihu-answer`

**CSS Rescoping** (line 183):
```ts
const rescoped = css.replace(/#nice\b/g, '#zhihu-answer')
const safe = rescoped.replace(/<\/style/gi, '<\\/style')
return `<style data-preset-theme="zhihu-answer">${safe}</style>`
```

**Key Design Notes**:
- Uses `marked` to parse markdown into HTML (line 143)
- Uses `convertLatexToEquationImg` from platform-rules/zhihu (external dependency)
- Post-processes with `injectCodeLanguageBadges` and `applyInlineThemeAccents`
- `applyInlineThemeAccents` adds inline styles to h1-h3, strong, a, blockquote, table elements
- Has 3 internal preset tokens (colors, font, fontSize, background)
- Watermark text: `'预览 . 知乎 web 编辑器会过滤大部分 CSS'`

---

## 2. usePreviewRenderer.ts — Platform Dispatch

**File**: `src/composables/usePreviewRenderer.ts`

### How Each Platform Branch Works

The `renderPreview()` function (line 126) has three branches:

#### WeChat Branch (line 225-253) — Current "else" fallback
```ts
} else {
  const { convertToPlatform } = await import('@/services/export')
  const result = await convertToPlatform(body, platform, {
    presetId,
    exportOptions: { ... },
    overrides: { primaryColor, fontFamily: appearance.fontFamily },
  })
  previewHtml.value = result
  previewMeta.value = { platform: 'wechat', isSample: isEmptyBody }
}
```
- Uses the full `convertToPlatform` pipeline (markdown -> HTML -> wechat processing)
- Returns minimal metadata: only `platform` and `isSample`
- This is the path that needs a mock renderer

#### Xiaohongshu Branch (line 152-189)
```ts
if (platform === 'xiaohongshu') {
  const { markdownToXiaohongshuText, getXiaohongshuPresets } = await import('@/services/export')
  const { renderXhsMockHtml } = await import('@/services/export/preview-fidelity/xiaohongshu-mock')
  const textResult = markdownToXiaohongshuText(body)
  // ...stale check...
  const xhsKey = stripXhsPresetPrefix(presetId)
  const xhsPresetId = xhsKey ? `xhs-${xhsKey}` : undefined
  const xhsThemeCSS = xhsPresetId
    ? getXiaohongshuPresets().find((p) => p.id === xhsPresetId)?.previewCSS
    : undefined
  previewHtml.value = renderXhsMockHtml(input, { presetId: xhsKey, primaryColor, themeCSS: xhsThemeCSS })
  previewMeta.value = { platform: 'xiaohongshu', charCount, overLimit, ... }
}
```

**Pattern**: 
1. Dynamic import platform text engine + mock renderer
2. Run text engine: `markdownToXiaohongshuText(body)`
3. Stale check: `if (isStale()) return`
4. Resolve preset key via `stripXhsPresetPrefix(presetId)` -> short key
5. Look up platform preset and extract `previewCSS` from it
6. Call mock renderer with input + options (including `themeCSS`)
7. Set `previewMeta` with platform-specific fields

#### Zhihu Branch (line 190-224)
```ts
} else if (platform === 'zhihu') {
  const { markdownToZhihuClean, getZhihuPresets } = await import('@/services/export')
  const { renderZhihuMockHtml } = await import('@/services/export/preview-fidelity/zhihu-mock')
  const mdResult = markdownToZhihuClean(body)
  // ...stale check...
  const zhihuKey = stripZhihuPresetPrefix(presetId)
  const zhihuPresetId = zhihuKey ? `zhihu-${zhihuKey}` : undefined
  const zhihuThemeCSS = zhihuPresetId
    ? getZhihuPresets().find((p) => p.id === zhihuPresetId)?.previewCSS
    : undefined
  previewHtml.value = renderZhihuMockHtml(input, { presetId: zhihuKey, primaryColor, themeCSS: zhihuThemeCSS })
  previewMeta.value = { platform: 'zhihu', latexBlocks, latexInlines, ... }
}
```

**Pattern is identical to XHS**: engine -> stale check -> resolve preset -> extract previewCSS -> render mock -> set meta.

### Helper Functions
- `stripXhsPresetPrefix(presetId)`: extracts `'fresh'` from `'xhs-fresh'` (line 271-277)
- `stripZhihuPresetPrefix(presetId)`: extracts `'academic'` from `'zhihu-academic'` (line 279-285)

---

## 3. themes.ts — `decorate` Function Pattern

**File**: `src/services/export/themes.ts`

### Preset Structure (WeChat presets)
Each `ExportPreset` in `themePresets[]` has:
```ts
{
  id: string,            // e.g. 'thesis', 'legal', 'report'
  previewCSS: string,    // Full CSS3 for preview pane (pseudo-elements, counters, gradients)
  exportCSS: string,     // Juice-safe CSS subset for platform exports
  decorate: (html: string, target: ExportTarget) => string,  // Post-process hook
  customCSS: string,     // Legacy path
  // ...other fields
}
```

### How `decorate` Works
The `decorate` function on each preset delegates to the composed recipe pipeline:

```ts
// Example from thesis preset (line 378):
decorate: (html: string, target: ExportTarget): string => thesisRecipesExport.decorate(html, target)
```

Where `thesisRecipesExport` comes from:
```ts
const thesisRecipesExport = composeRecipes(['cjk-decimal-h2', 'h2-underline-fine'], { target: 'export' })
```

### `composeRecipes` (from preset-decorations.ts, line 403)
```ts
export function composeRecipes(ids: string[], options: ComposeOptions): ComposedDecoration {
  const recipes = ids.map(id => RECIPES[id]).filter(...)
  const css = recipes.map(r => (options.target === 'preview' ? r.previewCSS : r.exportCSS)).join('\n').trim()
  const decorate = (html: string, target: ExportTarget): string =>
    recipes.reduce((current, recipe) => (recipe.decorate ? recipe.decorate(current, target) : current), html)
  return { css, decorate }
}
```

### How `decorate` Is Called in the WeChat Pipeline (wechat.ts)
```ts
// Line 1246-1248 in wechat.ts:
if (effectivePreset.decorate) {
  decoratedHtml = effectivePreset.decorate(decoratedHtml, 'wechat')
}
```

This happens AFTER `juice` CSS inlining and `applyHeadingDecorations`, but BEFORE `postProcessForWechat`.

### Key Insight for Mock Renderer
The `previewCSS` field on each preset already contains the composed recipe CSS (appended at the end). For example, thesis preset's `previewCSS` includes `${thesisRecipesPreview.css}` at the bottom. The mock renderer does NOT need to call `decorate()` — it simply injects the `previewCSS` via `<style>` tag and the browser handles pseudo-elements natively. The `decorate` function is only needed for **export** targets where CSS pseudo-elements get stripped.

---

## 4. Directory Structure — No index.ts

The `preview-fidelity/` directory has no `index.ts`:
```
src/services/export/preview-fidelity/
  xiaohongshu-mock.ts
  xiaohongshu-mock.test.ts
  zhihu-mock.ts
  zhihu-mock.test.ts
```

Each mock renderer is imported directly by path in `usePreviewRenderer.ts` via dynamic import.

---

## 5. Design for `renderWechatMockHtml`

### 5.1 Container ID: `wechat-article`

Following the pattern:
| Platform | Container ID | Used in |
|---|---|---|
| XHS | `#xhs-note` | xiaohongshu-mock.ts |
| Zhihu | `#zhihu-answer` | zhihu-mock.ts |
| WeChat | `#wechat-article` | **proposed** |

Rationale: `#nice` is the live editor container ID used by themes.ts. The mock renderer needs its own ID so that `previewCSS` rules (which use `#nice`) get rescoped via `#nice` -> `#wechat-article`.

### 5.2 CSS Rescoping Function

Same pattern as XHS/Zhihu:
```ts
function renderThemeStyle(css: string | undefined): string {
  if (!css || !css.trim()) return ''
  const rescoped = css.replace(/#nice\b/g, '#wechat-article')
  const safe = rescoped.replace(/<\/style/gi, '<\\/style')
  return `<style data-preset-theme="wechat-article">${safe}</style>`
}
```

### 5.3 Input Type

WeChat's input comes from `convertToPlatform` which runs a **full HTML pipeline** (markdown -> `renderMarkdownWithLazyOptionalEnhancements` -> HTML). The mock renderer would receive rendered HTML, not markdown or plain text.

```ts
export interface WechatMockInput {
  /** Rendered HTML content (from renderMarkdownWithLazyOptionalEnhancements) */
  html: string
  /** Article word count */
  wordCount?: number
  /** Reading time in minutes */
  readingTime?: number
  /** Whether is empty/sample content */
  isSample?: boolean
}
```

### 5.4 Options Type

```ts
export type WechatMockPresetId = 'thesis' | 'legal' | 'report' | 'commentary' | 'aigc'
  | 'code' | 'notes' | 'news' | 'meme' | 'life' | 'elegant' | 'tech'

export interface WechatMockOptions {
  presetId?: string
  primaryColor?: string
  /** From themes.ts preset.previewCSS, scoped to #wechat-article */
  themeCSS?: string
  /** Show reading time header (default true) */
  showReadingTime?: boolean
}
```

### 5.5 HTML Structure

```html
<section id="wechat-article" class="wechat-mock wechat-mock-{presetId}"
         style="{containerStyle}">
  <style data-preset-theme="wechat-article">{rescoped previewCSS}</style>
  {readingTimeHeader}    <!-- optional -->
  <div class="wechat-mock-body">{sanitized HTML content}</div>
  <div class="wechat-mock-watermark">预览 . 微信公众号</div>
</section>
```

### 5.6 HTML Processing Needs

Unlike XHS (plain text) and Zhihu (marked from markdown), WeChat mock receives **already-rendered HTML**. Key considerations:

1. **DOMPurify**: The existing WeChat pipeline (`wechat.ts`) runs DOMPurify before processing. The mock renderer should also sanitize to prevent XSS in v-html. However, the mock is for preview only (not export), so a lighter sanitization may suffice. Alternatively, reuse the same DOMPurify call from the pipeline.

2. **Reading time header**: The existing WeChat pipeline calls `buildReadingTimeHeader(stats)` from `utils.ts`. The mock could replicate a simplified version or reuse it.

3. **No juice/CSS inlining needed**: The mock injects CSS via `<style>` tag (browser handles it), unlike export where juice inlines CSS. This is the same approach XHS and Zhihu mocks use.

4. **No postProcessForWechat**: The heavy WeChat post-processing (CSS variable replacement, flex removal, class stripping) is only needed for actual WeChat platform export. The mock preview runs in browser and supports all CSS features.

5. **No decorate() call needed**: The `previewCSS` already includes recipe CSS with pseudo-elements (`::before`, `::after`, counters). The browser renders these natively. The `decorate()` function is only needed for export where pseudo-elements die.

### 5.7 How usePreviewRenderer.ts Would Call It

The WeChat branch would change from the current "else" fallback to an explicit `platform === 'wechat'` branch:

```ts
if (platform === 'wechat') {
  // Option A: Generate HTML via the existing pipeline minus heavy post-processing
  const { renderMarkdownWithLazyOptionalEnhancements } = await import('@/services/rendering/lazy-optional-renderer')
  const { renderWechatMockHtml } = await import('@/services/export/preview-fidelity/wechat-mock')
  const { getPresetById } = await import('@/services/export')

  const renderedHtml = await renderMarkdownWithLazyOptionalEnhancements(body)
  if (isStale()) return

  const preset = presetId ? getPresetById(presetId) : undefined
  const wechatThemeCSS = preset?.previewCSS

  previewHtml.value = renderWechatMockHtml(
    { html: renderedHtml, wordCount: ..., readingTime: ... },
    { presetId, primaryColor, themeCSS: wechatThemeCSS, showReadingTime: true }
  )
  previewMeta.value = { platform: 'wechat', isSample: isEmptyBody, charCount: ..., ... }
}
```

No `stripWechatPresetPrefix` helper needed because WeChat preset IDs are bare (e.g., `'thesis'`, `'report'`) -- they don't have a platform prefix like `'xhs-fresh'` or `'zhihu-academic'`.

### 5.8 Metadata Return

Following the `PreviewMeta` interface already defined:
```ts
previewMeta.value = {
  platform: 'wechat',
  charCount: stats.wordCount,
  isSample: isEmptyBody,
}
```

The WeChat mock can return richer metadata if `calculateStats` is called on the rendered HTML.

---

## 6. Summary Comparison Table

| Aspect | XHS Mock | Zhihu Mock | WeChat Mock (proposed) |
|---|---|---|---|
| **Container ID** | `#xhs-note` | `#zhihu-answer` | `#wechat-article` |
| **Input format** | Plain text (escaped) | Markdown (marked-parsed) | Rendered HTML |
| **Engine used** | None (self-contained) | `marked` + `convertLatexToEquationImg` | `renderMarkdownWithLazyOptionalEnhancements` |
| **CSS rescope** | `#nice` -> `#xhs-note` | `#nice` -> `#zhihu-answer` | `#nice` -> `#wechat-article` |
| **Style injection** | `<style data-preset-theme="xhs-note">` | `<style data-preset-theme="zhihu-answer">` | `<style data-preset-theme="wechat-article">` |
| **Post-processing** | None | `injectCodeLanguageBadges` + `applyInlineThemeAccents` | Light sanitization only |
| **decorate() needed** | No | No | No (previewCSS has recipe CSS with pseudo-elements) |
| **Watermark** | `'小红书 . 发布预览'` | `'预览 . 知乎 web 编辑器会过滤大部分 CSS'` | `'预览 . 微信公众号'` |
| **External deps** | None | `marked`, `convertLatexToEquationImg` | `renderMarkdownWithLazyOptionalEnhancements`, `DOMPurify` (optional) |
| **Preset count** | 5 | 3 | 12 (all themePresets) |

---

## 7. Files Found

| File Path | Description |
|---|---|
| `src/services/export/preview-fidelity/xiaohongshu-mock.ts` | XHS mock renderer (326 lines, self-contained) |
| `src/services/export/preview-fidelity/zhihu-mock.ts` | Zhihu mock renderer (270 lines, uses marked + LaTeX converter) |
| `src/composables/usePreviewRenderer.ts` | Preview composable with platform dispatch (327 lines) |
| `src/services/export/themes.ts` | 12 WeChat presets with previewCSS + exportCSS + decorate (1089 lines) |
| `src/services/export/preset-decorations.ts` | Recipe system: composeRecipes, 9 decoration recipes (413 lines) |
| `src/services/export/types.ts` | Type definitions including XiaohongshuPreset, ZhihuPreset, ExportPreset |
| `src/services/export/wechat.ts` | Full WeChat export pipeline (1346 lines) |
| `src/services/export/index.ts` | Unified export entry with convertToPlatform |

## Caveats / Not Found

- No `index.ts` barrel file in `preview-fidelity/` directory. Each mock is imported directly by path.
- WeChat preset IDs have no platform prefix (unlike `xhs-` and `zhihu-`), so no `stripWechatPresetPrefix` function is needed.
- The existing WeChat pipeline in `usePreviewRenderer.ts` does NOT use a mock renderer at all -- it calls the full `convertToPlatform` which runs the entire export pipeline including juice CSS inlining and heavy WeChat post-processing. This is the core problem: the preview should use `previewCSS` (with full CSS3 features like pseudo-elements) rather than `exportCSS` (juice-safe subset).
- The `calculateStats` function from `utils.ts` would need to be imported if the mock wants to show reading time / word count in metadata. Alternatively, the composable can compute stats separately.
