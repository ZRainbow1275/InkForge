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

## Remaining Checks Before Commit

- [x] Run focused artifact/export tests.
- [x] Run full export suite.
- [x] Run non-mutating ESLint for export service scope.
- [x] Run `vue-tsc`.
- [x] Run production build.
- [x] Restore generated cache files if typecheck/build dirties them.
- [x] Run final GitNexus detect changes and staged diff review.
- [ ] Commit only `06-01` R5 files; leave unrelated dirty files untouched.

## Honest Non-Goals For This Slice

- This slice does not claim full completion of every historical 06-01 acceptance criterion.
  In particular, fresh live WeChat mobile animation proof requires a separate real paste/mobile
  evidence refresh when platform access is available.
- This slice does not change Xiaohongshu/Zhihu publishable body contracts.
- This slice does not archive the broader 06-01 task unless all acceptance criteria are later
  proven current-state complete.
