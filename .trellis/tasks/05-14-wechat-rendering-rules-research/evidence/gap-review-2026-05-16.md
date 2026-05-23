# WeChat publish gap review - 2026-05-16

## Scope

User feedback: "问题找的还是太少了，继续找".

This review expands beyond the prior validation repair and treats the current
WeChat publishing slice as unfinished until the gaps below are addressed or
explicitly accepted as out of scope.

## Confirmed Findings

### P1 - Cover material upload is implemented in the service but unreachable in ExportModal

- Service capability exists:
  - `inkforge/src/services/export/wechat-publish.ts:412` exposes `uploadWechatCoverImage()`.
  - `inkforge/src/services/export/wechat-publish.ts:538` allows `publishWechatDraft()` to upload `coverImage` when `thumbMediaId` is absent.
- UI path does not expose it:
  - `inkforge/src/components/export/ExportModal.vue:257` requires `wechatDraftThumbMediaId`.
  - `inkforge/src/components/export/ExportModal.vue:882` only provides a manual `thumb_media_id` text input.
  - `inkforge/src/components/export/ExportModal.vue:572` calls `publishWechatDraft()` with `thumbMediaId`, not `coverImage`.
- Impact: users without an existing permanent cover media ID cannot complete the cover step from Inkforge, despite the service layer having the upload bridge.

### P1 - WeChat API authorization status only checks local credentials, not live validity or permissions

- `inkforge/src-tauri/src/commands/wechat.rs:1142` returns `configured=true` once `WECHAT_APP_ID` and `WECHAT_APP_SECRET` are present.
- `inkforge/src/components/export/ExportModal.vue:242` maps that boolean to UI `ready`.
- No status path fetches `access_token` or probes `draft/add` / material permissions.
- Impact: invalid app id, invalid secret, blocked IP allowlist, or missing account permission can still appear ready until the first real operation fails.

### P1 - Access-token cache has no endpoint-level invalid-token eviction/retry

- `inkforge/src-tauri/src/commands/wechat.rs:819` returns a cached token when TTL is still valid.
- Upload/draft calls only surface endpoint errors:
  - `wechat.rs:1186` for `uploadimg`
  - `wechat.rs:1225` for `add_material`
  - `wechat.rs:1273` for `draft/add`
- There is no branch that clears cache and retries once for token-invalid / token-expired WeChat error codes.
- Impact: a token invalidated early by WeChat can keep causing failures until local TTL expiry.

### P1 - Draft title preflight can disagree with the 32-character backend limit

- Official `draft/add` title limit is 32 characters.
- Backend/frontend service enforce 32:
  - `inkforge/src/services/export/wechat-publish.ts:481`
  - `inkforge/src-tauri/src/commands/wechat.rs:1075`
- ExportModal inferred title still truncates to 64:
  - `inkforge/src/components/export/ExportModal.vue:165`
- UI readiness only checks non-empty:
  - `ExportModal.vue:257`
  - `ExportModal.vue:299`
- Impact: a long heading can make the draft form appear ready, then fail only after the user clicks create.

### P1 - Upload validation trusts declared MIME instead of verifying image bytes

- `inkforge/src-tauri/src/commands/wechat.rs:412` parses data URLs and returns the declared MIME plus decoded bytes.
- `wechat.rs:450` checks MIME membership and byte length, not actual file signature.
- Existing frontend test fixture accepts `data:image/png;base64,ZmFrZQ==`, which is the string `fake`, as a success-path upload argument (`inkforge/src/services/export/wechat-publish.test.ts:123`).
- Impact: local validation can still accept a payload that WeChat is likely to reject as invalid file type. This is the same class of mismatch as the previous P1, just at the binary-content layer.

### P2 - Tauri `wechat_create_draft` does not independently enforce the WeChat HTML compatibility boundary

- Normal renderer path sanitizes and platform-normalizes HTML in `inkforge/src/services/export/wechat.ts:1062` and `wechat.ts:1170`.
- Tauri draft validation only checks text size, flags, and image hosts at `inkforge/src-tauri/src/commands/wechat.rs:1071`.
- `wechat.rs:1259` posts the content onward after validation.
- Impact: any future caller that invokes the Tauri command directly can bypass the renderer's HTML/CSS cleanup and send unsupported or unsafe content to WeChat.

### P2 - Remote image SSRF defense has a DNS rebinding gap

- `inkforge/src-tauri/src/commands/wechat.rs:536` resolves and checks the hostname first.
- `wechat.rs:595` then lets reqwest connect to the original URL, causing a second DNS resolution.
- Impact: a hostile remote image host can resolve safely during validation and privately during the actual request.

