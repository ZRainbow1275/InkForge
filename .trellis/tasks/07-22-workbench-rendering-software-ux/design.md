# Technical Design — 工作台渲染与软件化高定修复

## 1. Status and scope

- Task status: `in_progress`.
- This design covers `R-01` through `R-23` in `prd.md` as one coordinated repair because the visible defects share state, layout, rendering, and delivery boundaries.
- It preserves the current Vue 3 + Tauri 1.6 + Pinia + TipTap + Dexie stack and the existing export/render services. No framework replacement, broad shell rewrite, parallel renderer, or speculative dependency is introduced.
- Source evidence:
  - `research/screenshot-audit.md`
  - `research/current-code-audit.md`
  - `research/platform-rules-refresh-2026-07.md`
  - `prompts/0420/00-master-plan.md`
  - `prompts/0420/specs/15-export-publish-spec.md`

## 2. First-principles invariants

1. **The document remains authoritative.** Platform previews and artifacts are derived from the same current article; a platform renderer never writes back into the Markdown/article source.
2. **One visible control has one writable state.** Typography, style choice, layout mode, inspiration source, and delivery target each have one canonical source. Compatibility values may be read during migration but are not edited in parallel.
3. **Transient UI cannot move the document.** A hover-only or unpinned panel overlays the workstation; only an explicitly docked/pinned panel reserves layout width.
4. **Rendering and delivery are separate.** Rendering creates a deterministic artifact. Export writes/copies that artifact locally. Publish consumes the same artifact contract for a channel action and may require credentials or manual external work.
5. **Desktop chrome has one owner.** The global `TitleBar` owns application identity, drag regions, native controls, and safe-area geometry. Feature views do not draw a second application title bar.
6. **Local evidence cannot prove external success.** XHS/Zhihu upload and publish remain user acceptance; WeChat paste, phone preview, cover, sync, and publish retain their own gates.

## 3. Canonical systems

| Concern | Canonical implementation | Compatibility boundary |
| --- | --- | --- |
| Desktop title and safe area | `App.vue` + `components/chrome/TitleBar.vue` | Remove only the duplicate Workstation brand block. Keep the native taskbar/window icon. |
| Workstation layout/session | `stores/layoutPersistence.ts` + `services/layout-persistence/**` | Existing rows load with defaults for new panel presentation fields. |
| Typography | `settings.appearance.typography` + `useTypography()` | Top-level `appearance.fontSize` and `appearance.lineHeight` are migration aliases only. |
| WeChat personas | `services/export/themes.ts` | Legacy `stores/theme.ts` maps old IDs to canonical presets; it no longer renders its own CSS. |
| Platform styles and proof | WeChat/XHS/Zhihu preset registries + `style-catalog.ts` | Proof/catalog rows remain available in diagnostics, not as a second primary style selector. |
| Preview | `usePreviewRenderer()` and the selected platform renderer | `ThemesView` and split view stop hand-building generic preview HTML. |
| Artifact generation | `convertToPlatform()` / `convertToNativeFormat()` + `NativeExportResult` | Export and Publish call one shared artifact-builder function instead of maintaining conversion branches. |
| Articles/folders/assets/tags | Existing article, category, asset, and tag stores | Remove duplicate presentations, not CRUD, drag/drop, filter, context-menu, or persistence behavior. |
| AI inspiration | Existing AI service and settings error state | Local/custom source never silently calls AI. |
| Native capabilities | `services/desktop/index.ts` + whitelisted Tauri commands | Web runtime fails closed with an actionable message. |

## 4. Target architecture and data flow

```text
Article Store (Markdown + title + assets)
             |
             v
Render Selection
  platform + canonical preset/style choice + typography + supported options
             |
             v
Shared artifact builder
  previewHtml + NativeExportResult + QualityReport + exact option snapshot
             |
      +------+--------------------+
      |                           |
      v                           v
Export surface                Publish surface
copy / save / folder          channel / account / draft / manual handoff
      |                           |
      v                           v
local artifact evidence       external status/evidence boundary
```

The shared builder is a small service around the existing converters. It does not create a new renderer. Its snapshot records the article identity/revision, selected platform, preset/style choice, effective options, generated result, quality report, and timestamp so the two delivery surfaces cannot silently diverge.

## 5. Detailed design

### 5.1 Desktop shell, manager navigation, and command bar — R-01, R-04, R-09, R-10

