# Implementation Plan — 工作台渲染与软件化高定修复

## 1. Current status and start gate

- Task status: `in_progress`.
- The planning gate passed; implementation is proceeding in reversible slices. The user selected the static-site directory personal-blog contract for this round.
- Implementation stays in the live application under `inkforge/`; legacy root source trees are evidence only.
- Keep the currently running Vite/Tauri instance available for the user's hand test. Heavy checks run serially and only after the relevant slice is ready.

## 2. Pre-edit protocol for every slice

- [ ] Re-read the owning requirement, screenshot row, design section, and applicable Trellis specs.
- [ ] Check `git status --short`; protect all pre-existing dirty/untracked files.
- [ ] Use GitNexus `impact(direction=upstream)` before editing every function/class/method; stop and report HIGH/CRITICAL impact before editing.
- [ ] Capture the minimal failing test or runtime reproduction before the fix.
- [ ] Change the shared root once; do not patch sibling callers independently.
- [ ] Run the focused check, changed-file lint, and diff review before the next slice.
- [ ] Update the R-01..R-23 evidence matrix with current, not inferred, proof.

## 3. Ordered implementation slices

### Slice A — Canonical rendering and settings contracts

Requirements: R-05, R-13, R-14, R-15, R-16.

Work:

- [x] Add the minimal shared artifact-builder wrapper around existing platform converters and `NativeExportResult`.
- [x] Project canonical WeChat/XHS/Zhihu presets and `style-catalog` applications into one selector model.
- [x] Convert `stores/theme.ts` into a legacy-ID projection/migration instead of a renderer.
- [x] Make `appearance.typography` the only writable typography state; migrate old scalar values without deleting them.
- [x] Add deterministic same-fixture assertions for every selectable persona/platform preset and every supported typography parameter.

Likely files:

- `src/services/export/index.ts`, `types.ts`, `themes.ts`, `style-catalog.ts`
- `src/stores/theme.ts`, `src/stores/settings.ts`
- `src/composables/useTypography.ts`, `src/composables/usePreviewRenderer.ts`
- focused tests beside those files

Rollback point: canonical projection and migrations are independently revertible before UI consumers switch.

### Slice B — Workstation chrome, stable panel geometry, Review, focus, and split

Requirements: R-01, R-03, R-04, R-09, R-10, R-12.

Work:

- [x] Remove the duplicate Workstation brand block while preserving document identity and the global TitleBar.
- [x] Rebuild the crowded manager destination strip as a five-slot compact icon/label grid while retaining all five real panel bodies, active state, and collapse behavior.
- [x] Re-group the command bar and keep Review in the non-overflow mode group.
- [x] Change unpinned inspector reveal to a fixed-edge overlay; docked inspector alone reserves width.
- [x] Move focus controls below the native safe area.
- [x] Route split preview through `usePreviewRenderer`, preserve requested split state at narrow widths, and show an explicit insufficient-space state.
- [x] Persist/reload dock mode, width, split ratio, and split-scroll state with safe defaults.

Likely files:

- `src/views/WorkstationView.vue`
- `src/composables/useEdgeMagnetism.ts`
- `src/components/chrome/TitleBar.vue`
- `src/services/layout-persistence/**`, `src/stores/layoutPersistence.ts`
- `src/views/__tests__/WorkstationView.*.test.ts`
- `src/services/layout-persistence/layout-persistence.test.ts`

Runtime proof: record editor bounding boxes before/during overlay reveal, Review visibility at standard/narrow widths, native-control non-overlap, split enter/drag/reload/exit, and platform-style response.

Rollback point: overlay presentation can return to docked-only without changing article or style state.

### Slice C — Inspector cards, references, and writing focus behavior

Requirements: R-06, R-07, R-08.

Work:

- [x] Extract existing preview/reference/statistics card templates only as needed for shared dock/float/native hosting; do not redesign unrelated inspector content.
- [x] Add in-app float/move/re-dock/close behavior with pointer capture, keyboard actions, bounds clamping, and persistence.
- [x] Add a whitelist-only Tauri utility surface command and web-runtime failure path.
- [x] Repair reference empty/long/many layouts and independent scrolling.
- [x] Prove dynamic Typewriter option updates, viewport anchoring, visible dim focus, reversal, selection preservation, and reduced-motion behavior.

Likely files:

- `src/views/WorkstationView.vue`
- small existing/new components under `src/components/workstation/`
- `src/extensions/TypewriterMode.ts`, `src/components/editor/EditorPanel.vue`
- `src/services/desktop/index.ts`
- `src-tauri/src/commands/window.rs` and command registration
- focused desktop, decoration, layout, and component tests

Runtime proof: float inside app, native utility window, state sync, re-dock, close/reopen, restart fallback, reference edge cases, and caret/dim behavior.

Rollback point: native detachment can be disabled while in-app dock/float remains operational.

Implementation evidence (2026-07-22):

- Real Tauri UI proved platform preview dock/float/native-window transitions, WeChat/XHS/Zhihu live payload sync, close/reopen/re-dock, keyboard move/resize, bounds clamping, and exact floating rectangle restoration after a full Tauri process restart.
- The restart failure was fixed at the shared persistence root: `getLayoutWindowId()` now stores the durable window identity in `localStorage` and migrates the previous `sessionStorage` value without clearing any layout or article records.
- A real nine-link article proved wrapped long URLs, complete open/copy actions, a bounded references card, and an independently scrollable list in the docked Inspector. The test article remains temporary and must be cleared through the visible editor after the user's current hand-test window is free.
- Focused checks passed: four Vitest files / 33 tests; changed-slice ESLint; `vue-tsc --noEmit`; production build; two focused Rust tests; and `cargo check`. The build still reports the pre-existing mixed static/dynamic import warning for `lazy-optional-renderer.ts`; that separate chunk boundary is not claimed fixed by this slice.
- The shared Typewriter scroll path now forces `behavior: 'auto'` for both the application `data-reduced-motion` preference and the operating-system `prefers-reduced-motion` preference. A red-to-green real-plugin regression added two cases; the focused six-file run passed 42/42 with changed-file ESLint and `vue-tsc --noEmit`. At that checkpoint, `R-06` remained open until real caret anchoring, visual dim/vignette reversal, and selection preservation could be visibly proven in Tauri.
- A resumed read-only R-06 audit traced the live path from `settings.editor.typewriterMode` through `EditorPanel` option mutation plus a metadata-only transaction into the existing `TypewriterMode` plugins; no second focus system is needed. Three focused files passed 20/20. That checkpoint did not prove visual perceptibility: the nearest inactive block resolves to `opacity: 0.93`, so calibration remained a real-Tauri measurement decision rather than an inferred pass while the user owned the hand-test window.
- The resumed DPI-aware native acceptance closes R-03 and R-06. Ten right-edge open/hold/collapse cycles completed 10/10 with the editor fixed at `650,351,1110,1044` and `0px` maximum rectangle delta. The earlier failed edge probe was a test-coordinate defect caused by Windows 150% DPI virtualization, not product evidence.
- A real 20-paragraph disposable article proved typewriter dimming, the 50% caret anchor, conditional 50vh end spacer, unchanged selected text across keyboard reversal, and independent vignette on/off. Vignette luminance changed by `-25.96` at the top and `-16.88` at the bottom while the center changed by only `+0.10`.
- One real button-path defect remained: Inspector activation dimmed the body but did not anchor an unchanged current selection until the next cursor move. `TypewriterMode` now treats disabled-to-enabled as one scroll trigger. The regression failed twice before the fix and passed after it; the focused four-file run passed 29/29, changed-file ESLint and `vue-tsc --noEmit` passed, and `writing-focus-typewriter-button-runtime-20260722.png` visibly proves immediate button-path centering.

### Slice D — Tag and folder information architecture

Requirements: R-02, R-11.

Work:

- [x] Flatten `TagBrowser` presentation while retaining real tag actions and associations.
- [x] Make the folder/category tree the only file-manager primary view.
- [x] Remove visible flat/recent/quick-access duplication; keep search, sort, filters, drag/drop, context actions, categories, article status, and assets.
- [x] Normalize persisted legacy view values to `tree` without modifying article/category/asset records.

Likely files:

- `src/components/tag/TagBrowser.vue` or the current tag component path
- `src/components/file/FileManager.vue`
- relevant tag/category/article persistence tests

Runtime proof: create/assign/filter/remove tag; create/rename/move folder/article; show owned assets; reload and verify the same tree/data.

Implementation evidence (2026-07-22):

- `FileManager` now accepts only the canonical `tree` presentation. Existing preference parsing migrates stored `flat`/`recent` values to `tree`; article, category, asset, search, sort, filter, selection, drag/drop, and context-action paths remain intact.
- `TagBrowser` now uses one fixed header and one independently scrollable manager surface with hairline-separated groups instead of nested card shells; real assignment, filter, manager, merge, and cleanup actions remain connected.
- The focused information-architecture contract passed 2/2, and the combined layout/focus/folder run passed 42/42 with changed-file ESLint, `vue-tsc --noEmit`, and exact-scope `git diff --check`.
- Passive real-Tauri visual checks captured `file-tree-canonical-runtime-20260722.png` with the canonical category tree and two real article rows, plus `tag-browser-flat-runtime-20260722.png` with the flattened single-surface tag workflow. The foreground application was not stolen and the panel was restored to File / All for hand testing.
- That passive checkpoint intentionally left CRUD/reload open while the user owned the foreground hand-test window; the resumed visible acceptance below closes the local tag lifecycle and article/category reload portions without storage injection.
- Resumed real-Tauri CRUD used only disposable `IF0722-*` records and production controls. Category `IF0722-CAT-A` was renamed to `IF0722-CAT-B`; its moved article remained count `1` after reload. The FileManager rename defect was reproduced: updating only `Article.title` let stale `EditedContent.title` restore `无标题文章` on hydration. `FileManager` now calls the queued `editorStore.renameArticleTitle()` authority, which updates existing edited content and reuses `syncArticleSnapshot()`, with a direct article fallback only when no edited-content row exists.
- The rename regression moved from 1/3 failing to 3/3 passing; exact changed-file ESLint and `vue-tsc --noEmit` passed. Through the visible FileManager context menu, `IF0722-ARTICLE-A` then agreed in the Workstation header, active tab, file tree, and editor accessible name, and remained identical after native `Ctrl+R`. Evidence: `article-category-title-coherence-runtime-20260722.png`.
- The complete local tag lifecycle was exercised visibly: create/assign, OR filter returning one document, rename, reload persistence, remove, two independent merge runs, AND filter over two assigned tags returning one document, and orphan cleanup. No direct Pinia/IndexedDB/localStorage mutation or synthetic DOM event was used, and no `IF0722-TAG-*` row remained afterward. Evidence: `tag-folder-crud-runtime-20260722.txt`.

Rollback point: presentation switches are reversible because no content records are deleted.

### Slice E — One rendering surface and differentiated platform styles

Requirements: R-05, R-13, R-14, R-15.

Work:

- [x] Replace duplicate Export/Theme selectors with the canonical selector from Slice A.
- [x] Place supported parameters in the collapsible middle pane and diagnostics/proof in an explicit drawer.
- [x] Make `ThemesView`, Workstation preview, split view, Export, and Publish use the same selected platform renderer.
- [x] Surface every real WeChat persona and genuine XHS/Zhihu preset; unavailable proof-only rows remain diagnostics, not pretend selectable styles.
- [x] Refresh platform-rule docs and remove any unverified fixed limit labelled official.

Likely files:

- `src/components/export/ExportModal.vue`
- `src/components/editor/ThemePanel.vue`
- `src/views/ThemesView.vue`, `src/views/PublishView.vue`, `src/views/WorkstationView.vue`
- `docs/platform-rendering-rules/*.md`
- `.trellis/spec/frontend/wechat-svg-modules.md` only if executable SVG rules change
- export/preview/style tests

Runtime proof: select each platform and style against the same real article, change every visible parameter, compare preview/native artifact, and verify diagnostics are secondary but intact.

Rollback point: each consumer can temporarily remain on the canonical projection without restoring legacy CSS generation.

### Slice F — Export/Publish separation and real folder/blog delivery

Requirements: R-16, R-17.

Work:

- [x] Keep Workstation Export opening the local artifact flow; route Publish to the distinct publish center.
- [x] Move WeChat draft/account operations out of `ExportModal` into `PublishView` while preserving errors, status, proof, and history.
- [x] Add standard HTML/Markdown choices and exact artifact metadata.
- [x] Implement native selected-directory write for personal folder and static-site blog output using staging + rename and readback.
- [x] Preserve XHS/Zhihu manual handoff; never infer upload/publish success.

Likely files:

- `src/components/export/ExportModal.vue`
- `src/views/PublishView.vue`, `src/views/WorkstationView.vue`
- `src/services/export/**`, `src/services/desktop/index.ts`
- minimal Rust file command and command registration under `src-tauri/src/`
- settings/export history and focused native-path tests

Runtime proof: export/copy/save distinct from publish; write Markdown/HTML/assets to a real temporary user-selected folder, read every file back, test existing-destination and partial-failure behavior, and verify WeChat draft action exists only under Publish.

Implementation evidence (2026-07-22):

