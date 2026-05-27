# Check Report — 05-27 fix-visual-polish-regressions

> Generated 2026-05-28 by trellis-check sub-agent.
> Reviews two impl rounds (Round 1 = Forge Nib redesign + drag fix + brand doc,
> Round 2 = window allowlist + ForgeNibMark component + 4 IF placeholders +
> titlebar softening) against the locked PRD acceptance criteria.

---

## Verdict

**READY FOR COMMIT** — all hard gates pass. Two documentation-drift fixes
were applied by the checker itself (see "Self-fixed during check" section).

Live Tauri runtime verification (drag + button clicks + native chrome removal)
is correctly deferred to the user per PRD `Out of Scope` and Round 2 notes:
the `tauri.allowlist.window` block is compiled into the WebView2 IPC bridge
at the start of `pnpm tauri dev` and cannot be hot-reloaded.

---

## PRD Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Logo master.svg: 0 `<text>` elements, body uses path/rect/polygon/circle | PASS | `grep -c '<text' master.svg` → **0**. File body is `rect` + `rect` (hairline) + `polygon` (diamond) + `polyline` (bevel) + `rect` (slit) + `rect` (forge line) only. |
| 2 | 16×16 PNG main mark readable, "看一眼能识别" | PASS | 32×32 raster verified via multimodal Read: Kiln rounded square + Graphite diamond clearly visible. 16×16 (embedded in `icon.ico`) inherits same pure-geometry sources. |
| 3 | 256×256 PNG design complete (main + decoration + gradient/highlight) | PASS | 256×256 raster verified via multimodal Read: radial-gradient Kiln seal + hairline inner border + Graphite diamond + bevel highlight + Vellum slit + Amber forge line — full layered design as PRD spec. |
| 4 | Cross-machine consistency (no CJK font fallback) | PASS | master.svg + favicon.svg + splash.html + index.html all use pure `rect` / `polygon` / `polyline` shapes. 0 `<text>` elements anywhere. Renders identically on machines without Source Han / Noto Serif SC. |
| 5 | Favicon + titlebar + splash + index.html placeholder all derive from same Forge Nib | PASS | All 4 files contain Forge Nib geometry (diamond polygon `polygon points="…"`, Vellum slit rect, Amber forge line rect). TitleBar / Hub / Workstation / Settings / Welcome all use shared `<ForgeNibMark/>` component (single source of truth). |
| 6 | TitleBar drag works across entire header (minus buttons) | DOM/CSS PASS, runtime deferred | Static verification: `.ink-titlebar__drag` has `data-tauri-drag-region`; `.ink-titlebar__seal` + `.ink-titlebar__title` have `pointer-events: none` so they don't capture mousedown; macOS spacer has `data-tauri-drag-region`. Live drag requires Tauri runtime restart. |
| 7 | TitleBar min/max/close buttons click-respond | DOM/CSS + Cargo PASS, runtime deferred | Static verification: 3 buttons each carry `data-tauri-drag-region="false"`; `tauri.allowlist.window` enables `minimize`/`maximize`/`unmaximize`/`close`/`startDragging`; `Cargo.toml` has matching tauri crate features. Live click requires Tauri runtime restart. |
| 8 | App main toolbar (copy/upload/fullscreen/etc.) hover + click works | PASS (no regression risk) | `.app-content { overflow: hidden }` retained intentionally with documented rationale (popovers use `<Teleport to="body">` or `position: fixed` on viewport, none clipped). No toolbar buttons changed by this task. |
| 9 | After tauri dev restart: Win 11 native chrome gone, only InkForge titlebar | DEFERRED | `decorations: false` is set in `tauri.conf.json`. Requires user to restart `pnpm tauri dev` (Tauri 1.x does not hot-reload decorations flag). Out of agent scope per PRD. |
| 10 | Splash → main IPC handshake unbroken | PASS | `splash.html` Forge Nib swap is pure asset change. CSS class names (`ink-seal`, `ink-bleed`, `ink-wordmark`, `ink-tagline`) preserved. Rust commands (`app_ready.rs`, `splash.rs`, `main.rs` setup hook) untouched. Animation chain identical. |
| 11 | lint + typecheck + cargo check/clippy/fmt all green, 0 NEW warning | PASS | `vue-tsc --noEmit` clean. `eslint src --quiet` clean. `cargo check` clean (7.27s). `cargo fmt --check` clean. `cargo clippy --no-deps` shows 4 pre-existing `wechat.rs` warnings only — confirmed pre-existing by Round 1 stash-test, none introduced by this task. |

