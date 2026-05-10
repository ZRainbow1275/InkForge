# P1 Table Extension V2 Baseline

## Source Spec

- `prompts/0420/specs/52-table-extension-v2-spec.md`
- Related dependencies: `01-spec-editor-typora.md`, `10-markdown-authority-spec.md`, `05-toolbar-complete-spec.md`, `15-export-publish-spec.md`
- Date: 2026-05-03
- Owner: ZRainbow1275

## Goal

Upgrade Inkforge's existing TipTap table integration into a real Table Extension v2 baseline while preserving the current editor architecture. The project already has `@tiptap/extension-table`, `TableFloatingToolbar.vue`, and table CSS, so this task must integrate v2 features incrementally instead of replacing the editor stack.

## Required Deliverables

1. TableV2 extension module
   - Add a project-local `src/extensions/TableV2/` module that wraps the existing Tiptap `Table`, `TableRow`, `TableHeader`, and `TableCell` extensions.
   - Preserve existing table basics: insert table, add/delete rows and columns, merge/split, header row, undo, and existing toolbar flows.
   - Provide typed command augmentation for v2 commands such as column alignment and table escape helpers.

2. Column alignment
   - Extend `TableCell` and `TableHeader` with an `align` attribute.
   - Render `text-align` style for `left`, `center`, and `right`, and render no style for default/null.
   - Add a column-level `setColumnAlign` command that updates every real cell in the current column through ProseMirror table mapping.
   - Expose alignment controls through the existing floating table toolbar using installed lucide icons, not emoji.

3. Keyboard and editing behavior
   - Keep Tab and Shift+Tab table navigation through Tiptap/ProseMirror table commands.
   - Add a reliable `Ctrl+Enter` escape flow that inserts a paragraph after the table and moves selection out of the table.
   - Ensure custom shortcuts only fire inside a table and do not break normal editor behavior.

4. GFM pipe table utilities
   - Add typed parser/serializer utilities for GFM pipe tables with alignment row support.
   - Escape literal `|` characters as `\|` and unescape on parse.
   - Preserve rows, columns, plain text, and alignment in the utility layer.
   - Treat column width and merged-cell fidelity as GFM-incompatible styling limitations, not content persistence.

5. Layout and UI polish
   - Add horizontal overflow safety around rendered tables via existing editor CSS.
   - Keep the floating toolbar visually consistent with existing Inkforge design.
   - Avoid new heavy dependencies unless already present in the project.

6. Tests and validation
   - Add unit tests for GFM parse/serialize, alignment conversion, and column alignment commands.
   - Run targeted TableV2 tests, type-check, lint, full tests, build, and real browser smoke against a local Workstation draft.
   - Browser smoke must use real editor operations and must not inject fake IndexedDB/localStorage evidence.

## Non-Goals

- Do not implement Excel formulas, database-like table views, pivot tables, or PDF-specific complex table layout.
- Do not replace Markdown authority or article repository persistence.
- Do not implement table import beyond GFM utility parsing in this baseline.
- Do not implement image/table cross-feature behavior.
- Do not add virtual scrolling dependency unless it is already available and can be integrated without destabilizing the current editor; large-table virtualization may be represented by documented SLO and future dependency notes if the project lacks the dependency.

## Architecture Contract

Primary flow:

`EditorPanel -> TableV2 extensions -> TipTap/ProseMirror table commands -> editor transaction -> existing Markdown/source projection/autosave -> Article repository`

GFM utility flow:

`table node/plain rows -> tableSerializer/tableParser -> Markdown authority/export/import adapters`

The extension may mutate ProseMirror table attrs through transactions. It must not create document rows directly in persistence, bypass autosave, or store table-only state outside the editor document.

## Acceptance Criteria

- Existing table creation, row/column operations, header row, merge/split, and deletion remain functional.
- Table cells and headers support `align` attrs and render `text-align` styles.
- `setColumnAlign` updates a full column and is undoable.
- Floating toolbar exposes left/center/right/default alignment actions.
- `Ctrl+Enter` exits the table into a paragraph after the table.
- GFM serializer emits `:---`, `:---:`, `---:`, and `---` separators correctly.
- GFM parser reads aligned pipe tables and escaped literal pipes.
- Tables remain horizontally scroll-safe in Typora/editor rendering.
- Tests, type-check, lint, full tests, build, and real browser smoke pass or existing unrelated warnings are documented.

## External References

- Tiptap Table extension: https://tiptap.dev/docs/editor/extensions/nodes/table
- Tiptap TableCell extension: https://tiptap.dev/docs/editor/extensions/nodes/table-cell
- Tiptap custom extension docs: https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension
- GitHub Flavored Markdown tables spec: https://github.github.com/gfm/#tables-extension-
- GitHub Docs table syntax: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-tables
- ProseMirror tables README: https://github.com/ProseMirror/prosemirror-tables

## Implementation Notes

- Added `src/extensions/TableV2/` as the project-local table bundle for `Table`, `TableRow`, `TableCell`, `TableHeader`, and TableV2 keyboard/command behavior.
- Preserved Tiptap built-in `resizable: true` because existing Inkforge table resizing is already real user-facing behavior. The v2 baseline adds an `InkforgeTableView` subclass only to attach `inkforge-table` and `inkforge-table-wrapper` classes without replacing Tiptap's resize implementation.
- Added `align` attrs to table cells and headers. DOM parsing normalizes unsupported values to `null`; HTML rendering emits `text-align` only for `left`, `center`, and `right`.
- Added typed `setColumnAlign(align)` and `exitTableAfter()` commands. Column alignment uses `TableMap` over the current logical column and deduplicates merged-cell positions; table escape inserts a paragraph after the active table through a ProseMirror transaction.
- Added GFM pipe-table utilities for parse/serialize, delimiter conversion, escaped literal pipes, backslashes, `<br>` line breaks, row normalization, and deterministic outer-pipe output.
- Extended the existing floating table toolbar with lucide `AlignLeft`, `AlignCenter`, `AlignRight`, and `AlignJustify` controls. No emoji icons were added.
- Added editor CSS overflow safety for Tiptap `.tableWrapper`, keeping wide tables horizontally scrollable without changing persistence or Markdown authority.
- Large-table virtualization was not implemented in this baseline because the project does not have `@tanstack/vue-virtual` installed and adding a heavy dependency would destabilize the editor. This remains documented as an SLO/future enhancement rather than a mock implementation.

## Validation Notes

- `pnpm vitest run src/extensions/TableV2/__tests__/tableMarkdown.test.ts src/extensions/TableV2/__tests__/tableCommands.test.ts` passed: 2 files / 14 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm lint` passed with the existing 8 warnings and no errors.
- `pnpm vitest run` passed: 32 files / 229 tests.
- `pnpm build` passed; Vite reported existing dynamic/static import and large chunk warnings.
- Browser smoke against `http://127.0.0.1:3005/workstation` used the real Workstation editor instance. Verified table insertion through TipTap editor commands, visible toolbar with 14 buttons, column alignment button applying DOM `text-align` and JSON `align` attrs, `inkforge-table` and `inkforge-table-wrapper` classes on the resizable table view, `.tableWrapper` `overflow-x: auto`, `Ctrl+Enter` escaping to a paragraph after the table, Source-mode toolbar hidden, and fresh console-error logs clean.
- Initial browser reload showed stale Vite HMR errors from the previous table import state; a fresh reload after the compiled TableV2 module loaded produced 0 console errors.
