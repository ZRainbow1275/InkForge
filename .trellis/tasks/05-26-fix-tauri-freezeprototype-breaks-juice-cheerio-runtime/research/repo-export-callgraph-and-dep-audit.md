# Research: Inkforge — Three-Platform Export Call Graph + Frozen-Prototype Dep Audit

- **Query**: Full call graph of juice/cheerio entry points (wechat / xhs / zhihu) + scan for other deps that may break under Tauri `freezePrototype: true`
- **Scope**: internal + node_modules audit
- **Date**: 2026-05-26

---

## 1. Smoking-Gun Recap (Confirm the cheerio failure site)

The error message reported by Vue ErrorBoundary is:

> `Cannot assign to read only property 'toString' of object '#<Cheerio>'`

The PRD blames `dist/browser/load.js:104` (`Object.assign(initialize, staticMethods, { ... toString ... })`), but `staticMethods` in fact exports **only** `{contains, extract, html, merge, parseHTML, root, text, xml}` — no `toString`. The actual property that triggers the TypeError is in a different file in the same module init:

`D:/Desktop/Inkforge/inkforge/node_modules/.pnpm/cheerio@1.0.0/node_modules/cheerio/dist/browser/cheerio.js:57`

```js
Object.assign(Cheerio.prototype, Attributes, Traversing, Manipulation, Css, Forms, Extract);
```

`Manipulation` re-exports a function named `toString` (`api/manipulation.js:784` — `export function toString()`). So the `Object.assign` call writes `Cheerio.prototype.toString = <manipulation.toString>`. Because `Cheerio.prototype`'s ancestor `Object.prototype` has its `toString` data property frozen (non-writable) by Tauri's `freezePrototype`, the strict-mode `[[Set]]` walks the prototype chain, finds a non-writable `toString` ancestor, and throws the `'#<Cheerio>'` TypeError.

`load.js:104` (the `Object.assign(initialize, staticMethods, { ..., prototype: LoadedCheerio.prototype })`) is benign by itself — the `prototype` property is a writable data slot on Function instances. But cheerio's module init runs `cheerio.js:57` **before** `load.js` ever runs, so any `import {load} from 'cheerio'` (which juice does) crashes during module evaluation.

> Bundled equivalent of the same line: `D:/Desktop/Inkforge/inkforge/node_modules/.vite/deps/juice.js:5069` — `Object.assign(Cheerio.prototype, attributes_exports, traversing_exports, manipulation_exports, css_exports, forms_exports, extract_exports);`

---

## 2. Three-platform call graph

All three platforms share a single barrel: `inkforge/src/services/export/index.ts`. The barrel does `import juice from 'juice'` transitively at module load (via `./wechat`, `./xiaohongshu`, `./zhihu`) — i.e. importing **any** symbol from `@/services/export` is enough to detonate the frozen-prototype crash.

### 2.1 WeChat (juice site: `wechat.ts:1324`)

