# Platform Rendering Recon — 微信 / 小红书 / 知乎

**Status**: Recon only (no code modifications). Generated for the multi-platform export/preview elevation initiative.
**Branch**: `dev/visual-fixes`
**Repo root**: `D:\Desktop\Inkforge`
**Indexed source**: `D:\Desktop\Inkforge\inkforge\src\services\export\*`

---

## 0. Architecture Map (cross-platform)

### 0.1 Entry points

There are **two parallel exporter APIs** sharing the same Markdown source:

| API | File | Output | Purpose |
|---|---|---|---|
| `convertToPlatform(md, platform, opts)` | `src\services\export\index.ts:211` | Inline-CSS HTML for **all 3 platforms** | Live preview pane (WorkstationView phone mockup), legacy "复制到平台" button |
| `convertToNativeFormat(md, platform, opts)` | `src\services\export\index.ts:297` | Per-platform native (HTML / text / Markdown) | The "原生产物" surface in `ExportModal.vue` |

These two functions diverge sharply — and that divergence is *the central architectural fact* of this codebase.

### 0.2 Pipeline shape per platform

```
Markdown
  ├─ convertToPlatform path  (preview / legacy copy)
  │     ├─ wechat        : MD → HTML (marked) → convertToWechat   → inline-CSS HTML
  │     ├─ xiaohongshu   : MD → HTML (marked) → convertToXiaohongshu → inline-CSS HTML  (NOT native!)
  │     └─ zhihu         : MD → HTML (marked) → convertToZhihu        → inline-CSS HTML  (NOT native!)
  │
  └─ convertToNativeFormat path (the ExportModal "native artifact" tile)
        ├─ wechat        : same HTML pipeline as above
        ├─ xiaohongshu   : MD → markdownToXiaohongshuText → plain text + decorations
        └─ zhihu         : MD → markdownToZhihuClean     → cleaned Markdown
```

So **the live preview pane shows HTML for all 3 platforms** even though only WeChat actually consumes HTML on its end. For 小红书 the user sees a styled HTML mockup that does **not** represent what gets pasted (which is plain text). For 知乎 the user sees styled HTML even though the artifact is Markdown.

### 0.3 Shared infrastructure

These modules are reused across all three platforms:

| Module | File | Purpose |
|---|---|---|
| `marked` config | `wechat.ts:15`, `xiaohongshu.ts:13`, `zhihu.ts:19`, `index.ts:23` | `breaks: true, gfm: true` |
| `renderMarkdownWithLazyOptionalEnhancements` | `lazy-optional-renderer` (referenced from each engine) | Markdown→HTML primary path |
| `DOMPurify` sanitization | `wechat.ts:790`, `xiaohongshu.ts:447`, `zhihu.ts:414` | XSS guard before juice |
| `juice` CSS inlining | each engine | `<style>...</style>` → inline `style=""` |
| `highlightCodeBlocks` (utils.ts:411) | `utils.ts` | hljs syntax highlight + Mac-frame wrapping |
| `renderAlertBlocks` (utils.ts:490) | `utils.ts` | GFM `[!NOTE]/[!TIP]` → styled `<section>` |
| `enhanceTableStyles` (utils.ts:522) | `utils.ts` | Striped rows, primary-color thead |
| `convertLinksToFootnotes` / `buildFootnoteSection` | `utils.ts:586/622` | External link → numbered footnote |
| `convertTaskListCheckboxes` | `utils.ts:162` | `<input type=checkbox>` → styled span (DOMPurify strips inputs) |
| `cleanEmptyParagraphs`, `limitConsecutiveBreaks` | `utils.ts:202/214` | Whitespace tidying |
| **`enforcePlatformCSS`** | `css-validator.ts:444` | The final safety net — strips/downgrades unsupported CSS based on `platform-css.ts` matrix |
| `PLATFORM_CSS_REGISTRY` | `platform-css.ts:159` | Per-platform CSS support flags (flexbox, grid, gradient, transform, etc.) |
| `detectQuality` | `quality-detector.ts:27` | Markdown-level pre-export linter (per platform) |

The `platform-css.ts` matrix is the **single source of truth** for what each platform supports. It is consulted by `enforcePlatformCSS` and shapes downgrade rules in `FALLBACK_RULES` (`css-validator.ts:71`).

### 0.4 Preview wiring (WorkstationView phone mockup)

`WorkstationView.vue:1432` initializes the `usePreviewRenderer` composable (`src\composables\usePreviewRenderer.ts`). The composable:

1. Imports `convertToPlatform` dynamically (`usePreviewRenderer.ts:91`).
2. Calls it with `platform`, `presetId`, `exportOptions`, and `overrides` (primary color from `appearance.accentColor`, fontFamily from `appearance.fontFamily`).
3. Smart-debounces by document length (50/100/150 ms) and uses `requestAnimationFrame` to avoid blocking paint.
4. Writes the resulting HTML to `previewHtml.value`, which the panel-stage `<div class="preview-content" v-html="previewHtml" />` (`WorkstationView.vue:2752`) renders inside an iPhone-frame mock.

There is also a secondary preview component `src\components\preview\PreviewPanel.vue` (used in the Hub / source flow) that calls `convertToPlatform` directly (no debounce composable, no overrides).

**Key coupling fact**: the live preview uses the **same** `convertToPlatform` function as the legacy "复制样式版" button. So the preview is faithful to what WeChat will receive. But for 小红书/知乎, **the preview drifts from what the user actually publishes** because publish goes through `convertToNativeFormat`, which produces plain text / Markdown.

---

## 1. 微信公众号 (WeChat Official Account)

### 1.1 Current pipeline architecture

File: `src\services\export\wechat.ts`

The hot path is `convertToWechatWithStats(html, preset, options)` at `wechat.ts:765`. Order of operations (numbered Steps in source):

