# Implementation Plan — SVG R5 Element Library Slice

## Current Status

Task status: `in_progress`.

This task originally operated as a research-first brainstorm and had a PRD plus research
artifacts but no `design.md` / `implement.md`. This file records the current R5 slice so it
can be verified and committed without redefining the larger task.

## Implemented Slice

- [x] Add optional SMIL `id` support to primitives used by chained animation.
- [x] Soften `wechat-safe` detail text for id-referenced and foreignObject rules without
      weakening the actual safety rules.
- [x] Add `i-stretch` click-reveal interactive SVG module.
- [x] Upgrade `i-sequence` toward chained SMIL begin semantics.
- [x] Add minimal motion to divider central motif when `allowMotion` is true.
- [x] Add R5 marker parser and marker HTML block decorators:
  - `[横幅]`
  - `[对比]`
  - `[时间线]`
  - `[相册]`
  - `[出处]`
  - `[折叠]`
- [x] Wire marker decorators into flagship WeChat preset decorator chains in `themes.ts`.
- [x] Update SVG module tests for primitives, interactive modules, dividers, registry,
      and HTML block marker behavior.
- [x] Update `prompts/0601/evidence/wechat-paste/flagship-*.html` artifacts.

## Validation Plan

Focused graph checks:

```bash
npx gitnexus impact renderStretch -r InkForge --depth 3
npx gitnexus impact smilAnimate -r InkForge --depth 3
npx gitnexus impact decorateFlagshipBanner -r InkForge --depth 3
npx gitnexus impact decorateFlagshipStretch -r InkForge --depth 3
```

Focused tests:

```bash
pnpm -C inkforge exec vitest run src/services/export/svg-modules --reporter=default
pnpm -C inkforge exec vitest run src/services/export/svg-modules src/services/export/__tests__/emit-flagship-artifacts.test.ts --reporter=default
```

Broad export checks:

```bash
pnpm -C inkforge exec vitest run src/services/export --reporter=default
pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
```

Final graph/diff:

```bash
npx gitnexus detect-changes -r InkForge --scope all
git diff --check HEAD -- <task paths>
git status --short --branch
```

## Verification Log

- [x] `npx gitnexus impact renderStretch -r InkForge --depth 3`: LOW, 0 affected processes.
- [x] `npx gitnexus impact smilAnimate -r InkForge --depth 3`: MEDIUM, 0 affected processes.
- [x] `npx gitnexus impact decorateFlagshipBanner -r InkForge --depth 3`: LOW, 0 affected processes.
- [x] `npx gitnexus impact decorateFlagshipStretch -r InkForge --depth 3`: LOW, 0 affected processes.
- [x] `pnpm -C inkforge exec vitest run src/services/export/svg-modules --reporter=default`:
      14 files passed, 381 tests passed.
- [x] `pnpm -C inkforge exec vitest run src/services/export/svg-modules src/services/export/__tests__/emit-flagship-artifacts.test.ts --reporter=default`:
      15 files passed, 382 tests passed.
- [x] `pnpm -C inkforge exec vitest run src/services/export --reporter=default`:
      35 files passed, 954 tests passed.
- [x] `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet`: passed.
- [x] `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
- [x] `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in 35.81s.
- [x] `inkforge/tsconfig.tsbuildinfo` restored after typecheck/build dirtied the generated cache.
- [x] `npx gitnexus detect-changes -r InkForge --scope all`: low risk, 0 affected processes.
      The report includes unrelated existing dirty files, so the staged review must remain path-specific.
- [x] `git diff --check HEAD -- <R5 paths>`: passed.
- [x] `rg "flagship-(banner|compare|timeline|gallery|citation)|data-ink-svg=\"i-stretch\""` on
      the three `prompts/0601/evidence/wechat-paste/flagship-*.html` files confirmed the
      generated artifacts contain the new R5 blocks and `i-stretch`.
- [x] Untracked PNG files under `prompts/0601/evidence/wechat-paste/` were intentionally left
      unstaged because `wechat-preview-scan-qr.png` may contain QR/platform preview evidence
      that should not be committed without a separate sensitive-artifact review.