| Layer | File:line | Symbol | Notes |
|---|---|---|---|
| Engine entry | `inkforge/src/services/export/wechat.ts:1146` | `convertToWechat(html, preset, options)` | Wraps `convertToWechatWithStats` |
| Engine entry | `inkforge/src/services/export/wechat.ts:1158` | `convertToWechatWithStats(html, preset, options)` | Runs juice at line 1324 |
| Engine entry | `inkforge/src/services/export/wechat.ts:1392` | `markdownToWechat(markdown, preset, options)` | md→html→`convertToWechat` |
| Engine entry | `inkforge/src/services/export/wechat.ts:1411` | `markdownToWechatWithStats(markdown, preset, options)` | md→html→`convertToWechatWithStats` + AST stats |
| Barrel re-export | `inkforge/src/services/export/index.ts:109-114` | All four above | Public API surface |
| Unified dispatcher | `inkforge/src/services/export/index.ts:256-321` | `convertToPlatform(markdown, 'wechat', ...)` | Imports `convertToWechat` at module load (`index.ts:214`) |
| Unified dispatcher | `inkforge/src/services/export/index.ts:342-422` | `convertToNativeFormat(markdown, 'wechat', ...)` | Calls `convertToPlatform` for wechat |
| UI: ExportModal | `inkforge/src/components/export/ExportModal.vue:13` (import) | `markdownToWechatWithStats`, `convertToPlatform`, `convertToNativeFormat` | Used in render watcher |
| UI: ExportModal | `inkforge/src/components/export/ExportModal.vue:456` | `await markdownToWechatWithStats(props.content, preset, exportOptions.value)` | Wechat preview render |
| UI: ExportModal | `inkforge/src/components/export/ExportModal.vue:461` | `await convertToPlatform(props.content, platform, …)` | Used for non-wechat in same watcher; barrel still pulls juice |
| UI: ExportModal | `inkforge/src/components/export/ExportModal.vue:470` | `await convertToNativeFormat(props.content, platform, …)` | Native export branch |
| UI: PublishView | `inkforge/src/views/PublishView.vue:16,151` | `markdownToWechatWithStats` | `generateHtml()` switch case `wechat` |
| UI: SettingsView | `inkforge/src/views/SettingsView.vue:30,1573` | `convertToPlatform` | Live export-settings preview (`buildExportSettingsPreviewHtml`) |
| UI: WorkstationView | `inkforge/src/views/WorkstationView.vue:26-30` | `copyToClipboard, getPlatformPresets, type Platform` from barrel | Imports barrel (loads juice) even though it doesn't call convertXxx directly |
| UI: CMS tools | `inkforge/src/components/cms/CMSTools.vue:7,91` | `convertToWechat` | Used in `convertCmsContent` |
| Preview path | `inkforge/src/composables/usePreviewRenderer.ts:228-249` | `await import('@/services/export')` (for `getPresetById`, `generateThemeCSS`) | Dynamic import — still triggers cheerio init on first hit; the wechat preview itself uses `renderWechatMockHtml` (no juice), but the barrel import detonates the bug |
| Tests | `inkforge/src/services/export/platform-export-rendering.test.ts:7-14` | `convertToWechatWithStats`, `markdownToWechatWithStats`, `convertToNativeFormat` | jsdom/happy-dom env, prototypes not frozen |
| Tests | `inkforge/src/services/export/__tests__/pipeline-cross-platform.test.ts:16-21,143,311` | `convertToWechatWithStats`, `convertToNativeFormat` | Same env caveat |
| Indirect tests | `inkforge/src/services/export/preset-decorations.test.ts:33` | comments on juice-safe CSS | n/a |

UI button chain (collapsed):

```
WorkstationView export buttons (lines 2081, 2186, 2829)
  → ExportModal :visible toggled
    → watcher on (visible, content, platform, presetId, exportOptions)
      → markdownToWechatWithStats(...)         [wechat]
        → convertToWechatWithStats(...)
          → juice(styledHtml, {...})           [wechat.ts:1324]
            → cheerio.load                     [crashes here under freezePrototype]
```

### 2.2 Xiaohongshu (juice site: `xiaohongshu.ts:622`)