1. **`calculateStats`** — wordCount/readingTime/etc. from raw HTML.
2. **Step 1 — `convertTaskListCheckboxes`** (`wechat.ts:788`) — runs *before* DOMPurify, because DOMPurify strips `<input>`.
3. **Step 2 — DOMPurify sanitize** (`wechat.ts:797–854`) — uses an isolated DOMPurify instance per call (`DOMPurify(window)`), with custom `uponSanitizeAttribute` hook scrubbing dangerous CSS patterns (from `@/config/security`’s `CSS_INJECTION_PATTERNS`). `ALLOWED_TAGS` includes structural + GFM tags only; `FORBID_TAGS` adds `script/style/iframe/object/embed/form/input/button`. Hooks are torn down in `finally`.
4. **Step 2.5** — `cleanEmptyParagraphs` + `limitConsecutiveBreaks`.
5. **Step 3 — `highlightCodeBlocks`** with theme + optional line numbers + optional Mac-style frame.
6. **Step 2.5 (sic, mis-numbered in code) — `renderAlertBlocks`** for GFM `[!NOTE]` etc.
7. **Step 3 — `convertLinksToFootnotes`** (if `enableCiteStatus`). Links to `mp.weixin.qq.com` and anchors are kept inline; everything else is rewritten to `<span>text<sup>[n]</sup></span>` and a footnote section is appended.
8. **Step 4 — Reading-time header** (gradient banner, `utils.ts:692`).
9. Wrap in `<section id="nice">…</section>`.
10. Generate CSS via `generateThemeCSS(preset)` + `codeThemeCSS` (the static atom-one-dark theme block from `themes.ts:9–74`).
11. **`juice`** with `removeStyleTags: true, preserveImportant: true, inlinePseudoElements: true`.
12. **`applyHeadingDecorations`** (`themes.ts:563`) — converts theme-specific pseudo-elements / gradients to real HTML spans (e.g. `thesis` h2 gets `★` star spans, `meme` strong gets a yellow-highlight gradient with solid-color fallback, `tech` h2 gets a gradient bar with solid-color fallback). This runs *after* juice because pseudo-elements don’t survive inlining.
13. `enhanceTableStyles` if enabled.
14. **`postProcessForWechat`** (`wechat.ts:565–738`).
15. **`enforcePlatformCSS(html, 'wechat')`** — final safety net.

`postProcessForWechat` is the WeChat-specific muscle. Stages (quoting source comments):

```ts
// 0. CSS 变量替换（必须在其他处理之前）
// 0.25 安全兜底：strip script/style/iframe/object/embed/form/button paired tags
// 0.5 首元素 margin-top 清零
// 1. 图片属性规范化（normalizeImageAttributes — width/height attrs → inline style, max-width:100%)
// 2. 嵌套列表结构修复（fixNestedLists — moves ul/ol out of li for WeChat)
// 3. Mermaid SVG 文本修复（forces fill on tspan)
// 4. margin: auto 不支持 → margin: 0
// 6. 移除微信不支持的CSS属性 (regex strips: bg-clip:text, position:fixed/sticky,
//    display:flex (not -flex), flex-*, grid-*, var(--*), animation:*, transition:*,
//    backdrop-filter, filter, box-shadow inset, text-shadow, clip-path, mask)
// 7. 清理空style/分号
// 7.5 删除所有 class= 属性  (line wechat.ts:653)
// 8. SVG 兼容 — 在 section#nice 前后插入零高度 <p>
// 9. 表格强制 width:100% + th/td 内联边框
// 10. section#nice 默认样式注入
// 11. blockquote 样式增强（圆角、左侧 4px 主色边框、浅色背景）
// 12. figure / figcaption 样式
```

Then `enforcePlatformCSS` parses every `style="..."` block and runs each declaration through `validateDeclaration` against `WECHAT_SUPPORT` (`platform-css.ts:75`). The matrix says WeChat **does NOT** support: flexbox, grid, gradient, transform, transition, filter, customProperties, mediaQuery, calc, clamp, boxShadow, position:absolute/fixed/sticky.

### 1.2 What's implemented (concrete list)

- **Inline CSS via juice** + bespoke per-engine post-processors that catch what juice misses (table cells, blockquote borders, figure margins).
- **CSS variable map** (`createCssVariableMap`, `wechat.ts:44`) replacing `var(--md-primary-color)` / `--foreground` / `--blockquote-background` etc. with concrete values *before* sanitization.
- **DOMPurify hardening** with `CSS_INJECTION_PATTERNS` from `@/config/security` (URL `javascript:`, expression(), tracking patterns).
- **Hand-rolled scanners** for stripping `<script>`/`<iframe>`/`<form>` etc. as a fallback in case DOMPurify is misconfigured (`stripForbiddenPairedTag`, `wechat.ts:415`).
- **Custom safe attribute scrubber** `stripUnsafeAttributesFromTag` (`wechat.ts:488`) — removes `on*` event handlers and `javascript:` URLs in `href`/`src`.
- **ReDoS hardening** — input length check via `REDOS_PROTECTION.MAX_HTML_LENGTH`; iterative parsers in `fixNestedLists` (`wechat.ts:231`) instead of recursive `[\s\S]*?` regex.
- **CSS property strip list** (`wechat.ts:605–640`) — defensive belt-and-braces removal of unsupported props before `enforcePlatformCSS`.
- **Heading decorations as HTML spans** for themes whose effect can't be CSS-inlined (thesis★, meme highlight, tech gradient bar, elegant 〔〕 brackets).
- **External link → footnote** with `<sup>[n]</sup>` superscripts; `mp.weixin.qq.com` links and anchor links are passed through.
- **Table widths forced 100%**, th/td given inline borders + padding regardless of juice output.
- **`max-width:100%`** automatically added to all `<img>` (no width attr override available).
- **Class-attribute stripping** (`wechat.ts:653`).
- **Quality detector flags**: CSS variable usage, SVG images, external links count, image width >640px, `<style>` tag, unsupported HTML tags, Mermaid blocks (`quality-detector.ts:67–152`).

### 1.3 What's missing or incorrect (vs. real WeChat)

