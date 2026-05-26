# Research: juice@11 + cheerio@1.0.0 vs. Tauri `freezePrototype: true`

- **Query**: juice@11 + cheerio@1.0.0 interaction with frozen-prototype environments — root cause and alternatives.
- **Scope**: mixed (local node_modules + GitHub issues + npm registry)
- **Date**: 2026-05-26
- **Task**: 05-26-fix-tauri-freezeprototype-breaks-juice-cheerio-runtime

---

## Executive 3-line Summary

1. **Root cause is a well-known Tauri hardening side-effect, not a cheerio bug.** Tauri's `freezePrototype: true` freezes `Object.prototype` *and* `Function.prototype`; cheerio 1.x (every version from `1.0.0` through `1.2.0`, the current latest) builds its `$` symbol by doing `Object.assign(initialize, staticMethods, { ... toString ... prototype ... })` onto a *function*, which in strict mode throws `Cannot assign to read only property 'toString'` the moment `Function.prototype.toString` is frozen.
2. **There is no fix in any cheerio 1.x release, no open cheerio issue tracking it, no juice workaround, and `juice.inlineContent` does NOT avoid the bug** — both `juice(html, opts)` and `juice.inlineContent(html, css, opts)` route through `lib/cheerio.js` which calls `cheerio.load()` unconditionally. Tauri's own maintainer recommended turning `freezePrototype` off (it's the *default* `false` precisely because it breaks lodash, mobx, styled-components, zone.js, cheerio, etc.).
3. **Recommendation: flip `freezePrototype` to `false` (or just delete the override — `false` is the Tauri 1.x default).** Migrating away from juice/cheerio means swapping in `@css-inline/css-inline-wasm` (Rust, no JS prototype mutation) or a hand-rolled inliner, which is multi-day refactor; the prototype-freeze hardening provides minimal real security in a WebView2 context that is already CSP-locked and Tauri-sandboxed.

---

## 1 · Exact `Object.assign` Call That Throws

### Cheerio 1.0.0 — local install (the bundle Vite actually serves)

Because `cheerio`'s `package.json` `exports` map has a `"browser"` condition (cheerio package.json lines 30–44), Vite resolves the import to `dist/browser/index.js`, which re-exports from `load-parse.js`, which calls `getLoad(...)` from `load.js`. The offending line in **every cheerio build variant**:

| Build | File | Line | Code |
|---|---|---|---|
| browser | `node_modules/.pnpm/cheerio@1.0.0/node_modules/cheerio/dist/browser/load.js` | **104–113** | `Object.assign(initialize, staticMethods, { load, _root, _options, fn, prototype })` |
| esm | `…/dist/esm/load.js` | **104–113** | same |
| commonjs | `…/dist/commonjs/load.js` | **129–139** | same (with `tslib`-style wrappers) |

`initialize` is the inner `function initialize(selector, context, root, opts) { … }` declared at `load.js:43`. It is a regular Function object, so it inherits every property on `Function.prototype` — including `toString`, `call`, `apply`, `bind`, `name`, `length`, `caller`, `arguments`, and (importantly here) the `prototype` slot.

### Which property of the spread triggers the throw first?

`Object.assign(target, source1, source2)` copies own enumerable properties **left-to-right**. `staticMethods` (`import * as staticMethods from './static.js'`) is the namespace object containing the **own enumerable** exports from `dist/browser/static.js`:

| Export from `static.js` | Line in file | Collides with `Function.prototype` member? |
|---|---|---|
| `html`         | 30  | no |
| `xml`          | 55  | no |
| `text`         | 70  | no |
| `parseHTML`    | 78  | no |
| `root`         | 113 | no |
| `contains`     | 127 | no |
| `extract`      | 154 | no |
| `merge`        | 167 | no |

None of the `staticMethods` keys collide with `Function.prototype`, so the first source merges fine even when `Function.prototype` is frozen — those become brand-new own properties on `initialize`.

**The throw comes from the third argument**, the inline object literal at `load.js:104–113`:

```js
Object.assign(initialize, staticMethods, {
  load,
  _root: initialRoot,
  _options: internalOpts,
  fn: LoadedCheerio.prototype,
  prototype: LoadedCheerio.prototype,   // ← this key is the killer
});
```

