# Quality Guidelines

> Code quality standards for backend development.

---

## Overview

Inkforge does not currently have a separate server package for all product
capabilities. Some backend-like deterministic contracts live in service modules
under `inkforge/src/services/**`. These modules must be treated as production
capability layers: they need explicit input/output contracts, deterministic
fallbacks, honest unsupported states, and focused tests.

---

## Forbidden Patterns

### Do Not Count Preview or Stub Code as Real Capability

Preview fidelity renderers and uploader stubs are useful, but they are not proof
of live platform ability.

Wrong:

```typescript
// A local preview renderer or a class named "*Stub" is reported as platform
// publishing support.
```

Correct:

```typescript
// Native export transforms are tested as real deterministic output.
// Unsupported uploaders keep the *Stub name and throw NotImplementedError.
// Real upload bridges are named without *Stub and are covered by command/service
// contract tests.
```

### Do Not Let Platform Output Depend on Stripped Styling

When a target platform strips classes, style blocks, or external CSS, the final
service output must not depend on those features.

Wrong:

```typescript
// WeChat output still needs KaTeX classes or a <style> block to look correct.
```

Correct:

```typescript
// WeChat output is pasteable HTML with inline styles, no class attributes, and
// formula content degraded to readable self-contained text when real equation
// image upload is unavailable.
```

### Do Not Over-Escape Regex Strings Used to Build RegExp

When a string is passed to `new RegExp(...)`, regex metacharacters need one
TypeScript string escape level. Over-escaping silently changes behavior.

Wrong:

```typescript
new RegExp('display:\\\\s*flex')
```

Correct:

```typescript
new RegExp('display:\\s*flex')
```

---

## Required Patterns

### Export Service Capability Classification

Every export/platform capability under `inkforge/src/services/export/**` should
be classified when audited:

- `real`: deterministic implementation covered by tests or runnable commands.
- `partial`: implemented but missing live integration, credentials, validation,
  or a verified edge case.
- `preview-only`: local fidelity/simulation output only.
- `stub`: deliberately throws or stands in for a future integration.
- `dead/stale`: referenced but not reachable or no longer present.

### Native Platform Output Contracts

- WeChat native output is pasteable HTML. Final output must avoid `<style>`,
  `class=`, JavaScript URLs, unsafe tags, unresolved CSS variables, and
  unsupported CSS that the service knows how to remove.
- Xiaohongshu native output is plain text. It must not leak raw HTML or Markdown
  as the publishable artifact.
- Zhihu native output is Markdown-compatible. Code fences, formulas, tables, and
  unsupported blocks need deterministic preserve/convert/downgrade behavior.

### Unsupported Integrations

If real credentials, OAuth setup, or platform upload API contracts are missing,
the integration should fail explicitly with a typed unsupported error instead of
returning fake success.

For capability probes, a structured unavailable status is also valid when the
caller is explicitly asking "is this configured?" rather than attempting the
live operation.

## Scenario: WeChat Publish Bridge Contracts

### 1. Scope / Trigger
- Trigger: export/platform work now includes a cross-layer Tauri bridge for
  WeChat publishing instead of a pure stub.

### 2. Signatures
- Tauri commands:
  - `wechat_publish_status() -> { configured, missingKeys, source, appIdHint }`
  - `wechat_upload_article_image(input) -> { remoteUrl }`
  - `wechat_upload_cover_image(input) -> { remoteUrl, coverHandle }`
  - `wechat_create_draft(article) -> { articleCount }`
- Frontend service entry points:
  - `getWechatPublishStatus()`
  - `uploadWechatArticleImage(image)`
  - `uploadWechatCoverImage(image)`
  - `rewriteWechatArticleImages(html)`
  - `createWechatDraft(article)`

### 3. Contracts
- Env keys:
  - Required for live calls: `WECHAT_APP_ID`, `WECHAT_APP_SECRET`
  - Location: process env or `inkforge/.env.local`
  - Multiple discovered `.env.local` files must merge nearest-first by key:
    a higher-priority file may override a key it defines, but must not shadow a
    lower-priority file that supplies a different missing WeChat key.
  - Never use `VITE_` prefixes for these secrets.
