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
- [x] 2026-06-09 CloakBrowser WeChat authenticated editor readback refresh:
  - Used CloakBrowser only with the required `inkforge-0601` profile.
  - Reached the authenticated WeChat Official Account PC article editor and visually confirmed
    the editor page.
  - Read top-level `.ProseMirror` title/body DOM. The body editor was `586x598` and contained an
    existing platform audio card plus a trailing blank section, so this draft was not treated as
    disposable and no paste/save/preview/publish action was executed.
  - Added runtime evidence labels `authenticated-editor-reachable` and `pc-editor-dom-readable`.
    They rank below `unit-tested`; focused tests prove they do not make a WeChat style usable.
  - Evidence file:
    `prompts/0601/evidence/wechat-editor-authenticated-readable-20260609.txt`.
- [x] 2026-06-08 XHS markdown-gate refresh:
  - Rechecked `https://mp.weixin.qq.com/` through Playwright. The active page still
    reported the login / QR-login entry, title `微信公众平台`, `hasEditorApi=false`,
    `contenteditable=0`, `ProseMirror=0`, `svg=0`, `textarea=0`, and `input=5`.
    No `flagship-amber` paste, mobile preview, SMIL/click, Dark Mode, cover-thumbnail,
    sync, scheduled-send, or publish evidence was claimed.
  - Implemented `xhs-markdown-control-leak` in
    `inkforge/src/services/export/quality-detector.ts` so raw Markdown controls that
    Xiaohongshu body text cannot carry are `error` blockers: ATX headings, bold/italic
    markers, raw image syntax, blockquote markers, Markdown table separators, and
    fenced-code markers. Hashtag-only Xiaohongshu topic text remains allowed.
  - Updated regression coverage in
    `inkforge/src/services/export/platform-export-rendering.test.ts` and the
    cross-platform Xiaohongshu boundary test in
    `inkforge/src/services/export/__tests__/pipeline-cross-platform.test.ts`.
  - Impact checks:
    `npx gitnexus impact detectXiaohongshuIssues -r InkForge --depth 3` passed with
    LOW risk, 5 impacted symbols, 1 direct dependent, 0 affected processes.
    `npx gitnexus impact detectQuality -r InkForge --depth 2` passed with LOW risk,
    4 directly impacted symbols, 0 affected processes.
  - Verification:
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
    passed, 1 file / 28 tests.
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
    passed, 4 files / 67 tests.
    `pnpm -C inkforge exec vitest run src/services/export --reporter=default`
    passed, 35 files / 960 tests.
    `pnpm -C inkforge exec eslint src/services/export/quality-detector.ts src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts --quiet`
    and `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet` passed.
    `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
    `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed, Vite built
    in 29.15s.
  - `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied it and is
    intentionally not part of this slice.
  - Evidence file:
    `prompts/0601/evidence/xhs-markdown-gate-refresh-20260608.txt`.
- [x] 2026-06-08 selectable style matrix and WeChat hard-risk gate refresh:
  - Added user-selectable style matrix and evidence label schema to
    `docs/platform-rendering-rules/market-practices-catalog.md`.
  - Added platform-specific choice matrices to
    `docs/platform-rendering-rules/wechat-rules.md`,
    `docs/platform-rendering-rules/xiaohongshu-rules.md`, and
    `docs/platform-rendering-rules/zhihu-rules.md`.
  - Updated `.trellis/spec/frontend/wechat-svg-modules.md` with selectable interaction
    levels, evidence labels, and platform style parity.
  - Updated `.trellis/spec/frontend/flagship-element-catalog.md` with the future UI
    style-selection contract: platform segmented control, style family menu, visual
    strength, motion toggle, evidence badge, fallback selector, and credentialed publish/sync
    command states.
  - Updated `docs/微信渲染规则.md` to clarify the current InkForge reading rhythm contract:
    16-17px, 1.7-1.9 line-height, and 20-22 CJK chars/line as the active mobile target;
    the historical 14-16px / 25-28 chars table remains only historical context.
  - Added WeChat hard-risk detector ids in
    `inkforge/src/services/export/quality-detector.ts`:
    `wechat-event-handler`, `wechat-class-id-dependency`, `wechat-unsupported-css`,
    `wechat-unsafe-svg-construct`, and `wechat-katex-html`.
  - Added regression coverage in
    `inkforge/src/services/export/platform-export-rendering.test.ts`; focused count is now
    29 tests and the cross-platform focused suite is now 68 tests.
  - External source refresh:
    WeChat official plugin spec reinforced opacity-hidden image/SVG, `line-height:0`,
    fixed width/height, `text-align:start/end`, touchstart-only begin, ordinary prose in
    `<pre>`, SVG/Dark Mode, and `!important` risks. 135/Xiumi references reinforced
    copy/editor/plugin/sync/publish as separate artifact states. XHS and Zhihu references
    reinforced configurable image defaults and clean Markdown/image-host contracts.
  - QA agents:
    spawned 2 lightweight rows in
    `research/style-matrix-quality-refresh-agent-input.csv`; the WeChat quality-gate reviewer
    passed, while the docs row returned empty JSON and was not used as evidence. Spawned a
    follow-up docs QA row in `research/style-matrix-doc-agent-input.csv`; it returned a
    concern on the wording `可粘贴/可同步`, which was corrected so sync is conditional on real
    authorization/plugin/API proof.
  - Impact checks:
    `npx gitnexus impact detectWechatIssues -r InkForge --depth 3` passed with LOW risk,
    5 impacted symbols, 1 direct dependent, 0 affected processes.
    `npx gitnexus impact detectQuality -r InkForge --depth 2` passed with LOW risk,
    4 directly impacted symbols, 0 affected processes.
    `npx gitnexus impact detectWechatOfficialEditorSpecIssues -r InkForge --depth 3`
    could not find that unexported helper symbol, so `detectWechatIssues` and `detectQuality`
    were used as effective impact anchors.
  - Verification:
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
    passed, 1 file / 29 tests.
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
    passed, 4 files / 68 tests.
    `pnpm -C inkforge exec vitest run src/services/export --reporter=default`
    passed, 35 files / 961 tests.
    `pnpm -C inkforge exec eslint src/services/export/quality-detector.ts src/services/export/platform-export-rendering.test.ts --quiet`
    and `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet` passed.
    `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
    `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed, Vite built
    in 33.34s.
  - `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated
    cache and is intentionally not part of this slice.
  - Evidence file:
    `prompts/0601/evidence/style-matrix-quality-refresh-20260608.txt`.
  - Honest boundary:
    this slice does not claim fresh WeChat phone preview, SMIL/click trigger proof, Dark Mode
    proof, cover-thumbnail proof, credentialed sync, scheduled-send, or publish success.
- [x] 2026-06-08 completion audit and cross-platform readability/semantic gates refresh:
  - Added `prompts/0601/evidence/completion-audit-20260608.md`, mapping PRD/DoD gates to
    exact evidence levels and keeping WeChat mobile preview, SMIL/click, Dark Mode,
    cover-thumbnail, sync, scheduled-send, publish, and `flagship-amber` PC paste gates
    incomplete/blocked until exact platform evidence exists.
  - Added Xiaohongshu readability warning gates in
    `inkforge/src/services/export/quality-detector.ts`:
    `xhs-hashtag-count`, `xhs-list-length`, and `xhs-long-line`.
  - Added Zhihu semantic quality gates:
    `zhihu-table-separator-invalid` as an error for invalid Markdown table separators, and
    `zhihu-image-caption-missing` as a warning when formula/diagram/table image fallbacks
    lack nearby caption or text explanation.
  - Updated `.trellis/spec/frontend/wechat-svg-modules.md` and
    `docs/platform-rendering-rules/xiaohongshu-rules.md` to record the new quality gates.
    `docs/platform-rendering-rules/zhihu-rules.md` already contained matching checklist
    language for invalid table separators and image alt/caption.
  - External refresh:
    Exa XHS sources reinforced 3:4/18-image/default sizing and hashtag guidance variance
    (`3-5`, `5-8`, or up to `10` depending on source), so hashtag/list/long-line gates are
    warnings, not blockers. Exa Zhihu sources reinforced uploaded/public image assets,
    LaTeX/table/diagram conversion, and table-cell Markdown simplification.
  - QA agents:
    spawned 3 lightweight rows in
    `research/completion-quality-agent-input.csv`; the completion-audit reviewer returned
    `pass` and confirmed the audit separates machine evidence, PC paste, mobile preview,
    Dark Mode, SMIL/click, sync, and publish gates. XHS/Zhihu rows returned empty JSON and
    were not used as substantive evidence.
  - Impact checks:
    `npx gitnexus impact detectXiaohongshuIssues -r InkForge --depth 3` passed with LOW risk,
    5 impacted symbols, 1 direct dependent, 0 affected processes.
    `npx gitnexus impact detectZhihuIssues -r InkForge --depth 3` passed with LOW risk,
    5 impacted symbols, 1 direct dependent, 0 affected processes.
    `npx gitnexus impact detectQuality -r InkForge --depth 2` passed with LOW risk,
    4 directly impacted symbols, 0 affected processes.
  - Verification:
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
    passed, 1 file / 31 tests.
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
    passed, 4 files / 70 tests.
    `pnpm -C inkforge exec vitest run src/services/export --reporter=default`
    passed, 35 files / 963 tests.
    `pnpm -C inkforge exec eslint src/services/export/quality-detector.ts src/services/export/platform-export-rendering.test.ts --quiet`
    and `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet` passed.
    `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
    `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed, Vite built
    in 28.92s.
  - `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied it and is
    intentionally not part of this slice.
  - Evidence file:
    `prompts/0601/evidence/completion-quality-gates-20260608.txt`.
  - Honest boundary:
    this slice does not claim new WeChat PC editor paste, WeChat phone preview,
    SMIL/click trigger proof, Dark Mode proof, cover-thumbnail proof, credentialed sync,
    scheduled-send, or publish success.
- [x] 2026-06-08 style-choice catalog and amber ordinary-paste retry:
  - Added `inkforge/src/services/export/style-catalog.ts` as the executable mirror of the
    user-selectable style matrix documented in `docs/platform-rendering-rules/`.
    It records platform, rule group, content blocks, visual strength, motion level, output
    artifact, fallback, status, evidence floor, publish evidence, blockers, and detector
    blocker ids for WeChat/XHS/Zhihu choices.
  - Exported the catalog API from `inkforge/src/services/export/index.ts`:
    `getStyleChoiceCatalog`, `getPlatformStyleChoices`, `getStyleChoiceById`,
    `evaluateStyleChoiceAvailability`, `isEvidenceAtLeast`, and `getBestEvidence`.
  - Added catalog contract tests in
    `inkforge/src/services/export/platform-export-rendering.test.ts`.
  - Real WeChat `flagship-amber` retry:
    authenticated `.ProseMirror` editor was reachable. The exact `flagship-amber.html`
    artifact was written to the browser clipboard as `text/html` / `text/plain`;
    clipboard artifact stats were `dataInkSvg=3`, `svg=35`, `dataInkBlock=23`,
    `styleTag=0`, `scriptTag=0`, `classAttr=0`. After real `Control+A` / `Control+V`,
    editor readback was plain text only: `dataInkSvg=0`, `dataInkBlock=0`, `svg=0`,
    `styleAttr=0`, `classAttr=0`. Therefore ordinary clipboard paste remains blocked
    for `flagship-amber`.
  - Rechecked 135 real browser pages:
    `beautify_editor.html` exposed style/template/SVG editor/AI layout/one-click layout,
    import/insert/theme/full-black-white/color-pick/title/body/image-text/guide/layout/
    festival/industry/small-element/SVG, copy/save/sync/preview workflow actions.
    `svg-center.html` exposed click, switch, zoom, flip, popup, play/draw, slide, carousel,
    long-press, fade, bullet text, region trigger, quiz/game, text effect, and follow-guide
    taxonomy, with multiple `仅支持手机端触发` labels.
  - Rechecked Xiumi real browser page:
    `studio/v5#/paper/for/new/cube/0` exposed open/preview/save/export, enhanced media mode,
    base typography, templates/materials/clipboard/gallery/team material/audio-video, theme,
    title, card, image, layout, SVG, and component groups.
  - Exa refresh reinforced 135's separate SVG routes (plugin paste, developer-tool HTML
    replacement, authorized sync), Xiumi plugin/sync/API as credentialed transfer states,
    XHS 3:4/image-count/configurable guidance, and Zhihu Markdown/image-upload/diagram
    fallback patterns. Grok Search returned weak third-party WeChat sources and was used only
    as conflict evidence.
  - Focused test first exposed that an existing Mermaid Markdown degradation test exceeds
    Vitest's 5000ms default timeout on this machine. The assertion stayed unchanged and the
    test now has an explicit 30000ms timeout.
  - Verification:
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
    passed, 1 file / 34 tests.
  - Final verification refresh:
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
    passed, 4 files / 73 tests.
    `pnpm -C inkforge exec vitest run src/services/export --reporter=default`
    passed, 35 files / 966 tests.
    `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
    passed.
    `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet`
    passed.
    `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`
    passed.
    `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
    passed, Vite built in about 1m 7s.
    `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated
    cache.
    `npx gitnexus impact detectQuality -r InkForge --depth 2`
    returned LOW risk, 4 direct dependents, 0 affected processes. Before post-commit indexing,
    direct impact checks for new catalog symbols returned `Target not found`; after
    `npx gitnexus analyze`, both `getStyleChoiceCatalog` and
    `evaluateStyleChoiceAvailability` resolve with LOW risk and 0 affected processes.
    `npx gitnexus detect-changes -r InkForge --scope all`
    returned low risk, 0 affected processes; the report includes unrelated existing dirty files,
    so staged review remains path-specific.
  - Evidence file:
    `prompts/0601/evidence/style-catalog-amber-paste-refresh-20260608.txt`.
  - Honest boundary:
    this slice does not claim `flagship-amber` PC rich paste success, WeChat phone preview,
    SMIL/click trigger proof, Dark Mode proof, cover-thumbnail proof, credentialed sync,
    scheduled-send, or publish success.
- [x] 2026-06-08 ExportModal style capability gate UI slice:
  - Added `getDefaultStyleEvidence()` and `getPlatformStyleAvailabilityReport()` in
    `inkforge/src/services/export/style-catalog.ts` so platform style availability has a
    single runtime summary for UI and tests.
  - Exported the report API from `inkforge/src/services/export/index.ts`.
  - Added catalog summary contract coverage in
    `inkforge/src/services/export/platform-export-rendering.test.ts`; focused count is now
    35 tests and the cross-platform focused suite is now 74 tests.
  - Added a read-only `样式能力` panel and `样式能力目录` preflight row to
    `inkforge/src/components/export/ExportModal.vue`. The panel shows choice status,
    rule group, output artifact, visual strength, motion, required evidence, current best
    evidence, blockers, and fallback. It does not add selectable fake templates or promote
    blocked/unavailable choices.
  - Updated `docs/platform-rendering-rules/market-practices-catalog.md` and
    `.trellis/spec/frontend/flagship-element-catalog.md` to require ExportModal/report UI to
    consume `getPlatformStyleAvailabilityReport()` rather than duplicating doc tables.
  - Impact checks:
    `npx gitnexus impact "Function:inkforge/src/components/export/ExportModal.vue:preflightRows" -r InkForge --depth 3`
    returned LOW risk, 0 affected processes.
    `npx gitnexus impact getPlatformStyleAvailabilityReport -r InkForge --depth 3`
    returned `Target not found` because the new symbol is not indexed yet; the existing
    catalog anchors and full tests/build were used as fallback until post-commit indexing.
  - Verification:
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
    passed, 1 file / 35 tests.
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
    passed, 4 files / 74 tests.
    `pnpm -C inkforge exec vitest run src/services/export --reporter=default`
    passed, 35 files / 967 tests.
    `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts src/components/export/ExportModal.vue --quiet`
    passed.
    `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet`
    and `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue --quiet` passed.
    `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
    `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed, Vite built
    in 54.61s.
    `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated
    cache.
  - Real browser smoke:
    started `pnpm -C inkforge dev --host 127.0.0.1 --port 3005`, opened the real app through
    Playwright Chromium, created a real blank local draft through UI, opened ExportModal, and
    verified WeChat style capability counts `4/7` with 7 cards. `wechat-flagship-amber` and
    `wechat-click-reveal` stayed `blocked`; official widget checklist stayed `unavailable`.
    Switched platforms and verified Xiaohongshu `2/3` and Zhihu `2/3`.
    Resized to `390x844`; document/body scroll width stayed 390, modal width was 374, cards
    had no detected horizontal overflow.
    Filled the real editor with a short Markdown draft through `.ProseMirror`, waited for
    `已同步 · 已保存`, reopened ExportModal, and verified non-empty Zhihu and WeChat exports:
    preflight reported real Markdown input, generated style/native artifacts, quality
    detection `0` errors, and style catalog counts remained gate-correct.
    Cleared prior external-site console noise and observed 0 fresh local console errors.
    Stopped the temporary dev server; `curl -I http://127.0.0.1:3005/` then failed to connect,
    confirming no local Vite session remained.
  - Evidence file:
    `prompts/0601/evidence/style-catalog-exportmodal-ui-refresh-20260608.txt`.
  - Committed as:
    `319f8b5 feat(export): surface style capability gates`.
  - Honest boundary:
    this slice does not claim new WeChat PC rich paste success, WeChat phone preview,
    SMIL/click trigger proof, Dark Mode proof, cover-thumbnail proof, credentialed sync,
    scheduled-send, or publish success.
- [x] 2026-06-08 ExportModal style capability gate e2e slice:
  - Refactored `inkforge/tests/e2e/specs/svg-render.spec.cjs` so the existing flagship
    export preview path reuses `openExportPanel('微信')`, then added a real ExportModal
    capability-gate probe for all three platform tabs.
  - The new e2e case asserts the same runtime catalog facts that the UI exposes:
    WeChat `4/7` with 7 cards, 4 available, 2 blocked, and 1 unavailable; Xiaohongshu
    `2/3` with 1 blocked long-report image artifact; Zhihu `2/3` with 1 blocked diagram
    and formula image fallback.
  - The case also verifies the `样式能力目录` preflight row, keeps
    `Amber business flagship` blocked after the ordinary WeChat PC paste failure, and keeps
    `Official widget publish checklist` unavailable without credentialed proof.
  - Impact check:
    `npx gitnexus impact "File:inkforge/tests/e2e/specs/svg-render.spec.cjs" -r InkForge --depth 3`
    returned LOW risk, 0 affected processes.
  - Verification:
    `node -c inkforge/tests/e2e/specs/svg-render.spec.cjs` passed.
    `pnpm -C inkforge test:e2e` passed against the real Tauri/WebView2 binary:
    2 spec files, 17 tests. The run refreshed tracked e2e screenshots, which were restored
    and intentionally not committed.
    `pnpm -C inkforge exec eslint tests/e2e/specs/svg-render.spec.cjs --quiet` is not a usable
    gate for this CJS/WDIO file under the current repo config: the current working tree reports
    82 errors for `require`, `__dirname`, WDIO globals (`browser`/`describe`/`it`), and browser
    globals (`document`/`window`), while the `HEAD` version of the same file already reports
    73 environment/config errors including the existing `no-useless-assignment` at line 249.
    This slice does not change ESLint test-environment configuration.
    `git diff --check -- inkforge/tests/e2e/specs/svg-render.spec.cjs .trellis/tasks/06-01-multiplatform-render-svg/implement.md prompts/0601/evidence/style-catalog-exportmodal-e2e-refresh-20260608.txt docs/platform-rendering-rules/market-practices-catalog.md`
    passed with only normal Windows LF-to-CRLF warnings.
  - Evidence file:
    `prompts/0601/evidence/style-catalog-exportmodal-e2e-refresh-20260608.txt`.
  - Honest boundary:
    this e2e gate proves local real-binary UI visibility and catalog/preflight consistency.
    It still does not prove new WeChat PC rich paste success, phone preview, mobile Dark
    Mode, SMIL/click trigger behavior, cover-thumbnail acceptance, credentialed sync,
    scheduled-send, or publish success.
- [x] 2026-06-08 public source hygiene refresh for the e2e closeout:
  - Ran a lightweight Grok/Exa public-source check for 2026 WeChat SVG/rich-text limits,
    Xiaohongshu image-note artifact rules, and Zhihu Markdown/image/formula/diagram rules.
  - WeChat public sources reinforced existing inline-style, `text/html` clipboard,
    no-script/no-event, no unsupported CSS, and image/diagram fallback rules.
  - Xiaohongshu public sources reinforced current 3:4/image-page/manifest defaults, but
    source quality varied; numeric limits remain configurable/checkable and do not become
    permanent hardcoded constants without official/publish-entry proof.
  - Zhihu public/open-source references reinforced clean Markdown, image upload/public host,
    formula/diagram raster fallback, and table simplification rules.
  - Updated `docs/platform-rendering-rules/market-practices-catalog.md` with source-hygiene
    notes and additional source index entries. No runtime availability was upgraded.
- [x] 2026-06-08 logged-in 135/Xiumi taxonomy refresh:
  - Used Playwright visible-text and DOM probes only; no screenshot, credential material,
    browser profile, account export, sync, copy, preview, or publish action was saved or
    executed.
  - 135 `beautify_editor.html` confirmed current toolbar/style/workflow taxonomy:
    import/insert/theme/full-black-white/color-pick, title/body/image-text/guide/layout/
    festival/industry/small-element/SVG, one-click layout, copy/save/sync/preview, dark-mode
    preview, long-image, AI tools, authorized account, scheduled send, full-text format,
    watermark, and team management.
  - Xiumi `studio/v5#/paper/for/new/cube/0` confirmed current workflow and layout/action
    taxonomy: import Word/Excel/Markdown, official-account article import, sync/plugin/copy
    paths, long-image/PDF/video export family, theme/title/card/image/layout/SVG/component
    groups, action list/extract action, click/auto/long-press triggers, background image,
    layer/z-order, positioning, alignment, SVG gallery, and mobile/permission caveats such as
    4000px background-image Android risk plus WeChat certification/comment-permission gates.
  - Updated `docs/platform-rendering-rules/market-practices-catalog.md` and added evidence:
    `prompts/0601/evidence/market-editor-live-taxonomy-refresh-20260608.txt`.
  - No runtime catalog availability was upgraded because no exact platform publish or phone
    preview evidence was produced.
- [x] 2026-06-08 market-editor live taxonomy agent review and boundary repair:
  - Spawned 3 lightweight documentation QA reviewers from
    `research/market-editor-live-review-agent-input.csv`; all 3 completed and wrote
    `research/market-editor-live-review-agent-output.csv`.
  - Findings:
    - Availability language was safe: docs/evidence and runtime catalog do not promote 135/Xiumi
      taxonomy to current published capability.
    - `wechat-rules.md` and `flagship-element-catalog.md` needed explicit preview and scheduled
      send states so those channels cannot collapse into sync/publish proof.
    - `xiaohongshu-rules.md` needed to keep PDF/video out of XHS publishable body fallback.
    - `zhihu-data-table` needed the same public image host/alt/caption detector blockers as
      other Zhihu image fallbacks because it can fall back to `image-fallback`.
  - Repairs:
    - Added `preview-share`/`platform-preview` and `scheduled-send`/`scheduled-publish` as
      separate artifact states in WeChat/flagship docs.
    - Qualified XHS PDF/video as offline or non-body auxiliary outputs, while image page/long
      image remain publishable fallback families.
    - Added `zhihu-image-host-blocked`, `zhihu-image-alt-missing`, and
      `zhihu-image-caption-missing` to `zhihu-data-table` in
      `inkforge/src/services/export/style-catalog.ts`, plus focused test coverage.
  - Impact check:
    `npx gitnexus impact getPlatformStyleChoices -r InkForge --depth 3` returned LOW risk,
    0 affected processes. `STYLE_CHOICE_CATALOG` is not separately indexed.
  - Verification:
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
    passed: 1 file, 35 tests.
    `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`
    passed.
    `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- [x] 2026-06-08 re-login element-level browser probe and style catalog expansion:
  - Used Playwright in read-only mode after the user re-logged into WeChat Official Account,
    135 Editor, and Xiumi.
  - Added `prompts/0601/evidence/market-editor-element-probe-20260608.txt` with non-sensitive
    element taxonomy and workflow boundaries:
    WeChat authenticated backend/creation menu, 135 toolbar/style/SVG/workflow taxonomy,
    135 SVG center mobile-only labels, Xiumi import/plugin/sync/action/layer/SVG/H5/design
    artifact-family separation, and public Exa/Grok supplementary source treatment.
  - Expanded `inkforge/src/services/export/style-catalog.ts` additively from the prior minimal
    style matrix to richer executable choices:
    WeChat 15 choices (`7 usable / 4 blocked / 4 unavailable` under default evidence),
    Xiaohongshu 7 choices (`4 usable / 2 blocked / 1 unavailable`), and Zhihu 7 choices
    (`4 usable / 2 blocked / 1 unavailable`).
  - Added regression coverage for mobile-only SVG, credentialed plugin/sync/upload gates, and
    H5/design artifact-family boundaries in
    `inkforge/src/services/export/platform-export-rendering.test.ts`.
  - Updated `inkforge/tests/e2e/specs/svg-render.spec.cjs` expected ExportModal style-capability
    counts and card text probes to match runtime catalog output.
  - Updated runtime/docs alignment in
    `docs/platform-rendering-rules/market-practices-catalog.md`,
    `docs/platform-rendering-rules/wechat-rules.md`,
    `docs/platform-rendering-rules/xiaohongshu-rules.md`,
    `docs/platform-rendering-rules/zhihu-rules.md`,
    `.trellis/spec/frontend/wechat-svg-modules.md`,
    `.trellis/spec/frontend/flagship-element-catalog.md`, and
    `prompts/0601/evidence/README.md`.
  - This pass still does not claim WeChat article editor rich paste, phone preview, SMIL/click,
    Dark Mode, cover thumbnail, credentialed sync, scheduled send, or publish proof.
- [x] 2026-06-08 ExportModal WebView2 narrow-preview regression repair:
  - A targeted real Tauri/WebView2 e2e run of
    `tests/e2e/specs/svg-render.spec.cjs` exposed two regressions after the richer 15/7/7
    style catalog expansion:
    the mobile-only WeChat card assertion could not see the second blocker text, and the
    ExportModal preview column collapsed to `niceWidth=61` / SVG parent width 61px in the
    real WebView2 layout.
  - Repaired `inkforge/src/components/export/ExportModal.vue` so blocked/unavailable style
    cards display the full blocker list, long blocker text wraps safely, `.preview-render`
    has explicit `width:100%` / `box-sizing:border-box`, and the modal stacks at `980px`
    instead of waiting until `760px`. This preserves the desktop two-column layout while
    preventing narrow Windows/WebView2 surfaces from crushing the preview column.
  - Repaired `inkforge/tests/e2e/specs/svg-render.spec.cjs` so `closeExportModal()` waits for
    the teleported modal DOM to unmount before the next round opens a new ExportModal.
  - Impact checks:
    `npx gitnexus impact "File:inkforge/src/components/export/ExportModal.vue" -r InkForge --depth 3`
    returned LOW risk, 0 affected processes.
    `npx gitnexus impact "File:inkforge/tests/e2e/specs/svg-render.spec.cjs" -r InkForge --depth 3`
    returned LOW risk, 0 affected processes.
  - Verification:
    `node -c inkforge/tests/e2e/specs/svg-render.spec.cjs` passed.
    `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`
    passed.
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
    passed, 1 file / 36 tests.
    `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
    passed, 35 files / 968 tests.
    `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
    `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed with
    `BUILD_EXIT:0`.
    `cd inkforge && ./node_modules/.bin/wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`
    passed against WebView2 `148.0.3967.96`: 1 spec file, 6 tests. The regression probe now
    reports `niceWidth=401`, SVG parent width 401px, and mobile-emulated chars/line `20`.
    `cd inkforge && ./node_modules/.bin/wdio run tests/e2e/wdio.conf.cjs`
    passed against WebView2 `148.0.3967.96`: 2 spec files, 17 tests.
  - `inkforge/tsconfig.tsbuildinfo` was restored after build/typecheck dirtied the generated
    cache. The tracked e2e PNG files under `prompts/0601/evidence/e2e/` were already dirty
    at the start of this continuation and remain a separate artifact-review concern.
