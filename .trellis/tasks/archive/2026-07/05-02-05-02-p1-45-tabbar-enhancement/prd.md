# P1 TabBar Enhancement Baseline

## Goal

Add a real Workstation document TabBar baseline that upgrades the current single-document route experience into a visible session tab strip, while preserving the existing Workstation, article store, editor autosave, FileManager, layout persistence, and route `id` behavior.

## Source Specs

- `prompts/0420/specs/45-tabbar-enhancement-spec.md`
- `prompts/0420/specs/11-document-lifecycle-spec.md`
- `prompts/0420/specs/35-split-view-spec.md`
- `prompts/0420/specs/48-session-restore-spec.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/frontend/quality-guidelines.md`

## Implementation Scope

- Add a typed Pinia-backed Workstation tab session model using real article ids and titles only.
- Open/sync tabs from the current Workstation route and article selection; no seeded sample tabs.
- Render a top Workstation TabBar that supports active selection, close, close current with `Ctrl+W`, cycle with `Ctrl+Tab` / `Ctrl+Shift+Tab`, direct `Ctrl+1..9`, pin/unpin, restore recently closed, and same-window drag reorder.
- Represent current save state from the real editor store: active tab shows clean/saving/error status from `editorStatus`; inactive tabs remain clean unless later store state proves otherwise.
- Persist tab order/pinned/recently-closed state to real `sessionStorage` for session-scope continuity without changing Dexie schema or full Spec 48 session restore.
- Keep Workstation route query synchronized when switching tabs.
- Add unit coverage for tab store ordering, pinning, LRU limit, close/restore, and active-tab fallback.
- Add a browser smoke path that creates real local drafts through Hub, opens Workstation, and verifies the TabBar without fake content.

## Non-Goals

- Do not implement cross-window Tauri tab dragging in this baseline.
- Do not implement full dirty-state conflict dialog beyond real saving/error guardrails because the existing editor autosaves immediately and does not expose a durable dirty flag.
- Do not change Dexie schemas, layout persistence schema, editor content repository schema, or the FileManager tree model.
- Do not create mock tabs, sample documents, simulated saved states, or emoji glyph icons.

## Acceptance Criteria

- Opening a Workstation document creates or refreshes a real tab for that article.
- Switching a tab selects the real article and updates `/workstation?id=...`.
- Closing the active tab selects a remaining real tab, or returns to Hub if no tabs remain.
- Pinned tabs render before regular tabs, hide ordinary close affordance, and can be unpinned.
- Drag/drop reorders tabs inside the current window and keeps pinned tabs in the pinned group.
- Keyboard shortcuts work without deleting browser state: `Ctrl+Tab`, `Ctrl+Shift+Tab`, `Ctrl+1..9`, `Ctrl+W`, `Ctrl+Shift+T`.
- The active tab status reflects real editor `ready`/`saving`/`error` state, with no fake dirty indicator.
- Store tests, type-check, lint, full tests/build, browser smoke, BOM scan, emoji scan, whitespace scan, and Trellis validation pass or existing unrelated warnings are documented.

## Implementation Notes

- Added src/stores/workstationTabs.ts as the Pinia session model for real article-backed Workstation tabs. It persists only to sessionStorage and validates persisted payloads before use.
- Added src/components/workstation/WorkstationTabBar.vue as the top Workstation tab strip with active selection, pinned tabs, close controls, restore control, horizontal wheel scrolling, middle-click close, and HTML5 drag/drop reorder.
- Connected WorkstationView to articleStore.selectedArticleId, /workstation?id=..., editorStatus, and the TabBar store without changing Dexie schemas or the existing FileManager/EditorPanel data pipeline.
- Added src/stores/workstationTabs.test.ts covering tab open/refresh persistence, pin grouping, close fallback, restore, Ctrl+9 mapping, LRU limit, and corrupt sessionStorage handling.

## Validation Notes

- pnpm vitest run src/stores/workstationTabs.test.ts: passed, 6 tests.
- pnpm exec vue-tsc --noEmit: passed.
- pnpm lint: passed with 8 pre-existing warnings and no errors after fixing the new WheelEvent lint error.
- pnpm vitest run: passed, 24 files and 164 tests.
- pnpm build: passed; Vite reported existing chunking/chunk-size warnings only.
- python .trellis/scripts/task.py validate 05-02-05-02-p1-45-tabbar-enhancement: passed with 7 implement context entries and 7 check context entries.
- BOM, emoji, and trailing-whitespace scan: passed for the new TabBar store, tests, component, Workstation integration, updated specs, and task docs.
- Browser smoke on http://127.0.0.1:3005/: passed. The real Hub welcome overlay was skipped, two real blank drafts were created through the visible Hub UI, /workstation?id=... loaded real Article ids, .workstation-tabbar rendered real article titles with role=tablist/role=tab semantics, pin/unpin worked, close returned to Hub when no tabs remained, restore became available with an active tab and restored the previously closed real article tab, and browser console errors remained empty.
- GitNexus/Serena MCP note: impact/detect and Serena symbol routing were attempted, but metamcp returned Transport closed; this task therefore records the limitation explicitly instead of claiming those MCP checks passed.
