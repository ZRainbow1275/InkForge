# External References

## Context7: Tiptap custom extensions

- Official Tiptap docs show custom functionality extensions can add ProseMirror plugins with addProseMirrorPlugins().
- Official Tiptap docs show keyboard shortcuts can be registered through addKeyboardShortcuts(), while existing Inkforge extensions also use ProseMirror handleKeyDown for settings-aware bindings.
- Transactions dispatched through the editor/view are the correct integration point for content mutations so existing history and update hooks can observe the change.

## Grok Search: Drag handle implementation references

- Current Tiptap docs provide an official DragHandle extension, but Inkforge currently uses installed @tiptap v2 packages and does not include that extension package.
- ProseMirror widget/decorator handles are appropriate for non-document UI, but actual moves must be document transactions, not decoration-only state.
- Custom ghost behavior should clone the real dragged DOM and use DataTransfer.setDragImage or a fixed overlay; widget-only updates do not enter undo history.

## Implementation Decision

Implement a local BlockDragHandle extension using @tiptap/core and @tiptap/pm. This keeps the feature consistent with existing Inkforge extensions, avoids dependency drift, and satisfies Spec 46/51 requirements for real ProseMirror transactions and no mock visual content.

## Tooling Limitations Observed

- Serena and GitNexus via metamcp returned Transport closed in this session; code edits and impact checks must therefore be verified through Trellis scripts, typed tests, browser smoke, and targeted file review until those MCP transports recover.
- DeepWiki and Exa via metamcp also returned Transport closed, so they are not listed as successful research sources.
