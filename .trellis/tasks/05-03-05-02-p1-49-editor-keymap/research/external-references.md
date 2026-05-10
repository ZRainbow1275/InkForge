# External Research Notes

## Tiptap and ProseMirror Keymap APIs

- Context7 Tiptap docs confirm custom extensions can expose `addKeyboardShortcuts()` and return command handlers that call editor commands.
- Context7 Tiptap list command docs confirm `liftListItem()` lifts the current list item and `sinkListItem()` sinks it into a child list.
- Context7 ProseMirror docs confirm key handlers/commands should return `true` only when handled and `false` to allow later/default behavior.
- Context7 ProseMirror docs confirm transaction metadata is the appropriate channel for plugin/history coordination and that `addToHistory` is a reserved history meta key.

## Grok Search Notes

- Grok Search session `92c9f5c93eef` returned usable sources for Tiptap ListKeymap and ProseMirror Enter behavior references. It aligns with the project direction: use list commands/keymaps, not DOM mutation.
- Source references captured by Grok: `https://tiptap.dev/docs/editor/extensions/functionality/listkeymap` and `https://discuss.prosemirror.net/t/extending-the-enter-behaviour-to-keep-format-in-new-line/2742`.

## Project Constraints

- Existing code and specs remain authoritative. External references only justify API shape and browser/editor behavior.
- No mock documents or fake persistence rows are acceptable for validation.

## Browser Runtime Follow-up - 2026-05-03

- Grok Search session `b45817fd517d` confirmed the same official direction used in the implementation: disable a bundled StarterKit extension with `StarterKit.configure({ listItem: false })`, then add an extended list-item extension when project-specific keyboard behavior must own the shortcut path.
- Context7 Tiptap docs confirmed StarterKit extensions can be disabled with `false`, and existing extensions can override `addKeyboardShortcuts()`.
- Context7 and Tiptap docs confirm `ListItem` defaults are `Enter -> splitListItem`, `Tab -> sinkListItem`, and `Shift+Tab -> liftListItem`; after disabling default shortcuts, Inkforge must explicitly preserve non-empty `Enter` split behavior.
- Real Chromium smoke showed that a correct ProseMirror transaction is not enough when the editor store hydration path immediately re-applies the persisted Markdown echo. Empty root paragraphs after list exit can be transient editor state that Markdown persistence collapses; same-article, same-content persistence echoes must not force `setContent()` back into the live editor.
- The final browser contract is stronger than unit tests: verify the actual Workstation editor with real keyboard input, wait through autosave, and inspect the TipTap JSON only as read-only evidence.