- [x] 2026-06-08 Playwright local artifact probe:
  - Opened `flagship-tempera.html` at desktop `1440x960`; `#nice` existed, text length
    1202, 23 `data-ink-block` elements, 3 `data-ink-svg` sections, 35 inline SVGs,
    and zero `<style>`, class attributes, forbidden SVG constructs, or fixed outer
    SVG widths.
  - Resized to mobile `390x844`; `document.body.scrollWidth=390`,
    `document.documentElement.scrollWidth=390`, `#nice` width 366px, left/right margin
    12px, paragraph font size 17px, and line-height 31.45px.
  - Opened `flagship-kiln.html` and `flagship-amber.html` at `390x844`; both reported
    `scrollWidth=390`, `#nice` width 366px, 23 blocks, 3 SVG sections, 35 inline SVGs,
    and zero `<style>` / class / forbidden SVG / fixed outer SVG width findings.
  - Saved local, non-sensitive screenshots:
    `prompts/0601/evidence/local-verification/inkforge-0601-tempera-desktop-local-2026-06-08-2026-06-07T22-11-42-058Z.png`,
    `prompts/0601/evidence/local-verification/inkforge-0601-tempera-mobile-local-2026-06-08-2026-06-07T22-12-49-640Z.png`,
    `prompts/0601/evidence/local-verification/inkforge-0601-kiln-mobile-local-2026-06-08-2026-06-07T22-13-44-111Z.png`,
    `prompts/0601/evidence/local-verification/inkforge-0601-amber-mobile-local-2026-06-08-2026-06-07T22-14-36-924Z.png`.
- [x] 2026-06-08 `pnpm -C inkforge test:e2e`:
  - `onPrepare` ran a real `cargo build --manifest-path=../../src-tauri/Cargo.toml`.
  - WebView2 `148.0.3967.96` was driven through the real Tauri/WebView2 binary via
    `tauri-driver.exe` and `msedgedriver.exe`.
  - `svg-render.spec.cjs`: 5 tests passed, including seeded real draft setup, all
    three flagship presets injecting responsive `[data-ink-svg]` modules into the
    export preview, and the flagship body keeping a mobile-comfortable 20-22 CJK
    chars/line rhythm.
  - `visual.spec.cjs`: 11 tests passed for chrome, brand mark, tokens, and theme
    cascade.
  - Total: 2 spec files passed, 16 tests passed.
- [x] 2026-06-08 market editor learning refresh:
  - 135 logged-in browser review covered editor categories (`导入`, `插入`, `主题色`,
    `全文黑白`, `吸色`, `标题`, `正文`, `图文`, `引导`, `布局`, `节日`, `行业`, `小元素`,
    `SVG`) plus SVG-center taxonomy (`点击展开`, `点击显示`, `点击切换`, `点击缩放`,
    `点击翻转`, `点击弹出`, `点击放大`, `点击消失`, `点击播放`, `点击抽签`, `滑动展示`,
    `图片轮播`, `长按显示`, `渐显展示`, `文字弹幕`, `区域触发`, `趣味游戏`, `互动答题`,
    `文字特效`, `引导关注`).
  - Xiumi logged-in browser review covered import/sync/plugin/long-image/PDF/video
    workflow plus `动作`, `动作列表`, `提取动作`, `点击动作`, `背景图`, `图层`, `定位`,
    `间距`, `字号`, `组件定位`, `页面对齐`, `多选对齐`, `SVG图集` and trigger/effect
    families (`点击`, `单步点击`, `自动`, `长按`; `抽签`, `滚动切换`, `宫格式切换`,
    `转动`, `翻转`, `序列帧`).
  - No account page screenshot or QR/platform-preview artifact was committed from the
    authenticated 135/Xiumi sessions.
