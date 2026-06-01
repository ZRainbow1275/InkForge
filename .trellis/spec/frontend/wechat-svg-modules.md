# WeChat-Safe Inline-SVG Typesetting Modules (`svg-modules`)

> Executable contract for the inline-SVG premium-typesetting system at
> `inkforge/src/services/export/svg-modules/`. Full PRD/SPEC: `prompts/0601/`.

---

## 1. Scope / Trigger

Apply this spec whenever you **author, inject, or modify inline SVG** that is meant to
survive a WeChat 公众号 paste (or flow through the wechat/xhs/zhihu export pipeline).
Cross-layer contract: the SVG is injected mid-pipeline and must survive juice →
`postProcessForWechat` → `enforcePlatformCSS` → `wechatComplianceTransform`.

WeChat publishes **no** official whitelist; the subset below is reverse-engineered from
production tools (see `prompts/0601/research/wechat-svg-capabilities.md`). The key fact:
**WeChat strips `id` and `class` and `<style>` on paste/publish**, so any `id`-referenced
construct breaks.

---

## 2. Signatures

```ts
// svg-modules/wechat-safe.ts
export function checkWechatSafe(svgHtml: string): SafeViolation[]   // [] = safe
export function assertWechatSafe(svgHtml: string): void             // throws on violation

// svg-modules/inject.ts — plugs into existing preset.decorate(html,target)
export function composeSvgDecorate(
  plan: SvgInjectionPlan,
  opts: { primaryColor: string; persona: PresetPersona; accentColor?: string;
          rasterize?: (svg: string, mod: SvgModuleSpec, target: ExportTarget) => string },
): (html: string, target: ExportTarget) => string
export interface SvgInjectionPlan {
  cover?: string; headings?: { level: 1|2|3|4|5|6; module: string }[]
  replaceHr?: string; blockquote?: string; endmark?: string   // values = module ids
}

// svg-modules/index.ts — registry of 26 modules (6 static families + interactive)
export const SVG_MODULES: SvgModuleSpec[]
export function getSvgModule(id: string): SvgModuleSpec | undefined

// svg-modules/raster.ts — xhs/zhihu rasterization (browser/Tauri canvas only)
export function posterViewBox(ratio: '3:4'|'1:1'): { width: number; height: number }
export function rasterizeSvg(svgHtml: string, opts: RasterOptions): Promise<string> // PNG dataURL; throws without DOM

// services/export/types.ts — opt-in toggle (additive, optional)
interface ExportOptions { enableSvgModules?: boolean; svgInjectionPlan?: SvgInjectionPlan }
```

---

## 3. Contracts

