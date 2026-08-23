# Context: implementation contracts for editor, artifact, and native proof

The authoritative specs are large, so this task injects only the clauses that change implementation
or acceptance. Implementers must still open the cited source range before editing its owning layer.

## Canonical state and artifact authority

Source: `.trellis/spec/frontend/state-management.md`.

- Lines 9-12: Pinia owns durable/shared UI state; services and Zod own business validation. Do not
  duplicate validation in a component or composable.
- Lines 70-97: `settings.appearance.typography` is canonical. Workstation, EditorPanel,
  `usePreviewRenderer`, ExportModal and Publish must consume it; aliases cannot become active state.
- Lines 119-147: preset authority is `themePresets` plus canonical Settings platform/preset. Retained
  copy tools use `convertToNativeFormat()`; rebuilding a preset or renderer from compatibility state
  is forbidden because it drops decorators and CSS.
- Lines 415-453: quick copy records export history only after real clipboard success. WeChat rich copy
  fails closed when only plain text is available. XHS/Zhihu publish automation is not proof.
- Lines 834-868: Workstation preview uses real editor content; an empty workstation remains honestly
  empty and must not create mock Markdown or sample documents.

Task application:

1. Explicit body components remain canonical JSX/TipTap atoms.
2. Automatic song/profile/CC settings remain canonical `settings.export.deliveryAdornment`.
3. No YAML/frontmatter state, second store, second renderer, or second stats calculation is added.
4. One immutable Workstation artifact options snapshot drives both preview and quick copy through
   `convertToNativeFormat('wechat')`.

## Real UI and packaged software evidence

Source: `.trellis/spec/frontend/quality-guidelines.md`.

- Lines 30-33 and 62-65: layout-sensitive work needs real UI evidence and real local data, not mock
  rows; durable/editor/export side effects are checked at their real boundary.
- Lines 191-198: export-only CSS reaches the real WeChat inline artifact; XHS/Zhihu publication remains
  operator-owned. `previewHtml` must not become a second handoff artifact.
- Lines 293-310: green unit tests do not replace visible rendering proof. InkForge acceptance is the
  packaged Tauri app and exact release executable, not a Vite/browser tab or localhost screenshot.

Task application:

1. Build and launch release `InkForge.exe` without the Vite server.
2. Inspect all 16 presets in the native app using one non-sensitive, full-element article.
3. Browser use is limited to the authenticated WeChat PC editor and ordinary OS `Ctrl+V` readback.

## WeChat component, preset, and paste contract

Source: `.trellis/spec/frontend/wechat-svg-modules.md`.

- Lines 17015-17027: every preset inherits the complete semantic baseline, keeps about 22-24 CJK
  characters per line at 375px, has no 320-586px overflow, and differs in at least three non-colour
  dimensions.
- Lines 17029-17037: masthead data is real; song/category/author/source/image/number/platform fields are
  omitted or editable when absent; a promoted component cannot reappear in suffix.
- Lines 17039-17053: one writing-component registry, Zod boundary, PascalCase JSX, TipTap atom and stable
  serialization drive editor and safe platform fallback.
- Lines 17055-17066: required checks include masthead idempotency, JSX round-trip, TipTap insertion,
  serial export tests, exact lint/type/build, and rebuilt native software.
- Lines 17070-17081: the final inline artifact after typography, post-processing, rich clipboard,
  ordinary paste and WeChat sanitization is authoritative. PC paste proves none of phone, Dark Mode,
  cover, sync, schedule, group-send or publish.
- Lines 17106-17118: native acceptance uses the existing copy button, rich HTML clipboard, ordinary
  Windows `Ctrl+V`, computed-style readback, visible content and zero horizontal overflow.

Task application:

1. Preview wraps the exact native artifact; it does not rebuild masthead/body/suffix.
2. Structured evidence records release/artifact/DOM hashes and redacted counts, never account chrome,
  Cookie, Token, QR image, browser profile, HAR, temporary paths or private drafts.
3. XHS/Zhihu receive local negative leak regressions only; their account/upload/publish tests stay manual.
