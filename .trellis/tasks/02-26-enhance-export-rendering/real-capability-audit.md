# Real Capability Audit: Export and Platform Rendering

Date: 2026-05-11
Task: `.trellis/tasks/02-26-enhance-export-rendering`
Scope rule: no frontend component/view/style changes.

## Status Legend

- `real`: deterministic service implementation exists and is covered by tests or a runnable command.
- `partial`: implemented but missing live-platform integration, credentials, or one verified edge.
- `preview-only`: local fidelity/simulation only; useful, but not proof of real publishing ability.
- `stub`: explicitly throws or stands in for a future integration.
- `test`: verification artifact.

## Current Capability Map

| Path | Capability | Status | Evidence | Notes / Action |
|---|---|---:|---|---|
| `inkforge/src/services/export/index.ts` | Unified platform routing: themed HTML and native format export | real | `platform-export-rendering.test.ts`, `pipeline-cross-platform.test.ts` | `convertToNativeFormat()` is the real user-facing export contract for this task. |
| `inkforge/src/services/export/wechat.ts` | WeChat pasteable HTML export | real | `platform-export-rendering.test.ts`, `pipeline-cross-platform.test.ts` | Fixed in this task: image width now clamps to 640px; KaTeX class/CSS output degrades before sanitize; unsupported CSS regex cleanup was re-verified. |
| `inkforge/src/services/export/xiaohongshu-text.ts` | Xiaohongshu native plain-text export | real | `xhs.test.ts`, `platform-export-rendering.test.ts`, `pipeline-cross-platform.test.ts` | Markdown/HTML unsupported elements degrade to readable text; title/body/hashtags/image hints are exposed. |
| `inkforge/src/services/export/zhihu-markdown.ts` | Zhihu native Markdown export | real | `zhihu.test.ts`, `platform-export-rendering.test.ts`, `pipeline-cross-platform.test.ts` | Supports code-language coercion, LaTeX conversion/preserve mode, table options, task/Mermaid cleanup. |
| `inkforge/src/services/export/xiaohongshu.ts` | Xiaohongshu themed HTML renderer | preview-only | `xhs.test.ts` | Treat as visual preview/theme output, not native publishable XHS artifact. |
| `inkforge/src/services/export/zhihu.ts` | Zhihu themed HTML renderer | preview-only | `zhihu.test.ts` | Treat as preview/theme output; native publishable artifact is `zhihu-markdown.ts`. |
| `inkforge/src/services/export/platform-rules/wechat.ts` | WeChat CJK spacing, width clamp, dark-mode metadata | real | `platform-rules/wechat.test.ts` | No frontend dependency. |
| `inkforge/src/services/export/platform-rules/xiaohongshu.ts` | XHS title split, paragraph tightening, hashtags, image placeholders | real | `platform-rules/xiaohongshu.test.ts`, `xhs.test.ts` | Encodes 20-char title and 3:4 image hints. |
| `inkforge/src/services/export/platform-rules/zhihu.ts` | Zhihu equation image placeholders, table conversion, code-lang coercion | real | `platform-rules/zhihu.test.ts`, `zhihu.test.ts` | `tableHandling='fallback'` remains backward-compatible alias of `html`. |
| `inkforge/src/services/export/quality-detector.ts` | Platform issue detection | real | `platform-export-rendering.test.ts`, `pipeline-cross-platform.test.ts` | Fixed in this task: WeChat LaTeX degradation issue now appears in quality report. |
| `inkforge/src/services/export/utils.ts` | Shared export transforms: highlighting, tables, footnotes, cleanup | real | indirectly via platform tests | Code highlighting still depends on class-to-inline conversion before final class stripping. |
| `inkforge/src/services/export/css-validator.ts` | CSS validation utilities | partial | covered through platform CSS checks where used | Keep as service utility; not a standalone proof of platform compatibility. |
| `inkforge/src/services/export/platform-css.ts` | Platform CSS capability matrix | real | `platform-export-rendering.test.ts` | WeChat matrix correctly forbids custom properties, flex/grid/transform/media queries. |
| `inkforge/src/services/export/themes.ts` | Export theme registry | real | platform renderer tests | Themes are real render inputs, but theme preview UI is outside this task. |
| `inkforge/src/services/export/shared-typography.ts` | Shared typography constants/helpers | real | imported by renderers/tests | No change needed. |
| `inkforge/src/services/export/types.ts` | Export contracts and option types | real | typecheck target | Defines native/export/result/quality/platform types. |
| `inkforge/src/services/export/renderers/ast.ts` | Markdown AST parser for export metadata | real | `renderers/ast.test.ts` | Used for stats enrichment and structured export reasoning. |
| `inkforge/src/services/export/image-pipeline/asset-resolver.ts` | Asset URL resolution | real | `image-pipeline.test.ts` | Resolves registered local Inkforge assets and rejects unknown ids. |
| `inkforge/src/services/export/image-pipeline/dimension-extractor.ts` | Data URL dimension extraction | real | `image-pipeline.test.ts` | Supports actual data URL parsing; not a mock. |
| `inkforge/src/services/export/image-pipeline/types.ts` | Image pipeline contracts and `NotImplementedError` | real | `image-pipeline.test.ts` | Explicitly distinguishes unsupported uploaders from implemented resolvers. |
| `inkforge/src/services/export/image-pipeline/index.ts` | Image pipeline public exports | partial | `image-pipeline.test.ts` | Exports both real resolvers and explicit uploader stubs. |
| `inkforge/src/services/export/image-pipeline/uploaders/wechat-stub.ts` | WeChat material upload | stub | `image-pipeline.test.ts` asserts `NotImplementedError` | Do not claim WeChat material-library upload is real. |
| `inkforge/src/services/export/image-pipeline/uploaders/xhs-stub.ts` | Xiaohongshu image upload | stub | `image-pipeline.test.ts` asserts `NotImplementedError` | Do not claim live XHS image upload/publish is real. |
| `inkforge/src/services/export/image-pipeline/uploaders/zhihu-stub.ts` | Zhihu image upload | stub | `image-pipeline.test.ts` asserts `NotImplementedError` | Do not claim live Zhihu image upload/publish is real. |
| `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts` | XHS preview fidelity renderer | preview-only | `preview-fidelity/xiaohongshu-mock.test.ts`, `pipeline-cross-platform.test.ts` | Name is accurate: preview simulator, not platform integration. |
| `inkforge/src/services/export/preview-fidelity/zhihu-mock.ts` | Zhihu preview fidelity renderer | preview-only | `preview-fidelity/zhihu-mock.test.ts`, `pipeline-cross-platform.test.ts` | Name is accurate: preview simulator, not platform integration. |

