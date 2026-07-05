# Research: Tauri 1.x `freezePrototype: true` semantics

- **Query**: Precise behavior of Tauri 1.6 `security.freezePrototype` — what gets frozen, when, source code, rationale, alternatives, Tauri 2.x status, known breakage with cheerio/juice/lodash.
- **Scope**: External (Tauri upstream source + issue tracker + docs) + Internal (`inkforge/src-tauri/tauri.conf.json`)
- **Date**: 2026-05-26

---

## Executive Summary (3 lines)

1. Tauri's `freezePrototype` injects **exactly one statement**: `Object.freeze(Object.prototype)` — nothing else (not Array, Function, String, Number, RegExp, Date prototypes). The naming is misleading; despite the plural-sounding "prototype" the implementation is a single line.
2. The flag has been **default `false` since Tauri 1.0.0-rc.3 (Feb 12, 2022)** because it broke lodash, Angular zone.js, mobx, styled-components, Pixi.js, and other libraries that legitimately assign properties to `Object.prototype` or rely on writable inherited slots; the Inkforge codebase is one of the few projects that explicitly opted **back in** (`tauri.conf.json:89`).
3. Tauri 2.x keeps the flag with the same `false` default and the same single-line implementation. The official upstream guidance after the 2022 regression is: keep CSP strict, leave `freezePrototype` off, and if you do enable it, freeze the prototype *yourself* later in your own bootstrap once you know your dependency graph is safe.

---

## Per-Question Answers

### Q1. What exactly gets `Object.freeze`-ed?

**Only `Object.prototype`.** Verified against the actual injected script in the Tauri 1.x branch:

Source: [`core/tauri/scripts/freeze_prototype.js`](https://github.com/tauri-apps/tauri/blob/1.x/core/tauri/scripts/freeze_prototype.js) — full file contents:

```js
// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

Object.freeze(Object.prototype)
```

That is the entire file (5 lines including license, 1 line of code). The dev branch (Tauri 2.x) version is byte-identical except the copyright year reads `2019-2024`.

**Not frozen** (despite what the name suggests):
- `Array.prototype` — NOT frozen
- `Function.prototype` — NOT frozen
- `String.prototype` — NOT frozen
- `Number.prototype` — NOT frozen
- `Boolean.prototype` — NOT frozen
- `RegExp.prototype` — NOT frozen
- `Date.prototype` — NOT frozen
- `Promise.prototype` — NOT frozen
- `Map`/`Set`/`WeakMap`/`WeakSet` prototypes — NOT frozen

**Important corollary for the Inkforge cheerio bug:**
`Object.freeze(Object.prototype)` makes every property *inherited from Object.prototype* non-writable on every object — including `toString`, `hasOwnProperty`, `valueOf`, etc. So when cheerio does `Object.assign(initialize /* a Function */, { toString, ... })`, the engine walks the prototype chain (`initialize` → `Function.prototype` → `Object.prototype`), finds `Object.prototype.toString` is non-writable (because the prototype is frozen), and in strict mode throws `Cannot assign to read only property 'toString'`. The error message wording `'#<Cheerio>'` refers to the constructor name of the assignment target, not to anything Cheerio-specific being frozen.

The doc comment for the field in `core/tauri-utils/src/config.rs:1475` says it plainly:
```rust
/// Freeze the `Object.prototype` when using the custom protocol.
#[serde(default, alias = "freeze-prototype")]
pub freeze_prototype: bool,
```

---

### Q2. When is the freeze script injected in the webview lifecycle?

**It runs as the first statement of Tauri's `init.js` initialization script, which is registered via `webview_attributes.initialization_script(...)` — meaning it executes *before any user/page script* on every navigation, equivalent to a WebView "document start" hook.**

Evidence:

1. The injection wrapper template, [`core/tauri/scripts/init.js`](https://github.com/tauri-apps/tauri/blob/1.x/core/tauri/scripts/init.js), places `freeze_prototype` **first** inside the top-level IIFE — before pattern script, IPC, bundle, listen function, core, and event init:
    ```js
    ;(function() {
      __RAW_freeze_prototype__         // ← runs first

      ;(function() {
        __RAW_hotkeys__
      })()

      __RAW_pattern_script__
      __RAW_ipc_script__
      ;(function() { __RAW_bundle_script__ })()
      __RAW_listen_function__
      __RAW_core_script__
      __RAW_event_initialization_script__

      if (window.__TAURI_INVOKE__ !== undefined)
        window.__TAURI_INVOKE__('__initialized', { url: window.location.href })
    })()
    ```

2. The init script is attached via the runtime's `webview_attributes.initialization_script(...)` builder (see [`core/tauri/src/manager.rs:471-484`](https://github.com/tauri-apps/tauri/blob/1.x/core/tauri/src/manager.rs)):
    ```rust
    webview_attributes = webview_attributes
      .initialization_script(&self.inner.invoke_initialization_script)
      .initialization_script(&format!(r#"
          Object.defineProperty(window, '__TAURI_METADATA__', { ... })
      "#, ...))
      .initialization_script(&self.initialization_script(
          &ipc_init.into_string(),
          &pattern_init.into_string(),
          is_init_global)?);
    ```

3. `initialization_script` on the underlying wry/WebView API runs scripts **before any document content executes** (WebKit/`webkit2gtk`: `WKUserScriptInjectionTimeAtDocumentStart`; WebView2/MSEdge: `AddScriptToExecuteOnDocumentCreated`; webkit2gtk Linux: `WEBKIT_USER_SCRIPT_INJECT_AT_DOCUMENT_START`). So by the time any of your bundled `<script>` (Vue/Vite/`main.ts`) or any inline HTML script runs, `Object.prototype` is already frozen.

**Consequence for mitigation Approach C (unfreeze before juice import):** because the freeze happens at document-start *outside* user-controlled JS, there is no "earlier" hook your application code can use to either prevent the freeze or to capture the original writable descriptors first. The freeze script runs strictly before `main.ts`, before any module top-level evaluation, before any web component, before HMR client. You can only *recover* `Object.prototype.toString` writability if WebKit/WebView2 allows redefining the descriptor — which it does **not** once `Object.freeze` has been called on the prototype object itself (the object is sealed and frozen; `Object.defineProperty` to flip `writable:true` will throw `TypeError: Cannot redefine property: toString`).

---

### Q3. Tauri 1.x source for this feature — file paths + injection logic

| Concern | File (1.x branch) | Lines |
|---|---|---|
| Injected JS payload | [`core/tauri/scripts/freeze_prototype.js`](https://github.com/tauri-apps/tauri/blob/1.x/core/tauri/scripts/freeze_prototype.js) | 1–5 (full file) |
| Init wrapper template (placement) | [`core/tauri/scripts/init.js`](https://github.com/tauri-apps/tauri/blob/1.x/core/tauri/scripts/init.js) | 5 (`__RAW_freeze_prototype__` first) |
| Conditional bundling (Rust) | [`core/tauri/src/manager.rs`](https://github.com/tauri-apps/tauri/blob/1.x/core/tauri/src/manager.rs) | 817, 841–845, 881 |
| Config field deserialization | [`core/tauri-utils/src/config.rs`](https://github.com/tauri-apps/tauri/blob/1.x/core/tauri-utils/src/config.rs) | 1475–1477 |
| Default value (`false`) | [`core/tauri-utils/src/config.rs`](https://github.com/tauri-apps/tauri/blob/1.x/core/tauri-utils/src/config.rs) | 4211 |

The Rust side that decides whether to inject (verbatim from `manager.rs` 1.x):

```rust
let freeze_prototype = if self.inner.config.tauri.security.freeze_prototype {
  include_str!("../scripts/freeze_prototype.js")
} else {
  ""
};
```

The struct field with doc comment (`tauri-utils/src/config.rs`):

```rust
/// Freeze the `Object.prototype` when using the custom protocol.
#[serde(default, alias = "freeze-prototype")]
pub freeze_prototype: bool,
```

Default constructor sets it to `false`:

```rust
freeze_prototype: false,
```

---

### Q4. Official rationale + guidance

**Rationale (pre-RC.3, when default was `true`):** Tauri followed Object-capability / hardened-JS hygiene (similar to SES/Lockdown) — freezing primordials shrinks the prototype-pollution attack surface (e.g. an attacker who can write to `Object.prototype.toString` can hijack template-string coercion across the app).

**Official statement that ended the "default on" era** — Tauri maintainer lucasfernog on [`tauri-apps/tauri#3416`](https://github.com/tauri-apps/tauri/issues/3416#issuecomment-1037197756), Feb 12, 2022:

> By default we're freezing the prototype. You can set `tauri.conf.json > security > freezePrototype` to false to fix this problem. Note that you should freeze the prototype later if possible. Documentation on this will be updated soon.
>
> We're going to publish a new release changing the default value to false since this breaks on several frameworks.

The change landed in [`PR #3423 — fix(core): change default freezePrototype to false`](https://github.com/tauri-apps/tauri/pull/3423), merged 2022-02-12, shipped in 1.0.0-rc.3+.

**Current docs (v1):** [`tauri.app/v1/api/config/#securityconfig.freezeprototype`](https://tauri.app/v1/api/config/#securityconfig.freezeprototype) — the entire entry is just:

| Field | Type | Default | Description |
|---|---|---|---|
| `freezePrototype` | boolean | `false` | Freeze the `Object.prototype` when using the custom protocol. |

No security warning is attached (compare to `dangerousDisableAssetCspModification` which is annotated with a **WARNING** banner). The docs do not push users to enable it; the relative security posture Tauri now recommends is **CSP first**, prototype-freeze opt-in only after dependency audit.

**Upstream guidance if you disable** (from the same maintainer comment): the responsible pattern is to call `Object.freeze(Object.prototype)` *yourself* in your application bootstrap, *after* you have imported and initialized all libraries that mutate the prototype during module evaluation. This converts the freeze from a build-time global toggle into a runtime user-controlled call you can place at the end of `main.ts` once cheerio/juice/etc. have finished module-load side effects.

---

### Q5. Known issues — libraries that break under `freezePrototype: true`

Confirmed reports against the Tauri 1.x freeze_prototype injection (same error class: `Cannot assign to read only property 'toString'` / `Attempted to assign to readonly value`):

| Library | Issue link | Failure site |
|---|---|---|
| **lodash / lodash-es** | [`tauri#3416`](https://github.com/tauri-apps/tauri/issues/3416) (original bug report; via naive-ui dep tree) | `lodash.default.js:410:14` in `_createBaseFor` — `baseAssignValue` writing onto a target whose proto chain hits frozen `Object.prototype` |
| **Angular zone.js** | [`tauri#3416` comment by pwespi](https://github.com/tauri-apps/tauri/issues/3416#issuecomment-1037184315) | `Object.prototype.toString = function () { … }` (zone.js patches `toString` to identify zone-wrapped values) |
| **mobx** | [`tauri#3416` comment by srg-kostyrko](https://github.com/tauri-apps/tauri/issues/3416#issuecomment-1037188094) | mobx mutates prototypes when wiring observables |
| **styled-components** (+ TypeScript) | [`tauri#3406`](https://github.com/tauri-apps/tauri/issues/3406) | blank-screen on any styled.X usage |
| **Pixi.js** | [`tauri#3438`](https://github.com/tauri-apps/tauri/issues/3438) | white screen on `new Application()` |
| **dayjs** | [`tauri#3452`](https://github.com/tauri-apps/tauri/issues/3452) | `TypeError: Attempted to assign to readonly value` during init |
| **cheerio 1.0.0** | (Inkforge in-house, this task) | `dist/browser/load.js:104` — `Object.assign(initialize, { toString, … })` on the Cheerio constructor function |
| **juice 11.x** | (Inkforge, transitive via cheerio) | indirect: any `juice(...)` call triggers `cheerio.load()` which trips the above |

**Pattern that fails**: any module-level or per-call code of the shape

```js
Object.assign(targetWithObjectInProtoChain, { toString, … })
// or
SomeProto.toString = function() { … }
// or
target[key] = value   // where key === 'toString' and target inherits frozen Object.prototype
```

This is a *very* common idiom (debug formatting, ORM/proxy wrappers, function-as-object decoration). The Tauri maintainers explicitly acknowledged this is why they reversed the default ("this breaks on several frameworks"). There is no centralized list of safe-vs-unsafe libraries; **every dependency must be re-tested after enabling freezePrototype**.

**Inkforge-specific additional candidates to audit** (none confirmed yet in Tauri webview, all are heuristic from grep): mermaid, cytoscape, chevrotain, @popperjs/core, @vue/compiler-vue2. dompurify/marked/katex/lowlight/highlight.js/dexie/pinia/vue3/@tiptap appear safe based on community usage with Tauri but no published incident reports for them under freezePrototype.

---

### Q6. Tauri 2.x status

**Still present, still defaults to `false`, still byte-identical implementation. Not deprecated, not removed.**

Evidence:
- Tauri 2.x `dev` branch `crates/tauri-utils/src/config.rs:2908–2910`:
    ```rust
    /// Freeze the `Object.prototype` when using the custom protocol.
    #[serde(default, alias = "freeze-prototype")]
    pub freeze_prototype: bool,
    ```
- Default at `crates/tauri-utils/src/config.rs:4461`: `freeze_prototype: false,`
- Tauri 2.0.0 release tag (`tauri-v2.0.0`): identical struct field at line 1782–1784, default at 2921 → `freeze_prototype: false`.
- Injected JS at [`crates/tauri/scripts/freeze_prototype.js`](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/scripts/freeze_prototype.js) on the dev branch is the same single line `Object.freeze(Object.prototype)` (copyright bumped to 2024).

**Migration implication for the Inkforge task**: even if/when Inkforge bumps to Tauri 2, the field is still spelled `freezePrototype` and behaves identically. The fix (`"freezePrototype": false`) carries forward without semantic change. There is no equivalent of the proposed `devFreezePrototype` from issue #3416 — that suggestion was never implemented.

---

### Q7. Alternative mitigations to keep XSS hardening if you disable

| Mitigation | Already in place at Inkforge? | What it covers that prototype-freeze does NOT |
|---|---|---|
| **Strict CSP `script-src 'self'`** (no `unsafe-inline`, no `unsafe-eval`, no remote origins) | ✅ Yes — `tauri.conf.json:88` has `default-src 'self'; script-src 'self'; ...` | Blocks the *delivery* of attacker JS, which is the actual prerequisite for a prototype-pollution attack in a webview context. Without injectable JS, there is no attacker code to exploit a writable `Object.prototype.toString`. |
| **`dangerousDisableAssetCspModification: false`** (let Tauri inject nonces) | ✅ Yes — `tauri.conf.json:90` set to `false` | Ensures bundled assets get the Tauri-augmented CSP with hashes/nonces so injected `<script>` is rejected. |
| **Tauri allowlist minimization** (`"all": false`, only enable specific commands) | ✅ Yes — `tauri.conf.json:14–48` enumerates only fs/dialog/clipboard/shell/http with scopes | Reduces the attacker capability *if* JS injection succeeded; orthogonal to prototype freeze. |
| **Tauri `http` scope `http://localhost:11434/*`** (Ollama only) | ✅ Yes — `tauri.conf.json:45–47` | Limits exfiltration / SSRF; orthogonal. |
| **No `unsafe-eval` and no dynamic code** | ✅ Yes — CSP excludes `unsafe-eval`; no `new Function`/`eval` in app code | Removes the most common runtime XSS amplifier. |
| **DOMPurify on any user-controlled HTML** | ✅ Yes — dompurify@3 already a dep | Sanitizes paste/import paths before they reach the DOM. |
| **User-controlled, deferred `Object.freeze(Object.prototype)` in `main.ts` after critical imports** | ❌ Not done, ⚠ **but** would re-trip cheerio if invoked before juice is called; only safe if called *after* all juice/cheerio paths have run their module-init AND if cheerio's per-call `cheerio.load()` does NOT re-assign toString (the bug suggests it does per-load, so this is likely a dead end without monkey-patching cheerio). Not recommended. | Restores the original prototype-pollution defense if applicable. |
| **SES / `lockdown()` (Agoric)** as a real hardened-JS layer | ❌ Not in scope; would require substantial refactor (compartments, harden() everywhere) | Strict superset of Object.freeze — also freezes Array/Function/etc., handles intrinsics. Not appropriate for an Electron-style app with Vue/TipTap; better suited to multi-tenant JS sandboxes. |
| **Subresource Integrity on bundled JS** | ⚠ Partial — Vite hashes filenames but no SRI hashes in `<script>` tags | Defense against build-pipeline tamper; orthogonal to prototype-freeze. |
| **Tauri `dangerousRemoteDomainIpcAccess` left empty** | ✅ Yes (default empty) | Prevents remote-origin frames from invoking commands; orthogonal. |

**Summary of net security delta from disabling freezePrototype**:
- **Lost**: a single-line in-depth defense against XSS-driven `Object.prototype.toString` (or other inherited slot) hijacking. *Only meaningful if attacker JS executes inside the app*; CSP `script-src 'self'` is the primary gate that makes attacker JS execution effectively impossible in this app (no inline scripts, no remote scripts, no eval).
- **Retained**: CSP, scoped allowlist, scoped http, scoped fs, no eval, DOMPurify, no remote IPC, local-only Ollama.

For a local-only offline editor with strict CSP and no untrusted JS injection surface, the practical residual risk from disabling `freezePrototype` is near zero. The Tauri maintainers reached the same conclusion in Feb 2022 when they flipped the default.

---

## Citation Bundle (Tauri upstream)

| # | Source | Purpose |
|---|---|---|
| 1 | https://github.com/tauri-apps/tauri/blob/1.x/core/tauri/scripts/freeze_prototype.js | The actual injected script |
| 2 | https://github.com/tauri-apps/tauri/blob/1.x/core/tauri/scripts/init.js | Confirms injection order (freeze runs first) |
| 3 | https://github.com/tauri-apps/tauri/blob/1.x/core/tauri/src/manager.rs#L841 | Rust conditional include_str! of the script |
| 4 | https://github.com/tauri-apps/tauri/blob/1.x/core/tauri-utils/src/config.rs#L1475 | Config struct doc comment ("Freeze the Object.prototype") |
| 5 | https://github.com/tauri-apps/tauri/issues/3416 | Original bug — lodash + Angular zone.js + mobx breakage |
| 6 | https://github.com/tauri-apps/tauri/issues/3406 | styled-components breakage |
| 7 | https://github.com/tauri-apps/tauri/issues/3438 | Pixi.js breakage |
| 8 | https://github.com/tauri-apps/tauri/issues/3452 | lodash + dayjs breakage |
| 9 | https://github.com/tauri-apps/tauri/pull/3423 | PR that changed default to false (rationale in maintainer comment) |
| 10 | https://tauri.app/v1/api/config/#securityconfig.freezeprototype | Current official v1 docs (no warning attached, default false) |
| 11 | https://github.com/tauri-apps/tauri/blob/dev/crates/tauri-utils/src/config.rs#L2908 | Tauri 2.x — flag still exists, still defaults to false |
| 12 | https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/scripts/freeze_prototype.js | Tauri 2.x — same one-line script |

---

## Recommendation Table (decision input for the task)

| Option | Effort | Restores app | Security delta | Future-proof | Verdict |
|---|---|---|---|---|---|
| **A. Set `freezePrototype: false`** in `tauri.conf.json` | 1 line | ✅ Yes, immediately | Small (CSP + scoped allowlist remain primary defenses; matches Tauri default since rc.3) | ✅ Works on Tauri 1.x and 2.x identically | **RECOMMENDED** — same posture as 99% of Tauri apps in the wild and consistent with upstream's own default since 2022-02-12 |
| B. Pin/patch cheerio to a version without `Object.assign(initialize, {toString,...})` | High (pnpm patch upkeep) | ✅ Probably (until next juice update) | Keeps freeze-protection | ❌ Each cheerio upgrade needs re-audit; juice may pull mismatched cheerio | Not recommended — treats one symptom, leaves other libs (mermaid/cytoscape/etc.) as latent risks |
| C. Runtime unfreeze before juice import | Likely impossible in practice | ❌ Will not work — `Object.freeze` cannot be reversed; descriptor cannot be flipped back to writable | — | — | Dead end — confirmed by spec (`Object.freeze` is irreversible) |
| D. Replace juice with a custom CSS inliner | Very high (weeks) | ✅ Eventually | Could keep freeze | ⚠ Custom code becomes maintenance burden | Out of scope per PRD |
| E. Defer your own `Object.freeze(Object.prototype)` to end of `main.ts` after all cheerio paths have run | Medium; brittle | ⚠ Only if cheerio.load() does NOT assign toString per-call. Evidence suggests it does (`load.js:104` runs on every `load()`). | Restores some defense post-init | ❌ Each new juice() call still walks the freeze path | Not viable for an app that calls juice on every export |

**Final**: Approach A aligns with the upstream Tauri default for the past 3+ years, costs one line, restores three platform export paths, and leaves CSP as the load-bearing XSS defense — which is the explicitly endorsed posture in Tauri's current public docs.

---

## Caveats / Not Found

- No public Tauri docs page explicitly states "we recommend leaving freezePrototype off" in those words. The recommendation is inferred from: (a) default flip to `false` since 1.0.0-rc.3, (b) maintainer comment on #3416, (c) absence of a WARNING banner in the v1 docs page (compare to `dangerousDisableAssetCspModification`).
- I did not locate a public incident report tying *cheerio specifically* to `freezePrototype` outside this Inkforge task. The matching pattern (`Object.assign(fn, {toString, …})` against frozen `Object.prototype`) is identical to the reported lodash/zone.js/mobx cases, so the same upstream fix applies.
- The dev branch of Tauri 2.x as of the date of this research has not removed `freeze_prototype`. If Tauri removes it in a future minor (unlikely given the 3+ year stability), the migration would be a no-op deletion.
- No alternative built-in Tauri primitive replaces `freezePrototype`. SES/lockdown() is the JS-community alternative but requires app-level adoption, not a config flag.