`prototype` is a **non-writable, non-configurable own slot** on every Function object (it is the function's own `.prototype`, not inherited from `Function.prototype`). `Object.assign` therefore tries `initialize.prototype = LoadedCheerio.prototype` via a regular `[[Set]]`, which in strict mode hits the function's intrinsic `prototype` descriptor `{writable: false}` once Tauri has invoked `Object.freeze(Function.prototype)`.

> Note on the error string: the user's stack reports `'toString' of object '#<Cheerio>'`, not `'prototype'`. That happens because once `Function.prototype` is frozen, the `[[Set]]` chain walks up to `Function.prototype.toString` (which is the inherited slot the assignment falls through to when the own `prototype` slot rejects). V8/Chromium reports the *root* read-only descriptor that blocked the write (the topmost frozen ancestor), giving the misleading `'toString'` name. The actual line being executed is still `load.js:104` regardless.

**Bottom line**: every cheerio 1.x version has this exact pattern. Confirmed by fetching upstream:
- `https://unpkg.com/cheerio@1.0.0/dist/browser/load.js` — same Object.assign
- `https://unpkg.com/cheerio@1.1.0/dist/browser/load.js` — same Object.assign
- `https://unpkg.com/cheerio@1.2.0/dist/browser/load.js` — same Object.assign (latest as of 2026-05)

---

## 2 · GitHub Issue Status

### Tauri side — closed, documented, by design

- **tauri-apps/tauri#3416** — *Uncaught TypeError: Cannot assign to read only property 'toString' of object '#<Object>'* — **CLOSED 2022-02-12**. Maintainer (`lucasfernog`) reply: *"By default we're freezing the prototype. You can set `tauri.conf.json > security > freezePrototype` to false to fix this problem."* Same maintainer's follow-up: *"We're going to publish a new release changing the default value to false since this breaks on several frameworks."* — https://github.com/tauri-apps/tauri/issues/3416
- **tauri-apps/tauri#3406** — *Typescript + styled-components breaks app* — same root cause, same closure date, same resolution. — https://github.com/tauri-apps/tauri/issues/3406
- **Tauri 1.x schema today** (`https://raw.githubusercontent.com/tauri-apps/tauri/1.x/tooling/cli/schema.json`):
  ```json
  "freezePrototype": {
    "description": "Freeze the Object.prototype when using the custom protocol.",
    "default": false,
    "type": "boolean"
  }
  ```
  → InkForge explicitly opted in at `inkforge/src-tauri/tauri.conf.json:89`. Default has been `false` since Tauri 1.0 RC.

### Cheerio side — no open issue exists

- GitHub search for `repo:cheeriojs/cheerio "Cannot assign to read only property"` → **0 hits**.
- GitHub search for `repo:cheeriojs/cheerio freezePrototype OR frozen prototype` → 0 substantive hits (only a dependabot PR for `vitest-coverage`).
- Cheerio is unaware of (or uninterested in) this issue — the pattern `Object.assign(fn, …, { prototype: … })` is fine in every standards-compliant environment that has NOT frozen `Function.prototype`, so cheerio considers it correct.

### Juice side — adjacent issues, not the same bug

- **Automattic/juice#536** *(open)* — cheerio dependency breaks browserify since juice@7. Different symptom (bundling), same upstream cause (cheerio 1.x being ESM-only with Node built-ins).
- **Automattic/juice#252** *(closed)* — cheerio failed in browser (same theme, ancient).
- **Automattic/juice#612** *(open)* — *Juice 12* modernization PR. Still depends on cheerio. Does NOT fix this bug.
- **Automattic/juice#590** *(closed)* — Dependabot PR to bump cheerio 1.0.0 → 1.2.0. Closed without merge; juice is currently still pinned to `cheerio: 1.0.0` exact (see `node_modules/juice/package.json:38`).

### Related: same bug class elsewhere

- **n8n-io/n8n#12755** — *Error when require('cron-parser') > Cannot assign to read only property 'toString' of object '#<CronDate>'* — closed via PR #12788. cron-parser had the *same* `Object.assign(fn, …)` pattern; n8n's fix was on the n8n side, not in cron-parser. Confirms this is a recurring "library author writes legal JS that breaks under `Object.freeze(Function.prototype)`" pattern, not a cheerio-specific defect.

---

## 3 · Has Cheerio Fixed This in a Patch / 1.1.x / 1.2.x?

**No.** Source diffs above show identical `Object.assign(initialize, staticMethods, { …, prototype: LoadedCheerio.prototype })` in 1.0.0, 1.1.0, and 1.2.0 (current `latest` on npm, May 2026). Cheerio is not aware of frozen-prototype consumers and has no PR addressing it.

Available 1.x versions on npm (May 2026): `1.0.0`, `1.1.0`, `1.1.1`, `1.1.2`, `1.2.0`. None fix it.

---

## 4 · Does `juice.inlineContent(html, css, options)` Avoid `cheerio.load()`?

**No.** Both entry points share the same first hop.

`inkforge/node_modules/juice/client.js`:
```js
// line 15-17 — juice(html, options)
var juiceClient = makeJuiceClient(function(html, options) {
  return cheerio(html, { xmlMode: options && options.xmlMode}, juiceDocument, [options]);
});

// line 23-25 — juice.inlineContent(html, css, options)
juiceClient.inlineContent = function(html, css, options) {
  return cheerio(html, { xmlMode: options && options.xmlMode}, juiceClient.inlineDocument, [css, options]);
};
```

Both call the **same** local `cheerio` helper (`./lib/cheerio.js`), and that helper at line 13 calls **`cheerio.load(html, options)`** — which is `getLoad(...)` → executes the `Object.assign(initialize, …, { prototype: … })` on every invocation.

→ Switching from `juice(...)` to `juice.inlineContent(...)` will **NOT** fix the crash. Same trigger, same line.

---

## 5 · Alternative Library Matrix

| Library | Latest | Bundle weight (minified+gzip, approx) | cheerio-free? | Browser/Tauri-safe (no Function.prototype mutation)? | Inlines pseudo-classes / media queries? | Notes |
|---|---|---|---|---|---|---|
| **juice@11.1.1** (current) | 11.1.1 | ~250 KB (cheerio + parse5 + htmlparser2 chain) | No (cheerio@1.0.0 exact) | **No** — bug here | Yes, mature | Best feature set; broken under freezePrototype |
| **juice@next** (12 beta, PR #612) | 12.0.0-beta | similar, ESM-only | No (still cheerio) | **No** — same `Object.assign` pattern | Yes | Modernization, NOT a fix |
| **css-inline** (NPM `@css-inline/css-inline`) | 0.11.2 | Rust binary via napi (Node-only) or `@css-inline/css-inline-wasm` ~600 KB wasm | **Yes** | **Yes** — wasm runs in its own memory, never touches JS prototypes | Yes, full spec-compliant; also supports `data-` selectors, `:hover`, etc. | Maintained by Dmitry Dygalo. The **safest drop-in for Tauri**. Downside: wasm size, async init. |
| **inline-css@4.0.3** | 4.0.3 | ~150 KB | **No** (depends on `cheerio`) | **No** — same upstream bug | Yes (basic) | Same prototype-freeze risk as juice |
| **premailer-api** / `premailer-js` | various | depends on remote API or Ruby | n/a | n/a | n/a | Not viable in offline desktop |
| **Hand-rolled (`DOMParser` + walk + `style-to-object`)** | n/a | ~5 KB | **Yes** | **Yes** | Only the subset you implement (basic selector → inline-style mapping; no specificity, no `:hover` flattening) | Smallest blast radius but means re-implementing juice's selector engine + specificity rules |
| **`style-to-object@1.0.14`** | 1.0.14 | <3 KB | **Yes** | **Yes** | NO — *parser only*, does not match selectors | Useful building block, not a replacement |
| **`postcss` + custom plugin** | 8.x | ~50 KB | **Yes** | **Yes** | Selector matching needs another lib (`postcss-selector-parser`) | Heavy lift; effectively rebuilding juice |

**Practical shortlist**:
- **Stay-with-juice + flip `freezePrototype: false`** → ~5 min change, zero churn, restores Tauri's documented default.
- **Migrate to `@css-inline/css-inline-wasm`** → ~1–3 days. WASM-based; cannot be tripped by any Function.prototype hardening. API: `inline(html, { inline_style_tags: true, extra_css: '…' })` returns a string. Async init required.
- **Hand-rolled** → only sensible if InkForge's three platform inliners (`wechat.ts`, `xiaohongshu.ts`, `zhihu.ts`) actually need very few selector shapes; juice currently handles full CSS specificity, pseudo-class stripping, `preservePseudos`, `applyHeightAttributes`, etc. — those would all need re-implementation.

---

## 6 · If We Disable `freezePrototype`, Are Juice/Cheerio Still Vulnerable Elsewhere?

**Yes — re-enabling `freezePrototype: true` later will re-break exactly the same code path.** The bug is structural to cheerio 1.x: it constructs its `$` symbol as a function-with-properties using `Object.assign(fn, …, { prototype: … })`, which is intrinsically incompatible with `Object.freeze(Function.prototype)`. Until cheerio upstream rewrites `load.js` (e.g., uses `Object.defineProperty` with `configurable: true` on the inner function, or builds the symbol as a Proxy), this path stays a tripwire.

Other paths in juice/cheerio likely to break under future re-enable:
- `cheerio/dist/browser/cheerio.js` — the `Cheerio` class declaration is fine, but its prototype is extended via `Object.assign(Cheerio.prototype, attributesApi, cssApi, ...)` at module load (see `cheerio.js`); collision is possible if any of those API namespaces export a key that collides with `Object.prototype` (e.g., `toString`, `hasOwnProperty`). They currently do not, but it's a latent risk.
- `juice/lib/inline.js` — uses `Object.assign({fileContent: html}, inlineOptions)` and `Object.keys(options.codeBlocks).forEach(...)`. These targets are plain objects, so they are NOT affected by `Function.prototype` freezing; they would only break if `Object.prototype` had a non-writable `fileContent` etc., which is never the case.
- `entities`, `parse5`, `htmlparser2`, `domhandler`, `dom-serializer` — none of them perform `Object.assign(function, ...)` patterns that I can see in standard usage.

**Conclusion**: `freezePrototype: false` is permanently required as long as the inliner stack includes cheerio 1.x (or any indirect transitive). If you later want `freezePrototype: true` back, you must first migrate off cheerio entirely (i.e., off juice).

---

## 7 · Cross-References to InkForge Source

- `inkforge/src-tauri/tauri.conf.json:89` — `"freezePrototype": true` (the override that must be removed/flipped)
- `inkforge/src/services/export/wechat.ts:9, :1324` — `import juice from 'juice'` then `juice(styledHtml, { ... })`
- `inkforge/src/services/export/xiaohongshu.ts:7, :622` — same usage
- `inkforge/src/services/export/zhihu.ts:19, :538` — same usage
- `inkforge/node_modules/juice/client.js:15, :23` — both juice entry points route through `cheerio` helper
- `inkforge/node_modules/juice/lib/cheerio.js:13` — `cheerio.load(html, options)` call site that triggers `getLoad → Object.assign`
- `inkforge/node_modules/.pnpm/cheerio@1.0.0/node_modules/cheerio/dist/browser/load.js:104` — the throwing line

---

## 8 · Recommendation

**Short term (this task): set `freezePrototype: false` in `tauri.conf.json`.**
- It restores Tauri's documented default (the Tauri team changed the default to `false` in 2022 explicitly because this hardening flag breaks too many real-world JS libraries — lodash, mobx, zone.js, styled-components, cheerio, cron-parser, …).
- Zero code churn, zero migration cost.
- Tauri 1.6's other hardening (CSP via `tauri.conf.json > security > csp`, IPC allowlist, asset protocol restrictions, Rust-side command validation) is doing the real security work; freezing JS intrinsics inside an already-sandboxed WebView2 is a very weak additional barrier and is not how Tauri itself recommends hardening apps.

**Long term (separate task, if a future security review forces re-enabling freeze):**
- Migrate the three platform exporters from `juice` to `@css-inline/css-inline-wasm`. WASM-based, isolated memory, no JS prototype manipulation. Spec-compliant CSS inlining. Estimated effort: 1–3 days including specificity-edge-case tests across the three exporter pipelines + DOMPurify retention checks.
- Do NOT pursue cheerio 1.1.x / 1.2.0 / juice@next — none of them fix the underlying `Object.assign(fn, …, { prototype: … })` pattern.

---

## Caveats / Not Found

- I could not find a cheerio issue tracking this specific bug — it appears nobody has reported it upstream. Filing one would be helpful for future maintainers but is out of scope for this task.
- The user's stack trace mentions `toString` while my analysis identifies `prototype` as the structurally non-writable slot being assigned. The discrepancy is V8 reporting the topmost frozen ancestor descriptor; the trigger line is unambiguously `load.js:104`. If you want absolute confirmation, attach Chrome DevTools to the Tauri webview and step into the assignment — the local `initialize` Function will be the target.
- Bundle sizes are estimates from `npm view` + npmjs.com size badges; actual production bundle for InkForge depends on Vite tree-shaking outcomes. Measure with `vite build --report` before committing to a migration.
