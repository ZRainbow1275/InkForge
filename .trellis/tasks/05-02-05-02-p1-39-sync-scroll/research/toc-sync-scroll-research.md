# Sync Scroll Research Notes

## Local Findings
- Existing Spec 35 SplitView already persists `splitViewSyncScroll`, but `WorkstationView.syncSplitScroll()` uses a simple total-height ratio. Spec 39 requires anchor-based semantic mapping.
- The left pane's real scroll container is inside `EditorPanel` (`.editor-scroll`), not the outer Workstation split wrapper. Workstation needs an exposed DOM getter.
- The right pane's real scroll target is the preview content area that contains `MarkdownPreview`, not the `<aside>` wrapper with the toolbar.
- Spec 38 TOC implementation provides `TocHeading.domId` and `TocHeading.pos`; these can be reused to match TipTap heading DOM nodes with rendered Markdown heading ids.

## External Verification
- Grok Search (2026-05-02): current dual-pane editor guidance favors anchor/row mapping over percentage-only scrolling because editor and rendered preview heights diverge. It also recommends `requestAnimationFrame`, an explicit syncing flag, `ResizeObserver`, and `scrollTo`/`scrollTop` with `behavior: 'auto'` for programmatic alignment.
- Context7 Tiptap docs: custom behavior can use `editor.view` and editor lifecycle/update hooks; ProseMirror plugin views and editor events are supported extension points. For this baseline, a Vue composable can consume `editor.view.nodeDOM(pos)` without adding another Tiptap extension.
- DeepWiki and Exa MCP attempts returned `Transport closed`; no result was used from those tools.

## Implementation Decision
- Use heading anchors for Phase 1, backed by TOCStore. This satisfies the spec's required baseline and avoids inventing paragraph-level maps before the TOC service is stabilized.
- Keep ratio fallback for no-anchor and mismatch cases, but treat it as a degradation path rather than the primary strategy.
- Implement service-level pure calculations first so behavior is testable without a running browser editor.
- Wire observers through a composable so listener cleanup is deterministic on SplitView close, mode switch, responsive fallback, and component unmount.