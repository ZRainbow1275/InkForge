# Final Closeout - 2026-06-08

## Scope

This closeout rechecked the active
`.trellis/tasks/05-14-wechat-rendering-rules-research` task after the later
multi-platform rendering work and the archived 2026-06-08 export capability
audit. It focuses on whether the original research task, the approved minimum
real WeChat publish bridge, and the later WeChat rendering polish slices have
real evidence in the current repository.

## Current Completion Judgment

The task is complete for its approved scope:

- Research artifacts exist and separate official facts, market practice, and
  local pipeline facts.
- The WeChat renderer remains integrated into the existing export pipeline; no
  parallel renderer was introduced.
- ExportModal and Workstation rendering polish evidence exists for Format /
  Insert / Style controls and live WeChat preview.
- The WeChat publish bridge is no longer a stub: it covers status probing,
  article image upload, cover material upload, article-image rewriting, draft
  validation, draft creation, and explicit Web-runtime / missing-credential
  unavailable states.
- Later 2026-06-08 docs/spec work records 135/Xiumi/doocs/md-style market
  practices as InkForge rules without copying private templates or protected
  assets.

## Repair Applied In This Closeout

The remaining token-cache gap from the 2026-05-16 review was fixed in
`inkforge/src-tauri/src/commands/wechat.rs`.

Before this closeout, a cached WeChat access token could be reused until TTL
even if an endpoint returned token invalid/expired errors. The command layer now
recognizes endpoint `errcode` values `40001`, `40014`, and `42001`, clears the
cached token, fetches a fresh token, and retries the failed upload/draft request
once.

Affected live command paths:

- `wechat_upload_article_image`
- `wechat_upload_cover_image`
- `wechat_create_draft`

The retry is intentionally narrow. It does not retry invalid app id/secret or
other business errors, and it does not change renderer, payload, image
signature, or credential-loading contracts.

## Impact Analysis

GitNexus impact was run before editing:

```bash
npx gitnexus impact fetch_access_token -r InkForge --depth 3
# HIGH risk: 3 direct command flows, 3 affected processes

npx gitnexus impact ensure_no_api_error -r InkForge --depth 3
# HIGH risk: upload article image, upload cover image, create draft

npx gitnexus impact wechat_upload_article_image -r InkForge --depth 3
# LOW risk, 0 upstream dependents

npx gitnexus impact wechat_create_draft -r InkForge --depth 3
# LOW risk, 0 upstream dependents
```

The HIGH risk on shared token/error helpers was accepted because the repair is
confined to WeChat command retry behavior and is covered by Rust command tests.

## Verification

Commands run on 2026-06-08:

```bash
cargo fmt --manifest-path inkforge/src-tauri/Cargo.toml --check
# passed

cargo check --manifest-path inkforge/src-tauri/Cargo.toml --offline
# blocked by missing local crate cache: ahash v0.7.8

cargo check --manifest-path inkforge/src-tauri/Cargo.toml
# passed after Cargo downloaded the missing local dependencies

cargo test --manifest-path inkforge/src-tauri/Cargo.toml wechat -- --nocapture
# passed: 22 WeChat Rust tests

pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/image-pipeline/image-pipeline.test.ts src/services/export/platform-export-rendering.test.ts --reporter=default
# passed: 3 files, 52 tests
```

Previously in the same 2026-06-08 session, the export capability closeout also
passed:

```bash
pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default
# passed: 1 file, 23 tests

pnpm -C inkforge exec vitest run src/services/export --reporter=default
# passed: 35 files, 954 tests

pnpm -C inkforge exec eslint src/services/export --ext .ts --quiet
# passed

pnpm -C inkforge exec vue-tsc --noEmit --pretty false
# passed

NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
# passed
```

## Honest Remaining Boundaries

- No real WeChat API draft was created in this closeout because no
  `WECHAT_APP_ID` / `WECHAT_APP_SECRET` / account permission set was exercised
  through the live Tauri runtime in this session.
- Real WeChat backend preview and phone-side screenshot validation remain
  credential/account-bound. They must be reported as unavailable until a live
  account run succeeds.
- Mini-program cards, video account cards, votes, audio, official-account cards,
  and similar backend-native components are still publish checklist items. The
  renderer must not fake them as HTML.
- Complex interactive SVG remains opt-in and must keep real platform evidence or
  raster fallback before being used as a default publishing path.

## Archive Decision

This task can be archived. The remaining items are not unimplemented local
claims; they are live-platform validation gates that require credentials,
permissions, or WeChat backend access and must stay explicit in future publish
acceptance tasks.
