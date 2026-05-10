# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

(To be filled by the team)

---

## Required Patterns

<!-- Patterns that must always be used -->

(To be filled by the team)

---

## Testing Requirements

<!-- What level of testing is expected -->

(To be filled by the team)

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)

## Workstation TabBar Quality Gate

- Do not accept a TabBar change unless src/stores/workstationTabs.test.ts covers store ordering, pinning, close/restore, LRU, keyboard index behavior, and corrupt session payloads.
- Run pnpm vitest run src/stores/workstationTabs.test.ts, pnpm exec vue-tsc --noEmit, pnpm lint, and pnpm build before marking the task complete.
- For browser smoke, create or open a real local article through the UI and verify .workstation-tabbar renders with the real article title; do not inject mock tabs into localStorage/sessionStorage for proof.
- Existing lint warnings may be documented, but new lint errors in Workstation TabBar files must be fixed.
## BlockDragHandle Quality Gate

- Do not accept a BlockDragHandle change unless the move helper tests pass and the browser smoke proves a real local draft was reordered through the editor, not by injected storage writes.
- Run `pnpm vitest run src/extensions/BlockDragHandle/__tests__/moveBlock.test.ts src/extensions/BlockDragHandle/__tests__/decorations.test.ts src/extensions/BlockDragHandle/__tests__/blockDragPlugin.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build` before closing the task.
- Browser smoke must verify `.block-drag-handle[data-visible="true"]` after hover, real native drag events, ProseMirror paragraph order, preview order, persisted order after refresh, Source-mode hidden handle, Preview-mode hidden handle, 0 console errors, and no residual `.block-drag-ghost` or `.block-drag-insert-line` nodes.
- Drop indicator tests must cover stale/out-of-range drop targets so `DecorationSet` creation fails closed instead of throwing `RangeError`.
- Generic BlockDragHandle support must not include image nodes; image movement belongs to the image/asset pipeline.
- Existing lint warnings may be documented, but new lint errors in `EditorPanel.vue` or `src/extensions/BlockDragHandle/*` must be fixed before completion.
- If GitNexus/Serena MCP tools are unavailable, record the transport failure explicitly and compensate with narrower edits, targeted tests, full build, and real browser evidence.
## Tag System Quality Gate

- Do not accept a tag-system change unless the relation authority, `docCount`, and `Article.tags` mirror are all verified together.
- Dexie schema upgrades must be additive and must not duplicate index names inside a store declaration. For `docTags`, declaring `docId` and `tagId` once already provides those indexes; do not repeat them after compound indexes.
- The Workstation tag input must remain usable at the default 260px manager width. Inputs must not collapse to zero width when the color selector and create button are visible.
- Browser smoke must not inject IndexedDB/localStorage rows. It should create a real article through the UI, perform real tag actions through buttons/inputs, and inspect IndexedDB only as read-only evidence.
- If GitNexus, ABCoder, or Serena MCP transports are unavailable, record the `Transport closed` fact and compensate with narrow diffs, targeted tests, full test/build gates, and real browser smoke.
- Existing lint warnings may be documented, but no new lint errors in `src/services/tag-system/*`, `src/stores/tags.ts`, `src/components/tag-system/*`, Hub tag cloud, or Workstation integration are acceptable.

## SessionRestore Quality Gate

- Do not accept a SessionRestore change unless it proves durable IndexedDB layout state, not only sessionStorage or in-memory Pinia state.
- Browser smoke must create or open real local articles through the UI, refresh Workstation, and verify `layoutStates.openTabs`, `tabOrder`, `activeTabId`, and `activeArticleId` through read-only IndexedDB inspection.
- Missing/deleted articles must be filtered without creating blank tabs, sample documents, or fake rows.
- Session restore code must never write article body content. It may select an existing article and hydrate tab skeleton metadata only.
- `pagehide` and hidden `visibilitychange` must trigger best-effort layout flush. `beforeunload`-only persistence is not acceptable for async IndexedDB.
- Required commands: `pnpm vitest run src/stores/workstationTabs.test.ts src/services/layout-persistence/layout-persistence.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build`.
- If GitNexus, ABCoder, Serena, Context7, or Grok Search transports are unavailable or return empty results, record that fact and compensate with narrow diffs, targeted tests, full gates, and real browser smoke.

