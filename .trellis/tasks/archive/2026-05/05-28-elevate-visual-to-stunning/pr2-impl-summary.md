# PR2 — Hub + Workstation + Welcome + View Transitions (Impl Summary)

Member: `pr2-impl` of team `inkforge-stunning-polish`.
Date: 2026-05-28.

## Files Modified

NEW:
- `D:\Desktop\Inkforge\inkforge\src\components\chrome\ViewTransition.vue`

MODIFIED:
- `D:\Desktop\Inkforge\inkforge\src\App.vue` (router-view → ViewTransition; legacy page-fade/page-slide CSS removed)
- `D:\Desktop\Inkforge\inkforge\src\views\HubView.vue` (header brand zone, bento-card resting+hover, article-card resting+hover, icon-btn hover, sync-badge, header-search-bar, template-market-item, template-category-pill, bulk `1px solid #ECEFF1` → `var(--hairline-light)`)
- `D:\Desktop\Inkforge\inkforge\src\views\WorkstationView.vue` (workstation-header, header-brand, header-brand-name, header-title-input, split-pane-toolbar, split-toolbar-btn, bulk `1px solid #ECEFF1`/`#E5E7EB` → `var(--hairline-light)`)
- `D:\Desktop\Inkforge\inkforge\src\components\help\WelcomeModal.vue` (dialog elevation 3, ForgeNibMark interactive, heading + lead type rhythm, path-card elev-1→elev-2 hover, fade transition tokens, focus ring)

NOT TOUCHED:
- `inkforge/src/components/error/*` — directory does not exist in repo
- `inkforge/src/views/SettingsView.vue` — explicitly deferred to PR3
- PR1 files (`TitleBar.vue`, `ForgeNibMark.vue`, `tokens.css`, `splash.html`) — no diff vs HEAD (PR1 already shipped `84a6e65`)

## ViewTransition.vue — Cross-fade Wrapper

```vue
<RouterView v-slot="{ Component, route }">
  <Transition name="view-fade" mode="out-in">
    <component :is="Component" :key="route.fullPath" class="app-route-shell" />
  </Transition>
</RouterView>
```

- Single 240ms `var(--motion-slow)` + `var(--ease-out-quart)` opacity cross-fade
- Reduced-motion auto-collapses to 0ms via tokens.css cascade — no extra CSS
- Replaces the prior per-route `meta.transition` switch (`page-slide-left` / `page-slide-right` / `page-fade`). The directional slide animations were parallax patterns in violation of the Restrained Premium lock ("0 spring / 0 bounce / 0 parallax"); cross-fade is the canonical lock-compliant motion.
- `class="app-route-shell"` flows through unchanged — App.vue's unscoped `.app-route-shell` rules (width/height + mobile padding) still apply.

## App.vue

- Added `import ViewTransition from '@/components/chrome/ViewTransition.vue'` after `TitleBar` import.
- Replaced the entire `<router-view v-slot…><Transition…></router-view>` block (with route.meta.transition lookup) by `<ViewTransition />` inside the normal-content `v-else` branch.
- All sibling modals (WelcomeModal / HelpCenter / CommandPalette / UpdateToast / UpdateDetailsModal / DevPanel) preserved in identical mount order.
- Removed the now-unused `.page-fade-enter-*` / `.page-slide-left-*` / `.page-slide-right-*` CSS blocks (≈24 lines). The `.app-route-shell` style + mobile padding rules + `.reduce-motion` global override are preserved.
- IPC handshake (`await nextTick(); void notifyAppReady()`) untouched at line 224-225.
- Error boundary still wraps via `hasError` v-if/v-else gate — ViewTransition mounts inside `v-else` so failed-state UI bypasses route transitions entirely.

## HubView.vue (5928 lines — surgical)

### Header brand zone (lines ~989-1004 + ~2382-2447)

- `<ForgeNibMark :size="36" interactive />` (was bare `:size="36"`)
- `.brand-text h1` → `font-family: var(--font-serif)` + `font-size: var(--type-step-2)` (22px) + `var(--type-weight-emphasis)` + 0.02em letter-spacing + line-height 1.2
- `.welcome-text` → `font-family: var(--font-sans)` + opacity 0.85

### Bento-card pattern (lines ~2756-2786)

- Resting: `box-shadow: var(--elev-1)` + `border: 1px solid var(--hairline-light)` + token-driven 120ms ease-out-quart transition on box-shadow/transform/border-color
- Hover (`:not(.card-hero):not(.card-inspiration):not(.card-new)`): `transform: translateY(-1px)` (was -4px) + `box-shadow: var(--elev-2)` (was hardcoded double-shadow)
- One Accent rule: Kiln tint `rgba(211, 47, 47, 0.2)` removed from hover border-color — neutral hairline preserved

### Article-card pattern (lines ~4679-4794)

- Resting: same elev-1 + hairline-light + token transition
- Hover: `translateY(-1px)` + `var(--elev-2)`, Kiln border tint removed

### Interactive controls

