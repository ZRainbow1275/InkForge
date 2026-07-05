# Logging Guidelines

> How logging is done in this project.

---

## Overview

Inkforge has two logging layers:

- `src/services/error.ts` exposes the central runtime `logger` used by stores,
  router guards, and services for debug/info/warn/error messages.
- `src/services/activity-logger/` persists diagnostic activity/export logs to
  IndexedDB with localStorage fallback for critical records.

Use the runtime logger for immediate diagnostics and the activity/audit services
when evidence must survive reloads or support later investigation.

---

## Log Levels

- `debug`: verbose development diagnostics; default log level includes this only
  outside production.
- `info`: successful meaningful service events.
- `warn`: recoverable failures where primary user data remains safe, such as
  sync dirty tracking or wiki-link repair failing after a local write.
- `error`: failed user-facing operations or service failures.
- `critical`: activity logger level for records that should be persisted and
  mirrored to localStorage fallback.

---

## Structured Logging

- Prefer structured context objects over string concatenation.
- Include stable ids and operation names: `articleId`, `operation`,
  `providerId`, `profileId`, `docId`, or `correlationId`.
- Normalize unknown errors with `error instanceof Error ? error.message :
  String(error)`.
- The central logger sanitizes sensitive fields and truncates long strings.
- Activity logger records are Zod-validated before persistence.

---

## What to Log

- Service boundary failures, especially database, provider, export, parser, and
  sync operations.
- Recoverable background side-effect failures that should not abort the primary
  write.
- Export outcomes and diagnostics through `recordExportLog` when the result is
  part of a user-facing export flow.
- Audit-worthy document/security actions through the audit service rather than
  generic console logging.

---

## What NOT to Log

- Raw passwords, access tokens, refresh tokens, API keys, SSH passphrases, or
  provider credentials.
- Full article bodies, private drafts, or large raw HTML/Markdown payloads unless
  a redactor explicitly reduces them.
- Unredacted diagnostic objects from external providers.
- Repeated duplicate errors when one visible error and one structured record are
  enough.

---

## 2026-07-05 executable examples and anti-patterns

### Real code examples from the current tree

```ts
// inkforge/src/services/activity-logger/logger.ts
const NORMAL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const CRITICAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const DEFAULT_BATCH_SIZE = 100
```

```ts
// inkforge/src/services/activity-logger/logger.ts
trace(event: string, data: DiagnosticPayload = {}): ActivityLogRecord {
  const record = this.buildRecord('trace', event, data)
  publishActivityLogRecord(record)
  return record
}
```

### Anti-patterns

```ts
// Bad: leaking local runtime state or secrets.
logger.info('wechat session', { rawCredential: 'browser-secret', localProfileLabel: 'redacted-runtime-profile' })

// Good: log redacted business state only.
logger.info('wechat export proof collected', { platform: 'wechat', artifactCount: 3 })
```

Every log payload must be structured and redaction-safe. Do not add ad-hoc `console.log` debugging in committed code.
