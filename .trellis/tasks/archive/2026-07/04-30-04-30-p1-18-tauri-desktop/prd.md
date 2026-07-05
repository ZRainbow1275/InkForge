# P1 Tauri Desktop Baseline PRD

## Status

- Task: `04-30-04-30-p1-18-tauri-desktop`
- Source spec: `prompts/0420/specs/18-tauri-desktop-spec.md`
- Scope: compatible baseline, not full Spec 18 completion
- Target app: `inkforge/` nested Vue + Tauri 1.6 app

## Current Reality

The project already has a Tauri 1.6 shell under `inkforge/src-tauri` and frontend dependencies `@tauri-apps/api@^1.6.0` plus `@tauri-apps/cli@^1.6.0`. The source spec contains several older or forward-looking desktop requirements, including environment detection, native dialogs, shell integration, window management, clipboard, updater, tray, global shortcuts, packaging, and a full native test matrix.

Fresh documentation review found that current Tauri v2 uses capability files and plugin-specific permissions, while this project is pinned to Tauri 1.6 and uses the v1 allowlist model. Therefore this baseline must remain v1-compatible and must not perform a destructive upgrade to Tauri v2.

## Problem

Desktop-only functionality is currently scattered. `src/utils/platform.ts` detects only `window.__TAURI__`, `src/services/file-picker.ts` has native dialog behavior, and `main.ts` dynamically listens for close events. There is no central, typed desktop capability contract that tells the UI and services which native features are actually available, and several Spec 18 commands are not registered on the Rust side.

## Goals

1. Add a central typed desktop runtime/capability service that distinguishes Tauri runtime from web runtime without pretending web has native capability.
2. Keep web development usable by returning explicit unavailable results instead of throwing or mocking native success.
3. Add a real Tauri v1.6 Rust command baseline for runtime info, window listing/focus/creation, and file-manager reveal.
4. Surface desktop runtime and capability status in an existing UI location without adding Emoji icons or removing any current modules.
5. Preserve the existing file picker and AI IPC behavior instead of duplicating their logic.
6. Verify TypeScript, lint, build, and Rust cargo check on the real local project.

## Non-Goals

- No Tauri v2 migration in this task.
- No full tray, global shortcut, updater, platform biometric authentication, file watcher, or package signing implementation in this baseline.
- No simulated native command success in browser mode.
- No deletion or replacement of existing editor, file picker, export, crash recovery, or settings features.
- No mock data and no fake desktop telemetry.

## User-Facing Behavior

- In web mode, Settings > About shows that the runtime is Web and native desktop capabilities are unavailable or degraded.
- In Tauri mode, the same panel can show the Tauri window label, app version, app data directory, and native capability availability returned by real Tauri APIs/commands.
- Desktop service helpers return structured results: `ok: true` only when the real operation succeeds; otherwise `ok: false` with a concrete unavailable/failed/cancelled reason.

## Engineering Contracts

- Runtime detection accepts both Tauri v1 `window.__TAURI__` and the newer `window.__TAURI_INTERNALS__` signal so the baseline is compatible with current and future runtime probes.
- All Tauri imports remain dynamic and are only executed after runtime detection passes, so browser builds do not load native modules eagerly.
- Rust commands return `Result<T, String>` and validate user-supplied paths before launching file-manager commands.
- Window commands must use Tauri's actual window registry. They must not keep an invented window list in frontend memory.
- Settings UI must use existing classes and visual language.

## Acceptance Criteria

- AC-18-01: `detectDesktopRuntime()` returns `web` in a normal browser and does not throw.
- AC-18-02: `detectDesktopRuntime()` can detect both `__TAURI__` and `__TAURI_INTERNALS__` in injected test-like runtime contexts.
- AC-18-03: `getDesktopRuntimeSnapshot()` returns real app/window information in Tauri and explicit unavailable state in web.
- AC-18-04: `openMarkdownFiles()` reuses the existing `pickFiles()` flow rather than creating a second picker stack.
- AC-18-05: Rust registers real commands for `get_desktop_runtime_info`, `list_open_windows`, `focus_window`, `create_new_window`, and `reveal_in_explorer`.
- AC-18-06: `reveal_in_explorer` rejects empty or nonexistent paths instead of silently succeeding.
- AC-18-07: Settings > About displays desktop runtime/capability status without Emoji and without blocking the rest of Settings when native APIs are unavailable.
- AC-18-08: `pnpm exec vue-tsc --noEmit` passes.
- AC-18-09: `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passes.
- AC-18-10: `pnpm build` passes.
- AC-18-11: `cargo check` passes in `inkforge/src-tauri` or any failure is recorded truthfully.

## Remaining Full Spec 18 Scope

The global matrix must keep Spec 18 as Pending after this task. Full completion still requires the complete multi-window drag model, file watcher/sync conflict resolution, tray menu, global shortcuts, quick note window, updater notifications, platform authentication, rich native clipboard, window-state persistence, signing/packaging CI, and the full manual/E2E matrix.
