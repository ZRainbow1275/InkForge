# P1 Export Publish Baseline PRD

## Context

This task continues `prompts/0420` after Spec 14 StatusBar Navigation baseline. The source of truth is `prompts/0420/specs/15-export-publish-spec.md`, with authority constraints from `prompts/0420/specs/10-markdown-authority-spec.md`.

The current runtime already has real export engines under `inkforge/src/services/export/` for WeChat, Xiaohongshu, and Zhihu. `ExportModal.vue` can render a styled preview, run quality detection, copy HTML, and download HTML. The baseline gap is not exporter absence; the gap is that export/publish UX still lacks explicit preflight truth, native-format copy/download actions, and visible failure states. The UI must not imply direct platform publishing unless real credentials/API configuration exists.

## Goals

1. Preserve the current real exporter engines and platform presets without deleting any current export functionality.
2. Add a truthful export preflight panel in `ExportModal.vue` for source readiness, render readiness, quality result, clipboard availability, download availability, and direct-publish availability.
3. Add real native-format output alongside existing styled HTML output by using the existing `convertToNativeFormat()` service.
4. Keep WeChat on styled HTML, Xiaohongshu on platform-native text, and Zhihu on platform-native Markdown when native output is requested.
5. Replace silent copy/download failures with visible, business-level feedback that does not expose raw stack traces.
6. Keep direct platform publishing disabled unless a real configured integration exists; do not fake publish success.
7. Validate with type-check, lint, build, and browser runtime checks. No mock data.

## Non-Goals For This Baseline

1. Real WeChat/Xiaohongshu/Zhihu API publishing is not implemented in this slice because no authenticated platform integration is configured in the current repo.
2. Export history IndexedDB tables, export logs, one-click re-export, preset persistence, Worker offloading, asset snapshot bundling, and five-platform 19-element golden matrix are not completed in this slice.
3. PDF export remains explicitly out of scope.

## Acceptance Criteria

1. Existing platform selection, style presets, code theme, line number, footnote, quality report, preview, styled copy, and styled download remain available.
2. `ExportModal.vue` renders a preflight panel derived from real current state, not static mock text.
3. Direct publish status explicitly says no real integration is configured and does not show a success state.
4. Native output preview metadata is produced through `convertToNativeFormat()` and can be copied or downloaded.
5. Copy failures and download failures produce visible feedback instead of silent catches.
6. Download uses real `Blob` artifacts and revokes object URLs after triggering the download.
7. `pnpm exec vue-tsc --noEmit` passes in `inkforge/`.
8. `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passes in `inkforge/`.
9. `pnpm build` passes in `inkforge/`, except for known chunk-size warnings.
10. Browser runtime validation confirms the modal opens, renders preflight rows, supports styled and native actions, and reports no console errors.

