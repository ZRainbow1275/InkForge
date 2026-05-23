# Real Capability Audit: Export Platform Rendering

Date: 2026-05-12
Task: `.trellis/tasks/05-12-export-platform-rendering-real-capability-audit`
Scope rule: preserve frontend content and visual Vue files.

## Objective Restated As Deliverables

1. Continue from the previous Inkforge export-rendering work without changing frontend content.
2. Audit backend/service-layer export functionality critically and exhaustively enough to distinguish real capability from preview-only or stub behavior.
3. Re-check current best-practice rendering rules for WeChat Official Accounts, Xiaohongshu, and Zhihu.
4. Verify the repo's current three-platform output with real files, tests, lint/typecheck, and GitNexus evidence.
5. Record a prompt-to-artifact checklist so completion is based on evidence, not intent.

## Current Dirty-Tree Boundary

Pre-existing dirty paths before this task were frontend/UI or generated state:

- `.trellis/tasks/05-06-app-visual-overhaul/task.json`
- `inkforge/src/components/hub/WritingFlowDayPopup.vue`
- `inkforge/src/components/hub/insights/DataInsightsSection.vue`
- `inkforge/src/components/hub/insights/TagCloud.vue`
- `inkforge/src/components/hub/insights/WordCountTrend.vue`
- `inkforge/src/views/HubView.vue`
- `inkforge/tsconfig.tsbuildinfo`

This task added only a new Trellis task directory:

- `.trellis/tasks/05-12-export-platform-rendering-real-capability-audit/`

No files under `inkforge/src/services/export/**` were modified in this pass because current implementation already contains the previously required service-layer fixes and all verification gates passed.

## Research Artifacts

| Platform | Artifact | Main rule conclusion |
|---|---|---|
| WeChat Official Accounts | `research/wechat-rendering-rules-2026.md` | Pasteable HTML must be self-contained and inline-styled; formulas/images/diagrams need static assets or readable deterministic fallback when real upload is unavailable. |
| Xiaohongshu | `research/xiaohongshu-rendering-rules-2026.md` | Native publishable artifact is plain text with short title, limited relevant hashtags, short paragraphs, and 3:4 image guidance. |
| Zhihu | `research/zhihu-rendering-rules-2026.md` | Native artifact should remain Markdown-compatible, with deterministic handling for LaTeX, code language labels, tables, Mermaid, and limited HTML. |

## Capability Classification

| Path | Capability | Status | Evidence |
|---|---|---:|---|
| `inkforge/src/services/export/wechat.ts` | WeChat pasteable HTML output, post-processing, inline style cleanup, formula degradation, image width clamp | real | `platform-export-rendering.test.ts`, `pipeline-cross-platform.test.ts`, full export suite |
| `inkforge/src/services/export/platform-rules/wechat.ts` | WeChat CJK spacing, max-width clamp, dark-mode metadata | real | `platform-rules/wechat.test.ts` |
| `inkforge/src/services/export/quality-detector.ts` | Platform quality detection including WeChat image/formula/CSS risks | real | `platform-export-rendering.test.ts`, `pipeline-cross-platform.test.ts` |
| `inkforge/src/services/export/xiaohongshu-text.ts` | Xiaohongshu native plain-text output | real | `xhs.test.ts`, `citation-export.test.ts`, `platform-export-rendering.test.ts`, `pipeline-cross-platform.test.ts` |
| `inkforge/src/services/export/platform-rules/xiaohongshu.ts` | XHS title/body split, paragraph tightening, hashtags, image hints | real | `platform-rules/xiaohongshu.test.ts` |
| `inkforge/src/services/export/zhihu-markdown.ts` | Zhihu Markdown-compatible native output | real | `zhihu.test.ts`, `platform-export-rendering.test.ts`, `pipeline-cross-platform.test.ts` |
| `inkforge/src/services/export/platform-rules/zhihu.ts` | Zhihu equation placeholders, table handling, code language coercion | real | `platform-rules/zhihu.test.ts`, `zhihu.test.ts` |
| `inkforge/src/services/export/xiaohongshu.ts` | XHS themed HTML renderer | preview-only | Source comment says real publish should use `markdownToXiaohongshuText`; native tests use text engine |
| `inkforge/src/services/export/zhihu.ts` | Zhihu themed HTML renderer | preview-only | Native tests use `markdownToZhihuClean`; HTML preview is not counted as native publishability |
| `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts` | XHS preview simulator | preview-only | File name and tests classify it as fidelity preview |
| `inkforge/src/services/export/preview-fidelity/zhihu-mock.ts` | Zhihu preview simulator | preview-only | File name and tests classify it as fidelity preview |
| `inkforge/src/services/export/image-pipeline/asset-resolver.ts` | Local asset resolution | real | `image-pipeline.test.ts` |
| `inkforge/src/services/export/image-pipeline/dimension-extractor.ts` | Data URL image dimension extraction | real | `image-pipeline.test.ts` |
| `inkforge/src/services/export/image-pipeline/uploaders/wechat-stub.ts` | WeChat material upload | stub | Throws `NotImplementedError`; tested in `image-pipeline.test.ts` |
| `inkforge/src/services/export/image-pipeline/uploaders/xhs-stub.ts` | Xiaohongshu image upload | stub | Throws `NotImplementedError`; tested in `image-pipeline.test.ts` |
| `inkforge/src/services/export/image-pipeline/uploaders/zhihu-stub.ts` | Zhihu image upload | stub | Throws `NotImplementedError`; tested in `image-pipeline.test.ts` |

## Prompt-To-Artifact Checklist

