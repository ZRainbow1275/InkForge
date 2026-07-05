# P1 Permission Audit Baseline

## Goal

Implement a compatible baseline for `prompts/0420/specs/24-permission-audit-spec.md` that makes permission decisions and security-relevant operations observable through a real local-first audit ledger. The baseline must not mock remote or multi-user capabilities, and must not remove existing functionality.

## Source Of Truth

- `prompts/0420/specs/24-permission-audit-spec.md`
- `prompts/0420/acceptance-matrix.md`
- `.trellis/spec/backend/database-guidelines.md`
- `.trellis/spec/frontend/state-management.md`

## Baseline Scope

1. Add real IndexedDB-backed audit persistence with append-only entries, query, export, cleanup, and fallback storage for write failures.
2. Add a typed permission model and `PermissionBroker` that uses the existing ReBAC `PermissionStore` instead of replacing it.
3. Record allow/deny permission decisions with structured evidence and integrity chaining metadata.
4. Integrate audit writes into high-value local operations that exist today: article create/update/delete/import, settings reset/danger actions, sync push/pull/conflict flows, and permission relation mutations/checks.
5. Add a Pinia audit store and Settings audit tab so users can query recent audit entries, filter them, and export CSV/JSON from real local data.
6. Preserve no-mock semantics: unavailable profile/server/share-password capabilities must fail explicitly or remain pending; no fabricated collaborator/viewer behavior.
7. Add automated tests covering repository query/export/cleanup, permission decisions, integrity verification, and at least one integrated article/sync audit path.
8. Update spec docs and acceptance notes with implementation status, evidence, and remaining full-pass gaps.

## Non-Goals For This Compatible Baseline

- No fake server-side multi-user collaboration.
- No simulated IP address, remote SIEM, or cloud audit sink.
- No plaintext secret logging and no password hashing shortcut that pretends to be bcrypt if the dependency/runtime is absent.
- No broad rewrite of Settings, account, sync, or article stores.

## External Practice Notes

OWASP Logging guidance and OWASP Developer Guide recommend logging access-control rule violations, both success and failure for security events, sufficient who/what/when/outcome metadata, integrity protection, central logging routines, and avoiding secrets or unnecessary sensitive data. NIST SP 800-92 frames log management as practical guidance for log generation, protection, review, and retention.

## Acceptance Evidence Required

- Type-check passes: `pnpm exec vue-tsc --noEmit`
- Targeted audit tests pass: `pnpm exec vitest run <audit tests>`
- ESLint passes: `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`
- Production build passes with known local heap setting: `NODE_OPTIONS=--max-old-space-size=4096 pnpm build`
- Touched-file diff check and no-emoji scan pass
- If UI changes are made, browser smoke for `/settings?tab=audit` must prove the audit tab renders real persisted data or a true empty state.

## Completion Note

This task may be marked complete only after code, tests, validation, and docs/spec updates are all done. Full Spec 24 remains pending if remote multi-user, bcrypt share-password, plugin install, or full 25-test matrix coverage is not implemented.