- Keep the five real manager destinations (`files`, `versions`, `outline`, `tags`, `ai`) and their existing content/state. Within the default 280px manager, render them as one five-slot compact grid with vertically aligned Lucide icon and complete label, explicit pressed/focus semantics, and the collapse action outside the grid; do not solve crowding by hiding a destination or truncating its label.
- Keep `TitleBar` as the sole application chrome and expose its height/control-zone spacing through existing design tokens or one shared CSS variable.
- Replace the branded Workstation header with a document command bar:
  - document/navigation group;
  - stable mode group (`编辑` / `预览` / `审阅` / `分栏`), where `审阅` is never sent to overflow;
  - delivery group (`导出`, `发布`);
  - lower-priority layout and utility actions in the existing menu/dropdown pattern when width is constrained.
- Use native CSS flex/grid and one compact breakpoint driven by available command-bar width. Do not add a toolbar framework.
- Keep icon size, button height, label baseline, focus ring, disabled state, and group separator consistent with existing tokens and `lucide-vue-next`.
- Move the focus-mode exit control into the editor surface below the title-bar safe area. It remains keyboard reachable and cannot occupy the native minimize/maximize/close zone.

### 5.2 Inspector, hover geometry, split view, and detachable cards — R-03, R-07, R-08, R-12

#### Inspector presentation state

The existing collapsed/pinned state is retained and clarified into three observable presentations:

- `docked`: reserves the persisted inspector width;
- `overlay`: unpinned edge-hover reveal, positioned above the editor without changing its rectangle;
- `floating`: one or more inspector cards placed above the workstation canvas.

The fixed edge hot zone remains in place while the overlay opens. The existing hold/collapse timers can be reused, but pointer entry into the overlay counts as still inside the reveal region. Width animation occurs inside the overlay; it does not animate a flex/grid column from `12px` to `260–460px`.

#### Detachable cards

- First-class card IDs are limited to real existing inspector content: platform preview, references, and document statistics.
- Each card uses the same component/data source whether docked, floating in-app, or hosted in a Tauri utility window.
- In-app floating cards use pointer capture and CSS transforms, clamped to the workstation bounds; no drag dependency is added.
- Native desktop detachment uses a new whitelist-only command accepting a known surface ID plus profile/article identity. Arbitrary URLs or HTML are rejected. The utility route renders only the selected known card and syncs through existing persistent stores.
- Closing, re-docking, app restart, and unavailable web runtime have explicit behavior. Persist only the card ID, placement mode, bounded position/size, and native window label; do not persist DOM or article content copies.

#### References and split view

- References receive a readable minimum height, wrapped URLs, explicit open/copy controls, independent scrolling, and complete empty text.
- Split view keeps the existing ratio, divider, sync-scroll, and persistence implementation. The right pane is changed from generic `MarkdownPreview` to `usePreviewRenderer()` for the selected platform/style.
- A narrow viewport displays an explicit “空间不足，展开窗口或退出分栏” state and keeps the user's requested split preference; it no longer silently toggles the feature off.

### 5.3 Tags and file tree — R-02, R-11

- `TagBrowser.vue` is flattened into: one compact header/management action, current article tags, inline add/search, and one scrollable all-tags list. Existing CRUD, counts, colors, filters, and article associations remain unchanged.
- `FileManager.vue` exposes the category/folder tree as the only primary presentation. The flat/recent switcher and duplicate quick-access/recent lists are removed from the visible hierarchy.
- Folder/category nodes continue to own articles and assets. Search, sort, status filters, drag/drop, context menus, rename, selection, and asset actions remain available from the tree or its toolbar.
- Persisted legacy view values (`flat`, `recent`) normalize to `tree` without deleting data or categories.

### 5.4 Typography, writing focus, style selection, and platform rendering — R-05, R-06, R-13, R-14, R-15

#### Typography

- `settings.appearance.typography` is the only writable typography object.
- The Workstation and export advanced panel both bind to `useTypography()`/the same settings actions; no direct duplicate `fontSize`/`lineHeight` refs remain.
- Each selected platform exposes only options it can apply. Unsupported options are hidden or disabled with a named fallback/blocker; no visible no-op slider is permitted.
- Existing top-level scalar settings are imported once into nested typography only when a newer canonical value is absent, then retained solely for backward read compatibility.

#### Focus and typewriter behavior

