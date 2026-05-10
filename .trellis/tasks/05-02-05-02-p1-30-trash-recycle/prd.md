# P1 Trash Recycle Baseline PRD

## Source Of Truth

- Primary spec: prompts/0420/specs/30-trash-recycle-spec.md
- Dependency specs: prompts/0420/specs/11-document-lifecycle-spec.md, prompts/0420/specs/24-permission-audit-spec.md, prompts/0420/specs/27-performance-slo-spec.md, prompts/0420/specs/29-search-engine-spec.md, prompts/0420/specs/31-version-bundle-spec.md

## Goal

Deliver a real local-first trash/recycle baseline for articles. The baseline must make default article deletion recoverable, persist soft-delete metadata, expose restore/purge/empty/expired cleanup operations, keep normal article lists from showing trashed documents, and provide tests proving that deletes are not permanent until purge.

## Non-Negotiables

- No mock trash rows and no fake restore success.
- Default document delete must become soft delete.
- Purge is irreversible and must remove article/content records.
- Trashed documents must not appear in normal article lists, Hub/FileManager/Drafts computed lists, or default search results.
- Restored documents return to draft, not their previous published/review status.
- Do not build a placeholder TrashBin UI in this slice; expose service/store API and keep UI integration pending unless fully wired.

## Baseline Scope

1. Add `trashed` to the Article status union.
2. Add optional soft-delete metadata to Article schema: `deletedAt`, `expiresAt`, `deletedBy`, `preTrashStatus`.
3. Add Dexie v13 article indexes for trash lookups while preserving existing tables.
4. Add `src/services/trash` with repository operations: list, moveToTrash, restore, purge, empty, purgeExpired, summarize.
5. Add `useTrashStore` with real repository calls and visible state.
6. Change `useArticleStore.deleteArticle` to soft-delete by default while retaining category count and selected article cleanup behavior.
7. Ensure normal article loading filters out trashed records.
8. Add tests for soft delete, restore, purge, expired cleanup, and normal article filtering.

## Out Of Scope For This Slice

- Dedicated TrashBin route/page.
- Batch selection toolbar UI.
- Confirmation modal UI.
- Tauri background cleanup job.
- Asset orphan cleanup integration beyond article/content purge.
- Storage dashboard chart integration.

## Acceptance Criteria

- `deleteArticle(id)` persists `status: trashed` and soft-delete metadata rather than deleting the article row.
- `trashRepository.restore(id)` clears metadata and sets `status: draft`.
- `trashRepository.purge(id)` removes the article and its content row.
- `trashRepository.purgeExpired()` permanently removes only expired trashed documents.
- Normal article repository/store load excludes trashed documents by default.
- Targeted tests, type-check, lint, full Vitest, and build pass.