| Explicit requirement | Evidence inspected | Status |
|---|---|---:|
| `$trellis-brainstorm` and `$trellis-continue` should be executed as real workflow, not described | Created `.trellis/tasks/05-12-export-platform-rendering-real-capability-audit`, seeded `prd.md`, added research, then ran `task.py start`; `get_context.py` now points to this task | done |
| Continue without repeating already done export fixes | Read archived `.trellis/tasks/archive/2026-05/02-26-enhance-export-rendering/real-capability-audit.md`; current code already contains WeChat formula degradation, image clamp, explicit uploader stubs | done |
| Frontend content must remain unchanged | No edits under `inkforge/src/components/**`, `inkforge/src/views/**`, `inkforge/src/styles/**`, `inkforge/src/App.vue`; existing frontend dirty paths remain outside this task | done |
| Backend/functionality audit must be full and critical | Capability table classifies real, preview-only, stub, and unsupported upload boundaries across all three platforms | done |
| WeChat rules must be real and best-practice based | `research/wechat-rendering-rules-2026.md`; code evidence in `wechat.ts`; tests assert no `katex`, no `class=`, no `<style>`, image clamp | done |
| Xiaohongshu rules must be real and best-practice based | `research/xiaohongshu-rendering-rules-2026.md`; code evidence in `xiaohongshu-text.ts`; tests assert no raw HTML/Markdown leakage and title/tag/image behavior | done |
| Zhihu rules must be real and best-practice based | `research/zhihu-rendering-rules-2026.md`; code evidence in `zhihu-markdown.ts`; tests assert equation placeholders, code language coercion, table handling | done |
| No mock/fake success may count as real implementation | Preview fidelity files classified as preview-only; three uploader stubs throw `NotImplementedError`; `WechatUploader` context shows only index/test imports | done |
| Real verification must be run | Export suite, scoped lint, full lint, typecheck, git diff check, GitNexus status/impact commands recorded below | done |
| Any remaining uncertainty must be identified | Live upload/publish to the three platforms remains intentionally unsupported without credentials/API contracts | done |

## Verification Commands

### Service Tests

Command:

```bash
pnpm -C inkforge exec vitest run src/services/export --reporter=default
```

Result:

- 12 test files passed.
- 171 tests passed.
- Includes WeChat formula degradation warning from KaTeX in test stderr, but assertions pass.

### Export-Scoped Lint

Command:

```bash
pnpm -C inkforge exec eslint src/services/export --ext .ts --quiet
```

Result: passed, exit code 0.

### Repo-Wide Non-Mutating Lint

Command:

```bash
pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet
```

Result: passed, exit code 0.

### Type Check

Command:

```bash
pnpm -C inkforge exec vue-tsc --noEmit
```

Result: passed, exit code 0.

### Whitespace Check

Command:

```bash
git diff --check
```

Result: only LF-to-CRLF warnings on existing dirty frontend Vue files; no whitespace errors.

### GitNexus

Command:

```bash
npx gitnexus status
```

Result:

- Repository: `D:\Desktop\Inkforge`
- Indexed commit: `9e3c463`
- Current commit: `9e3c463`
- Status: up-to-date

Impact checks:

- `npx gitnexus impact --repo Inkforge --direction upstream postProcessForWechat`: LOW risk; direct caller `convertToWechatWithStats`.
- `npx gitnexus impact --repo Inkforge --direction upstream detectWechatIssues`: LOW risk; direct caller `detectQuality`, then `detectQualityAll`, `quickCheck`, `convertToNativeFormat`.
- `npx gitnexus impact --repo Inkforge --direction upstream markdownToXiaohongshuText`: LOW risk; direct callers `renderPreview` and `convertToNativeFormat`.
- `npx gitnexus impact --repo Inkforge --direction upstream markdownToZhihuClean`: LOW risk; direct callers `renderPreview` and `convertToNativeFormat`.
- `npx gitnexus context --repo Inkforge --file inkforge/src/services/export/image-pipeline/uploaders/wechat-stub.ts WechatUploader`: found class; incoming imports from image-pipeline index/test only; upload method exists and implements `IUploader`.

Attempted change-detection commands:

```bash
npx gitnexus detect_changes --repo Inkforge
npx gitnexus detect-changes --repo Inkforge
```

Result: installed CLI reports `unknown command`; fallback evidence is status, impact checks, `git diff --name-only`, scoped tests, lint, and typecheck.

## Completion Judgment

The current export service implementation satisfies the objective's backend/service-layer requirements for deterministic local output:

- WeChat native output is real pasteable HTML and is test-covered for platform stripping, formula downgrade, width clamp, and unsafe feature removal.
- Xiaohongshu native output is real plain text and is test-covered for Markdown/HTML degradation, title/body/tag/image behavior, and preview/native fidelity separation.
- Zhihu native output is real Markdown-compatible output and is test-covered for formulas, code fences, tables, and unsupported block behavior.
- Live uploading/publishing to WeChat/Xiaohongshu/Zhihu remains out of scope and honestly unsupported; this is the correct real-capability classification, not a missing fake implementation.

No service-layer code changes were required in this pass because the previous archived export work is already present in the current worktree and all current verification commands pass.

## Spec Update Judgment

Loaded `.agents/skills/trellis-update-spec/SKILL.md` and reviewed whether new reusable implementation contracts were learned.

- No `.trellis/spec/**` update is required in this pass.
- Reason: `.trellis/spec/backend/quality-guidelines.md` already captures the relevant executable contracts: classify export capabilities, do not count preview/stub behavior as real capability, make unsupported integrations throw, keep WeChat output self-contained, keep Xiaohongshu plain text, keep Zhihu Markdown-compatible, and run focused export tests/non-mutating lint.
- The new information in this pass is task-specific evidence and refreshed external research, so it belongs in this task's `research/` and `real-capability-audit.md`, not in the reusable code-spec layer.
