# Full App Functionality Audit and Repair

## Goal

Run a whole-app, evidence-driven functionality audit and repair pass for Inkforge. The previous export/platform rendering audit is only one subdomain. This task must cover every production route, every visible control, every relevant component family, every Settings item, and the store/service boundary behind those interactions. The result must be a real pass/fail/fixed ledger backed by local code, browser evidence, command output, and repair commits, not a roadmap claim.

## What I Already Know

- The user explicitly corrected the prior scope: WeChat/Xiaohongshu/Zhihu export capability is only one part of the application, not the full goal.
- The runnable frontend app is the nested package `inkforge/`, not the repository root.
- The active task is `.trellis/tasks/05-12-full-app-functionality-audit-repair`, status `planning`.
- The existing export audit task remains useful as imported evidence for the platform-export subdomain:
  - `.trellis/tasks/05-12-export-platform-rendering-real-capability-audit/`
  - Known validation from that task includes service export tests and lint/type/build gates.
- Existing manual UI/UX evidence lives under `0503/ui-ux-manual-test/` and should be reused as historical context, but it is not enough for this new full-app control-level audit.
- Current app surfaces discovered from repo inspection include:
  - Views: `HubView`, `WorkstationView`, `SettingsView`, `PublishView`, `ThemesView`, `DraftsView`, `AccountWelcome`, `NotFoundView`, and dev-only `DevPanel`.
  - Component domains: editor, settings, export, asset, article, category, command palette, layout, help, hub insights, tag system, workstation, version, and related shared controls.
  - Store/service domains: article, editor, settings, sync, theme, tags, trash, updater, profile, workstation tabs, dev panel, export, permissions, templates, search, settings migration, layout persistence, asset pipeline, comment review, citation, and platform export services.
- Frontend specs require typed Vue SFCs, `lucide-vue-next` icons instead of emoji UI icons, Pinia/store/service boundaries for durable state and side effects, Zod/schema validation at important runtime boundaries, no mock storage proofs, real browser evidence for interactive user workflows, and non-mutating lint via `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet`.
- Serena/GitNexus/ABCoder are preferred by project policy. In this session Serena MCP calls returned `Session terminated`; this limitation must be recorded and compensated with narrower inspection, full static gates, browser evidence, and GitNexus retries if available during implementation.

## Code-Derived Scope Snapshot

### Runtime Commands

- Web development: `pnpm -C inkforge dev --host 127.0.0.1 --port 3005`.
- Production web build: `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`.
- Tauri desktop shell: `pnpm -C inkforge tauri:dev`.
- Tauri production package gate: `pnpm -C inkforge tauri:build` when the local desktop toolchain can complete it safely.

### Routes

- Primary routes from `inkforge/src/router/index.ts`:
  - `/` -> `HubView`
  - `/workstation` -> `WorkstationView`
  - `/drafts` -> `DraftsView`
  - `/publish` -> `PublishView`
  - `/settings` -> `SettingsView`
  - `/account` -> `AccountWelcome`
  - `/themes` -> `ThemesView`
  - `/:pathMatch(.*)*` -> `NotFoundView`
- Compatibility redirects:
  - `/editor` -> `/workstation`
  - `/client` -> `/workstation`
  - `/workspace` -> `/workstation`
  - `/cms` -> `/`
  - `/nexus` -> `/`

### Settings Tabs and Registry Rows

- `SettingsView` tabs: `appearance`, `editor`, `export`, `ai`, `data`, `sync`, `audit`, `profiles`, `extensions`, `shortcuts`, `advanced`, `about`.
- `settingsStore` registry rows that must each become audit-matrix rows:
  - `appearance.theme`
  - `appearance.fontFamily`
  - `appearance.accentColor`
  - `appearance.typography`
  - `appearance.visualSystem`
  - `editor.mode`
  - `editor.width`
  - `editor.autosave`
  - `editor.listEnterBehavior`
  - `editor.smartPunctuation`
  - `editor.writingGoal`
  - `export.platform`
  - `export.customCss`
  - `export.history`
  - `ai.provider`
  - `ai.systemPrompt`
  - `data.backup`
  - `data.storage`
  - `sync.status`
  - `sync.manual`
  - `audit.ledger`
  - `audit.integrity`
  - `profiles.registry`
  - `profiles.database`
  - `profiles.nativeBoundary`
  - `extensions.registry`
  - `extensions.permissions`
  - `shortcuts.registry`
  - `advanced.customCss`
  - `about.updater`
  - `about.logLevel`
  - `about.devPanel`
  - `about.featureFlags`
  - `about.performanceSlo`
  - `about.proxy`
  - `about.migration`
  - `about.ftue`

