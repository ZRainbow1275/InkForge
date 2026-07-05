# P1 Tauri Updater Baseline

## Goal

Implement Spec 55 as a real check-and-notify updater layer for the current InkForge desktop/web hybrid without forcing a Tauri major migration. The implementation must expose current/update state in Settings > About, allow manual checks and skip-version persistence, open the real GitHub release page through the existing external-link boundary, and keep startup/interval checks conservative, silent on failures, and disabled by policy when required.

## Authoritative Inputs

- `prompts/0420/specs/55-updater-spec.md`
- `prompts/0420/specs/24-permission-audit-spec.md`
- `prompts/0420/specs/33-diagnostic-logging-spec.md`
- `prompts/0420/specs/40-dev-panel-spec.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/type-safety.md`
- Official Tauri docs checked on 2026-05-03 through Context7 and Grok Search.

## Current Baseline

- The nested app package currently depends on `@tauri-apps/api` and `@tauri-apps/cli` `^1.6.0`; it does not use Tauri 2 `@tauri-apps/plugin-updater`.
- `src-tauri/tauri.conf.json` currently has `tauri.updater.active=false`. No real pubkey or release metadata endpoint is present in the repo, so the feature must not invent a fake signing key or fake release server.
- The git remote is `https://github.com/ZRainbow1275/InkForge.git`; release-page actions can open `https://github.com/ZRainbow1275/InkForge/releases` or a version tag URL.
- Existing external links should go through `openExternalUrl()` in `src/services/desktop/index.ts`, which already uses Tauri shell in desktop and `window.open(... noopener,noreferrer)` in web.
- Existing diagnostic persistence is available through `createActivityLogger()` and audit persistence is available through `auditLog()`.
- Existing Settings About already contains runtime diagnostics, Developer Mode, performance monitoring, local account/security, tech stack, credits, and license sections. Updater UI must be additive.
- Existing command palette commands are registered in `createBuiltinCommands()` from `App.vue`.

## Implementation Requirements

1. Compatibility and policy

- Do not migrate the app to Tauri 2 for this task. Use a Tauri 1-compatible adapter around `@tauri-apps/api/updater` when running in a Tauri runtime.
- Treat the Tauri 2 `@tauri-apps/plugin-updater` path as a documented migration target, not a direct dependency in the current codebase.
- Do not auto-download, install, relaunch, or force update. This slice only checks, notifies, skips, and opens the release page.
- If the updater is unavailable, disabled by user setting, disabled by enterprise policy, disabled by env, or effectively offline beyond the policy window, return a typed disabled result instead of throwing into UI.

2. Data model

- Add a typed persisted Settings branch for updater preferences and status: user-disabled auto checks, last check timestamp, last successful check timestamp, latest known update info, skipped count/status, and last error message.
- Add a durable `updaterSkipped` IndexedDB table for skipped versions with `version`, `skippedAt`, and `reason`.
- Provide a localStorage fallback only for skip persistence if Dexie write/read fails; this is a recovery path, not the primary source of truth.
- Preserve all existing Settings fields and existing IndexedDB tables.

3. Service layer

- Add `src/services/updater/*` with strict typed contracts, semver comparison, Tauri adapter, skip store, policy evaluation, release-notes sanitization, and the high-level updater service.
- `checkNow({ source: 'manual' })` must ignore background throttles; startup/interval checks must respect conservative timing and not block app boot.
- Signature failure or Tauri updater verification failure must be treated as a silent ignored update plus error-level ActivityLog.
- Release notes markdown must be sanitized through the existing security/markdown boundary before display.

4. UI and command integration

- Add an Update card under Settings > About without deleting existing sections.
- Show current version, latest version, disabled policy state, skipped version state, last check timestamps, sanitized notes modal, manual check, open release page, skip version, reset skip records, and user auto-check toggle.
- Add a command palette command `Updater: Check for Updates` that performs a real manual check and navigates to Settings > About.
- Do not use emoji. Use existing CSS/status components and installed icon components only if needed.

5. Audit and activity logs

- Write ActivityLog events for background/manual checks, disabled policy, unavailable runtime, signature failures, skipped versions, and release-page open attempts.
- Add audit actions for user-visible updater actions: `updater.user-check`, `updater.skip-version`, `updater.open-release`, and `updater.toggle-disabled`.
- Manual failures may surface as lightweight UI messages; background failures must stay silent.