- [x] 2026-06-09 applied-editor-element evidence-label runtime slice:
  - Promoted the 2026-06-08 CloakBrowser applied-element rule from docs/spec into the executable
    style catalog by adding `applied-editor-element` to `StyleEvidenceLabel`.
  - Ranked `applied-editor-element` above `doc-only` but below `unit-tested`, so 135/Xiumi
    applied editor evidence can be displayed and audited without satisfying renderer,
    local-browser, PC paste, mobile-preview, sync, or publish gates.
  - Added ExportModal label text `已应用元素`, preserving user-visible evidence reporting
    without changing default platform evidence or promoting any blocked/unavailable style.
  - Added focused regression assertions in
    `inkforge/src/services/export/platform-export-rendering.test.ts` proving
    `applied-editor-element` does not make `wechat-classic-inline` or XHS local-browser-gated
    styles usable.
  - Synchronized the evidence label schema in
    `docs/platform-rendering-rules/market-practices-catalog.md` and
    `.trellis/spec/frontend/wechat-svg-modules.md`.
  - Impact checks:
    `gitnexus impact evaluateStyleChoiceAvailability` returned LOW risk, 1 direct test
    dependent, 0 affected processes.
    `gitnexus impact getPlatformStyleAvailabilityReport` returned LOW risk, 2 direct dependents
    (`platform-export-rendering.test.ts`, `ExportModal.vue`), 0 affected processes.
  - Verification:
    `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
    passed, 1 file / 36 tests.
    `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`
    passed.
    `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
    `git diff --check -- <06-01 applied evidence/runtime paths>` passed with only normal
    Windows LF-to-CRLF warnings.
    `inkforge/tsconfig.tsbuildinfo` was not modified by the typecheck rerun.
    CloakBrowser visual check opened local Vite at `http://127.0.0.1:3005/`, created a real
    draft, opened ExportModal, and confirmed the style capability panel still shows
    `7/15` usable WeChat choices with mobile-only/plugin/sync/H5/design gates blocked or
    unavailable. Screenshot was saved only under the local CloakBrowser screenshot directory
    and was not committed.

### 2026-06-09 block-boundary insertion guard runtime slice

- Implemented `inkforge/src/extensions/BlockBoundaryInsertion.ts` as the shared editor guard
  for block-level market/style insertions.
  - Inline text snippets keep the current inline insertion behavior.
  - Block JSON/HTML and `type: "block"` snippets replace an empty command paragraph.
  - When the selection is inside a non-empty top-level block, the new block is inserted after
    that owning block rather than inside the current paragraph/card.
- Wired `SlashCommands.ts` callout/details commands through the guard.
- Wired `SnippetExpansion.ts` through the guard, using snippet `type` to choose inline vs block
  insertion.
- Added `inkforge/src/extensions/BlockBoundaryInsertion.test.ts` covering:
  inline snippet preservation, non-empty paragraph block insertion, empty command paragraph
  replacement, and block snippet tab-stop selection.
- Synchronized docs/spec with the executable guard:
  `docs/platform-rendering-rules/market-practices-catalog.md`,
  `docs/platform-rendering-rules/wechat-rules.md`,
  `.trellis/spec/frontend/wechat-svg-modules.md`, and
  `.trellis/spec/frontend/flagship-element-catalog.md`.
- Impact checks before editing:
  GitNexus MCP impact for `insertCallout`, `insertDetailsBlock`, `SlashCommands`,
  `SnippetExpansion`, and `applyResolvedSnippet` returned LOW risk. `applyResolvedSnippet`
  had one direct affected flow (`handleKeyDown`) and 0 high-risk processes.
- Verification:
  `pnpm -C inkforge exec vitest run src/extensions/BlockBoundaryInsertion.test.ts --reporter=default`
  passed, 1 file / 4 tests.
  `pnpm -C inkforge exec vitest run src/extensions/BlockBoundaryInsertion.test.ts src/services/snippet/snippet.test.ts --reporter=default`
  passed, 2 files / 15 tests.
  `pnpm -C inkforge exec vitest run src/extensions --reporter=default`
  passed, 12 files / 76 tests.
  `pnpm -C inkforge exec eslint src/extensions/BlockBoundaryInsertion.ts src/extensions/BlockBoundaryInsertion.test.ts src/extensions/SlashCommands.ts src/extensions/SnippetExpansion.ts --quiet`
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed, Vite built in
  33.64s.
  `inkforge/tsconfig.tsbuildinfo` was restored after the production build dirtied the generated
  cache.
  GitNexus MCP `detect_changes(scope=all)` returned low risk and 0 affected processes. The
  report still includes unrelated existing dirty files, so review/commit must remain
  path-specific.
  `git diff --check HEAD -- <block-boundary/docs paths>` passed with only normal Windows
  LF-to-CRLF warnings.
- CloakBrowser visual check (profile `inkforge-0601`, no Playwright):
  - Opened the real local Workstation draft at `http://127.0.0.1:3005/`.
  - Placed the real TipTap selection inside a non-empty paragraph and executed the registered
    slash `callout` command. DOM readback showed top-level order:
    heading -> paragraph -> blockquote(callout) -> blockquote(original), with no nested
    paragraph/card insertion and no vertical rectangle overlaps.
  - Created an empty command paragraph, executed the registered slash `details` command, and
    confirmed `emptyParagraphs=0`; top-level order included a `detailsBlock` sibling and no
    overlap.
  - Saved one local-only screenshot under the CloakBrowser screenshot directory:
    `inkforge-block-boundary-insertion-visual-20260609-1780940208952.png`.
  - The temporary visual-check edits were restored to the pre-check draft content. A blind
    multi-undo cleanup briefly cleared the draft because it crossed earlier history entries;
    the content was restored from the pre-check DOM snapshot and the page returned to
    `已同步 · 已保存`, 54 字 / 3 段. Future visual checks should use an isolated draft or a saved
    baseline snapshot for cleanup rather than repeated undo.

### 2026-06-09 ExportModal selectable style application gate slice

- Implemented the second-stage runtime application gate for market-informed style choices:
  `available` remains the platform/evidence catalog gate, while `selectable` now requires an
  executable `StyleChoiceApplication` that maps to an existing InkForge preset/export path.
- Added `StyleChoiceApplication`, `evaluateStyleChoiceApplication()`,
  `getStyleChoiceApplication()`, and `getPlatformStyleApplicationReport()` in
  `inkforge/src/services/export/style-catalog.ts`, and re-exported the public API through
  `inkforge/src/services/export/index.ts`.
- Mapped currently executable choices to existing real presets:
  WeChat flagship/editorial choices to `report`, `flagship-kiln`, `flagship-tempera`, or
  `flagship-amber`; XHS clean text to `xhs-fresh`; Zhihu clean/table choices to
  `zhihu-academic`, `zhihu-insight`, or `zhihu-tech`.
- Kept non-executable market capabilities disabled even when they are documented as available:
  `wechat-toolbar-parameter-map` has no current toolbar block renderer in ExportModal,
  `xhs-cover-carousel` has no current image-page artifact creator, and `wechat-flagship-amber`
  remains blocked by the runtime catalog despite its future preset mapping.
- Updated `ExportModal.vue` so style cards are real gate-aware buttons:
  selectable cards call the same `selectPreset()` path as the preset grid, selected cards expose
  `aria-pressed`, unavailable/non-executable cards are disabled, and manual preset selection
  clears the selected style choice to avoid UI/renderer drift.
- Updated focused unit and e2e coverage so the UI proves both sides of the contract:
  selectable Kiln changes the active preset to `赤陶旗舰`, while Amber and toolbar parameter map
  stay disabled; XHS and Zhihu selectable examples map to real existing presets.
- Synchronized docs/spec contracts:
  `.trellis/spec/frontend/flagship-element-catalog.md`,
  `.trellis/spec/frontend/wechat-svg-modules.md`, and
  `docs/platform-rendering-rules/market-practices-catalog.md`.
- Added evidence summary:
  `prompts/0601/evidence/style-application-selectable-ui-20260609.txt`.
- Impact checks before editing:
  GitNexus impact for `getPlatformStyleAvailabilityReport`,
  `evaluateStyleChoiceAvailability`, `getPlatformStyleChoices`,
  `File:inkforge/src/components/export/ExportModal.vue`, and
  `File:inkforge/tests/e2e/specs/svg-render.spec.cjs` returned LOW risk and 0 affected
  processes. GitNexus index was refreshed with `npx gitnexus analyze` before the slice.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed, 1 file / 38 tests.
  `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed, 35 files / 970 tests.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed.
  `cd inkforge && ./node_modules/.bin/wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`
  passed against WebView2 `148.0.3967.96`, 1 spec file / 6 tests.
- CloakBrowser visual check (profile `inkforge-0601`, no Playwright):
  opened the real local app and existing Workstation draft, opened ExportModal through the UI,
  confirmed WeChat `7/15` capability summary, no horizontal overflow, Kiln selectable state
  and real preset change to `赤陶旗舰`, Amber/toolbar disabled state, XHS clean text mapping to
  `清新少女`, Zhihu semantic table mapping to `技术博客`, and disabled image-page/image-fallback
  cards. Screenshots are local-only under the CloakBrowser screenshot directory and are not
  committed.
- Final CloakBrowser recheck after the last automated verification pass confirmed the active
  `inkforge-0601` profile remained on the local Workstation with `已同步 · 已保存`; WeChat summary
  stayed `7/15`, Kiln stayed selected with `aria-pressed="true"`, active preset stayed
  `赤陶旗舰`, Amber and toolbar stayed disabled, preview SVG count was `10`, and body horizontal
  overflow was false.
- Honest boundary:
  this slice does not claim current WeChat mobile preview, SMIL/click animation, Dark Mode,
  cover thumbnail, credentialed sync, scheduled-send, or publish proof.

### 2026-06-09 Zhihu SVG image fallback preview fidelity slice

- Tightened the Zhihu preview-fidelity contract so `renderZhihuMockHtml()` converts
  `section[data-ink-svg]` inline SVG modules into `<img data-ink-svg ...>` image fallback
  before returning preview HTML.
- The preview now remains visual while matching the platform rule that Zhihu publishable
  Markdown must not depend on inline SVG. This strengthens AC6's Zhihu SVG-as-img evidence
  without claiming public image hosting, upload, credentialed sync, or publish success.
- Implemented the fallback with existing source-owned raster helpers:
  `buildSvgDataUri()` extracts and sizes the SVG document, and `svgToImgTag()` emits the
  responsive image fallback with the existing `data-ink-svg` sentinel.
- Updated `svg-modules-fidelity.test.ts` from "Zhihu preserves inline SVG" to "Zhihu converts
  inline SVG modules to image fallback", and added direct `zhihu-mock.test.ts` coverage.
- Impact checks before editing:
  GitNexus impact for `renderZhihuMockHtml` returned LOW risk, 2 direct test dependents, and
  0 affected processes. GitNexus impact for
  `File:inkforge/src/services/export/preview-fidelity/zhihu-mock.ts` returned LOW risk,
  direct imports in `usePreviewRenderer.ts`, `zhihu-mock.test.ts`, and
  `svg-modules-fidelity.test.ts`, and 0 affected processes.
- Serena remained unavailable in this workspace (`No active project`, known projects `[]`),
  so the edit used current file reads, GitNexus impact, and a narrow patch fallback.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/preview-fidelity/zhihu-mock.test.ts src/services/export/preview-fidelity/svg-modules-fidelity.test.ts src/composables/usePreviewRenderer.test.ts --reporter=default`
  passed, 3 files / 20 tests.
  `pnpm -C inkforge exec vitest run src/services/export/preview-fidelity src/composables/usePreviewRenderer.test.ts --reporter=default`
  passed, 4 files / 31 tests.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed, 1 file / 38 tests.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed, 35 files / 971 tests.
  `pnpm -C inkforge exec eslint src/services/export/preview-fidelity/zhihu-mock.ts src/services/export/preview-fidelity/zhihu-mock.test.ts src/services/export/preview-fidelity/svg-modules-fidelity.test.ts --quiet`
  passed.
  `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet` passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed, Vite built in
  31.75s.
  `inkforge/tsconfig.tsbuildinfo` was restored after the production build dirtied the generated
  cache.
  `git diff --check -- inkforge/src/services/export/preview-fidelity/zhihu-mock.ts inkforge/src/services/export/preview-fidelity/zhihu-mock.test.ts inkforge/src/services/export/preview-fidelity/svg-modules-fidelity.test.ts`
  passed with only normal Windows LF-to-CRLF warnings.
  GitNexus index was refreshed with `npx gitnexus analyze`; MCP impact for
  `renderZhihuMockHtml` and `File:inkforge/src/services/export/preview-fidelity/zhihu-mock.ts`
  returned LOW risk and 0 affected processes.
  CloakBrowser visual check (profile `inkforge-0601`, no Playwright) opened the real local app,
  opened ExportModal from a real Workstation draft, confirmed Zhihu `4/7` availability and no
  horizontal overflow, then used a temporary DOM sandbox with the real Vite module import to
  verify an injected `section[data-ink-svg]` becomes a visible `img[data-ink-svg]` fallback
  (`naturalWidth=1080`, `naturalHeight=60`, no inline SVG or `<animate>` leakage). The sandbox
  was removed and the screenshot was saved only under the local CloakBrowser screenshot
  directory.
- Added evidence summary:
  `prompts/0601/evidence/zhihu-svg-image-fallback-preview-20260609.txt`.

### 2026-06-09 style proof checklist runtime slice

- Added executable proof requirements to `inkforge/src/services/export/style-catalog.ts`:
  `STYLE_PROOF_REQUIREMENTS`, `getEvidenceProofRequirements()`, and
  `getStyleChoiceProofRequirements()`.
- Re-exported the proof requirement API through `inkforge/src/services/export/index.ts`.
- Focused regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts` proves:
  - `pc-editor-paste` requires exact artifact, safe disposable draft, real PC paste/channel event,
    PC DOM readback, and sensitive-artifact hygiene.
  - `mobile-preview` requires phone readback/screenshot, Dark Mode check, cover-thumbnail check,
    and sensitive-artifact hygiene.
  - `published` stays cross-platform and does not automatically imply WeChat phone preview.
  - `wechat-flagship-amber` remains `blocked` even when the helper lists its missing proof
    requirements.
- CloakBrowser-only follow-up:
  - Profile `inkforge-0601`; no Playwright.
  - A read-only WeChat editor probe observed `#js_add_appmsg` / `data-action="add"` for adding
    another article in the current multi-article draft.
  - The control was not clicked because it can mutate the real draft structure and there is no
    verified disposable draft or cleanup proof for this artifact.
- Verification so far:
  - `npx gitnexus analyze` refreshed the index successfully.
  - GitNexus MCP impact for `style-catalog.ts`, `index.ts`, and
    `platform-export-rendering.test.ts` returned LOW risk and 0 affected processes.
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
    passed, 1 file / 39 tests.
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
    passed, 4 files / 78 tests.
  - `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
    passed, 35 files / 972 tests.
  - `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
    passed.
  - `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet` passed.
  - `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
  - `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed through Git Bash,
    Vite built in 38.93s. The first PowerShell-shell attempt failed before build start because
    Bash-style env assignment is not valid in PowerShell.
  - `inkforge/tsconfig.tsbuildinfo` was restored after build/typecheck dirtied the generated cache.
- Evidence summary:
  `prompts/0601/evidence/style-proof-checklist-20260609.txt`.

### 2026-06-09 style proof manifest report slice

- Added `getStyleProofManifestReport()` in
  `inkforge/src/services/export/style-catalog.ts`, and re-exported the report API and report row
  types through `inkforge/src/services/export/index.ts`.
- The report reuses `validateStyleProofManifest()` and groups the same issues by requirement
  and artifact rows:
  - requirement statuses: `satisfied`, `missing`, `invalid`.
  - artifact statuses: `accepted`, `invalid`, `sensitive`, `unsafe-commit`.
  - summary counters for required proof items, missing/invalid rows, accepted artifacts,
    sensitive artifacts, unsafe committed artifacts, and total issue count.
- This is a diagnostics/evidence layer only. It does not change export output, style availability,
  style selectability, mobile preview proof, sync proof, or publish proof.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed, 1 file / 55 tests.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed, 4 files / 94 tests.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed, 35 files / 988 tests.
  `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet` passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
  PowerShell `NODE_OPTIONS=--max-old-space-size=4096`; `pnpm -C inkforge build` passed,
  Vite built in 34.49s.
- CloakBrowser runtime smoke (profile `inkforge-0601`, no Playwright):
  opened the real local app, dynamically imported `/src/services/export/index.ts`, and confirmed
  complete, weak, and synthetic-sensitive manifests report the expected valid/missing/invalid/
  sensitive/unsafe counters. No account page, profile path, QR, token, cookie, HAR, or screenshot
  path was committed.
- Evidence summary:
  `prompts/0601/evidence/style-proof-manifest-report-20260609.txt`.
- Commit:
  `6521114 fix(export): report style proof manifest gaps`.

### 2026-06-09 style proof manifest draft slice

- Added `createStyleProofManifestDraft()` in
  `inkforge/src/services/export/style-catalog.ts`, and re-exported the draft API plus
  `StyleProofManifestDraftOptions` through `inkforge/src/services/export/index.ts`.
- The API creates a redacted `StyleProofManifest` scaffold with `artifacts: []`:
  - with `choiceId`, default `scope` is `style-choice`.
  - without `choiceId`, default `scope` is `evidence-label`.
  - optional `artifactFingerprint` is caller-supplied only; the helper does not infer or create
    a fake fingerprint.
- The draft is designed to be passed into `getStyleProofManifestReport()` before platform
  probing so missing requirements are explicit before any CloakBrowser, platform editor, phone
  preview, sync, or publish action. It deliberately creates no proof artifacts.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed, 1 file / 57 tests.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed, 4 files / 96 tests.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed, 35 files / 990 tests.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
  `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet` passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
  PowerShell `NODE_OPTIONS=--max-old-space-size=4096`; `pnpm -C inkforge build` passed,
  Vite built in 27.55s.
- CloakBrowser runtime smoke (profile `inkforge-0601`, no Playwright):
  opened the real local app, dynamically imported `/src/services/export/index.ts`, and confirmed
  `wechat-flagship-amber` style-choice draft uses `artifacts:[]`, report has required=10 and
  missing=10, and `pc-editor-dom-readable` evidence-label draft has required=3 and missing=3.
  No account page, profile path, QR, token, cookie, HAR, or screenshot path was committed.
- `inkforge/tsconfig.tsbuildinfo` was restored after build/typecheck dirtied the generated cache.
- Evidence summary:
  `prompts/0601/evidence/style-proof-manifest-draft-20260609.txt`.

### 2026-06-09 style proof readiness matrix slice

- Added `getPlatformStyleProofReadinessReport()` in
  `inkforge/src/services/export/style-catalog.ts`, and re-exported the readiness API plus row
  types through `inkforge/src/services/export/index.ts`.
- The API builds one empty style-choice proof draft per style choice on a platform, then runs
  `getStyleProofManifestReport()` for every row.
- Every row starts with `artifacts: []` and reports missing/invalid proof requirement ids. This is
  the acceptance checklist for future CloakBrowser/platform proof collection, not a success signal.
