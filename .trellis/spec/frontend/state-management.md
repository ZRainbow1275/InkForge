# State Management

> How state is managed in this project.

---

## Overview

<!--
Document your project's state management conventions here.

Questions to answer:
- What state management solution do you use?
- How is local vs global state decided?
- How do you handle server state?
- What are the patterns for derived state?
-->

(To be filled by the team)

---

## State Categories

<!-- Local state, global state, server state, URL state -->

(To be filled by the team)

---

## When to Use Global State

<!-- Criteria for promoting state to global -->

(To be filled by the team)

---

## Server State

<!-- How server data is cached and synchronized -->

(To be filled by the team)

---

## Common Mistakes

<!-- State management mistakes your team has made -->

(To be filled by the team)

---

## Scenario: Sync Store UI State

### 1. Scope / Trigger
- Trigger: settings and workspace UI read sync status from `useSyncStore` and must reflect real provider readiness.
- Apply this contract when adding sync indicators, manual sync controls, conflict counters, or pending queue views.

### 2. Signatures
- Store: `useSyncStore()`.
- Read fields: `status`, `statusText`, `providerId`, `pendingCount`, `conflictCount`, `lastSyncAt`, `lastError`, `isSyncing`.
- Action: `sync(): Promise<SyncResult>` where `success: false` is a valid recoverable result.

### 3. Contracts
- UI must display no-provider as `同步未配置` / `paused`, never as remote synced.
- Manual sync must call `syncStore.sync()` and render the returned result; it must not short-circuit with a UI-only success message.
- UI must explain unavailable native or remote boundaries instead of mocking WebDAV, Git, or SelfHosted connectivity.
- Duplicate error surfaces should be collapsed so one real error is visible without noisy repetition.

### 4. Validation & Error Matrix
- `providerId === null` -> show `未配置` and explanatory placeholder.
- `sync().success === false` -> show error message from `SyncResult.error`.
- `lastError` equals current action message -> do not duplicate the same text.
- `isSyncing` or local action busy -> disable the manual sync button.

### 5. Good/Base/Bad Cases
- Good: Settings Sync tab shows real pending count from the store and reports no-provider failure after click.
- Base: zero pending and no provider still reports `同步未配置`.
- Bad: showing `已同步` when no provider exists, or disabling errors because there are no pending changes.

### 6. Tests Required
- Type-check Settings templates after adding sync store usage.
- Unit-test no-provider `SyncEngine.sync()` behavior.
- Browser smoke-test `/settings?tab=sync`, click manual sync, and assert a single no-provider error is visible.

### 7. Wrong vs Correct

#### Wrong
```vue
<div>{{ syncStore.pendingCount === 0 ? '已同步' : syncStore.statusText }}</div>
```

#### Correct
```vue
<span>{{ syncStore.statusText }}</span>
<button :disabled="syncActionBusy || syncStore.isSyncing" @click="handleManualSync">
  {{ syncActionBusy || syncStore.isSyncing ? '同步中...' : '立即同步' }}
</button>
```

## Scenario: Audit Store UI State

### 1. Scope / Trigger
- Trigger: Settings, account, permission, sync, command, or document lifecycle work reads or writes local audit state.
- Apply this contract when touching `stores/audit.ts`, `views/SettingsView.vue`, `services/audit/*`, or any UI that displays audit counts, filters, export status, or integrity status.

### 2. Signatures
- Store: `useAuditStore()`.
- Read fields: `entries`, `totalCount`, `isLoading`, `error`, `queryParams`, `lastExport`, `integrityStatus`, `integrityMessage`, `hasEntries`, `page`, and `pageCount`.
- Actions: `fetchEntries`, `setProfile`, `setKeyword`, `setSeverities`, `setOutcomes`, `setActions`, `nextPage`, `previousPage`, `exportCSV`, `exportJSON`, `verifyIntegrity`, and `appendEntry`.

### 3. Contracts
- Audit UI must read from real `auditLogs` records through `AuditRepository`; do not seed display-only rows.
- Default audit queries should use a recent lower bound and an open upper bound unless the user explicitly chooses a fixed end time. A fixed `to = Date.now()` captured at store creation will hide records written after page initialization.
- Event-bus appended entries must match the active `profileId`; non-matching profiles are ignored. AuditRepository append failure returns `null`, so no event-bus append should be emitted for fallback-only evidence.
- Exports must use the current filter state and report the real `totalCount` returned by the repository.
- UI actions that audit high-risk operations must write success only after the real operation succeeds; catch blocks should write failure audit records with the real error message.
- Integrity UI must distinguish `unknown`, `valid`, and `broken`; do not show `valid` before `verifyIntegrity()` runs.
- Hidden Settings tabs may still exist in the DOM due `v-show`; browser smoke assertions should target active `data-settings-tab="audit"` or computed display state when needed.

### 4. Validation & Error Matrix
- Empty ledger -> count 0, empty state visible, integrity check valid for 0 entries.
- New audit written after page load -> `刷新审计` shows the new count.
- IndexedDB append failure -> fallback evidence may exist, but the active audit list must not append or display it as a durable ledger record.
- Broken hash chain -> `integrityStatus` becomes `broken` and shows the first broken id/reason.
- Export CSV/JSON -> browser download or Blob path contains sanitized payload only.
- Repository error -> `error` stores the real message and the UI surfaces it.

### 5. Good/Base/Bad Cases
- Good: UI high-risk action writes `account.settings_change`, audit store refresh shows count 1, and integrity message says 1 entry verified.
- Base: audit tab opens with zero records and no console error.
- Bad: fixed query upper bound makes refresh miss records written after page initialization.

### 6. Tests Required
- Unit-test sanitizer and hash helpers before relying on UI smoke.
- Type-check `SettingsView.vue` after adding audit refs/selects/details markup.
- Browser smoke-test `/settings?tab=audit`: write a real audit record via UI, refresh, verify count, run integrity check, check console errors.
- Unit-test audit store/service behavior for post-initialization refresh and fallback-only non-append paths when repository `log()` returns `null`.

### 7. Wrong vs Correct

#### Wrong
```typescript
const now = Date.now()
queryParams.value = { profileId, from: now - ninetyDays, to: now }
```

#### Correct
```typescript
queryParams.value = { profileId, from: Date.now() - ninetyDays, limit: 50, offset: 0 }
```

## Scenario: Extension Store UI State

### 1. Scope / Trigger
- Trigger: Settings or command-palette UI reads extension registry state, installs local manifests, toggles extension lifecycle, displays permissions/errors, or touches extension storage.
- Apply this contract when touching `stores/extensions.ts`, `services/extensions/*`, `views/SettingsView.vue`, or extension command contribution code.

### 2. Signatures
- Store: `useExtensionStore()`.
- Read fields: `records`, `installedCount`, `enabledCount`, `blockedCount`, `errorCount`, `isLoading`, `error`, `lastActionMessage`, and `hasExtensions`.
- Actions: `load`, `installLocalManifest`, `enableExtension`, `disableExtension`, `uninstallExtension`, `getStorage`, `setStorage`, and `clearStorage`.

### 3. Contracts
- UI must display only real `extensions` records loaded from Dexie. Do not seed marketplace cards, fake installed extensions, or sample manifest rows.
- Local manifest import must parse actual user-provided file/text JSON and pass through `ExtensionHost.installLocalManifest`; UI must not bypass schema validation.
- Enable must call `ExtensionHost.enableExtension`. If runtime is unavailable, show blocked/failure feedback and keep `enabled=false`; do not present fake successful activation.
- UI must explain that online marketplace, package copy, signature verification, and Worker runtime execution are not implemented when they are not implemented.
- Permission chips must reflect `grantedPermissions` and `commandPermissions` from persisted records.
- Uninstall must call the host/repository path so extension storage cleanup and audit logging occur together.

### 4. Validation & Error Matrix
- Empty registry -> installed/enabled/blocked/error counts are 0 and empty state is visible.
- Valid manifest install -> installed count increases and the extension card shows id, version, sandbox, granted permissions, and command permissions.
- Runtime unavailable enable -> action feedback reports blocked runtime, record status becomes `blocked`, and `extension-runtime-unavailable` is visible.
- Invalid manifest -> show validation error from host/schema and do not add a card.
- Uninstall -> extension card disappears and storage cleanup is routed through repository.

### 5. Good/Base/Bad Cases
- Good: Settings Extensions tab imports a real local manifest, shows `Word Counter`, blocks enable with honest runtime evidence, and console errors remain zero.
- Base: no extension installed shows a no-marketplace/no-runtime placeholder.
- Bad: rendering fake featured marketplace extensions or marking `enabled` true without Worker activation.

### 6. Tests Required
- Unit-test extension manifest, repository, host lifecycle, and command registration before browser smoke.
- Type-check Settings templates after adding extension store usage.
- Browser smoke-test `/settings?tab=extensions`: import a valid local manifest, assert installed count 1, click enable, assert blocked state and no console errors.

### 7. Wrong vs Correct

#### Wrong
```vue
<button @click="record.enabled = true">启用</button>
```

#### Correct
```vue
<button @click="handleToggleExtension(record)">
  {{ record.enabled ? '停用' : '启用' }}
</button>
```


## Scenario: Profile Store UI State

### 1. Scope / Trigger
- Trigger: Settings, account, Hub, command palette, or future desktop window UI reads or mutates Profile registry state.
- Apply this contract when touching `stores/profile.ts`, `services/profile/*`, `stores/account.ts`, `views/SettingsView.vue`, or Profile switch/create/delete/restore UI.