## Test Artifacts in Scope

| Path | Coverage |
|---|---|
| `inkforge/src/services/export/platform-export-rendering.test.ts` | Main cross-platform native export assertions; updated in this task for WeChat unsupported CSS stripping, image width, and formula degradation. |
| `inkforge/src/services/export/__tests__/pipeline-cross-platform.test.ts` | Full Markdown-to-platform pipeline, quality reports, hard-limit boundaries, preview/native fidelity. |
| `inkforge/src/services/export/xhs.test.ts` | XHS text engine and preview sanity. |
| `inkforge/src/services/export/zhihu.test.ts` | Zhihu Markdown engine and HTML preview sanity. |
| `inkforge/src/services/export/citation-export.test.ts` | Citation/footnote degradation for XHS/native export. |
| `inkforge/src/services/export/image-pipeline/image-pipeline.test.ts` | Asset resolver, data URL dimensions, and explicit uploader stubs. |
| `inkforge/src/services/export/platform-rules/*.test.ts` | Unit coverage for platform-specific rule helpers. |
| `inkforge/src/services/export/renderers/ast.test.ts` | AST/stats parser coverage. |
| `inkforge/src/services/export/preview-fidelity/*.test.ts` | Preview-only renderer coverage. |

## Verified Fixes from This Pass