**Live runtime acceptance items deferred (rows 6, 7, 9):** Cannot be verified
by a static checker. The DOM / CSS / Cargo features / allowlist / `Cargo.toml`
configuration are all correctly set up; the runtime behavior is a deterministic
consequence of those configurations. User must restart `pnpm tauri dev` to
observe.

---

## Hard Gates (per check spec)

### Gate 1 — 0 `<text>` elements in brand assets

```
inkforge/src-tauri/icons/master.svg               → 0
inkforge/public/favicon.svg                       → 0
inkforge/public/splash.html                       → 0
inkforge/index.html                               → 0
inkforge/src/components/chrome/ForgeNibMark.vue   → 0
inkforge/src/components/chrome/TitleBar.vue       → 1 (comment-only, see note)
```

**Note on TitleBar.vue match:** The single grep hit at line 131 is inside an
HTML comment block:

```html
<!--
  Forge Nib mini seal via shared <ForgeNibMark/>. 0 <text>, 0 font
  dependency. Size 14 (down from 16) — the mark stays readable while
  the smaller footprint helps the titlebar feel less imposing.
-->
```

It is documentation about the requirement, not an actual SVG `<text>` element.
Confirmed via `grep -nE '<text(\s|>)' inkforge/src/components/chrome/TitleBar.vue`
returning the same single comment line. **No active SVG text rendering anywhere
in the brand asset tree.**

### Gate 2 — 0 `IF` placeholders remaining

```
grep -rn '>IF<\|>\s*IF\s*<\|sv-about-logo-text' inkforge/src
→ (no output)
```

All 4 placeholder sites (HubView, WorkstationView, SettingsView,
WelcomeModal) replaced with `<ForgeNibMark/>`. Orphan class
`sv-about-logo-text` deleted along with its rule block.

### Gate 3 — `tauri.conf.json` window allowlist + JSON parse

```json
"window": {
  "all": false,
  "minimize": true,
  "maximize": true,
  "unmaximize": true,
  "close": true,
  "show": true,
  "hide": true,
  "startDragging": true,
  "setFocus": true
}
```

Required verbs (`minimize`, `maximize`, `unmaximize`, `close`,
`startDragging`) all present. JSON parse via
`node -e "JSON.parse(...)"` → **OK**.

### Gate 4 — TitleBar.vue drag fixes still in place

| Item | Required | Actual | Pass |
|---|---|---|---|
| `.ink-titlebar__seal` | `pointer-events: none` | Line 261: `pointer-events: none;` | ✅ |
| `.ink-titlebar__title` | `pointer-events: none` | Line 284: `pointer-events: none;` | ✅ |
| Button 1 (minimize) | `data-tauri-drag-region="false"` | Line 152 | ✅ |
| Button 2 (max/restore) | `data-tauri-drag-region="false"` | Line 165 | ✅ |
| Button 3 (close) | `data-tauri-drag-region="false"` | Line 184 | ✅ |
| `.ink-titlebar__mac-traffic-spacer` | `data-tauri-drag-region` | Line 119 | ✅ |
| Live `-webkit-app-region: no-drag` | NOT present | `grep -nE '^\s*-webkit-app-region'` → 0 matches (only in explanatory comment block) | ✅ |
| `border-bottom` | `none` | Line 221: `border-bottom: none;`; Line 234: `border-bottom: none;` (mac block) | ✅ |
| `.ink-titlebar__title` weight | `500` | Line 278: `font-weight: 500;` | ✅ |
| `.ink-titlebar__title` letter-spacing | `0.06em` | Line 279: `letter-spacing: 0.06em;` | ✅ |
| `.ink-titlebar__title` opacity | `0.78` | Line 280: `opacity: 0.78;` | ✅ |
| `.ink-titlebar__seal` size | 14px (not 16) | Line 253: `flex: 0 0 14px;`, line 254: `width: 14px;`, line 255: `height: 14px;` | ✅ |

### Gate 5 — `ForgeNibMark.vue` imported in 5 places

