# Real Capability Audit: Export Platform Rendering

Date: 2026-05-12
Task: `.trellis/tasks/05-12-export-platform-rendering-real-capability-audit`
Scope rule: preserve frontend content and visual Vue files.

## Current Closeout Addendum - 2026-06-08

This addendum supersedes the historical capability table below where later
work changed the repository state. The older 2026-05-12 audit remains preserved
as evidence of the original backend/service-only scope, but it is no longer the
authoritative current-state classification for WeChat upload or platform quality
rules.

### Official Documentation Recheck

Official WeChat documentation was rechecked on 2026-06-08 through `grok-search`
direct page fetches:

- `draft_add`: `https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html`
- `uploadImage`: `https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_uploadimage.html`
- `addMaterial`: `https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_addmaterial.html`

Current executable constraints confirmed from those pages:

- `draft_add` must be called server-side, accepts HTML in `content`, strips JS,
  filters external image URLs, requires article body images to come from the
  "upload article content image" API, and limits `title` to 32 characters,
  `author` to 16 characters, `digest` to 128 characters,
  `content_source_url` to 1 KB, and `content` to fewer than 20,000 characters
  and less than 1 MB. The page also still contains the known inconsistent
  "2kb" wording for `content`; InkForge keeps the stricter locally testable
  20,000-character and 1 MB boundary and treats the wording conflict as a
  live-account confirmation item.
- `uploadImage` for article-body images supports JPG/PNG only and requires the
  image to be under 1 MB. It does not count against the permanent material
  quota.
- `addMaterial` for permanent image material supports bmp/png/jpeg/jpg/gif up
  to 10 MB, returns `media_id`, and counts against the official account material
  library quota.

The current backend spec already records these contracts in
`.trellis/spec/backend/quality-guidelines.md`, including server-side/Tauri
credential boundaries, preflight-before-mutation ordering, byte-signature image
validation, snake_case WeChat payload serialization, and explicit unsupported
states.

### Current Capability Classification

| Path | Capability | Current status | Evidence |
|---|---|---:|---|
| `inkforge/src/services/export/wechat.ts` | WeChat pasteable HTML output, inline style post-processing, self-contained formula/text degradation, WeChat-safe decoration policy | real | `platform-export-rendering.test.ts`, full `src/services/export` suite, 06-08 browser desktop/mobile smoke |
| `inkforge/src/services/export/platform-rules/wechat.ts` | WeChat spacing, width, dark-mode and official-editor compatibility transforms | real | `platform-rules/wechat.test.ts`, 06-08 quality detector regressions |
| `inkforge/src/services/export/quality-detector.ts` | Platform quality detection, including WeChat official-editor risks, XHS decoration leakage, Zhihu decoration/SVG leakage | real | 06-08 additions for `wechat-line-height-zero`, `wechat-fixed-container-size`, `wechat-text-align-logical`, `wechat-pre-ordinary-text`, `wechat-transparent-image-svg-overlay`, `wechat-svg-touchstart-only`, `wechat-important-style`, `xhs-wechat-decoration-leak`, `zhihu-wechat-decoration-leak`, and `zhihu-inline-svg` |
| `inkforge/src/services/export/wechat-publish.ts` | WeChat Tauri publish bridge service: status probe, article image upload, cover material upload, image rewrite, draft creation, draft publish orchestration | real with credential-bound live boundary | Service validates missing Tauri runtime/credentials as unavailable, splits article vs cover image contracts, runs local preflight before mutation, and delegates live calls to Tauri commands. No live API success is claimed without credentials. |
| `inkforge/src/services/export/image-pipeline/uploaders/wechat.ts` | WeChat image uploader implementation | real delegate, not stub | `WechatUploader.upload()` delegates to `uploadWechatArticleImage()`. The old `wechat-stub.ts` classification is stale. |
| `inkforge/src/services/export/image-pipeline/uploaders/xhs-stub.ts` | Xiaohongshu image upload | stub | Throws `NotImplementedError`; no platform upload success is claimed. |
| `inkforge/src/services/export/image-pipeline/uploaders/zhihu-stub.ts` | Zhihu image upload | stub | Throws `NotImplementedError`; no platform upload success is claimed. |
| `inkforge/src/services/export/xiaohongshu-text.ts` | Xiaohongshu native plain-text output | real | `xhs.test.ts`, `citation-export.test.ts`, `pipeline-cross-platform.test.ts`, `platform-export-rendering.test.ts`; output contract forbids raw HTML/Markdown/SVG leakage. |
| `inkforge/src/services/export/xiaohongshu.ts` | Xiaohongshu themed HTML preview | preview-only | Source comments and preview-fidelity tests classify native output as `markdownToXiaohongshuText`, not HTML. |
| `inkforge/src/services/export/zhihu-markdown.ts` | Zhihu Markdown-compatible native output | real | `zhihu.test.ts`, `pipeline-cross-platform.test.ts`, `platform-export-rendering.test.ts`; formulas, code fences, tables, and unsupported blocks have deterministic handling. |
| `inkforge/src/services/export/zhihu.ts` | Zhihu themed HTML preview | preview-only | Native publishing evidence comes from `markdownToZhihuClean`, not HTML preview. |
| `docs/platform-rendering-rules/*` | Cross-platform market-practice rendering contracts | documentation source-of-truth | 06-08 task archived after docs/spec/test/browser verification; docs explicitly prevent copying 135/Xiumi private templates and forbid fake platform publishing. |