- Keep the existing TipTap `TypewriterMode` extension.
- Ensure live setting changes update the extension without reconstructing the editor.
- Typewriter mode anchors the active selection to the configured viewport band while preserving selection and undo state.
- Dim focus applies a clearly visible but bounded inactive-paragraph treatment; disabling either feature removes its decorations immediately.
- Respect `prefers-reduced-motion` and the application's reduced-motion setting.

#### One style surface

- The primary selector is populated from the canonical platform preset/application registry:
  - WeChat: all real persona and flagship recipes from `themes.ts`;
  - XHS: XHS-native text/raster presets;
  - Zhihu: Zhihu-native semantic Markdown/preview presets.
- The selected style, supported typography, and SVG/module options are shown once. Advanced parameters live in the collapsible middle pane adjacent to the preview.
- Quality, evidence, market taxonomy, proof queues, and release gates remain intact in a dedicated diagnostics drawer; they are not duplicated in the normal export path.
- `ThemesView.vue`, `ThemePanel.vue`, split preview, Export, and Publish all render through the corresponding platform renderer. `stores/theme.ts` becomes a compatibility projection and cannot hand-build an alternative CSS result.

#### Persona and platform distinction

- Every WeChat persona must differ by more than name/accent: tests cover at least typography, heading/quote/divider/block recipe, or structural decorator sentinels on the same article fixture.
- XHS remains text plus raster pages/cover/long-image artifacts. Raw inline SVG/HTML is never treated as publishable XHS body content.
- Zhihu remains clean semantic Markdown plus public/platform-hosted image references and raster fallback for unsupported diagrams/complex tables. WeChat wrappers and inline SVG are stripped.
- WeChat remains flow-based inline HTML plus the owned WeChat-safe SVG subset and independent external proof gates described in `research/platform-rules-refresh-2026-07.md`.

### 5.5 Export, Publish, personal blog, and folder delivery — R-16, R-17

#### Export

- `ExportModal` becomes a short local-artifact flow: platform/format, one style selector, collapsible supported options, preview/preflight summary, and copy/save/folder actions.
- It does not perform credentialed WeChat draft creation or claim publication.
- Diagnostics remain reachable from a deliberate secondary drawer.

#### Publish

- `PublishView` consumes the shared artifact contract and owns target channel, account readiness, draft/sync/manual handoff, status, retry, and audit history.
- WeChat draft creation moves here and remains server/credential gated.
- XHS and Zhihu present exact local artifact folders and manual checklists; upload/publish acceptance is performed by the user and never marked successful from local generation.

#### Personal folder and static-site blog

- Restore the historical standard HTML and standard Markdown artifact families.
- “个人文件夹” writes a selected artifact and its relative assets to a user-selected native directory.
- “个人博客” targets a configured static-site content directory with Markdown/HTML, preserved frontmatter, deterministic safe filename, and relative asset directory compatible with Hugo/Hexo/Jekyll-style source trees.
- Add only the minimal Tauri file-write command required by the current Tauri 1.6 stack. Validate paths and names at the boundary. Write to a sibling staging directory/file, flush/close, then rename into place; on failure, report the exact stage and leave the previous destination intact.
- No arbitrary post-publish shell command, hidden credential use, or invented WordPress/Ghost success is introduced. A remote API adapter requires a named protocol and explicit credential design.

The user selected this static-site directory contract for the current round; WordPress/Ghost remote APIs are not part of the current implementation.

### 5.6 Settings and About — R-18, R-19, R-20

- `ViewTransition.vue` uses stable route identity for `/settings`; changing `?tab=` does not unmount `SettingsView`.
- `SettingsView` keeps the shell and left rail mounted. Only the inner section uses the existing reduced-motion-aware transition.
- Apply one existing settings control pattern to buttons, switches, refresh actions, file pickers, status rows, and focus/error states. The real file input remains accessible but is visually mediated by the canonical button/filename row.
- About remains a settings section with persistent navigation. Group brand/version/update/credits in the main flow; runtime/storage/diagnostics move into collapsible technical details or Advanced without deleting them.

### 5.7 Hub — R-21, R-22, R-23

- Keep the Start area and bottom-right red creation menu. Remove only the header plus and the two Recent-card creation actions; preserve their commands, shortcuts, template, and import capabilities through the retained entrances.
- Increase the Recent heading hierarchy using existing typography tokens.
- Daily inspiration has a persisted source value: `local` or `ai`.
  - `local`: selected from bundled content, remains directly editable, and persists the user's edited value without an AI call;
  - `ai`: explicit generate/retry through the existing AI service with configuration/loading/error states;
