# Technical Design

## Architecture Boundary

This task refines and verifies the existing export/rendering stack. It must not create a parallel renderer or replace current app architecture.

Primary code boundary:

- `inkforge/src/services/export/wechat.ts`
- `inkforge/src/services/export/xiaohongshu-text.ts`
- `inkforge/src/services/export/zhihu-markdown.ts`
- `inkforge/src/services/export/platform-css.ts`
- `inkforge/src/services/export/platform-rules/**`
- `inkforge/src/services/export/quality-detector.ts`
- `inkforge/src/services/export/preview-fidelity/**`
- `inkforge/src/services/export/svg-modules/**`
- `inkforge/src/components/export/ExportModal.vue`

Primary documentation/spec boundary:

- `docs/platform-rendering-rules/wechat-rules.md`
- `docs/platform-rendering-rules/xiaohongshu-rules.md`
- `docs/platform-rendering-rules/zhihu-rules.md`
- `docs/微信渲染规则.md`
- `.trellis/spec/frontend/wechat-svg-modules.md`
- `.trellis/spec/frontend/flagship-element-catalog.md`

## Design Principles

- Preserve source-of-truth Markdown/editor content; platform richness is an export/view layer.
- Treat each platform as a separate output contract, not a theme recolor:
  - WeChat: inline-style HTML + safe SVG/HTML blocks + paste/sync safety.
  - Xiaohongshu: plain text + image/poster/long-image strategy.
  - Zhihu: clean Markdown semantics + image/formula/code/table compatibility.
- Prefer rule catalogs and reusable element families over one-off template snippets.
- Use existing brand geometry and palette. Market references inform categories and workflows, not copied visual assets.
- Make unsupported capabilities honest: unavailable/blocked/needs configuration beats fake success.
- Keep all icons non-Emoji inside InkForge UI; use `lucide-vue-next` or inline SVG paths.

## Market Practice Mapping

### 135 Editor

Observed capabilities:

- Material taxonomy: style center, template center, SVG style, SVG effect, SVG template, emoji title tools, public-account long image.
- Workbench taxonomy: title, body, image-text, guide, layout, festival, industry, SVG, one-click layout, clipboard, quality/text check, preview/share, account sync.
- WeChat workflow: template-driven insertion, parameter correction, global typography, mobile preview, copy/sync outputs.

InkForge mapping:

- Expand docs/spec into a rule catalog: title systems, body blocks, cards, figures, guide/follow/end blocks, layout blocks, festival/industry preset tags, SVG/interactive blocks, long image fallback.
- Keep current export pipeline but ensure quality detector can classify these families.
- Add rule-driven validation for typography width, image width, SVG safety, unsupported CSS, raw markup leakage, and platform output type.

### Xiumi

Observed capabilities:

- Product split: graphic article, H5, image design.
- Export split: sync to official account, plugin copy, copy/paste fallback, long image/PDF/video generation.
- Component taxonomy: SVG gallery, image carousel, click expand, path animation, lottery, fun slide, transition, trigger areas, click switch/popup/play, free layout.
- Editing model: component-level selection, transform, layer, positioning, animation, typography, shadow, border, deep-color/highlight handling.

InkForge mapping:

- WeChat SVG module docs should distinguish static decorative SVG, interactive SVG, and rasterized fallback.
- Complex interactive SVG remains opt-in and must pass WeChat-safe validation; non-portable interactions are not default output.
- Add docs for long-image/poster/PDF style fallback as a legitimate platform bridge, especially for XHS.

### doocs/md / OSS Markdown Editors

Validated lessons:

- Markdown parser + custom renderer + theme + sanitize + CSS inline + clipboard is the baseline pattern.
- Image host/upload handling is not optional for real WeChat publishing.
- Math/code/table rendering must be platform-specific: WeChat often needs inline HTML or image fallback; Zhihu can preserve Markdown semantics more often; XHS must degrade.
- Copy/export routines need pre-copy normalization, not only preview styles.

InkForge mapping:

- Preserve existing `marked` + DOMPurify + `juice` + platform post-processing chain.
- Keep platform post-processing deterministic and testable.
- Add/reinforce copy/export safety checks after final output, not only before decoration.

## Data Flow

### WeChat

Markdown / editor document -> `convertToWechatWithStats` -> sanitize user HTML -> apply preset CSS -> `juice` inline CSS -> preset `decorate(html, target)` -> SVG/HTML block injection -> `postProcessForWechat` -> `enforcePlatformCSS('wechat')` -> `wechatComplianceTransform` -> quality detection -> preview/export/copy/sync path.

Required invariants:

- No `<style>`, unsafe tags, event handlers, unresolved CSS variables, gradients when unsupported by rule, raw class-dependent styling, or unsupported layout dependencies in final output.
- SVG text-bearing structures must not be corrupted by CJK spacing or sanitizer.
- WeChat-safe SVG subset must use presentation attributes and avoid id-referenced constructs.
- HTML text-bearing premium blocks must use inline styles that survive WeChat paste.

### Xiaohongshu

Markdown / editor document -> platform conversion -> strip HTML/CSS/Markdown control leakage -> short paragraph and list normalization -> topic/title suggestions -> image/poster/long-image strategy -> quality detector.

Required invariants:

- Publishable artifact is plain text or explicit image/long-image artifact, never rich HTML.
- Unsupported code/table/formula blocks must be summarized or routed to image/poster.
- Emoji may be allowed in user content output rules, but InkForge UI icons still must not be Emoji.

### Zhihu

Markdown / editor document -> clean Markdown conversion -> remove WeChat-specific HTML/SVG/block styling -> preserve headings, lists, code fences, tables, links where supported -> formula handling: preserve source or generate image fallback when necessary -> quality detector.

Required invariants:

- No WeChat `<section data-ink-block>` / inline SVG decorations leak into Zhihu output.
- Markdown syntax is preserved intentionally, not accidentally leaked.

## Compatibility

- Windows local shell must use the nested `inkforge/` package and avoid WSL assumptions.
- Vite web validation must include Chrome/Chromium desktop and 390px mobile viewport.
- Tauri/native validation is required for native-dependent workflows; if the local toolchain cannot run safely, mark blocker.
- WeChat SVG/HTML rules are version-sensitive; real paste evidence and generated artifact tests are required.
- Long-running tests/builds should be sequential or bounded to protect memory.

## Risk Controls

- Before code edits, run GitNexus impact on the target symbol/file where possible. If stale index blocks reliable analysis, record it and compensate with targeted tests and final change detection.
- Do not run `pnpm -C inkforge lint` because it mutates via `--fix`; use `pnpm -C inkforge exec eslint ... --quiet`.
- Typecheck/build may dirty `inkforge/tsconfig.tsbuildinfo`; restore generated cache unless intentionally changed.
- No broad process killing. Dev server reuse must identify port ownership.
- No fake publish/sync/upload success.

## Rollback Shape

- Documentation/spec edits can be reverted by file-level patch.
- Code edits should be small, focused, and covered by targeted tests before broad tests.
- If a visual enhancement fails platform safety checks, keep the rule doc and mark the implementation path blocked rather than weakening safety checks.
