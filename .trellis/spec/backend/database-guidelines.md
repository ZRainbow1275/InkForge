# Database Guidelines

> Database patterns and conventions for this project.

---

## Overview

<!--
Document your project's database conventions here.

Questions to answer:
- What ORM/query library do you use?
- How are migrations managed?
- What are the naming conventions for tables/columns?
- How do you handle transactions?
-->

(To be filled by the team)

---

## Query Patterns

<!-- How should queries be written? Batch operations? -->

(To be filled by the team)

---

## Migrations

<!-- How to create and run migrations -->

(To be filled by the team)

---

## Naming Conventions

<!-- Table names, column names, index names -->

(To be filled by the team)

---

## Common Mistakes

<!-- Database-related mistakes your team has made -->

(To be filled by the team)

---

## Scenario: Sync Provider Durable Outbox

### 1. Scope / Trigger
- Trigger: sync provider work changes the Dexie schema and bridges article mutations, sync engine state, provider calls, logs, and conflict persistence.
- Apply this contract whenever local-first sync changes touch `db.ts`, `services/sync/*`, `stores/sync.ts`, or article CRUD dirty tracking.

### 2. Signatures
- DB tables: `syncOutbox`, `syncLogs`, `syncConflicts` on `InkForgeDB`.
- Outbox key: `id`; query indexes must include `status`, `profileId`, `providerId`, `createdAt`, `nextRetryAt`, and `[articleId+operation+status]`.
- Logs key: `id`; query indexes must include `providerId`, `profileId`, `operation`, `status`, and `startedAt`.
- Conflicts key: `id`; query indexes must include `docId`, `profileId`, `providerId`, `status`, and `detectedAt`.

### 3. Contracts
- Local article writes remain local-first, but every create/update/delete must enqueue a durable sync record after the local write succeeds.
- A missing provider is a real paused/failure state, not a successful sync state.
- Product code must not store raw passwords, token strings, or SSH passphrases in IndexedDB sync tables.
- Provider implementations must call real WebDAV, SelfHosted HTTP, or Tauri Git boundaries and must not return fabricated success.

### 4. Validation & Error Matrix
- Missing provider -> `paused` status, failure log, pending queue retained.
- Offline browser -> `offline` status, failure result, pending queue retained.
- Provider push partial failure -> mark failed outbox rows with error text and retain retryability.
- Conflict returned by provider -> persist `syncConflicts` with profile/provider identifiers and keep UI count visible.
- Secret unavailable for Basic/Digest -> typed provider error; never transmit `passwordHash` as a password.

### 5. Good/Base/Bad Cases
- Good: article update writes `articles` data, enqueues `syncOutbox`, and manual sync only clears the outbox after provider ack.
- Base: no provider and no pending changes still reports sync unavailable when the user presses manual sync.
- Bad: clearing `ChangeTracker` or marking outbox rows synced when no provider is configured.

### 6. Tests Required
- Unit: vector clock comparison, merge, and immutability.
- Unit: sync config validation rejects empty endpoints, insecure Git remotes, and file protocol Git remotes.
- Unit: no-provider sync returns failure, sets `paused`, keeps `lastSyncAt` null, and retains pending changes when present.
- Browser smoke: `/settings?tab=sync` renders provider, pending, conflict, and last sync status; manual sync without provider shows a real error.

### 7. Wrong vs Correct

#### Wrong
```typescript
if (!provider) {
  changeTracker.markSyncedBatch(pending.map(change => change.id))
  return { success: true, uploaded: pending.length, downloaded: 0, newConflicts: 0 }
}
```

#### Correct
```typescript
if (!provider) {
  updateState({ status: 'paused' })
  return failSync(startedAt, '同步提供者未配置，已保留待同步队列')
}
```

## Scenario: Permission Audit Ledger

### 1. Scope / Trigger
- Trigger: permission or audit work changes Dexie schema, local audit persistence, permission records, Settings audit views, or security-relevant business operations.
- Apply this contract when touching `services/audit/*`, `services/permissions/*`, `stores/audit.ts`, `utils/db.ts`, or audit injection points in Article, Sync, Account, Settings, Command, AI, Publish, Knowledge, or Plugin code.

### 2. Signatures
- DB tables: `auditLogs` and `resourcePermissions` on `InkForgeDB` schema version 8+.
- Audit key: `id`; required indexes include `profileId`, `action`, `severity`, `outcome`, `timestamp`, `docId`, `resourceId`, `resourceKind`, `entryHash`, `prevHash`, `[profileId+timestamp]`, `[profileId+action]`, `[profileId+docId]`, and `[profileId+severity]`.
- Resource permission key: `id`; required indexes include `profileId`, `resourceKind`, `resourceId`, `level`, `updatedAt`, `[resourceKind+resourceId]`, and `[profileId+resourceKind]`.
- Hash chain fields: each `AuditLogRecord` must carry `prevHash`, `entryHash`, `integrityVersion`, `integrityStatus`, and `createdAt`.

### 3. Contracts
- Audit payloads must be sanitized before persistence. Passwords, passphrases, tokens, secrets, credentials, authorization headers, sessions, raw content, markdown source, and content-like fields must not be stored in clear text.
- Audit writes should not block the primary user workflow. IndexedDB write failure may degrade to localStorage fallback evidence, but must be logged as a real failure, not a success claim. Repository `log()` must return `null` after fallback so event-bus consumers cannot present an unpersisted record as durable ledger success.
- `prevHash` must point to the previous record hash for the same profile ordered by timestamp/createdAt. Integrity validation must fail closed when hashes cannot be recomputed. After retention cleanup, the first retained row may use its stored `prevHash` as an external anchor, but every retained row must still verify its own `entryHash` and every retained adjacent pair must remain continuous.
- Local hash chaining is tamper-evident only. Do not describe it as tamper-proof, WORM, or remote compliance storage until a logically separate append-only sink exists.
- Permission checks must go through `PermissionBroker` at product boundaries. Direct low-level ReBAC store usage is acceptable only for internal graph traversal or tests, not as an unaudited business authorization boundary. `PermissionLevel.private` is owner-only and must not be mapped to broad ReBAC `view` semantics.
- Share-link creation requires an existing owner permission record for the resource. Never auto-create ownership while creating a share link; denied attempts must write `permission.share_link.create` audit evidence.
- Password-protected share links must fail closed if password verification is not implemented. Never simulate bcrypt compare or accept `passwordHash` as plaintext.