## EditorKeymap Quality Gate

- Do not accept an EditorKeymap change unless list behavior is owned by a single project-specific keymap path. If StarterKit default `ListItem` or `TaskItem` shortcuts conflict with Inkforge behavior, disable those defaults and re-add schema-equivalent extensions rather than stacking duplicate global listeners.
- Empty nested list-item Enter must lift exactly one level; empty top-level list-item Enter must exit to a root paragraph; non-empty list-item Enter must still split through `splitListItem`.
- List and task-list Tab handling must use real ProseMirror/Tiptap list commands (`sinkListItem`, `liftListItem`, `splitListItem`) and must not mutate DOM nodes directly.
- Code-block Tab/Shift+Tab may insert/remove configured indentation, but ordinary paragraph Tab must return false so browser focus is not trapped.
- IME composition and already-prevented keyboard events must be ignored by structural key handling.
- EditorPanel must not rehydrate the active editor from same-article, same-content local persistence echoes. A local save echo must not delete transient but valid ProseMirror state such as the root empty paragraph created when exiting a list.
- Required commands: `pnpm vitest run src/extensions/EditorKeymap.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build`.
- Browser smoke must use a real Workstation article and real keyboard input. At minimum verify top-level list exit survives autosave, nested empty list Enter lifts before exiting, code-block Tab/Shift+Tab changes indentation, ordinary paragraph Tab moves focus, Settings exposes the list-enter behavior controls, and fresh console-error logs are clean.

## SmartPunctuation Quality Gate

- Do not accept a SmartPunctuation change unless the existing extension remains the single owner of smart punctuation behavior. Do not add global DOM key listeners or post-save Markdown rewrite passes.
- Smart punctuation must skip IME composition, code blocks, inline code marks, link contexts, likely URL text, and Source mode. If a context cannot be proven safe, prefer no transformation.
- Rule defaults must match Spec 50: curly quotes, em dash, ellipsis, copyright/trademark symbols, and Pangu spacing enabled; arrows, fractions, multiplication, degrees, spaced dash, and autolink disabled by default.
- Settings must preserve the master switch and provide a per-rule matrix backed by persisted settings. Settings changes must be visible to the live editor without recreating the editor instance.
- Required commands: `pnpm vitest run src/extensions/SmartPunctuation.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build`.
- Browser smoke must use a real Workstation article and real keyboard input. At minimum verify em dash, ellipsis, Pangu spacing, disabled-rule behavior, code-block suppression, Source-mode suppression, Settings rule toggles, autolink disabled, and fresh console-error logs are clean.

## TableV2 Quality Gate

- Do not accept a TableV2 change unless existing Tiptap table creation, row/column operations, header row, merge/split, deletion, undo, and built-in column resizing remain available.
- Column alignment must be implemented through ProseMirror table mapping transactions, not DOM mutation, text replacement, or per-render CSS guesses.
- GFM pipe-table utilities must cover left/center/right/default delimiter parsing, escaped literal pipes, backslashes, row normalization, and deterministic outer-pipe serialization.
- `Ctrl+Enter` table escape must insert a real paragraph after the active table and move selection out of that table without bypassing the editor history.
- Required commands: `pnpm vitest run src/extensions/TableV2/__tests__/tableMarkdown.test.ts src/extensions/TableV2/__tests__/tableCommands.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build`.
- Browser smoke must use a real Workstation editor instance. At minimum verify table insertion through editor commands/UI, toolbar alignment buttons, `inkforge-table`/`inkforge-table-wrapper` rendering, horizontal overflow safety, `Ctrl+Enter` escape, Source-mode toolbar hiding, and fresh console-error logs are clean.
- Large-table virtual scrolling is not accepted as a fake dependency shim. If `@tanstack/vue-virtual` is not installed, preserve current rendering and document the limitation/SLO instead of adding mock virtualization.

## ImageV2 Quality Gate

