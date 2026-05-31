# Research: Frontend Visual + Interaction Polish Audit (read-only)

- **Query**: Prioritized, actionable punch list of safe visual/interaction refinements for the InkForge frontend (Vue3 + TipTap + Tauri 1.x). No code changes.
- **Scope**: internal (whole presentation/interaction layer)
- **Date**: 2026-05-29
- **Aligned with**: `.trellis/spec/frontend/quality-guidelines.md`

> Convention used below: **"Covered by quality-guidelines?"** — the spec is mostly a *process/behavior* gate (real store/service boundary, no mock storage, no emoji icons, preserve keyboard/accessibility affordances, run lint/tsc/test/build, no new lint errors, no mojibake markers, no page-width overflow). It contains **no explicit visual token/spacing/color rules**, so most items below are "Not directly covered — but constrained by" the relevant clause (accessibility, mojibake, overflow, no-new-lint-errors, build/chunk perf). Those clauses are cited per item.

---

## Design system observations (read this first)

There are **two parallel, overlapping token systems** loaded globally, plus a third ad-hoc layer of hardcoded hex. Converge on the existing tokens; do **not** invent new ones.

### What already exists

| Concern | Token source | Tokens | Notes |
|---|---|---|---|
| Motion duration | `styles/tokens.css:18-22` | `--motion-instant 80ms`, `--motion-fast 120ms`, `--motion-base 180ms`, `--motion-slow 240ms` | "Restrained Premium ladder". Collapsed to 0ms under `prefers-reduced-motion` (`tokens.css:81-88`). |
| Motion duration (legacy) | `styles/design-system.css:47-49` | `--duration-fast 150ms`, `--duration-normal 250ms`, `--duration-slow 400ms` | Older, slower ladder. **Conflicts** with the tokens.css ladder. |
| Easing | `tokens.css:25` / `design-system.css:44-46` | `--ease-out-quart` (canonical) + `--ease-panel`, `--ease-bounce`, `--ease-smooth` | Two easing vocabularies. `--ease-out-quart` is the newer single curve. |
| Elevation | `tokens.css:28-30` / `design-system.css:52-55` | `--elev-1/2/3` (canonical, dark-aware `tokens.css:63-78`) + `--shadow-soft/medium/float/elevated` | Two shadow ladders; only `--elev-*` flips for dark mode. |
| Hairline / border | `tokens.css:33-35` | `--hairline-light`, `--hairline-dark`, `--hairline` | Plus `--border`, `--border-light` in design-system. |
| Focus ring | `tokens.css:38` | `--focus-ring` (Kiln double-ring) | The canonical a11y ring. Used well in Settings/CommandPalette/TitleBar/WelcomeModal; **missing across Workstation + many components**. |
| Type scale | `tokens.css:47-50` | `--type-step-1 14px`, `-2 22px`, `-3 34px`, `-4 56px` | Plus weights `--type-weight-normal 400`, `--type-weight-emphasis 600`. |
| Spacing | `design-system.css:37-41` | `--space-micro 4`, `--space-small 8`, `--space-medium 16`, `--space-large 32`, `--space-macro 64` | 8px grid. **Almost never used in views** — they hardcode px instead. |
| Radius | `design-system.css:58-62` | `--radius-small 4` … `--radius-xlarge 16`, `--radius-round` | Views hardcode 6/7/8/10/12/14/16/18/20/26px ad hoc. |
| Color | `design-system.css:15-35` + theme blocks `607-679` | `--text-primary/secondary/muted`, `--accent-primary`, `--bg-*`, `--border`, semantic `--success/warning/error`, `--color-*` aliases | **Dark mode is keyed off these tokens.** Hardcoded hex bypasses the whole dark contract. |

### Where it's inconsistent (the core problem)

