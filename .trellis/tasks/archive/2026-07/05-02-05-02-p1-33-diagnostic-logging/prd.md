# P1 Diagnostic Logging Baseline PRD

## Source Of Truth

- Primary spec: prompts/0420/specs/33-diagnostic-logging-spec.md
- Dependency specs: prompts/0420/specs/17-crash-recovery-spec.md, prompts/0420/specs/24-permission-audit-spec.md, prompts/0420/specs/27-performance-slo-spec.md, prompts/0420/specs/40-dev-panel-spec.md
- Implementation truth: existing `services/error.ts` logger is console-oriented; audit logs are separate and must not be merged with activity diagnostics.

## Goal

Deliver a real local-first Diagnostic Logging baseline: structured activity logs persisted to IndexedDB, trace memory ring buffer, critical localStorage fallback, redaction, retention cleanup, export log records, error classification, and a service-backed diagnostics Pinia store.

## Non-Negotiables

- No mock logs, fake diagnostics, seeded export history, or simulated success rows.
- Do not replace existing audit logs; activity logs and export logs are separate stores.
- Redact secrets before buffering or persistence.
- L0 trace must stay memory-only. L1-L4 must persist according to the level policy.
- Critical logs must attempt immediate persistence and localStorage fallback.
- All records must pass typed validation before write.

## Baseline Scope

1. Add Dexie v15 stores for `activityLogs` and `exportLogs` without deleting existing tables.
2. Add `src/services/activity-logger` with schemas, redaction, error classification, batching/flush, retention, export records, JSONL export, fallback replay, and query APIs.
3. Add `useDiagnosticsStore` with real async actions and loading/error state.
4. Add targeted tests covering redaction, trace memory-only behavior, batch flush, critical fallback, retention, export logs, error classification, and store state.
5. Add browser IndexedDB smoke proving real v15 writes, query, cleanup, fallback, export log, and zero console errors.

## Out Of Scope For This Slice

- Settings ActivityLogViewer UI.
- DevPanel live event stream.
- Toast/SafeMode visual integration.
- Diagnostic zip package and server telemetry upload.
- Worker-based retention and 50K log benchmark.

## Acceptance Criteria

- `activityLogger.trace` records only in memory.
- `info/warn/error` enqueue and flush to `activityLogs` with redacted payloads.
- `critical` writes immediately and stores localStorage fallback evidence.
- `cleanupExpired` respects 7-day normal and 30-day critical retention.
- `recordExportLog` writes `exportLogs` with success/failure outcome and diagnostic linkage.
- `classifyDiagnosticError` maps known failures to four severity categories and defaults safely.
- Targeted tests, type-check, lint, full Vitest, build, and browser IndexedDB smoke pass.
