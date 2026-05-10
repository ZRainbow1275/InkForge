# Backend Real-Capability Audit and Platform Rendering Rules

## Goal

Audit and repair Inkforge's non-frontend implementation so export, publishing, rendering, validation, and platform adaptation are real, testable service-layer capabilities rather than mock, preview-only, or paper-complete behavior. The immediate product focus is WeChat Official Account, Xiaohongshu, and Zhihu article rendering rules.

## Hard Scope Boundary

- Do not modify frontend view/component/style files for this task.
- Allowed code areas are service/backend-like layers under `inkforge/src/services/**`, export/rendering utilities, tests, project docs/specs, and Trellis task artifacts.
- If a missing capability requires UI wiring, record it as a verified gap and implement only the service contract, validator, or testable backend-like capability in this task.
- Do not add mock data, fake success paths, placeholder platform integrations, or preview-only behavior as proof of real ability.

## What I Already Know

- The runnable app root is the nested `inkforge/` package, not the repository root.
- There is no current `server/package.json`; the export and platform rendering capabilities live in frontend-adjacent service modules under `inkforge/src/services/export/`, which function as the repo's backend-like deterministic capability layer.
- The existing task `.trellis/tasks/02-26-enhance-export-rendering/` already targets WeChat, Xiaohongshu, and Zhihu export rendering, so this task is reused instead of creating a duplicate task.
- The current export module already contains platform-specific engines, tests, image pipeline code, quality detection, preview-fidelity renderers, and native export routes.
- Existing tests mention uploader stubs: `WechatUploader`, `ZhihuUploader`, and `XiaohongshuUploader` throw `NotImplementedError`; these cannot be represented as real platform upload ability unless replaced or explicitly scoped as unsupported.
- Existing preview-fidelity modules are named `*-mock.ts`. They may be valid preview simulators, but they are not acceptable evidence of real platform publishing capability.
- `docs/platform-rendering-rules/` exists with platform rule docs; the earlier `inkforge/docs/platform-rendering-rules/wechat-rules.md` note was re-checked and corrected as stale task-research wording rather than a live code defect.

## Research References

- `research/wechat-rendering-rules.md` - current WeChat export chain is close for pasteable inline HTML, but real blockers remain around formula-to-static rendering, image hard limits, and material uploader stubs.
- `research/xiaohongshu-rendering-rules.md` - Xiaohongshu output should be native plain text with clean title/body/hashtags/image hints; HTML or Markdown leakage is a product defect for publishable text.
- `research/zhihu-rendering-rules.md` - Zhihu output should remain Markdown-compatible with explicit code languages, valid math handling, and predictable table behavior.

## Requirements

### R1. Full Real-Capability Audit

- Inventory every current export/platform capability under `inkforge/src/services/export/**`.
- Classify each capability as one of:
  - `real`: deterministic, implemented, validated by tests or runnable command.
  - `partial`: implemented but missing platform edge coverage, validation, or error handling.
  - `preview-only`: useful for local fidelity preview but not proof of real publishing ability.
  - `stub`: deliberately throws or returns a placeholder.
  - `dead/stale`: referenced by docs/tests but not present or not reachable.
- Produce a task-local audit artifact mapping capability to code path, tests, gaps, and next action.

### R2. WeChat Rendering Rules

- Keep WeChat native output as pasteable HTML with fully inline styles and no reliance on `class`, `<style>`, JavaScript, or external CSS.
- Preserve or implement deterministic transforms for:
  - Markdown to sanitized HTML.
  - CSS variable replacement.
  - `juice`-style inline CSS.
  - external links converted to readable footnotes, while WeChat-domain links remain safe.
  - nested `li > ul/ol` list repair.
  - code highlighting that survives class removal through inline token styles.
  - table cell inline styles.
  - CJK/Latin spacing and mobile width clamp.
- Fix verified gaps where practical in the service layer:
  - image width policy must be enforced or deterministically downgraded, not only warned.
  - formula output must not leak class/CSS-dependent KaTeX HTML into the final WeChat output without an explicit degradation strategy.
  - stale docs path references must be re-checked and corrected in task artifacts or code when actually present.
- Any true WeChat material-library upload remains out of scope unless credentials/config already exist; uploader stubs must be honestly reported and not counted as real ability.

### R3. Xiaohongshu Rendering Rules

- Native Xiaohongshu export must be plain text, not HTML.
- Markdown syntax must be converted into human-readable text:
  - headings become short decorated section labels.
  - lists become readable bullets or numbered lines.
  - links become text plus URL/reference text without clickable-link assumptions.
  - tables, code blocks, images, footnotes, citations, LaTeX, and unsupported blocks degrade into readable text.
- Title handling must enforce a 20-character product limit with overflow preserved in body text.
- Paragraphs must be tightened to a configurable small line count, defaulting to the existing conservative split behavior unless research and tests justify a change.
- Hashtags must be normalized, deduplicated, limited, and optionally appended to the body.
- Image hints must prefer 3:4 vertical publishing guidance with concrete dimensions.
- Emoji/decorative marker density must be validated so service output does not become spammy.

