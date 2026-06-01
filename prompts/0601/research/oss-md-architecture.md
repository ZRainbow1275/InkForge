# Research: Architecture of OSS Chinese Markdown → WeChat Formatting Tools

- **Query**: Study the architecture of doocs/md, mdnice, Redink, and WeChat markdown editors to borrow integration patterns into our marked@15 + DOMPurify + highlight.js + juice@11 + `decorate(html, target)` pipeline WITHOUT refactoring.
- **Scope**: External (primary-source code reads of cloned repos) + internal (our pipeline for grafting points)
- **Date**: 2026-06-01
- **Method**: Shallow-cloned and read the actual source of `doocs/md` and `mdnice/markdown-nice`; identified and inspected the real "Redink" project via `gh search`. All claims cite a repo path or URL.

---

## TL;DR

- **doocs/md** (the canonical tool we already reference in `wechat.ts`) has, as of 2025/2026, moved to a **class-first renderer + CSS-file themes + scoped CSS + `juice@11` inline-on-copy** architecture. Themes are now plain **`.css` files** (`base/default/grace/simple.css`) parameterized by **CSS variables** (`--md-primary-color`, `--md-font-family`, `--md-font-size`), not JS objects. WTFPL license — freely borrowable.
- **mdnice** (`mdnice/markdown-nice`, GPL-3.0) uses **markdown-it + juice@5**, themes are **CSS strings** scoped to `#nice`, and it injects decorative heading markup via a **`.prefix`/`.content`/`.suffix` span triple** so CSS `::before`/`::after`-style ornaments become real copy-safe spans. **GPL-3.0 — do NOT copy code verbatim; reimplement the pattern.**
- **"Redink" (渲染AI, `joshua23/redink-xiaohongshu`, CC-BY-NC-SA-4.0)** is **NOT a CSS/markdown→WeChat formatter**. It is a Flask(Python) + Vue3 **AI image-and-text generator for Xiaohongshu** — a multi-stage AI pipeline (outline → cover → content pages) driven by Gemini / Google GenAI image models. Reusable ideas are *conceptual* (staged AI pipeline, prompt-template separation), not graftable code. Its NC license bars commercial reuse anyway.
- **For us**: our pipeline already embodies the doocs/md "inline-on-export then strip-unsupported" approach. The highest-value, lowest-risk borrowings are (1) doocs/md's **`.prefix`/`.content`/`.suffix` heading-span scaffold** for richer SVG decoration anchors, (2) doocs/md's **`wrapCSSWithScope` + `selectorMapping`** idea for theme reuse, (3) doocs/md's **`markedPlantUML({ inlineSvg:true })` + inline-`macCodeSvg`** confirmation that inline SVG in the renderer/decorate output survives WeChat, and (4) parameterizing themes purely by **CSS variables that we already substitute** in `createCssVariableMap`.

---

## Tools Comparison Table

