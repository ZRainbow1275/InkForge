# InkForge Security Notes

This document records security-relevant configuration decisions that cannot be
inlined as JSON comments. For the full security architecture, see
`docs/SECURITY_ARCHITECTURE.md`.

---

## Tauri `security.freezePrototype` — disabled

**File**: `src-tauri/tauri.conf.json`
**Setting**: `"freezePrototype": false`
**Status**: Disabled (matches the Tauri 1.x default since 1.0.0-rc.3 / Feb 2022)

### Rationale

The Tauri injection script `freeze_prototype.js` runs a single statement at
document-start before any application JavaScript executes:

```js
Object.freeze(Object.prototype)
```

After this freeze, every property inherited from `Object.prototype`
(`toString`, `hasOwnProperty`, `valueOf`, …) becomes non-writable. In strict
mode, any `[[Set]]` whose property name matches an `Object.prototype` member —
even when the immediate target is a different object whose own slot does not
exist — walks the prototype chain, hits the frozen ancestor, and throws
`TypeError: Cannot assign to read only property 'toString'`.

`juice@11` statically imports `cheerio@1.0.0`. Cheerio's module-evaluation
phase performs:

```js
// node_modules/cheerio/dist/browser/cheerio.js:57
Object.assign(Cheerio.prototype, Attributes, Traversing, Manipulation, Css, Forms, Extract)
```

`Manipulation` exports a function named `toString`. Because `Cheerio.prototype`
has no own `toString` and inherits from a frozen `Object.prototype`, this
assignment throws — terminating module evaluation before any export route can
run. Every static import of `@/services/export` (5 call sites across
`WorkstationView`, `PublishView`, `SettingsView`, `ExportModal`, `CMSTools`)
detonates this trap and the editor crashes on first load.

Tauri's own upstream maintainers acknowledged this class of breakage in
[`tauri#3416`](https://github.com/tauri-apps/tauri/issues/3416), flipped the
default to `false` in
[`tauri#3423`](https://github.com/tauri-apps/tauri/pull/3423), and updated the
v1 documentation accordingly. The same hazard surfaces with `lodash-es`,
`dayjs`, `d3`, `cytoscape`, `zone.js`, `mobx`, `styled-components`, and any
library that mutates inherited descriptors during module init — several of
which we already ship transitively through `mermaid`.

Research artifacts in
`.trellis/tasks/05-26-fix-tauri-freezeprototype-breaks-juice-cheerio-runtime/research/`
record the full call graph and dependency audit.

### Primary defenses retained

Disabling `freezePrototype` does not relax our XSS posture. The load-bearing
controls remain:

- **Strict CSP** (`tauri.conf.json` `security.csp`): `default-src 'self';
  script-src 'self'; …` — no inline scripts, no `unsafe-eval`, no remote
  origins, no `data:` JavaScript.
- **`dangerousDisableAssetCspModification: false`** — Tauri continues to inject
  nonces/hashes into bundled assets.
- **Tauri allowlist minimization** — `allowlist.all = false`; only `fs`,
  `dialog`, `clipboard`, `shell.open`, and scoped `http` (`http://localhost:11434/*`
  for Ollama) are enabled.
- **DOMPurify** on all user-controlled HTML across export pipelines.
- **No `eval` / `new Function`** in application code.
- **Local-first, offline** — there is no remote scripting surface and no
  cross-origin user input that lands in the webview.

The `freezePrototype` mitigation only matters if attacker JavaScript can
already execute in the webview. The combination above keeps that prerequisite
out of reach.

### When to revisit

Re-enable `freezePrototype` only after:

1. Replacing `juice` (and its `cheerio` dependency) with an inliner that does
   not mutate inherited prototype slots during module evaluation — e.g.
   `@css-inline/css-inline-wasm`.
2. Re-auditing the `mermaid` transitive graph (`lodash-es`, `dayjs`, `d3`,
   `cytoscape`, `js-yaml`) for the same write pattern.
3. Adding a startup smoke test that imports `@/services/export` in a webview
   with the freeze script injected.

Until then, leave `freezePrototype: false`.
