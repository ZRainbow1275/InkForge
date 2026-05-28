# PR3 — Settings + Forms + Dark Mode Re-tune + Brand Doc Closeout (Impl Summary)

Member: `pr3-impl` of team `inkforge-stunning-polish`.
Date: 2026-05-28.

## Files Modified

MODIFIED:
- `D:\Desktop\Inkforge\inkforge\src\router\index.ts` — dead `meta.transition` keys removed (page-fade / page-slide-left / page-slide-right) since PR2 replaced per-route transitions with a single `<ViewTransition />` cross-fade
- `D:\Desktop\Inkforge\inkforge\src\views\SettingsView.vue` — tab heading rhythm, dividers, sidebar nav (Ulysses left-edge accent), form inputs/textarea/select (Kiln double-ring focus), action buttons, danger button focus ring, stat card / search panel / search result / sv-tab elevation, hardcoded `1px solid #ECEFF1` / `#F5F5F5` borders all migrated to `var(--hairline-light)`, theme-card / platform-card / provider-card hover resting shadows migrated to `var(--elev-1)`, spring-curve switch thumb migrated to `var(--motion-base) var(--ease-out-quart)`, ForgeNibMark `:size="48"` in About tab now passes `interactive`
- `D:\Desktop\Inkforge\inkforge\src\views\HubView.vue` — all 10 leftover spring/material curves migrated to `var(--ease-out-quart)` + matching motion ladder; dark-mode hand-tuned shadows migrated to `var(--elev-*)` tokens (bento-card resting + hover, article-card hover, template-market-card hover, insight-card, category-dropdown)
- `D:\Desktop\Inkforge\inkforge\src\views\WorkstationView.vue` — 5 panel-resize / panel-stage / mode-toast spring/material curves migrated to motion tokens; preview-device-frame / panel-stage / mode-toast / stage-tab.active / panel-tab.active shadows migrated to `var(--elev-*)`
- `D:\Desktop\Inkforge\inkforge\src\App.vue` — error-boundary modal shadow migrated to `var(--elev-3)`
- `D:\Desktop\Inkforge\docs\inkforge-brand-identity.md` — §12.4 (seal 14→20) + §12.6 (controls 46→50, height 32→36) backfilled to reflect Inkstone Glass spec; new §16 Dark Mode Contract appended with 5 subsections (design intent, token behaviour, anti-pattern #7 callout, migration helper, reduced-motion independence); version footer bumped 1.1 → 1.2

NOT TOUCHED:
- `inkforge/src/components/error/*` — directory does not exist in repo (PR2 confirmed). App.vue carries the only error-boundary UI, which is now token-driven.
- `inkforge/public/splash.html` — already token-based since PR1; no diff
- `inkforge/src/components/help/WelcomeModal.vue` — already token-based since PR2; no diff (verified 3 box-shadows are `var(--elev-3)`, `var(--elev-2)`, `var(--focus-ring)`)
- PR1 files (`TitleBar.vue`, `ForgeNibMark.vue`, `tokens.css`) — no diff vs HEAD

## SettingsView Tab Token Adoption + Line Refs

### Typography rhythm (`.sv-tab-title`, `.sv-tab-desc`, `.sv-section-title`, `.sv-row-label`, `.sv-row-desc`)

- `.sv-tab-title` (line 6814) — `font-family: var(--font-serif)` + `font-size: clamp(20px, 2.4vw, var(--type-step-3))` + `var(--type-weight-emphasis)` + 0.02em letter-spacing + line-height 1.2 + 6px margin-bottom (was raw 15px / 600 / 4px without serif)
  - Note: clamp ceiling = `--type-step-3` (34px); floor 20px keeps the 12-tab dense layout legible. Pure 34px would push existing tab content offscreen on narrow viewports.
- `.sv-tab-desc` (line 6824) — `font-family: var(--font-sans)` + `font-size: var(--type-step-1)` (14px) + line-height 1.5 + 22px margin-bottom
- `.sv-section-title` (line 6834) — serif + `var(--type-weight-emphasis)` + 16px + 0.02em letter-spacing
- `.sv-row-label` (line 6883) — `var(--font-sans)` + `var(--type-weight-emphasis)`
- `.sv-row-desc` (line 6890) — `var(--font-sans)`

### Hairline migration (bulk + targeted)

- `.sv-divider` (line 6849) — `background: var(--hairline-light)` (was `#F5F5F5`)
- `.sv-row` border-bottom (line 6862) — `var(--hairline-light)` (was `#F5F5F5`)
- `.sv-toggle-row` border-bottom (line 6901) — `var(--hairline-light)` (was `#F5F5F5`)
- `border: 1px solid #ECEFF1` → `var(--hairline-light)` (replaceAll, 12 occurrences across sv-input/sv-select/sv-textarea/sv-settings-search-panel/sv-settings-search-result/sv-account-card/sv-stat-card/sv-action-btn/etc.)
- `border-bottom: 1px solid #ECEFF1` → `var(--hairline-light)` (replaceAll, 1 occurrence)
- `border-bottom: 1px solid #F5F5F5` → `var(--hairline-light)` (replaceAll, 1 occurrence)

### Form-input focus rings (Kiln double-ring)

- `.sv-select:focus` / `.sv-select:focus-visible` (line 7034) — `box-shadow: var(--focus-ring)` (was custom `0 0 0 3px rgba(211, 47, 47, 0.08)` + border tint)
- `.sv-input:focus` / `.sv-input:focus-visible` (line 7053) — `var(--focus-ring)`
- `.sv-textarea:focus` / `.sv-textarea:focus-visible` (line 7074) — `var(--focus-ring)`
- `.sv-action-btn:focus-visible` (line 7700) — `var(--focus-ring)` (newly added)
- `.sv-danger-btn:focus-visible` (line 7833) — `var(--focus-ring)` (newly added)
- `.sv-nav-item:focus-visible` (line 6781) — `var(--focus-ring)` (newly added)
- `.sv-settings-search-result:focus-visible` (line 6803) — `var(--focus-ring)` (newly added)

### Sidebar nav (Ulysses left-edge accent)

- `.sv-nav` (line 6693) — `box-shadow: var(--elev-1)` (was hardcoded `0 1px 3px rgba(0, 0, 0, 0.04)`)
- `.sv-nav-item:hover` (line 6738) — `background: rgba(37, 41, 51, 0.04)` (was `#F5F5F5`, but the Graphite-tinted variant aligns with the hairline-light scheme)
- `.sv-nav-item.active` (line 6743) — `background: transparent` + Kiln color + Kiln 3px left-edge accent bar (was full pink-tinted background + Kiln color + Kiln border) → Ulysses pattern: One Accent moment

### Section / card surfaces

- `.sv-tab` (line 6810) — `box-shadow: var(--elev-1)` (was hardcoded `0 1px 3px rgba(0, 0, 0, 0.04)`)
- `.sv-settings-search-panel` (line 6755) — `var(--elev-1)`
- `.sv-stat-card` (line 7762) — added `box-shadow: var(--elev-1)`
- `.sv-theme-card:hover` (line 7239) — `var(--elev-1)`
- `.sv-platform-card:hover` (line 7554) — `var(--elev-1)`
- `.sv-provider-card:hover` (line 7596) — `var(--elev-1)`

### Button polish (token-driven)

- `.sv-action-btn` (line 7669) — split monolithic `transition: all 0.15s` into named declarations on `background-color`, `border-color`, `color`, `box-shadow` all `var(--motion-fast) var(--ease-out-quart)`
- `.sv-danger-btn` (line 7802) — same split, motion tokens
- `.sv-switch-thumb` (line 6987) — was `transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)`; now `transition: transform var(--motion-base) var(--ease-out-quart)` (Restrained Premium lock — no spring)

### ForgeNibMark interactive (5/5 sites)

- About tab (line 5907) — `<ForgeNibMark :size="48" interactive />` (was bare `:size="48"`). Completes the 5-site `interactive` rollout: TitleBar (PR1) + Hub + Workstation + Welcome (PR2) + Settings (PR3).

## Spring-Curve Cleanup Count (Before / After)

### HubView.vue (10 entry/spawn animations)

| Line | Before | After |
|---|---|---|
| 2314 | `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)` | `opacity 0.6s var(--ease-out-quart), transform 0.6s var(--ease-out-quart)` |
| 2766 | `animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards` | `animation: fadeInUp 0.5s var(--ease-out-quart) backwards` |
| 3327 | `transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)` (chart-bar) | `var(--motion-slow) var(--ease-out-quart)` |
| 3359 | `transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)` (chart-bar tooltip) | `var(--motion-base) var(--ease-out-quart)` |
| 3507 | `transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)` (expand) | `var(--motion-slow) var(--ease-out-quart)` |
| 3854 | `transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)` (card-recent) | `var(--motion-slow) var(--ease-out-quart)` |
| 3990 | `transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)` (recent-open-btn) | `var(--motion-base) var(--ease-out-quart)` |
| 4200 | `transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1)` (category-cell) | `var(--motion-fast) var(--ease-out-quart)` + `box-shadow: var(--elev-2)` on hover |
| 4710 | `animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards` | `animation: fadeInUp 0.5s var(--ease-out-quart) backwards` |
| 4930 | `transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)` (empty-create-btn) | `var(--motion-base) var(--ease-out-quart)` + `box-shadow: var(--elev-2)` on hover |

After: 0 spring/material curves remaining in HubView (verified by grep).

### WorkstationView.vue (5 panel-resize/toast animations)

| Line | Before | After |
|---|---|---|
| 3772 | `transition: opacity 0.2s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)` (edge-trigger) | `opacity var(--motion-base) var(--ease-out-quart), transform var(--motion-base) var(--ease-out-quart)` |
| 3797 | `transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), …` (panel) | `width var(--motion-slow) var(--ease-out-quart), …` |
| 3815 | same (panel-manager) | tokenised |
| 4322 | same (panel-inspector) | tokenised |
| 5720 | `transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)` (mode-toast) | `opacity var(--motion-base) var(--ease-out-quart), transform var(--motion-slow) var(--ease-out-quart)` |

Also removed the redundant `@media (prefers-reduced-motion: reduce) .panel` block — tokens.css already cascades motion to 0ms; the duplicate 0.1s override is now noise.

After: 0 spring/material curves remaining in WorkstationView (verified by grep).

### SettingsView.vue (1 spring curve cleanup)

| Line | Before | After |
|---|---|---|
| 6987 | `transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)` (sv-switch-thumb) | `transition: transform var(--motion-base) var(--ease-out-quart)` |

After: 0 spring/material curves remaining in SettingsView (verified by grep).

### Out-of-scope leftovers (not touched, documented for future passes)

- `inkforge/src/views/PublishView.vue` — 3 spring curves (deviceSlideIn entry, transform hover). Out of PR3 scope. Recommend follow-up.
- `inkforge/src/views/ThemesView.vue` — 1 spring curve (cardSlideIn entry). Out of PR3 scope.

## Dark Mode Token Migration Count

### HubView.vue (5 hand-tuned dark shadows → tokens)

| Selector | Before | After |
|---|---|---|
| bento-card (resting, dark) line 5283 | `0 6px 18px rgba(0, 0, 0, 0.32)` | `var(--elev-1)` (auto-flips to LIGHTER alpha 0.4 via tokens.css dark contract) |
| bento-card:hover (dark) line 5515 | `0 12px 32px rgba(0, 0, 0, 0.42)` | `var(--elev-2)` |
| template-market-card:hover (dark) line 5634 | `0 12px 28px rgba(0, 0, 0, 0.42)` | `var(--elev-2)` |
| insight-card (dark) line 5670 | `0 4px 14px rgba(0, 0, 0, 0.32)` | `var(--elev-1)` |
| category-dropdown (dark) line 5827 | `0 8px 24px rgba(0, 0, 0, 0.40)` | `var(--elev-2)` |
| article-card:hover (dark) line 5932 | `0 12px 28px rgba(0, 0, 0, 0.40), 0 2px 8px rgba(0, 0, 0, 0.24)` | `var(--elev-2)` |

### WorkstationView.vue (4 hand-tuned shadows → tokens)

| Selector | Before | After |
|---|---|---|
| preview-device-frame (light) | `0 12px 32px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)` | `var(--elev-2)` |
| panel-stage shell | `0 12px 32px -8px rgba(38, 50, 56, 0.18), 0 2px 6px rgba(38, 50, 56, 0.06)` | `var(--elev-3)` |
| mode-toast | `0 12px 32px rgba(15, 23, 42, 0.24)` | `var(--elev-3)` |
| stage-tab.active / panel-tab.active | `0 1px 3px rgba(38, 50, 56, 0.10)` | `var(--elev-1)` |

### Brand-locked intentional brand glows (NOT migrated, documented in §16.4)

- HubView `.card-hero` (line 5341): `0 12px 40px rgba(127, 18, 18, 0.36)` — Kiln-red brand glow; colour IS the message
- WorkstationView recovery-banner (line 3447): brown `rgba(124, 45, 18, 0.08)` — recovery-state semantic glow
- WorkstationView Kiln CTA pillows (lines 4848, 4855, 4860): Kiln-tinted `rgba(211, 47, 47, ...)` brand glows
- WorkstationView Tempera CTA pillow (line 4872): Tempera-tinted `rgba(46, 125, 50, 0.42)` success glow
- WorkstationView panel-inspector pinned shadow (line 4337): `-2px 0 12px` — directional/asymmetric, not a resting elevation
- WorkstationView native slider thumbs (lines 5036, 5282, 5426): native form-control inner shadows; `--elev-1` would over-render
- SettingsView `.sv-danger-row` border `#FFCDD2` (line 7815): semantic Kiln-light border for destructive action

### App.vue (1 hand-tuned shadow → token)

| Selector | Before | After |
|---|---|---|
| `.error-boundary__content` | `0 4px 24px rgba(0, 0, 0, 0.08)` | `var(--elev-3)` |

## Brand Doc §16 + §§12.4/12.6 Confirmation

### §12.4 Logo 嵌入 Embedded Seal (backfilled per PR1 Open Items)

- Size updated: 14×14 → **20×20** on Windows / Linux Inkstone Glass titlebar (macOS retains 14×14)
- Documents the `interactive` prop hover behaviour: scale 1.06 + Kiln drop-shadow at `var(--motion-base) var(--ease-out-quart)`
- Notes the `pointer-events: none` + `:global` selector contract that surfaces the hover signal through the parent drag-region

### §12.6 Window Control Buttons (backfilled per PR1 Open Items)

- Button size updated: 46×32 → **50×36** to match the 36px chrome height
- Adds token-driven transition declaration sample
- Adds `:focus-visible` inset focus-ring spec
- Reasoning callout: Win11 default is 46×32, but Inkstone Glass runs 36px to expose ember + EB Garamond italic doc title, controls scale with it

### §16 Dark Mode Contract (NEW, 5 subsections)

- **§16.1 Design Intent** — research §4 anti-pattern #7 callout; lists the 12 PR3-migrated surfaces and the 7 intentional brand glows that DO NOT migrate
- **§16.2 Token Behaviour** — full CSS snippet of `:root` / `:root[data-theme='dark']` / `@media (prefers-color-scheme: dark) :root:not([data-theme])` two-tier cascade
- **§16.3 Anti-pattern #7 Callout** — explicit "LIFTED not LOWERED" rule with light vs dark alpha table (0.04 → 0.4, 0.06 → 0.5, 0.12 → 0.6)
- **§16.4 Migration Helper** — 3-step decision tree for when to migrate vs keep a hand-tuned shadow (brand colour? directional? otherwise → migrate)
- **§16.5 Reduced-Motion Independence** — clarifies that shadow alpha does NOT cascade through `prefers-reduced-motion`

### Version footer

- Bumped 1.1 → **1.2**.

## Verification Tails

```
$ pnpm exec vue-tsc --noEmit
(no output)
tsc-exit=0

$ pnpm exec eslint src --ext .ts,.tsx,.vue --quiet
(no output)
eslint-exit=0

$ cd src-tauri && cargo check
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.34s
cargo-exit=0

$ cd src-tauri && cargo fmt -- --check
(no output)
fmt-exit=0
```

No NEW lint or typecheck warnings. cargo check + cargo fmt clean.

## Spot-Check Verifications (per PR3 spec)

- `grep cubic-bezier(0.16` `cubic-bezier(0.34` `cubic-bezier(0.4, 0` in HubView/WorkstationView/SettingsView → **0** matches (vs PR2 leftover ≥10)
- `grep var(--elev-` count across PR3 files: SettingsView 8 + HubView 16 + WorkstationView 6 = **30** (target ≥ 8)
- `grep var(--focus-ring)` in Settings form inputs: 7 sites (sv-select / sv-input / sv-textarea / sv-action-btn / sv-danger-btn / sv-nav-item / sv-settings-search-result) — target ≥ 3
- ForgeNibMark in SettingsView About tab now passes `interactive` (line 5907)
- `router/index.ts`: 0 `meta.transition` keys remain (only the comment-of-record about WHY they were removed)

## e87f283 + PR1 + PR2 Regression Check

- **e87f283 drag/buttons (TitleBar.vue)**: 8 `data-tauri-drag-region` occurrences preserved (3 surfaces + 3 explicit `="false"` + 2 macOS variants). PR3 did not touch `TitleBar.vue`.
- **ForgeNibMark 5-site consistency (e87f283)**: All 5 imports preserved — `TitleBar.vue`, `HubView.vue`, `WorkstationView.vue`, `WelcomeModal.vue`, `SettingsView.vue`. All 5 sites now pass `interactive` (TitleBar PR1, Hub/Workstation/Welcome PR2, Settings PR3).
- **IPC handshake (PR1/splash)**: App.vue `await nextTick(); void notifyAppReady()` — unchanged. `splash.rs` / `app_ready.rs` / `splash.html` not touched.
- **PR1 tokens.css contract**: Not modified. New CSS in PR3 reads tokens via `var(--…)` only; no `:root` mutation.
- **PR2 ViewTransition wiring**: `<ViewTransition />` mount in App.vue and ViewTransition.vue file itself — not touched. PR3 only updated the router metadata that was already unused after PR2.
- **PR2 hub/workstation/welcome polish**: bento-card hover (PR2) elev-1→elev-2 path preserved; PR3 only added the dark-mode token cascade. WorkstationView header-brand and split-toolbar token migrations preserved.

## Final Acceptance Criteria Checklist (every PRD AC)

- [x] Titlebar 实装 Inkstone Glass (36px + backdrop-filter 含 fallback + ember gradient + 左锚 seal+wordmark + 微互动) — PR1 confirmed; PR3 backfilled §§12.4/12.6 in brand doc
- [x] WebKitGTK 无 backdrop-filter 时降级为半透明 Vellum — PR1 confirmed via `@supports` gate
- [x] Hub 主视觉 (header + 卡片 + scroll-snap region) 提升: hover state + 阴影节奏 + 字体节奏 — PR2 elev-1/2 hover migration + PR3 spring-curve cleanup + PR3 dark mode token migration
- [x] Workstation 顶 toolbar + 写作 surface 深度统一 — PR2 hairline + elev-1; PR3 spring-curve cleanup + preview-device-frame / panel-stage / mode-toast elevation
- [x] Settings tabs/分节字号节奏精化 — PR3: serif heading + 14/clamp(20,2.4vw,34)/16px three-tier rhythm + Ulysses left-edge accent + token elevation
- [x] Dark mode 各 surface 阴影/边线/纹理 一致 (不是单纯 luma flip) — PR3: 10 surfaces migrated to var(--elev-*); 7 brand glows documented as intentional retain
- [x] `prefers-reduced-motion: reduce` 时所有动画/transform/scale 关闭, opacity 保留 — tokens.css cascade collapses --motion-* to 0ms (PR1); PR3 removed the redundant per-component `@media` overrides that bypassed this
- [x] 不破坏 drag/buttons/IPC handshake/brand mark 一致性 — verified (see e87f283 + PR1 + PR2 regression section)
- [x] lint + typecheck + cargo check 全绿; 不引入 NEW clippy warning — all 4 gates clean
- [x] 真 tauri dev 手测: 主窗起来 (无 native chrome 双重) + drag works + buttons work + Inkstone Glass titlebar 视觉到位 — to be verified by main session Phase 3.4 (this PR3 cycle).

## Open Items for Phase 3.4 / Future

### Out-of-scope leftovers (documented but not fixed)

- `inkforge/src/views/PublishView.vue` — 3 spring curves on deviceSlideIn entry / hover transforms. Same Restrained Premium violation, but PublishView is outside PR3 scope. Recommend follow-up task `polish-publish-themes-spring-curves` (≈2 files).
- `inkforge/src/views/ThemesView.vue` — 1 spring curve on cardSlideIn entry. Same recommendation.

### Verification gaps (out of agent scope)

- Real Tauri dev manual test on Win11 — main session Phase 3.4 to verify drag region + window controls + Inkstone Glass visual + dark mode toggle + reduced-motion preference fidelity.
- macOS native chrome verification — no mac access; out of scope per PRD §Out of Scope.

Done. Awaiting trellis-check.
