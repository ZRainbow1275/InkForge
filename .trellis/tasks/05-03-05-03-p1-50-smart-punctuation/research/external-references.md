# External References - Smart Punctuation

## Tiptap Input Rules

- URL: https://tiptap.dev/docs/editor/api/input-rules
- Relevance: Tiptap documents `addInputRules()` as the extension-level API for automatic text transformations. It also documents `find`, `type`, `getAttributes`, and `undoable` as rule configuration points.
- Implementation decision: Inkforge keeps a project-specific ProseMirror plugin because the existing extension already needs CJK spacing and context guards, but the matching remains bounded and extension-owned rather than post-save mutation.

## Tiptap Custom Extensions

- URL: https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension
- Relevance: Confirms custom editor behavior belongs in `Extension.create()` and is registered alongside other editor extensions.
- Implementation decision: Keep `src/extensions/SmartPunctuation.ts` as the single owner instead of adding global DOM listeners.

## Tiptap Link Extension Autolink

- URL: https://tiptap.dev/docs/editor/extensions/marks/link
- Relevance: Official docs state `autolink` and `linkOnPaste` default to enabled and can be disabled with `autolink: false` and `linkOnPaste: false`.
- Implementation decision: Spec 50's E-08 C裁决 requires automatic link detection off by default, so EditorPanel must configure Link accordingly while preserving manual link actions.

## ProseMirror Transaction Metadata

- URL: https://prosemirror.net/docs/ref/#state.Transaction.setMeta
- Relevance: ProseMirror transactions support `setMeta` / `getMeta`, which plugins and tests can use to identify generated transactions.
- Implementation decision: Smart punctuation replacement transactions must set a stable Inkforge metadata value and an undo-group label.

## ProseMirror Input Rules

- URL: https://prosemirror.net/docs/ref/#inputrules
- Relevance: ProseMirror input rules are the underlying model for pattern-based transformations on typed text.
- Implementation decision: Smart punctuation logic must stay in the editor transaction layer and should avoid code contexts and composition rather than transforming serialized Markdown after persistence.

## DeepWiki Tiptap Repository Notes

- Repository: `ueberdosis/tiptap`
- Finding: Tiptap's own input rule implementation skips composition and code contexts, uses transaction metadata for undo/input-rule tracking, and dispatches meaningful transformations atomically.
- Implementation decision: Mirror those safeguards in the project-specific extension and add tests for skipped contexts.
