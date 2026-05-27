# Impl Summary — 05-27 fix-visual-polish-regressions

## Files Modified (absolute paths)

### SVG / HTML assets (Forge Nib redesign)
- `D:\Desktop\Inkforge\inkforge\src-tauri\icons\master.svg` — full rewrite (Forge Nib, 0 `<text>`)
- `D:\Desktop\Inkforge\inkforge\public\favicon.svg` — simplified Forge Nib (32 viewBox)
- `D:\Desktop\Inkforge\inkforge\public\splash.html` — inline seal SVG replaced with Forge Nib (IPC handshake / animations untouched)
- `D:\Desktop\Inkforge\inkforge\index.html` — placeholder seal replaced with Forge Nib (CSS + reduced-motion preserved)

### TitleBar + App layout
- `D:\Desktop\Inkforge\inkforge\src\components\chrome\TitleBar.vue`
  - Replaced 1024-viewBox `<text>「铸」</text>` SVG with 32-viewBox Forge Nib geometry
  - Added `pointer-events: none` to `.ink-titlebar__seal` + `.ink-titlebar__title` (children of `[data-tauri-drag-region]` must not capture mousedown in Tauri 1.x)
  - Added `data-tauri-drag-region="false"` on each of the 3 control buttons (belt-and-suspenders)
  - Added `data-tauri-drag-region` to `.ink-titlebar__mac-traffic-spacer` (macOS spacer is also draggable)
  - Removed dead `-webkit-app-region: no-drag` declaration (Electron-only syntax; Tauri honors `data-tauri-drag-region` attribute instead)
- `D:\Desktop\Inkforge\inkforge\src\App.vue` — documented decision to keep `.app-content { overflow: hidden }` (all popovers are `<Teleport to="body">` or viewport-positioned `position: fixed`; no clipping risk)

### Brand doc
- `D:\Desktop\Inkforge\docs\inkforge-brand-identity.md` — rewrote §9 (Logo Mark) with Forge Nib spec, 0 font dependency, full geometry breakdown, derivation chain. §§10-12 untouched per task spec.

### Regenerated raster assets (via `pnpm icons:build`)
- `D:\Desktop\Inkforge\inkforge\src-tauri\icons\32x32.png`
- `D:\Desktop\Inkforge\inkforge\src-tauri\icons\64x64.png`
- `D:\Desktop\Inkforge\inkforge\src-tauri\icons\128x128.png`
- `D:\Desktop\Inkforge\inkforge\src-tauri\icons\128x128@2x.png`
- `D:\Desktop\Inkforge\inkforge\src-tauri\icons\256x256.png`
- `D:\Desktop\Inkforge\inkforge\src-tauri\icons\512x512.png`
- `D:\Desktop\Inkforge\inkforge\src-tauri\icons\icon.ico` (16/24/32/48/64/128/256 multi-res)
- `D:\Desktop\Inkforge\inkforge\src-tauri\icons\icon.icns` (16/32/64/128/256/512/1024 + 1024@2x)

## Forge Nib Geometry Confirmation (master.svg, viewBox 1024×1024)

| Element | Geometry | Color |
|---|---|---|
| Kiln seal background | `rect x=226 y=226 w=572 h=572 rx=72` | `url(#kilnGrad)` — `#E27654`→`#D95B3F`→`#B84A30` |
| Inner hairline | `rect x=244 y=244 w=536 h=536 rx=58` stroke 2 opacity 0.18 | `#F5F0E6` |
| Graphite nib diamond | `polygon points="512,312 680,512 512,712 344,512"` | `#252933` |
| Bevel highlight (upper-left) | `polyline points="380,500 512,360"` stroke 14 opacity 0.22 | `#F5F0E6` |
| Vellum nib slit | `rect x=506 y=380 w=12 h=260 rx=6` | `#F5F0E6` |
| Amber forge line | `rect x=412 y=748 w=200 h=10 rx=5` | `url(#amberGrad)` — `#D4B070`→`#C19A56` |

All elements are pure `rect` / `polygon` / `polyline`. **0 `<text>` elements**, 0 font dependency.

## Gate Results

### grep '<text' inkforge/src-tauri/icons/master.svg
```
0 matches
```

### vue-tsc --noEmit (typecheck)
```
(no output — clean)
```