| Layer | File:line | Symbol | Notes |
|---|---|---|---|
| Engine entry | `inkforge/src/services/export/xiaohongshu.ts:540` | `convertToXiaohongshu(html, presetId, opts)` | Runs juice at line 622 |
| Engine entry | `inkforge/src/services/export/xiaohongshu.ts:645` | `markdownToXiaohongshu(markdown, presetId)` | md→html→`convertToXiaohongshu` |
| Native (text) | `inkforge/src/services/export/xiaohongshu-text.ts:133` | `markdownToXiaohongshuText(...)` | **Does NOT call juice** — pure-text pipeline |
| Native preview | `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts` | `renderXhsMockHtml(artifact, opts)` | Pure string template, juice-free |
| Barrel re-export | `inkforge/src/services/export/index.ts:117-123, 134-138` | All above + `xiaohongshuBaseCSS`, `xiaohongshuPresets`, `getXiaohongshuPresets`, `markdownToXiaohongshuText` | Imports `convertToXiaohongshu, getXiaohongshuPresets` at module load (`index.ts:215`) — pulls juice |
| Unified dispatcher | `inkforge/src/services/export/index.ts:288-299` | `convertToPlatform('xiaohongshu', ...)` | Calls `convertToXiaohongshu` (juice path) |
| Unified dispatcher | `inkforge/src/services/export/index.ts:384-403` | `convertToNativeFormat('xiaohongshu', ...)` | Calls `markdownToXiaohongshuText` (juice-free) |
| UI: ExportModal | `inkforge/src/components/export/ExportModal.vue:461,470` | `convertToPlatform`, `convertToNativeFormat` | Branches to `convertToXiaohongshu` for HTML preview |
| UI: PublishView | `inkforge/src/views/PublishView.vue:17,162` | `convertToXiaohongshu(rawHtml, xhsPreset.value, {...})` | Switch case `xiaohongshu` |
| Preview path | `inkforge/src/composables/usePreviewRenderer.ts:153-189` | `markdownToXiaohongshuText` + `renderXhsMockHtml` via dynamic import of `@/services/export` | Same barrel-import side effect as wechat |
| Tests | `inkforge/src/services/export/xhs.test.ts:9-148` | `convertToXiaohongshu`, `xiaohongshuPresets`, `markdownToXiaohongshuText` | env-dependent |
| Tests | `inkforge/src/services/export/platform-export-rendering.test.ts:13,381,441` | `markdownToXiaohongshuText`, `convertToNativeFormat` | n/a |
| Tests | `inkforge/src/services/export/__tests__/pipeline-cross-platform.test.ts:20,176,193,289,333` | `markdownToXiaohongshuText`, `convertToNativeFormat` | n/a |
| Tests | `inkforge/src/composables/usePreviewRenderer.test.ts:18,149` | `markdownToXiaohongshuText` | similarity check on preview output |
| Tests | `inkforge/src/services/export/citation-export.test.ts:3,19` | `markdownToXiaohongshuText` | n/a |
| Tests | `inkforge/src/services/export/platform-rules/xiaohongshu.test.ts` | `convertToXiaohongshu` indirectly | n/a |
| Tests | `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.test.ts` | `renderXhsMockHtml` | juice-free |

### 2.3 Zhihu (juice site: `zhihu.ts:538`)

| Layer | File:line | Symbol | Notes |
|---|---|---|---|
| Engine entry | `inkforge/src/services/export/zhihu.ts:445` | `convertToZhihu(html, presetId, opts)` | Runs juice at line 538 |
| Engine entry | `inkforge/src/services/export/zhihu.ts:560` | `markdownToZhihu(markdown, presetId, opts)` | md→html→`convertToZhihu` |
| Native (markdown) | `inkforge/src/services/export/zhihu-markdown.ts:23` | `markdownToZhihuClean(markdown, opts)` | **Does NOT call juice** — pure-md pipeline |
| Native preview | `inkforge/src/services/export/preview-fidelity/zhihu-mock.ts` | `renderZhihuMockHtml(artifact, opts)` | Pure string template |
| Barrel re-export | `inkforge/src/services/export/index.ts:125-131, 140-143` | All above + `zhihuBaseCSS`, `getZhihuPresets`, `markdownToZhihuClean` | Imports `convertToZhihu, getZhihuPresets` at module load (`index.ts:216`) |
| Unified dispatcher | `inkforge/src/services/export/index.ts:300-314` | `convertToPlatform('zhihu', ...)` | Calls `convertToZhihu` (juice path) |
| Unified dispatcher | `inkforge/src/services/export/index.ts:406-414` | `convertToNativeFormat('zhihu', ...)` | Calls `markdownToZhihuClean` (juice-free) |
| UI: ExportModal | `inkforge/src/components/export/ExportModal.vue:461,470` | `convertToPlatform`, `convertToNativeFormat` | Branches to `convertToZhihu` |
| UI: PublishView | `inkforge/src/views/PublishView.vue:18,170` | `convertToZhihu(rawHtml, undefined, {...})` | Switch case `zhihu` |
| Preview path | `inkforge/src/composables/usePreviewRenderer.ts:191-224` | `markdownToZhihuClean` + `renderZhihuMockHtml` via dynamic barrel import | Same side effect |
| Tests | `inkforge/src/services/export/zhihu.test.ts:10-151` | `markdownToZhihuClean`, `convertToZhihu` | n/a |
| Tests | `inkforge/src/services/export/platform-export-rendering.test.ts:14,402,445` | `markdownToZhihuClean`, `convertToNativeFormat` | n/a |
| Tests | `inkforge/src/services/export/__tests__/pipeline-cross-platform.test.ts:21,233,256,319,353` | `markdownToZhihuClean`, `convertToNativeFormat` | n/a |
| Tests | `inkforge/src/services/export/platform-rules/zhihu.test.ts` | `convertToZhihu` indirectly | n/a |
| Tests | `inkforge/src/services/export/preview-fidelity/zhihu-mock.test.ts` | `renderZhihuMockHtml` | juice-free |

