# P1 Templates Baseline

## Goal

Deliver the first real Spec 42 baseline by adding a reusable Markdown template variable engine and wiring template creation through it, while preserving the existing Hub template picker and built-in template data.

## Source Specs

- `prompts/0420/specs/42-templates-spec.md`
- `prompts/0420/specs/31-document-lifecycle-spec.md`
- `prompts/0420/specs/22-command-palette-spec.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/frontend/quality-guidelines.md`

## Implementation Scope

- Add `src/services/template/` with typed template variables, syntax validation, user-input variable extraction, date/week/uuid/author rendering, and cursor marker removal with cursor offset reporting.
- Connect Hub template creation to the render engine so selected templates are materialized through the same variable path instead of raw Markdown passthrough.
- Preserve all existing `ARTICLE_TEMPLATES`, `TemplatePicker`, Hub entry points, and article creation behavior.
- Add targeted Vitest coverage for date formatting, variable rendering, cursor handling, extraction, and malformed variable validation.

## Non-Goals

- Do not replace the existing template picker UI in this baseline.
- Do not implement the full user-template IndexedDB repository, import/export UI, ZIP export, inline slash selector, or extension API yet.
- Do not delete or rename existing templates.
- Do not introduce mock template records or fake document creation success.

## Acceptance Criteria

- `renderTemplateVariables()` replaces `{{title}}`, `{{date:...}}`, `{{author}}`, `{{uuid}}`, and `{{weekNumber}}` using real context.
- `{{CURSOR}}` is removed and returns a cursor offset for future editor positioning.
- `extractUserInputVariables()` returns only user-input variables and excludes auto variables.
- `validateTemplateVariables()` rejects unclosed or unexpected variable braces.
- Hub template selection creates the document body from rendered template content.
- Targeted tests, type-check, lint, and full validation matrix pass or any unrelated pre-existing failure is documented.