### 4. Validation & Error Matrix
- Missing crypto for share code -> throw a typed/runtime error; do not fall back to `Math.random`.
- IndexedDB audit write failure -> fallback evidence key under `inkforge-audit-fallback-*`, primary workflow continues, error is logged, and repository returns `null`.
- `integrityStatus === 'unavailable'` -> integrity verification returns invalid, not a false pass.
- New audit record after Settings page initialization -> refresh must include it; avoid stale fixed `to` query bounds.
- Password-protected share link without verifier -> denied audit record and no access grant.
- Missing/revoked/expired share link -> denied `permission.shared_access` audit; log only a short code prefix for unknown links, never the full secret code.
- Web filesystem permission in non-native runtime -> denied audit record and no fake native success.

### 5. Good/Base/Bad Cases
- Good: Settings high-risk reset writes a real `account.settings_change` record, UI refresh shows it, and integrity check validates its hash chain.
- Base: no audit records shows an empty audit list and valid zero-entry integrity check.
- Bad: seeding fake audit rows for UI screenshots, storing raw document content in payload, or calling a permission check without emitting an audit decision.

### 6. Tests Required
- Unit: payload sanitizer redacts secrets/content, preserves File/Blob metadata, caps long strings, and limits recursion depth.
- Unit: hash source is stable, previous hash changes the entry hash, and tampering fails verification.
- Unit: resource kind and permission level schemas reject unknown values.
- Unit: share code generation uses runtime crypto and produces URL-safe codes.
- Unit: PermissionBroker private checks are owner-only, share-link creation does not auto-upsert ownership, and invalid/expired share links write denied audit evidence.
- Unit: AuditRepository append failure returns `null` with fallback evidence, and retained-chain integrity verification stays valid after old rows are cleaned up.
- Browser smoke: `/settings?tab=audit` renders, a real UI action writes `auditLogs`, refresh shows the record count, integrity status becomes `valid`, and browser console errors stay at zero.

### 7. Wrong vs Correct

#### Wrong
```typescript
return { granted: true, reason: 'mock-owner' }
```

#### Correct
```typescript
const result = await permissionBroker.check(profileId, resourceId, 'document', 'shared-edit')
if (!result.granted) {
  throw new Error(result.reason)
}
```

## Scenario: Extension Plugin Registry

### 1. Scope / Trigger
- Trigger: extension/plugin work changes Dexie schema, local manifest validation, extension lifecycle state, extension storage, command contribution, Settings extension UI, or plugin audit boundaries.
- Apply this contract when touching `services/extensions/*`, `stores/extensions.ts`, `utils/db.ts`, `types/command-palette.ts`, `views/SettingsView.vue`, or plugin-related audit actions.

### 2. Signatures
- DB tables: `extensions` and `extensionStorage` on `InkForgeDB` schema version 9+.
- Extension key: `id = profileId::extensionId`; required indexes include `profileId`, `extensionId`, `status`, `enabled`, `installedAt`, `updatedAt`, `[profileId+extensionId]`, and `[profileId+status]`.
- Extension storage key: `id = profileId::extensionId::key`; required indexes include `profileId`, `extensionId`, `key`, `updatedAt`, `[profileId+extensionId]`, and `[profileId+extensionId+key]`.
- Manifest source: local `inkforge-plugin.json` parsed through `extensionManifestSchema` before persistence.

### 3. Contracts
- Extension install must validate manifest id, version, entry path, compatible InkForge range string, declared permissions, sandbox level, command permissions, config defaults, and network origin policy before writing records.
- Granted permissions must be a subset of declared permissions. Do not grant wildcard or undeclared capabilities.
- `network:fetch` requires exact allowed origins. Wildcards and non-localhost `http` origins are rejected.
- Extension storage must be profile-scoped and extension-scoped; product code must never share storage keys across profiles or extension IDs.
- Product code must not execute third-party extension JavaScript until a real Worker sandbox, JSON postMessage bridge, timeout handling, and API gateway exist. Runtime activation without that path must fail closed and persist `blocked` state.
- Extension lifecycle actions must write audit records: install -> `system.plugin_install`, enable blocked/success -> `system.plugin_enable`, disable -> `system.plugin_disable`, uninstall -> `system.plugin_uninstall`.
- Command contribution must route through `CommandRegistry.registerExtension()` and require extension permission `ui:command`, command id prefix `ext.{extensionId}.`, and declared command permissions.

### 4. Validation & Error Matrix
- Invalid manifest id/path/version/origin -> reject install and write failure audit evidence.
- `network:fetch` without allowed origins -> reject manifest, no registry record.
- Runtime sandbox unavailable -> leave `enabled=false`, set status `blocked`, persist `runtimeBlockedReason`, and write failure audit evidence.
- Extension storage value is not JSON-serializable -> reject write.
- Command contribution without `ui:command` -> reject every command and write denied audit evidence.
- Command contribution requesting undeclared command permission -> reject only that command through `CommandRegistry`.

### 5. Good/Base/Bad Cases
- Good: a local manifest installs into `extensions`, Settings shows granted permissions, enable is blocked with `extension-runtime-unavailable`, and the audit ledger records the lifecycle decisions.
- Base: zero installed extensions shows an empty registry and explains that online marketplace/runtime execution are not mocked.
- Bad: seeding fake marketplace rows, accepting wildcard network origins, marking an extension enabled when no Worker runtime exists, or registering extension commands outside `CommandRegistry`.

### 6. Tests Required
- Unit: manifest validation accepts valid local manifest and rejects unsafe id, entry path, wildcard network origin, and `network:fetch` without origins.
- Unit: storage namespace isolation keeps `profileId + extensionId + key` records separate.
- Unit: install writes registry record and audit success.
- Unit: enable without runtime persists blocked state and audit failure.
- Unit: command contribution requires `ui:command` and declared command permissions.
- Browser smoke: `/settings?tab=extensions` renders active Extensions tab, installs a real local manifest, blocks runtime enable honestly, shows `extension-runtime-unavailable`, and has zero console errors.

### 7. Wrong vs Correct