### 2.4 Module-load detonation summary

| Path | Imports barrel at static-import time? | Crashes on app boot? |
|---|---|---|
| `App.vue` | No direct import of `@/services/export` | Indirect via children |
| `WorkstationView.vue:26-30` | **Yes** (`@/services/export`) | **Yes** (eager static import; this is the prime suspect for "load editor page crashes") |
| `PublishView.vue:14-21` | **Yes** | Yes when navigated to |
| `SettingsView.vue:30` | **Yes** | Yes when navigated to |
| `components/export/ExportModal.vue:7-14` | **Yes** | Yes when ExportModal component definition is fetched (lazy via `WorkstationView` import) |
| `components/cms/CMSTools.vue:7` | **Yes** | Yes when CMSTools is loaded |
| `composables/usePreviewRenderer.ts` | Dynamic `await import('@/services/export')` only | Yes on first preview render (every editor open) |
| `services/export/image-pipeline/uploaders/wechat.ts:1` | Imports `@/services/export/wechat-publish` (sibling, NOT the barrel) — **juice-free** | No |

---

## 3. Dependency risk audit (frozen-prototype hazards)

The risky JS pattern is **either**:
- (A) `<obj>.toString = X` (or `valueOf`, `hasOwnProperty`, `propertyIsEnumerable`, `isPrototypeOf`, `toLocaleString`, `constructor`) where `<obj>` does NOT have its own such property — strict-mode `[[Set]]` walks the prototype chain and trips on the frozen `Object.prototype.<name>`.
- (B) `Object.assign(target, source)` where the source enumerates a property whose name clashes with a frozen built-in (e.g. `toString`) — same effect.
- (C) Direct assignment to a non-writable built-in slot.

User-defined prototypes that themselves provide own `toString = function () {...}` (e.g. `Class.prototype.toString = function() {...}`) are **NOT** affected, because the write happens on the own slot of that prototype object — `Object.prototype.toString` only becomes non-writable, not the inheritor's own slot. The hazard is only when the writer assumes "I'll overshadow built-in toString via simple assignment" while not yet owning the slot.

Files were searched under `D:/Desktop/Inkforge/inkforge/node_modules/.pnpm/` and `D:/Desktop/Inkforge/inkforge/node_modules/.vite/deps/` (Vite-prebundled, which is what the browser actually loads).

