# Implementation Plan

## Phase 1: Planning Completion

- [x] Create Trellis task.
- [x] Observe logged-in 135 Editor pages without touching credentials or publishing.
- [x] Observe logged-in Xiumi pages without touching credentials or publishing.
- [x] Read current Trellis context and related task PRDs.
- [x] Read relevant frontend spec/docs and existing `prompts/0601` evidence inventory.
- [x] Run external research through Grok Search, Exa, mdDocs, DeepWiki, and Context7.
- [x] Write planning artifacts: `prd.md`, `design.md`, `implement.md`, `research/market-rendering-practices.md`.
- [x] Load Phase 1.4 context and start review gate before `task.py start` based on user's explicit no-confirmation authorization.

## Phase 2: Docs and Spec Rules

- [x] Update `docs/platform-rendering-rules/wechat-rules.md` with:
  - HTML inline-style whitelist/denylist.
  - SVG presentation-attribute subset.
  - HTML block vs SVG block split.
  - 135/Xiumi-derived element families.
  - Copy/paste/sync/long-image export paths.
  - Validation checklist.
- [x] Update `docs/platform-rendering-rules/xiaohongshu-rules.md` with:
  - Plain text output contract.
  - Short paragraph/list/topic strategy.
  - Image/poster/long-image downgrade.
  - Raw HTML/Markdown leakage blockers.
- [x] Update `docs/platform-rendering-rules/zhihu-rules.md` with:
  - Clean Markdown contract.
  - Formula/code/table/image handling.
  - WeChat decoration removal.
- [x] Update or add a docs overview that maps market practices to InkForge rules.
- [x] Update `.trellis/spec/frontend/wechat-svg-modules.md` and/or `flagship-element-catalog.md` only for durable coding contracts learned in this task.

## Phase 3: Code Inspection and Impact

- [x] Run `npx gitnexus analyze` if safe and needed, or record stale-index limitation.
- [x] For each target symbol/file, run GitNexus impact/context first where available.
- [x] Inspect current export code around:
  - `wechat.ts`
  - `platform-rules/wechat.ts`
  - `platform-css.ts`
  - `quality-detector.ts`
  - `xiaohongshu-text.ts`
  - `zhihu-markdown.ts`
  - `svg-modules/**`
  - `ExportModal.vue`
- [x] Classify gaps as docs-only, rule-test gap, renderer bug, preview mismatch, or platform blocker.

## Phase 4: Implementation Slices

Only execute after task is `in_progress`.

- [x] WeChat rule hardening:
  - Enforce no unsupported CSS/class/style leakage after final pipeline.
  - Ensure SVG opaque handling and safe subset remain intact.
  - Add or update tests for 135/Xiumi-derived element families where implemented.
- [x] Rich element catalog extension:
  - Add only additive, opt-in element families.
  - Preserve existing flagship presets and non-flagship zero-regression behavior.
  - Keep icons as `lucide-vue-next` or inline SVG paths, no Emoji UI icons.
- [x] XHS output hardening:
  - Verify publishable output is plain text/image strategy.
  - Add leakage tests for HTML/Markdown artifacts.
- [x] Zhihu output hardening:
  - Verify Markdown semantics and no WeChat decorations.
  - Add tests for formulas/code/tables/unsupported blocks.
- [x] ExportModal/preview:
  - Verify controls reach renderer state, not UI-only state.
  - Repair overflow or preview blank regressions if found.

## Phase 5: Verification

Run focused gates before broad gates.

Focused tests:

```bash
pnpm -C inkforge exec vitest run src/services/export/svg-modules src/services/export/platform-rules src/services/export/preview-fidelity src/services/export/__tests__ --reporter=default
pnpm -C inkforge exec vitest run src/services/export --reporter=default
```

Static checks:

```bash
pnpm -C inkforge exec eslint src/services/export src/components/export --ext .ts,.vue --quiet
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
```

Browser smoke:

```bash
pnpm -C inkforge dev --host 127.0.0.1 --port 3005
```

Browser checks:

- Desktop 1440x960:
  - app opens.
  - ExportModal opens.
  - WeChat/XHS/Zhihu previews non-empty.
  - no console errors attributable to touched code.
- Mobile 390x844:
  - ExportModal not horizontally overflowing.
  - preview visible.
  - controls stack without text overlap.
- Capture screenshots for key platform previews.

Tauri/native:

- Run only after web/build gates if local toolchain is stable.
- Native-dependent controls must be proven in Tauri or marked blocked.

Final graph/diff:

- `gitnexus_detect_changes({repo:"Inkforge", scope:"all"})` or equivalent if GitNexus is available.
- `git status --short --branch` from repo root.
- Review changed files to avoid unrelated edits and generated cache commits.

## Verification Evidence

- `npx gitnexus analyze` completed successfully before code validation; CLI repo list later reported `InkForge` indexed at 2026-06-08 04:46:25 with 25,499 symbols, 40,159 edges, 770 clusters, and 300 flows.
- GitNexus MCP endpoints returned `fetch failed` during final closeout, so final graph review used CLI:
  - `npx gitnexus impact detectQuality -r InkForge --depth 3`: LOW risk, 4 direct upstream dependents, 0 affected processes.
  - `npx gitnexus detect-changes -r InkForge --scope all`: low risk, 51 dirty files and 113 symbols across the whole existing worktree, 0 affected processes. This includes pre-existing unrelated dirty files, so this task's own code scope remains `quality-detector.ts` plus its regression test.
- Focused regression:
  - `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`: 23 tests passed.
  - 10-loop stability run with `--reporter=dot`: 10/10 loops passed, each run 23 tests passed. The repeated KaTeX quirks-mode stderr is an existing warning emitted by the LaTeX degradation test, not a failure.
- Focused export suites:
  - `pnpm -C inkforge exec vitest run src/services/export/svg-modules src/services/export/platform-rules src/services/export/preview-fidelity src/services/export/__tests__ src/services/export/platform-export-rendering.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`: 28 files passed, 590 tests passed.
  - `pnpm -C inkforge exec vitest run src/services/export --reporter=default`: 35 files passed, 954 tests passed.
- Static and build gates:
  - `pnpm -C inkforge exec eslint src/services/export src/components/export --ext .ts,.vue --quiet`: passed.
  - `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`: passed.
  - `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`: passed.
  - Generated `inkforge/tsconfig.tsbuildinfo` was restored after build/typecheck.
- Browser smoke and E2E:
  - Vite dev server: `http://127.0.0.1:3005/`.
  - Workstation article: `http://127.0.0.1:3005/workstation?id=1df8fe4b-b4fe-49ed-abba-1f75b1889e13`.
  - Real Markdown input inserted into `.ProseMirror`, `textLength=349`.
  - ExportModal opened through the visible `导出` button.
  - Desktop 1440x960: WeChat, Xiaohongshu, and Zhihu tabs all switched and rendered non-empty previews; document `scrollWidth=1440`; panel did not overflow.
  - Mobile 390x844: ExportModal switched to column layout; `documentElement.scrollWidth=390`; `.export-body` used vertical scrolling; preview column became visible after scrolling with non-empty text.
  - Console sweep after mobile verification returned no logs.
- Screenshots:
  - `C:\Users\HP\Downloads\inkforge-desktop-home-2026-06-08-2026-06-07T21-03-46-720Z.png`
  - `C:\Users\HP\Downloads\inkforge-export-modal-desktop-2026-06-08-2026-06-07T21-10-46-846Z.png`
  - `C:\Users\HP\Downloads\inkforge-export-modal-mobile-real-viewport-2026-06-08-2026-06-07T21-13-26-162Z.png`
  - `C:\Users\HP\Downloads\inkforge-export-modal-mobile-preview-visible-2026-06-08-2026-06-07T21-14-02-536Z.png`
- Platform blockers:
  - WeChat/XHS/Zhihu direct upload, sync, and publish were not marked as pass because real platform API credentials/permissions are not available in this local browser verification path.
  - 135/Xiumi were used only as logged-in observation references; no private templates, account settings, publishing, payment, or protected assets were copied or touched.

## Risk Files

- `inkforge/src/services/export/wechat.ts`
- `inkforge/src/services/export/platform-rules/wechat.ts`
- `inkforge/src/services/export/platform-css.ts`
- `inkforge/src/services/export/quality-detector.ts`
- `inkforge/src/services/export/svg-modules/**`
- `inkforge/src/components/export/ExportModal.vue`
- `docs/platform-rendering-rules/**`
- `.trellis/spec/frontend/**`

## Rollback Points

- After docs/spec updates.
- After each export-rule test addition.
- After each renderer code slice.
- Before broad `vue-tsc`/build if generated files become dirty.