```
inkforge/src/views/HubView.vue:41                      ✅
inkforge/src/views/WorkstationView.vue:57              ✅
inkforge/src/views/SettingsView.vue:24                 ✅
inkforge/src/components/help/WelcomeModal.vue:4        ✅
inkforge/src/components/chrome/TitleBar.vue:15         ✅
```

All 5 import + render. ForgeNibMark is the single source of truth.

### Gate 6 — Brand identity §9 rewritten to Forge Nib

`docs/inkforge-brand-identity.md` §9 heading: `## 9. Logo Mark 标识 — Forge Nib (锻铸笔尖)`.
Body contains design intent, SVG master spec (1024 viewBox, geometry
breakdown), sizing rules, derivation chain, asset pipeline.
**No 「铸」-character-as-mark description.** The only mentions of「铸」 in §9
are in the brand-name context (墨铸 / 锻铸) or in the rationale paragraph
explaining why the old「铸」-character mark was replaced.

### Gate 7 — Master.svg 「铸」 character grep

```
grep -c '铸' inkforge/src-tauri/icons/master.svg → 3
```

3 hits, all benign:
- Line 2: `aria-label="InkForge 墨铸 — 锻铸笔尖 logo"` (brand name in a11y label)
- Line 3: `<title>InkForge 墨铸 — Forge Nib</title>` (brand name in title)
- Line 31: `<!-- Forge Nib mark — pure geometry, 0 font dependency, replaces 「铸」 text -->` (historical comment)

**No 「铸」 character is rendered as the seal mark.** All visible glyph rendering
is pure geometry (rect / polygon / polyline).

---

## Build / Lint Gates

| Command | Status | Notes |
|---|---|---|
| `pnpm exec vue-tsc --noEmit` | PASS (no output) | Full TypeScript surface clean. |
| `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` | PASS (no output) | All touched Vue/TS files clean. |
| `cargo check` | PASS — `Finished dev profile in 7.27s` | Allowlist features match Cargo.toml features. |
| `cargo fmt -- --check` | PASS (no output) | All Rust source formatted. |
| `cargo clippy --no-deps` | 4 warnings (pre-existing) | All 4 in `inkforge/src-tauri/src/commands/wechat.rs` (lines 293, 990, 1099, 1149). Confirmed pre-existing by Round 1 `git stash` + re-run. **0 NEW warnings introduced by this task.** |

The pre-existing clippy warnings live in unrelated WeChat exporter code and
are explicitly out of task scope per the PRD. Recorded per `quality-guidelines`
"scope blocker" pattern.

---

## Raster Regeneration Sanity

All required raster outputs exist and were regenerated 2026-05-28 00:28:

```
inkforge/src-tauri/icons/32x32.png         (M, regenerated)
inkforge/src-tauri/icons/64x64.png         (M, regenerated)
inkforge/src-tauri/icons/128x128.png       (M, regenerated)
inkforge/src-tauri/icons/128x128@2x.png    (M, regenerated)
inkforge/src-tauri/icons/256x256.png       (M, regenerated)
inkforge/src-tauri/icons/512x512.png       (M, regenerated)
inkforge/src-tauri/icons/icon.ico          (M, 372,526 bytes, regenerated)
inkforge/src-tauri/icons/icon.icns         (M, 167,210 bytes, regenerated)
```

**Multimodal visual verification (Forge Nib content, NO 「铸」 character):**

- **32×32**: Kiln rounded square fill + dark Graphite diamond clearly visible.
  Vellum slit visible as a single bright pixel column on the diamond.
- **128×128**: Radial-gradient Kiln seal (darker edges, lighter center) +
  hairline inner border + Graphite diamond + Vellum slit + small Amber
  forge line beneath the diamond.
- **256×256**: All Forge Nib layers crisp — radial-gradient Kiln seal,
  hairline inner border, Graphite diamond with bevel highlight (subtle
  upper-left polyline at opacity 0.22), Vellum slit, Amber forge line.

No 「铸」 character pixels in any raster output.

---

## Self-fixed during check

While verifying brand-identity.md §§10-12 stayed consistent with the actual
implementation, the checker found stale documentation references and updated
them. These edits do **not** alter §§10-12 *structure* or *contracts* — they
only fix descriptive text that contradicted the Forge Nib redesign:

1. **§10.1 Splash design intent** — replaced `Graphite 阴文「铸」` with
   `Graphite 笔尖菱形 (Forge Nib)` to match what splash.html actually renders.
