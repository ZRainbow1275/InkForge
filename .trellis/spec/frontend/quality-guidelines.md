# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

Frontend quality is measured by real app behavior plus non-mutating checks.
The app uses Vue 3, Pinia, TypeScript, Vitest, `vue-tsc`, ESLint, and Vite.
Package script `pnpm -C inkforge lint` runs ESLint with `--fix`; use explicit
`pnpm -C inkforge exec eslint ... --quiet` when you need a non-mutating gate.

---

## Forbidden Patterns

- Fake UI success without calling the real service/store boundary.
- Mock localStorage/IndexedDB injection as proof of user workflows.
- Emoji icons in product UI; use `lucide-vue-next` or the established icon
  library path.
- New unused imports, refs, computed values, or functions.
- Any-shaped component props, emits, store payloads, or service records.
- Component-only business rules that bypass Zod/service validation.

---

## Required Patterns

- Keep Vue components typed with `<script setup lang="ts">`.
- Use Pinia stores for shared/durable UI state and services for business logic.
- Use real browser/UI smoke evidence for user-visible workflows when the task is
  interactive or layout-sensitive.
- Preserve existing keyboard/accessibility affordances when changing controls.
- Match import paths to actual file name casing; Windows may hide casing bugs
  that fail on Linux.
- Record known scope blockers instead of claiming full-green gates when
  unrelated frontend files already fail.

---

## Testing Requirements

Default command set:

```bash
pnpm -C inkforge exec vitest run --reporter=default
pnpm -C inkforge exec vue-tsc --noEmit
pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
```

Use narrower tests first when changing a focused module, then broaden based on
risk. If repo-wide checks are blocked by unrelated files, document exact paths
and still run the narrow checks for the touched scope.

---

## Code Review Checklist

- Does the UI call the real store/service path?
- Are component props and emits typed?
- Are no new unused symbols introduced?
- Does the workflow use real local data and not injected mock rows?
- Are storage, sync, export, or editor side effects verified at their durable
  boundary?
- Were non-mutating lint/typecheck/test commands run or were blockers recorded
  with exact file paths?

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
- Real Tauri route-precedence smoke must keep an explicit `/workstation?id=<newArticleId>` target active after asynchronous layout restore. Verify the new article starts with its actual empty/template body instead of accepting a previously active tab merely because the editor reached `ready`.
- The E2E harness builds the Tauri debug binary by default and must fail on a non-zero Cargo result. After that exact binary has built successfully, bounded serial replays may set `INKFORGE_E2E_SKIP_TAURI_BUILD=1` to avoid redundant high-memory recompilation; this flag must never be used before a successful current-source build.
- If GitNexus, ABCoder, Serena, Context7, or Grok Search transports are unavailable or return empty results, record that fact and compensate with narrow diffs, targeted tests, full gates, and real browser smoke.

## EditorKeymap Quality Gate

- Do not accept an EditorKeymap change unless list behavior is owned by a single project-specific keymap path. If StarterKit default `ListItem` or `TaskItem` shortcuts conflict with Inkforge behavior, disable those defaults and re-add schema-equivalent extensions rather than stacking duplicate global listeners.
- Empty nested list-item Enter must lift exactly one level; empty top-level list-item Enter must exit to a root paragraph; non-empty list-item Enter must still split through `splitListItem`.
- List and task-list Tab handling must use real ProseMirror/Tiptap list commands (`sinkListItem`, `liftListItem`, `splitListItem`) and must not mutate DOM nodes directly.
- Code-block Tab/Shift+Tab may insert/remove configured indentation, but ordinary paragraph Tab must return false so browser focus is not trapped.
- IME composition and already-prevented keyboard events must be ignored by structural key handling.
- EditorPanel must not rehydrate the active editor from same-article, same-content local persistence echoes. A local save echo must not delete transient but valid ProseMirror state such as the root empty paragraph created when exiting a list.
- `editor.listEnterBehavior=notion` owns structural Enter: non-empty list items split, nested empty items lift one level, and top-level empty items exit. `typora` delegates Enter to the normal editor keymap and must remain observably different instead of being forced through the Notion commands.
- Settings acceptance must change each mode through the visible Settings control, wait for the real debounced store write, refresh, and then use real keyboard input in Workstation. Direct localStorage/Pinia mutation is not acceptable proof.
- Persistent desktop E2E must restore the original Settings value through the visible control and move only the articles created by that run through the production trash path. It must also remove their tabs/layout references so serial specs and the operator's real workspace are not polluted.
- Required commands: `pnpm vitest run src/extensions/EditorKeymap.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build`.
- Browser smoke must use a real Workstation article and real keyboard input. At minimum verify top-level list exit survives autosave, nested empty list Enter lifts before exiting, code-block Tab/Shift+Tab changes indentation, ordinary paragraph Tab moves focus, Settings exposes the list-enter behavior controls, and fresh console-error logs are clean.