## Acceptance Criteria

- Web/dev runtime does not crash when Tauri updater APIs are unavailable; it returns a typed disabled/unavailable state and logs through ActivityLogger.
- In Tauri runtime, the adapter calls `checkUpdate()` only; it never calls `installUpdate()`, `downloadAndInstall()`, `relaunch()`, or a forced updater dialog path.
- Settings > About shows current version and update status, and manual check updates status without blocking existing About sections.
- Skip version persists through `updaterSkipped` and prevents repeat notifications for that version while still allowing manual visibility in Settings.
- A higher version than a skipped version is not suppressed by the skip list.
- Open release page uses `openExternalUrl()` and rejects unsupported protocols.
- Enterprise/user/env/offline disable paths return typed disabled reasons and do not write noisy error toasts.
- Unit tests cover semver comparison, policy evaluation, skip-store fallback, Tauri adapter mapping, manual check behavior, release-notes sanitization, and no-install invariants.
- Required validation: targeted updater tests, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, and `pnpm vitest run`. Run production build if code changes affect app startup or Settings bundle behavior.
- Browser smoke should use the real Settings UI and real command palette path. It may observe Tauri-unavailable behavior in web dev; it must not seed fake localStorage/IndexedDB update payloads as proof.

## Non-Goals

- No Tauri 2 migration in this task.
- No fake signing key, fake update endpoint, or mock release server.
- No automatic download, install, relaunch, silent update, or mandatory update gate.
- No Hub/Workstation badges.
- No deletion of existing Settings About diagnostics, Developer Mode, performance, account, credits, or license sections.

## Implementation Notes

- Prefer a `src/services/updater/*` boundary and a small Pinia `useUpdaterStore()` for UI lifecycle/state.
- Keep updater startup scheduling in `App.vue` after command/FTUE initialization so it does not compete with first paint.
- Because `src-tauri/tauri.conf.json` currently disables updater and lacks a real pubkey, do not mark the desktop updater as fully active until real release signing configuration is supplied.
- The implementation should be immediately useful in web dev by proving disabled/unavailable policy and UI behavior, and ready for desktop release once a real Tauri updater endpoint/pubkey is configured.

## Completion Evidence 2026-05-03

- Implemented the Tauri 1 compatible updater boundary under `inkforge/src/services/updater/*`; current code dynamically imports `@tauri-apps/api/updater` and calls `checkUpdate()` only.
- Implemented additive Settings About UI through `UpdateCard.vue`, `UpdateDetailsModal.vue`, and `UpdateToast.vue`; existing About diagnostics, Developer Mode, performance, account, credits, and license sections remain present.
- Implemented `useUpdaterStore()` scheduling, manual check, skip/reset/open-release actions, local notification de-dupe, resume/online conservative checks, and silent background failure behavior.
- Implemented durable skip records through Dexie `updaterSkipped` schema v20 with localStorage fallback; Settings stores only updater preference/status snapshots.
- Implemented command palette command `Updater: Check for Updates`, which runs a real manual check and routes to `Settings > About` updater section.
- Rechecked official Tauri docs on 2026-05-03 through Context7 and Grok Search; Tauri 2 `@tauri-apps/plugin-updater` remains documented as migration target only.
- Validation passed: `pnpm exec vitest run src/services/updater/updater.test.ts` (12 tests), `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, `pnpm vitest run` (36 files, 267 tests), and `NODE_OPTIONS=--max-old-space-size=4096 pnpm build`.
- Targeted scan found no updater-scope `installUpdate`, `downloadAndInstall`, `download()`, `install()`, or `relaunch()` calls.
- Browser smoke passed on `http://127.0.0.1:3005/settings?tab=about&section=updater`: real Settings updater card rendered, command palette execution worked, typed `build-config` disabled result surfaced, audit/activity IndexedDB evidence was present, and fresh console errors were 0.
- Evidence screenshot: `artifacts/55/spec55-updater-settings-smoke-2026-05-03T08-48-11-021Z.png`.

## Remaining Native Release Preconditions

- Do not mark desktop updater as active until a real signed endpoint, release manifest, and minisign pubkey are configured.
- Do not add fake release metadata, fake signing keys, or mock update servers to satisfy positive native-update UI states.
- Full native update-positive E2E remains blocked on real signed release artifacts; current accepted proof is web/dev disabled-unavailable behavior plus unit-level adapter mapping.