### P2 - Current tests prove service branches, not the real publish chain

- `inkforge/src/services/export/wechat-publish.test.ts:20` mocks `tauriInvoke`.
- `inkforge/src/services/export/image-pipeline/image-pipeline.test.ts:10` mocks the WeChat upload service.
- There is no component test for `ExportModal` draft form wiring, and no live WeChat API test in this run because no credentials were available.
- Impact: passing tests do not prove real WeChat draft creation end to end.

## Verification Performed

- Official documentation rechecked on 2026-05-16:
  - `https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html`
  - `https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_uploadimage.html`
  - `https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_addmaterial.html`
- Frontend export tests:
  - `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/platform-export-rendering.test.ts src/services/export/image-pipeline/image-pipeline.test.ts --reporter=default`
  - Result: 44 tests passed.
- Type check:
  - `pnpm -C inkforge typecheck`
  - Result: passed.
- Production build:
  - `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
  - Result: passed.
- Rust/Tauri checks:
  - Temporarily restored `inkforge/src-tauri/Cargo.lock` from HEAD, then removed it after checks to preserve the pre-existing deleted state.
  - `cargo fmt --manifest-path inkforge/src-tauri/Cargo.toml --check`
  - `cargo check --manifest-path inkforge/src-tauri/Cargo.toml --offline`
  - `cargo test --manifest-path inkforge/src-tauri/Cargo.toml --offline wechat -- --nocapture`
  - Result: 20 WeChat-related Rust tests passed.
- Browser smoke:
  - URL: `http://127.0.0.1:3005/workstation?id=c6a66bd5-0457-46a5-9308-ca07350fe362`
  - Export modal opens.
  - WeChat tab is default/active.
  - Draft title input `maxLength=32`.
  - Draft creation is disabled in Web runtime.
  - Preflight shows Web runtime blocked for direct WeChat publishing.
  - Console error logs: none.
  - Screenshot: `C:\Users\HP\Downloads\inkforge-wechat-export-modal-gap-review-2026-05-16-2026-05-16T07-30-49-371Z.png`.
- GitNexus:
  - `npx gitnexus status`
  - Result: indexed commit and current commit are both `9e3c463`, status up-to-date.
  - `npx gitnexus impact --repo Inkforge --direction upstream convertToWechatWithStats`
  - Result: LOW risk, direct caller `convertToWechat`, affected process `renderPreview`.

## Notes

- No live WeChat API call was performed because no test/public-account
  credentials were available in this run.
- `inkforge/src-tauri/Cargo.lock` was verified to remain deleted after the
  temporary Rust check restore.

## Follow-up Repair Applied

Implemented immediately after this review:

- Fixed the draft title limit drift:
  - `inkforge/src/services/export/wechat-publish.ts` now exports
    `WECHAT_DRAFT_TITLE_MAX_CHARS`.
  - `inkforge/src/components/export/ExportModal.vue` uses that constant for
    inferred-title truncation, the input `maxlength`, create-button readiness,
    and the draft preflight row.
- Fixed the image byte validation gap:
  - `inkforge/src-tauri/src/commands/wechat.rs` now checks PNG/JPEG/GIF/BMP/SVG
    byte signatures instead of trusting declared MIME alone.
  - Fake bytes declared as PNG now fail before any WeChat upload call.
  - Declared MIME/signature mismatch now fails closed.
- Updated `.trellis/spec/backend/quality-guidelines.md` so future WeChat upload
  work treats real image byte signature validation as part of the bridge
  contract.

Verification after the follow-up repair:

- `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/image-pipeline/image-pipeline.test.ts --reporter=default`
  - Result: 27 tests passed.
- `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/platform-export-rendering.test.ts src/services/export/image-pipeline/image-pipeline.test.ts --reporter=default`
  - Result: 44 tests passed.
- `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue src/services/export/wechat-publish.ts src/services/export/index.ts src/services/export/wechat-publish.test.ts --ext .ts,.tsx,.vue --quiet`
  - Result: passed.
- `pnpm -C inkforge typecheck`
  - Result: passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
  - Result: passed.
- `cargo fmt --manifest-path inkforge/src-tauri/Cargo.toml --check`
  - Result: passed.
- `cargo check --manifest-path inkforge/src-tauri/Cargo.toml --offline`
  - Result: passed.
- `cargo test --manifest-path inkforge/src-tauri/Cargo.toml --offline wechat -- --nocapture`
  - Result: 20 WeChat-related Rust tests passed.