### R4. Zhihu Rendering Rules

- Native Zhihu export must remain Markdown-compatible rather than WeChat-style fully inlined HTML.
- Code fences must preserve or coerce language labels for reliable highlighting.
- LaTeX must either:
  - remain valid `$...$` / `$$...$$` Markdown when preservation is selected, or
  - convert to a deterministic Zhihu-compatible equation image placeholder when conversion is selected.
- Tables must have explicit behavior: preserve Markdown tables, convert to simple HTML tables, or downgrade according to options; default behavior must match tests and docs.
- Mermaid, task lists, GFM alerts, citations, footnotes, and unsupported HTML must be cleaned or downgraded without leaking internal placeholders.

### R5. Validation and Tests

- Add or update focused tests for every fixed gap.
- Run a non-mutating quality gate:
  - `pnpm -C inkforge exec vitest run <targeted export tests>`
  - `pnpm -C inkforge exec vue-tsc --noEmit`
  - `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet`
- Do not rely on `pnpm -C inkforge lint` for verification unless intentionally applying autofixes, because the package script uses `--fix`.
- If a repo-wide gate is too slow or blocked, record the exact command, failure, and narrower verified substitute.

### R6. Trellis and Documentation

- Keep this PRD current as scope decisions are made.
- Persist external/platform research under this task's `research/` directory.
- Update existing platform docs or Trellis specs if the implementation establishes new executable conventions.
- Record all remaining non-real capabilities as explicit gaps rather than silently treating them as complete.

## Acceptance Criteria

- [x] A task-local real-capability audit artifact exists and maps every export/platform capability to evidence.
- [x] WeChat native export has tests proving final output has no `<style>`, no `class=`, no unsafe tags, no `javascript:`, no unresolved CSS variables, and deterministic handling for external links, images, code, tables, lists, formulas/degradation, image width, and unsupported CSS stripping.
- [x] Xiaohongshu native export has tests proving no raw HTML/Markdown leakage, title split, paragraph tightening, hashtag normalization/deduplication/limits, image hints, unsupported-element degradation, and decorative density checks.
- [x] Zhihu native export has tests proving Markdown-compatible output, valid code fences, formula preservation/conversion behavior, table behavior, and cleanup of unsupported blocks/placeholders.
- [x] Uploader stubs and preview-only renderers are either made real or documented as not real capability and excluded from completion claims.
- [x] Stale docs/references discovered during audit are corrected or re-checked and corrected in task artifacts when the defect was only stale wording.
- [x] Targeted tests and export scoped lint pass with non-mutating commands; repo-wide lint/typecheck were run and are blocked only by frontend Hub files outside this task's no-frontend boundary.
- [ ] The final response includes a prompt-to-artifact checklist with file paths and command evidence.

## Definition of Done

- Requirements above are implemented or explicitly recorded as verified out-of-scope gaps.
- No frontend component/view/style files are modified.
- No mock data, placeholder success, or fake platform call is introduced.
- Tests cover the changed service-layer behavior.
- Trellis task artifacts reflect the final actual state.

## Technical Approach

1. Use Memory and Trellis to avoid duplicate task creation and recover prior repo truths.
2. Use Serena/ABCoder for code exploration where available; use direct file inspection only for non-code artifacts or tool fallback.
3. Use external research for platform constraints before changing rules.
4. Audit current service-layer capability before editing.
5. Patch narrowly in `inkforge/src/services/export/**` and adjacent service utilities only.
6. Verify by targeted tests first, then typecheck/lint.
7. Finish with a completion audit against this PRD.

## Out of Scope

- Frontend visual redesign, Vue component changes, route changes, CSS polishing, or app shell changes.
- Real platform credential setup, OAuth, or upload API calls that require secrets not present in the repo.
- Claiming WeChat/Xiaohongshu/Zhihu live publishing success without real API credentials and verifiable network calls.
- Replacing the whole editor stack or export UI.

## Technical Notes

- Current core paths:
  - `inkforge/src/services/export/index.ts`
  - `inkforge/src/services/export/wechat.ts`
  - `inkforge/src/services/export/xiaohongshu-text.ts`
  - `inkforge/src/services/export/zhihu-markdown.ts`
  - `inkforge/src/services/export/platform-rules/`
  - `inkforge/src/services/export/quality-detector.ts`
  - `inkforge/src/services/export/image-pipeline/`
  - `inkforge/src/services/rendering/optional-renderers.ts`
  - `inkforge/src/services/markdown-ext/registry.ts`
- Existing verification commands from memory for this repo:
  - `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet`
  - `pnpm -C inkforge exec vue-tsc --noEmit`
  - `pnpm -C inkforge exec vitest run --reporter=default`
  - `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
- Current task path: `.trellis/tasks/02-26-enhance-export-rendering/`
