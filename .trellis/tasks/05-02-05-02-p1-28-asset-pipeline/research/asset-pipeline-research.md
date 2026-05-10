# Asset Pipeline Research

## Research Date

2026-05-02

## Sources Checked

- Grok Search: MDN `SubtleCrypto.digest()` and Web Crypto non-cryptographic hash usage.
- Grok Search: Dexie official docs for `version().stores()` / `upgrade()` and Blob storage.
- Grok Search: MDN Blob URL lifecycle, `URL.createObjectURL()`, and `URL.revokeObjectURL()`.
- Context7: `/websites/dexie` documentation for schema versioning, upgrade functions, Blob storage, and TypeScript table typing.

DeepWiki and Exa were attempted through the available MCP gateway but returned `Transport closed`; this research therefore relies on Grok Search plus Context7 official Dexie documentation.

## Findings

### Web Crypto SHA-256

- Browser `crypto.subtle.digest('SHA-256', data)` accepts an `ArrayBuffer`, `TypedArray`, or `DataView` and returns a `Promise<ArrayBuffer>`.
- `File.arrayBuffer()` / `Blob.arrayBuffer()` gives the actual bytes required for a real content hash.
- `SubtleCrypto.digest()` is not streaming. The whole payload is loaded into memory, so this baseline keeps the existing 10 MB single-file limit rather than pretending large-file streaming exists.
- `crypto.subtle` requires a secure context in normal browsers. If unavailable, the pipeline must fail closed and must not use `Math.random()` or a timestamp id fallback for content identity.

### Dexie Schema And Blob Storage

- Dexie schema changes must increment the DB version and declare stores/indexes through `db.version(n).stores(...)`.
- Existing stores must stay declared in the latest version so old tables remain available.
- `upgrade(tx => ...)` is only needed for data transformations. Adding `assetRefs` and new indexes can be done declaratively if existing records remain valid.
- IndexedDB can store Blob values via structured clone. Blob fields should not be indexed; index metadata such as id, hash, profileId, category, createdAt, lifecycle, and refCount.
- TypeScript projects should declare `Table<Model, PrimaryKey>` on the Dexie subclass for typed access.

### Blob URL Lifecycle

- `URL.createObjectURL(blob)` creates a runtime object URL that keeps the Blob reachable.
- Long-running SPAs must explicitly call `URL.revokeObjectURL(url)` when the URL is no longer needed.
- Revoking too early can break image loading. A cache should revoke on replacement, deletion, cleanup, or component/store disposal.
- Existing `useAssetStore` already uses a cache and cleanup hook; the new pipeline should preserve that behavior and move reusable cache logic into a service utility.

## Implementation Decisions

- Use the first 16 hex characters of SHA-256 as `AssetRecord.id`, and keep `contentHash` as the full 64-character digest for dedupe and diagnostics.
- Keep current `assets.blob` and `assets.thumbnail` fields unindexed.
- Add `assetRefs` with indexes for `assetId`, `profileId`, `referrerId`, `createdAt`, `[assetId+referrerId]`, and `[profileId+assetId]`.
- Add new asset metadata fields as optional-compatible fields to avoid breaking older rows.
- Keep product URL ingest honest: only store a URL asset when a real fetch succeeds and returns a Blob.
- Generate export inline base64 snapshots at read time, not as persistent DB metadata.

## Research Links

- MDN SubtleCrypto digest: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
- MDN Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- Dexie Version.stores: https://dexie.org/docs/Version/Version.stores()
- Dexie Version.upgrade: https://dexie.org/docs/Version/Version.upgrade()
- Dexie basics/versioning: https://dexie.org/docs/Tutorial/Understanding-the-basics
- MDN blob URLs: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob
- MDN URL.createObjectURL: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static
- MDN URL.revokeObjectURL: https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static
