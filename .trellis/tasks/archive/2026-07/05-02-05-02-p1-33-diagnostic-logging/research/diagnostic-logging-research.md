# Spec 33 Diagnostic Logging Research

## Local Findings

- Existing `services/error.ts` provides console logging and `AppError`, but not persisted activity logs.
- Existing `services/audit` already owns compliance audit records and has separate retention requirements. Spec 33 must not merge activity logs into audit logs.
- Current Dexie schema after Spec 32 is v14, so diagnostic tables should be additive v15 stores.

## External Verification

### Grok Search

Query: `browser client-side diagnostic logging IndexedDB batching retention redaction localStorage fallback best practices`

Findings:

- IndexedDB is appropriate for structured, queryable, higher-volume client diagnostics.
- localStorage should be fallback-only because it is synchronous and small.
- Batching reduces write overhead; critical records may bypass the queue.
- Redaction should happen before buffering/persistence.
- Time/count retention is required because browser storage can be evicted.

### Context7 Dexie

Library: `/websites/dexie`

Findings:

- Multi-row writes should use Dexie transactions or bulk operations.
- Caught transaction errors must be rethrown if rollback is required.

### Context7 Pinia

Library: `/vuejs/pinia`

Findings:

- Async stores should expose explicit loading and error fields and rethrow failures after state capture.

## Baseline Decision

Implement an additive service/store baseline with memory trace buffer, batched IndexedDB writes, critical fallback, redaction, retention, and export-log records. Do not create placeholder settings UI.