- Added the real local bundle builder for personal-folder and Hugo/Hexo/Jekyll-compatible static-site output. It emits Markdown or semantic HTML, preserves existing frontmatter, generates portable blog frontmatter only when absent, and materializes existing `inkforge-asset://` records through the production asset snapshot service into deterministic relative asset paths.
- Added the typed desktop bridge and registered Tauri `write_local_delivery_bundle` command. The native boundary canonicalizes the selected root, validates portable relative paths, rejects duplicate/file-parent/symlink conflicts, caps file/byte totals, stages and flushes all files, backs up replacements, installs, reads every file back byte-for-byte, and restores prior files after a commit/readback failure.
- ExportModal exposes visible personal-folder/static-blog and Markdown/HTML choices, opens the real native directory picker, reports typed errors, and shows success only after the native readback result. Web runtime remains explicitly unavailable; no WordPress/Ghost or external publish success is synthesized.
- Current focused checks passed from the authoritative worktree: three Vitest files / 14 tests and three real-filesystem Rust tests. The Rust suite covers text plus binary write/readback, pre-mutation traversal/path-conflict rejection, and forced partial-commit rollback.
- Real visible OS-picker Markdown/HTML writes remain open while the user owns the foreground hand-test window. No direct component-state injection or command-only result is being substituted for that UI evidence.
- The integrated regression pass also succeeded: ten focused Vitest files / 61 tests, exact changed-file ESLint, `vue-tsc --noEmit`, `cargo check`, and the production build all passed serially.
- GitNexus pre-edit impact for the remaining chunk warning was `LOW` for `usePreviewRenderer` (two direct consumers, no affected process) and `LOW` for `renderWechatMarkdownWithLazyEnhancements` (two direct consumers, no affected process). The shared wrapper itself was `CRITICAL` and remained unchanged. Its two callers now statically import the tiny lazy wrapper while `optional-renderers.ts` continues to load only through the wrapper's cached dynamic import.
- The warning fix passed two focused Vitest files / 382 tests, exact two-file ESLint, `vue-tsc --noEmit`, and a fresh production build of 4,675 modules in 1m28s. The previous mixed static/dynamic import warning is absent, and `optional-renderers-*.js` remains a separate 10.03 kB chunk.
- Real visible Tauri acceptance selected two newly created disposable directories through the Windows folder picker. Personal-folder + Markdown produced `未命名文章.md` (882 bytes, SHA-256 `281827A2E635C664A4E271E42504E979CF441C493280F119EA42DA3BAD9672B9`); personal-blog + HTML produced `未命名文章.html` (1,531 bytes, SHA-256 `CEE6522F0A91E2D8710C6F8E61B459DD118865FC77A56EBB3B8BDF269BADE1CA`) with portable title/date/draft frontmatter and a semantic HTML document.
- Both visible runs ended with the application readback status `1 个文件已逐一回读验证`. Independent recursive disk inspection found exactly one expected artifact in each destination and zero `.inkforge-stage-*` / `.inkforge-backup-*` residue. No component-state injection, direct Tauri command invocation, Playwright, or inferred success was used; the export modal was closed and the running application remained responsive afterward.
- Follow-up history audit found that the successful native write reused the selected social platform plus `download`, which could mislabel a verified personal-folder/blog write as WeChat/XHS/Zhihu. The existing history schema now adds only `platform='local'` and `action='write-local'`; `ExportModal` records them only after native byte-for-byte readback, and Settings renders `本地交付 / 本地写入并回读`. The red state failed 2/4 focused assertions; the green run passed 2 files / 4 tests, followed by exact changed-file ESLint and `vue-tsc --noEmit`.

Rollback point: native folder delivery is isolated from the renderer and can be disabled without losing generated content.

### Slice G — Settings shell, controls, and About

Requirements: R-18, R-19, R-20.

Work:

- [x] Keep `/settings` route identity stable across query-tab changes.
- [x] Animate only the inner section and active rail; respect reduced motion.
- [x] Apply the existing settings control pattern to refresh/file/action rows and keep the native file input accessible.
- [x] Re-group About while retaining version, updater, runtime, storage, diagnostics, and credits.

Likely files:

- `src/components/ViewTransition.vue`
- `src/views/SettingsView.vue`
- small existing settings components/styles and focused tests

Runtime proof: switch every settings category repeatedly with no blank frame or shell remount, check left navigation and focus continuity, narrow layout, file selection, refresh, and About overflow.

Implementation evidence (2026-07-22):

- `UpdateCard.vue` now owns its complete scoped updater presentation instead of relying on parent-scoped `.sv-*` rules that cannot cross the child-component boundary. Metrics, controls, policy, status, focus, disabled, and responsive states render through the existing settings visual language.
- `SettingsView` keeps the route shell mounted, animates only `.sv-tab`, resets the real content scroller on tab changes, presents the About identity as a compact horizontal group, and keeps native file inputs visually mediated by existing accessible action triggers.
- Real Tauri regression exposed and fixed the remaining geometry root cause: `.settings-view { height: 100vh }` exceeded the already titlebar-adjusted `.app-route-shell`, creating an outer document scroll that could hide the About heading and navigation. The view now fits `height: 100%`, the body has a bounded flex height, and the long sidebar owns an independent vertical scroll surface.
- Red-to-green source contracts now pass 7/7; changed-file ESLint and `vue-tsc --noEmit` pass. In the live Tauri app, Appearance was scrolled until its heading was off-screen, the visible About navigation button was clicked, and the About heading returned to `(L992, T267, R1931, B328)` with the left navigation still present. Evidence: `settings-about-independent-scroll-runtime-20260722.png`.

Rollback point: route-key fix and visual grouping are independent.

### Slice H — Hub creation, inspiration, and search

Requirements: R-21, R-22, R-23.

Work:

- [x] Remove only the header and Recent-card duplicate creation entries; keep Start and the red floating menu.
- [x] Strengthen Recent heading hierarchy.
- [x] Add persisted `local | ai` inspiration source; local text is editable/persistent and AI generation uses the existing service and settings patterns.
- [x] Add an anchored keyboard-operable search result list using the existing computed real-article filter and open action.

Likely files:

- `src/views/HubView.vue`
- existing settings/profile persistence store
- `src/views/__tests__/HubView.cards.test.ts` plus focused search/inspiration tests

Runtime proof: all retained creation routes, local mode without network, local edit and restart persistence, AI unconfigured/failure/success, keyboard search/open/clear/no-results.

Rollback point: source mode defaults to local; existing article data is untouched.

Implementation evidence (2026-07-22):

- GitNexus pre-edit impact was `LOW` for search/inspiration/menu symbols except `closeQuickActionMenu` (`MEDIUM`, six direct callers); the retained FAB owns the same menu, shortcut, focus-return, template, blank-document, and import commands.
- TDD red state: `HubView.cards.test.ts` failed 5/12 before product changes (duplicate entrances, no anchored results/source switch, no persistence API).
- Green state: `pnpm exec vitest run src/views/__tests__/HubView.cards.test.ts --reporter=default` passed 12/12; changed-file ESLint, `vue-tsc --noEmit`, and the production build passed.
- The running Tauri/Vite session accepted every HMR update without a server compile error. Final visual/restart/AI provider checks remain part of the real desktop runtime matrix and must not be inferred from these local checks.

### Slice I — Integrated acceptance, docs, and closure

Requirements: R-01..R-23.

Work:

- [x] Run the requirement-to-evidence audit; no requirement may inherit proof from a neighboring row.
- [x] Run relevant Vitest groups serially, WebdriverIO targeted smoke where applicable, changed-file ESLint, typecheck, build, Rust check, and GitNexus `detect_changes`.
- [x] Exercise real Tauri interaction matrix and capture non-sensitive evidence.
- [x] Run WeChat application-scope style samples/preflight; keep external gates truthful.
- [x] Record XHS/Zhihu publication as user-manual pending/pass only from the user's real result.
- [x] Update task/docs/spec and final report with exact commands, counts, failures fixed, and remaining external boundaries.

Integrated runtime evidence (2026-07-22, R-11):

- Used the production Inspector uploader and the native Windows Open dialog to select the real project-owned `public/favicon.svg`; the canonical FileManager rendered its thumbnail and showed `素材 (1)` / `favicon.svg` without storage injection or a synthetic upload.
- Stopped the full Tauri process tree, confirmed that both `InkForge.exe` and port 3005 were gone, then started a fresh `pnpm tauri dev` process tree. The new Hub restored `IF0722-ARTICLE-A` and `IF0722-CAT-B (1)`; reopening the article restored its 20-paragraph body and the same SVG asset row.
- Evidence is recorded in `asset-persistence-full-restart-20260722.txt` with `asset-persistence-before-restart-20260722.png`, `asset-persistence-after-full-restart-20260722.png`, and `asset-persistence-after-full-restart-editor-20260722.png`. R-11 is now `verified`; this evidence does not imply any credentialed platform synchronization or publication result.

Integrated validation evidence (2026-07-22):

- Serial focused regression passed 22 files / 136 tests; the cross-platform renderer group passed 4 files / 416 tests; the complete export service suite passed 44 files / 1,378 tests.
- The first full Vitest run exposed 14 elapsed-clock failures in two subprocess CLI test files. Production freshness behavior was correct: proof collected on 2026-07-03 is stale under the 14-day window on 2026-07-22. The minimal test-only fix pins `Date.now()` in those child processes to the committed snapshot date; no manifest date, freshness rule, or production path changed. The targeted clock regression passed 2 files / 23 tests, then the final full suite passed 119 files / 1,895 tests.
- ESLint passed all 55 exact changed TS/Vue files (53 product files plus the two CLI regression files); `vue-tsc --noEmit`, the 4,675-module production build, `cargo check`, and `cargo test` (28/28) passed. Generated `tsconfig.tsbuildinfo` was restored and is not part of the intended change.
- Application-scope style preflight is `application-ready`: 27 modules, 4 personas, 108 module/persona pairs, 13 selectable/rendered style choices, 45 SVG modules, and zero application/style issues. A separate real-clock strict preflight remains `blocked-by-external` and `canClaimComplete:false`; stale/external phone, sync, public-host, upload, and publication proof was not inferred.
- GitNexus change detection reports aggregate `critical` risk over the complete 143-entry dirty worktree, including unrelated existing changes. It is a commit-boundary warning, not evidence that this task alone introduced a critical execution-flow change. No commit is planned without an exact staged scope and a fresh change audit.
- Exact commands, log names, boundaries, and current-clock results are recorded in `integrated-validation-20260722.txt`.

Read-only visual/source audit while the user owns the foreground window (2026-07-22):

- `desktop-current-20260722.png` closes R-10: the native Tauri window retains one global TitleBar brand and one taskbar identity, while the former second Workstation brand is absent.
- The same audit found a real R-13 contradiction rather than promoting indirect evidence: `WorkstationView.vue` still renders its typography controls permanently expanded under the primary style selector. `file-tree-canonical-runtime-20260722.png` visibly confirms this, while the existing canonical-presets/Export tests cover different surfaces. R-13 is therefore `open`, not merely awaiting hand-test confirmation.
- A focused source contract was added without touching the running product surface. It requires exactly one primary `preset-strip`, one default-closed native `<details class="inspector-advanced-settings">` after it, and retention of width, typography sliders, indent, heading, quote, and font-family controls. The red run failed exactly at the missing details pane (1 failed / 9 passed), while changed-test ESLint passed. Evidence: `r13-advanced-pane-red-20260722.log`.
- GitNexus pre-edit impact for the authoritative `inkforge/src/views/WorkstationView.vue` file was `LOW` with zero callers and zero affected execution flows. The minimal product fix reuses native `<details>` and the installed Lucide `ChevronDown`: the singular preset selector and “查看全部预设” remain directly visible, while width, font family/preview, all typography sliders, first-line indent, heading style, and quote style move together into one default-closed advanced pane. No setting, renderer, control, or diagnostic path was deleted.
- The red regression became green 10/10. The combined Workstation/typography/preview/preset run passed 4 files / 19 tests; exact two-file ESLint, `vue-tsc --noEmit`, and a fresh 4,675-module production build passed. Generated `tsconfig.tsbuildinfo` was restored after the build. Evidence: `r13-advanced-pane-green-20260722.log`, `r13-integrated-regression-20260722.log`, and `r13-production-build-20260722.log`.
- Vite accepted the template/style HMR and the native process stayed responsive. Editing the imported raw test file also caused one development-page reload before the product HMR; no article/layout store was cleared. The final R-13 status remains `implementation-tested` until the user visibly confirms default close, keyboard disclosure, retained controls, and absence of a duplicate selector.
- A corrected Per-Monitor-DPI-aware background `PrintWindow` captured the full 2100×1350 restored native window at Windows 150% scaling without focus or input. `workstation-restored-commandbar-runtime-20260722.png/.txt` closes the restored-width portion of R-01 and reconfirms R-10: one global brand, aligned document/export and Default/Write/Review/Split groups, visible Publish, and no collision with minimize/maximize/close. Narrow, maximized, and keyboard rows remain open.
- The remaining non-destructive user route is recorded in `handtest-remaining-20260722.md` so each row receives its own evidence instead of borrowing a neighboring screenshot.