| Dimension | **doocs/md** (2025/26) | **mdnice** (markdown-nice) | **Redink (渲染AI)** | **Inkforge (us)** |
|---|---|---|---|---|
| Repo / license | `github.com/doocs/md` — **WTFPL** | `github.com/mdnice/markdown-nice` — **GPL-3.0** | `github.com/joshua23/redink-xiaohongshu` — **CC-BY-NC-SA-4.0** | private |
| MD parser | **marked@18** (`Marked` class instance) | **markdown-it@8** | n/a (AI text gen, not MD render) | **marked@15** |
| Theme representation | **`.css` files** in `theme-css/` imported via Vite `?raw`, keyed in `themeMap` | **CSS strings** (`template/markdown/normal.js` etc.) scoped to `#nice` | n/a | **JS objects** w/ `previewCSS`/`exportCSS`/`customCSS` + `decorate()` |
| Theme parameterization | **CSS variables** `--md-primary-color`, `--md-font-family`, `--md-font-size`, `calc()` for sizes | basic-/markdown-/code-/font-style CSS blocks concatenated; `#nice` scope | n/a | `createCssVariableMap()` substitution + `applyWechatStyleOptions` overlay |
| CSS var resolution | custom browser-native `processCSS()` (regex `var()` + `calc()` eval), **not** PostCSS | none (raw CSS) | n/a | regex `replaceCssVariables()` |
| CSS inliner | **juice@11.1.1** (patched) `inlinePseudoElements + preserveImportant`, `resolveCSSVariables:false` | **juice@5** `juice.inlineContent(html, css, {...})` | n/a | **juice@11** `juice(styledHtml, {inlinePseudoElements,preserveImportant,removeStyleTags})` |
| Wrapper element | `<section>` via `createContainer()`; copy clones `#output` | `#nice` box; copy reads `#nice-rich-text` | n/a | `<section id="nice">…</section>` |
| Heading decoration | renderer emits `class="..."`, CSS does the look; counters/badges via CSS | **`.prefix`/`.content`/`.suffix` spans** injected by `markdown-it-span` core rule | n/a | `decorate()` injects real `<span>`/`<div>` w/ inline style |
| Divider / ornaments | `<hr class="hr hr-{dash\|star\|underscore}">` variants → CSS | CSS on `#nice hr` | n/a | `decorate()` replaces `<hr>` w/ `<div>` glyph rows |
| SVG usage | inline `macCodeSvg` in code renderer; PlantUML `inlineSvg:true`; AntV infographic SVG | MathJax SVG cleanup only | AI-generated raster images | premium inline SVG via `decorate()` |
| WeChat-safe strategy | clone node → inject `<style>` → juice inline → strip `#output` scope → var→value → `top→translateY` → empty `<p>` nodes around SVG → `solveWeChatImage` | juice inline → MathJax `mjx-container`→`section` rewrites → `data-tool` tag → `execCommand('copy')` w/ `text/html` | n/a | `postProcessForWechat()` strips unsupported CSS, drops `class=`, wraps `<section>` w/ zero-height `<p>`, `enforcePlatformCSS` |
| AI integration | optional AI assistant panel (separate) | none in OSS editor | **core**: outline→cover→content multi-stage Gemini pipeline | separate AI chat panel |

---

## Findings

### 1. doocs/md — theme/renderer structure (PRIMARY, most relevant)

**Architecture has changed since the version our `wechat.ts` comment references.** It is now a pnpm monorepo: `packages/core` (parser+theme), `packages/shared` (theme CSS + configs), `apps/web` (the editor + copy path).

#### 1a. How a "theme" is represented — CSS files, not objects
Themes are `.css` files imported as raw strings and registered in a map:
```ts
// packages/shared/src/configs/theme-css/index.ts
import baseCSS from './base.css?raw'
import defaultCSS from './default.css?raw'
import graceCSS from './grace.css?raw'
import simpleCSS from './simple.css?raw'
export const baseCSSContent = baseCSS
export const themeMap = { default: defaultCSS, grace: graceCSS, simple: simpleCSS } as const
export type ThemeName = keyof typeof themeMap
```
Only three visual themes ship (`default/经典`, `grace/优雅`, `simple/简洁` — `packages/shared/src/configs/theme.ts`). All "looks" come from the **primary color + font** applied on top, not from many theme files.

#### 1b. How CSS is applied + parameterized (the variable system)
`packages/core/src/theme/themeApplicator.ts:applyTheme()` is the orchestrator:
1. `generateCSSVariables(config)` emits a `:root { --md-primary-color; --md-font-family; --md-font-size }` block (`cssVariables.ts`).
2. `themeMap.default` is the base; non-default themes are concatenated **on top** of default (`${themeCSS}\n\n${specificThemeCSS}`).
3. `wrapCSSWithScope(themeCSS, '#output')` prefixes every selector with `#output` so theme CSS can't leak (`cssScopeWrapper.ts`).
4. `generateHeadingStyles()` emits optional per-heading-level styles (`color-only` / `border-bottom` / `border-left`) all keyed off `var(--md-primary-color)`.
5. Everything is concatenated and run through `processCSS()` which **resolves `var()` and evaluates `calc()` in pure JS/regex** (no PostCSS) — `cssProcessor.ts`.
6. `getThemeInjector().inject(css)` writes it into a single `<style id="md-theme">` element (`themeInjector.ts`).

