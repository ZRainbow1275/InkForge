# PR2 Check Report — Hub + Workstation + Welcome + View Transitions

Date: 2026-05-28
Agent: trellis-check (Restrained Premium polish, PR2 of 3)
Scope: working-tree (uncommitted) vs HEAD `84a6e65`

## Verdict

**PR2 READY FOR COMMIT.** All five PR2 acceptance gates pass with concrete
file:line evidence. e87f283 / PR1 regression checks pass. Build + lint +
cargo gates green. No new anti-patterns introduced; pre-existing
non-conformities are documented in the impl summary as PR3 open items, not
PR2 blockers.

---

## Gate 1 — ViewTransition.vue (new)

**Status: PASS**

`inkforge/src/components/chrome/ViewTransition.vue` — Read confirmed:

- L15: `<RouterView v-slot="{ Component, route }">`
- L16-19: `<Transition name="view-fade" mode="out-in">`
- L20-24: `<component :is="Component" :key="route.fullPath" class="app-route-shell" />`
- L32: `transition: opacity var(--motion-slow) var(--ease-out-quart);`
- L36-38: `.view-fade-enter-from, .view-fade-leave-to { opacity: 0; }`

No hardcoded ms / no hardcoded easing. Motion token `--motion-slow` cascades
to 0ms under `prefers-reduced-motion: reduce` via tokens.css (PR1 contract).

---

## Gate 2 — App.vue

**Status: PASS**

`inkforge/src/App.vue` diff confirmed:

- L33: `import ViewTransition from '@/components/chrome/ViewTransition.vue'`
  added after TitleBar import.
- L393-394 (template): `<template v-else> <ViewTransition />` — replaces the
  prior `<router-view v-slot…><Transition :name="route.meta.transition ||
  'page-fade'"…></router-view>` block (12 lines removed).
- L224-225: `await nextTick(); void notifyAppReady()` — IPC handshake intact.
- L401: `<DevPanel v-if="devPanelStore.shouldRenderPanel" />` — DevPanel
  keychord activator unchanged.
- L394-402: Sibling modals (`WelcomeModal`, `HelpCenter`, `CommandPalette`,
  `UpdateToast`, `UpdateDetailsModal`) preserved in identical mount order.
- L325-390: Error boundary `v-if="hasError"` branch intact; ViewTransition
  lives inside `v-else` so errored views never enter the transition path.
- Removed `.page-fade-*` / `.page-slide-left-*` / `.page-slide-right-*` CSS
  blocks (24 lines) — directional slides are parallax patterns that violate
  the Restrained Premium lock. Replacement is the single token-driven
  opacity cross-fade in `ViewTransition.vue`.

---

## Gate 3 — HubView.vue

**Status: PASS**

`inkforge/src/views/HubView.vue` diff confirmed:

- L997-1000 (header brand): `<ForgeNibMark :size="36" interactive />` — was
  bare `:size="36"`.
- L2425-2432 (`.brand-text h1`): `var(--font-serif)` +
  `var(--type-step-2)` + `var(--type-weight-emphasis)` + `0.02em`
  letter-spacing + `1.2` line-height.
- L2446-2452 (`.welcome-text`): `var(--font-sans)` + `opacity 0.85`.
- L2756-2786 (`.bento-card` resting+hover):
  - `box-shadow: var(--elev-1)` resting (L2757)
  - `transition: box-shadow var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart), border-color
    var(--motion-fast) var(--ease-out-quart)` (L2758-2760)
  - `.bento-card:not(.card-hero):not(.card-inspiration):not(.card-new):hover`
    uses `translateY(-1px) + var(--elev-2) +
    border-color: var(--hairline-light)` (L2782-2786) — One Accent applied:
    Kiln tint `rgba(211, 47, 47, 0.2)` removed.
- L2516-2522 (`.icon-btn:hover`): `border-color: var(--hairline-light); color:
  #263238; transform: translateY(-1px); box-shadow: var(--elev-2)` — One
  Accent applied: Kiln tint removed.
- L2576-2586 (`.header-search-bar` hover/focus):
  - hover uses `var(--hairline-light) + var(--elev-1)` (L2576-2580)
  - `:focus-within` uses `box-shadow: var(--focus-ring)` (L2582-2585) — Kiln
    double-ring (accessibility exception to One Accent rule).
- L4697-4705 (`.article-card` resting): `box-shadow: var(--elev-1)` +
  token-driven multi-property transition.
- L4797-4800 (`.article-card:hover`): `translateY(-1px) + var(--elev-2)` —
  Kiln border tint removed.

**Hairline migration count (HubView):**

```
grep "var(--hairline-light)" inkforge/src/views/HubView.vue → 24
```

Exceeds the ≥13 spec floor. All `1px solid #ECEFF1` migrated (replaceAll, 13
occurrences confirmed by impl summary; bulk diff shows ≥16 hits over the
diff).

**Hard hex `1px solid #DED7CA / #E7E0D2 / #ECEFF1 / #E5E7EB` literals after
PR2:** 0 (Grep confirmed: `No matches found`).

