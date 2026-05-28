# PR1 — Foundation Tokens + Inkstone Glass Chrome (Impl Summary)

Member: `pr1-impl` of team `inkforge-stunning-polish`.

## Files Modified

NEW:
- `D:\Desktop\Inkforge\inkforge\src\styles\tokens.css`

MODIFIED:
- `D:\Desktop\Inkforge\inkforge\src\App.vue`
- `D:\Desktop\Inkforge\inkforge\src\components\chrome\TitleBar.vue`
- `D:\Desktop\Inkforge\inkforge\src\components\chrome\ForgeNibMark.vue`
- `D:\Desktop\Inkforge\inkforge\public\splash.html`
- `D:\Desktop\Inkforge\docs\inkforge-brand-identity.md`

`inkforge/index.html` — not touched. Placeholder uses inline brand-locked
geometry only, no font/style references contradict the new tokens. The shell
will inherit tokens transparently once Vue mounts.

## tokens.css

Token count: 22 named tokens on `:root` (light) + 4 overrides on
`:root[data-theme='dark']` + 4 mirrored under
`@media (prefers-color-scheme: dark) :root:not([data-theme])` + 4 reduced
under `@media (prefers-reduced-motion: reduce)`.

Groups:
- Motion: `--motion-instant` (80ms), `--motion-fast` (120ms), `--motion-base`
  (180ms), `--motion-slow` (240ms). No `--motion-spring` (Restrained Premium
  lock).
- Easing: `--ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1)`.
- Elevation light: `--elev-1`, `--elev-2`, `--elev-3` (double-shadow stacks).
- Elevation dark: `--elev-1/2/3` override (LIGHTER alpha 0.4/0.5/0.6).
- Hairlines: `--hairline-light`, `--hairline-dark`, cascading `--hairline`.
- Focus ring: `--focus-ring` (Kiln 2px + 4px halo @ 20% alpha).
- Surfaces: `--surface-chrome-light/dark`, `--surface-chrome-fallback-light/dark`.
- Type rhythm: `--type-step-1` (14), `--type-step-2` (22), `--type-step-3`
  (34), `--type-step-4` (56).
- Type weights: `--type-weight-normal` (400), `--type-weight-emphasis` (600).
- Type faces: `--font-serif`, `--font-sans`, `--font-mono`.

## TitleBar.vue — Inkstone Glass Confirmation

- **Height**: `titlebarHeightPx` = 36 on Win/Linux, 28 on macOS.
  `applyRootTitlebarHeight()` writes the value to `--ink-titlebar-height` on
  `:root` exactly as before; consumers (App.vue `.app-content`) get the new
  36 automatically.
- **Background**: solid Vellum hex fallback set on `.ink-titlebar` first.
  Inside `@supports ((backdrop-filter: blur(1px)) or
  (-webkit-backdrop-filter: blur(1px)))`, the non-mac variant upgrades to
  `var(--surface-chrome-light)` plus `backdrop-filter: blur(20px)
  saturate(140%)` and the `-webkit-` prefix per WKWebView contract. macOS
  branch stays transparent (Overlay).
- **Ember gradient**: `.ink-titlebar::after` renders `linear-gradient(90deg,
  transparent, Kiln@0.25, transparent)` 1px tall at the bottom edge.
  Dark-mode block re-tints to `E8734F` Kiln-light. macOS `::after { display:
  none; }` (system traffic light owns that strip).
- **Left-anchor layout**: Win/Linux drag wrapper uses
  `justify-content: flex-start` with `gap: 10px`. Renders seal (20px Forge
  Nib `interactive`) → `InkForge` wordmark (EB Garamond italic, 12px,
  weight 400, opacity 0.72) → separator `·` (Kiln, opacity 0.5) → doc title
  (EB Garamond italic, 14px, weight 400, opacity 0.72, max-width 60vw with
  ellipsis). Separator + title render only when an actual document title
  exists (`hasActiveDocument`). With no doc, the center stays silent — no
  tagline fallback in the Inkstone Glass branch.
- **macOS preserved**: separate drag wrapper variant
  `.ink-titlebar__drag--mac` keeps centered single-string display and 14px
  seal so the 28px inset bar layout is unchanged.
- **Seal**: replaced `<ForgeNibMark :size="14" />` with `:size="20" interactive`
  on PC layout (14 on mac). Wrapper keeps `pointer-events: none` so drag
  region works; the interactive hover triggers through the
  `.ink-titlebar__seal:hover .forge-nib-mark--interactive` `:global` selector
  declared in ForgeNibMark.vue.
- **Controls**: width 46 → 50px. Transitions now use `var(--motion-fast)
  var(--ease-out-quart)` for both `background-color` and `color`. Min/max
  hover keeps `rgba(217,91,63,0.10)`. Close hover keeps full Kiln + white
  icon. `:focus-visible` uses `box-shadow: inset var(--focus-ring)` (inset
  because controls hit the window edge — outer ring would overflow). Close
  button has its own `:focus-visible` selector that keeps the Kiln fill +
  white icon together with the inset Kiln ring.
- **Drag-region invariant (e87f283)**: all 3 drag surfaces carry
  `data-tauri-drag-region`; all 3 control buttons carry
  `data-tauri-drag-region="false"`. Inner spans (`.ink-titlebar__seal`,
  `.ink-titlebar__title`, `.ink-titlebar__wordmark`, `.ink-titlebar__separator`)
  all stay `pointer-events: none`. Verified by grep at lines 125 / 133 / 155
  (drag) and 188 / 201 / 220 (no-drag).