### 2. Signatures
- Store: `useProfileStore()`.
- Read fields: `profiles`, `activeProfileId`, `previousProfileId`, `sortedProfiles`, `deletedProfiles`, `activeProfile`, `profileCount`, `deletedProfileCount`, `isLoading`, `isSwitching`, `error`, `lastActionMessage`, and `canDeleteActiveProfile`.
- Actions: `loadProfiles`, `createProfile`, `switchProfile`, `softDeleteProfile`, `restoreProfile`, `daysUntilPermanentDelete`, and `getById`.

### 3. Contracts
- UI must display only real Profile records loaded from Dexie through `ProfileRepository`. Do not seed sample workspaces or fake registry rows.
- `loadProfiles` must mirror the current account into the Profile registry before choosing the active Profile.
- Create/switch/delete/restore buttons must call the Profile store/repository path so validation, per-profile DB initialization, and audit logging are not bypassed.
- File-root UI in web runtime must show a clear unavailable native boundary and must not offer manual path persistence as a fake replacement for Tauri directory selection.
- Profile switch changes active Profile state and Profile-scoped audit/extension views, but must not pretend to close or migrate currently open documents.

### 4. Validation & Error Matrix
- Empty registry with existing account -> `loadProfiles` creates/mirrors `local-default` and shows count 1.
- Create valid Profile -> active count increments, active Profile changes, and `lastActionMessage` reports the real result.
- Duplicate name -> show store error; no card is added.
- Runtime file-root unavailable -> `fileRootStatus` remains `native-unavailable` and UI explains the boundary.
- Last active Profile delete -> button/repository prevents deletion and surfaces an error.
- Deleted Profile within 7 days -> appears under recovery list with restore action.

### 5. Good/Base/Bad Cases
- Good: `/settings?tab=profiles` shows current active Profile, DB namespace, create form, list rows, and recovery rows from the store.
- Base: default local account shows one active Profile and no deleted Profiles.
- Bad: displaying mock workspaces, setting `activeProfileId` directly in the component, or writing to `db.profiles` from Vue template handlers.

### 6. Tests Required
- Unit-test Profile store/repository lifecycle before browser smoke.
- Type-check Settings template after adding Profile store usage.
- Browser smoke-test `/settings?tab=profiles`: create a real Profile, assert count 2, assert independent IndexedDB namespace, assert native-boundary text, and assert console errors stay at zero.

### 7. Wrong vs Correct

#### Wrong
```vue
<button @click="profileStore.activeProfileId = profile.id">切换</button>
```

#### Correct
```vue
<button @click="handleSwitchProfile(profile)">
  {{ profile.id === profileStore.activeProfileId ? '当前工作区' : '切换到此工作区' }}
</button>
```

## Scenario: Performance SLO Store UI State

### 1. Scope / Trigger
- Trigger: Settings or diagnostics UI reads runtime Performance SLO state, feature-flagged collectors, support limitations, recent samples, or degradation events.
- Apply this contract when touching `stores/performance.ts`, `services/performance/*`, `stores/settings.ts`, or Settings About/Advanced performance sections.

### 2. Signatures
- Store: `usePerformanceStore()`.
- Read fields: `samples`, `events`, `supportMatrix`, `reducedMotion`, `isCollecting`, `isLoading`, `error`, `lastActionMessage`, `summary`, `recentSamples`, `recentEvents`, and `unsupportedCapabilities`.
- Actions: `loadRecent`, `refreshSnapshot`, `start`, `stop`, and `getLatestSample`.

### 3. Contracts
- UI must display only real samples and degradation events loaded from Dexie through `PerformanceRepository` or collected through `PerformanceCollector`.
- The existing `performance-metrics` feature flag controls collection. Disabled state must stop observers and explain that no live samples are collected.
- Unsupported browser capabilities must remain visible in Settings; do not collapse them into a green/pass state.
- Collection errors must be shown through store error/action-message state. Do not swallow collector failures or replace them with generic success text.
- Settings UI must describe pending lab gates honestly when Lighthouse, 900k-word input, export stress, or packaged Tauri benchmarks have not been run.

### 4. Validation & Error Matrix
- Feature flag disabled -> `isCollecting = false`, observer stopped, UI shows enablement boundary.
- Supported snapshot probes -> `recentSamples` updates from persisted rows.
- Unsupported memory/observer entry type -> `unsupportedCapabilities` includes an explanatory row.
- Warn/breach sample -> `recentEvents` increases after repository persistence.
- Collector failure -> `error` stores the real message and no fake sample row is inserted.

### 5. Good/Base/Bad Cases
- Good: Settings About enables collection, shows real sample counts, reduced-motion state, support limitations, and degradation events.
- Base: no stored samples yet shows zero counts and capability rows without seeding demo data.
- Bad: setting `samples` directly in the component, presenting unsupported APIs as pass, or displaying lab-gate claims without a real tool run.

### 6. Tests Required
- Unit-test threshold/status logic and repository event creation.
- Type-check `SettingsView.vue` after adding store refs and template usage.
- Browser smoke-test `/settings?tab=about`: enable `performance-metrics`, assert `about.performanceSlo` renders, verify IndexedDB sample/event stores, and confirm zero console errors.

### 7. Wrong vs Correct

#### Wrong
```vue
<span>{{ 92 }} Lighthouse</span>
```

#### Correct
```vue
<span>{{ getPerformanceStatusLabel(performanceSloSummary.status) }}</span>
<p>Lighthouse and large benchmark gates remain pending until a real tool run records evidence.</p>
```

## Scenario: Asset Store Pipeline UI State

### 1. Scope / Trigger
- Trigger: editor, file manager, settings, export, or asset UI reads or mutates local asset state.
- Apply this contract when touching `stores/asset.ts`, `services/asset-pipeline/*`, editor image upload handlers, object URL rendering, or future asset manager UI.

### 2. Signatures
- Store: `useAssetStore()`.
- Read fields: `assets`, `loading`, `error`, `totalSize`, `imageAssets`, and `cachedUrlCount`.
- Actions: `loadAssets`, `uploadAsset`, `uploadAssets`, `deleteAsset`, `getAssetUrl`, `getThumbnailUrl`, `searchAssets`, `updateTags`, and `cleanup`.

### 3. Contracts
- UI must display only real `assets` rows loaded from Dexie or returned by `assetPipeline`; do not seed gallery/demo assets.
- Upload actions must call the pipeline so content hashing, MIME validation, dedupe, reference creation, and orphan metadata stay consistent.
- Object URLs must be created from real Blob values and revoked by store cleanup or delete paths. Do not persist `blob:` URLs.
- Attachment assets are valid store entries. UI code must not assume every asset has dimensions, thumbnails, or image MIME.
- Store errors must surface real pipeline or IndexedDB errors; do not convert failed ingest into a success toast.
- Existing editor integration depends on `uploadAsset(file, articleId?)` returning a compatible `AssetRecord`; preserve that API.

### 4. Validation & Error Matrix
- Valid image/file upload -> returned `AssetRecord` merges into store state and can be rendered through `getAssetUrl`.
- Same bytes uploaded twice -> one asset id, no duplicate Blob row, refs increase through the pipeline.
- Unsupported MIME -> `error` receives a real message and no row is added.
- Deleting an asset -> object URLs are revoked and repository delete removes asset/ref rows.
- Attachment search -> filename, original name, MIME type, and tags are searchable without thumbnail assumptions.

### 5. Good/Base/Bad Cases
- Good: drag/paste/file-dialog callers reuse `uploadAsset`, receive the pipeline asset id, and render from the stored Blob URL.
- Base: an empty asset library shows no assets and no seeded placeholders.
- Bad: setting `assets.value` from a hard-coded sample list, storing object URLs in Dexie, or bypassing `assetPipeline.ingestFile()`.

### 6. Tests Required
- Unit/integration: asset pipeline service tests for upload-compatible return shape.
- Type-check `stores/asset.ts` after changing the store bridge.
- Browser smoke-test a real Blob ingest and object store creation before claiming asset pipeline readiness.

### 7. Wrong vs Correct

#### Wrong
```typescript
assets.value = [{ id: 'demo', name: 'sample.png', blob: new Blob() }]
```

#### Correct
```typescript
const result = await assetPipeline.ingestFile(file, {
  profileId: 'local-default',
  referrer: articleId ? { kind: 'article', id: articleId } : undefined,
})
mergeAsset(result.asset)
```

## Scenario: Search Store UI State

### 1. Scope / Trigger
- Trigger: UI, command palette, or SmartFolder code needs full-text document search state.
- Apply this contract when adding global search panels, search badges, saved query controls, or command-palette document search integration.

### 2. Signatures
- Store: `useSearchStore()`.
- Read fields: `query`, `results`, `total`, `took`, `indexedCount`, `isIndexing`, `isSearching`, `error`, `history`, `hasResults`, `hasIndex`.
- Actions: `rebuildIndex`, `indexArticle`, `removeArticle`, `clearIndex`, `search`, and `clearHistory`.

### 3. Contracts
- UI must call `rebuildIndex()` or receive indexed Article records before presenting search results.
- UI must render `error` from the store instead of replacing failures with a success empty state.
- Search history is real persisted user behavior and must not be prefilled with sample queries.
- Archived results should not be shown unless the UI explicitly passes `includeArchived: true` and labels that scope.
- Future CommandPalette integration should reuse `useSearchStore`/`SearchEngine` for documents instead of duplicating a second document-search algorithm.

### 4. Validation & Error Matrix
- `indexedCount === 0` -> show an honest unindexed or empty-library state.
- `search().total === 0` -> show no-match state, not a fake suggestion row.
- `error !== null` -> show retry path and retain the failed query text.
- `isIndexing || isSearching` -> disable duplicate triggering controls.