- [x] 2026-06-08 external source refresh:
  - Exa confirmed the WeChat-compatible path remains inline style, `text/html`
    clipboard/API payloads, strict no-script/no-event constraints, and public WeChat
    draft/material image-host requirements.
  - Exa confirmed 2026 market references for Xiaohongshu/Rednote still center on
    3:4 vertical image pages and include up to 18 images per photo note in multiple
    market guides; InkForge records this as configurable/checkable, not a hardcoded
    eternal limit.
  - Exa confirmed Zhihu authoring tools still revolve around clean Markdown, LaTeX,
    Markdown tables, image upload/host rewriting, and Mermaid/diagram rasterization.
  - Grok Search returned only one weak Markdown-tool source for the combined query,
    so it was treated as supplementary and not used to loosen any rule.
  - mdDocs/doocs.md search reinforced Markdown-to-WeChat editor workflow, image-bed,
    theme, and clipboard references.
- [x] 2026-06-08 sub-agent doc review:
  - Spawned 4 lightweight review agents from
    `research/market-rule-agent-input.csv`; all 4 reported through
    `research/market-rule-agent-output.csv`.
  - Agent findings drove the new `editor-workflow-system`, `layout-and-layer-system`,
    artifact-state lifecycle, XHS image-count consistency, and Zhihu image-host/
    diagram-fence/alt-caption clauses.
- [x] 2026-06-08 docs/spec update:
  - Updated `docs/platform-rendering-rules/market-practices-catalog.md`,
    `docs/platform-rendering-rules/wechat-rules.md`,
    `docs/platform-rendering-rules/xiaohongshu-rules.md`,
    `docs/platform-rendering-rules/zhihu-rules.md`, `docs/微信渲染规则.md`,
    `.trellis/spec/frontend/wechat-svg-modules.md`, and
    `.trellis/spec/frontend/flagship-element-catalog.md`.
  - Key rule additions: 135/Xiumi taxonomy as reference only; no proprietary template/
    asset copying; proof hierarchy; plugin/sync/copy/publish states are separate;
    WeChat SVG interaction support levels; XHS manifest/count/reference consistency;
    Zhihu public HTTPS/platform-host image dependency and raw diagram fence handling.
- [x] 2026-06-08 quality-detector rule enforcement slice:
  - Implemented Xiaohongshu image-count/reference checks in
    `inkforge/src/services/export/quality-detector.ts`:
    `xhs-image-count-review` and `xhs-image-reference-mismatch`.
  - Implemented Zhihu image-host/alt/diagram checks:
    `zhihu-image-host-blocked`, `zhihu-image-alt-missing`, and
    `zhihu-raw-diagram-fence`.
  - Expanded special renderer code-fence handling from Mermaid-only to
    Mermaid, Graphviz/DOT, PlantUML/PUML, and Vega/Vega-Lite so diagram
    fences do not also trigger the generic unsupported-code-language warning.
  - Added regression coverage in
    `inkforge/src/services/export/platform-export-rendering.test.ts`.
- [x] 2026-06-08 quality-detector graph checks:
  - `npx gitnexus impact detectZhihuIssues -r InkForge --depth 3`:
    LOW, 5 impacted symbols, 1 direct dependent, 0 affected processes.
  - `npx gitnexus impact detectXiaohongshuIssues -r InkForge --depth 3`:
    LOW, 5 impacted symbols, 1 direct dependent, 0 affected processes.
  - `npx gitnexus impact detectRenderingCoreIssues -r InkForge --depth 3`:
    LOW, 5 impacted symbols, 1 direct dependent, 0 affected processes.
  - `npx gitnexus impact detectQuality -r InkForge --depth 2`:
    LOW, 4 directly impacted symbols, 0 affected processes.
  - GitNexus MCP `detect_changes` returned `fetch failed` in this session;
    local GitNexus CLI was used as the verification fallback.
- [x] 2026-06-08 quality-detector verification:
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
    1 file passed, 25 tests passed.
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
    4 files passed, 64 tests passed.
  - `pnpm -C inkforge exec vitest run src/services/export --reporter=default`:
    latest rerun passed, 35 files, 957 tests.
  - `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet`:
    passed.
  - `pnpm -C inkforge exec eslint src/services/export/quality-detector.ts src/services/export/platform-export-rendering.test.ts --quiet`:
    passed.
  - `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
  - `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed,
    latest rerun built in 30.91s.
  - `inkforge/tsconfig.tsbuildinfo` was restored after the typecheck/build
    generated-cache update and is intentionally not part of this commit.