#### Wrong
```typescript
record.enabled = true
return { success: true, reason: 'worker-started-mock' }
```

#### Correct
```typescript
const result = await extensionHost.enableExtension(profileId, extensionId, actorId)
if (result.record.status === 'blocked') {
  logger.warn(result.record.runtimeBlockedReason)
}
```


## Scenario: Profile Registry and Per-Profile Databases

### 1. Scope / Trigger
- Trigger: multi-account/Profile work changes Dexie schema, Profile registry, per-profile database namespace management, account/Profile mirroring, shared Profile area tables, or Settings Profile UI.
- Apply this contract when touching `services/profile/*`, `stores/profile.ts`, `stores/account.ts`, `utils/db.ts`, `views/SettingsView.vue`, or Profile lifecycle audit actions.

### 2. Signatures
- Global DB tables on `InkForgeDB` schema version 10+: `profiles`, `profileSharedTemplates`, `profileSharedExportPresets`, and `profileSharedAIConfigs`.
- Profile key: `id`; required indexes include `name`, `dbNamespace`, `status`, `fileRootStatus`, `createdAt`, `updatedAt`, `lastActiveAt`, `deletedAt`, and `sourceAccountId`.
- Per-profile DB namespace: `inkforge-{profileId}`. Each initialized Profile database must contain a real `metadata` table row with `profileId`, `profileName`, `dbNamespace`, `schemaVersion`, `createdAt`, and `updatedAt`.

### 3. Contracts
- Existing `accounts` remain the compatibility foundation. Do not delete `/account`, rebuild the account store, or migrate article data as part of the baseline registry work.
- New Profile ids are 21-character URL-safe values generated by runtime crypto. Legacy `local-default` and UUID account ids are accepted only for mirrored existing accounts.
- Creating a Profile must write the global registry row, initialize its independent Dexie database, and write `account.create` audit evidence.
- Switching a Profile must update `lastActiveAt`, initialize/open the target Profile database if needed, and write `account.switch` audit evidence.
- Soft delete must keep a 7-day recovery window and write `account.delete`; restore must clear `deletedAt` and write `account.restore`.
- Browser runtime must not invent file roots. `fileRoot` can remain `null` with `fileRootStatus = native-unavailable` until a real Tauri directory picker returns a path.
- Shared area tables are real storage contracts only. Do not seed fake shared templates, export presets, or AI configs for UI screenshots.

### 4. Validation & Error Matrix
- Duplicate active Profile name -> reject create/restore with a user-facing validation error.
- Duplicate, parent, or child file root -> reject with overlap evidence.
- Missing runtime crypto for new id -> throw; do not fall back to `Math.random` for Profile ids.
- Browser runtime file-root selection -> display unavailable boundary; do not persist a fake path.
- Last active Profile deletion -> reject to preserve at least one active workspace.
- Profile database initialization failure -> surface real error and do not claim registry lifecycle success.

### 5. Good/Base/Bad Cases
- Good: Settings creates a real Profile, `profiles` count increments, `inkforge-{profileId}` appears as a separate IndexedDB database, and lifecycle audit rows are written.
- Base: opening Settings on an existing local account mirrors `local-default` into `profiles` and initializes `inkforge-local-default` without migrating articles.
- Bad: moving article rows into a new DB without a migration plan, accepting typed fake file paths in web mode, or showing a successful multi-window state without a Tauri command.

### 6. Tests Required
- Unit: profile id generation, namespace derivation, schema validation, file-root overlap, soft-delete recovery filter.
- Unit/integration: default account mirroring, create/switch/delete/restore repository lifecycle, audit calls, and per-profile database manager namespace separation.
- Type-check: `SettingsView.vue`, `stores/profile.ts`, `stores/account.ts`, and `utils/db.ts` after schema/store changes.
- Browser smoke: `/settings?tab=profiles` renders active Profile tab, initializes `local-default`, creates a real Profile, shows independent DB namespace and native-boundary message, and has zero console errors.

### 7. Wrong vs Correct

#### Wrong
```typescript
const profile = { name: 'Demo', fileRoot: 'C:/fake/path', dbReady: true }
```

#### Correct
```typescript
const profile = await profileRepository.createProfile({
  name: '个人创作',
  fileRoot: null,
  fileRootStatus: 'native-unavailable',
})
await profileDatabaseManager.initializeProfileDatabase(profile)
```

## Scenario: Performance SLO Local Evidence

### 1. Scope / Trigger
- Trigger: performance SLO work changes local telemetry contracts, browser performance probes, Dexie schema, degradation evidence, audit linkage, or Settings performance views.
- Apply this contract when touching `services/performance/*`, `stores/performance.ts`, `utils/db.ts`, `services/audit/*`, `stores/settings.ts`, or `views/SettingsView.vue` performance sections.

### 2. Signatures
- DB tables on `InkForgeDB` schema version 11+: `performanceSamples` and `performanceDegradationEvents`.
- Sample key: `id`; required indexes include `profileId`, `metric`, `status`, `sampledAt`, `createdAt`, `[profileId+sampledAt]`, `[profileId+metric]`, and `[profileId+status]`.
- Event key: `id`; required indexes include `profileId`, `metric`, `level`, `status`, `createdAt`, `sampleId`, `[profileId+createdAt]`, `[profileId+metric]`, and `[profileId+status]`.

### 3. Contracts
- Performance telemetry must be runtime-measured. Do not seed fake samples, fake Lighthouse scores, fake browser support, fake worker state, or simulated degradation events.
- Browser APIs must be feature-detected per entry type. Unsupported PerformanceObserver entry types or memory APIs are valid `unsupported` or `limited` evidence, not success.
- Persist summarized metric values, thresholds, timestamps, route/context, support metadata, and audit references only. Never persist document content, markdown source, secrets, tokens, passwords, or authorization headers.
- Repository retention is bounded per profile so telemetry remains useful without unbounded IndexedDB growth.
- Audit writes for `system.performance_degradation` are evidence, not control flow. Audit failure must not block writing or primary Settings UI flows.

### 4. Validation & Error Matrix
- `PerformanceObserver` absent -> support matrix marks observer entry types unsupported and Settings explains the boundary.
- Memory API absent -> memory sample has `value = null`, `supportState = unsupported`, and no degradation event is fabricated.
- Measured warn/breach sample -> durable `performanceDegradationEvents` row is written and audit evidence is attempted.
- Dexie read/localStorage probe failure -> collector returns a real error or unsupported sample; UI must not show fake pass state.
- Feature flag disabled -> collector stops and Settings shows a clear enablement boundary.