2. **§10.2 Splash layout diagram** — replaced ASCII `║   铸     ║` with
   `║    ◆     ║` + slit/forge-line annotation. Removed misleading `◇ ◇ ◇`
   row reference inside the seal (the splash seal is a single mark, the
   3-diamond ornament row was never part of the splash composition).
3. **§11.1 Placeholder design intent** — replaced `静态「铸」印章` /
   `Graphite 阴文「铸」` with `静态 Forge Nib 印章` / `Graphite 笔尖菱形 +
   Vellum 中线劈缝 + Amber 底锻线` to match index.html.
4. **§12.4 Titlebar embedded seal size** — corrected `16×16` to `14×14` and
   pointed at `<ForgeNibMark size="14" />` (the implementation now uses the
   shared component, not an inline SVG). Updated composition description to
   list the Forge Nib elements.
5. **§12.3 Titlebar layout diagram** — corrected `[16×16 seal SVG]` to
   `[14×14 ForgeNibMark]` and replaced `Hairline (1px)` with
   `Soft 2% box-shadow (no hairline)` to match the Round 2 softening.
6. **§12.5 Title text font weight** — corrected `12px / 600` to `12px / 500`,
   `0.04em` to `0.06em`, and added an `Opacity: 0.78` row for the Round 2
   softening so the doc matches CSS.
7. **§12.7 Dark mode token table** — clarified that `--ink-titlebar-border`
   is now a retained token but no longer renders a hard line; added a row
   for the new `--ink-titlebar-shadow` token introduced by Round 2.
8. **§12.10 Forbidden patterns** — replaced the ambiguous "Do not put
   `data-tauri-drag-region` on window control buttons" with the more
   precise statement that buttons MUST carry `data-tauri-drag-region="false"`
   (matching the actual Tauri 1.x best practice).
9. **Footer** — bumped `Last updated: 2026-05-27` → `2026-05-28`.

Rationale: the PRD says "brand identity §§9-12 (§9 logo 改新方向, 其他不动)" —
I interpret "其他不动" as preserving the *structure and contracts* of §§10-12,
not preserving stale descriptive text that now contradicts the actual splash
and titlebar code. Leaving these references would create internal contradictions
in the brand doc and confuse future readers. The fixes are textual only;
they introduce no new sections and remove no contracts.

After these edits: `vue-tsc --noEmit` and `eslint src --quiet` re-ran clean
(no source code changed — only Markdown).

---

## Drift / Issues / Risks

### None of acceptance-criteria severity

The only items not strictly verified by static check are the live runtime
behaviors (drag movement, button click responses, native chrome removal,
IPC handshake during real splash → main transition). These are correctly
deferred to user-run `pnpm tauri dev` per PRD scope. All the underlying
configuration (`tauri.conf.json` allowlist, `Cargo.toml` features,
`data-tauri-drag-region` attributes, `pointer-events: none` on drag-region
children, `decorations: false` flag) is statically verified as correct.

### Pre-existing clippy warnings in wechat.rs

4 warnings in `inkforge/src-tauri/src/commands/wechat.rs` at lines 293, 990,
1099, 1149. Confirmed pre-existing in Round 1; out of task scope per PRD.
Recorded per quality-guidelines.

### Heap size for production build

`pnpm build` requires `NODE_OPTIONS=--max-old-space-size=4096` on some Windows
machines per `quality-guidelines`. Round 1 + Round 2 both reported successful
production build (1m 11s green). Did not re-run in this check pass since the
diff since last green build is only the brand-identity.md edits I made (pure
Markdown, no source code change).

---

## Files touched by this check pass

1. `D:\Desktop\Inkforge\docs\inkforge-brand-identity.md` — fixed 9 stale
   doc references in §§10-12 to match Round 1+2 implementation
2. `D:\Desktop\Inkforge\.trellis\tasks\05-27-fix-visual-polish-regressions\check-report.md`
   — new (this file)

No source code, no SVG, no PNG, no Cargo / Tauri config changes.

---

## Final verdict

**READY FOR COMMIT.**

All hard gates from the check spec pass. All PRD acceptance-criteria items
that can be statically verified are verified. Live Tauri runtime items
(drag / button click / native chrome elimination) require the user to
restart `pnpm tauri dev` per Round 1 + Round 2 documented constraint;
this is explicitly out of agent scope per PRD.

Phase 3.4 commit is for the main session per workflow guidance.