Real-article cross-platform rendering audit and Zhihu paragraph-rhythm repair (2026-07-22):

- A read-only Windows UI Automation pass extracted the exact 20 visible paragraphs of the running native `IF0722-ARTICLE-A` without focus, input, IndexedDB writes, or recovery-banner interaction. The redacted task-local source is `r14-r15-real-article-20260722.json`.
- The current production converters rendered that one runtime article through all 16 WeChat, 5 XHS, and 3 Zhihu presets. WeChat produced 16/16 unique non-empty outputs and XHS produced 5/5; Zhihu initially produced only 2/3 because `zhihu-academic` and `zhihu-insight` were byte-identical on paragraph-only content.
- GitNexus pre-edit impact for `generateZhihuCSS` was `LOW`: one direct file dependency, zero affected execution flows. The shared root cause was that preset fonts were ignored and ordinary paragraphs used one hard-coded line-height, spacing, indent, alignment, and browser font stack. The minimal fix keeps clean Markdown unchanged while making local Zhihu preview/HTML body rhythm preset-aware.
- TDD evidence: `r15-zhihu-paragraph-persona-red-20260722.log` failed exactly at 2 distinct outputs for 3 presets; `r15-zhihu-paragraph-persona-green-20260722.log` passes 5/5 tests after the repair. The integrated Zhihu/theme/typography run passes 4 files / 276 tests, the established cross-platform renderer group passes 4 files / 416 tests, exact two-file ESLint and `vue-tsc --noEmit` pass, and the fresh production build passes 4,675 modules. Evidence: `r15-zhihu-integrated-regression-20260722.log`, `r15-cross-platform-regression-20260722.log`, `r15-zhihu-production-build-20260722.log`.
- Re-running the real-article pipeline now produces 16/16 unique WeChat, 5/5 unique XHS, and 3/3 unique Zhihu outputs. The portable manifest and side-by-side HTML are `r14-r15-real-article-platform-gallery-20260722.json/.html`; `r14-r15-real-article-gallery-run-20260722.log` records the executable result. This is local renderer evidence only and does not claim XHS/Zhihu account upload or publication.
- The configured CloakBrowser MCP currently resolves a different profile from the task-owned session; no browser was opened with the wrong profile. Visual gallery review therefore remains a user/CloakBrowser follow-up rather than being inferred from unique hashes.
- Editing the imported regression file caused one Vite development-page reload, followed by the production `zhihu.ts` HMR update. The native process remained alive; no article, layout, or recovery state was intentionally changed. Reconfirm the currently visible article before continuing manual interaction.

Real-article native artifact audit and XHS wrapped-title repair (2026-07-22):

- `convertToNativeFormat()` generated truthful native files from the same read-only 20-paragraph article. Full Zhihu Markdown is ready with zero quality errors. Full XHS text is 1171 characters and remains blocked by `xhs-char-limit`; the largest exact source prefix accepted by the current local detector is paragraphs 1-17, which was written as a separate ready text artifact. No text was silently truncated or relabeled as the full article.
- The production `sliceMarkdownToXhsCards()` and `renderXhsMarkdownCardSliceSvg()` path preserved all 20 source paragraphs in 20 ordered source-owned cards. The installed `sharp` evidence renderer produced twenty real 1080×1440 PNG files and independent hash/dimension readback succeeded. The pack remains `blocked-by-current-page-limit` because 20 exceeds the current 18-page checklist; these PNGs do not claim WebView canvas export or platform acceptance.
- Visual inspection of real card pages 1, 10, and 20 found a production defect: a two-line title used fixed subtitle/body coordinates and overlapped `Section card`. GitNexus pre-edit impact for `renderXhsMarkdownCardSliceSvg` was `LOW` with zero direct dependents and zero affected flows. The shared renderer now derives subtitle and body baselines from the final wrapped-title baseline for both section and cover branches.
- The focused XHS card slicer regression passes 5/5, including a long-title geometry assertion. Regenerated pages 1 and 20 visibly separate title, subtitle, and body. `r15-real-native-artifacts-run-20260722.log`, `r15-xhs-card-layout-green-20260722.log`, and `r15-native-artifacts-20260722/manifest.json` record the executable result and cannot-claim boundaries.
- The post-fix integrated renderer run passes four files / 399 tests; exact changed-file ESLint and `vue-tsc --noEmit` pass; the production build passes 4,675 modules in 52.74 seconds with no Vite warning. GitNexus `detect_changes(scope=all)` completed and sees the expected `RenderXhsMarkdownCardSliceSvg` flows; its aggregate `critical` rating covers the pre-existing 107-file dirty worktree, not this `LOW`-impact function in isolation.
- Editing the imported XHS test file triggered two Vite development-page reloads. A subsequent read-only native UIA check confirmed the same `InkForge.exe` remained visible/enabled, `IF0722-ARTICLE-A` remained saved and selected, and the recovery banner remained present. No foreground input or storage mutation was used.

XHS real-article card compaction and prose-semantics follow-up (2026-07-22):

- A full 20-page visual contact audit rejected the prior pack even though hashes and dimensions were valid: ordinary blank lines flushed every paragraph into its own card, leaving most pages empty and causing an artificial 18-page limit failure. The same renderer also drew a bullet beside every wrapped prose line.
- GitNexus pre-edit impact for both `sliceMarkdownToXhsCards` and `renderXhsMarkdownCardSliceSvg` was `LOW`, with zero direct dependents and zero affected flows. The shared fix treats ordinary blank lines as paragraph separators rather than page breaks, packs source-line groups without splitting a paragraph that fits on the next card, preserves per-card source-line ranges, and draws markers only for actual Markdown list rows. Explicit headings, manual page breaks, fences, and true capacity overflow remain unchanged.
- The focused slicer suite now passes 8/8. A temporary executable generator was used only to refresh the exact task-local evidence and was then deleted. The same 20 real paragraphs now produce 10 ordered 1080×1440 PNGs, remain below the current 18-page local limit, and return zero `validateXhsImageArtifactManifest()` issues.
- Independent Python readback confirms 10/10 dimensions and hashes, 20/20 paragraph markers, `SELECTION-PROBE`, and zero manifest issues. Visual review of all 10 pages rejects no page for overlap, crop, mid-paragraph pagination, or false prose bullets. The full XHS text remains separately and truthfully blocked at 1171 characters; this image-pack evidence still does not claim WebView canvas export, account upload, preview, or publication.
- The source/test edit caused a Vite development-page reload. A subsequent read-only screenshot confirmed `IF0722-ARTICLE-A` remained selected and saved and the recovery banner remained present; no foreground input or storage mutation was used.
- Final slice verification passes exact ESLint, `vue-tsc --noEmit`, 4 files / 402 integrated tests, the complete serial export suite at 44 files / 1,383 tests, and a 4,675-module production build in 59.68 seconds. Generated `tsconfig.tsbuildinfo` was restored. Portable evidence: `r15-xhs-card-compaction-verification-20260722.txt`.
- GitNexus `detect_changes(scope=all)` completed and includes the expected `SliceMarkdownToXhsCards` and `RenderXhsMarkdownCardSliceSvg` flows. Its aggregate `critical` result covers 257 changed symbols across the pre-existing 107-file dirty worktree; the isolated pre-edit impact for both production symbols was `LOW` with zero direct dependents. Exact tracked diff check and the task-sensitive-artifact scan pass.
- A post-slice serial regression across the 15 core Workstation, file-tree, writing-assist, typography, platform-preview, preset-count, local-delivery, Settings, and Hub test files passes 15/15 files and 87/87 tests. This confirms no implementation-path regression but does not replace the remaining native visible gates. Evidence: `r01-r23-core-regression-20260722.txt`.

ExportModal primary-flow diagnostics follow-up (2026-07-22):

- Static source review found a remaining R-13 contradiction: the style capability catalog was default-closed, but quality detection and Export preflight still occupied the normal flow. The preflight visibly repeated style-catalog, acceptance-claim, and committed-proof detail below the primary selector.
- GitNexus reported `LOW` upstream impact for `selectPreset` with one direct dependent and zero affected execution flows. The repair changes only template hierarchy: one native default-closed `<details class="export-diagnostics-drawer">` now contains the existing quality report and all existing preflight rows. No renderer, preset state, report, artifact action, or external-proof boundary was removed.
- The focused contract first failed 1/7 on the missing drawer and then passed 7/7. Adjacent ExportModal/Workstation checks passed 3 files / 18 tests; the R-13/R-14/R-16 integration surface passed 6 files / 28 tests; exact two-file ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build in 55.15 seconds passed. The build used a 3,072 MB heap cap and generated `tsconfig.tsbuildinfo` was restored.
- Vite accepted the HMR update, HTTP 200 and both existing application/development processes remained alive, and no foreground input or storage mutation was used. Native visible/keyboard confirmation remains explicit hand-test evidence rather than inferred completion. Evidence: `r13-export-diagnostics-secondary-20260722.txt`.

R-01 narrow command-bar follow-up (2026-07-22):

- Static CSS review found a deterministic narrow-width geometry defect: below 901px the Back button kept the default first flex row, the title forced itself onto a second full-width row, and the actions forced a third row. This contradicted the compact command-bar contract even before a foreground interaction was required.
- GitNexus file-level upstream impact for `WorkstationView.vue` was `LOW` with zero direct dependents and zero affected execution flows. A focused source contract first failed 1/11, then passed 11/11 after the breakpoint changed to a two-column grid whose first row is Back + document identity and whose second row spans all actions.
- The adjacent Workstation layout/focus/vignette run passed 3 files / 21 tests; exact two-file ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build passed. `tsconfig.tsbuildinfo` was restored after the build. Vite emitted one test-file reload and one style HMR; no article data, layout store, renderer, or action was changed.
- This closes the deterministic CSS defect, not the visual gate. The user's narrow/maximized/keyboard hand test remains required. Evidence: `r01-narrow-commandbar-grid-20260722.txt`.

R-21 template-market creation-entry deduplication follow-up (2026-07-22):

- Read-only Hub inventory found one remaining contradiction after the header and Recent-card cleanup: `TemplateMarketGrid.vue` still rendered a third visible plus card labelled `新建模板`, but clicking it only reopened the ordinary article template picker and did not create or persist a reusable template. The real template selection path already remains reachable from Start and the bottom-right red FAB.
- GitNexus file-level upstream impact was `LOW`: `TemplateMarketGrid.vue` has one direct dependent (`HubView.vue`) and neither file affected an indexed execution flow. The minimal repair removes only the duplicate CTA, its `create-new` event wiring, unused Lucide `Plus` import, and now-dead light/dark CTA styles. Ordinary template cards, category filters, selection events, Start, FAB, import, and shortcuts remain intact.
- The strengthened source contract first failed exactly 1/12 on `@create-new="openTemplatePicker"`, then passed 12/12 after the repair. Exact three-file ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build passed; generated `tsconfig.tsbuildinfo` was restored.
- Vite reported only the expected raw-test reload and Hub/template-grid HMR updates. The development endpoint remained HTTP 200 and no article/store mutation was performed. This closes the deterministic third-entry defect, while visible retained-route, focus-return, and no-dead-space checks remain the user's native hand-test gate. Evidence: `r21-template-market-creation-dedupe-20260722.txt`.

R-23 Hub search editable-shortcut and result-focus follow-up (2026-07-22):

- Read-only keyboard-flow review found two deterministic gaps. `handleHubKeydown()` returned early for every editable target before processing Ctrl/Cmd+F, so the shortcut could fall through to the WebView while focus was in the search or Local-inspiration fields. Escape was handled only on the search input; after Tab moved focus to a result button, the anchored panel could not close or restore input focus.
- GitNexus exact upstream impact for both `handleHubKeydown` and `closeHeaderSearch` was `LOW`, with zero direct dependents, zero affected processes, and zero affected modules. The minimal repair processes the Hub search shortcut before the editable-target guard, handles Escape only when focus is inside the open anchored search surface, and uses `nextTick` to restore the input after a focused result is removed.
- Two source contracts first failed exactly 2/14, then passed 14/14 after the repair. The first `vue-tsc` run correctly rejected passing a `KeyboardEvent` into the new optional boolean parameter; changing the template binding to explicit `closeHeaderSearch()` resolved the real type mismatch. Exact ESLint, the repeated 14/14 run, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build in 1m16s pass. Generated `tsconfig.tsbuildinfo` was restored.
- Vite reported the expected raw-test reload and two Hub HMR updates. The endpoint remains HTTP 200 and the same native PID remains alive. This is implementation evidence only; real-article result navigation, editable-field Ctrl/Cmd+F, result-button Escape/focus return, no-result, clear, and reload behavior remain explicit native hand-test gates. Evidence: `r23-hub-search-keyboard-focus-20260722.txt`.

R-14/R-15 Workstation platform-preset affinity follow-up (2026-07-22):

