# P1 Smart Punctuation Baseline

## Source Spec

- `prompts/0420/specs/50-smart-punctuation-spec.md`
- Related dependencies: `01-spec-editor-typora.md`, `07-settings-full-spec.md`, `49-editor-keymap-spec.md`
- Date: 2026-05-03
- Owner: ZRainbow1275

## Goal

Upgrade Inkforge's existing `SmartPunctuation` editor extension from a small global toggle into a real Spec 50 baseline: rule-level smart punctuation, CJK/ASCII spacing, context safeguards, Settings controls, and validation through the actual TipTap editor pipeline. The implementation must preserve the current Typora/editor architecture and must not mutate article repositories directly.

## Required Deliverables

1. Rule model and defaults
   - Keep the existing SmartPunctuation extension path and extend it instead of replacing the editor stack.
   - Provide a typed rule registry with stable rule ids, labels, descriptions, previews, default enabled state, and Settings-backed enabled state.
   - Default enabled rules must include curly quotes, em dash, ellipsis, copyright/trademark symbols, Pangu spacing, and existing Typora Markdown input rules where already provided by TipTap.
   - Conservative rules such as arrows, fractions, multiplication, degrees, spaced dash, and autolink must be disabled by default.

2. Editor behavior
   - Handle real user text input through the TipTap/ProseMirror extension pipeline.
   - Avoid IME composition, code blocks, inline code marks, likely URL contexts, and source-mode editing.
   - Do not scan the whole document on every input; only inspect bounded text around the cursor.
   - Set clear transaction metadata for smart punctuation changes so tests and diagnostics can distinguish them from ordinary typing.

3. Settings integration
   - Preserve the existing `settings.editor.smartPunctuation` master switch.
   - Add rule-level Settings state and an Editor Tab rule matrix with per-rule toggles.
   - Settings changes must take effect immediately in the existing editor instance without recreating the editor.
   - Add reset affordances for the Smart Punctuation rule group using real persisted settings state.

4. Link and Source-mode compatibility
   - Disable automatic URL linking by default in the Link extension to satisfy Spec 50's E-08 C裁决.
   - Source mode must not receive SmartPunctuation transformations through the TipTap extension.
   - Existing manual link creation shortcuts and toolbar flows must remain intact.

5. Tests and validation
   - Add unit coverage for rule matching, context suppression, metadata, Pangu spacing, disabled rules, and dynamic settings.
   - Run targeted tests, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build`.
   - Browser smoke must use a real local Workstation article and real keyboard input, with console errors checked after reload.

## Non-Goals

- Do not create mock documents, fake IndexedDB rows, or localStorage-only evidence.
- Do not implement a full standalone typographer service detached from TipTap.
- Do not make autolink default-on; manual link creation remains the path.
- Do not change unrelated Workstation shortcuts, toolbar actions, export adapters, or repository persistence.

## Architecture Contract

Primary flow:

`SettingsView -> settings store -> EditorPanel extension options -> SmartPunctuation ProseMirror plugin -> editor transaction -> existing serialization/autosave -> Article repository`

SmartPunctuation may dispatch ProseMirror transactions. It must not write article content directly, bypass autosave, or create persistence rows.

## Acceptance Criteria

- Master switch off disables all smart punctuation behavior.
- Per-rule off disables only that rule while leaving other enabled rules active.
- `--`, `...`, double/single quotes, `(c)`, `(r)`, `(tm)`, and CJK/ASCII adjacency transform according to enabled rules.
- Default-disabled rules do not fire until enabled.
- Code block, inline code, likely URL context, IME composition, and Source mode are avoided.
- Link extension no longer autolinks typed or pasted URLs by default.
- Settings UI shows the Smart Punctuation rule matrix and persists changes through the existing settings store.
- No emoji icons are introduced.
- Targeted/full tests and build pass or existing unrelated warnings are documented.

## External References

- Tiptap Input Rules API: https://tiptap.dev/docs/editor/api/input-rules
- Tiptap custom Extension guide: https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension
- Tiptap Link autolink/linkOnPaste options: https://tiptap.dev/docs/editor/extensions/marks/link
- ProseMirror Transaction metadata: https://prosemirror.net/docs/ref/#state.Transaction.setMeta
- ProseMirror input rules reference: https://prosemirror.net/docs/ref/#inputrules

## Implementation Notes

- Added a typed rule registry in `inkforge/src/services/smart-punctuation.ts` with stable rule ids, defaults, labels, descriptions, and previews.
- Upgraded the existing TipTap `SmartPunctuation` extension in place. The extension now handles bounded single-character text input, dispatches smart-punctuation transactions with explicit metadata, and skips disabled settings, IME composition, code blocks, inline code marks, link marks, likely URL contexts, Markdown link URL contexts, and Source mode.
- Kept `settings.editor.smartPunctuation` as the master switch and added persisted `settings.editor.smartPunctuationRules` with normalization through the existing settings schema.
- Wired `EditorPanel.vue` to pass live settings getters into the extension, so Settings changes apply to the existing editor instance without recreating it.
- Added the Settings Editor tab rule matrix with per-rule toggles, previews, per-rule default reset, and group reset using real persisted settings state.
- Disabled `LinkExtension` `autolink` and `linkOnPaste` by default while preserving manual link flows.
- Added regression coverage in `inkforge/src/extensions/SmartPunctuation.test.ts` for transformations, metadata, dynamic disabled rules, Pangu spacing, URL suppression, code suppression, inline-code/link suppression, and master-switch behavior.

## Validation Notes

- `pnpm vitest run src/extensions/SmartPunctuation.test.ts` passed: 9 tests.
- `pnpm exec vue-tsc --noEmit` passed after removing an unused parameter caught by the type checker.
- `pnpm vitest run src/extensions/SmartPunctuation.test.ts src/extensions/EditorKeymap.test.ts` passed: 21 tests across 2 files.
- `pnpm lint` passed with existing warnings only: template shadowing in `src/App.vue`, required prop default in `MarkdownEditor.vue`, and pre-existing `v-html` warnings in preview/export/publish/theme/workstation files.
- `pnpm vitest run` passed: 207 tests across 28 files.
- `pnpm build` passed with existing Vite dynamic/static import and large chunk warnings.
- Real browser smoke used the running local app at `http://127.0.0.1:3005/` and an existing real Workstation draft, not mock data or injected rows.
- Browser smoke confirmed: `A--` converted to `A—`, `...` converted to `…`, straight quotes converted to curly quotes, CJK/ASCII adjacency inserted a space, code blocks preserved `A--`, Source mode preserved `A--`, and Settings rendered the Smart Punctuation rule matrix.
- Additional browser smoke confirmed that disabling only the `破折号` rule made real Typora input `A--` remain `A--`; the rule was then restored to enabled.
- Additional browser smoke confirmed that typing `https://example.test ` in Typora mode produced plain text only: Tiptap JSON had no link mark and `.ProseMirror a` count was `0`.
- Fresh reload console check after browser smoke reported no console errors.
- `gitnexus_detect_changes(scope="all")` was run. It reported `critical` because the repository already contains a broad dirty worktree with 155 changed files and 464 changed symbols; Spec 50 was therefore reviewed and validated through the narrow files listed above plus full project gates instead of treating the global dirty-worktree risk as task-local.