The default theme CSS shows the parameterization clearly:
```css
/* packages/shared/src/configs/theme-css/default.css */
h2 { color:#fff; background: var(--md-primary-color); font-size: calc(var(--md-font-size) * 1.2); ... }
h3 { border-left: 3px solid var(--md-primary-color); ... }
blockquote { border-left: 4px solid var(--md-primary-color); background: var(--blockquote-background); ... }
```
=> **One theme definition × `--md-primary-color` + `--md-font-size` = unlimited looks.** This is the same token approach we already use via `createCssVariableMap()` in `wechat.ts:56`.

#### 1c. Renderer = class-first, not inline-first
`packages/core/src/renderer/renderer-impl.ts` builds a `marked` `RendererObject` where every element calls `styledContent(styleLabel, content, tag?, style?)`:
```ts
function styledContent(styleLabel, content, tagName?, style?) {
  const tag = tagName ?? styleLabel
  const className = styleLabel.replace(/_/g, '-')
  const headingAttr = /^h\d$/.test(tag) ? ' data-heading="true"' : ''
  const styleAttr = style ? ` style="${style}"` : ''
  return `<${tag} class="${className}"${headingAttr}${styleAttr}>${content}</${tag}>`
}
```
So the renderer outputs **semantic class names** (`<h2 class="h2" data-heading="true">`), and the visual styling lives entirely in the injected theme CSS. Inlining happens **later, only at copy time** (see 1e). This is the inverse of ours, which carries inline style early. (Note: `data-heading="true"` is a stable hook for later DOM passes.)

#### 1d. Does it use juice or a custom inliner? — **juice@11.1.1 (patched)**
```ts
// apps/web/src/utils/index.ts
async function mergeCss(html: string): Promise<string> {
  const { default: juice } = await import('juice')
  return juice(html, { inlinePseudoElements: true, preserveImportant: true, resolveCSSVariables: false })
}
```
They **disable `resolveCSSVariables`** in juice (their own `processCSS` already resolved `var()`), and they ship a **patch** (`patches/juice@11.1.1.patch`) guarding against empty inline `style=""` crashing juice's `parseCSS`. Root deps: `juice@^11.1.1`, `marked@^18.0.4`, `highlight.js@^11.11.1` (`apps/web/package.json`, `packages/core/package.json`).

#### 1e. `<section>` wrapper + copy-to-clipboard HTML — `processClipboardContent()`
`apps/web/src/utils/index.ts:processClipboardContent(primaryColor)` is the WeChat copy core. Sequence:
1. `clone = #output.cloneNode(true)`.
2. Prepend the theme `<style>` + hljs `<style>` into the clone's innerHTML (`getStylesToAdd`). `getThemeStyles()` **rewrites `#output` scope away** (`#output {` → `body {`, `#output h1` → `h1`) so styles apply outside the editor container.
3. `mergeCss()` → juice inline.
4. `modifyHtmlStructure()` — moves `li > ul/ol` to **after** the `li` (WeChat nested-list fix — identical purpose to our `fixNestedLists`).
5. Strip `a[href^="#"]` (WeChat backend rejects in-page anchors).
6. Regex passes: `top:Xem` → `transform: translateY(Xem)`; resolve leftover `var(--md-primary-color)` → real `primaryColor`; delete `--md-*` declarations; unwrap Mermaid `nodeLabel`/`edgeLabel`.
7. `solveWeChatImage()` — convert `width`/`height` **attributes** to inline `style.width/height` (px).
8. **Insert zero-height empty `<p>` (`createEmptyNode`) before first child AND after last child** — "为兼容 SVG 复制" — *exactly* the trick we do in `postProcessForWechat` step 8.
9. Mermaid `<tspan>` gets forced `fill:#333 !important` (we do the same in `fixMermaidSvg`).
10. AntV infographic `<text dominant-baseline>` → `dy` rewrite (Safari clipboard fix).
11. Returns `{ html, plainText }`. The web layer then writes `text/html` to the clipboard.

> Note: the `top→translateY` rewrite is the **opposite** of our decision (we removed it because WeChat strips `transform` — see `wechat.ts` step 5 comment). Their codebase still does it; treat as a known divergence, not a pattern to adopt.