- [x] 2026-06-08 AC6 browser-canvas raster verification:
  - Ran a real Vite + Playwright Chromium probe against the project module
    `/src/services/export/svg-modules/index.ts`.
  - The first browser attempt exposed a real bug: `renderXhsPosterCard()` passed
    the module's `<section data-ink-svg>...<svg>...</svg></section>` wrapper into
    `data:image/svg+xml`, causing `Image.onerror` and `rasterizeSvg: failed to load SVG image`.
  - Fixed `buildSvgDataUri()` to extract the first `<svg>...</svg>` document from
    wrapper HTML before injecting raster dimensions; bare SVG and raw shape fragments
    remain supported.
  - Added `raster.test.ts` coverage for `data-ink-svg` section input:
    `pnpm -C inkforge exec vitest run src/services/export/svg-modules/__tests__/raster.test.ts --reporter=default`
    passed, 1 file, 9 tests.
  - Reran the browser probe successfully. Result:
    `renderXhsPosterCard(cover-grid, "3:4")` produced `data:image/png;base64,`,
    natural size 1080x1440, byte length 99114, SHA-256
    `1132933ecec1828c0129e8e92ec2553b4c54264ecda70ad228f15e7c62db101d`.
  - Saved non-sensitive evidence under `prompts/0601/evidence/xhs-raster/` and
    synchronized `prompts/0601/COMPLETION-REPORT.md` plus evidence README files
    so AC6 no longer relies only on Node guard tests.
- [x] 2026-06-08 follow-up platform-gate and market-learning pass:
  - Rechecked `https://mp.weixin.qq.com/` through Playwright. The active page was the
    WeChat Public Platform login/QR-login entry, not an authenticated article editor, so
    no `flagship-amber` PC paste evidence was collected or claimed.
  - Rechecked 135 with a real browser:
    `beautify_editor.html` exposed style/template/SVG editor/AI layout/one-click layout,
    import/insert/theme/full-black-white/color-pick/title/body/image-text/guide/layout/
    festival/industry/small-element/SVG filters, and copy/save/sync/preview workflow
    actions; `svg-center.html` exposed click, slide, carousel, long-press, region-trigger,
    quiz/game, text-effect, and mobile-only SVG trigger labels.
  - Rechecked Xiumi with a real browser:
    public homepage separated paper/H5/design artifact families; `studio/v5` paper editor
    exposed open/preview/save/export/more, enhanced media mode, base typography settings,
    material/library tabs, team material, audio/video, theme/title/card/image/layout/SVG/
    component groups.
  - Fetched the 135 SVG export tutorial with Exa from a known URL. It supports the rule that
    `copy-to-editor` and `copy-to-wechat` are separate platform-specific states; it does not
    prove final mobile rendering.
  - Grok Search was retained as weak conflict evidence only. Its unsupported "official 2026"
    guide and percentage claims were rejected because sources did not substantiate them.
  - Spawned 2 lightweight documentation QA agents from
    `research/market-rule-followup-agent-input.csv`; the platform-gate reviewer reported
    actionable findings through `research/market-rule-followup-agent-output.csv`. The
    source-trust reviewer returned no usable structured findings, so it was not used as
    substantive evidence. The actionable finding was to separate AC5 automated SMIL/static-
    fallback proof from still-open mobile WeChat SMIL/Dark Mode gates.
  - Updated `prompts/0601/COMPLETION-REPORT.md`, `prompts/0601/evidence/README.md`,
    `prompts/0601/evidence/wechat-paste/README.md`,
    `prompts/0601/evidence/market-source-refresh-20260608.txt`,
    `docs/platform-rendering-rules/market-practices-catalog.md`,
    `docs/platform-rendering-rules/wechat-rules.md`, `docs/微信渲染规则.md`, and
    `.trellis/spec/frontend/wechat-svg-modules.md` so PC paste, mobile trigger, Dark Mode,
    cover-thumbnail, sync, and publish proof remain distinct.
