# P1 TOC System Baseline PRD

## Source Of Truth
- Primary spec: `prompts/0420/specs/38-toc-system-spec.md`.
- Related specs: `16-markdown-extensions-spec.md`, `35-split-view-spec.md`, `39-sync-scroll-spec.md`, `10-markdown-authority-spec.md`, and existing `OutlinePanel` / `[toc]` markdown extension behavior.
- Current project constraints: no mock/demo headings, no Emoji icons, no deletion of existing outline tab, preview macro, Workstation layout, source-mode, SplitView, or Markdown authority behavior.

## Baseline Goal
Deliver a compatible TOC vertical slice that unifies heading parsing for Markdown and TipTap editor documents, exposes typed TOC service/store state, keeps the existing sidebar outline tab functional, preserves the existing `[toc]` preview macro, and verifies real navigation/state behavior without seeded content.

## In Scope
- Add `services/toc/*` with typed `TocHeading`, parser options, slug/id generation, flat heading extraction, tree building, numbering, Markdown heading parsing, and ProseMirror/Tiptap document parsing.
- Add `useTocStore` with real headings, active heading id, expanded/collapsed state, max-depth and numbering settings, loading/error/last-update state, and service-backed update APIs.
- Refactor `useOutline` internals to use the shared TOC parser/store while preserving the existing return contract for `OutlinePanel`.
- Enhance `OutlinePanel` compatibility where necessary for H1-H6 depth, active item state, collapse state, accessible nav/current item attributes, and real editor jump behavior.
- Keep `[toc]` markdown preview rendering available and validate it against the shared parser expectations without rewriting saved Markdown.
- Add unit tests covering parser, tree construction, numbering, markdown extraction, store behavior, and existing renderer integration.
- Run real typecheck/lint/tests/build and browser smoke on Workstation/preview modules.

## Out Of Scope For This Baseline
- Drag-and-drop chapter reorder.
- TipTap inline TOC atom NodeView and `/toc` slash insertion.
- Export pipeline configurable TOC injection.
- Settings UI for TOC depth/numbering.
- 500-heading virtualization benchmark.
- Full IntersectionObserver scroll-spy and packaged Tauri validation.

## Acceptance Criteria
- Existing Workstation outline tab remains present and uses real editor headings.
- Empty documents produce an empty TOC state; no demo headings are inserted.
- Heading IDs are deterministic for the same text/position and collision-safe for duplicate headings.
- Markdown `[toc]` rendering continues to generate anchors from real Markdown headings and remains source-preserving.
- Store expanded/collapsed state is derived from real heading ids and prunes removed ids after heading updates.
- Clicking sidebar outline entries moves the real TipTap selection to the heading position and calls `scrollIntoView` through editor commands.
- Tests and browser smoke use real parser/store/render/editor modules; no mock product behavior or fake startup rows.