### 5. Good/Base/Bad Cases
- Good: enabling `performance-metrics` in Settings records real browser samples, shows the support matrix, and writes degradation events only for measured warn/breach values.
- Base: a browser without longtask/event/layout-shift support shows unsupported capability rows and still records available snapshot probes.
- Bad: hardcoding Lighthouse > 80, seeding sample rows for UI screenshots, marking memory supported without API evidence, or storing article content inside performance metadata.

### 6. Tests Required
- Unit: threshold evaluation for higher-is-worse and lower-is-worse metrics.
- Unit: unsupported API evidence does not create degradation events.
- Unit/integration: repository persists warn/breach samples, writes degradation events, and attempts audit evidence.
- Type-check: `services/performance/*`, `stores/performance.ts`, `utils/db.ts`, and `SettingsView.vue` after schema/store/UI changes.
- Browser smoke: `/settings?tab=about`, enable `performance-metrics`, verify `performanceSamples` and `performanceDegradationEvents` stores exist, real samples are written, unsupported capabilities are visible when applicable, and console errors stay zero.

### 7. Wrong vs Correct

#### Wrong
```typescript
await db.performanceSamples.add({ metric: 'lighthouse', value: 92, source: 'mock' })
```

#### Correct
```typescript
const result = await performanceCollector.collectSnapshot({
  profileId,
  actorId: profileId,
  route: route.fullPath,
  source: 'settings.performance-slo',
})
```

## Scenario: Asset Pipeline Durable Blob Storage

### 1. Scope / Trigger
- Trigger: asset pipeline work changes Blob storage, asset metadata, content-hash identity, reference rows, orphan cleanup, or export snapshot reads.
- Apply this contract when touching `services/asset-pipeline/*`, `stores/asset.ts`, `utils/db.ts`, editor image upload bridges, or export asset snapshot code.

### 2. Signatures
- DB tables on `InkForgeDB` schema version 12+: `assets` and `assetRefs`.
- Asset key: `id`, derived from the first 16 hex characters of the real SHA-256 content hash.
- Asset indexes include `articleId`, `type`, `name`, `mimeType`, `category`, `profileId`, `contentHash`, `refCount`, `lifecycle`, `orphanedAt`, `createdAt`, `updatedAt`, `*tags`, `[profileId+contentHash]`, `[profileId+category]`, and `[profileId+lifecycle]`.
- Ref key: `id`; required indexes include `assetId`, `profileId`, `referrerKind`, `referrerId`, `createdAt`, `updatedAt`, `[assetId+referrerId]`, and `[profileId+assetId]`.

### 3. Contracts
- Blob payloads are stored in IndexedDB as Blob values and must not be indexed.
- Product code must use Web Crypto SHA-256 for content identity. Do not use `Math.random`, timestamp ids, or source URL strings as content hashes.
- Asset metadata must not include article markdown, document body, secrets, tokens, authorization headers, or clipboard text beyond the uploaded file name and MIME metadata.
- External URL ingest may create an asset only after a real successful `fetch()` returns a Blob. CORS, auth, or HTTP failures are real failures.
- `refCount` is denormalized but must be recomputed from `assetRefs`; it must never go below zero.
- `refCount = 0` marks an orphan candidate. Deletion must wait for the configured grace period unless a deliberate hard-delete path is invoked.
- Export inline base64 snapshots are generated at read time from the stored Blob and must not be persisted as long-lived metadata.

### 4. Validation & Error Matrix
- Missing `crypto.subtle` -> typed asset pipeline failure; no asset row is written.
- Unsupported MIME -> typed validation failure; no asset row or ref row is written.
- Same bytes ingested twice -> same asset id, one Blob row, additional refs only.
- Ref removal to zero -> asset lifecycle becomes `orphaned`, `orphanedAt` is set, and cleanup within 24h returns 0.
- Expired zero-ref orphan -> asset row and ref rows are removed.
- URL fetch failure -> no fake external cache row.

### 5. Good/Base/Bad Cases
- Good: a pasted Blob is hashed, deduped, stored in `assets`, linked from `assetRefs`, shown via an object URL, and export can inline it from the stored Blob.
- Base: an attachment stores as category `attachment` without thumbnail or image dimensions.
- Bad: seeding sample assets for UI, indexing Blob fields, storing document content in metadata, or presenting failed external fetch as cached.

### 6. Tests Required
- Unit: SHA-256 hash id generation and unsupported MIME rejection.
- Unit/integration: dedupe, attachment ingest, ref add/remove, orphan grace, expired purge, and inline snapshot generation.
- Type-check: `services/asset-pipeline/*`, `stores/asset.ts`, and `utils/db.ts` after schema/store changes.
- Browser smoke: import the pipeline in a real browser, ingest a real Blob, verify IndexedDB v12 `assetRefs`, dedupe, snapshot, orphan cleanup, and zero console errors.

### 7. Wrong vs Correct

#### Wrong
```typescript
const asset = { id: generateId(), name: 'demo.png', blob: new Blob(['fake']) }
await db.assets.add(asset)
```

#### Correct
```typescript
const result = await assetPipeline.ingestBlob(file, {
  profileId: 'local-default',
  referrer: { kind: 'article', id: articleId },
  source: 'editor.drop',
})
```

## Scenario: SearchEngine Repository-Backed Indexing

### 1. Scope / Trigger
- Trigger: search work reads IndexedDB-backed article data, builds a local full-text index, persists search history, or adds SmartFolder-style saved query behavior.
- Apply this contract when touching `services/search/*`, `stores/search.ts`, article repository search paths, or future search index persistence.

### 2. Signatures
- Source of truth: `articleRepository.findAllOrderedByDate()` and full `Article` records.
- Index adapter: `SearchEngine` under `src/services/search`.
- History persistence: `SearchHistoryRepository` with bounded storage key `inkforge.search.history.v1`.