Cross-referenced against `oaker-io/wewrite` constraints doc and the WeChat 开放社区 threads.

| Gap | Severity | Detail |
|---|---|---|
| **No image hosting / re-upload pipeline** | High | External `<img src="https://…">` links are kept as-is. WeChat scrapes images on save *but* with throttling/CORS issues; `inkforge-asset://` local refs would never work. There is no "upload to 微信素材库 then rewrite src" step. The quality detector at `quality-detector.ts:417` warns of >5 external images but does nothing. |
| **No 677px / 640px content-width clamp** | Medium | The quality detector only complains if `<img width="N">` exceeds 640 (`quality-detector.ts:101`). The actual rendered article width on 微信 mobile is ~375 logical pixels, with image max-width usually 677px in editor preview. Nothing in `postProcessForWechat` enforces a wrapper `max-width: 677px`. The `#nice` style injected at `wechat.ts:705` has no `max-width`. |
| **`display: flex` allowed by matrix but stripped by post-processor** | Low | `WECHAT_SUPPORT.flexbox = false` (`platform-css.ts:80`) is correct; community posts confirm WeChat *does* render some flex but unreliably. The line `'display:\\s*flex(?!-)'` (`wechat.ts:614`) strips it. The Mac-frame code-block uses `display: table` instead (`utils.ts:369`) — good. |
| **`<style>` tag kept in test fixture inputs** | Low | `convertToWechatWithStats` test asserts no `<style>` in output (`platform-export-rendering.test.ts:59`). DOMPurify’s `FORBID_TAGS` includes `style`, plus `juice({removeStyleTags: true})` strips author styles. Robust. |
| **Anchor (in-document) links** | Low | `convertLinksToFootnotes` skips `href` starting with `#` (`utils.ts:594`). Good. WeChat strips fragment links anyway. |
| **No defense against `position: relative; top: …`** | Medium | The matrix allows position:relative + top, but `enforcePlatformCSS` doesn’t verify `top/left/right/bottom` units or values. Could surface negative-top tricks that don’t render. |
| **box-shadow downgrade is to `border:1px solid #e0e0e0`** | Medium | (`css-validator.ts:140`). Visually quite different from the original effect; some themes may end up with arbitrary borders they didn’t want. |
| **Gradient inside `background-image` shorthand** | Medium | `enforceDeclarations` strips entire `background:` declaration if it contains a gradient (`css-validator.ts:494`). But shorthand like `background:#fff url(...) ...,linear-gradient(...)` will have the **whole** background nuked, including the fallback color. Not catastrophic — `applyHeadingDecorations` provides solid-color fallbacks for known themes — but bespoke user CSS would lose its color. |
| **Mermaid handling** | Medium | Mermaid SVG is rendered upstream by the lazy renderer. WeChat **does not reliably keep `<svg>`** — community confirms that complex SVGs are stripped or converted unreliably. Current code only fixes `tspan` colors (`wechat.ts:94`). The quality detector warns ("可能存在兼容性问题") but no automatic rasterization. |
| **`<sup>` footnote anchors lose color in dark mode** | Low | The `style="color:#0066cc"` baked into the sup is fine in light mode. WeChat dark mode auto-inverts but only for `data-darkmode-color` annotated nodes (per `oaker-io/wewrite` docs). Not handled. |
| **No `data-*` darkmode attributes** | Low | Same as above — list, blockquote backgrounds will look wrong in WeChat dark mode. |
| **No CJK/Latin spacing fix** | Low | Mature WeChat tools (mdnice, doocs/md, oaker-io) auto-insert thin spaces between Chinese and Latin characters. Inkforge does not. |
| **Footnote link href is preserved but unclickable in preview** | Low | The footnote section `buildFootnoteSection` (`utils.ts:622`) writes the URL as plain text inside `<span>`. That's actually correct for WeChat (links would get the anti-phishing interstitial), but reads as missing functionality. |

### 1.4 Test coverage (file: `platform-export-rendering.test.ts`)

The single WeChat test (lines 41–69) verifies:
- No `<style>` / `<script>` / `<iframe>` / `<form>` / `<input>` survives.
- No `class=` survives.
- No `javascript:` / `onclick=` survives.
- No `display:flex` / `gap:8px` / `var(...)` survives.
- Some `style=` is present.
- `max-width:100%` is present (image normalization).
- `border:1px solid #ddd` is present (table cell border injection).
- The external link `https://vite.dev` is preserved (footnote conversion path).

**Gaps in coverage**:
- No assertion on the `[1]` footnote rendering or its link in the footnote section.
- No assertion on `position:fixed` → `relative` downgrade.
- No assertion on `box-shadow` / `transform` / `transition` strips.
- No assertion on heading decorations (thesis ★, tech gradient, etc.).
- No assertion on Mermaid handling.
- No assertion on width clamp.
- No assertion on dark-mode metadata.
- No tests for >`MAX_HTML_LENGTH` truncation behavior.

### 1.5 Coupling to preview

Live preview = **identical pipeline** to export (both call `convertToPlatform → convertToWechat`), then mounted with `v-html` inside the iPhone-mockup `<div class="device-screen">` at `WorkstationView.vue:2752`. The phone frame is **purely decorative CSS** — there's no scaling/clamping to the WeChat 375pt viewport. So a wide table or 800px image in the preview will look fine, but break in the real 微信 app.

---

## 2. 小红书 (Xiaohongshu / RED)

### 2.1 Current pipeline architecture

There are **two independent engines**, intentionally:

| Engine | File | Output | Used by |
|---|---|---|---|
| `convertToXiaohongshu` (HTML) | `xiaohongshu.ts:424` | Inline-CSS HTML | `convertToPlatform` → live preview |
| `markdownToXiaohongshuText` | `xiaohongshu-text.ts:126` | Plain text + decorations | `convertToNativeFormat` → publish artifact |

The HTML engine wraps content in `<section id="xhs-note">…</section>` with a strong "fresh/simple/warm/tech/nature" preset system, primary color `#FF2442`, signature block, gradient blockquote, dashed-underline links, etc. (See `xiaohongshu.ts:24–230` for the base CSS.)

