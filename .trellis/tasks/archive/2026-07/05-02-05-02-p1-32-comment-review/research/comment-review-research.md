# Spec 32 Comment Review Research

## Local Code Findings

- Active app root remains `inkforge/` with Vue 3, Pinia, Dexie, Tiptap, and local-first services.
- Existing audit actions already include `comment.create`, `comment.resolve`, `comment.delete`, `review.approve`, and `review.request_changes`.
- Existing Dexie schema is at version 13. Spec 32 requires new persisted stores, so the compatible baseline should add version 14 with additive stores only.
- Existing state-management specs require service-backed Pinia stores and prohibit UI-only rows. The baseline should add a store but avoid placeholder panels unless fully wired.

## External Verification

### Grok Search: ProseMirror/Tiptap comments

Query: `ProseMirror DecorationSet comments plugin current best practices map decorations transactions`

Findings:

- Current practice is to keep comment thread data outside the ProseMirror document model and derive highlights through a plugin-owned `DecorationSet`.
- Normal document edits should map decorations through `tr.mapping`; external comment list changes should trigger selective rebuild through transaction metadata.
- This supports the baseline decision to persist comments separately and defer live decoration UI wiring until a complete editor plugin can be shipped.

### Grok Search: anchor drift

Query: `text anchor drift comment reanchoring algorithm exact drifted invalid anchors`

Findings:

- Robust annotation systems store multiple selectors: original range, exact selected text, prefix/suffix context, and sometimes structural selectors.
- Reattachment should try exact/range verification first, then position or text search, then context/fuzzy fallback, and finally mark the anchor invalid/orphaned.
- This supports a deterministic baseline that exposes `exact`, `drifted`, and `invalid` states honestly.

### Context7: Tiptap

Library: `/ueberdosis/tiptap-docs`

Findings:

- Tiptap custom extensions can return ProseMirror plugins through `addProseMirrorPlugins()` with `Plugin` and `PluginKey` from `@tiptap/pm/state`.
- Tiptap comment/thread styling uses editor classes to render inline/block thread states, which aligns with a future decoration-extension layer.

### Context7: Dexie

Library: `/websites/dexie`

Findings:

- Dexie schema upgrades should be additive through `db.version(n).stores(...)` when adding object stores or indexes.
- Multi-store writes should use `db.transaction('rw', ...)`; reusable repository functions can participate in outer transactions.

## Baseline Decision

Implement the persistence/service/store layer first, with real Dexie stores and deterministic anchor drift. Do not create a fake CommentPanel. Do not claim live editor highlights until the Tiptap plugin and UI are fully wired.