| Dep | Pattern type | Suspect file:line | Likelihood of runtime trigger | Mitigation |
|---|---|---|---|---|
| **cheerio@1.0.0** (via juice) | (B) Object.assign clashing `toString` | `D:/Desktop/Inkforge/inkforge/node_modules/.pnpm/cheerio@1.0.0/node_modules/cheerio/dist/browser/cheerio.js:57` ; bundled at `D:/Desktop/Inkforge/inkforge/node_modules/.vite/deps/juice.js:5069` | **Confirmed P0** — module init throws every time any import path reaches `cheerio` | Turn off `freezePrototype` (PRD Approach A) |
| **cheerio@1.0.0** (via juice) | (B) Object.assign `prototype` slot on a Function | `cheerio/dist/browser/load.js:104` ; bundled `.vite/deps/juice.js:5142` | Low — writing `initialize.prototype = LoadedCheerio.prototype` succeeds because Function instances have their own writable `.prototype` data slot; this is **not** the crash site, but worth re-verifying once the cheerio.js:57 site is fixed | Same as above |
| **lodash-es@4.18.1** (transitively via mermaid) | (A) `lodash.toString = lang.toString` on a Function instance | `D:/Desktop/Inkforge/inkforge/node_modules/.vite/deps/chunk-QCMDFXER.js:5970` (`wrapperLodash_default.toString = lang_default_default.toString;`) | **Medium-High** — `wrapperLodash_default` is a Function; Function.prototype.toString is frozen non-writable, so the strict-mode `[[Set]]` would fail. Only loaded when mermaid is loaded (lazy import on mermaid code block). | Turning off `freezePrototype` fixes it; otherwise mermaid stays broken |
| **dayjs@1.11.20** (transitively via mermaid) | (A) `m2.toString = function() {...}` where `m2` is the dayjs Dayjs class prototype-builder object | `D:/Desktop/Inkforge/inkforge/node_modules/.vite/deps/chunk-QKEEYSVU.js:269` | **Medium** — `m2` is the prototype of dayjs's Dayjs class, inheriting Object.prototype. Same chain rule as cheerio. Loaded only when mermaid loads (dayjs is used by gantt/sequence diagrams). | Same fix |
| **d3** (transitively via mermaid) | (A) `FormatSpecifier.prototype.toString = function() {...}` and `format3.toString = function() {...}` | `D:/Desktop/Inkforge/inkforge/node_modules/.vite/deps/chunk-QKEEYSVU.js:2601, 2721, 4065, 4072, 4079, 4086` | **Medium** — similar story. Bound to mermaid timeline / gantt / quad-tree / d3-format / d3-time. Lazy. | Same fix |
| **cytoscape@3.33.2** (transitively via mermaid architecture diagrams) | (A) `f.toString = function() {...}` | `D:/Desktop/Inkforge/inkforge/node_modules/.vite/deps/chunk-D2AC2EIS.js:12310` (cytoscape `generateBezier` returns a Function and sets its toString) | **Medium** — Function instance, same frozen-Function.prototype rule. Only loaded for mermaid architecture / cose-bilkent diagrams (very rare). | Same fix |
| **js-yaml** (transitively via mermaid, frontmatter parsing) | (A) `YAMLException$1.prototype.toString = ...` | `D:/Desktop/Inkforge/inkforge/node_modules/.vite/deps/chunk-2PZPO52M.js:86` | **Low** — only executes on YAML parse errors; module init itself just assigns onto `YAMLException$1.prototype` which is a fresh object inheriting Object.prototype → also chain rule. Mermaid-only. | Same fix |
| **stacktracey / trace** (mermaid dependency) | (A) `Trace2.toString = toString2` | `D:/Desktop/Inkforge/inkforge/node_modules/.vite/deps/chunk-PLVHH2MM.js:3085` | **Low** — Function instance, same rule. Only mermaid. | Same fix |
| **architectureDiagram / cose-bilkent / sankey / etc.** | (A) Multiple `Point2.prototype.toString`, `Part.prototype.toString`, `Expression.prototype.toString`, `Property.prototype.toString`, `Expressions.prototype.toString` | `architectureDiagram-Q4EWVU46-IZBCHJJT.js:1875` ; `cose-bilkent-S5V4N54A-PLVQOTPK.js:1795` ; `.vite/deps/juice.js:15619, 15639, 15708, 15828` (this last batch is `web-resource-inliner` deps inside juice itself: Part/Expression/Expressions/Property classes) | **Medium for juice's internals** (Part/Expression/Property all kick in when juice processes CSS at-rules; same chain rule applies — but only after the cheerio crash is past). For mermaid sub-chunks, lazy. | Same fix; once `freezePrototype` is off, these stop being relevant |
| **mermaid@11.14.0** | own `assignWithDepth.d.ts` (signature only) ; only `toString:` references are string literals in compiled chunks | Multiple chunks; no direct write to built-in `toString` on a non-own prop spotted at module init | **Low** for direct mermaid code; risk is all in its transitive deps above | Same fix |
| **@mermaid-js/parser** | uses chevrotain; no `.toString =` pattern found in `chevrotain@12.0.0/lib` | n/a | None observed | n/a |
| **chevrotain@12.0.0** | No `toString =` or `Object.assign(<X>.prototype, ...)` patterns found | n/a | None observed | n/a |
| **@popperjs/core@2.11.8** | No `toString =` or matching patterns found in `dist` | n/a | None observed | n/a |
| **tippy.js@6.3.7** (transitively used by tiptap bubble menu) | No matching patterns in `dist` | n/a | None observed | n/a |
| **dompurify@3.3.1** | No `toString =` patterns in `.vite/deps/dompurify.js` | n/a | None observed | n/a |
| **marked@15.0.12 / marked@16.4.2** | No `toString =` patterns in `.vite/deps/marked.js` | n/a | None observed | n/a |
| **katex@0.16.45** | Not checked in detail (lazy-imported only when LaTeX is rendered) | n/a | Unknown — recommend smoke test under Tauri with `$...$` content | Smoke-test next session |
| **dexie@4.3.0** | No `toString =` patterns in `.vite/deps/dexie.js` | n/a | None observed | n/a |
| **lowlight@3.3.0 / highlight.js@11.11.1** | Not checked in this audit (no obvious pattern in dist chunks; both use class-method declarations) | n/a | Unknown — but unlikely (they ship as ESM classes with method definitions, not `obj.toString =`) | Verify in Tauri after fix |
| **vue@3.5.29 / vue-router@4.6.4 / pinia@2.3.1** | No `toString =` patterns in `.vite/deps/vue.js, vue-router.js, pinia.js` | n/a | None observed | n/a |
| **@tiptap/core@2.27.2** | No `toString =` patterns in `.vite/deps/@tiptap_core.js`; uses class declarations only | n/a | None observed | n/a |
| **codemirror@6.0.2** (incl. @codemirror/state, view, etc.) | Not scanned exhaustively in this audit — most editor packages use class declarations. The `m2.toString = function()` finding above is dayjs (different chunk). | n/a | Low | n/a |