## SmartPunctuation Quality Gate

- Do not accept a SmartPunctuation change unless the existing extension remains the single owner of smart punctuation behavior. Do not add global DOM key listeners or post-save Markdown rewrite passes.
- Smart punctuation must skip IME composition, code blocks, inline code marks, link contexts, likely URL text, and Source mode. If a context cannot be proven safe, prefer no transformation.
- Rule defaults must match Spec 50: curly quotes, em dash, ellipsis, copyright/trademark symbols, and Pangu spacing enabled; arrows, fractions, multiplication, degrees, spaced dash, and autolink disabled by default.
- Settings must preserve the master switch and provide a per-rule matrix backed by persisted settings. Settings changes must be visible to the live editor without recreating the editor instance.
- ProseMirror `handleTextInput` may receive a multi-character DOM-change batch in Tauri/WebView2. Do not assume `text.length === 1` for a rule whose trigger can be coalesced with adjacent input. Batch handling must remain rule-scoped, preserve any unmatched inserted prefix, and dispatch the transformation in the same editor transaction; do not add a global DOM listener or scan unrelated `docChanged` transactions after the fact.
- Real Settings acceptance must prove master-off raw input, a disabled per-rule raw input, all ten enabled rule transformations, the real debounced persistence/reload path, original-setting restoration, and cleanup of only the run-created article/tab/layout state. Cleanup must also restore the exact original `inkforge-settings` localStorage value and key-presence state instead of leaving a newly materialized default record.
- Required commands: `pnpm vitest run src/extensions/SmartPunctuation.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build`.
- Browser smoke must use a real Workstation article and real keyboard input. At minimum verify em dash, ellipsis, Pangu spacing, disabled-rule behavior, code-block suppression, Source-mode suppression, Settings rule toggles, autolink disabled, and fresh console-error logs are clean.

## WritingGoal Quality Gate

- `normalizeWritingGoalValue()` is the single positive-integer boundary for Settings persistence and Workstation inline editing. Accept only safe positive decimal integers; reject signs, exponents, fractions, unsafe integers, and non-numeric text.
- Explicit empty input may disable a goal only when the field is committed or blurred. A non-empty invalid value must preserve the last valid goal, remain available for correction, and expose visible `aria-invalid` feedback instead of silently clearing the persisted target.
- Settings acceptance must cover document, daily, and weekly targets through visible native number controls, the real five-second debounced write, reload, Pinia/localStorage/DOM agreement, invalid input, original-state restoration, and exact `inkforge-settings` key-presence restoration.
- Hub and Workstation proof must use a real UI-created article and a known text delta. Record the existing daily/weekly baseline, save the article through the production editor path, and assert the exact count and percentage delta on both surfaces; checking only labels or target denominators is insufficient.
- Workstation writing-window entries must count an active article exactly once. Presence checks belong against the real article collection before mapping to `WritingWindowEntry`; never search an id-less mapped entry for an article id.
- Persistent Tauri E2E must clean only run-created article/tab/layout state and must not inject Settings, article, IndexedDB, or localStorage proof data directly.

## AISettings Quality Gate

- `settings.ai.provider === 'none'` and every non-Ollama provider with an empty Key must remain explicit unavailable states. A local rejection must never update `lastConnectionAt`, render connection success, or create generated content.
- `settings.ai.systemPrompt` must enter the shared message path used by every non-streaming and streaming AI writing task, not only the standalone chat panel. The global constraint precedes the task-specific constraint and is omitted when it contains only whitespace.
- Provider-facing writing requests must contain one combined `system` message. Chat global constraints and bounded document context must also be combined into one system message because an adapter may consume only the first system entry.
- A valid chat send with document context must retain at most the supported context limit for regeneration of that same reply. `regenerateLast()` must reuse it, while `clear()` and a later valid send without document context must remove it; do not expose the raw context as public diagnostic state.
- Do not duplicate prompt composition in every outline/polish/title/summary/transcript/continuation method. Keep one typed composer and one shared writing-task message builder so provider behavior cannot drift.
- Unit coverage must prove provider/prompt debounce persistence, AI-tab reset, disabled and missing-Key failure messages, unchanged connection-success timestamps, whitespace-empty behavior, global-before-task composition, and first-send/regeneration document-context parity. A provider-payload test may instrument native fetch only if it forwards the real request and accepts the real failure; it must not construct a provider success response.
- Real Tauri/WebView2 smoke must use visible provider/Key/prompt controls, wait the production debounce, reload, inspect only a non-secret Settings projection, and restore the exact original localStorage value inside the WebView. Never return, print, screenshot, or commit an API Key as test evidence.
- A green unavailable-state test does not prove an external AI provider works. Live provider success requires a separately authorized credentialed request and must never be inferred from local persistence, a pure message test, or a fake response.

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