### 5. Tests Required
- Type-check store consumers after introducing search UI.
- Unit-test store rebuild/search behavior with Article-shaped records.
- Browser smoke-test the actual global search UI when Ctrl+Shift+F is wired.

## Scenario: Trash Store UI State

### 1. Scope / Trigger
- Trigger: UI, command palette, or lifecycle code needs trash list, restore, purge, empty, or expired cleanup state.
- Apply this contract when touching `stores/trash.ts`, `stores/article.ts`, TrashBin UI, destructive command handlers, or status badges.

### 2. Signatures
- Store: `useTrashStore()`.
- Read fields: `items`, `summary`, `totalCount`, `expiredCount`, `storageBytes`, `hasItems`, `isLoading`, `isMutating`, `error`, and `lastAction`.
- Actions: `loadTrash`, `moveToTrash`, `restore`, `purge`, `emptyTrash`, `purgeExpired`, and `refreshSummary`.

### 3. Contracts
- UI must call repository-backed actions and render persisted `items`; do not set trash rows directly in components.
- Error state must expose real repository or IndexedDB failures. Do not convert failed restore/purge into a success toast.
- Restore can increment visible category count only after a successful repository restore.
- Purge/empty/expired cleanup must update store state from real affected ids and counts.
- TrashBin UI must not be added as a placeholder route; wire route, list, restore, purge, confirmation, and read-only preview together before claiming UI completion.

### 4. Validation & Error Matrix
- Empty trash -> `hasItems` false and summary counts 0.
- Move -> item appears in trash state and category count decrements only after persistence succeeds.
- Restore -> item leaves trash state, status is draft, and category count increments after persistence succeeds.
- Purge -> item leaves state and no normal article row remains.
- Repository error -> `error` stores the real message and mutation flags reset.

### 5. Tests Required
- Type-check store consumers after introducing TrashBin UI.
- Unit/integration-test store actions when UI is added.
- Browser smoke-test the actual TrashBin route when route/page work is wired.

## Scenario: VersionBundle Store UI State

### 1. Scope / Trigger
- Trigger: UI, command palette, editor lifecycle, or recovery flow needs version list, milestone, cleanup, export, or restore-proposal state.
- Apply this contract when touching `stores/versionBundle.ts`, `stores/editor.ts`, `composables/useVersionManager.ts`, `components/version/*`, or future restore/diff UI.

### 2. Signatures
- Store: `useVersionBundleStore()`.
- Read fields: `activeContentId`, `versions`, `restoreProposal`, `lastExport`, `isLoading`, `isMutating`, `error`, `lastAction`, `totalCount`, `milestoneCount`, and `hasVersions`.
- Actions: `loadVersions`, `refresh`, `createSnapshot`, `setMilestone`, `deleteVersion`, `cleanupVersions`, `exportMarkdown`, `buildRestoreProposal`, and `clearRestoreProposal`.

### 3. Contracts
- UI must call store actions that delegate to `versionBundleRepository`; components must not create local fake versions.
- Loading and mutation flags must represent real async work and reset in `finally` paths.
- Error state must preserve the repository or IndexedDB failure message and must not emit a success state after a failed mutation.
- Restore UI must render `restoreProposal` first. Applying restored content is a separate explicit action and must not happen inside proposal creation.
- Version counts and milestone counts must be computed from persisted store state, not duplicated component counters.
- The existing `VersionPanel` may keep its legacy surface until full UI work lands, but new UI must use this store contract instead of bypassing it.

### 4. Validation & Error Matrix
- Empty list -> `hasVersions` false, counts 0, and no fake empty row.
- Load success -> `activeContentId` matches the requested content id and `versions` mirrors persisted rows.
- Snapshot unchanged -> no appended row and caller can render a no-change state.
- Snapshot changed -> version row appears after repository persistence succeeds.
- Milestone toggle -> list refreshes from persisted data and count updates.
- Restore proposal -> `restoreProposal` is set while current editor body is unchanged.
- Repository error -> `error` is set, flags reset, and caller receives the thrown error.

### 5. Good/Base/Bad Cases
- Good: VersionPanel opens, calls `loadVersions(contentId)`, renders persisted versions, and uses `buildRestoreProposal()` before any apply action.
- Base: autosnapshot calls the editor store or repository path and reports no-change when content is identical.
- Bad: a component directly mutates `versions` or displays seeded history rows to make an empty state look populated.

### 6. Tests Required
- Type-check store consumers after introducing or wiring version UI.
- Unit/integration-test store actions when full VersionPanel wiring is added.
- Browser smoke-test the actual timeline/diff/restore UI once the route/component work is wired.

### 7. Wrong vs Correct

#### Wrong
```typescript
versionBundleStore.versions = [makePlaceholderVersion()]
notifySuccess('Version restored')
```

#### Correct
```typescript
const proposal = await versionBundleStore.buildRestoreProposal(contentId, versionId)
showRestoreReview(proposal)
```

## Scenario: CommentReview Store UI State

### 1. Scope / Trigger
- Trigger: UI, command palette, editor lifecycle, or review export code needs comments, replies, review decisions, margin notes, track changes, or anchor drift state.
- Apply this contract when touching `stores/commentReview.ts`, future `components/comments/*`, editor context menus, floating toolbar comment actions, or review panels.

### 2. Signatures
- Store: `useCommentReviewStore()`.
- Read fields: `activeDocId`, `comments`, `marginNotes`, `trackChanges`, `summary`, `selectedCommentId`, `isLoading`, `isMutating`, `error`, and `lastAction`.
- Derived fields: `pendingCount`, `resolvedCount`, and `hasOpenReviewItems`.
- Actions: `loadReview`, `refresh`, `createComment`, `addReply`, `resolveComment`, `deleteComment`, `refreshAnchors`, `createMarginNote`, `createTrackChange`, `setTrackChangeStatus`, and `clearSelection`.

### 3. Contracts
- UI must call store actions backed by `commentReviewRepository`. Components must not push placeholder comments directly.
- Loading and mutation flags must represent real async work and reset in `finally` paths.
- Error state must preserve repository, validation, or IndexedDB messages and rethrow to callers.
- Selected-comment state is UI-only, but all comment/reply/margin/track-change records are persisted state.
- Track-change visuals must not be claimed complete until editor decorations or marks are wired to persisted `trackChanges` rows.
- Invalid anchors should remain visible as detached/orphaned review items, not hidden as success.

### 4. Validation & Error Matrix
- Empty document -> counts are 0 and no fake rows are shown.
- Create comment success -> comment appears after persistence and `selectedCommentId` is set.
- Add reply success -> persisted replies length increases and mentions merge.
- Resolve/delete success -> summary updates from persisted rows.
- Refresh anchors -> store reflects exact/drifted/invalid statuses from repository output.
- Repository error -> `error` is set, flags reset, and caller receives the thrown error.

### 5. Good/Base/Bad Cases
- Good: comment panel opens, calls `loadReview(docId)`, renders persisted comments, and uses `createComment()` for selected text.
- Base: a document with no comments renders a real empty state based on `summary.total === 0`.
- Bad: a component adds a demo comment to make the sidebar look populated.

### 6. Tests Required
- Type-check store consumers after UI wiring.
- Unit/integration-test store actions and summary updates.
- Browser smoke-test the actual comment panel, selected-text creation, and track-change UI once they are wired.

### 7. Wrong vs Correct

#### Wrong
```typescript
comments.value.unshift({ id: 'placeholder', content: 'Review later' })
```

#### Correct
```typescript
await commentReviewStore.createComment({ docId, anchor, content, authorId })
```

## Scenario: Diagnostics Store UI State

### 1. Scope / Trigger
- Trigger: UI, DevPanel, Settings, Toast, SafeMode, export, or crash package code needs diagnostic logs, export logs, or diagnostic summaries.
- Apply this contract when touching `stores/diagnostics.ts`, future ActivityLogViewer components, DevPanel events tabs, Toast/SafeMode bridges, or diagnostic export surfaces.

### 2. Signatures
- Store: `useDiagnosticsStore()`.
- Read fields: `logs`, `exportLogs`, `summary`, `activeProfileId`, `isLoading`, `isFlushing`, `isMutating`, `error`, and `lastAction`.
- Derived fields: `criticalCount` and `hasDiagnostics`.
- Actions: `loadLogs`, `loadExportLogs`, `flush`, `cleanupExpired`, `replayCriticalFallback`, `recordExportLog`, and `exportJsonl`.

### 3. Contracts
- UI must call store actions backed by `activityLogger`; components must not push placeholder diagnostic rows directly.
- Loading, flushing, and mutation flags must represent real async work and reset in `finally` paths.
- Error state must preserve repository, validation, IndexedDB, or fallback messages and rethrow to callers.
- Store summaries are derived from persisted logs, export logs, queued count, and trace buffer state.
- JSONL export may record an `exportLogs` row only after the real export string is generated.

### 4. Validation & Error Matrix
- Empty diagnostics -> counts are zero and no fake rows are shown.
- Load success -> `logs` and `summary` reflect persisted activity rows.
- Flush success -> queued ActivityLogger records are persisted or fallback counts are surfaced.
- Cleanup success -> `lastAction` records the real deleted count and state reloads.
- Export success -> JSONL content is returned and optional export-log record is prepended.
- Repository error -> `error` is set, flags reset, and caller receives the thrown error.