- `git diff --check -- inkforge/src/components/export/ExportModal.vue inkforge/src/services/export/index.ts inkforge/src/services/export/wechat-publish.ts inkforge/src-tauri/src/commands/wechat.rs .trellis/tasks/05-14-wechat-rendering-rules-research/evidence/gap-review-2026-05-16.md`
  - Result: passed with only existing LF-to-CRLF warnings.

## Continued Issue Hunt - 2026-05-16 15:55 CST

User feedback: "问题找的还是太少了，继续找".

This pass deliberately avoids recounting already-known gaps and focuses on new
failure modes that can still make the local bridge look green while a real
WeChat call or editor paste fails.

### Newly confirmed findings

- P1: `publishWechatDraft()` performs remote side effects before local draft
  preflight is complete. The service rewrites/uploads all body `<img>` tags
  before it checks whether either `thumbMediaId` or `coverImage` exists, and
  before `createWechatDraft()` performs title / author / digest /
  content-source URL validation. A caller can therefore upload article images
  to WeChat and only then fail on a missing cover or invalid metadata.
  Evidence: `inkforge/src/services/export/wechat-publish.ts:534-547`.

- P1: Permanent cover material upload can leave orphaned material when draft
  creation fails. If `coverImage` is supplied and `thumbMediaId` is absent,
  `publishWechatDraft()` uploads a permanent image material, then calls
  `createWechatDraft()`. There is no rollback or delete-material path if
  `draft/add` later rejects the payload or credentials. This can consume the
  account's permanent material quota during repeated failed attempts.
  Evidence: `wechat-publish.ts:537-547`,
  `src-tauri/src/commands/wechat.rs:1250-1293`, official `add_material`
  material quota note.

- P1: Image validation now checks magic bytes, but does not prove the bytes are
  a decodable image. `detect_image_mime_from_bytes()` accepts PNG/JPEG/GIF/BMP
  by header prefix only, and the Rust tests intentionally use fake images such
  as `b"\x89PNG...\nfake-png"` / `b"GIF89afake-gif"` as passing fixtures. A
  corrupt file with the right header can pass local validation and still fail
  at WeChat as invalid file content.
  Evidence: `src-tauri/src/commands/wechat.rs:450-534`,
  `src-tauri/src/commands/wechat.rs:1361-1365`,
  `src-tauri/src/commands/wechat.rs:1640-1705`.

- P1: Body-image host validation is wider than the official upload contract.
  The official `draft_add` page says content images must come from the
  "上传图文消息内的图片获取URL" / `media/uploadimg` API. The official upload
  response example returns `mmbiz.qpic.cn`. Current code treats both
  `mmbiz.qpic.cn` and `mmbiz.qlogo.cn` as already valid WeChat body-image
  hosts, and tests assert `mmbiz.qlogo.cn` is valid. A qlogo avatar/static
  image can skip `uploadimg` and be sent in draft content, where WeChat may
  filter or reject it.
  Evidence: `wechat-publish.ts:10`, `wechat-publish.ts:376-395`,
  `src-tauri/src/commands/wechat.rs:18`, `src-tauri/src/commands/wechat.rs:1058-1068`,
  `src-tauri/src/commands/wechat.rs:1488-1495`, official `draft_add` and
  `media/uploadimg` docs.

- P2: Tauri validates trimmed draft metadata but serializes the original
  unnormalized strings. `validate_content_source_url()` trims before parsing,
  and the length helpers trim before counting, but `WechatDraftArticlePayload`
  clones `title`, `author`, `digest`, `content_source_url`, and
  `thumb_media_id` directly from the input. Optional blank strings are also
  serialized instead of omitted because `skip_serializing_if` only skips
  `None`. A direct caller can pass `" https://example.com "` or blank optional
  metadata that passes local validation but sends a payload shape WeChat may
  reject.
  Evidence: `src-tauri/src/commands/wechat.rs:128-140`,
  `src-tauri/src/commands/wechat.rs:1071-1145`.

- P2: `wechat_create_draft` image validation only inspects `<img src>` and
  `<img srcset>`. It does not inspect other resource-bearing HTML that may
  still reach the command from direct callers, such as `<source srcset>`,
  `<picture>`, linkable media tags if future sanitizer drift allows them, or
  style/background resources. The normal frontend export path strips many of
  these, but the command boundary itself is not a complete content-resource
  validator.
  Evidence: `src-tauri/src/commands/wechat.rs:1022-1055`,
  `src-tauri/src/commands/wechat.rs:1180-1190`.

