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
- [ ] Commit the 2026-06-08 market-rule documentation/spec refresh and agent CSV files
      only; leave unrelated Trellis/meta/tooling dirty files untouched.

## Honest Non-Goals For This Slice

- This slice does not claim full completion of every historical 06-01 acceptance criterion.
  In particular, fresh live WeChat mobile animation proof requires a separate real paste/mobile
  evidence refresh when platform access is available.
- This slice does not change Xiaohongshu/Zhihu publishable body contracts.
- This slice does not archive the broader 06-01 task unless all acceptance criteria are later
  proven current-state complete.
