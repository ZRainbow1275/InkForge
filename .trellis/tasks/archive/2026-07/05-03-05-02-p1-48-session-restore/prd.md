# P1 Session Restore Baseline

## Source Spec

- `prompts/0420/specs/48-session-restore-spec.md`
- Related dependencies: `45-tabbar-enhancement-spec.md`, `35-split-view-spec.md`, `38-toc-system-spec.md`, `34-layout-persistence-spec.md`
- Date: 2026-05-02
- Owner: ZRainbow1275

## Goal

Implement a real local-first session restore baseline that persists Workstation tab state, active document, panel/layout state, editor mode/width, split-view state, and restore metadata in IndexedDB through the existing Dexie-backed layout persistence path.

This task must not create mock tabs, sample documents, localStorage-only proof, or a parallel session implementation that conflicts with existing `workstationTabs` and `layoutPersistence`. It should extend the existing architecture so session restore is durable beyond `sessionStorage` while keeping document content restoration delegated to the existing article/editor stores.

## Non-Goals

- Do not overwrite or edit article body content as part of session restore.
- Do not remove existing sessionStorage tab fallback until IndexedDB restore is verified.
- Do not introduce remote sync for session metadata.
- Do not add demo tabs, demo documents, or fake restore rows.
- Do not perform large Workstation restructuring.

## Architecture Contract

Primary flow:

`Workstation events -> useWorkstationTabsStore + layoutPersistenceStore.scheduleSave -> LayoutPersistenceService -> Dexie layoutStates -> Workstation startup restore -> validate real articles -> open tab skeletons -> select active article`

The existing `layoutStates` table is the project-integrated IndexedDB session_state implementation for this slice. `sessionStorage` remains a short-lived fallback/cache for current-tab interaction, but durable restore evidence must come from IndexedDB `layoutStates`.

## Required Deliverables

1. Durable tab snapshot
   - Save ordered tabs, pinned state, active tab id, and active article id into layout persistence records.
   - Save only real article ids/titles already known to the Workstation tab store.
   - Preserve the existing LRU max-tab behavior.

2. Restore pipeline
   - On Workstation startup, load the layout record for the active profile/window.
   - Validate persisted tabs against real article ids before restoring.
   - Restore tab skeletons and active article without fabricating missing documents.
   - If a persisted active article no longer exists, fall back to the first valid tab or empty Workstation state.

3. Lifecycle persistence
   - Continue debounced saves for routine layout changes.
   - Add final best-effort flush on `pagehide` and `visibilitychange` because async `beforeunload` is not reliable.
   - Keep restore failure non-blocking and log a warning instead of crashing startup.

4. Tests
   - Extend layout persistence/workstation tab tests to cover IndexedDB-backed open tabs, active tab restore, deleted-article filtering, and manager tab `tags` compatibility.
   - Keep existing tab sessionStorage tests passing.

5. Documentation/spec update
   - Update `.trellis/spec/frontend/state-management.md`, `.trellis/spec/frontend/type-safety.md`, and `.trellis/spec/frontend/quality-guidelines.md` with SessionRestore contracts.
   - Record MCP transport limitations if GitNexus/Serena remain unavailable.

## Acceptance Criteria

- Opening real documents in Workstation writes a layout record whose `openTabs`, `tabOrder`, `activeTabId`, and `activeArticleId` match real article ids.
- Refreshing Workstation restores the tab list and active article from IndexedDB layout state even when the in-memory store is recreated.
- Deleting or missing article ids are filtered out during restore; no blank fake tab is created.
- `pagehide` or hidden `visibilitychange` triggers a best-effort flush of pending layout state.
- Session restore never writes or replaces article body content.
- `pnpm vitest run src/services/layout-persistence/layout-persistence.test.ts src/stores/workstationTabs.test.ts` passes.
- `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build` pass.
- Browser smoke uses real UI-created articles and verifies tab restore after refresh with zero new console errors.

## Implementation Notes

- Prefer extending `LayoutStateRecord.openTabs` instead of adding another Dexie table, because the project already has a profile/window scoped IndexedDB layout persistence service.
- `beforeunload` may be used only as an extra trigger. Durable final persistence must use `pagehide` and hidden `visibilitychange` when available.
- Keep restore scoped to current `profileStore.activeProfileId ?? DEFAULT_PROFILE_ID` and current `layoutPersistenceService.currentWindowId`.

## Implementation Notes - Completed

- Implemented SessionRestore through the existing Dexie-backed `layoutStates` table. No parallel `session_state` table was added.
- Added `useWorkstationTabsStore.serializeForLayout()` to export ordered durable tab skeletons as `SerializedTab[]`.
- Added `useWorkstationTabsStore.restoreFromLayout()` to hydrate Workstation tab skeletons from validated layout snapshots while preserving the existing sessionStorage fallback.
- Extended `WorkstationView.captureLayoutPersistencePatch()` so routine layout saves persist `openTabs`, `tabOrder`, `activeTabId`, and `activeArticleId` together with manager/editor/split-view state.
- Extended Workstation startup restore so `LayoutPersistenceService.validateSerializedTabs()` filters persisted tabs against real `articleStore.articles` before store hydration. Missing/deleted article ids are logged and not fabricated.
- Restore selects only an existing article id; it does not write, repair, or replace article body content.
- Added best-effort final flush handlers for `pagehide`, hidden `visibilitychange`, and component unmount. Failures are caught and logged instead of blocking startup or navigation.
- Added tests for durable layout serialization, restore active fallback, pinned ordering, IndexedDB `openTabs/tabOrder/activeTabId/activeArticleId`, and `managerTab: tags` compatibility.
- Updated frontend Trellis specs: state management, type safety, and quality guidelines now include SessionRestore contracts.

## Validation Notes - Completed

- Targeted tests: `pnpm vitest run src/stores/workstationTabs.test.ts src/services/layout-persistence/layout-persistence.test.ts` -> 2 files / 17 tests passed.
- Type check: `pnpm exec vue-tsc --noEmit` -> passed.
- Lint: `pnpm lint` -> passed with 0 errors and the existing 8 warnings.
- Full tests: `pnpm vitest run` -> 26 files / 186 tests passed.
- Build: `pnpm build` -> passed; existing Vite dynamic/static import and large chunk warnings remain.
- Browser smoke: launched `http://127.0.0.1:3005`, skipped FTUE without creating examples, created real local articles through UI shortcuts/actions, opened two real Workstation tabs, pinned the active tab, switched manager to Tags, verified read-only IndexedDB `layoutStates` contained two real `openTabs`, matching `tabOrder`, `activeTabId`, `activeArticleId`, and `managerTab: tags`; refreshed the page and confirmed the tabbar restored both tabs, the active pinned tab, active route id, and Tags manager state. After clearing earlier transient Vite HMR connection noise and waiting, no new console errors were present.
- Tooling limitation: Serena, ABCoder, and GitNexus continued to return `Transport closed`; GitNexus `detect_changes` could not be honestly completed. Compensation used narrow diffs, targeted tests, full static/test/build gates, and real browser smoke.