### Hidden, Dev, and Command Entrances

- DevPanel is mounted from `App.vue` and loaded dynamically as `views/dev/DevPanel.vue`.
- DevPanel activation paths are blocking scope:
  - Settings `about.devPanel`.
  - Command Palette command `dev.togglePanel`.
  - Keyboard chord `Ctrl+Shift+D` pressed 3 times within 500 ms.
  - Startup query/global flags: `?dev-panel=1`, `?devPanel=1`, `__INKFORGE_DEV_PANEL__`, `__INKFORGE_DEV_PANEL_ARGV__`.
- Built-in Command Palette command groups and ids are blocking scope:
  - Document/navigation/settings: `document.create`, `hub.goToHub`, `hub.openDrafts`, `settings.open`, `settings.openAppearance`, `settings.openEditor`, `settings.openWritingGoals`, `settings.openShortcuts`, `settings.openExport`.
  - Runtime/dev/publish: `updater.checkUpdates`, `dev.togglePanel`, `publish.open`.
  - Workstation-only commands: `view.toggleFocusMode`, `view.toggleTypewriterMode`, `view.switchToTyporaMode`, `view.switchToSourceMode`, `view.switchToPreviewMode`, `view.toggleSplitView`, `view.toggleSidebar`, `export.openExportModal`.

### Desktop Capability Matrix

The desktop service advertises the following native/runtime capabilities and each must have a Web and Tauri-shell audit row where applicable:

- `app-info`
- `window-management`
- `native-file-dialog`
- `file-reveal`
- `shell-open`
- `clipboard-text`
- `file-watch`
- `system-tray`
- `global-shortcut`
- `updater`
- `platform-auth`
- `package-signing`

## Problem

The existing state has scattered evidence: a prior manual route sweep, a visual overhaul task, and a focused platform export audit. That does not satisfy the current requirement: every button, component, and Settings item must be checked and repaired. The missing layer is a canonical inventory that maps UI controls and settings to real behavior, state persistence, service/store calls, error states, and verification evidence.

## Requirements

- Create a canonical control inventory before claiming any implementation success.
- Inventory coverage must include every production-visible route and entry:
  - Hub `/`
  - Workstation `/workstation`
  - Settings `/settings` and every tab/section/field within it
  - Publish `/publish`
  - Themes `/themes`
  - Drafts `/drafts`
  - Account/Welcome account entry
  - NotFound/recovery route
  - Compatibility redirects such as `/editor`, `/client`, `/workspace`, `/cms`, and `/nexus`
- Inventory coverage must also include dev-only, hidden, and experimental entries as blocking scope:
  - DevPanel and development-only controls.
  - Hidden route entries, feature-flagged panels, and experimental controls reachable from code or command palette.
  - These rows may pass through honest unavailable/disabled states when runtime gates apply, but they cannot be omitted or deferred merely because they are not production-visible.
- Inventory coverage must include every production-visible interactive control:
  - Buttons, icon buttons, tabs, menus, popovers, command palette commands, toolbar controls, segmented controls, toggles, checkboxes, selects, inputs, sliders/steppers, file inputs, context menus, cards with click handlers, keyboard shortcuts, and disabled/loading/error states.
- Inventory coverage must include every Settings item:
  - UI field label and control type.
  - Persisted path in settings schema/store.
  - Default value and migration behavior.
  - User change path from UI to store/service.
  - Reload/restart persistence proof where applicable.
  - Reset/import/export behavior where applicable.
  - Validation and error feedback.
- Inventory coverage must include component families, even when a component has no direct route:
  - Editor and Tiptap extensions.
  - Workstation manager/inspector/status/tab surfaces.
  - Asset/image pipeline UI.
  - Tag system UI.
  - Help/FTUE surfaces.
  - Command palette surfaces.
  - Export/publish overlays and platform artifacts.
  - Hub insights and writing-flow widgets.
  - Version/updater/about diagnostics.