### 5. Good/Base/Bad Cases
- Good: ActivityLogViewer calls `loadLogs({ profileId })` and renders persisted rows with redacted payloads.
- Base: no logs renders an empty state based on `summary.total === 0`.
- Bad: a component inserts demo logs into `logs.value` to show the table layout.

### 6. Tests Required
- Unit/integration-test store actions, summary updates, and error propagation.
- Type-check all UI consumers after ActivityLogViewer or DevPanel wiring.
- Browser-smoke the actual panel once UI is wired.

### 7. Wrong vs Correct

#### Wrong
```typescript
store.logs.unshift({ id: 'placeholder', event: 'demo' } as ActivityLogRecord)
```

#### Correct
```typescript
await diagnosticsStore.loadLogs({ profileId })
```

## Scenario: Layout Persistence Store UI State

### 1. Scope / Trigger
- Trigger: a Vue view or component needs to restore or persist workspace layout state across reloads.
- Apply this contract when touching `stores/layoutPersistence.ts`, `views/WorkstationView.vue`, Settings layout reset UI, or future desktop window-state UI.

### 2. Signatures
- Store: `useLayoutPersistenceStore()`.
- Read fields: `currentRecord`, `profileId`, `windowId`, `isLoading`, `isSaving`, `error`, and `lastAction`.
- Actions: `initialize`, `load`, `save`, `scheduleSave`, `flushScheduledSave`, `clear`, and `cleanupStaleLayouts`.
- Workstation persisted patch fields: `managerCollapsed`, `stageCollapsed`, `inspectorCollapsed`, `rightPanelMode`, `managerTab`, `editorMode`, `editorWidth`, `modeLayouts`, `panelWidths`, `activeArticleId`, and `statusBarVisible`.

### 3. Contracts
- UI components must call the store or service; they must not mutate IndexedDB layout rows directly.
- Store async actions must set loading/saving flags, preserve error messages, and rethrow failures.
- Workstation must keep existing localStorage fallback paths while adding IndexedDB persistence.
- Programmatic restore must not immediately schedule duplicate saves; watchers that react to restore must be guarded by layout-application state.
- Profile changes must reinitialize the layout scope; window ids must remain session scoped.
- The current UI maps Spec 34 sidebar/right-panel language to Workstation manager/stage/inspector terminology.

### 4. Validation & Error Matrix
- Initialize success with a row -> Workstation applies persisted mode, width, tab, and collapse state.
- Initialize success without a row -> defaults/localStorage remain active and no fake row is created.
- Save success -> `currentRecord` reflects the persisted service result.
- Debounced save -> `lastAction.kind` can be `schedule` before flush and `save` after explicit save.
- Store failure -> `error` is set and caller receives the thrown error.
- Component unmount -> pending scheduled save is flushed without blocking teardown.

### 5. Good/Base/Bad Cases
- Good: Workstation captures existing reactive state into a `LayoutStatePatch` and calls `scheduleSave`.
- Base: profile id is not loaded yet, so the store uses `DEFAULT_PROFILE_ID` and reinitializes when the profile store changes.
- Bad: a component inserts placeholder tabs or demo panel widths directly into `currentRecord` to make UI appear restored.

### 6. Tests Required
- Store tests for initialize/save/clear/cleanup state transitions.
- Service tests for migration, validation, and debounce behavior because the store delegates persistence.
- Browser smoke for real IndexedDB v16 and Workstation-compatible fields after schema changes.

### 7. Wrong vs Correct

#### Wrong
```typescript
layoutPersistenceStore.currentRecord = { id: 'demo' } as LayoutStateRecord
```

#### Correct
```typescript
layoutPersistenceStore.scheduleSave(captureLayoutPersistencePatch(), activeProfileId)
```

## Scenario: Workstation SplitView UI State

### 1. Scope / Trigger
- Trigger: Workstation UI adds or changes split preview, pane resize, sync-scroll toggle, responsive fallback, command palette bridge, or keyboard shortcuts.
- Apply this contract when touching `views/WorkstationView.vue`, `stores/settings.ts`, `services/command/*`, `components/command-palette/*`, or layout persistence consumers.

### 2. Signatures
- Toggle action: `toggleSplitView` in `WorkstationCommandBridge.actions`.
- Default shortcut: `Ctrl+Shift+E` for SplitView; `Ctrl+Shift+B` for sidebar/manager fallback.
- Split state sources: Workstation refs plus `useLayoutPersistenceStore()`; no separate SplitView store in the Phase 1 baseline.
- Split preview renderer: existing `MarkdownPreview` receiving current `normalizedBody`.

### 3. Contracts
- Do not remove existing Preview mode, stage panel, manager/sidebar, inspector, or localStorage fallback while adding SplitView.
- SplitView is available only when not in Preview mode and viewport width is at least 900px.
- Separator must stay keyboard accessible and expose `role="separator"`, vertical orientation, and min/max/current ratio values.
- Pointer drag and keyboard resize must persist through layout persistence, not only CSS state.
- Sync-scroll baseline must include loop prevention and a user-visible opt-out.
- Icons must come from installed icon components or inline SVG; do not use Emoji glyphs.

### 4. Validation & Error Matrix
- `Ctrl+Shift+E` on wide Workstation -> right preview pane appears and class `split-view-active` is present.
- Separator ArrowRight -> ratio increases and `aria-valuenow` changes.
- Narrow viewport -> split pane disappears and the editor remains usable.
- Enter Preview mode -> SplitView closes and the read-only preview shell remains usable.
- Command palette icon -> `Columns2` resolves from `lucide-vue-next`, not fallback `Circle` because of missing registration.
- Legacy shortcut conflict -> old `toggleSidebar=Ctrl+Shift+E` migrates to `Ctrl+Shift+B`.

### 5. Good/Base/Bad Cases
- Good: Workstation toggles SplitView, renders `MarkdownPreview` from real editor content, and schedules a layout save.
- Base: empty workstation still renders a real empty editor/preview state without sample documents.
- Bad: a component creates mock Markdown content or hides existing Preview mode to make SplitView simpler.

### 6. Tests Required
- Type-check Workstation/command bridge/settings after adding actions and shortcuts.
- Unit-test layout persistence split fields and shortcut migration when direct settings tests exist.
- Browser-smoke wide toggle, separator keyboard resize, IndexedDB persistence, narrow fallback, Preview-mode disablement, and console errors.

### 7. Wrong vs Correct

#### Wrong
```typescript
const previewMarkdown = '# Demo SplitView'
```

#### Correct
```vue
<MarkdownPreview :markdown="normalizedBody" />
```

## Scenario: WikiLink Store UI State

### 1. Scope / Trigger
- Trigger: future backlink panels, broken-link lists, article title suggestions, graph views, or editor WikiLink UI read or mutate WikiLink state.
- Apply this contract when touching `stores/wikiLink.ts`, `services/wiki-link/*`, `stores/article.ts`, Markdown preview renderers, or future WikiLink components.

### 2. Signatures
- Store: `useWikiLinkStore()`.
- Read fields: `backlinks`, `brokenLinks`, `searchResults`, `isLoading`, `isIndexing`, `error`, `lastAction`, `backlinkCount`, and `brokenLinkCount`.
- Actions: `loadBacklinks`, `loadBrokenLinks`, `searchArticles`, `rebuildArticle`, `rebuildAll`, and `deleteArticleBacklinks`.

### 3. Contracts
- UI must call the WikiLink store or service. Components must not query or mutate `db.backlinks` directly.
- Search suggestions must come from real articles returned by the article repository and must filter out trashed articles.
- Loading/indexing flags must represent actual async service work and reset in `finally` paths.
- Error state must preserve the real service/IndexedDB error and rethrow to callers.
- Backlink state is derived from Markdown content; UI must not seed example backlinks, fake graph nodes, or placeholder broken links.
- ArticleStore lifecycle hooks own background rebuild/cleanup. UI panels should load state, not duplicate lifecycle indexing rules.

### 4. Validation & Error Matrix
- No backlinks -> counts are zero and UI may show an empty state based on real store state.
- Existing target -> `loadBacklinks(targetId)` returns source rows sorted by recency.
- Missing targets -> `loadBrokenLinks()` returns unresolved rows with context.
- Search query -> `searchArticles(query)` updates `searchResults` with real non-trashed article titles.
- Rebuild failure -> `error` is set and caller receives the thrown error.
- Cleanup after delete -> `deleteArticleBacklinks(articleId)` records the real deleted count in `lastAction`.

### 5. Good/Base/Bad Cases
- Good: a future backlinks panel calls `await wikiLinkStore.loadBacklinks(activeArticleId)` and renders `wikiLinkStore.backlinks`.
- Base: a new vault shows zero backlinks until real articles contain `[[...]]` syntax.
- Bad: a graph view pushes sample nodes into `backlinks.value` to make the canvas look populated.

### 6. Tests Required
- Unit-test store actions with service-backed behavior and error propagation.
- Type-check any UI consumer after adding WikiLink panels or suggestion components.
- Browser-smoke parser/renderer/store/database behavior before declaring WikiLink UI complete.

### 7. Wrong vs Correct

#### Wrong
```typescript
wikiLinkStore.backlinks.push({ id: 'placeholder' } as BacklinkRecord)
```

#### Correct
```typescript
await wikiLinkStore.loadBacklinks(activeArticleId)
```

## Scenario: Snippet Store UI State

### 1. Scope / Trigger
- Trigger: future snippet manager UI, editor expansion, snippet import/export controls, or command/slash integrations read or mutate snippet state.
- Apply this contract when touching `stores/snippet.ts`, `services/snippet/*`, `components/editor/EditorPanel.vue`, future Settings snippet panels, or future snippet commands.