- Focused regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts` proves:
  - WeChat readiness covers all WeChat choices and has `valid=0` before real proof artifacts.
  - `wechat-flagship-amber` remains catalog-blocked and lists the PC paste, mobile preview,
    Dark Mode, cover-thumbnail, publish, exact-artifact, disposable-draft, and hygiene gaps.
  - XHS readiness covers all XHS choices without fabricating artifacts.
  - Zhihu public image upload readiness lists credentialed channel, sync readback, public host,
    Zhihu artifact manifest, and publish/platform-preview gaps.
- Verification so far:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed, 1 file / 58 tests.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
  GitNexus index was refreshed with `npx gitnexus analyze`; impact for
  `getPlatformStyleProofReadinessReport`, `getStyleChoiceProofRequirements`,
  `createStyleProofManifestDraft`, and `getStyleProofManifestReport` returned LOW risk and
  0 affected execution flows.
  Follow-up runtime review found that `credentialed-sync` was carrying an XHS-specific proof
  requirement into Zhihu/WeChat checklist rows. The mapping was narrowed so `credentialed-sync`
  keeps only account/sync/readback/sensitive-hygiene proof, while XHS image-page/long-image
  choices add `xhs-artifact-manifest` and Zhihu image-fallback/upload choices add
  `public-image-host` plus `zhihu-artifact-manifest`.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed, 4 files / 97 tests.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed, 35 files / 991 tests.
  `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet` passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
  PowerShell `NODE_OPTIONS=--max-old-space-size=4096`; `pnpm -C inkforge build` passed.
  CloakBrowser runtime smoke (profile `inkforge-0601`, no Playwright) opened the real local Vite
  app, confirmed no horizontal overflow at 1400px, dynamically imported
  `/src/services/export/index.ts`, and verified WeChat 15 / XHS 7 / Zhihu 7 readiness rows,
  `valid=0` for all platforms, all generated drafts empty, amber still catalog-blocked, XHS
  carousel requiring `xhs-artifact-manifest`, and Zhihu public upload requiring
  `public-image-host` plus `zhihu-artifact-manifest` without inheriting `xhs-artifact-manifest`.
- Evidence summary:
  `prompts/0601/evidence/style-proof-readiness-matrix-20260609.txt`.

### 2026-06-09 post-reboot amber PC editor readback recovery

- Resumed after reboot without creating a new task. `task.py current` still reported none, but
  `06-01-multiplatform-render-svg/` remained `in_progress`, matching the active task context.
- Stopped the leftover temporary artifact server on `127.0.0.1:3106` after confirming its command
  line served only `prompts/0601/evidence/wechat-paste/flagship-amber.html`; the port no longer
  had a listening process.
- Reopened WeChat through CloakBrowser only with the required `inkforge-0601` profile. The backend
  was still logged in and on the home page, not the editor route. A read-only DOM probe found no
  `.ProseMirror` editors mounted and the visible recent draft set still matched the pre-test set:
  `111`, `静谧刊印：当排版成为一种克制的力量`, `数字人民币：一切的基点`, `未命名文章`.
- Documented the prior amber platform action as channel-specific evidence:
  exact `flagship-amber.html` was dispatched to the real WeChat PC body editor through a
  CloakBrowser programmatic `ClipboardEvent('paste')` plus `DataTransfer`; WeChat's paste handler
  intercepted it and DOM readback kept `data-ink-svg=3`, `svg=35`, `styleAttr=195`,
  `classAttr=30`, `hasFlagshipFooter=true`, `hasInteractiveStretch=true`, and `hasCover=true`.
- Preserved the boundary that this does not prove ordinary Ctrl+V, phone/mobile preview,
  SMIL/click behavior on phone, Dark Mode, cover-thumbnail acceptance, credentialed sync,
  scheduled send, or publish.
- Kept `wechat-flagship-amber` catalog status `blocked`; only the blocker text now distinguishes
  ordinary Ctrl+V failure from the CloakBrowser ClipboardEvent PC channel readback.
- Verification:
  `npx gitnexus impact PLATFORM_STYLE_CHOICES -r InkForge --depth 3`: LOW, 0 affected processes.
  `npx gitnexus impact getPlatformStyleChoices -r InkForge --depth 3`: LOW, 4 impacted symbols,
  0 affected processes.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 58 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  4 files / 97 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  35 files / 991 tests passed.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in 31.68s.
  `git diff --check -- <slice paths>`: passed; only Windows autocrlf warnings appeared.
  Build-generated `inkforge/tsconfig.tsbuildinfo` was restored after validation dirtied it.
- Evidence summary:
  `prompts/0601/evidence/wechat-paste/amber-pc-clipboardevent-readback-20260609.txt`.

## 2026-06-09 Style Proof Collection Plan Slice

- Added `getPlatformStyleProofCollectionPlan(platform)` in
  `inkforge/src/services/export/style-catalog.ts`.
- The plan converts missing/invalid style proof requirements into ordered collection gates:
  `local-evidence`, `market-editor`, `authenticated-pc-editor`, `phone-preview`,
  `credentialed-channel`, `public-host`, `platform-publish`, and `sensitive-hygiene`.
- Each step records whether the proof would mutate a real platform, require an external account,
  require a phone, or remain safe to automate locally. This keeps PC paste, phone preview,
  credentialed sync, public-host, publish, and sensitive-hygiene gates separate.
- Exported the new API from `inkforge/src/services/export/index.ts`.
- Added regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`; the test asserts that
  WeChat amber still remains blocked, phone proof stays separate from PC editor proof, XHS
  artifact manifests do not leak into Zhihu, and Zhihu public-host/channel/publish gates remain
  distinct.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/style-proof-collection-plan-20260609.txt`.
- Updated docs/spec/report surfaces:
  `.trellis/spec/frontend/wechat-svg-modules.md`,
  `docs/platform-rendering-rules/market-practices-catalog.md`,
  `docs/platform-rendering-rules/wechat-rules.md`,
  `docs/微信渲染规则.md`, `prompts/0601/COMPLETION-REPORT.md`, and
  `prompts/0601/evidence/README.md`.
- Current runtime smoke from the evidence file:
  WeChat total 143, phonePreview 52, authenticatedPcEditor 24, safeToAutomate 44;
  XHS total 38; Zhihu total 43. This is collection scheduling evidence only, not platform
  paste, mobile preview, sync, or publish success.
- Verification already run before this docs update:
  `npx gitnexus impact getPlatformStyleProofReadinessReport -r InkForge --depth 3`: LOW,
  0 affected processes.
  `npx gitnexus impact getStyleChoiceProofRequirements -r InkForge --depth 3`: LOW,
  0 affected processes.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 59 tests passed.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
- Post-doc-update verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 59 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  4 files / 98 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  35 files / 992 tests passed.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
  `pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet`: passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, latest Vite build
  completed in 31.20s.
  Build-generated `inkforge/tsconfig.tsbuildinfo` was restored after validation dirtied it.
  `git diff --check -- <slice paths>`: passed; only Windows autocrlf warnings appeared.
  `npx gitnexus detect-changes -r InkForge --scope all`: LOW risk, 0 affected processes. The
  report includes unrelated existing dirty files, so the staged review must remain path-specific.
- Read-only sub-agent review found three consistency issues and no real sensitive artifact
  references. Fixes applied: the test now counts missing plus invalid requirements, the spec
  signature includes `order`, `blockedByCatalog`, and `note`, and the evidence table includes
  the `marketEditor` summary column.

## 2026-06-09 ExportModal Style Proof Gate UI Slice

- Surfaced `getPlatformStyleProofCollectionPlan(platform)` inside
  `inkforge/src/components/export/ExportModal.vue`.
- The style catalog preflight row now displays platform-level pending proof totals: total pending
  proof steps, locally automatable steps, phone steps, and external-account/platform steps.
- Each style capability card now displays:
  - a proof summary derived from the choice-specific collection steps;
  - up to four distinct gate labels from the collection plan, covering local evidence, market
    editor, PC editor, phone preview, credentialed channel, public host, platform publish, and
    sensitive-hygiene gates.
- The UI is informational only. It does not change `selectable`, `usable`, `blocked`, or
  `unavailable` decisions and does not execute any platform action.
- Updated `.trellis/spec/frontend/wechat-svg-modules.md` to record the UI contract: ExportModal
  may show collection-plan summaries and gate labels, but must keep availability decisions and
  proof collection gates separate.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/style-proof-ui-gates-20260609.txt`.
- Runtime boundary from the evidence file:
  local UI proof only; no WeChat/XHS/Zhihu paste, phone preview, sync, scheduled send, or publish
  success is claimed.
- GitNexus impact checks:
  `npx gitnexus impact getPlatformStyleApplicationReport -r InkForge --depth 3`: LOW,
  0 affected processes.
  `npx gitnexus impact getPlatformStyleAvailabilityReport -r InkForge --depth 3`: LOW,
  0 affected processes.
  `npx gitnexus impact getPlatformStyleProofCollectionPlan -r InkForge --depth 3` could not find
  the new symbol in the current index, so the slice uses the two existing report symbols plus
  focused tests, build checks, CloakBrowser UI proof, and final `detect-changes` as the fallback.
- Verification already run before the reboot:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 59 tests passed.
  `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
- CloakBrowser runtime UI smoke before the reboot (profile `inkforge-0601`, no Playwright):
  desktop 1400x900 and mobile 390x844 both opened the real local Vite app, entered the real
  workstation, opened the ExportModal through the existing export button, and showed 15 style
  cards, 15 proof summaries, 60 proof gate labels, and no horizontal overflow.
- Post-reboot verification refresh:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 59 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  4 files / 98 tests passed.
  `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in
  29.44s.
  Build-generated `inkforge/tsconfig.tsbuildinfo` was restored after validation dirtied it.
  GitNexus impact for `getPlatformStyleApplicationReport` and
  `getPlatformStyleAvailabilityReport` stayed LOW with 0 affected processes; the current
  GitNexus index still could not find `getPlatformStyleProofCollectionPlan`.
  CloakBrowser desktop/mobile refresh again showed 15 style cards, 15 proof summaries, 60 proof
  gate labels, no horizontal overflow, and no emoji-like visible text. Temporary local screenshots
  were used for visual inspection only and are not recorded as evidence paths.

## 2026-06-09 Style Proof Collection Queue Slice

- Added `getPlatformStyleProofCollectionQueue(platform)` in
  `inkforge/src/services/export/style-catalog.ts`.
- The queue derives only from `getPlatformStyleProofCollectionPlan(platform)`, groups non-empty
  gates in execution order, and exposes `nextGate` / `nextSafeGate`.
- Each queue group records step count, choice ids, blocked choice count, mutating steps,
  external-account steps, phone steps, and safe-to-automate steps. This gives later platform
  proof collection an executable order without guessing from flat steps.
- Exported the queue API and types through `inkforge/src/services/export/index.ts`.
- ExportModal style capability summary and preflight detail now show the next proof gate and gate
  count. This is informational only; it does not change `selectable`, `usable`, `blocked`, or
  `unavailable` decisions and does not execute any platform action.
- Added focused regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`; the new test asserts queue
  ordering, safe-vs-mutating separation, phone gate isolation, XHS no-phone queue shape, Zhihu
  public-host/credentialed-channel grouping, and that WeChat amber remains not usable.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/style-proof-collection-queue-20260609.txt`.
- Runtime evidence:
  CloakBrowser dynamically imported the real Vite module and read back WeChat 143 steps / 6 gates,
  XHS 38 steps / 3 gates, and Zhihu 43 steps / 5 gates. ExportModal local UI showed
  `下一步 本地证据，共 6 类门禁` and no horizontal overflow at 1400x900.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 60 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  4 files / 99 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  35 files / 993 tests passed.
  `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in
  52.28s.
  Build-generated `inkforge/tsconfig.tsbuildinfo` was restored after validation dirtied it.
  CloakBrowser mobile 390x844 showed `下一步 本地证据，共 6 类门禁`, 15 style cards, 15 proof
  summaries, 60 gate labels, no horizontal overflow, and first-card `scrollWidth/clientWidth`
  stayed 331/331.
- Boundary:
  this queue proves only local scheduling/readback. It does not prove platform paste, phone
  preview, sync, scheduled send, or publish.

## 2026-06-09 Style Proof Progress Report Slice

- Added `getPlatformStyleProofProgressReport(platform, manifests)` in
  `inkforge/src/services/export/style-catalog.ts`.
- The report accepts real redacted `StyleProofManifest` inputs, merges only existing artifacts for
  the same platform/style choice, and never creates proof artifacts.
- Cross-platform or unknown-choice manifests are excluded from the requested platform and counted in
  `ignoredManifestCount`, keeping WeChat, Xiaohongshu, and Zhihu proof state isolated.
- Each style choice is evaluated in `style-choice` scope through `getStyleProofManifestReport()`.
  Gate progress therefore reuses the existing manifest validator for satisfied, missing, invalid,
  accepted, sensitive, and unsafe-commit states.
- Platform-level gate progress reuses the collection gate order from the plan/queue API and exposes
  missing/invalid next gates without changing `selectable`, `usable`, `blocked`, or `unavailable`
  catalog decisions.
- Exported the progress report API and types through `inkforge/src/services/export/index.ts`.
- Added focused regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`; the new tests cover valid
  redacted local proof progress, invalid/unsafe artifact gate counts, ignored cross-platform
  manifests, and WeChat amber staying blocked.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/style-proof-progress-report-20260609.txt`.
- Initial verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 62 tests passed.
- Verification refresh:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  4 files / 101 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  35 files / 995 tests passed.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in
  56.03s.
  Build-generated `inkforge/tsconfig.tsbuildinfo` was restored after validation dirtied it.
- CloakBrowser runtime smoke:
  a real local Vite page dynamically imported `/src/services/export/index.ts` and called
  `getPlatformStyleProofProgressReport('wechat', redactedManifests)`. The report returned
  15 WeChat choices, 6 gates, 1 ignored cross-platform manifest, local/sensitive gates satisfied
  for `wechat-classic-inline`, and `wechat-flagship-amber` remained blocked.
- Boundary:
  this report proves only local proof accounting. It does not prove platform paste, phone preview,
  sync, scheduled send, upload, public host, or publish.

## 2026-06-09 Style Proof Manifest Pack Report Slice

- Added `getStyleProofManifestPackReport(manifests)` in
  `inkforge/src/services/export/style-catalog.ts`.
- The pack report runs `getPlatformStyleProofProgressReport()` for WeChat, Xiaohongshu, and Zhihu,
  preserving per-platform `choicesWithManifest` and `ignoredManifestCount` isolation.
- The pack report reuses `validateStyleProofManifest()` and adds pack-level issues for unknown
  choices, platform/choice mismatches, and duplicate artifact ids.
- Duplicate artifact ids are reported as errors because progress and hygiene rows must point to one
  unambiguous proof record.
- Multi-manifest progress now also rejects multiple `artifactFingerprint` values for the same
  platform/style choice. This prevents local, phone, credentialed, or publish proof from different
  exported artifacts being merged into one satisfied progress state.
- Blocked/unavailable catalog choices force an invalid progress state even when all requirement
  artifacts are present, so they cannot inflate `proofSatisfiedChoices`.
- Evidence-label-only manifests can remain valid manifests, but they are not applied to every style
  choice; the pack summary records whether each manifest is usable for style-choice progress.
- Exported the pack report API and types through `inkforge/src/services/export/index.ts`.
- Added focused regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`; the new test verifies duplicate
  artifact id reporting, unknown choice reporting, and WeChat/Xiaohongshu/Zhihu isolation.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/style-proof-manifest-pack-report-20260609.txt`.
- Initial verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 65 tests passed after review fixes for fingerprint mismatch and blocked-choice progress.
- Verification refresh:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  4 files / 104 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  35 files / 998 tests passed.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in
  32.21s.
  Build-generated `inkforge/tsconfig.tsbuildinfo` was restored after validation dirtied it.
- Boundary:
  this pack report proves only local proof intake/accounting. It does not prove platform paste,
  phone preview, sync, scheduled send, upload, public host, or publish.

## 2026-06-09 Strong Proof Gate Negative Regression Slice

- Hardened `validateStyleProofManifest()` so weaker proof artifacts cannot satisfy stronger
  platform gates by using only a matching `requirementId`.
- Added explicit `StyleProofAction` value `safe-disposable-draft`.
- `safe-disposable-draft` now requires `action:'safe-disposable-draft'`,
  `channel:'platform-editor'`, `disposableDraft:true`, and a draft-safety readback.
- `cover-thumbnail-check` now requires `channel:'phone-preview'`.
- `sync-readback` now requires `channel:'credentialed-channel'`.
- `published-url-or-platform-preview` now requires `channel:'public-web'` or
  `channel:'phone-preview'`.
- Added focused regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`; the new test proves that
  authenticated editor reachability, PC editor DOM readback, local browser screenshots, and
  PC ClipboardEvent-style paste readback cannot satisfy safe-draft, mobile-preview,
  credentialed-sync, or published gates.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/style-proof-strong-gate-regression-20260609.txt`.
- Initial verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 66 tests passed.
- Verification refresh:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  4 files / 105 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  35 files / 999 tests passed.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in
  40.38s.
  Build-generated `inkforge/tsconfig.tsbuildinfo` was restored after validation dirtied it.
- Boundary:
  this slice proves only local proof-gate enforcement. It does not prove platform paste, phone
  preview, sync, scheduled send, upload, public host, or publish.

## 2026-06-09 Style Proof Acceptance Audit Report Slice

- Added `getPlatformStyleProofAcceptanceAuditReport(platform, manifests)` and
  `getStyleProofAcceptanceAuditReport(manifests)` in
  `inkforge/src/services/export/style-catalog.ts`.
- The audit layer consumes only real caller-supplied redacted `StyleProofManifest` records and
  reuses the existing progress/pack reports. It never creates proof artifacts and never changes
  `selectable`, `usable`, `blocked`, or `unavailable` catalog decisions.
- Each gate and requirement is classified as `completed`, `missing`, `invalid`,
  `blocked-by-external`, or `unsafe-to-automate`.
- The report exposes operator-facing `cannotClaim` rows plus next local-safe, external-account,
  phone, and unsafe-to-automate actions. This keeps ordinary Ctrl+V rich HTML, phone preview,
  Dark Mode, cover thumbnail, credentialed sync, public host, and publish claims separate.
- Exported the acceptance audit API and types through
  `inkforge/src/services/export/index.ts`.
- Added focused regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`; the new tests prove that
  local/unit manifests cannot complete PC paste, phone preview, Dark Mode, cover, sync, or publish
  rows, and that WeChat/XHS/Zhihu acceptance gaps remain isolated in a manifest pack.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/style-proof-acceptance-audit-20260609.txt`.
- Initial verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 68 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  4 files / 107 tests passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  35 files / 1001 tests passed.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in
  43.75s.
  Build-generated `inkforge/tsconfig.tsbuildinfo` was restored after validation dirtied it.
- Boundary:
  this audit report proves only local acceptance accounting and cannot-claim enforcement. It does
  not prove platform paste, phone preview, SMIL/click behavior, Dark Mode, cover thumbnail, sync,
  scheduled send, upload, public host acceptance, or publish success.

## 2026-06-17 Style Proof Acceptance Audit UI Slice

- Wired `getPlatformStyleProofAcceptanceAuditReport(platform)` into
  `inkforge/src/components/export/ExportModal.vue`.
- ExportModal now surfaces the acceptance audit as a read-only UI layer:
  overall style catalog summary includes cannot-claim counts, each style choice card shows a compact
  acceptance audit row plus up to four cannot-claim requirement labels, and export preflight adds a
  `验收宣称审计` row with next local/phone/external/manual gates.
- The UI does not alter style availability, selectable state, preset mapping, export rendering,
  copy, download, draft creation, sync, or publish behavior.
- Extended the real Tauri/WebView2 ExportModal e2e probe so style capability counts must remain
  stable while WeChat/XHS/Zhihu expose the acceptance audit summary and preflight row.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/style-proof-acceptance-ui-20260617.txt`.
- Verification:
  - `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue --quiet` passed.
  - `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
    passed 1 file / 68 tests.
  - `cd inkforge && pnpm exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`
    passed 1 file / 6 tests against the real Tauri/WebView2 runner.
  - `pnpm -C inkforge test:e2e` passed 2 files / 17 tests against the real Tauri/WebView2 runner.
  - `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in 39.18s.
- Boundary:
  this UI slice proves only local cannot-claim surfacing. It does not prove platform paste, phone
  preview, SMIL/click behavior, Dark Mode, cover thumbnail, sync, scheduled send, upload, public
  host acceptance, or publish success.

## 2026-06-17 Committed Local Style Proof Evidence Slice

- Added `getCommittedStyleProofLocalEvidenceManifests()` in
  `inkforge/src/services/export/style-catalog.ts`.
- Added `getCommittedStyleProofLocalEvidenceAuditReport()` as an explicit shorthand for running the
  normal acceptance audit over that committed local manifest pack.
- The helper records only repo-safe local evidence for the three WeChat flagship artifacts:
  `flagship-kiln`, `flagship-tempera`, and `flagship-amber`.
- Each manifest references tracked, redacted evidence under `prompts/0601/evidence/` only:
  the acceptance UI evidence log, the new committed-local-evidence evidence note, and the tracked
  Tauri/WebView2 `e2e/flagship-*.png` screenshots.
- The helper returns cloned manifests so callers cannot mutate the internal committed-evidence
  table.
- The pack proves only local `unit-test-coverage`, `local-browser-rendering`, `exact-artifact`, and
  `no-sensitive-artifact` rows. It does not create artifacts and does not complete PC editor paste,
  safe disposable draft, phone preview, Dark Mode, cover thumbnail, credentialed sync, public host,
  scheduled send, or publish rows.
- `wechat-flagship-amber` remains blocked/invalid even though its local WebView2 screenshot is part
  of the pack; ordinary Ctrl+V/mobile/publish blockers remain separate.
- Added focused regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`; the new test verifies manifest
  cloning, three manifests / twelve safe artifacts, zero duplicate artifact ids, zero sensitive or
  unsafe committed artifacts, satisfied Kiln/Tempera local+hygiene gates, blocked Amber, and
  continued cannot-claim rows for PC paste, phone, Dark Mode, cover, sync, and publish.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/style-proof-committed-local-evidence-20260617.txt`.
- Initial verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 69 tests passed.
- Boundary:
  this helper proves only committed local evidence accounting. It does not prove platform paste,
  phone preview, SMIL/click behavior, Dark Mode, cover thumbnail, sync, scheduled send, upload,
  public host acceptance, XHS/Zhihu account upload, or publish success.

## 2026-06-17 Market Editor DOM Learning Refresh

- Continued the user-directed CloakBrowser-only market-editor learning path without opening
  Playwright or changing browser profile state.
- Recorded a non-sensitive evidence note:
  `prompts/0601/evidence/market-editor-dom-learning-20260617.txt`.
- 135 ordinary editor finding:
  a concrete free style click changed the same-origin center UEditor iframe from five to six
  `section._135editor` blocks. The sampled DOM proves applied style insertion and informs
  hierarchy, rhythm, image-ratio metadata, title/body/card grouping, and insertion-risk rules only.
  `_135editor`, `data-tools`, `data-id`, assistant/editor classes, third-party image hosts,
  copied geometry, copied text, flex/transform/gradient/important dependencies, and template
  source remain forbidden runtime residue.
- 135 SVG editor finding:
  sampled free/trial effects were authoring canvas blocks with data-name effect categories, image
  placeholders, hidden controls, parameter panels, and editor icon SVGs. They convert into
  source-owned image-slot manifests, trigger-zone manifests, motion parameter schema,
  block-order schema, static-expanded fallback, raster fallback, and mobile-preview gates; they do
  not provide reusable private SVG/template source.
- Xiumi finding:
  clicking a visible SVG-gallery sample changed the central paper document, but the sampled center
  document contained image/action/layer cells and zero literal SVG/SMIL nodes. Xiumi preview-library
  SVG counts therefore do not prove final inline-SVG availability. `.tn-*`, `tn-*`, `ng-*`,
  flow-canvas, action/layer, third-party asset host, plugin/copy/sync/export, overflow, and
  line-height-zero authoring state convert into readable DOM order, image manifests, layout
  reports, and fallback artifacts.
- Updated docs/spec surfaces:
  `docs/platform-rendering-rules/market-practices-catalog.md`,
  `.trellis/spec/frontend/wechat-svg-modules.md`,
  `.trellis/spec/frontend/flagship-element-catalog.md`, and
  `prompts/0601/evidence/README.md`.
- Boundary:
  this slice is documentation and evidence only. It does not change runtime code, does not create
  or claim new platform artifacts, and does not prove WeChat mobile preview, mobile SMIL/click,
  mobile Dark Mode, cover thumbnail, ordinary Ctrl+V, plugin transfer, credentialed sync, scheduled
  send, public host acceptance, XHS/Zhihu account upload, or publish success.

## 2026-06-17 Completion Gap Audit Slice

- Added a current-state completion gap audit:
  `prompts/0601/evidence/completion-gap-audit-20260617.txt`.
- The audit supersedes neither the 2026-06-08 completion audit nor the platform gate matrix; it
  layers on top of them with the later 2026-06-09 / 2026-06-17 proof accounting work.
- Inputs reviewed:
  `prompts/0601/PRD.md`, `prompts/0601/SPEC.md`, `prompts/0601/COMPLETION-REPORT.md`,
  `prompts/0601/evidence/README.md`, `.trellis/spec/frontend/wechat-svg-modules.md`, and the
  current proof evidence files.
- The audit classifies AC1-AC10 and platform proof channels as `complete-local`,
  `complete-pc-editor`, `partial`, `missing-external`, or `unsafe-to-automate-now`.
- Current result:
  local renderer behavior, WeChat-safe SVG validation, preset preservation, local Tauri/WebView2
  e2e, XHS/Zhihu local preflight manifests, no-emoji UI icon discipline, style proof accounting,
  acceptance UI, committed local evidence manifests, and market DOM learning are all recorded.
  Final WeChat phone preview, mobile Dark Mode, mobile SMIL/click, cover entry, Amber ordinary
  Ctrl+V or clearly named alternate channel proof, safe disposable draft conditions, credentialed
  sync/readback, scheduled send, public host acceptance, XHS/Zhihu account upload, and publish
  proof remain missing or unsafe to automate automatically.
- Updated evidence/report surfaces:
  `prompts/0601/evidence/README.md` and `prompts/0601/COMPLETION-REPORT.md`.
- Boundary:
  this slice is evidence accounting only. It does not change runtime code, execute platform
  actions, mutate a live editor, open phone preview, sync, upload, schedule, or publish.

## 2026-06-17 Safe Draft Cleanup Proof Gate Slice

- Added `cleanupPathVerified?: boolean` to `StyleProofArtifact`.
- Strengthened `safe-disposable-draft` validation in
  `inkforge/src/services/export/style-catalog.ts`: a PC editor paste proof now needs a
  `safe-disposable-draft` platform-editor artifact with both `disposableDraft:true` and
  `cleanupPathVerified:true` on the same artifact before the draft-safety requirement can be
  satisfied.
- Added the explicit `style-proof-manifest-cleanup-path-missing` issue so manifests that prove a
  disposable draft but not its cleanup/deletion/rollback path stay invalid.
- Added focused regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`; the new test proves that a
  disposable draft without cleanup proof cannot satisfy PC editor paste evidence, while existing
  weak PC/DOM/local artifacts still cannot satisfy phone, sync, publish, or draft-safety gates.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/style-proof-safe-draft-cleanup-gate-20260617.txt`.
- Initial verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 70 tests passed.
- Boundary:
  this slice proves only local proof-gate enforcement. It does not create a disposable draft,
  verify a live platform cleanup path, mutate an editor, open phone preview, sync, upload,
  schedule, or publish.

## 2026-06-17 WeChat Backend Session Preflight Slice

- Ran a CloakBrowser-only read-only preflight against the WeChat Official Account backend home
  path after the safe-draft cleanup gate slice.
- The page reported a timed-out session and exposed no workbench/editor controls in the safe DOM
  probe.
- Added non-sensitive blocked-evidence file:
  `prompts/0601/evidence/wechat-backend-session-preflight-20260617.txt`.
- Boundary:
  this slice is blocked evidence only. It does not prove authenticated editor access, safe draft
  cleanup, PC paste, phone preview, Dark Mode, cover thumbnail, credentialed sync, scheduled send,
  upload, or publish.

## 2026-06-17 Tauri/WebView2 E2E Refresh Slice

- Ran `pnpm -C inkforge test:e2e` against the real Tauri/WebView2 runner.
- Result: 2 spec files / 17 tests passed.
- `svg-render.spec.cjs` verified ExportModal style gates, acceptance audit cannot-claim UI,
  flagship SVG module injection for kiln/tempera/amber, and 20 chars/line mobile-emulated layout.
- `visual.spec.cjs` verified titlebar/chrome controls, brand mark rendering, motion tokens,
  typography rhythm, focus ring, and light/dark theme cascade.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/tauri-e2e-refresh-20260617.txt`.
- Boundary:
  this slice proves local Tauri/WebView2 rendering and UI-gate behavior only. It does not prove
  WeChat phone preview, mobile Dark Mode, mobile SMIL/click interaction, cover thumbnail,
  ordinary Ctrl+V paste, safe disposable draft cleanup, credentialed sync, scheduled send,
  public host acceptance, XHS/Zhihu account upload, or publish success.
- Note:
  WDIO rewrote local `prompts/0601/evidence/e2e/flagship-*.png` files as part of existing spec
  behavior. Those PNGs were pre-existing dirty runtime artifacts and are not staged in this slice.

## 2026-06-17 Local Sensitive Path Redaction Slice

- Reviewed committed `prompts/0601` evidence for local path/profile leakage after the E2E refresh
  commit.
- Redacted local tauri-driver, msedgedriver, debug binary, and CloakBrowser profile absolute paths
  from historical evidence text while preserving the proof results and non-sensitive profile label.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/local-sensitive-path-redaction-20260617.txt`.
