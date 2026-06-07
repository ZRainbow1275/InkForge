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
- [ ] Commit the 2026-06-08 Tauri e2e verification addendum and safe refreshed e2e
      screenshots only; keep QR/platform-preview candidate PNG files untracked until a
      separate sensitive artifact review.

## Honest Non-Goals For This Slice

- This slice does not claim full completion of every historical 06-01 acceptance criterion.
  In particular, fresh live WeChat mobile animation proof requires a separate real paste/mobile
  evidence refresh when platform access is available.
- This slice does not change Xiaohongshu/Zhihu publishable body contracts.
- This slice does not archive the broader 06-01 task unless all acceptance criteria are later
  proven current-state complete.
