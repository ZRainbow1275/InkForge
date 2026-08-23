# Market and Platform Evidence Map — 2026-08-09

## Reuse decision

InkForge already contains sufficient research on doocs/md, mdnice, 135 Editor, Xiumi, WeChat's
official editor, Xiaohongshu, and Zhihu. This task will not repeat a broad market survey. It reuses
the existing rules and performs only the live platform-editor actions needed to close the three
remaining acceptance slices.

## Authoritative existing research

- `docs/platform-rendering-rules/market-practices-catalog.md`
  - separates taxonomy/listing evidence from an applied editor element;
  - records doocs/md's single parser, sanitizer, inline-CSS clipboard, image upload, and component
    patterns without authorizing template or asset copying;
  - records applied 135/Xiumi element evidence and the no-copy boundary;
  - fixes the output contracts: WeChat safe inline HTML/SVG, XHS plain text plus raster artifacts,
    and Zhihu clean Markdown plus image fallback.
- `docs/platform-rendering-rules/xiaohongshu-rules.md`
  - XHS body authority is plain text; visual richness belongs in 3:4/1:1 image pages, cover, poster,
    or long image plus a verified manifest;
  - no HTML, CSS, SVG, raw Markdown controls, fake links, or invented platform limits;
  - real editor upload/readback is independent from local artifact readiness and publication.
- `docs/platform-rendering-rules/zhihu-rules.md`
  - Zhihu authority is clean Markdown; WeChat wrappers, inline styles, and inline SVG are removed;
  - formula/diagram/table fallbacks need real image artifacts, alt/caption, and public or actual
    platform-hosted URLs;
  - editor import/upload/readback is independent from publication.
- Archived WeChat research:
  - `wechat-components-and-api-boundaries.md` distinguishes official image/cover/draft APIs from
    backend-native song/profile/video/vote/card components whose private HTML must not be forged;
  - `doocs-md-format-insert-style-reference.md` and the pinned
    `doocs-md-component-patterns.md` establish one registry, canonical JSX, schema-driven prop
    editing, a local visual projection, and a separate platform artifact/fallback.

## Current official WeChat boundary

The current official `draft_add` contract exposes article content, cover/material identifiers,
image-media identifiers, and conditional product information. It does not document a general
first-class song or official-account profile-card field. Therefore this task uses two truthful
paths:

1. **Official API binding:** real body-image upload, permanent cover material, `thumb_media_id`,
   draft add/get/list/delete, error-code handling, persisted readback, and targeted cleanup through
   one restricted backend round trip with a pre-add unique marker and private crash-recovery journal.
   Vue receives no generic media-ID read/delete API; unknown outcomes remain blocked. Current official
   `digest` limit is 120 characters and requires a 120/121 local boundary test before transport.
2. **Platform-native editor insertion:** song, official-account profile, article/card, and other
   editor-native media use existing real component metadata to produce a precise handoff position
   and expected visible identity. The logged-in WeChat editor performs the native insertion and
   InkForge records redacted visual/DOM readback. Until that happens the disposition remains
   `manual-native-insert` or `blocked`; a lookalike HTML card is only a static fallback.

This is an inference from the documented API field contract and current verified editor behavior,
not a claim that a private or account-specific route can never exist.

Official references:

- `https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html`
- `https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_getdraft.html`
- `https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_delete.html`
- `https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_batchget.html`
- `https://developers.weixin.qq.com/doc/subscription/guide/product/draft.html`

## Live-test boundaries

- Use one task-scoped CloakBrowser session only for the authenticated WeChat, XHS, and Zhihu editor
  gates. Do not start Playwright or a second browser profile.
- Platform tests may open editors, paste/import the exact release artifact, upload the exact local
  raster fallback, insert an available native component, and read back the intended editor surface.
- Do not click publish, group-send, schedule, or any equivalent irreversible action. Clear/discard
  disposable editor content where the platform supports it.
- No account chrome, cookies, tokens, QR codes, HAR, browser profile paths, private selectors,
  account screenshots, private draft text, or real platform resource IDs enter the repository.
- Static editor evidence is two linked receipts: current final EXE/producer → exact artifact, then
  exact artifact + ingress/target → platform readback. An EXE change reruns the first and shell rows;
  byte-identical output may retain the second. WeChat API uses a separate live receipt bound to current
  EXE/backend/schema/cleanup protocol/account capability and reruns when any changes. Docs-only edits
  do not trigger external work.

## Accepted status vocabulary

- `not-run`: no current exact-artifact attempt exists; cannot close any external gate.
- `local`: converter/validator/native-software checks passed only.
- `platform-editor-rendered`: the exact artifact reached the authenticated intended editor surface
  and passed visual/DOM readback without publication.
- `manual-native-insert`: InkForge prepared a real semantic reference and insertion position, but
  the platform-native component still requires editor action.
- `blocked`: a real reference, permission, upload response, public host, or editor capability is
  missing.
- `invalidated`: the evidence no longer matches the current product, release, or artifact hash.

`published` is a separate boolean and is always false/out of scope for this task. Only
`platform-editor-rendered` may close a required external editor gate; manual, blocked, not-run, and
invalidated rows remain open even when their boundary is accurately documented.