- Boundary:
  this is documentation/evidence hygiene only. It does not create new rendering proof, mutate a
  live editor, open phone preview, sync, upload, schedule, publish, or close external platform
  gates.

## 2026-06-17 CloakBrowser Market Editor Applied Refresh Slice

- Used CloakBrowser only to refresh market-editor learning and external platform status.
- 135 SVG editor:
  clicked a visible free-trial SVG effect. The center 336px canvas changed from 4 to 5 blocks,
  `htmlLen` 13636 to 15500, `svg` 5 to 6, and `img` stayed 4.
- 135 ordinary editor:
  clicked a visible non-VIP style item. The center UEditor iframe changed from 5 to 6
  `section._135editor` blocks, 101 to 102 sections, and `svg`/`img` counts stayed stable.
- Xiumi:
  clicked the SVG category and a visible SVG library item. The library exposed SVG/H5 families,
  but the central paper stayed unchanged because the current page was not authenticated and a
  draft-recovery confirmation was present. Neither confirm nor cancel was clicked.
- WeChat:
  backend home still reported a timed-out session and exposed no editor controls.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/market-editor-applied-refresh-20260617.txt`.
- Boundary:
  this slice proves market authoring-rule learning and blocked platform state only. It does not
  prove WeChat phone preview, mobile Dark Mode, mobile SMIL/click interaction, cover thumbnail,
  safe draft cleanup, credentialed sync, scheduled send, XHS/Zhihu account upload, or publish.

## 2026-06-17 Market Editor Applied Proof Gate Slice

- Added `centralEditorChanged?: boolean` to `StyleProofArtifact`.
- Strengthened `market-applied-dom-readback` validation in
  `inkforge/src/services/export/style-catalog.ts`: a market-editor readback now requires
  `action:'applied-market-element'`, `channel:'market-editor'`, DOM or visual+DOM readback, and
  `centralEditorChanged:true` before `applied-editor-element` can be satisfied.
- Added `style-proof-manifest-market-editor-not-applied` so a left library/category/item click,
  settings-panel readback, or preview-library SVG count change cannot be mistaken for a style
  applied into the center editor/canvas/paper.
- Preserved the old missing status when no applied market readback artifact exists at all.
- Added focused regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`; the tests prove a
  center-unchanged Xiumi-style library selection stays invalid while a center-changed market
  editor proof plus hygiene review remains valid.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/market-editor-applied-gate-20260617.txt`.
- Initial verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 72 tests passed.
- Final verification:
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
    4 files / 111 tests passed.
  - `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
    35 files / 1005 tests passed.
  - `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`:
    passed.
  - `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
  - `NODE_OPTIONS=--max-old-space-size=4096 ./node_modules/.bin/vite.cmd build`: exit 0,
    built in 1m 48s.
  - `pnpm -C inkforge build` hit a Node heap out-of-memory failure during `vue-tsc -b` on this
    low-free-memory host; the type and Vite build gates above were rerun separately and passed.
- Boundary:
  this slice proves only local proof-gate enforcement. It does not mutate a live editor, create a
  draft, open phone preview, sync, upload, schedule, publish, or close external platform gates.

## 2026-06-17 Phone Preview Content Proof Gate Slice

- Added `phonePreviewContentVerified?: boolean` to `StyleProofArtifact`.
- Strengthened `phone-preview-readback` validation in
  `inkforge/src/services/export/style-catalog.ts`: a phone-preview proof now requires
  `action:'phone-preview'`, `channel:'phone-preview'`, phone/visual readback, and
  `phonePreviewContentVerified:true` before `mobile-preview` can satisfy final phone readback.
- Added `style-proof-manifest-phone-content-missing` so scan pages, preview entries, setup
  dialogs, cover-setting pages, or PC backend DOM readbacks cannot be mistaken for final
  phone article-body rendering.
- Preserved the old `style-proof-manifest-readback-missing` status when no phone-preview artifact
  exists at all.
- Added focused regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`; the new test proves a
  phone-entry-only artifact stays invalid while phone screenshot, Dark Mode, and cover-thumbnail
  rows remain independently satisfied when their own artifacts are present.
- Added non-sensitive evidence file:
  `prompts/0601/evidence/phone-preview-content-gate-20260617.txt`.
- Initial verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  1 file / 73 tests passed.
- Final verification:
  - `./node_modules/.bin/vitest.cmd run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default --maxWorkers=1 --no-file-parallelism`:
    4 files / 112 tests passed.
  - `./node_modules/.bin/vitest.cmd run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
    35 files / 1006 tests passed.
  - `./node_modules/.bin/eslint.cmd src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`:
    passed.
  - `./node_modules/.bin/vue-tsc.cmd --noEmit --pretty false`: passed.
  - `NODE_OPTIONS=--max-old-space-size=4096 ./node_modules/.bin/vite.cmd build`: exit 0,
    built in 1m 59s.
  - A parallel pnpm 4-file Vitest run hit the existing 5s timeout on the WeChat full-pipeline case
    under local load; the failed file and the 4-file set were rerun through the local Vitest binary
    in serial mode and passed.
- Boundary:
  this slice proves only local proof-gate enforcement. It does not open phone preview, mutate a
  live editor, create a draft, sync, upload, schedule, publish, or close external platform gates.

## 2026-06-17 Phone Dark Mode and Cover Thumbnail Proof Gate Slice

- Implemented:
  - `StyleProofArtifact.darkModeEnabledVerified?: boolean`.
  - `StyleProofArtifact.coverThumbnailAccepted?: boolean`.
  - `style-proof-manifest-dark-mode-not-verified`.
  - `style-proof-manifest-cover-thumbnail-not-accepted`.
- Contract:
  - `dark-mode-check` still needs `action:'dark-mode-check'`, `channel:'phone-preview'`, and
    phone/screenshot/visual readback, but now also needs `darkModeEnabledVerified:true`.
  - `cover-thumbnail-check` still needs `action:'cover-thumbnail-check'`,
    `channel:'phone-preview'`, and phone/screenshot/visual readback, but now also needs
    `coverThumbnailAccepted:true`.
  - Missing readback artifacts remain `missing`; present but weak artifacts become `invalid`.
  - This rule does not alter style availability, selectable, usable, blocked, or unavailable
    states.
- Verification:
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
    passed 1 file / 74 tests.
  - `./node_modules/.bin/vitest.cmd run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default --maxWorkers=1 --no-file-parallelism`:
    passed 4 files / 113 tests.
  - `./node_modules/.bin/vitest.cmd run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
    passed 35 files / 1007 tests.
  - `./node_modules/.bin/eslint.cmd src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`:
    passed.
  - `./node_modules/.bin/vue-tsc.cmd --noEmit --pretty false`: passed.
  - `NODE_OPTIONS=--max-old-space-size=4096 ./node_modules/.bin/vite.cmd build`: passed,
    built in 30.52s.
- Boundary:
  this slice proves only local proof-gate enforcement. It does not open phone preview, mutate a
  live editor, create a draft, sync, upload, schedule, publish, or close external platform gates.

## 2026-06-17 PC Ordinary Clipboard Paste Proof Gate Slice

- Implemented:
  - `StyleProofArtifact.ordinaryClipboardPasteVerified?: boolean`.
  - `style-proof-manifest-ordinary-paste-not-verified`.
- Contract:
  - `pc-editor-paste-event` still needs `action:'pc-paste'` and
    `channel:'platform-editor'`, but now also needs `ordinaryClipboardPasteVerified:true`.
  - Programmatic `ClipboardEvent`/`DataTransfer` readback may remain PC-channel diagnostics, but it
    stays invalid for ordinary user Ctrl+V rich HTML/SVG paste proof.
  - Missing `pc-paste` artifacts remain `missing`; present but weak artifacts become `invalid`.
  - This rule does not alter style availability, selectable, usable, blocked, or unavailable
    states.
- Verification:
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
    passed 1 file / 75 tests.
  - `./node_modules/.bin/vitest.cmd run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default --maxWorkers=1 --no-file-parallelism`:
    passed 4 files / 114 tests.
  - `./node_modules/.bin/vitest.cmd run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
    passed 35 files / 1008 tests.
  - `./node_modules/.bin/eslint.cmd src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`:
    passed.
  - `./node_modules/.bin/vue-tsc.cmd --noEmit --pretty false`: passed.
  - `NODE_OPTIONS=--max-old-space-size=4096 ./node_modules/.bin/vite.cmd build`: passed,
    built in 2m 26s.
- Boundary:
  this slice proves only local proof-gate enforcement. It does not mutate a live editor, create a
  draft, paste into WeChat, open phone preview, sync, upload, schedule, publish, or close external
  platform gates.

## 2026-06-17 WeChat Backend Read-only Preflight

- Added `prompts/0601/evidence/wechat-home-readonly-preflight-20260617.txt`.
- CloakBrowser reached the authenticated WeChat backend home page and read the recent draft list.
- A previously created draft titled `静谧刊印：当排版成为一种克制的力量` was visible.
- A DOM-only attempt to open that existing draft did not navigate away from the home page. A publish
  action became visible in the draft card area, so no further click was attempted.
- No paste, save, preview, sync, upload, schedule, publish, deletion, or draft creation action was
  performed.
- Boundary:
  this proves backend-home reachability only. It does not prove ordinary WeChat Ctrl+V paste,
  PC editor paste, phone preview, mobile Dark Mode, mobile SMIL/click interaction, cover thumbnail,
  safe draft cleanup, credentialed sync, scheduled send, public host acceptance, XHS/Zhihu account
  upload, or publish success.

## 2026-06-17 WeChat Draftbox Read-only Preflight

- Added `prompts/0601/evidence/wechat-draftbox-readonly-preflight-20260617.txt`.
- CloakBrowser reached the authenticated WeChat draftbox list through content management.
- A previously created draft titled `静谧刊印：当排版成为一种克制的力量` was visible.
- The target draft card exposed separate hidden hover actions for delete, edit, and publish.
- The isolated edit action was clicked, but the page stayed on the draftbox list and no article
  editor DOM appeared.
- No paste, save, preview, sync, upload, schedule, publish, deletion, or draft creation action was
  performed.
- Boundary:
  this proves draftbox-list reachability and action taxonomy only. It does not prove ordinary
  WeChat Ctrl+V paste, PC editor paste, phone preview, mobile Dark Mode, mobile SMIL/click
  interaction, cover thumbnail, safe draft cleanup, credentialed sync, scheduled send, public host
  acceptance, XHS/Zhihu account upload, or publish success.

## 2026-06-17 Completion Gap Audit Refresh

- Updated `prompts/0601/evidence/completion-gap-audit-20260617.txt` with:
  - WeChat backend home and draftbox read-only preflight evidence.
  - The stronger proof-gate flags required for ordinary PC paste, phone content, Dark Mode, and
    cover-thumbnail acceptance.
  - The current blocker that the isolated draftbox edit action did not open an article editor DOM.
- Boundary:
  this is a current-state audit refresh only. It does not prove ordinary WeChat Ctrl+V paste,
  PC editor paste, phone preview, mobile Dark Mode, mobile SMIL/click interaction, cover thumbnail,
  safe draft cleanup, credentialed sync, scheduled send, public host acceptance, XHS/Zhihu account
  upload, or publish success.

## 2026-06-18 WeChat Editor DOM Read-only Refresh

- Added `prompts/0601/evidence/wechat-editor-dom-readonly-refresh-20260618.txt`.
- CloakBrowser reached the authenticated WeChat backend home page and read the recent draft cards.
- The visible draft title did not open the editor, and the hidden edit icon was controlled by
  card hover visibility.
- The card Vue component exposed a session-bound editor entry. Rebuilding that entry with the
  active backend session loaded the PC article editor in the current tab.
- DOM readback confirmed:
  - `#js_appmsg_editor`
  - `#editor_pannel`
  - `#js_ueditor`
  - `#js_editor`
  - `.edui-editor`
  - `.ProseMirror ProseMirror-focused`
  - two visible `contenteditable=true` editor nodes
  - bottom actions for save as draft, preview, and publish
- No paste, save, preview, sync, upload, schedule, publish, deletion, or draft creation action was
  performed.
- Updated `prompts/0601/evidence/README.md` and
  `prompts/0601/evidence/completion-gap-audit-20260617.txt` so the previous editor-entry gap is
  narrowed to PC editor reachability/DOM readback while ordinary Ctrl+V, safe disposable draft,
  phone preview, Dark Mode, cover, sync, schedule, publish, XHS upload, and Zhihu public-host gates
  remain open.

## 2026-06-18 Ordinary Paste OS Clipboard Preflight

- Added `inkforge/scripts/set-windows-html-clipboard.ps1`.
- Added `prompts/0601/evidence/wechat-ordinary-paste-os-clipboard-preflight-20260618.txt`.
- Updated `prompts/0601/evidence/README.md`,
  `prompts/0601/evidence/completion-gap-audit-20260617.txt`, and
  `.trellis/spec/frontend/wechat-svg-modules.md`.
- The helper builds Windows CF_HTML payloads for future OS clipboard Ctrl+V tests:
  - wraps the exact artifact in `StartHTML` / `EndHTML` / `StartFragment` / `EndFragment`
    byte offsets
  - provides a UnicodeText fallback when run without `-DryRun`
  - requires `powershell.exe -STA` for real clipboard writes
  - reports artifact filename, byte counts, offsets, SHA-256, SVG count, and `data-ink-svg`
    count without logging local paths
- Dry-run verification passed for:
  - `flagship-amber.html`: `svgCount=35`, `dataInkSvgCount=3`
  - `flagship-kiln.html`: `svgCount=35`, `dataInkSvgCount=3`
  - `flagship-tempera.html`: `svgCount=35`, `dataInkSvgCount=3`
- Boundary:
  this is local OS clipboard payload readiness only. It does not prove ordinary WeChat Ctrl+V
  paste, safe disposable draft cleanup, phone preview, Dark Mode, mobile SMIL/click, cover
  thumbnail, sync, scheduled send, XHS/Zhihu upload, or publish success. The next live proof still
  needs a safe disposable draft, real OS Ctrl+V, editor DOM readback, and verified cleanup.

## 2026-06-18 CloakBrowser OS Ctrl+V Local Probe

- Added `prompts/0601/evidence/cloakbrowser-os-ctrlv-local-probe-20260618.txt`.
- Used CloakBrowser only against a local controlled `data:` page with a focused textarea and
  event listeners for `focus`, `keydown`, `keyup`, `paste`, and `input`.
- Verified the local browser/window path in stages:
  - `WScript.Shell.SendKeys("^v")` after `AppActivate=True` produced no page events.
  - `System.Windows.Forms.SendKeys.SendWait("ABC")` after `AppActivate=True` produced no page
    events.
  - Win32 `keybd_event` produced no textarea value or paste/input event.
  - Win32 `SendInput` needed the correct x64 40-byte `INPUT` union before Windows accepted the
    call.
  - After real window-coordinate clicking, Win32 `SendInput` reached the page only as
    `keydown` events with `key:"Unidentified"`.
  - Scancode and virtual-key-plus-scancode `Ctrl+V` wrote a sentinel to the OS clipboard and
    returned accepted input counts, but the page still reported `valueLength=0`,
    `sentinelMatched=false`, and no `paste` / `input`.
- Updated `prompts/0601/evidence/README.md`,
  `prompts/0601/evidence/completion-gap-audit-20260617.txt`, and
  `.trellis/spec/frontend/wechat-svg-modules.md`.
- Boundary:
  this is negative local tooling evidence only. It does not prove ordinary WeChat Ctrl+V paste or
  justify `ordinaryClipboardPasteVerified:true`. Under the current no-Playwright constraint, a live
  WeChat ordinary-paste attempt remains blocked until a reliable non-Playwright keyboard channel or
  a clearly separated operator-driven paste proof is available, and the safe disposable draft plus
  cleanup readback gate is still required.
- Follow-up regression:
  added a `platform-export-rendering.test.ts` manifest case proving a Win32 `SendInput`
  foreground/key-count artifact without paste/input/sentinel keeps `pc-editor-paste-event`
  invalid and surfaces `style-proof-manifest-ordinary-paste-not-verified`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 76 tests. The command initially failed after reboot because
  `inkforge/node_modules/.bin/vitest` was missing; `pnpm -C inkforge install --frozen-lockfile`
  restored dependencies from the existing lockfile without package-version changes.
- Follow-up verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 115 tests.
- Full export verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1009 tests.

## 2026-06-18 WeChat Draftbox Cleanup Path Read-only Preflight

- Added `prompts/0601/evidence/wechat-draftbox-cleanup-path-readonly-20260618.txt`.
- CloakBrowser reached the authenticated WeChat draftbox list and observed five draft cards.
- Draft cards exposed separate delete, edit, and publish action taxonomy, including delete
  confirmation and cancel affordances.
- The "new creation" dropdown was readable, but its article entry was front-end event handled
  rather than a non-persistent href. It was not clicked because it can create or mutate account
  state.
- Updated `prompts/0601/evidence/README.md`,
  `prompts/0601/evidence/completion-gap-audit-20260617.txt`, and
  `.trellis/spec/frontend/wechat-svg-modules.md`.
- Boundary:
  this is cleanup-affordance evidence only. It does not create, edit, delete, paste, save, preview,
  sync, upload, schedule, publish, set `cleanupPathVerified:true`, or satisfy
  `safe-disposable-draft`.
- Follow-up regression:
  added `platform-export-rendering.test.ts` coverage proving a draftbox delete-confirmation
  affordance doc-reference/source-hygiene artifact keeps `safe-disposable-draft` invalid and
  surfaces both disposable-draft-missing and cleanup-path-missing issues.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 77 tests.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 116 tests.
  `pnpm -C inkforge exec eslint src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1010 tests.

## 2026-06-18 WeChat Session Expired Proof Gate

- Added `prompts/0601/evidence/wechat-session-expired-gate-20260618.txt`.
- CloakBrowser opened the WeChat backend home entry and reached a re-login state rather than an
  authenticated backend/editor surface.
- Added explicit `StyleProofArtifact` flags:
  - `authenticatedSessionVerified`
  - `platformEditorDomVerified`
- Updated `validateStyleProofManifest()` so:
  - `authenticated-editor-url` requires `authenticatedSessionVerified:true`.
  - `pc-editor-dom-readback` requires both `authenticatedSessionVerified:true` and
    `platformEditorDomVerified:true`.
- Added focused regression coverage proving login/expired-session pages cannot satisfy
  authenticated editor reachability or PC editor DOM proof.
- Updated the `authenticated-pc-editor` collection plan/queue note so operator-facing steps mention
  both `authenticatedSessionVerified:true` and `platformEditorDomVerified:true`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 79 tests.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 118 tests.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`
  passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1012 tests.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
  passed; generated `inkforge/tsconfig.tsbuildinfo` was restored before commit.
- Follow-up collection-plan verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 79 tests.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 118 tests.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1012 tests.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`
  passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
  passed; generated `inkforge/tsconfig.tsbuildinfo` was restored before commit.

## 2026-06-18 Style Proof Acceptance Issue IDs Slice

- Added `StyleProofAcceptanceRequirementAudit.issueIds` so acceptance audit requirement rows expose
  the concrete `StyleProofManifestIssueId` values behind `cannotClaim` rows.
- Preserved `issueCount` and all existing progress/availability semantics.
- Added an explicit `StyleProofManifestIssueId` runtime type guard so arbitrary `QualityIssue.id`
  strings are not promoted into the acceptance-audit issue id list.
- Added focused regression coverage proving expired-session / generic DOM WeChat proof remains
  `unsafe-to-automate` and surfaces:
  - `style-proof-manifest-authenticated-session-not-verified`
  - `style-proof-manifest-platform-editor-dom-not-verified`
- Added `prompts/0601/evidence/style-proof-acceptance-issueids-20260618.txt`.
- Verification:
  `npx gitnexus impact getPlatformStyleProofAcceptanceAuditReport -r InkForge --depth 3`
  passed with LOW risk, 1 direct upstream consumer, and 0 affected processes.
  `npx gitnexus impact buildStyleProofAcceptanceRequirementAudits -r InkForge --depth 3`
  passed with LOW risk, 1 direct caller, Export module impact, and 0 affected processes.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 80 tests.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 119 tests.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`
  passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1013 tests.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
  passed; generated `inkforge/tsconfig.tsbuildinfo` was restored before commit.

## 2026-06-18 WeChat Authenticated Draftbox Read-only Refresh

- Added `prompts/0601/evidence/wechat-auth-draftbox-readonly-refresh-20260618.txt`.
- CloakBrowser later reached authenticated WeChat backend home and draftbox list after the earlier
  expired-session negative sample.
- The draftbox list exposed five visible existing draft title candidates, a search input, the
  "new creation" control, and per-card delete/edit/publish action taxonomy.
- The delete icon was identified from its trash SVG path and was not clicked.
- The edit icon was identified from its pencil SVG path, but title click, DOM-dispatched edit
  events, and precise CloakBrowser click all left this run on the draftbox list.
- No PC article editor DOM, iframe, editable editor body, or editor shell selector was present
  after those non-mutating open attempts.
- Updated `prompts/0601/evidence/README.md` and
  `prompts/0601/evidence/completion-gap-audit-20260617.txt` so the evidence timeline is clear:
  the expired-session file remains a negative proof-gate sample, while the later refresh proves
  authenticated backend/draftbox reachability only.
- Boundary: this refresh does not set `platformEditorDomVerified:true`,
  `ordinaryClipboardPasteVerified:true`, or `cleanupPathVerified:true`, and it does not prove paste,
  phone preview, Dark Mode, cover thumbnail, sync, schedule, or publish gates.

## 2026-06-18 WeChat Current Editor DOM Read-only Refresh

- Added `prompts/0601/evidence/wechat-editor-dom-current-readonly-20260618.txt`.
- Continued from the authenticated draftbox read-only refresh without creating, deleting, editing,
  saving, previewing, syncing, scheduling, or publishing any content.
- Inspected the draft card Vue component and confirmed it exposes `editAppmsg`, `editUrl`, and
  editable permission state.
- Rebuilt the editor URL inside the browser with the current authenticated backend session
  parameters; no runtime parameter values were written to docs.
- The PC article editor loaded in the current tab.
- Read-only DOM checks found:
  - `#js_appmsg_editor`
  - `#editor_pannel`
  - `#js_ueditor`
  - `#js_editor`
  - `.edui-editor`
  - `.ProseMirror`
  - toolbar shell
  - two visible `contenteditable=true` editors
  - hidden platform article-preview iframe
- Updated `prompts/0601/evidence/README.md` and
  `prompts/0601/evidence/completion-gap-audit-20260617.txt` to record that current authenticated
  editor reachability and PC editor DOM readback are refreshed, while ordinary paste, artifact
  readback, safe cleanup, phone, Dark Mode, cover, sync, schedule, and publish gates remain open.

## 2026-06-18 WeChat Disposable Draft Runbook

- Added `prompts/0601/evidence/wechat-disposable-draft-runbook-20260618.md`.
- The runbook defines the pre-mutation safety contract for any live WeChat proof:
  - authenticated backend/editor preconditions;
  - redaction boundary;
  - disposable draft creation;
  - ordinary OS Ctrl+V paste requirements;
  - phone/preview checks;
  - cleanup and post-cleanup absence readback;
  - abort conditions;
  - manifest flag mapping.
- It records that current editor DOM reachability is refreshed, but ordinary keyboard paste remains
  blocked by the negative CloakBrowser OS-key probe.
- This is documentation only: no disposable draft was created, pasted into, previewed, deleted, or
  proven absent in this slice.
- Updated `prompts/0601/evidence/README.md` and
  `prompts/0601/evidence/completion-gap-audit-20260617.txt` to point future live-mutation proof at
  the runbook instead of ad hoc account actions.

## 2026-06-18 CloakBrowser OS Ctrl+V Rich HTML Local Probe

- Added `inkforge/scripts/probe-windows-foreground-input.ps1`.
- The helper restores/foregrounds a matching Chromium window, clicks a caller-provided screen
  coordinate, and sends either diagnostic `A` or `Ctrl+V`.
- It keeps `SendInput` available for regression comparison, but the working local keyboard path is
  Windows `keybd_event`.
- Added `-PreserveClipboard` so the helper can send Ctrl+V after
  `inkforge/scripts/set-windows-html-clipboard.ps1` writes a real Windows `HTML Format` payload.
- CloakBrowser-only local controlled-page findings:
  - A stale reused browser state had the CDP target and visible OS tab out of sync, so OS input was
    unsafe there; the browser was restarted before final local proof.
  - `SendInput` still produced only `Unidentified` keydown events in Chromium and no paste/input.
  - `keybd_event` plus calibrated OS click produced trusted local `Control` + `v`, `paste`,
    `beforeinput`, `input`, and sentinel insertion on a textarea page.
  - With `flagship-tempera.html` written to the Windows clipboard as CF_HTML, the same local
    `keybd_event` Ctrl+V path pasted into a controlled contenteditable and read back:
    `paste types=["text/plain","text/html"]`, paste `htmlLength=40474`, resulting
    `svgCount=35`, `dataInkSvgCount=3`, `dataInkBlockCount=23`, and `sectionNice=true`.