1. **Hardcoded hex dominates the big views.** Raw hex literal counts: `HubView.vue` = **344**, `WorkstationView.vue` = **183**, `FileManager.vue` = **145**. By contrast `SettingsView.vue` (168) uses hex almost entirely as **`var(--token, #fallback)` fallbacks** — the correct pattern. SettingsView is the gold-standard reference file to converge toward.
2. **Dark mode is hand-maintained twice.** Because light styles in HubView/Workstation/FileManager hardcode hex, dark mode is bolted on via huge override blocks: `HubView.vue:5740-5934` (a second full dark palette: `#B5BFCC`, `#8590A0`, `#6E7886`, `#ECEFF4`, `#1A222D`…) and `design-system.css:788-1054` (global `html.theme-dark .xxx` overrides for Workstation/FileManager scoped components). Every new hardcoded light color silently forces another hand-written dark rule. Token usage would eliminate most of this.
3. **Motion durations hardcoded ~everywhere.** 181 inline `transition: …s` declarations across 32 `.vue` files; 98 `transition: all …` across 23 files. The `--motion-*` ladder exists but is used inconsistently (CommandPalette even hardcodes `80ms/60ms` right next to where `--motion-instant` would fit).
4. **`transition: all`** (98 uses) animates layout props (width/transform/border) → potential jank + it silently overrides the motion ladder.
5. **WelcomeModal hardcodes its entire palette** (`#0f172a`, `#475569`, `#64748b`, `#f8fafc`, `#b91c1c`) with **no dark contract at all** — it teleports to `<body>` so the design-system dark overrides don't reach its scoped classes. It uses `--elev-3`/`--motion-*`/`--type-step-3` correctly but not colors.
6. **Scrollbar styling is bespoke per-component** (14 files redefine `::-webkit-scrollbar` with different widths/colors) vs. the global 6px rule in `design-system.css:411-427` + `:1056`.

---

## P0 — high-impact, low-risk

### P0-1. Unify motion durations onto the `--motion-*` ladder in the two big views
- **Files**: `HubView.vue` (27 inline `…s` transitions, e.g. `:2533` `0.15s`, `:2707` `0.18s`, `:3137`/`3422`/`3464` `0.15-0.18s`), `WorkstationView.vue` (`:3659` `all 0.15s`, `:3726` `all 0.2s`, `:4836`-region), CommandPalette `:646/650/659/663` (`80ms/60ms`).
- **Current → proposed**: replace raw `0.15s/0.18s/0.2s/80ms/60ms` with `var(--motion-fast)` (120ms) / `var(--motion-instant)` (80ms) / `var(--motion-base)` (180ms). Keep the easing as `var(--ease-out-quart)`.
- **Why it matters**: single source of truth + automatically inherits `prefers-reduced-motion: reduce → 0ms` (`tokens.css:81-88`). Today hardcoded transitions are NOT collapsed by that media query, only the token-based ones are.
- **Risk**: low (cosmetic timing). Could break the explicit `prefers-reduced-motion` test expectations only if a spec asserts exact ms — none found.
- **Covered by guidelines?** Not directly; supports the reduced-motion intent and "Build Chunk Performance / perf pass" spirit.

### P0-2. Give Workstation chrome a keyboard focus ring
- **File**: `WorkstationView.vue` — only `1` `:focus-visible` exists (`.split-divider` `:3908`) but `4` `outline: none`. The header `.icon-btn` (`:3648`), `.layout-preset-btn` (`:3694`), `.publish-btn` (`:3714`), `.split-toolbar-btn` (`:3953`) have **no focus-visible style**.
- **Current → proposed**: add `&:focus-visible { outline: none; box-shadow: var(--focus-ring); }` to those four controls (pattern already used in SettingsView `:6750`, `:6807`; TitleBar `:522`).
- **Risk**: low. Purely additive; matches existing token. Verify the ring isn't clipped by `overflow: hidden` ancestors (header is not clipped).
- **Covered by guidelines?** **Yes** — "Preserve existing keyboard/accessibility affordances when changing controls." This is currently a gap, not a regression, but directly in scope.

### P0-3. Reconcile the WelcomeModal color palette + add a dark contract
- **File**: `WelcomeModal.vue:189-377` (hardcoded `#0f172a`, `#475569`, `#64748b`, `#f8fafc`, `#334155`, `#b91c1c`; dialog bg is a white gradient `:214-216`).
- **Current → proposed**: map text to `--text-primary`/`--text-secondary`/`--text-muted`, surfaces to `--bg-surface`/`--bg-elevated`, error to `--error`. Since it `<Teleport to="body">` outside scoped dark overrides, it will look near-white in dark mode today — switching to tokens fixes that automatically.
- **Risk**: low-med. It's a first-run modal (FTUE) — visual only, but verify both light + dark render. No logic touched.
- **Covered by guidelines?** Not directly; it's a contrast/consistency fix.