- Do not accept an ImageV2 change unless existing button upload, paste, drop, local asset display, caption, resize, alignment, link, source copy, replace, original view, and deletion paths remain wired through the real editor transaction and Asset Pipeline.
- Image insertion and replacement must use `assetStore.uploadAsset()` and `assetStore.getAssetUrl(assetId)`. Local `inkforge-asset://` ids are stable document attrs only; browser rendering must use Blob URLs from the asset store and must not trigger CSP-blocked image loads.
- Because EditorPanel intentionally uses manual `new Editor({ element })` mounting instead of `EditorContent`, Vue node views must be explicitly enabled through the manual node-view sentinel before hydrating content. Do not reintroduce `EditorContent` element swapping as a shortcut.
- Image alignment must be one of `left`, `center`, `right`, `float-left`, or `float-right`; unsupported alignment values must normalize to `center`.
- Markdown image utilities must cover basic, titled, sized, captioned, linked, aligned, escaped-alt, unsafe-link, and invalid-target cases without adding fake gallery or lazy-loading state.
- Required commands: `pnpm vitest run src/extensions/ImageV2/__tests__/imageAttrs.test.ts src/extensions/ImageV2/__tests__/imageMarkdown.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build`.
- Browser smoke must use a real Workstation article and real uploaded local image files. At minimum verify `.asset-image-node` rendering, Blob-backed local image `src`, five alignment buttons, caption attrs, safe link attrs, resize width/height attrs, replace-image upload through the Asset Pipeline, Source-mode hidden toolbar, and fresh console-error logs are clean.


## CustomCSS Quality Gate

- Do not accept a CustomCSS change unless runtime CSS is scoped to `.editor-content` through `src/services/custom-css/sandbox.ts`; raw string concatenation or direct chrome-wide selector injection is forbidden.
- `Settings > Advanced` CustomCSS must stay separate from `settings.export.customCss` and the legacy theme `customCSS` field. Export-only CSS must keep its existing HTML export semantics.
- Runtime injection must use exactly one `<style id="inkforge-custom-css">` in `document.head`; disabling CustomCSS, SafeMode detection, or suspension must remove that tag while preserving the user draft and last published source.
- The sandbox must reject `@import`, remote URLs, active protocols, `!important`, `behavior`, `:host`, and `:host-context`; warnings for frozen design tokens, `position: fixed`, and `contain: strict` must not block apply.
- Required commands before closing a CustomCSS task: `pnpm vitest run src/services/custom-css/custom-css.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` when the default heap cannot complete the production build.
- Browser smoke must use the real Settings UI. At minimum verify default disabled state, successful scoped injection, invalid CSS rejection without replacing the last good style, disable/remove behavior, reset behavior, persisted settings shape, and fresh console-error logs.
- If GitNexus cannot map newly added Vue or service symbols, record the limitation and compensate with targeted unit tests, full project gates, build evidence, and real browser smoke instead of claiming graph coverage.

## TauriUpdater Quality Gate

- Do not accept a TauriUpdater change unless it preserves the Tauri 1 compatibility boundary. Current code may dynamically import `@tauri-apps/api/updater` and call `checkUpdate()` only; it must not call `installUpdate()`, `downloadAndInstall()`, `download()`, `install()`, or `relaunch()`.
- Updater behavior in web/dev runtime must be a typed disabled or unavailable result. Do not seed fake release metadata, fake signing keys, fake endpoints, localStorage update payloads, or mock server responses as proof.
- Background startup, interval, resume, and offline checks must be silent on failure. Manual checks may show lightweight Settings feedback and must write `updater.user-check` audit evidence with the real outcome.
- Skip-version persistence must use the durable `updaterSkipped` table first and localStorage only as recovery fallback. A skipped version must remain visible in Settings, while a higher version must not be suppressed by the old skip record.
- Release-note rendering must pass through the updater markdown sanitizer and the shared security HTML sanitizer before display. Non-whitelisted image URLs must be stripped instead of trusted.
- Required commands before closing an updater task: `pnpm exec vitest run src/services/updater/updater.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, `pnpm vitest run`, and `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` when the default heap cannot complete the production build.
- Browser smoke must use the real Settings UI and real Command Palette path. At minimum verify `Settings > About > Tauri Updater`, command `Updater: Check for Updates`, disabled/unavailable web behavior, audit/activity log evidence, fresh console-error logs, and no updater toast unless a real signed update exists.

## CitationBaseline Quality Gate

- Do not accept citation/footnote changes unless Markdown remains the authority. Preview, Typora, cache, and export HTML must be derived from Markdown and must not write generated HTML back as canonical document body.
- Footnote behavior must cover first-reference numbering, repeated references, multiple backlinks, missing-definition diagnostics, and indented multiline definitions. Do not infer or fabricate missing footnote content.
- Academic citation behavior must cover unresolved `[@key]` output without fake author/year metadata and real BibTeX-driven formatting for `apa`, `mla`, `chicago-author-date`, and `gb-t-7714-2015` when entries are supplied.
- Typora serializer must preserve `.ink-footnote-ref`, `.ink-academic-citation`, `.ink-footnotes`, and Tiptap-normalized `h2.ink-footnotes__title + ol > li[data-footnote-id]` as Markdown syntax.
- Required commands before closing a citation baseline task: `pnpm exec vitest run src/services/citation/citation.test.ts src/services/markdown-ext/citation-render.test.ts src/extensions/TyporaMode.citation.test.ts src/services/export/citation-export.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, `pnpm vitest run`, and `NODE_OPTIONS=--max-old-space-size=4096 pnpm build`.
- Browser smoke must use a real Workstation article and Source-mode Markdown input. Verify Preview and Typora each show `.ink-footnote-ref`, `.ink-footnote-back`, and `.ink-academic-citation--unresolved`; verify returning to Source has no escaped `\\[` syntax and fresh console-error logs are clean.
- If GitNexus impact/detect tools are unavailable, record that limitation and compensate with Serena symbol checks, targeted tests, full project gates, build evidence, and browser smoke. Do not claim graph impact coverage without tool output.