- Added `prompts/0601/evidence/cloakbrowser-os-ctrlv-richhtml-local-probe-20260618.txt`.
- Updated `prompts/0601/evidence/README.md`,
  `prompts/0601/evidence/completion-gap-audit-20260617.txt`,
  `prompts/0601/evidence/wechat-disposable-draft-runbook-20260618.md`, and
  `.trellis/spec/frontend/wechat-svg-modules.md`.
- Boundary:
  this unblocks the local non-Playwright ordinary keyboard/CF_HTML precondition only. It does not
  set `ordinaryClipboardPasteVerified:true`, does not prove WeChat editor acceptance, and does not
  remove the safe disposable draft, editor DOM readback, cleanup, phone, Dark Mode, cover, sync,
  schedule, or publish gates.
- Follow-up regression:
  added a `platform-export-rendering.test.ts` manifest case proving local `keybd_event` / CF_HTML
  success on a controlled local page remains invalid for WeChat `pc-editor-paste-event` unless
  authenticated platform-editor paste/readback proof exists.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 81 tests.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 120 tests.
  `pnpm -C inkforge exec eslint src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1014 tests.

## 2026-06-18 WeChat Amber Ordinary Ctrl+V Disposable Draft Proof

- Added `prompts/0601/evidence/wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt`.
- Created deterministic WeChat disposable draft `InkForge disposable proof 20260618-0515`.
- Wrote the exact `flagship-amber.html` artifact to Windows CF_HTML clipboard:
  SHA-256 `09607268931e18aa05244594f941dfd181d24bc6420f3263a022ff263018fa3d`,
  `htmlBytes=42096`, `cfHtmlBytes=42265`, source `svgCount=35`, and source
  `dataInkSvgCount=3`.
- Inserted body content into the authenticated WeChat PC editor by ordinary OS Ctrl+V through the
  Windows `keybd_event` path. The run did not use synthetic ClipboardEvent/DataTransfer, plugin
  transfer, sync, upload, schedule, or publish APIs for body insertion.
- PC editor DOM readback for the disposable draft reported `bodyHtmlLength=43939`,
  `bodyTextLength=1796`, `svgCount=35`, `dataInkSvgCount=3`, `dataInkBlockCount=23`,
  `sectionNice=true`, and `placeholder=false`.
- Cleanup succeeded: the draftbox showed the disposable title before deletion, then the target was
  absent after deletion, absent again on stable DOM readback, and absent after page reload. The list
  count changed from `Article 7` to `Article 6`.
- Follow-up cleanup found one untitled InkForge/Amber residual draft left by earlier Amber attempts.
  It was deleted through the card-level content delete confirmation, not the material delete
  confirmation. Stable and post-reload readbacks reported untitled InkForge/Amber residual count
  `0`, and the final list count was `Article 5`.
- Updated `prompts/0601/evidence/README.md`,
  `prompts/0601/evidence/completion-gap-audit-20260617.txt`,
  `prompts/0601/evidence/wechat-disposable-draft-runbook-20260618.md`,
  `.trellis/spec/frontend/wechat-svg-modules.md`, and `prompts/0601/COMPLETION-REPORT.md`.
- Boundary:
  this closes the WeChat PC ordinary OS Ctrl+V rich HTML/SVG insertion and safe disposable draft
  cleanup proof for `flagship-amber.html` only. It does not prove Kiln/Tempera ordinary paste,
  phone preview, mobile Dark Mode, mobile SMIL/click, cover thumbnail acceptance, credentialed sync,
  scheduled send, public URL, XHS/Zhihu account upload, or publish success.

## 2026-06-18 WeChat Kiln Ordinary Ctrl+V Plain-Text Negative Proof

- Added `prompts/0601/evidence/wechat-kiln-ordinary-ctrlv-plain-text-cleanup-20260618.txt`.
- Wrote the exact `flagship-kiln.html` artifact to Windows CF_HTML clipboard:
  SHA-256 `90581eec1c3cb2805ddc235b8d41725795bfeaf2fc3628c707d485201af0d531`,
  `htmlBytes=41800`, `cfHtmlBytes=41969`, source `svgCount=35`, source
  `dataInkSvgCount=3`, and source `dataInkBlockCount=23`.
- Ran authenticated WeChat PC editor ordinary OS Ctrl+V attempts in a single visible CloakBrowser
  tab for both `type=10` and `type=77` editor URLs. The body editor received content in both
  attempts, but DOM readback degraded to plain text: `bodyTextLength=1790`,
  `bodyHtmlLength=1800`, `svgCount=0`, `dataInkSvgCount=0`, `dataInkBlockCount=0`,
  `sectionNice=false`, and `placeholder=false`.
- The run did not use synthetic ClipboardEvent/DataTransfer, plugin transfer, sync, upload,
  schedule, publish, or DOM source injection for the body content.
- Cleanup succeeded: after returning to draftbox and reloading, the list count was `Article 5`
  with current-run failed title count `0`, recent draft count `0`, Kiln marker/fingerprint count
  `0`, and local path count `0`.
- Updated `prompts/0601/evidence/README.md`,
  `prompts/0601/evidence/completion-gap-audit-20260617.txt`,
  `prompts/0601/evidence/wechat-disposable-draft-runbook-20260618.md`,
  `.trellis/spec/frontend/wechat-svg-modules.md`, and `prompts/0601/COMPLETION-REPORT.md`.
- Boundary:
  this is negative evidence for `flagship-kiln.html` ordinary OS Ctrl+V rich HTML/SVG in the
  current WeChat session. It must not set `ordinaryClipboardPasteVerified:true`, must not satisfy
  `pc-editor-paste-event` or `safe-disposable-draft`, and must not be generalized to Tempera,
  phone preview, mobile Dark Mode, mobile SMIL/click, cover thumbnail, sync, schedule, or publish.

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
- [x] Commit the 2026-06-08 quality-gate hardening refresh only; leave unrelated dirty files
      and QR/platform-preview candidates untouched.
- [x] Commit the 2026-06-08 XHS markdown-gate refresh only; leave unrelated dirty files
      and QR/platform-preview candidates untouched.
- [x] Commit the 2026-06-08 selectable style matrix and WeChat hard-risk gate refresh only;
      leave unrelated dirty files and QR/platform-preview candidates untouched.
- [x] Commit the 2026-06-08 completion audit and cross-platform readability/semantic gates
      refresh only; leave unrelated dirty files and QR/platform-preview candidates untouched.
- [x] Commit the 2026-06-08 style-choice catalog and amber ordinary-paste retry docs/spec/code
      only; leave unrelated dirty files and QR/platform-preview candidates untouched.
- [x] Commit the 2026-06-08 ExportModal style capability gate UI slice only; leave unrelated
      dirty files and QR/platform-preview candidates untouched.
- [x] Commit the 2026-06-08 ExportModal style capability gate e2e slice only; leave unrelated
      dirty files and QR/platform-preview candidates untouched.
- [x] Commit the 2026-06-08 ExportModal WebView2 narrow-preview regression repair only; leave
      unrelated dirty files, pre-existing dirty e2e PNG files, and QR/platform-preview
      candidates untouched.
- [x] Commit the combined 2026-06-09 applied-editor-element evidence-label and block-boundary
      insertion guard runtime slice only; leave unrelated dirty files, pre-existing dirty e2e
      PNG files, QR/platform-preview candidates, and local CloakBrowser screenshots untouched.
- [x] Verify and commit the 2026-06-09 post-reboot amber PC editor readback documentation slice
      only; leave unrelated dirty files, pre-existing dirty e2e PNG files, QR/platform-preview
      candidates, and local CloakBrowser screenshots untouched.
- [x] Verify and commit the 2026-06-09 style proof collection plan slice only; leave unrelated
      dirty files, pre-existing dirty e2e PNG files, QR/platform-preview candidates, local
      CloakBrowser screenshots, profile paths, cookies, tokens, HAR, and account artifacts
      untouched.
- [x] Verify and commit the 2026-06-09 ExportModal style proof gate UI slice only; leave unrelated
      dirty files, pre-existing dirty e2e PNG files, QR/platform-preview candidates, local
      CloakBrowser screenshots, local browser runtime/auth artifacts, and account artifacts untouched.
- [x] Verify and commit the 2026-06-09 style proof collection queue slice only; leave unrelated
      dirty files, pre-existing dirty e2e PNG files, QR/platform-preview candidates, local
      browser runtime/auth artifacts, and account artifacts untouched.

## Honest Non-Goals For This Slice

- This slice does not claim full completion of every historical 06-01 acceptance criterion.
  In particular, fresh live WeChat mobile animation proof requires a separate real paste/mobile
  evidence refresh when platform access is available.
- This slice does not change Xiaohongshu/Zhihu publishable body contracts.
- This slice does not archive the broader 06-01 task unless all acceptance criteria are later
  proven current-state complete.

## 2026-06-18 Kiln Paste-Safe Candidate Slice

- Added additive WeChat preset `flagship-kiln-paste-safe`.
- Added style choice `wechat-flagship-kiln-paste-safe`, mapped to the real
  `flagship-kiln-paste-safe` preset.
- Preserved the existing `flagship-kiln` preset and `cover-grid` module unchanged.
- The candidate keeps Kiln palette, creative persona, Forge divider, and flagship HTML block
  decorators, but uses `cover-title` as the first SVG module.
- Generated committed candidate artifact:
  `prompts/0601/evidence/wechat-paste/flagship-kiln-paste-safe.html`.
- Added evidence:
  `prompts/0601/evidence/wechat-kiln-paste-safe-candidate-local-probe-20260618.txt`.
- Candidate artifact metadata:
  SHA-256 `338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`,
  `htmlBytes=41618`, `cfHtmlBytes=41787`, `svgCount=35`, `dataInkSvgCount=3`,
  `dataInkBlockCount=23`, first module `cover-title`.
- Local CloakBrowser controlled-contenteditable proof with Windows CF_HTML and `keybd_event`
  Ctrl+V preserved `svgCount=35`, `dataInkSvgCount=3`, `dataInkBlockCount=23`,
  `sectionNice=true`, and first module `cover-title`.
- Authenticated WeChat draftbox no-mutation check stayed at `Article 5` with candidate title count
  `0` and current-run marker count `0`. The creation entry did not open a safe disposable editor
  in that state, so the run stopped before platform mutation.

Boundary:
- This is a candidate/local-readiness slice only.
- It must not set `ordinaryClipboardPasteVerified:true`.
- It must not satisfy `pc-editor-paste-event` or `safe-disposable-draft`.
- It does not prove WeChat phone preview, mobile Dark Mode, mobile SMIL/click, cover thumbnail,
  credentialed sync, scheduled send, XHS/Zhihu upload, public URL, or publish success.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/themes-migration.test.ts src/services/export/preset-decorations.test.ts src/services/export/__tests__/flagship-svg.test.ts src/services/export/__tests__/flagship-pipeline-smoke.test.ts src/services/export/__tests__/emit-flagship-artifacts.test.ts src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 6 files / 456 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1043 tests.
- `pnpm -C inkforge exec eslint src/services/export/themes.ts src/services/export/style-catalog.ts src/services/export/__tests__/emit-flagship-artifacts.test.ts src/services/export/__tests__/flagship-svg.test.ts src/services/export/__tests__/flagship-pipeline-smoke.test.ts src/services/export/themes-migration.test.ts src/services/export/preset-decorations.test.ts src/services/export/platform-export-rendering.test.ts src/utils/iconography.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored before staging.

## 2026-06-18 WeChat Kiln Paste-Safe Ctrl+V Tab-Mismatch Cleanup Slice

- Added evidence:
  `prompts/0601/evidence/wechat-kiln-paste-safe-wechat-ctrlv-tab-mismatch-cleanup-20260618.txt`.
- Wrote the exact `flagship-kiln-paste-safe.html` artifact to Windows CF_HTML clipboard:
  SHA-256 `338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`,
  `htmlBytes=41618`, `cfHtmlBytes=41787`, source `svgCount=35`, source
  `dataInkSvgCount=3`, and source `dataInkBlockCount=23`.
- Authenticated WeChat PC editor attempts used CloakBrowser only plus ordinary Windows
  `keybd_event` Ctrl+V. No synthetic ClipboardEvent/DataTransfer, plugin transfer, sync, upload,
  schedule, or publish API was used for body insertion.
- The intended deterministic-title editor stayed unchanged after target attempts:
  `bodyTextLength=8`, `bodyHtmlLength=298`, `svgCount=0`, `dataInkSvgCount=0`,
  `dataInkBlockCount=0`, and the WeChat body placeholder remained present.
- The visible OS foreground tab and the CloakBrowser-bound DOM target were later found to be
  different WeChat editor tabs. The foreground tab received a large InkForge HTML/SVG body, but
  the content was mojibake-damaged and titleless; it was therefore invalid as proof.
- Cleanup succeeded:
  - deterministic title queries for `20260618-1606` and `20260618-1620` returned no matches;
  - one recent empty-title current-run candidate was identified only by content fingerprint
    (`contentLength=209829`, `svgCount=175`, `dataInkBlockCount=115`, `dataInkSvgCount=15`,
    `replacementCharCount=5720`);
  - the redacted candidate AppMsgId was deleted through WeChat `operate_appmsg` with `ret=0`;
  - post-delete checks returned deterministic title matches `0`, deleted-candidate matches `0`,
    and current-run empty/default-title InkForge-like residue candidates `0`.

Boundary:
- This is negative WeChat evidence for `flagship-kiln-paste-safe.html`.
- It must not set `ordinaryClipboardPasteVerified:true`.
- It must not satisfy `pc-editor-paste-event` or `safe-disposable-draft`.
- Future ordinary Ctrl+V proof must first ensure the visible OS foreground WeChat tab and the
  CloakBrowser DOM readback target are the same editor, and must reject mojibake/replacement-char
  body readbacks even when large SVG counts are present.

## 2026-06-18 WeChat Kiln Paste-Safe Single-Tab Ctrl+V No-Paste Slice

- Added evidence:
  `prompts/0601/evidence/wechat-kiln-paste-safe-wechat-ctrlv-single-tab-nopaste-20260618.txt`.
- Added `-NoClick` to `inkforge/scripts/probe-windows-foreground-input.ps1`.
  The helper can now foreground a matching Chromium window and send keyboard input without moving
  the mouse or changing the already focused editor.
- Reused the exact `flagship-kiln-paste-safe.html` artifact and Windows CF_HTML payload:
  SHA-256 `338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`,
  `htmlBytes=41618`, `cfHtmlBytes=41787`, source `svgCount=35`, source
  `dataInkSvgCount=3`, and source `dataInkBlockCount=23`.
- In a fresh same-tab authenticated WeChat `type=77` editor, the shell existed, the page was
  visible, `document.hasFocus()` was true, the body `.ProseMirror` was focused, and a CloakBrowser
  click on that body editor succeeded.
- `System.Windows.Forms.SendKeys("^v")` did not trigger paste. Readback stayed at
  `bodyTextLength=8`, `bodyHtmlLength=298`, `svgCount=0`, `dataInkSvgCount=0`, and
  `dataInkBlockCount=0`.
- Windows `keybd_event` through the new `-NoClick` path also did not trigger paste. It matched one
  foreground Chromium window and sent `keybdEventCount=4`, but the body stayed unchanged with the
  same counts.
- Cleanup/absence check after returning home found deterministic title `20260618-1650` matches
  `0` and recent empty/default-title InkForge-like residue candidates `0`.

Boundary:
- This is negative WeChat evidence for `flagship-kiln-paste-safe.html`.
- It must not set `ordinaryClipboardPasteVerified:true`.
- It must not satisfy `pc-editor-paste-event` or `safe-disposable-draft`.
- Foreground-window match, page focus, body focus, and OS key event counts are insufficient without
  a real paste/input event or same-editor body DOM change.

## 2026-06-18 WeChat PC Paste Strong Gate Slice

- Added optional `StyleProofArtifact` fields:
  `sameEditorTabVerified`, `pasteInputEventVerified`, `editorBodyMutationVerified`, and
  `mojibakeFreeVerified`.
- Strengthened `pc-editor-paste-event`: one same `platform-editor` / `pc-paste` artifact must now
  carry all ordinary paste flags:
  `ordinaryClipboardPasteVerified:true`, `sameEditorTabVerified:true`,
  `pasteInputEventVerified:true`, `editorBodyMutationVerified:true`, and
  `mojibakeFreeVerified:true`.
- Added issue ids for weak or unbound paste proof:
  `style-proof-manifest-paste-editor-tab-not-verified`,
  `style-proof-manifest-paste-input-not-verified`,
  `style-proof-manifest-editor-body-not-mutated`,
  `style-proof-manifest-paste-mojibake-not-ruled-out`, and
  `style-proof-manifest-paste-proof-not-bound`.
- Added regression tests proving:
  - same-tab focused OS key evidence with no paste/input and no body DOM mutation remains invalid;
  - wrong-tab or mojibake-damaged readback remains invalid;
  - strong paste flags split across multiple artifacts remain invalid.
- Added evidence:
  `prompts/0601/evidence/wechat-pc-paste-strong-gate-20260618.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 84 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 123 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1046 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored before staging.

Boundary:
- This is local manifest validator proof only.
- It does not prove WeChat ordinary Ctrl+V rich HTML/SVG acceptance for Kiln paste-safe, phone
  preview, Dark Mode, cover thumbnail, sync, schedule, XHS/Zhihu upload, public URL, or publish.

## 2026-06-18 Market Editor DOM/CSS Learning Slice

Inputs:
- CloakBrowser-only live sampling of Xiumi v5 paper editor, 135 SVG editor, and 135 ordinary WeChat
  editor.
- Public cross-check of doocs/md and OpenSVG repository descriptions.
- Grok Search was attempted but returned no usable result content for this query.

Observed rules:
- Xiumi SVG list previews can expose literal SVG/SMIL/foreignObject, but the applied center canvas
  can become image cells plus `tn-*` authoring layers. This is fallback-manifest evidence, not
  inline-SVG proof.
- Xiumi title/card templates use dense nested authoring cells, image ornaments, background images,
  transforms, negative margins, and inline width/height rules. InkForge should translate those into
  source-owned title, card, callout, timeline, QA, image-frame, gallery, poster, and long-image
  modules.
- 135 SVG effects use typed effect identities, image slots, hidden triggers, hot zones, tall
  `viewBox=0 0 1080 1920` layers, background sizing, and gap-removal layout heuristics.
- 135 ordinary editor styles are nested section grammars and useful visual references, but their
  `_135editor`, `135brush`, `135bg`, `data-tools`, market data ids, vendor class names, and hosted
  media references are forbidden residue.

Docs/evidence updated:
- Added `prompts/0601/evidence/market-editor-dom-css-learning-20260618.txt`.
- Updated `prompts/0601/evidence/README.md`.
- Updated `prompts/0601/research/wechat-svg-typesetting-patterns.md`.
- Updated `.trellis/spec/frontend/wechat-svg-modules.md`.
- Updated `prompts/0601/SPEC.md`.
- Updated `prompts/0601/COMPLETION-REPORT.md`.

Boundary:
- This slice records rule extraction and spec constraints only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, sync,
  schedule, XHS/Zhihu upload, public host, or publish success.

## 2026-06-18 Market Editor Hosted Background Residue Gate Slice

Impact:
- `npx gitnexus impact collectMarketEditorResidues -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted items, 1 direct caller, 0 affected processes, and only the Export
  module affected.

Implementation:
- Added a `MARKET_EDITOR_RESIDUE_RULES` pattern for CSS `url(...)` references to 135/Xiumi hosted
  media.
- Added `MARKET_EDITOR_BACKGROUND_RESIDUE_HTML` and a three-platform regression proving WeChat,
  Xiaohongshu, and Zhihu fail quality reports with `market editor hosted background source`.
- Added centralized style catalog blocker injection so all WeChat, Xiaohongshu, and Zhihu style
  choices expose the matching market-residue detector blocker.
- Added evidence:
  `prompts/0601/evidence/market-editor-residue-background-gate-20260618.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 85 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 124 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1047 tests.

Boundary:
- This is a local detector gate only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, sync,
  scheduled-send, XHS/Zhihu account upload, public host acceptance, or publish success.

## 2026-06-18 Style Acceptance ExportModal E2E Refresh Slice

Impact:
- `npx gitnexus impact "File:inkforge/tests/e2e/specs/svg-render.spec.cjs" -r InkForge -d upstream --include-tests`
  reported LOW risk, 0 impacted items, and 0 affected processes.

Initial run:
- `pnpm exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`
  failed with 5 passing / 1 failing.
- Failure reason: the spec still expected WeChat `7/15`, but real ExportModal reported
  `8/16`, `cardCount=16`, `availableCount=8`, `blockedCount=4`, and `unavailableCount=4`.

Implementation:
- Updated `inkforge/tests/e2e/specs/svg-render.spec.cjs` to assert the current runtime WeChat
  catalog counts.
- Added evidence:
  `prompts/0601/evidence/style-acceptance-exportmodal-e2e-20260618.txt`.

Verification:
- Re-ran `pnpm exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`.
- Result: passed with 1 spec / 6 tests.
- The passing spec verified real Pinia draft seeding, ExportModal style gates, acceptance
  cannot-claim UI, phone-preview next action, Kiln/Tempera/Amber responsive `[data-ink-svg]`
  rendering, and mobile-emulated `charsPerLine=20`.

Boundary:
- This is local Tauri/WebView2 proof only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, sync,
  scheduled-send, XHS/Zhihu account upload, public host acceptance, or publish success.

## 2026-06-18 Full Tauri/WebView2 E2E Refresh Slice

Scope:
- Re-ran the full local Tauri/WebView2 WDIO suite after the ExportModal acceptance-count refresh.
- No source behavior changed in this slice; this records the full-suite acceptance evidence.

Verification:
- `pnpm test:e2e` passed with 2 specs / 17 tests.
- `tests/e2e/specs/svg-render.spec.cjs` passed with 6 tests:
  real Pinia draft seeding, ExportModal style gates, cannot-claim UI, phone-preview next action,
  Kiln/Tempera/Amber responsive `[data-ink-svg]`, and mobile-emulated `charsPerLine=20`.
- `tests/e2e/specs/visual.spec.cjs` passed with 11 tests:
  titlebar controls, brand mark, motion/type/easing/focus styles, and light/dark theme cascade.
- The run emitted an EdgeDriver version warning for Edge 149 compatibility coverage, but all WDIO
  assertions passed.

Evidence:
- Added `prompts/0601/evidence/full-tauri-e2e-refresh-20260618.txt`.

Boundary:
- This is local Tauri/WebView2 UI/rendering proof only.
- It does not prove WeChat phone QR preview final rendering, mobile SMIL/click interaction, mobile
  Dark Mode, cover thumbnail acceptance, ordinary WeChat Ctrl+V rich HTML/SVG acceptance,
  credentialed sync, scheduled-send, XHS/Zhihu account upload, public host acceptance, or publish
  success.

## 2026-06-18 135 Applied Text Slot Residue Gate Slice

Impact:
- `npx gitnexus impact collectMarketEditorResidues -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted items, 1 direct caller, 0 affected processes, and only the Export
  module affected.

Market editor readback:
- Continued the CloakBrowser-only 135 ordinary editor path.
- The first click on free style `#style-173703` did not mutate the center editor because no valid
  UEditor insertion range was established.
- After focusing the central UEditor iframe body and setting a collapsed insertion range, clicking
  `#style-173703` changed the central editor iframe:
  `data-id="173703"` changed from `0` to `1`, body child count changed from `4` to `5`, and body
  HTML length changed from `20627` to `22552`.
- The applied block used nested sections, inline flex/gradient/border/margin layout, and 135 text
  slot metadata: `data-brushtype`, `autonum[data-num]`, plus style-list metadata
  `style_id/style_name/style_price`.

Implementation:
- Extended `MARKET_EDITOR_RESIDUE_RULES` with:
  - `135 editable brush slot`
  - `135 automatic numbering marker`
  - `135 style-list metadata`
- Added `MARKET_EDITOR_SLOT_RESIDUE_HTML` regression coverage proving WeChat, Xiaohongshu, and
  Zhihu reject those residues even when `_135editor`, `135brush`, and `data-tools` wrappers are
  absent.
- Added evidence:
  `prompts/0601/evidence/135-applied-text-slot-residue-gate-20260618.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 86 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 125 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1048 tests.
- `pnpm -C inkforge exec eslint src/services/export/quality-detector.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored before staging.

Boundary:
- This is local detector proof only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, ordinary
  WeChat Ctrl+V rich HTML/SVG acceptance, credentialed sync, scheduled-send, XHS/Zhihu account
  upload, public host acceptance, or publish success.

## 2026-06-18 Style Proof Execution Runbook Slice

Scope:
- Added a read-only local operator runbook above the style proof acceptance audit.
- The runbook consumes caller-supplied redacted `StyleProofManifest[]` and does not create
  artifacts, mutate platforms, sync, upload, schedule, or publish.

Implementation:
- Added `StyleProofExecutionArtifactContract`, `StyleProofExecutionRunbookStep`,
  `PlatformStyleProofExecutionRunbook`, and `StyleProofExecutionRunbook`.
- Added `getPlatformStyleProofExecutionRunbook(platform, manifests)` and
  `getStyleProofExecutionRunbook(manifests)`.
- Exported the new types/functions through `inkforge/src/services/export/index.ts`.
- Added regression tests in `platform-export-rendering.test.ts` for committed local evidence and
  cross-platform runbook isolation.

Proof contract highlights:
- Ordinary WeChat PC paste requires one same `platform-editor` / `pc-paste` artifact with
  `artifactFingerprint`, `exactArtifact`, authenticated editor/DOM flags,
  `ordinaryClipboardPasteVerified`, same-tab/paste-input/body-mutation/mojibake flags, and
  `safeForCommit`.