- Rendering-chain review found a deterministic mismatch: `selectPreviewPlatform()` changed only the local platform while `usePreviewRenderer()` continued to consume the previous platform's global `defaultPresetId`. A WeChat ID therefore became an unselected silent fallback after switching to XHS or Zhihu, exactly reproducing the appearance that those platform styles did not exist or did not apply.
- `ExportModal.vue` and `ThemesView.vue` already use per-platform preset memory. The Workstation now follows the same existing pattern without adding a new abstraction: one valid default per platform, the stored valid pair seeded on mount, one computed current preset, and synchronized platform/preset settings on selection. The preview getter and visible active class both consume that same computed ID.
- GitNexus exact upstream impact for `selectPreviewPlatform` and `applyPreset` was `LOW`, with zero direct dependents, zero affected processes, and zero affected modules. The focused contract first failed exactly 1/12 and now passes 12/12.
- The integrated Workstation/preview/theme/persona run passes 4 files / 24 tests, including XHS similarity 1.0000 and canonical typography output. Exact two-file ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build in 1m18s pass. Generated `tsconfig.tsbuildinfo` was restored.
- Vite reported only the raw-test reload and Workstation HMR update; HTTP remains 200 and the same native PID remains alive. Visible cross-platform switching, one-active-preset state, per-platform return, and real-article preview differences remain native hand-test gates. Evidence: `r14-platform-preset-affinity-20260722.txt`.

R-05/R-14/R-16 renderer-selection handoff follow-up (2026-07-22):

- A foreground-safe trace confirmed one shared root: Workstation wrote a valid `defaultPlatform` / `defaultPresetId` pair, but ExportModal and Publish initialized separate fixed or legacy state. Exact GitNexus upstream impact remained `LOW` for `selectPreset`, `normalizeInitialPlatform`, `selectedPreset`, and `generateHtml`, with at most one direct dependent and zero affected execution flows.
- `ExportModal.vue` now seeds valid stored platform/preset state, resynchronizes it on every open, updates the canonical pair when either the platform or preset changes, and derives the WeChat accent from that same preset. The existing per-platform session record remains; no new store or renderer was introduced.
- `PublishView.vue` now starts from the canonical settings pair, retains one real preset per platform, writes the active pair back on platform/preset changes, and no longer consumes the legacy theme store. WeChat Publish merges `settings.appearance.typography` and export custom CSS through the existing `typographyToWechatCss()` path; the visible first-line-indent switch writes that canonical source. Zhihu no longer displays the Mac-code/line-number/indent section that its converter cannot consume.
- At this slice, the ExportModal contract passed 2/2 and the Publish contract passed 11/11; the later R-16 responsibility follow-up raises current Publish coverage to 12/12. The integrated Workstation/preview/typography/settings/Export/Publish run passed 6 files / 40 tests. Exact ESLint, `vue-tsc --noEmit --pretty false`, and a fresh 4,675-module production build passed. Vite emitted the expected test reload and component HMR only; HTTP remained 200 and the same native process stayed alive. Native visible handoff confirmation remains required.

R-12 native split-view UIA follow-up (2026-07-22):

- The existing native Split control exposed a UIA Toggle pattern. A background-safe sequence observed `0 → 1 → 0` and restored the original state without editing article content or touching the recovery banner.
- While active, the real Tauri accessibility tree exposed the visible “分栏视图” title, a `Thumb` named “调整分栏预览宽度”, the “暂停同步滚动” control, and the “关闭分栏视图” action. All split-only elements disappeared after closing.
- This proves a real split surface and reversible entry/exit, not divider movement, synchronized-scroll behavior, platform visual changes, restart persistence, or the narrow insufficient-space state. Evidence: `r12-split-native-uia-20260722.txt`.

R-19 extension manifest file-trigger follow-up (2026-07-22):

- Source audit found the remaining raw native file control: Settings import and CustomCSS already used the shared hidden-input/styled-trigger pattern, while Extensions still rendered `<input class="sv-input" type="file">` directly.
- GitNexus upstream impact for `handleExtensionManifestFile` and the reused `triggerSettingsImport` pattern was `LOW`, with one direct dependent and zero affected execution flows each.
- The minimal repair reuses that local pattern: a standard `sv-action-btn` calls `extensionManifestInput.value?.click()`, the real input is visually hidden and removed from tab order, and the manifest parsing/install path is unchanged.
- The focused Settings shell contract passes 7/7, exact ESLint and `vue-tsc --noEmit --pretty false` pass, and the running endpoint remains HTTP 200 with the same native PID. Visible chooser cancel/select/focus/narrow review remains the user's hand-test gate. Evidence: `r19-extension-file-trigger-20260722.txt`.

R-15/R-16 Publish native handoff red audit (2026-07-22):

- A foreground-safe source audit found a real remaining contradiction: Publish generated XHS/Zhihu preview HTML and then routed the primary action through `copyRichHtmlToClipboard()` plus the rich DOM fallback. The shipped `convertToNativeFormat()` already defines the actual publication handoff as XHS plain text and Zhihu clean Markdown, so the current primary action is neither the canonical native artifact nor a truthful manual handoff.
- Exact GitNexus upstream impact is `LOW` for `generateHtml` and `copyRichText` (one direct dependent each, zero affected execution flows), and `LOW` for `recordPublishExportHistory` (three direct dependents, zero affected execution flows). No HIGH/CRITICAL symbol is involved.
- The read-only red contract records 0/6 passing assertions: no canonical native exporter import, no typed native result, non-WeChat rich-copy and rich-DOM fallback remain, and the XHS/Zhihu primary labels do not name their real formats. Evidence: `r15-r16-publish-native-handoff-red-20260722.txt`.
- The running Tauri/WebView was not touched because the user currently owns the foreground hand-test window. The fix must reuse `convertToNativeFormat()`, preserve WeChat rich HTML, copy XHS as text and Zhihu as Markdown, record the exact copied bytes only after success, and continue to leave account upload/publication to the user.
- After the application had been idle for more than ten minutes, the minimal repair reused the existing ExportModal pattern rather than adding a new builder: Publish now generates preview HTML through the canonical platform renderer, stores one typed `NativeExportResult`, ignores stale async generations, and removes the redundant `onMounted()` render. Its primary action copies HTML only through the WeChat rich/fail-closed boundary and routes XHS text plus Zhihu Markdown only through `copyTextToClipboard()`; history bytes come from the exact copied native content. This slice still labelled a secondary local file `下载预览 HTML`; the 2026-07-23 R-16 follow-up below removes that superseded Publish-local action.
- At this slice, the source contract was green 8/8 and the focused Publish suite passed 11/11; current focused Publish coverage is 12/12 after the responsibility follow-up. The integrated Workstation/preview/typography/settings/Export/Publish run passed 6 files / 40 tests; the cross-platform renderer run passed 4 files / 416 tests. Exact ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build in 1m12s passed; `tsconfig.tsbuildinfo` was restored. Evidence: `r15-r16-publish-native-handoff-green-20260722.txt`, `r15-r16-publish-native-handoff-focused-20260722.log`, `r05-r14-r15-r16-publish-native-integrated-20260722.log`, `r15-r16-publish-native-cross-platform-20260722.log`, and `r15-r16-publish-native-production-build-20260722.log`.
- GitNexus post-edit detection completed over the aggregate dirty worktree: 303 changed symbols, 108 files, 30 affected processes, `critical`. This remains an aggregate commit-boundary warning; each edited Publish symbol had exact `LOW` pre-edit impact and zero affected execution flows. The Tauri process and port 3005 remained alive. Native button labels, clipboard content, and Settings history remain explicit user hand-test gates; XHS/Zhihu account upload/publication remains external.

R-12 source-mode synchronized-scroll repair (2026-07-22):

- The full Workstation -> EditorPanel -> useSyncScroll trace found a deterministic gap behind the previously verified Split surface: `EditorPanel.getEditorScrollElement()` always returned the Typora `.editor-scroll`, even when Source mode hid it and CodeMirror's `.cm-scroller` owned visible scrolling. Listener binding watched Split enablement only, so a Typora/Source switch with Split left open retained the stale surface; hidden TipTap geometry was also still offered as Source-mode heading anchors.
- GitNexus exact pre-edit impact stayed `LOW`: `getEditorScrollElement` and `getSplitLeftScrollElement` had zero indexed upstream dependents/processes; `useSyncScroll` had one direct dependent (`WorkstationView.vue`) and zero affected processes.
- The shared-root repair keeps Typora unchanged, returns live `.cm-scroller` in Source mode, exposes one `useSyncScroll.rebind()` lifecycle operation, rebinds after mode changes, and uses the existing proportional fallback instead of hidden heading geometry in Source mode. No persistence schema, article state, rendering converter, or external action changed.
- The new real-DOM listener regression and expanded Workstation contract pass with the focused run at 4 files / 34 tests and the integrated Workstation/preview run at 7 files / 49 tests; XHS preview similarity remains 1.0000. Exact ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build in 1m25s pass; generated `tsconfig.tsbuildinfo` was restored.
- Vite showed only expected HMR/raw-test reload messages, port 3005 remained HTTP 200, and native PID 21140 stayed alive. The window was minimized while another application owned the foreground, so no focus/mouse/keyboard takeover occurred. Native divider, both-direction scroll, platform-switch, restart, and narrow-width proof remain hand-test gates. Evidence: `r12-split-source-sync-red-20260722.txt`, `r12-split-source-sync-green-20260722.txt`, and `r12-split-source-sync-production-build-20260722.log`.
- GitNexus post-edit detection over the aggregate dirty tree reported 312 changed symbols, 109 files, 30 affected processes, and `critical`. This remains a worktree-wide commit-boundary warning; the isolated R-12 symbols were all `LOW` pre-edit and added no indexed affected process.

R-15/R-16 Workstation native-copy repair (2026-07-22):

- A post-R-12 handoff audit found that both Workstation actions labelled as platform output still copied `previewHtml`. WeChat happened to use the strict rich writer, but XHS and Zhihu routed mock preview HTML through `copyToClipboard()`; history therefore measured preview HTML instead of native text/Markdown. Because empty documents deliberately show sample previews, the same check could also copy sample content from a real empty article.
- Exact GitNexus upstream impact for `handleCopyToClipboard` was `LOW`: one direct file dependent and zero affected processes/modules. The repair reuses the shipped `convertToNativeFormat()` rather than creating another renderer.
- Both existing buttons still share one handler. It now rejects empty real Markdown; captures the selected platform/preset plus canonical typography/export settings; copies WeChat HTML through `copyWechatHtmlToClipboard()` and XHS text/Zhihu Markdown through `copyTextToClipboard()`; records the exact successful artifact bytes; and displays truthful platform-specific labels.
- The Workstation source contract passes 14/14. The integrated Workstation/Publish/cross-platform run passes 6 files / 441 tests with XHS cross-route similarity 0.9979; exact ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build in 1m20s pass. `tsconfig.tsbuildinfo` was restored, Vite showed only expected HMR/test reload, port 3005 remained HTTP 200, and native PID 21140 stayed alive.
- The minimized app was not focused and the user's clipboard was not mutated. Native three-format paste and history-byte checks remain user hand-test gates; XHS/Zhihu account upload/publication remains manual. Evidence: `r15-r16-workstation-native-copy-red-20260722.txt`, `r15-r16-workstation-native-copy-green-20260722.txt`, `r15-r16-workstation-native-copy-tests-20260722.log`, and `r15-r16-workstation-native-copy-build-20260722.log`.
- GitNexus post-edit detection over the aggregate dirty tree reported 318 changed symbols, 109 files, 31 affected processes, and `critical`. This remains a worktree-wide boundary warning; `handleCopyToClipboard` was individually `LOW` pre-edit with zero affected processes.

Application-scope SVG/style readiness preflight (2026-07-22):

- The first application-scope preflight correctly stayed non-zero but found only one local issue: its Publish source contract still required the obsolete literal `markdownToWechatWithStats(content, preset, {`, while the production path now calls the same renderer with typed `wechatPreset` and `renderExportOptions`. Every actual gallery, SVG, style-sample, option-injection, and WeChat-safe count was already clean.
- GitNexus impact for `getStyleProofApplicationWechatSurfaceIssues` was `LOW`: three upstream nodes and zero affected processes. Updating the single required fragment changed no product renderer or external-proof state.
- The focused preflight suite passes 7/7 and exact script/test ESLint passes. Repeating `pnpm --silent -C inkforge style-proof:release-preflight --scope=application --json` exits 0 with `status=application-ready`, `canClaimApplicationReady=true`, 27 SVG modules across 7 families, 108/108 persona renders, 5/5 application slots, 2/2 application surfaces, 3/3 export-pipeline contracts, all 27 option-injected modules, 13/13 selectable rendered style samples, 45 sample SVG modules, zero safety/sentinel/slot/surface/pipeline/choice issues, and zero actionable local rows.
- The same report deliberately keeps `canClaimReleaseComplete=false`: phone rendering, mobile interaction/Dark Mode, cover acceptance, credentialed sync/draft readback, schedule/publish, and other external evidence remain manual. XHS/Zhihu account upload/publication remains user-owned. Evidence: `application-style-proof-ready-20260722.txt`, `application-style-proof-preflight-20260722.json`, and `application-style-proof-preflight-test-20260722.log`.
- GitNexus post-edit aggregate detection reported 319 changed symbols, 110 files, 31 affected processes, and `critical`; this remains the pre-existing worktree-wide boundary, while the edited preflight surface checker was individually `LOW` with zero affected processes.