## Workstation Source Layout Visual Gate

- Do not accept a Workstation layout change unless Source mode is tested in both inactive split-shell and active split-view states. When no right split pane is mounted, `.split-pane-left` must occupy the full editor shell; leaving a 50% blank white area is a blocking UI regression.
- Source mode must be validated by real browser measurements, not only by static CSS review. At minimum record `.editor-split-shell`, `.split-pane-left`, `.source-mode-layout`, `.source-pane-editor`, and `.source-pane-preview` widths for a desktop viewport around 1440px.
- Source instant preview must use flexible columns and collapse by actual container width. Do not rely only on viewport media queries, because Workstation manager/stage/inspector panels can make the editor container narrower than the viewport.
- Manager tabs and FileManager roots must not expose horizontal scrollbars at the default 240px manager width. If labels are tight, shrink/flex the tabs or hide horizontal overflow while preserving all actions.
- Browser smoke must capture desktop and 390px mobile screenshots from a real Workstation article with real Markdown content. Verify no mojibake markers, no page-width overflow, no unexpected black scrollbar tracks, and fresh console-error logs are clean.
- Required commands before closing a Workstation layout visual fix: targeted ESLint for touched Vue files, `pnpm exec vue-tsc --noEmit`, `NODE_OPTIONS=--max-old-space-size=4096 pnpm build`, `git diff --check`, and GitNexus `detect_changes` when available. If GitNexus returns `fetch failed`, record that limitation and compensate with route screenshots plus DOM measurements.

## Build Chunk Performance Gate

- Do not close a UI/UX or Workstation performance pass while Vite still reports avoidable `dynamically imported but also statically imported` warnings. If a dynamic import is protecting a real circular dependency, remove the cycle through a narrow typed bridge or service boundary instead of changing import style blindly.
- Do not import `highlight.js` from the package root in browser-facing export or editor code. Use `highlight.js/lib/core` plus the shared Inkforge grammar registry so export highlighting and editor lowlight keep the same supported language set without bundling every highlight.js language.
- Heavy editor/rendering dependencies must be grouped by real runtime responsibility in `manualChunks`: Vue runtime, ProseMirror, CodeMirror core, CodeMirror language data, markdown rendering, lowlight/highlight grammar groups, KaTeX, data runtime, icon runtime, and diagram layout engines. Do not raise `chunkSizeWarningLimit` as the only fix.
- Keep the chunk warning gate evidence-driven. Save the production build log and a top chunk size report under the UI/UX evidence folder, and require zero Vite warning matches for `warning`, `larger than`, and `dynamically imported` unless a documented upstream tool limitation remains.
- After build chunk changes, run real route smokes for Workstation desktop and 390px mobile, plus at least Hub, Publish, and Settings desktop. Verify fresh console errors are empty, no mojibake is visible, and Workstation Source mode still has no horizontal page overflow.