- Inventory coverage must include store/service boundaries behind UI actions:
  - Actions must call real stores/services/repositories.
  - UI-only success states are forbidden.
  - Unsupported native/runtime capabilities must show honest unavailable/disabled states.
  - Missing credentials/providers must fail explicitly and never return fake success.
- External-provider coverage uses an honest-unavailable rule:
  - If a workflow depends on external credentials, accounts, OAuth/API access, WebDAV/Git/Self-hosted endpoints, platform upload permission, or a real update server, an unconfigured local environment can still pass only when the UI calls the real boundary and surfaces a truthful `needs configuration`, `unavailable`, or typed failure state.
  - The control must not mark the operation as uploaded, synced, published, updated, or connected unless the real provider confirms it.
  - When real credentials/endpoints are configured, the same inventory row must be re-runnable as a live integration proof.
- Runtime coverage must include the Tauri desktop shell as a blocking acceptance gate:
  - Any feature involving native dialogs, updater checks, file-system access, desktop shell behavior, window/runtime detection, or Tauri-specific command paths must be tested in the real Tauri runtime.
  - Web/Vite evidence is still required for rapid UI coverage, but it cannot substitute for Tauri-native proof where native capability is part of the product behavior.
  - If the local Tauri runtime cannot safely start or a native capability cannot be exercised, the related inventory row must be marked `blocked`, not `pass`.
- Repair every failing item that can be fixed locally without fabricating external capability.
- Record every deferred item with a concrete reason, owner, reproduction path, and follow-up boundary. A deferred item cannot be counted as passed.
- Preserve existing user/other-agent dirty changes. Do not revert unrelated files.

## Deliverables

- `.trellis/tasks/05-12-full-app-functionality-audit-repair/audit-matrix.md`
  - Canonical route/view/component/control/settings inventory.
  - Each row has: `id`, `area`, `route/entry`, `file/component`, `control`, `expected behavior`, `data boundary`, `states`, `evidence`, `status`, `repair link`.
- `.trellis/tasks/05-12-full-app-functionality-audit-repair/findings.md`
  - Blocking defects, severity, reproduction steps, root cause, fix plan, final status.
- `.trellis/tasks/05-12-full-app-functionality-audit-repair/evidence.md`
  - Commands, browser runtime URL, console/network findings, screenshots/videos/traces, storage observations, and real-user-flow notes.
- `.trellis/tasks/05-12-full-app-functionality-audit-repair/repair-log.md`
  - Chronological code changes and the inventory/finding rows they close.
- `.trellis/tasks/05-12-full-app-functionality-audit-repair/static-control-inventory.md`
  - Static extraction of Vue control/interaction markers used to ensure every button/component family is accounted for before browser audit.
- `.trellis/tasks/05-12-full-app-functionality-audit-repair/research/verification-strategy.md`
  - Verification approach and external references.
- Real code fixes for failed controls, settings, or service boundaries.
- Focused tests for repaired logic where existing tests do not already cover the behavior.

## Execution Slices

The task should run in strict inventory-first order. This is not a suggestion to mark partial work complete; it is the sequence for controlling risk.

1. Inventory generation and matrix seeding:
   - Routes, redirects, Settings registry rows, command palette commands, DevPanel entries, desktop capability rows, and component family anchors.
   - Output: `audit-matrix.md` with all rows present and no `pass` claims yet.
2. Static contract review:
   - Map every row to expected store/service/schema/native boundary.
   - Output: `findings.md` for obvious disconnected controls, fake success states, or missing evidence hooks.
3. Web/Vite browser audit:
   - Desktop and mobile route sweeps, Settings tab iteration, command palette flows, Workstation/editor flows, Publish/export overlays, Help/FTUE, and DevPanel startup paths.
   - Output: browser evidence and first repair batch.
4. Tauri desktop audit:
   - Real shell launch, native dialogs, file reveal/shell open, desktop runtime snapshot, updater boundary, and capability matrix truth.
   - Output: Tauri logs/screenshots and native blocker/fix rows.
5. Repair loop:
   - Fix rows in severity order, starting with controls that claim success without real boundary calls, broken Settings persistence, and Tauri/native blockers.
   - Output: `repair-log.md`, tests, and re-verification evidence.