- Phone preview, Dark Mode, and cover thumbnail remain separate phone-preview proof rows.
- Zhihu public-host proof exposes accepted host statuses `public-https` and `platform-hosted`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 92 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 131 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1054 tests.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored before staging.

Boundary:
- This is local execution-runbook proof only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, ordinary
  WeChat Ctrl+V rich HTML/SVG acceptance, credentialed sync, scheduled-send, XHS/Zhihu account
  upload, public host acceptance, or publish success.

## 2026-06-18 Xiumi Applied Runtime Binding Residue Gate Slice

Impact:
- `npx gitnexus impact collectMarketEditorResidues -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted items, 1 direct caller, 0 affected processes, and only the Export
  module affected.

Market editor readback:
- Continued the CloakBrowser-only Xiumi v5 paper editor path after restoring the existing local
  draft prompt, without saving, exporting, syncing, uploading, or publishing.
- Clicking the `SVG` category changed the visible library from 23 to 43 template items. The first
  visible SVG sample inserted into the center `.tn-editing-panel` with `htmlLength +32007`,
  `tnComp +15`, `tnCell +18`, `contenteditable +1`, `img +3`, and `tnUuid +15`.
- Clicking the `Title` category and first visible title sample inserted into the center editor with
  `htmlLength +15313`, `tnComp +6`, `tnCell +7`, `contenteditable +1`, `img +6`, and
  `opera-tn-ra-*` counts increasing with component/cell counts.
- Clicking the `Card` category and first visible card sample inserted into the center editor with
  `htmlLength +30728`, `tnComp +17`, `tnCell +21`, `contenteditable +7`, `img +3`, and
  `opera-tn-ra-*` counts increasing with component/cell counts.
- The applied readbacks exposed Xiumi runtime binding attributes such as `opera-tn-ra-comp`,
  `opera-tn-ra-cell`, and preview-side `disable-tn-group-flex-box`, plus existing `tn-*`,
  `ng-*`, and hosted `statics.xiumi.us` residue signals.

Implementation:
- Extended `MARKET_EDITOR_RESIDUE_RULES` with `Xiumi runtime binding attribute`.
- Added `MARKET_EDITOR_XIUMI_BINDING_RESIDUE_HTML` regression coverage proving WeChat,
  Xiaohongshu, and Zhihu reject copied Xiumi runtime binding attributes.
- Added evidence:
  `prompts/0601/evidence/xiumi-applied-runtime-binding-residue-gate-20260618.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 88 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 127 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1050 tests.
- `pnpm -C inkforge exec eslint src/services/export/quality-detector.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored before staging.

Boundary:
- This is local detector proof and market-editor rule extraction only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, ordinary
  WeChat Ctrl+V rich HTML/SVG acceptance, credentialed sync, scheduled-send, XHS/Zhihu account
  upload, public host acceptance, or publish success.

## 2026-06-19 WeChat Editor DOM Surface Validator Slice

Impact:
- GitNexus `validateStyleProofRequirementCoverage` impact reported LOW risk: 1 direct caller,
  1 affected process (`progressChoices`), and only the Export module affected.
- GitNexus `STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS` impact reported LOW risk with 0 affected
  processes.

Implementation:
- Extended the `pc-editor-dom-readback` execution artifact contract so PC editor DOM proof must
  include `platformEditorSurfaceVerified:true`.
- Added `style-proof-manifest-platform-editor-surface-not-verified` validation for
  `pc-editor-dom-readback` when the manifest proves a session, article-editor target, and DOM
  nodes but never proves the main body editing surface.
- Updated the `authenticated-pc-editor` collection note and execution runbook fields so operator
  workflows collect `platformEditorSurfaceVerified:true` for PC DOM readback, not only for PC
  paste.
- Added regression coverage for title/hidden-frame/shell-style DOM evidence that lacks verified
  body-surface identity.
- Added evidence:
  `prompts/0601/evidence/wechat-editor-dom-surface-validator-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 114 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 153 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1087 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in 33.13s.
- `inkforge/tsconfig.tsbuildinfo` was restored after validation.

Boundary:
- This is local validator/runbook proof only.
- It does not prove ordinary WeChat Ctrl+V rich HTML/SVG acceptance, live editor body mutation,
  WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, credentialed sync,
  scheduled-send, platform preview, public article rendering, XHS/Zhihu account upload, public
  host acceptance, or publish success.

## 2026-06-19 WeChat PC Paste Artifact Binding Validator Slice

Impact:
- GitNexus `validateStyleProofRequirementCoverage` impact reported LOW risk: 1 direct caller,
  1 affected process (`progressChoices`), and only the Export module affected.
- GitNexus `STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS` impact reported LOW risk with 0 affected
  processes.

Implementation:
- Extended `pc-editor-paste-event` complete proof so one same `platform-editor` / `pc-paste`
  artifact must carry artifact fingerprint, `exactArtifact:true`,
  `authenticatedSessionVerified:true`, target/surface/DOM proof, ordinary Ctrl+V proof, same-tab
  proof, paste/input proof, editor-body mutation proof, mojibake-free readback, and
  `safeForCommit:true`.
- Added `style-proof-manifest-safe-commit-not-verified`.
- Extended split-proof detection so exact-artifact, authenticated-session, editor-DOM, and
  safe-commit fields are also part of the same-artifact binding check.
- Added regression coverage for strong paste flags missing exact/authenticated/DOM binding and
  updated split multi-artifact coverage.
- Added evidence:
  `prompts/0601/evidence/wechat-pc-paste-artifact-binding-validator-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 115 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 154 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1088 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in 31.57s.
- `inkforge/tsconfig.tsbuildinfo` was restored after validation.

Boundary:
- This is local validator/runbook proof only.
- It does not prove ordinary WeChat Ctrl+V rich HTML/SVG acceptance, live editor body mutation,
  WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, credentialed sync,
  scheduled-send, platform preview, public article rendering, XHS/Zhihu account upload, public
  host acceptance, or publish success.

## 2026-06-19 WeChat Tempera Ordinary Ctrl+V Input-Bridge Blocked Slice

Live platform attempt:
- Used CloakBrowser only against the authenticated WeChat new-article editor surface.
- Source artifact `flagship-tempera.html` was written to Windows CF_HTML clipboard with SHA-256
  `d173f8dd2ba807b2fe90b7f0c2a6dea7907a3672d6c225fc0acc918751392585`, `svgCount=35`,
  `dataInkSvgCount=3`, and `dataInkBlockCount=23`.
- The editor body started and ended placeholder-only: `bodyTextLength=8`, `bodyHtmlLength=298`,
  `svgCount=0`, `dataInkSvgCount=0`, and `dataInkBlockCount=0`.
- `keybd_event`, `SendInput`, body-coordinate clicks, and `WScript.Shell.AppActivate + SendKeys`
  all failed to produce page `keydown`, `paste`, `beforeinput`, `input`, trusted paste/input, or
  editor body DOM mutation.
- The temporary title was cleared after the attempt; no body residue was created.

Evidence:
- Added `prompts/0601/evidence/wechat-tempera-ordinary-ctrlv-input-bridge-blocked-20260619.txt`.
- Updated `prompts/0601/evidence/README.md` and `prompts/0601/COMPLETION-REPORT.md`.

Boundary:
- This is input-bridge-blocked negative evidence only. It does not prove WeChat accepts or rejects
  Tempera rich HTML/SVG and must not satisfy `ordinaryClipboardPasteVerified:true`,
  `pasteInputEventVerified:true`, `editorBodyMutationVerified:true`, `pc-editor-paste-event`,
  `safe-disposable-draft`, phone preview, Dark Mode, cover thumbnail, sync, schedule, public
  rendering, or publish gates.

## 2026-06-19 WeChat Tempera Ordinary Ctrl+V Mojibake Cleanup Slice

Live platform attempt:
- Used CloakBrowser only.
- Recovered the Windows input path by visually selecting the CloakBrowser-controlled target tab and
  calibrating DPI-scaled OS coordinates with a transient contenteditable probe.
- Wrote exact `flagship-tempera.html` to Windows CF_HTML clipboard with SHA-256
  `d173f8dd2ba807b2fe90b7f0c2a6dea7907a3672d6c225fc0acc918751392585`.
- Same-visible-tab WeChat PC editor ordinary OS Ctrl+V produced trusted paste and body mutation.
- DOM readback preserved rich structure: `svgCount=35`, `dataInkSvgCount=3`,
  `dataInkBlockCount=23`, `styleTagCount=0`, `scriptCount=0`, `foreignObjectCount=0`, and
  `localPathLeakInEditor=false`.
- Text was mojibake-damaged: `replacementCharCount=1118`, `mojibakeHintCount=1118`.

Cleanup:
- The deterministic title `InkForge tempera proof 20260619-1136` was found as the top draft-list
  item after reload, with target content containing data-ink markup.
- The session-bound credentialed platform delete endpoint returned `base_resp.ret=0`.
- Two post-delete reload readbacks reported itemCount `6`, title matches `0`, target content
  matches `0`, and the target app id absent.

Evidence:
- Added `prompts/0601/evidence/wechat-tempera-ordinary-ctrlv-mojibake-cleanup-20260619.txt`.
- Updated `prompts/0601/evidence/README.md` and `prompts/0601/COMPLETION-REPORT.md`.

Boundary:
- This is still negative for complete Tempera PC paste acceptance because mojibake is present.
- It proves ordinary OS Ctrl+V reachability, rich SVG/data-ink structure survival, and cleanup
  only. It must not satisfy `pc-editor-paste-event`, `mojibakeFreeVerified:true`, phone preview,
  Dark Mode, cover thumbnail, sync, schedule, public rendering, or publish gates.

## 2026-06-19 WeChat New Article Editor CloakBrowser Readback Slice

External editor readback:
- Continued the WeChat editor target identity gate with CloakBrowser only.
- No screenshot, form fill, paste, save, preview, sync, phone preview, scheduled send, publish,
  delete, or draft cleanup action was performed.
- Raw credential parameters, account text, article titles, article body, page text samples, raw
  network URLs, browser session secrets, and local runtime paths were not recorded.
- The authenticated article-list page exposed delete/edit/publish operation labels in the card
  operation layer. The edit-shaped control was positively separated from delete and publish controls
  by generic operation labels and sibling placement.
- Clicking the existing card edit-shaped control still remained on the list route shape.
- The static WeChat list bundle exposed the official new-article route shape
  `t=media/appmsg_edit_v2`, `action=edit`, `isNew=1`, `type=10`.
- The browser then navigated in-page to the new-article editor route by reusing the current
  authenticated query. Sensitive query parameters were not recorded.

Readback:
- The final authenticated page shape was `/cgi-bin/appmsg` with `media/appmsg_edit_v2`,
  `action=edit`, `isNew=1`, and `type=10`.
- Selector counts were iframe 1, visible iframe 0, `contenteditable=true` 3, visible
  contenteditable 2, textarea 2, visible textarea 1, ProseMirror 2, known JS editor ids 31,
  appmsg-edit signals 16, rich-media signals 1, `#js_content` signals 1, title/input signals 103,
  cover signals 46, visible save/preview controls 2, and visible publish/send controls 1.
- The visible main body editor was a ProseMirror contenteditable under a
  `mock-iframe` / `mock-iframe-document` / `mock-iframe-body` wrapper, not a visible native iframe
  editing document.
- Main body ProseMirror geometry was approximately width 586px, height 538px, font-size 17px,
  line-height 27.2px, `white-space: break-spaces`, `word-break: break-word`, and
  `max-width: 100%`.
- Title ProseMirror geometry was approximately width 578px, height 30px, font-size 24px,
  line-height 30px, and `word-break: break-all`.
- Empty main body editor embedded counts were SVG 0, `foreignObject` 0, style 0, image 0,
  section 1, paragraph 0, and span 1.

Evidence:
- Added `prompts/0601/evidence/wechat-new-article-editor-cloakbrowser-readback-20260619.txt`.
- Updated `.trellis/spec/frontend/wechat-svg-modules.md` so ordinary WeChat PC paste proof must
  target the main body ProseMirror mock-iframe surface and cannot be inferred from route discovery,
  list-card controls, `cloak_fill`, hidden native iframes, title fields, or ClipboardEvent-style
  local injection.

Boundary:
- This proves authenticated new-article editor surface reachability and redacted DOM identity only.
- It does not prove ordinary PC Ctrl+V rich HTML/SVG paste, editor body mutation, safe disposable
  draft cleanup, phone preview, mobile SMIL/click interaction, mobile Dark Mode, cover thumbnail,
  credentialed sync, scheduled-send, platform preview, public article rendering, or publish
  success.

## 2026-06-19 WeChat Editor Surface Validator Slice

Impact:
- GitNexus impact on `StyleProofArtifact`, `STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS`, and
  `getStyleProofManifestPackReport` reported LOW risk with 0 affected execution flows.

Implementation:
- Added `StyleProofArtifact.platformEditorSurfaceVerified?: boolean`.
- Added `platformEditorSurfaceVerified` to the style-proof execution artifact verification fields.
- Added `style-proof-manifest-platform-editor-surface-not-verified`.
- Extended the `pc-editor-paste-event` contract and validator so ordinary WeChat PC paste proof must
  bind the same `platform-editor` / `pc-paste` artifact to the exact editor target surface.
- Updated same-artifact split-proof detection so target-surface proof cannot be supplied by a
  separate row.
- Updated the committed Amber PC proof row with the new surface flag.
- Added a regression proving that all ordinary paste flags still fail when the platform editor body
  surface is not verified.
- Updated `.trellis/spec/frontend/wechat-svg-modules.md` with the main-body ProseMirror
  mock-iframe target-surface contract.
- Added `prompts/0601/evidence/wechat-editor-surface-validator-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 113 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 152 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1086 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in
  26.43s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.

Boundary:
- This is local validator/runbook proof only.
- It does not prove ordinary WeChat Ctrl+V rich HTML/SVG acceptance, editor body mutation in the
  live platform, phone preview, mobile SMIL/click interaction, mobile Dark Mode, cover thumbnail,
  credentialed sync, scheduled-send, platform preview, public article rendering, or publish
  success.

## 2026-06-19 External Account Proof Contract Validator Slice

Impact:
- `npx gitnexus impact validateStyleProofRequirementCoverage -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted symbols, 1 direct dependent, and 1 affected process
  (`progressChoices`).
- `npx gitnexus impact STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS -r InkForge -d upstream --include-tests`
  reported LOW risk, 0 impacted symbols, and 0 affected processes.

Implementation:
- Added validator issue `style-proof-manifest-external-account-auth-missing`.
- Added a local helper that requires positive `externalAccountAuthenticated:true` for proof rows
  whose execution contract already lists that field as required.
- Tightened `credentialed-channel-response` and `sync-readback` so matching channel/action/readback
  is insufficient unless the same proof artifact also records positive external account
  authentication readback.
- Tightened `published-url-or-platform-preview` so only `public-web` or `credentialed-channel`
  proof can satisfy the row; `phone-preview` proof remains scoped to mobile preview and cannot
  satisfy platform-publish.
- Updated the WeChat positive published-preview fixture to carry
  `externalAccountAuthenticated:true`.

Regression coverage:
- Missing positive external account authentication invalidates `credentialed-channel-response`,
  `sync-readback`, and `published-url-or-platform-preview`.
- A `phone-preview` shaped artifact cannot satisfy `published-url-or-platform-preview`, even with
  positive-looking phone preview fields.
- Single-factor blocker tests cover `externalAccountLoginBlocked:true`,
  `externalAccountAuthenticated:false`, and `action:'external-account-login-readback'`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  passed with 1 file, 108 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  passed with 4 files, 147 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  passed with 35 files, 1081 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in 26.28s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.

Boundary:
- This is local validator/runbook proof only.
- It does not prove account authentication, upload surface availability, public-host acceptance,
  platform preview, public article rendering, scheduled-send, or publish success.

## 2026-06-19 Public Host ArtifactRef Validator Slice

Impact:
- `npx gitnexus impact validateStyleProofRequirementCoverage -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted symbols, 1 direct dependent, and 1 affected process
  (`progressChoices`).
- `npx gitnexus impact getStyleProofAcceptanceAuditStatus -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted symbols, 2 direct dependents, and 0 affected processes.

Implementation:
- Tightened `public-image-host` so accepted host proof must use `channel:'public-web'`, action
  `public-image-host-check`, readback `visual` / `dom` / `manifest`, and accepted host status
  `public-https` or `platform-hosted`.
- Reused `style-proof-manifest-artifact-ref-missing` for public-host rows that have accepted
  host status but no non-empty `artifactRef`.
- Acceptance requirement rows carrying `style-proof-manifest-artifact-ref-missing` now report
  `invalid`, so bad public-host evidence is not collapsed into generic `blocked-by-external`.

Regression coverage:
- A Zhihu public-host proof row with `hostStatus:'public-https'` but no `artifactRef` remains
  invalid in both manifest report and acceptance cannot-claim rows.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  passed with 1 file, 109 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  passed with 4 files, 148 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  passed with 35 files, 1082 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in 28.73s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.

Boundary:
- This is local validator/runbook proof only.
- It does not prove public-host acceptance, account upload, platform preview, public article
  rendering, scheduled-send, or publish success.

## 2026-06-19 Published Preview Exact Artifact Validator Slice

Impact:
- `npx gitnexus impact validateStyleProofRequirementCoverage -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted symbols, 1 direct dependent, and 1 affected process
  (`progressChoices`).

Implementation:
- Tightened `published-url-or-platform-preview` so accepted publish/platform-preview proof must
  be a `public-web` or `credentialed-channel` `published-preview` row with accepted readback,
  `externalAccountAuthenticated:true`, and `exactArtifact:true` on the same artifact.
- Reused `style-proof-manifest-exact-artifact-missing` for publish/platform-preview rows that are
  authenticated but not bound to the exact exported artifact under review.
- Acceptance requirement rows carrying `style-proof-manifest-exact-artifact-missing` now report
  `invalid`, so an old public URL or different article preview cannot be treated as merely
  pending external proof.
- Updated the WeChat positive published-preview fixture to carry `exactArtifact:true`.

Regression coverage:
- A WeChat public-web published URL row with `externalAccountAuthenticated:true` but without
  `exactArtifact:true` remains invalid in both manifest report and acceptance cannot-claim rows.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  passed with 1 file, 110 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  passed with 4 files, 149 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  passed with 35 files, 1083 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in 26.04s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.

Boundary:
- This is local validator/runbook proof only.
- It does not prove account authentication, platform preview, public article rendering,
  scheduled-send, or publish success.

## 2026-06-19 Phone Matrix Exact Artifact Validator Slice

Impact:
- `npx gitnexus impact validateStyleProofRequirementCoverage -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted symbols, 1 direct dependent, and 1 affected process
  (`progressChoices`).
- `npx gitnexus impact getStyleProofAcceptanceAuditStatus -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted symbols, 2 direct dependents, and 0 affected processes.

Implementation:
- Tightened `phone-preview-readback` so final phone article body proof must carry
  `phonePreviewContentVerified:true` and `exactArtifact:true` on the same phone-preview artifact.
- Tightened `dark-mode-check` so accepted Dark Mode proof must carry
  `phonePreviewContentVerified:true`, `darkModeEnabledVerified:true`, and `exactArtifact:true` on
  the same proof artifact.
- Tightened `cover-thumbnail-check` so accepted cover proof must carry
  `coverThumbnailAccepted:true` and `exactArtifact:true` on the same proof artifact.
- Reused `style-proof-manifest-exact-artifact-missing` for unbound phone/Dark Mode/cover rows.

Regression coverage:
- A manifest with separate local exact-artifact proof but unbound phone-preview, Dark Mode, and
  cover-thumbnail artifacts remains invalid for each phone matrix row and in acceptance
  cannot-claim output.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  passed with 1 file, 111 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  passed with 4 files, 150 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  passed with 35 files, 1084 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in
  23.68s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.

Boundary:
- This is local validator/runbook proof only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail,
  scheduled-send, or publish success.

## 2026-06-19 Phone Screenshot Exact Artifact Validator Slice

Impact:
- `npx gitnexus impact validateStyleProofRequirementCoverage -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted symbols, 1 direct dependent, and 1 affected process
  (`progressChoices`).
- `npx gitnexus impact getStyleProofAcceptanceAuditStatus -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted symbols, 2 direct dependents, and 0 affected processes.

Implementation:
- Tightened the `phone-screenshot` runbook row so required fields now include
  `artifactFingerprint` and `exactArtifact`.
- Tightened `phone-screenshot` validation so accepted screenshot proof must carry
  `phonePreviewContentVerified:true` and `exactArtifact:true` on the same phone-preview screenshot
  artifact.
- Extended the exact-artifact regression so phone-preview readback, phone screenshot, Dark Mode,
  and cover thumbnail rows all remain invalid when their positive-looking proof is not bound to the
  exact artifact.
- Added evidence:
  `prompts/0601/evidence/phone-screenshot-exact-artifact-validator-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  passed with 1 file, 111 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  passed with 4 files, 150 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  passed with 35 files, 1084 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in
  28.23s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.

Boundary:
- This is local validator/runbook proof only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail,
  scheduled-send, or publish success.

## 2026-06-19 Exact Artifact Fingerprint Validator Slice

Impact:
- `npx gitnexus impact validateStyleProofRequirementCoverage -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted symbols, 1 direct dependent, and 1 affected process
  (`progressChoices`).
- `npx gitnexus impact getStyleProofAcceptanceAuditStatus -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted symbols, 2 direct dependents, and 0 affected processes.

Implementation:
- Tightened generic `exact-artifact` validation so a bare `exactArtifact:true` flag is no longer
  enough without a non-empty `artifactFingerprint` on the same proof row.
- Added a regression proving exact-artifact proof without fingerprint remains invalid in the
  manifest report and acceptance cannot-claim output.
- Added evidence:
  `prompts/0601/evidence/exact-artifact-fingerprint-validator-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`:
  passed with 1 file, 112 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`:
  passed with 4 files, 151 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`:
  passed with 35 files, 1085 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`:
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed, Vite built in
  24.59s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.

Boundary:
- This is local validator/runbook proof only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, sync,
  scheduled-send, platform preview, public article rendering, or publish success.

## 2026-06-19 WeChat Draft List CloakBrowser Readback Slice

Scope:
- Continued WeChat external-gate verification with CloakBrowser only.
- Performed a read-only backend home and draft-list state check.
- No screenshot, form fill, paste, save, sync, phone preview, scheduled send, publish, delete, or
  draft mutation was performed.
- Raw URL token, account text, article titles, and page text samples were not recorded.

Observed:
- The active CloakBrowser session reached the authenticated WeChat backend home surface.
- The draft-list route was reached through the page's own draft-list link.
- Redacted route shape:
  `/cgi-bin/appmsg?begin=0&count=10&type=77&action=list_card&<credential-token-redacted>&lang=zh_CN`.
- Draft-list readyState was `complete`.
- Login/relogin blocker signals were absent in the draft-list readback.
- Draft/list/create navigation signals were present.
- The page remained a draft-list surface, not an article editor body.
- Redacted selector counts: iframe 0, contenteditable editor nodes 0, textarea 0, ProseMirror 0,
  editor-like containers 6, draft/card-like containers 64, buttons 31, anchors 93.

Evidence:
- Added `prompts/0601/evidence/wechat-draft-list-cloakbrowser-readback-20260619.txt`.

Boundary:
- This is authenticated draft-list reachability evidence only.
- It does not prove authenticated article editor target readback, ordinary PC paste, editor body
  mutation, safe disposable draft cleanup, WeChat phone preview, mobile interaction, Dark Mode,
  cover thumbnail, credentialed sync, scheduled send, platform preview, public article rendering,
  or publish success.

## 2026-06-19 WeChat Draft Edit Entry CloakBrowser Readback Slice

Scope:
- Continued WeChat external-gate verification with CloakBrowser only.
- Performed a read-only draft edit-entry check from the authenticated draft-list surface.
- No screenshot, form fill, paste, save, sync, phone preview, scheduled send, publish, delete, or
  draft mutation was performed.
- Raw credential parameters, account text, article titles, draft body, page text samples, raw
  network URLs, browser session secrets, and local runtime paths were not recorded.

Observed:
- A visible draft-card small-icon group was inspected by structure only.
- The delete-shaped control and publish-shaped control were distinguished from the edit-shaped
  control by parent wrapper text flags and control placement.
- Only the edit-shaped control was clicked.
- After waiting for the active page to settle, the active CloakBrowser page remained on the
  draft-list route shape.
- Login/relogin blocker signals were absent.
- Editor-body, save, preview, cover, and title-field editor signals were absent.
- Redacted selector counts after edit-entry click: iframe 0, contenteditable editor nodes 0,
  textarea 0, ProseMirror 0, editor-like class/id nodes 6, rich-media/appmsg-edit/js-editor nodes 0,
  known JS editor ids 0.

Evidence:
- Added `prompts/0601/evidence/wechat-draft-edit-entry-cloakbrowser-readback-20260619.txt`.

Boundary:
- This proves authenticated draft-list and edit-shaped control reachability only.
- It does not prove authenticated article editor DOM, ordinary PC paste, editor body mutation, safe
  disposable draft cleanup, WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail,
  credentialed sync, scheduled send, platform preview, public article rendering, or publish
  success.

## 2026-06-19 WeChat Session Relogin CloakBrowser Readback Slice

Scope:
- Continued WeChat external-gate verification with CloakBrowser only.
- Opened the backend article-list path after the local restart and current proof-gate work.
- No Playwright, screenshot, form fill, account action, draft mutation, paste, phone preview, sync,
  scheduled send, or publish action was performed.

Observed:
- The page path was the WeChat backend article-list path.
- Page readyState was complete.
- Login/relogin text signal was present.
- Create, publish, and editor text signals were absent.
- Redacted editor selector counts were zero for `.ProseMirror`, contenteditable article bodies,
  iframe nodes, and textarea nodes.
- A visible navigation path to the login page was present.

Evidence:
- Added `prompts/0601/evidence/wechat-session-relogin-cloakbrowser-readback-20260619.txt`.

Boundary:
- This is relogin platform-state evidence only.
- It does not prove authenticated editor URL, PC editor DOM readback, safe disposable draft,
  ordinary PC paste, phone preview, Dark Mode, cover thumbnail, sync, scheduled-send, platform
  preview, public article rendering, or publish success.

## 2026-06-19 WeChat Phone Preview Matrix Validator Slice

Impact:
- `npx gitnexus impact validateStyleProofManifest -r InkForge -d upstream --include-tests`
  reported LOW risk, 6 impacted items, 4 direct dependents, and 1 affected process.
- `npx gitnexus impact STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS -r InkForge -d upstream --include-tests`
  reported LOW risk and 0 impacted items.
- `npx gitnexus impact getPlatformStyleProofAcceptanceAuditReport -r InkForge -d upstream --include-tests`
  reported LOW risk, 6 impacted items, 4 direct dependents, and 0 affected processes.

Scope:
- Hardened local style-proof validation for WeChat phone preview, phone screenshot, mobile Dark
  Mode, and cover-thumbnail rows.
- No phone scan, browser screenshot, draft mutation, paste, sync, scheduled send, or publish action
  was performed in this slice.

Implementation:
- Added `StyleProofAction` value `phone-preview-entry-readback`.
- Added `StyleProofArtifact.phonePreviewBlocked?: boolean`.
- Added `phonePreviewBlocked` to `StyleProofArtifactVerificationField`.
- Added validator issue `style-proof-manifest-phone-preview-blocked`.
- Marked explicit phone preview blocker artifacts invalid when `phonePreviewBlocked:true` or
  `action:'phone-preview-entry-readback'`.
- Required `phone-screenshot` proof to use `action:'phone-preview'` and
  `phonePreviewContentVerified:true`.
- Required `dark-mode-check` proof to include `phonePreviewContentVerified:true` in addition to
  `darkModeEnabledVerified:true`.
- Acceptance audit requirement rows carrying the phone preview blocker issue now report `invalid`
  rather than generic `blocked-by-external`.

Regression coverage:
- Scan/setup/PC-preview-shell readbacks cannot satisfy phone preview readback, phone screenshot,
  Dark Mode, or cover thumbnail matrix rows.
- Phone screenshot setup states and Dark Mode shell screenshots remain invalid until final phone
  article content is verified.
- Existing fully evidenced fixtures now carry `phonePreviewContentVerified:true` on phone screenshot
  and Dark Mode artifacts.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 104 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 143 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1077 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in
  26.74s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.

Evidence:
- Added `prompts/0601/evidence/wechat-phone-preview-matrix-validator-20260619.txt`.

Boundary:
- This is local validator/runbook proof only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail,
  credentialed sync, scheduled-send, platform preview, public article rendering, or publish
  success.

## 2026-06-19 XHS/Zhihu Account Login Gate Readback Slice

Scope:
- Continued external gate verification with CloakBrowser only.
- Checked Xiaohongshu creator and Zhihu write-entry login/editor states without filling forms,
  uploading assets, opening platform publish dialogs, syncing, scheduling, or publishing.

Observed:
- `https://creator.xiaohongshu.com/new/home` redirected to the Xiaohongshu creator login route.
- The XHS page exposed login text, credential/verification inputs, and no file-upload input.
- No XHS image upload, platform preview, or publish surface was reachable in the current browser
  profile.