#### 1f. Decoration injection in doocs/md — CSS + inline SVG + marked extensions
- **Headings / dividers / blockquotes / counters**: pure **CSS** keyed on classes (`default.css`). `<hr>` carries a **variant class** `hr-dash | hr-star | hr-underscore` chosen from the raw markdown (`renderer-impl.ts:hr()`), and CSS draws the look.
- **Inline SVG**: the Mac-style code-block dots are an **inline `<svg>` string** (`macCodeSvg`) emitted directly by the `code()` renderer — proof inline SVG survives the WeChat copy path. PlantUML uses `markedPlantUML({ inlineSvg: true })` "适用于微信公众号".
- **Plugin mechanism = `marked` extensions.** `renderer-impl.ts` registers a stack: `markedComponent, markedMarkup, markedToc, markedSlider, markedAlert, MDKatex, markedFootnotes, markedMermaid, markedPlantUML, markedInfographic, markedRuby` (`packages/core/src/extensions/`). Each is a standard `MarkedExtension` with `tokenizer`/`renderer`. E.g. `markedMarkup` adds `==hl==`, `++u++`, `~wavy~` → `<span class="markup-highlight">` (class-first, styled by CSS).

### 2. Decorative-element injection across tools

| Technique | doocs/md | mdnice | our pipeline |
|---|---|---|---|
| Heading prefix/suffix ornaments | CSS `::before`/classes | **real `.prefix`/`.content`/`.suffix` spans** (see 3b) | inline-styled `<span>` injected in `decorate()` |
| Dividers | `<hr class="hr-{variant}">` + CSS | CSS on `#nice hr` | `<div>` glyph replacement in `decorate()` |
| Custom blocks / callouts | `markedAlert` extension → classes | `markdown-it` plugins → classes/containers | `renderAlertBlocks` post-process |
| Inline SVG | yes (`macCodeSvg`, PlantUML, AntV) | no (only MathJax SVG cleanup) | **yes — premium inline SVG via `decorate()`** |

**Key takeaway**: nobody else injects *premium decorative* SVG via a post-process hook the way we do — we are ahead here. doocs/md proves inline SVG is WeChat-clipboard-safe **as long as you bracket it with zero-height `<p>` nodes** (which we already do). mdnice proves the **prefix/content/suffix span scaffold** is the cleanest anchor for ornaments that must survive when `::before`/`::after` are dropped.

### 3. Theme/skin reusability (parameterize by color/font)

#### 3a. doocs/md = CSS-variable token system
- Author writes ONE theme `.css` using only `var(--md-primary-color)`, `var(--md-font-family)`, `var(--md-font-size)`, `var(--blockquote-background)`, `hsl(var(--foreground))`, and `calc(var(--md-font-size) * N)` for relative sizing.
- `generateCSSVariables()` injects the runtime values; `processCSS()` bakes them in for export.
- `wrapCSSWithScope()` + `SELECTOR_MAPPING` (`selectorMapping.ts`) lets old/short selectors (e.g. `blockquote_note`) map to canonical kebab classes (`markdown-alert-note`) — a **backward-compat indirection layer** so a theme written against legacy class names still applies.

#### 3b. mdnice = `#nice`-scoped CSS string + prefix/content/suffix spans
- Theme = a big CSS string scoped to `#nice` (`template/markdown/normal.js`), with **documented hook classes per element**: `#nice h1 .prefix`, `#nice h1 .content`, `#nice h1 .suffix`, etc.
- A `markdown-it` **core rule** (`utils/markdown-it-span.js`) wraps every heading's inline content:
  ```js
  spanTokenPre.content  = `<span class="prefix"></span><span class="content">`
  spanTokenPost.content = `</span><span class="suffix"></span>`
  ```
  Themes then style `.prefix`/`.suffix` (often with `content:` glyphs or background images) and `.content` (the text). Because these are **real spans**, the ornament survives juice + WeChat even where pseudo-elements would die. This is the single most directly borrowable idea for *our* SVG decoration anchoring.

#### 3c. Redink = no CSS theme system (AI image gen)
Parameterization is by **prompt + image-model**, not CSS tokens. `text_providers.yaml` / `image_providers.yaml` select Gemini/OpenAI text and Google GenAI image models; "themes" are visual styles described in natural-language prompts (`backend/prompts/*.txt`). Not applicable to CSS reuse.

### 4. Keeping output WeChat-safe — concrete code patterns

