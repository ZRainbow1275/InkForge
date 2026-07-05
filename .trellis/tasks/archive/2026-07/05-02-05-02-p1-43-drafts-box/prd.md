# P1 Drafts Box Batch Management Baseline

## Goal

Extend the existing real `/drafts` page into a more complete Drafts Box baseline without replacing the current article lifecycle or creating a parallel draft data source.

## Source Specs

- `prompts/0420/specs/43-drafts-box-spec.md`
- `prompts/0420/specs/11-document-lifecycle-spec.md`
- `prompts/0420/specs/12-file-manager-spec.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/frontend/quality-guidelines.md`

## Implementation Scope

- Preserve the existing `/drafts` route, Hub entry points, Workstation status badge entry, and `articleStore` as the only source of truth.
- Add Drafts Box view mode switching between list and grid using the existing filtered draft collection.
- Add a real preview/peek panel driven by the active draft item and existing article content fields.
- Add selected-draft state, select-all-visible behavior, and a batch action toolbar.
- Implement real batch status updates for archive and ready-to-publish through `articleStore.updateArticle()`.
- Add one-step undo for the latest batch status update using captured previous statuses, again through `articleStore.updateArticle()`.
- Keep all UI states based on real local articles; do not seed demo drafts or simulate success.

## Non-Goals

- Do not introduce a parallel `useDraftsStore` in this baseline.
- Do not change repository schema or Dexie tables.
- Do not implement quick-note capture, sidebar badge persistence, command palette command, or settings-backed draft preferences yet.
- Do not delete existing DraftsView sections, Hub entries, lifecycle helpers, or article status compatibility behavior.

## Acceptance Criteria

- `/drafts` can toggle list/grid rendering without changing the underlying filtered draft set.
- Hover/focus on a real draft shows a preview panel with title, metadata, excerpt, category/tags, and stale/recent signal.
- Selecting visible drafts exposes batch actions and select-all-visible state.
- Batch archive updates selected draft statuses to `archived` and removes them from the Drafts Box list.
- Batch ready-to-publish updates selected draft statuses to `ready_to_publish` and removes them from the Drafts Box list.
- Undo latest batch restores captured previous statuses through the same article store update path.
- Type-check, lint, targeted checks, full tests/build, browser smoke, BOM scan, emoji scan, and Trellis context validation pass or any unrelated existing warning is documented.