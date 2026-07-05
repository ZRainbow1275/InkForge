# P1 FileManager Baseline PRD

## Context

This task continues `prompts/0420` after the completed Spec 10 Markdown Authority baseline and Spec 11 Document Lifecycle baseline.
The source of truth is `prompts/0420/specs/12-file-manager-spec.md`, with lifecycle status semantics from `prompts/0420/specs/11-document-lifecycle-spec.md`.

The existing `inkforge/src/components/file/FileManager.vue` already provides a real-data sidebar backed by `articleStore`, `categoryStore`, and `assetStore`. This task must preserve all existing capabilities: article/category creation, file import, article selection, category grouping, context menus, rename, move, delete confirmation, and asset display.

## Goals

1. Add a spec-compatible baseline for FileManager view modes without introducing a parallel store or replacing the existing component.
2. Support real `tree`, `flat`, and `recent` views driven by existing article/category data.
3. Add sorting controls for `updatedAt`, `createdAt`, `title`, and `status`, with deterministic direction handling.
4. Add lifecycle-aware SmartFolder-style status filters for all, draft/writing, review, ready-to-publish, and completed documents.
5. Persist view mode, sort field, sort direction, status filter, and folder expansion state to browser `localStorage` with defensive parsing.
6. Keep all icons as existing SVG/lucide-compatible components; do not add emoji icons.
7. Validate with real type-check, lint, build, and browser runtime checks. No mock data and no simulated success claims.

## Non-Goals For This Baseline

1. Full virtual scrolling for 1000+ nodes is not completed in this slice.
2. Multi-select and bulk action bar are not completed in this slice.
3. SmartFolder repository/table persistence is not introduced in this slice.
4. Drag-and-drop ordering is not introduced in this slice.
5. Trash TTL and archive repository integration remain owned by their dedicated specs.
6. Full keyboard navigation matrix is not completed in this slice.

## Acceptance Criteria

1. Existing FileManager CRUD/import/context-menu behavior remains available.
2. Tree view continues to group real articles by real categories, with uncategorized support.
3. Flat view shows all filtered articles in one real list.
4. Recent view shows the latest real articles by `updatedAt` descending, independent of manual sort direction.
5. Sort field and direction controls update the rendered order for tree and flat views.
6. Status filters use real article lifecycle statuses and reuse lifecycle helpers from `src/core/lifecycle`.
7. SmartFolder counts are computed from real `articles` state.
8. Preferences are read defensively and persisted as a typed object under `inkforge:file-manager:prefs:v1`.
9. Invalid persisted preference JSON does not crash the component.
10. The UI contains no emoji icons.
11. `pnpm exec vue-tsc --noEmit` passes in `inkforge/`.
12. `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passes in `inkforge/`.
13. `pnpm build` passes in `inkforge/` except for pre-existing chunk-size warnings.
14. Browser runtime verification opens the real app and confirms FileManager renders without console errors.
15. `prompts/0420/specs/12-file-manager-spec.md` and `prompts/0420/acceptance-matrix.md` are updated to record the baseline truth without overstating full spec completion.

## Implementation Notes

- Keep this as an incremental component enhancement.
- Prefer existing stores, existing status helpers, and existing styling language.
- Do not introduce new dependencies for a single component preference layer.
- Do not use mock fixtures; any browser validation must create and clean real local IndexedDB records through the app/store if data is needed.

## Completion Evidence

- `pnpm exec vue-tsc --noEmit` passed in `inkforge/`.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed in `inkforge/`.
- `pnpm build` passed in `inkforge/`; only the pre-existing Vite chunk-size warning remains.
- Browser runtime validation opened `http://127.0.0.1:5176/workstation` and confirmed FileManager controls render with no console errors.
- Runtime validation created 5 real IndexedDB articles through the active Pinia `articleStore`, covering `draft`, `writing`, `under_review`, `ready_to_publish`, and `published`, then cleaned them back out.
- Validation confirmed SmartFolder counts, draft/writing filtering, flat/recent switching, persisted preference JSON, and invalid preference JSON recovery.