The text engine takes a fundamentally different shape: it operates **directly on Markdown** (no marked, no DOMPurify, no juice), running 18 ordered transformation steps:

```
0  guard empty input
1  degradeCitationsForPlainText (footnotes/citations → readable text)
2  convertCodeBlocks  (≤5 lines → quoted; >5 → "建议截图展示")
3  convertTables      (markdown table → "[表格] H1 / H2\n1. …\n2. …" list form)
4  ```mermaid``` → "[配图] 图表建议转为图片"
5  convertLatex       (block $$..$$ → "[公式] …"; inline $..$ → strip $)
6  convertHeadings    (# → "【…】", ## → ". …", ### → "- …", #### → "补充：…")
7  convertLists       (numeric/bullet, with style-specific markers ① ▸ etc.)
8  convertBlockquotes (multi-line quote merge, prefixed with "摘录:" / "片段:")
9  convertAlertBlocks (GFM [!NOTE] → "说明:")
10 convertImages      ("[配图] 见<alt>")
11 convertLinks       ("text（检索关键词「text」）")
12 ---/___/*** → divider symbols
13 - [x] / - [ ] → √ / □
14 cleanMarkdownSyntax (strip **/*/__/_, HTML tags, entities)
15 splitParagraphs    (autoSplit: maxLines per paragraph, default 5)
16 adjustDecorationDensity (auto-injects "·"/"—"/"要点：" if <0.5%)
17 add signature      ("— 感谢阅读")
18 finalCleanup       (collapse blank lines)
```

Returns `{ text, charCount, overLimit (>1000), paragraphCount, emojiCount, suggestedTags }`. The tags are auto-extracted from headings and `**bold**` tokens (`xiaohongshu-text.ts:570–596`).

The HTML engine pipeline `convertToXiaohongshu`:

1. ReDoS length check.
2. Resolve preset + apply `colorOverrides`.
3. `convertTaskListCheckboxes`.
4. DOMPurify with extended `ALLOWED_TAGS` (table/section/sup/sub/mark).
5. `cleanEmptyParagraphs` + `limitConsecutiveBreaks`.
6. `renderAlertBlocks`.
7. `highlightCodeBlocks` with **light theme** (`atom-one-light`) — explicit override.
8. `enhanceTableStyles`.
9. `<hr>` → `<div class="xhs-divider">…</div>` with preset's `dividerText`.
10. **All `<a>` → `<span>` text-only** (line `xiaohongshu.ts:483`) — links are stripped because XHS doesn’t support outbound clicks.
11. Wrap in `<section id="xhs-note">`.
12. `juice` inline CSS.
13. `postProcessForXiaohongshu`:
    - Strip `position:fixed/sticky`, `animation:*`, `transition:*`.
    - Add `border-radius:12px` to images.
    - Inline border + padding on `<th>`/`<td>` (juice may miss).
    - **Per-preset heading decoration** via `getHeadingDecorationStyle` (line `xiaohongshu.ts:306`): dashed border for fresh, gradient bg for warm, left bar for tech, etc.
    - Inject preset-specific list bullets (`<span>${listMarker}</span>` before `<li>` content).
    - Append signature block ("感谢阅读") before final `</section>`.
14. `enforcePlatformCSS(html, 'xiaohongshu')`. The matrix here is more permissive — flexbox **yes**, gradient **yes**, transform **yes**, but **no** transition / filter / customProperties / clamp.

### 2.2 What's implemented

HTML engine: full styling kit, 5 preset themes, link→span downgrade, signature block, preset-aware list markers and dividers, table enhancement, code highlighting (light theme), Alert blocks, heading decorations.

Text engine: comprehensive Markdown → text conversion covering everything the HTML engine does plus tables → numbered list, code → "建议截图", LaTeX → "[公式]", auto-decoration density (`adjustDecorationDensity`, 0.5%–3% target), tag extraction, char-count + over-limit flag.

Quality detector (`quality-detector.ts:158–280`):
- Char count vs. 1000-char hard limit (error) and 800 (suggestion).
- Title length >20 chars (warning).
- Paragraphs >5 lines.
- Decoration marker density 0.5%–3%.
- HTML tag presence (error — XHS is plain text).
- Link count warning.
- Markdown table presence warning.
- Code blocks warning.
- LaTeX formula warning.

### 2.3 What's missing or incorrect (vs. real RED)

Cross-referenced against `ostmcn.com`, `Reditor` editor docs, `06925.com`.

