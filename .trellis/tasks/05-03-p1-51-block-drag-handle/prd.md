# P1 Block Drag Handle Baseline

## Source Spec

- `prompts/0420/specs/51-block-drag-handle-spec.md`
- Related dependencies: `01-spec-editor-typora.md`, `10-markdown-authority-spec.md`, `46-draggable-ordering-spec.md`, `49-editor-keymap-spec.md`
- Date: 2026-05-03
- Owner: ZRainbow1275

## Goal

Complete the Spec 51 block drag handle baseline through the existing Inkforge TipTap editor pipeline. The repository already contains a partial `BlockDragHandle` extension created by earlier 0420 work, so this task must audit and finish that implementation instead of rebuilding the editor or deleting existing modules.

## Required Deliverables

1. Extension architecture
   - Keep the existing `inkforge/src/extensions/BlockDragHandle/` module and integrate through `EditorPanel.vue`.
   - Provide a typed TipTap extension with `addProseMirrorPlugins`, `addCommands`, and `addKeyboardShortcuts`.
   - Keep drag operations inside ProseMirror transactions and the existing autosave/serialization flow.

2. Visual and interaction behavior
   - Show a left-side block handle only in active Typora editing context.
   - Use a non-emoji grip affordance and existing icon/CSS patterns.
   - Provide hover delay, hide delay, drag ghost, source block styling, and blue insertion indicator.
   - Clean drag ghost, decorations, and transient state on drop, dragend, Escape, mode changes, and extension destroy.

3. Supported block scope
   - Support paragraphs, headings, blockquotes, lists, task lists, code blocks, rich code blocks, tables, horizontal rules, and existing Inkforge custom block nodes when present.
   - Do not expose a generic block drag handle for image nodes because image movement belongs to the image/asset pipeline in Spec 53.
   - Avoid pretending unsupported future-only node names are implemented unless the actual schema has them.

4. Keyboard fallback and undo
   - `Alt+ArrowUp` and `Alt+ArrowDown` must move the current top-level block with the same single-transaction move helper used by drag/drop.
   - Boundary moves and no-op drops must be refused without duplicating or deleting content.
   - Move transactions must set `addToHistory` so Ctrl+Z restores the previous order.

5. Mode compatibility
   - Source mode must hide the drag handle and must not allow dragstart.
   - Preview/read-only mode must not show an interactive handle.
   - Switching modes during or after hover/drag must clean transient UI state.

6. Tests and validation
   - Add or extend unit coverage for move helpers, decoration output, plugin state/meta transitions, disabled mode behavior, and cleanup-sensitive no-op cases.
   - Run targeted BlockDragHandle tests, type-check, build, and relevant browser smoke against a real local Workstation draft.
   - Browser smoke must not create mock rows or write fake IndexedDB/localStorage evidence.

## Non-Goals

- Do not implement cross-document drag between tabs.
- Do not implement touch/mobile drag as part of this desktop-first baseline.
- Do not implement table column/row reordering; that belongs to Spec 52.
- Do not implement image-specific drag toolbar behavior; that belongs to Spec 53.
- Do not replace the current TipTap editor, toolbar stack, or Markdown authority model.

## Architecture Contract

Primary flow:

`EditorPanel -> BlockDragHandle Extension -> ProseMirror Plugin -> moveBlock transaction -> TipTap document update -> existing autosave/Article repository`

The extension may render transient DOM for the handle, drag ghost, and drop indicator. It must not write article content directly, create persistence rows, or mutate repository state outside the editor transaction pipeline.

## Acceptance Criteria

- Hovering supported blocks in Typora mode shows `.block-drag-handle[data-visible="true"]` near the left edge.
- Dragging by the handle reorders real document blocks and removes `.block-drag-ghost` / `.block-drag-insert-line` after completion.
- `Alt+ArrowUp` / `Alt+ArrowDown` reorder blocks and refuse boundaries without corrupting content.
- Ctrl+Z restores the previous block order after a keyboard move or drag/drop move.
- Source mode and Preview/read-only mode hide the handle.
- Image nodes are not treated as generic supported blocks.
- Tests, type-check, and build pass, with existing unrelated warnings documented.

## External References

- ProseMirror reference manual: https://prosemirror.net/docs/ref/
- Tiptap custom extension docs: https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension
- Tiptap keyboard shortcut docs: https://tiptap.dev/docs/editor/core-concepts/keyboard-shortcuts
- Tiptap drag handle docs: https://tiptap.dev/docs/editor/extensions/functionality/drag-handle

## Implementation Notes

- Preserved the existing project-local `inkforge/src/extensions/BlockDragHandle/` extension and completed it in place.
- Kept the TipTap extension shape with `addProseMirrorPlugins`, `addCommands`, and `addKeyboardShortcuts`.
- Tightened `EditorPanel.vue` integration so the handle is enabled only when `editorMode.value === 'typora'`, not merely when mode is not Source.
- Removed `image` from the generic supported block set so Spec 53 can own image-specific movement and toolbar behavior.
- Hardened `createDropIndicatorDecorations` against stale/out-of-range drop targets by returning `DecorationSet.empty` instead of throwing a ProseMirror `RangeError`.
- Added `decorations.test.ts` and `blockDragPlugin.test.ts` alongside the existing `moveBlock.test.ts`.
- Updated `.trellis/spec/frontend/quality-guidelines.md` with the expanded BlockDragHandle quality gate.

## Validation Notes

- `pnpm vitest run src/extensions/BlockDragHandle/__tests__/moveBlock.test.ts` passed before changes: 6 tests.
- The first expanded target run exposed a real `RangeError` for stale drop target position `999`; the implementation was fixed and the regression test now passes.
- `pnpm vitest run src/extensions/BlockDragHandle/__tests__/moveBlock.test.ts src/extensions/BlockDragHandle/__tests__/decorations.test.ts src/extensions/BlockDragHandle/__tests__/blockDragPlugin.test.ts` passed: 14 tests across 3 files.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm lint` passed with the existing 8 warnings only: template shadowing, one required prop/default warning, and pre-existing `v-html` warnings.
- `pnpm vitest run` passed: 215 tests across 30 files.
- `pnpm build` passed with existing Vite dynamic/static import and large chunk warnings.
- Real browser smoke used the running local app at `http://127.0.0.1:3005/workstation` and an existing real Workstation draft.
- Browser smoke confirmed: Typora hover showed `.block-drag-handle[data-visible="true"]` with left offset around `-30px`; `Alt+ArrowUp` moved `A|B` to `B|A`; `Ctrl+Z` restored `A|B`; native Playwright drag from the visible handle reordered `A|B|C` to `B|A|C`; `Ctrl+Z` restored `A|B|C`; Source mode hid the handle; Preview mode rendered no `.ProseMirror` and no `.block-drag-handle`; refresh console error check reported 0 errors.
- `gitnexus_impact` was attempted for new BlockDragHandle symbols, but GitNexus could not find untracked symbols in its current index. `EditorPanel.vue` impact was LOW. This task compensated with Serena structure inspection, targeted tests, full tests/build, and real browser smoke.
- `gitnexus_detect_changes(scope="all")` was run after implementation. It still reports `critical` because the repository already has a broad dirty worktree with 155 changed files and 464 changed symbols; this task's local scope is limited to the BlockDragHandle files, `EditorPanel.vue`, the frontend quality gate, and this Trellis task directory.