### 2. Signatures
- Store: `useSnippetStore()`.
- Read fields: `snippets`, `searchResults`, `isLoading`, `isSaving`, `error`, `lastAction`, `snippetCount`, and `textSnippetCount`.
- Actions: `loadSnippets`, `searchSnippets`, `createSnippet`, `updateSnippet`, `deleteSnippet`, `expandSnippet`, `recordUsage`, `exportAll`, `importInkForgeJson`, and `importVSCodeJson`.

### 3. Contracts
- UI must call the snippet store or service. Components must not mutate `db.snippets` directly.
- Loading and saving flags must represent real async service work and reset in `finally` paths.
- Error state must preserve the real service/IndexedDB/import validation error and rethrow to callers.
- Editor expansion must use the real store snapshot and must not hijack Tab when no text snippet trigger matches.
- The store must not seed snippets, fake usage counts, or fabricate search results for empty states.
- Future Settings UI should render empty states from real `snippetCount === 0`, not from placeholder rows.

### 4. Validation & Error Matrix
- No snippets -> counts are zero and editor Tab behavior remains normal.
- Search query -> `searchSnippets(query)` updates `searchResults` from persisted rows.
- Expansion match -> `expandSnippet(textBeforeCursor, context)` returns resolved content and `recordUsage(id)` updates usage state after insertion.
- Import failure -> `error` is set and caller receives the thrown validation error.
- Delete -> snippets and search results remove the same id.

### 5. Good/Base/Bad Cases
- Good: `EditorPanel` configures `SnippetExpansion` with `getSnippets: () => snippetStore.snippets` and calls `recordUsage` after actual expansion.
- Base: a new vault has no snippets; Settings may show a real empty state and the editor keeps default Tab behavior.
- Bad: a snippet manager pushes sample records into `snippets.value` to make the table look useful.

### 6. Tests Required
- Unit-test store actions with service-backed behavior, flag resets, last-action updates, and error propagation.
- Type-check future UI consumers after adding snippet manager or command integrations.
- Browser-smoke editor/database integration before declaring snippet UI complete.

### 7. Wrong vs Correct

#### Wrong
```typescript
snippetStore.snippets.push({ id: 'placeholder' } as SnippetRecord)
```

#### Correct
```typescript
await snippetStore.loadSnippets()
await snippetStore.createSnippet({ name, trigger, content, scope })
```

## Scenario: TOC Store UI State

### 1. Scope / Trigger
- Trigger: sidebar outline, inline TOC macro, heading navigation, active-heading highlighting, TOC depth/numbering options, or future chapter reordering touches `services/toc/*`, `stores/toc.ts`, `composables/useOutline.ts`, or `components/outline/*`.

### 2. Signatures
- Store: `useTocStore()`.
- Read fields: `headings`, `flatHeadings`, `activeHeadingId`, `collapsedIds`, `maxDepth`, `numbering`, `error`, `lastUpdated`, `headingCount`, and `hasHeadings`.
- Actions: `updateFromMarkdown`, `updateFromEditor`, `setActiveHeading`, `setActiveByPosition`, `toggleCollapsed`, `isCollapsed`, `expandAll`, `collapseAll`, and `setOptions`.

### 3. Contracts
- UI must call the TOC store or TOC service. Components must not duplicate heading parsing rules.
- Empty documents must produce empty heading state; never seed sample headings for visual fullness.
- Active heading state must refer to a real current heading id and must be cleared when that heading disappears.
- Collapsed ids must be pruned after heading updates so stale ids cannot survive deleted headings.
- Sidebar navigation must move the real TipTap selection and invoke editor scroll behavior; it must not fake active state without selection movement.
- Existing `[toc]` Markdown preview macro remains source-preserving; renderer output must not rewrite saved Markdown.
- Icons must come from installed icon components or inline SVG; do not use Emoji glyphs.

### 4. Validation & Error Matrix
- No headings -> `headingCount === 0` and OutlinePanel shows a real empty state.
- H1-H6 document -> parser emits stable flat and tree heading structures.
- Duplicate heading text -> ids remain unique through slug suffix and position.
- Heading deleted -> active id and collapsed ids referencing it are removed.
- Fenced-code headings -> ignored by Markdown parser.
- Renderer `[toc]` -> produces anchors based on real Markdown headings.

### 5. Good/Base/Bad Cases
- Good: `tocStore.updateFromEditor(editor)` parses the real TipTap doc and updates the Workstation outline.
- Base: a new document with no headings leaves the outline empty.
- Bad: a component pushes `{ text: 'Demo' }` into TOC state or parses headings with a divergent regex.

### 6. Tests Required
- Unit-test parser id generation, Markdown extraction, ProseMirror extraction, tree building, numbering, store update/pruning, and markdown renderer integration.
- Type-check outline/TOC store consumers after changing TOC state contracts.
- Browser-smoke Workstation outline/TOC modules and `[toc]` rendering before declaring TOC UI complete.

### 7. Wrong vs Correct

#### Wrong
```typescript
tocStore.headings.push({ id: 'demo', text: 'Demo' } as TocHeading)
```

#### Correct
```typescript
tocStore.updateFromEditor(editor)
```

## Scenario: SplitView SyncScroll UI State

### 1. Scope / Trigger
- Trigger: Workstation SplitView synchronized scrolling, editor/preview scroll listeners, heading-anchor mapping, sync-scroll toggle, or future scroll performance work touches `services/sync-scroll/*`, `composables/useSyncScroll.ts`, `views/WorkstationView.vue`, `components/editor/EditorPanel.vue`, `services/toc/*`, or `stores/toc.ts`.

### 2. Signatures
- Service exports: `AnchorRegistry`, `calculateSyncedScrollTop`, `calculateRatioScrollTop`, `ScrollLoopDetector`, `setScrollTopImmediate`, and `createResizeRebuildObserver`.
- Composable: `useSyncScroll({ enabled, active, leftScrollElement, rightScrollElement, previewRootElement, editor, headings, onBeforeRebuild, onLoopDetected })`.
- EditorPanel expose: `getEditorScrollElement()` returns the real `.editor-scroll` container.
- Workstation state source: existing `splitViewSyncScroll` persisted through layout persistence.

### 3. Contracts
- SyncScroll must consume real TipTap editor DOM, real TOC headings, and real rendered Markdown preview DOM. Do not seed fake headings, fake anchors, or fake preview content.
- Workstation must bind listeners to actual scroll owners. Do not attach sync logic only to wrapper elements that do not scroll.
- Anchor mapping is the primary path when headings exist; total-height ratio is only a degradation path for missing or mismatched anchors.
- Programmatic scroll assignment must temporarily force `scroll-behavior: auto` and must guard bidirectional feedback loops.
- Resize/image/content changes must schedule anchor rebuilds and clean observers/listeners on unmount or SplitView disablement.
- `splitViewSyncScroll=false` means no synchronization should move either pane; both panes remain independently scrollable.
- Icons must come from installed icon components or inline SVG; do not use Emoji glyphs.

### 4. Validation & Error Matrix
- No headings or mismatched preview ids -> ratio fallback, no crash.
- Left editor scroll -> right preview lands on the corresponding heading section when anchors match.
- Right preview scroll -> left editor lands on the corresponding heading section when anchors match.
- Sync toggle off -> no target scroll assignment occurs.
- Rapid alternating scroll events -> loop detector calls the supplied handler and clears history.
- Markdown/images/layout changes -> scheduled rebuild refreshes offsets without leaving stale observers.

### 5. Good/Base/Bad Cases
- Good: Workstation calls `useSyncScroll` with `editorPanelRef.value?.getEditorScrollElement?.()` and `splitViewRightScrollRef`, then rebuilds anchors from `useTocStore.updateFromEditor(editor)`.
- Base: a document without headings still scrolls proportionally and remains usable.
- Bad: a component pushes placeholder headings into `tocStore.flatHeadings` or synchronizes only `scrollTop / scrollHeight` while anchors are available.

### 6. Tests Required
- Unit-test interpolation, top/bottom boundaries, no-anchor fallback, final-anchor remaining-height behavior, loop detection, immediate scroll assignment, and no-op observer fallback.
- Type-check Workstation and EditorPanel after changing exposed scroll methods.
- Browser-smoke SplitView with real editor content, real rendered headings, sync toggle off/on, and console-error scan before declaring UI complete.

### 7. Wrong vs Correct

#### Wrong
```typescript
rightPane.scrollTop = (leftPane.scrollTop / leftPane.scrollHeight) * rightPane.scrollHeight
```

#### Correct
```typescript
const syncScroll = useSyncScroll({
  enabled: computed(() => splitViewSyncScroll.value),
  active: computed(() => isSplitViewActive.value),
  leftScrollElement: () => editorPanelRef.value?.getEditorScrollElement?.() ?? null,
  rightScrollElement: () => splitViewRightScrollRef.value,
  previewRootElement: () => splitViewRightScrollRef.value?.querySelector('.markdown-preview') ?? null,
  editor: () => outlineEditor.value,
  headings: () => tocStore.flatHeadings,
})
```

## Scenario: DevPanel Runtime State

### 1. Scope / Trigger
- Trigger: App root, Settings About, Command Palette, editor runtime, or diagnostics code needs to expose the hidden production-retained DevPanel.
- Apply this contract when touching `stores/devPanel.ts`, `services/dev-tools/*`, `App.vue`, `SettingsView.vue`, `EditorPanel.vue`, ActivityLogger modules, or shared Tauri/fetch wrappers.