R-05 canonical typography truth-source audit (2026-07-22):

- The complete Settings -> Workstation/EditorPanel -> preview -> ExportModal/Publish trace found one active duplicate after the earlier typography consolidation: Settings Export still wrote `settings.export.textIndent`, and its preview-copy path read that stale field while every primary surface used `settings.appearance.typography.paragraphIndent`.
- GitNexus marked `buildSettingsCandidate` `HIGH` because all Settings consumers are transitively upstream, but its exact direct surface is only `load` plus rollback restore and it participates in zero indexed execution flows. Both Settings preview helpers were `LOW`. The repair is therefore deliberately narrow: legacy `export.textIndent` migrates only when canonical `paragraphIndent` is absent; canonical `false` still wins over legacy `true`.
- The duplicate Settings Export switch is removed. Settings preview markdown, WeChat options, and typography overrides now consume the canonical object, including font size, line height, letter spacing, paragraph spacing, indent, heading style, quote style, and font family. The legacy schema field remains import-compatible but has no active UI or renderer consumer.
- Focused checks pass 2 files / 16 tests. The integrated Settings/store/editor/preview/Export/Publish/Workstation run passes 10 files / 65 tests; its deliberate invalid-setting warning and AI unavailable `127.0.0.1:1` failures are expected assertions, not failed tests. Exact ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build in 1m20s pass; generated `tsconfig.tsbuildinfo` was restored.
- Vite reported only expected store/test reloads. Port 3005 remains HTTP 200 and native PID 21140 remains responsive. No foreground focus, clipboard operation, or article mutation was used. Visible one-by-one parameter comparison across Workstation, Settings preview copy, Export, and WeChat Publish remains the user hand-test gate. Evidence: `r05-canonical-typography-truth-source-20260722.txt`, `r05-canonical-typography-tests-20260722.log`, and `r05-canonical-typography-build-20260722.log`.
- GitNexus post-edit detection reports 321 changed symbols, 110 files, 31 affected processes, and `critical` for the aggregate pre-existing dirty tree. This does not narrow the commit boundary: the R-05 preview helpers were individually `LOW`, while the migration helper's disclosed `HIGH` reach is covered by all four Settings store suites plus the integrated renderer/UI run.

R-13/R-14 canonical theme compatibility audit (2026-07-22):

- The active route trace proved Workstation, Themes, Export, and Publish already render through the shared platform registries, but `ThemesView` still performed a second `themeStore.applyPreset()` write and the retained theme compatibility Store still hard-coded ten presets plus a separate generic CSS template. `CMSTools` also retained an unmounted `marked.parse()` + reconstructed `convertToWechat()` copy path that would omit canonical SVG decorators if remounted.
- Exact GitNexus pre-edit impact was `LOW` for `ARTICLE_PRESETS`, both `applyPreset` functions, `generatedCSS`, `initFromStorage`, `copyWeChat`, and all resolved compatibility fields; no indexed execution flow was affected. The unresolved duplicate-const candidates also reported a maximum `LOW` risk.
- `ARTICLE_PRESETS` is now a 16-row projection of canonical `themePresets`; valid legacy IDs migrate only when a canonical Settings platform/preset pair is absent. Canonical Settings wins otherwise. Every writable compatibility field exposed by the retained ThemePanel proxies the existing Settings state, while base-theme/alignment are preset-owned rather than parallel controls.
- `generatedCSS` now combines `generateThemeCSS()` with `typographyToWechatCss()` and selector adaptation for the retained `MarkdownPreview`; it no longer owns a hand-written theme template. `ThemesView` writes only `settings.export.defaultPlatform/defaultPresetId`. `CMSTools` now reuses `convertToNativeFormat()` and `copyWechatHtmlToClipboard()` and reports clipboard denial as failure instead of success.
- Focused contracts pass 2 files / 7 tests. The integrated theme/Settings/Workstation/preview/Export/Publish run passes 9 files / 307 tests. Exact changed-file ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build in 1m17s pass; generated `tsconfig.tsbuildinfo` was restored. Evidence: `r13-r14-canonical-theme-compatibility-20260722.txt`.
- GitNexus post-edit detection reports 336 changed symbols, 113 files, 31 affected processes, and `critical` for the complete pre-existing dirty worktree. It does not supersede the exact pre-edit results for this slice, which were all `LOW` with zero affected processes.
- This closes the deterministic duplicate-state/renderer implementation gap, not the native visual gate. The user must still visibly confirm one selected preset, all 16 WeChat styles, per-platform return, advanced-pane behavior, and matching Workstation/Export/Publish output.
- The formal XHS/Zhihu rule manuals now carry their official source hierarchy: XHS Community Rules and the authenticated creator-entry gap are separated from configurable market limits; the Zhihu Creator Manual is separated from `VSCode-Zhihu` / `md2zhihu` implementation precedent. Neither manual invents an official editor whitelist or upgrades local artifacts to account acceptance.

R-19/R-21 deterministic source closure and R-14 review disposition (2026-07-22):

- The independent reviewer correctly found two remaining source contradictions: Hub still exposed Hero blank/template actions plus an article-empty “新建文章” button beyond the required Start/FAB pair, and shared Settings actions retained pointer/hover styling while disabled. Exact GitNexus file impacts were `LOW`, with zero direct dependents and zero affected processes.
- The strengthened source contracts first failed exactly two rows (2 failed / 21 passed): Hub still contained `hero-empty-actions`, and Settings lacked disabled-aware selectors. The minimal repair removes only those two extra Hub action regions, retains their guidance copy and every canonical creation function, gates hover with `:not(:disabled)`, and adds the shared muted/not-allowed state.
- The focused run is green at 2 files / 23 tests. The core serial R-01..R-23 regression passes 15 files / 96 tests with XHS preview similarity still 1.0000. Exact four-file ESLint and `vue-tsc --noEmit --pretty false` pass. A fresh production build transforms 4,675 modules and passes in 1m20s; generated `tsconfig.tsbuildinfo` was restored. Vite remains HTTP 200 and native PID 21140 remains alive. Evidence: `r19-r21-source-closure-20260722.txt`.
- GitNexus post-edit detection over the pre-existing outer dirty worktree reports 346 changed symbols, 116 files, 31 affected processes, and aggregate `critical` risk. This remains a worktree-wide boundary warning; the exact Hub and Settings file impacts for this slice were both `LOW` with zero affected processes.
- The review suggestion to mutate Zhihu clean Markdown by visual `presetId` was not applied. The existing task contract explicitly keeps clean Markdown unchanged while `zhihu.ts` makes local preview/HTML typography preset-aware; inventing semantic transforms for visual personas would make the native handoff less truthful. XHS/Zhihu account/editor acceptance remains user-manual.
- These are deterministic implementation closures only. Native visible disabled/focus/narrow behavior and the final two-entry Hub interaction/focus sequence remain in `handtest-remaining-20260722.md`.

R-21 original recent-heading hierarchy follow-up (2026-07-22):

- Re-reading the original screenshot requirement exposed a matrix omission: duplicate creation paths were repaired, but “最近编辑” was still a generic 15px div with eyebrow-style tracking. GitNexus exact Hub file impact remained `LOW`, with zero direct dependents and zero affected processes.
- A new source contract failed 1/15 on the missing semantic heading. The minimal correction changes only the label hierarchy: an 18px/700 `h3`, the existing serif/text tokens, tighter tracking, and an 18px installed Lucide clock. No route, article, store, creation function, or keyboard path changed.
- The focused Hub contract passes 15/15; the core serial R-01..R-23 regression passes 15 files / 97 tests with XHS preview similarity 1.0000. Exact Hub/test ESLint, `vue-tsc --noEmit --pretty false`, and a fresh 4,675-module production build in 1m24s pass; generated `tsconfig.tsbuildinfo` was restored.
- Vite remains HTTP 200 and native PID 21140 remains alive. GitNexus aggregate detection remains `critical` at 346 changed symbols, 116 files, and 31 affected processes across the pre-existing dirty worktree; isolated Hub impact remains `LOW`. Evidence: `r21-recent-heading-hierarchy-20260722.txt`.
- The native window remained minimized, so current visual prominence is still a user hand-test row rather than inferred from source or build output.

R-02 tag-control visual polish follow-up (2026-07-22):

- Re-reading `image-2.png` beside `tag-browser-flat-runtime-20260722.png` found that the previous `verified` row proved CRUD and removal of nested cards but not the requested visual integration. The running screenshot still showed a native-looking three-row TagInput, a full-width grey Create action, and four undifferentiated pill buttons for filtering. R-02 is therefore corrected to `implementation-tested` until current native visual confirmation exists.
- GitNexus exact file-level upstream impact is `LOW` for `TagBrowser.vue` and `TagInput.vue` (one direct upstream each) and `TagBadge.vue` (three direct upstreams); all affect zero execution flows. The test file is absent from the current graph index, so its `UNKNOWN` mapping is compensated by a focused red/green run and broader gates.
- The minimal repair preserves every Store call and event. `TagInput` now uses the existing native input/select/button elements in a compact search row plus color/create row, styles the select with an installed Lucide chevron and current design tokens, and keeps focus/disabled behavior. `TagBrowser` separates the OR/AND match mode from Apply/Clear, adds `aria-pressed`, and removes the `last-of-type` styling shortcut. `TagBadge` replaces its hard-coded light-only surfaces with the same existing theme tokens.
- The source contract failed on the missing compact control and then on hard-coded badge surfaces; its final run passes 4/4. Tag service plus information architecture pass 2 files / 17 tests; the final core serial regression passes 15 files / 98 tests with XHS preview similarity 1.0000. Exact four-file ESLint, `vue-tsc --noEmit --pretty false`, and a current 4,675-module production build in 1m04s with a 3,072 MB heap cap pass. Generated `tsconfig.tsbuildinfo` was restored.
- Vite accepted the two component HMR updates without a compile error; the development endpoint remains HTTP 200. No foreground navigation, article mutation, clipboard action, account action, or external publication was performed while the user hand-tests. Evidence: `r02-tag-control-polish-20260722.txt`.
- GitNexus post-edit detection completed over the aggregate pre-existing dirty worktree: 346 changed symbols, 117 files, 31 affected processes, `critical`. This is a worktree-wide commit-boundary warning; all three edited production files were individually `LOW` before editing with zero affected processes.

R-01 original manager-navigation follow-up (2026-07-22):

- Re-reading the original `image-1.png` proved that R-01 is the left manager destination group (文件/版本/大纲/标签/对话), not the document command bar. The previous command-bar runtime screenshot remains valid for R-04/R-10 shell geometry but cannot prove R-01. The matrix, design, code audit, and hand-test route are corrected to prevent neighboring evidence inheritance.
- The deterministic source defect was a five-item horizontal flex strip inside the default 280px manager. Margins plus the independent collapse action left each tab too narrow for a 14px hand-written SVG, gap, and two-character label, while hidden overflow/ellipsis concealed the collision. GitNexus exact file-level upstream impact for `WorkstationView.vue` was `LOW`, with zero direct dependents and zero affected processes; the test file is not mapped by the current index.
- The minimal repair retains the same `managerTab` state, all five real panel bodies, click handlers, persisted geometry, and collapse behavior. It changes only the shared presentation and semantics: five equal grid slots, vertical installed Lucide icon/label alignment, complete labels, explicit button/pressed semantics, deterministic hooks for every destination, and a token-based focus ring.
- The first contract failed 1/15 before the product edit because only two destinations had deterministic hooks. A follow-up red pass failed 1/15 on the remaining hand-written collapse SVG, which was replaced by the installed `PanelLeftClose` icon. The final contract passes 15/15. Adjacent Workstation desktop/focus/vignette checks pass 3 files / 25 tests; exact two-file ESLint, `vue-tsc --noEmit --pretty false`, and the final 4,675-module production build in 55.20s with a 3,072 MB heap cap pass. Generated `tsconfig.tsbuildinfo` was restored. Vite accepted the HMR and no foreground navigation, article mutation, clipboard action, or external platform action occurred. Evidence: `r01-manager-navigation-20260722.txt`.
- GitNexus post-edit detection reports 344 changed symbols, 117 files, 31 affected processes, and aggregate `critical` risk across the complete pre-existing dirty worktree. This is a commit-boundary warning; it does not replace the isolated pre-edit R-01 result of `LOW` with zero affected processes. Exact-scope `git diff --check` passes.
- R-01 remains `implementation-tested` until the user confirms the current five-slot group at default/narrow/scaled widths, both themes, pointer/keyboard activation, and collapse/reopen. XHS/Zhihu account upload/publication remains user-manual and outside this local slice.

R-05/R-14/R-15/R-16 no-foreground rendering-chain revalidation (2026-07-22):