1. WeChat image width enforcement:
   - Before: width larger than 640px was detected by quality checks but not clamped in output.
   - After: `normalizeImageAttributes()` clamps width attributes and inline `style="width:...px"` to `640px`, preserves `max-width:100%`, and forces `height:auto` when clamping.
   - Test: `enforces WeChat image width policy during export, not only in quality warnings`.

2. WeChat formula degradation:
   - Before: KaTeX generated class/CSS-dependent HTML/MathML, then WeChat post-processing stripped classes and DOMPurify removed MathML annotations.
   - After: formula HTML is degraded before sanitize, preserving raw TeX from MathML annotation as readable self-contained formula text.
   - Test: `degrades WeChat LaTeX output to self-contained readable formula text`.

3. WeChat quality report:
   - Before: WeChat detector did not flag LaTeX as a platform-risk path.
   - After: detector emits `wechat-latex-degrade` suggestion.
   - Test: same WeChat formula test checks `qualityReport`.

4. WeChat unsupported CSS cleanup:
   - Before: final WeChat post-processing had a regression risk where string-built `RegExp` patterns could be over-escaped and fail to match normal whitespace such as `display: flex`.
   - After: regex strings use the correct TypeScript string escape level for `\s` and `var\(...)`.
   - Test: `strips WeChat-unsupported CSS even when style values contain normal whitespace`.

5. Task research path correction:
   - Before: task research mentioned `inkforge/docs/platform-rendering-rules/wechat-rules.md` as a stale reference.
   - After: re-check confirmed code comments point to `docs/platform-rendering-rules/*.md`, and those files exist; the task artifact was corrected.

## Explicit Non-Real Capabilities

- Live WeChat material-library upload is not implemented.
- Live Xiaohongshu image upload or publishing is not implemented.
- Live Zhihu image upload or publishing is not implemented.
- Preview-fidelity renderers are intentionally local preview simulators and should not be used as completion evidence for live platform publishing.

## Verification Commands

- Baseline before service fix:
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts src/services/export/platform-rules/wechat.test.ts src/services/export/platform-rules/xiaohongshu.test.ts src/services/export/platform-rules/zhihu.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts --reporter=default`
  - Result: 7 files, 112 tests passed.
- After service fix:
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts src/services/export/citation-export.test.ts src/services/export/image-pipeline/image-pipeline.test.ts src/services/export/platform-rules/wechat.test.ts src/services/export/platform-rules/xiaohongshu.test.ts src/services/export/platform-rules/zhihu.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts --reporter=default`
  - Result: 9 files, 127 tests passed.
- Final targeted regression:
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  - Result: 1 file, 13 tests passed.
- Final full export service suite:
  - `pnpm -C inkforge exec vitest run src/services/export --reporter=default`
  - Result: 12 files, 171 tests passed.
- Final export scoped lint:
  - `pnpm -C inkforge exec eslint src/services/export --ext .ts --quiet`
  - Result: passed, exit code 0.
- Final repo-wide non-mutating lint:
  - `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet`
  - Result: failed only in frontend files outside this task boundary:
    - `src/components/hub/insights/DataInsightsSection.vue` unused `activeCategory`
    - `src/components/hub/insights/TagCloud.vue` unused `InsightEmptyState`
    - `src/components/hub/insights/WordCountTrend.vue` unused `InsightEmptyState`
    - `src/views/HubView.vue` unused `draftArticlesForSignal`, `productivitySignals`, `toggleQuickActionMenu`
- Final repo-wide typecheck:
  - `pnpm -C inkforge exec vue-tsc --noEmit`
  - Result: failed only in frontend files outside this task boundary:
    - the same Hub/insights unused symbols listed above
    - `src/components/hub/WritingFlowDayPopup.vue` computed return type mismatch for `Record<string, string>`

## GitNexus Evidence