### 2. Signatures
- Store: `useDevPanelStore()`.
- Read fields: `sessionDeveloperMode`, `isPanelVisible`, `hasLoadedPanel`, `activeTab`, `lastActivationSource`, `drawerHeightVh`, `persistentDeveloperMode`, `developerModeEnabled`, and `shouldRenderPanel`.
- Actions: `setPersistentDeveloperMode`, `enableSessionDeveloperMode`, `initializeFromStartup`, `openPanel`, `closePanel`, `togglePanel`, `setActiveTab`, and `setDrawerHeight`.
- Bridge: `registerActiveEditor({ editor, scrollElement, articleId, title })` must be called by the real TipTap owner and cleaned up on unmount.

### 3. Contracts
- Normal startup must not mount DevPanel and must not load the DevPanel chunk.
- Activation may come from Settings persistence, `?dev-panel=1` / `?devPanel=1`, or three Ctrl+Shift+D presses inside 500ms.
- Command Palette may toggle DevPanel only after Developer Mode or session activation is enabled; otherwise it should route the user to Settings About.
- DevPanel tabs must read real runtime sources only: active TipTap editor, ProseMirror state, Pinia root state, ActivityLogger/event bus, Performance SLO repository, Dexie tables, and fetch/Tauri diagnostics.
- Store mutations are dangerous and must be primitive-only, confirmation-gated, and logged as `dev.store.patch`.
- IndexedDB mutation is not part of the baseline; the UI must explain read-only boundaries instead of pretending edits are supported.
- Network diagnostics must redact URL secrets and never store request or response bodies.

### 4. Validation & Error Matrix
- `developerModeEnabled === false` and no startup flag -> DevPanel not rendered.
- Startup flag true -> session mode enabled and panel opens with `lastActivationSource = 'startup-flag'`.
- Triple shortcut completes -> session mode enabled and `dev.panel.open` evidence is written.
- No active editor -> Editor and ProseMirror tabs show unavailable state rather than mock JSON.
- Sensitive IndexedDB table -> row browsing allowed, write actions remain disabled.
- Secret URL query -> rendered Network payload contains `REDACTED` and not the original secret.

### 5. Good/Base/Bad Cases
- Good: `/settings?tab=about` exposes Developer Mode, `/ ?dev-panel=1` loads the panel lazily, Network captures a real fetch with redacted query secrets, and console errors remain zero.
- Base: normal `/` startup has no DevPanel DOM and no loaded DevPanel script.
- Bad: eager importing DevPanel in the initial bundle, showing fake stores/events, allowing object/array store patching, or displaying raw tokens.

### 6. Tests Required
- Unit-test activation, startup signal, ring buffer bounds, URL redaction, IDB read option guardrails, sensitive table classification, and primitive Pinia patch confirmation.
- Type-check App, Settings, EditorPanel, dev-tools services, ActivityLogger, and command registration after changes.
- Browser smoke-test normal startup, forced startup, Network redaction, Settings About control, and console error count.

### 7. Wrong vs Correct

#### Wrong
```ts
const panelVisible = true
const events = [{ event: 'fake.success' }]
```

#### Correct
```ts
const devPanelStore = useDevPanelStore()
devPanelStore.initializeFromStartup()
const events = devToolsEventBus.snapshot().events
```

## Scenario: Settings Migration Runtime State

### 1. Scope / Trigger
- Trigger: Settings import, Settings reset, schema version bump, rollback snapshot creation, or Settings About migration UI reads migration state.
- Apply this contract when touching `stores/settings.ts`, `services/settings-migration/*`, or Settings import/export/About UI.

### 2. Signatures
- Store: `useSettingsStore()`.
- Read fields: `settings.schemaVersion`, `settings.advanced.migrationSnapshots`, and `lastMigrationPreview`.
- Actions: `previewImportSettings`, `importSettings`, `createRollbackPoint`, `restoreRollbackPoint`, and `restoreLatestRollbackPoint`.
- Service: `previewSettingsMigration`, `detectSettingsSchemaVersion`, `buildSettingsMigrationDiff`, `createSettingsMigrationSnapshot`, and `prependSettingsMigrationSnapshot`.

### 3. Contracts
- Unknown Settings JSON must be parsed, migrated, normalized, and validated before overwriting current Settings.
- Zod validation must use non-throwing `safeParse` style results at the import boundary.
- A successful import must create a rollback point before applying the migrated candidate.
- Future Settings schema versions must be rejected without downgrade or overwrite.
- Rollback restore must validate the snapshot through the same current Settings candidate path before writing store state.
- UI must render real migration/snapshot state from the store; do not render sample rollback points, fake migration logs, or mock deprecated fields.

### 4. Validation & Error Matrix
- Unversioned Settings with legacy root fields -> preview reports v0 to current, diff/deprecations are populated, import succeeds, and snapshot count increments.
- Current Settings with no changes -> preview succeeds and remains schema-current.
- Future `schemaVersion` -> import returns false and current Settings remain unchanged.
- Invalid JSON -> import returns false and current Settings remain unchanged.
- Snapshot with invalid shape -> restore returns false and current Settings remain unchanged.

### 5. Good/Base/Bad Cases
- Good: `/settings?tab=about` shows current schema, real snapshot count, latest preview summary after an import, and restore-latest only when a snapshot exists.
- Base: fresh local settings show schema current and zero snapshots.
- Bad: direct `settings.value = JSON.parse(json)`, silent migration without preview state, unbounded snapshots, or fake rollback rows.

### 6. Tests Required
- Unit-test migration chain, future-version rejection, validation failure, deprecation diff, and bounded snapshot helpers.
- Type-check Settings store and Settings view after changing migration APIs.
- Browser smoke-test Settings About schema/rollback section and console errors.

### 7. Wrong vs Correct

#### Wrong
```ts
settings.value = JSON.parse(rawSettings)
```

#### Correct
```ts
const preview = settingsStore.previewImportSettings(rawSettings)
if (preview.ok) {
  settingsStore.importSettings(rawSettings)
}
```

## Scenario: Template Variable Runtime State

### 1. Scope / Trigger
- Trigger: Hub template-market selection, `TemplatePicker` selection, template variable rendering, future user-template creation, or any route that turns Markdown template content into an article draft.
- Apply this contract when touching `src/services/template/*`, `src/data/templates.ts`, `src/components/template/*`, `src/views/HubView.vue`, or article creation from template content.

### 2. Signatures
- Service: `renderTemplateVariables(templateContent, context)`.
- Service helpers: `formatTemplateDate`, `extractUserInputVariables`, and `validateTemplateVariables`.
- Context fields: `userInputs`, `authorName`, `createdAt`, and optional `uuidFactory`.
- UI entry: Hub `handleTemplateSelect(template)` and future template picker submit handlers.
- Draft write boundary: existing article store creation APIs such as `articleStore.addArticle` must remain the real persistence path.

### 3. Contracts
- Template Markdown must be rendered before draft persistence; UI code must not pass unresolved `{{...}}` placeholders into article bodies when a variable value is available.
- `{{CURSOR}}` is a control marker, not document content; remove it and return its offset for future editor focus placement.
- Auto variables such as `date:*`, `author`, `uuid`, and `weekNumber` must not be reported as required user-input variables.
- Malformed template syntax must be validated with explicit errors instead of silently producing partial output.
- Built-in templates must not be deleted, renamed, or replaced when adding runtime behavior.
- Browser UI must show real draft creation results from the article store; do not render sample template cards, fake drafts, or mock success states.

### 4. Validation & Error Matrix
- `{{title}}` with provided user input -> rendered content contains the provided title.
- `{{date:YYYY-MM-DD HH:mm}}` with deterministic `createdAt` -> rendered content contains the formatted local date/time.
- `{{CURSOR}}` in content -> output removes the marker and returns a non-null cursor offset.
- Auto variables only -> `extractUserInputVariables` returns an empty list.
- Unclosed `{{title` or unexpected `}}` -> `validateTemplateVariables` returns invalid with an explicit error.
- Hub template selection -> a real draft is created and opened at `/workstation?id=...` with rendered content.

### 5. Good/Base/Bad Cases
- Good: Hub selects a built-in template, calls `renderTemplateVariables`, persists through `articleStore.addArticle`, routes to Workstation, and visible content has no unresolved template syntax.
- Base: A template with no variables still passes through the renderer and produces unchanged Markdown content.
- Bad: Directly writing `template.body` to a draft, inventing sample user templates, storing `{{CURSOR}}` as document text, or using fake article IDs to simulate success.

### 6. Tests Required
- Unit-test variable rendering, date formatting, cursor marker handling, user-input extraction, and malformed brace validation.
- Type-check and lint service and UI callers after changing template contracts.
- Browser smoke-test Hub template creation through the real article store and verify no visible unresolved `{{...}}` placeholders or console errors.

### 7. Wrong vs Correct

#### Wrong
```ts
await createDraftAndOpen({
  title: template.name,
  body: template.body,
  sourceKind: 'template',
})
```

#### Correct
```ts
const rendered = renderTemplateVariables(template.body, {
  userInputs: { title },
  authorName: accountStore.displayName,
  createdAt: new Date(),
})

await createDraftAndOpen({
  title,
  body: rendered.content,
  sourceKind: 'template',
})
```
## Scenario: Drafts Box Batch Runtime State

### 1. Scope / Trigger
- Trigger: `/drafts` list/grid rendering, preview/peek state, draft selection, batch archive, batch ready-to-publish, or undoing the latest draft batch status update.
- Apply this contract when touching `src/views/DraftsView.vue`, `core/lifecycle/status.ts`, article lifecycle status updates, or future Drafts Box store extraction.

