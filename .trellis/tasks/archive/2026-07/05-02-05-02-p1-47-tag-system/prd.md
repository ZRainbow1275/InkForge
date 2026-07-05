# P1 Tag System Baseline

## Source Spec

- `prompts/0420/specs/47-tag-system-spec.md`
- Related dependencies: `12-file-manager-spec.md`, `29-search-engine-spec.md`
- Date: 2026-05-02
- Owner: ZRainbow1275

## Goal

Implement a real local-first tag system for InkForge documents. The system must persist tags and document-tag relations in IndexedDB, expose a typed repository and Pinia store, and provide real UI surfaces for assigning, browsing, filtering, managing, merging, and visualizing tags.

This task is not a demo or shell. Every user-facing action must route through the store and repository into the real Dexie database. No mock rows, sample tags, injected localStorage state, or simulated browser operations are allowed.

## Non-Goals

- Do not delete or replace existing `Article.tags`; keep it as a compatibility/search mirror.
- Do not remove existing Hub insights, FileManager, Workstation, Search, or article functionality.
- Do not add a remote sync provider for tags in this slice.
- Do not seed example tags. Existing article tag arrays may be backfilled because they are user data, not mock data.
- Do not introduce emoji icons. Use `lucide-vue-next` or existing CSS/SVG patterns.

## Architecture Contract

Data flow:

`Vue component -> useTagStore action -> tagRepository -> Dexie tags/docTags tables -> articleRepository compatibility mirror -> component refresh`

The IndexedDB relation tables are the authority for tag membership. `Article.tags` remains a denormalized compatibility mirror for existing search/index consumers and legacy data import. Store state is a reactive cache, not the source of truth.

## Required Deliverables

1. Types and schema validation
   - Define strict TypeScript types for tags, document tag relations, filter modes, sort modes, color presets, errors, repository params, and tag cloud nodes.
   - Validate tag names, normalized names, color HEX values, per-document tag limit, duplicate names, and merge inputs at repository boundaries.

2. Database migration
   - Add a new Dexie version after the current latest version without removing existing tables or indexes.
   - Add `tags` and `docTags` tables with indexes for account/name uniqueness checks, document lookups, tag lookups, doc counts, and merge/filter performance.
   - Preserve every existing schema entry in the newest version declaration.

3. Repository
   - Implement a real `TagRepository` backed by Dexie.
   - Support CRUD, relation add/remove, bulk add/remove, AND/OR document filtering, tag merge, orphan cleanup, doc count recalculation, article tag mirror repair, and backfill from existing `Article.tags` arrays.
   - Multi-step writes must run in Dexie transactions.
   - Relation writes must be idempotent.

4. Pinia store
   - Add `useTagStore` with load/create/update/delete/merge/cleanup/search/sort/filter/doc relation actions.
   - Store errors must expose real failure messages without swallowing exceptions silently.
   - Components must not write directly to Dexie or mutate tag relations outside store actions.

5. UI vertical slice
   - Add document tag assignment UI in the workstation path so a real selected article can receive/remove tags.
   - Add reusable tag components: badge, input/autocomplete, browser/filter, manager modal.
   - Add a Tag Browser surface that lists real tags with doc counts, supports AND/OR filtering, and opens/selects real matching documents.
   - Update Hub tag cloud to read real tag records/doc counts through the tag store/repository and handle the empty state honestly.
   - Add manager operations for rename/color update, delete, merge, and cleanup with explicit user feedback.

6. Documentation/spec update
   - Update `.trellis/spec/frontend/state-management.md`, `.trellis/spec/frontend/type-safety.md`, and `.trellis/spec/frontend/quality-guidelines.md` with the new tag-system contracts.
   - Record MCP transport failures if GitNexus/Serena remain unavailable.

## Acceptance Criteria

- Creating a tag from the UI writes a real `tags` record and displays it without refresh.
- Assigning/removing a tag from an existing article writes/removes a real `docTags` relation, updates `docCount`, updates the article compatibility `tags` array, and survives refresh.
- Duplicate names are rejected case-insensitively per account.
- Empty names, names with spaces, names longer than 50 characters, invalid colors, and the 21st document tag are rejected with business-level errors.
- AND filtering returns only documents containing every selected tag; OR filtering returns documents containing any selected tag.
- Merge moves source relations to target atomically, avoids duplicate document relations, deletes source tags, and recalculates target counts.
- Cleanup only deletes tags with `docCount === 0` for the active account.
- Tag cloud shows the top real tags by `docCount`, not mock/sample data.
- Full validation passes: targeted tag tests, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build`.
- Browser smoke uses a real local article and verifies create, assign, filter, manager operation, refresh persistence, and zero console errors.

## Implementation Notes

- Use `DEFAULT_ACCOUNT_ID` until a wider account-selection contract is already present in the target UI path.
- Keep `docTags` as the TypeScript/Dexie table name while documenting that it implements the spec's `doc_tags` relation table.
- Prefer reusable helper functions over duplicating validation and normalization logic in components.
- If existing code contains mojibake text in touched files, fix only the directly touched labels and do not reformat entire files.
## Implementation Notes - 2026-05-02

- Added a real `src/services/tag-system` repository layer with strict validation, Dexie transactions, relation idempotency, merge, cleanup, `docCount` repair, `Article.tags` mirror repair, and backfill from existing user-authored article tags.
- Added Dexie v19 with `tags` and `docTags` stores. The runtime smoke found and fixed a duplicate-index schema bug by keeping `docId` and `tagId` only once in the `docTags` declaration while preserving compound `[docId+tagId]` and `[tagId+docId]` indexes.
- Added `useTagStore` as the only UI-facing mutation path for tag actions. Components render store state and action results but do not mutate Dexie directly.
- Added Workstation tag surfaces: reusable badge/input/browser/manager components, a Tags manager tab, assignment/removal UI for the selected real article, OR/AND filtering, and manager rename/color/delete/merge/cleanup actions.
- Updated Hub insights tag cloud to read real `tagStore.tagCloudNodes` and show an honest empty state when no tag rows exist.
- Extended layout persistence manager-tab typing to include `tags`, so Workstation can save the new manager tab without type drift.
- Kept all changes additive. No existing feature, module, component, table, or legacy `Article.tags` mirror was removed.

## Validation Notes - 2026-05-02

- `pnpm vitest run src/services/tag-system/tag-system.test.ts` passed: 13 tests.
- `pnpm vitest run src/services/tag-system/tag-system.test.ts src/services/snippet/snippet.test.ts` passed: 24 tests.
- `pnpm vitest run src/services/layout-persistence/layout-persistence.test.ts` passed: 8 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm lint` passed with 0 errors and 8 pre-existing warnings outside the tag-system change scope.
- `pnpm vitest run` passed: 26 files, 183 tests.
- `pnpm build` passed. Vite reported existing dynamic/static import and large chunk warnings, but no build failure.
- Browser smoke on `http://127.0.0.1:3005` used real UI actions and IndexedDB: created a real local article, created and assigned tags, verified read-only IndexedDB `tags`/`docTags`/`articles.tags` evidence, tested OR and AND filters, manager rename/color/delete/merge/cleanup, refreshed for persistence, verified Hub TagCloud displayed a real tag, removed the relation, cleaned one orphan tag, and confirmed zero new console errors after clearing pre-fix logs.
- GitNexus impact/detect and Serena activation remained unavailable with `Transport closed`; this task compensated with narrow edits, targeted tests, full gates, production build, and real browser smoke evidence.