| Gap | Severity | Detail |
|---|---|---|
| **The HTML preview lies to the user** | **High** | `convertToPlatform('xiaohongshu', …)` produces gradient backgrounds, dashed underlines, custom blockquotes, signature blocks. **None of these survive paste into RED**, which is plain text. The user sees a beautiful card in the iPhone mockup that does not match what they will publish. The "原生产物" tile in `ExportModal.vue` shows the actual text artifact, but it's smaller and easy to ignore. The phone-mockup preview should render the *text* engine output, not the HTML engine output. |
| **Signature is hard-coded "感谢阅读"** | Low | `xiaohongshu.ts:401`. Only the text-engine version respects `options.signatureText` (`xiaohongshu-text.ts:206`). |
| **No emoji-density heuristic in the HTML engine** | Low | The text engine has `adjustDecorationDensity`. The HTML engine doesn't. So preview densities differ from what publishing produces. |
| **No `#话题` hashtag composition** | Medium | `extractSuggestedTags` only returns `#kw1, #kw2…` strings (`xiaohongshu-text.ts:570`). They are returned in the result struct but **never appended to the text body**. The user must copy them separately, which most won't notice. |
| **Tag normalization rule is naive** | Low | `normalizeXiaohongshuTopicTag` (`xiaohongshu-text.ts:555`) strips punctuation and joins, but doesn't deduplicate against banned-word list, doesn't enforce the 1-3 hot + 1 niche tag composition recommended in the `ostmcn` and `06925` guides. |
| **Title is not separated** | Medium | RED has a separate title field (≤20 chars) and a body field (≤1000). The export concatenates the H1 inline. The user must hand-split. |
| **Image-first prompt** | Medium | RED is image-first (3:4 ratio, ≤9 images per note). No explicit guidance / placeholder generation in the artifact — only `[配图] 见架构图` which doesn't tell the user the aspect ratio target. |
| **Char limit guidance is iOS-Android split** | Low | `Reditor` editor docs note that iOS and Android count chars slightly differently. Inkforge uses `text.length` (`xiaohongshu-text.ts:215`), which works for either but isn't called out. |
| **`autoSplitParagraphs` defaults to 5 lines, but RED prefers 1-3** | Medium | `xiaohongshu-text.ts:144` defaults `maxLinesPerParagraph: 5`. The Reditor doc and `06925` both recommend 1-3 lines per paragraph. Default is too long. |
| **Decoration set is fixed at 5 styles** | Low | All five styles (fresh/simple/warm/tech/nature) hard-coded in `DECORATION_STYLES` at `xiaohongshu-text.ts:44`. Adding a new preset means editing TS. |
| **HTML engine `enforcePlatformCSS` permits flexbox** | Low | Matrix says `XIAOHONGSHU_SUPPORT.flexbox = true` (`platform-css.ts:106`). But the actual RED long-form note editor doesn't reliably render flex either; this is too permissive. The `Reditor` Web docs only mention positional symbols and divider lines, never CSS. |
| **No "笔记" 9-image carousel awareness** | Medium | RED notes are image-driven; the text portion is captioning. No support for generating "first image suggestion" alt text or laying out a carousel. |

### 2.4 Test coverage

