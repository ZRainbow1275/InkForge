# External References - Table Extension v2

## Grok Search Findings

### Tiptap Table APIs

- Official Tiptap Table docs document individual `Table`, `TableRow`, `TableCell`, and `TableHeader` extensions, plus `TableKit` for bundled setup.
- Current table commands include `insertTable`, `addColumnBefore`, `addColumnAfter`, `deleteColumn`, `addRowBefore`, `addRowAfter`, `deleteRow`, `deleteTable`, `mergeCells`, `splitCell`, `mergeOrSplit`, `toggleHeaderRow`, `toggleHeaderColumn`, `toggleHeaderCell`, `setCellAttribute`, and `fixTables`.
- `Table.configure({ resizable: true })` enables built-in resizing with options such as `handleWidth`, `cellMinWidth`, and `lastColumnResizable`.
- Cell extensions are designed to be extended with custom attrs such as `align`, then updated through commands or ProseMirror transactions.

### GFM Table Syntax

- GFM tables consist of a header row, delimiter row, and zero or more data rows.
- Alignment is determined by delimiter row colons: `:---` for left, `:---:` for center, `---:` for right, and `---` for default.
- A delimiter cell should contain at least three hyphens.
- Literal pipe characters inside cells should be escaped as `\|`.
- Outer pipes are optional in GFM, but Inkforge should serialize with outer pipes for readability and deterministic round trips.

### ProseMirror Table Utilities

- `prosemirror-tables` provides `TableMap` for robust row/column traversal with merged cells.
- `TableMap.get(table)` maps logical row/column coordinates to cell positions inside a table.
- Column-wide attribute changes should use a transaction and visit cells through table mapping, instead of relying on DOM position or text search.
- `setCellAttr` handles current cell/selection; full-column operations need additional traversal logic.

## Context7 Findings

- Tiptap custom extensions should use `Extension.create`, `addCommands`, `addKeyboardShortcuts`, and `addProseMirrorPlugins` for low-level behavior.
- Official docs show extending existing extensions through `addAttributes` and using `setCellAttribute` after custom attrs are registered.
- Tiptap examples continue to configure `Table`, `TableRow`, `TableHeader`, and `TableCell` directly when fine-grained control is needed.

## Implementation Consequences

- Use a local `TableV2` module so the rest of Inkforge imports one coherent table bundle.
- Keep built-in table commands and ProseMirror table editing behavior; add only the missing v2 commands and attrs.
- Implement GFM parse/serialize utilities independently from persistence first, then leave adapter integration points documented for export/import work.
- Avoid adding virtual-scroll dependencies in this pass unless already installed; CSS horizontal overflow and performance tests are safer for the current codebase.
