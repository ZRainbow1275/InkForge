# P1 Block Drag Handle and Draggable Ordering

## Goal

Implement the real editor-layer baseline for prompts/0420 draggable ordering by adding a TipTap/ProseMirror BlockDragHandle extension that can move actual document blocks, persist the reordered Markdown through the existing editor autosave path, and preserve undo behavior. This task is the executable bridge between Spec 46 and the more detailed Spec 51.

## Source Specs

- prompts/0420/specs/46-draggable-ordering-spec.md
- prompts/0420/specs/51-block-drag-handle-spec.md
- prompts/0420/specs/10-markdown-authority-spec.md
- prompts/0420/specs/38-toc-system-spec.md
- prompts/0420/specs/39-sync-scroll-spec.md
- prompts/0420/specs/35-split-view-spec.md
- .trellis/spec/frontend/component-guidelines.md
- .trellis/spec/frontend/state-management.md
- .trellis/spec/frontend/type-safety.md
- .trellis/spec/frontend/quality-guidelines.md
- .trellis/spec/guides/code-reuse-thinking-guide.md
- .trellis/spec/guides/cross-layer-thinking-guide.md
- .trellis/tasks/05-02-05-02-p1-46-draggable-ordering/research/external-references.md

## Implementation Scope

- Add a typed BlockDragHandle TipTap extension under src/extensions/BlockDragHandle using existing @tiptap/core and @tiptap/pm dependencies only.
- Render a real drag handle with the existing lucide icon system; do not use emoji glyphs or placeholder UI.
- Support top-level block movement for paragraph, heading, blockquote, bulletList, orderedList, taskList, codeBlock, table, horizontalRule, detailsBlock, and asset-backed image blocks when represented as block nodes.
- Use a custom cloned DOM ghost and blue insert line during drag; the ghost must clone the actual dragged block DOM rather than showing sample content.
- Use one ProseMirror transaction per completed move and mark it addToHistory so Ctrl+Z can undo the structural move.
- Add keyboard alternatives: Alt+ArrowUp and Alt+ArrowDown move the current block up/down through the same transaction helper.
- Integrate the extension into EditorPanel only for the Typora/TipTap editor path; Source mode must not expose a drag handle.
- Keep all content writes on the existing editor update/autosave path so reordered content is stored as real Markdown/EditedContent without new mock stores.
- Add unit coverage for block range resolution and move transaction behavior.

## Non-Goals

- Do not implement FileManager article/category order-field schema migration in this editor-layer task. Spec 46 section 17 remains a separate later vertical slice because it changes Article/Category schema, Dexie versioning, repositories, stores, and FileManager UI persistence.
- Do not add a third-party DragHandle package unless the project deliberately upgrades the Tiptap dependency set. Current implementation uses the installed Tiptap v2 packages.
- Do not implement video evidence capture in code. Browser smoke will verify DOM behavior and persisted Markdown order with real local drafts.
- Do not implement touch-device dragging in this baseline.

## Acceptance Criteria

- Hovering a real top-level TipTap block reveals a left-side drag handle after the configured delay.
- Dragging a block over another block shows a blue insertion line and a custom ghost derived from the real block DOM.
- Dropping before/after a valid target reorders the actual ProseMirror document with one undoable transaction.
- Alt+ArrowUp and Alt+ArrowDown reorder the current block and refuse boundary moves without corrupting content.
- Source mode and preview-only surfaces do not expose the drag handle.
- Reordered content flows through EditorPanel's existing serializeHtmlToMarkdown + schedulePersist path; no fake content or direct storage bypass is used.
- Unit tests cover transaction helpers, invalid/boundary moves, and Markdown/order-preserving behavior where practical.
- Type-check, targeted tests, lint/build gates, browser smoke, BOM scan, emoji scan, whitespace scan, and Trellis validation are documented before completion.
## Implementation Notes

- Added `src/extensions/BlockDragHandle` as a typed TipTap extension using the installed `@tiptap/core` and `@tiptap/pm` packages only.
- Implemented top-level block range resolution and a single undoable ProseMirror transaction helper in `moveBlock.ts`; keyboard `Alt+ArrowUp` and `Alt+ArrowDown` call the same helper.
- Implemented a ProseMirror plugin view that renders one real drag handle, clones the actual source block DOM as the drag ghost, renders a blue insertion-line decoration, and cleans all transient DOM after drag end or cancel.
- Fixed the real mouse drag path by separating the visible handle-bound block from transient hover state; dragstart now uses the block currently bound to the handle instead of a later active-line hover target.
- Added drop-time target fallback from final mouse coordinates plus DOM/vertical nearest-block resolution so sparse dragover sequences still resolve to a real ProseMirror block.
- Integrated `BlockDragHandle.configure({ enabled: () => !isSourceMode.value })` into `EditorPanel.vue` without adding a new store or bypassing `serializeHtmlToMarkdown` plus `schedulePersist`.
- Hardened `EditorPanel` lifecycle by making TipTap initialization idempotent and retrying after `isReady` renders the editor container; full page refresh now mounts Typora correctly instead of leaving `.tiptap-content` empty.
- Kept FileManager article/category `order` schema work out of this task by explicit non-goal. That remains a later Spec 46 vertical slice because it changes Dexie schema, repositories, stores, and FileManager UI.

## Validation Notes

- `pnpm vitest run src/extensions/BlockDragHandle/__tests__/moveBlock.test.ts` passed: 1 file, 6 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm lint` passed with 0 errors and the existing 8 warnings in unrelated files (`App.vue` no-template-shadow, `MarkdownEditor.vue` prop default, and six `vue/no-v-html` warnings).
- Browser smoke against `http://127.0.0.1:3005/workstation?id=2b760bc5-caa2-4c5e-abbd-d92fd99db5a9` used a real local draft with three paragraphs. Hover revealed the handle; `Alt+ArrowDown` reordered the real ProseMirror document and preview; mouse drag reordered the document through native drag events; Source mode kept the handle hidden; page refresh preserved the reordered Markdown; ghost and insertion-line DOM counts returned to 0; console error count was 0.
- `pnpm vitest run` passed: 25 files, 170 tests.
- `pnpm build` passed. Vite reported existing dynamic-import/chunk-size warnings but no build failure.
- Touched-file scan passed for BOM, emoji-range characters, and trailing whitespace across BlockDragHandle files, `EditorPanel.vue`, this task directory, and updated frontend specs.
- GitNexus `impact` and `detect_changes` were attempted before editing but the MCP returned `Transport closed`; this task therefore records test and browser evidence instead of claiming graph validation.
