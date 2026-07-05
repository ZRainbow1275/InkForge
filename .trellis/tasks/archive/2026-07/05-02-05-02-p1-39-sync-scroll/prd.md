# P1 Sync Scroll Baseline PRD

## Source Of Truth
- Primary spec: `prompts/0420/specs/39-sync-scroll-spec.md`.
- Related specs: `35-split-view-spec.md`, `38-toc-system-spec.md`, and current SplitView / TOC implementation tasks.
- Current implementation surface: `inkforge/src/views/WorkstationView.vue`, `inkforge/src/components/editor/EditorPanel.vue`, `inkforge/src/components/editor/MarkdownPreview.vue`, `inkforge/src/services/toc/*`, and `inkforge/src/stores/toc.ts`.
- Standing constraints: no mock/demo content, no Emoji glyphs, no deletion of existing Workstation panels, Preview mode, SplitView persistence, TOC outline, or Markdown preview features.

## Baseline Goal
Deliver a real bidirectional synchronized scrolling vertical slice for Workstation SplitView. The implementation must replace the current ratio-only fallback with heading-anchor mapping built from the real TipTap document and the real rendered Markdown preview DOM, while preserving the existing SplitView toggle, resize separator, sync-scroll opt-out, layout persistence, and responsive fallback.

## In Scope
- Add `services/sync-scroll/*` with typed anchors, DOM offset helpers, anchor registry, scroll interpolation algorithms, loop detection, and image/resize observer helpers.
- Add `useSyncScroll` Vue composable that owns listener lifecycle, RAF throttling, anchor rebuild scheduling, observer cleanup, and bidirectional loop prevention.
- Reuse `useTocStore` headings for anchor ids/positions and refresh those headings from the real `EditorPanel` TipTap editor before rebuilds.
- Expose the real editor scroll container from `EditorPanel` so Workstation does not rely on a non-scrolling wrapper.
- Wire Workstation SplitView left editor pane and right preview content pane to `useSyncScroll` using the real `MarkdownPreview :markdown="normalizedBody"` output.
- Keep `splitViewSyncScroll` as the persisted user-visible opt-out. Re-enabling it should run a one-shot left-to-right alignment.
- Use installed icon/inline SVG only; no Emoji glyphs.
- Add unit tests for anchor interpolation, top/bottom behavior, no-anchor ratio fallback, loop detection, scroll-behavior immediate assignment, and observer cleanup-safe behavior.
- Update docs/spec ledgers and acceptance matrix with current baseline truth and explicit deferred full-spec items.

## Out Of Scope For This Baseline
- Paragraph-level secondary anchors for heading-sparse documents.
- Full 50k-document FPS benchmark report.
- Toast UI for automatic loop-disable warnings.
- iframe preview `postMessage` support.
- VersionHistory historical-preview sync and diff-view sync disabling UI.
- Packaged Tauri validation.

## Acceptance Criteria
- SplitView sync-scroll uses real editor headings and rendered preview headings when anchors exist, not simple total-height percentage mapping.
- Documents without matching anchors fall back to proportional scrolling without crashing.
- Bidirectional scroll sync is RAF-throttled and prevents feedback loops.
- Image and container size changes schedule anchor rebuilds through real observers when available.
- The right preview scroll target is the actual preview content scroll container, not a dead wrapper.
- `splitViewSyncScroll=false` removes synchronization behavior while leaving both panes independently scrollable.
- Existing SplitView persistence fields and toggle UI continue to work.
- Tests, typecheck, lint, build, and browser smoke run against real modules with no seeded product data or simulated startup success.

## No Mock Rule
Product code must not seed fake articles, fake headings, fake anchors, or fake preview content. Tests may construct DOM fixtures to verify deterministic sync-scroll logic, but Workstation must consume the active editor, active article content, TOC store, and rendered Markdown preview.