### 2. Signatures
- Source of truth: `useArticleStore()` and `articles` from `storeToRefs(articleStore)`.
- Lifecycle filter: `isDraftBoxStatus(article.status)`.
- Local view state: `viewMode`, `activePreviewDraftId`, `selectedDraftIds`, `isBatchUpdating`, and `latestBatchUndo`.
- Batch write boundary: `articleStore.updateArticle(articleId, { status })`.
- Undo payload: `{ articleId, previousStatus }[]` captured before each batch status update.

### 3. Contracts
- Drafts Box UI must derive visible rows from real articles only; do not seed sample drafts or maintain a parallel persistence store.
- List/grid mode changes may alter layout only; they must not alter filters, sorting, or article status.
- Preview/peek state must render from the selected/active real article and fall back to the first filtered draft when the active id is unavailable.
- Batch archive and ready-to-publish must persist status changes through `articleStore.updateArticle()`.
- Latest batch undo must restore captured previous statuses through the same update path.
- The undo control must remain reachable after a batch operation removes the last visible draft from the list.
- Selected draft state must be cleared after a successful batch operation to prevent stale selections.

### 4. Validation & Error Matrix
- One visible draft selected -> batch toolbar reports one selected item.
- Batch archive -> article status becomes `archived`, the item leaves `isDraftBoxStatus` results, and latest undo becomes available.
- Batch ready-to-publish -> article status becomes `ready_to_publish`, the item leaves the Drafts Box list, and latest undo becomes available.
- Undo latest batch -> all captured article statuses are restored and draft rows reappear when restored to `draft` or `writing`.
- Last visible draft archived -> empty state may render, but the undo toolbar remains visible.
- No selected drafts -> batch action buttons are disabled and no store write is attempted.

### 5. Good/Base/Bad Cases
- Good: Select a real draft, archive it through `articleStore.updateArticle`, see it leave the list, click undo, and see the same draft return.
- Base: Toggle list/grid while no draft is selected; visible draft count and filters stay unchanged.
- Bad: Removing a row from a local array without writing article status, hiding undo after the last item leaves the list, or using fake article ids to test batch success.

### 6. Tests Required
- Type-check DraftsView after changing selected state or status update signatures.
- Lint DraftsView and full `src` after adding new view state or icons.
- Browser smoke-test real draft selection, batch archive, empty-list undo, restore, preview panel, and console error count.
- Add unit coverage if batch logic is extracted from DraftsView into a future `useDraftsStore` or service.

### 7. Wrong vs Correct

#### Wrong
```ts
filteredDrafts.value = filteredDrafts.value.filter(article => !selectedIds.has(article.id))
```

#### Correct
```ts
for (const entry of selectedEntries) {
  await articleStore.updateArticle(entry.articleId, { status: ARTICLE_STATUS.ARCHIVED })
}
```
## Scenario: Import Wizard Detection Runtime State

### 1. Scope / Trigger
- Trigger: Hub import actions, FileManager import actions, `articleStore.importFromFiles()`, file-picker returned files, or future Import Wizard format preview.
- Apply this contract when touching `src/services/file-import/*`, `src/stores/article.ts`, `src/views/HubView.vue`, `src/components/file/FileManager.vue`, or future `src/components/importer/*` components.

### 2. Signatures
- Service: `detectImportFormat(mimeType, fileName)` returns `ImportFormatDetection`.
- Service guard: `getSupportedImportFormatOrThrow(mimeType, fileName)` returns `SourceFormat` or throws a user-facing unsupported-format error.
- Store boundary: `articleStore.importFromFiles()` returns `FileImportResult` with `success`, `failed`, `skippedOversize`, and `errors`.
- UI state: Hub `latestImportResult` stores the latest real attempt; FileManager `importResult` stores the toast payload.
- Persistence boundary: supported imports must continue through `addArticle()` and the repository-backed article store path.

### 3. Contracts
- Client MIME must be treated as a hint only; extension checks remain part of format detection and unsupported formats must not fall through to text import.
- Supported Markdown/HTML/TXT files may parse and create real articles; unsupported DOCX/ZIP/JSON/Bear/unknown formats must accumulate explicit errors.
- Oversize files are skipped before content parsing and must increment `skippedOversize` rather than pretending to succeed.
- UI code must render the real `FileImportResult`; it must not seed sample imported documents, fake success rows, or hide unsupported-format errors.
- Hub must record every attempt result, including no-write/cancel states, so the user has deterministic feedback after using the import entry.
- FileManager and Hub must share the same result model; extending `FileImportResult` requires updating both consumers.

### 4. Validation & Error Matrix
- `.md`, `.markdown`, `.mdx`, markdown MIME -> supported `markdown` detection.
- `.html`, `.htm`, HTML MIME -> supported `html` detection.
- `.txt` or extensionless `text/plain` -> supported `text` detection.
- `.docx`, `.zip`, `.json`, `.bear`, `.bear2bk` -> unsupported metadata and no article write.
- Unknown binary extension -> unsupported metadata with `unsupported-extension-or-mime`.
- Oversize file -> `skippedOversize` increments and no parser is invoked.
- Hub import attempt with `success=0` still updates the latest-result panel instead of returning silently.
- FileManager import attempt with only oversize skipped still shows an import notification.

### 5. Good/Base/Bad Cases
- Good: Detect unsupported `draft.docx`, return an explicit error, keep `success=0`, render the error in Hub, and leave articles unchanged.
- Base: User cancels the picker; store returns zeros and Hub records a no-write result without creating data.
- Bad: Treating `application/octet-stream` as text by default, importing `.docx` raw content without a converter, or showing a fake successful imported article.

### 6. Tests Required
- Unit-test supported detection, known unsupported detection, unknown binary rejection, and `getSupportedImportFormatOrThrow()` errors.
- Run `vue-tsc --noEmit` after changing `FileImportResult`; all UI consumers must be synchronized.
- Lint `src/services/file-import`, `src/stores/article.ts`, Hub, and FileManager after result-model or UI-state changes.
- Browser smoke-test Hub rendering after the import-result panel lands. System file-picker automation may be limited; do not fake an import success in smoke tests.

### 7. Wrong vs Correct

#### Wrong
```ts
const format = detectFormat(file.mimeType, file.name) || 'text'
```

#### Correct
```ts
const detection = detectImportFormat(file.mimeType, file.name)
if (!detection.supported) {
  summary.failed++
  summary.errors.push('不支持导入 ' + file.name + ': ' + detection.reason)
  continue
}
```
## Scenario: Workstation TabBar Session State

### 1. Scope / Trigger
- Trigger: /workstation route article selection, FileManager article selection, Workstation TabBar activation, close, pin, restore, drag reorder, or keyboard shortcuts.
- Apply this contract when touching src/stores/workstationTabs.ts, src/components/workstation/WorkstationTabBar.vue, src/views/WorkstationView.vue, article selection, or route query id synchronization.

### 2. Signatures
- Store: useWorkstationTabsStore() exposes orderedTabs, activeTabId, recentlyClosed, openOrRefreshTab(), activateTab(), closeTab(), restoreRecentlyClosed(), togglePinnedTab(), reorderTab(), cycleActiveTab(), and activateTabAtShortcutIndex().
- Persistence: session scope only through sessionStorage key inkforge.workstation.tabs.v1. Do not write Dexie schema changes for this baseline.
- Tab identity: WorkstationTab.id and articleId must both be the real Article.id.
- UI boundary: WorkstationTabBar receives tabs from the store plus active-tab save state from editorStatus. Inactive tabs are clean unless a future durable dirty-state store proves otherwise.

### 3. Contracts
- Opening or selecting a document must create or refresh a tab from a real article id/title; never seed sample tabs or placeholder documents.
- Switching a tab must select the real article through articleStore.selectArticle() and synchronize /workstation?id=<articleId>.
- Closing the active tab must activate a remaining real tab or return to Hub when no tabs remain.
- Pinned tabs stay before regular tabs; drag reorder may change order inside a group but must not move regular tabs into the pinned group.
- Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+1..9, Ctrl+W, and Ctrl+Shift+T are Workstation-level shortcuts and must prevent browser defaults only after a matching tab action is available.
- Active tab saving/error affordances are derived from editorStatus; do not invent dirty state. Saving close requests wait until editorStatus leaves saving; error closes require explicit confirmation.
- Recently closed tabs are session-scoped and must be discarded if the backing article no longer exists.

### 4. Validation & Error Matrix
- Route /workstation?id=A with loaded article A -> tab A opens, becomes active, and editor loads A.
- FileManager selects B while in Workstation -> tab B opens/refreshes and route query id becomes B.
- Close active B with remaining A -> active id falls back to A and route query follows A.
- Close last tab -> Workstation returns to Hub.
- Pin B then drag regular C across B -> B remains in the pinned group, C remains regular.
- Ctrl+9 with fewer than nine tabs -> last tab activates.
- Corrupt sessionStorage payload -> store clears it and boots with no fake tabs.

### 5. Good/Base/Bad Cases
- Good: Create a real draft from Hub, open Workstation, see one tab with that draft title, pin it, open another real article, switch with Ctrl+Tab, close and restore with Ctrl+Shift+T.
- Base: Enter Workstation without an id but with a valid session active tab; the route is restored to that real article id.
- Bad: Creating demo tabs on empty state, persisting tab sessions to Dexie in this baseline, or showing a dirty dot without a real dirty-state source.

### 6. Tests Required
- Unit-test store open/refresh, pin ordering, drag reorder group protection, close fallback, recently closed restore, Ctrl+9 mapping, LRU limit, and corrupt storage handling.
- Run vue-tsc --noEmit after changing WorkstationView or WorkstationTabBar props.
- Run pnpm lint and document pre-existing warnings separately from new errors.
- Browser smoke-test a real local draft opened from Hub to Workstation and verify the TabBar renders from real article state.
## Scenario: BlockDragHandle Editor Transaction State

