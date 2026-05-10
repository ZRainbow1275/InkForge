# P1 CustomCSS Baseline

## Goal

Implement Spec 54 as a real, scoped CustomCSS feature under Settings advanced controls. Advanced users can edit CSS, validate it through a sandbox, apply it to `.editor-content` only, disable it safely, and import/export the source CSS without affecting existing export-only custom CSS behavior.

## Authoritative Inputs

- `prompts/0420/specs/54-custom-css-spec.md`
- `prompts/0420/specs/20-theme-font-typography-spec.md`
- `prompts/0420/specs/17-crash-recovery-spec.md`
- `prompts/0420/specs/41-settings-migration-spec.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/type-safety.md`

## Current Baseline

- `SettingsView.vue` already has Settings tabs and an export-only `settings.export.customCss` textarea. This must remain intact and must not be repurposed as runtime CustomCSS.
- `CssEditor.vue` already wraps `vue-codemirror` with `@codemirror/lang-css`, but it is currently tied to `themeStore.customCSS`. The implementation should reuse or generalize this existing editor instead of adding a disconnected editor stack.
- `settings.ts` already validates exported settings with Zod and has `export.customCss` capped at 50,000 characters.
- `theme.ts` has a legacy `customCSS` field appended to generated theme CSS. It is not the runtime Spec 54 store and should not become another injection path.
- `css-sanitizer.ts` has older generic CSS security checks. Spec 54 needs a stricter CustomCSS sandbox that scopes selectors and returns warnings/errors/status metadata.

## Implementation Requirements

1. Data model

- Add a persisted `advanced.customCss` settings branch while preserving every existing settings field.
- `enabled=false` is default and removes runtime style injection while preserving `draft` and `published` source CSS.
- Keep typed status fields for confirmation, last application, suspension reason, and recent error log entries.
- Cap stored CSS at 50,000 characters and error logs at 20 entries through Zod.

2. Sandbox

- Use a real CSS parser pipeline, not raw string concatenation.
- Enforce maximum CSS length 50,000 and maximum rule count 1,000.
- Reject `@import`, active content protocols, remote `url(http...)`, `!important`, `behavior`, `:host`, and `:host-context`.
- Allow `data:image/...` URLs only up to 50KB.
- Scope all selectors to `.editor-content`; `*`, `html`, and `body` root selectors become `.editor-content`.
- Keep existing `.editor-content` selectors from being double-prefixed.
- Emit warnings for frozen token overrides, `position: fixed`, and `contain: strict` without blocking apply.

3. Runtime

- Inject exactly one `<style id="inkforge-custom-css">` into `document.head` after successful sandboxing.
- Disable/remove style when settings disable CustomCSS, SafeMode is detected, or error-limit suspension triggers.
- Count sandbox/static/runtime errors toward a three-errors-per-minute suspension boundary. Parse-only syntax errors should not replace the last good style.
- Do not inject anything when no browser `document` exists.

4. UI

- Surface CustomCSS inside Settings advanced/developer area without removing any current Settings section or tab.
- Require a first-enable confirmation before enabling runtime CustomCSS.
- Provide CodeMirror CSS editing, apply, reset, import, export, snippet insertion, status, warnings, and recent error log controls.
- Do not use emoji icons. If icons are needed, use installed icon components.
- Existing export-only custom CSS remains available and keeps its current semantics.

5. Integration

- Wire runtime application at the app level so startup and persisted settings changes apply globally.
- SafeMode integration is implemented as CustomCSS self-protection: if an existing safe-mode marker is present, runtime CSS is not injected and settings are suspended. Do not redesign the broader SafeMode startup system for this task.
- Theme package embedded CustomCSS and sync conflict UX are documented as follow-up unless a real existing theme/sync import path is found and can be safely extended without mock behavior.

## Acceptance Criteria

- Default settings contain `advanced.customCss.enabled=false`; no `#inkforge-custom-css` style tag exists by default.
- Applying `h1 { color: rgb(1, 2, 3); }` injects `.editor-content h1` into `document.head`.
- Applying `body { background: red; }` injects `.editor-content { background: red; }` and does not target app chrome.
- Existing `.editor-content blockquote` selectors are not duplicated.
- `@import`, remote URLs, active protocols, `!important`, and forbidden host selectors are rejected with typed errors.
- Small `data:image/...` URLs are allowed; over-50KB data images are rejected.
- Three blocking errors within one minute disable runtime CustomCSS and remove the style tag while preserving the draft.
- Import/export operate on the user source CSS, not the scoped compiled CSS.
- Unit tests cover sandbox, runtime injection/removal, and settings normalization.
- Required validation: targeted tests, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build`.
- Browser smoke must use the real Settings UI and real Workstation page where possible; no localStorage/IndexedDB mock payloads as proof.

## Non-Goals

- No custom JavaScript injection.
- No replacement of ThemeEngine or typography settings.
- No large SafeMode startup rewrite.
- No fake theme marketplace, sync-provider, or update pipeline implementation.
- No deletion of existing export custom CSS, theme custom CSS, or settings modules.

## Implementation Notes

- Prefer a dedicated `src/services/custom-css/*` boundary for parser/sandbox/runtime code.
- Prefer adapting `CssEditor.vue` to prop/emits while retaining compatibility with current theme editor usage.
- Keep Settings component changes additive and scoped.
- If GitNexus cannot map new Vue symbols, compensate with targeted tests, full project checks, build, and browser evidence.


## Completion Evidence

- Implemented `advanced.customCss` as the persisted runtime branch and preserved the existing export-only `settings.export.customCss` behavior.
- Added a dedicated `src/services/custom-css/*` boundary for typed contracts, PostCSS-backed sandboxing, runtime singleton style injection, suspension helpers, snippets, and unit coverage.
- Generalized `CssEditor.vue` to support external `v-model` while retaining legacy `themeStore.customCSS` compatibility when no model is provided.
- Wired app-level runtime synchronization from persisted settings so startup and settings changes apply globally without requiring the Settings view to stay mounted.
- Added Settings Advanced UI for confirmation, CodeMirror editing, apply/reset, import/export, snippet insertion, diagnostics, status, and recent error logs.
- Browser smoke used the real Settings route and verified scoped injection, invalid CSS rejection, disable/remove, reset, persisted settings state, and clean fresh console errors.
- Validation passed on 2026-05-03: `pnpm vitest run src/services/custom-css/custom-css.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `NODE_OPTIONS=--max-old-space-size=4096 pnpm build`.
- Plain `pnpm build` exhausted the default Node heap; production build passed with the explicit 4096 MB heap option and existing Vite mixed-import / large-chunk warnings.
- GitNexus tool resources were available, but symbol-level impact/detect tools were not exposed in this runtime for new Vue/service symbols; this task compensates with targeted tests, full gates, build evidence, and browser smoke.
