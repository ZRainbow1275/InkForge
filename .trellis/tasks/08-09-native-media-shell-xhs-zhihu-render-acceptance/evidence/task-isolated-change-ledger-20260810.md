# Task-Isolated Change Ledger — 2026-08-10

## Baseline and limitation

- Branch: `dev/visual-fixes`.
- Task start HEAD: `9a2f56e0b679ec9e8a9cb5951690ad222a49199a`.
- Recovered working tree: 335 dirty paths, 0 staged paths.
- The task started on a long-lived dirty working tree. Git cannot reconstruct a clean task-only patch from this
  baseline, so this ledger records only paths directly observed in this task's implementation and verification.
  It must not be read as ownership of every hunk in a mixed-provenance modified file.

## Product paths directly involved

| Working-tree state | Path | Task purpose | Verification |
| --- | --- | --- | --- |
| `??` | `inkforge/src/services/export/platform-artifact-bundle.ts` | Real XHS/Zhihu local artifact writing; strict emitted Zhihu upload boundary | focused 26 tests; export 1503; full 2156; release artifact E2E |
| `??` | `inkforge/src/services/export/platform-artifact-bundle.test.ts` | Local bytes and emitted-manifest boundary regression | focused/export/full Vitest |
| `M` | `inkforge/src/services/export/image-pipeline/artifact-manifest.ts` | Existing manifest validation reused by artifact bundle | image pipeline/export/full Vitest |
| `M` | `inkforge/src/services/export/image-pipeline/image-pipeline.test.ts` | Upload/readiness boundary regression | focused/export/full Vitest |
| `??` | `inkforge/src/services/export/wechat-native-handoff.ts` | Registry-derived native component handoff and fail-closed anchors | focused/full Vitest; exact ESLint/typecheck |
| `??` | `inkforge/src/services/export/wechat-native-handoff.test.ts` | Native handoff matrix, uniqueness, fallback and blocked-state coverage | focused/full Vitest |
| `M` | `inkforge/src/components/export/ExportModal.vue` | Existing delivery/export surface wired to native handoff and real local bundles | focused/full Vitest; release artifact E2E |
| `??` | `inkforge/src/components/export/ExportModal.local-delivery.test.ts` | Visible local delivery and artifact-writing contract | focused/full Vitest |
| `M` | `inkforge/src/views/WorkstationView.vue` | Shared native shell lifecycle, focus, keyboard and effective motion state | Workstation tests; native release E2E |
| `??` | `inkforge/src/views/InspectorUtilityView.vue` | Live article context in the existing native utility window | typecheck; native release E2E A-to-B reuse |
| `M` | `inkforge/src/stores/settings.ts` | Existing product reduced-motion setting retained in effective-state path | settings/full Vitest; native release E2E |
| `M` | `inkforge/src/services/desktop/index.ts` | Existing typed desktop command boundary reused | full Vitest; Rust checks; native release E2E |
| `M` | `inkforge/src-tauri/src/commands/desktop.rs` | Native utility-window lifecycle and article-context readback | Rust desktop 6 tests; native release E2E |
| `M` | `inkforge/src-tauri/src/commands/window.rs` | Existing native window command path used by lifecycle checks | Rust checks; native release E2E |
| `M` | `inkforge/src-tauri/src/commands/wechat.rs` | Backend-only WeChat draft/media validation and cleanup boundary | Rust WeChat 31 tests; Tauri release build |

The tracked `M` rows above are mixed-provenance files: the task validated their current complete contents, but this
ledger does not claim that every uncommitted hunk was introduced after the task start.

## Acceptance paths directly involved

| Working-tree state | Path | Purpose |
| --- | --- | --- |
| `??` | `inkforge/src/views/__tests__/WorkstationView.desktop-layout.test.ts` | Runtime shell matrix, focus, keyboard, motion and geometry regression |
| `M` | `inkforge/src/views/__tests__/WorkstationView.vignette.test.ts` | Existing focus-mode visual/state regression |
| `M` | `inkforge/tests/e2e/wdio.conf.cjs` | Exact final release and producer identity gate |
| `??` | `inkforge/tests/e2e/specs/native-shell-lifecycle.spec.cjs` | Real Tauri/WebView2 pointer, keyboard, focus, motion, restart and context-reuse receipt |
| `??` | `inkforge/tests/e2e/specs/platform-artifact-release.spec.cjs` | Visible release UI plus native-dialog artifact write/readback receipt |
| `M` | `.trellis/spec/frontend/wechat-svg-modules.md` | Local-byte clone versus strict emitted/platform manifest contract |
| `M` | `docs/platform-rendering-rules/zhihu-rules.md` | Zhihu local artifact and platform-upload boundary |
| `??` | `.trellis/tasks/08-09-native-media-shell-xhs-zhihu-render-acceptance/` | Approved PRD, implementation record and redacted evidence |

## Current verification set

- Focused platform artifact/image pipeline: 2 files / 26 tests passed.
- Full export: 51 files / 1503 tests passed serially.
- Full repository Vitest: 145 files / 2156 tests passed serially.
- Exact ESLint, `vue-tsc --noEmit`, CJS syntax, production build and Tauri release packaging passed.
- Rust: formatting/check passed; WeChat command 31 tests and desktop command 6 tests passed.
- Native release default motion: 1 passing / 1 conditional skip.
- Native release OS-only reduced motion: 2 passing; Windows animation restored and read back as `True`.
- Native OS close used real Win32 `WM_SYSCOMMAND/SC_CLOSE`; placement and source focus readback were `local`.
- Final release platform artifact path: 1 passing; six XHS PNG pages and Zhihu Markdown/image/manifest exact-byte
  readback passed.

## Excluded from task-only claims

- Unlisted dirty paths are not attributed to this task.
- Repository-wide GitNexus change risk represents the combined dirty working tree, not this ledger.
- No staged, committed, pushed, uploaded, saved, synchronized, scheduled, group-sent, or published action is claimed.