### P0-4. Replace `transition: all` with explicit properties on hover-lift cards/buttons
- **Files**: 98 occurrences / 23 files; highest-value targets are the interactive cards/buttons that also `transform: translateY()` on hover: `design-system.css:247` (`.btn`), `WorkstationView.vue:3659` (`.icon-btn`), `:3726` (`.publish-btn`), `HubView` quick-action/draft items.
- **Current → proposed**: enumerate the props actually animated (`background-color`, `border-color`, `color`, `transform`, `box-shadow`) with `var(--motion-fast) var(--ease-out-quart)`. Pattern already correct in `design-system.css:710-714` (`.card-interactive`) and HubView's newer cards (`:2762`, `:2902`).
- **Risk**: low. Avoids animating layout/paint-heavy props. Double-check nothing relied on `all` to animate a property you'd otherwise omit.
- **Covered by guidelines?** Not directly; supports perf/jank intent.

### P0-5. Collapse the two motion/elevation token ladders to one vocabulary (docs-level decision, low code churn)
- **Files**: `tokens.css` vs `design-system.css:43-55`.
- **Current → proposed**: pick `--motion-*` + `--ease-out-quart` + `--elev-*` (the dark-aware, reduced-motion-aware set) as canonical. Where `--duration-*`/`--shadow-*`/`--ease-panel` are still referenced, alias them in `design-system.css` to the canonical tokens (e.g. `--duration-fast: var(--motion-fast)`) rather than deleting (deletion risks broad breakage). This makes future polish converge without a mass rename.
- **Risk**: low IF done as aliasing (additive). **High** if you delete the legacy tokens outright (they're referenced in many `:hover` rules and `.bento-card` animations). Recommend aliasing only.
- **Covered by guidelines?** Not directly; reduces drift.

---

## P1 — meaningful polish, moderate effort

### P1-1. Tokenize HubView light-mode colors so the hand-written dark block shrinks
- **Files**: `HubView.vue:2275-3700` (light styles hardcode `#263238`/`#607D8B`/`#90A4AE`/`#FFEBEE`/`#FFF5F5`/`#FAD4D8`/`#F5F5F5`/`#E0E0E0`), with the manual dark counterpart at `:5740-5934`.
- **Current → proposed**: replace literals with `--text-primary`/`--text-secondary`/`--text-muted`/`--accent-primary-light`/`--border`. As each light rule becomes token-driven, the matching `html.theme-dark .xxx` override (which re-hardcodes `#B5BFCC` etc.) can be deleted because the token already flips. Do this **incrementally, component-region by region**, re-checking dark mode after each.
- **Risk**: med. Large surface; brand-red gradients (`.card-hero` `:3192`, `.hero-empty-btn`) intentionally use literal red on red and should stay literal. Verify the e2e visual spec (`tests/e2e/specs/visual.spec.cjs`) still passes (it asserts no page-width overflow / no mojibake / clean console, not exact colors — low collision risk).
- **Covered by guidelines?** Not directly; "no new lint errors" + visual-evidence clauses apply.

### P1-2. Same tokenization pass for FileManager (primary left panel)
- **File**: `FileManager.vue` (145 literal hex; 27 inline `…s` transitions; its dark mode is patched globally in `design-system.css:931-999`).
- **Current → proposed**: text/border/hover/active → tokens; durations → `--motion-fast`. Then thin the global FileManager dark overrides.
- **Risk**: med. Active-row uses `--accent-primary` + forced white text (`design-system.css:974-985`); keep that contract. This panel is covered by the **Workstation Source Layout Visual Gate** + **Tag System Quality Gate** (260px width usability) — verify no horizontal scrollbar appears at 240px after edits.
- **Covered by guidelines?** **Yes (adjacent)** — Workstation layout gate requires no horizontal scrollbars at default manager width; don't regress it.

### P1-3. Standardize border-radius onto the radius scale
- **Files**: pervasive — HubView uses 6/8/10/12/14/16/18/20/26px and asymmetric values (`:2772-2775` deliberate "破调" asymmetric corners — keep those intentional ones). Workstation buttons 6/7/8/10px; cards 14/16/18px.
- **Current → proposed**: map to `--radius-small 4` / `--radius-medium 8` / `--radius-large 12` / `--radius-xlarge 16` / `--radius-round`. Keep the deliberate asymmetric "破调" card radii in HubView (they're a design feature, documented in-comment).
- **Risk**: low-med. Mostly cosmetic; verify pill shapes (`999px`) map to `--radius-round` not a fixed px.
- **Covered by guidelines?** No; consistency only.

### P1-4. Unify scrollbar treatment
- **Files**: 14 components redefine `::-webkit-scrollbar` (e.g. `EditorPanel.vue` 15 refs, `ExportModal.vue` 12, `WorkstationView.vue` 15, insights charts). Global rule already exists (`design-system.css:411-427`, thumb color `:1056`).
- **Current → proposed**: consolidate widths (global is 6px) and use `var(--scrollbar-thumb)` (defined light `:616` / dark `:663`) instead of per-file `--border`/literal greys. Remove redundant local rules that just restate the global.
- **Risk**: low. Verify the editor/preview panes that intentionally want a thinner or hidden track (e.g. `HubView .hub-page` hides it `:2296`) keep their intent.
- **Covered by guidelines?** Adjacent — Workstation layout gate warns against "unexpected black scrollbar tracks."

### P1-5. Tokenize Workstation status/semantic pills + header controls
- **File**: `WorkstationView.vue:3605-3711` — `.status-pill.saved/unsaved/error` hardcode `#E8F5E9/#2E7D32`, `#FFF3E0/#F57C00`, `#FFEBEE/#C62828`; `.icon-btn.active`/`.layout-preset-btn` hardcode `#FFEBEE/#D32F2F`.
- **Current → proposed**: use `--success`/`--success-light`, `--warning`/`--warning-light`, `--error`/`--error-light`, `--accent-primary`/`--accent-primary-light` (all dark-aware in design-system theme blocks). Removes the need for dark overrides on these.
- **Risk**: low. Semantic tokens already exist for both themes.
- **Covered by guidelines?** No; consistency/dark-correctness.

### P1-6. Spacing rhythm pass on HubView regions & cards
- **File**: `HubView.vue` — region padding `:2307` `24px 88px 24px 32px`, header margins, card padding `18px 20px`/`22px 24px`/`28px 32px` vary per card without a clear step.
- **Current → proposed**: align internal paddings/gaps to the `--space-*` 8px grid (`design-system.css:37-41`). The bento `gap:14px` (`:2745`) and secondary `gap:20px` (`:2803`) sit off-grid (use 16/20→`--space-medium`/custom). Keep the deliberate hero padding generous.
- **Risk**: low-med. Bento grid is height-constrained (`100vh` scroll-snap regions `:2305`); changing paddings can cause vertical overflow inside a snap region. Verify content still fits at common heights.
- **Covered by guidelines?** No; rhythm/craft.

### P1-7. CommandPalette + modal enter/leave easing onto tokens
- **Files**: `CommandPalette.vue:645-669` (`80ms/60ms ease-out/ease-in`), `WelcomeModal.vue:359-366` (uses `--motion-slow` ✓ — good reference), shared `modal.css` has **no enter/leave transition** (instant pop).
- **Current → proposed**: CommandPalette → `var(--motion-instant)`/`var(--motion-fast)` + `var(--ease-out-quart)`. Consider a subtle fade/scale for `.modal-overlay`/`.modal-container` (`modal.css:7,19`) to match the polish of CommandPalette/WelcomeModal — many modals (Export, Tag, Version, Category) reuse these classes, so one change lifts all.
- **Risk**: low-med. Modals are reused widely; a transition is additive but verify focus-trap timing isn't affected (transitions don't block focus). No logic change.
- **Covered by guidelines?** No; motion consistency.

### P1-8. Add `:focus-visible` to high-traffic overlays/components lacking it
- **Files**: only 14/~62 components define `:focus-visible`. Notably missing on interactive controls in: `ExportModal.vue`, `AIPanel.vue`, `VersionPanel.vue`, `CategoryPanel.vue`, `ArticlePanel.vue`, `TemplatePicker.vue`, `FloatingToolbar.vue`, insights cards.
- **Current → proposed**: add the canonical `box-shadow: var(--focus-ring)` (with `outline: none`) to primary buttons/list items in these. Prioritize keyboard-reachable actions.
- **Risk**: low (additive). Don't add rings to drag handles / non-tabbable elements.
- **Covered by guidelines?** **Yes** — accessibility-affordance clause.

---

## P2 — nice-to-have / higher effort or higher risk

### P2-1. Fix mojibake in WorkstationView CSS comments (encoding hygiene)
- **File**: `WorkstationView.vue:3415-3434+` — 114 corrupted byte sequences (`鈺愨晲…`, `鈹€…`) in `<style>` **comments only** (e.g. section banners). They do not render.
- **Current → proposed**: re-save the affected comment lines as clean UTF-8 / replace with ASCII section headers.
- **Risk**: **med** — editing this 5730-line file risks accidental real-CSS edits; the mojibake is cosmetic (comments). The quality-guidelines mojibake clause targets **rendered** mojibake in the UI (which is NOT present here). Treat as low-priority hygiene; if touched, change ONLY comment lines and run the full Workstation gate (`vue-tsc`, `eslint`, build, route screenshots).
- **Covered by guidelines?** Partially — "no mojibake markers" is a *visible-UI* gate; comment mojibake is out of its strict scope but worth cleaning opportunistically.

### P2-2. Reduced-motion coverage for hub scroll-snap + entrance animations
- **Files**: `HubView.vue` handles it for `.hub-region` (`:2340-2349`) and `design-system.css:526-531` zeroes durations globally; but `fadeInUp`/`scaleIn` keyframe **animations** (`design-system.css:461-515`) rely on the global `animation-duration: 0.01ms` override — verify the staggered `.bento-card` entrance (`:2789-2794`) doesn't flash. Also `scroll-behavior: smooth` (`:2290`) is correctly disabled under reduced-motion (`:2342`).
- **Current → proposed**: audit that every `animation:` (not just `transition:`) is covered; the global rule does cover it via `*` selector, so this is mostly verification. Consider honoring the app's `html[data-reduced-motion="true"]` attr (`design-system.css:1060`) in addition to the media query for the user-toggle path.
- **Risk**: low. Verification-heavy.
- **Covered by guidelines?** No; a11y polish.

### P2-3. Editor split-divider / preview surface tokenization
- **File**: `WorkstationView.vue:3896-3995` — divider gradients hardcode `#E5E7EB`/`#B0BEC5`; preview bg gradient hardcodes `#FAFBFC`/`#F5F7F8`; right pane `#FAFAFA`.
- **Current → proposed**: route through `--border`/`--hairline`/`--bg-rice-paper`/`--bg-surface`. This panel is dark-patched in `design-system.css:1042-1054`; tokenizing reduces that patch.
- **Risk**: **med** — this is the primary editing surface and is governed by the **Workstation Source Layout Visual Gate** (requires real DOM width measurements at ~1440px + 390px, no 50% blank pane, no overflow). Any change here MUST be validated with that gate's browser measurements, not static review.
- **Covered by guidelines?** **Yes** — Workstation Source Layout Visual Gate. Treat as higher-risk.

### P2-4. Typography hierarchy: mixed serif/sans + ad-hoc sizes in HubView
- **Files**: `HubView.vue` hero title hardcodes `'Noto Serif SC'` + `32px` (`:3296-3304`), stats value `92px` (`:3601`), many `10/11/12/13px` micro-labels. The type scale (`--type-step-*`) is only partially used (e.g. `.brand-text h1` `:2428` uses `--type-step-2` ✓).
- **Current → proposed**: pull display sizes toward the `--type-step-*` ladder where sensible (hero ≈ `--type-step-3`/clamp); use `var(--font-serif)` instead of the literal stack; standardize the 10/11px eyebrow labels to one value + `--type-weight-emphasis`. Mind CJK+Latin mixed-script line-height (Settings uses `clamp()` well, `:6849`).
- **Risk**: med. Large hero numerals are deliberately oversized for the editorial look; don't shrink the brand moment. Verify no clipping in the fixed-height bento regions.
- **Covered by guidelines?** No; craft/hierarchy.

### P2-5. Elevation/shadow consistency on hover states
- **Files**: HubView mixes `var(--elev-1/2)` (newer, `:2761/2785`) with literal `box-shadow: 0 4px 12px rgba(211,47,47,…)` (`:2538`) and `0 14px 32px rgba(15,23,42,.16)` (`:2688`); Workstation `.publish-btn` literal red shadow (`:3727`).
- **Current → proposed**: route ambient shadows through `--elev-1/2/3` (dark-aware); keep brand-colored glows (red-tinted) as intentional accents but consider a token (e.g. a `--glow-accent`) if reused >3×.
- **Risk**: low-med. Brand glows are deliberate; only unify the neutral shadows.
- **Covered by guidelines?** No.

### P2-6. Hover transform discipline (avoid sub-pixel jitter)
- **Files**: many `:hover { transform: translateY(-1px|-2px) }` + `scale(1.05)` on `.icon-btn` (`design-system.css:299-303`, `WorkstationView:3665`). Combined with `transition: all` these can jitter text.
- **Current → proposed**: keep translateY lifts (tasteful) but pair with explicit transition props (see P0-4) and avoid `scale()` on text-bearing buttons (scales glyphs → blurry). Prefer background/elevation change over scale for text buttons.
- **Risk**: low. Cosmetic.
- **Covered by guidelines?** No.

---

## Explicitly OUT OF SCOPE / high-risk (do not touch in a visual pass)

- **Any TipTap/ProseMirror editor logic, keymaps, node views, image/table/citation pipelines** — governed by dedicated quality gates (EditorKeymap, TableV2, ImageV2, Citation, SmartPunctuation, BlockDragHandle). Visual-only CSS on `.ProseMirror` rendered output is the *only* safe touch, and even that risks the editor gates' browser-smoke requirements.
- **`ForgeNibMark` logo mark** — handled by another agent (per mission brief). You MAY adjust TitleBar layout/spacing/control interactions only (TitleBar is otherwise already well-tokenized — see `TitleBar.vue:272-582`; it's a good reference, not a fix target).
- **Session restore / tabbar store / layout persistence / custom-css / updater** — logic-bearing; SessionRestore, Workstation TabBar, CustomCSS, TauriUpdater gates apply.
- **Removing legacy tokens** (`--duration-*`, `--shadow-*`, `--ease-panel`) outright — alias instead (P0-5). Deletion is high-risk.
- **`tsconfig.tsbuildinfo`, build config, dependencies** — out of scope.

---

## Suggested execution order (safest-first)

1. P0-2 (Workstation focus rings) + P1-8 (focus rings elsewhere) — additive, pure a11y win, near-zero collision.
2. P0-1 + P0-4 (motion ladder + explicit transitions) — mechanical, reduced-motion benefit.
3. P0-3 (WelcomeModal) — small file, big dark-mode correctness win.
4. P1-5, P1-3, P1-4 (Workstation semantic pills, radius scale, scrollbars) — contained.
5. P1-1, P1-2 (HubView + FileManager tokenization) — incremental, region-by-region, re-verify dark each step.
6. P0-5 (token aliasing) — once usage is more uniform.
7. P2 items as time permits; P2-3 only with the Workstation Source Layout Visual Gate measurements.

## Verification per quality-guidelines (any item touched)

```bash
pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet      # no NEW lint errors
pnpm -C inkforge exec vue-tsc --noEmit
pnpm -C inkforge exec vitest run --reporter=default
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
```
Plus real route smoke (Hub / Workstation desktop + 390px / Settings): clean console, no page-width overflow, no mojibake, no unexpected black scrollbar tracks. The e2e suite (`inkforge/tests/e2e/specs/visual.spec.cjs`, 11 specs) runs the real Tauri binary — a pure CSS pass should not touch its DOM selectors, but re-run it before closing.

## Caveats / Not Found

- I did **not** open every one of the ~62 components; counts (hex/transition/focus-visible) were gathered repo-wide via grep and are accurate as totals, but specific line refs are cited only for the surfaces I read in full (TitleBar, HubView, WorkstationView, SettingsView, WelcomeModal, FileManager head, CommandPalette, modal.css, the four CSS token files). Implementers should re-grep within a target file before editing.
- The e2e visual spec content was not read line-by-line; its assertions are summarized from the quality-guidelines gates (overflow/mojibake/console). Confirm exact assertions before large color changes.
- No external (web) research was needed — this is an internal-only audit against an existing, mature design-token system.