Common, battle-tested patterns observed (cite path):

| Concern | doocs/md pattern | mdnice pattern | we already do? |
|---|---|---|---|
| Class stripping | not stripped — relies on full inlining + scope removal | inlines then keeps minimal classes | **yes** — `wechat.ts` removes all `class=` (step 7.5) |
| Style inlining | `juice({inlinePseudoElements,preserveImportant,resolveCSSVariables:false})` | `juice.inlineContent(html, css, {inlinePseudoElements,preserveImportant})` | **yes** — same flags |
| CSS var residue | `processCSS()` pre-resolve + regex delete `--md-*` | n/a | **yes** — `replaceCssVariables` |
| Nested lists | `li > ul/ol` moved after `li` (`modifyHtmlStructure`) | markdown-it-li plugin | **yes** — `fixNestedLists` |
| SVG copy compat | zero-height empty `<p>` bracketing the content | n/a | **yes** — `postProcessForWechat` step 8 |
| Image sizing | `width/height` attr → inline style px (`solveWeChatImage`) | imsize plugin | **yes** — `normalizeImageAttributes` + 640px clamp |
| In-page anchors | strip `a[href^="#"]` | n/a | partial — worth adding |
| Mermaid text color | `<tspan>` forced `fill:#333!important` | n/a | **yes** — `fixMermaidSvg` |
| MathJax → section | n/a | `mjx-container` → `section`, drop `mjx-assistive-mml` | we degrade KaTeX to readable fallback instead |
| Width clamp | container `<section style="max-width:100%;overflow:auto">` around tables | `#nice` box width | **yes** — 677px clamp via `wechatComplianceTransform` |
| Copy mechanism | clipboard `text/html` | `execCommand('copy')` w/ `e.clipboardData.setData('text/html', ...)` (`copySafari`) | n/a (we export, not in-browser copy) |

**Conclusion**: our `postProcessForWechat` + `enforcePlatformCSS` + `wechatComplianceTransform` chain already covers (and in places exceeds) the union of doocs/md and mdnice WeChat-safety logic. The only net-new safety idea worth lifting is **stripping `a[href^="#"]`** (in-page anchors break the WeChat backend save).

### 5. Redink specifically — rendering approach + AI integration

