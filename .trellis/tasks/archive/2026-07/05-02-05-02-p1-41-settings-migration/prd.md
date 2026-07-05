# P1 Settings Migration Baseline

## Goal

Deliver the `prompts/0420/specs/41-settings-migration-spec.md` baseline inside the existing Inkforge frontend without deleting or replacing existing Settings functionality.

## Source Specs

- `prompts/0420/specs/41-settings-migration-spec.md`
- `prompts/0420/specs/07-settings-full-spec.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/frontend/quality-guidelines.md`

## Implementation Scope

- Add a real Settings migration service layer for schema version detection, v0/v1/v2 to current migration transforms, diff generation, deprecation metadata, and bounded rollback snapshot helpers.
- Integrate the migration service into `useSettingsStore` while preserving existing `exportSettings()`, `importSettings()`, reset, tab reset, and shortcut reset behavior.
- Ensure every import validates through Zod before overwriting current Settings.
- Create a rollback point before successful import/migration apply and keep the existing 10-snapshot retention boundary.
- Expose import preview state so Settings UI can show schema, diff, deprecation, and rollback information from real store state.
- Add targeted Vitest coverage for multi-version migration, future-version rejection, validation failure, diff/deprecation summary, and bounded snapshots.

## Non-Goals

- Do not implement DB schema migration; Spec 41 explicitly scopes this to Settings/config migration.
- Do not build the full future ImportWizard from Spec 44 in this task.
- Do not replace the existing Settings view or rewrite the Settings store architecture.
- Do not introduce mock/sample Settings rows or fake success paths.

## Acceptance Criteria

- Legacy unversioned Settings can be previewed and normalized to `CURRENT_SETTINGS_SCHEMA_VERSION`.
- Future Settings versions are rejected without overwriting current Settings.
- Invalid JSON and invalid migration output fail safely without overwriting current Settings.
- Successful import creates a rollback snapshot and updates `lastMigrationPreview`.
- Settings About migration section displays current schema, snapshot count, latest preview summary, deprecated paths, and a restore-latest action.
- Targeted tests, type-check, lint, full test suite, and production build pass or any unrelated pre-existing failure is explicitly documented with evidence.
- `prompts/0420` and `.trellis/spec` docs are updated to reflect what was actually implemented.

## Constraints

- Keep all existing Settings tabs, registry entries, reset paths, and export/import entry points.
- No emoji glyphs; only text, existing inline SVG, or installed icon libraries.
- No mocks or simulated app data in product code.
- GitNexus/Serena/ABCoder impact tools were attempted in this environment and returned `Transport closed`; validation must be compensated with real local tests and command evidence.
