# P1 Dev Panel Baseline PRD

## Objective

Deliver a production-retained, hidden-activation DevPanel baseline for InkForge that exposes real local diagnostics without mocks or seeded data. The baseline must preserve the existing Settings, Command Palette, Workstation, Diagnostic Logging, Performance SLO, and IndexedDB flows.

## Scope

- Add a persistent Settings > About/Advanced Developer Mode switch backed by the existing settings store.
- Add temporary session activation through a Ctrl+Shift+D triple press within 500ms, plus a URL/query or Tauri argument compatible startup force path.
- Add Command Palette command Developer: Toggle Panel that only opens the panel after Developer Mode is enabled or session activation has happened.
- Lazy-load a production-retained bottom drawer DevPanel from the App root, with seven fixed tabs: Editor, ProseMirror, Stores, Performance, Events, IndexedDB, Network.
- Connect the panel to real data sources: active TipTap editor, ProseMirror state, Pinia root state, ActivityLogger records/events, Performance SLO repository, Dexie schema/table counts, and captured HTTP/Tauri diagnostics ring buffers.
- Keep dangerous actions read-only by default. Store primitive edits require confirmation and write dev.store.patch; IndexedDB mutation is not part of the baseline and must remain disabled with an explicit reason.
- Redact URL query secrets, headers, request/response bodies, and sensitive object fields before showing/exporting diagnostics.
- Do not remove or replace existing modules. Do not introduce emoji glyphs.

## Out of Baseline Scope

- Full IndexedDB row edit/delete/writeback.
- Floating panel mode and drag-resize persistence beyond drawer height control.
- ProseMirror transaction diff view backed by diff-match-patch.
- Tauri IPC blanket interception for direct imports outside the shared wrapper.
- Playwright artifact capture and packaged Tauri validation.
- CPU/memory formal benchmark report.

## Acceptance Criteria

1. DevPanel is not mounted on normal startup and is loaded through dynamic import after activation.
2. Persistent Developer Mode, session triple-press activation, and command palette toggle all work against real state.
3. Opening and closing the panel writes dev.panel.open and dev.panel.close through ActivityLogger.
4. Editor and ProseMirror tabs reflect the current active TipTap editor when one exists and show a truthful unavailable state otherwise.
5. Store tab lists real Pinia store ids from pinia.state.value; primitive edits require confirmation and write ActivityLogger evidence.
6. Events tab reads real ActivityLogger rows and the in-memory event bus, with bounded 200/s intake and sampling above the limit.
7. IndexedDB tab reads the real Dexie tables, row counts, indexes, and paged rows without eval.
8. Network tab reads real captured fetch/Tauri wrapper events with redaction and ring-buffer bounds.
9. Tests cover activation, redaction, ring buffer, IDB query guardrails, and store primitive patching helpers.
10. Type-check, lint, targeted tests, full tests, build, Trellis validation, BOM/trailing whitespace/emoji scan, and browser smoke are run or blockers are recorded truthfully.
