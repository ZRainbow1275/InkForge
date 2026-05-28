# Tauri e2e harness + visual elevation verification

**Branch**: dev/visual-fixes (continuation; harness PR will fork from here)
**Created**: 2026-05-28
**Owner**: ZRainbow1275
**Status**: planning

## Background

Three commits landed on `dev/visual-fixes` shipping the 05-28 visual elevation:
- `84a6e65` foundation tokens + Inkstone Glass titlebar (PR1/3)
- `a924a4f` Hub + Workstation + Welcome + view transitions (PR2/3)
- `4037e44` Settings + forms + dark mode re-tune + curve cleanup (PR3/3)

Verification gate was `trellis-check` (static). No real e2e ran against the built Tauri client. User pushed back on shipping without running `pnpm tauri:dev` myself — memory rule `feedback_manual_test_via_tauri` mandates Tauri-side test, not vite/browser.

Browser/playwright against `http://127.0.0.1:3005` validates visual only — Tauri IPC (drag region, min/max/close via `appWindow.*`, allowlist gating) is unreachable from outside the WebView. Need WebDriver-based e2e against the actual Tauri binary.

## Goal

Stand up a permanent Tauri-build e2e harness using `tauri-driver` + `msedgedriver` + `webdriverio`, plus a short-term PowerShell-driven screenshot pass over the live `pnpm tauri:dev` window so the user can visually verify the visual elevation this session without waiting for the full harness to be written.

## Scope (Option C — Harness + short-term manual)

### Harness (long-lived)
1. Toolchain installed: `tauri-driver` (cargo), `msedgedriver.exe` 148.0.3967.83 matching local WebView2, webdriverio 9.x + mocha + chai + spec-reporter (already done in this session).
2. `inkforge/tests/e2e/wdio.conf.cjs` targeting `tauri:tauriDriver` capability, pointing at `inkforge/src-tauri/target/debug/inkforge.exe`.
3. `inkforge/tests/e2e/specs/visual.spec.cjs` covering:
   - **Chrome**: `data-tauri-drag-region` present on `.ink-titlebar`, 3 control buttons exist with `data-tauri-drag-region="false"`.
   - **IPC**: invoke `__TAURI__.window.appWindow.minimize() / toggleMaximize() / close()` via `browser.execute` and observe state (window state queried via Tauri JS bridge).
   - **Brand**: 5 ForgeNibMark sites — TitleBar / Hub welcome / Workstation header / Settings About / WelcomeModal — rendered (SVG `<rect>` + `<polygon>` count match), `.forge-nib-mark--interactive` on 4/5 (TitleBar non-interactive seal is intentional).
   - **Theme**: toggle `document.documentElement.dataset.theme = 'dark' | 'light'`, assert `getComputedStyle(body).background-color` switches across the Vellum↔Char range.
   - **Tokens**: `getComputedStyle(document.documentElement).getPropertyValue('--motion-base')` returns `180ms`; under `prefers-reduced-motion: reduce` (emulated via CDP) returns `0ms`.
   - **Focus ring**: `Tab` to a button, computed `box-shadow` includes `0 0 0 2px rgb(217, 91, 63)`.
   - **View transition**: navigate Hub → Workstation, assert `Transition` enter class lands within `motion-slow` (240ms) window.
4. `pnpm test:e2e` script in `package.json`.

### Short-term (this session only)
1. Start `pnpm tauri:dev` background.
2. PowerShell `Add-Type` ScreenCapture utility to grab InkForge window by title.
3. Capture per route × per theme: Hub light, Hub dark, Workstation light, Workstation dark, Settings light, Settings dark, WelcomeModal light.
4. Save under `prompts/0528/tauri-e2e-evidence/` and post inline filenames for user review.

## Out-of-scope

- macOS / Linux e2e (no test hardware in this session).
- CI integration / GitHub Action wiring (separate task).
- Performance benchmarks / Lighthouse / motion-token timing precision under load.
- Re-litigating any visual decisions from the 3 shipped PRs — this task only verifies, does not modify visual code.
- Editor canvas (TipTap) interactions — separate Workstation/editor task scope.

## Acceptance Criteria

- [ ] `tauri-driver --help` runs (verified ✓)
- [ ] `msedgedriver --version` returns 148.x matching local WebView2 (verified ✓)
- [ ] `pnpm wdio run inkforge/tests/e2e/wdio.conf.cjs` exits 0 with all spec items passing
- [ ] Each spec asserts visible behavior, not just selector presence
- [ ] At least 7 PNGs in `prompts/0528/tauri-e2e-evidence/` posted to chat
- [ ] User confirms visual elevation matches PRD expectations OR identifies regression to fix
- [ ] Harness committed on `dev/visual-fixes`; trellis-check passes; `/trellis:finish-work` runs cleanly

## Risks

- WebView2 IPC: `appWindow.minimize()` cannot be cancelled — calling it minimizes the window mid-test. Mitigation: capture state before invoking, restore after.
- `tauri:tauriDriver` capability config needs the debug binary path — first run requires `pnpm tauri build --debug` (long Rust compile, may hit clippy errors out of scope).
- Pre-existing `wechat.rs` clippy errors (4) may block `tauri build` if it runs with `-D warnings`. Mitigation: build with default warning level, not deny.
- Reduced-motion CDP emulation in webdriverio may not work over Microsoft Edge driver (Edge CDP support varies). Fallback: spec-level skip with clear log.

## Decisions locked

- **Test framework**: webdriverio + mocha + chai (Tauri-recommended stack per docs).
- **Selector strategy**: stable `data-test` attributes added only where DOM lacks unique identifier — minimum needed, no test-ID sprawl.
- **Evidence dir**: `prompts/0528/tauri-e2e-evidence/` (parallel to existing `prompts/0526/verification-evidence/` and `prompts/0527/visual-polish-evidence/`).
- **No visual code changes** in this task. If regression found, log to a new follow-up task.

## References

- `docs/inkforge-brand-identity.md` §§13–16 (motion tokens, elevation, typography, dark mode contract)
- Tauri 1.x WebDriver docs: https://tauri.app/v1/guides/testing/webdriver/introduction
- Prior visual PRs: `84a6e65`, `a924a4f`, `4037e44`
- Memory: `feedback_manual_test_via_tauri`, `feedback_full_sweep_fix`
