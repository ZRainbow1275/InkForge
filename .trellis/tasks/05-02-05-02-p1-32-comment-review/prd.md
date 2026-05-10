# P1 Comment Review Baseline PRD

## Source Of Truth

- Primary spec: prompts/0420/specs/32-comment-review-spec.md
- Dependency specs: prompts/0420/specs/01-spec-editor-typora.md, prompts/0420/specs/11-document-lifecycle-spec.md, prompts/0420/specs/24-permission-audit-spec.md, prompts/0420/specs/31-version-bundle-spec.md
- Implementation truth: the current app is local-first Vue/Pinia/Dexie under `inkforge/`. Existing editor surfaces must not be deleted or replaced.

## Goal

Deliver a real local-first Comment Review baseline for Spec 32. The baseline must persist comments, replies, margin notes, and track-change records in IndexedDB; provide deterministic anchor drift handling; write review/comment audit evidence through the existing audit repository; expose service-backed Pinia state; and avoid placeholder UI or seeded review data.

## Non-Negotiables

- No mock comments, fake resolved states, seeded mention rows, placeholder review panels, or simulated track-change success.
- Do not delete or replace existing editor, toolbar, version, permission, or audit modules.
- All persisted rows must pass typed runtime validation before write.
- Comment anchors must be represented as explicit exact/drifted/invalid states instead of silently pretending the old range is still correct.
- Review decisions must use the existing audit action vocabulary where possible: `comment.create`, `comment.resolve`, `comment.delete`, `review.approve`, and `review.request_changes`.
- UI wiring beyond the service/store baseline remains pending unless it is fully connected to persistence and editor decorations.

## Baseline Scope

1. Add typed comment review domain models and zod validation for comments, replies, anchors, margin notes, and track changes.
2. Add Dexie v14 object stores for `comments`, `marginNotes`, and `trackChanges` without deleting or replacing existing tables.
3. Add `src/services/comment-review` with anchor drift, mention parsing, Markdown preview sanitization, track-change helpers, repository operations, and audit logging.
4. Add `useCommentReviewStore` with real async actions for load, create, reply, resolve, delete, margin notes, track changes, and anchor drift refresh.
5. Add targeted tests for anchor exact/drift/invalid states, repository write/update flows, audit attempts, margin notes, track changes, and store state transitions.
6. Add browser IndexedDB smoke proving real module import, real Dexie tables, persisted comment/reply/margin/track-change rows, cleanup, and zero console errors.
7. Update prompts/0420 and `.trellis/spec` with the compatible baseline and pending full UI/editor integration scope.

## Out Of Scope For This Slice

- Full `CommentPanel.vue`, CommentCard, CommentInput, TrackChangesPanel, and MarginNoteTooltip UI.
- Tiptap/ProseMirror decoration extension wiring in the live editor.
- PDF side-note export implementation.
- Multi-user collaboration, assignment deadlines, CRDT/Yjs position mapping, and semantic/LLM reanchoring.
- Full E2E/a11y matrix and 100-comment performance benchmark.

## Acceptance Criteria

- `commentReviewRepository.createComment` persists a pending comment with exact anchor metadata, extracted mentions, replies array, and audit evidence.
- `addReply`, `resolveComment`, and `deleteComment` update the same persisted comment row and preserve typed state transitions.
- `refreshAnchorsForDocument` updates anchors to exact, drifted, or invalid based on old/new text without fabricating success.
- Margin notes are persisted separately from anchored comments and can be listed by document.
- Track changes are persisted and can be accepted or rejected through explicit status transitions.
- `useCommentReviewStore` exposes real loading/mutation/error state and never seeds review rows directly.
- Targeted tests, type-check, lint, full Vitest, build, and browser IndexedDB smoke pass.