- Upload request contract:
  - Exactly one of `dataUrl` or `remoteUrl`
  - WeChat article-body image upload (`media/uploadimg`) accepts only JPG/PNG
    (`image/jpeg` / `image/png`) and must be capped at 1 MB before calling
    WeChat.
  - WeChat permanent cover image upload (`material/add_material?type=image`)
    accepts BMP/GIF/JPG/PNG (`image/bmp`, `image/gif`, `image/jpeg`,
    `image/png`) and must use the permanent-material image cap instead of the
    article-body image cap.
  - Upload validation must verify the real image byte signature. Declared
    MIME, file extension, data URL header, and HTTP `Content-Type` are hints
    only; fake bytes declared as PNG/JPG/GIF/BMP must fail before the WeChat
    API call.
  - SVG/WebP/AVIF must be converted before upload for both article-body and
    permanent-cover paths.
  - `remoteUrl` inputs are fetched by Tauri, so they must reject localhost,
    private/link-local/multicast IP literals, IPv4-mapped local IPv6 literals,
    DNS names that resolve to local/private addresses, non-HTTP(S) schemes,
    missing `Content-Length`, and over-limit content before buffering bytes.
  - Each accepted HTTP(S) hop must connect only to the public socket addresses
    validated for that exact hostname. Redirects are handled manually with a
    bounded hop count and repeat URL, DNS, and address pinning validation; do
    not disable TLS hostname/SNI/certificate checks or let a proxy bypass the
    pinned connection.
- Draft request contract:
  - Renderer/Tauri invoke input uses camelCase fields such as
    `coverHandle`, `showCoverPic`, `contentSourceUrl`, `needOpenComment`.
    `coverHandle` is an opaque process-local 32-hex handle resolved to the raw
    cover media ID only inside Rust; it expires when the backend process exits.
  - The outbound WeChat `draft/add` payload must be serialized to snake_case:
    `thumb_media_id`, `show_cover_pic`, `content_source_url`,
    `need_open_comment`, `only_fans_can_comment`.
  - Optional draft fields must be trimmed once and omitted when absent or
    whitespace-only, not serialized as JSON `null` or sent with padding.
  - WeChat draft/material identifiers remain backend-only. The ordinary
    `wechat_create_draft` response exposes only non-sensitive counts/status;
    raw `media_id` values must not cross the Rust-to-Web serialization boundary.
  - Draft metadata must enforce WeChat field limits before the live call:
    `title` max 32 characters, `author` max 16 characters, `digest` max 120
    characters, `content_source_url` max 1 KB and HTTP(S)-only, and `content`
    fewer than 20,000 characters and 1 MB.
    The current official `draft/add` documentation and its 2026-07-14 change
    log explicitly align the API digest limit to 120 characters:
    `https://developers.weixin.qq.com/doc/service/api/draftbox/draftmanage/api_draft_add`.
  - Local draft preflight must run before any WeChat-side mutation. The publish
    orchestration must reject missing `coverHandle` / `coverImage` and invalid
    draft metadata before uploading article images. If a cover image must be
    uploaded as permanent material, the rewritten draft content must pass local
    validation before the permanent material upload starts.
  - `PublishView` is the sole credentialed product owner for ordinary draft
    creation. `ExportModal` remains a local copy/download surface and must not
    call `publishWechatDraft()` or accept raw WeChat media identifiers.
- Draft content contract:
  - Article `content` must stay below the WeChat 20,000-character boundary.
  - `<img src>` and `srcset` candidates must already point at WeChat-hosted
    image URLs before `wechat_create_draft` is called.
  - Reading-time headers and returned `ExportStats` for Markdown-driven WeChat
    output must use the same source-of-truth statistics. Rendered SVG/KaTeX
    helper markup must not inflate the final visible word count or reading time.
  - Special renderer fences such as `mermaid` must be handled by their
    platform-specific quality rule and must not also appear as generic
    unsupported code-language warnings.

### 4. Validation & Error Matrix
- Missing credentials + `wechat_publish_status` -> success payload with
  `configured=false` and `missingKeys`.
- Missing credentials + live upload/draft call -> explicit command error.
- Both `dataUrl` and `remoteUrl` present, or both missing -> validation error.
- Article-body SVG/GIF/BMP/WebP/AVIF upload source -> validation error before
  the live command runs.
- Permanent-cover SVG/WebP/AVIF upload source -> validation error before the
  live command runs; BMP/GIF/JPG/PNG are allowed at the permanent-material
  boundary.
- Oversized image upload payload -> validation error before the live command
  runs.
- `remoteUrl` targets localhost/private/link-local/multicast IP literals,
  IPv4-mapped local IPv6 literals, DNS-resolved local/private addresses, or
  omits `Content-Length` -> validation error before buffering/upload.
- `showCoverPic`, `needOpenComment`, or `onlyFansCanComment` outside 0/1 ->
  validation error.
- Draft `content` at or above 20,000 characters -> validation error.
- Non-WeChat body image URLs in `src` or `srcset` -> validation error,
  including `<img>` tags whose quoted attributes contain `>` before `src`.
