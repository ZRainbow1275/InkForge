# P1 Import Wizard Format Detection Baseline

## Goal

Harden the existing real file import path into an Import Wizard compatible baseline by adding explicit format detection, safe unsupported-format rejection, and a visible Hub import completion summary, without replacing the current file picker or article creation pipeline.

## Source Specs

- `prompts/0420/specs/44-import-wizard-spec.md`
- `prompts/0420/specs/10-markdown-authority-spec.md`
- `prompts/0420/specs/12-file-manager-spec.md`
- `prompts/0420/specs/28-asset-pipeline-spec.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/frontend/quality-guidelines.md`

## Implementation Scope

- Preserve existing `articleStore.importFromFiles()` and `services/file-import` as the real import pipeline.
- Export strict format detection metadata for Markdown, HTML, TXT, and known-but-not-yet-supported migration formats.
- Reject unsupported DOCX/ZIP/JSON/Bear/unknown formats with explicit errors instead of silently importing as plain text.
- Keep Markdown/HTML/TXT import behavior real and compatible with existing frontmatter/image extraction.
- Add unit coverage for format detection and unsupported-format rejection.
- Surface the latest real import result on Hub so users see success, failure, skipped oversize, and error details from the actual store call.

## Non-Goals

- Do not implement full five-step `ImportWizard.vue` UI in this baseline.
- Do not add fake DOCX/ZIP/Notion/Obsidian/Roam/Bear converters.
- Do not change Dexie schema, article repository, or asset pipeline storage.
- Do not mock successful imports or seed demo imported documents.

## Acceptance Criteria

- Markdown, Markdown-like text MIME, HTML, and TXT remain supported.
- `.docx`, `.zip`, `.json`, `.bear`, and unknown binary extensions return unsupported metadata and are rejected with user-visible errors.
- Oversize files are still skipped before parsing.
- `importFromFiles()` preserves existing article creation for supported formats and accumulates detection errors for unsupported files.
- Hub records and renders the latest import result after each import attempt.
- Type-check, lint, targeted tests, full tests/build, BOM scan, emoji scan, and Trellis context validation pass or existing unrelated warnings are documented.