## ForgeNibMark.vue — Interactive Variant

- New `interactive?: boolean` prop (default `false`).
- New `.forge-nib-mark--interactive` class binding on root `<svg>`.
- Transition uses `var(--motion-base) var(--ease-out-quart)` for both
  `transform` and `filter`. Reduced-motion cascade collapses to 0ms via
  tokens.css.
- Hover effect (scale 1.06 + Kiln drop-shadow) triggers on own hover OR
  through `:global(.ink-titlebar__seal:hover) .forge-nib-mark--interactive`
  so the parent `pointer-events: none` wrapper can still surface the effect.
- Type interface updated.

## App.vue

- Added `import './styles/tokens.css'` after the chrome imports.
- Added global non-scoped CSS:
  - `body { font-family: var(--font-sans); font-weight: var(--type-weight-normal); }`
  - `button, a, input, select, textarea, [tabindex]` `:focus-visible` →
    `outline: none; box-shadow: var(--focus-ring); border-radius: 4px;`.
    Scoped to focusable interactive elements to avoid blanketing routine
    text spans.
- All existing logic (CustomCSS runtime, dev panel keychord, command
  palette, IPC handshake) untouched.

## splash.html

- Added inline `--motion-base: 180ms;`, `--motion-slow: 240ms;`,
  `--ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1);` to `:root`. Comment
  notes that splash mirrors values manually because it loads before Vue.
- Replaced all four `cubic-bezier(0.16, 1, 0.3, 1)` references in the seal
  drop / wordmark rise animations with `var(--ease-out-quart)`. IPC
  handshake + animation chain (drop → squish → bleed → wordmark → tagline)
  preserved structurally.
- No new content. `@media (prefers-reduced-motion: reduce)` block already
  hard-resets animations; it stays unchanged.

## docs/inkforge-brand-identity.md

Appended sections:
- §13 Motion Tokens — 5 subsections (design intent, ladder, usage rules,
  reduced motion, example).
- §14 Elevation Ladder — 7 subsections (intent, light, dark with anti-
  pattern #7 callout, hairlines, focus ring, surface translucency, example).
- §15 Typography Rhythm — 6 subsections (intent, vertical scale, weight
  ladder, font faces, usage rules, example).

Version footer bumped 1.0 → 1.1.

## Verification

```
$ pnpm exec vue-tsc --noEmit
(no output)
tsc-exit=0

$ pnpm exec eslint src/App.vue src/components/chrome/TitleBar.vue src/components/chrome/ForgeNibMark.vue --quiet
(no output)
eslint-exit=0

$ cargo check (cd inkforge/src-tauri)
    Checking inkforge v0.1.0 (D:\Desktop\Inkforge\inkforge\src-tauri)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 3.77s
```

No new lint or typecheck warnings. Cargo check clean (no new clippy warnings).
The 4 pre-existing `wechat.rs` clippy errors mentioned in the spec are not
emitted by `cargo check` and remain documented as out-of-scope.

## e87f283 Regression Check

- **Drag region**: 3 `data-tauri-drag-region` attributes on the drag surfaces
  (mac traffic spacer, mac drag wrapper, pc drag wrapper) match the e87f283
  contract.
- **Buttons opt-out**: 3 `data-tauri-drag-region="false"` attributes on the
  min/max/close buttons. Click handlers (`handleMinimize`,
  `handleToggleMaximize`, `handleClose`) untouched.
- **ForgeNibMark imports**: 5 component-side imports remain wired —
  `TitleBar.vue`, `WelcomeModal.vue`, `SettingsView.vue`,
  `WorkstationView.vue`, `HubView.vue`. The 6th hit is `ForgeNibMark.vue`
  itself.
- **Pointer-events**: seal/title/wordmark/separator spans all keep
  `pointer-events: none`, preserving the parent drag surface contract.
- **IPC handshake (splash)**: animation chain unchanged; only the easing
  reference was tokenised. `inject_splash_theme` / `app_ready` /
  `close_splash_and_show_main` not touched.

## Notes for PR2 / PR3

- macOS branch in TitleBar kept the original centered display title (single
  string with tagline fallback) instead of the Inkstone Glass strip. The
  brand spec §12.2 macOS table calls out a centered seal + doc title, which
  the prior code already implemented; PR2 may choose to extend macOS to a
  centered seal + wordmark + doc trio if the design holds up against the
  traffic-light spacer (out of PR1 scope).
- `--motion-spring` was NOT added per the Restrained Premium lock. If a
  future celebratory moment ever needs it (save success, splash → main),
  add it behind a feature flag as documented in §13.3.
- `--hairline` is exposed as the active hairline variable but no consumer
  uses it yet. PR2/PR3 should migrate hard `1px solid #DED7CA` borders to
  `1px solid var(--hairline)` wherever the hairline reads as panel-edge
  (not as intentional Settings/figure divider).
- The global `:focus-visible` selector scopes to focusable interactive
  elements only. If PR2/PR3 introduces new `role="button"` divs or custom
  `[tabindex]` rows, they already pick up the ring automatically — no
  per-component opt-in needed.

## Open Items

- None blocking. Index `index.html` placeholder was intentionally skipped
  (no contradictions); if PR2/PR3 wants to align placeholder caption font
  to `var(--font-sans)` once tokens.css is reachable from index, that is a
  trivial polish.

Done. Awaiting trellis-check.