### 1. Scope / Trigger
- Trigger: TipTap block drag handle, editor block reordering, keyboard block movement, or any future change to `src/extensions/BlockDragHandle/*` and `src/components/editor/EditorPanel.vue`.

### 2. Signatures
- Extension: `BlockDragHandle.configure({ enabled: () => boolean })`.
- Helper: `createMoveTopLevelBlockTransaction(state, sourcePos, targetPos, side)` returns `MoveBlockResult | null`.
- Keyboard: `moveCurrentTopLevelBlock(state, dispatch, 'up' | 'down')` returns `boolean`.
- Plugin state: `blockDragPluginKey` stores only transient `{ dropTarget, draggingPos }` metadata.

### 3. Contracts
- Drag movement must create exactly one document-changing ProseMirror transaction per completed move and set `addToHistory` to `true`.
- Drag hover, insertion-line updates, cleanup, and source highlighting are transient UI state and must set `addToHistory` to `false`.
- The visible drag handle must be bound to the block it was shown for. Do not derive drag source from active line or later hover state during dragstart.
- Reordered content must flow through `EditorPanel` update serialization and autosave. Do not write directly to IndexedDB, article repositories, or localStorage for editor block order.
- Source mode may keep the TipTap instance mounted for projection, but the drag handle must not be visible or actionable while `enabled()` is false.

### 4. Validation & Error Matrix
- Source and target are the same block -> return `null`, no transaction dispatch.
- Target insertion point equals source boundary -> return `null`, no visual or persisted mutation.
- Dragover event skips intermediate blocks -> drop handler recomputes target from final coordinates before using the previous transient target.
- Full page refresh before editor status is ready -> `EditorPanel` must retry initialization after the ready DOM renders.
- Unsupported top-level node -> no handle and no move transaction.

### 5. Good/Base/Bad Cases
- Good: Hover paragraph A, drag its handle before paragraph C, dispatch one undoable transaction, preview updates, autosave persists Markdown order.
- Base: Press `Alt+ArrowDown` on the last block; command returns false and content remains unchanged.
- Bad: Store drag source in a global active-line variable, update Dexie directly from the plugin, or push dragover indicator changes into undo history.

### 6. Tests Required
- Unit-test block range resolution, same-block no-op, boundary no-op, upward move, downward move, and selection placement near the moved block.
- Run `pnpm vitest run src/extensions/BlockDragHandle/__tests__/moveBlock.test.ts`, `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build` after changing the extension.
- Browser smoke must use a real local draft and verify hover handle, keyboard move, mouse drag move, Source-mode hidden handle, persisted Markdown order after refresh, console errors, and cleanup of `.block-drag-ghost` plus `.block-drag-insert-line`.

### 7. Wrong vs Correct

#### Wrong
```ts
this.sourceBlock = this.currentBlock
```

#### Correct
```ts
const block = this.handleBlock ?? this.currentBlock
this.sourceBlock = block
```
## Scenario: Tag System Store UI State

### 1. Scope / Trigger
- Trigger: Workstation tag assignment, tag browser filtering, tag manager operations, Hub tag cloud, or future search integration using document tags.
- Apply this contract when touching `src/stores/tags.ts`, `src/services/tag-system/*`, `src/components/tag-system/*`, `src/views/WorkstationView.vue`, or Hub insights tag cloud code.

### 2. Signatures
- Store: `useTagStore()`.
- Repository: `tagRepository` backed by Dexie `tags` and `docTags` tables.
- Data flow: Vue component -> `useTagStore` action -> `TagRepository` -> Dexie `tags`/`docTags` tables -> `Article.tags` compatibility mirror -> UI refresh.
- Filter mode: `TagFilterMode` is `OR` or `AND` and must be passed through the store/repository boundary.

### 3. Contracts
- `docTags` is the authority for document-tag membership. `Article.tags` is a compatibility/search mirror only and must be repaired through repository actions.
- UI components must never write directly to Dexie or mutate tag membership arrays locally. Create, assign, remove, merge, delete, cleanup, and filter all route through `useTagStore`.
- Store state is a reactive cache and must be hydrated from repository calls. It cannot be treated as the source of truth after a refresh or migration.
- `loadTags()` may backfill from existing real `Article.tags` values because those are user data. It must not seed sample tags or demo relations.
- Multi-step tag writes, including assign/remove/delete/merge/backfill, must remain repository transactions so `docCount`, `docTags`, and the article mirror do not drift.

### 4. Validation & Error Matrix
- Create tag -> one real `tags` row exists and UI shows it immediately.
- Assign tag -> one real `docTags` row exists, tag `docCount` increments, and `Article.tags` includes the tag name.
- Remove tag -> relation is removed, `docCount` decreases to zero when no documents remain, and `Article.tags` no longer includes the tag name.
- OR filter -> returns documents with any selected tag. AND filter -> returns only documents with every selected tag.
- Merge -> moves source relations into the target atomically, avoids duplicate document relations, deletes source tags, and recalculates target count.
- Cleanup -> deletes only zero-count tags with no remaining relation for the active account.

### 5. Good/Base/Bad Cases
- Good: Workstation creates a real local article, assigns a tag, refreshes, sees the tag persist, filters by tag, and Hub tag cloud shows that real tag.
- Base: Empty library shows an honest empty tag state and no fake tag cloud rows.
- Bad: Writing `article.tags.push(...)` from a component, using localStorage to prove persistence, or rendering sample tag cloud words.

### 6. Tests Required
- Run `pnpm vitest run src/services/tag-system/tag-system.test.ts` after repository or schema changes.
- Run `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build` before closing a tag-system task.
- Browser smoke must use a real local article and verify create, assign, OR/AND filter, manager rename/color/delete/merge/cleanup, refresh persistence, Hub tag cloud, remove relation, and zero new console errors.

### 7. Wrong vs Correct

#### Wrong
```ts
selectedArticle.value.tags = [...selectedArticle.value.tags, tag.name]
```

#### Correct
```ts
await tagStore.addTagToDoc(selectedArticleId.value, tag.id)
await articleStore.loadArticles()
```

## Scenario: SessionRestore Durable Workstation State

### 1. Scope / Trigger
- Trigger: Workstation layout, tab list, active document, editor mode, split view, or manager/sidebar state is changed or restored.
- Apply this contract when touching `src/views/WorkstationView.vue`, `src/stores/workstationTabs.ts`, `src/stores/layoutPersistence.ts`, or `src/services/layout-persistence/*`.

### 2. Signatures
- Durable store: Dexie `layoutStates` through `LayoutPersistenceService`.
- Memory/UI store: `useWorkstationTabsStore()` for ordered tabs, pinned state, active tab id, and sessionStorage fallback.
- Serialization: `workstationTabsStore.serializeForLayout(): SerializedTab[]`.
- Restore: `workstationTabsStore.restoreFromLayout(openTabs, activeTabId)` after `LayoutPersistenceService.validateSerializedTabs(...)`.

### 3. Contracts
- `layoutStates.openTabs`, `tabOrder`, `activeTabId`, and `activeArticleId` are the IndexedDB-backed session restore snapshot for Workstation. Do not add a parallel `session_state` table unless the layout persistence architecture is intentionally replaced.
- Restore must validate persisted article ids against real `articleStore.articles` before hydrating tabs. Missing or deleted article ids are filtered; no blank or fake document may be created.
- Session restore may select an active article, but it must not write, replace, or repair article body content. Article content remains owned by article/editor/autosave/crash-recovery flows.
- Pinia state is a memory/UI cache. IndexedDB is the durable snapshot. `sessionStorage` remains a short-lived fallback for tab interactions and must stay schema-validated.
- Routine changes use debounced layout saves. Final best-effort persistence must flush on `pagehide` and hidden `visibilitychange`; `beforeunload` cannot be the only trigger for async IndexedDB work.

### 4. Validation & Error Matrix
- Valid saved tabs + existing articles -> restore ordered tab skeletons and select the persisted active tab's article.
- Active tab missing -> fall back to the first valid restored tab.
- Persisted article deleted -> filter that tab and log a warning with removed tab ids.
- Corrupt layout row -> migrate/normalize through layout persistence; restore failure logs a warning and falls back without blocking content.
- Empty real library -> keep honest empty Workstation state and create no fake tabs.

### 5. Good/Base/Bad Cases
- Good: Open two real articles, pin one, switch active tab, refresh, and see the same durable tab snapshot restored from `layoutStates`.
- Base: No articles exist; Workstation starts empty without demo tabs.
- Bad: Injecting localStorage rows, creating placeholder articles for missing ids, or updating `articles.content` during session restore.

### 6. Tests Required
- Run `pnpm vitest run src/stores/workstationTabs.test.ts src/services/layout-persistence/layout-persistence.test.ts` after changing tab/session restore contracts.
- Run `pnpm exec vue-tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, and `pnpm build` before closing a SessionRestore task.
- Browser smoke must use real UI-created articles and read IndexedDB only for evidence; do not seed or mutate `layoutStates` manually for proof.

### 7. Wrong vs Correct

#### Wrong
```ts
localStorage.setItem('tabs', JSON.stringify([{ title: 'Demo' }]))
```

#### Correct
```ts
layoutPersistenceStore.scheduleSave({
  openTabs: workstationTabsStore.serializeForLayout(),
  activeTabId: workstationTabsStore.activeTabId,
})
```