- Reuse the existing computed article filter for an anchored search result surface. Add keyboard up/down/enter/escape, clear, no-result state, and direct article open; the article grid remains secondary feedback rather than the only visible response.

## 6. Compatibility and migration

| Existing state | Migration behavior | Rollback safety |
| --- | --- | --- |
| Legacy theme preset ID | Map to a canonical platform preset; unknown IDs fall back to the platform default and are reported once. | Keep the original stored value until a successful canonical save. |
| Top-level typography scalars | Copy into missing nested values once; all future writes target nested typography. | Old fields remain readable during the compatibility window. |
| File manager `flat` / `recent` mode | Normalize presentation to `tree`; article/category/asset records are untouched. | No data migration or deletion is required. |
| Existing layout rows | New inspector/card fields have safe defaults; positions/sizes are clamped on load. | Unknown/stale native window labels fall back to docked cards. |
| Existing export settings/history | Preserve records; add platform/style/options metadata without rewriting prior entries. | Older rows remain displayable with defaults. |

Every migration is deterministic, schema-validated, and covered by a focused regression. No task step clears IndexedDB, localStorage, article content, categories, assets, tags, history, or account configuration.

## 7. Accessibility, performance, and desktop behavior

- All retained actions remain keyboard reachable with visible focus. Icon-only actions have an accessible name and tooltip.
- Floating cards retain a keyboard route to re-dock/close; pointer dragging is not the sole control.
- Respect reduced motion for panel, settings, focus, and search transitions.
- Reuse the existing debounced persistence and renderer scheduling. Hover motion changes CSS geometry only and must not rerender article content.
- Run expensive export suites serially. No additional browser instance is opened while the user is hand-testing the current desktop app.

## 8. Validation and evidence contract

1. **Focused deterministic checks** for state migration, edge-panel geometry, typography parameters, style/preset projection, shared artifact generation, native path validation/rollback, settings shell identity, Hub source/search state, and Typewriter decorations.
2. **Cross-platform renderer regression** using one real article fixture and every selectable persona/platform preset.
3. **Static checks**: changed-file ESLint, `vue-tsc --noEmit`, Rust `cargo check`, and production build.
4. **Real runtime checks**:
   - Tauri standard/narrow/maximized/restored layouts;
   - inspector dock/overlay/float/native utility window;
   - focus, review, split, tags/files, settings, About, Hub;
   - exact local folder/static-site files read back from disk;
   - WeChat application-scope style samples and artifact preflight.
5. **External manual boundary**: the user performs XHS/Zhihu editor upload/publish acceptance. Missing external proof cannot be converted into a local pass.

The task acceptance matrix records `R-01..R-23`, code anchors, changed files, automated check, runtime evidence, external boundary, and final status separately.

For final product acceptance, “real runtime” means the native `InkForge.exe`
process with packaged assets and Tauri commands. Browser tooling may be used
only to study an external editor or diagnose DOM behavior; it is not an
InkForge release surface and cannot close a desktop acceptance row. The final
handoff must include Windows installer artifacts, hashes, and a release-binary
startup check with the Vite development server stopped.

## 9. Risk and rollback

- `WorkstationView.vue` and `ExportModal.vue` are high-density files. Each implementation slice must run GitNexus impact before symbol edits, keep one shared-root change per slice, and review the focused diff before continuing.
- Native utility windows and folder writes are the only Rust-expanding areas. They are whitelist/path-validated and can be disabled independently while the same cards/export artifacts continue in-app.
- UI deduplication never removes the underlying command, store action, diagnostic report, migration, or adapter. If a new canonical surface regresses, rollback restores the old presentation without data conversion.
- No changes to authentication secrets, browser profiles, remote platform accounts, or external publish state are part of this design.

## 10. Requirement-to-design map

| Requirement | Owning design section |
| --- | --- |
| R-01, R-04, R-09, R-10 | §5.1 |
| R-03, R-07, R-08, R-12 | §5.2 |
| R-02, R-11 | §5.3 |
| R-05, R-06, R-13, R-14, R-15 | §5.4 |
| R-16, R-17 | §5.5 |
| R-18, R-19, R-20 | §5.6 |
| R-21, R-22, R-23 | §5.7 |

## 11. 2026-07-23 Re-acceptance design

### 11.1 State-machine repair, not additional flags — U-01, U-02, U-04, U-05