### 3. Contracts
- Search results must be derived from real Article records. Do not seed display-only search rows.
- Serialized search indexes are optional; if persisted later, the implementation must prove freshness against Article updatedAt/sourceHash before reuse.
- Empty query returns no results unless an explicit filter-only query is present.
- Archived documents are excluded by default and only included through an explicit `includeArchived` request.
- Markdown authority fields are preferred for content indexing; rawContent is fallback only.

### 4. Validation & Error Matrix
- Repository read failure -> store `error` is set and the exception is rethrown.
- Malformed filters -> parser records warnings or ignores safely; search must not crash.
- Filter-only query -> evaluated against indexed real documents.
- Incremental update -> replacing an article must remove stale terms from subsequent results.
- Incremental remove -> discarded document must not appear in future result sets.

### 5. Tests Required
- Unit: DSL parse terms, phrases, negation, boolean marker, field filters.
- Unit: CJK text can be searched without a server-side tokenizer.
- Unit: incremental replace and remove alter subsequent result sets.
- Unit: history persistence deduplicates and caps recent queries.
- Browser smoke: Vite runtime imports SearchEngine and performs a real module-level search with console errors equal to 0.

## Scenario: Trash Recycle Soft Delete

### 1. Scope / Trigger
- Trigger: article deletion, restore, purge, cleanup, normal article listing, or search indexing work touches trash semantics.
- Apply this contract when touching `schemas/article.ts`, `utils/db.ts`, `services/repository.ts`, `services/trash/*`, `stores/article.ts`, `stores/trash.ts`, or `services/search/*`.

### 2. Signatures
- Status value: `ARTICLE_STATUS.TRASHED`.
- Soft-delete metadata: `deletedAt`, `expiresAt`, `deletedBy`, `preTrashStatus`.
- DB schema: IndexedDB/Dexie version 13+ with article indexes for `deletedAt`, `expiresAt`, `deletedBy`, `preTrashStatus`, `[status+deletedAt]`, and `[status+expiresAt]`.
- Repository: `trashRepository` under `src/services/trash`.

### 3. Contracts
- Default article deletion must be a soft delete. Do not call `articleRepository.delete()` from ordinary UI delete flows.
- Soft delete must preserve the article row and content row until purge.
- Restore must clear soft-delete metadata and set status to `draft`, not the pre-trash status.
- Permanent purge must be fail-closed for non-trashed articles and must delete related `contents` rows in the same logical operation.
- Normal article lists, category queries, recent queries, paginated queries, and default search must exclude `trashed` records.
- Trash rows must come from real persisted Article rows. Do not seed trash UI data or pretend purge/restore success.

### 4. Validation & Error Matrix
- Missing article -> typed not-found error and no writes.
- Non-trashed purge -> typed validation error and no article/content deletion.
- Trashed article -> normal ArticleRepository reads exclude it.
- Restore -> status becomes `draft`, metadata becomes null.
- Expired cleanup -> only rows whose `expiresAt <= now` are purged.

### 5. Tests Required
- Unit/integration: moveToTrash metadata and normal-list exclusion.
- Unit/integration: restore to draft and metadata clearing.
- Unit/integration: purge deletes article/content and rejects non-trash rows.
- Unit/integration: purgeExpired keeps future-retained rows.
- Browser smoke: real IndexedDB lifecycle from add -> trash -> restore -> trash -> purge with console errors equal to 0.

## Scenario: VersionBundle Embedded Snapshot Repository

### 1. Scope / Trigger
- Trigger: version history, auto snapshot, milestone, cleanup, restore proposal, crash recovery, or Markdown export code touches persisted editor content versions.
- Apply this contract when touching `schemas/article.ts`, `stores/editor.ts`, `composables/useVersionManager.ts`, `services/version-bundle/*`, or future version-history UI.

### 2. Signatures
- Source of truth: `EditedContent.versions` embedded rows inside the persisted `contents` store.
- Schema: `VersionSchema` accepts optional `deltaChars`, `wordCount`, `isMilestone`, `trigger`, `authorId`, and `updatedAt` metadata.
- Repository: `versionBundleRepository` under `src/services/version-bundle`.
- Core reads/writes: `createVersionIfChanged`, `forceCreateVersion`, `setMilestone`, `deleteVersion`, `cleanupVersions`, `buildRestoreProposal`, `exportVersionMarkdown`, `recordRecoveryCheckpoint`, and `loadForRecovery`.

### 3. Contracts
- Do not create display-only version rows. Every version shown by UI must come from persisted `EditedContent.versions` data.
- Do not replace the embedded version model with a normalized table inside this baseline. A future `article_versions` table must ship with a migration and transaction contract.
- Same-body snapshots must be skipped by `createVersionIfChanged`; crash-recovery checkpoints must use `forceCreateVersion` when an explicit recovery snapshot is required.
- Restore must be a proposal until the UI applies it. `buildRestoreProposal()` must not mutate `body`, `markdown`, `html`, or `currentVersionId`.
- Delete must be fail-closed for milestone versions, current versions, and the last remaining version.
- Cleanup must preserve all milestones and the current version before applying count or age limits.
- If future work performs multi-store version writes, wrap the operation in a Dexie `rw` transaction and rethrow errors so rollback remains intact.

### 4. Validation & Error Matrix
- Missing content -> typed not-found error and no writes.
- Same body with `createVersionIfChanged` -> returns null and keeps version count unchanged.
- Changed body -> appends a version with metadata and updates `currentVersionId`.
- Milestone delete -> rejects and keeps the persisted row.
- Current version delete -> rejects and keeps the persisted row.
- Cleanup over limit -> removes only eligible non-current, non-milestone, expired or excess rows.
- Restore proposal -> returns proposed content and diff while the stored current body remains unchanged.
- Repository or IndexedDB failure -> error propagates to the caller; do not convert it into success state.

### 5. Good/Base/Bad Cases
- Good: a crash recovery checkpoint forces a snapshot with `trigger='crash_recovery'` even when body text matches the current version.
- Base: an interval snapshot with unchanged body returns null and leaves the UI count stable.
- Bad: a component pushes a local fake version into a Pinia array without repository persistence.

### 6. Tests Required
- Unit/integration: same body skip, changed body append, delta/word metadata, force checkpoint, milestone retention, delete fail-closed, cleanup retention, restore proposal immutability, and Markdown export frontmatter.
- Type-check: editor store, version composable, version store, and schema consumers.
- Browser smoke: import the real Vite modules, write to IndexedDB `contents`, execute repository operations, assert no runtime errors, then clean the row and close the port.