## ExportSettings Quality Gate

- Settings `export.defaultPlatform` is the authority for initial export platform selection. Do not hardcode `wechat` as the initial Workstation Stage or ExportModal platform when a persisted Settings value exists.
- ExportModal may accept an initial platform from the host surface, but it must not keep overriding the platform after the user manually switches platform while the modal remains open. Re-seed from Settings only on modal open or route/surface initialization.
- Settings `export.customCss` is an export-only renderer input, not runtime editor CustomCSS. WeChat HTML export must receive it through `ExportOptions.customCss`, sanitize it, and merge it before the `juice` inline pass so copied WeChat HTML carries inline styles.
- `settings.export.customCss` must never create, replace, or mutate the runtime `<style id="inkforge-custom-css">`; that tag belongs only to `settings.advanced.customCss`.
- Pure text/Markdown native platforms must not be claimed to publish arbitrary CSS. If XHS/Zhihu publish-side checks are operator-owned for the current round, keep automated evidence limited to local renderer output and document the manual boundary.
- Browser smoke must use a real Workstation article and real Settings/Pinia persistence. At minimum set a non-WeChat default platform, remount Workstation, verify Stage and ExportModal initial platform, restore the original setting, and verify no XHS/Zhihu/WeChat publish action or external upload is claimed.
- For export CSS changes, browser smoke must write a real `settings.export.customCss` value through Settings/Pinia, open WeChat ExportModal from a real Workstation article, verify a body paragraph carries inline style in `.preview-render #nice`, restore the original setting, and verify runtime `#inkforge-custom-css` did not receive the export CSS.

## CustomCSS Quality Gate

- Do not accept a CustomCSS change unless runtime CSS is scoped through `src/services/custom-css/sandbox.ts` and expanded to both effective editor scopes: `.editor-content.editor-content.editor-content.editor-content` and `.tiptap-content.tiptap-content.tiptap-content.tiptap-content .ProseMirror.ProseMirror.ProseMirror.ProseMirror`. The legacy `.editor-content` selector and the live TipTap/ProseMirror editor must both receive the same sandboxed CSS; use concrete comma-expanded selectors with repeated editor classes rather than `:where(...)` or complex `:is(...)` so user paragraph rules can outrank built-in editor paragraph styles without `!important`. Raw string concatenation or direct chrome-wide selector injection is forbidden.
- `Settings > Advanced` CustomCSS must stay separate from `settings.export.customCss` and the legacy theme `customCSS` field. Export-only CSS must keep its WeChat HTML inline export semantics and must not be routed through the runtime editor CSS injector.
- Runtime injection must keep exactly one diagnostic `<style id="inkforge-custom-css">` in `document.head`; if Tauri/WebView2 does not compile dynamic style text into usable `style.sheet.cssRules`, the injector may add one per-Document constructed/adopted stylesheet fallback, but disabling CustomCSS, SafeMode detection, suspension, or a successful style-tag CSSOM path must remove that fallback while preserving the user draft and last published source.
- The sandbox must reject `@import`, remote URLs, active protocols, `!important`, `behavior`, `:host`, and `:host-context`; warnings for frozen design tokens, `position: fixed`, and `contain: strict` must not block apply.
- Required commands before closing a CustomCSS task: `pnpm vitest run src/services/custom-css/custom-css.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` when the default heap cannot complete the production build.
- Browser smoke must use the real Settings UI. At minimum verify default disabled state, successful scoped injection, invalid CSS rejection without replacing the last good style, disable/remove behavior, reset behavior, persisted settings shape, and fresh console-error logs. Runtime CustomCSS browser smoke must assert computed styles on a live `.tiptap-content .ProseMirror` node, not just the presence of style text, because WebView2/Tauri can keep `style.sheet.cssRules` empty while the text node exists.
- If GitNexus cannot map newly added Vue or service symbols, record the limitation and compensate with targeted unit tests, full project gates, build evidence, and real browser smoke instead of claiming graph coverage.

