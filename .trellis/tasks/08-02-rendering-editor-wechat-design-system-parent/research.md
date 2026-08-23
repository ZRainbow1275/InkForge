# Scoped Research — Rendering, Editor, and WeChat Acceptance

This file is a compact context bridge for implementation and review. It does not replace the
authoritative specs; it points to the exact current contracts that matter for this parent task and
avoids truncating the very large append-only WeChat/state specifications during Trellis injection.
Activation must still read the named source sections directly; any drift is resolved in favor of the
source spec before code changes begin.

## Authoritative contracts

1. `.trellis/spec/frontend/state-management.md`, **Canonical Typography State** and **Canonical
   Platform Preset Compatibility**:
   - `settings.appearance.typography` is the only writable typography authority;
   - `settings.export.defaultPlatform/defaultPresetId` is the only writable platform/preset pair;
   - retained compatibility surfaces must consume `themePresets`, `generateThemeCSS()`,
     `typographyToWechatCss()`, and `convertToNativeFormat()` rather than reconstructing a preset or
     renderer.
2. `.trellis/spec/frontend/wechat-svg-modules.md`, sections **325–330**:
   - Workstation wrappers provide canvas/chrome only and never become clipboard/export source;
   - one accepted render token owns HTML, statistics, and delivery report;
   - the existing writing-component registry is the single component declaration boundary;
   - the shared semantic baseline covers the complete article vocabulary, while every preset keeps
     at least three non-colour visual differences;
   - release `InkForge.exe` plus the application's real rich-copy action and ordinary Windows
     `Ctrl+V` into the authenticated WeChat PC editor are required for desktop paste proof;
   - PC paste does not prove phone preview, Dark Mode, native media, cover, sync, schedule,
     group-send, or publish.
3. `.trellis/spec/frontend/quality-guidelines.md`, **Packaged Desktop Acceptance Gate**:
   - Vite/browser inspection is diagnostic only;
   - final software evidence comes from the release Tauri process, packaged assets, native window,
     typed Tauri boundaries, and supported installer artifacts.
4. `.trellis/spec/frontend/component-guidelines.md`, **Workstation Inspector Independent-Rail** and
   **Panel Transition And Scroll-Owner** contracts:
   - editor, Stage, platform selector, and Inspector remain independently usable;
   - panel transitions preserve the real editor scroll owner, selection, focus, and reduced-motion
     behavior.

## Current source facts verified during planning

- `EditorPanel.vue` already enables StarterKit heading levels 1–6; `SlashCommands.ts` already exposes
  paragraph and H1–H6. The missing product capability is discoverable/stable interaction, not a new
  editor extension.
- `FloatingToolbar.vue` already calls real TipTap heading/quote/list/code commands but mixes them in
  an icon-heavy surface and exposes only H1–H3 directly.
- `WorkstationView.vue` already builds `platformArtifactOptions` and supplies it to both
  `usePreviewRenderer()` and quick native copy.
- `EditorPanel` emits `open-delivery-settings`, but `WorkstationView` currently maps that event to
  `showExportModal = true`. The correction is a dedicated transient editor delivery surface that
  reuses `DeliveryAdornmentPanel` and the existing Settings state.
- Existing preset, component, article, asset, Settings, and platform identifiers remain intact; the
  parent task does not authorize a second renderer, store, schema, registry, or template DSL.

## Evidence boundary for this round

- Required: focused regressions, serial export suite, exact ESLint, type-check, production build,
  Tauri release build, native visual/interaction acceptance for all 16 WeChat presets, and 16/16
  ordinary WeChat PC paste readbacks from the release software.
- 2026-08-09 approved extension: linked child
  `08-09-native-media-shell-xhs-zhihu-render-acceptance` owns WeChat native-media editor readback,
  the remaining native shell matrix, and XHS/Zhihu editor import/upload/readback without publication.
- User-operated/manual after that child: XHS/Zhihu publication only.
- External and unclaimed: WeChat phone preview, mobile Dark Mode, mobile interaction, cover visual
  thumbnail/crop/mobile preview, credentialed sync, scheduled send, group-send, and publication.
- Evidence must not contain cookies, tokens, QR codes, HAR files, browser profiles, account-state
  screenshots, private article bodies, or local runtime paths.