### 7. Wrong vs Correct

#### Wrong
```typescript
versionBundleStore.versions.unshift({
  id: 'preview-only',
  label: 'Recovered',
  content: editor.body,
  createdAt: new Date(),
})
```

#### Correct
```typescript
await versionBundleRepository.recordRecoveryCheckpoint(articleId, {
  content: editedContent,
  profileId,
  savedAt: new Date(),
})
await versionBundleStore.loadVersions(articleId)
```

## Scenario: CommentReview IndexedDB Persistence

### 1. Scope / Trigger
- Trigger: comments, replies, anchor drift, review decisions, margin notes, or track changes need persisted local-first state.
- Apply this contract when touching `services/comment-review/*`, `stores/commentReview.ts`, `utils/db.ts`, future comment UI, or review export paths.

### 2. Signatures
- DB version: Dexie v14 or newer.
- Stores: `comments`, `marginNotes`, and `trackChanges`.
- Repository: `commentReviewRepository` under `src/services/comment-review`.
- Audit actions: `comment.create`, `comment.resolve`, `comment.delete`, `review.approve`, and `review.request_changes`.

### 3. Contracts
- Comment review rows must come from IndexedDB. Do not seed fake comments, fake replies, fake approvals, or fake track changes in UI.
- All write payloads must pass zod schemas before persistence.
- Anchors must keep explicit `exact`, `drifted`, or `invalid` state. Do not render invalid anchors as if they still point to the old text.
- Soft delete comments through `status='deleted'`; normal lists exclude deleted comments unless explicitly requested.
- Review events should write audit evidence using the existing audit repository. Audit fallback must not turn a failed comment write into success.
- Multi-store cleanup and browser smoke data removal must use a Dexie `rw` transaction.

### 4. Validation & Error Matrix
- Missing comment -> `DB_NOT_FOUND` and no write.
- Deleted comment reply/resolve -> validation error and no state mutation.
- Request-changes comment -> persisted pending row plus `review.request_changes` audit attempt.
- Resolve -> status becomes `resolved`, `resolvedAt` and `resolvedBy` are set.
- Delete -> status becomes `deleted`, normal list excludes it, summary still accounts for it.
- Anchor cannot be reattached -> anchor status becomes `invalid`, not `exact`.

### 5. Good/Base/Bad Cases
- Good: create a real comment row, add a reply, resolve it, and verify audit rows by `docId` in IndexedDB.
- Base: refresh anchors after an insertion before the selected text and mark the anchor `drifted`.
- Bad: display a local array of placeholder comments without persisted `comments` rows.

### 6. Tests Required
- Unit/integration: anchor exact, drifted, invalid; create/reply/resolve/delete; mention extraction; margin note persistence; track-change status transitions; store state refresh.
- Type-check: DB table typings, repository contracts, and Pinia store actions.
- Browser smoke: real Vite runtime imports, IndexedDB v14 table writes, audit rows, cleanup, and zero console errors.

### 7. Wrong vs Correct

#### Wrong
```typescript
commentStore.comments = [{ id: 'demo', content: 'Looks good', status: 'pending' }]
```

#### Correct
```typescript
await commentReviewRepository.createComment({
  docId,
  anchor,
  content,
  authorId: profileId,
  reviewDecision: 'comment',
})
await commentReviewStore.loadReview(docId)
```

## Scenario: ActivityLogger IndexedDB Diagnostics

### 1. Scope / Trigger
- Trigger: diagnostic logging work changes local activity logs, export logs, retention cleanup, fallback replay, or diagnostic JSONL export.
- Apply this contract when touching `utils/db.ts`, `services/activity-logger/*`, `stores/diagnostics.ts`, future Settings diagnostic panels, DevPanel event streams, or crash/diagnostic package exporters.

### 2. Signatures
- DB version: `InkForgeDB` v15+.
- Tables: `activityLogs` and `exportLogs`; do not merge these records into `auditLogs`.
- `activityLogs` key: `id`; required indexes include `timestamp`, `level`, `module`, `event`, `scope`, `profileId`, `windowId`, `sessionId`, `correlationId`, `createdAt`, `[level+timestamp]`, `[module+timestamp]`, and `[profileId+timestamp]`.
- `exportLogs` key: `id`; required indexes include `timestamp`, `profileId`, `format`, `target`, `outcome`, `activityLogId`, `diagnosticPackageId`, `createdAt`, `[profileId+timestamp]`, and `[outcome+timestamp]`.

### 3. Contracts
- Trace-level records are memory-only and must not be written to IndexedDB.
- Info, warn, and error records may be batched, but every persisted record must pass schema validation first.
- Critical records must attempt immediate IndexedDB persistence and create localStorage fallback evidence before a subsequent crash can lose the event.
- Redaction must run before buffering, persistence, fallback, export-log metadata storage, or JSONL export.
- Activity logs are diagnostic evidence; compliance/audit records remain in `auditLogs` with their own retention and hash-chain contracts.
- Product code must not seed fake logs, fake export history, or simulated diagnostic success rows.

### 4. Validation & Error Matrix
- IndexedDB write succeeds -> records appear in `activityLogs` and can be queried by profile/time.
- IndexedDB bulk write fails -> fallback rows are written to localStorage and can be replayed later.
- Critical write succeeds -> fallback evidence still exists until replay removes it after IndexedDB put.
- Retention cleanup -> L1-L3 older than 7 days and L4 older than 30 days are removed, bounded by the cleanup limit.
- Export log write -> `exportLogs` stores redacted metadata and success/failure outcome.

### 5. Good/Base/Bad Cases
- Good: `activityLogger.warn('sync.retry', { authorization })` stores `[REDACTED]` authorization and a real persisted row after flush.
- Base: empty diagnostics UI calls the store and renders zero counts from persisted state.
- Bad: a settings panel pushes a placeholder activity row to make the list look populated.

### 6. Tests Required
- Unit-test redaction, classification, trace memory-only behavior, batch flush, critical fallback/replay, retention, export logs, JSONL export, and store state.
- Type-check Dexie table typings after schema changes.
- Browser-smoke real IndexedDB upgrade/write/query/cleanup/fallback/exportLog behavior.