- Current-source tracing reconfirmed one writable typography source: visible Workstation controls use `useTypography()` and write `settings.appearance.typography`; `usePreviewRenderer()` watches the same appearance snapshot; Workstation native copy passes the same typography overrides to `convertToNativeFormat()`; ExportModal folds them into effective WeChat export options; Publish reads the same appearance and platform/preset settings. XHS text and Zhihu Markdown intentionally remain platform-native rather than receiving invented visual CSS.
- `style-proof:release-preflight --scope=application --json` exits 0 with `application-ready`: 27 modules, 7 SVG families, 4 personas, 108/108 module/persona renders, zero application/safety/sentinel issues, 5/5 slots, 2/2 surfaces, 3/3 pipeline contracts, 13/13 selectable rendered style samples, and 45 sample SVG modules. It truthfully leaves `canClaimReleaseComplete:false` because phone/account/external proof is separate.
- The directly relevant serial regression passes 6 files / 53 tests: shared typography, preview renderer, ExportModal SVG/options, Publish platform presets, Workstation layout, and cross-platform pipeline. XHS preview similarity is 1.0000 and cross-route similarity is 0.9979. No product-code defect was found, so no redundant adapter or second renderer was added. Evidence: `r05-r14-r16-rendering-revalidation-20260722.txt`.
- Native visible comparison remains user-owned: adjust each parameter, inspect all WeChat recipes, verify platform/preset retention, and compare Workstation/Export/Publish outputs without treating local XHS/Zhihu artifacts as account publication.

R-05/R-13 render-control semantics follow-up (2026-07-22):

- Source inspection found one remaining deterministic desktop-control defect inside the canonical advanced pane: width/indent/heading/quote/font buttons had implicit button types and no pressed semantics, the indent button was nested inside an interactive `<label>`, the generated sliders had no accessible name, and color/font marks still used hand-written SVG rather than the installed icon system. Rendering state and output were already canonical; this was a template semantics/consistency gap, not a reason to add another state layer.
- GitNexus exact file-level upstream impact for `WorkstationView.vue` was `LOW`, with zero direct dependents and zero affected processes. The test file is absent from the current index. The new source contract failed 1/16 before the product edit, then passed 16/16 after the minimal template repair.
- The repair adds explicit `type="button"` and `aria-pressed` to the existing controls, names generated range inputs, changes the invalid indent wrapper from `<label>` to `<div>`, and reuses installed `Check` and `Type` icons. No control value, click assignment, Store, preset, renderer, export option, or platform boundary changed.
- Current Workstation/render regression passes 8 files / 64 tests with XHS similarities 1.0000 and 0.9979. Exact two-file ESLint, `vue-tsc --noEmit --pretty false`, and the final 4,675-module production build in 55.13s with a 3,072 MB heap cap pass. Generated `tsconfig.tsbuildinfo` was restored; Vite accepted HMR without a compile error. Evidence: `r05-r13-render-control-semantics-20260722.txt`.
- GitNexus post-edit detection reports 346 changed symbols, 117 files, 31 affected processes, and aggregate `critical` risk across the complete pre-existing dirty worktree. This remains a commit-boundary warning; the isolated edited production file was `LOW` with zero affected processes.
- Native keyboard/focus/pressed-state and visible typography-output confirmation remains in the user hand-test route; no local check claims XHS/Zhihu account publication.

R-12 split-toolbar semantics follow-up (2026-07-22):

- The split implementation already retained requested state, mounted the canonical rendered pane only when space allowed, supported pointer/keyboard divider control, persisted ratio/sync settings, and rebound synchronized scrolling across Typora/Source mode. The remaining deterministic gap was confined to template semantics: the entry exposed requested state but not actual expansion, the toolbar still carried hand-written SVGs, and the icon-only close action had no accessible label.
- GitNexus file-level upstream impact for `WorkstationView.vue` was `LOW`, with zero direct dependents, zero affected processes, and zero affected modules. The minimal repair adds `aria-expanded` plus the existing pane ID to the entry, names the close action, and reuses installed `Link2`, `Unlink`, and `X`; no split state, persistence, renderer, ratio, or scroll function changed.
- The focused source contract failed exactly 1/16 before the product edit and passes 16/16 afterward. The current split/layout/sync/persistence/preview run passes 6 files / 44 tests; exact two-file ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build with a 3,072 MB heap cap pass. Generated `tsconfig.tsbuildinfo` was restored.
- Vite accepted the template HMR without a compile error and the user-owned native session remained available. Native divider movement, both-direction scrolling, platform response, reload persistence, and narrow requested-versus-expanded behavior remain explicit hand-test gates. Evidence: `r12-split-toolbar-semantics-20260722.txt`.
- Post-edit GitNexus detection over the complete pre-existing dirty worktree reports 338 changed symbols, 117 files, 31 affected processes, and aggregate `critical` risk. This remains a commit-boundary warning; the isolated edited Workstation file was `LOW` before editing with zero affected processes.

R-22 no-foreground inspiration-chain audit (2026-07-22):

- GitNexus/source tracing confirmed the existing minimal chain is complete: `loadHubInspirationState()` validates stored local/AI rows, local text/author edit directly, one deep watcher calls `saveHubInspirationState()`, and AI generation uses the production `aiStore.generate()` provider boundary. The AI surface has explicit configure, loading, empty, parsed success, alert failure, and refresh/retry states; it never shows the local quote as an AI result.
- No product edit or new abstraction was needed. The current Hub and AI Settings/Store run passes 2 files / 19 tests. Three `ECONNREFUSED 127.0.0.1:1` messages are deliberate real failed Ollama requests asserted by the test, not suite failures.
- This closes the remaining source-audit question but not the visible gate. Local edit/restart and AI unconfigured/loading/failure/retry still require user observation; a real configured-provider success may be claimed only when the user's existing credentials produce it. Evidence: `r22-inspiration-chain-audit-20260722.txt`.

R-14 metadata-free persona visual-signature audit (2026-07-23):

- A temporary final-output audit used one rich shared fixture and removed non-visual `id` / `class` / `data-*` / `aria-*` metadata, normalized colors, and sorted attributes/CSS declarations before comparison. The canonical converters still produced 16/16 unique WeChat, 5/5 unique XHS, and 3/3 unique Zhihu signatures with zero collisions.
- The existing persona test's description promised distinction beyond accent color, but its helper still counted metadata and CSS declaration order. GitNexus exact upstream impact for that helper was `LOW`: one direct test caller, zero affected processes, and zero affected modules.
- A focused regression first failed 1/6 on metadata/order-only fragments, then passed 6/6 after the test helper was tightened. The expanded serial rendering run passes 8 files / 725 tests; exact ESLint and `vue-tsc --noEmit --pretty false` pass. No product source changed, so the already-green 4,675-module build was not redundantly repeated while the user actively hand-tested the running app.
- GitNexus post-edit detection over the complete pre-existing dirty worktree reports 338 changed symbols, 117 files, 31 affected processes, and aggregate `critical` risk. This is a worktree-wide commit-boundary warning; the isolated edited test helper remained `LOW` with zero affected processes/modules.
- Vite watched the source-tree regression file and reloaded the development page twice (00:15:36 and 00:16:14). Native PID 21140 remained responsive and port 3005 stayed HTTP 200; stateful native hand-testing must reconfirm the visible article before continuing.
- No second renderer or extra theme abstraction was added because the stricter audit found no production collision. R-14 remains `implementation-tested`: native side-by-side review, platform selection retention, and Workstation/Export/Publish pair consistency are still visible gates. Evidence: `r14-persona-visual-signature-audit-20260723.txt`.

R-05 first-paragraph indent specificity and quote-boundary follow-up (2026-07-23):

- Executable final-HTML readback found a shared specificity defect rather than a second state defect: preset `p:first-of-type` rules could beat the former generic user override, leaving the first body paragraph unindented while later paragraphs changed. The same broad paragraph selector could indent paragraphs inside quotes.
- GitNexus pre-edit impact was `LOW` for `typographyToWechatCss` and `convertToWechatWithStats`, with zero affected indexed processes. The minimal shared-root repair gives the explicit user rule matching `p:first-of-type` specificity and follows it with a blockquote-paragraph reset; preview and final WeChat export now use the same semantics.
- Before the repair, the first body paragraph was indented in 13/16 presets while the second was 16/16. After the repair, ON yields first 16/16, second 16/16, and quotes unindented 16/16; OFF yields first/second/quotes unindented 16/16.
- Focused regression passes 2 files / 8 tests; the expanded renderer chain passes 6 files / 405 tests. Exact ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build in 51.81s pass. Generated `tsconfig.tsbuildinfo` was restored.
- Vite emitted shared-module HMR and two source-test reloads; native PID 21140 remained responsive and port 3005 remained HTTP 200. The visible article must be reconfirmed before stateful hand testing. Native ON/OFF comparison across Workstation, Export, Settings preview copy, and WeChat Publish remains the explicit R-05 gate. Evidence: `r05-indent-specificity-fix-20260723.txt`.

Native-window black-region passive audit (2026-07-23):

- The referenced black-region screenshot was created on 2026-07-16 and cannot prove the post-07-22 runtime. The current operator-owned main window was minimized, so no restore, focus, route, or input action was used.
- `GetWindowPlacement` reports a valid normal rectangle of 1457×879 inside the 1707×912 logical work area at DPI 144. While minimized, Win32 reports a 158×26 off-screen sentinel host but the `Intermediate D3D Window` child still reports 1707×912; minimized `PrintWindow` or child-rectangle evidence can therefore look black or displaced and is invalid for product geometry claims.
- The existing native E2E guard already waits for a focused, desktop-interactable WebView and rejects host/client drift above 8 px. No speculative resize hook was added. A current visible normal/maximized reproduction is required before changing the window path. Evidence: `native-window-passive-geometry-20260723.txt`.

R-05 flagship canonical-control effect matrix follow-up (2026-07-23):

- A temporary final-output audit varied all eight canonical controls independently across all 16 WeChat presets. It exposed 8/128 no-effect pairs: `headingStyle` and `blockquoteStyle` in `flagship-kiln`, `flagship-kiln-paste-safe`, `flagship-tempera`, and `flagship-amber`. A persistent end-to-end regression reproduced the same red result.
- The shared root was post-Juice replacement: canonical overrides were correctly inlined onto `h2`/`h3`/`blockquote`, then the flagship decorators replaced those nodes and discarded the source attributes. GitNexus pre-edit impact for the three decorators was `LOW`, with one direct dependent, 13 transitive symbols, and zero affected indexed processes/modules.
- The minimal repair recognizes only the known sanitized non-default canonical heading/quote suffixes and transfers that suffix to the generated outer flagship block. Defaults preserve the flagship identity; arbitrary attributes are not copied; no public API, state layer, renderer, dependency, or platform boundary changed.
- The persistent final-output matrix is green 128/128 with `noEffect=[]`. Direct decorator plus matrix checks pass 2 files / 73 tests; the expanded renderer chain passes 8 files / 152 tests; the full serial export suite passes 44 files / 1,386 tests; the final focused rerun passes 4/4. Exact ESLint and `vue-tsc --noEmit --pretty false` pass. A fresh production build transforms 4,675 modules and passes in 2m04s with a 3,072 MB heap cap; generated `tsconfig.tsbuildinfo` was restored. The application style preflight is `application-ready`: 27 modules, 7 families, 108/108 module/persona renders, 5/5 slots, 2/2 surfaces, 3/3 pipeline contracts, 13/13 selectable rendered style samples, 45 sample SVG modules, and zero local gallery/safety/sentinel/choice issues. It truthfully keeps `canClaimReleaseComplete:false` for external gates; artifact: `r05-flagship-application-preflight-20260723.json`.
- GitNexus aggregate detection over the pre-existing dirty worktree reports 345 changed symbols, 118 files, 31 affected processes, and `critical` risk. This remains a commit-boundary warning rather than the isolated slice risk. Tauri job `j-5ocjls`, native PID 21140, and Vite PID 39544 remain alive; port 3005 returns HTTP 200.
- R-05 remains `implementation-tested`: the user must visibly select a flagship preset, change heading and quote styles, and compare Workstation, Export, and WeChat Publish output. No XHS/Zhihu account publication is inferred. Evidence: `r05-flagship-control-effect-matrix-20260723.txt`.

Current maximized native passive visual audit (2026-07-23):

- A DPI-aware read-only `PrintWindow` capture inspected the existing native window without route/input/Store/clipboard/account mutation. PID 21140 was visible, maximized, non-minimized at 144 DPI; the authoritative capture is 2582×1390. The first DPI-unaware crop was discarded because it omitted the right side.
- The current frame visibly shows one native brand/title-bar control group; one aligned document command row with copy/export/fullscreen/Default/Write/Review/Split/Publish; five compact manager destinations; the canonical category/article/material tree; rendered WeChat preview; and the right-edge Inspector overlay.
- The primary style surface visibly exposes all 16 canonical WeChat choices, while `高级排版参数` is one collapsed disclosure rather than a second permanently expanded typography grid. The statistics widget and its detach/close controls are also present.
- This strengthens current maximized-state evidence for R-01/R-13/R-14 but does not promote them to `verified`: one frame cannot prove narrow/restored behavior, hover stability, keyboard/focus semantics, split/focus transitions, style changes, reload persistence, or artifact equality. The visible recovery banner remained untouched. Evidence: `native-passive-maximized-rendering-20260723.png` and `.txt`.

R-03/R-14 platform-switch obstruction follow-up (2026-07-23):