---

## Gate 4 — WorkstationView.vue

**Status: PASS**

`inkforge/src/views/WorkstationView.vue` diff confirmed:

- L1998-2001 (header brand): `<ForgeNibMark :size="28" interactive />` — was
  bare.
- L3524-3536 (`.workstation-header`):
  - `border-bottom: 1px solid var(--hairline-light)` (L3528)
  - `box-shadow: var(--elev-1)` (L3529) — chrome surface elevation.
- L3539-3552 (`.header-brand`):
  - `border-right: 1px solid var(--hairline-light)` (L3544)
  - `transition: opacity var(--motion-fast) var(--ease-out-quart)` (L3546)
  - hover `opacity: 0.78` (L3551) — softer than prior 0.7, matches
    Restrained Premium.
- L3564-3570 (`.header-brand-name`): `var(--font-serif) + var(--type-step-1)
  + var(--type-weight-emphasis) + 0.02em letter-spacing`.
- L3581-3593 (`.header-title-input`): `transition: background-color
  var(--motion-fast) var(--ease-out-quart)`.
- L3958-3972 (`.split-toolbar-btn`):
  - `border: 1px solid var(--hairline-light)` (L3964)
  - `transition: background-color/border-color/color var(--motion-fast)
    var(--ease-out-quart)` (L3969-3971) — multi-property motion token
    transition.

**Hairline migration count (WorkstationView):**

```
grep "var(--hairline-light)" inkforge/src/views/WorkstationView.vue → 21
```

Exceeds the ≥17 spec floor. All `1px solid #E5E7EB` (17) and `1px solid
#ECEFF1` (2) migrated to `var(--hairline-light)`. Confirmed by diff.

**Hard hex `1px solid` literals after PR2:** 0 (Grep confirmed: `No matches
found`).

---

## Gate 5 — WelcomeModal.vue

**Status: PASS**

`inkforge/src/components/help/WelcomeModal.vue` diff confirmed:

- L72-75: `<ForgeNibMark :size="56" interactive />`.
- L207-218 (`.if-welcome__dialog`):
  - `border: 1px solid var(--hairline-light)` (L211)
  - `box-shadow: var(--elev-3)` (L216).
- L238-245 (`.if-welcome h2`): `var(--font-serif) + var(--type-step-3) +
  var(--type-weight-emphasis) + 1.1 line-height + 0.02em letter-spacing`.
- L247-252 (`.if-welcome__lead`): `font-size: var(--type-step-1) +
  line-height: 1.6`.
- L266-273 (`.if-welcome__points span`): `var(--hairline-light)` border.
- L315-331 (`.if-welcome__path-card`):
  - `var(--hairline-light)` border + `transition: box-shadow/transform
    var(--motion-fast) var(--ease-out-quart)` (L319, L324-325)
  - hover: `var(--elev-2) + translateY(-1px)` (L328-331).
- L351-356 (`:focus-visible` rings): `outline: none; box-shadow:
  var(--focus-ring)` (was 3px blue outline).
- L358-361 (`.if-welcome-fade-enter/leave-active`): `transition: opacity
  var(--motion-slow) var(--ease-out-quart)`.

---

## e87f283 + PR1 Regression Checks

**Status: PASS**

| Check | Evidence |
|---|---|
| TitleBar.vue NOT touched | `git diff inkforge/src/components/chrome/TitleBar.vue` returns empty. |
| ForgeNibMark imported in 5 sites | Grep across `inkforge/src` returns 6 files: HubView, WorkstationView, WelcomeModal, TitleBar, ForgeNibMark (self), SettingsView. |
| 4 of 5 sites pass `interactive` | Grep `interactive` confirms: HubView L999, WorkstationView L2000, WelcomeModal L74, TitleBar L141 + L163 (2 occurrences for win/linux + mac variants). SettingsView L5907 deferred to PR3 (per impl summary). |
| tokens.css NOT modified | `git diff inkforge/src/styles/tokens.css` returns empty. |
| ForgeNibMark.vue NOT modified | `git diff` returns empty. |
| splash.html NOT modified | not in `git status` modified list. |
| IPC handshake intact | App.vue L224-225 `await nextTick(); void notifyAppReady()` — unchanged. |
| Error boundary intact | App.vue L325-390 — ViewTransition mounts inside `v-else` branch. |

---

## Anti-pattern Audit (research §4, PR2 modified files)