## TauriUpdater Quality Gate

- Do not accept a TauriUpdater change unless it preserves the Tauri 1 compatibility boundary. Current code may dynamically import `@tauri-apps/api/updater` and call `checkUpdate()` only; it must not call `installUpdate()`, `downloadAndInstall()`, `download()`, `install()`, or `relaunch()`.
- Updater behavior in web/dev runtime must be a typed disabled or unavailable result. Do not seed fake release metadata, fake signing keys, fake endpoints, localStorage update payloads, or mock server responses as proof.
- Background startup, interval, resume, and offline checks must be silent on failure. Manual checks may show lightweight Settings feedback and must write `updater.user-check` audit evidence with the real outcome.
- Skip-version persistence must use the durable `updaterSkipped` table first and localStorage only as recovery fallback. A skipped version must remain visible in Settings, while a higher version must not be suppressed by the old skip record.
- Release-note rendering must pass through the updater markdown sanitizer and the shared security HTML sanitizer before display. Non-whitelisted image URLs must be stripped instead of trusted.
- Required commands before closing an updater task: `pnpm exec vitest run src/services/updater/updater.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, `pnpm vitest run`, and `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` when the default heap cannot complete the production build.
- Browser smoke must use the real Settings UI and real Command Palette path. At minimum verify `Settings > About > Tauri Updater`, command `Updater: Check for Updates`, disabled/unavailable web behavior, audit/activity log evidence, fresh console-error logs, and no updater toast unless a real signed update exists.
- Command Palette updater commands must keep command metadata, icon registration, Settings route state, store status, persisted Settings status, and audit evidence in one regression. If a command declares a Lucide icon name, register the component in `CommandPalette.vue` instead of accepting a fallback icon as proof.

## DesktopRuntime Quality Gate

- Do not accept desktop runtime detection that only checks `window.__TAURI__`. Tauri 1 builds may run with `withGlobalTauri=false` and still expose IPC-only globals such as `__TAURI_INVOKE__`, `__TAURI_IPC__`, `__TAURI_METADATA__`, or `__TAURI_POST_MESSAGE__`.
- `services/desktop/environment.ts` must stay aligned with `utils/platform.ts` for Tauri detection semantics. If a new Tauri marker is added to one detector, update the other detector and its tests in the same change.
- Settings > About > Desktop Runtime must never classify a real Tauri WebView2 shell as `Web Runtime` merely because `__TAURI__` is absent. The UI should show an explicit Tauri signal and keep web fallback honest when no Tauri marker exists.
- Safe native-boundary automation should prefer fail-closed probes that do not open OS windows: invalid/missing `reveal_in_explorer` paths, malformed or disallowed shell URLs, and runtime snapshot/window-list readback. Do not automate valid Explorer reveal, system file-picker selection, external URL opening, mail client opening, or clipboard permission prompts unless the test environment owns those OS side effects.
- When a Windows test environment explicitly owns native dialog cancellation, do not treat `WScript.Shell.AppActivate()` or `SendKeys` return values as cancellation proof. Enumerate real visible top-level window handles, restrict the candidate to the configured title or an InkForge-owned dialog class, close that handle, verify it is destroyed, and then require the application to surface its typed cancelled result while preserving prior state.
- Clipboard text is the only clipboard capability currently claimed by the Desktop runtime matrix. Tauri proof must use `@tauri-apps/api/clipboard` through the typed desktop service/store boundary, read back the exact written text, and restore the original text clipboard when the original content is text. Do not treat rich HTML/image clipboard, permission-prompt UX, or WeChat paste proof as covered by this row.
- Required commands after changing desktop runtime detection: `pnpm exec vitest run src/services/desktop/environment.test.ts`, targeted ESLint for touched desktop files, `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` before Tauri e2e, and a real Tauri/WebDriver check for Settings > About > Desktop Runtime.

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

---

## 2026-07-05 executable examples and anti-patterns

### Real verification commands from the current project

```bash
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism
```

```bash
pnpm -C inkforge run style-proof:current-round
pnpm -C inkforge build
```

### Anti-patterns

```ts
// Bad: paper over a failing test with a weak truthiness assertion.
expect(result).toBeTruthy()

// Good: assert the business contract and cannot-claim boundary.
expect(report.canClaimCurrentRoundTarget).toBe(true)
expect(report.canClaimReleaseComplete).toBe(false)
```

A green unit test is not a substitute for visible rendering proof when UI changed. Do not replace real platform/export proof with mock artifacts.
