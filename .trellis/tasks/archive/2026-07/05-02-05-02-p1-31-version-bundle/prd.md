# P1 Version Bundle Baseline PRD

## Source Of Truth

- Primary spec: prompts/0420/specs/31-version-bundle-spec.md
- Dependency specs: prompts/0420/specs/17-crash-recovery-spec.md, prompts/0420/specs/11-document-lifecycle-spec.md, prompts/0420/specs/30-trash-recycle-spec.md
- Implementation truth: current editor content versions are embedded in `contents.versions`; legacy `documents/versions` Dexie helpers exist but are not the active Workstation version path.

## Goal

Deliver a real local-first VersionBundle baseline for the current InkForge editor data model. The baseline must create immutable content snapshots, enrich version metadata, preserve milestones during cleanup, provide safe restore proposals that never overwrite the current document directly, export versions as Markdown, and expose a Pinia store backed by real repository calls.

## Non-Negotiables

- No mock versions, fake restore success, seeded demo history, or UI-only state rows.
- Do not delete or replace the existing VersionPanel, useVersionManager composable, editor store, or legacy Dexie helpers.
- Restoration must be proposal-first: compute diff and merged draft outside persistence; commit only through an explicit versioned save path.
- Milestone versions are protected from delete and cleanup.
- Cleanup must keep all milestones plus the newest bounded non-milestone versions.
- The implementation must preserve existing article/content persistence and trash purge semantics.

## Baseline Scope

1. Extend the existing `Version` schema with optional metadata: `deltaChars`, `wordCount`, `isMilestone`, `trigger`, `authorId`, and `updatedAt`.
2. Add `src/services/version-bundle` with typed repository operations over real `contents` rows.
3. Add reusable line-level diff utilities for restore proposals and export evidence.
4. Add `useVersionBundleStore` with service-backed load, snapshot, milestone, cleanup, export, and restore proposal actions.
5. Keep existing editor/createVersion behavior compatible while filling the new metadata when snapshots are created.
6. Add targeted unit tests covering no-change skip, crash recovery force snapshot, milestone retention, protected delete, cleanup, markdown export, and non-mutating restore proposal.
7. Add a browser IndexedDB smoke path proving versions are persisted and restore proposals do not mutate current content.

## Out Of Scope For This Slice

- Full replacement of `VersionPanel.vue` with a new diff/merge UI.
- Moving embedded versions into a new normalized `article_versions` table.
- Tauri before-close native integration.
- Background worker indexing or 2000+ version benchmark.
- Full comment anchor drift and undo-stack integration.

## Acceptance Criteria

- `versionBundleRepository.createVersionIfChanged` skips identical snapshots and persists changed snapshots with metadata.
- `forceCreateVersion` can create a `crash_recovery` checkpoint even when content text is unchanged.
- `buildRestoreProposal` returns left/right diff and proposed content without mutating `contents`.
- `setMilestone` protects a version from delete and cleanup.
- `cleanupVersions` preserves milestones and enforces bounded non-milestone retention.
- `exportVersionMarkdown` returns a real Markdown document with frontmatter and snapshot content.
- Targeted tests, type-check, lint, full Vitest, build, and browser IndexedDB smoke pass.