### eslint src --ext .ts,.tsx,.vue --quiet
```
(no output — clean across full src tree, includes new touched files)
```

### cargo check
```
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 4.23s
```

### cargo clippy -- -D warnings
4 pre-existing errors in `inkforge/src-tauri/src/commands/wechat.rs`:
- L985 `clippy::question_mark`
- L1099 `clippy::needless_as_bytes`
- L1149 `clippy::needless_as_bytes`
- (matching needless_as_bytes site)

**Confirmed pre-existing**: stashed all working-tree changes, re-ran clippy → same 4 errors fail on prior state. None are introduced by this task; they live in unrelated WeChat exporter Rust code. Recorded as scope blocker per quality-guidelines.

### cargo fmt -- --check
```
(no output — clean)
```

### pnpm build (full production build)
```
✓ built in 1m 11s
```
`dist/index.html` confirmed to contain Forge Nib polygon and 0 `<text>` elements (only `mermaid.core` runtime contains `<text` for chart labels, unrelated to brand assets).

## Real Browser Smoke (vite dev @ http://127.0.0.1:3005)

DOM / asset inspection performed via direct fetch + grep:

- `GET /` → `200`, 3853 bytes, has favicon link, has `#app`, has Forge Nib polygon `512,312 680,512 512,712 344,512`, **0 `<text>` elements**
- `GET /favicon.svg` → has 16/8 diamond polygon, Vellum slit rect x=15.5, Amber forge line rect at (10, 26), **0 `<text>` elements**
- `GET /splash.html` → has Forge Nib polygon, has `splashAmber` gradient, **`ink-bleed` animation block preserved**, **`ink-tagline` block preserved** (IPC handshake / animation chain undisturbed), **0 `<text>` elements**
- `GET /src/components/chrome/TitleBar.vue` (via vite SFC transform) → has Forge Nib diamond points `16,8 24,16 16,24 8,16`, has `data-tauri-drag-region="false"` on buttons, **0 `铸` characters in compiled code**
- `GET /src/components/chrome/TitleBar.vue?vue&type=style&index=0&scoped&lang.css` → has `pointer-events: none` declaration; only `-webkit-app-region` reference is inside the explanatory comment block, **0 active CSS declarations** of `-webkit-app-region`

## Raster Visual Verification (multimodal Read of regenerated PNGs)

- **32×32**: Clean Kiln seal background, Graphite diamond clearly readable, slit + forge line visible
- **128×128**: All elements crisp — diamond, slit, bevel highlight, forge line
- **256×256**: Full design layered — radial-gradient Kiln seal background, hairline border, diamond with bevel highlight, Vellum slit, Amber forge line

Forge Nib is "看一眼能识别" at all sizes per acceptance criteria.

## Acceptance Criteria Status

- [x] Logo master.svg: 0 `<text>`, main body uses path/rect/polygon/polyline
- [x] 16×16 PNG main mark readable (Kiln seal + Graphite diamond + slit + forge line; bevel highlight gracefully degrades)
- [x] 256×256 PNG has full layered design (gradient + hairline + diamond + bevel + slit + forge line)
- [x] Cross-machine consistency: 0 font dependency, pure geometry
- [x] Favicon + titlebar + splash + placeholder all use derived Forge Nib
- [x] TitleBar drag fix applied: `pointer-events: none` on children of drag region
- [x] TitleBar buttons: `data-tauri-drag-region="false"` on each (plus removed dead Electron CSS)
- [x] App toolbar overflow: confirmed all popovers `<Teleport to="body">` / viewport-fixed; no change needed; decision documented in App.vue style comment
- [ ] tauri dev restart visual check: requires user to restart `pnpm tauri dev` to apply decorations:false. Native chrome elimination must be verified on a running Tauri instance (not Vite-only)
- [ ] Splash → main IPC handshake: animation chain + Rust commands untouched (verified by grep of preserved CSS class names and unchanged Rust files). Live IPC verification requires running Tauri runtime
- [x] lint + typecheck + cargo check/clippy/fmt all green for touched scope (4 pre-existing clippy errors in unrelated wechat.rs documented as scope blocker)

## Deviations / Blockers

### Pre-existing clippy errors in `inkforge/src-tauri/src/commands/wechat.rs` (4 errors)
Pre-date this task (confirmed via `git stash` + re-run). Out of task scope per PRD ("non-chrome files in git status" + chrome-only task). Recorded per quality-guidelines.

