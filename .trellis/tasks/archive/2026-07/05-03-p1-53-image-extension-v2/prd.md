# P1 Image Extension V2 Baseline

## Source Spec

- `prompts/0420/specs/53-image-extension-v2-spec.md`
- Related dependencies: `01-spec-editor-typora.md`, `10-markdown-authority-spec.md`, `28-asset-pipeline-spec.md`, `05-toolbar-complete-spec.md`, `15-export-publish-spec.md`
- Date: 2026-05-03
- Owner: ZRainbow1275

## Goal

Upgrade Inkforge's existing real image editor path into an Image Extension v2 baseline without replacing the editor architecture or bypassing the Asset Pipeline. The project already has `AssetImage`, `AssetImageNodeView.vue`, `ImageDropPaste`, and `assetStore.uploadAsset()`, so this task must extend those paths and expose a local `ImageV2` bundle rather than creating a parallel mock image system.

## Required Deliverables

1. ImageV2 module
   - Add `src/extensions/ImageV2/` as the project-local v2 bundle.
   - Keep compatibility with existing `AssetImage` node behavior and existing paste/drop/button upload flows.
   - Export typed image alignment, attrs, serializer/parser helpers, and extension bundle entrypoints.

2. Image attrs and commands
   - Support `src`, `alt`, `title`, `assetId`, `width`, `height`, `naturalWidth`, `naturalHeight`, `align`, `caption`, and `link` attrs.
   - Align values must be `left`, `center`, `right`, `float-left`, or `float-right`.
   - Add typed helpers for Markdown image serialization and markdown image parsing, including optional Typora-style `=WxH` dimensions and linked-image syntax.

3. NodeView UI
   - Preserve selected/hover toolbar behavior.
   - Add five alignment controls using installed lucide icons, not emoji.
   - Keep real resize handles and persist final width/height through `updateAttributes`.
   - Add caption editing, link setting/removal, source copy, original image view, replace image through the real Asset Pipeline, retry/error handling, and deletion.
   - Do not create fake images, fake localStorage records, or mock asset rows.

4. AssetPipeline integration
   - Paste/drop/file-button paths must continue through `assetStore.uploadAsset()` and `ImageDropPaste.uploadImage`.
   - Replace-image toolbar flow must use the same real upload path.
   - Local asset display must use `assetStore.getAssetUrl(assetId)` and fall back to remote/data src only when no local asset id exists.

5. Styling and behavior
   - Support left/center/right/float-left/float-right layout in the existing paper editor style.
   - Show a real loading/error placeholder with retry and delete fallback when an image cannot load.
   - Keep Source mode and Markdown authority semantics intact; ImageV2 must not write directly to persistence.

6. Tests and validation
   - Add unit tests for image alignment normalization and Markdown image parse/serialize utilities.
   - Run targeted ImageV2 tests, type-check, lint, full tests, build, and real browser smoke against a local Workstation editor.

## Non-Goals

- Do not implement crop/filter/OCR/video/audio.
- Do not add a separate gallery browser or new asset database tables in this baseline.
- Do not replace the existing Asset Pipeline or introduce a second upload store.
- Do not add `@tiptap/extension-file-handler` unless the project already has it installed.
- Do not implement fake lazy loading or fake virtual gallery behavior.

## Architecture Contract

Primary flow:

`EditorPanel -> ImageV2 bundle -> AssetImage NodeView -> assetStore/AssetPipeline -> ProseMirror attrs -> existing autosave/Markdown projection`

Paste/drop flow:

`Clipboard/DataTransfer -> ImageDropPaste -> uploadImage(file) -> assetStore.uploadAsset(file, articleId) -> create image node -> editor transaction`

ImageV2 may update image node attrs through TipTap/NodeView `updateAttributes`. It must not bypass editor transactions, write article rows directly, or create assets without `assetStore.uploadAsset()`.

## Acceptance Criteria

- Existing image insertion, paste, drop, and button upload flows remain functional.
- NodeView toolbar exposes five alignment options, caption, link, replace, view original, copy source, and delete actions.
- Resize handles persist width/height attrs.
- Local assets resolve through `assetStore.getAssetUrl(assetId)`.
- Markdown serializer supports basic, titled, sized, captioned, and linked image forms.
- Markdown parser reads basic image syntax, title, dimensions, and linked-image syntax.
- Tests, type-check, lint, full tests, build, and real browser smoke pass or existing unrelated warnings are documented.

## External References

- Tiptap Image docs: https://tiptap.dev/docs/editor/extensions/nodes/image
- Tiptap updateAttributes command: https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/update-attributes
- Tiptap Vue node views: https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/vue
- Tiptap resizable node views: https://tiptap.dev/docs/editor/api/resizable-nodeviews
- Tiptap FileHandler docs: https://tiptap.dev/docs/editor/extensions/functionality/filehandler

## Implementation Notes

- Added `src/extensions/ImageV2/` as the local bundle around existing `AssetImage` and `ImageDropPaste`; the bundle exports attrs helpers, Markdown parse/serialize utilities, extension entrypoints, and typed image ingress payloads.
- Extended `AssetImage` attrs with `naturalWidth`, `naturalHeight`, normalized `align`, `caption`, and safe `link` handling while preserving the existing image node name and Asset Pipeline compatibility.
- Kept the no-large-rewrite decision from this PRD: ImageV2 uses the existing `image` node with a `figure` NodeView wrapper instead of replacing the document schema with a new `figure + figcaption` node pair.
- Fixed the manual TipTap mount compatibility gap: `EditorPanel` now explicitly enables Vue NodeViews after `new Editor({ element })`, because `@tiptap/vue-3` returns empty node views unless `editor.contentComponent` exists. This preserves the existing no-`EditorContent` architecture while making `AssetImageNodeView.vue` and existing Vue node views render for real.
- Routed button upload, paste/drop insertion, and replace-image through the same `assetStore.uploadAsset()` path and now writes `naturalWidth`, `naturalHeight`, and `link` attrs consistently.
- Local image rendering now uses `assetStore.getAssetUrl(assetId)` for Blob-backed browser display. It does not fall back to loading `inkforge-asset://` when a local asset id exists, preventing CSP-blocked image requests.
- Expanded the image NodeView toolbar with five lucide alignment controls, caption editing, safe link set/remove, source copy, original view, replace upload, retry/delete fallback, and persistent resize attrs.

## Validation Notes

- `pnpm vitest run src/extensions/ImageV2/__tests__/imageAttrs.test.ts src/extensions/ImageV2/__tests__/imageMarkdown.test.ts` passed: 2 files, 14 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm lint` passed with the existing 8 warnings in unrelated files: `App.vue` template shadowing, `MarkdownEditor.vue` required prop default, and six existing `vue/no-v-html` warnings.
- `pnpm vitest run` passed: 34 files, 243 tests.
- `pnpm build` passed. Existing Vite warnings remain for mixed dynamic/static imports in stores and large chunks.
- Browser smoke used `http://127.0.0.1:3005/workstation`, created a real local article, uploaded real local image files through the asset UI and ImageV2 replace input, verified `.asset-image-node` rendering, Blob-backed image display, five alignment controls, caption/link attrs, resize width/height attrs, replace-image Asset Pipeline upload, Source-mode hidden toolbar, and clean fresh console error logs.
- GitNexus impact lookup was attempted for `AssetImage`, `ImageDropPaste`, `AssetImageNodeView`, and `initializeBodyEditor`; the current index did not contain those targets, so risk control was compensated with narrow edits, full type/lint/test/build gates, and real browser smoke.