- The full-DPI passive frame exposed a real obstruction: the unpinned Inspector began at `top:0` with `z-index:90`, covering the authoritative Stage platform selector. 微信 remained visible, 小红书 was partial, and 知乎 plus Stage actions were hidden, which made XHS/Zhihu styles appear absent while the Inspector was open.
- GitNexus exact upstream impact for `WorkstationView.vue` was `LOW`, with zero direct dependents and zero affected indexed processes/modules. A new source contract first failed 1/16 on the missing Stage-header clearance; the test file is absent from the current graph index.
- The one-line shared-geometry repair keeps the existing single platform selector, full-height collapsed magnetic trigger, and non-layout-shifting absolute overlay, but starts only the expanded unpinned Inspector at the existing 44px Stage-header boundary. No duplicate selector, state, renderer, preset registry, dependency, or public API was added.
- Focused source coverage passes 16/16; Workstation layout/focus/vignette plus persistence pass 4 files / 38 tests. Exact ESLint, `vue-tsc --noEmit --pretty false`, and a fresh 4,675-module production build in 1m45s pass; generated `tsconfig.tsbuildinfo` was restored. Vite accepted scoped-style HMR at 01:39:14.
- DPI-aware after-proof now shows 微信、小红书、知乎 and Stage actions fully visible above the open Inspector while the 16-choice primary style surface and collapsed advanced pane remain intact. Tauri PID 21140 and port 3005 remain healthy. The user still owns the click/switch/preset-retention/artifact comparison gate. Evidence: `r03-r14-platform-tabs-unobscured-20260723.png` and `.txt`.
- GitNexus aggregate detection remains `critical` at 345 changed symbols, 118 files, and 31 affected processes across the pre-existing dirty worktree; the isolated product-file impact remains `LOW`.

R-13/R-16 Export native primary-action follow-up (2026-07-23):

- Existing native screenshots and a production-source audit exposed a remaining duplicate: the pinned Export action bar copied/downloaded `previewHtml` as a generic “样式版 HTML”, while the `平台原生产物` card exposed a second copy/download pair backed by `nativeResult`. The visually primary XHS/Zhihu action could therefore hand off HTML preview instead of canonical text/Markdown.
- GitNexus exact upstream impact was `LOW` for `handleCopy`, `handleDownload`, `handleCopyNative`, `handleDownloadNative`, and `buildExportFilename`; no indexed process was affected and only the Export module was reported for the filename helper.
- A source contract first failed 1/3 on the duplicate preview-HTML handler. The minimal repair removes the old handlers/card actions and reuses the existing `nativeResult`, `nativeFormatLabel`, native clipboard, MIME, filename, feedback, and history paths as the one pinned copy/download authority. No renderer, registry, route, schema, dependency, or external action changed.
- Focused green is 3/3. Export/Workstation/Publish/cross-platform/history regression passes 6 files / 417 tests. Exact ESLint, `vue-tsc --noEmit --pretty false`, and a fresh 4,675-module production build in 1m34s pass; generated `tsconfig.tsbuildinfo` was restored. Vite accepted HMR with no error.
- The app remains minimized by the user, so one-line labels and exact native clipboard/file readback remain a current hand-test gate rather than an inferred result. Evidence: `r13-r16-export-native-primary-action-20260723.txt`.

R-16 Publish local-download responsibility follow-up (2026-07-23):

- A source audit found one remaining responsibility duplicate after the Export repair: Publish still exposed `下载预览 HTML` and owned its own Blob/download filename path, although local file delivery already belongs to Export.
- GitNexus exact upstream impact for `downloadHtmlFile` and `buildDownloadFileName` was `LOW`, with one direct caller each and zero affected execution flows. The minimal repair removes only those functions and that button; Publish retains source view/copy, platform-native handoff, manual channel actions, and credentialed WeChat draft operations.
- The source contract moved from 1 failed / 11 passed to 12/12 green. The adjacent Publish/Export/Workstation/cross-platform/history run passes 5 files / 411 tests; exact ESLint, `vue-tsc --noEmit --pretty false`, and a 4,675-module production build in 1m48s pass. Generated `tsconfig.tsbuildinfo` was restored, port 3005 remains HTTP 200, and the existing Tauri process remains alive.
- GitNexus post-edit detection reports 339 changed symbols, 120 files, 31 affected processes, and aggregate `critical` risk across the pre-existing dirty worktree. This is a commit-boundary warning; the two removed Publish helpers were individually `LOW` before editing.
- This closes the deterministic duplicate local-download implementation. Visible navigation, one-pair Export labels, Publish absence of local download, native clipboard bytes, and history remain user hand-test gates. Evidence: `r16-publish-local-download-dedupe-20260723.txt`.

R-22/R-23 Hub source/search no-foreground revalidation (2026-07-23):

- The current production trace remains closed without adding another Store or search service. Daily inspiration loads and saves the real localStorage record, deep-watches local/AI/source changes, exposes bounded editable local text/author fields, and calls the existing `aiStore.generate()` path only after an explicit AI choice or refresh.
- Header search consumes the real article Store, matches title/description/source/body, anchors up to six recent results below the combobox, supports Arrow/Enter/Escape/clear and global Ctrl/Cmd+F before editable-target rejection, then routes the selected real article ID to Workstation.
- Current focused verification passes 2 files / 19 tests. The deliberate `127.0.0.1:1 ECONNREFUSED` output is the asserted real provider-failure path; no AI success was fabricated. GitNexus finds the actual inspiration persistence/generation symbols and Hub search result symbols.
- No product edit was justified. Visible local edit/restart, configured-provider result, real article search/open/return, result-button Escape/focus restoration, and no-result state remain user hand-test gates. Evidence: `r22-r23-source-flow-revalidation-20260723.txt`.

R-14/R-15 application style-surface revalidation (2026-07-23):

- The current application-scope style preflight exits 0 with `application-ready` and `canClaimApplicationReady:true`: 27 SVG modules across 7 families, 108/108 module/persona renders, 5/5 application slots, 2/2 application surfaces, 3/3 export-pipeline contracts, 13/13 selectable style samples, 45 sample SVG modules, and zero application/safety/choice issues.
- The directly relevant serial suite passes 8 files / 346 tests. It proves all 16 WeChat presets render non-empty inline-styled HTML through the real Markdown converter, all four SVG flagships emit mobile-scaled inline SVG/style blocks, and the shared Themes/Publish surfaces expose 16 WeChat, 5 XHS, and 3 Zhihu preset families from the canonical registries.
- `canClaimReleaseComplete:false` remains correct because phone/account/external proof is separate. XHS/Zhihu account publication stays user-manual; no local artifact is relabelled as platform acceptance.
- No renderer or extra adapter was added because the current application chain passed. Visible selection, recipe comparison, platform return, and Workstation/Export/Publish pair consistency remain native hand-test gates. Evidence: `r14-r15-application-style-surface-revalidation-20260723.txt`.

R-01..R-23 current core regression (2026-07-23):

- The post-R-16 serial core matrix now includes Publish and export-history coverage rather than relying on the older 15-file baseline. It passes 17/17 files and 118/118 tests with one worker and no file parallelism.
- The matrix covers the settings shell transition, Export/Publish separation, file-manager information architecture, platform previews, typewriter/vignette behavior, local folder/blog delivery, all canonical typography controls, layout persistence, Settings editor/history, Hub source/search, canonical preset surfaces, and Workstation desktop contracts.
- XHS preview similarity remains 1.0000. The invalid persisted editor-setting warning is the expected fallback assertion. Existing Tauri PID 21140 remains alive and port 3005 returns HTTP 200.
- This is current implementation regression evidence, not visible native acceptance. No product edit was justified. Evidence: `r01-r23-core-regression-20260723.txt`.

Worktree integrity audit (2026-07-23):

- Whole-worktree and staged `git diff --check` both exit 0. No staged deletion exists, and generated `inkforge/tsconfig.tsbuildinfo` / `inkforge/dist` have no tracked residue.
- The only tracked deletions are five files under the misspelled tooling path `.claude/skills/trellis-spec-bootstarp/`. Each has a present untracked replacement under `.claude/skills/trellis-spec-bootstrap/`: all four reference files are byte-identical, while `SKILL.md` changes only the skill name and heading from `bootstarp` to `bootstrap`.
- No InkForge product feature, module, component, renderer, Store, route, or test is deleted. The tooling rename predates this slice and remains untouched, unstaged, and uncommitted. Evidence: `worktree-integrity-audit-20260723.txt`.

Current-round application acceptance (2026-07-23):

- `pnpm style-proof:current-round` exits 0 with `application-acceptance-ready`. The declared current target `application-svg-style-wechat-local` is `current-round-ready` with `canClaimCurrentRoundTarget:true` and `canClaimApplicationReady:true`.
- All seven local preparation checks pass: application preflight, WeChat style readiness, WeChat style samples, application gallery, manual checklist, manual template, and manual manifest drafts. `actionableLocalRows` is 0 and `strictReleaseBoundaryPreserved` is true.
- Strict release intentionally exits 1 as `blocked-by-external`; `canClaimReleaseComplete:false`, XHS/Zhihu publication automation remains deferred, and remaining phone/account proof stays operator-owned. This is the correct non-fabricated boundary rather than a failed current-round application check.
- The application is ready for the user's rendering hand test, but the broader 23-row goal remains active until the listed native visible gates are exercised. Evidence: `current-round-application-acceptance-20260723.txt`.

2026-07-23 user re-acceptance reopened the current round:

- The user's thirteen current screenshots are direct counter-evidence to the
  previous local-readiness checkpoint. `application-acceptance-ready` remains
  useful only for the SVG/style pipeline that it actually measured; it does not
  close manager collapse, floating-window geometry, writing-focus quality, Hub
  composition, search focus, source-view geometry, Settings ownership, Pi, or
  Sync configuration.
- Requirements U-01..U-19 in `prd.md` now supersede conflicting historical
  status. No row may be closed using a pre-fix screenshot or a source-string
  contract alone.

### Slice J — Reproduction and shell lifecycle

Requirements: U-01, U-02, U-04, U-05.

- [x] Capture current Tauri geometry/state for manager expand/collapse and all
  widget placements without mutating article content.
- [x] Add failing component/state tests for the manager grid track, widget
  single-placement invariant, close/reopen transition, shared frame geometry,
  focus return, and reduced-motion cleanup.
- [x] Repair the shared layout/widget state roots and retest standard, narrow,
  maximized, restored, detached, re-docked, closed, reopened, and restart paths.
- [x] Recalibrate writing focus/typewriter using a real long article and prove
  typing, selection, undo, navigation, combined modes, switch/reload, and cleanup.

### Slice K — Typography depth and flagship-level preset recipes

Requirements: U-03, U-06, U-07.

- [x] Inventory current canonical typography fields and platform capability
  consumption; reject every visible no-op before adding options.
- [x] Extend schema/composable/UI/render adapters with the agreed capability
  model and migration tests.
- [x] Add visual-signature descriptors and same-article structural tests for
  every selectable WeChat/XHS/Zhihu preset.
- [x] Calibrate platform preview canvas/rhythm through the external-editor
  session plus official/observable editor surfaces; record only redacted rules.
- [x] Run all WeChat SVG safety/application checks and inspect the exact rich
  clipboard handoff payload without claiming external editor paste, phone, or
  publish success.

### Slice L — Delivery adornments, platform components, and source viewer

Requirements: U-08, U-09, U-11.

- [x] Add schema, defaults, persistence, artifact-snapshot integration, and
  tests for reading-time notice, CC license, and ordered platform components.
- [x] Implement WeChat component references through safe typed adapters and
  explicit manual/credential blockers; preserve platform-specific fallback.
- [x] Keep Export and Publish consumers separate and prove identical snapshot
  inputs where their responsibilities overlap.
- [x] Give the Publish source viewer independent responsive geometry, scroll,
  copy, disclosure, and keyboard behavior.

### Slice M — Hub composition and Settings-owned inspiration

Requirements: U-12, U-13, U-14.

- [x] Add viewport contracts for supported dashboard heights/widths and remove
  card-driven dead space without hiding content.
- [x] Move local inspiration editing/default author controls into Settings while
  retaining the same persisted data and read-only Hub display.
- [x] Consolidate search focus styling to one shell and verify full keyboard
  result lifecycle.

### Slice N — Pi, Sync, Settings ownership, and Developer Mode

Requirements: U-15, U-16, U-17, U-18, U-19.

- [x] Inventory existing AI providers, Pi-compatible API requirements,
  Settings schema/keychain, SyncProvider types, SyncEngine, updater/runtime/
  storage/Developer panels, and current tests before changing ownership.
- [x] Implement Pi through the existing provider contract with real health,
  model, streaming, cancel, failure, and fallback paths.
- [x] Implement provider-specific Sync configuration/test/save/select actions
  and connect the existing engine/queue/conflict states without fake success.
- [x] Reassign Settings sections and lazy Developer diagnostics; fix the
  Developer Mode switch/shortcut/persistence lifecycle and strengthen the
  existing InkForge design language.

### Slice O — Current-evidence acceptance and closure

Requirements: U-01..U-19 plus still-applicable R-01..R-23.

- [x] Run focused TDD checks per slice, then the serial workstation/settings/
  Hub/render/export regression.