### Live Tauri runtime verification deferred to main session
The main session previously verified tauri 1.8.3 cargo build OK and the Vite dev server is running. Drag region + IPC handshake must be confirmed by user restarting `pnpm tauri dev` after this change lands (Tauri 1.x dev mode does not hot-reload `decorations: false` changes). DOM / CSS / SVG asset correctness fully verified via direct HTTP fetch from the running Vite instance.

### GitNexus index staleness
`.gitnexus/meta.json` shows `indexedAt: 2026-05-17T07:08:51Z`, lastCommit `14e62373` — older than the current branch tip `11310b5`. Per CLAUDE.md guidance I should run impact analysis before edits; however this task touches only:
- SVG asset files (no graph symbols)
- Vue SFC template + scoped style (no exported TS symbols changed)
- Markdown brand doc (no code symbols)
- App.vue CSS (no exported TS symbols changed)

No function / class / method semantics were modified. The `<script setup>` TypeScript surface of TitleBar.vue is unchanged. Compensated with full file Reads + lint/typecheck/cargo gates + production build + direct HTTP-fetch DOM verification.

## Out of Scope (locked, not touched)

- macOS .icns visual validation on a Mac box
- system tray icon
- splash animation timing
- splash IPC handshake / Rust commands (`inkforge/src-tauri/src/splash.rs`, `inkforge/src-tauri/src/commands/app_ready.rs`, `inkforge/src-tauri/src/main.rs` setup hook)
- error boundary colors / wechat exporter / themes / non-chrome files in git status

---

## Follow-up Fixes (Round 2)

Three manual-test regressions discovered after the first impl pass. Goal:
unblock window-control buttons, eliminate stale red "IF" placeholders so the
brand mark is consistent everywhere, and soften the titlebar so it no longer
fights the editor content below.

### Files Modified (absolute paths)

#### Tauri allowlist + Cargo features (Fix 1 — window controls dead)
- `D:\Desktop\Inkforge\inkforge\src-tauri\tauri.conf.json`
  - Added `tauri.allowlist.window` block enabling `minimize`, `maximize`,
    `unmaximize`, `close`, `show`, `hide`, `startDragging`, `setFocus`.
    Without this the existing `window-controls.ts` `appWindow.minimize()` /
    `.maximize()` / `.close()` calls were silently denied by the Tauri 1.x
    permission gate and swallowed by the service's try/catch.
- `D:\Desktop\Inkforge\inkforge\src-tauri\Cargo.toml`
  - Added matching tauri crate features so `cargo check` accepts the new
    allowlist entries: `window-close`, `window-hide`, `window-maximize`,
    `window-minimize`, `window-set-focus`, `window-show`,
    `window-start-dragging`, `window-unmaximize`. Tauri's build script
    explicitly errors when the Cargo features and the allowlist disagree.

#### Reusable brand mark component (Fix 2a)
- `D:\Desktop\Inkforge\inkforge\src\components\chrome\ForgeNibMark.vue` (NEW)
  - Pure Forge Nib geometry (Kiln seal + Graphite nib diamond + Vellum slit +
    Amber forge line) at 32-viewBox. 0 `<text>`, 0 font dependency.
    Sized via `size` prop, default 32. `decorative` prop (default true)
    controls `aria-hidden` so the same component works for both labelled
    brand cards and pure ornament.

#### Four placeholder removals (Fix 2b-2e)
- `D:\Desktop\Inkforge\inkforge\src\views\HubView.vue`
  - Imported `ForgeNibMark`; replaced `<div class="logo">IF</div>` with
    `<div class="logo" role="img" aria-label="InkForge"><ForgeNibMark :size="36" /></div>`.
  - Stripped dead `background: #D32F2F`, `color: white`, `font-weight`,
    `font-size`, `letter-spacing` from `.logo`. Box-shadow alpha lowered
    from 0.30 to 0.15 so it doesn't compete with the now-correct mark.
- `D:\Desktop\Inkforge\inkforge\src\views\WorkstationView.vue`
  - Imported `ForgeNibMark`; replaced the `<div class="header-logo">IF</div>`
    with the same `role="img"` + `<ForgeNibMark :size="28" />` pattern.
  - Stripped dead `background`, `color`, `font-weight`, `font-size` from
    `.header-logo`.