- [x] 2026-06-08 focused verification refresh after platform gate follow-up:
  - Rechecked `https://mp.weixin.qq.com/` through Playwright. The active page remained the
    WeChat Public Platform login/QR-login entry, so no `flagship-amber` PC paste or mobile
    preview evidence could be collected in this pass.
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
    passed: 4 files, 64 tests. Log:
    `prompts/0601/evidence/focused-export-refresh-20260608.txt`.
  - `pnpm -C inkforge exec vitest run src/services/export/svg-modules src/services/export/__tests__/emit-flagship-artifacts.test.ts --reporter=default`
    passed: 15 files, 383 tests. Log:
    `prompts/0601/evidence/svg-modules-refresh-20260608.txt`.
  - Added `prompts/0601/evidence/platform-gate-matrix-20260608.md` to map machine gates,
    PC paste gates, and still-missing WeChat mobile / Dark Mode / SMIL / cover-thumbnail
    evidence without claiming completion.
- [x] 2026-06-08 overnight market-rule hardening pass:
  - Rechecked WeChat through Playwright DOM extraction. `https://mp.weixin.qq.com/` still
    reported the login / QR-login entry and title `微信公众平台`, so no authenticated article
    editor, `flagship-amber` paste, mobile preview, Dark Mode, SMIL, or cover-thumbnail gate
    was claimed.
  - Rechecked 135 `beautify_editor.html` through a real browser. Current editor taxonomy now
    includes toolbar-level parameters such as default font, clear format, format brush, font
    size, bold/italic/underline/delete line, text/background color, alignment, first-line
    indent, paragraph spacing, line/letter spacing, side padding, image upload, quote,
    auto-typeset, vertical writing, search/replace, link, Word-image upload, AI polish/generate,
    full-screen, text shadow, text border, Dark Mode switch, paragraph lineHeight/fontSize/
    textIndent/padding, plus credentialed states such as authorized account, scheduled send,
    watermark, full-text format, and team management.
  - Rechecked Xiumi `studio/v5#/paper/for/new/cube/0` through a real browser. Current editor
    taxonomy includes sync-to-official-account, sync-to-Weibo draft, plugin copy, copy/paste
    fallback, Word/Excel/Markdown import, official-account article import, long-image/PDF/video
    export, one-click layout, Markdown anchor mapping, action list/extracted actions, background
    image height risk, z-order/layers, component positioning, copy-to-WeChat, WeChat preview
    authentication, and comment-permission gates.
  - Fetched WeChat official subscription plugin docs with Exa. They confirm official hard
    blockers for transparent images hidden under SVG backgrounds, `line-height:0`, fixed
    width/height content containers, `text-align:start/end`, ordinary prose inside `<pre>`,
    touchstart-only SVG `begin`, Dark Mode SVG contrast, article-structure verification, and
    cover-setting JSAPI boundaries.
  - Spawned 3 lightweight documentation QA agents from
    `research/market-rule-overnight-agent-input.csv`; all 3 completed and wrote
    `research/market-rule-overnight-agent-output.csv`. Actionable findings were merged into
    `.trellis/spec/frontend/wechat-svg-modules.md`, `docs/platform-rendering-rules/market-practices-catalog.md`,
    `docs/platform-rendering-rules/wechat-rules.md`, `docs/platform-rendering-rules/xiaohongshu-rules.md`,
    `docs/platform-rendering-rules/zhihu-rules.md`, and `docs/微信渲染规则.md`.
  - Key additions: official WeChat hard blockers in spec error/test matrix; `currentColor`
    Dark Mode conditions; PC paste evidence boundary on older real-WeChat paragraphs; XHS
    configurable ratio/dimensions/format/max-bytes/page-count checks and weak-source rejection;
    Zhihu residual HTML, code-language, and complex-table checks; 135/Xiumi toolbar, Markdown
    anchor, permission, z-order, background-size, preview, sync, and cover-thumbnail gates.