- `npx gitnexus status`: repository `D:\Desktop\Inkforge`, indexed commit `334a4f8`, current commit `334a4f8`, status up-to-date.
- `npx gitnexus impact postProcessForWechat --repo Inkforge --direction upstream`: LOW risk; direct caller `convertToWechatWithStats`, then `convertToWechat`, then `markdownToWechat` / `convertToPlatform`.
- Earlier impact checks for `normalizeImageAttributes`, `detectWechatIssues`, `markdownToXiaohongshuText`, `markdownToZhihuClean`, `restoreFences`, `restoreInlineCodes`, and `expandLatexInText` were also LOW.
- `gitnexus detect_changes` / `gitnexus detect-changes` is not exposed by the installed CLI help in this environment. Fallback evidence used here: GitNexus impact checks, `git diff --name-only` scoped to task/export files, targeted export test suite, scoped ESLint, and explicit repo-wide gate failure paths.

## Completion Audit Against User Objective

Objective: `$trellis-brainstorm` a no-frontend-change audit and repair pass for backend/service-layer real capabilities, with special focus on WeChat, Xiaohongshu, and Zhihu article rendering rules.

| Requirement | Evidence | Status |
|---|---|---:|
| Use Trellis task setup instead of ad-hoc work | Current task `.trellis/tasks/02-26-enhance-export-rendering`, `task.json` status `in_progress`, PRD rewritten for backend-services-export scope | done |
| Use Memory / prior repo truth | Task PRD records nested `inkforge/` runnable root and no separate `server/package.json`; final response cites memory lookup | done |
| Do not modify frontend component/view/style files | `git diff --name-only -- inkforge/src/components inkforge/src/views inkforge/src/styles inkforge/src/App.vue` returned no paths | done |
| Full export/platform real-capability inventory | `Current Capability Map` above covers routing, WeChat, XHS, Zhihu, platform rules, quality detector, CSS matrix, image pipeline, preview-fidelity, stubs, tests | done |
| Distinguish real, partial, preview-only, stub, stale | `Status Legend`, `Current Capability Map`, and `Explicit Non-Real Capabilities` sections | done |
| WeChat rendering closer to real pasteable requirements | `wechat.ts` fixes for 640px image clamp, pre-sanitize formula degradation, unsupported CSS regex cleanup; tests in `platform-export-rendering.test.ts` | done |
| Xiaohongshu native rules verified as plain text | `xiaohongshu-text.ts`, `platform-rules/xiaohongshu.ts`, tests `xhs.test.ts`, `platform-rules/xiaohongshu.test.ts`, `pipeline-cross-platform.test.ts` | done |
| Zhihu native rules verified as Markdown-compatible | `zhihu-markdown.ts`, `platform-rules/zhihu.ts`, tests `zhihu.test.ts`, `platform-rules/zhihu.test.ts`, `pipeline-cross-platform.test.ts` | done |
| No mock/fake success treated as real | Uploader stubs remain explicit `NotImplementedError`; preview-fidelity `*-mock.ts` classified as preview-only, not live capability | done |
| Research artifacts persisted | `research/wechat-rendering-rules.md`, `research/xiaohongshu-rendering-rules.md`, `research/zhihu-rendering-rules.md` | done |
| Code-spec updated with reusable rules | `.trellis/spec/backend/quality-guidelines.md` and `.trellis/spec/backend/index.md` updated | done |
| Non-mutating validation run | Export tests and scoped ESLint pass; repo-wide lint/typecheck run and failures documented as frontend scope-blockers | done |
| GitNexus impact considered | LOW impact evidence above; installed CLI lacks `detect_changes`, fallback evidence documented | done |

## Remaining Verified Gaps

- Replace uploader stubs only when real credentials/config/API contracts are available.
- Consider renaming preview-fidelity files away from `mock` only if product language requires it; technically they are honest preview simulators and tests already distinguish them from native output.
- Repo-wide lint/typecheck are still blocked by frontend Hub files that this task intentionally did not modify.