### 7. Wrong vs Correct

#### Wrong
```typescript
await db.activityLogs.add({ event: 'demo', data: { token }, level: 'info' })
```

#### Correct
```typescript
activityLogger.info('sync.retry', { authorization })
await activityLogger.flush()
```

## Scenario: LayoutPersistence IndexedDB UI State

### 1. Scope / Trigger
- Trigger: UI workspace layout, panel, tab, mode, zoom, or window-session code needs durable local restoration across reloads.
- Apply this contract when touching `utils/db.ts`, `services/layout-persistence/*`, Workstation layout persistence wiring, or any sync exclusion list that might accidentally include UI-only state.

### 2. Signatures
- Dexie version: v16.
- Store: `layoutStates`.
- Primary key: `id = ${profileId}:${windowId}`.
- Indexed fields: `profileId`, `windowId`, `layoutVersion`, `savedAt`, `updatedAt`, `[profileId+windowId]`, and `[profileId+savedAt]`.
- Service entrypoint: `LayoutPersistenceService` with `initialize`, `load`, `save`, `scheduleSave`, `flushScheduledSave`, `clear`, `cleanupStaleLayouts`, and `validateSerializedTabs`.

### 3. Contracts
- Schema changes must be additive. Do not delete existing stores while adding `layoutStates`.
- Persisted records must pass `LayoutStateRecordSchema`; unknown or legacy rows must be migrated through `migrateLayoutState` before use.
- Layout state is profile/window scoped and local-only. It must not be uploaded or merged by sync providers.
- High-frequency layout updates must be debounced and merged before IndexedDB writes.
- Existing localStorage fallbacks may remain, but IndexedDB is the durable source for the baseline service.
- Invalid serialized tabs must be filtered instead of resurrecting deleted article tabs.

### 4. Validation & Error Matrix
- Missing row -> `load()` returns `null` and UI falls back to defaults/localStorage.
- Valid row -> `load()` returns the parsed record.
- Legacy/invalid row -> `initialize()` migrates and persists a v1 record.
- Width out of range -> panel width is clamped to declared limits.
- Stale non-current window row older than retention -> `cleanupStaleLayouts()` deletes it.
- Current window row older than retention -> cleanup preserves it.
- IndexedDB failure -> store action sets error and rethrows; UI must not claim persistence success.

### 5. Good/Base/Bad Cases
- Good: `await layoutPersistenceStore.save({ managerCollapsed, panelWidths })` writes a real `layoutStates` row for the active profile/window.
- Base: no row exists, so Workstation restores its current localStorage/default layout and then initializes persistence.
- Bad: a sync provider serializes `layoutStates` into remote profile data or seeds fake layout rows for demos.

### 6. Tests Required
- Unit-test save/load/clear, profile/window isolation, migration persistence, debounce merge, stale cleanup, tab validation, sync exclusion, and store state.
- Type-check Dexie table typings after every schema version bump.
- Browser-smoke real IndexedDB open/write/read/migrate/cleanup behavior after v16 changes.

### 7. Wrong vs Correct

#### Wrong
```typescript
await syncProvider.push({ table: 'layoutStates', rows: await db.layoutStates.toArray() })
```

#### Correct
```typescript
layoutPersistenceService.scheduleSave(layoutPatch, profileId, windowId)
await layoutPersistenceService.flushScheduledSave()
```

## Scenario: SplitView Fields in LayoutPersistence State

### 1. Scope / Trigger
- Trigger: Workstation split preview, split ratio, sync-scroll preference, or split pane font-scale state needs durable local restoration.
- Apply this contract when touching `services/layout-persistence/*`, `stores/layoutPersistence.ts`, `views/WorkstationView.vue`, shortcut migration, or future native multi-window restore.

### 2. Signatures
- Dexie version remains v16; do not add a new table for SplitView baseline state.
- Store remains `layoutStates` with primary key `id = ${profileId}:${windowId}`.
- Split fields are part of `LayoutStateRecord`: `splitViewEnabled`, `splitViewRatio`, `splitViewSyncScroll`, `splitViewLeftFontScale`, and `splitViewRightFontScale`.
- Ratio limits are `0.2..0.8` with default `0.5`; font-scale limits are `12..24` with default `16`.

### 3. Contracts
- SplitView persistence is profile/window scoped and local-only; it must remain excluded from sync providers.
- Persist ratios, not absolute pane pixels, so restores survive viewport and monitor changes.
- Legacy layout rows must be migrated by `migrateLayoutState()` and receive safe split defaults.
- Partial layout patches must not clear split state or tab/status fields accidentally.
- Product code must not seed demo SplitView rows or fake preview documents.

### 4. Validation & Error Matrix
- Missing split fields -> migrated defaults are persisted through `initialize()`.
- Out-of-range ratio -> clamped to `0.2..0.8`.
- Out-of-range font scale -> clamped to `12..24`.
- Debounced save -> split patches merge with panel/mode patches before writing IndexedDB.
- IndexedDB failure -> store error handling remains the existing layout persistence contract.

### 5. Good/Base/Bad Cases
- Good: `layoutPersistenceStore.scheduleSave({ splitViewEnabled, splitViewRatio }, profileId)` writes a real `layoutStates` row.
- Base: no row exists, so Workstation starts single-pane and stores a row only after real layout interaction.
- Bad: a demo task inserts fake `layoutStates` rows to make the split preview appear populated.

### 6. Tests Required
- Unit-test split field save/load, migration defaults, clamp behavior, debounced merge, and store state propagation.
- Type-check `LayoutStateRecord` and Workstation consumers after field changes.
- Browser-smoke real IndexedDB SplitView restore/toggle behavior after v16 changes.

### 7. Wrong vs Correct

#### Wrong
```typescript
await db.layoutStates.put({ id: 'demo', splitViewEnabled: true } as LayoutStateRecord)
```

#### Correct
```typescript
layoutPersistenceStore.scheduleSave({ splitViewEnabled, splitViewRatio }, activeProfileId)
await layoutPersistenceStore.flushScheduledSave()
```

## Scenario: WikiLink Backlinks Derived Local Index

### 1. Scope / Trigger
- Trigger: WikiLink parsing, backlink rebuild, article title changes, article deletion, Markdown preview compatibility, or Dexie schema changes touch `utils/db.ts`, `services/wiki-link/*`, `stores/wikiLink.ts`, or `stores/article.ts`.