- [x] Run changed-file ESLint, `vue-tsc`, production build, relevant Rust tests,
  `cargo check`, and GitNexus change detection.
- [x] Use the current native Tauri application for all InkForge visual and
  interaction evidence; no browser/Vite screenshot and no old screenshot closes
  a changed product row. CloakBrowser remains external-editor research only.
- [x] Build the release executable plus Windows installer bundles, stop the Vite
  server, launch the release binary, and record exact bundle hashes before
  handoff.
- [x] Update the acceptance matrix, docs/spec, evidence report, and exact
  remaining external/manual boundary.

Packaged native acceptance evidence (2026-07-24):

- The final focused matrix passes 25 files / 185 tests, the complete export
  suite passes 45 files / 1,395 tests, and the complete Vitest suite passes
  128 files / 1,981 tests. Exact changed-file ESLint passes 97 TS/Vue files;
  `vue-tsc --noEmit --pretty false`, the 5,570-module production build,
  `cargo check`, and `cargo test` (28/28) pass. Generated
  `tsconfig.tsbuildinfo` was restored.
- `pnpm -C inkforge tauri build` passes and produces the Release executable,
  WiX MSI, and NSIS installer. The stable handoff directory is
  `D:\Desktop\InkForge-0.1.0-Windows-20260724`; all three copied artifacts
  have independently verified SHA-256 hashes and are recorded in
  `SHA256SUMS.txt`. Both installers carry the offline WebView2 runtime.
- The copied Release executable was launched without Vite, Node.js, or a
  listener on port 3005. Native UI Automation opened the persisted Hub article,
  Workstation, Publish, the independent source viewer, and the SVG module
  controls. The five SVG slots rendered real WeChat cover/H2/divider/ending
  output, then returned to their default-disabled state before clean shutdown.
- GitNexus incremental indexing completed in 289.5 seconds with 22,175 nodes,
  39,917 edges, and 300 flows. Final `detect_changes(scope=all)` reports 616
  changed symbols, 140 files, 39 affected processes, and aggregate `critical`
  risk across the complete pre-existing dirty worktree. This is a commit-boundary
  warning: the task's edited production roots had already received exact
  pre-edit impact checks and focused/integrated regression coverage. No commit
  is planned from the aggregate working tree.
- `git diff --check` and `git diff --cached --check` pass. The authoritative
  artifact, native interaction, exact hash, test, runtime-engine, and external
  boundary record is
  `evidence/native-software-handoff-20260724.md`.
- The local `application-svg-style-wechat-local` target is ready for the user's
  installed-software rendering test. WeChat editor paste/phone/draft/publish
  and XHS/Zhihu account publication remain manual external evidence and are not
  simulated or claimed.

## 4. Validation commands

Commands are selected per changed slice; do not run all heavy suites after every edit.

```bash
# Focused UI/state/render checks
pnpm -C inkforge exec vitest run \
  src/services/layout-persistence/layout-persistence.test.ts \
  src/extensions/__tests__/TypewriterMode.decorations.test.ts \
  src/composables/usePreviewRenderer.test.ts \
  src/views/__tests__/HubView.cards.test.ts \
  --reporter=default --maxWorkers=1 --no-file-parallelism

# Cross-platform export/style regression
pnpm -C inkforge exec vitest run \
  src/services/export/platform-export-rendering.test.ts \
  src/services/export/__tests__/pipeline-cross-platform.test.ts \
  src/services/export/xhs.test.ts \
  src/services/export/zhihu.test.ts \
  --reporter=default --maxWorkers=1 --no-file-parallelism --test-timeout=90000

# Full export regression when rendering slices converge
pnpm -C inkforge exec vitest run src/services/export \
  --reporter=default --maxWorkers=1 --no-file-parallelism --test-timeout=90000

# Current-round WeChat application readiness; strict release may remain externally blocked
pnpm --silent -C inkforge style-proof:release-preflight --scope=application --json

# Static checks
pnpm -C inkforge exec eslint <changed-files> --quiet
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
NODE_OPTIONS="--max-old-space-size=4096" pnpm -C inkforge build
cargo check --manifest-path inkforge/src-tauri/Cargo.toml

# Existing non-Playwright E2E runner, targeted specs only
pnpm -C inkforge exec wdio run tests/e2e/wdio.conf.cjs --spec <target-spec>

# Final scope review
node .gitnexus/run.cjs detect-changes --scope all
git diff --check -- <exact-task-files-and-changed-product-files>
```

Restore generated `inkforge/tsconfig.tsbuildinfo` after type/build checks if it changes and was not part of the intended slice.

## 5. Risk register

| Risk | Guard |
| --- | --- |
| Large `WorkstationView.vue` / `ExportModal.vue` diffs hide regressions | One shared-root slice at a time; focused diff and tests before continuing. |
| UI deduplication accidentally removes functionality | Inventory command/store action before removing an entrance; acceptance verifies the retained canonical route. |
| Legacy persisted state causes blank or wrong layouts | Zod/default migration and real reload checks with old values. |
| Native window/file changes affect web runtime | Tauri capability detection and fail-closed actionable result. |
| Partial folder write corrupts prior blog output | Stage, close, rename, readback; previous destination remains untouched on failure. |
| Platform selector implies unsupported proof | Catalog availability remains authoritative and diagnostics explicitly separate selectable output from external proof. |
| Local machine memory pressure | Serial heavy suites; no duplicate browser or dev-server process. |

## 6. Final start-review checklist

- [x] `prd.md` contains all R-01..R-23 requirements and testable acceptance criteria with no duplicate temporary brainstorm sections.
- [x] `design.md` maps every requirement to one canonical boundary and records compatibility/rollback.
- [x] `implement.md` orders slices by dependency and assigns focused/runtime proof.
- [x] `implement.jsonl` and `check.jsonl` contain only real spec/research entries.
- [x] Personal-blog protocol is explicit: Hugo/Hexo/Jekyll-compatible static-site directory for this round; no unspecified remote API.
- [x] The user previously directed execution without further confirmation and has now resolved the last product boundary; run `task.py start` and load Phase 2 context before editing product code.

## 2026-07-27 Applied Platform Editor Calibration Slice

### Scope and evidence boundary

- Reused the single existing managed CloakBrowser session; no second profile or browser instance was
  created.
- Inspected the live editor canvas and visible DOM/CSS behavior for WeChat Official Account,
  Xiaohongshu long-form, Zhihu Draft.js, 135 normal editor, 135 SVG editor, and Xiumi.
- Did not publish, submit, purchase, sync, mutate platform credentials, or store account/runtime
  artifacts in the repository.
- Xiaohongshu and Zhihu publication remain manual user acceptance. WeChat phone/sync/publish rows
  remain external.

### Applied rules

- WeChat local fidelity now uses a 586px/578px editor baseline and 17px/27.2px body rhythm while
  preserving real preset CSS and inline SVG.
- Xiaohongshu local fidelity now uses the measured 896px long-form canvas and 16px/28px body rhythm;
  the invented gradient/shadow marketing card and platform watermark were removed.
- Zhihu local fidelity now uses the measured 800px Draft.js canvas, exact font stack, 16px/25.6px
  body and 19.2px/28.8px H2; the invented watermark and inline accent patching were removed so
  preset CSS remains authoritative.
- Workstation split/full/stage preview and Inspector content now expose platform data hooks.
- Removed the Stage-wide `!important` typography reset that flattened presets and flagship SVG.
- The preview shell no longer shows a fake iPhone notch/home indicator. It provides containment and
  scrolling while each platform wrapper owns the actual canvas.
- Copy/export/publish payload paths were not changed; `convertToNativeFormat` remains authoritative.

### TDD evidence

Red:

```text
4 files / 49 tests: 42 passed, 7 failed
Failures precisely covered platform markers, measured canvas typography, fake watermark/card
removal, platform host scoping, and Stage typography flattening.
```

Green:

```text
pnpm -C inkforge exec vitest run \
  src/services/export/preview-fidelity/xiaohongshu-mock.test.ts \
  src/services/export/preview-fidelity/zhihu-mock.test.ts \
  src/services/export/preview-fidelity/svg-modules-fidelity.test.ts \
  src/views/__tests__/WorkstationView.desktop-layout.test.ts \
  --reporter=default --maxWorkers=1 --no-file-parallelism

PASS: 4 files / 49 tests
```

### Remaining acceptance for this slice

- [x] Run `usePreviewRenderer` and cross-platform export regression.
- [ ] Run exact ESLint, `vue-tsc`, production build, and GitNexus `detect_changes`.
- Launch and inspect the packaged Tauri desktop application; browser research alone cannot close
  the native-software acceptance row.

### Workstation flagship SVG integration

- The applied-editor wrapper calibration exposed one remaining product-chain gap:
  `usePreviewRenderer()` generated preset CSS but did not run the selected WeChat preset's
  `decorate` function. Flagship SVG therefore existed in Export but not in the Workstation
  Stage/split/full preview.
- GitNexus exact upstream impact is `LOW` for both `usePreviewRenderer` and its internal
  `renderPreview`: two and one direct dependents respectively, with zero affected execution flows.
- The minimal shared-root repair runs `preset.decorate(renderedHtml, 'preview')` once after the
  async Markdown render and stale-token guard, then passes that decorated HTML into the existing
  WeChat fidelity wrapper. Copy/export/publish payloads and platform-native artifact generation are
  unchanged.
- TDD red stabilized at 1 failed / 5 passed: `flagship-kiln` had the measured WeChat canvas marker
  but no `cover-grid` or `divider-forge`. Green passes 6/6 and also asserts responsive inline SVG,
  no `script`, and no `foreignObject`.
- The post-fix renderer matrix passes 5 files / 431 tests, covering the preview composable,
  flagship pipeline, SVG fidelity, platform export rendering, and cross-platform pipeline.

## 2026-07-27 Native Delivery Acceptance Slice

### Product corrections

- ExportModal style capability rows are native buttons backed by the canonical
  `selectPreset(presetId)` path. Applied rows expose `aria-pressed`; rows without a safe
  current-round application are native `disabled`.
- A preset may represent multiple style capabilities. Preflight now reports the selected preset,
  every represented capability label, and usable/blocked/unavailable counts without introducing a
  second selection store.
- Native E2E opens real details rows, scrolls the owning modal viewport, clicks actual WebDriver
  controls, and reads back post-action state. All `this.skip()` escape paths were removed so a
  missing native prerequisite fails rather than creating false green evidence.
- The real desktop probe found that an expanded unpinned Inspector was covering Stage actions:
  the visible enabled `全屏导出` control hit-tested to the Inspector `段落` control. The Inspector is
  now anchored to the editor side of the expanded Stage and returns to the workspace edge only when
  Stage is collapsed, with a smooth `right` transition.

### Verification

```text
ExportModal SVG options:
PASS: 1 file / 7 tests

Workstation and ExportModal source contracts:
PASS: 2 files / 28 tests

Focused native style-capability control:
PASS: 1/1

Focused native Inspector/Stage overlap:
PASS: 2/2

Related renderer and UI regression:
PASS: 5 files / 417 tests

Full real Tauri/WebView2 acceptance:
PASS: 11/11, zero skips

Exact ESLint for the changed Workstation, ExportModal, tests and native E2E:
PASS

Production frontend build:
PASS: 5,571 modules, 53.22s

Tauri release:
PASS: optimized release executable plus MSI and NSIS bundles
```

The 11 native rows cover real draft setup, flagship Workstation SVG, Settings platform selection,
export-only CSS, CustomCSS apply/remove, export-history create/clear, all-platform style gates,
Kiln/Tempera/Amber responsive SVG, and mobile-emulated CJK line width.

### Deliverables

```text
D:\Desktop\InkForge-0.1.0-Windows-20260727\InkForge.exe
D:\Desktop\InkForge-0.1.0-Windows-20260727\InkForge_0.1.0_x64_en-US.msi
D:\Desktop\InkForge-0.1.0-Windows-20260727\InkForge_0.1.0_x64-setup.exe
D:\Desktop\InkForge-0.1.0-Windows-20260727\SHA256SUMS.txt
D:\Desktop\InkForge-0.1.0-Windows-20260727\BUILD-INFO.txt
```

SHA-256:

```text
f9d3f858a278a2e357384a91b40299612dc703c81496e07c3c314be186511633  InkForge.exe
9b4c9390f97cfa4c7568a14b2804dafd147b192d52a1f7c537306d79f1af9d69  InkForge_0.1.0_x64_en-US.msi
e71c2bfac23f79ddb7f0c1a77a74418185b28e193ad742344deb5f4ab053f168  InkForge_0.1.0_x64-setup.exe
```

The copied portable executable was started directly from the delivery directory. The process was
responsive with the native `InkForge` window and zero TCP connections, proving that this acceptance
launch did not depend on a localhost development server.

### Remaining manual/external evidence

- Xiaohongshu and Zhihu account upload/publication are intentionally excluded from automated
  acceptance and remain manual user tests.
- WeChat PC paste into the credentialed editor, phone QR preview, mobile Dark Mode and interaction,
  cover thumbnail, credentialed draft sync, scheduled send, and publication remain external/manual
  evidence. Local/native passing tests do not claim those outcomes.