- `https://zhuanlan.zhihu.com/write` redirected to the Zhihu sign-in route.
- The Zhihu page exposed verification-code login controls, no `.ProseMirror`, no contenteditable
  editor, no textarea, and no file-upload input.
- No Zhihu editor preview, platform image upload, public-host readback, or publish surface was
  reachable in the current browser profile.

Evidence:
- Added `prompts/0601/evidence/xhs-zhihu-account-login-gate-readback-20260619.txt`.

Boundary:
- This is external account gate readback only.
- XHS/Zhihu local artifact manifests remain preflight proof and do not satisfy account upload,
  platform preview, public article rendering, scheduled-send, or publish success.

## 2026-06-19 WeChat Create Entry CloakBrowser Stability Block Slice

Scope:
- Continued the WeChat article-editor target identity gate with CloakBrowser only.
- Performed authenticated readback and CloakBrowser selector-click attempts on the visible
  new-creation control.
- No Playwright, OS-coordinate click, JavaScript synthetic click, paste, draft mutation, phone
  preview, sync, upload, scheduled send, or publish action was performed.

Observed:
- Current page stayed on authenticated `/cgi-bin/appmsg`; login containers were absent.
- Editor shell selectors, article-body contenteditable nodes, iframe nodes, textarea nodes, and
  deterministic sentinels were absent.
- Redacted counts: appmsg-family links 5, draft/create-related links 2, button-like controls 31,
  create-related text matches 6.
- One visible primary new-creation button was present. Repeated geometry samples kept the same
  position and size, and `document.elementFromPoint()` at the center resolved to the same button.
- CloakBrowser selector clicks against the visible button failed the element-stability gate twice.
- CloakBrowser selector clicks against the outer operation group and default span also failed the
  element-stability gate.
- The toolbar operation group contained create-option DOM text, but the real dropdown container
  remained `display:none`; dropdown list items had zero-size rects.

Evidence:
- Added `prompts/0601/evidence/wechat-create-entry-cloakbrowser-stability-blocked-20260619.txt`.

Boundary:
- This is blocked platform evidence only.
- It does not prove `platformEditorTargetVerified`, authenticated editor URL, PC editor DOM
  readback, safe disposable draft, ordinary PC paste, cleanup, phone preview, Dark Mode, cover
  thumbnail, sync, scheduled-send, platform preview, public article rendering, or publish success.

## 2026-06-19 External Account Login Blocker Validator Slice

Impact:
- `npx gitnexus impact validateStyleProofManifest -r InkForge -d upstream --include-tests`
  reported LOW risk, 6 impacted items, 4 direct dependents, and 1 affected process.
- `npx gitnexus impact STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS -r InkForge -d upstream --include-tests`
  reported LOW risk and 0 impacted items.
- `npx gitnexus impact StyleProofArtifact -r InkForge -d upstream --include-tests`
  reported LOW risk and 2 impacted items.

Scope:
- Converted the XHS/Zhihu account login gate readback into executable local validator/runbook
  rules.
- No browser retry, form fill, upload, sync, phone preview, scheduled send, or publish action was
  performed in this slice.

Implementation:
- Added `StyleProofAction` value `external-account-login-readback`.
- Added `StyleProofArtifact.externalAccountAuthenticated?: boolean`.
- Added `StyleProofArtifact.externalAccountLoginBlocked?: boolean`.
- Added `style-proof-manifest-external-account-login-blocked`.
- Added both external-account fields to `StyleProofArtifactVerificationField`.
- Exposed `externalAccountAuthenticated` in the credentialed-channel, sync-readback, and platform-
  publish execution artifact contracts.
- Kept compatibility for older valid manifests by invalidating only explicit blockers:
  `externalAccountLoginBlocked:true`, `externalAccountAuthenticated:false`, or
  `action:'external-account-login-readback'`.
- Acceptance audit requirement rows carrying the blocker issue now report `invalid`; ordinary
  missing external-account and publish gates remain `blocked-by-external` or
  `unsafe-to-automate`.

Regression coverage:
- Xiaohongshu creator login-gate readback cannot satisfy upload preview or publish proof.
- Zhihu sign-in readback cannot satisfy public image host, artifact manifest upload, or publish
  proof.
- Login blockers keep the affected artifact report rows invalid and surface the blocker issue
  through cannot-claim requirement rows.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 103 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 142 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1076 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in
  26.65s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.

Evidence:
- Added `prompts/0601/evidence/external-account-login-blocker-validator-20260619.txt`.

Boundary:
- This is local validator/runbook proof only.
- It does not prove XHS/Zhihu account authentication, upload surface availability, platform
  preview, public host acceptance, public article rendering, scheduled-send, or publish success.

## 2026-06-19 WeChat Existing Draft Edit Entry Blocked Slice

Scope:
- Continued the WeChat article-editor target identity gate with CloakBrowser only.
- Attempted the visible existing-draft title entry and the visible edit affordance path without
  paste, save, delete, preview, sync, upload, scheduled send, or publish.

Observed:
- A visible existing draft title link was tagged without recording its text. CloakBrowser selector
  click returned ok, but the page stayed on `/cgi-bin/appmsg`.
- Three seconds after the title click, `.ProseMirror`, article-body contenteditable nodes, iframe
  nodes, textarea nodes, visible editor-like nodes, and deterministic sentinels were still absent.
- The draft card action layer exposed one visible edit candidate among hidden edit/publish
  affordances, but the candidate's computed `visibility` resolved to `hidden`.
- Repeated geometry samples kept that edit candidate at the same position and size. Its center
  resolved to the parent card action layer rather than a directly visible edit element.
- CloakBrowser selector click on the tagged edit candidate failed the element-stability gate.

Evidence:
- Added `prompts/0601/evidence/wechat-existing-draft-edit-entry-blocked-20260619.txt`.

Boundary:
- This is blocked platform evidence only.
- It does not prove `platformEditorTargetVerified`, authenticated editor URL, PC editor DOM
  readback, safe disposable draft, ordinary PC paste, cleanup, phone preview, Dark Mode, cover
  thumbnail, sync, scheduled-send, platform preview, public article rendering, or publish success.

## 2026-06-19 Platform Editor Target Identity Gate Slice

Impact:
- `npx gitnexus impact validateStyleProofManifest -r InkForge -d upstream --include-tests`
  reported LOW risk, 6 impacted items, 4 direct dependents, and 1 affected process.
- `npx gitnexus impact getPlatformStyleProofProgressReport -r InkForge -d upstream --include-tests`
  reported LOW risk, 8 impacted items, 3 direct dependents, and 0 affected processes.
- `npx gitnexus impact StyleProofArtifact -r InkForge -d upstream --include-tests`
  reported LOW risk, 2 impacted items.
- `npx gitnexus impact STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS -r InkForge -d upstream --include-tests`
  reported LOW risk and 0 impacted items.

Scope:
- Converted the 2026-06-19 WeChat draftbox article-menu block and OS-click calibration abort into
  executable local validator/runbook gates.
- No platform action, browser click retry, phone preview, sync, upload, scheduled send, or publish
  action was performed in this slice.

Implementation:
- Added `StyleProofArtifact.platformEditorTargetVerified?: boolean`.
- Added `platformEditorTargetVerified` to `StyleProofArtifactVerificationField`.
- Added `style-proof-manifest-platform-editor-target-not-verified`.
- Required `platformEditorTargetVerified` for `authenticated-editor-url`,
  `pc-editor-dom-readback`, and `pc-editor-paste-event` artifact contracts.
- Updated committed Amber PC proof artifacts to set the field only for the exact committed Amber
  ordinary OS Ctrl+V proof.
- Updated manifest validation so an authenticated dashboard, draftbox, create-menu, menu, or shell
  page cannot satisfy article-editor target proof from `authenticatedSessionVerified:true` alone.
- Updated paste validation so OS click, hover, render-window, and wrong-tab diagnostics cannot
  satisfy ordinary PC paste without exact editor target identity.

Regression coverage:
- Authenticated draftbox create/article-menu readbacks with active session but no article-editor
  target keep `authenticated-editor-url` and `pc-editor-dom-readback` invalid.
- OS click calibration diagnostics keep `safe-disposable-draft` and `pc-editor-paste-event`
  unclaimable and emit target/paste/cleanup issues.
- Same-tab no-paste proof can isolate paste/input/body mutation failures without target false
  positives.
- Wrong-tab or mojibake proof emits target identity failure.
- Runbook required fields expose `platformEditorTargetVerified` for authenticated PC editor proof.

Evidence:
- Added `prompts/0601/evidence/platform-editor-target-identity-gate-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 101 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 140 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1074 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored before staging.

Boundary:
- This is local validator/runbook proof only.
- It does not prove WeChat editor opening, ordinary Ctrl+V rich paste success, safe disposable draft
  cleanup, phone preview, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host,
  platform preview, public article rendering, or publish success.

## 2026-06-19 CloakBrowser Market Editor Applied Rule Refresh

Impact:
- `npx gitnexus impact detectQuality -r InkForge --depth 3` reported LOW risk, 4 directly
  impacted symbols, 1 affected module, and 0 affected processes. Direct callers remain
  `convertToNativeFormat`, `detectQualityAll`, `quickCheck`, and `ExportModal.vue`.

Market editor readback:
- Continued the CloakBrowser-only 135/Xiumi market-editor learning path, without saving,
  exporting, syncing, uploading, phone previewing, scheduling, or publishing.
- 135 ordinary editor: a free style click that mutates the center iframe with only an empty
  `_135editor` placeholder is recorded as insertion-risk evidence, not applied style proof.
- 135 SVG editor: free-trial trigger-canvas effects exposed authoring wrappers such as
  `app-content-canvas`, `block-img__content`, and `ant-tooltip-open`, plus trigger-zone and
  expanded-content concepts.
- Xiumi SVG sample: center paper mutation can appear as `tn-svg-animation-carousel`,
  flow-canvas, `tn-yzk-font-*`, `tn-placeholder`, `opera-tn-ra-*`, and Angular authoring state
  rather than literal inline SVG.

Implementation:
- Extended `MARKET_EDITOR_RESIDUE_RULES` so 135 SVG trigger canvas wrappers and Xiumi SVG
  carousel/flow-canvas authoring metadata fail as market editor residue across WeChat,
  Xiaohongshu, and Zhihu.
- Added `MARKET_EDITOR_135_SVG_TRIGGER_RESIDUE_HTML` and
  `MARKET_EDITOR_XIUMI_SVG_CAROUSEL_RESIDUE_HTML` regression coverage.
- Updated `.trellis/spec/frontend/wechat-svg-modules.md`,
  `docs/platform-rendering-rules/market-practices-catalog.md`,
  `docs/platform-rendering-rules/wechat-rules.md`, `docs/微信渲染规则.md`, and evidence docs.
- Added evidence:
  `prompts/0601/evidence/market-editor-applied-rule-refresh-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 99 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 138 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1072 tests.
- `pnpm -C inkforge exec eslint src/services/export/quality-detector.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in 36.30s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build generated-cache updates.

Boundary:
- This is local detector proof and market-editor rule extraction only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, ordinary
  WeChat Ctrl+V rich HTML/SVG acceptance, credentialed sync, scheduled-send, XHS/Zhihu account
  upload, public host acceptance, platform preview, public article rendering, or publish success.

## 2026-06-19 WeChat Draftbox Create Menu Readback Slice

Browser readback:
- Used CloakBrowser only.
- Returned to the authenticated WeChat backend home route after the previous no-op create-entry
  block.
- Direct navigation to the bare draftbox path returned a relogin prompt, proving naked backend
  paths cannot be treated as valid editor/draftbox proof.
- Triggering the authenticated backend DOM draftbox link reached the draftbox route without
  relogin.
- The draftbox page had no editor shell, no `.ProseMirror`, and no `contenteditable` body.
- The toolbar create menu opened and exposed an article-like item plus non-article/import choices.
  The article item was not selected, and no editor/draft/paste/preview/sync/upload/publish action
  occurred.

Docs/evidence:
- Added `prompts/0601/evidence/wechat-draftbox-create-menu-readback-20260619.txt`.
- Updated `.trellis/spec/frontend/wechat-svg-modules.md`, `prompts/0601/evidence/README.md`, and
  `prompts/0601/COMPLETION-REPORT.md`.

Verification:
- `git diff --check -- <slice docs>` passed.
- Staged sensitive scan passed with zero output for local profile paths, query parameters, cookies,
  HAR, QR, capture artifacts, and browser-state markers.

Boundary:
- This is redacted create-menu reachability only.
- It does not prove safe-disposable-draft, authenticated editor URL, editor DOM readback, ordinary
  Ctrl+V rich HTML/SVG acceptance, phone preview, mobile interaction, Dark Mode, cover thumbnail,
  credentialed sync, scheduled-send, upload, public host acceptance, platform preview, public
  article rendering, or publish success.

## 2026-06-19 WeChat Draftbox Article Menu Click Blocked Slice

Scope:
- Continued the authenticated draftbox path with CloakBrowser only.
- Attempted to select the visible article item from the draftbox create menu without bypassing the
  platform UI.
- No editor opened, no draft was created, no title/body was changed, no clipboard/paste action was
  attempted, and no preview/sync/upload/publish action was triggered.

Observed:
- The authenticated draftbox route stayed reachable and was not a relogin page.
- The create menu exposed article, existing-content import, sticker, video, podcast, and reprint
  item families.
- DOM click and calibrated OS mouse clicks did not open an article editor.
- CloakBrowser selector clicks against the article list item, inner container, and text span were
  blocked by element-stability failures.
- A diagnostic in-page pointer/mouse event sequence closed the menu but is not trusted user proof
  and did not open an editor.
- Post-attempt readback stayed on `/cgi-bin/appmsg`; editor shell selectors, `.ProseMirror`,
  article-body contenteditable nodes, iframe nodes, textarea nodes, and the deterministic sentinel
  all stayed absent.

Evidence:
- Added `prompts/0601/evidence/wechat-draftbox-article-menu-click-blocked-20260619.txt`.

Boundary:
- This is authenticated draftbox article-menu selection block evidence only.
- It does not prove `authenticated-editor-url`, `pc-editor-dom-readback`,
  `safe-disposable-draft`, `pc-editor-paste-event`, ordinary Ctrl+V rich HTML/SVG acceptance,
  phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload,
  public host, platform preview, public article rendering, or publish success.

## 2026-06-19 WeChat OS Click Calibration Abort Slice

Scope:
- Continued the same authenticated draftbox route with CloakBrowser only.
- Tested whether Win32 mouse injection could safely target the visible create button before any
  further article-item selection.
- No editor opened, no draft was created, no title/body was changed, no clipboard/paste action was
  attempted, and no preview/sync/upload/publish action was triggered.

Observed:
- Browser geometry, Win32 top-level window rectangle, render-window hit testing, and
  `document.elementFromPoint()` were compared for the intended create-button point.
- The candidate screen point landed on a Chromium render window and the intended page coordinate
  matched the visible create button, but Win32 `mouse_event` and `SendInput` did not open the
  create menu.
- CSS hover diagnostics showed the actual OS cursor path was not safely bound to the intended DOM
  target and intersected a draft-card region.
- The hover diagnostic contained private draft/card text, so only the redacted conclusion is
  recorded.
- Final readback stayed on `/cgi-bin/appmsg`; editor shell selectors, `.ProseMirror`, article-body
  contenteditable nodes, iframe nodes, textarea nodes, create-menu items, and the deterministic
  sentinel all stayed absent.

Evidence:
- Added `prompts/0601/evidence/wechat-os-click-calibration-abort-20260619.txt`.

Boundary:
- This is OS-click calibration abort evidence only.
- It does not prove `authenticated-editor-url`, `pc-editor-dom-readback`,
  `safe-disposable-draft`, `pc-editor-paste-event`, ordinary Ctrl+V rich HTML/SVG acceptance,
  phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload,
  public host, platform preview, public article rendering, or publish success.

## 2026-06-19 Completion Gap Audit Refresh Slice

Scope:
- Added a current-state completion gap audit after the latest WeChat entry attempts.
- No source code changed and no platform action was executed by this audit.

Evidence:
- Added `prompts/0601/evidence/completion-gap-audit-20260619.txt`.

Findings:
- This audit predated the Tempera entity-safe committed manifest refresh. Current committed PC
  accounting includes Amber raw ordinary OS Ctrl+V proof and Tempera entity-safe ordinary OS
  Ctrl+V proof with safe disposable draft cleanup.
- Kiln and Kiln paste-safe remain blocked for exact WeChat PC ordinary rich paste proof; raw UTF-8
  Tempera direct paste remains unproven.
- WeChat article-editor entry is currently blocked-safe-abort because OS-coordinate clicking was
  not safely bound to the intended DOM target.
- Phone preview, mobile interaction, Dark Mode, cover thumbnail, credentialed sync, scheduled-send,
  platform preview, public rendering, and publish success remain external gates.
- XHS/Zhihu local manifests remain preflight only until account/platform or public-host proof exists.

Boundary:
- This is gap accounting only.
- It does not create new platform proof or close any external phone, sync, upload, public-host,
  platform preview, public article rendering, scheduled-send, or publish gate.

## 2026-06-19 E2E SVG Render Refresh Slice

Scope:
- Non-mutating local verification after the style-proof artifact manifest validation slice.
- No WeChat draft mutation, no phone preview, no sync, no upload, no scheduled-send, and no publish.

Verification:
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite transformed 4652
  modules and built in 24.15s.
- `pnpm -C inkforge exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`
  passed with a real Cargo-built Tauri debug binary, WebView2 149.0.4022.69, 1 spec file, and 6
  tests.
- WDIO re-confirmed the real ExportModal style capability gates across WeChat, Xiaohongshu, and
  Zhihu.
- WDIO re-confirmed responsive `[data-ink-svg]` module injection for `flagship-kiln`,
  `flagship-tempera`, and `flagship-amber`.
- The flagship body line-rhythm assertion remained at `charsPerLine=20`.
- `inkforge/tsconfig.tsbuildinfo` was restored after build dirtied the generated cache.

Evidence:
- Added `prompts/0601/evidence/e2e-svg-render-refresh-20260619.txt`.

Boundary:
- This proves local production build and real Tauri/WebView2 SVG ExportModal behavior only.
- It does not prove WeChat phone preview, mobile SMIL/click interaction, mobile Dark Mode,
  cover-thumbnail acceptance, credentialed sync, scheduled-send, Xiaohongshu account upload,
  Zhihu public-host acceptance, platform preview, public article rendering, or publish success.

## 2026-06-19 WeChat Create Entry No-op Readback Slice

Scope:
- Non-paste authenticated browser preflight for the next disposable-draft proof step.
- No editor opened, no title/body mutation, no clipboard write, no paste, no save, no preview, no
  delete, no sync, no scheduled-send, and no publish.

Observed:
- Authenticated backend home remained reachable and was not a login page.
- The deterministic disposable-draft sentinel prefix `InkForge disposable proof 20260619` had 0
  matches before and after the attempts.
- The visible article create entry existed.
- A DOM click plus two browser-layer clicks against the visible article create nodes did not open
  the editor.
- Post-attempt readback stayed on `/cgi-bin/home`, with editor shell count 0, ProseMirror count 0,
  contenteditable count 0, sentinel count 0, and no visible blocking dialog.
- Redacted anchor scanning found draftbox/publish-record/public article path families, but no safe
  visible new-editor href suitable for a runbook-compliant creation path.

Evidence:
- Added `prompts/0601/evidence/wechat-create-entry-noop-readback-20260619.txt`.

Boundary:
- This is a no-mutation blocked attempt. It does not satisfy safe-disposable-draft,
  cleanupPathVerified, authenticated editor DOM, ordinary PC paste, phone preview, Dark Mode,
  cover thumbnail, credentialed sync, scheduled-send, upload, public host, or publish proof.

## 2026-06-19 Committed WeChat PC Evidence Manifest Slice

Impact:
- `npx gitnexus impact getCommittedStyleProofLocalEvidenceManifests -r InkForge --depth 3`
  reported LOW risk, 0 impacted items, and 0 affected processes. The existing local-evidence helper
  was kept unchanged.

Implementation:
- Added `getCommittedStyleProofWechatPcEvidenceManifests()` and
  `getCommittedStyleProofWechatPcEvidenceAuditReport()` in
  `inkforge/src/services/export/style-catalog.ts`, exported through `index.ts`.
- The new committed PC evidence pack is intentionally separate from
  `getCommittedStyleProofLocalEvidenceManifests()` so the exact WeChat HTML artifact SHA is not
  mixed with Tauri/WebView2 screenshot fingerprints.
- The pack contains the redacted `wechat-flagship-amber` PC proof from
  `prompts/0601/evidence/wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt` and the
  redacted `wechat-flagship-tempera` entity-safe PC proof from
  `prompts/0601/evidence/wechat-tempera-entity-ordinary-ctrlv-cleanup-20260619.txt`.
- It records six safe committed proof rows for each exact PC artifact fingerprint: authenticated
  editor, PC editor DOM, exact artifact, safe disposable draft, ordinary OS Ctrl+V paste, and
  sensitive hygiene.
- Required flags are bound to the exact artifact rows:
  `authenticatedSessionVerified`, `platformEditorDomVerified`, `exactArtifact`,
  `disposableDraft`, `cleanupPathVerified`, `ordinaryClipboardPasteVerified`,
  `sameEditorTabVerified`, `pasteInputEventVerified`, `editorBodyMutationVerified`,
  `mojibakeFreeVerified`, `committed`, and `safeForCommit`.
- Regression coverage proves Amber's PC rows are satisfied but the style choice remains
  blocked/invalid and phone preview, Dark Mode, cover thumbnail, and publish rows remain
  missing/cannot-claim.

Evidence:
- Added `prompts/0601/evidence/style-proof-committed-wechat-pc-evidence-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 116 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 155 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1089 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in 28.59s,
  and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.

Boundary:
- This is committed runtime accounting for exact Amber WeChat PC ordinary Ctrl+V plus Tempera
  entity-safe ordinary Ctrl+V and disposable cleanup proof only.
- It does not prove raw UTF-8 Tempera direct paste, Kiln ordinary Ctrl+V, WeChat phone preview,
  mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled-send,
  platform preview, public URL, upload, or publish success.

## 2026-06-19 Style Proof Artifact Manifest Validation Slice