- [x] 2026-06-08 quality-gate hardening refresh:
  - Upgraded WeChat official editor hard blockers in
    `inkforge/src/services/export/quality-detector.ts` from warning-only quality hints to
    `error` blockers where the spec marks them platform-rule FATAL:
    `line-height:0`, fixed readable container width/height, `text-align:start/end`,
    ordinary prose in `<pre>`, transparent image plus SVG overlay, and touchstart-only
    SVG animation triggers.
  - Added Xiaohongshu image artifact preflight blockers:
    unsupported image formats (`xhs-image-format-unsupported`) and default page-count-limit
    violation (`xhs-image-page-count-limit`). The detector still records the current
    market value as configurable/checkable and does not claim actual file-byte or publish
    entry validation without a manifest/publishing boundary.
  - Added Zhihu clean-Markdown blockers and warnings:
    residual HTML/CSS/WeChat wrapper dependencies (`zhihu-html-dependency`), complex
    HTML/Markdown table fallbacks (`zhihu-complex-table`), and inferable-but-missing
    code fence language warnings (`render-code-language-inferred`).
  - Added regression coverage in
    `inkforge/src/services/export/platform-export-rendering.test.ts`; focused count is now
    27 tests and the cross-platform focused suite is now 66 tests.
  - Verification:
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
    passed, 1 file / 27 tests.
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
    passed, 4 files / 66 tests.
    `pnpm -C inkforge exec vitest run src/services/export --reporter=default`
    passed, 35 files / 959 tests.
    `pnpm -C inkforge exec eslint src/services/export/quality-detector.ts src/services/export/platform-export-rendering.test.ts --quiet`
    and `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet` passed.
    `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
    `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed, Vite built
    in 36.78s.
  - `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the
    generated cache and is intentionally not part of this slice.
  - Serena activation for `D:/Desktop/Inkforge` failed because no Serena project was
    registered in this session; GitNexus CLI impact checks, focused diffs, ESLint,
    Vitest, typecheck, and build were used as the fallback.
  - Evidence file:
    `prompts/0601/evidence/quality-gate-hardening-20260608.txt`.

## Remaining Checks Before Commit

- [x] Run focused artifact/export tests.
- [x] Run full export suite.
- [x] Run non-mutating ESLint for export service scope.
- [x] Run `vue-tsc`.
- [x] Run production build.
- [x] Restore generated cache files if typecheck/build dirties them.
- [x] Run final GitNexus detect changes and staged diff review.
- [x] Commit only `06-01` R5 files; leave unrelated dirty files untouched.
- [x] Commit the 2026-06-08 local Playwright verification addendum and screenshots only.
- [x] Commit the 2026-06-08 Tauri e2e verification addendum and safe refreshed e2e
      screenshots only; keep QR/platform-preview candidate PNG files untracked until a
      separate sensitive artifact review.
- [x] Commit the 2026-06-08 market-rule documentation/spec refresh and agent CSV files
      only; leave unrelated Trellis/meta/tooling dirty files untouched.
- [x] Commit the 2026-06-08 quality-detector rule enforcement slice only; leave
      unrelated dirty files and sensitive QR/platform-preview candidate PNG files untouched.
- [x] Commit the 2026-06-08 AC6 browser-canvas raster fix and evidence only; leave
      unrelated dirty files and QR/platform-preview candidates untouched.
- [x] Commit the 2026-06-08 follow-up market-learning and platform-gate documentation only;
      leave unrelated dirty files and QR/platform-preview candidates untouched.
- [x] Commit the 2026-06-08 focused verification logs and platform gate matrix only; leave
      unrelated dirty files and QR/platform-preview candidates untouched.
- [x] Commit the 2026-06-08 overnight market-rule hardening docs/spec and agent CSV files only;
      leave unrelated dirty files and QR/platform-preview candidates untouched.
- [ ] Commit the 2026-06-08 quality-gate hardening refresh only; leave unrelated dirty files
      and QR/platform-preview candidates untouched.

## Honest Non-Goals For This Slice

- This slice does not claim full completion of every historical 06-01 acceptance criterion.
  In particular, fresh live WeChat mobile animation proof requires a separate real paste/mobile
  evidence refresh when platform access is available.
- This slice does not change Xiaohongshu/Zhihu publishable body contracts.
- This slice does not archive the broader 06-01 task unless all acceptance criteria are later
  proven current-state complete.
