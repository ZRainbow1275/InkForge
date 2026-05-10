# P1 Multi Account Profile Baseline PRD

## Goal

Implement the first real, compatible baseline for Spec 26 multi-account/workspace Profile isolation without deleting or rebuilding the existing account foundation. The baseline moves InkForge toward an explicit Profile registry, per-profile database namespace management, honest file-root/runtime boundaries, and user-visible Profile lifecycle controls.

## Source Specs

- `prompts/0420/specs/26-multi-account-profile-spec.md` is the primary product contract.
- `prompts/0420/specs/06-account-auth-spec.md` remains the existing account foundation; do not remove `/account` or the current account store.
- `prompts/0420/specs/23-sync-provider-spec.md` defines profile/provider identifiers and durable local-first failure semantics.
- `prompts/0420/specs/24-permission-audit-spec.md` defines audit logging requirements and secret/content redaction expectations.
- Existing Spec 25 extension tables are profile-scoped and must remain intact.

## Non-Negotiable Constraints

- No mock data, fake runtime success, fake native directory selection, fake Tauri multi-window success, or seeded display-only Profile rows.
- No emoji glyphs. Any visual icon must use existing icon libraries or text/SVG.
- Do not delete or replace existing account, settings, extension, audit, sync, article, or document modules.
- Do not migrate existing articles into per-profile databases in this baseline. A destructive migration would be unsafe without a dedicated migration spec and backup path.
- Web/browser runtime cannot claim native file-root selection or multi-window binding unless the real Tauri bridge exists and succeeds.
- Continue from the existing `accounts` table and account store produced by P1-06; mirror it into the default Profile registry instead of rebuilding it.

## Baseline Scope

### 1. Profile Registry and Schemas

- Add strict Profile types and Zod validation for Profile ids, names, lucide avatar icon names, accent colors, database namespaces, optional file roots, soft-delete state, sync config, and settings overrides.
- Generate URL-safe 21-character Profile ids using runtime crypto, without adding a heavy dependency solely for id generation.
- Derive database namespace as `inkforge-${profileId}` and validate it centrally.
- Add a browser-honest `fileRootStatus` so the UI can distinguish unassigned roots from native runtime unavailable roots without inventing paths.

### 2. Global Registry Persistence

- Add Dexie schema version for global Profile registry and shared Profile area tables.
- Persist Profiles in the existing global `InkForgeDB` registry table.
- Add shared area tables for templates, export presets, and AI configuration metadata. This baseline only creates the real storage surface; it must not fabricate shared records.
- Implement repository lifecycle operations: ensure default Profile from account, create, list, switch, soft-delete, restore, and read deleted Profiles still within the 7-day recovery window.

### 3. Per-Profile Database Manager

- Implement a `ProfileDatabase` Dexie class and `ProfileDatabaseManager` that opens separate IndexedDB databases by namespace.
- The baseline per-profile database must initialize a real metadata table so isolation can be verified by database name and metadata records.
- The manager must cache instances, close unused databases, check existence, list known profile database names when supported, and delete databases only through explicit repository/manager methods.

### 4. Isolation and Validation Rules

- Validate Profile names as non-empty, 1-50 characters, and unique among active Profiles case-insensitively.
- Validate file roots when available: no duplicate roots, no parent/child overlap, normalize separators and casing for Windows safety.
- Reject manually typed fake file roots in product UI. Browser runtime should leave `fileRoot` null and show a real “native directory picker unavailable” boundary.
- Keep switching a Profile separate from closing documents; this baseline updates active Profile metadata and UI state only.

### 5. Audit and State Integration

- Add audit action coverage for Profile lifecycle events where missing: create, switch, delete/soft-delete, restore, native boundary unavailable if needed.
- Implement a Pinia Profile store with load, create, switch, soft-delete, restore, sorted active Profiles, deleted Profiles, active Profile, and counts.
- Store operations must call repository/service paths so audit and database initialization are not bypassed.

### 6. User Interface Baseline

- Add a Profile/workspace management surface using the existing visual language. Prefer extending current Settings/Account surfaces instead of creating a detached shell.
- Display current active Profile, Profile count, database namespace, file-root status, and honest native boundary state.
- Provide create/switch/soft-delete/restore controls backed by the real store/repository.
- Do not render fake import/export results, fake multi-window states, or fake shared templates.

### 7. Tests and Validation

- Add unit tests for id generation, namespace validation, Profile schema validation, name uniqueness, file-root overlap rejection, soft-delete filtering, default Profile mirroring, create/switch audit evidence, restore lifecycle, and per-profile database manager isolation.
- Run targeted tests, full Vitest suite, type-check, lint, production build, touched-file diff check, emoji scan, Trellis task validation, and a real preview/browser smoke against the Profile UI.

## Acceptance Criteria

- A fresh app can create and load a default Profile derived from the existing local account without deleting account data.
- Creating a new Profile writes a real Profile registry record, initializes its own `inkforge-{profileId}` IndexedDB database, and writes audit evidence.
- Switching Profiles updates active Profile state, last active timestamp, local active Profile pointer, and audit evidence.
- Soft delete hides the Profile from active lists while keeping it recoverable for seven days; restore returns it to active lists.
- File root overlap validation rejects duplicate/nested roots; browser runtime never invents a path.
- Settings/Account UI shows real registry state and explicit unavailable native boundaries.
- All validation commands listed in the task report pass, or any unavailable tooling is documented with real error output.

## Out of Scope for This Baseline

- Full article/document migration into per-profile databases.
- Full export/import zip wizard.
- Real Tauri Rust commands for file-system scope and multi-window opening.
- Keyring cleanup and irreversible post-7-day purge automation.
- Online/team collaboration semantics.

## Implementation Notes

- The per-profile database baseline is a compatibility slice: it proves hard namespace separation and prepares later document migration, but keeps existing global article storage unchanged until a dedicated migration can safely define backup, migration, rollback, and cross-profile article ownership semantics.
- Shared area tables are storage contracts only in this slice; no shared sample records should be inserted.
- Use strict validation and explicit error messages at service/repository boundaries so UI and tests surface real failures.
