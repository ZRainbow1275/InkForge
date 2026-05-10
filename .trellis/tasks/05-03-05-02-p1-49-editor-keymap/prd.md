# P1 Editor Keymap Baseline

## Source Spec

- `prompts/0420/specs/49-editor-keymap-spec.md`
- Related dependencies: `01-spec-editor-typora.md`, `03-spec-keybindings.md`, `22-command-palette-spec.md`, `50-smart-punctuation-spec.md`, `51-block-drag-handle-spec.md`
- Date: 2026-05-03
- Owner: ZRainbow1275

## Goal

Implement the next real editor-keymap baseline for Inkforge without mock data or UI-only placeholders. The baseline must extend the existing TipTap/ProseMirror editor architecture and preserve the current Typora/source/preview design language while adding durable keyboard behavior where the existing editor currently falls short.

## Required Deliverables

1. List Enter behavior
   - Empty nested list item + Enter reduces indentation one level instead of exiting the whole list immediately.
   - Empty top-level list item still exits the list.
   - Non-empty list item keeps the existing split/new sibling behavior.
   - Task list and ordered/bullet list behavior must be covered where the current schema supports them.

2. Context-aware Tab handling
   - In list/task-list contexts, Tab sinks list items and Shift+Tab lifts list items through ProseMirror/Tiptap commands.
   - In code blocks, Tab inserts indentation rather than moving browser focus.
   - Outside editor structural contexts, key handling must not trap focus unexpectedly.

3. Undo grouping baseline
   - Structural keymap operations such as list lift/sink should become clear undo checkpoints where existing history support allows it.
   - Typing and content autosave must remain under existing editor flows; keymap changes must not write article content directly.

4. Shortcut consistency
   - Reuse the existing keyboard shortcut registry/Settings surfaces where present.
   - Avoid adding duplicate global listeners that conflict with Workstation shortcuts, Command Palette, or browser/Tauri boundaries.

5. Tests and validation
   - Add unit coverage around keymap helper logic and editor extension behavior where current test harness allows it.
   - Run targeted tests, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build`.
   - Browser smoke must use a real local document in Workstation and verify key behavior through the actual editor, not injected editor state.

## Non-Goals

- Do not implement a full multi-cursor engine unless the existing editor architecture already has a compatible selection model to extend safely.
- Do not replace the existing Typora editor stack or history extension wholesale.
- Do not create demo documents, fake keyboard events as proof of persistence, or localStorage-only behavior.
- Do not delete existing shortcuts, toolbar actions, command palette commands, or settings modules.

## Architecture Contract

Primary flow:

`EditorPanel -> TyporaMode extensions/keymaps -> ProseMirror transaction -> existing editor serialization/autosave -> Article repository`

Keymaps may dispatch ProseMirror transactions and Tiptap commands. They must not mutate Dexie/article repositories directly.

## Acceptance Criteria

- Nested empty bullet/ordered/task list Enter outdents one level at a time.
- Top-level empty list Enter exits the list.
- Non-empty list item Enter remains a normal split/new sibling action.
- Tab and Shift+Tab behave structurally inside list contexts and do not break code-block indentation.
- Undo after structural keymap operations is coherent and does not merge unrelated mode/layout actions.
- Existing Workstation shortcuts, Command Palette shortcuts, and Settings shortcut references continue to pass type/lint/test gates.
- No emoji icons are introduced; any new visual affordance must use installed icon components if needed.
- Browser smoke uses a real Workstation article and reports console errors.

## Implementation Notes

- Prefer adding small TipTap extensions/helpers under the existing editor extension area instead of broad Workstation rewrites.
- Use official Tiptap/ProseMirror commands such as `liftListItem`, `sinkListItem`, `splitListItem`, and transaction metadata rather than DOM mutation.
- IME composition must not be broken by Enter/Tab handling.
- If GitNexus/Serena transports remain unavailable, record the fact and compensate with precise code reading, narrow edits, tests, and browser smoke.

## Implementation Notes - 2026-05-03

- Added `src/extensions/EditorKeymap.ts` as the single structural-key entry point for `Enter`, `Tab`, and `Shift+Tab` inside the TipTap editor.
- Disabled the default `ListItem` and `TaskItem` shortcut maps in `EditorPanel.vue` by registering Inkforge-local schema-equivalent extensions with empty `addKeyboardShortcuts()` maps. This prevents Tiptap's bundled list keymaps from racing the project-specific behavior.
- `EditorKeymap` now explicitly handles non-empty list-item `Enter` with ProseMirror `splitListItem`, empty nested list-item `Enter` with `liftListItem`, and empty top-level list-item `Enter` with an explicit list-exit transaction that inserts a root paragraph.
- Structural list/code-block transactions set `inkforgeEditorKeymap` and `undoGroup` metadata values such as `list-split`, `list-lift`, `list-sink`, `code-block-indent`, and `code-block-outdent`.
- Real browser testing found that the keymap transaction was correct but could be overwritten by `EditorPanel`'s store hydration path. The persisted Markdown echo can collapse a live trailing empty paragraph after a list back to `- A`; `EditorPanel` now skips same-article, same-content local persistence echoes so the live ProseMirror selection state is preserved.
- Added `editor.listEnterBehavior` to settings state and Settings UI so nested empty-list Enter can run in the Inkforge/Notion-style one-level outdent mode or fall back to Typora-compatible default delegation.

## Validation Notes - 2026-05-03

- `pnpm vitest run src/extensions/EditorKeymap.test.ts`: 12 tests passed.
- `pnpm exec vue-tsc --noEmit`: passed.
- `pnpm lint`: passed with 8 existing warnings in unrelated files (`App.vue`, `MarkdownEditor.vue`, `MarkdownPreview.vue`, `ExportModal.vue`, `PreviewPanel.vue`, `PublishView.vue`, `ThemesView.vue`, `WorkstationView.vue`).
- `pnpm vitest run`: 27 files / 198 tests passed.
- `pnpm build`: passed; Vite kept existing dynamic/static import and large chunk warnings.
- Browser smoke used a real local Workstation article through `http://127.0.0.1:3005/`, not injected editor state. Verified `- Space A Enter Enter` produces `bulletList(A) + root paragraph`, selection depth `1`, and remains stable after autosave.
- Browser smoke verified nested empty bullet item `Tab -> Enter -> Enter` lifts one level first, then exits to a root paragraph.
- Browser smoke verified code-block `Tab` inserts configured indentation, code-block `Shift+Tab` removes it, and ordinary paragraph `Tab` does not trap focus.
- Settings smoke verified the `空嵌套列表 Enter` controls render with `逐级减缩` and `Typora 默认` choices.
- Fresh console-error check after reload reported no matching console errors. Earlier HMR errors during active edits were stale Vite reload artifacts and were cleared before final smoke.
- GitNexus impact lookup for new/local symbols was limited by the stale index; `detect_changes(scope=all)` returned critical because the pre-existing worktree contains 154 changed files / 455 changed symbols, so this task records that global result as dirty-worktree evidence rather than attributing it to Spec 49 alone.