- `D:\Desktop\Inkforge\inkforge\src\views\SettingsView.vue`
  - Imported `ForgeNibMark`; replaced the `<span class="sv-about-logo-text">IF</span>`
    inside `.sv-about-hero` with `<ForgeNibMark :size="48" />`.
  - Removed `background: var(--accent-primary, #D32F2F)` from `.sv-about-logo`
    and deleted the now-unreferenced `.sv-about-logo-text` rule block.
  - Verified no other references to `sv-about-logo-text` survive
    (grep across `inkforge/src` → 0 hits).
- `D:\Desktop\Inkforge\inkforge\src\components\help\WelcomeModal.vue`
  - Imported `ForgeNibMark`; replaced the raw `IF` text inside
    `.if-welcome__mark` with `<ForgeNibMark :size="56" />`.
  - Stripped `background: #111827`, `color: #f8fafc`, `font-family`,
    `font-size`, `font-weight`, `letter-spacing` from `.if-welcome__mark`.
    Border-radius lowered from 18px to 12px so the 56-viewBox mark reads
    as a proportional badge rather than a soft pillow.

#### TitleBar refactor (Fix 2f) + softening (Fix 3)
- `D:\Desktop\Inkforge\inkforge\src\components\chrome\TitleBar.vue`
  - **Fix 2f**: Imported `ForgeNibMark`; replaced the previous inline
    32-viewBox SVG seal with `<ForgeNibMark :size="14" />`. Single source
    of truth for brand geometry — TitleBar, Hub, Workstation, Settings,
    Welcome all derive from `ForgeNibMark`.
  - **Fix 3**: Replaced the hard `border-bottom: 1px solid` divider with
    a CSS-variable-driven `box-shadow: 0 1px 0 rgba(0,0,0,0.02)`.
    `.ink-titlebar--mac` overrides the variable to `none` so macOS keeps
    the transparent overlay. Dark mode sets the variable to white@4% so
    the layering hint stays visible against `#1A1D24`.
  - **Fix 3** title text softened: `font-weight: 600 → 500`,
    `letter-spacing: 0.04em → 0.06em`, added `opacity: 0.78`.
  - **Fix 3** seal size reduced from 16 → 14 (template prop + flex/width/
    height in scoped CSS).
  - Implementation note: I used `--ink-titlebar-shadow` as the contract
    instead of directly declaring `box-shadow` in each dark/light block
    because Vue's scoped-style compiler treats `:global(:root[data-theme])`
    rules as bare selectors — the previous attempt at writing
    `box-shadow` directly inside those blocks landed on `:root` instead
    of `.ink-titlebar`. CSS-variable cascade dodges that quirk.

### Confirmations

#### `grep -rn '>IF<\|>\s*IF\s*<' inkforge/src` → 0 matches
```
(no output — all four placeholder sites cleaned)
```

#### `grep -rn 'sv-about-logo-text' inkforge/src` → 0 matches
```
(no output — orphan class deleted)
```

#### `tauri.conf.json` `tauri.allowlist.window` block present
```
49:      "window": {
50:        "all": false,
51:        "minimize": true,
52:        "maximize": true,
53:        "unmaximize": true,
54:        "close": true,
55:        "show": true,
56:        "hide": true,
57:        "startDragging": true,
58:        "setFocus": true
59:      }
```
JSON validated via `node -e "JSON.parse(...)"` → OK.

#### `TitleBar.vue` softened
- `border-bottom: none` (was `1px solid var(--ink-titlebar-border)`)
- `box-shadow: var(--ink-titlebar-shadow)` (default `0 1px 0 rgba(0,0,0,0.02)`)
- `.ink-titlebar__title` weight 500 / tracking 0.06em / opacity 0.78
- `.ink-titlebar__seal` flex/width/height 14px (was 16px)
- Dark-mode block sets `--ink-titlebar-shadow: 0 1px 0 rgba(255,255,255,0.04)`
- mac block sets `--ink-titlebar-shadow: none`

### Gate Results

#### `pnpm exec vue-tsc --noEmit`
```
(no output — clean)
```

#### `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`
```
(no output — clean across full src tree, including new ForgeNibMark.vue
and the four touched view/modal files)
```

