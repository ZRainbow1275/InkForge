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
