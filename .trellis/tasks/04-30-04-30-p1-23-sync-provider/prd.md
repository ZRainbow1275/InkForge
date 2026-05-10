# P1 Sync Provider Baseline

## Source

- prompts/0420/specs/23-sync-provider-spec.md
- prompts/0420/specs/24-permission-audit-spec.md
- prompts/0420/acceptance-matrix.md

## Objective

Implement a compatible, no-mock baseline for Spec 23. The baseline must replace the existing local-only sync success path with provider-driven behavior: local document mutations are tracked as real pending sync work, unconfigured providers do not report success, and all configured provider operations use real protocol/runtime boundaries.

## Scope

- Keep existing sync crypto format, key derivation, change tracker, conflict resolver, and store API unless a small compatibility change is required.
- Add the core SyncProvider model, validation, vector-clock helpers, and typed provider errors.
- Add real provider boundaries for WebDAV, Git, and SelfHosted sync without fake success.
- Add IndexedDB-backed sync records for logs, outbox, and conflicts so pending work survives page refresh.
- Wire article create/update/delete flows into sync tracking without blocking the existing document persistence path.
- Add unit coverage for vector clocks, config validation, and the no-provider no-fake-success contract.
- Update prompts/0420 docs with a baseline acceptance note and keep full Spec 23 pending unless the full external-provider matrix is genuinely complete.

## Non-Goals

- Do not claim WebDAV/Git/SelfHosted remote sync is fully complete without real endpoints, credentials, and integration evidence.
- Do not store raw passwords, tokens, SSH keys, or passphrases in IndexedDB.
- Do not introduce fake remote data, sample documents, mock sync success, or simulated provider responses.
- Do not remove existing sync encryption, change tracking, conflict resolver, article CRUD, export, editor, or settings behavior.

## Acceptance Criteria

- SyncEngine.sync must fail explicitly and preserve pending changes when no provider is configured.
- Provider config validation must reject empty endpoints, invalid HTTP Git remotes, and missing runtime capabilities.
- Article create/update/delete must enqueue real dirty records through the sync store and must not fail the primary local write if sync tracking fails.
- Sync logs/outbox/conflicts must use real IndexedDB tables instead of in-memory-only state for the new baseline records.
- Tests must cover vector-clock relation handling, provider validation, and no-provider preservation of pending changes.
- vue-tsc, targeted vitest, ESLint, build or a documented build attempt, diff check, and touched-file emoji scan must be run before closeout.