> **Key insight:** every mermaid-related risk above is **gated by user action** (writing a mermaid code block) because `renderMermaid` does `import('mermaid')` lazily (`inkforge/src/services/rendering/optional-renderers.ts:38-44, 70`). The cheerio bug is the only one that fires unconditionally on editor open (because the export barrel is statically imported by `WorkstationView`, `PublishView`, `SettingsView`, `ExportModal`, `CMSTools`).

> **Net advice for the implementer:** Approach A (`freezePrototype: false`) fixes cheerio AND pre-empts every mermaid-tree risk in one stroke. A surgical cheerio-only patch (e.g. `Object.defineProperty(Object.prototype, 'toString', { writable: true })` before importing cheerio) would still leave mermaid time-bombs live.

---

## 4. Other Tauri-vs-browser parity hazards (besides freezePrototype)

These don't relate to prototypes directly but matter for the manual verification matrix in the PRD. Use during the verification matrix runs (PR2 in the plan).

| Area | Hazard | InkForge touch points | Verification hint |
|---|---|---|---|
| **Clipboard API** | Tauri 1.x webview proxies `navigator.clipboard` to the Rust shell. `ClipboardItem` / `read()` may be unavailable or return promises that reject silently. `inkforge/src/services/export/utils.ts` exposes `copyTextToClipboard`, `copyToClipboard`, `isClipboardWriteAvailable`. `PublishView.vue:198-200` uses `new Blob([html], {type:'text/html'})` + `new ClipboardItem(...)` directly — known to fail in some Tauri configs. | `copyRichText()` in PublishView ; `ExportModal.vue` copy buttons ; SettingsView preview-copy | When `tauri:dev`, manually exercise "复制到微信/小红书/知乎" and check both text and rich-html clipboard contents (paste into target editor) |
| **CSP `script-src 'self'`** | KaTeX inlines a license comment but loads via static import; mermaid uses dynamic `import()` of chunks. CSP allows same-origin chunks. No external network scripts. Risk: any future dependency that injects `<script>` will be blocked silently. | `optional-renderers.ts` (mermaid/katex lazy imports) | Verify no `Refused to load the script` in DevTools console |
| **`window.fetch` CORS** | Tauri's webview wraps `fetch` to bypass CORS for `tauri://` and explicit allowlist hosts. WeChat publish (`wechat-publish.ts`) calls real WeChat API — must route through Tauri's `@tauri-apps/api/http` invoke pattern, NOT raw `fetch`, otherwise CORS-blocked in browser preview but possibly works in Tauri. | `inkforge/src/services/export/wechat-publish.ts` — check uses of `fetch` vs Tauri `invoke` | `grep` for `fetch\(` in wechat-publish; if used, confirm Tauri allowlist covers `api.weixin.qq.com` |
| **`URL.createObjectURL` lifetime** | Tauri webview tracks these per-window; releasing on navigation differs from browser. ExportModal builds Blobs for downloads. | `components/export/ExportModal.vue` (download buttons) | Manual download → confirm file content matches |
| **`localStorage` quota & scope** | Tauri persists per-app, different domain origin (`tauri://localhost`). Existing settings store may not auto-migrate from a previous `localhost:1420` browser run. | `useSettingsStore`, `useArticleStore` (Dexie) | Smoke test settings persistence across Tauri restart |
| **Drag & drop file paths** | Tauri exposes native paths (`C:\...`) where browsers expose `File` blobs. Asset uploads may need conditional handling. | `inkforge/src/components/asset/AssetManager.vue` (out of scope for this task but tangential) | Note for follow-up |
| **`navigator.userAgent` sniffing** | Tauri's UA includes the OS WebView2/WKWebView identifier — code that branches on `chrome` / `firefox` substrings may misroute. | None observed in `services/export` or `views`; quick scan of `src` for UA sniffing recommended | `grep -r 'userAgent' src` next session |
| **`crypto.randomUUID`** | Available in Tauri 1.6 WebView2 (Win10+) and WKWebView (macOS 12+). Older WebView2 may be missing it. | Not directly observed; Dexie uses its own ID schemes | If failures surface, polyfill |

