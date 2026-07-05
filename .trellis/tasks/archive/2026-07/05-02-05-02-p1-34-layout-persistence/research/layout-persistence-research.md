# Spec 34 Layout Persistence Research

## Local Findings

- `WorkstationView.vue` already owns runtime layout state for `managerCollapsed`, `stageCollapsed`, `inspectorCollapsed`, `modeLayouts`, `panelWidths`, `editorMode`, and `editorWidth`.
- The current Workstation path persists several preferences through localStorage keys. Spec 34 should add durable IndexedDB layout state without deleting this fallback behavior.
- `useProfileStore` exposes `activeProfileId`; layout persistence should scope records to that profile and use a generated per-window id.
- Current Dexie schema after Spec 33 is v15, so layout state should be an additive v16 store.

## External Verification

### Grok Search

Query: `browser workspace layout preference persistence IndexedDB debounced save schema migration local only profile window best practices 2026`

Findings:

- IndexedDB is appropriate for structured workspace layout state because it is async, queryable, and handles nested records better than localStorage.
- High-frequency layout events should be debounced or merged before persistence to reduce transaction churn.
- Layout schema changes should use explicit versions and idempotent migrations.
- Layout preferences should be scoped by profile/window and remain local-only unless a product explicitly adds sync.
- Deserialized layout data must be sanitized and validated before applying to UI.

### Context7 Dexie / Pinia

Findings reused from Spec 33:

- Dexie additive stores and typed table declarations keep schema upgrades explicit.
- Bulk/transaction operations are preferred for multi-row cleanup.
- Pinia async actions should expose loading/error state and rethrow after state capture.

## Baseline Decision

Implement an additive `layoutStates` Dexie store plus service/store integration. Preserve WorkstationView localStorage fallback and existing visual behavior while making IndexedDB the durable local-first source for restored layout state.