- `.icon-btn`: hairline border + token transitions; hover Kiln → neutral (hairline-light border + Graphite color + elev-2)
- `.sync-badge`: hairline-light border
- `.header-search-bar`: hairline-light border, `var(--motion-fast) var(--ease-out-quart)` transition, focus-within now uses `box-shadow: var(--focus-ring)` (Kiln double-ring) instead of custom blob shadow
- `.template-market-item`: hairline + elev-1 resting + elev-2 hover with motion tokens
- `.template-category-pill`: hairline-light border

### Bulk hairline migration

- `border: 1px solid #ECEFF1` → `border: 1px solid var(--hairline-light)` (replaceAll, 13 occurrences)
- `border-top: 1px solid #ECEFF1` → `border-top: 1px solid var(--hairline-light)` (replaceAll, 4 occurrences)

## WorkstationView.vue (5730 lines — surgical)

### Header brand zone

- `<ForgeNibMark :size="28" interactive />` (was bare)
- `.workstation-header` → `border-bottom: var(--hairline-light)` + `box-shadow: var(--elev-1)` (chrome surface elevation)
- `.header-brand` → hairline-light right border, `var(--motion-fast) var(--ease-out-quart)` opacity transition, hover opacity 0.78 (was 0.7 — softer to match Restrained Premium)
- `.header-brand-name` → `var(--font-serif)` + `var(--type-step-1)` (14px) + `var(--type-weight-emphasis)` + 0.02em letter-spacing
- `.header-title-input` → `var(--motion-fast) var(--ease-out-quart)` background transition

### Split-pane chrome

- `.split-pane-toolbar` → hairline-bottom (via bulk replace; was `#E5E7EB`)
- `.split-toolbar-btn` → hairline border + token-driven transition on bg/border/color
- `.split-pane-right` → hairline-left border (via bulk replace)

### Bulk hairline migration

- `1px solid #E5E7EB` → `1px solid var(--hairline-light)` (replaceAll, 17 occurrences)
- `1px solid #ECEFF1` → `1px solid var(--hairline-light)` (replaceAll, 2 occurrences)

## WelcomeModal.vue

- `<ForgeNibMark :size="56" interactive />` (was bare) — interactive hover surfaces through inner SVG class
- `.if-welcome__dialog` → `box-shadow: var(--elev-3)` (was hardcoded `0 24px 90px rgba(15,23,42,0.28)`); border now `var(--hairline-light)`
- `.if-welcome h2` → `font-family: var(--font-serif)` (was Georgia stack) + `font-size: var(--type-step-3)` (was `clamp(28px, 6vw, 44px)`) + `var(--type-weight-emphasis)` + line-height 1.1 + 0.02em letter-spacing
- `.if-welcome__lead` → `font-size: var(--type-step-1)` (14px, was 16px) + line-height 1.6 (was 1.8)
- `.if-welcome__points span` → `var(--hairline-light)` border
- `.if-welcome__path-card` → `var(--hairline-light)` border + `var(--elev-1)`→`var(--elev-2)` hover with `translateY(-1px)` + motion tokens
- `.if-welcome-fade-enter-active/-leave-active` → `var(--motion-slow) var(--ease-out-quart)` (was hardcoded `180ms ease`)
- `:focus-visible` rings → `outline: none; box-shadow: var(--focus-ring)` (Kiln double-ring; was custom blue 3px outline)

## Token Adoption Count

| File | `var(--elev-*` | All PR1 tokens (elev/motion/ease/hairline/focus/type/font) |
|---|---|---|
| `views/HubView.vue` | 8 | 51 |
| `views/WorkstationView.vue` | 1 | 29 |
| `components/help/WelcomeModal.vue` | 2 | 12 |
| `components/chrome/ViewTransition.vue` | 0 | 1 (motion + ease) |
| `App.vue` | 0 | 2 (preserved from PR1) |
| **Total PR2** | **11** | **95** |

## View Transition Wiring

- `<ViewTransition />` mounted in `App.vue` template at the prior `<router-view>` location (verified by grep: `App.vue` has 1 `<ViewTransition` occurrence).
- Import statement at `App.vue` line 33: `import ViewTransition from '@/components/chrome/ViewTransition.vue'`.
- Error boundary still wraps via `v-if="hasError"` / `v-else` gate; ViewTransition lives inside `v-else`. Errored views never enter the transition path.

## Anti-pattern Audit (PR2 modified blocks only)

