# P1 Layout Persistence Baseline PRD

## Source Of Truth

- Primary spec: prompts/0420/specs/34-layout-persistence-spec.md
- Dependency specs: prompts/0420/specs/13-workstation-layout-spec.md, prompts/0420/specs/14-statusbar-navigation-spec.md, prompts/0420/specs/18-tauri-desktop-spec.md, prompts/0420/specs/26-multi-account-profile-spec.md
- Implementation truth: `WorkstationView.vue` already has manager/stage/inspector runtime state and localStorage fallback keys; this baseline must not remove that behavior.

## Goal

Deliver a real local-first Layout Persistence baseline: profile/window-scoped layout state persisted to IndexedDB, layout version migration, debounced and immediate save paths, stale cleanup, sync-exclusion contract, Pinia store, targeted tests, and browser IndexedDB smoke.

## Non-Negotiables

- No mock layout records, seeded UI preferences, or simulated restore success.
- Do not delete the existing Workstation panels, editor modes, shortcuts, presets, localStorage fallback, or visual behavior.
- Layout state is local-only and must not be included in sync payloads.
- Persisted records are scoped by both `profileId` and `windowId`.
- All records must pass typed validation before write.

## Baseline Scope

1. Add Dexie v16 `layoutStates` store without deleting existing tables.
2. Add `src/services/layout-persistence` with schema, defaults, migration, keying, save/load/clear, debounced scheduleSave, stale cleanup, tab validation, and sync-excluded table constants.
3. Add `useLayoutPersistenceStore` with real async initialize/load/save/schedule/clear/cleanup state.
4. Wire WorkstationView minimally to restore and persist its existing manager/stage/inspector/editor mode/editor width/panel width state through the store while preserving existing localStorage fallback.
5. Add targeted tests covering save/load/clear, profile/window isolation, migration, debounce, stale cleanup, invalid tab filtering, sync exclusion, and store state.
6. Add browser IndexedDB smoke proving real v16 writes, restore, migration, cleanup, and zero console errors.

## Out Of Scope For This Slice

- Tauri plugin-window-state integration for native outer window geometry.
- Cross-device sync of layout state.
- Full tabbed-document UI beyond validating serialized tab inputs.
- Settings UI for manual layout cleanup.
- Multi-window E2E automation with real Tauri windows.

## Acceptance Criteria

- `layoutStates` persists one record per `{profileId}:{windowId}` key.
- `initialize(profileId, windowId)` loads, migrates, and saves older records when needed.
- `save()` writes validated layout records and clamps widths/zoom values.
- `scheduleSave()` debounces high-frequency resize writes.
- `clear()` removes only the current profile/window record.
- `cleanupStaleLayouts()` removes non-current stale records older than 30 days.
- `validateSerializedTabs()` removes deleted or invalid article tabs and clears invalid active tab ids.
- `SYNC_EXCLUDED_LAYOUT_TABLES` includes `layoutStates`.
- Targeted tests, type-check, lint, full Vitest, build, and browser IndexedDB smoke pass.