- WeChat API non-zero `errcode` in token/upload/draft responses -> explicit
  operation error surfaced back to the caller. `errcode=0` is success.
- Access-token cache expiry must subtract a refresh skew and avoid underflow.
  If a later upload/draft call reports token-expired or invalid-credential
  errors, the cache must not keep serving the same bad token without a clear
  retry/eviction path.

### 5. Good/Base/Bad Cases
- Good: an `inkforge-asset://` image is resolved to a data URL, uploaded
  through `uploadimg`, rewritten to a WeChat host, and the final draft payload
  uses snake_case fields.
- Base: the UI is running in Web mode or without credentials and can still show
  an honest blocked/preflight status via `wechat_publish_status`.
- Bad: the UI treats a preview renderer or a `*Stub` uploader as proof of live
  WeChat publishing support, or sends camelCase fields directly to `draft/add`.

### 6. Tests Required
- Frontend service tests:
  - Web runtime status falls back to `source=web-runtime`
  - SVG rejection happens before invoking the Tauri command
  - `inkforge-asset://` sources normalize to `dataUrl`
  - repeated HTML image sources upload once and rewrite deterministically
  - draft creation rejects foreign image hosts
  - draft metadata is trimmed once and whitespace-only optional fields are omitted
  - deferred render/publish results cannot attach old HTML or cover handles to a new article
  - the Workstation publish CTA enters `PublishView` while the export button keeps `ExportModal`
  - WeChat Markdown Mermaid output uses readable PNG/JPG-placeholder content,
    the visible reading header matches returned AST-backed stats, and Mermaid is
    not duplicated as a generic unsupported code-language warning
- Tauri command tests:
  - `.env.local` parsing accepts `export KEY=value`
  - `.env.local` discovery merges missing keys nearest-first without letting an
    upper file shadow a lower file's missing WeChat secret
  - WeChat host checks stay strict
  - draft payload serialization uses snake_case keys, includes
    `show_cover_pic`, and omits absent optional fields instead of emitting
    `null`
  - remote upload validation blocks private/local/multicast/IPv4-mapped targets,
    DNS-resolved private targets, fake image bytes, MIME/signature mismatch,
    and unsupported image formats/sizes
  - draft validation catches 20,000-character content, non-WeChat `srcset`
    candidates, and `<img>` tags with `>` inside quoted attributes
  - API error handling treats `errcode=0` as success and non-zero `errcode` as
    failure
  - draft publishing rejects missing cover media and invalid metadata before
    invoking article-image upload, and does not invoke permanent-cover upload
    when the rewritten content still fails draft validation
- Verification commands:
  - `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/image-pipeline/image-pipeline.test.ts`
  - `pnpm -C inkforge typecheck`
  - `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet`
  - `cargo check --manifest-path inkforge/src-tauri/Cargo.toml`

### 7. Wrong vs Correct
#### Wrong
```typescript
// A file still named wechat-stub.ts calls the real publish service, and the
// draft payload is passed through to WeChat unchanged.
await tauriInvoke('wechat_create_draft', {
  article: {
    thumbMediaId: 'thumb-1',
    contentSourceUrl: 'https://example.com',
  },
})
```

#### Correct
```typescript
// The uploader bridge is named honestly, and the Tauri layer translates invoke
// input into the snake_case WeChat API payload.
const status = await getWechatPublishStatus()
if (!status.configured) return describeWechatPublishStatus(status)
```

---

## Testing Requirements

For export service changes:

- Add a focused regression test for each fixed platform rule.
- Test final output, not only intermediate warnings.
- Include negative assertions for stripped or unsupported platform features.
- Run non-mutating lint commands; do not use package scripts that include
  `--fix` as proof of verification.

Expected commands for this package:

```bash
pnpm -C inkforge exec vitest run src/services/export --reporter=default
pnpm -C inkforge exec eslint src/services/export --ext .ts --quiet
pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet
pnpm -C inkforge exec vue-tsc --noEmit
```

If repo-wide lint or typecheck is blocked by files outside the task scope,
record the exact failing paths and still run the narrower service-layer checks.

---

## Code Review Checklist

- Does the changed service output map to a real user-facing capability rather
  than preview-only or stub behavior?
- Are unsupported integrations explicit and test-covered?
- Are platform limits enforced in output, not only reported as suggestions?
- Does WeChat output remain self-contained after class/style stripping?
- Does Xiaohongshu output remain plain text?
- Does Zhihu output remain Markdown-compatible?
- Were scoped tests and non-mutating lint run?
- If full gates failed, are the failures outside the task scope and documented
  with exact file paths?