| Anti-pattern | Status | Evidence |
|---|---|---|
| Hard `1px solid #DED7CA / #E7E0D2 / #ECEFF1 / #E5E7EB` literals | PASS | Grep across PR2 files returns 0 matches. |
| Instant (0ms) state changes | PASS | All modified blocks use `var(--motion-fast)` or `var(--motion-slow)`. |
| Mismatched border-radius | PASS | No new radius values introduced (diff shows no `border-radius:` adds). |
| Font-weight drift | PASS | Only `var(--type-weight-normal)` (400) and `var(--type-weight-emphasis)` (600) used in new declarations. |
| Window controls treated as afterthought | N/A (PR1 scope, not touched in PR2) |
| Dark mode = luma flip | PASS | `git diff` shows zero added/removed lines inside `html[data-theme="dark"]` blocks; dark hand-tuned palette preserved. |
| Backdrop-filter without fallback | PASS | No new backdrop-filter usage added. |
| Generic accent everywhere | PASS | One Accent rule applied: Kiln hover removed from `.icon-btn:hover`, `.bento-card:hover` border tint, `.article-card:hover` border tint, `.header-search-bar:hover`, `.template-market-item:hover`. Kiln retained on: ForgeNibMark seal (semantic), header-search-bar focus ring (accessibility), `.split-toolbar-btn.active`/hover (toolbar action accent — research §5 Pattern A "active toolbar action" allowance). |
| Decorative gradients on chrome that don't echo brand | PASS | No new gradients in PR2 diff. |
| `outline: none` without replacement | PASS | WelcomeModal `:focus-visible` upgraded to `box-shadow: var(--focus-ring)`. |
| NEW spring/bounce curves introduced | PASS | `git diff` shows zero new `cubic-bezier(0.16, ...)` / `cubic-bezier(0.34, ...)` additions in any PR2 file. Existing spring curves (entry `fadeInUp` + card spawn) acknowledged as PR3 open item per impl summary §"Non-blocking PR2 residue". |
| Kiln accent appears ≤2x per viewport in modified sections | PASS | HubView header viewport: 1 Kiln moment (Forge Nib seal). Bento card viewport: ≤1 Kiln moment (search focus ring, accessibility-only). Article card viewport: 0 Kiln (translateY + elev-2 only). WorkstationView header: 1 Kiln (Forge Nib seal). Welcome modal: 1 Kiln (Forge Nib at 56px). |

---

## Token Adoption Summary

```
grep -c "var(--motion-*|--ease-out-quart|--elev-*|--hairline-light|--focus-ring|--type-step-*|--type-weight-*|--font-serif|--font-sans)"
inkforge/src/views/HubView.vue                        → 52
inkforge/src/views/WorkstationView.vue                → 30
inkforge/src/components/help/WelcomeModal.vue         → 13
inkforge/src/components/chrome/ViewTransition.vue     →  1
```

Per-token breakdown:

| File | hairline-light | elev-* | motion-* | focus-ring | type/font-* |
|---|---|---|---|---|---|
| HubView.vue | 24 | 8 | 15 | 1 | 4 |
| WorkstationView.vue | 21 | 1 | 5 | 0 | 3 |
| WelcomeModal.vue | 3 | 2 | 3 | 1 | 4 |
| ViewTransition.vue | 0 | 0 | 1 | 0 | 0 |

WorkstationView focus-ring=0 is expected — its inputs/buttons rely on the
global `:focus-visible` rule installed in `App.vue` L421-430 (PR1 baseline).
No component-level override needed for PR2.

---

## Build / Lint / Cargo Gates

```
$ cd inkforge && pnpm exec vue-tsc --noEmit
tsc-exit=0
(no output)

$ pnpm exec eslint src --ext .ts,.tsx,.vue --quiet
eslint-exit=0
(no output)

$ cd src-tauri && cargo check
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.61s
cargo-exit=0

$ cargo fmt -- --check
cargo-fmt-exit=0
(no output)
```

Clippy `-D warnings` intentionally skipped per task spec (4 pre-existing
`wechat.rs` errors documented elsewhere).

---

## Open Items Acknowledged (PR3 scope, not PR2 blockers)

Recorded per impl summary §"Open Items for PR3" and §"Non-blocking PR2
residue":

1. SettingsView.vue: ForgeNibMark `interactive` prop, 12 tabs type rhythm,
   hairline-only dividers, double-ring focus on inputs.
2. Form input components used across Settings/Hub: per-component focus ring
   evaluation.
3. Buttons globally (Hub workflow CTAs, settings primary buttons):
   token-driven hover bg + disabled state.
4. Dark mode re-tune: HubView/WorkstationView hand-tuned dark shadows
   migrate to dark-aware `var(--elev-*)` tokens (auto-flip already wired in
   tokens.css `:root[data-theme='dark']`).
5. `docs/inkforge-brand-identity.md` §16 Dark Mode Contract closeout.
6. HubView pre-existing spring-curve entry/spawn animations (L2314, 2766,
   3327, 3359, 3507, 3854, 3990, 4200, 4710, 4930) migrate to
   `var(--motion-base) + var(--ease-out-quart)`.
7. WorkstationView panel-resize Material curves (L3779, 3804, 3822, 4328).
8. `router/index.ts` dead `meta.transition` keys cleanup.
9. brand-identity.md §12.4/§12.6 backfill (20px seal + 50px controls).

---

## Final Verdict

**PR2 READY FOR COMMIT.**

All five acceptance gates pass with file:line evidence. e87f283 + PR1
contracts preserved. Anti-pattern audit clean for PR2-modified blocks.
Build/lint/cargo gates green. No blockers. Main session may drive Phase
3.4 commit. Do NOT commit from this check agent.