**WeChat-safe SVG subset** (what every module's `render()` output must satisfy):

| Allowed | Forbidden (FATAL — `checkWechatSafe` flags) |
|---------|---------------------------------------------|
| `<svg viewBox="..." width="100%">` (never fixed-px outer width) | fixed-px outer `<svg width="N">` |
| `<g>`, `<path>`, `<rect>`(rx/ry), `<circle>`, `<text>` (one per visual line) | `<div>` (use `<section>`), `foreignObject` |
| `fill`(hex/rgba), `stroke`, `stroke-width`, `opacity` | `class=`, `<style>`, `var(--…)`, `calc(...)` |
| `transform` as **XML attribute** | `style="transform:…"` (stripped by enforcePlatformCSS) |
| SMIL `<animate>/<set>/<animateTransform>`, `begin∈{click, Ns, id.end+Ns}`, `fill="freeze"`, `restart="never"` | `<defs>/<linearGradient>/<radialGradient>/<clipPath>/<mask>/<filter>/<use>` (id-referenced), `url(#…)`, `xlink:href` |
| `<section>` wrappers; `box-shadow` on the wrapping section style | `begin="touchstart\|mouseover\|…"`, external `<image href>`, `@keyframes`, `<script>` |

- Gradients/glows → use **layered solid shapes with stepped opacity** (NOT SVG gradients).
- Dark themes → bake an opaque background `<rect>` and give every `<text>` an explicit `fill`.
- Every module root carries `data-ink-svg="<moduleId>"` (idempotency sentinel).

**Pipeline ordering (why injection works):** `preset.decorate(html, target)` runs in
`wechat.ts` (~:1336) **after** the export DOMPurify (so injected SVG is NOT stripped) and
**before** `postProcessForWechat` / `enforcePlatformCSS` / `wechatComplianceTransform`.
`OPAQUE_TAGS` in `platform-rules/wechat.ts` **must include `'svg'`** so
`applyCjkLatinSpacing` never injects U+202F thin-spaces inside `<text>` (would corrupt glyphs).

**Targets:** `preview`/`wechat` → inline SVG. `xhs`/`zhihu` → rasterized `<img>` (zhihu strips
inline SVG; xhs body is plain-text/poster) via `raster.ts` (`hasDom()`-guarded canvas).

---

## 4. Validation & Error Matrix

| Condition | Result |
|-----------|--------|
| `render()` emits `class=` / `<style>` / `var(` / `calc(` / `<div>` / `foreignObject` | `checkWechatSafe` non-empty → `assertWechatSafe` throws |
| `render()` emits `<defs>/<linearGradient>/<clipPath>/<mask>/<filter>/<use>` or `url(#)` | flagged (id-referenced, WeChat-fragile) |
| outer `<svg width="1080">` (fixed px) | flagged `no-fixed-svg-width`; use `width="100%"` + viewBox |
| SMIL `begin="touchstart"` | flagged `no-bad-smil-trigger`; use `begin="click"` |
| `OPAQUE_TAGS` missing `'svg'` | U+202F injected into `<text>` → glyph corruption (regression) |
| `enableSvgModules` undefined/false AND non-flagship preset | NO injection — current behavior preserved (zero regression) |

---

## 5. Good / Base / Bad Cases

- **Good**: flagship preset `decorate = composeSvgDecorate(plan, {primaryColor, persona})`; plan maps `h2→header-ribbon`, `hr→divider-diamond`, `blockquote→quote-vbar`, `endmark→endmark-vessel`; every emitted section passes `checkWechatSafe`.
- **Base**: a static module using only `<rect>/<text>/<circle>` + solid fills + `width="100%"`.
- **Bad**: using `<linearGradient id="g">` + `fill="url(#g)"` (dies — WeChat strips `id`), or `style="transform:rotate(45deg)"` (stripped by `enforcePlatformCSS`), or a horizontal full-width-stripe vessel mark (brand "flag-trap", rejected — see `feedback_logo_flag_trap`).

---

## 6. Tests Required

- `svg-modules/__tests__/wechat-safe.test.ts` — positive/negative for each rule.
- `svg-modules/__tests__/registry.test.ts` — 26 modules, unique ids, every module × 4 persona → `checkWechatSafe()===[]`.
- `svg-modules/__tests__/inject.test.ts` — anchor replacement, **idempotency** (decorate twice = identical), preview inline vs xhs/zhihu rasterize seam.
- `services/export/__tests__/flagship-pipeline-smoke.test.ts` — real `convertToWechatWithStats` end-to-end: each flagship plan's module ids present, every `<section data-ink-svg>` block `checkWechatSafe===[]` AFTER full pipeline, idempotent, non-flagship preset emits **no** `data-ink-svg`/`<svg>`.
- Assertion points: `data-ink-svg` present, outer `<svg>` has `width="100%"`+`viewBox`, zero safe violations, `generatePersonaBaseCSS` still has `min(22em` + `font-size: 17px` (20-22 CJK chars/line lock unchanged).

---

## 7. Wrong vs Correct

### Wrong
```ts
// dies in WeChat: id stripped → gradient ref breaks; class stripped; style-transform stripped
return `<div class="hd"><svg width="1080"><defs><linearGradient id="g">…</linearGradient></defs>
  <rect fill="url(#g)" style="transform:rotate(2deg)"/><text>${title}</text></svg></div>`
```

### Correct
```ts
import { svgSection, rect, textLine } from './primitives'
// width:100% + viewBox, <section> not <div>, solid fill, transform as attribute, sentinel via svgSection
return svgSection({ moduleId: 'header-ribbon', viewBoxW: 1080, viewBoxH: 180,
  body: rect({ x: 0, y: 0, width: 1080, height: 96, fill: palette.accent })
      + textLine({ x: 48, y: 64, text: title, fill: palette.onAccent, fontSize: 44 }) })
// assertWechatSafe(out) passes; survives juice → postProcess → enforcePlatformCSS → compliance
```

---

> **Gotcha**: SVG injection is **opt-in**. Only the 3 flagship presets
> (`flagship-kiln`/`flagship-tempera`/`flagship-amber`) or `ExportOptions.enableSvgModules`
> trigger it. The original 12 wechat + 5 xhs + 3 zhihu presets stay SVG-free. Flagship SVG
> is **brand-color-locked** by design (the `decorate` closure captures the preset's brand
> color; Inspector `primaryColor` override recolors CSS parts only, not the SVG identity).