### 2. Signatures
- Dexie version: v17.
- Store: `backlinks`.
- Primary key: `id = ${sourceArticleId}:${stableOccurrenceHash}`.
- Required indexed fields: `sourceArticleId`, `targetArticleId`, `targetTitle`, `resolved`, `updatedAt`, `[targetArticleId+updatedAt]`, `[sourceArticleId+updatedAt]`, and `[targetTitle+updatedAt]`.
- Record schema: `BacklinkRecord` with `indexVersion`, source article id/title, nullable target article id, target title, nullable anchor/alias, raw token, context, resolved flag, and millisecond timestamps.

### 3. Contracts
- `backlinks` is a derived local index. Markdown article content remains the source of truth and must not be rewritten to make the index easier.
- Schema changes must be additive. Do not delete existing tables or mutate authoritative article body rows during backlink migration.
- Rebuild APIs may clear and regenerate backlink rows because records are derived, but they must read articles through the article repository/service boundary.
- Create/update article writes should refresh backlinks after the local repository write succeeds; WikiLink indexing failure is logged and must not corrupt the saved article.
- New article titles and title renames may resolve previously broken incoming links, so baseline create/title-change paths rebuild all derived backlinks.
- Trash/delete cleanup removes backlink rows where the deleted article is source or resolved target.
- Product code must not seed demo backlinks, fake broken links, or simulated resolved targets.

### 4. Validation & Error Matrix
- Existing target title -> resolved backlink row has `targetArticleId` and `resolved=true`.
- Missing target title -> unresolved row has `targetArticleId=null`, `resolved=false`, target title, raw token, and context.
- Fenced code, inline code, and `![[embed]]` -> no backlink row.
- New title resolves prior broken link -> `rebuildAllBacklinks()` updates the row to resolved.
- Trashed target -> no resolved target; cleanup removes rows for source or target article id.
- IndexedDB failure -> store/service surfaces the error; ArticleStore logs and preserves the primary article write.

### 5. Good/Base/Bad Cases
- Good: `await wikiLinkService.rebuildArticleBacklinks(article.id)` derives rows from the saved article body and writes them to `backlinks`.
- Base: an article with no WikiLinks replaces its source rows with an empty set.
- Bad: storing generated backlink HTML inside `articles.rawContent` or inserting placeholder backlink rows for empty UI panels.

### 6. Tests Required
- Unit-test parser boundaries, repository replace/find/delete, service rebuild/search, broken-link resolution, and store state.
- Type-check `utils/db.ts`, `services/wiki-link/*`, `stores/wikiLink.ts`, `stores/article.ts`, and Markdown renderer after schema changes.
- Browser-smoke real Dexie v17 open, `backlinks` table/index presence, and put/get/delete round-trip.

### 7. Wrong vs Correct

#### Wrong
```typescript
await db.backlinks.put({ id: 'demo', sourceArticleId: 'a', targetTitle: 'Example' } as BacklinkRecord)
```

#### Correct
```typescript
await wikiLinkService.rebuildArticleBacklinks(article.id)
```

## Scenario: Snippet Records Local-First Store

### 1. Scope / Trigger
- Trigger: snippet creation, snippet expansion, snippet import/export, usage accounting, or Dexie schema changes touch `utils/db.ts`, `services/snippet/*`, `stores/snippet.ts`, or editor snippet integration.

### 2. Signatures
- Dexie version: v18.
- Store: `snippets`.
- Primary key: `id`.
- Required indexed fields: `type`, `trigger`, `triggerCaseSensitive`, `scopeType`, `usageCount`, `updatedAt`, `lastUsedAt`, `*tags`, `[type+trigger]`, and `[scopeType+updatedAt]`.
- Record schema: `SnippetRecord` with `schemaVersion`, name/description, type, trigger, case sensitivity, content, scope, scopeType mirror, nullable icon, tags, usage count, timestamps, and nullable last-used timestamp.

### 3. Contracts
- Snippets are user-authored local-first records. Product startup must not seed demo snippets or fake examples.
- Schema changes must be additive. New migrations must preserve `backlinks`, `layoutStates`, and all earlier stores.
- Runtime boundaries must validate snippet rows with Zod before persistence or import acceptance.
- Text snippets require a non-empty trigger and content. Block snippets may be stored without baseline text-trigger expansion.
- Usage accounting updates `usageCount` and `lastUsedAt` only after a real expansion or explicit service call.
- Import/export must preserve real records and normalize external VS Code snippets into the InkForge schema without silently accepting invalid rows.

### 4. Validation & Error Matrix
- Empty storage -> `listSnippets()` returns an empty array; no demo rows are inserted.
- Valid create -> row is persisted in `snippets` and searchable by name, description, trigger, content, or tags.
- Invalid text trigger/content -> schema rejects the write.
- Document scope without `articleId` -> schema rejects the row.
- Tag scope without tags -> schema rejects the row.
- Usage recording for a missing id -> service/repository throws a real not-found error.
- Browser migration -> `db.verno === 18`, `snippets` exists, and `backlinks` still exists.

### 5. Good/Base/Bad Cases
- Good: `await snippetService.createSnippet({ name, trigger, content, scope })` validates and writes a real row.
- Base: a fresh vault has zero snippets and the editor keeps normal Tab behavior.
- Bad: app startup calls `db.snippets.bulkPut([...demoSnippets])` so the feature looks populated without user data.

### 6. Tests Required
- Unit-test schemas, repository create/update/delete/search/usage/replace, service scope filtering, import/export, and VS Code normalization.
- Type-check `utils/db.ts`, `services/snippet/*`, `stores/snippet.ts`, and editor integration after schema changes.
- Browser-smoke real Dexie v18 open, `snippets` table/index presence, put/get/delete round-trip, and backlink preservation.

### 7. Wrong vs Correct

#### Wrong
```typescript
await db.snippets.put({ id: 'demo', trigger: 'sig', content: 'Demo' } as SnippetRecord)
```

#### Correct
```typescript
await snippetService.createSnippet({
  name: 'Signature',
  trigger: 'sig',
  content: 'Regards, $AUTHOR$0',
  scope: { type: 'global', tags: [] },
})
```