Scope:
- Tightened the local style proof layer for XHS/Zhihu artifact-manifest requirements.
- No platform action, phone preview, upload, sync, scheduled send, or publish action was attempted.

Implementation:
- Added `artifactManifestValidated?: boolean` to `StyleProofArtifact`.
- Added `style-proof-manifest-artifact-manifest-not-validated` to the executable proof issue ids.
- Added `style-proof-manifest-artifact-ref-missing` for validator-passed artifact-manifest rows
  that cannot be traced to a redacted manifest report.
- Updated XHS/Zhihu artifact-manifest runbook contracts so `artifactRef`,
  `artifactManifestValidated`, and `safeForCommit` are required fields.
- Updated `validateStyleProofManifest()` so a manifest-shaped artifact row is not enough; it must
  carry `artifactManifestValidated:true` after the corresponding platform manifest validator passes.
- Updated runbook next actions, success criteria, and failure signals so XHS rows name
  `validateXhsImageArtifactManifest()` and Zhihu rows name `validateZhihuImageArtifactManifest()`.
- Updated the committed XHS local evidence manifest to set the flag only for the committed
  validator-passed report.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 96 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 135 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1069 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts src/services/export/index.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored.

Boundary:
- This proves local validator-passed accounting only.
- It does not prove Xiaohongshu upload, platform preview, public URL acceptance, Zhihu account
  upload/editor preview/public article rendering, sync, scheduled publish, or publish success.

## 2026-06-19 Zhihu Image Manifest Builder Slice

Impact:
- `npx gitnexus impact validateZhihuImageArtifactManifest -r InkForge --depth 2 --include-tests`
  reported LOW risk, 1 direct dependent, and 0 affected processes.
- `npx gitnexus impact File:inkforge/src/services/export/image-pipeline/index.ts -r InkForge --depth 2 --include-tests`
  reported LOW risk, 1 direct dependent, 2 impacted items, and 0 affected processes.
- `npx gitnexus impact File:inkforge/src/services/export/index.ts -r InkForge --depth 2 --include-tests`
  reported LOW risk, 1 direct dependent, and 0 affected processes.
- The newly added `artifact-manifest.ts` symbol was not yet visible to the GitNexus index after
  the immediately preceding commit, so file/symbol coverage is compensated by focused unit,
  cross-platform export, typecheck, build, and staged `detect_changes`.

Implementation:
- Added `createZhihuImageArtifactManifest()`, `inferZhihuImageArtifactFormat()`, and
  `inferZhihuImageHostStatus()` to `image-pipeline/artifact-manifest.ts`.
- Exported the helper and option types through `image-pipeline/index.ts` and
  `services/export/index.ts`.
- The builder fails closed: local/public fallback artifacts require `exists:true`, positive bytes,
  non-empty alt, and semantic caption or text fallback; platform upload proof requires explicit
  `uploaded:true` plus a recognized platform-hosted final URL; fake hostStatus overrides and
  incomplete platform-upload manifests throw.
- The helper still delegates the final readiness decision to `validateZhihuImageArtifactManifest()`
  and does not change default Zhihu export behavior when no manifest is supplied.
- Added evidence:
  `prompts/0601/evidence/zhihu-image-manifest-builder-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/image-pipeline/image-pipeline.test.ts --reporter=default`
  passed with 1 file / 20 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 94 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 133 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1065 tests.
- `pnpm -C inkforge exec eslint src/services/export/image-pipeline/artifact-manifest.ts src/services/export/image-pipeline/index.ts src/services/export/image-pipeline/image-pipeline.test.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in 23.79s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.
- `git diff --check` passed for the target paths.
- Pre-stage and staged sensitive scans over the target diff returned no matches for profile paths,
  credential strings, HTTP archives, QR artifacts, operator-captured images, local capture file
  references, or raw platform-response markers.
- GitNexus staged `detect_changes` reported LOW risk, 10 changed files, 0 affected processes.

Boundary:
- This is local Zhihu manifest construction only.
- It does not prove Zhihu account upload, editor preview, public article rendering, sync,
  scheduled publish, publish success, or any WeChat/XHS external gate.

## 2026-06-19 XHS Raster Pack Manifest Builder Slice

Impact:
- `npx gitnexus analyze` refreshed the GitNexus index after the prior helper commits.
- `npx gitnexus impact createXhsImageArtifactManifestFromRaster -r InkForge --depth 2 --include-tests`
  reported LOW risk, 2 direct dependents, and 0 affected processes.
- `npx gitnexus impact validateXhsImageArtifactManifest -r InkForge --depth 2 --include-tests`
  reported LOW risk, 2 direct dependents, and 0 affected processes.
- `npx gitnexus impact File:inkforge/src/services/export/image-pipeline/index.ts -r InkForge --depth 2 --include-tests`
  reported LOW risk, 1 direct dependent, 2 impacted items, and 0 affected processes.
- `npx gitnexus impact File:inkforge/src/services/export/index.ts -r InkForge --depth 2 --include-tests`
  reported LOW risk, 1 direct dependent, and 0 affected processes.

Implementation:
- Added `createXhsImageArtifactManifestFromRasterArtifacts()` to build multi-page Xiaohongshu
  carousel/page-pack manifests from real raster metadata.
- The helper reuses the single-page raster builder, sorts pages by page number, defaults cover to
  page 1, derives body references from referenced pages, and keeps
  `validateXhsImageArtifactManifest()` as the final authority for continuity, duplicate pages,
  cover uniqueness, references, file proof, ratio, format, bytes, and crop status.
- Exported the helper and pack option type through `image-pipeline/index.ts` and
  `services/export/index.ts`.
- Added evidence:
  `prompts/0601/evidence/xhs-raster-pack-manifest-builder-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/image-pipeline/image-pipeline.test.ts --reporter=default`
  passed with 1 file / 22 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 95 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 134 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1068 tests.
- `pnpm -C inkforge exec eslint src/services/export/image-pipeline/artifact-manifest.ts src/services/export/image-pipeline/index.ts src/services/export/image-pipeline/image-pipeline.test.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in 23.72s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.
- `git diff --check` passed for the target paths and staged diff.
- Pre-stage and staged sensitive scans over the target diff returned no matches for local profile
  paths, credential strings, HTTP archive artifacts, QR artifacts, operator-captured images, local
  capture file references, or raw platform-response markers.
- GitNexus staged `detect_changes` reported LOW risk, 10 changed files, 0 affected processes.

Boundary:
- This is local multi-page XHS manifest construction only.
- It does not prove Xiaohongshu upload, platform preview, public URL acceptance, scheduled publish,
  publish success, or any WeChat/Zhihu external gate.

## 2026-06-19 XHS Committed Local Evidence Manifest Slice

Impact:
- GitNexus MCP `impact(createCommittedStyleProofLocalEvidenceManifest, upstream)` reported LOW
  risk, 2 impacted items, and 0 affected processes. The new XHS helper is additive and keeps the
  existing WeChat manifest constructor unchanged.

Implementation:
- Added a Xiaohongshu committed local manifest for `xhs-cover-carousel` in
  `inkforge/src/services/export/style-catalog.ts`.
- The manifest references only repository-safe local evidence:
  `prompts/0601/evidence/xhs-raster/README.md`,
  `prompts/0601/evidence/xhs-raster/xhs-raster-cover-grid-browser-2026-06-08-2026-06-07T23-38-29-127Z.png`,
  and `prompts/0601/evidence/xhs-image-manifest-gate-20260609.txt`.
- Updated committed-pack regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`: the pack now has four
  manifests and seventeen committed artifacts; XHS local evidence, `xhs-artifact-manifest`, and
  sensitive hygiene pass, while `published-url-or-platform-preview` remains missing.
- Updated `.trellis/spec/frontend/wechat-svg-modules.md`,
  `prompts/0601/evidence/README.md`, `prompts/0601/COMPLETION-REPORT.md`, and
  `prompts/0601/evidence/style-proof-committed-local-evidence-20260617.txt`.
- Added evidence:
  `prompts/0601/evidence/style-proof-committed-xhs-local-evidence-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 92 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 131 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1054 tests.
- `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in 51.07s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.

Boundary:
- This is committed local XHS artifact accounting only.
- It does not prove Xiaohongshu account upload, platform preview, public URL acceptance, publish
  success, Zhihu public-host proof, or any WeChat external gate.

## 2026-06-19 XHS Raster Manifest Builder Slice

Impact:
- GitNexus MCP `impact(extractFromDataUrl, upstream, includeTests=true)` reported LOW risk, 1
  direct test dependent, and 0 affected processes.

Implementation:
- Added `inkforge/src/services/export/image-pipeline/artifact-manifest.ts` with:
  `createXhsImageArtifactManifestFromRaster()`, `getDataUrlByteLength()`,
  `inferXhsImageArtifactFormat()`, and `inferXhsImageArtifactRatio()`.
- Re-exported the helper through `inkforge/src/services/export/image-pipeline/index.ts` and
  `inkforge/src/services/export/index.ts`.
- The helper converts real raster data URLs or explicit local raster metadata into
  `XhsImageArtifactManifest`, then keeps the existing `validateXhsImageArtifactManifest()` as the
  authoritative local readiness gate.
- The helper throws on missing dimensions, missing bytes, unsupported ratio, or unsupported
  format, rather than creating a fake local pass.
- Updated `.trellis/spec/frontend/wechat-svg-modules.md`,
  `prompts/0601/COMPLETION-REPORT.md`, and `prompts/0601/evidence/README.md`.
- Added evidence:
  `prompts/0601/evidence/xhs-raster-manifest-builder-20260619.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/image-pipeline/image-pipeline.test.ts --reporter=default`
  passed with 1 file / 16 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 93 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 132 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1060 tests.
- `pnpm -C inkforge exec eslint src/services/export/image-pipeline/artifact-manifest.ts src/services/export/image-pipeline/index.ts src/services/export/image-pipeline/image-pipeline.test.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in 46.11s.
- `inkforge/tsconfig.tsbuildinfo` was restored after typecheck/build dirtied the generated cache.

Boundary:
- This is local XHS manifest construction only.
- It does not prove Xiaohongshu account upload, platform preview, public URL acceptance, publish
  success, Zhihu public-host proof, or any WeChat external gate.

## 2026-06-19 ExportModal Execution Runbook UI Slice

Impact:
- `npx gitnexus impact File:inkforge/src/components/export/ExportModal.vue -r InkForge --depth 2`
  reported LOW risk, 0 impacted items, and 0 affected processes.
- `npx gitnexus impact styleProofAcceptanceSummaryForChoice -r InkForge --depth 2` reported LOW
  risk, 1 direct dependent, and 0 affected processes.

Implementation:
- ExportModal now consumes `getPlatformStyleProofExecutionRunbook(selectedPlatform)` beside the
  existing style capability, collection plan/queue, and acceptance audit reports.
- The style capability summary shows open execution-runbook steps, cannot-claim count, and the next
  runbook gate.
- The acceptance preflight row shows execution-runbook open/cannot-claim totals and the next
  operator gate without changing the existing cannot-claim audit.
- Each style card now shows a read-only execution summary plus wrapped artifact-contract labels,
  including explicit phone-preview and Dark Mode required fields such as
  `phonePreviewContentVerified` and `darkModeEnabledVerified`.
- The 400px control column now uses a fixed flex basis, `min-width:0`, and wrapping chips so long
  proof field names cannot squeeze the preview body or cause horizontal overflow. The 980px
  responsive branch resets `max-width` so the single-column control area can fill narrow screens.
- WDIO now asserts per-card execution artifact-field contracts for WeChat, Xiaohongshu, and Zhihu,
  not only summary/preflight totals.
- Selectability, availability, blocked/unavailable state, preset application, clipboard, draft,
  sync, upload, and publish behavior are unchanged.

Verification:
- `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue --quiet` passed.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 92 tests.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed on the final rerun.
- `pnpm -C inkforge exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`
  passed with real Tauri/WebView2 149, 1 spec / 6 tests.

Real UI regression:
- WDIO caught that long execution contract labels initially squeezed the preview body to 61px even
  after service tests, typecheck, and build passed.
- The final WDIO run restored `#nice` width to 401px and kept `charsPerLine=20`.

Evidence:
- Added `prompts/0601/evidence/style-proof-execution-runbook-exportmodal-20260619.txt`.

Boundary:
- This proves local ExportModal runbook visibility and layout stability only.
- It does not prove WeChat phone preview, mobile SMIL/click, mobile Dark Mode, cover-thumbnail
  acceptance, credentialed sync, scheduled-send, XHS/Zhihu account upload, public host acceptance,
  or publish success.

## 2026-06-19 WeChat Dashboard Authenticated Redacted Readback Slice

Scope:
- Continued the external proof queue with CloakBrowser only.
- Used the persistent authenticated browser session after the machine reboot.
- Performed dashboard-only redacted readback; no editor open, draft edit, paste, phone preview,
  sync, upload, scheduled send, or publish action.

Observed:
- WeChat Official Account backend dashboard was reachable at `mp.weixin.qq.com` with path
  `/cgi-bin/home`.
- The credential-bearing query existed but was not recorded.
- Visible backend/home root was present.
- Body signals existed for home, new-creation affordances, draft area, and publish-related
  dashboard controls.
- Login-page containers `.login__type__container`, `.login_box`, `.login_panel`, and
  `#header .login` were absent.
- Visible login QR image was not present; dashboard-side QR class nodes existed and must not be
  treated as login-page proof by themselves.
- Redacted counts: draftbox link 1, all-drafts button 1, dashboard draft cards 4,
  publish-record title cards 6, publish-related controls 6, delete buttons 8, cancel buttons 17,
  appmsg-family anchors 10, credential-bearing anchors 41.

Evidence:
- Added `prompts/0601/evidence/wechat-dashboard-auth-redacted-readback-20260619.txt`.

Boundary:
- This proves authenticated WeChat dashboard reachability after reboot only.
- It does not satisfy `pc-editor-dom-readback`, `pc-editor-paste-event`, `safe-disposable-draft`,
  phone preview, Dark Mode, cover-thumbnail, sync, scheduled-send, public host, upload, or publish
  gates.

## 2026-06-18 OSS Converter Source Refresh Slice

Scope:
- Refreshed source-backed market practice evidence from public OSS converters:
  doocs/md, mdnice/markdown-nice, and RedBookCards.
- Used Grok Search as a narrow GitHub/source discovery check, then read raw public source files as
  primary evidence.
- No source runtime code changed in this slice; this is documentation/spec/evidence hardening.

Findings:
- doocs/md and mdnice both confirm the WeChat converter-family pattern: collect theme CSS, make it
  match the copied fragment, inline with `juice`, then perform platform-specific HTML cleanup before
  clipboard/export.
- WeChat image dimensions, SVG text fill/baseline handling, unresolved preview placeholders, and
  local anchors need explicit export cleanup rather than relying on preview DOM.
- WeChat and Zhihu copy workflows must stay separate: Zhihu math/diagram handling degrades to
  semantic text or image fallback rather than inheriting WeChat inline-SVG behavior.
- RedBookCards confirms the XHS-style high-visual path as fixed-size image pages/long images from a
  real WebView render, not rich HTML body output.

Artifacts:
- Added `prompts/0601/evidence/oss-converter-source-refresh-20260618.txt`.
- Updated `prompts/0601/research/wechat-svg-typesetting-patterns.md` section 12.
- Updated `prompts/0601/SPEC.md`, `.trellis/spec/frontend/wechat-svg-modules.md`, and
  `docs/platform-rendering-rules/market-practices-catalog.md`.

Boundary:
- This is source-backed rule extraction only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail,
  ordinary rich Ctrl+V for all flagship artifacts, credentialed sync, scheduled send,
  XHS/Zhihu account upload, public host acceptance, or publish success.

## 2026-06-18 135 SVG Builder Canvas Residue Gate Slice

Impact:
- `npx gitnexus impact collectMarketEditorResidues -r InkForge -d upstream --include-tests`
  reported LOW risk, 7 impacted items, 1 direct caller, 0 affected processes, and only the Export
  module affected.

Market editor readback:
- Continued the CloakBrowser-only 135 SVG editor path at `https://www.135editor.com/svgeditor/`.
- The left SVG effects list exposed many `免费试用` buttons and effect entries such as `ID:1054`.
- The center `#app-content-canvas` was readable and contained 8 blocks, 8 SVG previews, 0 images,
  and HTML length `11946`.
- Observed builder effect identities:
  `multiselectpopup`, `carouselslide`, `slidesectorclickredpacket`,
  `clickelementscaleimagesspread`, and `coverclickmovewithspread`.
- The first visible trial-button click did not change the current canvas counts. This is recorded
  as a no-delta click, not insertion proof; the existing center canvas still provided concrete
  authoring DOM rules.

Implementation:
- Extended `MARKET_EDITOR_RESIDUE_RULES` with:
  - `135 SVG builder effect data-name`
  - `135 SVG builder canvas residue`
- Added `MARKET_EDITOR_SVG_BUILDER_RESIDUE_HTML` regression coverage proving WeChat, Xiaohongshu,
  and Zhihu reject copied 135 SVG builder canvas blocks.
- Added evidence:
  `prompts/0601/evidence/135-svg-builder-canvas-residue-gate-20260618.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 87 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 126 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1049 tests.
- `pnpm -C inkforge exec eslint src/services/export/quality-detector.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored before staging.

Boundary:
- This is local detector proof only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, ordinary
  WeChat Ctrl+V rich HTML/SVG acceptance, credentialed sync, scheduled-send, XHS/Zhihu account
  upload, public host acceptance, or publish success.
## 2026-06-18 Xiumi Editable Surface Residue Gate Slice

Impact:
- `npx gitnexus impact MARKET_EDITOR_RESIDUE_RULES -r InkForge -d upstream --include-tests`
  reported LOW risk, 0 impacted items, and 0 affected processes. The rule is consumed through the
  existing `collectMarketEditorResidues` detector path.

Market editor readback:
- Continued the CloakBrowser-only Xiumi v5 paper editor path, without saving, exporting, syncing,
  uploading, phone previewing, scheduling, or publishing.
- The active center `.tn-editing-panel` exposed 19 `contenteditable` nodes, 0 `spellcheck` nodes,
  and 0 `draggable` nodes.
- The `contenteditable="true"` samples were applied SVG/title/card text cells such as title text,
  numbered badges, and card body paragraphs, using class names like
  `tn-cell-inst ng-binding ng-scope tn-cell tn-cell-text horizontal-tb tn-state-active`.

Implementation:
- Extended `MARKET_EDITOR_RESIDUE_RULES` with `editor editable surface attribute`.
- Added `MARKET_EDITOR_EDITABLE_SURFACE_RESIDUE_HTML`, intentionally without `tn-*` or `ng-*`
  markers, and a regression proving WeChat, Xiaohongshu, and Zhihu reject copied editor surfaces.
- Added evidence:
  `prompts/0601/evidence/xiumi-editable-surface-residue-gate-20260618.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 90 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 129 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1052 tests.
- `pnpm -C inkforge exec eslint src/services/export/quality-detector.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored before staging.

Boundary:
- This is local detector proof and market-editor rule extraction only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, ordinary
  WeChat Ctrl+V rich HTML/SVG acceptance, credentialed sync, scheduled-send, XHS/Zhihu account
  upload, public host acceptance, or publish success.

## 2026-06-18 Xiumi Angular Runtime Residue Gate Slice

Impact:
- `npx gitnexus impact MARKET_EDITOR_RESIDUE_RULES -r InkForge -d upstream --include-tests`
  reported LOW risk, 0 impacted items, and 0 affected processes. The rule is consumed through the
  existing `collectMarketEditorResidues` detector path.

Market editor readback:
- Continued the CloakBrowser-only Xiumi v5 paper editor path, without saving, exporting, syncing,
  uploading, phone previewing, scheduling, or publishing.
- The active center `.tn-editing-panel` contained `htmlLength 706660`, 5093 elements,
  19 contenteditable nodes, 99 images, and 0 center inline SVG elements.
- The same center readback counted 83 `tn-uuid` values, 184 `opera-tn-ra-*` bindings, 38
  `statics.xiumi.us` references, 14 CSS `url(...)` occurrences, and 4905 Angular `ng-*`
  attributes.
- New residue forms included `ng-model`, `ng-change`, `ng-include`, `ng-controller`,
  `ng-hide` / `ng-show`, and authoring classes such as `ng-scope`, `ng-binding`, `ng-hide`,
  `ng-pristine`, `ng-untouched`, `ng-valid`, `ng-empty`, `ng-not-empty`, and `ui-sortable`.

Implementation:
- Extended `MARKET_EDITOR_RESIDUE_RULES` so `Angular/Vue authoring attribute` covers Xiumi's
  applied-editor runtime controls beyond the older `ng-click/ng-style/ng-repeat` subset.
- Added `Angular authoring class` as a separate market-residue label.
- Added `MARKET_EDITOR_XIUMI_ANGULAR_RUNTIME_RESIDUE_HTML`, intentionally without any `tn-*`
  marker, and a regression proving WeChat, Xiaohongshu, and Zhihu reject Angular-only runtime
  residues.
- Added evidence:
  `prompts/0601/evidence/xiumi-angular-runtime-residue-gate-20260618.txt`.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 89 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 128 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1051 tests.
- `pnpm -C inkforge exec eslint src/services/export/quality-detector.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored before staging.

Boundary:
- This is local detector proof and market-editor rule extraction only.
- It does not prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, ordinary
  WeChat Ctrl+V rich HTML/SVG acceptance, credentialed sync, scheduled-send, XHS/Zhihu account
  upload, public host acceptance, or publish success.

## 2026-06-19 WeChat Tempera Entity-Safe Clipboard Slice

Impact:
- `npx gitnexus impact Function:inkforge/src/services/export/utils.ts:copyToClipboard -r InkForge -d upstream --include-tests`
  reported LOW risk, 0 impacted items, and 0 affected processes.
- `npx gitnexus impact Function:inkforge/src/services/export/index.ts:convertToPlatform -r InkForge -d upstream --include-tests`
  reported LOW risk, 3 impacted items, 1 direct dependent (`convertToNativeFormat`), 1 affected
  module (`Export`), and 0 affected processes.
- `npx gitnexus impact convertToNativeFormat -r InkForge -d upstream --include-tests` reported
  LOW risk, 2 direct callers, and 0 affected processes.
- `npx gitnexus impact handleCopy -r InkForge -d upstream --include-tests` reported LOW risk,
  0 impacted items, and 0 affected processes.

Implementation:
- Added `encodeNonAsciiHtmlEntities()`, `prepareWechatClipboardHtml()`,
  `prepareWechatClipboardPlainText()`, and `copyWechatHtmlToClipboard()` in
  `inkforge/src/services/export/utils.ts`.
- Exported the helpers through `inkforge/src/services/export/index.ts`.
- Updated `ExportModal` so WeChat styled HTML and WeChat native HTML copy use the WeChat-specific
  clipboard helper, while non-WeChat copy and normal preview/export HTML remain unchanged.
- Extended `inkforge/scripts/set-windows-html-clipboard.ps1` with `-EncodeNonAsciiEntities` for
  repeatable Windows CF_HTML proof collection.
- Added regression coverage proving entity-safe WeChat clipboard HTML becomes ASCII-only while
  preserving SVG, `data-ink-svg`, and `data-ink-block` structure, and parsing back to normal text.

Live proof:
- Added `prompts/0601/evidence/wechat-tempera-entity-ordinary-ctrlv-cleanup-20260619.txt`.
- Exact source `flagship-tempera.html` SHA-256:
  `d173f8dd2ba807b2fe90b7f0c2a6dea7907a3672d6c225fc0acc918751392585`.
- Entity-safe clipboard SHA-256:
  `f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878`.
- The transform changed HTML bytes from `41754` to `46456`, non-ASCII characters from `944` to
  `0`, and preserved `svgCount=35`, `dataInkSvgCount=3`, and `dataInkBlockCount=23`.
- Same-visible-tab ordinary OS Ctrl+V into the authenticated WeChat PC editor read back
  `bodyPaste=1`, `docPaste=1`, `docInput=1`, `trustedPaste=2`, `mutation=4`, `svgCount=35`,
  `dataInkSvgCount=3`, `dataInkBlockCount=23`, `replacementCharCount=0`,
  `mojibakeHintCount=0`, `literalEntityTextCount=0`, and `htmlEntityCount=0`.
- Cleanup completed with platform delete returning `base_resp.ret=0` and two post-delete reloads
  finding zero title/content/app-id matches.

Verification:
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 116 tests.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed with 4 files / 155 tests.
- `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 35 files / 1089 tests.
- `pnpm -C inkforge exec eslint src/services/export/utils.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts src/components/export/ExportModal.vue --quiet`
  passed.
- `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed; Vite built in 23.37s,
  and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- `powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File inkforge/scripts/set-windows-html-clipboard.ps1 -HtmlPath prompts/0601/evidence/wechat-paste/flagship-tempera.html -EncodeNonAsciiEntities -DryRun`
  produced `htmlBytes=46456`, `cfHtmlBytes=46625`, `sourceNonAsciiCharCount=944`,
  `nonAsciiCharCount=0`, `htmlEntityCount=944`, `svgCount=35`, `dataInkSvgCount=3`, and
  `dataInkBlockCount=23`.
- The same helper without `-EncodeNonAsciiEntities` preserved the old raw artifact metadata and
  SHA-256.

Boundary:
- This proves entity-safe WeChat PC ordinary Ctrl+V acceptance and cleanup for the transformed
  clipboard payload only.
- It does not prove raw UTF-8 direct paste, phone preview, mobile SMIL/click, mobile Dark Mode,
  cover-thumbnail acceptance, credentialed sync, scheduled-send, public rendering, XHS/Zhihu
  account upload, or publish success.
