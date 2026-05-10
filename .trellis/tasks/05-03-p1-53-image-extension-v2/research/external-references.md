# External References - Image Extension v2

## Context7 Findings

- Tiptap's `updateAttributes` command updates a node or mark's attrs partially; this matches ImageV2's resize, caption, link, natural dimension, and alignment mutations.
- Vue NodeViews receive `node`, `updateAttributes`, `selected`, `getPos`, `deleteNode`, and editor context through `VueNodeViewRenderer`, so the existing `AssetImageNodeView.vue` is the right integration surface for image UI.
- Tiptap Image supports custom attributes through `Image.extend({ addAttributes() { return { ...this.parent?.(), custom } } })` and can use a custom NodeView for complex image controls.

## Grok Search Findings

- Current Tiptap Image documentation describes image resize support and resizable node views, but Inkforge already owns a custom Vue NodeView with real resize handles. Keeping and hardening the project-local NodeView avoids swapping implementation strategy midstream.
- For paste/drop uploads, Tiptap now documents `FileHandler`, but the project does not have `@tiptap/extension-file-handler` installed. Continue using the existing `ImageDropPaste` ProseMirror plugin because it already routes files to `assetStore.uploadAsset()`.
- `updateAttributes` from NodeViews should be used to persist width/height/alt/link/caption changes back into the ProseMirror document.

## Implementation Consequences

- Add an `ImageV2` bundle around existing `AssetImage` and `ImageDropPaste` instead of introducing another image node type.
- Extend existing attrs and NodeView toolbar to cover v2 capabilities while preserving current upload/display behavior.
- Keep all image ingestion on the real Asset Pipeline. No mock blobs, fake IndexedDB rows, or storage-side shortcuts.
- Add pure Markdown utility tests for image parse/serialize so future export/import work has a stable typed boundary.
