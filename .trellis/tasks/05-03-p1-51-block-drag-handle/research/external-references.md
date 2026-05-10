# External References - Block Drag Handle

## Grok Search Findings

- ProseMirror official reference is the primary API source for `Plugin`, `PluginKey`, `EditorProps.handleDOMEvents`, `Decoration.widget`, `DecorationSet`, and `Transaction.setMeta`.
- Widget decorations are appropriate for visual drop indicators because they attach DOM at document positions without changing document content.
- Transaction metadata should carry transient plugin intent such as drag target state; metadata itself is not document content and should not be relied on as persisted undo state.
- Custom drag/drop should use editor event handlers such as `handleDOMEvents.dragover`, `drop`, `dragend`, and `keydown`, returning `true` only when the extension consumes the event.

## Context7 Tiptap Findings

- Tiptap custom functionality extensions should use `Extension.create`, `addOptions`, `addCommands`, `addKeyboardShortcuts`, and `addProseMirrorPlugins` for low-level ProseMirror integration.
- `addProseMirrorPlugins` is the correct hook for a custom drag plugin that owns DOM events and decorations.
- Tiptap documents an official DragHandle extension with nested configuration and Vue integration patterns. Inkforge keeps its project-local extension to preserve existing architecture and spec-specific behavior, but should borrow the same lifecycle principles.
- Vue drag-handle examples emphasize stable config references and cleanup on unmount/reinitialization.

## DeepWiki Tiptap Findings

- Tiptap's drag handle implementation uses plugin state, transaction metadata, plugin view lifecycle, DOM event handling, and explicit cleanup.
- Cleanup should remove event listeners, cancel pending animation frames/timers, remove wrapper DOM, and clear active handle context.
- Nested drag behavior is handled through explicit target context instead of recalculating an ambiguous target during drag start.

## Implementation Consequences

- Keep block drag handle UI transient and out of persisted Markdown/HTML content.
- Keep move operations as a single ProseMirror transaction with `addToHistory`.
- Prefer small helper functions for move semantics and targeted tests for no-op/boundary/drop behavior.
- Validate real browser behavior through the running local Workstation editor instead of injected storage state.