`joshua23/redink-xiaohongshu` ("渲染AI / 图文生成器", CC-BY-NC-SA-4.0, © 2025 默子):
- **Stack** (`README.md` 技术架构 + dir layout): backend **Python / Flask** (`backend/app.py`, `backend/routes`, `backend/pipelines`), frontend **Vue 3 + TypeScript + Vite + Pinia**.
- **Rendering approach**: it does **NOT render markdown→styled HTML**. It is a **staged AI generation pipeline** that produces **images** for Xiaohongshu (小红书) cards. Pipelines: `backend/pipelines/concept_pipeline.py`, `redbook_pipeline.py`. Generators: `backend/generators/{google_genai,openai_compatible,image_api}.py` via a `factory.py`. Prompts are externalized text files: `backend/prompts/{outline,content,image}_prompt.txt`.
- **AI integration / workflow**: (1) **智能大纲生成** (outline) → (2) **封面页生成** (cover image) → (3) **内容页批量生成** (content pages, concurrent, default ≤15). Text model = Gemini/OpenAI; image model = Google GenAI (`gemini-3-pro-image-preview`), config-driven via `text_providers.yaml`/`image_providers.yaml`.
- **Reusable LAYOUT/ARCH ideas (conceptual only, not code — and NC-licensed)**:
  - **Staged pipeline with a `base_pipeline` + `base_skill` abstraction** (`backend/core/base_pipeline.py`, `base_skill.py`, `events.py`) — a clean separation we could mirror for a future "AI auto-typesetting" feature, independent of our render pipeline.
  - **Externalized prompt templates** (`prompts/*.txt`) + **provider factory** — matches our existing `streamChat`/`aiChat` store direction.
  - **Per-page concurrency with graceful degrade** (turn off high concurrency if the API can't handle it) — relevant to our OOM-concurrency constraint.
- **Not applicable**: no juice, no CSS theme tokens, no `<section>` WeChat HTML, no decorate hook. Different problem domain (raster card generation, not copy-paste HTML).

### 6. Integration recommendations FOR US (low-risk, no refactor, no deletions)

Ordered by value/effort. All are **additive** to the existing `convertToWechatWithStats` flow and the `decorate(html, target)` contract.

**A. Adopt mdnice's `.prefix`/`.content`/`.suffix` heading-span scaffold as SVG anchors (highest value).**
Today our `decorate()` functions regex-inject ornament `<span>`s ad hoc per preset (`preset-decorations.ts`). mdnice's pattern gives a **stable, idempotent anchor structure** for premium SVG: wrap heading text once as `…<span class="ink-h-prefix">[SVG]</span><span class="ink-h-content">TEXT</span><span class="ink-h-suffix">[SVG]</span>`. Graft point: a new recipe in `preset-decorations.ts` (e.g. `h2-svg-flank`) whose `decorate()` injects the prefix/suffix spans with our premium inline SVG. **No change to the pipeline order** — it runs at the existing `effectivePreset.decorate(decoratedHtml,'wechat')` call in `wechat.ts:1336`. Idempotency guard: bail if `class="ink-h-prefix"` already present (same convention we use everywhere).

**B. Confirm + lean on the "inline SVG survives if bracketed by zero-height `<p>`" invariant.**
doocs/md independently uses the same zero-height-`<p>` bracketing we already apply (`postProcessForWechat` step 8). This validates that our premium-SVG-via-decorate approach is safe **as long as the SVG ends up inside `#nice` before that step runs**. Action: ensure all SVG-injecting `decorate()` recipes emit SVG **inside** `#nice` (they already do, since they mutate the wrapped HTML) — just add a unit assertion, no code change to the hook.

**C. Add `a[href^="#"]` anchor stripping to `postProcessForWechat`.**
Both doocs/md and WeChat-editor lore strip in-page anchors because the WeChat backend rejects them on save. One line near our existing `<a>`/footnote handling. Pure addition, no risk.

**D. Parameterize SVG decoration color by the existing `--md-primary-color` / `primaryColor` we already thread.**
Our `decorate()` SVGs can read `effectivePreset.primaryColor` (already passed everywhere as `primaryColor`) so one premium SVG ornament definition yields per-preset colorways — exactly doocs/md's "one theme × var = many looks" philosophy, but applied to our SVG. No new token system needed; reuse `createCssVariableMap`'s `--md-primary-color`/`--ink-accent` values. Implementation: have decoration builders take a `color` arg (most already do) and feed `preset.primaryColor`.

**E. Optionally borrow doocs/md's `wrapCSSWithScope` + selector-mapping indirection for future theme authoring.**
If we ever want to accept **user-authored CSS themes** (like mdnice's CSS-string themes), doocs/md's `cssScopeWrapper.ts` (scope every selector to `#nice`) + `selectorMapping.ts` (alias old selectors to canonical classes) is a clean, copy-able (WTFPL) pattern that bolts on **before** our existing juice step. Not needed now; flag for a later "custom theme" epic. No impact on current presets.

**F. (Conceptual, separate track) Mirror Redink's staged-pipeline + externalized-prompt structure for any future "AI auto-typeset" feature.**
Keep it entirely outside the render pipeline (it's a generation concern, NC-licensed so reimplement, don't copy). Aligns with our existing `aiChat`/`streamChat` store.

**Anti-patterns to NOT adopt** (each contradicts a decision we already made):
- doocs/md's `top → transform: translateY` rewrite — WeChat strips `transform`; we correctly removed this (`wechat.ts` step 5 comment). Keep our way.
- mdnice's `execCommand('copy')` clipboard hack — we export, not in-browser-copy; irrelevant.
- Replacing our early-inline approach with doocs/md's class-first-then-late-inline approach — that **is** a refactor; explicitly out of scope. Our `decorate(html,'wechat')` hook is functionally equivalent for the WeChat target.

---

## Related Internal Files (our pipeline, for grafting)

| Path | Role |
|---|---|
| `inkforge/src/services/export/wechat.ts` | Main WeChat engine: DOMPurify → highlight → juice → `applyHeadingDecorations` → `preset.decorate(html,'wechat')` → `postProcessForWechat` → `enforcePlatformCSS` → `wechatComplianceTransform`. **Graft points C, D live here.** |
| `inkforge/src/services/export/preset-decorations.ts` | `DecorationRecipe` registry + `composeRecipes`/`chainDecorators`; all `decorate()` injectors. **Graft points A, B live here.** |
| `inkforge/src/services/export/themes.ts` | `generateThemeCSS(preset, target)` dual-track, `applyHeadingDecorations`, persona base CSS, preset list with `previewCSS`/`exportCSS`/`decorate`. |
| `inkforge/src/services/export/types.ts` | `ExportPreset`/`XiaohongshuPreset`/`ZhihuPreset` schemas with `previewCSS`/`exportCSS`/`decorate?` — confirms the dual-track contract. |
| `inkforge/src/services/export/css-validator.ts` | `enforcePlatformCSS` final safety net. |
| `inkforge/src/services/export/platform-rules/wechat.ts` | `wechatComplianceTransform` (CJK spacing, 677px clamp, dark-mode). |

## External References (primary sources)

- **doocs/md** — `github.com/doocs/md` (WTFPL). Read paths: `packages/core/src/renderer/renderer-impl.ts`, `packages/core/src/theme/{themeApplicator,cssVariables,cssProcessor,cssScopeWrapper,selectorMapping,themeInjector,themeExporter}.ts`, `packages/shared/src/configs/theme-css/{index.ts,base.css,default.css}`, `packages/shared/src/configs/theme.ts`, `packages/core/src/extensions/{markup,infographic}.ts`, `apps/web/src/utils/index.ts` (`processClipboardContent`, `mergeCss`, `solveWeChatImage`), `patches/juice@11.1.1.patch`, `apps/web/package.json` (juice ^11.1.1, marked ^18.0.4).
- **mdnice / markdown-nice** — `github.com/mdnice/markdown-nice` (GPL-3.0). Read paths: `src/utils/markdown-it-span.js` (prefix/content/suffix), `src/utils/converter.js` (`solveHtml`, `copySafari`, `juice.inlineContent`), `src/template/index.js`, `src/template/markdown/normal.js`, `package.json` (markdown-it ^8, juice ^5).
- **Redink / 渲染AI** — `github.com/joshua23/redink-xiaohongshu` (CC-BY-NC-SA-4.0). Read paths: `README.md` (技术架构), `backend/{app.py,pipelines/,generators/,core/,prompts/}`, `frontend/` (Vue3+Vite+Pinia), `text_providers.yaml`/`image_providers.yaml`. (Note: `sopaco/redink` does not exist; `HisMax/RedInk` and `lazycat-contrib/redink-lzcapp` are sibling Nano-Banana-Pro Xiaohongshu generators in the same family.)

## Caveats / Not Found

- **License watch**: doocs/md = **WTFPL** (copy freely). mdnice = **GPL-3.0** (do not copy code into our proprietary app — reimplement the *pattern* only). Redink = **CC-BY-NC-SA-4.0** (non-commercial; reimplement concepts only).
- **doocs/md version drift**: the version our `wechat.ts` comments reference appears older (single-file `themes.ts` style). The cloned `main` (2025/26) is the monorepo class-first architecture described above. The WeChat-safety *behaviors* are stable across both; the *theme representation* changed from objects to CSS files.
- **"juice@11 + #nice + DOMPurify" exact match**: doocs/md uses `<section>`/`#output` (not `#nice`) and does **not** run DOMPurify in the copy path (it trusts its own renderer output). mdnice uses `#nice`. Our `#nice` + DOMPurify combo is closest to mdnice's wrapper convention plus our own added sanitization — no single OSS tool matches our exact stack; we are a hybrid.
- **Redink ≠ what the task assumed**: it is an AI raster-image generator for Xiaohongshu, not a markdown→WeChat CSS formatter. No graftable rendering/inlining code exists there. If a *different* "Redink" (e.g., a WeChat排版 tool) was intended, it was not findable under that name as of 2026-06-01; the closest-named public repos are all Xiaohongshu AI image generators.
- Did not exhaustively read every doocs/md `marked` extension (read `markup`, `infographic`, plus the registration list); the alert/mermaid/katex extensions follow the same class-first `MarkedExtension` shape.
