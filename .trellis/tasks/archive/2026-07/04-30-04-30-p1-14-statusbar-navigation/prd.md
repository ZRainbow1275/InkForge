# P1 StatusBar Navigation Baseline PRD

## Context

This task continues `prompts/0420` after Spec 13 Workstation Layout baseline. The source of truth is `prompts/0420/specs/14-statusbar-navigation-spec.md`, with lifecycle semantics from `prompts/0420/specs/11-document-lifecycle-spec.md`.

The current runtime already has an inline document status badge in `EditorStatusBar.vue`; `WorkstationView.vue` listens to `open-document-status`, flushes pending editor changes, and then routes draft-like documents to Drafts while other documents return to Hub. This task preserves that contract and extends status display to the target lifecycle states.

## Goals

1. Make `EditorStatusBar` display all current article lifecycle statuses, including `writing`, `under_review`, `ready_to_publish`, `published`, and `archived`.
2. Reuse `src/core/lifecycle` label/class/draft-box helpers instead of duplicating a partial status map.
3. Preserve existing navigation behavior and flush-before-navigation safety.
4. Validate with type-check, lint, build, and browser runtime checks. No mock data.

## Non-Goals For This Baseline

1. Status transition menu is not implemented in this slice; the badge remains a navigation entry.
2. Notification bell, independent ZoomControl, Sonner toast stack, TabBar drag/pin/preview, and close-confirm flows are not completed in this slice.
3. A new `DocumentStatusBadge` component is not extracted in this slice.

## Acceptance Criteria

1. Existing status bar statistics, goal pill, mode switch, width control, settings entry, sync state, save status, render time, and cursor state remain available.
2. Status badge renders lifecycle labels through `getArticleStatusLabel`.
3. Status badge class uses `getArticleStatusClass` with existing status bar CSS compatibility.
4. Draft-like statuses still route to Drafts through existing `isDraftBoxStatus` logic in Workstation.
5. Other statuses still route to Hub after flush.
6. `pnpm exec vue-tsc --noEmit` passes in `inkforge/`.
7. `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passes in `inkforge/`.
8. `pnpm build` passes in `inkforge/`, except for known chunk-size warnings.
9. Browser runtime validation confirms multiple lifecycle badge labels render without console errors.
10. `prompts/0420/specs/14-statusbar-navigation-spec.md` and `prompts/0420/acceptance-matrix.md` are updated to record baseline truth without marking full spec completion.

## Completion Evidence

- `pnpm exec vue-tsc --noEmit` passed in `inkforge/`.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed in `inkforge/`.
- `pnpm build` passed in `inkforge/`; only the pre-existing Vite chunk-size warning remains.
- Browser runtime validation created 6 real IndexedDB articles through the active Pinia `articleStore`, covering `draft`, `writing`, `under_review`, `ready_to_publish`, `published`, and `archived`, then cleaned them back out.
- Runtime validation confirmed status badge text, class, title, and no console errors.
