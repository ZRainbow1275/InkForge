# Export Platform Rendering Real Capability Audit

## Goal

Audit and harden Inkforge's export/platform rendering service layer without changing frontend content. The work must prove real, deterministic export behavior for WeChat Official Accounts, Xiaohongshu, and Zhihu, and must distinguish real capability from preview-only helpers, warnings, and stubs.

## What I Already Know

- The current session started from a backend/functionality objective, not a frontend visual task.
- The active Trellis pointer was `.trellis/tasks/05-06-app-visual-overhaul`, but the matching export line `.trellis/tasks/archive/2026-05/02-26-enhance-export-rendering` is already archived and had incomplete real-capability closure.
- Existing dirty files are frontend visual files under `inkforge/src/components/hub/**`, `inkforge/src/views/HubView.vue`, `.trellis/tasks/05-06-app-visual-overhaul/task.json`, and `inkforge/tsconfig.tsbuildinfo`; this task must not overwrite or expand those frontend edits.
- Backend-like export capability lives in `inkforge/src/services/export/**`; there is no standalone server package evidenced for this line.
- Previous audit memory identified durable WeChat gaps: formula output still depended on `katex-html`, image width was warned rather than hard-limited, and `WechatUploader.upload` remained a stub.

## Requirements

- Keep frontend content and visual Vue surfaces unchanged unless a later user instruction explicitly reopens frontend scope.
- Build a prompt-to-artifact audit checklist mapping every requirement to concrete files, command output, tests, or research evidence.
- Research current practical rendering constraints and best practices for:
  - WeChat Official Accounts pasteable HTML.
  - Xiaohongshu publishable plain text.
  - Zhihu Markdown-compatible output.
- Audit every export/platform service module involved in WeChat, Xiaohongshu, Zhihu, platform rules, quality detection, and image/formula transforms.
- Classify each relevant capability as `real`, `partial`, `preview-only`, `stub`, or `dead/stale`.
- Fix high-confidence service-layer gaps where the repo can implement deterministic behavior locally.
- Unsupported live integrations must fail explicitly with typed unsupported errors; they must not return fake success.
- Platform limits must be enforced in final output where local deterministic enforcement is possible, not only reported as warnings.
- Add or update focused tests for each fixed platform rule and negative assertion.

## Acceptance Criteria

- [ ] Research files exist under this task's `research/` directory for WeChat, Xiaohongshu, and Zhihu rendering rules, with source links and repo-specific implications.
- [ ] A service capability audit artifact exists and identifies real, partial, preview-only, stub, and stale paths across the three platform exports.
- [ ] WeChat native output is self-contained pasteable HTML that does not depend on `<style>`, class selectors, `katex-html`, JavaScript URLs, unresolved CSS variables, or unsupported platform CSS in final output.
- [ ] Xiaohongshu native output is plain text and does not leak raw HTML or Markdown syntax as the publishable artifact.
- [ ] Zhihu native output is Markdown-compatible with deterministic handling for formulas, code fences, tables, and unsupported blocks.
- [ ] WeChat upload integration does not claim success without real credentials/API contracts; missing integration fails explicitly and is covered by tests.
- [ ] Image width and formula downgrade behavior are enforced by output tests, not only quality warnings.
- [ ] Non-mutating service-layer tests and lint/typecheck commands are run and recorded.
- [ ] Existing frontend visual dirty files are preserved and not used as evidence for backend/platform completion.

## Definition of Done

- `pnpm -C inkforge exec vitest run src/services/export --reporter=default` passes, or any failure is tied to a precise out-of-scope file with a follow-up note.
- `pnpm -C inkforge exec eslint src/services/export --ext .ts --quiet` passes.
- `pnpm -C inkforge exec vue-tsc --noEmit` passes, or any unrelated pre-existing frontend/type failure is recorded with exact paths.
- GitNexus impact analysis is run before editing target symbols where the CLI can resolve them; GitNexus change detection/status is run before final wrap-up.
- Final response includes concrete file paths and command evidence, not proxy completion claims.

## Out of Scope

- Redesigning or modifying Hub, Workstation, visual polish, Vue templates, or user-facing frontend content.
- Claiming real publishing/upload success to any platform without credentials, OAuth/API setup, and verified provider contracts.
- Adding mock data, fabricated sample proofs, fake success states, or preview-only demonstrations as completion evidence.
- Broad refactors unrelated to export/platform rendering correctness.

## Technical Notes

- Required specs loaded before implementation:
  - `.trellis/spec/backend/index.md`
  - `.trellis/spec/backend/quality-guidelines.md`
  - `.trellis/spec/backend/directory-structure.md`
  - `.trellis/spec/backend/error-handling.md`
  - `.trellis/spec/guides/index.md`
  - `.trellis/spec/guides/code-reuse-thinking-guide.md`
  - `.trellis/spec/guides/cross-layer-thinking-guide.md`
  - `.trellis/spec/guides/cross-platform-thinking-guide.md`
- High-value code anchors to inspect:
  - `inkforge/src/services/export/wechat.ts`
  - `inkforge/src/services/export/xiaohongshu-text.ts`
  - `inkforge/src/services/export/zhihu-markdown.ts`
  - `inkforge/src/services/export/platform-rules/**`
  - `inkforge/src/services/export/quality-detector.ts`
  - `inkforge/src/services/export/image-pipeline/**`
  - `inkforge/src/services/export/**/*test.ts`