- Model the manager rail as explicit `expanded | collapsed` presentation with
  one persisted width and one content owner. Collapsing must change the grid
  track and accessible expansion state, not only hide the manager body.
- Model every inspector widget placement as
  `docked | floating-in-app | detached-native | closed`. A widget ID may occupy
  only one placement at a time. Closing and re-opening follow a deterministic
  transition table; no copied component subtree or duplicated watcher is
  permitted.
- The shared widget frame owns title bar, actions, resize/drag bounds, content
  viewport, focus return, and reduced-motion transition. Docked, in-app, and
  native hosts render the same `InspectorWidgetContent`.
- Writing focus remains one TipTap extension plus one viewport vignette. The
  mode controller owns activation, live option changes, selection-preserving
  anchoring, document switches, and cleanup.

### 11.2 Typography and platform recipe system — U-03, U-06, U-07

- Extend the existing canonical typography schema with capability-described
  controls rather than adding view-local values. Platform renderers declare
  whether a field is native, safely emulated, raster-only, or unsupported.
- Add a visual-signature descriptor to each canonical preset: body rhythm,
  heading family, quote family, divider/decorator family, media treatment, and
  platform-specific modules. The renderer remains authoritative; descriptors
  drive the selector explanation and deterministic distinction tests.
- Preview frames reproduce the observable platform canvas and content rhythm:
  WeChat flow HTML/SVG, XHS raster-card/mobile composition, and Zhihu semantic
  article layout. InkForge chrome remains shared while the article surface is
  platform-native.
- Browser learning uses one persistent CloakBrowser session and redacted DOM/
  computed-style notes only. Browser profiles, cookies, account identifiers,
  tokens, screenshots containing account data, and raw copied platform
  artifacts never enter the repository.

### 11.3 Artifact adornments and platform components — U-08, U-09, U-11

- Add one typed `DeliveryAdornmentConfig` to the shared artifact snapshot:
  reading-time notice, optional CC license, and ordered platform component
  references.
- Platform component references are schema-validated records, not pasted raw
  HTML. WeChat adapters support the observed safe metadata needed by song,
  image, link, related-article, and contact-card handoff; unsupported or
  credential-bound records remain explicit manual blocks.
- Preview, Export, and Publish consume the same snapshot. Export owns local
  copy/save; Publish owns channel actions. The source viewer is a resizable,
  independently scrolling secondary panel and never competes with the primary
  action bar.

### 11.4 Hub viewport composition — U-12, U-13, U-14

- Use a bounded dashboard grid based on available route-shell height, with
  card-internal scroll owners and min/max tracks. Do not stretch empty cards to
  arbitrary fixed heights or let one tall card force dead space below its
  siblings.
- Hub daily inspiration is read-only output plus source/refresh/settings
  actions. Editable local text, author, and defaults move to the appropriate
  Settings section while retaining the existing persistence record.
- The search surface owns a single `:focus-within` ring. The inner input has no
  independent border/ring; shortcut and clear actions participate in the same
  shell and result focus lifecycle.

### 11.5 Settings capability ownership, Pi, and Sync — U-15..U-19

- Settings navigation owns stable capability groups:
  Appearance, Editor, Export, AI, Data, Sync, Advanced, Extensions, Shortcuts,
  Workspace, and About. Move components/routes, never delete the underlying
  capability.
- Read-only baseline/runtime diagnostics appear only under Advanced and the
  lazily mounted Developer panel. About contains product identity, release,
  license, acknowledgements, and a compact runtime summary.
- Introduce Pi through the existing AI provider contract. Configuration and
  secrets remain in the existing validated Settings/keychain path. Streaming,
  cancellation, health check, model selection, and errors reuse the current AI
  service lifecycle rather than a second client.
- Sync settings edit a discriminated provider schema and invoke the existing
  SyncEngine. Provider tests must prove the real configured endpoint/repository
  boundary; UI success is emitted only from the engine result. Queues and
  conflicts remain visible when a provider is unavailable.

### 11.6 Rollout and rollback

- Repair one shared state/data root per slice and retain current migrations.
- New schema fields receive deterministic defaults and preserve unknown legacy
  fields for round-trip compatibility.
- Every visible relocation keeps a direct navigation link from the former
  context for one compatibility cycle where discoverability would otherwise be
  lost.
- If Pi or a Sync provider is not configured, the corresponding action fails
  closed with setup navigation; no local-only success is emitted.
