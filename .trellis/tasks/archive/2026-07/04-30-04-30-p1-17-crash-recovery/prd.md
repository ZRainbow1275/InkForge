# P1 Crash Recovery Baseline

## Scope

Implement the `prompts/0420/specs/17-crash-recovery-spec.md` compatible L1 baseline without rewriting the editor architecture, deleting existing modules, or claiming the full L1/L2/L3 crash-recovery program is complete.

This baseline focuses on a real vertical slice for the project bottom line: active article content must have a recoverable path when the browser or Tauri WebView exits unexpectedly.

## Baseline Features

- Emergency snapshot service under `src/services/crash-recovery` with typed payload contracts, profile/window scoped localStorage keys, content truncation, SHA-256 hash metadata, crash counters, clean shutdown markers, and payload parsing guards.
- Browser lifecycle integration that keeps a precomputed emergency payload ready during editing and writes it synchronously in `beforeunload`; it also uses `visibilitychange` and `pagehide` as modern lifecycle signals based on current browser guidance.
- IndexedDB `recoveryPoints` table added through a non-destructive Dexie v5 migration. Existing tables and records must remain intact.
- Autosave failure fallback: when editor content persistence fails, the current content is written to a real recovery point and an emergency payload before the existing error state is surfaced.
- Startup recovery store that detects recoverable emergency payloads, exposes pending recovery candidates, restores a selected payload into the real content/article repositories, and supports explicit dismissal.
- Workstation recovery banner that shows pending recovery evidence and provides user-controlled restore/ignore actions without using Emoji icons or fake demo data.

## Non-goals

- No full SafeMode shell, data-integrity Worker, hash-chain repair, DiagnosticPackage zip, disaster recovery wizard, backup scheduler, or VersionHistory recovery bundle in this baseline.
- No mock data, seeded demo documents, simulated platform APIs, or fake recovery success claims.
- No replacement of the existing editor store, article store, export pipeline, or workstation layout.

## Data Flow Contract

1. Editor content changes update the existing `editorStore.currentContent` through the current save pipeline.
2. The crash-recovery service derives a bounded emergency payload from the current content and selected article metadata.
3. The payload is cached as a JSON string so `beforeunload` only performs synchronous localStorage writes.
4. On startup, the crash-recovery store reads profile-scoped emergency payloads and filters out payloads with newer clean-shutdown markers.
5. A user restore action writes a `crash-recovery` recovery point and updates the real `contents` and `articles` records through existing repositories/stores.
6. A user ignore action clears only the selected emergency key and leaves unrelated app data untouched.

## Verification Plan

- Run `pnpm exec vue-tsc --noEmit`.
- Run `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`.
- Run `pnpm build`.
- Start Vite on `127.0.0.1:5176`, create a real temporary article through the real Pinia store/IndexedDB path, write an emergency payload, reload Workstation, restore through the recovery banner, verify content and `recoveryPoints`, then delete the article and recovery artifacts.
- Scan touched code/docs for literal Emoji pictographs and escaped quote pollution.

## Completion Boundary

This task may be marked completed only after code, real browser/store validation, task metadata, this PRD, the Spec 17 note, and `prompts/0420/acceptance-matrix.md` are updated to reflect the implemented baseline. Full Spec 17 remains broader than this baseline and must not be marked as fully complete.