| Anti-pattern | Status |
|---|---|
| Hard `1px solid #DED7CA` / `#E7E0D2` | 0 in PR2 files (grep) |
| Hard `1px solid #ECEFF1` / `#E5E7EB` | All replaced with `var(--hairline-light)` in HubView (17 swaps) and WorkstationView (19 swaps) |
| Instant (0ms) state changes | All modified blocks use `var(--motion-fast)` or `var(--motion-slow)` tokens |
| Mismatched border-radius | No new radius values introduced |
| Font-weight drift | Only `var(--type-weight-normal)` (400) and `var(--type-weight-emphasis)` (600) used in new declarations |
| Dark mode = luma flip | Dark mode rules in HubView/WorkstationView were NOT modified — they retain their hand-tuned palette + shadow overrides (LIGHTER alpha for dark, per research §4 anti-pattern #7). No regression. |
| Generic accent everywhere | One Accent rule applied: Kiln hover removed from `.icon-btn:hover` (was `border-color: #D32F2F; color: #D32F2F`), `.bento-card:hover` border tint, `.article-card:hover` border tint. Kiln retained on: Forge Nib seal (interactive prop), header-search-bar focus ring (accessibility-critical). |
| Decorative gradient mismatch | No new decorative gradients introduced |
| `outline: none` without replacement | WelcomeModal `:focus-visible` upgraded to `box-shadow: var(--focus-ring)` (was custom blue outline) |
| backdrop-filter without fallback | No new backdrop-filter usage |

## Verification

```
$ pnpm exec vue-tsc --noEmit
(no output)
tsc-exit=0

$ pnpm exec eslint src --ext .ts,.tsx,.vue --quiet
(no output)
eslint-exit=0

$ cd src-tauri && cargo check
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.49s
cargo-exit=0
```

No NEW lint or typecheck warnings. cargo check clean.

## e87f283 + PR1 Regression Check

- **e87f283 drag/buttons (TitleBar.vue)**: 3 `data-tauri-drag-region` (lines 125/133/155) + 3 `data-tauri-drag-region="false"` (lines 188/201/220) — unchanged from PR1 verification. PR2 did not touch `TitleBar.vue`.
- **ForgeNibMark 5-site consistency (e87f283)**: All 5 imports remain — `TitleBar.vue`, `HubView.vue`, `WorkstationView.vue`, `WelcomeModal.vue`, `SettingsView.vue`. 4 of 5 sites now pass `interactive` prop (HubView, WorkstationView, WelcomeModal, TitleBar via PR1). SettingsView intentionally deferred to PR3.
- **IPC handshake (PR1/splash)**: App.vue `await nextTick(); void notifyAppReady()` at lines 224-225 — unchanged. `splash.rs` / `app_ready.rs` not touched.
- **PR1 tokens.css contract**: Not modified. New CSS in PR2 reads tokens via `var(--…)` only; no `:root` mutation.
- **router-view scrollsnap / hash links**: ViewTransition uses `mode="out-in"` + `:key="route.fullPath"` (mirroring the prior router-view setup), so route-internal scroll restoration / scrollIntoView calls behave identically.
- **router metadata**: `transition` keys in `router/index.ts` are now unused but harmless (Vue ignores unknown meta keys). PR3 may strip them with the SettingsView pass; deferred to avoid mixing scopes.

## Open Items for PR3

### Mandatory PR3 scope (per spec)

1. **`SettingsView.vue`** (9006 lines): 12 tabs typography rhythm, hairline-only dividers, hover state, double-ring focus on inputs, ForgeNibMark `interactive` prop on the brand mark there.
2. **Form input components** used across Settings/Hub: `<input>` / `<textarea>` / `<select>` focus ring (consider whether App.vue's global `:focus-visible` is sufficient or component-level upgrades needed).
3. **Buttons globally** (Hub workflow buttons, settings primary CTAs): token-driven hover bg / disabled state. PR2 only touched bento-card / article-card / icon-btn / header-search-bar / WelcomeModal buttons / WorkstationView's split-toolbar-btn.
4. **Dark mode re-tune**: HubView has `html.theme-dark` / `html[data-theme="dark"]` blocks with hand-tuned dark shadows (e.g., `box-shadow: 0 6px 18px rgba(0, 0, 0, 0.32)` at line ~5277). PR3 should migrate these to dark-aware `var(--elev-*)` tokens (already auto-flip via tokens.css `:root[data-theme='dark']` overrides).
5. **`docs/inkforge-brand-identity.md` §16 Dark Mode Contract** closeout.

### Non-blocking PR2 residue (out of surgical scope)

- HubView remaining `cubic-bezier(0.16, 1, 0.3, 1)` (entry `fadeInUp` animations) and `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring-curve card spawn/dismiss animations) at lines 2314, 2766, 3327, 3359, 3507, 3854, 3990, 4200, 4710, 4930 — these are entry/spawn animations, not hover/state transitions. They violate the Restrained Premium lock ("0 spring / 0 bounce / 0 parallax") but rewriting them risks layout reflow on the bento/article spawn cascade, which the spec explicitly forbids. **Recommendation**: PR3 (or follow-up task) should migrate these to `var(--motion-base)` + `var(--ease-out-quart)` simultaneously with the dark-mode pass, since they're paired surfaces.
- WorkstationView panel-resize transitions at lines 3779, 3804, 3822, 4328 use `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard) for width animations. Same reasoning — recommend deferring to PR3 dark-mode + button polish pass.
- §12.4 / §12.6 brand-identity.md backfill (20px seal + 50px controls in TitleBar) — PR1 noted, still pending.
- `router/index.ts` `meta.transition` keys are now dead — defer cleanup to PR3.

Done. Awaiting trellis-check.
