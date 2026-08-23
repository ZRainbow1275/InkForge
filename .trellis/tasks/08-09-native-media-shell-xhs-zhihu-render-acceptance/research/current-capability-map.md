# Current Capability Map — 2026-08-09

## Scope

This note maps the current InkForge production paths that this task must reuse. It is a planning
artifact only; no product code was changed while producing it.

## Indexed source findings

- Serena was initialized for project `Inkforge`. It resolved the current symbols:
  - `convertToNativeFormat()` in `inkforge/src/services/export/index.ts`;
  - `resolveDeliveryAdornmentSlots()` in `inkforge/src/services/export/delivery-adornments.ts`;
  - `uploadWechatArticleImage()` in `inkforge/src/services/export/wechat-publish.ts`;
  - `getPlatformStyleProofAcceptanceAuditReport()` in
    `inkforge/src/services/export/style-catalog.ts`;
  - `focusNativeWindow()` in `inkforge/src/services/desktop/index.ts`;
  - `waitForManagerPanelTransition()` and `handleInspectorWidgetHandshake()` in
    `inkforge/src/views/WorkstationView.vue`;
  - `getReducedMotionPreference()` in `inkforge/src/services/performance/collector.ts`.
- Serena could not inspect the Rust symbols under `src-tauri` because that path is ignored by its
  project index. Rust planning therefore uses the current source, existing tests, and GitNexus
  evidence rather than pretending Serena covered it.
- GitNexus repo `InkForge` is indexed at 22,611 symbols / 40,945 relationships / 300 flows.
  `convertToNativeFormat()` already delegates to the current WeChat, XHS, and Zhihu converters and
  invokes the existing XHS/Zhihu artifact-manifest validators. It is the single shared platform
  conversion boundary; this task must not add another renderer.
- `resolveDeliveryAdornmentSlots()` is already shared by masthead-song and suffix composition. Any
  additional native-media disposition must extend or consume this result, not repeat slot scans in
  UI and platform code.
- `focusNativeWindow()` already routes through desktop-runtime detection and native invocation.
  `waitForManagerPanelTransition()` already waits before restoring the editor anchor. The native
  shell slice should close observable gaps around these paths instead of creating a second window
  manager or animation framework.

## Existing product contracts to preserve

1. Canonical body components remain PascalCase JSX / TipTap `InkComponent` nodes backed by the
   existing writing-component registry and Zod validation.
2. Automatic song/profile/source/CC adornments remain Settings-owned delivery data.
3. Workstation preview, Export, Publish preparation, and clipboard continue through
   `convertToNativeFormat()`. XHS/Zhihu text conversion is product-reachable, but image manifests are
   currently only caller-supplied and validated there; `sliceMarkdownToXhsCards()` and the existing
   manifest constructors are not yet wired to a visible release Export that writes real files. This
   task must connect those existing pieces before any XHS/Zhihu image-pack claim.
4. WeChat official image upload, permanent cover material, and draft creation remain behind the
   existing Tauri/local-service boundary. Current code lacks a restricted add/get/list/delete/absence
   round trip, pre-add unique marker, and crash-recoverable cleanup journal. The minimal extension is
   one backend-only operation; no generic ID read/delete invoke is exposed to Vue. Unknown outcomes
   remain blocked. Recovery must fully paginate `draft_batchget` with content enabled and compare a
   stable normalized marker/payload hash. Credentials and returned media IDs never enter browser-side
   state, ActivityLog, normal logs, or repository evidence.
5. Style-proof manifests and acceptance-audit reports remain the evidence accounting layer. Local
   tests cannot upgrade a phone, authenticated editor, upload, sync, or publish gate.
6. Inspector content already supports docked, in-app floating, and allowlisted native utility
   windows. The task verifies and repairs lifecycle/focus/persistence behavior; it does not add
   arbitrary-window HTML or another inspector data store.
7. `InkComponentNode.componentId` identifies a registry type, not an instance. Native-media handoff
   therefore needs a non-persisted per-artifact occurrence key and unique anchor; no new schema/store.
8. Product `settings.appearance.reducedMotion` and OS `matchMedia()` are separate current authorities.
   The task must unify them into one effective OR decision for both visual classes and wait logic.

## Current shell capability table

- Manager: collapse / expand.
- Stage: collapse / expand.
- Inspector panel: pin / hover reveal / collapse.
- Inspector widget: dock / in-app float / allowlisted native window / close / redock.

The generated shell matrix enumerates these supported rows. It does not create a Cartesian product
or add Manager/Stage native windows merely to satisfy a test table.

## Current regression anchors

- Export/platform: `src/services/export/platform-export-rendering.test.ts`,
  `delivery-adornments.test.ts`, `writing-components-platform.test.ts`, `wechat-publish.test.ts`,
  `xhs.test.ts`, `zhihu.test.ts`, and the serial `src/services/export` suite.
- Workstation/editor: `WorkstationView.desktop-layout.test.ts`,
  `WorkstationView.focus-collision.test.ts`, `WorkstationView.vignette.test.ts`,
  `TypewriterMode.decorations.test.ts`, and existing editor keymap tests.
- Native release: WDIO `native-runtime.spec.cjs`, `editor-settings.spec.cjs`, `svg-render.spec.cjs`,
  plus the current Tauri release build.

## Pre-edit rule

Before changing any listed function, class, or method, run GitNexus upstream impact on the exact
symbol. HIGH or CRITICAL results require a user-visible warning and a smaller shared-root proposal
before editing. After implementation, run `detect_changes` and reconcile its global dirty-worktree
result against the exact task diff.
