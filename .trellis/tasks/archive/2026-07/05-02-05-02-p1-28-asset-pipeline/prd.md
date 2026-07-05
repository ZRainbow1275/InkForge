# P1 Asset Pipeline Baseline PRD

## Status

- Task: `05-02-p1-28-asset-pipeline`
- Source spec: `prompts/0420/specs/28-asset-pipeline-spec.md`
- Related specs: `12-file-manager`, `15-export-publish`, `53-image-extension-v2`, `27-performance-slo`
- Implementation mode: local-first browser baseline, compatible with existing editor and asset store

## Product Goal

Deliver a real local-first asset pipeline baseline for InkForge that ingests images and attachments through a unified service layer, stores binary payloads in IndexedDB, deduplicates by content hash, tracks references, exposes orphan cleanup, and prepares export-time asset snapshots without deleting or replacing existing asset functionality.

## Non-Negotiable Constraints

- No mock asset records, simulated ingest success, fake fetch success, or seeded UI-only rows in product code.
- Do not remove or rewrite the existing `useAssetStore` public API, `AssetImage` extension, `ImageDropPaste`, `AssetImageNodeView`, or existing IndexedDB `assets` table fields.
- Do not claim Tauri filesystem mirroring, full Image Extension v2, or external image cache success unless a real runtime path is implemented and verified.
- Do not persist article markdown, document body, tokens, passwords, authorization headers, or other content-like sensitive payloads in asset metadata or reference rows.
- No emoji glyphs. UI icons must continue to use installed icon libraries or existing SVG/CSS patterns.

## Baseline Scope

### In Scope

1. Data model compatibility
   - Extend the current Dexie schema from v11 to v12.
   - Preserve the current `assets` object store and existing fields.
   - Add metadata fields that support content-hash ids, profile scoping, category, lifecycle, source kind, ref count, orphan grace, and external URL evidence.
   - Add an `assetRefs` object store for durable reference tracking.

2. Unified service layer
   - Add `src/services/asset-pipeline/*` as the single ingest and repository boundary.
   - Support real `File` / `Blob` ingest for drag/drop, paste, file dialog, and service callers.
   - Support URL ingest only when a real `fetch()` returns an ok `Blob`; otherwise return a typed failure.
   - Use Web Crypto SHA-256 over the actual bytes. Asset ids use the first 16 hex characters of the content hash.
   - Deduplicate by hash/profile while preserving the first stored Blob.

3. Images and attachments
   - Classify supported image types: png, jpeg/jpg, gif, svg, webp, avif.
   - Classify supported attachments: pdf, doc, docx, zip, plain text, csv, json, markdown.
   - Reject unsupported MIME types with typed errors.
   - Keep existing image dimension and thumbnail behavior where browser canvas APIs are available.
   - Do not run image-only processing for attachments.

4. Reference tracking and orphan cleanup
   - Add real `AssetRef` create/remove/list APIs.
   - Keep `refCount` denormalized on asset records and never below zero.
   - Mark assets with `refCount = 0` as orphan candidates using a 24-hour grace period.
   - Purge only expired orphan candidates and their durable rows. Non-expired or re-referenced assets must remain.

5. Blob URL and snapshot utilities
   - Add a bounded object URL cache that revokes URLs explicitly.
   - Add export snapshot resolution that can return inline base64 for local Blob-backed assets at call time without persisting base64 in IndexedDB.
   - Return explicit placeholder/manual states for unresolved or unsupported snapshot modes.

6. Store bridge
   - Keep `useAssetStore` actions (`loadAssets`, `uploadAsset`, `uploadAssets`, `deleteAsset`, `getAssetUrl`, `getThumbnailUrl`, `searchAssets`, `updateTags`, `cleanup`) compatible.
   - Route new uploads through the asset pipeline while preserving existing callers.
   - Existing editor image node behavior must keep working with `assetId` and object URLs.

7. Verification and documentation
   - Add unit/integration tests for hash, dedupe, attachment classification, unsupported MIME rejection, refs, orphan grace, snapshot generation, and metadata safety.
   - Run type-check, targeted tests, full tests, lint, build, and a real browser IndexedDB smoke when feasible.
   - Update Spec 28, acceptance matrix, and Trellis spec notes after implementation.

### Out Of Scope For This Baseline

- Full Tauri filesystem mirror and sharded local filesystem layout.
- Full Image Extension v2 replacement, figure schema migration, and viewer modal completion.
- Full external image proxy/cache. URL ingest is real fetch-or-fail only.
- 2000+ asset benchmark certification beyond service-level data model and bounded APIs.
- Worker offload for image transforms.

## Data Flow

`File | Blob | URL` -> `AssetPipeline.validateInput` -> `WebCrypto SHA-256` -> `classifyMime` -> `optional image processing` -> `AssetRepository.upsertByHash` -> `IndexedDB assets + assetRefs` -> `store bridge / editor / export snapshot`

## Error Boundaries

- Missing `crypto.subtle`: fail with an asset pipeline error; do not fall back to random or non-cryptographic ids.
- Oversized file: reject before storing.
- Unsupported MIME: reject before storing.
- URL fetch not ok, CORS blocked, or non-Blob response: return a typed failure and do not create an asset row.
- IndexedDB write failure: surface the real error through repository/store state.
- Thumbnail failure: preserve main asset ingest and record thumbnail as unavailable.

## Acceptance Criteria

- Dexie v12 opens with `assets` and `assetRefs` stores while preserving existing data model compatibility.
- Ingesting the same bytes twice returns the same asset id and does not duplicate the Blob row.
- Ingesting a supported attachment creates a real asset row without image processing.
- Unsupported MIME types are rejected with a typed error.
- Adding/removing refs updates `assetRefs` and asset `refCount` correctly, with no negative counts.
- Orphan cleanup respects the 24-hour grace period.
- Export snapshot can inline a local Blob asset as base64 on demand.
- `useAssetStore.uploadAsset()` remains callable by existing editor code and returns a compatible `AssetRecord`.
- No product code seeds mock assets or stores document content in metadata.
- Quality gates pass or any unrelated pre-existing failures are explicitly isolated with evidence.