- P2: The final WeChat compliance transform still runs after the platform CSS
  safety pass. This is already visible as `margin:0 auto`, but the broader
  issue is that `wechatComplianceTransform()` can add style/data attributes
  after `enforcePlatformCSS()`, so final output is not re-validated as the last
  step. Browser DOM confirmed the final preview contains
  `data-wechat-clamp="1"` and `style="max-width:677px;margin:0 auto;"`.
  Evidence: `wechat.ts:1170-1185`, `platform-rules/wechat.ts:162-180`.

- P2: ExportModal still does not expose the service-supported draft metadata
  fields. The service supports `author`, `digest`, `contentSourceUrl`,
  `needOpenComment`, and `onlyFansCanComment`, but the modal only collects
  title, manual `thumb_media_id`, and `showCoverPic`, then calls
  `publishWechatDraft()` with those four values. This blocks common official
  draft fields from the only visible UI path.
  Evidence: `ExportModal.vue:158-160`, `ExportModal.vue:584-588`,
  `ExportModal.vue:883-924`, `wechat-publish.ts:70-91`.

- P2 / official-live confirmation needed: the current official `draft_add`
  page now contains an internally inconsistent content description: it states
  the content field "大小不可超过2kb" and also "必须少于2万字符，小于1M".
  Current code enforces the 20,000-character and 1 MB rules only. Because the
  official page itself is inconsistent, this should not be treated as a final
  bug without live API confirmation, but it is a real contract ambiguity that
  the current tests do not cover.

### Verification added in this pass

| Command / check | Result | Notes |
| --- | --- | --- |
| Official doc fetch | Pass | Re-fetched `draft_add`, `media/uploadimg`, and `material/add_material` pages on 2026-05-16. |
| Browser smoke at `http://127.0.0.1:3005/workstation?id=c6a66bd5-0457-46a5-9308-ca07350fe362` | Pass with newly confirmed gaps | Opened ExportModal from the real Workstation article. Confirmed title `maxLength=32`, only manual `thumb_media_id` field and checkbox exist, create-draft button is disabled in Web runtime, final preview still includes `data-wechat-clamp`, `margin:0 auto`, and `linear-gradient`, console errors empty. Screenshot: `.trellis/tasks/05-14-wechat-rendering-rules-research/evidence/inkforge-wechat-export-modal-continued-issue-hunt-2026-05-16-2026-05-16T07-53-50-304Z.png`. |
| `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/platform-export-rendering.test.ts --reporter=default` | Pass | 2 files, 33 tests passed. Existing tests do not cover the newly listed side-effect ordering, qlogo pass-through, or malformed-image decodability gap. |
| `cargo test --manifest-path inkforge/src-tauri/Cargo.toml --offline wechat -- --nocapture` with temporary HEAD `Cargo.lock`, then removal | Pass | 20 Rust tests passed. The same run confirms current tests still accept fake header-only PNG/GIF fixtures. |
| `npx gitnexus status` | Pass | Indexed commit and current commit are both `9e3c463`, status up-to-date. |
| `npx gitnexus impact clampContentWidth --repo Inkforge --direction upstream --include-tests` | Low risk | Current index reports one direct test impact. |
| `npx gitnexus impact publishWechatDraft --repo Inkforge --direction upstream --include-tests` | Not indexed | New uncommitted frontend service symbol is not in the current GitNexus index. |
| `git status --short -- inkforge/src-tauri/Cargo.lock` | Preserved | `Cargo.lock` remains in the pre-existing deleted state after the temporary Rust test restore. |

## P1 Side-Effect Ordering Repair - 2026-05-16 16:05 CST

### Fixed

- `publishWechatDraft()` now performs local draft metadata validation and
  missing-cover validation before calling `rewriteWechatArticleImages()`, so a
  too-long title, invalid author/digest/source URL, empty content, or missing
  `thumbMediaId` / `coverImage` cannot upload article images first.
- The service now validates the rewritten draft body before uploading a
  permanent cover material. If an upload/rewrite result still leaves non-WeChat
  image URLs in the draft body, the permanent cover upload is skipped instead
  of leaving an orphaned material before `draft/add`.
- `createWechatDraft()` and `publishWechatDraft()` share the same local draft
  validation helpers, reducing drift between direct draft creation and the
  higher-level publish orchestration.
- `.trellis/spec/backend/quality-guidelines.md` now records the side-effect
  ordering contract for future WeChat publish bridge work.

### Verification added in this repair pass