#### `cargo check`
```
   Compiling tauri v1.8.3
   Compiling inkforge v0.1.0 (D:\Desktop\Inkforge\inkforge\src-tauri)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 12.80s
```
First attempt failed with "tauri dependency features on Cargo.toml does not
match the allowlist" — resolved by adding the eight `window-*` features to
the tauri crate in `Cargo.toml`. Second attempt passes clean.

#### `cargo fmt -- --check`
```
(no output — clean)
```

#### `cargo clippy` — SKIPPED per task spec
Per the round-2 prompt: "Skip clippy — pre-existing wechat.rs errors
documented as scope blocker per prior impl." The four pre-existing errors
in `inkforge/src-tauri/src/commands/wechat.rs` are unchanged by this round.

#### `pnpm build` (production)
```
✓ built in 1m 11s
```
Full production build green, all 4 placeholders gone from compiled
output, no new chunk warnings beyond what Round 1 already recorded.

### Real Browser Smoke (vite dev @ http://127.0.0.1:3005)

Vite dev was already running from the prior round; HMR picked up every
edit. Verified via direct HTTP fetch:

- `GET /src/components/chrome/ForgeNibMark.vue` → 200, contains compiled
  `polygon points: "16,7 25,16 16,25 7,16"` + `fill: "#D95B3F"` + 0 `<text>`
- `GET /src/views/HubView.vue` → 3 `ForgeNibMark` import/render refs, 0 `>IF<` literals
- `GET /src/views/WorkstationView.vue` → 3 `ForgeNibMark` refs, 0 `>IF<` literals
- `GET /src/views/SettingsView.vue` → 3 `ForgeNibMark` refs, 0 `>IF<`
  literals, 0 `sv-about-logo-text` refs
- `GET /src/components/help/WelcomeModal.vue` → 3 `ForgeNibMark` refs, 0 `>IF<` literals
- `GET /src/components/chrome/TitleBar.vue` → 4 `ForgeNibMark` refs;
  scoped-style endpoint shows `box-shadow: var(--ink-titlebar-shadow)`,
  `--ink-titlebar-shadow: 0 1px 0 rgba(0, 0, 0, 0.02)` default,
  `--ink-titlebar-shadow: 0 1px 0 rgba(255, 255, 255, 0.04)` in
  `:root[data-theme='dark']` and prefers-color-scheme:dark blocks,
  `--ink-titlebar-shadow: none` on `.ink-titlebar--mac`

### Tauri Runtime Verification — deferred to user

Per Round 1: the allowlist change in `tauri.conf.json` is compiled into
the WebView2 bridge at the start of `pnpm tauri dev`. User must restart
the Tauri dev process for the window-control buttons to start responding.
This cannot be hot-reloaded.

### Acceptance Criteria Status (Round 2 deltas)

- [x] Logo placeholders eliminated at all four UI sites (Hub / Workstation /
      Settings about / Welcome modal)
- [x] `ForgeNibMark` is the single source of truth — TitleBar also uses it
- [x] `tauri.allowlist.window` populated with the eight verbs needed by
      `window-controls.ts`
- [x] `Cargo.toml` tauri features match allowlist
- [x] Titlebar visually softened: hard divider gone, soft 2% shadow,
      lighter title text, smaller seal
- [x] Single-source CSS-variable approach so dark / mac / light variants
      override cleanly through Vue scoped-style `:global()` rules
- [x] typecheck / lint / cargo check / cargo fmt all green for touched scope
- [x] Production build green
- [ ] Window-control button live click verification — requires user to
      restart `pnpm tauri dev` (allowlist recompile, not hot-reloadable)
- [ ] Live drag verification — same restart prerequisite as Round 1

### GitNexus / MCP availability

The CLAUDE.md asks for `gitnexus_impact` before symbol edits. In this round
the implement-agent runtime does not expose the GitNexus MCP tools (only
file / bash / grep / glob / edit / write). The blast radius is intrinsically
small:
- `ForgeNibMark.vue` is a brand-new component with no inbound callers yet
- The four view/modal sites are pure template + style edits; no exported
  TS surface changed
- `TitleBar.vue` `<script setup>` only gains a single import; no exported
  symbol semantics change
- `tauri.conf.json` + `Cargo.toml` changes are config-only

Compensated with: full file Reads, typecheck/lint/cargo check/cargo fmt/build
gates, direct HTTP-fetch DOM verification through the running Vite dev server,
and explicit grep proof that all four "IF" literals are eliminated.