### Acceptance Criteria Re-evaluation

| Acceptance criterion | Current judgment | Evidence |
|---|---:|---|
| WeChat research exists with source links and repo implications | done | `research/wechat-rendering-rules-2026.md`, current docs under `docs/platform-rendering-rules/`, and 2026-06-08 official doc recheck above |
| Xiaohongshu research exists with repo implications | done | `research/xiaohongshu-rendering-rules-2026.md`, `docs/platform-rendering-rules/xiaohongshu-rules.md` |
| Zhihu research exists with repo implications | done | `research/zhihu-rendering-rules-2026.md`, `docs/platform-rendering-rules/zhihu-rules.md` |
| Service capability audit distinguishes real/partial/preview-only/stub/stale | done | This addendum updates the stale WeChat uploader classification while preserving unsupported XHS/Zhihu upload stubs |
| WeChat native output avoids `<style>`, class selectors, `katex-html`, JS URLs, CSS variables, and unsupported CSS dependencies | done locally | Covered by export suite and 06-08 platform rendering regressions; real WeChat editor paste/backend final preview remains a separate credential/account validation item |
| Xiaohongshu native output is plain text without raw HTML/Markdown leakage | done locally | Native engine and tests classify rich visual output as image/long-image fallback, not body rich text |
| Zhihu native output is Markdown-compatible | done locally | Native engine preserves clean Markdown and rejects WeChat decoration/SVG leakage |
| WeChat upload integration does not claim success without real credentials/API contracts | done | Web runtime and missing credentials return unavailable/blocked; live calls require Tauri/server-side boundary |
| Image width and formula downgrade behavior are enforced by output tests | done | Existing export suite plus 06-08 expanded regressions |
| Non-mutating service-layer tests, lint, typecheck, GitNexus evidence are recorded | done after current rerun | See the 2026-06-08 verification section below |
| Existing unrelated frontend visual dirty files are preserved | done | No Hub/Workstation visual files are used as this task's service-layer completion evidence |

### Verification Rerun - 2026-06-08

These checks were re-run after this addendum to validate the current repository
state rather than the 2026-05-12 snapshot. Results:

```bash
pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default
# passed: 1 file, 23 tests
pnpm -C inkforge exec vitest run src/services/export --reporter=default
# passed: 35 files, 954 tests
pnpm -C inkforge exec eslint src/services/export --ext .ts --quiet
# passed
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
# passed
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
# passed, Vite built in 33.16s
npx gitnexus impact detectQuality -r InkForge --depth 3
# LOW risk, 4 direct upstream dependents, 0 affected processes
npx gitnexus detect-changes -r InkForge --scope all
# low risk, 30 changed files / 6 symbols / 0 affected processes;
# this includes pre-existing unrelated Trellis/Claude/AGENTS dirty files
```

The 06-08 multi-platform closeout had already passed the same export gates plus
a 10-loop focused regression pass and desktop/mobile browser smoke. This task
uses those results as cross-task evidence only for the rendering-rule changes
that directly superseded the stale 05-12 audit; it does not count unrelated
frontend visual edits as backend/service completion.

### Honest Remaining Boundaries

- WeChat real draft creation, image upload, cover material upload, and backend
  preview cannot be marked passed without valid `WECHAT_APP_ID`,
  `WECHAT_APP_SECRET`, account permissions, and a successful Tauri/server-side
  live API run.
- Xiaohongshu and Zhihu direct upload/publish remain unsupported in this service
  layer. Their native export artifacts are real, but platform publishing is
  `stub` / `unavailable`.
- The 05-12 task can close as a service-layer real capability audit once the
  verification commands above pass in the current worktree. It must not be used
  to claim full live platform publishing.

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