| Command / check | Result | Notes |
| --- | --- | --- |
| `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts --reporter=default` | Pass | 18 tests. Added regressions proving missing cover and invalid metadata reject before any upload invoke, and rewritten invalid content blocks permanent-cover upload. |
| `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/platform-export-rendering.test.ts --reporter=default` | Pass | 2 files, 35 tests. Existing WeChat rendering regressions still pass. |
| `pnpm -C inkforge exec eslint src/services/export/wechat-publish.ts src/services/export/wechat-publish.test.ts --ext .ts --quiet` | Pass | No lint output. |
| `pnpm -C inkforge typecheck` | Pass | `vue-tsc --noEmit` after fixing the `coverImage` narrowing issue. |
| `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` | Pass | Production build completed in 40.31s. |
| Browser smoke at `http://127.0.0.1:3005/workstation?id=c6a66bd5-0457-46a5-9308-ca07350fe362` | Pass | ExportModal still opens, WeChat draft title `maxLength=32`, create button remains blocked in Web runtime, and fresh console error logs are empty. |

## Completion Audit - Side-Effect Ordering Repair - 2026-05-16 16:12 CST

### Objective Restatement

Fix the P1 WeChat draft publishing error where `publishWechatDraft()` could
perform WeChat-side mutations before local draft preflight was complete.

Concrete success criteria:

- Missing `thumbMediaId` / `coverImage` must reject before any article-image
  upload.
- Invalid draft metadata must reject before any article-image upload.
- Rewritten draft content must pass local validation before permanent cover
  material upload starts.
- Direct `createWechatDraft()` and higher-level `publishWechatDraft()` must use
  the same local draft validation rules.
- The contract must be recorded in `.trellis/spec/` so future bridge work keeps
  the same side-effect ordering.

### Prompt-to-Artifact Checklist

| Requirement | Evidence | Result |
| --- | --- | --- |
| Reject missing cover media before upload side effects | `inkforge/src/services/export/wechat-publish.ts:551-560` performs metadata/content and missing-cover validation before `rewriteWechatArticleImages()`; `wechat-publish.test.ts:335-344` asserts no `tauriInvoke` call when the content contains an external image but cover media is missing. | Pass |
| Reject invalid metadata before upload side effects | `wechat-publish.ts:197-218` centralizes title/author/digest/source URL checks; `wechat-publish.ts:551-552` runs them before image rewrite; `wechat-publish.test.ts:347-357` asserts no upload invoke for a too-long title. | Pass |
| Do not upload permanent cover until rewritten content passes validation | `wechat-publish.ts:560-571` validates rewritten HTML with a pending-cover sentinel before `wechat-publish.ts:573-579` uploads cover material; `wechat-publish.test.ts:360-383` proves a bad rewrite calls only `wechat_upload_article_image`, not `wechat_upload_cover_image`. | Pass |
| Keep direct draft creation and publish orchestration on one validation contract | `wechat-publish.ts:239-254` defines `assertWechatDraftArticleInput()`; `wechat-publish.ts:537` and `wechat-publish.ts:561` both use it before invoking draft creation / permanent cover upload. | Pass |
| Preserve a future-facing spec contract | `.trellis/spec/backend/quality-guidelines.md:170-176` records local preflight-before-mutation and rewritten-content-before-cover-upload ordering; `.trellis/spec/backend/quality-guidelines.md:247-249` records the required regression tests. | Pass |

### Fresh Verification

| Command / check | Result | Notes |
| --- | --- | --- |
| `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts --reporter=default` | Pass | 1 file, 18 tests. |
| `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/platform-export-rendering.test.ts --reporter=default` | Pass | 2 files, 35 tests. KaTeX quirks-mode warning remains non-failing existing noise. |
| `pnpm -C inkforge exec eslint src/services/export/wechat-publish.ts src/services/export/wechat-publish.test.ts --ext .ts --quiet` | Pass | No lint output. |
| `pnpm -C inkforge typecheck` | Pass | `vue-tsc --noEmit`. |
| `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` | Pass | Production build completed in 38.16s. |
| `git diff --check -- inkforge/src/services/export/wechat-publish.ts inkforge/src/services/export/wechat-publish.test.ts .trellis/spec/backend/quality-guidelines.md .trellis/tasks/05-14-wechat-rendering-rules-research/evidence/gap-review-2026-05-16.md` | Pass | Only the pre-existing LF-to-CRLF warning for `.trellis/spec/backend/quality-guidelines.md`. |

### Audit Conclusion

The side-effect ordering repair is complete for the targeted error. Remaining
WeChat bridge gaps recorded above, such as live credential probing,
endpoint-level token eviction/retry, stricter body-image host policy, payload
normalization, and final-output revalidation, are real follow-up work but are
not part of this completed repair target.