6. Final gates:
   - Non-mutating lint, typecheck, Vitest, build, Tauri gate, GitNexus/Serena retries or explicit tool limitation notes, and final matrix status reconciliation.

## Audit Matrix Contract

Each inventory row must be traceable and testable:

| Field | Required Meaning |
| --- | --- |
| `id` | Stable identifier such as `SET-EDITOR-001`, `HUB-ACTION-003`, `WS-TAB-002`. |
| `area` | Route, Settings tab, component family, service domain, or native boundary. |
| `route/entry` | URL, command palette entry, keyboard shortcut, menu path, or component host. |
| `file/component` | Primary source file(s) inspected. |
| `control` | Button/input/toggle/menu/shortcut/field name. |
| `expected behavior` | Product behavior, including disabled/loading/error behavior. |
| `data boundary` | Store/service/repository/schema/native boundary that must be exercised. |
| `states` | Visible, keyboard reachable, disabled, loading, success, error, empty, and mobile states where applicable. |
| `evidence` | Command, browser assertion, screenshot/trace, storage read-only proof, or test path. |
| `status` | `pass`, `fail`, `fixed`, `deferred`, or `blocked`. |
| `repair link` | Code/test/log pointer for `fixed`, reason/follow-up for `deferred/blocked`. |

No row may be marked `pass` from static code reading alone if it is user-visible and interactive.

## Acceptance Criteria

- [ ] A complete `audit-matrix.md` exists and covers all production-visible routes, controls, components, and Settings items.
- [ ] Dev-only, hidden, and experimental entries are included as blocking inventory rows and have pass/fixed evidence or a concrete runtime-blocker classification.
- [ ] Every button/icon-button/menu/toolbar/card action has at least one evidence row covering handler wiring, user-visible result, disabled/loading/error state where applicable, and keyboard/accessibility affordance where applicable.
- [ ] Every Settings field has evidence for UI value, typed schema/store path, persistence/migration behavior, and validation/error behavior.
- [ ] Every major route has desktop and mobile browser evidence with fresh console-error checks.
- [ ] Every major component family has either browser interaction evidence or focused unit/component/service tests that exercise the real store/service boundary.
- [ ] Export/platform rendering from the prior task is imported as one subdomain, but the full task remains incomplete until the rest of the app passes.
- [ ] No mock IndexedDB/localStorage rows, fake sample data, fake publish/upload/sync success, or placeholder UI success is used as proof.
- [ ] Unsupported runtime/native/provider capabilities surface honest unavailable/disabled/blocked feedback.
- [ ] External-provider workflows without configured credentials/endpoints call the real boundary and show truthful unavailable/needs-configuration feedback without fake success.
- [ ] All repaired items are linked from `findings.md` to code changes and re-verification evidence.
- [ ] Full non-mutating lint, typecheck, relevant Vitest suites, and production build are run or exact blockers are recorded.
- [ ] Browser evidence uses the real Vite app and real UI interactions. Read-only storage inspection is allowed; storage mutation for proof is not.
- [ ] Fresh Playwright/browser route sweeps include at least desktop and 390px mobile viewports for visual/interaction-sensitive pages.
- [ ] Real Tauri desktop-shell evidence exists for every native-dependent workflow, including native dialogs, updater, file-system/runtime boundaries, and shell-only behavior. Missing native proof is blocking.

## Verification Plan

