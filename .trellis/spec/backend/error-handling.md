# Error Handling

> How errors are handled in this project.

---

## Overview

Inkforge uses typed domain errors at service boundaries and user-facing message
conversion at store/UI boundaries. Generic failures are normalized with
`error instanceof Error ? error.message : String(error)` and logged through the
central logger.

---

## Error Types

- `AppError` in `src/services/error.ts` is the broad application error type.
  It carries an `ErrorCode`, optional `context`, a timestamp, and a
  `toUserMessage()` conversion.
- Feature services may define narrower domain errors. Example:
  `TagSystemError` and subclasses in `src/services/tag-system/types.ts` expose
  codes such as `TAG_NAME_CONFLICT`, `TAG_LIMIT_EXCEEDED`, and
  `TAG_NOT_FOUND`.
- Provider integrations should throw typed provider errors when remote calls
  fail. Example: `WebDAVProvider` throws `SyncProviderError` for auth failure,
  remote rejection, and unsupported conflict resolution.
- Explicitly unsupported boundaries should throw, not return fake success.

---

## Error Handling Patterns

- Store actions set loading/error refs, call service/repository methods inside
  `try/catch/finally`, and restore loading state in `finally`.
- For user-facing load/parse failures, stores convert known `AppError` values
  with `toUserMessage()` and keep raw details in logs.
- Background side effects such as sync dirty tracking or wiki-link repair may
  catch and log warnings while preserving the primary local write.
- Provider methods should update their own status/log state and rethrow when
  the caller needs to react.
- Zod parse failures should fail at the repository/service boundary; do not
  silently coerce invalid user input into records.

---

## API Error Responses

There is no server HTTP API response envelope in the current nested app. The
equivalent boundary contracts are:

- Store state: `error`, `loadError`, `parseError`, `lastError`, or typed result
  objects.
- Service result objects: e.g. sync returns `success: false` for recoverable
  failures.
- Provider status objects: e.g. `getStatus()` returns `state`, counts,
  `providerId`, and `errorMessage`.
- Logs/audit records: persistent diagnostic evidence should use the activity
  logger or audit service instead of console-only messages.

---

## Common Mistakes

- Do not swallow exceptions without at least a structured warning when the
  operation is background work.
- Do not expose raw stack traces or provider credential details to UI state.
- Do not replace typed domain errors with string-only errors when the caller
  needs to branch on a code.
- Do not make unsupported remote operations look successful; use a typed
  unsupported error or an explicit paused/unavailable state.