`platform-export-rendering.test.ts:71–88` (text engine):
- Verifies `[配图] 见架构图`, `[代码] 代码片段 (ts):`, `[表格] 渠道 / 原生格式`, `（检索关键词「官网」）` markers.
- Verifies no Markdown / HTML leaks (no ` ``` `, no `<span`, no `style=`, no `class=`, no `![…`, no `](http:`).
- Verifies `overLimit: false`.
- Verifies `suggestedTags` non-empty and shape `^#[^#]{2,20}$`.

`platform-export-rendering.test.ts:108–134` (router):
- Verifies `convertToNativeFormat('xiaohongshu')` returns `format: 'text'`.

**Gaps**:
- HTML engine `convertToXiaohongshu` has **zero test coverage**. No assertion on link→span downgrade, on signature block, on heading decoration per preset, on `enforcePlatformCSS` after juice.
- No char-count edge tests (1000-char boundary).
- No decoration-density tests.
- No tag normalization edge tests (e.g. names with `#` or punctuation).
- No `autoSplitParagraphs` test (verify 5-line vs 1-3-line behavior).

### 2.5 Coupling to preview

`convertToPlatform('xiaohongshu', …)` (used by `usePreviewRenderer.ts:95`) calls the **HTML engine**. So the iPhone mockup shows the HTML version, **not** the text-engine version that gets published. **This is the single biggest UX gap** — the preview misrepresents the artifact.

The `ExportModal` tile labeled "平台原生产物" calls `convertToNativeFormat`, which routes to the text engine (`index.ts:339–359`). So users who open the modal see both versions; users who only look at the workstation phone preview see only the misleading HTML.

---

## 3. 知乎 (Zhihu)

### 3.1 Current pipeline architecture

Two engines, mirroring 小红书:

| Engine | File | Output |
|---|---|---|
| `convertToZhihu` (HTML) | `zhihu.ts:378` | Inline-CSS HTML |
| `markdownToZhihuClean` | `zhihu-markdown.ts:22` | Cleaned Markdown |

`convertToZhihu` flow:

1. ReDoS length check.
2. Resolve preset (academic / tech / insight) + color override (`zhihu.ts:392`).
3. `convertTaskListCheckboxes`.
4. DOMPurify with `ALLOWED_TAGS` and `ALLOWED_ATTR` including `target` (so links can have `_blank`).
5. `cleanEmptyParagraphs` + `limitConsecutiveBreaks`.
6. `renderAlertBlocks` (toggleable).
7. `highlightCodeBlocks` with `enableMacCodeBlock: true` and `enableLanguageLabel: true` *always* (`zhihu.ts:438–444`).
8. `enhanceTableStyles` (toggleable).
9. `convertLinksToFootnotes` if `enableCiteStatus` — same util as WeChat — *plus* a custom Zhihu-styled footnote section (`buildZhihuFootnoteSection`, `zhihu.ts:342`) using `[1]` notation in primary color.
10. Wrap in `<section id="zhihu-answer">`.
11. `generateZhihuCSS(preset)` (`zhihu.ts:75–266`) — preset-aware base CSS with dynamic primary color.
12. `juice` inline.
13. `postProcessForZhihu`: strip `position:fixed/sticky`/animation/transition; ensure `<img>` has `max-width:100%`; ensure th/td have inline borders; ensure table has `width:100%; border-collapse:collapse`.
14. `enforcePlatformCSS(html, 'zhihu')`.

The matrix `ZHIHU_SUPPORT` (`platform-css.ts:132`) is the most permissive: flex, grid, gradient, transform, transition, opacity, filter, mediaQuery, calc, clamp **all true**. Only `customProperties` (CSS vars) is `false`.

`markdownToZhihuClean` is "subtractive": it preserves Markdown source structure and surgically removes hostile bits.

```
1  trim
2  Protect $$..$$ and $..$ LaTeX with %%LATEX_BLOCK_n%% / %%LATEX_INLINE_n%%
3  Protect ```...``` (mermaid → "知乎不支持 Mermaid 渲染，建议截图后上传."; others preserved as-is)
4  Protect `inline code` with %%INLINE_CODE_n%%
5  cleanHtmlTags  (strong/em/a etc → strip tag, keep content; block tags → newline)
6  strip style="…" and class="…"
7  convertGfmExtensions  ([!NOTE] → "> **注意：**\n", etc.)
8  task lists  - [x] → "- 已完成：", - [ ] → "- 待处理：" (NOTE: not a checkbox preserved)
9  cleanPlatformSpecific  (front matter, rehype comments, HTML comments, zero-width chars)
10 restore protected blocks
11 finalCleanup  (≤2 newlines, trim trailing whitespace)
```

Returns `{ markdown, mermaidCount, taskListCount, cleanedHtmlTags, latexCount }`.

### 3.2 What's implemented

HTML engine: 3 presets, dynamic primary-color-based CSS, Mac-frame code blocks always enabled, language labels always shown, GFM Alert blocks, enhanced tables, footnote section with academic-style `[1]` numbering, dark code theme defaults to `github-dark` for academic preset (per preset config at `zhihu.ts:46`).

Markdown engine: LaTeX block + inline preservation (the `%%LATEX_*%%` placeholder trick prevents accidental mangling), task-list textualization, Mermaid → guidance text, HTML cleanup with semantic-tag preservation, front-matter / rehype-comment scrubbing, zero-width-char strip.

Quality detector (`quality-detector.ts:286–386`):
- HTML-tag presence warning.
- Inline `style=` warning.
- Mermaid count warning.
- Task list count suggestion.
- LaTeX delimiter mismatch (error) — `detectLatexErrors` (`quality-detector.ts:513`) checks `$$` even count + `$` per line even count.
- LaTeX preview reminder ("发布前请在知乎编辑器预览，若未渲染则转换为 equation 图片或截图").
- SVG image warning.
- Long code line >120 chars suggestion.
- Class attribute warning.

### 3.3 What's missing or incorrect (vs. real Zhihu)

Cross-referenced against `Zhihu on VSCode` docs, `chaoskey.github.io/notes`, `Lianm Markdown+LaTex`, `marsggbo`’s `equation?tex=` writeup.

| Gap | Severity | Detail |
|---|---|---|
| **LaTeX is preserved as `$$..$$` but Zhihu's web editor doesn't always render it from imported MD** | **High** | The community-confirmed reliable path is to convert to `<img src="https://www.zhihu.com/equation?tex=…" eeimg="1">` (`marsggbo` blog and `chaoskey/notes` independently document this). Inkforge keeps `$$..$$` source as-is. The quality detector at `quality-detector.ts:341` warns about this, but no automatic conversion. The `ZhihuMarkdownOptions` shape (`types.ts:322`) has `preserveLatex: boolean` and nothing else — there's no `convertLatexToImg` option. |
| **HTML engine output isn't actually shippable to 知乎** | **High** | 知乎's editor strips `<style>`, `class=`, and most inline `style=` (per `quality-detector.ts:303`). Yet `convertToZhihu` produces a fully-styled HTML mock — used for preview and "复制样式版". The user could think they can paste this. The `convertToNativeFormat('zhihu')` route (`index.ts:362`) wisely returns Markdown, but the legacy `convertToPlatform` path doesn't reflect that. |
| **Tables: Markdown engine preserves them; HTML engine adds primary-color thead** | Medium | Per `Zhihu on VSCode` docs (cnblogs.com/shenweiyan), 知乎 server-side **filters tables**. The Markdown engine `markdownToZhihuClean` does *not* warn about this — it leaves the markdown table intact. Only `quality-detector` flags `<table>` HTML, not Markdown tables. |
| **No image rehosting** | Medium | 知乎 supports inline `https://` images, but cross-origin hotlinking is unreliable. No upload-to-zhihu-pic-host step. |
| **Code language detection is partial** | Low | `highlightCodeBlocks` parses `class="language-xxx"` but the markdown engine `markdownToZhihuClean` preserves ` ``` `‍-marked code as-is. The quality detector flags unsupported languages (`quality-detector.ts:467`) but doesn't auto-rewrite. |
| **Task list textualization loses semantics** | Low | `- [x] foo` becomes `- 已完成：foo` (`zhihu-markdown.ts:92`). Some users prefer to keep checkboxes since 知乎 *does* render them in some contexts. No option to preserve. |
| **`<sub>`/`<sup>` HTML preserved but stripped in markdown engine** | Low | `cleanHtmlTags`'s `preserveContentTags` list (`zhihu-markdown.ts:143`) strips `sub/sup` tags but keeps content, losing super/subscript semantics. 知乎 supports `<sup>` natively. |
| **3 hard-coded presets** | Low | Academic / tech / insight only (`zhihu.ts:38–66`). No way to add a fourth without editing TS. |

### 3.4 Test coverage

`platform-export-rendering.test.ts:90–106` (markdown engine):
- Verifies preserved: `[官网](https://vite.dev)`, `![架构图](…)`, markdown table, ` ```ts ` code block, `$$E=mc^2$$`.
- Verifies removed: ` ```mermaid `, `<span`, `style=`, `class=`.
- Verifies `cleanedHtmlTags` contains `'span'`.
- Verifies `mermaidCount: 1`, `latexCount: 1`.
- Verifies `detectQuality` produces issue id `zhihu-latex-preview`.

`platform-export-rendering.test.ts:108–134` (router):
- Verifies `convertToNativeFormat('zhihu')` returns `format: 'markdown'` and content has the original `[官网](https://vite.dev)` link.

**Gaps**:
- HTML engine `convertToZhihu` has **zero test coverage**. No assertion on `[1]` footnote section, on `enableMacCodeBlock` always, on the academic-preset primary color application.
- No assertion on `$..$` inline LaTeX preservation (only block tested).
- No test for the `<img src="zhihu.com/equation?tex=…">` path because that path doesn't exist yet.
- No test for unmatched-`$$` error path.
- No test for `preserveLatex: false`.
- No test for `mermaidHandling: 'remove'`.

### 3.5 Coupling to preview

Same drift problem as 小红书: `convertToPlatform('zhihu', …)` returns styled HTML; the iPhone-mockup preview shows that HTML. The actual artifact (Markdown) is one tile away in `ExportModal`. The styled preview is helpful for "what does the article look like once published" — but only if the styling is faithful. Since 知乎 strips most CSS, the preview overpromises.

---

## 4. External-rule verification (Exa)

Three Exa `web_search_exa` calls, results retained verbatim above.

### 4.1 微信公众号 — `oaker-io/wewrite/references/wechat-constraints.md` (GitHub, latest)

Confirms current Inkforge stance:
- "微信编辑器不允许 `<link>` / `<style>`，只支持 inline `style`."
- Unsupported list: `position: fixed/sticky`, `transform`, `animation`, `@keyframes`, `filter`, `backdrop-filter`.
- Supported list: `color/background/font-size/font-weight/font-family/padding/margin/border/width/height/max-width/text-align/line-height/letter-spacing/border-radius/box-shadow/display/flex/justify-content/align-items` — **note**: this third-party doc claims `box-shadow` and `flex` are supported, which **contradicts** Inkforge's `WECHAT_SUPPORT.flexbox = false / boxShadow = false`. Source: https://github.com/oaker-io/wewrite/blob/main/references/wechat-constraints.md

The 微信开放社区 thread (developers.weixin.qq.com, 2025-03-28) confirms `position` is filtered server-side post-`Add_draft` API — direct evidence the matrix call is correct in spirit even if the third-party doc above is optimistic about flex.

`oaker-io/wewrite` documents auto-fixes Inkforge **does not** implement: CJK-Latin spacing, dark-mode `data-darkmode-color/bgcolor` attributes, table border salvage on `tr/tbody`. These are real-world WeChat behaviors.

### 4.2 小红书 — Reditor editor (help.reditorapp.com, 2025-11-18, **post-cutoff but freshness-trusted**) + ostmcn.com + 06925.com

Confirms:
- **Body limit 1000 chars; title limit 20 chars** — Inkforge matches (`quality-detector.ts:163`).
- Reditor specifically says **"每段控制在1-3行最佳"** — Inkforge default `maxLinesPerParagraph: 5` is too lax.
- Recommended overall structure: 600-1000 chars body; 1-2 emoji per heading; 10-15 emoji total; emoji style consistent. Inkforge has a fuzzy density check (0.5%–3%) but no upper-bound enforcement.
- Hashtag composition: 3-5 tags per note, mix of hot + niche + brand. Inkforge auto-extracts up to 5 tags but doesn't enforce mix or place them in body.
- Image rule: 3:4 minimum ratio, ≤9 per note, ≤60s for video — Inkforge has **no image awareness** in the text engine.
- `[文字背景板]` and `画笔` are platform-only features and can be ignored.

### 4.3 知乎 — `Zhihu on VSCode` (cnblogs.com), `chaoskey/notes`, `marsggbo` blog

Confirms:
- 知乎 supports Markdown upload via the editor's `.md` import flow. Inkforge's `convertToNativeFormat('zhihu')` outputs exactly that.
- LaTeX rendering: `$$..$$` works in some import paths, **fails** in others. The robust pattern is to rewrite `$$x$$` → `<img src="https://www.zhihu.com/equation?tex=x" eeimg="1">` *before* import. Inkforge doesn't do this; it only warns.
- "由于知乎服务端的限制，表格暂不支持，答案中的表格将会被服务端过滤" (`Zhihu on VSCode`) — **direct confirmation** that 知乎 strips tables. Inkforge does not warn about Markdown tables in the markdown engine, only about `<table>` HTML.
- Code blocks need explicit language tag for syntax highlighting on import — `quality-detector.ts:459` ('render-code-language-missing') already flags this.

---

## 5. Recommended refactor plan

### 5.1 Should the pipelines share a common AST?

**Yes, partially.** The data tells me:

- All 3 platforms today share **steps 1–8 of the markdown→html→sanitize→highlight→alerts→tables→footnotes flow** through `marked` + `utils.ts` helpers. That flow is fine.
- Where they diverge is the **target representation**: HTML for WeChat (must be inline-CSS HTML), text for RED (must be plain text), Markdown for 知乎 (must be Markdown). Treating these as one HTML pipeline with three "compliance filters" is wrong, because for RED and 知乎 the HTML transformation is *thrown away* immediately after preview.
- Today's code already acknowledges this with the dual `convertToPlatform` / `convertToNativeFormat` API. The right move is to **make `convertToNativeFormat` the single source of truth** and reduce `convertToPlatform` to "render whatever native artifact the platform expects, wrapped in a frame for visual mockup."

Recommended layered architecture:

```
                  ┌──────────────────────────────────────┐
                  │   InkforgeAST (mdast-like, neutral) │
                  └──────────────────┬───────────────────┘
                                     │
       ┌─────────────────────────────┼─────────────────────────────┐
       ▼                             ▼                             ▼
  WechatRenderer              XiaohongshuRenderer            ZhihuRenderer
  (AST → HTML)                 (AST → text + decor)          (AST → clean MD)
       │                             │                             │
       ▼                             ▼                             ▼
  WechatPostprocess          XiaohongshuTextPostprocess    ZhihuMarkdownPostprocess
  (CSS validator,             (line-split, density,         (LaTeX→equation img,
   image upload,                tag composition,             table→note,
   dark-mode,                   image-suggestion)            mermaid→prompt)
   CJK spacing)
       │                             │                             │
       ▼                             ▼                             ▼
                  enforcePlatformCSS  /  validate length / etc.
                                     │
                                     ▼
                            NativeExportResult
```

The current `marked` + `utils.ts` helpers can become the AST builder (or, more pragmatically, mdast via `unified` + `remark-parse`). Keeping `marked` works too — but its output isn't a structured AST so the renderers have to re-parse HTML, which is what `utils.ts` already does.

### 5.2 New modules needed

| Module | Purpose | Roughly |
|---|---|---|
| `services\export\platform-rules\wechat.ts` | Allowed-CSS whitelist, image-upload contract, dark-mode metadata injector, CJK spacing fixer, 677px wrapper enforcement | ~300 lines |
| `services\export\platform-rules\xiaohongshu.ts` | Body+title splitter, 1-3-line paragraph splitter, hashtag composer (mix hot+niche), image-block placeholder generator, emoji density target by post type | ~250 lines |
| `services\export\platform-rules\zhihu.ts` | LaTeX → `<img src="zhihu.com/equation?tex=…">` rewriter, table → blockquote-with-list fallback, mermaid to prompt, code language coercion | ~200 lines |
| `services\export\image-pipeline\` | Stable asset reference (`inkforge-asset://` resolver), wechat material-library uploader stub, zhihu pic uploader stub, dimension extractor | ~400 lines |
| `services\export\preview-fidelity\xiaohongshu-mock.ts` | Render *text-engine output* inside an HTML frame styled to look like RED, so live preview matches publish artifact | ~150 lines |
| `services\export\preview-fidelity\zhihu-mock.ts` | Same for 知乎 — render the cleaned Markdown through a 知乎-styled CSS pre-rendered as HTML, but **mark it as preview-only** | ~150 lines |
| `services\export\renderers\renderToAST.ts` | Markdown → InkforgeAST adaptor (or unified+remark plumb) | ~120 lines |

### 5.3 Test cases to add

WeChat (`wechat.test.ts`):
- `position: fixed/sticky` → `relative` downgrade.
- `box-shadow: …` → `border: 1px solid …` downgrade.
- `transform: translateX(50%)` removed without leaving `;;` artifact.
- Image with width >677 → wrapper width clamp.
- External image `src` → either footnote pointer or upload placeholder.
- Dark-mode metadata present on h2/blockquote when `enableDarkMode` true.
- CJK-Latin spacing applied: `中文word` → `中文 word`.
- Mermaid SVG → static rasterized image (or warning surfaced to user, no silent breakage).
- Footnote `<sup>[1]</sup>` resolves to `[1]` in footnote section text content.
- 5000-char input still completes within ReDoS budget.

Xiaohongshu (`xiaohongshu-text.test.ts` + `xiaohongshu-html-preview.test.ts`):
- Title >20 chars splits into title + body lead.
- Body >1000 chars truncated with marker showing dropped char count.
- 1-3 lines per paragraph (not 5) when `paragraphMode: 'tight'`.
- Hashtags appended to body footer in correct format.
- Mixed hot+niche tag selection given a controlled tag-popularity input.
- Image alt → `[配图1: 3:4 @ 1080x1440 推荐]`.
- HTML preview engine renders a frame visually consistent with text-engine output (e.g. line breaks match).
- LaTeX `$..$` → unicode replacement, not silent strip.

Zhihu (`zhihu-markdown.test.ts` + `zhihu-html-preview.test.ts`):
- `$$x$$` → `<img src="https://www.zhihu.com/equation?tex=x" eeimg="1">` when `convertLatexToImg: true`.
- Markdown table → blockquote-with-numbered-list fallback when `tableHandling: 'fallback'`.
- Long code lines >120 chars wrap or warn, configurable.
- Mermaid `mermaidHandling: 'remove'` actually leaves no trace.
- Task list preservation toggle works.
- HTML preview engine `<style>` survives juice but is removed by post.

Cross-platform integration test (`pipeline-cross-platform.test.ts`):
- Same Markdown → 3 outputs → assert each output passes its platform's quality detector with zero errors (warnings/suggestions OK).
- Round-trip: take native artifact, paste into mocked platform editor (HTML stripper for 知乎, text-only for RED, inline-CSS validator for WeChat), assert content-fidelity score ≥0.95.

### 5.4 Estimated scope

| Pipeline | Effort | Reasoning |
|---|---|---|
| **WeChat** | **Medium** | Codebase is mature. Real work is image upload contract (genuinely hard, needs real WeChat API integration), CJK spacing + dark-mode (mechanical), 677px clamp (trivial). Image work alone is half the budget. |
| **Xiaohongshu** | **Medium** | Two engines exist; main gap is preview/publish drift and tag composition. Refactor `convertToPlatform('xiaohongshu')` to render the text artifact inside a styled frame. Add hashtag-in-body composer, image placeholder. Title splitter is a clear add. |
| **Zhihu** | **Small-to-Medium** | LaTeX → equation-img is a well-documented one-pass regex transform. Table fallback is straightforward. The HTML-preview-vs-MD-publish drift is a UX fix more than an engineering fix. |

Total realistic scope to close all "High" gaps: **~3 weeks** for one engineer including tests. To also do "Medium" gaps: **~5–6 weeks**.

---

## 6. Top 5 most-pressing gaps (action-ranked)

1. **小红书 preview lies to users** — `convertToPlatform('xiaohongshu')` returns styled HTML while the published artifact is plain text. (`xiaohongshu.ts:424` vs `xiaohongshu-text.ts:126`, both routed via `index.ts:243` and `index.ts:339`.)
2. **知乎 LaTeX is left as `$$…$$`** with only a "请预览" warning, while the proven shippable path (`<img src="https://www.zhihu.com/equation?tex=…" eeimg="1">`) is documented but unimplemented (`zhihu-markdown.ts:39–52`, `quality-detector.ts:341`).
3. **No image hosting / re-upload pipeline for any platform.** External image links are passed through. WeChat material-library, 知乎 pic, RED 9-image carousel — none are integrated. (`wechat.ts:110`, `xiaohongshu.ts:344`, `zhihu.ts:291`.)
4. **HTML engines for 小红书 and 知乎 have zero test coverage.** Only the native (text/markdown) engines are tested (`platform-export-rendering.test.ts`). Visual / preview-fidelity regressions can't be caught.
5. **小红书 hashtag suggestions are computed but never appended to the body**, and `maxLinesPerParagraph` defaults to 5 vs. the platform-recommended 1–3 (`xiaohongshu-text.ts:144`, `570–596`).