- Static gates:
  - `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet`
  - `pnpm -C inkforge exec vue-tsc --noEmit`
  - `pnpm -C inkforge exec vitest run --reporter=default`
  - `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
- Targeted gates:
  - Run narrower Vitest suites for changed domains before broad gates.
  - Reuse existing export service tests for the platform-export subdomain.
  - Add tests for any repaired store/service/schema behavior that lacks coverage.
- Browser gates:
  - Start/reuse `pnpm -C inkforge dev --host 127.0.0.1 --port 3005`.
  - Perform route sweeps for `/`, `/workstation`, `/settings`, `/publish`, `/themes`, `/drafts`, account/welcome entry, and unknown route.
  - Capture console errors, page errors, visible overflow, key screenshots, and interaction evidence.
  - For Settings, iterate every tab and field; verify changes via UI and persistence after reload where applicable.
  - For Workstation/editor, use real UI-created or existing local articles; do not inject fake articles.
- Tauri gates:
  - Start the real desktop shell with the repo-supported Tauri command.
  - Exercise native-dependent controls in the shell, not only in Vite.
  - Capture shell logs, screenshots, and functional evidence for native dialogs, updater status, file-system/runtime boundaries, and shell-only paths.
  - Mark any unstartable or unsafe native workflow as `blocked` with exact command/log evidence.
- Graph/tooling gates:
  - Retry GitNexus impact/detect where available before risky symbol edits and before wrap-up.
  - If GitNexus/Serena/ABCoder remain unavailable, record exact tool failure and compensate with narrower diffs, targeted tests, full build, and browser evidence.

## Technical Approach

### Approach A: Inventory-first full-app audit, then domain repair (recommended)

- First build route/control/settings inventory from router, views, Settings schema/store, component directories, and command entries.
- Then audit domain by domain and repair failures.
- Pros: Prevents hidden controls from being skipped; produces durable evidence and a reusable regression matrix.
- Cons: More planning overhead before fixes begin.

### Approach B: Route-by-route manual audit and immediate fixes

- Walk each route in browser, fix as failures appear, then backfill the matrix.
- Pros: Faster early fixes and visible progress.
- Cons: Higher risk of missing hidden/secondary controls and Settings persistence paths.

### Approach C: Static inventory generator plus manual verification

- Build a script to extract routes, components, and common control tags, then manually enrich behavior/state columns.
- Pros: Good for detecting missed controls and future re-runs.
- Cons: Requires careful review because static extraction cannot understand product behavior.

Recommended convergence: use Approach A as the primary workflow and add a lightweight static extraction helper only if the first inventory pass shows too much manual drift.

## Decision (ADR-lite)

**Context**: The user requires a full pass down to every button, component, and Settings item. Prior evidence covers only selected routes and platform export behavior.

**Decision**: Treat this as a full-app inventory and repair task. No implementation success can be claimed until the inventory is complete, failures are fixed or explicitly deferred, and evidence is attached.

**Consequences**: The task may need phased implementation and multiple repair passes. The benefit is that completion will be grounded in concrete artifacts rather than partial route smoke tests.

## Decisions

- Scope boundary: dev-only, hidden, and experimental surfaces are blocking for this task. `DevPanel` and any hidden/feature-flagged controls must be inventoried and verified, not merely noted as non-production evidence.
- Runtime boundary: Tauri native runtime is a blocking acceptance gate. Web/Vite coverage is still required, but native-dependent workflows are not complete until they are proven in the real desktop shell.
- External-provider boundary: unconfigured external services may pass through honest unavailable/needs-configuration behavior. Fake success is always a failure; live success requires real credentials/endpoints.
- Execution shape: keep this as a single end-to-end task. Do not split into Trellis subtasks unless the user later reopens that decision. Use internal execution slices inside this task to control risk.

## Out of Scope

- Marketing/landing-page redesign.
- Broad visual redesign not required to make controls usable and passing.
- Fabricated sample data, mock services, fake publish/upload/sync success, or storage injection proofs.
- Destructive local data cleanup.
- Claiming live platform upload/sync/Tauri native success without real credentials/runtime/toolchain evidence.
- Treating a Web/Vite fallback as completion evidence for a Tauri-native workflow.
- Treating a provider-unconfigured state as successful upload, sync, publish, connect, or update.
- Replacing the app architecture or introducing a new UI system as a shortcut.

## Technical Notes

- Trellis workflow: remain in planning until PRD is confirmed and `implement.jsonl` / `check.jsonl` are curated.
- App package: `inkforge/`.
- Non-mutating lint: `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet`.
- Historical evidence format: `0503/ui-ux-manual-test/test-matrix.md` and `0503/ui-ux-manual-test/evidence.md`.
- Related subdomain task: `.trellis/tasks/05-12-export-platform-rendering-real-capability-audit/`.
- Project frontend specs:
  - `.trellis/spec/frontend/index.md`
  - `.trellis/spec/frontend/directory-structure.md`
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/hook-guidelines.md`
  - `.trellis/spec/frontend/state-management.md`
  - `.trellis/spec/frontend/quality-guidelines.md`
  - `.trellis/spec/frontend/type-safety.md`
- Browser verification research:
  - `.trellis/tasks/05-12-full-app-functionality-audit-repair/research/verification-strategy.md`