---

## 5. Caveats / Not Found

- The PRD's claim that the failing write happens at `load.js:104` is **imprecise**. The actual write that throws is `cheerio.js:57`'s `Object.assign(Cheerio.prototype, ..., Manipulation, ...)` because `Manipulation` exports a `toString` function (api/manipulation.js:784). This affects the Approach-A fix only in that any test asserting "no throw" must drive a code path that reaches `cheerio.js:57` — which is automatic on any `import 'cheerio'`/`import 'juice'`. Worth noting in commit message.
- The bundled Vite output (`.vite/deps/juice.js:5069`) is what the dev server actually serves; both lines agree.
- I did **not** exhaustively scan every codemirror lang-* chunk for the pattern — codemirror packages use class syntax and are unlikely to trip the rule, but they're large. If after Approach A any new "Cannot assign to read only property" surfaces, re-scan with the same regex restricted to `@codemirror/*` chunks.
- I did **not** verify katex/lowlight in detail (they're lazy-loaded). They're listed as "unknown" rather than "safe."
- All audit findings are static; only cheerio is confirmed dynamically (via the PRD's stack trace and the matching code line). The "Medium/High" likelihood ratings on other findings are based on the same prototype-chain rule but are not runtime-verified — they will all be defused automatically by the recommended Approach A fix.

---

## 6. Pointer index for the implementer

Files to actually edit when implementing the PRD's Approach A:
- `inkforge/src-tauri/tauri.conf.json:89` — flip `freezePrototype` to `false`

Files to add tests in:
- new: `inkforge/src/services/export/__tests__/frozen-prototype.test.ts`

Files cited but **not** to be edited under this PRD's scope:
- `inkforge/src/services/export/wechat.ts:1324, 1146, 1158, 1392, 1411`
- `inkforge/src/services/export/xiaohongshu.ts:540, 622, 645`
- `inkforge/src/services/export/zhihu.ts:445, 538, 560`
- `inkforge/src/services/export/index.ts:214-216` (barrel imports)
- `inkforge/src/components/export/ExportModal.vue:7-14, 456, 461, 470`
- `inkforge/src/views/PublishView.vue:14-21, 151, 162, 170`
- `inkforge/src/views/SettingsView.vue:30, 1573`
- `inkforge/src/views/WorkstationView.vue:26-30`
- `inkforge/src/components/cms/CMSTools.vue:7, 91`
- `inkforge/src/composables/usePreviewRenderer.ts:147, 153, 191, 228, 231`

Upstream evidence (for commit message rationale):
- `D:/Desktop/Inkforge/inkforge/node_modules/.pnpm/cheerio@1.0.0/node_modules/cheerio/dist/browser/cheerio.js:57`
- `D:/Desktop/Inkforge/inkforge/node_modules/.pnpm/cheerio@1.0.0/node_modules/cheerio/dist/browser/api/manipulation.js:784`
- `D:/Desktop/Inkforge/inkforge/node_modules/.vite/deps/juice.js:5069` (bundled)
